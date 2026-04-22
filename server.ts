/**
 * ============================================================================
 * Scann-eat local dev server  —  photo in, score out
 * ============================================================================
 *
 * Zero-dep HTTP server (Node 22+ native TS) that mirrors the Vercel setup
 * for local development without needing `vercel dev`:
 *   - Serves the static PWA shell from /public
 *   - Exposes POST /api/score: { imageBase64, mime? } → full ScoreAudit
 *
 * In production, /api/score is handled by api/score.ts as a Vercel Function
 * and the static files are served directly from /public by Vercel's CDN.
 *
 * Run:   GROQ_API_KEY=... node --experimental-strip-types server.ts
 * ============================================================================
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseLabel } from './ocr-parser.ts';
import { fetchFromOFF, isOFFSparse, mergeOFFWithLLM, detectSourceConflicts } from './off.ts';
import { scoreProduct } from './scoring-engine.ts';

const PORT = Number(process.env.PORT ?? 5173);
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const WEB_DIR = join(ROOT, 'public');
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
      images?: Array<{ base64: string; mime?: string }>;
      imageBase64?: string;
      mime?: string;
      barcode?: string;
    };

    const images =
      body.images && body.images.length > 0
        ? body.images.map((img) => ({ base64: img.base64, mime: img.mime ?? 'image/jpeg' }))
        : body.imageBase64
          ? [{ base64: body.imageBase64, mime: body.mime ?? 'image/jpeg' }]
          : [];

    // OFF + optional LLM hybrid path.
    if (body.barcode) {
      const off = await fetchFromOFF(body.barcode);
      if (off) {
        if (isOFFSparse(off) && images.length > 0) {
          try {
            const parsed = await parseLabel(images);
            const merged = mergeOFFWithLLM(off, parsed.product);
            const conflicts = detectSourceConflicts(off, parsed.product);
            const audit = scoreProduct(merged);
            return sendJSON(res, 200, {
              product: merged,
              audit,
              warnings: [...parsed.warnings, ...conflicts],
              source: 'merged',
              barcode: body.barcode,
            });
          } catch {
            /* LLM failed — fall back to OFF alone */
          }
        }
        const audit = scoreProduct(off);
        return sendJSON(res, 200, {
          product: off,
          audit,
          warnings: [],
          source: 'openfoodfacts',
          barcode: body.barcode,
        });
      }
    }

    if (images.length === 0) {
      return sendJSON(res, 400, { error: 'Missing images' });
    }

    const parsed = await parseLabel(images);
    const audit = scoreProduct(parsed.product);

    return sendJSON(res, 200, {
      product: parsed.product,
      audit,
      warnings: parsed.warnings,
      source: 'llm',
      barcode: parsed.barcode ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/score]', message);
    const publicMessage =
      /body too large/i.test(message) ? 'Request body too large'
      : /JSON/i.test(message) ? 'Invalid JSON body'
      : 'Scoring failed';
    return sendJSON(res, 500, { error: publicMessage });
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
    const mime = MIME[extname(full)] ?? 'application/octet-stream';
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': mime, 'Content-Length': info.size });
      res.end();
      return;
    }
    const data = await readFile(full);
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
  // GET + HEAD both map to static. HEAD lets service workers and curl probe
  // file availability without downloading the full payload.
  if (req.method === 'GET' || req.method === 'HEAD') {
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
