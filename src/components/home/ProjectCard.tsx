import { Code2, ExternalLink, User } from 'lucide-react'

import type { StudentProject } from '../../types/content'

type ProjectCardProps = {
  project: StudentProject
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-100 bg-background shadow-sm transition-all duration-300 hover:border-secondary/30 hover:shadow-xl dark:border-gray-800">
      {/* Thumbnail */}
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary/10 via-primary/5 to-secondary/20 p-6">
        <div className="absolute inset-0 flex items-center justify-center bg-text/5 transition-transform duration-500 group-hover:scale-105">
          <Code2 size={48} className="text-secondary/40" />
        </div>

        <span className="absolute left-4 top-4 rounded-full border border-gray-100 bg-background/90 px-3 py-1.5 text-xs font-bold text-secondary shadow-sm backdrop-blur-md dark:border-gray-800">
          {project.category}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-grow flex-col justify-between space-y-6 p-6 md:p-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-text/60">
            <span className="flex items-center gap-1.5 text-secondary">
              <User size={14} /> {project.student}
            </span>

            <span className="rounded-md bg-text/5 px-2.5 py-1">
              {project.grade}
            </span>
          </div>

          <h3 className="text-xl font-bold text-text transition-colors group-hover:text-secondary">
            {project.title}
          </h3>

          <p className="text-sm leading-relaxed text-text/70">
            {project.description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert(`Viewing live demo for ${project.title}`)}
          className="group/btn mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-text/5 px-4 py-3 text-sm font-bold text-text transition-all duration-300 hover:bg-secondary hover:text-background"
        >
          View Project{' '}
          <ExternalLink
            size={16}
            className="transition-transform group-hover/btn:translate-x-0.5"
          />
        </button>
      </div>
    </div>
  )
}
