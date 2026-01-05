'use client';

import { useState, useEffect } from 'react';
import { Clock, Flame, CheckCircle } from 'lucide-react';
import { getStreakTimeRemaining, STREAK_DAILY_REQUIREMENT } from '@/lib/streak';

interface StreakTimerProps {
  dailyCardsLearned: number;
  className?: string;
}

export default function StreakTimer({ dailyCardsLearned, className = '' }: StreakTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(getStreakTimeRemaining());
  const hasMetGoal = dailyCardsLearned >= STREAK_DAILY_REQUIREMENT;
  const progress = Math.min(100, (dailyCardsLearned / STREAK_DAILY_REQUIREMENT) * 100);

  // Update countdown every second for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getStreakTimeRemaining());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Format time display with hours:minutes:seconds
  const formatTime = () => {
    const { hours, minutes, seconds } = timeRemaining;
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
  };

  // Get urgency color based on time remaining and progress
  const getUrgencyColor = () => {
    if (hasMetGoal) return 'from-green-400 to-emerald-500';
    if (timeRemaining.hours < 6) return 'from-red-400 to-red-500';
    if (timeRemaining.hours < 12) return 'from-orange-400 to-orange-500';
    if (timeRemaining.hours < 24) return 'from-yellow-400 to-amber-500';
    return 'from-blue-400 to-indigo-500';
  };

  const getTextColor = () => {
    if (hasMetGoal) return 'text-green-600';
    if (timeRemaining.hours < 6) return 'text-red-600';
    if (timeRemaining.hours < 12) return 'text-orange-600';
    if (timeRemaining.hours < 24) return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <div className={`bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getUrgencyColor()}`}>
            {hasMetGoal ? (
              <CheckCircle className="h-4 w-4 text-white" />
            ) : (
              <Clock className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="font-semibold text-slate-700 text-sm">Daily Streak</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className={`h-4 w-4 ${getTextColor()}`} />
          <span className={`font-bold text-sm ${getTextColor()}`}>
            {dailyCardsLearned}/{STREAK_DAILY_REQUIREMENT}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full bg-gradient-to-r ${getUrgencyColor()} transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status text */}
      <div className="text-center">
        {hasMetGoal ? (
          <p className="text-green-600 font-semibold text-sm">
            Streak saved! Keep learning to stay ahead.
          </p>
        ) : (
          <p className={`font-medium text-sm ${getTextColor()}`}>
            <span className="font-bold">{formatTime()}</span> to master{' '}
            <span className="font-bold">{STREAK_DAILY_REQUIREMENT - dailyCardsLearned}</span> more cards
          </p>
        )}
      </div>
    </div>
  );
}

