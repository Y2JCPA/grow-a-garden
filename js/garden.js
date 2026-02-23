/* ============================================
   GROW A GARDEN — Core Game Logic
   ============================================ */

const Garden = (() => {

    // --- Default Game State ---
    function createDefaultState() {
        return {
            coins: 100,
            plots: createPlots(6),
            inventory: { daisy: 3, sunflower: 1 }, // starter seeds
            upgrades: {
                watering_can: 0,
                garden_size: 0,
                sell_bonus: 0,
                lucky_seeds: 0,
            },
            discoveredMutations: [],
            completedAchievements: [],
            stats: {
                totalHarvested: 0,
                totalEarned: 0,
                totalWatered: 0,
                totalSeedsBought: 0,
                mutationsFound: 0,
                rarePlantsGrown: 0,
                epicPlantsGrown: 0,
                legendaryPlantsGrown: 0,
                mythicPlantsGrown: 0,
                uniqueTypesGrown: 0,
                maxedUpgrades: 0,
                stormsWeathered: 0,
                typesGrown: [],
            },
            weather: {
                current: 'sunny',
                timeRemaining: 180000,
            },
            lastSaveTime: Date.now(),
        };
    }

    function createPlots(count) {
        const plots = [];
        for (let i = 0; i < count; i++) {
            plots.push(createEmptyPlot());
        }
        return plots;
    }

    function createEmptyPlot() {
        return {
            state: 'empty', // empty | growing | harvestable | dead
            seedType: null,
            rarity: null,
            growthProgress: 0,    // ms elapsed
            growthTotal: 0,       // ms total needed
            waterLevel: 0,        // current water
            waterNeeded: 0,       // total water needed to grow
            watered: false,       // has been watered at least minimum
            isMutation: false,
            mutationId: null,
        };
    }

    let state = createDefaultState();

    // --- State Access ---
    function getState() { return state; }

    function setState(newState) { state = newState; }

    function getCoins() { return state.coins; }

    function addCoins(amount) {
        state.coins += amount;
        state.stats.totalEarned += amount;
    }

    function spendCoins(amount) {
        if (state.coins >= amount) {
            state.coins -= amount;
            return true;
        }
        return false;
    }

    // --- Plot Count ---
    function getMaxPlots() {
        const level = state.upgrades.garden_size;
        return GameData.UPGRADES.garden_size.levels[level].plots;
    }

    function getGridColumns() {
        const maxPlots = getMaxPlots();
        if (maxPlots <= 6) return 3;
        if (maxPlots <= 9) return 3;
        if (maxPlots <= 12) return 4;
        return 4;
    }

    // --- Inventory ---
    function getInventory() { return state.inventory; }

    function addSeed(seedId, count = 1) {
        state.inventory[seedId] = (state.inventory[seedId] || 0) + count;
    }

    function removeSeed(seedId) {
        if (state.inventory[seedId] && state.inventory[seedId] > 0) {
            state.inventory[seedId]--;
            if (state.inventory[seedId] === 0) delete state.inventory[seedId];
            return true;
        }
        return false;
    }

    function getSeedCount(seedId) {
        return state.inventory[seedId] || 0;
    }

    // --- Planting ---
    function plantSeed(plotIndex, seedId) {
        const plot = state.plots[plotIndex];
        if (!plot || plot.state !== 'empty') return null;
        if (!removeSeed(seedId)) return null;

        const seedData = GameData.SEEDS[seedId];
        if (!seedData) return null;

        // Roll for rarity
        const luckyBoost = GameData.UPGRADES.lucky_seeds.levels[state.upgrades.lucky_seeds].boost;
        const rarity = GameData.rollRarity(luckyBoost);

        plot.state = 'growing';
        plot.seedType = seedId;
        plot.rarity = rarity;
        plot.growthProgress = 0;
        plot.growthTotal = seedData.growTime;
        plot.waterLevel = 0;
        plot.waterNeeded = seedData.waterNeeded;
        plot.watered = false;
        plot.isMutation = false;
        plot.mutationId = null;

        // Track rarity stats
        if (rarity === 'rare') state.stats.rarePlantsGrown++;
        if (rarity === 'epic') state.stats.epicPlantsGrown++;
        if (rarity === 'legendary') state.stats.legendaryPlantsGrown++;
        if (rarity === 'mythic') state.stats.mythicPlantsGrown++;

        // Track unique types
        if (!state.stats.typesGrown.includes(seedId)) {
            state.stats.typesGrown.push(seedId);
            state.stats.uniqueTypesGrown = state.stats.typesGrown.length;
        }

        checkAchievements();
        return { rarity, seedData };
    }

    // --- Watering ---
    function waterPlot(plotIndex) {
        const plot = state.plots[plotIndex];
        if (!plot || plot.state !== 'growing') return false;
        if (plot.waterLevel >= plot.waterNeeded) return false;

        plot.waterLevel++;
        if (plot.waterLevel >= plot.waterNeeded) {
            plot.watered = true;
        }
        state.stats.totalWatered++;
        checkAchievements();
        return true;
    }

    function waterMultiple() {
        const level = state.upgrades.watering_can;
        let count;
        if (level <= 0) count = 1;
        else if (level === 1) count = 2;
        else if (level === 2) count = 3;
        else count = state.plots.length; // level 3+ = all

        let watered = 0;
        for (let i = 0; i < state.plots.length && watered < count; i++) {
            const plot = state.plots[i];
            if (plot.state === 'growing' && plot.waterLevel < plot.waterNeeded) {
                plot.waterLevel++;
                if (plot.waterLevel >= plot.waterNeeded) {
                    plot.watered = true;
                }
                state.stats.totalWatered++;
                watered++;
            }
        }
        checkAchievements();
        return watered;
    }

    // --- Harvesting ---
    function harvestPlot(plotIndex) {
        const plot = state.plots[plotIndex];
        if (!plot || plot.state !== 'harvestable') return null;

        const result = {
            seedType: plot.seedType,
            rarity: plot.rarity,
            isMutation: plot.isMutation,
            mutationId: plot.mutationId,
        };

        // Calculate sell price
        if (plot.isMutation) {
            const mutation = GameData.MUTATIONS.find(m => m.id === plot.mutationId);
            result.sellPrice = mutation ? mutation.sellPrice : 50;
            result.name = mutation ? mutation.name : 'Mutation';
            result.emoji = mutation ? mutation.emoji : '🧬';
        } else {
            const seedData = GameData.SEEDS[plot.seedType];
            const rarityData = GameData.RARITIES[plot.rarity];
            const sellBonus = GameData.UPGRADES.sell_bonus.levels[state.upgrades.sell_bonus].bonus;
            result.sellPrice = Math.floor(seedData.baseSellPrice * rarityData.multiplier * (1 + sellBonus));
            result.name = seedData.name;
            result.emoji = seedData.emoji;
        }

        result.rarityName = GameData.RARITIES[plot.rarity]?.name || 'Common';

        // Clear plot
        state.plots[plotIndex] = createEmptyPlot();
        state.stats.totalHarvested++;
        checkAchievements();

        return result;
    }

    function sellHarvest(result) {
        addCoins(result.sellPrice);
        checkAchievements();
    }

    // --- Growth Tick ---
    function tickGrowth(deltaMs) {
        const weather = GameData.WEATHER[state.weather.current];

        state.plots.forEach((plot, index) => {
            if (plot.state !== 'growing') return;
            if (!plot.watered) return; // needs water to grow

            const growAmount = deltaMs * weather.growthModifier;
            plot.growthProgress += growAmount;

            if (plot.growthProgress >= plot.growthTotal) {
                plot.state = 'harvestable';
                plot.growthProgress = plot.growthTotal;
            }
        });
    }

    // --- Weather ---
    function tickWeather(deltaMs) {
        state.weather.timeRemaining -= deltaMs;
        if (state.weather.timeRemaining <= 0) {
            changeWeather();
            return true;
        }
        return false;
    }

    function changeWeather() {
        const oldWeather = state.weather.current;
        let newWeather;
        do {
            newWeather = GameData.rollWeather();
        } while (newWeather === oldWeather && Math.random() > 0.3);

        state.weather.current = newWeather;
        state.weather.timeRemaining =
            GameData.WEATHER_MIN_DURATION +
            Math.random() * (GameData.WEATHER_MAX_DURATION - GameData.WEATHER_MIN_DURATION);

        return newWeather;
    }

    // --- Storm Damage ---
    function tickStormDamage() {
        if (state.weather.current !== 'stormy') return [];
        const damaged = [];

        state.plots.forEach((plot, i) => {
            if (plot.state === 'growing' && Math.random() < GameData.WEATHER.stormy.damageChance) {
                plot.state = 'dead';
                damaged.push(i);
            } else if (plot.state === 'growing' || plot.state === 'harvestable') {
                state.stats.stormsWeathered++;
            }
        });

        if (damaged.length > 0) checkAchievements();
        return damaged;
    }

    // --- Drought water drain ---
    function tickDrought() {
        if (state.weather.current !== 'drought') return;
        // Drought: small chance each tick to reduce water level
        state.plots.forEach(plot => {
            if (plot.state === 'growing' && plot.watered && Math.random() < 0.005) {
                plot.waterLevel = Math.max(0, plot.waterLevel - 1);
                if (plot.waterLevel < plot.waterNeeded) {
                    plot.watered = false;
                }
            }
        });
    }

    // --- Mutations ---
    function tickMutations() {
        const columns = getGridColumns();
        const totalPlots = state.plots.length;
        const weather = GameData.WEATHER[state.weather.current];
        const mutated = [];

        for (let i = 0; i < totalPlots; i++) {
            const plot = state.plots[i];
            if (plot.state !== 'growing' && plot.state !== 'harvestable') continue;
            if (plot.isMutation) continue;

            const adjacentIndices = GameData.getAdjacentIndices(i, totalPlots, columns);

            for (const adjIdx of adjacentIndices) {
                const adjPlot = state.plots[adjIdx];
                if (!adjPlot || adjPlot.state === 'empty' || adjPlot.state === 'dead') continue;
                if (adjPlot.isMutation) continue;

                // Check all mutation recipes
                for (const mutation of GameData.MUTATIONS) {
                    const pair = [plot.seedType, adjPlot.seedType].sort();
                    const recipe = [...mutation.ingredients].sort();

                    if (pair[0] === recipe[0] && pair[1] === recipe[1]) {
                        // Already discovered doesn't matter, can still trigger
                        const chance = mutation.chance * weather.mutationModifier;
                        if (Math.random() < chance / 60) { // per-second chance adjustment
                            // Mutate this plot
                            plot.isMutation = true;
                            plot.mutationId = mutation.id;
                            plot.state = 'harvestable';
                            plot.rarity = 'epic'; // mutations are at least epic

                            // Track discovery
                            if (!state.discoveredMutations.includes(mutation.id)) {
                                state.discoveredMutations.push(mutation.id);
                                state.stats.mutationsFound = state.discoveredMutations.length;
                            }

                            mutated.push({ plotIndex: i, mutation });
                            checkAchievements();
                            break;
                        }
                    }
                }
            }
        }
        return mutated;
    }

    // --- Auto-water (upgrade level 4) ---
    function tickAutoWater() {
        if (state.upgrades.watering_can < 4) return 0;
        let watered = 0;
        state.plots.forEach(plot => {
            if (plot.state === 'growing' && plot.waterLevel < plot.waterNeeded) {
                plot.waterLevel++;
                if (plot.waterLevel >= plot.waterNeeded) {
                    plot.watered = true;
                }
                state.stats.totalWatered++;
                watered++;
            }
        });
        if (watered > 0) checkAchievements();
        return watered;
    }

    // --- Shopping ---
    function buySeed(seedId) {
        const seedData = GameData.SEEDS[seedId];
        if (!seedData) return false;
        if (!spendCoins(seedData.seedCost)) return false;

        addSeed(seedId);
        state.stats.totalSeedsBought++;
        checkAchievements();
        return true;
    }

    // --- Upgrades ---
    function buyUpgrade(upgradeId) {
        const upgrade = GameData.UPGRADES[upgradeId];
        if (!upgrade) return false;

        const currentLevel = state.upgrades[upgradeId];
        if (currentLevel >= upgrade.levels.length - 1) return false;

        const nextLevel = upgrade.levels[currentLevel + 1];
        if (!spendCoins(nextLevel.cost)) return false;

        state.upgrades[upgradeId] = currentLevel + 1;

        // If maxed, track it
        if (state.upgrades[upgradeId] >= upgrade.levels.length - 1) {
            state.stats.maxedUpgrades++;
        }

        // If garden size upgrade, expand plots
        if (upgradeId === 'garden_size') {
            const newPlotCount = nextLevel.plots;
            while (state.plots.length < newPlotCount) {
                state.plots.push(createEmptyPlot());
            }
        }

        checkAchievements();
        return true;
    }

    // --- Remove dead plants ---
    function clearPlot(plotIndex) {
        const plot = state.plots[plotIndex];
        if (!plot) return false;
        if (plot.state === 'dead') {
            state.plots[plotIndex] = createEmptyPlot();
            return true;
        }
        return false;
    }

    // --- Achievements ---
    let onAchievementUnlocked = null;

    function setAchievementCallback(cb) {
        onAchievementUnlocked = cb;
    }

    function checkAchievements() {
        for (const achievement of GameData.ACHIEVEMENTS) {
            if (state.completedAchievements.includes(achievement.id)) continue;

            const currentValue = state.stats[achievement.stat] || 0;
            if (currentValue >= achievement.target) {
                state.completedAchievements.push(achievement.id);
                state.coins += achievement.reward;
                if (onAchievementUnlocked) {
                    onAchievementUnlocked(achievement);
                }
            }
        }
    }

    // --- Save / Load ---
    const SAVE_KEY = 'growAGarden_save';

    function save() {
        state.lastSaveTime = Date.now();
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save:', e);
        }
    }

    function load() {
        try {
            const saved = localStorage.getItem(SAVE_KEY);
            if (!saved) return null;

            const parsed = JSON.parse(saved);
            // Merge with defaults to handle new fields
            const defaults = createDefaultState();
            state = {
                ...defaults,
                ...parsed,
                stats: { ...defaults.stats, ...parsed.stats },
                upgrades: { ...defaults.upgrades, ...parsed.upgrades },
                weather: { ...defaults.weather, ...parsed.weather },
            };
            return state;
        } catch (e) {
            console.warn('Failed to load save:', e);
            return null;
        }
    }

    function resetSave() {
        localStorage.removeItem(SAVE_KEY);
        state = createDefaultState();
        return state;
    }

    // --- Offline Progress ---
    function calculateOfflineProgress() {
        const now = Date.now();
        const elapsed = Math.min(now - state.lastSaveTime, 24 * 60 * 60 * 1000); // cap 24h

        if (elapsed < 5000) return null; // less than 5s, skip

        let plantsGrown = 0;
        let plantsReady = 0;

        // Simulate growth in bulk
        state.plots.forEach(plot => {
            if (plot.state !== 'growing') return;
            if (!plot.watered) return;

            const oldProgress = plot.growthProgress;
            plot.growthProgress += elapsed;

            if (plot.growthProgress >= plot.growthTotal) {
                plot.state = 'harvestable';
                plot.growthProgress = plot.growthTotal;
                plantsReady++;
            }
            plantsGrown++;
        });

        state.lastSaveTime = now;
        return {
            elapsed,
            plantsGrown,
            plantsReady,
        };
    }

    return {
        getState,
        setState,
        getCoins,
        addCoins,
        spendCoins,
        getMaxPlots,
        getGridColumns,
        getInventory,
        addSeed,
        removeSeed,
        getSeedCount,
        plantSeed,
        waterPlot,
        waterMultiple,
        harvestPlot,
        sellHarvest,
        tickGrowth,
        tickWeather,
        changeWeather,
        tickStormDamage,
        tickDrought,
        tickMutations,
        tickAutoWater,
        buySeed,
        buyUpgrade,
        clearPlot,
        setAchievementCallback,
        checkAchievements,
        save,
        load,
        resetSave,
        calculateOfflineProgress,
        createDefaultState,
    };
})();
