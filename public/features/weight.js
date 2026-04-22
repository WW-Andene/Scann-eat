/**
 * Weight tracking — dialog + summary chip + history list + forecast.
 *
 * Follows the feature-folder pattern documented in
 * docs/adr/0004-features-folder-pattern.md. Dependencies are injected at
 * initWeight; the module reaches for DOM elements directly because they
 * live in index.html (#weight-dialog / #w-* / #weight-summary).
 *
 * Exported:
 *   initWeight(deps)           — call once at boot, wires up dialog buttons
 *   renderWeightSummary(profile) — called from renderDashboard per tick
 */

let deps = null;

function $(id) { return document.getElementById(id); }
function show(el) { if (el) el.removeAttribute('hidden'); }
function hide(el) { if (el) el.setAttribute('hidden', ''); }

async function renderWeightHistory() {
  const { t, listWeight, deleteWeight, renderDashboard } = deps;
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

export async function renderWeightSummary(profile) {
  if (!deps) return;
  const { t, currentLang, listWeight, summarizeWeight, weeklyTrend, weightForecast, round1 } = deps;
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
  if (profile?.goal_weight_kg && s.recent_count >= 2) {
    const f = weightForecast(s.latest_kg, profile.goal_weight_kg, trend);
    if (f.status === 'ok') {
      const locale = currentLang() === 'en' ? 'en-GB' : 'fr-FR';
      const d = new Date(f.targetISO + 'T00:00:00');
      const datePretty = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
      appendSpan([text(t('weightForecastOk', { date: datePretty, weeks: f.weeks }))]);
    } else if (f.status === 'wrong-direction') {
      appendSpan([text(t('weightForecastWrongDir'))]);
    }
  }
  show(el);
}

export function initWeight(injected) {
  deps = injected;
  const { t, getProfile, setProfile, logWeight, todayISO, renderDashboard } = deps;
  const dialog = $('weight-dialog');

  $('weight-btn')?.addEventListener('click', () => {
    $('w-kg').value = '';
    $('w-date').value = todayISO();
    $('w-notes').value = '';
    renderWeightHistory();
    dialog?.showModal();
  });
  $('w-close')?.addEventListener('click', (e) => { e.preventDefault(); dialog?.close(); });
  $('w-save')?.addEventListener('click', async (e) => {
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
      dialog?.close();
    } catch (err) { console.error('[weight]', err); }
  });
}
