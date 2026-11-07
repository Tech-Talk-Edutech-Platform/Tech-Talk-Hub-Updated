import { useEffect, useState } from 'react'

interface CountdownRingProps {
  startTime: string | Date | null | undefined
  onStart?: () => void
  size?: number
}

interface Timing {
  total: number
  left: number
}

export default function CountdownRing({
  startTime,
  onStart,
}: CountdownRingProps) {
  const [{ total: totalTime, left: timeLeft }, setTiming] = useState<Timing>({
    total: 0,
    left: 0,
  })

  useEffect(() => {
    if (!startTime) return undefined

    const start = new Date(startTime).getTime()
    const total = Math.max(start - Date.now(), 0)

    /** Updates the ring; returns true once the start time has been reached. */
    const tick = () => {
      const diff = start - Date.now()

      if (diff <= 0) {
        setTiming({ total, left: 0 })
        onStart?.() // auto-trigger when the timer hits 0, or if it already has
        return true
      }

      setTiming({ total, left: diff })
      return false
    }

    const interval = setInterval(() => {
      if (tick()) clearInterval(interval)
    }, 1000)
    const firstTick = setTimeout(() => {
      if (tick()) clearInterval(interval)
    }, 0)

    return () => {
      clearTimeout(firstTick)
      clearInterval(interval)
    }
  }, [startTime, onStart])

  // Convert time
  const minutes = Math.floor(timeLeft / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Circle math
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = totalTime > 0 ? timeLeft / totalTime : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="180" height="180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          stroke="#374151"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          stroke={timeLeft === 0 ? '#22c55e' : '#facc15'}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s linear',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>

      <div className="absolute text-3xl font-black text-white">
        {timeLeft === 0 ? 'LIVE 🚀' : formatted}
      </div>
    </div>
  )
}
