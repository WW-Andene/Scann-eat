/**
 * ============================================================================
 * FOOD SCORING ENGINE v2.0.0
 * ============================================================================
 *
 * Evidence-based scoring engine for supermarket food products.
 * Single-file consolidated build. Zero runtime dependencies.
 *
 * Main entry point: scoreProduct(product: ProductInput): ScoreAudit
 *
 * Scoring breakdown (100 pts total):
 *   - Processing Level (20)
 *   - Nutritional Density (25)
 *   - Negative Nutrients (25)
 *   - Additive Risk (15)
 *   - Ingredient Integrity (15)
 *   + Global bonuses (capped +10)
 *   - Global penalties
 *   - Veto conditions (cap final score)
 *
 * Grades: A+ (85+) / A (70+) / B (55+) / C (40+) / D (25+) / F (<25)
 * ============================================================================
 */

// ============================================================================
// SECTION 1: TYPES
// ============================================================================

export type NovaClass = 1 | 2 | 3 | 4;

export type ProductCategory =
  | 'sandwich'
  | 'ready_meal'
  | 'bread'
  | 'breakfast_cereal'
  | 'yogurt'
  | 'cheese'
  | 'processed_meat'
  | 'fresh_meat'
  | 'fish'
  | 'snack_sweet'
  | 'snack_salty'
  | 'beverage_soft'
  | 'beverage_juice'
  | 'beverage_water'
  | 'condiment'
  | 'oil_fat'
  | 'other';

/**
 * Per-100g nutrition values. All in grams except energy.
 * Use null for unknown/not-declared rather than 0.
 */
export interface NutritionPer100g {
  energy_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
  carbs_g: number;
  sugars_g: number;
  added_sugars_g?: number | null;
  fiber_g: number;
  protein_g: number;
  salt_g: number;
  trans_fat_g?: number | null;
}

/**
 * A single ingredient as parsed from the label.
 */
export interface Ingredient {
  name: string;               // Raw name as on label
  percentage?: number | null; // If declared (e.g., "jambon 17.4%")
  is_whole_food?: boolean;    // Whether it's a recognizable whole food
  e_number?: string | null;   // E250, E451, etc. if it's an additive
  category?: 'food' | 'additive' | 'processing_aid';
}

/**
 * Full product input schema.
 */
export interface ProductInput {
  name: string;
  category: ProductCategory;
  nova_class: NovaClass;
  ingredients: Ingredient[];
  nutrition: NutritionPer100g;

  // Optional metadata
  weight_g?: number;
  origin?: string | null;
  organic?: boolean;
  whole_grain_primary?: boolean;
  fermented?: boolean;
  has_health_claims?: boolean;
  has_misleading_marketing?: boolean;
  named_oils?: boolean; // true if oils are named (e.g., "colza" not "vegetable oil")
  origin_transparent?: boolean;
}

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export type Severity = 'info' | 'minor' | 'moderate' | 'major' | 'critical';

export interface Deduction {
  pillar: string;
  reason: string;
  points: number; // Negative for deduction, positive for bonus
  severity: Severity;
  evidence?: string;
}

export interface PillarScore {
  name: string;
  max: number;
  score: number;
  deductions: Deduction[];
  bonuses: Deduction[];
}

export interface VetoCondition {
  triggered: boolean;
  reason: string;
  cap: number;
}

export interface ScoreAudit {
  product_name: string;
  category: ProductCategory;

  // Final outputs
  score: number;
  grade: Grade;
  verdict: string;

  // Pillar breakdown
  pillars: {
    processing: PillarScore;
    nutritional_density: PillarScore;
    negative_nutrients: PillarScore;
    additive_risk: PillarScore;
    ingredient_integrity: PillarScore;
  };

  // Bonuses & vetoes
  global_bonuses: Deduction[];
  global_penalties: Deduction[];
  veto: VetoCondition;

  // Summary flags for UI
  red_flags: string[];
  green_flags: string[];

  // Meta
  engine_version: string;
  warnings: string[];
}

// ============================================================================
// SECTION 2: ADDITIVES DATABASE
// ============================================================================
// Based on EFSA reviews, IARC classifications, and current microbiome/CV research.
//
// Tier 1: Serious concern (major evidence of harm or strong mechanistic concern)
// Tier 2: Moderate concern (emerging evidence, precautionary penalty)
// Tier 3: Minor/contextual (mild concern or context-dependent)
// ============================================================================

export type AdditiveTier = 1 | 2 | 3;

export interface AdditiveInfo {
  e_number: string;
  names: string[];
  tier: AdditiveTier;
  category: string;
  concern: string;
}

