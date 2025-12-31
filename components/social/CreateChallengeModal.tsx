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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Zap,
  BookOpen,
  Flame,
  Calendar,
  Trophy,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { FriendProfile } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

const challengeTypes = [
  {
    id: 'weekly_cards',
    name: 'Weekly Cards',
    description: 'Who can learn the most cards this week',
    icon: BookOpen,
    defaultTarget: 50,
    unit: 'cards',
  },
  {
    id: 'daily_cards',
    name: 'Daily Cards',
    description: 'Race to learn cards in a single day',
    icon: Calendar,
    defaultTarget: 20,
    unit: 'cards',
  },
  {
    id: 'complete_stack',
    name: 'Stack Race',
    description: 'First to complete a full stack',
    icon: Trophy,
    defaultTarget: 1,
    unit: 'stacks',
  },
  {
    id: 'streak_competition',
    name: 'Streak Battle',
    description: 'Compete for the longest streak',
    icon: Flame,
    defaultTarget: 7,
    unit: 'days',
  },
];

export default function CreateChallengeModal({ open, onOpenChange, userId, onSuccess }: Props) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [challengeType, setChallengeType] = useState<string>('weekly_cards');
  const [targetValue, setTargetValue] = useState<number>(50);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  // Load friends when modal opens
  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  // Update default target when challenge type changes
  useEffect(() => {
    const typeConfig = challengeTypes.find(t => t.id === challengeType);
    if (typeConfig) {
      setTargetValue(typeConfig.defaultTarget);
      if (!title) {
        setTitle(`${typeConfig.name} Challenge`);
      }
    }
  }, [challengeType]);

  const loadFriends = async () => {
    try {
      setFriendsLoading(true);

      // Get accepted friendships
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

      // Get friend IDs
      const friendIds = friendshipsData.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      );

      // Fetch profiles
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

  const handleSubmit = async () => {
    if (!selectedFriend) {
      setMessage({ type: 'error', text: 'Please select a friend to challenge' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const { error } = await supabase.from('challenges').insert({
        challenger_id: userId,
        challenged_id: selectedFriend,
        challenge_type: challengeType,
        title: title || `${challengeTypes.find(t => t.id === challengeType)?.name} Challenge`,
        description: description || null,
        target_value: targetValue,
        status: 'pending',
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Challenge sent!' });
      
      // Reset form
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setSelectedFriend('');
        setTitle('');
        setDescription('');
        setMessage(null);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create challenge:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to create challenge' });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (profile: FriendProfile) => {
    if (profile.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  const selectedType = challengeTypes.find(t => t.id === challengeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Create Challenge
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Challenge a friend to a learning competition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Friend */}
          <div className="space-y-2">
            <Label className="text-slate-300">Challenge</Label>
            {friendsLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-slate-400">
                You need to add friends before you can challenge them.
              </p>
            ) : (
              <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
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
            )}
          </div>

          {/* Challenge Type */}
          <div className="space-y-3">
            <Label className="text-slate-300">Challenge Type</Label>
            <RadioGroup value={challengeType} onValueChange={setChallengeType} className="grid grid-cols-2 gap-3">
              {challengeTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      challengeType === type.id
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <RadioGroupItem value={type.id} className="sr-only" />
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-sm">{type.name}</p>
                      <p className="text-xs text-slate-400">{type.description}</p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              Target ({selectedType?.unit || 'units'})
            </Label>
            <Input
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-slate-300">Challenge Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your challenge"
              className="bg-slate-900 border-slate-700 text-white"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-slate-300">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a message to your challenge..."
              className="bg-slate-900 border-slate-700 text-white resize-none"
              rows={2}
              maxLength={200}
            />
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

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedFriend || friends.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Send Challenge
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


