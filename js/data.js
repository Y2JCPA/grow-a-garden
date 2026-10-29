/* ============================================
   GROW A GARDEN 3D — Game Data
   Modeled on the Roblox game "Grow a Garden": Sheckles (¢), restocking
   seed/gear shops, multi-harvest plants, fruit weights, mutations,
   weather events, pet eggs and pets.
   ============================================ */

// ─── Seed Shop (in shop order) ───
// price: seed cost (¢) • sell: value of one fruit at its base weight • kg: base weight
// grow: seconds until the plant is grown • multi: keeps growing new fruit (fruitTime each)
// chance / stock: odds of being in stock at a restock, and how many
const SEEDS = {
  carrot:       { name: 'Carrot',       emoji: '🥕', rarity: 'common',    price: 10,       sell: 18,     kg: 0.25, grow: 40,  multi: false, chance: 1,    stock: [5, 25], color: 0xFF8A1E, topColor: 0x4CAF50 },
  wheat:        { name: 'Wheat',        emoji: '🌾', rarity: 'common',    price: 20,       sell: 26,     kg: 0.3,  grow: 45,  multi: false, chance: 1,    stock: [3, 15], color: 0xE8B83A, topColor: 0x9CCC65 },
  barley:       { name: 'Barley',       emoji: '🌾', rarity: 'common',    price: 30,       sell: 34,     kg: 0.3,  grow: 50,  multi: false, chance: 1,    stock: [3, 12], color: 0xD9C98A, topColor: 0x9CCC65 },
  strawberry:   { name: 'Strawberry',   emoji: '🍓', rarity: 'common',    price: 50,       sell: 14,     kg: 0.3,  grow: 60,  multi: true,  fruitTime: 22, maxFruits: 5, chance: 1, stock: [1, 6], color: 0x2E7D32, fruitColor: 0xE8172C },
  blueberry:    { name: 'Blueberry',    emoji: '🫐', rarity: 'uncommon',  price: 400,      sell: 18,     kg: 0.17, grow: 75,  multi: true,  fruitTime: 22, maxFruits: 6, chance: 0.85, stock: [1, 5], color: 0x2E7D32, fruitColor: 0x3949AB },
  orange_tulip: { name: 'Orange Tulip', emoji: '🌷', rarity: 'uncommon',  price: 600,      sell: 767,    kg: 0.05, grow: 70,  multi: false, chance: 0.75, stock: [1, 4], color: 0xFF7A1A, topColor: 0x43A047 },
  olive:        { name: 'Olive Tree',   emoji: '🫒', rarity: 'uncommon',  price: 700,      sell: 40,     kg: 0.06, grow: 110, multi: true,  fruitTime: 26, maxFruits: 8, chance: 0.8, stock: [1, 3], color: 0x7E9A6E, fruitColor: 0x4E6B2F },
  tomato:       { name: 'Tomato',       emoji: '🍅', rarity: 'rare',      price: 800,      sell: 27,     kg: 0.45, grow: 90,  multi: true,  fruitTime: 28, maxFruits: 6, chance: 0.6, stock: [1, 3], color: 0x388E3C, fruitColor: 0xE53935 },
  fig:          { name: 'Fig Tree',     emoji: '🟣', rarity: 'rare',      price: 1100,     sell: 60,     kg: 0.4,  grow: 120, multi: true,  fruitTime: 30, maxFruits: 6, chance: 0.7, stock: [1, 2], color: 0x388E3C, fruitColor: 0x6A1B9A },
  corn:         { name: 'Corn',         emoji: '🌽', rarity: 'rare',      price: 1300,     sell: 36,     kg: 1.9,  grow: 100, multi: true,  fruitTime: 32, maxFruits: 4, chance: 0.5, stock: [1, 3], color: 0x7CB342, fruitColor: 0xFFD54F },
  daffodil:     { name: 'Daffodil',     emoji: '🌼', rarity: 'rare',      price: 1000,     sell: 903,    kg: 0.16, grow: 90,  multi: false, chance: 0.55, stock: [1, 3], color: 0xFFEB3B, topColor: 0xFFA000 },
  pomegranate:  { name: 'Pomegranate',  emoji: '🔴', rarity: 'rare',      price: 1600,     sell: 85,     kg: 0.6,  grow: 130, multi: true,  fruitTime: 32, maxFruits: 5, chance: 0.6, stock: [1, 2], color: 0x2E7D32, fruitColor: 0xC62828 },
  gefen:        { name: 'Grapevine',    emoji: '🍇', rarity: 'legendary', price: 2200,     sell: 130,    kg: 1.2,  grow: 150, multi: true,  fruitTime: 36, maxFruits: 5, chance: 0.5, stock: [1, 2], color: 0x558B2F, fruitColor: 0x6A1B9A },
  watermelon:   { name: 'Watermelon',   emoji: '🍉', rarity: 'legendary', price: 2500,     sell: 2708,   kg: 7.3,  grow: 150, multi: false, chance: 0.35, stock: [1, 2], color: 0x2E7D32, topColor: 0x66BB6A },
  date_palm:    { name: 'Date Palm',    emoji: '🌴', rarity: 'legendary', price: 2800,     sell: 160,    kg: 0.8,  grow: 170, multi: true,  fruitTime: 40, maxFruits: 4, chance: 0.45, stock: [1, 2], color: 0x8D6E63, fruitColor: 0xB5651D },
  pumpkin:      { name: 'Pumpkin',      emoji: '🎃', rarity: 'legendary', price: 3000,     sell: 3700,   kg: 6.9,  grow: 160, multi: false, chance: 0.33, stock: [1, 2], color: 0xFF8F00, topColor: 0x558B2F },
  apple:        { name: 'Apple',        emoji: '🍎', rarity: 'legendary', price: 3250,     sell: 248,    kg: 2.85, grow: 180, multi: true,  fruitTime: 38, maxFruits: 6, chance: 0.3, stock: [1, 2], color: 0x43A047, fruitColor: 0xE53935 },
  bamboo:       { name: 'Bamboo',       emoji: '🎋', rarity: 'legendary', price: 4000,     sell: 3610,   kg: 3.8,  grow: 140, multi: false, chance: 0.3, stock: [1, 3], color: 0x7CB342, topColor: 0x9CCC65 },
  coconut:      { name: 'Coconut',      emoji: '🥥', rarity: 'mythical',  price: 6000,     sell: 361,    kg: 13.3, grow: 220, multi: true,  fruitTime: 48, maxFruits: 4, chance: 0.22, stock: [1, 2], color: 0x8D6E63, fruitColor: 0x6D4C41 },
  cactus:       { name: 'Cactus',       emoji: '🌵', rarity: 'mythical',  price: 15000,    sell: 3069,   kg: 6.6,  grow: 240, multi: true,  fruitTime: 60, maxFruits: 3, chance: 0.18, stock: [1, 2], color: 0x2E7D32, fruitColor: 0x9CCC65 },
  dragon_fruit: { name: 'Dragon Fruit', emoji: '🐉', rarity: 'mythical',  price: 50000,    sell: 4287,   kg: 11.4, grow: 260, multi: true,  fruitTime: 60, maxFruits: 4, chance: 0.12, stock: [1, 2], color: 0x558B2F, fruitColor: 0xEC407A },
  mango:        { name: 'Mango',        emoji: '🥭', rarity: 'mythical',  price: 100000,   sell: 5866,   kg: 14.3, grow: 300, multi: true,  fruitTime: 70, maxFruits: 4, chance: 0.1, stock: [1, 2], color: 0x2E7D32, fruitColor: 0xFFA726 },
  grape:        { name: 'Grape',        emoji: '🍇', rarity: 'divine',    price: 850000,   sell: 7085,   kg: 2.85, grow: 360, multi: true,  fruitTime: 75, maxFruits: 5, chance: 0.06, stock: [1, 1], color: 0x558B2F, fruitColor: 0x7B1FA2 },
  mushroom:     { name: 'Mushroom',     emoji: '🍄', rarity: 'divine',    price: 150000,   sell: 136278, kg: 25.9, grow: 330, multi: false, chance: 0.07, stock: [1, 1], color: 0xE53935, topColor: 0xFFF8E1 },
  pepper:       { name: 'Pepper',       emoji: '🌶️', rarity: 'divine',    price: 1000000,  sell: 7220,   kg: 4.75, grow: 380, multi: true,  fruitTime: 80, maxFruits: 5, chance: 0.05, stock: [1, 1], color: 0x388E3C, fruitColor: 0xD50000 },
  cacao:        { name: 'Cacao',        emoji: '🍫', rarity: 'divine',    price: 2500000,  sell: 10830,  kg: 7.6,  grow: 420, multi: true,  fruitTime: 90, maxFruits: 4, chance: 0.04, stock: [1, 1], color: 0x5D4037, fruitColor: 0xA1662F },
  beanstalk:    { name: 'Beanstalk',    emoji: '🌿', rarity: 'prismatic', price: 10000000, sell: 25270,  kg: 9.5,  grow: 480, multi: true,  fruitTime: 100, maxFruits: 5, chance: 0.02, stock: [1, 1], color: 0x43A047, fruitColor: 0x76FF03 },
};
const SHOP_SEED_LIST = Object.keys(SEEDS);

