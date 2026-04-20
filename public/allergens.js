/**
 * Regulatory French allergen detection from ingredient names.
 * The 14 EU-mandatory allergens (Annex II, Regulation 1169/2011).
 */

const RULES = [
  {
    key: 'gluten',
    label_fr: 'Gluten',
    label_en: 'Gluten',
    re: /\b(bl[eé]|froment|seigle|orge|avoine|[eé]peautre|kamut|triticale|semoule de bl[eé]|farine de bl[eé]|farine de seigle|farine d[e']orge|malt|malt d'orge)\b/i,
  },
  {
    key: 'lactose',
    label_fr: 'Lactose / Lait',
    label_en: 'Lactose / Milk',
    re: /\b(lait|lactose|lactos[eé]rum|petit[- ]lait|cr[eè]me|beurre|fromage|yaourt|yoghourt|skyr|kéfir|caséine|caseine|lactalbumine|whey|mati[eè]re grasse laiti[eè]re|poudre de lait)\b/i,
  },
  {
    key: 'eggs',
    label_fr: 'Œufs',
    label_en: 'Eggs',
    re: /\b(oeufs?|œufs?|jaune d'?oeuf|jaune d'?œuf|blanc d'?oeuf|blanc d'?œuf|ovalbumine|lysozyme)\b/i,
  },
  {
    key: 'nuts',
    label_fr: 'Fruits à coque',
    label_en: 'Tree nuts',
    re: /\b(noix|amandes?|noisettes?|pistaches?|cajou|pécan|pecan|noix du br[eé]sil|macadamia)\b/i,
  },
  {
    key: 'peanuts',
    label_fr: 'Arachides',
    label_en: 'Peanuts',
    re: /\b(arachide|cacahu[eè]te|peanut|beurre de cacahu[eè]te)\b/i,
  },
  {
    key: 'soy',
    label_fr: 'Soja',
    label_en: 'Soy',
    re: /\b(soja|tofu|tempeh|edamame|l[eé]cithine de soja)\b/i,
  },
  {
    key: 'fish',
    label_fr: 'Poisson',
    label_en: 'Fish',
    re: /\b(poisson|saumon|thon|cabillaud|merlu|sardine|maquereau|hareng|anchois|morue|bar)\b/i,
  },
  {
    key: 'crustaceans',
    label_fr: 'Crustacés',
    label_en: 'Crustaceans',
    re: /\b(crevette|crabe|homard|langouste|langoustine|écrevisse|crustac[eé])\b/i,
  },
  {
    key: 'molluscs',
    label_fr: 'Mollusques',
    label_en: 'Molluscs',
    re: /\b(hu[iî]tre|moule|coquille|calmar|encornet|poulpe|pétoncle|palourde|bigorneau|bulot|mollusque)\b/i,
  },
  {
    key: 'sesame',
    label_fr: 'Sésame',
    label_en: 'Sesame',
    re: /\b(s[eé]same|tahini|tahin)\b/i,
  },
  {
    key: 'celery',
    label_fr: 'Céleri',
    label_en: 'Celery',
    re: /\b(c[eé]leri|celery)\b/i,
  },
  {
    key: 'mustard',
    label_fr: 'Moutarde',
    label_en: 'Mustard',
    re: /\b(moutarde|graines? de moutarde|mustard)\b/i,
  },
  {
    key: 'sulfites',
    label_fr: 'Sulfites',
    label_en: 'Sulfites',
    re: /\b(sulfites?|dioxyde de soufre|anhydride sulfureux|E22[0-8]|m[eé]tabisulfite|bisulfite)\b/i,
  },
  {
    key: 'lupin',
    label_fr: 'Lupin',
    label_en: 'Lupin',
    re: /\b(lupin|farine de lupin)\b/i,
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
