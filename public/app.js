import { t, setLang, currentLang, applyStaticTranslations } from '/i18n.js';
import { explainFlag } from '/explanations.js';
import { enqueue, listPending, remove as removePending, countPending } from '/queue-store.js';
import { saveScan, listScans, deleteScan, clearScans, findScanByBarcode } from '/scan-history.js';
import { buildBackup, restoreBackup } from '/backup.js';
import { detectAllergens } from '/allergens.js';
import {
  getProfile, setProfile, hasMinimalProfile,
  bmrMifflinStJeor, tdeeKcal, bmi, bmiCategory, dailyTargets,
} from '/profile.js';
import { computePersonalScore, personalGrade } from '/personal-score.js';
import { logEntry, logQuickAdd, listByDate, listAllEntries, deleteEntry, clearDate, dailyTotals, todayISO, groupByMeal, MEALS, putEntry } from '/consumption.js';
import { logWeight, listWeight, deleteWeight, summarize as summarizeWeight, weeklyTrend } from '/weight-log.js';
import { saveTemplate, listTemplates, deleteTemplate, expandTemplate, templateKcal } from '/meal-templates.js';
import { saveRecipe, listRecipes, deleteRecipe, aggregateRecipe } from '/recipes.js';
import { computeConfidence, snapshotFromData, timeAgoBucket, defaultMealForHour, logStreakDays, parseVoiceQuickAdd, waterGoalMl, weeklyRollup, fastingStatus, buildLineChartPath, laplacianVariance, sharpnessVerdict, entriesToDailyCSV, nextOccurrenceMs } from '/presenters.js';
import { checkDiet } from '/diets.js';

// Safari private mode + some embedded WebViews disable localStorage writes
// (getItem returns null silently, but setItem/removeItem throw). Shim the
// writers so the whole app degrades gracefully instead of crashing on the
// first preference change. Reads are already safe — they just return null.
try {
  const _set = Storage.prototype.setItem;
  const _rem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    try { return _set.call(this, k, v); } catch { /* quota / disabled */ }
  };
  Storage.prototype.removeItem = function (k) {
    try { return _rem.call(this, k); } catch { /* disabled */ }
  };
} catch { /* Storage.prototype missing — nothing to protect */ }

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

/**
 * Lightweight non-blocking toast. Announces to screen readers via role=status
 * and auto-removes after a short delay. Prefer this over alert() inside the
 * PWA — native alert() on Android steals focus, breaks the read-aloud flow,
 * and looks foreign compared to the rest of the UI.
 */
let toastEl = null;
let toastTimer = null;
function toast(text, ms = 2600) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'app-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = String(text);
  toastEl.dataset.visible = 'true';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.dataset.visible = 'false';
  }, ms);
}

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

    // Sharpness probe on a 64×64 luma thumbnail. Lets the caller warn the
    // user before burning an LLM call on a blurry frame.
    let sharpness = null;
    try {
      const S = 64;
      const probe = document.createElement('canvas');
      probe.width = S; probe.height = S;
      const pctx = probe.getContext('2d');
      pctx.drawImage(img, 0, 0, S, S);
      const { data } = pctx.getImageData(0, 0, S, S);
      const luma = new Array(S * S);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        // Rec. 601 luma
        luma[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const v = laplacianVariance(luma, S);
      sharpness = { variance: v, verdict: sharpnessVerdict(v) };
    } catch { /* best-effort — never block compression on the probe */ }

    return { dataUrl, base64: dataUrl.slice(comma + 1), mime: 'image/jpeg', sharpness };
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
      remove.setAttribute('aria-label', t('removePhoto'));
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
  let blurryCount = 0;
  for (const file of files) {
    try {
      const barcode = await detectBarcodeFromFile(file);
      const compressed = await compressImage(file);
      if (compressed.sharpness?.verdict === 'blurry' && !barcode) blurryCount++;
      queue.push({ id: crypto.randomUUID(), ...compressed, barcode });
      renderQueue();
    } catch (err) {
      errorEl.textContent = err.message; show(errorEl);
    }
  }
  // Soft warning — don't block the scan (user might know better), just
  // hint that re-shooting might help. Only fires when none of the added
  // frames have a barcode (barcode scans don't need pixel-sharp ingredient
  // text).
  if (blurryCount > 0) {
    toast(t('blurryPhotoWarning'));
  }
}

