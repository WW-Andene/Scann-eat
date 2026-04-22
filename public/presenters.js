/**
 * Pure presentation helpers — no DOM, no i18n lookup, no side effects.
 *
 * Keeping these separate from app.js makes them directly testable under
 * node:test without a jsdom shim, and lets future UI refactors share the
 * same logic instead of re-inventing it per feature.
 */

/**
 * Confidence level for a scan result. Used to tint the "source" chip so the
 * user can quickly gauge how much to trust the extracted data.
 *
 *   high    — OpenFoodFacts match, or a clean LLM extraction with ≥4 macros
 *   medium  — acceptable LLM extraction
 *   low     — ≥2 warnings or ≤2 macros extracted
 */
export function computeConfidence(data) {
  if (!data || !data.product) return 'low';
  if (data.source === 'openfoodfacts') return 'high';
  const warns = data.warnings?.length || 0;
  const n = data.product.nutrition;
  if (!n) return 'low';
  const filled = [n.energy_kcal, n.fat_g, n.carbs_g, n.sugars_g, n.protein_g, n.salt_g]
    .filter((v) => typeof v === 'number' && v > 0).length;
  if (warns === 0 && filled >= 4) return 'high';
  if (warns >= 2 || filled <= 2) return 'low';
  return 'medium';
}

/**
 * Compact snapshot used by the "compare next scan" feature. Strips the audit
 * + nutrition down to just the fields needed to render the diff, so we don't
 * blow up localStorage with a full product object.
 */
export function snapshotFromData(data) {
  return {
    name: data.audit.product_name || data.product.name,
    grade: data.audit.grade,
    score: data.audit.score,
    ingredients: (data.product.ingredients ?? []).map((i) => i.name),
  };
}

/**
 * Bucket an age in milliseconds into a time-ago token for i18n lookup.
 * Split from the display string so the rounding logic can be unit-tested
 * without mocking the i18n layer.
 *
 *   ms < 60 000        → { kind: 'justNow' }
 *   ms < 3 600 000     → { kind: 'minutes', n: round(ms / 60 000) }
 *   ms < 86 400 000    → { kind: 'hours',   n: round(ms / 3 600 000) }
 *   otherwise          → { kind: 'days',    n: round(ms / 86 400 000) }
 */
export function timeAgoBucket(msAgo) {
  const min = Math.round(msAgo / 60000);
  if (min < 1) return { kind: 'justNow' };
  if (min < 60) return { kind: 'minutes', n: min };
  const h = Math.round(min / 60);
  if (h < 24) return { kind: 'hours', n: h };
  const d = Math.round(h / 24);
  return { kind: 'days', n: d };
}

/**
 * Default meal bucket for a given hour-of-day. Pure function (takes hour,
 * returns a MEALS key) so it can be used anywhere a Meal picker needs a
 * reasonable default without a fresh Date() call.
 *
 *   5-10 → breakfast  (early morning)
 *  10-14 → lunch      (midday)
 *  14-18 → snack      (afternoon)
 *  18-24, 0-5 → dinner (evening + late night)
 */
