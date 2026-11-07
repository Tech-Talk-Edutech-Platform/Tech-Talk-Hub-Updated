import type { ReactNode } from 'react'

type HeroBackgroundProps = {
  children: ReactNode
}

/** Layered gradients, grid, waves and particles behind the hero content. */
export function HeroBackground({ children }: HeroBackgroundProps) {
  return (
    <div className="relative w-full overflow-hidden bg-[#F8F5FF]">
      {/* Base background */}
      <div className="absolute inset-0 hero-base-gradient" />

      {/* Soft glows */}
      <div className="absolute top-20 -left-32 h-[380px] w-[380px] rounded-full bg-purple-300/15 blur-[100px]" />
      <div className="absolute top-0 -right-24 h-[430px] w-[430px] rounded-full bg-pink-300/15 blur-[110px]" />

      {/* Tech grid */}
      <div className="absolute inset-0 hero-tech-grid opacity-[0.035]" />

      {/* Background waves */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 620"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroWave" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.04" />
            <stop offset="55%" stopColor="#9B6CFF" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#FF3F7F" stopOpacity="0.08" />
          </linearGradient>

          <linearGradient id="heroAccent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2947C7" stopOpacity="0" />
            <stop offset="55%" stopColor="#9B6CFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FF3F7F" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        <path
          fill="url(#heroWave)"
          d="M1440 120 C1240 45 1110 100 950 200 C790 300 650 315 500 270 C325 220 190 240 0 370 L0 620 L1440 620 Z"
        />

        <path
          fill="url(#heroAccent)"
          d="M1440 250 C1250 170 1090 195 910 280 C720 370 540 365 370 325 C220 290 100 315 0 410 L0 620 L1440 620 Z"
        />

        <path
          d="M-50 460 C280 285 470 425 730 350 C980 285 1180 180 1500 310"
          fill="none"
          stroke="#9B6CFF"
          strokeOpacity="0.10"
          strokeWidth="1.5"
        />
      </svg>

      {/* Small particles */}
      <div className="absolute top-[31%] left-[7%] h-2 w-2 rounded-full bg-[#FF3F7F]/50 shadow-[0_0_18px_rgba(255,63,127,0.35)]" />
      <div className="absolute top-[18%] left-[38%] h-1.5 w-1.5 rounded-full bg-[#9B6CFF]/40" />
      <div className="absolute top-[20%] right-[10%] h-2 w-2 rounded-full bg-[#2947C7]/30" />

      {/* Page content */}
      <div className="relative z-10">{children}</div>

      {/* Bottom blend */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-[#F1E8FF]/70 to-transparent" />
    </div>
  )
}
