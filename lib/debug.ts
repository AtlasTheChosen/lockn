/**
 * Comprehensive Debug Utility
 * Provides structured logging for all application components
 */

const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true';

type DebugCategory = 
  | 'AUTH' 
  | 'SESSION' 
  | 'NETWORK' 
  | 'TIMING' 
  | 'MIDDLEWARE' 
  | 'SERVER' 
  | 'CALLBACK'
  | 'GENERATION'
  | 'UI'
  | 'STORAGE'
  | 'API'
  | 'DATABASE'
  | 'CONFIG'
  | 'ERROR';

interface DebugOptions {
  category?: DebugCategory;
  data?: any;
  error?: any;
  timing?: number;
}

class DebugLogger {
  private enabled: boolean;

  constructor() {
    this.enabled = DEBUG_ENABLED;
  }

  private formatMessage(category: DebugCategory, message: string, options?: DebugOptions): string {
    const timestamp = new Date().toISOString();
    return `[DEBUG:${category}] ${timestamp} - ${message}`;
  }

  private log(category: DebugCategory, message: string, options?: DebugOptions, isError: boolean = false) {
    if (!this.enabled) return;

    const formattedMessage = this.formatMessage(category, message, options);
    
    if (isError || options?.error) {
      console.error(formattedMessage, options?.data || '', options?.error || '');
    } else if (options?.timing) {
      console.log(formattedMessage, options.data || '', `(${options.timing}ms)`);
    } else {
      console.log(formattedMessage, options?.data || '');
    }
  }

  // Category-specific methods
  auth(message: string, data?: any) {
    this.log('AUTH', message, { category: 'AUTH', data });
  }

  session(message: string, data?: any) {
    this.log('SESSION', message, { category: 'SESSION', data });
  }

  network(message: string, data?: any) {
    this.log('NETWORK', message, { category: 'NETWORK', data });
  }

  timing(label: string, startTime: number, data?: any) {
    const duration = Date.now() - startTime;
    this.log('TIMING', label, { category: 'TIMING', timing: duration, data });
  }

  middleware(message: string, data?: any) {
    this.log('MIDDLEWARE', message, { category: 'MIDDLEWARE', data });
  }

  server(message: string, data?: any) {
    this.log('SERVER', message, { category: 'SERVER', data });
  }

  callback(message: string, data?: any) {
    this.log('CALLBACK', message, { category: 'CALLBACK', data });
  }

  generation(message: string, data?: any) {
    this.log('GENERATION', message, { category: 'GENERATION', data });
  }

  ui(message: string, data?: any) {
    this.log('UI', message, { category: 'UI', data });
  }

  storage(message: string, data?: any) {
    this.log('STORAGE', message, { category: 'STORAGE', data });
  }

  api(message: string, data?: any) {
    this.log('API', message, { category: 'API', data });
  }

  // Error logging
  authError(message: string, error?: any, data?: any) {
    this.log('AUTH', message, { category: 'AUTH', error, data });
  }

  sessionError(message: string, error?: any, data?: any) {
    this.log('SESSION', message, { category: 'SESSION', error, data });
  }

  networkError(message: string, error?: any, data?: any) {
    this.log('NETWORK', message, { category: 'NETWORK', error, data });
  }

  apiError(message: string, error?: any, data?: any) {
    this.log('API', message, { category: 'API', error, data });
  }

  generationError(message: string, error?: any, data?: any) {
    this.log('GENERATION', message, { category: 'GENERATION', error, data });
  }

  database(message: string, data?: any) {
    this.log('DATABASE', message, { category: 'DATABASE', data });
  }

  databaseError(message: string, error?: any, data?: any) {
    this.log('DATABASE', message, { category: 'DATABASE', error, data }, true);
  }

  config(message: string, data?: any) {
    this.log('CONFIG', message, { category: 'CONFIG', data });
  }

  configError(message: string, error?: any, data?: any) {
    this.log('CONFIG', message, { category: 'CONFIG', error, data }, true);
  }

  // Utility methods
  checkSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasUrl = !!url;
    const hasKey = !!key;
    
    this.auth('Supabase Config Check', {
      hasUrl,
      hasKey,
      urlPreview: url ? `${url.substring(0, 30)}...` : 'MISSING',
    });

    return { url, key, hasUrl, hasKey };
  }

  async checkSession(supabase: any) {
    const startTime = Date.now();
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      this.timing('getSession()', startTime);
      this.session('Session check result', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at,
        error: error?.message,
      });
      return { session, error };
    } catch (error: any) {
      this.sessionError('Session check failed', error);
      return { session: null, error };
    }
  }

  async checkUser(supabase: any) {
    const startTime = Date.now();
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      this.timing('getUser()', startTime);
      this.session('User check result', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        error: error?.message,
      });
      return { user, error };
    } catch (error: any) {
      this.sessionError('User check failed', error);
      return { user: null, error };
    }
  }
}

// Server-side debug utility (for API routes and middleware)
export const DEBUG_SERVER = {
  enabled: DEBUG_ENABLED,
  log: (message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[DEBUG:SERVER] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  error: (message: string, error?: any, data?: any) => {
    if (DEBUG_ENABLED) {
      console.error(`[DEBUG:SERVER:ERROR] ${new Date().toISOString()} - ${message}`, data || '', error || '');
    }
  },
  api: (message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[DEBUG:API] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  apiError: (message: string, error?: any, data?: any) => {
    if (DEBUG_ENABLED) {
      console.error(`[DEBUG:API:ERROR] ${new Date().toISOString()} - ${message}`, data || '', error || '');
    }
  },
  generation: (message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[DEBUG:GENERATION] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  generationError: (message: string, error?: any, data?: any) => {
    if (DEBUG_ENABLED) {
      console.error(`[DEBUG:GENERATION:ERROR] ${new Date().toISOString()} - ${message}`, data || '', error || '');
    }
  },
  middleware: (message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[DEBUG:MIDDLEWARE] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  middlewareError: (message: string, error?: any, data?: any) => {
    if (DEBUG_ENABLED) {
      console.error(`[DEBUG:MIDDLEWARE:ERROR] ${new Date().toISOString()} - ${message}`, data || '', error || '');
    }
  },
  timing: (label: string, startTime: number, data?: any) => {
    if (DEBUG_ENABLED) {
      const duration = Date.now() - startTime;
      console.log(`[DEBUG:API:TIMING] ${new Date().toISOString()} - ${label} (${duration}ms)`, data || '');
    }
  },
};

// Client-side debug utility
export const DEBUG = new DebugLogger();

// Export for convenience
export default DEBUG;