export function defaultMealForHour(hour) {
  if (hour >= 5  && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'snack';
  return 'dinner';
}

/**
 * Current logging streak in days, counting backwards from `todayIso`.
 * A day counts as "logged" if at least one entry exists with that date.
 *
 * Returns 0 when:
 *   - no entries exist
 *   - today has no entries AND yesterday has no entries (streak broken)
 * Returns n when the last n consecutive days (including today or yesterday)
 * all have entries. "Yesterday counts" is intentional: if the user opens
 * the app in the morning before logging breakfast, we don't want the
 * streak to show 0 just because today is still empty — grace the last
 * 24h so the user can see their current standing and keep it going.
 *
 * All date math uses ISO YYYY-MM-DD strings, so timezone jumps at midnight
 * don't break the count.
 */
/**
 * Parse a voice-dictated phrase into Quick-Add field candidates. Pure
 * function — no SpeechRecognition or DOM involvement. Recognizes:
 *
 *   kcal      → "120 calories", "120 kcal", "120 cal"
 *   grams     → "250 g", "250 grammes", "250 grams"
 *   ml        → "250 ml" (treated same as g for a rough portion size)
 *   protein   → "15 g de protéines", "15 g protein"
 *   carbs     → "30 g de glucides", "30 g carbs"
 *   fat       → "10 g de lipides", "10 g fat"
 *
 * Numbers accept both French comma decimals ("8,5") and point decimals.
 * Anything left over (no recognised number-unit pair) becomes the name.
 *
 * Returns an object with only the keys it could extract — the caller
 * spreads into the form so empty fields stay empty.
 */
export function parseVoiceQuickAdd(transcript) {
  if (!transcript) return {};
  const text = String(transcript).toLowerCase();
  const out = {};

  // Match "NUMBER (unit|label)". First match wins for each nutrient. French
  // comma decimals and optional "de/of" before the nutrient label.
  const num = '([0-9]+(?:[.,][0-9]+)?)';
  const n = (s) => parseFloat(String(s).replace(',', '.'));
  const grab = (re) => {
    const m = text.match(re);
    return m ? n(m[1]) : undefined;
  };

  const kcal = grab(new RegExp(`${num}\\s*(?:kcal|calories?|cal)\\b`, 'i'));
  const protein = grab(new RegExp(`${num}\\s*g(?:rammes?)?\\s+(?:de\\s+)?(?:prot[eé]ines?|protein)\\b`, 'i'));
  const carbs = grab(new RegExp(`${num}\\s*g(?:rammes?)?\\s+(?:de\\s+)?(?:glucides?|carbs?|carbohydrates?)\\b`, 'i'));
  const fat = grab(new RegExp(`${num}\\s*g(?:rammes?)?\\s+(?:de\\s+)?(?:lipides?|fat|mati[eè]res? grasses?)\\b`, 'i'));

  // Portion (grams OR ml). Only take if no macro claimed the same number —
  // tested last and excluded when the nutrient labels are adjacent.
  const portionRe = new RegExp(`${num}\\s*(g(?:rammes?)?|ml|millilitres?)(?![a-zà-ÿ])`, 'i');
  let grams;
  let m;
  while ((m = portionRe.exec(text)) !== null) {
    // Reject if this number was already consumed by a macro label.
    const next20 = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
    if (/^\s*(?:de\s+)?(?:prot|gluc|carb|lipid|fat|mati[eè]re)/.test(next20)) continue;
    grams = n(m[1]);
    break;
  }

  if (Number.isFinite(kcal))    out.kcal = kcal;
  if (Number.isFinite(protein)) out.protein_g = protein;
  if (Number.isFinite(carbs))   out.carbs_g = carbs;
  if (Number.isFinite(fat))     out.fat_g = fat;
  if (Number.isFinite(grams))   out.grams = grams;

  // Name: strip out the unit-number blocks we consumed. Whatever's left is
  // the food name. Trim punctuation + whitespace.
  let name = text
    .replace(new RegExp(`${num}\\s*(?:kcal|calories?|cal|kilocalories?)\\b`, 'gi'), ' ')
    .replace(new RegExp(`${num}\\s*g(?:rammes?)?\\s+(?:de\\s+)?(?:prot[eé]ines?|protein|glucides?|carbs?|carbohydrates?|lipides?|fat|mati[eè]res? grasses?)\\b`, 'gi'), ' ')
    .replace(new RegExp(`${num}\\s*(?:g(?:rammes?)?|ml|millilitres?)(?![a-zà-ÿ])`, 'gi'), ' ')
    .replace(/[,;.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length > 0) out.name = name;

  return out;
}

export function logStreakDays(entries, todayIso) {
  if (!entries || entries.length === 0) return 0;
  const days = new Set(entries.map((e) => e.date));
  const ymd = (d) => d.toISOString().slice(0, 10);
  const start = new Date(todayIso + 'T12:00:00Z'); // noon UTC, avoids DST edge
  let cursor = new Date(start);
  let streak = 0;
  // Allow a 1-day grace: if today is empty but yesterday is logged, still
  // start counting from yesterday.
  if (!days.has(ymd(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(ymd(cursor))) return 0;
  }
  while (days.has(ymd(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
