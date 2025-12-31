'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Share2,
  Globe,
  Users,
  Copy,
  Check,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import type { CardStack, FriendProfile } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stack: CardStack;
  userId: string;
  onSuccess?: () => void;
}

export default function StackShareModal({ open, onOpenChange, stack, userId, onSuccess }: Props) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingShare, setExistingShare] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  // Load friends and check existing share when modal opens
  useEffect(() => {
    if (open) {
      loadFriends();
      checkExistingShare();
    }
  }, [open, stack.id]);

  const loadFriends = async () => {
    try {
      setFriendsLoading(true);

      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (friendshipsError) throw friendshipsError;

      if (!friendshipsData || friendshipsData.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = friendshipsData.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, email')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      setFriends(profilesData || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setFriendsLoading(false);
    }
  };

  const checkExistingShare = async () => {
    try {
      const { data } = await supabase
        .from('shared_stacks')
        .select('*')
        .eq('stack_id', stack.id)
        .eq('shared_by', userId)
        .maybeSingle();

      if (data) {
        setExistingShare(data);
        setIsPublic(data.is_public);
      }
    } catch (err) {
      console.warn('Failed to check existing share:', err);
    }
  };

  const handleSharePublic = async () => {
    try {
      setLoading(true);
      setMessage(null);

      if (existingShare) {
        // Update existing share
        const { error } = await supabase
          .from('shared_stacks')
          .update({ is_public: true })
          .eq('id', existingShare.id);

        if (error) throw error;
      } else {
        // Create new public share
        const { error } = await supabase.from('shared_stacks').insert({
          stack_id: stack.id,
          shared_by: userId,
          is_public: true,
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Stack shared publicly!' });
      setIsPublic(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to share stack:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to share stack' });
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithFriend = async () => {
    if (!selectedFriend) {
      setMessage({ type: 'error', text: 'Please select a friend' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      // Check if already shared with this friend
      const { data: existing } = await supabase
        .from('shared_stacks')
        .select('id')
        .eq('stack_id', stack.id)
        .eq('shared_by', userId)
        .eq('shared_with', selectedFriend)
        .maybeSingle();

      if (existing) {
        setMessage({ type: 'error', text: 'Already shared with this friend' });
        return;
      }

      const { error } = await supabase.from('shared_stacks').insert({
        stack_id: stack.id,
        shared_by: userId,
        shared_with: selectedFriend,
        is_public: false,
      });

      if (error) throw error;

      const friend = friends.find(f => f.id === selectedFriend);
      setMessage({ type: 'success', text: `Shared with ${friend?.display_name || 'friend'}!` });
      setSelectedFriend('');
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to share stack:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to share stack' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (!existingShare) return;

    try {
      setLoading(true);
      setMessage(null);

      const { error } = await supabase
        .from('shared_stacks')
        .delete()
        .eq('id', existingShare.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Stack is now private' });
      setIsPublic(false);
      setExistingShare(null);
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to unshare stack:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to unshare' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/library?stack=${stack.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (profile: FriendProfile) => {
    if (profile.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-400" />
            Share Stack
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Share "{stack.title}" with friends or the community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stack Info */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="font-medium text-white">{stack.title}</h4>
            <p className="text-sm text-slate-400">
              {stack.card_count} cards • {stack.target_language}
            </p>
          </div>

          {/* Public Sharing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-green-400" />
                <div>
                  <Label className="text-white">Share Publicly</Label>
                  <p className="text-xs text-slate-400">Anyone can copy this stack</p>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSharePublic();
                  } else if (existingShare?.is_public) {
                    handleUnshare();
                  }
                }}
                disabled={loading}
              />
            </div>

            {isPublic && (
              <Button
                variant="outline"
                onClick={copyLink}
                className="w-full border-slate-600 text-slate-300"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4">
            {/* Share with Friend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <Label className="text-white">Share with a Friend</Label>
              </div>

              {friendsLoading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading friends...
                </div>
              ) : friends.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Add friends to share stacks directly with them.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white flex-1">
                      <SelectValue placeholder="Select a friend" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {friends.map((friend) => (
                        <SelectItem key={friend.id} value={friend.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={friend.avatar_url} />
                              <AvatarFallback className="bg-slate-700 text-white text-xs">
                                {getInitials(friend)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{friend.display_name || friend.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleShareWithFriend}
                    disabled={loading || !selectedFriend}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
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
      </DialogContent>
    </Dialog>
  );
}


