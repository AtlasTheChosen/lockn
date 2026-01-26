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
import { Check, Crown, Zap, Infinity, Archive, Headphones, Loader2 } from 'lucide-react';
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
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient());
    }
  }, []);

  const handleCheckout = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    setLoading(true);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:36',message:'handleCheckout started',data:{hasSupabase:!!supabase,billingInterval},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:45',message:'User fetched',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!user) {
        router.push('/');
        return;
      }

      const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '';
      const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL || '';
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:65',message:'Price ID selection',data:{billingInterval,monthlyPriceId,annualPriceId,hasMonthly:!!monthlyPriceId,hasAnnual:!!annualPriceId},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      // Check if annual is selected but annual price ID is missing
      if (billingInterval === 'annual' && !annualPriceId) {
        console.error('Annual price ID is not configured');
        alert('Annual subscription is not available. The annual price ID (NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL) is not configured. Please select monthly or contact support.');
        setLoading(false);
        return;
      }

      // Select the appropriate price ID
      const priceId = billingInterval === 'annual' ? annualPriceId : monthlyPriceId;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:75',message:'Selected price ID',data:{billingInterval,selectedPriceId:priceId,hasPriceId:!!priceId},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      if (!priceId) {
        console.error(`Stripe ${billingInterval} price ID is not configured`);
        alert(`Payment configuration error: ${billingInterval} price ID is missing. Please contact support.`);
        setLoading(false);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:65',message:'Fetching checkout session',data:{priceId,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:85',message:'Sending checkout request',data:{priceId,billingInterval,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          billingInterval, // Pass billing interval for logging/debugging
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:78',message:'Checkout API response',data:{status:res.status,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Checkout API error:', errorData);
        alert(`Failed to start checkout: ${errorData.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const { sessionId, error } = data;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:90',message:'Checkout session data',data:{hasSessionId:!!sessionId,hasError:!!error,error},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (error || !sessionId) {
        console.error('No session ID returned:', error || 'Missing sessionId');
        alert(`Failed to create checkout session: ${error || 'Missing session ID'}`);
        setLoading(false);
        return;
      }

      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:100',message:'Stripe key check',data:{hasStripeKey:!!stripeKey},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (!stripeKey) {
        console.error('Stripe publishable key is not configured');
        alert('Payment configuration error. Please contact support.');
        setLoading(false);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:110',message:'Loading Stripe and redirecting',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      const stripe = await loadStripe(stripeKey);
      if (stripe && sessionId) {
        const { error: redirectError } = await stripe.redirectToCheckout({ sessionId });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:115',message:'Stripe redirect result',data:{hasRedirectError:!!redirectError,redirectError:redirectError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        if (redirectError) {
          console.error('Stripe redirect error:', redirectError);
          alert(`Failed to redirect to checkout: ${redirectError.message}`);
          setLoading(false);
        }
        // If successful, redirect will happen and component will unmount
      } else {
        console.error('Failed to load Stripe or missing sessionId');
        alert('Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:125',message:'Checkout exception caught',data:{error:error?.message,stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Checkout error:', error);
      alert(`An error occurred: ${error?.message || 'Unknown error'}`);
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
              <CardDescription className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Choose your billing cycle below, then proceed to checkout
              </CardDescription>
              
              {/* Billing Interval Toggle - Always visible for user selection */}
              <div className="flex items-center justify-center gap-3 p-2 bg-[var(--bg-secondary)] rounded-lg mb-3">
                <button
                  onClick={() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:267',message:'Monthly button clicked',data:{currentInterval:billingInterval},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'J'})}).catch(()=>{});
                    // #endregion
                    setBillingInterval('monthly');
                  }}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex-1 ${
                    billingInterval === 'monthly'
                      ? 'bg-[var(--accent-green)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PremiumModal.tsx:280',message:'Annual button clicked',data:{currentInterval:billingInterval},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'J'})}).catch(()=>{});
                    // #endregion
                    setBillingInterval('annual');
                  }}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all relative flex-1 ${
                    billingInterval === 'annual'
                      ? 'bg-[var(--accent-green)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  Annual
                  <span className="absolute -top-1 -right-1 bg-[var(--accent-orange)] text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    Save 17%
                  </span>
                </button>
              </div>

              {/* Dynamic Pricing Display */}
              <div className="pt-2 text-center border-t border-[var(--border-color)] pb-3">
                {billingInterval === 'monthly' ? (
                  <>
                    <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$4.99</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>/month</span>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Billed monthly • Cancel anytime
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$49.90</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>/year</span>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Just $4.16/month (billed annually)
                    </p>
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--accent-green)' }}>
                      Save $10.88 per year!
                    </p>
                  </>
                )}
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
                  <Headphones className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Priority support</span>
                </div>
              </div>
              <Button
                className="w-full font-bold text-sm py-2"
                onClick={handleCheckout}
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
