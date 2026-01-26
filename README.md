# ScenarioFluent

**Master real-world conversations, not just vocabulary.**

ScenarioFluent is a full-stack SaaS language learning platform that generates AI-powered, scenario-based flashcard stacks for authentic, real-world language practice. Learn how to flirt, negotiate salaries, handle conflicts, and navigate social situations with slang, Gen-Z lingo, and proper tone guidance.

## Features

### Core Functionality
- **AI-Generated Scenario Stacks**: OpenAI GPT-4o generates 10-15 flashcards per scenario in chronological story format
- **Spaced Repetition System (SRS)**: SM-2 algorithm tracks mastery levels (0-5) and optimizes review intervals
- **Fuzzy Matching Mastery Exam**: Levenshtein distance-based grading forgives minor spelling errors
- **Audio Playback**: Browser TTS with adjustable speed controls (0.75x, 1.0x, 1.25x)
- **12 Quick Start Scenarios**: Pre-made scenarios for dating, work, travel, and daily life

### Gamification
- **Daily Streaks**: Track consecutive days of practice
- **Leaderboards**: Global rankings based on completed stacks
- **Progress Tracking**: Visual progress bars and mastery stats
- **Confetti Celebrations**: Animated rewards for 100% stack completion

### Freemium Business Model
- **Free Tier**:
  - 5 AI generations per day
  - Maximum 5 incomplete stacks
  - Basic audio playback

- **Premium Tier ($9.99/month)**:
  - Unlimited AI generations
  - Unlimited stacks
  - Advanced audio speeds
  - Priority support

### Admin Dashboard
- View platform metrics (total users, premium users, stacks, cards)
- Monitor recent user registrations
- User management capabilities

## Tech Stack

- **Frontend**: Next.js 13 (App Router), React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **AI**: OpenAI GPT-4o
- **Payments**: Stripe (subscriptions + webhooks)
- **Text-to-Speech**: Browser Web Speech API
- **Animations**: tailwindcss-animate, react-confetti

## Project Structure

```
app/
├── api/
│   ├── generate-stack/     # AI flashcard generation endpoint
│   └── stripe/
│       ├── create-checkout/ # Stripe checkout session creation
│       └── webhook/        # Stripe webhook handler
├── auth/
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── admin/                 # Admin dashboard (protected)
├── dashboard/             # User dashboard with stacks
├── leaderboard/          # Global leaderboard
├── pricing/              # Pricing and upgrade page
├── stack/[id]/           # Learning interface for specific stack
└── page.tsx              # Landing page

components/
├── dashboard/
│   └── DashboardClient.tsx   # Dashboard logic
├── stack/
│   └── StackLearningClient.tsx # Learning interface
└── ui/                    # Reusable UI components (shadcn/ui)

lib/
├── supabase/
│   ├── client.ts          # Browser Supabase client
│   └── server.ts          # Server Supabase client
├── actions/
│   └── auth.ts            # Server actions for auth
├── constants.ts           # App constants (scenarios, languages)
├── types.ts               # TypeScript types
├── srs-algorithm.ts       # SM-2 spaced repetition logic
└── fuzzy-match.ts         # Levenshtein distance matching
```

## Database Schema

### Tables
1. **user_profiles**: Extended user data with premium status and subscription info
2. **card_stacks**: Scenario-based collections of flashcards
3. **flashcards**: Individual cards with SRS metadata
4. **user_stats**: Gamification stats (streaks, totals)
5. **generation_logs**: Rate limiting for AI generations
6. **leaderboard_entries**: Cached leaderboard data

All tables have Row Level Security (RLS) enabled with restrictive policies.

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account
- OpenAI API key
- Stripe account (for payments)

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=your_annual_price_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

The Supabase migration has already been applied. The schema includes:
- User profiles with premium status tracking
- Card stacks and flashcards with SRS metadata
- User stats for gamification
- Leaderboards
- Row Level Security policies

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the landing page.

### 6. Build for Production

```bash
npm run build
npm run start
```

## Stripe Integration

### Setting up Stripe

1. Create products and prices in Stripe Dashboard
2. Copy the price IDs to your `.env.local`
3. Set up a webhook endpoint pointing to `/api/stripe/webhook`
4. Copy the webhook secret to your `.env.local`

### Webhook Events Handled
- `checkout.session.completed`: Mark user as premium
- `customer.subscription.updated`: Update subscription status
- `customer.subscription.deleted`: Cancel premium status

## Content Moderation

The AI generation endpoint includes content filtering:
- **ALLOWED**: Flirting, dating, nightlife, workplace conflicts, mature social contexts
- **FORBIDDEN**: Explicit sexual content, graphic violence, hate speech, illegal activities

## Supported Languages

Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese (Mandarin), Arabic, Russian, Hindi, Turkish

## Key Features Detail

### Spaced Repetition (SM-2 Algorithm)

The app implements the SuperMemo SM-2 algorithm:
- Quality ratings: 0-5 (0 = complete blackout, 5 = perfect recall)
- Ease factor: Adjusts based on performance (minimum 1.3)
- Interval calculation: Exponential growth for mastered cards
- Mastery levels: 0-5, with level 4+ considered "mastered"

### Fuzzy Matching

Text input is graded with Levenshtein distance:
- **Exact Match**: Perfect answer
- **Soft Pass**: Within 15% character distance (forgives minor typos, accents, punctuation)
- **Fail**: Requires re-study

### Quick Start Scenarios

Pre-made scenarios include:
- First Date Jitters
- Asking for a Raise
- Ordering at a Busy Cafe
- Meeting Locals at a Bar
- Handling Workplace Conflict
- Airport Emergency
- Making Friends in a New City
- Complaining Politely
- Small Talk at a House Party
- Doctor Appointment
- Negotiating at a Market
- Texting Your Crush

## Mobile-First Design

The entire application is built with a mobile-first approach using Tailwind CSS responsive utilities. All layouts adapt seamlessly from mobile (320px+) to desktop (1920px+).

## Future Enhancements

- React Native mobile app (shared logic ready)
- Grammar deep-dives for premium users
- Community-created scenario sharing
- Voice recording for pronunciation practice
- Multiplayer learning challenges

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact support through the admin dashboard or create an issue in the repository.

---

Built with ❤️ for real-world language learners
