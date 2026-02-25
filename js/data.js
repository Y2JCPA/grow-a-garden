/* ============================================
   GROW A GARDEN 3D — Seed & Game Data
   ============================================ */
const SEEDS = {
  daisy:      { id: 'daisy',      name: 'Daisy',      emoji: '🌼', growTime: 30,  sellPrice: 5,   seedCost: 3,  color: 0xFFFF44, topColor: 0xFFFFAA, category: 'Flower',    rarity: 'common' },
  sunflower:  { id: 'sunflower',  name: 'Sunflower',  emoji: '🌻', growTime: 45,  sellPrice: 10,  seedCost: 8,  color: 0xFFCC00, topColor: 0xFFDD44, category: 'Flower',    rarity: 'uncommon' },
  rose:       { id: 'rose',       name: 'Rose',       emoji: '🌹', growTime: 60,  sellPrice: 15,  seedCost: 12, color: 0xFF2244, topColor: 0xFF6688, category: 'Flower',    rarity: 'rare' },
  tulip:      { id: 'tulip',      name: 'Tulip',      emoji: '🌷', growTime: 40,  sellPrice: 8,   seedCost: 6,  color: 0xFF66AA, topColor: 0xFF99CC, category: 'Flower',    rarity: 'common' },
  carrot:     { id: 'carrot',     name: 'Carrot',     emoji: '🥕', growTime: 35,  sellPrice: 7,   seedCost: 4,  color: 0xFF8800, topColor: 0x44AA22, category: 'Vegetable', rarity: 'common' },
  tomato:     { id: 'tomato',     name: 'Tomato',     emoji: '🍅', growTime: 50,  sellPrice: 12,  seedCost: 8,  color: 0xFF3300, topColor: 0x44AA22, category: 'Vegetable', rarity: 'uncommon' },
  pumpkin:    { id: 'pumpkin',    name: 'Pumpkin',    emoji: '🎃', growTime: 90,  sellPrice: 25,  seedCost: 18, color: 0xFF7700, topColor: 0xFF9933, category: 'Vegetable', rarity: 'rare' },
  strawberry: { id: 'strawberry', name: 'Strawberry', emoji: '🍓', growTime: 55,  sellPrice: 14,  seedCost: 10, color: 0xFF1144, topColor: 0x44AA22, category: 'Fruit',     rarity: 'uncommon' },
  blueberry:  { id: 'blueberry',  name: 'Blueberry',  emoji: '🫐', growTime: 50,  sellPrice: 11,  seedCost: 9,  color: 0x4444FF, topColor: 0x44AA22, category: 'Fruit',     rarity: 'uncommon' },
  cactus:     { id: 'cactus',     name: 'Cactus',     emoji: '🌵', growTime: 80,  sellPrice: 20,  seedCost: 15, color: 0x228B22, topColor: 0x33CC33, category: 'Exotic',    rarity: 'rare' },
  mushroom:   { id: 'mushroom',   name: 'Mushroom',   emoji: '🍄', growTime: 40,  sellPrice: 9,   seedCost: 7,  color: 0xCC8844, topColor: 0xFF4444, category: 'Herb',      rarity: 'common' },
  lavender:   { id: 'lavender',   name: 'Lavender',   emoji: '💜', growTime: 65,  sellPrice: 16,  seedCost: 12, color: 0x9966CC, topColor: 0xBB88EE, category: 'Herb',      rarity: 'uncommon' },
  orchid:     { id: 'orchid',     name: 'Orchid',     emoji: '🪻', growTime: 100, sellPrice: 35,  seedCost: 25, color: 0xDA70D6, topColor: 0xEE99EE, category: 'Exotic',    rarity: 'rare' },
};

