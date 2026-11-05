import { useState } from 'react'
import { useNow } from '../useNow'

const startKey = (roomId: string) => `coding-gal:room:${roomId}:startedAt`

function readStart(roomId: string) {
  try {
    const saved = Number(localStorage.getItem(startKey(roomId)))
    if (saved > 0) return saved
    const now = Date.now()
    localStorage.setItem(startKey(roomId), String(now))
    return now
  } catch {
    return Date.now()
  }
}

function clearClassStart(roomId: string) {
  try {
    localStorage.removeItem(startKey(roomId))
  } catch {
    // Storage blocked: the timer simply restarts next time.
  }
}

/**
 * Class timer shared by every tab in the same room (the start time lives in
 * localStorage), so a reload or a second tab keeps counting from the same start.
 */
export function useClassTimer(roomId: string) {
  const [startedAt, setStartedAt] = useState(() => readStart(roomId))
  const now = useNow(1000)

  return {
    now,
    elapsedMs: now - startedAt,
    restart: () => {
      clearClassStart(roomId)
      setStartedAt(readStart(roomId))
    },
  }
}
