'use client';

import { useState } from 'react';
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
}

export function WordHoverText({ text, translations = [], className = '' }: WordHoverTextProps) {
  const words = text.split(/(\s+|[.,!?;:])/g).filter(w => w.trim().length > 0 || /\s/.test(w));

  const getTranslation = (word: string): WordTranslation | null => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
    return translations.find(t => t.word.toLowerCase() === cleanWord) || null;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <span className={className}>
        {words.map((segment, index) => {
          if (/^\s+$/.test(segment)) {
            return <span key={index}>{segment}</span>;
          }

          const trans = getTranslation(segment);

          if (!trans) {
            return <span key={index} className="text-white/90">{segment}</span>;
          }

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span className="text-white/90 cursor-help hover:text-blue-400 transition-colors underline decoration-dotted decoration-blue-400/40 underline-offset-2">
                  {segment}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs bg-black/95 border-white/20 text-white"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-blue-400">{trans.translation}</p>
                  {trans.conjugation && (
                    <div className="text-xs text-green-400/80 mt-2 pt-2 border-t border-white/10">
                      <p className="font-medium">Verb Form:</p>
                      <p>{trans.conjugation}</p>
                    </div>
                  )}
                  {trans.alternatives && trans.alternatives.length > 0 && (
                    <div className="text-xs text-white/60 space-y-0.5 mt-2 pt-2 border-t border-white/10">
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
