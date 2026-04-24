/**
 * First-run onboarding slideshow.
 *
 * Only ever shown once; once the user clicks through OR hits Escape, we
 * flip `scanneat.onboarded=1` and never show it again. Slides live in
 * index.html as `.ob-slide[data-slide=N]` elements inside
 * #onboarding-dialog.
 *
 * ADR-0004 feature-folder pattern. The single entry point is
 * maybeShowOnboarding(deps); it's a no-op once the user has dismissed
 * the dialog, so it's safe to call unconditionally at boot.
 *
 * Deps shape: { t }
 */

const LS_ONBOARDED = 'scanneat.onboarded';

export function maybeShowOnboarding({ t }) {
  if (localStorage.getItem(LS_ONBOARDED) === '1') return;
  const obDialog = document.getElementById('onboarding-dialog');
  const obNext = document.getElementById('ob-next');
  const obSkip = document.getElementById('ob-skip');
  if (!obDialog || !obNext || !obSkip) return;

  const slides = obDialog.querySelectorAll('.ob-slide');
  const dots = obDialog.querySelectorAll('.ob-dot');
  const TOTAL = slides.length;
  let current = 1;
  const render = () => {
    slides.forEach((s) => { s.hidden = Number(s.dataset.slide) !== current; });
    dots.forEach((d, i) => d.classList.toggle('active', i + 1 === current));
    obNext.textContent = current === TOTAL ? t('start') : t('next');
  };
  // R34.I2: use addEventListener with { once: false } and a single
  // close listener that tears everything down on dismissal, instead
  // of mixing .onclick assignments (which leak when reinvoked) with
  // addEventListener. Keeps the handlers disposable if anyone ever
  // re-calls maybeShowOnboarding before dismissal.
  const onNext = () => {
    if (current < TOTAL) { current++; render(); }
    else { localStorage.setItem(LS_ONBOARDED, '1'); obDialog.close(); }
  };
  const onSkip = () => {
    localStorage.setItem(LS_ONBOARDED, '1');
    obDialog.close();
  };
  const onClose = () => {
    localStorage.setItem(LS_ONBOARDED, '1');
    obNext.removeEventListener('click', onNext);
    obSkip.removeEventListener('click', onSkip);
  };
  obNext.addEventListener('click', onNext);
  obSkip.addEventListener('click', onSkip);
  obDialog.addEventListener('close', onClose, { once: true });
  render();
  obDialog.showModal();
}
