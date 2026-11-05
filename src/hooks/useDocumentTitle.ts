import { useEffect } from 'react'

/** Sets the browser tab title while mounted, and puts the previous one back after. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
