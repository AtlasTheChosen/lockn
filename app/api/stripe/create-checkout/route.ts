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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:14',message:'POST request received',data:{hasStripeKey:!!process.env.STRIPE_SECRET_KEY,stripeKeyPrefix:process.env.STRIPE_SECRET_KEY?.substring(0,7)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    const { priceId, userId, billingInterval } = await request.json();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:20',message:'Request body parsed',data:{hasPriceId:!!priceId,hasUserId:!!userId,priceId,billingInterval,priceIdPrefix:priceId?.substring(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'annual-fix',hypothesisId:'I'})}).catch(()=>{});
    // #endregion

    // Validate required fields
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:32',message:'Stripe key missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json({ error: 'Payment service is not configured. Please contact support.' }, { status: 500 });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:38',message:'Creating Stripe client',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:90',message:'Creating checkout session',data:{hasCustomText:!!sessionConfig.custom_text,customTextKeys:sessionConfig.custom_text ? Object.keys(sessionConfig.custom_text) : [],billingAddressCollection:sessionConfig.billing_address_collection},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:95',message:'Checkout session created',data:{sessionId:session.id,hasSessionId:!!session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daacd478-8ee6-47a0-816c-26f9a01d7524',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout/route.ts:100',message:'Checkout error caught',data:{errorMessage:error?.message,errorType:error?.type,errorCode:error?.code,errorStatus:error?.statusCode,fullError:JSON.stringify(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
