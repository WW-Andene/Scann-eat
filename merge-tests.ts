/**
 * OFF + LLM hybrid merge unit tests.
 *
 * Verifies:
 *   - isOFFSparse detects truly incomplete OFF records (zero nutrition,
 *     <3 ingredients, or category='other').
 *   - mergeOFFWithLLM prefers OFF values where OFF has them, fills gaps from
 *     the LLM side, respects both ingredient lists by length.
 *   - detectSourceConflicts only warns on >20 % relative difference on
 *     non-trivial values.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { isOFFSparse, mergeOFFWithLLM, detectSourceConflicts, rankAlternatives } from './off.ts';
import type { ProductInput } from './scoring-engine.ts';

function p(overrides: Partial<ProductInput>): ProductInput {
  return {
    name: 'X',
    category: 'yogurt',
    nova_class: 3,
    ingredients: [
      { name: 'lait', is_whole_food: true, category: 'food' },
      { name: 'ferments', category: 'food' },
      { name: 'sucre', category: 'food' },
    ],
    nutrition: {
      energy_kcal: 80, fat_g: 2, saturated_fat_g: 1, carbs_g: 10,
      sugars_g: 8, added_sugars_g: 5, fiber_g: 0, protein_g: 4, salt_g: 0.1,
      trans_fat_g: null,
    },
    ...overrides,
  } as ProductInput;
}

describe('isOFFSparse', () => {
  it('returns false on a complete record', () => {
    assert.equal(isOFFSparse(p({})), false);
  });

  it('returns true when nutrition is empty', () => {
    const prod = p({
      nutrition: {
        energy_kcal: 0, fat_g: 0, saturated_fat_g: 0, carbs_g: 0,
        sugars_g: 0, added_sugars_g: null, fiber_g: 0, protein_g: 0, salt_g: 0,
        trans_fat_g: null,
      },
    });
    assert.equal(isOFFSparse(prod), true);
  });

  it('returns true when <3 ingredients', () => {
    assert.equal(
      isOFFSparse(p({ ingredients: [{ name: 'x', category: 'food' }] })),
      true,
    );
  });

  it('returns true when category is "other"', () => {
    assert.equal(isOFFSparse(p({ category: 'other' })), true);
  });
});

describe('mergeOFFWithLLM', () => {
  it('fills nutrition gaps from LLM when OFF value is 0', () => {
    const off = p({
      nutrition: {
        energy_kcal: 120, fat_g: 0, saturated_fat_g: 0, carbs_g: 15,
        sugars_g: 10, added_sugars_g: null, fiber_g: 1, protein_g: 5, salt_g: 0.3,
        trans_fat_g: null,
      },
    });
    const llm = p({
      nutrition: {
        energy_kcal: 115, fat_g: 3.2, saturated_fat_g: 2.1, carbs_g: 14,
        sugars_g: 9, added_sugars_g: 5, fiber_g: 1, protein_g: 5, salt_g: 0.3,
        trans_fat_g: null,
      },
    });
    const merged = mergeOFFWithLLM(off, llm);
    // OFF had 0 fat & sat_fat → filled from LLM
    assert.equal(merged.nutrition.fat_g, 3.2);
    assert.equal(merged.nutrition.saturated_fat_g, 2.1);
    // OFF had the rest → kept
    assert.equal(merged.nutrition.energy_kcal, 120);
    // added_sugars_g: OFF null → LLM 5
    assert.equal(merged.nutrition.added_sugars_g, 5);
  });

  it('uses LLM ingredients when OFF has fewer than 3', () => {
    const off = p({ ingredients: [{ name: 'x', category: 'food' }] });
    const llm = p({
      ingredients: [
        { name: 'a', category: 'food' }, { name: 'b', category: 'food' },
        { name: 'c', category: 'food' }, { name: 'd', category: 'food' },
      ],
    });
    const merged = mergeOFFWithLLM(off, llm);
    assert.equal(merged.ingredients.length, 4);
  });

  it('uses LLM category when OFF is "other"', () => {
    const off = p({ category: 'other' });
    const llm = p({ category: 'sandwich' });
    assert.equal(mergeOFFWithLLM(off, llm).category, 'sandwich');
  });

  it('keeps OFF category when it is not "other"', () => {
    const off = p({ category: 'yogurt' });
    const llm = p({ category: 'cheese' });
    assert.equal(mergeOFFWithLLM(off, llm).category, 'yogurt');
  });

  it('ORs organic and transparency flags across the two sources', () => {
    const off = p({ organic: false, origin_transparent: false });
    const llm = p({ organic: true, origin_transparent: true });
    const merged = mergeOFFWithLLM(off, llm);
    assert.equal(merged.organic, true);
    assert.equal(merged.origin_transparent, true);
  });
});

describe('detectSourceConflicts', () => {
  it('no warning when values agree', () => {
    const off = p({});
    const llm = p({});
    assert.deepEqual(detectSourceConflicts(off, llm), []);
  });

  it('warns when sugars differ by >20 %', () => {
    const off = p({
      nutrition: { ...p({}).nutrition, sugars_g: 10 },
    });
    const llm = p({
      nutrition: { ...p({}).nutrition, sugars_g: 16 },
    });
    const ws = detectSourceConflicts(off, llm);
    assert.equal(ws.length, 1);
    assert.ok(/Sugars/.test(ws[0]));
    assert.ok(/reformulation/.test(ws[0]));
  });

  it('ignores differences when either side is zero', () => {
    const off = p({
      nutrition: { ...p({}).nutrition, salt_g: 0 },
    });
    const llm = p({
      nutrition: { ...p({}).nutrition, salt_g: 2 },
    });
    assert.deepEqual(detectSourceConflicts(off, llm), []);
  });
});

// ============================================================================
// rankAlternatives — "similar but better" ranker
// ============================================================================

describe('rankAlternatives', () => {
  // Reference: mid-tier sweetened yogurt (should score ~C range)
  const reference = p({
    name: 'Yaourt sucré',
    nutrition: {
      energy_kcal: 110, fat_g: 3, saturated_fat_g: 2, carbs_g: 16,
      sugars_g: 14, added_sugars_g: 10, fiber_g: 0, protein_g: 4, salt_g: 0.1,
      trans_fat_g: null,
    },
  });

  const better = p({
    name: 'Yaourt nature',
    nutrition: {
      energy_kcal: 60, fat_g: 3, saturated_fat_g: 2, carbs_g: 5,
      sugars_g: 4, added_sugars_g: null, fiber_g: 0, protein_g: 4, salt_g: 0.1,
      trans_fat_g: null,
    },
    ingredients: [{ name: 'lait entier', is_whole_food: true, category: 'food' }],
    nova_class: 2,
  });

  const worse = p({
    name: 'Yaourt très sucré chocolat',
    nutrition: {
      energy_kcal: 180, fat_g: 6, saturated_fat_g: 4, carbs_g: 28,
      sugars_g: 25, added_sugars_g: 20, fiber_g: 0, protein_g: 3, salt_g: 0.15,
      trans_fat_g: null,
    },
    nova_class: 4,
  });

  it('drops candidates scoring ≤ the reference', () => {
    const out = rankAlternatives(reference, [worse]);
    assert.equal(out.length, 0);
  });

  it('keeps candidates scoring strictly better, sorted high to low', () => {
    const out = rankAlternatives(reference, [worse, better]);
    assert.equal(out.length, 1);
    assert.equal(out[0].product.name, 'Yaourt nature');
  });

  it('respects the max cap', () => {
    const a = p({ name: 'A', nova_class: 2, nutrition: { ...better.nutrition } });
    const b = p({ name: 'B', nova_class: 2, nutrition: { ...better.nutrition } });
    const c = p({ name: 'C', nova_class: 2, nutrition: { ...better.nutrition } });
    const out = rankAlternatives(reference, [a, b, c], { max: 2 });
    assert.equal(out.length, 2);
  });

  it('skips candidates with the same name as the reference', () => {
    const same = p({ name: reference.name, nova_class: 2, nutrition: { ...better.nutrition } });
    const out = rankAlternatives(reference, [same]);
    assert.equal(out.length, 0);
  });

  it('applies dietFilter predicate (e.g. drops non-vegan)', () => {
    const out = rankAlternatives(reference, [better, worse], {
      dietFilter: (c) => c.name !== 'Yaourt nature', // reject better
    });
    assert.equal(out.length, 0);
  });
});
