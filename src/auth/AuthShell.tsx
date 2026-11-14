import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import logo from '../assets/images/logo.png'

type AuthShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

/** The branded card the login and password pages sit in. */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8DAFC] p-4 sm:p-6">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-[32px] border border-white bg-white p-7 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="mx-auto mb-4 block w-fit rounded-3xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
            aria-label="Tech Talk Hub home"
          >
            <img
              src={logo}
              alt="Tech Talk Hub"
              width={112}
              height={112}
              className="h-28 w-28 object-contain"
            />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export const authInputClass =
  'w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-hidden focus:ring-2 focus:ring-blue-500'

export const authButtonClass =
  'w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50'