function addBarcodeOnly(barcode) {
  // Inline SVG placeholder for the queue thumbnail when the user arrived
  // via the barcode scanner (no actual photo to show). Palette matches
  // the coral redesign (--panel + --text), not the retired dark-green.
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">' +
      '<rect width="60" height="60" fill="#1B1B1F"/>' +
      '<text x="30" y="40" text-anchor="middle" fill="#F5F0E8" font-size="28">📦</text>' +
      '</svg>'
    );
  queue.push({
    id: crypto.randomUUID(),
    dataUrl: placeholder,
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
  if (payload.length === 0) throw new Error(t('errNoPhotos'));
  if (!key) throw new Error(t('errMissingKey'));
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

  // "Progressive" status: real streaming of the LLM response is a bigger
  // refactor. In the meantime, cycle the status line through the phases a
  // real progressive parser would report — ingredients → nutrition →
  // scoring — so the user sees motion instead of one long spinner.
  let phaseTimer = null;
  if (!bc) {
    const phases = [t('phaseIngredients'), t('phaseNutrition'), t('phaseScoring')];
    let idx = 0;
    phaseTimer = setInterval(() => {
      statusText.textContent = phases[idx % phases.length];
      idx++;
    }, 1500);
  }

  const mode = getMode();
  try {
    let data;
    // Barcode cache: if the user has scanned this exact EAN/UPC before, hand
    // back the stored snapshot instead of round-tripping OFF + LLM. Makes
    // re-scans sub-100ms and saves API quota / OFF bandwidth.
    if (bc) {
      try {
        const cached = await findScanByBarcode(bc);
        if (cached?.snapshot) {
          data = { ...cached.snapshot, source: cached.snapshot.source || 'cache' };
        }
      } catch { /* cache is an optimization — never block scan on it */ }
    }
    if (!data) {
      if (mode === 'direct') data = await scanViaDirect();
      else if (mode === 'server') data = await scanViaServer();
      else {
        try { data = await scanViaServer(); }
        catch (err) {
          if (getKey()) { statusText.textContent = t('serverUnavailable'); data = await scanViaDirect(); }
          else throw err;
        }
      }
    }
    if (phaseTimer) { clearInterval(phaseTimer); phaseTimer = null; }
    hide(statusEl);
    lastData = data;
    maybeRenderComparison(data);
    renderAudit(data);
    renderIngredients(data.product);
    renderNutrition(data.product);
    show(resultEl);
    persistToHistory(data);
  } catch (err) {
    if (phaseTimer) { clearInterval(phaseTimer); phaseTimer = null; }
    hide(statusEl);
    console.error('[scan] failed', err);
    // navigator.onLine is the primary signal. The regex is a secondary probe
    // on the error message: cover EN phrasing (Chrome, Safari) + FR phrasing
    // ("Échec du réseau", "Impossible de charger") so French users also hit
    // the offline-queue fallback instead of a generic error.
    const isNet = !navigator.onLine
      || /network|failed to fetch|load failed|[eé]chec du r[eé]seau|impossible de charger/i.test(err.message);
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
  try {
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
  } catch (err) {
    // IDB read failed (quota / versionchange / browser shutdown). The banner
    // will repaint empty next tick and the user can still add new scans.
    console.warn('[retryPending] aborted', err);
  }
  await updatePendingBanner().catch(() => { /* banner is non-critical */ });
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

  // Suggest "similar but better" alternatives for mediocre scans or veto'd
  // products. Fire-and-forget — never block the main render on a network
  // call; the section reveals itself when ready.
  maybeRenderAlternatives(data).catch(() => { /* non-critical */ });

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

  // Eco-score chip — only populated for OFF-sourced products where OFF has
  // computed one. Purely informational; not part of our own scoring.
  const ecoEl = $('result-ecoscore');
  const ecoGrade = data.product?.ecoscore_grade;
  if (ecoEl) {
    if (ecoGrade && /^[a-e]$/.test(ecoGrade)) {
      ecoEl.dataset.eco = ecoGrade;
      ecoEl.textContent = t('ecoscoreChip', { grade: ecoGrade.toUpperCase() });
      ecoEl.title = t('ecoscoreTooltip');
      show(ecoEl);
    } else {
      hide(ecoEl);
    }
  }

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
    const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
    const li = document.createElement('li');
    li.className = 'pillar-row pillar-clickable';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pillar-label';
    labelSpan.textContent = String(label);

    const bar = document.createElement('span');
    bar.className = 'pillar-bar';
    const fill = document.createElement('span');
    fill.className = 'pillar-bar-fill';
    fill.style.width = `${safePct}%`;
    bar.appendChild(fill);

    const value = document.createElement('strong');
    value.className = 'pillar-value';
    value.textContent = `${pillar.score} / ${pillar.max}`;

    li.appendChild(labelSpan);
    li.appendChild(bar);
    li.appendChild(value);
    makeActivatable(li, () => openPillarDialog(label, pillar));
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
  // Defensive against older saved snapshots where ingredients / nutrition
  // might be missing from the persisted shape.
  const ings = data.product?.ingredients ?? [];
  const n = data.product?.nutrition ?? {};
  const sparse =
    ings.length === 0 ||
    ((n.energy_kcal ?? 0) === 0 && (n.protein_g ?? 0) === 0);
  if (sparse && data.source !== 'openfoodfacts') {
    el.textContent = t('sparseData');
    show(el);
  } else hide(el);
}

/**
 * "Similar but better" alternatives. Surfaces compliant + higher-scoring
 * products from the same OFF category when the current scan is either:
 *   - graded C/D/F (mediocre)
 *   - veto'd by the user's diet
 *
 * Silently no-ops on any failure path (no category tag available, network
 * failure, no alternatives found) — the suggestion section is decorative.
 */
async function maybeRenderAlternatives(data) {
  const section = $('alternatives');
  const list = $('alternatives-list');
  if (!section || !list) return;
  hide(section);
  list.textContent = '';

  const { audit, product } = data;
  const profile = getProfile();
  const isVeto = computePersonalScore(audit, product, profile, currentLang)?.veto;
  const poor = ['C', 'D', 'F'].includes(audit.grade);
  if (!poor && !isVeto) return;

  try {
    const { searchOFFByCategory, rankAlternatives, suggestionTagFor } = await loadEngine();
    const tag = suggestionTagFor(audit.category);
    if (!tag) return;

    const candidates = await searchOFFByCategory([tag], { pageSize: 20 });
    if (candidates.length === 0) return;

    const dietFilter = profile?.diet && profile.diet !== 'none'
      ? (p) => checkDiet(p, profile.diet, profile.custom_diet, currentLang).compliant
      : undefined;
    const alts = rankAlternatives(product, candidates, { max: 3, dietFilter });
    if (alts.length === 0) return;

    for (const { product: alt, audit: altAudit } of alts) {
      const li = document.createElement('li');
      li.className = 'alt-item';
      const grade = document.createElement('span');
      grade.className = 'alt-grade';
      grade.dataset.grade = altAudit.grade;
      grade.textContent = altAudit.grade;
      const meta = document.createElement('div');
      meta.className = 'alt-meta';
      const name = document.createElement('strong');
      name.className = 'alt-name';
      name.textContent = alt.name;
      const score = document.createElement('small');
      score.className = 'alt-score';
      score.textContent = `${altAudit.score} / 100`;
      meta.appendChild(name);
      meta.appendChild(score);
      li.appendChild(grade);
      li.appendChild(meta);
      list.appendChild(li);
    }
    show(section);
  } catch { /* no-op */ }
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
    const rawPct = Number(ing.percentage);
    const safePct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0;
    const pct = document.createElement('span');
    pct.className = 'ing-pct';
    const bar = document.createElement('span');
    bar.className = 'ing-pct-bar';
    const fill = document.createElement('span');
    fill.className = 'ing-pct-fill';
    fill.style.width = `${safePct}%`;
    bar.appendChild(fill);
    const val = document.createElement('span');
    val.className = 'ing-pct-val';
    val.textContent = `${Number.isFinite(rawPct) ? rawPct : '?'}%`;
    pct.appendChild(bar);
    pct.appendChild(val);
    li.appendChild(pct);
  }

  if (ing.category === 'additive') li.classList.add('additive');
  if (info) {
    li.classList.add('explainable');
    makeActivatable(li, () => {
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

/** Make a clickable <li> also keyboard-activatable.
 *  Enter and Space open the same callback the click handler fires. */
function makeActivatable(el, onActivate) {
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('click', onActivate);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  });
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
    makeActivatable(li, () => openExplanation(item));
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
        name: lastData.audit.product_name || t('productFallbackName'),
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
  // Escape key also closes the dialog — mark as onboarded so the user isn't
  // shown the same intro every reload after choosing to dismiss it.
  const onClose = () => {
    localStorage.setItem(LS_ONBOARDED, '1');
    obDialog.removeEventListener('close', onClose);
  };
  obDialog.addEventListener('close', onClose);
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
  profileDerivedList.innerHTML = '';
  for (const [k, v] of rows) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = String(k);
    const strong = document.createElement('strong');
    strong.textContent = String(v);
    li.appendChild(span);
    li.appendChild(strong);
    profileDerivedList.appendChild(li);
  }
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

/**
 * Downscale a data-URL to a square JPEG thumbnail. Keeps IDB records tiny
 * so even 30 scans × 30 dashboard renders feel instant and stay well clear
 * of the browser quota. Returns the original if anything fails — safer to
 * waste a few KB than to lose the reference image.
 */
async function makeThumbnail(dataUrl, size = 96) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return '';
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('thumbnail decode failed'));
      i.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // Cover-crop: fill the square, crop overflow so the result is a uniform
    // tile regardless of the source aspect ratio.
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return dataUrl; // fall back — original is still valid
  }
}

