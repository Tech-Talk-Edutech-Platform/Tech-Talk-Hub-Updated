import { Link } from 'react-router-dom'

import { FacultyCard } from '../components/about/FacultyCard'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'
import { useTeamMembers } from '../hooks/useTeamMembers'

export function FacultyPage() {
  usePageMeta(staticPageMeta('/faculty'))
  const team = useTeamMembers()

  if (
    team.status !== 'loading' &&
    (team.status === 'error' || team.data.length === 0)
  ) {
    return <div className="py-20 text-center">No team members found.</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-8 sm:px-12 lg:px-24">
      <section className="mx-auto mb-16 max-w-4xl text-center">
        <h1 className="mb-6 text-5xl font-bold text-slate-900">
          Meet Our Team
        </h1>
        <p className="mb-4 text-lg leading-relaxed text-slate-600">
          Industry veterans and expert educators dedicated to your success.
        </p>
      </section>

      <section
        className="mx-auto grid max-w-7xl gap-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        aria-busy={team.status === 'loading'}
      >
        {team.status === 'success' &&
          team.data.map((member) => (
            <FacultyCard key={member.id} member={member} />
          ))}
      </section>

      <section className="text-center">
        <Link
          to="/careers"
          className="rounded-xl bg-secondary px-6 py-3 text-white shadow-btn transition hover:bg-primary"
        >
          View Open Roles
        </Link>
      </section>
    </div>
  )
}
