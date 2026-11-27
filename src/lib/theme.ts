import { saveMyProfile } from './profile'

/**
 * Dashboard light/dark mode. The account is the source of truth: the choice
 * is saved on `users.theme` and comes back with the profile when the
 * dashboard opens (see `loadDashboardIdentity`), so it follows the person,
 * not the browser.
 *
 * This browser also keeps a copy, tagged with whose choice it is, only so a
 * refresh paints the right theme before the profile arrives (`index.html`
 * reads the same key). Signing out forgets it, so the next person to sign in
 * on this browser starts from their own setting.
 *
 * Only dashboards have dark styles, so the public site always stays light.
 */
export type Theme = 'light' | 'dark'

/** Also read by the inline script in `index.html`; keep the two in step. */
export const THEME_STORAGE_KEY = 'tth-theme'

type StoredTheme = { user: string; theme: Theme }

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** This browser's copy, if it belongs to this person. */
function readStoredTheme(userId: string): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    const stored: unknown = raw ? JSON.parse(raw) : null
    if (
      typeof stored === 'object' &&
      stored !== null &&
      'user' in stored &&
      stored.user === userId &&
      'theme' in stored &&
      isTheme(stored.theme)
    ) {
      return stored.theme
    }
  } catch {
    // Storage blocked, or an old untagged value: not this person's.
  }
  return null
}

/**
 * The theme to show this person: what their account says, else what they
 * last picked in this browser (a save that hadn't reached the account),
 * else light. Another person's choice in this browser never counts.
 */
export function resolveTheme(userId: string, accountTheme: unknown): Theme {
  if (isTheme(accountTheme)) return accountTheme
  return readStoredTheme(userId) ?? 'light'
}

/** Paints the theme on the page and remembers it for this person here. */
export function applyTheme(theme: Theme, userId: string) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    const stored: StoredTheme = { user: userId, theme }
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}

/** Back to the light public site. */
export function clearPaintedTheme() {
  document.documentElement.classList.remove('dark')
}

/** On sign-out: forget this browser's copy so it can't carry to the next account. */
export function forgetStoredTheme() {
  clearPaintedTheme()
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    // Storage blocked: nothing was stored.
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export async function saveAccountTheme(userId: string, theme: Theme) {
  try {
    await saveMyProfile(userId, { theme })
  } catch (error) {
    // The browser copy still holds it; only other devices miss out.
    console.warn('Couldn’t save the theme to the account:', error)
  }
}
