'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, ArrowLeftRight, PenLine, Check, X, Loader2, RotateCcw, Lightbulb, ChevronDown, ChevronUp, Volume2, Sparkles } from 'lucide-react';
import { useSpeech, TTSProvider, VoiceGender } from '@/hooks/use-speech';
import { Input } from '@/components/ui/input';
import type { CardStack, Flashcard, TestNote } from '@/lib/types';
import Confetti from 'react-confetti';
import { CARD_RATINGS } from '@/lib/constants';
import { WordHoverText, getWordTranslations } from '@/components/ui/word-hover';
import { shouldResetWeek, archiveWeek, getWeekStartUTC, WEEKLY_CARD_CAP } from '@/lib/weekly-stats';
import { isNewDay, getTodayDate, calculateTestDeadline, STREAK_DAILY_REQUIREMENT } from '@/lib/streak';
import { useBadgeChecker, buildBadgeStats } from '@/hooks/useBadgeChecker';
import type { Badge as BadgeType } from '@/lib/types';
import { STATS_UPDATED_EVENT } from '@/components/layout/AppLayout';

interface Props {
  stack: CardStack;
  cards: Flashcard[];
}

const RATING_OPTIONS = [
  { value: CARD_RATINGS.REALLY_DONT_KNOW, label: "Really Don't Know", gradient: 'from-red-400 to-red-500' },
  { value: CARD_RATINGS.DONT_KNOW, label: "Don't Know", gradient: 'from-orange-400 to-orange-500' },
  { value: CARD_RATINGS.NEUTRAL, label: 'Neutral', gradient: 'from-yellow-400 to-amber-500' },
  { value: CARD_RATINGS.KINDA_KNOW, label: 'Kinda Know', gradient: 'from-green-400 to-emerald-500' },
  { value: CARD_RATINGS.REALLY_KNOW, label: 'Really Know', gradient: 'from-blue-400 to-indigo-500' },
];

