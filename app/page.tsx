'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CommandLanding from '@/components/landing/CommandLanding';
import TrialFlow from '@/components/landing/TrialFlowNew';
import ConversionOverlay from '@/components/landing/ConversionOverlay';
import { Loader2 } from 'lucide-react';

type AppState = 'command' | 'loading' | 'trial' | 'conversion';

interface Card {
  targetPhrase: string;
  nativeTranslation: string;
  exampleSentence: string;
  toneAdvice: string;
}

export default function LandingPage() {
  const [appState, setAppState] = useState<AppState>('command');
  const [selectedScenario, setSelectedScenario] = useState('');
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);

  const handleStartTrial = async (scenario: string, language: string, level: string) => {
    setSelectedScenario(scenario);
    setAppState('loading');

    try {
      const response = await fetch('/api/generate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          targetLanguage: language,
          nativeLanguage: 'English',
          stackSize: 3,
          difficulty: level,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          alert('OpenAI API key not configured.\n\nTo generate custom content based on your selected topic, please add your OpenAI API key to the .env file:\n\nOPENAI_API_KEY=your-key-here\n\nGet your API key at: https://platform.openai.com/api-keys');
        } else {
          alert(data.error || 'Failed to generate cards. Please try again.');
        }
        throw new Error(data.error || 'Failed to generate cards');
      }

      const formattedCards = data.cards.map((card: any) => ({
        targetPhrase: card.target_phrase,
        nativeTranslation: card.native_translation,
        exampleSentence: card.example_sentence,
        toneAdvice: card.tone_advice,
      }));

      setGeneratedCards(formattedCards);
      setAppState('trial');
    } catch (error) {
      console.error('Error generating trial cards:', error);
      setAppState('command');
    }
  };

  const handleCompleteTrialFlow = () => {
    setAppState('conversion');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {appState === 'command' && (
          <motion.div
            key="command"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <CommandLanding onStartTrial={handleStartTrial} />
          </motion.div>
        )}

        {appState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col items-center justify-center"
          >
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-white/60 text-lg font-light">Generating your cards...</p>
            <p className="text-white/40 text-sm font-light mt-2">{selectedScenario}</p>
          </motion.div>
        )}

        {appState === 'trial' && generatedCards.length > 0 && (
          <motion.div
            key="trial"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <TrialFlow
              scenario={selectedScenario}
              cards={generatedCards}
              onComplete={handleCompleteTrialFlow}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'conversion' && (
          <ConversionOverlay scenario={selectedScenario} />
        )}
      </AnimatePresence>
    </div>
  );
}
