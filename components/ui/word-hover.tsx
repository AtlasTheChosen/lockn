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

  // #region agent log
  if (translations.length > 0) {
    fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'word-hover.tsx:WordHoverText',message:'Rendering WordHoverText with translations',data:{text,wordsToRender:words.filter(w=>!/^\s+$/.test(w)),translationsProvided:translations.map(t=>({word:t.word,translation:t.translation}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion

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
            return <span key={index} className="inherit">{segment}</span>;
          }

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span className="cursor-help hover:text-talka-purple transition-colors underline decoration-dotted decoration-talka-purple/40 underline-offset-2">
                  {segment}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs bg-slate-800 border-slate-700 text-white rounded-xl shadow-lg"
              >
                <div className="space-y-1 p-1">
                  <p className="font-bold text-talka-cyan">{trans.translation}</p>
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
