
import { createClient } from '@supabase/supabase-js';

/**
 * Safely retrieves environment variables from various possible sources.
 */
const getEnvVar = (key: string): string => {
  const env = (typeof process !== 'undefined' ? process.env : {}) as any;
  const meta = (import.meta as any)?.env || {};
  const value = env[key] || meta[key] || '';
  return typeof value === 'string' ? value.trim() : '';
};

// Check for standard prefixes
const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/**
 * Log status cleanly without triggering "Error" flags in the console.
 */
if (isSupabaseConfigured) {
  console.log('%c✅ Gym Tracker: Cloud Sync Active', 'color: #10b981; font-weight: bold');
} else {
  console.log('%cℹ️ Gym Tracker: Running in Local Mode', 'color: #6366f1; font-weight: bold');
  console.log('Note: To enable cloud sync, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your hosting environment.');
}

/**
 * Initialize the Supabase client. 
 * Returns null if configuration is missing to allow the app to fall back to local storage.
 */
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
