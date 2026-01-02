import type { WeeklyCardEntry, UserStats } from './types';

// Weekly card cap to prevent spam
export const WEEKLY_CARD_CAP = 500;

// Get ISO week string (e.g., "2024-W52")
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// Get the start of the current week (Sunday at 00:01 AM local time)
export function getWeekStartLocal(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 1, 0, 0); // 00:01 AM
  return weekStart;
}

// Get the start of the current week in UTC
export function getWeekStartUTC(): string {
  const localWeekStart = getWeekStartLocal();
  return localWeekStart.toISOString();
}

// Check if we need to reset the weekly count (new week has started)
export function shouldResetWeek(currentWeekStart: string | null): boolean {
  if (!currentWeekStart) return true;
  
  const storedWeekStart = new Date(currentWeekStart);
  const currentWeekStartDate = getWeekStartLocal();
  
  // If the stored week start is before the current week start, we need to reset
  return storedWeekStart < currentWeekStartDate;
}

// Calculate weekly average from history (last 4 weeks)
export function calculateWeeklyAverage(history: WeeklyCardEntry[]): number {
  if (!history || history.length === 0) return 0;
  
  // Get last 4 weeks
  const recentWeeks = history.slice(-4);
  const total = recentWeeks.reduce((sum, entry) => sum + entry.count, 0);
  return Math.round(total / recentWeeks.length);
}

// Archive current week and reset
export function archiveWeek(
  currentWeekCards: number,
  weeklyHistory: WeeklyCardEntry[],
  weekStart: string
): WeeklyCardEntry[] {
  const weekId = getISOWeek(new Date(weekStart));
  
  // Create archive entry
  const newEntry: WeeklyCardEntry = {
    week: weekId,
    count: currentWeekCards,
    reset_at: new Date().toISOString(),
  };
  
  // Keep only last 12 weeks of history
  const updatedHistory = [...weeklyHistory, newEntry].slice(-12);
  
  return updatedHistory;
}

// Check if a card can be counted (anti-cheat: cap at 500)
export function canCountCard(currentWeekCards: number): boolean {
  return currentWeekCards < WEEKLY_CARD_CAP;
}

// Get display stats for the dashboard
export function getWeeklyDisplayStats(stats: UserStats | null): {
  currentWeekCards: number;
  weeklyAverage: number;
  isPaused: boolean;
  isAtCap: boolean;
} {
  if (!stats) {
    return {
      currentWeekCards: 0,
      weeklyAverage: 0,
      isPaused: false,
      isAtCap: false,
    };
  }
  
  return {
    currentWeekCards: stats.current_week_cards || 0,
    weeklyAverage: calculateWeeklyAverage(stats.weekly_cards_history || []),
    isPaused: stats.pause_weekly_tracking || false,
    isAtCap: (stats.current_week_cards || 0) >= WEEKLY_CARD_CAP,
  };
}

// Format week display (e.g., "Dec 22 - Dec 28")
export function formatWeekRange(): string {
  const weekStart = getWeekStartLocal();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
}







