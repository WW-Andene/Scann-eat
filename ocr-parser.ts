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
  // Produce
  'tomate', 'salade', 'carotte', 'épinard', 'epinard', 'poivron', 'oignon',
  'ail', 'courgette', 'aubergine', 'concombre', 'brocoli', 'chou',
  'betterave', 'poireau', 'potiron', 'courge',
  // Fruits
  'fruit', 'pomme', 'poire', 'orange', 'citron', 'pamplemousse', 'mandarine',
  'abricot', 'pêche', 'peche', 'fraise', 'framboise', 'myrtille', 'cassis',
  'cerise', 'prune', 'mirabelle', 'raisin', 'figue', 'datte', 'mangue',
  'ananas', 'banane', 'kiwi', 'melon', 'pastèque', 'grenade', 'coco', 'noix de coco',
  // Legumes & nuts & seeds
  'lentille', 'haricot', 'pois', 'fève', 'feve', 'noix', 'amande', 'noisette',
  'pistache', 'cajou', 'graine', 'sésame', 'sesame', 'lin', 'chia', 'tournesol',
  // Grains
  'riz', 'quinoa', 'avoine', 'blé', 'ble', 'seigle', 'orge', 'sarrasin',
  'farine complète', 'farine complete',
  // Animal
  'oeuf', 'œuf', 'poisson', 'saumon', 'thon', 'sardine', 'maquereau',
  'poulet', 'boeuf', 'porc', 'viande', 'dinde', 'canard', 'agneau',
  'jambon',
  // Dairy / other
  'fromage', 'lait', 'yaourt', 'skyr', 'eau', 'miel',
  'légume', 'legume',
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

const SYSTEM_PROMPT = `Tu es un expert en étiquetage alimentaire français. On te fournit des photos d'emballages de produits de supermarché (face + dos, panneau ingrédients, tableau nutritionnel). Tu dois extraire une fiche produit structurée EN JSON STRICT.

Règles non-négociables:
- Réponds UNIQUEMENT avec du JSON valide, sans texte autour, sans balises markdown.
- Les valeurs nutritionnelles sont pour 100 g (ou 100 ml pour les liquides). Utilise null si une valeur n'est pas déclarée — jamais 0 par défaut.
- Décimales avec point (8.5, pas 8,5).

Liste d'ingrédients — CRUCIAL:
- Préserve l'ordre tel qu'imprimé sur le paquet.
- Accepte N'IMPORTE QUEL format visuel: paragraphe continu séparé par virgules, liste à puces verticale, liste avec sauts de ligne, colonnes multiples, étiquette séparée. Lis-les tous et reconstruis la même structure plate.
- Chaque ingrédient est un objet séparé dans le tableau \`ingredients\`.
- Si un ingrédient a un pourcentage déclaré (ex. "jambon 17,4%"), mets-le dans \`percentage\` sans le signe %.
- Si c'est un additif (conservateur, colorant, émulsifiant, épaississant, acidifiant, antioxydant, exhausteur de goût, édulcorant…), mets le numéro E dans \`e_number\` et category="additive".
- Ne fusionne jamais deux ingrédients en un seul, même si le paquet les affiche sur la même ligne.

Autres champs:
- nova_class: estime 1 (brut), 2 (ingrédient culinaire), 3 (transformé) ou 4 (ultra-transformé, >5 ingrédients industriels, additifs cosmétiques, additifs E).
- Si un code-barres EAN/UPC est visible, mets-le dans le champ "barcode" (13 ou 8 chiffres) sans espaces.
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

/**
 * Low-level Groq vision caller. Accepts any system + user prompt pair so the
 * label-parsing and food-identification pipelines can share one transport
 * path with one place to handle auth, errors, and the "no JSON mode on
 * vision" quirk.
 */
async function callGroqVision(
  systemPrompt: string,
  userText: string,
  images: LabelImage[],
  opts: ParseOptions,
): Promise<string> {
  const apiKey = opts.apiKey ?? (typeof process !== 'undefined' ? process.env?.GROQ_API_KEY : undefined);
  if (!apiKey) throw new Error('GROQ_API_KEY missing — pass opts.apiKey or set env var.');

  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: userText },
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
      { role: 'system', content: systemPrompt },
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

async function callVisionLLM(
  images: LabelImage[],
  opts: ParseOptions,
): Promise<string> {
  return callGroqVision(
    SYSTEM_PROMPT,
    `Extrais la fiche produit. Renvoie uniquement ce JSON:\n${JSON_SCHEMA_HINT}`,
    images,
    opts,
  );
}

// ============================================================================
// SECTION 3b: FOOD IDENTIFICATION (photos of prepared / fresh food, no label)
// ============================================================================

const IDENTIFY_FOOD_PROMPT = `Tu es un expert en nutrition qui identifie des aliments prêts à manger depuis une photo : plats préparés, fruits / légumes frais, pâtisseries, plats de restaurant. Il n'y a PAS d'étiquette ni de code-barres à lire.

