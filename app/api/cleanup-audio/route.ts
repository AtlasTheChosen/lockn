import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/cleanup-audio
 * 
 * Batch cleanup of orphaned audio files in Supabase Storage.
 * Compares files in storage against audio_hash values in flashcards table,
 * deletes any files that are no longer referenced.
 * 
 * This endpoint is designed to be called:
 * - Manually via admin action
 * - Via Vercel cron job (weekly/monthly)
 * 
 * Security: Uses service role key, should be protected in production
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key protection for production
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CLEANUP_API_KEY;
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Get all unique audio hashes currently in use
    console.log('[Cleanup] Fetching audio hashes in use...');
    const { data: hashData, error: hashError } = await supabase
      .from('flashcards')
      .select('audio_hash')
      .not('audio_hash', 'is', null);

    if (hashError) {
      console.error('[Cleanup] Error fetching hashes:', hashError);
      return NextResponse.json({ error: 'Failed to fetch audio hashes' }, { status: 500 });
    }

    // Create a Set of hashes in use (without .mp3 extension)
    const hashesInUse = new Set(
      (hashData || [])
        .map(row => row.audio_hash)
        .filter(Boolean)
    );
    
    console.log(`[Cleanup] Found ${hashesInUse.size} unique audio hashes in use`);

    // Step 2: List all files in the audio bucket
    console.log('[Cleanup] Listing files in storage...');
    const { data: storageFiles, error: listError } = await supabase.storage
      .from('audio')
      .list('', { limit: 10000 }); // Adjust limit as needed

    if (listError) {
      console.error('[Cleanup] Error listing storage:', listError);
      return NextResponse.json({ error: 'Failed to list storage files' }, { status: 500 });
    }

    if (!storageFiles || storageFiles.length === 0) {
      return NextResponse.json({
        message: 'No files in storage',
        deleted: 0,
        total: 0,
        inUse: hashesInUse.size,
      });
    }

    console.log(`[Cleanup] Found ${storageFiles.length} files in storage`);

    // Step 3: Find orphaned files (in storage but not in hashesInUse)
    const orphanedFiles: string[] = [];
    
    for (const file of storageFiles) {
      // Skip folders and non-mp3 files
      if (!file.name || !file.name.endsWith('.mp3')) continue;
      
      // Extract hash from filename (remove .mp3 extension)
      const hash = file.name.replace('.mp3', '');
      
      if (!hashesInUse.has(hash)) {
        orphanedFiles.push(file.name);
      }
    }

    console.log(`[Cleanup] Found ${orphanedFiles.length} orphaned files to delete`);

    // Step 4: Delete orphaned files in batches
    let deletedCount = 0;
    const batchSize = 100;
    const errors: string[] = [];

    for (let i = 0; i < orphanedFiles.length; i += batchSize) {
      const batch = orphanedFiles.slice(i, i + batchSize);
      
      const { error: deleteError } = await supabase.storage
        .from('audio')
        .remove(batch);

      if (deleteError) {
        console.error(`[Cleanup] Batch delete error:`, deleteError);
        errors.push(`Batch ${i / batchSize + 1}: ${deleteError.message}`);
      } else {
        deletedCount += batch.length;
        console.log(`[Cleanup] Deleted batch ${i / batchSize + 1}: ${batch.length} files`);
      }
    }

    const result = {
      message: 'Cleanup completed',
      deleted: deletedCount,
      total: storageFiles.length,
      inUse: hashesInUse.size,
      orphaned: orphanedFiles.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[Cleanup] Result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Cleanup] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for easy manual triggering (with same auth)
export async function GET(request: NextRequest) {
  return POST(request);
}

