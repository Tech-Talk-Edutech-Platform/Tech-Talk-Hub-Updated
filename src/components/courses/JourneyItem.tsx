type JourneyItemProps = {
  number: string
  text: string
}

export function JourneyItem({ number, text }: JourneyItemProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-xs font-black text-primary">
        {number}
      </span>
      <span className="text-sm font-bold text-slate-700">{text}</span>
    </div>
  )
}
