# 🌱 Grow a Garden 3D

A cozy, blocky (Minecraft-style) gardening game for kids that runs in any browser — desktop, tablet or phone.
Plant seeds, water them, harvest crops, sell them to Shlomo, level up, and grow your garden.

**Play:** https://y2jcpa.github.io/grow-a-garden/

## How to play
1. 🌱 Walk to a dirt patch and **plant** a seed (`E`, the big ✋ button, or just tap/click the plot)
2. 💧 **Water** it — well-watered plants grow 1.5× faster. Refill the can at the well
3. 🧺 **Harvest** when it sparkles
4. 💰 **Sell** crops to Shlomo, then buy better seeds, upgrades and new garden plots

Extras: ✨ Golden / 🌈 Rainbow crops (rare, worth 3×/6×), 💧 Wet crops after rain, 🌙 Moonlit crops at night,
♻️ plants that regrow, garden tasks, levels, a daily gift, achievements, outfits, and Buddy the dog who digs up treasure.

## Controls
| | Desktop | Touch |
|---|---|---|
| Move | `WASD` / arrows (`Shift` to run) | joystick (push all the way to run) |
| Do the obvious thing | `E` or click anything | ✋ button or tap anything |
| Water / potion | `Q` / `F` | 💧 / 🧪 |
| Look / zoom | drag / scroll | drag / pinch |
| Menus | `B` shop · `I` bag · `J` awards · `H` help · `M` music | buttons on the right |

## Code layout
No build step — plain HTML/CSS/JS with Three.js from a CDN.

| File | What's in it |
|---|---|
| `js/data.js` | Seeds, holidays, rarity, mutations, levels, upgrades, tutorial tasks |
| `js/voxel.js` | Pixel-art textures and `VoxelBatch` (merges many blocks into one draw call) |
| `js/plants.js` | A blocky model for every seed |
| `js/skins.js` | Player outfits (Farmer, Ninja, Sonic, Kakashi, Mando) |
| `js/audio.js` | Synthesized sound effects + gentle background music (no audio files) |
| `js/game.js` | World, gameplay, UI, saving |

Saves live in the browser's `localStorage` (one per gardener profile). Older saves are upgraded automatically.
