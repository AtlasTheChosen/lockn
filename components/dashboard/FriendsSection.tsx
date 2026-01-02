'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  TrendingUp,
  Calendar,
  Target,
} from 'lucide-react';
import type { Friendship, FriendProfile } from '@/lib/types';
import { calculateWeeklyAverage } from '@/lib/weekly-stats';

interface Props {
  userId: string;
}

interface FriendStats {
  current_week_cards: number;
  weekly_average: number;
  total_stacks_completed: number;
  current_week_stacks: number;
  weekly_stacks_average: number;
}

interface FriendWithProfile extends Friendship {
  profile?: FriendProfile;
  stats?: FriendStats;
}

// Native fetch helpers
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

async function supaFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers,
      ...options,
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function supaInsert(table: string, data: any): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Insert failed');
  return response.json();
}

async function supaUpdate(table: string, query: string, data: any): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Update failed');
}

async function supaDelete(table: string, query: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Delete failed');
}

export default function FriendsSection({ userId }: Props) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<FriendWithProfile[]>([]);
  const [searchDisplayName, setSearchDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'blocked'>('friends');

  useEffect(() => {
    loadFriends();
  }, [userId]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const friendshipsData = await supaFetch<any[]>(
        `friendships?or=(user_id.eq.${userId},friend_id.eq.${userId})&select=*`
      );

      if (!friendshipsData || friendshipsData.length === 0) {
        setFriends([]);
        setPendingRequests([]);
        setSentRequests([]);
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      const userIds = new Set<string>();
      friendshipsData.forEach((f) => {
        userIds.add(f.user_id === userId ? f.friend_id : f.user_id);
      });

      if (userIds.size === 0) {
        setFriends([]);
        setPendingRequests([]);
        setSentRequests([]);
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      const profilesData = await supaFetch<any[]>(
        `user_profiles?id=in.(${Array.from(userIds).join(',')})&select=id,display_name,avatar_url`
      );

      const statsData = await supaFetch<any[]>(
        `user_stats?user_id=in.(${Array.from(userIds).join(',')})&select=user_id,current_week_cards,weekly_cards_history,total_stacks_completed`
      );

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
      const statsMap = new Map(statsData?.map((s) => [s.user_id, s]) || []);

      const accepted: FriendWithProfile[] = [];
      const incoming: FriendWithProfile[] = [];
      const outgoing: FriendWithProfile[] = [];
      const blocked: FriendWithProfile[] = [];
      
      const acceptedFriendIds = new Set<string>();
      friendshipsData.forEach((friendship) => {
        if (friendship.status === 'accepted') {
          const friendId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
          acceptedFriendIds.add(friendId);
        }
      });

      friendshipsData.forEach((friendship) => {
        const friendId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
        const friendStats = statsMap.get(friendId);
        const weeklyHistory = friendStats?.weekly_cards_history || [];
        
        const withProfile: FriendWithProfile = {
          ...friendship,
          profile: profileMap.get(friendId),
          stats: {
            current_week_cards: friendStats?.current_week_cards || 0,
            weekly_average: calculateWeeklyAverage(weeklyHistory),
            total_stacks_completed: friendStats?.total_stacks_completed || 0,
            current_week_stacks: 0,
            weekly_stacks_average: 0,
          },
        };

        if (friendship.status === 'accepted') {
          accepted.push(withProfile);
        } else if (friendship.status === 'pending') {
          if (acceptedFriendIds.has(friendId)) return;
          
          if (friendship.friend_id === userId) {
            incoming.push(withProfile);
          } else if (friendship.user_id === userId) {
            outgoing.push(withProfile);
          }
        } else if (friendship.status === 'blocked') {
          blocked.push(withProfile);
        }
      });

      setFriends(accepted);
      setPendingRequests(incoming);
      setSentRequests(outgoing);
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Error loading friends:', error);
      setMessage({ type: 'error', text: 'Failed to load friends' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      setActionLoading('send');
      setMessage(null);

      if (!searchDisplayName) {
        setMessage({ type: 'error', text: 'Please enter a display name' });
        return;
      }

      const profiles = await supaFetch<any[]>(
        `user_profiles?display_name=ilike.${encodeURIComponent(searchDisplayName)}&select=id,display_name`
      );
      
      const targetProfile = profiles?.[0];

      if (!targetProfile) {
        setMessage({ type: 'error', text: 'User not found. Make sure you enter their exact display name.' });
        return;
      }

      if (targetProfile.id === userId) {
        setMessage({ type: 'error', text: 'You cannot add yourself as a friend' });
        return;
      }

      const existing = await supaFetch<any[]>(
        `friendships?or=(and(user_id.eq.${userId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userId}))&select=*`
      );

      if (existing && existing.length > 0) {
        const record = existing[0];
        if (record.status === 'pending' && record.user_id === targetProfile.id && record.friend_id === userId) {
          await supaUpdate('friendships', `id=eq.${record.id}`, { status: 'accepted' });
          setMessage({ type: 'success', text: `You are now friends with ${targetProfile.display_name}!` });
          setSearchDisplayName('');
          loadFriends();
          return;
        }
        
        if (record.status === 'accepted') {
          setMessage({ type: 'error', text: `You are already friends with ${targetProfile.display_name}` });
        } else if (record.status === 'pending') {
          setMessage({ type: 'error', text: `Friend request already sent to ${targetProfile.display_name}` });
        } else if (record.status === 'blocked') {
          setMessage({ type: 'error', text: 'Cannot send friend request to this user' });
        }
        return;
      }

      await supaInsert('friendships', {
        user_id: userId,
        friend_id: targetProfile.id,
        status: 'pending',
      });

      setMessage({ type: 'success', text: `Friend request sent to ${targetProfile.display_name}!` });
      setSearchDisplayName('');
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
      
      const friendships = await supaFetch<any[]>(
        `friendships?id=eq.${friendshipId}&select=user_id,friend_id`
      );
      
      const friendship = friendships?.[0];
      if (!friendship) throw new Error('Friendship not found');
      
      await supaUpdate('friendships', `id=eq.${friendshipId}`, { status: 'accepted' });
      
      // Clean up reverse pending
      try {
        await supaDelete('friendships', 
          `user_id=eq.${friendship.friend_id}&friend_id=eq.${friendship.user_id}&status=eq.pending`
        );
      } catch {}

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
      await supaDelete('friendships', `id=eq.${friendshipId}`);
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
      await supaDelete('friendships', `id=eq.${friendshipId}`);
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
      await supaUpdate('friendships', `id=eq.${friendshipId}`, { status: 'blocked' });
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
      await supaDelete('friendships', `id=eq.${friendshipId}`);
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
    return 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-talka-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Add Friend Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-talka-md animate-fade-in">
        <h3 className="font-display text-lg sm:text-xl font-semibold mb-1 sm:mb-2 flex items-center gap-2">
          ✨ Add Friend
        </h3>
        <p className="text-slate-500 text-sm font-medium mb-4 sm:mb-6">
          Search for users by display name
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={searchDisplayName}
              onChange={(e) => setSearchDisplayName(e.target.value)}
              placeholder="Enter display name..."
              className="bg-slate-50 border-2 border-slate-200 rounded-2xl pl-12 h-14 font-medium focus:border-talka-purple focus:ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
          </div>
          <Button
            onClick={handleSendRequest}
            disabled={actionLoading === 'send'}
            className="w-full sm:w-auto bg-gradient-purple-pink text-white font-bold rounded-2xl px-6 min-h-[52px] sm:min-h-0 shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98]"
          >
            {actionLoading === 'send' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Send Request'
            )}
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border-2 border-green-200'
              : 'bg-red-50 text-red-700 border-2 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-2xl sm:rounded-[20px] shadow-talka-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 min-w-[80px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95 ${
            activeTab === 'friends'
              ? 'bg-gradient-purple-pink text-white shadow-purple'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Friends</span> ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 min-w-[80px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95 ${
            activeTab === 'requests'
              ? 'bg-gradient-purple-pink text-white shadow-purple'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          📬 <span className="hidden sm:inline">Requests</span> ({pendingRequests.length + sentRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`flex-1 min-w-[80px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95 ${
            activeTab === 'blocked'
              ? 'bg-gradient-purple-pink text-white shadow-purple'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          🚫 <span className="hidden sm:inline">Blocked</span> ({blockedUsers.length})
        </button>
      </div>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <div className="space-y-4 animate-fade-in">
          {friends.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-talka-sm">
              <div className="text-6xl mb-4 opacity-50">👥</div>
              <h3 className="font-display text-xl font-semibold text-slate-700 mb-2">No friends yet. Start by adding some!</h3>
              <p className="text-slate-500">Search for users above to send friend requests</p>
            </div>
          ) : (
            friends.map((friendship) => (
              <div key={friendship.id} className="bg-white rounded-3xl p-6 shadow-talka-sm hover:shadow-talka-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {friendship.profile?.avatar_url ? (
                      <img 
                        src={friendship.profile.avatar_url} 
                        alt={friendship.profile?.display_name || 'User'} 
                        className="w-14 h-14 rounded-full object-cover shadow-blue"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-cyan-blue flex items-center justify-center font-bold text-lg text-white shadow-blue">
                        {getInitials(friendship.profile)}
                      </div>
                    )}
                    <div>
                      <p className="font-display text-lg font-semibold text-slate-800">
                        {friendship.profile?.display_name || 'User'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBlockUser(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFriend(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {/* Friend Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-indigo-500 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-semibold">Avg Passed</span>
                    </div>
                    <p className="font-display text-xl font-semibold text-slate-800">{friendship.stats?.weekly_average || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-cyan-500 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-semibold">Passed/Week</span>
                    </div>
                    <p className="font-display text-xl font-semibold text-slate-800">{friendship.stats?.current_week_cards || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-xs font-semibold">Stacks</span>
                    </div>
                    <p className="font-display text-xl font-semibold text-slate-800">{friendship.stats?.total_stacks_completed || 0}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests List */}
      {activeTab === 'requests' && (
        <div className="space-y-6 animate-fade-in">
          {/* Incoming Requests */}
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              📥 Incoming Requests ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center shadow-talka-sm border-2 border-slate-100">
                <p className="text-slate-500 text-sm">No incoming friend requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((friendship) => (
                  <div key={friendship.id} className="bg-white rounded-2xl p-5 shadow-talka-sm flex items-center justify-between border-2 border-green-100">
                    <div className="flex items-center gap-4">
                      {friendship.profile?.avatar_url ? (
                        <img 
                          src={friendship.profile.avatar_url} 
                          alt={friendship.profile?.display_name || 'User'} 
                          className="w-12 h-12 rounded-full object-cover shadow-blue"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-cyan-blue flex items-center justify-center font-bold text-white shadow-blue">
                          {getInitials(friendship.profile)}
                        </div>
                      )}
                      <div>
                        <p className="font-display font-semibold text-slate-800">
                          {friendship.profile?.display_name || 'User'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(friendship.id)}
                        disabled={actionLoading === friendship.id}
                        className="bg-gradient-green-cyan text-white font-bold rounded-xl shadow-green"
                      >
                        {actionLoading === friendship.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeclineRequest(friendship.id)}
                        disabled={actionLoading === friendship.id}
                        className="rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        {actionLoading === friendship.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              📤 Sent Requests ({sentRequests.length})
            </h3>
            {sentRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center shadow-talka-sm border-2 border-slate-100">
                <p className="text-slate-500 text-sm">No pending sent requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((friendship) => (
                  <div key={friendship.id} className="bg-white rounded-2xl p-5 shadow-talka-sm flex items-center justify-between border-2 border-amber-100">
                    <div className="flex items-center gap-4">
                      {friendship.profile?.avatar_url ? (
                        <img 
                          src={friendship.profile.avatar_url} 
                          alt={friendship.profile?.display_name || 'User'} 
                          className="w-12 h-12 rounded-full object-cover shadow-purple"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-purple-pink flex items-center justify-center font-bold text-white shadow-purple">
                          {getInitials(friendship.profile)}
                        </div>
                      )}
                      <div>
                        <p className="font-display font-semibold text-slate-800">
                          {friendship.profile?.display_name || 'User'}
                        </p>
                        <p className="text-xs text-amber-600 font-medium">Awaiting response...</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeclineRequest(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 font-semibold"
                    >
                      {actionLoading === friendship.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Cancel</>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blocked List */}
      {activeTab === 'blocked' && (
        <div className="space-y-4 animate-fade-in">
          {blockedUsers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-talka-sm">
              <div className="text-6xl mb-4 opacity-50">🚫</div>
              <h3 className="font-display text-xl font-semibold text-slate-700 mb-2">No blocked users</h3>
              <p className="text-slate-500">Users you block will appear here</p>
            </div>
          ) : (
            blockedUsers.map((friendship) => (
              <div key={friendship.id} className="bg-white rounded-3xl p-6 shadow-talka-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {friendship.profile?.avatar_url ? (
                    <img 
                      src={friendship.profile.avatar_url} 
                      alt={friendship.profile?.display_name || 'User'} 
                      className="w-14 h-14 rounded-full object-cover grayscale opacity-60"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-300 flex items-center justify-center font-bold text-lg text-white">
                      {getInitials(friendship.profile)}
                    </div>
                  )}
                  <div>
                    <p className="font-display text-lg font-semibold text-slate-800">
                      {friendship.profile?.display_name || 'User'}
                    </p>
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold mt-1">
                      Blocked
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleUnblockUser(friendship.id)}
                  disabled={actionLoading === friendship.id}
                  className="bg-gradient-purple-pink text-white rounded-xl font-semibold shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {actionLoading === friendship.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Unblock'
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
