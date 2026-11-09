import { useEffect, useRef } from 'react'
import type { RemoteAudioTrack } from 'livekit-client'

type AudioViewProps = {
  stream: MediaStream | null
  track?: RemoteAudioTrack | null
}

/** Plays a remote participant's microphone without adding visible controls. */
export function AudioView({ stream, track = null }: AudioViewProps) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = ref.current
    if (!audio) return undefined

    if (track) {
      track.attach(audio)
      return () => {
        track.detach(audio)
      }
    }

    audio.srcObject = stream
    return () => {
      if (audio.srcObject === stream) audio.srcObject = null
    }
  }, [stream, track])

  return (
    <audio
      ref={ref}
      autoPlay
      playsInline
      className="pointer-events-none absolute size-px opacity-0"
    />
  )
}
