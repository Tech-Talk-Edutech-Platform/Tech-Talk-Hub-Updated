import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_PROGRAM_LINKS,
  FOOTER_RESOURCE_LINKS,
} from '../../data/navigation'
import { FooterBrand } from './FooterBrand'
import { FooterContact } from './FooterContact'
import { FooterCta } from './FooterCta'
import { FooterLinkColumn } from './FooterLinkColumn'

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#172554] text-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute top-0 -left-32 h-80 w-80 rounded-full bg-[#2947C7]/30 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-24 h-72 w-72 rounded-full bg-[#9B6CFF]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#FF3F7F]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-7 lg:px-8 lg:pt-16">
        <FooterCta />

        <div className="grid gap-10 border-b border-white/10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1fr_1fr_1.1fr]">
          <FooterBrand />
          <FooterLinkColumn title="Company" links={FOOTER_COMPANY_LINKS} />
          <FooterLinkColumn
            title="Learning Paths"
            links={FOOTER_PROGRAM_LINKS}
          />
          <FooterLinkColumn title="Resources" links={FOOTER_RESOURCE_LINKS} />
          <FooterContact />
        </div>

        {/* Copyright and legal links */}
        <div className="flex flex-col items-center justify-between gap-5 pt-6 text-center md:flex-row md:text-left">
          <p className="text-xs text-blue-100/60">
            © {CURRENT_YEAR} Tech Talk Hub. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs text-blue-100/60 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="inline-flex items-center gap-1.5 text-xs text-blue-100/60">
            Made with{' '}
            <Heart className="h-3.5 w-3.5 fill-[#FF3F7F] text-[#FF3F7F]" /> for
            young creators
          </p>
        </div>
      </div>
    </footer>
  )
}
