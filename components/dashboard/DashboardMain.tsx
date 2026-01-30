'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle, HelpCircle, Calendar, Loader2, Flame, BookOpen, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
// Weekly stats import removed - only tracking longest streak and total cards now
import { isDeadlinePassed, STREAK_DAILY_REQUIREMENT, getStreakTimeRemaining, getTimeRemaining, isInGracePeriod } from '@/lib/streak';
import { checkStackDeletion, executeStackDeletion, type StackDeletionCheck } from '@/lib/streak-system';
import { FREE_TIER_LIMITS, PREMIUM_TIER_LIMITS } from '@/lib/constants';

// Components
import ProgressRing from './ProgressRing';
import WeeklyCalendar from './WeeklyCalendar';
import StackCarousel from './StackCarousel';
import ArchiveVault from './ArchiveVault';
import StackGenerationModal from './StackGenerationModal';
import PremiumModal from './PremiumModal';

// Source stack data for generating more cards with similar topic
interface SourceStackData {
  scenario: string;
  language: string;
  difficulty: string;
  excludePhrases: string[];
}

interface Stack {
  id: string;
  title: string;
  scenario: string;
  language: string;
  total_cards: number;
  mastered_count: number;
  created_at: string;
  is_completed: boolean;
  last_reviewed?: string;
  completion_date?: string;
  cefr_level?: string;
  test_progress?: number;
  test_notes?: any[];
  mastery_reached_at?: string;
  test_deadline?: string;
  last_test_date?: string;
  status?: 'in_progress' | 'pending_test' | 'completed';
  contributed_to_streak?: boolean;
}

interface Stats {
  total_cards_reviewed: number;
  current_streak: number;
  longest_streak: number;
  total_mastered: number;
  current_week_cards?: number; // Resets Sunday at midnight
  streak_frozen?: boolean;
  streak_frozen_stacks?: string[];
  // Streak system v2 fields (consolidated)
  cards_mastered_today?: number;
  display_deadline?: string | null;
  streak_deadline?: string | null;
  last_mastery_date?: string | null;
}

interface DashboardMainProps {
  stacks: Stack[];
  stats: Stats | null;
  userName?: string;
  isPremium?: boolean;
  onUpdate?: () => void;
  onShowTutorial?: () => void;
}

