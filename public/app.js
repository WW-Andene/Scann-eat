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

let currentBase64 = null;
let currentMime = null;

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

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

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

async function scanImage() {
  hide(errorEl);
  hide(resultEl);
  show(statusEl);
  statusText.textContent = 'Analyse en cours…';

  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: currentBase64, mime: currentMime }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const { audit, product, warnings } = await res.json();
    hide(statusEl);
    renderAudit(audit, warnings);
    renderIngredients(product);
    show(resultEl);
  } catch (err) {
    hide(statusEl);
    errorEl.textContent = `Erreur: ${err.message}`;
    show(errorEl);
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}
