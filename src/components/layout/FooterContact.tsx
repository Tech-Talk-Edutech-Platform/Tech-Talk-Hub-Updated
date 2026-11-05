import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react'

import { EMAIL, PHONE, WHATSAPP_URL } from '../../data/site'

const CONTACT_LINK_CLASS =
  'flex items-start gap-3 text-sm text-blue-100/80 transition hover:text-white'

const CONTACT_ICON_CLASS = 'h-4 w-4 shrink-0 text-[#FF8BB2]'

/** Footer "Contact Us" column. */
export function FooterContact() {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white">
        Contact Us
      </h3>

      <div className="mt-5 space-y-4">
        <a href={PHONE.href} className={CONTACT_LINK_CLASS}>
          <Phone className={`mt-0.5 ${CONTACT_ICON_CLASS}`} />
          <span>{PHONE.display}</span>
        </a>

        <a href={`mailto:${EMAIL}`} className={CONTACT_LINK_CLASS}>
          <Mail className={`mt-0.5 ${CONTACT_ICON_CLASS}`} />
          <span className="break-all">{EMAIL}</span>
        </a>

        <div className="flex items-start gap-3 text-sm leading-6 text-blue-100/80">
          <MapPin className={`mt-1 ${CONTACT_ICON_CLASS}`} />

          <span>
            Nairobi, Kenya
            <br />
            Online across Africa
          </span>
        </div>
      </div>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#FF8BB2] transition hover:text-white"
      >
        Chat on WhatsApp
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  )
}
