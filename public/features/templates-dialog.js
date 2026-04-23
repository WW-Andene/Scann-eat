/**
 * Meal-templates dialog — list, save-today, apply, duplicate, delete.
 *
 * Previously 120 lines inline in app.js. The extraction is a pure
 * pattern re-use: dialog open/close, a promise-based name prompt, and
 * a list renderer. Keeps the same three IDB helpers (saveTemplate /
 * listTemplates / deleteTemplate) the caller already depends on.
 *
 * R8.6 adds the duplicate chip: clones an existing template under a
 * new name ("{name} (copy)" by default — user can edit in the same
 * name prompt). Useful for creating variants (Monday snack vs Tuesday
 * snack) without retyping every macro.
 *
 * Deps shape:
 *   { t, toast, listByDate, saveTemplate, listTemplates, deleteTemplate,
 *     expandTemplate, templateKcal, putEntry, todayISO, renderDashboard }
 */

function $(id) { return document.getElementById(id); }

export function initTemplatesDialog(deps) {
  const {
    t, toast,
    listByDate, saveTemplate, listTemplates, deleteTemplate,
    expandTemplate, templateKcal, putEntry, todayISO, renderDashboard,
  } = deps;

  const templatesBtn = $('templates-btn');
  const templatesDialog = $('templates-dialog');
  const tplClose = $('tpl-close');
  const tplSaveToday = $('tpl-save-today');
  const tplNameDialog = $('tpl-name-dialog');
  const tplNameInput = $('tpl-name-input');
  const tplNameConfirm = $('tpl-name-confirm');
  const tplNameCancel = $('tpl-name-cancel');

  /** Promise-based name prompt that opens a styled dialog instead of
   *  the blocking native prompt(). Resolves to the typed name or null
   *  on cancel. Accepts an optional initial value so "duplicate" can
   *  pre-fill "{name} (copy)" for the user to accept or edit. */
  function askTemplateName(initial = '') {
    if (!tplNameDialog || !tplNameInput) return Promise.resolve(null);
    tplNameInput.value = initial;
    tplNameInput.placeholder = t('templateNamePlaceholder');
    tplNameDialog.showModal();
    tplNameInput.focus();
    if (initial) tplNameInput.select();
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
      // R8.7: "items" was hard-coded English — now goes through i18n so
      // FR users see "éléments" instead of an English word in the
      // otherwise-translated dialog.
      kcal.textContent = `${templateKcal(tpl)} kcal · ${t('tplItemsCount', { n: tpl.items.length })}`;
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
        toast(t('templateApplyToast', { n: entries.length, plural: entries.length > 1 ? 'ies' : 'y' }), 'ok');
      });
      // R8.6: duplicate chip — spin up a near-copy under a new name.
      // The name prompt defaults to "{original} (copy)" so one confirm
      // is enough for the common "clone-and-tweak" flow.
      const dup = document.createElement('button');
      dup.type = 'button';
      dup.className = 'chip-btn';
      dup.textContent = t('templateDuplicate');
      dup.setAttribute('aria-label', t('templateDuplicate'));
      dup.addEventListener('click', async () => {
        const suggested = `${tpl.name} ${t('templateCopySuffix')}`;
        const newName = await askTemplateName(suggested);
        if (!newName) return;
        // R9.7: forward the source template's meal so the clone inherits
        // breakfast/lunch/dinner/snack instead of silently defaulting
        // to 'snack' (saveTemplate's parameter default).
        const saved = await saveTemplate({ name: newName, meal: tpl.meal, items: tpl.items });
        await renderTemplatesList();
        toast(t('templateSavedToast', { name: saved.name }), 'ok');
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
      actions.appendChild(dup);
      actions.appendChild(del);
      li.appendChild(actions);
      ul.appendChild(li);
    }
  }

  templatesBtn?.addEventListener('click', async () => {
    // Open the dialog first, then render. If the IDB read fails, the
    // user still sees the dialog with an empty list instead of a dead
    // button.
    templatesDialog?.showModal();
    try { await renderTemplatesList(); }
    catch (err) { console.warn('[templates] render failed', err); }
  });
  tplClose?.addEventListener('click', (e) => { e.preventDefault(); templatesDialog?.close(); });

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
    toast(t('templateSavedToast', { name: saved.name }), 'ok');
  });

  return { renderTemplatesList };
}
