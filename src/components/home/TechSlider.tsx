import { Carousel } from 'react-responsive-carousel'
import 'react-responsive-carousel/lib/styles/carousel.min.css'

import { TECH_ICONS } from '../../data/home'

/** Auto-scrolling strip of technology icons under the hero. */
export function TechSlider() {
  return (
    <div className="h-14">
      <Carousel
        autoPlay
        interval={2000}
        infiniteLoop
        showThumbs={false}
        showStatus={false}
        showIndicators={false}
        centerMode
        centerSlidePercentage={20}
        showArrows={false}
      >
        {TECH_ICONS.map(({ name, icon: Icon, color }) => (
          <div key={name} className="flex h-14 items-center justify-center">
            <Icon size={35} className={`${color} drop-shadow-md`} />
          </div>
        ))}
      </Carousel>
    </div>
  )
}
