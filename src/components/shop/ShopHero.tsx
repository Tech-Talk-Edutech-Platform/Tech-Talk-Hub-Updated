import { ArrowRight, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SHOP_HERO_POINTS } from '../../data/shop'

type ShopHeroProps = {
  onShopProducts: () => void
}

export function ShopHero({ onShopProducts }: ShopHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#f0eef8] bg-white pt-[76px]">
      <div className="absolute inset-0 bg-[linear-gradient(110deg,#ffffff_0%,#fcfaff_48%,#f4edff_100%)]" />

      <svg
        viewBox="0 0 1440 420"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M0 350 C220 240 350 290 560 260 C800 220 920 110 1120 135 C1270 150 1350 215 1440 235 L1440 420 L0 420Z"
          fill="#9272ee"
          opacity="0.035"
        />
        <path
          d="M580 420 C760 270 880 235 1040 240 C1190 245 1310 165 1440 120 L1440 420Z"
          fill="#b59cf8"
          opacity="0.08"
        />
      </svg>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-5 py-10 sm:px-6 md:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:py-14">
        <div className="max-w-[610px]">
          <span className="inline-flex rounded-full bg-[#eee8ff] px-3 py-1.5 text-[9px] font-extrabold tracking-[0.1em] text-[#5b3ae2] uppercase">
            Premium Shop
          </span>

          <h1 className="mt-4 text-[38px] leading-[1.07] font-black tracking-[-0.03em] text-[#101936] sm:text-[46px] lg:text-[50px] xl:text-[54px]">
            Premium Learning Products
            <br className="hidden sm:block" /> for{' '}
            <span className="bg-gradient-to-r from-[#9176f5] via-[#b75ee8] to-[#ff4c83] bg-clip-text text-transparent">
              Young Creators.
            </span>
          </h1>

          <p className="mt-5 max-w-[540px] text-[14px] leading-7 text-[#586581] sm:text-[15px]">
            Coding books, learning resources, kits and creative tools designed
            for young creators.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] font-semibold text-[#34415e]">
            {SHOP_HERO_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon size={14} className="text-[#5634e4]" />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onShopProducts}
              className="inline-flex h-12 items-center gap-3 rounded-xl bg-gradient-to-r from-[#6033e7] to-[#5931e0] px-7 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(91,52,223,0.22)] transition hover:-translate-y-0.5"
            >
              Shop Products
              <ArrowRight size={16} />
            </button>
            <Link
              to="/favorites"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#e4e4ee] bg-white px-7 text-[13px] font-bold text-[#313b58] shadow-sm transition hover:border-purple-200 hover:bg-purple-50"
            >
              <Heart size={16} />
              My Favorites
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute h-[75%] w-[75%] rounded-full bg-purple-300/10 blur-[80px]" />
          <img
            src="/shop/premium-shop-hero.png"
            alt="Tech Talk Hub premium shop"
            width={620}
            height={370}
            fetchPriority="high"
            className="relative h-auto w-full max-w-[620px] object-contain"
          />
        </div>
      </div>
    </section>
  )
}
