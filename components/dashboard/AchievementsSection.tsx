'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/lib/types';
import { BADGE_DEFINITIONS } from '@/components/social/AchievementBadges';
import { useBadgeChecker, buildBadgeStats } from '@/hooks/useBadgeChecker';
import { Trophy, Flame, BookOpen, Target, Users, Star, Zap, Loader2, Lock, Check, Snowflake, Rocket, Award, Crown, Medal, Globe, Gem, Timer, Moon, Sunrise, Calendar, RefreshCcw, CheckCircle, ClipboardCheck, Share2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BadgeStats {
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

const BADGE_THRESHOLDS: Record<string, { current: (stats: BadgeStats) => number; target: number }> = {
  'streak_3': { current: (s) => s.current_streak, target: 3 },
  'streak_7': { current: (s) => s.current_streak, target: 7 },
  'streak_10': { current: (s) => s.current_streak, target: 10 },
  'streak_30': { current: (s) => s.current_streak, target: 30 },
  'streak_60': { current: (s) => s.current_streak, target: 60 },
  'streak_100': { current: (s) => s.current_streak, target: 100 },
  'streak_365': { current: (s) => s.current_streak, target: 365 },
  'ice_breaker': { current: (s) => s.ice_breaker_count ?? 0, target: 1 },
  'ice_breaker_5': { current: (s) => s.ice_breaker_count ?? 0, target: 5 },
  'clutch_test': { current: () => 0, target: 1 },
  'comeback_kid': { current: () => 0, target: 1 },
  'cards_50': { current: (s) => s.total_cards_mastered, target: 50 },
  'cards_100': { current: (s) => s.total_cards_mastered, target: 100 },
  'cards_250': { current: (s) => s.total_cards_mastered, target: 250 },
  'cards_500': { current: (s) => s.total_cards_mastered, target: 500 },
  'cards_1000': { current: (s) => s.total_cards_mastered, target: 1000 },
  'cards_2500': { current: (s) => s.total_cards_mastered, target: 2500 },
  'cards_5000': { current: (s) => s.total_cards_mastered, target: 5000 },
  'stack_first': { current: (s) => s.total_stacks_completed, target: 1 },
  'stack_5': { current: (s) => s.total_stacks_completed, target: 5 },
  'stack_10': { current: (s) => s.total_stacks_completed, target: 10 },
  'stack_25': { current: (s) => s.total_stacks_completed, target: 25 },
  'stack_50': { current: (s) => s.total_stacks_completed, target: 50 },
  'stack_perfect': { current: (s) => s.best_test_score ?? 0, target: 100 },
  'perfect_streak_3': { current: (s) => s.perfect_test_streak ?? 0, target: 3 },
  'first_test': { current: (s) => s.tests_completed ?? 0, target: 1 },
  'daily_goal': { current: (s) => s.cards_mastered_today ?? 0, target: 10 },
  'daily_goal_streak_7': { current: (s) => s.daily_goal_streak ?? 0, target: 7 },
  'daily_goal_streak_30': { current: (s) => s.daily_goal_streak ?? 0, target: 30 },
  'overachiever': { current: (s) => s.cards_mastered_today ?? 0, target: 50 },
  'speed_learner': { current: () => 0, target: 1 },
  'night_owl': { current: () => 0, target: 1 },
  'early_bird': { current: () => 0, target: 1 },
  'weekend_warrior': { current: () => 0, target: 1 },
  'friend_first': { current: (s) => s.friends_count ?? 0, target: 1 },
  'friend_5': { current: (s) => s.friends_count ?? 0, target: 5 },
  'friend_10': { current: (s) => s.friends_count ?? 0, target: 10 },
  'challenge_won': { current: (s) => s.challenges_won ?? 0, target: 1 },
  'challenge_5': { current: (s) => s.challenges_won ?? 0, target: 5 },
  'challenge_10': { current: (s) => s.challenges_won ?? 0, target: 10 },
  'share_stack': { current: (s) => s.stacks_shared ?? 0, target: 1 },
  'influencer': { current: (s) => s.stack_copy_count ?? 0, target: 10 },
  'early_adopter': { current: () => 0, target: 1 },
  'polyglot_2': { current: (s) => s.languages_count ?? 0, target: 2 },
  'polyglot_5': { current: (s) => s.languages_count ?? 0, target: 5 },
  'premium_member': { current: (s) => s.is_premium ? 1 : 0, target: 1 },
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
  graduationcap: GraduationCap,
};

const categoryConfig: Record<Badge['category'], { 
  label: string; 
  emoji: string;
  gradient: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  iconBg: string;
}> = {
  streak: { 
    label: 'Streak', 
    emoji: '🔥',
    gradient: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50 dark:bg-orange-900/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500',
  },
  cards: { 
    label: 'Cards', 
    emoji: '🎴',
    gradient: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
  },
  stacks: { 
    label: 'Stacks', 
    emoji: '📚',
    gradient: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
  },
  social: { 
    label: 'Social', 
    emoji: '👥',
    gradient: 'from-purple-500 to-violet-500',
    bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-500',
  },
  special: { 
    label: 'Special', 
    emoji: '⭐',
    gradient: 'from-yellow-500 to-orange-500',
    bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
  },
  recovery: { 
    label: 'Recovery', 
    emoji: '❄️',
    gradient: 'from-cyan-500 to-sky-500',
    bgLight: 'bg-cyan-50 dark:bg-cyan-900/20',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-sky-500',
  },
  performance: { 
    label: 'Performance', 
    emoji: '🚀',
    gradient: 'from-pink-500 to-rose-500',
    bgLight: 'bg-pink-50 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    borderColor: 'border-pink-200 dark:border-pink-800',
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
  },
};

interface AchievementsSectionProps {
  userId: string;
  profile?: {
    badges?: Badge[];
    is_premium?: boolean;
    languages_learning?: string[];
  } | null;
}

export default function AchievementsSection({ userId, profile }: AchievementsSectionProps) {
  const { checkAndAwardBadges } = useBadgeChecker();
  
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Badge['category'] | 'all'>('all');

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    async function loadData() {
      try {
        // Fetch user stats
        const statsResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}&select=current_streak,longest_streak,total_cards_mastered,total_stacks_completed,daily_cards_learned,tests_completed,perfect_test_streak,daily_goal_streak,ice_breaker_count`,
          {
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const statsData = statsResponse.ok ? await statsResponse.json() : [];
        const userStats = statsData?.[0];

        // Fetch friends count
        const friendsResponse = await fetch(
          `${supabaseUrl}/rest/v1/friendships?status=eq.accepted&or=(user_id.eq.${userId},friend_id.eq.${userId})&select=id`,
          {
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'count=exact',
            },
          }
        );
        const friendsCount = friendsResponse.ok ? (await friendsResponse.json())?.length ?? 0 : 0;

        const earnedBadges = (profile?.badges || []) as Badge[];
        setBadges(earnedBadges);

        const badgeStats = buildBadgeStats(userStats, {
          friends_count: friendsCount,
          languages_count: profile?.languages_learning?.length ?? 0,
          is_premium: profile?.is_premium ?? false,
        });
        setStats(badgeStats);

        if (userStats) {
          await checkAndAwardBadges(userId, badgeStats, earnedBadges);
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId, profile, checkAndAwardBadges]);

  // Calculate counts
  const earnedCounts: Record<Badge['category'], number> = {
    streak: 0, cards: 0, stacks: 0, social: 0, special: 0, recovery: 0, performance: 0,
  };
  const totalCounts: Record<Badge['category'], number> = {
    streak: 0, cards: 0, stacks: 0, social: 0, special: 0, recovery: 0, performance: 0,
  };
  
  badges.forEach(badge => {
    if (earnedCounts[badge.category] !== undefined) {
      earnedCounts[badge.category]++;
    }
  });
  
  Object.values(BADGE_DEFINITIONS).forEach(def => {
    if (totalCounts[def.category] !== undefined) {
      totalCounts[def.category]++;
    }
  });

  const totalBadges = Object.keys(BADGE_DEFINITIONS).length;
  const earnedTotal = badges.length;
  const progressPercent = totalBadges > 0 ? Math.round((earnedTotal / totalBadges) * 100) : 0;

  // Build badges with progress
  const earnedBadgeIds = new Set(badges.map(b => b.id));
  const allBadges = Object.entries(BADGE_DEFINITIONS).map(([id, def]) => {
    const isEarned = earnedBadgeIds.has(id);
    const earnedBadge = badges.find(b => b.id === id);
    const threshold = BADGE_THRESHOLDS[id];
    
    let progress = 0;
    let currentValue = 0;
    let targetValue = 1;
    
    if (threshold && stats) {
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

  // Filter and sort badges
  const filteredBadges = (selectedCategory === 'all' 
    ? allBadges 
    : allBadges.filter(b => b.category === selectedCategory)
  ).sort((a, b) => {
    if (a.isEarned && !b.isEarned) return -1;
    if (!a.isEarned && b.isEarned) return 1;
    return b.progress - a.progress;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full animate-pulse mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--accent-green), var(--accent-blue))' }}>
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Progress Card - Dashboard-matching gradient */}
      <div className="relative rounded-[20px] p-6 sm:p-8 mb-8 overflow-hidden border-2 border-[var(--border-color)]"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 150, 0, 0.15) 0%, rgba(88, 204, 2, 0.15) 50%, rgba(28, 176, 246, 0.15) 100%)'
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[radial-gradient(circle,rgba(88,204,2,0.2),transparent_60%)] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[radial-gradient(circle,rgba(28,176,246,0.2),transparent_60%)] rounded-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#58cc02] to-[#1cb0f6] rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1 text-[var(--text-primary)]">Your Collection</h2>
                <p className="text-[var(--text-secondary)]">
                  <span className="font-bold text-2xl text-[#58cc02]">{earnedTotal}</span>
                  <span className="mx-1">/</span>
                  <span>{totalBadges} badges</span>
                </p>
              </div>
            </div>
            
            {/* Circular progress */}
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                <circle 
                  cx="40" cy="40" r="32" fill="none" stroke="#58cc02" strokeWidth="6"
                  strokeDasharray={`${progressPercent * 2.01} 201`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-[#58cc02]">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Category stats - scrollable on mobile */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2 -mx-2 px-2">
            {Object.entries(categoryConfig).map(([cat, config]) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as Badge['category'])}
                className={cn(
                  'bg-[var(--bg-card)] rounded-xl p-2 sm:p-3 text-center transition-all hover:bg-[var(--bg-secondary)] flex-shrink-0 min-w-[60px] border border-[var(--border-color)]',
                  selectedCategory === cat && 'ring-2 ring-[#58cc02] bg-[var(--bg-secondary)]'
                )}
              >
                <div className="text-xl mb-0.5">{config.emoji}</div>
                <p className="text-[var(--text-primary)] font-bold text-sm">
                  {earnedCounts[cat as Badge['category']]}/{totalCounts[cat as Badge['category']]}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className="px-4 py-2 rounded-full font-semibold text-sm transition-all"
          style={selectedCategory === 'all'
            ? { backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: 'var(--shadow-md)' }
            : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
          }
        >
          All Badges
        </button>
        {Object.entries(categoryConfig).map(([cat, config]) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat as Badge['category'])}
            className={cn(
              'px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2',
              selectedCategory === cat
                ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                : ''
            )}
            style={selectedCategory !== cat
              ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
              : undefined
            }
          >
            <span>{config.emoji}</span>
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          const IconComponent = iconMap[badge.icon] || Trophy;
          const config = categoryConfig[badge.category];
          
          return (
            <div
              key={badge.id}
              className={cn(
                'rounded-2xl p-4 sm:p-5 transition-all border-2',
                badge.isEarned
                  ? `${config.bgLight} ${config.borderColor} shadow-sm`
                  : ''
              )}
              style={!badge.isEarned ? { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' } : undefined}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Badge Icon */}
                <div
                  className={cn(
                    'w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 relative',
                    badge.isEarned
                      ? `${config.iconBg} shadow-lg`
                      : ''
                  )}
                  style={!badge.isEarned ? { backgroundColor: 'var(--bg-secondary)' } : undefined}
                >
                  {badge.isEarned ? (
                    <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  ) : (
                    <Lock className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'var(--text-muted)' }} />
                  )}
                  {badge.isEarned && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--accent-green)' }}>
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                
                {/* Badge Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'font-bold text-sm sm:text-base mb-0.5',
                    badge.isEarned ? config.textColor : ''
                  )} style={!badge.isEarned ? { color: 'var(--text-primary)' } : undefined}>
                    {badge.name}
                  </h3>
                  <p className="text-xs sm:text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {badge.description}
                  </p>
                </div>
              </div>
              
              {/* Progress or Earned Date */}
              {badge.isEarned ? (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <p className="text-xs sm:text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <Check className="h-4 w-4" style={{ color: 'var(--accent-green)' }} />
                    Earned {new Date(badge.earnedAt!).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span style={{ color: 'var(--text-secondary)' }}>{badge.requirement}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {badge.currentValue}/{badge.targetValue}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div 
                      className={cn('h-full rounded-full transition-all duration-500', `bg-gradient-to-r ${config.gradient}`)}
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No badges found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try selecting a different category</p>
        </div>
      )}
    </div>
  );
}
