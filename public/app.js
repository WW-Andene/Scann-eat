/**
 * Scann-eat PWA entry.
 *
 * Runs in two modes, auto-selected per request:
 *   - "server": POST /api/score (Vercel Function). Default when hosted.
 *   - "direct": import the engine bundle and call Groq from the browser with
 *               a user-provided key stored in localStorage. Used inside the
 *               APK (Capacitor shell) and on the web when the user explicitly
 *               enables it.
 */

const $ = (id) => document.getElementById(id);

const fileInput = $('file-input');
const previewEl = $('preview');
const previewImg = $('preview-img');
const scanBtn = $('scan-btn');
const statusEl = $('status');
const statusText = $('status-text');
const errorEl = $('error');
const resultEl = $('result');
const resetBtn = $('reset-btn');

const settingsBtn = $('settings-btn');
const settingsDialog = $('settings-dialog');
const keyInput = $('settings-key');
const modeSelect = $('settings-mode');
const settingsSave = $('settings-save');
const settingsCancel = $('settings-cancel');

const LS_KEY = 'scanneat.groq_key';
const LS_MODE = 'scanneat.mode'; // 'auto' | 'server' | 'direct'

const isCapacitor = !!globalThis.Capacitor?.isNativePlatform?.();

let currentBase64 = null;
let currentMime = null;

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

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = result.indexOf(',');
      resolve({ dataUrl: result, base64: result.slice(comma + 1) });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function scanViaServer() {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: currentBase64, mime: currentMime }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function scanViaDirect() {
  const key = getKey();
  if (!key) throw new Error('Aucune clé Groq configurée. Ouvre les réglages.');
  const { parseLabel, scoreProduct } = await loadEngine();
  const { product, warnings } = await parseLabel(
    { base64: currentBase64, mime: currentMime || 'image/jpeg' },
    { apiKey: key },
  );
  const audit = scoreProduct(product);
  return { product, audit, warnings };
}

async function scanImage() {
  hide(errorEl);
  hide(resultEl);
  show(statusEl);
  statusText.textContent = 'Analyse en cours…';

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
    renderAudit(data.audit, data.warnings);
    renderIngredients(data.product);
    show(resultEl);
  } catch (err) {
    hide(statusEl);
    console.error('[scan] failed', err);
    errorEl.textContent = `Erreur: ${err.message}`;
    show(errorEl);
  }
}

function renderAudit(audit, warnings) {
  $('grade-el').textContent = audit.grade;
  $('grade-el').dataset.grade = audit.grade;
  $('score-el').textContent = String(audit.score);
  $('verdict-el').textContent = audit.verdict;
  $('product-name').textContent = audit.product_name || '(sans nom)';
  $('product-category').textContent = audit.category.replace(/_/g, ' ');

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

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const { dataUrl, base64 } = await fileToBase64(file);
  currentBase64 = base64;
  currentMime = file.type || 'image/jpeg';
  previewImg.src = dataUrl;
  show(previewEl);
  hide(resultEl);
  hide(errorEl);
});

scanBtn.addEventListener('click', () => {
  if (currentBase64) scanImage();
});

resetBtn.addEventListener('click', () => {
  currentBase64 = null;
  currentMime = null;
  fileInput.value = '';
  hide(previewEl);
  hide(resultEl);
  hide(errorEl);
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
