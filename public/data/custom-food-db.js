/**
 * User-extendable food database.
 *
 * The built-in FOOD_DB ships with ~60 CIQUAL entries. This module lets the
 * user persist their own foods (favourite cereal, a local pastry, etc.)
 * so they show up in autocomplete and get the same CIQUAL-vs-LLM
 * reconciliation as the built-in list.
 *
 * Storage: localStorage under `scanneat.customFoods` as a JSON array. Kept
 * small (< 200 entries in practice) so localStorage's 5 MB cap is not a
 * concern. Not using IDB because querying is linear anyway and the set is
 * small; a simpler store avoids another DB_VERSION migration.
 *
 * Schema per entry:
 *   { id, name, kcal, protein_g, carbs_g, fat_g, aliases?[], created_at }
 * Values are per 100 g — same convention as FOOD_DB.
 */

const KEY = 'scanneat.customFoods';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // Quota or serialization failure — caller treats as best-effort.
  }
}

/** Pure builder exposed for tests. */
export function buildCustomFood({ name, kcal, protein_g = 0, carbs_g = 0, fat_g = 0, aliases = [] }, now = Date.now()) {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `cf${now}${Math.random().toString(36).slice(2)}`),
    name: String(name ?? '').trim(),
    kcal: Math.max(0, Number(kcal) || 0),
    protein_g: Math.max(0, Number(protein_g) || 0),
    carbs_g: Math.max(0, Number(carbs_g) || 0),
    fat_g: Math.max(0, Number(fat_g) || 0),
    aliases: Array.isArray(aliases) ? aliases.filter((s) => typeof s === 'string' && s.length > 0) : [],
    created_at: new Date(now).toISOString(),
    custom: true,
  };
}

export function listCustomFoods() {
  return readAll();
}

export function saveCustomFood(food) {
  const entry = food.id ? food : buildCustomFood(food);
  if (!entry.name) return null;
  const all = readAll();
  const ix = all.findIndex((f) => f.id === entry.id);
  if (ix >= 0) all[ix] = entry; else all.push(entry);
  writeAll(all);
  return entry;
}

export function deleteCustomFood(id) {
  const all = readAll().filter((f) => f.id !== id);
  writeAll(all);
}

export function clearCustomFoods() {
  writeAll([]);
}
