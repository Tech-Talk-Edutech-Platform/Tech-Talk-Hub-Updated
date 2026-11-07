import { LockKeyhole, ShoppingBag } from 'lucide-react'

import { useCart } from '../../hooks/useCart'
import { formatMoney } from '../../lib/money'

/** The order sidebar on the checkout page. */
export function CheckoutSummary() {
  const { items, subtotal } = useCart()

  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-[100px]">
      <h2 className="text-lg font-extrabold text-slate-900">Your Order</h2>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag size={18} className="text-slate-300" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold text-slate-800">
                {item.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">Qty {item.quantity}</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap text-slate-700">
              {formatMoney(item.price * item.quantity, item.currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="my-6 border-t border-slate-100" />

      <div className="flex justify-between text-sm text-slate-500">
        <span>Subtotal</span>
        <span>{formatMoney(subtotal)}</span>
      </div>
      <div className="mt-3 flex justify-between gap-4 text-sm text-slate-500">
        <span>Delivery</span>
        <span className="text-right">To be calculated</span>
      </div>

      <div className="my-5 border-t border-slate-100" />

      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800">Total</span>
        <span className="text-xl font-black text-primary">
          {formatMoney(subtotal)}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-[11px] font-semibold text-slate-500">
        <LockKeyhole size={13} />
        Secure checkout
      </div>
    </aside>
  )
}
