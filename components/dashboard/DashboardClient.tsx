'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress-simple';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, LogOut, Crown, Flame, Trophy, BookOpen, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import ThemeSelector from '@/components/dashboard/ThemeSelector';
import StreakTutorial from '@/components/tutorial/StreakTutorial';
import { SUPPORTED_LANGUAGES, QUICK_START_SCENARIOS, FREE_TIER_LIMITS } from '@/lib/constants';
import type { UserProfile, CardStack, UserStats } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
  profile: UserProfile | null;
  stacks: CardStack[];
  stats: UserStats | null;
}

export default function DashboardClient({ user, profile, stacks, stats }: Props) {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStreakTutorial, setShowStreakTutorial] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Auto-show streak tutorial for first-time users
  useEffect(() => {
    if (profile && !profile.has_seen_streak_tutorial) {
      // Delay slightly to let the page render first
      const timer = setTimeout(() => setShowStreakTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const handleTutorialComplete = async () => {
    setShowStreakTutorial(false);
    // Mark as seen in database
    if (user?.id) {
      await supabase
        .from('user_profiles')
        .update({ has_seen_streak_tutorial: true })
        .eq('id', user.id);
    }
  };

  const incompleteStacks = stacks.filter((s) => !s.is_completed);
  // Free users: check total stacks (not just incomplete)
  // Premium users: check incomplete stacks (backward compatibility)
  const canGenerate = profile?.is_premium 
    ? incompleteStacks.length < FREE_TIER_LIMITS.MAX_INCOMPLETE_STACKS
    : stacks.length < FREE_TIER_LIMITS.MAX_TOTAL_STACKS;
  const generationsLeft = profile?.is_premium
    ? Infinity
    : FREE_TIER_LIMITS.DAILY_GENERATIONS - (profile?.daily_generations_count || 0);

  const capitalizeTitle = (title: string) => {
    return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const handleSignOut = () => {
    // Clear auth storage immediately to avoid race conditions
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    // Redirect immediately
    window.location.href = '/';
  };

  const handleGenerate = async () => {
    if (!scenario || !targetLanguage) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, targetLanguage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (data.stackId) {
        router.push(`/stack/${data.stackId}`);
        router.refresh();
      } else {
        setOpen(false);
        setScenario('');
        setTargetLanguage('');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = (scenarioTitle: string) => {
    setScenario(scenarioTitle);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Streak Tutorial */}
      {showStreakTutorial && (
        <StreakTutorial 
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialComplete}
        />
      )}

      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">ScenarioFluent</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeSelector userId={user.id} />
              {!profile?.is_premium && (
                <Link href="/pricing">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-slate-600">{user.email}</p>
          </div>
          {profile?.is_premium && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => setShowStreakTutorial(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Current Streak</CardDescription>
                <HelpCircle className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-2xl">{stats?.current_streak || 0} days</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Stacks Completed</CardDescription>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-2xl">{stats?.total_stacks_completed || 0}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Passed</CardDescription>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-2xl">{stats?.total_cards_mastered || 0}</CardTitle>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Generations Left</CardDescription>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-2xl">
                  {profile?.is_premium ? '∞' : generationsLeft}
                </CardTitle>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Stacks</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canGenerate}>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Stack
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate New Stack</DialogTitle>
                <DialogDescription>
                  Create a personalized flashcard stack for any scenario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scenario">Scenario</Label>
                  <Input
                    id="scenario"
                    placeholder="e.g., First date jitters"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="language">Target Language</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.name}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Stack
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!canGenerate && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <CardTitle className="text-orange-900">Stack Limit Reached</CardTitle>
                  <CardDescription className="text-orange-700">
                    {profile?.is_premium 
                      ? `You can have up to ${FREE_TIER_LIMITS.MAX_INCOMPLETE_STACKS} incomplete stacks. Complete or delete existing stacks.`
                      : `Free users can have up to ${FREE_TIER_LIMITS.MAX_TOTAL_STACKS} stacks total. Delete a stack to create a new one, or upgrade to Premium for unlimited stacks.`
                    }
                  </CardDescription>
                  <Link href="/pricing">
                    <Button size="sm" className="mt-3">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {stacks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Choose a Quick Start scenario to begin learning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {QUICK_START_SCENARIOS.slice(0, 6).map((s) => (
                  <Button
                    key={s.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => handleQuickStart(s.title)}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-slate-500">{s.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stacks.map((stack) => {
              const progress = stack.card_count > 0
                ? (stack.completed_count / stack.card_count) * 100
                : 0;

              return (
                <Link key={stack.id} href={`/stack/${stack.id}`}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={stack.is_completed ? 'default' : 'secondary'}>
                          {stack.target_language}
                        </Badge>
                        {stack.is_completed && (
                          <Badge className="bg-green-500">
                            <Trophy className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{capitalizeTitle(stack.title)}</CardTitle>
                      <CardDescription>
                        {stack.completed_count} / {stack.card_count} cards mastered
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Progress value={progress} className="h-2" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
