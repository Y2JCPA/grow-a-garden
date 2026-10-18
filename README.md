# 🌱 Grow a Garden 3D

A blocky 3D gardening game for kids, modeled on the Roblox game **Grow a Garden**. It runs in any browser (desktop, tablet or phone) with nothing to install.

**Play:** https://y2jcpa.github.io/grow-a-garden/

## How it plays (like Roblox Grow a Garden)
- **Market street** in the middle: 🌱 Seed Shop (Shlomo), 💰 Sell stand (Steven), ⚙️ Gear Shop and 🥚 Pet Eggs. The top bar teleports you: **Seeds · Sell · Garden · Gear · Pets**.
- **Your garden** is a big dirt patch; plant anywhere. Other gardeners on the same device are your neighbors, and their gardens show up next to yours, with a Sheckles leaderboard.
- **Shops restock every 5 minutes** with limited stock. Rarer seeds show up less often: Common → Uncommon → Rare → Legendary → Mythical → Divine → Prismatic (Carrot … Beanstalk).
- **Multi-harvest plants** (strawberry, apple, coconut, grape, beanstalk…) keep growing new fruit. Every fruit has its own **weight (kg)**, and heavier fruit is worth more.
- **Mutations**: ✨ Gold 20x, 🌈 Rainbow 50x, 💧 Wet, ❄️ Chilled, 🧊 Frozen, 🌙 Moonlit, 🐝 Pollinated, 🩸 Bloodlit, ⚡ Shocked 100x, 🌠 Celestial 120x.
- **Weather events**: Rain, Thunderstorm (lightning), Frost, Blood Moon, Meteor Shower.
- **Gear**: Watering Can, Trowel (move plants), Basic/Advanced/Godly/Master Sprinklers, Lightning Rod, Shovel.
- **Pet eggs** hatch in your garden. Up to 3 equipped pets wander your garden and help: digging up seeds, growing plants faster, turning fruit Gold, and more. Buddy the dog is everyone's first pet.
- Plus tasks, a daily gift, badges, and outfits (including the classic Roblox Noob).

## Controls
| | Desktop | Touch |
|---|---|---|
| Move | `WASD` / arrows (`Shift` run, `Space` jump) | joystick |
| Plant / harvest / use | `E`, or click the dirt / a plant | tap the dirt / a plant, or the ✋ button |
| Hold an item | `1`–`9` (`0` = empty hands) | tap the hotbar |
| Teleport | top bar, `G` = garden | top bar |
| Menus | `B` shop · `I` backpack · `P` pets · `J` badges · `H` help · `M` music | buttons on the right |
| Emotes (family world) | `T` | 👋 button |

## Playing together (family worlds)
On the start screen, tap **🌍 Play together with family** and type a secret code (8+ letters/numbers). Everyone who uses the same code shares one world:
- up to 6 gardeners, each with their own garden around the market,
- you see each other walk around and see each other's gardens grow,
- kid-safe preset emotes only (no free chat),
- your save is kept in the cloud too, so you can play the same gardener from another device.

It uses Firebase Realtime Database (free Spark plan) with anonymous sign-in; the site itself stays on GitHub Pages. If Firebase can't be reached, the game simply plays on this device.

## Code layout
There's no build step: plain HTML/CSS/JS, with Three.js loaded from a CDN.

| File | What's in it |
|---|---|
| `js/data.js` | Seeds, rarities, mutations, gear, pets, eggs, weather, holidays |
| `js/voxel.js` | Pixel textures and `VoxelBatch` (merges many blocks into one draw call) |
| `js/plants.js` | A model for every seed, plus fruit attachment points |
| `js/pets.js` | Blocky pet models |
| `js/skins.js` | Player outfits |
| `js/audio.js` | Synthesized sound effects and music (no audio files) |
| `js/net.js` | Multiplayer: family worlds over Firebase |
| `js/game.js` | World, gameplay, UI, saving |

Saves live in the browser's `localStorage` (one per gardener). Saves from older versions are converted automatically: coins become Sheckles, crops go into the backpack, and plants move to the new garden.
