export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  badges?: Badge[];
  languages_learning?: string[];
  profile_public?: boolean;
  theme_preference?: string;
  notification_prefs?: {
    email: boolean;
    push: boolean;
    friend_requests: boolean;
    streak_reminders: boolean;
  };
  is_premium: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  daily_generations_count: number;
  daily_generations_reset_at: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardStack {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_language: string;
  native_language: string;
  card_count: number;
  completed_count: number;
  mastered_count: number;
  is_completed: boolean;
  completion_date: string | null;
  conversational_mode: boolean;
  user_mistakes?: any[];
  cefr_level?: string;
  test_progress: number;
  test_notes: TestNote[];
  last_test_date: string | null;
  // Grace period for pending tests
  mastery_reached_at: string | null;
  test_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestNote {
  cardId: string;
  targetPhrase: string;
  userAnswer: string;
  passed: boolean;
  correction?: string;
  feedback?: string;
  timestamp: string;
}

export interface Flashcard {
  id: string;
  stack_id: string;
  user_id: string;
  card_order: number;
  target_phrase: string;
  native_translation: string;
  example_sentence: string;
  tone_advice: string;
  mastery_level: number;
  ease_factor: number;
  interval_days: number;
  next_review_date: string;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
  user_rating?: number;
}

export interface WeeklyCardEntry {
  week: string; // ISO week format: "2024-W52"
  count: number;
  reset_at: string; // UTC timestamp
}

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_stacks_completed: number;
  total_cards_mastered: number;
  total_reviews: number;
  // Weekly cards tracking
  weekly_cards_history: WeeklyCardEntry[];
  current_week_cards: number;
  current_week_start: string | null;
  pause_weekly_tracking: boolean;
  last_card_learned_at: string | null;
  // Daily streak tracking (10 cards/day requirement)
  daily_cards_learned: number;
  daily_cards_date: string | null;
  // Streak freeze for pending tests
  streak_frozen: boolean;
  streak_frozen_stacks: string[]; // Stack IDs with overdue tests
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  email: string;
  stacks_completed: number;
  rank: number | null;
  updated_at: string;
}

export interface GeneratedCard {
  target_phrase: string;
  native_translation: string;
  example_sentence: string;
  tone_advice: string;
}

export interface QuickStartScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'social' | 'work' | 'travel' | 'daily';
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface FriendProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  is_online?: boolean;
}

// ============================================================
// SOCIAL FEATURES TYPES
// ============================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  category: 'streak' | 'cards' | 'stacks' | 'social' | 'special';
}

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: 
    | 'stack_completed'
    | 'stack_created'
    | 'test_passed'
    | 'streak_milestone'
    | 'cards_milestone'
    | 'challenge_won'
    | 'challenge_started'
    | 'friend_added'
    | 'badge_earned';
  title: string;
  description?: string;
  metadata: Record<string, any>;
  is_public: boolean;
  created_at: string;
  // Joined data
  user_profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  challenge_type: 'weekly_cards' | 'complete_stack' | 'streak_competition' | 'daily_cards';
  title: string;
  description?: string;
  target_value: number;
  challenger_progress: number;
  challenged_progress: number;
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled';
  winner_id?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  challenger_profile?: FriendProfile;
  challenged_profile?: FriendProfile;
}

export interface SharedStack {
  id: string;
  stack_id: string;
  shared_by: string;
  shared_with?: string;
  is_public: boolean;
  copy_count: number;
  created_at: string;
  // Joined data
  stack?: CardStack;
  sharer_profile?: FriendProfile;
}

export interface PublicProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  badges: Badge[];
  languages_learning: string[];
  profile_public: boolean;
  created_at: string;
  // Stats
  current_streak: number;
  total_cards_mastered: number;
  total_stacks_completed: number;
  weekly_average: number;
}