export default function StackLearningClient({ stack: initialStack, cards: initialCards }: Props) {
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
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('browser');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  
  const supabase = createClient();
  
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

  // Preload audio for next cards when using ElevenLabs (makes playback instant)
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

  // Fetch breakdown data for a card
  const fetchBreakdown = async (card: Flashcard) => {
    const breakdownKey = card.id;
    if (breakdownData[breakdownKey]) {
      setShowBreakdown(true);
      return;
    }
    
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
      }
    } catch (error) {
      console.error('Error fetching breakdown:', error);
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!currentCard) return;

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
    
    await supabase
      .from('card_stacks')
      .update({ mastered_count: masteredCount })
      .eq('id', stack.id);

    await supabase.rpc('increment', {
      table_name: 'user_stats',
      column_name: 'total_reviews',
      user_id_val: stack.user_id,
    });

    // Track daily MASTERED cards for streak
    const wasNotMasteredBefore = (currentCard.user_rating || 1) < CARD_RATINGS.KINDA_KNOW;
    const isNowMastered = rating >= CARD_RATINGS.KINDA_KNOW;
    
    
    if (wasNotMasteredBefore && isNowMastered) {
      try {
        // Note: Don't select streak_awarded_today - column may not exist in older DBs
        const { data: dailyStats, error: statsError } = await supabase
          .from('user_stats')
          .select('daily_cards_learned, daily_cards_date, current_streak, longest_streak, streak_frozen, total_cards_mastered')
          .eq('user_id', stack.user_id)
          .single();


        if (dailyStats) {
          const today = getTodayDate();
          const needsReset = isNewDay(dailyStats.daily_cards_date);
          
          // Previous count BEFORE this card
          const prevDailyCards = needsReset ? 0 : (dailyStats.daily_cards_learned || 0);
          let newDailyCards = prevDailyCards + 1;
          let newTotalMastered = (dailyStats.total_cards_mastered || 0) + 1;
          let newStreak = dailyStats.current_streak || 0;
          let newLongestStreak = dailyStats.longest_streak || 0;


          // Award streak ONLY when crossing the 10-card threshold (not already at/above 10)
          // This ensures streak is awarded exactly once per day
          const crossingThreshold = prevDailyCards < STREAK_DAILY_REQUIREMENT && newDailyCards >= STREAK_DAILY_REQUIREMENT;
          
          if (!dailyStats.streak_frozen && crossingThreshold) {
            newStreak += 1;
            if (newStreak > newLongestStreak) {
              newLongestStreak = newStreak;
            }
          }

          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              daily_cards_learned: newDailyCards,
              daily_cards_date: today,
              current_streak: newStreak,
              longest_streak: newLongestStreak,
              last_activity_date: today,
              total_cards_mastered: newTotalMastered,
            })
            .eq('user_id', stack.user_id);
          
          
          // Notify nav to update streak display
          window.dispatchEvent(new Event(STATS_UPDATED_EVENT));
        }
      } catch (e) {
        console.error('Daily streak tracking error:', e);
      }
    }

    // Check if stack just reached 100% mastery and set test deadline
    const masteredCards = updatedCards.filter(c => (c.user_rating || 1) >= CARD_RATINGS.KINDA_KNOW);
    const justReachedMastery = masteredCards.length === updatedCards.length;
    
    if (justReachedMastery && !stack.mastery_reached_at) {
      try {
        const masteryDate = new Date();
        const testDeadline = calculateTestDeadline(masteryDate, updatedCards.length);
        
        await supabase
          .from('card_stacks')
          .update({
            mastery_reached_at: masteryDate.toISOString(),
            test_deadline: testDeadline.toISOString(),
            mastered_count: masteredCards.length,
          })
          .eq('id', stack.id);
      } catch (e) {
        console.error('Mastery deadline tracking error:', e);
      }
    }

    setIsFlipped(false);
    const nextCard = getNextCardBySpacedRepetition(updatedCards, currentIndex);
    setCurrentIndex(nextCard);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-3xl p-12 shadow-talka-lg text-center max-w-md">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="font-display text-3xl font-semibold gradient-text mb-4">All Done!</h2>
          <Link href="/dashboard">
            <Button className="bg-gradient-purple-pink text-white font-bold rounded-2xl px-8 py-4 shadow-purple">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative z-10">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      {/* Progress Bar */}
      <div className="h-2 bg-slate-200">
        <motion.div
          className="h-full bg-gradient-purple-pink"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white border-b-2 border-slate-100 flex justify-between items-center">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-700 font-semibold rounded-xl px-2 sm:px-4">
            <ArrowLeft className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button
            onClick={() => { setReverseMode(!reverseMode); setIsFlipped(false); }}
            variant="ghost"
            size="sm"
            className={`font-semibold rounded-xl p-2 sm:px-3 ${reverseMode ? 'bg-talka-purple/10 text-talka-purple' : 'text-slate-500'}`}
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
            className={`font-semibold rounded-xl p-2 sm:px-3 ${ttsProvider === 'elevenlabs' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'text-slate-500'}`}
            title={ttsProvider === 'elevenlabs' ? 'Using premium AI voices' : 'Using browser voices'}
          >
            <Sparkles className="h-5 w-5 sm:mr-1" />
            <span className="hidden sm:inline">{ttsProvider === 'elevenlabs' ? 'Premium' : 'Voice'}</span>
          </Button>
          <Button
            onClick={() => setVoiceGender(voiceGender === 'female' ? 'male' : 'female')}
            variant="ghost"
            size="sm"
            className={`font-semibold rounded-xl p-2 sm:px-3 flex items-center gap-1 ${voiceGender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}
            title={`Click to switch to ${voiceGender === 'female' ? 'male' : 'female'} voice`}
          >
            <span className="text-lg">{voiceGender === 'female' ? '♀' : '♂'}</span>
          </Button>
          <span className="text-slate-500 font-semibold px-2 sm:px-3 py-1 bg-slate-100 rounded-xl text-sm">
            {currentIndex + 1}/{cards.length}
          </span>
          {stack.is_completed && (
            <span className="hidden sm:flex px-3 py-1 bg-gradient-green-cyan text-white font-bold rounded-xl text-sm items-center gap-1">
              <Trophy className="h-3 w-3" /> Complete
            </span>
          )}
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 sm:py-8">
        <div className="w-full max-w-2xl">
          {/* Stack Title */}
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-800">
              {capitalizeTitle(stack.title)} {getLanguageEmoji(stack.target_language)}
            </h2>
          </div>

          {/* Flashcard */}
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-8 pt-12 sm:pt-8 min-h-[300px] sm:min-h-[400px] flex flex-col justify-center cursor-pointer hover:shadow-talka-lg hover:border-talka-purple/30 transition-all duration-300 relative shadow-talka-md"
          >
            {/* Level Badge */}
            {stack.cefr_level && (
              <span className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 bg-gradient-green-cyan text-white font-bold rounded-xl text-xs sm:text-sm z-10">
                {stack.cefr_level}
              </span>
            )}

            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.div
                  key="front"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="font-display text-4xl md:text-5xl font-semibold text-slate-800 leading-tight">
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
                        className={`p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${
                          isSpeaking || isTTSLoading
                            ? 'bg-talka-purple text-white animate-pulse'
                            : 'bg-talka-purple/10 hover:bg-talka-purple/20 text-talka-purple'
                        }`}
                        title={ttsProvider === 'elevenlabs' ? 'Premium AI voice' : 'Listen to pronunciation'}
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
                        className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 text-sm font-bold ${
                          voiceGender === 'male' 
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                            : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                        }`}
                        title={`Switch to ${voiceGender === 'female' ? 'male' : 'female'} voice`}
                      >
                        {voiceGender === 'female' ? '♀' : '♂'}
                      </button>
                    </div>
                    {!reverseMode && (
                      <span className="inline-block px-4 py-2 bg-talka-purple/10 text-talka-purple font-semibold rounded-xl">
                        {currentCard.tone_advice}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm font-medium mt-8">
                    Tap anywhere to flip ✨
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="back"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <h3 className="font-display text-3xl md:text-4xl font-semibold text-slate-800">
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
                        className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                          isSpeaking ? 'bg-slate-300 text-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title={ttsProvider === 'elevenlabs' ? 'Premium AI voice' : 'Listen to pronunciation'}
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xl text-slate-500 font-medium">
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
                        className={`p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 ${
                          isSpeaking ? 'bg-talka-purple text-white' : 'bg-talka-purple/10 hover:bg-talka-purple/20 text-talka-purple'
                        }`}
                        title={ttsProvider === 'elevenlabs' ? 'Premium AI voice' : 'Listen to pronunciation'}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Breakdown Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); showBreakdown ? setShowBreakdown(false) : fetchBreakdown(currentCard); }}
                    disabled={isLoadingBreakdown}
                    className="mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium rounded-lg hover:bg-amber-50 transition-all disabled:opacity-50"
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
                    <span className="px-4 py-2 bg-talka-purple/10 text-talka-purple font-semibold rounded-xl">
                      {currentCard.tone_advice}
                    </span>
                  </div>

                  {currentCardTestResult && (
                    <div className={`text-center px-4 py-2 rounded-xl text-sm font-semibold ${
                      currentCardTestResult.passed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      Test: {currentCardTestResult.passed ? 'Passed ✓' : 'Failed ✗'}
                      {currentCardTestResult.correction && (
                        <span className="text-amber-500 ml-2">• Has correction</span>
                      )}
                    </div>
                  )}

                  <p className="text-center text-slate-400 text-sm font-medium">
                    Rate your knowledge below 👇
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Rating Buttons */}
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3"
            >
              {RATING_OPTIONS.map((option, index) => (
                <Button
                  key={option.value}
                  onClick={() => handleRating(option.value)}
                  className={`bg-gradient-to-r ${option.gradient} text-white font-semibold rounded-xl px-3 sm:px-4 py-4 sm:py-3 text-sm min-h-[56px] sm:min-h-0 hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-md active:scale-95 ${
                    index === RATING_OPTIONS.length - 1 ? 'col-span-2 sm:col-span-1 max-w-[200px] mx-auto sm:max-w-none' : ''
                  }`}
                >
                  {option.label}
                  {currentCard.user_rating === option.value && <Check className="ml-1 h-4 w-4" />}
                </Button>
              ))}
            </motion.div>
          )}

          {/* Return Button */}
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard">
              <button 
                className="inline-flex items-center justify-center bg-slate-100 border-2 border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-200 hover:border-slate-400 font-semibold rounded-xl px-6 py-3 transition-colors"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-talka-lg max-w-md w-full text-center"
          >
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-display text-3xl font-semibold gradient-text mb-4">Ready for the Test!</h2>
            <p className="text-slate-500 font-medium mb-8">
              You've rated all cards as "Kinda Know" or "Really Know". Pass the test with 100% to complete this stack!
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => { setShowMasteredModal(false); setCurrentIndex(0); setIsFlipped(false); }}
                className="w-full bg-gradient-blue-purple text-white font-bold rounded-2xl px-8 py-4 shadow-purple"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Review Again
              </Button>
              <Button 
                onClick={() => {
                  setShowMasteredModal(false);
                  setTestMode(true);
                  setTestCardIndex(0);
                  setTestAnswer('');
                  setTestResults([]);
                  setCurrentFeedback(null);
                }}
                className="w-full bg-gradient-green-cyan text-white font-bold rounded-2xl px-8 py-4 shadow-green"
              >
                <PenLine className="h-5 w-5 mr-2" />
                Take Test
              </Button>
              <Link href="/dashboard" className="block">
                <button 
                  className="w-full inline-flex items-center justify-center bg-slate-100 border-2 border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-200 hover:border-slate-400 font-semibold rounded-2xl px-8 py-4 transition-colors"
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
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl sm:rounded-3xl p-5 sm:p-8 shadow-talka-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Progress */}
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between text-sm font-semibold text-slate-500 mb-2">
                <span>Question {testCardIndex + 1} of {cards.length}</span>
                <span>{Math.round((testCardIndex / cards.length) * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-purple-pink transition-all duration-300"
                  style={{ width: `${(testCardIndex / cards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-slate-500 font-medium mb-2 text-sm sm:text-base">Translate to {stack.target_language}:</p>
              <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800">
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
                  className="bg-slate-50 border-2 border-slate-200 rounded-2xl text-base sm:text-lg py-4 sm:py-6 h-14 sm:h-16 font-medium focus:border-talka-purple focus:ring-0 placeholder:text-slate-400"
                  disabled={isGrading}
                  autoComplete="off"
                  autoCapitalize="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && testAnswer.trim() && !isGrading) {
                      handleGradeAnswer();
                    }
                  }}
                />
                <Button
                  onClick={handleGradeAnswer}
                  disabled={!testAnswer.trim() || isGrading}
                  className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-4 min-h-[56px] shadow-purple disabled:opacity-50 active:scale-[0.98]"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Grading...
                    </>
                  ) : (
                    'Submit Answer ✨'
                  )}
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Result */}
                <div className={`flex items-center justify-center gap-3 p-4 rounded-2xl ${
                  currentFeedback.passed ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {currentFeedback.passed ? (
                    <Check className="h-6 w-6 text-green-500" />
                  ) : (
                    <X className="h-6 w-6 text-red-500" />
                  )}
                  <span className={`text-lg font-bold ${
                    currentFeedback.passed ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentFeedback.passed ? 'Correct! 🎉' : 'Not quite right'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100">
                  <p className="text-slate-400 text-sm font-semibold mb-1">Your answer:</p>
                  <p className="text-slate-700 font-medium">{testAnswer}</p>
                </div>

                <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-100">
                  <p className="text-green-600 text-sm font-semibold mb-1">Correct answer:</p>
                  <p className="text-green-700 font-bold">{cards[testCardIndex]?.target_phrase}</p>
                </div>

                {currentFeedback.correction && (
                  <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200">
                    <p className="text-amber-600 text-sm font-semibold mb-1">Suggested correction:</p>
                    <p className="text-amber-700 font-medium">{currentFeedback.correction}</p>
                  </div>
                )}

                <p className="text-slate-500 text-center font-medium italic">{currentFeedback.feedback}</p>

                <Button
                  onClick={handleNextTestCard}
                  className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-4 shadow-purple"
                >
                  {testCardIndex < cards.length - 1 ? 'Next Question →' : 'See Results 🏆'}
                </Button>
              </motion.div>
            )}

            <Link href="/dashboard" className="block">
              <Button variant="ghost" className="w-full mt-4 text-slate-400 hover:text-slate-600 font-semibold">
                Cancel Test
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      )}

      {/* Test Complete Modal */}
      {testComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-talka-lg max-w-lg w-full text-center"
          >
            {testResults.filter(r => r.passed).length === cards.length ? (
              <>
                <div className="text-7xl mb-4">🏆</div>
                <h2 className="font-display text-3xl font-semibold gradient-text mb-2">Perfect Score!</h2>
                <p className="text-green-500 text-xl font-bold mb-6">100% - Stack Complete! 🎉</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-purple-pink flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-white">
                    {Math.round((testResults.filter(r => r.passed).length / cards.length) * 100)}%
                  </span>
                </div>
                <h2 className="font-display text-3xl font-semibold text-slate-800 mb-2">Test Complete</h2>
                <p className="text-slate-500 font-medium mb-6">
                  {testResults.filter(r => r.passed).length} of {cards.length} correct
                </p>
              </>
            )}

            {testResults.some(r => r.correction) && (
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left max-h-48 overflow-y-auto border-2 border-slate-100">
                <p className="text-slate-500 text-sm font-semibold mb-2">Notes for review:</p>
                {testResults.filter(r => r.correction).map((note, idx) => (
                  <div key={idx} className="mb-2 pb-2 border-b border-slate-200 last:border-0">
                    <p className="text-sm font-medium text-slate-700">{note.targetPhrase}</p>
                    <p className="text-xs text-amber-600 font-medium">{note.correction}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => {
                  setTestComplete(false);
                  setTestMode(true);
                  setTestCardIndex(0);
                  setTestAnswer('');
                  setTestResults([]);
                  setCurrentFeedback(null);
                }}
                className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-4 shadow-purple"
              >
                Retake Test
              </Button>
              <Link href="/dashboard" className="block">
                <button 
                  className="w-full inline-flex items-center justify-center bg-slate-100 border-2 border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-200 hover:border-slate-400 font-semibold rounded-2xl py-4 transition-colors"
                >
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
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
        })
        .eq('id', stack.id);

      if (passedCount > 0) {
        try {
          const { data: userStats } = await supabase
            .from('user_stats')
            .select('current_week_cards, current_week_start, weekly_cards_history, pause_weekly_tracking, daily_cards_learned, daily_cards_date, current_streak, longest_streak, streak_frozen, streak_frozen_stacks, total_cards_mastered, tests_completed, perfect_test_streak, daily_goal_streak, ice_breaker_count')
            .eq('user_id', stack.user_id)
            .single();

          if (userStats) {
            let newWeekCards = userStats.current_week_cards || 0;
            let newHistory = userStats.weekly_cards_history || [];
            let newWeekStart = userStats.current_week_start;
            let newTotalMastered = (userStats.total_cards_mastered || 0) + passedCount;

            if (!userStats.pause_weekly_tracking) {
              if (shouldResetWeek(userStats.current_week_start)) {
                if (userStats.current_week_cards > 0 && userStats.current_week_start) {
                  newHistory = archiveWeek(userStats.current_week_cards, newHistory, userStats.current_week_start);
                }
                newWeekCards = 0;
                newWeekStart = getWeekStartUTC();
              }

              const cardsToAdd = Math.min(passedCount, WEEKLY_CARD_CAP - newWeekCards);
              newWeekCards += cardsToAdd;
            }

            const today = getTodayDate();
            const needsReset = isNewDay(userStats.daily_cards_date);
            let newDailyCards = needsReset ? passedCount : (userStats.daily_cards_learned || 0) + passedCount;
            let newStreak = userStats.current_streak || 0;
            let newLongestStreak = userStats.longest_streak || 0;

            if (!userStats.streak_frozen) {
              const previousDaily = needsReset ? 0 : (userStats.daily_cards_learned || 0);
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
            const previousDaily = needsReset ? 0 : (userStats.daily_cards_learned || 0);
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
                weekly_cards_history: newHistory,
                total_cards_mastered: newTotalMastered,
                daily_cards_learned: newDailyCards,
                daily_cards_date: today,
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
                    daily_cards_learned: newDailyCards,
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
