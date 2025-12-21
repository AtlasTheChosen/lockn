'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  UserMinus,
  Check,
  X,
  Loader2,
  Search,
  Ban,
  Users,
  AlertCircle,
} from 'lucide-react';
import type { Friendship, FriendProfile } from '@/lib/types';

interface Props {
  userId: string;
}

interface FriendWithProfile extends Friendship {
  profile?: FriendProfile;
}

export default function FriendsSection({ userId }: Props) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<FriendWithProfile[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadFriends();
  }, [userId]);

  const loadFriends = async () => {
    try {
      setLoading(true);

      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (!friendshipsData) return;

      const userIds = new Set<string>();
      friendshipsData.forEach((f) => {
        userIds.add(f.user_id === userId ? f.friend_id : f.user_id);
      });

      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const accepted: FriendWithProfile[] = [];
      const pending: FriendWithProfile[] = [];
      const blocked: FriendWithProfile[] = [];

      friendshipsData.forEach((friendship) => {
        const friendId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
        const withProfile = {
          ...friendship,
          profile: profileMap.get(friendId),
        };

        if (friendship.status === 'accepted') {
          accepted.push(withProfile);
        } else if (friendship.status === 'pending' && friendship.friend_id === userId) {
          pending.push(withProfile);
        } else if (friendship.status === 'blocked') {
          blocked.push(withProfile);
        }
      });

      setFriends(accepted);
      setPendingRequests(pending);
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      setActionLoading('send');
      setMessage(null);

      if (!searchEmail) {
        setMessage({ type: 'error', text: 'Please enter an email address' });
        return;
      }

      const { data: targetProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', searchEmail)
        .maybeSingle();

      if (!targetProfile) {
        setMessage({ type: 'error', text: 'User not found' });
        return;
      }

      if (targetProfile.id === userId) {
        setMessage({ type: 'error', text: 'You cannot add yourself as a friend' });
        return;
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userId})`
        )
        .maybeSingle();

      if (existing) {
        setMessage({ type: 'error', text: 'Friendship already exists' });
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: targetProfile.id,
        status: 'pending',
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Friend request sent!' });
      setSearchEmail('');
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Friend request accepted!' });
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Friend request declined' });
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Friend removed' });
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockUser = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'blocked' })
        .eq('id', friendshipId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User blocked' });
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockUser = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User unblocked' });
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (profile?: FriendProfile) => {
    if (profile?.display_name) return profile.display_name.substring(0, 2).toUpperCase();
    if (profile?.email) return profile.email.substring(0, 2).toUpperCase();
    return 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Friend
          </CardTitle>
          <CardDescription className="text-slate-400">
            Search for users by email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="friend@example.com"
                className="bg-slate-900 border-slate-700 text-white pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
              />
            </div>
            <Button
              onClick={handleSendRequest}
              disabled={actionLoading === 'send'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === 'send' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send Request'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="friends" className="data-[state=active]:bg-slate-700">
            <Users className="h-4 w-4 mr-2" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-slate-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="blocked" className="data-[state=active]:bg-slate-700">
            <Ban className="h-4 w-4 mr-2" />
            Blocked ({blockedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4 mt-4">
          {friends.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No friends yet. Start by adding some!</p>
              </CardContent>
            </Card>
          ) : (
            friends.map((friendship) => (
              <Card key={friendship.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friendship.profile?.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {getInitials(friendship.profile)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        {friendship.profile?.display_name || 'User'}
                      </p>
                      <p className="text-sm text-slate-400">{friendship.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBlockUser(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="border-slate-700 hover:bg-slate-700"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFriend(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="border-red-500 text-red-400 hover:bg-red-500/20"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          {pendingRequests.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <UserPlus className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No pending friend requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((friendship) => (
              <Card key={friendship.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friendship.profile?.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {getInitials(friendship.profile)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        {friendship.profile?.display_name || 'User'}
                      </p>
                      <p className="text-sm text-slate-400">{friendship.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineRequest(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="border-red-500 text-red-400 hover:bg-red-500/20"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4 mt-4">
          {blockedUsers.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <Ban className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No blocked users</p>
              </CardContent>
            </Card>
          ) : (
            blockedUsers.map((friendship) => (
              <Card key={friendship.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friendship.profile?.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {getInitials(friendship.profile)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        {friendship.profile?.display_name || 'User'}
                      </p>
                      <p className="text-sm text-slate-400">{friendship.profile?.email}</p>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mt-1">
                        Blocked
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblockUser(friendship.id)}
                    disabled={actionLoading === friendship.id}
                    className="border-slate-700 hover:bg-slate-700"
                  >
                    {actionLoading === friendship.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Unblock'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