export const ADDITIVES_DB: AdditiveInfo[] = [
  // ===== TIER 1: Serious concern =====
  {
    e_number: 'E249',
    names: ['nitrite de potassium', 'potassium nitrite'],
    tier: 1,
    category: 'preservative',
    concern: 'Nitrite in processed meat — IARC Group 2A (probable carcinogen via nitrosamine formation)',
  },
  {
    e_number: 'E250',
    names: ['nitrite de sodium', 'sodium nitrite'],
    tier: 1,
    category: 'preservative',
    concern: 'Nitrite in processed meat — IARC Group 2A (probable carcinogen via nitrosamine formation)',
  },
  {
    e_number: 'E251',
    names: ['nitrate de sodium', 'sodium nitrate'],
    tier: 1,
    category: 'preservative',
    concern: 'Converts to nitrite in body — same carcinogenicity pathway',
  },
  {
    e_number: 'E252',
    names: ['nitrate de potassium', 'potassium nitrate'],
    tier: 1,
    category: 'preservative',
    concern: 'Converts to nitrite in body — same carcinogenicity pathway',
  },
  {
    e_number: 'E433',
    names: ['polysorbate 80', 'polysorbate-80'],
    tier: 1,
    category: 'emulsifier',
    concern: 'Emerging evidence: microbiome disruption, intestinal barrier damage (Chassaing et al.)',
  },
  {
    e_number: 'E466',
    names: ['carboxymethylcellulose', 'cmc', 'cellulose gum'],
    tier: 1,
    category: 'emulsifier',
    concern: 'Emerging evidence: microbiome disruption, intestinal inflammation',
  },

  // ===== TIER 2: Moderate concern =====
  {
    e_number: 'E338',
    names: ['acide phosphorique', 'phosphoric acid'],
    tier: 2,
    category: 'acidulant',
    concern: 'Phosphate additive — chronic high intake linked to CV and renal stress',
  },
  {
    e_number: 'E450',
    names: ['diphosphate', 'pyrophosphate'],
    tier: 2,
    category: 'stabilizer',
    concern: 'Phosphate additive — chronic high intake linked to CV and renal stress',
  },
  {
    e_number: 'E451',
    names: ['triphosphate', 'tripolyphosphate'],
    tier: 2,
    category: 'stabilizer',
    concern: 'Phosphate additive — chronic high intake linked to CV and renal stress',
  },
  {
    e_number: 'E452',
    names: ['polyphosphate'],
    tier: 2,
    category: 'stabilizer',
    concern: 'Phosphate additive — chronic high intake linked to CV and renal stress',
  },
  {
    e_number: 'E102',
    names: ['tartrazine', 'jaune de tartrazine'],
    tier: 2,
    category: 'colorant',
    concern: 'Azo dye — linked to hyperactivity in children (Southampton study)',
  },
  {
    e_number: 'E110',
    names: ['jaune orangé s', 'sunset yellow'],
    tier: 2,
    category: 'colorant',
    concern: 'Azo dye — linked to hyperactivity in children',
  },
  {
    e_number: 'E122',
    names: ['azorubine', 'carmoisine'],
    tier: 2,
    category: 'colorant',
    concern: 'Azo dye — linked to hyperactivity in children',
  },
  {
    e_number: 'E124',
    names: ['ponceau 4r', 'rouge cochenille a'],
    tier: 2,
    category: 'colorant',
    concern: 'Azo dye — linked to hyperactivity in children',
  },
  {
    e_number: 'E129',
    names: ['rouge allura', 'allura red'],
    tier: 2,
    category: 'colorant',
    concern: 'Azo dye — linked to hyperactivity in children',
  },
  {
    e_number: 'E320',
    names: ['bha', 'butylhydroxyanisol'],
    tier: 2,
    category: 'antioxidant',
    concern: 'Suspected endocrine disruptor, IARC Group 2B',
  },
  {
    e_number: 'E321',
    names: ['bht', 'butylhydroxytoluène'],
    tier: 2,
    category: 'antioxidant',
    concern: 'Suspected endocrine disruptor',
  },
  {
    e_number: 'E951',
    names: ['aspartame'],
    tier: 2,
    category: 'sweetener',
    concern: 'IARC Group 2B (2023) — possible carcinogen; avoid in phenylketonuria',
  },
  {
    e_number: 'E150',
    names: ['caramel', 'colorant caramel', 'e150a', 'e150b', 'e150c', 'e150d'],
    tier: 2,
    category: 'colorant',
    concern: 'E150c/d contain 4-MEI — IARC Group 2B (possible carcinogen)',
  },

  // ===== TIER 3: Minor/contextual =====
  {
    e_number: 'E407',
    names: ['carraghénane', 'carrageenan'],
    tier: 3,
    category: 'thickener',
    concern: 'Potential intestinal inflammation in susceptible individuals',
  },
  {
    e_number: 'E471',
    names: ['mono- et diglycérides d\'acides gras'],
    tier: 3,
    category: 'emulsifier',
    concern: 'Ubiquitous emulsifier — microbiome concerns at high chronic doses',
  },
  {
    e_number: 'E621',
    names: ['glutamate monosodique', 'monosodium glutamate', 'msg'],
    tier: 3,
    category: 'flavor_enhancer',
    concern: 'Flavor enhancer — sensitivity in some individuals; generally regarded as safe',
  },
  {
    e_number: 'E316',
    names: ['érythorbate de sodium', 'sodium erythorbate'],
    tier: 3,
    category: 'antioxidant',
    concern: 'Generally safe but signals processed meat curing system',
  },
  {
    e_number: 'E100',
    names: ['curcumine', 'curcuma (colorant)'],
    tier: 3,
    category: 'colorant',
    concern: 'Natural colorant — low health concern, but signals cosmetic processing',
  },
  {
    e_number: 'E160c',
    names: ['paprika (colorant)', 'extrait de paprika', 'oléorésine de paprika'],
    tier: 3,
    category: 'colorant',
    concern: 'Natural colorant — low health concern, but signals cosmetic processing',
  },
];

/**
 * Cosmetic additive categories (trigger processing penalty).
 */
export const COSMETIC_ADDITIVE_CATEGORIES = new Set([
  'colorant',
  'flavor_enhancer',
  'artificial_sweetener',
]);

/**
 * Normalize a string for matching (lowercase, strip accents, collapse spaces).
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find additive info from an ingredient name or E-number.
 */
