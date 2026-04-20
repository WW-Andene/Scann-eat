/**
 * Diet definitions — rule-based compliance checks against a product.
 *
 * Each diet has:
 *   - forbidden: regex patterns on ingredient names that disqualify the product
 *   - preferred (optional): regex patterns that earn a small bonus when present
 *   - macro: optional macronutrient constraint (e.g. ketogenic net carbs)
 *   - note: plain-language rationale shown in the personal-score breakdown
 *
 * AUTHORITATIVE / definitional sources:
 *   - Vegan/Vegetarian: Vegan Society UK (vegan) / Vegetarian Society UK
 *     (lacto-ovo-vegetarian) definitions.
 *   - Ketogenic: net carbs <10 %E, Volek & Phinney clinical ketosis
 *     literature; typical threshold ≤10 g net carbs / 100 g solid food.
 *   - Halal: Qur'anic prohibition of pork and intoxicants (haram 5:3, 5:90).
 *     Verification of "halal-certified slaughter" cannot be done from an
 *     ingredient list alone.
 *   - Kosher: Torah prohibition of pork and shellfish (Leviticus 11),
 *     separation of meat and dairy. Certification required for full
 *     compliance, not detectable from ingredient list alone.
 *   - Gluten-free: EU Commission Regulation (EC) 41/2009 — "gluten-free"
 *     requires ≤20 mg/kg gluten. Detection here is on grain ingredients,
 *     not on trace-contamination claims.
 *   - Low-FODMAP: Monash University Low FODMAP Diet App reference lists.
 */

