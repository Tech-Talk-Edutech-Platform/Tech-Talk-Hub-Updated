const OBJECT_PATH = '/storage/v1/object/public/'
const RENDER_PATH = '/storage/v1/render/image/public/'
const RESIZABLE_EXTENSION = /\.(png|jpe?g|webp|avif)$/i

/** Widths offered to the browser, matching Next.js `<Image>` device sizes. */
export const RESPONSIVE_WIDTHS = [640, 750, 828, 1080, 1200, 1920] as const

function isResizable(url: URL): boolean {
  return (
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith(OBJECT_PATH) &&
    RESIZABLE_EXTENSION.test(url.pathname)
  )
}

/**
 * A `srcSet` of resized copies of a Supabase Storage image, served as
 * WebP/AVIF when the browser accepts them (what Next.js `<Image>` did on the
 * old site). Returns `undefined` for any other image.
 */
export function supabaseSrcSet(src: string, quality = 75): string | undefined {
  let url: URL

  try {
    url = new URL(src)
  } catch {
    return undefined
  }

  if (!isResizable(url)) {
    return undefined
  }

  const renderPath = url.pathname.replace(OBJECT_PATH, RENDER_PATH)

  return RESPONSIVE_WIDTHS.map((width) => {
    const resized = new URL(renderPath, url.origin)
    resized.searchParams.set('width', String(width))
    resized.searchParams.set('quality', String(quality))
    return `${resized.toString()} ${width}w`
  }).join(', ')
}
