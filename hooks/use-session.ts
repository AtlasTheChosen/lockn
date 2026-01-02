'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref to ensure single initialization
  const initialized = useRef(false);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    // Prevent double initialization
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    // Helper to fetch profile using native fetch with user's token
    const fetchProfile = async (userId: string, token: string) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn('[useSession] Profile fetch failed:', response.status);
          return null;
        }
        
        const data = await response.json();
        return data?.[0] || null;
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.warn('[useSession] Profile fetch timed out');
        } else {
          console.warn('[useSession] Profile exception:', e);
        }
        return null;
      }
    };

    // Helper to handle session
    const handleSession = async (session: any, source: string) => {
      if (session?.user && session?.access_token) {
        setUser(session.user);
        setAccessToken(session.access_token);
        const profileData = await fetchProfile(session.user.id, session.access_token);
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
        setAccessToken(null);
      }
      
      setLoading(false);
    };

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[useSession] getSession error:', error);
          setUser(null);
          setProfile(null);
          setAccessToken(null);
          setLoading(false);
          return;
        }

        await handleSession(session, 'Initial');
      } catch (e) {
        console.error('[useSession] Init error:', e);
        setUser(null);
        setProfile(null);
        setAccessToken(null);
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleSession(session, `Event: ${event}`);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty deps - run once only

  return { user, profile, accessToken, loading };
}