// ─── Seasonal / Holiday Seeds ───
const HOLIDAY_SEEDS = {
  // 🎭 Purim
  hamentash:    { id: 'hamentash',    name: 'Hamentash',     emoji: '🔺', growTime: 45,  sellPrice: 18,  seedCost: 12, color: 0xD2691E, topColor: 0x8B4513,  category: 'Purim',  holiday: 'purim',  description: 'A triangular treat bush', rarity: 'legendary' },
  gragger:      { id: 'gragger',      name: 'Gragger Plant', emoji: '🎊', growTime: 55,  sellPrice: 22,  seedCost: 15, color: 0xFFD700, topColor: 0xFFA500,  category: 'Purim',  holiday: 'purim',  description: 'Shake it for noise!', rarity: 'legendary' },
  megillah:     { id: 'megillah',     name: 'Megillah Scroll', emoji: '📜', growTime: 75, sellPrice: 30,  seedCost: 22, color: 0xF5DEB3, topColor: 0xDAA520,  category: 'Purim',  holiday: 'purim',  description: 'The whole Megillah', rarity: 'legendary' },
  mishloach:    { id: 'mishloach',    name: 'Mishloach Manot', emoji: '🎁', growTime: 60, sellPrice: 25,  seedCost: 18, color: 0xFF69B4, topColor: 0xFF1493,  category: 'Purim',  holiday: 'purim',  description: 'Gift baskets bloom here', rarity: 'legendary' },
  crown:        { id: 'crown',        name: 'King Crown',    emoji: '👑', growTime: 90,  sellPrice: 40,  seedCost: 30, color: 0xFFD700, topColor: 0xFFF44F,  category: 'Purim',  holiday: 'purim',  description: 'Fit for King Achashverosh', rarity: 'legendary' },
  mask:         { id: 'mask',         name: 'Mask Flower',   emoji: '🎭', growTime: 50,  sellPrice: 20,  seedCost: 14, color: 0x9400D3, topColor: 0xBA55D3,  category: 'Purim',  holiday: 'purim',  description: 'Nobody knows who you are', rarity: 'legendary' },

  // 🍷 Pesach
  matza:        { id: 'matza',        name: 'Matza',         emoji: '🫓', growTime: 40,  sellPrice: 15,  seedCost: 10, color: 0xF5DEB3, topColor: 0xEEDCB0,  category: 'Pesach', holiday: 'pesach', description: 'Flat and fast — 18 min!', rarity: 'legendary' },
  maror:        { id: 'maror',        name: 'Maror Bush',    emoji: '🥬', growTime: 35,  sellPrice: 12,  seedCost: 8,  color: 0x228B22, topColor: 0x006400,  category: 'Pesach', holiday: 'pesach', description: 'Bitter but meaningful', rarity: 'legendary' },
  charoset:     { id: 'charoset',     name: 'Charoset Tree', emoji: '🍎', growTime: 70,  sellPrice: 28,  seedCost: 20, color: 0x8B4513, topColor: 0xA0522D,  category: 'Pesach', holiday: 'pesach', description: 'Sweet like freedom', rarity: 'legendary' },
  wine:         { id: 'wine',         name: 'Wine Grapes',   emoji: '🍷', growTime: 80,  sellPrice: 32,  seedCost: 24, color: 0x722F37, topColor: 0x800020,  category: 'Pesach', holiday: 'pesach', description: 'Four cups worth', rarity: 'legendary' },

  // 🍎 Rosh Hashana
  apple_honey:  { id: 'apple_honey',  name: 'Apple & Honey', emoji: '🍯', growTime: 55,  sellPrice: 20,  seedCost: 14, color: 0xFF4444, topColor: 0xFFBF00,  category: 'Rosh Hashana', holiday: 'rosh_hashana', description: 'Shana Tova!', rarity: 'legendary' },
  pomegranate:  { id: 'pomegranate',  name: 'Pomegranate',   emoji: '🔴', growTime: 70,  sellPrice: 28,  seedCost: 20, color: 0xDC143C, topColor: 0x8B0000,  category: 'Rosh Hashana', holiday: 'rosh_hashana', description: '613 seeds of merit', rarity: 'legendary' },
  shofar:       { id: 'shofar',       name: 'Shofar Plant',  emoji: '📯', growTime: 85,  sellPrice: 35,  seedCost: 25, color: 0xDEB887, topColor: 0xD2B48C,  category: 'Rosh Hashana', holiday: 'rosh_hashana', description: 'Tekiah Gedolah!', rarity: 'legendary' },

  // 🕎 Chanukah
  sufganiya:    { id: 'sufganiya',    name: 'Sufganiya Bush', emoji: '🍩', growTime: 45,  sellPrice: 18,  seedCost: 12, color: 0xD2691E, topColor: 0xFF6347,  category: 'Chanukah', holiday: 'chanukah', description: 'Jelly-filled goodness', rarity: 'legendary' },
  olive:        { id: 'olive',        name: 'Olive Tree',    emoji: '🫒', growTime: 90,  sellPrice: 38,  seedCost: 28, color: 0x556B2F, topColor: 0x6B8E23,  category: 'Chanukah', holiday: 'chanukah', description: 'Pure pressed oil', rarity: 'legendary' },
  menorah:      { id: 'menorah',      name: 'Menorah Cactus', emoji: '🕎', growTime: 75, sellPrice: 30,  seedCost: 22, color: 0xFFD700, topColor: 0xFFA500,  category: 'Chanukah', holiday: 'chanukah', description: '8 crazy nights', rarity: 'legendary' },

  // 🌳 Tu B'Shvat
  date_palm:    { id: 'date_palm',    name: 'Date Palm',     emoji: '🌴', growTime: 80,  sellPrice: 30,  seedCost: 22, color: 0x8B6914, topColor: 0x228B22,  category: "Tu B'Shvat", holiday: 'tu_bshvat', description: 'Sweet as the land', rarity: 'legendary' },
  fig:          { id: 'fig',          name: 'Fig Tree',      emoji: '🟤', growTime: 70,  sellPrice: 25,  seedCost: 18, color: 0x4B0082, topColor: 0x228B22,  category: "Tu B'Shvat", holiday: 'tu_bshvat', description: 'First fruits', rarity: 'legendary' },
  wheat:        { id: 'wheat',        name: 'Wheat',         emoji: '🌾', growTime: 50,  sellPrice: 15,  seedCost: 10, color: 0xDAA520, topColor: 0xFFD700,  category: "Tu B'Shvat", holiday: 'tu_bshvat', description: 'Staff of life', rarity: 'legendary' },

  // 🌹 Shavuot
  cheesecake:   { id: 'cheesecake',   name: 'Cheesecake',    emoji: '🍰', growTime: 55,  sellPrice: 22,  seedCost: 16, color: 0xFFFDD0, topColor: 0xFFE4B5,  category: 'Shavuot', holiday: 'shavuot', description: 'Dairy delicious', rarity: 'legendary' },
  milk_honey:   { id: 'milk_honey',   name: 'Milk & Honey',  emoji: '🥛', growTime: 65,  sellPrice: 26,  seedCost: 20, color: 0xFFFFF0, topColor: 0xFFBF00,  category: 'Shavuot', holiday: 'shavuot', description: 'Land flowing with...', rarity: 'legendary' },

  // 🔥 Lag B'Omer
  bonfire:      { id: 'bonfire',      name: 'Bonfire Flower', emoji: '🔥', growTime: 45,  sellPrice: 18,  seedCost: 12, color: 0xFF4500, topColor: 0xFF6347,  category: "Lag B'Omer", holiday: 'lag_bomer', description: 'Light it up!', rarity: 'legendary' },
  bow:          { id: 'bow',          name: 'Bow Plant',     emoji: '🏹', growTime: 60,  sellPrice: 24,  seedCost: 18, color: 0x8B4513, topColor: 0x228B22,  category: "Lag B'Omer", holiday: 'lag_bomer', description: 'Rabbi Shimon vibes', rarity: 'legendary' },
};

