import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardLayout from './DashboardLayout'
import type { DashboardIdentity } from '../types/dashboardIdentity'
import { isAppRole, type AppRole } from '../types/roles'

export default function UnifiedDashboard() {
  const { role: urlRole } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<DashboardIdentity | null>(null)
  const [role, setRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserAndRole = async () => {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          void navigate('/login', { replace: true })
          return
        }

        const { data: dbData } = await supabase
          .from('users')
          .select(
            'role, assigned_course_id, assigned_tutor_id, full_name, email',
          )
          .eq('id', authUser.id)
          .single()

        const dbRole: AppRole = isAppRole(dbData?.role)
          ? dbData.role
          : 'student'
        setRole(dbRole)
        const dashboardIdentity: DashboardIdentity = {
          ...authUser,
          ...dbData,
          role: dbRole,
        }
        setUser(dashboardIdentity)

        // Enforce correct URL matching actual DB role
        if (urlRole && urlRole !== dbRole) {
          void navigate(`/${dbRole}`, { replace: true })
        }
      } catch (err) {
        console.error('Unexpected error in fetchUserAndRole:', err)
        void navigate('/', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    void fetchUserAndRole()
  }, [urlRole, navigate])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dashboard-canvas text-xl font-black text-gray-900 dark:bg-dashboard-night dark:text-white">
        LOADING... 🚀
      </div>
    )
  }

  if (!user || !role) return null

  return <DashboardLayout role={role} user={user} />
}
