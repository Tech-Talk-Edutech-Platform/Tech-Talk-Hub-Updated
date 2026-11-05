import { CheckCircle2, Send } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'

import { PROGRAM_INTEREST_OPTIONS } from '../../data/home'
import {
  buildContactWhatsAppUrl,
  EMPTY_CONTACT_FORM,
  type ContactFormValues,
} from '../../lib/contact'
import { FORM_CONTROL_CLASS } from '../ui/formControlClass'
import { FormField } from '../ui/FormField'
import { HoverArrow } from '../ui/HoverArrow'
import { TextField } from '../ui/TextField'

/** Contact form that hands the parent's message off to WhatsApp. */
export function ContactForm() {
  const [form, setForm] = useState<ContactFormValues>(EMPTY_CONTACT_FORM)

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.open(buildContactWhatsAppUrl(form), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-7 sm:p-9 lg:p-10">
      <div className="mb-7">
        <h3 className="text-2xl font-black text-[#172554]">
          Send us a message
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Tell us a little about your child and we will help you get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="parentName"
          name="parentName"
          label="Parent’s Name"
          type="text"
          required
          value={form.parentName}
          onChange={handleChange}
          placeholder="Your name"
        />

        <TextField
          id="childAge"
          name="childAge"
          label="Child’s Age"
          type="number"
          min="4"
          max="18"
          required
          value={form.childAge}
          onChange={handleChange}
          placeholder="e.g. 8"
        />

        <TextField
          id="phone"
          name="phone"
          label="Phone Number"
          type="tel"
          required
          value={form.phone}
          onChange={handleChange}
          placeholder="07XX XXX XXX"
        />

        <TextField
          id="email"
          name="email"
          label="Email Address"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
        />

        <FormField
          id="interest"
          label="Interested In"
          className="sm:col-span-2"
        >
          <select
            id="interest"
            name="interest"
            value={form.interest}
            onChange={handleChange}
            className={`h-12 text-slate-700 ${FORM_CONTROL_CLASS}`}
          >
            <option value="">Select a program</option>

            {PROGRAM_INTEREST_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="message" label="Your Message" className="sm:col-span-2">
          <textarea
            id="message"
            name="message"
            rows={4}
            required
            value={form.message}
            onChange={handleChange}
            placeholder="How can we help you?"
            className={`resize-none py-3 text-slate-800 placeholder:text-slate-400 ${FORM_CONTROL_CLASS}`}
          />
        </FormField>

        <button
          type="submit"
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF3F7F] px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#E93470] sm:col-span-2"
        >
          <Send className="h-4 w-4" />
          Send via WhatsApp
          <HoverArrow />
        </button>

        <p className="flex items-center justify-center gap-2 text-xs text-slate-500 sm:col-span-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Your message opens directly in WhatsApp.
        </p>
      </form>
    </div>
  )
}
