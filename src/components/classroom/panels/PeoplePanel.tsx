import {
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
  guestLink: string
  onClose: () => void
}

/** Everyone in the room. Other tabs join via the guest link. */
export function PeoplePanel({
  participants,
  guestLink,
  onClose,
}: PeoplePanelProps) {
  return (
    <SidePanel
      title="People"
      labelId="people-title"
      onClose={onClose}
      footer={
        <div className="border-line shrink-0 border-t p-3">
          <button
            type="button"
            onClick={() =>
              copyText(
                guestLink,
                'Guest link copied. Open it in another tab to join.',
              )
            }
            className="press border-brand text-brand hover:bg-brand-soft flex h-10 w-full items-center justify-center gap-2 rounded-[4px] border text-[14px] font-medium"
          >
            <Link2 size={16} aria-hidden="true" />
            Copy guest link
          </button>
        </div>
      }
    >
      <p className="text-muted px-[9px] pb-1 pt-3 text-[13px] tabular-nums">
        {participants.length} of {CLASSROOM_BRAND.roomCapacity} in the room
      </p>
      <ul className="px-[9px] pb-3">
        {participants.map((person) => (
          <li
            key={person.id}
            className="border-line flex items-center gap-2.5 border-b py-2.5 last:border-b-0"
          >
            <span className="bg-avatar text-ink grid size-8 shrink-0 place-items-center rounded-[4px] text-[15px]">
              {person.initial}
            </span>
            <span className="text-ink min-w-0 flex-1 truncate text-[14.5px] font-medium">
              {person.name}
              {person.isSelf && (
                <span className="text-muted font-normal"> (you)</span>
              )}
            </span>
            <span className="text-ink-soft flex items-center gap-1.5">
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
          </li>
        ))}
      </ul>
    </SidePanel>
  )
}
