import { PublicProgramPage } from '../components/courses/PublicProgramPage'
import { Footer } from '../components/layout/Footer'
import { NavBar } from '../components/layout/NavBar'
import type { ProgramSlug } from '../data/programs'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

type CoursePageProps = {
  slug: ProgramSlug
}

/** `/courses/:slug` — a program's courses and phases. */
export function CoursePage({ slug }: CoursePageProps) {
  usePageMeta(staticPageMeta(`/courses/${slug}`))

  return (
    <>
      <NavBar />
      <PublicProgramPage slug={slug} />
      <Footer />
    </>
  )
}
