import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useCurriculumLevels } from '../../hooks/useCurriculumLevels'
import { Modal } from '../ui/Modal'
import { CurriculumCard } from './CurriculumCard'
import { LeadMagnetForm } from './LeadMagnetForm'
import { TechTalkAdvantage } from './TechTalkAdvantage'

/** Learning pathways from Sanity, the roadmap download and the platform advantages. */
export function ProgramsSection() {
  const [showRoadmapModal, setShowRoadmapModal] = useState(false)
  const levelsState = useCurriculumLevels()
  const levels = levelsState.status === 'success' ? levelsState.data : []

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-purple-50/30 to-purple-100/40">
          <div className="mx-auto max-w-7xl px-6 pb-12 pt-12 text-center">
            <span className="inline-flex rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary shadow-sm">
              Premium Coding Pathways
            </span>

            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Learn. Build. Grow.{' '}
              <span className="text-secondary">One Stage at a Time.</span>
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Structured learning pathways designed to grow with every learner —
              from their first line of code to advanced real-world projects.
            </p>

            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              Every learner begins with a placement assessment so they start at
              the right challenge level.
            </p>
          </div>
        </div>

        {/* Program cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {levels.slice(0, 3).map((level) => (
            <CurriculumCard key={level.id} level={level} />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col justify-center gap-4 text-center sm:flex-row">
          <Link
            to="/book-class"
            className="rounded-xl bg-secondary px-8 py-3.5 font-bold text-white shadow-lg shadow-secondary/20 transition hover:-translate-y-0.5"
          >
            Book a Placement Assessment
          </Link>

          <button
            type="button"
            onClick={() => setShowRoadmapModal(true)}
            className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 font-bold text-slate-700 shadow-sm transition hover:border-purple-200 hover:bg-purple-50"
          >
            Download Full Roadmap
          </button>
        </div>
      </div>

      {showRoadmapModal && (
        <Modal
          title="Get the Roadmap PDF"
          closeLabel="Close roadmap form"
          onClose={() => setShowRoadmapModal(false)}
        >
          <LeadMagnetForm onClose={() => setShowRoadmapModal(false)} />
        </Modal>
      )}

      <TechTalkAdvantage />
    </div>
  )
}
