"use client"
import { motion } from "framer-motion"

// Gradient icon props
interface GradientIconProps {
  size?: number
  gradientStart?: string
  gradientEnd?: string
  className?: string
  isActive?: boolean
  glowEffect?: boolean
}

// Unique gradient ID generator
const useGradientId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`

// ============ DASHBOARD TAB ICONS (gradient stroke style) ============

export function OverviewIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("overview")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Simple bar chart - 4 bars */}
      <motion.rect
        x="3"
        y="14"
        width="4"
        height="7"
        rx="1"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={isActive ? 1 : 0.7}
      />
      <motion.rect
        x="9"
        y="10"
        width="4"
        height="11"
        rx="1"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={isActive ? 1 : 0.85}
      />
      <motion.rect
        x="15"
        y="6"
        width="4"
        height="15"
        rx="1"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        animate={isActive ? { scaleY: [1, 1.05, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "bottom" }}
      />
      {/* Trend line */}
      <motion.path
        d="M5 12L11 8L17 4"
        stroke={isActive ? `url(#${gradientId})` : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.6}
      />
    </motion.svg>
  )
}

export function ProfileIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("profile")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Head - filled circle */}
      <circle cx="12" cy="8" r="4" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
      {/* Body - filled arc */}
      <path
        d="M4 21C4 16.5817 7.58172 13 12 13C16.4183 13 20 16.5817 20 21"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
      />
    </motion.svg>
  )
}

export function FriendsIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("friends")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Left person */}
      <circle cx="8" cy="7" r="3" fill={isActive ? `url(#${gradientId})` : "currentColor"} opacity={0.8} />
      <path
        d="M2 20C2 16.134 5.13401 13 9 13C10.5 13 11.5 13.5 12 14"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={0.8}
      />
      {/* Right person (slightly in front) */}
      <circle cx="16" cy="8" r="3.5" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
      <path
        d="M10 21C10 16.5817 12.6863 13 16 13C19.3137 13 22 16.5817 22 21"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
      />
    </motion.svg>
  )
}

export function TrophyIcon({
  size = 24,
  gradientStart = "#ffc800",
  gradientEnd = "#ff9600",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("trophy")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Trophy cup body */}
      <motion.path
        d="M7 4H17V10C17 13.3137 14.7614 16 12 16C9.23858 16 7 13.3137 7 10V4Z"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        animate={isActive ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      />
      {/* Left handle */}
      <path
        d="M7 6H5C4 6 3 7 3 8C3 9.5 4 10 5 10H7"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={0.8}
      />
      {/* Right handle */}
      <path
        d="M17 6H19C20 6 21 7 21 8C21 9.5 20 10 19 10H17"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={0.8}
      />
      {/* Stem and base */}
      <rect x="10" y="16" width="4" height="3" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
      <rect x="7" y="19" width="10" height="2" rx="1" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
    </motion.svg>
  )
}

// ============ FRIENDS SUB-TAB ICONS ============

export function FriendsListIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("friendslist")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Center person (front) */}
      <circle cx="12" cy="8" r="3" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
      <path
        d="M6 20C6 16.134 8.68629 13 12 13C15.3137 13 18 16.134 18 20"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
      />
      {/* Left person (back) */}
      <circle cx="5" cy="9" r="2.5" fill={isActive ? `url(#${gradientId})` : "currentColor"} opacity={0.5} />
      <path
        d="M1 19C1 16.5 2.5 14 5 14C6 14 6.5 14.5 7 15"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={0.5}
      />
      {/* Right person (back) */}
      <circle cx="19" cy="9" r="2.5" fill={isActive ? `url(#${gradientId})` : "currentColor"} opacity={0.5} />
      <path
        d="M23 19C23 16.5 21.5 14 19 14C18 14 17.5 14.5 17 15"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
        opacity={0.5}
      />
    </motion.svg>
  )
}

export function RequestsIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("requests")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Person */}
      <circle cx="10" cy="8" r="3.5" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
      <path
        d="M3 21C3 16.5817 6.13401 13 10 13C11.5 13 13 13.5 14 14.5"
        fill={isActive ? `url(#${gradientId})` : "currentColor"}
      />
      {/* Plus sign */}
      <motion.g
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
      >
        <circle cx="18" cy="16" r="5" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
        <path d="M18 13.5V18.5M15.5 16H20.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  )
}

