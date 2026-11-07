import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../supabase'
import {
  X,
  Package,
  History,
  Clock,
  Link,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Constants } from '../../types/database'
import type { Database, Tables } from '../../types/database'
import { getErrorMessage } from '../../lib/getErrorMessage'

type UserRole = Database['public']['Enums']['user_role']

type EditingUser = Pick<
  Tables<'users'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'role'
  | 'personal_meet_link'
  | 'subscription_tier'
  | 'total_classes'
  | 'classes_remaining'
>

interface UserManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => unknown
  /** The user to edit; the form reads it once, so remount (e.g. via `key`) to switch users. */
  editingUser?: EditingUser | null
}

interface UserFormData {
  email: string
  fullName: string
  role: UserRole
  meetLink: string
  subscriptionTier: string
  // Number inputs hold strings while the user types
  totalClasses: number | string
  classesRemaining: number | string
}

interface AttendanceHistoryRow {
  id: string
  created_at: string | null
  calendar_events: { title: string; start_time: string } | null
}

const NEW_USER_FORM: UserFormData = {
  email: '',
  fullName: '',
  role: 'student',
  meetLink: '',
  subscriptionTier: 'Starter',
  totalClasses: 4,
  classesRemaining: 4,
}

function toUserRole(value: string): UserRole | undefined {
  return Constants.public.Enums.user_role.find((role) => role === value)
}

/** A class count from a number input; `null` when the field is empty. */
function toClassCount(value: number | string): number | null {
  if (typeof value === 'number') return value
  const count = parseInt(value, 10)
  return Number.isNaN(count) ? null : count
}

function formFromUser(user: EditingUser | null): UserFormData {
  if (!user) return NEW_USER_FORM
  return {
    email: user.email || '',
    fullName: user.full_name || '',
    role: user.role || 'student',
    meetLink: user.personal_meet_link || '',
    subscriptionTier: user.subscription_tier || 'Starter',
    totalClasses: user.total_classes || 0,
    classesRemaining: user.classes_remaining || 0,
  }
}

