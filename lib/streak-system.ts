/**
 * Streak System V2 - Core Logic
 * 
 * Implements the comprehensive streak system with:
 * - 5 cards/day requirement
 * - Timezone-aware deadline tracking  
 * - 2-hour grace period
 * - Stack locking
 * - Test creation with can_unfreeze logic
 * - Legacy vs current test distinction
 */

import { createClient } from '@/lib/supabase/client';
import type { UserStats, CardStack, StackTest } from '@/lib/types';
import {
  STREAK_DAILY_REQUIREMENT,
  GRACE_PERIOD_HOURS,
  MAX_PENDING_TESTS,
  calculateStreakDeadlines,
  calculateTestDeadlinesForStack,
  getTestDeadlineDays,
  getTodayDateInTimezone,
  isNewDayInTimezone,
  isInGracePeriod,
  areCardsLocked,
} from '@/lib/streak';
import { CARD_RATINGS } from '@/lib/constants';

// ============================================================
// STREAK EXPIRATION CHECK (STEP 1 of Review Exit Flow)
// ============================================================

export interface StreakExpirationResult {
  expired: boolean;
  longestPreserved?: number;
  message?: string;
}

/**
 * Check if user's streak has expired and reset if necessary.
 * This should be called FIRST before processing any card changes.
 * 
 * CRITICAL ORDER: This check prevents race conditions by ensuring
 * expired streaks are handled before any new mastery is tracked.
 */
