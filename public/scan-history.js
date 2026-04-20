/**
 * Scan history store — keeps the last 30 scans in IndexedDB so the user can
 * re-open a product they looked at recently. Each record is lightweight:
 * score / grade / name / thumbnail (first queued image) / audit snapshot.
 */

const DB_NAME = 'scanneat';
const DB_VERSION = 2;
const STORE = 'history';
const MAX_ITEMS = 30;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending_scans')) {
        db.createObjectStore('pending_scans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('created', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveScan(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = async () => {
      db.close();
      // Trim to MAX_ITEMS
      const items = await listScans();
      if (items.length > MAX_ITEMS) {
        const excess = items.slice(MAX_ITEMS);
        for (const e of excess) await deleteScan(e.id);
      }
      resolve(record);
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listScans() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      const all = req.result || [];
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      resolve(all);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteScan(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearScans() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
