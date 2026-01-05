'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
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

// Mobile word popup component - compact version with overlay to prevent card flip
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
  // Calculate position - show above the word, compact
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(Math.max(position.x - 75, 8), window.innerWidth - 160),
    top: Math.max(position.y - 70, 8),
    zIndex: 9999,
  };

  // Handle overlay click - close popup and stop propagation to prevent card flip
  const handleOverlayClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <>
      {/* Invisible overlay to catch clicks and prevent card flip */}
      <div 
        className="fixed inset-0 z-[9998]"
        onClick={handleOverlayClick}
        onTouchEnd={handleOverlayClick}
      />
      
      {/* Popup */}
      <div 
        style={popupStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 text-white rounded-xl shadow-lg px-3 py-2 min-w-[150px] max-w-[180px] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Compact layout: translation + speaker button inline */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 truncate">{word}</p>
            <p className="text-sm font-semibold text-talka-cyan truncate">{translation.translation}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpeak();
            }}
            onTouchEnd={(e) => e.stopPropagation()}
            className="shrink-0 p-2 bg-talka-purple/30 hover:bg-talka-purple/50 text-white rounded-lg active:scale-90 transition-all"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Show conjugation only if present, very compact */}
        {translation.conjugation && (
          <p className="text-[10px] text-green-400 mt-1 truncate">{translation.conjugation}</p>
        )}
      </div>
    </>
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
  
  const words = text.split(/(\s+|[.,!?;:¿¡"'«»—-])/g).filter(w => w.trim().length > 0 || /\s/.test(w));

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
    const cleanWord = word.toLowerCase().replace(/[.,!?;:¿¡"'«»—-]/g, '');
    const found = translations.find(t => t.word.toLowerCase().replace(/[.,!?;:¿¡"'«»—-]/g, '') === cleanWord);
    return found || null;
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
