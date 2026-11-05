import { useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/classroom/toast'

type PictureInPictureOptions = {
  cam: MediaStream | null
  screen: MediaStream | null
  /** Drawn on the fallback canvas when there is no camera or share. */
  initial: string
}

/**
 * Picture in Picture for the room. Pops out the screen share or camera when
 * there is one; otherwise draws your initial on a canvas and pops that out,
 * so the button always does something.
 */
export function usePictureInPicture({
  cam,
  screen,
  initial,
}: PictureInPictureOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasTimer = useRef(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const onEnter = () => setActive(true)
    const onLeave = () => {
      setActive(false)
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

  // Keep the popped-out window on the best source as cam/screen change.
  useEffect(() => {
    const video = videoRef.current
    if (!active || !video) return
    const source = screen ?? cam
    if (source && video.srcObject !== source) video.srcObject = source
  }, [active, cam, screen])

  const avatarStream = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 270
    const context = canvas.getContext('2d')
    const draw = () => {
      if (!context) return
      const styles = getComputedStyle(document.documentElement)
      context.fillStyle =
        styles.getPropertyValue('--color-stage').trim() || '#b34831'
      context.fillRect(0, 0, 480, 270)
      context.fillStyle =
        styles.getPropertyValue('--color-avatar').trim() || '#f7e3c8'
      context.fillRect(190, 85, 100, 100)
      context.fillStyle = '#1c1c1e'
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

  const togglePictureInPicture = async () => {
    const video = videoRef.current
    if (!video) return
    if (
      !document.pictureInPictureEnabled ||
      !('requestPictureInPicture' in video)
    ) {
      toast('Picture in Picture isn’t supported in this browser.')
      return
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        return
      }
      video.srcObject = screen ?? cam ?? avatarStream()
      await video.play()
      await video.requestPictureInPicture()
    } catch {
      toast('Couldn’t open Picture in Picture.')
    }
  }

  return {
    videoRef,
    active,
    toggle: () => {
      void togglePictureInPicture()
    },
  }
}
