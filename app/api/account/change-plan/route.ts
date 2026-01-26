import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

/**
 * Helper function to determine billing interval from price ID
 */
function getBillingIntervalFromPriceId(priceId: string): 'monthly' | 'annual' | null {
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL;
  
  if (priceId === monthlyPriceId) return 'monthly';
  if (priceId === annualPriceId) return 'annual';
  return null;
}

/**
 * Get current billing interval from Stripe subscription
 */
async function getCurrentBillingInterval(subscriptionId: string): Promise<'monthly' | 'annual' | null> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  if (!subscription.items.data.length) {
    return null;
  }
  
  const currentPriceId = subscription.items.data[0].price.id;
  return getBillingIntervalFromPriceId(currentPriceId);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { billingInterval } = await request.json();

    if (!billingInterval || (billingInterval !== 'monthly' && billingInterval !== 'annual')) {
      return NextResponse.json(
        { error: 'Invalid billing interval. Must be "monthly" or "annual"' },
        { status: 400 }
      );
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }

    // Determine current billing interval
    const currentInterval = await getCurrentBillingInterval(profile.stripe_subscription_id);
    
    if (currentInterval === billingInterval) {
      return NextResponse.json(
        { error: `You're already on the ${billingInterval} plan` },
        { status: 400 }
      );
    }

    // Get the new price ID
    const newPriceId = billingInterval === 'annual'
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;

    if (!newPriceId) {
      return NextResponse.json(
        { error: `${billingInterval} price ID is not configured` },
        { status: 500 }
      );
    }

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'always_invoice',
        proration_date: Math.floor(Date.now() / 1000),
      }
    );

    // Get the upcoming invoice to show proration amount
    let prorationAmount = 0;
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: profile.stripe_customer_id!,
        subscription: profile.stripe_subscription_id,
      });
      
      // Find proration line items
      const prorationItems = upcomingInvoice.lines.data.filter(
        line => line.proration === true
      );
      
      if (prorationItems.length > 0) {
        prorationAmount = prorationItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      }
    } catch (invoiceError) {
      // If we can't get the invoice, that's okay - we'll still update the subscription
      console.warn('Could not retrieve upcoming invoice for proration amount:', invoiceError);
    }

    return NextResponse.json({
      success: true,
      message: 'Plan changed successfully',
      billingInterval: billingInterval,
      prorationAmount: prorationAmount / 100, // Convert from cents to dollars
      subscriptionId: updatedSubscription.id,
    });
  } catch (error: any) {
    console.error('Change plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change subscription plan' },
      { status: 500 }
    );
  }
}
