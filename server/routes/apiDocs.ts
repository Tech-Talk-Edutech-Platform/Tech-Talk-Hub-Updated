import express, { type Response } from 'express'
import { openApiDocument } from '../docs/openapi'

/**
 * GET /docs: interactive API docs (Swagger UI) for docs/openapi.ts.
 * GET /docs/openapi.json: the raw OpenAPI document.
 *
 * Mounted at /docs and /api/docs, because the main site only forwards /api/*
 * to this server. The page loads the spec next to wherever it's served.
 */
const router = express.Router()

const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14'

const docsPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="robots" content="noindex">
<title>API Docs · Tech Talk Hub</title>
<link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css">
<style>
  body { margin: 0; background: #fff; }
  .bar {
    display: flex; align-items: center; gap: 12px; padding: 12px 20px;
    border-bottom: 1px solid #e3e6ef; font: 600 15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .bar a { color: #3f51b5; text-decoration: none; }
  .bar a:hover { text-decoration: underline; }
  .bar span { color: #5d6579; font-weight: 400; }
  .swagger-ui .info { margin: 32px 0 24px; }
  .swagger-ui .scheme-container { box-shadow: none; border-bottom: 1px solid #e3e6ef; }
</style>
</head>
<body>
<nav class="bar"><a href="/">Tech Talk Hub API</a><span>/ Documentation</span></nav>
<div id="swagger-ui"></div>
<script src="${SWAGGER_UI}/swagger-ui-bundle.js" crossorigin="anonymous"></script>
<script>
  window.ui = SwaggerUIBundle({
    url: location.pathname.replace(/\\/+$/, '') + '/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 0,
  })
</script>
</body>
</html>`

router.get('/', (_req, res: Response) => {
  res.type('html').send(docsPage)
})

router.get('/openapi.json', (_req, res: Response) => {
  res.json(openApiDocument)
})

export default router
