/** `navigator.mediaDevices` is missing on insecure origins (plain http). */
export function getMediaDevices(): MediaDevices | undefined {
  return 'mediaDevices' in navigator ? navigator.mediaDevices : undefined
}

/** The DOMException name of a failed media call ("NotAllowedError", …). */
export function errorName(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string'
    ? error.name
    : undefined
}

/** True when the person closed the browser's permission or share picker. */
export function isUserCancel(error: unknown) {
  const name = errorName(error)
  return name === 'NotAllowedError' || name === 'AbortError'
}

export function stopStream(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) track.stop()
}
