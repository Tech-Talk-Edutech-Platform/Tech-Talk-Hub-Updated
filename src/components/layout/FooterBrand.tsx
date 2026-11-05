import { ShieldCheck } from 'lucide-react'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { Link } from 'react-router-dom'

import { INSTAGRAM, WHATSAPP_URL } from '../../data/site'

const SOCIAL_LINK_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition'

/** Footer column with the wordmark, tagline and social links. */
export function FooterBrand() {
  return (
    <div>
      <Link
        to="/"
        className="inline-block text-xl font-black tracking-tight text-white"
      >
        Tech Talk <span className="text-[#FF8BB2]">Hub</span>
      </Link>

      <p className="mt-4 max-w-xs text-sm leading-7 text-blue-100/75">
        Live, personalized coding classes helping African children build skills,
        confidence and creativity.
      </p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-blue-100">
        <ShieldCheck className="h-4 w-4 text-[#FF8BB2]" />
        Safe, supportive online learning
      </div>

      <div className="mt-6 flex items-center gap-3">
        <a
          href={INSTAGRAM.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow Tech Talk Hub on Instagram"
          className={`${SOCIAL_LINK_CLASS} hover:border-[#FF3F7F]/40 hover:bg-[#FF3F7F]/15 hover:text-[#FF8BB2]`}
        >
          <FaInstagram className="h-4 w-4" />
        </a>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact Tech Talk Hub on WhatsApp"
          className={`${SOCIAL_LINK_CLASS} hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:text-emerald-300`}
        >
          <FaWhatsapp className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
