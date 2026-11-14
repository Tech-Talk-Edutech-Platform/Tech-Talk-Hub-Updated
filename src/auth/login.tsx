import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { supabase } from '../supabase'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { authErrorFromState } from '../lib/authRedirectError'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'
import { hasStoredSession } from '../hooks/useAuthUser'
import { sendPasswordResetEmail } from '../lib/passwordRecovery'
import { getErrorMessage } from '../lib/getErrorMessage'
import { AuthShell, authButtonClass, authInputClass } from './AuthShell'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
type LoginValues = z.infer<typeof loginSchema>

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
})
type ForgotValues = z.infer<typeof forgotSchema>

/** `/login?forgot=1` opens straight on the reset form (used by expired links). */
function startsOnForgot(search: string) {
  return new URLSearchParams(search).has('forgot')
}

export default function Login() {
  usePageMeta(staticPageMeta('/login'))
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'forgot'>(() =>
    startsOnForgot(location.search) ? 'forgot' : 'login',
  )

  // Only someone with a saved session waits while we look up their dashboard;
  // everyone else sees the form straight away.
  const [redirecting, setRedirecting] = useState(hasStoredSession)

  useEffect(() => {
    let active = true

    const goToDashboard = async (userId: string) => {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      if (!active) return
      if (profile?.role) {
        void navigate(`/${profile.role}`, { replace: true })
      } else {
        setRedirecting(false)
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session?.user) void goToDashboard(session.user.id)
      else setRedirecting(false)
    })

    // Google sign-in returns here with a new session.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          void goToDashboard(session.user.id)
        }
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [navigate])

  if (redirecting) {
    return (
      <AuthShell title="Welcome back" subtitle="Opening your dashboard…">
        <div className="flex justify-center py-6">
          <output
            aria-label="Opening your dashboard"
            className="block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          />
        </div>
      </AuthShell>
    )
  }

  return mode === 'login' ? (
    <LoginForm onForgot={() => setMode('forgot')} />
  ) : (
    <ForgotPasswordForm onBack={() => setMode('login')} />
  )
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  // Set when a Google / email-link sign-in failed and redirected here.
  const [redirectError, setRedirectError] = useState(() =>
    authErrorFromState(location.state),
  )
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Clear the message from history so refreshing the page doesn't show it again.
  useEffect(() => {
    if (authErrorFromState(location.state)) {
      void navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  const handleLogin = async ({ email, password }: LoginValues) => {
    setRedirectError(null)
    setLoading(true)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      toast.error(
        /invalid login credentials/i.test(authError.message)
          ? 'Wrong email or password. Use “Forgot password?” if you can’t remember it.'
          : authError.message,
      )
      setLoading(false)
      return
    }

    if (!user) {
      toast.error('Authentication did not return a user.')
      setLoading(false)
      return
    }

    const { data: profile, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !profile) {
      toast.error('Profile not found.')
      setLoading(false)
      return
    }

    toast.success('Welcome back!')
    void navigate(`/${profile.role}`, { replace: true })
  }

  // Google OAuth login (forces account selection)
  const handleGoogleLogin = async () => {
    setRedirectError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account', // forces Google to show the account chooser
        },
      },
    })

    if (error) toast.error(error.message)
  }

  return (
    <AuthShell
      title="Portal Login"
      subtitle="Sign in to your Tech Talk Hub account"
    >
      {redirectError && (
        <p
          role="alert"
          className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700"
        >
          {redirectError}
        </p>
      )}

      <button
        onClick={() => void handleGoogleLogin()}
        type="button"
        className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-50"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          className="h-5 w-5"
          alt=""
        />
        Continue with Google
      </button>

      <div className="mb-6 flex items-center gap-3 text-xs font-bold tracking-widest text-slate-300 uppercase">
        <span className="h-px flex-1 bg-slate-100" />
        or
        <span className="h-px flex-1 bg-slate-100" />
      </div>

      <form
        onSubmit={(event) => void handleSubmit(handleLogin)(event)}
        className="flex flex-col gap-5"
      >
        <input
          type="email"
          autoComplete="email"
          placeholder="Email Address"
          aria-label="Email address"
          className={authInputClass}
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          required
        />
        {errors.email && (
          <p
            id="login-email-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {errors.email.message}
          </p>
        )}
        <div>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            className={authInputClass}
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'login-password-error' : undefined
            }
            required
          />
          {errors.password && (
            <p
              id="login-password-error"
              role="alert"
              className="mt-2 text-sm text-red-600"
            >
              {errors.password.message}
            </p>
          )}
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={onForgot}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'SIGNING IN…' : 'LOG IN TO DASHBOARD'}
        </button>
      </form>
    </AuthShell>
  )
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const sendLink = async ({ email }: ForgotValues) => {
    setSending(true)
    try {
      await sendPasswordResetEmail(email)
      setSentTo(email.trim())
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'We couldn’t send the email. Try again.'),
      )
    } finally {
      setSending(false)
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="space-y-4 text-center text-sm leading-6 text-slate-600">
          <p>
            If <strong className="text-slate-900">{sentTo}</strong> has a Tech
            Talk Hub account, a link to reset the password is on its way. It
            works once and expires after an hour.
          </p>
          <p className="text-xs text-slate-400">
            Nothing after a few minutes? Check spam, or send it again.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Send again
          </button>
          <button type="button" onClick={onBack} className={authButtonClass}>
            BACK TO LOGIN
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we’ll send you a reset link."
    >
      <form
        onSubmit={(event) => void handleSubmit(sendLink)(event)}
        className="flex flex-col gap-5"
      >
        <input
          type="email"
          autoComplete="email"
          placeholder="Email Address"
          aria-label="Email address"
          className={authInputClass}
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          required
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the only field on a screen the person just chose to open
          autoFocus
        />
        {errors.email && (
          <p
            id="forgot-email-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {errors.email.message}
          </p>
        )}
        <button type="submit" disabled={sending} className={authButtonClass}>
          {sending ? 'SENDING…' : 'SEND RESET LINK'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-slate-500 hover:text-slate-800"
        >
          ← Back to login
        </button>
      </form>
    </AuthShell>
  )
}
