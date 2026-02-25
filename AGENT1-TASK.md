# Agent 1: Growth Stages, Watering, Day/Night Cycle, Weather & Ambient Sounds

## Context
You're working on "Grow a Garden" — a vanilla HTML/CSS/JS 3D browser game using Three.js. Kids ages 3-16 play this.
- Game files: `js/game.js` (~2600 lines), `js/data.js`, `index.html`, `style.css`
- Deployed to GitHub Pages at https://y2jcpa.github.io/grow-a-garden/
- Existing save data in localStorage MUST NOT break. New fields must have safe defaults.
- NO external dependencies beyond Three.js (loaded via CDN in index.html)
- All code is inside an IIFE in game.js

## CRITICAL BUG TO FIX FIRST
`saveGame()` does NOT save `unlockedSkins` or `selectedSlot`. Fix this:
- Add `unlockedSkins: gameState.unlockedSkins` and `selectedSlot: gameState.selectedSlot` to the save object
- In `loadGame()`, restore them with safe defaults: `unlockedSkins: data.unlockedSkins || ['farmer']`, `selectedSlot: data.selectedSlot || 0`

## Features to Build

### 1. Growth Stages (Visual Progression)
Currently plants go from tiny to full size based on a linear progress value. Make it staged:
- **Sprout** (0-33%): tiny green nub, just poking out of soil
- **Growing** (33-66%): medium height, some color showing, leaves forming  
- **Mature** (66-99%): nearly full size, full color but no glow/bob
- **Ready** (100%): current full-size behavior with glow and bob animation
- Modify `buildPlantModel()` and `updatePlantMeshes()` to use discrete stages
- Show stage name in plot label when looking at a plant ("🌱 Sprout", "🌿 Growing", "🌻 Ready!")

### 2. Watering System
- Add a "water" resource to gameState (starts at 100, max 100)
- Add a watering can tool — press W key or tap 💧 HUD button to water nearby plot
- Plants need water to grow. Each plant has a `waterLevel` (0-100, starts at 100 when planted)
- Water decreases over time (lose ~1 water per 5 seconds of real time)
- If waterLevel hits 0, growth PAUSES (doesn't kill the plant — no pests/weeds/death!)
- Watering a plot restores its waterLevel to 100
- Add a small water droplet particle effect when watering
- Add a water well/fountain near the garden — walk to it to refill your watering can (press E)
- Show water level on plot label: "💧 85%" alongside growth stage
- Visual indicator: dry plants look slightly yellow-tinted, well-watered look vibrant
- HUD: show watering can fill level next to coins (💧 85/100)

### 3. Day/Night Cycle
- Full cycle: 5 real minutes = 1 game day
- **Dawn** (0-15%): sky goes from dark blue to orange-pink
- **Day** (15-65%): current bright blue sky
- **Dusk** (65-80%): sky goes orange-pink to purple
- **Night** (80-100%): dark blue/navy, stars, reduced light
- Smoothly transition:
  - `scene.background` color
  - `scene.fog` color  
  - Directional light intensity and color
  - Ambient light intensity
- At night: spawn 20-30 firefly particles (small yellow-green dots that drift around slowly with subtle glow)
- Fireflies are THREE.js point sprites or small meshes that bob gently
- Don't make night TOO dark — kids should still be able to play. Just moody.
- Add a small sun/moon indicator in HUD corner showing time of day (☀️ or 🌙)

### 4. Weather System  
- Random weather changes every 1-2 game days
- **Sunny** (default): normal lighting, no effects
- **Rainy**: 
  - Particle system: blue rain drops falling from sky (simple lines or small meshes falling down)
  - Slightly darker ambient light
  - Rain waters ALL plants automatically (+5 water per 10 seconds)
  - Sky slightly grayer
  - Rain sound effect: not actual audio, just a visual "🌧️ Raining!" toast and HUD indicator
- **Cloudy**: slightly dimmer, no rain, no special effects
- Show current weather in HUD corner: ☀️ / ☁️ / 🌧️
- Rain should look good with the blocky Minecraft aesthetic (blocky rain drops!)

### 5. Ambient Environment
- Add a few butterflies (small colored triangles) that flutter around flowers during the day
- Add birds (tiny dark v-shapes) that fly across the sky occasionally
- These are purely decorative — no interaction needed

## Technical Notes
- Keep all changes within the IIFE pattern
- The game loop is in `animate()` — add your update functions there
- For particles, reuse/pool them (don't create/destroy every frame)
- Test that existing save data still loads correctly
- Keep performance in mind — this runs on phones too. Cap particle counts.
- Do NOT change any of the skin functions (buildFarmerSkin, buildNinjaSkin, buildSonicSkin)
- Do NOT change the shop or wardrobe systems (Agent 2 handles economy)
- Do NOT change profile/save system structure beyond adding new fields with safe defaults

## When Done
- Commit with: git commit --no-verify -m "Add growth stages, watering, day/night cycle, weather & ambient life"
- Then run: openclaw system event --text "Agent 1 done: Growth stages, watering, day/night, weather, ambient creatures all implemented" --mode now
