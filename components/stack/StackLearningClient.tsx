'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Trophy, ArrowLeftRight, PenLine, Check, X, Loader2, RotateCcw, Lightbulb, ChevronDown, ChevronUp, Volume2, Sparkles, Moon, Sun } from 'lucide-react';
import { useSpeech, TTSProvider, VoiceGender } from '@/hooks/use-speech';
import { Input } from '@/components/ui/input';
import type { CardStack, Flashcard, TestNote } from '@/lib/types';
import Confetti from 'react-confetti';
import { CARD_RATINGS } from '@/lib/constants';
import { WordHoverText, getWordTranslations } from '@/components/ui/word-hover';
import { shouldResetWeek, getWeekStartUTC, WEEKLY_CARD_CAP } from '@/lib/weekly-stats';
import { isNewDay, getTodayDate, calculateTestDeadline, STREAK_DAILY_REQUIREMENT, isNewDayInTimezone } from '@/lib/streak';
import { useBadgeChecker, buildBadgeStats } from '@/hooks/useBadgeChecker';
import type { Badge as BadgeType } from '@/lib/types';
import {
  checkAndHandleStreakExpiration,
  processCardMasteryChange,
  checkAndTriggerTest,
  completeTest,
  checkCardDowngradeImpact,
} from '@/lib/streak-system';
import { STATS_UPDATED_EVENT } from '@/components/layout/AppLayout';

interface Props {
  stack: CardStack;
  cards: Flashcard[];
}

// Duolingo-style rating colors
const RATING_OPTIONS = [
  { value: CARD_RATINGS.REALLY_DONT_KNOW, label: "Really Don't Know", color: '#ff4b4b', shadow: '#cc3b3b' },
  { value: CARD_RATINGS.DONT_KNOW, label: "Don't Know", color: '#ff9600', shadow: '#cc7800' },
  { value: CARD_RATINGS.NEUTRAL, label: 'Neutral', color: '#ffc800', shadow: '#cca000' },
  { value: CARD_RATINGS.KINDA_KNOW, label: 'Kinda Know', color: '#58cc02', shadow: '#46a302' },
  { value: CARD_RATINGS.REALLY_KNOW, label: 'Really Know', color: '#1cb0f6', shadow: '#1899d6' },
];

