// Class recording: the browser asks which tab/window to capture ("Choose what
// to share"; this tab is offered first), the capture is recorded with the
// teacher's mic mixed in, and stopping hands back the file. useRecording
// downloads it and, for a real class, uploads it to Class Recordings.
import { getMediaDevices, isUserCancel } from './media'

/** Thrown by `startRecording` when the browser can't capture or record. */
export const RECORDING_UNSUPPORTED = 'unsupported'

const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4', // Safari records MP4 only
]

/**
 * ~1.5 Mbps video keeps an hour-long class near 700 MB, readable for screen
 * shares and coding, instead of the browser's default of 2.5+ Mbps.
 */
const VIDEO_BITS_PER_SECOND = 1_500_000
const AUDIO_BITS_PER_SECOND = 96_000

/** Chromium capture hints that the DOM typings don't describe yet. */
type DisplayMediaOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean
  selfBrowserSurface?: 'include' | 'exclude'
  surfaceSwitching?: 'include' | 'exclude'
  systemAudio?: 'include' | 'exclude'
}

type RecordingOptions = {
  micStream: MediaStream | null
  /** The browser's own "Stop sharing" bar ended the recording. */
  onEnded: (result: RecordingResult | null) => void
}

export type RecordingResult = {
  blob: Blob
  extension: 'webm' | 'mp4'
  /** Length of the recording in ms. */
  durationMs: number
}

export type RecordingController = {
  /** Resolves with the recording, or null if nothing was captured. */
  stop: () => Promise<RecordingResult | null>
  /** Swap the mixed-in microphone (the teacher turned it on, off or changed it). */
  setMic: (stream: MediaStream | null) => void
}

function pickMimeType() {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

const extensionFor = (mimeType: string) =>
  mimeType.includes('mp4') ? 'mp4' : 'webm'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Starts a recording. Resolves to a controller, or null when the user cancels
 * the browser's share picker.
 */
export async function startRecording({
  micStream,
  onEnded,
}: RecordingOptions): Promise<RecordingController | null> {
  const mediaDevices = getMediaDevices()
  if (
    !mediaDevices ||
    !('getDisplayMedia' in mediaDevices) ||
    !('MediaRecorder' in window) ||
    !('AudioContext' in window)
  ) {
    throw new Error(RECORDING_UNSUPPORTED)
  }

  // Create the mixer now, while the Record click still counts as a user
  // gesture. Created after the share picker closes, Chrome starts it
  // suspended and the recording's audio track is silent.
  const audioContext = new AudioContext()
  void audioContext.resume()
  const destination = audioContext.createMediaStreamDestination()

  const options: DisplayMediaOptions = {
    video: { frameRate: 30 },
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'include',
    systemAudio: 'include',
  }

  let display: MediaStream
  try {
    display = await mediaDevices.getDisplayMedia(options)
  } catch (error) {
    void audioContext.close()
    if (isUserCancel(error)) return null
    throw error
  }
  if (audioContext.state === 'suspended') await audioContext.resume()

  // Tab audio (the other participants, when this tab is shared) plus the mic.
  if (display.getAudioTracks().length) {
    audioContext.createMediaStreamSource(display).connect(destination)
  }
  let micSource: MediaStreamAudioSourceNode | null = null
  const setMic = (stream: MediaStream | null) => {
    micSource?.disconnect()
    micSource = null
    if (stream?.getAudioTracks().length && audioContext.state !== 'closed') {
      micSource = audioContext.createMediaStreamSource(stream)
      micSource.connect(destination)
    }
  }
  setMic(micStream)

  const stream = new MediaStream([
    ...display.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ])
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  const startedAt = Date.now()

  const finish = (): RecordingResult | null => {
    for (const track of display.getTracks()) track.stop()
    micSource?.disconnect()
    void audioContext.close()
    const [first] = chunks
    if (!first) return null
    const type = recorder.mimeType || first.type || 'video/webm'
    return {
      blob: new Blob(chunks, { type }),
      extension: extensionFor(type),
      durationMs: Date.now() - startedAt,
    }
  }

  let stopping: Promise<RecordingResult | null> | null = null
  const stop = () => {
    stopping ??= new Promise<RecordingResult | null>((resolve) => {
      if (recorder.state === 'inactive') {
        resolve(finish())
        return
      }
      recorder.onstop = () => resolve(finish())
      recorder.stop()
    })
    return stopping
  }

  // The browser's own "Stop sharing" bar ends the capture; treat it as Stop.
  display.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (!stopping) void stop().then(onEnded)
  })

  recorder.start(1000)
  return { stop, setMic }
}
