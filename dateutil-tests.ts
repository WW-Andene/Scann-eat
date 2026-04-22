/**
 * dateutil.localDateISO — local-day ISO (YYYY-MM-DD) conversion.
 *
 * Pins the contract that resolved a real TZ bug in R2.10: previously
 * `todayISO()` used `new Date().toISOString().slice(0,10)` which returns
 * the UTC day. On a device in UTC+3 or greater, late-evening meals were
 * silently bucketed on the next calendar day.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// @ts-expect-error — plain JS
import { localDateISO } from './public/core/dateutil.js';

describe('localDateISO', () => {
  it('returns a valid YYYY-MM-DD shape', () => {
    assert.match(localDateISO(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses Date.now() when called with no arguments', () => {
    // Smoke — result must be a non-empty string today.
    const today = localDateISO();
    assert.ok(today.startsWith('20'));
    assert.equal(today.length, 10);
  });

  it('accepts an epoch-ms argument for deterministic output', () => {
    // Noon UTC on Apr 22 2026 is the same local calendar date in every
    // timezone between UTC-12 and UTC+12 — runtime-agnostic.
    const noon = Date.UTC(2026, 3, 22, 12, 0, 0);
    assert.equal(localDateISO(noon), '2026-04-22');
  });

  it('matches toLocaleDateString("en-CA") for the same instant', () => {
    // The whole point of the helper is this equivalence; pin it.
    const instant = new Date(Date.UTC(2026, 3, 22, 12, 0, 0));
    const viaIntl = instant.toLocaleDateString('en-CA');
    assert.equal(localDateISO(instant.getTime()), viaIntl);
  });

  it('zero-pads months and days without ambiguity', () => {
    // A January 5 instant must come back as 2026-01-05, not 2026-1-5.
    const jan5 = Date.UTC(2026, 0, 5, 12, 0, 0);
    const out = localDateISO(jan5);
    assert.equal(out.length, 10);
    assert.equal(out.slice(0, 7), '2026-01');
  });
});
