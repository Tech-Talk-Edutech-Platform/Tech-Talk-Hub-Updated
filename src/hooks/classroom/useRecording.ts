import { useEffect, useRef, useState } from 'react'
import {
  RECORDING_UNSUPPORTED,
  startRecording,
  type RecordingController,
} from '../../lib/classroom/recorder'
import { toast } from '../../lib/classroom/toast'

type RecordingState = {
  active: boolean
  /** When the recording started (epoch ms). */
  since: number | null
  /** True for the first 3s, while the pill reads "Recording". */
  announcing: boolean
}

type RecordingOptions = { micStream: MediaStream | null; classroomId: string }

const IDLE: RecordingState = { active: false, since: null, announcing: false }

/** Record / Stop. "announcing" drives the 3s "Recording" pill from the reference. */
export function useRecording({ micStream, classroomId }: RecordingOptions) {
  const [state, setState] = useState(IDLE)
  const controller = useRef<RecordingController | null>(null)
  const announceTimer = useRef(0)

  useEffect(
    () => () => {
      clearTimeout(announceTimer.current)
      void controller.current?.stop()
    },
    [],
  )

  const stop = async () => {
    const current = controller.current
    if (!current) return
    controller.current = null
    clearTimeout(announceTimer.current)
    setState(IDLE)
    await current.stop()
    toast('Recording saved to your downloads.')
  }

  const start = async () => {
    try {
      const started = await startRecording({
        micStream,
        classroomId,
        onEnded: () => {
          controller.current = null
          setState(IDLE)
          toast('Recording stopped. It was saved to your downloads.')
        },
      })
      if (!started) return // the share picker was cancelled
      controller.current = started
      setState({ active: true, since: Date.now(), announcing: true })
      announceTimer.current = window.setTimeout(() => {
        setState((s) => (s.active ? { ...s, announcing: false } : s))
      }, 3000)
    } catch (error) {
      toast(
        error instanceof Error && error.message === RECORDING_UNSUPPORTED
          ? 'Recording isn’t supported in this browser.'
          : 'Couldn’t start recording.',
      )
    }
  }

  return {
    ...state,
    toggle: () => {
      void (controller.current ? stop() : start())
    },
    stop: () => {
      void stop()
    },
  }
}

export type Recording = ReturnType<typeof useRecording>
