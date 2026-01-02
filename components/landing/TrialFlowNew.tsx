'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { distance } from 'fastest-levenshtein';
import { WordHoverText, getWordTranslations } from '@/components/ui/word-hover';
import { CARD_RATINGS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

const RATING_OPTIONS = [
  { value: CARD_RATINGS.REALLY_DONT_KNOW, label: "Really Don't Know", emoji: '😵', gradient: 'bg-gradient-to-r from-red-500 to-red-600' },
  { value: CARD_RATINGS.DONT_KNOW, label: "Don't Know", emoji: '😕', gradient: 'bg-gradient-to-r from-orange-500 to-orange-600' },
  { value: CARD_RATINGS.NEUTRAL, label: 'Neutral', emoji: '😐', gradient: 'bg-gradient-to-r from-yellow-500 to-yellow-600' },
  { value: CARD_RATINGS.KINDA_KNOW, label: 'Kinda Know', emoji: '🙂', gradient: 'bg-gradient-to-r from-green-500 to-green-600' },
  { value: CARD_RATINGS.REALLY_KNOW, label: 'Really Know', emoji: '🤩', gradient: 'bg-gradient-to-r from-blue-500 to-blue-600' },
];

interface Card {
  targetPhrase: string;
  nativeTranslation: string;
  exampleSentence: string;
  toneAdvice: string;
}

interface TrialFlowProps {
  scenario: string;
  cards: Card[];
  onComplete: () => void;
}

type Phase = 'learning' | 'testing';

export default function TrialFlow({ scenario, cards, onComplete }: TrialFlowProps) {
  const [phase, setPhase] = useState<Phase>('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ passed: boolean; message: string } | null>(null);
  const [testResults, setTestResults] = useState<boolean[]>([]);
  const [wordTranslations, setWordTranslations] = useState<Record<string, any>>({});
  const [cardRatings, setCardRatings] = useState<Record<number, number>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      console.log('[TrialFlow] Auth check:', { isLoggedIn: !!session });
    };
    checkAuth();
  }, []);

  // Check if all cards are mastered (rated 4 or 5)
  const allCardsMastered = Object.keys(cardRatings).length === cards.length && 
    Object.values(cardRatings).every(rating => rating >= CARD_RATINGS.KINDA_KNOW);

  const currentCard = cards[currentIndex];
  const progress = phase === 'learning'
    ? ((currentIndex + 1) / cards.length) * 100
    : ((testResults.length + 1) / cards.length) * 100;

  useEffect(() => {
    if (phase === 'learning' && isFlipped && currentCard) {
      const targetKey = `${currentIndex}-target`;
      if (!wordTranslations[targetKey]) {
        const targetLang = localStorage.getItem('lockn-trial-language') || 'Spanish';
        getWordTranslations(currentCard.targetPhrase, targetLang, 'English').then(translations => {
          setWordTranslations((prev: Record<string, any>) => ({
            ...prev,
            [targetKey]: translations
          }));
        });
      }
    }
  }, [isFlipped, currentIndex, phase, currentCard]);

  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[?.!,;:'"]/g, '')
      .replace(/\s+/g, ' ');
  };

  const checkAnswer = (userInput: string, correctAnswer: string): boolean => {
    const normalized1 = normalizeString(userInput);
    const normalized2 = normalizeString(correctAnswer);

    if (normalized1 === normalized2) return true;

    const maxLength = Math.max(normalized1.length, normalized2.length);
    const editDistance = distance(normalized1, normalized2);
    const similarity = 1 - (editDistance / maxLength);

    return similarity >= 0.85;
  };

  const getDetailedFeedback = (userInput: string, correctAnswer: string): string => {
    const normalized1 = normalizeString(userInput);
    const normalized2 = normalizeString(correctAnswer);
    const userWords = normalized1.split(' ');
    const correctWords = normalized2.split(' ');

    if (normalized1 === normalized2) {
      return '';
    }

    if (userInput.trim().length < 3 || normalized1.replace(/\s/g, '').length < 2) {
      return `Close! The correct answer is: "${correctAnswer}".`;
    }

    const maxLength = Math.max(normalized1.length, normalized2.length);
    const editDistance = distance(normalized1, normalized2);
    const similarity = 1 - (editDistance / maxLength);

    if (userWords.sort().join(' ') === correctWords.sort().join(' ')) {
      return `Almost! You have the right words but in the wrong order. The correct phrase is: "${correctAnswer}".`;
    }

    const matchingWords = userWords.filter(word => correctWords.includes(word));
    if (matchingWords.length > 0 && matchingWords.length === correctWords.length) {
      return `Close! Check your spelling. The correct answer is: "${correctAnswer}".`;
    }

    if (similarity >= 0.7) {
      return `Very close! You may have a small spelling error. The correct answer is: "${correctAnswer}".`;
    }

    if (similarity >= 0.5) {
      return `Getting there! The correct answer is: "${correctAnswer}". Keep practicing this phrase.`;
    }

    return `Close! The correct answer is: "${correctAnswer}".`;
  };

  const handleRating = (rating: number) => {
    const newRatings = { ...cardRatings, [currentIndex]: rating };
    setCardRatings(newRatings);
    localStorage.setItem('lockn-trial-ratings', JSON.stringify(newRatings));

    // Check mastery with the NEW ratings
    const allRated = Object.keys(newRatings).length === cards.length;
    const allMastered = allRated && Object.values(newRatings).every(r => r >= CARD_RATINGS.KINDA_KNOW);

    console.log('[TrialFlow] Rating:', { 
      cardIndex: currentIndex, 
      rating, 
      allRated, 
      allMastered,
      isLoggedIn 
    });

    // Auto-advance to next card
    if (currentIndex < cards.length - 1) {
      // More cards to go
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      }, 300);
    } else {
      // Last card rated - decide what to do
      if (!isLoggedIn) {
        // Guest: Go to signup (no test)
        console.log('[TrialFlow] Guest finished, going to signup');
        setTimeout(() => onComplete(), 500);
      } else if (allMastered) {
        // Logged-in and all mastered: Start test
        console.log('[TrialFlow] All mastered, starting test');
        setTimeout(() => {
          setPhase('testing');
          setCurrentIndex(0);
          setIsFlipped(false);
        }, 500);
      } else {
        // Logged-in but not all mastered: Cycle back to first unmastered
        console.log('[TrialFlow] Not all mastered, cycling back');
        const firstUnmasteredIndex = cards.findIndex((_, i) => 
          !newRatings[i] || newRatings[i] < CARD_RATINGS.KINDA_KNOW
        );
        setTimeout(() => {
          setCurrentIndex(firstUnmasteredIndex >= 0 ? firstUnmasteredIndex : 0);
          setIsFlipped(false);
        }, 300);
      }
    }
  };

  // Keep handleNext for the Previous button navigation only
  const handleNext = () => {
    if (phase === 'learning' && currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    if (phase === 'learning') {
      setIsFlipped(!isFlipped);
    }
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const passed = checkAnswer(userAnswer, currentCard.nativeTranslation);
    const newResults = [...testResults, passed];
    setTestResults(newResults);

    if (passed) {
      setFeedback({
        passed: true,
        message: 'Perfect! Great job.'
      });
    } else {
      const detailedFeedback = getDetailedFeedback(userAnswer, currentCard.nativeTranslation);
      setFeedback({
        passed: false,
        message: detailedFeedback
      });
    }
  };

  const handleNextTestCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setFeedback(null);
    } else {
      onComplete();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && phase === 'testing' && !feedback) {
      handleSubmitAnswer();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Progress Bar */}
      <div className="h-2 bg-slate-200">
        <motion.div
          className="h-full bg-gradient-purple-pink"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-4 sm:px-6 sm:py-8 md:py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4 sm:mb-6"
          >
            {phase === 'learning' ? (
              <>
                <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-purple-pink text-white font-bold rounded-full text-xs sm:text-sm mb-3 sm:mb-4 shadow-purple">
                  ✨ Learning Phase
                </span>
                <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">
                  Card {currentIndex + 1} of {cards.length}
                  {isLoggedIn && (
                    <span className="ml-2">
                      • {Object.values(cardRatings).filter(r => r >= CARD_RATINGS.KINDA_KNOW).length}/{cards.length} mastered
                    </span>
                  )}
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-800 capitalize">{scenario}</h2>
                {isLoggedIn && !allCardsMastered && Object.keys(cardRatings).length === cards.length && (
                  <p className="text-amber-600 text-sm font-medium mt-2">
                    Rate all cards as "Kinda Know" or "Really Know" to unlock the test
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="inline-block px-4 py-2 bg-gradient-green-cyan text-white font-bold rounded-full text-sm mb-4 shadow-green">
                  📝 Testing Phase
                </span>
                <p className="text-slate-500 text-sm font-semibold mb-2">
                  Question {testResults.length + 1} of {cards.length}
                </p>
                <h2 className="font-display text-2xl font-semibold text-slate-800">Type the English translation</h2>
              </>
            )}
          </motion.div>

          {/* Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${phase}-${currentIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {phase === 'learning' ? (
                <div
                  onClick={handleFlip}
                  className="bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 min-h-[280px] sm:min-h-[350px] flex flex-col justify-center cursor-pointer hover:border-talka-purple hover:shadow-talka-md transition-all duration-300 shadow-talka-sm active:scale-[0.99]"
                >
                  {!isFlipped ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex justify-center mb-3 sm:mb-4">
                        <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 text-slate-600 font-semibold rounded-full text-xs sm:text-sm">
                          {currentCard.toneAdvice}
                        </span>
                      </div>
                      <div className="text-center">
                        <h3 className="font-display text-2xl sm:text-4xl font-semibold text-slate-800 mb-4 sm:mb-6">{currentCard.targetPhrase}</h3>
                      </div>
                      <p className="text-center text-slate-400 text-xs sm:text-sm font-medium mt-6 sm:mt-8">
                        👆 Tap card to reveal meaning
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-center mb-3 sm:mb-4">
                        <h3 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800 mb-3 sm:mb-4">
                          <WordHoverText
                            text={currentCard.targetPhrase}
                            translations={wordTranslations[`${currentIndex}-target`] || []}
                          />
                        </h3>
                      </div>
                      <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                        <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">🔤 Translation:</p>
                        <p className="text-lg sm:text-xl font-semibold text-slate-800">{currentCard.nativeTranslation}</p>
                      </div>
                      <p className="text-center text-slate-400 text-[10px] sm:text-xs font-medium mt-3 sm:mt-4">
                        Hover over words in the target language to see meanings
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 min-h-[280px] sm:min-h-[350px] flex flex-col justify-center shadow-talka-sm">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex justify-center mb-3 sm:mb-4">
                      <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 text-slate-600 font-semibold rounded-full text-xs sm:text-sm">
                        {currentCard.toneAdvice}
                      </span>
                    </div>
                    <div className="text-center">
                      <h3 className="font-display text-2xl sm:text-4xl font-semibold text-slate-800 mb-5 sm:mb-8">{currentCard.targetPhrase}</h3>
                    </div>

                    {!feedback ? (
                      <div className="space-y-3 sm:space-y-4">
                        <Input
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type the English translation..."
                          className="bg-slate-50 border-2 border-slate-200 text-slate-800 text-base sm:text-lg h-14 sm:h-16 rounded-xl sm:rounded-2xl placeholder:text-slate-400 focus:border-talka-purple focus:ring-0 font-medium"
                          autoFocus
                        />
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={!userAnswer.trim()}
                          className="w-full bg-gradient-purple-pink text-white font-bold rounded-xl sm:rounded-2xl min-h-[52px] sm:min-h-[56px] py-3 sm:py-4 text-base shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98]"
                        >
                          Submit Answer ✨
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-6 rounded-2xl border-2 ${
                            feedback.passed
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {feedback.passed ? (
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Check className="h-6 w-6 text-green-500" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <X className="h-6 w-6 text-amber-500" />
                              </div>
                            )}
                            <div>
                              <p className={`font-bold mb-2 ${
                                feedback.passed ? 'text-green-600' : 'text-amber-600'
                              }`}>
                                {feedback.passed ? '🎉 Correct!' : 'Not quite'}
                              </p>
                              <p className="text-slate-600 text-sm font-medium">{feedback.message}</p>
                            </div>
                          </div>
                        </motion.div>
                        <Button
                          onClick={handleNextTestCard}
                          className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-6 text-base shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                          {currentIndex < cards.length - 1 ? 'Next Card →' : 'Complete Trial 🎊'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Rating Buttons */}
          {phase === 'learning' && (
            <>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 sm:mt-6 space-y-2 sm:space-y-3"
                >
                  <p className="text-center text-slate-500 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
                    Rate your knowledge:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                    {RATING_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        onClick={() => handleRating(option.value)}
                        className={`w-full ${option.gradient} hover:opacity-90 text-white rounded-xl sm:rounded-2xl py-3 sm:py-4 text-sm sm:text-base font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all min-h-[48px] active:scale-[0.98]`}
                      >
                        {option.emoji} <span className="hidden sm:inline">{option.label}</span><span className="sm:hidden">{option.label.split(' ').slice(-1)}</span>
                        {cardRatings[currentIndex] === option.value && <Check className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
              {!isFlipped && (
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-2">
                  {currentIndex > 0 && (
                    <Button
                      onClick={handlePrev}
                      variant="ghost"
                      className="text-slate-500 hover:text-slate-800 font-semibold min-h-[44px]"
                    >
                      <ChevronLeft className="h-5 w-5 mr-2" />
                      Previous
                    </Button>
                  )}
                  <p className="text-slate-400 text-xs sm:text-sm font-medium text-center sm:ml-4">
                    👆 Tap card to flip, then rate
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
