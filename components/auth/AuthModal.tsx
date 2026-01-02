'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

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
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      setLoadingProvider(provider);
      setError('');

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error);
        setError(error.message);
        setLoadingProvider(null);
      }
    } catch (err: any) {
      console.error(`${provider} OAuth error:`, err);
      setError(err.message || `Failed to sign in with ${provider}`);
      setLoadingProvider(null);
    }
  };

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
        // Create profile
        try {
          await supabase.from('user_profiles').insert({
            id: data.user.id,
            email: data.user.email,
          });
          await supabase.from('user_stats').insert({
            user_id: data.user.id,
          });
        } catch (profileError) {
          console.warn('Profile creation error:', profileError);
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
              {/* OAuth Buttons */}
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <Button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loadingProvider !== null}
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 rounded-2xl min-h-[52px] sm:min-h-[56px] py-3 sm:py-5 font-semibold transition-all active:scale-[0.98]"
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={() => handleOAuthSignIn('facebook')}
                  disabled={loadingProvider !== null}
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 rounded-2xl min-h-[52px] sm:min-h-[56px] py-3 sm:py-5 font-semibold transition-all active:scale-[0.98]"
                >
                  {loadingProvider === 'facebook' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Continue with Facebook
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={() => handleOAuthSignIn('apple')}
                  disabled={loadingProvider !== null}
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 rounded-2xl min-h-[52px] sm:min-h-[56px] py-3 sm:py-5 font-semibold transition-all active:scale-[0.98]"
                >
                  {loadingProvider === 'apple' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-slate-400 font-medium">or continue with email</span>
                </div>
              </div>

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
