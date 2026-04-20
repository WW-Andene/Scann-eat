/**
 * Scann-eat PWA entry.
 *
 * Capture flow:
 *   1. User adds 1–4 photos, each downscaled to 1600px JPEG in-browser.
 *   2. If the browser has BarcodeDetector, try to extract an EAN/UPC from the
 *      raw photos before compression. If found, server does an Open Food Facts
 *      lookup first and skips the LLM when the product is in OFF.
 *   3. Otherwise the image batch is scored via /api/score or direct Groq.
 *
 * Comparison: after a scan, user can tap "Comparer au prochain scan" to save
 * the current audit as "Précédent". The next successful scan renders both
 * side-by-side with a score delta.
 */

const $ = (id) => document.getElementById(id);

const fileInput = $('file-input');
const queueEl = $('queue');
const scanBtn = $('scan-btn');
const statusEl = $('status');
const statusText = $('status-text');
const errorEl = $('error');
const resultEl = $('result');
const resetBtn = $('reset-btn');
const compareNextBtn = $('compare-next-btn');
const comparisonEl = $('comparison');
const compareClear = $('compare-clear');
const resultSourceEl = $('result-source');

const settingsBtn = $('settings-btn');
const settingsDialog = $('settings-dialog');
const keyInput = $('settings-key');
const modeSelect = $('settings-mode');
const settingsSave = $('settings-save');
const settingsCancel = $('settings-cancel');

const LS_KEY = 'scanneat.groq_key';
const LS_MODE = 'scanneat.mode';
const LS_COMPARE_ARMED = 'scanneat.compare_armed';
const LS_COMPARE_PREV = 'scanneat.compare_prev';

const MAX_IMAGES = 4;
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

const isCapacitor = !!globalThis.Capacitor?.isNativePlatform?.();

/** { id, dataUrl, base64, mime, barcode? } */
const queue = [];

let engineMod = null;
async function loadEngine() {
  if (engineMod) return engineMod;
  engineMod = await import('/engine.bundle.js');
  return engineMod;
}

function getMode() {
  const saved = localStorage.getItem(LS_MODE);
  if (saved === 'server' || saved === 'direct') return saved;
  return isCapacitor ? 'direct' : 'auto';
}

function getKey() {
  return localStorage.getItem(LS_KEY) || '';
}

function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

// ---------- Barcode ----------

let barcodeDetector = null;
function getBarcodeDetector() {
  if (barcodeDetector !== null) return barcodeDetector;
  if (!('BarcodeDetector' in window)) {
    barcodeDetector = false;
    return barcodeDetector;
  }
  try {
    barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    });
  } catch {
    barcodeDetector = false;
  }
  return barcodeDetector;
}

async function detectBarcode(file) {
  const detector = getBarcodeDetector();
  if (!detector) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    bitmap.close?.();
    for (const code of codes) {
      const digits = (code.rawValue || '').replace(/\D/g, '');
      if (digits.length === 8 || digits.length === 12 || digits.length === 13) {
        return digits;
      }
    }
  } catch {
    // fall through
  }
  return null;
}

// ---------- Image compression ----------

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette image.'));
    };
    img.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compression a échoué.'))),
        'image/jpeg',
        JPEG_QUALITY,
      ),
    );
    const dataUrl = await blobToDataUrl(blob);
    const comma = dataUrl.indexOf(',');
    return { dataUrl, base64: dataUrl.slice(comma + 1), mime: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Queue ----------

function renderQueue() {
  queueEl.innerHTML = '';
  if (queue.length === 0) {
    queueEl.hidden = true;
  } else {
    queueEl.hidden = false;
    for (const item of queue) {
      const wrap = document.createElement('div');
      wrap.className = 'queue-item';
      if (item.barcode) wrap.classList.add('has-barcode');
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.alt = '';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'queue-remove';
      remove.dataset.id = item.id;
      remove.setAttribute('aria-label', 'Retirer cette photo');
      remove.textContent = '×';
      wrap.appendChild(img);
      wrap.appendChild(remove);
      if (item.barcode) {
        const tag = document.createElement('span');
        tag.className = 'queue-barcode';
        tag.textContent = `📦 ${item.barcode}`;
        wrap.appendChild(tag);
      }
      queueEl.appendChild(wrap);
    }
  }
  scanBtn.disabled = queue.length === 0;
  const label = $('capture-label');
  if (label) {
    label.textContent = queue.length >= MAX_IMAGES
      ? `Maximum ${MAX_IMAGES} photos`
      : queue.length > 0
        ? 'Ajouter une autre photo'
        : 'Prendre / choisir une photo';
  }
}

async function addFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  hide(errorEl);
  const files = Array.from(fileList).slice(0, MAX_IMAGES - queue.length);
  for (const file of files) {
    try {
      const barcode = await detectBarcode(file);
      const compressed = await compressImage(file);
      queue.push({ id: crypto.randomUUID(), ...compressed, barcode });
      renderQueue();
    } catch (err) {
      errorEl.textContent = `Erreur: ${err.message}`;
      show(errorEl);
    }
  }
}