async function loadAttendanceHistory(
  studentId: string,
): Promise<AttendanceHistoryRow[]> {
  try {
    const { data, error } = await supabase
      .from('event_attendance')
      .select(
        `
          id,
          created_at,
          calendar_events (title, start_time)
        `,
      )
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (err) {
    console.error(
      'Error fetching history:',
      getErrorMessage(err, 'Unknown error'),
    )
    return []
  }
}

export default function UserManagementModal({
  isOpen,
  onClose,
  onRefresh,
  editingUser = null,
}: UserManagementModalProps) {
  const [formData, setFormData] = useState<UserFormData>(() =>
    formFromUser(editingUser),
  )

  const [history, setHistory] = useState<AttendanceHistoryRow[]>([])
  const [loading, setLoading] = useState(false)

  const historyStudentId =
    isOpen && editingUser?.role === 'student' ? editingUser.id : null

  // Load the attendance history of the student being edited
  useEffect(() => {
    if (!historyStudentId) return undefined
    let cancelled = false
    void loadAttendanceHistory(historyStudentId).then((rows) => {
      if (!cancelled) setHistory(rows)
    })
    return () => {
      cancelled = true
    }
  }, [historyStudentId])

  // Increment Classes (Top-Up)
  const handleTopUp = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      totalClasses: (toClassCount(prev.totalClasses) ?? 0) + amount,
      classesRemaining: (toClassCount(prev.classesRemaining) ?? 0) + amount,
    }))
    toast.success(`Added ${amount} classes to draft`)
  }

  // Save Logic (Create or Update)
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        full_name: formData.fullName,
        role: formData.role,
        personal_meet_link:
          formData.role === 'tutor' ? formData.meetLink : null,
        subscription_tier:
          formData.role === 'student' ? formData.subscriptionTier : null,
        total_classes:
          formData.role === 'student'
            ? toClassCount(formData.totalClasses)
            : null,
        classes_remaining:
          formData.role === 'student'
            ? toClassCount(formData.classesRemaining)
            : null,
      }

      if (editingUser) {
        // UPDATE EXISTING
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('Profile & Package Updated')
      } else {
        // CREATE NEW
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: 'TempPassword123!', // You should ideally handle this via reset email
          options: {
            data: { ...payload },
          },
        })

        if (error) throw error
        toast.success('Account created successfully!')
      }

      onRefresh()
      onClose()
    } catch (err) {
      toast.error(`Error: ${getErrorMessage(err, 'Unable to save user')}`)
    } finally {
      setLoading(false)
    }
  }

  const hasClassesRemaining = (toClassCount(formData.classesRemaining) ?? 0) > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl md:flex-row">
        {/* LEFT SIDE: FORM */}
        <div className="flex-1 overflow-y-auto border-r border-slate-100 p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-black text-slate-900">
              {editingUser ? (
                <ShieldCheck className="text-blue-600" />
              ) : (
                <UserPlus className="text-blue-600" />
              )}
              {editingUser ? 'Edit Profile' : 'Add Team Member'}
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="user-modal-name"
                className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase"
              >
                Full Name
              </label>
              <input
                id="user-modal-name"
                required
                placeholder="Alex Rivera"
                className="w-full rounded-2xl border-none bg-slate-50 p-4 text-sm font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="user-modal-email"
                className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase"
              >
                Email
              </label>
              <input
                id="user-modal-email"
                required
                disabled={!!editingUser}
                type="email"
                placeholder="email@company.com"
                className="w-full rounded-2xl border-none bg-slate-50 p-4 text-sm font-bold outline-hidden disabled:opacity-50"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="user-modal-role"
                className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase"
              >
                Position / Permissions
              </label>
              <select
                id="user-modal-role"
                className="w-full appearance-none rounded-2xl border-none bg-slate-50 p-4 text-sm font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: toUserRole(e.target.value) ?? formData.role,
                  })
                }
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="operations_admin">Operations Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            {/* STUDENT PACKAGE SECTION */}
            {formData.role === 'student' && (
              <div className="animate-in fade-in zoom-in-95 space-y-4 rounded-3xl border border-purple-100 bg-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-purple-600 uppercase">
                    <Package size={14} /> Course Package
                  </div>
                  <span
                    className={`text-[10px] font-bold ${hasClassesRemaining ? 'text-purple-400' : 'animate-pulse text-red-500'}`}
                  >
                    Status: {hasClassesRemaining ? 'Active' : 'Low Balance'}
                  </span>
                </div>

                {/* Quick Top-Up */}
                <div className="space-y-1">
                  <p className="ml-1 text-[9px] font-bold text-purple-400 uppercase">
                    Quick Top-Up
                  </p>
                  <div className="flex gap-2">
                    {[4, 8, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleTopUp(num)}
                        className="flex-1 rounded-xl border border-purple-200 bg-white py-2 text-xs font-bold text-purple-600 transition-colors hover:bg-purple-600 hover:text-white"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="user-modal-total-classes"
                      className="ml-1 text-[9px] font-bold text-purple-400 uppercase"
                    >
                      Total
                    </label>
                    <input
                      id="user-modal-total-classes"
                      type="number"
                      className="w-full rounded-xl border-none bg-white p-3 text-xs font-bold outline-hidden"
                      value={formData.totalClasses}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalClasses: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="user-modal-classes-remaining"
                      className="ml-1 text-[9px] font-bold text-red-500 uppercase"
                    >
                      Remaining
                    </label>
                    <input
                      id="user-modal-classes-remaining"
                      type="number"
                      className="w-full rounded-xl border-none bg-red-50 p-3 text-xs font-bold text-red-600 outline-hidden"
                      value={formData.classesRemaining}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          classesRemaining: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'tutor' && (
              <div className="space-y-1">
                <label
                  htmlFor="user-modal-meet-link"
                  className="flex items-center gap-1 text-[10px] font-black tracking-widest text-blue-600 uppercase"
                >
                  <Link size={12} /> Company Meet Link
                </label>
                <input
                  id="user-modal-meet-link"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold outline-hidden"
                  value={formData.meetLink}
                  onChange={(e) =>
                    setFormData({ ...formData, meetLink: e.target.value })
                  }
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : editingUser
                  ? 'Update Profile'
                  : 'Create Account'}
            </button>
          </form>
        </div>

        {/* RIGHT SIDE: HISTORY (Only for existing students) */}
        <div className="w-full overflow-y-auto bg-slate-50 p-6 md:w-72">
          <h4 className="mb-4 flex items-center gap-2 text-xs font-black text-slate-400 uppercase">
            <History size={14} /> Class History
          </h4>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((h) => (
                <div
                  key={h.id}
                  className="animate-in slide-in-from-right-2 rounded-xl border border-slate-100 bg-white p-3 shadow-xs"
                >
                  <p className="text-[10px] leading-tight font-bold text-slate-900">
                    {h.calendar_events?.title || 'Unnamed Session'}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
                    <Clock size={8} />{' '}
                    {h.created_at
                      ? new Date(h.created_at).toLocaleDateString()
                      : ''}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-[10px] text-slate-400 italic">
                  No classes attended yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
