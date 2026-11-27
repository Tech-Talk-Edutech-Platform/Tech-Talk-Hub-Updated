import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

import { supabase } from '../supabase'
import { usePageMeta } from '../hooks/usePageMeta'
import { readAuthRedirectError } from '../lib/authRedirectError'
import { getErrorMessage } from '../lib/getErrorMessage'
import {
  MIN_PASSWORD_LENGTH,
  newPasswordProblem,
} from '../lib/passwordRecovery'
import { PasswordInput } from '../components/ui/PasswordInput'
import { AuthShell, authButtonClass, authInputClass } from './AuthShell'

type Stage = 'checking' | 'ready' | 'invalid' | 'done'

/**
 * Where the password-reset email link lands. supabase-js turns the link into
 * a short-lived session; with it, the person chooses a new password.
 */
export default function ResetPasswordPage() {
  usePageMeta({
    title: 'Choose a new password',
    description: 'Set a new password for your Tech Talk Hub account.',
    path: '/reset-password',
    noindex: true,
  })
  const navigate = useNavigate()
  // An expired or already-used link comes back with an error instead of a session.
  const [linkError] = useState(() =>
    readAuthRedirectError(window.location.search, window.location.hash),
  )
  const [stage, setStage] = useState<Stage>(() =>
    linkError ? 'invalid' : 'checking',
  )
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (linkError) return undefined
    let active = true

    // getSession waits for supabase-js to finish reading the link's tokens.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setStage(session ? 'ready' : 'invalid')
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStage((current) => (current === 'done' ? current : 'ready'))
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [linkError])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issue = newPasswordProblem(password, confirmation)
    setProblem(issue)
    if (issue) return

    setSaving(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStage('done')
      toast.success('Password updated.')

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      window.setTimeout(() => {
        void navigate(profile?.role ? `/${profile.role}` : '/login', {
          replace: true,
        })
      }, 1500)
    } catch (error) {
      setProblem(
        getErrorMessage(error, 'We couldn’t update your password. Try again.'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (stage === 'checking') {
    return (
      <AuthShell title="Choose a new password" subtitle="Checking your link…">
        <div className="flex justify-center py-6">
          <output
            aria-label="Checking your reset link"
            className="block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          />
        </div>
      </AuthShell>
    )
  }

  if (stage === 'invalid') {
    return (
      <AuthShell title="This link no longer works">
        <p className="text-center text-sm leading-6 text-slate-600">
          Password reset links work once and expire after an hour. Request a new
          one and use the latest email.
        </p>
        <Link
          to="/login?forgot=1"
          className={`${authButtonClass} mt-8 block text-center`}
        >
          SEND A NEW LINK
        </Link>
      </AuthShell>
    )
  }

  if (stage === 'done') {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Taking you to your dashboard…"
      >
        <p className="text-center text-sm text-slate-600">
          Use your new password next time you sign in.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`At least ${MIN_PASSWORD_LENGTH} characters, with letters and numbers.`}
    >
      <form
        onSubmit={(event) => void save(event)}
        className="flex flex-col gap-5"
      >
        <PasswordInput
          autoComplete="new-password"
          placeholder="New password"
          aria-label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authInputClass}
          required
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the person opened this page only to type a new password
          autoFocus
        />
        <PasswordInput
          autoComplete="new-password"
          placeholder="Confirm new password"
          aria-label="Confirm new password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className={authInputClass}
          required
        />
        {problem && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {problem}
          </p>
        )}
        <button type="submit" disabled={saving} className={authButtonClass}>
          {saving ? 'SAVING…' : 'SAVE NEW PASSWORD'}
        </button>
      </form>
    </AuthShell>
  )
}
