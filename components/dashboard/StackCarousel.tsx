'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress-simple';
import { ChevronLeft, ChevronRight, Plus, ArrowRight, Clock, Lock, Snowflake, Trash2 } from 'lucide-react';
import BirdMascot from './BirdMascot';

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
  test_progress?: number;
  test_deadline?: string;
  status?: 'in_progress' | 'pending_test' | 'completed';
  contributed_to_streak?: boolean;
}

interface StackCarouselProps {
  stacks: Stack[];
  onDeleteClick?: (stack: Stack, e: React.MouseEvent) => void;
  deletingStackId?: string | null;
}

// Check if deadline has passed
function isDeadlinePassed(deadline: string): boolean {
  return new Date() > new Date(deadline);
}

// Format countdown
function formatCountdown(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Overdue';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return 'Soon';
}

export default function StackCarousel({ stacks, onDeleteClick, deletingStackId }: StackCarouselProps) {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 640px)': { slidesToScroll: 2 },
      '(min-width: 1024px)': { slidesToScroll: 3 },
    },
  });

  // Filter and sort stacks - only unfinished stacks
  const carouselStacks = useMemo(() => {
    // Filter: only show stacks that are NOT completed
    const filtered = stacks.filter(stack => {
      const testProgress = stack.test_progress ?? 0;
      const isCompleted = testProgress === 100 || stack.status === 'completed';
      return !isCompleted;
    });
    
    // Sort by urgency:
    // 1. Frozen/overdue tests first (URGENT)
    // 2. Pending test stacks (HIGH)
    // 3. In-progress by last activity (NORMAL)
    return filtered.sort((a, b) => {
      // Frozen/overdue first
      const aFrozen = a.test_deadline && isDeadlinePassed(a.test_deadline);
      const bFrozen = b.test_deadline && isDeadlinePassed(b.test_deadline);
      if (aFrozen && !bFrozen) return -1;
      if (bFrozen && !aFrozen) return 1;
      
      // Then pending tests
      const aPending = a.status === 'pending_test' || (a.mastered_count === a.total_cards && (a.test_progress ?? 0) < 100);
      const bPending = b.status === 'pending_test' || (b.mastered_count === b.total_cards && (b.test_progress ?? 0) < 100);
      if (aPending && !bPending) return -1;
      if (bPending && !aPending) return 1;
      
      // Then by last activity
      const aDate = new Date(a.last_reviewed || a.created_at).getTime();
      const bDate = new Date(b.last_reviewed || b.created_at).getTime();
      return bDate - aDate;
    });
  }, [stacks]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const getProgress = (stack: Stack) => {
    if (!stack.total_cards || stack.total_cards === 0) return 0;
    return Math.round((stack.mastered_count / stack.total_cards) * 100);
  };

  const capitalizeTitle = (title: string) => {
    return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const getLanguageEmoji = (name: string) => {
    const emojiMap: Record<string, string> = {
      Spanish: '🇪🇸', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
      Japanese: '🇯🇵', Korean: '🇰🇷', Mandarin: '🇨🇳', Portuguese: '🇧🇷',
    };
    return emojiMap[name] || '🌍';
  };

  const getStatusBadge = (stack: Stack) => {
    const progress = getProgress(stack);
    const isFrozen = stack.test_deadline && isDeadlinePassed(stack.test_deadline);
    const isPendingTest = progress === 100 && (stack.test_progress ?? 0) < 100;
    
    if (isFrozen) {
      return (
        <span className="px-3 py-1 rounded-xl text-sm font-bold bg-cyan-500 text-white flex items-center gap-1">
          <Snowflake className="h-3 w-3" />
          Frozen!
        </span>
      );
    }
    if (isPendingTest) {
      return (
        <span className="px-3 py-1 rounded-xl text-sm font-bold bg-gradient-orange-yellow text-white animate-pulse-soft">
          Ready to Test! 🎯
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-xl text-sm font-bold bg-gradient-green-cyan text-white">
        Learning 📖
      </span>
    );
  };

  // Empty state with bird mascot
  if (carouselStacks.length === 0) {
    return (
      <div className="mb-8 animate-fade-in">
        <h2 className="font-display text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Continue Learning 📖
        </h2>
        <div className="rounded-3xl p-8 sm:p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-col items-center">
            <BirdMascot 
              state="idle" 
              size="lg" 
              showSpeechBubble 
              className="mb-4"
            />
            <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No active stacks!
            </h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Generate one to start your learning journey!</p>
            <Button
              onClick={() => router.push('/')}
              className="text-white font-bold rounded-2xl px-6 py-3 min-h-[48px] hover:-translate-y-0.5 transition-all active:translate-y-1"
              style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Stack
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Continue Learning 📖
        </h2>
        {carouselStacks.length > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {carouselStacks.map((stack) => {
            const progress = getProgress(stack);
            const isFrozen = stack.test_deadline && isDeadlinePassed(stack.test_deadline);
            const isPendingTest = progress === 100 && (stack.test_progress ?? 0) < 100;
            
            return (
              <div
                key={stack.id}
                className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(33.333%-0.667rem)] min-w-0"
              >
                <div 
                  className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:-translate-y-1 transition-all cursor-pointer h-full"
                  style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    boxShadow: 'var(--shadow-sm)',
                    border: isFrozen ? '2px solid var(--accent-blue)' : isPendingTest ? '2px solid var(--accent-orange)' : '1px solid var(--border-color)'
                  }}
                  onClick={() => router.push(`/stack/${stack.id}`)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="px-2 py-1 text-white rounded-lg text-xs font-bold" style={{ background: 'linear-gradient(to right, var(--accent-blue), var(--accent-green))' }}>
                        {getLanguageEmoji(stack.language)} {stack.language}
                      </span>
                      {stack.contributed_to_streak && stack.status !== 'completed' && (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1" style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)', color: 'var(--accent-orange)' }} title="Contributing to streak">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Countdown for pending tests */}
                      {isPendingTest && stack.test_deadline && (
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                          style={isFrozen 
                            ? { backgroundColor: 'rgba(255, 75, 75, 0.2)', color: 'var(--accent-red)', border: '1px solid rgba(255, 75, 75, 0.3)' }
                            : { backgroundColor: 'rgba(251, 146, 60, 0.2)', color: 'var(--accent-orange)', border: '1px solid rgba(251, 146, 60, 0.3)' }
                          }
                        >
                          <Clock className="h-3 w-3" />
                          {formatCountdown(stack.test_deadline)}
                        </span>
                      )}
                      {/* Delete button */}
                      {onDeleteClick && (
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                          onClick={(e) => onDeleteClick(stack, e)}
                          disabled={deletingStackId === stack.id}
                          title={stack.contributed_to_streak ? 'Delete (will reset streak)' : 'Delete stack'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg font-semibold mb-3 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {capitalizeTitle(stack.title)}
                  </h3>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Progress</span>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {stack.mastered_count}/{stack.total_cards} cards mastered
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    {getStatusBadge(stack)}
                    <Button
                      size="sm"
                      className="text-white font-semibold rounded-xl px-4 transition-all active:translate-y-1"
                      style={{ 
                        backgroundColor: isPendingTest ? 'var(--accent-orange)' : 'var(--accent-green)', 
                        boxShadow: isPendingTest ? '0 3px 0 #cc7800' : '0 3px 0 var(--accent-green-dark)' 
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/stack/${stack.id}${isPendingTest ? '?tab=test' : ''}`);
                      }}
                    >
                      {isPendingTest ? 'Take Test' : 'Continue'}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Swipe hint on mobile */}
      {carouselStacks.length > 1 && (
        <p className="text-center text-sm mt-3 sm:hidden" style={{ color: 'var(--text-muted)' }}>
          ← Swipe for more stacks →
        </p>
      )}
    </div>
  );
}

