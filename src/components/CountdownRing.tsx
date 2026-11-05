import React, { useEffect, useState } from 'react'

interface CountdownRingProps {
  startTime: string | Date | null | undefined
  onStart?: () => void
  size?: number
}

export default function CountdownRing({
  startTime,
  onStart,
}: CountdownRingProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)

  useEffect(() => {
    if (!startTime) return

    const start = new Date(startTime).getTime()
    const now = new Date().getTime()
    const initialDiff = start - now

    setTotalTime(initialDiff > 0 ? initialDiff : 0)

    // Auto-enable join if startTime is already past
    if (initialDiff <= 0 && onStart) {
      onStart() // optional callback to auto-join class
    }

    const interval = setInterval(() => {
      const current = new Date().getTime()
      const diff = start - current

      if (diff <= 0) {
        setTimeLeft(0)
        clearInterval(interval)
        if (onStart) onStart() // auto-trigger when timer hits 0
        return
      }

      setTimeLeft(diff)
    }, 1000)

    return () => clearInterval(interval)
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
