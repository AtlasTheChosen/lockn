'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import CommandLanding from '@/components/landing/CommandLanding';
import TrialFlow from '@/components/landing/TrialFlowNew';
import ConversionOverlay from '@/components/landing/ConversionOverlay';
import StreakTutorial from '@/components/tutorial/StreakTutorial';
import { AppLayout } from '@/components/layout';
import { Loader2, AlertTriangle, X, HelpCircle } from 'lucide-react';
import { DEBUG } from '@/lib/debug';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { getLocaleDisplayName } from '@/lib/constants';

type AppState = 'command' | 'loading' | 'trial' | 'conversion' | 'error';

interface CharacterBreakdownItem {
  character: string;
  romanization: string;
  name?: string;
}

interface Card {
  targetPhrase: string;
  nativeTranslation: string;
  exampleSentence: string;
  toneAdvice: string;
  romanization?: string;
  characterBreakdown?: CharacterBreakdownItem[];
}

interface ErrorInfo {
  title: string;
  message: string;
  isInappropriate?: boolean;
}

export default function LandingPage() {
  const [appState, setAppState] = useState<AppState>('command');
  const [selectedScenario, setSelectedScenario] = useState('');
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [showStreakTutorial, setShowStreakTutorial] = useState(false);
  const router = useRouter();
  const { locale } = useLocale();
  const nativeLanguage = getLocaleDisplayName(locale);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    // Listen for streak tutorial request from CommandLanding
    const handleShowTutorial = () => setShowStreakTutorial(true);
    window.addEventListener('show-streak-tutorial', handleShowTutorial);
    return () => window.removeEventListener('show-streak-tutorial', handleShowTutorial);
  }, []);

  const handleStartTrial = async (scenario: string, language: string, level: string, cardCount?: number, scriptPreference?: string) => {
    setSelectedScenario(scenario);
    setAppState('loading');

    try {
      if (isLoggedIn) {
        const response = await fetch('/api/generate-stack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario,
            targetLanguage: language,
            nativeLanguage,
            stackSize: cardCount || 10,
            difficulty: level,
            scriptPreference,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 400 && data.error?.includes('inappropriate')) {
            setErrorInfo({
              title: 'Inappropriate Content',
              message: 'Please enter a different topic for language learning.',
              isInappropriate: true,
            });
          } else if (data.error?.includes('parse') || data.error?.includes('JSON')) {
            // Parse errors are usually API issues, not content issues
            setErrorInfo({
              title: 'Generation Failed',
              message: 'The AI response could not be processed. Please try again with a different topic.',
              isInappropriate: false,
            });
          } else {
            setErrorInfo({
              title: 'Generation Failed',
              message: data.error || 'Failed to generate cards. Please try again.',
            });
          }
          setAppState('error');
          return; // Don't throw - let the error state be displayed
        }
        
        router.push(`/stack/${data.stackId}`);
        return;
      }

      // Guest user - always use 5 cards
      const response = await fetch('/api/generate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          targetLanguage: language,
          nativeLanguage,
          stackSize: cardCount || 5,
          difficulty: level,
          scriptPreference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          setErrorInfo({
            title: 'API Not Configured',
            message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.',
          });
        } else if (response.status === 400 && data.error?.includes('inappropriate')) {
          setErrorInfo({
            title: 'Inappropriate Content',
            message: 'Please enter a different topic for language learning.',
            isInappropriate: true,
          });
        } else if (data.error?.includes('parse') || data.error?.includes('JSON')) {
          setErrorInfo({
            title: 'Inappropriate Content',
            message: 'Please enter a different topic for language learning.',
            isInappropriate: true,
          });
        } else {
          setErrorInfo({
            title: 'Generation Failed',
            message: data.error || 'Failed to generate cards. Please try again.',
          });
        }
        setAppState('error');
        throw new Error(data.error || 'Failed to generate cards');
      }

      const formattedCards = data.cards.map((card: any) => ({
        targetPhrase: card.target_phrase,
        nativeTranslation: card.native_translation,
        exampleSentence: card.example_sentence,
        toneAdvice: card.tone_advice,
        romanization: card.romanization,
        characterBreakdown: card.character_breakdown,
      }));
      
      // Save trial data to localStorage for migration to Supabase on signup
      localStorage.setItem('lockn-trial-cards', JSON.stringify(formattedCards));
      localStorage.setItem('lockn-trial-scenario', scenario);
      localStorage.setItem('lockn-trial-native-language', nativeLanguage);
      // Clear any previous ratings when starting fresh
      localStorage.removeItem('lockn-trial-ratings');
      
      setGeneratedCards(formattedCards);
      setAppState('trial');
    } catch (error: any) {
      // Only reset to command if we're not already showing an error
      // Use a timeout to ensure state has updated
      setTimeout(() => {
        if (appState !== 'error' && !errorInfo) {
          setAppState('command');
        }
      }, 0);
      
      // If we don't have error info set, set a generic error
      if (!errorInfo) {
        setErrorInfo({
          title: 'Generation Failed',
          message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        });
        setAppState('error');
      }
    }
  };

  const handleDismissError = () => {
    setErrorInfo(null);
    setAppState('command');
  };

  const handleCompleteTrialFlow = () => {
    setAppState('conversion');
  };

  const handleCloseConversion = () => {
    setAppState('trial');
  };

  const handleGoHome = () => {
    setAppState('command');
    setGeneratedCards([]);
    setSelectedScenario('');
  };

  return (
    <AppLayout hideNav={appState === 'conversion' || appState === 'trial'}>
      {/* Streak Tutorial */}
      {showStreakTutorial && (
        <StreakTutorial 
          onComplete={() => setShowStreakTutorial(false)}
          onSkip={() => setShowStreakTutorial(false)}
        />
      )}


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
            <div 
              className="rounded-3xl p-12 text-center"
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)'
              }}
            >
              <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6" style={{ color: '#58cc02' }} />
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Creating your cards...</p>
              <p className="text-base font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>{selectedScenario}</p>
            </div>
          </motion.div>
        )}

        {appState === 'error' && errorInfo && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md"
            >
              <div 
                className="relative rounded-3xl border-2 p-8"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: errorInfo.isInappropriate ? '#ff4b4b' : '#ff9600',
                }}
              >
                <button
                  onClick={handleDismissError}
                  className="absolute top-4 right-4 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="flex items-start gap-4">
                  <div 
                    className="p-4 rounded-2xl"
                    style={{
                      backgroundColor: errorInfo.isInappropriate 
                        ? 'rgba(255, 75, 75, 0.15)' 
                        : 'rgba(255, 150, 0, 0.15)'
                    }}
                  >
                    <AlertTriangle 
                      className="h-8 w-8"
                      style={{ color: errorInfo.isInappropriate ? '#ff4b4b' : '#ff9600' }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 
                      className="font-display text-xl font-semibold mb-2"
                      style={{ color: errorInfo.isInappropriate ? '#ff4b4b' : '#ff9600' }}
                    >
                      {errorInfo.title}
                    </h3>
                    <p className="font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>
                      {errorInfo.message}
                    </p>
                    <Button
                      onClick={handleDismissError}
                      className="w-full rounded-2xl py-4 font-bold text-white shadow-[0_4px_0_0_rgba(0,0,0,0.2)] hover:brightness-105"
                      style={{
                        background: errorInfo.isInappropriate
                          ? 'linear-gradient(135deg, #ff4b4b, #e04444)'
                          : 'linear-gradient(135deg, #ff9600, #ffaa00)'
                      }}
                    >
                      Try a Different Topic ✨
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
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
              onBack={handleGoHome}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'conversion' && (
          <ConversionOverlay scenario={selectedScenario} onClose={handleCloseConversion} onGoHome={handleGoHome} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
