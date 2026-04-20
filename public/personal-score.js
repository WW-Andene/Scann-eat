/**
 * Personal-score adjustments layered on top of the classic score.
 *
 * Design: we do NOT recompute the audit. We apply a transparent set of
 * adjustments — each with a reason and points — that sum into a delta.
 * The personal score = classic + delta, clamped 0–100.
 *
 * AUTHORITATIVE anchors for the adjustments:
 *   - Protein PRI by age: EFSA Scientific Opinion 2012;10(2):2557
 *     (0.83 g/kg for adults; ≥65y 1.0 g/kg for sarcopenia prevention).
 *   - Iron RNI by sex: EFSA Scientific Opinion 2015;13(10):4254 (adult
 *     men 11 mg/day; menstruating women 16 mg/day).
 *   - Sodium sensitivity, BMI-related thresholds: WHO Global Database on
 *     BMI (2000); WHO Salt Guideline (2012).
 *   - Athlete protein / carb context: IOC Consensus on Sports Nutrition
 *     (Br J Sports Med 2018).
 *
 * EDITORIAL: point magnitudes (±2, ±5, ±15, ±30) are Scann-eat's choice,
 * not a validated calibration. Diet non-compliance uses a strong -30
 * penalty to reflect that a vegan is not going to eat a product with
 * meat regardless of how well-scored it is on other axes.
 */

import { checkDiet, DIET_DEFS } from './diets.js';
import {
  bmi, bmiCategory, hasMinimalProfile,
  dailyTargets, proteinPRI_g,
} from './profile.js';

/**
 * @returns {{
 *   personal_score: number,
 *   delta: number,
 *   adjustments: Array<{points: number, reason: string, category: 'diet' | 'age' | 'sex' | 'activity' | 'bmi'}>,
 *   applicable: boolean,
 *   diet_reason: string | null
 * }}
 */
