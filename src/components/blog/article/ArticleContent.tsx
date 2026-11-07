import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ArticleSourceContext } from '../../../context/ArticleSourceContext'
import { createHeadingId, getNodeText } from '../../../lib/blog'
import { ArticleFigure } from './ArticleFigure'
import { ArticleSectionHeading } from './ArticleSectionHeading'
import { FeaturedQuote } from './FeaturedQuote'

const BODY_TEXT = 'text-base leading-8 text-slate-600 sm:text-[17px]'

const COMPONENTS: Components = {
  h2: ArticleSectionHeading,
  h1({ children }) {
    return (
      <h2
        id={createHeadingId(getNodeText(children))}
        className="mt-14 mb-5 scroll-mt-28 text-3xl leading-tight font-black text-[#2947C7] sm:text-4xl"
      >
        {children}
      </h2>
    )
  },
  h3({ children }) {
    return (
      <h3
        id={createHeadingId(getNodeText(children))}
        className="mt-9 mb-4 scroll-mt-28 text-xl font-extrabold text-[#172554] sm:text-2xl"
      >
        {children}
      </h3>
    )
  },
  h4({ children }) {
    return (
      <h4
        id={createHeadingId(getNodeText(children))}
        className="mt-8 mb-3 scroll-mt-28 text-lg font-bold text-[#172554]"
      >
        {children}
      </h4>
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

    return <p className={`my-5 ${BODY_TEXT}`}>{children}</p>
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
    return <li className={`pl-2 ${BODY_TEXT} [&_p]:my-0`}>{children}</li>
  },
  strong({ children }) {
    return <strong className="font-extrabold text-[#172554]">{children}</strong>
  },
  em({ children }) {
    return <em className="text-slate-700">{children}</em>
  },
  blockquote({ children }) {
    return <FeaturedQuote>{children}</FeaturedQuote>
  },
  img({ src, alt }) {
    return (
      <ArticleFigure
        src={typeof src === 'string' ? src : undefined}
        alt={alt}
      />
    )
  },
  a({ href, children }) {
    const isExternal = href?.startsWith('http')

    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="font-bold text-[#FF3F7F] underline decoration-pink-200 underline-offset-4 transition hover:text-[#E92C70]"
      >
        {children}
      </a>
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

type ArticleContentProps = {
  content: string
}

/** Renders an article's markdown with the blog's styling and inline cards. */
export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <ArticleSourceContext.Provider value={content}>
      <div className="w-full">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
          {content}
        </ReactMarkdown>
      </div>
    </ArticleSourceContext.Provider>
  )
}
