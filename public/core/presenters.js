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
  // Optional connector word — "de" (FR), "of" (EN), or nothing.
  const conn = '(?:(?:de|of)\\s+)?';
  const protein = grab(new RegExp(`${num}\\s*g(?:rammes?)?\\s+${conn}(?:prot[eé]ines?|protein)\\b`, 'i'));
  const carbs = grab(new RegExp(`${num}\\s*g(?:rammes?)?\\s+${conn}(?:glucides?|carbs?|carbohydrates?)\\b`, 'i'));
  const fat = grab(new RegExp(`${num}\\s*g(?:rammes?)?\\s+${conn}(?:lipides?|fat|mati[eè]res? grasses?)\\b`, 'i'));

  // Portion (grams OR ml). Only take if no macro claimed the same number —
  // tested last and excluded when the nutrient labels are adjacent.
  // The 'g' flag is REQUIRED on this regex so .exec() advances lastIndex
  // between iterations. Without it, a "continue" inside the while loop
  // re-matches the same position forever — that's the bug that hung
  // presenter-tests.ts for ~6 weeks before B6.1.
  const portionRe = new RegExp(`${num}\\s*(g(?:rammes?)?|ml|millilitres?)(?![a-zà-ÿ])`, 'gi');
  let grams;
  let m;
  while ((m = portionRe.exec(text)) !== null) {
    // Reject if this number was already consumed by a macro label.
    const next20 = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
    if (/^\s*(?:(?:de|of)\s+)?(?:prot|gluc|carb|lipid|fat|mati[eè]re)/.test(next20)) continue;
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

/**
 * Recommended daily water intake in millilitres.
 *
 * Baseline: EFSA 2010 adequate intake for water (NDA panel) — 2 000 ml/d
 * for women, 2 500 ml/d for men, from ALL sources (food + drinks). We use
 * the drink-only ~75 % portion of that: 1500 / 2000 ml/day as a soft goal
 * the app can nudge toward. Scaled by body weight when available.
 *
 * Returns a millilitre integer (rounded to nearest 100 for readability).
 *
 * Edge cases:
 *   - No profile         → 2000 ml (unisex default)
 *   - Weight but no sex  → 33 ml/kg (common clinical shortcut, Holliday-
 *                          Segar adult derivation; same anchor as EFSA)
 *   - High activity      → +500 ml (WHO training heuristic)
 */
export function waterGoalMl(profile) {
  // User-set override wins. Clamp to a sane range (500 ml – 6 L) so a
  // typo like 20000 doesn't make the progress bar uselessly tiny.
  const override = Number(profile?.water_goal_ml);
  if (Number.isFinite(override) && override >= 500 && override <= 6000) {
    return Math.round(override / 100) * 100;
  }

  const weight = Number(profile?.weight_kg);
  const sex = profile?.sex;
  const activity = profile?.activity;

  let base;
  if (Number.isFinite(weight) && weight > 0) {
    base = weight * 33;
  } else if (sex === 'female') {
    base = 1500;
  } else if (sex === 'male' || sex === 'other') {
    base = 2000;
  } else {
    base = 2000;
  }

  if (activity === 'active' || activity === 'very_active') base += 500;

  return Math.round(base / 100) * 100;
}

/**
 * Group consumption entries into a rolling 7-day window ending on `endIso`
 * (inclusive). Pure — no IDB, no Date fancy-footwork past ISO strings.
 *
 * Returns:
 *   days:  array of 7 { date, kcal, carbs_g, protein_g, fat_g, sat_fat_g,
 *          sugars_g, salt_g, count } — oldest first, always length 7 (empty
 *          days are zero-filled so the chart has stable columns)
 *   total: summed totals across the 7 days
 *   avg:   day averages rounded to 1 decimal
 *   days_logged: count of days with at least one entry (for "6/7 days")
 */
export function weeklyRollup(entries, endIso) {
  const end = new Date(endIso + 'T12:00:00Z');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    days.push({
      date, kcal: 0, carbs_g: 0, protein_g: 0, fat_g: 0,
      sat_fat_g: 0, sugars_g: 0, salt_g: 0, count: 0,
    });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const e of entries ?? []) {
    const bucket = byDate.get(e.date);
    if (!bucket) continue;
    bucket.kcal      += Number(e.kcal) || 0;
    bucket.carbs_g   += Number(e.carbs_g) || 0;
    bucket.protein_g += Number(e.protein_g) || 0;
    bucket.fat_g     += Number(e.fat_g) || 0;
    bucket.sat_fat_g += Number(e.sat_fat_g) || 0;
    bucket.sugars_g  += Number(e.sugars_g) || 0;
    bucket.salt_g    += Number(e.salt_g) || 0;
    bucket.count += 1;
  }
  const total = days.reduce(
    (acc, d) => ({
      kcal:      acc.kcal + d.kcal,
      carbs_g:   acc.carbs_g + d.carbs_g,
      protein_g: acc.protein_g + d.protein_g,
      fat_g:     acc.fat_g + d.fat_g,
      sat_fat_g: acc.sat_fat_g + d.sat_fat_g,
      sugars_g:  acc.sugars_g + d.sugars_g,
      salt_g:    acc.salt_g + d.salt_g,
    }),
    { kcal: 0, carbs_g: 0, protein_g: 0, fat_g: 0, sat_fat_g: 0, sugars_g: 0, salt_g: 0 },
  );
  const round1 = (v) => Math.round(v * 10) / 10;
  const round3 = (v) => Math.round(v * 1000) / 1000;
  const daysLogged = days.filter((d) => d.count > 0).length;
  // Average over days WITH entries — if the user hasn't logged some days,
  // averaging over 7 understates their typical intake.
  const denom = Math.max(1, daysLogged);
  const avg = {
    kcal:      round1(total.kcal / denom),
    carbs_g:   round1(total.carbs_g / denom),
    protein_g: round1(total.protein_g / denom),
    fat_g:     round1(total.fat_g / denom),
    sat_fat_g: round1(total.sat_fat_g / denom),
    sugars_g:  round1(total.sugars_g / denom),
    salt_g:    round3(total.salt_g / denom),
  };
  return { days, total, avg, days_logged: daysLogged };
}

