import { useSyncExternalStore } from 'react'

/**
 * Automatic Picture in Picture (Chrome and Edge 120+), what Google Meet
 * does: a page that is using the camera or microphone and registers the
 * "enterpictureinpicture" media session action is called when the user
 * switches to another tab, and may open its floating window then without a
 * click. Not in the DOM typings yet.
 */
export type PipMediaSession = {
  setActionHandler: (
    action: 'enterpictureinpicture',
    handler: (() => void) | null,
  ) => void
}

const isPipMediaSession = (value: unknown): value is PipMediaSession =>
  typeof value === 'object' &&
  value !== null &&
  'setActionHandler' in value &&
  typeof value.setActionHandler === 'function'

export function pipMediaSession(): PipMediaSession | null {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return null
  }
  const session: unknown = navigator.mediaSession
  return isPipMediaSession(session) ? session : null
}

let supported: boolean | null = null

/**
 * Whether this browser can pop the class out by itself. Browsers without
 * the action reject it (a TypeError); clearing it is otherwise a no-op.
 * Remembered, so the check never clears a handler the room registered.
 */
export function autoPipSupported(): boolean {
  if (supported !== null) return supported
  const session = pipMediaSession()
  if (!session) return (supported = false)
  try {
    session.setActionHandler('enterpictureinpicture', null)
    supported = true
  } catch {
    supported = false
  }
  return supported
}

// ── The user's choice, kept in this browser ─────────────────────────────

const KEY = 'tth:classroom:auto-pip'
const listeners = new Set<() => void>()
let enabled: boolean | null = null

function readSetting(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

const snapshot = () => (enabled ??= readSetting())

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setAutoPip(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  for (const listener of listeners) listener()
}

/** On unless the user turned it off in Settings. */
export function useAutoPip(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => true)
}
