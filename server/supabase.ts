import { createClient } from '@supabase/supabase-js'
import { requireServerEnv } from './env'

export const supabase = createClient(
  requireServerEnv('SUPABASE_URL'),
  requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
)
