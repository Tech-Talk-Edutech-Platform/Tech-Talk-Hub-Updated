import { supabase } from '../supabase'
import { saveMyProfile } from './profile'

/**
 * Dashboard light/dark mode. The choice lives in two places:
 *
 * - this browser (`localStorage`), so a refresh or sign-in paints the right
 *   theme at once; `index.html` reads the same key before the app loads;
 * - the account (`users.theme`), so it follows the person to other devices.
 *
 * Only dashboards have dark styles, so the public site always stays light.
 */
export type Theme = 'light' | 'dark'

/** Also read by the inline script in `index.html`; keep the two in step. */
export const THEME_STORAGE_KEY = 'tth-theme'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

/** Paints the theme on the page and remembers it in this browser. */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}

/** Back to the light public site, keeping the saved choice for next time. */
export function clearPaintedTheme() {
  document.documentElement.classList.remove('dark')
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * The theme saved on the account, or null when none is saved yet (or the
 * `users.theme` column isn't there because its migration hasn't run).
 */
export async function loadAccountTheme(userId: string): Promise<Theme | null> {
  const { data, error } = await supabase
    .from('users')
    .select('theme')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return isTheme(data?.theme) ? data.theme : null
}

export async function saveAccountTheme(userId: string, theme: Theme) {
  try {
    await saveMyProfile(userId, { theme })
  } catch (error) {
    // The browser copy still holds it; only other devices miss out.
    console.warn('Couldn’t save the theme to the account:', error)
  }
}
