import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', toggleVisibility)
    toggleVisibility()
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="hover:bg-secondary-dark fixed right-5 bottom-20 z-50 rounded-full bg-secondary p-0 text-background shadow-btn"
      aria-label="Back to top"
    >
      <ArrowUp size={24} />
    </button>
  )
}