export function findAdditive(ingredient: Ingredient): AdditiveInfo | null {
  const { e_number, name, category } = ingredient;

  // Direct E-number match
  if (e_number) {
    const norm = e_number.toUpperCase().replace(/\s/g, '');
    const match = ADDITIVES_DB.find((a) => a.e_number === norm);
    if (match) return match;
  }

  // Name-based match
  const normName = normalize(name);
  for (const additive of ADDITIVES_DB) {
    for (const synonym of additive.names) {
      if (normName.includes(normalize(synonym))) {
        return additive;
      }
    }
  }

  // Context-aware match: if explicitly flagged as additive, check natural colorant keywords
  if (category === 'additive') {
    const naturalColorants: Record<string, string> = {
      'curcuma': 'E100',
      'curcumin': 'E100',
      'paprika': 'E160c',
      'betterave': 'E162',
      'carmin': 'E120',
      'cochenille': 'E120',
      'caramel': 'E150',
    };
    for (const [keyword, eNum] of Object.entries(naturalColorants)) {
      if (normName.includes(keyword)) {
        const match = ADDITIVES_DB.find((a) => a.e_number === eNum);
        if (match) return match;
      }
    }
  }

  return null;
}

// ============================================================================
// SECTION 3: CATEGORY THRESHOLDS
// ============================================================================
// Per-100g scoring thresholds. These define what "good" looks like for each
// food category. Judging a cheese against sandwich fiber thresholds would be
// unfair.
// ============================================================================

export interface CategoryThresholds {
  protein_g: [number, number, number];       // low / medium / high breakpoints
  fiber_g: [number, number, number];
  expected_kcal_range: [number, number];
  expect_micronutrients: boolean;
}

const DEFAULT_THRESHOLDS: CategoryThresholds = {
  protein_g: [3, 6, 12],
  fiber_g: [1.5, 3, 6],
  expected_kcal_range: [50, 400],
  expect_micronutrients: false,
};

export const CATEGORY_THRESHOLDS: Record<ProductCategory, CategoryThresholds> = {
  sandwich:         { protein_g: [5, 8, 12],   fiber_g: [2, 4, 6],  expected_kcal_range: [180, 320], expect_micronutrients: true  },
  ready_meal:       { protein_g: [4, 7, 10],   fiber_g: [2, 4, 6],  expected_kcal_range: [80, 200],  expect_micronutrients: true  },
  bread:            { protein_g: [6, 9, 12],   fiber_g: [3, 6, 9],  expected_kcal_range: [220, 300], expect_micronutrients: false },
  breakfast_cereal: { protein_g: [6, 10, 14],  fiber_g: [5, 8, 12], expected_kcal_range: [320, 420], expect_micronutrients: true  },
  yogurt:           { protein_g: [3, 5, 9],    fiber_g: [0, 1, 2],  expected_kcal_range: [40, 120],  expect_micronutrients: true  },
  cheese:           { protein_g: [15, 20, 25], fiber_g: [0, 0, 0],  expected_kcal_range: [200, 450], expect_micronutrients: true  },
  processed_meat:   { protein_g: [10, 15, 22], fiber_g: [0, 0, 1],  expected_kcal_range: [100, 400], expect_micronutrients: false },
  fresh_meat:       { protein_g: [15, 20, 25], fiber_g: [0, 0, 0],  expected_kcal_range: [100, 300], expect_micronutrients: true  },
  fish:             { protein_g: [15, 20, 25], fiber_g: [0, 0, 0],  expected_kcal_range: [80, 250],  expect_micronutrients: true  },
  snack_sweet:      { protein_g: [4, 7, 10],   fiber_g: [2, 4, 6],  expected_kcal_range: [350, 550], expect_micronutrients: false },
  snack_salty:      { protein_g: [6, 9, 14],   fiber_g: [3, 5, 8],  expected_kcal_range: [400, 550], expect_micronutrients: false },
  beverage_soft:    { protein_g: [0, 0, 0],    fiber_g: [0, 0, 0],  expected_kcal_range: [0, 50],    expect_micronutrients: false },
  beverage_juice:   { protein_g: [0, 0, 0],    fiber_g: [0, 1, 2],  expected_kcal_range: [20, 60],   expect_micronutrients: true  },
  beverage_water:   { protein_g: [0, 0, 0],    fiber_g: [0, 0, 0],  expected_kcal_range: [0, 5],     expect_micronutrients: false },
  condiment:        { protein_g: [0, 3, 7],    fiber_g: [0, 1, 3],  expected_kcal_range: [20, 400],  expect_micronutrients: false },
  oil_fat:          { protein_g: [0, 0, 0],    fiber_g: [0, 0, 0],  expected_kcal_range: [700, 900], expect_micronutrients: false },
  other:            DEFAULT_THRESHOLDS,
};

export function getThresholds(cat: ProductCategory): CategoryThresholds {
  return CATEGORY_THRESHOLDS[cat] ?? DEFAULT_THRESHOLDS;
}

// ============================================================================
// SECTION 4: SHARED KEYWORD CONSTANTS
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
  // Animal
  'oeuf', 'œuf', 'poisson', 'saumon', 'thon', 'sardine', 'maquereau',
  'poulet', 'boeuf', 'porc', 'viande', 'dinde', 'canard', 'agneau',
  'jambon',
  // Dairy / other
  'fromage', 'lait', 'yaourt', 'skyr', 'eau', 'miel',
  'légume', 'legume',
];

const HIDDEN_SUGAR_NAMES = [
  'dextrose', 'maltodextrine', 'maltodextrin', 'sirop de glucose',
  'sirop de maïs', 'sirop de mais', 'glucose syrup', 'fructose',
  'saccharose', 'sucrose', 'sirop de fructose', 'sirop de glucose-fructose',
  'sucre inverti', 'lactose', 'mélasse', 'melasse', 'sirop d\'agave',
  'isoglucose', 'concentré de jus',
];

