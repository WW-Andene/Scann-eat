import { t, setLang, currentLang, applyStaticTranslations } from '/i18n.js';
import { explainFlag } from '/explanations.js';
import { enqueue, listPending, remove as removePending, countPending } from '/queue-store.js';
import { saveScan, listScans, deleteScan, clearScans } from '/scan-history.js';
import { detectAllergens } from '/allergens.js';

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
const resultConfidenceEl = $('result-confidence');
const barcodeLiveBtn = $('barcode-live-btn');

const settingsBtn = $('settings-btn');
const settingsDialog = $('settings-dialog');
const keyInput = $('settings-key');
const modeSelect = $('settings-mode');
const langSelect = $('settings-language');
const settingsSave = $('settings-save');
const settingsCancel = $('settings-cancel');

const explainDialog = $('explain-dialog');
const explainTitle = $('explain-title');
const explainBody = $('explain-body');

const cameraDialog = $('camera-dialog');
const cameraVideo = $('camera-video');
const cameraStatus = $('camera-status');
const cameraClose = $('camera-close');

const pendingBanner = $('pending-banner');
const pendingText = $('pending-text');
const pendingRetry = $('pending-retry');

const updateBanner = $('update-banner');
const updateInstallBtn = $('update-install-btn');
const updateDismissBtn = $('update-dismiss-btn');
const updateVersionEl = $('update-version');

const pillarDialog = $('pillar-dialog');
const pillarDialogTitle = $('pillar-dialog-title');
const pillarDialogList = $('pillar-dialog-list');

const obDialog = $('onboarding-dialog');
const obSkip = $('ob-skip');
const obNext = $('ob-next');

const historySearchInput = $('history-search');
const historyGradeSelect = $('history-grade');
const additiveSummaryEl = $('additive-summary');
const shareBtn = $('share-btn');
const themeSelect = $('settings-theme');

const LS_KEY = 'scanneat.groq_key';
const LS_MODE = 'scanneat.mode';
const LS_COMPARE_ARMED = 'scanneat.compare_armed';
const LS_COMPARE_PREV = 'scanneat.compare_prev';
const LS_DISMISSED_VERSION = 'scanneat.dismissed_update';
const LS_PREFS = 'scanneat.prefs';
const LS_ONBOARDED = 'scanneat.onboarded';
const LS_THEME = 'scanneat.theme';

const MAX_IMAGES = 4;
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

const isCapacitor = !!globalThis.Capacitor?.isNativePlatform?.();

const queue = []; // { id, dataUrl, base64, mime, barcode? }
let lastData = null;

// ============================================================================
// Preferences
// ============================================================================

function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFS) || '{}');
  } catch { return {}; }
}
function setPrefs(p) {
  localStorage.setItem(LS_PREFS, JSON.stringify(p));
}

/**
 * Add preference-driven red/green flags on top of the engine output.
 * The score is not changed — only the UI surfaces additional concerns.
 */
function applyPreferenceFlags(data) {
  const prefs = getPrefs();
  const extras = { red: [], green: [] };
  const meatRe = /viande|porc|b[oœ]euf|poulet|dinde|canard|jambon|saucisse|bacon|agneau|lardon|chorizo|merguez/i;

  if (prefs.vegetarian) {
    const meatIng = data.product.ingredients.find((i) => meatRe.test(i.name));
    if (meatIng) extras.red.push(t('prefMeatRed', { name: meatIng.name }));
  }
  if (prefs.lowSugar && data.product.nutrition.sugars_g > 5) {
    extras.red.push(t('prefSugarRed', { v: data.product.nutrition.sugars_g }));
  }
  if (prefs.lowSalt && data.product.nutrition.salt_g > 0.75) {
    extras.red.push(t('prefSaltRed', { v: data.product.nutrition.salt_g }));
  }
  if (prefs.organic && !data.product.organic) {
    extras.red.push(t('prefNotOrganic'));
  }
  if (prefs.highProtein && data.product.nutrition.protein_g >= 10) {
    extras.green.push(t('prefProteinGreen', { v: data.product.nutrition.protein_g }));
  }
  return extras;
}

// ============================================================================
// Confidence heuristic
// ============================================================================

