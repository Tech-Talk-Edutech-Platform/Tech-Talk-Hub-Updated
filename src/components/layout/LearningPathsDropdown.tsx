import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { LEARNING_PATHS } from '../../data/navigation'
import { useClickOutside } from '../../hooks/useClickOutside'

/** Desktop navbar "Learning Paths" menu. */
export function LearningPathsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setIsOpen(false))

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 py-6 text-sm font-semibold text-slate-700 hover:text-secondary"
      >
        Learning Paths
        <ChevronDown
          size={15}
          className={`transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <Link
            to="/curriculum"
            onClick={() => setIsOpen(false)}
            className="block px-3 pt-3 pb-2 text-xs font-bold tracking-wider text-slate-400 uppercase hover:text-secondary"
          >
            Learning Paths
          </Link>

          {LEARNING_PATHS.map((path) => (
            <Link
              key={path.href}
              to={path.href}
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between rounded-xl px-3 py-3 hover:bg-secondary/5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-secondary">
                  {path.label}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {path.description}
                </p>
              </div>

              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
