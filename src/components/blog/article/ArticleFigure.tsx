type ArticleFigureProps = {
  src?: string
  alt?: string
}

/** A markdown image, framed, with its alt text as the caption. */
export function ArticleFigure({ src, alt }: ArticleFigureProps) {
  if (!src) {
    return null
  }

  return (
    <figure className="my-10 sm:my-14">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-[#F8F6FF] shadow-xl shadow-purple-950/5">
        <img
          src={src}
          alt={alt || 'Tech Talk Hub article illustration'}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full object-contain"
        />
      </div>
      {alt && (
        <figcaption className="mt-3 text-center text-xs font-medium tracking-wide text-slate-400 italic sm:text-sm">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}
