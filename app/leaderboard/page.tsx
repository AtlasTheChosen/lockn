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
  current_week_cards: number;
  weekly_average: number;
  total_stacks_completed: number;
}

type FilterType = 'weekly_avg' | 'this_week' | 'stacks';

export default function LeaderboardPage() {
  const router = useRouter();
  const { user: sessionUser, accessToken, loading: sessionLoading } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('weekly_avg');

  const loadLeaderboardData = useCallback(async (token: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[Leaderboard] Starting load, token length:', token?.length || 0);
    
    try {
      setError(null);
      
      // Use user's access token for RLS
      const authToken = token || supabaseKey!;
      console.log('[Leaderboard] Using auth token, first 20 chars:', authToken?.substring(0, 20));
      
      // Fetch profiles using native fetch
      const profilesUrl = `${supabaseUrl}/rest/v1/user_profiles?select=id,display_name,avatar_url&limit=50`;
      console.log('[Leaderboard] Fetching profiles from:', profilesUrl);
      
      const profilesResponse = await fetch(profilesUrl, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[Leaderboard] Profiles response status:', profilesResponse.status);
      
      if (!profilesResponse.ok) {
        const errorText = await profilesResponse.text();
        console.error('[Leaderboard] Profiles error body:', errorText);
        throw new Error(`Failed to fetch profiles: ${profilesResponse.status} - ${errorText}`);
      }
      
      const profilesData = await profilesResponse.json();
      console.log('[Leaderboard] Profiles received:', profilesData?.length || 0, profilesData);

      // Fetch stats using native fetch
      const statsResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_stats?select=user_id,current_week_cards,weekly_cards_history,total_stacks_completed`,
        {
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const statsData = statsResponse.ok ? await statsResponse.json() : [];
      
      const statsMap = new Map(statsData?.map((s: any) => [s.user_id, s]) || []);
      
      const combinedUsers: LeaderboardUser[] = (profilesData || []).map((profile: any) => {
        const userStats = statsMap.get(profile.id) as any;
        const weeklyHistory = userStats?.weekly_cards_history || [];
        return {
          id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          current_week_cards: userStats?.current_week_cards || 0,
          weekly_average: calculateWeeklyAverage(weeklyHistory),
          total_stacks_completed: userStats?.total_stacks_completed || 0,
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
    console.log('[Leaderboard] useEffect - sessionLoading:', sessionLoading, 'sessionUser:', !!sessionUser, 'accessToken:', !!accessToken);
    
    if (sessionLoading) {
      console.log('[Leaderboard] Still loading session, waiting...');
      return;
    }

    if (!sessionUser || !accessToken) {
      console.log('[Leaderboard] No user or token, redirecting to login');
      router.push('/auth/login');
      return;
    }

    console.log('[Leaderboard] Loading data with user:', sessionUser.id);
    setCurrentUserId(sessionUser.id);
    loadLeaderboardData(accessToken);
  }, [sessionUser, accessToken, sessionLoading, router, loadLeaderboardData]);

  const getSortedUsers = (metric: FilterType) => {
    return [...users].sort((a, b) => {
      switch (metric) {
        case 'weekly_avg':
          return b.weekly_average - a.weekly_average;
        case 'this_week':
          return b.current_week_cards - a.current_week_cards;
        case 'stacks':
          return b.total_stacks_completed - a.total_stacks_completed;
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
      case 'weekly_avg':
        return user.weekly_average;
      case 'this_week':
        return user.current_week_cards;
      case 'stacks':
        return user.total_stacks_completed;
    }
  };

  const getLabel = (metric: FilterType) => {
    switch (metric) {
      case 'weekly_avg':
        return 'cards/week';
      case 'this_week':
        return 'cards this week';
      case 'stacks':
        return 'stacks completed';
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
            onClick={() => setActiveFilter('weekly_avg')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
              activeFilter === 'weekly_avg'
                ? 'bg-slate-800 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-talka-purple hover:-translate-y-0.5'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            📈 Avg Passed
          </button>
          <button
            onClick={() => setActiveFilter('this_week')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
              activeFilter === 'this_week'
                ? 'bg-slate-800 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-talka-purple hover:-translate-y-0.5'
            }`}
          >
            <Calendar className="h-4 w-4" />
            📅 Passed/Week
          </button>
          <button
            onClick={() => setActiveFilter('stacks')}
            className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
              activeFilter === 'stacks'
                ? 'bg-slate-800 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-talka-purple hover:-translate-y-0.5'
            }`}
          >
            <Target className="h-4 w-4" />
            📚 Stacks
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
