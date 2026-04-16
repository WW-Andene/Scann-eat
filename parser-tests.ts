/**
 * ============================================================================
 * OCR PARSER — DETERMINISTIC TESTS
 * ============================================================================
 *
 * Exercises the parts of ocr-parser.ts that do NOT require an API key:
 *   - splitIngredients      (bracket-aware comma split)
 *   - extractPercentage     (French comma decimals)
 *   - extractENumber        (E250 / E 250 / E-250 / E150a variants)
 *   - enrichIngredient      (food vs additive inference, whole-food flag)
 *   - parseIngredientsText  (end-to-end text pipeline)
 *
 * Run on Node 22+ with native TS stripping:
 *   node --test --experimental-strip-types parser-tests.ts
 *
 * Or with tsx:
 *   npx tsx --test parser-tests.ts
 * ============================================================================
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  enrichIngredient,
  extractENumber,
  extractPercentage,
  parseIngredientsText,
  splitIngredients,
} from './ocr-parser.ts';

// ============================================================================
// splitIngredients
// ============================================================================

describe('splitIngredients', () => {
  it('splits on top-level commas', () => {
    assert.deepEqual(
      splitIngredients('eau, sucre, sel'),
      ['eau', 'sucre', 'sel'],
    );
  });

  it('preserves commas inside parentheses', () => {
    const out = splitIngredients(
      'émulsifiants (lécithine, mono- et diglycérides), sel, arôme',
    );
    assert.deepEqual(out, [
      'émulsifiants (lécithine, mono- et diglycérides)',
      'sel',
      'arôme',
    ]);
  });

  it('handles nested brackets', () => {
    const out = splitIngredients(
      'préparation (huile [tournesol, colza], vinaigre), moutarde',
    );
    assert.deepEqual(out, [
      'préparation (huile [tournesol, colza], vinaigre)',
      'moutarde',
    ]);
  });

  it('splits on semicolon as well as comma', () => {
    assert.deepEqual(
      splitIngredients('eau; sucre; sel'),
      ['eau', 'sucre', 'sel'],
    );
  });

  it('drops empty segments and trims whitespace', () => {
    assert.deepEqual(
      splitIngredients('  eau ,, sucre ,  '),
      ['eau', 'sucre'],
    );
  });

  it('tolerates unbalanced closing brackets without crashing', () => {
    const out = splitIngredients('eau), sucre');
    assert.deepEqual(out, ['eau)', 'sucre']);
  });
});

// ============================================================================
// extractPercentage
// ============================================================================

describe('extractPercentage', () => {
  it('reads French comma decimals', () => {
    assert.equal(extractPercentage('jambon 17,4%'), 17.4);
  });

  it('reads point decimals', () => {
    assert.equal(extractPercentage('jambon 17.4%'), 17.4);
  });

  it('reads integer percentages', () => {
    assert.equal(extractPercentage('tomate 25 %'), 25);
  });

  it('returns null when absent', () => {
    assert.equal(extractPercentage('sel'), null);
  });

  it('rejects out-of-bounds values', () => {
    assert.equal(extractPercentage('??? 150%'), null);
    assert.equal(extractPercentage('??? 0%'), null);
  });
});

// ============================================================================
// extractENumber
// ============================================================================

describe('extractENumber', () => {
  it('matches plain E-number', () => {
    assert.equal(extractENumber('E250'), 'E250');
  });

  it('matches with space', () => {
    assert.equal(extractENumber('conservateur E 250'), 'E250');
  });

  it('matches with hyphen', () => {
    assert.equal(extractENumber('E-250'), 'E250');
  });

  it('normalizes lowercase to uppercase', () => {
    assert.equal(extractENumber('e250'), 'E250');
  });

  it('handles sub-letters (E150a, E150c)', () => {
    assert.equal(extractENumber('colorant caramel E150c'), 'E150C');
  });

  it('returns null when absent', () => {
    assert.equal(extractENumber('sucre'), null);
  });

  it('does not match nearby digits that are not an E-number', () => {
    assert.equal(extractENumber('ecologie 250 km'), null);
  });
});

// ============================================================================
// enrichIngredient
// ============================================================================

describe('enrichIngredient', () => {
  it('classifies a whole food', () => {
    const ing = enrichIngredient({ name: 'tomate' });
    assert.equal(ing.category, 'food');
    assert.equal(ing.is_whole_food, true);
    assert.equal(ing.e_number, null);
  });

  it('detects additive via E-number in text', () => {
    const ing = enrichIngredient({ name: 'conservateur: nitrite de sodium (E250)' });
    assert.equal(ing.category, 'additive');
    assert.equal(ing.e_number, 'E250');
    assert.equal(ing.is_whole_food, false);
  });

  it('detects additive via known name even without E-number', () => {
    const ing = enrichIngredient({ name: 'polysorbate 80' });
    assert.equal(ing.category, 'additive');
  });

  it('prefers text-extracted percentage over missing LLM value', () => {
    const ing = enrichIngredient({ name: 'jambon de porc 17,4%' });
    assert.equal(ing.percentage, 17.4);
  });

  it('keeps LLM percentage when text has none', () => {
    const ing = enrichIngredient({ name: 'jambon de porc', percentage: 17.4 });
    assert.equal(ing.percentage, 17.4);
  });

  it('drops malformed LLM E-number', () => {
    const ing = enrichIngredient({ name: 'sucre', e_number: 'not-a-real-e-number' });
    assert.equal(ing.e_number, null);
  });

  it('treats concentré / isolat as non-whole even if keyword matches', () => {
    const ing = enrichIngredient({ name: 'concentré de tomate' });
    assert.equal(ing.is_whole_food, false);
  });

  it('uppercases and strips spaces from LLM-declared E-number', () => {
    const ing = enrichIngredient({ name: 'sel nitrité', e_number: 'e 250' });
    assert.equal(ing.e_number, 'E250');
  });
});

// ============================================================================
// parseIngredientsText — realistic French fixtures
// ============================================================================

describe('parseIngredientsText', () => {
  it('strips the "Ingrédients:" prefix', () => {
    const out = parseIngredientsText('Ingrédients: eau, sucre, sel');
    assert.deepEqual(out.map((i) => i.name), ['eau', 'sucre', 'sel']);
  });

  it('parses a sandwich-style list end-to-end', () => {
    const out = parseIngredientsText(
      'pain (farine de blé, eau, levain, sel), jambon de porc 17,4%, emmental 12%, mayonnaise (huile de colza, oeuf, moutarde), salade',
    );
    const names = out.map((i) => i.name);
    assert.deepEqual(names, [
      'pain (farine de blé, eau, levain, sel)',
      'jambon de porc 17,4%',
      'emmental 12%',
      'mayonnaise (huile de colza, oeuf, moutarde)',
      'salade',
    ]);

    const jambon = out.find((i) => i.name.startsWith('jambon'))!;
    assert.equal(jambon.percentage, 17.4);
    assert.equal(jambon.is_whole_food, true);

    const emmental = out.find((i) => i.name.startsWith('emmental'))!;
    assert.equal(emmental.percentage, 12);
  });

  it('flags E-number additives inside a processed-meat list', () => {
    const out = parseIngredientsText(
      'viande de porc 85%, eau, sel, dextrose, conservateur: nitrite de sodium (E250), antioxydant: érythorbate de sodium (E316)',
    );
    const nitrite = out.find((i) => i.e_number === 'E250');
    const erythorbate = out.find((i) => i.e_number === 'E316');
    assert.ok(nitrite, 'E250 should be recognized');
    assert.ok(erythorbate, 'E316 should be recognized');
    assert.equal(nitrite!.category, 'additive');
    assert.equal(erythorbate!.category, 'additive');
  });

  it('returns empty array on empty input', () => {
    assert.deepEqual(parseIngredientsText(''), []);
    assert.deepEqual(parseIngredientsText('   '), []);
  });

  it('does not split inside nested brackets with commas and percentages', () => {
    const out = parseIngredientsText(
      'chocolat (sucre, pâte de cacao 45%, beurre de cacao), lait',
    );
    assert.equal(out.length, 2);
    assert.equal(out[0].name, 'chocolat (sucre, pâte de cacao 45%, beurre de cacao)');
    assert.equal(out[1].name, 'lait');
  });
});
