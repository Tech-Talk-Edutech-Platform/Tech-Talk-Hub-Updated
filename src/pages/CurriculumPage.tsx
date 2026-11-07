import { ProgramsSection } from '../components/home/ProgramsSection'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

/** `/curriculum` — the learning pathways section on its own page, as on the old site. */
export function CurriculumPage() {
  usePageMeta(staticPageMeta('/curriculum'))

  return <ProgramsSection />
}
