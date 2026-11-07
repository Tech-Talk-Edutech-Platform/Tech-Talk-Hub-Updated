import { List } from 'lucide-react'

import type { ArticleHeading } from '../../../types/blog'

type MobileTableOfContentsProps = {
  headings: ArticleHeading[]
}

export function MobileTableOfContents({
  headings,
}: MobileTableOfContentsProps) {
  if (headings.length === 0) {
    return null
  }

  return (
    <details className="mb-9 rounded-2xl border border-purple-100 bg-[#FCFAFF] p-5 lg:hidden">
      <summary className="cursor-pointer list-none text-sm font-black text-[#2947C7]">
        <span className="inline-flex items-center gap-2">
          <List size={17} />
          In this article
        </span>
      </summary>
      <nav className="mt-4 space-y-3 border-l border-purple-100 pl-4">
        {headings.map((heading) => (
          <a
            key={heading.key}
            href={`#${heading.id}`}
            className="block text-sm leading-6 text-slate-600 transition hover:text-[#FF3F7F]"
          >
            {heading.title}
          </a>
        ))}
      </nav>
    </details>
  )
}
