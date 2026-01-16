'use client';

import { useState } from 'react';
import { Badge } from '@/lib/types';
import { BADGE_DEFINITIONS, createBadge } from './AchievementBadges';
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
  Share2,
  Lock,
  Check
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress-simple';
import { cn } from '@/lib/utils';

// Badge progress thresholds for calculating progress
export const BADGE_THRESHOLDS: Record<string, { current: (stats: BadgeStats) => number; target: number }> = {
  // Streak badges
  'streak_3': { current: (s) => s.current_streak, target: 3 },
  'streak_7': { current: (s) => s.current_streak, target: 7 },
  'streak_10': { current: (s) => s.current_streak, target: 10 },
  'streak_30': { current: (s) => s.current_streak, target: 30 },
  'streak_60': { current: (s) => s.current_streak, target: 60 },
  'streak_100': { current: (s) => s.current_streak, target: 100 },
  'streak_365': { current: (s) => s.current_streak, target: 365 },
  
  // Recovery badges
  'ice_breaker': { current: (s) => s.ice_breaker_count ?? 0, target: 1 },
  'ice_breaker_5': { current: (s) => s.ice_breaker_count ?? 0, target: 5 },
  'clutch_test': { current: () => 0, target: 1 }, // Event-based
  'comeback_kid': { current: () => 0, target: 1 }, // Event-based
  
  // Cards badges
  'cards_50': { current: (s) => s.total_cards_mastered, target: 50 },
  'cards_100': { current: (s) => s.total_cards_mastered, target: 100 },
  'cards_250': { current: (s) => s.total_cards_mastered, target: 250 },
  'cards_500': { current: (s) => s.total_cards_mastered, target: 500 },
  'cards_1000': { current: (s) => s.total_cards_mastered, target: 1000 },
  'cards_2500': { current: (s) => s.total_cards_mastered, target: 2500 },
  'cards_5000': { current: (s) => s.total_cards_mastered, target: 5000 },
  
  // Stack badges
  'stack_first': { current: (s) => s.total_stacks_completed, target: 1 },
  'stack_5': { current: (s) => s.total_stacks_completed, target: 5 },
  'stack_10': { current: (s) => s.total_stacks_completed, target: 10 },
  'stack_25': { current: (s) => s.total_stacks_completed, target: 25 },
  'stack_50': { current: (s) => s.total_stacks_completed, target: 50 },
  'stack_perfect': { current: (s) => s.best_test_score ?? 0, target: 100 },
  'perfect_streak_3': { current: (s) => s.perfect_test_streak ?? 0, target: 3 },
  'first_test': { current: (s) => s.tests_completed ?? 0, target: 1 },
  
  // Performance badges
  'daily_goal': { current: (s) => s.cards_mastered_today ?? 0, target: 10 },
  'daily_goal_streak_7': { current: (s) => s.daily_goal_streak ?? 0, target: 7 },
  'daily_goal_streak_30': { current: (s) => s.daily_goal_streak ?? 0, target: 30 },
  'overachiever': { current: (s) => s.cards_mastered_today ?? 0, target: 50 },
  'speed_learner': { current: () => 0, target: 1 }, // Event-based
  'night_owl': { current: () => 0, target: 1 }, // Event-based
  'early_bird': { current: () => 0, target: 1 }, // Event-based
  'weekend_warrior': { current: () => 0, target: 1 }, // Event-based
  
  // Social badges
  'friend_first': { current: (s) => s.friends_count ?? 0, target: 1 },
  'friend_5': { current: (s) => s.friends_count ?? 0, target: 5 },
  'friend_10': { current: (s) => s.friends_count ?? 0, target: 10 },
  'challenge_won': { current: (s) => s.challenges_won ?? 0, target: 1 },
  'challenge_5': { current: (s) => s.challenges_won ?? 0, target: 5 },
  'challenge_10': { current: (s) => s.challenges_won ?? 0, target: 10 },
  'share_stack': { current: (s) => s.stacks_shared ?? 0, target: 1 },
  'influencer': { current: (s) => s.stack_copy_count ?? 0, target: 10 },
  
  // Special badges
  'early_adopter': { current: () => 0, target: 1 }, // Manual award
  'polyglot_2': { current: (s) => s.languages_count ?? 0, target: 2 },
  'polyglot_5': { current: (s) => s.languages_count ?? 0, target: 5 },
  'premium_member': { current: (s) => s.is_premium ? 1 : 0, target: 1 },
};

