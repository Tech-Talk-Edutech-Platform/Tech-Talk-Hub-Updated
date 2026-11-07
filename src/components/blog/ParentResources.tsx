import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PARENT_RESOURCES } from '../../data/blog'

export function ParentResources() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-9 max-w-2xl">
          <p className="text-xs font-black tracking-[0.16em] text-[#FF3F7F] uppercase">
            Explore by interest
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#2947C7] sm:text-4xl">
            Find what helps your child grow.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Discover ideas and guidance for every stage of your child’s learning
            journey.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PARENT_RESOURCES.map((resource) => {
            const Icon = resource.icon

            return (
              <Link
                key={resource.title}
                to={resource.href ?? '/blog'}
                className={`group rounded-[1.75rem] border border-white bg-gradient-to-br p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg ${resource.background}`}
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${resource.iconBackground} ${resource.iconColor}`}
                >
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-black text-[#172554]">
                  {resource.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {resource.description}
                </p>
                <span
                  className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${resource.iconColor}`}
                >
                  Explore
                  <ArrowRight
                    size={15}
                    className="transition group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
