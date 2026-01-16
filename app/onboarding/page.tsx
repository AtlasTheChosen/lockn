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
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Card className="w-full max-w-md border-0 rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
          <CardHeader className="text-center pt-8">
            <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #58cc02, #1cb0f6)', boxShadow: '0 4px 12px rgba(88, 204, 2, 0.3)' }}>
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Welcome, {savedDisplayName}! 🎉</CardTitle>
            <CardDescription className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Would you like a quick tour of how the app works?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-8">
            <Button
              onClick={() => handleTutorialChoice(true)}
              className="w-full text-white font-bold py-6 text-lg rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-1"
              style={{ backgroundColor: '#58cc02', boxShadow: '0 4px 0 #46a302' }}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Show me around
            </Button>
            <Button
              onClick={() => handleTutorialChoice(false)}
              variant="ghost"
              className="w-full py-6 text-lg rounded-2xl font-semibold"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
            >
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-0 rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
          <CardHeader className="text-center pt-8">
            <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #1cb0f6, #58cc02)', boxShadow: '0 4px 12px rgba(28, 176, 246, 0.3)' }}>
              <User className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Choose Your Display Name</CardTitle>
            <CardDescription className="font-medium" style={{ color: 'var(--text-secondary)' }}>
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
                  className="text-lg py-6 rounded-2xl pr-12"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {checking && <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} />}
                  {!checking && isAvailable === true && displayName.length >= 3 && (
                    <Check className="h-5 w-5" style={{ color: '#58cc02' }} />
                  )}
                  {!checking && isAvailable === false && displayName.length >= 3 && (
                    <AlertCircle className="h-5 w-5" style={{ color: '#ff4b4b' }} />
                  )}
                </div>
              </div>

              <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>
                  {displayName.length > 0 && displayName.length < 3 && 'At least 3 characters required'}
                  {isAvailable === false && displayName.length >= 3 && (
                    <span style={{ color: '#ff4b4b' }}>This name is already taken</span>
                  )}
                </span>
                <span>{displayName.length}/30</span>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-center font-medium"
                  style={{ color: '#ff4b4b' }}
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full text-white font-bold py-6 text-lg rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-1 disabled:opacity-50"
                style={{ backgroundColor: '#58cc02', boxShadow: '0 4px 0 #46a302' }}
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

            <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
              You can change this later in your profile settings (once per month)
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


