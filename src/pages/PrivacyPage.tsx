import { PolicyPage } from '../components/info/PolicyPage'
import { PRIVACY_POLICY } from '../data/policies'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

export function PrivacyPage() {
  usePageMeta(staticPageMeta('/privacy'))

  return <PolicyPage content={PRIVACY_POLICY} />
}
