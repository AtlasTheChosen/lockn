'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface TopNavProps {
  streak?: number;
  displayName?: string;
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/friends', label: 'Friends' },
  { href: '/leaderboard', label: 'Leaderboards' },
];

export default function TopNav({ streak = 0, displayName = 'U' }: TopNavProps) {
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
    <nav className="hidden md:flex bg-white px-8 py-5 shadow-talka-sm sticky top-0 z-50 justify-between items-center">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <Logo size="md" />
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
        {/* Streak Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-orange-yellow rounded-[20px] font-bold text-white shadow-orange animate-pulse-soft">
          🔥 {streak}
        </div>
        
        {/* Avatar */}
        <Link 
          href="/dashboard?tab=profile"
          className="w-12 h-12 rounded-full bg-gradient-cyan-blue flex items-center justify-center font-bold text-lg text-white cursor-pointer transition-all duration-300 hover:scale-110 hover:rotate-[10deg] shadow-blue"
        >
          {getInitials(displayName)}
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

