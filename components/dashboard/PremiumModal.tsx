'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Crown, Zap, Infinity, Archive, Volume2, Headphones, Loader2 } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/client';
import { loadStripe } from '@stripe/stripe-js';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient());
    }
  }, []);

  const handleCheckout = async () => {
    if (!supabase) return;

    setLoading(true);

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
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
          userId: user.id,
        }),
      });

      const { sessionId } = await res.json();

      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (stripeKey) {
        const stripe = await loadStripe(stripeKey);
        if (stripe && sessionId) {
          await stripe.redirectToCheckout({ sessionId });
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)'
        }}
      >
        <DialogHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Logo size="sm" />
            <span className="font-display text-xl font-semibold" style={{ color: 'var(--accent-green)' }}>
              LockN
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Unlimited AI generations, unlimited stacks, and advanced features
          </DialogDescription>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--accent-green)' }}>
            Just $4.99/month - Cancel anytime
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Free Plan */}
          <Card 
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '2px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl" style={{ color: 'var(--text-primary)' }}>Free</CardTitle>
              <CardDescription className="text-sm" style={{ color: 'var(--text-secondary)' }}>Perfect to get started</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$0</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Up to 3 stacks total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>5-card stacks only</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Tests, streaks, and social features</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full opacity-60 cursor-not-allowed"
                disabled
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-muted)'
                }}
              >
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card 
            className="relative"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '3px solid var(--accent-green)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge 
                style={{ 
                  backgroundColor: 'var(--accent-green)', 
                  color: 'white',
                  padding: '0.5rem 1rem'
                }}
              >
                Most Popular
              </Badge>
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
                <CardTitle className="text-xl" style={{ color: 'var(--text-primary)' }}>Premium</CardTitle>
              </div>
              <CardDescription className="text-sm" style={{ color: 'var(--text-secondary)' }}>Unlimited learning potential</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$4.99</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Infinity className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Unlimited AI generations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Infinity className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Unlimited stacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>10, 25, or 50 card stacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Archive completed stacks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Advanced audio speeds (0.75x, 1.25x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Priority support</span>
                </div>
              </div>
              <Button
                className="w-full font-bold text-sm py-2"
                onClick={() => {
                  handleCheckout();
                  onClose();
                }}
                disabled={loading}
                style={{ 
                  backgroundColor: 'var(--accent-green)', 
                  color: 'white', 
                  boxShadow: '0 3px 0 var(--accent-green-dark)'
                }}
              >
                {loading ? (
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
      </DialogContent>
    </Dialog>
  );
}
