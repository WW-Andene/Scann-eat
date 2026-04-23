/**
 * Restaurant menu scan — picker dialog.
 *
 * Different semantics from identify-multi: nothing is logged
 * automatically. Callers pass the dish list from identifyMenu() into
 * openMenuScan(), which paints one row per dish with an "Ajouter au
 * journal" button. Each button calls logQuickAdd + re-renders the
 * dashboard.
 *
 * ADR-0004 feature-folder pattern.
 *
 * Deps shape:
 *   { t, defaultMealForHour, logQuickAdd, renderDashboard }
 */

let deps = null;
function $(id) { return document.getElementById(id); }

export async function openMenuScan(dishes) {
  const { t, defaultMealForHour, logQuickAdd, renderDashboard } = deps;
  const dialog = $('menu-scan-dialog');
  const list = $('menu-scan-list');
  const status = $('menu-scan-status');
  if (!dialog || !list) return;
  list.textContent = '';
  if (status) status.textContent = dishes.length ? '' : t('menuScanEmpty');
  const meal = $('qa-meal')?.value || defaultMealForHour(new Date().getHours());
  for (const d of dishes) {
    const li = document.createElement('li');
    li.className = 'menu-scan-item';
    const label = document.createElement('span');
    label.className = 'menu-scan-dish';
    label.textContent = d.name;
    const meta = document.createElement('span');
    meta.className = 'menu-scan-meta';
    meta.textContent = t('menuScanMeta', {
      kcal: Math.round(d.kcal),
      prot: Math.round(d.protein_g),
      carb: Math.round(d.carbs_g),
      fat: Math.round(d.fat_g),
    });
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn accent compact';
    btn.textContent = t('menuScanLog');
    btn.addEventListener('click', async () => {
      await logQuickAdd({
        name: d.name, meal,
        kcal: Math.round(d.kcal) || 0,
        protein_g: Math.round(d.protein_g) || 0,
        carbs_g: Math.round(d.carbs_g) || 0,
        fat_g: Math.round(d.fat_g) || 0,
        sat_fat_g: 0, sugars_g: 0, salt_g: 0,
      });
      btn.disabled = true;
      btn.textContent = t('menuScanLogged');
      await renderDashboard();
    });
    li.appendChild(label);
    li.appendChild(meta);
    li.appendChild(btn);
    list.appendChild(li);
  }
  dialog.showModal();
}

export function initMenuScan(injected) {
  deps = injected;
  $('menu-scan-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('menu-scan-dialog')?.close();
  });
}
