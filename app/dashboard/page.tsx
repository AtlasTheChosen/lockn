'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const { user: sessionUser, profile: sessionProfile, accessToken, loading: sessionLoading } = useSession();
  const { checkAndAwardBadges } = useBadgeChecker();
  
  const loadingRef = useRef(false);
  const trialMigrationRef = useRef(false);
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

  // Migrate trial data from localStorage to Supabase (for OAuth users)
  const migrateTrialData = useCallback(async (userId: string) => {
    if (trialMigrationRef.current) return null;
    trialMigrationRef.current = true;

    try {
      const trialCardsStr = localStorage.getItem('lockn-trial-cards');
      const trialScenario = localStorage.getItem('lockn-trial-scenario');
      const trialLanguage = localStorage.getItem('lockn-trial-language') || 'Spanish';
      const trialLevel = localStorage.getItem('lockn-trial-level') || 'B1';
      const trialRatingsStr = localStorage.getItem('lockn-trial-ratings');

      if (!trialCardsStr || !trialScenario) {
        return null;
      }

      const supabase = createClient();
      const trialCards = JSON.parse(trialCardsStr);
      const trialRatings = trialRatingsStr ? JSON.parse(trialRatingsStr) : {};

      // Capitalize the first letter of each word in the title
      const capitalizedTitle = trialScenario
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Create the card stack
      const { data: stack, error: stackError } = await supabase
        .from('card_stacks')
        .insert({
          user_id: userId,
          title: capitalizedTitle,
          target_language: trialLanguage,
          native_language: 'English',
          card_count: trialCards.length,
          cefr_level: trialLevel,
        })
        .select()
        .single();

      if (stackError || !stack) {
        console.error('[Dashboard] Failed to create trial stack:', stackError);
        return null;
      }

      // Create flashcards with ratings
      const flashcards = trialCards.map((card: any, index: number) => ({
        stack_id: stack.id,
        user_id: userId,
        card_order: index,
        target_phrase: card.targetPhrase,
        native_translation: card.nativeTranslation,
        example_sentence: card.exampleSentence,
        tone_advice: card.toneAdvice,
        user_rating: trialRatings[index] || 0,
        mastery_level: trialRatings[index] >= 4 ? trialRatings[index] - 3 : 0,
      }));

      const { error: cardsError } = await supabase.from('flashcards').insert(flashcards);

      if (cardsError) {
        console.error('[Dashboard] Failed to create trial flashcards:', cardsError);
        await supabase.from('card_stacks').delete().eq('id', stack.id);
        return null;
      }

      // Clear trial data from localStorage
      localStorage.removeItem('lockn-trial-cards');
      localStorage.removeItem('lockn-trial-scenario');
      localStorage.removeItem('lockn-trial-language');
      localStorage.removeItem('lockn-trial-level');
      localStorage.removeItem('lockn-trial-ratings');

      console.log('[Dashboard] Trial data migrated successfully:', stack.id);
      return stack.id;
    } catch (error) {
      console.error('[Dashboard] Error migrating trial data:', error);
      return null;
    }
  }, []);

  // Check for trial data to migrate on mount (for OAuth users)
  useEffect(() => {
    if (sessionUser && !sessionLoading) {
      migrateTrialData(sessionUser.id).then((stackId) => {
        if (stackId) {
          // Redirect to the newly created stack
          router.push(`/stack/${stackId}`);
        }
      });
    }
  }, [sessionUser, sessionLoading, migrateTrialData, router]);

  const loadDashboardData = useCallback(async (userId: string, userEmail?: string) => {
    // Prevent double invocation
    if (loadingRef.current) return;
    loadingRef.current = true;

    const supabase = createClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    try {
      setError(null);
      
      // Use profile from session if available
      let profile = sessionProfile;
      if (!profile) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError && (profileError.code === 'PGRST116' || !profileData)) {
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({ id: userId, email: userEmail })
            .select()
            .single();
          profile = newProfile;
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

      // Fetch stacks using native fetch (Supabase client hangs on Vercel)
      let stacksData: any[] | null = null;
      
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000);
      
      try {
        const url = `${supabaseUrl}/rest/v1/card_stacks?user_id=eq.${userId}&order=created_at.desc&select=*`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          stacksData = await response.json();
        } else {
          console.error('[Dashboard] Stacks fetch error:', response.status);
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        console.error('[Dashboard] Stacks fetch exception:', e?.message);
      }

      // Fetch stats using native fetch
      let stats: any = null;
      
      try {
        const statsUrl = `${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}&select=*`;
        const statsResponse = await fetch(statsUrl, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (statsResponse.ok) {
          const statsArray = await statsResponse.json();
          stats = statsArray?.[0] || null;
          
          // Create stats if not exists
          if (!stats) {
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/user_stats`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey!,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify({ user_id: userId }),
            });
            if (createResponse.ok) {
              const created = await createResponse.json();
              stats = created?.[0] || null;
            }
          }
        }
      } catch (e: any) {
        console.error('[Dashboard] Stats fetch exception:', e?.message);
      }

      const userName = profile?.display_name || userEmail?.split('@')[0] || 'Guest';

      // Check for overdue test deadlines and freeze streak if needed
      // Only freeze if there are NEW overdue stacks (not already tracked)
      if (stacksData && stats && accessToken) {
        const overdueStacks = stacksData.filter(
          (stack: any) => 
            stack.test_deadline && 
            isDeadlinePassed(stack.test_deadline) &&
            (stack.test_progress ?? 0) < 100 &&
            stack.mastered_count === stack.card_count
        );

        const overdueStackIds = overdueStacks.map((s: any) => s.id);
        const currentFrozenStacks = stats.streak_frozen_stacks || [];
        
        // Only freeze for NEW overdue stacks that aren't already tracked
        const newOverdueStacks = overdueStackIds.filter(
          (id: string) => !currentFrozenStacks.includes(id)
        );
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:overdue-check',message:'Checking for overdue stacks',data:{totalStacks:stacksData.length,overdueCount:overdueStacks.length,newOverdueCount:newOverdueStacks.length,currentFrozen:stats.streak_frozen,currentFrozenStacks},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        // Only update if there are genuinely new overdue stacks
        if (newOverdueStacks.length > 0) {
          const updatedFrozenStacks = Array.from(new Set([...currentFrozenStacks, ...overdueStackIds]));
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:freeze-streak',message:'Freezing streak due to new overdue stacks',data:{newOverdueStacks,overdueStackIds,currentFrozenStacks,willSetFrozen:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          
          // Use native fetch for update with proper accessToken
          await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              streak_frozen: true,
              streak_frozen_stacks: updatedFrozenStacks,
            }),
          });

          stats.streak_frozen = true;
          stats.streak_frozen_stacks = updatedFrozenStacks;
        }
      }

      // Check if streak should be reset (new day and didn't meet yesterday's requirement)
      // Note: This applies even when frozen - missing daily cards resets streak to 0
      if (stats && accessToken) {
        const today = getTodayDate();
        const lastActiveDate = stats.daily_cards_date;
        
        if (lastActiveDate && lastActiveDate !== today) {
          const yesterdayCards = stats.daily_cards_learned || 0;
          
          const updates = yesterdayCards < STREAK_DAILY_REQUIREMENT
            ? { current_streak: 0, daily_cards_learned: 0, daily_cards_date: today }
            : { daily_cards_learned: 0, daily_cards_date: today };
          
          await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          Object.assign(stats, updates);
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
      } else if (profile && !profile.has_seen_streak_tutorial) {
        // Show tutorial prompt for users with display name who haven't seen it
        setShowStreakTutorial(true);
      }
      
    } catch (err: any) {
      console.error('[Dashboard] Error loading data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      loadingRef.current = false;
      setDataLoading(false);
    }
  }, [sessionProfile, checkAndAwardBadges]);

  useEffect(() => {
    if (sessionLoading) return;

    if (!sessionUser) {
      router.push('/');
      return;
    }

    setDataLoading(true);
    loadDashboardData(sessionUser.id, sessionUser.email);
  }, [sessionUser, sessionLoading, router, loadDashboardData]);

  const handleRefresh = useCallback(() => {
    if (sessionUser) {
      loadingRef.current = false; // Allow refresh
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

  const handleDisplayNameSet = (displayName: string, showTutorial?: boolean) => {
    setNeedsDisplayName(false);
    if (showTutorial) {
      setShowStreakTutorial(true);
    }
    setData(prev => ({
      ...prev,
      profile: { ...prev.profile, display_name: displayName },
      userName: displayName,
    }));
  };

  const handleTutorialComplete = async () => {
    setShowStreakTutorial(false);
    // Mark tutorial as seen in database
    if (data.user?.id) {
      const supabase = createClient();
      await supabase
        .from('user_profiles')
        .update({ has_seen_streak_tutorial: true })
        .eq('id', data.user.id);
    }
  };

  return (
    <AppLayout>
      {/* Streak Tutorial */}
      {showStreakTutorial && (
        <StreakTutorial 
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialComplete}
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
        accessToken={accessToken || ''}
        onUpdate={handleRefresh}
        onShowTutorial={() => setShowStreakTutorial(true)}
      />
    </AppLayout>
  );
}
