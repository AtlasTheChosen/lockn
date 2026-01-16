"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

type SkeletonVariant = "text" | "title" | "avatar" | "card" | "button" | "image"
type AspectRatio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16"

interface SkeletonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'> {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  aspectRatio?: AspectRatio
  isLoaded?: boolean
  children?: React.ReactNode
  shimmerDuration?: number
  lines?: number
  lineGap?: number
}

const aspectRatioPadding: Record<AspectRatio, string> = {
  "16:9": "56.25%",
  "4:3": "75%",
  "1:1": "100%",
  "3:4": "133.33%",
  "9:16": "177.78%",
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "h-4 rounded-md",
  title: "h-6 rounded-md",
  avatar: "rounded-full aspect-square",
  card: "rounded-2xl",
  button: "h-12 rounded-full",
  image: "rounded-xl",
}

function Skeleton({
  className,
  variant = "text",
  width,
  height,
  aspectRatio,
  isLoaded = false,
  children,
  shimmerDuration = 1.8,
  lines = 1,
  lineGap = 8,
  style,
  ...props
}: SkeletonProps) {
  const customStyle: React.CSSProperties = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    ["--shimmer-duration" as string]: `${shimmerDuration}s`,
  }

  if (variant === "image" && aspectRatio && !height) {
    customStyle.paddingBottom = aspectRatioPadding[aspectRatio]
    customStyle.height = 0
  }

  // Multiple lines for text/title
  if ((variant === "text" || variant === "title") && lines > 1) {
    return (
      <AnimatePresence mode="wait">
        {!isLoaded ? (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col"
            style={{ gap: lineGap }}
          >
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className={cn("skeleton-shimmer relative overflow-hidden", variantStyles[variant], className)}
                style={{
                  ...customStyle,
                  width: i === lines - 1 ? "75%" : customStyle.width,
                }}
                {...props}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {!isLoaded ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          data-slot="skeleton"
          className={cn("skeleton-shimmer relative overflow-hidden", variantStyles[variant], className)}
          style={customStyle}
          {...props}
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Skeleton card layout
interface SkeletonCardProps {
  showImage?: boolean
  imageAspectRatio?: AspectRatio
  showAvatar?: boolean
  titleLines?: number
  textLines?: number
  showButton?: boolean
  isLoaded?: boolean
  children?: React.ReactNode
  className?: string
}

function SkeletonCard({
  showImage = true,
  imageAspectRatio = "16:9",
  showAvatar = false,
  titleLines = 1,
  textLines = 2,
  showButton = false,
  isLoaded = false,
  children,
  className,
}: SkeletonCardProps) {
  return (
    <AnimatePresence mode="wait">
      {!isLoaded ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "rounded-2xl border-2 overflow-hidden",
            "bg-[var(--bg-card)] border-[var(--border-color)]",
            className,
          )}
        >
          {showImage && (
            <Skeleton variant="image" aspectRatio={imageAspectRatio} width="100%" className="rounded-none" />
          )}

          <div className="p-4 space-y-4">
            {showAvatar ? (
              <div className="flex items-center gap-3">
                <Skeleton variant="avatar" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="title" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
            ) : (
              <Skeleton variant="title" lines={titleLines} width="70%" />
            )}

            <Skeleton variant="text" lines={textLines} width="100%" />

            {showButton && <Skeleton variant="button" width="50%" />}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// User profile skeleton
interface SkeletonProfileProps {
  showBanner?: boolean
  avatarSize?: number
  showStats?: boolean
  isLoaded?: boolean
  children?: React.ReactNode
  className?: string
}

function SkeletonProfile({
  showBanner = true,
  avatarSize = 80,
  showStats = true,
  isLoaded = false,
  children,
  className,
}: SkeletonProfileProps) {
  return (
    <AnimatePresence mode="wait">
      {!isLoaded ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "rounded-2xl border-2 overflow-hidden",
            "bg-[var(--bg-card)] border-[var(--border-color)]",
            className,
          )}
        >
          {showBanner && (
            <Skeleton variant="image" aspectRatio="4:3" width="100%" height={120} className="rounded-none" />
          )}

          <div className="p-4 -mt-10 relative">
            <div
              className="rounded-full border-4 border-[var(--bg-card)] overflow-hidden mb-3"
              style={{ width: avatarSize, height: avatarSize }}
            >
              <Skeleton variant="avatar" width={avatarSize} height={avatarSize} />
            </div>

            <div className="space-y-2 mb-4">
              <Skeleton variant="title" width="50%" />
              <Skeleton variant="text" width="70%" />
            </div>

            {showStats && (
              <div className="flex gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton variant="title" width={40} />
                    <Skeleton variant="text" width={60} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// List item skeleton
interface SkeletonListItemProps {
  showAvatar?: boolean
  avatarSize?: number
  showAction?: boolean
  isLoaded?: boolean
  children?: React.ReactNode
  className?: string
}

function SkeletonListItem({
  showAvatar = true,
  avatarSize = 48,
  showAction = false,
  isLoaded = false,
  children,
  className,
}: SkeletonListItemProps) {
  return (
    <AnimatePresence mode="wait">
      {!isLoaded ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            "bg-[var(--bg-card)] border-2 border-[var(--border-color)]",
            className,
          )}
        >
          {showAvatar && <Skeleton variant="avatar" width={avatarSize} height={avatarSize} />}

          <div className="flex-1 space-y-2">
            <Skeleton variant="title" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>

          {showAction && <Skeleton variant="button" width={80} height={36} />}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonProfile,
  SkeletonListItem,
  type SkeletonProps,
  type SkeletonVariant,
  type AspectRatio,
}
