'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Volume2, Trophy, Sparkles, ChevronRight, Brain, Loader2, ArrowLeftRight, MessageSquare } from 'lucide-react';
import type { CardStack, Flashcard } from '@/lib/types';
import Confetti from 'react-confetti';
import { CARD_RATINGS } from '@/lib/constants';
import { WordHoverText, getWordTranslations } from '@/components/ui/word-hover';
import ReviewNotes from './ReviewNotes';
import { getCEFRBadgeColor } from '@/lib/cefr-ranking';

interface Props {
  stack: CardStack;
  cards: Flashcard[];
}

const RATING_OPTIONS = [
  { value: CARD_RATINGS.REALLY_DONT_KNOW, label: "Really Don't Know", color: 'bg-red-500' },
  { value: CARD_RATINGS.DONT_KNOW, label: "Don't Know", color: 'bg-orange-500' },
  { value: CARD_RATINGS.NEUTRAL, label: 'Neutral', color: 'bg-yellow-500' },
  { value: CARD_RATINGS.KINDA_KNOW, label: 'Kinda Know', color: 'bg-green-500' },
  { value: CARD_RATINGS.REALLY_KNOW, label: 'Really Know', color: 'bg-blue-500' },
];


export default function StackLearningClient({ stack: initialStack, cards: initialCards }: Props) {
  const [stack, setStack] = useState(initialStack);
  const [originalCards] = useState(initialCards);
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState('');
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [conversationalMode, setConversationalMode] = useState(initialStack.conversational_mode || false);
  const [wordTranslations, setWordTranslations] = useState<Record<string, any>>({});
  const [mistakes, setMistakes] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const allCardsMastered = cards.every((c) => (c.user_rating || 1) >= 4);

  useEffect(() => {
    if (allCardsMastered && !stack.is_completed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      handleStackCompletion();
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

  useEffect(() => {
    if (isFlipped && currentCard && !reverseMode) {
      const targetKey = `${currentCard.id}-target`;
      if (!wordTranslations[targetKey]) {
        const targetLang = stack.target_language || 'Spanish';
        getWordTranslations(currentCard.target_phrase, targetLang, 'English').then(translations => {
          setWordTranslations((prev: Record<string, any>) => ({
            ...prev,
            [targetKey]: translations
          }));
        });
      }
    }
  }, [isFlipped, currentCard, reverseMode]);

  const handleStackCompletion = async () => {
    await supabase
      .from('card_stacks')
      .update({
        is_completed: true,
        completion_date: new Date().toISOString(),
        mastered_count: cards.length,
      })
      .eq('id', stack.id);

    await supabase.rpc('increment', {
      table_name: 'user_stats',
      column_name: 'total_stacks_completed',
      user_id_val: stack.user_id,
    });

    setStack({ ...stack, is_completed: true, completion_date: new Date().toISOString() });
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

    setIsFlipped(false);
    setShowBreakdown(false);
    setBreakdown('');

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const lowestRatedIndex = updatedCards.findIndex((c) => (c.user_rating || 1) < 4);
      if (lowestRatedIndex !== -1) {
        setCurrentIndex(lowestRatedIndex);
      }
    }
  };

  const handleExplainPhrase = async () => {
    if (!currentCard || loadingBreakdown) return;

    setLoadingBreakdown(true);
    try {
      const response = await fetch('/api/explain-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhrase: currentCard.target_phrase,
          nativeTranslation: currentCard.native_translation,
          language: stack.target_language,
          exampleSentence: currentCard.example_sentence,
        }),
      });

      const data = await response.json();
      setBreakdown(data.breakdown);
      setShowBreakdown(true);
    } catch (error) {
      console.error('Error fetching breakdown:', error);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackSpeed;
      utterance.lang = getLanguageCode(stack.target_language);
      speechSynthesis.speak(utterance);
    }
  };

  const getLanguageCode = (language: string): string => {
    const codes: Record<string, string> = {
      Spanish: 'es-ES',
      French: 'fr-FR',
      German: 'de-DE',
      Italian: 'it-IT',
      Portuguese: 'pt-PT',
      Japanese: 'ja-JP',
      Korean: 'ko-KR',
      'Chinese (Mandarin)': 'zh-CN',
      Arabic: 'ar-SA',
      Russian: 'ru-RU',
      Hindi: 'hi-IN',
      Turkish: 'tr-TR',
    };
    return codes[language] || 'en-US';
  };

  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Card className="w-full max-w-md bg-white/5 border-white/10">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-light mb-4">All Done!</h2>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      <div className="h-0.5 bg-white/10">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              const newMode = !conversationalMode;
              setConversationalMode(newMode);
              setCurrentIndex(0);
              setIsFlipped(false);
              setShowBreakdown(false);

              await supabase
                .from('card_stacks')
                .update({ conversational_mode: newMode })
                .eq('id', stack.id);

              setStack({ ...stack, conversational_mode: newMode });
            }}
            variant="ghost"
            size="sm"
            className={`text-white/60 hover:text-white ${conversationalMode ? 'bg-blue-500/20 text-blue-400' : ''}`}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Dialogue
          </Button>
          <Button
            onClick={() => {
              setReverseMode(!reverseMode);
              setIsFlipped(false);
              setShowBreakdown(false);
            }}
            variant="ghost"
            size="sm"
            className={`text-white/60 hover:text-white ${reverseMode ? 'bg-blue-500/20 text-blue-400' : ''}`}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            Reverse
          </Button>
          <span className="text-white/60 text-sm font-light">
            {currentIndex + 1} / {cards.length}
          </span>
          {stack.is_completed && (
            <Badge className="bg-green-500/20 text-green-400 border-0">
              <Trophy className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-light capitalize">{stack.title}</h2>
          </div>

          <motion.div
            onClick={() => !showBreakdown && setIsFlipped(!isFlipped)}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[400px] flex flex-col justify-center cursor-pointer hover:bg-white/8 transition-all duration-300 relative"
          >
            {stack.cefr_level && (
              <Badge
                className={`absolute top-4 right-4 ${getCEFRBadgeColor(stack.cefr_level)} border font-semibold text-xs px-3 py-1`}
              >
                Level: {stack.cefr_level}
              </Badge>
            )}
            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.div
                  key="front"
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -180, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col items-center justify-center space-y-6"
                >
                  <div className="text-center space-y-4">
                    <h3 className="text-5xl font-light leading-tight">
                      {reverseMode ? currentCard.native_translation : currentCard.target_phrase}
                    </h3>

                    {!reverseMode && (
                      <div className="flex items-center justify-center gap-3">
                        <Badge className="bg-blue-500/20 text-blue-400 border-0 text-sm px-3 py-1">
                          {currentCard.tone_advice}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {!reverseMode && (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(currentCard.target_phrase);
                        }}
                        variant="outline"
                        size="lg"
                        className="border-white/20 text-white/80 hover:bg-white/10 rounded-xl"
                      >
                        <Volume2 className="h-5 w-5 mr-2" />
                        Play
                      </Button>
                      <div className="flex gap-1">
                        {[0.75, 1.0, 1.25].map((speed) => (
                          <Button
                            key={speed}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaybackSpeed(speed);
                            }}
                            variant="ghost"
                            size="sm"
                            className={`text-xs ${
                              playbackSpeed === speed
                                ? 'text-blue-500 bg-blue-500/10'
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            {speed}x
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-center text-white/40 text-sm font-light mt-8">
                    Tap anywhere to flip
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="back"
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -180, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <h3 className="text-4xl font-light">
                        {reverseMode ? (
                          <WordHoverText
                            text={currentCard.target_phrase}
                            translations={wordTranslations[`${currentCard.id}-target`] || []}
                          />
                        ) : (
                          currentCard.native_translation
                        )}
                      </h3>
                      {reverseMode && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakText(currentCard.target_phrase);
                          }}
                          variant="ghost"
                          size="icon"
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <Volume2 className="h-6 w-6" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xl text-white/60 font-light">
                      {reverseMode ? currentCard.native_translation : currentCard.target_phrase}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-xs font-light mb-2">Example:</p>
                    <p className="text-base font-light leading-relaxed">{currentCard.example_sentence}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-0 text-sm px-4 py-2">
                      {currentCard.tone_advice}
                    </Badge>
                  </div>

                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExplainPhrase();
                      }}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white/80 hover:bg-white/10"
                      disabled={loadingBreakdown}
                    >
                      {loadingBreakdown ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 mr-2" />
                      )}
                      Explain this phrase
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showBreakdown && breakdown && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 text-left overflow-y-auto max-h-64"
                      >
                        <p className="text-sm font-light text-white/80 whitespace-pre-wrap">{breakdown}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showBreakdown && (
                    <p className="text-center text-white/40 text-sm font-light mt-4">
                      Rate your knowledge below
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3"
            >
              {RATING_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => handleRating(option.value)}
                  className={`w-full ${option.color} hover:opacity-90 text-white rounded-xl py-6 text-base font-light`}
                >
                  {option.label}
                  {currentCard.user_rating === option.value && <Check className="ml-2 h-5 w-5" />}
                </Button>
              ))}
            </motion.div>
          )}

          <ReviewNotes mistakes={mistakes} isCompleted={stack.is_completed} />
        </div>
      </div>

      {allCardsMastered && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 z-50"
        >
          <Card className="w-full max-w-md bg-white/5 border-white/10">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-light mb-4">Stack Mastered!</h2>
              <p className="text-white/60 font-light mb-6">
                You've rated all cards as "Kinda Know" or "Really Know". Keep practicing to maintain mastery!
              </p>
              <Link href="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-3">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
