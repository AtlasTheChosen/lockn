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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  X,
  HelpCircle,
  MessageSquare,
  Accessibility,
  Shield,
  Users,
  UserX
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
import PremiumModal from '@/components/dashboard/PremiumModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user: sessionUser, profile: sessionProfile, accessToken: sessionAccessToken, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
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
  
  // Notifications state
  const [notificationPrefs, setNotificationPrefs] = useState(
    sessionProfile?.notification_prefs || {
      email: true,
      push: false,
      friend_requests: true,
      streak_reminders: true,
    }
  );
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  // Friend request privacy state
  const [friendRequestPrivacy, setFriendRequestPrivacy] = useState<'everyone' | 'friends_of_friends' | 'nobody'>(
    (sessionProfile as any)?.friend_request_privacy || 'everyone'
  );
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  // Accessibility state
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [savingAccessibility, setSavingAccessibility] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [targetBillingInterval, setTargetBillingInterval] = useState<'monthly' | 'annual' | null>(null);
  const [showManageSubscription, setShowManageSubscription] = useState(false);

  const loadData = useCallback(async () => {
    if (!sessionUser) return;
    
    try {
      setError(null);
      
      // Use session profile if available
      if (sessionProfile) {
        setProfile(sessionProfile);
        setNotificationPrefs(sessionProfile.notification_prefs || {
          email: true,
          push: false,
          friend_requests: true,
          streak_reminders: true,
        });
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
          setNotificationPrefs(loadedProfile.notification_prefs || {
            email: true,
            push: false,
            friend_requests: true,
            streak_reminders: true,
          });
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

  const hasPasswordChanges = () => {
    return currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
  };

  const handleSavePassword = async () => {
    if (!hasPasswordChanges() || !sessionUser) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const errors: string[] = [];

      // Validate password change
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

      if (errors.length > 0) {
        setSaveMessage({ type: 'error', text: errors.join('. ') });
      } else {
        setSaveMessage({ type: 'success', text: 'Password changed successfully!' });
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save password' });
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

    setCanceling(true);
    try {
      const response = await fetch('/api/account/cancel-subscription', {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to cancel subscription' });
        setCanceling(false);
        setShowCancelDialog(false);
        return;
      }

      setSaveMessage({ 
        type: 'success', 
        text: `Subscription canceled. You will retain access until ${new Date(data.cancelDate).toLocaleDateString()}` 
      });
      setShowCancelDialog(false);
      loadData(); // Reload to show updated subscription status
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to cancel subscription' });
      setShowCancelDialog(false);
    } finally {
      setCanceling(false);
    }
  };

  const handleChangePlan = async () => {
    if (!sessionUser || !targetBillingInterval) return;

    setChangingPlan(true);
    try {
      const response = await fetch('/api/account/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingInterval: targetBillingInterval }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to change plan' });
        setChangingPlan(false);
        setShowChangePlanDialog(false);
        return;
      }

      const prorationText = data.prorationAmount !== undefined && data.prorationAmount !== 0
        ? data.prorationAmount > 0
          ? ` You've been charged $${Math.abs(data.prorationAmount).toFixed(2)}.`
          : ` You've been credited $${Math.abs(data.prorationAmount).toFixed(2)}.`
        : '';

      setSaveMessage({ 
        type: 'success', 
        text: `Plan changed to ${targetBillingInterval === 'annual' ? 'Annual' : 'Monthly'} successfully!${prorationText}` 
      });
      setShowChangePlanDialog(false);
      setTargetBillingInterval(null);
      loadData(); // Reload to show updated subscription status
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to change plan' });
      setShowChangePlanDialog(false);
    } finally {
      setChangingPlan(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!sessionUser || !sessionAccessToken) return;

    setSavingNotifications(true);
    try {
      const response = await fetch('/api/account/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationPrefs }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to update notifications' });
      } else {
        setSaveMessage({ type: 'success', text: 'Notification preferences saved!' });
        loadData();
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save notifications' });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!sessionUser) return;

    setSavingPrivacy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ friend_request_privacy: friendRequestPrivacy })
        .eq('id', sessionUser.id);

      if (error) throw error;

      setSaveMessage({ type: 'success', text: 'Privacy settings saved!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save privacy settings' });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !sessionUser) return;

    setSendingFeedback(true);
    try {
      // In a real app, you'd send this to a feedback API endpoint
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setSaveMessage({ type: 'success', text: 'Thank you for your feedback! We appreciate your input.' });
      setFeedbackText('');
      setShowFeedbackModal(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: 'Failed to send feedback. Please try again.' });
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleSaveAccessibility = async () => {
    if (!sessionUser) return;

    setSavingAccessibility(true);
    try {
      // Apply accessibility settings to localStorage and document
      localStorage.setItem('accessibility-font-size', fontSize);
      localStorage.setItem('accessibility-high-contrast', highContrast.toString());
      localStorage.setItem('accessibility-reduced-motion', reducedMotion.toString());
      
      // Apply to document
      document.documentElement.style.fontSize = fontSize === 'large' ? '18px' : fontSize === 'extra-large' ? '20px' : '16px';
      if (highContrast) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      if (reducedMotion) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
      
      setSaveMessage({ type: 'success', text: 'Accessibility settings saved!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: 'Failed to save accessibility settings' });
    } finally {
      setSavingAccessibility(false);
    }
  };

  // Load accessibility settings from localStorage on mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem('accessibility-font-size') as 'normal' | 'large' | 'extra-large' | null;
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast') === 'true';
    const savedReducedMotion = localStorage.getItem('accessibility-reduced-motion') === 'true';
    
    if (savedFontSize) setFontSize(savedFontSize);
    if (savedHighContrast) setHighContrast(savedHighContrast);
    if (savedReducedMotion) setReducedMotion(savedReducedMotion);
  }, []);

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

        {/* Premium Modal */}
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
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
                className="flex-1"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
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
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-display" className="text-slate-300">Email</Label>
                <Input
                  id="email-display"
                  type="email"
                  value={sessionUser?.email || ''}
                  disabled
                  className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name-display" className="text-slate-300">Display Name</Label>
                <Input
                  id="display-name-display"
                  type="text"
                  value={profile?.display_name || 'Not set'}
                  disabled
                  className="bg-slate-700/50 border-slate-600 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">
                  Display name can be changed in{' '}
                  <Link href="/profile" className="text-blue-400 hover:text-blue-300 underline">
                    Profile Settings
                  </Link>
                </p>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-slate-700 pt-4">
                <span className="text-slate-400">Account Created</span>
                <span className="text-white">{formatDate(profile?.created_at || null)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg p-4 bg-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-semibold">Email Notifications</Label>
                  <p className="text-sm text-slate-400">Receive updates via email</p>
                </div>
                <Switch
                  checked={notificationPrefs.email}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, email: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg p-4 bg-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-semibold">Friend Requests</Label>
                  <p className="text-sm text-slate-400">Get notified of new friend requests</p>
                </div>
                <Switch
                  checked={notificationPrefs.friend_requests}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, friend_requests: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg p-4 bg-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-semibold">Streak Reminders</Label>
                  <p className="text-sm text-slate-400">Daily reminders to maintain your streak</p>
                </div>
                <Switch
                  checked={notificationPrefs.streak_reminders}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, streak_reminders: checked })
                  }
                />
              </div>
              
              <Button
                onClick={handleSaveNotifications}
                disabled={savingNotifications}
                className="w-full mt-4"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
              >
                {savingNotifications ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notification Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Friend Request Privacy */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Friend Request Privacy
              </CardTitle>
              <CardDescription className="text-slate-400">
                Control who can send you friend requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`flex items-center justify-between rounded-lg p-4 cursor-pointer transition-all ${friendRequestPrivacy === 'everyone' ? 'ring-2 ring-green-500' : ''}`}
                style={{ backgroundColor: friendRequestPrivacy === 'everyone' ? 'rgba(88, 204, 2, 0.15)' : 'rgba(100, 116, 139, 0.3)' }}
                onClick={() => setFriendRequestPrivacy('everyone')}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-400" />
                  <div>
                    <Label className="text-slate-300 font-semibold cursor-pointer">Everyone</Label>
                    <p className="text-sm text-slate-400">Anyone can send you friend requests</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${friendRequestPrivacy === 'everyone' ? 'bg-green-500 border-green-500' : 'border-slate-500'}`} />
              </div>
              
              <div 
                className={`flex items-center justify-between rounded-lg p-4 cursor-pointer transition-all ${friendRequestPrivacy === 'friends_of_friends' ? 'ring-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: friendRequestPrivacy === 'friends_of_friends' ? 'rgba(28, 176, 246, 0.15)' : 'rgba(100, 116, 139, 0.3)' }}
                onClick={() => setFriendRequestPrivacy('friends_of_friends')}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-400" />
                  <div>
                    <Label className="text-slate-300 font-semibold cursor-pointer">Friends of Friends</Label>
                    <p className="text-sm text-slate-400">Only people who share a mutual friend</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${friendRequestPrivacy === 'friends_of_friends' ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`} />
              </div>
              
              <div 
                className={`flex items-center justify-between rounded-lg p-4 cursor-pointer transition-all ${friendRequestPrivacy === 'nobody' ? 'ring-2 ring-orange-500' : ''}`}
                style={{ backgroundColor: friendRequestPrivacy === 'nobody' ? 'rgba(255, 150, 0, 0.15)' : 'rgba(100, 116, 139, 0.3)' }}
                onClick={() => setFriendRequestPrivacy('nobody')}
              >
                <div className="flex items-center gap-3">
                  <UserX className="h-5 w-5 text-orange-400" />
                  <div>
                    <Label className="text-slate-300 font-semibold cursor-pointer">No One</Label>
                    <p className="text-sm text-slate-400">Disable all friend requests</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${friendRequestPrivacy === 'nobody' ? 'bg-orange-500 border-orange-500' : 'border-slate-500'}`} />
              </div>
              
              <Button
                onClick={handleSavePrivacy}
                disabled={savingPrivacy}
                className="w-full mt-4"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
              >
                {savingPrivacy ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Privacy Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription className="text-slate-400">
                Update your password
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

              {/* Save Password Button */}
              <Button
                onClick={handleSavePassword}
                disabled={!hasPasswordChanges() || saving}
                className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Password
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
              {/* Save message for subscription actions */}
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

              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Plan</span>
                <div className="flex items-center gap-2">
                  <Badge className={profile?.is_premium 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold' 
                    : 'bg-slate-600'}>
                    {profile?.is_premium ? 'Premium' : 'Free'}
                  </Badge>
                  {profile?.is_premium && profile?.billing_interval && (
                    <span className="text-sm text-slate-400">
                      ({profile.billing_interval === 'annual' ? 'Annual' : 'Monthly'})
                    </span>
                  )}
                </div>
              </div>

              {/* Subscription Status with enhanced display */}
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Status</span>
                <Badge className={
                  profile?.is_premium && (profile?.subscription_status === 'active' || !profile?.subscription_status) && !profile?.subscription_cancel_at
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : (profile?.subscription_status === 'canceled' || profile?.subscription_cancel_at)
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-slate-600'
                }>
                  {profile?.is_premium && !profile?.subscription_cancel_at
                    ? 'Active' 
                    : (profile?.subscription_status === 'canceled' || profile?.subscription_cancel_at)
                    ? 'Canceling'
                    : 'Free Tier'}
                </Badge>
              </div>

              {/* Renewal/End Date Display */}
              {profile?.is_premium && profile?.subscription_end_date && (
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-400">
                    {profile?.subscription_status === 'canceled' || profile?.subscription_cancel_at
                      ? 'Access Until'
                      : 'Renews On'}
                  </span>
                  <span className="text-white font-semibold">{formatDate(profile.subscription_end_date)}</span>
                </div>
              )}

              {/* Helpful messaging */}
              {profile?.is_premium && profile?.subscription_status === 'active' && (
                <p className="text-xs text-slate-500 pt-2">
                  Your subscription will automatically renew. Cancel anytime to stop future charges.
                </p>
              )}
              {(profile?.subscription_status === 'canceled' || profile?.subscription_cancel_at) && (
                <p className="text-xs text-yellow-400 pt-2">
                  Your subscription will end on {formatDate(profile?.subscription_end_date || null)}. You'll retain full access until then.
                </p>
              )}

              {/* Manage Subscription Button & Section */}
              {profile?.is_premium && (
                <div className="mt-4 space-y-4">
                  <Button
                    onClick={() => setShowManageSubscription(!showManageSubscription)}
                    className="w-full"
                    style={{ backgroundColor: 'var(--accent-blue)', color: 'white', boxShadow: '0 3px 0 #1899d6' }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>

                  {showManageSubscription && (
                    <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Plan Details */}
                      {profile?.billing_interval && (
                        <div className="pb-4 border-b border-slate-600">
                          <p className="text-sm font-semibold text-white mb-2">Current Plan</p>
                          <p className="text-slate-400 text-sm">
                            {profile.billing_interval === 'annual' 
                              ? 'Annual ($49.90/year - $4.16/month)'
                              : 'Monthly ($4.99/month)'}
                          </p>
                        </div>
                      )}

                      {/* Switch Billing Interval */}
                      {profile?.subscription_status === 'active' && profile?.billing_interval && !profile?.subscription_cancel_at && (
                        <div className="pb-4 border-b border-slate-600">
                          <p className="text-sm font-semibold text-white mb-2">Change Billing</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newInterval = profile.billing_interval === 'annual' ? 'monthly' : 'annual';
                              setTargetBillingInterval(newInterval);
                              setShowChangePlanDialog(true);
                            }}
                            className="w-full border-slate-500 text-slate-300 hover:bg-slate-600 hover:text-white"
                          >
                            Switch to {profile.billing_interval === 'annual' ? 'Monthly ($4.99/mo)' : 'Annual ($49.90/yr - Save 17%)'}
                          </Button>
                          <p className="text-xs text-slate-500 mt-2">
                            You'll be charged or credited the prorated amount immediately.
                          </p>
                        </div>
                      )}

                      {/* Cancel Subscription */}
                      {profile?.subscription_status === 'active' && !profile?.subscription_cancel_at && (
                        <div className="pb-4 border-b border-slate-600">
                          <p className="text-sm font-semibold text-white mb-2">Cancel Subscription</p>
                          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel Subscription
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Cancel Subscription?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400 space-y-3">
                                  <p>Are you sure you want to cancel your Premium subscription?</p>
                                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-700">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Current Plan:</span>
                                      <span className="text-white font-semibold">Premium</span>
                                    </div>
                                    {profile?.subscription_end_date && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-slate-400">Next Renewal:</span>
                                          <span className="text-white">{formatDate(profile.subscription_end_date)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-700">
                                          <span className="text-slate-400">Access Until:</span>
                                          <span className="text-green-400 font-semibold">{formatDate(profile.subscription_end_date)}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-300 pt-2">
                                    You'll retain full Premium access until the end of your billing period. No charges will be made after that date.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel 
                                  className="bg-slate-800 text-white border-slate-700"
                                  disabled={canceling}
                                >
                                  Keep Subscription
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleCancelSubscription}
                                  disabled={canceling}
                                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {canceling ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Canceling...
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-4 w-4 mr-2" />
                                      Yes, Cancel Subscription
                                    </>
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <p className="text-xs text-slate-500 mt-2">
                            You'll keep Premium access until your billing period ends.
                          </p>
                        </div>
                      )}

                      {/* Stripe Portal Link */}
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">Billing Portal</p>
                        <Button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/stripe/create-portal-session', {
                                method: 'POST',
                              });
                              const data = await res.json();
                              if (data.url) {
                                window.location.href = data.url;
                              } else {
                                setSaveMessage({ type: 'error', text: data.error || 'Failed to open subscription portal' });
                                setTimeout(() => setSaveMessage(null), 3000);
                              }
                            } catch (err) {
                              setSaveMessage({ type: 'error', text: 'Failed to open subscription portal' });
                              setTimeout(() => setSaveMessage(null), 3000);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-slate-500 text-slate-300 hover:bg-slate-600 hover:text-white"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Open Stripe Billing Portal
                        </Button>
                        <p className="text-xs text-slate-500 mt-2">
                          View invoices, update payment method, and more.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Change Plan Confirmation Dialog */}
              {targetBillingInterval && (
                <AlertDialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
                  <AlertDialogContent className="bg-slate-900 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        Switch to {targetBillingInterval === 'annual' ? 'Annual' : 'Monthly'} Plan?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400 space-y-3">
                        <p>
                          You're about to switch from {profile?.billing_interval === 'annual' ? 'Annual' : 'Monthly'} to {targetBillingInterval === 'annual' ? 'Annual' : 'Monthly'} billing.
                        </p>
                        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-700">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Current Plan:</span>
                            <span className="text-white font-semibold">
                              {profile?.billing_interval === 'annual' 
                                ? 'Annual ($49.90/year)'
                                : 'Monthly ($4.99/month)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">New Plan:</span>
                            <span className="text-green-400 font-semibold">
                              {targetBillingInterval === 'annual' 
                                ? 'Annual ($49.90/year)'
                                : 'Monthly ($4.99/month)'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 pt-2">
                          Stripe will calculate the prorated amount based on the remaining time in your current billing period. 
                          {targetBillingInterval === 'annual' 
                            ? ' You\'ll be charged the difference immediately.'
                            : ' You\'ll receive a credit for the difference.'}
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        className="bg-slate-800 text-white border-slate-700"
                        disabled={changingPlan}
                        onClick={() => {
                          setTargetBillingInterval(null);
                        }}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleChangePlan}
                        disabled={changingPlan}
                        className="bg-[var(--accent-green)] hover:bg-[var(--accent-green-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {changingPlan ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Changing Plan...
                          </>
                        ) : (
                          <>
                            Switch to {targetBillingInterval === 'annual' ? 'Annual' : 'Monthly'}
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {!profile?.is_premium && (
                <Button 
                  onClick={() => setShowPremiumModal(true)}
                  className="w-full mt-4"
                  style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </CardTitle>
              <CardDescription className="text-slate-400">
                Get help and support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/help">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-700 text-white hover:bg-slate-700"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center / FAQ
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-700 text-white hover:bg-slate-700"
                onClick={() => setShowFeedbackModal(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Feedback
              </Button>
            </CardContent>
          </Card>

          {/* Accessibility Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessibility
              </CardTitle>
              <CardDescription className="text-slate-400">
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Font Size</Label>
                <Select value={fontSize} onValueChange={(value: 'normal' | 'large' | 'extra-large') => setFontSize(value)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="normal" className="text-white">Normal</SelectItem>
                    <SelectItem value="large" className="text-white">Large</SelectItem>
                    <SelectItem value="extra-large" className="text-white">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between rounded-lg p-4 bg-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-semibold">High Contrast Mode</Label>
                  <p className="text-sm text-slate-400">Increase contrast for better visibility</p>
                </div>
                <Switch
                  checked={highContrast}
                  onCheckedChange={setHighContrast}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg p-4 bg-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-semibold">Reduce Motion</Label>
                  <p className="text-sm text-slate-400">Minimize animations and transitions</p>
                </div>
                <Switch
                  checked={reducedMotion}
                  onCheckedChange={setReducedMotion}
                />
              </div>
              
              <Button
                onClick={handleSaveAccessibility}
                disabled={savingAccessibility}
                className="w-full mt-4"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
              >
                {savingAccessibility ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Accessibility Settings
                  </>
                )}
              </Button>
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

          {/* Feedback Modal */}
          {showFeedbackModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Send Feedback</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowFeedbackModal(false);
                      setFeedbackText('');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300 mb-2 block">Your Feedback</Label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what you think, report a bug, or suggest a feature..."
                      className="w-full min-h-[120px] p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFeedbackModal(false);
                        setFeedbackText('');
                      }}
                      className="flex-1 border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendFeedback}
                      disabled={!feedbackText.trim() || sendingFeedback}
                      className="flex-1"
                      style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
                    >
                      {sendingFeedback ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

      {/* Premium Modal */}
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
}
