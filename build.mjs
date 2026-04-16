/**
 * Bundles the TS engine (scoring-engine.ts + ocr-parser.ts) into a single
 * browser-friendly ESM file at public/engine.bundle.js.
 *
 * Used by the standalone APK build and by `vercel dev` / `npm run dev` for
 * client-side direct-mode Groq calls (when the user provides their own key).
 */

import { build } from 'esbuild';

await build({
  stdin: {
    contents: `
      export { parseLabel, parseIngredientsText } from './ocr-parser.ts';
      export { scoreProduct } from './scoring-engine.ts';
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
