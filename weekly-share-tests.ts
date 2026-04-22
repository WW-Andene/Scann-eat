/**
 * formatWeeklyShare — weekly rollup text serialisation.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS
import { weeklyRollup, formatWeeklyShare } from './public/core/presenters.js';

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
