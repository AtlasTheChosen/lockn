"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary green with 3D shadow effect (Duolingo style)
        default:
          "bg-[var(--accent-green)] text-white rounded-2xl shadow-[0_4px_0_0_var(--accent-green-dark)] hover:brightness-105 focus-visible:ring-[var(--accent-green)]",
        primary:
          "bg-[var(--accent-green)] text-white rounded-2xl shadow-[0_4px_0_0_var(--accent-green-dark)] hover:brightness-105 focus-visible:ring-[var(--accent-green)]",
        // Secondary outlined
        secondary:
          "bg-transparent border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl hover:bg-[var(--bg-secondary)] focus-visible:ring-[var(--accent-blue)]",
        // Outline (alias for secondary)
        outline:
          "bg-transparent border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl hover:bg-[var(--bg-secondary)] focus-visible:ring-[var(--accent-blue)]",
        // Ghost transparent
        ghost:
          "bg-transparent text-[var(--text-primary)] rounded-2xl hover:bg-[var(--bg-secondary)] focus-visible:ring-[var(--accent-blue)]",
        // Destructive red
        destructive:
          "bg-[var(--accent-red)] text-white rounded-2xl shadow-[0_4px_0_0_#cc3c3c] hover:brightness-105 focus-visible:ring-[var(--accent-red)]",
        // Blue accent
        accent:
          "bg-[var(--accent-blue)] text-white rounded-2xl shadow-[0_4px_0_0_#1490c9] hover:brightness-105 focus-visible:ring-[var(--accent-blue)]",
        // Orange warning
        warning:
          "bg-[var(--accent-orange)] text-white rounded-2xl shadow-[0_4px_0_0_#cc7800] hover:brightness-105 focus-visible:ring-[var(--accent-orange)]",
        // Link style
        link: "text-[var(--accent-blue)] underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children">, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  children?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || isLoading

    // For 3D button variants (default, primary, destructive, accent, warning)
    const has3DEffect =
      variant === "default" ||
      variant === "primary" ||
      variant === "destructive" ||
      variant === "accent" ||
      variant === "warning" ||
      variant === undefined // default is primary

    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size, className }))}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </Slot>
      )
    }

    return (
      <motion.button
        ref={ref as React.RefObject<HTMLButtonElement> | React.RefCallback<HTMLButtonElement> | null}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={isDisabled}
        // Spring animation for hover lift
        whileHover={
          has3DEffect && !isDisabled
            ? {
                y: -2,
                transition: { type: "spring", stiffness: 400, damping: 17 },
              }
            : {
                scale: 1.02,
                transition: { type: "spring", stiffness: 400, damping: 17 },
              }
        }
        // 3D press effect - button depresses into shadow
        whileTap={
          has3DEffect && !isDisabled
            ? {
                y: 4,
                boxShadow: "0 0px 0 0 var(--accent-green-dark)",
                transition: { type: "spring", stiffness: 400, damping: 17 },
              }
            : {
                scale: 0.98,
                transition: { type: "spring", stiffness: 400, damping: 17 },
              }
        }
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span className="ml-1">Loading...</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
