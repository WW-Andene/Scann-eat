/**
 * Vercel Function: POST /api/score
 * Body: { imageBase64: string, mime?: string }
 * Response: { product, audit, warnings }
 *
 * GROQ_API_KEY must be set in Vercel project env vars.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { parseLabel } from '../ocr-parser.ts';
import { fetchFromOFF, isOFFSparse, mergeOFFWithLLM, detectSourceConflicts } from '../off.ts';
import { scoreProduct } from '../scoring-engine.ts';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Pro plan only; Hobby silently caps at 10s
};

const MAX_BODY_BYTES = 12 * 1024 * 1024;

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

function sendJSON(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

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
            // LLM failed — fall back to OFF alone.
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
    return sendJSON(res, 500, { error: message });
  }
}
