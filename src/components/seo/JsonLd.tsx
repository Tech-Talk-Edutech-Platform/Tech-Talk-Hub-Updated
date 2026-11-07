import { useEffect } from 'react'

type JsonLdProps = {
  data: Record<string, unknown>
}

/**
 * Structured data for search engines. `<` is escaped so content can't close
 * the script tag. Replaces the copy the build prerendered into the page head.
 */
export function JsonLd({ data }: JsonLdProps) {
  useEffect(() => {
    document.getElementById('prerendered-jsonld')?.remove()
  }, [])

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON is escaped above
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\u003c'),
      }}
    />
  )
}
