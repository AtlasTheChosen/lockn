'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import GradientIcon from '@/components/ui/GradientIcons';

interface BottomNavProps {
  streak?: number;
  streakFrozen?: boolean;
}

const navItems = [
  { href: '/', label: 'Home', icon: 'home' as const },
  { href: '/dashboard', label: 'Dashboard', icon: 'chartUp' as const },
  { href: '/leaderboard', label: 'Ranks', icon: 'crown' as const },
];

export default function BottomNav({ streak = 0, streakFrozen = false }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50 flex justify-around items-center safe-area-x">
      {/* Streak Badge */}
      <div 
        className={cn(
          "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl font-bold text-white min-w-[48px] min-h-[48px] justify-center",
          streakFrozen 
            ? "bg-gradient-to-r from-cyan-400 to-blue-500" 
            : "bg-gradient-orange-yellow"
        )}
      >
        <GradientIcon 
          name={streakFrozen ? 'snowflake' : 'fire'} 
          size={20} 
          colors={['#ffffff', '#ffffff']}
        />
        <span className="text-xs">{streak}</span>
      </div>
      
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== '/' && pathname.startsWith(item.href));
        
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
      
      {/* Logout Button */}
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
    </nav>
  );
}

