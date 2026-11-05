import { Check } from 'lucide-react'
import { PLATFORMS } from '../../../data/classroom'
import type { VideoPlatform } from '../../../types/classroom'
import { Modal } from '../ui/Modal'

type SwitchPlatformModalProps = {
  open: boolean
  onClose: () => void
  current: string
  onSwitch: (platform: VideoPlatform) => void
}

/** "Switch Video Platform" (docs/breakdown/10-switch-platform.md). */
export function SwitchPlatformModal({
  open,
  onClose,
  current,
  onSwitch,
}: SwitchPlatformModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={448}
      labelledBy="platform-title"
    >
      <h2
        id="platform-title"
        className="mb-5 text-center text-[17px] font-semibold text-ink"
      >
        Switch Video Platform
      </h2>
      <ul
        className="space-y-[9px] pb-5"
        role="radiogroup"
        aria-labelledby="platform-title"
      >
        {PLATFORMS.map((platform) => {
          const isCurrent = platform.id === current
          return (
            <li key={platform.id}>
              <button
                type="button"
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- rows act as radios, but picking the current one closes the modal, which a native radio can't do
                role="radio"
                aria-checked={isCurrent}
                onClick={() => (isCurrent ? onClose() : onSwitch(platform))}
                className={`press flex h-[46px] w-full items-center rounded-[4px] border px-3 text-left text-[15px] text-ink ${
                  isCurrent
                    ? 'border-brand'
                    : 'border-line hover:border-line-strong hover:bg-surface-2/60'
                }`}
              >
                <span className="flex-1">
                  {platform.name}
                  {isCurrent && (
                    <span className="ml-1.5 text-[12.5px] text-brand">
                      (Current)
                    </span>
                  )}
                </span>
                {isCurrent && (
                  <Check
                    size={17}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="text-brand"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