function computeConfidence(data) {
  if (data.source === 'openfoodfacts') return 'high';
  const warns = data.warnings?.length || 0;
  const n = data.product.nutrition;
  const filled = [n.energy_kcal, n.fat_g, n.carbs_g, n.sugars_g, n.protein_g, n.salt_g]
    .filter((v) => v > 0).length;
  if (warns === 0 && filled >= 4) return 'high';
  if (warns >= 2 || filled <= 2) return 'low';
  return 'medium';
}

// ============================================================================
// Helpers
// ============================================================================

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
function getKey() { return localStorage.getItem(LS_KEY) || ''; }
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

// ============================================================================
// Barcode detection
// ============================================================================

let barcodeDetector = null;
function getBarcodeDetector() {
  if (barcodeDetector !== null) return barcodeDetector;
  if (!('BarcodeDetector' in window)) { barcodeDetector = false; return false; }
  try {
    barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    });
  } catch { barcodeDetector = false; }
  return barcodeDetector;
}

async function detectBarcodeFromFile(file) {
  const detector = getBarcodeDetector();
  if (!detector) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    bitmap.close?.();
    for (const c of codes) {
      const d = (c.rawValue || '').replace(/\D/g, '');
      if (d.length === 8 || d.length === 12 || d.length === 13) return d;
    }
  } catch { /* ignore */ }
  return null;
}

// ============================================================================
// Compression
// ============================================================================

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image unreadable')); };
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
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
        'image/jpeg', JPEG_QUALITY,
      ),
    );
    const dataUrl = await blobToDataUrl(blob);
    const comma = dataUrl.indexOf(',');
    return { dataUrl, base64: dataUrl.slice(comma + 1), mime: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// Queue UI
// ============================================================================

function renderQueue() {
  queueEl.innerHTML = '';
  if (queue.length === 0) queueEl.hidden = true;
  else {
    queueEl.hidden = false;
    for (const item of queue) {
      const wrap = document.createElement('div');
      wrap.className = 'queue-item';
      if (item.barcode) wrap.classList.add('has-barcode');
      const img = document.createElement('img');
      img.src = item.dataUrl; img.alt = '';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'queue-remove';
      remove.dataset.id = item.id; remove.textContent = '×';
      wrap.appendChild(img); wrap.appendChild(remove);
      if (item.barcode) {
        const tag = document.createElement('span');
        tag.className = 'queue-barcode'; tag.textContent = `📦 ${item.barcode}`;
        wrap.appendChild(tag);
      }
      queueEl.appendChild(wrap);
    }
  }
  scanBtn.disabled = queue.length === 0;
  const label = $('capture-label');
  if (label) {
    label.textContent =
      queue.length >= MAX_IMAGES ? t('maxPhotos', { n: MAX_IMAGES })
      : queue.length > 0 ? t('addAnotherPhoto')
      : t('addPhoto');
  }
}

async function addFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  hide(errorEl);
  const files = Array.from(fileList).slice(0, MAX_IMAGES - queue.length);
  for (const file of files) {
    try {
      const barcode = await detectBarcodeFromFile(file);
      const compressed = await compressImage(file);
      queue.push({ id: crypto.randomUUID(), ...compressed, barcode });
      renderQueue();
    } catch (err) {
      errorEl.textContent = err.message; show(errorEl);
    }
  }
}

function addBarcodeOnly(barcode) {
  queue.push({
    id: crypto.randomUUID(),
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" fill="%230f1a14"/><text x="30" y="34" text-anchor="middle" fill="%239be3a6" font-size="20">📦</text></svg>',
    base64: '', mime: 'image/jpeg',
    barcode,
  });
  renderQueue();
}

function removeFromQueue(id) {
  const idx = queue.findIndex((q) => q.id === id);
  if (idx >= 0) queue.splice(idx, 1);
  renderQueue();
}
function firstBarcode() { return queue.find((q) => !!q.barcode)?.barcode || null; }

// ============================================================================
// Scan execution
// ============================================================================

