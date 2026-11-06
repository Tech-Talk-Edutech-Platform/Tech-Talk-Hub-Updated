import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../types/database'

import { isSupabaseConfigured, supabase } from '../supabase'

// Single client instance for the whole app; a second createClient() call would
// start a second auth listener and token refresher in the same tab.
export { isSupabaseConfigured, supabase }

/**
 * Returns the shared Supabase client.
 *
 * Throws when env vars are missing so callers (e.g. landing-page sections)
 * can show their error state instead of querying the placeholder URL.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    )
  }

  return supabase
}
