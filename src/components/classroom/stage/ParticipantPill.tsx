import { CLASSROOM_BRAND } from '../../../data/classroomBrand'

type ParticipantPillProps = {
  count: number
  recording: boolean
  /** The first seconds of a recording, when the pill reads "Recording". */
  announcing: boolean
}

/**
 * The "1/200" pill. For ~3s after recording starts it reads "Recording" on a
 * light fill, then settles back to the count with an orange recording dot.
 */
export function ParticipantPill({
  count,
  recording,
  announcing,
}: ParticipantPillProps) {
  const capacity = CLASSROOM_BRAND.roomCapacity
  return (
    <output
      aria-label={
        recording
          ? `Recording. ${count} of ${capacity} in the room`
          : `${count} of ${capacity} in the room`
      }
      className={`flex h-10 items-center gap-2 rounded-[10px] px-4 text-[15px] font-medium text-white transition-colors duration-200 ease-out ${
        announcing ? 'bg-stage-recording' : 'bg-stage-control'
      }`}
    >
      {recording && (
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full transition-colors duration-200 ${announcing ? 'bg-white' : 'bg-stage-muted'}`}
        />
      )}
      <span className="tabular-nums">
        {announcing ? 'Recording' : `${count}/${capacity}`}
      </span>
    </output>
  )
}
