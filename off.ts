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
