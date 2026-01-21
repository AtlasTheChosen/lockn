/**
 * Session Manager - Single Device Limit
 * 
 * Manages user sessions to ensure only one active session per account.
 * When a user logs in from a new device, all other sessions are invalidated.
 */

import { createClient } from '@/lib/supabase/client';

const SESSION_TOKEN_KEY = 'flashdash_session_token';
const SESSION_DEVICE_INFO_KEY = 'flashdash_device_info';

// ============================================================
// Device Info Collection
// ============================================================

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  timezone: string;
  timestamp: string;
}

/**
 * Collect device information for audit trail
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      platform: 'server',
      language: 'en',
      screenWidth: 0,
      screenHeight: 0,
      timezone: 'UTC',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Token Generation
// ============================================================

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for server-side (less secure, but shouldn't be used there)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// Local Storage Management
// ============================================================

/**
 * Store session token in localStorage
 */
export function storeSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

/**
 * Get session token from localStorage
 */
export function getStoredSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

/**
 * Clear session token from localStorage
 */
export function clearSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_DEVICE_INFO_KEY);
  }
}

// ============================================================
// Session Management
// ============================================================

export interface CreateSessionResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

/**
 * Create a new session for the user.
 * This will automatically invalidate all other sessions for this user.
 */
export async function createSession(userId: string): Promise<CreateSessionResult> {
  const supabase = createClient();
  
  try {
    const sessionToken = generateSessionToken();
    const deviceInfo = getDeviceInfo();
    
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        device_info: deviceInfo,
        is_valid: true,
      });
    
    if (error) {
      console.error('[SessionManager] Failed to create session:', error);
      return { success: false, error: error.message };
    }
    
    // Store token locally
    storeSessionToken(sessionToken);
    
    console.log('[SessionManager] Session created successfully');
    return { success: true, sessionToken };
  } catch (err: any) {
    console.error('[SessionManager] Exception creating session:', err);
    return { success: false, error: err.message };
  }
}

export interface ValidateSessionResult {
  isValid: boolean;
  invalidatedReason?: string;
}

/**
 * Validate the current session token against the database.
 * Returns whether the session is still valid.
 */
export async function validateSession(): Promise<ValidateSessionResult> {
  const sessionToken = getStoredSessionToken();
  
  if (!sessionToken) {
    return { isValid: false, invalidatedReason: 'no_token' };
  }
  
  const supabase = createClient();
  
  try {
    // Use the database function to check and update last_active_at
    const { data, error } = await supabase
      .rpc('check_session_valid', { p_session_token: sessionToken });
    
    if (error) {
      console.error('[SessionManager] Session validation error:', error);
      // If the function doesn't exist yet (migration not run), fall back to direct query
      return await validateSessionDirect(sessionToken);
    }
    
    if (data === true) {
      return { isValid: true };
    }
    
    // Session is invalid - get the reason
    const { data: sessionData } = await supabase
      .from('user_sessions')
      .select('invalidated_reason')
      .eq('session_token', sessionToken)
      .single();
    
    return { 
      isValid: false, 
      invalidatedReason: sessionData?.invalidated_reason || 'session_invalidated' 
    };
  } catch (err: any) {
    console.error('[SessionManager] Exception validating session:', err);
    return { isValid: false, invalidatedReason: 'validation_error' };
  }
}

/**
 * Fallback validation using direct query (for when RPC function isn't available)
 */
async function validateSessionDirect(sessionToken: string): Promise<ValidateSessionResult> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('is_valid, invalidated_reason')
      .eq('session_token', sessionToken)
      .single();
    
    if (error || !data) {
      return { isValid: false, invalidatedReason: 'session_not_found' };
    }
    
    if (!data.is_valid) {
      return { isValid: false, invalidatedReason: data.invalidated_reason || 'session_invalidated' };
    }
    
    // Update last_active_at
    await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('session_token', sessionToken);
    
    return { isValid: true };
  } catch (err: any) {
    console.error('[SessionManager] Direct validation error:', err);
    return { isValid: false, invalidatedReason: 'validation_error' };
  }
}

/**
 * Invalidate the current session (for logout)
 */
export async function invalidateCurrentSession(): Promise<boolean> {
  const sessionToken = getStoredSessionToken();
  
  if (!sessionToken) {
    return true; // No session to invalidate
  }
  
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_valid: false,
        invalidated_at: new Date().toISOString(),
        invalidated_reason: 'user_logout',
      })
      .eq('session_token', sessionToken);
    
    if (error) {
      console.error('[SessionManager] Failed to invalidate session:', error);
    }
    
    // Clear local token regardless
    clearSessionToken();
    
    return true;
  } catch (err: any) {
    console.error('[SessionManager] Exception invalidating session:', err);
    clearSessionToken();
    return false;
  }
}

/**
 * Get all sessions for the current user (for displaying in settings)
 */
export async function getUserSessions(userId: string): Promise<any[]> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[SessionManager] Failed to get user sessions:', error);
      return [];
    }
    
    return data || [];
  } catch (err: any) {
    console.error('[SessionManager] Exception getting sessions:', err);
    return [];
  }
}

/**
 * Check if a session token exists locally (quick check without DB call)
 */
export function hasLocalSession(): boolean {
  return getStoredSessionToken() !== null;
}
