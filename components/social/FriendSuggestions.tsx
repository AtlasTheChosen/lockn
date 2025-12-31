'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  UserPlus,
  Users,
  Globe,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react';

// Language names map
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
};

interface SuggestedUser {
  id: string;
  display_name?: string;
  avatar_url?: string;
  languages_learning?: string[];
  commonLanguages: string[];
}

interface Props {
  userId: string;
  limit?: number;
}

export default function FriendSuggestions({ userId, limit = 5 }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);

      // Get current user's profile and languages
      const { data: myProfile } = await supabase
        .from('user_profiles')
        .select('languages_learning')
        .eq('id', userId)
        .single();

      const myLanguages = myProfile?.languages_learning || [];

      // Get existing friendships and blocked users
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      const excludeIds = new Set<string>([userId]);
      friendships?.forEach(f => {
        excludeIds.add(f.user_id === userId ? f.friend_id : f.user_id);
      });

      // Get users learning similar languages
      let query = supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, languages_learning')
        .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
        .not('display_name', 'is', null)
        .limit(50);

      const { data: potentialFriends, error } = await query;

      if (error) {
        console.error('Error loading suggestions:', error);
        return;
      }

      if (!potentialFriends || potentialFriends.length === 0) {
        setSuggestions([]);
        return;
      }

      // Score users by common languages
      const scoredUsers: SuggestedUser[] = potentialFriends
        .map(user => {
          const userLanguages = user.languages_learning || [];
          const commonLanguages = myLanguages.filter((lang: string) => 
            userLanguages.includes(lang)
          );
          return {
            ...user,
            commonLanguages,
          };
        })
        .sort((a, b) => b.commonLanguages.length - a.commonLanguages.length)
        .slice(0, limit);

      setSuggestions(scoredUsers);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (targetId: string) => {
    try {
      setSendingRequest(targetId);

      const { error } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: targetId,
        status: 'pending',
      });

      if (error) throw error;

      setSentRequests(prev => new Set(prev).add(targetId));
    } catch (err) {
      console.error('Failed to send request:', err);
    } finally {
      setSendingRequest(null);
    }
  };

  const getInitials = (user: SuggestedUser) => {
    if (user.display_name) {
      return user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            Suggested Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 bg-slate-700 mb-1" />
                <Skeleton className="h-3 w-32 bg-slate-700" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            Suggested Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No suggestions available</p>
            <p className="text-slate-500 text-xs mt-1">
              Add languages to your profile to find learners like you
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          Suggested Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((user) => {
          const requestSent = sentRequests.has(user.id);
          
          return (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
            >
              <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {user.display_name || 'User'}
                  </p>
                  {user.commonLanguages.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Globe className="h-3 w-3" />
                      <span className="truncate">
                        Also learning {user.commonLanguages.map(l => LANGUAGE_NAMES[l] || l).join(', ')}
                      </span>
                    </div>
                  ) : user.languages_learning && user.languages_learning.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Globe className="h-3 w-3" />
                      <span className="truncate">
                        Learning {user.languages_learning.slice(0, 2).map(l => LANGUAGE_NAMES[l] || l).join(', ')}
                      </span>
                    </div>
                  ) : null}
                </div>
              </Link>

              <Button
                size="sm"
                onClick={() => handleSendRequest(user.id)}
                disabled={sendingRequest === user.id || requestSent}
                className={requestSent 
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
                }
              >
                {sendingRequest === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : requestSent ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Sent
                  </>
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}

        <Link href="/friends">
          <Button variant="ghost" className="w-full text-slate-400 hover:text-white mt-2">
            View all friends →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}


