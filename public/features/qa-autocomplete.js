/**
 * Quick Add name autocomplete — typeahead against the built-in food DB
 * + any custom foods the user has saved.
 *
 * Previously ~50 lines inline in app.js (the "Quick Add name
 * autocomplete" block). Pure presentation: read query, query the DB,
 * paint a <ul> of suggestion <li>s, and on click pre-fill the six
 * Quick Add fields (name + kcal + protein + carbs + fat).
 *
 * R10.1 extraction. Mirrors the templates/recipes module shape:
 * deps-injection; no cross-module state.
 *
 * Deps shape:
 *   { show, hide, searchFoodDB, listCustomFoods }
 */

function $(id) { return document.getElementById(id); }

export function initQaAutocomplete(deps) {
  const { show, hide, searchFoodDB, listCustomFoods } = deps;

  const qaNameInput = $('qa-name');
  const qaSuggestionsList = $('qa-name-suggestions-list');
  if (!qaNameInput) return;

  function applyFoodToQuickAdd(food) {
    const set = (id, v) => { const el = $(id); if (el) el.value = String(Math.round(v ?? 0)); };
    qaNameInput.value = food.name;
    // food-db values are per 100 g. Default to 100 g portion unless the
    // user has already typed a specific kcal value; we overwrite either
    // way since the user's intent when picking a suggestion is to
    // inherit its macros.
    set('qa-kcal', food.kcal);
    set('qa-protein', food.protein_g);
    set('qa-carbs', food.carbs_g);
    set('qa-fat', food.fat_g);
  }

  function renderFoodSuggestions(query) {
    if (!qaSuggestionsList) return;
    const matches = searchFoodDB(query, 6, listCustomFoods());
    qaSuggestionsList.textContent = '';
    if (matches.length === 0) { hide(qaSuggestionsList); return; }
    for (const f of matches) {
      const li = document.createElement('li');
      li.className = 'qa-suggestion';
      li.setAttribute('role', 'option');
      const name = document.createElement('span');
      name.className = 'qs-name';
      name.textContent = f.name;
      const kcal = document.createElement('span');
      kcal.className = 'qs-kcal';
      kcal.textContent = `${Math.round(f.kcal)} kcal / 100 g`;
      li.appendChild(name);
      li.appendChild(kcal);
      li.addEventListener('mousedown', (ev) => {
        ev.preventDefault(); // keep focus on the input
        applyFoodToQuickAdd(f);
        hide(qaSuggestionsList);
      });
      qaSuggestionsList.appendChild(li);
    }
    show(qaSuggestionsList);
  }

  qaNameInput.addEventListener('input', (e) => renderFoodSuggestions(e.target.value));
  qaNameInput.addEventListener('blur', () => {
    // Slight delay so a mousedown on a suggestion can fire before we
    // hide.
    setTimeout(() => hide(qaSuggestionsList), 150);
  });
  qaNameInput.addEventListener('focus', (e) => {
    if (e.target.value) renderFoodSuggestions(e.target.value);
  });
}
