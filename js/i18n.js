/* ============================================
   GROW A GARDEN 3D — Languages (English / עברית)
   T`text ${x}` translates a piece of text: in Hebrew it looks up the
   English template ("text {}") in HE and fills in the values ({0}, {1}…
   or {} in order). Anything missing simply stays in English.
   Switching language saves and reloads the page.
   ============================================ */
const LANG = (function() {
  try {
    const v = localStorage.getItem('garden3d_lang');
    if (v === 'he' || v === 'en') return v;
  } catch (e) { /* storage blocked */ }
  return /^he\b|^iw\b/i.test(navigator.language || '') ? 'he' : 'en';
})();
const IS_HE = LANG === 'he';
const HE = {};          // English template → Hebrew (filled by i18n-he.js)
const HE_DATA = {};     // Hebrew names for seeds, pets, gear… by id (filled by i18n-he.js)

function T(strings, ...vals) {
  const plain = typeof strings === 'string';
  const key = plain ? strings : strings.join('{}');
  const he = IS_HE ? HE[key] : undefined;
  if (he == null) {
    if (plain) return strings;
    let s = strings[0];
    for (let i = 0; i < vals.length; i++) s += vals[i] + strings[i + 1];
    return s;
  }
  let n = 0;
  return he.replace(/\{(\d*)\}/g, (m, i) => { const v = i === '' ? vals[n++] : vals[+i]; return v == null ? '' : v; });
}

function setLang(lang) {
  try { localStorage.setItem('garden3d_lang', lang); } catch (e) { /* ignore */ }
  location.reload();
}

// Swap the names/descriptions in the game's data tables for Hebrew ones
function applyDataLanguage() {
  if (!IS_HE) return;
  const put = (table, map, fields) => {
    if (!table || !map) return;
    Object.entries(map).forEach(([id, v]) => {
      const row = table[id];
      if (!row) return;
      if (typeof v === 'string') row[fields[0]] = v;
      else fields.forEach((f, i) => { if (v[i] != null) row[f] = v[i]; });
    });
  };
  put(typeof SEEDS !== 'undefined' && SEEDS, HE_DATA.seeds, ['name']);
  put(typeof CLASSIC_SEEDS !== 'undefined' && CLASSIC_SEEDS, HE_DATA.seeds, ['name', 'description']);
  put(typeof HOLIDAY_SEEDS !== 'undefined' && HOLIDAY_SEEDS, HE_DATA.seeds, ['name', 'description']);
  put(typeof PETS !== 'undefined' && PETS, HE_DATA.pets, ['name']);
  put(typeof GEAR !== 'undefined' && GEAR, HE_DATA.gear, ['name', 'desc']);
  put(typeof EGGS !== 'undefined' && EGGS, HE_DATA.eggs, ['name']);
  put(typeof MUTATIONS !== 'undefined' && MUTATIONS, HE_DATA.mutations, ['name']);
  put(typeof RARITY !== 'undefined' && RARITY, HE_DATA.rarity, ['name']);
  put(typeof WEATHER !== 'undefined' && WEATHER, HE_DATA.weather, ['name', 'desc']);
  put(typeof CHARACTER_SKINS !== 'undefined' && CHARACTER_SKINS, HE_DATA.skins, ['name']);
  put(typeof SEVEN_SPECIES !== 'undefined' && SEVEN_SPECIES, HE_DATA.species, ['name']);
  put(typeof TERUMAH_CHOICES !== 'undefined' && TERUMAH_CHOICES, HE_DATA.terumah, ['name']);
  if (typeof MITZVOT !== 'undefined' && HE_DATA.mitzvot) {
    MITZVOT.forEach(m => { const h = HE_DATA.mitzvot[m.id]; if (h) Object.assign(m, h); });
  }
  if (typeof TUTORIAL_TASKS !== 'undefined' && HE_DATA.tutorial) {
    TUTORIAL_TASKS.forEach((t, i) => { if (HE_DATA.tutorial[i]) t.text = HE_DATA.tutorial[i]; });
  }
}

// Static text in index.html: elements marked data-t (inner HTML), data-t-title, data-t-placeholder
function applyStaticLanguage(root) {
  document.documentElement.lang = LANG;
  document.documentElement.dir = IS_HE ? 'rtl' : 'ltr';
  document.body.classList.toggle('lang-he', IS_HE);
  if (!IS_HE) return;
  (root || document).querySelectorAll('[data-t]').forEach(el => { const k = el.innerHTML.trim(); if (HE[k] != null) el.innerHTML = HE[k]; });
  (root || document).querySelectorAll('[data-t-title]').forEach(el => { const k = el.getAttribute('title'); if (HE[k] != null) el.setAttribute('title', HE[k]); });
  (root || document).querySelectorAll('[data-t-placeholder]').forEach(el => { const k = el.getAttribute('placeholder'); if (HE[k] != null) el.setAttribute('placeholder', HE[k]); });
}
