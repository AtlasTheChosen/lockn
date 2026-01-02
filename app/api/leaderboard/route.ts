import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for leaderboard (public data)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all user profiles (public leaderboard data)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url')
      .limit(50);

    if (profilesError) {
      console.error('[Leaderboard API] Profiles error:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch all user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, current_week_cards, weekly_cards_history, total_stacks_completed');

    if (statsError) {
      console.error('[Leaderboard API] Stats error:', statsError);
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    return NextResponse.json({
      profiles: profiles || [],
      stats: stats || [],
    });
  } catch (error: any) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