export function BlockedIcon({
  size = 24,
  gradientStart = "#ff4b4b",
  gradientEnd = "#ff9600",
  className = "",
  isActive = false,
}: GradientIconProps) {
  const gradientId = useGradientId("blocked")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Circle with slash cutout */}
      <circle cx="12" cy="12" r="9" fill={isActive ? `url(#${gradientId})` : "currentColor"} />
      {/* Slash (white to cut through) */}
      <path d="M6 6L18 18" stroke="var(--bg-primary, white)" strokeWidth="3" strokeLinecap="round" />
    </motion.svg>
  )
}

// ============ BADGE CATEGORY ICONS (filled style with glow) ============

export function StreakBadgeIcon({
  size = 24,
  gradientStart = "#ff9600",
  gradientEnd = "#ff4b4b",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("streakbadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
        <linearGradient id={`${gradientId}-inner`} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#ffc800" />
          <stop offset="100%" stopColor="#ff9600" />
        </linearGradient>
      </defs>
      {/* Main flame - full symmetrical shape */}
      <motion.path
        d="M12 2C12 2 8 6 8 10C8 11.5 8.5 13 9.5 14C9 13 9 12 9.5 11C10 10 11 9 12 8C13 9 14 10 14.5 11C15 12 15 13 14.5 14C15.5 13 16 11.5 16 10C16 6 12 2 12 2Z"
        fill={`url(#${gradientId})`}
        animate={
          isActive
            ? {
                scaleY: [1, 1.08, 1],
                scaleX: [1, 0.95, 1],
              }
            : {}
        }
        transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "center bottom" }}
      />
      {/* Lower/outer flame */}
      <motion.path
        d="M12 22C7 22 4 18 4 14C4 10 7 7 8 6C8 8 9 9 10 9C10 7 11 5 12 4C13 5 14 7 14 9C15 9 16 8 16 6C17 7 20 10 20 14C20 18 17 22 12 22Z"
        fill={`url(#${gradientId})`}
        animate={
          isActive
            ? {
                scaleY: [1, 1.05, 1],
                scaleX: [1, 0.97, 1],
              }
            : {}
        }
        transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "center bottom" }}
      />
      {/* Inner bright core */}
      <motion.path
        d="M12 20C9 20 7 17.5 7 15C7 13 8 11 9 10C9 11.5 10 12.5 11 12.5C11 11 11.5 9.5 12 9C12.5 9.5 13 11 13 12.5C14 12.5 15 11.5 15 10C16 11 17 13 17 15C17 17.5 15 20 12 20Z"
        fill={`url(#${gradientId}-inner)`}
        animate={
          isActive
            ? {
                opacity: [1, 0.85, 1],
              }
            : {}
        }
        transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
      />
    </motion.svg>
  )
}

export function CardsBadgeIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("cardsbadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Back card */}
      <rect x="5" y="3" width="14" height="16" rx="3" fill={`url(#${gradientId})`} opacity="0.4" />
      {/* Front card */}
      <motion.rect
        x="4"
        y="5"
        width="14"
        height="16"
        rx="3"
        fill={`url(#${gradientId})`}
        animate={isActive ? { rotate: [-2, 2, -2] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
      />
      {/* Card content */}
      <rect x="7" y="9" width="8" height="2" rx="1" fill="white" opacity="0.6" />
      <rect x="7" y="13" width="5" height="2" rx="1" fill="white" opacity="0.4" />
    </motion.svg>
  )
}

export function StacksBadgeIcon({
  size = 24,
  gradientStart = "#1cb0f6",
  gradientEnd = "#a560e8",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("stacksbadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Bottom layer */}
      <motion.rect x="3" y="14" width="18" height="4" rx="2" fill={`url(#${gradientId})`} opacity="0.4" />
      {/* Middle layer */}
      <motion.rect
        x="3"
        y="9"
        width="18"
        height="4"
        rx="2"
        fill={`url(#${gradientId})`}
        opacity="0.7"
        animate={isActive ? { y: [9, 8.5, 9] } : {}}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: 0.1 }}
      />
      {/* Top layer */}
      <motion.rect
        x="3"
        y="4"
        width="18"
        height="4"
        rx="2"
        fill={`url(#${gradientId})`}
        animate={isActive ? { y: [4, 3, 4] } : {}}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
      />
    </motion.svg>
  )
}

