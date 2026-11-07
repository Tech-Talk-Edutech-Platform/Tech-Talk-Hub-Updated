import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'

import type { ShopProduct } from '../../types/shop'

type ProductGalleryProps = {
  product: ShopProduct
}

/** Main product image with thumbnails for the gallery images. */
export function ProductGallery({ product }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(
    product.image_url || product.gallery_urls?.[0] || '',
  )

  const gallery = [product.image_url, ...(product.gallery_urls ?? [])].filter(
    (image, index, images): image is string =>
      Boolean(image) && images.indexOf(image) === index,
  )

  return (
    <div className="border-b border-slate-100 p-5 sm:p-7 lg:border-r lg:border-b-0">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50">
        {product.badge && (
          <span className="absolute top-4 left-4 z-10 rounded-full bg-[#ff4b7c] px-3 py-1.5 text-[9px] font-black tracking-wide text-white uppercase">
            {product.badge}
          </span>
        )}

        {selectedImage ? (
          <img
            src={selectedImage}
            alt={product.name}
            fetchPriority="high"
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900">
            <ShoppingCart className="h-20 w-20 text-purple-300" />
          </div>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {gallery.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedImage(image)}
              aria-label={`View product image ${index + 1}`}
              aria-pressed={selectedImage === image}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 ${
                selectedImage === image
                  ? 'border-primary'
                  : 'border-transparent'
              }`}
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
