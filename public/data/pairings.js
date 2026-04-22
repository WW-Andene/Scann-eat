/**
 * Classic French-home-cooking pairings. Hand-curated from Larousse
 * gastronomique + common patisserie/cuisine conventions — NOT from a
 * flavor-molecule dataset. Keep entries to obvious, widely-agreed
 * combinations; if a pairing would surprise a typical French home cook,
 * leave it out.
 *
 * Each entry has `name` (canonical FR), optional `aliases` (FR variants +
 * EN), and `pairs` — 4-8 strings, ordered by strength of association.
 *
 * Lookup is case- and accent-insensitive, matching searchFoodDB's
 * conventions. Prefix match beats substring; first-token fallback for
 * multi-word scanned names.
 */

export const PAIRINGS = [
  // Fruits
  { name: 'pomme', aliases: ['apple', 'pommes'], pairs: ['cannelle', 'caramel', 'vanille', 'noix', 'cheddar', 'porc', 'miel'] },
  { name: 'poire', aliases: ['pear'],           pairs: ['chocolat noir', 'gorgonzola', 'noix', 'vanille', 'miel', 'amandes'] },
  { name: 'banane', aliases: ['banana'],        pairs: ['chocolat', 'beurre de cacahuète', 'cannelle', 'noix de pécan', 'vanille', 'rhum'] },
  { name: 'fraise', aliases: ['strawberry', 'fraises'], pairs: ['basilic', 'vanille', 'vinaigre balsamique', 'menthe', 'chocolat blanc', 'crème', 'poivre noir'] },
  { name: 'framboise', aliases: ['raspberry', 'framboises'], pairs: ['chocolat noir', 'vanille', 'amandes', 'menthe', 'rose', 'citron'] },
  { name: 'myrtille', aliases: ['blueberry', 'myrtilles'], pairs: ['citron', 'vanille', 'yaourt', 'amandes', 'cannelle'] },
  { name: 'citron', aliases: ['lemon'],         pairs: ['basilic', 'thym', 'miel', 'gingembre', 'ail', 'romarin', 'poisson blanc'] },
  { name: 'orange', aliases: [],                pairs: ['chocolat noir', 'cannelle', 'fenouil', 'canard', 'amandes', 'cardamome'] },
  { name: 'ananas', aliases: ['pineapple'],     pairs: ['coco', 'piment', 'rhum', 'menthe', 'jambon', 'poulet'] },
  { name: 'mangue', aliases: ['mango'],         pairs: ['lime', 'coriandre', 'piment', 'coco', 'crevettes', 'yaourt'] },
  { name: 'avocat', aliases: ['avocado'],       pairs: ['lime', 'coriandre', 'piment', 'œuf', 'tomate', 'saumon fumé', 'pain complet'] },
  { name: 'raisin', aliases: ['grape', 'raisins'], pairs: ['fromage bleu', 'noix', 'prosciutto', 'romarin', 'miel'] },
  { name: 'pêche', aliases: ['peach', 'peches', 'pêches'], pairs: ['basilic', 'burrata', 'prosciutto', 'amandes', 'vanille', 'thym'] },
  { name: 'abricot', aliases: ['apricot', 'abricots'], pairs: ['lavande', 'amandes', 'miel', 'vanille', 'romarin', 'agneau'] },
  { name: 'figue', aliases: ['fig', 'figues'],  pairs: ['prosciutto', 'chèvre', 'roquette', 'balsamique', 'noix', 'miel'] },

  // Légumes + aromates
  { name: 'tomate', aliases: ['tomato', 'tomates', 'tomate cerise'], pairs: ['basilic', 'mozzarella', 'ail', 'oignon', 'huile d\'olive', 'origan', 'feta'] },
  { name: 'carotte', aliases: ['carrot', 'carottes'], pairs: ['cumin', 'gingembre', 'orange', 'miel', 'coriandre', 'thym', 'beurre'] },
  { name: 'courgette', aliases: ['zucchini', 'courgettes'], pairs: ['menthe', 'feta', 'ail', 'citron', 'parmesan', 'basilic'] },
  { name: 'aubergine', aliases: ['eggplant', 'aubergines'], pairs: ['ail', 'cumin', 'tahini', 'tomate', 'menthe', 'yaourt', 'basilic'] },
  { name: 'poivron', aliases: ['pepper', 'poivrons'], pairs: ['ail', 'oignon', 'origan', 'paprika', 'feta', 'basilic'] },
  { name: 'oignon', aliases: ['onion', 'oignons'], pairs: ['thym', 'laurier', 'vin rouge', 'balsamique', 'beurre', 'ail'] },
  { name: 'ail', aliases: ['garlic'],           pairs: ['persil', 'thym', 'romarin', 'citron', 'huile d\'olive', 'beurre'] },
  { name: 'brocoli', aliases: ['broccoli'],     pairs: ['ail', 'citron', 'piment', 'parmesan', 'amandes', 'sésame'] },
  { name: 'épinard', aliases: ['spinach', 'épinards'], pairs: ['ail', 'muscade', 'ricotta', 'citron', 'pignons', 'œuf'] },
  { name: 'concombre', aliases: ['cucumber'],   pairs: ['aneth', 'menthe', 'yaourt', 'feta', 'citron', 'tomate'] },
  { name: 'champignon', aliases: ['mushroom', 'champignons', 'champignons de paris'], pairs: ['ail', 'thym', 'persil', 'crème', 'vin blanc', 'beurre', 'échalote'] },
  { name: 'pomme de terre', aliases: ['potato', 'potatoes', 'patate', 'patates'], pairs: ['romarin', 'thym', 'ail', 'beurre', 'crème', 'parmesan', 'lard'] },
  { name: 'betterave', aliases: ['beet', 'beetroot', 'betteraves'], pairs: ['chèvre', 'noix', 'orange', 'balsamique', 'aneth', 'raifort'] },
  { name: 'asperge', aliases: ['asparagus', 'asperges'], pairs: ['œuf', 'parmesan', 'citron', 'beurre', 'prosciutto', 'hollandaise'] },

  // Protéines animales
  { name: 'poulet', aliases: ['chicken', 'blanc de poulet'], pairs: ['citron', 'thym', 'ail', 'romarin', 'paprika', 'moutarde', 'miel'] },
  { name: 'boeuf', aliases: ['beef', 'steak'], pairs: ['thym', 'ail', 'poivre noir', 'moutarde', 'vin rouge', 'champignons', 'romarin'] },
  { name: 'porc', aliases: ['pork'],           pairs: ['pomme', 'moutarde', 'sauge', 'fenouil', 'miel', 'poireau'] },
  { name: 'agneau', aliases: ['lamb'],         pairs: ['romarin', 'ail', 'menthe', 'cumin', 'citron', 'yaourt'] },
  { name: 'canard', aliases: ['duck'],         pairs: ['orange', 'cerise', 'thym', 'miel', 'balsamique', 'poivre'] },
  { name: 'saumon', aliases: ['salmon'],       pairs: ['aneth', 'citron', 'câpres', 'crème', 'épinards', 'riz', 'avocat'] },
  { name: 'thon', aliases: ['tuna'],           pairs: ['citron', 'câpres', 'olives', 'oignon rouge', 'poivre noir', 'sésame'] },
  { name: 'crevette', aliases: ['shrimp', 'crevettes', 'prawn'], pairs: ['ail', 'piment', 'citron', 'persil', 'coco', 'gingembre'] },
  { name: 'œuf', aliases: ['egg', 'œufs', 'oeuf'], pairs: ['ciboulette', 'poivre', 'beurre', 'truffe', 'avocat', 'épinards', 'lard'] },

  // Féculents / céréales
  { name: 'pâtes', aliases: ['pasta', 'pates'], pairs: ['ail', 'parmesan', 'basilic', 'tomate', 'huile d\'olive', 'pecorino'] },
  { name: 'riz', aliases: ['rice'],            pairs: ['safran', 'curry', 'coco', 'citron', 'coriandre', 'cardamome'] },
  { name: 'quinoa', aliases: [],               pairs: ['citron', 'menthe', 'feta', 'grenade', 'persil', 'amandes'] },
  { name: 'pain', aliases: ['bread', 'pain complet', 'baguette'], pairs: ['beurre', 'fromage', 'confiture', 'miel', 'huile d\'olive'] },
  { name: 'lentille', aliases: ['lentil', 'lentilles'], pairs: ['cumin', 'oignon', 'carotte', 'lard', 'coriandre', 'citron'] },
  { name: 'pois chiche', aliases: ['chickpea', 'pois chiches'], pairs: ['cumin', 'tahini', 'citron', 'ail', 'coriandre', 'paprika'] },

  // Laitier
  { name: 'yaourt', aliases: ['yogurt', 'yaourt nature'], pairs: ['miel', 'granola', 'myrtille', 'noix', 'menthe', 'concombre'] },
  { name: 'fromage blanc', aliases: [],         pairs: ['fruits rouges', 'miel', 'vanille', 'granola', 'herbes fraîches'] },
  { name: 'mozzarella', aliases: [],            pairs: ['tomate', 'basilic', 'balsamique', 'prosciutto', 'pêche', 'olive'] },
  { name: 'chèvre', aliases: ['goat cheese'],   pairs: ['miel', 'noix', 'figue', 'betterave', 'thym', 'roquette'] },
  { name: 'parmesan', aliases: ['parmigiano'],  pairs: ['pâtes', 'risotto', 'poire', 'balsamique', 'roquette', 'pignons'] },
  { name: 'feta', aliases: [],                  pairs: ['concombre', 'tomate', 'olive', 'menthe', 'pastèque', 'origan'] },

  // Oléagineux / épices base
  { name: 'amandes', aliases: ['almond', 'amande'], pairs: ['chocolat noir', 'cerise', 'abricot', 'miel', 'vanille', 'romarin'] },
  { name: 'noix', aliases: ['walnut'],          pairs: ['pomme', 'chèvre', 'bleu', 'poire', 'miel', 'roquette'] },
  { name: 'chocolat', aliases: ['chocolate', 'chocolat noir', 'chocolat au lait'], pairs: ['orange', 'framboise', 'menthe', 'noisette', 'piment', 'café', 'fleur de sel'] },
  { name: 'café', aliases: ['coffee'],          pairs: ['chocolat', 'cardamome', 'vanille', 'noisette', 'caramel', 'cannelle'] },
];

