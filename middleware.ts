import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { DEBUG_SERVER } from './lib/debug';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  DEBUG_SERVER.middleware(`Middleware: Processing request for ${pathname}`);

  const protectedRoutes = ['/dashboard', '/stack', '/admin', '/friends', '/leaderboard', '/account', '/profile'];
  const authRoutes = ['/auth/login', '/auth/signup'];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Create response first so we can set cookies on it
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware using request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = request.cookies.get(name)?.value;
          DEBUG_SERVER.middleware(`Middleware: Get cookie "${name}"`, { value: value ? 'exists' : 'not found' });
          return value;
        },
        set(name: string, value: string, options: CookieOptions) {
          DEBUG_SERVER.middleware(`Middleware: Set cookie "${name}"`, { value: 'set', options });
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          DEBUG_SERVER.middleware(`Middleware: Remove cookie "${name}"`, { options });
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  DEBUG_SERVER.middleware('Middleware: Getting user session...');
  console.log('[Middleware] Checking auth for:', pathname);
  
  // First check if there's a session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[Middleware] Session check:', { 
    hasSession: !!session, 
    userId: session?.user?.id,
    error: sessionError?.message 
  });
  
  const user = session?.user || null;
  const userError = sessionError;
  
  if (userError) {
    DEBUG_SERVER.middlewareError('Middleware: Error getting user', userError);
  }
  DEBUG_SERVER.middleware('Middleware: User check result', { hasUser: !!user, userId: user?.id });

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    DEBUG_SERVER.middleware(`Middleware: Protected route (${pathname}) and no user, redirecting to ${url.pathname}`);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    DEBUG_SERVER.middleware(`Middleware: Auth route (${pathname}) and user exists, redirecting to ${url.pathname}`);
    return NextResponse.redirect(url);
  }

  DEBUG_SERVER.middleware('Middleware: Request allowed to proceed.');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
