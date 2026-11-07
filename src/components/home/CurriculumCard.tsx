import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getLevelHref } from '../../lib/curriculum'
import { urlFor } from '../../lib/sanity'
import type { CurriculumLevel } from '../../types/curriculum'

type CurriculumCardProps = {
  level: CurriculumLevel
}

export function CurriculumCard({ level }: CurriculumCardProps) {
  return (
    <Link
      to={getLevelHref(level.title)}
      className="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-200 hover:shadow-xl"
    >
      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 transition group-hover:bg-purple-50">
        {level.levelImage && (
          <img
            src={urlFor(level.levelImage)
              .width(128)
              .height(128)
              .fit('crop')
              .url()}
            alt={level.title || 'Coding program'}
            className="h-9 w-9 object-contain"
          />
        )}
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold tracking-wider text-blue-600 uppercase">
          {level.difficultyLevel || 'Beginner'}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
          {level.duration || 'Flexible'}
        </span>
      </div>

      <h3 className="mb-3 text-2xl font-extrabold text-slate-900 transition group-hover:text-primary">
        {level.title || 'Learning Path'}
      </h3>

      <p className="mb-6 flex-grow text-sm leading-relaxed text-slate-500">
        {level.description || 'No description provided.'}
      </p>

      {/* Skills */}
      <div className="mb-6">
        <p className="mb-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Key Skills
        </p>

        <div className="flex flex-wrap gap-2">
          {(level.skills || []).slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
        <p className="text-[11px] font-bold tracking-wider text-secondary uppercase">
          Explore Program
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-primary transition group-hover:bg-primary group-hover:text-white">
          <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  )
}
