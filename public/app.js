import { t, setLang, currentLang, applyStaticTranslations } from '/i18n.js';
import { explainFlag } from '/explanations.js';
import { enqueue, listPending, remove as removePending, countPending } from '/queue-store.js';
import { saveScan, listScans, deleteScan, clearScans } from '/scan-history.js';
import { detectAllergens } from '/allergens.js';
import {
  getProfile, setProfile, hasMinimalProfile,
  bmrMifflinStJeor, tdeeKcal, bmi, bmiCategory, dailyTargets, proteinPRI_g,
} from '/profile.js';
import { computePersonalScore, personalGrade } from '/personal-score.js';
import { logEntry, logQuickAdd, listByDate, deleteEntry, clearDate, dailyTotals, buildEntry, todayISO, groupByMeal, MEALS, putEntry } from '/consumption.js';
import { logWeight, listWeight, deleteWeight, summarize as summarizeWeight, weeklyTrend } from '/weight-log.js';
import { saveTemplate, listTemplates, deleteTemplate, expandTemplate, templateKcal } from '/meal-templates.js';

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
const LS_FONT_SIZE = 'scanneat.font_size';     // 'normal' | 'large' | 'xlarge'
const LS_FONT_FAMILY = 'scanneat.font_family'; // 'atkinson' | 'lexend' | 'system'
const LS_MOTION = 'scanneat.motion';            // 'normal' | 'reduced'

const MAX_IMAGES = 4;
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

const isCapacitor = !!globalThis.Capacitor?.isNativePlatform?.();

const queue = []; // { id, dataUrl, base64, mime, barcode? }
let lastData = null;

