import { useEffect, useId, useRef, useState } from 'react'
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from 'react'
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Link2,
  LoaderCircle,
  PlayCircle,
  Upload,
  X,
} from 'lucide-react'

import {
  describeMaterial,
  embedFor,
  guessKind,
  isOpenableUrl,
  MATERIAL_KINDS,
  MAX_UPLOAD_MB,
  titleFromUrl,
  UPLOAD_ACCEPT,
  uploadMaterialFile,
  uploadProblem,
  useMaterialUrls,
  type MaterialKind,
  type TrainingMaterial,
} from './materials'

/** A material in the lesson editor: possibly still uploading. */
export type MaterialRow = TrainingMaterial & {
  uploading?: boolean
  /** A local picture shown while (and after) it uploads. */
  preview?: string
}

/** The database's limit on materials per lesson. */
const MAX_MATERIALS = 40

const KIND_LABEL: Record<MaterialKind, string> = {
  video: 'Video',
  image: 'Picture',
  document: 'Document',
}

const fieldClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500'

/**
 * The lesson's videos, pictures and documents: upload files (drop them or
 * pick them) or paste a link, then name, caption and order them.
 */
export function MaterialsEditor({
  materials,
  onChange,
  onUploaded,
  labelClass,
}: {
  materials: MaterialRow[]
  onChange: Dispatch<SetStateAction<MaterialRow[]>>
  /** Each file stored, so the editor can delete it again if it's not saved. */
  onUploaded: (path: string) => void
  labelClass: string
}) {
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkKind, setLinkKind] = useState<MaterialKind | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const linkId = useId()
  // Local copies of pictures being uploaded, freed when the editor closes.
  const previews = useRef(new Set<string>())
  useEffect(() => {
    const created = previews.current
    return () => {
      for (const url of created) URL.revokeObjectURL(url)
      created.clear()
    }
  }, [])
  const { urlOf } = useMaterialUrls(
    materials.filter((row) => !row.uploading && row.kind === 'image'),
  )

  const update = (id: string, patch: Partial<MaterialRow>) =>
    onChange((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )

  const move = (index: number, step: -1 | 1) =>
    onChange((rows) => {
      const next = [...rows]
      const [moved] = next.splice(index, 1)
      if (moved) next.splice(index + step, 0, moved)
      return next
    })

  const addFiles = (files: File[]) => {
    const room = MAX_MATERIALS - materials.length
    const errors = files.flatMap((file) => {
      const problem = uploadProblem(file)
      return problem ? [problem] : []
    })
    const accepted = files.filter((file) => !uploadProblem(file))
    const leftOut = accepted.length - Math.max(room, 0)
    if (leftOut > 0) {
      errors.push(
        `A lesson holds up to ${MAX_MATERIALS} materials; ${leftOut} ${leftOut === 1 ? 'file was' : 'files were'} left out.`,
      )
    }
    setProblems(errors)
    for (const file of accepted.slice(0, Math.max(room, 0))) {
      const tempId = `uploading-${crypto.randomUUID()}`
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined
      if (preview) previews.current.add(preview)
      onChange((rows) => [
        ...rows,
        {
          id: tempId,
          kind: file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
              ? 'video'
              : 'document',
          title: file.name.replace(/\.[^.]+$/, ''),
          note: '',
          path: null,
          url: null,
          mime: file.type || null,
          size: file.size,
          uploading: true,
          preview,
        },
      ])
      uploadMaterialFile(file)
        .then((stored) => {
          if (stored.path) onUploaded(stored.path)
          // Keep whatever the admin typed while it uploaded.
          onChange((rows) =>
            rows.map((row) =>
              row.id === tempId
                ? {
                    ...stored,
                    title: row.title.trim() || stored.title,
                    note: row.note,
                    preview,
                  }
                : row,
            ),
          )
        })
        .catch((error: unknown) => {
          onChange((rows) => rows.filter((row) => row.id !== tempId))
          setProblems((list) => [
            ...list,
            error instanceof Error
              ? error.message
              : `“${file.name}” didn’t upload.`,
          ])
        })
    }
  }

  const addLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    if (!isOpenableUrl(url)) {
      setProblems([
        'Links need to start with https:// (or / for a page on this site).',
      ])
      return
    }
    if (materials.length >= MAX_MATERIALS) {
      setProblems([`A lesson holds up to ${MAX_MATERIALS} materials.`])
      return
    }
    setProblems([])
    onChange((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        kind: linkKind ?? guessKind(url),
        title: titleFromUrl(url),
        note: '',
        path: null,
        url,
        mime: null,
        size: null,
      },
    ])
    setLinkUrl('')
    setLinkKind(null)
  }

  const onLinkKey = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter adds the link instead of submitting the whole lesson.
    if (event.key === 'Enter') {
      event.preventDefault()
      addLink()
    }
  }

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className={labelClass}>Materials</legend>
      <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
        Videos, pictures and documents tutors open inside the lesson. Uploads up
        to {MAX_UPLOAD_MB} MB each; for longer videos, paste a YouTube, Loom,
        Vimeo or Google Drive link.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          addFiles([...event.dataTransfer.files])
        }}
        className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors ${
          dragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
            : 'border-slate-200 dark:border-white/15'
        }`}
      >
        <Upload size={18} aria-hidden className="text-slate-400" />
        <span className="text-slate-600 dark:text-slate-300">
          Drop files here, or
        </span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-purple-700"
        >
          Choose files
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ''
            if (files.length) addFiles(files)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <label htmlFor={linkId} className="sr-only">
          Link to a video or document
        </label>
        <input
          id={linkId}
          type="url"
          inputMode="url"
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          onKeyDown={onLinkKey}
          placeholder="Paste a link: YouTube, Loom, Google Slides…"
          className={`${fieldClass} min-w-0 flex-1 basis-56 py-2`}
        />
        <select
          aria-label="Link type"
          value={linkKind ?? guessKind(linkUrl)}
          onChange={(event) => {
            const kind = MATERIAL_KINDS.find((k) => k === event.target.value)
            setLinkKind(kind ?? null)
          }}
          className={`${fieldClass} py-2`}
        >
          {MATERIAL_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addLink}
          disabled={!linkUrl.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <Link2 size={15} aria-hidden /> Add link
        </button>
      </div>

      {problems.length > 0 && (
        <ul
          role="alert"
          className="space-y-1 text-sm font-semibold text-rose-600 dark:text-rose-300"
        >
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {materials.length > 0 && (
        <ol className="space-y-2">
          {materials.map((row, index) => (
            <li
              key={row.id}
              className="flex gap-3 rounded-xl p-2.5 ring-1 ring-slate-200 dark:ring-white/10"
            >
              <Thumb row={row} src={row.preview ?? urlOf(row)} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    aria-label="Title"
                    value={row.title}
                    maxLength={160}
                    onChange={(event) =>
                      update(row.id, { title: event.target.value })
                    }
                    className={`${fieldClass} w-full min-w-0 font-semibold`}
                  />
                  {row.url && (
                    <select
                      aria-label="Type"
                      value={row.kind}
                      onChange={(event) => {
                        const kind = MATERIAL_KINDS.find(
                          (k) => k === event.target.value,
                        )
                        if (kind) update(row.id, { kind })
                      }}
                      className={`${fieldClass} shrink-0`}
                    >
                      {MATERIAL_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABEL[kind]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  aria-label="Caption"
                  value={row.note}
                  maxLength={300}
                  onChange={(event) =>
                    update(row.id, { note: event.target.value })
                  }
                  placeholder="Caption, or what to look out for (optional)"
                  className={`${fieldClass} w-full`}
                />
                <p className="flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {row.uploading ? (
                    <>
                      <LoaderCircle
                        size={12}
                        className="animate-spin"
                        aria-hidden
                      />
                      Uploading…
                    </>
                  ) : (
                    <span className="truncate">
                      {row.url
                        ? `${embedFor(row.url)?.provider ?? 'Link'} · ${row.url}`
                        : describeMaterial(row)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col">
                <SmallButton
                  label={`Move “${row.title}” up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={14} />
                </SmallButton>
                <SmallButton
                  label={`Move “${row.title}” down`}
                  disabled={index === materials.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={14} />
                </SmallButton>
                <SmallButton
                  label={`Remove “${row.title}”`}
                  tone="danger"
                  disabled={row.uploading}
                  onClick={() =>
                    onChange((rows) => rows.filter((r) => r.id !== row.id))
                  }
                >
                  <X size={14} />
                </SmallButton>
              </div>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  )
}

function Thumb({ row, src }: { row: MaterialRow; src: string | null }) {
  const box =
    'grid h-14 w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg'
  if (row.kind === 'image' && src) {
    return (
      <span className={`${box} bg-slate-100 dark:bg-white/5`}>
        <img src={src} alt="" className="size-full object-cover" />
      </span>
    )
  }
  if (row.kind === 'video') {
    return (
      <span className={`${box} bg-slate-900 text-white`}>
        <PlayCircle size={22} aria-hidden />
      </span>
    )
  }
  return (
    <span
      className={`${box} bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300`}
    >
      <FileText size={22} aria-hidden />
    </span>
  )
}

function SmallButton({
  label,
  onClick,
  disabled,
  tone = 'neutral',
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'neutral' | 'danger'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === 'danger'
          ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
