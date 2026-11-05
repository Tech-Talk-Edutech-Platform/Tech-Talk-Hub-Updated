import { Link } from 'react-router-dom'

import logo from '../../assets/images/logo.png'
import { FillImage } from '../ui/FillImage'

type BrandLogoProps = {
  onClick?: () => void
}

export function BrandLogo({ onClick }: BrandLogoProps) {
  return (
    <Link to="/" className="group flex items-center gap-3" onClick={onClick}>
      <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <FillImage
          src={logo}
          alt="Tech Talk Hub Logo"
          priority
          className="object-contain p-1"
        />
      </div>

      <div>
        <span className="block text-xl font-extrabold tracking-tight text-primary">
          Tech Talk Hub
        </span>

        <span className="hidden text-[10px] font-medium tracking-wide text-slate-500 sm:block">
          Think. Code. Create.
        </span>
      </div>
    </Link>
  )
}
