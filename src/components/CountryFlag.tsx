import type { ReactNode } from 'react'

/**
 * Small flags for the countries families book from. Drawn here rather than
 * as emoji, which Windows shows as two letters ("KE").
 */
export type FlagRegion = 'KE' | 'UG' | 'TZ' | 'GH' | 'NG' | 'ZA'

// All drawn on a 30 × 20 (3:2) canvas.
const FLAGS: Record<FlagRegion, ReactNode> = {
  KE: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6" fill="#000" />
      <rect y="7" width="30" height="6" fill="#BB0000" />
      <rect y="14" width="30" height="6" fill="#006600" />
      <path d="M11 3.5 19 16.5M19 3.5 11 16.5" stroke="#fff" strokeWidth=".7" />
      <ellipse cx="15" cy="10" rx="3.2" ry="6.4" fill="#000" />
      <ellipse cx="15" cy="10" rx="1.9" ry="6.4" fill="#BB0000" />
      <ellipse cx="15" cy="10" rx=".7" ry="1.8" fill="#fff" />
    </>
  ),
  UG: (
    <>
      <rect width="30" height="20" fill="#000" />
      <rect y="3.33" width="30" height="3.34" fill="#FCDC04" />
      <rect y="6.67" width="30" height="3.33" fill="#D90000" />
      <rect y="13.33" width="30" height="3.34" fill="#FCDC04" />
      <rect y="16.67" width="30" height="3.33" fill="#D90000" />
      <circle cx="15" cy="10" r="3.4" fill="#fff" />
      <path d="M14 8.2h1.6l.6 3.6-1.3 1.1-.4-2.4-.9-.3z" fill="#9CA5A9" />
    </>
  ),
  TZ: (
    <>
      <rect width="30" height="20" fill="#1EB53A" />
      <path d="M30 0v20H0z" fill="#00A3DD" />
      <path d="M0 20 30 0" stroke="#FCD116" strokeWidth="7" />
      <path d="M0 20 30 0" stroke="#000" strokeWidth="4.6" />
    </>
  ),
  GH: (
    <>
      <rect width="30" height="6.67" fill="#CE1126" />
      <rect y="6.67" width="30" height="6.66" fill="#FCD116" />
      <rect y="13.33" width="30" height="6.67" fill="#006B3F" />
      <path
        d="M15 7l.68 2.07h2.17l-1.76 1.29.67 2.07L15 11.15l-1.76 1.28.67-2.07-1.76-1.29h2.17z"
        fill="#000"
      />
    </>
  ),
  NG: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="10" height="20" fill="#008751" />
      <rect x="20" width="10" height="20" fill="#008751" />
    </>
  ),
  ZA: (
    <>
      <rect width="30" height="10" fill="#E03C31" />
      <rect y="10" width="30" height="10" fill="#001489" />
      <path
        d="M0 0l11 10L0 20M11 10h19"
        fill="none"
        stroke="#fff"
        strokeWidth="6.67"
      />
      <path
        d="M0 0l11 10L0 20M11 10h19"
        fill="none"
        stroke="#007749"
        strokeWidth="4"
      />
      <path d="M0 2.7 8 10 0 17.3z" fill="#FFB81C" />
      <path d="M0 4.5 6.05 10 0 15.5z" fill="#000" />
    </>
  ),
}

export function CountryFlag({
  region,
  className = '',
}: {
  region: FlagRegion
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
      className={`h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 ${className}`}
    >
      {FLAGS[region]}
    </svg>
  )
}
