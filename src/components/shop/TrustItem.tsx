import type { TrustPoint } from '../../types/shop'

export function TrustItem({ icon: Icon, title, text }: TrustPoint) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-black text-slate-800">{title}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p>
      </div>
    </div>
  )
}
