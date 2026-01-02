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
  GraduationCap,
  Snowflake,
  Timer,
  RefreshCcw,
  CheckCircle,
  Rocket,
  Moon,
  Sunrise,
  Calendar,
  Globe,
  ClipboardCheck,
  Gem,
  Share2
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
  // ============================================================
  // STREAK BADGES
  // ============================================================
  'streak_3': {
    name: 'First Spark',
    description: 'Ignited your learning journey with a 3-day streak',
    icon: 'flame',
    category: 'streak',
    requirement: '3 day streak',
  },
  'streak_7': {
    name: 'Week Warrior',
    description: 'Maintained a learning streak for 7 days',
    icon: 'flame',
    category: 'streak',
    requirement: '7 day streak',
  },
  'streak_10': {
    name: 'Dedicated Learner',
    description: 'Stayed committed for 10 days straight',
    icon: 'flame',
    category: 'streak',
    requirement: '10 day streak',
  },
  'streak_30': {
    name: 'Monthly Master',
    description: 'Maintained a learning streak for 30 days',
    icon: 'flame',
    category: 'streak',
    requirement: '30 day streak',
  },
  'streak_60': {
    name: 'Two Month Titan',
    description: 'An incredible 60-day learning streak',
    icon: 'flame',
    category: 'streak',
    requirement: '60 day streak',
  },
  'streak_100': {
    name: 'Century Streak',
    description: 'Achieved the legendary 100-day streak',
    icon: 'crown',
    category: 'streak',
    requirement: '100 day streak',
  },
  'streak_365': {
    name: 'Year Champion',
    description: 'A full year of unbroken learning',
    icon: 'crown',
    category: 'streak',
    requirement: '365 day streak',
  },
  
  // ============================================================
  // RECOVERY / STREAK FREEZE BADGES
  // ============================================================
  'ice_breaker': {
    name: 'Ice Breaker',
    description: 'Unfroze your streak by completing an overdue test',
    icon: 'snowflake',
    category: 'recovery',
    requirement: 'Unfreeze streak once',
  },
  'ice_breaker_5': {
    name: 'Defrost Expert',
    description: 'Recovered your streak 5 times - you never give up!',
    icon: 'snowflake',
    category: 'recovery',
    requirement: 'Unfreeze streak 5 times',
  },
  'clutch_test': {
    name: 'Clutch Player',
    description: 'Completed a test with less than 24 hours remaining',
    icon: 'timer',
    category: 'recovery',
    requirement: 'Complete test with <24h left',
  },
  'comeback_kid': {
    name: 'Comeback Kid',
    description: 'Returned to learning after 7+ days of inactivity',
    icon: 'refreshccw',
    category: 'recovery',
    requirement: 'Return after 7+ days',
  },
  
  // ============================================================
  // CARDS BADGES
  // ============================================================
  'cards_50': {
    name: 'Getting Started',
    description: 'Mastered your first 50 flashcards',
    icon: 'bookopen',
    category: 'cards',
    requirement: '50 cards mastered',
  },
  'cards_100': {
    name: 'Card Collector',
    description: 'Mastered 100 flashcards',
    icon: 'bookopen',
    category: 'cards',
    requirement: '100 cards mastered',
  },
  'cards_250': {
    name: 'Card Apprentice',
    description: 'Building a solid vocabulary with 250 cards',
    icon: 'bookopen',
    category: 'cards',
    requirement: '250 cards mastered',
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
  'cards_2500': {
    name: 'Card Sage',
    description: 'Achieved mastery of 2500 cards',
    icon: 'sparkles',
    category: 'cards',
    requirement: '2500 cards mastered',
  },
  'cards_5000': {
    name: 'Card Virtuoso',
    description: 'An incredible 5000 cards mastered',
    icon: 'crown',
    category: 'cards',
    requirement: '5000 cards mastered',
  },
  
  // ============================================================
  // STACK BADGES
  // ============================================================
  'stack_first': {
    name: 'First Steps',
    description: 'Completed your first stack',
    icon: 'target',
    category: 'stacks',
    requirement: 'First stack completed',
  },
  'stack_5': {
    name: 'On a Roll',
    description: 'Completed 5 stacks - momentum is building!',
    icon: 'target',
    category: 'stacks',
    requirement: '5 stacks completed',
  },
  'stack_10': {
    name: 'Stack Master',
    description: 'Completed 10 stacks',
    icon: 'medal',
    category: 'stacks',
    requirement: '10 stacks completed',
  },
  'stack_25': {
    name: 'Stack Hoarder',
    description: 'Conquered 25 stacks',
    icon: 'medal',
    category: 'stacks',
    requirement: '25 stacks completed',
  },
  'stack_50': {
    name: 'Collection King',
    description: 'An impressive 50 stacks completed',
    icon: 'crown',
    category: 'stacks',
    requirement: '50 stacks completed',
  },
  'stack_perfect': {
    name: 'Perfect Score',
    description: 'Passed a test with 100% accuracy',
    icon: 'sparkles',
    category: 'stacks',
    requirement: '100% test score',
  },
  'perfect_streak_3': {
    name: 'Flawless',
    description: 'Achieved 3 perfect test scores in a row',
    icon: 'sparkles',
    category: 'stacks',
    requirement: '3 perfect tests consecutively',
  },
  'first_test': {
    name: 'Test Taker',
    description: 'Completed your first stack test',
    icon: 'clipboardcheck',
    category: 'stacks',
    requirement: 'Complete first test',
  },
  
  // ============================================================
  // LEARNING PERFORMANCE BADGES
  // ============================================================
  'daily_goal': {
    name: 'Goal Getter',
    description: 'Met your daily goal of 10 cards for the first time',
    icon: 'checkcircle',
    category: 'performance',
    requirement: 'Meet daily goal once',
  },
  'daily_goal_streak_7': {
    name: 'Consistent',
    description: 'Met your daily goal 7 days in a row',
    icon: 'checkcircle',
    category: 'performance',
    requirement: 'Daily goal 7 days straight',
  },
  'daily_goal_streak_30': {
    name: 'Unstoppable',
    description: 'Met your daily goal 30 days in a row',
    icon: 'checkcircle',
    category: 'performance',
    requirement: 'Daily goal 30 days straight',
  },
  'overachiever': {
    name: 'Overachiever',
    description: 'Learned 50+ cards in a single day',
    icon: 'rocket',
    category: 'performance',
    requirement: '50+ cards in one day',
  },
  'speed_learner': {
    name: 'Speed Demon',
    description: 'Completed a stack in under 30 minutes',
    icon: 'zap',
    category: 'performance',
    requirement: 'Complete stack in <30 min',
  },
  'night_owl': {
    name: 'Night Owl',
    description: 'Studied after midnight - dedication knows no hours',
    icon: 'moon',
    category: 'performance',
    requirement: 'Study after midnight',
  },
  'early_bird': {
    name: 'Early Bird',
    description: 'Studied before 6am - starting the day right',
    icon: 'sunrise',
    category: 'performance',
    requirement: 'Study before 6am',
  },
  'weekend_warrior': {
    name: 'Weekend Warrior',
    description: 'Studied on both Saturday and Sunday',
    icon: 'calendar',
    category: 'performance',
    requirement: 'Study on weekend',
  },
  
  // ============================================================
  // SOCIAL BADGES
  // ============================================================
  'friend_first': {
    name: 'Social Butterfly',
    description: 'Added your first friend',
    icon: 'users',
    category: 'social',
    requirement: 'First friend added',
  },
  'friend_5': {
    name: 'Social Circle',
    description: 'Built a circle of 5 learning buddies',
    icon: 'users',
    category: 'social',
    requirement: '5 friends added',
  },
  'friend_10': {
    name: 'Popular Learner',
    description: 'Connected with 10 fellow learners',
    icon: 'users',
    category: 'social',
    requirement: '10 friends added',
  },
  'challenge_won': {
    name: 'Challenger',
    description: 'Won your first challenge',
    icon: 'zap',
    category: 'social',
    requirement: 'First challenge won',
  },
  'challenge_5': {
    name: 'Challenge Seeker',
    description: 'Won 5 challenges against friends',
    icon: 'zap',
    category: 'social',
    requirement: '5 challenges won',
  },
  'challenge_10': {
    name: 'Challenge Champion',
    description: 'Dominated 10 challenges',
    icon: 'trophy',
    category: 'social',
    requirement: '10 challenges won',
  },
  'share_stack': {
    name: 'Generous Teacher',
    description: 'Shared a stack with the community',
    icon: 'award',
    category: 'social',
    requirement: 'Shared a stack publicly',
  },
  'influencer': {
    name: 'Stack Influencer',
    description: 'Your stack was copied 10 times by others',
    icon: 'share2',
    category: 'social',
    requirement: 'Stack copied 10 times',
  },
  
  // ============================================================
  // SPECIAL / RARE BADGES
  // ============================================================
  'early_adopter': {
    name: 'Early Adopter',
    description: 'Joined FlashDash in its early days',
    icon: 'graduationcap',
    category: 'special',
    requirement: 'Early registration',
  },
  'polyglot_2': {
    name: 'Polyglot Starter',
    description: 'Learning 2 or more languages',
    icon: 'globe',
    category: 'special',
    requirement: 'Study 2+ languages',
  },
  'polyglot_5': {
    name: 'Polyglot Pro',
    description: 'A master of 5+ languages',
    icon: 'globe',
    category: 'special',
    requirement: 'Study 5+ languages',
  },
  'premium_member': {
    name: 'Premium Member',
    description: 'Upgraded to FlashDash Premium',
    icon: 'gem',
    category: 'special',
    requirement: 'Premium subscription',
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
  snowflake: Snowflake,
  timer: Timer,
  refreshccw: RefreshCcw,
  checkcircle: CheckCircle,
  rocket: Rocket,
  moon: Moon,
  sunrise: Sunrise,
  calendar: Calendar,
  globe: Globe,
  clipboardcheck: ClipboardCheck,
  gem: Gem,
  share2: Share2,
};

const categoryColors: Record<Badge['category'], string> = {
  streak: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cards: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stacks: 'bg-green-500/20 text-green-400 border-green-500/30',
  social: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  special: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  recovery: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  performance: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
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
    longest_streak?: number;
    total_cards_mastered: number;
    total_stacks_completed: number;
    friends_count?: number;
    challenges_won?: number;
    stacks_shared?: number;
    best_test_score?: number;
    // New stats for expanded badges
    ice_breaker_count?: number;
    tests_completed?: number;
    perfect_test_streak?: number;
    daily_cards_learned?: number;
    daily_goal_streak?: number;
    languages_count?: number;
    is_premium?: boolean;
    stack_copy_count?: number;
  },
  existingBadges: Badge[]
): string[] {
  const earnedBadgeIds = existingBadges.map(b => b.id);
  const newBadges: string[] = [];

  // ============================================================
  // STREAK BADGES
  // ============================================================
  if (stats.current_streak >= 3 && !earnedBadgeIds.includes('streak_3')) {
    newBadges.push('streak_3');
  }
  if (stats.current_streak >= 7 && !earnedBadgeIds.includes('streak_7')) {
    newBadges.push('streak_7');
  }
  if (stats.current_streak >= 10 && !earnedBadgeIds.includes('streak_10')) {
    newBadges.push('streak_10');
  }
  if (stats.current_streak >= 30 && !earnedBadgeIds.includes('streak_30')) {
    newBadges.push('streak_30');
  }
  if (stats.current_streak >= 60 && !earnedBadgeIds.includes('streak_60')) {
    newBadges.push('streak_60');
  }
  if (stats.current_streak >= 100 && !earnedBadgeIds.includes('streak_100')) {
    newBadges.push('streak_100');
  }
  if (stats.current_streak >= 365 && !earnedBadgeIds.includes('streak_365')) {
    newBadges.push('streak_365');
  }

  // ============================================================
  // RECOVERY / STREAK FREEZE BADGES
  // ============================================================
  if ((stats.ice_breaker_count ?? 0) >= 1 && !earnedBadgeIds.includes('ice_breaker')) {
    newBadges.push('ice_breaker');
  }
  if ((stats.ice_breaker_count ?? 0) >= 5 && !earnedBadgeIds.includes('ice_breaker_5')) {
    newBadges.push('ice_breaker_5');
  }
  // Note: clutch_test and comeback_kid are awarded via specific events, not stats

  // ============================================================
  // CARDS BADGES
  // ============================================================
  if (stats.total_cards_mastered >= 50 && !earnedBadgeIds.includes('cards_50')) {
    newBadges.push('cards_50');
  }
  if (stats.total_cards_mastered >= 100 && !earnedBadgeIds.includes('cards_100')) {
    newBadges.push('cards_100');
  }
  if (stats.total_cards_mastered >= 250 && !earnedBadgeIds.includes('cards_250')) {
    newBadges.push('cards_250');
  }
  if (stats.total_cards_mastered >= 500 && !earnedBadgeIds.includes('cards_500')) {
    newBadges.push('cards_500');
  }
  if (stats.total_cards_mastered >= 1000 && !earnedBadgeIds.includes('cards_1000')) {
    newBadges.push('cards_1000');
  }
  if (stats.total_cards_mastered >= 2500 && !earnedBadgeIds.includes('cards_2500')) {
    newBadges.push('cards_2500');
  }
  if (stats.total_cards_mastered >= 5000 && !earnedBadgeIds.includes('cards_5000')) {
    newBadges.push('cards_5000');
  }

  // ============================================================
  // STACK BADGES
  // ============================================================
  if (stats.total_stacks_completed >= 1 && !earnedBadgeIds.includes('stack_first')) {
    newBadges.push('stack_first');
  }
  if (stats.total_stacks_completed >= 5 && !earnedBadgeIds.includes('stack_5')) {
    newBadges.push('stack_5');
  }
  if (stats.total_stacks_completed >= 10 && !earnedBadgeIds.includes('stack_10')) {
    newBadges.push('stack_10');
  }
  if (stats.total_stacks_completed >= 25 && !earnedBadgeIds.includes('stack_25')) {
    newBadges.push('stack_25');
  }
  if (stats.total_stacks_completed >= 50 && !earnedBadgeIds.includes('stack_50')) {
    newBadges.push('stack_50');
  }
  if (stats.best_test_score === 100 && !earnedBadgeIds.includes('stack_perfect')) {
    newBadges.push('stack_perfect');
  }
  if ((stats.perfect_test_streak ?? 0) >= 3 && !earnedBadgeIds.includes('perfect_streak_3')) {
    newBadges.push('perfect_streak_3');
  }
  if ((stats.tests_completed ?? 0) >= 1 && !earnedBadgeIds.includes('first_test')) {
    newBadges.push('first_test');
  }

  // ============================================================
  // PERFORMANCE BADGES
  // ============================================================
  if ((stats.daily_cards_learned ?? 0) >= 10 && !earnedBadgeIds.includes('daily_goal')) {
    newBadges.push('daily_goal');
  }
  if ((stats.daily_goal_streak ?? 0) >= 7 && !earnedBadgeIds.includes('daily_goal_streak_7')) {
    newBadges.push('daily_goal_streak_7');
  }
  if ((stats.daily_goal_streak ?? 0) >= 30 && !earnedBadgeIds.includes('daily_goal_streak_30')) {
    newBadges.push('daily_goal_streak_30');
  }
  if ((stats.daily_cards_learned ?? 0) >= 50 && !earnedBadgeIds.includes('overachiever')) {
    newBadges.push('overachiever');
  }
  // Note: speed_learner, night_owl, early_bird, weekend_warrior are awarded via specific events

  // ============================================================
  // SOCIAL BADGES
  // ============================================================
  if ((stats.friends_count ?? 0) >= 1 && !earnedBadgeIds.includes('friend_first')) {
    newBadges.push('friend_first');
  }
  if ((stats.friends_count ?? 0) >= 5 && !earnedBadgeIds.includes('friend_5')) {
    newBadges.push('friend_5');
  }
  if ((stats.friends_count ?? 0) >= 10 && !earnedBadgeIds.includes('friend_10')) {
    newBadges.push('friend_10');
  }
  if ((stats.challenges_won ?? 0) >= 1 && !earnedBadgeIds.includes('challenge_won')) {
    newBadges.push('challenge_won');
  }
  if ((stats.challenges_won ?? 0) >= 5 && !earnedBadgeIds.includes('challenge_5')) {
    newBadges.push('challenge_5');
  }
  if ((stats.challenges_won ?? 0) >= 10 && !earnedBadgeIds.includes('challenge_10')) {
    newBadges.push('challenge_10');
  }
  if ((stats.stacks_shared ?? 0) >= 1 && !earnedBadgeIds.includes('share_stack')) {
    newBadges.push('share_stack');
  }
  if ((stats.stack_copy_count ?? 0) >= 10 && !earnedBadgeIds.includes('influencer')) {
    newBadges.push('influencer');
  }

  // ============================================================
  // SPECIAL BADGES
  // ============================================================
  if ((stats.languages_count ?? 0) >= 2 && !earnedBadgeIds.includes('polyglot_2')) {
    newBadges.push('polyglot_2');
  }
  if ((stats.languages_count ?? 0) >= 5 && !earnedBadgeIds.includes('polyglot_5')) {
    newBadges.push('polyglot_5');
  }
  if (stats.is_premium && !earnedBadgeIds.includes('premium_member')) {
    newBadges.push('premium_member');
  }

  return newBadges;
}

// Award event-based badges (called when specific events occur)
export function awardEventBadge(
  eventType: 'clutch_test' | 'comeback_kid' | 'night_owl' | 'early_bird' | 'weekend_warrior' | 'speed_learner',
  existingBadges: Badge[]
): string | null {
  const earnedBadgeIds = existingBadges.map(b => b.id);
  
  if (!earnedBadgeIds.includes(eventType)) {
    return eventType;
  }
  
  return null;
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





