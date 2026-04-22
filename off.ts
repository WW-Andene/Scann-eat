/**
 * ============================================================================
 * Open Food Facts adapter  —  barcode → ProductInput
 * ============================================================================
 *
 * Hits the public OFF API to avoid an LLM call on products that are already
 * in the database (~70% of French supermarket SKUs). Falls back to null when
 * the product isn't found, the nutrition is empty, or the network fails, so
 * the caller can cleanly retry with the vision pipeline.
 *
 * Zero dependencies. Safe to call from both server (Node fetch) and browser.
 * ============================================================================
 */

import { parseIngredientsText } from './ocr-parser.ts';
import { scoreProduct, type ScoreAudit } from './scoring-engine.ts';
import type {
  Ingredient,
  NovaClass,
  NutritionPer100g,
  ProductCategory,
  ProductInput,
} from './scoring-engine.ts';

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'scann-eat/0.1 (https://github.com/WW-Andene/Scann-eat)';

export interface OFFLookupOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

type OFFResponse = {
  status?: number;
  product?: Record<string, unknown>;
};

/**
 * Fetch a product from Open Food Facts by barcode. Returns a fully-built
 * ProductInput ready to score, or null if OFF doesn't have it or the record
 * is too sparse to be useful.
 */
export async function fetchFromOFF(
  barcode: string,
  opts: OFFLookupOptions = {},
): Promise<ProductInput | null> {
  const digits = barcode.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;

  const url = `${OFF_ENDPOINT}/${encodeURIComponent(digits)}.json?fields=${FIELDS.join(',')}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000);
  const signal = opts.signal
    ? anySignal([opts.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as OFFResponse;
    if (json.status !== 1 || !json.product) return null;
    return mapOFFProduct(json.product);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const FIELDS = [
  'product_name',
  'product_name_fr',
  'generic_name_fr',
  'brands',
  'categories_tags',
  'ingredients_text_fr',
  'ingredients_text',
  'nova_group',
  'nutriments',
  'labels_tags',
  'origins',
  'countries_tags',
  'quantity',
];

// ---------- Mapping ----------

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function numNullable(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = num(v);
  return Number.isFinite(n) ? n : null;
}

function nutritionFromOFF(n: Record<string, unknown> | undefined): NutritionPer100g {
  const nut = n ?? {};
  return {
    energy_kcal: num(nut['energy-kcal_100g'] ?? nut['energy_100g']),
    fat_g: num(nut['fat_100g']),
    saturated_fat_g: num(nut['saturated-fat_100g']),
    carbs_g: num(nut['carbohydrates_100g']),
    sugars_g: num(nut['sugars_100g']),
    added_sugars_g: numNullable(nut['added-sugars_100g']),
    fiber_g: num(nut['fiber_100g']),
    protein_g: num(nut['proteins_100g']),
    salt_g: num(nut['salt_100g']),
    trans_fat_g: numNullable(nut['trans-fat_100g']),
  };
}

const VITAMIN_KEY_PATTERNS: Array<[RegExp, string]> = [
  [/^vitamin-a_/,  'Vitamin A'],
  [/^vitamin-c_/,  'Vitamin C'],
  [/^vitamin-d_/,  'Vitamin D'],
  [/^vitamin-e_/,  'Vitamin E'],
  [/^vitamin-b\d+_/, 'Vitamin B'],
  [/^calcium_/,    'Calcium'],
  [/^iron_/,       'Iron'],
  [/^magnesium_/,  'Magnesium'],
  [/^potassium_/,  'Potassium'],
  [/^zinc_/,       'Zinc'],
  [/^iodine_/,     'Iodine'],
  [/^selenium_/,   'Selenium'],
];

function declaredMicronutrients(n: Record<string, unknown> | undefined): string[] {
  if (!n) return [];
  const seen = new Set<string>();
  for (const key of Object.keys(n)) {
    if (!key.endsWith('_100g')) continue;
    for (const [re, label] of VITAMIN_KEY_PATTERNS) {
      if (re.test(key) && num((n as Record<string, unknown>)[key]) > 0) {
        seen.add(label);
      }
    }
  }
  return Array.from(seen);
}

/**
 * Map OFF's `categories_tags` array (["en:breakfast-cereals", "en:cereal-bars"])
 * to our narrower ProductCategory. Checked most-specific first.
 */
const CATEGORY_MAP: Array<[RegExp, ProductCategory]> = [
  [/sandwich/i,                            'sandwich'],
  [/ready[-_]?meal|plat[-_]?cuisin/i,      'ready_meal'],
  [/breakfast[-_]?cereal|cereale-petit/i,  'breakfast_cereal'],
  [/bread|pain|baguette/i,                 'bread'],
  [/yogurt|yoghurt|yaourt|skyr|fromage[-_]?blanc|faisselle|quark|petit[-_]?suisse|fermented[-_]?dair/i, 'yogurt'],
  [/cheese|fromage/i,                      'cheese'],
  [/processed[-_]?meat|charcuterie|saucisson|jambon-sec/i, 'processed_meat'],
  [/fresh[-_]?meat|viande-fraiche|boucherie/i, 'fresh_meat'],
  [/fish|poisson|seafood|crustace/i,       'fish'],
  [/confection|candy|chocolate|bonbon|biscuit/i, 'snack_sweet'],
  [/chip|crisp|crouton|apero-salee/i,      'snack_salty'],
  [/soda|soft[-_]?drink|cola|boisson-gazeuse/i, 'beverage_soft'],
  [/juice|jus|nectar/i,                    'beverage_juice'],
  [/water|eau-minerale|eau-de-source/i,    'beverage_water'],
  [/condiment|sauce|mayonnaise|ketchup|mustard|moutarde/i, 'condiment'],
  [/oil|huile|matiere-grasse|margarine/i,  'oil_fat'],
];

function categoryFromOFF(tags: unknown): ProductCategory {
  if (!Array.isArray(tags)) return 'other';
  const joined = tags.filter((t) => typeof t === 'string').join(' ');
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(joined)) return cat;
  }
  return 'other';
}

/**
 * Inverse of the CATEGORY_MAP: given our narrow ProductCategory enum,
 * return the best OFF `categories_tags` search term. Used by the "similar
 * but better" suggestion feature to query the OFF catalog for alternatives
 * in the same category as the scanned product.
 *
 * Returns null for 'other' — we shouldn't surface random suggestions when
 * we couldn't place the product.
 */
const CATEGORY_TO_OFF_TAG: Record<string, string> = {
  sandwich:          'en:sandwiches',
  ready_meal:        'en:prepared-meals',
  breakfast_cereal:  'en:breakfast-cereals',
  bread:             'en:breads',
  yogurt:            'en:yogurts',
  cheese:            'en:cheeses',
  processed_meat:    'en:processed-meats',
  fresh_meat:        'en:meats',
  fish:              'en:fishes',
  snack_sweet:       'en:sweet-snacks',
  snack_salty:       'en:salty-snacks',
  beverage_soft:     'en:sodas',
  beverage_juice:    'en:fruit-juices',
  beverage_water:    'en:waters',
  condiment:         'en:condiments',
  oil_fat:           'en:fats',
};

export function suggestionTagFor(category: ProductCategory): string | null {
  return CATEGORY_TO_OFF_TAG[category] ?? null;
}

function novaFromOFF(v: unknown): NovaClass {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n as NovaClass;
  return 4; // conservative when OFF has no NOVA group
}

function organicFromOFF(labels: unknown): boolean {
  if (!Array.isArray(labels)) return false;
  return labels.some(
    (t) =>
      typeof t === 'string' &&
      /^en:(organic|bio|eu-organic|ab-agriculture-biologique)$/i.test(t),
  );
}

function mapOFFProduct(p: Record<string, unknown>): ProductInput | null {
  const name =
    (typeof p.product_name_fr === 'string' && p.product_name_fr.trim()) ||
    (typeof p.product_name === 'string' && p.product_name.trim()) ||
    '(produit sans nom)';

  const ingredientsText =
    (typeof p.ingredients_text_fr === 'string' && p.ingredients_text_fr.trim()) ||
    (typeof p.ingredients_text === 'string' && p.ingredients_text.trim()) ||
    '';

  const ingredients: Ingredient[] = ingredientsText
    ? parseIngredientsText(ingredientsText)
    : [];

  const nutrients = p.nutriments as Record<string, unknown> | undefined;
  const nutrition = nutritionFromOFF(nutrients);
  const declared_micronutrients = declaredMicronutrients(nutrients);

  // Reject records that are too empty to score meaningfully.
  if (ingredients.length === 0 && nutrition.energy_kcal === 0 && nutrition.protein_g === 0) {
    return null;
  }

  const origin =
    typeof p.origins === 'string' && p.origins.trim()
      ? p.origins.trim()
      : null;

  return {
    name,
    category: categoryFromOFF(p.categories_tags),
    nova_class: novaFromOFF(p.nova_group),
    ingredients,
    nutrition,
    origin,
    organic: organicFromOFF(p.labels_tags),
    has_health_claims: false,
    has_misleading_marketing: false,
    named_oils: !ingredients.some((i) =>
      /huile v[eé]g[eé]tale|vegetable oil/i.test(i.name),
    ),
    origin_transparent: !!origin,
    declared_micronutrients,
  };
}

/** Polyfill AbortSignal.any for older Node / Safari. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if ('any' in AbortSignal && typeof (AbortSignal as { any?: unknown }).any === 'function') {
    return (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any(signals);
  }
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

// ============================================================================
// Hybrid OFF + LLM merge
// ============================================================================

/**
 * Returns true if the OFF record is too thin to score well on its own. When
 * both an OFF hit and user-provided photos exist, a sparse record triggers an
 * LLM augmentation pass to fill the gaps.
 */
export function isOFFSparse(p: ProductInput): boolean {
  const n = p.nutrition;
  const hasNutrition = n.energy_kcal > 0 || n.protein_g > 0 || n.carbs_g > 0;
  const hasIngredients = p.ingredients.length >= 3;
  const hasCategory = p.category !== 'other';
  return !hasNutrition || !hasIngredients || !hasCategory;
}

/**
 * Merge an OFF record with an LLM extraction. OFF is the trusted baseline;
 * fields the LLM can fill (when OFF has 0 or empty) are pulled in from the
 * LLM side. This mirrors the "authoritative > heuristic" stance of the rest
 * of the engine.
 */
export function mergeOFFWithLLM(off: ProductInput, llm: ProductInput): ProductInput {
  const prefer = <T>(offVal: T, llmVal: T, isEmpty: (v: T) => boolean): T =>
    isEmpty(offVal) ? llmVal : offVal;

  const emptyStr = (s: unknown) => !s || (typeof s === 'string' && s.trim() === '') || s === '(produit sans nom)';
  const emptyNum = (n: unknown) => n == null || n === 0;
  const emptyArr = (a: unknown) => !Array.isArray(a) || a.length === 0;

  return {
    name: prefer(off.name, llm.name, emptyStr),
    category: off.category !== 'other' ? off.category : llm.category,
    nova_class: off.nova_class || llm.nova_class,
    ingredients: emptyArr(off.ingredients) || off.ingredients.length < 3 ? llm.ingredients : off.ingredients,
    nutrition: {
      energy_kcal: prefer(off.nutrition.energy_kcal, llm.nutrition.energy_kcal, emptyNum),
      fat_g: prefer(off.nutrition.fat_g, llm.nutrition.fat_g, emptyNum),
      saturated_fat_g: prefer(off.nutrition.saturated_fat_g, llm.nutrition.saturated_fat_g, emptyNum),
      carbs_g: prefer(off.nutrition.carbs_g, llm.nutrition.carbs_g, emptyNum),
      sugars_g: prefer(off.nutrition.sugars_g, llm.nutrition.sugars_g, emptyNum),
      added_sugars_g: off.nutrition.added_sugars_g ?? llm.nutrition.added_sugars_g ?? null,
      fiber_g: prefer(off.nutrition.fiber_g, llm.nutrition.fiber_g, emptyNum),
      protein_g: prefer(off.nutrition.protein_g, llm.nutrition.protein_g, emptyNum),
      salt_g: prefer(off.nutrition.salt_g, llm.nutrition.salt_g, emptyNum),
      trans_fat_g: off.nutrition.trans_fat_g ?? llm.nutrition.trans_fat_g ?? null,
    },
    weight_g: off.weight_g ?? llm.weight_g,
    origin: off.origin ?? llm.origin ?? null,
    organic: off.organic || llm.organic,
    has_health_claims: off.has_health_claims || llm.has_health_claims,
    has_misleading_marketing: off.has_misleading_marketing || llm.has_misleading_marketing,
    named_oils: off.named_oils ?? llm.named_oils,
    origin_transparent: off.origin_transparent || llm.origin_transparent,
    declared_micronutrients: off.declared_micronutrients,
  };
}

/**
 * Search OFF for products matching any of the given category tags (e.g.
 * `en:yogurts`, `en:fresh-cheeses`). Returns an array of ProductInput ready
 * to feed scoreProduct + checkDiet — this is the data plumbing behind the
 * "similar but compliant" suggestion feature.
 *
 * Uses the OFF search-v1 endpoint; v2 search exists but its parameter shape
 * is unstable. page_size is capped low (default 20) because we don't need a
 * full catalog — we only surface a handful of alternatives.
 */
const OFF_SEARCH_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

export async function searchOFFByCategory(
  tags: string[],
  opts: OFFLookupOptions & { pageSize?: number } = {},
): Promise<ProductInput[]> {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  // Pick the first tag as the primary filter — more tags via tagtype_N is
  // possible but the OFF search API treats them as AND, which is too strict
  // for "similar products" matching.
  const primaryTag = tags[0];
  const params = new URLSearchParams({
    action: 'process',
    tagtype_0: 'categories',
    tag_contains_0: 'contains',
    tag_0: primaryTag,
    sort_by: 'popularity_key', // most common first
    page_size: String(opts.pageSize ?? 20),
    fields: FIELDS.join(','),
    json: '1',
  });
  const url = `${OFF_SEARCH_ENDPOINT}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);
  const signal = opts.signal ? anySignal([opts.signal, controller.signal]) : controller.signal;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: Array<Record<string, unknown>> };
    const products = Array.isArray(json.products) ? json.products : [];
    const mapped: ProductInput[] = [];
    for (const raw of products) {
      const p = mapOFFProduct(raw);
      if (p) mapped.push(p);
    }
    return mapped;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * "Similar but better" — take a list of OFF candidates, score each one,
 * filter to only those strictly beating the reference product, and return
 * the top N by score. Pure: caller passes the candidates so this is
 * trivially testable without an OFF round-trip.
 *
 * `dietFilter(candidate)` is an optional predicate; the caller plugs in
 * checkDiet() bound to the user's active diet. Candidates where the
 * filter returns false are dropped.
 */
