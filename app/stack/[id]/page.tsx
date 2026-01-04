'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import StackLearningClient from '@/components/stack/StackLearningClient';

export default function StackPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user: sessionUser, accessToken, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [stack, setStack] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    
    if (!sessionUser || !accessToken) {
      router.push('/auth/login');
      return;
    }

    const userId = sessionUser.id;
    const token = accessToken; // Capture for closure
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    async function loadStack() {
      try {
        // Fetch stack using native fetch with user's access token
        const stackResponse = await fetch(
          `${supabaseUrl}/rest/v1/card_stacks?id=eq.${params.id}&user_id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!stackResponse.ok) {
          console.error('[Stack] Stack fetch failed:', stackResponse.status);
          setError('Stack not found or access denied');
          setLoading(false);
          return;
        }

        const stackData = await stackResponse.json();
        if (!stackData || stackData.length === 0) {
          setError('Stack not found or access denied');
          setLoading(false);
          return;
        }

        // Fetch cards using native fetch with user's access token
        const cardsResponse = await fetch(
          `${supabaseUrl}/rest/v1/flashcards?stack_id=eq.${params.id}&order=card_order&select=*`,
          {
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const cardsData = cardsResponse.ok ? await cardsResponse.json() : [];

        setStack(stackData[0]);
        setCards(cardsData || []);
        setLoading(false);
      } catch (e: any) {
        console.error('Error loading stack:', e);
        setError('Error loading stack');
        setLoading(false);
      }
    }

    loadStack();
  }, [params.id, router, sessionUser, accessToken, sessionLoading]);

  if (sessionLoading || loading) return (
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
