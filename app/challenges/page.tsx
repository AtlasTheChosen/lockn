'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ChallengeCard from '@/components/social/ChallengeCard';
import CreateChallengeModal from '@/components/social/CreateChallengeModal';
import {
  ArrowLeft,
  Zap,
  Swords,
  Clock,
  Trophy,
  Plus,
  Loader2,
} from 'lucide-react';
import type { Challenge, FriendProfile } from '@/lib/types';

export default function ChallengesPage() {
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useSession();
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const supabase = createClient();

  const loadChallenges = useCallback(async () => {
    if (!sessionUser) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all challenges where user is involved
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .or(`challenger_id.eq.${sessionUser.id},challenged_id.eq.${sessionUser.id}`)
        .order('created_at', { ascending: false });

      if (challengesError) {
        if (challengesError.message?.includes('does not exist')) {
          setChallenges([]);
          setLoading(false);
          return;
        }
        throw challengesError;
      }

      if (!challengesData || challengesData.length === 0) {
        setChallenges([]);
        setLoading(false);
        return;
      }

      // Get all unique user IDs
      const userIds = new Set<string>();
      challengesData.forEach(c => {
        userIds.add(c.challenger_id);
        userIds.add(c.challenged_id);
      });

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, email')
        .in('id', Array.from(userIds));

      const profileMap = new Map<string, FriendProfile>(
        profilesData?.map(p => [p.id, p]) || []
      );

      // Enrich challenges with profiles
      const enrichedChallenges: Challenge[] = challengesData.map(challenge => ({
        ...challenge,
        challenger_profile: profileMap.get(challenge.challenger_id),
        challenged_profile: profileMap.get(challenge.challenged_id),
      }));

      setChallenges(enrichedChallenges);
    } catch (err: any) {
      console.error('Error loading challenges:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionUser, supabase]);

  // Handle authentication
  useEffect(() => {
    if (!sessionLoading && !sessionUser) {
      router.push('/auth/login');
    }
  }, [sessionUser, sessionLoading, router]);

  // Load challenges
  useEffect(() => {
    if (sessionUser) {
      loadChallenges();
    }
  }, [sessionUser, loadChallenges]);

  // Filter challenges by status
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pendingChallenges = challenges.filter(c => c.status === 'pending');
  const completedChallenges = challenges.filter(c => 
    c.status === 'completed' || c.status === 'declined' || c.status === 'cancelled'
  );

  // Loading state
  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-700" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <Skeleton className="h-24 bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-400" />
                Challenges
              </h1>
              <p className="text-slate-400 text-sm">Compete with friends</p>
            </div>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Challenge
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="bg-red-900/20 border-red-800 mb-6">
            <CardContent className="py-4 text-center text-red-400">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 mb-6">
            <TabsTrigger value="active" className="gap-2">
              <Swords className="h-4 w-4" />
              Active ({activeChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <Trophy className="h-4 w-4" />
              History ({completedChallenges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeChallenges.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Swords className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No active challenges</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Start a new challenge to compete with friends
                  </p>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Challenge
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={sessionUser.id}
                  onUpdate={loadChallenges}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingChallenges.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No pending challenges</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Challenges you've sent or received will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={sessionUser.id}
                  onUpdate={loadChallenges}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedChallenges.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No completed challenges yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Your challenge history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={sessionUser.id}
                  onUpdate={loadChallenges}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Create Challenge Modal */}
        <CreateChallengeModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          userId={sessionUser.id}
          onSuccess={loadChallenges}
        />
      </div>
    </div>
  );
}






