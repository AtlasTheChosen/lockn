'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress-simple';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StackCarousel from './StackCarousel';
import { calculateWeightedMastery, getRankInfo } from '@/lib/cefr-ranking';
import {
  Trophy,
  Sparkles,
  Plus,
  Target,
  Flame,
  BookOpen,
  ArrowRight,
  Calendar,
  Award,
  TrendingUp,
  Info
} from 'lucide-react';

interface Stack {
  id: string;
  title: string;
  scenario: string;
  language: string;
  total_cards: number;
  mastered_count: number;
  created_at: string;
  is_completed: boolean;
  last_reviewed?: string;
  completion_date?: string;
  cefr_level?: string;
}

interface Stats {
  total_cards_reviewed: number;
  current_streak: number;
  longest_streak: number;
  total_mastered: number;
}

interface DashboardMainProps {
  stacks: Stack[];
  stats: Stats | null;
  userName?: string;
}

const MOCK_STACKS: Stack[] = [
  {
    id: '1',
    title: 'Ordering at a Restaurant',
    scenario: 'Restaurant conversation',
    language: 'Spanish',
    total_cards: 25,
    mastered_count: 18,
    created_at: '2024-01-15',
    is_completed: false,
    last_reviewed: '2024-01-20',
    cefr_level: 'B1'
  },
  {
    id: '2',
    title: 'Airport Check-in',
    scenario: 'Travel scenario',
    language: 'French',
    total_cards: 30,
    mastered_count: 12,
    created_at: '2024-01-10',
    is_completed: false,
    last_reviewed: '2024-01-18',
    cefr_level: 'B2'
  },
  {
    id: '7',
    title: 'Business Meeting',
    scenario: 'Professional conversation',
    language: 'German',
    total_cards: 28,
    mastered_count: 8,
    created_at: '2024-01-22',
    is_completed: false,
    last_reviewed: '2024-01-23',
    cefr_level: 'C1'
  },
  {
    id: '8',
    title: 'Coffee Shop Order',
    scenario: 'Casual conversation',
    language: 'Italian',
    total_cards: 18,
    mastered_count: 15,
    created_at: '2024-01-21',
    is_completed: false,
    last_reviewed: '2024-01-24',
    cefr_level: 'A2'
  },
  {
    id: '3',
    title: 'Shopping for Groceries',
    scenario: 'Market conversation',
    language: 'Spanish',
    total_cards: 20,
    mastered_count: 20,
    created_at: '2024-01-05',
    is_completed: true,
    completion_date: '2024-01-12',
    cefr_level: 'A2'
  },
  {
    id: '4',
    title: 'Doctor Appointment',
    scenario: 'Medical consultation',
    language: 'German',
    total_cards: 28,
    mastered_count: 25,
    created_at: '2024-01-01',
    is_completed: true,
    completion_date: '2024-01-10',
    cefr_level: 'B2'
  },
  {
    id: '5',
    title: 'Job Interview',
    scenario: 'Professional setting',
    language: 'French',
    total_cards: 35,
    mastered_count: 35,
    created_at: '2023-12-20',
    is_completed: true,
    completion_date: '2024-01-08',
    cefr_level: 'C1'
  },
  {
    id: '6',
    title: 'Booking a Hotel',
    scenario: 'Accommodation',
    language: 'Italian',
    total_cards: 22,
    mastered_count: 20,
    created_at: '2023-12-15',
    is_completed: true,
    completion_date: '2024-01-05',
    cefr_level: 'B1'
  }
];

const MOCK_STATS: Stats = {
  total_cards_reviewed: 156,
  current_streak: 7,
  longest_streak: 14,
  total_mastered: 110
};

export default function DashboardMain({ stacks, stats, userName }: DashboardMainProps) {
  const router = useRouter();
  const [isDebugMode] = useState(stacks.length === 0);

  const displayStacks = isDebugMode ? MOCK_STACKS : stacks;
  const displayStats = isDebugMode ? MOCK_STATS : stats;

  const completedStacks = displayStacks.filter(s => s.is_completed);
  const uncompletedStacks = displayStacks.filter(s => !s.is_completed);

  const weightedMastery = calculateWeightedMastery(completedStacks);
  const rankInfo = getRankInfo(weightedMastery);

  const getProgress = (stack: Stack) => {
    return Math.round((stack.mastered_count / stack.total_cards) * 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {isDebugMode && (
        <div className="bg-yellow-500 text-black px-4 py-2 text-center font-bold text-sm sticky top-0 z-50">
          DEBUG MODE: Showing Mock Data - Auth Disabled
        </div>
      )}

      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <span className="text-xl font-bold text-white">Talka</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={() => router.push('/leaderboard')}
              >
                Leaderboard
              </Button>
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={() => router.push('/')}
              >
                Home
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{userName ? `, ${userName}` : ''}!
          </h1>
          <p className="text-slate-400">Continue your language learning journey</p>
        </div>

        <StackCarousel stacks={uncompletedStacks} />

        <div className="mb-8">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-r ${rankInfo.color}`}></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-slate-300 text-sm font-medium">Your Current Rank</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 border-slate-700">
                      <p className="text-sm">
                        Weighted by stack size and difficulty. Higher CEFR levels (C2, C1) contribute more to your rank than beginner levels (A1, A2).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className={`text-5xl font-bold bg-gradient-to-r ${rankInfo.color} bg-clip-text text-transparent`}>
                      {rankInfo.title}
                    </h2>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-3xl font-semibold text-slate-300">
                      {weightedMastery}%
                    </span>
                    <span className="text-lg text-slate-400">Weighted Mastery</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {rankInfo.description} • {completedStacks.length} completed {completedStacks.length === 1 ? 'stack' : 'stacks'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <BookOpen className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{displayStacks.length}</p>
                  <p className="text-sm text-slate-400">Total Stacks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Trophy className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{completedStacks.length}</p>
                  <p className="text-sm text-slate-400">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Flame className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{displayStats?.current_streak || 0}</p>
                  <p className="text-sm text-slate-400">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Target className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{displayStats?.total_mastered || 0}</p>
                  <p className="text-sm text-slate-400">Cards Mastered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 mb-8">
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate New Stack
          </Button>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => router.push('/leaderboard')}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </Button>
        </div>


        {completedStacks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                Completed Stacks ({completedStacks.length})
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedStacks.map((stack) => {
                const mastery = getProgress(stack);
                return (
                  <Card
                    key={stack.id}
                    className="bg-slate-800 border-slate-700 hover:border-green-500/50 transition-all cursor-pointer group"
                    onClick={() => router.push(`/stack/${stack.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {stack.language}
                        </Badge>
                        <Badge className="bg-green-500 text-white">
                          <Trophy className="h-3 w-3 mr-1" />
                          {mastery}%
                        </Badge>
                      </div>
                      <CardTitle className="text-white text-lg group-hover:text-green-400 transition-colors">
                        {stack.title}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {stack.scenario}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <p className="text-sm text-green-400 font-medium">
                            Completed! {stack.mastered_count}/{stack.total_cards} cards mastered
                          </p>
                        </div>
                        {stack.completion_date && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Calendar className="h-4 w-4" />
                            Completed: {formatDate(stack.completion_date)}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/stack/${stack.id}`);
                          }}
                        >
                          Quick Review
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
