import { Link } from 'react-router-dom'

import type { LearningPathLink, NavLinkItem } from '../../types/navigation'

type FooterLinkColumnProps = {
  title: string
  links: NavLinkItem[] | LearningPathLink[]
}

/** A titled list of footer links. Links with a `description` get a second line. */
export function FooterLinkColumn({ title, links }: FooterLinkColumnProps) {
  const hasDescriptions = links.some((link) => 'description' in link)

  return (
    <div>
      <h3 className="text-sm font-bold tracking-[0.12em] text-white uppercase">
        {title}
      </h3>

      <ul className={`mt-5 ${hasDescriptions ? 'space-y-4' : 'space-y-3'}`}>
        {links.map((link) => (
          <li key={link.label}>
            {'description' in link ? (
              <Link to={link.href} className="group inline-block">
                <span className="block text-sm text-blue-100/80 transition group-hover:text-[#FF8BB2]">
                  {link.label}
                </span>

                <span className="mt-1 block text-xs text-blue-200/55">
                  {link.description}
                </span>
              </Link>
            ) : (
              <Link
                to={link.href}
                className="text-sm text-blue-100/80 transition hover:text-[#FF8BB2]"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
