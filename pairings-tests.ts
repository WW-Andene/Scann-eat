/**
 * Pairings lookup tests.
 *
 * Curated French-cuisine pairings should survive:
 *   - exact match        ("tomate")
 *   - case+accent folds  ("TOMATE", "ecreveisse" → none)
 *   - alias match        ("cucumber" → concombre entry)
 *   - first-token fallback ("saumon fumé norvégien" → saumon)
 *   - graceful miss      ("prince biscuits" → [])
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS module consumed from TS test
import { PAIRINGS, findPairings, matchPairings } from './public/data/pairings.js';

describe('PAIRINGS shape', () => {
  it('every entry has name + non-empty pairs array', () => {
    for (const e of PAIRINGS) {
      assert.equal(typeof e.name, 'string');
      assert.ok(e.name.length > 0);
      assert.ok(Array.isArray(e.pairs), `${e.name} missing pairs`);
      assert.ok(e.pairs.length >= 3, `${e.name} has too few pairings`);
    }
  });
  it('no duplicate canonical names', () => {
    const seen = new Set<string>();
    for (const e of PAIRINGS) {
      assert.equal(seen.has(e.name), false, `duplicate: ${e.name}`);
      seen.add(e.name);
    }
  });
});

describe('findPairings', () => {
  it('exact match returns the curated list', () => {
    const r = findPairings('tomate');
    assert.ok(r.includes('basilic'));
    assert.ok(r.includes('mozzarella'));
  });

  it('case + accent insensitive', () => {
    assert.deepEqual(findPairings('TOMATE'), findPairings('tomate'));
    assert.ok(findPairings('peche').length > 0);  // no accent
    assert.ok(findPairings('pêche').length > 0);  // with accent
  });

  it('EN alias resolves to FR entry', () => {
    const r = findPairings('cucumber');
    assert.ok(r.includes('aneth') || r.includes('yaourt'));
  });

  it('first-token fallback for multi-word scans', () => {
    const r = findPairings('saumon fumé norvégien bio');
    assert.ok(r.includes('aneth'));
  });

  it('respects the limit argument', () => {
    const r = findPairings('tomate', 3);
    assert.equal(r.length, 3);
  });

  it('returns [] for unknown ingredients', () => {
    assert.deepEqual(findPairings('prince lu chocolat'), []);
    assert.deepEqual(findPairings(''), []);
    assert.deepEqual(findPairings('x'), []); // below min length
  });
});

describe('matchPairings', () => {
  it('returns the entry (not just pairs) so UI can show canonical name', () => {
    const hit = matchPairings('tomate cerise');
    assert.ok(hit);
    assert.equal(hit.name, 'tomate');
    assert.ok(Array.isArray(hit.pairs));
  });

  it('returns null when nothing matches', () => {
    assert.equal(matchPairings('prince lu chocolat'), null);
    assert.equal(matchPairings(''), null);
  });
});
