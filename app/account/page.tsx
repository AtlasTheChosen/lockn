'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Crown, 
  Mail, 
  Calendar, 
  Shield, 
  CreditCard,
  AlertCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Pause,
  Play,
  TrendingUp
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { UserProfile } from '@/lib/types';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pauseTracking, setPauseTracking] = useState(false);
  const [savingPause, setSavingPause] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const supabase = createClient();

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      // Load pause tracking state from user_stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('pause_weekly_tracking')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statsData) {
        setPauseTracking(statsData.pause_weekly_tracking || false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleTogglePause = async (paused: boolean) => {
    if (!user) return;
    
    setSavingPause(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_stats')
        .update({ pause_weekly_tracking: paused })
        .eq('user_id', user.id);

      if (error) throw error;
      setPauseTracking(paused);
    } catch (err) {
      console.error('Failed to update pause setting:', err);
    } finally {
      setSavingPause(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-700" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Error Loading Account</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">{error}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setLoading(true);
                  loadData();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Link href="/">
                <Button variant="outline" className="border-slate-600">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Email</span>
                <span className="text-white">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Account Created</span>
                <span className="text-white">{formatDate(profile?.created_at || null)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Display Name</span>
                <span className="text-white">{profile?.display_name || 'Not set'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your current plan and subscription details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Plan</span>
                <Badge className={profile?.is_premium 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' 
                  : 'bg-slate-600'}>
                  {profile?.is_premium ? 'Premium' : 'Free'}
                </Badge>
              </div>
              {profile?.is_premium && profile?.subscription_end_date && (
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-400">Renews On</span>
                  <span className="text-white">{formatDate(profile.subscription_end_date)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Status</span>
                <Badge className={profile?.subscription_status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-slate-600'}>
                  {profile?.subscription_status || 'Free Tier'}
                </Badge>
              </div>
              {!profile?.is_premium && (
                <Link href="/pricing" className="block mt-4">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Weekly Tracking Preferences */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Tracking
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage your weekly learning statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {pauseTracking ? (
                      <Pause className="h-4 w-4 text-yellow-400" />
                    ) : (
                      <Play className="h-4 w-4 text-green-400" />
                    )}
                    <span className="text-white font-medium">Pause Weekly Tracking</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    {pauseTracking 
                      ? "Weekly stats are paused. Your progress won't reset on Sunday."
                      : "Weekly stats reset every Sunday at midnight (your local time)."}
                  </p>
                </div>
                <Switch
                  checked={pauseTracking}
                  onCheckedChange={handleTogglePause}
                  disabled={savingPause}
                  className="data-[state=checked]:bg-yellow-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard?tab=profile">
                <Button variant="outline" className="w-full justify-start border-slate-700 text-white hover:bg-slate-700">
                  Edit Profile Settings
                </Button>
              </Link>
              <Link href="/dashboard?tab=friends">
                <Button variant="outline" className="w-full justify-start border-slate-700 text-white hover:bg-slate-700">
                  Manage Friends
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full justify-start border-slate-700 text-white hover:bg-slate-700">
                  View Leaderboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-slate-800 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Account Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start border-slate-700 text-white hover:bg-slate-700"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Delete Account?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This action cannot be undone. All your data, stacks, and progress will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Back to Dashboard */}
          <div className="flex justify-center pt-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
