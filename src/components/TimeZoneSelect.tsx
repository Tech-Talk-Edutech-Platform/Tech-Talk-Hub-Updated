import { useMemo, useState, useSyncExternalStore } from 'react'

import {
  allTimeZones,
  COMMON_TIME_ZONES,
  zoneLabel,
  zonePlace,
} from '../lib/timeZones'

const noSubscription = () => () => undefined

/** "America/Denver" → "Denver · America" for the long list. */
const longLabel = (zone: string) => {
  const region = zone.split('/')[0]
  return region && region !== zone
    ? `${zonePlace(zone)} · ${region.replace(/_/g, ' ')}`
    : zonePlace(zone)
}

/**
 * A time zone picker: the zones families are usually in first (with their
 * offset), then every zone the browser knows. The current value is always
 * listed, even if it's in neither list.
 */
export function TimeZoneSelect({
  value,
  onChange,
  id,
  className,
  'aria-describedby': describedBy,
}: {
  value: string
  onChange: (zone: string) => void
  id?: string
  className?: string
  'aria-describedby'?: string
}) {
  // Offsets as of when the picker opened.
  const [now] = useState(() => Date.now())
  // Pre-rendered pages hydrate with the short list and no offsets: the
  // server's zone list and clock can differ from the browser's.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  )
  const { common, rest } = useMemo(() => {
    const commonSet = new Set(COMMON_TIME_ZONES)
    if (!commonSet.has(value)) commonSet.add(value)
    const commonZones = [...commonSet].map((zone) => ({
      zone,
      label: hydrated ? zoneLabel(zone, now) : zonePlace(zone),
    }))
    return {
      common: commonZones,
      rest: hydrated
        ? allTimeZones()
            .filter((zone) => !commonSet.has(zone))
            .map((zone) => ({ zone, label: longLabel(zone) }))
            .toSorted((a, b) => a.label.localeCompare(b.label))
        : [],
    }
  }, [value, now, hydrated])

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-describedby={describedBy}
      className={className}
    >
      <optgroup label="Common time zones">
        {common.map(({ zone, label }) => (
          <option key={zone} value={zone}>
            {label}
          </option>
        ))}
      </optgroup>
      {rest.length > 0 && (
        <optgroup label="All time zones">
          {rest.map(({ zone, label }) => (
            <option key={zone} value={zone}>
              {label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
