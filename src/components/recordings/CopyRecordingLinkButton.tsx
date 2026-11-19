import { useEffect, useRef, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { copyText, recordingShareUrl } from '../../lib/classroom/recordingShare'

type CopyState = 'idle' | 'copied' | 'failed'

const LABELS: Record<CopyState, string> = {
  idle: 'Copy link',
  copied: 'Link copied',
  failed: 'Couldn’t copy',
}

/**
 * Copies a recording's public share link (`/recordings/<id>`): anyone who
 * opens it can watch, no account needed.
 */
export function CopyRecordingLinkButton({
  recordingId,
  className = '',
}: {
  recordingId: string
  className?: string
}) {
  const [state, setState] = useState<CopyState>('idle')

  const resetTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  // Show the result, then go back to "Copy link" a moment later.
  const show = (result: CopyState) => {
    setState(result)
    window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setState('idle'), 2000)
  }

  const copy = () => {
    copyText(recordingShareUrl(recordingId)).then(
      () => show('copied'),
      () => show('failed'),
    )
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy a public link: anyone with it can watch this recording"
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        state === 'copied'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : state === 'failed'
            ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
            : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-purple-500/50 dark:hover:text-purple-300'
      } ${className}`}
    >
      {state === 'copied' ? <Check size={14} /> : <Link2 size={14} />}
      <span aria-live="polite">{LABELS[state]}</span>
    </button>
  )
}
