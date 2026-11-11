import logo from '../../../assets/images/logo.png'

type BrandMarkProps = {
  size?: number
  /** Corner radius in px; defaults to the site logo tile's rounding. */
  radius?: number
  className?: string
}

/**
 * The site's logo on a white tile, the same treatment as the navbar's
 * BrandLogo, so the classroom carries the website's mark.
 */
export function BrandMark({
  size = 32,
  radius,
  className = '',
}: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-line ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? Math.round(size * 0.27),
      }}
    >
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        className="size-full object-contain p-[8%]"
        draggable={false}
      />
    </span>
  )
}
