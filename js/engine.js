/* ============================================
   GROW A GARDEN — Game Engine (Tick Loop)
   ============================================ */

const Engine = (() => {
    let tickInterval = null;
    let autoSaveCounter = 0;
    let autoWaterCounter = 0;
    const TICK_MS = 1000;
    const AUTO_SAVE_TICKS = 30; // every 30 seconds
    const AUTO_WATER_TICKS = 30; // every 30 seconds

    // Callbacks
    let onUIUpdate = null;
    let onWeatherChange = null;
    let onMutation = null;
    let onStormDamage = null;
    let onAutoWater = null;

    function setCallbacks({ uiUpdate, weatherChange, mutation, stormDamage, autoWater }) {
        onUIUpdate = uiUpdate || null;
        onWeatherChange = weatherChange || null;
        onMutation = mutation || null;
        onStormDamage = stormDamage || null;
        onAutoWater = autoWater || null;
    }

    function tick() {
        // 1. Growth
        Garden.tickGrowth(TICK_MS);

        // 2. Weather timer
        const weatherChanged = Garden.tickWeather(TICK_MS);
        if (weatherChanged) {
            const newWeather = Garden.getState().weather.current;
            if (onWeatherChange) onWeatherChange(newWeather);
        }

        // 3. Storm damage (random per tick)
        const damaged = Garden.tickStormDamage();
        if (damaged.length > 0 && onStormDamage) {
            onStormDamage(damaged);
        }

        // 4. Drought water drain
        Garden.tickDrought();

        // 5. Mutations
        const mutations = Garden.tickMutations();
        if (mutations.length > 0 && onMutation) {
            mutations.forEach(m => onMutation(m));
        }

        // 6. Auto-water
        autoWaterCounter++;
        if (autoWaterCounter >= AUTO_WATER_TICKS) {
            autoWaterCounter = 0;
            const watered = Garden.tickAutoWater();
            if (watered > 0 && onAutoWater) onAutoWater(watered);
        }

        // 7. Auto-save
        autoSaveCounter++;
        if (autoSaveCounter >= AUTO_SAVE_TICKS) {
            autoSaveCounter = 0;
            Garden.save();
        }

        // 8. UI update
        if (onUIUpdate) onUIUpdate();
    }

    function start() {
        if (tickInterval) return;
        tickInterval = setInterval(tick, TICK_MS);
    }

    function stop() {
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
    }

    function isRunning() {
        return tickInterval !== null;
    }

    return {
        setCallbacks,
        start,
        stop,
        isRunning,
    };
})();
