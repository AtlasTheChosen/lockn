'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AchievementBadges from '@/components/social/AchievementBadges';
import { 
  User, 
  Calendar,
  Shield,
  Settings,
  Flame,
  BookOpen,
  Globe,
  Trophy,
  Crown
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatars';

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  sv: 'Swedish',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  he: 'Hebrew',
};

const LANGUAGE_EMOJIS: Record<string, string> = {
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇧🇷',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  ru: '🇷🇺',
  ar: '🇸🇦',
  hi: '🇮🇳',
  nl: '🇳🇱',
  sv: '🇸🇪',
  pl: '🇵🇱',
  tr: '🇹🇷',
  vi: '🇻🇳',
  th: '🇹🇭',
  he: '🇮🇱',
};

interface Props {
  profile: UserProfile;
  stats?: {
    current_streak?: number;
    total_cards_mastered?: number;
    current_week_cards?: number;
    longest_streak?: number;
  } | null;
}

export default function ProfileView({ profile, stats }: Props) {
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

            {/* Meta info - NO EMAIL */}
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

            {/* Languages Learning */}
            {profile.languages_learning && profile.languages_learning.length > 0 && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                <Globe className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                {profile.languages_learning.map((lang) => (
                  <span
                    key={lang}
                    className="px-2 py-1 text-xs font-semibold rounded-lg"
                    style={{ backgroundColor: 'rgba(88, 204, 2, 0.2)', color: 'var(--accent-green)' }}
                  >
                    {LANGUAGE_EMOJIS[lang] || '🌐'} {LANGUAGE_NAMES[lang] || lang}
                  </span>
                ))}
              </div>
            )}

            {/* Settings Links */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
              <Link href="/profile">
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold" 
                  style={{ color: 'var(--accent-green)' }}
                >
                  <User className="h-4 w-4 mr-2 inline" />
                  Profile Settings →
                </Button>
              </Link>
              <Link href="/account">
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold" 
                  style={{ color: 'var(--accent-blue)' }}
                >
                  <Settings className="h-4 w-4 mr-2 inline" />
                  Account Settings →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <Flame className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.current_streak || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Current Streak</p>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <BookOpen className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.current_week_cards || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>This Week</p>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <Trophy className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_cards_mastered || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Cards</p>
          </div>

          <div className="rounded-2xl p-4 text-center relative" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <Crown className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.longest_streak || 0}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Best Streak</p>
            {stats.longest_streak && stats.longest_streak > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-1.5 py-0.5">
                Best
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Achievements - Always show, even if empty */}
      <div className="rounded-3xl p-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Trophy className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
          Achievements {profile.badges && profile.badges.length > 0 && `(${profile.badges.length})`}
        </h3>
        {profile.badges && profile.badges.length > 0 ? (
          <AchievementBadges badges={profile.badges} showAll size="lg" />
        ) : (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No achievements yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Complete challenges and maintain your streak to earn badges!</p>
          </div>
        )}
      </div>
    </div>
  );
}
