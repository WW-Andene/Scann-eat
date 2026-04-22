/**
 * Regulatory French allergen detection from ingredient names.
 * The 14 EU-mandatory allergens (Annex II, Regulation 1169/2011).
 *
 * ============================================================================
 * Word-boundary note:
 *
 * Accented characters ("blé", "céleri", "crème") are NOT ASCII word
 * characters, so JavaScript's `\b` metacharacter treats the position right
 * after "é" as a non-word→non-word transition (no boundary). That meant
 * every rule ending on an accented letter — gluten (blé), sesame (sésame),
 * celery (céleri), etc. — silently failed to match the most common French
 * spellings. This was a shipped bug: real allergens went undetected.
 *
 * Fix: replace `\b...\b` with explicit negative lookbehind / lookahead that
 * treat both ASCII letters AND Latin-1 accented letters (à-ÿ) as word-like.
 * Tested against both positives and false-positive traps (maltodextrine
 * must NOT trigger malt).
 * ============================================================================
 */

// Word-like character class: ASCII a-z + Latin-1 accented letters. Used on
// both sides of each alternation to simulate a Unicode-aware \b.
const W = '[a-zà-ÿ]';

const RULES = [
  {
    key: 'gluten',
    label_fr: 'Gluten',
    label_en: 'Gluten',
    re: new RegExp(`(?<!${W})(bl[eé]|froment|seigle|orge|avoine|[eé]peautre|kamut|triticale|semoule de bl[eé]|farine de bl[eé]|farine de seigle|farine d[e']orge|malt|malt d'orge)(?!${W})`, 'i'),
  },
  {
    key: 'lactose',
    label_fr: 'Lactose / Lait',
    label_en: 'Lactose / Milk',
    re: new RegExp(`(?<!${W})(lait|lactose|lactos[eé]rum|petit[- ]lait|cr[eè]me|beurre|fromage|yaourt|yoghourt|skyr|kéfir|caséine|caseine|lactalbumine|whey|mati[eè]re grasse laiti[eè]re|poudre de lait)(?!${W})`, 'i'),
  },
  {
    key: 'eggs',
    label_fr: 'Œufs',
    label_en: 'Eggs',
    re: new RegExp(`(?<!${W})(oeufs?|œufs?|jaune d'?oeuf|jaune d'?œuf|blanc d'?oeuf|blanc d'?œuf|ovalbumine|lysozyme)(?!${W})`, 'i'),
  },
  {
    key: 'nuts',
    label_fr: 'Fruits à coque',
    label_en: 'Tree nuts',
    re: new RegExp(`(?<!${W})(noix|amandes?|noisettes?|pistaches?|cajou|pécan|pecan|noix du br[eé]sil|macadamia)(?!${W})`, 'i'),
  },
  {
    key: 'peanuts',
    label_fr: 'Arachides',
    label_en: 'Peanuts',
    re: new RegExp(`(?<!${W})(arachide|cacahu[eè]te|peanut|beurre de cacahu[eè]te)(?!${W})`, 'i'),
  },
  {
    key: 'soy',
    label_fr: 'Soja',
    label_en: 'Soy',
    re: new RegExp(`(?<!${W})(soja|tofu|tempeh|edamame|l[eé]cithine de soja)(?!${W})`, 'i'),
  },
  {
    key: 'fish',
    label_fr: 'Poisson',
    label_en: 'Fish',
    re: new RegExp(`(?<!${W})(poisson|saumon|thon|cabillaud|merlu|sardine|maquereau|hareng|anchois|morue|bar)(?!${W})`, 'i'),
  },
  {
    key: 'crustaceans',
    label_fr: 'Crustacés',
    label_en: 'Crustaceans',
    re: new RegExp(`(?<!${W})(crevette|crabe|homard|langouste|langoustine|écrevisse|crustac[eé])(?!${W})`, 'i'),
  },
  {
    key: 'molluscs',
    label_fr: 'Mollusques',
    label_en: 'Molluscs',
    re: new RegExp(`(?<!${W})(hu[iî]tre|moule|coquille|calmar|encornet|poulpe|pétoncle|palourde|bigorneau|bulot|mollusque)(?!${W})`, 'i'),
  },
  {
    key: 'sesame',
    label_fr: 'Sésame',
    label_en: 'Sesame',
    re: new RegExp(`(?<!${W})(s[eé]same|tahini|tahin)(?!${W})`, 'i'),
  },
  {
    key: 'celery',
    label_fr: 'Céleri',
    label_en: 'Celery',
    re: new RegExp(`(?<!${W})(c[eé]leri|celery)(?!${W})`, 'i'),
  },
  {
    key: 'mustard',
    label_fr: 'Moutarde',
    label_en: 'Mustard',
    re: new RegExp(`(?<!${W})(moutarde|graines? de moutarde|mustard)(?!${W})`, 'i'),
  },
  {
    key: 'sulfites',
    label_fr: 'Sulfites',
    label_en: 'Sulfites',
    re: new RegExp(`(?<!${W})(sulfites?|dioxyde de soufre|anhydride sulfureux|E22[0-8]|m[eé]tabisulfite|bisulfite)(?!${W})`, 'i'),
  },
  {
    key: 'lupin',
    label_fr: 'Lupin',
    label_en: 'Lupin',
    re: new RegExp(`(?<!${W})(lupin|farine de lupin)(?!${W})`, 'i'),
  },
];

/**
 * Inspect every ingredient name. Returns unique allergen keys found.
 * Each result carries the human label (FR or EN) and the ingredients that triggered it.
 */
export function detectAllergens(product, lang = 'fr') {
  const hits = new Map(); // key → { key, label, triggers: Set<string> }
  for (const ing of product.ingredients || []) {
    const n = ing.name || '';
    for (const rule of RULES) {
      if (rule.re.test(n)) {
        if (!hits.has(rule.key)) {
          hits.set(rule.key, {
            key: rule.key,
            label: lang === 'en' ? rule.label_en : rule.label_fr,
            triggers: new Set(),
          });
        }
        hits.get(rule.key).triggers.add(n);
      }
    }
  }
  return Array.from(hits.values()).map((h) => ({
    ...h,
    triggers: Array.from(h.triggers),
  }));
}
