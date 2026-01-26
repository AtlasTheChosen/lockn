import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
  });
}

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json();

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
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
      metadata: {
        user_id: userId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
