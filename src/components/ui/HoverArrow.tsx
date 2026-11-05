import { ArrowRight } from 'lucide-react'

/** Arrow that nudges right when its `group` parent is hovered. */
export function HoverArrow() {
  return (
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
  )
}
