import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/**
 * Returns the shared Supabase client, creating it on first use.
 *
 * Created lazily so a missing env var only breaks the sections that need
 * Supabase (they show their error state) instead of the whole page.
 */
export function getSupabase(): SupabaseClient {
  if (client) {
    return client
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    )
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return client
}
