'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { motion, useSpring } from 'framer-motion';
import { Sun, Moon, Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

// Basic Radix Switch with improved styling
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--accent-green)] data-[state=checked]:border-[var(--accent-green-dark)]',
      'data-[state=unchecked]:bg-[var(--bg-secondary)] data-[state=unchecked]:border-[var(--border-color)]',
      'hover:data-[state=checked]:shadow-[0_0_12px_rgba(88,204,2,0.4)]',
      'hover:data-[state=unchecked]:shadow-[0_0_8px_rgba(0,0,0,0.1)]',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.1)]',
        'ring-0 transition-transform duration-200',
        'data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

// Advanced ToggleSwitch with icons and spring animations
const sizes = {
  sm: { track: 'w-12 h-6', knob: 18, knobOffset: 2, icon: 10 },
  md: { track: 'w-[60px] h-8', knob: 24, knobOffset: 4, icon: 14 },
  lg: { track: 'w-[76px] h-10', knob: 32, knobOffset: 4, icon: 18 },
};

type IconVariant = 'theme' | 'boolean' | 'none';

export interface ToggleSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: keyof typeof sizes;
  iconVariant?: IconVariant;
  className?: string;
  'aria-label'?: string;
}

function ToggleSwitch({
  checked = false,
  onCheckedChange,
  disabled = false,
  size = 'md',
  iconVariant = 'boolean',
  className,
  'aria-label': ariaLabel,
}: ToggleSwitchProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const config = sizes[size];

  const springConfig = { stiffness: 400, damping: 25, mass: 0.8 };
  const knobX = useSpring(checked ? getKnobTranslate() : 0, springConfig);

  function getKnobTranslate() {
    const trackWidths = { sm: 48, md: 60, lg: 76 };
    return trackWidths[size] - config.knob - config.knobOffset * 2;
  }

  React.useEffect(() => {
    knobX.set(checked ? getKnobTranslate() : 0);
  }, [checked, size]);

  const knobScale = useSpring(1, { stiffness: 500, damping: 30 });

  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange?.(!checked);
    }
  };

  const handleHover = (hover: boolean) => {
    if (!disabled) {
      setIsHovered(hover);
      knobScale.set(hover ? 1.08 : 1);
    }
  };

  const handlePress = (pressed: boolean) => {
    if (!disabled) {
      knobScale.set(pressed ? 0.92 : isHovered ? 1.08 : 1);
    }
  };

  const renderIcon = () => {
    if (iconVariant === 'none') return null;
    const iconSize = config.icon;

    if (iconVariant === 'theme') {
      return (
        <>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            animate={{ opacity: checked ? 0 : 1, scale: checked ? 0.5 : 1, rotate: checked ? -90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun size={iconSize} className="text-amber-500" strokeWidth={2.5} />
          </motion.div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5, rotate: checked ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <Moon size={iconSize} className="text-indigo-500" strokeWidth={2.5} />
          </motion.div>
        </>
      );
    }

    return (
      <>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: checked ? 0 : 1, scale: checked ? 0.5 : 1 }}
          transition={{ duration: 0.15 }}
        >
          <X size={iconSize} className="text-gray-400" strokeWidth={3} />
        </motion.div>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5 }}
          transition={{ duration: 0.15, delay: checked ? 0.1 : 0 }}
        >
          <Check size={iconSize} className="text-[#58cc02]" strokeWidth={3} />
        </motion.div>
      </>
    );
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onMouseDown={() => handlePress(true)}
      onMouseUp={() => handlePress(false)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58cc02] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
        config.track,
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={{ padding: config.knobOffset }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={{ backgroundColor: checked ? '#58cc02' : 'var(--bg-secondary)' }}
        transition={{ duration: 0.3 }}
        style={{ border: '2px solid', borderColor: checked ? '#46a302' : 'var(--border-color)' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={false}
        animate={{
          boxShadow: isHovered && !disabled
            ? checked ? '0 0 20px rgba(88, 204, 2, 0.4)' : '0 0 12px rgba(0, 0, 0, 0.1)'
            : 'none',
        }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="relative rounded-full bg-white"
        style={{
          width: config.knob,
          height: config.knob,
          x: knobX,
          scale: knobScale,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {renderIcon()}
      </motion.div>
    </button>
  );
}

export { Switch, ToggleSwitch };
