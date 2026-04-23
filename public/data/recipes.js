/**
 * Recipes — named multi-component dishes that collapse to ONE log entry.
 *
 * Differs from meal-templates by intent:
 *   templates → "I ate these 3 things today, save them as 3 separate
 *                entries I can re-apply".
 *   recipes   → "Here's how I build this dish (tomato + mozzarella +
 *                oil). Log it as a SINGLE entry showing the dish name +
 *                summed macros."
 *
 * The data shape is similar to templates (an array of components) but the
 * apply path sums the components into one consumption entry instead of
 * materializing each as a separate entry.
 */

const DB_NAME = 'scanneat';
const DB_VERSION = 6; // v6 adds the 'activity' store (exercise log)
const STORE = 'recipes';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => ensureStores(req.result);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { try { db.close(); } catch { /* ignore */ } };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => { /* older tab is holding — eventual close() clears it */ };
  });
}

/** Defensive store creator — every module's upgrade handler should call
 *  this (or its equivalent) so adding a new store doesn't require every
 *  module to be loaded first. */
export function ensureStores(db) {
  if (!db.objectStoreNames.contains('pending_scans')) {
    db.createObjectStore('pending_scans', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('history')) {
    const s = db.createObjectStore('history', { keyPath: 'id' });
    s.createIndex('created', 'createdAt');
  }
  if (!db.objectStoreNames.contains('consumption')) {
    const s = db.createObjectStore('consumption', { keyPath: 'id' });
    s.createIndex('date', 'date');
  }
  if (!db.objectStoreNames.contains('weight')) {
    const s = db.createObjectStore('weight', { keyPath: 'id' });
    s.createIndex('date', 'date', { unique: true });
  }
  if (!db.objectStoreNames.contains('meal_templates')) {
    db.createObjectStore('meal_templates', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('recipes')) {
    db.createObjectStore('recipes', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('activity')) {
    const s = db.createObjectStore('activity', { keyPath: 'id' });
    s.createIndex('date', 'date');
  }
}

/**
 * Sum a recipe's components into a single ConsumptionEntry-shaped object.
 * Pure function — the apply path is responsible for adding id/date/meal
 * before persisting.
 *
 * `servings` divides the total, so the same recipe can be reused as
 * "1 serving" or "half a serving" at apply time.
 */
export function aggregateRecipe(recipe, servings = 1) {
  const s = Math.max(0.1, Number(servings) || 1);
  const items = recipe?.components ?? [];
  const sum = (key) => items.reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0) / s;
  const round1 = (v) => Math.round(v * 10) / 10;
  const round2 = (v) => Math.round(v * 100) / 100;
  const round3 = (v) => Math.round(v * 1000) / 1000;
  return {
    // R14.1: leave empty for UI-layer fallback; data stays locale-
    // neutral. Callers in the apply path already render via t().
    product_name: recipe?.name || '',
    category: 'other',
    grams:     Math.round(sum('grams')),
    kcal:      round1(sum('kcal')),
    carbs_g:   round2(sum('carbs_g')),
    fat_g:     round2(sum('fat_g')),
    sat_fat_g: round2(sum('sat_fat_g')),
    sugars_g:  round2(sum('sugars_g')),
    protein_g: round2(sum('protein_g')),
    salt_g:    round3(sum('salt_g')),
    fromRecipe: recipe?.id,
  };
}

/**
 * Save a recipe. `components` is the list of ingredient lines; each line
 * holds its own kcal + macros + grams (the UI derives these from the
 * scanned product or a Quick Add).
 */
export async function saveRecipe({ id, name, components, servings = 1 }) {
  const recipe = {
    id: id ?? (globalThis.crypto?.randomUUID?.() ?? `r${Date.now()}${Math.random().toString(36).slice(2)}`),
    // R14.1: verbatim name; UI layer handles the untitled fallback.
    name: String(name || '').trim(),
    servings: Math.max(1, Math.round(Number(servings) || 1)),
    components: (components || []).map((c) => ({
      product_name: c.product_name,
      grams: Number(c.grams) || 0,
      kcal: Number(c.kcal) || 0,
      carbs_g: Number(c.carbs_g) || 0,
      fat_g: Number(c.fat_g) || 0,
      sat_fat_g: Number(c.sat_fat_g) || 0,
      sugars_g: Number(c.sugars_g) || 0,
      protein_g: Number(c.protein_g) || 0,
      salt_g: Number(c.salt_g) || 0,
    })),
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(recipe);
    tx.oncomplete = () => { db.close(); resolve(recipe); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listRecipes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result || []).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0)));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteRecipe(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
