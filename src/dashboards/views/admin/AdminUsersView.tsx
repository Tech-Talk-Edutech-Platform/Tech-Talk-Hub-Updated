import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Users2,
  Plus,
  Search,
  Filter,
  Trash2,
  Mail,
  LayoutGrid,
  Table as TableIcon,
  Edit3,
  X,
  Check,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import AddUserModal from '../../../features/accounts/AddUserModal'
import { toast } from 'react-hot-toast'
import { Constants } from '../../../types/database'
import type { Database } from '../../../types/database'

type UserRole = Database['public']['Enums']['user_role']

interface AdminUser {
  id: string
  full_name: string
  email: string | null
  role: UserRole | null
  is_active?: boolean | null
  assigned_tutor_id?: string | null
  assigned_course_id?: string | null
  subscription_tier?: string | null
  classes_per_week?: number | string | null
  classes_remaining?: number | string | null
  created_at?: string | null
}

interface TutorOption {
  id: string
  full_name: string | null
}

interface CourseOption {
  id: string
  title: string
}

function toUserRole(value: string): UserRole | undefined {
  return Constants.public.Enums.user_role.find((role) => role === value)
}

/** Number inputs hold strings while editing; an empty field clears the value. */
function toClassCount(value: number | string | null | undefined) {
  if (value === '' || value === null || value === undefined) return null
  return typeof value === 'number' ? value : parseInt(value, 10) || 0
}

function formatJoinedDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—'
}

async function loadUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function loadTutorsAndCourses(): Promise<{
  tutors: TutorOption[]
  courses: CourseOption[]
}> {
  const { data: tutors } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'tutor')

  const { data: courses } = await supabase.from('courses').select('id, title')
  return { tutors: tutors ?? [], courses: courses ?? [] }
}

