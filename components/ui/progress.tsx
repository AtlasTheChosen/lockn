'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { motion, useSpring, useTransform } from 'framer-motion';

import { cn } from '@/lib/utils';

// Basic Radix Progress with improved styling
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-3 w-full overflow-hidden rounded-full',
      'bg-[var(--bg-secondary)]',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'h-full w-full flex-1 rounded-full',
        'bg-[var(--accent-green)]',
        'transition-transform duration-500 ease-out'
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

// Color variants for animated progress bar
const colors = {
  green: {
    fill: 'var(--accent-green)',
    glow: 'rgba(88, 204, 2, 0.5)',
    gradient: 'linear-gradient(90deg, #58cc02 0%, #7de029 100%)',
  },
  blue: {
    fill: 'var(--accent-blue)',
    glow: 'rgba(28, 176, 246, 0.5)',
    gradient: 'linear-gradient(90deg, #1cb0f6 0%, #5bc7f8 100%)',
  },
  orange: {
    fill: 'var(--accent-orange)',
    glow: 'rgba(255, 150, 0, 0.5)',
    gradient: 'linear-gradient(90deg, #ff9600 0%, #ffb84d 100%)',
  },
  red: {
    fill: 'var(--accent-red)',
    glow: 'rgba(255, 75, 75, 0.5)',
    gradient: 'linear-gradient(90deg, #ff4b4b 0%, #ff7878 100%)',
  },
};

type ColorVariant = keyof typeof colors;

interface ProgressBarProps {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: ColorVariant | 'auto';
  gradient?: boolean;
  label?: 'none' | 'percentage' | 'fraction';
  showGlow?: boolean;
  striped?: boolean;
  stripedAnimated?: boolean;
  indeterminate?: boolean;
  segments?: number;
  className?: string;
}

function getAutoColor(percentage: number): ColorVariant {
  if (percentage >= 75) return 'green';
  if (percentage >= 50) return 'blue';
  if (percentage >= 25) return 'orange';
  return 'red';
}

const sizeClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  color = 'green',
  gradient = false,
  label = 'none',
  showGlow = true,
  striped = false,
  stripedAnimated = false,
  indeterminate = false,
  segments,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const isComplete = percentage >= 100;
  const isNearComplete = percentage >= 80;

  const resolvedColor = color === 'auto' ? getAutoColor(percentage) : color;
  const colorConfig = colors[resolvedColor];

  const springValue = useSpring(percentage, {
    stiffness: 100,
    damping: 20,
    mass: 1,
  });

  const width = useTransform(springValue, (v) => `${v}%`);

  React.useEffect(() => {
    springValue.set(percentage);
  }, [percentage, springValue]);

  const getBackground = () => {
    if (gradient) {
      return colorConfig.gradient;
    }
    return colorConfig.fill;
  };

  // Segmented variant
  if (segments && segments > 0) {
    const segmentPercentage = 100 / segments;
    const filledSegments = Math.floor(percentage / segmentPercentage);
    const partialFill = (percentage % segmentPercentage) / segmentPercentage;

    return (
      <div className={cn('w-full', className)}>
        {label !== 'none' && (
          <div className="flex justify-end mb-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {label === 'percentage' ? `${Math.round(percentage)}%` : `${value}/${max}`}
            </span>
          </div>
        )}

        <div className="flex gap-1">
          {Array.from({ length: segments }).map((_, i) => {
            const isFilled = i < filledSegments;
            const isPartial = i === filledSegments && partialFill > 0;

            return (
              <motion.div
                key={i}
                className={cn('relative flex-1 rounded-full overflow-hidden bg-[var(--bg-secondary)]', sizeClasses[size])}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                {(isFilled || isPartial) && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: isFilled ? 1 : partialFill,
                    }}
                    transition={{ delay: i * 0.05 + 0.1, duration: 0.3, ease: 'easeOut' }}
                    style={{
                      background: getBackground(),
                      transformOrigin: 'left',
                      boxShadow: showGlow && isFilled ? `0 0 8px ${colorConfig.glow}` : 'none',
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Indeterminate variant
  if (indeterminate) {
    return (
      <div
        className={cn('relative w-full rounded-full overflow-hidden bg-[var(--bg-secondary)]', sizeClasses[size], className)}
      >
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{ background: getBackground() }}
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {label !== 'none' && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Progress</span>
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {label === 'percentage' ? `${Math.round(percentage)}%` : `${value}/${max}`}
          </span>
        </div>
      )}

      <div className={cn('relative w-full rounded-full overflow-hidden bg-[var(--bg-secondary)]', sizeClasses[size])}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width,
            background: getBackground(),
            boxShadow: showGlow && isNearComplete ? `0 0 ${isComplete ? '12px' : '8px'} ${colorConfig.glow}` : 'none',
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 rounded-t-full opacity-30"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)' }}
          />

          {/* Striped pattern */}
          {striped && (
            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 8px,
                  rgba(255,255,255,0.15) 8px,
                  rgba(255,255,255,0.15) 16px
                )`,
                backgroundSize: '32px 32px',
              }}
              animate={stripedAnimated ? { backgroundPositionX: ['0px', '32px'] } : undefined}
              transition={stripedAnimated ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : undefined}
            />
          )}

          {/* Completion shimmer */}
          {isComplete && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>

        {/* Glow pulse near completion */}
        {showGlow && isNearComplete && !isComplete && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{
              left: `calc(${percentage}% - 4px)`,
              backgroundColor: colorConfig.fill,
              boxShadow: `0 0 8px ${colorConfig.glow}`,
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

export { Progress, ProgressBar };