Ta tâche :
1. Identifie l'aliment principal visible.
2. Estime la quantité totale visible en grammes (ou ml si liquide). Utilise des repères visuels : assiette standard (~26 cm), fourchette, main, bol. Si plusieurs items, estime le total.
3. Estime les macronutriments pour la portion VISIBLE (pas pour 100 g).

Règles :
- Réponds UNIQUEMENT en JSON valide, sans markdown.
- Décimales avec point.
- Si tu n'es pas sûr à au moins 60 %, renvoie confidence: "low".
- Nom en français, tel qu'on le dirait normalement.`;

const IDENTIFY_FOOD_SCHEMA = `{
  "name": "string (français, ex: 'salade césar au poulet')",
  "estimated_grams": number,
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence": "low" | "medium" | "high"
}`;

export interface IdentifiedFood {
  name: string;
  estimated_grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Identify a food from one or more photos of the dish itself (no label).
 * Complements parseLabel for the ~40% of real meals that have no barcode
 * or ingredient list — fruit, restaurant plates, bakery items.
 *
 * Returns an IdentifiedFood ready to feed directly into Quick Add.
 */
export async function identifyFood(
  images: LabelImage | LabelImage[],
  opts: ParseOptions = {},
): Promise<IdentifiedFood> {
  const imgs = Array.isArray(images) ? images : [images];
  if (imgs.length === 0) throw new Error('identifyFood: no images provided.');
  if (imgs.length > 4) throw new Error('identifyFood: max 4 images per call.');

  const raw = await callGroqVision(
    IDENTIFY_FOOD_PROMPT,
    `Identifie l'aliment. Renvoie uniquement ce JSON :\n${IDENTIFY_FOOD_SCHEMA}`,
    imgs,
    opts,
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[identifyFood] malformed JSON, first 300 chars:', raw.slice(0, 300));
    throw new Error('identifyFood: LLM returned malformed JSON.');
  }

  const name = typeof parsed.name === 'string' && parsed.name.trim()
    ? parsed.name.trim()
    : '(aliment inconnu)';
  const confidence: IdentifiedFood['confidence'] =
    parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium';

  return {
    name,
    estimated_grams: Math.max(0, coerceNumber(parsed.estimated_grams)),
    kcal: Math.max(0, coerceNumber(parsed.kcal)),
    protein_g: Math.max(0, coerceNumber(parsed.protein_g)),
    carbs_g: Math.max(0, coerceNumber(parsed.carbs_g)),
    fat_g: Math.max(0, coerceNumber(parsed.fat_g)),
    confidence,
  };
}

// ============================================================================
// SECTION 3c: MULTI-ITEM FOOD IDENTIFICATION (multiple foods on one plate)
// ============================================================================

const IDENTIFY_MULTI_PROMPT = `Tu identifies plusieurs aliments distincts visibles sur une même photo (ex. une assiette avec plusieurs composants, un plateau-repas, un buffet). PAS d'étiquette ni de code-barres.

Ta tâche pour chaque aliment :
1. Nomme l'aliment principal.
2. Estime sa quantité visible en grammes (ou ml).
3. Estime ses macros pour la portion visible (pas pour 100 g).

Règles :
- Réponds UNIQUEMENT en JSON valide.
- Décimales avec point.
- Jusqu'à 8 aliments maximum. Ignore les condiments / accompagnements négligeables.
- Si un aliment n'est pas clairement identifiable, laisse-le de côté.
- Noms en français.`;

const IDENTIFY_MULTI_SCHEMA = `{
  "items": [
    {
      "name": "string",
      "estimated_grams": number,
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "confidence": "low" | "medium" | "high"
}`;

export interface IdentifiedMultiFood {
  items: Omit<IdentifiedFood, 'confidence'>[];
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Identify MULTIPLE foods visible in a single photo — e.g., a plate with
 * steak + fries + salad, or a buffet tray. Returns a list, each item ready
 * to be logged as its own Quick Add entry.
 *
 * Caps at 8 items server-side (LLM) and mirrored client-side.
 */
export async function identifyMultiFood(
  images: LabelImage | LabelImage[],
  opts: ParseOptions = {},
): Promise<IdentifiedMultiFood> {
  const imgs = Array.isArray(images) ? images : [images];
  if (imgs.length === 0) throw new Error('identifyMultiFood: no images provided.');
  if (imgs.length > 4) throw new Error('identifyMultiFood: max 4 images per call.');

  const raw = await callGroqVision(
    IDENTIFY_MULTI_PROMPT,
    `Identifie tous les aliments distincts. Renvoie uniquement ce JSON :\n${IDENTIFY_MULTI_SCHEMA}`,
    imgs,
    opts,
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[identifyMultiFood] malformed JSON, first 300 chars:', raw.slice(0, 300));
    throw new Error('identifyMultiFood: LLM returned malformed JSON.');
  }

  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items = rawItems.slice(0, 8)
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it) => ({
      name: typeof it.name === 'string' && it.name.trim() ? it.name.trim() : '(inconnu)',
      estimated_grams: Math.max(0, coerceNumber(it.estimated_grams)),
      kcal: Math.max(0, coerceNumber(it.kcal)),
      protein_g: Math.max(0, coerceNumber(it.protein_g)),
      carbs_g: Math.max(0, coerceNumber(it.carbs_g)),
      fat_g: Math.max(0, coerceNumber(it.fat_g)),
    }))
    .filter((it) => it.name !== '(inconnu)' && (it.kcal > 0 || it.estimated_grams > 0));

