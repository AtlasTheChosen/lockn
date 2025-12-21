'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

interface Mistake {
  card_id: string;
  target_phrase: string;
  user_answer: string;
  correct_answer: string;
  timestamp: string;
  mistake_type?: string;
  ai_tip?: string;
}

interface ReviewNotesProps {
  mistakes: Mistake[];
  isCompleted: boolean;
}

function highlightDifferences(userAnswer: string, correctAnswer: string) {
  const userWords = userAnswer.toLowerCase().split(/\s+/);
  const correctWords = correctAnswer.toLowerCase().split(/\s+/);

  return userWords.map((word, index) => {
    const isWrong = word !== correctWords[index];
    return (
      <span
        key={index}
        className={isWrong ? 'text-red-400 font-semibold' : 'text-white/80'}
      >
        {userAnswer.split(/\s+/)[index]}{index < userWords.length - 1 ? ' ' : ''}
      </span>
    );
  });
}

function generateAITip(userAnswer: string, correctAnswer: string, mistakeType?: string): string {
  const userLower = userAnswer.toLowerCase();
  const correctLower = correctAnswer.toLowerCase();

  if (mistakeType === 'accent') {
    return 'Remember to include accent marks - they change pronunciation and meaning.';
  }

  if (mistakeType === 'article') {
    return 'Pay attention to articles (el, la, un, una) - they are gender-specific.';
  }

  if (mistakeType === 'conjugation') {
    return 'Check verb conjugation - match the person and tense correctly.';
  }

  if (userLower.length < correctLower.length) {
    return 'Your answer was too short - you may have missed a word or two.';
  }

  if (userLower.length > correctLower.length) {
    return 'Your answer included extra words - keep it concise.';
  }

  const similarity = calculateSimilarity(userLower, correctLower);
  if (similarity > 0.8) {
    return 'Very close! Just a small typo or spelling difference.';
  }

  if (similarity > 0.5) {
    return 'You have the right idea - review the exact phrasing.';
  }

  return 'This phrase needs more practice - review the context and example.';
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export default function ReviewNotes({ mistakes, isCompleted }: ReviewNotesProps) {
  if (!isCompleted) {
    return null;
  }

  const groupedMistakes = mistakes.reduce((acc, mistake) => {
    if (!acc[mistake.target_phrase]) {
      acc[mistake.target_phrase] = [];
    }
    acc[mistake.target_phrase].push(mistake);
    return acc;
  }, {} as Record<string, Mistake[]>);

  const hasNoMistakes = mistakes.length === 0;

  return (
    <Card className="bg-slate-800 border-slate-700 mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-white text-xl font-bold">Your Review Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {hasNoMistakes ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Perfect!</h3>
            <p className="text-slate-400">No errors recorded in your practice sessions.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {Object.entries(groupedMistakes).map(([phrase, phraseMistakes], index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-slate-900/50 border border-slate-700 rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-start gap-3 text-left w-full">
                    <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-base">{phrase}</p>
                      <Badge variant="outline" className="mt-1 border-slate-600 text-slate-400 text-xs">
                        {phraseMistakes.length} {phraseMistakes.length === 1 ? 'mistake' : 'mistakes'}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pt-2">
                    {phraseMistakes.map((mistake, mistakeIndex) => {
                      const aiTip = mistake.ai_tip || generateAITip(
                        mistake.user_answer,
                        mistake.correct_answer,
                        mistake.mistake_type
                      );

                      return (
                        <div
                          key={mistakeIndex}
                          className="bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-700/50"
                        >
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                              Your Answer
                            </p>
                            <p className="text-base">
                              {highlightDifferences(mistake.user_answer, mistake.correct_answer)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                              Correct Answer
                            </p>
                            <p className="text-base text-green-400 font-medium">
                              {mistake.correct_answer}
                            </p>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-blue-300">
                                {aiTip}
                              </p>
                            </div>
                          </div>

                          {mistake.timestamp && (
                            <p className="text-xs text-slate-500">
                              {new Date(mistake.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
