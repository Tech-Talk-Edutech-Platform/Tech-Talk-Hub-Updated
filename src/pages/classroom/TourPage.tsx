import { ReadLayout } from '../../components/classroom/layout/ReadLayout'
import { TOUR_SECTIONS } from '../../data/classroom'

/** "Classroom tour", linked from the Class details footer. */
export function TourPage() {
  return (
    <ReadLayout
      title="Classroom tour"
      subtitle="What every control in the classroom does."
    >
      {TOUR_SECTIONS.map((section) => (
        <section key={section.title} className="mt-10 first:mt-0">
          <h2 className="text-[20px] font-semibold text-ink">
            {section.title}
          </h2>
          <dl className="mt-3 divide-y divide-line">
            {section.items.map((item) => (
              <div
                key={item.term}
                className="grid gap-1 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-6"
              >
                <dt className="text-[16px] font-semibold text-ink">
                  {item.term}
                </dt>
                <dd className="text-[16px] leading-[26px] text-ink-soft">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </ReadLayout>
  )
}