export function computePersonalScore(audit, product, profile, lang = 'fr') {
  const applicable = (profile?.diet && profile.diet !== 'none') || hasMinimalProfile(profile);
  if (!applicable) {
    return {
      personal_score: audit.score,
      delta: 0,
      adjustments: [],
      applicable: false,
      diet_reason: null,
    };
  }

  const adjustments = [];
  let dietReason = null;

  // ===== DIET COMPLIANCE =====
  if (profile.diet && profile.diet !== 'none') {
    const r = checkDiet(product, profile.diet, profile.custom_diet, lang);
    if (!r.compliant) {
      adjustments.push({
        points: -30,
        reason: r.reason,
        category: 'diet',
      });
      dietReason = r.reason;
    } else if (r.certified) {
      adjustments.push({
        points: +5,
        reason: lang === 'en'
          ? `${DIET_DEFS[profile.diet].label_en} certification detected: ${r.preferredHits.slice(0, 2).join(', ')}`
          : `Certification ${DIET_DEFS[profile.diet].label_fr} détectée : ${r.preferredHits.slice(0, 2).join(', ')}`,
        category: 'diet',
      });
    } else if (r.preferredHits.length > 0) {
      adjustments.push({
        points: +3,
        reason: lang === 'en'
          ? `${DIET_DEFS[profile.diet].label_en}-friendly ingredients: ${r.preferredHits.slice(0, 2).join(', ')}`
          : `Conforme ${DIET_DEFS[profile.diet].label_fr} : ${r.preferredHits.slice(0, 2).join(', ')}`,
        category: 'diet',
      });
    }
  }

  // ===== AGE-BASED =====
  if (typeof profile.age_years === 'number' && profile.age_years > 0) {
    if (profile.age_years >= 65 && product.nutrition.protein_g >= 12) {
      adjustments.push({
        points: +3,
        reason: lang === 'en'
          ? `High protein (${product.nutrition.protein_g} g/100 g) — helps prevent sarcopenia (EFSA PRI 1.0 g/kg/day for ≥65)`
          : `Protéines élevées (${product.nutrition.protein_g} g/100 g) — prévention de la sarcopénie (PRI EFSA 1,0 g/kg/j après 65 ans)`,
        category: 'age',
      });
    }
    if (profile.age_years >= 50 && product.nutrition.salt_g > 1.5) {
      adjustments.push({
        points: -3,
        reason: lang === 'en'
          ? `Salt penalty amplified after 50y (higher hypertension risk, WHO salt guideline 2012)`
          : `Pénalité sel amplifiée après 50 ans (risque d'hypertension accru, OMS 2012)`,
        category: 'age',
      });
    }
    if (profile.age_years < 18) {
      // Children / adolescents: sugar and additive concerns are amplified.
      if (product.nutrition.sugars_g > 15) {
        adjustments.push({
          points: -4,
          reason: lang === 'en'
            ? `Sugar penalty amplified for under-18 (WHO added-sugar target stricter in children)`
            : `Pénalité sucres amplifiée chez les moins de 18 ans (recommandations OMS plus strictes)`,
          category: 'age',
        });
      }
      const hasColorant = product.ingredients.some((i) =>
        /\bE(102|104|110|122|124|129)\b/i.test(i.name) || !!i.e_number?.match(/^E(102|104|110|122|124|129)$/i),
      );
      if (hasColorant) {
        adjustments.push({
          points: -3,
          reason: lang === 'en'
            ? `Azo colorant under EU hyperactivity-warning label (Reg. 1333/2008) in a product for a child`
            : `Colorant azoïque avec avertissement UE hyperactivité (Règl. 1333/2008) — consommateur mineur`,
          category: 'age',
        });
      }
    }
  }

  // ===== SEX =====
  if (profile.sex === 'female' && profile.age_years != null && profile.age_years >= 13 && profile.age_years <= 50) {
    const declaresIron = product.declared_micronutrients?.some((m) => /iron|fer/i.test(m));
    if (declaresIron) {
      adjustments.push({
        points: +2,
        reason: lang === 'en'
          ? `Iron-declared product — menstruating women have higher RNI (EFSA 2015: 16 mg/day)`
          : `Fer déclaré — les femmes en âge menstruel ont un besoin plus élevé (EFSA 2015 : 16 mg/j)`,
        category: 'sex',
      });
    }
  }

  // ===== ACTIVITY =====
  if (profile.activity === 'active' || profile.activity === 'very_active') {
    if (product.nutrition.protein_g >= 15) {
      adjustments.push({
        points: +2,
        reason: lang === 'en'
          ? `High-protein product — supports athlete recovery (IOC 2018: 1.2–2.0 g/kg/day)`
          : `Protéines élevées — adaptées à la récupération sportive (CIO 2018 : 1,2–2,0 g/kg/j)`,
        category: 'activity',
      });
    }
    if (product.nutrition.sugars_g > 5 && product.nutrition.sugars_g <= 15) {
      adjustments.push({
        points: +2,
        reason: lang === 'en'
          ? `Moderate-sugar product — active lifestyle uses carbs`
          : `Sucres modérés — ton activité justifie un apport glucidique`,
        category: 'activity',
      });
    }
  }
  if (profile.activity === 'light' || profile.activity === 'moderate') {
    // Neutral band: protein bonus halved, sugar penalty halved.
    if (product.nutrition.protein_g >= 15) {
      adjustments.push({
        points: +1,
        reason: lang === 'en'
          ? `High protein — useful for moderate-activity adults (EFSA PRI 0.83 g/kg/day)`
          : `Protéines élevées — utiles pour un niveau d'activité modéré (PRI EFSA 0,83 g/kg/j)`,
        category: 'activity',
      });
    }
  }
  if (profile.activity === 'sedentary') {
    if (product.nutrition.sugars_g > 10) {
      adjustments.push({
        points: -3,
        reason: lang === 'en'
          ? `Sedentary lifestyle — sugar penalty amplified (higher insulin-resistance risk)`
          : `Mode de vie sédentaire — pénalité sucres amplifiée (risque accru de résistance insulinique)`,
        category: 'activity',
      });
    }
  }

  // ===== PROTEIN PRI (uses weight_kg + age_years) =====
  const priTarget = proteinPRI_g(profile);
  if (priTarget != null) {
    const per100 = product.nutrition.protein_g;
    // "Protein-dense" = a 100 g serving covers ≥20 % of the user's daily PRI.
    const pctOfPRI = (per100 / priTarget) * 100;
    if (pctOfPRI >= 20) {
      adjustments.push({
        points: +2,
        reason: lang === 'en'
          ? `100 g covers ${pctOfPRI.toFixed(0)} % of your daily protein target (${priTarget} g, EFSA PRI adjusted for your weight/age)`
          : `100 g couvre ${pctOfPRI.toFixed(0)} % de ton besoin protéique journalier (${priTarget} g, PRI EFSA ajusté à ton poids/âge)`,
        category: 'bmi',
      });
    }
  }

  // ===== DAILY TARGET CONTEXT (uses weight_kg + height_cm + age_years + activity) =====
  const targets = dailyTargets(profile);
  if (targets) {
    // Single-serving cost: if a 100 g portion uses ≥50 % of the user's daily
    // sat-fat budget, that's a strong personalized red flag.
    const satFatPct = (product.nutrition.saturated_fat_g / Math.max(1, targets.sat_fat_g_max)) * 100;
    if (satFatPct >= 50) {
      adjustments.push({
        points: -4,
        reason: lang === 'en'
          ? `100 g uses ${satFatPct.toFixed(0)} % of your daily sat-fat budget (${targets.sat_fat_g_max} g from TDEE×10 %E, WHO 2023)`
          : `100 g consomme ${satFatPct.toFixed(0)} % de ton budget AGS journalier (${targets.sat_fat_g_max} g selon TDEE×10 %E, OMS 2023)`,
        category: 'bmi',
      });
    }
    const sugars = product.nutrition.added_sugars_g ?? product.nutrition.sugars_g;
    const sugarPct = (sugars / Math.max(1, targets.free_sugars_g_max)) * 100;
    if (sugarPct >= 50) {
      adjustments.push({
        points: -4,
        reason: lang === 'en'
          ? `100 g uses ${sugarPct.toFixed(0)} % of your daily free-sugar budget (${targets.free_sugars_g_max} g from TDEE×10 %E, WHO 2015; ideal ${targets.free_sugars_g_ideal} g at 5 %E)`
          : `100 g consomme ${sugarPct.toFixed(0)} % de ton budget sucres libres (${targets.free_sugars_g_max} g selon TDEE×10 %E, OMS 2015 ; idéal ${targets.free_sugars_g_ideal} g à 5 %E)`,
        category: 'bmi',
      });
    }
    const saltPct = (product.nutrition.salt_g / targets.salt_g_max) * 100;
    if (saltPct >= 30) {
      adjustments.push({
        points: -3,
        reason: lang === 'en'
          ? `100 g uses ${saltPct.toFixed(0)} % of the WHO 5 g/day salt ceiling`
          : `100 g consomme ${saltPct.toFixed(0)} % du plafond OMS de 5 g/j de sel`,
        category: 'bmi',
      });
    }
  }

  // ===== BMI =====
  const bmiValue = bmi(profile);
  const bmiCat = bmiCategory(bmiValue);
  if (bmiCat === 'overweight' || bmiCat?.startsWith('obese')) {
    if (product.nutrition.sat_fat_g > 5 || product.nutrition.sugars_g > 15) {
      adjustments.push({
        points: -4,
        reason: lang === 'en'
          ? `BMI ${bmiValue} (${bmiCat}) — high sat fat / sugar penalty amplified (WHO 2000 BMI + cardiometabolic guidance)`
          : `IMC ${bmiValue} (${bmiCat}) — pénalité accrue sur graisses saturées / sucres élevés (OMS 2000 IMC)`,
        category: 'bmi',
      });
    }
  }
  if (bmiCat === 'underweight') {
    if (product.nutrition.energy_kcal > 300 && product.nutrition.protein_g >= 8) {
      adjustments.push({
        points: +2,
        reason: lang === 'en'
          ? `BMI ${bmiValue} (underweight) — energy- and protein-dense product is supportive`
          : `IMC ${bmiValue} (insuffisance pondérale) — produit dense en énergie et protéines, bénéfique`,
        category: 'bmi',
      });
    }
  }

  const delta = adjustments.reduce((s, a) => s + a.points, 0);
  const personal_score = Math.max(0, Math.min(100, audit.score + delta));
  return {
    personal_score: Math.round(personal_score),
    delta,
    adjustments,
    applicable: true,
    diet_reason: dietReason,
  };
}

/** Map the 0-100 personal score to the same A+/A/B/C/D/F grade scale. */
export function personalGrade(score) {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}