// ============================================================================
// Preferences → Profile modifiers (moved into Profile; this block kept for
// the single UI-side responsibility: projecting the veto status onto flags).
// ============================================================================

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
  await updatePendingBanner();
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

  renderPersonalScore(audit, data.product);

  if (data.source === 'openfoodfacts') {
    resultSourceEl.textContent = t('sourceOFF');
    show(resultSourceEl);
  } else if (data.source === 'merged') {
    resultSourceEl.textContent = t('sourceMerged');
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
  setupPortionPanel(data.product);
  show(shareBtn);

  renderList('red-flags', audit.red_flags, t('noFlag'));
  renderList('green-flags', audit.green_flags, t('noFlag'));

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
  const ingredients = Array.isArray(product?.ingredients) ? product.ingredients : [];
  const foods = ingredients.filter((i) => i && i.category !== 'additive');
  const additives = ingredients.filter((i) => i && i.category === 'additive');

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
  const n = product?.nutrition;
  if (!n) return; // defensive: stale saved snapshot without nutrition
  const fmt = (v, unit) => (typeof v === 'number' ? `${v} ${unit}` : '—');
  const rows = [
    ['Énergie', fmt(n.energy_kcal, 'kcal')],
    ['Matières grasses', fmt(n.fat_g, 'g')],
    ['↳ dont saturées', fmt(n.saturated_fat_g, 'g')],
    ['Glucides', fmt(n.carbs_g, 'g')],
    ['↳ dont sucres', fmt(n.sugars_g, 'g')],
    ['Fibres', fmt(n.fiber_g, 'g')],
    ['Protéines', fmt(n.protein_g, 'g')],
    ['Sel', fmt(n.salt_g, 'g')],
  ];
  for (const [label, value] of rows) {
    const li = document.createElement('li');
    const lblSpan = document.createElement('span');
    lblSpan.textContent = label; // developer-controlled but safe-by-default
    const valStrong = document.createElement('strong');
    valStrong.textContent = value;
    li.appendChild(lblSpan);
    li.appendChild(valStrong);
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
    const pts = document.createElement('span');
    pts.className = 'pd-points';
    pts.textContent = `${item.points > 0 ? '+' : ''}${item.points}`;
    const reason = document.createElement('span');
    reason.className = 'pd-reason';
    reason.textContent = String(item.reason ?? '');
    li.appendChild(pts);
    li.appendChild(reason);
    if (item.evidence) {
      const ev = document.createElement('small');
      ev.className = 'pd-evidence';
      ev.textContent = String(item.evidence);
      li.appendChild(ev);
    }
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

// ---------- Reading accessibility (font size / family / motion) ----------

function applyReadingPrefs() {
  const body = document.body;
  const size = localStorage.getItem(LS_FONT_SIZE) || 'normal';
  const family = localStorage.getItem(LS_FONT_FAMILY) || 'atkinson';
  const motion = localStorage.getItem(LS_MOTION) || 'normal';

  body.classList.remove('font-size-large', 'font-size-xlarge');
  if (size === 'large')  body.classList.add('font-size-large');
  if (size === 'xlarge') body.classList.add('font-size-xlarge');

  body.classList.remove('font-lexend', 'font-system');
  if (family === 'lexend') body.classList.add('font-lexend');
  if (family === 'system') body.classList.add('font-system');

  body.classList.toggle('reduce-motion', motion === 'reduced');
}
applyReadingPrefs();

// ---------- Read-aloud (SpeechSynthesis) ----------

const SPEECH = globalThis.speechSynthesis;
let speaking = false;

function isSpeechSupported() {
  return !!SPEECH && typeof globalThis.SpeechSynthesisUtterance === 'function';
}

function readAloud(text) {
  if (!isSpeechSupported() || !text) return;
  stopReading();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = (currentLang === 'en' ? 'en-US' : 'fr-FR');
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.onend = () => { speaking = false; updateReadAloudButton(); };
  utter.onerror = () => { speaking = false; updateReadAloudButton(); };
  speaking = true;
  updateReadAloudButton();
  SPEECH.speak(utter);
}

function stopReading() {
  if (!isSpeechSupported()) return;
  SPEECH.cancel();
  speaking = false;
  updateReadAloudButton();
}

function updateReadAloudButton() {
  const btn = document.getElementById('read-aloud-btn');
  if (!btn) return;
  btn.textContent = speaking ? t('stopReading') : t('readAloud');
}

/** Compose the short phrase read when the user taps Read Aloud. */
function composeReadAloudText(data) {
  if (!data?.audit) return '';
  const name = data.audit.product_name || data.product?.name || '';
  const score = data.audit.score;
  const grade = data.audit.grade;
  const verdict = data.audit.verdict || '';
  if (currentLang === 'en') {
    return `${name}. Score ${score} out of 100. Grade ${grade}. ${verdict}`;
  }
  return `${name}. Score ${score} sur 100. Note ${grade}. ${verdict}`;
}
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
    const deltaEl = $('compare-delta');
    deltaEl.textContent = ''; // clear safely
    const makeDelta = () => {
      const frag = document.createDocumentFragment();
      frag.append(`${t('deltaScore')}: `);
      const s = document.createElement('strong');
      s.textContent = `${sign}${delta}`;
      frag.appendChild(s);
      frag.append(direction);
      return frag;
    };
    deltaEl.appendChild(makeDelta());
    if (added.length) {
      deltaEl.append(' • ', `${t('newIngredients')}: ${added.slice(0, 4).join(', ')}${added.length > 4 ? '…' : ''}`);
    }
    if (lost.length) {
      deltaEl.append(' • ', `${t('lostIngredients')}: ${lost.slice(0, 4).join(', ')}${lost.length > 4 ? '…' : ''}`);
    }
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
// Personal score
// ============================================================================

const personalSlot = $('personal-slot');
const personalAdjustmentsEl = $('personal-adjustments');
const personalAdjustmentsList = $('personal-adjustments-list');

function renderPersonalScore(audit, product) {
  const profile = getProfile();
  const r = computePersonalScore(audit, product, profile, currentLang);
  personalSlot.classList.toggle('veto', !!r.veto);
  if (!r.applicable) {
    hide(personalSlot);
    hide(personalAdjustmentsEl);
    return;
  }
  const g = personalGrade(r.personal_score);
  $('personal-grade-el').textContent = r.veto ? '⛔' : g;
  $('personal-grade-el').dataset.grade = r.veto ? 'F' : g;
  $('personal-score-el').textContent = r.veto ? '0' : String(r.personal_score);
  const deltaEl = $('personal-delta-el');
  if (r.veto) {
    deltaEl.textContent = t('vetoLabel');
    deltaEl.dataset.sign = 'neg';
  } else if (r.delta === 0) {
    deltaEl.textContent = '';
  } else {
    deltaEl.textContent = r.delta > 0 ? `(+${r.delta})` : `(${r.delta})`;
    deltaEl.dataset.sign = r.delta > 0 ? 'pos' : r.delta < 0 ? 'neg' : 'zero';
  }
  $('personal-verdict-el').textContent = r.diet_reason || '';
  show(personalSlot);

  personalAdjustmentsList.innerHTML = '';
  if (r.adjustments.length === 0) {
    hide(personalAdjustmentsEl);
    return;
  }
  if (r.veto) {
    const note = document.createElement('li');
    note.className = 'pa-row veto';
    note.textContent = t('vetoExplain');
    personalAdjustmentsList.appendChild(note);
  }
  for (const a of r.adjustments) {
    const li = document.createElement('li');
    const posNeg = a.points > 0 ? 'positive' : a.points < 0 ? 'negative' : 'neutral';
    li.className = `pa-row ${a.category} ${posNeg} ${a.veto ? 'veto-row' : ''}`.trim();
    const pts = document.createElement('span');
    pts.className = 'pa-points';
    pts.textContent = a.veto ? '⛔' : `${a.points > 0 ? '+' : ''}${a.points}`;
    const reason = document.createElement('span');
    reason.className = 'pa-reason';
    reason.textContent = String(a.reason ?? '');
    li.appendChild(pts);
    li.appendChild(reason);
    personalAdjustmentsList.appendChild(li);
  }
  show(personalAdjustmentsEl);
}

// ============================================================================
// Profile dialog
// ============================================================================

const profileBtn = $('profile-btn');
const profileDialog = $('profile-dialog');
const profileSex = $('profile-sex');
const profileAge = $('profile-age');
const profileHeight = $('profile-height');
const profileWeight = $('profile-weight');
const profileActivity = $('profile-activity');
const profileDiet = $('profile-diet');
const profileCustomForbidden = $('profile-custom-forbidden');
const profileCustomPreferred = $('profile-custom-preferred');
const profileCustomWrap = $('custom-diet-wrap');
const profileDerivedEl = $('profile-derived');
const profileDerivedList = $('profile-derived-list');
const profileSave = $('profile-save');
const profileCancel = $('profile-cancel');

function openProfileDialog() {
  const p = getProfile();
  profileSex.value = p.sex || '';
  profileAge.value = p.age_years ?? '';
  profileHeight.value = p.height_cm ?? '';
  profileWeight.value = p.weight_kg ?? '';
  $('profile-goal-weight').value = p.goal_weight_kg ?? '';
  profileActivity.value = p.activity || '';
  profileDiet.value = p.diet || 'none';
  profileCustomForbidden.value = (p.custom_diet?.forbidden || []).join('\n');
  profileCustomPreferred.value = (p.custom_diet?.preferred || []).join('\n');
  const m = p.modifiers || {};
  $('mod-lowsugar').checked = !!m.lowSugar;
  $('mod-lowsalt').checked = !!m.lowSalt;
  $('mod-highprotein').checked = !!m.highProtein;
  $('mod-organic').checked = !!m.organic;
  $('profile-macro-split').value = p.macro_split || 'balanced';
  const c = p.macro_split_custom || { carbs: 50, protein: 20, fat: 30 };
  $('macro-custom-carbs').value = c.carbs;
  $('macro-custom-protein').value = c.protein;
  $('macro-custom-fat').value = c.fat;
  toggleCustomDietWrap();
  toggleMacroCustomWrap();
  renderDerived();
  profileDialog.showModal();
}

function toggleMacroCustomWrap() {
  const wrap = $('macro-custom-wrap');
  const sel = $('profile-macro-split');
  if (!wrap || !sel) return;
  if (sel.value === 'custom') show(wrap);
  else hide(wrap);
  renderMacroSum();
}

function renderMacroSum() {
  const el = $('macro-custom-sum');
  if (!el) return;
  const c = Number($('macro-custom-carbs')?.value) || 0;
  const p = Number($('macro-custom-protein')?.value) || 0;
  const f = Number($('macro-custom-fat')?.value) || 0;
  const sum = c + p + f;
  if (Math.abs(sum - 100) <= 3) {
    el.textContent = t('macroSumOk');
    el.dataset.state = 'ok';
  } else {
    el.textContent = t('macroSumOff', { v: sum });
    el.dataset.state = 'off';
  }
}

function toggleCustomDietWrap() {
  if (profileDiet.value === 'custom') show(profileCustomWrap);
  else hide(profileCustomWrap);
}

function readProfileFromForm() {
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    sex: profileSex.value || null,
    age_years: toNum(profileAge.value),
    height_cm: toNum(profileHeight.value),
    weight_kg: toNum(profileWeight.value),
    activity: profileActivity.value || null,
    diet: profileDiet.value || 'none',
    custom_diet: profileDiet.value === 'custom'
      ? {
          forbidden: profileCustomForbidden.value.split('\n').map((s) => s.trim()).filter(Boolean),
          preferred: profileCustomPreferred.value.split('\n').map((s) => s.trim()).filter(Boolean),
        }
      : null,
    modifiers: {
      lowSugar: !!$('mod-lowsugar')?.checked,
      lowSalt: !!$('mod-lowsalt')?.checked,
      highProtein: !!$('mod-highprotein')?.checked,
      organic: !!$('mod-organic')?.checked,
    },
    goal_weight_kg: toNum($('profile-goal-weight')?.value),
    macro_split: $('profile-macro-split')?.value || 'balanced',
    macro_split_custom: {
      carbs: Number($('macro-custom-carbs')?.value) || 50,
      protein: Number($('macro-custom-protein')?.value) || 20,
      fat: Number($('macro-custom-fat')?.value) || 30,
    },
  };
}

function renderDerived() {
  const p = readProfileFromForm();
  if (!hasMinimalProfile(p)) {
    hide(profileDerivedEl);
    return;
  }
  const rows = [];
  const bmiVal = bmi(p);
  const bmiCat = bmiCategory(bmiVal);
  const bmiLabel = bmiCat ? t(({
    underweight: 'bmiUnderweight',
    normal: 'bmiNormal',
    overweight: 'bmiOverweight',
    obese_1: 'bmiObese1',
    obese_2: 'bmiObese2',
    obese_3: 'bmiObese3',
  })[bmiCat] || 'bmiNormal') : '';
  rows.push([t('bmi'), `${bmiVal} (${bmiLabel})`]);
  const bmr = bmrMifflinStJeor(p);
  rows.push([t('bmr'), `${bmr} kcal/j`]);
  const tdee = tdeeKcal(p);
  rows.push([t('tdee'), `${tdee} kcal/j`]);
  const targets = dailyTargets(p);
  if (targets) {
    rows.push([t('proteinTarget'), `${targets.protein_g_target} g`]);
    rows.push([t('satfatMax'), `${targets.sat_fat_g_max} g`]);
    rows.push([t('freeSugarMax'), `${targets.free_sugars_g_max} g (idéal ${targets.free_sugars_g_ideal} g)`]);
  }
  profileDerivedList.innerHTML = rows
    .map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`)
    .join('');
  show(profileDerivedEl);
}

profileBtn?.addEventListener('click', openProfileDialog);
profileDiet?.addEventListener('change', () => { toggleCustomDietWrap(); renderDerived(); });
$('profile-macro-split')?.addEventListener('change', () => { toggleMacroCustomWrap(); renderDerived(); });
for (const id of ['macro-custom-carbs', 'macro-custom-protein', 'macro-custom-fat']) {
  $(id)?.addEventListener('input', () => { renderMacroSum(); renderDerived(); });
}
[profileSex, profileAge, profileHeight, profileWeight, profileActivity].forEach((el) => {
  el?.addEventListener('input', renderDerived);
  el?.addEventListener('change', renderDerived);
});
profileSave?.addEventListener('click', (e) => {
  e.preventDefault();
  setProfile(readProfileFromForm());
  profileDialog.close();
  // Re-render the currently open result, if any, with the new profile.
  if (lastData && !resultEl.hidden) {
    renderAudit(lastData);
  }
});
profileCancel?.addEventListener('click', (e) => { e.preventDefault(); profileDialog.close(); });

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
  const fontSizeSel = document.getElementById('settings-font-size');
  const fontFamSel = document.getElementById('settings-font-family');
  const motionSel = document.getElementById('settings-motion');
  if (fontSizeSel) fontSizeSel.value = localStorage.getItem(LS_FONT_SIZE) || 'normal';
  if (fontFamSel)  fontFamSel.value  = localStorage.getItem(LS_FONT_FAMILY) || 'atkinson';
  if (motionSel)   motionSel.value   = localStorage.getItem(LS_MOTION) || 'normal';
  settingsDialog.showModal();
});
settingsSave?.addEventListener('click', (e) => {
  e.preventDefault();
  const key = keyInput.value.trim();
  if (key) localStorage.setItem(LS_KEY, key); else localStorage.removeItem(LS_KEY);
  localStorage.setItem(LS_MODE, modeSelect.value);
  localStorage.setItem(LS_THEME, themeSelect.value);
  const fontSizeSel = document.getElementById('settings-font-size');
  const fontFamSel = document.getElementById('settings-font-family');
  const motionSel = document.getElementById('settings-motion');
  if (fontSizeSel) localStorage.setItem(LS_FONT_SIZE, fontSizeSel.value);
  if (fontFamSel)  localStorage.setItem(LS_FONT_FAMILY, fontFamSel.value);
  if (motionSel)   localStorage.setItem(LS_MOTION, motionSel.value);
  setLang(langSelect.value);
  applyTheme();
  applyReadingPrefs();
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

// Read-aloud wiring
const readAloudBtn = document.getElementById('read-aloud-btn');
if (!isSpeechSupported()) hide(readAloudBtn);
readAloudBtn?.addEventListener('click', () => {
  if (speaking) { stopReading(); return; }
  if (lastData) readAloud(composeReadAloudText(lastData));
});

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

// ============================================================================
// Consumption logging + daily dashboard
// ============================================================================

const portionPanel = $('portion-panel');
const portionInput = $('portion-grams');
const portionMealSelect = $('portion-meal');
const portionPresetPack = $('portion-preset-pack');
const logBtn = $('log-btn');
const logKcalPreview = $('log-kcal-preview');
const logToast = $('log-toast');
const dashboardEl = $('daily-dashboard');
const dashboardRows = $('dashboard-rows');
const dashboardEntries = $('dashboard-entries');
const dashboardLog = $('dashboard-log');
const dashboardDateEl = $('dashboard-date');
const dashboardRemainingEl = $('dashboard-remaining');
const clearTodayBtn = $('clear-today');
const quickAddBtn = $('quick-add-btn');
const quickAddDialog = $('quick-add-dialog');
const qaCancel = $('qa-cancel');
const qaSave = $('qa-save');

function setupPortionPanel(product) {
  const weight = product?.weight_g;
  const defaultG = weight && weight > 0 && weight < 2000 ? weight : 100;
  portionInput.value = String(defaultG);
  if (weight && weight > 0 && weight < 2000) {
    portionPresetPack.textContent = `${weight} g (paquet)`;
    portionPresetPack.dataset.portion = String(weight);
    portionPresetPack.hidden = false;
  } else {
    portionPresetPack.hidden = true;
  }
  updateLogPreview(product);
  hide(logToast);
}

function updateLogPreview(product) {
  const g = Math.max(0, Number(portionInput.value) || 0);
  const per100 = product?.nutrition?.energy_kcal ?? 0;
  const kcal = Math.round((per100 * g) / 100);
  logKcalPreview.textContent = kcal > 0 ? ` (${kcal} kcal)` : '';
}

portionInput?.addEventListener('input', () => {
  if (lastData) updateLogPreview(lastData.product);
});

$('portion-panel')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip-btn[data-portion]');
  if (!btn) return;
  portionInput.value = btn.dataset.portion;
  if (lastData) updateLogPreview(lastData.product);
});

logBtn?.addEventListener('click', async () => {
  if (!lastData) return;
  const grams = Math.max(0, Number(portionInput.value) || 0);
  if (grams <= 0) return;
  const meal = portionMealSelect?.value || 'snack';
  try {
    const entry = await logEntry(lastData.product, grams, meal);
    logToast.textContent = t('logged', { grams, kcal: Math.round(entry.kcal) });
    show(logToast);
    await renderDashboard();
  } catch (err) {
    console.error('[log]', err);
  }
});

// ----- Quick Add -----
quickAddBtn?.addEventListener('click', () => {
  // reset fields
  for (const id of ['qa-name', 'qa-kcal', 'qa-carbs', 'qa-protein', 'qa-fat', 'qa-satfat', 'qa-sugars', 'qa-salt']) {
    const el = $(id);
    if (el) el.value = '';
  }
  // pick a default meal by time-of-day
  const hour = new Date().getHours();
  const defaultMeal = hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 18 ? 'snack' : 'dinner';
  if ($('qa-meal')) $('qa-meal').value = defaultMeal;
  quickAddDialog.showModal();
});
qaCancel?.addEventListener('click', (e) => { e.preventDefault(); quickAddDialog.close(); });
// ----- Weight tracking -----
const weightBtn = $('weight-btn');
const weightDialog = $('weight-dialog');
const wSave = $('w-save');
const wClose = $('w-close');

weightBtn?.addEventListener('click', () => {
  $('w-kg').value = '';
  $('w-date').value = todayISO();
  $('w-notes').value = '';
  renderWeightHistory();
  weightDialog.showModal();
});
wClose?.addEventListener('click', (e) => { e.preventDefault(); weightDialog.close(); });
wSave?.addEventListener('click', async (e) => {
  e.preventDefault();
  const kg = Number($('w-kg').value);
  if (!Number.isFinite(kg) || kg <= 0) { $('w-kg').focus(); return; }
  try {
    await logWeight(kg, $('w-notes').value || '', $('w-date').value || todayISO());
    // Update the current profile weight to match latest entry.
    const p = getProfile();
    p.weight_kg = kg;
    setProfile(p);
    await renderWeightHistory();
    await renderDashboard();
    weightDialog.close();
  } catch (err) { console.error('[weight]', err); }
});

async function renderWeightHistory() {
  const ul = $('w-history');
  if (!ul) return;
  const all = await listWeight().catch(() => []);
  ul.innerHTML = '';
  if (all.length === 0) {
    const li = document.createElement('li');
    li.className = 'dash-entry-empty';
    li.textContent = t('weightNoData');
    ul.appendChild(li);
    return;
  }
  for (const w of all.slice().reverse()) {
    const li = document.createElement('li');
    li.className = 'dash-entry';
    const d = document.createElement('span');
    d.textContent = `${w.date} · ${w.weight_kg} kg${w.notes ? ' · ' + w.notes : ''}`;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'dash-entry-del';
    del.textContent = '×';
    del.addEventListener('click', async () => {
      await deleteWeight(w.id);
      await renderWeightHistory();
      await renderDashboard();
    });
    li.appendChild(d);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

// ----- Meal templates -----
const templatesBtn = $('templates-btn');
const templatesDialog = $('templates-dialog');
const tplClose = $('tpl-close');
const tplSaveToday = $('tpl-save-today');

templatesBtn?.addEventListener('click', async () => {
  await renderTemplatesList();
  templatesDialog.showModal();
});
tplClose?.addEventListener('click', (e) => { e.preventDefault(); templatesDialog.close(); });
tplSaveToday?.addEventListener('click', async () => {
  const entries = await listByDate().catch(() => []);
  if (entries.length === 0) {
    alert(t('nothingLoggedToSave'));
    return;
  }
  const name = prompt(t('templateNamePlaceholder'));
  if (!name) return;
  const saved = await saveTemplate({ name, items: entries });
  await renderTemplatesList();
  alert(t('templateSavedToast', { name: saved.name }));
});

async function renderTemplatesList() {
  const ul = $('tpl-list');
  if (!ul) return;
  const all = await listTemplates().catch(() => []);
  ul.innerHTML = '';
  if (all.length === 0) {
    const li = document.createElement('li');
    li.className = 'dash-entry-empty';
    li.textContent = t('templateEmpty');
    ul.appendChild(li);
    return;
  }
  for (const tpl of all) {
    const li = document.createElement('li');
    li.className = 'tpl-item';
    const head = document.createElement('div');
    head.className = 'tpl-head';
    const name = document.createElement('strong');
    name.textContent = tpl.name;
    const kcal = document.createElement('span');
    kcal.className = 'tpl-kcal';
    kcal.textContent = `${templateKcal(tpl)} kcal · ${tpl.items.length} items`;
    head.appendChild(name);
    head.appendChild(kcal);
    li.appendChild(head);
    const actions = document.createElement('div');
    actions.className = 'tpl-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'chip-btn accent';
    apply.textContent = t('templateApplyToday');
    apply.addEventListener('click', async () => {
      const entries = expandTemplate(tpl, todayISO());
      for (const e of entries) await putEntry(e);
      await renderDashboard();
      alert(t('templateApplyToast', { n: entries.length, plural: entries.length > 1 ? 'ies' : 'y' }));
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'chip-btn';
    del.textContent = '🗑';
    del.addEventListener('click', async () => {
      await deleteTemplate(tpl.id);
      await renderTemplatesList();
    });
    actions.appendChild(apply);
    actions.appendChild(del);
    li.appendChild(actions);
    ul.appendChild(li);
  }
}

qaSave?.addEventListener('click', async (e) => {
  e.preventDefault();
  const kcal = Number($('qa-kcal')?.value) || 0;
  if (kcal <= 0) { $('qa-kcal')?.focus(); return; }
  try {
    await logQuickAdd({
      name: $('qa-name')?.value || '',
      meal: $('qa-meal')?.value || 'snack',
      kcal,
      carbs_g: Number($('qa-carbs')?.value) || 0,
      protein_g: Number($('qa-protein')?.value) || 0,
      fat_g: Number($('qa-fat')?.value) || 0,
      sat_fat_g: Number($('qa-satfat')?.value) || 0,
      sugars_g: Number($('qa-sugars')?.value) || 0,
      salt_g: Number($('qa-salt')?.value) || 0,
    });
    quickAddDialog.close();
    await renderDashboard();
  } catch (err) {
    console.error('[quickAdd]', err);
  }
});

clearTodayBtn?.addEventListener('click', async () => {
  await clearDate();
  await renderDashboard();
});

function pctClass(pct) {
  if (pct >= 100) return 'over';
  if (pct >= 80) return 'near';
  return 'ok';
}

async function renderDashboard() {
  const profile = getProfile();
  const targets = dailyTargets(profile);
  const entries = await listByDate().catch(() => []);
  const totals = await dailyTotals().catch(() => null);
  if (!totals) { hide(dashboardEl); return; }

  if (totals.count === 0 && !targets) { hide(dashboardEl); return; }

  dashboardDateEl.textContent = new Date().toLocaleDateString(currentLang === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  // "Remaining" line (MFP-style Remaining = Goal − Food).
  if (targets) {
    const rem = [];
    const remKcal = targets.kcal - totals.kcal;
    rem.push(`${Math.round(remKcal)} kcal`);
    if (targets.free_sugars_g_max > 0) rem.push(`${round1(targets.free_sugars_g_max - totals.sugars_g)} g ${t('dashSugars').toLowerCase()}`);
    if (targets.salt_g_max > 0) rem.push(`${round3(targets.salt_g_max - totals.salt_g)} g ${t('dashSalt').toLowerCase()}`);
    dashboardRemainingEl.textContent = `${t('dashRemaining')} : ${rem.join(' · ')}`;
    show(dashboardRemainingEl);
  } else {
    hide(dashboardRemainingEl);
  }

  await renderWeightSummary(profile);

  const rows = [
    { key: 'dashKcal',    value: totals.kcal,       target: targets?.kcal,              unit: 'kcal' },
    { key: 'dashCarbs',   value: totals.carbs_g,    target: targets?.carbs_g_target,    unit: 'g' },
    { key: 'dashProtein', value: totals.protein_g,  target: targets?.protein_g_target,  unit: 'g' },
    { key: 'dashFat',     value: totals.fat_g,      target: targets?.fat_g_target,      unit: 'g' },
    { key: 'dashSatFat',  value: totals.sat_fat_g,  target: targets?.sat_fat_g_max,     unit: 'g' },
    { key: 'dashSugars',  value: totals.sugars_g,   target: targets?.free_sugars_g_max, unit: 'g' },
    { key: 'dashSalt',    value: totals.salt_g,     target: targets?.salt_g_max,        unit: 'g' },
  ];

  dashboardRows.innerHTML = '';
  for (const row of rows) {
    const li = document.createElement('li');
    li.className = 'dash-row';
    const label = document.createElement('span');
    label.className = 'dash-label';
    label.textContent = t(row.key);
    const bar = document.createElement('span');
    bar.className = 'dash-bar';
    const fill = document.createElement('span');
    fill.className = 'dash-fill';
    let pct = 0;
    if (row.target && row.target > 0) {
      pct = Math.min(200, (row.value / row.target) * 100);
      fill.style.width = `${Math.min(100, pct)}%`;
      fill.dataset.state = pctClass(pct);
    } else {
      fill.style.width = '0%';
    }
    bar.appendChild(fill);
    const val = document.createElement('strong');
    val.className = 'dash-value';
    if (row.target) {
      val.textContent = `${row.value} / ${row.target} ${row.unit} (${Math.round(pct)} %)`;
    } else {
      val.textContent = `${row.value} ${row.unit}`;
    }
    li.appendChild(label);
    li.appendChild(bar);
    li.appendChild(val);
    dashboardRows.appendChild(li);
  }

  // Per-meal entry list
  dashboardEntries.innerHTML = '';
  if (entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'dash-entry-empty';
    p.textContent = t('dashEmpty');
    dashboardEntries.appendChild(p);
    hide(dashboardLog);
  } else {
    const grouped = groupByMeal(entries);
    const mealLabels = {
      breakfast: t('mealBreakfast'),
      lunch: t('mealLunch'),
      dinner: t('mealDinner'),
      snack: t('mealSnack'),
    };
    for (const m of MEALS) {
      const bucket = grouped[m];
      if (bucket.entries.length === 0) continue;
      const section = document.createElement('section');
      section.className = 'meal-section';
      const header = document.createElement('div');
      header.className = 'meal-header';
      const name = document.createElement('strong');
      name.textContent = mealLabels[m];
      const kcal = document.createElement('span');
      kcal.className = 'meal-kcal';
      kcal.textContent = `${Math.round(bucket.totals.kcal)} kcal`;
      header.appendChild(name);
      header.appendChild(kcal);
      section.appendChild(header);
      const ul = document.createElement('ul');
      ul.className = 'meal-entries';
      for (const e of bucket.entries.slice().sort((a, b) => b.timestamp - a.timestamp)) {
        const li = document.createElement('li');
        li.className = 'dash-entry';
        const nm = document.createElement('span');
        nm.className = 'dash-entry-name';
        nm.textContent = e.quickAdd
          ? `${e.product_name} · ${t('quickAdd')}`
          : `${e.product_name} · ${e.grams} g`;
        const k = document.createElement('strong');
        k.textContent = `${Math.round(e.kcal)} kcal`;
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'dash-entry-del';
        del.setAttribute('aria-label', t('deleteEntry'));
        del.textContent = '×';
        del.addEventListener('click', async () => {
          await deleteEntry(e.id);
          await renderDashboard();
        });
        li.appendChild(nm);
        li.appendChild(k);
        li.appendChild(del);
        ul.appendChild(li);
      }
      section.appendChild(ul);
      dashboardEntries.appendChild(section);
    }
    // Diary Complete chip: something logged in each of the 3 main meals.
    const main3 = ['breakfast', 'lunch', 'dinner']
      .every((k) => grouped[k].entries.length > 0);
    if (main3) {
      const chip = document.createElement('p');
      chip.className = 'diary-complete';
      chip.textContent = t('diaryComplete');
      dashboardEntries.appendChild(chip);
    }
    show(dashboardLog);
  }

  show(dashboardEl);
}

function round1(x) { return Math.round(x * 10) / 10; }
function round3(x) { return Math.round(x * 1000) / 1000; }

async function renderWeightSummary(profile) {
  const el = $('weight-summary');
  if (!el) return;
  const entries = await listWeight().catch(() => []);
  if (entries.length === 0) { hide(el); return; }
  const s = summarizeWeight(entries, 30);
  const trend = weeklyTrend(entries.slice(-10));
  el.innerHTML = '';
  const parts = [];
  parts.push(`<strong>${s.latest_kg} kg</strong> · ${t('weightCurrent')}`);
  if (profile?.goal_weight_kg) {
    const toGo = round1(s.latest_kg - profile.goal_weight_kg);
    parts.push(`🎯 ${profile.goal_weight_kg} kg (${toGo > 0 ? '+' : ''}${toGo} kg)`);
  }
  if (s.recent_count >= 2) {
    const sign = s.delta_kg > 0 ? '+' : '';
    parts.push(`Δ 30 j : ${sign}${s.delta_kg} kg`);
  }
  if (trend !== 0 && Number.isFinite(trend)) {
    const sign = trend > 0 ? '+' : '';
    parts.push(`${t('weightTrend')} : ${sign}${trend} kg/sem`);
  }
  el.innerHTML = parts.map((p) => `<span>${p}</span>`).join(' · ');
  show(el);
}

renderQueue();
updatePendingBanner();
renderRecentScans();
renderDashboard();
maybeShowOnboarding();
