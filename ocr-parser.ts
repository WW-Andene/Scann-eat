/**
 * ============================================================================
 * OCR PARSER v0.1.0  —  photo → ProductInput
 * ============================================================================
 *
 * Hybrid extraction pipeline for French supermarket food labels:
 *
 *   1. Vision LLM (Groq Llama 4 Scout) reads the packaging image and returns
 *      a draft ProductInput as JSON.
 *   2. A deterministic French post-processor re-validates the structured
 *      fields most prone to hallucination — percentages, E-numbers, whole-food
 *      flags, generic oils, hidden sugars — directly from the raw ingredient
 *      text extracted by the LLM.
 *
 * The LLM handles what it's good at (visual layout, multilingual OCR,
 * semantic guesses like nova_class and category). Regex + the engine's
 * ADDITIVES_DB handle what it's bad at (exact numbers, E-number fidelity).
 *
 * Main entry: parseLabel(image, opts) → Promise<ProductInput>
 * Pure helper: parseIngredientsText(text) → Ingredient[]
 * ============================================================================
 */

import {
  ADDITIVES_DB,
  normalize,
} from './scoring-engine.ts';
import type {
  Ingredient,
  NovaClass,
  NutritionPer100g,
  ProductCategory,
  ProductInput,
} from './scoring-engine.ts';

// ============================================================================
// SECTION 1: CONSTANTS (shared with engine by intent, duplicated to keep
//            ocr-parser importable without pulling private symbols)
// ============================================================================

const WHOLE_FOOD_KEYWORDS = [
  'tomate', 'salade', 'oeuf', 'œuf', 'poisson', 'saumon', 'thon',
  'fromage', 'lait', 'légume', 'legume', 'carotte', 'épinard', 'epinard',
  'lentille', 'haricot', 'pois', 'noix', 'amande', 'graine',
  'fruit', 'pomme', 'orange', 'poivron', 'oignon', 'ail',
  'poulet', 'boeuf', 'porc', 'viande', 'yaourt', 'riz', 'quinoa',
  'avoine', 'eau', 'miel', 'jambon', 'dinde', 'farine complète',
];

const NON_WHOLE_FOOD_MARKERS =
  /sirop|isolat|hydrolysat|concentré|concentre|modifié|modifie|arôme|arome|extrait sec|poudre de|amidon/i;

const GENERIC_OIL_TERMS = [
  'huile végétale', 'huile vegetale', 'vegetable oil',
  'matière grasse végétale', 'matiere grasse vegetale',
  'graisse végétale', 'graisse vegetale',
];

const CATEGORY_VALUES: readonly ProductCategory[] = [
  'sandwich', 'ready_meal', 'bread', 'breakfast_cereal', 'yogurt', 'cheese',
  'processed_meat', 'fresh_meat', 'fish', 'snack_sweet', 'snack_salty',
  'beverage_soft', 'beverage_juice', 'beverage_water', 'condiment',
  'oil_fat', 'other',
];

// ============================================================================
// SECTION 2: VISION PROMPT + OUTPUT SCHEMA
// ============================================================================

const SYSTEM_PROMPT = `Tu es un expert en étiquetage alimentaire français. On te fournit des photos d'emballages de produits de supermarché (face + dos). Tu dois extraire une fiche produit structurée EN JSON STRICT.

Règles non-négociables:
- Réponds UNIQUEMENT avec du JSON valide, sans texte autour, sans balises markdown.
- Les valeurs nutritionnelles sont pour 100 g (ou 100 ml pour les liquides). Utilise null si une valeur n'est pas déclarée — jamais 0 par défaut.
- Décimales avec point (8.5, pas 8,5).
- La liste d'ingrédients doit préserver l'ordre du paquet. Chaque ingrédient est un objet séparé: nom brut, pourcentage si déclaré, numéro E si applicable.
- Les additifs (sel nitrité, conservateurs, colorants, épaississants, émulsifiants…) reçoivent category="additive".
- nova_class: estime 1 (brut), 2 (ingrédient culinaire), 3 (transformé) ou 4 (ultra-transformé, >5 ingrédients industriels, additifs cosmétiques, additifs E numéro non-commun).
- En cas de doute sur un chiffre, renvoie null plutôt que d'inventer.
- Laisse ingredients.name en français tel qu'imprimé (avec accents).`;

const JSON_SCHEMA_HINT = `{
  "name": "string",
  "category": "sandwich|ready_meal|bread|breakfast_cereal|yogurt|cheese|processed_meat|fresh_meat|fish|snack_sweet|snack_salty|beverage_soft|beverage_juice|beverage_water|condiment|oil_fat|other",
  "nova_class": 1|2|3|4,
  "weight_g": number|null,
  "origin": "string|null",
  "organic": boolean,
  "has_health_claims": boolean,
  "has_misleading_marketing": boolean,
  "ingredients": [
    {
      "name": "string (français, tel qu'imprimé)",
      "percentage": number|null,
      "e_number": "E250|null",
      "category": "food|additive|processing_aid"
    }
  ],
  "nutrition": {
    "energy_kcal": number,
    "fat_g": number,
    "saturated_fat_g": number,
    "carbs_g": number,
    "sugars_g": number,
    "added_sugars_g": number|null,
    "fiber_g": number,
    "protein_g": number,
    "salt_g": number,
    "trans_fat_g": number|null
  }
}`;

