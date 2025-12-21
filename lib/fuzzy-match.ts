import { distance } from 'fastest-levenshtein';

export interface MatchResult {
  isExactMatch: boolean;
  isSoftPass: boolean;
  distance: number;
  threshold: number;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]/g, '')
    .trim();
}

export function fuzzyMatch(userInput: string, correctAnswer: string): MatchResult {
  const normalizedInput = normalizeText(userInput);
  const normalizedAnswer = normalizeText(correctAnswer);

  if (normalizedInput === normalizedAnswer) {
    return {
      isExactMatch: true,
      isSoftPass: true,
      distance: 0,
      threshold: 0,
    };
  }

  const levenshteinDistance = distance(normalizedInput, normalizedAnswer);
  const threshold = Math.ceil(normalizedAnswer.length * 0.15);

  return {
    isExactMatch: false,
    isSoftPass: levenshteinDistance <= threshold,
    distance: levenshteinDistance,
    threshold,
  };
}

export function gradeAnswer(userInput: string, correctAnswer: string): {
  passed: boolean;
  isSoftPass: boolean;
  feedback: string;
} {
  const result = fuzzyMatch(userInput, correctAnswer);

  if (result.isExactMatch) {
    return {
      passed: true,
      isSoftPass: false,
      feedback: 'Perfect!',
    };
  }

  if (result.isSoftPass) {
    return {
      passed: true,
      isSoftPass: true,
      feedback: 'Close enough! Minor spelling differences.',
    };
  }

  return {
    passed: false,
    isSoftPass: false,
    feedback: `Not quite. The correct answer is: ${correctAnswer}`,
  };
}
