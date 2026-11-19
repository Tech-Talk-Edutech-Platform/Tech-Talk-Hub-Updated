/**
 * Shareable recording links.
 *
 * A copied link points at our own public `/recordings/<id>` page, never at
 * the video file: classroom recordings live in a private bucket whose signed
 * URLs expire, so the page asks the server for a fresh one each visit.
 * Anyone with the link can watch; deleting the recording turns it off.
 */

export const recordingSharePath = (id: string) => `/recordings/${id}`

export const recordingShareUrl = (id: string) =>
  `${window.location.origin}${recordingSharePath(id)}`

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
