import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { containsInappropriateContent } from '@/lib/content-filter';

export async function POST(request: NextRequest) {
  try {
    const { displayName, username } = await request.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates: any = {};

    // Validate and update display name
    if (displayName !== undefined) {
      const trimmedName = displayName.trim();
      
      if (!trimmedName) {
        return NextResponse.json(
          { error: 'Display name cannot be empty' },
          { status: 400 }
        );
      }

      if (trimmedName.length < 2 || trimmedName.length > 30) {
        return NextResponse.json(
          { error: 'Display name must be between 2 and 30 characters' },
          { status: 400 }
        );
      }

      // Check for inappropriate content
      if (containsInappropriateContent(trimmedName)) {
        return NextResponse.json(
          { error: 'Display name contains inappropriate content' },
          { status: 400 }
        );
      }

      // Only allow alphanumeric, spaces, underscores, and dashes
      if (!/^[a-zA-Z0-9\s_\-]+$/.test(trimmedName)) {
        return NextResponse.json(
          { error: 'Display name can only contain letters, numbers, spaces, underscores, and dashes' },
          { status: 400 }
        );
      }

      updates.display_name = trimmedName;
      updates.display_name_changed_at = new Date().toISOString();
    }

    // Validate and update username (if different from display name)
    // For now, username might be same as display_name in this app
    if (username !== undefined && username !== displayName) {
      const trimmedUsername = username.trim();
      
      if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
        return NextResponse.json(
          { error: 'Username must be between 2 and 30 characters' },
          { status: 400 }
        );
      }

      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedUsername)) {
        return NextResponse.json(
          { error: 'Username can only contain letters, numbers, underscores, and dashes' },
          { status: 400 }
        );
      }

      // Check if username is already taken (if you have a unique constraint)
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }

      updates.username = trimmedUsername;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Update profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      profile: data,
      message: 'Profile updated successfully' 
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
