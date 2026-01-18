/**
 * API Configuration for Mobile App Support
 * 
 * This file helps manage API URLs when the app runs in different environments:
 * - Web browser (development): Uses relative URLs (/api/...)
 * - Web browser (production): Uses relative URLs (/api/...)
 * - Mobile app (Capacitor): Uses absolute URLs (https://yourdomain.com/api/...)
 */

/**
 * Get the base URL for API requests
 * In Capacitor (mobile app), we need absolute URLs
 * In web browser, we can use relative URLs
 */
export function getApiBaseUrl(): string {
  // Check if we're running in Capacitor (mobile app)
  if (typeof window !== 'undefined') {
    // @ts-ignore - Capacitor global
    if (window.Capacitor) {
      // In mobile app, use the production API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        return apiUrl;
      }
      // Fallback: you should set NEXT_PUBLIC_API_URL in production
      console.warn('NEXT_PUBLIC_API_URL not set! API calls may fail in mobile app.');
      return '';
    }
  }
  
  // In web browser (development or production), use relative URLs
  return '';
}

/**
 * Get full API URL for a given path
 * @param path - API path (e.g., '/api/generate-stack')
 * @returns Full URL (e.g., 'https://yourdomain.com/api/generate-stack' or '/api/generate-stack')
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Helper to make API calls that work in both web and mobile
 * @param path - API path (e.g., '/api/generate-stack')
 * @param options - Fetch options (same as fetch())
 * @returns Promise<Response>
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = getApiUrl(path);
  return fetch(url, options);
}
