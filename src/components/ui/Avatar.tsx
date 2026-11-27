import { useState } from 'react'

import type { AppRole } from '../../types/roles'
import { Initials } from './Initials'

type AvatarProps = {
  name: string
  /** `users.avatar_url`; initials show when it's empty or fails to load. */
  src?: string | null
  userRole?: AppRole | null
  size?: number
  className?: string
}

/**
 * A person's picture: their uploaded photo, or their initials on a colour for
 * their role. Use it anywhere a person is shown so everyone looks the same
 * everywhere.
 */
export function Avatar({
  name,
  src,
  userRole,
  size = 32,
  className = '',
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const photo = src?.trim() && src !== failedSrc ? src : null
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailedSrc(photo)}
          className="size-full object-cover"
        />
      ) : (
        <Initials name={name} size={size} userRole={userRole} />
      )}
    </span>
  )
}
