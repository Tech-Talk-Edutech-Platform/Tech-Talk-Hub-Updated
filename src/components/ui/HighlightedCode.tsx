import type { CSSProperties, ReactNode } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { getNodeText } from '../../lib/blog'

const LANGUAGE_CLASS = /language-(\w+)/

interface HighlightedCodeProps {
  /** The class react-markdown gives a code element, e.g. `language-js`. */
  className?: string
  children?: ReactNode
  /** A react-syntax-highlighter Prism theme. */
  theme: Record<string, CSSProperties>
  /** Classes for inline code, and for code blocks that don't name a language. */
  inlineClassName: string
  blockClassName?: string
  blockStyle?: CSSProperties
}

/**
 * A markdown code element: fenced blocks that name a language are syntax
 * highlighted, everything else is shown as inline code.
 */
export function HighlightedCode({
  className,
  children,
  theme,
  inlineClassName,
  blockClassName,
  blockStyle,
}: HighlightedCodeProps) {
  const language = LANGUAGE_CLASS.exec(className ?? '')?.[1]
  if (!language) return <code className={inlineClassName}>{children}</code>

  return (
    <SyntaxHighlighter
      style={theme}
      language={language}
      PreTag="div"
      className={blockClassName}
      customStyle={blockStyle}
    >
      {getNodeText(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  )
}
