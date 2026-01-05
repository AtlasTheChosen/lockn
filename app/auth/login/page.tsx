'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { DEBUG } from '@/lib/debug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple simultaneous login attempts
    if (loading) {
      console.log('Login already in progress, ignoring duplicate request');
      return;
    }

    setLoading(true);
    setError('');

    // Validate Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase is not configured. Please check your environment variables.');
      setLoading(false);
      console.error('Missing Supabase configuration:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return;
    }

    // Add timeout to fail faster, but don't interfere with successful logins
    let timeoutId: NodeJS.Timeout | null = null;
    let loginCompleted = false;

    try {
      const supabase = createClient();
      
      // Check if user is already logged in
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          console.log('User already logged in, redirecting to dashboard');
          setLoading(false);
          router.push('/dashboard');
          router.refresh();
          return;
        }
      } catch (sessionError) {
        console.warn('Error checking existing session:', sessionError);
        // Continue with login attempt
      }
      
      console.log('Attempting login for:', email);
      console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');

      // Start the login request
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Set timeout that only fires if login hasn't completed
      timeoutId = setTimeout(() => {
        if (!loginCompleted) {
          setError('Login request timed out. Please check your internet connection and try again.');
          setLoading(false);
        }
      }, 15000); // 15 second timeout
      
      // Wait for login to complete
      const { data, error: signInError } = await loginPromise;
      
      // Mark as completed and clear timeout
      loginCompleted = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (signInError) {
        console.error('Login error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again or reset your password.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before logging in.');
        } else {
          setError(signInError.message || 'Login failed. Please try again.');
        }
        setLoading(false);
      } else if (data?.session && data?.user) {
        console.log('Login successful, session:', data.session ? 'exists' : 'missing');
        console.log('User ID:', data.user.id);
        
        // Verify session is set before redirecting
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        if (!verifySession) {
          console.error('Session not found after login, retrying...');
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            setError('Session not created. Please try again.');
            setLoading(false);
            return;
          }
        }

        // Create profile/stats in background
          // Create profile/stats in background - don't wait for it
          (async () => {
            try {
              const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', data.user.id)
                .maybeSingle();

              if (!existingProfile) {
                const { error: profileError } = await supabase.from('user_profiles').insert({
                  id: data.user.id,
                  email: data.user.email,
                });
                if (profileError) {
                  DEBUG.databaseError('Login Page: Error creating user profile', profileError);
                } else {
                  DEBUG.database('Login Page: User profile created');
                }

                const { error: statsError } = await supabase.from('user_stats').insert({
                  user_id: data.user.id,
                });
                if (statsError) {
                  DEBUG.databaseError('Login Page: Error creating user stats', statsError);
                } else {
                  DEBUG.database('Login Page: User stats created');
                }
              }
            } catch (err: any) {
              DEBUG.databaseError('Login Page: Error in profile check', err);
            }
          })();

        // Verify session is properly stored
        const { data: sessionCheck } = await supabase.auth.getSession();
        console.log('[Login] Session verification:', { 
          hasSession: !!sessionCheck.session, 
          userId: sessionCheck.session?.user?.id 
        });
        
        if (!sessionCheck.session) {
          console.error('[Login] Session not found after login!');
          setError('Session was not persisted. Please try again.');
          setLoading(false);
          return;
        }
        
        setLoading(false);
        console.log('[Login] Redirecting to dashboard in 500ms...');
        // Small delay to ensure cookies are written
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        setError('Sign-in succeeded but no session was created. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      loginCompleted = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      console.error('Unexpected error during sign-in:', err);
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Network error. Please check your internet connection and Supabase configuration.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setResetSent(true);
      }
    } catch (err) {
      console.error('Error sending reset email:', err);
      setError('Failed to send reset email. Please try again.');
    }
    setLoading(false);
  };

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-light mb-4">Check your email</h2>
            <p className="text-white/60 font-light mb-6">
              We sent a password reset link to <span className="text-white">{email}</span>
            </p>
            <Button
              onClick={() => {
                setResetSent(false);
                setShowResetForm(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to login
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center gap-3 mb-6"
          >
            <Sparkles className="h-10 w-10 text-blue-500" />
            <h1 className="text-3xl font-light tracking-tight">LOCKN</h1>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-light mb-2"
          >
            {showResetForm ? 'Reset your password' : 'Welcome back'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/60 font-light"
          >
            {showResetForm ? 'Enter your email to receive a reset link' : 'Continue your language journey'}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {showResetForm ? (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl py-6 font-light focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm font-light"
                >
                  {error}
                </motion.p>
              )}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-light"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowResetForm(false);
                  setError('');
                }}
                className="w-full text-white/60 hover:text-white text-sm font-light transition-colors"
              >
                Back to login
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Email/Password Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl py-6 font-light focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl py-6 font-light focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stay-logged-in"
                    checked={stayLoggedIn}
                    onCheckedChange={(checked) => setStayLoggedIn(checked as boolean)}
                    className="border-white/20"
                  />
                  <Label
                    htmlFor="stay-logged-in"
                    className="text-sm font-light text-white/80 cursor-pointer"
                  >
                    Stay logged in
                  </Label>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm font-light"
                  >
                    {error}
                  </motion.p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-light"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="w-full text-white/60 hover:text-white text-sm font-light transition-colors"
                >
                  Forgot password?
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-white/60 text-sm font-light mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/" className="text-blue-500 hover:text-blue-400 transition-colors">
              Sign up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
