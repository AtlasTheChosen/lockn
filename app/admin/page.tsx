'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, BookOpen, Zap, Crown, ArrowLeft, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalStacks: 0,
    totalCards: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const supabase = createClient();

        const { count: totalUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        const { count: premiumUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_premium', true);

        const { count: totalStacks } = await supabase
          .from('card_stacks')
          .select('*', { count: 'exact', head: true });

        const { count: totalCards } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true });

        const { data: users } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setStats({
          totalUsers: totalUsers || 0,
          premiumUsers: premiumUsers || 0,
          totalStacks: totalStacks || 0,
          totalCards: totalCards || 0,
        });

        setRecentUsers(users || []);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, []);

  const handleResetData = async () => {
    setResetLoading(true);
    setResetResult(null);
    
    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_ALL_DATA' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetResult({ success: true, message: 'All user data has been reset!' });
        // Refresh stats
        setStats({
          ...stats,
          totalStacks: data.remaining?.stacks || 0,
          totalCards: data.remaining?.flashcards || 0,
        });
      } else {
        setResetResult({ success: false, message: data.error || 'Reset failed' });
      }
    } catch (error: any) {
      setResetResult({ success: false, message: error.message || 'Network error' });
    } finally {
      setResetLoading(false);
      setShowResetConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">ScenarioFluent Admin</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Platform metrics and user management</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Premium Users</CardDescription>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-3xl">{stats.premiumUsers}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Stacks</CardDescription>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                <CardTitle className="text-3xl">{stats.totalStacks}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Cards</CardDescription>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-3xl">{stats.totalCards}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Data Management Section */}
        <Card className="mb-8 border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600">
              Destructive actions - use with caution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                <div>
                  <p className="font-semibold text-slate-800">Reset All User Data</p>
                  <p className="text-sm text-slate-600">
                    Delete all stacks, flashcards, stats, and progress. Keeps user accounts.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowResetConfirm(true)}
                  disabled={resetLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Data
                </Button>
              </div>
              
              {resetResult && (
                <div className={`p-4 rounded-lg ${resetResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {resetResult.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Confirm Reset</h3>
              </div>
              <p className="text-slate-600 mb-6">
                This will permanently delete <strong>ALL</strong> user data:
              </p>
              <ul className="list-disc list-inside text-slate-600 mb-6 space-y-1">
                <li>All flashcard stacks ({stats.totalStacks})</li>
                <li>All flashcards ({stats.totalCards})</li>
                <li>All user stats and streaks</li>
                <li>All friendships and challenges</li>
                <li>All badges and achievements</li>
              </ul>
              <p className="text-sm text-slate-500 mb-6">
                User accounts and login credentials will be preserved.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleResetData}
                  disabled={resetLoading}
                  className="flex-1"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Reset All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Last 10 registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{user.email}</p>
                      <p className="text-sm text-slate-600">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {user.is_premium && (
                        <Badge className="bg-yellow-500">Premium</Badge>
                      )}
                      {user.is_admin && (
                        <Badge className="bg-blue-600">Admin</Badge>
                      )}
                      {user.is_banned && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
