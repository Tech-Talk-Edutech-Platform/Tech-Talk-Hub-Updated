import { createContext, useContext, useMemo } from 'react'
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, PlayCircle } from 'lucide-react'

import { LessonDocuments, LessonPicture, LessonVideo } from './LessonMaterials'
import { MATERIAL_SCHEME, type TrainingMaterial } from './materials'

type UrlOf = (material: TrainingMaterial) => string | null

/** The lesson's materials, for the Markdown renderers below. */
type NotesContextValue = {
  byId: ReadonlyMap<string, TrainingMaterial>
  urlOf: UrlOf
  preview: boolean
}

const NotesContext = createContext<NotesContextValue>({
  byId: new Map(),
  urlOf: () => null,
  preview: false,
})

/** Material tokens pass through; other links get react-markdown's checks. */
const urlTransform = (url: string) =>
  url.startsWith(MATERIAL_SCHEME) ? url : defaultUrlTransform(url)

const materialId = (src: unknown) =>
  typeof src === 'string' && src.startsWith(MATERIAL_SCHEME)
    ? src.slice(MATERIAL_SCHEME.length)
    : null

/** A material on its own line: a picture, player or file card. */
function PlacedMaterial({ id }: { id: string }) {
  const { byId, urlOf, preview } = useContext(NotesContext)
  const material = byId.get(id)
  if (!material) {
    return preview ? (
      <p className="not-prose my-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        This spot shows a material that’s no longer in the lesson. It’s removed
        when you save.
      </p>
    ) : null
  }
  return (
    <div className="not-prose my-8">
      {material.kind === 'image' ? (
        <LessonPicture image={material} urlOf={urlOf} />
      ) : material.kind === 'video' ? (
        <LessonVideo video={material} urlOf={urlOf} />
      ) : (
        <LessonDocuments documents={[material]} urlOf={urlOf} />
      )}
    </div>
  )
}

/** A material mid-sentence: its name. Other images render as written. */
const NotesImage: Components['img'] = ({ src, alt }) => {
  const { byId } = useContext(NotesContext)
  const id = materialId(src)
  if (id === null) return <img src={src} alt={alt ?? ''} loading="lazy" />
  const material = byId.get(id)
  if (!material) return null
  const Icon = material.kind === 'video' ? PlayCircle : FileText
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300">
      <Icon size={14} aria-hidden /> {material.title}
    </span>
  )
}

const components: Components = {
  p: ({ node, children }) => {
    const only = node?.children.length === 1 ? node.children[0] : undefined
    const id =
      only?.type === 'element' && only.tagName === 'img'
        ? materialId(only.properties.src)
        : null
    return id ? <PlacedMaterial id={id} /> : <p>{children}</p>
  },
  img: NotesImage,
  a: ({ href, children }) => {
    const away = Boolean(href && /^(https?:)?\/\//i.test(href))
    const page = Boolean(href?.startsWith('/'))
    return (
      <a
        href={href}
        // Pages and sites open beside the lesson, so tutors keep their place.
        {...(away || page ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {children}
      </a>
    )
  },
}

/**
 * A lesson's notes (Markdown). A material on its own line shows there as a
 * picture, player or file card; one mid-sentence shows as its name.
 */
export function LessonNotes({
  body,
  materials,
  urlOf,
  preview = false,
}: {
  body: string
  materials: readonly TrainingMaterial[]
  urlOf: UrlOf
  /** The admin's preview: says when a placed material is missing. */
  preview?: boolean
}) {
  const value = useMemo(
    () => ({
      byId: new Map(materials.map((material) => [material.id, material])),
      urlOf,
      preview,
    }),
    [materials, urlOf, preview],
  )

  return (
    <NotesContext.Provider value={value}>
      <div className="prose max-w-[68ch] prose-slate dark:prose-invert prose-headings:tracking-tight prose-a:font-semibold prose-a:text-purple-700 dark:prose-a:text-purple-300 prose-strong:text-slate-900 dark:prose-strong:text-white prose-li:my-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={urlTransform}
          components={components}
        >
          {body}
        </ReactMarkdown>
      </div>
    </NotesContext.Provider>
  )
}
