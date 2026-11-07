import { CODING_CLASS_CHECKLIST } from '../../../data/blog'

export function LearningChecklist() {
  return (
    <div className="my-8 grid gap-3 rounded-[1.75rem] border border-purple-100 bg-[#FCFAFF] p-5 sm:grid-cols-2 sm:p-6">
      {CODING_CLASS_CHECKLIST.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7651EF]">
            <Icon size={17} />
          </span>
          <span className="text-sm leading-5 font-semibold text-slate-700">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
