import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      status: 'error',
      error: 'Missing Supabase credentials',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test a simple query
    const startTime = Date.now();
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    const duration = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        status: 'error',
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase connection successful',
      profileCount: count,
      duration: `${duration}ms`,
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message,
      stack: err.stack?.substring(0, 200),
    }, { status: 500 });
  }
}

