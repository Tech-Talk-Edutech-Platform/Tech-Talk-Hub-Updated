import { CheckCircle2, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'

import { PROGRAM_INTEREST_OPTIONS } from '../../data/home'
import {
  buildContactWhatsAppUrl,
  type ContactFormValues,
} from '../../lib/contact'
import { FORM_CONTROL_CLASS } from '../ui/formControlClass'
import { FormField } from '../ui/FormField'
import { HoverArrow } from '../ui/HoverArrow'
import { TextField } from '../ui/TextField'

const contactSchema = z.object({
  parentName: z.string().trim().min(1, 'Enter your name.'),
  childAge: z
    .string()
    .min(1, 'Enter your child’s age.')
    .refine((age) => {
      const value = Number(age)
      return Number.isInteger(value) && value >= 4 && value <= 18
    }, 'Age must be between 4 and 18.'),
  phone: z.string().trim().min(1, 'Enter your phone number.'),
  email: z.union([
    z.literal(''),
    z.string().email('Enter a valid email address.'),
  ]),
  interest: z.string(),
  message: z.string().trim().min(1, 'Enter a message.'),
})

function openWhatsApp(values: ContactFormValues) {
  window.open(buildContactWhatsAppUrl(values), '_blank', 'noopener,noreferrer')
}

/** Contact form that hands the parent's message off to WhatsApp. */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      parentName: '',
      childAge: '',
      phone: '',
      email: '',
      interest: '',
      message: '',
    },
  })

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

      <form
        onSubmit={(event) => void handleSubmit(openWhatsApp)(event)}
        noValidate
        className="grid gap-5 sm:grid-cols-2"
      >
        <TextField
          id="parentName"
          label="Parent’s Name"
          type="text"
          required
          {...register('parentName')}
          aria-invalid={Boolean(errors.parentName)}
          placeholder="Your name"
        />
        {errors.parentName && (
          <p role="alert" className="text-sm text-red-600">
            {errors.parentName.message}
          </p>
        )}

        <TextField
          id="childAge"
          label="Child’s Age"
          type="number"
          min="4"
          max="18"
          required
          {...register('childAge')}
          aria-invalid={Boolean(errors.childAge)}
          placeholder="e.g. 8"
        />
        {errors.childAge && (
          <p role="alert" className="text-sm text-red-600">
            {errors.childAge.message}
          </p>
        )}

        <TextField
          id="phone"
          label="Phone Number"
          type="tel"
          required
          {...register('phone')}
          aria-invalid={Boolean(errors.phone)}
          placeholder="07XX XXX XXX"
        />
        {errors.phone && (
          <p role="alert" className="text-sm text-red-600">
            {errors.phone.message}
          </p>
        )}

        <TextField
          id="email"
          label="Email Address"
          type="email"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          placeholder="you@example.com"
        />

        <FormField
          id="interest"
          label="Interested In"
          className="sm:col-span-2"
        >
          <select
            id="interest"
            {...register('interest')}
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
            rows={4}
            required
            {...register('message')}
            aria-invalid={Boolean(errors.message)}
            placeholder="How can we help you?"
            className={`resize-none py-3 text-slate-800 placeholder:text-slate-400 ${FORM_CONTROL_CLASS}`}
          />
        </FormField>
        {errors.message && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {errors.message.message}
          </p>
        )}

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
