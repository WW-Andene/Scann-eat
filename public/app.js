import { t, setLang, currentLang, applyStaticTranslations } from '/core/i18n.js';
import { explainFlag } from '/core/explanations.js';
import { enqueue, listPending, remove as removePending, countPending } from '/data/queue-store.js';
import { saveScan, listScans, deleteScan, clearScans, findScanByBarcode } from '/data/scan-history.js';
import { buildBackup, restoreBackup } from '/backup.js';
import { listProfiles, activeProfile, saveProfile, switchProfile, deleteProfile } from '/profiles.js';
import { isEnabled as telemetryEnabled, setEnabled as telemetrySetEnabled, logEvent as telemetryLog, clearEvents as telemetryClear, formatEvents as telemetryFormat } from '/core/telemetry.js';
import { getSetting, setSetting } from '/core/app-settings.js';
import { initHydration, renderHydration } from '/features/hydration.js';
import { initActivity, renderActivity } from '/features/activity.js';
import { initWeight, renderWeightSummary } from '/features/weight.js';
import { initReminders, scheduleReminders } from '/features/reminders.js';
import { initVoiceDictate } from '/features/voice-dictate.js';
import { initScanner, openCameraScanner, closeCameraScanner } from '/features/scanner.js';
import { maybeShowOnboarding } from '/features/onboarding.js';
import { initInstallBanner } from '/features/install-banner.js';
import { initBackupIO } from '/features/backup-io.js';
import { initFasting, renderFasting } from '/features/fasting.js';
import { initAppearance, applyAppearance, applyTheme, applyReadingPrefs } from '/features/appearance.js';
import { shareOrCopy } from '/core/share.js';
import { dateFormatter, localeFor } from '/core/date-format.js';
import { localDateISO } from '/core/dateutil.js';
import { toGrams, parseUnitInput } from '/core/unit-convert.js';
import { initRecipeIdeas, openRecipeIdeas, openPantryIdeas } from '/features/recipe-ideas.js';
import { initSettingsDialog } from '/features/settings-dialog.js';
import { initKeybindings } from '/features/keybindings.js';
import { initProfileDialog } from '/features/profile-dialog.js';
import { initMenuScan, openMenuScan } from '/features/menu-scan.js';
import { initTemplatesDialog } from '/features/templates-dialog.js';
import { initRecipesDialog } from '/features/recipes-dialog.js';
import { initQaAutocomplete } from '/features/qa-autocomplete.js';
import { buildFastCompletion, saveFastCompletion, listFastHistory, computeFastStreak, clearFastHistory } from '/features/fasting-history.js';
import { getDayNote, setDayNote, DAY_NOTE_MAX_CHARS } from '/features/day-notes.js';
import { searchFoodDB, reconcileWithFoodDB } from '/data/food-db.js';
import { buildCustomFood, listCustomFoods, saveCustomFood, deleteCustomFood } from '/data/custom-food-db.js';
import { findPairings, matchPairings } from '/data/pairings.js';
import { detectAllergens } from '/core/allergens.js';
import {
  getProfile, setProfile, hasMinimalProfile,
  bmrMifflinStJeor, tdeeKcal, bmi, bmiCategory, dailyTargets,
} from '/data/profile.js';
import { computePersonalScore, personalGrade } from '/core/personal-score.js';
import { logEntry, logQuickAdd, listByDate, listAllEntries, deleteEntry, clearDate, dailyTotals, todayISO, groupByMeal, MEALS, putEntry } from '/data/consumption.js';
import { logWeight, listWeight, deleteWeight, summarize as summarizeWeight, weeklyTrend } from '/data/weight-log.js';
import { saveTemplate, listTemplates, deleteTemplate, expandTemplate, templateKcal } from '/data/meal-templates.js';
import { saveRecipe, listRecipes, deleteRecipe, aggregateRecipe, buildRecipeProductInput } from '/data/recipes.js';
import { aggregateGroceryList, formatGroceryList } from '/features/grocery-list.js';
import { weekDates, getDayPlan, setSlot, clearDay, clearAll as clearMealPlan, planRecipes, MEAL_PLAN_MEALS, isoToday } from '/features/meal-plan.js';
import { logActivity, listActivityByDate, deleteActivity, buildActivityEntry, estimateKcalBurned, sumBurned, ACTIVITY_TYPES } from '/data/activity.js';
import { computeConfidence, snapshotFromData, timeAgoBucket, defaultMealForHour, logStreakDays, parseVoiceQuickAdd, waterGoalMl, weeklyRollup, monthlyRollup, fastingStatus, buildLineChartPath, laplacianVariance, sharpnessVerdict, entriesToDailyCSV, nextOccurrenceMs, entriesToHealthJSON, weightForecast, closeTheGap, formatWeeklyShare, formatMonthlyShare, formatPairingsShare, formatDailySummary, formatRecipeShare, formatTemplateShare, pctClass, dashboardRowsFrom, filterScanHistory, summarizeScanHistory, topFoods, weekOverWeekDelta } from '/core/presenters.js';
import { FOOD_DB } from '/data/food-db.js';
import { checkDiet } from '/core/diets.js';
import { checkRecipeWarnings, checkTemplateWarnings, checkQuickAddWarnings } from '/core/user-content-checks.js';

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

// Onboarding dialog refs moved into /features/onboarding.js.

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

// Assigned in the boot block once initRecipesDialog runs. Declared here
// so the qa-photo-multi handler (registered early) can close over the
// reference — reads happen at user-click time, always after assignment.
let recipesDialog = null;

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
/**
 * Fire a transient toast. Second arg can be EITHER a variant string
 * ('ok' | 'warn' | 'error') or a numeric ms duration. Most callers pass
 * a variant; the legacy ms form is still honoured for the few tests /
 * sites that rely on it. Variant drives a `data-variant` attribute the
 * stylesheet can hook into (e.g. warning/error accent stripe).
 *
 * Prior to R7.9, the signature was `toast(text, ms=2600)` but ~10 sites
 * called `toast(text, 'error')`, passing a string where a number was
 * expected. setTimeout silently coerced it to NaN → inconsistent auto-
 * hide behavior across browsers. Unified signature fixes the silent
 * bug while staying backward-compatible.
 */
function toast(text, variantOrMs) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'app-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  let variant = '';
  let ms = 2600;
  if (typeof variantOrMs === 'number') ms = variantOrMs;
  else if (typeof variantOrMs === 'string') variant = variantOrMs;
  toastEl.textContent = String(text);
  if (variant) toastEl.dataset.variant = variant;
  else delete toastEl.dataset.variant;
  toastEl.dataset.visible = 'true';
  // Ensure any lingering action slot from a previous toastWithUndo is
  // cleared so plain toast() calls don't inherit a stale button.
  toastEl.dataset.hasAction = 'false';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.dataset.visible = 'false';
  }, ms);
}