const GENERIC_OIL_TERMS = [
  'huile végétale', 'huile vegetale', 'vegetable oil',
  'matière grasse végétale', 'matiere grasse vegetale',
  'graisse végétale', 'graisse vegetale',
];

// ============================================================================
// SECTION 5: PILLAR 1 — PROCESSING LEVEL (max 20)
// ============================================================================
// Based on NOVA classification, the strongest single predictor of adverse
// health outcomes in longitudinal studies (Monteiro, Srour, Elizabeth et al.).
//
// Modifiers:
//  - −2 if >10 ingredients
//  - −2 if contains cosmetic additives
// ============================================================================

export function scoreProcessing(product: ProductInput): PillarScore {
  const MAX = 20;
  const deductions: Deduction[] = [];
  const bonuses: Deduction[] = [];

  let base: number;
  switch (product.nova_class) {
    case 1: base = 20; break;
    case 2: base = 17; break;
    case 3: base = 12; break;
    case 4: base = 4; break;
  }

  deductions.push({
    pillar: 'processing',
    reason: `NOVA class ${product.nova_class} base score`,
    points: base - MAX,
    severity: product.nova_class === 4 ? 'major' : product.nova_class === 3 ? 'moderate' : 'info',
  });

  let score = base;

  if (product.ingredients.length > 10) {
    score -= 2;
    deductions.push({
      pillar: 'processing',
      reason: `${product.ingredients.length} ingredients (>10 threshold)`,
      points: -2,
      severity: 'minor',
    });
  }

  const cosmeticAdditives = product.ingredients
    .map((ing) => findAdditive(ing))
    .filter((a): a is AdditiveInfo => a !== null && COSMETIC_ADDITIVE_CATEGORIES.has(a.category));

  if (cosmeticAdditives.length > 0) {
    score -= 2;
    deductions.push({
      pillar: 'processing',
      reason: 'Contains cosmetic additives (colorants, flavor enhancers, etc.)',
      points: -2,
      severity: 'minor',
      evidence: cosmeticAdditives.map((a) => `${a.e_number} (${a.category})`).join(', '),
    });
  }

  return {
    name: 'Processing Level',
    max: MAX,
    score: Math.max(0, score),
    deductions,
    bonuses,
  };
}

// ============================================================================
// SECTION 6: PILLAR 2 — NUTRITIONAL DENSITY (max 25)
// ============================================================================
// Components:
//  - Protein quality & quantity (0–6)
//  - Fiber content (0–5)
//  - Micronutrient contribution (0–5)
//  - Healthy fats ratio (0–5)
//  - Satiety / glycemic quality (0–4)
// ============================================================================

export function scoreNutritionalDensity(product: ProductInput): PillarScore {
  const MAX = 25;
  const deductions: Deduction[] = [];
  const bonuses: Deduction[] = [];
  const { nutrition, category, ingredients } = product;
  const thresholds = getThresholds(category);

  // ---- 1. Protein (0–6) ----
  const [, pMed, pHigh] = thresholds.protein_g;
  const pLow = thresholds.protein_g[0];
  let proteinScore = 0;
  if (pHigh === 0) {
    proteinScore = 3; // Category doesn't expect protein — neutral credit
  } else if (nutrition.protein_g >= pHigh) proteinScore = 6;
  else if (nutrition.protein_g >= pMed) proteinScore = 4;
  else if (nutrition.protein_g >= pLow) proteinScore = 2;

  if (proteinScore < 6) {
    deductions.push({
      pillar: 'nutritional_density',
      reason: `Protein ${nutrition.protein_g}g/100g (${proteinScore}/6 for category ${category})`,
      points: proteinScore - 6,
      severity: proteinScore === 0 ? 'moderate' : 'minor',
    });
  } else {
    bonuses.push({
      pillar: 'nutritional_density',
      reason: `High protein content: ${nutrition.protein_g}g/100g`,
      points: 6,
      severity: 'info',
    });
  }

  // ---- 2. Fiber (0–5) ----
  const [fLow, fMed, fHigh] = thresholds.fiber_g;
  let fiberScore = 0;
  if (fHigh === 0) {
    fiberScore = 3; // Category doesn't expect fiber — neutral credit
  } else if (nutrition.fiber_g >= fHigh) fiberScore = 5;
  else if (nutrition.fiber_g >= fMed) fiberScore = 3;
  else if (nutrition.fiber_g >= fLow) fiberScore = 1;

  if (fiberScore < 5 && fHigh > 0) {
    deductions.push({
      pillar: 'nutritional_density',
      reason: `Fiber ${nutrition.fiber_g}g/100g (${fiberScore}/5 for category ${category})`,
      points: fiberScore - 5,
      severity: fiberScore === 0 ? 'moderate' : 'minor',
    });
  }

  // ---- 3. Micronutrient contribution (0–5) ----
  // Heuristic: weighted by percentage of whole foods present.
  const wholeFoods = ingredients.filter((ing) => {
    const n = ing.name.toLowerCase();
    return ing.is_whole_food || WHOLE_FOOD_KEYWORDS.some((kw) => n.includes(kw));
  });

  let microScore: number;
  const declaredPcts = wholeFoods
    .map((w) => w.percentage)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  if (declaredPcts.length > 0) {
    const totalPct = declaredPcts.reduce((a, b) => a + b, 0);
    if (totalPct >= 30) microScore = 5;
    else if (totalPct >= 20) microScore = 4;
    else if (totalPct >= 12) microScore = 3;
    else if (totalPct >= 5) microScore = 2;
    else microScore = 1;
  } else {
    microScore = Math.min(5, wholeFoods.length);
  }

  // If category doesn't expect micronutrients, cap at 3 (so beverages can't score >3).
  if (!thresholds.expect_micronutrients) microScore = Math.min(microScore, 3);

  if (microScore < 5) {
    const reason = declaredPcts.length > 0
      ? `Whole foods = ${declaredPcts.reduce((a, b) => a + b, 0).toFixed(1)}% of product (${microScore}/5)`
      : `${wholeFoods.length} recognizable whole-food ingredients (${microScore}/5)`;
    deductions.push({
      pillar: 'nutritional_density',
      reason,
      points: microScore - 5,
      severity: 'minor',
    });
  }

  // ---- 4. Healthy fats ratio (0–5) ----
  let fatScore = 5;
  if ((nutrition.trans_fat_g ?? 0) > 0.1) {
    fatScore = 0;
  } else if (nutrition.fat_g === 0) {
    fatScore = 3; // No fat — can't evaluate quality, give neutral
  } else {
    const satRatio = nutrition.saturated_fat_g / nutrition.fat_g;
    if (satRatio > 0.5) fatScore = 1;
    else if (satRatio > 0.33) fatScore = 3;
    else if (satRatio > 0.2) fatScore = 4;
    else fatScore = 5;
  }

  if (fatScore < 5) {
    deductions.push({
      pillar: 'nutritional_density',
      reason: `Sat fat ratio unfavorable (${nutrition.saturated_fat_g}g sat / ${nutrition.fat_g}g total)`,
      points: fatScore - 5,
      severity: fatScore === 0 ? 'critical' : 'minor',
    });
  }

  // ---- 5. Satiety / glycemic quality (0–4) ----
  const satietySignal = nutrition.protein_g + nutrition.fiber_g * 2 - nutrition.sugars_g;
  let satietyScore: number;
  if (satietySignal >= 10) satietyScore = 4;
  else if (satietySignal >= 5) satietyScore = 3;
  else if (satietySignal >= 0) satietyScore = 2;
  else if (satietySignal >= -5) satietyScore = 1;
  else satietyScore = 0;

  if (satietyScore < 4) {
    deductions.push({
      pillar: 'nutritional_density',
      reason: `Satiety index: P${nutrition.protein_g} + 2×F${nutrition.fiber_g} − S${nutrition.sugars_g} = ${satietySignal.toFixed(1)} (${satietyScore}/4)`,
      points: satietyScore - 4,
      severity: 'minor',
    });
  }

  const totalScore = proteinScore + fiberScore + microScore + fatScore + satietyScore;

  return {
    name: 'Nutritional Density',
    max: MAX,
    score: Math.max(0, Math.min(MAX, totalScore)),
    deductions,
    bonuses,
  };
}

