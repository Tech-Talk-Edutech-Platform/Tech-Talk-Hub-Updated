import type { LucideIcon } from 'lucide-react'

type ContactMethodCardProps = {
  href: string
  icon: LucideIcon
  label: string
  value: string
  /** Open in a new tab (for off-site links like WhatsApp). */
  external?: boolean
  /** Let long values such as email addresses wrap anywhere. */
  breakValue?: boolean
}

/** A tappable contact option (phone, email, WhatsApp) on the blue info panel. */
export function ContactMethodCard({
  href,
  icon: Icon,
  label,
  value,
  external = false,
  breakValue = false,
}: ContactMethodCardProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:bg-white/15"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-5 w-5" />
      </span>

      <span className={breakValue ? 'min-w-0' : undefined}>
        <span className="block text-xs font-semibold tracking-wide text-blue-200 uppercase">
          {label}
        </span>

        <span
          className={`mt-1 block font-bold ${breakValue ? 'break-all' : ''}`}
        >
          {value}
        </span>
      </span>
    </a>
  )
}
