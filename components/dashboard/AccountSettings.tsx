'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Check, 
  AlertCircle, 
  Globe, 
  X, 
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { AVATAR_COUNT, getAvatarUrl } from '@/lib/avatars';
import { PROFILE_UPDATED_EVENT } from '@/components/layout/AppLayout';
import { containsInappropriateContent } from '@/lib/content-filter';
import { createClient } from '@/lib/supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MAX_LANGUAGES = 3;

const AVAILABLE_LANGUAGES = [
  { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', emoji: '🇫🇷' },
  { code: 'de', name: 'German', emoji: '🇩🇪' },
  { code: 'it', name: 'Italian', emoji: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', emoji: '🇧🇷' },
  { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
  { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
  { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
  { code: 'ru', name: 'Russian', emoji: '🇷🇺' },
  { code: 'ar', name: 'Arabic', emoji: '🇸🇦' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  { code: 'nl', name: 'Dutch', emoji: '🇳🇱' },
  { code: 'sv', name: 'Swedish', emoji: '🇸🇪' },
  { code: 'pl', name: 'Polish', emoji: '🇵🇱' },
  { code: 'tr', name: 'Turkish', emoji: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', emoji: '🇻🇳' },
  { code: 'th', name: 'Thai', emoji: '🇹🇭' },
  { code: 'he', name: 'Hebrew', emoji: '🇮🇱' },
  { code: 'el', name: 'Greek', emoji: '🇬🇷' },
  { code: 'cs', name: 'Czech', emoji: '🇨🇿' },
];

interface Props {
  profile: UserProfile;
  accessToken: string;
  onUpdate: () => void;
}

export default function AccountSettings({ profile, accessToken, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [originalDisplayName] = useState(profile.display_name || '');
  const [originalAvatarUrl] = useState(profile.avatar_url || getAvatarUrl(0));
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || getAvatarUrl(0));
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [profilePublic, setProfilePublic] = useState(profile.profile_public ?? true);
  const [languagesLearning, setLanguagesLearning] = useState<string[]>((profile.languages_learning || []).slice(0, MAX_LANGUAGES));
  const [theme, setTheme] = useState(profile.theme_preference || 'system');
  const [notificationPrefs, setNotificationPrefs] = useState(
    profile.notification_prefs || {
      email: true,
      push: false,
      friend_requests: true,
      streak_reminders: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  // Check if display name can be changed (once per month)
  const canChangeDisplayName = () => {
    if (!profile.display_name_changed_at) return true;
    const lastChanged = new Date(profile.display_name_changed_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 30;
  };

  const getDaysUntilCanChange = () => {
    if (!profile.display_name_changed_at) return 0;
    const lastChanged = new Date(profile.display_name_changed_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  };

  const isDisplayNameChanged = displayName !== originalDisplayName;
  const isAvatarChanged = avatarUrl !== originalAvatarUrl;
  const hasChanges = isDisplayNameChanged || isAvatarChanged || 
    profilePublic !== (profile.profile_public ?? true) ||
    JSON.stringify(languagesLearning) !== JSON.stringify(profile.languages_learning || []) ||
    theme !== (profile.theme_preference || 'system') ||
    JSON.stringify(notificationPrefs) !== JSON.stringify(profile.notification_prefs || {
      email: true,
      push: false,
      friend_requests: true,
      streak_reminders: true,
    });

  // Sync avatar when profile prop changes
  useEffect(() => {
    if (profile.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile.avatar_url]);

  const handleAddLanguage = () => {
    if (selectedLanguage && !languagesLearning.includes(selectedLanguage) && languagesLearning.length < MAX_LANGUAGES) {
      setLanguagesLearning([...languagesLearning, selectedLanguage]);
      setSelectedLanguage('');
    }
  };

  const handleRemoveLanguage = (langCode: string) => {
    setLanguagesLearning(languagesLearning.filter(l => l !== langCode));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Validate display name if it changed
      if (isDisplayNameChanged) {
        const trimmedName = displayName.trim();
        
        if (!trimmedName) {
          setMessage({ 
            type: 'error', 
            text: 'Please enter a display name.' 
          });
          setSaving(false);
          return;
        }

        if (trimmedName.length < 2) {
          setMessage({ 
            type: 'error', 
            text: 'Display name must be at least 2 characters.' 
          });
          setSaving(false);
          return;
        }

        if (trimmedName.length > 30) {
          setMessage({ 
            type: 'error', 
            text: 'Display name must be 30 characters or less.' 
          });
          setSaving(false);
          return;
        }

        // Check for inappropriate content
        if (containsInappropriateContent(trimmedName)) {
          setMessage({ 
            type: 'error', 
            text: 'This display name contains inappropriate content. Please choose another.' 
          });
          setSaving(false);
          return;
        }

        // Only allow alphanumeric, spaces, underscores, and dashes
        if (!/^[a-zA-Z0-9\s_\-]+$/.test(trimmedName)) {
          setMessage({ 
            type: 'error', 
            text: 'Display name can only contain letters, numbers, spaces, underscores, and dashes.' 
          });
          setSaving(false);
          return;
        }
        
        // Check time restriction
        if (!canChangeDisplayName()) {
          setMessage({ 
            type: 'error', 
            text: `You can only change your display name once per month. ${getDaysUntilCanChange()} days remaining.` 
          });
          setSaving(false);
          return;
        }

        // Check if display name is already taken (case-insensitive)
        const supabase = createClient();
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .ilike('display_name', trimmedName)
          .neq('id', profile.id)
          .maybeSingle();

        if (existing) {
          setMessage({ 
            type: 'error', 
            text: 'This display name is already taken. Please choose another.' 
          });
          setSaving(false);
          return;
        }
      }

      // Build update object with all changes
      const updateData: any = {
        profile_public: profilePublic,
        languages_learning: languagesLearning.slice(0, MAX_LANGUAGES),
        theme_preference: theme,
        notification_prefs: notificationPrefs,
      };

      // Include display name if it changed
      if (isDisplayNameChanged) {
        updateData.display_name = displayName.trim();
        updateData.display_name_changed_at = new Date().toISOString();
      }

      // Include avatar if it changed
      if (isAvatarChanged) {
        updateData.avatar_url = avatarUrl;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?id=eq.${profile.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Account settings saved successfully!' });
      onUpdate();
      // Dispatch event to update nav bars immediately
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save account settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getLanguageInfo = (code: string) => {
    return AVAILABLE_LANGUAGES.find(l => l.code === code) || { name: code, emoji: '🌍' };
  };

  return (
    <div className="space-y-6">
      {/* Save Button - at top */}
      <Button
        onClick={handleSaveProfile}
        disabled={saving || !hasChanges}
        className="w-full text-white font-bold rounded-2xl py-4 hover:-translate-y-0.5 transition-all disabled:opacity-50 active:translate-y-1"
        style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Settings ✨'
        )}
      </Button>

      {/* Message */}
      {message && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl animate-fade-in"
          style={message.type === 'success' 
            ? { backgroundColor: 'rgba(88, 204, 2, 0.15)', color: 'var(--accent-green)', border: '2px solid rgba(88, 204, 2, 0.3)' }
            : { backgroundColor: 'rgba(255, 75, 75, 0.15)', color: 'var(--accent-red)', border: '2px solid rgba(255, 75, 75, 0.3)' }
          }
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
          ) : (
            <AlertCircle className="h-5 w-5" style={{ color: 'var(--accent-red)' }} />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Profile Avatar Picker */}
      <div className="rounded-3xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
          <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Picture</h3>
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>
          Choose your avatar from 20 robot options!
        </p>
        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 overflow-hidden transition-all cursor-pointer group relative bg-white"
            style={{ '--tw-ring-color': 'var(--bg-card)' } as React.CSSProperties}
          >
            <img 
              src={avatarUrl} 
              alt="Profile avatar" 
              className="w-full h-full object-cover bg-white scale-[0.75]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Change</span>
            </div>
          </button>
          <div>
            <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName || 'Your Name'}</p>
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>
          </div>
        </div>

        {/* Avatar Picker Grid */}
        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Select your avatar:</p>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                  {Array.from({ length: AVATAR_COUNT }, (_, i) => i).map((id, index) => {
                    const url = getAvatarUrl(id);
                    const isSelected = avatarUrl === url;
                    return (
                      <motion.button
                        key={id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                        whileHover={{ scale: 1.1, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAvatarUrl(url);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-12 h-12 rounded-full overflow-hidden transition-all ${
                          isSelected
                            ? 'ring-4 ring-[var(--accent-green)] scale-110'
                            : 'ring-2 ring-[var(--border-color)] hover:ring-[var(--accent-green)]/50'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Avatar ${id}`}
                          className="w-full h-full object-cover bg-white scale-[0.75]"
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Display Name */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-1" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Display Name</h3>
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>This is how others will see you</p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="display-name" className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Display Name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="rounded-2xl font-medium focus:ring-0 mt-2"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
              maxLength={50}
              disabled={!canChangeDisplayName()}
            />
            {/* Display name change info/warning */}
            <div 
              className="mt-2 p-3 rounded-xl text-sm"
              style={canChangeDisplayName() 
                ? { backgroundColor: 'rgba(88, 204, 2, 0.1)', color: 'var(--text-secondary)' }
                : { backgroundColor: 'rgba(255, 75, 75, 0.15)', color: 'var(--accent-red)' }
              }
            >
              {canChangeDisplayName() ? (
                <p className="font-medium">ℹ️ Display name can be changed once every 30 days.</p>
              ) : (
                <p className="font-medium">🔒 Name locked. You can change it again in {getDaysUntilCanChange()} days.</p>
              )}
              {profile.display_name_changed_at && (
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Last changed: {new Date(profile.display_name_changed_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Email Address
            </Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="rounded-2xl mt-2 font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-muted)' }}
            />
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>Email cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Languages Learning */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-2" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5" style={{ color: 'var(--accent-blue)' }} />
          <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Languages I'm Learning</h3>
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Show others what languages you're studying (max {MAX_LANGUAGES})</p>
        
        <div className="flex gap-3 mb-4">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="rounded-2xl flex-1 font-medium focus:ring-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-color)' }}>
              {AVAILABLE_LANGUAGES.filter(l => !languagesLearning.includes(l.code)).map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="font-medium rounded-xl" style={{ color: 'var(--text-primary)' }}>
                  {lang.emoji} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddLanguage}
            disabled={!selectedLanguage || languagesLearning.length >= MAX_LANGUAGES}
            className="text-white font-bold rounded-2xl px-6 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
          >
            Add
          </Button>
        </div>
        {languagesLearning.length >= MAX_LANGUAGES && (
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Maximum {MAX_LANGUAGES} languages. Remove one to add another.</p>
        )}

        {languagesLearning.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {languagesLearning.map((langCode) => {
              const lang = getLanguageInfo(langCode);
              return (
                <span
                  key={langCode}
                  className="px-4 py-2 text-white font-semibold rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'linear-gradient(to right, var(--accent-blue), var(--accent-green))' }}
                >
                  {lang.emoji} {lang.name}
                  <button
                    onClick={() => handleRemoveLanguage(langCode)}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm font-medium italic" style={{ color: 'var(--text-muted)' }}>No languages added yet</p>
        )}
      </div>

      {/* Privacy */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-4" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Privacy</h3>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Control who can see your profile</p>
        
        <div className="flex items-center justify-between rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-4">
            {profilePublic ? (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(88, 204, 2, 0.2)' }}>
                <Eye className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <EyeOff className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            <div>
              <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>Public Profile</Label>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {profilePublic
                  ? 'Anyone can view your profile and stats'
                  : 'Only friends can view your profile'}
              </p>
            </div>
          </div>
          <Switch
            checked={profilePublic}
            onCheckedChange={setProfilePublic}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-5" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Manage your notification preferences</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div>
              <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email Notifications</Label>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Receive updates via email</p>
            </div>
            <Switch
              checked={notificationPrefs.email}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, email: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div>
              <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>Friend Requests</Label>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Get notified of new friend requests</p>
            </div>
            <Switch
              checked={notificationPrefs.friend_requests}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, friend_requests: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div>
              <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>Streak Reminders</Label>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Daily reminders to maintain your streak</p>
            </div>
            <Switch
              checked={notificationPrefs.streak_reminders}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, streak_reminders: checked })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
