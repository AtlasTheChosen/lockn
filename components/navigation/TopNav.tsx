'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Snowflake, Flame, ChevronDown, User, Settings, Home, LayoutDashboard, Trophy } from 'lucide-react';
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
  { href: '/', label: 'Home', icon: Home, requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
  { href: '/leaderboard', label: 'Leaderboards', icon: Trophy, requiresAuth: true },
];

// Animated Streak Badge Component
function StreakBadge({ count, isFrozen }: { count: number; isFrozen: boolean }) {
  return (
    <motion.div
      className={cn(
        'relative flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2',
        'font-bold text-white text-xs sm:text-sm',
        'shadow-md'
      )}
      style={{
        background: isFrozen
          ? 'linear-gradient(135deg, #1cb0f6 0%, #00d4ff 100%)'
          : 'linear-gradient(135deg, #ff9600 0%, #ffaa00 100%)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isFrozen ? `${count} day streak (frozen)` : `${count} day streak`}
    >
      {/* Pulse glow effect - hidden on mobile for performance */}
      <motion.div
        className="absolute inset-0 rounded-lg sm:rounded-xl opacity-50 hidden sm:block"
        style={{
          background: isFrozen
            ? 'linear-gradient(135deg, #1cb0f6 0%, #00d4ff 100%)'
            : 'linear-gradient(135deg, #ff9600 0%, #ffaa00 100%)',
          filter: 'blur(8px)',
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Always show flame icon with count */}
      <motion.span
        className="relative z-10"
        animate={isFrozen ? { opacity: [0.8, 1, 0.8] } : { scale: [1, 1.1, 1] }}
        transition={{
          duration: isFrozen ? 2 : 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {isFrozen ? <Snowflake className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} /> : <Flame className="h-4 w-4 sm:h-5 sm:w-5" />}
      </motion.span>
      {/* Count */}
      <span className="relative z-10">{count}</span>
    </motion.div>
  );
}

// User Avatar with Dropdown
function UserAvatar({
  displayName,
  avatarUrl,
  onLogout,
}: {
  displayName: string;
  avatarUrl?: string;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="relative">
      <motion.button
        className={cn('relative flex items-center gap-1 sm:gap-2 rounded-full p-0.5', 'transition-all duration-300', 'group')}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Avatar */}
        <div className="relative h-9 w-9 sm:h-11 sm:w-11 overflow-hidden rounded-full bg-gradient-to-br from-[#1cb0f6] to-[#1a9ad6] shadow-[var(--shadow-sm)]">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover scale-110" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-sm sm:text-lg text-white">
              {getInitials(displayName)}
            </div>
          )}
        </div>

        <ChevronDown
          className={cn(
            'h-3 w-3 sm:h-4 sm:w-4 text-[var(--text-secondary)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl z-50',
                'bg-[var(--bg-card)] border-2 border-[var(--border-color)]',
                'shadow-lg backdrop-blur-md'
              )}
            >
              <div className="p-2">
                <Link
                  href="/dashboard?tab=profile"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2',
                    'text-[var(--text-primary)] transition-colors duration-150',
                    'hover:bg-[var(--bg-secondary)]'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">Profile</span>
                </Link>
                <Link
                  href="/account"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2',
                    'text-[var(--text-primary)] transition-colors duration-150',
                    'hover:bg-[var(--bg-secondary)]'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Settings</span>
                </Link>
                <hr className="my-2 border-[var(--border-color)]" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2',
                    'text-[var(--text-secondary)] transition-colors duration-150',
                    'hover:bg-red-50 hover:text-[#ff4b4b]',
                    'dark:hover:bg-red-950/30'
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">Log out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopNav({
  streak = 0,
  streakFrozen = false,
  displayName = 'U',
  avatarUrl,
  isLoggedIn = false,
  userId,
  dataLoaded = false,
}: TopNavProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    window.location.href = '/';
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex sticky top-0 z-[100]',
        'w-full items-center justify-between',
        'px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4',
        'bg-[var(--bg-card)]/80 backdrop-blur-xl',
        'border-b-2 border-[var(--border-color)]',
        'shadow-[var(--shadow-sm)]',
        'transition-all duration-300'
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Logo size="md" />
          <span className="font-display text-xl lg:text-2xl font-semibold text-[#58cc02]">Lockn</span>
        </motion.div>
      </Link>

      {/* Nav Links - Labels hidden on small screens, shown on lg+ */}
      <nav className="flex gap-1 lg:gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

          if (!isLoggedIn && link.requiresAuth) {
            return (
              <button
                key={link.href}
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className={cn(
                  'p-2.5 lg:px-5 lg:py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
                  'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                )}
                title={link.label}
              >
                <link.icon className="h-5 w-5" />
                <span className="hidden lg:inline font-bold text-base">{link.label}</span>
              </button>
            );
          }

          return (
            <Link key={link.href} href={link.href} title={link.label}>
              <motion.div 
                className="relative p-2.5 lg:px-5 lg:py-3 flex items-center justify-center gap-2" 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="topnav-active-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: 'rgba(88, 204, 2, 0.15)' }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}

                <link.icon 
                  className={cn(
                    'relative z-10 h-5 w-5 transition-colors duration-200',
                    isActive ? 'text-[#58cc02]' : 'text-[var(--text-secondary)]'
                  )}
                />
                <span
                  className={cn(
                    'relative z-10 font-bold text-base transition-colors duration-200 hidden lg:inline',
                    isActive ? 'text-[#58cc02]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {link.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Right section */}
      {isLoggedIn ? (
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle size="sm" />

          {/* Streak Badge */}
          {!dataLoaded ? (
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-white relative overflow-hidden bg-[var(--bg-secondary)] animate-pulse"
              style={{ minWidth: '50px', height: '32px' }}
            />
          ) : (
            <StreakBadge count={streak} isFrozen={streakFrozen} />
          )}

          {/* Notifications Bell */}
          {userId && <NotificationBell userId={userId} />}

          {/* User Avatar with Dropdown */}
          <UserAvatar displayName={displayName} avatarUrl={avatarUrl} onLogout={handleLogout} />
        </div>
      ) : (
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle size="sm" />

          {/* Sign In - hidden on smaller screens */}
          <button
            onClick={() => {
              setAuthModalMode('login');
              setShowAuthModal(true);
            }}
            className="hidden lg:block px-5 py-2.5 rounded-xl font-bold text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-200"
          >
            Sign In
          </button>
          <motion.button
            onClick={() => {
              setAuthModalMode('signup');
              setShowAuthModal(true);
            }}
            className="px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-bold text-sm lg:text-base bg-[#58cc02] text-white whitespace-nowrap"
            style={{ boxShadow: '0 3px 0 #46a302' }}
            whileHover={{ y: -2 }}
            whileTap={{ y: 2, boxShadow: '0 0px 0 #46a302' }}
          >
            Sign Up
          </motion.button>
        </div>
      )}

      {/* Auth Modal for guests */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authModalMode} />
    </motion.nav>
  );
}
