import type { DashboardIdentity } from '../../../types/dashboardIdentity'
import { PasswordSettingsCard } from '../shared/PasswordSettingsCard'
import { ProfileSettingsCard } from '../shared/ProfileSettingsCard'
import { UsernameSettingsCard } from '../shared/UsernameSettingsCard'
import { SignOutCard } from '../shared/SignOutCard'
import { ThemeSettingsCard } from '../shared/ThemeSettingsCard'

type StudentSettingsViewProps = {
  user: DashboardIdentity
  /** Refreshes the dashboard's copy of the signed-in person after a save. */
  onProfileSaved?: () => void
}

/** Dashboard › Settings for students, tutors and the sales team. */
export default function StudentSettingsView({
  user,
  onProfileSaved,
}: StudentSettingsViewProps) {
  const portal =
    user.role === 'tutor' || user.role === 'marketer' ? user.role : 'student'

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your appearance, {portal} profile, password and sign-in.
        </p>
      </div>
      <ThemeSettingsCard userId={user.id} />
      <ProfileSettingsCard user={user} onSaved={onProfileSaved} />
      <UsernameSettingsCard userId={user.id} />
      <PasswordSettingsCard user={user} />
      <SignOutCard portal={portal} />
    </div>
  )
}