export interface BadgeStats {
  current_streak: number;
  longest_streak?: number;
  total_cards_mastered: number;
  total_stacks_completed: number;
  friends_count?: number;
  challenges_won?: number;
  stacks_shared?: number;
  best_test_score?: number;
  ice_breaker_count?: number;
  tests_completed?: number;
  perfect_test_streak?: number;
  cards_mastered_today?: number; // Replaces daily_cards_learned
  daily_goal_streak?: number;
  languages_count?: number;
  is_premium?: boolean;
  stack_copy_count?: number;
}

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

const categoryColors: Record<Badge['category'], { bg: string; text: string; border: string; glow: string }> = {
  streak: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-orange-500/50' },
  cards: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/50' },
  stacks: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-green-500/50' },
  social: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/50' },
  special: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/50' },
  recovery: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/50' },
  performance: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', glow: 'shadow-pink-500/50' },
};

const categoryLabels: Record<Badge['category'], string> = {
  streak: 'Streak',
  cards: 'Cards',
  stacks: 'Stacks',
  social: 'Social',
  special: 'Special',
  recovery: 'Recovery',
  performance: 'Performance',
};

interface BadgeWithProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: Badge['category'];
  requirement: string;
  isEarned: boolean;
  earnedAt?: string;
  progress: number; // 0-100
  currentValue: number;
  targetValue: number;
}

interface Props {
  earnedBadges: Badge[];
  stats: BadgeStats;
  selectedCategory?: Badge['category'] | 'all';
  showOnlyUpcoming?: boolean;
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  compact?: boolean;
}

