
import { createClient } from '@supabase/supabase-js';

/**
 * Safely retrieves environment variables from Vite (import.meta.env) 
 * or Node/Vercel (process.env) contexts.
 */
const getEnvVar = (key: string): string => {
  // Check import.meta.env (Vite standard)
  const metaEnv = (import.meta as any).env?.[key];
  if (metaEnv) return metaEnv.trim();

  // Check process.env (Vercel/Node standard)
  const procEnv = (typeof process !== 'undefined' ? process.env : {}) as any;
  const val = procEnv[key];
  return typeof val === 'string' ? val.trim() : '';
};

// Check for both VITE_ and standard prefixes
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/**
 * Log status cleanly for debugging without throwing errors.
 */
if (isSupabaseConfigured) {
  console.log('%c✅ Gym Tracker: Cloud Sync Active', 'color: #10b981; font-weight: bold');
} else {
  console.log('%cℹ️ Gym Tracker: Running in Local Mode', 'color: #6366f1; font-weight: bold');
}

/**
 * Initialize the Supabase client. 
 * Returns null if configuration is missing to allow the app to fall back to local storage.
 */
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
