'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';
import { getRandomAvatarId, getAvatarUrl } from '@/lib/avatars';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signup' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // Sync mode with initialMode when it changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      // Reset form state when modal opens
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShowResetForm(false);
      setResetSent(false);
    }
  }, [isOpen, initialMode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
      } else if (data.user) {
        // Store user info for use in closures
        const userId = data.user.id;
        const userEmail = data.user.email;
        
        // Create profile with random avatar
        try {
          const avatarId = getRandomAvatarId();
          const avatarUrl = getAvatarUrl(avatarId);
          
          const { error: profileError } = await supabase.from('user_profiles').insert({
            id: userId,
            email: userEmail,
            avatar_url: avatarUrl,
          });
          
          const { error: statsError } = await supabase.from('user_stats').insert({
            user_id: userId,
          });

          // Migrate trial cards to user's account
          const trialCardsStr = localStorage.getItem('lockn-trial-cards');
          const trialScenario = localStorage.getItem('lockn-trial-scenario');
          const trialLanguage = localStorage.getItem('lockn-trial-language') || 'Spanish';
          const trialLevel = localStorage.getItem('lockn-trial-level') || 'B1';
          const trialRatingsStr = localStorage.getItem('lockn-trial-ratings');

          if (trialCardsStr && trialScenario) {
            const trialCards = JSON.parse(trialCardsStr);
            const trialRatings = trialRatingsStr ? JSON.parse(trialRatingsStr) : {};

            // Capitalize the first letter of each word in the title
            const capitalizedTitle = trialScenario
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');

            // Create the card stack
            const { data: stack, error: stackError } = await supabase
              .from('card_stacks')
              .insert({
                user_id: userId,
                title: capitalizedTitle,
                target_language: trialLanguage,
                native_language: 'English',
                card_count: trialCards.length,
                cefr_level: trialLevel,
              })
              .select()
              .single();

            if (!stackError && stack) {
              // Create flashcards with ratings
              const flashcards = trialCards.map((card: any, index: number) => ({
                stack_id: stack.id,
                user_id: userId,
                card_order: index,
                target_phrase: card.targetPhrase,
                native_translation: card.nativeTranslation,
                example_sentence: card.exampleSentence,
                tone_advice: card.toneAdvice,
                user_rating: trialRatings[index] || 0,
                mastery_level: trialRatings[index] >= 4 ? trialRatings[index] - 3 : 0,
              }));

              await supabase.from('flashcards').insert(flashcards);
              
              // Clear trial data from localStorage
              localStorage.removeItem('lockn-trial-cards');
              localStorage.removeItem('lockn-trial-scenario');
              localStorage.removeItem('lockn-trial-language');
              localStorage.removeItem('lockn-trial-level');
              localStorage.removeItem('lockn-trial-ratings');
              
              console.log('[AuthModal] Trial data migrated successfully:', stack.id);
            }
          }
        } catch (profileError: any) {
          console.warn('Profile/trial migration error:', profileError);
        }
        
        setLoading(false);
        router.push('/onboarding');
        router.refresh();
      }
    } else {
      // Login
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
      } else if (data.session) {
        setLoading(false);
        onClose();
        router.push('/dashboard');
        router.refresh();
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowResetForm(false);
    setResetSent(false);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-talka-lg overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-0">
            <div className="flex justify-center mb-3 sm:mb-4">
              <Logo size="md" className="sm:w-16 sm:h-16" />
            </div>
            {showResetForm ? (
              <>
                <h2 className="font-display text-2xl font-semibold text-slate-800 mb-2">
                  Reset Password
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Enter your email to receive a reset link
                </p>
              </>
            ) : resetSent ? (
              <>
                <h2 className="font-display text-2xl font-semibold text-slate-800 mb-2">
                  Check Your Email 📧
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  We sent a reset link to <span className="text-talka-purple font-semibold">{email}</span>
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold text-slate-800 mb-2">
                  {mode === 'signup' ? 'Join LOCKN! ✨' : 'Welcome Back! 👋'}
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  {mode === 'signup' ? 'Create your free account to start learning' : 'Sign in to continue your journey'}
                </p>
              </>
            )}
          </div>

          {resetSent ? (
            <Button
              onClick={() => {
                setResetSent(false);
                setShowResetForm(false);
              }}
              className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-4 shadow-purple"
            >
              Back to Sign In
            </Button>
          ) : showResetForm ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-12 py-6 font-medium focus:border-talka-purple focus:ring-0"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm font-medium text-center">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl py-4 shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                className="w-full text-slate-500 text-sm font-medium hover:text-talka-purple transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <>
              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-12 h-14 sm:h-16 text-base font-medium focus:border-talka-purple focus:ring-0"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-12 pr-12 h-14 sm:h-16 text-base font-medium focus:border-talka-purple focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {mode === 'signup' && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-12 h-14 sm:h-16 text-base font-medium focus:border-talka-purple focus:ring-0"
                    />
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm font-medium text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-purple-pink text-white font-bold rounded-2xl min-h-[52px] sm:min-h-[56px] py-3 sm:py-4 shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : (
                    mode === 'signup' ? 'Create Account ✨' : 'Sign In'
                  )}
                </Button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="w-full text-slate-500 text-sm font-medium hover:text-talka-purple transition-colors py-2"
                  >
                    Forgot password?
                  </button>
                )}
              </form>

              {/* Switch Mode */}
              <p className="text-center text-slate-500 text-sm font-medium mt-6">
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => switchMode('login')}
                      className="text-talka-purple font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      className="text-talka-purple font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
