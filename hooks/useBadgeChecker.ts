'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/lib/types';
import { 
  checkBadgeEligibility, 
  createBadge, 
  BADGE_DEFINITIONS,
  awardEventBadge 
} from '@/components/social/AchievementBadges';
import { createClient } from '@/lib/supabase/client';
import { notifyAwardEarned } from '@/lib/notifications';

export interface BadgeStats {
  current_streak: number;
  longest_streak?: number;
  total_cards_mastered: number;
  total_stacks_completed: number;
  friends_count?: number;
  challenges_won?: number;
  stacks_shared?: number;
  best_test_score?: number;
  ice_breaker_count?: number;
  tests_completed?: number;
  perfect_test_streak?: number;
  cards_mastered_today?: number; // Replaces daily_cards_learned
  daily_goal_streak?: number;
  languages_count?: number;
  is_premium?: boolean;
  stack_copy_count?: number;
}

// Icon mapping for toast display
const categoryEmoji: Record<Badge['category'], string> = {
  streak: '🔥',
  cards: '📚',
  stacks: '🎯',
  social: '👥',
  special: '⭐',
  recovery: '❄️',
  performance: '🚀',
};

export function useBadgeChecker() {
  const supabase = createClient();
  const processingRef = useRef(false);

  // Check and award new badges based on stats
  const checkAndAwardBadges = useCallback(async (
    userId: string,
    stats: BadgeStats,
    existingBadges: Badge[]
  ): Promise<Badge[]> => {
    if (processingRef.current) return [];
    processingRef.current = true;

    try {
      // Check which badges are now eligible
      const newBadgeIds = checkBadgeEligibility(stats, existingBadges);
      
      if (newBadgeIds.length === 0) {
        return [];
      }

      // Create badge objects
      const newBadges: Badge[] = newBadgeIds
        .map(id => createBadge(id))
        .filter((badge): badge is Badge => badge !== null);

      if (newBadges.length === 0) {
        return [];
      }

      // Update user profile with new badges
      const updatedBadges = [...existingBadges, ...newBadges];
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ badges: updatedBadges })
        .eq('id', userId);

      if (error) {
        console.error('Failed to save badges:', error);
        return [];
      }

      // Show toast notifications and create notifications for each new badge
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      newBadges.forEach(async (badge) => {
        const emoji = categoryEmoji[badge.category];
        toast.success(
          `${emoji} Badge Earned: ${badge.name}`,
          {
            description: badge.description,
            duration: 5000,
          }
        );

        // Create notification for award earned
        if (accessToken) {
          await notifyAwardEarned(userId, badge.name, badge.description, badge.id, accessToken);
        }
      });

      return newBadges;
    } finally {
      processingRef.current = false;
    }
  }, [supabase]);

  // Award a specific event-based badge
  const awardEventBasedBadge = useCallback(async (
    userId: string,
    eventType: 'clutch_test' | 'comeback_kid' | 'night_owl' | 'early_bird' | 'weekend_warrior' | 'speed_learner',
    existingBadges: Badge[]
  ): Promise<Badge | null> => {
    if (processingRef.current) return null;
    processingRef.current = true;

    try {
      const badgeId = awardEventBadge(eventType, existingBadges);
      
      if (!badgeId) {
        return null; // Badge already earned
      }

      const newBadge = createBadge(badgeId);
      
      if (!newBadge) {
        return null;
      }

      // Update user profile with new badge
      const updatedBadges = [...existingBadges, newBadge];
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ badges: updatedBadges })
        .eq('id', userId);

      if (error) {
        console.error('Failed to save event badge:', error);
        return null;
      }

      // Show toast notification
      const emoji = categoryEmoji[newBadge.category];
      toast.success(
        `${emoji} Badge Earned: ${newBadge.name}`,
        {
          description: newBadge.description,
          duration: 5000,
        }
      );

      // Create notification for award earned
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (accessToken) {
        await notifyAwardEarned(userId, newBadge.name, newBadge.description, newBadge.id, accessToken);
      }

      return newBadge;
    } finally {
      processingRef.current = false;
    }
  }, [supabase]);

  // Check for time-based badges (night owl, early bird)
  const checkTimeBadge = useCallback(async (
    userId: string,
    existingBadges: Badge[]
  ): Promise<Badge | null> => {
    const hour = new Date().getHours();
    
    if (hour >= 0 && hour < 6) {
      // Early bird: before 6am
      return awardEventBasedBadge(userId, 'early_bird', existingBadges);
    } else if (hour >= 0 && hour < 5) {
      // Night owl: after midnight (0-4am counts as "after midnight")
      return awardEventBasedBadge(userId, 'night_owl', existingBadges);
    }
    
    return null;
  }, [awardEventBasedBadge]);

  // Check for weekend warrior badge
  const checkWeekendBadge = useCallback(async (
    userId: string,
    existingBadges: Badge[],
    studiedDays: Set<number> // 0 = Sunday, 6 = Saturday
  ): Promise<Badge | null> => {
    if (studiedDays.has(0) && studiedDays.has(6)) {
      return awardEventBasedBadge(userId, 'weekend_warrior', existingBadges);
    }
    return null;
  }, [awardEventBasedBadge]);

  return {
    checkAndAwardBadges,
    awardEventBasedBadge,
    checkTimeBadge,
    checkWeekendBadge,
  };
}

// Utility function to build stats from user data
export function buildBadgeStats(
  userStats: {
    current_streak?: number;
    longest_streak?: number;
    total_cards_mastered?: number;
    total_stacks_completed?: number;
    cards_mastered_today?: number; // Replaces daily_cards_learned
    // New achievement tracking fields from user_stats table
    tests_completed?: number;
    perfect_test_streak?: number;
    daily_goal_streak?: number;
    ice_breaker_count?: number;
  } | null,
  additionalStats?: {
    friends_count?: number;
    challenges_won?: number;
    stacks_shared?: number;
    best_test_score?: number;
    ice_breaker_count?: number;
    tests_completed?: number;
    perfect_test_streak?: number;
    daily_goal_streak?: number;
    languages_count?: number;
    is_premium?: boolean;
    stack_copy_count?: number;
  }
): BadgeStats {
  return {
    current_streak: userStats?.current_streak ?? 0,
    longest_streak: userStats?.longest_streak ?? 0,
    total_cards_mastered: userStats?.total_cards_mastered ?? 0,
    total_stacks_completed: userStats?.total_stacks_completed ?? 0,
    cards_mastered_today: userStats?.cards_mastered_today ?? 0,
    // Pull achievement stats from userStats first, then allow additionalStats to override
    tests_completed: userStats?.tests_completed ?? 0,
    perfect_test_streak: userStats?.perfect_test_streak ?? 0,
    daily_goal_streak: userStats?.daily_goal_streak ?? 0,
    ice_breaker_count: userStats?.ice_breaker_count ?? 0,
    ...additionalStats,
  };
}