  const confidence: IdentifiedMultiFood['confidence'] =
    parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium';

  return { items, confidence };
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
/**
 * Strip leading bullet glyphs / numbering / dashes from a single line. Handles
 * the vertical-list format some brands use instead of a comma-separated panel.
 */
function stripBullet(line: string): string {
  return line.replace(/^[\s]*(?:[-–—•▪·∙*]+|\d+[.)])\s*/, '').trim();
}

export function splitIngredients(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    // Newlines at depth 0 always split — vertical bulleted lists.
    if ((ch === '\n' || ch === '\r') && depth === 0) {
      const piece = stripBullet(buf);
      if (piece) parts.push(piece);
      buf = '';
      continue;
    }

    const isDelimiter = (ch === ',' || ch === ';') && depth === 0;
    if (isDelimiter) {
      // French decimal: keep "17,4" intact when digits flank the comma.
      const prev = raw[i - 1];
      const next = raw[i + 1];
      if (ch === ',' && prev && /\d/.test(prev) && next && /\d/.test(next)) {
        buf += ch;
        continue;
      }
      const piece = stripBullet(buf);
      if (piece) parts.push(piece);
      buf = '';
    } else {
      buf += ch;
    }
  }
  const last = stripBullet(buf);
  if (last) parts.push(last);
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
  return !!(extractENumber(text) || additiveByName(text));
}

/** Reverse lookup: find an ADDITIVES_DB entry whose synonym appears in the text. */
function additiveByName(text: string) {
  const n = normalize(text);
  for (const a of ADDITIVES_DB) {
    for (const syn of a.names) {
      if (n.includes(normalize(syn))) return a;
    }
  }
  return null;
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

  // If still no E-number, reverse-lookup by synonym — catches "dioxyde de
  // titane" without an explicit (E171) in the text.
  let byName = null;
  if (!eNumber) {
    byName = additiveByName(name);
    if (byName) eNumber = byName.e_number;
  }

  let category = draft.category;
  if (!category) {
    if (eNumber || byName || looksLikeAdditive(name)) category = 'additive';
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
 * Role prefixes French labels use to introduce an additive class:
 * "conservateur: E250", "émulsifiant : lécithines". We strip them so the
 * resulting ingredient name is the substance, not the role.
 */
const ROLE_PREFIX_RE = /^(conservateurs?|émulsifiants?|emulsifiants?|épaississants?|epaississants?|stabilisants?|acidifiants?|antioxydants?|antioxidants?|colorants?|exhausteurs? de go[uû]t|édulcorants?|edulcorants?|correcteurs? d'acidité|gélifiants?|gelifiants?|humectants?|affermissants?|agents? de traitement|séquestrants?|sequestrants?|anti[- ]?agglom[eé]rants?|arômes?|aromes?)\s*[:：]\s*/i;

function stripRolePrefix(text: string): string {
  return text.replace(ROLE_PREFIX_RE, '').trim();
}

/**
 * Many French labels include a "...dont moins de 2% de: sucre, sel, arômes..."
 * residual list. We flatten that sub-list into top-level ingredients.
 */
const LESS_THAN_RE = /(?:contient|dont)?\s*(?:moins de|<)\s*\d+\s*%\s*de\s*[:：]?/gi;

export function parseIngredientsText(raw: string): Ingredient[] {
  const cleaned = raw
    .replace(/^\s*ingr[éeè]dients?\s*[:：]\s*/i, '')
    .replace(/\*/g, '')
    .replace(LESS_THAN_RE, ' ') // flatten "moins de 2% de:" sub-phrase
    .trim();
  return splitIngredients(cleaned)
    .map((part) => enrichIngredient({ name: stripRolePrefix(part) }));
}

// ============================================================================
// SECTION 5: VALIDATION / COERCION
// ============================================================================

export function coerceNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function coerceNullableNumber(v: unknown): number | null {
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
  barcode?: string | null;
}

function coerceBarcode(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const digits = v.replace(/\D/g, '');
  if (digits.length === 8 || digits.length === 12 || digits.length === 13) return digits;
  return null;
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
  } catch {
    // Log the raw preview for dev debugging; surface a concise user-facing
    // error. Previously the full 300-char dump leaked into errorEl and was
    // overwhelming on mobile.
    // eslint-disable-next-line no-console
    console.warn('[parseLabel] malformed JSON, first 300 chars:', raw.slice(0, 300));
    throw new Error('parseLabel: LLM returned malformed JSON.');
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

  const barcode = coerceBarcode(parsed.barcode);

  return { product, raw_llm_output: raw, warnings, barcode };
}
