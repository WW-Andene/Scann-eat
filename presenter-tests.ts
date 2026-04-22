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
import { computeConfidence, snapshotFromData, timeAgoBucket, defaultMealForHour, logStreakDays, parseVoiceQuickAdd, waterGoalMl } from './public/presenters.js';

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
