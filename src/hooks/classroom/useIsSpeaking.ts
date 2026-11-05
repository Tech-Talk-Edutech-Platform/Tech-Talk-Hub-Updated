import { useEffect, useState } from 'react'

const SPEAKING_RMS = 0.035
const QUIET_HOLD_MS = 350

/**
 * True while the stream's audio is above a speaking threshold. Only re-renders
 * when the boolean flips, not every frame.
 */
export function useIsSpeaking(stream: MediaStream | null) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!stream?.getAudioTracks().length) return undefined
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    let frame = 0
    let current = false
    let quietSince = 0

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (const value of data) sum += ((value - 128) / 128) ** 2
      const rms = Math.sqrt(sum / data.length)
      const now = performance.now()
      if (rms > SPEAKING_RMS) {
        quietSince = now
        if (!current) {
          current = true
          setSpeaking(true)
        }
      } else if (current && now - quietSince > QUIET_HOLD_MS) {
        current = false
        setSpeaking(false)
      }
      frame = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      source.disconnect()
      void context.close()
      setSpeaking(false)
    }
  }, [stream])

  return speaking
}
