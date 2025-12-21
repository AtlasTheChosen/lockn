'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

const RATING_OPTIONS = [
  { value: 1, label: "Really Don't Know", color: 'bg-red-600 hover:bg-red-700' },
  { value: 2, label: "Don't Know", color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 3, label: "Neutral", color: 'bg-yellow-500 hover:bg-yellow-600' },
  { value: 4, label: "Know", color: 'bg-lime-500 hover:bg-lime-600' },
  { value: 5, label: "Really Know", color: 'bg-green-600 hover:bg-green-700' },
];

type Phase = 'learning' | 'practice';

export default function TrialFlow({ scenario, cards, onComplete }: TrialFlowProps) {
  const [phase, setPhase] = useState<Phase>('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [cardRatings, setCardRatings] = useState<number[]>(new Array(cards.length).fill(0));
  const [practiceCards, setPracticeCards] = useState<number[]>([]);
  const [practiceRatings, setPracticeRatings] = useState<number[]>([]);

  const activeCards = phase === 'learning' ? cards : practiceCards.map(i => cards[i]);
  const activeRatings = phase === 'learning' ? cardRatings : practiceRatings;
  const currentCard = activeCards[currentIndex];
  const progress = phase === 'learning'
    ? ((currentIndex + 1) / cards.length) * 100
    : ((currentIndex + 1) / practiceCards.length) * 100;
  const ratedCount = activeRatings.filter(r => r > 0).length;

  useEffect(() => {
    if (phase === 'learning' && ratedCount === cards.length) {
      setTimeout(() => {
        const sortedIndices = cardRatings
          .map((rating, index) => ({ rating, index }))
          .sort((a, b) => a.rating - b.rating)
          .map(item => item.index);

        const selectedPracticeCards = sortedIndices.slice(0, 3);
        setPracticeCards(selectedPracticeCards);
        setPracticeRatings(new Array(3).fill(0));
        setPhase('practice');
        setCurrentIndex(0);
        setIsFlipped(false);
      }, 500);
    } else if (phase === 'practice' && ratedCount === practiceCards.length) {
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  }, [ratedCount, cards.length, phase, cardRatings, practiceCards.length, onComplete]);

  const handleRating = (rating: number) => {
    if (phase === 'learning') {
      const newRatings = [...cardRatings];
      newRatings[currentIndex] = rating;
      setCardRatings(newRatings);

      setIsFlipped(false);

      if (currentIndex < cards.length - 1) {
        setDirection(1);
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
        }, 100);
      }
    } else {
      const newRatings = [...practiceRatings];
      newRatings[currentIndex] = rating;
      setPracticeRatings(newRatings);

      setIsFlipped(false);

      if (currentIndex < practiceCards.length - 1) {
        setDirection(1);
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
        }, 100);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
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
                <p className="text-white/60 text-sm font-light mb-2">
                  Card {currentIndex + 1} of {cards.length} • {ratedCount} rated
                </p>
                <h2 className="text-2xl font-light capitalize">{scenario}</h2>
              </>
            ) : (
              <>
                <p className="text-blue-400 text-sm font-light mb-2">
                  Practice Round • Card {currentIndex + 1} of 3
                </p>
                <h2 className="text-2xl font-light capitalize">Spaced Repetition Practice</h2>
              </>
            )}
          </motion.div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${phase}-${currentIndex}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative"
            >
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
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white"
                      >
                        <Volume2 className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-center text-white/40 text-sm font-light mt-8">
                      Tap card to reveal meaning
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-3xl font-light mb-4 text-white/90">{currentCard.targetPhrase}</h3>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 space-y-4">
                      <div>
                        <p className="text-white/60 text-sm font-light mb-2">Translation:</p>
                        <p className="text-xl font-light">{currentCard.nativeTranslation}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm font-light mb-2">Example usage:</p>
                        <p className="text-lg font-light text-white/90">{currentCard.exampleSentence}</p>
                      </div>
                    </div>
                    <p className="text-center text-white/40 text-sm font-light mt-4">
                      Rate your knowledge below
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 space-y-4">
            {activeRatings[currentIndex] > 0 && (
              <div className="text-center">
                <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20">
                  Rated: {RATING_OPTIONS.find(opt => opt.value === activeRatings[currentIndex])?.label}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 justify-center">
              {RATING_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => handleRating(option.value)}
                  className={`${option.color} text-white rounded-xl px-3 py-3 font-light transition-all text-xs sm:text-sm`}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex justify-center mt-6">
              <Button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                variant="ghost"
                className="text-white/60 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Previous
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
