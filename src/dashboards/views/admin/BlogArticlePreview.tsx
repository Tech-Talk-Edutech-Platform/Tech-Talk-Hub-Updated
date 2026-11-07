import { useMemo } from 'react'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Heart,
  List,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'

import {
  calculateReadingTime,
  createHeadingId,
  extractHeadings,
  getNodeText,
} from '../../../lib/blog'

interface PreviewArticle {
  title: string
  excerpt: string | null
  category: string | null
  content: string
  cover_image_url: string | null
  published_at: string | null
}

interface BlogArticlePreviewProps {
  article: PreviewArticle
  onClose: () => void
  onPublish?: () => unknown
  publishing?: boolean
}

function formatDate(value: string | null) {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',

    month: 'long',

    year: 'numeric',
  }).format(value ? new Date(value) : new Date())
}

function PreviewArticleImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) {
    return null
  }

  return (
    <figure className="my-10 sm:my-14">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-[#F8F6FF] shadow-lg shadow-purple-950/5">
        <img
          src={src}
          alt={alt || 'Article illustration'}
          loading="lazy"
          className="mx-auto block max-h-[650px] w-full object-contain"
        />
      </div>

      {alt && (
        <figcaption className="mt-3 text-center text-sm text-slate-400 italic">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}

const PREVIEW_COMPONENTS: Components = {
  h1({ children }) {
    return (
      <h2
        id={createHeadingId(getNodeText(children))}
        className="mt-14 mb-5 scroll-mt-28 text-3xl leading-tight font-black tracking-tight text-[#2947C7] sm:text-4xl"
      >
        {children}
      </h2>
    )
  },

  h2({ children }) {
    return (
      <h2
        id={createHeadingId(getNodeText(children))}
        className="mt-14 mb-5 scroll-mt-28 text-2xl leading-tight font-black tracking-tight text-[#2947C7] sm:mt-16 sm:text-3xl"
      >
        {children}
      </h2>
    )
  },

  h3({ children }) {
    return (
      <h3
        id={createHeadingId(getNodeText(children))}
        className="mt-10 mb-4 scroll-mt-28 text-xl leading-snug font-extrabold text-[#172554] sm:text-2xl"
      >
        {children}
      </h3>
    )
  },

  h4({ children }) {
    return (
      <h4 className="mt-8 mb-3 text-lg font-bold text-[#172554]">{children}</h4>
    )
  },

  p({ children, node }) {
    // Images render as <figure>, which can't sit inside a <p>.
    const containsImage =
      node?.children.some(
        (child) => child.type === 'element' && child.tagName === 'img',
      ) ?? false

    if (containsImage) {
      return children
    }

    return (
      <p className="my-5 text-base leading-[1.95] text-slate-600 sm:text-[17px]">
        {children}
      </p>
    )
  },

  strong({ children }) {
    return <strong className="font-extrabold text-[#172554]">{children}</strong>
  },

  em({ children }) {
    return <em className="text-slate-700">{children}</em>
  },

  ul({ children }) {
    return (
      <ul className="my-7 list-disc space-y-3 pl-6 marker:text-[#FF3F7F]">
        {children}
      </ul>
    )
  },

  ol({ children }) {
    return (
      <ol className="my-7 list-decimal space-y-3 pl-6 marker:font-bold marker:text-[#FF3F7F]">
        {children}
      </ol>
    )
  },

  li({ children }) {
    return (
      <li className="pl-2 text-base leading-8 text-slate-600 sm:text-[17px] [&_p]:my-0">
        {children}
      </li>
    )
  },

  blockquote({ children }) {
    return (
      <blockquote className="my-10 rounded-r-[1.75rem] border-l-[5px] border-[#FF3F7F] bg-linear-to-r from-[#FFF5F8] to-[#FBF8FF] px-6 py-5 sm:px-8">
        <div className="text-lg leading-8 font-semibold text-[#2947C7] italic [&_p]:my-1 [&_p]:text-[#2947C7]">
          {children}
        </div>
      </blockquote>
    )
  },

  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="font-bold text-[#FF3F7F] underline decoration-pink-200 underline-offset-4 transition hover:text-[#E92C70]"
      >
        {children}
      </a>
    )
  },

  img({ src, alt }) {
    return (
      <PreviewArticleImage
        src={typeof src === 'string' ? src : undefined}
        alt={alt}
      />
    )
  },

  hr() {
    return <hr className="my-12 border-slate-200" />
  },

  table({ children }) {
    return (
      <div className="my-8 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    )
  },

  thead({ children }) {
    return <thead className="bg-[#F8F5FF] text-[#2947C7]">{children}</thead>
  },

  th({ children }) {
    return <th className="px-5 py-4 font-black">{children}</th>
  },

  td({ children }) {
    return (
      <td className="border-t border-slate-100 px-5 py-4 text-slate-600">
        {children}
      </td>
    )
  },

  pre({ children }) {
    return (
      <pre className="my-8 overflow-x-auto rounded-2xl bg-[#172554] p-5 text-sm leading-7 text-white">
        {children}
      </pre>
    )
  },

  code({ children, className, node: _node, ...props }) {
    // Fenced blocks carry a language class; inline code doesn't.
    if (className) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }

    return (
      <code
        className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[0.9em] font-semibold text-[#7C3AED]"
        {...props}
      >
        {children}
      </code>
    )
  },
}

const PREVIEW_REMARK_PLUGINS = [remarkGfm]

function PreviewArticleContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={PREVIEW_REMARK_PLUGINS}
      components={PREVIEW_COMPONENTS}
    >
      {content || ''}
    </ReactMarkdown>
  )
}

