import { Sparkles } from 'lucide-react'

import { STUDENT_PROJECTS } from '../../data/home'
import { ProjectCard } from './ProjectCard'

/** Showcase of projects built by Tech Talk Hub students. */
export function StudentProjects() {
  return (
    <section className="relative overflow-hidden border-t border-gray-100 bg-background py-24 dark:border-gray-800/60">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/5 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-secondary uppercase shadow-sm">
            <Sparkles size={14} /> Student Showcase
          </div>

          <h2 className="text-text text-3xl font-black tracking-tight sm:text-5xl">
            See Amazing Projects{' '}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-secondary text-transparent">
              Created By Our Students
            </span>
          </h2>

          <p className="text-text/70 mt-4 text-base sm:text-lg">
            From interactive games to full web applications, see what young
            minds build after joining our hands-on coding classes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {STUDENT_PROJECTS.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  )
}
