'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

export const dynamic = 'force-dynamic';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (stripeKey) {
        loadStripe(stripeKey);
      }
      setSupabase(createClient());
    }
  }, []);

  const handleCheckout = async (priceId: string, interval: string) => {
    if (!supabase) return;

    setLoading(interval);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
        }),
      });

      const { sessionId } = await res.json();

      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (stripeKey) {
        const stripe = await loadStripe(stripeKey);
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <nav className="border-b backdrop-blur-sm sticky top-0 z-50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6" style={{ color: 'var(--accent-green)' }} />
              <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>LockN</span>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" style={{ color: 'var(--text-secondary)' }}>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Upgrade to Premium</h1>
          <p className="text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
            Unlimited AI generations, unlimited stacks, and advanced features
          </p>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            Just $4.99/month - Cancel anytime
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="border-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <CardHeader>
              <CardTitle className="text-2xl" style={{ color: 'var(--text-primary)' }}>Free</CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Perfect to get started</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>$0</span>
                <span style={{ color: 'var(--text-secondary)' }}>/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Up to 3 stacks total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>5-card stacks only</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Tests, streaks, and social features</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full opacity-60 cursor-not-allowed"
                disabled
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                Current Plan
              </Button>
            </CardContent>
          </Card>

          <Card className="border-4 relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent-green)' }}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="px-4 py-1" style={{ backgroundColor: 'var(--accent-green)', color: 'white' }}>
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-6 w-6" style={{ color: 'var(--accent-green)' }} />
                <CardTitle className="text-2xl" style={{ color: 'var(--text-primary)' }}>Premium</CardTitle>
              </div>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>Unlimited learning potential</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>$4.99</span>
                <span style={{ color: 'var(--text-secondary)' }}>/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Unlimited AI generations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Unlimited stacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>10, 25, or 50 card stacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Archive completed stacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Priority support</span>
                </div>
              </div>
              <Button
                className="w-full font-bold"
                style={{ backgroundColor: 'var(--accent-green)', color: 'white', boxShadow: '0 3px 0 var(--accent-green-dark)' }}
                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '', 'monthly')}
                disabled={loading === 'monthly'}
              >
                {loading === 'monthly' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </>
                )}
              </Button>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Cancel anytime. No questions asked.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