// ─── Holiday Calendar (approximate Gregorian windows for 2026) ───
const HOLIDAY_WINDOWS = {
  purim:        { start: [2, 28], end: [3, 18], label: '🎭 Purim' },          // Purim 2026: March 17 (seeds available ~2 weeks before)
  pesach:       { start: [3, 18], end: [4, 12], label: '🍷 Pesach' },         // Pesach 2026: April 2-9
  lag_bomer:    { start: [4, 27], end: [5, 10], label: "🔥 Lag B'Omer" },     // Lag B'Omer 2026: May 7
  shavuot:      { start: [5, 12], end: [5, 25], label: '🌹 Shavuot' },        // Shavuot 2026: May 22-23
  rosh_hashana: { start: [8, 28], end: [9, 15], label: '🍎 Rosh Hashana' },   // RH 2026: Sep 12-13
  chanukah:     { start: [11, 26], end: [12, 30], label: '🕎 Chanukah' },     // Chanukah 2026: Dec 25 - Jan 2
  tu_bshvat:    { start: [1, 20], end: [2, 10], label: "🌳 Tu B'Shvat" },     // Tu B'Shvat 2026: Feb 4
};

function getActiveHolidays() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  const active = [];
  for (const [key, win] of Object.entries(HOLIDAY_WINDOWS)) {
    const [sm, sd] = win.start;
    const [em, ed] = win.end;
    const afterStart = month > sm || (month === sm && day >= sd);
    const beforeEnd = month < em || (month === em && day <= ed);
    if (afterStart && beforeEnd) active.push(key);
  }
  return active;
}

function getSeasonalSeeds() {
  const active = getActiveHolidays();
  const seasonal = {};
  for (const [id, seed] of Object.entries(HOLIDAY_SEEDS)) {
    if (active.includes(seed.holiday)) {
      seasonal[id] = seed;
    }
  }
  return seasonal;
}

function getActiveHolidayLabels() {
  const active = getActiveHolidays();
  return active.map(h => HOLIDAY_WINDOWS[h].label);
}

// Combined lookup: regular + holiday seeds
function getSeedData(seedId) {
  return SEEDS[seedId] || HOLIDAY_SEEDS[seedId] || null;
}

const SEED_LIST = Object.keys(SEEDS);
