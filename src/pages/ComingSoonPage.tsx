import { Link } from 'react-router-dom'

import { Footer } from '../components/layout/Footer'
import { NavBar } from '../components/layout/NavBar'

type ComingSoonPageProps = {
  title: string
}

/** Stand-in for public site pages that haven't been migrated from the old site yet. */
export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <NavBar />

      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-40 text-center">
        <p className="rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          Coming soon
        </p>

        <h1 className="mt-5 text-4xl font-black text-slate-900 sm:text-5xl">
          {title}
        </h1>

        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          This page is on its way. Meanwhile, you can book a free trial class or
          explore our programs on the homepage.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/book"
            className="rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/20"
          >
            Book a Free Trial
          </Link>

          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
