/* ============================================
   GROW A GARDEN 3D — Seed & Game Data
   ============================================ */
const SEEDS = {
  daisy:      { id: 'daisy',      name: 'Daisy',      emoji: '🌼', growTime: 30,  sellPrice: 5,   seedCost: 3,  color: 0xFFFF44, topColor: 0xFFFFAA, category: 'Flower',    rarity: 'common', level: 1 },
  sunflower:  { id: 'sunflower',  name: 'Sunflower',  emoji: '🌻', growTime: 45,  sellPrice: 10,  seedCost: 8,  color: 0xFFCC00, topColor: 0xFFDD44, category: 'Flower',    rarity: 'uncommon', level: 1 },
  rose:       { id: 'rose',       name: 'Rose',       emoji: '🌹', growTime: 60,  sellPrice: 15,  seedCost: 12, color: 0xFF2244, topColor: 0xFF6688, category: 'Flower',    rarity: 'rare', level: 4 },
  tulip:      { id: 'tulip',      name: 'Tulip',      emoji: '🌷', growTime: 40,  sellPrice: 8,   seedCost: 6,  color: 0xFF66AA, topColor: 0xFF99CC, category: 'Flower',    rarity: 'common', level: 1 },
  carrot:     { id: 'carrot',     name: 'Carrot',     emoji: '🥕', growTime: 35,  sellPrice: 7,   seedCost: 4,  color: 0xFF8800, topColor: 0x44AA22, category: 'Vegetable', rarity: 'common', level: 1 },
  tomato:     { id: 'tomato',     name: 'Tomato',     emoji: '🍅', growTime: 50,  sellPrice: 12,  seedCost: 8,  color: 0xFF3300, topColor: 0x44AA22, category: 'Vegetable', rarity: 'uncommon', level: 2, regrow: 3 },
  pumpkin:    { id: 'pumpkin',    name: 'Pumpkin',    emoji: '🎃', growTime: 90,  sellPrice: 25,  seedCost: 18, color: 0xFF7700, topColor: 0xFF9933, category: 'Vegetable', rarity: 'rare', level: 5 },
  strawberry: { id: 'strawberry', name: 'Strawberry', emoji: '🍓', growTime: 55,  sellPrice: 14,  seedCost: 10, color: 0xFF1144, topColor: 0x44AA22, category: 'Fruit',     rarity: 'uncommon', level: 3, regrow: 3 },
  blueberry:  { id: 'blueberry',  name: 'Blueberry',  emoji: '🫐', growTime: 50,  sellPrice: 11,  seedCost: 9,  color: 0x4444FF, topColor: 0x44AA22, category: 'Fruit',     rarity: 'uncommon', level: 3, regrow: 3 },
  cactus:     { id: 'cactus',     name: 'Cactus',     emoji: '🌵', growTime: 80,  sellPrice: 20,  seedCost: 15, color: 0x228B22, topColor: 0x33CC33, category: 'Exotic',    rarity: 'rare', level: 6 },
  mushroom:   { id: 'mushroom',   name: 'Mushroom',   emoji: '🍄', growTime: 40,  sellPrice: 9,   seedCost: 7,  color: 0xCC8844, topColor: 0xFF4444, category: 'Herb',      rarity: 'common', level: 2 },
  lavender:   { id: 'lavender',   name: 'Lavender',   emoji: '💜', growTime: 65,  sellPrice: 16,  seedCost: 12, color: 0x9966CC, topColor: 0xBB88EE, category: 'Herb',      rarity: 'uncommon', level: 4 },
  orchid:     { id: 'orchid',     name: 'Orchid',     emoji: '🪻', growTime: 100, sellPrice: 35,  seedCost: 25, color: 0xDA70D6, topColor: 0xEE99EE, category: 'Exotic',    rarity: 'rare', level: 7 },
  corn:       { id: 'corn',       name: 'Corn',       emoji: '🌽', growTime: 45,  sellPrice: 9,   seedCost: 6,  color: 0xFFD54F, topColor: 0xD7CCC8, category: 'Vegetable', rarity: 'common', level: 2 },
  watermelon: { id: 'watermelon', name: 'Watermelon', emoji: '🍉', growTime: 120, sellPrice: 40,  seedCost: 30, color: 0x43A047, topColor: 0xE53935, category: 'Fruit',     rarity: 'rare', level: 5 },
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

// Combined lookup: regular + holiday seeds
function getSeedData(seedId) {
  return SEEDS[seedId] || HOLIDAY_SEEDS[seedId] || null;
}

const SEED_LIST = Object.keys(SEEDS).sort((a, b) => (SEEDS[a].level - SEEDS[b].level) || (SEEDS[a].seedCost - SEEDS[b].seedCost));

// ─── Rarity ───
const RARITY = {
  common:    { name: 'Common',    color: '#B0BEC5', glow: 0x9CCC65, mult: 1 },
  uncommon:  { name: 'Uncommon',  color: '#4FC3F7', glow: 0x4FC3F7, mult: 1.2 },
  rare:      { name: 'Rare',      color: '#B388FF', glow: 0xB388FF, mult: 1.5 },
  epic:      { name: 'Epic',      color: '#FF80AB', glow: 0xFF4081, mult: 1.75 },
  legendary: { name: 'Legendary', color: '#FFD54F', glow: 0xFFD700, mult: 2 },
  mythic:    { name: 'Mythic',    color: '#64FFDA', glow: 0x64FFDA, mult: 3 },
};

// ─── Mutations (special crops) ───
// golden / rainbow are rolled when planted (you can see them while they grow!)
// wet comes from rain, moonlit from harvesting at night.
const MUTATIONS = {
  golden:  { name: 'Golden',  emoji: '✨', mult: 3, color: '#FFD54F' },
  rainbow: { name: 'Rainbow', emoji: '🌈', mult: 6, color: '#FF80AB' },
  wet:     { name: 'Wet',     emoji: '💧', mult: 1.5, color: '#4FC3F7' },
  moonlit: { name: 'Moonlit', emoji: '🌙', mult: 2, color: '#B39DDB' },
};

// ─── Levels ───
function xpForLevel(level) { // XP needed to go from `level` to `level + 1`
  return 40 + 30 * (level - 1);
}
const LEVEL_TITLES = [
  [1, '🌱 Seedling'], [3, '🌿 Sprout'], [5, '🧑‍🌾 Gardener'], [8, '👍 Green Thumb'],
  [11, '🏆 Master Gardener'], [14, '👑 Garden Legend'], [18, '🧙 Garden Wizard'],
];
function levelTitle(level) {
  let t = LEVEL_TITLES[0][1];
  for (const [l, name] of LEVEL_TITLES) if (level >= l) t = name;
  return t;
}

// ─── Upgrades & items sold by Shlomo ───
const UPGRADES = {
  big_can:      { name: 'Big Watering Can', emoji: '🪣', cost: 250,  level: 2, desc: 'Holds twice as much water' },
  speedy_shoes: { name: 'Speedy Shoes',     emoji: '👟', cost: 400,  level: 3, desc: 'Run around the garden faster' },
  sprinkler:    { name: 'Sprinkler',        emoji: '⛲', cost: 800,  level: 4, desc: 'Waters your whole garden for you!' },
  lucky_clover: { name: 'Lucky Clover',     emoji: '🍀', cost: 1500, level: 6, desc: 'Double chance of Golden & Rainbow crops' },
};
const POTION = { name: 'Grow Potion', emoji: '🧪', cost: 35, level: 2, desc: 'Makes one plant ready instantly!' };

// ─── Garden expansion ───
function plotUnlockCost(extraOwned) { return 60 + extraOwned * 45; }

// ─── Garden tasks ───
// First-time players get these in order, then random tasks are generated.
const TUTORIAL_TASKS = [
  { type: 'plant',   goal: 1, text: 'Plant a seed in the dirt', icon: '🌱' },
  { type: 'water',   goal: 1, text: 'Water a plant', icon: '💧' },
  { type: 'harvest', goal: 1, text: 'Harvest a plant when it sparkles', icon: '🧺' },
  { type: 'sell',    goal: 1, text: 'Sell a crop to Shlomo', icon: '💰' },
  { type: 'buy',     goal: 1, text: 'Buy a new seed from Shlomo', icon: '🛒' },
];