function queuePayload() {
  return queue.filter((q) => q.base64).map((q) => ({ base64: q.base64, mime: q.mime }));
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
  const bc = firstBarcode();
  if (bc) {
    const off = await fetchFromOFF(bc);
    if (off) return { product: off, audit: scoreProduct(off), warnings: [], source: 'openfoodfacts', barcode: bc };
  }
  const payload = queuePayload();
  if (payload.length === 0) throw new Error('Aucune photo à analyser.');
  if (!key) throw new Error(t('settingsKey') + ' manquante.');
  const parsed = await parseLabel(payload, { apiKey: key });
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
  hide(errorEl); hide(resultEl); show(statusEl);
  const bc = firstBarcode();
  statusText.textContent = bc
    ? t('barcodeDetected', { code: bc })
    : queue.length > 1 ? t('analysingN', { n: queue.length })
    : t('analysing');

  const mode = getMode();
  try {
    let data;
    if (mode === 'direct') data = await scanViaDirect();
    else if (mode === 'server') data = await scanViaServer();
    else {
      try { data = await scanViaServer(); }
      catch (err) {
        if (getKey()) { statusText.textContent = t('serverUnavailable'); data = await scanViaDirect(); }
        else throw err;
      }
    }
    hide(statusEl);
    lastData = data;
    maybeRenderComparison(data);
    renderAudit(data);
    renderIngredients(data.product);
    renderNutrition(data.product);
    show(resultEl);
    persistToHistory(data);
  } catch (err) {
    hide(statusEl);
    console.error('[scan] failed', err);
    const isNet = !navigator.onLine || /network|failed to fetch|load failed/i.test(err.message);
    if (isNet) {
      await enqueueCurrent();
      errorEl.textContent = `${t('offline')} — ${err.message}`;
    } else {
      errorEl.textContent = `${err.message}`;
    }
    show(errorEl);
  }
}

// ============================================================================
// Offline queue integration
// ============================================================================

async function enqueueCurrent() {
  if (queue.length === 0) return;
  await enqueue({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    images: queue.filter((q) => q.base64).map((q) => ({ base64: q.base64, mime: q.mime })),
    barcode: firstBarcode(),
  });
  updatePendingBanner();
}

async function updatePendingBanner() {
  const n = await countPending().catch(() => 0);
  if (n === 0) { hide(pendingBanner); return; }
  const key = n === 1 ? 'pendingScans' : 'pendingScansN';
  pendingText.textContent = t(key, { n });
  show(pendingBanner);
}

async function retryPending() {
  const items = await listPending();
  for (const item of items) {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: item.images, barcode: item.barcode }),
      });
      if (res.ok) await removePending(item.id);
      else break; // stop the loop on first failure
    } catch { break; }
  }
  await updatePendingBanner();
}

window.addEventListener('online', retryPending);

// ============================================================================
// Rendering
// ============================================================================

function renderAudit(data) {
  const { audit, warnings } = data;
  $('grade-el').textContent = audit.grade;
  $('grade-el').dataset.grade = audit.grade;
  $('score-el').textContent = String(audit.score);
  $('verdict-el').textContent = audit.verdict;
  $('product-name').textContent = audit.product_name || '(—)';
  $('product-category').textContent = audit.category.replace(/_/g, ' ');

  if (data.source === 'openfoodfacts') {
    resultSourceEl.textContent = t('sourceOFF');
    show(resultSourceEl);
  } else if (data.source === 'llm') {
    resultSourceEl.textContent = t('sourceLLM');
    show(resultSourceEl);
  } else hide(resultSourceEl);

  const conf = computeConfidence(data);
  resultConfidenceEl.dataset.level = conf;
  resultConfidenceEl.textContent = conf === 'high' ? t('confidenceHigh')
    : conf === 'low' ? t('confidenceLow') : t('confidenceMed');
  show(resultConfidenceEl);

  renderAllergens(data.product);
  renderSparseHint(data);
  renderAdditiveSummary(data.product);
  show(shareBtn);

  const extras = applyPreferenceFlags(data);
  renderList('red-flags', [...audit.red_flags, ...extras.red], t('noFlag'));
  renderList('green-flags', [...audit.green_flags, ...extras.green], t('noFlag'));

  const pillars = [
    [t('pillarProcessing'), audit.pillars.processing],
    [t('pillarDensity'), audit.pillars.nutritional_density],
    [t('pillarNegatives'), audit.pillars.negative_nutrients],
    [t('pillarAdditives'), audit.pillars.additive_risk],
    [t('pillarIntegrity'), audit.pillars.ingredient_integrity],
  ];
  const pillarList = $('pillar-list'); pillarList.innerHTML = '';
  for (const [label, pillar] of pillars) {
    const pct = Math.round((pillar.score / pillar.max) * 100);
    const li = document.createElement('li');
    li.className = 'pillar-row pillar-clickable';
    li.innerHTML = `
      <span class="pillar-label">${label}</span>
      <span class="pillar-bar"><span class="pillar-bar-fill" style="width:${pct}%"></span></span>
      <strong class="pillar-value">${pillar.score} / ${pillar.max}</strong>
    `;
    li.addEventListener('click', () => openPillarDialog(label, pillar));
    pillarList.appendChild(li);
  }
  if (warnings?.length) {
    const w = document.createElement('li');
    w.className = 'warn'; w.textContent = `⚠ ${warnings.join(' • ')}`;
    pillarList.appendChild(w);
  }
  compareNextBtn.disabled = false;
  compareNextBtn.textContent = t('compareNext');
}

