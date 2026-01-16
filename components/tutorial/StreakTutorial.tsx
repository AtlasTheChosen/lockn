'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Clock, Snowflake, ChevronRight, ChevronLeft, X, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreakTutorialProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const STEPS = [
  {
    id: 1,
    title: "Welcome to LOCKN! ✨",
    subtitle: "Your language learning journey starts here",
    description: "Here's what makes LOCKN special:\n\n📚 Create flashcard stacks on any topic you want\n\n🔍 Tap \"Breakdown\" for grammar tips & memory tricks\n\n🔊 Tap any word to hear it and see its definition",
    icon: BookOpen,
    color: 'from-purple-400 to-pink-500',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
  },
  {
    id: 2,
    title: "Keep Your Streak Alive! 🔥",
    subtitle: "Learn 5 cards every day",
    description: "Rate 5 cards as \"Kinda Know\" or \"Really Know\" each day to build your streak. Consistency is key!",
    icon: Flame,
    color: 'from-orange-400 to-red-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-red-50',
  },
  {
    id: 3,
    title: "Master Your Stack! 🏆",
    subtitle: "Unlock the final test",
    description: "Once you rate ALL cards in a stack as \"Kinda Know\" or better, a mastery test unlocks. Pass it to complete the stack!",
    icon: Trophy,
    color: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-50',
  },
  {
    id: 4,
    title: "Beat the Clock! ⏰",
    subtitle: "Complete tests on time",
    description: "You have a grace period to complete each test:\n\n• Small stacks (10 cards): 2 days\n• Medium stacks (25+ cards): 5 days\n• Large stacks (50+ cards): 10 days",
    icon: Clock,
    color: 'from-blue-400 to-indigo-500',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
  },
  {
    id: 5,
    title: "Streak Frozen? ❄️",
    subtitle: "Don't worry, you can recover!",
    description: "If you miss a test deadline, your streak freezes and can't grow. You must still learn 5 cards daily or your streak resets to 0! Pass the test to unfreeze and start growing again.",
    icon: Snowflake,
    color: 'from-cyan-400 to-blue-500',
    bgColor: 'bg-gradient-to-br from-cyan-50 to-blue-50',
  },
];

export default function StreakTutorial({ onComplete, onSkip }: StreakTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4"
    >
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors flex items-center gap-1 text-sm"
      >
        Skip <X className="w-4 h-4" />
      </button>

      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`${step.bgColor} rounded-3xl p-8 shadow-2xl`}
          >
            {/* Animated Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 200, 
                  damping: 15,
                  delay: 0.1 
                }}
                className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
              >
                <motion.div
                  animate={
                    step.id === 1 
                      ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
                      : step.id === 3
                      ? { rotate: [0, 360] }
                      : step.id === 4
                      ? { y: [0, -5, 0], rotate: [0, 10, -10, 0] }
                      : {}
                  }
                  transition={{ 
                    duration: step.id === 3 ? 2 : 1.5, 
                    repeat: Infinity,
                    ease: step.id === 3 ? 'linear' : 'easeInOut'
                  }}
                >
                  <step.icon className="w-12 h-12 text-white" />
                </motion.div>
              </motion.div>
            </div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                {step.title}
              </h2>
              <p className={`text-lg font-semibold bg-gradient-to-r ${step.color} bg-clip-text text-transparent mb-4`}>
                {step.subtitle}
              </p>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {step.description}
              </p>
            </motion.div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mt-8 mb-6">
              {STEPS.map((_, index) => (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    width: index === currentStep ? 24 : 8,
                    backgroundColor: index === currentStep ? '#8B5CF6' : '#CBD5E1',
                  }}
                  className="h-2 rounded-full"
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={handlePrev}
                variant="ghost"
                disabled={currentStep === 0}
                className="text-slate-500 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>

              <Button
                onClick={handleNext}
                className={`bg-gradient-to-r ${step.color} text-white font-bold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all`}
              >
                {isLastStep ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Got it!
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Fun decorative elements */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-20 left-10 text-4xl opacity-20"
        >
          🔥
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          className="absolute bottom-20 right-10 text-4xl opacity-20"
        >
          ⭐
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          className="absolute top-32 right-20 text-3xl opacity-20"
        >
          🏆
        </motion.div>
      </div>
    </motion.div>
  );
}



