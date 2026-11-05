import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import {
  X,
  Save,
  Package,
  History,
  Clock,
  Link,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function UserManagementModal({
  isOpen,
  onClose,
  onRefresh,
  editingUser = null,
}) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'student',
    meetLink: '',
    subscriptionTier: 'Starter',
    totalClasses: 4,
    classesRemaining: 4,
  })

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  // 1. Handle Modal Open / Load User Data
  useEffect(() => {
    if (editingUser && isOpen) {
      setFormData({
        email: editingUser.email || '',
        fullName: editingUser.full_name || '',
        role: editingUser.role || 'student',
        meetLink: editingUser.personal_meet_link || '',
        subscriptionTier: editingUser.subscription_tier || 'Starter',
        totalClasses: editingUser.total_classes || 0,
        classesRemaining: editingUser.classes_remaining || 0,
      })
      if (editingUser.role === 'student') {
        fetchHistory(editingUser.id)
      }
    } else {
      // Reset for new user
      setFormData({
        email: '',
        fullName: '',
        role: 'student',
        meetLink: '',
        subscriptionTier: 'Starter',
        totalClasses: 4,
        classesRemaining: 4,
      })
      setHistory([])
    }
  }, [editingUser, isOpen])

  // 2. Fetch Attendance History
  const fetchHistory = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('event_attendance')
        .select(
          `
          created_at, 
          calendar_events (title, start_time)
        `,
        )
        .eq('student_id', uid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      console.error('Error fetching history:', err.message)
    }
  }

  // 3. Increment Classes (Top-Up)
  const handleTopUp = (amount) => {
    setFormData((prev) => ({
      ...prev,
      totalClasses: parseInt(prev.totalClasses || 0) + amount,
      classesRemaining: parseInt(prev.classesRemaining || 0) + amount,
    }))
    toast.success(`Added ${amount} classes to draft`)
  }

  // 4. Save Logic (Create or Update)
  const handleSave = async (e) => {
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
          formData.role === 'student' ? parseInt(formData.totalClasses) : null,
        classes_remaining:
          formData.role === 'student'
            ? parseInt(formData.classesRemaining)
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
      toast.error(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
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
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Full Name
              </label>
              <input
                required
                placeholder="Alex Rivera"
                className="w-full rounded-2xl border-none bg-slate-50 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Email
              </label>
              <input
                required
                disabled={!!editingUser}
                type="email"
                placeholder="email@company.com"
                className="w-full rounded-2xl border-none bg-slate-50 p-4 text-sm font-bold outline-none disabled:opacity-50"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Position / Permissions
              </label>
              <select
                className="w-full appearance-none rounded-2xl border-none bg-slate-50 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="operations_admin">Operations Admin</option>
                <option value="owner">Owner</option>
                <option value="marketer">Marketer</option>
              </select>
            </div>

            {/* STUDENT PACKAGE SECTION */}
            {formData.role === 'student' && (
              <div className="animate-in fade-in zoom-in-95 space-y-4 rounded-3xl border border-purple-100 bg-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600">
                    <Package size={14} /> Course Package
                  </div>
                  <span
                    className={`text-[10px] font-bold ${formData.classesRemaining > 0 ? 'text-purple-400' : 'animate-pulse text-red-500'}`}
                  >
                    Status:{' '}
                    {formData.classesRemaining > 0 ? 'Active' : 'Low Balance'}
                  </span>
                </div>

                {/* Quick Top-Up */}
                <div className="space-y-1">
                  <label className="ml-1 text-[9px] font-bold uppercase text-purple-400">
                    Quick Top-Up
                  </label>
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
                    <label className="ml-1 text-[9px] font-bold uppercase text-purple-400">
                      Total
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-xl border-none bg-white p-3 text-xs font-bold outline-none"
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
                    <label className="ml-1 text-[9px] font-bold uppercase text-red-500">
                      Remaining
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-xl border-none bg-red-50 p-3 text-xs font-bold text-red-600 outline-none"
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
                <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                  <Link size={12} /> Company Meet Link
                </label>
                <input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold outline-none"
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
          <h4 className="mb-4 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
            <History size={14} /> Class History
          </h4>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((h, i) => (
                <div
                  key={i}
                  className="animate-in slide-in-from-right-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <p className="text-[10px] font-bold leading-tight text-slate-900">
                    {h.calendar_events?.title || 'Unnamed Session'}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
                    <Clock size={8} />{' '}
                    {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-[10px] italic text-slate-400">
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
