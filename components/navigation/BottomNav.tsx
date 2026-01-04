'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import GradientIcon from '@/components/ui/GradientIcons';
import AuthModal from '@/components/auth/AuthModal';

interface BottomNavProps {
  streak?: number;
  streakFrozen?: boolean;
  isLoggedIn?: boolean;
}

const navItems = [
  { href: '/', label: 'Home', icon: 'home' as const, requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', icon: 'chartUp' as const, requiresAuth: true },
  { href: '/leaderboard', label: 'Ranks', icon: 'crown' as const, requiresAuth: true },
];

export default function BottomNav({ streak = 0, streakFrozen = false, isLoggedIn = false }: BottomNavProps) {
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50 flex justify-around items-center safe-area-x">
        {/* Streak Badge - Only show when logged in */}
        {isLoggedIn && (
          <div className="flex items-center gap-1">
            {/* Main Streak */}
            <div 
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl font-bold text-white min-w-[48px] min-h-[48px] justify-center bg-gradient-orange-yellow"
              title={`${streak} day streak`}
            >
              <GradientIcon 
                name="fire" 
                size={20} 
                colors={['#ffffff', '#ffffff']}
              />
              <span className="text-xs">{streak}</span>
            </div>
            {/* Frozen Indicator */}
            {streakFrozen && (
              <div 
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl font-bold text-white min-h-[48px] justify-center bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse"
                title="Streak frozen!"
              >
                <GradientIcon 
                  name="snowflake" 
                  size={18} 
                  colors={['#ffffff', '#ffffff']}
                />
                <span className="text-[9px]">ICE</span>
              </div>
            )}
          </div>
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
                  'flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 min-w-[48px] min-h-[48px] justify-center active:scale-95'
                )}
              >
                <GradientIcon 
                  name={item.icon} 
                  size={22} 
                  colors={['#a78bfa', '#fb7185']}
                />
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 min-w-[48px] min-h-[48px] justify-center active:scale-95',
                isActive
                  ? 'bg-gradient-purple-pink'
                  : ''
              )}
            >
              <GradientIcon 
                name={item.icon} 
                size={22} 
                colors={isActive ? ['#ffffff', '#ffffff'] : ['#a78bfa', '#fb7185']}
              />
              <span className={cn(
                "text-[10px] sm:text-xs font-semibold",
                isActive ? 'text-white' : 'text-slate-500'
              )}>{item.label}</span>
            </Link>
          );
        })}
        
        {/* Logout/Sign In Button */}
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 min-w-[48px] min-h-[48px] justify-center group"
          >
            <GradientIcon 
              name="exit"
              size={22} 
              colors={['#94a3b8', '#ef4444']}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-red-500">Exit</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex flex-col items-center gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 min-w-[48px] min-h-[48px] justify-center bg-gradient-purple-pink"
          >
            <GradientIcon 
              name="user"
              size={22} 
              colors={['#ffffff', '#ffffff']}
            />
            <span className="text-[10px] sm:text-xs font-semibold text-white">Sign Up</span>
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

