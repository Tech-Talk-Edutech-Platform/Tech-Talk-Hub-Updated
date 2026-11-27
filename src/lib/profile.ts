import { supabase } from '../supabase'
import type { Theme } from './theme'

export type SavedProfile = {
  full_name: string
  theme: string | null
  avatar_url: string | null
  /** Sign-in name; undefined until the username migration has run. */
  username?: string | null
}

type ProfileChanges = {
  fullName?: string
  theme?: Theme
  avatarUrl?: string
}

const AVATAR_BUCKET = 'profiles'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
/** PostgREST: the function isn't in the schema (its migration hasn't run). */
const FUNCTION_MISSING = 'PGRST202'
/** Postgres: the column doesn't exist (its migration hasn't run). */
const COLUMN_MISSING = '42703'

function isSavedProfile(value: unknown): value is SavedProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'full_name' in value &&
    typeof value.full_name === 'string'
  )
}

/**
 * Saves the signed-in person's own name, theme or avatar and returns what the
 * database now holds. Throws when nothing was saved, so the app never shows
 * "saved" for a change that didn't stick.
 */
export async function saveMyProfile(
  userId: string,
  changes: ProfileChanges,
): Promise<SavedProfile> {
  const { data, error } = await supabase.rpc('update_my_profile', {
    p_full_name: changes.fullName,
    p_theme: changes.theme,
    p_avatar_url: changes.avatarUrl,
  })
  if (!error && isSavedProfile(data)) return data
  if (error && error.code !== FUNCTION_MISSING) throw new Error(error.message)

  // Before migration 20261127120000: write the row directly, and check a row
  // really came back (a blocked update reports no error and saves nothing).
  const { data: row, error: updateError } = await supabase
    .from('users')
    .update({
      ...(changes.fullName === undefined
        ? {}
        : { full_name: changes.fullName.trim() }),
      ...(changes.theme === undefined ? {} : { theme: changes.theme }),
      ...(changes.avatarUrl === undefined
        ? {}
        : { avatar_url: changes.avatarUrl }),
    })
    .eq('id', userId)
    .select('full_name, theme, avatar_url')
    .maybeSingle()
  if (updateError) throw new Error(updateError.message)
  if (!row) {
    throw new Error(
      'Your change wasn’t saved. Ask an admin to check your account permissions.',
    )
  }
  return row
}

/** The signed-in person's saved name, theme and avatar. */
export async function loadMyProfile(
  userId: string,
  signal?: AbortSignal,
): Promise<SavedProfile | null> {
  let query = supabase
    .from('users')
    .select('full_name, avatar_url, username')
    .eq('id', userId)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (!error) return data ? { ...data, theme: null } : null
  if (error.code !== COLUMN_MISSING) throw new Error(error.message)

  // Before migration 20261127140000 there is no username column.
  let fallback = supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', userId)
  if (signal) fallback = fallback.abortSignal(signal)
  const { data: row, error: fallbackError } = await fallback.maybeSingle()
  if (fallbackError) throw new Error(fallbackError.message)
  return row ? { ...row, theme: null } : null
}

/** What a username must look like (the database checks the same). */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,23}$/

/** Why this can't be a username, or null when it's fine (empty clears it). */
export function usernameProblem(username: string): string | null {
  const value = username.trim().toLowerCase()
  if (value === '' || USERNAME_PATTERN.test(value)) return null
  if (value.length < 3) return 'Use at least 3 characters.'
  if (value.length > 24) return 'Use 24 characters or fewer.'
  if (!/^[a-z0-9]/.test(value)) return 'Start with a letter or number.'
  return 'Use only letters, numbers, dots and underscores.'
}

/** Sets (or, with an empty string, clears) the signed-in person's username. */
export async function saveMyUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_my_username', {
    p_username: username.trim().toLowerCase(),
  })
  if (error) {
    throw new Error(
      error.code === FUNCTION_MISSING
        ? 'Usernames aren’t set up yet. Ask an admin to run the username migration.'
        : error.message,
    )
  }
  return data || null
}

/** Why this file can't be an avatar, or null when it's fine. */
export function avatarFileProblem(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Choose an image file.'
  if (file.size > MAX_AVATAR_BYTES) return 'Choose an image under 2 MB.'
  return null
}

/** Uploads a new avatar to avatars/<user id>/ and saves it on the profile. */
export async function uploadMyAvatar(userId: string, file: File) {
  const problem = avatarFileProblem(file)
  if (problem) throw new Error(problem)
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `avatars/${userId}/${Date.now()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) {
    throw new Error(
      /bucket not found/i.test(uploadError.message)
        ? 'Avatar storage isn’t set up yet. Ask an admin to run the account settings migration.'
        : uploadError.message,
    )
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return saveMyProfile(userId, { avatarUrl: publicUrl })
}
