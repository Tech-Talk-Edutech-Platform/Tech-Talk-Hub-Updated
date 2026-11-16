/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origin of the API server. Dev: the target Vite proxies `/api` to.
   * Production builds: the origin the browser calls directly.
   */
  readonly VITE_BACKEND_SERVER_URL?: string
}
