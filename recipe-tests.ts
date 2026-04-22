/**
 * Recipes — aggregator unit tests.
 * Pure function; no IDB involvement.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS module consumed from TS test
import { aggregateRecipe } from './public/recipes.js';

const recipe = {
  id: 'r1',
  name: 'Salade composée',
  servings: 1,
  components: [
    { product_name: 'tomate',     grams: 150, kcal: 30, carbs_g: 6, fat_g: 0.3, protein_g: 1.2, salt_g: 0.01, sat_fat_g: 0.05, sugars_g: 4 },
    { product_name: 'mozzarella', grams: 100, kcal: 280, carbs_g: 3, fat_g: 22, protein_g: 18, salt_g: 0.65, sat_fat_g: 15, sugars_g: 1 },
    { product_name: 'huile olive', grams: 15, kcal: 135, carbs_g: 0, fat_g: 15, protein_g: 0, salt_g: 0, sat_fat_g: 2.1, sugars_g: 0 },
  ],
};

describe('aggregateRecipe', () => {
  it('sums kcal + macros across components (1 serving)', () => {
    const out = aggregateRecipe(recipe, 1);
    assert.equal(out.kcal, 445);         // 30+280+135
    assert.equal(out.fat_g, 37.3);       // 0.3+22+15
    assert.equal(out.protein_g, 19.2);   // 1.2+18+0
    assert.equal(out.carbs_g, 9);        // 6+3+0
    assert.equal(out.grams, 265);        // 150+100+15
  });

  it('divides totals when servings > 1', () => {
    const out = aggregateRecipe(recipe, 2);
    assert.equal(out.kcal, 222.5);       // 445 / 2
    assert.equal(out.grams, 133);        // round(265/2)
  });

  it('clamps servings to a minimum of 0.1 (no div-by-zero)', () => {
    const out = aggregateRecipe(recipe, 0);
    // servings=0 gets clamped to 0.1 → totals *10
    assert.equal(Number.isFinite(out.kcal), true);
    assert.ok(out.kcal > 0);
  });

  it('handles a recipe with no components', () => {
    const out = aggregateRecipe({ id: 'r2', name: 'Vide', components: [] }, 1);
    assert.equal(out.kcal, 0);
    assert.equal(out.grams, 0);
    assert.equal(out.product_name, 'Vide');
  });

  it('tags the output with fromRecipe for dashboard attribution', () => {
    const out = aggregateRecipe(recipe, 1);
    assert.equal(out.fromRecipe, 'r1');
  });

  it('defaults name when recipe has none', () => {
    const out = aggregateRecipe({ components: [] }, 1);
    assert.equal(out.product_name, 'Sans nom');
  });

  it('ignores non-numeric component values', () => {
    const weird = {
      id: 'x',
      name: 'Weird',
      components: [
        { product_name: 'a', grams: '50', kcal: null, carbs_g: 'abc', fat_g: undefined, protein_g: 3 },
      ],
    };
    const out = aggregateRecipe(weird, 1);
    // only protein and grams parse; everything else → 0
    assert.equal(out.kcal, 0);
    assert.equal(out.carbs_g, 0);
    assert.equal(out.protein_g, 3);
    assert.equal(out.grams, 50);
  });
});
