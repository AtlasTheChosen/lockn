'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface TopNavProps {
  streak?: number;
  streakFrozen?: boolean;
  displayName?: string;
  avatarUrl?: string;
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leaderboard', label: 'Leaderboards' },
];

export default function TopNav({ streak = 0, streakFrozen = false, displayName = 'U', avatarUrl }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="hidden md:flex bg-white px-8 py-5 shadow-talka-sm sticky top-0 z-[100] justify-between items-center">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <Logo size="lg" />
        <span className="font-display text-3xl font-semibold gradient-text">
          LOCKN
        </span>
      </Link>

      {/* Nav Links */}
      <div className="flex gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || 
            (link.href !== '/' && pathname.startsWith(link.href));
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-6 py-3 rounded-[20px] font-semibold text-base transition-all duration-300',
                isActive
                  ? 'bg-gradient-purple-pink text-white shadow-purple'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-talka-purple/10 hover:-translate-y-0.5'
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* User Section */}
      <div className="flex items-center gap-4">
        {/* Streak Badge - Always show streak, add frozen indicator when needed */}
        <div className="flex items-center gap-2">
          {/* Main Streak */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-[20px] font-bold text-white bg-gradient-orange-yellow shadow-orange"
            title={`${streak} day streak`}
          >
            🔥 {streak}
          </div>
          {/* Frozen Indicator - Shows alongside streak when frozen */}
          {streakFrozen && (
            <div 
              className="flex items-center gap-1 px-3 py-2 rounded-[20px] font-bold text-white bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_4px_14px_rgba(34,211,238,0.4)] animate-pulse"
              title="Streak frozen! Complete pending tests to unfreeze."
            >
              ❄️ <span className="text-xs">FROZEN</span>
            </div>
          )}
        </div>
        
        {/* Avatar + Username */}
        <Link 
          href="/dashboard?tab=profile"
          className="flex items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-cyan-blue flex items-center justify-center font-bold text-lg text-white shadow-blue overflow-hidden">
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
          <span className="font-semibold text-slate-700 hidden lg:inline">
            {displayName}
          </span>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-3 rounded-[20px] font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

