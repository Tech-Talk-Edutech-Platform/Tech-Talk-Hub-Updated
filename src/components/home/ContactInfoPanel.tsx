import { FaInstagram } from 'react-icons/fa'

import { CONTACT_METHODS } from '../../data/home'
import { INSTAGRAM } from '../../data/site'
import { ContactMethodCard } from './ContactMethodCard'

/** Blue panel with phone, email, WhatsApp and Instagram. */
export function ContactInfoPanel() {
  return (
    <div className="relative overflow-hidden bg-[#2947C7] p-7 text-white sm:p-9 lg:p-10">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#9B6CFF]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#FF3F7F]/25 blur-3xl" />

      <div className="relative">
        <h3 className="text-2xl font-black">We’re here to help.</h3>

        <p className="mt-3 max-w-sm text-sm leading-7 text-blue-100">
          Speak with our team about finding the right coding program for your
          child.
        </p>

        <div className="mt-8 space-y-4">
          {CONTACT_METHODS.map((method) => (
            <ContactMethodCard key={method.label} {...method} />
          ))}
        </div>

        <div className="mt-8 border-t border-white/15 pt-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-blue-200 uppercase">
            Follow Our Journey
          </p>

          <a
            href={INSTAGRAM.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            <FaInstagram className="h-4 w-4" />
            {INSTAGRAM.handle}
          </a>
        </div>
      </div>
    </div>
  )
}
