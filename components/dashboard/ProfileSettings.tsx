'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AchievementBadges from '@/components/social/AchievementBadges';
import { 
  Loader2, 
  Check, 
  AlertCircle, 
  Globe, 
  X, 
  Eye,
  EyeOff,
  Trophy,
  User
} from 'lucide-react';
import type { UserProfile, Badge as BadgeType } from '@/lib/types';
import Link from 'next/link';
import { AVATAR_COUNT, getAvatarUrl } from '@/lib/avatars';
import { PROFILE_UPDATED_EVENT } from '@/components/layout/AppLayout';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

const MAX_BIO_LENGTH = 500;

interface Props {
  profile: UserProfile;
  accessToken: string;
  onUpdate: () => void;
}

export default function ProfileSettings({ profile, accessToken, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [originalDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || getAvatarUrl(1));
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [profilePublic, setProfilePublic] = useState(profile.profile_public ?? true);
  const [languagesLearning, setLanguagesLearning] = useState<string[]>(profile.languages_learning || []);
  const [theme, setTheme] = useState(profile.theme_preference || 'system');
  const [notificationPrefs, setNotificationPrefs] = useState(
    profile.notification_prefs || {
      email: true,
      push: false,
      friend_requests: true,
      streak_reminders: true,
    }
  );
  const [badges, setBadges] = useState<BadgeType[]>(profile.badges || []);
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

  useEffect(() => {
    if (profile.badges) {
      setBadges(profile.badges);
    }
  }, [profile.badges]);

  // Sync avatar when profile prop changes (e.g., after auto-assignment)
  useEffect(() => {
    if (profile.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile.avatar_url]);

  const handleAddLanguage = () => {
    if (selectedLanguage && !languagesLearning.includes(selectedLanguage)) {
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

      // Check if display name is being changed and if it's allowed
      if (isDisplayNameChanged && !canChangeDisplayName()) {
        setMessage({ 
          type: 'error', 
          text: `You can only change your display name once per month. ${getDaysUntilCanChange()} days remaining.` 
        });
        setSaving(false);
        return;
      }

      // Build update object
      const updateData: any = {
        bio: bio || null,
        avatar_url: avatarUrl,
        profile_public: profilePublic,
        languages_learning: languagesLearning,
        theme_preference: theme,
        notification_prefs: notificationPrefs,
      };

      // Only update display name fields if name is actually changing
      if (isDisplayNameChanged) {
        updateData.display_name = displayName || null;
        updateData.display_name_changed_at = new Date().toISOString();
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

      if (!response.ok) throw new Error('Failed to update profile');

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      onUpdate();
      // Dispatch event to update nav bars immediately
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
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

  const getLanguageInfo = (code: string) => {
    return AVAILABLE_LANGUAGES.find(l => l.code === code) || { name: code, emoji: '🌍' };
  };

  return (
    <div className="space-y-6">
      {/* Profile Avatar Picker */}
      <div className="rounded-3xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
          <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Your Profile</h3>
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>
          Choose your avatar from 25 cute options!
        </p>
        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 overflow-hidden transition-all cursor-pointer group relative"
            style={{ background: 'linear-gradient(to bottom right, var(--accent-blue), var(--accent-green))', ringColor: 'var(--bg-card)' }}
          >
            <img 
              src={avatarUrl} 
              alt="Profile avatar" 
              className="w-full h-full object-cover scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Change</span>
            </div>
          </button>
          <div>
            <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName || 'Your Name'}</p>
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>
            <Link href={`/profile/${profile.id}`}>
              <Button variant="link" className="p-0 h-auto mt-2 font-semibold" style={{ color: 'var(--accent-green)' }}>
                View public profile →
              </Button>
            </Link>
          </div>
        </div>

        {/* Avatar Picker Grid */}
        {showAvatarPicker && (
          <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Select your avatar:</p>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => {
                const url = getAvatarUrl(id);
                const isSelected = avatarUrl === url;
                return (
                  <button
                    key={id}
                    onClick={async () => {
                      // Update local state immediately for responsive UI
                      const previousUrl = avatarUrl;
                      setAvatarUrl(url);
                      setShowAvatarPicker(false);
                      
                      try {
                        // Save to database using user's access token for RLS
                        console.log('[Avatar] Saving avatar, token length:', accessToken?.length);
                        console.log('[Avatar] Profile ID:', profile.id);
                        console.log('[Avatar] New URL:', url);
                        
                        const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${profile.id}`, {
                          method: 'PATCH',
                          headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ avatar_url: url }),
                        });
                        
                        console.log('[Avatar] Response status:', response.status);
                        
                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error('[Avatar] Error response:', errorText);
                          throw new Error(`Failed to save avatar: ${response.status}`);
                        }
                        
                        console.log('[Avatar] Save successful!');
                        // Notify parent to refresh data
                        onUpdate();
                        // Dispatch event to update nav bars immediately
                        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
                        setMessage({ type: 'success', text: 'Avatar updated!' });
                      } catch (error: any) {
                        // Revert on error
                        console.error('[Avatar] Error:', error);
                        setAvatarUrl(previousUrl);
                        setMessage({ type: 'error', text: error.message || 'Failed to save avatar. Please try again.' });
                      }
                    }}
                    className={`w-12 h-12 rounded-full overflow-hidden transition-all hover:scale-110 ${
                      isSelected 
                        ? 'ring-4 ring-talka-purple scale-110' 
                        : 'ring-2 ring-slate-200 hover:ring-talka-purple/50'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Avatar ${id}`} 
                      className="w-full h-full object-cover scale-110"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile Information */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-1" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Profile Information</h3>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Update your personal information</p>
        
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
              className="rounded-2xl mt-2 font-medium focus:ring-0"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
              maxLength={50}
            />
            {/* Display name change warning */}
            {isDisplayNameChanged && (
              <div 
                className="mt-2 p-3 rounded-xl text-sm"
                style={canChangeDisplayName() 
                  ? { backgroundColor: 'rgba(251, 146, 60, 0.2)', color: 'var(--accent-orange)' }
                  : { backgroundColor: 'rgba(255, 75, 75, 0.2)', color: 'var(--accent-red)' }
                }
              >
                {canChangeDisplayName() ? (
                  <p className="font-medium">⚠️ You can only change your display name once per month.</p>
                ) : (
                  <p className="font-medium">🚫 You can change your display name again in {getDaysUntilCanChange()} days.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="bio" className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="Tell others about yourself..."
              className="rounded-2xl mt-2 min-h-[100px] resize-none font-medium focus:ring-0"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
              maxLength={MAX_BIO_LENGTH}
            />
            <p className="text-xs mt-1 text-right font-medium" style={{ color: 'var(--text-muted)' }}>
              {bio.length}/{MAX_BIO_LENGTH}
            </p>
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
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Show others what languages you're studying</p>
        
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
            disabled={!selectedLanguage}
            className="text-white font-bold rounded-2xl px-6 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
          >
            Add
          </Button>
        </div>

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

      {/* Achievement Badges */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-3" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5" style={{ color: 'var(--accent-yellow)' }} />
          <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Achievements</h3>
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Badges you've earned through your learning journey</p>
        <AchievementBadges badges={badges} showAll size="lg" />
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

      {/* Save Button */}
      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full text-white font-bold rounded-2xl py-4 hover:-translate-y-0.5 transition-all disabled:opacity-50 active:translate-y-1"
        style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes ✨'
        )}
      </Button>
    </div>
  );
}


