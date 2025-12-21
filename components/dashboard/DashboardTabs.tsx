'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, User, Users } from 'lucide-react';
import DashboardMain from './DashboardMain';
import ProfileSettings from './ProfileSettings';
import FriendsSection from './FriendsSection';
import type { CardStack, UserStats, UserProfile } from '@/lib/types';

interface Props {
  stacks: CardStack[];
  stats: UserStats | null;
  profile: UserProfile | null;
  userId: string;
  userName?: string;
  onUpdate: () => void;
}

export default function DashboardTabs({
  stacks,
  stats,
  profile,
  userId,
  userName,
  onUpdate,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  const displayStacks = stacks.map((stack) => ({
    id: stack.id,
    title: stack.title,
    scenario: stack.description || stack.title,
    language: stack.target_language,
    total_cards: stack.card_count,
    mastered_count: stack.completed_count,
    created_at: stack.created_at,
    is_completed: stack.is_completed,
    last_reviewed: stack.updated_at,
    completion_date: stack.completion_date || undefined,
    cefr_level: stack.cefr_level,
  }));

  const displayStats = stats
    ? {
        total_cards_reviewed: stats.total_reviews,
        current_streak: stats.current_streak,
        longest_streak: stats.longest_streak,
        total_mastered: stats.total_cards_mastered,
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TabsList className="bg-transparent border-0 h-14">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="friends"
                className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Friends</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="m-0">
          <DashboardMain stacks={displayStacks} stats={displayStats} userName={userName} />
        </TabsContent>

        <TabsContent value="profile" className="m-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>
            {profile ? (
              <ProfileSettings profile={profile} onUpdate={onUpdate} />
            ) : (
              <div className="text-center text-slate-400 py-12">Loading profile...</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="friends" className="m-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">Friends</h1>
            <FriendsSection userId={userId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