function renderAllergens(product) {
  const el = $('allergens');
  const hits = detectAllergens(product, currentLang);
  el.innerHTML = '';
  if (hits.length === 0) { hide(el); return; }
  const intro = document.createElement('span');
  intro.className = 'allergen-intro';
  intro.textContent = t('allergenIntro') + ' :';
  el.appendChild(intro);
  for (const hit of hits) {
    const chip = document.createElement('span');
    chip.className = 'allergen-chip';
    chip.textContent = hit.label;
    chip.title = hit.triggers.join(', ');
    el.appendChild(chip);
  }
  show(el);
}

function renderSparseHint(data) {
  const el = $('sparse-hint');
  const sparse =
    data.product.ingredients.length === 0 ||
    (data.product.nutrition.energy_kcal === 0 && data.product.nutrition.protein_g === 0);
  if (sparse && data.source !== 'openfoodfacts') {
    el.textContent = t('sparseData');
    show(el);
  } else hide(el);
}

async function getAdditiveInfo(eNumber) {
  try {
    const mod = await loadEngine();
    // The engine bundle re-exports ADDITIVES_DB indirectly via scoreProduct;
    // but not directly. Fetch via a client-side lookup table instead:
    return window.__additivesIndex?.[eNumber] ?? null;
  } catch { return null; }
}

// Lightweight additives index populated lazily from the bundle.
async function ensureAdditivesIndex() {
  if (window.__additivesIndex) return;
  try {
    const mod = await import('/engine.bundle.js');
    if (mod.ADDITIVES_DB) {
      const idx = {};
      for (const a of mod.ADDITIVES_DB) idx[a.e_number] = a;
      window.__additivesIndex = idx;
    }
  } catch { /* ignore — fall back to name-only rendering */ }
}

function buildIngredientRow(ing) {
  const li = document.createElement('li');
  const info = ing.e_number ? window.__additivesIndex?.[ing.e_number] : null;

  const dot = document.createElement('span');
  dot.className = 'ing-dot';
  if (info) dot.dataset.tier = String(info.tier);
  else if (ing.category === 'additive') dot.dataset.tier = '0';
  else if (ing.is_whole_food) dot.dataset.whole = '1';
  li.appendChild(dot);

  const label = document.createElement('span');
  label.className = 'ing-label';
  const e = ing.e_number ? ` [${ing.e_number}]` : '';
  label.textContent = `${ing.name}${e}`;
  li.appendChild(label);

  if (ing.percentage != null) {
    const pct = document.createElement('span');
    pct.className = 'ing-pct';
    pct.innerHTML = `
      <span class="ing-pct-bar"><span class="ing-pct-fill" style="width:${Math.min(100, ing.percentage)}%"></span></span>
      <span class="ing-pct-val">${ing.percentage}%</span>
    `;
    li.appendChild(pct);
  }

  if (ing.category === 'additive') li.classList.add('additive');
  if (info) {
    li.classList.add('explainable');
    li.addEventListener('click', () => {
      explainTitle.textContent = `${ing.name}${e}`;
      const parts = [info.concern];
      if (info.source) parts.push(`\n\nSource : ${info.source}`);
      explainBody.textContent = parts.join('');
      explainDialog.showModal();
    });
  }
  return li;
}

function renderIngredients(product) {
  ensureAdditivesIndex();
  const host = $('ingredient-list');
  host.innerHTML = '';
  const foods = product.ingredients.filter((i) => i.category !== 'additive');
  const additives = product.ingredients.filter((i) => i.category === 'additive');

  if (foods.length > 0) {
    const headerLi = document.createElement('li');
    headerLi.className = 'ing-group-header';
    headerLi.textContent = `${t('ingFoods')} (${foods.length})`;
    host.appendChild(headerLi);
    for (const ing of foods) host.appendChild(buildIngredientRow(ing));
  }
  if (additives.length > 0) {
    const headerLi = document.createElement('li');
    headerLi.className = 'ing-group-header';
    headerLi.textContent = `${t('ingAdditives')} (${additives.length})`;
    host.appendChild(headerLi);
    for (const ing of additives) host.appendChild(buildIngredientRow(ing));
  }
}

