import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  PlayCircle,
  X,
} from 'lucide-react'

import {
  canPreview,
  describeMaterial,
  embedFor,
  type TrainingMaterial,
} from './materials'

type UrlOf = (material: TrainingMaterial) => string | null

const DIRECT_VIDEO = /\.(mp4|m4v|webm|mov)($|[?#])/i

/**
 * Players and viewers from YouTube, Vimeo, Loom and Google. They're other
 * sites, so keeping their own origin (cookies, storage) can't reach this page;
 * popups let "Watch on YouTube" and "Open in Docs" work.
 */
const EMBED_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms'

// ── Video ────────────────────────────────────────────────────────────────

function VideoFrame({
  video,
  src,
}: {
  video: TrainingMaterial
  src: string | null
}) {
  const [failed, setFailed] = useState(false)
  const embed = video.url ? embedFor(video.url) : null

  if (embed) {
    return (
      <iframe
        src={embed.src}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        sandbox={EMBED_SANDBOX}
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full"
      />
    )
  }
  const playable = video.path !== null || DIRECT_VIDEO.test(video.url ?? '')
  if (!src) {
    return (
      <div className="grid size-full place-items-center text-white/70">
        <LoaderCircle
          size={28}
          className="animate-spin"
          aria-label="Loading the video"
        />
      </div>
    )
  }
  if (!playable || failed) {
    return (
      <div className="grid size-full place-items-center p-6 text-center text-white">
        <div>
          <p className="font-bold">
            {failed
              ? 'This video can’t play here.'
              : 'This video plays on another site.'}
          </p>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-white/90"
          >
            Open the video <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </div>
    )
  }
  return (
    // Training clips have no captions file; the lesson text carries the content.
    // oxlint-disable-next-line jsx-a11y/media-has-caption
    <video
      src={src}
      controls
      preload="metadata"
      playsInline
      onError={() => setFailed(true)}
      className="size-full bg-black object-contain"
    />
  )
}

/** The lesson's videos: one player across the top, a switcher when there are more. */
export function LessonVideos({
  videos,
  urlOf,
}: {
  videos: TrainingMaterial[]
  urlOf: UrlOf
}) {
  const [currentId, setCurrentId] = useState(videos[0]?.id)
  const current = videos.find((video) => video.id === currentId) ?? videos[0]
  if (!current) return null

  return (
    <section aria-label="Lesson video" className="bg-slate-950">
      <div className="aspect-video w-full">
        <VideoFrame key={current.id} video={current} src={urlOf(current)} />
      </div>
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="min-w-0">
          <p className="font-bold text-white">{current.title}</p>
          {current.note && (
            <p className="mt-0.5 text-sm text-slate-300">{current.note}</p>
          )}
        </div>
        {videos.length > 1 && (
          <ul
            aria-label="Videos in this lesson"
            className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1 md:max-w-[55%]"
          >
            {videos.map((video, index) => {
              const selected = video.id === current.id
              return (
                <li key={video.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCurrentId(video.id)}
                    className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      selected
                        ? 'bg-white text-slate-950'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    <PlayCircle size={15} aria-hidden className="shrink-0" />
                    <span className="truncate">
                      {index + 1}. {video.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Pictures ─────────────────────────────────────────────────────────────

export function LessonImages({
  images,
  urlOf,
}: {
  images: TrainingMaterial[]
  urlOf: UrlOf
}) {
  const [viewing, setViewing] = useState<number | null>(null)
  const single = images.length === 1

  return (
    <>
      <ul
        className={`grid gap-4 ${single ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}
      >
        {images.map((image, index) => {
          const src = urlOf(image)
          return (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setViewing(index)}
                aria-label={`View “${image.title}” full size`}
                className="group block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-500"
              >
                <span
                  className={`block overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 ${single ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={image.note || image.title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  ) : (
                    <span className="block size-full animate-pulse" />
                  )}
                </span>
                <span className="mt-2 block text-sm font-bold text-slate-900 dark:text-white">
                  {image.title}
                </span>
                {image.note && (
                  <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500 dark:text-slate-400">
                    {image.note}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {viewing !== null && (
        <Lightbox
          images={images}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          urlOf={urlOf}
        />
      )}
    </>
  )
}

/** Full-screen picture viewer: arrows or swipe through, Escape to close. */
function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  urlOf,
}: {
  images: TrainingMaterial[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
  urlOf: UrlOf
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const touchX = useRef<number | null>(null)
  const image = images[index]
  const many = images.length > 1

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  if (!image) return null
  const src = urlOf(image)
  const go = (step: number) =>
    onIndex((index + step + images.length) % images.length)

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- clicking the dark backdrop closes; Escape (onCancel) is the keyboard equivalent, arrows move
    <dialog
      ref={ref}
      aria-label={image.title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (!many) return
        if (event.key === 'ArrowRight') go(1)
        if (event.key === 'ArrowLeft') go(-1)
      }}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchX.current
        const end = event.changedTouches[0]?.clientX
        touchX.current = null
        if (!many || start === null || end === undefined) return
        if (Math.abs(end - start) > 50) go(end < start ? 1 : -1)
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-slate-950 p-0 text-white backdrop:bg-slate-950"
    >
      <div className="pointer-events-none flex h-full flex-col">
        <div className="pointer-events-auto flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <p className="text-sm text-white/70 tabular-nums">
            {many ? `${index + 1} of ${images.length}` : ''}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-6 md:px-24">
          {src ? (
            <img
              key={image.id}
              src={src}
              alt={image.note || image.title}
              className="pointer-events-auto min-h-0 max-w-full flex-1 rounded-lg object-contain"
            />
          ) : (
            <LoaderCircle
              size={28}
              className="animate-spin text-white/70"
              aria-hidden
            />
          )}
          <figcaption className="pointer-events-auto max-w-2xl text-center">
            <p className="font-bold">{image.title}</p>
            {image.note && (
              <p className="mt-1 text-sm text-white/70">{image.note}</p>
            )}
          </figcaption>
        </figure>
      </div>
      {many && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous picture"
            className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 max-md:hidden"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next picture"
            className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 max-md:hidden"
          >
            <ChevronRight size={22} aria-hidden />
          </button>
        </>
      )}
    </dialog>
  )
}

// ── Documents ────────────────────────────────────────────────────────────

/** "PDF", "PPTX", "SLIDES": what kind of file this is, at a glance. */
function fileLabel(material: TrainingMaterial): string {
  const embed = material.url ? embedFor(material.url) : null
  if (embed) {
    return (
      (
        {
          'Google Docs': 'DOCS',
          'Google Slides': 'SLIDES',
          'Google Sheets': 'SHEETS',
          'Google Drive': 'DRIVE',
        } as Record<string, string>
      )[embed.provider] ?? 'VIDEO'
    )
  }
  const name = material.path ?? material.url ?? ''
  const extension = name.split(/[?#]/)[0]?.split('.').pop() ?? ''
  return /^[a-z0-9]{2,5}$/i.test(extension) && name.includes('.')
    ? extension.toUpperCase()
    : 'LINK'
}

export function LessonDocuments({
  documents,
  urlOf,
}: {
  documents: TrainingMaterial[]
  urlOf: UrlOf
}) {
  const [previewing, setPreviewing] = useState<string | null>(null)

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl ring-1 ring-slate-200 dark:divide-white/10 dark:ring-white/10">
      {documents.map((document) => {
        const href = urlOf(document)
        const embed = document.url ? embedFor(document.url) : null
        const previewSrc = embed?.src ?? href
        const open = previewing === document.id
        const previewId = `training-preview-${document.id}`
        return (
          <li key={document.id}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <span
                aria-hidden
                className="grid h-12 w-10 shrink-0 place-items-center rounded-md bg-white text-[9.5px] font-black tracking-wide text-purple-700 ring-1 ring-slate-300 dark:bg-slate-950 dark:text-purple-300 dark:ring-white/15"
              >
                {fileLabel(document)}
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-bold text-slate-900 dark:text-white">
                  {document.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {describeMaterial(document)}
                </p>
                {document.note && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {document.note}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {canPreview(document) && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={previewId}
                    disabled={!previewSrc}
                    onClick={() => setPreviewing(open ? null : document.id)}
                    className="rounded-xl px-3.5 py-2 text-sm font-bold text-purple-700 ring-1 ring-purple-200 hover:bg-purple-50 disabled:opacity-50 aria-expanded:bg-purple-50 dark:text-purple-200 dark:ring-purple-400/30 dark:hover:bg-purple-500/10 dark:aria-expanded:bg-purple-500/10"
                  >
                    {open ? 'Hide preview' : 'Preview'}
                  </button>
                )}
                <a
                  href={href ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!href}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/5"
                >
                  {document.path && !canPreview(document) ? 'Download' : 'Open'}
                  <ExternalLink size={13} aria-hidden />
                </a>
              </div>
            </div>
            {open &&
              previewSrc &&
              (embed ? (
                <iframe
                  id={previewId}
                  src={previewSrc}
                  title={`${document.title} (preview)`}
                  sandbox={EMBED_SANDBOX}
                  className="block h-[75dvh] w-full border-t border-slate-200 bg-white dark:border-white/10"
                />
              ) : (
                // A PDF: the browser's own viewer (it won't run sandboxed).
                <object
                  id={previewId}
                  data={previewSrc}
                  type="application/pdf"
                  aria-label={`${document.title} (preview)`}
                  className="block h-[75dvh] w-full border-t border-slate-200 bg-white dark:border-white/10"
                >
                  <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
                    This browser can’t show PDFs here.{' '}
                    <a
                      href={previewSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-purple-700 underline dark:text-purple-300"
                    >
                      Open the PDF
                    </a>
                  </p>
                </object>
              ))}
          </li>
        )
      })}
    </ul>
  )
}
