import { useState } from 'react'
import type { MediaAsk } from '../../components/classroom/stage/MediaAskPrompt'
import { toast } from '../../lib/classroom/toast'
import type { MediaControl, Participant } from '../../types/classroom'
import type { LocalMedia } from './useLocalMedia'

/**
 * A student's side of the tutor's mic and camera controls. The tutor can
 * mute them or turn their camera off straight away; asking them to turn one
 * on shows a prompt with one big button (browsers only start a camera or mic
 * for the person at the device).
 *
 * `active` is false for the tutor and for parents watching: they ignore it.
 */
export function useTutorMediaControl(media: LocalMedia, active: boolean) {
  const [ask, setAsk] = useState<MediaAsk | null>(null)

  // Whatever the student turned on themself is no longer being asked for.
  // (Adjusted while rendering, React's pattern for state that follows other
  // state, so the prompt never flashes.)
  if (ask) {
    const mic = ask.mic && !media.mic
    const cam = ask.cam && !media.cam
    if (mic !== ask.mic || cam !== ask.cam) {
      setAsk(mic || cam ? { ...ask, mic, cam } : null)
    }
  }

  const onControl = (action: MediaControl, from: Participant) => {
    if (!active) return
    const tutor = from.name || 'Your tutor'
    switch (action) {
      case 'mute-mic':
        setAsk((current) => current && { ...current, mic: false })
        if (media.mic) {
          media.toggleMic()
          toast(`${tutor} muted your microphone.`)
        }
        break
      case 'stop-cam':
        setAsk((current) => current && { ...current, cam: false })
        if (media.cam || media.pending.cam) {
          media.toggleCam()
          toast(`${tutor} turned off your camera.`)
        }
        break
      case 'ask-mic':
        if (!media.mic && !media.pending.mic) {
          setAsk((current) => ({
            cam: current?.cam ?? false,
            mic: true,
            from: tutor,
          }))
        }
        break
      case 'ask-cam':
        if (!media.cam && !media.pending.cam) {
          setAsk((current) => ({
            mic: current?.mic ?? false,
            cam: true,
            from: tutor,
          }))
        }
        break
    }
  }

  return {
    /** What the tutor is asking for right now, or null. */
    ask: active && ask && (ask.mic || ask.cam) ? ask : null,
    onControl,
    /** The student tapped the big button. */
    accept: () => {
      if (ask?.mic && !media.mic) media.toggleMic()
      if (ask?.cam && !media.cam) media.toggleCam()
      setAsk(null)
    },
    dismiss: () => setAsk(null),
  }
}
