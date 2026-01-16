'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'default', ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    // Determine fill color based on variant or progress
    const getFillColor = () => {
      if (variant === 'success' || percentage === 100) {
        return '#58cc02'; // Duolingo green
      }
      if (variant === 'warning' || percentage === 0) {
        return '#ff9600'; // Orange for not started
      }
      // Gradient from orange to green based on progress
      if (percentage < 50) {
        return '#ff9600'; // Orange
      }
      return '#58cc02'; // Green
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full',
          className
        )}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        {...props}
      >
        <div
          className="h-full transition-all duration-300 ease-in-out rounded-full"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getFillColor(),
            minWidth: percentage > 0 ? '8px' : '0px' // Ensure visible when > 0
          }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
