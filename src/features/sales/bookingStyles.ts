import type { ShiftTone } from './shifts'
import type { Mentor } from './types'

/**
 * The trial-booking look, from the booking portal: warm peach, lavender and
 * pink cards, deep violet steps and an orange → pink → violet call to action.
 */

export const SHIFT_TONE: Record<
  ShiftTone,
  { card: string; hover: string; icon: string }
> = {
  peach: {
    card: 'border-orange-200/80 bg-orange-50/80 text-orange-950 dark:border-orange-300/15 dark:bg-orange-400/10 dark:text-orange-50',
    hover: 'hover:border-orange-300 hover:shadow-orange-900/10',
    icon: 'bg-white text-orange-600 shadow-sm shadow-orange-900/5 dark:bg-orange-300/15 dark:text-orange-200',
  },
  lavender: {
    card: 'border-violet-200/80 bg-violet-50/80 text-violet-950 dark:border-violet-300/15 dark:bg-violet-400/10 dark:text-violet-50',
    hover: 'hover:border-violet-300 hover:shadow-violet-900/10',
    icon: 'bg-white text-violet-600 shadow-sm shadow-violet-900/5 dark:bg-violet-300/15 dark:text-violet-200',
  },
  pink: {
    card: 'border-pink-200/80 bg-pink-50/80 text-pink-950 dark:border-pink-300/15 dark:bg-pink-400/10 dark:text-pink-50',
    hover: 'hover:border-pink-300 hover:shadow-pink-900/10',
    icon: 'bg-white text-pink-600 shadow-sm shadow-pink-900/5 dark:bg-pink-300/15 dark:text-pink-200',
  },
}

/** The small capitalised label above each step's heading. */
export const eyebrowClass =
  'text-[11px] font-extrabold tracking-[0.2em] text-orange-700 uppercase dark:text-orange-300'

export const stepHeadingClass =
  'text-2xl font-black tracking-tight text-fuchsia-900 outline-hidden sm:text-[28px] dark:text-white'

export const gradientButton =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-orange-600 via-pink-500 to-violet-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-pink-500/20 transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'

export type TutorTone = 'orange' | 'violet'

/** Tutors alternate orange and violet, in the order they're listed. */
export function tutorTone(
  mentorId: string,
  mentors: readonly Mentor[],
): TutorTone {
  return mentors.findIndex((mentor) => mentor.id === mentorId) % 2 === 0
    ? 'orange'
    : 'violet'
}
