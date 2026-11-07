import type { SupabaseClient } from '@supabase/supabase-js'

import { supabase } from '../supabase'
import type { PlannedDatabase } from '../types/plannedTables'

/**
 * The app's Supabase client, typed with the planned schema in
 * `types/plannedTables.ts`. Only parked features use it: their queries against
 * planned tables and columns compile, but fail at runtime until a migration
 * creates them. Use `supabase` for everything else.
 */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the same client instance, retyped: the planned schema is the real one plus tables documented above as not existing yet
export const plannedDb = supabase as unknown as SupabaseClient<PlannedDatabase>
