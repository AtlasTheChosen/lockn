'use client';

import { useState, useEffect } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Star positions for dark mode
const STARS = [
  { x: 15, y: 25, size: 2, delay: 0 },
  { x: 25, y: 60, size: 1.5, delay: 0.1 },
  { x: 45, y: 20, size: 2.5, delay: 0.15 },
  { x: 55, y: 70, size: 1.5, delay: 0.05 },
  { x: 70, y: 35, size: 2, delay: 0.2 },
  { x: 80, y: 65, size: 1.5, delay: 0.12 },
];

// Cloud shapes for light mode
const CLOUDS = [
  { x: 18, y: 50, scale: 0.6, delay: 0 },
  { x: 65, y: 40, scale: 0.5, delay: 0.1 },
];

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Size configurations
  const sizes = {
    sm: { width: 56, height: 28, knobSize: 22, translate: 56 - 22 - 4 - 4 },
    md: { width: 70, height: 36, knobSize: 28, translate: 70 - 28 - 4 - 4 },
    lg: { width: 84, height: 44, knobSize: 36, translate: 84 - 36 - 4 - 4 },
  };

  const sizeConfig = sizes[size];

  // Spring animation for the knob position
  const springConfig = { stiffness: 350, damping: 25, mass: 0.8 };
  const knobX = useSpring(0, springConfig);
  const knobScale = useSpring(1, { stiffness: 500, damping: 30 });

  // Load theme preference on mount
  // Default to dark mode for both users and guests if no preference is saved
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('lockn-theme');
    
    // Default to dark mode if no saved preference exists
    if (savedTheme === 'dark' || !savedTheme) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Update spring when theme changes
  useEffect(() => {
    if (mounted) {
      knobX.set(isDark ? sizeConfig.translate : 0);
    }
  }, [isDark, mounted, knobX, sizeConfig.translate]);

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

  const handleHover = (hover: boolean) => {
    setIsHovered(hover);
    knobScale.set(hover ? 1.08 : 1);
  };

  const handlePress = (pressed: boolean) => {
    knobScale.set(pressed ? 0.9 : isHovered ? 1.08 : 1);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={cn('rounded-full', className)}
        style={{
          width: sizeConfig.width,
          height: sizeConfig.height,
          backgroundColor: 'var(--bg-secondary)',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onMouseDown={() => handlePress(true)}
      onMouseUp={() => handlePress(false)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58cc02] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
        className
      )}
      style={{ width: sizeConfig.width, height: sizeConfig.height, padding: 4 }}
    >
      {/* Track background with gradient */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        initial={false}
        animate={{
          background: isDark
            ? 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 50%, #1a1a3e 100%)'
            : 'linear-gradient(135deg, #87CEEB 0%, #b0e0f8 30%, #ffecd2 100%)',
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          border: '2px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        }}
      />

      {/* Stars (dark mode only) */}
      <AnimatePresence>
        {isDark && (
          <>
            {STARS.map((star, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: star.size,
                  height: star.size,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1, 0.8],
                }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                transition={{
                  opacity: {
                    duration: 2,
                    repeat: Infinity,
                    delay: star.delay,
                  },
                  scale: {
                    duration: 2,
                    repeat: Infinity,
                    delay: star.delay,
                  },
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Clouds (light mode only) */}
      <AnimatePresence>
        {!isDark && (
          <>
            {CLOUDS.map((cloud, i) => (
              <motion.div
                key={`cloud-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${cloud.x}%`,
                  top: `${cloud.y}%`,
                  transform: `translate(-50%, -50%) scale(${cloud.scale})`,
                }}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 0.7, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.4, delay: cloud.delay }}
              >
                <div className="relative">
                  <div className="w-3 h-2 bg-white/80 rounded-full" />
                  <div className="absolute -top-1 left-1 w-2 h-2 bg-white/80 rounded-full" />
                  <div className="absolute -top-0.5 left-3 w-1.5 h-1.5 bg-white/80 rounded-full" />
                </div>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={false}
        animate={{
          boxShadow: isHovered
            ? isDark
              ? '0 0 24px rgba(147, 112, 219, 0.5), inset 0 0 12px rgba(147, 112, 219, 0.2)'
              : '0 0 24px rgba(135, 206, 235, 0.6), inset 0 0 12px rgba(255, 200, 100, 0.2)'
            : 'none',
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Knob */}
      <motion.div
        className="relative rounded-full overflow-hidden"
        style={{
          width: sizeConfig.knobSize,
          height: sizeConfig.knobSize,
          x: knobX,
          scale: knobScale,
          background: isDark
            ? 'linear-gradient(145deg, #e8e8e8 0%, #c9c9c9 100%)'
            : 'linear-gradient(145deg, #fff9e6 0%, #ffe4a0 100%)',
          boxShadow: `
            0 2px 8px rgba(0, 0, 0, 0.2),
            0 4px 16px rgba(0, 0, 0, 0.15),
            inset 0 1px 2px rgba(255, 255, 255, 0.8)
          `,
        }}
      >
        {/* Sun icon (light mode) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{
            opacity: isDark ? 0 : 1,
            scale: isDark ? 0.3 : 1,
            rotate: isDark ? -180 : 0,
            y: isDark ? 10 : 0,
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <div className="relative">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400" />
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-1 bg-amber-400 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: 'center 10px',
                  transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-8px)`,
                }}
                animate={{
                  scale: isHovered && !isDark ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 0.8,
                  repeat: isHovered && !isDark ? Infinity : 0,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Moon icon (dark mode) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{
            opacity: isDark ? 1 : 0,
            scale: isDark ? 1 : 0.3,
            rotate: isDark ? 0 : 180,
            y: isDark ? 0 : -10,
          }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <div className="relative w-4 h-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #e8e8e8 0%, #c9c9c9 100%)',
                boxShadow: 'inset -2px -2px 4px rgba(0, 0, 0, 0.1)',
              }}
            />
            <div
              className="absolute -right-1 -top-1 w-3.5 h-3.5 rounded-full"
              style={{
                background: isDark ? 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 100%)' : 'transparent',
              }}
            />
            <div className="absolute top-1.5 left-1 w-1 h-1 rounded-full bg-gray-300/50" />
            <div className="absolute top-2.5 left-2 w-0.5 h-0.5 rounded-full bg-gray-300/40" />
          </div>
        </motion.div>
      </motion.div>
    </button>
  );
}