export default function StackLearningClient({ stack: initialStack, cards: initialCards }: Props) {
  const router = useRouter();
  const { checkAndAwardBadges, awardEventBasedBadge, checkTimeBadge } = useBadgeChecker();
  const [stack, setStack] = useState(initialStack);
  const [originalCards] = useState(initialCards);
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [conversationalMode, setConversationalMode] = useState(initialStack.conversational_mode || false);
  const [wordTranslations, setWordTranslations] = useState<Record<string, any>>({});
  const [mistakes, setMistakes] = useState<any[]>([]);
  
  // Streak system v2 - track stacks contributing to current 5-card cycle
  const [stacksContributedThisSession] = useState<Set<string>>(new Set());
  
  // Test mode state
  const [testMode, setTestMode] = useState(false);
  const [testCardIndex, setTestCardIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResults, setTestResults] = useState<TestNote[]>([]);
  const [isGrading, setIsGrading] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{ passed: boolean; correction?: string; feedback: string } | null>(null);
  const [testComplete, setTestComplete] = useState(false);
  const [showMasteredModal, setShowMasteredModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownData, setBreakdownData] = useState<Record<string, any>>({});
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('elevenlabs'); // Now uses OpenAI TTS
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [cardsMasteredToday, setCardsMasteredToday] = useState(0);
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
  const [pendingRating, setPendingRating] = useState<{ rating: number; oldRating: number } | null>(null);
  
  const supabase = createClient();
  
  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('lockn-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  // Fetch current cards mastered today on mount
  useEffect(() => {
    const fetchCardsMastered = async () => {
      const { data } = await supabase
        .from('user_stats')
        .select('cards_mastered_today')
        .eq('user_id', stack.user_id)
        .single();
      if (data) {
        setCardsMasteredToday(data.cards_mastered_today || 0);
      }
    };
    fetchCardsMastered();
  }, [stack.user_id, supabase]);
  
  // Handle exit button click - warn if below streak requirement
  const handleExitClick = () => {
    if (cardsMasteredToday < STREAK_DAILY_REQUIREMENT) {
      setShowExitWarning(true);
    } else {
      router.push('/dashboard');
    }
  };
  
  const toggleDarkMode = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lockn-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lockn-theme', 'light');
    }
  };
  
  // Handle saving audio hash to flashcard for cross-user caching
  const handleAudioHash = useCallback(async (hash: string, text: string) => {
    // Find the card that matches this text
    const matchingCard = cards.find(
      c => c.target_phrase === text || c.native_translation === text
    );
    
    if (matchingCard && !matchingCard.audio_hash) {
      // Save hash to flashcard for future lookups
      await supabase
        .from('flashcards')
        .update({ audio_hash: hash })
        .eq('id', matchingCard.id);
      
      // Update local state
      setCards(prev => prev.map(c => 
        c.id === matchingCard.id ? { ...c, audio_hash: hash } : c
      ));
    }
  }, [cards, supabase]);
  
  const { speak, isSpeaking, isLoading: isTTSLoading } = useSpeech({ 
    provider: ttsProvider, 
    gender: voiceGender,
    onAudioHash: handleAudioHash,
  });

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const allCardsMastered = cards.every((c) => (c.user_rating || 1) >= 4);

  // Reset breakdown when card changes
  useEffect(() => {
    setShowBreakdown(false);
  }, [currentIndex]);

  // Preload audio for next cards when using AI TTS (makes playback instant)
  useEffect(() => {
    if (ttsProvider !== 'elevenlabs' || !stack.target_language) return;
    
    // Preload next 2 cards' audio
    const cardsToPreload = cards.slice(currentIndex + 1, currentIndex + 3);
    
    cardsToPreload.forEach(card => {
      if (!card.audio_url) {
        // Prefetch audio in background (browser will cache it)
        const preloadUrl = `/api/text-to-speech`;
        fetch(preloadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: card.target_phrase, 
            language: stack.target_language,
            voiceGender,
          }),
        }).catch(() => {}); // Ignore errors, this is just prefetching
      }
    });
  }, [currentIndex, ttsProvider, cards, stack.target_language, voiceGender]);
  
  const getTestResultForCard = (cardId: string) => {
    if (!stack.test_notes || !Array.isArray(stack.test_notes)) return null;
    return stack.test_notes.find((note: TestNote) => note.cardId === cardId);
  };
  const currentCardTestResult = currentCard ? getTestResultForCard(currentCard.id) : null;

  useEffect(() => {
    if (allCardsMastered) {
      setShowConfetti(true);
      setShowMasteredModal(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [allCardsMastered]);

  useEffect(() => {
    if (conversationalMode) {
      const sorted = [...originalCards].sort((a, b) => a.card_order - b.card_order);
      setCards(sorted);
    } else {
      setCards([...originalCards]);
    }
  }, [conversationalMode, originalCards]);

  useEffect(() => {
    async function loadMistakes() {
      const { data: stackData } = await supabase
        .from('card_stacks')
        .select('user_mistakes')
        .eq('id', stack.id)
        .maybeSingle();

      if (stackData?.user_mistakes && Array.isArray(stackData.user_mistakes)) {
        setMistakes(stackData.user_mistakes);
      }
    }
    loadMistakes();
  }, [stack.id, stack.is_completed]);

  // Fetch word translations for target language content
  useEffect(() => {
    if (currentCard) {
      const targetLang = stack.target_language || 'Spanish';
      
      // Fetch translations for target phrase
      const targetKey = `${currentCard.id}-target`;
      if (!wordTranslations[targetKey]) {
        getWordTranslations(currentCard.target_phrase, targetLang, 'English').then(translations => {
          setWordTranslations((prev: Record<string, any>) => ({
            ...prev,
            [targetKey]: translations
          }));
        });
      }
      
      }
  }, [currentCard, stack.target_language]);

  // Pre-load cached breakdowns from cards on mount
  useEffect(() => {
    const cachedBreakdowns: Record<string, any> = {};
    initialCards.forEach(card => {
      if (card.grammar_breakdown) {
        cachedBreakdowns[card.id] = card.grammar_breakdown;
      }
    });
    if (Object.keys(cachedBreakdowns).length > 0) {
      setBreakdownData(prev => ({ ...prev, ...cachedBreakdowns }));
      console.log(`[Breakdown] Pre-loaded ${Object.keys(cachedBreakdowns).length} cached breakdowns`);
    }
  }, [initialCards]);

  // Trigger background pre-caching for uncached cards
  useEffect(() => {
    const uncachedCards = initialCards.filter(card => !card.grammar_breakdown || !card.audio_url);
    if (uncachedCards.length > 0) {
      console.log(`[Precache] Triggering background caching for ${uncachedCards.length} cards`);
      fetch('/api/precache-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stackId: stack.id,
          targetLanguage: stack.target_language,
          nativeLanguage: stack.native_language || 'English',
        }),
      }).catch(err => console.error('[Precache] Background caching failed:', err));
    }
  }, [stack.id, stack.target_language, stack.native_language, initialCards]);

  // Fetch breakdown data for a card (uses cached data if available)
  const fetchBreakdown = async (card: Flashcard) => {
    const breakdownKey = card.id;
    
    // Check if already in component state
    if (breakdownData[breakdownKey]) {
      setShowBreakdown(true);
      return;
    }
    
    // Check if cached in the card data
    if (card.grammar_breakdown) {
      setBreakdownData(prev => ({ ...prev, [breakdownKey]: card.grammar_breakdown }));
      setShowBreakdown(true);
      console.log(`[Breakdown] Using cached data for card ${card.id}`);
      return;
    }
    
    // Fetch from API if not cached
    setIsLoadingBreakdown(true);
    try {
      const response = await fetch('/api/phrase-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: card.target_phrase,
          translation: card.native_translation,
          targetLanguage: stack.target_language || 'Spanish',
          nativeLanguage: 'English',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setBreakdownData(prev => ({ ...prev, [breakdownKey]: data }));
        setShowBreakdown(true);
        
        // Cache the breakdown in the database for future use
        supabase
          .from('flashcards')
          .update({ grammar_breakdown: data })
          .eq('id', card.id)
          .then(({ error }) => {
            if (error) console.warn('[Breakdown] Failed to cache:', error);
            else console.log(`[Breakdown] Cached for card ${card.id}`);
          });
      }
    } catch (error) {
      console.error('Error fetching breakdown:', error);
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!currentCard) return;

    // ============================================================
    // STREAK SYSTEM V2 - REVIEW EXIT FLOW
    // ============================================================
    
    // STEP 1: Check if streak has expired FIRST (prevents race conditions)
    try {
      const expirationResult = await checkAndHandleStreakExpiration(stack.user_id);
      if (expirationResult.expired) {
        console.log('Streak expired:', expirationResult.message);
        // Notify nav to update streak display
        window.dispatchEvent(new Event(STATS_UPDATED_EVENT));
      }
    } catch (e) {
      console.error('Streak expiration check error:', e);
    }

    const oldRating = currentCard.user_rating || 1;
    const wasMasteredBefore = oldRating >= CARD_RATINGS.KINDA_KNOW;
    const isNowNotMastered = rating < CARD_RATINGS.KINDA_KNOW;

    // Check if downgrading would break the same-day streak
    if (wasMasteredBefore && isNowNotMastered) {
      // Fetch user stats to check current state
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('cards_mastered_today, streak_awarded_today, last_mastery_date, timezone')
        .eq('user_id', stack.user_id)
        .single();

      if (userStats) {
        const timezone = userStats.timezone || 'UTC';
        const isNewDay = isNewDayInTimezone(userStats.last_mastery_date, timezone);
        
        const impact = await checkCardDowngradeImpact(
          stack.user_id,
          userStats.cards_mastered_today || 0,
          userStats.streak_awarded_today || false,
          isNewDay
        );

        if (impact.wouldBreakStreak) {
          // Store pending rating and show warning dialog
          setPendingRating({ rating, oldRating });
          setShowDowngradeWarning(true);
          return; // Don't proceed with rating change yet
        }
      }
    }

    // Update flashcard with new rating
    await supabase
      .from('flashcards')
      .update({
        user_rating: rating,
        review_count: currentCard.review_count + 1,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentCard.id);

    const updatedCards = [...cards];
    updatedCards[currentIndex] = {
      ...currentCard,
      user_rating: rating,
      review_count: currentCard.review_count + 1,
    };
    setCards(updatedCards);

    const masteredCount = updatedCards.filter((c) => (c.user_rating || 1) >= 4).length;
    
    // Update stack mastered count and cards_mastered (v2 field)
    await supabase
      .from('card_stacks')
      .update({ 
        mastered_count: masteredCount,
        cards_mastered: masteredCount,
      })
      .eq('id', stack.id);

    // Increment total reviews
    await supabase.rpc('increment', {
      table_name: 'user_stats',
      column_name: 'total_reviews',
      user_id_val: stack.user_id,
    });

    // STEP 2 & 3: Process card mastery change and check for streak increment
    const wasNotMasteredBefore = oldRating < CARD_RATINGS.KINDA_KNOW;
    const isNowMastered = rating >= CARD_RATINGS.KINDA_KNOW;
    
    // Only process mastery changes (not neutral rating changes)
    if (wasNotMasteredBefore && isNowMastered) {
      try {
        // Track this stack as contributing to the current 5-card cycle
        stacksContributedThisSession.add(stack.id);
        
        // Process mastery change with new streak system
        const masteryResult = await processCardMasteryChange(
          stack.user_id,
          stack.id,
          oldRating,
          rating,
          stacksContributedThisSession
        );
        
        // Update local state for exit warning
        setCardsMasteredToday(masteryResult.cardsMasteredToday);
        
        if (masteryResult.streakIncremented) {
          console.log('Streak incremented to:', masteryResult.newStreak);
          // Clear the session tracking for next cycle
          stacksContributedThisSession.clear();
        }
        
        // Also update weekly stats counter
        const today = getTodayDate();
        const { data: dailyStats } = await supabase
          .from('user_stats')
          .select('total_cards_mastered, current_week_cards, current_week_start')
          .eq('user_id', stack.user_id)
          .single();
          
        if (dailyStats) {
          // Calculate weekly card updates (simple counter, resets on Sunday)
          let newWeekCards = dailyStats.current_week_cards || 0;
          let newWeekStart = dailyStats.current_week_start;
          
          // Check if we need to reset for a new week
          if (shouldResetWeek(dailyStats.current_week_start)) {
            newWeekCards = 0;
            newWeekStart = getWeekStartUTC();
          }
          
          // Increment weekly cards (respecting cap)
          if (newWeekCards < WEEKLY_CARD_CAP) {
            newWeekCards += 1;
          }
          
          await supabase
            .from('user_stats')
            .update({
              total_cards_mastered: (dailyStats.total_cards_mastered || 0) + 1,
              current_week_cards: newWeekCards,
              current_week_start: newWeekStart,
              last_activity_date: today,
            })
            .eq('user_id', stack.user_id);
        }
        
        // Notify nav to update streak display
        window.dispatchEvent(new Event(STATS_UPDATED_EVENT));
      } catch (e) {
        console.error('Streak system v2 tracking error:', e);
      }
    }

    // Handle card downgrade from mastered to not mastered
    if (wasMasteredBefore && isNowNotMastered) {
      try {
        // Decrement cards_mastered_today via streak system
        const downgradeResult = await processCardMasteryChange(
          stack.user_id,
          stack.id,
          oldRating,
          rating,
          stacksContributedThisSession
        );
        
        // Update local state for exit warning
        setCardsMasteredToday(downgradeResult.cardsMasteredToday);
        
        const { data: userStats } = await supabase
          .from('user_stats')
          .select('total_cards_mastered, current_week_cards')
          .eq('user_id', stack.user_id)
          .single();

        if (userStats) {
          const newTotalMastered = Math.max(0, (userStats.total_cards_mastered || 0) - 1);
          const newWeekCards = Math.max(0, (userStats.current_week_cards || 0) - 1);
          
          await supabase
            .from('user_stats')
            .update({
              total_cards_mastered: newTotalMastered,
              current_week_cards: newWeekCards,
            })
            .eq('user_id', stack.user_id);
        }

        // Reset test deadline and status if stack had one (mastery dropped)
        if (stack.test_deadline || stack.mastery_reached_at) {
          await supabase
            .from('card_stacks')
            .update({
              test_deadline: null,
              mastery_reached_at: null,
              status: 'in_progress',
            })
            .eq('id', stack.id);
          
          // Delete associated test record if exists
          await supabase
            .from('stack_tests')
            .delete()
            .eq('stack_id', stack.id);
          
          // Update local stack state
          setStack(prev => ({
            ...prev,
            test_deadline: null,
            mastery_reached_at: null,
            status: 'in_progress' as const,
          }));
        }

        // Notify nav to update display
        window.dispatchEvent(new Event(STATS_UPDATED_EVENT));
      } catch (e) {
        console.error('Card downgrade tracking error:', e);
      }
    }

    // STEP 4: Check if stack just reached 100% mastery and trigger test
    const masteredCards = updatedCards.filter(c => (c.user_rating || 1) >= CARD_RATINGS.KINDA_KNOW);
    const justReachedMastery = masteredCards.length === updatedCards.length;
    
    if (justReachedMastery && !stack.mastery_reached_at) {
      try {
        const masteryDate = new Date();
        const testDeadline = calculateTestDeadline(masteryDate, updatedCards.length);
        
        // Update legacy fields on card_stacks
        await supabase
          .from('card_stacks')
          .update({
            mastery_reached_at: masteryDate.toISOString(),
            test_deadline: testDeadline.toISOString(),
            mastered_count: masteredCards.length,
            cards_mastered: masteredCards.length,
          })
          .eq('id', stack.id);
        
        // Trigger test creation with new streak system v2
        const testResult = await checkAndTriggerTest(
          stack.user_id,
          stack.id,
          updatedCards.length,
          true // allCardsMastered
        );
        
        if (testResult.triggered) {
          console.log('Test triggered:', testResult.testId);
          // Update local stack state
          setStack(prev => ({
            ...prev,
            mastery_reached_at: masteryDate.toISOString(),
            test_deadline: testResult.displayDeadline || testDeadline.toISOString(),
            status: 'pending_test' as const,
          }));
        } else {
          console.log('Test not triggered:', testResult.message);
          setStack(prev => ({
            ...prev,
            mastery_reached_at: masteryDate.toISOString(),
            test_deadline: testDeadline.toISOString(),
          }));
        }
      } catch (e) {
        console.error('Mastery deadline/test tracking error:', e);
      }
    }

    setIsFlipped(false);
    const nextCard = getNextCardBySpacedRepetition(updatedCards, currentIndex);
    setCurrentIndex(nextCard);
  };

  // Handle confirmed downgrade after user confirms in dialog
  const handleConfirmDowngrade = async () => {
    if (!pendingRating || !currentCard) return;

    setShowDowngradeWarning(false);
    const { rating } = pendingRating;
    const oldRating = currentCard.user_rating || 1;
    setPendingRating(null);

    // Proceed with the downgrade directly (bypassing the check since user confirmed)
    // Update flashcard with new rating
    await supabase
      .from('flashcards')
      .update({
        user_rating: rating,
        review_count: currentCard.review_count + 1,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentCard.id);

    // Calculate updated cards for mastery count calculation
    const updatedCards = [...cards];
    updatedCards[currentIndex] = {
      ...currentCard,
      user_rating: rating,
      review_count: currentCard.review_count + 1,
    };

    // Update local cards state
    setCards(updatedCards);

    const masteredCount = updatedCards.filter((c) => (c.user_rating || 1) >= 4).length;
    
    // Update stack mastered count
    await supabase
      .from('card_stacks')
      .update({ 
        mastered_count: masteredCount,
        cards_mastered: masteredCount,
      })
      .eq('id', stack.id);

    // Process downgrade via streak system (will decrement streak)
    const downgradeResult = await processCardMasteryChange(
      stack.user_id,
      stack.id,
      oldRating,
      rating,
      stacksContributedThisSession
    );
    
    setCardsMasteredToday(downgradeResult.cardsMasteredToday);

    // Update total stats
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('total_cards_mastered, current_week_cards')
      .eq('user_id', stack.user_id)
      .single();

    if (userStats) {
      const newTotalMastered = Math.max(0, (userStats.total_cards_mastered || 0) - 1);
      const newWeekCards = Math.max(0, (userStats.current_week_cards || 0) - 1);
      
      await supabase
        .from('user_stats')
        .update({
          total_cards_mastered: newTotalMastered,
          current_week_cards: newWeekCards,
        })
        .eq('user_id', stack.user_id);
    }

    // Reset test deadline if stack had one (mastery dropped)
    if (stack.test_deadline || stack.mastery_reached_at) {
      await supabase
        .from('card_stacks')
        .update({
          test_deadline: null,
          mastery_reached_at: null,
          status: 'in_progress',
        })
        .eq('id', stack.id);
        
      // Delete associated test record if exists
      await supabase
        .from('stack_tests')
        .delete()
        .eq('stack_id', stack.id);
        
      // Update local stack state
      setStack(prev => ({
        ...prev,
        test_deadline: null,
        mastery_reached_at: null,
        status: 'in_progress' as const,
      }));
    }

    // Notify nav to update display
    window.dispatchEvent(new Event(STATS_UPDATED_EVENT));

    setIsFlipped(false);
    const nextCard = getNextCardBySpacedRepetition(updatedCards, currentIndex);
    setCurrentIndex(nextCard);
  };

  // Handle cancelled downgrade
  const handleCancelDowngrade = () => {
    setShowDowngradeWarning(false);
    setPendingRating(null);
  };

  const getNextCardBySpacedRepetition = (cardList: typeof cards, currentIdx: number): number => {
    const weights = cardList.map((card, index) => {
      if (index === currentIdx) return 0;
      const rating = card.user_rating || 1;
      return 6 - rating;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      return (currentIdx + 1) % cardList.length;
    }

    let random = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return i;
      }
    }

    return (currentIdx + 1) % cardList.length;
  };

  const capitalizeTitle = (title: string) => {
    return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const getLanguageEmoji = (name: string) => {
    const emojiMap: Record<string, string> = {
      Spanish: '🇪🇸', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
      Japanese: '🇯🇵', Korean: '🇰🇷', Mandarin: '🇨🇳', Portuguese: '🇧🇷',
    };
    return emojiMap[name] || '🌍';
  };

  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="rounded-3xl p-12 text-center max-w-md" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="font-display text-3xl font-semibold mb-4" style={{ color: 'var(--accent-green)' }}>All Done!</h2>
          <Link href="/dashboard">
            <Button 
              className="text-white font-bold rounded-2xl px-8 py-4 hover:-translate-y-0.5 transition-all"
              style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      {/* Progress Bar */}
      <div className="h-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'linear-gradient(to right, #58cc02, #1cb0f6)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-2 flex justify-between items-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Button 
          variant="ghost" 
          onClick={handleExitClick}
          className="font-semibold rounded-xl px-2 sm:px-4 hover:bg-[var(--bg-secondary)]" 
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button
            onClick={() => { setReverseMode(!reverseMode); setIsFlipped(false); }}
            variant="ghost"
            size="sm"
            className="font-semibold rounded-xl p-2 sm:px-3"
            style={{ 
              backgroundColor: reverseMode ? 'rgba(88, 204, 2, 0.15)' : 'transparent',
              color: reverseMode ? 'var(--accent-green)' : 'var(--text-secondary)'
            }}
            title="Reverse Mode"
          >
            <ArrowLeftRight className="h-5 w-5 sm:mr-1" />
            <span className="hidden sm:inline">Reverse</span>
          </Button>
          <Button
            onClick={() => {
              const newProvider = ttsProvider === 'browser' ? 'elevenlabs' : 'browser';
              setTtsProvider(newProvider);
            }}
            variant="ghost"
            size="sm"
            className="font-semibold rounded-xl p-2 sm:px-3"
            style={{ 
              background: ttsProvider === 'elevenlabs' ? 'linear-gradient(135deg, #58cc02, #1cb0f6)' : 'transparent',
              color: ttsProvider === 'elevenlabs' ? 'white' : 'var(--text-secondary)'
            }}
            title={ttsProvider === 'elevenlabs' ? 'Using AI voices (OpenAI)' : 'Using browser voices'}
          >
            <Sparkles className="h-5 w-5 sm:mr-1" />
            <span className="hidden sm:inline">{ttsProvider === 'elevenlabs' ? 'AI' : 'Browser'}</span>
          </Button>
          <Button
            onClick={() => setVoiceGender(voiceGender === 'female' ? 'male' : 'female')}
            variant="ghost"
            size="sm"
            className="font-semibold rounded-xl p-2 sm:px-3 flex items-center gap-1"
            style={{ 
              backgroundColor: voiceGender === 'male' ? 'rgba(28, 176, 246, 0.15)' : 'rgba(255, 150, 0, 0.15)',
              color: voiceGender === 'male' ? '#1cb0f6' : '#ff9600'
            }}
            title={`Click to switch to ${voiceGender === 'female' ? 'male' : 'female'} voice`}
          >
            <span className="text-lg">{voiceGender === 'female' ? '♀' : '♂'}</span>
          </Button>
          <span className="font-semibold px-2 sm:px-3 py-1 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {currentIndex + 1}/{cards.length}
          </span>
          {stack.is_completed && (
            <span className="hidden sm:flex px-3 py-1 text-white font-bold rounded-xl text-sm items-center gap-1" style={{ background: 'linear-gradient(135deg, #58cc02, #1cb0f6)' }}>
              <Trophy className="h-3 w-3" /> Complete
            </span>
          )}
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" style={{ color: '#ffc800' }} />
            ) : (
              <Moon className="h-5 w-5" style={{ color: '#1cb0f6' }} />
            )}
          </button>
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 sm:py-8">
        <div className="w-full max-w-2xl">
          {/* Stack Title */}
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {capitalizeTitle(stack.title)} {getLanguageEmoji(stack.target_language)}
            </h2>
          </div>

          {/* Flashcard */}
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            className="rounded-3xl p-5 sm:p-8 pt-12 sm:pt-8 min-h-[300px] sm:min-h-[400px] flex flex-col justify-center cursor-pointer transition-all duration-300 relative border-2"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-color)',
              boxShadow: 'var(--shadow-md)'
            }}
            whileHover={{ 
              boxShadow: '0 8px 32px rgba(88, 204, 2, 0.15)',
              borderColor: 'rgba(88, 204, 2, 0.3)'
            }}
          >
            {/* Level Badge */}
            {stack.cefr_level && (
              <span className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 text-white font-bold rounded-xl text-xs sm:text-sm z-10" style={{ background: 'linear-gradient(135deg, #58cc02, #1cb0f6)' }}>
                {stack.cefr_level}
              </span>
            )}

            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.div
                  key={`front-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="font-display text-4xl md:text-5xl font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {reverseMode ? (
                          currentCard.native_translation
                        ) : (
                          <WordHoverText
                            text={currentCard.target_phrase}
                            translations={wordTranslations[`${currentCard.id}-target`] || []}
                            onWordSpeak={(word) => speak(word, stack.target_language, { cardId: currentCard.id })}
                            language={stack.target_language}
                          />
                        )}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(
                            reverseMode ? currentCard.native_translation : currentCard.target_phrase,
                            reverseMode ? 'English' : stack.target_language,
                            { cardId: currentCard.id, audioUrl: currentCard.audio_url }
                          );
                        }}
                        disabled={isTTSLoading}
                        className="p-3 rounded-full transition-all hover:scale-110 active:scale-95"
                        style={{ 
                          backgroundColor: isSpeaking || isTTSLoading ? '#58cc02' : 'rgba(88, 204, 2, 0.15)',
                          color: isSpeaking || isTTSLoading ? 'white' : '#58cc02'
                        }}
                        title={ttsProvider === 'elevenlabs' ? 'AI voice (OpenAI)' : 'Listen to pronunciation'}
                      >
                        {isTTSLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Volume2 className="w-6 h-6" />
                        )}
                      </button>
                      {/* Voice Gender Toggle on Card */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVoiceGender(voiceGender === 'female' ? 'male' : 'female');
                        }}
                        className="p-2 rounded-full transition-all hover:scale-110 active:scale-95 text-sm font-bold"
                        style={{ 
                          backgroundColor: voiceGender === 'male' ? 'rgba(28, 176, 246, 0.15)' : 'rgba(255, 150, 0, 0.15)',
                          color: voiceGender === 'male' ? '#1cb0f6' : '#ff9600'
                        }}
                        title={`Switch to ${voiceGender === 'female' ? 'male' : 'female'} voice`}
                      >
                        {voiceGender === 'female' ? '♀' : '♂'}
                      </button>
                    </div>
                    {!reverseMode && (
                      <span className="inline-block px-4 py-2 font-semibold rounded-xl" style={{ backgroundColor: 'rgba(88, 204, 2, 0.15)', color: '#58cc02' }}>
                        {currentCard.tone_advice}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mt-8" style={{ color: 'var(--text-muted)' }}>
                    Tap anywhere to flip ✨
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`back-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="font-display text-3xl md:text-4xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {reverseMode ? (
                          <WordHoverText
                            text={currentCard.target_phrase}
                            translations={wordTranslations[`${currentCard.id}-target`] || []}
                            onWordSpeak={(word) => speak(word, stack.target_language, { cardId: currentCard.id })}
                            language={stack.target_language}
                          />
                        ) : (
                          currentCard.native_translation
                        )}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(
                            reverseMode ? currentCard.target_phrase : currentCard.native_translation,
                            reverseMode ? stack.target_language : 'English',
                            { cardId: currentCard.id, audioUrl: currentCard.audio_url }
                          );
                        }}
                        disabled={isTTSLoading}
                        className="p-2 rounded-full transition-all hover:scale-110 active:scale-95"
                        style={{ 
                          backgroundColor: isSpeaking ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                          color: 'var(--text-secondary)'
                        }}
                        title={ttsProvider === 'elevenlabs' ? 'AI voice (OpenAI)' : 'Listen to pronunciation'}
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {reverseMode ? (
                          currentCard.native_translation
                        ) : (
                          <WordHoverText
                            text={currentCard.target_phrase}
                            translations={wordTranslations[`${currentCard.id}-target`] || []}
                            onWordSpeak={(word) => speak(word, stack.target_language, { cardId: currentCard.id })}
                            language={stack.target_language}
                          />
                        )}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(
                            reverseMode ? currentCard.native_translation : currentCard.target_phrase,
                            reverseMode ? 'English' : stack.target_language,
                            { cardId: currentCard.id, audioUrl: currentCard.audio_url }
                          );
                        }}
                        disabled={isTTSLoading}
                        className="p-1.5 rounded-full transition-all hover:scale-110 active:scale-95"
                        style={{ 
                          backgroundColor: isSpeaking ? '#58cc02' : 'rgba(88, 204, 2, 0.15)',
                          color: isSpeaking ? 'white' : '#58cc02'
                        }}
                        title={ttsProvider === 'elevenlabs' ? 'AI voice (OpenAI)' : 'Listen to pronunciation'}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Breakdown Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); showBreakdown ? setShowBreakdown(false) : fetchBreakdown(currentCard); }}
                    disabled={isLoadingBreakdown}
                    className="mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                    style={{ color: '#ff9600', backgroundColor: 'rgba(255, 150, 0, 0.1)' }}
                  >
                    {isLoadingBreakdown ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5" />
                    )}
                    {showBreakdown ? 'Hide' : 'Breakdown'}
                    {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* Breakdown Content */}
                  <AnimatePresence>
                    {showBreakdown && breakdownData[currentCard.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200 space-y-4 overflow-hidden"
                      >
                        {/* Word-by-Word Breakdown */}
                        <div>
                          <h4 className="text-amber-700 font-bold text-sm mb-3 flex items-center gap-2">
                            📖 Word-by-Word Breakdown
                          </h4>
                          <div className="space-y-2">
                            {breakdownData[currentCard.id].wordBreakdown?.map((item: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="font-bold text-slate-800 min-w-[80px]">{item.word}</span>
                                <span className="text-slate-600">→ {item.meaning}</span>
                                {item.grammar && (
                                  <span className="text-amber-600 text-xs bg-amber-100 px-2 py-0.5 rounded-full">{item.grammar}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grammar Pattern */}
                        {(breakdownData[currentCard.id].grammarPattern || breakdownData[currentCard.id].grammarNotes) && (
                          <div>
                            <h4 className="text-amber-700 font-bold text-sm mb-2 flex items-center gap-2">
                              📝 Grammar Pattern
                            </h4>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              {breakdownData[currentCard.id].grammarPattern || breakdownData[currentCard.id].grammarNotes}
                            </p>
                          </div>
                        )}

                        {/* Pattern Examples */}
                        {breakdownData[currentCard.id].patternExamples?.length > 0 && (
                          <div>
                            <h4 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2">
                              🔄 Same Pattern
                            </h4>
                            <ul className="text-slate-700 text-sm space-y-1">
                              {breakdownData[currentCard.id].patternExamples.map((ex: string, i: number) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="text-blue-500">•</span> {ex}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Cognate Hint */}
                        {breakdownData[currentCard.id].cognateHint && (
                          <div className="bg-green-50 rounded-xl p-3">
                            <h4 className="text-green-700 font-bold text-sm mb-2 flex items-center gap-2">
                              🔗 English Connection
                            </h4>
                            <p className="text-slate-700 text-sm">
                              {breakdownData[currentCard.id].cognateHint}
                            </p>
                          </div>
                        )}

                        {/* Common Mistake */}
                        {breakdownData[currentCard.id].commonMistake && (
                          <div className="bg-red-50 rounded-xl p-3">
                            <h4 className="text-red-700 font-bold text-sm mb-2 flex items-center gap-2">
                              ⚠️ Watch Out
                            </h4>
                            <p className="text-slate-700 text-sm">
                              {breakdownData[currentCard.id].commonMistake}
                            </p>
                          </div>
                        )}

                        {/* Memory Trick */}
                        {(breakdownData[currentCard.id].memoryTrick || breakdownData[currentCard.id].mnemonic) && (
                          <div className="bg-purple-50 rounded-xl p-3">
                            <h4 className="text-purple-700 font-bold text-sm mb-2 flex items-center gap-2">
                              🧠 Memory Trick
                            </h4>
                            <p className="text-slate-700 text-sm italic">
                              "{breakdownData[currentCard.id].memoryTrick || breakdownData[currentCard.id].mnemonic}"
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-center">
                    <span className="px-4 py-2 font-semibold rounded-xl" style={{ backgroundColor: 'rgba(88, 204, 2, 0.15)', color: '#58cc02' }}>
                      {currentCard.tone_advice}
                    </span>
                  </div>

                  {currentCardTestResult && (
                    <div 
                      className="text-center px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ 
                        backgroundColor: currentCardTestResult.passed ? 'rgba(88, 204, 2, 0.15)' : 'rgba(255, 75, 75, 0.15)',
                        color: currentCardTestResult.passed ? '#58cc02' : '#ff4b4b'
                      }}
                    >
                      Test: {currentCardTestResult.passed ? 'Passed ✓' : 'Failed ✗'}
                      {currentCardTestResult.correction && (
                        <span style={{ color: '#ff9600' }} className="ml-2">• Has correction</span>
                      )}
                    </div>
                  )}

                  <p className="text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Rate your knowledge below 👇
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Rating Buttons - hidden when stack is 100% complete (locked mastery) */}
          <AnimatePresence mode="wait">
            {isFlipped && stack.test_progress !== 100 && (
              <motion.div
                key={`buttons-${currentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3"
              >
                {RATING_OPTIONS.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => handleRating(option.value)}
                    className={`text-white font-bold rounded-2xl px-3 sm:px-4 py-4 sm:py-3 text-sm min-h-[56px] sm:min-h-0 hover:-translate-y-0.5 transition-all active:translate-y-0 ${
                      index === RATING_OPTIONS.length - 1 ? 'col-span-2 sm:col-span-1 max-w-[200px] mx-auto sm:max-w-none' : ''
                    }`}
                    style={{ 
                      backgroundColor: option.color,
                      boxShadow: `0 4px 0 ${option.shadow}`
                    }}
                  >
                    {option.label}
                    {currentCard.user_rating === option.value && <Check className="inline ml-1 h-4 w-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Return Button */}
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard">
              <button 
                className="inline-flex items-center justify-center border-2 font-semibold rounded-xl px-6 py-3 transition-all hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stack Mastered Modal */}
      {showMasteredModal && !testMode && !testComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="rounded-3xl p-6 sm:p-8 max-w-md w-full text-center"
            style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-display text-3xl font-semibold mb-4" style={{ color: '#58cc02' }}>Ready for the Test!</h2>
            <p className="font-medium mb-8" style={{ color: 'var(--text-secondary)' }}>
              You've rated all cards as "Kinda Know" or "Really Know". Pass the test with 100% to complete this stack!
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => { setShowMasteredModal(false); setCurrentIndex(0); setIsFlipped(false); }}
                className="w-full text-white font-bold rounded-2xl px-8 py-4 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center"
                style={{ backgroundColor: '#1cb0f6', boxShadow: '0 4px 0 #1899d6' }}
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Review Again
              </button>
              <button 
                onClick={() => {
                  setShowMasteredModal(false);
                  setTestMode(true);
                  setTestCardIndex(0);
                  setTestAnswer('');
                  setTestResults([]);
                  setCurrentFeedback(null);
                }}
                className="w-full text-white font-bold rounded-2xl px-8 py-4 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center"
                style={{ backgroundColor: '#58cc02', boxShadow: '0 4px 0 #46a302' }}
              >
                <PenLine className="h-5 w-5 mr-2" />
                Take Test
              </button>
              <Link href="/dashboard" className="block">
                <button 
                  className="w-full inline-flex items-center justify-center border-2 font-semibold rounded-2xl px-8 py-4 transition-all hover:-translate-y-0.5"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Return to Dashboard
                </button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Test Mode UI */}
      {testMode && !testComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="rounded-3xl sm:rounded-3xl p-5 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Progress */}
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Question {testCardIndex + 1} of {cards.length}</span>
                <span>{Math.round((testCardIndex / cards.length) * 100)}%</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div 
                  className="h-full transition-all duration-300"
                  style={{ width: `${(testCardIndex / cards.length) * 100}%`, background: 'linear-gradient(to right, #58cc02, #1cb0f6)' }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="text-center mb-6 sm:mb-8">
              <p className="font-medium mb-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Translate to {stack.target_language}:</p>
              <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {cards[testCardIndex]?.native_translation}
              </h3>
            </div>

            {/* Answer or Feedback */}
            {!currentFeedback ? (
              <div className="space-y-4">
                <Input
                  value={testAnswer}
                  onChange={(e) => setTestAnswer(e.target.value)}
                  placeholder={`Type your answer in ${stack.target_language}...`}
                  className="rounded-2xl text-base sm:text-lg py-4 sm:py-6 h-14 sm:h-16 font-medium focus:ring-2 focus:ring-[#58cc02]"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  disabled={isGrading}
                  autoComplete="off"
                  autoCapitalize="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && testAnswer.trim() && !isGrading) {
                      handleGradeAnswer();
                    }
                  }}
                />
                <button
                  onClick={handleGradeAnswer}
                  disabled={!testAnswer.trim() || isGrading}
                  className="w-full text-white font-bold rounded-2xl py-4 min-h-[56px] disabled:opacity-50 active:translate-y-0 hover:-translate-y-0.5 transition-all flex items-center justify-center"
                  style={{ backgroundColor: '#58cc02', boxShadow: '0 4px 0 #46a302' }}
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Grading...
                    </>
                  ) : (
                    'Submit Answer ✨'
                  )}
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Result */}
                <div 
                  className="flex items-center justify-center gap-3 p-4 rounded-2xl"
                  style={{ 
                    backgroundColor: currentFeedback.passed ? 'rgba(88, 204, 2, 0.15)' : 'rgba(255, 75, 75, 0.15)'
                  }}
                >
                  {currentFeedback.passed ? (
                    <Check className="h-6 w-6" style={{ color: '#58cc02' }} />
                  ) : (
                    <X className="h-6 w-6" style={{ color: '#ff4b4b' }} />
                  )}
                  <span className="text-lg font-bold" style={{ color: currentFeedback.passed ? '#58cc02' : '#ff4b4b' }}>
                    {currentFeedback.passed ? 'Correct! 🎉' : 'Not quite right'}
                  </span>
                </div>

                <div className="rounded-2xl p-4 border-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Your answer:</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{testAnswer}</p>
                </div>

                <div className="rounded-2xl p-4 border-2" style={{ backgroundColor: 'rgba(88, 204, 2, 0.1)', borderColor: 'rgba(88, 204, 2, 0.3)' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#58cc02' }}>Correct answer:</p>
                  <p className="font-bold" style={{ color: '#58cc02' }}>{cards[testCardIndex]?.target_phrase}</p>
                </div>

                {currentFeedback.correction && (
                  <div className="rounded-2xl p-4 border-2" style={{ backgroundColor: 'rgba(255, 150, 0, 0.1)', borderColor: 'rgba(255, 150, 0, 0.3)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#ff9600' }}>Suggested correction:</p>
                    <p className="font-medium" style={{ color: '#ff9600' }}>{currentFeedback.correction}</p>
                  </div>
                )}

                <p className="text-center font-medium italic" style={{ color: 'var(--text-secondary)' }}>{currentFeedback.feedback}</p>

                <button
                  onClick={handleNextTestCard}
                  className="w-full text-white font-bold rounded-2xl py-4 hover:-translate-y-0.5 transition-all active:translate-y-0"
                  style={{ backgroundColor: '#58cc02', boxShadow: '0 4px 0 #46a302' }}
                >
                  {testCardIndex < cards.length - 1 ? 'Next Question →' : 'See Results 🏆'}
                </button>
              </motion.div>
            )}

            <Link href="/dashboard" className="block">
              <button className="w-full mt-4 font-semibold py-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                Cancel Test
              </button>
            </Link>
          </motion.div>
        </motion.div>
      )}

      {/* Test Complete Modal */}
      {testComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="rounded-3xl p-8 max-w-lg w-full text-center"
            style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
          >
            {testResults.filter(r => r.passed).length === cards.length ? (
              <>
                <div className="text-7xl mb-4">🏆</div>
                <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: '#58cc02' }}>Perfect Score!</h2>
                <p className="text-xl font-bold mb-6" style={{ color: '#58cc02' }}>100% - Stack Complete! 🎉</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #ff9600, #ffaa00)' }}>
                  <span className="text-3xl font-bold text-white">
                    {Math.round((testResults.filter(r => r.passed).length / cards.length) * 100)}%
                  </span>
                </div>
                <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Test Complete</h2>
                <p className="font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {testResults.filter(r => r.passed).length} of {cards.length} correct
                </p>
              </>
            )}

            {testResults.some(r => r.correction) && (
              <div className="rounded-2xl p-4 mb-6 text-left max-h-48 overflow-y-auto border-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Notes for review:</p>
                {testResults.filter(r => r.correction).map((note, idx) => (
                  <div key={idx} className="mb-2 pb-2 last:border-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{note.targetPhrase}</p>
                    <p className="text-xs font-medium" style={{ color: '#ff9600' }}>{note.correction}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  setTestComplete(false);
                  setTestMode(true);
                  setTestCardIndex(0);
                  setTestAnswer('');
                  setTestResults([]);
                  setCurrentFeedback(null);
                }}
                className="w-full text-white font-bold rounded-2xl py-4 hover:-translate-y-0.5 transition-all active:translate-y-0"
                style={{ backgroundColor: '#ff9600', boxShadow: '0 4px 0 #cc7800' }}
              >
                Retake Test
              </button>
              <Link href="/dashboard" className="block">
                <button 
                  className="w-full inline-flex items-center justify-center border-2 font-semibold rounded-2xl py-4 transition-all hover:-translate-y-0.5"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
      
{/* Exit Warning Dialog */}
      <AlertDialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <AlertDialogContent style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              ⚠️ Streak at Risk!
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary)' }}>
              You've only mastered <span className="font-bold" style={{ color: '#ff9600' }}>{cardsMasteredToday}</span> of <span className="font-bold" style={{ color: '#58cc02' }}>{STREAK_DAILY_REQUIREMENT}</span> cards today.
              Leaving now means you won't maintain your streak!
              <br /><br />
              Master <span className="font-bold" style={{ color: '#1cb0f6' }}>{STREAK_DAILY_REQUIREMENT - cardsMasteredToday}</span> more card{STREAK_DAILY_REQUIREMENT - cardsMasteredToday !== 1 ? 's' : ''} to keep your streak going.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
              Keep Learning
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push('/dashboard')}
              className="bg-[#ff4b4b] hover:bg-[#e04444] text-white shadow-[0_4px_0_0_#cc3b3b] hover:brightness-105"
            >
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

{/* Card Downgrade Warning Dialog */}
      <AlertDialog open={showDowngradeWarning} onOpenChange={setShowDowngradeWarning}>
        <AlertDialogContent style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              ⚠️ Streak Protection
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary)' }}>
              Lowering this card will drop you below the {STREAK_DAILY_REQUIREMENT}-card requirement and break your streak today. You currently have <span className="font-bold" style={{ color: '#ff9600' }}>{cardsMasteredToday}/{STREAK_DAILY_REQUIREMENT}</span> cards mastered today.
              <br /><br />
              Are you sure you want to continue? This will decrement your streak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelDowngrade}
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDowngrade}
              className="bg-[#ff4b4b] hover:bg-[#e04444] text-white shadow-[0_4px_0_0_#cc3b3b] hover:brightness-105"
            >
              Lower Rating Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  async function handleGradeAnswer() {
    if (!testAnswer.trim() || isGrading) return;

    setIsGrading(true);
    const currentCard = cards[testCardIndex];

    try {
      const response = await fetch('/api/grade-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: testAnswer,
          correctAnswer: currentCard.target_phrase,
          targetLanguage: stack.target_language,
          nativeTranslation: currentCard.native_translation,
        }),
      });

      const result = await response.json();

      setCurrentFeedback({
        passed: result.passed,
        correction: result.correction,
        feedback: result.feedback,
      });

      const newResult: TestNote = {
        cardId: currentCard.id,
        targetPhrase: currentCard.target_phrase,
        userAnswer: testAnswer,
        passed: result.passed,
        correction: result.correction || undefined,
        feedback: result.feedback,
        timestamp: new Date().toISOString(),
      };
      setTestResults([...testResults, newResult]);

    } catch (error) {
      console.error('Grading error:', error);
      setCurrentFeedback({
        passed: false,
        feedback: 'Error grading answer. Please try again.',
      });
    } finally {
      setIsGrading(false);
    }
  }

  async function handleNextTestCard() {
    if (testCardIndex < cards.length - 1) {
      setTestCardIndex(testCardIndex + 1);
      setTestAnswer('');
      setCurrentFeedback(null);
    } else {
      const passedCount = testResults.filter(r => r.passed).length;
      const testProgress = Math.round((passedCount / cards.length) * 100);
      const isComplete = testProgress === 100;

      const notesWithCorrections = testResults.filter(r => r.correction);
      const existingNotes = Array.isArray(stack.test_notes) ? stack.test_notes : [];
      const updatedNotes = [...existingNotes, ...notesWithCorrections];

      await supabase
        .from('card_stacks')
        .update({
          test_progress: testProgress,
          test_notes: updatedNotes,
          is_completed: isComplete,
          completion_date: isComplete ? new Date().toISOString() : stack.completion_date,
          last_test_date: new Date().toISOString(),
          test_deadline: null,
          status: isComplete ? 'completed' : 'pending_test',
        })
        .eq('id', stack.id);

      // STREAK SYSTEM V2: Handle test completion with freeze/unfreeze logic
      if (isComplete) {
        try {
          // Get the test record for this stack
          const { data: testRecord } = await supabase
            .from('stack_tests')
            .select('id')
            .eq('stack_id', stack.id)
            .single();
          
          if (testRecord) {
            const completionResult = await completeTest(testRecord.id, true);
            console.log('Test completion result:', completionResult);
            
            if (completionResult.unfrozen) {
              // Toast or notification could be added here
              console.log('Streak unfrozen! New streak:', completionResult.newStreak);
            }
          }
        } catch (e) {
          console.error('Streak system v2 test completion error:', e);
        }
      }

      if (passedCount > 0) {
        try {
          const { data: userStats } = await supabase
            .from('user_stats')
            .select('current_week_cards, current_week_start, cards_mastered_today, last_mastery_date, current_streak, longest_streak, streak_frozen, streak_frozen_stacks, total_cards_mastered, tests_completed, perfect_test_streak, daily_goal_streak, ice_breaker_count')
            .eq('user_id', stack.user_id)
            .single();

          if (userStats) {
            let newWeekCards = userStats.current_week_cards || 0;
            let newWeekStart = userStats.current_week_start;
            let newTotalMastered = (userStats.total_cards_mastered || 0) + passedCount;

            // Reset week counter if new week
            if (shouldResetWeek(userStats.current_week_start)) {
              newWeekCards = 0;
              newWeekStart = getWeekStartUTC();
            }

            const cardsToAdd = Math.min(passedCount, WEEKLY_CARD_CAP - newWeekCards);
            newWeekCards += cardsToAdd;

            const today = getTodayDate();
            const needsReset = isNewDay(userStats.last_mastery_date);
            let newDailyCards = needsReset ? passedCount : (userStats.cards_mastered_today || 0) + passedCount;
            let newStreak = userStats.current_streak || 0;
            let newLongestStreak = userStats.longest_streak || 0;

            if (!userStats.streak_frozen) {
              const previousDaily = needsReset ? 0 : (userStats.cards_mastered_today || 0);
              if (previousDaily < STREAK_DAILY_REQUIREMENT && newDailyCards >= STREAK_DAILY_REQUIREMENT) {
                newStreak += 1;
                if (newStreak > newLongestStreak) {
                  newLongestStreak = newStreak;
                }
              }
            }

            const frozenStacks = (userStats.streak_frozen_stacks || []).filter((id: string) => id !== stack.id);
            const shouldUnfreeze = frozenStacks.length === 0;
            const wasStreakFrozen = userStats.streak_frozen && userStats.streak_frozen_stacks?.includes(stack.id);

            // Achievement tracking stats
            const newTestsCompleted = (userStats.tests_completed || 0) + 1;
            const isPerfectScore = testProgress === 100;
            const newPerfectTestStreak = isPerfectScore 
              ? (userStats.perfect_test_streak || 0) + 1 
              : 0; // Reset if not perfect
            
            // Daily goal streak: increment if we just hit the daily goal today
            const previousDaily = needsReset ? 0 : (userStats.cards_mastered_today || 0);
            const justMetDailyGoal = previousDaily < STREAK_DAILY_REQUIREMENT && newDailyCards >= STREAK_DAILY_REQUIREMENT;
            const newDailyGoalStreak = justMetDailyGoal 
              ? (userStats.daily_goal_streak || 0) + 1 
              : (userStats.daily_goal_streak || 0);
            
            // Ice breaker: increment if we're unfreezing the streak by completing this test
            const newIceBreakerCount = (wasStreakFrozen && shouldUnfreeze) 
              ? (userStats.ice_breaker_count || 0) + 1 
              : (userStats.ice_breaker_count || 0);

            await supabase
              .from('user_stats')
              .update({
                current_week_cards: newWeekCards,
                current_week_start: newWeekStart,
                total_cards_mastered: newTotalMastered,
                cards_mastered_today: newDailyCards,
                last_mastery_date: today,
                current_streak: newStreak,
                longest_streak: newLongestStreak,
                last_activity_date: today,
                last_card_learned_at: new Date().toISOString(),
                streak_frozen_stacks: frozenStacks,
                streak_frozen: shouldUnfreeze ? false : userStats.streak_frozen,
                // Achievement tracking stats
                tests_completed: newTestsCompleted,
                perfect_test_streak: newPerfectTestStreak,
                daily_goal_streak: newDailyGoalStreak,
                ice_breaker_count: newIceBreakerCount,
              })
              .eq('user_id', stack.user_id);
            
            // Notify nav to update streak display
            window.dispatchEvent(new Event(STATS_UPDATED_EVENT));

            // Check for new badges after test completion
            try {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('badges, is_premium, languages_learning')
                .eq('id', stack.user_id)
                .single();

              if (profile) {
                const badgeStats = buildBadgeStats(
                  {
                    current_streak: newStreak,
                    longest_streak: newLongestStreak,
                    total_cards_mastered: newTotalMastered,
                    cards_mastered_today: newDailyCards,
                  },
                  {
                    tests_completed: newTestsCompleted,
                    perfect_test_streak: newPerfectTestStreak,
                    daily_goal_streak: newDailyGoalStreak,
                    ice_breaker_count: newIceBreakerCount,
                    best_test_score: testProgress,
                    languages_count: profile?.languages_learning?.length ?? 0,
                    is_premium: profile?.is_premium ?? false,
                  }
                );
                
                const existingBadges = (profile?.badges || []) as BadgeType[];
                await checkAndAwardBadges(stack.user_id, badgeStats, existingBadges);
                
                // Check for time-based badges (night owl, early bird)
                await checkTimeBadge(stack.user_id, existingBadges);
              }
            } catch (badgeError) {
              console.error('Badge check error:', badgeError);
            }
          }
        } catch (e) {
          console.error('Test stats tracking error:', e);
        }
      } else {
        // Test completed but no cards passed - still track test completion
        try {
          const { data: userStats } = await supabase
            .from('user_stats')
            .select('streak_frozen_stacks, streak_frozen, tests_completed, perfect_test_streak, ice_breaker_count')
            .eq('user_id', stack.user_id)
            .single();

          if (userStats) {
            const frozenStacks = (userStats.streak_frozen_stacks || []).filter((id: string) => id !== stack.id);
            const shouldUnfreeze = frozenStacks.length === 0;
            const wasStreakFrozen = userStats.streak_frozen && userStats.streak_frozen_stacks?.includes(stack.id);

            await supabase
              .from('user_stats')
              .update({
                streak_frozen_stacks: frozenStacks,
                streak_frozen: shouldUnfreeze ? false : userStats.streak_frozen,
                // Track test completion even if no cards passed
                tests_completed: (userStats.tests_completed || 0) + 1,
                perfect_test_streak: 0, // Reset since not 100%
                ice_breaker_count: (wasStreakFrozen && shouldUnfreeze) 
                  ? (userStats.ice_breaker_count || 0) + 1 
                  : (userStats.ice_breaker_count || 0),
              })
              .eq('user_id', stack.user_id);
            
            // Notify nav to update streak display
            window.dispatchEvent(new Event(STATS_UPDATED_EVENT));
          }
        } catch (e) {
          console.error('Streak unfreeze error:', e);
        }
      }

      setStack({
        ...stack,
        test_progress: testProgress,
        test_notes: updatedNotes,
        is_completed: isComplete,
        completion_date: isComplete ? new Date().toISOString() : stack.completion_date,
        test_deadline: null,
      });

      setTestMode(false);
      setTestComplete(true);
    }
  }
}
