'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('lockn-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lockn-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lockn-theme', 'light');
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`w-[60px] h-8 bg-slate-200 rounded-full ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-[60px] h-8 rounded-full transition-all duration-300 ${
        isDark 
          ? 'bg-slate-600 hover:bg-slate-500' 
          : 'bg-slate-200 hover:bg-slate-300'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div
        className={`absolute top-[2px] w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center transition-transform duration-300 ${
          isDark ? 'translate-x-[30px]' : 'translate-x-[2px]'
        }`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-yellow-400" />
        ) : (
          <Sun className="h-4 w-4 text-orange-400" />
        )}
      </div>
    </button>
  );
}
