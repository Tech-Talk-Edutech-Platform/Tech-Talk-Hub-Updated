import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { toast } from 'react-hot-toast'

import {
  applyTheme,
  currentTheme,
  saveAccountTheme,
  type Theme,
} from '../../../lib/theme'

/** Settings › light/dark mode, saved in this browser and on the account. */
export function ThemeSettingsCard({ userId }: { userId: string }) {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const dark = theme === 'dark'

  const toggle = () => {
    const next: Theme = dark ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next, userId)
    void saveAccountTheme(userId, next)
    toast.success(next === 'dark' ? 'Dark mode on' : 'Light mode on')
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-500/10">
          {dark ? <Moon size={20} /> : <Sun size={20} />}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Interface theme
          </h2>
          <p className="text-xs text-slate-400">
            Saved to your account, so it follows you to any device.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={dark}
        className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
        {dark ? 'Switch to light mode' : 'Switch to dark mode'}
      </button>
    </div>
  )
}
