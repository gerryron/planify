import { createServer } from 'node:http';

const PORT = Number(process.env.SWAGGER_PORT || 3010);
const PLANIFY_API_ORIGIN =
  process.env.PLANIFY_API_ORIGIN || 'http://localhost:3000';
const SPEC_SOURCE_URL = `${PLANIFY_API_ORIGIN}/api/swagger`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #ffffff; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout'
      });
    </script>
  </body>
</html>`;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Invalid request url' });
    return;
  }

  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
    return;
  }

  if (req.url.startsWith('/openapi.json')) {
    try {
      const response = await fetch(SPEC_SOURCE_URL, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const text = await response.text();
        sendJson(res, 502, {
          error: 'Failed to fetch OpenAPI spec from Planify API',
          status: response.status,
          detail: text.slice(0, 500),
          source: SPEC_SOURCE_URL,
        });
        return;
      }

      const json = await response.json();
      sendJson(res, 200, json);
      return;
    } catch (error) {
      sendJson(res, 502, {
        error: 'Swagger server cannot reach Planify API',
        source: SPEC_SOURCE_URL,
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
  }

  if (req.url.startsWith('/health')) {
    sendJson(res, 200, {
      ok: true,
      service: 'swagger-standalone',
      specSource: SPEC_SOURCE_URL,
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  process.stdout.write(
    `Swagger standalone running on http://localhost:${PORT}\nOpenAPI proxy: http://localhost:${PORT}/openapi.json\nSource API: ${SPEC_SOURCE_URL}\n`,
  );
});
