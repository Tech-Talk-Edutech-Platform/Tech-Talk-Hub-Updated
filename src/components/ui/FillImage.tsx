import { useState, type ImgHTMLAttributes } from 'react'

import { supabaseSrcSet } from '../../lib/images'

type FillImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'loading' | 'fetchPriority' | 'srcSet'
> & {
  src: string
  alt: string
  /** Load eagerly at high priority — use for above-the-fold images. */
  priority?: boolean
}

/**
 * An image that fills its nearest positioned parent (the Next.js
 * `<Image fill />` behaviour). Size and crop it with `object-*` classes.
 *
 * Supabase Storage images get resized copies to pick from with `sizes`; if
 * those fail to load, the original is shown instead.
 */
export function FillImage({
  src,
  alt,
  priority = false,
  className = '',
  onError,
  ...props
}: FillImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const srcSet = failedSrc === src ? undefined : supabaseSrcSet(src)

  return (
    <img
      src={src}
      srcSet={srcSet}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`absolute inset-0 h-full w-full text-transparent ${className}`}
      onError={(event) => {
        if (srcSet) {
          setFailedSrc(src)
        }
        onError?.(event)
      }}
      {...props}
    />
  )
}
