import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, Loader2, Save, User } from 'lucide-react'
import { toast } from 'react-hot-toast'

import type { DashboardIdentity } from '../../../types/dashboardIdentity'
import { getErrorMessage } from '../../../lib/getErrorMessage'
import { useMyProfile } from '../../../hooks/useMyProfile'
import { Avatar } from '../../../components/ui/Avatar'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-hidden transition focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white'
const labelClass =
  'mb-2 block text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300'

type ProfileSettingsCardProps = {
  user: DashboardIdentity
  /** Refreshes the dashboard's own copy of the name after a save. */
  onSaved?: () => void
}

/**
 * Settings › name and avatar. The name box starts from what the database
 * holds now, and Save Profile only wakes up once the name actually changes.
 */
export function ProfileSettingsCard({
  user,
  onSaved,
}: ProfileSettingsCardProps) {
  const { profile, saveName, uploadAvatar } = useMyProfile(user.id, onSaved)
  const savedName = profile.data?.full_name ?? user.full_name ?? ''
  const [draft, setDraft] = useState<string | null>(null)
  const name = draft ?? savedName
  const changed = draft !== null && draft.trim() !== savedName.trim()
  const canSave = changed && name.trim() !== '' && !saveName.isPending

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSave) return
    saveName.mutate(name.trim(), {
      onSuccess: () => {
        setDraft(null)
        toast.success('Name saved.')
      },
      onError: (error) =>
        toast.error(getErrorMessage(error, 'Couldn’t save your name.')),
    })
  }

  const pickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success('Picture updated.'),
      onError: (error) =>
        toast.error(getErrorMessage(error, 'Couldn’t upload the picture.')),
    })
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-white/5">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-500/10">
          <User size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Profile & picture
          </h2>
          <p className="text-xs text-slate-400">
            Your name and picture, as others see them.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-6 border-b border-slate-100 pb-6 dark:border-white/5">
        <div className="relative">
          <Avatar
            name={savedName || user.email || '?'}
            src={profile.data?.avatar_url}
            userRole={user.role}
            size={80}
            className="ring-2 ring-purple-500/40"
          />
          {uploadAvatar.isPending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="animate-spin text-white" size={20} />
            </div>
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 text-xs font-bold text-purple-600 transition focus-within:ring-2 focus-within:ring-purple-500 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-300">
            <Camera size={14} /> Change picture
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={pickAvatar}
              disabled={uploadAvatar.isPending}
              className="sr-only"
            />
          </label>
          <p className="mt-1 text-[11px] text-slate-400">
            Square JPG or PNG under 2 MB. Without one, your initials show.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="settings-full-name" className={labelClass}>
              Full name
            </label>
            <input
              id="settings-full-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setDraft(event.target.value)}
              disabled={profile.isPending}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="settings-email" className={labelClass}>
              Email address (locked)
            </label>
            <input
              id="settings-email"
              type="email"
              value={user.email ?? ''}
              disabled
              className={`${inputClass} cursor-not-allowed opacity-60`}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
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
            {saveName.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saveName.isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
