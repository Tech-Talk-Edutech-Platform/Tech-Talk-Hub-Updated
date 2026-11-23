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
import type { Participant } from '../../../types/classroom'
import { SidePanel } from './SidePanel'

type PeoplePanelProps = {
  participants: Participant[]
  /** Left out for the parent link: watchers don't invite people. */
  guestLink?: string
  /** The watch-only link for parents; offered to the tutor. */
  parentLink?: string
  onClose: () => void
}

const linkButtonClass =
  'press flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-brand text-[14px] font-medium text-brand hover:bg-brand-soft'

/** Everyone in the room. Other tabs join via the guest link. */
export function PeoplePanel({
  participants,
  guestLink,
  parentLink,
  onClose,
}: PeoplePanelProps) {
  const watching = participants.filter((person) => person.watching).length
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