export default function BlogArticlePreview({
  article,
  onClose,
  onPublish,
  publishing = false,
}: BlogArticlePreviewProps) {
  const headings = useMemo(
    () => extractHeadings(article.content || ''),

    [article.content],
  )

  const readingTime = useMemo(
    () => calculateReadingTime(article.content || ''),

    [article.content],
  )

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Article preview"
      className="fixed inset-0 z-100 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-white p-0"
    >
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-purple-600 uppercase">
              Article Preview
            </p>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Review how your article will appear before publishing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onPublish && (
              <button
                type="button"
                onClick={onPublish}
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              disabled={publishing}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>
        </div>
      </div>

      <main className="min-h-screen bg-white text-[#172554]">
        <header className="relative overflow-hidden bg-linear-to-br from-white via-[#FBF9FF] to-[#F0E8FF] px-6 pt-16 pb-20 lg:px-8 lg:pb-24">
          <div className="pointer-events-none absolute top-12 -left-32 h-80 w-80 rounded-full bg-[#9B6CFF]/10 blur-[100px]" />

          <div className="pointer-events-none absolute top-0 -right-32 h-96 w-96 rounded-full bg-[#FF3F7F]/10 blur-[110px]" />

          <div className="relative mx-auto max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-xs font-black tracking-[0.16em] text-[#FF3F7F] uppercase">
              <Sparkles size={14} />

              {article.category || 'Tech Talk Hub'}
            </span>

            <h1 className="mt-6 max-w-4xl text-4xl leading-[1.08] font-black tracking-tight text-[#2947C7] sm:text-5xl lg:text-6xl">
              {article.title || 'Untitled article'}
            </h1>

            {article.excerpt && (
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
                {article.excerpt}
              </p>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <UserRound size={16} />
                Tech Talk Hub Team
              </span>

              <span className="flex items-center gap-2">
                <Calendar size={16} />

                {formatDate(article.published_at)}
              </span>

              <span className="flex items-center gap-2">
                <Clock3 size={16} />
                {readingTime} min read
              </span>
            </div>
          </div>
        </header>

        {article.cover_image_url && (
          <section className="relative z-10 mx-auto -mt-9 max-w-6xl px-5 sm:-mt-12 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-purple-900/10 sm:rounded-4xl">
              <img
                src={article.cover_image_url}
                alt={article.title || 'Article cover'}
                className="aspect-video w-full object-contain"
              />
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[230px_minmax(0,760px)] lg:justify-center lg:gap-16">
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-8">
                {headings.length > 0 && (
                  <div className="rounded-[1.75rem] border border-purple-100 bg-[#FCFAFF] p-5">
                    <p className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-[#2947C7] uppercase">
                      <List size={16} />
                      In this article
                    </p>

                    <nav className="mt-5 space-y-3">
                      {headings.map((heading) => (
                        <a
                          key={heading.key}
                          href={`#${heading.id}`}
                          className="block border-l-2 border-transparent pl-3 text-sm leading-6 text-slate-500 transition hover:border-[#FF3F7F] hover:text-[#2947C7]"
                        >
                          {heading.title}
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                <div className="rounded-[1.75rem] bg-linear-to-br from-[#2947C7] to-[#7C3AED] p-5 text-white">
                  <p className="text-xs font-black tracking-[0.15em] text-white/70 uppercase">
                    Tech Talk Hub
                  </p>

                  <h3 className="mt-3 text-lg leading-snug font-black">
                    Help your child start coding.
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-white/75">
                    Live, personalized classes for young creators.
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#2947C7]">
                    Book a trial
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </aside>

            <article className="min-w-0">
              {headings.length > 0 && (
                <details className="mb-9 rounded-2xl border border-purple-100 bg-[#FCFAFF] p-5 lg:hidden">
                  <summary className="cursor-pointer list-none text-sm font-black text-[#2947C7]">
                    <span className="inline-flex items-center gap-2">
                      <List size={17} />
                      In this article
                    </span>
                  </summary>

                  <nav className="mt-4 space-y-3">
                    {headings.map((heading) => (
                      <a
                        key={heading.key}
                        href={`#${heading.id}`}
                        className="block text-sm leading-6 text-slate-600 hover:text-[#FF3F7F]"
                      >
                        {heading.title}
                      </a>
                    ))}
                  </nav>
                </details>
              )}

              {article.content ? (
                <PreviewArticleContent content={article.content} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Add article content to preview it here.
                </div>
              )}

              <div className="mt-16 overflow-hidden rounded-4xl border border-purple-100 bg-linear-to-br from-[#FBF8FF] via-white to-[#FFF5F8] p-7 shadow-xs sm:p-9">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-[#FF3F7F]">
                    <Heart size={21} fill="currentColor" />
                  </span>

                  <div>
                    <p className="text-xs font-black tracking-[0.14em] text-[#FF3F7F] uppercase">
                      Start their journey
                    </p>

                    <h2 className="mt-2 text-2xl leading-tight font-black text-[#2947C7]">
                      Help your child become a creator of technology.
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                      Explore personalized coding classes designed around your
                      child’s age, interests and learning pace.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-green-500" />
                        Live classes
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-green-500" />
                        Practical projects
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-green-500" />
                        Ages 5–18
                      </span>
                    </div>

                    <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF3F7F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/20">
                      Book a trial class
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </dialog>
  )
}
