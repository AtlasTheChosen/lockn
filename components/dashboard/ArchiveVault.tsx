'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Trash2, FileText, Check, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ArchivedStack {
  id: string;
  title: string;
  language: string;
  total_cards: number;
  cefr_level?: string;
  completion_date?: string;
  test_notes?: any[];
}

interface ArchiveVaultProps {
  stacks: ArchivedStack[];
  onUpdate?: () => void;
  className?: string;
}

export default function ArchiveVault({ stacks, onUpdate, className = '' }: ArchiveVaultProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletingStackId, setDeletingStackId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stackToDelete, setStackToDelete] = useState<ArchivedStack | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedStackNotes, setSelectedStackNotes] = useState<ArchivedStack | null>(null);
  
  const supabase = createClient();
  
  const getLanguageEmoji = (name: string) => {
    const emojiMap: Record<string, string> = {
      Spanish: '🇪🇸', French: '🇫🇷', German: '🇩🇪', Italian: '🇮🇹',
      Japanese: '🇯🇵', Korean: '🇰🇷', Mandarin: '🇨🇳', Portuguese: '🇧🇷',
    };
    return emojiMap[name] || '🌍';
  };
  
  const capitalizeTitle = (title: string) => {
    return title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const handleDeleteClick = (stack: ArchivedStack, e: React.MouseEvent) => {
    e.stopPropagation();
    setStackToDelete(stack);
    setShowDeleteDialog(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!stackToDelete) return;
    
    const stackId = stackToDelete.id;
    
    // Optimistically remove from UI immediately
    setPendingDeletions(prev => new Set(prev).add(stackId));
    setDeletingStackId(stackId);
    setShowDeleteDialog(false);
    setStackToDelete(null);

    // Perform deletion in background
    try {
      // Completed stacks can be deleted without streak impact
      // Delete flashcards first
      await supabase
        .from('flashcards')
        .delete()
        .eq('stack_id', stackId);
      
      // Delete any test records
      await supabase
        .from('stack_tests')
        .delete()
        .eq('stack_id', stackId);
      
      // Delete the stack
      const { error } = await supabase
        .from('card_stacks')
        .delete()
        .eq('id', stackId);
      
      if (error) throw error;
      
      toast.success('Stack deleted from archive');
      
      // Refresh data after a short delay to allow UI to settle
      setTimeout(() => {
        onUpdate?.();
      }, 500);
    } catch (error) {
      console.error('Delete error:', error);
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
  
  // Clean up pending deletions when component unmounts
  useEffect(() => {
    return () => {
      if (pendingDeletions.size > 0) {
        onUpdate?.();
      }
    };
  }, [pendingDeletions.size, onUpdate]);
  
  if (stacks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`bg-[var(--bg-card)] rounded-[20px] p-6 border-2 border-[var(--border-color)] ${className}`}
      >
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <Archive className="h-5 w-5" />
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--text-secondary)]">Archive</h3>
            <p className="text-sm">Complete your first stack to see it here!</p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-[var(--bg-card)] rounded-[20px] border-2 border-[var(--border-color)] overflow-hidden ${className}`}
    >
      {/* Header - Always visible */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--border-color)] flex items-center justify-center">
            <Archive className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              Archive
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {stacks.length} completed stack{stacks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <span className="text-sm font-medium">{isExpanded ? 'Hide' : 'Show'}</span>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </motion.button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-[var(--border-color)]">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-4">
                {stacks
                  .filter(stack => !pendingDeletions.has(stack.id))
                  .map((stack, index) => (
                  <motion.div
                    key={stack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="bg-[var(--bg-secondary)] rounded-2xl p-4 border-2 border-[var(--border-color)] hover:border-[#58cc02] transition-all cursor-pointer"
                    onClick={() => router.push(`/stack/${stack.id}`)}
                    whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="px-2 py-1 bg-[#58cc02] text-white rounded-lg text-xs font-bold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          100%
                        </span>
                        <span className="px-2 py-1 bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-lg text-xs font-bold border border-[var(--border-color)]">
                          {stack.cefr_level || 'B1'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {stack.test_notes && stack.test_notes.length > 0 && (
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-card)] hover:bg-amber-500/20 text-amber-500 transition-colors border border-[var(--border-color)]"
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
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-card)] hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 transition-colors border border-[var(--border-color)]"
                          onClick={(e) => handleDeleteClick(stack, e)}
                          disabled={deletingStackId === stack.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h4 className="font-display text-base font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
                      {capitalizeTitle(stack.title)}
                    </h4>
                    
                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                      <span>{getLanguageEmoji(stack.language)} {stack.language}</span>
                      <span>{stack.total_cards} cards</span>
                    </div>
                
                {/* Completion date */}
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      Completed {formatDate(stack.completion_date)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Simple Delete Dialog (no streak warning for archived stacks) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-semibold text-[var(--text-primary)]">
              Delete from Archive?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              This will permanently delete "{stackToDelete?.title}" and all its cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-semibold bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--border-color)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-[#ff4b4b] hover:bg-[#e04444] text-white rounded-2xl font-semibold shadow-[0_4px_0_0_#cc3b3b] hover:brightness-105"
              disabled={deletingStackId !== null}
            >
              {deletingStackId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[20px] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Test Notes - {selectedStackNotes?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {selectedStackNotes?.test_notes?.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">No notes recorded.</p>
            ) : (
              selectedStackNotes?.test_notes?.map((note: any, idx: number) => (
                <div key={idx} className="bg-[var(--bg-secondary)] rounded-2xl p-4 border-2 border-[var(--border-color)]">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-[var(--text-primary)]">{note.targetPhrase}</p>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      note.passed ? 'bg-green-500/20 text-[#58cc02]' : 'bg-red-500/20 text-[#ff4b4b]'
                    }`}>
                      {note.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm mb-2">Your answer: {note.userAnswer}</p>
                  {note.correction && (
                    <div className="bg-amber-500/10 rounded-xl p-3 border-2 border-amber-500/30">
                      <p className="text-amber-500 text-sm font-medium">Correction: {note.correction}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
