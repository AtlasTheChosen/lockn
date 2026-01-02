'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    // Get session on load to persist authentication
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Session exists, refresh to ensure it's current (but don't block)
          supabase.auth.refreshSession().catch((error) => {
            console.warn('Error refreshing session on init:', error);
          });
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };

    initializeSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.refresh();
      }

      if (event === 'SIGNED_OUT') {
        // Don't do anything - the logout handler does the redirect
        // Calling router.push/refresh here causes race conditions
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Always render children - don't conditionally return null
  return <>{children}</>;
}
