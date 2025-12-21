'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Sparkles, Globe, GraduationCap, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES, CEFR_LEVELS } from '@/lib/constants';

interface CommandLandingProps {
  onStartTrial: (scenario: string, language: string, level: string) => void;
}

const ALL_SUGGESTIONS = [
  'business negotiations in Tokyo',
  'ordering at a busy Parisian café',
  'bargaining at a Moroccan market',
  'tech startup pitch meeting',
  'debating politics with friends',
  'asking for a raise professionally',
  'workplace conflict resolution',
  'flirting at a Madrid nightclub',
  'making friends at a university',
  'doctor appointment in Germany',
  'navigating a Korean subway',
  'cultural festival in Mumbai',
  'job interview in finance',
  'apartment hunting in Barcelona',
  'romantic date conversation',
  'tech support troubleshooting',
  'networking at a conference',
  'ordering food delivery by phone',
  'complaining at a hotel',
  'discussing movies with locals',
  'sports bar banter',
  'art gallery discussions',
  'booking travel accommodations',
  'returning items at a store',
  'gym workout small talk',
  'cooking class interactions',
  'wine tasting vocabulary',
  'discussing current events',
  'environmental debate topics',
  'music festival conversations',
];

function getRandomSuggestions(count: number): string[] {
  const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function CommandLanding({ onStartTrial }: CommandLandingProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Spanish');
  const [selectedLevel, setSelectedLevel] = useState<string>('B1');

  useEffect(() => {
    setSuggestions(getRandomSuggestions(8));
    const savedLang = localStorage.getItem('talka-trial-language');
    const savedLevel = localStorage.getItem('talka-trial-level');
    if (savedLang) {
      setSelectedLanguage(savedLang);
    }
    if (savedLevel) {
      setSelectedLevel(savedLevel);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim() && selectedLanguage) {
      localStorage.setItem('talka-trial-language', selectedLanguage);
      localStorage.setItem('talka-trial-level', selectedLevel);
      onStartTrial(searchValue, selectedLanguage, selectedLevel);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedLanguage) {
      localStorage.setItem('talka-trial-language', selectedLanguage);
      localStorage.setItem('talka-trial-level', selectedLevel);
      onStartTrial(suggestion, selectedLanguage, selectedLevel);
    }
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    localStorage.setItem('talka-trial-language', value);
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value);
    localStorage.setItem('talka-trial-level', value);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6 relative">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-6 right-6 flex gap-2"
      >
        <Link href="/dashboard">
          <Button
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-xl font-medium"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Test Dashboard
          </Button>
        </Link>
        <Link href="/auth/login">
          <Button
            variant="outline"
            className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-xl"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center gap-3 mb-6"
          >
            <Sparkles className="h-10 w-10 text-blue-500" />
            <h1 className="text-3xl font-light tracking-tight">Talka</h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/60 text-lg font-light"
          >
            Unlock authentic conversations through immersive language mastery
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="relative mb-2"
          >
            <label className="text-white/80 text-sm font-light mb-3 block">
              What real-world topic or scenario do you want to master?
            </label>
            <div
              className={`relative rounded-2xl bg-white/5 border transition-all duration-300 ${
                isFocused
                  ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                  : 'border-white/10'
              }`}
            >
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="e.g., Ordering coffee in Paris, Negotiating a salary, Handling small talk at a party, Travel emergencies"
                className="w-full bg-transparent border-0 outline-none text-white placeholder:text-white/40 pl-16 pr-6 py-6 text-lg font-light"
              />
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/50 text-xs font-light mb-6"
          >
            We'll generate a story-based flashcard stack tailored to your topic with authentic phrases and context.
          </motion.p>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <label className="text-white/80 text-sm font-light mb-3 block flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Target Language
            </label>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white rounded-xl py-6 font-light focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent className="max-h-64 bg-black/95 border-white/10">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.name} className="text-white hover:bg-white/10">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <label className="text-white/80 text-sm font-light mb-3 block flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Your Level (CEFR)
            </label>
            <Select value={selectedLevel} onValueChange={handleLevelChange}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white rounded-xl py-6 font-light focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10">
                {CEFR_LEVELS.map((level) => (
                  <SelectItem key={level.code} value={level.code} className="text-white hover:bg-white/10">
                    <div className="flex flex-col">
                      <span className="font-semibold">{level.code}</span>
                      <span className="text-xs text-white/60">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mb-4"
        >
          <h3 className="text-white/60 text-sm font-light">
            Can't think of a topic? Try these!
          </h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto"
        >
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.05 }}
            >
              <Button
                onClick={() => handleSuggestionClick(suggestion)}
                variant="outline"
                disabled={!selectedLanguage}
                className="w-full rounded-xl bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-blue-500 transition-all duration-300 px-6 py-4 font-light text-left justify-start disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestion}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
