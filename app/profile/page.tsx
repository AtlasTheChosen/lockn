'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, RefreshCw, Flame, BookOpen, Calendar, Globe, Trophy, Crown } from 'lucide-react';
import AchievementBadges from '@/components/social/AchievementBadges';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import type { UserProfile, UserStats } from '@/lib/types';
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ProfilePage() {
  const router = useRouter();
  const { user: sessionUser, profile: sessionProfile, accessToken, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const loadData = useCallback(async () => {
    if (!sessionUser || !accessToken) return;

    try {
      setError(null);
      
      // Load profile
      let profileData = sessionProfile;
      if (!profileData) {
        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${sessionUser.id}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const profileArray = profileResponse.ok ? await profileResponse.json() : [];
        profileData = profileArray?.[0] || null;

        if (!profileData) {
          // Create profile if it doesn't exist
          const createResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify({
                id: sessionUser.id,
                email: sessionUser.email,
              }),
            }
          );
          const newProfile = createResponse.ok ? await createResponse.json() : [];
          profileData = newProfile?.[0] || null;
        }
      }
      setProfile(profileData);

      // Load stats
      const statsResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_stats?user_id=eq.${sessionUser.id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (statsResponse.ok) {
        const statsArray = await statsResponse.json();
        setStats(statsArray?.[0] || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [sessionUser, sessionProfile, accessToken]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      router.push('/');
      return;
    }
    loadData();
  }, [sessionUser, sessionLoading, router, loadData]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8 bg-slate-700" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
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
              <h2 className="text-xl font-bold">Error Loading Profile</h2>
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

  if (showSettings && profile && accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          </div>
          <ProfileSettings profile={profile} accessToken={accessToken} onUpdate={loadData} />
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url || getAvatarUrl(0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Button 
            onClick={() => setShowSettings(true)}
            style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
          >
            Edit Profile
          </Button>
        </div>

        {profile ? (
          <>
            {/* Profile Header */}
            <div className="rounded-3xl p-6 mb-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
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
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {profile.display_name || 'Your Name'}
                  </h1>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Languages Learning */}
                  {profile.languages_learning && profile.languages_learning.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
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
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <Flame className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.current_streak || 0}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Current Streak</p>
              </div>

              <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <BookOpen className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.current_week_cards || 0}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>This Week</p>
              </div>

              <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <Trophy className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.total_cards_mastered || 0}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Cards</p>
              </div>

              <div className="rounded-2xl p-4 text-center relative" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <Crown className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.longest_streak || 0}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Best Streak</p>
                {stats?.longest_streak && stats.longest_streak > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-1.5 py-0.5">
                    Best
                  </Badge>
                )}
              </div>
            </div>

            {/* Achievements */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="rounded-3xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Trophy className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  Achievements ({profile.badges.length})
                </h3>
                <AchievementBadges badges={profile.badges} showAll size="lg" />
              </div>
            )}
          </>
        ) : (
          <Card style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <CardContent className="py-12 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Unable to load profile.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
