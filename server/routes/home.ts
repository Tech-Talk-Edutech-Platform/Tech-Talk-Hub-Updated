import express, { type Response } from 'express'
import { apiOperations, FAVICON_LINK, openApiDocument } from '../docs/openapi'

/**
 * GET /: a small status page for people who open the API's URL in a browser.
 * It shows that the server is up, which deploy is live, and links to /docs.
 */
const router = express.Router()

const WEBSITE_URL = process.env.APP_BASE_URL || 'https://techtalk-hub.com'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const VERCEL_ENVIRONMENTS: Record<string, string> = {
  production: 'Production',
  preview: 'Preview',
  development: 'Development',
}

function environmentLabel(): string {
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv && VERCEL_ENVIRONMENTS[vercelEnv]) {
    return VERCEL_ENVIRONMENTS[vercelEnv]
  }
  return process.env.VERCEL ? 'Vercel' : 'Local'
}

function serverTime(): string {
  const time = new Date().toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `${time} EAT`
}

/** Endpoints grouped by tag, then by path, so GET and POST share a row. */
function endpointSections(): string {
  const operations = apiOperations()

  return openApiDocument.tags
    .map((tag) => {
      const paths = new Map<string, typeof operations>()
      for (const entry of operations) {
        if (entry.operation.tags[0] !== tag.name) continue
        paths.set(entry.path, [...(paths.get(entry.path) ?? []), entry])
      }
      if (paths.size === 0) return ''

      const rows = [...paths]
        .map(([path, entries]) => {
          const first = entries[0].operation
          const methods = entries
            .map(
              ({ method }) =>
                `<span class="method method-${method}">${method.toUpperCase()}</span>`,
            )
            .join('')
          const link = `/docs#/${encodeURIComponent(tag.name)}/${encodeURIComponent(first.operationId)}`
          return `<li><a class="endpoint" href="${escapeHtml(link)}">
            <span class="methods">${methods}</span>
            <code class="path">${escapeHtml(path)}</code>
            <span class="summary">${escapeHtml(first.summary)}</span>
          </a></li>`
        })
        .join('')

      return `<section>
        <h2>${escapeHtml(tag.name)}</h2>
        <ul class="endpoints">${rows}</ul>
      </section>`
    })
    .join('')
}

function renderHome(): string {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  const facts = [
    `<div><dt>Environment</dt><dd>${escapeHtml(environmentLabel())}</dd></div>`,
    commit
      ? `<div><dt>Commit</dt><dd><code>${escapeHtml(commit)}</code></dd></div>`
      : '',
    `<div><dt>API version</dt><dd>${escapeHtml(openApiDocument.info.version)}</dd></div>`,
    `<div><dt>Server time</dt><dd>${escapeHtml(serverTime())}</dd></div>`,
  ].join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Tech Talk Hub API</title>
${FAVICON_LINK}
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7fb;
    --card: #ffffff;
    --border: #e3e6ef;
    --text: #141a2b;
    --muted: #5d6579;
    --brand: #3f51b5;
    --brand-strong: #303f9f;
    --brand-soft: #eef0fa;
    --ok: #15803d;
    --ok-soft: #e7f6ec;
    --get: #0f766e;
    --get-soft: #e3f4f1;
    --hover: #f3f5fb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0c0f17;
      --card: #141925;
      --border: #252c3d;
      --text: #e8eaf2;
      --muted: #9aa2b6;
      --brand: #8c9bff;
      --brand-strong: #aab5ff;
      --brand-soft: #1e2440;
      --ok: #4ade80;
      --ok-soft: #12291c;
      --get: #5eead4;
      --get-soft: #0f2a28;
      --hover: #1a2030;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 760px; margin: 0 auto; padding: 56px 16px 48px; }
  header { display: flex; align-items: center; gap: 14px; }
  .mark {
    width: 44px; height: 44px; border-radius: 12px; flex: none;
    display: grid; place-items: center;
    background: var(--brand); color: #fff; font-weight: 700; letter-spacing: -0.02em;
  }
  h1 { margin: 0; font-size: 22px; letter-spacing: -0.01em; }
  .status {
    display: inline-flex; align-items: center; gap: 6px; margin-top: 2px;
    color: var(--ok); font-size: 13px; font-weight: 600;
  }
  .status::before {
    content: ""; width: 8px; height: 8px; border-radius: 50%;
    background: currentColor; box-shadow: 0 0 0 3px var(--ok-soft);
  }
  .card {
    margin-top: 28px; background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; padding: 20px;
  }
  dl {
    margin: 0; display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
  dt { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  dd { margin: 2px 0 0; font-weight: 600; }
  code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 0.92em; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
  .button {
    display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px;
    border-radius: 10px; border: 1px solid var(--border); background: var(--card);
    color: var(--text); font-weight: 600; text-decoration: none;
  }
  .button:hover { background: var(--hover); }
  .button.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
  .button.primary:hover { background: var(--brand-strong); border-color: var(--brand-strong); }
  @media (prefers-color-scheme: dark) {
    .button.primary, .button.primary:hover { color: #0c0f17; }
  }
  .button:focus-visible, .endpoint:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  section { margin-top: 32px; }
  h2 {
    margin: 0 0 8px; color: var(--muted); font-size: 12px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .endpoints {
    list-style: none; margin: 0; padding: 0; background: var(--card);
    border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
  }
  .endpoints li + li { border-top: 1px solid var(--border); }
  .endpoint {
    display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 2px 12px;
    align-items: center; padding: 12px 16px; color: inherit; text-decoration: none;
  }
  .endpoint:hover { background: var(--hover); }
  .methods { display: flex; gap: 4px; grid-row: span 2; align-self: start; padding-top: 1px; }
  .method {
    font: 700 11px/1 ui-monospace, Menlo, Consolas, monospace; padding: 4px 6px;
    border-radius: 6px; background: var(--brand-soft); color: var(--brand);
  }
  .method-get { background: var(--get-soft); color: var(--get); }
  .path { font-weight: 600; overflow-wrap: anywhere; }
  .summary { color: var(--muted); font-size: 14px; }
  footer { margin-top: 40px; color: var(--muted); font-size: 13px; }
  footer a { color: inherit; }
</style>
</head>
<body>
<main>
  <header>
    <div class="mark" aria-hidden="true">TT</div>
    <div>
      <h1>Tech Talk Hub API</h1>
      <div class="status">Online</div>
    </div>
  </header>

  <div class="card">
    <dl>${facts}</dl>
    <div class="actions">
      <a class="button primary" href="/docs">API documentation</a>
      <a class="button" href="/docs/openapi.json">OpenAPI JSON</a>
      <a class="button" href="${escapeHtml(WEBSITE_URL)}">Website</a>
    </div>
  </div>

  ${endpointSections()}

  <footer>Requests and responses are JSON. Open an endpoint to see its fields, errors and rate limits.</footer>
</main>
</body>
</html>`
}

router.get('/', (_req, res: Response) => {
  res.set('Cache-Control', 'no-store').type('html').send(renderHome())
})

export default router
