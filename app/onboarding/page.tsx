'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { containsInappropriateContent } from '@/lib/content-filter';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
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

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Error saving display name:', err);
      setError(err.message || 'Failed to save display name');
      setLoading(false);
    }
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
            <h1 className="text-3xl font-light tracking-tight">LOCKN</h1>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-light mb-2"
          >
            Welcome aboard!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/60 font-light"
          >
            Choose a display name to get started
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Input
                type="text"
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl py-6 font-light focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {checking && <Loader2 className="h-5 w-5 animate-spin text-white/40" />}
                {!checking && isAvailable === true && displayName.length >= 3 && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {!checking && isAvailable === false && displayName.length >= 3 && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>

            {displayName.length > 0 && displayName.length < 3 && (
              <p className="text-white/40 text-sm font-light">
                At least 3 characters required
              </p>
            )}

            {isAvailable === false && displayName.length >= 3 && (
              <p className="text-red-400 text-sm font-light">
                This name is already taken
              </p>
            )}

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

          <p className="text-center text-white/40 text-xs font-light mt-6">
            You can change this later in your profile settings
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}