// ============================================================================
// SECTION 3: GROQ CLIENT (zero-dep, native fetch)
// ============================================================================

export interface ParseOptions {
  apiKey?: string;                  // defaults to process.env.GROQ_API_KEY
  model?: string;                   // defaults to llama-4-scout-17b-16e-instruct
  endpoint?: string;                // override for self-hosted / proxy
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

const DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const DEFAULT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export type LabelImage =
  | { base64: string; mime?: string }    // raw base64 (no data: prefix)
  | { dataUrl: string }                  // full data URL
  | { url: string };                     // publicly fetchable URL

function toImageUrl(img: LabelImage): string {
  if ('dataUrl' in img) return img.dataUrl;
  if ('url' in img) return img.url;
  const mime = img.mime ?? 'image/jpeg';
  return `data:${mime};base64,${img.base64}`;
}

async function callVisionLLM(
  images: LabelImage[],
  opts: ParseOptions,
): Promise<string> {
  const apiKey = opts.apiKey ?? (typeof process !== 'undefined' ? process.env?.GROQ_API_KEY : undefined);
  if (!apiKey) throw new Error('GROQ_API_KEY missing — pass opts.apiKey or set env var.');

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `Extrais la fiche produit. Renvoie uniquement ce JSON:\n${JSON_SCHEMA_HINT}`,
    },
    ...images.map((img) => ({
      type: 'image_url',
      image_url: { url: toImageUrl(img) },
    })),
  ];

  // NOTE: response_format: json_object is intentionally NOT set — Groq rejects
  // it on vision (multimodal) calls with "response_format does not support
  // image inputs". We instead instruct the model to return raw JSON and strip
  // any accidental markdown fences in extractJSON().
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    temperature: opts.temperature ?? 0.1,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  };

  const res = await fetch(opts.endpoint ?? DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq API ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq API returned no content.');
  return content;
}

// ============================================================================
// SECTION 4: DETERMINISTIC FRENCH POST-PROCESSOR
// ============================================================================
//
// Everything here is pure, synchronous, testable without an API key.
// It rebuilds the fields most prone to LLM drift directly from raw text.
// ============================================================================

const E_NUMBER_RE = /\bE\s?-?\s?([0-9]{3}[a-z]?)\b/i;
const PERCENTAGE_RE = /([0-9]+(?:[.,][0-9]+)?)\s*%/;

/**
 * Split an ingredient list on top-level commas only. Preserves nested
 * parenthetical groups like "émulsifiants (lécithine, mono- et diglycérides)".
 */
