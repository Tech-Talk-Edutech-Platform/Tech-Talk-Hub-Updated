/**
 * Turns whatever a data request threw into words that say what actually
 * happened. A 404 from the database means "this isn't there" (usually a
 * migration that hasn't run), which is a different problem from the network
 * dropping or the person lacking access, and retrying won't fix it until
 * someone sets it up.
 */

/** An error that remembers the HTTP status and database code behind it. */
export class DataError extends Error {
  readonly status: number | null
  readonly code: string | null

  constructor(
    message: string,
    {
      status = null,
      code = null,
    }: { status?: number | null; code?: string | null } = {},
  ) {
    super(message)
    this.name = 'DataError'
    this.status = status
    this.code = code
  }
}

export type LoadErrorKind =
  'not-found' | 'access' | 'signed-out' | 'offline' | 'server' | 'other'

export type LoadErrorDescription = {
  kind: LoadErrorKind
  /** e.g. "404 Not Found"; null when no response came back. */
  statusLabel: string | null
  description: string
}

/** PostgREST / Postgres codes for "that table, view or function isn't there". */
const MISSING_CODES = new Set([
  'PGRST202', // function not in the schema cache
  'PGRST205', // table or view not in the schema cache
  '42P01', // undefined table
  '42883', // undefined function
])
/** "Not allowed": row-level security or a function's own check. */
const ACCESS_CODES = new Set(['42501'])
/** The sign-in token is missing, invalid or expired. */
const SIGNED_OUT_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303'])

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

function field(error: unknown, key: string): unknown {
  return typeof error === 'object' && error !== null && key in error
    ? Reflect.get(error, key)
    : undefined
}

/** PostgREST's wording when a table or function isn't there, for errors
 * rethrown as a plain `Error(message)` that lost their code on the way. */
const MISSING_MESSAGE =
  /could not find the (function|table)|in the schema cache|relation "?[\w.]+"? does not exist/i

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const message = field(error, 'message')
  return typeof message === 'string' ? message : ''
}

function errorStatus(error: unknown, code: string | null): number | null {
  const status = field(error, 'status')
  if (typeof status === 'number' && status > 0) return status
  if (code && MISSING_CODES.has(code)) return 404
  if (code && ACCESS_CODES.has(code)) return 403
  if (code && SIGNED_OUT_CODES.has(code)) return 401
  if (MISSING_MESSAGE.test(errorMessage(error))) return 404
  return null
}

/**
 * Whether trying the same request again could help. A 404 or a refusal
 * won't change until someone sets something up, so retrying only delays
 * the real message.
 */
export function isWorthRetrying(error: unknown): boolean {
  const { kind } = describeLoadError(error)
  return kind !== 'not-found' && kind !== 'access'
}

function statusLabel(status: number | null) {
  if (status === null) return null
  const text = STATUS_TEXT[status]
  return text ? `${status} ${text}` : `Error ${status}`
}

/** Says what went wrong with a request, for the person looking at the screen. */
export function describeLoadError(error: unknown): LoadErrorDescription {
  const rawCode = field(error, 'code')
  const code = typeof rawCode === 'string' && rawCode !== '' ? rawCode : null
  const status = errorStatus(error, code)
  const message = errorMessage(error)
  const label = statusLabel(status)

  if (status === 404) {
    return {
      kind: 'not-found',
      statusLabel: label,
      description:
        'The server answered “not found”: this feature isn’t set up on the database yet. It isn’t a problem with your connection or account. Let an admin know.',
    }
  }
  if (status === 401) {
    return {
      kind: 'signed-out',
      statusLabel: label,
      description:
        'Your sign-in has expired. Sign out and back in, then try again.',
    }
  }
  if (status === 403) {
    return {
      kind: 'access',
      statusLabel: label,
      description:
        'Your account isn’t allowed to see this. If you think it should be, ask an admin to check your role.',
    }
  }
  if (
    status === null &&
    /failed to fetch|networkerror|load failed|fetcherror|network request failed/i.test(
      message,
    )
  ) {
    return {
      kind: 'offline',
      statusLabel: null,
      description:
        'The server couldn’t be reached. Check your internet connection, then try again.',
    }
  }
  if (status !== null && status >= 500) {
    return {
      kind: 'server',
      statusLabel: label,
      description:
        'The server ran into a problem on its side. Try again in a moment.',
    }
  }
  return {
    kind: 'other',
    statusLabel: label,
    description: message
      ? `${message.replace(/\.?$/, '.')} Try again.`
      : 'Try loading this information again.',
  }
}
