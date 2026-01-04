import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRandomAvatarId, getAvatarUrl } from '@/lib/avatars';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          // Create new profile for OAuth user
          // Try to get display name from OAuth metadata
          const oauthDisplayName = user.user_metadata?.full_name || 
                                    user.user_metadata?.name || 
                                    null;

          // Get OAuth avatar or generate random one
          const oauthAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
          const avatarUrl = oauthAvatarUrl || getAvatarUrl(getRandomAvatarId());

          try {
            await supabase.from('user_profiles').insert({
              id: user.id,
              email: user.email,
              display_name: oauthDisplayName,
              avatar_url: avatarUrl,
            });
          } catch (e) {
            console.error('Error creating profile:', e);
          }

          try {
            await supabase.from('user_stats').insert({
              user_id: user.id,
            });
          } catch (e) {
            console.error('Error creating stats:', e);
          }

          // If no display name from OAuth, redirect to set one
          if (!oauthDisplayName) {
            return NextResponse.redirect(`${origin}/onboarding?new=true`);
          }
        } else if (!existingProfile.display_name) {
          // Existing profile but no display name
          return NextResponse.redirect(`${origin}/onboarding?new=true`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
