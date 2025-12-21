'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import StackLearningClient from '@/components/stack/StackLearningClient';

export default function StackPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stack, setStack] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadStack() {
      try {
        const supabase = createClient();

        const { data: stackData } = await supabase
          .from('card_stacks')
          .select('*')
          .eq('id', params.id)
          .maybeSingle();

        if (!stackData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const { data: cardsData } = await supabase
          .from('flashcards')
          .select('*')
          .eq('stack_id', params.id)
          .order('card_order');

        setStack(stackData);
        setCards(cardsData || []);
      } catch (error) {
        console.error('Error loading stack:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadStack();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-lg">Loading stack...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Stack not found (ID: {params.id})</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-500 underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <StackLearningClient stack={stack} cards={cards} />;
}
