'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Calendar, Target, ArrowLeft, Flame, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';

interface LeaderboardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  current_week_cards: number;
  total_cards_mastered: number;
  // Streak system v2 fields
  current_streak: number;
  longest_streak: number;
  streak_frozen: boolean;
}

type FilterType = 'longest_streak' | 'this_week' | 'total';

export default function LeaderboardPage() {
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('longest_streak');

  const loadLeaderboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Use server-side API route that bypasses RLS (with cache-busting)
      const response = await fetch(`/api/leaderboard?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }
      
      const { profiles: profilesData, stats: statsData } = await response.json();
      
      const statsMap = new Map(statsData?.map((s: any) => [s.user_id, s]) || []);
      
      const combinedUsers: LeaderboardUser[] = (profilesData || []).map((profile: any) => {
        const userStats = statsMap.get(profile.id) as any;
        return {
          id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          current_week_cards: userStats?.current_week_cards || 0,
          total_cards_mastered: userStats?.total_cards_mastered || 0,
          // Streak system v2 fields
          current_streak: userStats?.current_streak || 0,
          longest_streak: userStats?.longest_streak || 0,
          streak_frozen: userStats?.streak_frozen || false,
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
        case 'longest_streak':
          // Sort by longest_streak (primary), current_streak (secondary)
          if (b.longest_streak !== a.longest_streak) {
            return b.longest_streak - a.longest_streak;
          }
          return b.current_streak - a.current_streak;
        case 'this_week':
          return b.current_week_cards - a.current_week_cards;
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
      case 'longest_streak':
        return user.longest_streak;
      case 'this_week':
        return user.current_week_cards;
      case 'total':
        return user.total_cards_mastered;
    }
  };

  const getLabel = (metric: FilterType) => {
    switch (metric) {
      case 'longest_streak':
        return 'day best streak';
      case 'this_week':
        return 'cards this week';
      case 'total':
        return 'total mastered';
    }
  };

  // Loading state
  if (sessionLoading || loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-3xl p-5" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                  <Skeleton className="h-14 w-14 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    <Skeleton className="h-4 w-24" style={{ backgroundColor: 'var(--bg-secondary)' }} />
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
          <div className="rounded-3xl p-8 text-center" style={{ backgroundColor: 'rgba(255, 75, 75, 0.1)', border: '2px solid rgba(255, 75, 75, 0.3)' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--accent-red)' }} />
            <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--accent-red)' }}>Error Loading Leaderboard</h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <Button 
              onClick={loadLeaderboardData} 
              className="text-white font-bold rounded-2xl px-6 py-3"
              style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold hover:-translate-x-1 transition-all mb-6"
            style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-4xl font-semibold flex items-center gap-3" style={{ color: 'var(--accent-orange)' }}>
            🏆 Leaderboard
          </h1>
          <p className="font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
            See how you rank against other learners
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 animate-fade-in stagger-1">
          <button
            onClick={() => setActiveFilter('longest_streak')}
            className="px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2"
            style={activeFilter === 'longest_streak' 
              ? { backgroundColor: 'var(--accent-orange)', color: 'white', boxShadow: '0 4px 0 #c2410c' }
              : { backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)', color: 'var(--text-secondary)' }
            }
          >
            <Flame className="h-4 w-4" />
            🔥 Best Streak
          </button>
          <button
            onClick={() => setActiveFilter('this_week')}
            className="px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2"
            style={activeFilter === 'this_week' 
              ? { backgroundColor: 'var(--accent-blue)', color: 'white', boxShadow: '0 4px 0 #0369a1' }
              : { backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)', color: 'var(--text-secondary)' }
            }
          >
            <Calendar className="h-4 w-4" />
            📅 This Week
          </button>
          <button
            onClick={() => setActiveFilter('total')}
            className="px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2"
            style={activeFilter === 'total' 
              ? { backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 4px 0 var(--accent-green-dark)' }
              : { backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)', color: 'var(--text-secondary)' }
            }
          >
            <Target className="h-4 w-4" />
            📚 Total
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-4">
          {sortedUsers.length === 0 ? (
            <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-6xl mb-4 opacity-50">🏆</div>
              <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>No users on the leaderboard yet</h3>
            </div>
          ) : (
            sortedUsers.map((user, index) => {
              const isCurrentUser = user.id === currentUserId;
              const rank = index + 1;
              
              return (
                <div
                  key={user.id}
                  className="rounded-[20px] p-5 flex items-center gap-5 transition-all hover:translate-x-2 animate-fade-in"
                  style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    boxShadow: 'var(--shadow-sm)',
                    border: isCurrentUser ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  {/* Rank Badge */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                    style={
                      rank === 1 
                        ? { backgroundColor: 'var(--accent-orange)', color: 'white', boxShadow: '0 3px 0 #c2410c' }
                        : rank === 2 
                          ? { backgroundColor: '#94a3b8', color: 'white' }
                          : rank === 3
                            ? { backgroundColor: '#cd7f32', color: 'white' }
                            : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '2px solid var(--border-color)' }
                    }
                  >
                    {rank === 1 ? '👑' : rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(to bottom right, var(--accent-blue), var(--accent-green))' }}>
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
                    <p className="font-display text-lg font-semibold truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      {user.display_name || 'Anonymous'}
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 text-white text-xs font-bold rounded-lg" style={{ backgroundColor: 'var(--accent-green)' }}>
                          You
                        </span>
                      )}
                      {/* Frozen indicator for streak view */}
                      {user.streak_frozen && activeFilter === 'longest_streak' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-lg" style={{ backgroundColor: 'rgba(28, 176, 246, 0.2)', color: 'var(--accent-blue)' }} title="Streak frozen - pending test">
                          <Snowflake className="h-3 w-3" />
                          Frozen
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      {activeFilter === 'longest_streak' ? (
                        <>
                          🔥 {getValue(user, activeFilter)} {getLabel(activeFilter)}
                          {user.current_streak > 0 && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              (current: {user.current_streak}{user.streak_frozen ? ' ❄️' : ''})
                            </span>
                          )}
                        </>
                      ) : activeFilter === 'this_week' ? (
                        <>📅 {getValue(user, activeFilter)} {getLabel(activeFilter)}</>
                      ) : (
                        <>📚 {getValue(user, activeFilter)} {getLabel(activeFilter)}</>
                      )}
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
