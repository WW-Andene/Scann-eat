/**
 * formatWeeklyShare — weekly rollup text serialisation.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS
import { weeklyRollup, formatWeeklyShare, formatPairingsShare, formatDailySummary } from './public/core/presenters.js';

const entries = [
  { date: '2026-04-22', kcal: 400, protein_g: 20, carbs_g: 50, fat_g: 10, sat_fat_g: 3, sugars_g: 5, salt_g: 1 },
  { date: '2026-04-22', kcal: 600, protein_g: 25, carbs_g: 70, fat_g: 15, sat_fat_g: 4, sugars_g: 8, salt_g: 1.5 },
  { date: '2026-04-21', kcal: 1800, protein_g: 60, carbs_g: 180, fat_g: 50, sat_fat_g: 12, sugars_g: 30, salt_g: 4 },
];

describe('formatWeeklyShare', () => {
  it('produces a multi-line share block for a non-empty rollup', () => {
    const rollup = weeklyRollup(entries, '2026-04-22');
    const out = formatWeeklyShare(rollup, { lang: 'fr' });
    assert.ok(out.includes('Semaine'));
    assert.ok(out.includes('kcal'));
    assert.ok(out.includes('2 jour(s) enregistré(s)'));
  });
  it('supports English', () => {
    const rollup = weeklyRollup(entries, '2026-04-22');
    const out = formatWeeklyShare(rollup, { lang: 'en' });
    assert.ok(out.includes('Week of'));
    assert.ok(out.includes('Avg/day'));
    assert.ok(out.includes('carbs'));
  });
  it('returns empty string for missing / malformed input', () => {
    assert.equal(formatWeeklyShare(null as unknown as { days: never[] }), '');
    assert.equal(formatWeeklyShare({ days: [] } as { days: never[] }), '');
  });
  it('shows empty days with a dash', () => {
    const rollup = weeklyRollup([{ date: '2026-04-22', kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 5, sat_fat_g: 1, sugars_g: 2, salt_g: 0.5 }], '2026-04-22');
    const out = formatWeeklyShare(rollup, { lang: 'fr' });
    const dashLines = out.split('\n').filter((l) => l.endsWith(' —'));
    // 6 days with no entries should appear as "<day>  —"
    assert.equal(dashLines.length, 6);
  });
});

describe('formatPairingsShare', () => {
  const hit = {
    name: 'tomate',
    en: 'tomato',
    pairs: [
      { b: 'basil', fr: 'basilic', cooccur: 577 },
      { b: 'garlic', fr: 'ail', cooccur: 420 },
      { b: 'olive_oil', fr: null, cooccur: 300 },
    ],
  };

  it('produces a French recipe card with header + co-occurrence counts', () => {
    const out = formatPairingsShare(hit, { lang: 'fr' });
    assert.ok(out.includes('🍳'));
    assert.ok(out.includes('tomate'));
    assert.ok(out.includes('basilic'));
    assert.ok(out.includes('577 recettes'));
    assert.ok(out.includes('Ahn'));
  });

  it('supports English', () => {
    const out = formatPairingsShare(hit, { lang: 'en' });
    assert.ok(out.includes('Pairings for'));
    assert.ok(out.includes('577 recipes'));
    assert.ok(out.includes('Idea:'));
  });

  it('falls back to English ID with underscores replaced when fr is null', () => {
    const out = formatPairingsShare(hit, { lang: 'fr' });
    assert.ok(out.includes('olive oil'));
  });

  it('returns empty string for missing / invalid hits', () => {
    assert.equal(formatPairingsShare(null as unknown as { name: string; pairs: never[] }), '');
    assert.equal(formatPairingsShare({ name: '', pairs: [] } as { name: string; pairs: never[] }), '');
    assert.equal(formatPairingsShare({ name: 'x', pairs: [] } as { name: string; pairs: never[] }), '');
  });
});

describe('formatDailySummary', () => {
  const totals = {
    kcal: 1800, protein_g: 85, carbs_g: 220, fat_g: 55,
    fiber_g: 28, sat_fat_g: 12, sugars_g: 35, salt_g: 3.5, count: 8,
  };
  const targets = {
    kcal: 2200, protein_g_target: 100, carbs_g_target: 250,
    fat_g_target: 70, fiber_g_target: 25,
  } as unknown as Record<string, number>;
  const burned = { kcal: 300 };

  it('returns "" when nothing is logged', () => {
    assert.equal(formatDailySummary(null as unknown as { count: number }, targets, burned), '');
    assert.equal(formatDailySummary({ count: 0 } as unknown as { count: number }, targets, burned), '');
  });

  it('produces a FR summary with macros + kcal + target %', () => {
    const out = formatDailySummary(totals, targets, burned, { lang: 'fr', dateISO: '2026-04-22' });
    assert.ok(out.includes('🥗'));
    assert.ok(out.includes('1800 kcal'));
    assert.ok(out.includes('300 brûlées'));
    assert.ok(out.includes('net 1500'));
    assert.ok(out.includes('85 g protéines'));
    assert.ok(out.includes('28 g'));
    assert.ok(out.match(/82%|81%/)); // 1800/2200 = 81.8%
    assert.ok(out.includes('Scann-eat'));
  });

  it('produces an EN summary', () => {
    const out = formatDailySummary(totals, targets, burned, { lang: 'en', dateISO: '2026-04-22' });
    assert.ok(out.includes('kcal in'));
    assert.ok(out.includes('burned'));
    assert.ok(out.includes('protein'));
    assert.ok(out.includes('carbs'));
    assert.ok(out.includes('fat'));
    assert.ok(out.includes('of daily goal'));
  });

  it('omits the burned/net clause when no exercise was logged', () => {
    const out = formatDailySummary(totals, targets, null, { lang: 'fr' });
    assert.equal(out.includes('brûlées'), false);
    assert.equal(out.includes('net'), false);
  });
});
