export type FriendRequestPrivacy = 'everyone' | 'friends_of_friends' | 'nobody';

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  display_name_changed_at?: string;
  avatar_url?: string;
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
  friend_request_privacy?: FriendRequestPrivacy;
  has_seen_streak_tutorial?: boolean;
  is_premium: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  subscription_cancel_at?: string | null;
  billing_interval?: 'monthly' | 'annual' | null;
  daily_generations_count: number;
  daily_generations_reset_at: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export type StackStatus = 'in_progress' | 'pending_test' | 'completed';

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
  // Streak system v2 fields
  status: StackStatus;
  cards_mastered: number;
  contributed_to_streak: boolean;
  // Script/alphabet preference for non-Latin languages
  script_preference?: string; // e.g., 'hiragana', 'simplified', 'hangul'
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

// Character-by-character breakdown for non-Latin scripts
export interface CharacterBreakdown {
  character: string;      // Single character (e.g., "П", "こ", "你")
  romanization: string;   // Pronunciation in Latin letters (e.g., "P", "ko", "nǐ")
  name?: string;          // Optional character name (e.g., "Pe" for Cyrillic П)
}

export interface GrammarBreakdown {
  wordBreakdown: Array<{
    word: string;
    meaning: string;
    grammar: string;
  }>;
  grammarPattern: string;
  patternExamples: string[];
  cognateHint: string;
  commonMistake: string;
  memoryTrick: string;
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
  romanization?: string; // Phonetic pronunciation in Latin letters (romaji, pinyin, etc.)
  character_breakdown?: CharacterBreakdown[]; // Character-by-character pronunciation for non-Latin scripts
  mastery_level: number;
  ease_factor: number;
  interval_days: number;
  next_review_date: string;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
  user_rating?: number;
  audio_url?: string; // Cached TTS audio URL from Supabase Storage
  audio_hash?: string; // Hash for audio cache lookup
  grammar_breakdown?: GrammarBreakdown; // Cached AI grammar analysis
  contributed_to_streak_date?: string | null; // Date when this card contributed to daily streak
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
  // Weekly cards tracking (simple counter, resets Sunday)
  current_week_cards: number;
  current_week_start: string | null;
  last_card_learned_at: string | null;
  // Streak system v2 fields (5 cards/day requirement)
  timezone: string;
  cards_mastered_today: number;
  last_mastery_date: string | null;
  streak_deadline: string | null;
  display_deadline: string | null;
  streak_countdown_starts: string | null; // When cards become locked (midnight of day streak was earned)
  streak_awarded_today: boolean; // Whether today's streak has been earned (for revert tracking)
  // Streak freeze for pending tests
  streak_frozen: boolean;
  streak_frozen_stacks: string[]; // Stack IDs with overdue tests
  // Achievement tracking stats
  tests_completed: number;
  perfect_test_streak: number;
  daily_goal_streak: number;
  ice_breaker_count: number;
  // Friend request rate limiting
  friend_requests_sent_today: number;
  friend_request_reset_date: string | null;
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
  romanization?: string; // Phonetic pronunciation for non-Latin languages
  character_breakdown?: CharacterBreakdown[]; // Character-by-character pronunciation
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
  display_name?: string;
  avatar_url?: string;
  is_online?: boolean;
  languages_learning?: string[];
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
  category: 'streak' | 'cards' | 'stacks' | 'social' | 'special' | 'recovery' | 'performance';
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

// ============================================================
// STREAK SYSTEM V2 TYPES
// ============================================================

export type TestStatus = 'pending' | 'passed' | 'failed';

export interface StackTest {
  id: string;
  user_id: string;
  stack_id: string;
  stack_size: number;
  all_cards_mastered_at: string;
  test_deadline: string;
  display_deadline: string;
  test_status: TestStatus;
  has_frozen_streak: boolean;
  can_unfreeze_streak: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StreakDeadlines {
  displayDeadline: Date;  // 11:59pm tomorrow in user's timezone
  actualDeadline: Date;   // +2 hours grace period
}

export interface StreakCheckResult {
  expired: boolean;
  longestPreserved?: number;
}

export interface CardMasteryResult {
  cardsMasteredToday: number;
  streakIncremented: boolean;
  testTriggered: boolean;
  stacksLocked: string[];
}

export interface PublicProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  badges: Badge[];
  languages_learning: string[];
  profile_public: boolean;
  created_at: string;
  // Stats
  current_streak: number;
  longest_streak?: number;
  total_cards_mastered: number;
  total_stacks_completed: number;
  current_week_cards: number;
}
