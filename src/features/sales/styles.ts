/** Shared control styles for the sales screens. */

const control =
  'rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-hidden focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-slate-800 dark:text-white'

/** Full-width form controls. */
export const selectClass = `w-full px-3 py-2.5 ${control}`
export const inputClass = `w-full px-3 py-2.5 ${control}`

/** A text box with a search icon on its left. */
export const searchInputClass = `w-full py-2.5 pr-3 pl-9 ${control}`

/** A select that sits inline beside its label, as wide as its options. */
export const inlineSelectClass = `w-auto px-3 py-1.5 ${control}`

/** The country-code picker in front of a phone number. */
export const countryCodeClass = `w-36 shrink-0 px-2 py-2.5 ${control}`

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5'

/** Green, like WhatsApp's own buttons. */
export const whatsappButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700'
