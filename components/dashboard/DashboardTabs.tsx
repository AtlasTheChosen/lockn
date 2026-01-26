'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardMain from './DashboardMain';
import ProfileView from './ProfileView';
import FriendsSection from './FriendsSection';
import AchievementsSection from './AchievementsSection';
import { OverviewIcon, ProfileIcon, FriendsIcon, TrophyIcon } from '@/components/ui/GradientIcons';
import type { CardStack, UserStats, UserProfile } from '@/lib/types';

interface Props {
  stacks: CardStack[];
  stats: UserStats | null;
  profile: UserProfile | null;
  userId: string;
  userName?: string;
  accessToken: string;
  onUpdate: () => void;
  onShowTutorial?: () => void;
}

export default function DashboardTabs({
  stacks,
  stats,
  profile,
  userId,
  userName,
  accessToken,
  onUpdate,
  onShowTutorial,
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
    // Streak system v2 fields
    status: stack.status,
    contributed_to_streak: stack.contributed_to_streak ?? false,
  }));

  // Compute total mastered from actual stacks (more reliable than counter)
  const computedTotalMastered = stacks.reduce((sum, stack) => sum + (stack.mastered_count ?? 0), 0);

  // Use database values directly for accurate stats
  const displayStats = stats
    ? {
        total_cards_reviewed: stats.total_reviews ?? 0,
        current_streak: stats.current_streak ?? 0,
        longest_streak: stats.longest_streak ?? 0,
        // Use computed value from stacks instead of counter (always accurate)
        total_mastered: computedTotalMastered,
        current_week_cards: stats.current_week_cards ?? 0, // Resets Sunday at midnight
        streak_frozen: stats.streak_frozen ?? false,
        streak_frozen_stacks: stats.streak_frozen_stacks ?? [],
        // Streak system v2 fields (consolidated - removed legacy daily_cards_learned)
        cards_mastered_today: stats.cards_mastered_today ?? 0,
        last_mastery_date: stats.last_mastery_date ?? null,
        display_deadline: stats.display_deadline ?? null,
        streak_deadline: stats.streak_deadline ?? null,
      }
    : null;

  const tabs = [
    { id: 'overview', label: 'Overview', mobileLabel: 'Overview', Icon: OverviewIcon },
    { id: 'profile', label: 'Profile', mobileLabel: 'Profile', Icon: ProfileIcon },
    { id: 'friends', label: 'Friends', mobileLabel: 'Friends', Icon: FriendsIcon },
    { id: 'achievements', label: 'Achievements', mobileLabel: 'Awards', Icon: TrophyIcon },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Tab Navigation - scrolls with page (NOT sticky) */}
      <div 
        className="pt-2 md:pt-3"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="max-w-7xl mx-auto px-[max(0.75rem,env(safe-area-inset-left,0px))] sm:px-4 lg:px-8 pr-[max(0.75rem,env(safe-area-inset-right,0px))]">
          <div className="flex gap-2 sm:gap-2 py-2 sm:py-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const IconComponent = tab.Icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all flex-1 active:scale-95"
                  style={isActive
                    ? { backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }
                    : { color: 'var(--text-secondary)' }
                  }
                >
                  <IconComponent 
                    size={20} 
                    isActive={isActive}
                    gradientStart={isActive ? '#ffffff' : '#58cc02'}
                    gradientEnd={isActive ? '#ffffff' : '#1cb0f6'}
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] sm:text-sm">{tab.mobileLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <DashboardMain 
          stacks={displayStacks} 
          stats={displayStats} 
          userName={userName} 
          isPremium={profile?.is_premium ?? false}
          onUpdate={onUpdate} 
          onShowTutorial={onShowTutorial} 
        />
      )}

      {activeTab === 'profile' && (
        <div>
          {profile && stats ? (
            <ProfileView 
              profile={profile}
              stats={{
                current_streak: stats.current_streak ?? 0,
                total_cards_mastered: stats.total_cards_mastered ?? 0,
                current_week_cards: stats.current_week_cards ?? 0,
                longest_streak: stats.longest_streak ?? 0,
              }}
            />
          ) : (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading profile...</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-3xl font-semibold mb-8 animate-fade-in" style={{ color: 'var(--accent-green)' }}>
            👥 Friends
          </h1>
          <FriendsSection userId={userId} accessToken={accessToken} />
        </div>
      )}

      {activeTab === 'achievements' && (
        <AchievementsSection userId={userId} profile={profile} />
      )}
    </div>
  );
}
