/**
 * Shareable recording links.
 *
 * A copied link always points at our own `/recordings/<id>` page instead of
 * the file itself: classroom recordings live in a private bucket whose signed
 * URLs expire after an hour, and the page checks the viewer's access (the
 * same rules as the dashboards) every time it is opened.
 */

export const recordingSharePath = (id: string) => `/recordings/${id}`

export const recordingShareUrl = (id: string) =>
  `${window.location.origin}${recordingSharePath(id)}`

const RETURN_PATH_KEY = 'tth:return-path'

/** Only same-site paths, so a crafted link can't send anyone elsewhere. */
const isSafePath = (path: string) =>
  path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')

/** Remembers where to go back to once a signed-out visitor has logged in. */
export function rememberReturnPath(path: string) {
  if (!isSafePath(path)) return
  try {
    sessionStorage.setItem(RETURN_PATH_KEY, path)
  } catch {
    // Storage blocked: they land on their dashboard instead.
  }
}

/** The remembered path, if any; it is forgotten once read. */
export function takeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY)
    sessionStorage.removeItem(RETURN_PATH_KEY)
    return path && isSafePath(path) ? path : null
  } catch {
    return null
  }
}

/** Copies text, falling back to a hidden textarea where the API is blocked. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // Fall through (older browsers, non-secure contexts).
  }
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  const copied = document.execCommand('copy')
  field.remove()
  if (!copied) throw new Error('Copy failed')
}
