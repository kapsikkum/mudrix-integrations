// Local test servers for examples/dev-repo.json. Plain node, no dependencies.
//
//   node examples/dev-server.mjs
//
//   8787  mock API: POST /v1/push logs the JSON body and answers {"ok":true} (CORS: any origin)
//   8788  serves examples/hello-widget/ (frameable from anywhere)
//   8789  serves examples/dev-repo.json as /repo.json (CORS: any origin)
//
// DEV ONLY: everything here allows any origin. Never expose these ports.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const widgetDir = join(here, 'hello-widget');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '600',
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const api = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'OPTIONS') return send(res, 204, cors);
  if (req.method === 'POST' && url.pathname === '/v1/push') {
    try {
      const text = await readBody(req);
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return send(res, 400, { ...cors, 'Content-Type': 'application/json' }, '{"ok":false}');
      }
      console.log('[api] POST /v1/push', JSON.stringify(json));
      return send(res, 200, { ...cors, 'Content-Type': 'application/json' }, '{"ok":true}');
    } catch {
      return send(res, 413, cors, '');
    }
  }
  return send(res, 404, { ...cors, 'Content-Type': 'application/json' }, '{"ok":false}');
});

const widget = createServer(async (req, res) => {
  const headers = { 'Content-Security-Policy': 'frame-ancestors *', 'Cache-Control': 'no-store' };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, headers, '');
  const url = new URL(req.url ?? '/', 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(widgetDir, rel));
  if (file !== widgetDir && !file.startsWith(widgetDir + sep)) return send(res, 403, headers, '');
  try {
    const data = await readFile(file);
    const ext = file.slice(file.lastIndexOf('.'));
    return send(res, 200, { ...headers, 'Content-Type': TYPES[ext] ?? 'application/octet-stream' }, req.method === 'HEAD' ? '' : data);
  } catch {
    return send(res, 404, headers, 'not found');
  }
});

const repo = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, cors);
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/repo.json') return send(res, 404, cors, 'not found');
  try {
    const data = await readFile(join(here, 'dev-repo.json'));
    return send(res, 200, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, data);
  } catch {
    return send(res, 500, cors, 'dev-repo.json missing');
  }
});

for (const [name, server, port] of [
  ['mock api', api, 8787],
  ['hello widget', widget, 8788],
  ['dev repo', repo, 8789],
]) {
  server.on('error', (e) => {
    console.error(`${name}: could not listen on ${port}: ${e.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`${name}: http://localhost:${port}/`));
}