export default function BadgeProgress({ 
  earnedBadges, 
  stats, 
  selectedCategory = 'all',
  showOnlyUpcoming = false,
  maxDisplay,
  size = 'md',
  showProgress = true,
  compact = false,
}: Props) {
  const earnedBadgeIds = new Set(earnedBadges.map(b => b.id));
  
  // Build list of all badges with progress
  const allBadges: BadgeWithProgress[] = Object.entries(BADGE_DEFINITIONS).map(([id, def]) => {
    const isEarned = earnedBadgeIds.has(id);
    const earnedBadge = earnedBadges.find(b => b.id === id);
    const threshold = BADGE_THRESHOLDS[id];
    
    let progress = 0;
    let currentValue = 0;
    let targetValue = 1;
    
    if (threshold) {
      currentValue = threshold.current(stats);
      targetValue = threshold.target;
      progress = isEarned ? 100 : Math.min(100, Math.round((currentValue / targetValue) * 100));
    }
    
    return {
      id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      requirement: def.requirement,
      isEarned,
      earnedAt: earnedBadge?.earned_at,
      progress,
      currentValue,
      targetValue,
    };
  });
  
  // Filter by category
  let filteredBadges = selectedCategory === 'all' 
    ? allBadges 
    : allBadges.filter(b => b.category === selectedCategory);
  
  // Filter to only show upcoming badges (not earned, with some progress)
  if (showOnlyUpcoming) {
    filteredBadges = filteredBadges
      .filter(b => !b.isEarned && b.progress > 0)
      .sort((a, b) => b.progress - a.progress);
  } else {
    // Sort: earned first, then by progress
    filteredBadges = filteredBadges.sort((a, b) => {
      if (a.isEarned && !b.isEarned) return -1;
      if (!a.isEarned && b.isEarned) return 1;
      return b.progress - a.progress;
    });
  }
  
  // Apply max display limit
  if (maxDisplay) {
    filteredBadges = filteredBadges.slice(0, maxDisplay);
  }
  
  const sizeClasses = {
    sm: { badge: 'h-10 w-10', icon: 'h-4 w-4', check: 'h-3 w-3' },
    md: { badge: 'h-14 w-14', icon: 'h-6 w-6', check: 'h-4 w-4' },
    lg: { badge: 'h-18 w-18', icon: 'h-8 w-8', check: 'h-5 w-5' },
  };
  
  if (filteredBadges.length === 0) {
    return (
      <div className="text-sm italic text-center py-4" style={{ color: 'var(--text-muted)' }}>
        {showOnlyUpcoming ? 'No badges in progress' : 'No badges available'}
      </div>
    );
  }
  
  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {filteredBadges.map((badge) => {
            const IconComponent = iconMap[badge.icon] || Trophy;
            const colors = categoryColors[badge.category];
            
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      sizeClasses[size].badge,
                      'rounded-full flex items-center justify-center border relative cursor-help transition-all',
                      badge.isEarned
                        ? `${colors.bg} ${colors.text} ${colors.border} shadow-lg ${colors.glow}`
                        : 'bg-slate-800/50 text-slate-500 border-slate-700 grayscale'
                    )}
                  >
                    <IconComponent className={sizeClasses[size].icon} />
                    {badge.isEarned && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <Check className={sizeClasses[size].check} />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="text-center">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{badge.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{badge.description}</p>
                    {badge.isEarned ? (
                      <p className="text-xs mt-1" style={{ color: 'var(--accent-green)' }}>
                        Earned {new Date(badge.earnedAt!).toLocaleDateString()}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span>{badge.requirement}</span>
                          <span>{badge.currentValue}/{badge.targetValue}</span>
                        </div>
                        <Progress value={badge.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredBadges.map((badge) => {
        const IconComponent = iconMap[badge.icon] || Trophy;
        const colors = categoryColors[badge.category];
        
        return (
          <div
            key={badge.id}
            className={cn(
              'rounded-2xl p-4 border transition-all',
              badge.isEarned
                ? `${colors.bg} ${colors.border} shadow-lg`
                : 'bg-slate-800/30 border-slate-700/50'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center relative',
                  badge.isEarned
                    ? `${colors.bg} ${colors.text}`
                    : 'bg-slate-700/50 text-slate-500'
                )}
              >
                {badge.isEarned ? (
                  <IconComponent className="h-6 w-6" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
                {badge.isEarned && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  'font-semibold truncate',
                  badge.isEarned ? 'text-white' : 'text-slate-400'
                )}>
                  {badge.name}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {badge.description}
                </p>
              </div>
            </div>
            
            {showProgress && !badge.isEarned && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{badge.requirement}</span>
                  <span className="font-medium">{badge.currentValue}/{badge.targetValue}</span>
                </div>
                <Progress 
                  value={badge.progress} 
                  className="h-2"
                />
              </div>
            )}
            
            {badge.isEarned && badge.earnedAt && (
              <p className="text-xs text-slate-500 mt-2">
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper to get badges closest to being earned
export function getClosestBadges(stats: BadgeStats, earnedBadges: Badge[], count: number = 4): BadgeWithProgress[] {
  const earnedBadgeIds = new Set(earnedBadges.map(b => b.id));
  
  const upcomingBadges: BadgeWithProgress[] = Object.entries(BADGE_DEFINITIONS)
    .filter(([id]) => !earnedBadgeIds.has(id))
    .map(([id, def]) => {
      const threshold = BADGE_THRESHOLDS[id];
      let progress = 0;
      let currentValue = 0;
      let targetValue = 1;
      
      if (threshold) {
        currentValue = threshold.current(stats);
        targetValue = threshold.target;
        progress = Math.min(100, Math.round((currentValue / targetValue) * 100));
      }
      
      return {
        id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        requirement: def.requirement,
        isEarned: false,
        progress,
        currentValue,
        targetValue,
      };
    })
    .filter(b => b.progress > 0) // Only show badges with some progress
    .sort((a, b) => b.progress - a.progress)
    .slice(0, count);
  
  return upcomingBadges;
}

// Category filter component
export function BadgeCategoryFilter({ 
  selectedCategory, 
  onSelect,
  earnedCounts,
}: { 
  selectedCategory: Badge['category'] | 'all';
  onSelect: (category: Badge['category'] | 'all') => void;
  earnedCounts?: Record<Badge['category'], number>;
}) {
  const categories: (Badge['category'] | 'all')[] = ['all', 'streak', 'cards', 'stacks', 'performance', 'social', 'recovery', 'special'];
  
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const colors = cat === 'all' ? null : categoryColors[cat];
        const isSelected = selectedCategory === cat;
        const count = cat === 'all' 
          ? Object.values(earnedCounts || {}).reduce((a, b) => a + b, 0)
          : earnedCounts?.[cat] ?? 0;
        
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              isSelected
                ? colors
                  ? `${colors.bg} ${colors.text} ${colors.border} border`
                  : 'bg-white/10 text-white border border-white/20'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            )}
          >
            {cat === 'all' ? 'All' : categoryLabels[cat]}
            {earnedCounts && (
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}


