import { useEffect, useState } from 'react'

/** Rough mic level 0..1 for the Settings meter. */
export function useAudioMeter(stream: MediaStream | null) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!stream?.getAudioTracks().length) return undefined
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    const id = setInterval(() => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const value of data)
        peak = Math.max(peak, Math.abs(value - 128) / 128)
      setLevel(Math.min(1, peak * 1.6))
    }, 80)

    return () => {
      clearInterval(id)
      source.disconnect()
      void context.close()
      setLevel(0)
    }
  }, [stream])

  return level
}
