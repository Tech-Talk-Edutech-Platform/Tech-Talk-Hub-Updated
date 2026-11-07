import { Fragment } from 'react'

import type { NavLinkItem } from '../../types/navigation'

const LINK_CLASS = 'font-bold text-[#2947C7] transition hover:text-[#FF3F7F]'

type PolicyContactsProps = {
  contacts: NavLinkItem[]
}

export function PolicyContacts({ contacts }: PolicyContactsProps) {
  if (contacts.length === 1) {
    const [contact] = contacts

    return (
      <a href={contact.href} className={`inline-flex ${LINK_CLASS}`}>
        {contact.label}
      </a>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {contacts.map((contact, index) => (
        <Fragment key={contact.href}>
          {index > 0 && (
            <span className="hidden text-slate-300 sm:inline">•</span>
          )}
          <a href={contact.href} className={LINK_CLASS}>
            {contact.label}
          </a>
        </Fragment>
      ))}
    </div>
  )
}
