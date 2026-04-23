# Audit — Round 28

Voice-dictate error feedback.

## Fix/improve (real)
- **R28.1 (real UX bug)**: `rec.onerror` was a silent no-op. Users
  who denied the mic permission, or spoke too softly, saw the
  listening state flicker and then nothing — a mystery failure.
  Now surfaces a translated message into `#qa-ai-status` with the
  three common branches: `not-allowed` → `voiceMicDenied`;
  `no-speech` → `voiceNoSpeech`; anything else → `voiceFailed`.
- **R28.2**: safe `.label` querySelector — label update no longer
  throws if the HTML template ever ships without a `.label` span.

## New i18n keys
- `voiceMicDenied`, `voiceNoSpeech`, `voiceFailed` (EN + FR).

## Arc state
- Tests: 567 passing.