function renderNutrition(product) {
  const ul = $('nutrition-list'); ul.innerHTML = '';
  const rows = [
    ['Énergie', `${product.nutrition.energy_kcal} kcal`],
    ['Matières grasses', `${product.nutrition.fat_g} g`],
    ['↳ dont saturées', `${product.nutrition.saturated_fat_g} g`],
    ['Glucides', `${product.nutrition.carbs_g} g`],
    ['↳ dont sucres', `${product.nutrition.sugars_g} g`],
    ['Fibres', `${product.nutrition.fiber_g} g`],
    ['Protéines', `${product.nutrition.protein_g} g`],
    ['Sel', `${product.nutrition.salt_g} g`],
  ];
  for (const [label, value] of rows) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    ul.appendChild(li);
  }
}

function renderList(id, items, emptyLabel) {
  const ul = $(id); ul.innerHTML = '';
  if (!items || items.length === 0) {
    const li = document.createElement('li'); li.className = 'empty';
    li.textContent = emptyLabel; ul.appendChild(li); return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    li.classList.add('explainable');
    li.addEventListener('click', () => openExplanation(item));
    ul.appendChild(li);
  }
}

function openExplanation(reason) {
  const bare = reason.replace(/^VETO:\s*/i, '');
  const text = explainFlag(bare, currentLang) || reason;
  explainTitle.textContent = reason;
  explainBody.textContent = text;
  explainDialog.showModal();
}

function openPillarDialog(label, pillar) {
  pillarDialogTitle.textContent = `${label} — ${pillar.score} / ${pillar.max}`;
  pillarDialogList.innerHTML = '';
  const all = [
    ...pillar.bonuses.map((b) => ({ ...b, kind: 'bonus' })),
    ...pillar.deductions.map((d) => ({ ...d, kind: 'deduction' })),
  ];
  if (all.length === 0) {
    const li = document.createElement('li');
    li.textContent = '—';
    pillarDialogList.appendChild(li);
  }
  for (const item of all) {
    const li = document.createElement('li');
    li.className = `pillar-d-row ${item.kind}`;
    li.innerHTML = `
      <span class="pd-points">${item.points > 0 ? '+' : ''}${item.points}</span>
      <span class="pd-reason">${item.reason}</span>
      ${item.evidence ? `<small class="pd-evidence">${item.evidence}</small>` : ''}
    `;
    pillarDialogList.appendChild(li);
  }
  pillarDialog.showModal();
}

function renderAdditiveSummary(product) {
  const tiers = { 1: 0, 2: 0, 3: 0 };
  for (const ing of product.ingredients) {
    if (!ing.e_number) continue;
    const info = window.__additivesIndex?.[ing.e_number];
    if (info) tiers[info.tier]++;
  }
  const total = tiers[1] + tiers[2] + tiers[3];
  if (total === 0) {
    additiveSummaryEl.textContent = t('additiveNone');
    additiveSummaryEl.dataset.worst = 'none';
  } else {
    additiveSummaryEl.textContent = t('additiveSummary', {
      total, t1: tiers[1], t2: tiers[2], t3: tiers[3],
    });
    additiveSummaryEl.dataset.worst = tiers[1] > 0 ? '1' : tiers[2] > 0 ? '2' : '3';
  }
}

async function shareCurrentScan() {
  if (!lastData || !navigator.share) return;
  try {
    await navigator.share({
      title: 'Scann-eat',
      text: t('shareText', {
        name: lastData.audit.product_name || 'Produit',
        score: lastData.audit.score,
        grade: lastData.audit.grade,
      }),
    });
  } catch { /* user cancelled */ }
}

// ---------- Theme ----------

function applyTheme() {
  const pref = localStorage.getItem(LS_THEME) || 'dark';
  const mediaLight = pref === 'auto' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  const actual = pref === 'light' || mediaLight ? 'light' : 'dark';
  document.documentElement.dataset.theme = actual;
}
applyTheme();
window.matchMedia?.('(prefers-color-scheme: light)')?.addEventListener('change', applyTheme);

// ---------- Onboarding ----------

