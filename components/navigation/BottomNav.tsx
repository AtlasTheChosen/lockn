'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/friends', label: 'Friends', icon: '👥' },
  { href: '/leaderboard', label: 'Ranks', icon: '🏆' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50 flex justify-around">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== '/' && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300',
              isActive
                ? 'bg-gradient-purple-pink text-white'
                : 'text-slate-500'
            )}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-semibold">{item.label}</span>
          </Link>
        );
      })}
      
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 text-slate-500 hover:text-red-500"
      >
        <LogOut className="h-6 w-6" />
        <span className="text-xs font-semibold">Logout</span>
      </button>
    </nav>
  );
}

