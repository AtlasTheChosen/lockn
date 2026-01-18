'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import Logo from '@/components/ui/Logo';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Sparkles, Users, BookOpen, Zap, Crown, ArrowLeft, Trash2, AlertTriangle, Loader2, 
  ShieldX, Search, Flame, TrendingUp, Activity, Ban, Shield, Check, X,
  Calendar, DollarSign, Globe, UserCircle
} from 'lucide-react';

export default function AdminPage() {
  const { user, profile, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalStacks: 0,
    totalCards: 0,
    activeUsers: 0,
    bannedUsers: 0,
    totalStreaks: 0,
    totalFriendships: 0,
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState('');
  const [deletePin, setDeletePin] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ success: boolean; message: string } | null>(null);
  const ADMIN_PIN = '286868';

  // Redirect non-admins
  useEffect(() => {
    if (!sessionLoading && (!user || !profile?.is_admin)) {
      router.push('/dashboard');
    }
  }, [user, profile, sessionLoading, router]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const supabase = createClient();

        // Load all stats
        const [usersCount, premiumCount, stacksCount, cardsCount, bannedCount] = await Promise.all([
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
          supabase.from('card_stacks').select('*', { count: 'exact', head: true }),
          supabase.from('flashcards').select('*', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        ]);

        // Get active users (users with stacks created in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: activeCount } = await supabase
          .from('card_stacks')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        // Get total streaks (users with current_streak > 0)
        const { data: userStats } = await supabase
          .from('user_stats')
          .select('current_streak')
          .gt('current_streak', 0);
        
        const totalStreaks = userStats?.length || 0;

        // Get friendships count
        const { count: friendshipsCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'accepted');

        // Load all users with their stats
        const { data: users } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Load user stats for each user
        if (users) {
          const usersWithStats = await Promise.all(
            users.map(async (u) => {
              const { data: userStat } = await supabase
                .from('user_stats')
                .select('current_streak, longest_streak, total_mastered, cards_mastered_today')
                .eq('user_id', u.id)
                .maybeSingle();
              
              const { count: stackCount } = await supabase
                .from('card_stacks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);

              return {
                ...u,
                stats: userStat || { current_streak: 0, longest_streak: 0, total_mastered: 0, cards_mastered_today: 0 },
                stackCount: stackCount || 0,
              };
            })
          );
          
          setAllUsers(usersWithStats);
          setFilteredUsers(usersWithStats);
        }

        setStats({
          totalUsers: usersCount.count || 0,
          premiumUsers: premiumCount.count || 0,
          totalStacks: stacksCount.count || 0,
          totalCards: cardsCount.count || 0,
          activeUsers: activeCount || 0,
          bannedUsers: bannedCount.count || 0,
          totalStreaks,
          totalFriendships: friendshipsCount || 0,
        });
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user && profile?.is_admin) {
      loadAdminData();
    }
  }, [user, profile]);

  // Filter users based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allUsers.filter(u => 
      u.email?.toLowerCase().includes(query) ||
      u.display_name?.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  const handleResetData = async () => {
    // Check PIN first
    if (resetPin !== ADMIN_PIN) {
      setResetResult({ success: false, message: 'Incorrect PIN. Please enter the correct PIN to proceed.' });
      return;
    }

    setResetLoading(true);
    setResetResult(null);
    
    try {
      const response = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_ALL_DATA', pin: ADMIN_PIN }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetResult({ success: true, message: 'All user data has been reset!' });
        setResetPin('');
        // Refresh stats
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResetResult({ success: false, message: data.error || 'Reset failed' });
      }
    } catch (error: any) {
      setResetResult({ success: false, message: error.message || 'Network error' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Check PIN first
    if (deletePin !== ADMIN_PIN) {
      alert('Incorrect PIN. Please enter the correct PIN to delete this user.');
      return;
    }

    // Prevent deleting yourself
    if (userToDelete.id === user?.id) {
      alert('You cannot delete your own account!');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setDeletePin('');
      return;
    }

    setDeleteLoading(true);
    
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id, pin: ADMIN_PIN }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Remove user from local state
        setAllUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setFilteredUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setStats(prev => ({
          ...prev,
          totalUsers: prev.totalUsers - 1,
          premiumUsers: userToDelete.is_premium ? prev.premiumUsers - 1 : prev.premiumUsers,
          bannedUsers: userToDelete.is_banned ? prev.bannedUsers - 1 : prev.bannedUsers,
        }));
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        setDeletePin('');
      } else {
        alert('Failed to delete user: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Network error: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTogglePremium = async (userId: string, currentValue: boolean) => {
    setUpdatingUser(userId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_premium: !currentValue })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_premium: !currentValue } : u
      ));
      setFilteredUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_premium: !currentValue } : u
      ));
      setStats(prev => ({
        ...prev,
        premiumUsers: prev.premiumUsers + (currentValue ? -1 : 1),
      }));
    } catch (error: any) {
      console.error('Error updating premium status:', error);
      alert('Failed to update premium status: ' + error.message);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleToggleBan = async (userId: string, currentValue: boolean) => {
    setUpdatingUser(userId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_banned: !currentValue })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_banned: !currentValue } : u
      ));
      setFilteredUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_banned: !currentValue } : u
      ));
      setStats(prev => ({
        ...prev,
        bannedUsers: prev.bannedUsers + (currentValue ? -1 : 1),
      }));
    } catch (error: any) {
      console.error('Error updating ban status:', error);
      alert('Failed to update ban status: ' + error.message);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleToggleAdmin = async (userId: string, currentValue: boolean) => {
    if (userId === user?.id) {
      alert('You cannot remove your own admin status!');
      return;
    }

    setUpdatingUser(userId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !currentValue })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_admin: !currentValue } : u
      ));
      setFilteredUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_admin: !currentValue } : u
      ));
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status: ' + error.message);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleMigrateAvatars = async () => {
    setMigrateLoading(true);
    setMigrateResult(null);
    
    try {
      const response = await fetch('/api/migrate-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMigrateResult({ 
          success: true, 
          message: `Successfully migrated ${data.updated} users to new robot avatars!` 
        });
        // Refresh user list after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMigrateResult({ success: false, message: data.error || 'Migration failed' });
      }
    } catch (error: any) {
      setMigrateResult({ success: false, message: error.message || 'Network error' });
    } finally {
      setMigrateLoading(false);
    }
  };

  // Show loading while checking auth
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-6 w-6 animate-spin" />
          Verifying access...
        </div>
      </div>
    );
  }

  // Show access denied while redirecting non-admins
  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <ShieldX className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent-red)' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'flex sticky top-0 z-[100]',
          'w-full items-center justify-between',
          'px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4',
          'bg-[var(--bg-card)]/80 backdrop-blur-xl',
          'border-b-2 border-[var(--border-color)]',
          'shadow-[var(--shadow-sm)]',
          'transition-all duration-300'
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Logo size="xl" />
            <span className="font-display text-xl lg:text-2xl font-semibold text-[#58cc02]">LockN</span>
            <Badge variant="destructive" className="ml-2 text-xs">
              Admin
            </Badge>
          </motion.div>
        </Link>

        {/* Right section */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <ThemeToggle size="sm" />
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </motion.nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display mb-2" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Platform metrics and user management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Total Users</CardDescription>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: 'var(--accent-blue)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.totalUsers}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Premium Users</CardDescription>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5" style={{ color: 'var(--accent-yellow)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.premiumUsers}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Active Users (30d)</CardDescription>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.activeUsers}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Active Streaks</CardDescription>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5" style={{ color: 'var(--accent-orange)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.totalStreaks}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Total Stacks</CardDescription>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.totalStacks}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Total Cards</CardDescription>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" style={{ color: 'var(--accent-purple)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.totalCards}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Friendships</CardDescription>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" style={{ color: 'var(--accent-cyan)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.totalFriendships}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Banned Users</CardDescription>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5" style={{ color: 'var(--accent-red)' }} />
                <CardTitle className="text-3xl" style={{ color: 'var(--text-primary)' }}>{stats.bannedUsers}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* User Management */}
        <Card className="mb-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle style={{ color: 'var(--text-primary)' }}>User Management</CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>Search and manage all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                <Input
                  placeholder="Search by email, name, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-2xl"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl border"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* User Avatar */}
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-white flex-shrink-0" style={{ border: '2px solid var(--border-color)' }}>
                            <img 
                              src={u.avatar_url || '/images/robot avatars/2360d47f-4a48-4276-b333-15e7c42238b5_1.jpg'} 
                              alt={u.display_name || 'User'} 
                              className="h-full w-full object-cover bg-white scale-[0.75]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/robot avatars/2360d47f-4a48-4276-b333-15e7c42238b5_1.jpg';
                              }}
                            />
                          </div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {u.display_name || u.email?.split('@')[0] || 'Anonymous'}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {u.is_premium && (
                              <Badge className="text-xs" style={{ backgroundColor: 'var(--accent-yellow)', color: '#000' }}>Premium</Badge>
                            )}
                            {u.is_admin && (
                              <Badge className="text-xs" style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}>Admin</Badge>
                            )}
                            {u.is_banned && (
                              <Badge variant="destructive" className="text-xs">Banned</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{u.email}</p>
                        <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>Streak: {u.stats?.current_streak || 0} 🔥</span>
                          <span>Best: {u.stats?.longest_streak || 0}</span>
                          <span>Cards: {u.stats?.total_mastered || 0}</span>
                          <span>Stacks: {u.stackCount || 0}</span>
                          <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3 text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Premium</span>
                            <Switch
                              checked={u.is_premium}
                              onCheckedChange={() => handleTogglePremium(u.id, u.is_premium)}
                              disabled={updatingUser === u.id}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Admin</span>
                            <Switch
                              checked={u.is_admin}
                              onCheckedChange={() => handleToggleAdmin(u.id, u.is_admin)}
                              disabled={updatingUser === u.id || u.id === user?.id}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Ban</span>
                            <Switch
                              checked={u.is_banned}
                              onCheckedChange={() => handleToggleBan(u.id, u.is_banned)}
                              disabled={updatingUser === u.id}
                            />
                          </div>
                          {updatingUser === u.id && (
                            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-blue)' }} />
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(u);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={u.id === user?.id}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Avatar Migration */}
        <Card className="mb-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle style={{ color: 'var(--text-primary)' }}>Avatar Migration</CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
              Update all existing users to new robot avatars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderColor: 'var(--border-color)' 
            }}>
              <div className="flex items-center gap-3">
                <UserCircle className="h-6 w-6" style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Migrate to Robot Avatars</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Assign random robot avatars to all users who don't already have one
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleMigrateAvatars}
                disabled={migrateLoading}
                className="gap-2"
                style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
              >
                {migrateLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <UserCircle className="h-4 w-4" />
                    Run Migration
                  </>
                )}
              </Button>
            </div>
            
            {migrateResult && (
              <div className={`mt-4 p-4 rounded-xl ${migrateResult.success ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                {migrateResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mb-8 border-2" style={{ 
          backgroundColor: 'rgba(255, 75, 75, 0.1)', 
          borderColor: 'var(--accent-red)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--accent-red)' }}>
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription style={{ color: 'var(--accent-red)' }}>
              Destructive actions - use with caution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border" style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--accent-red)' 
              }}>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Reset All User Data</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Delete all stacks, flashcards, stats, and progress. Keeps user accounts.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowResetConfirm(true)}
                  disabled={resetLoading}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset Data
                </Button>
              </div>
              
              {resetResult && (
                <div className={`p-4 rounded-xl ${resetResult.success ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                  {resetResult.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-3xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(255, 75, 75, 0.2)' }}>
                  <AlertTriangle className="h-6 w-6" style={{ color: 'var(--accent-red)' }} />
                </div>
                <h3 className="text-xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>Confirm Reset</h3>
              </div>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                This will permanently delete <strong>ALL</strong> user data:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>All flashcard stacks ({stats.totalStacks})</li>
                <li>All flashcards ({stats.totalCards})</li>
                <li>All user stats and streaks</li>
                <li>All friendships and challenges</li>
                <li>All badges and achievements</li>
              </ul>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                User accounts and login credentials will be preserved.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Enter Admin PIN to confirm:
                </label>
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value)}
                  className="rounded-2xl font-mono text-center text-lg tracking-widest"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  autoFocus
                  maxLength={6}
                />
              </div>
              {resetResult && (
                <div className={`p-3 rounded-xl mb-4 text-sm ${resetResult.success ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                  {resetResult.message}
                </div>
              )}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetPin('');
                    setResetResult(null);
                  }}
                  disabled={resetLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleResetData}
                  disabled={resetLoading || !resetPin}
                  className="flex-1 gap-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Yes, Reset All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-3xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(255, 75, 75, 0.2)' }}>
                  <AlertTriangle className="h-6 w-6" style={{ color: 'var(--accent-red)' }} />
                </div>
                <h3 className="text-xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>Delete User</h3>
              </div>
              <p className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                Are you sure you want to permanently delete:
              </p>
              <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {userToDelete.display_name || userToDelete.email?.split('@')[0] || 'Anonymous'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{userToDelete.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userToDelete.is_premium && (
                    <Badge className="text-xs" style={{ backgroundColor: 'var(--accent-yellow)', color: '#000' }}>Premium</Badge>
                  )}
                  {userToDelete.is_admin && (
                    <Badge className="text-xs" style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}>Admin</Badge>
                  )}
                  {userToDelete.is_banned && (
                    <Badge variant="destructive" className="text-xs">Banned</Badge>
                  )}
                </div>
              </div>
              <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                This will <strong>permanently delete</strong>:
              </p>
              <ul className="list-disc list-inside mb-6 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li>User account and profile</li>
                <li>All stacks and flashcards ({userToDelete.stackCount || 0} stacks)</li>
                <li>All stats, streaks, and progress</li>
                <li>All friendships and social data</li>
              </ul>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Enter Admin PIN to confirm:
                </label>
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  className="rounded-2xl font-mono text-center text-lg tracking-widest"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  autoFocus
                  maxLength={6}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                    setDeletePin('');
                  }}
                  disabled={deleteLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteUser}
                  disabled={deleteLoading || !deletePin}
                  className="flex-1 gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Yes, Delete User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