function maybeShowOnboarding() {
  if (localStorage.getItem(LS_ONBOARDED) === '1') return;
  const slides = obDialog.querySelectorAll('.ob-slide');
  const dots = obDialog.querySelectorAll('.ob-dot');
  const TOTAL = slides.length;
  let current = 1;
  const render = () => {
    slides.forEach((s) => { s.hidden = Number(s.dataset.slide) !== current; });
    dots.forEach((d, i) => d.classList.toggle('active', i + 1 === current));
    obNext.textContent = current === TOTAL ? t('start') : t('next');
  };
  obNext.onclick = () => {
    if (current < TOTAL) { current++; render(); }
    else { localStorage.setItem(LS_ONBOARDED, '1'); obDialog.close(); }
  };
  obSkip.onclick = () => {
    localStorage.setItem(LS_ONBOARDED, '1');
    obDialog.close();
  };
  render();
  obDialog.showModal();
}

// ============================================================================
// Comparison
// ============================================================================

function compareArmed() { return localStorage.getItem(LS_COMPARE_ARMED) === '1'; }
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
    $('a-grade').textContent = prev.grade; $('a-grade').dataset.grade = prev.grade;
    $('a-name').textContent = prev.name; $('a-score').textContent = String(prev.score);
    $('b-grade').textContent = current.grade; $('b-grade').dataset.grade = current.grade;
    $('b-name').textContent = current.name; $('b-score').textContent = String(current.score);
    const delta = current.score - prev.score;
    const sign = delta > 0 ? '+' : '';
    const direction = delta > 0 ? ` ${t('betterCurrent')}` : delta < 0 ? ` ${t('betterPrev')}` : '';
    const prevIng = new Set(prev.ingredients.map((s) => s.toLowerCase()));
    const curIng = new Set(current.ingredients.map((s) => s.toLowerCase()));
    const added = [...curIng].filter((i) => !prevIng.has(i));
    const lost = [...prevIng].filter((i) => !curIng.has(i));
    $('compare-delta').innerHTML = [
      `${t('deltaScore')}: <strong>${sign}${delta}</strong>${direction}`,
      added.length ? `${t('newIngredients')}: ${added.slice(0, 4).join(', ')}${added.length > 4 ? '…' : ''}` : '',
      lost.length ? `${t('lostIngredients')}: ${lost.slice(0, 4).join(', ')}${lost.length > 4 ? '…' : ''}` : '',
    ].filter(Boolean).join(' • ');
    show(comparisonEl);
    localStorage.removeItem(LS_COMPARE_ARMED);
    localStorage.removeItem(LS_COMPARE_PREV);
  } else hide(comparisonEl);
}
function armComparison(data) {
  localStorage.setItem(LS_COMPARE_ARMED, '1');
  localStorage.setItem(LS_COMPARE_PREV, JSON.stringify(snapshotFromData(data)));
  compareNextBtn.textContent = t('compareWaiting');
  compareNextBtn.disabled = true;
}

// ============================================================================
// Live barcode scanner
// ============================================================================

let cameraStream = null;
let cameraLoopHandle = null;

async function openCameraScanner() {
  if (!getBarcodeDetector()) {
    errorEl.textContent = t('cameraUnsupported'); show(errorEl); return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }, audio: false,
    });
  } catch (err) {
    errorEl.textContent = t('cameraDenied'); show(errorEl); return;
  }
  cameraVideo.srcObject = cameraStream;
  cameraDialog.showModal();
  cameraStatus.textContent = t('cameraReady');

  const detector = getBarcodeDetector();
  const scan = async () => {
    if (!cameraDialog.open) return;
    try {
      const codes = await detector.detect(cameraVideo);
      for (const c of codes) {
        const d = (c.rawValue || '').replace(/\D/g, '');
        if (d.length === 8 || d.length === 12 || d.length === 13) {
          closeCameraScanner();
          addBarcodeOnly(d);
          await scanImage();
          return;
        }
      }
    } catch { /* ignore detection errors */ }
    cameraLoopHandle = setTimeout(scan, 250);
  };
  scan();
}
function closeCameraScanner() {
  if (cameraLoopHandle) clearTimeout(cameraLoopHandle);
  cameraLoopHandle = null;
  if (cameraStream) { cameraStream.getTracks().forEach((t) => t.stop()); cameraStream = null; }
  cameraVideo.srcObject = null;
  if (cameraDialog.open) cameraDialog.close();
}

// ============================================================================
// Scan history
// ============================================================================