/**
 * Human-readable one-screen summary of a weekly rollup — for
 * navigator.share or copy-paste into a notes app. Pure.
 *
 * Example output:
 *   Semaine du 15 au 21 avril 2026 — 6 jours enregistrés
 *   Moy/jour : 1870 kcal · 55 g prot · 220 g gluc · 75 g lip
 *   Total : 11220 kcal
 *
 *   lun. 15  1900 kcal  56 prot · 220 gluc · 80 lip
 *   mar. 16  …
 */
export function formatWeeklyShare(rollup, opts = {}) {
  if (!rollup || !Array.isArray(rollup.days) || rollup.days.length === 0) return '';
  const { lang = 'fr' } = opts;
  const isFr = lang !== 'en';
  const locale = isFr ? 'fr-FR' : 'en-GB';

  const firstDay = new Date(rollup.days[0].date + 'T12:00:00');
  const lastDay = new Date(rollup.days[rollup.days.length - 1].date + 'T12:00:00');
  const sameMonth = firstDay.getUTCMonth() === lastDay.getUTCMonth();
  const firstStr = firstDay.toLocaleDateString(locale, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const lastStr = lastDay.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const range = isFr ? `Semaine du ${firstStr} au ${lastStr}` : `Week of ${firstStr} to ${lastStr}`;

  const r = (n) => Math.round(n);
  const avg = rollup.avg || {};
  const total = rollup.total || {};
  const daysLogged = rollup.days_logged ?? 0;

  const lines = [];
  lines.push(isFr
    ? `${range} — ${daysLogged} jour(s) enregistré(s)`
    : `${range} — ${daysLogged} day(s) logged`);
  lines.push(isFr
    ? `Moy/jour : ${r(avg.kcal)} kcal · ${r(avg.protein_g)} g prot · ${r(avg.carbs_g)} g gluc · ${r(avg.fat_g)} g lip`
    : `Avg/day: ${r(avg.kcal)} kcal · ${r(avg.protein_g)} g prot · ${r(avg.carbs_g)} g carbs · ${r(avg.fat_g)} g fat`);
  lines.push(isFr ? `Total : ${r(total.kcal)} kcal` : `Total: ${r(total.kcal)} kcal`);
  lines.push('');
  for (const d of rollup.days) {
    const date = new Date(d.date + 'T12:00:00');
    const dayStr = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
    if (d.count === 0) {
      lines.push(isFr ? `${dayStr}  —` : `${dayStr}  —`);
    } else {
      lines.push(`${dayStr}  ${r(d.kcal)} kcal  ${r(d.protein_g)} prot · ${r(d.carbs_g)} gluc · ${r(d.fat_g)} lip`);
    }
  }
  return lines.join('\n');
}

/**
 * formatPairingsShare — turns a matchPairings() hit into a shareable
 * plain-text "recipe card". Used by the pairings section's Share button
 * and by navigator.share on mobile (WhatsApp, Messages, Mail). Pure
 * presenter — takes raw data, no DOM.
 *
 * Shape matches matchPairings() output: { name, pairs: [{ b, fr, cooccur }] }.
 * lang defaults to 'fr'. Empty/invalid input → ''.
 */
export function formatPairingsShare(hit, opts = {}) {
  if (!hit || !hit.name || !Array.isArray(hit.pairs) || hit.pairs.length === 0) return '';
  const { lang = 'fr' } = opts;
  const isFr = lang !== 'en';
  const header = isFr
    ? `🍳 Accords pour "${hit.name}"`
    : `🍳 Pairings for "${hit.name}"`;
  const sub = isFr ? 'Associations les plus fréquentes :' : 'Most common matches:';
  const lines = [header, '', sub];
  for (const p of hit.pairs.slice(0, 6)) {
    const label = p.fr ?? p.b.replace(/_/g, ' ');
    const tail = Number.isFinite(p.cooccur)
      ? (isFr ? ` (partagé dans ${p.cooccur} recettes)` : ` (shared in ${p.cooccur} recipes)`)
      : '';
    lines.push(`• ${label}${tail}`);
  }
  lines.push('');
  lines.push(isFr
    ? `Idée : commence avec ${hit.name}, ajoute 2–3 éléments ci-dessus, assaisonne.`
    : `Idea: start with ${hit.name}, add 2–3 items above, season to taste.`);
  lines.push(isFr
    ? '— Scann-eat (corpus Ahn et al. 2011)'
    : '— Scann-eat (Ahn et al. 2011 recipe corpus)');
  return lines.join('\n');
}

/**
 * State of an intermittent-fasting window given its start time, the current
 * time, and a target duration in hours (default 16 for a classic 16:8).
 *
 * Pure — takes milliseconds instead of Date objects so tests don't have to
 * mock the clock.
 *
 * Returns:
 *   elapsed_ms   — how long since start
 *   remaining_ms — target - elapsed, floored at 0
 *   pct          — elapsed / target * 100, clamped to 0–100
 *   complete     — true when pct ≥ 100 (user can eat)
 *   overrun_ms   — if complete, how long past target (for a "fasted 16h30m" message)
 *   label        — "6:30 / 16:00" style elapsed/target string
 */
export function fastingStatus(startMs, nowMs, targetHours = 16) {
  const targetMs = Math.max(1, targetHours * 3_600_000);
  const elapsed = Math.max(0, nowMs - startMs);
  const remaining = Math.max(0, targetMs - elapsed);
  const pct = Math.max(0, Math.min(100, (elapsed / targetMs) * 100));
  const complete = elapsed >= targetMs;
  const overrun = complete ? elapsed - targetMs : 0;

  const fmt = (ms) => {
    const totalMin = Math.floor(ms / 60_000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  return {
    elapsed_ms: elapsed,
    remaining_ms: remaining,
    pct,
    complete,
    overrun_ms: overrun,
    label: `${fmt(elapsed)} / ${targetHours}:00`,
  };
}

/**
 * Build the SVG path `d` attribute for a line chart of the given values,
 * plus the Y-axis min/max used for scaling. Pure — no DOM touched.
 *
 * Coordinates are normalized to a `[0, width] × [0, height]` viewBox so the
 * caller can size the chart with CSS.
 *
 *   values:  array of numbers (may include null/undefined for gaps)
 *   width:   logical chart width (default 300)
 *   height:  logical chart height (default 100)
 *   padding: inner padding so points don't clip the edges
 *
 * Returns:
 *   path_d:  M/L commands building a polyline; `M` restarts after null gaps
 *   min/max: the y-range used, handy for rendering axis labels
 *   points:  array of {x, y, value} for plotted points (null values skipped)
 */
export function buildLineChartPath(values, opts = {}) {
  const width = opts.width ?? 300;
  const height = opts.height ?? 100;
  const padding = opts.padding ?? 6;
  const cleaned = (values ?? []).map((v) =>
    typeof v === 'number' && Number.isFinite(v) ? v : null,
  );
  const numeric = cleaned.filter((v) => v !== null);
  if (numeric.length === 0) {
    return { path_d: '', min: 0, max: 0, points: [] };
  }
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || 1; // avoid div-by-zero when all values equal
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = cleaned.length > 1 ? innerW / (cleaned.length - 1) : 0;

  const points = [];
  let d = '';
  let started = false;
  for (let i = 0; i < cleaned.length; i++) {
    const v = cleaned[i];
    if (v === null) { started = false; continue; }
    const x = padding + stepX * i;
    // SVG y grows downward; invert so higher values sit higher.
    const y = padding + innerH - ((v - min) / range) * innerH;
    points.push({ x, y, value: v });
    d += (started ? ' L ' : ' M ') + x.toFixed(1) + ' ' + y.toFixed(1);
    started = true;
  }
  return { path_d: d.trim(), min, max, points };
}

/**
 * Quick sharpness heuristic. Given a flat luminance array (0–255) and its
 * width, compute an approximation of the variance of a Laplacian filter —
 * a classic "is this image sharp?" metric. High variance = sharp (edges
 * present). Low variance = blurry / low-contrast (wall, finger on lens,
 * out-of-focus).
 *
 * Pure — takes a pre-extracted luminance buffer rather than a Canvas /
 * ImageData, so it runs in Node tests without a DOM.
 *
 * The caller will usually downsample the photo to ~64×64 before calling
 * this. Heuristic thresholds we've observed empirically:
 *
 *   variance < 40   → very likely blurry / blank
 *   40 ≤ v < 120    → borderline; warn but allow
 *   v ≥ 120         → sharp enough for OCR
 */
export function laplacianVariance(luma, width) {
  if (!luma || luma.length === 0 || !width) return 0;
  const height = Math.floor(luma.length / width);
  if (height < 3) return 0;

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  // 3×3 discrete Laplacian: center * 4 − (top + bottom + left + right)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        4 * luma[i] -
        luma[i - width] - luma[i + width] - luma[i - 1] - luma[i + 1];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.max(0, variance);
}

export function sharpnessVerdict(variance) {
  if (variance < 40) return 'blurry';
  if (variance < 120) return 'borderline';
  return 'sharp';
}

/**
 * Build a CSV string of daily totals from a list of consumption entries.
 * Pure — no file I/O. Caller downloads the returned string as a blob.
 *
 * One row per (date, meal) cell? No — one row per DATE with summed macros
 * and entry count. Excel-friendly: UTF-8 BOM prefix, quoted fields,
 * CRLF line terminators, comma separator. The BOM ensures Excel picks
 * UTF-8 instead of guessing CP1252 and butchering accented text.
 *
 * Column order is fixed + documented in the header row, so a user can
 * pivot / chart without further massaging.
 */
export function entriesToDailyCSV(entries) {
  const byDate = new Map();
  for (const e of entries ?? []) {
    if (!e?.date) continue;
    const key = e.date;
    const row = byDate.get(key) ?? {
      date: key, entries: 0, kcal: 0, carbs_g: 0, protein_g: 0,
      fat_g: 0, sat_fat_g: 0, sugars_g: 0, salt_g: 0,
    };
    row.entries += 1;
    row.kcal      += Number(e.kcal) || 0;
    row.carbs_g   += Number(e.carbs_g) || 0;
    row.protein_g += Number(e.protein_g) || 0;
    row.fat_g     += Number(e.fat_g) || 0;
    row.sat_fat_g += Number(e.sat_fat_g) || 0;
    row.sugars_g  += Number(e.sugars_g) || 0;
    row.salt_g    += Number(e.salt_g) || 0;
    byDate.set(key, row);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const header = [
    'date', 'entries', 'kcal', 'carbs_g', 'protein_g',
    'fat_g', 'sat_fat_g', 'sugars_g', 'salt_g',
  ];
  const round1 = (v) => Math.round(v * 10) / 10;
  const round3 = (v) => Math.round(v * 1000) / 1000;
  const fmt = (r) => [
    r.date, r.entries, round1(r.kcal), round1(r.carbs_g), round1(r.protein_g),
    round1(r.fat_g), round1(r.sat_fat_g), round1(r.sugars_g), round3(r.salt_g),
  ];
  // CSV quoting: fields don't contain commas or quotes given our data, but
  // wrap in quotes anyway for Excel safety.
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((r) => fmt(r).map(q).join(','));
  const bom = '﻿'; // UTF-8 BOM for Excel
  return bom + [header.map(q).join(','), ...body].join('\r\n') + '\r\n';
}

/**
 * Compute the next future-Date timestamp for a given HH:MM local string,
 * relative to `now`. If today's time already passed, jumps to tomorrow.
 * Pure — takes numeric `now` so tests don't fight Date.now().
 *
 *   nextOccurrenceMs('07:30', 0)           → 07:30 of the epoch day
 *   nextOccurrenceMs('07:30', hour(10))    → 07:30 of the next day
 *
 * Returns a ms timestamp or null if the input is malformed.
 */
export function nextOccurrenceMs(hhmm, nowMs) {
  if (typeof hhmm !== 'string') return null;
  // Strict on hour (0-23): a "25:00" input is almost certainly user error
  // and we don't want to silently clamp it to 23:00 — that's surprising.
  // Loose on minutes: "23:75" parses + clamps to 23:59 since the typo
  // intent is clearer (you can guess they meant 23:59).
  const m = hhmm.match(/^([01]?\d|2[0-3]):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Math.max(0, Math.min(59, Number(m[2])));
  const now = new Date(nowMs);
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

/**
 * Export consumption entries in a health-app-friendly JSON shape. One
 * record per MEAL (not per day, because Apple Health + Google Fit both
 * expect per-intake timestamps). Field names align with Apple Health's
 * Dietary Energy + macro type identifiers.
 *
 * Consumable directly by:
 *   - iOS Shortcuts with the "Log Health Sample" action
 *   - "Health Auto Export" and similar bridge apps on iOS / Android
 *
 * Can NOT be imported directly by Apple Health / Google Fit without a
 * middleware app — a PWA has no access to those native stores.
 */
export function entriesToHealthJSON(entries) {
  const out = (entries ?? []).map((e) => ({
    timestamp: e.timestamp
      ? new Date(Number(e.timestamp)).toISOString()
      : `${e.date}T12:00:00.000Z`,
    name: e.product_name || '(—)',
    meal: e.meal || 'snack',
    grams: Number(e.grams) || 0,
    // Apple Health identifiers
    dietaryEnergy_kcal: Number(e.kcal) || 0,
    dietaryCarbohydrates_g: Number(e.carbs_g) || 0,
    dietaryProtein_g: Number(e.protein_g) || 0,
    dietaryFatTotal_g: Number(e.fat_g) || 0,
    dietaryFatSaturated_g: Number(e.sat_fat_g) || 0,
    dietarySugar_g: Number(e.sugars_g) || 0,
    dietarySodium_mg: Math.round((Number(e.salt_g) || 0) * 400), // salt → sodium ≈ × 0.4
  }));
  return {
    source: 'scann-eat',
    exported_at: new Date().toISOString(),
    schema: 'apple-health-dietary-v1',
    entries: out,
  };
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

/**
 * Linear extrapolation from the current weight + weekly slope to a target
 * weight. Pure function — exported for unit tests.
 *
 * Returns one of:
 *   { status: 'insufficient-data' }    — <2 entries or no goal set
 *   { status: 'flat'           }       — slope is 0 kg/week (no trend)
 *   { status: 'wrong-direction' }      — slope takes user AWAY from goal
 *   { status: 'already-reached' }      — current_kg already at / past goal
 *   { status: 'ok', weeks, days, targetISO, kgPerWeek }
 *
 * Kept intentionally simple — it's a display aid, not a medical
 * prediction. Doesn't try to project fat vs lean mass splits or account
 * for metabolic adaptation as weight changes.
 */
export function weightForecast(currentKg, goalKg, weeklySlopeKg, nowMs = Date.now()) {
  const c = Number(currentKg);
  const g = Number(goalKg);
  const s = Number(weeklySlopeKg);
  if (!Number.isFinite(c) || c <= 0) return { status: 'insufficient-data' };
  if (!Number.isFinite(g) || g <= 0) return { status: 'insufficient-data' };
  if (!Number.isFinite(s)) return { status: 'insufficient-data' };
  const delta = g - c; // positive → need to gain; negative → need to lose
  if (Math.abs(delta) < 0.05) return { status: 'already-reached' };
  if (s === 0) return { status: 'flat' };
  // Signs must agree: gaining (delta > 0) requires positive slope,
  // losing (delta < 0) requires negative slope.
  if (Math.sign(delta) !== Math.sign(s)) return { status: 'wrong-direction' };
  const weeks = Math.abs(delta / s);
  const days = Math.round(weeks * 7);
  const target = new Date(nowMs + days * 86_400_000);
  return {
    status: 'ok',
    weeks: Math.round(weeks * 10) / 10,
    days,
    targetISO: target.toISOString().slice(0, 10),
    kgPerWeek: s,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Close-the-gap nutrient suggestions
// ─────────────────────────────────────────────────────────────────────────
//
// Given today's totals + the user's targets + the FOOD_DB, return up to
// 3 suggestions per under-met "more is better" nutrient. Each suggestion
// is { food_name, grams, contribution } where `grams` is the amount of
// that food needed to close roughly half the day's gap.
//
// Why "half" not "full"? Two reasons:
//   1. The user usually eats more before bed than what closes the gap
//      exactly — leaving headroom is friendlier than implying you must
//      eat exactly 280 g of lentils to hit fiber.
//   2. The estimate becomes useless if it asks for 600 g of broccoli to
//      close a 1000 mg calcium gap — capping by share keeps suggestions
//      realistic.
//
// Only operates on nutrients where MORE is better (protein, fiber,
// micros). Skips negative-nutrient targets (sugar/salt/sat-fat caps).
// Pure — exported for tests; no DOM, no IDB.
//
const GAP_NUTRIENTS = [
  // [totals key, target key, label key, target-share to close, max grams cap]
  ['protein_g', 'protein_g_target', 'protein', 0.5, 300],
  ['fiber_g',   'fiber_g_target',   'fiber',   0.5, 200],
  ['iron_mg',   'iron_mg_target',   'iron',    0.5, 200],
  ['calcium_mg','calcium_mg_target','calcium', 0.5, 300],
  ['vit_d_ug',  'vit_d_ug_target',  'vit_d',   0.5, 200],
  ['b12_ug',    'b12_ug_target',    'b12',     0.5, 200],
];

export function closeTheGap(totals, targets, foodDB) {
  const out = [];
  if (!totals || !targets || !Array.isArray(foodDB) || foodDB.length === 0) return out;
  for (const [valKey, tgtKey, label, share, gramsCap] of GAP_NUTRIENTS) {
    const got = Number(totals[valKey]) || 0;
    const tgt = Number(targets[tgtKey]) || 0;
    if (tgt <= 0) continue;
    const deficit = tgt - got;
    if (deficit <= 0) continue;
    const need = deficit * share; // close roughly half the gap

    // Score by per-100 g density of this nutrient. Skip foods that
    // don't carry the nutrient at all so we don't suggest meaningless
    // items. Sort by density desc — most-concentrated food first, so
    // a 20 g handful of almonds outranks 220 g of lentils for the same
    // contribution. The user wants the smallest reasonable portion.
    const ranked = [];
    for (const f of foodDB) {
      const density = Number(f[valKey]) || 0;
      if (density <= 0) continue;
      const grams = Math.round((need / density) * 100);
      if (grams <= 0 || grams > gramsCap) continue;
      const contribution = Math.round(density * (grams / 100) * 10) / 10;
      ranked.push({ food: f, grams, contribution, density });
    }
    ranked.sort((a, b) => b.density - a.density);

    if (ranked.length === 0) continue;
    out.push({
      nutrient: label,
      key: valKey,
      target_key: tgtKey,
      deficit: Math.round(deficit * 10) / 10,
      suggestions: ranked.slice(0, 3).map((r) => ({
        name: r.food.name,
        grams: r.grams,
        contribution: r.contribution,
      })),
    });
  }
  return out;
}
