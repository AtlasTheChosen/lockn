'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  HelpCircle, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  CreditCard,
  Users,
  Sparkles,
  Trophy,
  Volume2,
  Settings,
  Mail,
  MessageSquare
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_CATEGORIES = [
  { id: 'getting-started', name: 'Getting Started', icon: Sparkles },
  { id: 'premium', name: 'Premium & Billing', icon: CreditCard },
  { id: 'learning', name: 'Learning & Features', icon: BookOpen },
  { id: 'social', name: 'Social & Friends', icon: Users },
  { id: 'technical', name: 'Technical Support', icon: Settings },
];

const FAQ_ITEMS: FAQItem[] = [
  // Getting Started
  {
    category: 'getting-started',
    question: 'How do I create my first flashcard stack?',
    answer: 'On the home page, enter any topic or scenario you want to learn (e.g., "ordering coffee in Paris" or "job interview in Spanish"). Select your target language, difficulty level, and card count. Click "Create Magic!" and LockN will generate personalized flashcards for you!'
  },
  {
    category: 'getting-started',
    question: 'Do I need to create an account to use LockN?',
    answer: 'You can try LockN without an account! Guest users can generate 3-card trial stacks. To save your progress, create unlimited stacks, and access all features, sign up for a free account. Premium accounts unlock even more options like 10, 25, and 50-card stacks.'
  },
  {
    category: 'getting-started',
    question: 'What languages does LockN support?',
    answer: 'LockN supports 24 languages including Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese (Mandarin), Arabic, Russian, Hindi, Turkish, English, Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Greek, Hebrew, Thai, Vietnamese, and Indonesian. More languages are being added regularly!'
  },
  {
    category: 'getting-started',
    question: 'What are CEFR levels and which should I choose?',
    answer: 'CEFR (Common European Framework of Reference) levels indicate your proficiency: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper Intermediate), C1 (Advanced), C2 (Proficient). Choose the level that matches your current ability. LockN will generate content appropriate for that level.'
  },
  {
    category: 'getting-started',
    question: 'How does the streak system work?',
    answer: 'Your streak tracks consecutive days of learning. Complete at least one test per day to maintain your streak. The flame icon shows your current streak count. Premium users can freeze their streak if they need to take a day off without losing progress.'
  },
  
  // Premium & Billing
  {
    category: 'premium',
    question: 'What\'s included in Premium?',
    answer: 'Premium unlocks unlimited AI generations, unlimited stacks, larger stack sizes (10, 25, or 50 cards), archive completed stacks, advanced audio playback speeds (0.75x, 1.25x), and priority support. All for just $4.99/month!'
  },
  {
    category: 'premium',
    question: 'How do I upgrade to Premium?',
    answer: 'Click the "Upgrade to Premium" button on your dashboard or in the account settings. You\'ll be redirected to our secure checkout powered by Stripe. We accept all major credit cards, Apple Pay, Google Pay, and more.'
  },
  {
    category: 'premium',
    question: 'Can I cancel my Premium subscription?',
    answer: 'Yes! You can cancel anytime from your Account Settings page. Your Premium access will continue until the end of your current billing period. No questions asked - cancel whenever you want.'
  },
  {
    category: 'premium',
    question: 'What happens to my data if I cancel Premium?',
    answer: 'All your stacks, progress, and data remain accessible. You\'ll revert to the free tier limits (up to 3 stacks total, 5-card stacks only). You can always upgrade again later to regain Premium features.'
  },
  {
    category: 'premium',
    question: 'Do you offer refunds?',
    answer: 'We offer a satisfaction guarantee. If you\'re not happy with Premium within the first 7 days, contact support for a full refund. After that, refunds are handled on a case-by-case basis.'
  },
  
  // Learning & Features
  {
    category: 'learning',
    question: 'How do I study my flashcards?',
    answer: 'Open any stack from your dashboard and click "Start Learning". You\'ll see the target phrase in your chosen language. Try to recall the translation, then reveal the answer. Rate how well you knew it to help LockN optimize your review schedule.'
  },
  {
    category: 'learning',
    question: 'What does "mastering" a card mean?',
    answer: 'A card is mastered when you consistently rate it highly (4-5 stars) during tests. Mastered cards are tracked in your stats. You can always reset a stack to review mastered cards again without affecting your streak.'
  },
  {
    category: 'learning',
    question: 'Can I reset a stack to study it again?',
    answer: 'Yes! After completing a stack, you can reset it to review all cards again. Resetting doesn\'t affect your streak or statistics - it\'s perfect for reviewing material you want to reinforce.'
  },
  {
    category: 'learning',
    question: 'How does the audio pronunciation work?',
    answer: 'Each flashcard includes audio pronunciation using high-quality text-to-speech. Click the speaker icon to hear the phrase. Premium users can adjust playback speed (0.75x for slower, 1.25x for faster).'
  },
  {
    category: 'learning',
    question: 'What are character breakdowns and romanization?',
    answer: 'For non-Latin scripts (Japanese, Chinese, Korean, Arabic, etc.), LockN provides character-by-character breakdowns showing how each symbol sounds, plus romanization (phonetic spelling in Latin letters) to help you learn pronunciation.'
  },
  {
    category: 'learning',
    question: 'Can I archive completed stacks?',
    answer: 'Premium users can archive stacks they\'ve completed. Archived stacks are moved to your Archive Vault, keeping your active dashboard clean while preserving your learning history.'
  },
  {
    category: 'learning',
    question: 'What are script preferences?',
    answer: 'For languages like Japanese, Chinese, and Korean, you can choose script preferences (e.g., Hiragana only, Simplified vs Traditional Chinese, Hangul only). This helps you learn the writing system you need.'
  },
  
  // Social & Friends
  {
    category: 'social',
    question: 'How do I add friends?',
    answer: 'Go to the Social tab on your dashboard. You can search for users by display name, send friend requests, and see friend suggestions. Once connected, you can view each other\'s profiles and compete on leaderboards!'
  },
  {
    category: 'social',
    question: 'What information is visible on my public profile?',
    answer: 'Your public profile shows your display name, languages you\'re learning, current streak, cards learned this week, total cards mastered, best streak, and achievements. Your email is never shown publicly.'
  },
  {
    category: 'social',
    question: 'Can I make my profile private?',
    answer: 'Yes! Go to Profile Settings to control your privacy. Private profiles are only visible to your friends. Public profiles can be viewed by anyone.'
  },
  {
    category: 'social',
    question: 'How do leaderboards work?',
    answer: 'Leaderboards rank users by their current streak, total cards mastered, and weekly progress. You can compete with friends or see global rankings. Climb the ranks by maintaining your streak and mastering more cards!'
  },
  {
    category: 'social',
    question: 'What are achievements and badges?',
    answer: 'Achievements are badges you earn for milestones like maintaining streaks, mastering cards, and completing challenges. View your achievements on your profile tab. They\'re a fun way to track your learning progress!'
  },
  
  // Technical Support
  {
    category: 'technical',
    question: 'The audio isn\'t playing. What should I do?',
    answer: 'Check your device volume and browser permissions. Make sure your browser allows audio playback. Try refreshing the page. If issues persist, try a different browser or device. Premium users can also adjust playback speed which may help.'
  },
  {
    category: 'technical',
    question: 'I\'m not getting the exact number of cards I requested. Why?',
    answer: 'LockN now ensures you get exactly the number of cards you request. If you see fewer cards, the AI may have had trouble generating unique content for that topic. Try a different scenario or contact support if it happens repeatedly.'
  },
  {
    category: 'technical',
    question: 'Can I use LockN on mobile?',
    answer: 'Yes! LockN is fully responsive and works great on mobile devices. The interface adapts to your screen size. You can study flashcards, maintain streaks, and access all features from your phone or tablet.'
  },
  {
    category: 'technical',
    question: 'How do I change my password?',
    answer: 'Go to Account Settings and click "Change Password". Enter your current password and your new password twice. Make sure your new password is strong and secure.'
  },
  {
    category: 'technical',
    question: 'How do I delete my account?',
    answer: 'Go to Account Settings and scroll to the "Danger Zone". Click "Delete Account" and confirm. This permanently deletes all your data including stacks, progress, and profile. This action cannot be undone.'
  },
  {
    category: 'technical',
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login page, click "Forgot password?" and enter your email. You\'ll receive a password reset link. Click the link in the email to set a new password.'
  },
  {
    category: 'technical',
    question: 'How do I change my display name?',
    answer: 'Go to Profile Settings. You can change your display name once every 30 days. This helps prevent abuse while still allowing flexibility. Your display name is shown on your profile and in social features.'
  },
  {
    category: 'technical',
    question: 'Can I export my flashcards?',
    answer: 'Currently, flashcards are stored in your LockN account. Export functionality is being considered for future updates. Your data is always accessible through your dashboard.'
  },
];

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = selectedCategory === 'all' 
    ? FAQ_ITEMS 
    : FAQ_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button 
              variant="ghost" 
              className="mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
              <HelpCircle className="h-6 w-6" style={{ color: 'var(--accent-green)' }} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Help Center
              </h1>
              <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
                Find answers to common questions about LockN
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="rounded-xl"
            style={selectedCategory === 'all' 
              ? { backgroundColor: 'var(--accent-green)', color: 'white' }
              : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
            }
          >
            All Questions
          </Button>
          {FAQ_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="rounded-xl gap-2"
                style={selectedCategory === category.id 
                  ? { backgroundColor: 'var(--accent-green)', color: 'white' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                }
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </Button>
            );
          })}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredItems.map((item, index) => {
            const isExpanded = expandedItems.has(index);
            return (
              <Card
                key={index}
                className="rounded-2xl transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)',
                  boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                }}
              >
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleItem(index)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle 
                      className="text-base sm:text-lg font-semibold pr-8"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.question}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.answer}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Contact Support Section */}
        <Card className="mt-12 rounded-3xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <MessageSquare className="h-6 w-6" style={{ color: 'var(--accent-green)' }} />
              Still Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm sm:text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
              Can't find what you're looking for? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/account" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <Mail className="h-4 w-4" />
                  Send Feedback
                </Button>
              </Link>
              <Button
                variant="default"
                className="flex-1 justify-start gap-2"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white' }}
                onClick={() => {
                  window.location.href = 'mailto:support@lockn.app?subject=LockN Support Request';
                }}
              >
                <Mail className="h-4 w-4" />
                Email Support
              </Button>
            </div>
            <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
              Premium users receive priority support response times
            </p>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard">
            <Card className="rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <CardContent className="p-6 flex items-center gap-4">
                <Sparkles className="h-8 w-8" style={{ color: 'var(--accent-green)' }} />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View your stacks and progress</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/account">
            <Card className="rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <CardContent className="p-6 flex items-center gap-4">
                <Settings className="h-8 w-8" style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Account Settings</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your account</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
