import type { ReactNode } from 'react'
import {
  Eye,
  Hand,
  Link2,
  Mic,
  MicOff,
  Monitor,
  Video,
  VideoOff,
} from 'lucide-react'
import { CLASSROOM_BRAND } from '../../../data/classroomBrand'
import { copyText } from '../../../lib/classroom/clipboard'
import type { MediaControl, Participant } from '../../../types/classroom'
import { SidePanel } from './SidePanel'

type PeoplePanelProps = {
  participants: Participant[]
  /** Left out for the parent link: watchers don't invite people. */
  guestLink?: string
  /** The watch-only link for parents; offered to the tutor. */
  parentLink?: string
  /**
   * Tutor only: mute a student or turn off their camera, or ask them to turn
   * one on. Left out for everyone else, who just sees each person's state.
   */
  onControl?: (person: Participant, action: MediaControl) => void
  onMuteAll?: () => void
  onClose: () => void
}

const linkButtonClass =
  'press flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-brand text-[14px] font-medium text-brand hover:bg-brand-soft'

/** Everyone in the room. Other tabs join via the guest link. */
export function PeoplePanel({
  participants,
  guestLink,
  parentLink,
  onControl,
  onMuteAll,
  onClose,
}: PeoplePanelProps) {
  const watching = participants.filter((person) => person.watching).length
  const students = participants.filter(
    (person) => !person.isSelf && !person.watching && !person.host,
  )
  const anyoneTalking = students.some((person) => person.mic)
  return (
    <SidePanel
      title="People"
      labelId="people-title"
      onClose={onClose}
      footer={
        guestLink && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
            <button
              type="button"
              onClick={() =>
                copyText(
                  guestLink,
                  'Guest link copied. Open it in another tab to join.',
                )
              }
              className={linkButtonClass}
            >
              <Link2 size={16} aria-hidden="true" />
              Copy guest link
            </button>
            {parentLink && (
              <button
                type="button"
                onClick={() =>
                  copyText(
                    parentLink,
                    'Parent link copied. Parents can watch, but not talk or use their camera.',
                  )
                }
                className={linkButtonClass}
              >
                <Eye size={16} aria-hidden="true" />
                Copy parent link
              </button>
            )}
          </div>
        )
      }
    >
      <p className="px-[9px] pt-3 pb-1 text-[13px] text-muted tabular-nums">
        {participants.length} of {CLASSROOM_BRAND.roomCapacity} in the room
        {watching > 0 && ` · ${watching} watching`}
      </p>
      {onControl && students.length > 0 && (
        <div className="mx-[9px] mt-2 mb-1 rounded-[10px] bg-surface-2 p-3">
          <p className="text-[13px] leading-[18px] text-ink-soft">
            Tap a student’s mic or camera to turn it off, or to ask them to turn
            it on.
          </p>
          {onMuteAll && (
            <button
              type="button"
              onClick={onMuteAll}
              disabled={!anyoneTalking}
              className="press mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-white text-[14px] font-medium text-ink ring-1 ring-line-strong hover:bg-brand-soft disabled:cursor-default disabled:text-faint disabled:hover:bg-white"
            >
              <MicOff size={16} aria-hidden="true" />
              {anyoneTalking ? 'Mute all students' : 'All students are muted'}
            </button>
          )}
        </div>
      )}
      <ul className="px-[9px] pb-3">
        {participants.map((person) => (
          <li
            key={person.id}
            className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-avatar text-[15px] text-ink">
              {person.initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">
              {person.name}
              {person.isSelf && (
                <span className="font-normal text-muted"> (you)</span>
              )}
            </span>
            {person.watching ? (
              <span className="flex items-center gap-1 text-[12.5px] text-muted">
                <Eye size={15} aria-hidden="true" />
                Parent, watching
              </span>
            ) : onControl && students.includes(person) ? (
              <span className="flex items-center gap-1 text-ink-soft">
                {person.hand && (
                  <Hand
                    size={16}
                    aria-label="Hand raised"
                    className="mr-1 text-brand"
                  />
                )}
                {person.screen && (
                  <Monitor
                    size={16}
                    aria-label="Sharing screen"
                    className="mr-1"
                  />
                )}
                <ControlButton
                  on={person.cam}
                  label={
                    person.cam
                      ? `Turn off ${person.name}’s camera`
                      : `Ask ${person.name} to turn on their camera`
                  }
                  onClick={() =>
                    onControl(person, person.cam ? 'stop-cam' : 'ask-cam')
                  }
                >
                  {person.cam ? (
                    <Video size={17} aria-hidden="true" />
                  ) : (
                    <VideoOff size={17} aria-hidden="true" />
                  )}
                </ControlButton>
                <ControlButton
                  on={person.mic}
                  label={
                    person.mic
                      ? `Mute ${person.name}`
                      : `Ask ${person.name} to unmute`
                  }
                  onClick={() =>
                    onControl(person, person.mic ? 'mute-mic' : 'ask-mic')
                  }
                >
                  {person.mic ? (
                    <Mic size={17} aria-hidden="true" />
                  ) : (
                    <MicOff size={17} aria-hidden="true" />
                  )}
                </ControlButton>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-ink-soft">
                {person.hand && (
                  <Hand
                    size={16}
                    aria-label="Hand raised"
                    className="text-brand"
                  />
                )}
                {person.screen && (
                  <Monitor size={16} aria-label="Sharing screen" />
                )}
                {person.cam ? (
                  <Video size={16} aria-label="Camera on" />
                ) : (
                  <VideoOff
                    size={16}
                    aria-label="Camera off"
                    className="text-faint"
                  />
                )}
                {person.mic ? (
                  <Mic size={16} aria-label="Mic on" />
                ) : (
                  <MicOff size={16} aria-label="Muted" className="text-faint" />
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </SidePanel>
  )
}

/** A student's mic or camera, as a button the tutor can tap. */
function ControlButton({
  on,
  label,
  onClick,
  children,
}: {
  on: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`press grid size-9 place-items-center rounded-[8px] ${
        on
          ? 'text-ink hover:bg-danger-soft hover:text-danger-ink'
          : 'text-faint hover:bg-brand-soft hover:text-brand'
      }`}
    >
      {children}
    </button>
  )
}
