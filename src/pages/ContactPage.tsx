import { ContactSection } from '../components/home/ContactSection'
import { Footer } from '../components/layout/Footer'
import { NavBar } from '../components/layout/NavBar'
import { PageSection } from '../components/ui/PageSection'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

/**
 * `/contact` — the home page's contact section on its own URL, so search
 * engines can list it (they ignore `/#contact`).
 */
export function ContactPage() {
  usePageMeta(staticPageMeta('/contact'))

  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <NavBar />

      <PageSection className="bg-background pt-28 pb-16">
        <ContactSection headingLevel="h1" />
      </PageSection>

      <Footer />
    </main>
  )
}