const recentScansEl = $('recent-scans');
const recentListEl = $('recent-list');
const clearHistoryBtn = $('clear-history');

async function persistToHistory(data) {
  const thumb = queue.find((q) => q.dataUrl && q.dataUrl.startsWith('data:image'))?.dataUrl
    ?? '';
  await saveScan({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    thumbnail: thumb,
    name: data.audit.product_name || data.product.name,
    grade: data.audit.grade,
    score: data.audit.score,
    category: data.audit.category,
    source: data.source,
    snapshot: data,
  });
  renderRecentScans();
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return t('justNow');
  if (min < 60) return t('minutesAgo', { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t('hoursAgo', { n: h });
  const d = Math.round(h / 24);
  return t('daysAgo', { n: d });
}

async function renderRecentScans() {
  const all = await listScans().catch(() => []);
  recentListEl.innerHTML = '';
  if (all.length === 0) { hide(recentScansEl); return; }
  const query = (historySearchInput?.value || '').trim().toLowerCase();
  const gradeFilter = historyGradeSelect?.value || '';
  const items = all.filter((i) => {
    if (query && !(i.name || '').toLowerCase().includes(query)) return false;
    if (gradeFilter && i.grade !== gradeFilter) return false;
    return true;
  });
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'recent-empty';
    li.textContent = '—';
    recentListEl.appendChild(li);
    show(recentScansEl);
    return;
  }
  for (const item of items.slice(0, 12)) {
    const li = document.createElement('li');
    li.className = 'recent-item';
    li.dataset.id = item.id;
    const thumb = document.createElement('div');
    thumb.className = 'recent-thumb';
    if (item.thumbnail) {
      const img = document.createElement('img');
      img.src = item.thumbnail; img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '📦';
    }
    const meta = document.createElement('div');
    meta.className = 'recent-meta';
    const grade = document.createElement('span');
    grade.className = 'recent-grade';
    grade.dataset.grade = item.grade;
    grade.textContent = item.grade;
    const name = document.createElement('strong');
    name.className = 'recent-name';
    name.textContent = item.name;
    const when = document.createElement('small');
    when.className = 'recent-when';
    when.textContent = `${item.score}/100 • ${timeAgo(item.createdAt)}`;
    meta.appendChild(grade);
    meta.appendChild(name);
    meta.appendChild(when);
    const del = document.createElement('button');
    del.className = 'recent-del';
    del.type = 'button';
    del.setAttribute('aria-label', t('removeFromHistory'));
    del.textContent = '×';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteScan(item.id);
      renderRecentScans();
    });
    li.appendChild(thumb);
    li.appendChild(meta);
    li.appendChild(del);
    li.addEventListener('click', () => reopenScan(item));
    recentListEl.appendChild(li);
  }
  show(recentScansEl);
}