// R35.I2: toast with an Undo button. Used by destructive actions
// (delete entry, clear-today, delete weight, etc.) so the user has a
// 6-second grace window to reverse. The caller passes an async
// callback that reinstates the data; tapping Undo invokes it and
// dismisses the toast early.
let toastActionEl = null;
function toastWithUndo(text, onUndo, ms = 6000) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'app-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  if (!toastActionEl) {
    toastActionEl = document.createElement('button');
    toastActionEl.type = 'button';
    toastActionEl.className = 'app-toast-action';
    toastEl.appendChild(toastActionEl);
  } else if (toastActionEl.parentElement !== toastEl) {
    toastEl.appendChild(toastActionEl);
  }
  // Clear existing text nodes (the button stays); rebuild.
  for (const n of Array.from(toastEl.childNodes)) {
    if (n !== toastActionEl) toastEl.removeChild(n);
  }
  toastEl.insertBefore(document.createTextNode(String(text)), toastActionEl);
  toastActionEl.textContent = t('undo');
  toastEl.dataset.variant = 'warn';
  toastEl.dataset.visible = 'true';
  toastEl.dataset.hasAction = 'true';
  if (toastTimer) clearTimeout(toastTimer);
  const dismiss = () => {
    toastEl.dataset.visible = 'false';
    toastEl.dataset.hasAction = 'false';
    toastActionEl.onclick = null;
  };
  toastActionEl.onclick = async () => {
    dismiss();
    try { await onUndo(); } catch (err) { console.error('[undo]', err); }
  };
  toastTimer = setTimeout(dismiss, ms);
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
  queueEl.textContent = '';
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
  let dupCount = 0;
  for (const file of files) {
    try {
      const barcode = await detectBarcodeFromFile(file);
      // Duplicate-barcode guard: if the user snaps the same product's
      // barcode twice, a second identical hit contributes nothing (the
      // server takes only one barcode anyway) and clutters the queue.
      // We keep the first and warn via a toast.
      if (barcode && queue.some((q) => q.barcode === barcode)) {
        dupCount += 1;
        continue;
      }
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
  // R16.4: blurry + duplicate are both "this didn't go quite right"
  // conditions — annotate as 'warn' so the stripe colour matches.
  if (blurryCount > 0) {
    toast(t('blurryPhotoWarning'), 'warn');
  }
  if (dupCount > 0) {
    toast(t('duplicateBarcodeSkipped', { n: dupCount }), 'warn');
  }
}

function addBarcodeOnly(barcode) {
  // Duplicate guard for the live scanner path too — lets the user re-
  // aim the camera if they accidentally pointed at the same barcode
  // twice without blocking the UI.
  if (queue.some((q) => q.barcode === barcode)) {
    toast(t('duplicateBarcodeSkipped', { n: 1 }), 'warn');
    return;
  }
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
    if (res.status === 429 || body.error === 'rate_limit') {
      throw new Error(t('errRateLimit'));
    }
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
  let parsed;
  try {
    parsed = await parseLabel(payload, { apiKey: key });
  } catch (err) {
    // ocr-parser tags the thrown Error with .status — 429 means the user's
    // own Groq quota is saturated. Surface a translated message instead of
    // the raw "Groq API 429: …" string.
    if (err?.status === 429) throw new Error(t('errRateLimit'));
    throw err;
  }
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
    telemetryLog('scan-failed', err?.message || String(err), bc ? `barcode=${bc}` : `mode=${mode}`);
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
  // Plural handled by t() via Intl.PluralRules — one key, two variants.
  pendingText.textContent = t('pendingScans', { n });
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

  // Milestone success moment: A+ grade lands → briefly intensify
  // the .score-card's notebook-margin rule + coral halo pulse
  // (§DST4 + Step 14). Also fires the grade-chip reveal animation.
  // Auto-removes so the next scan that lands A+ triggers fresh.
  const scoreCard = $('score-card');
  const gradeEl = $('grade-el');
  if (scoreCard && gradeEl) {
    gradeEl.classList.remove('grade-chip-reveal');
    // Force reflow so the re-added class re-runs the animation.
    void gradeEl.offsetWidth;
    gradeEl.classList.add('grade-chip-reveal');
    if (audit.grade === 'A+') {
      scoreCard.classList.remove('success-burst');
      void scoreCard.offsetWidth;
      scoreCard.classList.add('success-burst');
      setTimeout(() => scoreCard.classList.remove('success-burst'), 1000);
    }
  }

  renderPersonalScore(audit, data.product);

  // Suggest "similar but better" alternatives for mediocre scans or veto'd
  // products. Fire-and-forget — never block the main render on a network
  // call; the section reveals itself when ready.
  maybeRenderAlternatives(data).catch(() => { /* non-critical */ });

  renderPairings(data);

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
  // Gap fix #15: when OFF also reports ecoscore_value (the 0-100
  // numeric score behind the letter grade), append it to the chip
  // text + tooltip so users see the quantitative signal, not just
  // the coloured letter. Grade alone is equivalent to the food-grade
  // chip; the value adds the "how far from A" information.
  const ecoEl = $('result-ecoscore');
  const ecoGrade = data.product?.ecoscore_grade;
  const ecoValue = data.product?.ecoscore_value;
  if (ecoEl) {
    if (ecoGrade && /^[a-e]$/.test(ecoGrade)) {
      ecoEl.dataset.eco = ecoGrade;
      const valueSuffix = typeof ecoValue === 'number' && Number.isFinite(ecoValue)
        ? ` · ${Math.round(ecoValue)}/100`
        : '';
      ecoEl.textContent = t('ecoscoreChip', { grade: ecoGrade.toUpperCase() }) + valueSuffix;
      ecoEl.title = typeof ecoValue === 'number'
        ? t('ecoscoreTooltipWithValue', { grade: ecoGrade.toUpperCase(), value: Math.round(ecoValue) })
        : t('ecoscoreTooltip');
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
  // Gap fix 3 — reveal the add-to-recipe button once a scan is on
  // screen. Hidden by default and when the user dismisses the scan.
  const addBtn = $('add-to-recipe-btn');
  if (addBtn) addBtn.hidden = false;
  const picker = $('add-to-recipe-picker');
  if (picker) { picker.hidden = true; picker.textContent = ''; }

  renderList('red-flags', audit.red_flags, t('noFlag'));
  renderList('green-flags', audit.green_flags, t('noFlag'));

  const pillars = [
    [t('pillarProcessing'), audit.pillars.processing],
    [t('pillarDensity'), audit.pillars.nutritional_density],
    [t('pillarNegatives'), audit.pillars.negative_nutrients],
    [t('pillarAdditives'), audit.pillars.additive_risk],
    [t('pillarIntegrity'), audit.pillars.ingredient_integrity],
  ];
  const pillarList = $('pillar-list'); pillarList.textContent = '';
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
  el.textContent = '';
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

/**
 * Classic-pairings chip row: "Ça va bien avec…" under the product card.
 * Offline, zero-LLM. Looks up the scanned product's name (or its first
 * ingredient when the name is a brand) against the curated PAIRINGS
 * table. Hidden when nothing matches.
 */
// Stashes the canonical ingredient name from the last successful
// renderPairings() call so the recipe-ideas button has something to send
// to the LLM without having to re-derive it on click. pairedHit retains
// the full match (name + pairs) for the Share button's recipe-card
// formatter.
let pairedIngredientName = null;
let pairedHit = null;

function renderPairings(data) {
  const section = $('pairings');
  const title = $('pairings-title');
  const list = $('pairings-list');
  if (!section || !title || !list) return;
  const product = data?.product || {};
  // Try the product name first, then the primary ingredient (OFF products
  // often have brand names that won't match, but their first ingredient
  // often does — e.g. a "Président Mozzarella Bio" resolves via
  // ingredients[0] = 'lait').
  let hit = matchPairings(product.name || '');
  if (!hit && Array.isArray(product.ingredients) && product.ingredients.length > 0) {
    const firstIng = product.ingredients[0]?.name || '';
    hit = matchPairings(firstIng);
  }
  list.textContent = '';
  if (!hit) {
    pairedIngredientName = null;
    pairedHit = null;
    hide(section);
    return;
  }
  pairedIngredientName = hit.name;
  pairedHit = hit;
  title.textContent = t('pairingsTitle', { name: hit.name });
  for (const p of hit.pairs.slice(0, 6)) {
    const li = document.createElement('li');
    li.className = 'pairing-chip';
    // Ahn 2011 pair shape: { b, fr, cooccur }. Use fr when available,
    // otherwise fall back to the English id with underscores stripped.
    const label = p.fr ?? p.b.replace(/_/g, ' ');
    li.textContent = label;
    // Title attr exposes the empirical strength — "co-cité dans 577
    // recettes" — without cluttering the chip itself.
    if (Number.isFinite(p.cooccur)) {
      li.title = t('pairingsSharedCompounds', { n: p.cooccur });
    }
    list.appendChild(li);
  }
  show(section);
}

// ============================================================================
// Recipe ideas dialog — LLM-backed, powered by /api/suggest-recipes.
// Opens from the "💡 Idées de recettes" button inside the pairings panel.
// ============================================================================

// Recipe-ideas dialog + renderer extracted to /features/recipe-ideas.js.
// openRecipeIdeas / openPantryIdeas are imported at the top; init happens
// in the boot sequence below.

$('recipe-ideas-btn')?.addEventListener('click', () => {
  if (!pairedIngredientName) return;
  openRecipeIdeas(pairedIngredientName);
});

// Pair-list "Copy" — useful for dropping into a shopping-list or a chat.
// Builds a single line from the currently-rendered chips so the text
// stays in sync with what the user is actually looking at.
$('pairings-copy-btn')?.addEventListener('click', async () => {
  const chips = document.querySelectorAll('#pairings-list .pairing-chip');
  if (chips.length === 0) return;
  const names = Array.from(chips).map((c) => c.textContent?.trim() || '').filter(Boolean);
  const header = pairedIngredientName
    ? `${t('pairingsTitle', { name: pairedIngredientName })}: `
    : '';
  const text = header + names.join(' · ');
  try {
    await navigator.clipboard?.writeText(text);
    // R16.5: success → 'ok' variant for stripe consistency.
    toast(t('pairingsCopied'), 'ok');
  } catch { toast(t('pairingsCopyFailed'), 'error'); }
});

// Pair-list "Share" — richer than Copy: builds a recipe-card-shaped block
// and hands it to navigator.share (Web Share API) on mobile, with a
// clipboard fallback elsewhere. Uses the structured hit, not the chips'
// textContent, so co-occurrence counts survive round-trip.
$('pairings-share-btn')?.addEventListener('click', async () => {
  if (!pairedHit) return;
  await shareOrCopy({
    title: t('pairingsShareTitle', { name: pairedHit.name }),
    text: formatPairingsShare(pairedHit, { lang: currentLang }),
    toasts: { copied: t('pairingsShareCopied'), failed: t('pairingsShareFailed') },
    toast,
  });
});
// Recipe-ideas close handler lives in initRecipeIdeas().

// Pantry dialog: list ingredients → suggestRecipesFromPantry → reuse
// recipe-ideas-dialog for the cards.
const pantryDialog = $('pantry-dialog');
$('recipe-pantry-btn')?.addEventListener('click', () => pantryDialog?.showModal());
$('pantry-close')?.addEventListener('click', (e) => { e.preventDefault(); pantryDialog?.close(); });
// Grocery list dialog: aggregates ingredients across the recipes ticked
// in the recipes-list. If nothing is ticked, takes ALL recipes (the
// "list all my recipes" weekly-shopping use case).
const groceryDialog = $('grocery-dialog');
async function openGroceryList() {
  const all = await listRecipes().catch(() => []);
  const checked = Array.from(document.querySelectorAll('#recipes-list .tpl-pick:checked'));
  const ids = new Set(checked.map((el) => el.dataset.recipeId));
  const picked = ids.size > 0 ? all.filter((r) => ids.has(r.id)) : all;
  if (picked.length === 0) { toast(t('groceryEmpty'), 'warn'); return; }
  const items = aggregateGroceryList(picked);
  const list = $('grocery-list');
  const text = $('grocery-text');
  const source = $('grocery-source');
  if (source) source.textContent = t('grocerySource', { n: picked.length });
  if (list) {
    list.textContent = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.className = 'tpl-item';
      const name = document.createElement('strong');
      name.textContent = it.name;
      const grams = document.createElement('span');
      grams.className = 'tpl-kcal';
      grams.textContent = it.grams > 0 ? `${it.grams} g` : '';
      li.appendChild(name);
      li.appendChild(grams);
      list.appendChild(li);
    }
  }
  // R34.N4: honour the markdown checkbox for checkbox-style output.
  const useMd = !!$('grocery-markdown')?.checked;
  if (text) text.value = formatGroceryList(items, { markdown: useMd });
  // Share btn falls back to clipboard via shareOrCopy, so it's useful
  // on every platform — just reveal it when the dialog opens.
  const shareBtn = $('grocery-share');
  if (shareBtn) show(shareBtn);
  groceryDialog?.showModal();
}

$('recipe-grocery-btn')?.addEventListener('click', openGroceryList);
// R34.N4: re-render the textarea when the user toggles the markdown
// checkbox. We already have a reference to `items` only within
// openGroceryList; cheapest path is to re-run the aggregation.
$('grocery-markdown')?.addEventListener('change', () => openGroceryList());
$('grocery-close')?.addEventListener('click', (e) => { e.preventDefault(); groceryDialog?.close(); });
$('grocery-copy')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const text = $('grocery-text')?.value || '';
  try {
    await navigator.clipboard?.writeText(text);
    // R16.5: success → 'ok' for stripe consistency.
    toast(t('groceryCopied'), 'ok');
  } catch {
    // Fallback: select the textarea so the user can copy manually.
    $('grocery-text')?.select();
  }
});
$('grocery-share')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const text = $('grocery-text')?.value || '';
  if (!text) return;
  await shareOrCopy({
    title: t('groceryTitle'),
    text,
    toasts: { copied: t('groceryCopied'), failed: t('groceryShareFailed') },
    toast,
  });
});

// ─────────────────────────────────────────────────────────────────────
// Meal plan dialog — 7-day grid, slot picker per cell.
// Storage is /features/meal-plan.js (localStorage). Recipes attached
// to a slot can be one-tap-applied to today's consumption log.
// ─────────────────────────────────────────────────────────────────────
const mealPlanDialog = $('meal-plan-dialog');

