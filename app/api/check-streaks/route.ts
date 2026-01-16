/**
 * Streak System V2 - Hourly Cron Job
 * 
 * This endpoint is called hourly by Vercel cron to:
 * 1. Check all users for expired streaks and reset them
 * 2. Check all pending tests for expiration and freeze streaks if applicable
 * 
 * Schedule: Every hour (0 * * * *)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  // Verify cron secret if provided (optional security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[check-streaks] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[check-streaks] Starting streak check job...');
  const startTime = Date.now();
  
  // Create admin client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  const now = new Date().toISOString();
  let expiredStreaks = 0;
  let frozenUsers = 0;
  let errors: string[] = [];
  
  // ============================================================
  // TASK 1: Check all users for expired streaks
  // ============================================================
  try {
    // Find users whose streak_deadline has passed
    const { data: expiredUsers, error: expiredError } = await supabase
      .from('user_stats')
      .select('user_id, current_streak, longest_streak')
      .gt('current_streak', 0)
      .not('streak_deadline', 'is', null)
      .lt('streak_deadline', now);
    
    if (expiredError) {
      console.error('[check-streaks] Error fetching expired users:', expiredError);
      errors.push(`Expired users fetch: ${expiredError.message}`);
    } else if (expiredUsers && expiredUsers.length > 0) {
      console.log(`[check-streaks] Found ${expiredUsers.length} users with expired streaks`);
      
      for (const user of expiredUsers) {
        try {
          // Preserve longest streak
          const newLongest = Math.max(user.current_streak, user.longest_streak);
          
          // Reset streak to 0
          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              current_streak: 0,
              streak_frozen: false,
              cards_mastered_today: 0,
              streak_deadline: null,
              display_deadline: null,
              longest_streak: newLongest,
            })
            .eq('user_id', user.user_id);
          
          if (updateError) {
            console.error(`[check-streaks] Error resetting streak for ${user.user_id}:`, updateError);
            errors.push(`Reset ${user.user_id}: ${updateError.message}`);
          } else {
            // Unlock all stacks (set contributed_to_streak = false)
            await supabase
              .from('card_stacks')
              .update({ contributed_to_streak: false })
              .eq('user_id', user.user_id);
            
            // Mark all pending tests as legacy (can_unfreeze_streak = false)
            await supabase
              .from('stack_tests')
              .update({ can_unfreeze_streak: false })
              .eq('user_id', user.user_id)
              .eq('test_status', 'pending');
            
            expiredStreaks++;
            console.log(`[check-streaks] Reset streak for user ${user.user_id}: ${user.current_streak} -> 0 (longest: ${newLongest})`);
          }
        } catch (e) {
          console.error(`[check-streaks] Exception resetting streak for ${user.user_id}:`, e);
          errors.push(`Reset exception ${user.user_id}: ${e}`);
        }
      }
    } else {
      console.log('[check-streaks] No expired streaks found');
    }
  } catch (e) {
    console.error('[check-streaks] Task 1 exception:', e);
    errors.push(`Task 1 exception: ${e}`);
  }
  
  // ============================================================
  // TASK 2: Check all pending tests for expiration and freeze
  // ============================================================
  try {
    // Find expired pending tests that can still freeze
    const { data: expiredTests, error: testsError } = await supabase
      .from('stack_tests')
      .select('id, user_id, has_frozen_streak, can_unfreeze_streak')
      .eq('test_status', 'pending')
      .eq('can_unfreeze_streak', true)
      .eq('has_frozen_streak', false)
      .lt('test_deadline', now);
    
    if (testsError) {
      console.error('[check-streaks] Error fetching expired tests:', testsError);
      errors.push(`Expired tests fetch: ${testsError.message}`);
    } else if (expiredTests && expiredTests.length > 0) {
      console.log(`[check-streaks] Found ${expiredTests.length} expired tests to process`);
      
      for (const test of expiredTests) {
        try {
          // Fetch user's current state
          const { data: stats } = await supabase
            .from('user_stats')
            .select('current_streak, streak_frozen')
            .eq('user_id', test.user_id)
            .single();
          
          // Only freeze if user has active streak and not already frozen
          if (stats && stats.current_streak > 0 && !stats.streak_frozen) {
            // Freeze the user's streak
            const { error: freezeError } = await supabase
              .from('user_stats')
              .update({ streak_frozen: true })
              .eq('user_id', test.user_id);
            
            if (freezeError) {
              console.error(`[check-streaks] Error freezing user ${test.user_id}:`, freezeError);
              errors.push(`Freeze ${test.user_id}: ${freezeError.message}`);
            } else {
              // Mark test as having frozen the streak
              await supabase
                .from('stack_tests')
                .update({ has_frozen_streak: true })
                .eq('id', test.id);
              
              frozenUsers++;
              console.log(`[check-streaks] Froze streak for user ${test.user_id} due to expired test ${test.id}`);
            }
          }
        } catch (e) {
          console.error(`[check-streaks] Exception processing test ${test.id}:`, e);
          errors.push(`Test exception ${test.id}: ${e}`);
        }
      }
    } else {
      console.log('[check-streaks] No expired tests to process');
    }
  } catch (e) {
    console.error('[check-streaks] Task 2 exception:', e);
    errors.push(`Task 2 exception: ${e}`);
  }
  
  const duration = Date.now() - startTime;
  
  const result = {
    success: errors.length === 0,
    timestamp: now,
    duration: `${duration}ms`,
    expiredStreaks,
    frozenUsers,
    errors: errors.length > 0 ? errors : undefined,
  };
  
  console.log('[check-streaks] Job completed:', result);
  
  return NextResponse.json(result);
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