export function SocialBadgeIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#ffc800",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("socialbadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Center node */}
      <circle cx="12" cy="12" r="4" fill={`url(#${gradientId})`} />
      {/* Outer nodes */}
      <motion.circle
        cx="12"
        cy="4"
        r="2.5"
        fill={`url(#${gradientId})`}
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
      />
      <motion.circle
        cx="19"
        cy="9"
        r="2.5"
        fill={`url(#${gradientId})`}
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.25 }}
      />
      <motion.circle
        cx="19"
        cy="17"
        r="2.5"
        fill={`url(#${gradientId})`}
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
      />
      <motion.circle
        cx="5"
        cy="17"
        r="2.5"
        fill={`url(#${gradientId})`}
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.75 }}
      />
      <motion.circle
        cx="5"
        cy="9"
        r="2.5"
        fill={`url(#${gradientId})`}
        animate={isActive ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 1 }}
      />
      {/* Connection lines */}
      <path
        d="M12 8V6.5M15 10L17 8M15 14L17 15.5M9 14L7 15.5M9 10L7 8"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </motion.svg>
  )
}

export function SpecialBadgeIcon({
  size = 24,
  gradientStart = "#ffc800",
  gradientEnd = "#ff9600",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("specialbadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Main star */}
      <motion.path
        d="M12 2L14.4 8.2L21 9L16.5 13.3L17.8 20L12 16.8L6.2 20L7.5 13.3L3 9L9.6 8.2L12 2Z"
        fill={`url(#${gradientId})`}
        animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      />
      {/* Sparkles */}
      <motion.circle
        cx="19"
        cy="5"
        r="1.5"
        fill={gradientEnd}
        animate={isActive ? { scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
      />
      <motion.circle
        cx="5"
        cy="6"
        r="1"
        fill={gradientStart}
        animate={isActive ? { scale: [1, 0.6, 1], opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
      />
      <motion.circle
        cx="20"
        cy="15"
        r="0.8"
        fill={gradientEnd}
        animate={isActive ? { scale: [0.6, 1, 0.6], opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: 0.6 }}
      />
    </motion.svg>
  )
}

export function RecoveryBadgeIcon({
  size = 24,
  gradientStart = "#1cb0f6",
  gradientEnd = "#a560e8",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("recoverybadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Snowflake */}
      <motion.g
        animate={isActive ? { rotate: [0, 30, 0] } : {}}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "center" }}
      >
        <path
          d="M12 2V22M2 12H22M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Crystal branches */}
        <path
          d="M12 5L10 7M12 5L14 7M12 19L10 17M12 19L14 17M5 12L7 10M5 12L7 14M19 12L17 10M19 12L17 14"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.g>
      {/* Center crystal */}
      <circle cx="12" cy="12" r="2" fill={`url(#${gradientId})`} />
    </motion.svg>
  )
}

export function ProgressBadgeIcon({
  size = 24,
  gradientStart = "#58cc02",
  gradientEnd = "#1cb0f6",
  className = "",
  isActive = false,
  glowEffect = false,
}: GradientIconProps) {
  const gradientId = useGradientId("progressbadge")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: glowEffect ? `drop-shadow(0 0 8px ${gradientStart}80)` : undefined,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {/* Rocket body */}
      <motion.path
        d="M12 2C12 2 8 6 8 12C8 15 9 18 12 21C15 18 16 15 16 12C16 6 12 2 12 2Z"
        fill={`url(#${gradientId})`}
        animate={isActive ? { y: [0, -3, 0] } : {}}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
      />
      {/* Window */}
      <circle cx="12" cy="10" r="2" fill="white" opacity="0.6" />
      {/* Fins */}
      <path d="M8 14L5 17L8 16" fill={gradientStart} opacity="0.7" />
      <path d="M16 14L19 17L16 16" fill={gradientStart} opacity="0.7" />
      {/* Flame */}
      <motion.path
        d="M10 20L12 24L14 20"
        fill="#ff9600"
        animate={isActive ? { scaleY: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
        transition={{ duration: 0.3, repeat: Number.POSITIVE_INFINITY }}
      />
    </motion.svg>
  )
}

// ============ EXPORT ALL ICONS ============

export const GradientIcons = {
  // Dashboard tabs
  Overview: OverviewIcon,
  Profile: ProfileIcon,
  Friends: FriendsIcon,
  Trophy: TrophyIcon,

  // Friends sub-tabs
  FriendsList: FriendsListIcon,
  Requests: RequestsIcon,
  Blocked: BlockedIcon,

  // Badge categories
  StreakBadge: StreakBadgeIcon,
  CardsBadge: CardsBadgeIcon,
  StacksBadge: StacksBadgeIcon,
  SocialBadge: SocialBadgeIcon,
  SpecialBadge: SpecialBadgeIcon,
  RecoveryBadge: RecoveryBadgeIcon,
  ProgressBadge: ProgressBadgeIcon,
}

export default GradientIcons
