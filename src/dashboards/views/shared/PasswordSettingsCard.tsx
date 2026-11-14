import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Lock, Mail, Shield } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { supabase } from '../../../supabase'
import type { DashboardIdentity } from '../../../types/dashboardIdentity'
import { getErrorMessage } from '../../../lib/getErrorMessage'
import {
  MIN_PASSWORD_LENGTH,
  newPasswordProblem,
  sendPasswordResetEmail,
} from '../../../lib/passwordRecovery'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-hidden transition focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white'
const labelClass =
  'mb-2 block text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300'

/** True when the account can already sign in with an email and password. */
function hasPasswordLogin(user: DashboardIdentity) {
  const providers: unknown = user.app_metadata?.providers
  if (Array.isArray(providers)) return providers.includes('email')
  return user.app_metadata?.provider === 'email'
}

/**
 * Change password from inside the dashboard. People who sign in with a
 * password confirm the current one first; Google-only accounts can add one.
 */
export function PasswordSettingsCard({ user }: { user: DashboardIdentity }) {
  const needsCurrent = hasPasswordLogin(user)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issue =
      needsCurrent && next === current && next
        ? 'Choose a password different from your current one.'
        : newPasswordProblem(next, confirmation)
    setProblem(issue)
    if (issue) return
    if (!user.email) {
      setProblem('Your account has no email address. Contact an admin.')
      return
    }

    setSaving(true)
    try {
      if (needsCurrent) {
        const { error: checkError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: current,
        })
        if (checkError) {
          setProblem('Your current password is wrong.')
          return
        }
      }

      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) throw error

      toast.success(
        needsCurrent
          ? 'Password changed.'
          : 'Password set. You can now also sign in with your email.',
      )
      setCurrent('')
      setNext('')
      setConfirmation('')
    } catch (error) {
      setProblem(getErrorMessage(error, 'Failed to update password.'))
    } finally {
      setSaving(false)
    }
  }

  const emailResetLink = async () => {
    if (!user.email) return
    setSendingReset(true)
    try {
      await sendPasswordResetEmail(user.email)
      toast.success(`Reset link sent to ${user.email}.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Couldn’t send the reset email.'))
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-white/5">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10">
          <Lock size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {needsCurrent ? 'Update password' : 'Set a password'}
          </h2>
          <p className="text-xs text-slate-400">
            {needsCurrent
              ? `At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`
              : 'You sign in with Google. Add a password to also sign in with your email.'}
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void save(event)} className="space-y-4">
        {needsCurrent && (
          <div className="md:w-1/2 md:pr-2">
            <label htmlFor="password-current" className={labelClass}>
              Current password
            </label>
            <input
              id="password-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className={inputClass}
              required
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="password-new" className={labelClass}>
              New password
            </label>
            <input
              id="password-new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="password-confirm" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        {problem && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {problem}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          {needsCurrent ? (
            <button
              type="button"
              onClick={() => void emailResetLink()}
              disabled={sendingReset}
              className="inline-flex items-center gap-2 text-xs font-bold text-purple-600 hover:underline disabled:opacity-50 dark:text-purple-300"
            >
              <Mail size={14} />
              {sendingReset
                ? 'Sending…'
                : 'Forgot your current password? Email me a reset link'}
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Shield size={14} />
            )}
            {needsCurrent ? 'Update password' : 'Set password'}
          </button>
        </div>
      </form>
    </div>
  )
}
