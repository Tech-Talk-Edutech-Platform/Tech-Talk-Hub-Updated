import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { supabase } from '../supabase'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { authErrorFromState } from '../lib/authRedirectError'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
type LoginValues = z.infer<typeof loginSchema>

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
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

  // 1️⃣ Auto-redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role) {
          navigate(`/${profile.role}`, { replace: true })
          return
        }
      }

      setAuthChecking(false)
    }

    checkUser()

    // Only listen to auth changes for redirect AFTER login
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profile?.role) navigate(`/${profile.role}`, { replace: true })
        }
      },
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [navigate])

  // Clear the message from history so refreshing the page doesn't show it again.
  useEffect(() => {
    if (authErrorFromState(location.state)) {
      void navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  // 2️⃣ Email/password login
  const handleLogin = async ({ email, password }: LoginValues) => {
    setRedirectError(null)
    setLoading(true)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      toast.error(authError.message)
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
    navigate(`/${profile.role}`, { replace: true })
  }

  // 3️⃣ Google OAuth login (forces account selection)
  const handleGoogleLogin = async () => {
    setRedirectError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account', // ⚡ Important: forces Google to show account chooser
        },
      },
    })

    if (error) toast.error(error.message)
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg font-bold">
        Authenticating...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8DAFC] p-6">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-[32px] border border-white bg-white p-10 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <span className="text-2xl font-black italic text-white">TT</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Portal Login
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            African Tech Talk
          </p>
        </div>

        {redirectError && (
          <p
            role="alert"
            className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700"
          >
            {redirectError}
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-50"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            className="h-5 w-5"
            alt="Google"
          />
          Continue with Google
        </button>

        <form
          onSubmit={(event) => void handleSubmit(handleLogin)(event)}
          className="flex flex-col gap-5"
        >
          <input
            type="email"
            placeholder="Email Address"
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
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
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
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
              className="text-sm text-red-600"
            >
              {errors.password.message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'LOG IN TO DASHBOARD'}
          </button>
        </form>
      </div>
    </div>
  )
}
