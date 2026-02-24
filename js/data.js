/* ============================================
   GROW A GARDEN 3D — Seed & Game Data
   ============================================ */
const SEEDS = {
  daisy:      { id: 'daisy',      name: 'Daisy',      emoji: '🌼', growTime: 30,  sellPrice: 5,   seedCost: 3,  color: 0xFFFF44, topColor: 0xFFFFAA, category: 'Flower' },
  sunflower:  { id: 'sunflower',  name: 'Sunflower',  emoji: '🌻', growTime: 45,  sellPrice: 10,  seedCost: 8,  color: 0xFFCC00, topColor: 0xFFDD44, category: 'Flower' },
  rose:       { id: 'rose',       name: 'Rose',       emoji: '🌹', growTime: 60,  sellPrice: 15,  seedCost: 12, color: 0xFF2244, topColor: 0xFF6688, category: 'Flower' },
  tulip:      { id: 'tulip',      name: 'Tulip',      emoji: '🌷', growTime: 40,  sellPrice: 8,   seedCost: 6,  color: 0xFF66AA, topColor: 0xFF99CC, category: 'Flower' },
  carrot:     { id: 'carrot',     name: 'Carrot',     emoji: '🥕', growTime: 35,  sellPrice: 7,   seedCost: 4,  color: 0xFF8800, topColor: 0x44AA22, category: 'Vegetable' },
  tomato:     { id: 'tomato',     name: 'Tomato',     emoji: '🍅', growTime: 50,  sellPrice: 12,  seedCost: 8,  color: 0xFF3300, topColor: 0x44AA22, category: 'Vegetable' },
  pumpkin:    { id: 'pumpkin',    name: 'Pumpkin',    emoji: '🎃', growTime: 90,  sellPrice: 25,  seedCost: 18, color: 0xFF7700, topColor: 0xFF9933, category: 'Vegetable' },
  strawberry: { id: 'strawberry', name: 'Strawberry', emoji: '🍓', growTime: 55,  sellPrice: 14,  seedCost: 10, color: 0xFF1144, topColor: 0x44AA22, category: 'Fruit' },
  blueberry:  { id: 'blueberry',  name: 'Blueberry',  emoji: '🫐', growTime: 50,  sellPrice: 11,  seedCost: 9,  color: 0x4444FF, topColor: 0x44AA22, category: 'Fruit' },
  cactus:     { id: 'cactus',     name: 'Cactus',     emoji: '🌵', growTime: 80,  sellPrice: 20,  seedCost: 15, color: 0x228B22, topColor: 0x33CC33, category: 'Exotic' },
  mushroom:   { id: 'mushroom',   name: 'Mushroom',   emoji: '🍄', growTime: 40,  sellPrice: 9,   seedCost: 7,  color: 0xCC8844, topColor: 0xFF4444, category: 'Herb' },
  lavender:   { id: 'lavender',   name: 'Lavender',   emoji: '💜', growTime: 65,  sellPrice: 16,  seedCost: 12, color: 0x9966CC, topColor: 0xBB88EE, category: 'Herb' },
  orchid:     { id: 'orchid',     name: 'Orchid',     emoji: '🪻', growTime: 100, sellPrice: 35,  seedCost: 25, color: 0xDA70D6, topColor: 0xEE99EE, category: 'Exotic' },
};

const SEED_LIST = Object.keys(SEEDS);