async function persistToHistory(data) {
  const raw = queue.find((q) => q.dataUrl && q.dataUrl.startsWith('data:image'))?.dataUrl
    ?? '';
  try {
    const thumb = raw ? await makeThumbnail(raw, 96) : '';
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
  } catch (err) {
    // History is a convenience surface — never fail the scan flow because
    // we couldn't persist the snapshot. Quota-recovery already tried once.
    console.warn('[history] persist failed', err);
  }
}

function timeAgo(ts) {
  const b = timeAgoBucket(Date.now() - ts);
  if (b.kind === 'justNow') return t('justNow');
  if (b.kind === 'minutes') return t('minutesAgo', { n: b.n });
  if (b.kind === 'hours') return t('hoursAgo', { n: b.n });
  return t('daysAgo', { n: b.n });
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
      img.src = item.thumbnail;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 48;
      img.height = 48;
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
  // Hint about hidden entries — users otherwise can't tell the export
  // includes items not shown in the list.
  if (items.length > 12) {
    const hint = document.createElement('li');
    hint.className = 'recent-overflow';
    hint.textContent = t('recentOverflow', { shown: 12, total: items.length });
    recentListEl.appendChild(hint);
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
  // Respect prefers-reduced-motion + the in-app motion preference so the
  // screen doesn't lurch for users sensitive to smooth-scroll animations.
  const reduced = document.body.classList.contains('reduce-motion')
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  resultEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
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
  try {
    const [cur, latest] = await Promise.all([currentCommit(), latestRelease()]);
    if (!cur || !latest || latest.commit === cur) return;
    if (localStorage.getItem(LS_DISMISSED_VERSION) === latest.tag) return;
    updateVersionEl.textContent = latest.tag;
    updateInstallBtn.setAttribute('href', latest.apkUrl);
    show(updateBanner);
  } catch {
    // Network unavailable / GitHub rate limit / CDN issue — silently skip.
    // Called from setInterval + visibilitychange without await, so a reject
    // here would otherwise surface as an unhandled promise rejection.
  }
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
function resetScanState() {
  queue.length = 0; fileInput.value = '';
  // Clear lingering scan state so compare-next can't re-arm an old product.
  lastData = null;
  renderQueue();
  hide(resultEl);
  hide(errorEl);
  hide(comparisonEl);
}
resetBtn.addEventListener('click', () => { resetScanState(); });

// "Scanner un autre" — batch-mode shortcut that resets + reopens the
// barcode camera in a single tap. Only shown when BarcodeDetector is
// available (same gate as the main capture-screen barcode button).
const resetCameraBtn = $('reset-camera-btn');
if (getBarcodeDetector()) show(resetCameraBtn);
resetCameraBtn?.addEventListener('click', () => {
  resetScanState();
  openCameraScanner();
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
// Tear down the MediaStream + detection loop regardless of how the dialog
// closes — Escape key, backdrop click, or programmatic close from a
// successful barcode scan all fire the 'close' event.
cameraDialog?.addEventListener('close', () => closeCameraScanner());

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
  // Reminder prefs
  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    const cb = $(`reminder-${meal}`);
    const tm = $(`reminder-${meal}-time`);
    if (cb) cb.checked = localStorage.getItem(`scanneat.reminder.${meal}.on`) === '1';
    if (tm) {
      const stored = localStorage.getItem(`scanneat.reminder.${meal}.time`);
      if (stored) tm.value = stored;
    }
  }
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
  // Reminder prefs
  let anyRemindersOn = false;
  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    const cb = $(`reminder-${meal}`);
    const tm = $(`reminder-${meal}-time`);
    const on = !!cb?.checked;
    if (on) anyRemindersOn = true;
    localStorage.setItem(`scanneat.reminder.${meal}.on`, on ? '1' : '0');
    if (tm?.value) localStorage.setItem(`scanneat.reminder.${meal}.time`, tm.value);
  }
  // If at least one reminder is newly on, request Notification permission
  // (noop if already granted). Fire-and-forget.
  if (anyRemindersOn && typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch { /* noop */ }
  }
  scheduleReminders(); // re-evaluate next-trigger times
  setLang(langSelect.value);
  applyTheme();
  applyReadingPrefs();
  settingsDialog.close();
  applyStaticTranslations();
});
settingsCancel?.addEventListener('click', (e) => { e.preventDefault(); settingsDialog.close(); });

// ----- Backup / restore -----
function setBackupStatus(text, state) {
  const el = $('backup-status');
  if (!el) return;
  if (!text) { hide(el); return; }
  el.textContent = text;
  if (state) el.dataset.state = state;
  else delete el.dataset.state;
  show(el);
}
$('backup-export')?.addEventListener('click', async () => {
  try {
    const payload = await buildBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `scanneat-backup-${date}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setBackupStatus(t('backupExported'));
  } catch (err) {
    console.error('[backup export]', err);
    setBackupStatus(err.message || String(err), 'error');
  }
});
$('csv-export')?.addEventListener('click', async () => {
  try {
    const all = await listAllEntries().catch(() => []);
    const csv = entriesToDailyCSV(all);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `scanneat-totals-${date}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    const days = new Set(all.map((e) => e.date).filter(Boolean)).size;
    setBackupStatus(t('csvExported', { days }));
  } catch (err) {
    console.error('[csv export]', err);
    setBackupStatus(err.message || String(err), 'error');
  }
});

$('backup-import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await restoreBackup(data);
    const counts =
      (data.history?.length || 0) + (data.consumption?.length || 0) +
      (data.weight?.length || 0) + (data.templates?.length || 0) +
      (data.recipes?.length || 0);
    setBackupStatus(t('backupImported', { items: counts }));
    await renderRecentScans();
    await renderDashboard();
  } catch (err) {
    console.error('[backup import]', err);
    const msg =
      /Scann-eat backup/i.test(err.message) ? t('backupInvalid')
      : /newer than this version/i.test(err.message) ? t('backupTooNew')
      : err.message || String(err);
    setBackupStatus(msg, 'error');
  }
});

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

// ---------- PWA share_target receiver ----------
// The manifest declares Scann-eat as a share target for image/*. When the
// user picks "Share → Scann-eat" from another app, the SW receives the POST,
// stashes the files, and redirects us here with ?shared=1. Pull the files
// from the SW via a MessageChannel and feed them straight into the capture
// queue — zero-click scan from the gallery.
(async () => {
  if (!new URLSearchParams(location.search).has('shared')) return;
  history.replaceState({}, '', '/'); // clean the URL immediately
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg?.active) return;
    const files = await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (ev) => resolve(ev.data);
      reg.active.postMessage('shared-files?', [channel.port2]);
      setTimeout(() => resolve(null), 1500); // don't hang forever
    });
    if (files && files.length > 0) await addFiles(files);
  } catch { /* non-critical */ }
})();
if (compareArmed()) {
  compareNextBtn?.setAttribute('disabled', 'true');
  if (compareNextBtn) compareNextBtn.textContent = t('compareWaiting');
}

