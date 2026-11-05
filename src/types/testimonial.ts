/** A row from the Supabase `testimonials` table. */
export type Testimonial = {
  id: string
  parent_name: string | null
  feedback: string | null
  screenshot_url: string
  /** `'whatsapp'` for WhatsApp screenshots; anything else is shown as email. */
  source: string | null
}
