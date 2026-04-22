/**
 * Live barcode scanner — camera + BarcodeDetector loop.
 *
 * ADR-0004 feature-folder pattern. openCameraScanner()/closeCameraScanner()
 * are exported so app.js can wire them to buttons and dialog-close events
 * without owning the lifecycle or camera stream.
 *
 * Deps shape:
 *   { t, errorEl, show, toast,
 *     getBarcodeDetector, scanImage, addBarcodeOnly }
 *
 * DOM elements (#camera-dialog, #camera-video, #camera-status,
 * #camera-torch) are looked up by id at open time.
 */

let deps = null;
let cameraStream = null;
let cameraLoopHandle = null;

function $(id) { return document.getElementById(id); }
function hide(el) { if (el) el.setAttribute('hidden', ''); }

export async function openCameraScanner() {
  const { t, errorEl, show, getBarcodeDetector, scanImage, addBarcodeOnly } = deps;
  const cameraDialog = $('camera-dialog');
  const cameraVideo = $('camera-video');
  const cameraStatus = $('camera-status');
  if (!getBarcodeDetector()) {
    errorEl.textContent = t('cameraUnsupported'); show(errorEl); return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }, audio: false,
    });
  } catch {
    errorEl.textContent = t('cameraDenied'); show(errorEl); return;
  }
  cameraVideo.srcObject = cameraStream;
  cameraDialog.showModal();
  cameraStatus.textContent = t('cameraReady');

  // Torch button appears only when the active video track reports
  // capabilities.torch — Chrome Android exposes it on most phones, iOS
  // Safari never does. Hidden = feature not available.
  const torchBtn = $('camera-torch');
  const track = cameraStream.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() || {};
  if (torchBtn && caps.torch) {
    torchBtn.dataset.on = '0';
    torchBtn.setAttribute('aria-pressed', 'false');
    show(torchBtn);
  } else if (torchBtn) {
    hide(torchBtn);
  }

  const detector = getBarcodeDetector();
  const scan = async () => {
    if (!cameraDialog.open) return;
    try {
      const codes = await detector.detect(cameraVideo);
      for (const c of codes) {
        const d = (c.rawValue || '').replace(/\D/g, '');
        if (d.length === 8 || d.length === 12 || d.length === 13) {
          // Small haptic blip so users holding the phone know it caught it
          // even before the overlay closes. 50 ms stays under the reduce-
          // motion threshold most users set via vibration-strength settings.
          try { navigator.vibrate?.(50); } catch { /* not supported */ }
          closeCameraScanner();
          addBarcodeOnly(d);
          await scanImage();
          return;
        }
      }
    } catch { /* ignore detection errors */ }
    cameraLoopHandle = setTimeout(scan, 250);
  };
  scan();
}

export function closeCameraScanner() {
  const cameraDialog = $('camera-dialog');
  const cameraVideo = $('camera-video');
  if (cameraLoopHandle) clearTimeout(cameraLoopHandle);
  cameraLoopHandle = null;
  if (cameraStream) {
    // Make sure torch is off before releasing the track, so the LED doesn't
    // linger when the user closes the scanner without capturing.
    try {
      const track = cameraStream.getVideoTracks()[0];
      track?.applyConstraints?.({ advanced: [{ torch: false }] });
    } catch { /* ignore */ }
    cameraStream.getTracks().forEach((t) => t.stop()); cameraStream = null;
  }
  const torchBtn = $('camera-torch');
  if (torchBtn) { torchBtn.dataset.on = '0'; torchBtn.setAttribute('aria-pressed', 'false'); }
  if (cameraVideo) cameraVideo.srcObject = null;
  if (cameraDialog?.open) cameraDialog.close();
}

export function initScanner(injected) {
  deps = injected;
  // Torch toggle is stable — register it once.
  const torchBtn = $('camera-torch');
  torchBtn?.addEventListener('click', async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (!track?.applyConstraints) return;
    const on = torchBtn.dataset.on !== '1';
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      torchBtn.dataset.on = on ? '1' : '0';
      torchBtn.setAttribute('aria-pressed', String(on));
    } catch { /* torch failed; leave state unchanged */ }
  });
}
