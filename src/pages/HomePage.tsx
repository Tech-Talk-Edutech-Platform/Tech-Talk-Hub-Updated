import { AboutHighlight } from '../components/home/AboutHighlight'
import { ContactSection } from '../components/home/ContactSection'
import { HeroSection } from '../components/home/HeroSection'
import { PricingSection } from '../components/home/PricingSection'
import { ProgramsSection } from '../components/home/ProgramsSection'
import { StudentProjects } from '../components/home/StudentProjects'
import { TechSlider } from '../components/home/TechSlider'
import { Testimonials } from '../components/home/Testimonials'
import { Footer } from '../components/layout/Footer'
import { NavBar } from '../components/layout/NavBar'
import { PageSection } from '../components/ui/PageSection'

/** The landing page. Section ids are the targets of `/#…` links across the site. */
export function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <NavBar />

      <HeroSection />

      <PageSection className="relative z-20 border-b border-slate-100 bg-white py-2 sm:py-3">
        <TechSlider />
      </PageSection>

      <section id="programs" className="bg-slate-50">
        <ProgramsSection />
      </section>

      <PageSection id="pricing" className="bg-background py-10">
        <PricingSection />
      </PageSection>

      <PageSection id="about" className="bg-white py-10">
        <AboutHighlight />
      </PageSection>

      <PageSection id="projects" className="bg-white py-10">
        <StudentProjects />
      </PageSection>

      <PageSection id="testimonials" className="bg-slate-50 py-10">
        <Testimonials />
      </PageSection>

      <PageSection id="contact" className="bg-background py-10">
        <ContactSection />
      </PageSection>

      <Footer />
    </main>
  )
}
