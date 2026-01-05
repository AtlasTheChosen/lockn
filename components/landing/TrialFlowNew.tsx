'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, ChevronUp, Check, X, Loader2, ArrowLeft, ArrowLeftRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { distance } from 'fastest-levenshtein';
import { WordHoverText, getWordTranslations } from '@/components/ui/word-hover';
import { CARD_RATINGS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

const RATING_OPTIONS = [
  { value: CARD_RATINGS.REALLY_DONT_KNOW, label: "Really Don't Know", gradient: 'from-red-400 to-red-500' },
  { value: CARD_RATINGS.DONT_KNOW, label: "Don't Know", gradient: 'from-orange-400 to-orange-500' },
  { value: CARD_RATINGS.NEUTRAL, label: 'Neutral', gradient: 'from-yellow-400 to-amber-500' },
  { value: CARD_RATINGS.KINDA_KNOW, label: 'Kinda Know', gradient: 'from-green-400 to-emerald-500' },
  { value: CARD_RATINGS.REALLY_KNOW, label: 'Really Know', gradient: 'from-blue-400 to-indigo-500' },
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
  const [reverseMode, setReverseMode] = useState(false);
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownData, setBreakdownData] = useState<Record<number, any>>({});
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);

  // Check if user is logged in and load CEFR level
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      console.log('[TrialFlow] Auth check:', { isLoggedIn: !!session });
    };
    checkAuth();
    
    // Load CEFR level from localStorage
    const savedLevel = localStorage.getItem('lockn-trial-level');
    if (savedLevel) {
      setCefrLevel(savedLevel);
    }
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

  // Reset breakdown when card changes
  useEffect(() => {
    setShowBreakdown(false);
  }, [currentIndex]);

  // Fetch breakdown data for a card
  const fetchBreakdown = async () => {
    if (breakdownData[currentIndex]) {
      setShowBreakdown(true);
      return;
    }
    setIsLoadingBreakdown(true);
    try {
      const targetLang = localStorage.getItem('lockn-trial-language') || 'Spanish';
      const response = await fetch('/api/phrase-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: currentCard.targetPhrase,
          translation: currentCard.nativeTranslation,
          language: targetLang,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setBreakdownData(prev => ({ ...prev, [currentIndex]: data }));
        setShowBreakdown(true);
      }
    } catch (error) {
      console.error('Error fetching breakdown:', error);
    }
    setIsLoadingBreakdown(false);
  };

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

      {/* Toolbar - matches signed-in experience */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
        <Button 
          onClick={onComplete}
          variant="ghost" 
          className="text-slate-500 hover:text-slate-700 font-semibold rounded-xl px-2 sm:px-4"
        >
          <ArrowLeft className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
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
          <span className="text-slate-500 font-semibold px-2 sm:px-3 py-1 bg-slate-100 rounded-xl text-sm">
            {currentIndex + 1}/{cards.length}
          </span>
        </div>
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
                  className="bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 pt-12 sm:pt-8 min-h-[300px] sm:min-h-[400px] flex flex-col justify-center cursor-pointer hover:border-talka-purple hover:shadow-talka-md transition-all duration-300 shadow-talka-sm active:scale-[0.99] relative"
                >
                  {/* CEFR Level Badge */}
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 bg-gradient-green-cyan text-white font-bold rounded-xl text-xs sm:text-sm z-10">
                    {cefrLevel}
                  </span>

                  {!isFlipped ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-center space-y-4">
                        <h3 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 leading-tight">
                          {reverseMode ? currentCard.nativeTranslation : currentCard.targetPhrase}
                        </h3>
                        {!reverseMode && (
                          <span className="inline-block px-4 py-2 bg-talka-purple/10 text-talka-purple font-semibold rounded-xl">
                            {currentCard.toneAdvice}
                          </span>
                        )}
                      </div>
                      <p className="text-center text-slate-400 text-xs sm:text-sm font-medium mt-8">
                        Tap anywhere to flip
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Answer Header */}
                      <div className="text-center space-y-4">
                        <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800">
                          {reverseMode ? (
                            <WordHoverText
                              text={currentCard.targetPhrase}
                              translations={wordTranslations[`${currentIndex}-target`] || []}
                            />
                          ) : (
                            currentCard.nativeTranslation
                          )}
                        </h3>
                        <p className="text-lg sm:text-xl text-slate-500 font-medium">
                          {reverseMode ? (
                            currentCard.nativeTranslation
                          ) : (
                            <WordHoverText
                              text={currentCard.targetPhrase}
                              translations={wordTranslations[`${currentIndex}-target`] || []}
                            />
                          )}
                        </p>
                      </div>

                      {/* Tone Badge */}
                      <div className="flex items-center justify-center">
                        <span className="px-4 py-2 bg-talka-purple/10 text-talka-purple font-semibold rounded-xl">
                          {currentCard.toneAdvice}
                        </span>
                      </div>

                      {/* Breakdown Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); showBreakdown ? setShowBreakdown(false) : fetchBreakdown(); }}
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
                        {showBreakdown && breakdownData[currentIndex] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-5 border-2 border-amber-200 space-y-3 overflow-hidden"
                          >
                            {/* Word-by-Word Breakdown */}
                            {breakdownData[currentIndex].wordBreakdown?.length > 0 && (
                              <div>
                                <h4 className="text-amber-700 font-bold text-sm mb-2 flex items-center gap-2">
                                  Word-by-Word
                                </h4>
                                <div className="space-y-1.5">
                                  {breakdownData[currentIndex].wordBreakdown?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                      <span className="font-bold text-slate-800 min-w-[60px]">{item.word}</span>
                                      <span className="text-slate-600">→ {item.meaning}</span>
                                      {item.grammar && (
                                        <span className="text-amber-600 text-xs bg-amber-100 px-1.5 py-0.5 rounded-full">{item.grammar}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Grammar Pattern */}
                            {(breakdownData[currentIndex].grammarPattern || breakdownData[currentIndex].grammarNotes) && (
                              <div className="pt-2 border-t border-amber-200">
                                <h4 className="text-amber-700 font-bold text-sm mb-1">Grammar</h4>
                                <p className="text-slate-700 text-sm leading-relaxed">
                                  {breakdownData[currentIndex].grammarPattern || breakdownData[currentIndex].grammarNotes}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="text-center text-slate-400 text-[10px] sm:text-xs font-medium">
                        Hover over words to see definitions
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
                          Submit Answer
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
                          {currentIndex < cards.length - 1 ? 'Next Card' : 'Complete Trial'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Rating Buttons */}
          {phase === 'learning' && isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3"
            >
              {RATING_OPTIONS.map((option, index) => (
                <Button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRating(option.value);
                  }}
                  className={`bg-gradient-to-r ${option.gradient} text-white font-semibold rounded-xl px-3 sm:px-4 py-4 sm:py-3 text-sm min-h-[56px] sm:min-h-0 hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-md active:scale-95 ${
                    index === RATING_OPTIONS.length - 1 ? 'col-span-2 sm:col-span-1 max-w-[200px] mx-auto sm:max-w-none' : ''
                  }`}
                >
                  {option.label}
                  {cardRatings[currentIndex] === option.value && <Check className="ml-1 h-4 w-4" />}
                </Button>
              ))}
            </motion.div>
          )}

          {/* Navigation hint when not flipped */}
          {phase === 'learning' && !isFlipped && (
            <div className="mt-6 sm:mt-8 flex justify-center items-center gap-4">
              {currentIndex > 0 && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  variant="ghost"
                  className="text-slate-500 hover:text-slate-800 font-semibold"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Previous
                </Button>
              )}
              {currentIndex < cards.length - 1 && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  variant="ghost"
                  className="text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Next
                  <ChevronLeft className="h-5 w-5 ml-1 rotate-180" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