async function renderMealPlan() {
  const grid = $('meal-plan-grid');
  if (!grid) return;
  grid.textContent = '';
  const dates = weekDates();
  const recipes = await listRecipes().catch(() => []);
  const templates = await listTemplates().catch(() => []);
  const locale = localeFor(currentLang);
  const mealLabels = {
    breakfast: t('mealBreakfast'),
    lunch: t('mealLunch'),
    dinner: t('mealDinner'),
    snack: t('mealSnack'),
  };

  for (const date of dates) {
    const day = getDayPlan(date);
    const card = document.createElement('article');
    card.className = 'meal-plan-day';
    const head = document.createElement('header');
    head.className = 'meal-plan-day-head';
    const dt = new Date(`${date}T12:00:00`);
    head.textContent = dateFormatter(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(dt);
    card.appendChild(head);

    for (const meal of MEAL_PLAN_MEALS) {
      const row = document.createElement('div');
      row.className = 'meal-plan-row';
      const label = document.createElement('span');
      label.className = 'meal-plan-meal';
      label.textContent = mealLabels[meal];
      row.appendChild(label);

      const select = document.createElement('select');
      select.className = 'meal-plan-pick';
      select.setAttribute('aria-label', `${mealLabels[meal]} ${date}`);
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '—';
      select.appendChild(noneOpt);
      const recipeGroup = document.createElement('optgroup');
      recipeGroup.label = t('mealPlanGroupRecipes');
      for (const r of recipes) {
        const o = document.createElement('option');
        o.value = `recipe:${r.id}`;
        o.textContent = r.name;
        recipeGroup.appendChild(o);
      }
      if (recipes.length > 0) select.appendChild(recipeGroup);
      const tplGroup = document.createElement('optgroup');
      tplGroup.label = t('mealPlanGroupTemplates');
      for (const tpl of templates) {
        const o = document.createElement('option');
        o.value = `template:${tpl.id}`;
        o.textContent = tpl.name;
        tplGroup.appendChild(o);
      }
      if (templates.length > 0) select.appendChild(tplGroup);

      // Note option (free text) — selecting it opens a prompt.
      const noteOpt = document.createElement('option');
      noteOpt.value = 'note:new';
      noteOpt.textContent = t('mealPlanNoteOption');
      select.appendChild(noteOpt);

      // Pre-select what's already in the plan.
      const slot = day[meal];
      if (slot?.kind === 'recipe') select.value = `recipe:${slot.id}`;
      else if (slot?.kind === 'template') select.value = `template:${slot.id}`;
      else if (slot?.kind === 'note') {
        // Inject a synthetic option so the current note shows up.
        const o = document.createElement('option');
        o.value = `note:current`;
        o.textContent = `📝 ${slot.text.slice(0, 40)}`;
        // R18.3: full note text in title attr so users can hover /
        // long-press the select to see notes longer than 40 chars
        // without opening the edit prompt.
        if (slot.text.length > 40) o.title = slot.text;
        select.appendChild(o);
        select.value = 'note:current';
      }

      select.addEventListener('change', () => {
        const v = select.value;
        if (!v) { setSlot(date, meal, null); renderMealPlan(); return; }
        if (v.startsWith('recipe:')) {
          const id = v.slice('recipe:'.length);
          const r = recipes.find((x) => x.id === id);
          if (r) setSlot(date, meal, { kind: 'recipe', id, name: r.name });
        } else if (v.startsWith('template:')) {
          const id = v.slice('template:'.length);
          const tpl = templates.find((x) => x.id === id);
          if (tpl) setSlot(date, meal, { kind: 'template', id, name: tpl.name });
        } else if (v === 'note:new') {
          const text = window.prompt(t('mealPlanNotePrompt'));
          if (text && text.trim()) setSlot(date, meal, { kind: 'note', text: text.trim() });
        } else if (v === 'note:current') {
          // Open prompt pre-filled with the existing text so users can
          // edit, not just replace blindly. Empty input clears the slot.
          const text = window.prompt(t('mealPlanNotePrompt'), slot?.text ?? '');
          if (text === null) { renderMealPlan(); return; } // user cancelled
          if (!text.trim()) setSlot(date, meal, null);
          else setSlot(date, meal, { kind: 'note', text: text.trim() });
        }
        renderMealPlan();
      });

      row.appendChild(select);
      card.appendChild(row);
    }

    // Per-day action row: "Apply to log" + "Clear". Apply materialises
    // every recipe/template slot of THIS date into real consumption
    // entries, so the forward plan becomes today's log in one tap. Only
    // enabled for today / future days — applying a past day would confuse
    // the history.
    const actions = document.createElement('div');
    actions.className = 'meal-plan-day-actions';

    const today = isoToday();
    const isTodayOrFuture = date >= today;
    const hasSlots = Object.keys(day).length > 0;

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'chip-btn accent compact';
    applyBtn.textContent = t('mealPlanApplyDay');
    applyBtn.disabled = !isTodayOrFuture || !hasSlots;
    applyBtn.addEventListener('click', async () => {
      await applyPlanDayToLog(date, day, recipes, templates);
      await renderDashboard();
      // R18.2: date in the toast is now locale-formatted ("Thu 23 Apr"
      // instead of "2026-04-23") so the feedback reads naturally.
      const prettyDate = dateFormatter(locale, {
        weekday: 'short', day: 'numeric', month: 'short',
      }).format(new Date(`${date}T12:00:00`));
      toast(t('mealPlanApplyToast', { count: Object.keys(day).length, date: prettyDate }), 'ok');
    });
    actions.appendChild(applyBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'secondary compact meal-plan-clear-day';
    clearBtn.textContent = t('mealPlanClearDay');
    // R18.1: confirm before wiping the day. Previously a stray tap
    // would silently delete the whole day's plan. Only confirms when
    // there is actually something to clear.
    clearBtn.addEventListener('click', () => {
      if (hasSlots && !window.confirm(t('mealPlanClearDayConfirm'))) return;
      clearDay(date);
      renderMealPlan();
    });
    actions.appendChild(clearBtn);

    card.appendChild(actions);
    grid.appendChild(card);
  }
}

/**
 * Materialise a single day of the meal plan into consumption entries.
 * Recipe slots aggregate their components like `recipeApply` does; template
 * slots expand via `expandTemplate`; note slots are ignored (they're not
 * loggable).
 */
async function applyPlanDayToLog(date, day, recipes, templates) {
  const timestamp = new Date(`${date}T12:00:00`).getTime();
  for (const meal of MEAL_PLAN_MEALS) {
    const slot = day[meal];
    if (!slot) continue;
    if (slot.kind === 'recipe') {
      const r = recipes.find((x) => x.id === slot.id);
      if (!r) continue;
      const agg = aggregateRecipe(r, r.servings || 1);
      try {
        await putEntry({
          id: globalThis.crypto?.randomUUID?.() ?? `p${timestamp}${Math.random().toString(36).slice(2)}`,
          date,
          timestamp,
          meal,
          ...agg,
        });
      } catch { /* skip bad */ }
    } else if (slot.kind === 'template') {
      const tpl = templates.find((x) => x.id === slot.id);
      if (!tpl) continue;
      const entries = expandTemplate(tpl, { date, meal, timestamp });
      for (const entry of entries) {
        try { await putEntry(entry); } catch { /* skip */ }
      }
    }
    // note slots are intentionally skipped
  }
}

$('meal-plan-btn')?.addEventListener('click', async () => {
  await renderMealPlan();
  mealPlanDialog?.showModal();
});
$('meal-plan-close')?.addEventListener('click', (e) => { e.preventDefault(); mealPlanDialog?.close(); });
$('meal-plan-clear')?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!window.confirm(t('mealPlanClearConfirm'))) return;
  clearMealPlan();
  await renderMealPlan();
});
$('meal-plan-grocery')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const dates = weekDates();
  const recipes = await listRecipes().catch(() => []);
  const planned = planRecipes(dates, recipes);
  if (planned.length === 0) { toast(t('mealPlanNoRecipes'), 'warn'); return; }
  const items = aggregateGroceryList(planned);
  const list = $('grocery-list');
  const text = $('grocery-text');
  const source = $('grocery-source');
  if (source) source.textContent = t('grocerySource', { n: planned.length });
  if (list) {
    list.textContent = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.className = 'tpl-item';
      const name = document.createElement('strong');
      name.textContent = it.name;
      const grams = document.createElement('span');
      grams.className = 'tpl-kcal';
      grams.textContent = it.grams > 0 ? `${it.grams} g` : '';
      li.appendChild(name);
      li.appendChild(grams);
      list.appendChild(li);
    }
  }
  if (text) text.value = formatGroceryList(items);
  const shareBtn = $('grocery-share');
  if (shareBtn) {
    if (typeof navigator.share === 'function') show(shareBtn); else hide(shareBtn);
  }
  mealPlanDialog?.close();
  groceryDialog?.showModal();
});

$('pantry-submit')?.addEventListener('click', async () => {
  const raw = ($('pantry-input')?.value || '').trim();
  if (!raw) { $('pantry-status').textContent = t('pantryEmpty'); return; }
  // Accept newline OR comma separators; normalise + dedupe + cap at 20.
  const seen = new Set();
  const pantry = [];
  for (const s of raw.split(/[\n,]+/)) {
    const v = s.trim();
    if (v.length < 2) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    pantry.push(v);
    if (pantry.length >= 20) break;
  }
  if (pantry.length === 0) { $('pantry-status').textContent = t('pantryEmpty'); return; }
  $('pantry-status').textContent = '';
  pantryDialog?.close();
  // R22.1: recipes dialog should also close so the card view has
  // space. Since R9.1 `recipesDialog` is a module handle, not the
  // DOM element — call through the DOM directly.
  document.getElementById('recipes-dialog')?.close();
  await openPantryIdeas(pantry);
});

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

    const offCandidates = await searchOFFByCategory([tag], { pageSize: 20 });
    // Fix #21: fold user's saved recipes into the candidate pool so
    // the alternatives panel can surface a home-made recipe that
    // out-scores the scanned packaged product. Recipes go through
    // buildRecipeProductInput to produce a comparable ProductInput
    // with per-100 g nutrition + ingredients + computed grade via
    // scoreProduct (inside rankAlternatives itself).
    const userRecipes = await listRecipes().catch(() => []);
    const recipeCandidates = userRecipes
      .filter((r) => (r.components?.length ?? 0) > 0)
      .map((r) => buildRecipeProductInput(r))
      .map((pi) => ({ ...pi, _userRecipe: true }));
    const candidates = [...offCandidates, ...recipeCandidates];
    if (candidates.length === 0) return;

    const dietFilter = profile?.diet && profile.diet !== 'none'
      ? (p) => checkDiet(p, profile.diet, profile.custom_diet, currentLang).compliant
      : undefined;
    const alts = rankAlternatives(product, candidates, { max: 3, dietFilter });
    if (alts.length === 0) return;

    for (const { product: alt, audit: altAudit } of alts) {
      const li = document.createElement('li');
      li.className = 'alt-item';
      if (alt._userRecipe) li.dataset.source = 'recipe';
      const grade = document.createElement('span');
      grade.className = 'alt-grade';
      grade.dataset.grade = altAudit.grade;
      grade.textContent = altAudit.grade;
      const meta = document.createElement('div');
      meta.className = 'alt-meta';
      const name = document.createElement('strong');
      name.className = 'alt-name';
      // Tag user recipes with 🍽 prefix so the source is obvious.
      name.textContent = alt._userRecipe ? `🍽 ${alt.name}` : alt.name;
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
      // R15.1: "Source :" was hard-coded French. The source text
      // itself is scientific reference data (locale-neutral) but the
      // label was leaking French to EN users every time they opened
      // an additive explanation.
      if (info.source) parts.push(`\n\n${t('sourceLabel')} ${info.source}`);
      explainBody.textContent = parts.join('');
      explainDialog.showModal();
    });
  }
  return li;
}

function renderIngredients(product) {
  ensureAdditivesIndex();
  const host = $('ingredient-list');
  host.textContent = '';
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
  const ul = $('nutrition-list'); ul.textContent = '';
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
  const ul = $(id); ul.textContent = '';
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
  pillarDialogList.textContent = '';
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
  if (!lastData) return;
  const text = t('shareText', {
    name: lastData.audit.product_name || t('productFallbackName'),
    score: lastData.audit.score,
    grade: lastData.audit.grade,
  });
  await shareOrCopy({
    title: 'Scann-eat',
    text,
    toasts: { copied: t('shareCopied'), failed: t('shareFailed') },
    toast,
  });
}

// Theme + reading accessibility extracted to /features/appearance.js.
// initAppearance() is called at boot below with no deps; applyTheme()
// and applyReadingPrefs() are imported so Settings-save handlers can
// re-paint without routing through initAppearance again.
initAppearance();

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

// Onboarding extracted to /features/onboarding.js. maybeShowOnboarding()
// is a no-op after first dismissal (flag in localStorage).

// ============================================================================
// Comparison
// ============================================================================

// R34.I1: compare-armed expiry. Previously, "Compare next scan" stayed
// armed forever — a user who armed it, got distracted, then scanned a
// totally unrelated product days later would see a bogus diff. Expire
// after 24 h so arming stays a session-scoped intent.
const COMPARE_ARM_TTL_MS = 24 * 60 * 60 * 1000;
const LS_COMPARE_ARMED_AT = 'scanneat.compare_armed_at';
function compareArmed() {
  if (localStorage.getItem(LS_COMPARE_ARMED) !== '1') return false;
  const armedAt = Number(localStorage.getItem(LS_COMPARE_ARMED_AT) || 0);
  if (!Number.isFinite(armedAt) || Date.now() - armedAt > COMPARE_ARM_TTL_MS) {
    localStorage.removeItem(LS_COMPARE_ARMED);
    localStorage.removeItem(LS_COMPARE_ARMED_AT);
    localStorage.removeItem(LS_COMPARE_PREV);
    return false;
  }
  return true;
}
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
  localStorage.setItem(LS_COMPARE_ARMED_AT, String(Date.now()));
  localStorage.setItem(LS_COMPARE_PREV, JSON.stringify(snapshotFromData(data)));
  compareNextBtn.textContent = t('compareWaiting');
  compareNextBtn.disabled = true;
}

// ============================================================================
// Live barcode scanner
// ============================================================================

// Camera scanner extracted to /features/scanner.js — openCameraScanner /
// closeCameraScanner are imported at the top of this file. initScanner()
// below wires the torch button (the camera stream + dialog lifecycle live
// inside the feature).

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

  personalAdjustmentsList.textContent = '';
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