// ---------- PWA dynamic-shortcut intents ----------
// Manifest declares shortcuts that launch the app with ?intent=... on
// Android's long-press menu. Route each intent to its existing UI action.
(() => {
  const intent = new URLSearchParams(location.search).get('intent');
  if (!intent) return;
  history.replaceState({}, '', '/'); // clean URL so reload doesn't re-fire
  // Defer slightly so the main UI has finished mounting.
  setTimeout(() => {
    if (intent === 'scan') {
      if (getBarcodeDetector()) openCameraScanner();
      else fileInput?.click();
    } else if (intent === 'quick-add') {
      quickAddBtn?.click();
    } else if (intent === 'dashboard') {
      document.body.classList.add('returning-user');
      $('daily-dashboard')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, 50);
})();

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
  // Default meal matches time-of-day (same logic as Quick Add) so a user
  // scanning a product at 8am sees "breakfast" pre-selected, not "snack".
  if (portionMealSelect) {
    portionMealSelect.value = defaultMealForHour(new Date().getHours());
  }
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
  // Shared-meal scaling: if the user says they only ate e.g. 50% of the
  // portion, downscale grams before logging. buildEntry() multiplies per-
  // 100g macros by grams/100, so scaling grams scales the whole entry.
  const sharePct = Math.max(1, Math.min(100, Number($('portion-share-pct')?.value) || 100));
  const effectiveGrams = Math.round(grams * (sharePct / 100));
  try {
    const entry = await logEntry(lastData.product, effectiveGrams, meal);
    logToast.textContent = t('logged', { grams: effectiveGrams, kcal: Math.round(entry.kcal) });
    show(logToast);
    await renderDashboard();
  } catch (err) {
    console.error('[log]', err);
  }
});

// Share-preset chips — write the selected % into the input.
document.querySelectorAll('.share-presets [data-share]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const v = Number(btn.dataset.share);
    const input = $('portion-share-pct');
    if (input) input.value = String(v);
  });
});

// ----- Quick Add -----
quickAddBtn?.addEventListener('click', () => {
  // reset fields
  for (const id of ['qa-name', 'qa-kcal', 'qa-carbs', 'qa-protein', 'qa-fat', 'qa-satfat', 'qa-sugars', 'qa-salt']) {
    const el = $(id);
    if (el) el.value = '';
  }
  // pick a default meal by time-of-day
  if ($('qa-meal')) $('qa-meal').value = defaultMealForHour(new Date().getHours());
  quickAddDialog.showModal();
});
qaCancel?.addEventListener('click', (e) => { e.preventDefault(); quickAddDialog.close(); });

// ----- Voice-dictate for Quick Add -----
// Uses the Web Speech API. Desktop Safari/Chrome + Android Chrome are the
// widely-supported targets; on Firefox the button stays hidden.
const SpeechRecognitionImpl =
  globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const qaVoiceBtn = $('qa-voice-btn');
let qaRecognizer = null;

if (SpeechRecognitionImpl && qaVoiceBtn) {
  show(qaVoiceBtn);
  qaVoiceBtn.addEventListener('click', () => {
    // Toggle: if already listening, stop.
    if (qaRecognizer) { try { qaRecognizer.stop(); } catch { /* ignore */ } return; }
    try {
      const rec = new SpeechRecognitionImpl();
      rec.lang = currentLang === 'en' ? 'en-US' : 'fr-FR';
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        qaVoiceBtn.dataset.state = 'listening';
        qaVoiceBtn.querySelector('.label').textContent = t('voiceListening');
      };
      rec.onresult = (ev) => {
        const transcript = Array.from(ev.results)
          .map((r) => r[0]?.transcript || '')
          .join(' ')
          .trim();
        if (!transcript) return;
        // Parse the transcript into field candidates and only overwrite
        // fields the parser actually recognized, so a partial utterance
        // doesn't wipe values the user already typed.
        const parsed = parseVoiceQuickAdd(transcript);
        const setField = (id, v) => {
          const el = $(id);
          if (el && v != null) el.value = String(v);
        };
        setField('qa-name',    parsed.name);
        setField('qa-kcal',    parsed.kcal);
        setField('qa-protein', parsed.protein_g);
        setField('qa-carbs',   parsed.carbs_g);
        setField('qa-fat',     parsed.fat_g);
      };
      rec.onerror = () => { /* handled by onend */ };
      rec.onend = () => {
        delete qaVoiceBtn.dataset.state;
        qaVoiceBtn.querySelector('.label').textContent = t('voiceDictate');
        qaRecognizer = null;
      };
      qaRecognizer = rec;
      rec.start();
    } catch { qaRecognizer = null; }
  });
}

// ----- Photo-to-food identification for Quick Add -----
// Complements voice dictation with image recognition: the user snaps a
// plate / fresh fruit / bakery item, we hit /api/identify, and the dialog
// pre-fills with the estimated name + macros.
const qaPhotoInput = $('qa-photo-input');
const qaAiStatus = $('qa-ai-status');

function setQaStatus(text, state) {
  if (!qaAiStatus) return;
  if (!text) { hide(qaAiStatus); return; }
  qaAiStatus.textContent = text;
  if (state) qaAiStatus.dataset.state = state;
  else delete qaAiStatus.dataset.state;
  show(qaAiStatus);
}

qaPhotoInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = ''; // allow re-selecting the same file
  if (!file) return;
  setQaStatus(t('identifyingFood'));
  try {
    const compressed = await compressImage(file);
    const mode = getMode();
    let result;
    if (mode === 'direct') {
      // Direct mode: call Groq from the client using the user's own key.
      const { identifyFood } = await loadEngine();
      const key = getKey();
      if (!key) throw new Error(t('errMissingKey'));
      result = await identifyFood(
        [{ base64: compressed.base64, mime: compressed.mime }],
        { apiKey: key },
      );
    } else {
      // Server mode: go through /api/identify which holds the server-side
      // GROQ_API_KEY.
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [{ base64: compressed.base64, mime: compressed.mime }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    }
    // Populate the form from the identified food.
    const setField = (id, v) => { const el = $(id); if (el && v != null) el.value = String(v); };
    setField('qa-name',    result.name);
    setField('qa-kcal',    Math.round(result.kcal));
    setField('qa-protein', Math.round(result.protein_g));
    setField('qa-carbs',   Math.round(result.carbs_g));
    setField('qa-fat',     Math.round(result.fat_g));
    if (result.confidence === 'low') {
      setQaStatus(t('identifyLowConfidence'), 'warn');
    } else {
      hide(qaAiStatus);
    }
  } catch (err) {
    console.warn('[identifyFood]', err);
    setQaStatus(t('identifyFailed'), 'error');
  }
});

