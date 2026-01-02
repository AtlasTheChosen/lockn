'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  BookOpen,
  Search,
  Copy,
  Users,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Languages,
} from 'lucide-react';
import type { SharedStack, CardStack, FriendProfile } from '@/lib/types';

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: sessionUser, loading: sessionLoading } = useSession();
  
  const [sharedStacks, setSharedStacks] = useState<SharedStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copying, setCopying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const loadSharedStacks = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch public shared stacks
      const { data: sharesData, error: sharesError } = await supabase
        .from('shared_stacks')
        .select(`
          id,
          stack_id,
          shared_by,
          is_public,
          copy_count,
          created_at
        `)
        .eq('is_public', true)
        .order('copy_count', { ascending: false });

      if (sharesError) {
        if (sharesError.message?.includes('does not exist')) {
          setSharedStacks([]);
          setLoading(false);
          return;
        }
        throw sharesError;
      }

      if (!sharesData || sharesData.length === 0) {
        setSharedStacks([]);
        setLoading(false);
        return;
      }

      // Get stack IDs and user IDs
      const stackIds = Array.from(new Set(sharesData.map(s => s.stack_id)));
      const userIds = Array.from(new Set(sharesData.map(s => s.shared_by)));

      // Fetch stacks
      const { data: stacksData } = await supabase
        .from('card_stacks')
        .select('id, title, description, target_language, native_language, card_count')
        .in('id', stackIds);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', userIds);

      const stackMap = new Map(stacksData?.map(s => [s.id, s]) || []);
      const profileMap = new Map<string, FriendProfile>(
        profilesData?.map(p => [p.id, p]) || []
      );

      // Combine data
      const enrichedStacks: SharedStack[] = sharesData
        .map(share => ({
          ...share,
          stack: stackMap.get(share.stack_id) as CardStack | undefined,
          sharer_profile: profileMap.get(share.shared_by),
        }))
        .filter(s => s.stack); // Only include stacks that still exist

      setSharedStacks(enrichedStacks);
    } catch (err: any) {
      console.error('Error loading library:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadSharedStacks();
  }, [loadSharedStacks]);

  const handleCopyStack = async (sharedStack: SharedStack) => {
    if (!sessionUser) {
      router.push('/auth/login');
      return;
    }

    if (!sharedStack.stack) return;

    try {
      setCopying(sharedStack.id);
      setMessage(null);

      // First, fetch the original flashcards
      const { data: originalCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('stack_id', sharedStack.stack_id)
        .order('card_order', { ascending: true });

      if (cardsError) throw cardsError;

      // Create new stack for the user
      const { data: newStack, error: stackError } = await supabase
        .from('card_stacks')
        .insert({
          user_id: sessionUser.id,
          title: sharedStack.stack.title,
          description: sharedStack.stack.description,
          target_language: sharedStack.stack.target_language,
          native_language: sharedStack.stack.native_language,
          card_count: originalCards?.length || 0,
          completed_count: 0,
          mastered_count: 0,
          is_completed: false,
          test_progress: 0,
          test_notes: [],
        })
        .select()
        .single();

      if (stackError) throw stackError;

      // Copy flashcards to the new stack
      if (originalCards && originalCards.length > 0) {
        const newCards = originalCards.map(card => ({
          stack_id: newStack.id,
          user_id: sessionUser.id,
          card_order: card.card_order,
          target_phrase: card.target_phrase,
          native_translation: card.native_translation,
          example_sentence: card.example_sentence,
          tone_advice: card.tone_advice,
          mastery_level: 0,
          ease_factor: 2.5,
          interval_days: 1,
          next_review_date: new Date().toISOString(),
          review_count: 0,
        }));

        const { error: insertError } = await supabase
          .from('flashcards')
          .insert(newCards);

        if (insertError) throw insertError;
      }

      // Update copy count
      await supabase
        .from('shared_stacks')
        .update({ copy_count: (sharedStack.copy_count || 0) + 1 })
        .eq('id', sharedStack.id);

      setMessage({ type: 'success', text: 'Stack copied to your collection!' });
      
      // Refresh to show updated copy count
      loadSharedStacks();
    } catch (err: any) {
      console.error('Failed to copy stack:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to copy stack' });
    } finally {
      setCopying(null);
    }
  };

  const filteredStacks = sharedStacks.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.stack?.title.toLowerCase().includes(query) ||
      s.stack?.target_language.toLowerCase().includes(query) ||
      s.sharer_profile?.display_name?.toLowerCase().includes(query)
    );
  });

  const getInitials = (profile?: FriendProfile) => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-700" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <Skeleton className="h-32 bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-indigo-400" />
                Stack Library
              </h1>
              <p className="text-slate-400 text-sm">Browse and copy community stacks</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stacks..."
              className="bg-slate-900 border-slate-700 text-white pl-10"
            />
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Stack Grid */}
        {filteredStacks.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {searchQuery ? 'No stacks match your search' : 'No shared stacks yet'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery ? 'Try a different search term' : 'Be the first to share a stack!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStacks.map((sharedStack) => (
              <Card 
                key={sharedStack.id} 
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors"
              >
                <CardContent className="p-5">
                  {/* Stack Title */}
                  <h3 className="font-semibold text-white text-lg mb-2 line-clamp-1">
                    {sharedStack.stack?.title || 'Untitled Stack'}
                  </h3>

                  {/* Description */}
                  {sharedStack.stack?.description && (
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                      {sharedStack.stack.description}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      <Languages className="h-3 w-3 mr-1" />
                      {sharedStack.stack?.target_language}
                    </Badge>
                    <Badge className="bg-slate-600/50 text-slate-300 border-slate-500/30">
                      {sharedStack.stack?.card_count} cards
                    </Badge>
                  </div>

                  {/* Sharer Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                    <Link href={`/profile/${sharedStack.shared_by}`}>
                      <div className="flex items-center gap-2 hover:opacity-80">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={sharedStack.sharer_profile?.avatar_url} />
                          <AvatarFallback className="bg-slate-700 text-white text-xs">
                            {getInitials(sharedStack.sharer_profile)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-slate-300">
                          {sharedStack.sharer_profile?.display_name || 'User'}
                        </span>
                      </div>
                    </Link>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Copy className="h-3 w-3" />
                      {sharedStack.copy_count || 0}
                    </span>
                  </div>

                  {/* Copy Button */}
                  <Button
                    onClick={() => handleCopyStack(sharedStack)}
                    disabled={copying === sharedStack.id || sharedStack.shared_by === sessionUser?.id}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {copying === sharedStack.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Copying...
                      </>
                    ) : sharedStack.shared_by === sessionUser?.id ? (
                      'Your Stack'
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy to My Stacks
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-talka-purple" />
      </div>
    }>
      <LibraryContent />
    </Suspense>
  );
}

