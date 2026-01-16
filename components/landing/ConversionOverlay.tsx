'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';
import { getRandomAvatarId, getAvatarUrl } from '@/lib/avatars';

interface ConversionOverlayProps {
  scenario: string;
  onClose?: () => void;
}

export default function ConversionOverlay({ scenario, onClose }: ConversionOverlayProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else if (data.user) {
      const userId = data.user.id;
      const userEmail = data.user.email;
      
      // Create profile with random avatar
      try {
        const avatarId = getRandomAvatarId();
        const avatarUrl = getAvatarUrl(avatarId);
        
        await supabase.from('user_profiles').insert({
          id: userId,
          email: userEmail,
          avatar_url: avatarUrl,
        });
        await supabase.from('user_stats').insert({
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

          const capitalizedTitle = trialScenario
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

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
            
            localStorage.removeItem('lockn-trial-cards');
            localStorage.removeItem('lockn-trial-scenario');
            localStorage.removeItem('lockn-trial-language');
            localStorage.removeItem('lockn-trial-level');
            localStorage.removeItem('lockn-trial-ratings');
          }
        }
      } catch (profileError) {
        console.warn('Profile/trial migration error:', profileError);
      }
      
      setLoading(false);
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-talka-lg overflow-hidden"
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex justify-center mb-4"
          >
            <Logo size="xl" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-display text-2xl font-semibold text-slate-800 mb-2">
              Great job! Ready to continue?
            </h3>
            <p className="text-lg font-semibold gradient-text capitalize mb-2">"{scenario}"</p>
            <p className="text-slate-500 text-sm font-medium">
              Create your free account to save your progress
            </p>
          </motion.div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-12 pr-12 py-6 font-medium focus:border-talka-purple focus:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-12 py-6 font-medium focus:border-talka-purple focus:ring-0"
            />
          </div>
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
            className="w-full bg-gradient-purple-pink hover:opacity-90 text-white rounded-2xl py-5 text-base font-bold shadow-purple hover:shadow-lg hover:-translate-y-0.5 transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Start Learning Free'
            )}
          </Button>
        </form>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full text-center text-slate-500 text-sm font-medium mt-4 hover:text-talka-purple transition-colors"
          >
            Keep reviewing cards
          </button>
        )}

        <p className="text-center text-slate-400 text-xs font-medium mt-6">
          By signing up, you agree to our Terms of Service
        </p>
      </motion.div>
    </motion.div>
  );
}
