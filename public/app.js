/**
 * Scann-eat PWA entry.
 *
 * Capture flow: user adds 1–4 photos → each is compressed to ≤1600 px JPEG
 * (≈80–400 KB) before upload → the queue is sent as a batch to the scorer.
 *
 * Two network modes, selected per request:
 *   - "server": POST /api/score (Vercel Function). Default when hosted.
 *   - "direct": import the engine bundle and call Groq from the browser with
 *               a user-provided key from localStorage. Used inside the APK
 *               (Capacitor shell) and on the web when the user opts in or when
 *               the server is unreachable.
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

const settingsBtn = $('settings-btn');
const settingsDialog = $('settings-dialog');
const keyInput = $('settings-key');
const modeSelect = $('settings-mode');
const settingsSave = $('settings-save');
const settingsCancel = $('settings-cancel');

const LS_KEY = 'scanneat.groq_key';
const LS_MODE = 'scanneat.mode';

const MAX_IMAGES = 4;
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

const isCapacitor = !!globalThis.Capacitor?.isNativePlatform?.();

/** Queue of compressed images, each: { id, dataUrl, base64, mime } */
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

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

// ---------- Image compression ----------

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ img, url }); };
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
    return {
      dataUrl,
      base64: dataUrl.slice(comma + 1),
      mime: 'image/jpeg',
    };
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
      const compressed = await compressImage(file);
      queue.push({ id: crypto.randomUUID(), ...compressed });
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

// ---------- Scan network paths ----------

function queuePayload() {
  return queue.map((q) => ({ base64: q.base64, mime: q.mime }));
}

async function scanViaServer() {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: queuePayload() }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function scanViaDirect() {
  const key = getKey();
  if (!key) throw new Error('Aucune clé Groq configurée. Ouvre les réglages (⚙).');
  const { parseLabel, scoreProduct } = await loadEngine();
  const { product, warnings } = await parseLabel(queuePayload(), { apiKey: key });
  const audit = scoreProduct(product);
  return { product, audit, warnings };
}

async function scanImage() {
  if (queue.length === 0) return;
  hide(errorEl);
  hide(resultEl);
  show(statusEl);
  statusText.textContent = queue.length > 1
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

// ---------- Rendering ----------

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

// ---------- Events ----------

fileInput.addEventListener('change', async (e) => {
  await addFiles(e.target.files);
  fileInput.value = ''; // allow picking the same file twice
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

renderQueue();
