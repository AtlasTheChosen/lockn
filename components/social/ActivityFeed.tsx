'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  BookOpen,
  CheckCircle,
  Users,
  Zap,
  Award,
  Star,
  Clock,
} from 'lucide-react';
import type { ActivityFeedItem } from '@/lib/types';

// Icon mapping for activity types
const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  stack_completed: Trophy,
  stack_created: BookOpen,
  test_passed: CheckCircle,
  streak_milestone: Flame,
  cards_milestone: Star,
  challenge_won: Zap,
  challenge_started: Zap,
  friend_added: Users,
  badge_earned: Award,
};

// Color mapping for activity types
const activityColors: Record<string, string> = {
  stack_completed: 'text-yellow-400 bg-yellow-400/20',
  stack_created: 'text-blue-400 bg-blue-400/20',
  test_passed: 'text-green-400 bg-green-400/20',
  streak_milestone: 'text-orange-400 bg-orange-400/20',
  cards_milestone: 'text-purple-400 bg-purple-400/20',
  challenge_won: 'text-cyan-400 bg-cyan-400/20',
  challenge_started: 'text-indigo-400 bg-indigo-400/20',
  friend_added: 'text-pink-400 bg-pink-400/20',
  badge_earned: 'text-amber-400 bg-amber-400/20',
};

interface Props {
  userId?: string; // If provided, shows only this user's activities
  friendsOnly?: boolean; // If true, shows only friends' activities
  limit?: number;
  showUserInfo?: boolean;
}

export default function ActivityFeed({ 
  userId, 
  friendsOnly = false, 
  limit = 20,
  showUserInfo = true 
}: Props) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadActivities();
  }, [userId, friendsOnly, limit]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('activity_feed')
        .select(`
          id,
          user_id,
          activity_type,
          title,
          description,
          metadata,
          is_public,
          created_at
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: activitiesData, error: activitiesError } = await query;

      if (activitiesError) {
        // Table might not exist yet
        if (activitiesError.message?.includes('does not exist')) {
          setActivities([]);
          setLoading(false);
          return;
        }
        throw activitiesError;
      }

      if (!activitiesData || activitiesData.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles for activities
      const userIds = Array.from(new Set(activitiesData.map(a => a.user_id)));
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine activities with profiles
      const enrichedActivities: ActivityFeedItem[] = activitiesData.map(activity => ({
        ...activity,
        user_profile: profileMap.get(activity.user_id),
      }));

      setActivities(enrichedActivities);
    } catch (err: any) {
      console.error('Error loading activities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (profile?: { display_name?: string }) => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-slate-700" />
                  <Skeleton className="h-4 w-48 bg-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-red-400">Failed to load activity feed</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No recent activity</p>
          <p className="text-sm text-slate-500 mt-1">
            Activity will appear here as you and your friends learn
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const IconComponent = activityIcons[activity.activity_type] || Star;
        const colorClass = activityColors[activity.activity_type] || 'text-slate-400 bg-slate-400/20';

        return (
          <Card key={activity.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Activity Icon */}
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <IconComponent className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {showUserInfo && activity.user_profile && (
                      <Link href={`/profile/${activity.user_id}`} className="flex items-center gap-2 hover:opacity-80">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.user_profile.avatar_url} />
                          <AvatarFallback className="bg-slate-700 text-white text-xs">
                            {getInitials(activity.user_profile)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-white text-sm">
                          {activity.user_profile.display_name || 'User'}
                        </span>
                      </Link>
                    )}
                  </div>

                  <p className="text-white font-medium">{activity.title}</p>
                  
                  {activity.description && (
                    <p className="text-sm text-slate-400 mt-1">{activity.description}</p>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatTimeAgo(activity.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Helper function to create an activity entry
export async function createActivity(
  supabase: any,
  userId: string,
  type: ActivityFeedItem['activity_type'],
  title: string,
  description?: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.from('activity_feed').insert({
      user_id: userId,
      activity_type: type,
      title,
      description,
      metadata: metadata || {},
      is_public: true,
    });

    if (error) {
      console.warn('Failed to create activity:', error);
    }
  } catch (err) {
    console.warn('Failed to create activity:', err);
  }
}


