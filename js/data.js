/* ============================================
   GROW A GARDEN — Game Data Definitions
   ============================================ */

const GameData = (() => {

    // --- Rarity Tiers ---
    const RARITIES = {
        common:    { id: 'common',    name: 'Common',    color: '#90a4ae', multiplier: 1,   chance: 0.60  },
        uncommon:  { id: 'uncommon',  name: 'Uncommon',  color: '#66bb6a', multiplier: 2,   chance: 0.25  },
        rare:      { id: 'rare',      name: 'Rare',      color: '#42a5f5', multiplier: 5,   chance: 0.10  },
        epic:      { id: 'epic',      name: 'Epic',      color: '#ab47bc', multiplier: 12,  chance: 0.035 },
        legendary: { id: 'legendary', name: 'Legendary', color: '#ffa726', multiplier: 30,  chance: 0.012 },
        mythic:    { id: 'mythic',    name: 'Mythic',    color: '#ef5350', multiplier: 50,  chance: 0.003 },
    };

    // Ordered for rolling
    const RARITY_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];

    // --- Seed / Plant Types ---
    const SEEDS = {
        daisy: {
            id: 'daisy', name: 'Daisy', emoji: '🌼',
            stages: ['🟤', '🌱', '🌿', '🌼'],
            growTime: 30000, waterNeeded: 2,
            baseSellPrice: 5, seedCost: 3,
            category: 'flower',
        },
        sunflower: {
            id: 'sunflower', name: 'Sunflower', emoji: '🌻',
            stages: ['🟤', '🌱', '🌿', '🌻'],
            growTime: 45000, waterNeeded: 3,
            baseSellPrice: 10, seedCost: 8,
            category: 'flower',
        },
        rose: {
            id: 'rose', name: 'Rose', emoji: '🌹',
            stages: ['🟤', '🌱', '🥀', '🌹'],
            growTime: 60000, waterNeeded: 3,
            baseSellPrice: 15, seedCost: 12,
            category: 'flower',
        },
        tulip: {
            id: 'tulip', name: 'Tulip', emoji: '🌷',
            stages: ['🟤', '🌱', '🌿', '🌷'],
            growTime: 40000, waterNeeded: 2,
            baseSellPrice: 8, seedCost: 6,
            category: 'flower',
        },
        carrot: {
            id: 'carrot', name: 'Carrot', emoji: '🥕',
            stages: ['🟤', '🌱', '🌿', '🥕'],
            growTime: 35000, waterNeeded: 2,
            baseSellPrice: 7, seedCost: 4,
            category: 'vegetable',
        },
        tomato: {
            id: 'tomato', name: 'Tomato', emoji: '🍅',
            stages: ['🟤', '🌱', '🌿', '🍅'],
            growTime: 50000, waterNeeded: 3,
            baseSellPrice: 12, seedCost: 8,
            category: 'vegetable',
        },
        pumpkin: {
            id: 'pumpkin', name: 'Pumpkin', emoji: '🎃',
            stages: ['🟤', '🌱', '🌿', '🎃'],
            growTime: 90000, waterNeeded: 4,
            baseSellPrice: 25, seedCost: 18,
            category: 'vegetable',
        },
        strawberry: {
            id: 'strawberry', name: 'Strawberry', emoji: '🍓',
            stages: ['🟤', '🌱', '🌿', '🍓'],
            growTime: 55000, waterNeeded: 3,
            baseSellPrice: 14, seedCost: 10,
            category: 'fruit',
        },
        blueberry: {
            id: 'blueberry', name: 'Blueberry', emoji: '🫐',
            stages: ['🟤', '🌱', '🌿', '🫐'],
            growTime: 50000, waterNeeded: 3,
            baseSellPrice: 11, seedCost: 9,
            category: 'fruit',
        },
        cactus: {
            id: 'cactus', name: 'Cactus', emoji: '🌵',
            stages: ['🟤', '🌱', '🌿', '🌵'],
            growTime: 80000, waterNeeded: 1,
            baseSellPrice: 20, seedCost: 15,
            category: 'exotic',
        },
        mushroom: {
            id: 'mushroom', name: 'Mushroom', emoji: '🍄',
            stages: ['🟤', '🦠', '🍄‍🟫', '🍄'],
            growTime: 40000, waterNeeded: 2,
            baseSellPrice: 9, seedCost: 7,
            category: 'herb',
        },
        lavender: {
            id: 'lavender', name: 'Lavender', emoji: '💜',
            stages: ['🟤', '🌱', '🌿', '💜'],
            growTime: 65000, waterNeeded: 2,
            baseSellPrice: 16, seedCost: 12,
            category: 'herb',
        },
        orchid: {
            id: 'orchid', name: 'Orchid', emoji: '🪻',
            stages: ['🟤', '🌱', '🌿', '🪻'],
            growTime: 100000, waterNeeded: 4,
            baseSellPrice: 35, seedCost: 25,
            category: 'exotic',
        },
        venus_flytrap: {
            id: 'venus_flytrap', name: 'Venus Flytrap', emoji: '🪴',
            stages: ['🟤', '🌱', '🌿', '🪴'],
            growTime: 120000, waterNeeded: 5,
            baseSellPrice: 45, seedCost: 35,
            category: 'exotic',
        },
        crystal_flower: {
            id: 'crystal_flower', name: 'Crystal Flower', emoji: '💎',
            stages: ['🟤', '🌱', '✨', '💎'],
            growTime: 180000, waterNeeded: 6,
            baseSellPrice: 80, seedCost: 60,
            category: 'exotic',
        },
    };

    // --- Mutation Recipes ---
    // Each mutation needs two adjacent plants; produces a special mutant plant
    const MUTATIONS = [
        {
            id: 'golden_rose',
            name: 'Golden Rose',
            emoji: '🏵️',
            ingredients: ['rose', 'sunflower'],
            chance: 0.08,
            sellPrice: 100,
            description: 'A brilliant golden rose that shimmers in the light.',
        },
        {
            id: 'diamond_cactus',
            name: 'Diamond Cactus',
            emoji: '💠',
            ingredients: ['cactus', 'crystal_flower'],
            chance: 0.05,
            sellPrice: 200,
            description: 'A crystallized cactus with diamond-like spines.',
        },
        {
            id: 'shadow_mushroom',
            name: 'Shadow Mushroom',
            emoji: '🖤',
            ingredients: ['mushroom', 'lavender'],
            chance: 0.10,
            sellPrice: 60,
            description: 'A mysterious dark mushroom with a calming aura.',
        },
        {
            id: 'rainbow_tulip',
            name: 'Rainbow Tulip',
            emoji: '🌈',
            ingredients: ['tulip', 'orchid'],
            chance: 0.06,
            sellPrice: 120,
            description: 'A tulip that blooms in every color of the rainbow.',
        },
        {
            id: 'fire_berry',
            name: 'Fire Berry',
            emoji: '🔥',
            ingredients: ['strawberry', 'tomato'],
            chance: 0.09,
            sellPrice: 75,
            description: 'An intensely spicy berry that glows red-hot.',
        },
        {
            id: 'frost_pumpkin',
            name: 'Frost Pumpkin',
            emoji: '🧊',
            ingredients: ['pumpkin', 'blueberry'],
            chance: 0.07,
            sellPrice: 90,
            description: 'An icy pumpkin that never thaws.',
        },
        {
            id: 'star_daisy',
            name: 'Star Daisy',
            emoji: '⭐',
            ingredients: ['daisy', 'crystal_flower'],
            chance: 0.04,
            sellPrice: 150,
            description: 'A daisy that glows with celestial light.',
        },
        {
            id: 'venus_rose',
            name: 'Venus Rose',
            emoji: '🩷',
            ingredients: ['venus_flytrap', 'rose'],
            chance: 0.06,
            sellPrice: 130,
            description: 'A carnivorous rose that lures insects with beauty.',
        },
        {
            id: 'carrot_gold',
            name: 'Golden Carrot',
            emoji: '✨',
            ingredients: ['carrot', 'sunflower'],
            chance: 0.10,
            sellPrice: 50,
            description: 'A carrot infused with golden sunlight.',
        },
        {
            id: 'mystic_orchid',
            name: 'Mystic Orchid',
            emoji: '🔮',
            ingredients: ['orchid', 'mushroom'],
            chance: 0.05,
            sellPrice: 180,
            description: 'An orchid with psychic, otherworldly properties.',
        },
    ];

    // --- Weather Types ---
    const WEATHER = {
        sunny: {
            id: 'sunny',
            name: 'Sunny',
            icon: '☀️',
            growthModifier: 1.0,
            waterDrainModifier: 1.0,
            mutationModifier: 1.0,
            damageChance: 0,
            cssClass: 'sunny',
            weight: 35,
        },
        rainy: {
            id: 'rainy',
            name: 'Rainy',
            icon: '🌧️',
            growthModifier: 1.5,
            waterDrainModifier: 0.5,
            mutationModifier: 1.0,
            damageChance: 0,
            cssClass: 'rain',
            weight: 25,
        },
        stormy: {
            id: 'stormy',
            name: 'Stormy',
            icon: '⛈️',
            growthModifier: 0.8,
            waterDrainModifier: 0.5,
            mutationModifier: 1.2,
            damageChance: 0.01,
            cssClass: 'storm',
            weight: 10,
        },
        drought: {
            id: 'drought',
            name: 'Drought',
            icon: '🏜️',
            growthModifier: 0.7,
            waterDrainModifier: 2.0,
            mutationModifier: 0.8,
            damageChance: 0,
            cssClass: 'drought',
            weight: 15,
        },
        foggy: {
            id: 'foggy',
            name: 'Foggy',
            icon: '🌫️',
            growthModifier: 0.9,
            waterDrainModifier: 0.8,
            mutationModifier: 2.0,
            damageChance: 0,
            cssClass: 'fog',
            weight: 15,
        },
    };

    // Weather duration range (ms)
    const WEATHER_MIN_DURATION = 120000;  // 2 minutes
    const WEATHER_MAX_DURATION = 300000;  // 5 minutes

    // --- Upgrades ---
    const UPGRADES = {
        watering_can: {
            id: 'watering_can',
            name: 'Watering Can',
            icon: '🚿',
            description: 'Water more plants at once',
            levels: [
                { effect: 'Water 1 plot',          cost: 0 },
                { effect: 'Water 2 plots at once',  cost: 50 },
                { effect: 'Water 3 plots at once',  cost: 150 },
                { effect: 'Water all plots at once', cost: 400 },
                { effect: 'Auto-water every 30s',    cost: 1000 },
            ],
        },
        garden_size: {
            id: 'garden_size',
            name: 'Garden Size',
            icon: '🌾',
            description: 'Unlock more garden plots',
            levels: [
                { effect: '6 plots',  cost: 0,    plots: 6 },
                { effect: '9 plots',  cost: 100,  plots: 9 },
                { effect: '12 plots', cost: 300,  plots: 12 },
                { effect: '16 plots', cost: 800,  plots: 16 },
                { effect: '20 plots', cost: 2000, plots: 20 },
            ],
        },
        sell_bonus: {
            id: 'sell_bonus',
            name: 'Sell Bonus',
            icon: '💰',
            description: 'Increase sell prices',
            levels: [
                { effect: 'No bonus',   cost: 0,    bonus: 0 },
                { effect: '+10% sell',   cost: 75,   bonus: 0.10 },
                { effect: '+25% sell',   cost: 250,  bonus: 0.25 },
                { effect: '+50% sell',   cost: 600,  bonus: 0.50 },
                { effect: '+100% sell',  cost: 1500, bonus: 1.00 },
            ],
        },
        lucky_seeds: {
            id: 'lucky_seeds',
            name: 'Lucky Seeds',
            icon: '🍀',
            description: 'Better rarity rolls when planting',
            levels: [
                { effect: 'No bonus',        cost: 0,    boost: 0 },
                { effect: '+1% rarity boost', cost: 100,  boost: 0.01 },
                { effect: '+3% rarity boost', cost: 350,  boost: 0.03 },
                { effect: '+5% rarity boost', cost: 900,  boost: 0.05 },
                { effect: '+8% rarity boost', cost: 2500, boost: 0.08 },
            ],
        },
    };

    // --- Achievements ---
    const ACHIEVEMENTS = [
        { id: 'first_harvest',    name: 'First Harvest',     icon: '🌾', description: 'Harvest your first plant',          target: 1,     stat: 'totalHarvested',    reward: 10 },
        { id: 'harvest_10',       name: 'Green Thumb',       icon: '👍', description: 'Harvest 10 plants',                 target: 10,    stat: 'totalHarvested',    reward: 25 },
        { id: 'harvest_50',       name: 'Garden Master',     icon: '🏅', description: 'Harvest 50 plants',                 target: 50,    stat: 'totalHarvested',    reward: 100 },
        { id: 'harvest_200',      name: 'Legendary Farmer',  icon: '👑', description: 'Harvest 200 plants',                target: 200,   stat: 'totalHarvested',    reward: 500 },
        { id: 'earn_100',         name: 'Pocket Change',     icon: '🪙', description: 'Earn 100 coins total',              target: 100,   stat: 'totalEarned',       reward: 15 },
        { id: 'earn_1000',        name: 'Coin Collector',    icon: '💰', description: 'Earn 1,000 coins total',            target: 1000,  stat: 'totalEarned',       reward: 100 },
        { id: 'earn_10000',       name: 'Rich Gardener',     icon: '🤑', description: 'Earn 10,000 coins total',           target: 10000, stat: 'totalEarned',       reward: 500 },
        { id: 'mutation_1',       name: 'Mutant Discovery',  icon: '🧬', description: 'Discover your first mutation',      target: 1,     stat: 'mutationsFound',    reward: 50 },
        { id: 'mutation_5',       name: 'Mad Scientist',     icon: '🔬', description: 'Discover 5 different mutations',    target: 5,     stat: 'mutationsFound',    reward: 200 },
        { id: 'mutation_all',     name: 'Mutation Master',   icon: '🧪', description: 'Discover all 10 mutations',         target: 10,    stat: 'mutationsFound',    reward: 1000 },
        { id: 'rare_plant',       name: 'Rare Find',         icon: '💎', description: 'Grow a Rare plant',                 target: 1,     stat: 'rarePlantsGrown',   reward: 30 },
        { id: 'epic_plant',       name: 'Epic Discovery',    icon: '🟣', description: 'Grow an Epic plant',                target: 1,     stat: 'epicPlantsGrown',   reward: 75 },
        { id: 'legendary_plant',  name: 'Legendary Bloom',   icon: '🟠', description: 'Grow a Legendary plant',            target: 1,     stat: 'legendaryPlantsGrown', reward: 200 },
        { id: 'mythic_plant',     name: 'Mythic Miracle',    icon: '🔴', description: 'Grow a Mythic plant',               target: 1,     stat: 'mythicPlantsGrown', reward: 500 },
        { id: 'water_50',         name: 'Rain Dance',        icon: '💧', description: 'Water plants 50 times',             target: 50,    stat: 'totalWatered',      reward: 30 },
        { id: 'water_200',        name: 'Sprinkler System',  icon: '🚿', description: 'Water plants 200 times',            target: 200,   stat: 'totalWatered',      reward: 100 },
        { id: 'seeds_bought_50',  name: 'Seed Hoarder',      icon: '🛒', description: 'Buy 50 seeds',                      target: 50,    stat: 'totalSeedsBought',  reward: 40 },
        { id: 'all_types',        name: 'Botanist',          icon: '📚', description: 'Grow all 15 plant types',           target: 15,    stat: 'uniqueTypesGrown',  reward: 300 },
        { id: 'upgrade_max',      name: 'Fully Upgraded',    icon: '⬆️', description: 'Max out any upgrade',               target: 1,     stat: 'maxedUpgrades',     reward: 250 },
        { id: 'survive_storm',    name: 'Storm Survivor',    icon: '⛈️', description: 'Have a plant survive a storm',      target: 1,     stat: 'stormsWeathered',   reward: 25 },
    ];

    // --- Category colors ---
    const CATEGORIES = {
        flower:    { name: 'Flower',    color: '#f48fb1' },
        vegetable: { name: 'Vegetable', color: '#a5d6a7' },
        fruit:     { name: 'Fruit',     color: '#ef9a9a' },
        herb:      { name: 'Herb',      color: '#ce93d8' },
        exotic:    { name: 'Exotic',    color: '#80deea' },
    };

    // --- Helper: get adjacent plot indices for a grid ---
    function getAdjacentIndices(index, totalPlots, columns) {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const adjacent = [];

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < Math.ceil(totalPlots / columns) && nc >= 0 && nc < columns) {
                    const ni = nr * columns + nc;
                    if (ni < totalPlots) adjacent.push(ni);
                }
            }
        }
        return adjacent;
    }

    // --- Helper: roll for rarity ---
    function rollRarity(luckyBoost = 0) {
        const roll = Math.random();
        let cumulative = 0;

        for (const rarityId of RARITY_ORDER) {
            const rarity = RARITIES[rarityId];
            let chance = rarity.chance;
            // Lucky boost increases non-common chances
            if (rarityId !== 'common') {
                chance += luckyBoost / (RARITY_ORDER.length - 1);
            }
            cumulative += chance;
            if (roll < cumulative) {
                return rarityId;
            }
        }
        return 'common';
    }

    // --- Helper: weighted random weather ---
    function rollWeather() {
        const entries = Object.values(WEATHER);
        const totalWeight = entries.reduce((sum, w) => sum + w.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const weather of entries) {
            roll -= weather.weight;
            if (roll <= 0) return weather.id;
        }
        return 'sunny';
    }

    // --- Helper: format time ---
    function formatTime(ms) {
        if (ms <= 0) return 'Ready!';
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    // --- Helper: format coins ---
    function formatCoins(amount) {
        if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
        if (amount >= 10000) return (amount / 1000).toFixed(1) + 'K';
        return Math.floor(amount).toLocaleString();
    }

    return {
        RARITIES,
        RARITY_ORDER,
        SEEDS,
        MUTATIONS,
        WEATHER,
        WEATHER_MIN_DURATION,
        WEATHER_MAX_DURATION,
        UPGRADES,
        ACHIEVEMENTS,
        CATEGORIES,
        getAdjacentIndices,
        rollRarity,
        rollWeather,
        formatTime,
        formatCoins,
    };
})();
