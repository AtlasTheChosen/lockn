'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AchievementBadges from '@/components/social/AchievementBadges';
import { AppLayout } from '@/components/layout';
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Ban,
  Flame,
  Trophy,
  BookOpen,
  Calendar,
  Globe,
  Shield,
  Loader2,
  AlertCircle,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { PublicProfile } from '@/lib/types';

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ru: 'Russian', ar: 'Arabic',
  hi: 'Hindi', nl: 'Dutch', sv: 'Swedish', pl: 'Polish', tr: 'Turkish',
  vi: 'Vietnamese', th: 'Thai', he: 'Hebrew', el: 'Greek', cs: 'Czech',
};

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { user: sessionUser, loading: sessionLoading } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted' | 'blocked' | 'self'>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Check if viewing own profile
      if (sessionUser?.id === userId) {
        setFriendshipStatus('self');
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, badges, languages_learning, profile_public, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('User not found');
        return;
      }

      // Check if profile is private
      if (!profileData.profile_public && sessionUser?.id !== userId) {
        setError('This profile is private');
        return;
      }

      // Fetch user stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('current_streak, total_cards_mastered, total_stacks_completed, current_week_cards')
        .eq('user_id', userId)
        .maybeSingle();

      // Combine profile with stats
      const fullProfile: PublicProfile = {
        id: profileData.id,
        display_name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        badges: profileData.badges || [],
        languages_learning: profileData.languages_learning || [],
        profile_public: profileData.profile_public ?? true,
        created_at: profileData.created_at,
        current_streak: statsData?.current_streak || 0,
        total_cards_mastered: statsData?.total_cards_mastered || 0,
        total_stacks_completed: statsData?.total_stacks_completed || 0,
        current_week_cards: statsData?.current_week_cards || 0,
      };

      setProfile(fullProfile);

      // Check friendship status if logged in and not viewing own profile
      if (sessionUser && sessionUser.id !== userId) {
        const { data: friendshipData } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(user_id.eq.${sessionUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${sessionUser.id})`)
          .maybeSingle();

        if (friendshipData) {
          setFriendshipId(friendshipData.id);
          setFriendshipStatus(friendshipData.status);
        }
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId, sessionUser, supabase]);

  useEffect(() => {
    if (!sessionLoading) {
      loadProfile();
    }
  }, [sessionLoading, loadProfile]);

  const handleSendFriendRequest = async () => {
    if (!sessionUser) {
      router.push('/');
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);

      const { error } = await supabase.from('friendships').insert({
        user_id: sessionUser.id,
        friend_id: userId,
        status: 'pending',
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Friend request sent!' });
      setFriendshipStatus('pending');
      loadProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;

    try {
      setActionLoading(true);
      setMessage(null);

      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Friend removed' });
      setFriendshipStatus('none');
      setFriendshipId(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!sessionUser) return;
    
    try {
      setActionLoading(true);
      setMessage(null);

      if (friendshipId) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'blocked' })
          .eq('id', friendshipId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('friendships').insert({
          user_id: sessionUser.id,
          friend_id: userId,
          status: 'blocked',
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'User blocked' });
      setFriendshipStatus('blocked');
      loadProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const isOwnProfile = friendshipStatus === 'self';

  // Loading state
  if (loading || sessionLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            <Skeleton className="h-8 w-48" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          </div>
          <div className="rounded-3xl p-8" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-28 w-28 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              <Skeleton className="h-8 w-48" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              <Skeleton className="h-4 w-64" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.back()}
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="rounded-3xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--accent-red)' }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Error</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="gap-2 font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {isOwnProfile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/dashboard?tab=profile')}
              className="font-semibold rounded-xl"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Main Profile Card */}
        <div className="rounded-3xl p-6 sm:p-8 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            {/* Avatar */}
            <div 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 overflow-hidden flex-shrink-0"
              style={{ 
                background: 'linear-gradient(to bottom right, var(--accent-blue), var(--accent-green))',
                '--tw-ring-color': 'var(--bg-secondary)'
              } as React.CSSProperties}
            >
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name || 'User'} 
                  className="w-full h-full object-cover scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                  {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {profile.display_name || 'Anonymous User'}
              </h1>

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

              {/* Languages Learning */}
              {profile.languages_learning.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Globe className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  {profile.languages_learning.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-1 text-xs font-semibold rounded-lg"
                      style={{ backgroundColor: 'rgba(88, 204, 2, 0.2)', color: 'var(--accent-green)' }}
                    >
                      {LANGUAGE_NAMES[lang] || lang}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Only show if not own profile */}
          {!isOwnProfile && sessionUser && (
            <div className="pt-6 mb-6" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {friendshipStatus === 'none' && (
                  <Button
                    onClick={handleSendFriendRequest}
                    disabled={actionLoading}
                    className="text-white font-bold rounded-2xl px-6"
                    style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Add Friend
                  </Button>
                )}

                {friendshipStatus === 'pending' && (
                  <Button disabled className="rounded-2xl px-6 font-bold" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    <Clock className="h-4 w-4 mr-2" />
                    Request Pending
                  </Button>
                )}

                {friendshipStatus === 'accepted' && (
                  <>
                    <Button className="rounded-2xl px-6 font-bold" style={{ backgroundColor: 'rgba(88, 204, 2, 0.2)', color: 'var(--accent-green)' }}>
                      <Check className="h-4 w-4 mr-2" />
                      Friends
                    </Button>
                    <Button
                      onClick={handleRemoveFriend}
                      disabled={actionLoading}
                      className="rounded-2xl px-6 font-bold"
                      style={{ backgroundColor: 'rgba(255, 75, 75, 0.2)', color: 'var(--accent-red)' }}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </>
                )}

                {friendshipStatus !== 'blocked' && friendshipStatus !== 'accepted' && (
                  <Button
                    onClick={handleBlockUser}
                    disabled={actionLoading}
                    className="rounded-2xl px-6 font-bold"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Block
                  </Button>
                )}

                {friendshipStatus === 'blocked' && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ backgroundColor: 'rgba(255, 75, 75, 0.2)', color: 'var(--accent-red)' }}>
                    <Ban className="h-4 w-4" />
                    <span className="font-semibold">Blocked</span>
                  </div>
                )}
              </div>

              {message && (
                <div
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl text-sm font-medium"
                  style={message.type === 'success'
                    ? { backgroundColor: 'rgba(88, 204, 2, 0.15)', color: 'var(--accent-green)' }
                    : { backgroundColor: 'rgba(255, 75, 75, 0.15)', color: 'var(--accent-red)' }
                  }
                >
                  {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {message.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <Flame className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.current_streak}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Day Streak</p>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <BookOpen className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.total_cards_mastered}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cards Mastered</p>
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <Sparkles className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.current_week_cards}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>This Week</p>
          </div>
        </div>

        {/* All Badges Section */}
        {profile.badges.length > 0 && (
          <div className="rounded-3xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5" style={{ color: 'var(--accent-yellow)' }} />
              <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Achievements ({profile.badges.length})
              </h3>
            </div>
            <AchievementBadges badges={profile.badges} showAll size="lg" />
          </div>
        )}

        {/* Own profile message */}
        {isOwnProfile && (
          <div className="text-center mt-6">
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              This is how others see your public profile
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
