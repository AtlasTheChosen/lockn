/**
 * Native fetch wrapper for Supabase REST API
 * 
 * The Supabase JS client (@supabase/ssr) hangs on Vercel production.
 * This utility uses native fetch which works reliably.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface FetchOptions {
  timeout?: number;
}

function getHeaders(accessToken?: string) {
  return {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${accessToken || supabaseKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch rows from a Supabase table
 */
export async function supabaseFetch<T = any>(
  table: string,
  query: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<{ data: T[] | null; error: Error | null }> {
  const { timeout = 10000 } = options;
  
  const params = new URLSearchParams({
    select: '*',
    ...query,
  });
  
  const url = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: new Error(`HTTP ${response.status}: ${errorText}`) };
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (e: any) {
    clearTimeout(timeoutId);
    return { data: null, error: e };
  }
}

/**
 * Fetch a single row from a Supabase table
 */
export async function supabaseFetchSingle<T = any>(
  table: string,
  query: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  const result = await supabaseFetch<T>(table, query, options);
  return {
    data: result.data?.[0] || null,
    error: result.error,
  };
}

/**
 * Insert a row into a Supabase table
 */
export async function supabaseInsert<T = any>(
  table: string,
  row: Record<string, any>,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  const { timeout = 10000 } = options;
  
  const url = `${supabaseUrl}/rest/v1/${table}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(row),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: new Error(`HTTP ${response.status}: ${errorText}`) };
    }
    
    const data = await response.json();
    return { data: data?.[0] || null, error: null };
  } catch (e: any) {
    clearTimeout(timeoutId);
    return { data: null, error: e };
  }
}

/**
 * Update rows in a Supabase table
 */
export async function supabaseUpdate<T = any>(
  table: string,
  query: Record<string, string>,
  updates: Record<string, any>,
  options: FetchOptions = {}
): Promise<{ data: T[] | null; error: Error | null }> {
  const { timeout = 10000 } = options;
  
  const params = new URLSearchParams(query);
  const url = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: new Error(`HTTP ${response.status}: ${errorText}`) };
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (e: any) {
    clearTimeout(timeoutId);
    return { data: null, error: e };
  }
}

