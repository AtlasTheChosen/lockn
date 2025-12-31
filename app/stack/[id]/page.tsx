'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import StackLearningClient from '@/components/stack/StackLearningClient';

export default function StackPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stack, setStack] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadStack() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const { data: stackData, error: stackError } = await supabase
        .from('card_stacks')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', session.user.id)
        .single();

      if (stackError || !stackData) {
        setError('Stack not found or access denied');
        setLoading(false);
        return;
      }

      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('stack_id', params.id)
        .order('card_order');

      if (cardsError) {
        setError('Error loading cards');
        setLoading(false);
        return;
      }

      setStack(stackData);
      setCards(cardsData || []);
      setLoading(false);
    }

    loadStack();
  }, [params.id, router]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="w-12 h-12 border-4 border-talka-purple/30 border-t-talka-purple rounded-full animate-spin mb-4"></div>
      <p className="font-display text-xl font-semibold text-slate-700">Loading stack...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="bg-white rounded-3xl p-8 shadow-talka-md border-2 border-slate-200 text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">😕</span>
        </div>
        <p className="text-xl font-display font-semibold text-slate-800 mb-4">{error}</p>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="px-6 py-3 bg-gradient-to-r from-talka-purple to-talka-pink text-white font-semibold rounded-2xl hover:shadow-lg transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return <StackLearningClient stack={stack} cards={cards} />;
}