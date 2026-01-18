import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAvatarUrl, AVATAR_COUNT } from '@/lib/avatars';

// Use service role key to bypass RLS for mass updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This endpoint migrates all existing users to new robot avatars
export async function POST() {
  try {
    // Use service role client to bypass RLS
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get all users (we'll update all avatars to new robot avatars)
    const { data: allUsers, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, avatar_url');

    if (fetchError) {
      throw fetchError;
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ 
        message: 'No users found',
        updated: 0 
      });
    }

    // Update ALL users with a deterministic avatar based on user ID (1-20)
    // This ensures each user gets a consistent avatar that doesn't change on re-run
    let updatedCount = 0;
    const errors: string[] = [];
    
    for (const userProfile of allUsers) {
      try {
        // Use deterministic assignment: hash user ID to get avatar index 0-19
        // This ensures same user always gets same avatar, but distributes across all 20
        const hash = userProfile.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const avatarId = hash % AVATAR_COUNT; // 0-19
        const avatarUrl = getAvatarUrl(avatarId);

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', userProfile.id);

        if (updateError) {
          console.error(`Failed to update avatar for user ${userProfile.id}:`, updateError);
          errors.push(`${userProfile.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (err: any) {
        console.error(`Exception updating avatar for user ${userProfile.id}:`, err);
        errors.push(`${userProfile.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      message: `Migrated ${updatedCount} out of ${allUsers.length} users to new robot avatars`,
      updated: updatedCount,
      total: allUsers.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined // Show first 5 errors
    });

  } catch (error: any) {
    console.error('Migrate avatars error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate avatars' },
      { status: 500 }
    );
  }
}
