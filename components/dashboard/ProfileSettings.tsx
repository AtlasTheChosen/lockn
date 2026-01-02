'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  onUpdate: () => void;
}

export default function ProfileSettings({ profile, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
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

  const supabase = createClient();

  useEffect(() => {
    if (profile.badges) {
      setBadges(profile.badges);
    }
  }, [profile.badges]);

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

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName || null,
          bio: bio || null,
          avatar_url: avatarUrl,
          profile_public: profilePublic,
          languages_learning: languagesLearning,
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

  const getLanguageInfo = (code: string) => {
    return AVAILABLE_LANGUAGES.find(l => l.code === code) || { name: code, emoji: '🌍' };
  };

  return (
    <div className="space-y-6">
      {/* Profile Avatar Picker */}
      <div className="bg-white rounded-3xl p-6 shadow-talka-sm animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-talka-purple" />
          <h3 className="font-display text-xl font-semibold text-slate-800">Your Profile</h3>
        </div>
        <p className="text-slate-500 text-sm font-medium mb-6">
          Choose your avatar from 25 cute options!
        </p>
        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="w-24 h-24 rounded-full bg-gradient-cyan-blue flex items-center justify-center text-3xl font-bold text-white shadow-blue ring-4 ring-white overflow-hidden hover:ring-talka-purple transition-all cursor-pointer group relative"
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
            <p className="font-display text-xl font-semibold text-slate-800">{displayName || 'Your Name'}</p>
            <p className="text-slate-500 font-medium">{profile.email}</p>
            <Link href={`/profile/${profile.id}`}>
              <Button variant="link" className="text-talka-purple p-0 h-auto mt-2 font-semibold">
                View public profile →
              </Button>
            </Link>
          </div>
        </div>

        {/* Avatar Picker Grid */}
        {showAvatarPicker && (
          <div className="border-t pt-6">
            <p className="text-sm font-medium text-slate-600 mb-4">Select your avatar:</p>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => {
                const url = getAvatarUrl(id);
                const isSelected = avatarUrl === url;
                return (
                  <button
                    key={id}
                    onClick={async () => {
                      // Update local state immediately
                      setAvatarUrl(url);
                      setShowAvatarPicker(false);
                      // Save to database (don't call onUpdate to avoid state reset)
                      await supabase
                        .from('user_profiles')
                        .update({ avatar_url: url })
                        .eq('id', profile.id);
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
      <div className="bg-white rounded-3xl p-6 shadow-talka-sm animate-fade-in stagger-1">
        <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">Profile Information</h3>
        <p className="text-slate-500 text-sm font-medium mb-6">Update your personal information</p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="display-name" className="text-slate-700 font-semibold">
              Display Name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="bg-slate-50 border-2 border-slate-200 rounded-2xl mt-2 font-medium focus:border-talka-purple focus:ring-0"
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="bio" className="text-slate-700 font-semibold">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="Tell others about yourself..."
              className="bg-slate-50 border-2 border-slate-200 rounded-2xl mt-2 min-h-[100px] resize-none font-medium focus:border-talka-purple focus:ring-0"
              maxLength={MAX_BIO_LENGTH}
            />
            <p className="text-xs text-slate-400 mt-1 text-right font-medium">
              {bio.length}/{MAX_BIO_LENGTH}
            </p>
          </div>

          <div>
            <Label htmlFor="email" className="text-slate-700 font-semibold">
              Email Address
            </Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-slate-100 border-2 border-slate-200 text-slate-400 rounded-2xl mt-2 font-medium"
            />
            <p className="text-xs text-slate-400 mt-1 font-medium">Email cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Languages Learning */}
      <div className="bg-white rounded-3xl p-6 shadow-talka-sm animate-fade-in stagger-2">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-talka-blue" />
          <h3 className="font-display text-xl font-semibold text-slate-800">Languages I'm Learning</h3>
        </div>
        <p className="text-slate-500 text-sm font-medium mb-6">Show others what languages you're studying</p>
        
        <div className="flex gap-3 mb-4">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="bg-slate-50 border-2 border-slate-200 rounded-2xl flex-1 font-medium focus:border-talka-purple focus:ring-0">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent className="bg-white border-2 border-slate-200 rounded-2xl">
              {AVAILABLE_LANGUAGES.filter(l => !languagesLearning.includes(l.code)).map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="font-medium rounded-xl">
                  {lang.emoji} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddLanguage}
            disabled={!selectedLanguage}
            className="bg-gradient-purple-pink text-white font-bold rounded-2xl px-6 shadow-purple disabled:opacity-50"
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
                  className="px-4 py-2 bg-gradient-blue-purple text-white font-semibold rounded-xl text-sm flex items-center gap-2"
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
          <p className="text-slate-400 text-sm font-medium italic">No languages added yet</p>
        )}
      </div>

      {/* Achievement Badges */}
      <div className="bg-white rounded-3xl p-6 shadow-talka-sm animate-fade-in stagger-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-talka-yellow" />
          <h3 className="font-display text-xl font-semibold text-slate-800">My Achievements</h3>
        </div>
        <p className="text-slate-500 text-sm font-medium mb-6">Badges you've earned through your learning journey</p>
        <AchievementBadges badges={badges} showAll size="lg" />
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-3xl p-6 shadow-talka-sm animate-fade-in stagger-4">
        <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">Privacy</h3>
        <p className="text-slate-500 text-sm font-medium mb-6">Control who can see your profile</p>
        
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center gap-4">
            {profilePublic ? (
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                <EyeOff className="h-5 w-5 text-slate-500" />
              </div>
            )}
            <div>
              <Label className="text-slate-700 font-semibold">Public Profile</Label>
              <p className="text-sm text-slate-500">
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
      <div className="bg-white rounded-3xl p-6 shadow-talka-sm animate-fade-in stagger-5">
        <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">Notifications</h3>
        <p className="text-slate-500 text-sm font-medium mb-6">Manage your notification preferences</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
            <div>
              <Label className="text-slate-700 font-semibold">Email Notifications</Label>
              <p className="text-sm text-slate-500">Receive updates via email</p>
            </div>
            <Switch
              checked={notificationPrefs.email}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, email: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
            <div>
              <Label className="text-slate-700 font-semibold">Friend Requests</Label>
              <p className="text-sm text-slate-500">Get notified of new friend requests</p>
            </div>
            <Switch
              checked={notificationPrefs.friend_requests}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, friend_requests: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
            <div>
              <Label className="text-slate-700 font-semibold">Streak Reminders</Label>
              <p className="text-sm text-slate-500">Daily reminders to maintain your streak</p>
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
          className={`flex items-center gap-3 p-4 rounded-2xl animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 border-2 border-green-200'
              : 'bg-red-100 text-red-700 border-2 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-4 shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
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