export async function checkAndHandleStreakExpiration(
  userId: string
): Promise<StreakExpirationResult> {
  const supabase = createClient();
  
  // Fetch user's current streak data
  const { data: stats, error } = await supabase
    .from('user_stats')
    .select('current_streak, longest_streak, streak_deadline, streak_frozen, timezone')
    .eq('user_id', userId)
    .single();
  
  if (error || !stats) {
    console.error('Failed to fetch user stats for expiration check:', error);
    return { expired: false };
  }
  
  // If no streak or no deadline set, nothing to expire
  if (stats.current_streak === 0 || !stats.streak_deadline) {
    return { expired: false };
  }
  
  const now = new Date();
  const deadline = new Date(stats.streak_deadline);
  
  // Check if streak has expired (current time > actual deadline with grace)
  if (now > deadline) {
    // Preserve longest streak if current > longest
    const newLongest = Math.max(stats.current_streak, stats.longest_streak);
    
    // Reset streak to 0
    const { error: updateError } = await supabase
      .from('user_stats')
      .update({
        current_streak: 0,
        streak_frozen: false,
        cards_mastered_today: 0,
        streak_deadline: null,
        display_deadline: null,
        streak_countdown_starts: null, // Clear countdown on expiration
        longest_streak: newLongest,
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Failed to reset expired streak:', updateError);
      return { expired: false };
    }
    
    // Unlock all stacks (set contributed_to_streak = false)
    await supabase
      .from('card_stacks')
      .update({ contributed_to_streak: false })
      .eq('user_id', userId);
    
    // Clear all card contribution flags
    await supabase
      .from('flashcards')
      .update({ contributed_to_streak_date: null })
      .eq('user_id', userId);
    
    // Mark all pending tests as legacy (can_unfreeze_streak = false)
    await supabase
      .from('stack_tests')
      .update({ can_unfreeze_streak: false })
      .eq('user_id', userId)
      .eq('test_status', 'pending');
    
    return {
      expired: true,
      longestPreserved: newLongest,
      message: `Streak expired. Longest: ${newLongest} days preserved`,
    };
  }
  
  return { expired: false };
}

// ============================================================
// CARD DOWNGRADE IMPACT CHECK
// ============================================================

export interface CardDowngradeImpact {
  wouldBreakStreak: boolean;
  cardsAreLocked: boolean;
  warning: string | null;
}

/**
 * Check if lowering a card rating would break the streak.
 * 
 * NEW LOCKING LOGIC:
 * - Before midnight (countdown hasn't started): Cards can be freely downgraded
 * - After midnight (countdown has started): Cards are LOCKED, downgrading triggers penalty
 * - Only cards that actually contributed to the streak are locked
 * 
 * @param userId - User ID
 * @param cardId - ID of the card being downgraded
 * @param currentCardsMasteredToday - Current count of cards mastered today
 * @param streakAwardedToday - Whether streak was awarded today
 * @param countdownStartsAt - When countdown begins (midnight of the day streak was earned)
 * @param streakDate - The date when the streak was earned (for checking if card contributed)
 * @returns Impact assessment with warning message if applicable
 */
export async function checkCardDowngradeImpact(
  userId: string,
  cardId: string,
  currentCardsMasteredToday: number,
  streakAwardedToday: boolean,
  countdownStartsAt: string | null,
  streakDate?: string | null
): Promise<CardDowngradeImpact> {
  const supabase = createClient();
  
  // Check if this specific card contributed to the streak
  let cardContributed = false;
  if (cardId) {
    const { data: card } = await supabase
      .from('flashcards')
      .select('contributed_to_streak_date')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();
    
    if (card?.contributed_to_streak_date) {
      // Check if the card contributed on the streak date (or today if streak was just earned)
      const checkDate = streakDate || getTodayDateInTimezone('UTC');
      cardContributed = card.contributed_to_streak_date === checkDate;
    }
  }
  
  // If this card didn't contribute, downgrading it won't affect the streak
  if (!cardContributed) {
    return { wouldBreakStreak: false, cardsAreLocked: false, warning: null };
  }
  
  // Check if cards are locked (past countdown start time = past midnight)
  const cardsLocked = areCardsLocked(countdownStartsAt);
  
  // Before midnight: cards can be freely downgraded without penalty
  if (!cardsLocked) {
    // However, if streak was awarded today and we'd drop below threshold,
    // still warn but allow it (streak will be reverted, not "broken")
    if (streakAwardedToday) {
      const wouldDropBelow = (currentCardsMasteredToday - 1) < STREAK_DAILY_REQUIREMENT;
      if (wouldDropBelow) {
        return {
          wouldBreakStreak: false, // Not truly "breaking" since cards aren't locked yet
          cardsAreLocked: false,
          warning: `Lowering this card will revert today's streak progress. You'll need to reach ${STREAK_DAILY_REQUIREMENT} mastered cards again to earn today's streak.`,
        };
      }
    }
    return { wouldBreakStreak: false, cardsAreLocked: false, warning: null };
  }
  
  // After midnight: cards are LOCKED - downgrading breaks the streak
  const wouldDropBelow = (currentCardsMasteredToday - 1) < STREAK_DAILY_REQUIREMENT;
  
  if (wouldDropBelow) {
    return {
      wouldBreakStreak: true,
      cardsAreLocked: true,
      warning: `⚠️ Cards are LOCKED! Lowering this card will BREAK your streak. Cards that contributed to your streak are locked after midnight. You have ${currentCardsMasteredToday}/${STREAK_DAILY_REQUIREMENT} cards mastered.`,
    };
  }
  
  return { wouldBreakStreak: false, cardsAreLocked: true, warning: null };
}

// ============================================================
// CARD MASTERY PROCESSING (STEP 2-3 of Review Exit Flow)
// ============================================================

export interface CardMasteryChangeResult {
  cardsMasteredToday: number;
  streakIncremented: boolean;
  newStreak: number;
  testTriggered: boolean;
  stacksLocked: string[];
  countdownStartsAt: string | null; // When cards become locked (midnight)
  cardsAreLocked: boolean; // Whether cards are currently locked
}

/**
 * Process a card mastery change (rating update).
 * Tracks daily progress and triggers streak increment when 5 cards are mastered.
 * 
 * @param userId - User ID
 * @param stackId - Stack ID the card belongs to
 * @param cardId - ID of the card being updated
 * @param oldRating - Previous rating (1-5)
 * @param newRating - New rating (1-5)
 */
export async function processCardMasteryChange(
  userId: string,
  stackId: string,
  cardId: string,
  oldRating: number,
  newRating: number
): Promise<CardMasteryChangeResult> {
  const supabase = createClient();
  
  const wasNotMastered = (oldRating || 1) < CARD_RATINGS.KINDA_KNOW;
  const wasMastered = (oldRating || 1) >= CARD_RATINGS.KINDA_KNOW;
  const isNowMastered = newRating >= CARD_RATINGS.KINDA_KNOW;
  const isNowNotMastered = newRating < CARD_RATINGS.KINDA_KNOW;
  
  // Fetch current user stats
  const { data: stats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (statsError || !stats) {
    console.error('Failed to fetch user stats:', statsError);
    return {
      cardsMasteredToday: 0,
      streakIncremented: false,
      newStreak: 0,
      testTriggered: false,
      stacksLocked: [],
      countdownStartsAt: null,
      cardsAreLocked: false,
    };
  }
  
  const timezone = stats.timezone || 'UTC';
  const today = getTodayDateInTimezone(timezone);
  const needsReset = isNewDayInTimezone(stats.last_mastery_date, timezone);
  
  let cardsMasteredToday = needsReset ? 0 : (stats.cards_mastered_today || 0);
  let currentStreak = stats.current_streak || 0;
  let longestStreak = stats.longest_streak || 0;
  let streakIncremented = false;
  let streakAwardedToday = needsReset ? false : (stats.streak_awarded_today || false);
  const stacksLocked: string[] = [];
  
  // Track card mastery changes
  if (wasNotMastered && isNowMastered) {
    cardsMasteredToday += 1;
    
    // Mark stack as contributed immediately (not just at threshold)
    await supabase
      .from('card_stacks')
      .update({ contributed_to_streak: true })
      .eq('id', stackId)
      .eq('user_id', userId);
    
    // Mark this specific card as contributing to today's streak
    if (cardId) {
      await supabase
        .from('flashcards')
        .update({ contributed_to_streak_date: today })
        .eq('id', cardId)
        .eq('user_id', userId);
    }
  } else if (wasMastered && isNowNotMastered) {
    cardsMasteredToday = Math.max(0, cardsMasteredToday - 1);
    
    // Clear card contribution flag if downgraded
    if (cardId) {
      await supabase
        .from('flashcards')
        .update({ contributed_to_streak_date: null })
        .eq('id', cardId)
        .eq('user_id', userId);
    }
  }
  
  // Check if we've reached the 5-card threshold
  const prevCount = needsReset ? 0 : (stats.cards_mastered_today || 0);
  const crossedThreshold = prevCount < STREAK_DAILY_REQUIREMENT && cardsMasteredToday >= STREAK_DAILY_REQUIREMENT;
  
  let updateData: Partial<UserStats> = {
    cards_mastered_today: cardsMasteredToday,
    last_mastery_date: today,
    last_activity_date: today,
    // Reset streak_awarded_today on new day
    ...(needsReset ? { streak_awarded_today: false } : {}),
  };
  
  if (crossedThreshold) {
    // Only increment if not frozen
    if (!stats.streak_frozen) {
      currentStreak += 1;
      streakIncremented = true;
      
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }
    
    // Calculate new deadlines (now includes countdownStartsAt)
    const { countdownStartsAt, displayDeadline, actualDeadline } = calculateStreakDeadlines(timezone);
    
    updateData = {
      ...updateData,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      // Keep cards_mastered_today at actual count (don't reset to 0) for revert tracking
      streak_awarded_today: true, // Mark that today's streak has been earned
      streak_countdown_starts: countdownStartsAt.toISOString(), // When cards become locked (midnight)
      display_deadline: displayDeadline.toISOString(),
      streak_deadline: actualDeadline.toISOString(),
    };
    
    // Query all stacks that contributed today to mark them as locked
    const { data: contributingStacks } = await supabase
      .from('card_stacks')
      .select('id')
      .eq('user_id', userId)
      .eq('contributed_to_streak', true);
    
    if (contributingStacks && contributingStacks.length > 0) {
      const stackIds = contributingStacks.map(s => s.id);
      stacksLocked.push(...stackIds);
    }
  }
  
  // Check if streak should be DECREMENTED due to card revert
  // This happens when: cards drop below threshold AND streak was already awarded today
  const droppedBelowThreshold = wasMastered && isNowNotMastered && 
    cardsMasteredToday < STREAK_DAILY_REQUIREMENT && 
    streakAwardedToday;
  
  if (droppedBelowThreshold) {
    // Decrement streak (only if we have a streak to decrement)
    if (currentStreak > 0) {
      const previousStreak = currentStreak;
      currentStreak -= 1;
      
      // If user was on their initial streak (streak = 1, longest = 1) and loses it,
      // also revert longest_streak since they never actually completed a full streak day
      const wasInitialStreak = previousStreak === 1 && longestStreak === 1;
      if (wasInitialStreak) {
        longestStreak = 0;
      }
      
      updateData = {
        ...updateData,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        streak_awarded_today: false, // Mark that today's streak needs to be re-earned
        streak_countdown_starts: null, // Clear countdown since streak was reverted
      };
      
      // Unlock stacks that contributed to this cycle (they can contribute again)
      await supabase
        .from('card_stacks')
        .update({ contributed_to_streak: false })
        .eq('user_id', userId);
      
      // Clear card contribution flags for all cards
      await supabase
        .from('flashcards')
        .update({ contributed_to_streak_date: null })
        .eq('user_id', userId);
    }
  }
  
  // Update user stats
  const { error: updateError } = await supabase
    .from('user_stats')
    .update(updateData)
    .eq('user_id', userId);
  
  // Determine current lock status
  const finalCountdownStarts = updateData.streak_countdown_starts !== undefined 
    ? updateData.streak_countdown_starts 
    : stats.streak_countdown_starts;
  const cardsCurrentlyLocked = areCardsLocked(finalCountdownStarts);
  
  return {
    cardsMasteredToday: updateData.cards_mastered_today || cardsMasteredToday,
    streakIncremented,
    newStreak: currentStreak,
    testTriggered: false, // Will be set by checkAndTriggerTest
    stacksLocked,
    countdownStartsAt: finalCountdownStarts || null,
    cardsAreLocked: cardsCurrentlyLocked,
  };
}

// ============================================================
// BATCH CARD PROCESSING FOR TEST COMPLETION
// ============================================================

/**
 * Process multiple cards from test completion.
 * This ensures test cards are properly counted toward daily streak.
 * 
 * @param userId - User ID
 * @param stackId - Stack ID
 * @param passedCardIds - Array of card IDs that passed the test
 * @returns Result with updated counts and streak status
 */
export async function processTestCompletionCards(
  userId: string,
  stackId: string,
  passedCardIds: string[]
): Promise<{
  cardsMasteredToday: number;
  streakIncremented: boolean;
  newStreak: number;
}> {
  if (passedCardIds.length === 0) {
    return {
      cardsMasteredToday: 0,
      streakIncremented: false,
      newStreak: 0,
    };
  }

  const supabase = createClient();
  
  // Fetch current user stats
  const { data: stats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (statsError || !stats) {
    console.error('Failed to fetch user stats for test completion:', statsError);
    return {
      cardsMasteredToday: 0,
      streakIncremented: false,
      newStreak: 0,
    };
  }

  const timezone = stats.timezone || 'UTC';
  const today = getTodayDateInTimezone(timezone);
  const needsReset = isNewDayInTimezone(stats.last_mastery_date, timezone);
  
  let cardsMasteredToday = needsReset ? 0 : (stats.cards_mastered_today || 0);
  let currentStreak = stats.current_streak || 0;
  let longestStreak = stats.longest_streak || 0;
  let streakIncremented = false;
  
  // Add passed cards to daily count
  cardsMasteredToday += passedCardIds.length;
  
  // Mark stack as contributed
  await supabase
    .from('card_stacks')
    .update({ contributed_to_streak: true })
    .eq('id', stackId)
    .eq('user_id', userId);
  
  // Mark all passed cards as contributing to today's streak
  await supabase
    .from('flashcards')
    .update({ contributed_to_streak_date: today })
    .eq('user_id', userId)
    .in('id', passedCardIds);
  
  // Check if we've reached the 5-card threshold
  const prevCount = needsReset ? 0 : (stats.cards_mastered_today || 0);
  const crossedThreshold = prevCount < STREAK_DAILY_REQUIREMENT && cardsMasteredToday >= STREAK_DAILY_REQUIREMENT;
  
  let updateData: Partial<UserStats> = {
    cards_mastered_today: cardsMasteredToday,
    last_mastery_date: today,
    last_activity_date: today,
    ...(needsReset ? { streak_awarded_today: false } : {}),
  };
  
  if (crossedThreshold) {
    // Only increment if not frozen
    if (!stats.streak_frozen) {
      currentStreak += 1;
      streakIncremented = true;
      
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }
    
    // Calculate new deadlines
    const { countdownStartsAt, displayDeadline, actualDeadline } = calculateStreakDeadlines(timezone);
    
    updateData = {
      ...updateData,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      streak_awarded_today: true,
      streak_countdown_starts: countdownStartsAt.toISOString(),
      display_deadline: displayDeadline.toISOString(),
      streak_deadline: actualDeadline.toISOString(),
    };
  }
  
  // Update user stats
  await supabase
    .from('user_stats')
    .update(updateData)
    .eq('user_id', userId);
  
  return {
    cardsMasteredToday: updateData.cards_mastered_today || cardsMasteredToday,
    streakIncremented,
    newStreak: currentStreak,
  };
}

// ============================================================
// TEST TRIGGER (STEP 4 of Review Exit Flow)
// ============================================================

export interface TestTriggerResult {
  triggered: boolean;
  testId?: string;
  displayDeadline?: string;
  message?: string;
}

/**
 * Check if a test should be triggered for a stack that has all cards mastered.
 * Creates a test record if conditions are met.
 */
export async function checkAndTriggerTest(
  userId: string,
  stackId: string,
  stackSize: number,
  allCardsMastered: boolean
): Promise<TestTriggerResult> {
  if (!allCardsMastered) {
    return { triggered: false };
  }
  
  const supabase = createClient();
  
  // Check if stack already has a pending test
  const { data: existingTest } = await supabase
    .from('stack_tests')
    .select('id')
    .eq('stack_id', stackId)
    .single();
  
  if (existingTest) {
    return { triggered: false, message: 'Test already exists for this stack' };
  }
  
  // Fetch user's timezone and current streak
  const { data: stats } = await supabase
    .from('user_stats')
    .select('timezone, current_streak')
    .eq('user_id', userId)
    .single();
  
  const timezone = stats?.timezone || 'UTC';
  const hasActiveStreak = (stats?.current_streak || 0) > 0;
  
  // Count pending tests that can unfreeze
  const { count: pendingCount } = await supabase
    .from('stack_tests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('test_status', 'pending')
    .eq('can_unfreeze_streak', true);
  
  if ((pendingCount || 0) >= MAX_PENDING_TESTS) {
    return {
      triggered: false,
      message: 'Maximum pending tests reached. Complete a test first.',
    };
  }
  
  // Calculate test deadlines
  const { displayDeadline, actualDeadline } = calculateTestDeadlinesForStack(
    stackSize,
    timezone
  );
  
  // Create test record
  const { data: newTest, error: testError } = await supabase
    .from('stack_tests')
    .insert({
      user_id: userId,
      stack_id: stackId,
      stack_size: stackSize,
      all_cards_mastered_at: new Date().toISOString(),
      display_deadline: displayDeadline.toISOString(),
      test_deadline: actualDeadline.toISOString(),
      test_status: 'pending',
      can_unfreeze_streak: hasActiveStreak, // Current test if user has streak
      has_frozen_streak: false,
    })
    .select()
    .single();
  
  if (testError) {
    console.error('Failed to create test:', testError);
    return { triggered: false, message: 'Failed to create test' };
  }
  
  // Update stack status
  await supabase
    .from('card_stacks')
    .update({ status: 'pending_test' })
    .eq('id', stackId);
  
  return {
    triggered: true,
    testId: newTest.id,
    displayDeadline: displayDeadline.toISOString(),
  };
}

// ============================================================
// TEST COMPLETION
// ============================================================

export interface TestCompletionResult {
  success: boolean;
  unfrozen: boolean;
  streakIncremented: boolean;
  newStreak: number;
  isLegacy: boolean;
  message: string;
}

/**
 * Handle test completion (pass/fail).
 * Implements freeze/unfreeze logic based on test type (current vs legacy).
 */
export async function completeTest(
  testId: string,
  passed: boolean
): Promise<TestCompletionResult> {
  const supabase = createClient();
  
  // Fetch the test
  const { data: test, error: testError } = await supabase
    .from('stack_tests')
    .select('*, card_stacks!inner(*)')
    .eq('id', testId)
    .single();
  
  if (testError || !test) {
    return {
      success: false,
      unfrozen: false,
      streakIncremented: false,
      newStreak: 0,
      isLegacy: false,
      message: 'Test not found',
    };
  }
  
  const userId = test.user_id;
  const stackId = test.stack_id;
  const canUnfreeze = test.can_unfreeze_streak;
  
  if (!passed) {
    // Test failed - keep pending, continue countdown
    return {
      success: true,
      unfrozen: false,
      streakIncremented: false,
      newStreak: 0,
      isLegacy: !canUnfreeze,
      message: 'Test not passed. Keep studying and try again!',
    };
  }
  
  // Test passed
  // Update test status
  await supabase
    .from('stack_tests')
    .update({ test_status: 'passed' })
    .eq('id', testId);
  
  // Update stack status to completed
  await supabase
    .from('card_stacks')
    .update({
      status: 'completed',
      test_progress: 100,
      last_test_date: new Date().toISOString(),
    })
    .eq('id', stackId);
  
  // Fetch user stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!stats) {
    return {
      success: true,
      unfrozen: false,
      streakIncremented: false,
      newStreak: 0,
      isLegacy: !canUnfreeze,
      message: 'Test passed! Stack completed.',
    };
  }
  
  let unfrozen = false;
  let streakIncremented = false;
  let newStreak = stats.current_streak;
  
  // Check if we can unfreeze
  if (stats.streak_frozen && canUnfreeze) {
    // Unfreeze and increment streak by 1
    newStreak += 1;
    const newLongest = Math.max(newStreak, stats.longest_streak);
    
    await supabase
      .from('user_stats')
      .update({
        streak_frozen: false,
        current_streak: newStreak,
        longest_streak: newLongest,
      })
      .eq('user_id', userId);
    
    unfrozen = true;
    streakIncremented = true;
    
    return {
      success: true,
      unfrozen: true,
      streakIncremented: true,
      newStreak,
      isLegacy: false,
      message: `Unfrozen! Streak: ${newStreak - 1} → ${newStreak}`,
    };
  }
  
  // Legacy test or not frozen
  if (!canUnfreeze) {
    return {
      success: true,
      unfrozen: false,
      streakIncremented: false,
      newStreak,
      isLegacy: true,
      message: 'Legacy test complete! Stack unlocked.',
    };
  }
  
  // Update total stacks completed
  await supabase
    .from('user_stats')
    .update({
      total_stacks_completed: (stats.total_stacks_completed || 0) + 1,
    })
    .eq('user_id', userId);
  
  return {
    success: true,
    unfrozen: false,
    streakIncremented: false,
    newStreak,
    isLegacy: false,
    message: 'Test passed! Stack completed.',
  };
}

// ============================================================
// TEST EXPIRATION / FREEZE LOGIC
// ============================================================

export interface TestExpirationResult {
  frozenUsers: number;
  expiredTests: number;
}

/**
 * Check all pending tests for expiration and freeze streaks if necessary.
 * This should be called by the hourly cron job.
 */
export async function checkAndFreezeExpiredTests(): Promise<TestExpirationResult> {
  const supabase = createClient();
  const now = new Date().toISOString();
  
  // Find all expired pending tests that can freeze
  const { data: expiredTests, error } = await supabase
    .from('stack_tests')
    .select('id, user_id, has_frozen_streak, can_unfreeze_streak')
    .eq('test_status', 'pending')
    .eq('can_unfreeze_streak', true)
    .eq('has_frozen_streak', false)
    .lt('test_deadline', now);
  
  if (error || !expiredTests) {
    console.error('Failed to fetch expired tests:', error);
    return { frozenUsers: 0, expiredTests: 0 };
  }
  
  let frozenUsers = 0;
  
  for (const test of expiredTests) {
    // Fetch user's current state
    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, streak_frozen')
      .eq('user_id', test.user_id)
      .single();
    
    // Only freeze if user has active streak and not already frozen
    if (stats && stats.current_streak > 0 && !stats.streak_frozen) {
      // Freeze the user's streak
      await supabase
        .from('user_stats')
        .update({ streak_frozen: true })
        .eq('user_id', test.user_id);
      
      // Mark test as having frozen the streak
      await supabase
        .from('stack_tests')
        .update({ has_frozen_streak: true })
        .eq('id', test.id);
      
      frozenUsers++;
    }
  }
  
  return {
    frozenUsers,
    expiredTests: expiredTests.length,
  };
}

// ============================================================
// STACK DELETION CHECK
// ============================================================

export interface StackDeletionCheck {
  canDelete: boolean;
  requiresWarning: boolean;
  warningType: 'streak_reset' | 'legacy_test' | 'none';
  currentStreak: number;
  longestStreak: number;
  message: string;
}

/**
 * Check what happens if a stack is deleted.
 * Determines if a warning should be shown and what type.
 */
export async function checkStackDeletion(
  userId: string,
  stackId: string
): Promise<StackDeletionCheck> {
  const supabase = createClient();
  
  // Fetch stack and any associated test
  const { data: stack } = await supabase
    .from('card_stacks')
    .select('*')
    .eq('id', stackId)
    .single();
  
  if (!stack) {
    return {
      canDelete: false,
      requiresWarning: false,
      warningType: 'none',
      currentStreak: 0,
      longestStreak: 0,
      message: 'Stack not found',
    };
  }
  
  // Fetch associated test if exists
  const { data: test } = await supabase
    .from('stack_tests')
    .select('*')
    .eq('stack_id', stackId)
    .single();
  
  // Fetch user stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('current_streak, longest_streak')
    .eq('user_id', userId)
    .single();
  
  const currentStreak = stats?.current_streak || 0;
  const longestStreak = stats?.longest_streak || 0;
  
  // Completed stacks can always be deleted freely
  if (stack.status === 'completed') {
    return {
      canDelete: true,
      requiresWarning: false,
      warningType: 'none',
      currentStreak,
      longestStreak,
      message: 'Stack completed - safe to delete',
    };
  }
  
  // Check if stack would reset streak
  if (
    currentStreak > 0 &&
    (stack.contributed_to_streak ||
      (stack.status === 'pending_test' && test?.can_unfreeze_streak))
  ) {
    return {
      canDelete: true,
      requiresWarning: true,
      warningType: 'streak_reset',
      currentStreak,
      longestStreak,
      message: `Deleting this stack will reset your ${currentStreak}-day streak to 0. Your longest streak of ${longestStreak} days will remain safe.`,
    };
  }
  
  // Check if it's a legacy test
  if (stack.status === 'pending_test' && test && !test.can_unfreeze_streak) {
    return {
      canDelete: true,
      requiresWarning: true,
      warningType: 'legacy_test',
      currentStreak,
      longestStreak,
      message: "This stack has a legacy test. Complete it anytime to properly unlock. Deleting won't affect your current streak.",
    };
  }
  
  // Safe to delete without warning
  return {
    canDelete: true,
    requiresWarning: false,
    warningType: 'none',
    currentStreak,
    longestStreak,
    message: 'Safe to delete',
  };
}

/**
 * Execute stack deletion with streak reset if necessary.
 */
export async function executeStackDeletion(
  userId: string,
  stackId: string,
  resetStreak: boolean
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  
  // First, get the stack's mastered card count to subtract from total
  const { data: stackData } = await supabase
    .from('card_stacks')
    .select('mastered_count, cards_mastered')
    .eq('id', stackId)
    .single();
  
  const masteredCardsInStack = stackData?.mastered_count || stackData?.cards_mastered || 0;
  
  if (resetStreak) {
    // Fetch current stats to preserve longest and update total mastered
    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, longest_streak, total_cards_mastered, current_week_cards')
      .eq('user_id', userId)
      .single();
    
    const newLongest = Math.max(
      stats?.current_streak || 0,
      stats?.longest_streak || 0
    );
    
    // Subtract the deleted stack's mastered cards from totals
    const newTotalMastered = Math.max(0, (stats?.total_cards_mastered || 0) - masteredCardsInStack);
    const newWeekCards = Math.max(0, (stats?.current_week_cards || 0) - masteredCardsInStack);
    
    // Reset streak, unlock all stacks, and subtract mastered cards
    await supabase
      .from('user_stats')
      .update({
        current_streak: 0,
        streak_frozen: false,
        cards_mastered_today: 0,
        streak_deadline: null,
        display_deadline: null,
        streak_countdown_starts: null, // Clear countdown on streak reset
        longest_streak: newLongest,
        total_cards_mastered: newTotalMastered,
        current_week_cards: newWeekCards,
      })
      .eq('user_id', userId);
    
    // Unlock all stacks
    await supabase
      .from('card_stacks')
      .update({ contributed_to_streak: false })
      .eq('user_id', userId);
    
    // Clear all card contribution flags
    await supabase
      .from('flashcards')
      .update({ contributed_to_streak_date: null })
      .eq('user_id', userId);
    
    // Mark all tests as legacy
    await supabase
      .from('stack_tests')
      .update({ can_unfreeze_streak: false })
      .eq('user_id', userId)
      .eq('test_status', 'pending');
  } else if (masteredCardsInStack > 0) {
    // Even if not resetting streak, still subtract mastered cards from totals
    const { data: stats } = await supabase
      .from('user_stats')
      .select('total_cards_mastered, current_week_cards')
      .eq('user_id', userId)
      .single();
    
    const newTotalMastered = Math.max(0, (stats?.total_cards_mastered || 0) - masteredCardsInStack);
    const newWeekCards = Math.max(0, (stats?.current_week_cards || 0) - masteredCardsInStack);
    
    await supabase
      .from('user_stats')
      .update({ 
        total_cards_mastered: newTotalMastered,
        current_week_cards: newWeekCards,
      })
      .eq('user_id', userId);
  }
  
  // Delete the test record if exists
  await supabase
    .from('stack_tests')
    .delete()
    .eq('stack_id', stackId);
  
  // Delete the flashcards
  await supabase
    .from('flashcards')
    .delete()
    .eq('stack_id', stackId);
  
  // Delete the stack
  const { error } = await supabase
    .from('card_stacks')
    .delete()
    .eq('id', stackId);
  
  if (error) {
    return { success: false, message: 'Failed to delete stack' };
  }
  
  return {
    success: true,
    message: resetStreak
      ? 'Stack deleted. Streak reset. Longest streak preserved.'
      : 'Stack deleted successfully.',
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get the current streak status for UI display.
 */
export async function getStreakStatus(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  isFrozen: boolean;
  cardsMasteredToday: number;
  cardsNeeded: number;
  displayDeadline: string | null;
  isInGrace: boolean;
  timezone: string;
}> {
  const supabase = createClient();
  
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!stats) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isFrozen: false,
      cardsMasteredToday: 0,
      cardsNeeded: STREAK_DAILY_REQUIREMENT,
      displayDeadline: null,
      isInGrace: false,
      timezone: 'UTC',
    };
  }
  
  const inGrace = isInGracePeriod(stats.display_deadline, stats.streak_deadline);
  
  return {
    currentStreak: stats.current_streak || 0,
    longestStreak: stats.longest_streak || 0,
    isFrozen: stats.streak_frozen || false,
    cardsMasteredToday: stats.cards_mastered_today || 0,
    cardsNeeded: Math.max(0, STREAK_DAILY_REQUIREMENT - (stats.cards_mastered_today || 0)),
    displayDeadline: stats.display_deadline,
    isInGrace: inGrace,
    timezone: stats.timezone || 'UTC',
  };
}
