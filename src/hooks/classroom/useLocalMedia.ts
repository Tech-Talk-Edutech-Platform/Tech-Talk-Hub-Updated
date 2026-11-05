import { useEffect, useRef, useState } from 'react'
import {
  errorName,
  getMediaDevices,
  isUserCancel,
  stopStream,
} from '../../lib/classroom/media'
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
 * Camera, microphone and screen share for this device. Camera and mic start off,
 * like the reference room (both buttons shown in their "off" colour).
 */
export function useLocalMedia() {
  const [cam, setCam] = useState<MediaStream | null>(null)
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

  // Latest streams, so unmounting stops whatever is still live.
  const live = useRef({ cam, mic, screen })
  useEffect(() => {
    live.current = { cam, mic, screen }
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
    if (cam) {
      stopStream(cam)
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
    stopStream(cam)
    stopStream(mic)
    stopStream(screen)
    setCam(null)
    setMic(null)
    setScreen(null)
  }

  /** Switches device; a live camera or mic restarts on the new one. */
  const chooseDevice = (kind: DeviceKind, id: string) => {
    setDeviceIds((current) => ({ ...current, [kind]: id }))
    if (kind === 'videoinput' && cam) {
      stopStream(cam)
      setCam(null)
      void startCam(id)
    }
    if (kind === 'audioinput' && mic) {
      stopStream(mic)
      setMic(null)
      void startMic(id)
    }
  }

  return {
    cam,
    mic,
    screen,
    pending,
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
