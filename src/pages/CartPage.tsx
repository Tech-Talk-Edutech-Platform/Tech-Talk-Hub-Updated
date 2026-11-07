import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { NavBar } from '../components/layout/NavBar'
import { CartLineItem } from '../components/shop/CartLineItem'
import { staticPageMeta } from '../data/seo'
import { useCart } from '../hooks/useCart'
import { usePageMeta } from '../hooks/usePageMeta'
import { formatMoney } from '../lib/money'

export function CartPage() {
  usePageMeta(staticPageMeta('/cart'))
  const { items, subtotal } = useCart()

  return (
    <main className="min-h-screen bg-slate-50">
      <NavBar />

      <section className="pt-[110px]">
        <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-6">
          <h1 className="text-3xl font-black text-slate-900">Your Cart</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review your products before checkout.
          </p>

          {items.length === 0 ? (
            <div className="mt-10 flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
              <ShoppingBag size={42} className="text-slate-300" />
              <h2 className="mt-5 text-xl font-bold text-slate-800">
                Your cart is empty
              </h2>
              <Link
                to="/shop"
                className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartLineItem key={item.id} item={item} />
                ))}
              </div>

              <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Order Summary
                </h2>
                <div className="mt-6 flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="mt-4 flex justify-between text-sm text-slate-500">
                  <span>Delivery</span>
                  <span>Calculated next</span>
                </div>
                <div className="my-5 border-t border-slate-100" />
                <div className="flex justify-between">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-black text-primary">
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <Link
                  to="/checkout"
                  className="mt-6 block rounded-xl bg-secondary px-5 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-secondary/20"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  to="/shop"
                  className="mt-3 block text-center text-sm font-semibold text-slate-500"
                >
                  Continue Shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
