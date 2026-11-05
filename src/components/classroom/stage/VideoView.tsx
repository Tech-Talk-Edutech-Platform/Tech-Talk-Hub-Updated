import { useEffect, useRef } from 'react'

type VideoViewProps = {
  stream: MediaStream | null
  mirror?: boolean
  fit?: 'cover' | 'contain'
  className?: string
}

/** A muted, autoplaying <video> showing a live stream. */
export function VideoView({
  stream,
  mirror = false,
  fit = 'cover',
  className = '',
}: VideoViewProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (video && video.srcObject !== stream) video.srcObject = stream
  }, [stream])

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
