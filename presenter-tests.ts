/**
 * ============================================================================
 * PRESENTERS — TESTS
 * ============================================================================
 *
 * Pure helpers extracted from app.js so they can run under node:test without
 * a DOM shim. See public/presenters.js for the source.
 * ============================================================================
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS module consumed from TS test
import { computeConfidence, snapshotFromData, timeAgoBucket, defaultMealForHour, logStreakDays, parseVoiceQuickAdd, waterGoalMl, weeklyRollup, fastingStatus, buildLineChartPath } from './public/presenters.js';

// ============================================================================
// computeConfidence
// ============================================================================

describe('computeConfidence', () => {
  it('openfoodfacts source is always high confidence', () => {
    const data = {
      source: 'openfoodfacts',
      warnings: ['anything'],
      product: { nutrition: {} },
    };
    assert.equal(computeConfidence(data), 'high');
  });

  it('clean LLM extraction with ≥4 filled macros is high', () => {
    const data = {
      source: 'llm',
      warnings: [],
      product: {
        nutrition: {
          energy_kcal: 150, fat_g: 8, carbs_g: 10, sugars_g: 2,
          protein_g: 5, salt_g: 0.5,
        },
      },
    };
    assert.equal(computeConfidence(data), 'high');
  });

  it('≥2 warnings downgrades to low regardless of macro count', () => {
    const data = {
      source: 'llm',
      warnings: ['w1', 'w2'],
      product: {
        nutrition: {
          energy_kcal: 150, fat_g: 8, carbs_g: 10, sugars_g: 2,
          protein_g: 5, salt_g: 0.5,
        },
      },
    };
    assert.equal(computeConfidence(data), 'low');
  });

  it('≤2 filled macros is low', () => {
    const data = {
      source: 'llm',
      warnings: [],
      product: {
        nutrition: {
          energy_kcal: 150, fat_g: 8, carbs_g: 0, sugars_g: 0,
          protein_g: 0, salt_g: 0,
        },
      },
    };
    assert.equal(computeConfidence(data), 'low');
  });

  it('3 filled macros with zero warnings is medium', () => {
    const data = {
      source: 'llm',
      warnings: [],
      product: {
        nutrition: {
          energy_kcal: 150, fat_g: 8, carbs_g: 10, sugars_g: 0,
          protein_g: 0, salt_g: 0,
        },
      },
    };
    assert.equal(computeConfidence(data), 'medium');
  });

  it('null data returns low (defensive)', () => {
    assert.equal(computeConfidence(null), 'low');
    assert.equal(computeConfidence({}), 'low');
    assert.equal(computeConfidence({ product: {} }), 'low');
  });

  it('non-numeric macro values do not count as filled', () => {
    const data = {
      source: 'llm',
      warnings: [],
      product: {
        nutrition: {
          energy_kcal: '150', fat_g: null, carbs_g: undefined, sugars_g: NaN,
          protein_g: 5, salt_g: 0.5,
        },
      },
    };
    // Only 2 truly-numeric > 0 (protein + salt) → low
    assert.equal(computeConfidence(data), 'low');
  });
});

// ============================================================================
// snapshotFromData
// ============================================================================

describe('snapshotFromData', () => {
  it('prefers audit.product_name over product.name when both exist', () => {
    const data = {
      audit: { product_name: 'Scored name', grade: 'B', score: 72 },
      product: { name: 'Raw name', ingredients: [] },
    };
    assert.equal(snapshotFromData(data).name, 'Scored name');
  });

  it('falls back to product.name when audit name is empty', () => {
    const data = {
      audit: { product_name: '', grade: 'B', score: 72 },
      product: { name: 'Raw name', ingredients: [] },
    };
    assert.equal(snapshotFromData(data).name, 'Raw name');
  });

  it('flattens ingredients to name strings', () => {
    const data = {
      audit: { product_name: 'X', grade: 'A', score: 85 },
      product: {
        name: 'X',
        ingredients: [{ name: 'flour' }, { name: 'water' }, { name: 'salt' }],
      },
    };
    assert.deepEqual(snapshotFromData(data).ingredients, ['flour', 'water', 'salt']);
  });

  it('handles missing ingredients array defensively', () => {
    const data = {
      audit: { product_name: 'X', grade: 'A', score: 85 },
      product: { name: 'X' },
    };
    assert.deepEqual(snapshotFromData(data).ingredients, []);
  });
});

// ============================================================================
// timeAgoBucket
// ============================================================================

describe('timeAgoBucket', () => {
  it('<1 minute → justNow', () => {
    assert.deepEqual(timeAgoBucket(0), { kind: 'justNow' });
    assert.deepEqual(timeAgoBucket(29_000), { kind: 'justNow' });
  });

  it('1-59 minutes → minutes bucket', () => {
    assert.deepEqual(timeAgoBucket(60_000), { kind: 'minutes', n: 1 });
    assert.deepEqual(timeAgoBucket(5 * 60_000), { kind: 'minutes', n: 5 });
    assert.deepEqual(timeAgoBucket(59 * 60_000), { kind: 'minutes', n: 59 });
  });

  it('1-23 hours → hours bucket', () => {
    assert.deepEqual(timeAgoBucket(60 * 60_000), { kind: 'hours', n: 1 });
    assert.deepEqual(timeAgoBucket(3 * 60 * 60_000), { kind: 'hours', n: 3 });
  });

  it('≥24 hours → days bucket', () => {
    assert.deepEqual(timeAgoBucket(24 * 60 * 60_000), { kind: 'days', n: 1 });
    assert.deepEqual(timeAgoBucket(5 * 24 * 60 * 60_000), { kind: 'days', n: 5 });
  });

  it('rounds to the nearest bucket (not floors)', () => {
    // 29.5 seconds rounds to 0 minutes → justNow
    assert.deepEqual(timeAgoBucket(29_500), { kind: 'justNow' });
    // 30 seconds rounds to 1 minute → minutes
    assert.deepEqual(timeAgoBucket(30_000), { kind: 'minutes', n: 1 });
  });
});

// ============================================================================
// defaultMealForHour
// ============================================================================

describe('defaultMealForHour', () => {
  it('early morning (5-9) → breakfast', () => {
    assert.equal(defaultMealForHour(5), 'breakfast');
    assert.equal(defaultMealForHour(8), 'breakfast');
    assert.equal(defaultMealForHour(9), 'breakfast');
  });

  it('midday (10-13) → lunch', () => {
    assert.equal(defaultMealForHour(10), 'lunch');
    assert.equal(defaultMealForHour(12), 'lunch');
    assert.equal(defaultMealForHour(13), 'lunch');
  });

  it('afternoon (14-17) → snack', () => {
    assert.equal(defaultMealForHour(14), 'snack');
    assert.equal(defaultMealForHour(17), 'snack');
  });

  it('evening + late night (18+, 0-4) → dinner', () => {
    assert.equal(defaultMealForHour(18), 'dinner');
    assert.equal(defaultMealForHour(21), 'dinner');
    assert.equal(defaultMealForHour(23), 'dinner');
    assert.equal(defaultMealForHour(0), 'dinner');
    assert.equal(defaultMealForHour(4), 'dinner');
  });
});

// ============================================================================
// logStreakDays
// ============================================================================

describe('logStreakDays', () => {
  const mk = (...dates: string[]) => dates.map((d) => ({ date: d }));

  it('0 when no entries', () => {
    assert.equal(logStreakDays([], '2026-04-22'), 0);
  });

  it('1 when only today is logged', () => {
    const e = mk('2026-04-22');
    assert.equal(logStreakDays(e, '2026-04-22'), 1);
  });

  it('counts consecutive days including today', () => {
    const e = mk('2026-04-20', '2026-04-21', '2026-04-22');
    assert.equal(logStreakDays(e, '2026-04-22'), 3);
  });

  it('breaks on a missing day', () => {
    const e = mk('2026-04-19', '2026-04-21', '2026-04-22');
    // today + yesterday are present, day before is skipped → streak = 2
    assert.equal(logStreakDays(e, '2026-04-22'), 2);
  });

  it('1-day grace: today empty + yesterday logged still counts', () => {
    const e = mk('2026-04-20', '2026-04-21');
    // yesterday is logged → start there, count back
    assert.equal(logStreakDays(e, '2026-04-22'), 2);
  });

  it('2-day gap → 0 (grace is only 1 day)', () => {
    const e = mk('2026-04-18', '2026-04-19', '2026-04-20');
    assert.equal(logStreakDays(e, '2026-04-22'), 0);
  });

  it('deduplicates multiple entries on the same day', () => {
    const e = mk('2026-04-22', '2026-04-22', '2026-04-22', '2026-04-21');
    assert.equal(logStreakDays(e, '2026-04-22'), 2);
  });
});

// ============================================================================
// parseVoiceQuickAdd
// ============================================================================

describe('parseVoiceQuickAdd', () => {
  it('returns empty object for empty / missing input', () => {
    assert.deepEqual(parseVoiceQuickAdd(''), {});
    assert.deepEqual(parseVoiceQuickAdd(null), {});
    assert.deepEqual(parseVoiceQuickAdd(undefined), {});
  });

  it('extracts kcal from "120 calories"', () => {
    const r = parseVoiceQuickAdd('café au lait 120 calories');
    assert.equal(r.kcal, 120);
    assert.equal(r.name, 'café au lait');
  });

  it('extracts kcal from "kcal" and "cal" variants', () => {
    assert.equal(parseVoiceQuickAdd('250 kcal').kcal, 250);
    assert.equal(parseVoiceQuickAdd('90 cal').kcal, 90);
  });

  it('extracts portion (grams + ml)', () => {
    assert.equal(parseVoiceQuickAdd('yaourt 125 g').grams, 125);
    assert.equal(parseVoiceQuickAdd('boisson 250 ml').grams, 250);
  });

  it('handles French comma decimals', () => {
    const r = parseVoiceQuickAdd('salade 8,5 g de protéines');
    assert.equal(r.protein_g, 8.5);
  });

  it('distinguishes grams from grams-of-macro', () => {
    // "15 g de protéines" should populate protein, NOT grams
    const r = parseVoiceQuickAdd('barre 15 g de protéines');
    assert.equal(r.protein_g, 15);
    assert.equal(r.grams, undefined);
  });

  it('extracts all four macros from a full phrase', () => {
    const r = parseVoiceQuickAdd(
      'pizza 350 calories 40 g de glucides 15 g de protéines 12 g de lipides',
    );
    assert.equal(r.kcal, 350);
    assert.equal(r.carbs_g, 40);
    assert.equal(r.protein_g, 15);
    assert.equal(r.fat_g, 12);
  });

  it('leaves the remaining text as the name', () => {
    const r = parseVoiceQuickAdd('banane nature 110 kcal');
    assert.equal(r.name, 'banane nature');
  });

  it('recognizes EN vocabulary too', () => {
    const r = parseVoiceQuickAdd('oatmeal 150 kcal 30 g of carbs 5 g of protein');
    assert.equal(r.kcal, 150);
    assert.equal(r.carbs_g, 30);
    assert.equal(r.protein_g, 5);
  });

  it('only overwrites parsed keys (caller spreads safely)', () => {
    const r = parseVoiceQuickAdd('just a name no numbers');
    assert.equal(r.kcal, undefined);
    assert.equal(r.protein_g, undefined);
    assert.equal(r.name, 'just a name no numbers');
  });
});

// ============================================================================
// waterGoalMl — hydration goal derivation
// ============================================================================

describe('waterGoalMl', () => {
  it('defaults to 2000 ml when no profile / no weight / no sex', () => {
    assert.equal(waterGoalMl({}), 2000);
    assert.equal(waterGoalMl(null), 2000);
    assert.equal(waterGoalMl(undefined), 2000);
  });

  it('scales by weight (33 ml/kg) when available', () => {
    // 60 kg → 1980 → rounded to 2000
    assert.equal(waterGoalMl({ weight_kg: 60 }), 2000);
    // 80 kg → 2640 → rounded to 2600
    assert.equal(waterGoalMl({ weight_kg: 80 }), 2600);
    // 100 kg → 3300 → 3300
    assert.equal(waterGoalMl({ weight_kg: 100 }), 3300);
  });

  it('female baseline without weight = 1500', () => {
    assert.equal(waterGoalMl({ sex: 'female' }), 1500);
  });

  it('male baseline without weight = 2000', () => {
    assert.equal(waterGoalMl({ sex: 'male' }), 2000);
  });

  it('active profile earns +500 ml', () => {
    // 80 kg → 2640 → 2600, + 500 = 3100
    assert.equal(waterGoalMl({ weight_kg: 80, activity: 'active' }), 3100);
  });

  it('very_active profile earns +500 ml', () => {
    assert.equal(waterGoalMl({ weight_kg: 80, activity: 'very_active' }), 3100);
  });

  it('sedentary profile earns no bonus', () => {
    assert.equal(waterGoalMl({ weight_kg: 80, activity: 'sedentary' }), 2600);
  });

  it('always returns a multiple of 100 for readability', () => {
    for (const w of [55, 62, 68, 73, 77, 81, 89, 95]) {
      const g = waterGoalMl({ weight_kg: w });
      assert.equal(g % 100, 0, `goal ${g} for ${w}kg should be divisible by 100`);
    }
  });
});

// ============================================================================
// weeklyRollup — 7-day window aggregation
// ============================================================================

describe('weeklyRollup', () => {
  const mk = (date: string, kcal: number, extras: Record<string, number> = {}) => ({
    date, kcal, carbs_g: 0, protein_g: 0, fat_g: 0, sat_fat_g: 0, sugars_g: 0, salt_g: 0, ...extras,
  });

  it('returns exactly 7 days, oldest first', () => {
    const r = weeklyRollup([], '2026-04-22');
    assert.equal(r.days.length, 7);
    assert.equal(r.days[0].date, '2026-04-16');
    assert.equal(r.days[6].date, '2026-04-22');
  });

  it('zero-fills days with no entries', () => {
    const r = weeklyRollup([mk('2026-04-22', 500)], '2026-04-22');
    assert.equal(r.days[0].kcal, 0);
    assert.equal(r.days[6].kcal, 500);
  });

  it('sums kcal across same-day entries', () => {
    const r = weeklyRollup([
      mk('2026-04-22', 500), mk('2026-04-22', 200), mk('2026-04-22', 100),
    ], '2026-04-22');
    assert.equal(r.days[6].kcal, 800);
    assert.equal(r.days[6].count, 3);
  });

  it('ignores entries outside the 7-day window', () => {
    const r = weeklyRollup([mk('2026-04-15', 999), mk('2026-04-23', 999)], '2026-04-22');
    // Both out-of-window → totals stay zero
    assert.equal(r.total.kcal, 0);
  });

  it('averages only over days with entries, not the 7-day denominator', () => {
    // Logged 2 days (500 + 1500). Average should be 1000, not 2000/7.
    const r = weeklyRollup([
      mk('2026-04-21', 500),
      mk('2026-04-22', 1500),
    ], '2026-04-22');
    assert.equal(r.days_logged, 2);
    assert.equal(r.avg.kcal, 1000);
    assert.equal(r.total.kcal, 2000);
  });

  it('days_logged = 0 when no entries → avg denom clamps to 1', () => {
    const r = weeklyRollup([], '2026-04-22');
    assert.equal(r.days_logged, 0);
    assert.equal(r.avg.kcal, 0);
  });

  it('sums every macro field independently', () => {
    const e = mk('2026-04-22', 100, { protein_g: 10, carbs_g: 20, fat_g: 5, salt_g: 0.5 });
    const r = weeklyRollup([e, e], '2026-04-22');
    assert.equal(r.total.protein_g, 20);
    assert.equal(r.total.carbs_g, 40);
    assert.equal(r.total.fat_g, 10);
    assert.equal(r.total.salt_g, 1);
  });
});

// ============================================================================
// fastingStatus — intermittent-fasting countdown
// ============================================================================

describe('fastingStatus', () => {
  const hour = (n: number) => n * 3_600_000;

  it('just started: 0% elapsed, 16h remaining', () => {
    const s = fastingStatus(0, 0, 16);
    assert.equal(s.elapsed_ms, 0);
    assert.equal(s.remaining_ms, hour(16));
    assert.equal(s.pct, 0);
    assert.equal(s.complete, false);
  });

  it('halfway: 8h elapsed at 16h target → 50%', () => {
    const s = fastingStatus(0, hour(8), 16);
    assert.equal(s.pct, 50);
    assert.equal(s.remaining_ms, hour(8));
    assert.equal(s.complete, false);
  });

  it('complete at target: pct 100, remaining 0, overrun 0', () => {
    const s = fastingStatus(0, hour(16), 16);
    assert.equal(s.pct, 100);
    assert.equal(s.remaining_ms, 0);
    assert.equal(s.complete, true);
    assert.equal(s.overrun_ms, 0);
  });

  it('overrun: elapsed past target reports overrun_ms', () => {
    const s = fastingStatus(0, hour(17), 16);
    assert.equal(s.complete, true);
    assert.equal(s.overrun_ms, hour(1));
    assert.equal(s.pct, 100); // clamped
  });

  it('negative elapsed (clock-skew) clamps to 0', () => {
    const s = fastingStatus(1_000_000, 0, 16);
    assert.equal(s.elapsed_ms, 0);
    assert.equal(s.pct, 0);
  });

  it('formats the elapsed/target label as h:mm', () => {
    const s = fastingStatus(0, hour(6) + 30 * 60_000, 16);
    assert.equal(s.label, '6:30 / 16:00');
  });

  it('default target is 16 hours', () => {
    const s = fastingStatus(0, hour(16));
    assert.equal(s.complete, true);
  });

  it('custom target (e.g. 18:6) respected', () => {
    const s = fastingStatus(0, hour(16), 18);
    assert.equal(s.complete, false);
    assert.equal(s.remaining_ms, hour(2));
  });
});

// ============================================================================
// buildLineChartPath — SVG path builder for progress charts
// ============================================================================

describe('buildLineChartPath', () => {
  it('empty input → no path, zero min/max, empty points', () => {
    const r = buildLineChartPath([]);
    assert.equal(r.path_d, '');
    assert.equal(r.min, 0);
    assert.equal(r.max, 0);
    assert.deepEqual(r.points, []);
  });

  it('single value → one M command, min == max', () => {
    const r = buildLineChartPath([80]);
    assert.match(r.path_d, /^M /);
    assert.equal(r.min, 80);
    assert.equal(r.max, 80);
    assert.equal(r.points.length, 1);
  });

  it('ascending series → ascending x, descending y (SVG coord)', () => {
    const r = buildLineChartPath([70, 72, 75, 78], { width: 300, height: 100, padding: 0 });
    // x monotonically increasing
    for (let i = 1; i < r.points.length; i++) {
      assert.ok(r.points[i].x > r.points[i - 1].x);
    }
    // higher data value → lower y coordinate (chart top = low y)
    for (let i = 1; i < r.points.length; i++) {
      assert.ok(r.points[i].y < r.points[i - 1].y, `y should decrease as value grows: ${JSON.stringify(r.points)}`);
    }
  });

  it('null values split the path with a new M command', () => {
    const r = buildLineChartPath([70, null, 75, 78]);
    // Expect two M commands (one before 70, one before 75)
    const mCount = (r.path_d.match(/M /g) || []).length;
    assert.equal(mCount, 2);
    assert.equal(r.points.length, 3);
  });

  it('all-equal values → flat line at mid-height (range=1 guard)', () => {
    const r = buildLineChartPath([72, 72, 72], { width: 300, height: 100, padding: 0 });
    // All y the same, positioned at the top (because (v - min)/range = 0)
    const ys = new Set(r.points.map((p) => p.y));
    assert.equal(ys.size, 1);
  });

  it('respects width / height / padding options', () => {
    const r = buildLineChartPath([1, 2, 3], { width: 100, height: 50, padding: 5 });
    assert.ok(r.points[0].x >= 5 && r.points[0].x <= 95);
    assert.ok(r.points[0].y >= 5 && r.points[0].y <= 45);
    assert.ok(r.points[2].x >= 5 && r.points[2].x <= 95);
  });

  it('non-numeric entries are treated as gaps', () => {
    const r = buildLineChartPath([1, 'bad' as unknown as number, 3, NaN, 5]);
    // 3 numeric points (1, 3, 5)
    assert.equal(r.points.length, 3);
  });
});
