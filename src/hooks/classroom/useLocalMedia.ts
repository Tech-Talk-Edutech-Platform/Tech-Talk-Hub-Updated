import { useEffect, useRef, useState } from 'react'
import {
  errorName,
  getMediaDevices,
  isUserCancel,
  stopStream,
} from '../../lib/classroom/media'
import {
  BackgroundProcessor,
  NO_EFFECT,
  preloadBackgroundModel,
  type BackgroundEffect,
} from '../../lib/classroom/backgroundEffects'
import { toast } from '../../lib/classroom/toast'

type DeviceKind = 'videoinput' | 'audioinput'

type DeviceLists = Record<MediaDeviceKind, MediaDeviceInfo[]>

type Pending = { cam: boolean; mic: boolean; screen: boolean }

const NO_DEVICES: DeviceLists = {
  videoinput: [],
  audioinput: [],
  audiooutput: [],
}

function explain(kind: 'Camera' | 'Microphone', error: unknown) {
  const name = errorName(error)
  const device = kind.toLowerCase()
  if (name === 'NotAllowedError') {
    return `${kind} blocked. Allow ${device} access from the icon in your address bar, then try again.`
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return `No ${device} found. Plug one in or pick another in Settings.`
  }
  if (name === 'NotReadableError') {
    return `Your ${device} is in use by another app. Close it and try again.`
  }
  return `Couldn’t start your ${device}.`
}

async function listDevices(mediaDevices: MediaDevices) {
  const group: DeviceLists = { videoinput: [], audioinput: [], audiooutput: [] }
  for (const device of await mediaDevices.enumerateDevices()) {
    group[device.kind].push(device)
  }
  return group
}

/**
 * Blurs or replaces the camera's background. Returns the processed stream once
 * it's running, and null while it starts (so the unprocessed room is never
 * shown or published in between).
 */
function useBackgroundProcessing(
  rawCam: MediaStream | null,
  effect: BackgroundEffect,
  onFailed: () => void,
) {
  const active = effect.kind !== 'none'
  const [processed, setProcessed] = useState<{
    source: MediaStream
    stream: MediaStream
  } | null>(null)
  const processorRef = useRef<BackgroundProcessor | null>(null)
  const latest = useRef({ effect, onFailed })
  useEffect(() => {
    latest.current = { effect, onFailed }
  })

  // One processor per camera stream; it lives while an effect is on.
  useEffect(() => {
    if (!rawCam || !active) return undefined
    const run: {
      cancelled: boolean
      processor: BackgroundProcessor | null
    } = { cancelled: false, processor: null }
    void BackgroundProcessor.create(rawCam, latest.current.effect)
      .then((created) => {
        if (run.cancelled) {
          created.stop()
          return
        }
        run.processor = created
        processorRef.current = created
        setProcessed({ source: rawCam, stream: created.stream })
      })
      .catch((error: unknown) => {
        if (run.cancelled) return
        console.error('Background effects failed to start:', error)
        latest.current.onFailed()
      })
    return () => {
      run.cancelled = true
      run.processor?.stop()
      if (processorRef.current === run.processor) processorRef.current = null
    }
  }, [rawCam, active])

  // Switching between effects reuses the running processor (no re-publish).
  useEffect(() => {
    processorRef.current?.setEffect(effect)
  }, [effect])

  if (!rawCam) return { stream: null, starting: false }
  if (!active) return { stream: rawCam, starting: false }
  const ready = processed?.source === rawCam ? processed.stream : null
  return { stream: ready, starting: !ready }
}

/**
 * Camera, microphone and screen share for this device. Camera and mic start off,
 * like the reference room (both buttons shown in their "off" colour).
 */