export const DIET_DEFS = {
  none: {
    label_fr: 'Aucun (score classique)',
    label_en: 'None (classic only)',
  },

  vegetarian: {
    label_fr: 'Végétarien',
    label_en: 'Vegetarian',
    forbidden: [
      /\b(viande|porc|b[oœ]euf|poulet|dinde|canard|agneau|veau|lard|lardon|jambon|saucisse|chorizo|merguez|bacon|boudin|confit|rillette|pat[eé]|foie gras|cro[uû]te de viande|gelati?ne(?! halal)|pr[eé]sure animale|collag[eè]ne|pepsine)\b/i,
      /\b(poisson|saumon|thon|cabillaud|sardine|maquereau|anchois|hareng|crustac[eé]|crevette|homard|crabe|hu[iî]tre|moule|calmar|poulpe)\b/i,
    ],
    note_fr: 'Exclut viande, poisson, crustacés, mollusques, gélatine et présure animale.',
    note_en: 'Excludes meat, fish, shellfish, molluscs, animal gelatin and rennet.',
  },

  vegan: {
    label_fr: 'Végan',
    label_en: 'Vegan',
    forbidden: [
      // Everything in vegetarian's list
      /\b(viande|porc|b[oœ]euf|poulet|dinde|canard|agneau|veau|lard|lardon|jambon|saucisse|chorizo|merguez|bacon|boudin|confit|rillette|pat[eé]|foie gras|gelati?ne(?! halal)|pr[eé]sure animale|collag[eè]ne|pepsine)\b/i,
      /\b(poisson|saumon|thon|cabillaud|sardine|maquereau|anchois|hareng|crustac[eé]|crevette|homard|crabe|hu[iî]tre|moule|calmar|poulpe)\b/i,
      // Plus dairy, eggs, honey, beeswax
      /\b(lait|lactos[eé]rum|petit[- ]lait|cr[eè]me|beurre|fromage|yaourt|yoghourt|skyr|k[eé]fir|cas[eé]ine|lactalbumine|whey|mati[eè]re grasse laiti[eè]re|poudre de lait|beurre clarifi[eé]|ghee|mascarpone|ricotta|mozzarella|parmesan|emmental)\b/i,
      /\b(oeufs?|œufs?|jaune d'?oeuf|blanc d'?oeuf|ovalbumine|lysozyme|ovomuco[iï]de)\b/i,
      /\b(miel|propolis|gel[eé]e royale|cire d'abeille|beeswax)\b/i,
      /\bE901\b/i, // E901 beeswax
      /\bE904\b/i, // E904 shellac (from insects)
      /\bE120\b/i, // E120 carmine
      /\b(cochenille|carmin)\b/i,
    ],
    note_fr: 'Exclut tout produit animal : viande, poisson, œufs, lait, miel et dérivés (carmin E120, gélatine, cire d\'abeille E901, shellac E904).',
    note_en: 'Excludes any animal product: meat, fish, eggs, dairy, honey and derivatives (carmine E120, gelatin, beeswax E901, shellac E904).',
  },

  pescatarian: {
    label_fr: 'Pescétarien',
    label_en: 'Pescatarian',
    forbidden: [
      /\b(viande|porc|b[oœ]euf|poulet|dinde|canard|agneau|veau|lard|lardon|jambon|saucisse|chorizo|merguez|bacon|boudin|confit|rillette|pat[eé]|foie gras)\b/i,
    ],
    note_fr: 'Végétarien autorisant poisson et fruits de mer.',
    note_en: 'Vegetarian that still allows fish and seafood.',
  },

  keto: {
    label_fr: 'Cétogène',
    label_en: 'Ketogenic',
    // No per-ingredient forbidden list; compliance is macronutrient-based.
    macro: {
      max_net_carbs_g_per_100: 10, // common clinical-keto threshold
      min_fat_fraction_of_kcal: 0.60,
    },
    note_fr: 'Très faible en glucides (<10 g nets/100 g), riche en lipides (>60 %E).',
    note_en: 'Very low carb (<10 g net carbs/100 g), high fat (>60 %E).',
  },

  halal: {
    label_fr: 'Halal',
    label_en: 'Halal',
    forbidden: [
      /\b(porc|lard|lardon|jambon|saucisson|bacon|salami|chorizo|pepperoni|couenne|boudin|saindoux)\b/i,
      /\b(alcool|[eé]thanol|vin|bi[eè]re|liqueur|rhum|whisky|gin|vodka|spiritueux)\b/i,
      /\b(gelati?ne(?! (halal|v[eé]g[eé]tale|v[eé]g)))\b/i,
      /\b(pr[eé]sure animale|pepsine(?! halal))\b/i,
    ],
    note_fr: 'Pas de porc ni dérivés, pas d\'alcool, gélatine/présure doivent être certifiées halal (non vérifiable depuis l\'étiquette seule).',
    note_en: 'No pork or derivatives, no alcohol; gelatin/rennet must be halal-certified (not verifiable from label alone).',
  },

  kosher: {
    label_fr: 'Casher',
    label_en: 'Kosher',
    forbidden: [
      /\b(porc|lard|lardon|jambon|saucisson|bacon|salami|chorizo|pepperoni|saindoux)\b/i,
      /\b(crustac[eé]|crevette|homard|crabe|langouste|hu[iî]tre|moule|calmar|encornet|poulpe)\b/i,
    ],
    note_fr: 'Pas de porc ni fruits de mer. La certification kasher (séparation viande-lait, shechita) n\'est pas vérifiable depuis l\'étiquette.',
    note_en: 'No pork or shellfish. Full kosher certification (meat-dairy separation, shechita slaughter) is not verifiable from the label.',
  },

  gluten_free: {
    label_fr: 'Sans gluten',
    label_en: 'Gluten-free',
    forbidden: [
      /\b(bl[eé]|froment|seigle|orge|avoine(?! sans gluten)|[eé]peautre|kamut|triticale|semoule de bl[eé]|farine de bl[eé]|farine de seigle|farine d[e']orge|malt|malt d'orge)\b/i,
    ],
    note_fr: 'Pas de blé, seigle, orge, avoine (sauf certifiée), épeautre, kamut, triticale. Règlement (CE) 41/2009 : ≤20 mg/kg gluten.',
    note_en: 'No wheat, rye, barley, oats (unless certified), spelt, kamut, triticale. EC Regulation 41/2009: ≤20 mg/kg gluten.',
  },

  dairy_free: {
    label_fr: 'Sans lactose / produits laitiers',
    label_en: 'Dairy-free',
    forbidden: [
      /\b(lait|lactos[eé]rum|petit[- ]lait|cr[eè]me|beurre|fromage|yaourt|yoghourt|skyr|k[eé]fir|cas[eé]ine|lactose|lactalbumine|whey|mati[eè]re grasse laiti[eè]re|poudre de lait|beurre clarifi[eé]|ghee|mascarpone|ricotta|mozzarella|parmesan|emmental)\b/i,
    ],
    note_fr: 'Exclut tous produits laitiers (lait, crème, beurre, fromage, yaourts, caséine, lactose).',
    note_en: 'Excludes all dairy (milk, cream, butter, cheese, yogurt, casein, lactose).',
  },

  paleo: {
    label_fr: 'Paléo',
    label_en: 'Paleo',
    forbidden: [
      /\b(bl[eé]|froment|seigle|orge|avoine|[eé]peautre|kamut|triticale|ma[iï]s|riz|quinoa(?! paleo)|farine de bl[eé]|farine de seigle|malt)\b/i,
      /\b(lait|lactos[eé]rum|cr[eè]me|beurre|fromage|yaourt|cas[eé]ine|lactose|whey)\b/i,
      /\b(haricot|lentille|pois chiche|soja|arachide|cacahu[eè]te|f[eè]ve)\b/i,
      /\b(sucre raffin[eé]|sirop de glucose|sirop de ma[iï]s|maltodextrin)\b/i,
    ],
    note_fr: 'Pas de céréales, légumineuses, produits laitiers, ni sucres raffinés. Approximatif depuis une étiquette — Paléo est avant tout un régime "aliment brut".',
    note_en: 'No grains, legumes, dairy, or refined sugars. Label-based detection is approximate — Paleo is primarily a whole-foods diet.',
  },

  low_fodmap: {
    label_fr: 'Pauvre en FODMAP',
    label_en: 'Low-FODMAP',
    forbidden: [
      /\b(bl[eé]|froment|seigle|orge|oignon|ail|pomme|poire|mangue|past[eè]que|miel|sirop d'agave|sirop de ma[iï]s|fructose|inuline|chicor[eé]e|artichaut|lait(?! sans lactose)|lactose|fromage frais|yaourt|l[eé]gume sec|haricot|lentille|pois chiche|sorbitol|mannitol|xylitol|maltitol)\b/i,
    ],
    note_fr: 'Référence Monash. Exclut oligosaccharides, disaccharides, monosaccharides et polyols mal absorbés. Détection indicative depuis l\'étiquette seulement.',
    note_en: 'Monash University reference. Excludes poorly absorbed oligos, disaccharides, monosaccharides and polyols. Label-based detection is indicative only.',
  },

  mediterranean: {
    label_fr: 'Méditerranéen',
    label_en: 'Mediterranean',
    preferred: [
      /\b(huile d'olive|olive|poisson|saumon|sardine|maquereau|thon|noix|amande|noisette|pistache|l[eé]gume|tomate|poivron|aubergine|courgette|l[eé]gumineuse|lentille|pois chiche|haricot|c[eé]r[eé]ale compl[eè]te|bl[eé] complet|avoine|feta|yaourt grec)\b/i,
    ],
    note_fr: 'Priorise olive, poisson, légumes, légumineuses, céréales complètes. Pas d\'interdits stricts ; les produits conformes reçoivent un bonus.',
    note_en: 'Prioritises olive, fish, vegetables, legumes, whole grains. No hard bans; compliant products get a bonus.',
  },

  carnivore: {
    label_fr: 'Carnivore',
    label_en: 'Carnivore',
    forbidden: [
      // Everything plant-based
      /\b(bl[eé]|farine|sucre|fruit|l[eé]gume|c[eé]r[eé]ale|riz|quinoa|ma[iï]s|haricot|lentille|pois|soja|arachide|ma[iï]s|huile v[eé]g[eé]tale|huile d'olive)\b/i,
    ],
    note_fr: 'Exclut tout ingrédient végétal. Détection depuis l\'étiquette seulement.',
    note_en: 'Excludes any plant ingredient. Label-based detection only.',
  },

  custom: {
    label_fr: 'Personnalisé',
    label_en: 'Custom',
    note_fr: 'Définis tes propres motifs interdits ou préférés.',
    note_en: 'Define your own forbidden or preferred patterns.',
  },
};

export const DIET_KEYS = Object.keys(DIET_DEFS);

/**
 * Check a product against a diet.
 * @returns {{ compliant: boolean, violations: string[], preferredHits: string[], reason: string|null }}
 */
export function checkDiet(product, dietKey, customDiet, lang = 'fr') {
  const def = DIET_DEFS[dietKey];
  if (!def || dietKey === 'none') return { compliant: true, violations: [], preferredHits: [], reason: null };

  const violations = [];
  const preferredHits = [];

  // Custom diet: use user-provided patterns.
  if (dietKey === 'custom' && customDiet) {
    for (const pattern of customDiet.forbidden || []) {
      try {
        const re = new RegExp(pattern, 'i');
        for (const ing of product.ingredients) {
          if (re.test(ing.name)) { violations.push(ing.name); break; }
        }
      } catch { /* bad regex, skip */ }
    }
    for (const pattern of customDiet.preferred || []) {
      try {
        const re = new RegExp(pattern, 'i');
        for (const ing of product.ingredients) {
          if (re.test(ing.name)) { preferredHits.push(ing.name); break; }
        }
      } catch { /* skip */ }
    }
  } else {
    // Standard diet rules
    for (const re of def.forbidden || []) {
      for (const ing of product.ingredients) {
        if (re.test(ing.name)) { violations.push(ing.name); break; }
      }
    }
    for (const re of def.preferred || []) {
      for (const ing of product.ingredients) {
        if (re.test(ing.name)) { preferredHits.push(ing.name); break; }
      }
    }
  }

  // Ketogenic: macro-based check.
  if (dietKey === 'keto' && product.nutrition) {
    const netCarbs = (product.nutrition.carbs_g ?? 0) - (product.nutrition.fiber_g ?? 0);
    if (netCarbs > (def.macro?.max_net_carbs_g_per_100 ?? 10)) {
      violations.push(`${netCarbs.toFixed(1)} g net carbs/100 g`);
    }
    const kcal = product.nutrition.energy_kcal || 0;
    const fatKcal = (product.nutrition.fat_g || 0) * 9;
    const fatFrac = kcal > 0 ? fatKcal / kcal : 0;
    if (kcal > 50 && fatFrac < (def.macro?.min_fat_fraction_of_kcal ?? 0.60)) {
      violations.push(`only ${Math.round(fatFrac * 100)} %E from fat`);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    preferredHits,
    reason: violations.length > 0
      ? (lang === 'en' ? `Not ${def.label_en}: ${violations.slice(0, 3).join(', ')}` :
         `Non ${def.label_fr} : ${violations.slice(0, 3).join(', ')}`)
      : null,
  };
}
