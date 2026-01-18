'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';
import { getRandomAvatarId, getAvatarUrl } from '@/lib/avatars';

// Password strength calculation
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'var(--accent-red)' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'var(--accent-orange)' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'var(--accent-blue)' };
  return { score: 4, label: 'Strong', color: 'var(--accent-green)' };
}

// Shake animation for form errors
const shakeAnimation: Variants = {
  shake: {
    x: [0, -10, 10, -8, 8, -5, 5, -2, 2, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signup' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const supabase = createClient();
  
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

  // Password strength for signup
  const passwordStrength = mode === 'signup' && password.length > 0 ? calculatePasswordStrength(password) : null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
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
          className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-talka-lg overflow-hidden overflow-y-auto"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)',
            maxHeight: 'calc(90vh - 2rem)',
            marginTop: 'auto',
            marginBottom: 'auto'
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl transition-all"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-0">
            <div className="flex justify-center mb-3 sm:mb-4">
              <Logo size="lg" />
            </div>
            {showResetForm ? (
              <>
                <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Reset Password
                </h2>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Enter your email to receive a reset link
                </p>
              </>
            ) : resetSent ? (
              <>
                <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Check Your Email 📧
                </h2>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  We sent a reset link to <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>{email}</span>
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {mode === 'signup' ? 'Join LockN! ✨' : 'Welcome Back! 👋'}
                </h2>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
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
              className="w-full text-white font-bold rounded-2xl py-4"
              style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
            >
              Back to Sign In
            </Button>
          ) : showResetForm ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-2xl pl-12 py-6 font-medium focus:ring-0"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-center" style={{ color: 'var(--accent-red)' }}>{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold rounded-2xl py-4 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                className="w-full text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <>
              {/* Email Form */}
              <motion.form
                ref={formRef}
                onSubmit={handleEmailAuth}
                className="space-y-3 sm:space-y-4"
                variants={shakeAnimation}
                animate={shouldShake ? 'shake' : undefined}
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="rounded-2xl pl-12 h-14 sm:h-16 text-base font-medium focus:ring-0"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="rounded-2xl pl-12 pr-12 h-14 sm:h-16 text-base font-medium focus:ring-0"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator (signup only) */}
                <AnimatePresence>
                  {passwordStrength && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 px-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              className="flex-1 h-full rounded-full"
                              initial={{ scaleX: 0 }}
                              animate={{
                                scaleX: i <= passwordStrength.score ? 1 : 0,
                                backgroundColor: i <= passwordStrength.score ? passwordStrength.color : 'transparent',
                              }}
                              transition={{ duration: 0.2, delay: i * 0.05 }}
                              style={{ originX: 0 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === 'signup' && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="rounded-2xl pl-12 h-14 sm:h-16 text-base font-medium focus:ring-0"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-medium text-center"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-bold rounded-2xl min-h-[52px] sm:min-h-[56px] py-3 sm:py-4 hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98] active:translate-y-1"
                  style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
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
                    className="w-full text-sm font-medium transition-colors py-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Forgot password?
                  </button>
                )}
              </motion.form>

              {/* Switch Mode */}
              <p className="text-center text-sm font-medium mt-6" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => switchMode('login')}
                      className="font-semibold hover:underline"
                      style={{ color: 'var(--accent-green)' }}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      className="font-semibold hover:underline"
                      style={{ color: 'var(--accent-green)' }}
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
