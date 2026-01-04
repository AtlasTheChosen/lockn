'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, X, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WordTranslation {
  word: string;
  translation: string;
  alternatives?: string[];
  conjugation?: string;
}

interface WordHoverTextProps {
  text: string;
  translations?: WordTranslation[];
  className?: string;
  onWordSpeak?: (word: string) => void;
  language?: string;
}

// Mobile word popup component
function MobileWordPopup({ 
  word, 
  translation, 
  onSpeak, 
  onClose,
  position 
}: { 
  word: string;
  translation: WordTranslation;
  onSpeak: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Small delay to prevent immediate close from the same tap
    const timer = setTimeout(() => {
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Calculate position to keep popup on screen
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(Math.max(position.x - 100, 10), window.innerWidth - 220),
    top: Math.max(position.y - 120, 10),
    zIndex: 9999,
  };

  return (
    <div 
      ref={popupRef}
      style={popupStyle}
      className="bg-slate-800 border border-slate-600 text-white rounded-2xl shadow-2xl p-4 min-w-[200px] max-w-[280px] animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-700 transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
      
      {/* Word */}
      <p className="text-lg font-bold text-white mb-1">{word}</p>
      
      {/* Translation */}
      <p className="text-xl font-bold text-talka-cyan mb-3">{translation.translation}</p>
      
      {/* Play button - prominent for mobile */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak();
        }}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-talka-purple to-talka-pink text-white font-semibold rounded-xl active:scale-95 transition-transform"
      >
        <Volume2 className="w-5 h-5" />
        <span>Play Audio</span>
        <RotateCcw className="w-4 h-4 opacity-60" />
      </button>
      
      {/* Additional info */}
      {translation.conjugation && (
        <div className="text-xs text-green-400 mt-3 pt-3 border-t border-slate-600">
          <p className="font-semibold">Verb Form:</p>
          <p>{translation.conjugation}</p>
        </div>
      )}
      {translation.alternatives && translation.alternatives.length > 0 && (
        <div className="text-xs text-slate-300 space-y-0.5 mt-3 pt-3 border-t border-slate-600">
          <p className="font-semibold text-slate-400 mb-1">Also means:</p>
          {translation.alternatives.map((alt, i) => (
            <p key={i}>• {alt}</p>
          ))}
        </div>
      )}
      
      <p className="text-[10px] text-slate-500 mt-3 text-center">Tap outside to close • Audio is cached</p>
    </div>
  );
}

export function WordHoverText({ text, translations = [], className = '', onWordSpeak, language }: WordHoverTextProps) {
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [mobilePopup, setMobilePopup] = useState<{
    word: string;
    translation: WordTranslation;
    position: { x: number; y: number };
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const words = text.split(/(\s+|[.,!?;:])/g).filter(w => w.trim().length > 0 || /\s/.test(w));

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getTranslation = (word: string): WordTranslation | null => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
    return translations.find(t => t.word.toLowerCase() === cleanWord) || null;
  };

  const handleSpeak = (word: string) => {
    if (onWordSpeak) {
      setSpeakingWord(word);
      onWordSpeak(word);
      setTimeout(() => setSpeakingWord(null), 1000);
    }
  };

  const handleWordClick = (word: string, trans: WordTranslation | null, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    
    // Get position for popup
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top,
    };
    
    if (isMobile && trans) {
      // On mobile with translation: show popup
      setMobilePopup({ word: cleanWord, translation: trans, position });
    } else {
      // Desktop or no translation: just speak
      handleSpeak(cleanWord);
    }
  };

  return (
    <>
      {/* Mobile popup portal */}
      {mobilePopup && (
        <MobileWordPopup
          word={mobilePopup.word}
          translation={mobilePopup.translation}
          onSpeak={() => handleSpeak(mobilePopup.word)}
          onClose={() => setMobilePopup(null)}
          position={mobilePopup.position}
        />
      )}
      
      <TooltipProvider delayDuration={200}>
        <span className={className}>
          {words.map((segment, index) => {
            if (/^\s+$/.test(segment)) {
              return <span key={index}>{segment}</span>;
            }

            const trans = getTranslation(segment);
            const isSpeaking = speakingWord === segment.replace(/[.,!?;:]/g, '');
            const cleanSegment = segment.replace(/[.,!?;:]/g, '');

            if (!trans) {
              // Non-translated words: click to hear
              return (
                <span 
                  key={index} 
                  className={`inherit ${onWordSpeak ? 'cursor-pointer hover:text-talka-purple/70 active:text-talka-purple transition-colors' : ''} ${isSpeaking ? 'text-talka-purple scale-110' : ''}`}
                  onClick={(e) => cleanSegment && handleWordClick(cleanSegment, null, e)}
                  onTouchEnd={(e) => cleanSegment && handleWordClick(cleanSegment, null, e)}
                >
                  {segment}
                </span>
              );
            }

            // Words with translations
            if (isMobile) {
              // Mobile: tap to show popup
              return (
                <span
                  key={index}
                  className={`cursor-pointer active:text-talka-purple transition-all underline decoration-dotted decoration-talka-purple/40 underline-offset-2 ${isSpeaking ? 'text-talka-purple scale-110 decoration-solid' : ''}`}
                  onClick={(e) => handleWordClick(segment, trans, e)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleWordClick(segment, trans, e);
                  }}
                >
                  {segment}
                </span>
              );
            }

            // Desktop: hover tooltip
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <span 
                    className={`cursor-pointer hover:text-talka-purple transition-all underline decoration-dotted decoration-talka-purple/40 underline-offset-2 ${isSpeaking ? 'text-talka-purple scale-110 decoration-solid' : ''}`}
                    onClick={(e) => handleWordClick(trans.word, trans, e)}
                  >
                    {segment}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs bg-slate-800 border-slate-700 text-white rounded-xl shadow-lg"
                >
                  <div className="space-y-1 p-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-talka-cyan">{trans.translation}</p>
                      {onWordSpeak && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeak(trans.word);
                          }}
                          className="p-1 rounded-full bg-talka-purple/20 hover:bg-talka-purple/40 text-talka-purple transition-colors"
                          title="Listen to pronunciation"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {trans.conjugation && (
                      <div className="text-xs text-green-400 mt-2 pt-2 border-t border-slate-600">
                        <p className="font-semibold">Verb Form:</p>
                        <p>{trans.conjugation}</p>
                      </div>
                    )}
                    {trans.alternatives && trans.alternatives.length > 0 && (
                      <div className="text-xs text-slate-300 space-y-0.5 mt-2 pt-2 border-t border-slate-600">
                        {trans.alternatives.map((alt, i) => (
                          <p key={i}>• {alt}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </span>
      </TooltipProvider>
    </>
  );
}

export async function getWordTranslations(
  text: string,
  sourceLanguage: string = 'Spanish',
  targetLanguage: string = 'English'
): Promise<WordTranslation[]> {
  try {
    const response = await fetch('/api/translate-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
    });

    if (!response.ok) {
      console.error('Failed to fetch translations');
      return [];
    }

    const data = await response.json();
    return data.translations || [];
  } catch (error) {
    console.error('Error fetching word translations:', error);
    return [];
  }
}
