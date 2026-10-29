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
// Nikud (vowel points) — on by default so young readers can read everything
const NIKUD = (function() { try { return localStorage.getItem('garden3d_nikud') !== '0'; } catch (e) { return true; } })();
const HE = {};          // English template → Hebrew (filled by i18n-he.js)
const HE_DATA = {};     // Hebrew names for seeds, pets, gear… by id (filled by i18n-he.js)
const HE_NK = {};       // the same texts with nikud (filled by i18n-he-nikud.js)
const HE_DATA_NK = {};
function heText(key) { return NIKUD && HE_NK[key] != null ? HE_NK[key] : HE[key]; }

function T(strings, ...vals) {
  const plain = typeof strings === 'string';
  const key = plain ? strings : strings.join('{}');
  const he = IS_HE ? heText(key) : undefined;
  if (he == null) {
    if (plain) return strings;
    let s = strings[0];
    for (let i = 0; i < vals.length; i++) s += vals[i] + strings[i + 1];
    return s;
  }
  let n = 0;
  return he.replace(/\{(\d*)\}/g, (m, i) => { const v = i === '' ? vals[n++] : vals[+i]; return v == null ? '' : v; });
}

function setNikud(on) {
  try { localStorage.setItem('garden3d_nikud', on ? '1' : '0'); } catch (e) { /* ignore */ }
  location.reload();
}
function setLang(lang) {
  try { localStorage.setItem('garden3d_lang', lang); } catch (e) { /* ignore */ }
  location.reload();
}

// Swap the names/descriptions in the game's data tables for Hebrew ones
function applyDataLanguage() {
  if (!IS_HE) return;
  const D = NIKUD && Object.keys(HE_DATA_NK).length ? HE_DATA_NK : HE_DATA;
  const put = (table, map, fields) => {
    if (!table || !map) return;
    Object.entries(map).forEach(([id, v]) => {
      const row = table[id];
      if (!row) return;
      if (row._en == null) row._en = row[fields[0]];
      if (typeof v === 'string') row[fields[0]] = v;
      else fields.forEach((f, i) => { if (v[i] != null) row[f] = v[i]; });
    });
  };
  put(typeof SEEDS !== 'undefined' && SEEDS, D.seeds, ['name']);
  put(typeof CLASSIC_SEEDS !== 'undefined' && CLASSIC_SEEDS, D.seeds, ['name', 'description']);
  put(typeof HOLIDAY_SEEDS !== 'undefined' && HOLIDAY_SEEDS, D.seeds, ['name', 'description']);
  put(typeof PETS !== 'undefined' && PETS, D.pets, ['name']);
  put(typeof GEAR !== 'undefined' && GEAR, D.gear, ['name', 'desc']);
  put(typeof EGGS !== 'undefined' && EGGS, D.eggs, ['name']);
  put(typeof MUTATIONS !== 'undefined' && MUTATIONS, D.mutations, ['name']);
  put(typeof RARITY !== 'undefined' && RARITY, D.rarity, ['name']);
  put(typeof WEATHER !== 'undefined' && WEATHER, D.weather, ['name', 'desc']);
  put(typeof CHARACTER_SKINS !== 'undefined' && CHARACTER_SKINS, D.skins, ['name']);
  put(typeof SEVEN_SPECIES !== 'undefined' && SEVEN_SPECIES, D.species, ['name']);
  put(typeof TERUMAH_CHOICES !== 'undefined' && TERUMAH_CHOICES, D.terumah, ['name']);
  if (typeof MITZVOT !== 'undefined' && D.mitzvot) {
    MITZVOT.forEach(m => { const h = D.mitzvot[m.id]; if (h) Object.assign(m, h); });
  }
  if (typeof TUTORIAL_TASKS !== 'undefined' && D.tutorial) {
    TUTORIAL_TASKS.forEach((t, i) => { if (D.tutorial[i]) t.text = D.tutorial[i]; });
  }
}

// Static text in index.html: elements marked data-t (inner HTML), data-t-title, data-t-placeholder
function applyStaticLanguage(root) {
  document.documentElement.lang = LANG;
  document.documentElement.dir = IS_HE ? 'rtl' : 'ltr';
  document.body.classList.toggle('lang-he', IS_HE);
  if (!IS_HE) return;
  (root || document).querySelectorAll('[data-t]').forEach(el => { const v = heText(el.innerHTML.trim()); if (v != null) el.innerHTML = v; });
  (root || document).querySelectorAll('[data-t-title]').forEach(el => { const v = heText(el.getAttribute('title')); if (v != null) el.setAttribute('title', v); });
  (root || document).querySelectorAll('[data-t-placeholder]').forEach(el => { const v = heText(el.getAttribute('placeholder')); if (v != null) el.setAttribute('placeholder', v); });
}
