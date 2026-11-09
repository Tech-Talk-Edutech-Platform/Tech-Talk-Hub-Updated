import { useEffect, useRef } from 'react'
import type { RemoteVideoTrack } from 'livekit-client'

type VideoViewProps = {
  stream: MediaStream | null
  track?: RemoteVideoTrack | null
  mirror?: boolean
  fit?: 'cover' | 'contain'
  className?: string
}

/** A muted, autoplaying <video> showing a live stream. */
export function VideoView({
  stream,
  track = null,
  mirror = false,
  fit = 'cover',
  className = '',
}: VideoViewProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return undefined

    if (track) {
      track.attach(video)
      return () => {
        track.detach(video)
      }
    }

    video.srcObject = stream
    return () => {
      if (video.srcObject === stream) video.srcObject = null
    }
  }, [stream, track])

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={`size-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${mirror ? '-scale-x-100' : ''} ${className}`}
    />
  )
}
