'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, BookOpen, Zap, Crown, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalStacks: 0,
    totalCards: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

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
