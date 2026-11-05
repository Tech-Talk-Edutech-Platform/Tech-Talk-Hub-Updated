import type { ImgHTMLAttributes } from 'react'

type FillImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'loading' | 'fetchPriority'
> & {
  src: string
  alt: string
  /** Load eagerly at high priority — use for above-the-fold images. */
  priority?: boolean
}

/**
 * An image that fills its nearest positioned parent (the Next.js
 * `<Image fill />` behaviour). Size and crop it with `object-*` classes.
 */
export function FillImage({
  alt,
  priority = false,
  className = '',
  ...props
}: FillImageProps) {
  return (
    <img
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`absolute inset-0 h-full w-full text-transparent ${className}`}
      {...props}
    />
  )
}