function normalize(s) {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function haystack(entry) {
  return [entry.name, ...(entry.aliases ?? [])].map(normalize);
}

/**
 * Returns the list of classic pairings for a scanned ingredient name.
 * Matches prefix first, then substring; if nothing matches, retries with
 * the first token ("pomme rouge" → "pomme"). Returns [] when no entry
 * makes sense — e.g. a packaged biscuit brand name.
 */
export function findPairings(name, limit = 6) {
  const q = normalize(name);
  if (q.length < 2) return [];

  const tryQuery = (query) => {
    for (const entry of PAIRINGS) {
      const hs = haystack(entry);
      if (hs.some((h) => h === query || h.startsWith(query))) return entry;
    }
    for (const entry of PAIRINGS) {
      const hs = haystack(entry);
      if (hs.some((h) => h.includes(query))) return entry;
    }
    return null;
  };

  let hit = tryQuery(q);
  if (!hit) {
    const firstToken = q.split(/\s+/)[0];
    if (firstToken && firstToken.length >= 2 && firstToken !== q) {
      hit = tryQuery(firstToken);
    }
  }
  if (!hit) return [];
  return hit.pairs.slice(0, limit);
}

/** How the matched entry was reached — exposed for the UI so it can show
 *  the canonical name when the scan was, e.g., "tomate cerise bio". */
export function matchPairings(name) {
  const q = normalize(name);
  if (q.length < 2) return null;
  const tryQuery = (query) => {
    for (const entry of PAIRINGS) {
      const hs = haystack(entry);
      if (hs.some((h) => h === query || h.startsWith(query))) return entry;
    }
    for (const entry of PAIRINGS) {
      const hs = haystack(entry);
      if (hs.some((h) => h.includes(query))) return entry;
    }
    return null;
  };
  let hit = tryQuery(q);
  if (!hit) {
    const firstToken = q.split(/\s+/)[0];
    if (firstToken && firstToken.length >= 2 && firstToken !== q) {
      hit = tryQuery(firstToken);
    }
  }
  return hit;
}
