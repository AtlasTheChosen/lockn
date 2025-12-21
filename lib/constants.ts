import { QuickStartScenario } from './types';

export const QUICK_START_SCENARIOS: QuickStartScenario[] = [
  {
    id: 'business-japan',
    title: 'Business Negotiations in Japan',
    description: 'Formal business etiquette and keigo honorifics',
    icon: 'Briefcase',
    category: 'work',
  },
  {
    id: 'paris-mishaps',
    title: 'Travel Mishaps in Paris',
    description: 'Essential phrases for navigating unexpected situations',
    icon: 'Plane',
    category: 'travel',
  },
  {
    id: 'debating-friends',
    title: 'Debating Opinions with Friends',
    description: 'Persuasive language and respectful disagreement',
    icon: 'MessageSquare',
    category: 'social',
  },
  {
    id: 'cultural-festival',
    title: 'Cultural Festival Experience',
    description: 'Traditional customs and celebratory phrases',
    icon: 'Sparkles',
    category: 'travel',
  },
  {
    id: 'tech-support',
    title: 'Tech Support Call',
    description: 'Technical vocabulary and troubleshooting dialogue',
    icon: 'Smartphone',
    category: 'work',
  },
  {
    id: 'workplace-conflict',
    title: 'Workplace Conflict Resolution',
    description: 'Diplomatic language for professional disagreements',
    icon: 'AlertCircle',
    category: 'work',
  },
  {
    id: 'asking-raise',
    title: 'Asking for a Raise',
    description: 'Professional language for salary negotiations',
    icon: 'TrendingUp',
    category: 'work',
  },
  {
    id: 'busy-cafe',
    title: 'Ordering at a Busy Cafe',
    description: 'Quick service interactions with local slang',
    icon: 'Coffee',
    category: 'daily',
  },
  {
    id: 'market-shopping',
    title: 'Shopping at Local Markets',
    description: 'Bargaining phrases and cultural context',
    icon: 'ShoppingCart',
    category: 'travel',
  },
  {
    id: 'doctor-appointment',
    title: 'Doctor Appointment',
    description: 'Medical vocabulary and describing symptoms',
    icon: 'Heart',
    category: 'daily',
  },
  {
    id: 'making-friends',
    title: 'Making Friends in a New City',
    description: 'Authentic casual conversation starters',
    icon: 'Users',
    category: 'social',
  },
  {
    id: 'university-discussion',
    title: 'University Class Discussion',
    description: 'Academic discourse and expressing complex ideas',
    icon: 'BookOpen',
    category: 'work',
  },
];

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
];

export const CEFR_LEVELS = [
  {
    code: 'A1',
    name: 'A1 (Beginner)',
    description: 'Basic phrases, present tense, simple vocabulary'
  },
  {
    code: 'A2',
    name: 'A2 (Elementary)',
    description: 'Simple sentences, basic past tense, everyday expressions'
  },
  {
    code: 'B1',
    name: 'B1 (Intermediate)',
    description: 'Connectors, multiple tenses, handling common situations'
  },
  {
    code: 'B2',
    name: 'B2 (Upper Intermediate)',
    description: 'Complex sentences, nuanced expressions, abstract topics'
  },
  {
    code: 'C1',
    name: 'C1 (Advanced)',
    description: 'Sophisticated language, idioms, implicit meaning'
  },
  {
    code: 'C2',
    name: 'C2 (Proficient)',
    description: 'Native-like fluency, advanced idioms, subtle distinctions'
  },
];

export const STACK_SIZES = [
  { value: 15, label: '10-15 cards', description: 'Quick session' },
  { value: 25, label: '25 cards', description: 'Standard' },
  { value: 50, label: '50 cards', description: 'Deep dive' },
  { value: 75, label: '75 cards', description: 'Comprehensive' },
  { value: 100, label: '100 cards', description: 'Mastery' },
];

export const CARD_RATINGS = {
  REALLY_DONT_KNOW: 1,
  DONT_KNOW: 2,
  NEUTRAL: 3,
  KINDA_KNOW: 4,
  REALLY_KNOW: 5,
} as const;

export const FREE_TIER_LIMITS = {
  MAX_INCOMPLETE_STACKS: 5,
  DAILY_GENERATIONS: 5,
};

export const PREMIUM_PRICING = {
  MONTHLY: {
    amount: 9.99,
    interval: 'month',
  },
  ANNUAL: {
    amount: 99.99,
    interval: 'year',
  },
};
