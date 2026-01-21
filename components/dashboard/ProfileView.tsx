'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AchievementBadges from '@/components/social/AchievementBadges';
import { 
  User, 
  Globe, 
  Trophy,
  Calendar,
  Shield,
  Settings,
  Flame,
  BookOpen,
  Sparkles
} from 'lucide-react';
import type { UserProfile, Badge as BadgeType } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatars';

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ru: 'Russian', ar: 'Arabic',
  hi: 'Hindi', nl: 'Dutch', sv: 'Swedish', pl: 'Polish', tr: 'Turkish',
  vi: 'Vietnamese', th: 'Thai', he: 'Hebrew', el: 'Greek', cs: 'Czech',
};

const LANGUAGE_EMOJIS: Record<string, string> = {
  es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇧🇷',
  ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', ru: '🇷🇺', ar: '🇸🇦',
  hi: '🇮🇳', nl: '🇳🇱', sv: '🇸🇪', pl: '🇵🇱', tr: '🇹🇷',
  vi: '🇻🇳', th: '🇹🇭', he: '🇮🇱', el: '🇬🇷', cs: '🇨🇿',
};

interface Props {
  profile: UserProfile;
  stats?: {
    current_streak?: number;
    total_cards_mastered?: number;
    current_week_cards?: number;
  } | null;
}

export default function ProfileView({ profile, stats }: Props) {
  const badges = profile.badges || [];
  const languagesLearning = profile.languages_learning || [];
  const avatarUrl = profile.avatar_url || getAvatarUrl(0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Section */}
      <div className="rounded-3xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 overflow-hidden flex-shrink-0 bg-white"
            style={{ 
              '--tw-ring-color': 'var(--bg-secondary)'
            } as React.CSSProperties}
          >
            <img 
              src={avatarUrl} 
              alt={profile.display_name || 'User'} 
              className="w-full h-full object-cover bg-white scale-[0.75]"
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {profile.display_name || 'Your Name'}
              </h1>
              {!profile.profile_public && (
                <Shield className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              )}
            </div>

            <p className="font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              {!profile.profile_public && (
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Private Profile
                </span>
              )}
            </div>

            {/* Edit Account Settings Link */}
            <Link href="/account">
              <Button 
                variant="link" 
                className="p-0 h-auto font-semibold" 
                style={{ color: 'var(--accent-green)' }}
              >
                <Settings className="h-4 w-4 mr-2 inline" />
                Edit Account Settings →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 animate-fade-in stagger-1">
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <Flame className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.current_streak || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Day Streak</p>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <BookOpen className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_cards_mastered || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cards Mastered</p>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <Sparkles className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.current_week_cards || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>This Week</p>
          </div>
        </div>
      )}

      {/* Languages Learning */}
      {languagesLearning.length > 0 && (
        <div className="rounded-3xl p-6 animate-fade-in stagger-2" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5" style={{ color: 'var(--accent-blue)' }} />
            <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Languages I'm Learning</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {languagesLearning.map((langCode) => {
              const langName = LANGUAGE_NAMES[langCode] || langCode;
              const langEmoji = LANGUAGE_EMOJIS[langCode] || '🌍';
              return (
                <span
                  key={langCode}
                  className="px-4 py-2 text-white font-semibold rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'linear-gradient(to right, var(--accent-blue), var(--accent-green))' }}
                >
                  {langEmoji} {langName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      <div className="rounded-3xl p-6 animate-fade-in stagger-3" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5" style={{ color: 'var(--accent-yellow)' }} />
          <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Achievements</h3>
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: 'var(--text-secondary)' }}>Badges you've earned through your learning journey</p>
        <AchievementBadges badges={badges} showAll size="lg" />
        {badges.length === 0 && (
          <p className="text-sm font-medium italic text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No achievements yet. Start learning to earn your first badge!
          </p>
        )}
      </div>
    </div>
  );
}