// ─── Classic seeds (from earlier versions — still plantable if you own them) ───
const CLASSIC_SEEDS = {
  daisy:      { id: 'daisy',      name: 'Daisy',      emoji: '🌼', growTime: 30,  sellPrice: 5,   seedCost: 3,  color: 0xFFFF44, topColor: 0xFFFFAA, category: 'Flower',    rarity: 'common', level: 1 },
  sunflower:  { id: 'sunflower',  name: 'Sunflower',  emoji: '🌻', growTime: 45,  sellPrice: 10,  seedCost: 8,  color: 0xFFCC00, topColor: 0xFFDD44, category: 'Flower',    rarity: 'uncommon', level: 1 },
  rose:       { id: 'rose',       name: 'Rose',       emoji: '🌹', growTime: 60,  sellPrice: 15,  seedCost: 12, color: 0xFF2244, topColor: 0xFF6688, category: 'Flower',    rarity: 'rare', level: 4 },
  tulip:      { id: 'tulip',      name: 'Tulip',      emoji: '🌷', growTime: 40,  sellPrice: 8,   seedCost: 6,  color: 0xFF66AA, topColor: 0xFF99CC, category: 'Flower',    rarity: 'common', level: 1 },
  lavender:   { id: 'lavender',   name: 'Lavender',   emoji: '💜', growTime: 65,  sellPrice: 16,  seedCost: 12, color: 0x9966CC, topColor: 0xBB88EE, category: 'Herb',      rarity: 'uncommon', level: 4 },
  orchid:     { id: 'orchid',     name: 'Orchid',     emoji: '🪻', growTime: 100, sellPrice: 35,  seedCost: 25, color: 0xDA70D6, topColor: 0xEE99EE, category: 'Exotic',    rarity: 'rare', level: 7 },
  dragonfruit:{ id: 'dragonfruit',name: 'Dragon Fruit',emoji: '🐉', growTime: 150, sellPrice: 60,  seedCost: 90, color: 0xE91E63, topColor: 0x8BC34A, category: 'Exotic',    rarity: 'epic', level: 9, regrow: 4 },
  candy_blossom: { id: 'candy_blossom', name: 'Candy Blossom', emoji: '🍭', growTime: 240, sellPrice: 120, seedCost: 260, color: 0xF48FB1, topColor: 0xCE93D8, category: 'Mythic', rarity: 'mythic', level: 12, regrow: 5, description: 'Sweetest tree in the land' },
  star_fruit: { id: 'star_fruit', name: 'Star Fruit', emoji: '⭐', growTime: 300, sellPrice: 160, seedCost: 400, color: 0xFFEB3B, topColor: 0xFFF59D, category: 'Mythic', rarity: 'mythic', level: 15, regrow: 5, description: 'Glows like a tiny star' },
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

// ─── Holiday Calendar ───
// Default windows (month 0-indexed, day). Seeds show up ~2 weeks before the holiday.
const HOLIDAY_WINDOWS = {
  purim:        { start: [1, 18], end: [2, 18], label: '🎭 Purim' },
  pesach:       { start: [2, 18], end: [3, 12], label: '🍷 Pesach' },
  lag_bomer:    { start: [3, 25], end: [4, 10], label: "🔥 Lag B'Omer" },
  shavuot:      { start: [4, 12], end: [5, 14], label: '🌹 Shavuot' },
  rosh_hashana: { start: [7, 28], end: [9, 4],  label: '🍎 Rosh Hashana' },
  chanukah:     { start: [10, 20], end: [11, 31], label: '🕎 Chanukah' },
  tu_bshvat:    { start: [0, 10], end: [1, 10], label: "🌳 Tu B'Shvat" },
};
// The Hebrew calendar drifts against the Gregorian one, so known years get exact windows.
const HOLIDAY_WINDOWS_BY_YEAR = {
  2026: {
    tu_bshvat:    { start: [0, 19], end: [1, 3] },   // Feb 2
    purim:        { start: [1, 17], end: [2, 4] },   // Mar 3
    pesach:       { start: [2, 18], end: [3, 9] },   // Apr 2-9
    lag_bomer:    { start: [3, 21], end: [4, 6] },   // May 5
    shavuot:      { start: [4, 8],  end: [4, 23] },  // May 22-23
    rosh_hashana: { start: [7, 29], end: [8, 14] },  // Sep 12-13
    chanukah:     { start: [10, 20], end: [11, 13] }, // Dec 5-12
  },
  2027: {
    tu_bshvat:    { start: [0, 8],  end: [0, 23] },  // Jan 23
    purim:        { start: [2, 9],  end: [2, 24] },  // Mar 23
    pesach:       { start: [3, 7],  end: [3, 29] },  // Apr 22-29
    lag_bomer:    { start: [4, 11], end: [4, 26] },  // May 25
    shavuot:      { start: [4, 28], end: [5, 12] },  // Jun 11-12
    rosh_hashana: { start: [8, 17], end: [9, 4] },   // Oct 2-3
    chanukah:     { start: [11, 10], end: [11, 31] }, // Dec 25 - Jan 1
  },
};

function getActiveHolidays() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  const yearly = HOLIDAY_WINDOWS_BY_YEAR[now.getFullYear()] || {};
  const active = [];
  for (const key of Object.keys(HOLIDAY_WINDOWS)) {
    const win = yearly[key] || HOLIDAY_WINDOWS[key];
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


// ─── Seed lookup: every seed table is normalized to the same shape ───
const RARITY_REMAP = { epic: 'mythical', mythic: 'divine' };
const _seedCache = {};
function getSeedData(seedId) {
  if (_seedCache[seedId]) return _seedCache[seedId];
  let s = SEEDS[seedId];
  if (s) {
    s = Object.assign({ id: seedId, roblox: true, maxFruits: 0, fruitTime: 0 }, s);
  } else {
    const c = CLASSIC_SEEDS[seedId] || HOLIDAY_SEEDS[seedId];
    if (!c) return null;
    s = Object.assign({}, c, {
      id: seedId,
      roblox: false,
      price: (c.seedCost || 10) * (c.holiday ? 40 : 3),
      sell: (c.sellPrice || 5) * (c.holiday ? 40 : 3),
      kg: 0.5,
      grow: c.growTime || 60,
      multi: false,
      rarity: RARITY_REMAP[c.rarity] || c.rarity || 'common',
      chance: 0.5, stock: [1, 3],
    });
  }
  _seedCache[seedId] = s;
  return s;
}

// ─── Rarity (Roblox colors) ───
const RARITY = {
  common:    { name: 'Common',    color: '#A9A9A9', glow: 0xBDBDBD },
  uncommon:  { name: 'Uncommon',  color: '#4CD964', glow: 0x4CD964 },
  rare:      { name: 'Rare',      color: '#2F80ED', glow: 0x2F80ED },
  legendary: { name: 'Legendary', color: '#FFD60A', glow: 0xFFD60A },
  mythical:  { name: 'Mythical',  color: '#B44DFF', glow: 0xB44DFF },
  divine:    { name: 'Divine',    color: '#FF7A00', glow: 0xFF7A00 },
  prismatic: { name: 'Prismatic', color: '#FF4FD8', glow: 0xFF4FD8, rainbow: true },
};

// ─── Mutations ───
// "growth" mutations (Gold / Rainbow) multiply the value; the others stack:
// value = sell × weightFactor × growth × (1 + Σ(env − 1))
const MUTATIONS = {
  gold:       { name: 'Gold',       emoji: '✨', mult: 20,  growth: true, color: '#FFD54F', tint: 0xFFD54F },
  rainbow:    { name: 'Rainbow',    emoji: '🌈', mult: 50,  growth: true, color: '#FF80AB', tint: 0xFFFFFF },
  wet:        { name: 'Wet',        emoji: '💧', mult: 2,   color: '#4FC3F7', tint: 0x81D4FA },
  chilled:    { name: 'Chilled',    emoji: '❄️', mult: 2,   color: '#B3E5FC', tint: 0xB3E5FC },
  frozen:     { name: 'Frozen',     emoji: '🧊', mult: 10,  color: '#80DEEA', tint: 0x80DEEA, glow: true },
  moonlit:    { name: 'Moonlit',    emoji: '🌙', mult: 2,   color: '#B39DDB', tint: 0xB39DDB, glow: true },
  pollinated: { name: 'Pollinated', emoji: '🐝', mult: 3,   color: '#FFE082', tint: 0xFFE082 },
  bloodlit:   { name: 'Bloodlit',   emoji: '🩸', mult: 4,   color: '#E53935', tint: 0xC62828, glow: true },
  shocked:    { name: 'Shocked',    emoji: '⚡', mult: 100, color: '#FFF176', tint: 0xFFFF8D, glow: true },
  celestial:  { name: 'Celestial',  emoji: '🌠', mult: 120, color: '#EA80FC', tint: 0xEA80FC, glow: true },
};

// ─── Gear Shop ───
const GEAR = {
  watering_can:       { name: 'Watering Can',       emoji: '🚿', price: 5000,    uses: 10, chance: 0.9,  stock: [1, 3], desc: 'Water a plant to make it grow faster' },
  trowel:             { name: 'Trowel',             emoji: '🥄', price: 15000,   uses: 5,  chance: 0.6,  stock: [1, 2], desc: 'Move a plant to a new spot' },
  basic_sprinkler:    { name: 'Basic Sprinkler',    emoji: '💦', price: 10000,   uses: 1,  chance: 0.7,  stock: [1, 3], desc: 'Plants nearby grow 20% faster (5 min)', radius: 5, time: 300, grow: 0.2, mut: 1.2, size: 0 },
  advanced_sprinkler: { name: 'Advanced Sprinkler', emoji: '⛲', price: 40000,   uses: 1,  chance: 0.45, stock: [1, 2], desc: 'Plants grow 35% faster & mutate more (5 min)', radius: 6, time: 300, grow: 0.35, mut: 1.6, size: 0 },
  godly_sprinkler:    { name: 'Godly Sprinkler',    emoji: '🌟', price: 120000,  uses: 1,  chance: 0.25, stock: [1, 1], desc: 'Faster growth, more mutations & bigger fruit (5 min)', radius: 7, time: 300, grow: 0.5, mut: 2.2, size: 0.15 },
  lightning_rod:      { name: 'Lightning Rod',      emoji: '🗼', price: 400000,  uses: 3,  chance: 0.12, stock: [1, 1], desc: 'Catches lightning — shocks fruit nearby!', radius: 5 },
  master_sprinkler:   { name: 'Master Sprinkler',   emoji: '👑', price: 1500000, uses: 1,  chance: 0.06, stock: [1, 1], desc: 'Huge growth boost, lots of mutations, giant fruit (10 min)', radius: 8, time: 600, grow: 1.0, mut: 3.5, size: 0.35 },
};
const GEAR_LIST = Object.keys(GEAR);

// ─── Pets ───
// ability types: dig (finds seeds), sell (+% sell value), refund (chance to keep a sold fruit),
// grow (+% growth speed), size (+% fruit weight), eggs (+% hatch speed), mutate (adds a mutation),
// water (waters a plant), advance (grows a plant ahead), dupe (chance of an extra fruit), coins (finds ¢)
const PETS = {
  dog:            { name: 'Dog',            emoji: '🐶', rarity: 'common',    kind: 'dog',   colors: [0xCD853F, 0x8B5A2B, 0xF5DEB3], ability: { type: 'dig', every: 90, boost: 0 } },
  golden_lab:     { name: 'Golden Lab',     emoji: '🐕', rarity: 'common',    kind: 'dog',   colors: [0xF2C46D, 0xD9A441, 0xFFF3D6], ability: { type: 'dig', every: 75, boost: 1 } },
  bunny:          { name: 'Bunny',          emoji: '🐰', rarity: 'common',    kind: 'bunny', colors: [0xF5F5F5, 0xFFCDD2, 0xFFFFFF], ability: { type: 'sell', pct: 5 } },
  black_bunny:    { name: 'Black Bunny',    emoji: '🐇', rarity: 'uncommon',  kind: 'bunny', colors: [0x333333, 0x555555, 0x777777], ability: { type: 'sell', pct: 8 } },
  chicken:        { name: 'Chicken',        emoji: '🐔', rarity: 'uncommon',  kind: 'bird',  colors: [0xFAFAFA, 0xE53935, 0xFFB300], ability: { type: 'eggs', pct: 15 } },
  cat:            { name: 'Cat',            emoji: '🐱', rarity: 'uncommon',  kind: 'cat',   colors: [0x9E9E9E, 0x616161, 0xEEEEEE], ability: { type: 'size', pct: 8 } },
  deer:           { name: 'Deer',           emoji: '🦌', rarity: 'uncommon',  kind: 'deer',  colors: [0xA1887F, 0x6D4C41, 0xF5F5F5], ability: { type: 'grow', pct: 6 } },
  orange_tabby:   { name: 'Orange Tabby',   emoji: '🐈', rarity: 'rare',      kind: 'cat',   colors: [0xFFA726, 0xE65100, 0xFFF3E0], ability: { type: 'size', pct: 14 } },
  spotted_deer:   { name: 'Spotted Deer',   emoji: '🦌', rarity: 'rare',      kind: 'deer',  colors: [0xBF8A5A, 0x6D4C41, 0xFFFFFF], spots: true, ability: { type: 'grow', pct: 9 } },
  pig:            { name: 'Pig',            emoji: '🐷', rarity: 'rare',      kind: 'pig',   colors: [0xF8BBD0, 0xF06292, 0xFCE4EC], ability: { type: 'grow', pct: 12 } },
  rooster:        { name: 'Rooster',        emoji: '🐓', rarity: 'rare',      kind: 'bird',  colors: [0xE65100, 0xD50000, 0x1B5E20], ability: { type: 'eggs', pct: 25 } },
  monkey:         { name: 'Monkey',         emoji: '🐵', rarity: 'rare',      kind: 'monkey', colors: [0x795548, 0x4E342E, 0xFFCC80], ability: { type: 'refund', pct: 4 } },
  cow:            { name: 'Cow',            emoji: '🐮', rarity: 'legendary', kind: 'cow',   colors: [0xFAFAFA, 0x212121, 0xF8BBD0], spots: true, ability: { type: 'grow', pct: 16 } },
  silver_monkey:  { name: 'Silver Monkey',  emoji: '🐒', rarity: 'legendary', kind: 'monkey', colors: [0xB0BEC5, 0x78909C, 0xECEFF1], ability: { type: 'refund', pct: 8 } },
  sea_otter:      { name: 'Sea Otter',      emoji: '🦦', rarity: 'legendary', kind: 'otter', colors: [0x6D4C41, 0x4E342E, 0xD7CCC8], ability: { type: 'water', every: 45 } },
  turtle:         { name: 'Turtle',         emoji: '🐢', rarity: 'legendary', kind: 'turtle', colors: [0x7CB342, 0x33691E, 0x8D6E63], ability: { type: 'advance', every: 90, secs: 60 } },
  polar_bear:     { name: 'Polar Bear',     emoji: '🐻‍❄️', rarity: 'legendary', kind: 'bear', colors: [0xFAFAFA, 0xE0E0E0, 0x212121], ability: { type: 'mutate', every: 80, mut: 'chilled' } },
  grey_mouse:     { name: 'Grey Mouse',     emoji: '🐭', rarity: 'mythical',  kind: 'mouse', colors: [0x9E9E9E, 0xF48FB1, 0xE0E0E0], ability: { type: 'sell', pct: 14 } },
  brown_mouse:    { name: 'Brown Mouse',    emoji: '🐁', rarity: 'mythical',  kind: 'mouse', colors: [0x8D6E63, 0xF48FB1, 0xD7CCC8], ability: { type: 'coins', every: 60, amount: 2500 } },
  squirrel:       { name: 'Squirrel',       emoji: '🐿️', rarity: 'mythical',  kind: 'squirrel', colors: [0xD2691E, 0x8B4513, 0xFFE0B2], ability: { type: 'dig', every: 60, boost: 3 } },
  red_giant_ant:  { name: 'Red Giant Ant',  emoji: '🐜', rarity: 'mythical',  kind: 'ant',   colors: [0xC62828, 0x7F0000, 0x212121], ability: { type: 'dupe', pct: 9 } },
  red_fox:        { name: 'Red Fox',        emoji: '🦊', rarity: 'mythical',  kind: 'fox',   colors: [0xE65100, 0x3E2723, 0xFFFFFF], ability: { type: 'dig', every: 100, boost: 5 } },
  snail:          { name: 'Snail',          emoji: '🐌', rarity: 'legendary', kind: 'snail', colors: [0xA1887F, 0x8D6E63, 0xFFE0B2], ability: { type: 'dig', every: 120, boost: 2 } },
  giant_ant:      { name: 'Giant Ant',      emoji: '🐜', rarity: 'legendary', kind: 'ant',   colors: [0x3E2723, 0x212121, 0x111111], ability: { type: 'dupe', pct: 5 } },
  caterpillar:    { name: 'Caterpillar',    emoji: '🐛', rarity: 'legendary', kind: 'caterpillar', colors: [0x9CCC65, 0x558B2F, 0xFFEB3B], ability: { type: 'grow', pct: 12 } },
  praying_mantis: { name: 'Praying Mantis', emoji: '🦗', rarity: 'mythical',  kind: 'mantis', colors: [0x8BC34A, 0x558B2F, 0xCDDC39], ability: { type: 'advance', every: 80, secs: 120 } },
  dragonfly:      { name: 'Dragonfly',      emoji: '🪰', rarity: 'divine',    kind: 'dragonfly', colors: [0x26C6DA, 0x00838F, 0xB2EBF2], ability: { type: 'mutate', every: 240, mut: 'gold' } },
  bee:            { name: 'Bee',            emoji: '🐝', rarity: 'rare',      kind: 'bee',   colors: [0xFFD600, 0x212121, 0xE3F2FD], ability: { type: 'mutate', every: 70, mut: 'pollinated' } },
};

function describeAbility(a) {
  switch (a.type) {
    case 'dig': return `Digs up a seed every ${a.every}s${a.boost ? ' (often rare ones!)' : ''}`;
    case 'sell': return `Fruits sell for ${a.pct}% more`;
    case 'refund': return `${a.pct}% chance to keep a fruit after selling it`;
    case 'grow': return `Your plants grow ${a.pct}% faster`;
    case 'size': return `Fruits grow ${a.pct}% heavier`;
    case 'eggs': return `Eggs hatch ${a.pct}% faster`;
    case 'mutate': return `Every ${a.every}s makes a fruit ${MUTATIONS[a.mut].emoji} ${MUTATIONS[a.mut].name}`;
    case 'water': return `Waters a plant every ${a.every}s`;
    case 'advance': return `Every ${a.every}s grows a plant ${a.secs}s ahead`;
    case 'dupe': return `${a.pct}% chance to harvest an extra fruit`;
    case 'coins': return `Finds ¢${a.amount.toLocaleString()} every ${a.every}s`;
  }
  return '';
}

// ─── Pet Eggs (the egg shop shows 3 eggs per restock) ───
const EGGS = {
  common_egg:    { name: 'Common Egg',    color: 0xF5F5F5, spot: 0xBDBDBD, price: 2500,    hatch: 60,  rarity: 'common',    chance: 1,    pets: { dog: 34, golden_lab: 33, bunny: 33 } },
  uncommon_egg:  { name: 'Uncommon Egg',  color: 0xC8E6C9, spot: 0x66BB6A, price: 20000,   hatch: 120, rarity: 'uncommon',  chance: 0.8,  pets: { black_bunny: 25, chicken: 25, cat: 25, deer: 25 } },
  rare_egg:      { name: 'Rare Egg',      color: 0xBBDEFB, spot: 0x1E88E5, price: 120000,  hatch: 180, rarity: 'rare',      chance: 0.55, pets: { orange_tabby: 30, spotted_deer: 25, pig: 17, rooster: 15, bee: 8, monkey: 5 } },
  legendary_egg: { name: 'Legendary Egg', color: 0xFFF59D, spot: 0xFFB300, price: 800000,  hatch: 300, rarity: 'legendary', chance: 0.3,  pets: { cow: 42, silver_monkey: 40, sea_otter: 10, turtle: 4, polar_bear: 4 } },
  bug_egg:       { name: 'Bug Egg',       color: 0xDCEDC8, spot: 0x7CB342, price: 1500000, hatch: 360, rarity: 'mythical',  chance: 0.15, pets: { snail: 40, giant_ant: 30, caterpillar: 25, praying_mantis: 4, dragonfly: 1 } },
  mythical_egg:  { name: 'Mythical Egg',  color: 0xE1BEE7, spot: 0x8E24AA, price: 2500000, hatch: 480, rarity: 'mythical',  chance: 0.12, pets: { grey_mouse: 36, brown_mouse: 27, squirrel: 27, red_giant_ant: 8, red_fox: 2 } },
};
const EGG_LIST = Object.keys(EGGS);

// ─── Weather events ───
const WEATHER = {
  rain:         { name: 'Rain',         emoji: '🌧️', desc: 'Plants grow 50% faster and fruit can become 💧 Wet!', time: [100, 160], weight: 5 },
  thunderstorm: { name: 'Thunderstorm', emoji: '⛈️', desc: 'Lightning can ⚡ Shock your fruit (100x)!', time: [90, 140], weight: 2 },
  frost:        { name: 'Frost',        emoji: '❄️', desc: 'Fruit can become ❄️ Chilled — Wet fruit turns 🧊 Frozen!', time: [100, 150], weight: 2 },
  meteor_shower:{ name: 'Meteor Shower', emoji: '🌠', desc: 'Falling stars make fruit 🌠 Celestial (120x)!', time: [70, 110], weight: 1, night: true },
  blood_moon:   { name: 'Blood Moon',   emoji: '🩸', desc: 'Fruit can become 🩸 Bloodlit under the red moon!', time: [100, 150], weight: 1, night: true },
};

// ─── Tutorial (first-time players), then random garden tasks ───
const TUTORIAL_TASKS = [
  { type: 'plant',   goal: 1, text: 'Plant a seed in your garden', icon: '🌱' },
  { type: 'harvest', goal: 1, text: 'Harvest it when it sparkles', icon: '🧺' },
  { type: 'sell',    goal: 1, text: 'Sell your crop at the Sell stand', icon: '💰' },
  { type: 'buy',     goal: 1, text: 'Buy a seed from the Seed Shop', icon: '🛒' },
];

function fmtSheckles(n) {
  n = Math.floor(n);
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
  if (n >= 1e7) return (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + 'M';
  return n.toLocaleString();
}
