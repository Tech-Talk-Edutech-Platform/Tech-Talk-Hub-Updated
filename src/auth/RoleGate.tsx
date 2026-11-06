import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isAppRole, type AppRole } from '../types/roles'

interface RoleGateProps {
  children: ReactNode
  allowedRoles: readonly AppRole[]
}

export default function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const [status, setStatus] = useState('loading') // loading, unauthorized, authorized
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return

      if (!user) {
        setStatus('unauthorized')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .abortSignal(controller.signal)
        .single()

      if (!active) return

      if (
        error ||
        !data ||
        !isAppRole(data.role) ||
        !allowedRoles.includes(data.role)
      ) {
        setStatus('unauthorized')
      } else {
        setStatus('authorized')

        // Auto-redirect if user is on landing page
        // if (window.location.pathname === "/login") {
        //   navigate(`/${data.role}`, { replace: true });
        // }
        // Auto-redirect for logged-in users trying to access public pages
        // if (window.location.pathname === "/" || window.location.pathname === "/login") {
        //   navigate(`/${data.role}`, { replace: true });
        // }
      }
    }

    void checkAccess()
    return () => {
      active = false
      controller.abort()
    }
  }, [allowedRoles, navigate])

  if (status === 'loading') {
    return (
      <div className="flex h-screen animate-pulse items-center justify-center bg-slate-50 font-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs uppercase tracking-widest text-slate-900">
            Verifying Access...
          </span>
        </div>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-900">ACCESS DENIED</h1>
        <p className="mt-2 max-w-sm text-slate-500">
          Your account does not have the required permissions to access this
          dashboard.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/')
          }}
          className="mt-8 rounded-[20px] bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-blue-600"
        >
          Login with Different Account
        </button>
      </div>
    )
  }

  return <>{children}</>
}
