# Audit — Round 21

Scanner audit — battery and accessibility wins.

## Fix/improve (real)
- **R21.1 (battery)**: camera scan loop pauses when `document.hidden`.
  Previously the 4 Hz `detector.detect()` call kept firing while the
  user had switched tabs. The video stream was already suspended by
  the browser; the detect call was burning CPU with nothing to
  analyse. A `visibilitychange` listener restarts the loop when the
  user returns, and is cleaned up on dialog close via `{once:true}`.
- **R21.2 (a11y)**: haptic vibrate on successful barcode detection
  now respects the reduce-motion preference. Users who opt out of
  animated UI typically don't want 50 ms vibrations either — the
  navigator.vibrate call is now gated by
  `document.body.classList.contains('reduce-motion')`.

## Arc state
- Tests: 567 passing.
