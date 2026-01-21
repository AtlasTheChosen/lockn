'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Crown, 
  Mail, 
  Calendar, 
  CreditCard,
  AlertCircle,
  RefreshCw,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react';
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user: sessionUser, profile: sessionProfile, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Profile editing state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!sessionUser) return;
    
    try {
      setError(null);
      
      // Use session profile if available
      if (sessionProfile) {
        setProfile(sessionProfile);
        setDisplayName(sessionProfile.display_name || '');
        setUsername(sessionProfile.display_name || ''); // Using display_name as username for now
      } else {
        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${sessionUser.id}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const profileData = profileResponse.ok ? await profileResponse.json() : [];
        const loadedProfile = profileData?.[0] || null;
        setProfile(loadedProfile);
        if (loadedProfile) {
          setDisplayName(loadedProfile.display_name || '');
          setUsername(loadedProfile.display_name || '');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, [sessionUser, sessionProfile]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      router.push('/');
      return;
    }
    loadData();
  }, [sessionUser, sessionLoading, router, loadData]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const hasProfileChanges = () => {
    if (!profile) return false;
    return displayName !== (profile.display_name || '') || 
           username !== (profile.display_name || '');
  };

  const hasPasswordChanges = () => {
    return currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
  };

  const hasChanges = hasProfileChanges() || hasPasswordChanges();

  const handleSaveChanges = async () => {
    if (!hasChanges || !sessionUser) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const errors: string[] = [];

      // Validate password change if provided
      if (hasPasswordChanges()) {
        if (!currentPassword) {
          errors.push('Current password is required to change password');
        }
        if (newPassword.length < 8) {
          errors.push('New password must be at least 8 characters long');
        }
        if (newPassword !== confirmPassword) {
          errors.push('New passwords do not match');
        }

        if (errors.length === 0) {
          // Change password
          const passwordResponse = await fetch('/api/account/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
          });

          const passwordData = await passwordResponse.json();
          if (!passwordResponse.ok) {
            errors.push(passwordData.error || 'Failed to change password');
          } else {
            // Clear password fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }
        }
      }

      // Update profile if changed
      if (hasProfileChanges() && errors.length === 0) {
        const profileResponse = await fetch('/api/account/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, username }),
        });

        const profileData = await profileResponse.json();
        if (!profileResponse.ok) {
          errors.push(profileData.error || 'Failed to update profile');
        } else {
          // Update local profile
          if (profileData.profile) {
            setProfile(profileData.profile);
          }
        }
      }

      if (errors.length > 0) {
        setSaveMessage({ type: 'error', text: errors.join('. ') });
      } else {
        setSaveMessage({ type: 'success', text: 'Changes saved successfully!' });
        // Reload data to get latest profile
        loadData();
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!sessionUser) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/account/delete-account', {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to delete account');
        setDeleting(false);
        return;
      }

      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!sessionUser) return;

    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    try {
      const response = await fetch('/api/account/cancel-subscription', {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to cancel subscription');
        return;
      }

      alert('Subscription canceled. You will retain access until ' + new Date(data.cancelDate).toLocaleDateString());
      loadData(); // Reload to show updated subscription status
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    }
  };

  if (sessionLoading || loading) {
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
          {/* Profile Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription className="text-slate-400">
                Update your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Save message */}
              {saveMessage && (
                <div
                  className={`p-3 rounded-lg ${
                    saveMessage.type === 'success'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={sessionUser?.email || ''}
                  disabled
                  className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              {/* Account Created (read-only) */}
              <div className="space-y-2">
                <Label className="text-slate-300">Account Created</Label>
                <div className="text-slate-400 text-sm py-2">
                  {formatDate(profile?.created_at || null)}
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pt-4 border-t border-slate-700 space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">Change Password</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-slate-300">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="bg-slate-700 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="bg-slate-700 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-300">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-slate-700 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Save Changes Button */}
              <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
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
              {profile?.is_premium && profile?.subscription_status === 'active' && (
                <Button
                  onClick={handleCancelSubscription}
                  variant="outline"
                  className="w-full mt-4 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
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

          {/* Account Actions */}
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
                    <AlertDialogCancel 
                      className="bg-slate-800 text-white border-slate-700"
                      disabled={deleting}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
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
