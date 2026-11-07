import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, Loader2, LockKeyhole, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { NavBar } from '../components/layout/NavBar'
import {
  CHECKOUT_INPUT_CLASS,
  CheckoutField,
} from '../components/shop/CheckoutField'
import { CheckoutSummary } from '../components/shop/CheckoutSummary'
import { staticPageMeta } from '../data/seo'
import { useCart } from '../hooks/useCart'
import { usePageMeta } from '../hooks/usePageMeta'
import { createShopOrder } from '../lib/api/orders'
import { getErrorMessage } from '../lib/getErrorMessage'
import type { CheckoutDetails } from '../types/checkout'

const EMPTY_DETAILS: CheckoutDetails = {
  fullName: '',
  phone: '',
  email: '',
  county: '',
  town: '',
  address: '',
  notes: '',
}

export function CheckoutPage() {
  usePageMeta(staticPageMeta('/checkout'))
  const { items, subtotal } = useCart()
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const createOrder = useMutation({
    mutationFn: createShopOrder,
    onSuccess: (order) => {
      // Payments aren't wired up yet (they weren't on the old site either).
      window.alert(
        `Order ${order.order_number} created successfully. Payment integration comes next.`,
      )
    },
    onError: (error) => console.error('Checkout error:', error),
  })

  function update(field: keyof CheckoutDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!createOrder.isPending) {
      createOrder.mutate({ details, items, subtotal })
    }
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="flex min-h-screen flex-col items-center justify-center px-5 pt-[76px] text-center">
          <ShoppingBag size={42} className="text-slate-300" />
          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Your cart is empty
          </h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Add something from the Tech Talk Hub shop before continuing to
            checkout.
          </p>
          <Link
            to="/shop"
            className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
          >
            Return to Shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <NavBar />

      <section className="pt-[105px]">
        <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-6">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ChevronLeft size={15} />
            Back to Cart
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"
            >
              <div>
                <p className="text-xs font-bold tracking-[0.15em] text-secondary uppercase">
                  Checkout
                </p>
                <h1 className="mt-2 text-3xl font-black text-slate-900">
                  Delivery Details
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Enter the details we need to process and deliver your order.
                </p>
              </div>

              {createOrder.isError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {getErrorMessage(
                    createOrder.error,
                    'We could not create your order. Please try again.',
                  )}
                </div>
              )}

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <CheckoutField label="Full Name">
                  <input
                    required
                    autoComplete="name"
                    value={details.fullName}
                    onChange={(event) => update('fullName', event.target.value)}
                    className={CHECKOUT_INPUT_CLASS}
                    placeholder="Your full name"
                  />
                </CheckoutField>
                <CheckoutField label="Phone Number">
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={details.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    className={CHECKOUT_INPUT_CLASS}
                    placeholder="07XX XXX XXX"
                  />
                </CheckoutField>
                <CheckoutField label="Email">
                  <input
                    type="email"
                    autoComplete="email"
                    value={details.email}
                    onChange={(event) => update('email', event.target.value)}
                    className={CHECKOUT_INPUT_CLASS}
                    placeholder="you@example.com"
                  />
                </CheckoutField>
                <CheckoutField label="County">
                  <input
                    required
                    value={details.county}
                    onChange={(event) => update('county', event.target.value)}
                    className={CHECKOUT_INPUT_CLASS}
                    placeholder="e.g. Nairobi"
                  />
                </CheckoutField>
                <CheckoutField label="Town / Area">
                  <input
                    required
                    value={details.town}
                    onChange={(event) => update('town', event.target.value)}
                    className={CHECKOUT_INPUT_CLASS}
                    placeholder="e.g. Westlands"
                  />
                </CheckoutField>
                <CheckoutField label="Delivery Address">
                  <input
                    required
                    autoComplete="street-address"
                    value={details.address}
                    onChange={(event) => update('address', event.target.value)}
                    className={CHECKOUT_INPUT_CLASS}
                    placeholder="Building, road or landmark"
                  />
                </CheckoutField>
              </div>

              <div className="mt-5">
                <CheckoutField label="Order Notes">
                  <textarea
                    rows={4}
                    value={details.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    placeholder="Optional delivery instructions..."
                    className={`${CHECKOUT_INPUT_CLASS} resize-none`}
                  />
                </CheckoutField>
              </div>

              <button
                type="submit"
                disabled={createOrder.isPending}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-4 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <LockKeyhole size={17} />
                    Continue to Payment
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] text-slate-400">
                Your order will be created securely before payment.
              </p>
            </form>

            <CheckoutSummary />
          </div>
        </div>
      </section>
    </main>
  )
}