function removeFromQueue(id) {
  const idx = queue.findIndex((q) => q.id === id);
  if (idx >= 0) queue.splice(idx, 1);
  renderQueue();
}

function firstBarcode() {
  const hit = queue.find((q) => !!q.barcode);
  return hit ? hit.barcode : null;
}

// ---------- Scan network paths ----------

function queuePayload() {
  return queue.map((q) => ({ base64: q.base64, mime: q.mime }));
}

async function scanViaServer() {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: queuePayload(), barcode: firstBarcode() }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function scanViaDirect() {
  const key = getKey();
  const { parseLabel, scoreProduct, fetchFromOFF } = await loadEngine();
  const barcode = firstBarcode();

  if (barcode) {
    const off = await fetchFromOFF(barcode);
    if (off) {
      return {
        product: off,
        audit: scoreProduct(off),
        warnings: [],
        source: 'openfoodfacts',
        barcode,
      };
    }
  }

  if (!key) throw new Error('Aucune clé Groq configurée. Ouvre les réglages (⚙).');
  const parsed = await parseLabel(queuePayload(), { apiKey: key });
  return {
    product: parsed.product,
    audit: scoreProduct(parsed.product),
    warnings: parsed.warnings,
    source: 'llm',
    barcode: parsed.barcode ?? null,
  };
}

async function scanImage() {
  if (queue.length === 0) return;
  hide(errorEl);
  hide(resultEl);
  show(statusEl);
  const bc = firstBarcode();
  statusText.textContent = bc
    ? `Code-barres ${bc} détecté, recherche Open Food Facts…`
    : queue.length > 1
      ? `Analyse de ${queue.length} photos…`
      : 'Analyse en cours…';

  const mode = getMode();
  try {
    let data;
    if (mode === 'direct') {
      data = await scanViaDirect();
    } else if (mode === 'server') {
      data = await scanViaServer();
    } else {
      try {
        data = await scanViaServer();
      } catch (err) {
        if (getKey()) {
          statusText.textContent = 'Serveur indisponible, appel direct Groq…';
          data = await scanViaDirect();
        } else {
          throw err;
        }
      }
    }
    hide(statusEl);
    lastData = data;
    maybeRenderComparison(data);
    renderAudit(data.audit, data.warnings, data.source);
    renderIngredients(data.product);
    show(resultEl);
  } catch (err) {
    hide(statusEl);
    console.error('[scan] failed', err);
    errorEl.textContent = `Erreur: ${err.message}`;
    show(errorEl);
  }
}

// ---------- Comparison ----------

function compareArmed() {
  return localStorage.getItem(LS_COMPARE_ARMED) === '1';
}

