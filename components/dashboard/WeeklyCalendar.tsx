'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface WeeklyCalendarProps {
  currentStreak: number;
  cardsMasteredToday: number;
  dailyRequirement: number;
  lastMasteryDate?: string | null;
  className?: string;
}

interface DayStatus {
  day: string;
  shortDay: string;
  date: Date;
  status: 'completed' | 'missed' | 'today-complete' | 'today-partial' | 'today-empty' | 'future';
  isToday: boolean;
}

export default function WeeklyCalendar({
  currentStreak,
  cardsMasteredToday,
  dailyRequirement,
  lastMasteryDate,
  className = '',
}: WeeklyCalendarProps) {
  const days = useMemo(() => {
    const result: DayStatus[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const shortDayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const isToday = date.getTime() === today.getTime();
      const isFuture = date > today;
      const dayOfWeek = date.getDay();
      
      let status: DayStatus['status'];
      
      if (isFuture) {
        status = 'future';
      } else if (isToday) {
        if (cardsMasteredToday >= dailyRequirement) {
          status = 'today-complete';
        } else if (cardsMasteredToday > 0) {
          status = 'today-partial';
        } else {
          status = 'today-empty';
        }
      } else {
        // For past days, we infer from streak
        // If streak is N days, then the last N days (including today if met) were successful
        const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if this day was part of the streak
        // This is a simplified inference - ideally we'd have actual history
        const todayMetGoal = cardsMasteredToday >= dailyRequirement;
        const effectiveStreak = todayMetGoal ? currentStreak : currentStreak;
        
        if (daysAgo < effectiveStreak) {
          status = 'completed';
        } else {
          status = 'missed';
        }
      }
      
      result.push({
        day: dayNames[dayOfWeek],
        shortDay: shortDayNames[dayOfWeek],
        date,
        status,
        isToday,
      });
    }
    
    return result;
  }, [currentStreak, cardsMasteredToday, dailyRequirement]);
  
  const getStatusStyles = (status: DayStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-[#58cc02] to-[#6cd302] text-white border-[#58cc02] shadow-[0_4px_12px_rgba(88,204,2,0.3)]';
      case 'today-complete':
        return 'bg-gradient-to-br from-[#58cc02] to-[#6cd302] text-white border-[#58cc02] ring-2 ring-[#58cc02]/30 shadow-[0_4px_12px_rgba(88,204,2,0.3)]';
      case 'today-partial':
        return 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-4 border-[#ff9600] shadow-[0_0_0_4px_rgba(255,150,0,0.2)] animate-[todayPulse_2s_ease-in-out_infinite]';
      case 'today-empty':
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-4 border-[#ff9600] shadow-[0_0_0_4px_rgba(255,150,0,0.2)] animate-[todayPulse_2s_ease-in-out_infinite]';
      case 'missed':
        return 'bg-[#ff4b4b]/20 text-[#ff4b4b] border-[#ff4b4b]/50';
      case 'future':
        return 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] opacity-40';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };
  
  const getStatusIcon = (status: DayStatus['status']) => {
    switch (status) {
      case 'completed':
      case 'today-complete':
        return <Check className="h-3 w-3" />;
      case 'missed':
        return <X className="h-3 w-3" />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`flex gap-3 ${className}`}>
      {days.map((day, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            {day.day}
          </span>
          <div
            className={`w-[50px] h-[50px] rounded-full border-[3px] flex items-center justify-center text-xl transition-all duration-300 ${getStatusStyles(day.status)}`}
          >
            {day.status === 'completed' || day.status === 'today-complete' ? '✓' : 
             day.status === 'missed' ? '✗' :
             day.status === 'today-partial' || day.status === 'today-empty' ? '●' : '○'}
          </div>
        </div>
      ))}
    </div>
  );
}
