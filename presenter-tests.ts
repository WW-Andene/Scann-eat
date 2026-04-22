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
import { computeConfidence, snapshotFromData, timeAgoBucket, defaultMealForHour, logStreakDays } from './public/presenters.js';

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
