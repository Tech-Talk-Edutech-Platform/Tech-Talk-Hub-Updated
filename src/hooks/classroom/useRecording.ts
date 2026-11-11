import { useEffect, useRef, useState } from 'react'
import { CLASSROOM_BRAND } from '../../data/classroomBrand'
import {
  RECORDING_UNSUPPORTED,
  downloadBlob,
  startRecording,
  type RecordingController,
  type RecordingResult,
} from '../../lib/classroom/recorder'
import { fileDate } from '../../lib/classroom/time'
import { dismissToast, toast } from '../../lib/classroom/toast'

type RecordingState = {
  active: boolean
  /** When the recording started (epoch ms). */
  since: number | null
  /** True for the first 3s, while the pill reads "Recording". */
  announcing: boolean
  /** The finished file is uploading to Class Recordings. */
  uploading: boolean
}

type RecordingOptions = {
  micStream: MediaStream | null
  classroomId: string
  /**
   * Uploads the finished recording (a real class, run by staff). Without it
   * the recording is only downloaded.
   */
  upload?: (result: RecordingResult) => Promise<void>
}

const IDLE: RecordingState = {
  active: false,
  since: null,
  announcing: false,
  uploading: false,
}

/**
 * Record / Stop. Every recording downloads to the teacher's computer first,
 * so nothing is lost if the upload fails, then uploads when `upload` is set.
 */
export function useRecording({
  micStream,
  classroomId,
  upload,
}: RecordingOptions) {
  const [state, setState] = useState(IDLE)
  const controller = useRef<RecordingController | null>(null)
  const announceTimer = useRef(0)
  const latest = useRef({ classroomId, upload })
  useEffect(() => {
    latest.current = { classroomId, upload }
  })

  // Keep the mixed-in mic in step with the Mic button while recording.
  useEffect(() => {
    controller.current?.setMic(micStream)
  }, [micStream])

  useEffect(
    () => () => {
      clearTimeout(announceTimer.current)
      void controller.current?.stop()
    },
    [],
  )

  const save = async (result: RecordingResult | null) => {
    if (!result) {
      toast('Nothing was recorded.')
      return
    }
    const { classroomId: roomCode, upload: uploadFile } = latest.current
    downloadBlob(
      result.blob,
      `${CLASSROOM_BRAND.fileSlug}-${roomCode}-${fileDate()}.${result.extension}`,
    )
    if (!uploadFile) {
      toast('Recording saved to your downloads.')
      return
    }
    setState((s) => ({ ...s, uploading: true }))
    const uploadingToast = toast(
      'Recording downloaded. Uploading to Class Recordings…',
      { duration: 60_000 },
    )
    try {
      await uploadFile(result)
      toast('Recording uploaded to Class Recordings.')
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : ''
      toast(
        `Couldn’t upload the recording.${detail} It’s in your downloads; add it from Dashboard › Recordings.`,
        { duration: 10_000 },
      )
    } finally {
      setState((s) => ({ ...s, uploading: false }))
      dismissToast(uploadingToast)
    }
  }

  const stop = async () => {
    const current = controller.current
    if (!current) return
    controller.current = null
    clearTimeout(announceTimer.current)
    setState((s) => ({ ...IDLE, uploading: s.uploading }))
    await save(await current.stop())
  }

  const start = async () => {
    try {
      const started = await startRecording({
        micStream,
        onEnded: (result) => {
          controller.current = null
          clearTimeout(announceTimer.current)
          setState((s) => ({ ...IDLE, uploading: s.uploading }))
          void save(result)
        },
      })
      if (!started) return // the share picker was cancelled
      controller.current = started
      setState((s) => ({
        ...s,
        active: true,
        since: Date.now(),
        announcing: true,
      }))
      announceTimer.current = window.setTimeout(() => {
        setState((s) => (s.active ? { ...s, announcing: false } : s))
      }, 3000)
    } catch (error) {
      toast(
        error instanceof Error && error.message === RECORDING_UNSUPPORTED
          ? 'Recording isn’t supported in this browser. Use Chrome or Edge on a computer.'
          : 'Couldn’t start recording. Allow screen sharing for this site and try again.',
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
