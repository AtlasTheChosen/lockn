import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
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
 * Extract billing interval from Stripe subscription
 */
function getBillingIntervalFromSubscription(subscription: Stripe.Subscription): 'monthly' | 'annual' | null {
  if (!subscription.items.data.length) {
    return null;
  }
  
  const priceId = subscription.items.data[0].price.id;
  return getBillingIntervalFromPriceId(priceId);
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout completed for user:', session.metadata?.user_id);

        // Get subscription to determine billing interval
        let billingInterval: 'monthly' | 'annual' | null = null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          billingInterval = getBillingIntervalFromSubscription(subscription);
        }

        await supabase
          .from('user_profiles')
          .update({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            billing_interval: billingInterval,
          })
          .eq('id', session.metadata?.user_id);

        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🆕 Subscription created:', subscription.id);

        const billingInterval = getBillingIntervalFromSubscription(subscription);

        // Update with subscription details
        await supabase
          .from('user_profiles')
          .update({
            is_premium: subscription.status === 'active' || subscription.status === 'trialing',
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_interval: billingInterval,
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id, 'status:', subscription.status);

        const billingInterval = getBillingIntervalFromSubscription(subscription);

        await supabase
          .from('user_profiles')
          .update({
            is_premium: subscription.status === 'active' || subscription.status === 'trialing',
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_interval: billingInterval,
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription deleted:', subscription.id);

        await supabase
          .from('user_profiles')
          .update({
            is_premium: false,
            subscription_status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('⏰ Trial ending soon for subscription:', subscription.id);
        // Could send email notification here
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💳 Payment failed for customer:', invoice.customer);
        
        // Update subscription status - Stripe typically gives grace period
        // but we should check the actual subscription status
        if (invoice.subscription) {
          // Fetch the subscription to get its current status
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: subscription.status,
              // Only remove premium if subscription is actually canceled/unpaid
              // Stripe may keep it active during grace period
              is_premium: subscription.status === 'active' || subscription.status === 'trialing',
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('✅ Invoice paid for customer:', invoice.customer);
        
        // Reactivate subscription if it was past due
        if (invoice.subscription) {
          await supabase
            .from('user_profiles')
            .update({
              is_premium: true,
              subscription_status: 'active',
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
