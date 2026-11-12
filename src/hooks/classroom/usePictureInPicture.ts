import { useEffect, useRef, useState } from 'react'
import type { RemoteVideoTrack } from 'livekit-client'
import { toast } from '../../lib/classroom/toast'

/**
 * Document Picture-in-Picture (Chrome and Edge 116+): an always-on-top window
 * that holds page content, so the class keeps floating over other tabs and
 * apps until the user closes it. Not in the DOM typings yet.
 */
type DocumentPictureInPicture = {
  window: Window | null
  requestWindow: (options?: {
    width?: number
    height?: number
  }) => Promise<Window>
}

const isDocumentPip = (value: unknown): value is DocumentPictureInPicture =>
  typeof value === 'object' &&
  value !== null &&
  'requestWindow' in value &&
  typeof value.requestWindow === 'function'

function documentPip(): DocumentPictureInPicture | null {
  if (!('documentPictureInPicture' in window)) return null
  const api = window.documentPictureInPicture
  return isDocumentPip(api) ? api : null
}

/** Size of the floating window when it first opens; the user can resize it. */
const PIP_WINDOW = { width: 420, height: 340 }

/**
 * The floating window starts as a blank page: give it this page's styles and
 * the attributes they key off (dark mode, data-app="classroom").
 */
function preparePipDocument(pip: Window) {
  const target = pip.document
  const base = target.createElement('base')
  base.href = document.baseURI
  target.head.append(base)
  for (const node of Array.from(
    document.head.querySelectorAll('style, link[rel="stylesheet"]'),
  )) {
    target.head.append(target.importNode(node, true))
  }
  for (const { name, value } of Array.from(
    document.documentElement.attributes,
  )) {
    target.documentElement.setAttribute(name, value)
  }
  target.title = document.title
  target.body.className = 'm-0 h-dvh overflow-hidden bg-stage'
}

type PictureInPictureOptions = {
  cam: MediaStream | null
  screen: MediaStream | null
  /**
   * Someone else's video (their screen share or camera). The fallback window
   * shows it ahead of your own, since that's what you want to keep watching.
   */
  remote: RemoteVideoTrack | null
  /** Drawn on the fallback canvas when there is no video at all. */
  initial: string
}

/**
 * Picture in Picture for the room.
 *
 * Where the browser supports it, opens a floating window with the whole room
 * (everyone's video plus mic, camera and hand controls), rendered by the
 * caller into `pipWindow`. It stays on top when you switch tabs or click
 * elsewhere, and closes when you close it or leave the class.
 *
 * Elsewhere (Safari) it pops out one video: someone else's share or camera,
 * then your own, then your initial on a canvas.
 */
export function usePictureInPicture({
  cam,
  screen,
  remote,
  initial,
}: PictureInPictureOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasTimer = useRef(0)
  const [videoActive, setVideoActive] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const pipWindowRef = useRef<Window | null>(null)

  useEffect(() => {
    pipWindowRef.current = pipWindow
  }, [pipWindow])

  // Leaving the class closes the floating window with it.
  useEffect(
    () => () => {
      pipWindowRef.current?.close()
    },
    [],
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const onEnter = () => setVideoActive(true)
    const onLeave = () => {
      setVideoActive(false)
      clearInterval(canvasTimer.current)
    }
    video.addEventListener('enterpictureinpicture', onEnter)
    video.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter)
      video.removeEventListener('leavepictureinpicture', onLeave)
      clearInterval(canvasTimer.current)
    }
  }, [])

  // Fallback window: keep it on the best source as people share and stop.
  // Remote video is attached through LiveKit, which keeps it streaming while
  // this tab is in the background because the element is in Picture in
  // Picture.
  useEffect(() => {
    const video = videoRef.current
    if (!videoActive || !video) return undefined
    if (remote) {
      remote.attach(video)
      return () => {
        remote.detach(video)
      }
    }
    const source = screen ?? cam
    if (source && video.srcObject !== source) video.srcObject = source
    return undefined
  }, [videoActive, remote, cam, screen])

  const avatarStream = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 270
    const context = canvas.getContext('2d')
    const draw = () => {
      if (!context) return
      const styles = getComputedStyle(document.documentElement)
      context.fillStyle =
        styles.getPropertyValue('--color-stage').trim() || '#172554'
      context.fillRect(0, 0, 480, 270)
      context.fillStyle =
        styles.getPropertyValue('--color-avatar').trim() || '#e4e8ff'
      context.fillRect(190, 85, 100, 100)
      context.fillStyle =
        styles.getPropertyValue('--color-ink').trim() || '#172554'
      context.font = '48px "Figtree Variable", sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(initial, 240, 137)
    }
    draw()
    clearInterval(canvasTimer.current)
    canvasTimer.current = window.setInterval(draw, 1000)
    return canvas.captureStream(5)
  }

  const openFloatingWindow = async (api: DocumentPictureInPicture) => {
    const pip = await api.requestWindow(PIP_WINDOW)
    preparePipDocument(pip)
    pip.addEventListener('pagehide', () => setPipWindow(null), { once: true })
    setPipWindow(pip)
  }

  const openVideoWindow = async () => {
    const video = videoRef.current
    if (
      !video ||
      !document.pictureInPictureEnabled ||
      !('requestPictureInPicture' in video)
    ) {
      toast('Picture in Picture isn’t supported in this browser.')
      return
    }
    if (remote) remote.attach(video)
    else video.srcObject = screen ?? cam ?? avatarStream()
    try {
      await video.play()
      await video.requestPictureInPicture()
    } catch (error) {
      remote?.detach(video)
      throw error
    }
  }

  const togglePictureInPicture = async () => {
    try {
      if (pipWindow) {
        pipWindow.close()
        setPipWindow(null)
        return
      }
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        return
      }
      const api = documentPip()
      if (api) await openFloatingWindow(api)
      else await openVideoWindow()
    } catch {
      toast('Couldn’t open Picture in Picture.')
    }
  }

  return {
    videoRef,
    /** The floating window to render the room into, while it's open. */
    pipWindow,
    active: videoActive || pipWindow !== null,
    toggle: () => {
      void togglePictureInPicture()
    },
  }
}
