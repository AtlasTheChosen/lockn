'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Home, LayoutDashboard, Trophy, LogOut, UserPlus, Flame, Snowflake } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import { useTranslation } from '@/contexts/LocaleContext';

interface BottomNavProps {
  streak?: number;
  streakFrozen?: boolean;
  isLoggedIn?: boolean;
  dataLoaded?: boolean;
}

const navItemKeys = [
  { href: '/', labelKey: 'nav.home', icon: Home, requiresAuth: false },
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, requiresAuth: true },
  { href: '/leaderboard', labelKey: 'nav.ranks', icon: Trophy, requiresAuth: true },
];

// Compact Streak Badge
function CompactStreakBadge({ count, isFrozen, isActive }: { count: number; isFrozen: boolean; isActive?: boolean }) {
  return (
    <motion.div className="relative flex flex-col items-center justify-center" whileTap={{ scale: 0.9 }}>
      {/* Pulsing glow */}
      <motion.div
        className="absolute -inset-1 rounded-full"
        style={{
          background: isFrozen
            ? 'linear-gradient(135deg, #1cb0f6 0%, #00d4ff 100%)'
            : 'linear-gradient(135deg, #ff9600 0%, #ffaa00 100%)',
          filter: 'blur(8px)',
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Icon circle or flame for frozen/zero */}
      {isFrozen ? (
        <motion.div
          className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, #1cb0f6 0%, #00d4ff 100%)',
          }}
          animate={{ opacity: [0.9, 1, 0.9] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Snowflake className="h-4 w-4 text-white" strokeWidth={2.5} />
        </motion.div>
      ) : count === 0 ? (
        <motion.div
          className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, #ff9600 0%, #ffaa00 100%)',
          }}
        >
          <Flame className="h-4 w-4 text-white" />
        </motion.div>
      ) : (
        <motion.div
          className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, #ff9600 0%, #ffaa00 100%)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Flame className="h-4 w-4 text-white" />
        </motion.div>
      )}

      {/* Count */}
      <span
        className={cn(
          'relative z-10 mt-0.5 text-xs font-bold',
          isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
        )}
      >
        {count}
      </span>
    </motion.div>
  );
}

export default function BottomNav({ streak = 0, streakFrozen = false, isLoggedIn = false, dataLoaded = false }: BottomNavProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const supabase = createClient();
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  // BottomNav hidden - TopNav now handles all navigation on all devices
  return (
    <>
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className={cn(
            'flex items-center justify-around mx-4 mb-4 px-2 py-1',
            'bg-[var(--bg-card)]/80 backdrop-blur-xl',
            'border-2 border-[var(--border-color)]',
            'rounded-2xl shadow-lg'
          )}
        >
          {/* Streak Badge */}
          {isLoggedIn && (
            <div className="flex-1 flex justify-center min-w-[48px]">
              {!dataLoaded ? (
                <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[48px] min-h-[48px] justify-center bg-[var(--bg-secondary)] animate-pulse" />
              ) : (
                <CompactStreakBadge count={streak} isFrozen={streakFrozen} />
              )}
            </div>
          )}

          {/* Nav Items */}
          {navItemKeys.map((item) => {
            const label = t(item.labelKey);
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            if (!isLoggedIn && item.requiresAuth) {
              return (
                <button
                  key={item.href}
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1"
                >
                  <motion.div
                    className="relative flex min-h-[48px] flex-col items-center justify-center py-1"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon className="h-6 w-6 text-[var(--text-secondary)]" />
                    <span className="mt-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">{label}</span>
                  </motion.div>
                </button>
              );
            }

            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <motion.div
                  className="relative flex min-h-[48px] flex-col items-center justify-center py-1"
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="bottomnav-active-pill"
                      className="absolute inset-x-2 inset-y-0 rounded-2xl"
                      style={{ backgroundColor: 'rgba(88, 204, 2, 0.15)' }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}

                  {/* Icon with bounce */}
                  <motion.div
                    className="relative z-10"
                    animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6 transition-colors duration-200',
                        isActive ? 'text-[#58cc02]' : 'text-[var(--text-secondary)]'
                      )}
                    />
                  </motion.div>

                  <span
                    className={cn(
                      'relative z-10 mt-0.5 text-[10px] font-semibold transition-colors duration-200',
                      isActive ? 'text-[#58cc02]' : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {label}
                  </span>
                </motion.div>
              </Link>
            );
          })}

          {/* Logout / Sign Up */}
          <div className="flex-1 flex justify-center min-w-[48px]">
            {isLoggedIn ? (
              <motion.button
                onClick={handleLogout}
                className="relative flex min-h-[48px] flex-col items-center justify-center py-1"
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className="text-[var(--text-secondary)] transition-colors duration-200"
                  whileHover={{ color: '#ff4b4b' }}
                >
                  <LogOut className="h-5 w-5" />
                </motion.div>
                <span className="mt-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">Logout</span>
              </motion.button>
            ) : (
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="relative flex min-h-[48px] flex-col items-center justify-center rounded-xl px-3 py-1 bg-[#58cc02]"
                whileTap={{ scale: 0.9 }}
              >
                <UserPlus className="h-5 w-5 text-white" />
                <span className="mt-0.5 text-[10px] font-bold text-white">Sign Up</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Auth Modal for guests */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="signup" />
    </>
  );
}