// ============================================================================
// SECTION 7: PILLAR 3 — NEGATIVE NUTRIENTS (max 25, penalty-based)
// ============================================================================
// Start at 25, subtract based on WHO and FSA thresholds.
// ============================================================================

export function scoreNegativeNutrients(product: ProductInput): PillarScore {
  const MAX = 25;
  const deductions: Deduction[] = [];
  const bonuses: Deduction[] = [];
  const { nutrition, category } = product;
  const thresholds = getThresholds(category);

  let score = MAX;

  // ---- Saturated fat ----
  const sat = nutrition.saturated_fat_g;
  if (sat > 15) {
    score -= 9;
    deductions.push({
      pillar: 'negative_nutrients',
      reason: `Saturated fat ${sat}g/100g (>15g critical threshold)`,
      points: -9,
      severity: 'critical',
    });
  } else if (sat > 10) {
    score -= 6;
    deductions.push({
      pillar: 'negative_nutrients',
      reason: `Saturated fat ${sat}g/100g (>10g major threshold)`,
      points: -6,
      severity: 'major',
    });
  } else if (sat > 5) {
    score -= 3;
    deductions.push({
      pillar: 'negative_nutrients',
      reason: `Saturated fat ${sat}g/100g (>5g moderate threshold)`,
      points: -3,
      severity: 'moderate',
    });
  }

  // ---- Added sugars (or total sugars as fallback) ----
  const sugars = nutrition.added_sugars_g ?? nutrition.sugars_g;
  const sugarLabel = nutrition.added_sugars_g != null ? 'Added sugars' : 'Total sugars (added not declared)';
  if (sugars > 22.5) {
    score -= 12;
    deductions.push({ pillar: 'negative_nutrients', reason: `${sugarLabel} ${sugars}g/100g (>22.5g critical)`, points: -12, severity: 'critical' });
  } else if (sugars > 15) {
    score -= 9;
    deductions.push({ pillar: 'negative_nutrients', reason: `${sugarLabel} ${sugars}g/100g (>15g major)`, points: -9, severity: 'major' });
  } else if (sugars > 10) {
    score -= 6;
    deductions.push({ pillar: 'negative_nutrients', reason: `${sugarLabel} ${sugars}g/100g (>10g moderate)`, points: -6, severity: 'moderate' });
  } else if (sugars > 5) {
    score -= 3;
    deductions.push({ pillar: 'negative_nutrients', reason: `${sugarLabel} ${sugars}g/100g (>5g minor)`, points: -3, severity: 'minor' });
  }

  // ---- Salt ----
  const salt = nutrition.salt_g;
  if (salt > 1.5) {
    score -= 6;
    deductions.push({ pillar: 'negative_nutrients', reason: `Salt ${salt}g/100g (>1.5g critical)`, points: -6, severity: 'major' });
  } else if (salt > 1.25) {
    score -= 4;
    deductions.push({ pillar: 'negative_nutrients', reason: `Salt ${salt}g/100g (>1.25g moderate)`, points: -4, severity: 'moderate' });
  } else if (salt > 0.75) {
    score -= 2;
    deductions.push({ pillar: 'negative_nutrients', reason: `Salt ${salt}g/100g (>0.75g minor)`, points: -2, severity: 'minor' });
  }

  // ---- Trans fats ----
  const trans = nutrition.trans_fat_g ?? 0;
  if (trans > 0.1) {
    score -= 10;
    deductions.push({
      pillar: 'negative_nutrients',
      reason: `Trans fat present: ${trans}g/100g (no safe level)`,
      points: -10,
      severity: 'critical',
    });
  }

  // ---- Calorie density anomaly ----
  const [kcalLow, kcalHigh] = thresholds.expected_kcal_range;
  if (nutrition.energy_kcal > kcalHigh * 1.25 || nutrition.energy_kcal < kcalLow * 0.5) {
    score -= 2;
    deductions.push({
      pillar: 'negative_nutrients',
      reason: `Energy ${nutrition.energy_kcal} kcal/100g outside category norm (${kcalLow}–${kcalHigh})`,
      points: -2,
      severity: 'minor',
    });
  }

  return {
    name: 'Negative Nutrients',
    max: MAX,
    score: Math.max(0, score),
    deductions,
    bonuses,
  };
}

