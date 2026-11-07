import heroImage from '../../assets/images/home-hero.png'
import { FillImage } from '../ui/FillImage'
import { HeroBackground } from './HeroBackground'
import { HeroContent } from './HeroContent'

const HERO_IMAGE_ALT = 'Young African learner coding with Tech Talk Hub'

export function HeroSection() {
  return (
    <section id="hero" className="relative pt-20">
      <HeroBackground>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="relative grid lg:min-h-[510px] lg:grid-cols-[1.08fr_0.92fr] lg:items-center xl:min-h-[530px]">
            <div className="relative z-20 py-10 sm:py-12 lg:py-8">
              <HeroContent />
            </div>

            {/* Desktop image */}
            <div className="relative hidden h-full min-h-[510px] lg:block xl:min-h-[530px]">
              <div className="pointer-events-none absolute inset-y-0 -right-12 -left-8 hero-image-fade xl:-right-20">
                <FillImage
                  src={heroImage}
                  alt={HERO_IMAGE_ALT}
                  priority
                  className="object-contain object-right-bottom"
                />

                {/* Subtle image blending */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#F8F5FF]/35" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#F1E8FF]/20 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Mobile image */}
          <div className="relative mx-auto -mt-6 h-[255px] w-full max-w-lg overflow-hidden sm:h-[340px] lg:hidden">
            <FillImage
              src={heroImage}
              alt={HERO_IMAGE_ALT}
              priority
              className="object-contain object-center"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#F1E8FF]/30 via-transparent to-transparent" />
          </div>
        </div>
      </HeroBackground>
    </section>
  )
}
