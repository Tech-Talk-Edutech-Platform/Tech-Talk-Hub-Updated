import type { RefObject } from 'react'
import { useNow } from '../../../hooks/useNow'
import { formatElapsed } from '../../../lib/classroom/time'
import { Popover } from '../ui/Popover'

export type RoomStats = {
  cam: MediaStream | null
  mic: MediaStream | null
  screen: MediaStream | null
  recordingSince: number | null
  participants: number
}

function trackSummary(stream: MediaStream | null) {
  const track = stream?.getVideoTracks()[0]
  if (!track) return null
  const settings = track.getSettings()
  const resolution =
    settings.width && settings.height
      ? `${settings.width} × ${settings.height}`
      : 'Live'
  return settings.frameRate
    ? `${resolution} · ${Math.round(settings.frameRate)} fps`
    : resolution
}

type StatsPopoverProps = {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  stats: RoomStats
}

/** Live numbers read from this device's tracks; nothing here is simulated. */
export function StatsPopover({
  anchorRef,
  open,
  onClose,
  stats,
}: StatsPopoverProps) {
  const now = useNow(open ? 1000 : 60_000)
  const micTrack = stats.mic?.getAudioTracks()[0]

  const rows = [
    { label: 'Camera', value: trackSummary(stats.cam) ?? 'Off' },
    {
      label: 'Microphone',
      value: micTrack ? micTrack.label || 'On' : 'Off',
    },
    { label: 'Screen share', value: trackSummary(stats.screen) ?? 'Off' },
    {
      label: 'Recording',
      value: stats.recordingSince
        ? formatElapsed(now - stats.recordingSince)
        : 'Off',
    },
    {
      label: 'In this room',
      value: `${stats.participants} ${stats.participants === 1 ? 'person' : 'people'}`,
    },
  ]

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align="end"
      gap={8}
      label="Connection stats"
      className="text-ink w-[300px] rounded-[8px] bg-white p-4 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.4)]"
    >
      <h2 className="text-[15px] font-semibold">Connection stats</h2>
      <dl className="mt-3 space-y-2 text-[13.5px]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-muted shrink-0">{row.label}</dt>
            <dd
              className={`truncate text-right tabular-nums ${row.value === 'Off' ? 'text-faint' : 'text-ink'}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-line text-muted mt-3 border-t pt-3 text-[12.5px] leading-[18px]">
        Media stays on this device. Other tabs share presence, chat and
        reactions, not video.
      </p>
    </Popover>
  )
}
