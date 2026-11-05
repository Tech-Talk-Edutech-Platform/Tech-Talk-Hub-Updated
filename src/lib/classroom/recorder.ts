// Local class recording, the way the reference does it: the browser asks which
// tab/window to capture ("Choose what to share"), the capture is recorded with the
// teacher's mic mixed in, and stopping downloads a .webm file (.mp4 on Safari).
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import { getMediaDevices, isUserCancel } from './media'
import { fileDate } from './time'

/** Thrown by `startRecording` when the browser can't capture or record. */
export const RECORDING_UNSUPPORTED = 'unsupported'

const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4', // Safari records MP4 only
]

/** Chromium capture hints that the DOM typings don't describe yet. */
type DisplayMediaOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean
  selfBrowserSurface?: 'include' | 'exclude'
  surfaceSwitching?: 'include' | 'exclude'
}

type RecordingOptions = {
  micStream: MediaStream | null
  classroomId: string
  /** The browser's own "Stop sharing" bar ended the recording. */
  onEnded: () => void
}

export type RecordingController = { stop: () => Promise<void> }

function pickMimeType() {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

const extensionFor = (mimeType: string) =>
  mimeType.includes('mp4') ? 'mp4' : 'webm'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Starts a recording. Resolves to a controller, or null when the user cancels
 * the browser's share picker.
 */
export async function startRecording({
  micStream,
  classroomId,
  onEnded,
}: RecordingOptions): Promise<RecordingController | null> {
  const mediaDevices = getMediaDevices()
  if (
    !mediaDevices ||
    !('getDisplayMedia' in mediaDevices) ||
    !('MediaRecorder' in window)
  ) {
    throw new Error(RECORDING_UNSUPPORTED)
  }

  const options: DisplayMediaOptions = {
    video: { frameRate: 30 },
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'include',
  }

  let display: MediaStream
  try {
    display = await mediaDevices.getDisplayMedia(options)
  } catch (error) {
    if (isUserCancel(error)) return null
    throw error
  }

  // Mix tab audio (if shared) with the teacher's mic into one track.
  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()
  for (const source of [display, micStream]) {
    if (source?.getAudioTracks().length) {
      audioContext.createMediaStreamSource(source).connect(destination)
    }
  }

  const stream = new MediaStream([
    ...display.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ])
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  )
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }

  const finish = () => {
    for (const track of display.getTracks()) track.stop()
    void audioContext.close()
    const [first] = chunks
    if (!first) return
    const type = recorder.mimeType || first.type || 'video/webm'
    downloadBlob(
      new Blob(chunks, { type }),
      `${CLASSROOM_BRAND.fileSlug}-${classroomId}-${fileDate()}.${extensionFor(type)}`,
    )
  }

  let stopped = false
  const stop = () =>
    new Promise<void>((resolve) => {
      if (stopped) {
        resolve()
        return
      }
      stopped = true
      const done = () => {
        finish()
        resolve()
      }
      if (recorder.state === 'inactive') {
        done()
      } else {
        recorder.onstop = done
        recorder.stop()
      }
    })

  // The browser's own "Stop sharing" bar ends the capture; treat it as Stop.
  display.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (!stopped) void stop().then(onEnded)
  })

  recorder.start(1000)
  return { stop }
}
