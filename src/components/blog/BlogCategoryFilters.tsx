import { Link } from 'react-router-dom'

import { BLOG_CATEGORIES } from '../../data/blog'
import { ALL_STORIES } from '../../lib/blog'

type BlogCategoryFiltersProps = {
  selectedCategory: string
}

function categoryHref(value: string): string {
  return value === ALL_STORIES
    ? '/blog#latest-stories'
    : `/blog?category=${encodeURIComponent(value)}#latest-stories`
}

/** Sticky row of category links; the selected category lives in `?category=`. */
export function BlogCategoryFilters({
  selectedCategory,
}: BlogCategoryFiltersProps) {
  return (
    <section className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-x-auto py-4">
          <div className="flex min-w-max items-center gap-2.5 lg:justify-center">
            {BLOG_CATEGORIES.map(({ icon: Icon, label, value }) => {
              const active = selectedCategory === value

              return (
                <Link
                  key={value}
                  to={categoryHref(value)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                    active
                      ? 'border-[#7651EF] bg-[#7651EF] text-white shadow-md shadow-purple-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50 hover:text-[#7651EF]'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
