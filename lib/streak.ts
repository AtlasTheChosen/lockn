// Streak tracking utilities

// ============================================================
// STREAK SYSTEM V2 CONSTANTS
// ============================================================

// Minimum cards needed per day to maintain streak (changed from 10 to 5)
export const STREAK_DAILY_REQUIREMENT = 5;

// Grace period in hours after display deadline (11:59pm)
export const GRACE_PERIOD_HOURS = 2;

// Maximum number of pending tests that can unfreeze streak
export const MAX_PENDING_TESTS = 3;

// Test deadline days based on stack size
export function getTestDeadlineDays(stackSize: number): number {
  if (stackSize >= 50) return 10;  // 50 cards = 10 days
  if (stackSize >= 25) return 5;   // 25 cards = 5 days
  return 2;                         // 10 cards = 2 days
}

// Grace period days based on stack size (legacy - for backward compatibility)
export function getGracePeriodDays(cardCount: number): number {
  return getTestDeadlineDays(cardCount);
}

// Check if user has met daily requirement (10+ cards learned today)
export function hasMetDailyRequirement(dailyCardsLearned: number): boolean {
  return dailyCardsLearned >= STREAK_DAILY_REQUIREMENT;
}

// Calculate test deadline from mastery date
export function calculateTestDeadline(masteryDate: Date, cardCount: number): Date {
  const graceDays = getGracePeriodDays(cardCount);
  const deadline = new Date(masteryDate);
  deadline.setDate(deadline.getDate() + graceDays);
  return deadline;
}

// Get days remaining until deadline (0 if passed)
export function getDaysRemaining(deadline: string | Date | null): number {
  if (!deadline) return 0;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// Check if deadline has passed
export function isDeadlinePassed(deadline: string | Date | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

// Check if it's a new day (for resetting daily counter)
export function isNewDay(lastDate: string | null): boolean {
  if (!lastDate) return true;
  
  const today = new Date().toISOString().split('T')[0];
  const lastDateStr = new Date(lastDate).toISOString().split('T')[0];
  
  return today !== lastDateStr;
}

// Get today's date as ISO string (date only)
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Format deadline for display ("2 Days Left" or "Overdue!")
export function formatDeadlineDisplay(deadline: string | Date | null): string {
  if (!deadline) return '';
  
  const days = getDaysRemaining(deadline);
  
  if (days === 0) {
    if (isDeadlinePassed(deadline)) {
      return 'Overdue!';
    }
    return 'Due Today!';
  }
  
  return `${days} Day${days === 1 ? '' : 's'} Left`;
}

// Get detailed time remaining (hours, minutes) for countdown display
export function getTimeRemaining(deadline: string | Date | null): { 
  days: number; 
  hours: number; 
  minutes: number; 
  isOverdue: boolean;
  totalHours: number;
} {
  if (!deadline) return { days: 0, hours: 0, minutes: 0, isOverdue: false, totalHours: 0 };
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, isOverdue: true, totalHours: 0 };
  }
  
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, isOverdue: false, totalHours };
}

