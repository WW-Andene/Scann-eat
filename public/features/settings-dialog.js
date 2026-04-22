/**
 * Settings dialog — API key, mode, language, theme, font, motion,
 * meal reminders, telemetry opt-in, profiles list.
 *
 * Writes flow through the central app-settings shim so every value is
 * validated against its typed schema. On save, triggers a re-paint of
 * theme + reading prefs, re-schedules reminders, switches the active
 * locale, and re-runs applyStaticTranslations() so all data-i18n nodes
 * update immediately.
 *
 * ADR-0004 feature-folder pattern. Owns the button wiring, not the
 * state — state lives in localStorage / app-settings.js.
 *
 * Deps shape:
 *   { t, setLang, applyStaticTranslations,
 *     isCapacitor, currentLang,
 *     applyTheme, applyReadingPrefs,
 *     setSetting, scheduleReminders,
 *     renderProfilesUI, telemetryEnabled, setTelemetryEnabled,
 *     onLangChange() }
 *
 * onLangChange is invoked once after setLang + applyStaticTranslations so
 * the caller can re-run any dynamically built renderers (e.g. the
 * dashboard's life-stage chip, per-meal "% of day" labels) whose copy
 * doesn't live on data-i18n nodes.
 */

const LS_MODE = 'scanneat.mode';
const LS_THEME = 'scanneat.theme';
const LS_FONT_SIZE = 'scanneat.font_size';
const LS_FONT_FAMILY = 'scanneat.font_family';
const LS_MOTION = 'scanneat.motion';

function $(id) { return document.getElementById(id); }

export function initSettingsDialog(deps) {
  const {
    setLang, applyStaticTranslations,
    isCapacitor, currentLang,
    applyTheme, applyReadingPrefs,
    setSetting, scheduleReminders,
    renderProfilesUI, telemetryEnabled, setTelemetryEnabled,
    getKey, onLangChange,
  } = deps;

  const settingsBtn = $('settings-btn');
  const settingsDialog = $('settings-dialog');
  const keyInput = $('settings-key');
  const modeSelect = $('settings-mode');
  const langSelect = $('settings-language');
  const themeSelect = $('settings-theme');
  const settingsSave = $('settings-save');
  const settingsCancel = $('settings-cancel');

  settingsBtn?.addEventListener('click', () => {
    keyInput.value = getKey();
    modeSelect.value = localStorage.getItem(LS_MODE) || (isCapacitor ? 'direct' : 'auto');
    langSelect.value = currentLang();
    themeSelect.value = localStorage.getItem(LS_THEME) || 'dark';
    const fontSizeSel = $('settings-font-size');
    const fontFamSel = $('settings-font-family');
    const motionSel = $('settings-motion');
    if (fontSizeSel) fontSizeSel.value = localStorage.getItem(LS_FONT_SIZE) || 'normal';
    if (fontFamSel)  fontFamSel.value  = localStorage.getItem(LS_FONT_FAMILY) || 'atkinson';
    if (motionSel)   motionSel.value   = localStorage.getItem(LS_MOTION) || 'normal';
    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      const cb = $(`reminder-${meal}`);
      const tm = $(`reminder-${meal}-time`);
      if (cb) cb.checked = localStorage.getItem(`scanneat.reminder.${meal}.on`) === '1';
      if (tm) {
        const stored = localStorage.getItem(`scanneat.reminder.${meal}.time`);
        if (stored) tm.value = stored;
      }
    }
    renderProfilesUI?.();
    const telCb = $('telemetry-enabled');
    if (telCb) telCb.checked = telemetryEnabled();
    settingsDialog.showModal();
  });

  settingsSave?.addEventListener('click', (e) => {
    e.preventDefault();
    setSetting('scanneat.key', keyInput.value.trim());
    setSetting('scanneat.mode', modeSelect.value);
    setSetting('scanneat.theme', themeSelect.value);
    const fontSizeSel = $('settings-font-size');
    const fontFamSel = $('settings-font-family');
    const motionSel = $('settings-motion');
    if (fontSizeSel) setSetting('scanneat.fontSize', fontSizeSel.value);
    if (fontFamSel)  setSetting('scanneat.fontFamily', fontFamSel.value);
    if (motionSel)   setSetting('scanneat.motion', motionSel.value);
    // Reminder prefs — writing raw ('on'/time) because these aren't in
    // the setSetting schema yet (they're meal-scoped).
    let anyRemindersOn = false;
    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      const cb = $(`reminder-${meal}`);
      const tm = $(`reminder-${meal}-time`);
      const on = !!cb?.checked;
      if (on) anyRemindersOn = true;
      localStorage.setItem(`scanneat.reminder.${meal}.on`, on ? '1' : '0');
      if (tm?.value) localStorage.setItem(`scanneat.reminder.${meal}.time`, tm.value);
    }
    // If at least one reminder is newly on, request Notification permission
    // (noop if already granted). Fire-and-forget.
    if (anyRemindersOn && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch { /* noop */ }
    }
    scheduleReminders();
    const prevLang = currentLang();
    setLang(langSelect.value);
    applyTheme();
    applyReadingPrefs();
    // Telemetry opt-in checkbox, when present.
    const telCb = $('telemetry-enabled');
    if (telCb && setTelemetryEnabled) setTelemetryEnabled(telCb.checked);
    settingsDialog.close();
    applyStaticTranslations();
    // Dynamic renderers (dashboard life-stage chip, per-meal "% of day",
    // weekly view, etc.) live outside data-i18n — nudge the caller to
    // re-render them when the locale actually changed.
    if (onLangChange && currentLang() !== prevLang) onLangChange();
  });

  settingsCancel?.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDialog.close();
  });
}
