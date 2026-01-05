'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Trophy, TrendingUp, Calendar, Target, ArrowLeft, Crown, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { calculateWeeklyAverage } from '@/lib/weekly-stats';
import { AppLayout } from '@/components/layout';

interface LeaderboardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  daily_cards_learned: number;
  weekly_average: number;
  total_cards_mastered: number;
}

type FilterType = 'today' | 'weekly_avg' | 'total';

export default function LeaderboardPage() {
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');

  const loadLeaderboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Use server-side API route that bypasses RLS
      const response = await fetch('/api/leaderboard');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }
      
      const { profiles: profilesData, stats: statsData } = await response.json();
      
      const statsMap = new Map(statsData?.map((s: any) => [s.user_id, s]) || []);
      
      const combinedUsers: LeaderboardUser[] = (profilesData || []).map((profile: any) => {
        const userStats = statsMap.get(profile.id) as any;
        const weeklyHistory = userStats?.weekly_cards_history || [];
        return {
          id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          daily_cards_learned: userStats?.daily_cards_learned || 0,
          weekly_average: calculateWeeklyAverage(weeklyHistory),
          total_cards_mastered: userStats?.total_cards_mastered || 0,
        };
      });

      setUsers(combinedUsers);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;

    if (!sessionUser) {
      router.push('/');
      return;
    }

    setCurrentUserId(sessionUser.id);
    loadLeaderboardData();
  }, [sessionUser, sessionLoading, router, loadLeaderboardData]);

  // Refresh leaderboard when user returns to tab (catches updates after mastering cards)
  useEffect(() => {
    const handleFocus = () => {
      if (sessionUser && !loading) {
        loadLeaderboardData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sessionUser, loading, loadLeaderboardData]);

  const getSortedUsers = (metric: FilterType) => {
    return [...users].sort((a, b) => {
      switch (metric) {
        case 'today':
          return b.daily_cards_learned - a.daily_cards_learned;
        case 'weekly_avg':
          return b.weekly_average - a.weekly_average;
        case 'total':
          return b.total_cards_mastered - a.total_cards_mastered;
        default:
          return 0;
      }
    });
  };

  const getInitials = (user: LeaderboardUser) => {
    if (user.display_name) {
      return user.display_name.substring(0, 1).toUpperCase();
    }
    return '?';
  };

  const getValue = (user: LeaderboardUser, metric: FilterType) => {
    switch (metric) {
      case 'today':
        return user.daily_cards_learned;
      case 'weekly_avg':
        return user.weekly_average;
      case 'total':
        return user.total_cards_mastered;
    }
  };

  const getLabel = (metric: FilterType) => {
    switch (metric) {
      case 'today':
        return 'mastered today';
      case 'weekly_avg':
        return 'cards/week avg';
      case 'total':
        return 'total mastered';
    }
  };

  // Loading state
  if (sessionLoading || loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-200" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-5 shadow-talka-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full bg-slate-200" />
                  <Skeleton className="h-14 w-14 rounded-full bg-slate-200" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2 bg-slate-200" />
                    <Skeleton className="h-4 w-24 bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!sessionUser) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-red-700 mb-2">Error Loading Leaderboard</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button 
              onClick={loadLeaderboardData} 
              className="bg-gradient-purple-pink text-white font-bold rounded-2xl px-6 py-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const sortedUsers = getSortedUsers(activeFilter);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl font-semibold text-slate-700 hover:border-talka-purple hover:-translate-x-1 transition-all mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-4xl font-semibold gradient-text flex items-center gap-3">
            🏆 Leaderboard
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            See how you rank against other learners
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 animate-fade-in stagger-1">
          <button
            onClick={() => setActiveFilter('today')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
              activeFilter === 'today'
                ? 'bg-slate-800 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-talka-purple hover:-translate-y-0.5'
            }`}
          >
            <Calendar className="h-4 w-4" />
            🔥 Today
          </button>
          <button
            onClick={() => setActiveFilter('weekly_avg')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
              activeFilter === 'weekly_avg'
                ? 'bg-slate-800 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-talka-purple hover:-translate-y-0.5'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            📈 Avg/Week
          </button>
          <button
            onClick={() => setActiveFilter('total')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
              activeFilter === 'total'
                ? 'bg-slate-800 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-talka-purple hover:-translate-y-0.5'
            }`}
          >
            <Target className="h-4 w-4" />
            🏆 Total
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-4">
          {sortedUsers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-talka-sm">
              <div className="text-6xl mb-4 opacity-50">🏆</div>
              <h3 className="font-display text-xl font-semibold text-slate-700">No users on the leaderboard yet</h3>
            </div>
          ) : (
            sortedUsers.map((user, index) => {
              const isCurrentUser = user.id === currentUserId;
              const rank = index + 1;
              
              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-[20px] p-5 flex items-center gap-5 transition-all hover:translate-x-2 hover:shadow-talka-md animate-fade-in ${
                    isCurrentUser ? 'border-2 border-talka-purple bg-gradient-to-r from-talka-purple/5 to-talka-pink/5' : 'shadow-talka-sm'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    rank === 1 
                      ? 'bg-gradient-orange-yellow text-white shadow-orange' 
                      : rank === 2 
                        ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' 
                        : 'bg-slate-100 text-slate-500 border-2 border-slate-200'
                  }`}>
                    {rank === 1 ? '👑' : rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-cyan-blue flex items-center justify-center font-bold text-xl text-white shadow-blue flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.display_name || 'User'} 
                        className="w-full h-full object-cover scale-110"
                      />
                    ) : (
                      getInitials(user)
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg font-semibold text-slate-800 truncate">
                      {user.display_name || 'Anonymous'}
                      {isCurrentUser && (
                        <span className="ml-2 px-2 py-0.5 bg-gradient-purple-pink text-white text-xs font-bold rounded-lg">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-slate-500 text-sm font-medium">
                      📊 {getValue(user, activeFilter)} {getLabel(activeFilter)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
