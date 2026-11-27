import { useState } from 'react'
import type { FormEvent } from 'react'
import { AtSign, Loader2, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { getErrorMessage } from '../../../lib/getErrorMessage'
import { usernameProblem } from '../../../lib/profile'
import { useMyProfile } from '../../../hooks/useMyProfile'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-hidden transition focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white'

type UsernameSettingsCardProps = {
  userId: string
}

/**
 * Settings › username: an optional name to sign in with instead of an email.
 * Saved through set_my_username(), which checks it's free.
 */
export function UsernameSettingsCard({ userId }: UsernameSettingsCardProps) {
  const { profile, saveUsername } = useMyProfile(userId)
  const saved = profile.data?.username ?? ''
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? saved
  const normalised = value.trim().toLowerCase()
  const problem = draft === null ? null : usernameProblem(value)
  const changed = draft !== null && normalised !== saved
  const canSave = changed && !problem && !saveUsername.isPending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSave) return
    saveUsername.mutate(normalised, {
      onSuccess: (username) => {
        setDraft(null)
        toast.success(username ? 'Username saved.' : 'Username removed.')
      },
      onError: (error) =>
        toast.error(getErrorMessage(error, 'Couldn’t save your username.')),
    })
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-white/5">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-500/10">
          <AtSign size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Username
          </h2>
          <p className="text-xs text-slate-400">
            Sign in with this instead of your email. Your full name still shows
            on screen.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="settings-username" className="sr-only">
          Username
        </label>
        <div className="relative">
          <span
            className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-slate-400"
            aria-hidden="true"
          >
            @
          </span>
          <input
            id="settings-username"
            type="text"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
            placeholder={profile.isPending ? 'Loading…' : 'choose a username'}
            value={value}
            onChange={(event) => setDraft(event.target.value)}
            disabled={profile.isPending}
            aria-invalid={Boolean(problem)}
            aria-describedby="settings-username-hint"
            className={`${inputClass} pl-9`}
          />
        </div>
        <p
          id="settings-username-hint"
          role={problem ? 'alert' : undefined}
          className={`text-xs ${problem ? 'font-semibold text-red-600' : 'text-slate-400'}`}
        >
          {problem ??
            '3 to 24 letters, numbers, dots or underscores. Saved in lowercase. Leave it empty to remove it.'}
        </p>
        <div className="flex items-center justify-end gap-3">
          {changed && (
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-300"
            >
              Undo
            </button>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {saveUsername.isPending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={14} aria-hidden="true" />
            )}
            {saveUsername.isPending ? 'Saving…' : 'Save username'}
          </button>
        </div>
      </form>
    </div>
  )
}
