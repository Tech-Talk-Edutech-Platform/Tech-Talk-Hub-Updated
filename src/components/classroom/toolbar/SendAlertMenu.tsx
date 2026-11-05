import type { RefObject } from 'react'
import { Check } from 'lucide-react'
import { ALERTS } from '../../../data/classroom'
import type { ClassAlert } from '../../../types/classroom'
import { Popover } from '../ui/Popover'

/** A sent alert can't be sent again for this long. */
const COOLDOWN_MS = 60_000

type SendAlertMenuProps = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  onSend: (alert: ClassAlert) => void
  /** When each alert was last sent, by alert id. */
  sentAt: Partial<Record<string, number>>
  now: number
}

/** "Send AC alert" / "Send support alert". A sent alert cools down for a minute. */
export function SendAlertMenu({
  anchorRef,
  open,
  onClose,
  onSend,
  sentAt,
  now,
}: SendAlertMenuProps) {
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align="end"
      gap={8}
      role="menu"
      label="Send alert"
      className="w-[224px] overflow-hidden rounded-[6px] bg-white shadow-[0_12px_32px_-8px_rgb(0_0_0/0.28),0_0_0_1px_rgb(0_0_0/0.05)]"
    >
      <ul className="divide-y divide-line">
        {ALERTS.map((alert) => {
          const sent = sentAt[alert.id]
          const cooling = sent !== undefined && now - sent < COOLDOWN_MS
          return (
            <li key={alert.id}>
              <button
                type="button"
                role="menuitem"
                disabled={cooling}
                onClick={() => onSend(alert)}
                className="press flex h-[41px] w-full items-center justify-between px-4 text-left text-[15px] font-medium text-brand hover:bg-brand-soft disabled:text-muted disabled:hover:bg-transparent"
              >
                {alert.label}
                {cooling && (
                  <span className="flex items-center gap-1 text-[12.5px] font-normal tabular-nums">
                    <Check size={13} aria-hidden="true" /> Sent
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </Popover>
  )
}
