/**
 * Consumption log + daily aggregates.
 *
 * Each logged scan becomes a ConsumptionEntry keyed by date. Totals for
 * today (or any date) are computed by summing the entries. Per-100 g
 * nutrition values are scaled to the portion size the user entered.
 *
 * Math is pure per-100 g → per-portion conversion:
 *   nutrient_consumed = nutrient_per_100g × (grams / 100)
 *
 * No medical claims here — this is just arithmetic scoring against the
 * daily targets already derived in profile.js from Mifflin-St Jeor BMR +
 * FAO/WHO/UNU PAL + WHO energy-percent conversions.
 */

const DB_NAME = 'scanneat';
const DB_VERSION = 3;
const STORE = 'consumption';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending_scans')) {
        db.createObjectStore('pending_scans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('history')) {
        const s = db.createObjectStore('history', { keyPath: 'id' });
        s.createIndex('created', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build a ConsumptionEntry from a product + portion size (grams).
 * Exposed separately so it can be unit-tested without IDB.
 */
export function buildEntry(product, grams, now = Date.now()) {
  const g = Math.max(0, Number(grams) || 0);
  const f = g / 100;
  const n = product?.nutrition ?? {};
  const sugars = n.added_sugars_g ?? n.sugars_g ?? 0;
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `c${now}${Math.random().toString(36).slice(2)}`),
    date: new Date(now).toISOString().slice(0, 10),
    timestamp: now,
    product_name: product?.name || '—',
    category: product?.category || 'other',
    grams: g,
    kcal: round1((n.energy_kcal ?? 0) * f),
    sat_fat_g: round2((n.saturated_fat_g ?? 0) * f),
    sugars_g: round2(sugars * f),
    salt_g: round3((n.salt_g ?? 0) * f),
    protein_g: round2((n.protein_g ?? 0) * f),
  };
}

const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1000) / 1000;

export async function logEntry(product, grams) {
  const entry = buildEntry(product, grams);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => { db.close(); resolve(entry); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listByDate(date = todayISO()) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('date');
    const req = idx.getAll(IDBKeyRange.only(date));
    req.onsuccess = () => { db.close(); resolve(req.result || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearDate(date = todayISO()) {
  const entries = await listByDate(date);
  for (const e of entries) await deleteEntry(e.id);
}

/** Pure aggregation — exported for tests. */
export function sumTotals(entries) {
  const t = { kcal: 0, sat_fat_g: 0, sugars_g: 0, salt_g: 0, protein_g: 0, count: entries.length };
  for (const e of entries) {
    t.kcal += e.kcal || 0;
    t.sat_fat_g += e.sat_fat_g || 0;
    t.sugars_g += e.sugars_g || 0;
    t.salt_g += e.salt_g || 0;
    t.protein_g += e.protein_g || 0;
  }
  return {
    kcal: round1(t.kcal),
    sat_fat_g: round2(t.sat_fat_g),
    sugars_g: round2(t.sugars_g),
    salt_g: round3(t.salt_g),
    protein_g: round2(t.protein_g),
    count: t.count,
  };
}

export async function dailyTotals(date = todayISO()) {
  const entries = await listByDate(date);
  return sumTotals(entries);
}
