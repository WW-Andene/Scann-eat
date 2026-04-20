/**
 * Bundles the TS engine (scoring-engine.ts + ocr-parser.ts + off.ts) into a
 * single browser-friendly ESM file at public/engine.bundle.js.
 *
 * Also writes public/version.json with the current git commit so the running
 * app (web or APK) can self-compare against the latest GitHub Release and
 * offer an in-place update.
 */

import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

let commit = process.env.APP_COMMIT;
if (!commit) {
  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    commit = 'dev';
  }
}
const builtAt = new Date().toISOString();

await writeFile(
  'public/version.json',
  JSON.stringify({ commit, built_at: builtAt }, null, 2) + '\n',
);

await build({
  stdin: {
    contents: `
      export { parseLabel, parseIngredientsText } from './ocr-parser.ts';
      export { scoreProduct } from './scoring-engine.ts';
      export { fetchFromOFF } from './off.ts';
    `,
    resolveDir: '.',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  outfile: 'public/engine.bundle.js',
  target: 'es2022',
  platform: 'browser',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});

console.log(`[build] commit=${commit}`);

