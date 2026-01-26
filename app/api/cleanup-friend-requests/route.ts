import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint expires old pending friend requests (older than 14 days)
// Can be called by:
// 1. Vercel Cron (add to vercel.json)
// 2. External cron service
// 3. Manually via admin

const EXPIRY_DAYS = 14;

export async function POST(request: Request) {
  try {
    // Optional: Verify this is called by cron or admin
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - EXPIRY_DAYS);
    
    // Delete old pending friend requests
    const { data: deleted, error } = await supabase
      .from('friendships')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      console.error('Error expiring friend requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const expiredCount = deleted?.length || 0;
    console.log(`Expired ${expiredCount} old friend requests`);
    
    // Also reset daily friend request counters for users whose reset date is old
    const today = new Date().toISOString().split('T')[0];
    const { error: resetError } = await supabase
      .from('user_stats')
      .update({
        friend_requests_sent_today: 0,
        friend_request_reset_date: today,
      })
      .lt('friend_request_reset_date', today);
    
    if (resetError) {
      console.error('Error resetting daily counters:', resetError);
    }
    
    return NextResponse.json({
      success: true,
      expired: expiredCount,
      message: `Expired ${expiredCount} pending friend requests older than ${EXPIRY_DAYS} days`,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support GET for easy testing/cron
export async function GET(request: Request) {
  return POST(request);
}
