'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AchievementBadges from '@/components/social/AchievementBadges';
import { calculateWeeklyAverage } from '@/lib/weekly-stats';
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Ban,
  MessageCircle,
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
} from 'lucide-react';
import type { Badge as BadgeType, PublicProfile } from '@/lib/types';

// Language display names
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
  el: 'Greek',
  cs: 'Czech',
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
        .select('id, display_name, avatar_url, bio, badges, languages_learning, profile_public, created_at')
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
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('current_streak, total_cards_mastered, total_stacks_completed, weekly_cards_history')
        .eq('user_id', userId)
        .maybeSingle();

      if (statsError) {
        console.warn('Stats fetch error:', statsError);
      }

      // Combine profile with stats
      const fullProfile: PublicProfile = {
        id: profileData.id,
        display_name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        badges: profileData.badges || [],
        languages_learning: profileData.languages_learning || [],
        profile_public: profileData.profile_public ?? true,
        created_at: profileData.created_at,
        current_streak: statsData?.current_streak || 0,
        total_cards_mastered: statsData?.total_cards_mastered || 0,
        total_stacks_completed: statsData?.total_stacks_completed || 0,
        weekly_average: calculateWeeklyAverage(statsData?.weekly_cards_history || []),
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
      router.push('/auth/login');
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
    try {
      setActionLoading(true);
      setMessage(null);

      if (friendshipId) {
        // Update existing friendship to blocked
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'blocked' })
          .eq('id', friendshipId);

        if (error) throw error;
      } else {
        // Create new blocked relationship
        const { error } = await supabase.from('friendships').insert({
          user_id: sessionUser!.id,
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

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  // Loading state
  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 bg-slate-700" />
            <Skeleton className="h-8 w-48 bg-slate-700" />
          </div>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-32 w-32 rounded-full bg-slate-700" />
                <Skeleton className="h-8 w-48 bg-slate-700" />
                <Skeleton className="h-4 w-64 bg-slate-700" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
              <p className="text-slate-400">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = friendshipStatus === 'self';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          {isOwnProfile && (
            <Link href="/profile">
              <Button variant="outline" size="sm" className="border-slate-600">
                Edit Profile
              </Button>
            </Link>
          )}
        </div>

        {/* Main Profile Card */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar */}
              <Avatar className="h-32 w-32 ring-4 ring-slate-700">
                <AvatarImage src={profile.avatar_url} alt={profile.display_name || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-3xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {profile.display_name || 'Anonymous User'}
                </h1>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-slate-300 mb-4 max-w-lg">{profile.bio}</p>
                )}

                {/* Meta info */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400 mb-4">
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
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                    <Globe className="h-4 w-4 text-slate-400" />
                    {profile.languages_learning.map((lang) => (
                      <Badge key={lang} className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                        {LANGUAGE_NAMES[lang] || lang}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Achievement Badges */}
                {profile.badges.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-400 mb-2">Achievements</p>
                    <AchievementBadges badges={profile.badges} size="md" maxDisplay={8} />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Only show if not own profile */}
            {!isOwnProfile && sessionUser && (
              <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {friendshipStatus === 'none' && (
                    <Button
                      onClick={handleSendFriendRequest}
                      disabled={actionLoading}
                      className="bg-indigo-600 hover:bg-indigo-700"
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
                    <Button disabled className="bg-slate-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Request Pending
                    </Button>
                  )}

                  {friendshipStatus === 'accepted' && (
                    <>
                      <Button variant="outline" className="border-green-500 text-green-400">
                        <Check className="h-4 w-4 mr-2" />
                        Friends
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRemoveFriend}
                        disabled={actionLoading}
                        className="border-red-500 text-red-400 hover:bg-red-500/20"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </>
                  )}

                  {friendshipStatus !== 'blocked' && (
                    <Button
                      variant="outline"
                      onClick={handleBlockUser}
                      disabled={actionLoading}
                      className="border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Block
                    </Button>
                  )}

                  {friendshipStatus === 'blocked' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <Ban className="h-4 w-4 mr-1" />
                      Blocked
                    </Badge>
                  )}
                </div>

                {message && (
                  <div
                    className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
                      message.type === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {message.text}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <Flame className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{profile.current_streak}</p>
              <p className="text-xs text-slate-400">Day Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{profile.total_cards_mastered}</p>
              <p className="text-xs text-slate-400">Cards Mastered</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{profile.total_stacks_completed}</p>
              <p className="text-xs text-slate-400">Stacks Done</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{profile.weekly_average}</p>
              <p className="text-xs text-slate-400">Avg/Week</p>
            </CardContent>
          </Card>
        </div>

        {/* All Badges Section */}
        {profile.badges.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                All Achievements ({profile.badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AchievementBadges badges={profile.badges} showAll size="lg" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


