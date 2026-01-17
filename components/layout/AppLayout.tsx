'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TopNav, BottomNav } from '@/components/navigation';

// Custom event names for updates
export const PROFILE_UPDATED_EVENT = 'profile-updated';
export const STATS_UPDATED_EVENT = 'stats-updated';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const pathname = usePathname();
  const [streak, setStreak] = useState(0);
  const [streakFrozen, setStreakFrozen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [navDataLoaded, setNavDataLoaded] = useState(false);
  
  // Hide bottom nav on home page for non-logged-in users
  const showBottomNav = isLoggedIn || pathname !== '/';

  const loadUserData = useCallback(async () => {
    // Reset loading state at start of each fetch to prevent flash during navigation
    setNavDataLoaded(false);
    
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user && session?.access_token) {
      setIsLoggedIn(true);
      setUserId(session.user.id);
      const token = session.access_token;
      
      // Get user profile using native fetch
      try {
        const profileRes = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${session.user.id}&select=display_name,avatar_url`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          const profile = profiles?.[0];
          if (profile?.display_name) setDisplayName(profile.display_name);
          if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      } catch (e) {
        console.warn('[AppLayout] Profile fetch error:', e);
      }
      
      // Get user stats for streak using native fetch
      try {
        const statsRes = await fetch(
          `${supabaseUrl}/rest/v1/user_stats?user_id=eq.${session.user.id}&select=current_streak,streak_frozen`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        if (statsRes.ok) {
          const statsArr = await statsRes.json();
          const stats = statsArr?.[0];
          if (stats) {
            setStreak(stats.current_streak || 0);
            setStreakFrozen(stats.streak_frozen || false);
          }
        }
      } catch (e) {
        console.warn('[AppLayout] Stats fetch error:', e);
      }
      // Mark nav data as loaded after stats fetch completes
      setNavDataLoaded(true);
    } else {
      // No session - still mark as loaded (guest mode)
      setNavDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    
    // Listen for profile and stats update events to refresh nav data
    const handleUpdate = () => {
      loadUserData();
    };
    
    window.addEventListener(PROFILE_UPDATED_EVENT, handleUpdate);
    window.addEventListener(STATS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(STATS_UPDATED_EVENT, handleUpdate);
    };
  }, [loadUserData]);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen relative safe-area-x">
      <TopNav 
        streak={streak} 
        streakFrozen={streakFrozen} 
        displayName={displayName} 
        avatarUrl={avatarUrl}
        isLoggedIn={isLoggedIn}
        userId={userId}
        dataLoaded={navDataLoaded}
      />
      <main className="pb-40 md:pb-0 safe-area-bottom relative z-0" style={{ paddingBottom: showBottomNav ? '100px' : '0' }}>
        {children}
      </main>
      {showBottomNav && <BottomNav streak={streak} streakFrozen={streakFrozen} isLoggedIn={isLoggedIn} dataLoaded={navDataLoaded} />}
    </div>
  );
}
