'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { distance } from 'fastest-levenshtein';
import { WordHoverText, getWordTranslations } from '@/components/ui/word-hover';
import { CARD_RATINGS } from '@/lib/constants';

const RATING_OPTIONS = [
  { value: CARD_RATINGS.REALLY_DONT_KNOW, label: "Really Don't Know", color: 'bg-red-500' },
  { value: CARD_RATINGS.DONT_KNOW, label: "Don't Know", color: 'bg-orange-500' },
  { value: CARD_RATINGS.NEUTRAL, label: 'Neutral', color: 'bg-yellow-500' },
  { value: CARD_RATINGS.KINDA_KNOW, label: 'Kinda Know', color: 'bg-green-500' },
  { value: CARD_RATINGS.REALLY_KNOW, label: 'Really Know', color: 'bg-blue-500' },
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

  const currentCard = cards[currentIndex];
  const progress = phase === 'learning'
    ? ((currentIndex + 1) / cards.length) * 100
    : ((testResults.length + 1) / cards.length) * 100;

  useEffect(() => {
    if (phase === 'learning' && isFlipped && currentCard) {
      const targetKey = `${currentIndex}-target`;
      if (!wordTranslations[targetKey]) {
        const targetLang = localStorage.getItem('talka-trial-language') || 'Spanish';
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
    localStorage.setItem('talka-trial-ratings', JSON.stringify(newRatings));

    handleNext();
  };

  const handleNext = () => {
    if (phase === 'learning') {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        setPhase('testing');
        setCurrentIndex(0);
        setIsFlipped(false);
      }
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
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="h-0.5 bg-white/10">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {phase === 'learning' ? (
              <>
                <Badge className="mb-3 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Learning Phase
                </Badge>
                <p className="text-white/60 text-sm font-light mb-2">
                  Card {currentIndex + 1} of {cards.length}
                </p>
                <h2 className="text-2xl font-light capitalize">{scenario}</h2>
              </>
            ) : (
              <>
                <Badge className="mb-3 bg-green-500/20 text-green-400 border-green-500/30">
                  Testing Phase
                </Badge>
                <p className="text-white/60 text-sm font-light mb-2">
                  Question {testResults.length + 1} of {cards.length}
                </p>
                <h2 className="text-2xl font-light">Type the English translation</h2>
              </>
            )}
          </motion.div>

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
                  className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[400px] flex flex-col justify-center cursor-pointer hover:bg-white/8 transition-all duration-300"
                >
                  {!isFlipped ? (
                    <div className="space-y-6">
                      <div className="flex justify-center mb-4">
                        <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20">
                          {currentCard.toneAdvice}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <h3 className="text-4xl font-light mb-6">{currentCard.targetPhrase}</h3>
                      </div>
                      <p className="text-center text-white/40 text-sm font-light mt-8">
                        Tap card to reveal meaning
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center mb-4">
                        <h3 className="text-3xl font-light mb-4">
                          <WordHoverText
                            text={currentCard.targetPhrase}
                            translations={wordTranslations[`${currentIndex}-target`] || []}
                          />
                        </h3>
                      </div>
                      <div className="bg-white/5 rounded-xl p-6 space-y-4">
                        <div>
                          <p className="text-white/60 text-sm font-light mb-2">Translation:</p>
                          <p className="text-xl font-light text-white/90">{currentCard.nativeTranslation}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-sm font-light mb-2">Example usage:</p>
                          <p className="text-lg font-light text-white/90">{currentCard.exampleSentence}</p>
                        </div>
                      </div>
                      <p className="text-center text-white/40 text-xs font-light mt-4">
                        Hover over words in the target language to see meanings
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[400px] flex flex-col justify-center">
                  <div className="space-y-6">
                    <div className="flex justify-center mb-4">
                      <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20">
                        {currentCard.toneAdvice}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <h3 className="text-4xl font-light mb-8">{currentCard.targetPhrase}</h3>
                    </div>

                    {!feedback ? (
                      <div className="space-y-4">
                        <Input
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type the English translation..."
                          className="bg-white/10 border-white/20 text-white text-lg py-6 rounded-xl placeholder:text-white/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={!userAnswer.trim()}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base"
                        >
                          Submit Answer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-6 rounded-xl ${
                            feedback.passed
                              ? 'bg-green-500/20 border border-green-500/30'
                              : 'bg-orange-500/20 border border-orange-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {feedback.passed ? (
                              <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                            ) : (
                              <X className="h-6 w-6 text-orange-400 flex-shrink-0 mt-1" />
                            )}
                            <div>
                              <p className={`font-medium mb-2 ${
                                feedback.passed ? 'text-green-400' : 'text-orange-400'
                              }`}>
                                {feedback.passed ? 'Correct!' : 'Not quite'}
                              </p>
                              <p className="text-white/90 text-sm">{feedback.message}</p>
                            </div>
                          </div>
                        </motion.div>
                        <Button
                          onClick={handleNextTestCard}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base"
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

          {phase === 'learning' && (
            <>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-3"
                >
                  <p className="text-center text-white/60 text-sm font-light mb-2">
                    Rate your knowledge:
                  </p>
                  {RATING_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleRating(option.value)}
                      className={`w-full ${option.color} hover:opacity-90 text-white rounded-xl py-5 text-base font-light`}
                    >
                      {option.label}
                      {cardRatings[currentIndex] === option.value && <Check className="ml-2 h-5 w-5" />}
                    </Button>
                  ))}
                </motion.div>
              )}
              {!isFlipped && (
                <div className="mt-8 flex justify-between items-center">
                  <Button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    variant="ghost"
                    className="text-white/60 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                  >
                    {currentIndex === cards.length - 1 ? 'Start Test' : 'Next'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
