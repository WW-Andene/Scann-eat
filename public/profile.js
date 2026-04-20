/**
 * User profile storage + authoritative physiological calculations.
 *
 * AUTHORITATIVE sources:
 *   - BMR (Mifflin-St Jeor): Mifflin MD, St Jeor ST, Hill LA, Scott BJ,
 *     Daugherty SA, Koh YO. "A new predictive equation for resting energy
 *     expenditure in healthy individuals." Am J Clin Nutr 1990;51:241-247.
 *   - Activity factors (PAL): FAO/WHO/UNU "Human Energy Requirements",
 *     Report of a Joint FAO/WHO/UNU Expert Consultation (Rome, 2001;
 *     published 2004).
 *   - BMI cutoffs: WHO Global Database on BMI (2000; reaffirmed 2023).
 *   - Protein Population Reference Intake: EFSA Scientific Opinion on
 *     Dietary Reference Values for protein, EFSA Journal 2012;10(2):2557.
 */

const LS_PROFILE = 'scanneat.profile';

export const DEFAULT_MODIFIERS = {
  lowSugar: false,
  lowSalt: false,
  highProtein: false,
  organic: false,
};

export const DEFAULT_PROFILE = {
  sex: null,            // 'male' | 'female' | 'other'
  age_years: null,
  height_cm: null,
  weight_kg: null,
  activity: null,       // sedentary | light | moderate | active | very_active
  diet: 'none',         // HARD constraint — violation caps personal score at 0
  custom_diet: null,    // { forbidden: string[], preferred: string[] } when diet==='custom'
  modifiers: { ...DEFAULT_MODIFIERS }, // SOFT preferences — fine-tune within compatible products
};

const LEGACY_PREFS_KEY = 'scanneat.prefs';

export function getProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    let p = raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };

    // One-time migration: the legacy LS_PREFS key held the dietary preference
    // checkboxes from the Settings dialog. Consolidate them into the profile.
    if (!p.modifiers || typeof p.modifiers !== 'object') {
      p.modifiers = { ...DEFAULT_MODIFIERS };
    } else {
      p.modifiers = { ...DEFAULT_MODIFIERS, ...p.modifiers };
    }
    const legacy = localStorage.getItem(LEGACY_PREFS_KEY);
    if (legacy) {
      try {
        const old = JSON.parse(legacy);
        if (old && typeof old === 'object') {
          p.modifiers = {
            lowSugar: p.modifiers.lowSugar || !!old.lowSugar,
            lowSalt: p.modifiers.lowSalt || !!old.lowSalt,
            highProtein: p.modifiers.highProtein || !!old.highProtein,
            organic: p.modifiers.organic || !!old.organic,
          };
          // Map legacy "vegetarian" checkbox into the diet dropdown if unset.
          if (old.vegetarian && (!p.diet || p.diet === 'none')) {
            p.diet = 'vegetarian';
          }
          setProfile(p);
          localStorage.removeItem(LEGACY_PREFS_KEY);
        }
      } catch { /* ignore corrupt legacy blob */ }
    }
    return p;
  } catch { return { ...DEFAULT_PROFILE }; }
}

export function setProfile(p) {
  localStorage.setItem(LS_PROFILE, JSON.stringify(p));
}

export function hasMinimalProfile(p) {
  // Enough to compute BMR + TDEE + apply diet rules.
  return (
    p.sex != null &&
    typeof p.age_years === 'number' && p.age_years > 0 &&
    typeof p.height_cm === 'number' && p.height_cm > 0 &&
    typeof p.weight_kg === 'number' && p.weight_kg > 0 &&
    p.activity != null
  );
}

/** Mifflin-St Jeor BMR in kcal/day. */
export function bmrMifflinStJeor(p) {
  if (!hasMinimalProfile(p)) return null;
  const sexOffset = p.sex === 'female' ? -161 : 5; // "other" treated as male per study population
  return Math.round(10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age_years + sexOffset);
}

/** Physical Activity Level multipliers — FAO/WHO/UNU 2004 Table 5.1. */
export const ACTIVITY_PAL = {
  sedentary:   1.40, // bedrest or very light activity (FAO/WHO/UNU lower bound 1.40)
  light:       1.55, // light lifestyle
  moderate:    1.75, // moderately active lifestyle
  active:      1.90, // vigorous / vigorously active lifestyle
  very_active: 2.20, // heavy occupational + training (upper end)
};

export function tdeeKcal(p) {
  const bmr = bmrMifflinStJeor(p);
  const factor = ACTIVITY_PAL[p.activity];
  if (bmr == null || factor == null) return null;
  return Math.round(bmr * factor);
}

/** BMI = kg / m². WHO cutoffs. */
export function bmi(p) {
  if (!p.height_cm || !p.weight_kg) return null;
  const m = p.height_cm / 100;
  return +(p.weight_kg / (m * m)).toFixed(1);
}

export function bmiCategory(value) {
  if (value == null) return null;
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  if (value < 35) return 'obese_1';
  if (value < 40) return 'obese_2';
  return 'obese_3';
}

/**
 * Protein Population Reference Intake (PRI).
 * EFSA 2012: 0.83 g/kg bw/day for adults. ≥65y: 1.0 g/kg/day (sarcopenia prevention).
 * During growth or pregnancy: higher values — outside this app's scope.
 */
export function proteinPRI_g(p) {
  if (!p.weight_kg || !p.age_years) return null;
  const per_kg = p.age_years >= 65 ? 1.0 : 0.83;
  return Math.round(p.weight_kg * per_kg);
}

/**
 * Daily targets derived from TDEE + WHO/EFSA macronutrient distribution
 * ranges. Fat/carb targets use midpoints of the EFSA Acceptable Macro-
 * nutrient Distribution Ranges (AMDR, EFSA Journal 2010;8(3):1461) because
 * no single "target" is authoritative — 45-65 %E carbs / 20-35 %E fat.
 *
 * Sat fat: <10 %E → grams = 0.10 × kcal / 9 (WHO SFA Guideline 2023).
 * Free sugars: <10 %E ideal <5 %E (WHO Sugars Guideline 2015).
 * Salt: <5 g/day flat (WHO Salt Guideline 2012).
 * Protein: EFSA PRI 0.83 g/kg/d (1.0 g/kg/d ≥65y).
 */
export function dailyTargets(p) {
  const tdee = tdeeKcal(p);
  if (tdee == null) return null;
  return {
    kcal: tdee,
    carbs_g_target: Math.round((0.50 * tdee) / 4),         // AMDR midpoint 45-65 %E
    fat_g_target: Math.round((0.30 * tdee) / 9),           // AMDR midpoint 20-35 %E
    sat_fat_g_max: Math.round((0.10 * tdee) / 9),
    free_sugars_g_max: Math.round((0.10 * tdee) / 4),
    free_sugars_g_ideal: Math.round((0.05 * tdee) / 4),
    salt_g_max: 5,
    protein_g_target: proteinPRI_g(p),
  };
}
