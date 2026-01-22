'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AchievementBadges from '@/components/social/AchievementBadges';
import { 
  User, 
  Calendar,
  Shield,
  Settings
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatars';

interface Props {
  profile: UserProfile;
  stats?: {
    current_streak?: number;
    total_cards_mastered?: number;
    current_week_cards?: number;
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

    </div>
  );
}
