/* ============================================
   GROW A GARDEN — UI Rendering & Interactions
   ============================================ */

const UI = (() => {

    // --- DOM References ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    let els = {};
    let currentView = 'garden-view';
    let selectedPlotIndex = null;
    let pendingHarvest = null;

    function cacheDom() {
        els = {
            coinAmount: $('#coin-amount'),
            weatherIcon: $('#weather-icon'),
            weatherName: $('#weather-name'),
            weatherTimer: $('#weather-timer'),
            weatherOverlay: $('#weather-overlay'),
            gardenGrid: $('#garden-grid'),
            shopGrid: $('#shop-grid'),
            upgradesList: $('#upgrades-list'),
            mutationsGrid: $('#mutations-grid'),
            achievementsList: $('#achievements-list'),
            seedModal: $('#seed-modal'),
            seedModalBody: $('#seed-modal-body'),
            seedModalClose: $('#seed-modal-close'),
            harvestModal: $('#harvest-modal'),
            harvestModalBody: $('#harvest-modal-body'),
            harvestSellBtn: $('#harvest-sell-btn'),
            harvestCloseBtn: $('#harvest-close-btn'),
            welcomeModal: $('#welcome-modal'),
            welcomeModalBody: $('#welcome-modal-body'),
            welcomeCloseBtn: $('#welcome-close-btn'),
            toastContainer: $('#toast-container'),
        };
    }

    // --- Navigation ---
    function initNav() {
        $$('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const viewId = btn.dataset.view;
                switchView(viewId);
            });
        });
    }

    function switchView(viewId) {
        currentView = viewId;

        $$('.view').forEach(v => v.classList.remove('active'));
        const view = $(`#${viewId}`);
        if (view) view.classList.add('active');

        $$('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        // Re-render the active view
        if (viewId === 'garden-view') renderGarden();
        else if (viewId === 'shop-view') renderShop();
        else if (viewId === 'upgrades-view') renderUpgrades();
        else if (viewId === 'mutations-view') renderMutations();
        else if (viewId === 'achievements-view') renderAchievements();
    }

    // --- Header ---
    function updateHeader() {
        const state = Garden.getState();
        els.coinAmount.textContent = GameData.formatCoins(state.coins);

        const weather = GameData.WEATHER[state.weather.current];
        els.weatherIcon.textContent = weather.icon;
        els.weatherName.textContent = weather.name;
        els.weatherTimer.textContent = GameData.formatTime(state.weather.timeRemaining);

        // Weather overlay
        els.weatherOverlay.className = 'weather-overlay ' + weather.cssClass;
    }

    // --- Garden Rendering ---
    function renderGarden() {
        const state = Garden.getState();
        const maxPlots = Garden.getMaxPlots();
        const grid = els.gardenGrid;

        // Update grid columns
        const cols = Garden.getGridColumns();
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        grid.innerHTML = '';

        for (let i = 0; i < maxPlots; i++) {
            const plot = state.plots[i];
            const plotEl = document.createElement('div');
            plotEl.className = 'plot';
            plotEl.dataset.index = i;

            if (!plot || plot.state === 'empty') {
                plotEl.classList.add('empty');
                plotEl.innerHTML = `
                    <span class="plot-empty-icon">+</span>
                    <span class="plot-empty-label">Plant</span>
                `;
                plotEl.addEventListener('click', () => openSeedModal(i));
            } else if (plot.state === 'growing') {
                const seedData = GameData.SEEDS[plot.seedType];
                const progress = plot.growthProgress / plot.growthTotal;
                const stageIndex = Math.min(
                    Math.floor(progress * seedData.stages.length),
                    seedData.stages.length - 1
                );
                const emoji = seedData.stages[stageIndex];

                plotEl.classList.add(`rarity-${plot.rarity}`);
                plotEl.innerHTML = `
                    <span class="plot-rarity">${GameData.RARITIES[plot.rarity].name}</span>
                    <span class="plot-water ${!plot.watered ? 'needs-water' : ''}">${!plot.watered ? '💧' : '✅'}</span>
                    <span class="plot-emoji">${emoji}</span>
                    <span class="plot-label">${seedData.name}</span>
                    <div class="plot-progress">
                        <div class="plot-progress-fill" style="width: ${Math.min(progress * 100, 100)}%"></div>
                    </div>
                `;
                plotEl.addEventListener('click', () => {
                    if (!plot.watered) {
                        waterPlotAction(i);
                    }
                });
            } else if (plot.state === 'harvestable') {
                const emoji = plot.isMutation
                    ? (GameData.MUTATIONS.find(m => m.id === plot.mutationId)?.emoji || '🧬')
                    : GameData.SEEDS[plot.seedType].emoji;
                const name = plot.isMutation
                    ? (GameData.MUTATIONS.find(m => m.id === plot.mutationId)?.name || 'Mutation')
                    : GameData.SEEDS[plot.seedType].name;

                plotEl.classList.add('harvestable', `rarity-${plot.rarity}`);
                if (plot.isMutation) plotEl.classList.add('mutated');
                plotEl.innerHTML = `
                    <span class="plot-rarity">${GameData.RARITIES[plot.rarity].name}</span>
                    <span class="plot-emoji">${emoji}</span>
                    <span class="plot-label">${name}</span>
                    <div class="plot-progress">
                        <div class="plot-progress-fill" style="width: 100%; background: var(--yellow-gold)"></div>
                    </div>
                `;
                plotEl.addEventListener('click', () => harvestPlotAction(i));
            } else if (plot.state === 'dead') {
                plotEl.classList.add('empty');
                plotEl.innerHTML = `
                    <span class="plot-emoji" style="opacity: 0.5">💀</span>
                    <span class="plot-label" style="color: var(--rarity-mythic)">Dead</span>
                `;
                plotEl.addEventListener('click', () => {
                    Garden.clearPlot(i);
                    renderGarden();
                });
            }

            grid.appendChild(plotEl);
        }
    }

    // --- Water action ---
    function waterPlotAction(plotIndex) {
        const level = Garden.getState().upgrades.watering_can;
        if (level === 0) {
            const watered = Garden.waterPlot(plotIndex);
            if (watered) {
                showToast('💧', 'Watered!');
            }
        } else {
            const count = Garden.waterMultiple();
            if (count > 0) {
                showToast('💧', `Watered ${count} plant${count > 1 ? 's' : ''}!`);
            }
        }
        renderGarden();
    }

    // --- Harvest action ---
    function harvestPlotAction(plotIndex) {
        const result = Garden.harvestPlot(plotIndex);
        if (!result) return;

        pendingHarvest = result;

        const rarityColor = GameData.RARITIES[result.rarity]?.color || '#90a4ae';
        els.harvestModalBody.innerHTML = `
            <div class="harvest-info">
                <div class="harvest-emoji">${result.emoji}</div>
                <div class="harvest-name">${result.name}</div>
                <div class="harvest-rarity-badge" style="background: ${rarityColor}; color: white">
                    ${result.rarityName}${result.isMutation ? ' Mutation' : ''}
                </div>
                <div class="harvest-value">🪙 ${result.sellPrice}</div>
            </div>
        `;

        els.harvestModal.classList.remove('hidden');
        renderGarden();
    }

    // --- Seed Modal ---
    function openSeedModal(plotIndex) {
        selectedPlotIndex = plotIndex;
        const inventory = Garden.getInventory();
        const seedIds = Object.keys(inventory).filter(id => inventory[id] > 0);

        if (seedIds.length === 0) {
            showToast('🌱', 'No seeds! Visit the shop to buy some.');
            return;
        }

        els.seedModalBody.innerHTML = '';
        seedIds.forEach(seedId => {
            const seedData = GameData.SEEDS[seedId];
            if (!seedData) return;
            const count = inventory[seedId];

            const option = document.createElement('div');
            option.className = 'seed-option';
            option.innerHTML = `
                <span class="seed-option-emoji">${seedData.emoji}</span>
                <div class="seed-option-info">
                    <div class="seed-option-name">${seedData.name}</div>
                    <div class="seed-option-count">${count} seed${count > 1 ? 's' : ''} | ${GameData.formatTime(seedData.growTime)} grow time</div>
                </div>
            `;
            option.addEventListener('click', () => {
                const result = Garden.plantSeed(selectedPlotIndex, seedId);
                if (result) {
                    const rarityName = GameData.RARITIES[result.rarity].name;
                    if (result.rarity !== 'common') {
                        showToast('✨', `${rarityName} ${seedData.name}!`, 'achievement-toast');
                    }
                    closeSeedModal();
                    renderGarden();
                }
            });
            els.seedModalBody.appendChild(option);
        });

        els.seedModal.classList.remove('hidden');
    }

    function closeSeedModal() {
        els.seedModal.classList.add('hidden');
        selectedPlotIndex = null;
    }

    // --- Shop Rendering ---
    function renderShop() {
        const grid = els.shopGrid;
        grid.innerHTML = '';

        Object.values(GameData.SEEDS).forEach(seed => {
            const canAfford = Garden.getCoins() >= seed.seedCost;
            const category = GameData.CATEGORIES[seed.category];

            const card = document.createElement('div');
            card.className = 'seed-card';
            card.innerHTML = `
                <div class="seed-card-emoji">${seed.emoji}</div>
                <div class="seed-card-name">${seed.name}</div>
                <div class="seed-card-category" style="color: ${category.color}">${category.name}</div>
                <div class="seed-card-stats">
                    <div class="seed-card-stat"><span>Grow time:</span><span>${GameData.formatTime(seed.growTime)}</span></div>
                    <div class="seed-card-stat"><span>Water:</span><span>${seed.waterNeeded}x</span></div>
                    <div class="seed-card-stat"><span>Sells for:</span><span>🪙 ${seed.baseSellPrice}+</span></div>
                    <div class="seed-card-stat"><span>In bag:</span><span>${Garden.getSeedCount(seed.id)}</span></div>
                </div>
                <button class="seed-card-btn" ${!canAfford ? 'disabled' : ''}>
                    Buy 🪙 ${seed.seedCost}
                </button>
            `;

            const btn = card.querySelector('.seed-card-btn');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (Garden.buySeed(seed.id)) {
                    showToast('🛒', `Bought ${seed.name} seed!`);
                    renderShop();
                    updateHeader();
                }
            });

            grid.appendChild(card);
        });
    }

    // --- Upgrades Rendering ---
    function renderUpgrades() {
        const list = els.upgradesList;
        list.innerHTML = '';
        const state = Garden.getState();

        Object.values(GameData.UPGRADES).forEach(upgrade => {
            const level = state.upgrades[upgrade.id];
            const isMaxed = level >= upgrade.levels.length - 1;
            const currentEffect = upgrade.levels[level].effect;
            const nextCost = isMaxed ? null : upgrade.levels[level + 1].cost;
            const canAfford = nextCost !== null && state.coins >= nextCost;

            const card = document.createElement('div');
            card.className = 'upgrade-card';

            let actionHtml;
            if (isMaxed) {
                actionHtml = `<span class="upgrade-maxed">MAX</span>`;
            } else {
                actionHtml = `<button class="upgrade-btn" ${!canAfford ? 'disabled' : ''}>🪙 ${nextCost}</button>`;
            }

            // Level pips
            const pips = upgrade.levels.map((_, i) =>
                `<div class="upgrade-pip ${i <= level ? 'filled' : ''}"></div>`
            ).join('');

            card.innerHTML = `
                <span class="upgrade-icon">${upgrade.icon}</span>
                <div class="upgrade-info">
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-desc">${upgrade.description}</div>
                    <div class="upgrade-level">Current: ${currentEffect}</div>
                    <div class="upgrade-level-pips">${pips}</div>
                </div>
                ${actionHtml}
            `;

            if (!isMaxed) {
                const btn = card.querySelector('.upgrade-btn');
                btn.addEventListener('click', () => {
                    if (Garden.buyUpgrade(upgrade.id)) {
                        showToast('⬆️', `${upgrade.name} upgraded!`);
                        renderUpgrades();
                        renderGarden();
                        updateHeader();
                    }
                });
            }

            list.appendChild(card);
        });
    }

    // --- Mutations Rendering ---
    function renderMutations() {
        const grid = els.mutationsGrid;
        grid.innerHTML = '';
        const state = Garden.getState();

        GameData.MUTATIONS.forEach(mutation => {
            const discovered = state.discoveredMutations.includes(mutation.id);
            const card = document.createElement('div');
            card.className = `mutation-card ${discovered ? 'discovered' : 'undiscovered'}`;

            const ing1 = GameData.SEEDS[mutation.ingredients[0]];
            const ing2 = GameData.SEEDS[mutation.ingredients[1]];

            if (discovered) {
                card.innerHTML = `
                    <div class="mutation-recipe">
                        <span>${ing1.emoji}</span>
                        <span class="mutation-plus">+</span>
                        <span>${ing2.emoji}</span>
                        <span class="mutation-arrow">=</span>
                        <span class="mutation-result">${mutation.emoji}</span>
                    </div>
                    <div class="mutation-name">${mutation.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px">${mutation.description}</div>
                    <div style="font-size: 13px; color: var(--yellow-gold); margin-top: 6px; font-weight: 600">🪙 ${mutation.sellPrice}</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="mutation-recipe">
                        <span>${ing1.emoji}</span>
                        <span class="mutation-plus">+</span>
                        <span>${ing2.emoji}</span>
                        <span class="mutation-arrow">=</span>
                        <span class="mutation-result">❓</span>
                    </div>
                    <div class="mutation-undiscovered-text">Undiscovered</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px">
                        Plant ${ing1.name} and ${ing2.name} next to each other
                    </div>
                `;
            }

            grid.appendChild(card);
        });
    }

    // --- Achievements Rendering ---
    function renderAchievements() {
        const list = els.achievementsList;
        list.innerHTML = '';
        const state = Garden.getState();

        GameData.ACHIEVEMENTS.forEach(ach => {
            const completed = state.completedAchievements.includes(ach.id);
            const current = Math.min(state.stats[ach.stat] || 0, ach.target);
            const progress = current / ach.target;

            const card = document.createElement('div');
            card.className = `achievement-card ${completed ? 'completed' : ''}`;

            card.innerHTML = `
                <span class="achievement-icon">${ach.icon}</span>
                <div class="achievement-info">
                    <div class="achievement-name">${ach.name}</div>
                    <div class="achievement-desc">${ach.description}</div>
                    <div class="achievement-progress-bar">
                        <div class="achievement-progress-fill" style="width: ${progress * 100}%"></div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px">${current} / ${ach.target}</div>
                </div>
                ${completed
                    ? '<span class="achievement-check">✅</span>'
                    : `<span class="achievement-reward">🪙 ${ach.reward}</span>`
                }
            `;

            list.appendChild(card);
        });
    }

    // --- Toast Notifications ---
    function showToast(icon, text, extraClass = '') {
        const toast = document.createElement('div');
        toast.className = `toast ${extraClass}`;
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-text">${text}</span>
        `;

        els.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('exiting');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // --- Welcome Back Modal ---
    function showWelcomeBack(offlineData) {
        if (!offlineData) return;

        const hours = Math.floor(offlineData.elapsed / 3600000);
        const minutes = Math.floor((offlineData.elapsed % 3600000) / 60000);
        let timeStr = '';
        if (hours > 0) timeStr += `${hours}h `;
        timeStr += `${minutes}m`;

        els.welcomeModalBody.innerHTML = `
            <div class="welcome-time">You were away for ${timeStr}</div>
            <div class="welcome-stats">
                <div class="welcome-stat">
                    <span>Plants grew while away</span>
                    <span>${offlineData.plantsGrown}</span>
                </div>
                <div class="welcome-stat">
                    <span>Plants ready to harvest</span>
                    <span>${offlineData.plantsReady}</span>
                </div>
            </div>
        `;

        els.welcomeModal.classList.remove('hidden');
    }

    // --- Modal Event Binding ---
    function initModals() {
        // Seed modal close
        els.seedModalClose.addEventListener('click', closeSeedModal);
        els.seedModal.addEventListener('click', (e) => {
            if (e.target === els.seedModal) closeSeedModal();
        });

        // Harvest modal
        els.harvestSellBtn.addEventListener('click', () => {
            if (pendingHarvest) {
                Garden.sellHarvest(pendingHarvest);
                showCoinFly();
                showToast('🪙', `Sold for ${pendingHarvest.sellPrice} coins!`);
                pendingHarvest = null;
                els.harvestModal.classList.add('hidden');
                updateHeader();
            }
        });

        els.harvestCloseBtn.addEventListener('click', () => {
            // Harvest without selling (just discard)
            pendingHarvest = null;
            els.harvestModal.classList.add('hidden');
        });

        // Welcome modal
        els.welcomeCloseBtn.addEventListener('click', () => {
            els.welcomeModal.classList.add('hidden');
        });
    }

    // --- Coin fly animation ---
    function showCoinFly() {
        const coinEl = els.coinAmount.closest('.coins-display');
        const rect = coinEl.getBoundingClientRect();

        const fly = document.createElement('span');
        fly.className = 'coin-fly';
        fly.textContent = '🪙';
        fly.style.left = rect.left + rect.width / 2 + 'px';
        fly.style.top = rect.top + 'px';
        document.body.appendChild(fly);

        setTimeout(() => fly.remove(), 800);
    }

    // --- Full UI Update (called every tick) ---
    function update() {
        updateHeader();
        if (currentView === 'garden-view') {
            renderGarden();
        }
    }

    // --- Init ---
    function init() {
        cacheDom();
        initNav();
        initModals();
        update();
    }

    return {
        init,
        update,
        renderGarden,
        renderShop,
        renderUpgrades,
        renderMutations,
        renderAchievements,
        updateHeader,
        showToast,
        showWelcomeBack,
        switchView,
    };
})();