export function splitIngredients(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    const isDelimiter = (ch === ',' || ch === ';') && depth === 0;
    if (isDelimiter) {
      // French decimal: keep "17,4" intact when digits flank the comma.
      const prev = raw[i - 1];
      const next = raw[i + 1];
      if (ch === ',' && prev && /\d/.test(prev) && next && /\d/.test(next)) {
        buf += ch;
        continue;
      }
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

export function extractPercentage(text: string): number | null {
  const m = text.match(PERCENTAGE_RE);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

export function extractENumber(text: string): string | null {
  const m = text.match(E_NUMBER_RE);
  if (!m) return null;
  return `E${m[1].toUpperCase()}`;
}

function looksLikeAdditive(text: string): boolean {
  if (extractENumber(text)) return true;
  const n = normalize(text);
  return ADDITIVES_DB.some((a) =>
    a.names.some((syn) => n.includes(normalize(syn))),
  );
}

function isWholeFood(text: string): boolean {
  const lower = text.toLowerCase();
  if (NON_WHOLE_FOOD_MARKERS.test(lower)) return false;
  return WHOLE_FOOD_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Enrich a single draft ingredient using text-level signals.
 * The LLM's values are only kept when post-processing can't find a better one,
 * but an LLM-declared E-number is validated against ADDITIVES_DB regardless.
 */
export function enrichIngredient(draft: Partial<Ingredient> & { name: string }): Ingredient {
  const name = draft.name.trim();

  const pctFromText = extractPercentage(name);
  const percentage =
    typeof draft.percentage === 'number' && draft.percentage > 0
      ? draft.percentage
      : pctFromText;

  let eNumber = draft.e_number?.toUpperCase().replace(/\s/g, '') ?? null;
  const eFromText = extractENumber(name);
  if (eFromText) eNumber = eFromText;
  if (eNumber && !/^E\d{3}[A-Z]?$/.test(eNumber)) eNumber = null; // drop malformed LLM output

  let category = draft.category;
  if (!category) {
    if (eNumber || looksLikeAdditive(name)) category = 'additive';
    else category = 'food';
  }

  const is_whole_food =
    typeof draft.is_whole_food === 'boolean'
      ? draft.is_whole_food
      : category === 'food' && isWholeFood(name);

  return {
    name,
    percentage: percentage ?? null,
    e_number: eNumber,
    category,
    is_whole_food,
  };
}

/**
 * Pure helper: raw ingredient text → structured Ingredient[].
 * Useful for tests, offline parsing, or when OCR already produced text.
 */
export function parseIngredientsText(raw: string): Ingredient[] {
  const cleaned = raw
    .replace(/^\s*ingr[éeè]dients?\s*[:：]\s*/i, '')
    .replace(/\*/g, '')
    .trim();
  return splitIngredients(cleaned).map((part) => enrichIngredient({ name: part }));
}

// ============================================================================
// SECTION 5: VALIDATION / COERCION
// ============================================================================

function coerceNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function coerceNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = coerceNumber(v);
  return Number.isFinite(n) ? n : null;
}

function coerceCategory(v: unknown): ProductCategory {
  if (typeof v === 'string' && (CATEGORY_VALUES as readonly string[]).includes(v)) {
    return v as ProductCategory;
  }
  return 'other';
}

function coerceNova(v: unknown): NovaClass {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 4; // conservative default
}

function coerceNutrition(raw: unknown): NutritionPer100g {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    energy_kcal: coerceNumber(r.energy_kcal),
    fat_g: coerceNumber(r.fat_g),
    saturated_fat_g: coerceNumber(r.saturated_fat_g),
    carbs_g: coerceNumber(r.carbs_g),
    sugars_g: coerceNumber(r.sugars_g),
    added_sugars_g: coerceNullableNumber(r.added_sugars_g),
    fiber_g: coerceNumber(r.fiber_g),
    protein_g: coerceNumber(r.protein_g),
    salt_g: coerceNumber(r.salt_g),
    trans_fat_g: coerceNullableNumber(r.trans_fat_g),
  };
}

function coerceIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) =>
      enrichIngredient({
        name: String(x.name ?? '').trim(),
        percentage: coerceNullableNumber(x.percentage) ?? undefined,
        e_number: typeof x.e_number === 'string' ? x.e_number : null,
        category:
          x.category === 'food' || x.category === 'additive' || x.category === 'processing_aid'
            ? x.category
            : undefined,
        is_whole_food: typeof x.is_whole_food === 'boolean' ? x.is_whole_food : undefined,
      }),
    )
    .filter((ing) => ing.name.length > 0);
}

function inferNamedOils(ingredients: Ingredient[]): boolean {
  const hasGeneric = ingredients.some((ing) => {
    const n = ing.name.toLowerCase();
    return GENERIC_OIL_TERMS.some((g) => n.includes(g));
  });
  return !hasGeneric;
}

/**
 * Strip optional markdown fences (```json … ```) and leading prose so we can
 * JSON.parse the model's output even when it ignores the "raw JSON" instruction.
 */
export function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

// ============================================================================
// SECTION 6: MAIN ENTRY — parseLabel
// ============================================================================

export interface ParseLabelResult {
  product: ProductInput;
  raw_llm_output: string;
  warnings: string[];
}

/**
 * Full pipeline: image(s) → ProductInput, ready to feed scoreProduct().
 * Accepts 1–4 images (typically front + ingredients panel + nutrition panel).
 */
export async function parseLabel(
  images: LabelImage | LabelImage[],
  opts: ParseOptions = {},
): Promise<ParseLabelResult> {
  const imgs = Array.isArray(images) ? images : [images];
  if (imgs.length === 0) throw new Error('parseLabel: no images provided.');
  if (imgs.length > 4) throw new Error('parseLabel: max 4 images per call.');

  const raw = await callVisionLLM(imgs, opts);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch (e) {
    throw new Error(`parseLabel: LLM did not return valid JSON. First 300 chars: ${raw.slice(0, 300)}`);
  }

  const warnings: string[] = [];

  const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : '(unknown product)';
  if (name === '(unknown product)') warnings.push('Product name could not be read.');

  const ingredients = coerceIngredients(parsed.ingredients);
  if (ingredients.length === 0) warnings.push('No ingredients extracted — scoring will be unreliable.');

  const nutrition = coerceNutrition(parsed.nutrition);
  if (nutrition.energy_kcal === 0 && nutrition.carbs_g === 0 && nutrition.protein_g === 0) {
    warnings.push('Nutrition panel appears blank — re-shoot the back of pack.');
  }

  const product: ProductInput = {
    name,
    category: coerceCategory(parsed.category),
    nova_class: coerceNova(parsed.nova_class),
    ingredients,
    nutrition,
    weight_g: coerceNullableNumber(parsed.weight_g) ?? undefined,
    origin: typeof parsed.origin === 'string' ? parsed.origin : null,
    organic: parsed.organic === true,
    has_health_claims: parsed.has_health_claims === true,
    has_misleading_marketing: parsed.has_misleading_marketing === true,
    named_oils: inferNamedOils(ingredients),
    origin_transparent: typeof parsed.origin === 'string' && parsed.origin.trim().length > 0,
  };

  return { product, raw_llm_output: raw, warnings };
}
