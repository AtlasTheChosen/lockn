import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
  });
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

    // Cancel subscription in Stripe
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true, // Cancel at end of billing period
      }
    );

    // Update profile to reflect cancellation
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'canceled',
        subscription_cancel_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile after cancellation:', updateError);
      // Continue anyway since Stripe cancellation succeeded
    }

    return NextResponse.json({ 
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancelDate: new Date(subscription.current_period_end * 1000).toISOString()
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
