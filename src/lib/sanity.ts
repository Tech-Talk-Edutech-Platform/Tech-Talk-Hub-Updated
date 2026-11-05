import {
  createImageUrlBuilder,
  type SanityImageSource,
} from '@sanity/image-url'

const SANITY_PROJECT_ID = '6r4esya0'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2026-06-16'

/** Sanity's CDN-cached query endpoint (what `useCdn: true` uses). */
const QUERY_ENDPOINT = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`

const imageBuilder = createImageUrlBuilder({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
})

export function urlFor(source: SanityImageSource) {
  return imageBuilder.image(source)
}

/**
 * Runs a GROQ query against the public dataset and returns its raw `result`.
 *
 * Runs in the browser, so the site's origin must be listed under
 * API → CORS origins in the Sanity project settings.
 */
export async function sanityQuery(query: string): Promise<unknown> {
  const url = new URL(QUERY_ENDPOINT)
  url.searchParams.set('query', query)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Sanity query failed with HTTP ${response.status}`)
  }

  const body: unknown = await response.json()

  return typeof body === 'object' && body !== null && 'result' in body
    ? body.result
    : undefined
}
