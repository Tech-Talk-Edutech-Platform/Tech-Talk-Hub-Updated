import { PolicyPage } from '../components/info/PolicyPage'
import { TERMS_AND_CONDITIONS } from '../data/policies'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

export function TermsPage() {
  usePageMeta(staticPageMeta('/terms'))

  return <PolicyPage content={TERMS_AND_CONDITIONS} />
}
