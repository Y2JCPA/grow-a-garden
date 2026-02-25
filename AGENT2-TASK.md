# Agent 2: Economy, Selling, Achievements, Pet Dog, World Decorations, Expandable Garden

## Context
You're working on "Grow a Garden" — a vanilla HTML/CSS/JS 3D browser game using Three.js. Kids ages 3-16 play this.
- Game files: `js/game.js` (~2600 lines), `js/data.js`, `index.html`, `style.css`
- Deployed to GitHub Pages at https://y2jcpa.github.io/grow-a-garden/
- Existing save data in localStorage MUST NOT break. New fields must have safe defaults.
- NO external dependencies beyond Three.js (loaded via CDN in index.html)
- All code is inside an IIFE in game.js

## ⚠️ IMPORTANT: Agent 1 is working on the same files simultaneously!
Agent 1 is adding: growth stages, watering, day/night cycle, weather, ambient creatures.
YOU should focus on: economy/selling, achievements, pet dog, world decorations, expandable garden.
To avoid merge conflicts:
- Work in NEW functions as much as possible
- Add your features to the END of existing functions where you must modify them
- Do NOT modify: buildPlantModel, updatePlantMeshes, animate loop timing, lighting, sky/fog colors
- For the animate loop, add your updates by calling new functions from animate()

## Features to Build

### 1. Selling Crops to Shlomo
Currently harvesting just adds items to inventory. Add selling:
- When near Shlomo and shop is open, show a "SELL" tab alongside the "BUY" tab
- Sell tab shows inventory items with their sell prices (from data.js `sellPrice` field)
- Clicking sell: removes 1 from inventory, adds coins, coin fly animation, toast "Sold Daisy for 5🪙"
- Add "Sell All" button per item type
- Shlomo should have occasional "bonus" — 1.5x price on a random seed type (changes daily)
- Show the bonus in shop: "🔥 HOT: Roses 1.5x today!"

### 2. Crop Rarity System  
In `data.js`, add a `rarity` field to each seed:
- **Common** (green): daisy, carrot, tulip, mushroom, wheat — normal prices
- **Uncommon** (blue): sunflower, tomato, blueberry, lavender, strawberry — 1.2x sell bonus
- **Rare** (purple): rose, pumpkin, cactus, orchid — 1.5x sell bonus  
- **Legendary** (gold): holiday seeds — 2x sell bonus
- Show rarity color on seed names in shop, inventory, and hotbar
- When harvesting rare/legendary, show a special particle burst effect
- Add a subtle colored border/glow to rare+ plants in the garden

### 3. Achievement System
Add achievements that unlock badges. Store in `gameState.achievements` (array of achievement IDs).
Achievements:
- 🌱 "First Sprout" — Plant your first seed
- 🌻 "Green Thumb" — Grow 10 plants to harvest
- 💰 "Entrepreneur" — Earn 500 coins total (track `totalCoinsEarned`)
- 🏆 "Master Gardener" — Grow 50 plants
- 💎 "Rare Find" — Grow a Rare or Legendary plant
- 🎭 "Fashion Forward" — Buy a skin from the wardrobe
- 📦 "Full Garden" — Plant something in all 16 plots at once
- 🌈 "Variety Pack" — Grow 8 different seed types
- 💵 "Millionaire" — Have 10,000 coins at once
- 🗺️ "Expansion" — Buy your first garden expansion

Show achievement popup (toast with confetti particles) when unlocked.
Add an achievements panel (📜 button in HUD) showing all achievements with locked/unlocked status.
Save achievements in gameState and persist to localStorage.

### 4. Pet Dog Companion
- Add a blocky dog (Minecraft-style) that follows the player around
- Dog wanders when player is still, runs to catch up when player moves
- Dog occasionally sits near plants and wags tail (simple rotation animation on tail block)
- Dog has a name: "Buddy" — shows floating label like Shlomo
- Dog barks (toast: "🐕 Woof!") randomly every 30-60 seconds
- Build with boxes: body, head, ears, legs, tail (all brown/tan, simple shapes)
- Dog stays in the garden area (doesn't wander too far)
- Player can pet the dog by pressing E when near → happy particle burst (hearts ❤️)

### 5. Expandable Garden
- Start with 4x4 (16 plots) as current
- Player can buy expansions from Shlomo:
  - "East Wing" — adds 8 more plots to the right (costs 500 coins)
  - "West Wing" — adds 8 more plots to the left (costs 500 coins)  
  - "Grand Garden" — adds 16 more plots in a second row (costs 2000 coins, requires both wings)
- Store `gardenExpansions: []` in gameState (array of expansion IDs bought)
- When expansion bought: dynamically add new plot meshes, extend gameState.plots array
- Add expansion options in Shlomo's shop under a "🏗️ EXPAND" tab
- New plots need their own soil meshes, positioned correctly adjacent to main garden

### 6. Decorative Items (Placeable)
- Add a decoration system: player can buy and place decorations
- Items: 
  - Stone Path (10 coins) — flat gray block on ground
  - Wooden Fence (15 coins) — small fence section  
  - Flower Pot (20 coins) — decorative pot (can't plant in it)
  - Garden Lamp (50 coins) — glows at night (small yellow point light)
  - Birdbath (75 coins) — small stone basin
- Buy from Shlomo "🎨 DECOR" tab
- Place mode: after buying, press P to enter placement mode
  - Show ghost preview of item at cursor/player position
  - Click/tap to place
  - ESC to cancel
  - Decorations snap to grid (1-unit grid)
- Store placed decorations in gameState: `decorations: [{type, x, z}]`
- Max 30 decorations total (performance)

## Technical Notes
- Keep all changes within the IIFE pattern
- Add new gameState fields with safe defaults in loadGame() 
- For selling: modify `openShop()` to add tabs, or create `openSellPanel()`
- Dog AI: simple follow behavior with lerp toward player position
- Test on mobile — all new buttons need touch support and 44px min size
- Keep performance in mind — phone-friendly particle counts
- Do NOT modify plant growth mechanics or sky/lighting (Agent 1's domain)
- Commit with --no-verify flag

## When Done  
- Commit with: git commit --no-verify -m "Add selling, rarity, achievements, pet dog, expandable garden & decorations"
- Then run: openclaw system event --text "Agent 2 done: Economy, achievements, pet dog, garden expansions, decorations all implemented" --mode now
