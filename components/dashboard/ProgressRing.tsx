'use client';

import { useEffect, useState } from 'react';
import { Snowflake } from 'lucide-react';

interface ProgressRingProps {
  current: number;         // Daily cards mastered (for ring fill)
  target: number;          // Daily target (e.g., 5)
  streakCount: number;     // Current streak to display in center
  longestStreak?: number;  // Longest streak ever (for gold badge)
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  countdownText?: string;  // Optional countdown text to show below
  isFrozen?: boolean;      // Whether streak is frozen
  isGracePeriod?: boolean; // Whether in grace period (show LAST CHANCE in red)
}

export default function ProgressRing({
  current,
  target,
  streakCount,
  longestStreak = 0,
  size = 120,
  strokeWidth = 8,
  className = '',
  showLabel = true,
  countdownText,
  isFrozen = false,
  isGracePeriod = false,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);
  const strokeDashoffset = circumference - (animatedProgress * circumference);
  
  // Animate the progress on mount and when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);
  
  const isComplete = current >= target;
  const isOnLongestStreak = streakCount > 0 && streakCount >= longestStreak && longestStreak > 0;
  
  // Colors based on state
  const getGradientColors = () => {
    if (isFrozen) return { start: '#1cb0f6', end: '#00d4ff' }; // Ice blue
    if (isComplete) return { start: '#58cc02', end: '#6cd302' }; // Green
    return { start: '#ff9600', end: '#ffaa00' }; // Orange
  };
  
  const colors = getGradientColors();
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Gold "Personal Best" badge when on longest streak */}
      {isOnLongestStreak && !isFrozen && (
        <div 
          className="mb-2 px-3 py-1 rounded-full text-xs font-bold text-white animate-pulse"
          style={{ 
            background: 'linear-gradient(135deg, #ffd700, #ffaa00, #ffd700)',
            boxShadow: '0 2px 8px rgba(255, 215, 0, 0.5)',
          }}
        >
          👑 Personal Best!
        </div>
      )}
      <div className="relative inline-flex items-center justify-center">
        {/* Background ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isFrozen ? '#1cb0f6' : (isComplete ? '#58cc02' : 'url(#progressGradient)')}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center content - Flame/Snowflake + Streak Count */}
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isFrozen ? (
              <Snowflake className="h-8 w-8 text-white drop-shadow-[0_0_4px_rgba(28,176,246,0.8)]" strokeWidth={2.5} />
            ) : (
              <span className="text-3xl animate-[flameFlicker_1.5s_ease-in-out_infinite]">🔥</span>
            )}
            <span className={`font-display text-3xl font-extrabold`}
              style={{ 
                backgroundImage: `linear-gradient(to bottom right, ${colors.start}, ${colors.end})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {streakCount}
            </span>
          </div>
        )}
        
        {/* Celebration effect when complete */}
        {isComplete && !isFrozen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-full h-full animate-ping opacity-20 rounded-full bg-[#58cc02]" style={{ animationDuration: '2s' }} />
          </div>
        )}
      </div>
      
      {/* Countdown text below the ring */}
      {countdownText && (
        <p className={`mt-2 text-sm font-bold text-center max-w-[220px] leading-tight ${
          isGracePeriod 
            ? 'text-[#ff4b4b] animate-pulse' 
            : isFrozen 
              ? 'text-[#1cb0f6]' 
              : isComplete 
                ? 'text-[#58cc02]' 
                : 'text-[var(--text-secondary)]'
        }`}>
          {countdownText}
        </p>
      )}
    </div>
  );
}
