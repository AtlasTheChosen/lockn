'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/hooks/use-session';
import DashboardTabs from '@/components/dashboard/DashboardTabs';
import StreakTutorial from '@/components/tutorial/StreakTutorial';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DisplayNameModal from '@/components/auth/DisplayNameModal';
import { AppLayout } from '@/components/layout';
import { isDeadlinePassed, STREAK_DAILY_REQUIREMENT, getTodayDate } from '@/lib/streak';
import { useBadgeChecker, buildBadgeStats } from '@/hooks/useBadgeChecker';
import { Badge } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user: sessionUser, profile: sessionProfile, loading: sessionLoading } = useSession();
  const { checkAndAwardBadges } = useBadgeChecker();
  
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsDisplayName, setNeedsDisplayName] = useState(false);
  const [showStreakTutorial, setShowStreakTutorial] = useState(false);
  const [data, setData] = useState<{
    user: any;
    profile: any;
    stacks: any[];
    stats: any;
    userName: string;
  }>({
    user: null,
    profile: null,
    stacks: [],
    stats: null,
    userName: 'Guest',
  });

  const loadDashboardData = useCallback(async (userId: string, userEmail?: string) => {
    const supabase = createClient();
    console.log('[DBG] loadDashboardData start', { userId, hasSessionProfile: !!sessionProfile });
    // #region agent log
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix-1',hypothesisId:'H1',location:'app/dashboard/page.tsx:loadDashboardData',message:'start loadDashboardData',data:{userId,hasSessionProfile:!!sessionProfile},timestamp:Date.now()})}).catch((e)=>{console.warn('[DBG] log fail start', e?.message);});
    // #endregion
    
    try {
      setError(null);
      
      // Fetch profile
      // Fetch profile
      let profile = sessionProfile;
      if (!profile) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          if (profileError.code === 'PGRST116' || !profileData) {
            const { data: newProfile } = await supabase
              .from('user_profiles')
              .insert({ id: userId, email: userEmail })
              .select()
              .single();
            profile = newProfile;
          }
        } else {
          profile = profileData;
        }
      }

      // Create profile if still missing
      if (!profile) {
        try {
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({ id: userId, email: userEmail })
            .select()
            .single();
          profile = newProfile;
        } catch (e) {
          console.warn('[Dashboard] Could not create profile:', e);
        }
      }

      console.log('[DBG] after profile', { hasProfile: !!profile });
      // #region agent log
      fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix-1',hypothesisId:'H2',location:'app/dashboard/page.tsx:loadDashboardData',message:'after profile',data:{hasProfile:!!profile},timestamp:Date.now()})}).catch((e)=>{console.warn('[DBG] log fail after profile', e?.message);});
      // #endregion

      // Fetch stacks
      const { data: stacksData, error: stacksError } = await supabase
        .from('card_stacks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (stacksError) {
        console.error('[Dashboard] Stacks error:', stacksError.message);
      }

      console.log('[DBG] after stacks', { stacksCount: stacksData?.length ?? null, stacksError: stacksError?.message ?? null });
      // #region agent log
      fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix-1',hypothesisId:'H2',location:'app/dashboard/page.tsx:loadDashboardData',message:'after stacks',data:{stacksCount:stacksData?.length ?? null,stacksError:stacksError?.message ?? null},timestamp:Date.now()})}).catch((e)=>{console.warn('[DBG] log fail after stacks', e?.message);});
      // #endregion

      // Fetch stats
      let stats = null;
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (statsError) {
        try {
          const { data: newStats } = await supabase
            .from('user_stats')
            .insert({ user_id: userId })
            .select()
            .single();
          stats = newStats;
        } catch (e) {
          console.warn('[Dashboard] Could not create stats:', e);
        }
      } else {
        stats = statsData;
      }

      console.log('[DBG] after stats', { hasStats: !!stats, statsError: statsError?.message ?? null });
      // #region agent log
      fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix-1',hypothesisId:'H3',location:'app/dashboard/page.tsx:loadDashboardData',message:'after stats',data:{hasStats:!!stats,statsError:statsError?.message ?? null},timestamp:Date.now()})}).catch((e)=>{console.warn('[DBG] log fail after stats', e?.message);});
      // #endregion

      const userName = profile?.display_name || userEmail?.split('@')[0] || 'Guest';

      // Check for overdue test deadlines and freeze streak if needed
      if (stacksData && stats) {
        const overdueStacks = stacksData.filter(
          (stack: any) => 
            stack.test_deadline && 
            isDeadlinePassed(stack.test_deadline) &&
            (stack.test_progress ?? 0) < 100 &&
            stack.mastered_count === stack.card_count
        );

        const overdueStackIds = overdueStacks.map((s: any) => s.id);
        const currentFrozenStacks = stats.streak_frozen_stacks || [];
        
        const newOverdueStacks = overdueStackIds.filter(
          (id: string) => !currentFrozenStacks.includes(id)
        );

        if (newOverdueStacks.length > 0 || (overdueStackIds.length > 0 && !stats.streak_frozen)) {
          const updatedFrozenStacks = Array.from(new Set([...currentFrozenStacks, ...overdueStackIds]));
          
          const { error: freezeError } = await supabase
            .from('user_stats')
            .update({
              streak_frozen: true,
              streak_frozen_stacks: updatedFrozenStacks,
            })
            .eq('user_id', userId);

          if (!freezeError) {
            stats.streak_frozen = true;
            stats.streak_frozen_stacks = updatedFrozenStacks;
          }
        }
      }

      // Check if streak should be reset (new day and didn't meet yesterday's requirement)
      if (stats && !stats.streak_frozen) {
        const today = getTodayDate();
        const lastActiveDate = stats.daily_cards_date;
        
        if (lastActiveDate && lastActiveDate !== today) {
          const yesterdayCards = stats.daily_cards_learned || 0;
          
          if (yesterdayCards < STREAK_DAILY_REQUIREMENT) {
            const { error: resetError } = await supabase
              .from('user_stats')
              .update({
                current_streak: 0,
                daily_cards_learned: 0,
                daily_cards_date: today,
              })
              .eq('user_id', userId);

            if (!resetError) {
              stats.current_streak = 0;
              stats.daily_cards_learned = 0;
              stats.daily_cards_date = today;
            }
          } else {
            const { error: resetError } = await supabase
              .from('user_stats')
              .update({
                daily_cards_learned: 0,
                daily_cards_date: today,
              })
              .eq('user_id', userId);

            if (!resetError) {
              stats.daily_cards_learned = 0;
              stats.daily_cards_date = today;
            }
          }
        }
      }

      setData({
        user: { id: userId, email: userEmail },
        profile,
        stacks: stacksData || [],
        stats,
        userName,
      });

      // Check for new badges
      if (stats && profile) {
        const completedStacks = (stacksData || []).filter((s: any) => s.is_completed);
        const badgeStats = buildBadgeStats(stats, {
          friends_count: 0,
          languages_count: profile?.languages_learning?.length ?? 0,
          is_premium: profile?.is_premium ?? false,
          tests_completed: completedStacks.length,
        });
        
        const existingBadges = (profile?.badges || []) as Badge[];
        await checkAndAwardBadges(userId, badgeStats, existingBadges);
      }

      if (!profile?.display_name) {
        setNeedsDisplayName(true);
      }
      
    } catch (err: any) {
      console.error('[Dashboard] Error loading data:', err);
      setError(err.message || 'Failed to load dashboard data');
      console.log('[DBG] catch loadDashboardData', { error: err?.message ?? 'unknown' });
      // #region agent log
      fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix-1',hypothesisId:'H4',location:'app/dashboard/page.tsx:loadDashboardData',message:'catch loadDashboardData',data:{error:err?.message ?? 'unknown'},timestamp:Date.now()})}).catch((e)=>{console.warn('[DBG] log fail catch', e?.message);});
      // #endregion
    } finally {
      setDataLoading(false);
      console.log('[DBG] finally loadDashboardData setDataLoading false');
      // #region agent log
      fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix-1',hypothesisId:'H1',location:'app/dashboard/page.tsx:loadDashboardData',message:'finally loadDashboardData',data:{dataLoading:false},timestamp:Date.now()})}).catch((e)=>{console.warn('[DBG] log fail finally', e?.message);});
      // #endregion
    }
  }, [sessionProfile, checkAndAwardBadges]);

  useEffect(() => {
    console.log('[DBG] render state vals', 'sessionLoading', sessionLoading, 'dataLoading', dataLoading, 'hasUser', !!sessionUser, 'hasProfile', !!sessionProfile, 'error', error);
  }, [sessionLoading, dataLoading, error, sessionUser, sessionProfile]);

  // Prevent server bailout: always render client pathway when authenticated is detected
  if (!sessionLoading && sessionUser) {
    // if client-side and we already have user, ensure dataLoading triggers client fetch
  }

  useEffect(() => {
    if (sessionLoading) return;

    if (!sessionUser) {
      console.log('[DBG] load effect: no user, redirect login');
      router.push('/auth/login');
      return;
    }

    console.log('[DBG] load effect: invoking loadDashboardData');
    loadDashboardData(sessionUser.id, sessionUser.email);
  }, [sessionUser, sessionLoading, router, loadDashboardData]);

  const handleRefresh = useCallback(() => {
    if (sessionUser) {
      setDataLoading(true);
      loadDashboardData(sessionUser.id, sessionUser.email);
    }
  }, [sessionUser, loadDashboardData]);

  // Loading state
  if (sessionLoading || (dataLoading && !error)) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2 bg-slate-200" />
            <Skeleton className="h-5 w-96 bg-slate-200" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-talka-sm">
                <Skeleton className="h-4 w-20 mb-4 bg-slate-200" />
                <Skeleton className="h-10 w-16 bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-talka-sm">
            <Skeleton className="h-96 w-full bg-slate-100" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-red-700 mb-2">Error Loading Dashboard</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
            <Button 
              onClick={handleRefresh} 
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

  const handleDisplayNameSet = (displayName: string) => {
    setNeedsDisplayName(false);
    setData(prev => ({
      ...prev,
      profile: { ...prev.profile, display_name: displayName },
      userName: displayName,
    }));
  };

  return (
    <AppLayout>
      {/* Streak Tutorial */}
      {showStreakTutorial && (
        <StreakTutorial 
          onComplete={() => setShowStreakTutorial(false)}
          onSkip={() => setShowStreakTutorial(false)}
        />
      )}

      {/* Display name modal */}
      {needsDisplayName && data.user?.id && (
        <DisplayNameModal 
          userId={data.user.id} 
          onComplete={handleDisplayNameSet} 
        />
      )}
      
      <DashboardTabs
        stacks={data.stacks}
        stats={data.stats}
        profile={data.profile}
        userId={data.user?.id || ''}
        userName={data.userName}
        onUpdate={handleRefresh}
        onShowTutorial={() => setShowStreakTutorial(true)}
      />
    </AppLayout>
  );
}
