import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single();

    // Cancel subscription if active
    if (profile?.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (stripeError: any) {
        console.error('Failed to cancel Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // Delete all user data (cascading deletes should handle related records)
    // Note: Supabase RLS and CASCADE should handle most of this automatically
    // But we'll explicitly delete from main tables to be safe

    // Delete card stacks (this will cascade to flashcards via CASCADE)
    const { error: stacksError } = await supabase
      .from('card_stacks')
      .delete()
      .eq('user_id', user.id);

    if (stacksError) {
      console.error('Failed to delete card stacks:', stacksError);
    }

    // Delete user stats
    const { error: statsError } = await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', user.id);

    if (statsError) {
      console.error('Failed to delete user stats:', statsError);
    }

    // Delete friendships
    const { error: friendshipsError } = await supabase
      .from('friendships')
      .delete()
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendshipsError) {
      console.error('Failed to delete friendships:', friendshipsError);
    }

    // Delete notifications
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (notificationsError) {
      console.error('Failed to delete notifications:', notificationsError);
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Failed to delete user profile:', profileError);
    }

    // Finally, delete the auth user (this requires admin privileges)
    // Use service role client for admin operations
    const adminSupabase = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      // If admin delete fails, we can't complete the deletion
      // User should contact support
      return NextResponse.json(
        { 
          error: 'Unable to complete account deletion. Please contact support.',
          details: deleteUserError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully' 
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
