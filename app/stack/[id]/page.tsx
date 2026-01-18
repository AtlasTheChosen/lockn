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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stack/[id]/page.tsx:useEffect',message:'Stack page useEffect triggered',data:{sessionLoading,hasSessionUser:!!sessionUser,hasAccessToken:!!accessToken,stackId:params.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (sessionLoading) return;
    
    if (!sessionUser || !accessToken) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stack/[id]/page.tsx:auth-redirect',message:'Redirecting to home - no session',data:{sessionLoading,hasSessionUser:!!sessionUser,hasAccessToken:!!accessToken},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-H5'})}).catch(()=>{});
      // #endregion

      router.push('/');
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
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-12 h-12 border-4 border-[var(--accent-green)]/30 border-t-[var(--accent-green)] rounded-full animate-spin mb-4"></div>
      <p className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Loading stack...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="rounded-3xl p-8 border-2 text-center max-w-md" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(255, 75, 75, 0.1)' }}>
          <span className="text-3xl">😕</span>
        </div>
        <p className="text-xl font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="px-6 py-3 text-white font-semibold rounded-2xl hover:shadow-lg transition-all"
          style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 4px 0 var(--accent-green-dark)' }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return <StackLearningClient stack={stack} cards={cards} />;
}
