// Streak tracking utilities

// Minimum cards needed per day to maintain streak
export const STREAK_DAILY_REQUIREMENT = 10;

// Grace period days based on stack size
export function getGracePeriodDays(cardCount: number): number {
  if (cardCount >= 50) return 10;  // ~1 week for large stacks
  if (cardCount >= 25) return 5;   // 5 days for medium stacks
  return 2;                         // 2 days for small stacks (10 cards)
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

// Get streak deadline: End of following day at 11:59:59 PM local time
export function getStreakDeadline(): Date {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 1); // Tomorrow
  deadline.setHours(23, 59, 59, 999); // End of day 11:59:59 PM
  return deadline;
}

// Get time remaining until streak resets
export function getStreakTimeRemaining(): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const deadline = getStreakDeadline();
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

