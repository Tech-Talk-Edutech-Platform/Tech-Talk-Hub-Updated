import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/** Counts down from `seconds`, then navigates to `to`. Returns the seconds left. */
export function useRedirectCountdown(seconds: number, to: string): number {
  const navigate = useNavigate()
  const [secondsLeft, setSecondsLeft] = useState(seconds)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    const timer = window.setTimeout(() => {
      void navigate(to)
    }, seconds * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [navigate, seconds, to])

  return secondsLeft
}
