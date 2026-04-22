/**
 * Global keyboard shortcuts.
 *
 *   Escape       — closes every open <dialog>. Browser does this for
 *                  modal dialogs automatically; we extend it so non-
 *                  modal dialogs (settings-like) also close.
 *   /            — focuses the history search input.
 *   Enter        — triggers the Scan button when the user isn't typing
 *                  in a form field.
 *
 * ADR-0004 feature-folder pattern. Single init; no render loop.
 *
 * Deps shape:
 *   { scanBtn, historySearchInput }
 */

export function initKeybindings({ scanBtn, historySearchInput }) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const d of document.querySelectorAll('dialog[open]')) d.close();
      return;
    }
    const tag = (e.target?.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (!typing && e.key === '/' && historySearchInput) {
      e.preventDefault();
      historySearchInput.focus();
      return;
    }
    if (!typing && e.key === 'Enter' && scanBtn && !scanBtn.disabled) {
      scanBtn.click();
    }
  });
}
