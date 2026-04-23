/**
 * Global keyboard shortcuts.
 *
 *   Escape       — closes every open <dialog>. Browser does this for
 *                  modal dialogs automatically; we extend it so non-
 *                  modal dialogs (settings-like) also close.
 *   /            — focuses the history search input.
 *   Enter        — triggers the Scan button when the user isn't typing
 *                  in a form field.
 *   q / t / r    — open Quick Add / Templates / Recipes (R9.5). Only
 *                  fires when the user isn't typing in a field and no
 *                  dialog is already open — so typing "r" into a text
 *                  input never hijacks focus into a dialog.
 *
 * ADR-0004 feature-folder pattern. Single init; no render loop.
 *
 * Deps shape:
 *   { scanBtn, historySearchInput, quickAddBtn, templatesBtn, recipesBtn }
 */

export function initKeybindings({
  scanBtn, historySearchInput,
  quickAddBtn, templatesBtn, recipesBtn,
}) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const d of document.querySelectorAll('dialog[open]')) d.close();
      return;
    }
    const tag = (e.target?.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (typing) return;
    const dialogOpen = !!document.querySelector('dialog[open]');
    if (e.key === '/' && historySearchInput) {
      e.preventDefault();
      historySearchInput.focus();
      return;
    }
    if (dialogOpen) return;
    if (e.key === 'Enter' && scanBtn && !scanBtn.disabled) {
      scanBtn.click();
      return;
    }
    if (e.key === 'q' && quickAddBtn) { e.preventDefault(); quickAddBtn.click(); return; }
    if (e.key === 't' && templatesBtn) { e.preventDefault(); templatesBtn.click(); return; }
    if (e.key === 'r' && recipesBtn) { e.preventDefault(); recipesBtn.click(); return; }
  });
}
