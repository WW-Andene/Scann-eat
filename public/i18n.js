/**
 * Minimal i18n for Scann-eat. Keys are resolved against the user's chosen
 * language (fr/en) with French as the ultimate fallback. Engine output stays
 * in English — we only translate the UI chrome around it.
 */

const STRINGS = {
  fr: {
    tagline: 'Photographie une étiquette → note de 0 à 100',
    addPhoto: 'Prendre / choisir une photo',
    addAnotherPhoto: 'Ajouter une autre photo',
    maxPhotos: 'Maximum {n} photos',
    hintCapture: "Jusqu'à 4 photos (face + ingrédients + nutrition pour un meilleur score).",
    scanBarcode: 'Scanner un code-barres',
    analyse: 'Analyser',
    analysing: 'Analyse en cours…',
    analysingN: 'Analyse de {n} photos…',
    barcodeDetected: 'Code-barres {code} détecté, recherche Open Food Facts…',
    serverUnavailable: 'Serveur indisponible, appel direct Groq…',
    rescan: 'Scanner un autre produit',
    settings: 'Réglages',
    settingsKey: 'Clé API Groq',
    settingsKeyHint: "Stockée uniquement sur ton appareil (localStorage). Nécessaire dans l'APK ou en mode direct.",
    settingsMode: 'Mode',
    modeAuto: 'Auto (serveur, fallback direct)',
    modeServer: 'Serveur uniquement',
    modeDirect: 'Direct Groq (clé requise)',
    settingsLanguage: 'Langue',
    settingsPreferences: 'Préférences alimentaires',
    prefVegetarian: 'Végétarien',
    prefLowSugar: 'Faible en sucre',
    prefLowSalt: 'Faible en sel',
    prefHighProtein: 'Riche en protéines',
    prefOrganic: 'Bio uniquement',
    cancel: 'Annuler',
    save: 'Enregistrer',
    redFlags: 'Drapeaux rouges',
    greenFlags: 'Drapeaux verts',
    pillarDetail: 'Détail par pilier',
    ingredientsDetected: 'Ingrédients détectés',
    nutritionTable: 'Valeurs nutritionnelles',
    compareNext: 'Comparer au prochain scan',
    compareWaiting: '✓ En attente du prochain scan',
    comparison: 'Comparaison',
    comparePrev: 'Précédent',
    compareCurrent: 'Actuel',
    clear: 'Effacer',
    noFlag: 'Aucun',
    sourceOFF: '📦 Données Open Food Facts',
    sourceLLM: '📷 OCR par Llama 4 Scout',
    sourceMerged: '🔄 OFF + photo (données fusionnées)',
    confidenceHigh: '✓ Données fiables',
    confidenceMed: '≈ Données partielles',
    confidenceLow: '⚠ Extraction incertaine',
    updateAvail: 'Mise à jour disponible : ',
    install: 'Installer',
    whyThisFlag: 'Pourquoi ce drapeau ?',
    ok: 'OK',
    pillarProcessing: 'Traitement',
    pillarDensity: 'Densité nutritionnelle',
    pillarNegatives: 'Nutriments négatifs',
    pillarAdditives: 'Additifs',
    pillarIntegrity: 'Intégrité ingrédients',
    deltaScore: 'Δ score',
    betterCurrent: '(actuel meilleur)',
    betterPrev: '(précédent meilleur)',
    newIngredients: 'Nouveau',
    lostIngredients: 'Perdu',
    offline: 'Hors ligne',
    pendingScans: '{n} scan en attente',
    pendingScansN: '{n} scans en attente',
    retryAll: 'Réessayer',
    cameraReady: 'Pointer vers le code-barres…',
    cameraUnsupported: 'Scan vidéo non supporté sur ce navigateur.',
    cameraDenied: 'Accès caméra refusé.',
    close: 'Fermer',
    prefMeatRed: 'Contient de la viande (non végétarien) : {name}',
    prefSugarRed: '{v}g sucres/100g — au-dessus de votre préférence',
    prefSaltRed: '{v}g sel/100g — au-dessus de votre préférence',
    prefNotOrganic: 'Produit non-bio',
    prefProteinGreen: '{v}g protéines/100g — conforme à votre préférence',
    recentScans: 'Scans récents',
    clearHistory: 'Effacer',
    allergens: 'Allergènes détectés',
    allergenIntro: 'Contient',
    sparseData: 'Données limitées — pour améliorer le score, rephotographie le panneau des ingrédients ou le tableau nutritionnel en plus gros plan.',
    removeFromHistory: 'Supprimer de l\'historique',
    daysAgo: 'il y a {n} j',
    hoursAgo: 'il y a {n} h',
    minutesAgo: 'il y a {n} min',
    justNow: "à l'instant",
    onboarding1Title: 'Photographie une étiquette',
    onboarding1Body: "Prends jusqu'à 4 photos (face + ingrédients + nutrition) et obtiens une note sur 100 avec le détail des pénalités.",
    onboarding2Title: 'Scan code-barres instantané',
    onboarding2Body: 'Les produits référencés sur Open Food Facts sont reconnus en moins d\'une seconde — sans appel au modèle vision.',
    onboarding3Title: 'Configurable, hors ligne, exportable',
    onboarding3Body: 'Ajoute ta clé Groq, choisis ta langue et tes préférences alimentaires. Les scans hors ligne se synchronisent ensuite.',
    skip: 'Passer',
    next: 'Suivant',
    start: 'Commencer',
    searchHistory: 'Rechercher…',
    allGrades: 'Toutes notes',
    pillarDetails: 'Détail du pilier',
    share: 'Partager',
    shareText: '{name} : {score}/100 ({grade}) — scanné avec Scann-eat',
    theme: 'Thème',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    themeAuto: 'Système',
    additiveSummary: '{total} additif(s) — {t1} Tier 1, {t2} Tier 2, {t3} Tier 3',
    additiveNone: 'Aucun additif détecté',
    palmOilRed: 'Contient de l\'huile de palme ou dérivé',
    omega3Green: 'Source d\'oméga-3 ({name})',
    ingFoods: 'Aliments',
    ingAdditives: 'Additifs',
    exportHistory: 'Exporter l\'historique',
    novaInferred: 'NOVA recalculé',
    about: 'À propos',
    disclaimerTitle: 'Information, pas conseil médical',
    disclaimerBody: `Scann-eat distingue explicitement deux types de données :

AUTORITAIRES (traçables à une source nommée) :
• Seuils des nutriments négatifs — FSA "Front of pack labelling guidance" 2016 (rouge sat ≥5 g/100 g, sucres ≥22,5 g/100 g, sel ≥1,5 g/100 g).
• Références journalières — OMS Guidelines (sat ≤10 %E, sucres libres ≤10 %E idéal <5 %E, sel <5 g/j, trans zéro REPLACE 2018).
• Cadre NOVA — Monteiro et al., Public Health Nutrition 2019;22(5).
• Association UPF / risque CV — Srour et al., BMJ 2019;365:l1451.
• Charcuterie = IARC Groupe 1 — Monographie Vol 114 (2015).
• Chaque additif dans la base a un champ 'source' citant EFSA, IARC, règlement UE ou étude primaire.

ÉDITORIAUX (jugement Scann-eat) :
• Pondérations des piliers (20/25/25/15/15) et seuils de notes A+ → F.
• Ajustements par catégorie (fromage sat fat, condiment sucre).
• Auto-correction NOVA lorsque l'entrée semble fausse.
• Pénalités premier ingrédient, bonus graisses saines / oméga-3, caps de veto.
• Puce "confiance" (high/medium/low).

Limites pratiques :
• Détection d'allergènes heuristique — pour une allergie sévère, lis l'étiquette réelle. Les "peut contenir" ne sont pas captés.
• Données Open Food Facts collaboratives — un produit reformulé peut ne pas être à jour.
• L'OCR Llama 4 peut mal lire une photo floue ; la puce "confiance" tente de le signaler.

Cette app est une aide à la décision, pas un avis nutritionniste ou médical. Pour une décision cruciale (allergie, pathologie), confirme avec un professionnel de santé et l'étiquette originale.`,
    onboarding4Title: 'Information, pas conseil médical',
    onboarding4Body: 'Les notes agrègent des données publiques (Open Food Facts) et un OCR par modèle vision. Limites des allergènes, fraîcheur des données, pondérations éditoriales — lis "À propos" dans les réglages.',
    profile: 'Profil',
    profileTitle: 'Profil personnel',
    profileIntro: 'Utilisé uniquement sur ton appareil pour calculer un score personnalisé. Aucune donnée envoyée.',
    profileSex: 'Sexe',
    sexMale: 'Homme',
    sexFemale: 'Femme',
    sexOther: 'Autre',
    profileAge: 'Âge (années)',
    profileHeight: 'Taille (cm)',
    profileWeight: 'Poids (kg)',
    profileActivity: "Niveau d'activité",
    activitySedentary: 'Sédentaire (PAL 1,40)',
    activityLight: 'Peu actif (PAL 1,55)',
    activityModerate: 'Modérément actif (PAL 1,75)',
    activityActive: 'Très actif (PAL 1,90)',
    activityVeryActive: 'Extrêmement actif (PAL 2,20)',
    profileDiet: 'Régime alimentaire',
    profileCustomDiet: 'Motifs personnalisés',
    profileCustomForbidden: 'Interdits (regex, un par ligne)',
    profileCustomPreferred: 'Préférés (regex, un par ligne)',
    profileDerived: 'Calculs dérivés',
    bmi: 'IMC',
    bmr: 'BMR (Mifflin-St Jeor)',
    tdee: 'TDEE',
    proteinTarget: 'Protéines cible/j',
    satfatMax: 'AGS max/j',
    freeSugarMax: 'Sucres libres max/j',
    classicScore: 'Score classique',
    personalScore: 'Score personnel',
    personalAdjustments: 'Ajustements personnels',
    personalNotApplicable: 'Profil non configuré — score classique uniquement.',
    bmiUnderweight: 'Insuffisance pondérale',
    bmiNormal: 'Normal',
    bmiOverweight: 'Surpoids',
    bmiObese1: 'Obésité classe I',
    bmiObese2: 'Obésité classe II',
    bmiObese3: 'Obésité classe III',
    scoringAnchors: 'Mifflin-St Jeor 1990 (BMR) · FAO/WHO/UNU 2004 (PAL) · WHO BMI 2000 · EFSA 2012 (PRI protéines)',
  },
  en: {
    tagline: 'Photograph a label → score out of 100',
    addPhoto: 'Take or pick a photo',
    addAnotherPhoto: 'Add another photo',
    maxPhotos: 'Maximum {n} photos',
    hintCapture: 'Up to 4 photos (front + ingredients + nutrition for best accuracy).',
    scanBarcode: 'Scan a barcode',
    analyse: 'Analyse',
    analysing: 'Analysing…',
    analysingN: 'Analysing {n} photos…',
    barcodeDetected: 'Barcode {code} detected, checking Open Food Facts…',
    serverUnavailable: 'Server unavailable, calling Groq directly…',
    rescan: 'Scan another product',
    settings: 'Settings',
    settingsKey: 'Groq API key',
    settingsKeyHint: 'Stored only on your device (localStorage). Required inside the APK or in direct mode.',
    settingsMode: 'Mode',
    modeAuto: 'Auto (server, fallback direct)',
    modeServer: 'Server only',
    modeDirect: 'Direct Groq (key required)',
    settingsLanguage: 'Language',
    settingsPreferences: 'Dietary preferences',
    prefVegetarian: 'Vegetarian',
    prefLowSugar: 'Low sugar',
    prefLowSalt: 'Low salt',
    prefHighProtein: 'High protein',
    prefOrganic: 'Organic only',
    cancel: 'Cancel',
    save: 'Save',
    redFlags: 'Red flags',
    greenFlags: 'Green flags',
    pillarDetail: 'Pillar breakdown',
    ingredientsDetected: 'Detected ingredients',
    nutritionTable: 'Nutrition facts',
    compareNext: 'Compare with next scan',
    compareWaiting: '✓ Waiting for next scan',
    comparison: 'Comparison',
    comparePrev: 'Previous',
    compareCurrent: 'Current',
    clear: 'Clear',
    noFlag: 'None',
    sourceOFF: '📦 Open Food Facts data',
    sourceLLM: '📷 OCR by Llama 4 Scout',
    sourceMerged: '🔄 OFF + photo (merged)',
    confidenceHigh: '✓ High-confidence data',
    confidenceMed: '≈ Partial data',
    confidenceLow: '⚠ Uncertain extraction',
    updateAvail: 'Update available: ',
    install: 'Install',
    whyThisFlag: 'Why this flag?',
    ok: 'OK',
    pillarProcessing: 'Processing',
    pillarDensity: 'Nutrient density',
    pillarNegatives: 'Negative nutrients',
    pillarAdditives: 'Additives',
    pillarIntegrity: 'Ingredient integrity',
    deltaScore: 'Δ score',
    betterCurrent: '(current better)',
    betterPrev: '(previous better)',
    newIngredients: 'Added',
    lostIngredients: 'Dropped',
    offline: 'Offline',
    pendingScans: '{n} pending scan',
    pendingScansN: '{n} pending scans',
    retryAll: 'Retry',
    cameraReady: 'Point at the barcode…',
    cameraUnsupported: 'Video scan not supported in this browser.',
    cameraDenied: 'Camera access denied.',
    close: 'Close',
    prefMeatRed: 'Contains meat (not vegetarian): {name}',
    prefSugarRed: '{v}g sugars/100g — above your preference',
    prefSaltRed: '{v}g salt/100g — above your preference',
    prefNotOrganic: 'Not organic',
    prefProteinGreen: '{v}g protein/100g — matches your preference',
    recentScans: 'Recent scans',
    clearHistory: 'Clear',
    allergens: 'Allergens detected',
    allergenIntro: 'Contains',
    sparseData: 'Limited data — retake a close-up of the ingredients panel or nutrition table for a better score.',
    removeFromHistory: 'Remove from history',
    daysAgo: '{n}d ago',
    hoursAgo: '{n}h ago',
    minutesAgo: '{n}m ago',
    justNow: 'just now',
    onboarding1Title: 'Photograph a label',
    onboarding1Body: 'Take up to 4 photos (front + ingredients + nutrition) and get a 0–100 score with detailed deductions.',
    onboarding2Title: 'Instant barcode lookup',
    onboarding2Body: 'Products in Open Food Facts are recognized in under a second — no vision model call needed.',
    onboarding3Title: 'Configurable, offline, exportable',
    onboarding3Body: 'Add your Groq key, pick a language, set dietary preferences. Offline scans sync when you\'re back online.',
    skip: 'Skip',
    next: 'Next',
    start: 'Get started',
    searchHistory: 'Search…',
    allGrades: 'All grades',
    pillarDetails: 'Pillar details',
    share: 'Share',
    shareText: '{name}: {score}/100 ({grade}) — scanned with Scann-eat',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeAuto: 'System',
    additiveSummary: '{total} additive(s) — {t1} Tier 1, {t2} Tier 2, {t3} Tier 3',
    additiveNone: 'No additives detected',
    palmOilRed: 'Contains palm oil or derivative',
    omega3Green: 'Omega-3 source ({name})',
    ingFoods: 'Foods',
    ingAdditives: 'Additives',
    exportHistory: 'Export history',
    novaInferred: 'NOVA recalculated',
    about: 'About',
    disclaimerTitle: 'Guidance, not medical advice',
    disclaimerBody: `Scann-eat explicitly separates two data types:

AUTHORITATIVE (traceable to a named source):
• Negative-nutrient thresholds — FSA "Front of pack labelling guidance" 2016 (Red sat fat ≥5 g/100 g, sugars ≥22.5 g/100 g, salt ≥1.5 g/100 g).
• Daily-intake references — WHO Guidelines (sat ≤10 %E, free sugars ≤10 %E ideally <5 %E, salt <5 g/day, trans zero REPLACE 2018).
• NOVA framework — Monteiro et al., Public Health Nutrition 2019;22(5).
• UPF / CV risk association — Srour et al., BMJ 2019;365:l1451.
• Processed meat = IARC Group 1 — Monograph Vol 114 (2015).
• Every additive carries a 'source' field citing EFSA, IARC, EU regulation, or primary study.

EDITORIAL (Scann-eat's own judgment):
• Pillar weights (20/25/25/15/15) and A+ → F grade breakpoints.
• Category-specific adjustments (cheese sat-fat, condiment sugar).
• Auto-NOVA correction when the input appears wrong.
• First-ingredient penalty, healthy-fat / omega-3 bonuses, veto caps.
• Confidence chip (high/medium/low).

Practical limits:
• Allergen detection is heuristic — for severe allergies, read the actual label. "May contain" notices aren't captured.
• Open Food Facts data is crowd-sourced — reformulated products may not be up-to-date.
• Llama 4 OCR can misread blurry photos; the confidence chip tries to flag this.

This app is decision support, not nutrition or medical advice. For critical decisions (allergies, medical conditions), confirm with a healthcare professional and the original label.`,
    onboarding4Title: 'Guidance, not medical advice',
    onboarding4Body: 'Scores aggregate public data (Open Food Facts) and vision-model OCR. Read "About" in settings for limitations — especially the allergen caveat.',
    profile: 'Profile',
    profileTitle: 'Personal profile',
    profileIntro: 'Used only on your device to compute a personalised score. Nothing is sent anywhere.',
    profileSex: 'Sex',
    sexMale: 'Male',
    sexFemale: 'Female',
    sexOther: 'Other',
    profileAge: 'Age (years)',
    profileHeight: 'Height (cm)',
    profileWeight: 'Weight (kg)',
    profileActivity: 'Activity level',
    activitySedentary: 'Sedentary (PAL 1.40)',
    activityLight: 'Lightly active (PAL 1.55)',
    activityModerate: 'Moderately active (PAL 1.75)',
    activityActive: 'Very active (PAL 1.90)',
    activityVeryActive: 'Extremely active (PAL 2.20)',
    profileDiet: 'Diet',
    profileCustomDiet: 'Custom patterns',
    profileCustomForbidden: 'Forbidden (regex, one per line)',
    profileCustomPreferred: 'Preferred (regex, one per line)',
    profileDerived: 'Derived values',
    bmi: 'BMI',
    bmr: 'BMR (Mifflin-St Jeor)',
    tdee: 'TDEE',
    proteinTarget: 'Protein target/day',
    satfatMax: 'Sat fat max/day',
    freeSugarMax: 'Free sugar max/day',
    classicScore: 'Classic score',
    personalScore: 'Personal score',
    personalAdjustments: 'Personal adjustments',
    personalNotApplicable: 'Profile not set — classic score only.',
    bmiUnderweight: 'Underweight',
    bmiNormal: 'Normal',
    bmiOverweight: 'Overweight',
    bmiObese1: 'Obese class I',
    bmiObese2: 'Obese class II',
    bmiObese3: 'Obese class III',
    scoringAnchors: 'Mifflin-St Jeor 1990 (BMR) · FAO/WHO/UNU 2004 (PAL) · WHO BMI 2000 · EFSA 2012 (protein PRI)',
  },
};

const LS_LANG = 'scanneat.lang';

function detectDefaultLang() {
  const saved = localStorage.getItem(LS_LANG);
  if (saved === 'fr' || saved === 'en') return saved;
  const nav = (navigator.language || 'fr').toLowerCase();
  return nav.startsWith('fr') ? 'fr' : 'en';
}

export let currentLang = detectDefaultLang();

export function setLang(lang) {
  if (lang !== 'fr' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem(LS_LANG, lang);
  applyStaticTranslations();
}

export function t(key, vars) {
  const table = STRINGS[currentLang] ?? STRINGS.fr;
  const fallback = STRINGS.fr;
  let out = table[key] ?? fallback[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}

/**
 * Apply translations to elements that declare a `data-i18n` attribute.
 * For static text on load (and after a language change).
 */
export function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  }
  for (const el of document.querySelectorAll('[data-i18n-aria-label]')) {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  }
}
