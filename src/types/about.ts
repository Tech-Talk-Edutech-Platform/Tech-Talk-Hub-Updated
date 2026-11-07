import type { SanityImageSource } from '@sanity/image-url'

/** An `about` document from Sanity, shown as a card on the About page. */
export type AboutSection = {
  id: string
  title?: string
  headline?: string
  text?: string
}

/** A `teamMember` document from Sanity. */
export type TeamMember = {
  id: string
  name?: string
  title?: string
  bio?: string
  image?: SanityImageSource
  linkedin?: string
  twitter?: string
  github?: string
}
