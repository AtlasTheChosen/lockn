'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSessionValidation } from '@/hooks/use-session-validation';
import { invalidateCurrentSession, hasLocalSession } from '@/lib/session-manager';
import KickedOutModal from './KickedOutModal';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Session validation for single-device limit
  const { 
    wasKickedOut, 
    acknowledgeKickout, 
    startValidation, 
    stopValidation 
  } = useSessionValidation();

  // Handle when user is kicked out
  const handleKickoutAcknowledge = useCallback(async () => {
    const supabase = createClient();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Acknowledge the kickout (clears modal state)
    acknowledgeKickout();
    
    // Redirect to home
    router.push('/');
    router.refresh();
  }, [acknowledgeKickout, router]);

  useEffect(() => {
    const supabase = createClient();

    // Get session on load to persist authentication
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          
          // Start session validation if user has a local session token
          if (hasLocalSession()) {
            startValidation();
          }
          
          // Session exists, refresh to ensure it's current (but don't block)
          supabase.auth.refreshSession().catch((error) => {
            console.warn('Error refreshing session on init:', error);
          });
        } else {
          setIsAuthenticated(false);
          stopValidation();
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };

    initializeSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        
        // Start session validation when user signs in
        if (hasLocalSession()) {
          startValidation();
        }
        
        router.refresh();
      }

      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        
        // Stop validation and clear session token on sign out
        stopValidation();
        await invalidateCurrentSession();
        
        // Don't do anything - the logout handler does the redirect
        // Calling router.push/refresh here causes race conditions
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopValidation();
    };
  }, [router, pathname, startValidation, stopValidation]);

  return (
    <>
      {children}
      
      {/* Kicked Out Modal - shown when another device signs in */}
      <KickedOutModal 
        isOpen={wasKickedOut && isAuthenticated} 
        onAcknowledge={handleKickoutAcknowledge}
      />
    </>
  );
}
