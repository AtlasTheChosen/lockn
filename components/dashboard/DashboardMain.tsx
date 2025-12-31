'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress-simple';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trophy, Plus, Flame, BookOpen, Trash2, Loader2, FileText, TrendingUp, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getCEFRBadgeColor } from '@/lib/cefr-ranking';
import { formatWeekRange, WEEKLY_CARD_CAP } from '@/lib/weekly-stats';
import { formatDeadlineDisplay, isDeadlinePassed, STREAK_DAILY_REQUIREMENT } from '@/lib/streak';

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
}

interface Stats {
  total_cards_reviewed: number;
  current_streak: number;
  longest_streak: number;
  total_mastered: number;
  current_week_cards?: number;
  weekly_average?: number;
  weekly_cards_history?: { week: string; count: number; reset_at: string }[];
  pause_weekly_tracking?: boolean;
  daily_cards_learned?: number;
  daily_cards_date?: string;
  streak_frozen?: boolean;
  streak_frozen_stacks?: string[];
}

interface DashboardMainProps {
  stacks: Stack[];
  stats: Stats | null;
  userName?: string;
  onUpdate?: () => void;
}

export default function DashboardMain({ stacks, stats, userName, onUpdate }: DashboardMainProps) {
  const router = useRouter();
  const [deletingStackId, setDeletingStackId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stackToDelete, setStackToDelete] = useState<Stack | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedStackNotes, setSelectedStackNotes] = useState<Stack | null>(null);
  const supabase = createClient();

  const completedStacks = stacks.filter(s => (s.test_progress ?? 0) === 100);
  const totalCards = stacks.reduce((sum, stack) => sum + (stack.total_cards || 0), 0);
  const totalMastered = stacks.reduce((sum, stack) => sum + (stack.mastered_count || 0), 0);

  const getProgress = (stack: Stack) => {
    if (!stack.total_cards || stack.total_cards === 0) return 0;
    const mastered = stack.mastered_count ?? 0;
    return Math.round((mastered / stack.total_cards) * 100);
  };

  const handleDeleteClick = (stack: Stack, e: React.MouseEvent) => {
    e.stopPropagation();
    setStackToDelete(stack);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!stackToDelete) return;
    setDeletingStackId(stackToDelete.id);

    try {
      await supabase.from('flashcards').delete().eq('stack_id', stackToDelete.id);
      await supabase.from('card_stacks').delete().eq('id', stackToDelete.id);
      toast.success('Stack deleted successfully');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to delete stack');
    } finally {
      setDeletingStackId(null);
      setShowDeleteDialog(false);
      setStackToDelete(null);
    }
  };

  const sortedStacks = [...stacks].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const capitalizeTitle = (title: string) => {
    return title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const getLanguageEmoji = (name: string) => {
    const emojiMap: Record<string, string> = {
      Spanish: '🇪🇸', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
      Japanese: '🇯🇵', Korean: '🇰🇷', Mandarin: '🇨🇳', Portuguese: '🇧🇷',
    };
    return emojiMap[name] || '🌍';
  };

  // Check for pending tests
  const pendingTests = stacks.filter(s => 
    s.test_deadline && 
    (s.test_progress ?? 0) < 100 && 
    s.mastered_count === s.total_cards
  );
  const hasOverdue = pendingTests.some(s => isDeadlinePassed(s.test_deadline!));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-4xl font-semibold gradient-text-warm mb-2">
          Welcome back, {userName || 'Friend'}! 🎉
        </h1>
        <p className="text-slate-500 font-medium text-lg">
          You're on fire! Keep the momentum going! 🚀
        </p>
      </div>

      {/* Weekly Progress Card */}
      {stats && (
        <div className="bg-gradient-purple-pink rounded-3xl p-8 shadow-purple text-white mb-8 relative overflow-hidden animate-fade-in stagger-1">
          {/* Background decoration */}
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-8 text-8xl opacity-20">✨</div>
          
          <div className="relative z-10">
            <h3 className="font-display text-2xl font-semibold mb-2">Your Week in Review 📊</h3>
            <p className="opacity-90 font-medium mb-6 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatWeekRange()}
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center border-2 border-white/20">
                <p className="font-display text-4xl font-bold mb-1">{stats.current_week_cards || 0}</p>
                <p className="text-sm font-semibold opacity-95">This Week</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center border-2 border-white/20">
                <p className="font-display text-4xl font-bold mb-1">{stats.weekly_average || 0}</p>
                <p className="text-sm font-semibold opacity-95">Weekly Avg</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center border-2 border-white/20">
                <p className="font-display text-4xl font-bold mb-1">{stats.total_mastered || 0}</p>
                <p className="text-sm font-semibold opacity-95">All Time</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streak Frozen / Pending Tests Alert */}
      {pendingTests.length > 0 && (
        <div className={`rounded-3xl p-6 mb-8 flex items-center gap-6 animate-fade-in stagger-2 ${
          hasOverdue 
            ? 'bg-gradient-orange-yellow text-white' 
            : 'bg-amber-50 border-2 border-amber-200 text-amber-800'
        }`}>
          <div className="text-5xl animate-wiggle">
            {hasOverdue ? '❄️' : '⏰'}
          </div>
          <div className="flex-1">
            <h4 className="font-display text-xl font-semibold mb-1">
              {hasOverdue ? 'Streak Frozen! Time to Thaw!' : 'Pending Tests'}
            </h4>
            <p className="font-medium opacity-95">
              {hasOverdue 
                ? `Complete your pending tests to get that streak blazing again! You've got ${stats?.daily_cards_learned || 0}/${STREAK_DAILY_REQUIREMENT} cards mastered today!`
                : 'Complete your tests to maintain your streak!'}
            </p>
          </div>
          <Button
            onClick={() => pendingTests[0] && router.push(`/stack/${pendingTests[0].id}`)}
            className={`font-bold rounded-2xl px-6 py-3 ${
              hasOverdue 
                ? 'bg-white text-orange-500 hover:bg-white/90' 
                : 'bg-gradient-orange-yellow text-white'
            }`}
          >
            Let's Do This! 💪
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-talka-sm text-center card-hover animate-fade-in stagger-3">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-sm font-semibold text-slate-500 mb-2">Total Stacks</p>
          <p className="font-display text-3xl font-bold gradient-text">{stacks.length}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-talka-sm text-center card-hover animate-fade-in stagger-4">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm font-semibold text-slate-500 mb-2">Completed</p>
          <p className="font-display text-3xl font-bold gradient-text">{completedStacks.length}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-talka-sm text-center card-hover animate-fade-in stagger-5">
          <div className="text-4xl mb-3">🎴</div>
          <p className="text-sm font-semibold text-slate-500 mb-2">Cards Mastered</p>
          <p className="font-display text-3xl font-bold gradient-text">{totalMastered}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-talka-sm text-center card-hover animate-fade-in stagger-6">
          <div className="text-4xl mb-3">🔥</div>
          <p className="text-sm font-semibold text-slate-500 mb-2">Day Streak</p>
          <p className="font-display text-3xl font-bold gradient-text">{stats?.current_streak || 0}</p>
        </div>
      </div>

      {/* Stacks Section */}
      <div className="flex justify-between items-center mb-6 animate-fade-in stagger-7">
        <h2 className="font-display text-2xl font-semibold text-slate-800">
          Your Learning Stacks 📖
        </h2>
        <Button
          onClick={() => router.push('/')}
          className="bg-gradient-green-cyan text-white font-bold rounded-2xl px-6 py-3 shadow-green hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          ✨ Create New Stack
        </Button>
      </div>

      {/* Stack Cards */}
      {sortedStacks.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-talka-sm animate-fade-in">
          <div className="text-6xl mb-6 opacity-50">📚</div>
          <h3 className="font-display text-2xl font-semibold text-slate-700 mb-4">
            No stacks yet – let's create your first one!
          </h3>
          <Button
            onClick={() => router.push('/')}
            className="bg-gradient-green-cyan text-white font-bold rounded-2xl px-8 py-4 shadow-green hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Create Your First Stack ✨
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedStacks.map((stack, idx) => {
            const progress = getProgress(stack);

            return (
              <div
                key={stack.id}
                className="bg-white rounded-3xl p-6 shadow-talka-sm hover:shadow-talka-lg hover:-translate-y-1 transition-all cursor-pointer animate-fade-in"
                style={{ animationDelay: `${0.8 + idx * 0.1}s` }}
                onClick={() => router.push(`/stack/${stack.id}`)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-gradient-green-cyan text-white rounded-xl text-sm font-bold">
                      {stack.cefr_level || 'B1'}
                    </span>
                    <span className="px-3 py-1 bg-gradient-blue-purple text-white rounded-xl text-sm font-bold">
                      {stack.language} {getLanguageEmoji(stack.language)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {stack.test_notes && stack.test_notes.length > 0 && (
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-amber-100 text-amber-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStackNotes(stack);
                          setShowNotesModal(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 transition-colors"
                      onClick={(e) => handleDeleteClick(stack, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">
                  {capitalizeTitle(stack.title)} 
                </h3>
                <p className="text-slate-500 mb-4 line-clamp-2">
                  {capitalizeTitle(stack.scenario)}
                </p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-500 font-semibold">Progress</span>
                    <span className="font-bold gradient-text">{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-purple-pink rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                  <span className="text-slate-500 text-sm font-semibold">
                    Test: {stack.test_progress ?? 0}%
                  </span>
                  <span className={`px-3 py-1 rounded-xl text-sm font-bold ${
                    (stack.test_progress ?? 0) === 100
                      ? 'bg-gradient-green-cyan text-white'
                      : progress === 100
                        ? 'bg-gradient-orange-yellow text-white animate-pulse-soft'
                        : 'bg-gradient-green-cyan text-white'
                  }`}>
                    {(stack.test_progress ?? 0) === 100
                      ? 'Complete! 🎉'
                      : progress === 100
                        ? 'Ready to Test! 🎯'
                        : 'Learning 📖'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border-2 border-slate-200 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-semibold text-slate-800">Delete Stack?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              This will permanently delete "{stackToDelete?.title}" and all its cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold"
              disabled={deletingStackId !== null}
            >
              {deletingStackId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Test Notes - {selectedStackNotes?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {selectedStackNotes?.test_notes?.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No notes yet. Complete a test to see AI feedback here.</p>
            ) : (
              selectedStackNotes?.test_notes?.map((note: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-slate-800">{note.targetPhrase}</p>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      note.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {note.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-2">Your answer: {note.userAnswer}</p>
                  {note.correction && (
                    <div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
                      <p className="text-amber-700 text-sm font-medium">Correction: {note.correction}</p>
                    </div>
                  )}
                  {note.feedback && (
                    <p className="text-slate-400 text-xs mt-2 italic">{note.feedback}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
