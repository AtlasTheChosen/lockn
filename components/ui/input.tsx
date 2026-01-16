"use client"

import * as React from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react"

// Size configurations
const sizeConfig = {
  sm: { height: "h-10", text: "text-sm", padding: "px-3", iconSize: 16, iconPadding: "pl-9" },
  md: { height: "h-12", text: "text-base", padding: "px-4", iconSize: 18, iconPadding: "pl-11" },
  lg: { height: "h-14", text: "text-lg", padding: "px-5", iconSize: 20, iconPadding: "pl-14" },
}

// Shake animation for error state
const shakeAnimation: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
}

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  size?: "sm" | "md" | "lg"
  icon?: React.ReactNode
  error?: string
  success?: boolean
  showCharCount?: boolean
  maxLength?: number
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    size = "md",
    icon,
    error,
    success,
    disabled,
    showCharCount,
    maxLength,
    value,
    defaultValue,
    onChange,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(defaultValue?.toString() || "")
    const [shouldShake, setShouldShake] = React.useState(false)
    const prevErrorRef = React.useRef<string | undefined>(undefined)

    const config = sizeConfig[size]
    const isPassword = type === "password"
    const inputType = isPassword && showPassword ? "text" : type

    // Controlled vs uncontrolled value handling
    const currentValue = value !== undefined ? value.toString() : internalValue
    const charCount = currentValue.length

    // Trigger shake when error appears
    React.useEffect(() => {
      if (error && !prevErrorRef.current) {
        setShouldShake(true)
        const timer = setTimeout(() => setShouldShake(false), 500)
        return () => clearTimeout(timer)
      }
      prevErrorRef.current = error
    }, [error])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value)
      }
      onChange?.(e)
    }

    return (
      <div className="w-full">
        <motion.div className="relative" variants={shakeAnimation} animate={shouldShake ? "shake" : undefined}>
          {/* Icon prefix */}
          {icon && (
            <div
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
                error ? "text-[var(--accent-red)]" : success ? "text-[var(--accent-green)]" : "text-[var(--text-muted)]",
              )}
              style={{ width: config.iconSize, height: config.iconSize }}
            >
              {icon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            type={inputType}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            className={cn(
              // Base styles
              "w-full rounded-2xl border-2 outline-none transition-all duration-200",
              "bg-[var(--bg-secondary)] text-[var(--text-primary)]",
              "placeholder:text-[var(--text-muted)]",
              config.height,
              config.text,
              config.padding,
              // Icon padding
              icon && config.iconPadding,
              // Right padding for password toggle or success checkmark
              (isPassword || success) && "pr-12",
              // Default border
              "border-[var(--border-color)]",
              // Focus state
              !error && !success && "focus:border-[var(--accent-green)] focus:shadow-[0_0_0_3px_rgba(88,204,2,0.15)]",
              // Error state
              error && "border-[var(--accent-red)] shadow-[0_0_0_3px_rgba(255,75,75,0.15)]",
              // Success state
              success && !error && "border-[var(--accent-green)] shadow-[0_0_0_3px_rgba(88,204,2,0.15)]",
              // Disabled state
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
            {...props}
          />

          {/* Password toggle button */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "transition-colors duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {showPassword ? <EyeOff size={config.iconSize} /> : <Eye size={config.iconSize} />}
            </button>
          )}

          {/* Success checkmark */}
          <AnimatePresence>
            {success && !error && !isPassword && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--accent-green)]"
              >
                <Check size={config.iconSize} strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bottom row: error message and/or character counter */}
        {(error || (showCharCount && maxLength)) && (
          <div className="mt-1.5 flex items-start justify-between gap-2 min-h-[20px]">
            {/* Error message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 text-sm text-[var(--accent-red)]"
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Character counter */}
            {showCharCount && maxLength && (
              <motion.span
                className={cn(
                  "text-xs ml-auto transition-colors duration-200",
                  charCount >= maxLength
                    ? "text-[var(--accent-red)]"
                    : charCount >= maxLength * 0.8
                      ? "text-[var(--accent-orange)]"
                      : "text-[var(--text-muted)]",
                )}
              >
                {charCount}/{maxLength}
              </motion.span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
