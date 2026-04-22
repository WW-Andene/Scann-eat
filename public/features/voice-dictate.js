/**
 * Voice dictation for Quick Add — Web Speech API.
 *
 * Wires the mic button to the browser's SpeechRecognition, feeds the
 * transcript through parseVoiceQuickAdd, then fills the Quick Add form
 * fields. On Firefox / unsupported browsers, initVoiceDictate is a no-op
 * (the button stays hidden).
 *
 * ADR-0004 feature-folder pattern. Deps are injected so we don't hard-
 * depend on app.js globals.
 *
 * Deps shape:
 *   { t, currentLang, parseVoiceQuickAdd }
 */

export function initVoiceDictate({ t, currentLang, parseVoiceQuickAdd }) {
  const SpeechRecognitionImpl =
    globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  const btn = document.getElementById('qa-voice-btn');
  if (!SpeechRecognitionImpl || !btn) return;

  btn.removeAttribute('hidden');
  let recognizer = null;

  btn.addEventListener('click', () => {
    // Toggle: if already listening, stop.
    if (recognizer) { try { recognizer.stop(); } catch { /* ignore */ } return; }
    try {
      const rec = new SpeechRecognitionImpl();
      rec.lang = currentLang() === 'en' ? 'en-US' : 'fr-FR';
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        btn.dataset.state = 'listening';
        btn.querySelector('.label').textContent = t('voiceListening');
      };
      rec.onresult = (ev) => {
        const transcript = Array.from(ev.results)
          .map((r) => r[0]?.transcript || '')
          .join(' ')
          .trim();
        if (!transcript) return;
        // Parse the transcript into field candidates and only overwrite
        // fields the parser actually recognized, so a partial utterance
        // doesn't wipe values the user already typed.
        const parsed = parseVoiceQuickAdd(transcript);
        const setField = (id, v) => {
          const el = document.getElementById(id);
          if (el && v != null) el.value = String(v);
        };
        setField('qa-name',    parsed.name);
        setField('qa-kcal',    parsed.kcal);
        setField('qa-protein', parsed.protein_g);
        setField('qa-carbs',   parsed.carbs_g);
        setField('qa-fat',     parsed.fat_g);
      };
      rec.onerror = () => { /* handled by onend */ };
      rec.onend = () => {
        delete btn.dataset.state;
        btn.querySelector('.label').textContent = t('voiceDictate');
        recognizer = null;
      };
      recognizer = rec;
      rec.start();
    } catch { recognizer = null; }
  });
}
