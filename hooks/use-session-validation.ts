'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  validateSession, 
  hasLocalSession, 
  clearSessionToken,
  ValidateSessionResult 
} from '@/lib/session-manager';

// How often to check session validity (in milliseconds)
const VALIDATION_INTERVAL = 30000; // 30 seconds

export interface SessionValidationState {
  isChecking: boolean;
  isValid: boolean | null; // null = not yet checked
  wasKickedOut: boolean;
  kickedOutReason: string | null;
}

export interface UseSessionValidationResult extends SessionValidationState {
  checkNow: () => Promise<void>;
  acknowledgeKickout: () => void;
  startValidation: () => void;
  stopValidation: () => void;
}

/**
 * Hook for monitoring session validity and detecting when user is kicked out.
 * 
 * Usage:
 * ```tsx
 * const { wasKickedOut, kickedOutReason, acknowledgeKickout } = useSessionValidation();
 * 
 * if (wasKickedOut) {
 *   return <KickedOutModal reason={kickedOutReason} onAcknowledge={acknowledgeKickout} />;
 * }
 * ```
 */
export function useSessionValidation(): UseSessionValidationResult {
  const [state, setState] = useState<SessionValidationState>({
    isChecking: false,
    isValid: null,
    wasKickedOut: false,
    kickedOutReason: null,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isValidating = useRef(false);

  /**
   * Check session validity against the database
   */
  const checkNow = useCallback(async () => {
    // Prevent concurrent checks
    if (isValidating.current) return;
    
    // Skip if no local session token
    if (!hasLocalSession()) {
      setState(prev => ({ ...prev, isValid: null, isChecking: false }));
      return;
    }
    
    isValidating.current = true;
    setState(prev => ({ ...prev, isChecking: true }));
    
    try {
      const result: ValidateSessionResult = await validateSession();
      
      if (result.isValid) {
        setState(prev => ({
          ...prev,
          isChecking: false,
          isValid: true,
          wasKickedOut: false,
          kickedOutReason: null,
        }));
      } else {
        // Session was invalidated
        console.log('[SessionValidation] Session invalid:', result.invalidatedReason);
        
        // Only show kicked out if reason is new_session_created
        const wasKicked = result.invalidatedReason === 'new_session_created';
        
        setState(prev => ({
          ...prev,
          isChecking: false,
          isValid: false,
          wasKickedOut: wasKicked,
          kickedOutReason: wasKicked ? result.invalidatedReason : null,
        }));
        
        // Clear local token if session is invalid
        if (!result.isValid) {
          clearSessionToken();
        }
      }
    } catch (err) {
      console.error('[SessionValidation] Check failed:', err);
      setState(prev => ({ ...prev, isChecking: false }));
    } finally {
      isValidating.current = false;
    }
  }, []);

  /**
   * Start periodic validation
   */
  const startValidation = useCallback(() => {
    // Stop any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Do an immediate check
    checkNow();
    
    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      checkNow();
    }, VALIDATION_INTERVAL);
    
    console.log('[SessionValidation] Started periodic validation');
  }, [checkNow]);

  /**
   * Stop periodic validation
   */
  const stopValidation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log('[SessionValidation] Stopped periodic validation');
  }, []);

  /**
   * Acknowledge the kickout (dismiss the modal)
   */
  const acknowledgeKickout = useCallback(() => {
    setState(prev => ({
      ...prev,
      wasKickedOut: false,
      kickedOutReason: null,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Check on visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasLocalSession()) {
        checkNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkNow]);

  return {
    ...state,
    checkNow,
    acknowledgeKickout,
    startValidation,
    stopValidation,
  };
}
