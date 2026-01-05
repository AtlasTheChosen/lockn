'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Check, AlertCircle, User, BookOpen } from 'lucide-react';
import { containsInappropriateContent } from '@/lib/content-filter';
import StreakTutorial from '@/components/tutorial/StreakTutorial';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check if display name is available
  useEffect(() => {
    const checkAvailability = async () => {
      if (displayName.length < 3) {
        setIsAvailable(null);
        return;
      }

      setChecking(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id')
          .ilike('display_name', displayName)
          .maybeSingle();

        if (error) {
          console.error('Error checking name:', error);
          setIsAvailable(null);
        } else {
          setIsAvailable(!data);
        }
      } catch (err) {
        console.error('Error checking name:', err);
        setIsAvailable(null);
      }
      setChecking(false);
    };

    const debounce = setTimeout(checkAvailability, 300);
    return () => clearTimeout(debounce);
  }, [displayName, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate display name
    if (displayName.length < 3) {
      setError('Display name must be at least 3 characters');
      return;
    }

    if (displayName.length > 30) {
      setError('Display name must be 30 characters or less');
      return;
    }

    // Check for inappropriate content
    if (containsInappropriateContent(displayName)) {
      setError('This display name is not allowed. Please choose a different one.');
      return;
    }

    if (!isAvailable) {
      setError('This display name is already taken');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Update profile with display name
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ display_name: displayName })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Show tutorial prompt
      setSavedDisplayName(displayName);
      setShowTutorialPrompt(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Error saving display name:', err);
      setError(err.message || 'Failed to save display name');
      setLoading(false);
    }
  };

  const handleTutorialChoice = async (wantsTutorial: boolean) => {
    // Mark tutorial as seen
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ has_seen_streak_tutorial: !wantsTutorial })
        .eq('id', user.id);
    }

    if (wantsTutorial) {
      setShowTutorialPrompt(false);
      setShowTutorial(true);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleTutorialComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ has_seen_streak_tutorial: true })
        .eq('id', user.id);
    }
    router.push('/dashboard');
    router.refresh();
  };

  // Show tutorial
  if (showTutorial) {
    return (
      <StreakTutorial 
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialComplete}
      />
    );
  }

  // Show tutorial prompt after display name is saved
  if (showTutorialPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
        <Card className="w-full max-w-md bg-white border-0 shadow-talka-lg rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-8">
            <div className="h-20 w-20 rounded-full bg-gradient-purple-pink flex items-center justify-center mx-auto mb-4 shadow-purple">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="font-display text-2xl text-slate-800">Welcome, {savedDisplayName}! 🎉</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Would you like a quick tour of how the app works?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-8">
            <Button
              onClick={() => handleTutorialChoice(true)}
              className="w-full bg-gradient-purple-pink hover:opacity-90 text-white font-bold py-6 text-lg rounded-2xl shadow-purple transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Show me around
            </Button>
            <Button
              onClick={() => handleTutorialChoice(false)}
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 py-6 text-lg rounded-2xl font-semibold"
            >
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Card className="bg-white border-0 shadow-talka-lg rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-8">
            <div className="h-20 w-20 rounded-full bg-gradient-cyan-blue flex items-center justify-center mx-auto mb-4 shadow-blue">
              <User className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="font-display text-2xl text-slate-800">Choose Your Display Name</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              This is how other users will see you
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter display name..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                  className="bg-slate-50 border-2 border-slate-200 text-slate-800 text-lg py-6 rounded-2xl focus:border-talka-purple focus:ring-talka-purple placeholder:text-slate-400 pr-12"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {checking && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                  {!checking && isAvailable === true && displayName.length >= 3 && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {!checking && isAvailable === false && displayName.length >= 3 && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  {displayName.length > 0 && displayName.length < 3 && 'At least 3 characters required'}
                  {isAvailable === false && displayName.length >= 3 && (
                    <span className="text-red-500">This name is already taken</span>
                  )}
                </span>
                <span className="text-slate-400">{displayName.length}/30</span>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center font-medium"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-purple-pink hover:opacity-90 text-white font-bold py-6 text-lg rounded-2xl shadow-purple transition-all hover:-translate-y-0.5 disabled:opacity-50"
                disabled={loading || checking || !isAvailable || displayName.length < 3}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>

            <p className="text-center text-slate-400 text-xs mt-6">
              You can change this later in your profile settings (once per month)
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