// Profile dialog extracted to /features/profile-dialog.js — init in
// the boot block below. Element refs, per-field listeners, macro-sum
// validation, life-stage gate, and save pipeline live inside the module.


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
  recentListEl.textContent = '';
  if (all.length === 0) { hide(recentScansEl); return; }
  // R13.1: filter logic now lives in /core/presenters.js
  // (filterScanHistory) so it's testable under node:test.
  const items = filterScanHistory(all, {
    query: historySearchInput?.value || '',
    gradeFilter: historyGradeSelect?.value || '',
  });
  // R13.7: summary chip — "12 scans · 4A · 3B · 2C · 2D · 1F".
  // Uses the unfiltered `all` (so the chip stays stable while the
  // user filters the list), and only renders grade buckets that
  // actually have entries — keeps the chip short on a small history.
  // R15.6: each grade bucket is now a button that filters the list
  // to that grade — saves a trip through the <select>.
  const summaryEl = $('recent-summary');
  if (summaryEl) {
    summaryEl.textContent = '';
    const sum = summarizeScanHistory(all);
    const total = document.createElement('span');
    total.textContent = t('recentSummaryTotal', { n: sum.total });
    summaryEl.appendChild(total);
    const activeGrade = historyGradeSelect?.value || '';
    for (const g of ['A+', 'A', 'B', 'C', 'D', 'F']) {
      if (sum.byGrade[g] === 0) continue;
      summaryEl.appendChild(document.createTextNode(' · '));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-summary-grade';
      btn.dataset.grade = g;
      if (g === activeGrade) btn.dataset.active = 'true';
      btn.textContent = `${sum.byGrade[g]}${g}`;
      btn.setAttribute('aria-label', t('recentSummaryFilter', { n: sum.byGrade[g], grade: g }));
      btn.setAttribute('aria-pressed', g === activeGrade ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (!historyGradeSelect) return;
        // Toggle: clicking the active grade clears the filter.
        historyGradeSelect.value = (g === activeGrade) ? '' : g;
        renderRecentScans();
      });
      summaryEl.appendChild(btn);
    }
    show(summaryEl);
  }
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
    // R13.4: aria-label includes the scan name so screen-reader users
    // can disambiguate the row's delete button from the list of "×"
    // buttons. Falls back to the generic label when name is missing.
    del.setAttribute('aria-label', item.name
      ? `${t('removeFromHistory')} — ${item.name}`
      : t('removeFromHistory'));
    del.textContent = '×';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteScan(item.id);
      renderRecentScans();
    });
    li.appendChild(thumb);
    li.appendChild(meta);
    li.appendChild(del);
    // R24.1: makeActivatable adds role="button" + tabindex="0" +
    // Enter/Space keyboard handler. Previously the recent-scan items
    // were click-only — screen-reader and keyboard-only users had
    // no way to reopen a historical scan.
    makeActivatable(li, () => reopenScan(item));
    li.setAttribute('aria-label', item.name
      ? `${t('reopenScan')} — ${item.name}`
      : t('reopenScan'));
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
  if (items.length === 0) { toast(t('exportHistoryEmpty'), 'warn'); return; }
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  // R8.4: todayISO() uses the user's local date via Intl.DateTimeFormat —
  // replaces `new Date().toISOString().slice(0, 10)` which picks UTC and
  // gave western-tz users a filename for tomorrow around midnight.
  a.href = url;
  a.download = `scanneat-history-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(t('exportHistoryDone', { n: items.length }), 'ok');
});

historySearchInput?.addEventListener('input', () => renderRecentScans());
historyGradeSelect?.addEventListener('change', () => renderRecentScans());

// Keyboard shortcuts extracted to /features/keybindings.js.
initKeybindings({
  scanBtn, historySearchInput,
  quickAddBtn: $('quick-add-btn'),
  templatesBtn: $('templates-btn'),
  recipesBtn: $('recipes-btn'),
  weightBtn: $('weight-btn'),
  t, toast,
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
  // Gap fix 3: stash the add-to-recipe picker on reset.
  const atrBtn = $('add-to-recipe-btn');
  if (atrBtn) atrBtn.hidden = true;
  const atrPicker = $('add-to-recipe-picker');
  if (atrPicker) { atrPicker.hidden = true; atrPicker.textContent = ''; }
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
// Gap fix #13 — manual barcode entry. When camera is denied / fails
// or the barcode is unreadable, the user can type 8-13 digits and
// push the queue into the same pipeline as a live scan.
$('manual-barcode-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('manual-barcode-input');
  const raw = (input?.value || '').replace(/\D/g, '');
  if (raw.length !== 8 && raw.length !== 12 && raw.length !== 13) {
    toast(t('manualBarcodeInvalid'), 'warn');
    input?.focus();
    return;
  }
  // Reuse the same path as the live-scanner success handler: enqueue a
  // barcode-only queue item, then kick scanImage() which resolves
  // through OFF (or LLM fallback if the barcode is unknown).
  addBarcodeOnly(raw);
  await scanImage();
  if (input) input.value = '';
  // Collapse the <details> so the input isn't still sitting open.
  const details = input?.closest('details');
  if (details) details.open = false;
});
cameraClose?.addEventListener('click', () => closeCameraScanner());
// Tear down the MediaStream + detection loop regardless of how the dialog
// closes — Escape key, backdrop click, or programmatic close from a
// successful barcode scan all fire the 'close' event.
cameraDialog?.addEventListener('close', () => closeCameraScanner());

// Settings dialog wiring extracted to /features/settings-dialog.js —
// initialised in the boot block below.

// Backup / export / import wiring extracted to /features/backup-io.js —
// initialized below with initBackupIO({ ...deps }).

// ----- MFP / Cronometer CSV import -----
$('csv-import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  const status = $('csv-import-status');
  if (!file) return;
  if (status) status.textContent = t('csvImportLoading');
  try {
    const { parseCsvImport } = await import('/features/csv-import.js');
    const text = await file.text();
    const { format, entries, errors } = parseCsvImport(text);
    if (format === 'unknown') {
      if (status) status.textContent = t('csvImportUnknown');
      return;
    }
    let written = 0;
    for (const e of entries) {
      try { await putEntry(e); written += 1; } catch { /* skip */ }
    }
    if (status) {
      status.textContent = t('csvImportDone', {
        n: written, format, skipped: errors.length,
      });
    }
    await renderDashboard();
  } catch (err) {
    console.error('[csv import]', err);
    if (status) status.textContent = t('csvImportFailed');
  }
});

// ----- Multi-profile -----
function setProfilesStatus(text, state) {
  const el = $('profiles-status');
  if (!el) return;
  if (!text) { hide(el); return; }
  el.textContent = text;
  if (state) el.dataset.state = state;
  else delete el.dataset.state;
  show(el);
}

function renderProfilesUI() {
  const active = activeProfile();
  const list = listProfiles();
  const activeEl = $('profiles-active');
  if (activeEl) activeEl.textContent = active || '—';
  const sel = $('profiles-switch-select');
  if (sel) {
    sel.textContent = '';
    if (list.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '—';
      sel.appendChild(opt);
    }
    for (const name of list) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === active) opt.selected = true;
      sel.appendChild(opt);
    }
  }
}

$('profiles-save')?.addEventListener('click', async () => {
  const name = $('profiles-name')?.value.trim();
  if (!name) { setProfilesStatus(t('profilesNoName'), 'error'); return; }
  try {
    await saveProfile(name);
    renderProfilesUI();
    setProfilesStatus(t('profilesSaved', { name }));
  } catch (err) {
    console.error('[profiles save]', err);
    setProfilesStatus(err.message || String(err), 'error');
  }
});

$('profiles-switch')?.addEventListener('click', async () => {
  const name = $('profiles-switch-select')?.value;
  if (!name) return;
  try {
    await switchProfile(name);
    renderProfilesUI();
    setProfilesStatus(t('profilesSwitched', { name }));
    // Re-render everything that depends on profile / stored data.
    await renderRecentScans();
    await renderDashboard();
    await renderWeightSummary(getProfile());
    applyTheme();
    applyReadingPrefs();
  } catch (err) {
    console.error('[profiles switch]', err);
    setProfilesStatus(err.message || String(err), 'error');
  }
});

// ----- Telemetry (local-only log) -----
$('telemetry-enabled')?.addEventListener('change', (e) => {
  telemetrySetEnabled(!!e.target.checked);
});
$('telemetry-view')?.addEventListener('click', () => {
  const out = $('telemetry-output');
  if (!out) return;
  out.textContent = telemetryFormat();
  show(out);
});
$('telemetry-copy')?.addEventListener('click', async () => {
  // Route via shareOrCopy so a native share sheet is offered on mobile
  // (iOS Mail / Android messenger = easy way for the user to file a bug
  // report). Clipboard is the fallback everywhere else.
  await shareOrCopy({
    title: t('telemetryTitle'),
    text: telemetryFormat(),
    toasts: { copied: t('telemetryCopied'), failed: t('telemetryCopyFailed') },
    toast,
  });
});
// R7.3: Export as a downloadable .txt file. Useful when the user wants
// to attach the log to an email or issue report without copy-paste.
$('telemetry-export')?.addEventListener('click', () => {
  const text = telemetryFormat();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scanneat-telemetry-${todayISO()}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(t('telemetryExported'), 'ok');
});
$('telemetry-clear')?.addEventListener('click', () => {
  if (!window.confirm(t('telemetryClearConfirm'))) return;
  telemetryClear();
  const out = $('telemetry-output');
  if (out) { out.textContent = ''; hide(out); }
  toast(t('telemetryCleared'), 'ok');
});

$('profiles-delete')?.addEventListener('click', () => {
  const name = $('profiles-switch-select')?.value;
  if (!name) return;
  deleteProfile(name);
  renderProfilesUI();
  setProfilesStatus(t('profilesDeleted', { name }));
});

updateDismissBtn?.addEventListener('click', () => {
  const tag = updateVersionEl.textContent || '';
  if (tag) localStorage.setItem(LS_DISMISSED_VERSION, tag);
  hide(updateBanner);
});

pendingRetry?.addEventListener('click', () => { retryPending(); });

// Share button is now useful even without Web Share — it falls back to
// clipboard via shareOrCopy(). No need to hide it on unsupported browsers.
shareBtn?.addEventListener('click', shareCurrentScan);

// Gap fix 3 — add the current scanned product as a component to one
// of the user's saved recipes. Surfaces a small inline picker of
// every saved recipe; picking one appends a row carrying the
// product's per-100 g macros (+ all R34 micros when OFF reports
// them) and persists via saveRecipe (upsert by id).
$('add-to-recipe-btn')?.addEventListener('click', async () => {
  const picker = $('add-to-recipe-picker');
  if (!picker) return;
  if (!lastData?.product) { toast(t('logNoScan'), 'warn'); return; }
  // Toggle close-on-second-click.
  if (!picker.hidden) { picker.hidden = true; picker.textContent = ''; return; }
  const recipes = await listRecipes().catch(() => []);
  picker.textContent = '';
  if (recipes.length === 0) {
    const hint = document.createElement('li');
    hint.className = 'add-to-recipe-empty';
    hint.textContent = t('addToRecipeNoRecipes');
    picker.appendChild(hint);
    picker.hidden = false;
    return;
  }
  const header = document.createElement('li');
  header.className = 'add-to-recipe-header';
  header.textContent = t('addToRecipePickTitle');
  picker.appendChild(header);
  for (const r of recipes) {
    const li = document.createElement('li');
    li.className = 'add-to-recipe-item';
    li.setAttribute('role', 'option');
    li.textContent = r.name || t('untitledRecipe');
    li.addEventListener('click', async () => {
      try {
        const p = lastData.product;
        const n = p.nutrition || {};
        // Component shape mirrors saveRecipe's writer (it strips
        // through the RECIPE_MICRO_FIELDS list and zeros missing
        // values). Grams default to 100 so aggregateRecipe's
        // per-100g math stays correct until the user tweaks them.
        const component = {
          product_name: p.name || t('untitledRecipe'),
          grams: 100,
          kcal: Number(n.energy_kcal) || 0,
          carbs_g: Number(n.carbs_g) || 0,
          fat_g: Number(n.fat_g) || 0,
          sat_fat_g: Number(n.saturated_fat_g) || 0,
          sugars_g: Number(n.sugars_g) || 0,
          protein_g: Number(n.protein_g) || 0,
          salt_g: Number(n.salt_g) || 0,
          fiber_g: Number(n.fiber_g) || 0,
          iron_mg: Number(n.iron_mg) || 0,
          calcium_mg: Number(n.calcium_mg) || 0,
          magnesium_mg: Number(n.magnesium_mg) || 0,
          potassium_mg: Number(n.potassium_mg) || 0,
          zinc_mg: Number(n.zinc_mg) || 0,
          sodium_mg: Number(n.sodium_mg) || 0,
          vit_a_ug: Number(n.vit_a_ug) || 0,
          vit_c_mg: Number(n.vit_c_mg) || 0,
          vit_d_ug: Number(n.vit_d_ug) || 0,
          vit_e_mg: Number(n.vit_e_mg) || 0,
          vit_k_ug: Number(n.vit_k_ug) || 0,
          b1_mg: Number(n.b1_mg) || 0,
          b2_mg: Number(n.b2_mg) || 0,
          b3_mg: Number(n.b3_mg) || 0,
          b6_mg: Number(n.b6_mg) || 0,
          b9_ug: Number(n.b9_ug) || 0,
          b12_ug: Number(n.b12_ug) || 0,
          polyunsaturated_fat_g: Number(n.polyunsaturated_fat_g) || 0,
          monounsaturated_fat_g: Number(n.monounsaturated_fat_g) || 0,
          omega_3_g: Number(n.omega_3_g) || 0,
          omega_6_g: Number(n.omega_6_g) || 0,
          cholesterol_mg: Number(n.cholesterol_mg) || 0,
        };
        await saveRecipe({
          id: r.id,
          name: r.name,
          servings: r.servings || 1,
          components: [...(r.components || []), component],
        });
        picker.hidden = true;
        picker.textContent = '';
        toast(t('addToRecipeDone', {
          food: component.product_name,
          recipe: r.name || t('untitledRecipe'),
        }), 'ok');
      } catch (err) { console.error('[add-to-recipe]', err); }
    });
    picker.appendChild(li);
  }
  picker.hidden = false;
});

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
// Gap fix #10: mark the dashboard regions as busy on boot so the CSS
// skeleton placeholders paint before the first real render. Cleared
// on the first successful render.
dashboardRows?.setAttribute('aria-busy', 'true');
dashboardEntries?.setAttribute('aria-busy', 'true');
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
  // R13.1 — `(paquet)` was hard-coded French; EN users saw a French
  // word in an otherwise-translated UI. Now resolved via t().
  // R13.8 — also surface a half-pack chip when the package is large
  // enough to make halving meaningful (≥40 g, so we don't show
  // "8 g (½ paquet)" for a tiny chocolate square).
  const halfPackEl = $('portion-preset-half-pack');
  if (weight && weight > 0 && weight < 2000) {
    portionPresetPack.textContent = t('portionPack', { g: weight });
    portionPresetPack.dataset.portion = String(weight);
    portionPresetPack.hidden = false;
    if (halfPackEl) {
      if (weight >= 40) {
        const half = Math.round(weight / 2);
        halfPackEl.textContent = t('portionHalfPack', { g: half });
        halfPackEl.dataset.portion = String(half);
        halfPackEl.hidden = false;
      } else {
        halfPackEl.hidden = true;
      }
    }
  } else {
    portionPresetPack.hidden = true;
    if (halfPackEl) halfPackEl.hidden = true;
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

// Unit conversion — cup/tbsp/oz → grams, density-aware via the
// current scan's product name when available.
function applyUnitConvert() {
  const input = $('unit-convert-input');
  const out = $('unit-convert-result');
  const raw = (input?.value || '').trim();
  if (!raw) return;
  const parsed = parseUnitInput(raw);
  const foodName = parsed?.name || lastData?.product?.name || '';
  const grams = parsed ? toGrams(parsed.amount, parsed.unit, foodName) : null;
  if (!grams || grams <= 0) {
    if (out) {
      out.textContent = t('unitConvertBadInput');
      out.dataset.state = 'warn';
      out.hidden = false;
    }
    return;
  }
  portionInput.value = String(Math.round(grams));
  if (lastData) updateLogPreview(lastData.product);
  if (out) {
    out.textContent = t('unitConvertResult', {
      amount: parsed.amount, unit: parsed.unit,
      name: foodName || t('unitConvertNoName'),
      grams: Math.round(grams),
    });
    delete out.dataset.state;
    out.hidden = false;
  }
}
$('unit-convert-apply')?.addEventListener('click', applyUnitConvert);
$('unit-convert-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); applyUnitConvert(); }
});

// Fix #26 — check if a fast is in progress. Reads the same LS keys
// as /features/fasting.js. Used by logBtn + qaSave to surface a
// non-blocking warn so the user can still log if they choose (app
// respects autonomy — the fasting feature is self-reported, not a
// hard constraint).
function isFastingInProgress() {
  const start = Number(localStorage.getItem('scanneat.fasting.start')) || 0;
  if (start <= 0) return false;
  const targetH = Number(localStorage.getItem('scanneat.fasting.target')) || 16;
  const elapsedH = (Date.now() - start) / 3_600_000;
  // Consider "in progress" only while still within the target window;
  // past target is "completion window" where logging shouldn't nag.
  return elapsedH >= 0 && elapsedH < targetH;
}

logBtn?.addEventListener('click', async () => {
  // R10.3: tell the user *why* the log button is a no-op when they
  // click it without a scanned product. Previously silent — looked
  // like a broken button until the user figured out they needed to
  // scan first.
  if (!lastData) { toast(t('logNoScan'), 'warn'); return; }
  const grams = Math.max(0, Number(portionInput.value) || 0);
  if (grams <= 0) { toast(t('logNeedsGrams'), 'warn'); return; }
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
    // Fix #26 — warn (non-blocking) when logging during a fast.
    if (isFastingInProgress()) toast(t('fastingActiveWarn'), 'warn');
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
  // R35.I1: clicking "+" always resets the edit state — user is
  // adding a new entry, not continuing an edit.
  editingEntry = null;
  // reset fields
  for (const id of ['qa-name', 'qa-kcal', 'qa-carbs', 'qa-protein', 'qa-fat', 'qa-satfat', 'qa-sugars', 'qa-salt', 'qa-fiber']) {
    const el = $(id);
    if (el) el.value = '';
  }
  // pick a default meal by time-of-day
  if ($('qa-meal')) $('qa-meal').value = defaultMealForHour(new Date().getHours());
  // Reset the dialog title back to default from any prior edit.
  const title = $('quick-add-dialog-title');
  if (title) title.textContent = t('quickAddTitle');
  quickAddDialog.showModal();
});
qaCancel?.addEventListener('click', (e) => {
  e.preventDefault();
  editingEntry = null;
  quickAddDialog.close();
});

// Voice-dictate extracted to /features/voice-dictate.js — initialized below
// with initVoiceDictate({ t, currentLang, parseVoiceQuickAdd }).

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

// Shared helper for the three qa-photo-* flows. Takes the image payload
// and runs it through either the direct-mode engine export or the
// server-mode endpoint — per the user's current /settings-mode choice.
// Centralises the 429 translation so callers don't each re-implement it.
async function identifyViaModePath({ images, directFn, serverUrl }) {
  const mode = getMode();
  if (mode === 'direct') {
    const engine = await loadEngine();
    const key = getKey();
    if (!key) throw new Error(t('errMissingKey'));
    try {
      return await directFn(engine, images, { apiKey: key });
    } catch (err) {
      if (err?.status === 429) throw new Error(t('errRateLimit'));
      throw err;
    }
  }
  const res = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429 || body.error === 'rate_limit') {
      throw new Error(t('errRateLimit'));
    }
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

qaPhotoInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = ''; // allow re-selecting the same file
  if (!file) return;
  setQaStatus(t('identifyingFood'));
  try {
    const compressed = await compressImage(file);
    const images = [{ base64: compressed.base64, mime: compressed.mime }];
    const result = await identifyViaModePath({
      images,
      directFn: (engine, imgs, opts) => engine.identifyFood(imgs, opts),
      serverUrl: '/api/identify',
    });
    // Reconcile with the built-in DB: if the identified name matches a
    // CIQUAL entry, swap the LLM's guessed macros for the DB's authoritative
    // per-100 g values scaled by the LLM's gram estimate.
    const reconciled = reconcileWithFoodDB(result, listCustomFoods());
    const setField = (id, v) => { const el = $(id); if (el && v != null) el.value = String(v); };
    setField('qa-name',    reconciled.name);
    setField('qa-kcal',    Math.round(reconciled.kcal));
    setField('qa-protein', Math.round(reconciled.protein_g));
    setField('qa-carbs',   Math.round(reconciled.carbs_g));
    setField('qa-fat',     Math.round(reconciled.fat_g));
    if (reconciled.source === 'db') {
      setQaStatus(t('identifyMatchedDB', { name: reconciled.name }), 'ok');
    } else if (reconciled.confidence === 'low') {
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
    const images = [{ base64: compressed.base64, mime: compressed.mime }];
    const result = await identifyViaModePath({
      images,
      directFn: (engine, imgs, opts) => engine.identifyMultiFood(imgs, opts),
      serverUrl: '/api/identify-multi',
    });
    const items = Array.isArray(result?.items) ? result.items : [];
    if (items.length === 0) {
      setQaStatus(t('identifyMultiEmpty'), 'warn');
      return;
    }
    const meal = $('qa-meal')?.value || defaultMealForHour(new Date().getHours());
    let dbHits = 0;
    const reconciled = [];
    for (const it of items) {
      const r = reconcileWithFoodDB(it, listCustomFoods());
      if (r.source === 'db') dbHits += 1;
      reconciled.push(r);
      await logQuickAdd({
        name: r.name,
        meal,
        kcal: Math.round(r.kcal) || 0,
        protein_g: Math.round(r.protein_g) || 0,
        carbs_g: Math.round(r.carbs_g) || 0,
        fat_g: Math.round(r.fat_g) || 0,
        sat_fat_g: 0,
        sugars_g: 0,
        salt_g: 0,
      });
    }
    // Stash the plate so the Recipes dialog can offer a "from last plate
    // scan" shortcut — one tap to save the same components as a reusable
    // recipe going forward. Ownership moved into /features/recipes-dialog.js
    // in R9 — this handler just pushes the items through the setter.
    recipesDialog.setLastIdentifiedPlate(reconciled);
    quickAddDialog?.close();
    await renderDashboard();
    toast(t('identifyMultiToast', { n: items.length, db: dbHits }), 'ok');
  } catch (err) {
    console.warn('[identifyMultiFood]', err);
    setQaStatus(t('identifyFailed'), 'error');
  }
});

// Menu-scan dialog + picker extracted to /features/menu-scan.js.
// openMenuScan is imported at the top; initMenuScan wires the close
// button in the boot block below.

$('qa-photo-menu-input')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  setQaStatus(t('identifyingMenu'));
  try {
    const compressed = await compressImage(file);
    const images = [{ base64: compressed.base64, mime: compressed.mime }];
    const result = await identifyViaModePath({
      images,
      directFn: (engine, imgs, opts) => engine.identifyMenu(imgs, opts),
      serverUrl: '/api/identify-menu',
    });
    const dishes = Array.isArray(result?.dishes) ? result.dishes : [];
    if (dishes.length === 0) {
      setQaStatus(t('menuScanEmpty'), 'warn');
      return;
    }
    hide(qaAiStatus);
    quickAddDialog?.close();
    await openMenuScan(dishes);
  } catch (err) {
    console.warn('[identifyMenu]', err);
    setQaStatus(t('identifyFailed'), 'error');
  }
});

// menu-scan-close handled inside initMenuScan().

// Reset AI status when the dialog opens (via the quick-add button).
quickAddBtn?.addEventListener('click', () => hide(qaAiStatus));

// Quick Add name autocomplete extracted to /features/qa-autocomplete.js.
// initQaAutocomplete is imported at the top; wired in the boot block.

// Weight UI is extracted to /features/weight.js. renderWeightSummary is
// imported and called from the dashboard render loop; initWeight wires
// up the dialog at boot.

// Meal-templates dialog extracted to /features/templates-dialog.js.
// initTemplatesDialog is imported at the top; the wire-up happens in
// the boot block alongside the other feature inits.

// Recipes dialog + editor extracted to /features/recipes-dialog.js.
// initRecipesDialog is imported at the top; the module owns the state
// (editingRecipe, lastIdentifiedPlate) and exposes setLastIdentifiedPlate
// so the qa-photo-multi handler above can push the latest plate items
// without poking shared module-scoped variables. Assigned in the boot
// block below; the handler only reads it at click time, so the TDZ
// gap between module-top and boot is safe.

function readQaForm() {
  return {
    name: $('qa-name')?.value || '',
    meal: $('qa-meal')?.value || 'snack',
    kcal: Number($('qa-kcal')?.value) || 0,
    carbs_g: Number($('qa-carbs')?.value) || 0,
    protein_g: Number($('qa-protein')?.value) || 0,
    fat_g: Number($('qa-fat')?.value) || 0,
    sat_fat_g: Number($('qa-satfat')?.value) || 0,
    sugars_g: Number($('qa-sugars')?.value) || 0,
    salt_g: Number($('qa-salt')?.value) || 0,
    fiber_g: Number($('qa-fiber')?.value) || 0,
  };
}

// R35.I1+I9: editing state for the Quick Add dialog. When set, the
// save handler upserts the existing entry (preserving its id + date +
// timestamp, letting the user change grams/macros/meal) instead of
// creating a new one. Null = "add new" flow.
let editingEntry = null;

qaSave?.addEventListener('click', async (e) => {
  e.preventDefault();
  const f = readQaForm();
  // Fix #22 — reconcile typed Quick Add against the built-in food DB
  // when kcal is empty. A user who typed "pomme" + left macros blank
  // used to see the save rejected; now we try a FOOD_DB match and
  // fill in per-100 g macros (defaulting portion to 100 g). Matches
  // the existing LLM-identify reconciliation path.
  if (f.kcal <= 0 && f.name && f.name.trim().length >= 2) {
    const reconciled = reconcileWithFoodDB(
      { name: f.name, estimated_grams: 100 },
      listCustomFoods(),
    );
    if (reconciled?.source === 'db') {
      f.kcal = Math.round(reconciled.kcal) || 0;
      f.protein_g = Math.round(reconciled.protein_g) || 0;
      f.carbs_g = Math.round(reconciled.carbs_g) || 0;
      f.fat_g = Math.round(reconciled.fat_g) || 0;
      // Reflect in the form so the user sees what got filled.
      $('qa-kcal').value    = String(f.kcal);
      $('qa-protein').value = String(f.protein_g);
      $('qa-carbs').value   = String(f.carbs_g);
      $('qa-fat').value     = String(f.fat_g);
    }
  }
  if (f.kcal <= 0) { $('qa-kcal')?.focus(); return; }
  try {
    if (editingEntry) {
      // R35.I1: upsert the existing entry with the user's edits.
      // Preserves id / date / timestamp / fromRecipe so the row stays
      // in its original meal slot unless the user changed `meal`, and
      // doesn't jump to today's date when edited tomorrow.
      await putEntry({
        ...editingEntry,
        product_name: f.name || editingEntry.product_name,
        meal: f.meal,
        kcal: f.kcal,
        carbs_g: f.carbs_g,
        protein_g: f.protein_g,
        fat_g: f.fat_g,
        sat_fat_g: f.sat_fat_g,
        sugars_g: f.sugars_g,
        salt_g: f.salt_g,
        fiber_g: f.fiber_g,
      });
      toast(t('entryUpdated', { name: f.name || editingEntry.product_name }), 'ok');
      editingEntry = null;
    } else {
      await logQuickAdd(f);
    }
    // Gap fixes #24 + #25: after logging, surface a non-blocking
    // warning if the typed name triggers allergen or diet rules. Does
    // not prevent the save — respects user autonomy, just informs.
    try {
      const warn = checkQuickAddWarnings(f.name, getProfile(), currentLang);
      if (warn.allergens.length > 0) {
        toast(t('qaAllergenWarn', { items: warn.allergens.map((a) => a.label).join(' · ') }), 'warn');
      } else if (warn.dietViolations.length > 0) {
        toast(t('qaDietWarn', { items: warn.dietViolations.slice(0, 2).join(' · ') }), 'warn');
      }
    } catch { /* never block the save */ }
    // Fix #26 — fasting-window warn (non-blocking).
    if (isFastingInProgress()) toast(t('fastingActiveWarn'), 'warn');
    quickAddDialog.close();
    await renderDashboard();
  } catch (err) {
    console.error('[quickAdd]', err);
  }
});

// Save-as-template: turn whatever the user has typed into a reusable
// template without actually logging it. Useful for recurring snacks /
// dinners the user re-enters weekly — one tap later via the templates
// dialog re-applies the same shape. We reuse the name field for the
// template name, which is the intuitive pick.
$('qa-save-tpl')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const f = readQaForm();
  if (!f.name.trim() || f.kcal <= 0) {
    setQaStatus(t('qaSaveAsTemplateNeedsName'), 'warn');
    return;
  }
  try {
    await saveTemplate({
      name: f.name.trim(),
      meal: f.meal,
      items: [{
        product_name: f.name,
        grams: 0,
        meal: f.meal,
        kcal: f.kcal,
        carbs_g: f.carbs_g,
        protein_g: f.protein_g,
        fat_g: f.fat_g,
        sat_fat_g: f.sat_fat_g,
        sugars_g: f.sugars_g,
        salt_g: f.salt_g,
        quickAdd: true,
      }],
    });
    setQaStatus(t('qaSaveAsTemplateDone', { name: f.name.trim() }), 'ok');
  } catch (err) {
    console.error('[quickAdd save-as-template]', err);
    setQaStatus(t('qaSaveAsTemplateFailed'), 'error');
  }
});

// Gap fix #6: copy yesterday's entries into today. Skips the step
// of re-applying templates one by one for users with a repeating
// routine. Gracefully no-ops when yesterday was empty. Entries get
// fresh ids + today's date + current timestamp so they look like
// freshly-logged rows, but keep their product_name / grams /
// macros / meal so the "shape" of the day comes forward.
$('copy-yesterday')?.addEventListener('click', async () => {
  const today = todayISO();
  const yesterday = localDateISO(Date.now() - 86_400_000);
  const src = await listByDate(yesterday).catch(() => []);
  if (src.length === 0) { toast(t('copyYesterdayEmpty'), 'warn'); return; }
  const existing = await listByDate(today).catch(() => []);
  if (existing.length > 0) {
    if (!window.confirm(t('copyYesterdayConfirm', { n: src.length, existing: existing.length }))) return;
  }
  const now = Date.now();
  const copied = [];
  for (let i = 0; i < src.length; i++) {
    const e = src[i];
    const copy = {
      ...e,
      id: globalThis.crypto?.randomUUID?.() ?? `c${now}${i}${Math.random().toString(36).slice(2)}`,
      date: today,
      timestamp: now + i,
    };
    await putEntry(copy);
    copied.push(copy);
  }
  await renderDashboard();
  // Undo-safe: deleting every freshly-added copy reverses the action.
  toastWithUndo(
    t('copyYesterdayDone', { n: copied.length }),
    async () => {
      for (const e of copied) await deleteEntry(e.id);
      await renderDashboard();
      toast(t('copyYesterdayReverted'), 'ok');
    },
  );
});

clearTodayBtn?.addEventListener('click', async () => {
  // Tier-2 destructive: wipes all entries logged today. Show a count
  // in the confirm so the user knows the magnitude before nuking.
  const today = await listByDate();
  const n = today.length;
  if (n === 0) { toast(t('clearTodayNoneToClear'), 'warn'); return; }
  if (!window.confirm(t('clearTodayConfirm', { n }))) return;
  // R35.I2: undo-safe. Snapshot the entries before clearing; tapping
  // Undo reinserts them all. IDB upsert-by-id means restoration is
  // exact even if the user already re-logged something in between.
  const snapshot = today.map((e) => ({ ...e }));
  await clearDate();
  await renderDashboard();
  toastWithUndo(
    t('clearTodayDone', { n }),
    async () => {
      for (const e of snapshot) await putEntry(e);
      await renderDashboard();
      toast(t('clearTodayRestored', { n }), 'ok');
    },
  );
});

// ============================================================================
// Custom foods dialog — add / list / delete user-curated per-100 g foods.
// These flow into renderFoodSuggestions + reconcileWithFoodDB via
// listCustomFoods() at every call site above.
// ============================================================================

const customFoodsDialog = $('custom-foods-dialog');

function renderCustomFoodsList() {
  const list = $('cf-list');
  if (!list) return;
  list.textContent = '';
  const all = listCustomFoods().slice().sort((a, b) => a.name.localeCompare(b.name));
  if (all.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'tpl-empty';
    empty.textContent = t('customFoodsEmpty');
    list.appendChild(empty);
    return;
  }
  for (const f of all) {
    const li = document.createElement('li');
    li.className = 'tpl-item';
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'custom-food-label';
    // R34.N3: click a row's label to pre-fill the add form for
    // in-place editing. Saving with the same name upserts via
    // saveCustomFood's id-lookup branch (buildCustomFood adds an
    // id only if not provided — we preserve it by passing the
    // existing food wholesale when the name is unchanged).
    label.textContent = t('customFoodRow', {
      name: f.name,
      kcal: Math.round(f.kcal),
      prot: Math.round(f.protein_g),
      carb: Math.round(f.carbs_g),
      fat: Math.round(f.fat_g),
    });
    label.addEventListener('click', () => {
      $('cf-name').value = f.name;
      $('cf-kcal').value = String(Math.round(f.kcal));
      $('cf-protein').value = String(Math.round(f.protein_g));
      $('cf-carbs').value = String(Math.round(f.carbs_g));
      $('cf-fat').value = String(Math.round(f.fat_g));
      $('cf-name').focus();
      // Stash the id on the form so the save handler upserts instead
      // of creating a duplicate.
      $('cf-name').dataset.editingId = f.id;
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'secondary';
    del.textContent = t('customFoodDelete');
    del.addEventListener('click', () => {
      // R17.2: confirm before deleting — previously a single
      // misclick wiped the entry with no undo path.
      if (!window.confirm(t('customFoodDeleteConfirm', { name: f.name }))) return;
      deleteCustomFood(f.id);
      renderCustomFoodsList();
    });
    li.appendChild(label);
    li.appendChild(del);
    list.appendChild(li);
  }
}

$('custom-foods-btn')?.addEventListener('click', () => {
  renderCustomFoodsList();
  // Reset the add form
  for (const id of ['cf-name', 'cf-kcal', 'cf-protein', 'cf-carbs', 'cf-fat']) {
    const el = $(id); if (el) el.value = '';
  }
  customFoodsDialog?.showModal();
  // R17.4: pre-focus the name input so the user can start typing
  // immediately. Defer one tick so showModal() finishes layout first.
  setTimeout(() => $('cf-name')?.focus(), 0);
});
$('cf-close')?.addEventListener('click', (e) => { e.preventDefault(); customFoodsDialog?.close(); });
$('cf-save')?.addEventListener('click', () => {
  const name = ($('cf-name')?.value || '').trim();
  const kcal = Number($('cf-kcal')?.value) || 0;
  if (!name || kcal <= 0) { toast(t('customFoodNeedsNameKcal'), 'warn'); return; }
  // R34.N3: when the user clicked a row to edit, the name field
  // carries a data-editing-id attr. Passing `id` upserts (saveCustomFood
  // finds by id and replaces) instead of creating a duplicate.
  const editingId = $('cf-name')?.dataset.editingId || undefined;
  const saved = saveCustomFood({
    id: editingId,
    name,
    kcal,
    protein_g: Number($('cf-protein')?.value) || 0,
    carbs_g:   Number($('cf-carbs')?.value)   || 0,
    fat_g:     Number($('cf-fat')?.value)     || 0,
  });
  if (saved) {
    toast(t(editingId ? 'customFoodUpdatedToast' : 'customFoodSavedToast', { name: saved.name }), 'ok');
    for (const id of ['cf-name', 'cf-kcal', 'cf-protein', 'cf-carbs', 'cf-fat']) {
      const el = $(id); if (el) el.value = '';
    }
    if ($('cf-name')) delete $('cf-name').dataset.editingId;
    renderCustomFoodsList();
    // R17.5: after-save focus back to name so the user can chain
    // entries without touch-navigation between macros and name.
    $('cf-name')?.focus();
  }
});

// pctClass extracted to /core/presenters.js (R11.1) — pure, testable.

// Hydration feature is now self-contained in public/features/hydration.js.
// Inject its runtime dependencies (i18n lookup, profile getter, goal calc,
// date helper) at boot so the module stays isolated from app.js internals.
initHydration({ t, getProfile, waterGoalMl, todayISO });
initActivity({
  t, getProfile, toast,
  listActivityByDate, deleteActivity, logActivity,
  buildActivityEntry, estimateKcalBurned, sumBurned,
  renderDashboard,
});
initWeight({
  t, toast,
  currentLang: () => currentLang,
  getProfile, setProfile,
  listWeight, logWeight, deleteWeight,
  summarizeWeight, weeklyTrend, weightForecast,
  renderDashboard, todayISO, round1,
});
initReminders({ t, toast, nextOccurrenceMs, listWeight });
initVoiceDictate({
  t,
  currentLang: () => currentLang,
  parseVoiceQuickAdd,
  logEvent: telemetryLog,
});
initScanner({ t, errorEl, show, getBarcodeDetector, scanImage, addBarcodeOnly });
initInstallBanner({ show, hide });
initBackupIO({
  t, show, hide,
  buildBackup, restoreBackup, listAllEntries,
  entriesToHealthJSON, entriesToDailyCSV,
  renderRecentScans, renderDashboard,
});
initRecipeIdeas({ t, getMode, getKey, loadEngine });
initSettingsDialog({
  t, setLang, applyStaticTranslations,
  isCapacitor,
  currentLang: () => currentLang,
  applyTheme, applyReadingPrefs,
  setSetting, scheduleReminders,
  renderProfilesUI, telemetryEnabled,
  setTelemetryEnabled: telemetrySetEnabled,
  getKey,
  onLangChange: () => {
    // Close any dialog whose contents were rendered dynamically (not
    // via data-i18n) so the user doesn't see stale strings. Explain +
    // pillar + templates + recipes dialogs all render chip text from
    // `t()` snapshots; reopen is one tap away, so the UX cost is zero.
    // R10.5: extended to close templates + recipes so users switching
    // locale mid-dialog don't see a mix of FR + EN chip labels.
    $('explain-dialog')?.close();
    $('pillar-dialog')?.close();
    $('templates-dialog')?.close();
    $('recipes-dialog')?.close();
    $('recipe-edit-dialog')?.close();
    renderDashboard();
  },
});
initMenuScan({ t, defaultMealForHour, logQuickAdd, renderDashboard });
initTemplatesDialog({
  t, toast,
  listByDate, saveTemplate, listTemplates, deleteTemplate,
  expandTemplate, templateKcal, putEntry, todayISO, renderDashboard,
  shareOrCopy, formatTemplateShare,
  currentLang: () => currentLang,
  // Gap fixes #24 + #25: allergen + diet warnings.
  checkTemplateWarnings, getProfile,
});
recipesDialog = initRecipesDialog({
  t, toast,
  aggregateRecipe, saveRecipe, listRecipes, deleteRecipe,
  putEntry, defaultMealForHour, todayISO, renderDashboard,
  shareOrCopy, formatRecipeShare,
  currentLang: () => currentLang,
  // Gap fix #5: ingredient autocomplete + auto-fill in the recipe
  // editor rows.
  searchFoodDB, listCustomFoods,
  // Feature 3 — URL import + photo scan for recipes.
  compressImage, getMode, getKey, loadEngine,
  // Gap fix 1 — recipe scoring: synthesise ProductInput for
  // scoreProduct.
  buildRecipeProductInput,
  // Gap fixes #24 + #25: per-recipe allergen + diet warnings.
  checkRecipeWarnings, getProfile,
});
initQaAutocomplete({
  t, show, hide, searchFoodDB, listCustomFoods,
  // Gap fix #7: user's top-5 logged foods as favourites.
  listAllEntries, topFoods,
});
initProfileDialog({
  t, show, hide,
  getProfile, setProfile, hasMinimalProfile,
  bmrMifflinStJeor, tdeeKcal, bmi, bmiCategory, dailyTargets,
  onAfterSave: () => {
    // Re-render the currently open scan result (personal score may have
    // flipped) + refresh the dashboard so the life-stage chip appears
    // / disappears immediately after a life_stage change.
    if (lastData && !resultEl.hidden) renderAudit(lastData);
    renderDashboard();
  },
});
initFasting({
  t,
  currentLang: () => currentLang,
  show, hide,
  fastingStatus,
  buildFastCompletion, saveFastCompletion,
  listFastHistory, computeFastStreak, clearFastHistory,
});

// ============================================================================
// PWA install-prompt banner extracted to /features/install-banner.js —
// initialised at boot with initInstallBanner({ show, hide }).

// Fasting timer extracted to /features/fasting.js — initFasting()
// wires the Start / Stop / Clear-history buttons, renderFasting() is
// imported for the dashboard tick.

function renderDayNote() {
  const input = $('day-note-input');
  const counter = $('day-note-counter');
  if (!input) return;
  const current = getDayNote(todayISO());
  // Avoid stomping the user's caret position on every re-render. Only
  // repopulate when what's on screen differs from storage (initial load
  // or another tab updated it).
  if (input.value !== current) input.value = current;
  if (counter) counter.textContent = `${input.value.length} / ${DAY_NOTE_MAX_CHARS}`;
}

$('day-note-input')?.addEventListener('input', (e) => {
  const text = e.target.value || '';
  setDayNote(todayISO(), text);
  const counter = $('day-note-counter');
  if (counter) counter.textContent = `${text.length} / ${DAY_NOTE_MAX_CHARS}`;
});

// Fasting handlers + render loop moved to /features/fasting.js —
// initialised via initFasting() at boot.

// Activity (exercise) UI is extracted to /features/activity.js.
// renderActivity() is imported below; initialisation lives next to
// initHydration / initFasting at boot.

// ============================================================================
// Day / Week view toggle — flips between daily dashboard and weekly rollup.
// Persisted to localStorage so Week-view users don't have to re-click
// on every reload.
// ============================================================================

const LS_DASHBOARD_VIEW = 'scanneat.dashboard.view';
const DASHBOARD_VIEWS = new Set(['day', 'week', 'month']);
const _storedView = localStorage.getItem(LS_DASHBOARD_VIEW);
let dashboardView = DASHBOARD_VIEWS.has(_storedView) ? _storedView : 'day';

function applyViewToggle(view) {
  dashboardView = DASHBOARD_VIEWS.has(view) ? view : 'day';
  try { localStorage.setItem(LS_DASHBOARD_VIEW, dashboardView); } catch { /* quota */ }
  for (const btn of document.querySelectorAll('.view-tab')) {
    const isActive = btn.dataset.view === dashboardView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }
  const weeklyEl = $('weekly-view');
  const monthlyEl = $('monthly-view');
  const rowsEl = $('dashboard-rows');
  const logEl = $('dashboard-log');
  if (dashboardView === 'week') {
    hide(rowsEl); hide(logEl); hide(monthlyEl);
    renderWeeklyView();
    show(weeklyEl);
  } else if (dashboardView === 'month') {
    hide(rowsEl); hide(logEl); hide(weeklyEl);
    renderMonthlyView();
    show(monthlyEl);
  } else {
    hide(weeklyEl); hide(monthlyEl);
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

  // Gap fix #11: week-over-week delta chip. Compare this week's avg
  // kcal / avg protein to last week's; surface up to two deltas so
  // the user sees drift without scrolling to monthly view.
  const priorEnd = localDateISO(Date.now() - 7 * 86_400_000);
  const prior = weeklyRollup(all, priorEnd);
  if (prior.days_logged > 0) {
    const delta = weekOverWeekDelta(roll, prior);
    const fmtPct = (p) => (p === null ? '—' : (p > 0 ? `+${p}%` : `${p}%`));
    // Show kcal delta (primary) + protein delta (secondary, since
    // macro balance is typically the user's goal axis).
    const kcalChip = mkChip('weeklyVsPriorKcal', fmtPct(delta.kcal.pct));
    if (delta.kcal.pct !== null) kcalChip.dataset.direction = delta.kcal.pct > 0 ? 'up' : delta.kcal.pct < 0 ? 'down' : 'flat';
    summary.appendChild(kcalChip);
    const protChip = mkChip('weeklyVsPriorProtein', fmtPct(delta.protein.pct));
    if (delta.protein.pct !== null) protChip.dataset.direction = delta.protein.pct > 0 ? 'up' : delta.protein.pct < 0 ? 'down' : 'flat';
    summary.appendChild(protChip);
  }

  // Streak chip: consecutive days logged ending at today. Use the same
  // logStreakDays presenter the dashboard uses, so the two agree.
  const streak = logStreakDays(all, todayISO());
  if (streak > 0) {
    summary.appendChild(mkChip('weeklyStreakLabel', t('streakDays', { n: streak })));
  }

  // Bar chart — one column per day
  bars.textContent = '';
  const dayFmt = dateFormatter(localeFor(currentLang), { weekday: 'narrow' });
  for (const d of roll.days) {
    const wrap = document.createElement('div');
    wrap.className = 'wbar';
    const isEmpty = d.count === 0;
    const isOver = kcalTarget > 0 && d.kcal > kcalTarget;
    if (isEmpty) wrap.dataset.empty = 'true';
    if (isOver) wrap.dataset.over = 'true';

    // Tooltip + aria-label: the actual per-day macro breakdown. Native
    // `title` works for mouse hover + touch long-press on most mobile
    // browsers; aria-label covers screen readers regardless.
    const date = new Date(d.date + 'T12:00:00Z');
    const dateFull = dateFormatter(localeFor(currentLang), {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(date);
    const tooltip = isEmpty
      ? `${dateFull} — ${t('weekViewTooltipEmpty')}`
      : t('weekViewTooltip', {
          date: dateFull,
          kcal: Math.round(d.kcal),
          prot: Math.round(d.protein_g),
          carb: Math.round(d.carbs_g),
          fat: Math.round(d.fat_g),
        });
    wrap.title = tooltip;
    wrap.setAttribute('aria-label', tooltip);
    wrap.tabIndex = 0; // focusable for keyboard users → screen reader reads aria-label

    const col = document.createElement('span');
    col.className = 'wbar-col';
    const heightPct = Math.max(2, (d.kcal / peak) * 100);
    col.style.height = `${heightPct}%`;
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

// 30-day view — same look as the 7-day bars, sourced from monthlyRollup.
// Day labels omitted (too crowded at 30 columns); fall back to a dot
// under each bar and the full date lives in title / aria-label.
async function renderMonthlyView() {
  const root = $('monthly-view');
  const bars = $('monthly-bars');
  const summary = $('monthly-summary');
  if (!root || !bars || !summary) return;

  const all = await listAllEntries().catch(() => []);
  const roll = monthlyRollup(all, todayISO());
  const profile = getProfile();
  const targets = dailyTargets(profile);
  const kcalTarget = targets?.kcal ?? 0;
  const peak = Math.max(kcalTarget, ...roll.days.map((d) => d.kcal), 1);

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
  summary.appendChild(mkChip('monthlyDaysLogged', t('monthlyDaysLogged', { n: roll.days_logged })));
  // On-goal chip — same ±10% math the share presenter uses (R6.4) so
  // the view and the share block always agree.
  if (kcalTarget > 0 && roll.days_logged > 0) {
    const onGoal = roll.days.filter(
      (d) => d.count > 0 && Math.abs(d.kcal - kcalTarget) <= kcalTarget * 0.1,
    ).length;
    summary.appendChild(mkChip(
      'monthlyOnGoal',
      `${onGoal}/${roll.days_logged}`,
    ));
  }

  bars.textContent = '';
  bars.classList.add('wbars-30');
  for (const d of roll.days) {
    const wrap = document.createElement('div');
    wrap.className = 'wbar wbar-thin';
    const isEmpty = d.count === 0;
    const isOver = kcalTarget > 0 && d.kcal > kcalTarget;
    if (isEmpty) wrap.dataset.empty = 'true';
    if (isOver) wrap.dataset.over = 'true';
    const date = new Date(d.date + 'T12:00:00Z');
    const dateFull = dateFormatter(localeFor(currentLang), {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(date);
    const tooltip = isEmpty
      ? `${dateFull} — ${t('weekViewTooltipEmpty')}`
      : t('weekViewTooltip', {
          date: dateFull, kcal: Math.round(d.kcal),
          prot: Math.round(d.protein_g), carb: Math.round(d.carbs_g), fat: Math.round(d.fat_g),
        });
    wrap.title = tooltip;
    wrap.setAttribute('aria-label', tooltip);
    wrap.tabIndex = 0;
    const col = document.createElement('span');
    col.className = 'wbar-col';
    col.style.height = `${Math.max(2, (d.kcal / peak) * 100)}%`;
    wrap.appendChild(col);
    bars.appendChild(wrap);
  }
}

// Share button wiring — hidden when navigator.share is unavailable (desktop
// browsers without Web Share). Falls back to clipboard copy so the action
// isn't a dead end even without native share.
// Daily summary share — the same pattern as weekly, but for today's log.
// Gives users a one-tap way to copy or send today's kcal / macros rundown
// to a partner or a coach, without having to screenshot the dashboard.
$('daily-share')?.addEventListener('click', async () => {
  const totals = await dailyTotals().catch(() => null);
  const profile = getProfile();
  const targets = dailyTargets(profile);
  const burnedForDate = await listActivityByDate(todayISO()).catch(() => []);
  const burned = { kcal: sumBurned(burnedForDate) };
  // Fix #14 + #15 — fold hydration + day note into the share.
  const hydrationMl = Number(localStorage.getItem(`scanneat.hydration.${todayISO()}`)) || 0;
  const hydrationGoalMl = waterGoalMl(getProfile()) || 0;
  const dayNote = getDayNote(todayISO()) || '';
  const text = formatDailySummary(totals, targets, burned, {
    lang: currentLang,
    dateISO: todayISO(),
    hydrationMl, hydrationGoalMl, dayNote,
  });
  if (!text) { toast(t('dailyShareEmpty'), 'warn'); return; }
  await shareOrCopy({
    title: t('dailyShareTitle'),
    text,
    toasts: { copied: t('dailyShareCopied'), failed: t('dailyShareFailed') },
    toast,
  });
});

$('weekly-share')?.addEventListener('click', async () => {
  const entries = await listAllEntries().catch(() => []);
  const roll = weeklyRollup(entries, todayISO());
  const text = formatWeeklyShare(roll, { lang: currentLang });
  if (!text) { toast(t('weeklyShareEmpty'), 'warn'); return; }
  await shareOrCopy({
    title: t('weeklyShareTitle'),
    text,
    toasts: { copied: t('weeklyShareCopied'), failed: t('weeklyShareFailed') },
    toast,
  });
});

$('monthly-share')?.addEventListener('click', async () => {
  const entries = await listAllEntries().catch(() => []);
  const roll = monthlyRollup(entries, todayISO());
  const kcalTarget = dailyTargets(getProfile())?.kcal ?? 0;
  const text = formatMonthlyShare(roll, { lang: currentLang, kcalTarget });
  if (!text) { toast(t('monthlyShareEmpty'), 'warn'); return; }
  await shareOrCopy({
    title: t('monthlyShareTitle'),
    text,
    toasts: { copied: t('monthlyShareCopied'), failed: t('monthlyShareFailed') },
    toast,
  });
});

document.querySelectorAll('.view-tab').forEach((btn) =>
  btn.addEventListener('click', () => applyViewToggle(btn.dataset.view)));

async function renderDashboard() {
  const profile = getProfile();
  const targets = dailyTargets(profile);
  const entries = await listByDate().catch(() => []);
  const totals = await dailyTotals().catch(() => null);
  // Gap fix #10: clear skeletons once we have the IDB read back; both
  // success and empty-dashboard branches below drop the busy marker.
  dashboardRows?.removeAttribute('aria-busy');
  dashboardEntries?.removeAttribute('aria-busy');
  if (!totals) { hide(dashboardEl); return; }

  if (totals.count === 0 && !targets) { hide(dashboardEl); return; }
  renderHydration();
  renderFasting();
  renderDayNote();
  const burned = await renderActivity();

  dashboardDateEl.textContent = dateFormatter(localeFor(currentLang), {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date());

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
        // Milestone celebration — 7/30/100/365 day streaks get a
        // brief success-burst pulse on the streak element + accent
        // flash. Remembers which milestones fired today so a
        // single-day dashboard refresh doesn't re-celebrate.
        const MILESTONES = [7, 30, 100, 365];
        const fired = (localStorage.getItem('scanneat.streakFired') || '').split(',');
        if (MILESTONES.includes(streak) && !fired.includes(String(streak) + ':' + todayISO())) {
          streakEl.classList.remove('milestone-pulse');
          void streakEl.offsetWidth;
          streakEl.classList.add('milestone-pulse');
          setTimeout(() => streakEl.classList.remove('milestone-pulse'), 1400);
          fired.push(String(streak) + ':' + todayISO());
          // Cap the list so it doesn't grow forever; keep only today.
          localStorage.setItem(
            'scanneat.streakFired',
            fired.filter(f => f.endsWith(':' + todayISO())).join(',')
          );
        }
      } else {
        hide(streakEl);
      }
    }
  } catch { /* streak is decorative; never fail the dashboard render */ }

  // "Remaining" line (MFP-style Remaining = Goal − Food + Exercise).
  if (targets) {
    const rem = [];
    const remKcal = targets.kcal - totals.kcal + (burned?.kcal || 0);
    rem.push(`${Math.round(remKcal)} kcal`);
    if (targets.free_sugars_g_max > 0) rem.push(`${round1(targets.free_sugars_g_max - totals.sugars_g)} g ${t('dashSugars').toLowerCase()}`);
    if (targets.salt_g_max > 0) rem.push(`${round3(targets.salt_g_max - totals.salt_g)} g ${t('dashSalt').toLowerCase()}`);
    dashboardRemainingEl.textContent = `${t('dashRemaining')} : ${rem.join(' · ')}`;
    show(dashboardRemainingEl);
  } else {
    hide(dashboardRemainingEl);
  }

  await renderWeightSummary(profile);

  // R11.2: row shape + conditional micros now live in
  // dashboardRowsFrom (pure presenter). The DOM loop below is
  // unchanged; the builder is testable under node:test without a
  // jsdom shim.
  const rows = dashboardRowsFrom(totals, targets);

  dashboardRows.textContent = '';
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
    // Net-kcal line directly under the kcal row when exercise was logged.
    if (row.key === 'dashKcal' && (burned?.kcal || 0) > 0) {
      const net = document.createElement('li');
      net.className = 'dash-net';
      net.textContent = t('netKcalLine', { net: Math.round(totals.kcal - burned.kcal) });
      dashboardRows.appendChild(net);
    }
    // Life-stage kcal chip directly under kcal row — reminds the user
    // that today's target includes the EFSA pregnancy / lactation
    // uplift, not just their baseline TDEE. Only shown when life_stage
    // is set (dailyTargets surfaces it).
    if (row.key === 'dashKcal' && targets?.life_stage) {
      const chip = document.createElement('li');
      chip.className = 'dash-lifestage-chip';
      const delta = targets.life_stage === 'pregnancy' ? 300 : 500;
      chip.textContent = targets.life_stage === 'pregnancy'
        ? t('lifeStageChipPregnancy', { delta })
        : t('lifeStageChipLactation', { delta });
      dashboardRows.appendChild(chip);
    }
  }

  // Per-meal entry list
  dashboardEntries.textContent = '';
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
      // Append "(X% of day)" when the user has a kcal target set, so the
      // meal's share of the day is visible without mental arithmetic.
      // Uses the targets already fetched for the dashboard summary above.
      const dailyKcal = targets?.kcal || 0;
      const pct = dailyKcal > 0 ? Math.round((bucket.totals.kcal / dailyKcal) * 100) : 0;
      kcal.textContent = pct > 0
        ? `${Math.round(bucket.totals.kcal)} kcal · ${pct}% ${t('mealOfDayShort')}`
        : `${Math.round(bucket.totals.kcal)} kcal`;
      header.appendChild(name);
      header.appendChild(kcal);
      section.appendChild(header);
      if (bucket.totals.protein_g + bucket.totals.carbs_g + bucket.totals.fat_g > 0) {
        const macroLine = document.createElement('p');
        macroLine.className = 'meal-macros';
        macroLine.textContent = t('mealMacros', {
          prot: Math.round(bucket.totals.protein_g),
          carb: Math.round(bucket.totals.carbs_g),
          fat: Math.round(bucket.totals.fat_g),
        });
        section.appendChild(macroLine);
      }
      const ul = document.createElement('ul');
      ul.className = 'meal-entries';
      for (const e of bucket.entries.slice().sort((a, b) => b.timestamp - a.timestamp)) {
        const li = document.createElement('li');
        li.className = 'dash-entry';
        const info = document.createElement('div');
        info.className = 'dash-entry-info';
        const nm = document.createElement('span');
        nm.className = 'dash-entry-name';
        nm.textContent = e.quickAdd
          ? `${e.product_name} · ${t('quickAdd')}`
          : `${e.product_name} · ${e.grams} g`;
        info.appendChild(nm);
        // Fix #3: entry's recipe grade (when the entry came from
        // "Apply recipe") — same color-blind-safe pattern as the
        // recipes-list grade chip.
        if (e.recipe_grade) {
          const g = document.createElement('span');
          g.className = 'recipe-row-grade';
          g.dataset.grade = e.recipe_grade;
          g.textContent = e.recipe_grade;
          g.title = `${e.recipe_grade} · ${e.recipe_score ?? ''} / 100`;
          info.appendChild(g);
        }
        if ((e.protein_g || 0) + (e.carbs_g || 0) + (e.fat_g || 0) > 0) {
          const macros = document.createElement('span');
          macros.className = 'dash-entry-macros';
          macros.textContent = t('entryMacros', {
            prot: Math.round(e.protein_g || 0),
            carb: Math.round(e.carbs_g || 0),
            fat: Math.round(e.fat_g || 0),
          });
          info.appendChild(macros);
        }
        const k = document.createElement('strong');
        k.textContent = `${Math.round(e.kcal)} kcal`;
        // R35.I1+I9: edit button opens Quick Add pre-filled so the
        // user can tweak grams / macros / meal without delete+re-log.
        // Reuses the existing Quick Add form (it already has every
        // field the entry carries) instead of building a second
        // dialog.
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'dash-entry-edit';
        edit.setAttribute('aria-label', e.product_name
          ? `${t('editEntry')} — ${e.product_name}`
          : t('editEntry'));
        edit.textContent = '✎';
        edit.addEventListener('click', () => {
          editingEntry = e;
          $('qa-name').value = e.product_name || '';
          $('qa-kcal').value = String(Math.round(e.kcal || 0));
          $('qa-carbs').value = String(Math.round(e.carbs_g || 0));
          $('qa-protein').value = String(Math.round(e.protein_g || 0));
          $('qa-fat').value = String(Math.round(e.fat_g || 0));
          $('qa-satfat').value = String(Math.round(e.sat_fat_g || 0));
          $('qa-sugars').value = String(Math.round(e.sugars_g || 0));
          $('qa-salt').value = String((e.salt_g || 0).toFixed(2));
          $('qa-fiber').value = String(Math.round(e.fiber_g || 0));
          if ($('qa-meal')) $('qa-meal').value = e.meal || 'snack';
          const title = $('quick-add-dialog-title');
          if (title) title.textContent = t('editEntryTitle');
          // Fix #7 — read-only micros line when the entry carries
          // any. Users see that editing won't erase micros; the
          // save path still preserves them on the upserted record.
          const microLine = $('qa-micros-readonly');
          if (microLine) {
            const MICRO_SUMMARY = [
              ['iron_mg', 'Fe', 'mg'], ['calcium_mg', 'Ca', 'mg'],
              ['magnesium_mg', 'Mg', 'mg'], ['potassium_mg', 'K', 'mg'],
              ['zinc_mg', 'Zn', 'mg'], ['vit_c_mg', 'C', 'mg'],
              ['vit_d_ug', 'D', 'µg'], ['b12_ug', 'B12', 'µg'],
              ['omega_3_g', 'ω3', 'g'],
            ];
            const parts = MICRO_SUMMARY
              .filter(([k]) => (Number(e[k]) || 0) > 0)
              .map(([k, label, unit]) => `${label} ${Math.round(e[k] * 10) / 10} ${unit}`);
            if (parts.length > 0) {
              microLine.textContent = t('qaMicrosReadOnly', { items: parts.join(' · ') });
              microLine.hidden = false;
            } else {
              microLine.hidden = true;
            }
          }
          quickAddDialog.showModal();
        });
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'dash-entry-del';
        del.setAttribute('aria-label', e.product_name
          ? `${t('deleteEntry')} — ${e.product_name}`
          : t('deleteEntry'));
        del.textContent = '×';
        del.addEventListener('click', async () => {
          // R35.I2: undo-toast. Snapshot the entry before deletion
          // and let the user restore it in a 6 s window. putEntry
          // is upsert-by-id so the restore reinstates the row with
          // its original id / timestamp / date — completely intact.
          const snapshot = { ...e };
          await deleteEntry(e.id);
          await renderDashboard();
          toastWithUndo(
            t('entryDeleted', { name: e.product_name || '—' }),
            async () => {
              await putEntry(snapshot);
              await renderDashboard();
              toast(t('entryRestored'), 'ok');
            },
          );
        });
        li.appendChild(info);
        li.appendChild(k);
        li.appendChild(edit);
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

  renderGapCloser(totals, targets);

  show(dashboardEl);
}

function renderGapCloser(totals, targets) {
  const section = $('gap-closer');
  const list = $('gap-closer-list');
  if (!section || !list) return;
  const all = [...FOOD_DB, ...listCustomFoods()];
  const gaps = closeTheGap(totals, targets, all);
  list.textContent = '';
  if (gaps.length === 0 || (totals?.count ?? 0) === 0) {
    hide(section);
    return;
  }
  for (const g of gaps) {
    const item = document.createElement('li');
    item.className = 'gap-closer-item';
    const head = document.createElement('p');
    head.className = 'gap-closer-head';
    head.textContent = t(`gapCloser_${g.nutrient}`, { deficit: g.deficit });
    item.appendChild(head);
    const chips = document.createElement('ul');
    chips.className = 'gap-closer-chips';
    // Units per nutrient for the hover tooltip. Keeps the chip label
    // tight ("amandes · 38 g") while the `title` attr spells out exactly
    // why this food was picked + how much it delivers.
    const unitFor = { protein: 'g', fiber: 'g', iron: 'mg', calcium: 'mg', vit_d: 'µg', b12: 'µg' }[g.nutrient] || '';
    for (const s of g.suggestions) {
      const li = document.createElement('li');
      li.className = 'gap-closer-chip';
      li.textContent = `${s.name} · ${s.grams} g`;
      // Tooltip sequence: "[nutrient delivered] — [density per 100 g]"
      li.title = t('gapCloserTooltip', {
        value: s.contribution, unit: unitFor,
        deficit: g.deficit, nutrient: t(`gapCloserNutrient_${g.nutrient}`),
      });
      li.setAttribute('aria-label', li.title);
      chips.appendChild(li);
    }
    item.appendChild(chips);
    list.appendChild(item);
  }
  show(section);
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
  // R26.1: use local-day ISO (matches how consumption + weight entries
  // are stamped after R25.1). Previously mixed local Date arithmetic
  // with UTC-based toISOString().slice(0,10), which could offset the
  // series by one day at tz edges and silently misalign weights with
  // kcal columns.
  const days = [];
  const nowMs = Date.now();
  for (let i = 29; i >= 0; i--) {
    days.push(localDateISO(nowMs - i * 86_400_000));
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

// renderWeightSummary extracted to /features/weight.js — imported at top.

// Meal reminders extracted to /features/reminders.js — initReminders()
// wires scheduleReminders() + registers it on boot.

renderQueue();
updatePendingBanner();
renderRecentScans();
// If the user's last session was in Week view, apply that now — otherwise
// applyViewToggle('day') is a no-op since 'day' is the default state.
if (dashboardView === 'week') applyViewToggle('week');
else renderDashboard();
maybeShowOnboarding({ t });
// scheduleReminders() is called inside initReminders() above.

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
