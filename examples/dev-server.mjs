// Local test servers for examples/dev-repo.json. Plain node, no dependencies.
//
//   node examples/dev-server.mjs [repository file]      (npm run dev, or npm run dev -- repo.json)
//
//   8787  mock API: POST /v1/push logs the JSON body and answers {"ok":true}, and
//         GET /v1/details/<owner>/<name> answers a small JSON object for link details (CORS: any origin)
//   8788  serves examples/hello-widget/ at / and examples/file-share/ at /file-share/ (frameable from anywhere)
//   8789  serves the repository file (default examples/dev-repo.json) as /repo.json plus /repo.json.sig
//         (CORS: any origin). It is read again on every request, so an edit shows on the next Refresh.
//         Mudrix refuses unsigned repositories, so the server sets "key" and "serial" and signs the
//         exact bytes it serves with a throwaway key kept in examples/.dev-key.pem (git-ignored,
//         created on first run, so the key is the same between runs). Pass your own repo.json to try
//         it in a Mudrix development build before you sign and publish it.
//
// DEV ONLY: everything here allows any origin. Never expose these ports.
import { createServer } from 'node:http';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const widgetDir = join(here, 'hello-widget');
const fileShareDir = join(here, 'file-share');
const repoFile = process.argv[2] ? resolve(process.argv[2]) : join(here, 'dev-repo.json');

// Throwaway signing key for the dev repository; never use it for anything real.
const devKeyFile = join(here, '.dev-key.pem');
if (!existsSync(devKeyFile)) {
  const pem = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' });
  writeFileSync(devKeyFile, pem, { mode: 0o600 });
}
const devPrivateKey = createPrivateKey(readFileSync(devKeyFile, 'utf8'));
const devPublicKey = Buffer.from(createPublicKey(devPrivateKey).export({ format: 'jwk' }).x, 'base64url').toString('base64');

/** The exact bytes served as /repo.json (the file with the dev key and serial) and their signature. */
async function signedDevRepo() {
  // A real repo.json carries its own key and serial: replace them with the dev ones.
  const { schema, name, key: _key, serial: _serial, ...rest } = JSON.parse(await readFile(repoFile, 'utf8'));
  const bytes = Buffer.from(JSON.stringify({ schema, name, key: devPublicKey, serial: 1, ...rest }, null, 2) + '\n');
  return { bytes, sig: Buffer.from(sign(null, bytes, devPrivateKey).toString('base64') + '\n') };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
  'Access-Control-Max-Age': '600',
};
// Fixed for the life of the server, so a link's answer (and its ETag) stays the same.
const startedAt = new Date().toISOString();

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
  // Link details: a stand-in for an API such as api.github.com/repos/<owner>/<name>.
  const details = /^\/v1\/details\/([^/]+)\/([^/]+)$/.exec(url.pathname);
  if (req.method === 'GET' && details) {
    let owner;
    let name;
    try {
      [owner, name] = details.slice(1).map((p) => decodeURIComponent(p));
    } catch {
      return send(res, 400, cors, '');
    }
    console.log('[api] GET', url.pathname);
    if (name === 'missing') return send(res, 404, { ...cors, 'Content-Type': 'application/json' }, '{"message":"Not Found"}');
    const body = {
      full_name: `${owner}/${name}`,
      description: `A sample project called ${name}, answered by the local dev server.`,
      stargazers_count: 12345,
      language: 'TypeScript',
      owner: { login: owner },
      pushed_at: startedAt,
    };
    const text = JSON.stringify(body);
    // Like api.github.com: an ETag, and 304 Not Modified when Mudrix asks "has it changed?".
    const etag = `"${createHash('sha1').update(text).digest('hex').slice(0, 16)}"`;
    if (req.headers['if-none-match'] === etag) {
      console.log('[api]   304 Not Modified');
      return send(res, 304, { ...cors, ETag: etag }, '');
    }
    return send(res, 200, { ...cors, 'Content-Type': 'application/json', ETag: etag }, text);
  }
  return send(res, 404, { ...cors, 'Content-Type': 'application/json' }, '{"ok":false}');
});

const widget = createServer(async (req, res) => {
  const headers = { 'Content-Security-Policy': 'frame-ancestors *', 'Cache-Control': 'no-store' };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, headers, '');
  const url = new URL(req.url ?? '/', 'http://localhost');
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, headers, '');
  }
  let root = widgetDir;
  if (rel.startsWith('/file-share/')) {
    root = fileShareDir;
    rel = rel.slice('/file-share'.length);
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(root, rel));
  if (file !== root && !file.startsWith(root + sep)) return send(res, 403, headers, '');
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
  if (url.pathname !== '/repo.json' && url.pathname !== '/repo.json.sig') return send(res, 404, cors, 'not found');
  try {
    const { bytes, sig } = await signedDevRepo();
    const isSig = url.pathname.endsWith('.sig');
    const type = isSig ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8';
    return send(res, 200, { ...cors, 'Content-Type': type, 'Cache-Control': 'no-store' }, isSig ? sig : bytes);
  } catch {
    return send(res, 500, cors, `${repoFile} is missing or not valid JSON`);
  }
});

for (const [name, server, port] of [
  ['mock api', api, 8787],
  ['widgets', widget, 8788],
  ['dev repo', repo, 8789],
]) {
  server.on('error', (e) => {
    console.error(`${name}: could not listen on ${port}: ${e.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`${name}: http://localhost:${port}/`));
}
console.log(`Serving ${repoFile}: in a Mudrix development build, add http://localhost:8789/repo.json`);
