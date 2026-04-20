/**
 * Consumption arithmetic tests — no IDB needed.
 *
 * Verifies the per-100 g → per-portion conversion and the daily aggregation,
 * which are pure functions exported from consumption.js.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

(globalThis as { localStorage?: Storage }).localStorage = {
  _d: {} as Record<string, string>,
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {},
  key() { return null; },
  get length() { return 0; },
} as unknown as Storage;

// Stub crypto.randomUUID for deterministic tests.
if (!('crypto' in globalThis) || !('randomUUID' in (globalThis as { crypto?: Crypto }).crypto!)) {
  (globalThis as { crypto?: Crypto }).crypto = {
    ...((globalThis as { crypto?: Crypto }).crypto ?? {}),
    randomUUID: () => 'test-uuid' as `${string}-${string}-${string}-${string}-${string}`,
  } as Crypto;
}

const { buildEntry, sumTotals, todayISO } = await import('./public/consumption.js');

type P = {
  name: string; category: string; nutrition: Record<string, number>; weight_g?: number;
};

function product(over: Partial<P['nutrition']> = {}): P {
  return {
    name: 'Test Yogurt',
    category: 'yogurt',
    nutrition: {
      energy_kcal: 60,
      fat_g: 0.2,
      saturated_fat_g: 0.1,
      carbs_g: 8,
      sugars_g: 8,
      added_sugars_g: 6,
      fiber_g: 0,
      protein_g: 10,
      salt_g: 0.12,
      ...over,
    },
  };
}

describe('buildEntry — per-100 g → per-portion math', () => {
  it('scales linearly by grams/100 for each macro', () => {
    const e = buildEntry(product(), 200);
    assert.equal(e.grams, 200);
    assert.equal(e.kcal, 120); // 60 * 2
    assert.equal(e.sat_fat_g, 0.2);
    assert.equal(e.sugars_g, 12); // added_sugars preferred: 6 * 2
    assert.equal(e.salt_g, 0.24);
    assert.equal(e.protein_g, 20);
  });

  it('half portion', () => {
    const e = buildEntry(product(), 50);
    assert.equal(e.kcal, 30);
    assert.equal(e.protein_g, 5);
  });

  it('falls back to total sugars when added_sugars_g is missing', () => {
    const p = product();
    delete (p.nutrition as Record<string, unknown>).added_sugars_g;
    const e = buildEntry(p, 100);
    assert.equal(e.sugars_g, 8);
  });

  it('treats missing nutrition values as zero (no NaN)', () => {
    const e = buildEntry({ name: 'X', category: 'other', nutrition: { energy_kcal: 100 } as never }, 100);
    assert.equal(e.kcal, 100);
    assert.equal(e.sat_fat_g, 0);
    assert.equal(e.protein_g, 0);
  });

  it('zero grams gives zero everything', () => {
    const e = buildEntry(product(), 0);
    assert.equal(e.kcal, 0);
    assert.equal(e.protein_g, 0);
  });

  it('date is ISO YYYY-MM-DD', () => {
    const e = buildEntry(product(), 100);
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('negative grams coerces to 0', () => {
    const e = buildEntry(product(), -50);
    assert.equal(e.grams, 0);
    assert.equal(e.kcal, 0);
  });

  it('non-numeric grams coerces to 0', () => {
    const e = buildEntry(product(), 'abc' as unknown as number);
    assert.equal(e.grams, 0);
  });
});

describe('sumTotals — daily aggregation', () => {
  it('sums every macro across entries', () => {
    const e1 = buildEntry(product(), 100);
    const e2 = buildEntry(product({ energy_kcal: 300, saturated_fat_g: 5 }), 50);
    const total = sumTotals([e1, e2]);
    assert.equal(total.count, 2);
    assert.equal(total.kcal, 60 + 150); // 210
    assert.equal(total.sat_fat_g, 0.1 + 2.5); // 2.6
  });

  it('empty list → zero totals', () => {
    assert.deepEqual(sumTotals([]), {
      kcal: 0, sat_fat_g: 0, sugars_g: 0, salt_g: 0, protein_g: 0, count: 0,
    });
  });

  it('rounds the final sum to the consumption module precision', () => {
    // Each entry is rounded to 3 decimals on build, then summed and re-rounded.
    // 0.1234 → round3 → 0.123 per entry; 3 entries → 0.369.
    const e = buildEntry(product({ salt_g: 0.1234 }), 100);
    const total = sumTotals([e, e, e]);
    assert.equal(total.salt_g, 0.369);
  });
});

describe('todayISO', () => {
  it('returns a valid YYYY-MM-DD date string', () => {
    assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
