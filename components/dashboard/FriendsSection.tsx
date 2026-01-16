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
  AlertCircle,
  Flame,
  Calendar,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { FriendsListIcon, RequestsIcon, BlockedIcon } from '@/components/ui/GradientIcons';
import type { Friendship, FriendProfile } from '@/lib/types';
// Weekly stats import removed - showing longest_streak, this_week, total now
import { notifyFriendRequest, notifyFriendAccepted } from '@/lib/notifications';

interface Props {
  userId: string;
  accessToken: string;
}

interface FriendStats {
  longest_streak: number;
  current_week_cards: number;
  total_cards_mastered: number;
}

interface FriendWithProfile extends Friendship {
  profile?: FriendProfile;
  stats?: FriendStats;
}

// Native fetch helpers
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getHeaders(token: string) {
  return {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function supaFetch<T>(endpoint: string, token: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: getHeaders(token),
      ...options,
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function supaInsert(table: string, data: any, token: string): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...getHeaders(token), 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Insert failed');
  return response.json();
}

async function supaUpdate(table: string, query: string, data: any, token: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...getHeaders(token), 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Update failed');
}

async function supaDelete(table: string, query: string, token: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error('Delete failed');
}

export default function FriendsSection({ userId, accessToken }: Props) {
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
        `friendships?or=(user_id.eq.${userId},friend_id.eq.${userId})&select=*`,
        accessToken
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
        `user_profiles?id=in.(${Array.from(userIds).join(',')})&select=id,display_name,avatar_url,languages_learning`,
        accessToken
      );

      const statsData = await supaFetch<any[]>(
        `user_stats?user_id=in.(${Array.from(userIds).join(',')})&select=user_id,longest_streak,current_week_cards,total_cards_mastered`,
        accessToken
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
        
        const withProfile: FriendWithProfile = {
          ...friendship,
          profile: profileMap.get(friendId),
          stats: {
            longest_streak: friendStats?.longest_streak || 0,
            current_week_cards: friendStats?.current_week_cards || 0,
            total_cards_mastered: friendStats?.total_cards_mastered || 0,
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

      // Use ilike with wildcard pattern for case-insensitive partial match
      const searchPattern = `*${searchDisplayName.trim()}*`;
      const profiles = await supaFetch<any[]>(
        `user_profiles?display_name=ilike.${encodeURIComponent(searchPattern)}&select=id,display_name`,
        accessToken
      );
      
      const targetProfile = profiles?.[0];

      if (!targetProfile) {
        setMessage({ type: 'error', text: 'User not found. Try searching with a partial name.' });
        return;
      }

      if (targetProfile.id === userId) {
        setMessage({ type: 'error', text: 'You cannot add yourself as a friend' });
        return;
      }

      const existing = await supaFetch<any[]>(
        `friendships?or=(and(user_id.eq.${userId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userId}))&select=*`,
        accessToken
      );

      if (existing && existing.length > 0) {
        const record = existing[0];
        if (record.status === 'pending' && record.user_id === targetProfile.id && record.friend_id === userId) {
          await supaUpdate('friendships', `id=eq.${record.id}`, { status: 'accepted' }, accessToken);
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
      }, accessToken);

      // Get sender's display name for the notification
      const senderProfiles = await supaFetch<any[]>(
        `user_profiles?id=eq.${userId}&select=display_name`,
        accessToken
      );
      const senderDisplayName = senderProfiles?.[0]?.display_name || 'Someone';

      // Notify the recipient about the friend request
      await notifyFriendRequest(targetProfile.id, senderDisplayName, userId, accessToken);

      setMessage({ type: 'success', text: `Friend request sent to ${targetProfile.display_name}!` });
      toast.success(`Friend request sent to ${targetProfile.display_name}!`);
      setSearchDisplayName('');
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      
      const friendships = await supaFetch<any[]>(
        `friendships?id=eq.${friendshipId}&select=user_id,friend_id`,
        accessToken
      );
      
      const friendship = friendships?.[0];
      if (!friendship) throw new Error('Friendship not found');
      
      await supaUpdate('friendships', `id=eq.${friendshipId}`, { status: 'accepted' }, accessToken);
      
      // Clean up reverse pending
      try {
        await supaDelete('friendships', 
          `user_id=eq.${friendship.friend_id}&friend_id=eq.${friendship.user_id}&status=eq.pending`,
          accessToken
        );
      } catch {}

      // Get accepter's display name for the notification
      const accepterProfiles = await supaFetch<any[]>(
        `user_profiles?id=eq.${userId}&select=display_name`,
        accessToken
      );
      const accepterDisplayName = accepterProfiles?.[0]?.display_name || 'Someone';

      // Notify the original requester that their request was accepted
      await notifyFriendAccepted(friendship.user_id, accepterDisplayName, userId, accessToken);

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
      await supaDelete('friendships', `id=eq.${friendshipId}`, accessToken);
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
      await supaDelete('friendships', `id=eq.${friendshipId}`, accessToken);
      setMessage({ type: 'success', text: 'Friend removed' });
      toast.success('Friend removed');
      loadFriends();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockUser = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      await supaUpdate('friendships', `id=eq.${friendshipId}`, { status: 'blocked' }, accessToken);
      setMessage({ type: 'success', text: 'User blocked' });
      toast.success('User blocked');
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
      await supaDelete('friendships', `id=eq.${friendshipId}`, accessToken);
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
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
        <h3 className="font-display text-lg sm:text-xl font-semibold mb-1 sm:mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          ✨ Add Friend
        </h3>
        <p className="text-sm font-medium mb-4 sm:mb-6" style={{ color: 'var(--text-secondary)' }}>
          Search for users by display name
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            <Input
              value={searchDisplayName}
              onChange={(e) => setSearchDisplayName(e.target.value)}
              placeholder="Enter display name..."
              className="rounded-2xl pl-12 h-14 font-medium focus:ring-0"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
          </div>
          <Button
            onClick={handleSendRequest}
            disabled={actionLoading === 'send'}
            className="w-full sm:w-auto text-white font-bold rounded-2xl px-6 min-h-[52px] sm:min-h-0 hover:-translate-y-0.5 transition-all active:scale-[0.98] active:translate-y-1"
            style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
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
          className="flex items-center gap-3 p-4 rounded-2xl animate-fade-in"
          style={message.type === 'success' 
            ? { backgroundColor: 'rgba(88, 204, 2, 0.15)', color: 'var(--accent-green)', border: '2px solid rgba(88, 204, 2, 0.3)' }
            : { backgroundColor: 'rgba(255, 75, 75, 0.15)', color: 'var(--accent-red)', border: '2px solid rgba(255, 75, 75, 0.3)' }
          }
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
          ) : (
            <AlertCircle className="h-5 w-5" style={{ color: 'var(--accent-red)' }} />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl sm:rounded-[20px] overflow-x-auto no-scrollbar" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
        <button
          onClick={() => setActiveTab('friends')}
          className="flex-1 min-w-[80px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95"
          style={activeTab === 'friends'
            ? { backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }
            : { color: 'var(--text-secondary)' }
          }
        >
          <FriendsListIcon 
            size={18} 
            isActive={activeTab === 'friends'}
            gradientStart={activeTab === 'friends' ? '#ffffff' : '#58cc02'}
            gradientEnd={activeTab === 'friends' ? '#ffffff' : '#1cb0f6'}
          />
          <span className="hidden sm:inline">Friends</span> ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className="flex-1 min-w-[80px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95"
          style={activeTab === 'requests'
            ? { backgroundColor: 'var(--accent-blue)', color: 'white', boxShadow: '0 3px 0 #0369a1' }
            : { color: 'var(--text-secondary)' }
          }
        >
          <RequestsIcon 
            size={18} 
            isActive={activeTab === 'requests'}
            gradientStart={activeTab === 'requests' ? '#ffffff' : '#1cb0f6'}
            gradientEnd={activeTab === 'requests' ? '#ffffff' : '#58cc02'}
          />
          <span className="hidden sm:inline">Requests</span> ({pendingRequests.length + sentRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className="flex-1 min-w-[80px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95"
          style={activeTab === 'blocked'
            ? { backgroundColor: 'var(--accent-red)', color: 'white', boxShadow: '0 3px 0 #b91c1c' }
            : { color: 'var(--text-secondary)' }
          }
        >
          <BlockedIcon 
            size={18} 
            isActive={activeTab === 'blocked'}
            gradientStart={activeTab === 'blocked' ? '#ffffff' : '#ff4b4b'}
            gradientEnd={activeTab === 'blocked' ? '#ffffff' : '#ff9600'}
          />
          <span className="hidden sm:inline">Blocked</span> ({blockedUsers.length})
        </button>
      </div>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <div className="space-y-4 animate-fade-in">
          {friends.length === 0 ? (
            <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-6xl mb-4 opacity-50">👥</div>
              <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No friends yet. Start by adding some!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Search for users above to send friend requests</p>
            </div>
          ) : (
            friends.map((friendship) => (
              <div key={friendship.id} className="rounded-3xl p-6 transition-all" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {friendship.profile?.avatar_url ? (
                      <img 
                        src={friendship.profile.avatar_url} 
                        alt={friendship.profile?.display_name || 'User'} 
                        className="w-14 h-14 rounded-full object-cover"
                        style={{ boxShadow: '0 4px 12px rgba(28, 176, 246, 0.3)' }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white" style={{ background: 'linear-gradient(to bottom right, var(--accent-blue), var(--accent-green))' }}>
                        {getInitials(friendship.profile)}
                      </div>
                    )}
                    <div>
                      <p className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {friendship.profile?.display_name || 'User'}
                      </p>
                      {/* Languages Learning */}
                      {friendship.profile?.languages_learning && friendship.profile.languages_learning.length > 0 && (
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          📚 {friendship.profile.languages_learning.map(code => {
                            const langMap: Record<string, string> = {
                              es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇧🇷',
                              ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', ru: '🇷🇺', ar: '🇸🇦',
                              hi: '🇮🇳', nl: '🇳🇱', sv: '🇸🇪', pl: '🇵🇱', tr: '🇹🇷',
                              vi: '🇻🇳', th: '🇹🇭', he: '🇮🇱', el: '🇬🇷', cs: '🇨🇿',
                            };
                            return langMap[code] || '🌍';
                          }).join(' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBlockUser(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="rounded-xl"
                      style={{ color: 'var(--text-muted)' }}
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
                      className="rounded-xl hover:bg-red-500/10"
                      style={{ color: 'var(--text-muted)' }}
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
                <div className="pt-4" style={{ borderTop: '2px solid var(--border-color)' }}>
                  <p className="text-xs font-semibold text-center mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Stats</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--accent-orange)' }}>
                        <Flame className="h-4 w-4" />
                        <span className="text-xs font-semibold">Best</span>
                      </div>
                      <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{friendship.stats?.longest_streak || 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--accent-blue)' }}>
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-semibold">Week</span>
                      </div>
                      <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{friendship.stats?.current_week_cards || 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--accent-green)' }}>
                        <Target className="h-4 w-4" />
                        <span className="text-xs font-semibold">Total</span>
                      </div>
                      <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{friendship.stats?.total_cards_mastered || 0}</p>
                    </div>
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
            <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📥 Incoming Requests ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '2px solid var(--border-color)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No incoming friend requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((friendship) => (
                  <div key={friendship.id} className="rounded-2xl p-5 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '2px solid rgba(88, 204, 2, 0.3)' }}>
                    <div className="flex items-center gap-4">
                      {friendship.profile?.avatar_url ? (
                        <img 
                          src={friendship.profile.avatar_url} 
                          alt={friendship.profile?.display_name || 'User'} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(to bottom right, var(--accent-blue), var(--accent-green))' }}>
                          {getInitials(friendship.profile)}
                        </div>
                      )}
                      <div>
                        <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {friendship.profile?.display_name || 'User'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(friendship.id)}
                        disabled={actionLoading === friendship.id}
                        className="text-white font-bold rounded-xl"
                        style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
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
                        className="rounded-xl hover:bg-red-500/10"
                        style={{ color: 'var(--text-muted)' }}
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
            <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📤 Sent Requests ({sentRequests.length})
            </h3>
            {sentRequests.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '2px solid var(--border-color)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No pending sent requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((friendship) => (
                  <div key={friendship.id} className="rounded-2xl p-5 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '2px solid rgba(251, 146, 60, 0.3)' }}>
                    <div className="flex items-center gap-4">
                      {friendship.profile?.avatar_url ? (
                        <img 
                          src={friendship.profile.avatar_url} 
                          alt={friendship.profile?.display_name || 'User'} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(to bottom right, var(--accent-orange), var(--accent-yellow))' }}>
                          {getInitials(friendship.profile)}
                        </div>
                      )}
                      <div>
                        <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {friendship.profile?.display_name || 'User'}
                        </p>
                        <p className="text-xs font-medium" style={{ color: 'var(--accent-orange)' }}>Awaiting response...</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeclineRequest(friendship.id)}
                      disabled={actionLoading === friendship.id}
                      className="rounded-xl font-semibold hover:bg-red-500/10"
                      style={{ color: 'var(--text-secondary)' }}
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
            <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-6xl mb-4 opacity-50">🚫</div>
              <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No blocked users</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Users you block will appear here</p>
            </div>
          ) : (
            blockedUsers.map((friendship) => (
              <div key={friendship.id} className="rounded-3xl p-6 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-4">
                  {friendship.profile?.avatar_url ? (
                    <img 
                      src={friendship.profile.avatar_url} 
                      alt={friendship.profile?.display_name || 'User'} 
                      className="w-14 h-14 rounded-full object-cover grayscale opacity-60"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white" style={{ backgroundColor: 'var(--text-muted)' }}>
                      {getInitials(friendship.profile)}
                    </div>
                  )}
                  <div>
                    <p className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {friendship.profile?.display_name || 'User'}
                    </p>
                    <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold mt-1" style={{ backgroundColor: 'rgba(255, 75, 75, 0.2)', color: 'var(--accent-red)' }}>
                      Blocked
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleUnblockUser(friendship.id)}
                  disabled={actionLoading === friendship.id}
                  className="text-white rounded-xl font-semibold hover:-translate-y-0.5 transition-all"
                  style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
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
