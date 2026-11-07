/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the API server when it isn't served from the site's own origin. */
  readonly VITE_API_BASE_URL?: string
}
