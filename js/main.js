/* ============================================
   GROW A GARDEN — Main Entry Point
   ============================================ */

(function () {
    'use strict';

    const AVATARS = ['🌱', '🌻', '🌹', '🌵', '🍄', '🎃', '🌸', '🍓', '🦋', '🐝', '🐸', '🌈'];

    let selectedAvatar = AVATARS[0];
    let profileToDelete = null;

    // --- DOM shortcuts ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // --- Profile Screen ---
    function showProfileScreen() {
        const screen = $('#profile-screen');
        screen.classList.remove('hidden');

        // Migrate old single save if it exists
        const migrated = Garden.migrateOldSave();

        renderProfileList();
        initProfileEvents();
    }

    function hideProfileScreen() {
        const screen = $('#profile-screen');
        screen.classList.add('hidden');
    }

    function renderProfileList() {
        const list = $('#profile-list');
        const profiles = Garden.getProfiles();
        list.innerHTML = '';

        if (profiles.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted); font-size: 14px; padding: 16px 0;">No gardeners yet. Create one to start playing!</p>`;
            return;
        }

        profiles.forEach(profile => {
            // Peek at saved data for stats preview
            let statsText = 'New garden';
            try {
                const saved = localStorage.getItem(`growAGarden_save_${profile.id}`);
                if (saved) {
                    const data = JSON.parse(saved);
                    const coins = data.coins || 0;
                    const harvested = data.stats?.totalHarvested || 0;
                    statsText = `🪙 ${GameData.formatCoins(coins)} | 🌾 ${harvested} harvested`;
                }
            } catch (e) { /* ignore */ }

            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `
                <div class="profile-card-avatar">${profile.avatar}</div>
                <div class="profile-card-info">
                    <div class="profile-card-name">${escapeHtml(profile.name)}</div>
                    <div class="profile-card-stats">${statsText}</div>
                </div>
                <button class="profile-card-delete" title="Delete profile">&times;</button>
            `;

            // Click card to select profile
            card.addEventListener('click', (e) => {
                if (e.target.closest('.profile-card-delete')) return;
                selectProfile(profile.id);
            });

            // Delete button
            card.querySelector('.profile-card-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                profileToDelete = profile;
                $('#delete-profile-body').innerHTML = `<p>Permanently delete <strong>${escapeHtml(profile.name)}</strong>'s garden? This can't be undone.</p>`;
                $('#delete-profile-modal').classList.remove('hidden');
            });

            list.appendChild(card);
        });
    }

    function initProfileEvents() {
        // Add new profile button
        $('#profile-add-btn').addEventListener('click', openNewProfileModal);

        // New profile modal
        $('#new-profile-close').addEventListener('click', closeNewProfileModal);
        $('#new-profile-cancel').addEventListener('click', closeNewProfileModal);
        $('#new-profile-create').addEventListener('click', createNewProfile);
        $('#new-profile-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') createNewProfile();
        });

        // Avatar grid
        const grid = $('#profile-avatar-grid');
        grid.innerHTML = '';
        AVATARS.forEach(avatar => {
            const btn = document.createElement('button');
            btn.className = 'profile-avatar-option' + (avatar === selectedAvatar ? ' selected' : '');
            btn.textContent = avatar;
            btn.addEventListener('click', () => {
                selectedAvatar = avatar;
                $$('.profile-avatar-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            grid.appendChild(btn);
        });

        // Delete confirm modal
        $('#delete-profile-confirm').addEventListener('click', () => {
            if (profileToDelete) {
                Garden.deleteProfile(profileToDelete.id);
                profileToDelete = null;
                $('#delete-profile-modal').classList.add('hidden');
                renderProfileList();
            }
        });
        $('#delete-profile-cancel').addEventListener('click', () => {
            profileToDelete = null;
            $('#delete-profile-modal').classList.add('hidden');
        });

        // New profile modal overlay click
        $('#new-profile-modal').addEventListener('click', (e) => {
            if (e.target === $('#new-profile-modal')) closeNewProfileModal();
        });
        $('#delete-profile-modal').addEventListener('click', (e) => {
            if (e.target === $('#delete-profile-modal')) {
                profileToDelete = null;
                $('#delete-profile-modal').classList.add('hidden');
            }
        });
    }

    function openNewProfileModal() {
        $('#new-profile-name').value = '';
        selectedAvatar = AVATARS[0];
        $$('.profile-avatar-option').forEach((btn, i) => {
            btn.classList.toggle('selected', i === 0);
        });
        $('#new-profile-modal').classList.remove('hidden');
        setTimeout(() => $('#new-profile-name').focus(), 100);
    }

    function closeNewProfileModal() {
        $('#new-profile-modal').classList.add('hidden');
    }

    function createNewProfile() {
        const name = $('#new-profile-name').value.trim();
        if (!name) {
            $('#new-profile-name').focus();
            return;
        }

        const profile = Garden.createProfile(name, selectedAvatar);
        closeNewProfileModal();
        selectProfile(profile.id);
    }

    function selectProfile(profileId) {
        // Stop engine if running from a previous profile
        Engine.stop();

        Garden.setCurrentProfile(profileId);
        hideProfileScreen();
        startGame();
    }

    // --- Game Start ---
    function startGame() {
        const profile = Garden.getCurrentProfile();

        // Load save or start fresh
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

        // Update profile badge
        if (profile) {
            $('#profile-badge-avatar').textContent = profile.avatar;
            $('#profile-badge-name').textContent = profile.name;
        }

        // Profile badge click -> back to profile screen
        $('#profile-badge').onclick = () => {
            Engine.stop();
            Garden.save();
            // Reset to profile screen
            const screen = $('#profile-screen');
            screen.classList.remove('hidden');
            renderProfileList();
        };

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
        window.removeEventListener('beforeunload', saveOnUnload);
        window.addEventListener('beforeunload', saveOnUnload);

        document.removeEventListener('visibilitychange', saveOnHide);
        document.addEventListener('visibilitychange', saveOnHide);
    }

    function saveOnUnload() {
        Garden.save();
    }

    function saveOnHide() {
        if (document.hidden) Garden.save();
    }

    // --- Utility ---
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Boot ---
    function boot() {
        showProfileScreen();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
