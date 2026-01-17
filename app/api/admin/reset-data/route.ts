import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Admin-only API to reset all user data for testing.
 * Preserves user accounts but clears all learning data.
 * Also cleans up orphaned audio files in storage.
 * 
 * POST /api/admin/reset-data
 * Body: { confirm: "RESET_ALL_DATA" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify admin status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Require confirmation
    const body = await request.json();
    if (body.confirm !== 'RESET_ALL_DATA') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "RESET_ALL_DATA" }' },
        { status: 400 }
      );
    }
    
    const results: Record<string, any> = {};
    
    // Delete all flashcards
    const { error: flashcardsError, count: flashcardsCount } = await supabase
      .from('flashcards')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (workaround)
      .select('id', { count: 'exact', head: true } as any);
    results.flashcards = { deleted: !flashcardsError, count: flashcardsCount };
    
    // Delete all stack_tests
    const { error: testsError } = await supabase
      .from('stack_tests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    results.stack_tests = { deleted: !testsError };
    
    // Delete all card_stacks
    const { error: stacksError, count: stacksCount } = await supabase
      .from('card_stacks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id', { count: 'exact', head: true } as any);
    results.card_stacks = { deleted: !stacksError, count: stacksCount };
    
    // Delete all generation_logs
    const { error: logsError } = await supabase
      .from('generation_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    results.generation_logs = { deleted: !logsError };
    
    // Delete all leaderboard_entries
    const { error: leaderboardError } = await supabase
      .from('leaderboard_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    results.leaderboard_entries = { deleted: !leaderboardError };
    
    // Delete all friendships
    const { error: friendshipsError } = await supabase
      .from('friendships')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    results.friendships = { deleted: !friendshipsError };
    
    // Delete all user_stats (will be recreated on login)
    const { error: statsError } = await supabase
      .from('user_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    results.user_stats = { deleted: !statsError };
    
    // Reset user_profiles progress fields (keep identity)
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .update({
        badges: [],
        has_seen_streak_tutorial: false,
        daily_generations_count: 0,
        updated_at: new Date().toISOString(),
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    results.user_profiles = { reset: !profilesError };
    
    // Clean up orphaned audio files in Supabase Storage
    let audioCleanupResult = { deleted: 0, total: 0 };
    try {
      if (supabaseServiceKey) {
        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
        
        // List all files in audio bucket
        const { data: audioFiles, error: listError } = await serviceClient.storage
          .from('audio')
          .list('', { limit: 10000 });
        
        if (!listError && audioFiles && audioFiles.length > 0) {
          // Since all flashcards are deleted, ALL audio files are orphaned
          const filesToDelete = audioFiles
            .filter(f => f.name && f.name.endsWith('.mp3'))
            .map(f => f.name);
          
          if (filesToDelete.length > 0) {
            // Delete in batches
            const batchSize = 100;
            let deletedCount = 0;
            
            for (let i = 0; i < filesToDelete.length; i += batchSize) {
              const batch = filesToDelete.slice(i, i + batchSize);
              const { error: deleteError } = await serviceClient.storage
                .from('audio')
                .remove(batch);
              
              if (!deleteError) {
                deletedCount += batch.length;
              }
            }
            
            audioCleanupResult = { deleted: deletedCount, total: audioFiles.length };
          }
        }
      }
    } catch (audioError: any) {
      console.error('[Admin Reset] Audio cleanup error:', audioError);
      // Continue even if audio cleanup fails
    }
    results.audio_storage = audioCleanupResult;

    // Get final counts
    const { count: remainingStacks } = await supabase
      .from('card_stacks')
      .select('id', { count: 'exact', head: true } as any);
    
    const { count: remainingCards } = await supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true } as any);
    
    const { count: remainingStats } = await supabase
      .from('user_stats')
      .select('id', { count: 'exact', head: true } as any);
    
    return NextResponse.json({
      success: true,
      message: 'All user data has been reset (including audio files)',
      results,
      remaining: {
        stacks: remainingStacks || 0,
        flashcards: remainingCards || 0,
        user_stats: remainingStats || 0,
      },
    });
    
  } catch (error: any) {
    console.error('[Admin Reset] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
