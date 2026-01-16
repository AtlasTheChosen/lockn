'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Snowflake } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import AuthModal from '@/components/auth/AuthModal';
import { NotificationBell } from '@/components/notifications';
import ThemeToggle from '@/components/dashboard/ThemeToggle';

interface TopNavProps {
  streak?: number;
  streakFrozen?: boolean;
  displayName?: string;
  avatarUrl?: string;
  isLoggedIn?: boolean;
  userId?: string;
  dataLoaded?: boolean;
}

const navLinks = [
  { href: '/', label: 'Home', requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { href: '/leaderboard', label: 'Leaderboards', requiresAuth: true },
];

export default function TopNav({ streak = 0, streakFrozen = false, displayName = 'U', avatarUrl, isLoggedIn = false, userId, dataLoaded = false }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

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
    <nav className="hidden md:flex bg-[var(--bg-card)] dark:bg-[var(--bg-card)] px-8 py-5 shadow-[var(--shadow-sm)] border-b-2 border-[var(--border-color)] sticky top-0 z-[100] justify-between items-center transition-all duration-300">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <Logo size="xl" />
        <span className="font-display text-3xl font-semibold text-[#58cc02]">
          Lockn
        </span>
      </Link>

      {/* Nav Links */}
      <div className="flex gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || 
            (link.href !== '/' && pathname.startsWith(link.href));
          
          // If not logged in and link requires auth, show auth modal instead
          if (!isLoggedIn && link.requiresAuth) {
            return (
              <button
                key={link.href}
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className={cn(
                  'px-6 py-3 rounded-xl font-bold text-base transition-all duration-200',
                  'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                )}
              >
                {link.label}
              </button>
            );
          }
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-6 py-3 rounded-xl font-bold text-base transition-all duration-200',
                isActive
                  ? 'text-[#58cc02] bg-[rgba(88,204,2,0.1)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* User Section - Only show when logged in */}
      {isLoggedIn ? (
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Streak Badge - Shows skeleton until data loaded, then snowflake when frozen or fire when active */}
          {!dataLoaded ? (
            <div className="streak-badge flex items-center gap-2 px-4 py-2 rounded-[20px] font-bold text-white relative overflow-hidden bg-slate-300 dark:bg-slate-600 animate-pulse" style={{ minWidth: '70px', height: '36px' }} />
          ) : (
            <div 
              className="streak-badge flex items-center gap-2 px-4 py-2 rounded-[20px] font-bold text-white relative overflow-hidden"
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
                <span className="streak-icon text-xl animate-[flameFlicker_1.5s_ease-in-out_infinite]">🔥</span>
              )}
              <span>{streak}</span>
            </div>
          )}

          {/* Notifications Bell */}
          {userId && <NotificationBell userId={userId} />}
          
          {/* Avatar */}
          <Link 
            href="/dashboard?tab=profile"
            className="flex items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-105"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1cb0f6] to-[#1a9ad6] flex items-center justify-center font-bold text-lg text-white shadow-[var(--shadow-sm)] overflow-hidden">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-full h-full object-cover scale-110"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-[var(--text-secondary)] hover:text-[#ff4b4b] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          <button
            onClick={() => {
              setAuthModalMode('login');
              setShowAuthModal(true);
            }}
            className="px-6 py-3 rounded-xl font-bold text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setAuthModalMode('signup');
              setShowAuthModal(true);
            }}
            className="px-6 py-3 rounded-xl font-bold text-base bg-[#58cc02] text-white shadow-[0_4px_0_#46a302] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#46a302] active:translate-y-0 active:shadow-[0_2px_0_#46a302] transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      )}

      {/* Auth Modal for guests */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </nav>
  );
}

