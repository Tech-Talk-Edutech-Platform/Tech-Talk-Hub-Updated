import { PolicyPage } from '../components/info/PolicyPage'
import { CHILD_SAFETY_POLICY } from '../data/policies'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

export function ChildSafetyPage() {
  usePageMeta(staticPageMeta('/child-safety'))

  return <PolicyPage content={CHILD_SAFETY_POLICY} />
}
