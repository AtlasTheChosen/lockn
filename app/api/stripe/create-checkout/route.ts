import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  try {
    const { priceId, userId, billingInterval } = await request.json();

    // Validate required fields
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json({ error: 'Payment service is not configured. Please contact support.' }, { status: 500 });
    }

    const stripe = getStripe();
    
    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      // Let Stripe automatically show the best payment methods for the customer
      // This enables: Apple Pay, Google Pay, Link, Cash App Pay, cards, and more
      // based on customer location and what's enabled in your Stripe Dashboard
      payment_method_types: [
        'card',        // Credit/debit cards (includes Apple Pay & Google Pay wallets)
        'cashapp',     // Cash App Pay
        'link',        // Stripe Link (fast checkout with saved payment info)
      ],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      allow_promotion_codes: true, // Allow discount codes
      billing_address_collection: 'auto',
      // Customize text to match brand voice
      custom_text: {
        submit: {
          message: 'Start your premium journey! 🚀',
        },
      },
      metadata: {
        user_id: userId,
      },
    };

    // Add payment method configuration if provided (controls which payment methods to show)
    // For full color/font customization, go to Stripe Dashboard > Settings > Branding
    // Set primary color to #58cc02 to match LockN brand
    const paymentMethodConfigId = process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID;
    if (paymentMethodConfigId) {
      sessionConfig.payment_method_configuration = paymentMethodConfigId;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
