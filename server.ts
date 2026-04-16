/**
 * ============================================================================
 * Scann-eat dev server  —  photo in, score out
 * ============================================================================
 *
 * Zero-dep HTTP server (Node 22+ native TS) that:
 *   - Serves the static PWA shell from /web
 *   - Exposes POST /api/score: { imageBase64, mime? } → full ScoreAudit
 *
 * Keeps the Groq API key on the server. The browser never sees it.
 *
 * Run:   GROQ_API_KEY=... node --experimental-strip-types server.ts
 * ============================================================================
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseLabel } from './ocr-parser.ts';
import { scoreProduct } from './scoring-engine.ts';

const PORT = Number(process.env.PORT ?? 5173);
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const WEB_DIR = join(ROOT, 'web');
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJSON(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error(`Body too large (>${MAX_BODY_BYTES} bytes)`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handleScore(req: IncomingMessage, res: ServerResponse) {
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw.toString('utf8')) as {
      imageBase64?: string;
      mime?: string;
    };
    if (!body.imageBase64) {
      return sendJSON(res, 400, { error: 'Missing imageBase64' });
    }

    const { product, warnings } = await parseLabel({
      base64: body.imageBase64,
      mime: body.mime ?? 'image/jpeg',
    });
    const audit = scoreProduct(product);

    return sendJSON(res, 200, { product, audit, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/score]', message);
    return sendJSON(res, 500, { error: message });
  }
}

async function handleStatic(req: IncomingMessage, res: ServerResponse) {
  const urlPath = new URL(req.url ?? '/', 'http://x').pathname;
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const full = normalize(join(WEB_DIR, rel));
  if (!full.startsWith(WEB_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const info = await stat(full);
    if (!info.isFile()) throw new Error('not a file');
    const data = await readFile(full);
    const mime = MIME[extname(full)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/score') {
    return handleScore(req, res);
  }
  if (req.method === 'GET') {
    return handleStatic(req, res);
  }
  res.writeHead(405).end('Method not allowed');
});

server.listen(PORT, () => {
  if (!process.env.GROQ_API_KEY) {
    console.warn('[server] GROQ_API_KEY is not set — /api/score will fail.');
  }
  console.log(`[server] Scann-eat dev server ready at http://localhost:${PORT}`);
});