// Multi-item plate: identify all foods in one shot, write each as a
// separate Quick Add entry. Closes the Quick Add dialog on success.
$('qa-photo-multi-input')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  setQaStatus(t('identifyingFood'));
  try {
    const compressed = await compressImage(file);
    const mode = getMode();
    let result;
    if (mode === 'direct') {
      const { identifyMultiFood } = await loadEngine();
      const key = getKey();
      if (!key) throw new Error(t('errMissingKey'));
      result = await identifyMultiFood(
        [{ base64: compressed.base64, mime: compressed.mime }],
        { apiKey: key },
      );
    } else {
      const res = await fetch('/api/identify-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [{ base64: compressed.base64, mime: compressed.mime }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      result = await res.json();
    }
    const items = Array.isArray(result?.items) ? result.items : [];
    if (items.length === 0) {
      setQaStatus(t('identifyMultiEmpty'), 'warn');
      return;
    }
    const meal = $('qa-meal')?.value || defaultMealForHour(new Date().getHours());
    for (const it of items) {
      await logQuickAdd({
        name: it.name,
        meal,
        kcal: Math.round(it.kcal) || 0,
        protein_g: Math.round(it.protein_g) || 0,
        carbs_g: Math.round(it.carbs_g) || 0,
        fat_g: Math.round(it.fat_g) || 0,
        sat_fat_g: 0,
        sugars_g: 0,
        salt_g: 0,
      });
    }
    quickAddDialog?.close();
    await renderDashboard();
    toast(t('identifyMultiToast', { n: items.length }));
  } catch (err) {
    console.warn('[identifyMultiFood]', err);
    setQaStatus(t('identifyFailed'), 'error');
  }
});

// Reset AI status when the dialog opens (via the quick-add button).
quickAddBtn?.addEventListener('click', () => hide(qaAiStatus));

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
    del.setAttribute('aria-label', t('deleteWeightEntry'));
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
  // Open the dialog first, then render. If the IDB read fails, the user
  // still sees the dialog with an empty list instead of a dead button.
  templatesDialog.showModal();
  try { await renderTemplatesList(); }
  catch (err) { console.warn('[templates] render failed', err); }
});
tplClose?.addEventListener('click', (e) => { e.preventDefault(); templatesDialog.close(); });
const tplNameDialog = $('tpl-name-dialog');
const tplNameInput = $('tpl-name-input');
const tplNameConfirm = $('tpl-name-confirm');
const tplNameCancel = $('tpl-name-cancel');

/** Promise-based name prompt that opens a styled dialog instead of the
 *  blocking native prompt(). Resolves to the typed name or null on cancel. */
function askTemplateName() {
  if (!tplNameDialog || !tplNameInput) return Promise.resolve(null);
  tplNameInput.value = '';
  tplNameInput.placeholder = t('templateNamePlaceholder');
  tplNameDialog.showModal();
  tplNameInput.focus();
  return new Promise((resolve) => {
    const cleanup = () => {
      tplNameConfirm?.removeEventListener('click', onConfirm);
      tplNameCancel?.removeEventListener('click', onCancel);
      tplNameDialog.removeEventListener('close', onClose);
    };
    const onConfirm = (e) => {
      e.preventDefault();
      const name = tplNameInput.value.trim();
      // Cleanup BEFORE close — dialog.close() fires the 'close' event
      // synchronously, so onClose would otherwise run first and resolve
      // the promise with null before we get to resolve with the name.
      cleanup();
      tplNameDialog.close();
      resolve(name || null);
    };
    const onCancel = (e) => {
      e.preventDefault();
      cleanup();
      tplNameDialog.close();
      resolve(null);
    };
    const onClose = () => { cleanup(); resolve(null); };
    tplNameConfirm?.addEventListener('click', onConfirm);
    tplNameCancel?.addEventListener('click', onCancel);
    tplNameDialog.addEventListener('close', onClose);
  });
}

