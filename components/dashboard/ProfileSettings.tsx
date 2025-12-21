'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

interface Props {
  profile: UserProfile;
  onUpdate: () => void;
}

export default function ProfileSettings({ profile, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [theme, setTheme] = useState(profile.theme_preference || 'system');
  const [notificationPrefs, setNotificationPrefs] = useState(
    profile.notification_prefs || {
      email: true,
      push: false,
      friend_requests: true,
      streak_reminders: true,
    }
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 2MB' });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'File must be an image' });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      onUpdate();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName || null,
          theme_preference: theme,
          notification_prefs: notificationPrefs,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      onUpdate();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (displayName) return displayName.substring(0, 2).toUpperCase();
    if (profile.email) return profile.email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Profile Picture</CardTitle>
          <CardDescription className="text-slate-400">
            Upload a profile picture (max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} alt={displayName || profile.email} />
              <AvatarFallback className="bg-slate-700 text-white text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label
                htmlFor="avatar-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <p className="text-xs text-slate-400 mt-2">JPG, PNG or GIF (max 2MB)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Profile Information</CardTitle>
          <CardDescription className="text-slate-400">
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="display-name" className="text-slate-300">
              Display Name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="bg-slate-900 border-slate-700 text-white mt-2"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-slate-300">
              Email Address
            </Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-slate-900 border-slate-700 text-slate-400 mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Appearance</CardTitle>
          <CardDescription className="text-slate-400">
            Customize how the app looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="theme" className="text-slate-300">
              Theme
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Notifications</CardTitle>
          <CardDescription className="text-slate-400">
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Email Notifications</Label>
              <p className="text-sm text-slate-400">Receive updates via email</p>
            </div>
            <Switch
              checked={notificationPrefs.email}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, email: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Friend Requests</Label>
              <p className="text-sm text-slate-400">Get notified of new friend requests</p>
            </div>
            <Switch
              checked={notificationPrefs.friend_requests}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, friend_requests: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Streak Reminders</Label>
              <p className="text-sm text-slate-400">Daily reminders to maintain your streak</p>
            </div>
            <Switch
              checked={notificationPrefs.streak_reminders}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, streak_reminders: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  );
}
