import { ExternalLink } from 'lucide-react'
import type { VideoPlatform } from '../../../types/classroom'

type ExternalPlatformNoticeProps = {
  platform: VideoPlatform
  onSwitchBack: () => void
}

/** Shown in the room while the class runs on another video platform. */
export function ExternalPlatformNotice({
  platform,
  onSwitchBack,
}: ExternalPlatformNoticeProps) {
  return (
    <div className="absolute inset-0 z-[5] grid place-items-center p-6">
      <div className="pop w-full max-w-[420px] rounded-[8px] bg-white p-7 text-center shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)]">
        <h2 className="text-ink text-[19px] font-semibold">
          This class is on {platform.label}
        </h2>
        <p className="text-ink-soft mt-2 text-[14.5px] leading-[22px]">
          You moved this class to {platform.label}. Continue there, or switch
          back to use this room again.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {platform.joinUrl && (
            <a
              href={platform.joinUrl}
              target="_blank"
              rel="noreferrer"
              className="press bg-brand hover:bg-brand-strong inline-flex h-10 items-center gap-2 rounded-[4px] px-4 text-[14.5px] font-medium text-white"
            >
              Open {platform.label}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={onSwitchBack}
            className="press border-line-strong text-ink hover:bg-surface-2 h-10 rounded-[4px] border px-4 text-[14.5px] font-medium"
          >
            Back to this room
          </button>
        </div>
      </div>
    </div>
  )
}
