type BrandMarkProps = {
  size?: number
  radius?: number
  className?: string
}

/**
 * Original Tech Talk Hub mark: a code bracket pair around a dot, on the brand
 * tile. Replace this component to rebrand the classroom.
 */
export function BrandMark({
  size = 32,
  radius = 4,
  className = '',
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx={radius} fill="var(--color-brand)" />
      <path
        d="M12 10.5 6.5 16l5.5 5.5M20 10.5l5.5 5.5-5.5 5.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2.4" fill="#fff" />
    </svg>
  )
}
