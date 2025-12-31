'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const displayStacks = stacks.map((stack) => ({
    id: stack.id,
    title: stack.title,
    scenario: stack.description || stack.title,
    language: stack.target_language,
    total_cards: stack.card_count,
    mastered_count: stack.mastered_count ?? 0,
    created_at: stack.created_at,
    is_completed: stack.is_completed,
    last_reviewed: stack.updated_at,
    completion_date: stack.completion_date || undefined,
    cefr_level: stack.cefr_level,
    test_progress: stack.test_progress ?? 0,
    test_notes: stack.test_notes ?? [],
    mastery_reached_at: stack.mastery_reached_at || undefined,
    test_deadline: stack.test_deadline || undefined,
    last_test_date: stack.last_test_date || undefined,
  }));

  const calculatePassedCards = (testProgress: number, cardCount: number) => {
    return Math.round((testProgress / 100) * cardCount);
  };

  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const totalPassedCards = stacks.reduce((sum, stack) => {
    return sum + calculatePassedCards(stack.test_progress ?? 0, stack.card_count);
  }, 0);

  const weekStart = getWeekStart();
  const passedThisWeek = stacks.reduce((sum, stack) => {
    if (stack.last_test_date && new Date(stack.last_test_date) >= weekStart) {
      return sum + calculatePassedCards(stack.test_progress ?? 0, stack.card_count);
    }
    return sum;
  }, 0);

  const calculateWeeklyAvg = () => {
    const testedStacks = stacks.filter(s => s.last_test_date);
    if (testedStacks.length === 0) return 0;
    
    const firstTestDate = testedStacks.reduce((earliest, stack) => {
      const testDate = new Date(stack.last_test_date!);
      return testDate < earliest ? testDate : earliest;
    }, new Date());
    
    const weeksSinceFirst = Math.max(1, Math.ceil((Date.now() - firstTestDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    return Math.round(totalPassedCards / weeksSinceFirst);
  };

  const displayStats = stats
    ? {
        total_cards_reviewed: stats.total_reviews,
        current_streak: stats.current_streak,
        longest_streak: stats.longest_streak,
        total_mastered: totalPassedCards,
        current_week_cards: passedThisWeek,
        weekly_average: calculateWeeklyAvg(),
        weekly_cards_history: stats.weekly_cards_history ?? [],
        pause_weekly_tracking: stats.pause_weekly_tracking ?? false,
        daily_cards_learned: stats.daily_cards_learned ?? 0,
        daily_cards_date: stats.daily_cards_date ?? null,
        streak_frozen: stats.streak_frozen ?? false,
        streak_frozen_stacks: stats.streak_frozen_stacks ?? [],
      }
    : null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  return (
    <div className="min-h-screen">
      {/* Tab Navigation */}
      <div className="bg-white shadow-talka-sm sticky top-0 md:top-[76px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-purple-pink text-white shadow-purple'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <DashboardMain stacks={displayStacks} stats={displayStats} userName={userName} />
      )}

      {activeTab === 'profile' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-3xl font-semibold gradient-text mb-8 animate-fade-in">
            ⚙️ Profile Settings
          </h1>
          {profile ? (
            <ProfileSettings profile={profile} onUpdate={onUpdate} />
          ) : (
            <div className="text-center text-slate-400 py-12">Loading profile...</div>
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-3xl font-semibold gradient-text mb-8 animate-fade-in">
            👥 Friends
          </h1>
          <FriendsSection userId={userId} />
        </div>
      )}
    </div>
  );
}