export interface Alternative {
  product: ProductInput;
  audit: ScoreAudit;
}

export function rankAlternatives(
  reference: ProductInput,
  candidates: ProductInput[],
  opts: {
    max?: number;
    dietFilter?: (p: ProductInput) => boolean;
  } = {},
): Alternative[] {
  const max = opts.max ?? 3;
  const filter = opts.dietFilter ?? (() => true);
  const refAudit = scoreProduct(reference);

  const ranked = candidates
    .filter((c) => c.name && c.name !== reference.name) // don't suggest the same item
    .filter(filter)
    .map((product) => ({ product, audit: scoreProduct(product) }))
    .filter((a) => a.audit.score > refAudit.score)
    .sort((a, b) => b.audit.score - a.audit.score);

  return ranked.slice(0, max);
}

/**
 * Compare OFF vs LLM numbers and return human-readable warnings when they
 * disagree materially (>20 % relative difference on a non-trivial value).
 * Lets the user notice a potentially reformulated product.
 */
export function detectSourceConflicts(off: ProductInput, llm: ProductInput): string[] {
  const warnings: string[] = [];
  const check = (label: string, a: number, b: number) => {
    if (a > 0 && b > 0) {
      const diff = Math.abs(a - b) / Math.max(a, b);
      if (diff > 0.20) {
        warnings.push(`${label}: OFF ${a} vs photo ${b} (−${Math.round(diff * 100)} % difference — possible reformulation)`);
      }
    }
  };
  check('Sugars', off.nutrition.sugars_g, llm.nutrition.sugars_g);
  check('Sat fat', off.nutrition.saturated_fat_g, llm.nutrition.saturated_fat_g);
  check('Salt', off.nutrition.salt_g, llm.nutrition.salt_g);
  check('Protein', off.nutrition.protein_g, llm.nutrition.protein_g);
  return warnings;
}
