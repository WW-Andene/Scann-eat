/**
 * ============================================================================
 * DIET COMPLIANCE — TESTS
 * ============================================================================
 *
 * Guards the hard-veto system at public/diets.js. A regression here lets
 * non-compliant products through the veto and falsely tells the user they
 * can eat something that violates their diet.
 *
 * The original motivation for this file: the \b-after-accent bug shipped
 * undetected. Tests now pin the accented-form behavior explicitly.
 * ============================================================================
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS module consumed from TS test
import { checkDiet } from './public/diets.js';

type Ing = { name: string; category?: string };
function product(name: string, ings: string[]): { name: string; ingredients: Ing[] } {
  return { name, ingredients: ings.map((n) => ({ name: n, category: 'food' })) };
}

// ============================================================================
// Vegetarian — the case the original bug was shipped against
// ============================================================================

describe('checkDiet: vegetarian', () => {
  it('compliant for a plain-vegetable product', () => {
    const p = product('Salade', ['salade', 'tomate', 'huile d\'olive']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, true);
    assert.equal(r.violations.length, 0);
  });

  it('REJECTS pâté (shipped-bug regression guard: accented trigger word)', () => {
    const p = product('Pâté de campagne', ['pâté de porc', 'sel', 'poivre']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, false, 'pâté must NOT pass vegetarian veto');
    assert.ok(r.violations.length > 0);
  });

  it('REJECTS crustacé (shipped-bug regression guard: accented trigger word)', () => {
    const p = product('Soupe', ['bouillon', 'crustacé']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, false);
  });

  it('REJECTS the generic term "crustacé" (regression guard)', () => {
    // crustac[eé] is listed — the é-form specifically must match.
    const p = product('Soupe', ['eau', 'crustacé', 'sel']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, false);
  });

  it('REJECTS jambon (ASCII, baseline)', () => {
    const p = product('Sandwich', ['pain', 'jambon', 'emmental']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, false);
  });

  it('does not false-positive on "poison" (not "poisson")', () => {
    // Defensive — the fish alternation is "poisson" not "poison".
    const p = product('Jeu', ['poison text not a food']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, true);
  });

  it('does not match "viande" inside longer word accidentally', () => {
    // "viande" with a (?<!letter) boundary should still fire on its own.
    const p = product('', ['viande hachée']);
    const r = checkDiet(p, 'vegetarian');
    assert.equal(r.compliant, false);
  });
});