function previousSnapshot() {
  const raw = localStorage.getItem(LS_COMPARE_PREV);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function snapshotFromData(data) {
  return {
    name: data.audit.product_name || data.product.name,
    grade: data.audit.grade,
    score: data.audit.score,
    ingredients: data.product.ingredients.map((i) => i.name),
  };
}

function maybeRenderComparison(data) {
  const prev = previousSnapshot();
  if (compareArmed() && prev) {
    const current = snapshotFromData(data);
    $('a-grade').textContent = prev.grade;
    $('a-grade').dataset.grade = prev.grade;
    $('a-name').textContent = prev.name;
    $('a-score').textContent = String(prev.score);
    $('b-grade').textContent = current.grade;
    $('b-grade').dataset.grade = current.grade;
    $('b-name').textContent = current.name;
    $('b-score').textContent = String(current.score);

    const delta = current.score - prev.score;
    const sign = delta > 0 ? '+' : '';
    const direction = delta > 0 ? ' (actuel meilleur)' : delta < 0 ? ' (précédent meilleur)' : '';
    const prevIng = new Set(prev.ingredients.map((s) => s.toLowerCase()));
    const curIng = new Set(current.ingredients.map((s) => s.toLowerCase()));
    const onlyInCurrent = [...curIng].filter((i) => !prevIng.has(i));
    const onlyInPrev = [...prevIng].filter((i) => !curIng.has(i));
    $('compare-delta').innerHTML = [
      `Δ score: <strong>${sign}${delta}</strong>${direction}`,
      onlyInCurrent.length ? `Nouveau: ${onlyInCurrent.slice(0, 4).join(', ')}${onlyInCurrent.length > 4 ? '…' : ''}` : '',
      onlyInPrev.length ? `Perdu: ${onlyInPrev.slice(0, 4).join(', ')}${onlyInPrev.length > 4 ? '…' : ''}` : '',
    ].filter(Boolean).join(' • ');

    show(comparisonEl);
    localStorage.removeItem(LS_COMPARE_ARMED);
    localStorage.removeItem(LS_COMPARE_PREV);
  } else {
    hide(comparisonEl);
  }
}

function armComparison(data) {
  localStorage.setItem(LS_COMPARE_ARMED, '1');
  localStorage.setItem(LS_COMPARE_PREV, JSON.stringify(snapshotFromData(data)));
  compareNextBtn.textContent = '✓ En attente du prochain scan';
  compareNextBtn.disabled = true;
}

// ---------- Rendering ----------

let lastData = null;

function renderAudit(audit, warnings, source) {
  $('grade-el').textContent = audit.grade;
  $('grade-el').dataset.grade = audit.grade;
  $('score-el').textContent = String(audit.score);
  $('verdict-el').textContent = audit.verdict;
  $('product-name').textContent = audit.product_name || '(sans nom)';
  $('product-category').textContent = audit.category.replace(/_/g, ' ');

  if (source === 'openfoodfacts') {
    resultSourceEl.textContent = '📦 Données Open Food Facts';
    show(resultSourceEl);
  } else if (source === 'llm') {
    resultSourceEl.textContent = '📷 OCR par Llama 4 Scout';
    show(resultSourceEl);
  } else {
    hide(resultSourceEl);
  }

  renderList('red-flags', audit.red_flags, 'Aucun');
  renderList('green-flags', audit.green_flags, 'Aucun');

  const pillars = [
    ['Traitement', audit.pillars.processing],
    ['Densité nutritionnelle', audit.pillars.nutritional_density],
    ['Nutriments négatifs', audit.pillars.negative_nutrients],
    ['Additifs', audit.pillars.additive_risk],
    ['Intégrité ingrédients', audit.pillars.ingredient_integrity],
  ];
  const pillarList = $('pillar-list');
  pillarList.innerHTML = '';
  for (const [label, pillar] of pillars) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${label}</strong>: ${pillar.score} / ${pillar.max}`;
    pillarList.appendChild(li);
  }
  if (warnings?.length) {
    const warnLi = document.createElement('li');
    warnLi.className = 'warn';
    warnLi.textContent = `⚠ ${warnings.join(' • ')}`;
    pillarList.appendChild(warnLi);
  }

  compareNextBtn.disabled = false;
  compareNextBtn.textContent = 'Comparer au prochain scan';
}

function renderIngredients(product) {
  const ol = $('ingredient-list');
  ol.innerHTML = '';
  for (const ing of product.ingredients) {
    const li = document.createElement('li');
    const pct = ing.percentage != null ? ` — ${ing.percentage}%` : '';
    const e = ing.e_number ? ` [${ing.e_number}]` : '';
    li.textContent = `${ing.name}${pct}${e}`;
    if (ing.category === 'additive') li.classList.add('additive');
    ol.appendChild(li);
  }
}

function renderList(id, items, emptyLabel) {
  const ul = $(id);
  ul.innerHTML = '';
  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = emptyLabel;
    ul.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
}

// ---------- Events ----------

fileInput.addEventListener('change', async (e) => {
  await addFiles(e.target.files);
  fileInput.value = '';
});

queueEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.queue-remove');
  if (btn) removeFromQueue(btn.dataset.id);
});

scanBtn.addEventListener('click', () => { scanImage(); });

resetBtn.addEventListener('click', () => {
  queue.length = 0;
  fileInput.value = '';
  renderQueue();
  hide(resultEl);
  hide(errorEl);
});

compareNextBtn?.addEventListener('click', () => {
  if (lastData) armComparison(lastData);
});

compareClear?.addEventListener('click', () => {
  hide(comparisonEl);
  localStorage.removeItem(LS_COMPARE_ARMED);
  localStorage.removeItem(LS_COMPARE_PREV);
});

settingsBtn?.addEventListener('click', () => {
  keyInput.value = getKey();
  modeSelect.value = localStorage.getItem(LS_MODE) || (isCapacitor ? 'direct' : 'auto');
  settingsDialog.showModal();
});

settingsSave?.addEventListener('click', (e) => {
  e.preventDefault();
  const key = keyInput.value.trim();
  if (key) localStorage.setItem(LS_KEY, key);
  else localStorage.removeItem(LS_KEY);
  localStorage.setItem(LS_MODE, modeSelect.value);
  settingsDialog.close();
});

settingsCancel?.addEventListener('click', (e) => {
  e.preventDefault();
  settingsDialog.close();
});

if ('serviceWorker' in navigator && !isCapacitor) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

if (compareArmed()) {
  compareNextBtn?.setAttribute('disabled', 'true');
  if (compareNextBtn) compareNextBtn.textContent = '✓ En attente du prochain scan';
}

renderQueue();
