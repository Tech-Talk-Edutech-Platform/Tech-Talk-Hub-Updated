import { useState } from 'react'
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa'

import { urlFor } from '../../lib/sanity'
import type { TeamMember } from '../../types/about'
import { FillImage } from '../ui/FillImage'

type FacultyCardProps = {
  member: TeamMember
}

export function FacultyCard({ member }: FacultyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const name = member.name ?? ''

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex grow flex-col items-center">
        <div className="relative mb-6 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-slate-50">
          {member.image && (
            <FillImage
              src={urlFor(member.image).width(200).height(200).url()}
              alt={name}
              className="object-cover"
            />
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
        <p className="mb-3 font-semibold text-pink-600">{member.title}</p>

        <div className="text-center">
          <p
            className={`text-sm leading-relaxed text-slate-500 ${isExpanded ? '' : 'line-clamp-3'}`}
          >
            {member.bio}
          </p>
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="mt-2 text-xs font-bold text-pink-600 hover:underline"
          >
            {isExpanded ? 'Show less' : '...more'}
          </button>
        </div>
      </div>

      <div className="mt-auto flex justify-center space-x-6 border-t border-slate-50 pt-4 text-slate-400">
        {member.linkedin && (
          <a
            href={member.linkedin}
            aria-label={`${name} on LinkedIn`}
            className="hover:text-pink-600"
          >
            <FaLinkedin size={20} />
          </a>
        )}
        {member.twitter && (
          <a
            href={member.twitter}
            aria-label={`${name} on Twitter`}
            className="hover:text-pink-600"
          >
            <FaTwitter size={20} />
          </a>
        )}
        {member.github && (
          <a
            href={member.github}
            aria-label={`${name} on GitHub`}
            className="hover:text-pink-600"
          >
            <FaGithub size={20} />
          </a>
        )}
      </div>
    </article>
  )
}
