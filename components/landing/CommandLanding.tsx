'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Globe, GraduationCap, CreditCard, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES, CEFR_LEVELS } from '@/lib/constants';
import { checkContentAppropriateness } from '@/lib/content-filter';
import { DEBUG } from '@/lib/debug';
import { createClient } from '@/lib/supabase/client';
import AuthModal from '@/components/auth/AuthModal';
import Logo from '@/components/ui/Logo';

interface CommandLandingProps {
  onStartTrial: (scenario: string, language: string, level: string, cardCount?: number) => void;
}

const CARD_COUNT_OPTIONS = [10, 25, 50] as const;
type CardCount = typeof CARD_COUNT_OPTIONS[number];

const SUGGESTIONS = [
  { text: 'ordering pizza in Rome', emoji: '🍕' },
  { text: 'job interview small talk', emoji: '💼' },
  { text: 'gym conversation starters', emoji: '🏋️' },
  { text: 'planning a birthday party', emoji: '🎉' },
  { text: 'checking into a hotel', emoji: '✈️' },
  { text: 'complimenting someone', emoji: '💃' },
  { text: 'talking to a taxi driver', emoji: '🚕' },
  { text: 'making coffee shop orders', emoji: '☕' },
];

export default function CommandLanding({ onStartTrial }: CommandLandingProps) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Spanish');
  const [selectedLevel, setSelectedLevel] = useState<string>('B2');
  const [selectedCardCount, setSelectedCardCount] = useState<CardCount>(10);
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');

  useEffect(() => {
    const savedLang = localStorage.getItem('lockn-trial-language');
    const savedLevel = localStorage.getItem('lockn-trial-level');
    const savedCardCount = localStorage.getItem('lockn-card-count');
    
    if (savedLang) setSelectedLanguage(savedLang);
    if (savedLevel) setSelectedLevel(savedLevel);
    if (savedCardCount) {
      const count = parseInt(savedCardCount, 10);
      if (CARD_COUNT_OPTIONS.includes(count as CardCount)) {
        setSelectedCardCount(count as CardCount);
      }
    }

    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      const contentCheck = checkContentAppropriateness(value);
      if (!contentCheck.isAppropriate) {
        setContentWarning('This content may contain inappropriate language.');
      } else {
        setContentWarning(null);
      }
    } else {
      setContentWarning(null);
    }
  };

  const handleSubmit = () => {
    if (searchValue.trim() && selectedLanguage) {
      setContentWarning(null);
      localStorage.setItem('lockn-trial-language', selectedLanguage);
      localStorage.setItem('lockn-trial-level', selectedLevel);
      
      if (isLoggedIn) {
        localStorage.setItem('lockn-card-count', selectedCardCount.toString());
        onStartTrial(searchValue, selectedLanguage, selectedLevel, selectedCardCount);
      } else {
        onStartTrial(searchValue, selectedLanguage, selectedLevel, 3);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedLanguage) {
      localStorage.setItem('lockn-trial-language', selectedLanguage);
      localStorage.setItem('lockn-trial-level', selectedLevel);
      
      if (isLoggedIn) {
        localStorage.setItem('lockn-card-count', selectedCardCount.toString());
        onStartTrial(suggestion, selectedLanguage, selectedLevel, selectedCardCount);
      } else {
        onStartTrial(suggestion, selectedLanguage, selectedLevel, 3);
      }
    }
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    localStorage.setItem('lockn-trial-language', value);
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value);
    localStorage.setItem('lockn-trial-level', value);
  };

  const handleCardCountChange = (count: CardCount) => {
    setSelectedCardCount(count);
    localStorage.setItem('lockn-card-count', count.toString());
  };

  const getLanguageEmoji = (name: string) => {
    const emojiMap: Record<string, string> = {
      Spanish: '🇪🇸', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
      Japanese: '🇯🇵', Korean: '🇰🇷', Mandarin: '🇨🇳', Portuguese: '🇧🇷',
      Russian: '🇷🇺', Arabic: '🇸🇦', Hindi: '🇮🇳', Dutch: '🇳🇱',
    };
    return emojiMap[name] || '🌍';
  };

  return (
    <div className="min-h-screen relative">
      {/* Guest Header - Only on mobile (TopNav handles desktop) */}
      {!isLoggedIn && (
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white px-4 sm:px-6 py-4 shadow-talka-sm sticky top-0 z-40 flex justify-between items-center"
        >
          <Link href="/" className="flex items-center gap-2">
            <Logo size="md" className="sm:w-12 sm:h-12" />
            <span className="font-display text-2xl sm:text-3xl font-semibold gradient-text">
              LOCKN
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              onClick={() => {
                setAuthModalMode('login');
                setShowAuthModal(true);
              }}
              className="text-slate-600 font-semibold hover:text-talka-purple hover:bg-talka-purple/10 rounded-2xl px-3 sm:px-6 text-sm sm:text-base"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => {
                setAuthModalMode('signup');
                setShowAuthModal(true);
              }}
              className="bg-gradient-purple-pink text-white font-bold rounded-2xl px-4 sm:px-6 text-sm sm:text-base shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span className="hidden sm:inline">Get Started ✨</span>
              <span className="sm:hidden">Start ✨</span>
            </Button>
          </div>
        </motion.nav>
      )}

      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-6 sm:mb-8"
          >
            <p className="text-base sm:text-lg text-slate-500 mb-3 sm:mb-4 font-medium animate-fade-in">
              Hey there, language champion!
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight mb-4 sm:mb-6 gradient-text-warm animate-fade-in stagger-1">
              What do you want to talk about today?
            </h1>
          </motion.div>

        {/* Create Stack Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white rounded-3xl p-6 md:p-8 shadow-talka-md mb-8 animate-fade-in stagger-2 relative z-10"
        >
          <h3 className="font-display text-2xl font-semibold mb-6 flex items-center gap-2">
            ✨ Create Your Learning Stack
          </h3>
          
          <div>
            {/* Search Input */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchValue.trim() && selectedLanguage) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Try: 'ordering tapas in Barcelona'..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-4 h-14 sm:h-auto text-base sm:text-lg text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-talka-purple focus:bg-white focus:shadow-[0_0_0_4px_rgba(167,139,250,0.15)] transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!searchValue.trim() || !selectedLanguage}
                className="w-full sm:w-auto bg-gradient-green-cyan text-white font-bold rounded-2xl px-8 py-4 min-h-[56px] shadow-green hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-green active:scale-[0.98]"
              >
                Create Magic! 🎨
              </button>
            </div>

            {/* Content Warning */}
            {contentWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl mb-6"
              >
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700 text-sm font-medium">{contentWarning}</p>
              </motion.div>
            )}

            {/* Selectors Grid */}
            <div className={`grid grid-cols-1 ${isLoggedIn ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 sm:gap-6`}>
              {/* Language Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2 sm:mb-3">
                  🌍 Language
                </label>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 py-3 sm:py-4 font-semibold focus:border-talka-purple focus:ring-0 text-slate-800">
                    <SelectValue>
                      {selectedLanguage} {getLanguageEmoji(selectedLanguage)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-slate-200 rounded-2xl max-h-[50vh]">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.name} className="rounded-xl font-medium py-3">
                        {lang.name} {getLanguageEmoji(lang.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2 sm:mb-3">
                  📊 Level
                </label>
                <Select value={selectedLevel} onValueChange={handleLevelChange}>
                  <SelectTrigger className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl h-14 py-3 sm:py-4 font-semibold focus:border-talka-purple focus:ring-0 text-slate-800">
                    <SelectValue>
                      {selectedLevel} - {CEFR_LEVELS.find(l => l.code === selectedLevel)?.description}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-slate-200 rounded-2xl max-h-[50vh]">
                    {CEFR_LEVELS.map((level) => (
                      <SelectItem key={level.code} value={level.code} className="rounded-xl font-medium py-3">
                        {level.code} - {level.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Card Count - only for logged-in users */}
              {isLoggedIn && (
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2 sm:mb-3">
                    🎴 Cards
                  </label>
                  <div className="flex gap-2">
                    {CARD_COUNT_OPTIONS.map((count) => (
                      <Button
                        key={count}
                        type="button"
                        onClick={() => handleCardCountChange(count)}
                        className={`flex-1 rounded-xl h-14 py-3 sm:py-4 font-semibold transition-all active:scale-95 ${
                          selectedCardCount === count
                            ? 'bg-gradient-purple-pink text-white shadow-purple'
                            : 'bg-slate-50 border-2 border-slate-200 text-slate-600 hover:border-talka-purple hover:bg-white'
                        }`}
                      >
                        {count}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="animate-fade-in stagger-3"
        >
          <p className="text-center text-slate-500 font-semibold mb-4 sm:mb-6 text-sm sm:text-base">
            🎲 Need inspiration? Try one of these!
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {SUGGESTIONS.map((suggestion, index) => (
              <motion.button
                key={suggestion.text}
                onClick={() => handleSuggestionClick(suggestion.text)}
                disabled={!selectedLanguage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="p-3 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl text-center font-semibold text-slate-700 text-sm sm:text-base hover:border-talka-pink hover:-translate-y-1 hover:shadow-talka-md hover:text-talka-pink transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-95"
              >
                <span className="block text-xl sm:text-2xl mb-1">{suggestion.emoji}</span>
                <span className="block leading-tight">{suggestion.text}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
        </div>
      </div>

      {/* Auth Modal - placed at the end to ensure proper z-index layering */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        initialMode={authModalMode}
      />
    </div>
  );
}
