import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for leaderboard (public data)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Disable Next.js route caching to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Create a fresh client on each request with no caching
    const supabase = createClient(
      supabaseUrl, 
      supabaseServiceKey || supabaseAnonKey,
      {
        auth: { persistSession: false },
        global: { 
          headers: { 'Cache-Control': 'no-cache' }
        }
      }
    );

    // Fetch ALL user profiles first (to check what's being filtered)
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url')
      .limit(100);
    
    // Filter to only profiles with display names (for public leaderboard)
    const profiles = allProfiles?.filter((p: any) => p.display_name) || [];
    const profilesError = allProfilesError;

    if (profilesError) {
      console.error('[Leaderboard API] Profiles error:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch all user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, current_week_cards, weekly_cards_history, total_cards_mastered, daily_cards_learned');

    if (statsError) {
      console.error('[Leaderboard API] Stats error:', statsError);
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    return NextResponse.json(
      { profiles: profiles || [], stats: stats || [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
