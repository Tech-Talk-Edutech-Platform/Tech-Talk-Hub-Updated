import { LogOut } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../../../supabase'

/** Settings › sign out of this device. */
export function SignOutCard({ portal }: { portal: string }) {
  const navigate = useNavigate()

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Couldn’t sign out. Try again.')
      return
    }
    void navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-red-100 bg-red-50/50 p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:border-red-500/20 dark:bg-red-500/5">
      <div>
        <h2 className="text-base font-bold text-red-600 dark:text-red-400">
          Sign out
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Sign out of your {portal} account on this device. Your theme is saved
          to your account and comes back when you sign in.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}
