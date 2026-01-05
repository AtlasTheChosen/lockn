import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for leaderboard (public data)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/leaderboard/route.ts:GET',message:'Leaderboard API called',data:{hasServiceKey:!!supabaseServiceKey,supabaseUrl},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H4'})}).catch(()=>{});
    // #endregion
    
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all user profiles with display names (public leaderboard data)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url')
      .not('display_name', 'is', null)
      .limit(100);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/leaderboard/route.ts:profiles',message:'Profiles query result',data:{profileCount:profiles?.length||0,profilesError:profilesError?.message||null,sampleProfiles:profiles?.slice(0,3)?.map((p:any)=>({id:p.id,name:p.display_name}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    if (profilesError) {
      console.error('[Leaderboard API] Profiles error:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch all user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, current_week_cards, weekly_cards_history, total_cards_mastered, daily_cards_learned');

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/leaderboard/route.ts:stats',message:'Stats query result',data:{statsCount:stats?.length||0,statsError:statsError?.message||null,sampleStats:stats?.slice(0,3)?.map((s:any)=>({userId:s.user_id,daily:s.daily_cards_learned,total:s.total_cards_mastered}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (statsError) {
      console.error('[Leaderboard API] Stats error:', statsError);
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/leaderboard/route.ts:return',message:'API returning data',data:{profileCount:profiles?.length||0,statsCount:stats?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      profiles: profiles || [],
      stats: stats || [],
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/05b1efa4-c9cf-49d6-99df-c5f8f76c5ba9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/leaderboard/route.ts:error',message:'API error',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

