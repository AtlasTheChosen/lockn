'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Sparkles, ArrowLeft } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const supabase = createClient();

        const { data } = await supabase
          .from('leaderboard_entries')
          .select('*')
          .order('stacks_completed', { ascending: false })
          .limit(100);

        setLeaderboard(data || []);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const rankedLeaderboard = leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  const getIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300';
    return 'bg-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">ScenarioFluent</span>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
          <p className="text-xl text-slate-600">
            Top learners ranked by completed stacks
          </p>
        </div>

        <div className="space-y-3">
          {rankedLeaderboard.length > 0 ? (
            rankedLeaderboard.map((entry) => (
              <Card key={entry.id} className={`${getRankColor(entry.rank)} border-2 transition-all hover:shadow-lg`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 min-w-[60px]">
                        {getIcon(entry.rank) || (
                          <Badge variant="outline" className="text-lg font-bold">
                            #{entry.rank}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">
                          {entry.email.split('@')[0]}
                        </p>
                        <p className="text-sm text-slate-600">
                          {entry.stacks_completed} {entry.stacks_completed === 1 ? 'stack' : 'stacks'} completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {entry.stacks_completed}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No entries yet</CardTitle>
                <CardDescription>
                  Complete your first stack to appear on the leaderboard!
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
