'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again or reset your password.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
      } else if (data.session && data.user) {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          try {
            await supabase.from('user_profiles').insert({
              id: data.user.id,
              email: data.user.email,
            });
          } catch {}

          try {
            await supabase.from('user_stats').insert({
              user_id: data.user.id,
            });
          } catch {}
        }

        router.push('/dashboard');
        router.refresh();
      } else {
        setError('Sign-in succeeded but no session was created. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Unexpected error during sign-in:', err);
      setError('An unexpected error occurred. Please try again.');
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
            <h1 className="text-3xl font-light tracking-tight">Talka</h1>
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
          )}

          <p className="text-center text-white/60 text-sm font-light mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-blue-500 hover:text-blue-400 transition-colors">
              Sign up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