// ============================================================================
// SECTION 8: PILLAR 4 — ADDITIVE RISK (max 15, penalty-based)
// ============================================================================
// Start at 15, subtract based on additive tier:
//  - Tier 1 (serious):  −5 each, capped at −10 total
//  - Tier 2 (moderate): −2 each, capped at −6 total
//  - Tier 3 (minor):    −1 each, capped at −3 total
// ============================================================================

export function scoreAdditiveRisk(product: ProductInput): PillarScore {
  const MAX = 15;
  const deductions: Deduction[] = [];
  const bonuses: Deduction[] = [];

  const tier1Hits: Array<{ ingredient: string; additive: string; concern: string }> = [];
  const tier2Hits: Array<{ ingredient: string; additive: string; concern: string }> = [];
  const tier3Hits: Array<{ ingredient: string; additive: string; concern: string }> = [];

  for (const ing of product.ingredients) {
    const additive = findAdditive(ing);
    if (!additive) continue;

    const hit = {
      ingredient: ing.name,
      additive: additive.e_number,
      concern: additive.concern,
    };

    if (additive.tier === 1) tier1Hits.push(hit);
    else if (additive.tier === 2) tier2Hits.push(hit);
    else tier3Hits.push(hit);
  }

  let score = MAX;

  if (tier1Hits.length > 0) {
    const penalty = Math.min(10, tier1Hits.length * 5);
    score -= penalty;
    deductions.push({
      pillar: 'additive_risk',
      reason: `${tier1Hits.length} Tier-1 additive${tier1Hits.length > 1 ? 's' : ''} (serious concern)`,
      points: -penalty,
      severity: 'critical',
      evidence: tier1Hits.map((h) => `${h.additive} (${h.ingredient}): ${h.concern}`).join(' | '),
    });
  }

  if (tier2Hits.length > 0) {
    const penalty = Math.min(6, tier2Hits.length * 2);
    score -= penalty;
    deductions.push({
      pillar: 'additive_risk',
      reason: `${tier2Hits.length} Tier-2 additive${tier2Hits.length > 1 ? 's' : ''} (moderate concern)`,
      points: -penalty,
      severity: 'moderate',
      evidence: tier2Hits.map((h) => `${h.additive} (${h.ingredient}): ${h.concern}`).join(' | '),
    });
  }

  if (tier3Hits.length > 0) {
    const penalty = Math.min(3, tier3Hits.length * 1);
    score -= penalty;
    deductions.push({
      pillar: 'additive_risk',
      reason: `${tier3Hits.length} Tier-3 additive${tier3Hits.length > 1 ? 's' : ''} (minor concern)`,
      points: -penalty,
      severity: 'minor',
      evidence: tier3Hits.map((h) => `${h.additive} (${h.ingredient}): ${h.concern}`).join(' | '),
    });
  }

  return {
    name: 'Additive Risk',
    max: MAX,
    score: Math.max(0, score),
    deductions,
    bonuses,
  };
}

export function countTier1Additives(product: ProductInput): number {
  return product.ingredients
    .map((ing) => findAdditive(ing))
    .filter((a) => a !== null && a.tier === 1).length;
}

// ============================================================================
// SECTION 9: PILLAR 5 — INGREDIENT INTEGRITY (max 15)
// ============================================================================
// Components:
//  - First 3 ingredients are whole foods: +5
//  - Recognizable ingredients (>80%): +3
//  - Origin transparency: +2
//  - No hidden/multi-named sugars: +2
//  - Named oils: +3
// ============================================================================

function isWholeFood(name: string, isFlag: boolean | undefined): boolean {
  if (isFlag === true) return true;
  const lower = name.toLowerCase();
  if (/sirop|huile|farine raffinée|amidon modifié|isolat|concentré/i.test(lower)) return false;
  return WHOLE_FOOD_KEYWORDS.some((kw) => lower.includes(kw));
}

