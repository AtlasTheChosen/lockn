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
  const [displayName, setDisplayName] = useState('');
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
          .select('display_name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
        
        // Get user stats for streak
        const { data: stats } = await supabase
          .from('user_stats')
          .select('current_streak')
          .eq('user_id', session.user.id)
          .single();
        
        if (stats?.current_streak) {
          setStreak(stats.current_streak);
        }
      }
    };
    
    loadUserData();
  }, []);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen relative z-10">
      {isLoggedIn && <TopNav streak={streak} displayName={displayName} />}
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      {isLoggedIn && <BottomNav />}
    </div>
  );
}


