import { PricingSection } from '../components/home/PricingSection'
import { Footer } from '../components/layout/Footer'
import { NavBar } from '../components/layout/NavBar'
import { PageSection } from '../components/ui/PageSection'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

/**
 * `/pricing` — the home page's pricing section on its own URL, so search
 * engines can list it (they ignore `/#pricing`).
 */
export function PricingPage() {
  usePageMeta(staticPageMeta('/pricing'))

  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <NavBar />

      <PageSection className="bg-background pt-20 pb-10">
        <PricingSection headingLevel="h1" />
      </PageSection>

      <Footer />
    </main>
  )
}
