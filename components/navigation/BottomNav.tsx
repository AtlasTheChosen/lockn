'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import GradientIcon from '@/components/ui/GradientIcons';
import AuthModal from '@/components/auth/AuthModal';
import { Snowflake } from 'lucide-react';

interface BottomNavProps {
  streak?: number;
  streakFrozen?: boolean;
  isLoggedIn?: boolean;
  dataLoaded?: boolean;
}

const navItems = [
  { href: '/', label: 'Home', icon: 'home' as const, requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', icon: 'chartUp' as const, requiresAuth: true },
  { href: '/leaderboard', label: 'Ranks', icon: 'crown' as const, requiresAuth: true },
];

export default function BottomNav({ streak = 0, streakFrozen = false, isLoggedIn = false, dataLoaded = false }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = async () => {
    try {
      // Actually sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any remaining auth storage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    // Redirect to home
    window.location.href = '/';
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] backdrop-blur-md border-t-2 border-[var(--border-color)] pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 shadow-[var(--shadow-md)] z-50 flex justify-around items-center safe-area-x transition-colors duration-300">
        {/* Streak Badge - Only show when logged in, show skeleton until data loaded */}
        {isLoggedIn && (
          !dataLoaded ? (
            <div className="streak-badge flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl font-bold min-w-[48px] min-h-[48px] justify-center bg-slate-300 dark:bg-slate-600 animate-pulse" />
          ) : (
            <div 
              className="streak-badge flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl font-bold text-white min-w-[48px] min-h-[48px] justify-center relative overflow-hidden"
              style={{ 
                background: streakFrozen 
                  ? 'linear-gradient(135deg, #1cb0f6, #00d4ff)' 
                  : 'linear-gradient(135deg, #ff9600, #ffaa00)' 
              }}
              title={streakFrozen ? `${streak} day streak (frozen)` : `${streak} day streak`}
            >
              {streakFrozen ? (
                <Snowflake className="h-5 w-5 text-white" strokeWidth={2.5} />
              ) : (
                <span className="text-lg animate-[flameFlicker_1.5s_ease-in-out_infinite]">🔥</span>
              )}
              <span className="text-xs font-extrabold">{streak}</span>
            </div>
          )
        )}
        
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          // If not logged in and requires auth, show auth modal
          if (!isLoggedIn && item.requiresAuth) {
            return (
              <button
                key={item.href}
                onClick={() => setShowAuthModal(true)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 min-w-[48px] min-h-[48px] justify-center active:scale-95'
                )}
              >
                <GradientIcon 
                  name={item.icon} 
                  size={22} 
                  colors={['#58cc02', '#6cd302']}
                />
                <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)]">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 min-w-[48px] min-h-[48px] justify-center active:scale-95',
                isActive
                  ? 'bg-[rgba(88,204,2,0.1)]'
                  : ''
              )}
            >
              <GradientIcon 
                name={item.icon} 
                size={22} 
                colors={isActive ? ['#58cc02', '#6cd302'] : ['#777777', '#777777']}
              />
              <span className={cn(
                "text-[10px] sm:text-xs font-bold",
                isActive ? 'text-[#58cc02]' : 'text-[var(--text-secondary)]'
              )}>{item.label}</span>
            </Link>
          );
        })}
        
        {/* Logout/Sign In Button */}
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 min-w-[48px] min-h-[48px] justify-center group"
          >
            <GradientIcon 
              name="exit"
              size={22} 
              colors={['#777777', '#ff4b4b']}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] group-hover:text-[#ff4b4b]">Exit</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 min-w-[48px] min-h-[48px] justify-center bg-[#58cc02]"
          >
            <GradientIcon 
              name="user"
              size={22} 
              colors={['#ffffff', '#ffffff']}
            />
            <span className="text-[10px] sm:text-xs font-bold text-white">Sign Up</span>
          </button>
        )}
      </nav>

      {/* Auth Modal for guests */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
      />
    </>
  );
}

