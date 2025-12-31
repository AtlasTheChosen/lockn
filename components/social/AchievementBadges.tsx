'use client';

import { Badge } from '@/lib/types';
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Users, 
  Star, 
  Zap, 
  Target,
  Crown,
  Medal,
  Award,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Badge definitions with requirements
export const BADGE_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  icon: string;
  category: Badge['category'];
  requirement: string;
}> = {
  // Streak badges
  'streak_7': {
    name: '7-Day Streak',
    description: 'Maintained a learning streak for 7 days',
    icon: 'flame',
    category: 'streak',
    requirement: '7 day streak',
  },
  'streak_30': {
    name: 'Monthly Master',
    description: 'Maintained a learning streak for 30 days',
    icon: 'flame',
    category: 'streak',
    requirement: '30 day streak',
  },
  'streak_100': {
    name: 'Century Streak',
    description: 'Maintained a learning streak for 100 days',
    icon: 'crown',
    category: 'streak',
    requirement: '100 day streak',
  },
  // Cards badges
  'cards_100': {
    name: 'Card Collector',
    description: 'Mastered 100 flashcards',
    icon: 'bookopen',
    category: 'cards',
    requirement: '100 cards mastered',
  },
  'cards_500': {
    name: 'Card Champion',
    description: 'Mastered 500 flashcards',
    icon: 'trophy',
    category: 'cards',
    requirement: '500 cards mastered',
  },
  'cards_1000': {
    name: 'Card Legend',
    description: 'Mastered 1000 flashcards',
    icon: 'star',
    category: 'cards',
    requirement: '1000 cards mastered',
  },
  // Stack badges
  'stack_first': {
    name: 'First Steps',
    description: 'Completed your first stack',
    icon: 'target',
    category: 'stacks',
    requirement: 'First stack completed',
  },
  'stack_10': {
    name: 'Stack Master',
    description: 'Completed 10 stacks',
    icon: 'medal',
    category: 'stacks',
    requirement: '10 stacks completed',
  },
  'stack_perfect': {
    name: 'Perfect Score',
    description: 'Passed a test with 100% accuracy',
    icon: 'sparkles',
    category: 'stacks',
    requirement: '100% test score',
  },
  // Social badges
  'friend_first': {
    name: 'Social Butterfly',
    description: 'Added your first friend',
    icon: 'users',
    category: 'social',
    requirement: 'First friend added',
  },
  'challenge_won': {
    name: 'Challenger',
    description: 'Won your first challenge',
    icon: 'zap',
    category: 'social',
    requirement: 'First challenge won',
  },
  'share_stack': {
    name: 'Generous Teacher',
    description: 'Shared a stack with the community',
    icon: 'award',
    category: 'social',
    requirement: 'Shared a stack publicly',
  },
  // Special badges
  'early_adopter': {
    name: 'Early Adopter',
    description: 'Joined FlashDash in its early days',
    icon: 'graduationcap',
    category: 'special',
    requirement: 'Early registration',
  },
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flame: Flame,
  bookopen: BookOpen,
  users: Users,
  star: Star,
  zap: Zap,
  target: Target,
  crown: Crown,
  medal: Medal,
  award: Award,
  sparkles: Sparkles,
  graduationcap: GraduationCap,
};

const categoryColors: Record<Badge['category'], string> = {
  streak: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cards: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stacks: 'bg-green-500/20 text-green-400 border-green-500/30',
  social: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  special: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

interface Props {
  badges: Badge[];
  showAll?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export default function AchievementBadges({ badges, showAll = false, size = 'md', maxDisplay = 6 }: Props) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const displayBadges = showAll ? badges : badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  if (badges.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">
        No badges earned yet
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => {
          const definition = BADGE_DEFINITIONS[badge.id];
          const IconComponent = iconMap[badge.icon] || Trophy;
          const colorClass = categoryColors[badge.category];

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center border cursor-help transition-transform hover:scale-110`}
                >
                  <IconComponent className={iconSizes[size]} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-800 border-slate-700">
                <div className="text-center">
                  <p className="font-semibold text-white">{badge.name}</p>
                  <p className="text-xs text-slate-400">{badge.description}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Earned {new Date(badge.earned_at).toLocaleDateString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {!showAll && remainingCount > 0 && (
          <div
            className={`${sizeClasses[size]} bg-slate-700/50 text-slate-400 rounded-full flex items-center justify-center border border-slate-600 text-xs font-medium`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Helper function to check if a user has earned a badge
export function checkBadgeEligibility(
  stats: {
    current_streak: number;
    total_cards_mastered: number;
    total_stacks_completed: number;
    friends_count?: number;
    challenges_won?: number;
    stacks_shared?: number;
    best_test_score?: number;
  },
  existingBadges: Badge[]
): string[] {
  const earnedBadgeIds = existingBadges.map(b => b.id);
  const newBadges: string[] = [];

  // Streak badges
  if (stats.current_streak >= 7 && !earnedBadgeIds.includes('streak_7')) {
    newBadges.push('streak_7');
  }
  if (stats.current_streak >= 30 && !earnedBadgeIds.includes('streak_30')) {
    newBadges.push('streak_30');
  }
  if (stats.current_streak >= 100 && !earnedBadgeIds.includes('streak_100')) {
    newBadges.push('streak_100');
  }

  // Cards badges
  if (stats.total_cards_mastered >= 100 && !earnedBadgeIds.includes('cards_100')) {
    newBadges.push('cards_100');
  }
  if (stats.total_cards_mastered >= 500 && !earnedBadgeIds.includes('cards_500')) {
    newBadges.push('cards_500');
  }
  if (stats.total_cards_mastered >= 1000 && !earnedBadgeIds.includes('cards_1000')) {
    newBadges.push('cards_1000');
  }

  // Stack badges
  if (stats.total_stacks_completed >= 1 && !earnedBadgeIds.includes('stack_first')) {
    newBadges.push('stack_first');
  }
  if (stats.total_stacks_completed >= 10 && !earnedBadgeIds.includes('stack_10')) {
    newBadges.push('stack_10');
  }
  if (stats.best_test_score === 100 && !earnedBadgeIds.includes('stack_perfect')) {
    newBadges.push('stack_perfect');
  }

  // Social badges
  if ((stats.friends_count ?? 0) >= 1 && !earnedBadgeIds.includes('friend_first')) {
    newBadges.push('friend_first');
  }
  if ((stats.challenges_won ?? 0) >= 1 && !earnedBadgeIds.includes('challenge_won')) {
    newBadges.push('challenge_won');
  }
  if ((stats.stacks_shared ?? 0) >= 1 && !earnedBadgeIds.includes('share_stack')) {
    newBadges.push('share_stack');
  }

  return newBadges;
}

// Create a badge object from its ID
export function createBadge(badgeId: string): Badge | null {
  const definition = BADGE_DEFINITIONS[badgeId];
  if (!definition) return null;

  return {
    id: badgeId,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    category: definition.category,
    earned_at: new Date().toISOString(),
  };
}


