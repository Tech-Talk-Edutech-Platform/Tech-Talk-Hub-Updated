import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import {
  Search,
  UserCheck,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Loader2,
  Users,
  LayoutGrid,
  Mail,
  Globe,
} from 'lucide-react'
import UserManagementModal from './AddUserModal'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import type { Tables } from '../../types/database'

type UserRow = Pick<
  Tables<'users'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'role'
  | 'assigned_course_id'
  | 'assigned_tutor_id'
  | 'subscription_tier'
  | 'total_classes'
  | 'classes_remaining'
  | 'personal_meet_link'
>
type CourseOption = Pick<Tables<'courses'>, 'id' | 'title'>
type TutorOption = Pick<Tables<'users'>, 'id' | 'full_name'>
type EditableField = 'role' | 'assigned_course_id' | 'assigned_tutor_id'

interface UserManagementProps {
  viewerRole?: string
  showAdmins?: boolean
}

export default function UserManagement({
  viewerRole,
  showAdmins = false,
}: UserManagementProps) {
  const [activeTab, setActiveTab] = useState('assignments') // 'assignments' or 'students'
  const [users, setUsers] = useState<UserRow[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [tutors, setTutors] = useState<TutorOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLowBalance, setFilterLowBalance] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const navigate = useNavigate()

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: cData } = await supabase.from('courses').select('id, title')
      setCourses(cData || [])

      const { data: tData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'tutor')
      setTutors(tData || [])

      let query = supabase.from('users').select(`
        id, email, full_name, role, assigned_course_id, assigned_tutor_id, 
        subscription_tier, total_classes, classes_remaining, personal_meet_link
      `)

      if (!showAdmins)
        query = query.not(
          'role',
          'in',
          '("owner","tech_admin","operations_admin")',
        )
      if (searchTerm) query = query.ilike('full_name', `%${searchTerm}%`)

      const { data, error } = await query.order('full_name', {
        ascending: true,
      })
      if (error) throw error

      let filteredData = data || []
      if (filterLowBalance) {
        filteredData = filteredData.filter(
          (u) => u.role === 'student' && (u.classes_remaining || 0) <= 1,
        )
      }

      setUsers(filteredData)
    } catch (err) {
      toast.error('Fetch Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm, filterLowBalance])

  const handleUpdate = async (
    userId: string,
    value: string,
    field: EditableField,
  ) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ [field]: value || null })
        .eq('id', userId)
      if (error) throw error
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u)),
      )
      toast.success('Updated')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6 p-10">
      {/* Tab Switcher & Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <button
          onClick={() => navigate(`/:role`)}
          className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-300"
        >
          ← Back
        </button>
        <div>
          {/* <h2 className="text-2xl font-black text-slate-900 tracking-tight">Team & Students</h2> */}
          <div className="mt-3 flex w-fit rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'assignments' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={14} /> Assignments
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={14} /> Student Directory
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterLowBalance(!filterLowBalance)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${filterLowBalance ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
          >
            <AlertTriangle size={16} /> Low Balance
          </button>
          <button
            onClick={() => {
              setSelectedUser(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg"
          >
            <UserCheck size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 pl-12 pr-4 font-medium outline-hidden focus:ring-2 focus:ring-blue-500/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* View Logic */}
      {activeTab === 'assignments' ? (
        <div className="space-y-3">
          {users.map((u) => {
            const isLow =
              u.role === 'student' && (u.classes_remaining || 0) <= 1
            return (
              <div
                key={u.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs ${isLow ? 'border-red-200 bg-red-50/20' : ''}`}
              >
                <div className="flex min-w-[200px] items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black">
                    {u.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold leading-tight text-slate-900">
                      {u.full_name}
                    </h4>
                    <span className="text-[10px] font-black uppercase text-blue-500">
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  {/* Restored Dropdowns from Previous Fix */}
                  <div className="flex w-28 flex-col gap-1">
                    <label className="ml-1 text-[9px] font-black uppercase text-slate-400">
                      Role
                    </label>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleUpdate(u.id, e.target.value, 'role')
                      }
                      className="rounded-lg border-none bg-slate-50 p-2 text-xs font-bold"
                    >
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                    </select>
                  </div>
                  {u.role === 'student' && (
                    <>
                      <div className="flex w-40 flex-col gap-1">
                        <label className="ml-1 text-[9px] font-black uppercase text-slate-400">
                          Course
                        </label>
                        <select
                          value={u.assigned_course_id || ''}
                          onChange={(e) =>
                            handleUpdate(
                              u.id,
                              e.target.value,
                              'assigned_course_id',
                            )
                          }
                          className="rounded-lg border-none bg-indigo-50 p-2 text-xs font-bold text-indigo-700"
                        >
                          <option value="">No Course</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex w-40 flex-col gap-1">
                        <label className="ml-1 text-[9px] font-black uppercase text-slate-400">
                          Tutor
                        </label>
                        <select
                          value={u.assigned_tutor_id || ''}
                          onChange={(e) =>
                            handleUpdate(
                              u.id,
                              e.target.value,
                              'assigned_tutor_id',
                            )
                          }
                          className="rounded-lg border-none bg-emerald-50 p-2 text-xs font-bold text-emerald-700"
                        >
                          <option value="">No Tutor</option>
                          {tutors.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedUser(u)
                    setIsModalOpen(true)
                  }}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-600"
                >
                  Edit Package
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        /* STUDENT DIRECTORY VIEW */
        <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xs">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Student Name
                </th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Contact Info
                </th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Plan
                </th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Balance
                </th>
                <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users
                .filter((u) => u.role === 'student')
                .map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="p-5">
                      <div className="font-bold text-slate-900">
                        {s.full_name}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        ID: {s.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`mailto:${s.email}`}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                        >
                          <Mail size={12} /> {s.email}
                        </a>
                        {s.personal_meet_link && (
                          <a
                            href={s.personal_meet_link}
                            target="_blank"
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500"
                          >
                            <Globe size={10} /> Meet Link
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-purple-700">
                        {s.subscription_tier || 'Starter'}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${s.classes_remaining / (s.total_classes || 1) < 0.3 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{
                              width: `${(s.classes_remaining / (s.total_classes || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {s.classes_remaining}/{s.total_classes}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(s)
                          setIsModalOpen(true)
                        }}
                        className="rounded-lg border border-transparent p-2 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-blue-600"
                      >
                        <LayoutGrid size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <UserManagementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchData}
        editingUser={selectedUser}
      />
    </div>
  )
}
