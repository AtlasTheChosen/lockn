export const CEFR_MULTIPLIERS = {
  A1: 1,
  A2: 1.2,
  B1: 1.5,
  B2: 2,
  C1: 3,
  C2: 4,
} as const;

export type CEFRLevel = keyof typeof CEFR_MULTIPLIERS;

export interface StackWithCEFR {
  total_cards: number;
  mastered_count: number;
  cefr_level?: string;
}

export function calculateWeightedMastery(completedStacks: StackWithCEFR[]): number {
  if (completedStacks.length === 0) return 0;

  let totalWeightedMastery = 0;
  let totalWeight = 0;

  for (const stack of completedStacks) {
    const cefrLevel = (stack.cefr_level || 'B1') as CEFRLevel;
    const multiplier = CEFR_MULTIPLIERS[cefrLevel] || CEFR_MULTIPLIERS.B1;

    const masteryPercentage = (stack.mastered_count / stack.total_cards) * 100;

    const weight = stack.total_cards * multiplier;

    totalWeightedMastery += masteryPercentage * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return Math.round(totalWeightedMastery / totalWeight);
}

export function getCEFRRank(weightedMastery: number): CEFRLevel {
  if (weightedMastery >= 90) return 'C2';
  if (weightedMastery >= 75) return 'C1';
  if (weightedMastery >= 60) return 'B2';
  if (weightedMastery >= 45) return 'B1';
  if (weightedMastery >= 30) return 'A2';
  return 'A1';
}

export function getRankInfo(mastery: number) {
  const cefrRank = getCEFRRank(mastery);

  const rankMappings = {
    C2: { title: 'Proficient (C2)', color: 'from-purple-500 to-pink-500', description: 'Near-native mastery' },
    C1: { title: 'Advanced (C1)', color: 'from-blue-500 to-cyan-500', description: 'Effective operational proficiency' },
    B2: { title: 'Upper Intermediate (B2)', color: 'from-green-500 to-emerald-500', description: 'Independent user' },
    B1: { title: 'Intermediate (B1)', color: 'from-teal-500 to-green-500', description: 'Threshold level' },
    A2: { title: 'Elementary (A2)', color: 'from-yellow-500 to-orange-500', description: 'Basic user' },
    A1: { title: 'Beginner (A1)', color: 'from-orange-500 to-red-500', description: 'Breakthrough level' },
  };

  return { ...rankMappings[cefrRank], cefrRank };
}

export function getCEFRBadgeColor(level: string): string {
  const colorMap: Record<string, string> = {
    A1: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    A2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    B1: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    B2: 'bg-green-500/20 text-green-400 border-green-500/30',
    C1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    C2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return colorMap[level] || colorMap.B1;
}
