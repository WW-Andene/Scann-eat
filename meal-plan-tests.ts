/**
 * Meal-plan module tests — pure helpers + localStorage CRUD.
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

const store = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
} as Storage;

// @ts-expect-error — plain JS module
import { buildSlot, weekDates, pruneOld, getMealPlan, getDayPlan, setSlot, clearDay, clearAll, planRecipes } from './public/features/meal-plan.js';

describe('weekDates', () => {
  it('returns 7 consecutive ISO dates starting at the seed', () => {
    const dates = weekDates('2026-04-22');
    assert.equal(dates.length, 7);
    assert.equal(dates[0], '2026-04-22');
    assert.equal(dates[6], '2026-04-28');
  });
});

describe('buildSlot', () => {
  it('accepts recipe slots with name + id', () => {
    const s = buildSlot({ kind: 'recipe', id: 'r1', name: 'Pesto pâtes' });
    assert.deepEqual(s, { kind: 'recipe', id: 'r1', name: 'Pesto pâtes' });
  });
  it('accepts note slots with non-empty text', () => {
    assert.deepEqual(buildSlot({ kind: 'note', text: 'leftovers' }), { kind: 'note', text: 'leftovers' });
  });
  it('rejects empty notes + missing ids + unknown kinds', () => {
    assert.equal(buildSlot({ kind: 'note', text: '   ' }), null);
    assert.equal(buildSlot({ kind: 'recipe' }), null);
    assert.equal(buildSlot({ kind: 'mystery', id: 'x' }), null);
    assert.equal(buildSlot(null as never), null);
  });
});

describe('pruneOld', () => {
  it('drops dates older than 7 days back', () => {
    const now = new Date('2026-04-22T12:00:00Z').getTime();
    const out = pruneOld({
      '2026-04-10': { breakfast: { kind: 'note', text: 'old' } }, // > 7 d back
      '2026-04-22': { breakfast: { kind: 'note', text: 'today' } },
      '2026-04-25': { breakfast: { kind: 'note', text: 'future' } },
    }, now);
    assert.equal(out['2026-04-10'], undefined);
    assert.ok(out['2026-04-22']);
    assert.ok(out['2026-04-25']);
  });
});

describe('storage CRUD', () => {
  beforeEach(() => { store.clear(); });

  it('setSlot then getDayPlan round-trips', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'recipe', id: 'r1', name: 'Pesto pâtes' });
    assert.deepEqual(getDayPlan('2026-04-22'), {
      lunch: { kind: 'recipe', id: 'r1', name: 'Pesto pâtes' },
    });
  });

  it('setSlot with null deletes the slot', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'note', text: 'x' });
    setSlot('2026-04-22', 'lunch', null);
    assert.deepEqual(getDayPlan('2026-04-22'), {});
  });

  it('removes the date entry when last slot is deleted', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'note', text: 'x' });
    setSlot('2026-04-22', 'lunch', null);
    assert.equal(Object.keys(getMealPlan()).length, 0);
  });

  it('clearDay nukes the date', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'note', text: 'x' });
    setSlot('2026-04-22', 'dinner', { kind: 'note', text: 'y' });
    clearDay('2026-04-22');
    assert.deepEqual(getMealPlan(), {});
  });

  it('rejects unknown meals silently', () => {
    setSlot('2026-04-22', 'brunch' as never, { kind: 'note', text: 'x' });
    assert.deepEqual(getMealPlan(), {});
  });

  it('clearAll wipes', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'note', text: 'x' });
    clearAll();
    assert.deepEqual(getMealPlan(), {});
  });
});

describe('planRecipes', () => {
  beforeEach(() => { store.clear(); });

  it('resolves recipe-slot ids against the recipe store', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'recipe', id: 'r1', name: 'A' });
    setSlot('2026-04-23', 'dinner', { kind: 'recipe', id: 'r2', name: 'B' });
    setSlot('2026-04-23', 'snack',  { kind: 'note', text: 'biscuit' }); // ignored
    const recipes = [
      { id: 'r1', name: 'A', components: [] },
      { id: 'r2', name: 'B', components: [] },
      { id: 'r3', name: 'C', components: [] },
    ];
    const got = planRecipes(['2026-04-22', '2026-04-23'], recipes);
    assert.equal(got.length, 2);
    assert.deepEqual(got.map((r) => r.id), ['r1', 'r2']);
  });

  it('skips slots whose recipe id is missing from the store', () => {
    setSlot('2026-04-22', 'lunch', { kind: 'recipe', id: 'gone', name: 'X' });
    const got = planRecipes(['2026-04-22'], []);
    assert.equal(got.length, 0);
  });
});
