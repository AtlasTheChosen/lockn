'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const router = useRouter();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasConfig = supabaseUrl && supabaseKey;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasConfig) {
      setError('Supabase configuration is missing. Please check environment variables.');
      return;
    }

    setLoading(true);
    setError('');

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Sign-in is taking too long. Please refresh and try again.');
    }, 20000);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(timeoutId);

      if (signInError) {
        console.error('Sign-in error:', signInError);
        setError(signInError.message);
        setLoading(false);
      } else if (data.session) {
        window.location.href = '/dashboard';
      } else {
        setError('Sign-in succeeded but no session was created. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Unexpected error during sign-in:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleDebugAuth = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        alert(`Session Error: ${error.message}`);
      } else if (data.session) {
        alert(`Active Session Found!\nUser: ${data.session.user.email}\nExpires: ${new Date(data.session.expires_at! * 1000).toLocaleString()}`);
      } else {
        alert('No active session found.');
      }
    } catch (err) {
      alert(`Debug Error: ${err}`);
    }
  };

  const handleFakeLogin = () => {
    localStorage.setItem('debugAuthBypass', 'true');
    window.location.href = '/dashboard';
  };

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
            Welcome back
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/60 font-light"
          >
            Continue your language journey
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {!hasConfig && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 text-sm font-light">
                    Supabase configuration is missing. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
                  </p>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-red-300 text-xs underline mt-2"
                  >
                    {showDebug ? 'Hide' : 'Show'} debug info
                  </button>
                  {showDebug && (
                    <div className="mt-2 text-xs text-white/60 font-mono">
                      <div>URL: {supabaseUrl || 'undefined'}</div>
                      <div>Key: {supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'undefined'}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || !hasConfig}
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
          </form>

          <div className="mt-6 space-y-2">
            <div className="text-center mb-2">
              <p className="text-yellow-400 text-xs font-medium uppercase tracking-wide">
                Debug Mode Available
              </p>
            </div>
            <Button
              type="button"
              onClick={handleFakeLogin}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-xl py-6 text-base font-medium shadow-lg shadow-yellow-500/20"
            >
              Skip Login (Test Dashboard)
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDebugAuth}
              className="w-full text-white/40 hover:text-white/60 text-xs font-light"
            >
              Debug Auth Status
            </Button>
          </div>

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
