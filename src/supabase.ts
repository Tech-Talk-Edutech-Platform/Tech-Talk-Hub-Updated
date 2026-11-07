import { createClient } from '@supabase/supabase-js'

import type { Database } from './types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// Keep module initialization safe so React can render a setup page when local
// configuration is missing. App gates all Supabase-backed routes on the flag.
const clientUrl = supabaseUrl || 'http://127.0.0.1:54321'
const clientKey = supabaseKey || 'supabase-not-configured'

export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
})