export function scoreIngredientIntegrity(product: ProductInput): PillarScore {
  const MAX = 15;
  const deductions: Deduction[] = [];
  const bonuses: Deduction[] = [];

  let score = 0;

  // ---- 1. First 3 ingredients whole foods (+5) ----
  const first3 = product.ingredients.slice(0, 3);
  const first3Whole = first3.filter((ing) => isWholeFood(ing.name, ing.is_whole_food)).length;
  const first3Score = Math.round((first3Whole / 3) * 5);
  score += first3Score;
  if (first3Score < 5) {
    deductions.push({
      pillar: 'ingredient_integrity',
      reason: `Only ${first3Whole}/3 of first ingredients are whole foods (${first3Score}/5)`,
      points: first3Score - 5,
      severity: 'moderate',
    });
  } else {
    bonuses.push({
      pillar: 'ingredient_integrity',
      reason: 'First 3 ingredients are all whole foods',
      points: 5,
      severity: 'info',
    });
  }

  // ---- 2. Overall recognizability (+3) ----
  const nonAdditive = product.ingredients.filter((ing) => !findAdditive(ing));
  const recognizable = nonAdditive.filter((ing) => {
    const n = ing.name.toLowerCase();
    return n.length < 40 && !/isolat|hydrolysat|concentré|modifié|extrait sec/i.test(n);
  }).length;
  const recogRatio = nonAdditive.length > 0 ? recognizable / nonAdditive.length : 1;
  const recogScore = recogRatio >= 0.8 ? 3 : recogRatio >= 0.6 ? 2 : recogRatio >= 0.4 ? 1 : 0;
  score += recogScore;
  if (recogScore < 3) {
    deductions.push({
      pillar: 'ingredient_integrity',
      reason: `${(recogRatio * 100).toFixed(0)}% of ingredients are recognizable (${recogScore}/3)`,
      points: recogScore - 3,
      severity: 'minor',
    });
  }

  // ---- 3. Origin transparency (+2) ----
  if (product.origin_transparent || product.origin) {
    score += 2;
    bonuses.push({
      pillar: 'ingredient_integrity',
      reason: `Origin declared: ${product.origin ?? 'transparent'}`,
      points: 2,
      severity: 'info',
    });
  } else {
    deductions.push({
      pillar: 'ingredient_integrity',
      reason: 'No origin information',
      points: -2,
      severity: 'minor',
    });
  }

  // ---- 4. Hidden sugars (+2) ----
  const sugarAliases = new Set<string>();
  for (const ing of product.ingredients) {
    const n = ing.name.toLowerCase();
    for (const alias of HIDDEN_SUGAR_NAMES) {
      if (n.includes(alias)) sugarAliases.add(alias);
    }
    if (/^sucre/i.test(ing.name.trim())) sugarAliases.add('sucre');
  }

  if (sugarAliases.size >= 2) {
    deductions.push({
      pillar: 'ingredient_integrity',
      reason: `${sugarAliases.size} distinct sugar sources detected: ${Array.from(sugarAliases).join(', ')}`,
      points: -2,
      severity: 'moderate',
    });
  } else {
    score += 2;
    bonuses.push({
      pillar: 'ingredient_integrity',
      reason: sugarAliases.size === 1 ? 'Single transparent sugar source' : 'No hidden sugars',
      points: 2,
      severity: 'info',
    });
  }

  // ---- 5. Named oils (+3) ----
  const hasGenericOil = product.ingredients.some((ing) => {
    const n = ing.name.toLowerCase();
    return GENERIC_OIL_TERMS.some((g) => n.includes(g));
  });
  if (product.named_oils !== false && !hasGenericOil) {
    score += 3;
    bonuses.push({
      pillar: 'ingredient_integrity',
      reason: 'Oils are specifically named (not generic "vegetable oil")',
      points: 3,
      severity: 'info',
    });
  } else {
    deductions.push({
      pillar: 'ingredient_integrity',
      reason: 'Generic "vegetable oil" used instead of specific named oil',
      points: -3,
      severity: 'minor',
    });
  }

  return {
    name: 'Ingredient Integrity',
    max: MAX,
    score: Math.max(0, Math.min(MAX, score)),
    deductions,
    bonuses,
  };
}

// ============================================================================
// SECTION 10: GLOBAL MODIFIERS, VETOES & MAIN ORCHESTRATOR
// ============================================================================

export const ENGINE_VERSION = '2.0.0';

