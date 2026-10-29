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
| Mitzvot book | `L` | 📜 button |

## Mitzvot of the Garden 📜
The gardens follow the Torah's farming mitzvot in a kid-sized way. Every day in the game is one **garden year**, shared by everyone.

| Mitzvah | In the game |
|---|---|
| 💙 **Peah** (פאה) | Each garden has a roped corner. What ripens there is left for the poor, and **Rut** comes to gather it |
| 🌾 **Leket** (לקט) | Sometimes a fruit falls while you harvest. Leave it for Rut |
| 🧺 **Shichecha** (שכחה) | Leave the garden with 1–2 ripe plants forgotten next to what you picked, and they go to the poor (3 or more are not "forgotten", Mishnah Peah 6:5) |
| 🚧 **Kilayim** (כלאים) | Different kinds of plants need space between them; vines need more. Trees, flowers and mushrooms are exempt |
| 🌱 **Orlah** (ערלה) | A new fruit tree's fruit can't be picked for 3 years. Trees that were already planted are exempt (Mishnah Orlah 1:2) |
| 🏛️ **Neta Revai** (נטע רבעי) | 4th-year fruit is brought to the Kohen instead of sold |
| 🎀 **Bikkurim** (ביכורים) | Tie a reed around the first ripe fruit of each of the **Seven Species** and bring it to the Kohen |
| 🪙 **Terumah & Ma'aser** | Every sale gives 1/50 to the Kohen and 1/10 to the Levi, and a blessing makes it up to you |
| 🌿 **Shemitah** (שמיטה) | Year 7: no planting, and picked fruit is Shevi'it, for eating, not selling. Year 6 harvests are doubled (Vayikra 25:21) |
| 🌳 **Bal Tashchit** | Digging up a fruit tree asks you to think twice |

Keeping a mitzvah earns ⭐ stars, blessings in Sheckles, and badges. The 📜 book shows each mitzvah's sources in Hebrew and English, fetched from [Sefaria](https://www.sefaria.org) (Tanakh: JPS 1917, public domain; Mishnah: Mishnah Yomit by Dr. Joshua Kulp, CC-BY). The seed shop now has the Seven Species: wheat, barley, grapevine, fig, pomegranate, olive and date palm.

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
| `js/mitzvot.js` | The garden mitzvot, Seven Species, and their Sefaria source texts |
| `js/net.js` | Multiplayer: family worlds over Firebase |
| `js/game.js` | World, gameplay, UI, saving |

Saves live in the browser's `localStorage` (one per gardener). Saves from older versions are converted automatically: coins become Sheckles, crops go into the backpack, and plants move to the new garden.
