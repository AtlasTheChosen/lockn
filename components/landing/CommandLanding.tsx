'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES, CEFR_LEVELS, LANGUAGE_SCRIPTS, hasScriptOptions, getDefaultScript, getFlagUrl } from '@/lib/constants';
import { checkContentAppropriateness } from '@/lib/content-filter';
import { createClient } from '@/lib/supabase/client';
import AuthModal from '@/components/auth/AuthModal';
import PremiumModal from '@/components/dashboard/PremiumModal';
import { useTranslation } from '@/contexts/LocaleContext';

interface CommandLandingProps {
  onStartTrial: (scenario: string, language: string, level: string, cardCount?: number, scriptPreference?: string) => void;
}

const ALL_CARD_COUNT_OPTIONS = [5, 10, 25, 50] as const;
type CardCount = typeof ALL_CARD_COUNT_OPTIONS[number];

const SUGGESTIONS: { key: string; emoji: string; scenarioText: string }[] = [
  { key: 'landing.suggestionPizza', emoji: '🍕', scenarioText: 'ordering pizza in Rome' },
  { key: 'landing.suggestionInterview', emoji: '💼', scenarioText: 'job interview small talk' },
  { key: 'landing.suggestionGym', emoji: '🏋️', scenarioText: 'gym conversation starters' },
  { key: 'landing.suggestionParty', emoji: '🎉', scenarioText: 'planning a birthday party' },
  { key: 'landing.suggestionHotel', emoji: '✈️', scenarioText: 'checking into a hotel' },
  { key: 'landing.suggestionCompliment', emoji: '💃', scenarioText: 'complimenting someone' },
  { key: 'landing.suggestionTaxi', emoji: '🚕', scenarioText: 'talking to a taxi driver' },
  { key: 'landing.suggestionCoffee', emoji: '☕', scenarioText: 'making coffee shop orders' },
];