function scoreToGrade(score: number): Grade {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function gradeVerdict(grade: Grade): string {
  switch (grade) {
    case 'A+': return 'Excellent — daily staple potential';
    case 'A':  return 'Good — regular consumption fine';
    case 'B':  return 'Acceptable — moderate frequency';
    case 'C':  return 'Mediocre — occasional only';
    case 'D':  return 'Poor — avoid regular use';
    case 'F':  return 'Very poor — avoid';
  }
}

function computeGlobalBonuses(product: ProductInput): Deduction[] {
  const bonuses: Deduction[] = [];
  if (product.organic) {
    bonuses.push({ pillar: 'global_bonus', reason: 'Organic certification', points: 2, severity: 'info' });
  }
  if (product.whole_grain_primary) {
    bonuses.push({ pillar: 'global_bonus', reason: 'Whole grain as primary grain', points: 3, severity: 'info' });
  }
  if (product.fermented) {
    bonuses.push({ pillar: 'global_bonus', reason: 'Contains fermented / probiotic content', points: 2, severity: 'info' });
  }
  return bonuses;
}

function computeGlobalPenalties(product: ProductInput): Deduction[] {
  const penalties: Deduction[] = [];
  if (product.has_misleading_marketing) {
    penalties.push({
      pillar: 'global_penalty',
      reason: 'Misleading marketing claims (e.g., "natural" / "light" unjustified)',
      points: -2,
      severity: 'moderate',
    });
  }
  if (product.has_health_claims) {
    penalties.push({
      pillar: 'global_penalty',
      reason: 'Health claims present — verify vs composition',
      points: -3,
      severity: 'moderate',
    });
  }
  return penalties;
}

function checkVeto(product: ProductInput): VetoCondition {
  const { nutrition, category, ingredients } = product;

  // Trans fats — no safe level
  if ((nutrition.trans_fat_g ?? 0) > 0.1) {
    return { triggered: true, reason: 'Contains industrial trans fats — no safe level', cap: 40 };
  }

  // >3 Tier-1 additives
  const tier1Count = countTier1Additives(product);
  if (tier1Count > 3) {
    return { triggered: true, reason: `${tier1Count} Tier-1 additives — cumulative risk too high`, cap: 40 };
  }

  // Processed meat combo: nitrites + high salt + refined starch
  const hasNitrites = ingredients.some((ing) => {
    const n = ing.name.toLowerCase();
    return n.includes('nitrite') || n.includes('e249') || n.includes('e250');
  });
  const highSalt = nutrition.salt_g > 1.5;
  const refined = ingredients.some((ing) => /farine de blé|farine raffinée|amidon|dextrose/i.test(ing.name.toLowerCase()));

  if (hasNitrites && highSalt && refined && category === 'processed_meat') {
    return { triggered: true, reason: 'Processed meat with nitrites + high salt + refined starch combination', cap: 40 };
  }

  // Extreme added sugar outside confectionery
  const isConfectionery = category === 'snack_sweet';
  const sugars = nutrition.added_sugars_g ?? nutrition.sugars_g;
  if (!isConfectionery && sugars > 30) {
    return { triggered: true, reason: 'Added sugar >30g/100g in non-confectionery category', cap: 40 };
  }

  // Sugary beverages with no nutritional contribution
  if (category === 'beverage_soft' && sugars > 5 && nutrition.protein_g < 1 && nutrition.fiber_g < 1) {
    return { triggered: true, reason: 'Sugar-sweetened beverage with no nutritional contribution', cap: 30 };
  }

  // Ultra-processed meat reconstructions
  const hasMechanicallySeparated = ingredients.some((ing) =>
    /séparée mécaniquement|mechanically separated|msm/i.test(ing.name)
  );
  if (hasMechanicallySeparated && product.nova_class === 4) {
    return { triggered: true, reason: 'Mechanically separated meat in NOVA 4 product — low meat quality', cap: 45 };
  }

  return { triggered: false, reason: '', cap: 100 };
}

function buildFlags(audit: Omit<ScoreAudit, 'red_flags' | 'green_flags'>): {
  red: string[];
  green: string[];
} {
  const red: string[] = [];
  const green: string[] = [];

  const allDeductions = [
    ...audit.pillars.processing.deductions,
    ...audit.pillars.nutritional_density.deductions,
    ...audit.pillars.negative_nutrients.deductions,
    ...audit.pillars.additive_risk.deductions,
    ...audit.pillars.ingredient_integrity.deductions,
    ...audit.global_penalties,
  ];
  const allBonuses = [
    ...audit.pillars.processing.bonuses,
    ...audit.pillars.nutritional_density.bonuses,
    ...audit.pillars.negative_nutrients.bonuses,
    ...audit.pillars.additive_risk.bonuses,
    ...audit.pillars.ingredient_integrity.bonuses,
    ...audit.global_bonuses,
  ];

  for (const d of allDeductions) {
    if (d.severity === 'critical' || d.severity === 'major') red.push(d.reason);
  }
  for (const b of allBonuses) {
    if (b.points >= 2) green.push(b.reason);
  }

  if (audit.veto.triggered) {
    red.unshift(`VETO: ${audit.veto.reason}`);
  }

  return { red, green };
}

function collectWarnings(product: ProductInput): string[] {
  const warnings: string[] = [];
  if (product.nutrition.trans_fat_g == null) {
    warnings.push('trans_fat_g not declared — assumed 0');
  }
  if (product.nutrition.added_sugars_g == null) {
    warnings.push('added_sugars_g not declared — using total sugars as proxy');
  }
  return warnings;
}

/**
 * ============================================================================
 * MAIN SCORING FUNCTION
 * ============================================================================
 * Takes a structured ProductInput, returns full ScoreAudit.
 *
 * Pure synchronous function — no I/O, no side effects.
 * ============================================================================
 */
export function scoreProduct(product: ProductInput): ScoreAudit {
  const processing = scoreProcessing(product);
  const nutritional_density = scoreNutritionalDensity(product);
  const negative_nutrients = scoreNegativeNutrients(product);
  const additive_risk = scoreAdditiveRisk(product);
  const ingredient_integrity = scoreIngredientIntegrity(product);

  // Base sum
  let score =
    processing.score +
    nutritional_density.score +
    negative_nutrients.score +
    additive_risk.score +
    ingredient_integrity.score;

  // Global bonuses (capped at +10)
  const global_bonuses = computeGlobalBonuses(product);
  const bonusTotal = Math.min(10, global_bonuses.reduce((s, b) => s + b.points, 0));

  // Global penalties
  const global_penalties = computeGlobalPenalties(product);
  const penaltyTotal = global_penalties.reduce((s, p) => s + p.points, 0);

  score = score + bonusTotal + penaltyTotal;

  // Clamp 0–100
  score = Math.max(0, Math.min(100, score));

  // Apply veto cap
  const veto = checkVeto(product);
  if (veto.triggered && score > veto.cap) {
    score = veto.cap;
  }

  score = Math.round(score);
  const grade = scoreToGrade(score);

  const preAudit: Omit<ScoreAudit, 'red_flags' | 'green_flags'> = {
    product_name: product.name,
    category: product.category,
    score,
    grade,
    verdict: gradeVerdict(grade),
    pillars: {
      processing,
      nutritional_density,
      negative_nutrients,
      additive_risk,
      ingredient_integrity,
    },
    global_bonuses,
    global_penalties,
    veto,
    engine_version: ENGINE_VERSION,
    warnings: collectWarnings(product),
  };

  const { red, green } = buildFlags(preAudit);

  return {
    ...preAudit,
    red_flags: red,
    green_flags: green,
  };
}
