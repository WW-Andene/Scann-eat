/**
 * Recipes dialog — multi-component dishes that log as ONE aggregated
 * consumption entry. Also houses the recipe editor and the "from last
 * identified plate" shortcut.
 *
 * Previously ~240 lines inline in app.js. Mirrors the templates-dialog
 * shape: deps injection + returned handles so the outer app.js can
 * re-render the list after external actions (e.g. after a multi-photo
 * plate scan fills `lastIdentifiedPlate`).
 *
 * R9.2 adds the duplicate-recipe chip — same UX as the R8.6 template
 * duplicate: one-tap clone under a new name.
 *
 * R11.8 adds the share-recipe chip — uses shareOrCopy + the new
 * formatRecipeShare presenter.
 *
 * Deps shape:
 *   { t, toast,
 *     aggregateRecipe, saveRecipe, listRecipes, deleteRecipe,
 *     putEntry, defaultMealForHour, todayISO, renderDashboard,
 *     shareOrCopy, formatRecipeShare, currentLang }
 *
 * Returns:
 *   { setLastIdentifiedPlate(items), renderRecipesList() }
 */

function $(id) { return document.getElementById(id); }

export function initRecipesDialog(deps) {
  const {
    t, toast,
    aggregateRecipe, saveRecipe, listRecipes, deleteRecipe,
    putEntry, defaultMealForHour, todayISO, renderDashboard,
    shareOrCopy, formatRecipeShare, currentLang,
  } = deps;

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

  let editingRecipe = null;
  let lastIdentifiedPlate = null;

  function newComponent() {
    return { product_name: '', grams: 0, kcal: 0, carbs_g: 0, fat_g: 0, protein_g: 0 };
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

  function recalcRecipeTotals() {
    if (!recipeEditTotals) return;
    const draft = {
      name: recipeEditName?.value || '',
      components: readDraftComponentsFromDOM(),
    };
    // R9.4: keep the computed-servings in sync with the display-label
    // servings by clamping both to `max(1, round(n))`. Previously the
    // editor title showed 1 while aggregateRecipe internally used 0.1
    // for non-integer input.
    const serv = Math.max(1, Math.round(Number(recipeEditServings?.value) || 1));
    const agg = aggregateRecipe(draft, serv);
    recipeEditTotals.textContent = t('recipeTotals', {
      kcal: Math.round(agg.kcal),
      prot: Math.round(agg.protein_g),
      carb: Math.round(agg.carbs_g),
      fat:  Math.round(agg.fat_g),
      serv,
    });
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
      li.dataset.recipeId = r.id;
      const head = document.createElement('div');
      head.className = 'tpl-head';
      const pick = document.createElement('input');
      pick.type = 'checkbox';
      pick.className = 'tpl-pick';
      pick.setAttribute('aria-label', t('recipeGrocerySelect'));
      pick.dataset.recipeId = r.id;
      head.appendChild(pick);
      const name = document.createElement('strong');
      // R14.2: display-time fallback mirrors the templates dialog.
      name.textContent = r.name || t('untitledRecipe');
      if (!r.name) name.classList.add('untitled');
      const agg = aggregateRecipe(r, r.servings || 1);
      const summary = document.createElement('span');
      summary.className = 'tpl-kcal';
      summary.textContent = `${Math.round(agg.kcal)} kcal · ${t('recipeIngrCount', { n: r.components.length })}`;
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
          toast(t('recipeAppliedToast', { name: r.name }), 'ok');
        } catch (err) { console.error('[recipe-apply]', err); }
      });
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'chip-btn';
      edit.textContent = t('recipeEdit');
      edit.addEventListener('click', () => openRecipeEditor(r));
      // R9.2: duplicate chip — clones the recipe under "{name} (copy)".
      // Mirror of the R8.6 templates duplicate. Saves immediately so the
      // user sees the clone land in the list without re-opening the
      // editor for obvious cases.
      const dup = document.createElement('button');
      dup.type = 'button';
      dup.className = 'chip-btn';
      dup.textContent = t('recipeDuplicate');
      dup.setAttribute('aria-label', t('recipeDuplicate'));
      dup.addEventListener('click', async () => {
        try {
          const saved = await saveRecipe({
            name: `${r.name} ${t('templateCopySuffix')}`,
            servings: r.servings || 1,
            components: r.components,
          });
          await renderRecipesList();
          toast(t('recipeDuplicatedToast', { name: saved.name }), 'ok');
        } catch (err) { console.error('[recipe-duplicate]', err); }
      });
      // R11.8: share-recipe chip. Emits a compact plain-text summary
      // via the unified shareOrCopy path (native share sheet on
      // mobile, clipboard fallback elsewhere). Locale-aware via the
      // formatRecipeShare presenter + currentLang() lookup.
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'chip-btn';
      shareBtn.textContent = t('recipeShare');
      shareBtn.setAttribute('aria-label', t('recipeShare'));
      shareBtn.addEventListener('click', async () => {
        if (!shareOrCopy || !formatRecipeShare) return;
        const text = formatRecipeShare(r, { lang: currentLang ? currentLang() : 'fr' });
        if (!text) { toast(t('recipeShareEmpty'), 'warn'); return; }
        await shareOrCopy({
          title: r.name || t('recipeShare'),
          text,
          toasts: { copied: t('recipeShareCopied'), failed: t('recipeShareFailed') },
          toast,
        });
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'chip-btn';
      del.textContent = '🗑';
      // R23.4: aria-label includes recipe name.
      del.setAttribute('aria-label', r.name
        ? `${t('recipeDelete')} — ${r.name}`
        : t('recipeDelete'));
      del.addEventListener('click', async () => {
        await deleteRecipe(r.id);
        await renderRecipesList();
      });
      actions.appendChild(apply);
      actions.appendChild(edit);
      actions.appendChild(dup);
      actions.appendChild(shareBtn);
      actions.appendChild(del);
      li.appendChild(actions);
      recipesListEl.appendChild(li);
    }
  }

  function refreshRecipeFromPlateBtn() {
    const btn = $('recipe-from-plate-btn');
    if (!btn) return;
    const has = !!lastIdentifiedPlate && Array.isArray(lastIdentifiedPlate.items) && lastIdentifiedPlate.items.length > 0;
    btn.disabled = !has;
    btn.hidden = !has;
  }

  // External mutation path — called by the qa-photo-multi handler in
  // app.js after a successful plate scan.
  function setLastIdentifiedPlate(items) {
    lastIdentifiedPlate = items && items.length
      ? { items, stashed_at: Date.now() }
      : null;
    refreshRecipeFromPlateBtn();
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

  recipesBtn?.addEventListener('click', async () => {
    recipesDialog?.showModal();
    refreshRecipeFromPlateBtn();
    try { await renderRecipesList(); }
    catch (err) { console.warn('[recipes] render failed', err); }
  });
  recipesCloseBtn?.addEventListener('click', (e) => { e.preventDefault(); recipesDialog?.close(); });
  recipeNewBtn?.addEventListener('click', () => openRecipeEditor(null));

  $('recipe-from-plate-btn')?.addEventListener('click', () => {
    if (!lastIdentifiedPlate?.items?.length) return;
    const components = lastIdentifiedPlate.items.map((it) => ({
      product_name: String(it.name ?? ''),
      grams: Math.round(Number(it.estimated_grams) || 0),
      kcal: Math.round(Number(it.kcal) || 0),
      protein_g: Math.round(Number(it.protein_g) || 0),
      carbs_g: Math.round(Number(it.carbs_g) || 0),
      fat_g: Math.round(Number(it.fat_g) || 0),
    }));
    openRecipeEditor({
      id: undefined,
      name: '',
      servings: 1,
      components,
    });
  });

  refreshRecipeFromPlateBtn();

  return { setLastIdentifiedPlate, renderRecipesList };
}
