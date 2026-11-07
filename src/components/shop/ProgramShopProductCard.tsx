import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatMoney } from '../../lib/money'
import { productHref } from '../../lib/shop'
import type { ShopProduct } from '../../types/shop'
import { FillImage } from '../ui/FillImage'

type ProgramShopProductCardProps = {
  product: ShopProduct
}

export function ProgramShopProductCard({
  product,
}: ProgramShopProductCardProps) {
  return (
    <Link
      to={productHref(product.slug)}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-purple-50">
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-secondary px-3 py-1 text-[9px] font-bold text-white uppercase">
            {product.badge}
          </span>
        )}

        {product.image_url ? (
          <FillImage
            src={product.image_url}
            alt={product.name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
            <BookOpen size={48} className="text-primary/40" />
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="text-[10px] font-bold tracking-wider text-secondary uppercase">
          {product.category}
        </p>
        <h3 className="mt-2 line-clamp-2 text-base font-bold text-slate-900 group-hover:text-primary">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
            {product.short_description}
          </p>
        )}

        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <span className="text-lg font-black text-primary">
              {formatMoney(product.price, product.currency)}
            </span>
            {product.compare_at_price && (
              <span className="ml-2 text-xs text-slate-400 line-through">
                {formatMoney(product.compare_at_price, product.currency)}
              </span>
            )}
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-primary transition group-hover:bg-primary group-hover:text-white">
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  )
}