export function useLocalMedia() {
  // The camera as captured; `cam` below is what everyone sees (with effects).
  const [rawCam, setCam] = useState<MediaStream | null>(null)
  const [mic, setMic] = useState<MediaStream | null>(null)
  const [screen, setScreen] = useState<MediaStream | null>(null)
  const [pending, setPending] = useState<Pending>({
    cam: false,
    mic: false,
    screen: false,
  })
  const [devices, setDevices] = useState<DeviceLists>(NO_DEVICES)
  const [deviceIds, setDeviceIds] = useState<Record<MediaDeviceKind, string>>({
    videoinput: '',
    audioinput: '',
    audiooutput: '',
  })
  const [mirror, setMirror] = useState(true)
  const [background, setBackgroundState] = useState<BackgroundEffect>(NO_EFFECT)
  const processing = useBackgroundProcessing(rawCam, background, () => {
    toast(
      'Background effects couldn’t start on this device. Showing your camera as is.',
    )
    setBackgroundState(NO_EFFECT)
  })
  const cam = processing.stream

  // Latest streams, so unmounting stops whatever is still live.
  const live = useRef({ cam: rawCam, mic, screen })
  useEffect(() => {
    live.current = { cam: rawCam, mic, screen }
  })
  useEffect(
    () => () => {
      const streams = live.current
      stopStream(streams.cam)
      stopStream(streams.mic)
      stopStream(streams.screen)
    },
    [],
  )

  useEffect(() => {
    const mediaDevices = getMediaDevices()
    if (!mediaDevices) return undefined
    const refresh = () => {
      void listDevices(mediaDevices).then(setDevices)
    }
    refresh()
    mediaDevices.addEventListener('devicechange', refresh)
    return () => mediaDevices.removeEventListener('devicechange', refresh)
  }, [])

  // Device names only appear once access is granted, so re-list after each grant.
  const refreshDevices = () => {
    const mediaDevices = getMediaDevices()
    if (mediaDevices) void listDevices(mediaDevices).then(setDevices)
  }

  const startCam = async (deviceId = deviceIds.videoinput) => {
    setPending((p) => ({ ...p, cam: true }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      })
      setCam(stream)
      refreshDevices()
    } catch (error) {
      toast(explain('Camera', error))
    } finally {
      setPending((p) => ({ ...p, cam: false }))
    }
  }

  const startMic = async (deviceId = deviceIds.audioinput) => {
    setPending((p) => ({ ...p, mic: true }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      })
      setMic(stream)
      refreshDevices()
    } catch (error) {
      toast(explain('Microphone', error))
    } finally {
      setPending((p) => ({ ...p, mic: false }))
    }
  }

  const startScreen = async (mediaDevices: MediaDevices) => {
    setPending((p) => ({ ...p, screen: true }))
    try {
      const stream = await mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
      stream
        .getVideoTracks()[0]
        ?.addEventListener('ended', () => setScreen(null))
      setScreen(stream)
    } catch (error) {
      if (!isUserCancel(error)) toast('Couldn’t start screen sharing.')
    } finally {
      setPending((p) => ({ ...p, screen: false }))
    }
  }

  const toggleCam = () => {
    if (rawCam) {
      stopStream(rawCam)
      setCam(null)
    } else if (!pending.cam) {
      void startCam()
    }
  }

  const toggleMic = () => {
    if (mic) {
      stopStream(mic)
      setMic(null)
    } else if (!pending.mic) {
      void startMic()
    }
  }

  const toggleScreen = () => {
    if (screen) {
      stopStream(screen)
      setScreen(null)
      return
    }
    const mediaDevices = getMediaDevices()
    if (!mediaDevices || !('getDisplayMedia' in mediaDevices)) {
      toast('Screen sharing isn’t supported in this browser.')
      return
    }
    void startScreen(mediaDevices)
  }

  const stopAll = () => {
    stopStream(rawCam)
    stopStream(mic)
    stopStream(screen)
    setCam(null)
    setMic(null)
    setScreen(null)
  }

  /** Switches device; a live camera or mic restarts on the new one. */
  const chooseDevice = (kind: DeviceKind, id: string) => {
    setDeviceIds((current) => ({ ...current, [kind]: id }))
    if (kind === 'videoinput' && rawCam) {
      stopStream(rawCam)
      setCam(null)
      void startCam(id)
    }
    if (kind === 'audioinput' && mic) {
      stopStream(mic)
      setMic(null)
      void startMic(id)
    }
  }

  /** Blur or replace the background; starts loading the model right away. */
  const setBackground = (effect: BackgroundEffect) => {
    if (effect.kind !== 'none') {
      preloadBackgroundModel().catch(() => {
        // Reported when the processor tries to start.
      })
    }
    setBackgroundState(effect)
  }

  return {
    cam,
    mic,
    screen,
    // A camera that's on but still applying its background counts as starting.
    pending: { ...pending, cam: pending.cam || processing.starting },
    background,
    setBackground,
    devices,
    deviceIds,
    mirror,
    setMirror,
    toggleCam,
    toggleMic,
    toggleScreen,
    chooseDevice,
    stopAll,
  }
}

export type LocalMedia = ReturnType<typeof useLocalMedia>
