/**
 * Recipe ideas dialog — LLM-backed recipe suggestion cards.
 *
 * Used by:
 *   - the pairings panel ("Idées de recettes" button) → openRecipeIdeas(name)
 *   - the pantry dialog ("Suggest from pantry")       → openPantryIdeas([…])
 *
 * Both paths render into the same #recipe-ideas-dialog + #recipe-ideas-list
 * via the shared renderRecipeCards helper.
 *
 * ADR-0004 feature-folder pattern. Deps:
 *   { t, getMode, getKey, loadEngine }
 */

let deps = null;
function $(id) { return document.getElementById(id); }

function renderCards(recipes) {
  const { t } = deps;
  const list = $('recipe-ideas-list');
  if (!list) return;
  list.textContent = '';
  for (const r of recipes) {
    const card = document.createElement('article');
    card.className = 'recipe-idea-card';
    const h = document.createElement('h3');
    h.textContent = r.name;
    card.appendChild(h);
    const meta = document.createElement('p');
    meta.className = 'recipe-idea-meta';
    meta.textContent = t('recipeIdeasMeta', {
      time: Math.round(r.time_min || 0),
      kcal: Math.round(r.kcal_estimate || 0),
    });
    card.appendChild(meta);
    if (Array.isArray(r.ingredients) && r.ingredients.length) {
      const label = document.createElement('p');
      label.className = 'recipe-idea-sublabel';
      label.textContent = t('recipeIdeasIngredients');
      card.appendChild(label);
      const ul = document.createElement('ul');
      ul.className = 'recipe-idea-ings';
      for (const ing of r.ingredients) {
        const li = document.createElement('li');
        li.textContent = ing;
        ul.appendChild(li);
      }
      card.appendChild(ul);
    }
    if (Array.isArray(r.steps) && r.steps.length) {
      const label = document.createElement('p');
      label.className = 'recipe-idea-sublabel';
      label.textContent = t('recipeIdeasSteps');
      card.appendChild(label);
      const ol = document.createElement('ol');
      ol.className = 'recipe-idea-steps';
      for (const step of r.steps) {
        const li = document.createElement('li');
        li.textContent = step;
        ol.appendChild(li);
      }
      card.appendChild(ol);
    }
    list.appendChild(card);
  }
}

async function fetchRecipes({ direct, server }) {
  const { getMode, getKey, loadEngine, t } = deps;
  const mode = getMode();
  if (mode === 'direct') {
    const engine = await loadEngine();
    const key = getKey();
    if (!key) throw new Error(t('errMissingKey'));
    return direct(engine, key);
  } else {
    const res = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(server.body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

async function runAndRender(intro, fetcher) {
  const { t } = deps;
  const dialog = $('recipe-ideas-dialog');
  if (!dialog) return;
  $('recipe-ideas-intro').textContent = intro;
  $('recipe-ideas-list').textContent = '';
  $('recipe-ideas-status').textContent = t('recipeIdeasLoading');
  dialog.showModal();
  let result;
  try {
    result = await fetcher();
  } catch (err) {
    console.warn('[recipeIdeas]', err);
    $('recipe-ideas-status').textContent = t('recipeIdeasFailed');
    return;
  }
  const recipes = Array.isArray(result?.recipes) ? result.recipes : [];
  if (recipes.length === 0) {
    $('recipe-ideas-status').textContent = t('recipeIdeasEmpty');
    return;
  }
  $('recipe-ideas-status').textContent = '';
  renderCards(recipes);
}

export async function openRecipeIdeas(ingredient) {
  const { t } = deps;
  if (!ingredient) return;
  await runAndRender(
    t('recipeIdeasIntro', { name: ingredient }),
    () => fetchRecipes({
      direct: (engine, key) => engine.suggestRecipes(ingredient, { apiKey: key }),
      server: { url: '/api/suggest-recipes', body: { ingredient } },
    }),
  );
}

export async function openPantryIdeas(pantry) {
  const { t } = deps;
  if (!Array.isArray(pantry) || pantry.length === 0) return;
  const previewName = pantry.slice(0, 3).join(', ') + (pantry.length > 3 ? '…' : '');
  await runAndRender(
    t('recipeIdeasPantryIntro', { ingredients: previewName }),
    () => fetchRecipes({
      direct: (engine, key) => engine.suggestRecipesFromPantry(pantry, { apiKey: key }),
      server: { url: '/api/suggest-from-pantry', body: { pantry } },
    }),
  );
}

export function initRecipeIdeas(injected) {
  deps = injected;
  $('recipe-ideas-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('recipe-ideas-dialog')?.close();
  });
}
