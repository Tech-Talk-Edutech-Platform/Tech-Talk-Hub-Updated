import { useState } from 'react'
import type { FormEvent } from 'react'
import { UserPlus } from 'lucide-react'

import { COUNTRIES, DEFAULT_COUNTRY_CODE, fullPhoneNumber } from './phone'
import { useSalesData } from './salesDataContext'
import {
  countryCodeClass,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
} from './styles'
import type { BookingSource, Lead } from './types'
import { BOOKING_SOURCES, isBookingSource, SOURCE_LABEL } from './types'
import { Field } from './ui'

/**
 * A new parent to reach out to: only their contact details. The child's
 * details come later, from the conversation.
 */
export function AddParentForm({
  salesRepId,
  submitLabel,
  onSaved,
  onCancel,
}: {
  salesRepId: string | null
  submitLabel: string
  onSaved: (lead: Lead) => void
  onCancel: () => void
}) {
  const data = useSalesData()
  const [parentName, setParentName] = useState('')
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState<BookingSource>('privyr')
  const [notes, setNotes] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = parentName.trim()
    const number = fullPhoneNumber(countryCode, phone)
    if (!name) {
      setProblem('Add the parent’s name.')
      return
    }
    if (!number) {
      setProblem('Add the parent’s phone number.')
      return
    }
    const duplicate = data.leads.find((lead) => lead.phone === number)
    if (duplicate) {
      setProblem(
        `${duplicate.parentName} already has this number. Find them in the parents list instead.`,
      )
      return
    }
    const lead = data.addLead({
      parentName: name,
      phone: number,
      email: email.trim(),
      source,
      salesRepId,
      notes: notes.trim(),
    })
    onSaved(lead)
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Parent’s name">
        <input
          value={parentName}
          onChange={(event) => setParentName(event.target.value)}
          className={inputClass}
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Phone (WhatsApp)">
        <div className="flex gap-2">
          <select
            aria-label="Country code"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className={countryCodeClass}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.code} {country.name}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="712 345 678"
            className={inputClass}
            autoComplete="off"
            required
          />
        </div>
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      <Field label="Came from">
        <select
          value={source}
          onChange={(event) => {
            const { value } = event.target
            if (isBookingSource(value)) setSource(value)
          }}
          className={selectClass}
        >
          {BOOKING_SOURCES.map((option) => (
            <option key={option} value={option}>
              {SOURCE_LABEL[option]}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes (optional)">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Best time to call, how they heard about us…"
            className={inputClass}
          />
        </Field>
      </div>
      {problem && (
        <p
          role="alert"
          className="text-sm font-semibold text-red-600 sm:col-span-2"
        >
          {problem}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" className={primaryButton}>
          <UserPlus size={16} aria-hidden /> {submitLabel}
        </button>
      </div>
    </form>
  )
}