function reopenScan(item) {
  if (!item.snapshot) return;
  lastData = item.snapshot;
  hide(errorEl);
  hide(statusEl);
  renderAudit(item.snapshot);
  renderIngredients(item.snapshot.product);
  renderNutrition(item.snapshot.product);
  show(resultEl);
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

clearHistoryBtn?.addEventListener('click', async () => {
  await clearScans();
  renderRecentScans();
});

const exportHistoryBtn = $('export-history');
exportHistoryBtn?.addEventListener('click', async () => {
  const items = await listScans().catch(() => []);
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `scanneat-history-${date}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});

historySearchInput?.addEventListener('input', () => renderRecentScans());
historyGradeSelect?.addEventListener('change', () => renderRecentScans());

// Keyboard shortcuts: Enter scans, Esc closes dialogs, / focuses search.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    return;
  }
  const tag = (e.target?.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (!typing && e.key === '/' && historySearchInput) {
    e.preventDefault();
    historySearchInput.focus();
    return;
  }
  if (!typing && e.key === 'Enter' && !scanBtn.disabled) {
    scanBtn.click();
  }
});

// ============================================================================
// Auto-update (APK only)
// ============================================================================

const GITHUB_REPO = 'WW-Andene/Scann-eat';
const UPDATE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

async function currentCommit() {
  try {
    const r = await fetch('/version.json', { cache: 'no-cache' });
    if (!r.ok) return null;
    return (await r.json()).commit || null;
  } catch { return null; }
}
async function latestRelease() {
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' }, cache: 'no-cache',
    });
    if (!r.ok) return null;
    const rel = await r.json();
    const apk = (rel.assets || []).find((a) => /\.apk$/i.test(a.name));
    if (!apk) return null;
    return { tag: rel.tag_name, commit: (rel.tag_name || '').replace(/^build-/, ''), apkUrl: apk.browser_download_url };
  } catch { return null; }
}
async function checkForUpdate() {
  if (!isCapacitor) return;
  const [cur, latest] = await Promise.all([currentCommit(), latestRelease()]);
  if (!cur || !latest || latest.commit === cur) return;
  if (localStorage.getItem(LS_DISMISSED_VERSION) === latest.tag) return;
  updateVersionEl.textContent = latest.tag;
  updateInstallBtn.setAttribute('href', latest.apkUrl);
  show(updateBanner);
}

// ============================================================================
// Wiring
// ============================================================================

applyStaticTranslations();

fileInput.addEventListener('change', async (e) => {
  await addFiles(e.target.files); fileInput.value = '';
});
queueEl.addEventListener('click', (e) => {
  const b = e.target.closest('.queue-remove');
  if (b) removeFromQueue(b.dataset.id);
});
scanBtn.addEventListener('click', () => { scanImage(); });
resetBtn.addEventListener('click', () => {
  queue.length = 0; fileInput.value = '';
  renderQueue(); hide(resultEl); hide(errorEl);
});
compareNextBtn?.addEventListener('click', () => { if (lastData) armComparison(lastData); });
compareClear?.addEventListener('click', () => {
  hide(comparisonEl);
  localStorage.removeItem(LS_COMPARE_ARMED);
  localStorage.removeItem(LS_COMPARE_PREV);
});

if (getBarcodeDetector()) show(barcodeLiveBtn);
barcodeLiveBtn?.addEventListener('click', () => openCameraScanner());
cameraClose?.addEventListener('click', () => closeCameraScanner());

settingsBtn?.addEventListener('click', () => {
  keyInput.value = getKey();
  modeSelect.value = localStorage.getItem(LS_MODE) || (isCapacitor ? 'direct' : 'auto');
  langSelect.value = currentLang;
  themeSelect.value = localStorage.getItem(LS_THEME) || 'dark';
  const prefs = getPrefs();
  $('pref-vegetarian').checked = !!prefs.vegetarian;
  $('pref-lowsugar').checked = !!prefs.lowSugar;
  $('pref-lowsalt').checked = !!prefs.lowSalt;
  $('pref-highprotein').checked = !!prefs.highProtein;
  $('pref-organic').checked = !!prefs.organic;
  settingsDialog.showModal();
});
settingsSave?.addEventListener('click', (e) => {
  e.preventDefault();
  const key = keyInput.value.trim();
  if (key) localStorage.setItem(LS_KEY, key); else localStorage.removeItem(LS_KEY);
  localStorage.setItem(LS_MODE, modeSelect.value);
  localStorage.setItem(LS_THEME, themeSelect.value);
  setLang(langSelect.value);
  applyTheme();
  setPrefs({
    vegetarian: $('pref-vegetarian').checked,
    lowSugar: $('pref-lowsugar').checked,
    lowSalt: $('pref-lowsalt').checked,
    highProtein: $('pref-highprotein').checked,
    organic: $('pref-organic').checked,
  });
  settingsDialog.close();
  applyStaticTranslations();
});
settingsCancel?.addEventListener('click', (e) => { e.preventDefault(); settingsDialog.close(); });

updateDismissBtn?.addEventListener('click', () => {
  const tag = updateVersionEl.textContent || '';
  if (tag) localStorage.setItem(LS_DISMISSED_VERSION, tag);
  hide(updateBanner);
});

pendingRetry?.addEventListener('click', () => { retryPending(); });

if (!navigator.share) hide(shareBtn);
shareBtn?.addEventListener('click', shareCurrentScan);

const aboutBtn = $('about-btn');
const aboutDialog = $('about-dialog');
aboutBtn?.addEventListener('click', () => {
  aboutDialog?.showModal();
});

if ('serviceWorker' in navigator && !isCapacitor) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}
if (compareArmed()) {
  compareNextBtn?.setAttribute('disabled', 'true');
  if (compareNextBtn) compareNextBtn.textContent = t('compareWaiting');
}

checkForUpdate();
setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { checkForUpdate(); updatePendingBanner(); }
});

renderQueue();
updatePendingBanner();
renderRecentScans();
maybeShowOnboarding();
