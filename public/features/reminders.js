/**
 * Meal reminder scheduler — local, in-page only.
 *
 * Follows the feature-folder pattern (ADR-0004). Reminders fire via
 * setTimeout while the tab is open; on fire, they prefer the browser
 * Notification API and fall back to an in-app toast if permission is
 * denied.
 *
 * Exports:
 *   initReminders(deps) — wires up scheduleReminders() + exposes it.
 *   scheduleReminders() — re-reads localStorage prefs + queues next fire.
 *
 * Deps shape:
 *   { t, toast, nextOccurrenceMs }
 */

let deps = null;
const timers = [];

function fireMealReminder(meal) {
  const { t, toast } = deps;
  const body = t('reminderBody', { meal: t(
    meal === 'breakfast' ? 'mealBreakfast'
    : meal === 'lunch' ? 'mealLunch'
    : 'mealDinner',
  ).toLowerCase() });
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      // R29.1: `tag` dedupes across reminder fires — if the user has
      // a stale breakfast reminder sitting in the shade and lunch
      // fires, the tag stays distinct per meal so both show; but
      // re-firing the same meal (via multi-tab or re-scheduling)
      // replaces the prior notification instead of stacking.
      new Notification('Scann-eat', {
        body,
        icon: '/icon.svg',
        tag: `scanneat-reminder-${meal}`,
      });
    } catch { toast(body); }
  } else {
    toast(body);
  }
}

export function scheduleReminders() {
  if (!deps) return;
  const { nextOccurrenceMs } = deps;
  // Clear any pending timers first — called on boot + after settings save.
  for (const id of timers) clearTimeout(id);
  timers.length = 0;

  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    const on = localStorage.getItem(`scanneat.reminder.${meal}.on`) === '1';
    if (!on) continue;
    const time = localStorage.getItem(`scanneat.reminder.${meal}.time`);
    if (!time) continue;
    const nextMs = nextOccurrenceMs(time, Date.now());
    if (nextMs == null) continue;
    // setTimeout accepts up to ~24.8 days — plenty for a 24h-max window.
    const delay = Math.max(0, nextMs - Date.now());
    const id = setTimeout(() => {
      fireMealReminder(meal);
      // Re-schedule for the next day by re-running the whole planner.
      scheduleReminders();
    }, delay);
    timers.push(id);
  }
}

export function initReminders(injected) {
  deps = injected;
  scheduleReminders();
}
