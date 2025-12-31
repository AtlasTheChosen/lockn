'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref to ensure single initialization
  const initialized = useRef(false);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    // Prevent double initialization
    if (initialized.current) {
      console.log('[useSession] Already initialized, skipping');
      return;
    }
    initialized.current = true;

    console.log('[useSession] Initializing (once)...');

    // Helper to fetch profile
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.warn('[useSession] Profile error:', error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn('[useSession] Profile exception:', e);
        return null;
      }
    };

    // Helper to handle session
    const handleSession = async (session: any, source: string) => {
      console.log(`[useSession] ${source}:`, { 
        hasSession: !!session, 
        userId: session?.user?.id 
      });

      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
        console.log(`[useSession] ${source} - User set:`, session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        console.log(`[useSession] ${source} - No user`);
      }
      
      setLoading(false);
      console.log(`[useSession] ${source} - Loading: false`);
    };

    // Get initial session
    const initSession = async () => {
      try {
        console.log('[useSession] Calling getSession...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[useSession] getSession error:', error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        await handleSession(session, 'Initial');
      } catch (e) {
        console.error('[useSession] Init error:', e);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useSession] Auth event:', event);
      await handleSession(session, `Event: ${event}`);
    });

    return () => {
      subscription.unsubscribe();
      console.log('[useSession] Unsubscribed');
    };
  }, []); // Empty deps - run once only

  return { user, profile, loading };
}
