import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRandomAvatarId, getAvatarUrl } from '@/lib/avatars';

// This endpoint assigns random avatars to all users who don't have one
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user to verify they're authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users without avatars
    const { data: usersWithoutAvatars, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .or('avatar_url.is.null,avatar_url.eq.');

    if (fetchError) {
      throw fetchError;
    }

    if (!usersWithoutAvatars || usersWithoutAvatars.length === 0) {
      return NextResponse.json({ 
        message: 'All users already have avatars',
        updated: 0 
      });
    }

    // Update each user with a random avatar
    let updatedCount = 0;
    for (const userProfile of usersWithoutAvatars) {
      const avatarId = getRandomAvatarId();
      const avatarUrl = getAvatarUrl(avatarId);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userProfile.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      message: `Assigned avatars to ${updatedCount} users`,
      updated: updatedCount,
      total: usersWithoutAvatars.length
    });

  } catch (error: any) {
    console.error('Assign avatars error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign avatars' },
      { status: 500 }
    );
  }
}


