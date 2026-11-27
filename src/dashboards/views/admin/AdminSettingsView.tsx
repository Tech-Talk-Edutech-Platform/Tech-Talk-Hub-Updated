import { Settings } from 'lucide-react'

import type { DashboardIdentity } from '../../../types/dashboardIdentity'
import { PasswordSettingsCard } from '../shared/PasswordSettingsCard'
import { ProfileSettingsCard } from '../shared/ProfileSettingsCard'
import { UsernameSettingsCard } from '../shared/UsernameSettingsCard'
import { SignOutCard } from '../shared/SignOutCard'
import { ThemeSettingsCard } from '../shared/ThemeSettingsCard'

type AdminSettingsViewProps = {
  user: DashboardIdentity
  /** Refreshes the dashboard's copy of the signed-in person after a save. */
  onProfileSaved?: () => void
}

/** Dashboard › Settings for admins. */
export default function AdminSettingsView({
  user,
  onProfileSaved,
}: AdminSettingsViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
          <Settings className="text-blue-600" aria-hidden="true" /> Platform
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your appearance, admin profile, password and sign-in.
        </p>
      </div>
      <ThemeSettingsCard userId={user.id} />
      <ProfileSettingsCard user={user} onSaved={onProfileSaved} />
      <UsernameSettingsCard userId={user.id} />
      <PasswordSettingsCard user={user} />
      <SignOutCard portal="admin" />
    </div>
  )
}
