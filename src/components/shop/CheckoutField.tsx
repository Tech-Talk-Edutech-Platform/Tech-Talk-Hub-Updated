import type { ReactNode } from 'react'

export const CHECKOUT_INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100'

type CheckoutFieldProps = {
  label: string
  children: ReactNode
}

export function CheckoutField({ label, children }: CheckoutFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
