/**
 * Grocery list aggregator.
 *
 * Given a list of recipes (each with `components: [{ product_name,
 * grams, ... }]`), sum the grams per ingredient name and emit a flat
 * shopping list. Names that case-insensitively match the same key
 * collapse into one row.
 *
 * Intentionally tiny: this isn't the place to model categories ("frais"
 * vs "épicerie"), branded products, or supermarket aisles. It's a
 * Saturday-morning utility — paste the list into a notes app.
 *
 * No IDB / persistence — the user opens the dialog, picks recipes,
 * gets the list. Ephemeral by design.
 */

function normalizeKey(name) {
  // R30.1: regex uses \u escape codes instead of literal combining
  // diacritical marks in the source. Behaviour-identical (matches
  // the Unicode Combining Diacritical Marks block U+0300..U+036F)
  // but portable across editors / transpilers that may mishandle
  // raw combining chars.
  return String(name ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Aggregate a list of recipes into a deduplicated grocery list.
 *
 *   aggregateGroceryList([
 *     { name: 'Pesto pâtes', servings: 2, components: [
 *         { product_name: 'pâtes', grams: 200 },
 *         { product_name: 'parmesan', grams: 30 },
 *     ]},
 *     { name: 'Salade caprese', servings: 1, components: [
 *         { product_name: 'tomate', grams: 250 },
 *         { product_name: 'mozzarella', grams: 125 },
 *     ]},
 *   ])
 *   →
 *   [
 *     { name: 'mozzarella', grams: 125, sources: ['Salade caprese'] },
 *     { name: 'parmesan',   grams: 30,  sources: ['Pesto pâtes'] },
 *     { name: 'pâtes',      grams: 200, sources: ['Pesto pâtes'] },
 *     { name: 'tomate',     grams: 250, sources: ['Salade caprese'] },
 *   ]
 *
 * Sorted alphabetically by ingredient name, accent-folded.
 * `grams` is the sum across recipes; `sources` lists every recipe
 * that needs it (deduped, in insertion order). Components without a
 * grams field contribute 0 — useful for "salt to taste" rows.
 */
export function aggregateGroceryList(recipes) {
  const acc = new Map(); // key → { name, grams, sources[] }
  const recipeArr = Array.isArray(recipes) ? recipes : [];
  for (const r of recipeArr) {
    if (!r || !Array.isArray(r.components)) continue;
    for (const c of r.components) {
      const rawName = String(c?.product_name ?? '').trim();
      if (!rawName) continue;
      const key = normalizeKey(rawName);
      const grams = Math.max(0, Number(c?.grams) || 0);
      let entry = acc.get(key);
      if (!entry) {
        entry = { name: rawName, grams: 0, sources: [] };
        acc.set(key, entry);
      }
      entry.grams += grams;
      const recipeName = String(r.name ?? '').trim() || '—';
      if (!entry.sources.includes(recipeName)) entry.sources.push(recipeName);
    }
  }
  // Round grams; sort by accent-folded name.
  const out = [...acc.values()].map((e) => ({
    name: e.name,
    grams: Math.round(e.grams),
    sources: e.sources,
  }));
  out.sort((a, b) => normalizeKey(a.name).localeCompare(normalizeKey(b.name)));
  return out;
}

/**
 * Format the aggregated list as a single plain-text block ready for
 * copy/paste into a notes app. Lines look like:
 *   - tomate · 250 g
 *   - parmesan · 30 g
 *
 * R34.N4: `markdown: true` emits GitHub-style task-list checkboxes
 * (`- [ ] tomate · 250 g`) so the pasted result renders as checkable
 * items in GitHub Issues, Obsidian, Bear, Notion, and most modern
 * note apps. Default behaviour unchanged for existing callers.
 */
export function formatGroceryList(items, opts = {}) {
  const prefix = opts.markdown ? '- [ ] ' : '- ';
  return items
    .map((it) => `${prefix}${it.name}${it.grams > 0 ? ` · ${it.grams} g` : ''}`)
    .join('\n');
}
