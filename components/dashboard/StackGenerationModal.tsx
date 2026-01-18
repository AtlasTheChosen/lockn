'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { X, Loader2, Sparkles, MessageSquare, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import { SUPPORTED_LANGUAGES, CEFR_LEVELS } from '@/lib/constants';
import { checkContentAppropriateness } from '@/lib/content-filter';
import { DEBUG } from '@/lib/debug';

const CARD_COUNT_OPTIONS = [10, 25, 50] as const;
type CardCount = typeof CARD_COUNT_OPTIONS[number];

// Source stack data for generating more cards with similar topic
interface SourceStackData {
  scenario: string;
  language: string;
  difficulty: string;
  excludePhrases: string[];
}

interface StackGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  sourceStack?: SourceStackData | null; // Optional: for "Generate More" from existing stack
}

export default function StackGenerationModal({ isOpen, onClose, userId, sourceStack }: StackGenerationModalProps) {
  const [scenario, setScenario] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [selectedDifficulty, setSelectedDifficulty] = useState('B1');
  const [selectedSize, setSelectedSize] = useState<CardCount>(10);
  const [conversationalMode, setConversationalMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  
  // Pre-fill form fields when sourceStack is provided (Generate More feature)
  useEffect(() => {
    if (sourceStack && isOpen) {
      // Pre-fill scenario with existing topic
      setScenario(sourceStack.scenario);
      
      // Find and set language code from name
      const langCode = SUPPORTED_LANGUAGES.find(l => l.name === sourceStack.language)?.code;
      if (langCode) {
        setSelectedLanguage(langCode);
      }
      
      // Set difficulty level
      if (sourceStack.difficulty) {
        setSelectedDifficulty(sourceStack.difficulty);
      }
      
      // Clear any previous errors
      setError('');
      setContentWarning(null);
    }
  }, [sourceStack, isOpen]);
  
  // Reset form when closing (if not from sourceStack)
  useEffect(() => {
    if (!isOpen && !sourceStack) {
      setScenario('');
      setSelectedLanguage('es');
      setSelectedDifficulty('B1');
      setSelectedSize(10);
      setConversationalMode(false);
      setError('');
      setContentWarning(null);
    }
  }, [isOpen, sourceStack]);
  
  // Check if we're generating from an existing stack
  const isGeneratingMore = !!sourceStack;

  const handleScenarioChange = (value: string) => {
    DEBUG.ui('Scenario input changed', { length: value.length });
    setScenario(value);
    setError('');
    if (value.trim()) {
      const contentCheck = checkContentAppropriateness(value);
      DEBUG.ui('Content check', { isAppropriate: contentCheck.isAppropriate });
      if (!contentCheck.isAppropriate) {
        DEBUG.ui('Content warning', { reason: contentCheck.reason });
        setContentWarning(contentCheck.reason || 'This content may be inappropriate for language learning.');
      } else {
        setContentWarning(null);
      }
    } else {
      setContentWarning(null);
    }
  };

  const handleGenerate = async () => {
    const generationStartTime = Date.now();
    DEBUG.generation('=== Stack Generation Started ===', {
      scenario: scenario.trim(),
      language: selectedLanguage,
      difficulty: selectedDifficulty,
      cardCount: selectedSize,
      conversationalMode,
      userId,
    });

    if (!scenario.trim()) {
      DEBUG.generationError('Generation blocked: no scenario');
      setError('Please enter a scenario');
      return;
    }

    const contentCheck = checkContentAppropriateness(scenario);
    if (!contentCheck.isAppropriate) {
      DEBUG.generationError('Generation blocked: inappropriate content', { reason: contentCheck.reason });
      setError(contentCheck.reason || 'This content is not appropriate for language learning.');
      setContentWarning(contentCheck.reason || 'This content may be inappropriate for language learning.');
      return;
    }

    setGenerating(true);
    setError('');

    const targetLanguageName = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name;
    DEBUG.generation('Sending generation request', {
      scenario: scenario.trim(),
      targetLanguage: targetLanguageName,
      stackSize: selectedSize,
      difficulty: selectedDifficulty,
      conversationalMode,
    });

    try {
      const apiStartTime = Date.now();
      const response = await fetch('/api/generate-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenario.trim(),
          targetLanguage: targetLanguageName,
          nativeLanguage: 'English',
          stackSize: selectedSize,
          difficulty: selectedDifficulty,
          conversationalMode,
          // Pass exclude phrases when generating more from existing stack
          excludePhrases: sourceStack?.excludePhrases || [],
        }),
      });

      DEBUG.timing('API request duration', apiStartTime);
      DEBUG.api('API response received', { status: response.status, ok: response.ok });
      console.log('[StackGenModal] API response status:', response.status);

      const data = await response.json();
      console.log('[StackGenModal] API response data:', { 
        hasStackId: !!data.stackId, 
        hasError: !!data.error,
        cardCount: data.cards?.length 
      });

      if (data.error) {
        DEBUG.generationError('Generation failed', { error: data.error });
        console.error('[StackGenModal] ❌ Generation error:', data.error);
        setError(data.error);
        setGenerating(false);
        return;
      }

      if (data.stackId) {
        DEBUG.generation('Generation successful', { stackId: data.stackId, cardCount: data.cards?.length });
        DEBUG.timing('Total generation time', generationStartTime);
        console.log('[StackGenModal] ✅ Stack created:', data.stackId, 'with', data.cards?.length, 'cards');
        router.push(`/stack/${data.stackId}`);
        router.refresh();
      } else {
        DEBUG.generationError('Generation succeeded but no stackId returned', data);
        console.error('[StackGenModal] ⚠️ No stackId in response:', data);
      }
    } catch (err: any) {
      DEBUG.generationError('Generation exception', err);
      setError('Failed to generate stack. Please try again.');
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 pb-4 px-4 sm:px-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[calc(100vh-6rem)] flex flex-col backdrop-blur-xl rounded-3xl shadow-2xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-6 pb-0 relative">
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center gap-3 mb-4">
                {isGeneratingMore ? (
                  <RefreshCw className="h-8 w-8" style={{ color: 'var(--accent-blue)' }} />
                ) : (
                  <Sparkles className="h-8 w-8" style={{ color: 'var(--accent-green)' }} />
                )}
                <h2 className="text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {isGeneratingMore ? 'Generate More Cards' : 'Generate New Stack'}
                </h2>
              </div>
              <p className="font-medium text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {isGeneratingMore 
                  ? `Create more unique cards for "${sourceStack?.scenario}" - ${sourceStack?.excludePhrases?.length || 0} existing cards will be excluded`
                  : 'Create a custom flashcard stack for any scenario'}
              </p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-primary)' }}>
                What real-world topic or scenario do you want to master?
              </label>
                  <Input
                    value={scenario}
                    onChange={(e) => handleScenarioChange(e.target.value)}
                    placeholder="e.g., Ordering coffee in Paris, Negotiating a salary, Handling small talk at a party, Travel emergencies"
                    className="rounded-xl py-6 font-medium focus:ring-1"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  {contentWarning && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-4 rounded-xl mt-3"
                      style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                    >
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-yellow)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--accent-yellow)' }}>{contentWarning}</p>
                    </motion.div>
                  )}
              <p className="text-xs font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
                We'll generate a story-based flashcard stack tailored to your topic with authentic phrases and context.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block" style={{ color: 'var(--text-primary)' }}>Target Language</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    variant="outline"
                    className="rounded-xl font-medium"
                    style={selectedLanguage === lang.code
                      ? { backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)', color: 'white' }
                      : { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                    }
                  >
                    {lang.name}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block" style={{ color: 'var(--text-primary)' }}>Difficulty Level (CEFR)</label>
              <div className="grid grid-cols-3 gap-2">
                {CEFR_LEVELS.map((level) => (
                  <Button
                    key={level.code}
                    onClick={() => setSelectedDifficulty(level.code)}
                    variant="outline"
                    className="rounded-xl font-medium"
                    style={selectedDifficulty === level.code
                      ? { backgroundColor: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: 'white' }
                      : { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                    }
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-bold">{level.code}</span>
                    </div>
                  </Button>
                ))}
              </div>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                {CEFR_LEVELS.find((l) => l.code === selectedDifficulty)?.description}
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <CreditCard className="h-4 w-4" />
                Number of Cards
              </label>
              <div className="grid grid-cols-3 gap-3">
                {CARD_COUNT_OPTIONS.map((count) => (
                  <Card
                    key={count}
                    onClick={() => {
                      setSelectedSize(count);
                      localStorage.setItem('talka-card-count', count.toString());
                      DEBUG.storage('Card count changed in modal', count);
                    }}
                    className="cursor-pointer transition-all"
                    style={selectedSize === count
                      ? { backgroundColor: 'rgba(88, 204, 2, 0.2)', borderColor: 'var(--accent-green)' }
                      : { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }
                    }
                  >
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{count}</p>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {count === 10 ? 'Quick' : count === 25 ? 'Standard' : 'Deep dive'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 mt-0.5" style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <label className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>Conversational Mode</label>
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                    Present cards in sequential order, like a back-and-forth dialogue
                  </p>
                </div>
              </div>
              <Switch
                checked={conversationalMode}
                onCheckedChange={setConversationalMode}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(255, 75, 75, 0.2)', border: '1px solid rgba(255, 75, 75, 0.3)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--accent-red)' }}>{error}</p>
              </motion.div>
            )}

            <Button
                onClick={handleGenerate}
                disabled={generating || !scenario.trim() || !!contentWarning}
                className="w-full text-white rounded-xl py-6 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1"
                style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating your stack...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate {selectedSize} Cards
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
