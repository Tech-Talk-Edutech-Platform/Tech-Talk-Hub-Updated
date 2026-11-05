import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import {
  Settings,
  User,
  Lock,
  Bell,
  Shield,
  Save,
  Loader2,
  Sun,
  Moon,
  LogOut,
  Camera,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function AdminSettingsView({ user }) {
  const [fullName, setFullName] = useState(user?.full_name || user?.name || '')
  const [email] = useState(user?.email || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [examReminders, setExamReminders] = useState(true)

  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark'),
  )

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('users')
        .select('is_dark_mode')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && typeof data.is_dark_mode === 'boolean') {
            setIsDarkMode(data.is_dark_mode)
            if (data.is_dark_mode) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          }
        })
    }
  }, [user?.id])

  const toggleTheme = async () => {
    const nextMode = !isDarkMode
    setIsDarkMode(nextMode)

    if (nextMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    toast.success(nextMode ? 'Dark mode activated' : 'Light mode activated')

    if (user?.id) {
      await supabase
        .from('users')
        .update({ is_dark_mode: nextMode })
        .eq('id', user.id)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('profiles').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      toast.success('Avatar updated successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to upload avatar.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!user?.id) return
    setIsUpdatingProfile(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error
      toast.success('Profile updated successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to update profile.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
      toast.success('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to update password.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully.')
      window.location.reload()
    } catch (err) {
      toast.error('Failed to sign out.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
          <Settings className="text-blue-600" /> Platform Settings & Controls
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure global notification triggers, access thresholds, and system
          preferences.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-500/10">
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Interface Theme
            </h3>
            <p className="text-xs text-slate-400">
              Switch between light and dark viewing mode.
            </p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-500/10">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Profile & Avatar
            </h3>
            <p className="text-xs text-slate-400">
              Update your profile identity and picture.
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-6 border-b border-slate-100 pb-6 dark:border-white/5">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-purple-500 bg-purple-100 text-xl font-bold text-purple-600 dark:bg-purple-900/30">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              fullName?.charAt(0)?.toUpperCase() || 'A'
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 text-xs font-bold text-purple-600 transition hover:bg-purple-100 dark:bg-purple-500/10">
              <Camera size={14} /> Change Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-[11px] text-slate-400">
              Recommended: Square JPG or PNG under 2MB.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Email Address (Locked)
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500 opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition hover:bg-purple-700 disabled:opacity-50"
            >
              {isUpdatingProfile ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}{' '}
              Save Profile
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Security & Password
            </h3>
            <p className="text-xs text-slate-400">
              Ensure your account is secure by updating your password regularly.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {isUpdatingPassword ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Shield size={14} />
              )}{' '}
              Update Password
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-pink-50 p-3 text-pink-600 dark:bg-pink-500/10">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Notifications
            </h3>
            <p className="text-xs text-slate-400">
              Manage how you receive alerts and system updates.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Email Alerts
              </p>
              <p className="text-xs text-slate-400">
                Receive system-wide announcements and reports.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={() => setEmailNotifications(!emailNotifications)}
              className="h-5 w-5 cursor-pointer rounded accent-purple-600"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                System Reminders
              </p>
              <p className="text-xs text-slate-400">
                Get notified when platform activities or reviews are logged.
              </p>
            </div>
            <input
              type="checkbox"
              checked={examReminders}
              onChange={() => setExamReminders(!examReminders)}
              className="h-5 w-5 cursor-pointer rounded accent-purple-600"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-white/10">
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Automated Attendance Reminders
            </h4>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Ping tutors 5 minutes prior to un-logged live sessions.
            </p>
          </div>
          <button
            onClick={() => toast.success('Settings updated successfully!')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm"
          >
            Configure
          </button>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/30 p-5 dark:border-rose-500/20 dark:bg-rose-500/5">
          <div>
            <h4 className="text-sm font-black text-rose-900 dark:text-rose-400">
              Maintenance Mode
            </h4>
            <p className="mt-0.5 text-xs font-medium text-rose-500">
              Temporarily restrict student login access for system updates.
            </p>
          </div>
          <button
            onClick={() =>
              toast.error('Action requires Master Owner privileges.')
            }
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm"
          >
            Toggle
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-red-100 bg-red-50/50 p-8 shadow-sm dark:border-red-500/20 dark:bg-red-500/5">
        <div>
          <h3 className="text-base font-bold text-red-600 dark:text-red-400">
            Terminate Session
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Sign out securely from your admin account on this device.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  )
}
