/** A unique id. `crypto.randomUUID` only exists on secure origins (https, localhost). */
export function uid() {
  return 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
