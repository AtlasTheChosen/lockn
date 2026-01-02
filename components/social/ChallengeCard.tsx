'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Zap,
  Trophy,
  Flame,
  BookOpen,
  Calendar,
  Check,
  X,
  Loader2,
  Crown,
  Swords,
} from 'lucide-react';
import type { Challenge, FriendProfile } from '@/lib/types';

// Challenge type icons and labels
const challengeTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; unit: string }> = {
  weekly_cards: { icon: BookOpen, label: 'Weekly Cards', unit: 'cards' },
  daily_cards: { icon: Calendar, label: 'Daily Cards', unit: 'cards' },
  complete_stack: { icon: Trophy, label: 'Complete Stack', unit: 'stacks' },
  streak_competition: { icon: Flame, label: 'Streak Battle', unit: 'days' },
};

// Status colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  declined: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface Props {
  challenge: Challenge;
  currentUserId: string;
  onUpdate: () => void;
}

export default function ChallengeCard({ challenge, currentUserId, onUpdate }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const supabase = createClient();

  const isChallenger = challenge.challenger_id === currentUserId;
  const isChallenged = challenge.challenged_id === currentUserId;
  
  const myProgress = isChallenger ? challenge.challenger_progress : challenge.challenged_progress;
  const opponentProgress = isChallenger ? challenge.challenged_progress : challenge.challenger_progress;
  
  const myProfile = isChallenger ? challenge.challenger_profile : challenge.challenged_profile;
  const opponentProfile = isChallenger ? challenge.challenged_profile : challenge.challenger_profile;
  
  const typeConfig = challengeTypeConfig[challenge.challenge_type] || challengeTypeConfig.weekly_cards;
  const IconComponent = typeConfig.icon;

  const handleAccept = async () => {
    try {
      setActionLoading('accept');
      const { error } = await supabase
        .from('challenges')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString(),
        })
        .eq('id', challenge.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to accept challenge:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading('decline');
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'declined' })
        .eq('id', challenge.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to decline challenge:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading('cancel');
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'cancelled' })
        .eq('id', challenge.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Failed to cancel challenge:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (profile?: FriendProfile) => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '?';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not started';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProgressPercent = (progress: number) => {
    if (challenge.target_value === 0) return 0;
    return Math.min(100, (progress / challenge.target_value) * 100);
  };

  const isWinner = challenge.winner_id === currentUserId;
  const isLoser = challenge.status === 'completed' && challenge.winner_id && challenge.winner_id !== currentUserId;

  return (
    <Card className={`bg-slate-800/50 border-slate-700 overflow-hidden ${
      challenge.status === 'active' ? 'ring-1 ring-green-500/30' : ''
    }`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{challenge.title}</h3>
                <p className="text-xs text-slate-400">{typeConfig.label} • Target: {challenge.target_value} {typeConfig.unit}</p>
              </div>
            </div>
            <Badge className={statusColors[challenge.status]}>
              {challenge.status === 'active' && <Swords className="h-3 w-3 mr-1" />}
              {challenge.status === 'completed' && isWinner && <Crown className="h-3 w-3 mr-1" />}
              {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
            </Badge>
          </div>
          
          {challenge.description && (
            <p className="text-sm text-slate-400 mt-2">{challenge.description}</p>
          )}
        </div>

        {/* Progress Section - Only for active/completed challenges */}
        {(challenge.status === 'active' || challenge.status === 'completed') && (
          <div className="p-4 space-y-4">
            {/* Your Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={myProfile?.avatar_url} />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs">
                      {getInitials(myProfile)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white">You</span>
                  {isWinner && <Crown className="h-4 w-4 text-yellow-400" />}
                </div>
                <span className="text-sm text-white font-medium">
                  {myProgress} / {challenge.target_value}
                </span>
              </div>
              <Progress 
                value={getProgressPercent(myProgress)} 
                className="h-2 bg-slate-700"
              />
            </div>

            {/* Opponent Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Link href={`/profile/${isChallenger ? challenge.challenged_id : challenge.challenger_id}`}>
                  <div className="flex items-center gap-2 hover:opacity-80">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={opponentProfile?.avatar_url} />
                      <AvatarFallback className="bg-slate-600 text-white text-xs">
                        {getInitials(opponentProfile)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-300">
                      {opponentProfile?.display_name || 'Opponent'}
                    </span>
                    {!isWinner && challenge.status === 'completed' && challenge.winner_id && (
                      <Crown className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                </Link>
                <span className="text-sm text-slate-300 font-medium">
                  {opponentProgress} / {challenge.target_value}
                </span>
              </div>
              <Progress 
                value={getProgressPercent(opponentProgress)} 
                className="h-2 bg-slate-700"
              />
            </div>
          </div>
        )}

        {/* Pending Challenge - Show opponent info */}
        {challenge.status === 'pending' && (
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isChallenger ? (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={opponentProfile?.avatar_url} />
                      <AvatarFallback className="bg-slate-600 text-white">
                        {getInitials(opponentProfile)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        Waiting for {opponentProfile?.display_name || 'opponent'}
                      </p>
                      <p className="text-xs text-slate-400">Challenge sent</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={opponentProfile?.avatar_url} />
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {getInitials(opponentProfile)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        {opponentProfile?.display_name || 'Someone'} challenged you!
                      </p>
                      <p className="text-xs text-slate-400">
                        Goal: {challenge.target_value} {typeConfig.unit}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Date info */}
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500">
            {challenge.status === 'active' && challenge.start_date && (
              <>Started: {formatDate(challenge.start_date)}</>
            )}
            {challenge.status === 'pending' && (
              <>Created: {formatDate(challenge.created_at)}</>
            )}
            {challenge.status === 'completed' && challenge.end_date && (
              <>Ended: {formatDate(challenge.end_date)}</>
            )}
          </p>
        </div>

        {/* Actions */}
        {challenge.status === 'pending' && (
          <div className="p-4 pt-2 border-t border-slate-700/50">
            {isChallenged ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleAccept}
                  disabled={actionLoading !== null}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {actionLoading === 'accept' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={actionLoading !== null}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"
                >
                  {actionLoading === 'decline' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleCancel}
                disabled={actionLoading !== null}
                variant="outline"
                className="w-full border-slate-600 text-slate-400 hover:bg-slate-700"
              >
                {actionLoading === 'cancel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Cancel Challenge'
                )}
              </Button>
            )}
          </div>
        )}

        {/* Winner banner */}
        {challenge.status === 'completed' && challenge.winner_id && (
          <div className={`p-3 text-center ${isWinner ? 'bg-yellow-500/20' : 'bg-slate-700/50'}`}>
            {isWinner ? (
              <p className="text-yellow-400 font-medium flex items-center justify-center gap-2">
                <Crown className="h-4 w-4" />
                You won this challenge!
              </p>
            ) : (
              <p className="text-slate-400">
                {opponentProfile?.display_name || 'Your opponent'} won this challenge
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}






