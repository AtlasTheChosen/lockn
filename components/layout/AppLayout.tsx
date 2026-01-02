'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopNav, BottomNav } from '@/components/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const [streak, setStreak] = useState(0);
  const [streakFrozen, setStreakFrozen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLoggedIn(true);
        
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
        
        // Get user stats for streak
        const { data: stats } = await supabase
          .from('user_stats')
          .select('current_streak, streak_frozen')
          .eq('user_id', session.user.id)
          .single();
        
        if (stats) {
          setStreak(stats.current_streak || 0);
          setStreakFrozen(stats.streak_frozen || false);
        }
      }
    };
    
    loadUserData();
  }, []);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen relative safe-area-x">
      {isLoggedIn && <TopNav streak={streak} streakFrozen={streakFrozen} displayName={displayName} avatarUrl={avatarUrl} />}
      <main className="pb-24 md:pb-0 safe-area-bottom relative z-0">
        {children}
      </main>
      {isLoggedIn && <BottomNav streak={streak} streakFrozen={streakFrozen} />}
    </div>
  );
}





