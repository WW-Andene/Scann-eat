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
