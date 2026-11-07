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
        <div className="shrink-0 border-t border-line p-3">
          <button
            type="button"
            onClick={() =>
              copyText(
                guestLink,
                'Guest link copied. Open it in another tab to join.',
              )
            }
            className="press flex h-10 w-full items-center justify-center gap-2 rounded-[4px] border border-brand text-[14px] font-medium text-brand hover:bg-brand-soft"
          >
            <Link2 size={16} aria-hidden="true" />
            Copy guest link
          </button>
        </div>
      }
    >
      <p className="px-[9px] pt-3 pb-1 text-[13px] text-muted tabular-nums">
        {participants.length} of {CLASSROOM_BRAND.roomCapacity} in the room
      </p>
      <ul className="px-[9px] pb-3">
        {participants.map((person) => (
          <li
            key={person.id}
            className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-avatar text-[15px] text-ink">
              {person.initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">
              {person.name}
              {person.isSelf && (
                <span className="font-normal text-muted"> (you)</span>
              )}
            </span>
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
          </li>
        ))}
      </ul>
    </SidePanel>
  )
}