export default function DashboardMain({ stacks, stats, userName, isPremium = false, onUpdate, onShowTutorial }: DashboardMainProps) {
  const router = useRouter();
  const [deletingStackId, setDeletingStackId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stackToDelete, setStackToDelete] = useState<Stack | null>(null);
  const [deletionCheck, setDeletionCheck] = useState<StackDeletionCheck | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isCheckingDeletion, setIsCheckingDeletion] = useState(false);
  // Track stacks that are being deleted (optimistic UI)
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const supabase = createClient();
  
  // Generate More modal state
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [generationSourceStack, setGenerationSourceStack] = useState<SourceStackData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Fetch user ID on mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    fetchUserId();
  }, [supabase.auth]);

  // Separate stacks into carousel (unfinished) and archive (completed)
  // Filter out pending deletions for smooth UI
  const { carouselStacks, archivedStacks } = useMemo(() => {
    const carousel: Stack[] = [];
    const archived: Stack[] = [];
    
    stacks
      .filter(stack => !pendingDeletions.has(stack.id)) // Hide pending deletions
      .forEach(stack => {
        const testProgress = stack.test_progress ?? 0;
      const isCompleted = testProgress === 100 || stack.status === 'completed';
      
      if (isCompleted) {
        // Only add to archive if premium
        if (isPremium) {
          archived.push(stack);
        }
        // Free users: don't show completed stacks at all
      } else {
        carousel.push(stack);
      }
    });
    
    // Sort archived by completion date (newest first)
    archived.sort((a, b) => {
      const aDate = a.completion_date || a.last_test_date || a.created_at;
      const bDate = b.completion_date || b.last_test_date || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    
    return { carouselStacks: carousel, archivedStacks: archived };
  }, [stacks, isPremium]);

  // Calculate daily cards for streak
  const cardsMasteredToday = stats?.cards_mastered_today ?? 0;
  const currentStreak = stats?.current_streak ?? 0;
  const isFrozen = stats?.streak_frozen ?? false;

  // Check for pending tests
  const pendingTests = stacks.filter(s => 
    s.test_deadline && 
    (s.test_progress ?? 0) < 100 && 
    s.mastered_count === s.total_cards
  );
  const hasOverdue = pendingTests.some(s => isDeadlinePassed(s.test_deadline!));

  // Has met today's goal - for determining correct deadline (24h vs 48h grace)
  const hasMetTodayGoal = cardsMasteredToday >= STREAK_DAILY_REQUIREMENT;
  
  // Countdown timer state for daily streak
  // Pass currentStreak and hasMetTodayGoal to get correct deadline:
  // - No streak + no progress = end of today (24h max)
  // - Active streak OR met goal = end of tomorrow (48h grace)
  const [timeRemaining, setTimeRemaining] = useState(getStreakTimeRemaining(currentStreak, hasMetTodayGoal));
  
  // Countdown timer state for test deadline (find the most urgent pending test)
  const mostUrgentTest = pendingTests.length > 0 
    ? pendingTests.reduce((urgent, test) => {
        if (!urgent) return test;
        if (!test.test_deadline) return urgent;
        if (!urgent.test_deadline) return test;
        return new Date(test.test_deadline) < new Date(urgent.test_deadline) ? test : urgent;
      }, pendingTests[0])
    : null;
  
  const [testTimeRemaining, setTestTimeRemaining] = useState(
    mostUrgentTest?.test_deadline ? getTimeRemaining(mostUrgentTest.test_deadline) : null
  );
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getStreakTimeRemaining(currentStreak, hasMetTodayGoal));
      if (mostUrgentTest?.test_deadline) {
        setTestTimeRemaining(getTimeRemaining(mostUrgentTest.test_deadline));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mostUrgentTest?.test_deadline, currentStreak, hasMetTodayGoal]);

  // Format time as HH:MM:SS
  const formatTime = () => {
    const { hours, minutes, seconds } = timeRemaining;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Check if we're in the grace period (between display deadline 11:59pm and actual deadline +2hrs)
  const inGracePeriod = isInGracePeriod(stats?.display_deadline ?? null, stats?.streak_deadline ?? null);
  
  // Format countdown text
  const getCountdownText = (): string | null => {
    const hasMetGoal = cardsMasteredToday >= STREAK_DAILY_REQUIREMENT;
    const cardsNeeded = STREAK_DAILY_REQUIREMENT - cardsMasteredToday;
    
    // No streak - show motivational message to start streak
    if (currentStreak === 0 && !hasMetGoal) {
      return `Master ${cardsNeeded} cards to start your streak`;
    }
    
    // Goal met - show success message (same whether frozen or not)
    if (hasMetGoal) {
      return "Today's goal met! ✓";
    }
    
    // Grace period - show LAST CHANCE warning (hide the actual 2hr grace time)
    if (inGracePeriod) {
      return `LAST CHANCE! Master ${cardsNeeded} more cards NOW`;
    }
    
    // Normal countdown - show time remaining to master cards (only when streak > 0)
    return `${formatTime()} to master ${cardsNeeded} more`;
  };

  // Format test deadline countdown
  const formatTestDeadline = () => {
    if (!testTimeRemaining) return '';
    if (testTimeRemaining.isOverdue) return 'OVERDUE!';
    
    const { days, hours, minutes } = testTimeRemaining;
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Delete handlers (kept from original for carousel stacks with streak warnings)
  const handleDeleteClick = async (stack: Stack, e: React.MouseEvent) => {
    e.stopPropagation();
    setStackToDelete(stack);
    setIsCheckingDeletion(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Not authenticated');
        setIsCheckingDeletion(false);
        return;
      }
      
      const check = await checkStackDeletion(session.user.id, stack.id);
      setDeletionCheck(check);
      setShowDeleteDialog(true);
    } catch (error) {
      console.error('Error checking stack deletion:', error);
      setDeletionCheck(null);
      setShowDeleteDialog(true);
    } finally {
      setIsCheckingDeletion(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!stackToDelete) return;
    
    const stackId = stackToDelete.id;
    const resetStreak = deletionCheck?.warningType === 'streak_reset';
    const longestStreak = deletionCheck?.longestStreak || 0;
    
    // Optimistically remove from UI immediately
    setPendingDeletions(prev => new Set(prev).add(stackId));
    setDeletingStackId(stackId);
    setShowDeleteDialog(false);
    setStackToDelete(null);
    setDeletionCheck(null);

    // Perform deletion in background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Not authenticated');
        // Restore stack on error
        setPendingDeletions(prev => {
          const next = new Set(prev);
          next.delete(stackId);
          return next;
        });
        return;
      }
      
      const result = await executeStackDeletion(
        session.user.id,
        stackId,
        resetStreak
      );
      
      if (result.success) {
        if (resetStreak) {
          toast.success(`Stack deleted. Streak reset. Longest: ${longestStreak} days preserved.`);
        } else {
          toast.success('Stack deleted successfully');
        }
        
        // Refresh data after a short delay to allow UI to settle
        // Or wait for navigation away
        setTimeout(() => {
          onUpdate?.();
        }, 500);
      } else {
        // Restore stack on error
        setPendingDeletions(prev => {
          const next = new Set(prev);
          next.delete(stackId);
          return next;
        });
        toast.error(result.message || 'Failed to delete stack');
      }
    } catch (error) {
      console.error('Stack deletion error:', error);
      // Restore stack on error
      setPendingDeletions(prev => {
        const next = new Set(prev);
        next.delete(stackId);
        return next;
      });
      toast.error('Failed to delete stack');
    } finally {
      setDeletingStackId(null);
    }
  };
  
  // Clean up pending deletions when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // If there are pending deletions when navigating away, refresh to sync
      if (pendingDeletions.size > 0) {
        onUpdate?.();
      }
    };
  }, [pendingDeletions.size, onUpdate]);
  
  // Handle "Generate More" from existing stack
  const handleGenerateMore = async (stack: Stack, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Fetch the flashcard phrases from this stack to exclude duplicates
      const { data: flashcards, error } = await supabase
        .from('flashcards')
        .select('target_phrase')
        .eq('stack_id', stack.id);
      
      if (error) {
        console.error('Error fetching flashcard phrases:', error);
        toast.error('Failed to load stack data');
        return;
      }
      
      // Extract phrases to exclude
      const excludePhrases = flashcards?.map(card => card.target_phrase) || [];
      
      // Determine difficulty from stack's CEFR level or default
      const difficulty = stack.cefr_level || 'B1';
      
      // Set source stack data for the modal
      setGenerationSourceStack({
        scenario: stack.scenario || stack.title,
        language: stack.language,
        difficulty,
        excludePhrases,
      });
      
      // Open the generation modal
      setShowGenerationModal(true);
    } catch (err) {
      console.error('Error preparing generate more:', err);
      toast.error('Failed to prepare stack generation');
    }
  };
  
  // Close generation modal and clear source data
  const handleCloseGenerationModal = () => {
    setShowGenerationModal(false);
    setGenerationSourceStack(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mb-1">
          Welcome back, {userName || 'Friend'}! 👋
        </h1>
        <p className="text-[var(--text-secondary)] font-medium text-sm sm:text-lg">
          Keep up the great work learning {stacks[0]?.language || 'a new language'}
        </p>
      </div>

      {/* Unified Streak & Progress Card */}
      <div className="streak-progress-card rounded-[20px] p-6 border-2 border-[var(--border-color)] shadow-[var(--shadow-md)] relative overflow-hidden animate-fade-in stagger-1"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 150, 0, 0.08) 0%, rgba(88, 204, 2, 0.08) 50%, rgba(28, 176, 246, 0.08) 100%)'
        }}
      >
        {/* Background glow - constrained to prevent horizontal overflow */}
        <div className="absolute -top-1/2 right-0 w-[150px] sm:w-[200px] md:w-[300px] h-[150px] sm:h-[200px] md:h-[300px] bg-[radial-gradient(circle,rgba(255,150,0,0.1),transparent_60%)] rounded-full pointer-events-none" />
        
        {/* Top Row: Streak Ring + Calendar */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative z-10 mb-6">
          <div className="flex items-center gap-6 sm:gap-8 flex-1">
            {/* Streak Circle with Countdown */}
            <ProgressRing 
              current={cardsMasteredToday} 
              target={STREAK_DAILY_REQUIREMENT}
              streakCount={currentStreak}
              longestStreak={stats?.longest_streak ?? 0}
              size={120}
              strokeWidth={8}
              countdownText={getCountdownText()}
              isFrozen={isFrozen}
              isGracePeriod={inGracePeriod}
            />

            {/* Weekly Calendar */}
            <WeeklyCalendar 
              currentStreak={currentStreak}
              cardsMasteredToday={cardsMasteredToday}
              dailyRequirement={STREAK_DAILY_REQUIREMENT}
              lastMasteryDate={stats?.last_mastery_date}
              className="hidden sm:flex"
            />
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-[var(--border-color)] mb-6" />
        
        {/* Bottom Row: Key Stats */}
        <div className="relative z-10">
          <h3 className="font-display text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mb-4">
            Your Progress
          </h3>
          
          {/* Stats Grid - 3 key metrics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-[#ff9600] mb-1">
                {stats?.longest_streak ?? 0}
              </p>
              <p className="text-[10px] sm:text-sm text-[var(--text-secondary)] font-semibold flex items-center justify-center gap-1">
                <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-[#ff9600]" />
                Longest Streak
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-[#1cb0f6] mb-1">
                {stats?.current_week_cards ?? 0}
              </p>
              <p className="text-[10px] sm:text-sm text-[var(--text-secondary)] font-semibold flex items-center justify-center gap-1">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-[#1cb0f6]" />
                This Week
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-[#58cc02] mb-1">
                {stats?.total_mastered ?? 0}
              </p>
              <p className="text-[10px] sm:text-sm text-[var(--text-secondary)] font-semibold flex items-center justify-center gap-1">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-[#58cc02]" />
                Total Learned
              </p>
            </div>
          </div>
        </div>
        
        {/* Streak Rules Tutorial Button */}
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            className="absolute top-4 right-4 z-20 bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] rounded-xl p-2 sm:px-4 sm:py-2 flex items-center gap-2 transition-all hover:scale-105 border-2 border-[var(--border-color)]"
          >
            <HelpCircle className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-bold text-[var(--text-secondary)] hidden sm:inline">Streak Rules</span>
          </button>
        )}
        
      </div>

      {/* Gradient Separator */}
      <div className="relative my-6 animate-fade-in stagger-2">
        <div 
          className="w-full h-[3px] rounded-sm"
          style={{
            background: 'linear-gradient(90deg, #58cc02 0%, #1cb0f6 35%, #1cb0f6 65%, #ff9600 100%)',
            boxShadow: '0 0 8px rgba(88, 204, 2, 0.4)'
          }}
        />
        {/* Glow layer */}
        <div 
          className="absolute inset-0 -z-10 rounded-sm"
          style={{
            background: 'linear-gradient(90deg, #58cc02 0%, #1cb0f6 35%, #1cb0f6 65%, #ff9600 100%)',
            filter: 'blur(6px)',
            opacity: 0.5
          }}
        />
      </div>

      {/* Streak Frozen / Pending Tests Alert */}
      {pendingTests.length > 0 && (
        <div className={`rounded-[20px] mb-6 animate-fade-in stagger-3 border-2 overflow-hidden relative ${
          hasOverdue 
            ? 'border-[#1a1a1a]' 
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
        }`}>
          {/* Caution tape animated background for frozen state */}
          {hasOverdue && (
            <div 
              className="absolute inset-0 animate-[cautionSlide_1s_linear_infinite]"
              style={{
                background: `repeating-linear-gradient(
                  -45deg,
                  #ffcc00,
                  #ffcc00 20px,
                  #1a1a1a 20px,
                  #1a1a1a 40px
                )`,
                backgroundSize: '56.57px 100%',
              }}
            />
          )}
          
          {/* Content container with semi-transparent background for legibility */}
          <div className={`relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 ${
            hasOverdue ? 'bg-[#1a1a1a]/90 text-white m-1 rounded-[16px]' : ''
          }`}>
            <div className="text-4xl sm:text-5xl animate-wiggle">
              {hasOverdue ? '⚠️' : '⏰'}
            </div>
            <div className="flex-1">
              <h4 className="font-display text-lg sm:text-xl font-extrabold mb-1">
                {hasOverdue ? 'Streak Frozen! Time to Thaw!' : 'Pending Tests'}
              </h4>
              <p className="font-medium opacity-95 text-sm sm:text-base">
                {hasOverdue 
                  ? `Complete your pending tests to unfreeze! While frozen, keep mastering ${STREAK_DAILY_REQUIREMENT} cards daily or lose your streak.`
                  : 'Complete your tests to maintain your streak!'}
              </p>
              {hasOverdue && (
                <p className="mt-1 font-bold text-sm sm:text-base">
                  Today: {cardsMasteredToday}/{STREAK_DAILY_REQUIREMENT} cards {cardsMasteredToday >= STREAK_DAILY_REQUIREMENT ? '✓' : ''}
                </p>
              )}
              
              {/* Test Deadline Countdown - Always visible */}
              {mostUrgentTest?.test_deadline && (
                <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${
                  hasOverdue 
                    ? 'bg-[#ff4b4b] text-white animate-pulse' 
                    : testTimeRemaining && testTimeRemaining.totalHours < 24 
                      ? 'bg-red-500 text-white animate-pulse'
                      : testTimeRemaining && testTimeRemaining.days <= 2
                        ? 'bg-orange-500 text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--accent-orange)]'
                }`}>
                  <Calendar className="h-5 w-5" />
                  <span>Test deadline: {formatTestDeadline()}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => pendingTests[0] && router.push(`/stack/${pendingTests[0].id}`)}
              className={`w-full sm:w-auto font-extrabold rounded-2xl px-6 py-3 min-h-[48px] transition-all duration-200 ${
                hasOverdue 
                  ? 'bg-[#ffcc00] text-[#1a1a1a] hover:scale-105 shadow-[0_4px_0_#cc9900] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#cc9900]' 
                  : 'bg-gradient-to-r from-[#ff9600] to-[#ffaa00] text-white shadow-[0_4px_0_#cc7800] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#cc7800] active:translate-y-0 active:shadow-[0_2px_0_#cc7800]'
              }`}
            >
              Let's Do This! 💪
            </button>
          </div>
        </div>
      )}

      {/* Section Header with Create Button */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 animate-fade-in stagger-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
            Your Learning Stacks
          </h2>
          {!isPremium ? (
            <>
              <span className="text-sm font-medium text-[var(--text-primary)] shrink-0">
                {stacks.filter(s => !pendingDeletions.has(s.id)).length}/{FREE_TIER_LIMITS.MAX_TOTAL_STACKS}
              </span>
              {stacks.filter(s => !pendingDeletions.has(s.id)).length >= FREE_TIER_LIMITS.MAX_TOTAL_STACKS && (
                <span className="text-xs text-[var(--text-muted)] opacity-70">
                  Upgrade to Premium to create unlimited stacks
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-[var(--text-primary)] shrink-0">
                {stacks.filter(s => !pendingDeletions.has(s.id)).length}/∞
              </span>
              <span className="text-xs text-[var(--text-muted)] opacity-70">
                {PREMIUM_TIER_LIMITS.MAX_DAILY_STACKS} per day max. Delete stacks to create more.
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => router.push('/')}
          className="bg-[#58cc02] text-white font-extrabold rounded-xl px-6 py-3 shadow-[0_4px_0_#46a302] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#46a302] active:translate-y-0 active:shadow-[0_2px_0_#46a302] transition-all duration-200 shrink-0 ml-auto"
        >
          + Create New Stack
        </button>
      </div>

      {/* Stack Carousel (Unfinished Stacks Only) */}
      <StackCarousel 
        stacks={carouselStacks} 
        onDeleteClick={handleDeleteClick}
        deletingStackId={deletingStackId}
        onGenerateMore={handleGenerateMore}
      />

      {/* Archive/Vault Section (Completed Stacks) */}
      <div className="mt-8 animate-fade-in stagger-4">
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mb-4">
          Archive
        </h2>
        {isPremium ? (
          <ArchiveVault 
            stacks={archivedStacks.map(s => ({
              id: s.id,
              title: s.title,
              language: s.language,
              total_cards: s.total_cards,
              cefr_level: s.cefr_level,
              completion_date: s.completion_date || s.last_test_date,
              test_notes: s.test_notes,
            }))}
            onUpdate={onUpdate}
            className="animate-fade-in stagger-4"
          />
        ) : (
          <div className="rounded-[20px] p-6 border-2 border-[var(--border-color)] shadow-[var(--shadow-md)]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-[var(--text-secondary)] font-medium mb-4 text-center">
              Upgrade to Premium to create unlimited stacks and store completed stacks
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => setShowPremiumModal(true)}
                style={{ 
                  backgroundColor: 'var(--accent-green)', 
                  color: 'white',
                  boxShadow: '0 3px 0 var(--accent-green-dark)'
                }}
                className="font-extrabold rounded-xl px-6 py-3"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stack Generation Modal */}
      {userId && (
        <StackGenerationModal
          isOpen={showGenerationModal}
          onClose={handleCloseGenerationModal}
          userId={userId}
          isPremium={isPremium}
          sourceStack={generationSourceStack}
        />
      )}

      {/* Delete Dialog with Streak System v2 Warnings */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setDeletionCheck(null);
        }
      }}>
        <AlertDialogContent className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[20px]">
          <AlertDialogHeader>
            {deletionCheck?.warningType === 'streak_reset' && (
              <div className="flex items-center justify-center mb-2">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-[#ff4b4b]" />
                </div>
              </div>
            )}
            
            <AlertDialogTitle className="font-display text-xl font-extrabold text-[var(--text-primary)]">
              {deletionCheck?.warningType === 'streak_reset'
                ? '⚠️ This Will Reset Your Streak!'
                : deletionCheck?.warningType === 'legacy_test'
                  ? 'Legacy Test Stack'
                  : 'Delete Stack?'}
            </AlertDialogTitle>
            
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              {deletionCheck?.warningType === 'streak_reset' ? (
                <div className="space-y-3">
                  <p className="text-[#ff4b4b] font-medium">
                    Deleting this stack will reset your <span className="font-bold">{deletionCheck.currentStreak}-day streak</span> to 0.
                  </p>
                  <p>
                    Your longest streak of <span className="font-bold">{deletionCheck.longestStreak} days</span> will remain safe on your profile.
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    This stack has contributed to your current streak or has a pending test that can unfreeze your streak.
                  </p>
                </div>
              ) : deletionCheck?.warningType === 'legacy_test' ? (
                <div className="space-y-3">
                  <p>
                    This stack has a <span className="font-medium">legacy test</span> attached.
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Complete it anytime to properly unlock the stack. Deleting won't affect your current streak.
                  </p>
                </div>
              ) : (
                <p>
                  This will permanently delete "{stackToDelete?.title}" and all its cards.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border-color)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={`rounded-xl font-bold ${
                deletionCheck?.warningType === 'streak_reset'
                  ? 'bg-[#ff4b4b] hover:bg-red-600 text-white shadow-[0_4px_0_#cc3b3b]'
                  : 'bg-[#ff4b4b] hover:bg-red-600 text-white shadow-[0_4px_0_#cc3b3b]'
              } hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#cc3b3b] transition-all duration-200`}
              disabled={deletingStackId !== null || isCheckingDeletion}
            >
              {deletingStackId || isCheckingDeletion ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : deletionCheck?.warningType === 'streak_reset' ? (
                'Delete & Reset Streak'
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Premium Modal */}
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
}