export default function AdminUsersView() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  // Default filter is student as requested
  const [roleFilter, setRoleFilter] = useState('student')
  const [viewMode, setViewMode] = useState('grid') // "grid" or "table"
  const [showAddModal, setShowAddModal] = useState(false)

  // Edit & Relations Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [tutorsList, setTutorsList] = useState<TutorOption[]>([])
  const [coursesList, setCoursesList] = useState<CourseOption[]>([])
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      setUsers(await loadUsers())
    } catch {
      toast.error('Failed to load users')
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    loadUsers().then(
      (rows) => {
        if (cancelled) return
        setUsers(rows)
        setLoading(false)
      },
      () => {
        if (cancelled) return
        toast.error('Failed to load users')
        setLoading(false)
      },
    )

    void loadTutorsAndCourses().then(({ tutors, courses }) => {
      if (cancelled) return
      setTutorsList(tutors)
      setCoursesList(courses)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) toast.error('Failed to delete user')
    else {
      toast.success('User deleted')
      await fetchUsers()
    }
  }

  const handleUpdateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)

    const { error } = await supabase
      .from('users')
      .update({
        full_name: editingUser.full_name,
        role: editingUser.role,
        is_active: editingUser.is_active,
        assigned_tutor_id: editingUser.assigned_tutor_id || null,
        assigned_course_id: editingUser.assigned_course_id || null,
        subscription_tier: editingUser.subscription_tier || null,
        classes_per_week: toClassCount(editingUser.classes_per_week),
        classes_remaining: toClassCount(editingUser.classes_remaining),
      })
      .eq('id', editingUser.id)

    setSaving(false)

    if (error) {
      toast.error('Failed to update user details')
    } else {
      toast.success('User updated successfully')
      setEditingUser(null)
      await fetchUsers()
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Helper to get name of assigned tutor or course
  const getTutorName = (tutorId: string | null | undefined) => {
    const t = tutorsList.find((item) => item.id === tutorId)
    return t ? t.full_name : 'None assigned'
  }

  const getCourseName = (courseId: string | null | undefined) => {
    const c = coursesList.find((item) => item.id === courseId)
    return c ? c.title : 'None assigned'
  }

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xs md:p-8 dark:border-white/10 dark:bg-white/5">
      {/* Header & Action */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Users2 className="text-purple-600" /> Users & Staff Management
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-400">
            Manage platform accounts, roles, and permissions.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-xs font-black tracking-wider text-white uppercase shadow-md shadow-purple-500/20 transition-all hover:bg-purple-700"
        >
          <Plus size={16} /> Add New User
        </button>
      </div>

      {/* Search, Filter & View Toggle Bar */}
      <div className="flex flex-col items-center justify-between gap-3 lg:flex-row">
        <div className="relative w-full flex-1">
          <Search
            className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            className="w-full rounded-2xl border border-slate-200/60 bg-slate-50 py-3.5 pr-4 pl-12 text-sm font-bold text-slate-900 outline-hidden transition-all focus:border-purple-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex w-full items-center justify-end gap-3 lg:w-auto">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/5">
            <Filter size={16} className="shrink-0 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="cursor-pointer bg-transparent py-3 text-xs font-black tracking-wider text-slate-600 uppercase outline-hidden dark:text-slate-300"
            >
              <option value="all" className="dark:bg-slate-900">
                All Roles
              </option>
              <option value="student" className="dark:bg-slate-900">
                Students
              </option>
              <option value="tutor" className="dark:bg-slate-900">
                Tutors
              </option>
              <option value="tech_admin" className="dark:bg-slate-900">
                Admins
              </option>
              <option value="owner" className="dark:bg-slate-900">
                Owners
              </option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex shrink-0 items-center rounded-2xl border border-slate-200/60 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-xl p-2.5 transition-all ${viewMode === 'grid' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-xl p-2.5 transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* User Database Display */}
      {loading ? (
        <div className="p-12 text-center font-bold text-slate-400">
          Loading user database...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center font-bold text-slate-400 dark:border-white/10 dark:bg-white/5">
          No users found matching your criteria.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="truncate text-base font-black text-slate-900 dark:text-white">
                    {user.full_name || 'Unnamed'}
                  </h4>
                  <span className="shrink-0 rounded-lg border border-purple-100 bg-purple-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-purple-600 uppercase dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
                    {user.role}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>

                {/* Additional relations metadata snippet */}
                {user.role === 'student' && (
                  <div className="mt-3 space-y-1 rounded-xl bg-slate-100/60 p-2 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <p className="truncate">
                      <strong className="text-slate-700 dark:text-slate-300">
                        Tutor:
                      </strong>{' '}
                      {getTutorName(user.assigned_tutor_id)}
                    </p>
                    <p className="truncate">
                      <strong className="text-slate-700 dark:text-slate-300">
                        Course:
                      </strong>{' '}
                      {getCourseName(user.assigned_course_id)}
                    </p>
                    {user.classes_remaining !== null && (
                      <p>
                        <strong className="text-slate-700 dark:text-slate-300">
                          Classes Left:
                        </strong>{' '}
                        {user.classes_remaining}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400 dark:border-white/10">
                <span>Joined {formatJoinedDate(user.created_at)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="rounded-lg p-1.5 text-purple-600 hover:bg-slate-100 dark:hover:bg-white/10"
                    title="Edit User & Relations"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() =>
                      (window.location.href = `mailto:${user.email}`)
                    }
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                    title="Send Email"
                  >
                    <Mail size={14} />
                  </button>
                  <button
                    onClick={() => void handleDeleteUser(user.id)}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    title="Delete User"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/10">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black tracking-wider text-slate-400 uppercase dark:border-white/10 dark:bg-white/5">
                <th className="p-4">Name & Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Tutor / Course</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600 dark:divide-white/10 dark:text-slate-300">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
                >
                  <td className="p-4">
                    <p className="font-black text-slate-900 dark:text-white">
                      {user.full_name || 'Unnamed'}
                    </p>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </td>
                  <td className="p-4">
                    <span className="rounded-lg border border-purple-100 bg-purple-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-purple-600 uppercase dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.role === 'student' ? (
                      <div className="space-y-0.5 text-[11px]">
                        <p>
                          <span className="font-bold text-slate-400">
                            Tutor:
                          </span>{' '}
                          {getTutorName(user.assigned_tutor_id)}
                        </p>
                        <p>
                          <span className="font-bold text-slate-400">
                            Course:
                          </span>{' '}
                          {getCourseName(user.assigned_course_id)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">N/A</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-slate-400">
                    {formatJoinedDate(user.created_at)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Edit user and relations"
                        onClick={() => setEditingUser(user)}
                        className="rounded-xl p-2 text-purple-600 hover:bg-slate-100 dark:hover:bg-white/10"
                        title="Edit User & Relations"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Send email"
                        onClick={() =>
                          (window.location.href = `mailto:${user.email}`)
                        }
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                        title="Send Email"
                      >
                        <Mail size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete user"
                        onClick={() => void handleDeleteUser(user.id)}
                        className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT USER & RELATIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl md:p-8 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Edit User Details
                </h3>
                <p className="mt-0.5 text-xs font-bold text-slate-400">
                  Modify role, details, and tutor/course assignments.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit user"
                onClick={() => setEditingUser(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleUpdateUser(e)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="edit-user-name"
                  className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                >
                  Full Name
                </label>
                <input
                  id="edit-user-name"
                  type="text"
                  required
                  value={editingUser.full_name || ''}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-hidden focus:border-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-user-email"
                  className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                >
                  Email (Read Only)
                </label>
                <input
                  id="edit-user-email"
                  type="email"
                  disabled
                  value={editingUser.email || ''}
                  className="w-full cursor-not-allowed rounded-2xl border border-slate-200/60 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-user-role"
                    className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                  >
                    Role
                  </label>
                  <select
                    id="edit-user-role"
                    value={editingUser.role || 'student'}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: toUserRole(e.target.value) ?? editingUser.role,
                      })
                    }
                    className="w-full cursor-pointer rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs font-black tracking-wider text-slate-700 uppercase outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    <option value="student" className="dark:bg-slate-900">
                      Student
                    </option>
                    <option value="tutor" className="dark:bg-slate-900">
                      Tutor
                    </option>
                    <option value="tech_admin" className="dark:bg-slate-900">
                      Admin
                    </option>
                    <option value="owner" className="dark:bg-slate-900">
                      Owner
                    </option>
                    <option
                      value="operations_admin"
                      className="dark:bg-slate-900"
                    >
                      Operations Admin
                    </option>
                    <option value="non_user" className="dark:bg-slate-900">
                      Non User
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-user-status"
                    className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                  >
                    Account Status
                  </label>
                  <select
                    id="edit-user-status"
                    value={editingUser.is_active ? 'true' : 'false'}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        is_active: e.target.value === 'true',
                      })
                    }
                    className="w-full cursor-pointer rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs font-black tracking-wider text-slate-700 uppercase outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    <option value="true" className="dark:bg-slate-900">
                      Active
                    </option>
                    <option value="false" className="dark:bg-slate-900">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              {/* Relations Fields (Primarily for Students) */}
              {editingUser.role === 'student' && (
                <div className="space-y-4 border-t border-slate-100 pt-2 dark:border-white/10">
                  <p className="text-xs font-black tracking-wider text-purple-600 uppercase">
                    Student Relations & Plan
                  </p>

                  <div>
                    <label
                      htmlFor="edit-user-tutor"
                      className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                    >
                      Assigned Tutor
                    </label>
                    <select
                      id="edit-user-tutor"
                      value={editingUser.assigned_tutor_id || ''}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          assigned_tutor_id: e.target.value || null,
                        })
                      }
                      className="w-full cursor-pointer rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      <option value="">-- No Tutor Assigned --</option>
                      {tutorsList.map((t) => (
                        <option
                          key={t.id}
                          value={t.id}
                          className="dark:bg-slate-900"
                        >
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-user-course"
                      className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                    >
                      Assigned Course
                    </label>
                    <select
                      id="edit-user-course"
                      value={editingUser.assigned_course_id || ''}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          assigned_course_id: e.target.value || null,
                        })
                      }
                      className="w-full cursor-pointer rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      <option value="">-- No Course Assigned --</option>
                      {coursesList.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="dark:bg-slate-900"
                        >
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="edit-user-classes-per-week"
                        className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                      >
                        Classes / Week
                      </label>
                      <input
                        id="edit-user-classes-per-week"
                        type="number"
                        value={editingUser.classes_per_week ?? ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            classes_per_week: e.target.value,
                          })
                        }
                        className="w-full rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-hidden focus:border-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-user-classes-remaining"
                        className="mb-1.5 block text-xs font-black tracking-wider text-slate-500 uppercase"
                      >
                        Classes Remaining
                      </label>
                      <input
                        id="edit-user-classes-remaining"
                        type="number"
                        value={editingUser.classes_remaining ?? ''}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            classes_remaining: e.target.value,
                          })
                        }
                        className="w-full rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-hidden focus:border-purple-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black tracking-wider text-slate-600 uppercase transition-all hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 text-xs font-black tracking-wider text-white uppercase shadow-md shadow-purple-500/20 transition-all hover:bg-purple-700"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check size={16} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onRefresh={() => void fetchUsers()}
        />
      )}
    </div>
  )
}