tplSaveToday?.addEventListener('click', async () => {
  const entries = await listByDate().catch(() => []);
  if (entries.length === 0) {
    toast(t('nothingLoggedToSave'));
    return;
  }
  const name = await askTemplateName();
  if (!name) return;
  const saved = await saveTemplate({ name, items: entries });
  await renderTemplatesList();
  toast(t('templateSavedToast', { name: saved.name }));
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
      toast(t('templateApplyToast', { n: entries.length, plural: entries.length > 1 ? 'ies' : 'y' }));
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'chip-btn';
    del.textContent = '🗑';
    del.setAttribute('aria-label', t('deleteTemplate'));
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

// ============================================================================
// Recipes — multi-component dishes that log as ONE aggregated entry.
// ============================================================================

const recipesBtn = $('recipes-btn');
const recipesDialog = $('recipes-dialog');
const recipesCloseBtn = $('recipes-close');
const recipesListEl = $('recipes-list');
const recipeNewBtn = $('recipe-new-btn');

const recipeEditDialog = $('recipe-edit-dialog');
const recipeEditName = $('recipe-edit-name');
const recipeEditServings = $('recipe-edit-servings');
const recipeEditComps = $('recipe-components-list');
const recipeEditTotals = $('recipe-edit-totals');
const recipeAddCompBtn = $('recipe-add-component');
const recipeEditCancel = $('recipe-edit-cancel');
const recipeEditSave = $('recipe-edit-save');

let editingRecipe = null; // in-memory draft: { id?, name, servings, components: [] }

function newComponent() {
  return { product_name: '', grams: 0, kcal: 0, carbs_g: 0, fat_g: 0, protein_g: 0 };
}

function recalcRecipeTotals() {
  if (!recipeEditTotals) return;
  const draft = {
    name: recipeEditName?.value || '',
    components: readDraftComponentsFromDOM(),
  };
  const agg = aggregateRecipe(draft, Number(recipeEditServings?.value) || 1);
  recipeEditTotals.textContent = t('recipeTotals', {
    kcal: Math.round(agg.kcal),
    prot: Math.round(agg.protein_g),
    carb: Math.round(agg.carbs_g),
    fat:  Math.round(agg.fat_g),
    serv: Math.max(1, Math.round(Number(recipeEditServings?.value) || 1)),
  });
}

function readDraftComponentsFromDOM() {
  if (!recipeEditComps) return [];
  const rows = recipeEditComps.querySelectorAll('.recipe-component');
  return Array.from(rows).map((row) => ({
    product_name: row.querySelector('.rc-name')?.value || '',
    grams:     Number(row.querySelector('.rc-grams')?.value) || 0,
    kcal:      Number(row.querySelector('.rc-kcal')?.value) || 0,
    protein_g: Number(row.querySelector('.rc-prot')?.value) || 0,
    carbs_g:   Number(row.querySelector('.rc-carb')?.value) || 0,
    fat_g:     Number(row.querySelector('.rc-fat')?.value) || 0,
  }));
}

function renderRecipeComponentRow(comp) {
  const li = document.createElement('li');
  li.className = 'recipe-component';
  const fields = document.createElement('div');
  fields.className = 'rc-fields';
  const mk = (cls, placeholder, value, type = 'text') => {
    const i = document.createElement('input');
    i.type = type;
    i.className = cls;
    i.placeholder = placeholder;
    i.value = value ?? '';
    if (type === 'number') { i.inputMode = 'decimal'; i.step = 'any'; i.min = '0'; }
    i.addEventListener('input', recalcRecipeTotals);
    return i;
  };
  fields.appendChild(mk('rc-name', t('recipeCompName'), comp.product_name));
  fields.appendChild(mk('rc-grams', t('recipeCompGrams'), comp.grams || '', 'number'));
  fields.appendChild(mk('rc-kcal', t('recipeCompKcal'), comp.kcal || '', 'number'));
  fields.appendChild(mk('rc-prot', t('recipeCompProt'), comp.protein_g || '', 'number'));
  fields.appendChild(mk('rc-carb', t('recipeCompCarb'), comp.carbs_g || '', 'number'));
  fields.appendChild(mk('rc-fat', t('recipeCompFat'), comp.fat_g || '', 'number'));

  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'rc-remove';
  rm.textContent = '×';
  rm.setAttribute('aria-label', t('recipeRemoveComp'));
  rm.addEventListener('click', () => { li.remove(); recalcRecipeTotals(); });

  li.appendChild(fields);
  li.appendChild(rm);
  return li;
}

function openRecipeEditor(recipe) {
  editingRecipe = recipe ?? { id: undefined, name: '', servings: 1, components: [newComponent()] };
  if (recipeEditName) recipeEditName.value = editingRecipe.name;
  if (recipeEditServings) recipeEditServings.value = String(editingRecipe.servings || 1);
  if (recipeEditComps) {
    recipeEditComps.textContent = '';
    const comps = editingRecipe.components?.length ? editingRecipe.components : [newComponent()];
    for (const c of comps) recipeEditComps.appendChild(renderRecipeComponentRow(c));
  }
  recalcRecipeTotals();
  recipeEditDialog?.showModal();
}

recipeEditName?.addEventListener('input', recalcRecipeTotals);
recipeEditServings?.addEventListener('input', recalcRecipeTotals);

recipeAddCompBtn?.addEventListener('click', () => {
  recipeEditComps?.appendChild(renderRecipeComponentRow(newComponent()));
  recalcRecipeTotals();
});

recipeEditCancel?.addEventListener('click', (e) => {
  e.preventDefault();
  editingRecipe = null;
  recipeEditDialog?.close();
});

recipeEditSave?.addEventListener('click', async (e) => {
  e.preventDefault();
  const components = readDraftComponentsFromDOM().filter((c) => c.product_name || c.kcal || c.grams);
  try {
    await saveRecipe({
      id: editingRecipe?.id,
      name: recipeEditName?.value || '',
      servings: Number(recipeEditServings?.value) || 1,
      components,
    });
    editingRecipe = null;
    recipeEditDialog?.close();
    await renderRecipesList();
  } catch (err) { console.error('[recipe-save]', err); }
});

async function renderRecipesList() {
  if (!recipesListEl) return;
  recipesListEl.textContent = '';
  const all = await listRecipes().catch(() => []);
  if (all.length === 0) {
    const li = document.createElement('li');
    li.className = 'dash-entry-empty';
    li.textContent = t('recipeEmpty');
    recipesListEl.appendChild(li);
    return;
  }
  for (const r of all) {
    const li = document.createElement('li');
    li.className = 'tpl-item';
    const head = document.createElement('div');
    head.className = 'tpl-head';
    const name = document.createElement('strong');
    name.textContent = r.name;
    const agg = aggregateRecipe(r, r.servings || 1);
    const summary = document.createElement('span');
    summary.className = 'tpl-kcal';
    summary.textContent = `${Math.round(agg.kcal)} kcal · ${r.components.length} ingr.`;
    head.appendChild(name);
    head.appendChild(summary);
    li.appendChild(head);

    const actions = document.createElement('div');
    actions.className = 'tpl-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'chip-btn accent';
    apply.textContent = t('recipeApply');
    apply.addEventListener('click', async () => {
      try {
        const aggregated = aggregateRecipe(r, r.servings || 1);
        const meal = defaultMealForHour(new Date().getHours());
        const entry = {
          id: globalThis.crypto?.randomUUID?.() ?? `a${Date.now()}${Math.random().toString(36).slice(2)}`,
          date: todayISO(),
          timestamp: Date.now(),
          meal,
          ...aggregated,
        };
        await putEntry(entry);
        await renderDashboard();
        recipesDialog?.close();
        toast(t('recipeAppliedToast', { name: r.name }));
      } catch (err) { console.error('[recipe-apply]', err); }
    });
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'chip-btn';
    edit.textContent = t('recipeEdit');
    edit.addEventListener('click', () => openRecipeEditor(r));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'chip-btn';
    del.textContent = '🗑';
    del.setAttribute('aria-label', t('recipeDelete'));
    del.addEventListener('click', async () => {
      await deleteRecipe(r.id);
      await renderRecipesList();
    });
    actions.appendChild(apply);
    actions.appendChild(edit);
    actions.appendChild(del);
    li.appendChild(actions);
    recipesListEl.appendChild(li);
  }
}

recipesBtn?.addEventListener('click', async () => {
  recipesDialog?.showModal();
  try { await renderRecipesList(); }
  catch (err) { console.warn('[recipes] render failed', err); }
});
recipesCloseBtn?.addEventListener('click', (e) => { e.preventDefault(); recipesDialog?.close(); });
recipeNewBtn?.addEventListener('click', () => openRecipeEditor(null));

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

// ============================================================================
// Hydration — daily glass counter, stored in localStorage keyed by ISO date.
// Each glass is 250 ml (EFSA reference glass). Counter resets naturally at
// midnight because the key changes with the date.
// ============================================================================

const HYD_GLASS_ML = 250;
const hydKey = (date) => `scanneat.hydration.${date}`;

function getHydrationMl(date = todayISO()) {
  const raw = localStorage.getItem(hydKey(date));
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function setHydrationMl(ml, date = todayISO()) {
  const clamped = Math.max(0, Math.round(ml));
  localStorage.setItem(hydKey(date), String(clamped));
}

function renderHydration() {
  const tile = $('hydration-tile');
  const amt = $('hydration-amount');
  const fill = $('hydration-fill');
  if (!tile || !amt || !fill) return;
  const profile = getProfile();
  const goal = waterGoalMl(profile);
  const ml = getHydrationMl();
  amt.textContent = t('hydrationAmount', { ml, goal });
  const pct = goal > 0 ? Math.min(120, (ml / goal) * 100) : 0;
  fill.style.width = `${Math.min(100, pct)}%`;
  if (pct >= 100 && pct < 110) fill.dataset.state = 'done';
  else if (pct >= 110) fill.dataset.state = 'over';
  else delete fill.dataset.state;
}

$('hydration-plus')?.addEventListener('click', () => {
  setHydrationMl(getHydrationMl() + HYD_GLASS_ML);
  renderHydration();
});
$('hydration-minus')?.addEventListener('click', () => {
  setHydrationMl(Math.max(0, getHydrationMl() - HYD_GLASS_ML));
  renderHydration();
});

// ============================================================================
// Fasting timer — intermittent-fasting countdown.
// State persists in localStorage so the clock survives reloads + app restarts.
// ============================================================================

const LS_FASTING_START = 'scanneat.fasting.start';
const LS_FASTING_TARGET = 'scanneat.fasting.target';
let fastingInterval = null;

function getFastingState() {
  const startRaw = localStorage.getItem(LS_FASTING_START);
  const targetRaw = localStorage.getItem(LS_FASTING_TARGET);
  const start = Number(startRaw);
  const target = Number(targetRaw);
  if (!Number.isFinite(start) || start <= 0) return null;
  return {
    start_ms: start,
    target_hours: Number.isFinite(target) && target > 0 ? target : 16,
  };
}
function startFasting(targetHours) {
  localStorage.setItem(LS_FASTING_START, String(Date.now()));
  localStorage.setItem(LS_FASTING_TARGET, String(targetHours));
}
function stopFasting() {
  localStorage.removeItem(LS_FASTING_START);
  localStorage.removeItem(LS_FASTING_TARGET);
}

function renderFasting() {
  const tile = $('fasting-tile');
  const startRow = $('fasting-start-row');
  const amt = $('fasting-amount');
  const fill = $('fasting-fill');
  const stateEl = $('fasting-state');
  if (!tile || !startRow) return;

  const s = getFastingState();
  if (!s) {
    hide(tile);
    show(startRow);
    if (fastingInterval) { clearInterval(fastingInterval); fastingInterval = null; }
    return;
  }

  const st = fastingStatus(s.start_ms, Date.now(), s.target_hours);
  if (amt) amt.textContent = st.label;
  if (fill) {
    fill.style.width = `${st.pct}%`;
    if (st.complete) fill.dataset.state = 'done';
    else delete fill.dataset.state;
  }
  if (stateEl) {
    if (st.complete) {
      const overH = Math.floor(st.overrun_ms / 3_600_000);
      const overM = Math.floor((st.overrun_ms % 3_600_000) / 60_000);
      stateEl.textContent = overH > 0 || overM > 0
        ? `${t('fastingComplete')} · ${t('fastingOverrun', { h: overH, m: String(overM).padStart(2, '0') })}`
        : t('fastingComplete');
    } else {
      stateEl.textContent = t('fastingInProgress');
    }
  }
  show(tile);
  hide(startRow);
  // Tick once a minute — fine for a countdown measured in hours. Skipped
  // under reduce-motion for users who prefer no animated counters.
  if (!fastingInterval && !document.body.classList.contains('reduce-motion')) {
    fastingInterval = setInterval(renderFasting, 60_000);
  }
}

$('fasting-start')?.addEventListener('click', () => {
  const target = Number($('fasting-target')?.value) || 16;
  startFasting(target);
  renderFasting();
});
$('fasting-stop')?.addEventListener('click', () => {
  stopFasting();
  renderFasting();
});

// ============================================================================
// Day / Week view toggle — flips between daily dashboard and weekly rollup.
// Stored in-memory only (resets on reload).
// ============================================================================

let dashboardView = 'day'; // 'day' | 'week'

function applyViewToggle(view) {
  dashboardView = view;
  for (const btn of document.querySelectorAll('.view-tab')) {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }
  const weeklyEl = $('weekly-view');
  const rowsEl = $('dashboard-rows');
  const logEl = $('dashboard-log');
  if (view === 'week') {
    hide(rowsEl);
    hide(logEl);
    renderWeeklyView();
    show(weeklyEl);
  } else {
    hide(weeklyEl);
    show(rowsEl);
    // Keep log visibility driven by renderDashboard; re-run it to refresh.
    renderDashboard();
  }
}

async function renderWeeklyView() {
  const root = $('weekly-view');
  const bars = $('weekly-bars');
  const summary = $('weekly-summary');
  if (!root || !bars || !summary) return;

  const all = await listAllEntries().catch(() => []);
  const roll = weeklyRollup(all, todayISO());
  const profile = getProfile();
  const targets = dailyTargets(profile);
  const kcalTarget = targets?.kcal ?? 0;
  const peak = Math.max(kcalTarget, ...roll.days.map((d) => d.kcal), 1);

  // Summary line — avg / total / days logged
  summary.textContent = '';
  const mkChip = (labelKey, value) => {
    const d = document.createElement('div');
    d.className = 'ws-item';
    const l = document.createElement('span');
    l.className = 'ws-label';
    l.textContent = t(labelKey);
    const v = document.createElement('span');
    v.className = 'ws-value';
    v.textContent = value;
    d.appendChild(l); d.appendChild(v);
    return d;
  };
  summary.appendChild(mkChip('weeklyAvgKcal', `${Math.round(roll.avg.kcal)} kcal`));
  summary.appendChild(mkChip('weeklyTotalKcal', `${Math.round(roll.total.kcal)} kcal`));
  summary.appendChild(mkChip('weeklyDaysLogged', t('weeklyDaysLogged', { n: roll.days_logged })));

  // Bar chart — one column per day
  bars.textContent = '';
  const dayFmt = new Intl.DateTimeFormat(currentLang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'narrow' });
  for (const d of roll.days) {
    const wrap = document.createElement('div');
    wrap.className = 'wbar';
    const isEmpty = d.count === 0;
    const isOver = kcalTarget > 0 && d.kcal > kcalTarget;
    if (isEmpty) wrap.dataset.empty = 'true';
    if (isOver) wrap.dataset.over = 'true';
    const col = document.createElement('span');
    col.className = 'wbar-col';
    const heightPct = Math.max(2, (d.kcal / peak) * 100);
    col.style.height = `${heightPct}%`;
    const date = new Date(d.date + 'T12:00:00Z');
    const dayLabel = document.createElement('span');
    dayLabel.className = 'wbar-label';
    dayLabel.textContent = dayFmt.format(date);
    const valLabel = document.createElement('span');
    valLabel.className = 'wbar-val';
    valLabel.textContent = isEmpty ? '—' : Math.round(d.kcal);
    wrap.appendChild(col);
    wrap.appendChild(dayLabel);
    wrap.appendChild(valLabel);
    bars.appendChild(wrap);
  }
}

document.querySelectorAll('.view-tab').forEach((btn) =>
  btn.addEventListener('click', () => applyViewToggle(btn.dataset.view)));

async function renderDashboard() {
  const profile = getProfile();
  const targets = dailyTargets(profile);
  const entries = await listByDate().catch(() => []);
  const totals = await dailyTotals().catch(() => null);
  if (!totals) { hide(dashboardEl); return; }

  if (totals.count === 0 && !targets) { hide(dashboardEl); return; }
  renderHydration();
  renderFasting();

  dashboardDateEl.textContent = new Date().toLocaleDateString(currentLang === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  // Streak: small positive-reinforcement line. Only shown at 2+ consecutive
  // days so a single-day user isn't greeted with "1 day streak" nag.
  try {
    const streakEl = $('dashboard-streak');
    if (streakEl) {
      const allEntries = await listAllEntries().catch(() => []);
      const streak = logStreakDays(allEntries, todayISO());
      if (streak >= 2) {
        streakEl.textContent = t('streakDays', { n: streak });
        show(streakEl);
      } else {
        hide(streakEl);
      }
    }
  } catch { /* streak is decorative; never fail the dashboard render */ }

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

// ============================================================================
// Progress charts — 30-day trend for weight, kcal, hydration.
// ============================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

function renderLineChart(container, values, opts = {}) {
  if (!container) return;
  container.textContent = '';
  const numeric = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (numeric.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'pc-empty';
    empty.textContent = t('progressNoData');
    container.appendChild(empty);
    return { min: null, max: null };
  }
  const width = 300;
  const height = 120;
  const { path_d, min, max, points } = buildLineChartPath(values, {
    width, height, padding: 10,
  });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', opts.ariaLabel || 'chart');

  if (path_d) {
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('class', 'pc-line');
    line.setAttribute('d', path_d);
    svg.appendChild(line);
    // Dot only on the last point — visual emphasis on "where you are now".
    const last = points[points.length - 1];
    if (last) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'pc-dot');
      dot.setAttribute('cx', last.x.toFixed(1));
      dot.setAttribute('cy', last.y.toFixed(1));
      dot.setAttribute('r', '3.5');
      svg.appendChild(dot);
    }
    // Axis labels: min at bottom-left, max at top-left.
    const minLabel = document.createElementNS(SVG_NS, 'text');
    minLabel.setAttribute('class', 'pc-axis');
    minLabel.setAttribute('x', '2');
    minLabel.setAttribute('y', (height - 2).toString());
    minLabel.textContent = String(Math.round(min));
    const maxLabel = document.createElementNS(SVG_NS, 'text');
    maxLabel.setAttribute('class', 'pc-axis');
    maxLabel.setAttribute('x', '2');
    maxLabel.setAttribute('y', '12');
    maxLabel.textContent = String(Math.round(max));
    svg.appendChild(minLabel);
    svg.appendChild(maxLabel);
  }
  container.appendChild(svg);
  return { min, max };
}

async function renderProgressCharts() {
  // Build an ISO-dated series of the last 30 days. Null = no data that day.
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Weight series — pick the most recent entry per date if multiple.
  const weights = await listWeight().catch(() => []);
  const weightByDate = new Map();
  for (const w of weights) {
    if (!weightByDate.has(w.date) || (w.timestamp ?? 0) > (weightByDate.get(w.date).timestamp ?? 0)) {
      weightByDate.set(w.date, w);
    }
  }
  const weightSeries = days.map((d) => weightByDate.get(d)?.weight_kg ?? null);

  // Kcal series — sum per date from all consumption entries.
  const allEntries = await listAllEntries().catch(() => []);
  const kcalByDate = new Map();
  for (const e of allEntries) {
    kcalByDate.set(e.date, (kcalByDate.get(e.date) ?? 0) + (Number(e.kcal) || 0));
  }
  const kcalSeries = days.map((d) => (kcalByDate.has(d) ? kcalByDate.get(d) : null));

  // Water series — localStorage-backed per date.
  const waterSeries = days.map((d) => {
    const raw = localStorage.getItem(`scanneat.hydration.${d}`);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  const w = renderLineChart($('progress-weight-chart'), weightSeries, { ariaLabel: t('progressWeight') });
  const k = renderLineChart($('progress-kcal-chart'), kcalSeries, { ariaLabel: t('progressKcal') });
  const wt = renderLineChart($('progress-water-chart'), waterSeries, { ariaLabel: t('progressWater') });

  const fmtSummary = (el, res) => {
    if (!el) return;
    if (!res || res.min == null) { el.textContent = ''; return; }
    el.textContent = t('progressMinMax', { min: Math.round(res.min), max: Math.round(res.max) });
  };
  fmtSummary($('progress-weight-summary'), w);
  fmtSummary($('progress-kcal-summary'), k);
  fmtSummary($('progress-water-summary'), wt);
}

$('progress-btn')?.addEventListener('click', async () => {
  const dlg = $('progress-dialog');
  if (!dlg) return;
  dlg.showModal();
  try { await renderProgressCharts(); }
  catch (err) { console.warn('[progress]', err); }
});
$('progress-close')?.addEventListener('click', (e) => {
  e.preventDefault();
  $('progress-dialog')?.close();
});

async function renderWeightSummary(profile) {
  const el = $('weight-summary');
  if (!el) return;
  const entries = await listWeight().catch(() => []);
  if (entries.length === 0) { hide(el); return; }
  const s = summarizeWeight(entries, 30);
  const trend = weeklyTrend(entries.slice(-10));
  el.innerHTML = '';

  const appendSpan = (nodes) => {
    const span = document.createElement('span');
    for (const n of nodes) span.appendChild(n);
    if (el.childNodes.length > 0) el.appendChild(document.createTextNode(' · '));
    el.appendChild(span);
  };
  const strong = (txt) => {
    const s2 = document.createElement('strong');
    s2.textContent = String(txt);
    return s2;
  };
  const text = (txt) => document.createTextNode(String(txt));

  appendSpan([strong(`${s.latest_kg} kg`), text(` · ${t('weightCurrent')}`)]);
  if (profile?.goal_weight_kg) {
    const toGo = round1(s.latest_kg - profile.goal_weight_kg);
    appendSpan([text(`🎯 ${profile.goal_weight_kg} kg (${toGo > 0 ? '+' : ''}${toGo} kg)`)]);
  }
  if (s.recent_count >= 2) {
    const sign = s.delta_kg > 0 ? '+' : '';
    appendSpan([text(`Δ 30 j : ${sign}${s.delta_kg} kg`)]);
  }
  if (trend !== 0 && Number.isFinite(trend)) {
    const sign = trend > 0 ? '+' : '';
    appendSpan([text(`${t('weightTrend')} : ${sign}${trend} kg/sem`)]);
  }
  show(el);
}

// ============================================================================
// Meal reminders — local, in-page only.
// No service-worker push (would need a backend). Reminders fire only while
// the tab is open, via setTimeout. Shows a Notification if permission was
// granted, else falls back to an in-app toast.
// ============================================================================

const reminderTimers = [];

function fireMealReminder(meal) {
  const body = t('reminderBody', { meal: t(
    meal === 'breakfast' ? 'mealBreakfast'
    : meal === 'lunch' ? 'mealLunch'
    : 'mealDinner',
  ).toLowerCase() });
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification('Scann-eat', { body, icon: '/icon.svg' }); }
    catch { toast(body); }
  } else {
    toast(body);
  }
}

function scheduleReminders() {
  // Clear any pending timers first — called on boot + after settings save.
  for (const id of reminderTimers) clearTimeout(id);
  reminderTimers.length = 0;

  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    const on = localStorage.getItem(`scanneat.reminder.${meal}.on`) === '1';
    if (!on) continue;
    const time = localStorage.getItem(`scanneat.reminder.${meal}.time`);
    if (!time) continue;
    const nextMs = nextOccurrenceMs(time, Date.now());
    if (nextMs == null) continue;
    // setTimeout accepts up to ~24.8 days — plenty for a 24h-max scheduling
    // window.
    const delay = Math.max(0, nextMs - Date.now());
    const id = setTimeout(() => {
      fireMealReminder(meal);
      // Re-schedule for the next day by re-running the whole planner.
      scheduleReminders();
    }, delay);
    reminderTimers.push(id);
  }
}

renderQueue();
updatePendingBanner();
renderRecentScans();
renderDashboard();
maybeShowOnboarding();
scheduleReminders();

// ----- Dashboard-first for returning users -----
// If the user logged anything in the last 3 days, they're in "daily use" mode
// and the dashboard (kcal remaining, macros) is more useful above the fold
// than the scan-capture card. CSS handles the reorder via body.returning-user
// so it works even if the user scrolls down and back up.
(async () => {
  try {
    const entries = await listByDate().catch(() => []);
    const logged3d = entries.length > 0; // today specifically; cheap proxy
    if (logged3d) document.body.classList.add('returning-user');
  } catch { /* non-critical */ }
})();
