/* ============================================
   GROW A GARDEN — Main Entry Point
   ============================================ */

(function () {
    'use strict';

    // --- Initialize ---
    function init() {
        // Try loading saved game
        const savedState = Garden.load();
        let offlineData = null;

        if (savedState) {
            offlineData = Garden.calculateOfflineProgress();
        }

        // Set achievement callback
        Garden.setAchievementCallback((achievement) => {
            UI.showToast('🏆', `Achievement: ${achievement.name}! +🪙${achievement.reward}`, 'achievement-toast');
            UI.updateHeader();
        });

        // Initialize UI
        UI.init();

        // Show welcome back if applicable
        if (offlineData) {
            UI.showWelcomeBack(offlineData);
        }

        // Set engine callbacks
        Engine.setCallbacks({
            uiUpdate: () => UI.update(),
            weatherChange: (weatherId) => {
                const weather = GameData.WEATHER[weatherId];
                UI.showToast(weather.icon, `Weather changed to ${weather.name}!`, 'weather-toast');
                UI.updateHeader();
            },
            mutation: (data) => {
                UI.showToast('🧬', `Mutation! ${data.mutation.name} appeared!`, 'mutation-toast');
                UI.renderGarden();
            },
            stormDamage: (indices) => {
                UI.showToast('⛈️', `Storm damaged ${indices.length} plant${indices.length > 1 ? 's' : ''}!`);
                UI.renderGarden();
            },
            autoWater: (count) => {
                UI.showToast('🚿', `Auto-watered ${count} plant${count > 1 ? 's' : ''}!`);
            },
        });

        // Start the engine
        Engine.start();

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            Garden.save();
        });

        // Save on visibility change (tab switch on mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Garden.save();
            }
        });
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
