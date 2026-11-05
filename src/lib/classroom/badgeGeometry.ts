// Shared geometry for the hexagon badge medals (viewBox 0 10 96 68).

export const BADGE_CX = 48
export const BADGE_CY = 44

/** SVG `points` for a hexagon of radius `r`, point up, centred on the medal. */
export function hexPoints(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180
    return `${(BADGE_CX + r * Math.cos(a)).toFixed(2)},${(BADGE_CY + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}
