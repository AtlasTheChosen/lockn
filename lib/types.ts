export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
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
  is_completed: boolean;
  completion_date: string | null;
  conversational_mode: boolean;
  user_mistakes?: any[];
  cefr_level?: string;
  created_at: string;
  updated_at: string;
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

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_stacks_completed: number;
  total_cards_mastered: number;
  total_reviews: number;
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
