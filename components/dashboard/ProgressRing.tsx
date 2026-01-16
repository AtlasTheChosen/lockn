'use client';

import { useEffect, useState } from 'react';
import { Snowflake, Flame } from 'lucide-react';
import { motion, useSpring, useTransform } from 'framer-motion';

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
  strokeWidth = 10,
  className = '',
  showLabel = true,
  countdownText,
  isFrozen = false,
  isGracePeriod = false,
}: ProgressRingProps) {
  const [mounted, setMounted] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);

  // Spring animation for smooth progress
  const springProgress = useSpring(0, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  });

  const strokeDashoffset = useTransform(springProgress, [0, 1], [circumference, 0]);

  useEffect(() => {
    setMounted(true);
    springProgress.set(progress);
  }, [progress, springProgress]);

  const isComplete = current >= target;
  const isOnLongestStreak = streakCount > 0 && streakCount >= longestStreak && longestStreak > 0;

  // Colors based on state
  const getColors = () => {
    if (isFrozen) return { primary: '#1cb0f6', secondary: '#00d4ff', glow: 'rgba(28, 176, 246, 0.5)' };
    if (isComplete) return { primary: '#58cc02', secondary: '#7ce830', glow: 'rgba(88, 204, 2, 0.5)' };
    return { primary: '#ff9600', secondary: '#ffb340', glow: 'rgba(255, 150, 0, 0.4)' };
  };

  const colors = getColors();
  const gradientId = `progressGradient-${Math.random().toString(36).substr(2, 9)}`;
  const glowId = `progressGlow-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Personal Best Badge */}
      {isOnLongestStreak && !isFrozen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mb-3 relative"
        >
          <div
            className="px-4 py-1.5 rounded-full text-xs font-bold text-amber-900 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffb800 50%, #ffd700 100%)',
              boxShadow: '0 4px 14px rgba(255, 184, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
            }}
          >
            {/* Shimmer effect on badge */}
            <motion.div
              className="absolute inset-0 w-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <span className="relative flex items-center gap-1.5">
              <span className="text-sm">👑</span> Personal Best!
            </span>
          </div>
        </motion.div>
      )}

      {/* Ring Container */}
      <div className="relative inline-flex items-center justify-center">
        {/* Outer glow layer */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size + 20,
            height: size + 20,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          }}
          animate={
            mounted
              ? {
                  opacity: [0.5, 0.8, 0.5],
                  scale: [0.95, 1.02, 0.95],
                }
              : {}
          }
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* SVG Ring */}
        <svg width={size} height={size} className="relative z-10" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            {/* Progress gradient */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>

            {/* Glow filter */}
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth={strokeWidth}
            opacity={0.6}
          />

          {/* Inner shadow ring for depth */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2 - 2}
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth={1}
            opacity={0.3}
          />

          {/* Glow layer behind progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.primary}
            strokeWidth={strokeWidth + 6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            opacity={0.3}
            filter={`url(#${glowId})`}
          />

          {/* Main progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
          />

          {/* Highlight/shine on progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={strokeWidth / 3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
          />
        </svg>

        {/* Center content */}
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            {isFrozen ? (
              <motion.div
                animate={{
                  filter: [
                    'drop-shadow(0 0 6px rgba(28,176,246,0.8))',
                    'drop-shadow(0 0 12px rgba(28,176,246,1))',
                    'drop-shadow(0 0 6px rgba(28,176,246,0.8))',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Snowflake className="h-7 w-7 text-[#1cb0f6]" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="h-7 w-7 text-[#ff9600]" fill="#ff9600" />
              </motion.div>
            )}
            <motion.span
              className="font-bold text-2xl mt-0.5"
              style={{
                backgroundImage: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: `0 2px 10px ${colors.glow}`,
              }}
              key={streakCount}
              initial={{ scale: 1.3, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              {streakCount}
            </motion.span>
          </div>
        )}

        {/* Completion celebration effects */}
        {isComplete && !isFrozen && (
          <>
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0 rounded-full overflow-hidden z-30 pointer-events-none"
              style={{ width: size, height: size }}
            >
              <motion.div
                className="absolute h-full w-1/3"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                }}
                animate={{ x: [-size, size * 2] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Pulsing ring */}
            <motion.div
              className="absolute rounded-full border-2 pointer-events-none"
              style={{
                width: size,
                height: size,
                borderColor: colors.primary,
              }}
              animate={{
                scale: [1, 1.15, 1.15],
                opacity: [0.6, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          </>
        )}
      </div>

      {/* Countdown text */}
      {countdownText && (
        <motion.p
          className={`mt-3 text-sm font-semibold text-center max-w-[220px] leading-tight ${
            isGracePeriod
              ? 'text-[#ff4b4b]'
              : isFrozen
                ? 'text-[#1cb0f6]'
                : isComplete
                  ? 'text-[#58cc02]'
                  : 'text-[var(--text-secondary)]'
          }`}
          animate={isGracePeriod ? { opacity: [1, 0.5, 1] } : {}}
          transition={isGracePeriod ? { duration: 1, repeat: Infinity } : {}}
        >
          {countdownText}
        </motion.p>
      )}
    </div>
  );
}