// Format countdown for display with more detail
export function formatCountdown(deadline: string | Date | null): string {
  const time = getTimeRemaining(deadline);
  
  if (time.isOverdue) {
    return '⚠️ Overdue!';
  }
  
  if (time.days > 0) {
    return `${time.days}d ${time.hours}h left`;
  }
  
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m left`;
  }
  
  return `${time.minutes}m left`;
}

// Get urgency level for styling (0 = overdue, 1 = urgent, 2 = warning, 3 = normal)
export function getDeadlineUrgency(deadline: string | Date | null): 0 | 1 | 2 | 3 {
  const time = getTimeRemaining(deadline);
  
  if (time.isOverdue) return 0; // Overdue
  if (time.totalHours < 24) return 1; // Less than 24 hours - urgent
  if (time.days <= 2) return 2; // 1-2 days - warning
  return 3; // More than 2 days - normal
}

// Get streak deadline based on current streak status
// - No streak (0) and haven't met today's goal: End of TODAY (24 hours max)
// - Active streak (1+) or already met today's goal: End of TOMORROW (48 hours grace)
export function getStreakDeadline(currentStreak: number = 0, hasMetTodayGoal: boolean = false): Date {
  const now = new Date();
  const deadline = new Date(now);
  
  // If user has an active streak OR has already met today's goal, give 48-hour grace (end of tomorrow)
  // Otherwise, deadline is end of TODAY (start a new streak by midnight)
  if (currentStreak > 0 || hasMetTodayGoal) {
    deadline.setDate(deadline.getDate() + 1); // Tomorrow
  }
  // For no streak and no progress today, deadline is end of today
  
  deadline.setHours(23, 59, 59, 999); // End of day 11:59:59 PM
  return deadline;
}

// Get time remaining until streak resets
// Pass currentStreak and hasMetTodayGoal to determine correct deadline
export function getStreakTimeRemaining(currentStreak: number = 0, hasMetTodayGoal: boolean = false): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const deadline = getStreakDeadline(currentStreak, hasMetTodayGoal);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { hours, minutes, seconds, totalMs: diffMs };
}

/**
 * Get time remaining until a stored deadline (same shape as getStreakTimeRemaining).
 * Use this when we have a stored display_deadline (e.g. from DB) so the countdown
 * shows time until that deadline, not a recomputed "tomorrow" deadline.
 */
export function getTimeRemainingUntilDeadline(deadline: string | Date | null): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  if (!deadline) {
    return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalMs: diffMs };
}

// ============================================================
// STREAK SYSTEM V2 - TIMEZONE-AWARE FUNCTIONS
// ============================================================

/**
 * Calculate streak deadlines based on user's timezone
 * 
 * NEW TIMING:
 * - countdownStartsAt: Midnight of the SAME day (when cards lock)
 * - displayDeadline: 11:59pm NEXT day in user's timezone
 * - actualDeadline: +2 hours grace period after displayDeadline
 * 
 * Example: User earns streak at 3pm Monday
 * - countdownStartsAt: Midnight Monday (start of Tuesday) - cards LOCK here
 * - displayDeadline: 11:59pm Tuesday
 * - actualDeadline: 1:59am Wednesday
 */
export function calculateStreakDeadlines(userTimezone: string = 'UTC'): {
  countdownStartsAt: Date;
  displayDeadline: Date;
  actualDeadline: Date;
} {
  const now = new Date();
  
  // Get current time in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Parse the formatted date to get local components
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const year = parseInt(getPart('year'));
  const month = parseInt(getPart('month')) - 1; // JS months are 0-indexed
  const day = parseInt(getPart('day'));
  
  // Calculate timezone offset
  const userMidnight = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(userTimezone, userMidnight);
  
  // Countdown starts at: Midnight of the SAME day (start of next day in user's TZ)
  // This is when cards become LOCKED
  const midnightLocal = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  const countdownStartsAt = new Date(midnightLocal.getTime() - offsetMs);
  
  // Display deadline: 11:59pm NEXT day in user's TZ, stored as UTC
  const tomorrowEndLocal = new Date(Date.UTC(year, month, day + 1, 23, 59, 59, 999));
  const displayDeadline = new Date(tomorrowEndLocal.getTime() - offsetMs);
  
  // Actual deadline: +2 hours grace
  const actualDeadline = new Date(displayDeadline.getTime() + (GRACE_PERIOD_HOURS * 60 * 60 * 1000));
  
  return { countdownStartsAt, displayDeadline, actualDeadline };
}

/**
 * Get timezone offset in milliseconds for a given timezone at a specific time
 */
export function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Check if streak cards are currently locked (past countdown start time)
 * Cards are locked after midnight of the day the streak was earned.
 * Before midnight: cards can be freely downgraded without penalty
 * After midnight: downgrading locked cards triggers streak loss
 */
export function areCardsLocked(countdownStartsAt: string | Date | null): boolean {
  if (!countdownStartsAt) return false;
  const startTime = new Date(countdownStartsAt);
  return new Date() >= startTime;
}

/**
 * Calculate test deadlines based on stack size and user timezone
 */
export function calculateTestDeadlinesForStack(
  stackSize: number,
  userTimezone: string = 'UTC',
  masteryDate: Date = new Date()
): {
  displayDeadline: Date;
  actualDeadline: Date;
} {
  const deadlineDays = getTestDeadlineDays(stackSize);
  
  // Get current time in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(masteryDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const year = parseInt(getPart('year'));
  const month = parseInt(getPart('month')) - 1;
  const day = parseInt(getPart('day'));
  
  // Create deadline: 11:59:59 PM on (mastery date + deadline days) in user's TZ
  const deadlineLocal = new Date(Date.UTC(year, month, day + deadlineDays, 23, 59, 59, 999));
  
  // Calculate offset
  const offsetMs = getTimezoneOffsetMs(userTimezone, deadlineLocal);
  
  // Display deadline in UTC
  const displayDeadline = new Date(deadlineLocal.getTime() - offsetMs);
  
  // Actual deadline: +2 hours grace
  const actualDeadline = new Date(displayDeadline.getTime() + (GRACE_PERIOD_HOURS * 60 * 60 * 1000));
  
  return { displayDeadline, actualDeadline };
}

/**
 * Check if we're in the grace period (between display and actual deadline)
 */
export function isInGracePeriod(
  displayDeadline: string | Date | null,
  actualDeadline: string | Date | null
): boolean {
  if (!displayDeadline || !actualDeadline) return false;
  
  const now = new Date();
  const display = new Date(displayDeadline);
  const actual = new Date(actualDeadline);
  
  return now > display && now <= actual;
}

/**
 * Get today's date in user's timezone as ISO string (date only)
 */
export function getTodayDateInTimezone(timezone: string = 'UTC'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
    timeZone: timezone,
  });
  return formatter.format(new Date());
}

/**
 * Check if it's a new day in user's timezone
 */
export function isNewDayInTimezone(lastDate: string | null, timezone: string = 'UTC'): boolean {
  if (!lastDate) return true;
  
  const today = getTodayDateInTimezone(timezone);
  return today !== lastDate;
}