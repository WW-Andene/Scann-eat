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

import { checkDiet, DIET_DEFS } from '/diets.js';
import { bmi, bmiCategory, hasMinimalProfile } from '/profile.js';

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
    // Soften the sugar penalty by +3 if moderate sugar (5–15g) — athletes tolerate more carbs.
    if (product.nutrition.sugars_g > 5 && product.nutrition.sugars_g <= 15) {
      adjustments.push({
        points: +2,
        reason: lang === 'en'
          ? `Moderate-sugar product — active lifestyle can use carbs`
          : `Sucres modérés — ton activité justifie un apport glucidique`,
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
