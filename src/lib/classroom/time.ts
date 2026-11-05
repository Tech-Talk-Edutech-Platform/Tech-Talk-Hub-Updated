const pad = (n: number) => String(n).padStart(2, '0')

/** Class timer, as in the toolbar: "11:51", or "1:02:09" past an hour. */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** "12:13 PM GMT, Wed, Nov 04" in the student's own time zone. */
export function formatStudentTime(date: number | Date, timeZone: string) {
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(date)
  const day = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      timeZone,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${time}, ${day.weekday}, ${day.month} ${day.day}`
}

/** Chat and help timestamps: "1:15 PM" */
export function formatClock(date: number | Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/** "2026-11-05-1342", for download filenames. */
export function fileDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}
