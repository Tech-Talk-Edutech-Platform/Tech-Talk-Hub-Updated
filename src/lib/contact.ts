import { WHATSAPP_URL } from '../data/site'

export type ContactFormValues = {
  parentName: string
  childAge: string
  phone: string
  email: string
  interest: string
  message: string
}

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  parentName: '',
  childAge: '',
  phone: '',
  email: '',
  interest: '',
  message: '',
}

/** Builds a WhatsApp link pre-filled with the contact form's details. */
export function buildContactWhatsAppUrl(values: ContactFormValues): string {
  const message = [
    'Hello Tech Talk Hub! 👋',
    '',
    `Parent name: ${values.parentName}`,
    `Child's age: ${values.childAge}`,
    `Phone: ${values.phone}`,
    `Email: ${values.email || 'Not provided'}`,
    `Interested in: ${values.interest || 'Not specified'}`,
    '',
    `Message: ${values.message}`,
  ].join('\n')

  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}
