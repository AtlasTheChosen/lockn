import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from('user_profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
          });

          await supabase.from('user_stats').insert({
            user_id: user.id,
            total_cards_studied: 0,
            total_study_time: 0,
            current_streak: 0,
            longest_streak: 0,
          });
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