export default function CommandLanding({ onStartTrial }: CommandLandingProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Spanish');
  const [selectedLevel, setSelectedLevel] = useState<string>('B2');
  const [selectedCardCount, setSelectedCardCount] = useState<CardCount>(5);
  const [scriptPreference, setScriptPreference] = useState<string | null>(null);
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Check if current language has script options
  const showScriptSelector = hasScriptOptions(selectedLanguage);
  const scriptOptions = LANGUAGE_SCRIPTS[selectedLanguage] || [];

  useEffect(() => {
    const savedLang = localStorage.getItem('lockn-trial-language');
    const savedLevel = localStorage.getItem('lockn-trial-level');
    const savedCardCount = localStorage.getItem('lockn-card-count');
    
    if (savedLang) setSelectedLanguage(savedLang);
    if (savedLevel) setSelectedLevel(savedLevel);
    
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const loggedIn = !!session;
      setIsLoggedIn(loggedIn);
      
      if (session?.user) {
        // Fetch premium status
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_premium')
            .eq('id', session.user.id)
            .single();
          setIsPremium(profile?.is_premium || false);
        } catch (error) {
          console.error('Error fetching premium status:', error);
          setIsPremium(false);
        }
      }
      
      // Set card count based on login status
      // Logged-out users always get 5 cards
      if (!loggedIn) {
        setSelectedCardCount(5);
      } else if (savedCardCount) {
        const count = parseInt(savedCardCount, 10);
        if (ALL_CARD_COUNT_OPTIONS.includes(count as CardCount)) {
          setSelectedCardCount(count as CardCount);
        } else {
          setSelectedCardCount(5);
        }
      } else {
        setSelectedCardCount(5);
      }
    };
    checkAuth();
  }, []);
  
  // Update script preference when language changes
  useEffect(() => {
    if (hasScriptOptions(selectedLanguage)) {
      const defaultScript = getDefaultScript(selectedLanguage);
      setScriptPreference(defaultScript);
    } else {
      setScriptPreference(null);
    }
  }, [selectedLanguage]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      const contentCheck = checkContentAppropriateness(value);
      if (!contentCheck.isAppropriate) {
        setContentWarning(t('landing.contentWarning'));
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
      if (scriptPreference) {
        localStorage.setItem('lockn-script-preference', scriptPreference);
      }
      
      // For logged-out users, ALWAYS use 5 cards regardless of selectedCardCount
      const cardCountToUse = isLoggedIn ? selectedCardCount : 5;
      if (isLoggedIn) {
        localStorage.setItem('lockn-card-count', selectedCardCount.toString());
      }
      console.log('[CommandLanding] handleSubmit:', { isLoggedIn, selectedCardCount, cardCountToUse });
      onStartTrial(searchValue, selectedLanguage, selectedLevel, cardCountToUse, scriptPreference || undefined);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedLanguage) {
      localStorage.setItem('lockn-trial-language', selectedLanguage);
      localStorage.setItem('lockn-trial-level', selectedLevel);
      if (scriptPreference) {
        localStorage.setItem('lockn-script-preference', scriptPreference);
      }
      
      // For logged-out users, ALWAYS use 5 cards regardless of selectedCardCount
      const cardCountToUse = isLoggedIn ? selectedCardCount : 5;
      if (isLoggedIn) {
        localStorage.setItem('lockn-card-count', cardCountToUse.toString());
      }
      console.log('[CommandLanding] handleSuggestionClick:', { isLoggedIn, selectedCardCount, cardCountToUse, suggestion });
      onStartTrial(suggestion, selectedLanguage, selectedLevel, cardCountToUse, scriptPreference || undefined);
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


  // Returns a flag image element for the language
  const FlagImage = ({ name, size = 20 }: { name: string; size?: number }) => (
    <img 
      src={getFlagUrl(name, size)} 
      alt={`${name} flag`}
      className="inline-block rounded-sm"
      style={{ width: size, height: Math.round(size * 0.75) }}
    />
  );

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* TopNav in AppLayout handles all navigation - no duplicate header needed */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-16 relative">
        {/* Sign In - only for logged out users on mobile */}
        {!isLoggedIn && (
          <div className="md:hidden absolute top-2 left-1/2 transform -translate-x-1/2 z-50">
            <button
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="text-sm font-normal transition-all active:opacity-70"
                style={{ color: 'var(--text-muted)' }}
            >
              {t('nav.signIn')}
            </button>
          </div>
        )}
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-6 sm:mb-8 pt-4 md:pt-0"
          >
            <p className="text-base sm:text-lg mb-3 sm:mb-4 font-medium animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
              {t('landing.welcome')}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight gradient-text-warm animate-fade-in stagger-1 mb-5 sm:mb-6 md:mb-8 pb-2 md:pb-4">
              {t('landing.heading')}
            </h1>
            <div className="flex justify-center mb-4 sm:mb-6">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-streak-tutorial'));
                }}
                className="px-4 py-2 rounded-full font-medium text-sm sm:text-base transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                style={{ 
                  background: 'linear-gradient(135deg, #ff9600 0%, #ffaa00 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255, 150, 0, 0.3)'
                }}
              >
                {t('landing.learnHow')}
              </button>
            </div>
          </motion.div>

        {/* Create Stack Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-3xl p-6 md:p-8 mb-8 animate-fade-in stagger-2 relative z-10"
          style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}
        >
          <h3 className="font-display text-2xl font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            ✨ {t('landing.createStack')}
          </h3>
          
          <div>
            {/* Search Input */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
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
                  placeholder={t('landing.placeholderExample')}
                  className="w-full rounded-2xl pl-12 pr-4 py-4 h-14 sm:h-auto text-base sm:text-lg font-medium focus:outline-none transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '2px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!searchValue.trim() || !selectedLanguage}
                className={`w-full sm:w-auto font-bold rounded-2xl px-8 py-4 min-h-[56px] hover:-translate-y-0.5 transition-all disabled:cursor-not-allowed disabled:hover:translate-y-0 active:scale-[0.98] touch-manipulation text-white ${searchValue.trim() && selectedLanguage ? 'magic-button-create' : ''}`}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden' as const,
                  ...(searchValue.trim() && selectedLanguage ? {} : {
                    backgroundColor: 'var(--accent-green)',
                    boxShadow: '0 4px 0 var(--accent-green-dark)',
                  }),
                }}
              >
                {t('landing.createMagic')}
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
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6`}>
              {/* Language Selector */}
              <div>
                <label className="block text-sm font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
                  🌍 {t('landing.labelLanguage')}
                </label>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full rounded-2xl h-14 py-3 sm:py-4 font-semibold focus:ring-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <span className="flex items-center gap-2">
                      <FlagImage name={selectedLanguage} size={20} />
                      <span>{t(`languages.${SUPPORTED_LANGUAGES.find(l => l.name === selectedLanguage)?.code ?? 'en'}`)}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-[50vh]" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)' }}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.name} className="rounded-xl font-medium py-3">
                        <span className="flex items-center gap-2">
                          <FlagImage name={lang.name} size={20} />
                          <span>{t(`languages.${lang.code}`)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level Selector */}
              <div>
                <label className="block text-sm font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
                  📊 {t('landing.labelLevel')}
                </label>
                <Select value={selectedLevel} onValueChange={handleLevelChange}>
                  <SelectTrigger className="w-full rounded-2xl h-14 py-3 sm:py-4 font-semibold focus:ring-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <SelectValue>
                      {t(`landing.level${selectedLevel}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-[50vh]" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)' }}>
                    {CEFR_LEVELS.map((level) => (
                      <SelectItem key={level.code} value={level.code} className="rounded-xl font-medium py-3">
                        {t(`landing.level${level.code}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Card Count - show for all users, but only 5 for logged-out users */}
              <div>
                <label className="block text-sm font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
                  🎴 {t('landing.labelCards')} {(!isLoggedIn || !isPremium) && <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{t('landing.cardsMax')}</span>}
                </label>
                <div className="flex gap-2">
                  {(isLoggedIn && isPremium ? ALL_CARD_COUNT_OPTIONS : [5 as CardCount]).map((count) => (
                    <Button
                      key={count}
                      type="button"
                      data-card-count={count}
                      onClick={() => {
                        if (!isLoggedIn) {
                          // Logged-out users can only use 5 cards
                          setSelectedCardCount(5);
                          return;
                        }
                        if (!isPremium && count !== 5) {
                          setShowPremiumModal(true);
                          return;
                        }
                        handleCardCountChange(count);
                      }}
                      className="flex-1 rounded-xl h-14 py-3 sm:py-4 font-semibold transition-all active:scale-95"
                      style={selectedCardCount === count
                        ? { backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }
                        : { backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-secondary)' }
                      }
                    >
                      {count}
                    </Button>
                  ))}
                </div>
                {!isLoggedIn && (
                  <div className="mt-3 flex flex-col items-center justify-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>
                      {t('landing.signUpForMoreCards')}
                    </p>
                  </div>
                )}
                {isLoggedIn && !isPremium && (
                  <div className="mt-3 flex flex-col items-center justify-center gap-2">
                    <Button
                      onClick={() => setShowPremiumModal(true)}
                      className="w-full font-bold rounded-xl px-4 py-2 text-sm"
                      style={{ 
                        backgroundColor: 'var(--accent-green)', 
                        color: 'white',
                        boxShadow: '0 3px 0 var(--accent-green-dark)'
                      }}
                    >
                      {t('landing.upgradeToPremium')}
                    </Button>
                    <p className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>
                      {t('landing.unlockCards')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Script/Alphabet Selector - shown only for languages with multiple writing systems */}
            {showScriptSelector && scriptOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <label className="block text-sm font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
                  ✍️ {t('landing.writingSystemFor')} {selectedLanguage}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {scriptOptions.map((script) => (
                    <Button
                      key={script.id}
                      type="button"
                      onClick={() => setScriptPreference(script.id)}
                      className="rounded-xl h-auto py-3 font-semibold transition-all active:scale-95"
                      style={scriptPreference === script.id
                        ? { backgroundColor: 'var(--accent-blue)', color: 'white', boxShadow: '0 3px 0 var(--accent-blue-dark, #1899d6)' }
                        : { backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-secondary)' }
                      }
                    >
                      <div className="flex flex-col items-center text-center">
                        <span className="font-bold text-sm">{script.name}</span>
                        <span className="text-xs opacity-80">{script.description}</span>
                      </div>
                    </Button>
                  ))}
                </div>
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                  {t('landing.romanizationHint')}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="animate-fade-in stagger-3"
        >
          <p className="text-center font-semibold mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            🎲 {t('landing.needInspiration')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {SUGGESTIONS.map((suggestion, index) => (
              <motion.div
                key={suggestion.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selectedLanguage) {
                      handleSuggestionClick(suggestion.scenarioText);
                    }
                  }}
                  disabled={!selectedLanguage}
                  className="w-full p-3 sm:p-5 rounded-2xl text-center font-semibold text-sm sm:text-base hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 active:scale-95"
                  style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '2px solid var(--border-color)', 
                    color: 'var(--text-primary)' 
                  }}
                >
                  <span className="block text-xl sm:text-2xl mb-1">{suggestion.emoji}</span>
                  <span className="block leading-tight">{t(suggestion.key)}</span>
                </button>
              </motion.div>
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
      
      {/* Premium Modal */}
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
}
