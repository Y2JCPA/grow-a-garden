/* ============================================
   GROW A GARDEN 3D — Main Game (Three.js)
   Plays like the Roblox game "Grow a Garden": plant anywhere in your
   garden, collect fruit with weights and mutations, sell to Steven,
   buy from restocking shops, hatch pet eggs, survive weather events.
   Depends on: three.js, data.js, voxel.js, plants.js, pets.js, skins.js, audio.js
   ============================================ */
(function() {
'use strict';
applyDataLanguage();

// ─── Constants ───
const WORLD_X = 62, WORLD_Z = 41;    // walkable half-extents
const PLAYER_HEIGHT = 1.7;
const WALK_SPEED = 6;
const RUN_MULT = 1.6;
const JUMP_FORCE = 7.5;
const GRAVITY = 20;
const REACH = 1.9;                    // how close you must be to a plant
const CAM_MIN = 4, CAM_MAX = 22;
const DAY_LENGTH = 420;
const DIRT_Y = 0.12;                  // top of the garden dirt
const CLASSIC_SCALE = 1.3;            // older seed models are drawn a bit bigger
const MAX_FRUITS = 200;               // backpack size (like Roblox)
const MAX_PLANTS = 180;
const MAX_EGGS_PLACED = 3;
const MAX_PETS_EQUIPPED = 3;
const SHOP_RESTOCK = 300;             // seconds between seed / gear restocks
const EGG_RESTOCK = 600;
const PROFILES_KEY = 'garden3d_profiles';
const SAVE_PREFIX = 'garden3d_save_';
const MAX_PROFILES = 10;
const AUTO_SAVE_SEC = 10;
const SAVE_VERSION = 4;

// ─── Map: a market street in the middle, three gardens on each side ───
const GARDEN_D = 30;
const GARDENS = [
  { x: 0, z: -23, dir: -1 },   // yours (south, facing the market)
  { x: -42, z: -23, dir: -1 }, { x: 42, z: -23, dir: -1 },
  { x: -42, z: 23, dir: 1 }, { x: 0, z: 23, dir: 1 }, { x: 42, z: 23, dir: 1 },
];
// Garden centers before the gardens got bigger (save version 3 and older snapshots)
const OLD_GARDENS = [{ x: 0, z: -20 }, { x: -32, z: -20 }, { x: 32, z: -20 }, { x: -32, z: 20 }, { x: 0, z: 20 }, { x: 32, z: 20 }];
let MY_GARDEN = GARDENS[0];   // your garden — in a family world each gardener gets their own slot
let mySlot = 0;
let netMode = false;            // playing in an online family world
// Two dirt beds per garden with a path between them (local coords)
const BED_X0 = 1.6, BED_X1 = 16.6, BED_Z = 13.4;
const STALLS = {
  seeds: { x: -15, label: T`🌱 Seeds`, npc: 'Shlomo', colors: [0x2E7D32, 0xFFFFFF], shirt: 0xFFF9C4, apron: 0x388E3C, hat: 'straw' },
  sell:  { x: -5,  label: T`💰 Sell`,  npc: 'Steven', colors: [0xF9A825, 0xFFFFFF], shirt: 0x43A047, apron: 0x795548, hat: 'cap' },
  gear:  { x: 5,   label: T`⚙️ Gear`,  npc: 'Gear Shop', colors: [0x1565C0, 0xFFFFFF], shirt: 0x90CAF9, apron: 0x1565C0, hat: 'cap' },
  pets:  { x: 15,  label: T`🥚 Pet Eggs`, npc: 'Pet Shop', colors: [0x8E24AA, 0xFFFFFF], shirt: 0xF8BBD0, apron: 0x8E24AA, hat: 'straw' },
  temple: { x: 26, label: T`🏛️ Kohen`, npc: 'Kohen', colors: [0x1E88E5, 0xFFFFFF], shirt: 0xFFFFFF, apron: 0xFFFFFF, hat: 'cap' },
};
const STALL_Z = 1.2;           // stall center z; customers stand around z = -2.5
const STALL_REACH = 3.2;
const TELEPORTS = {
  seeds: { x: STALLS.seeds.x, z: -3.2, yaw: Math.PI },
  sell:  { x: STALLS.sell.x,  z: -3.2, yaw: Math.PI },
  gear:  { x: STALLS.gear.x,  z: -3.2, yaw: Math.PI },
  pets:  { x: STALLS.pets.x,  z: -3.2, yaw: Math.PI },
  temple: { x: STALLS.temple.x, z: -3.2, yaw: Math.PI },
  get garden() { const g = MY_GARDEN; return { x: g.x, z: g.z - g.dir * (GARDEN_D / 2 - 2), yaw: g.dir < 0 ? 0 : Math.PI }; },
};

// ─── Game State (saved per profile) ───
let uid = Date.now() % 100000;
function newId() { return (++uid).toString(36) + Math.floor(Math.random() * 1296).toString(36); }
function freshState() {
  return {
    version: SAVE_VERSION,
    slot: 0,                 // which garden the coordinates below belong to
    sheckles: 50,
    seeds: { carrot: 3, strawberry: 1 },
    gear: { shovel: 1 },
    eggs: {},
    fruits: [],              // backpack: {s, kg, m: [mutations], fav}
    plants: [],              // {id, s, x, z, r, age, grow, kg, m, fruits[], water}
    placed: [],              // sprinklers / lightning rods: {id, gear, x, z, left, uses}
    placedEggs: [],          // {id, egg, x, z, left, total}
    pets: [{ id: 'buddy', type: 'dog', name: T('Buddy'), age: 0 }],
    equipped: ['buddy'],
    selected: 'seed:carrot',
    shop: { slot: -1, seeds: {}, gearSlot: -1, gear: {}, eggSlot: -1, eggs: [] },
    unlockedSkins: ['farmer', 'noob'],
    achievements: [],
    tasks: [],
    tutorialStep: 0,
    tasksDone: 0,
    lastDaily: '',
    dailyStreak: 0,
    totalHarvested: 0,
    totalEarned: 0,
    harvestedTypes: [],
    petsHatched: [],
    perks: {},
    gifts: [],               // Leket lying on the ground for the poor: {id, s, kg, m, x, z}
    mz: freshMitzvot(),      // mitzvah stars and counts
  };
}
function freshMitzvot() {
  return { stars: 0, peah: 0, leket: 0, shich: 0, kil: 0, orlah: 0, revai: 0, bik: [], maaser: 0, shemitah: 0, eaten: 0, terumahTotal: 0, maaserTotal: 0, restYear: null, tips: {} };
}
let gameState = freshState();
let activeProfileId = null;
function getSaveKey() { return SAVE_PREFIX + activeProfileId; }

// ─── Runtime state ───
let scene, camera, renderer, clock;
let sunLight, hemiLight, ambientLight;
let skyMat, sunMesh, moonMesh, stars;
let started = false;
let dayTime = 0.3, nightFactor = 0;
let weather = null;                  // { id, left }
let moonlitTimer = 20, moonlitCount = 0;
let lightningTimer = 8, meteorTimer = 6;
let autoSaveTimer = 0;
let isMobile = false;

const playerPos = new THREE.Vector3(TELEPORTS.garden.x, 0, TELEPORTS.garden.z + 1);
const playerVel = new THREE.Vector3();
let playerY = 0, playerVY = 0, onGround = true;
let playerModel = null, playerFacing = Math.PI, walkCycle = 0;
let yaw = 0, pitch = 0.45, camDist = 10;
const camPos = new THREE.Vector3(0, 10, 0);
const keys = { f: false, b: false, l: false, r: false, run: false };
const touchMove = { x: 0, y: 0 };
let moveTarget = null;
const colliders = [];
let focus = null;
let carrying = null;                 // plant picked up with the trowel
let shovelArmed = null;              // {plantId, until} — dig needs a second press

// ─── DOM helpers ───
const $ = sel => document.querySelector(sel);
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
const textCache = new WeakMap();
function setText(el, txt) { if (el && textCache.get(el) !== txt) { textCache.set(el, txt); el.textContent = txt; } }
function setHTML(el, html) { if (el && textCache.get(el) !== html) { textCache.set(el, html); el.innerHTML = html; } }
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function todayStr(offsetDays) {
  const d = new Date(Date.now() + (offsetDays || 0) * 86400000);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function showToast(icon, text) {
  const box = $('#toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${text}</span>`;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('exiting'); setTimeout(() => t.remove(), 250); }, 2200);
}

const projVec = new THREE.Vector3();
function worldToScreen(x, y, z) {
  projVec.set(x, y, z).project(camera);
  return { x: (projVec.x + 1) / 2 * window.innerWidth, y: (1 - projVec.y) / 2 * window.innerHeight, visible: projVec.z < 1 };
}

// Rising "+12 🪙" style text at a 3D position
function floatText(x, y, z, text, color) {
  if (!camera) return;
  const p = worldToScreen(x, y, z);
  if (!p.visible) return;
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  if (color) el.style.color = color;
  el.style.left = p.x + 'px';
  el.style.top = p.y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function bigBanner(title, subtitle) {
  const el = document.createElement('div');
  el.className = 'big-banner';
  el.innerHTML = `<div class="bb-title">${title}</div>${subtitle ? `<div class="bb-sub">${subtitle}</div>` : ''}`;
  document.body.appendChild(el);
  confetti(40);
  setTimeout(() => el.classList.add('exiting'), 2600);
  setTimeout(() => el.remove(), 3100);
}

function confetti(count) {
  const colors = ['#FFD54F', '#FF8A80', '#80D8FF', '#B9F6CA', '#EA80FC', '#FFFFFF'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = (Math.random() * 100) + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * 0.4) + 's';
    c.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
    c.style.setProperty('--drift', ((Math.random() - 0.5) * 200) + 'px');
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3400);
  }
}

function coinFly(fromX, fromY, n) {
  const target = $('#money').getBoundingClientRect();
  for (let i = 0; i < Math.min(n || 4, 8); i++) {
    const c = document.createElement('span');
    c.className = 'coin-fly';
    c.textContent = '🪙';
    c.style.left = fromX + 'px';
    c.style.top = fromY + 'px';
    c.style.setProperty('--tx', (target.left + target.width / 2 - fromX) + 'px');
    c.style.setProperty('--ty', (target.top + target.height / 2 - fromY) + 'px');
    c.style.animationDelay = (i * 0.06) + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1100 + i * 60);
  }
  setTimeout(() => {
    const box = $('#money');
    box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
  }, 650);
}

// ─── Renderer / Scene ───
function initRenderer() {
  isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  renderer = new THREE.WebGLRenderer({ antialias: !isMobile || window.devicePixelRatio < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe3ff, 45, 160);
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
  clock = new THREE.Clock();

  const fitFov = () => { camera.fov = camera.aspect < 0.8 ? 72 : 55; camera.updateProjectionMatrix(); };
  fitFov();
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    fitFov();
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Adaptive resolution: if frames get slow, render fewer pixels
const perf = { acc: 0, frames: 0, maxRatio: 2, ratio: 2, shadowsOff: false };
function adaptQuality(dt) {
  perf.acc += dt; perf.frames++;
  if (perf.acc < 2) return;
  const avg = perf.acc / perf.frames;
  perf.acc = 0; perf.frames = 0;
  const cur = renderer.getPixelRatio();
  if (avg > 1 / 40 && cur > 0.75) {
    renderer.setPixelRatio(Math.max(0.75, cur - 0.25));
  } else if (avg > 1 / 30 && !perf.shadowsOff) {
    perf.shadowsOff = true;
    sunLight.castShadow = false;
  } else if (avg < 1 / 58 && cur < perf.maxRatio) {
    renderer.setPixelRatio(Math.min(perf.maxRatio, cur + 0.25));
  }
}

// ─── Sky, sun, moon, stars ───
function initSky() {
  skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4aa3ff) },
      horizonColor: { value: new THREE.Color(0xbfe3ff) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunGlow: { value: new THREE.Color(0xfff2c0) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunGlow; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        float t = pow(max(h, 0.0), 0.55);
        vec3 col = mix(horizonColor, topColor, t);
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunGlow * (pow(s, 24.0) * 0.6 + pow(s, 4.0) * 0.15);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 12), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.name = 'sky';
  scene.add(sky);

  sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false, transparent: true }));
  moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false, transparent: true }));
  scene.add(sunMesh, moonMesh);

  const starCount = isMobile ? 300 : 600;
  const pos = new Float32Array(starCount * 3);
  const r = seededRandom(99);
  for (let i = 0; i < starCount; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95);
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * 400;
    pos[i * 3 + 1] = Math.cos(ph) * 400;
    pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 400;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false;
  scene.add(stars);
}

function initLighting() {
  hemiLight = new THREE.HemisphereLight(0xcfe8ff, 0x5a7a3a, 1.1);
  scene.add(hemiLight);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sunLight.castShadow = true;
  const sm = isMobile ? 1024 : 2048;
  sunLight.shadow.mapSize.set(sm, sm);
  const sc = sunLight.shadow.camera;
  sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 120;
  sunLight.shadow.bias = -0.0008;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight, sunLight.target);

}


// ─── Shared materials ───
const MATS = {};
function initMaterials() {
  // Roblox "SmoothPlastic" look: shiny Phong shading + stud texture
  const studs = Tex.get('studs');
  const plastic = o => new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, map: studs, shininess: 30, specular: 0x262626 }, o || {}));
  MATS.voxel = plastic();
  MATS.plant = plastic({ shininess: 45, specular: 0x333333 });
  MATS.dirt = plastic({ shininess: 12, specular: 0x111111 });
  MATS.path = plastic({ map: Tex.get('softStuds'), shininess: 15, specular: 0x151515 });
  MATS.fruit = new THREE.MeshPhongMaterial({ color: 0xffffff, map: studs, shininess: 60, specular: 0x444444 });
  MATS.fruitGlow = new THREE.MeshBasicMaterial({ color: 0xffffff });
  MATS.ghost = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
  MATS.ring = new THREE.MeshBasicMaterial({ color: 0x4FC3F7, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  MATS.water = new THREE.MeshPhongMaterial({ map: Tex.get('water'), transparent: true, opacity: 0.88, shininess: 90, specular: 0x666666 });
  MATS.lamp = new THREE.MeshPhongMaterial({ vertexColors: true, color: 0xfff3c4, emissive: 0x000000 });
  // single-harvest crops are tinted by their strongest mutation
  MATS.mut = {};
  Object.entries(MUTATIONS).forEach(([k, m]) => {
    MATS.mut[k] = plastic({ shininess: 70, specular: 0x555555, color: m.tint, emissive: m.glow ? new THREE.Color(m.tint).multiplyScalar(0.35) : 0x000000 });
  });
  MATS.mut.gold.emissive.setHex(0x5a3a00);
}

function voxelMesh(batch, mat, opts) {
  const m = new THREE.Mesh(batch.build(), mat || MATS.voxel);
  m.castShadow = !(opts && opts.noCast);
  m.receiveShadow = true;
  return m;
}

// ─── World ───
function addCollider(x, z, r) { colliders.push({ x, z, r }); }

function buildGardenGround(g, b, dirt) {
  // two dirt beds with a path between them, wooden edging all around
  [-1, 1].forEach(side => {
    const cx = g.x + side * (BED_X0 + BED_X1) / 2, w = BED_X1 - BED_X0;
    dirt.box(w, DIRT_Y + 0.05, BED_Z * 2, 0xC2713F, cx, (DIRT_Y - 0.05) / 2, g.z);
    b.box(w + 0.6, 0.3, 0.3, 0x7A4A2A, cx, 0.15, g.z - BED_Z - 0.15);
    b.box(w + 0.6, 0.3, 0.3, 0x7A4A2A, cx, 0.15, g.z + BED_Z + 0.15);
    b.box(0.3, 0.3, BED_Z * 2, 0x7A4A2A, cx - w / 2 - 0.15, 0.15, g.z);
    b.box(0.3, 0.3, BED_Z * 2, 0x7A4A2A, cx + w / 2 + 0.15, 0.15, g.z);
  });
  // Wooden rail fence around the garden, open at the front (toward the market)
  const fx = BED_X1 + 1.2, fz = BED_Z + 1.2;
  const front = -g.dir; // +1 → the market is on the +z side
  const fence = 0x8B5A2B, post = 0x6B4423;
  const rail = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    [0.45, 0.85].forEach(h => b.box(len, 0.16, 0.14, fence, (x1 + x2) / 2, h, (z1 + z2) / 2, 0, -ang, 0));
    for (let t = 0; t <= len + 0.01; t += 2.4) b.box(0.26, 1.15, 0.26, post, x1 + Math.cos(ang) * t, 0.57, z1 + Math.sin(ang) * t);
  };
  rail(g.x - fx, g.z - front * fz, g.x + fx, g.z - front * fz);            // back
  rail(g.x - fx, g.z - fz, g.x - fx, g.z + fz);                            // left
  rail(g.x + fx, g.z - fz, g.x + fx, g.z + fz);                            // right
  rail(g.x - fx, g.z + front * fz, g.x - 2.2, g.z + front * fz);           // front, left of gate
  rail(g.x + 2.2, g.z + front * fz, g.x + fx, g.z + front * fz);           // front, right of gate
}

function buildWorld() {
  const grass = Tex.get('studs').clone();
  grass.needsUpdate = true;
  grass.repeat.set(520, 400); // one stud every half unit, like a Roblox baseplate
  MATS.ground = new THREE.MeshPhongMaterial({ map: grass, color: 0xffffff, shininess: 14, specular: 0x111111 });
  MATS.groundBase = new THREE.Color(0x5BD645);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), MATS.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const rand = seededRandom(4321);
  const statics = new VoxelBatch(2.5, 0.08);
  const decor = new VoxelBatch(3);
  const paths = new VoxelBatch(2, 0);
  const dirt = new VoxelBatch(2, 0.05);
  const lamps = new VoxelBatch(4);

  // Market street + paths into each garden
  paths.box(WORLD_X * 2, 0.04, 11, 0xB8B4AC, 0, 0.02, 0);
  GARDENS.forEach(g => {
    paths.box(3, 0.04, GARDEN_D + 2, 0xC9B38C, g.x, 0.02, g.z);
    buildGardenGround(g, statics, dirt);
    // Peah corner: a blue-and-white rope around the corner left for the poor
    peahRects(g).forEach(pr => {
      [[pr.x1, pr.z1], [pr.x1, pr.z2], [pr.x2, pr.z1], [pr.x2, pr.z2]].forEach(([x, z]) => statics.box(0.12, 0.55, 0.12, 0xECEFF1, x, 0.28, z));
      [[pr.x1, pr.z1, pr.x2, pr.z1], [pr.x1, pr.z2, pr.x2, pr.z2], [pr.x1, pr.z1, pr.x1, pr.z2], [pr.x2, pr.z1, pr.x2, pr.z2]].forEach(([x1, z1, x2, z2]) => {
        const len = Math.hypot(x2 - x1, z2 - z1), along = x1 === x2;
        for (let t = 0; t < len; t += 0.5) {
          const c = Math.floor(t / 0.5) % 2 ? 0xFFFFFF : 0x1E88E5;
          decor.box(along ? 0.06 : 0.5, 0.06, along ? 0.5 : 0.06, c, along ? x1 : x1 + t + 0.25, 0.45, along ? z1 + t + 0.25 : z1);
        }
      });
      const ps = textSprite(T`💙 Peah פאה`, '#1565C0', true);
      ps.position.set((pr.x1 + pr.x2) / 2, 1.05, pr.back);
      scene.add(ps);
    });
  });
  // curbs along the street
  for (let x = -WORLD_X; x < WORLD_X; x += 4) {
    [-5.6, 5.6].forEach(z => decor.box(3.9, 0.12, 0.25, 0xBDBDBD, x + 2, 0.06, z));
  }
  // Street lamps
  [-56, -40, -28, -9, 9, 30, 40, 56].forEach(x => {
    [-6.2, 6.2].forEach(z => {
      statics.box(0.18, 3, 0.18, 0x37474F, x, 1.5, z);
      statics.box(0.5, 0.1, 0.5, 0x263238, x, 3.05, z);
      lamps.box(0.36, 0.42, 0.36, 0xffffff, x, 2.78, z);
      addCollider(x, z, 0.3);
    });
  });
  // Flower boxes between gardens
  [-21, 21].forEach(x => [-23, 23].forEach(z => {
    for (let k = -3; k <= 3; k++) {
      statics.box(1.2, 0.5, 1.2, 0x8D6E63, x, 0.25, z + k * 4);
      const c = [0xFF80AB, 0xFFEB3B, 0xB388FF, 0xFF7043][(k + 4) % 4];
      decor.box(0.9, 0.25, 0.9, 0x66BB6A, x, 0.6, z + k * 4);
      decor.box(0.25, 0.2, 0.25, c, x - 0.2, 0.8, z + k * 4 + 0.2);
      decor.box(0.25, 0.2, 0.25, c, x + 0.25, 0.8, z + k * 4 - 0.15);
    }
  }));

  // Fountain in the middle of the market
  const fz = 2.5;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    statics.box(0.9, 0.55, 0.45, 0xB0BEC5, Math.cos(a) * 1.7, 0.27, fz + Math.sin(a) * 1.7, 0, -a, 0);
  }
  statics.box(0.5, 1.6, 0.5, 0xCFD8DC, 0, 0.8, fz);
  statics.box(1.2, 0.2, 1.2, 0xB0BEC5, 0, 1.6, fz);
  statics.box(0.3, 0.6, 0.3, 0xCFD8DC, 0, 1.95, fz);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.1, 20), MATS.water);
  pool.position.set(0, 0.4, fz);
  scene.add(pool);
  addCollider(0, fz, 2.1);

  // Big welcome sign over the street
  [-9.5, 9.5].forEach(x => statics.box(0.35, 5.2, 0.35, 0x6D4C41, x, 2.6, 6.3));
  statics.box(19.4, 0.3, 0.3, 0x6D4C41, 0, 5.25, 6.3);
  statics.box(7.5, 1.3, 0.2, 0xFFF8E1, 0, 6.05, 6.3);
  const title = textSprite(T`🌱 Grow a Garden 🌱`, '#2E7D32', true);
  title.position.set(0, 6.05, 6.15);
  title.scale.multiplyScalar(2.1);
  scene.add(title);

  // Trees: a forest ring around the map + a few between the gardens
  const treeTypes = ['oak', 'oak', 'pine', 'birch', 'apple', 'blossom'];
  for (let i = 0; i < 220; i++) {
    let x, z;
    if (rand() < 0.5) { x = (rand() - 0.5) * 2 * (WORLD_X + 22); z = (rand() > 0.5 ? 1 : -1) * (WORLD_Z + 3 + rand() * 25); }
    else { z = (rand() - 0.5) * 2 * (WORLD_Z + 22); x = (rand() > 0.5 ? 1 : -1) * (WORLD_X + 3 + rand() * 25); }
    buildTree(statics, x, z, treeTypes[Math.floor(rand() * treeTypes.length)], rand);
  }
  [[-60, -8], [60, -8], [-60, 8], [60, 8], [-21, -38], [21, -38], [-21, 38], [21, 38]].forEach(([x, z]) => {
    buildTree(statics, x, z, treeTypes[Math.floor(rand() * treeTypes.length)], rand);
    addCollider(x, z, 0.8);
  });
  // Grass tufts & wildflowers outside the gardens
  const flowerColors = [0xFFEB3B, 0xFF80AB, 0xFFFFFF, 0xB388FF, 0xFF7043];
  for (let i = 0; i < 650; i++) {
    const x = (rand() - 0.5) * 2 * WORLD_X, z = (rand() - 0.5) * 2 * WORLD_Z;
    if (Math.abs(z) < 7) continue;
    if (GARDENS.some(g => Math.abs(x - g.x) < BED_X1 + 0.6 && Math.abs(z - g.z) < BED_Z + 0.6)) continue;
    if (rand() < 0.65) {
      const c = rand() > 0.5 ? 0x7CB342 : 0x8BC34A;
      decor.box(0.08, 0.32, 0.08, c, x, 0.16, z); decor.box(0.08, 0.24, 0.08, c, x + 0.12, 0.12, z + 0.05);
    } else {
      decor.box(0.05, 0.28, 0.05, 0x558B2F, x, 0.14, z);
      decor.box(0.2, 0.1, 0.2, flowerColors[Math.floor(rand() * flowerColors.length)], x, 0.3, z);
    }
  }

  scene.add(voxelMesh(statics));
  scene.add(voxelMesh(decor, MATS.voxel, { noCast: true }));
  scene.add(voxelMesh(paths, MATS.path, { noCast: true }));
  const dirtMesh = voxelMesh(dirt, MATS.dirt, { noCast: true });
  scene.add(dirtMesh);
  scene.add(new THREE.Mesh(lamps.build(), MATS.lamp));
  buildClouds(rand);
  Object.entries(STALLS).forEach(([id, def]) => buildStall(id, def));
}

// ─── Market stalls with their shopkeepers ───
const stallModels = {};
let eggDisplay = null;
function buildVendor(def) {
  const v = new THREE.Group();
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const part = (w, h, d, c, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z); m.castShadow = true; (parent || v).add(m); return m;
  };
  const skin = def.npc === 'Steven' ? 0xF1C27D : 0xC8956C;
  const head = new THREE.Group(); head.position.set(0, 1.55, 0); v.add(head);
  part(0.5, 0.5, 0.5, skin, 0, 0, 0, head);
  part(0.08, 0.1, 0.05, 0x222222, -0.12, 0.04, 0.25, head);
  part(0.08, 0.1, 0.05, 0x222222, 0.12, 0.04, 0.25, head);
  part(0.22, 0.05, 0.05, 0x8B4513, 0, -0.12, 0.25, head);
  if (def.npc === 'Shlomo' || def.npc === 'Kohen') part(0.42, 0.14, 0.06, def.npc === 'Kohen' ? 0x9E9E9E : 0x5D4037, 0, -0.2, 0.24, head);
  if (def.npc === 'Kohen') part(0.52, 0.12, 0.34, 0x42A5F5, 0, 1.12, 0);   // blue sash
  if (def.hat === 'straw') { part(0.9, 0.06, 0.9, 0xF9A825, 0, 0.27, 0, head); part(0.5, 0.3, 0.5, 0xF9A825, 0, 0.43, 0, head); part(0.52, 0.08, 0.52, def.apron, 0, 0.32, 0, head); }
  else { part(0.54, 0.18, 0.54, def.apron, 0, 0.32, 0, head); part(0.5, 0.06, 0.3, def.apron, 0, 0.25, 0.3, head); }
  part(0.5, 0.6, 0.3, def.shirt, 0, 1.0, 0);
  part(0.4, 0.5, 0.05, def.apron, 0, 0.95, 0.18);
  const armL = new THREE.Group(); armL.position.set(-0.35, 1.25, 0); v.add(armL);
  part(0.2, 0.55, 0.2, def.shirt, 0, -0.25, 0, armL); part(0.18, 0.15, 0.18, skin, 0, -0.58, 0, armL);
  const armR = new THREE.Group(); armR.position.set(0.35, 1.25, 0); v.add(armR);
  part(0.2, 0.55, 0.2, def.shirt, 0, -0.25, 0, armR); part(0.18, 0.15, 0.18, skin, 0, -0.58, 0, armR);
  part(0.22, 0.5, 0.25, 0x37474F, -0.13, 0.45, 0);
  part(0.22, 0.5, 0.25, 0x37474F, 0.13, 0.45, 0);
  v.userData = { head, armL, armR };
  roundify(v);
  return v;
}

function buildStall(id, def) {
  const g = new THREE.Group();
  const b = new VoxelBatch(4);
  const [c1, c2] = def.colors;
  b.box(3.4, 0.15, 1.0, 0x5D4037, 0, 1.0, 1.0);
  b.box(3.2, 0.9, 0.12, 0x8D6E63, 0, 0.5, 1.45);
  [[-1.6, 0.55], [1.6, 0.55], [-1.6, 1.45], [1.6, 1.45]].forEach(([x, z]) => b.box(0.15, 1.0, 0.15, 0x6D4C41, x, 0.5, z));
  [[-1.7, -0.6], [1.7, -0.6], [-1.7, 1.55], [1.7, 1.55]].forEach(([x, z]) => b.box(0.14, 2.7, 0.14, 0x8D6E63, x, 1.35, z));
  for (let i = 0; i < 7; i++) b.box(0.52, 0.12, 2.7, i % 2 ? c2 : c1, -1.56 + i * 0.52, 2.75, 0.45, 0.12, 0, 0);
  b.box(3.7, 0.3, 0.08, c1, 0, 2.55, 1.82);
  b.box(3.5, 2.3, 0.12, 0xBCAAA4, 0, 1.15, -0.65);
  b.box(2.8, 0.75, 0.1, 0xFFF8E1, 0, 3.3, 0.45);
  if (id === 'seeds') {
    [[0xFFD600, -1.1], [0xE91E63, -0.4], [0xFF7043, 0.4], [0x7E57C2, 1.1]].forEach(([c, x]) => { b.box(0.4, 0.32, 0.32, 0xD7CCC8, x, 1.24, 1.05); b.box(0.34, 0.08, 0.26, c, x, 1.43, 1.05); });
  } else if (id === 'sell') {
    b.box(0.7, 0.08, 0.5, 0xB0BEC5, -0.9, 1.12, 1.0); b.box(0.06, 0.4, 0.06, 0x78909C, -0.9, 1.3, 1.0); b.box(0.5, 0.05, 0.3, 0xB0BEC5, -0.9, 1.5, 1.0);
    [[0xE53935, 0.3], [0xFFD54F, 0.7], [0x43A047, 1.1]].forEach(([c, x]) => { b.box(0.38, 0.22, 0.38, 0xA1887F, x, 1.18, 1.0); b.box(0.3, 0.12, 0.3, c, x, 1.32, 1.0); });
    b.box(0.5, 0.5, 0.1, 0xFFD54F, 1.0, 2.1, 1.5);
  } else if (id === 'gear') {
    b.box(0.4, 0.3, 0.25, 0x4FC3F7, -1.0, 1.24, 1.0); b.box(0.25, 0.06, 0.06, 0x4FC3F7, -0.72, 1.32, 1.0);
    b.box(0.2, 0.5, 0.2, 0x90A4AE, -0.2, 1.33, 1.0); b.box(0.5, 0.06, 0.1, 0x546E7A, -0.2, 1.6, 1.0);
    b.box(0.08, 0.5, 0.08, 0x8D6E63, 0.6, 1.33, 1.0); b.box(0.25, 0.25, 0.06, 0x9E9E9E, 0.6, 1.62, 1.0);
    b.box(0.06, 0.8, 0.06, 0xFFD54F, 1.2, 1.5, 1.0);
  } else if (id === 'temple') {
    // baskets of first fruits and a little golden menorah
    [[-1.0, 0xC62828], [-0.35, 0x6A1B9A], [0.3, 0xE8B83A]].forEach(([x, c]) => { b.box(0.5, 0.24, 0.4, 0xA1887F, x, 1.2, 1.0); b.box(0.4, 0.1, 0.3, c, x, 1.36, 1.0); });
    b.box(0.08, 0.5, 0.08, 0xFFC107, 1.0, 1.35, 1.0); b.box(0.5, 0.06, 0.08, 0xFFC107, 1.0, 1.42, 1.0);
    [-0.24, -0.12, 0, 0.12, 0.24].forEach(dx => b.box(0.05, 0.22, 0.05, 0xFFC107, 1.0 + dx, 1.56, 1.0));
  }
  g.add(voxelMesh(b));
  const sign = textSprite(def.label, '#4E342E', true);
  sign.position.set(0, 3.3, 0.6);
  sign.scale.multiplyScalar(1.5);
  g.add(sign);
  const vendor = buildVendor(def);
  g.add(vendor);
  if (id === 'pets') { eggDisplay = new THREE.Group(); eggDisplay.position.set(0, 1.08, 1.0); g.add(eggDisplay); }
  g.position.set(def.x, 0, STALL_Z);
  g.rotation.y = Math.PI; // faces the player's garden (−z)
  scene.add(g);
  stallModels[id] = { group: g, vendor };
  addCollider(def.x, STALL_Z, 1.8);
  addCollider(def.x - 1.4, STALL_Z, 1.1);
  addCollider(def.x + 1.4, STALL_Z, 1.1);
}

function eggMesh(eggId, scale) {
  const e = EGGS[eggId];
  const b = new VoxelBatch(8);
  b.box(0.5, 0.55, 0.5, e.color, 0, 0.3, 0);
  b.box(0.4, 0.15, 0.4, e.color, 0, 0.62, 0);
  b.box(0.36, 0.14, 0.36, e.color, 0, 0.06, 0);
  b.box(0.12, 0.12, 0.52, e.spot, 0.1, 0.4, 0);
  b.box(0.52, 0.1, 0.1, e.spot, 0, 0.22, 0.12);
  const m = new THREE.Mesh(b.build(), MATS.voxel);
  m.castShadow = true;
  m.scale.setScalar(scale || 1);
  return m;
}

function updateStalls(time) {
  Object.entries(stallModels).forEach(([id, s]) => {
    const u = s.vendor.userData;
    const near = focus && focus.kind === 'stall' && focus.id === id;
    s.vendor.position.y = Math.sin(time * 2 + s.group.position.x) * 0.02;
    u.armR.rotation.z = near ? 2.6 + Math.sin(time * 9) * 0.35 : lerp(u.armR.rotation.z, 0, 0.1);
    const dx = playerPos.x - s.group.position.x, dz = playerPos.z - s.group.position.z;
    let ang = Math.atan2(dx, dz) - s.group.rotation.y;
    u.head.rotation.y = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -0.8, 0.8);
  });
}
// Canvas text label shown as a 3D sprite (cheaper and smoother than moving DOM labels)
function textSprite(text, color, plain) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = 'bold 44px "Fredoka", "Segoe UI", system-ui, sans-serif';
  ctx.font = font;
  ctx.direction = IS_HE ? 'rtl' : 'ltr';
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  c.width = w; c.height = 72;
  ctx.font = font;
  ctx.direction = IS_HE ? 'rtl' : 'ltr';
  if (!plain) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const r = 30;
    ctx.beginPath();
    ctx.moveTo(r, 4); ctx.lineTo(w - r, 4); ctx.quadraticCurveTo(w - 4, 4, w - 4, 36);
    ctx.quadraticCurveTo(w - 4, 68, w - r, 68); ctx.lineTo(r, 68); ctx.quadraticCurveTo(4, 68, 4, 36);
    ctx.quadraticCurveTo(4, 4, r, 4); ctx.fill();
  }
  ctx.fillStyle = color || '#FFE082';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 38);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(w / 72 * 0.55, 0.55, 1);
  return s;
}

function buildTree(b, x, z, type, rand) {
  if (type === 'pine') {
    b.box(0.5, 2.2, 0.5, 0x5D4037, x, 1.1, z);
    const g = rand() > 0.5 ? 0x2E6B3A : 0x285E33;
    b.box(2.6, 0.9, 2.6, g, x, 2.2, z);
    b.box(2.0, 0.9, 2.0, g, x, 3.0, z);
    b.box(1.4, 0.9, 1.4, g, x, 3.8, z);
    b.box(0.7, 0.8, 0.7, g, x, 4.6, z);
  } else if (type === 'birch') {
    b.box(0.4, 3.2, 0.4, 0xECEFF1, x, 1.6, z);
    b.box(0.42, 0.12, 0.42, 0x37474F, x, 1.0, z);
    b.box(0.42, 0.12, 0.42, 0x37474F, x, 2.1, z);
    b.box(2.0, 1.6, 2.0, 0x8BC34A, x, 3.6, z);
    b.box(1.2, 0.8, 1.2, 0x9CCC65, x, 4.6, z);
  } else if (type === 'blossom') {
    b.box(0.5, 2.0, 0.5, 0x6D4C41, x, 1.0, z);
    b.box(2.6, 1.4, 2.6, 0xF8BBD0, x, 2.7, z);
    b.box(1.6, 0.9, 1.6, 0xF48FB1, x + 0.3, 3.6, z - 0.2);
  } else if (type === 'apple') {
    b.box(0.5, 2.0, 0.5, 0x6D4C41, x, 1.0, z);
    b.box(2.6, 1.8, 2.6, 0x43A047, x, 2.9, z);
    b.box(1.6, 1.0, 1.6, 0x4CAF50, x - 0.2, 4.1, z + 0.2);
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      b.box(0.25, 0.25, 0.25, 0xE53935, x + Math.cos(a) * 1.32, 2.4 + rand() * 1.2, z + Math.sin(a) * 1.32);
    }
  } else { // oak
    b.box(0.6, 2.2, 0.6, 0x6D4C41, x, 1.1, z);
    const g = rand() > 0.5 ? 0x388E3C : 0x2E7D32;
    b.box(3.0, 1.6, 3.0, g, x, 3.0, z);
    b.box(2.0, 1.0, 2.0, g, x + 0.2, 4.2, z - 0.2);
  }
}

const clouds = [];
const CLOUD_GEO = new THREE.SphereGeometry(1, 14, 10);
const CLOUD_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa4ad, fog: false });
function buildClouds(rand) {
  for (let i = 0; i < 9; i++) {
    // a cluster of soft spheres, flat on the bottom — cartoon cumulus
    const m = new THREE.Group();
    const n = 4 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const r = 2.2 + rand() * 2.4 * (1 - Math.abs(k - n / 2) / n);
      const puff = new THREE.Mesh(CLOUD_GEO, CLOUD_MAT);
      puff.scale.set(r, r * 0.8, r);
      puff.position.set(k * 2.6 - n * 1.3, r * 0.25, (rand() - 0.5) * 3);
      m.add(puff);
    }
    m.scale.setScalar(1.3);
    m.position.set((rand() - 0.5) * 160, 28 + rand() * 10, (rand() - 0.5) * 160);
    m.userData.speed = 0.6 + rand() * 0.8;
    scene.add(m);
    clouds.push(m);
  }
}


// ════════════════════════════════════════════
//  GARDEN RENDERING
// ════════════════════════════════════════════
const SELF_SCALING = ['watermelon', 'pumpkin', 'mushroom', 'bamboo', 'beanstalk'];
const SEED_RADIUS = {
  carrot: 0.35, strawberry: 0.5, blueberry: 0.55, orange_tulip: 0.3, tomato: 0.5, corn: 0.55, daffodil: 0.3,
  watermelon: 0.6, pumpkin: 0.6, apple: 1.1, bamboo: 0.6, coconut: 1.0, cactus: 0.65, dragon_fruit: 0.7,
  mango: 1.1, grape: 0.9, mushroom: 0.8, pepper: 0.5, cacao: 0.9, beanstalk: 0.55,
  wheat: 0.35, barley: 0.35, olive: 1.0, fig: 1.0, pomegranate: 0.8, gefen: 0.9, date_palm: 0.9,
};
function seedRadius(id) { return SEED_RADIUS[id] || 0.5; }

const plantViews = new Map();     // plant id → view
const placedViews = new Map();    // placed gear / egg id → view
let fruitMesh, fruitGlowMesh, ghost, rangeRing, guideArrow;
const FRUIT_CAP = 2500;
const fDummy = new THREE.Object3D();
const fColor = new THREE.Color();
const tmpColor = new THREE.Color();
let rainbowHue = 0;

function buildGardenSystems() {
  const box = bevelBoxGeometry(1, 1, 1, 0.16, 3);
  fruitMesh = new THREE.InstancedMesh(box, MATS.fruit, FRUIT_CAP);
  fruitGlowMesh = new THREE.InstancedMesh(box, MATS.fruitGlow, FRUIT_CAP);
  [fruitMesh, fruitGlowMesh].forEach(m => {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = true;
    m.frustumCulled = false;
    m.count = 0;
    m.setColorAt(0, fColor.set(0xffffff));
    scene.add(m);
  });
  ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 20), MATS.ghost);
  ghost.visible = false;
  scene.add(ghost);
  rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), MATS.ring);
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.visible = false;
  scene.add(rangeRing);
  guideArrow = new THREE.Sprite(Tex.emojiMaterial('👇', false));
  guideArrow.material.depthTest = false;
  guideArrow.renderOrder = 10;
  guideArrow.scale.set(1.8, 1.8, 1);
  guideArrow.visible = false;
  scene.add(guideArrow);
}

function plantProgress(p) { return Math.min(1, p.age / p.grow); }
function plantRipe(p) {
  const seed = getSeedData(p.s);
  if (!seed) return false;
  if (!seed.multi) return p.age >= p.grow;
  return p.age >= p.grow && p.fruits.some(f => f && f.age >= seed.fruitTime);
}
function ripeFruitCount(p) {
  const seed = getSeedData(p.s);
  if (!seed.multi) return p.age >= p.grow ? 1 : 0;
  return p.age >= p.grow ? p.fruits.filter(f => f && f.age >= seed.fruitTime).length : 0;
}
function topMutation(m) {
  if (!m || !m.length) return null;
  if (m.includes('rainbow')) return 'rainbow';
  if (m.includes('gold')) return 'gold';
  return m.slice().sort((a, b) => MUTATIONS[b].mult - MUTATIONS[a].mult)[0];
}
function sizeFactor(seed, kg) { return clamp(Math.cbrt(kg / seed.kg), 0.7, 2.6); }

function makePlantGeometry(p, seed, prog, ripe) {
  if (seed.roblox) return buildSeedModel(p.s, seed, prog, ripe);
  return { geometry: buildPlantGeometry(p.s, seed, prog, ripe), slots: [] };
}

function refreshPlantView(p) {
  const seed = getSeedData(p.s);
  if (!seed) return;
  let v = plantViews.get(p.id);
  if (!v) {
    v = { group: new THREE.Group(), mesh: null, key: '', slots: [], icon: null, iconOn: false, pop: 0, height: 1 };
    v.icon = new THREE.Sprite(Tex.emojiMaterial(seed.emoji, true));
    v.icon.scale.set(0.6, 0.6, 1);
    v.icon.visible = false;
    v.group.add(v.icon);
    scene.add(v.group);
    plantViews.set(p.id, v);
  }
  v.group.position.set(p.x, seed.roblox ? DIRT_Y : DIRT_Y - 0.32 * CLASSIC_SCALE, p.z);
  const prog = plantProgress(p);
  const grown = prog >= 1;
  const top = seed.multi ? null : topMutation(p.m);
  const stage = grown ? 'G' : Math.floor(prog * 6);
  const key = stage + '|' + (top || '');
  if (key !== v.key) {
    if (v.mesh) { v.group.remove(v.mesh); v.mesh.geometry.dispose(); }
    const built = makePlantGeometry(p, seed, prog, grown);
    v.mesh = new THREE.Mesh(built.geometry, top ? MATS.mut[top] : MATS.plant);
    v.mesh.castShadow = true;
    v.mesh.receiveShadow = true;
    v.mesh.rotation.y = p.r || 0;
    v.slots = built.slots;
    built.geometry.computeBoundingBox();
    v.height = built.geometry.boundingBox.max.y;
    v.group.add(v.mesh);
    if (v.key) v.pop = 1;
    v.key = key;
  }
  let s = 1;
  if (!seed.roblox) s = CLASSIC_SCALE;
  else if (!SELF_SCALING.includes(p.s)) s = 0.35 + 0.65 * prog;
  if (!seed.multi && grown && p.kg) s *= sizeFactor(seed, p.kg);
  v.baseScale = s;
  if (!v.pop) v.mesh.scale.setScalar(s);
  const ripe = ripeFruitCount(p) > 0;
  v.iconOn = ripe;
  const badge = plantBadge(p) || seed.emoji;
  if (v.badge !== badge) { v.badge = badge; v.icon.material = Tex.emojiMaterial(badge, true); }
  v.icon.position.y = v.height * s + 0.7;
}

function removePlantView(id) {
  const v = plantViews.get(id);
  if (!v) return;
  scene.remove(v.group);
  if (v.mesh) v.mesh.geometry.dispose();
  plantViews.delete(id);
}

function refreshAllPlants() {
  const alive = new Set();
  gameState.plants.forEach(p => { alive.add(p.id); if (!carrying || carrying.id !== p.id) refreshPlantView(p); });
  [...plantViews.keys()].forEach(id => { if (!alive.has(id) || (carrying && carrying.id === id)) removePlantView(id); });
}

// Every fruit is one instance: size from its weight, color from its mutations
function fruitColorFor(seed, f, ripeK) {
  const top = topMutation(f.m);
  if (top === 'rainbow') return fColor.setHSL((rainbowHue + f.kg * 0.37) % 1, 0.9, 0.6);
  fColor.set(seed.fruitColor || seed.color);
  if (ripeK < 1) fColor.lerp(tmpColor.set(0x8BC34A), (1 - ripeK) * 0.8);
  if (top) fColor.lerp(tmpColor.set(MUTATIONS[top].tint), top === 'gold' ? 0.85 : 0.55);
  return fColor;
}

function updateFruitInstances(time) {
  rainbowHue = (time * 0.2) % 1;
  let n = 0, g = 0;
  for (const p of gameState.plants) {
    if (!p.fruits || p.age < p.grow) continue;
    const v = plantViews.get(p.id);
    if (!v || !v.slots.length) continue;
    const seed = getSeedData(p.s);
    const shape = FRUIT_SHAPES[p.s] || [0.25, 0.25, 0.25];
    const cr = Math.cos(p.r || 0), sr = Math.sin(p.r || 0);
    for (let i = 0; i < p.fruits.length; i++) {
      const f = p.fruits[i];
      const slot = v.slots[i];
      if (!f || !slot) continue;
      const ripeK = Math.min(1, f.age / seed.fruitTime);
      const sz = sizeFactor(seed, f.kg) * (0.25 + 0.75 * ripeK);
      const lx = slot[0] * cr + slot[2] * sr, lz = -slot[0] * sr + slot[2] * cr;
      fDummy.position.set(p.x + lx, DIRT_Y + slot[1] * (v.pop ? v.mesh.scale.y : 1), p.z + lz);
      fDummy.rotation.set(0, (p.r || 0) + i, ripeK >= 1 ? Math.sin(time * 2 + i) * 0.06 : 0);
      fDummy.scale.set(shape[0] * sz, shape[1] * sz, shape[2] * sz);
      fDummy.updateMatrix();
      const top = topMutation(f.m);
      const glow = top && MUTATIONS[top].glow;
      const mesh = glow ? fruitGlowMesh : fruitMesh;
      const idx = glow ? g++ : n++;
      if (idx >= FRUIT_CAP) continue;
      mesh.setMatrixAt(idx, fDummy.matrix);
      mesh.setColorAt(idx, fruitColorFor(seed, f, ripeK));
    }
  }
  fruitMesh.count = Math.min(n, FRUIT_CAP);
  fruitGlowMesh.count = Math.min(g, FRUIT_CAP);
  [fruitMesh, fruitGlowMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
}

function animatePlants(time, dt) {
  MATS.mut.rainbow.color.setHSL(rainbowHue, 0.85, 0.65);
  MATS.mut.rainbow.emissive.setHSL(rainbowHue, 0.9, 0.15);
  let i = 0;
  for (const p of gameState.plants) {
    const v = plantViews.get(p.id);
    if (!v || !v.mesh) continue;
    i++;
    if (v.pop > 0) {
      v.pop = Math.max(0, v.pop - dt * 3);
      const k = Math.sin(v.pop * Math.PI);
      v.mesh.scale.set(v.baseScale * (1 + k * 0.15), v.baseScale * (1 + k * 0.25), v.baseScale * (1 + k * 0.15));
    } else {
      v.mesh.rotation.z = Math.sin(time * 1.2 + i) * 0.02;
    }
    v.icon.visible = v.iconOn && Math.hypot(p.x - playerPos.x, p.z - playerPos.z) < 22;
    if (v.icon.visible) v.icon.position.y = v.height * v.baseScale + 0.7 + Math.sin(time * 3 + i) * 0.08;
    if (v.iconOn && Math.random() < dt * 1.5) spawnParticles(p.x + (Math.random() - 0.5), DIRT_Y + 0.3 + Math.random() * v.height * v.baseScale, p.z + (Math.random() - 0.5), 0xFFF59D, 1, 0.5, 0.06, { up: 0.6, grav: 0, life: 0.9 });
  }
}

// ─── Sprinklers, lightning rods and eggs placed in the garden ───
function placedMesh(item) {
  const b = new VoxelBatch(8);
  if (item.gear === 'lightning_rod') {
    b.box(0.5, 0.15, 0.5, 0x616161, 0, 0.07, 0);
    b.box(0.1, 3.2, 0.1, 0x9E9E9E, 0, 1.6, 0);
    b.box(0.2, 0.3, 0.2, 0xD4884A, 0, 3.3, 0);
    b.box(0.06, 0.4, 0.06, 0xFFD54F, 0, 3.6, 0);
  } else {
    const c = { basic_sprinkler: 0x90A4AE, advanced_sprinkler: 0x4FC3F7, godly_sprinkler: 0xFFD54F, master_sprinkler: 0xAB47BC }[item.gear] || 0x90A4AE;
    const big = item.gear === 'master_sprinkler' ? 1.3 : 1;
    b.box(0.4 * big, 0.2, 0.4 * big, 0x546E7A, 0, 0.1, 0);
    b.box(0.12, 0.7 * big, 0.12, c, 0, 0.45 * big, 0);
    b.box(0.6 * big, 0.08, 0.12, c, 0, 0.82 * big, 0);
    b.box(0.12, 0.08, 0.6 * big, c, 0, 0.82 * big, 0);
    if (item.gear !== 'basic_sprinkler') b.box(0.2, 0.2, 0.2, 0xFFFFFF, 0, 0.95 * big, 0);
  }
  return new THREE.Mesh(b.build(), MATS.voxel);
}

function refreshPlaced() {
  const alive = new Set();
  gameState.placed.forEach(it => {
    alive.add(it.id);
    if (!placedViews.has(it.id)) {
      const m = placedMesh(it);
      m.castShadow = true;
      m.position.set(it.x, DIRT_Y, it.z);
      scene.add(m);
      placedViews.set(it.id, { mesh: m, kind: 'gear' });
    }
  });
  gameState.placedEggs.forEach(e => {
    alive.add(e.id);
    if (!placedViews.has(e.id)) {
      const m = eggMesh(e.egg, 0.9);
      m.position.set(e.x, DIRT_Y, e.z);
      scene.add(m);
      placedViews.set(e.id, { mesh: m, kind: 'egg' });
    }
  });
  [...placedViews.keys()].forEach(id => {
    if (!alive.has(id)) { const v = placedViews.get(id); scene.remove(v.mesh); v.mesh.geometry.dispose(); placedViews.delete(id); }
  });
}

function animatePlaced(time, dt) {
  gameState.placed.forEach(it => {
    const v = placedViews.get(it.id);
    if (!v) return;
    if (it.gear !== 'lightning_rod') {
      v.mesh.rotation.y = time * 3;
      const def = GEAR[it.gear];
      if (Math.random() < dt * 30) {
        const a = Math.random() * Math.PI * 2, sp = def.radius * 0.9;
        spawnParticles(it.x, 0.9, it.z, [0x81D4FA, 0xB3E5FC], 1, 0, 0.07, { up: 3.5, life: 0.95, grav: 7 });
        const p = particles[particleCursor];
        p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp;
      }
    }
  });
  gameState.placedEggs.forEach(e => {
    const v = placedViews.get(e.id);
    if (!v) return;
    const ready = e.left <= 0;
    v.mesh.rotation.z = ready ? Math.sin(time * 12) * 0.15 : Math.sin(time * 2) * 0.03;
    if (ready && Math.random() < dt * 4) spawnParticles(e.x, 0.8, e.z, 0xFFF59D, 1, 1, 0.07, { up: 1, grav: 0 });
  });
}

// ─── Neighbor gardens: the other gardeners on this device ───
const neighborMeshes = new Map();   // garden slot → merged mesh
const gardenSigns = [];
function buildGardenSigns(names, mine) {
  gardenSigns.forEach(s => scene.remove(s));
  gardenSigns.length = 0;
  GARDENS.forEach((g, i) => {
    const z = g.z - g.dir * (GARDEN_D / 2 + 0.8);
    const sign = new THREE.Group();
    const b = new VoxelBatch(4);
    b.box(0.15, 1.6, 0.15, 0x6D4C41, -2.6, 0.8, 0); b.box(0.15, 1.6, 0.15, 0x6D4C41, 2.6, 0.8, 0);
    b.box(5.6, 1.0, 0.12, i === mine ? 0xFFF59D : 0xFFF8E1, 0, 1.75, 0);
    sign.add(voxelMesh(b));
    const t = textSprite(names[i] ? T`${names[i]}'s Garden` : T`Empty Garden`, i === mine ? '#2E7D32' : '#5D4037', true);
    t.position.set(0, 1.75, g.dir < 0 ? 0.1 : -0.1);
    t.scale.multiplyScalar(1.25);
    sign.add(t);
    sign.position.set(g.x + 6, 0, z);
    scene.add(sign);
    gardenSigns.push(sign);
  });
}

// Merge a whole garden (plants + fruit) into one mesh — used for other gardeners' gardens
function buildGardenMesh(plants) {
  const parts = [];
  const fruitBatch = new VoxelBatch(6);
  plants.slice(0, MAX_PLANTS).forEach(p => {
    const seed = getSeedData(p.s);
    if (!seed) return;
    const prog = plantProgress(p);
    const built = makePlantGeometry(p, seed, prog, prog >= 1);
    const m4 = new THREE.Matrix4();
    const sc = seed.roblox ? (SELF_SCALING.includes(p.s) ? 1 : 0.35 + 0.65 * prog) : CLASSIC_SCALE;
    m4.compose(new THREE.Vector3(p.x, seed.roblox ? DIRT_Y : DIRT_Y - 0.32 * CLASSIC_SCALE, p.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.r || 0, 0)), new THREE.Vector3(sc, sc, sc));
    parts.push({ geometry: built.geometry, matrix: m4 });
    if (seed.multi && prog >= 1) {
      const shape = FRUIT_SHAPES[p.s] || [0.25, 0.25, 0.25];
      const cr = Math.cos(p.r || 0), sr = Math.sin(p.r || 0);
      (p.fruits || []).forEach((f, i) => {
        const slot = built.slots[i];
        if (!f || !slot) return;
        const sz = sizeFactor(seed, f.kg) * Math.min(1, 0.25 + 0.75 * f.age / seed.fruitTime);
        const lx2 = slot[0] * cr + slot[2] * sr, lz2 = -slot[0] * sr + slot[2] * cr;
        const top = topMutation(f.m);
        const c = top && top !== 'rainbow' ? lerpColor(seed.fruitColor, MUTATIONS[top].tint, 0.6) : (top === 'rainbow' ? 0xFF80AB : seed.fruitColor);
        fruitBatch.box(shape[0] * sz, shape[1] * sz, shape[2] * sz, c, p.x + lx2, DIRT_Y + slot[1], p.z + lz2);
      });
    }
  });
  if (!fruitBatch.isEmpty()) parts.push({ geometry: fruitBatch.build(), matrix: new THREE.Matrix4() });
  if (!parts.length) return null;
  const merged = VoxelBatch.merge(parts);
  parts.forEach(pt => pt.geometry.dispose());
  const mesh = new THREE.Mesh(merged, MATS.plant);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function setNeighborMesh(gi, plants) {
  const old = neighborMeshes.get(gi);
  if (old) { scene.remove(old); old.geometry.dispose(); neighborMeshes.delete(gi); }
  if (!plants || !plants.length) return;
  const mesh = buildGardenMesh(plants);
  if (mesh) { scene.add(mesh); neighborMeshes.set(gi, mesh); }
}
function clearNeighborMeshes() { [...neighborMeshes.keys()].forEach(gi => setNeighborMesh(gi, null)); }

// The gardens got bigger and moved apart: keep everything in the same spot relative to its garden
function shiftFromOldLayout(state, slot) {
  const a = OLD_GARDENS[slot] || OLD_GARDENS[0], b = GARDENS[slot] || GARDENS[0];
  const move = o => { o.x += b.x - a.x; o.z += b.z - a.z; };
  (state.plants || []).forEach(move);
  (state.placed || []).forEach(move);
  (state.placedEggs || []).forEach(move);
}
// Move a save's plants/gear/eggs from one garden slot to another
function relocateState(state, fromSlot, toSlot) {
  if ((fromSlot || 0) === (toSlot || 0)) return;
  const a = GARDENS[fromSlot] || GARDENS[0], b = GARDENS[toSlot] || GARDENS[0];
  const flip = a.dir === b.dir ? 1 : -1;
  const move = o => { o.x = b.x + (o.x - a.x); o.z = b.z + (o.z - a.z) * flip; };
  (state.plants || []).forEach(move);
  (state.placed || []).forEach(move);
  (state.placedEggs || []).forEach(move);
}

// Offline: the other gardeners saved on this device become your neighbors
function buildNeighborGardens() {
  if (netMode) { rebuildOnlineGardens(); return; }
  clearNeighborMeshes();
  const names = [];
  const me = getProfiles().find(p => p.id === activeProfileId);
  names[0] = me ? me.name : T`My`;
  const others = getProfiles().filter(p => p.id !== activeProfileId).slice(0, GARDENS.length - 1);
  others.forEach((prof, k) => {
    const gi = k + 1;
    names[gi] = prof.name;
    const save = readSave(prof.id);
    if (!save) return;
    const st = migrateSaveToV3(JSON.parse(JSON.stringify(save)));
    relocateState(st, save.slot || 0, gi);
    setNeighborMesh(gi, st.plants);
  });
  buildGardenSigns(names, 0);
}
// ─── Butterflies (day) & fireflies (night) ───
const butterflies = [];
let fireflies = null;
function buildCritters() {
  const colors = [0xFF80AB, 0xFFD54F, 0x80D8FF, 0xFF8A65, 0xB388FF, 0xCCFF90];
  const wingGeo = new THREE.BoxGeometry(0.16, 0.01, 0.13);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
    const wl = new THREE.Mesh(wingGeo, m); wl.position.x = -0.08;
    const wr = new THREE.Mesh(wingGeo, m); wr.position.x = 0.08;
    g.add(wl, wr);
    const a = Math.random() * Math.PI * 2;
    g.userData = { wl, wr, cx: MY_GARDEN.x + Math.cos(a) * (4 + Math.random() * 7), cz: MY_GARDEN.z + Math.sin(a) * (3 + Math.random() * 6), phase: Math.random() * 6, speed: 0.4 + Math.random() * 0.4 };
    scene.add(g);
    butterflies.push(g);
  }
  const n = 50;
  const pos = new Float32Array(n * 3);
  const base = [];
  for (let i = 0; i < n; i++) base.push({ x: (Math.random() - 0.5) * 50, y: 0.6 + Math.random() * 2.5, z: (Math.random() - 0.5) * 50, p: Math.random() * 6 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const glowC = document.createElement('canvas');
  glowC.width = glowC.height = 32;
  const gx = glowC.getContext('2d');
  const grad = gx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,220,1)'); grad.addColorStop(0.3, 'rgba(220,255,120,0.8)'); grad.addColorStop(1, 'rgba(180,255,80,0)');
  gx.fillStyle = grad; gx.fillRect(0, 0, 32, 32);
  fireflies = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(glowC), color: 0xE6FF7A, size: 0.35, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  fireflies.userData.base = base;
  fireflies.frustumCulled = false;
  scene.add(fireflies);
}
function updateCritters(time) {
  const day = 1 - nightFactor;
  butterflies.forEach(b => {
    b.visible = day > 0.4 && !weather;
    if (!b.visible) return;
    const u = b.userData;
    const t = time * u.speed + u.phase;
    b.position.set(u.cx + Math.sin(t) * 3, 1.2 + Math.sin(t * 2.3) * 0.5, u.cz + Math.cos(t * 0.8) * 3);
    b.rotation.y = -t;
    const f = Math.sin(time * 18 + u.phase) * 0.9;
    u.wl.rotation.z = f; u.wr.rotation.z = -f;
  });
  fireflies.material.opacity = Math.max(0, nightFactor - 0.3) * 1.3;
  if (fireflies.material.opacity > 0) {
    const arr = fireflies.geometry.attributes.position.array;
    fireflies.userData.base.forEach((b, i) => {
      arr[i * 3] = b.x + Math.sin(time * 0.5 + b.p) * 1.5;
      arr[i * 3 + 1] = b.y + Math.sin(time * 0.9 + b.p * 2) * 0.4;
      arr[i * 3 + 2] = b.z + Math.cos(time * 0.4 + b.p) * 1.5;
    });
    fireflies.geometry.attributes.position.needsUpdate = true;
  }
}

// ─── Rain (one draw call: line segments around the player) ───
let rain = null;
const RAIN_COUNT = 700;
function buildRain() {
  const pos = new Float32Array(RAIN_COUNT * 6);
  for (let i = 0; i < RAIN_COUNT; i++) {
    const x = (Math.random() - 0.5) * 50, y = Math.random() * 25, z = (Math.random() - 0.5) * 50;
    pos.set([x, y, z, x, y - 0.9, z], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdceeff, transparent: true, opacity: 0.75 }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);
}
function updateRain(dt) {
  rain.visible = !!weather && (weather.id === 'rain' || weather.id === 'thunderstorm');
  if (!rain.visible) return;
  rain.position.set(playerPos.x, 0, playerPos.z);
  const a = rain.geometry.attributes.position.array;
  const fall = dt * 22;
  for (let i = 0; i < RAIN_COUNT; i++) {
    const o = i * 6;
    a[o + 1] -= fall; a[o + 4] -= fall;
    if (a[o + 4] < 0) {
      const y = 20 + Math.random() * 6;
      a[o + 1] = y; a[o + 4] = y - 0.9;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

// ─── Particles: pooled instanced cubes (one draw call for every burst) ───
const PARTICLE_MAX = 400;
let particleMesh = null;
const particles = [];
const pDummy = new THREE.Object3D();
const pColor = new THREE.Color();
function buildParticles() {
  particleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), PARTICLE_MAX);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.frustumCulled = false;
  for (let i = 0; i < PARTICLE_MAX; i++) {
    particles.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0.1, grav: 9 });
    particleMesh.setColorAt(i, pColor.set(0xffffff));
    pDummy.scale.setScalar(0); pDummy.updateMatrix();
    particleMesh.setMatrixAt(i, pDummy.matrix);
  }
  scene.add(particleMesh);
}
let particleCursor = 0;
function spawnParticles(x, y, z, color, count, speed, size, opts) {
  opts = opts || {};
  for (let n = 0; n < count; n++) {
    const i = particleCursor = (particleCursor + 1) % PARTICLE_MAX;
    const p = particles[i];
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 3) * (0.4 + Math.random() * 0.6);
    p.x = x + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0);
    p.y = y;
    p.z = z + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0);
    p.vx = Math.cos(a) * s * (opts.flat ? 1 : 0.6);
    p.vz = Math.sin(a) * s * (opts.flat ? 1 : 0.6);
    p.vy = opts.down ? -s * 0.3 : (opts.up != null ? opts.up : s * (0.8 + Math.random()));
    p.max = p.life = (opts.life || 0.9) * (0.7 + Math.random() * 0.5);
    p.size = (size || 0.12) * (0.7 + Math.random() * 0.6);
    p.grav = opts.grav != null ? opts.grav : 9;
    const c = Array.isArray(color) ? color[n % color.length] : color;
    particleMesh.setColorAt(i, pColor.set(c));
  }
  particleMesh.instanceColor.needsUpdate = true;
}
function updateParticles(dt) {
  let any = false;
  for (let i = 0; i < PARTICLE_MAX; i++) {
    const p = particles[i];
    if (p.life <= 0) continue;
    any = true;
    p.life -= dt;
    p.vy -= p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
    const k = Math.max(0, p.life / p.max);
    pDummy.position.set(p.x, p.y, p.z);
    pDummy.rotation.set(p.life * 5, p.life * 3, 0);
    pDummy.scale.setScalar(p.life > 0 ? p.size * (0.3 + 0.7 * k) : 0);
    pDummy.updateMatrix();
    particleMesh.setMatrixAt(i, pDummy.matrix);
  }
  if (any) particleMesh.instanceMatrix.needsUpdate = true;
}


// ════════════════════════════════════════════
//  GAMEPLAY
// ════════════════════════════════════════════

// ─── Value of a fruit (Roblox-style formula) ───
function fruitValue(f) {
  const seed = getSeedData(f.s);
  if (!seed) return 0;
  const w = Math.max(0.6, Math.pow(f.kg / seed.kg, 2));
  let growth = 1, env = 0;
  (f.m || []).forEach(k => {
    const m = MUTATIONS[k];
    if (!m) return;
    if (m.growth) growth = Math.max(growth, m.mult);
    else env += m.mult - 1;
  });
  return Math.max(1, Math.round(seed.sell * w * growth * (1 + env) * (1 + petPower('sell') / 100)));
}
function fruitLabel(f) {
  const seed = getSeedData(f.s);
  const muts = (f.m || []).map(k => MUTATIONS[k] ? MUTATIONS[k].emoji : '').join('');
  return `${muts}${seed ? seed.emoji + ' ' + seed.name : f.s}`;
}
function rollWeight(seed, bonus) {
  let kg = seed.kg * (0.8 + Math.random() * 0.5);
  if (Math.random() < 0.025) kg *= 2 + Math.random() * 1.5; // huge!
  return Math.round(kg * (1 + bonus) * 100) / 100;
}
function addMutation(m, mut) {
  if (!m || m.includes(mut)) return false;
  if (mut === 'gold' && m.includes('rainbow')) return false;
  if (mut === 'rainbow') { const i = m.indexOf('gold'); if (i >= 0) m.splice(i, 1); }
  if (m.includes('frozen') && (mut === 'wet' || mut === 'chilled')) return false;
  if ((mut === 'chilled' && m.includes('wet')) || (mut === 'wet' && m.includes('chilled'))) {
    ['wet', 'chilled'].forEach(k => { const i = m.indexOf(k); if (i >= 0) m.splice(i, 1); });
    mut = 'frozen';
    if (m.includes('frozen')) return false;
  }
  m.push(mut);
  return true;
}

// ─── Sprinklers / pets / weather that boost a plant ───
function sprinklersAt(x, z) {
  let grow = 0, mut = 1, size = 0;
  for (const it of gameState.placed) {
    const def = GEAR[it.gear];
    if (!def.grow) continue;
    if (Math.hypot(it.x - x, it.z - z) <= def.radius) { grow += def.grow; mut = Math.max(mut, def.mut); size = Math.max(size, def.size); }
  }
  return { grow, mut, size };
}
function growthRate(p) {
  let r = 1 + sprinklersAt(p.x, p.z).grow + petPower('grow') / 100;
  if (weather && (weather.id === 'rain' || weather.id === 'thunderstorm')) r *= 1.5;
  if (p.water > 0) r *= 1.5;
  return r;
}
function newFruit(seed, p) {
  const spr = sprinklersAt(p.x, p.z);
  const f = { age: 0, kg: rollWeight(seed, spr.size + petPower('size') / 100), m: [] };
  const luck = spr.mut;
  const r = Math.random();
  if (r < 0.004 * luck) f.m.push('rainbow');
  else if (r < 0.025 * luck) f.m.push('gold');
  return f;
}

// ─── Growth tick ───
let viewRefreshTimer = 0;
function updateGarden(dt) {
  for (const p of gameState.plants) {
    const seed = getSeedData(p.s);
    if (!seed) continue;
    const rate = growthRate(p);
    if (p.water > 0) p.water = Math.max(0, p.water - dt);
    const wasGrown = p.age >= p.grow;
    if (!wasGrown) {
      p.age = Math.min(p.grow, p.age + dt * rate);
      if (p.age >= p.grow) onPlantGrown(p, seed);
    } else if (seed.multi) {
      if (!Array.isArray(p.fruits)) p.fruits = [];
      while (p.fruits.length < seed.maxFruits) p.fruits.push(null);
      for (let i = 0; i < p.fruits.length; i++) {
        if (!p.fruits[i]) p.fruits[i] = newFruit(seed, p);
        const f = p.fruits[i];
        if (f.age < seed.fruitTime) {
          f.age = Math.min(seed.fruitTime, f.age + dt * rate);
          if (f.age >= seed.fruitTime && Math.random() < 0.3) sparkleAt(p.x, p.z, 1.2);
        }
      }
    }
  }
  for (const it of gameState.placed) if (it.left != null) it.left -= dt;
  const before = gameState.placed.length;
  gameState.placed = gameState.placed.filter(it => (it.left == null || it.left > 0) && (it.uses == null || it.uses > 0));
  if (gameState.placed.length !== before) { refreshPlaced(); showToast('💦', T`A sprinkler ran out.`); }
  const eggRate = 1 + petPower('eggs') / 100;
  gameState.placedEggs.forEach(e => {
    if (e.left > 0) { e.left -= dt * eggRate; if (e.left <= 0) { Sfx.play('pop'); floatText(e.x, 1.4, e.z, T`🥚 Ready to hatch!`, '#FFF59D'); } }
  });
  viewRefreshTimer -= dt;
  if (viewRefreshTimer <= 0) { viewRefreshTimer = 0.4; refreshAllPlants(); }
}

function onPlantGrown(p, seed) {
  if (seed.multi) {
    p.fruits = new Array(seed.maxFruits).fill(null).map(() => newFruit(seed, p));
  } else {
    const spr = sprinklersAt(p.x, p.z);
    p.kg = rollWeight(seed, spr.size + petPower('size') / 100);
    const r = Math.random();
    if (r < 0.004 * spr.mut) addMutation(p.m, 'rainbow');
    else if (r < 0.025 * spr.mut) addMutation(p.m, 'gold');
  }
  refreshPlantView(p);
  sparkleAt(p.x, p.z, 1);
  if (Math.hypot(playerPos.x - p.x, playerPos.z - p.z) < 18) Sfx.play('pop');
}

function sparkleAt(x, z, h) {
  spawnParticles(x, DIRT_Y + h, z, [0xFFFFFF, 0xFFF59D, 0xB9F6CA], 8, 2, 0.08);
}

// ─── Every fruit that can receive a weather mutation ───
function forEachFruit(fn) {
  for (const p of gameState.plants) {
    const seed = getSeedData(p.s);
    if (!seed || p.age < p.grow * 0.5) continue;
    if (seed.multi) { if (p.age >= p.grow) p.fruits.forEach(f => { if (f) fn(f.m, p, f); }); }
    else fn(p.m, p, null);
  }
}
function randomFruit(filter) {
  const list = [];
  forEachFruit((m, p, f) => { if (!filter || filter(m, p, f)) list.push({ m, p, f }); });
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}
function mutateSome(chancePerSec, mut, dt) {
  const k = chancePerSec * dt;
  forEachFruit((m, p) => {
    if (Math.random() < k * sprinklersAt(p.x, p.z).mut && addMutation(m, mut)) {
      if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) < 25) spawnParticles(p.x, DIRT_Y + 1, p.z, new THREE.Color(MUTATIONS[m[m.length - 1]].tint).getHex(), 6, 1.5, 0.07);
    }
  });
}

// ─── Weather events ───
// Day/night and weather follow the real clock, so every player in a family
// world sees the same sunset and the same thunderstorm at the same time.
const WEATHER_SLOT = 360;
let dayOffset = 0, forcedWeather = null;
function globalDayTime(sec) {
  const t = (sec != null ? sec : Date.now() / 1000) / DAY_LENGTH + dayOffset;
  return ((t % 1) + 1) % 1;
}
function nightAt(sec) { return Math.sin((globalDayTime(sec) - 0.25) * Math.PI * 2) < -0.1; }
function scheduledWeather(now) {
  const slot = Math.floor(now / WEATHER_SLOT);
  const r = seededRandom(slot * 7717 + 3);
  r();
  if (r() > 0.45) return null;
  const slotStart = slot * WEATHER_SLOT;
  const night = nightAt(slotStart + 60);
  const opts = Object.entries(WEATHER).filter(([, w]) => !w.night || night);
  const total = opts.reduce((acc, [, w]) => acc + w.weight, 0);
  let x = r() * total, id = opts[0][0];
  for (const [k, w] of opts) { x -= w.weight; if (x <= 0) { id = k; break; } }
  const def = WEATHER[id];
  const dur = def.time[0] + r() * (def.time[1] - def.time[0]);
  const start = slotStart + 20 + r() * (WEATHER_SLOT - dur - 40);
  if (now >= start && now < start + dur) return { id, left: start + dur - now, total: dur };
  return null;
}
function startWeather(id) { // used by the test hook to force an event
  const def = WEATHER[id];
  const dur = def.time[0] + Math.random() * (def.time[1] - def.time[0]);
  forcedWeather = { id, until: Date.now() / 1000 + dur, total: dur };
  updateWeather(0);
}
function updateWeather(dt) {
  const now = Date.now() / 1000;
  if (forcedWeather && now >= forcedWeather.until) forcedWeather = null;
  const w = forcedWeather ? { id: forcedWeather.id, left: forcedWeather.until - now, total: forcedWeather.total } : scheduledWeather(now);
  const prev = weather ? weather.id : null;
  if (w && w.id !== prev) {
    weather = w;
    lightningTimer = 4; meteorTimer = 3;
    Sfx.play(w.id === 'thunderstorm' ? 'thunder' : 'restock');
    weatherBanner();
  } else if (!w && prev) {
    showToast(WEATHER[prev].emoji, T`The ${WEATHER[prev].name} is over.`);
    weather = null;
    weatherBanner();
  } else if (w) weather.left = w.left;
  if (weather) {
    const id = weather.id;
    if (id === 'rain' || id === 'thunderstorm') mutateSome(1 / 110, 'wet', dt);
    if (id === 'frost') mutateSome(1 / 110, 'chilled', dt);
    if (id === 'blood_moon') mutateSome(1 / 140, 'bloodlit', dt);
    if (id === 'thunderstorm') { lightningTimer -= dt; if (lightningTimer <= 0) { lightningTimer = 9 + Math.random() * 10; lightningStrike(); } }
    if (id === 'meteor_shower') { meteorTimer -= dt; if (meteorTimer <= 0) { meteorTimer = 6 + Math.random() * 6; launchMeteor(); } }
  }
  // Night: a few ripe fruits turn Moonlit
  if (nightFactor > 0.7 && (!weather || weather.id !== 'blood_moon')) {
    moonlitTimer -= dt;
    if (moonlitTimer <= 0 && moonlitCount < 8) {
      moonlitTimer = 20 + Math.random() * 15;
      const t = randomFruit(m => !m.includes('moonlit'));
      if (t && addMutation(t.m, 'moonlit')) { moonlitCount++; spawnParticles(t.p.x, DIRT_Y + 1.2, t.p.z, 0xB39DDB, 12, 2, 0.08); }
    }
  } else if (nightFactor < 0.2) moonlitCount = 0;
}

// Lightning prefers lightning rods, then hits a random plant: nearby fruit become Shocked
let boltMesh = null, boltTime = 0, flash = 0;
function lightningStrike() {
  const rods = gameState.placed.filter(it => it.gear === 'lightning_rod');
  let x, z, radius = 1.4;
  if (rods.length && Math.random() < 0.7) {
    const rod = rods[Math.floor(Math.random() * rods.length)];
    x = rod.x; z = rod.z; radius = GEAR.lightning_rod.radius; rod.uses--;
  } else {
    const t = randomFruit();
    if (t) { x = t.p.x; z = t.p.z; }
    else { x = MY_GARDEN.x + (Math.random() - 0.5) * 20; z = MY_GARDEN.z + (Math.random() - 0.5) * 16; }
  }
  let shocked = 0;
  forEachFruit((m, p) => { if (Math.hypot(p.x - x, p.z - z) <= radius && addMutation(m, 'shocked')) shocked++; });
  showBolt(x, z);
  if (shocked) { showToast('⚡', shocked > 1 ? T`Lightning! ${shocked} fruits are now Shocked (100x)!` : T`Lightning! 1 fruit is now Shocked (100x)!`); checkAchievement('shocking'); }
}
function showBolt(x, z) {
  if (!boltMesh) {
    boltMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xFFFFE0, fog: false }));
    scene.add(boltMesh);
  }
  const b = new VoxelBatch(1);
  let cx = x, cy = 40;
  while (cy > 0) {
    const nx = x + (Math.random() - 0.5) * 3 * (cy / 40), ny = Math.max(0, cy - 3 - Math.random() * 3);
    const len = Math.hypot(nx - cx, cy - ny);
    b.box(0.25, len, 0.25, 0xffffff, (cx + nx) / 2, (cy + ny) / 2, z, 0, 0, Math.atan2(nx - cx, cy - ny));
    cx = nx; cy = ny;
  }
  boltMesh.geometry.dispose();
  boltMesh.geometry = b.build();
  boltMesh.visible = true;
  boltTime = 0.25; flash = 1;
  Sfx.play('thunder');
  spawnParticles(x, 0.5, z, [0xFFFF8D, 0xFFFFFF], 30, 6, 0.1);
}

// Meteors fall on a plant: its fruit become Celestial
const meteors = [];
function launchMeteor() {
  const t = randomFruit();
  const x = t ? t.p.x : MY_GARDEN.x + (Math.random() - 0.5) * 20, z = t ? t.p.z : MY_GARDEN.z + (Math.random() - 0.5) * 16;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: 0xFFD1FF, fog: false }));
  m.position.set(x + 25, 45, z - 15);
  scene.add(m);
  meteors.push({ mesh: m, x, z, t: 0 });
  Sfx.play('meteor');
}
function updateMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const mt = meteors[i];
    mt.t += dt / 1.1;
    const k = Math.min(1, mt.t);
    mt.mesh.position.set(mt.x + 25 * (1 - k), 45 * (1 - k) + 0.3, mt.z - 15 * (1 - k));
    mt.mesh.rotation.x += dt * 8; mt.mesh.rotation.y += dt * 6;
    spawnParticles(mt.mesh.position.x, mt.mesh.position.y, mt.mesh.position.z, [0xEA80FC, 0xFFFFFF, 0x80D8FF], 2, 0.5, 0.15, { grav: 0, life: 0.6 });
    if (k >= 1) {
      scene.remove(mt.mesh); mt.mesh.geometry.dispose();
      meteors.splice(i, 1);
      let n = 0;
      forEachFruit((m, p) => { if (Math.hypot(p.x - mt.x, p.z - mt.z) <= 1.6 && addMutation(m, 'celestial')) n++; });
      spawnParticles(mt.x, 0.5, mt.z, [0xEA80FC, 0xFFFFFF, 0xFFD1FF], 40, 6, 0.12);
      if (n) { showToast('🌠', n > 1 ? T`A meteor made ${n} fruit Celestial (120x)!` : T`A meteor made 1 fruit Celestial (120x)!`); checkAchievement('celestial'); }
    }
  }
}

// ─── Garden helpers ───
function inMyGarden(x, z) {
  const lx = Math.abs(x - MY_GARDEN.x), lz = Math.abs(z - MY_GARDEN.z);
  return lx >= BED_X0 + 0.25 && lx <= BED_X1 - 0.25 && lz <= BED_Z - 0.25;
}
function spotFree(x, z, radius, ignoreId) {
  if (!inMyGarden(x, z)) return false;
  for (const p of gameState.plants) if (p.id !== ignoreId && Math.hypot(p.x - x, p.z - z) < radius + seedRadius(p.s) * 0.8) return false;
  for (const e of gameState.placedEggs) if (Math.hypot(e.x - x, e.z - z) < radius + 0.4) return false;
  for (const it of gameState.placed) if (Math.hypot(it.x - x, it.z - z) < radius + 0.3) return false;
  return true;
}
function nearestPlant(x, z, maxD, filter) {
  let best = null, bd = maxD;
  for (const p of gameState.plants) {
    if (filter && !filter(p)) continue;
    const d = Math.hypot(p.x - x, p.z - z) - seedRadius(p.s) * 0.6;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function nearestEgg(x, z, maxD) {
  let best = null, bd = maxD;
  for (const e of gameState.placedEggs) { const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; best = e; } }
  return best;
}
function nearestPlaced(x, z, maxD) {
  let best = null, bd = maxD;
  for (const it of gameState.placed) { const d = Math.hypot(it.x - x, it.z - z); if (d < bd) { bd = d; best = it; } }
  return best;
}

// ─── Selected hotbar item ───
function selectedItem() {
  const s = gameState.selected;
  if (!s) return null;
  const [kind, id] = s.split(':');
  if (kind === 'seed' && gameState.seeds[id] > 0) return { kind, id };
  if (kind === 'gear' && gameState.gear[id] > 0) return { kind, id };
  if (kind === 'egg' && gameState.eggs[id] > 0) return { kind, id };
  return null;
}
function consume(kind, id) {
  const bag = kind === 'seed' ? gameState.seeds : kind === 'egg' ? gameState.eggs : gameState.gear;
  bag[id]--;
  if (bag[id] <= 0) { delete bag[id]; if (gameState.selected === kind + ':' + id) gameState.selected = null; }
  updateHotbar();
}

// ─── Actions ───
function plantSeed(seedId, x, z) {
  const seed = getSeedData(seedId);
  if (!gameState.seeds[seedId]) return false;
  if (gameState.plants.length >= MAX_PLANTS) { Sfx.play('deny'); showToast('🌳', T`Your garden is full! Dig something up with the ⛏️ Shovel.`); return false; }
  if (!spotFree(x, z, seedRadius(seedId))) { Sfx.play('deny'); showToast('🚫', inMyGarden(x, z) ? T`Too close to another plant!` : T`Plant on the dirt in your garden!`); return false; }
  if (isShemitah()) { Sfx.play('deny'); if (!teach('shemitah')) showToast('🌿', T`Shemitah! The land rests this year — you can plant again in ${fmtTime(yearSecondsLeft())}.`); return false; }
  const kil = kilayimConflict(seedId, x, z);
  if (kil) { Sfx.play('deny'); if (!teach('kilayim')) showToast('🚧', T`Kilayim! Too close to your ${getSeedData(kil.plant.s).name} — leave space between different kinds.`); return false; }
  const careful = keptKilayim(seedId, x, z);
  consume('seed', seedId);
  const p = { id: newId(), s: seedId, x, z, r: Math.random() * Math.PI * 2, age: 0, grow: seed.grow, kg: 0, m: [], fruits: seed.multi ? [] : null, water: 0 };
  if (isFruitTree(seedId)) { p.py = gardenYearIndex(); p.ol = 'orlah'; }
  gameState.plants.push(p);
  if (careful) mitzvah('kil', 1, T`Kept apart!`, x, z);
  if (p.py != null && !teach('orlah')) floatText(x, 2.2, z, T`🌱 Orlah for 3 years`, '#C5E1A5');
  if (inPeah(x, z)) teach('peah');
  refreshPlantView(p);
  plantViewPop(p);
  Sfx.play('plant');
  spawnParticles(x, 0.3, z, [0x6D4C41, 0x8D6E63], 10, 2, 0.1);
  checkAchievement('first_sprout');
  if (gameState.plants.length >= 50) checkAchievement('full_garden');
  taskEvent('plant', 1, { seedId });
  saveGame();
  return true;
}
function plantViewPop(p) { const v = plantViews.get(p.id); if (v) v.pop = 1; }

function harvestPlant(p) {
  const seed = getSeedData(p.s);
  if (!seed || !plantRipe(p)) return 0;
  const got = [];
  if (seed.multi) {
    p.fruits.forEach((f, i) => {
      if (f && f.age >= seed.fruitTime) { got.push({ s: p.s, kg: f.kg, m: f.m.slice() }); p.fruits[i] = null; }
    });
  } else {
    got.push({ s: p.s, kg: p.kg || seed.kg, m: p.m.slice() });
    gameState.plants = gameState.plants.filter(x => x !== p);
    removePlantView(p.id);
  }
  // Bikkurim: the first fruit you tied a reed around
  if (p.bk && got.length) { got[0].bk = 1; p.bk = 0; }
  // pets with "dupe" can give an extra copy
  const dupe = petPower('dupe');
  got.slice().forEach(f => { if (Math.random() * 100 < dupe) { got.push({ s: f.s, kg: f.kg, m: f.m.slice() }); floatText(p.x, 2.4, p.z, T`🐜 Extra fruit!`, '#FFCC80'); } });
  // Year 6: "it shall bring forth produce for the three years"
  if (isBlessedYear()) { got.slice().forEach(f => { if (!f.bk) got.push({ s: f.s, kg: f.kg, m: f.m.slice() }); }); floatText(p.x, 2.8, p.z, T`✨ Year-6 blessing: doubled!`, '#FFF59D'); }
  const shemitah = isShemitah(), revai = orlahPhase(p) === 'revai';
  got.forEach(f => { if (shemitah) f.sv = 1; if (revai && !f.bk) f.rv = 1; });
  // Leket: sometimes a fruit falls while you harvest — it belongs to the poor
  if (!shemitah && Math.random() < MITZVAH.LEKET_CHANCE) {
    const i = got.findIndex(f => !f.bk);
    if (i >= 0) {
      const f = got.splice(i, 1)[0];
      const a = Math.random() * Math.PI * 2;
      gameState.gifts.push({ id: newId(), s: f.s, kg: f.kg, m: f.m, x: p.x + Math.cos(a) * 0.7, z: p.z + Math.sin(a) * 0.7 });
      refreshGifts();
      setTimeout(() => floatText(p.x, 1.2, p.z, T`🌾 Oops, it fell — Leket!`, '#FFE082'), 300);
      teach('leket');
    }
  }
  tripHarvests.push({ x: p.x, z: p.z });
  if (got.some(f => f.bk)) setTimeout(() => showToast('🎀', T`Bikkurim! Bring them to the Kohen 🏛️ at the market.`), 500);
  if (got.some(f => f.rv)) teach('revai');
  if (shemitah) teach('shemitah');
  let added = 0;
  for (const f of got) {
    if (gameState.fruits.length >= MAX_FRUITS) { showToast('🎒', T`Backpack full! Sell at the 💰 Sell stand.`); break; }
    gameState.fruits.push(f);
    added++;
    gameState.totalHarvested++;
    const mx = f.m;
    if (mx.includes('gold')) checkAchievement('golden_touch');
    if (mx.includes('rainbow')) checkAchievement('over_rainbow');
    if (mx.includes('wet')) checkAchievement('rain_dancer');
    if (mx.includes('moonlit')) checkAchievement('night_owl');
    if (mx.includes('frozen')) checkAchievement('frozen_solid');
    if (f.kg >= seed.kg * 2) checkAchievement('heavyweight');
    taskEvent('harvest', 1, { seedId: f.s, mutation: mx.length > 0 });
  }
  if (!added) { saveGame(); return 0; }
  if (!gameState.harvestedTypes.includes(p.s)) gameState.harvestedTypes.push(p.s);
  const best = got.reduce((a, b) => fruitValue(b) > fruitValue(a) ? b : a, got[0]);
  const special = got.some(f => f.m.length) || ['mythical', 'divine', 'prismatic'].includes(seed.rarity);
  Sfx.play('harvest');
  if (special) setTimeout(() => Sfx.play('sparkle'), 180);
  spawnParticles(p.x, 1, p.z, [seed.fruitColor || seed.color, 0xFFFFFF, 0xFFF59D], special ? 26 : 14, 4, 0.12);
  floatText(p.x, 2, p.z, `+${added} ${seed.emoji}`, '#FFFFFF');
  setTimeout(() => floatText(p.x, 1.5, p.z, T`${best.kg}kg • ¢${fmtSheckles(fruitValue(best))}`, best.m.length ? MUTATIONS[topMutation(best.m)].color : '#B9F6CA'), 220);
  if (gameState.totalHarvested >= 10) checkAchievement('green_thumb');
  if (gameState.totalHarvested >= 50) checkAchievement('master_gardener');
  if (['rare', 'legendary', 'mythical', 'divine', 'prismatic'].includes(seed.rarity)) checkAchievement('rare_find');
  if (['mythical', 'divine', 'prismatic'].includes(seed.rarity)) checkAchievement('mythic');
  if (seed.rarity === 'prismatic') checkAchievement('prismatic');
  if (gameState.harvestedTypes.length >= 8) checkAchievement('variety_pack');
  refreshPlantView(p);
  updateHUD(); saveGame();
  return added;
}

function useWateringCan(p) {
  if (!p) { showToast('🚿', T`Walk up to a plant to water it!`); return; }
  consume('gear', 'watering_can');
  p.water = 60;
  const seed = getSeedData(p.s);
  if (p.age < p.grow) p.age = Math.min(p.grow, p.age + p.grow * 0.05);
  else if (seed.multi) p.fruits.forEach(f => { if (f) f.age = Math.min(seed.fruitTime, f.age + seed.fruitTime * 0.1); });
  Sfx.play('water');
  spawnParticles(p.x, 2, p.z, [0x4FC3F7, 0x81D4FA, 0xB3E5FC], 24, 1.2, 0.08, { down: true, spread: 1.4, life: 0.7, grav: 12 });
  floatText(p.x, 1.8, p.z, T`💧 Growing faster!`, '#81D4FA');
  taskEvent('water', 1);
  refreshPlantView(p);
}

function placeGear(gearId, x, z) {
  if (!GEAR[gearId]) return;
  if (!spotFree(x, z, 0.3)) { Sfx.play('deny'); showToast('🚫', T`Place it on free dirt in your garden.`); return; }
  const def = GEAR[gearId];
  const item = { id: newId(), gear: gearId, x, z };
  if (def.time) item.left = def.time * (1 + petPower('sprinkler') / 100);
  if (gearId === 'lightning_rod') item.uses = def.uses;
  gameState.placed.push(item);
  consume('gear', gearId);
  refreshPlaced();
  Sfx.play('unlock');
  spawnParticles(x, 0.6, z, [0x81D4FA, 0xFFFFFF], 16, 3, 0.09);
  checkAchievement('sprinkler_pro');
  saveGame();
}

function placeEgg(eggId, x, z) {
  if (gameState.placedEggs.length >= MAX_EGGS_PLACED) { Sfx.play('deny'); showToast('🥚', T`You can only hatch ${MAX_EGGS_PLACED} eggs at once.`); return; }
  if (!spotFree(x, z, 0.45)) { Sfx.play('deny'); showToast('🚫', T`Put the egg on free dirt in your garden.`); return; }
  consume('egg', eggId);
  const e = EGGS[eggId];
  gameState.placedEggs.push({ id: newId(), egg: eggId, x, z, left: e.hatch, total: e.hatch });
  refreshPlaced();
  Sfx.play('plant');
  saveGame();
}

function digUp(p) {
  if (!shovelArmed || shovelArmed.id !== p.id || performance.now() > shovelArmed.until) {
    shovelArmed = { id: p.id, until: performance.now() + 3000 };
    Sfx.play('click');
    if (isFruitTree(p.s) && p.age >= p.grow && teach('tashchit')) shovelArmed.until += 20000;
    else if (isFruitTree(p.s) && p.age >= p.grow) showToast('🌳', T`Bal Tashchit — the Torah says not to destroy fruit trees! Press again only if you really must.`);
    else showToast('⛏️', T`Press again to dig up this ${getSeedData(p.s).name}.`);
    return;
  }
  shovelArmed = null;
  gameState.plants = gameState.plants.filter(x => x !== p);
  removePlantView(p.id);
  Sfx.play('plant');
  spawnParticles(p.x, 0.4, p.z, [0x6D4C41, 0x8D6E63, 0x66BB6A], 20, 3, 0.12);
  saveGame();
}

function pickUpWithTrowel(p) {
  carrying = p;
  removePlantView(p.id);
  Sfx.play('pop');
  showToast('⛏️', T`Carrying ${getSeedData(p.s).name} — press E on free dirt to put it down.`);
}
function dropCarried(x, z) {
  if (!spotFree(x, z, seedRadius(carrying.s), carrying.id)) { Sfx.play('deny'); showToast('🚫', T`Find a free spot in your garden.`); return; }
  const kil = kilayimConflict(carrying.s, x, z, carrying.id);
  if (kil) { Sfx.play('deny'); showToast('🚧', T`Kilayim! Too close to your ${getSeedData(kil.plant.s).name}.`); return; }
  carrying.x = x; carrying.z = z;
  refreshPlantView(carrying);
  plantViewPop(carrying);
  carrying = null;
  consume('gear', 'trowel');
  Sfx.play('plant');
  saveGame();
}

function hatchEgg(e) {
  if (e.left > 0) return;
  const petType = rollEgg(e.egg);
  const def = PETS[petType];
  gameState.placedEggs = gameState.placedEggs.filter(x => x !== e);
  refreshPlaced();
  const pet = { id: newId(), type: petType, name: def.name, age: 0 };
  gameState.pets.push(pet);
  const equippedNow = gameState.equipped.length < MAX_PETS_EQUIPPED;
  if (equippedNow) { gameState.equipped.push(pet.id); spawnPetEntity(pet, e.x, e.z); }
  if (!gameState.petsHatched.includes(petType)) gameState.petsHatched.push(petType);
  Sfx.play('hatch');
  spawnParticles(e.x, 0.6, e.z, [EGGS[e.egg].color, EGGS[e.egg].spot, 0xFFFFFF, 0xFFD54F], 40, 5, 0.12);
  const rar = RARITY[def.rarity];
  setTimeout(() => bigBanner(`${def.emoji} ${def.name}!`, `<span style="color:${rar.color}">${rar.name}</span> • ${describeAbility(def.ability)}${equippedNow ? '' : '<br>' + T`Equip it from the 🐾 Pets menu`}`), 500);
  checkAchievement('first_pet');
  if (gameState.petsHatched.length >= 5) checkAchievement('pet_collector');
  taskEvent('hatch', 1);
  updateHotbar(); saveGame();
}

// ─── Selling ───
// Terumah (the kid picks how much) to the Kohen and Ma'aser (1/10) to the Levi come out first,
// then a blessing — bigger for a more generous Terumah, revealed only after the sale
function terumahPick() { return TERUMAH_CHOICES[gameState.mz.tPick] ? gameState.mz.tPick : 'average'; }
function titheSplit(list) {
  let food = 0, exempt = 0;
  list.forEach(f => { const v = fruitValue(f); if (isFood(f.s)) food += v; else exempt += v; });
  const pick = TERUMAH_CHOICES[terumahPick()];
  const terumah = Math.round(food * pick.frac);
  const maaser = Math.round((food - terumah) * MITZVAH.MAASER);
  const bracha = Math.round(food * pick.bless);
  return { food, exempt, terumah, maaser, bracha, gross: food + exempt, net: food - terumah - maaser + bracha + exempt };
}
// The blessing is a surprise: show it only once the sale is done
function revealBlessing(split) {
  if (!split.food) return;
  setTimeout(() => {
    floatTextScreen(window.innerWidth / 2, window.innerHeight * 0.42, T`✨ Blessing +¢${fmtSheckles(split.bracha)}`);
    Sfx.play('sparkle');
    showToast('✨', T`Terumah ¢${fmtSheckles(split.terumah)} → Kohen • Ma'aser ¢${fmtSheckles(split.maaser)} → Levi • Hashem's blessing +¢${fmtSheckles(split.bracha)}`);
  }, 650);
}
const sellableFruit = f => !f.bk && !f.rv && !f.sv;
function sellFruits(list) {
  list = list.filter(sellableFruit);
  let kept = 0;
  const refund = petPower('refund');
  const split = titheSplit(list);
  const total = split.net;
  list.forEach(f => {
    if (Math.random() * 100 < refund) kept++;
    else gameState.fruits.splice(gameState.fruits.indexOf(f), 1);
  });
  if (split.food > 0) {
    const mz = gameState.mz;
    mz.terumahTotal += split.terumah;
    mz.maaserTotal += split.maaser;
    mz.picks = mz.picks || {};
    mz.picks[terumahPick()] = (mz.picks[terumahPick()] || 0) + 1;
    if ((mz.picks.generous || 0) >= 10) checkAchievement('ayin_yafah');
    mitzvah('maaser', 1);
    revealBlessing(split);
    teach('maaser');
  }
  gameState.sheckles += total;
  gameState.totalEarned += total;
  if (gameState.totalEarned >= 10000) checkAchievement('entrepreneur');
  if (gameState.sheckles >= 1000000) checkAchievement('millionaire');
  if (kept) setTimeout(() => showToast('🐒', kept > 1 ? T`Your monkey kept ${kept} fruit for you!` : T`Your monkey kept 1 fruit for you!`), 600);
  taskEvent('sell', list.length);
  taskEvent('earn', total);
  updateHUD(); updateLeaderboard(); saveGame();
  return total;
}

// ─── Shops: stock restocks on a timer (the same for everyone) ───
function shopSlot(period) { return Math.floor(Date.now() / 1000 / period); }
function slotLeft(period) { return period - Math.floor(Date.now() / 1000) % period; }
function stockFor(list, table, slot, salt) {
  const out = {};
  list.forEach((id, i) => {
    const r = seededRandom(slot * 7919 + i * 104729 + salt);
    r(); const roll = r();
    const def = table === 'seeds' ? getSeedData(id) : GEAR[id];
    if (roll < def.chance) out[id] = def.stock[0] + Math.floor(r() * (def.stock[1] - def.stock[0] + 1));
    else out[id] = 0;
  });
  return out;
}
function seedShopList() {
  const extra = Object.keys(getSeasonalSeeds()).filter(id => !SHOP_SEED_LIST.includes(id));
  return SHOP_SEED_LIST.concat(extra);
}
function currentSeedStock() {
  const slot = shopSlot(SHOP_RESTOCK);
  if (gameState.shop.slot !== slot) { gameState.shop.slot = slot; gameState.shop.seeds = {}; }
  const stock = stockFor(seedShopList(), 'seeds', slot, 11);
  Object.keys(stock).forEach(id => { stock[id] = Math.max(0, stock[id] - (gameState.shop.seeds[id] || 0)); });
  return stock;
}
function currentGearStock() {
  const slot = shopSlot(SHOP_RESTOCK);
  if (gameState.shop.gearSlot !== slot) { gameState.shop.gearSlot = slot; gameState.shop.gear = {}; }
  const stock = stockFor(GEAR_LIST, 'gear', slot, 97);
  Object.keys(stock).forEach(id => { stock[id] = Math.max(0, stock[id] - (gameState.shop.gear[id] || 0)); });
  return stock;
}
function currentEggStock() {
  const slot = shopSlot(EGG_RESTOCK);
  if (gameState.shop.eggSlot !== slot) { gameState.shop.eggSlot = slot; gameState.shop.eggs = []; }
  const r = seededRandom(slot * 31337 + 5);
  const total = EGG_LIST.reduce((a, id) => a + EGGS[id].chance, 0);
  const eggs = [];
  for (let i = 0; i < 3; i++) {
    let x = r() * total;
    let pick = EGG_LIST[0];
    for (const id of EGG_LIST) { x -= EGGS[id].chance; if (x <= 0) { pick = id; break; } }
    eggs.push({ id: pick, bought: gameState.shop.eggs.includes(i) });
  }
  return eggs;
}
let lastSlot = -1;
function checkRestock() {
  const slot = shopSlot(SHOP_RESTOCK);
  if (lastSlot !== -1 && slot !== lastSlot) {
    Sfx.play('restock');
    const stock = currentSeedStock();
    const rare = seedShopList().filter(id => stock[id] > 0 && ['mythical', 'divine', 'prismatic'].includes(getSeedData(id).rarity));
    showToast('🛒', rare.length ? T`Seed Shop restocked — ${rare.map(id => getSeedData(id).emoji + ' ' + getSeedData(id).name).join(', ')} in stock!` : T`The Seed & Gear shops restocked!`);
    if (isPanelOpen('shop-panel')) renderShop();
    updateEggDisplay();
  }
  lastSlot = slot;
}
function updateEggDisplay() {
  if (!eggDisplay) return;
  while (eggDisplay.children.length) { const c = eggDisplay.children.pop(); c.geometry.dispose(); }
  currentEggStock().forEach((e, i) => {
    if (e.bought) return;
    const m = eggMesh(e.id, 0.6);
    m.position.set(-0.9 + i * 0.9, 0, 0);
    eggDisplay.add(m);
  });
}

function buyFromShop(kind, id) {
  if (kind === 'seed') {
    const seed = getSeedData(id);
    if (gameState.sheckles < seed.price || !currentSeedStock()[id]) { Sfx.play('deny'); return false; }
    gameState.sheckles -= seed.price;
    gameState.shop.seeds[id] = (gameState.shop.seeds[id] || 0) + 1;
    gameState.seeds[id] = (gameState.seeds[id] || 0) + 1;
    gameState.selected = 'seed:' + id;
    taskEvent('buy', 1);
  } else if (kind === 'gear') {
    const g = GEAR[id];
    if (gameState.sheckles < g.price || !currentGearStock()[id]) { Sfx.play('deny'); return false; }
    gameState.sheckles -= g.price;
    gameState.shop.gear[id] = (gameState.shop.gear[id] || 0) + 1;
    gameState.gear[id] = (gameState.gear[id] || 0) + (PLACEABLE_GEAR.includes(id) ? 1 : g.uses);
    gameState.selected = 'gear:' + id;
  } else {
    const slotIdx = id;
    const e = currentEggStock()[slotIdx];
    const def = EGGS[e.id];
    if (e.bought || gameState.sheckles < def.price) { Sfx.play('deny'); return false; }
    gameState.sheckles -= def.price;
    gameState.shop.eggs.push(slotIdx);
    gameState.eggs[e.id] = (gameState.eggs[e.id] || 0) + 1;
    gameState.selected = 'egg:' + e.id;
    updateEggDisplay();
  }
  Sfx.play('buy');
  updateHUD(); updateHotbar(); saveGame();
  return true;
}

// ════════════════════════════════════════════
//  PETS — they live in your garden and use their abilities
// ════════════════════════════════════════════
const petEntities = new Map();
// Pets keep the name they hatched with; show default names in the current language
function petName(pet) {
  const d = PETS[pet.type];
  if (pet.name === 'Buddy' || pet.name === T('Buddy')) return T('Buddy');
  if (d && (pet.name === d._en || pet.name === d.name)) return d.name;
  return pet.name;
}
function petLevel(pet) { return 1 + Math.min(99, Math.floor((pet.age || 0) / 300)); }
function petStrength(pet) { return 1 + (petLevel(pet) - 1) * 0.02; }
function equippedPets() { return gameState.equipped.map(id => gameState.pets.find(p => p.id === id)).filter(Boolean); }
function petPower(type) {
  let s = 0;
  for (const pet of equippedPets()) {
    const a = PETS[pet.type] && PETS[pet.type].ability;
    if (a && a.type === type) s += (a.pct || 0) * petStrength(pet);
  }
  return s;
}
function randomGardenSpot() {
  return { x: MY_GARDEN.x + (Math.random() - 0.5) * 2 * (BED_X1 - 0.5), z: MY_GARDEN.z + (Math.random() - 0.5) * 2 * (BED_Z - 0.5) };
}
function spawnPetEntity(pet, x, z) {
  if (petEntities.has(pet.id)) return;
  const model = buildPetModel(pet.type);
  const spot = x != null ? { x, z } : randomGardenSpot();
  model.position.set(spot.x, 0, spot.z);
  const def = PETS[pet.type];
  const label = textSprite(`${def.emoji} ${petName(pet)}`);
  label.scale.multiplyScalar(0.55);
  label.position.y = (model.userData.height || 0.8) + 0.35 + (model.userData.mode === 'fly' ? 1 : 0);
  model.add(label);
  scene.add(model);
  petEntities.set(pet.id, { pet, model, pos: new THREE.Vector3(spot.x, 0, spot.z), target: null, wait: 1 + Math.random() * 3,
    timer: (def.ability.every || 0) * (0.3 + Math.random() * 0.5), state: 'wander', act: 0, hop: 0, walk: Math.random() * 6 });
}
function syncPetEntities() {
  const want = new Set(gameState.equipped);
  [...petEntities.keys()].forEach(id => { if (!want.has(id)) { scene.remove(petEntities.get(id).model); petEntities.delete(id); } });
  equippedPets().forEach(p => spawnPetEntity(p));
}

function updatePets(dt, time) {
  for (const e of petEntities.values()) {
    const def = PETS[e.pet.type];
    const a = def.ability;
    const u = e.model.userData;
    e.pet.age = (e.pet.age || 0) + dt;
    // Ability timer
    if (a.every && e.state === 'wander') {
      e.timer -= dt * petStrength(e.pet);
      if (e.timer <= 0) { e.timer = a.every; startPetAbility(e, a); }
    }
    let moving = false;
    if (e.state === 'act') {
      e.act -= dt;
      u.torso && (u.torso.rotation.z = -0.3 + Math.sin(time * 25) * 0.1);
      if (Math.random() < dt * 20) spawnParticles(e.pos.x + 0.3, 0.2, e.pos.z, a.type === 'dig' ? 0x8D6E63 : 0xFFF59D, 1, 2, 0.08);
      if (e.act <= 0) { finishPetAbility(e, a); e.state = 'wander'; if (u.torso) u.torso.rotation.z = 0; }
    } else {
      if (!e.target) {
        e.wait -= dt;
        if (e.wait <= 0) { e.target = randomGardenSpot(); e.wait = 2 + Math.random() * 5; }
      }
      if (e.target) {
        const dx = e.target.x - e.pos.x, dz = e.target.z - e.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) {
          e.target = null;
          if (e.state === 'goto') { e.state = 'act'; e.act = 1.6; }
        } else {
          const sp = (e.state === 'goto' ? 3.2 : 1.8) * dt;
          e.pos.x += dx / d * Math.min(sp, d); e.pos.z += dz / d * Math.min(sp, d);
          let diff = Math.atan2(dx, dz) - Math.PI / 2 - e.model.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          e.model.rotation.y += diff * Math.min(1, dt * 8);
          moving = true;
        }
      }
    }
    e.walk += dt * (moving ? 12 : 0);
    const sw = moving ? Math.sin(e.walk) * 0.6 : 0;
    u.legs.forEach((l, i) => { l.rotation.z = lerp(l.rotation.z, (i % 2 ? sw : -sw) * (i < 2 ? 1 : -1), 0.3); });
    if (u.tail) u.tail.rotation.x = Math.sin(time * 7 + e.walk) * 0.5;
    u.wings.forEach((w, i) => { w.rotation.x = Math.sin(time * (u.mode === 'fly' ? 40 : 6)) * (i ? 0.6 : -0.6); });
    let y = 0;
    if (u.mode === 'fly') y = 1.1 + Math.sin(time * 2 + e.walk) * 0.2;
    else if (u.mode === 'hop' && moving) y = Math.abs(Math.sin(e.walk * 0.6)) * 0.25;
    if (u.mode === 'crawl' && u.torso) u.torso.scale.x = 1 + Math.sin(time * 4) * (moving ? 0.08 : 0.02);
    if (e.hop > 0) { e.hop = Math.max(0, e.hop - dt * 2.5); y += Math.sin(e.hop * Math.PI) * 0.6; }
    e.model.position.set(e.pos.x, y, e.pos.z);
  }
}

function startPetAbility(e, a) {
  let target = null;
  if (a.type === 'mutate') {
    const t = randomFruit(m => !m.includes(a.mut) && !(a.mut === 'gold' && m.includes('rainbow')));
    if (!t) return;
    e.plan = t; target = { x: t.p.x, z: t.p.z };
  } else if (a.type === 'water' || a.type === 'advance') {
    const plants = gameState.plants.filter(p => p.age < p.grow || getSeedData(p.s).multi);
    if (!plants.length) return;
    const p = plants[Math.floor(Math.random() * plants.length)];
    e.plan = p; target = { x: p.x, z: p.z };
  } else {
    target = randomGardenSpot();
  }
  e.target = { x: target.x + 0.6, z: target.z };
  e.state = 'goto';
}

function finishPetAbility(e, a) {
  const def = PETS[e.pet.type];
  const strength = petStrength(e.pet);
  const x = e.pos.x, z = e.pos.z;
  if (a.type === 'dig') {
    const list = SHOP_SEED_LIST;
    let i = 0;
    while (i < list.length - 1 && Math.random() < 0.45 + a.boost * 0.07) i++;
    const id = list[i];
    gameState.seeds[id] = (gameState.seeds[id] || 0) + 1;
    floatText(x, 1.6, z, T`${getSeedData(id).emoji} +1 seed!`, '#FFE082');
    showToast(def.emoji, T`${petName(e.pet)} dug up a ${getSeedData(id).emoji} ${getSeedData(id).name} seed!`);
    Sfx.play(e.pet.type === 'dog' || e.pet.type === 'golden_lab' ? 'bark' : 'pop');
    gameState.petFinds = (gameState.petFinds || 0) + 1;
    if (gameState.petFinds >= 5) checkAchievement('best_friends');
    updateHotbar();
  } else if (a.type === 'coins') {
    const c = Math.round(a.amount * strength);
    gameState.sheckles += c; gameState.totalEarned += c;
    floatText(x, 1.4, z, `+¢${fmtSheckles(c)}`, '#B9F6CA');
    Sfx.play('coin'); updateHUD();
  } else if (a.type === 'mutate' && e.plan) {
    if (addMutation(e.plan.m, a.mut)) {
      floatText(x, 1.8, z, `${MUTATIONS[a.mut].emoji} ${MUTATIONS[a.mut].name}!`, MUTATIONS[a.mut].color);
      showToast(def.emoji, T`${petName(e.pet)} made a fruit ${MUTATIONS[a.mut].name}!`);
      Sfx.play('sparkle');
    }
  } else if ((a.type === 'water' || a.type === 'advance') && e.plan && gameState.plants.includes(e.plan)) {
    const p = e.plan, seed = getSeedData(p.s);
    const secs = a.type === 'water' ? p.grow * 0.08 : a.secs * strength;
    if (p.age < p.grow) p.age = Math.min(p.grow, p.age + secs);
    else if (seed.multi) p.fruits.forEach(f => { if (f) f.age = Math.min(seed.fruitTime, f.age + secs); });
    if (a.type === 'water') { p.water = 60; spawnParticles(p.x, 1.5, p.z, [0x4FC3F7, 0xB3E5FC], 14, 1, 0.07, { down: true, spread: 1 }); }
    floatText(x, 1.6, z, a.type === 'water' ? T`💧 Watered!` : T`⏩ Growth!`, '#B3E5FC');
    refreshPlantView(p);
  }
  e.plan = null;
  e.hop = 1;
  saveGame();
}

function petPetAt(e) {
  e.hop = 1;
  Sfx.play(['dog', 'golden_lab'].includes(e.pet.type) ? 'bark' : 'pop');
  spawnParticles(e.pos.x, 1, e.pos.z, 0xFF5C8A, 10, 3, 0.12);
  floatText(e.pos.x, 1.8, e.pos.z, '❤️', '#FF8A80');
  checkAchievement('dog_lover');
  taskEvent('pet', 1);
}

// ════════════════════════════════════════════
//  ACHIEVEMENTS & TASKS
// ════════════════════════════════════════════
const ACHIEVEMENTS = {
  first_sprout:    { name: T`First Sprout`,     emoji: '🌱', desc: T`Plant your first seed` },
  green_thumb:     { name: T`Green Thumb`,      emoji: '🌻', desc: T`Harvest 10 fruits` },
  master_gardener: { name: T`Master Gardener`,  emoji: '🏆', desc: T`Harvest 50 fruits` },
  entrepreneur:    { name: T`Entrepreneur`,     emoji: '💰', desc: T`Earn ¢10,000 selling fruit` },
  millionaire:     { name: T`Millionaire`,      emoji: '💵', desc: T`Have ¢1,000,000 at once` },
  rare_find:       { name: T`Rare Find`,        emoji: '💎', desc: T`Harvest a Rare (or better) plant` },
  mythic:          { name: T`Mythical Grower`,  emoji: '🦄', desc: T`Harvest a Mythical (or better) plant` },
  prismatic:       { name: T`Jack & the Beanstalk`, emoji: '🌿', desc: T`Harvest a Prismatic Beanstalk` },
  variety_pack:    { name: T`Variety Pack`,     emoji: '🌈', desc: T`Harvest 8 different kinds of plants` },
  full_garden:     { name: T`Jungle`,           emoji: '🌳', desc: T`Have 50 plants in your garden` },
  heavyweight:     { name: T`Heavyweight`,      emoji: '🏋️', desc: T`Harvest a fruit twice its normal weight` },
  golden_touch:    { name: T`Golden Touch`,     emoji: '✨', desc: T`Harvest a Gold fruit` },
  over_rainbow:    { name: T`Over the Rainbow`, emoji: '🌈', desc: T`Harvest a Rainbow fruit` },
  rain_dancer:     { name: T`Rain Dancer`,      emoji: '🌧️', desc: T`Harvest a Wet fruit` },
  frozen_solid:    { name: T`Frozen Solid`,     emoji: '🧊', desc: T`Harvest a Frozen fruit` },
  shocking:        { name: T`Shocking!`,        emoji: '⚡', desc: T`Get a fruit struck by lightning` },
  celestial:       { name: T`Star Struck`,      emoji: '🌠', desc: T`Get a Celestial fruit from a meteor` },
  night_owl:       { name: T`Night Owl`,        emoji: '🦉', desc: T`Harvest a Moonlit fruit` },
  sprinkler_pro:   { name: T`Sprinkler Pro`,    emoji: '💦', desc: T`Place gear in your garden` },
  first_pet:       { name: T`New Friend`,       emoji: '🐣', desc: T`Hatch a pet egg` },
  pet_collector:   { name: T`Pet Collector`,    emoji: '🐾', desc: T`Hatch 5 different pets` },
  dog_lover:       { name: T`Pet Lover`,        emoji: '❤️', desc: T`Pet one of your pets` },
  best_friends:    { name: T`Best Friends`,     emoji: '🦴', desc: T`Your pets dig up 5 treasures` },
  fashion_forward: { name: T`Fashion Forward`,  emoji: '🎭', desc: T`Buy an outfit in the wardrobe` },
  task_master:     { name: T`Task Master`,      emoji: '📋', desc: T`Finish 10 garden tasks` },
  peah_keeper:     { name: T`Peah Keeper`,      emoji: '💙', desc: T`Leave 5 Peah gifts for the poor` },
  gleaner_friend:  { name: T`Rut's Friend`,     emoji: '🌾', desc: T`Leave 5 Leket fruits for Rut` },
  forgot_mitzvah:  { name: T`Mitzvah by Forgetting`, emoji: '🧺', desc: T`Keep Shichecha — the mitzvah you do by forgetting!` },
  kilayim_keeper:  { name: T`Neat Rows`,        emoji: '🚧', desc: T`Keep different kinds apart 10 times (Kilayim)` },
  orlah_patience:  { name: T`Patient Planter`,  emoji: '🌳', desc: T`Wait out 3 years of Orlah on a tree` },
  bikkurim_first:  { name: T`First Fruits`,     emoji: '🎀', desc: T`Bring Bikkurim to the Kohen` },
  seven_species:   { name: T`Seven Species`,    emoji: '✡️', desc: T`Bring Bikkurim from all Seven Species` },
  tither:          { name: T`Ma'aser Giver`,    emoji: '🪙', desc: T`Give Terumah & Ma'aser on 10 sales` },
  ayin_yafah:      { name: T`Generous Eye`,     emoji: '🤲', desc: T`Give a generous Terumah (1/40) 10 times` },
  shemitah_rest:   { name: T`Shabbat for the Land`, emoji: '🌿', desc: T`Keep a Shemitah year` },
  mitzvah_100:     { name: T`100 Mitzvah Stars`, emoji: '⭐', desc: T`Earn 100 mitzvah stars` },
};
function checkAchievement(id) {
  if (!ACHIEVEMENTS[id] || gameState.achievements.includes(id)) return;
  gameState.achievements.push(id);
  const a = ACHIEVEMENTS[id];
  setTimeout(() => {
    Sfx.play('quest');
    const el = document.createElement('div');
    el.className = 'achieve-pop';
    el.innerHTML = `<span class="ap-emoji">${a.emoji}</span><div><div class="ap-label">${T`Badge earned!`}</div><div class="ap-name">${a.name}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('exiting'), 2800);
    setTimeout(() => el.remove(), 3300);
  }, 900);
  saveGame();
}

// Rewards grow with how rich you are, but slowly (square root) so they stay fair
function wealthScale() { return Math.round(clamp(Math.sqrt((gameState.totalEarned + gameState.sheckles) / 300), 1, 5000) * 10) / 10; }
function taskText(t) {
  if (t.tutorial) { const tt = TUTORIAL_TASKS.find(x => x.type === t.type); return tt ? tt.text : t.text; }
  const s = t.seedId && getSeedData(t.seedId), g = t.goal;
  switch (t.type) {
    case 'plant': return T`Plant ${g} seeds`;
    case 'harvest': return s ? T`Harvest ${g} ${s.emoji} ${s.name}` : T`Harvest ${g} fruits`;
    case 'sell': return T`Sell ${g} fruits to Steven`;
    case 'earn': return T`Earn ¢${fmtSheckles(g)} selling`;
    case 'special': return T`Harvest a mutated fruit ✨`;
    case 'water': return T`Water 3 plants with the 🚿 can`;
    case 'pet': return T`Give one of your pets a pet`;
  }
  return t.text;
}
function makeTask() {
  const r = Math.random();
  const sc = wealthScale();
  const owned = Object.keys(gameState.seeds).concat(gameState.plants.map(p => p.s)).filter(id => getSeedData(id));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let t;
  if (r < 0.18) { const g = 3 + Math.floor(Math.random() * 4); t = { type: 'plant', goal: g, text: T`Plant ${g} seeds`, icon: '🌱', reward: Math.round(15 * g * sc) }; }
  else if (r < 0.4) { const g = 5 + Math.floor(Math.random() * 10); t = { type: 'harvest', goal: g, text: T`Harvest ${g} fruits`, icon: '🧺', reward: Math.round(15 * g * sc) }; }
  else if (r < 0.55 && owned.length) { const id = pick(owned); const s = getSeedData(id); const g = 2 + Math.floor(Math.random() * 3); t = { type: 'harvest', seedId: id, goal: g, text: T`Harvest ${g} ${s.emoji} ${s.name}`, icon: s.emoji, reward: Math.round(Math.max(40 * sc, s.sell * g)) }; }
  else if (r < 0.7) { const g = 8 + Math.floor(Math.random() * 15); t = { type: 'sell', goal: g, text: T`Sell ${g} fruits to Steven`, icon: '💰', reward: Math.round(10 * g * sc) }; }
  else if (r < 0.8) { const g = Math.round(300 * sc * (1 + Math.floor(Math.random() * 4))); t = { type: 'earn', goal: g, text: T`Earn ¢${fmtSheckles(g)} selling`, icon: '🪙', reward: Math.round(g * 0.25) }; }
  else if (r < 0.9) { t = { type: 'special', goal: 1, text: T`Harvest a mutated fruit ✨`, icon: '🌈', reward: Math.round(200 * sc) }; }
  else if (r < 0.95 && gameState.gear.watering_can) { const g = 3; t = { type: 'water', goal: g, text: T`Water 3 plants with the 🚿 can`, icon: '🚿', reward: Math.round(100 * sc) }; }
  else { t = { type: 'pet', goal: 1, text: T`Give one of your pets a pet`, icon: '🐾', reward: Math.round(40 * sc) }; }
  t.progress = 0;
  return t;
}
function fillTasks() {
  if (!Array.isArray(gameState.tasks)) gameState.tasks = [];
  if (gameState.tutorialStep < TUTORIAL_TASKS.length) {
    if (!gameState.tasks.length) gameState.tasks.push(Object.assign({ progress: 0, reward: 25, tutorial: true }, TUTORIAL_TASKS[gameState.tutorialStep]));
  } else while (gameState.tasks.length < 3) gameState.tasks.push(makeTask());
  renderTasks();
}
function taskEvent(type, amount, info) {
  info = info || {};
  let changed = false;
  gameState.tasks.forEach(t => {
    if (t.done) return;
    let match = t.type === type;
    if (t.type === 'special' && type === 'harvest' && info.mutation) match = true;
    if (t.seedId && t.seedId !== info.seedId) match = false;
    if (!match) return;
    t.progress = Math.min(t.goal, t.progress + amount);
    changed = true;
    if (t.progress >= t.goal) completeTask(t);
  });
  if (changed) renderTasks();
}
function completeTask(t) {
  t.done = true;
  setTimeout(() => {
    Sfx.play('quest');
    gameState.sheckles += t.reward;
    gameState.tasksDone = (gameState.tasksDone || 0) + 1;
    showToast('✅', T`Task done! +¢${fmtSheckles(t.reward)}`);
    const el = $('#tasks-list');
    const r = el ? el.getBoundingClientRect() : { left: 80, top: 160 };
    coinFly(r.left + 60, r.top + 20, 5);
    if (t.tutorial) gameState.tutorialStep++;
    if (gameState.tasksDone >= 10) checkAchievement('task_master');
    setTimeout(() => {
      gameState.tasks = gameState.tasks.filter(x => x !== t);
      fillTasks();
      if (t.tutorial && gameState.tutorialStep >= TUTORIAL_TASKS.length) bigBanner(T`🎓 You did it!`, T`Keep growing, collect mutations, hatch pets and get rich!`);
      saveGame();
    }, 900);
    renderTasks(); updateHUD();
  }, 350);
}

// ─── Guide hand: points at what to do next during the tutorial ───
let hintTarget = null, hintTimer = 0;
function guideTargetPos() {
  let target = hintTimer > 0 ? hintTarget : null;
  const t = gameState.tasks[0];
  if (!target && t && t.tutorial && !t.done) {
    const hasSeeds = Object.keys(gameState.seeds).length > 0;
    if (t.type === 'plant') target = hasSeeds ? 'garden' : 'seeds';
    else if (t.type === 'harvest') target = 'ripe';
    else if (t.type === 'sell') target = 'sell';
    else target = 'seeds';
  }
  if (!target && !gameState.plants.length && !Object.keys(gameState.seeds).length) target = 'seeds';
  if (!target) return null;
  if (STALLS[target]) return { x: STALLS[target].x, y: 4.6, z: STALL_Z };
  if (target === 'garden') {
    if (inMyGarden(playerPos.x, playerPos.z)) return null;
    return { x: MY_GARDEN.x - 4, y: 2.2, z: MY_GARDEN.z - MY_GARDEN.dir * 6 };
  }
  if (target === 'ripe') {
    const p = gameState.plants.find(plantRipe);
    return p ? { x: p.x, y: 2.6, z: p.z } : null;
  }
  return null;
}
function updateGuide(time, dt) {
  if (hintTimer > 0) hintTimer -= dt;
  const g = started ? guideTargetPos() : null;
  guideArrow.visible = !!g;
  if (g) guideArrow.position.set(g.x, g.y + 0.4 + Math.abs(Math.sin(time * 4)) * 0.5, g.z);
}
// ─── Weather & day/night ───
const skyCols = {
  dayTop: new THREE.Color(0x0AA2FF), dayHor: new THREE.Color(0xB5EAFF),
  setTop: new THREE.Color(0x4a5fa8), setHor: new THREE.Color(0xffa36b),
  nightTop: new THREE.Color(0x0b1030), nightHor: new THREE.Color(0x1e2a5a),
  rainTop: new THREE.Color(0x5d6b7a), rainHor: new THREE.Color(0x9aa7b3),
};
const tmpTop = new THREE.Color(), tmpHor = new THREE.Color(), tmpC = new THREE.Color();
const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();

let rainBlend = 0, bloodBlend = 0, frostBlend = 0, meteorBlend = 0;
const BLOOD_TOP = new THREE.Color(0x3a0008), BLOOD_HOR = new THREE.Color(0x8b1a1a), FROST_HOR = new THREE.Color(0xd8ecff), METEOR_TOP = new THREE.Color(0x2a0a4a);
const GROUND_FROST = new THREE.Color(0xe8f4ff), WHITE = new THREE.Color(0xffffff);
function updateDayNight(dt) {
  dayTime = globalDayTime();
  // Sun angle: rises at 0.25, sets at 0.75
  const ang = (dayTime - 0.25) * Math.PI * 2;
  const sunH = Math.sin(ang);
  sunDir.set(Math.cos(ang) * 0.8, sunH, 0.45).normalize();
  const day = clamp((sunH + 0.15) / 0.4, 0, 1);       // 0 night → 1 day
  const sunset = clamp(1 - Math.abs(sunH) / 0.35, 0, 1) * (sunH > -0.25 ? 1 : 0);
  nightFactor = 1 - day;
  const wId = weather ? weather.id : null;
  rainBlend = lerp(rainBlend, { rain: 0.8, thunderstorm: 1, frost: 0.4, blood_moon: 0.2 }[wId] || 0, Math.min(1, dt * 0.5));
  bloodBlend = lerp(bloodBlend, wId === 'blood_moon' ? 1 : 0, Math.min(1, dt * 0.5));
  frostBlend = lerp(frostBlend, wId === 'frost' ? 1 : 0, Math.min(1, dt * 0.3));
  meteorBlend = lerp(meteorBlend, wId === 'meteor_shower' ? 1 : 0, Math.min(1, dt * 0.5));

  tmpTop.copy(skyCols.nightTop).lerp(skyCols.dayTop, day).lerp(skyCols.setTop, sunset * 0.5);
  tmpHor.copy(skyCols.nightHor).lerp(skyCols.dayHor, day).lerp(skyCols.setHor, sunset * 0.75);
  tmpTop.lerp(tmpC.copy(skyCols.rainTop).multiplyScalar(0.3 + day * 0.7), rainBlend * 0.8);
  tmpHor.lerp(tmpC.copy(skyCols.rainHor).multiplyScalar(0.3 + day * 0.7), rainBlend * 0.8);
  tmpTop.lerp(BLOOD_TOP, bloodBlend * 0.8).lerp(METEOR_TOP, meteorBlend * 0.6);
  tmpHor.lerp(BLOOD_HOR, bloodBlend * 0.7).lerp(FROST_HOR, frostBlend * 0.5);
  if (flash > 0) { tmpTop.lerp(WHITE, flash * 0.7); tmpHor.lerp(WHITE, flash * 0.7); }
  skyMat.uniforms.topColor.value.copy(tmpTop);
  skyMat.uniforms.horizonColor.value.copy(tmpHor);
  skyMat.uniforms.sunDir.value.copy(sunDir);
  skyMat.uniforms.sunGlow.value.setRGB(1, 0.85 - sunset * 0.3, 0.6 - sunset * 0.3).multiplyScalar(day * (1 - rainBlend * 0.8));
  scene.fog.color.copy(tmpHor);
  scene.fog.far = lerp(140, 70, rainBlend);

  const rainDim = 1 - rainBlend * 0.35;
  sunLight.intensity = (0.35 + day * 2.4) * (1 - rainBlend * 0.7);
  sunLight.color.setRGB(1, 0.92 - sunset * 0.25, 0.82 - sunset * 0.35).lerp(tmpC.setRGB(0.55, 0.65, 1), nightFactor);
  // After sunset the same light becomes moonlight from the opposite side of the sky
  const lightDir = sunH > -0.05 ? sunDir : moonDir.set(-sunDir.x, -sunDir.y, sunDir.z);
  sunLight.position.set(playerPos.x + lightDir.x * 50, Math.max(8, lightDir.y * 50), playerPos.z + lightDir.z * 50);
  sunLight.target.position.set(playerPos.x, 0, playerPos.z);
  hemiLight.intensity = (0.55 + day * 0.4) * rainDim + bloodBlend * 0.25 + meteorBlend * 0.2;
  hemiLight.color.copy(tmpTop).lerp(tmpC.set(0xffffff), 0.35 + day * 0.25);
  hemiLight.groundColor.setRGB(0.25 + day * 0.15, 0.3 + day * 0.18, 0.2 + day * 0.05);
  ambientLight.intensity = (0.26 + day * 0.06) * rainDim + flash * 1.5;
  if (bloodBlend > 0.01) hemiLight.color.lerp(tmpC.set(0xff4040), bloodBlend * 0.6);
  MATS.ground.color.copy(MATS.groundBase).lerp(GROUND_FROST, frostBlend * 0.6);
  ambientLight.color.setRGB(0.55 + day * 0.45, 0.65 + day * 0.35, 1);

  // Sun / moon discs follow the camera
  sunMesh.position.copy(camera.position).addScaledVector(sunDir, 350);
  sunMesh.lookAt(camera.position);
  sunMesh.material.opacity = clamp(sunH * 5 + 0.5, 0, 1) * (1 - rainBlend);
  moonMesh.position.copy(camera.position).addScaledVector(sunDir, -350);
  moonMesh.lookAt(camera.position);
  moonMesh.material.opacity = clamp(-sunH * 5 + 0.5, 0, 1) * (1 - rainBlend * 0.8);
  moonMesh.material.color.setHex(0xe8ecff).lerp(tmpC.set(0xff2a2a), bloodBlend);
  stars.position.copy(camera.position);
  stars.material.opacity = Math.max(0, nightFactor - 0.25) * (1 - rainBlend);

  MATS.lamp.emissive.setRGB(1, 0.75, 0.3).multiplyScalar(nightFactor * 1.2);
  Sfx.setCalm(nightFactor > 0.6);
}

function pushOut(pos, c, radius) {
  const dx = pos.x - c.x, dz = pos.z - c.z;
  const d = Math.hypot(dx, dz);
  const min = c.r + radius;
  if (d < min && d > 0.0001) { pos.x = c.x + dx / d * min; pos.z = c.z + dz / d * min; }
}

const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), moveDir = new THREE.Vector3();

function updatePlayer(dt) {
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  rgt.set(Math.cos(yaw), 0, -Math.sin(yaw));
  moveDir.set(0, 0, 0);
  if (keys.f) moveDir.add(fwd);
  if (keys.b) moveDir.sub(fwd);
  if (keys.l) moveDir.sub(rgt);
  if (keys.r) moveDir.add(rgt);
  let analog = 1;
  if (touchMove.x || touchMove.y) {
    moveDir.addScaledVector(rgt, touchMove.x).addScaledVector(fwd, -touchMove.y);
    analog = Math.min(1, Math.hypot(touchMove.x, touchMove.y));
  }
  const manual = moveDir.lengthSq() > 0.0001;
  if (manual) moveTarget = null;
  else if (moveTarget) {
    moveDir.set(moveTarget.x - playerPos.x, 0, moveTarget.z - playerPos.z);
    const d = moveDir.length();
    if (d <= moveTarget.reach) {
      const act = moveTarget.action;
      moveTarget = null;
      moveDir.set(0, 0, 0);
      if (act) act();
    }
  }
  const moving = moveDir.lengthSq() > 0.0001;
  const running = keys.run || (touchMove.x || touchMove.y ? analog > 0.92 : false) || (moveTarget && moveTarget.far);
  let speed = WALK_SPEED * (running ? RUN_MULT : 1) * (gameState.perks.speedy ? 1.25 : 1);
  if (moving) moveDir.normalize().multiplyScalar(speed * (manual ? analog : 1));
  // Smooth acceleration
  const accel = Math.min(1, dt * (moving ? 12 : 16));
  playerVel.x = lerp(playerVel.x, moveDir.x, accel);
  playerVel.z = lerp(playerVel.z, moveDir.z, accel);
  playerPos.x += playerVel.x * dt;
  playerPos.z += playerVel.z * dt;
  for (const c of colliders) pushOut(playerPos, c, 0.35);
  playerPos.x = clamp(playerPos.x, -WORLD_X, WORLD_X);
  playerPos.z = clamp(playerPos.z, -WORLD_Z, WORLD_Z);

  playerVY -= GRAVITY * dt;
  playerY += playerVY * dt;
  if (playerY <= 0) { playerY = 0; playerVY = 0; onGround = true; }

  const spd = Math.hypot(playerVel.x, playerVel.z);
  if (playerModel) {
    if (spd > 0.3) {
      const target = Math.atan2(playerVel.x, playerVel.z);
      let diff = target - playerFacing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      playerFacing += diff * Math.min(1, dt * 14);
    }
    playerModel.rotation.y = playerFacing;
    const u = playerModel.userData;
    if (spd > 0.3 && onGround) {
      walkCycle += dt * spd * 2.1;
      const sw = Math.sin(walkCycle) * Math.min(0.9, spd * 0.12);
      if (u.armL) u.armL.rotation.x = sw;
      if (u.armR) u.armR.rotation.x = -sw;
      if (u.legL) u.legL.rotation.x = -sw;
      if (u.legR) u.legR.rotation.x = sw;
      playerModel.position.set(playerPos.x, playerY + Math.abs(Math.cos(walkCycle)) * 0.06, playerPos.z);
      if (spd > 7 && Math.random() < dt * 10) spawnParticles(playerPos.x, 0.1, playerPos.z, 0xC8B79A, 1, 1, 0.08, { up: 1, life: 0.4 });
    } else {
      const k = Math.min(1, dt * 10);
      ['armL', 'armR', 'legL', 'legR'].forEach(n => { if (u[n]) u[n].rotation.x = lerp(u[n].rotation.x, 0, k); });
      if (!onGround) {
        if (u.armL) u.armL.rotation.z = -0.6;
        if (u.armR) u.armR.rotation.z = 0.6;
      }
      const breathe = Math.sin(clock.elapsedTime * 2) * 0.012;
      playerModel.position.set(playerPos.x, playerY + breathe, playerPos.z);
    }
    if (onGround) {
      if (u.armL) u.armL.rotation.z = lerp(u.armL.rotation.z, 0, 0.2);
      if (u.armR) u.armR.rotation.z = lerp(u.armR.rotation.z, 0, 0.2);
    }
  }
}

function jump() {
  if (!onGround) return;
  playerVY = JUMP_FORCE; onGround = false;
  Sfx.play('jump');
}

const camLook = new THREE.Vector3();
function updateCamera(dt, time) {
  if (!started) {
    // Attract mode behind the profile picker: slow orbit around the garden
    const a = time * 0.06;
    camera.position.set(Math.sin(a) * 26, 13, Math.cos(a) * 26);
    camera.lookAt(0, 1, 0);
    return;
  }
  const horiz = Math.cos(pitch) * camDist;
  const tx = playerPos.x + Math.sin(yaw) * horiz;
  const tz = playerPos.z + Math.cos(yaw) * horiz;
  const ty = playerY + PLAYER_HEIGHT + Math.sin(pitch) * camDist;
  const k = 1 - Math.exp(-dt * 10);
  camPos.x = lerp(camPos.x, tx, k);
  camPos.y = lerp(camPos.y, Math.max(0.8, ty), k);
  camPos.z = lerp(camPos.z, tz, k);
  camera.position.copy(camPos);
  camLook.set(playerPos.x, playerY + 1.3, playerPos.z);
  camera.lookAt(camLook);
}


// ════════════════════════════════════════════
//  FOCUS & INTERACTION
// ════════════════════════════════════════════
const PLACEABLE_GEAR = ['basic_sprinkler', 'advanced_sprinkler', 'godly_sprinkler', 'master_sprinkler', 'lightning_rod'];
function probePoint() {
  return { x: playerPos.x + Math.sin(playerFacing) * 1.0, z: playerPos.z + Math.cos(playerFacing) * 1.0 };
}
function computeFocus() {
  for (const [id, st] of Object.entries(STALLS)) {
    if (Math.hypot(playerPos.x - st.x, playerPos.z - (STALL_Z - 2.2)) < STALL_REACH) return { kind: 'stall', id };
  }
  const pr = probePoint();
  const sel = selectedItem();
  if (carrying) {
    const kil = kilayimConflict(carrying.s, pr.x, pr.z, carrying.id);
    return { kind: 'drop', x: pr.x, z: pr.z, ok: spotFree(pr.x, pr.z, seedRadius(carrying.s), carrying.id) && !kil, kil };
  }
  const egg = nearestEgg(pr.x, pr.z, 1.2);
  if (egg) return { kind: 'egg', egg };
  const p = nearestPlant(pr.x, pr.z, REACH);
  if (p) return { kind: 'plant', plant: p };
  for (const e of petEntities.values()) if (Math.hypot(e.pos.x - playerPos.x, e.pos.z - playerPos.z) < 1.3) return { kind: 'pet', id: e.pet.id };
  const it = nearestPlaced(pr.x, pr.z, 0.9);
  if (it) return { kind: 'placed', item: it };
  const gift = nearestGift(pr.x, pr.z, 0.9);
  if (gift) return { kind: 'gift', gift };
  if (sel && (sel.kind === 'seed' || sel.kind === 'egg' || (sel.kind === 'gear' && PLACEABLE_GEAR.includes(sel.id))) && inMyGarden(playerPos.x, playerPos.z)) {
    const r = sel.kind === 'seed' ? seedRadius(sel.id) : 0.4;
    const ok = spotFree(pr.x, pr.z, r);
    const kil = ok && sel.kind === 'seed' ? kilayimConflict(sel.id, pr.x, pr.z) : null;
    return { kind: 'spot', x: pr.x, z: pr.z, ok: ok && !kil && !(sel.kind === 'seed' && isShemitah()), kil };
  }
  return null;
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function focusInfo(f) {
  if (!f) return null;
  const sel = selectedItem();
  if (f.kind === 'stall') {
    const n = { seeds: [T`Shlomo's <b>Seed Shop</b>`, '🌱', T`Shop`], sell: [T`<b>Steven</b> — sell your fruit`, '💰', T`Sell`], gear: [T`<b>Gear Shop</b>`, '⚙️', T`Shop`], pets: [T`<b>Pet Egg Shop</b>`, '🥚', T`Shop`], temple: [T`<b>Kohen</b> — Bikkurim & Revai`, '🏛️', T`Visit`] }[f.id];
    return { icon: n[1], text: n[0], act: n[2] };
  }
  if (f.kind === 'drop') return { icon: f.kil ? '🚧' : '⛏️', text: f.ok ? T`Put the plant down here` : f.kil ? T`<b>Kilayim</b> — too close to the ${getSeedData(f.kil.plant.s).name}` : T`Find a free spot in your garden`, act: T`Place`, dim: !f.ok };
  if (f.kind === 'gift') return { icon: '🌾', text: T`<b>Leket</b> — fallen fruit is for the poor. Leave it!`, act: T`Leave`, dim: true };
  if (f.kind === 'pet') { const e = petEntities.get(f.id); const d = PETS[e.pet.type]; return { icon: '❤️', text: T`Pet <b>${petName(e.pet)}</b> <span class="dim">${d.emoji} Age ${petLevel(e.pet)}</span>`, act: T`Pet` }; }
  if (f.kind === 'egg') { const e = f.egg; return e.left > 0 ? { icon: '🥚', text: T`${EGGS[e.egg].name} — hatches in ${fmtTime(e.left / (1 + petPower('eggs') / 100))}`, act: T`Wait`, dim: true } : { icon: '🐣', text: T`Hatch your <b>${EGGS[e.egg].name}</b>!`, act: T`Hatch` }; }
  if (f.kind === 'placed') { const it = f.item, d = GEAR[it.gear]; return { icon: d.emoji, text: it.left != null ? T`<b>${d.name}</b> — ${fmtTime(it.left)} left` : T`<b>${d.name}</b> — catches ${it.uses} more bolts`, act: T`Info`, dim: true }; }
  if (f.kind === 'spot') {
    if (sel.kind === 'seed') {
      const s = getSeedData(sel.id);
      if (isShemitah()) return { icon: '🌿', text: T`<b>Shemitah</b> — the land rests. Plant again in ${fmtTime(yearSecondsLeft())}`, act: T`Rest`, dim: true };
      if (f.kil) return { icon: '🚧', text: T`<b>Kilayim</b> — too close to your ${getSeedData(f.kil.plant.s).name}. Leave some space!`, act: T`Plant`, dim: true };
      return { icon: s.emoji, text: f.ok ? (inPeah(f.x, f.z) ? T`Plant <b>${s.name}</b> in the 💙 Peah corner <span class="dim">(${gameState.seeds[sel.id]} left)</span>` : T`Plant <b>${s.name}</b> <span class="dim">(${gameState.seeds[sel.id]} left)</span>`) : T`Too close to something — move a little`, act: T`Plant`, dim: !f.ok };
    }
    if (sel.kind === 'egg') return { icon: '🥚', text: f.ok ? T`Place <b>${EGGS[sel.id].name}</b>` : T`Find a free spot`, act: T`Place`, dim: !f.ok };
    return { icon: GEAR[sel.id].emoji, text: f.ok ? T`Place <b>${GEAR[sel.id].name}</b>` : T`Find a free spot`, act: T`Place`, dim: !f.ok };
  }
  const p = f.plant, seed = getSeedData(p.s);
  const mine = gameState.plants.includes(p);
  if (!mine) return null;
  if (sel && sel.kind === 'gear' && sel.id === 'shovel') return { icon: '⛏️', text: isFruitTree(p.s) ? T`Dig up <b>${seed.name}</b> <span class="dim">— Bal Tashchit!</span>` : T`Dig up <b>${seed.name}</b>`, act: T`Dig` };
  if (sel && sel.kind === 'gear' && sel.id === 'trowel') return { icon: '⛏️', text: T`Pick up <b>${seed.name}</b> to move it`, act: T`Move` };
  if (sel && sel.kind === 'gear' && sel.id === 'watering_can') return { icon: '🚿', text: T`Water <b>${seed.name}</b> <span class="dim">(${gameState.gear.watering_can} uses)</span>`, act: T`Water` };
  const ripe = ripeFruitCount(p);
  const block = harvestBlock(p);
  if (block === 'orlah' && p.age >= p.grow) return { icon: '🚫', text: T`<b>Orlah</b> — tree year ${treeYear(p)} of 3. Its fruit isn't for us yet!`, act: T`Info`, dim: true };
  if (ripe && block === 'peah') return { icon: '💙', text: T`<b>Peah</b> — this corner is for the poor. Leave it!`, act: T`Leave`, dim: true };
  if (ripe && block === 'shich') return { icon: '🧺', text: T`<b>Shichecha</b> — you forgot it. Don't go back!`, act: T`Leave`, dim: true };
  if (ripe && needsReed(p)) return { icon: '🎀', text: T`First ${seed.name}! Tie a reed: <b>"These are Bikkurim!"</b>`, act: T`Tie` };
  if (ripe && orlahPhase(p) === 'revai') return { icon: '🏛️', text: T`Pick <b>${ripe} Neta Revai</b> ${seed.emoji} — bring them to the Kohen`, act: T`Harvest` };
  if (ripe) {
    if (!seed.multi) return { icon: '🧺', text: T`Harvest ${fruitLabel({ s: p.s, m: p.m })} <span class="dim">${p.kg}kg • ¢${fmtSheckles(fruitValue({ s: p.s, kg: p.kg, m: p.m }))}</span>`, act: T`Harvest` };
    return { icon: '🧺', text: T`Harvest <b>${ripe} ${seed.emoji} ${seed.name}</b>`, act: T`Harvest` };
  }
  const rate = growthRate(p);
  if (p.age < p.grow) return { icon: seed.emoji, text: T`<b>${seed.name}</b> ${Math.round(p.age / p.grow * 100)}% <span class="dim">• grown in ${fmtTime((p.grow - p.age) / rate)}${p.water > 0 ? ' • 💧' : ''}</span>`, act: T`Info`, dim: true };
  const next = Math.min(...p.fruits.filter(Boolean).map(fr => seed.fruitTime - fr.age));
  return { icon: seed.emoji, text: T`<b>${seed.name}</b> <span class="dim">• next fruit in ${fmtTime(next / rate)}</span>`, act: T`Info`, dim: true };
}

function interact(f) {
  f = f || focus;
  if (isAnyPanelOpen()) return;
  if (!f) {
    const sel = selectedItem();
    if (sel && sel.kind === 'seed' && !inMyGarden(playerPos.x, playerPos.z)) { showToast('🏡', T`Go to your garden to plant! (tap 🏡 Garden)`); hintTarget = 'garden'; hintTimer = 6; }
    return;
  }
  const sel = selectedItem();
  switch (f.kind) {
    case 'stall': openStall(f.id); return;
    case 'drop': dropCarried(f.x, f.z); return;
    case 'pet': petPetAt(petEntities.get(f.id)); return;
    case 'egg': if (f.egg.left <= 0) hatchEgg(f.egg); else { Sfx.play('click'); showToast('🥚', T`Hatches in ${fmtTime(f.egg.left)}`); } return;
    case 'placed': Sfx.play('click'); return;
    case 'gift': Sfx.play('click'); if (!teach('leket')) showToast('🌾', T`That's Leket — leave it for the poor. Rut will come for it!`); return;
    case 'spot':
      // the held item may have changed since focus was computed — re-check it
      if (!sel) return;
      if (sel.kind === 'seed') plantSeed(sel.id, f.x, f.z);
      else if (sel.kind === 'egg') placeEgg(sel.id, f.x, f.z);
      else if (PLACEABLE_GEAR.includes(sel.id)) placeGear(sel.id, f.x, f.z);
      return;
    case 'plant': {
      const p = f.plant;
      if (!gameState.plants.includes(p)) return;
      if (sel && sel.id === 'shovel') { digUp(p); return; }
      if (sel && sel.id === 'trowel') { pickUpWithTrowel(p); return; }
      if (sel && sel.id === 'watering_can') { useWateringCan(p); return; }
      if (ripeFruitCount(p)) {
        const block = harvestBlock(p);
        if (block) { explainBlock(block, p); return; }
        if (needsReed(p)) { tieReed(p); return; }
        harvestPlant(p); return;
      }
      if (orlahPhase(p) === 'orlah' && p.age >= p.grow) { explainBlock('orlah', p); return; }
      Sfx.play('click');
      floatText(p.x, 1.8, p.z, p.age < p.grow ? `⏳ ${fmtTime((p.grow - p.age) / growthRate(p))}` : T`🌱 Fruit growing…`, '#FFFFFF');
    }
  }
}

function explainBlock(block, p) {
  Sfx.play('deny');
  if (block === 'peah') { if (!teach('peah')) showToast('💙', T`This is your Peah corner — it's for the poor. Leave it, and Rut will come!`); }
  else if (block === 'shich') { if (!teach('shichecha')) showToast('🧺', T`You forgot this one, so it's Shichecha — don't go back for it!`); }
  else if (block === 'orlah') { if (!teach('orlah')) showToast('🚫', T`Orlah: this tree is in year ${treeYear(p)} of 3. Its fruit isn't for us yet!`); }
}
function tieReed(p) {
  p.bk = 1;
  Sfx.play('sparkle');
  spawnParticles(p.x, 1.4, p.z, [0xFFD54F, 0xFF80AB, 0xFFFFFF], 24, 2.5, 0.09);
  floatText(p.x, 2.4, p.z, T`🎀 "These are Bikkurim!"`, '#FFE082');
  teach('bikkurim');
  refreshPlantView(p);
  saveGame();
}
function openStall(id) {
  if (id === 'temple') { openTemple(); return; }
  if (id === 'sell') openSell();
  else openShop(id);
}

// ════════════════════════════════════════════
//  UI
// ════════════════════════════════════════════
function updateHUD() {
  setText($('#coin-amount'), fmtSheckles(gameState.sheckles));
  setText($('#fruit-count'), `${gameState.fruits.length}/${MAX_FRUITS}`);
}

let leaderTimer = 0;
function updateLeaderboard() {
  const box = $('#leaderboard-list');
  if (!box) return;
  if (netMode) {
    const online = new Set(remotePlayers.keys());
    const me = myProfile();
    const rows = [{ name: shortName(me.name), avatar: shortAvatar(me.avatar), s: gameState.sheckles, me: true, on: true }];
    for (const [pid, prof] of worldProfiles) {
      const g = worldGardens.get(pid);
      rows.push({ name: prof.name, avatar: prof.avatar, s: g && isFinite(g.snap.s) ? g.snap.s : prof.s, on: online.has(pid) });
    }
    rows.sort((a, b) => b.s - a.s);
    box.innerHTML = rows.slice(0, 6).map(r => `<div class="lb-row${r.me ? ' me' : ''}"><span>${r.on ? '<i class="dot"></i>' : ''}${esc(r.avatar)} ${esc(r.name)}</span><b>¢${fmtSheckles(r.s)}</b></div>`).join('');
    return;
  }
  const rows = getProfiles().map(p => {
    const s = p.id === activeProfileId ? gameState.sheckles : ((readSave(p.id) || {}).sheckles != null ? readSave(p.id).sheckles : Math.floor(((readSave(p.id) || {}).coins || 0) * 3));
    return { name: p.name, avatar: p.avatar, s, me: p.id === activeProfileId };
  }).sort((a, b) => b.s - a.s).slice(0, 6);
  box.innerHTML = rows.map(r => `<div class="lb-row${r.me ? ' me' : ''}"><span>${esc(r.avatar)} ${esc(r.name)}</span><b>¢${fmtSheckles(r.s)}</b></div>`).join('');
}

function weatherBanner() {
  const el = $('#weather-banner');
  if (!weather) { el.classList.remove('visible'); return; }
  const w = WEATHER[weather.id];
  el.className = 'visible w-' + weather.id;
  el.innerHTML = `<span class="wb-icon">${w.emoji}</span><div><b>${w.name}!</b> <span>${w.desc}</span></div><span class="wb-time" id="wb-time"></span>`;
}

function updateTimeHUD() {
  const night = nightFactor > 0.5;
  setText($('#time-indicator'), night ? '🌙' : '☀️');
  if (weather) setText($('#wb-time'), fmtTime(weather.left));
}

// ─── Hotbar: seeds, gear, eggs (like the Roblox backpack bar) ───
function hotbarItems() {
  const items = [];
  Object.keys(gameState.seeds).filter(id => gameState.seeds[id] > 0 && getSeedData(id))
    .sort((a, b) => getSeedData(a).price - getSeedData(b).price)
    .forEach(id => items.push({ key: 'seed:' + id, emoji: getSeedData(id).emoji, name: T`${getSeedData(id).name} Seed`, count: gameState.seeds[id], color: RARITY[getSeedData(id).rarity].color }));
  Object.keys(gameState.eggs).filter(id => gameState.eggs[id] > 0).forEach(id => items.push({ key: 'egg:' + id, emoji: '🥚', name: EGGS[id].name, count: gameState.eggs[id], color: RARITY[EGGS[id].rarity].color, eggColor: EGGS[id].color }));
  GEAR_LIST.filter(id => gameState.gear[id] > 0).forEach(id => items.push({ key: 'gear:' + id, emoji: GEAR[id].emoji, name: GEAR[id].name, count: gameState.gear[id], color: '#90CAF9' }));
  items.push({ key: 'gear:shovel', emoji: '⛏️', name: T('Shovel'), count: null, color: '#BCAAA4' });
  return items;
}
function updateHotbar() {
  const bar = $('#hotbar');
  bar.innerHTML = '';
  const items = hotbarItems();
  if (selectedItem() === null && gameState.selected && !String(gameState.selected).startsWith('gear:shovel')) gameState.selected = null;
  items.slice(0, 9).forEach((it, i) => {
    const slot = document.createElement('button');
    slot.className = 'hotbar-slot' + (gameState.selected === it.key ? ' selected' : '');
    slot.style.setProperty('--rar', it.color);
    if (it.eggColor) slot.style.setProperty('--egg', '#' + it.eggColor.toString(16).padStart(6, '0'));
    slot.innerHTML = `<span class="slot-key">${i + 1}</span><span class="slot-emoji${it.eggColor ? ' egg' : ''}">${it.emoji}</span>${it.count != null ? `<span class="slot-count">${it.count}</span>` : ''}<span class="slot-name">${it.name}</span>`;
    slot.addEventListener('click', e => { e.stopPropagation(); selectItem(it.key); });
    bar.appendChild(slot);
  });
  const more = document.createElement('button');
  more.className = 'hotbar-slot bag';
  more.innerHTML = `<span class="slot-emoji">🎒</span><span class="slot-count">${gameState.fruits.length}</span><span class="slot-name">${T('Backpack')}</span>`;
  more.addEventListener('click', e => { e.stopPropagation(); togglePanel('bag-panel', openBag); });
  bar.appendChild(more);
}
function selectItem(key) {
  gameState.selected = gameState.selected === key ? null : key;
  if (gameState.gear.shovel == null) gameState.gear.shovel = 1;
  shovelArmed = null;
  Sfx.play('click');
  updateHotbar();
}

// ─── Prompt + mobile action button + ghost preview ───
let lastFocusKey = '';
function updatePrompt() {
  const info = started && !isAnyPanelOpen() ? focusInfo(focus) : null;
  const prompt = $('#interact-prompt');
  const key = info ? info.text + info.icon + (info.dim ? 1 : 0) : '';
  if (key !== lastFocusKey) {
    lastFocusKey = key;
    if (info) {
      setHTML(prompt, `${isMobile ? '' : '<span class="key">E</span>'}<span class="p-icon">${info.icon}</span><span class="p-text">${info.text}</span>`);
      prompt.classList.add('visible');
      prompt.classList.toggle('dim', !!info.dim);
    } else prompt.classList.remove('visible');
    const btn = $('#touch-interact');
    setHTML(btn, info ? `<span>${info.icon}</span><small>${info.act}</small>` : '<span>✋</span>');
    btn.classList.toggle('active', !!info && !info.dim);
  }
  // Ghost marker where the thing will go
  const spot = focus && (focus.kind === 'spot' || focus.kind === 'drop') ? focus : null;
  ghost.visible = !!spot;
  if (spot) {
    ghost.position.set(spot.x, DIRT_Y + 0.04, spot.z);
    MATS.ghost.color.setHex(spot.ok ? 0x69F0AE : 0xFF5252);
  }
  // Sprinkler range ring
  const sel = selectedItem();
  let ring = null;
  if (spot && spot.kil) ring = { x: spot.kil.plant.x, z: spot.kil.plant.z, r: spot.kil.need };
  else if (focus && focus.kind === 'placed' && GEAR[focus.item.gear].radius) ring = { x: focus.item.x, z: focus.item.z, r: GEAR[focus.item.gear].radius };
  else if (spot && sel && sel.kind === 'gear' && GEAR[sel.id].radius) ring = { x: spot.x, z: spot.z, r: GEAR[sel.id].radius };
  rangeRing.visible = !!ring;
  if (ring) { rangeRing.position.set(ring.x, DIRT_Y + 0.05, ring.z); rangeRing.scale.setScalar(ring.r); }
}

// ─── Tasks list ───
function renderTasks() {
  const list = $('#tasks-list');
  if (!list) return;
  list.innerHTML = '';
  gameState.tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'task' + (t.done ? ' done' : '') + (t.tutorial ? ' tutorial' : '');
    const pct = Math.round(t.progress / t.goal * 100);
    row.innerHTML = `<span class="task-icon">${t.done ? '✅' : t.icon}</span><div class="task-body"><div class="task-text">${taskText(t)}</div><div class="task-bar"><div style="width:${pct}%"></div></div></div><span class="task-reward">${t.goal > 1 && t.type !== 'earn' ? `${t.progress}/${t.goal}<br>` : ''}¢${fmtSheckles(t.reward)}</span>`;
    list.appendChild(row);
  });
  $('#tasks-title').textContent = gameState.tutorialStep < TUTORIAL_TASKS.length ? T`🎓 Getting started (${gameState.tutorialStep + 1}/${TUTORIAL_TASKS.length})` : T('📋 Tasks');
}

// ─── Panels ───
const PANEL_IDS = ['shop-panel', 'sell-panel', 'bag-panel', 'pets-panel', 'wardrobe-panel', 'achieve-panel', 'help-panel', 'gift-panel', 'temple-panel', 'mitzvot-panel', 'teach-panel'];
function isPanelOpen(id) { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); }
function isAnyPanelOpen() { return PANEL_IDS.some(isPanelOpen); }
function closeAllPanels() { PANEL_IDS.concat('emote-panel').forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }); }
function openPanel(id) {
  closeAllPanels();
  $('#' + id).classList.remove('hidden');
  keys.f = keys.b = keys.l = keys.r = false;
  moveTarget = null;
  Sfx.play('click');
}
function togglePanel(id, opener) {
  if (isPanelOpen(id)) { closeAllPanels(); return; }
  opener();
}

// ─── Seed / Gear / Egg shops ───
let shopKind = 'seeds';
function openShop(kind) {
  shopKind = kind || shopKind;
  renderShop();
  openPanel('shop-panel');
}
function renderShop() {
  const head = $('#shop-head');
  head.className = 'panel-header shop-header s-' + shopKind;
  $('#shop-title').innerHTML = { seeds: T('🌱 Seed Shop <small>by Shlomo</small>'), gear: T('⚙️ Gear Shop'), pets: T('🥚 Pet Eggs') }[shopKind];
  $('#shop-tabs').querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === shopKind));
  const body = $('#shop-body');
  body.innerHTML = '';
  const timer = document.createElement('div');
  timer.className = 'restock';
  timer.id = 'restock-timer';
  body.appendChild(timer);
  updateRestockTimer();
  if (shopKind === 'seeds') {
    const stock = currentSeedStock();
    const seasonal = Object.keys(getSeasonalSeeds());
    seedShopList().forEach(id => {
      if (seasonal.includes(id) && id === seasonal[0]) {
        const h = document.createElement('div'); h.className = 'section-title seasonal'; h.innerHTML = `${getActiveHolidayLabels().join(' ')} <span class="tag">${T('Event seeds!')}</span>`; body.appendChild(h);
      }
      const s = getSeedData(id);
      body.appendChild(shopRow({ emoji: s.emoji, name: s.name, rarity: s.rarity, price: s.price, stock: stock[id],
        sub: `${SPECIES_OF_SEED[id] ? `<span class="tag seven">${T('✡️ Seven Species')}</span> ` : ''}${s.multi ? T('♻️ Multi-harvest') : T('🌾 Single harvest')}${isFruitTree(id) ? ` • ${T('🌳 Orlah 3 yrs')}` : ''} • ${T`grows in ${fmtTime(s.grow)}`} • ${T`fruit ¢${fmtSheckles(s.sell)}+`}` }, () => buyFromShop('seed', id)));
    });
  } else if (shopKind === 'gear') {
    const stock = currentGearStock();
    GEAR_LIST.forEach(id => {
      const g = GEAR[id];
      body.appendChild(shopRow({ emoji: g.emoji, name: g.name, rarity: g.price >= 400000 ? 'divine' : g.price >= 100000 ? 'mythical' : g.price >= 30000 ? 'legendary' : g.price >= 10000 ? 'rare' : 'uncommon', price: g.price, stock: stock[id],
        sub: g.desc + (g.uses > 1 ? ` • ${T`${g.uses} uses`}` : '') }, () => buyFromShop('gear', id)));
    });
  } else {
    currentEggStock().forEach((e, i) => {
      const d = EGGS[e.id];
      const chances = Object.entries(d.pets).map(([pid, w]) => `${PETS[pid].emoji} ${PETS[pid].name} ${w}%`).join(' • ');
      body.appendChild(shopRow({ emoji: '🥚', eggColor: d.color, name: d.name, rarity: d.rarity, price: d.price, stock: e.bought ? 0 : 1,
        sub: `${T`Hatches in ${fmtTime(d.hatch)}`}<br><span class="chances">${chances}</span>` }, () => buyFromShop('egg', i)));
    });
  }
}
function shopRow(o, onBuy) {
  const rar = RARITY[o.rarity] || RARITY.common;
  const row = document.createElement('div');
  row.className = 'shop-row' + (o.stock ? '' : ' nostock');
  row.style.setProperty('--rar', rar.color);
  const can = o.stock && gameState.sheckles >= o.price;
  row.innerHTML = `
    <div class="sr-emoji${o.eggColor ? ' egg' : ''}" ${o.eggColor ? `style="--egg:#${o.eggColor.toString(16).padStart(6, '0')}"` : ''}>${o.emoji}</div>
    <div class="sr-info">
      <div class="sr-name">${o.name} <span class="rarity${rar.rainbow ? ' prism' : ''}">${rar.name}</span></div>
      <div class="sr-sub">${o.sub}</div>
      <div class="sr-stock">${o.stock ? T`x${o.stock} Stock` : T('NO STOCK')}</div>
    </div>
    <button class="buy-btn" ${can ? '' : 'disabled'}>¢${fmtSheckles(o.price)}</button>`;
  row.querySelector('.buy-btn').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    if (onBuy()) { floatTextScreen(r.left + r.width / 2, r.top, `+1 ${o.emoji}`); renderShop(); }
  });
  return row;
}
function updateRestockTimer() {
  const el = $('#restock-timer');
  if (!el) return;
  const t = shopKind === 'pets' ? slotLeft(EGG_RESTOCK) : slotLeft(SHOP_RESTOCK);
  setText(el, shopKind === 'seeds' ? T`🔄 New seeds in ${fmtTime(t)}` : shopKind === 'gear' ? T`🔄 New gear in ${fmtTime(t)}` : T`🔄 New eggs in ${fmtTime(t)}`);
}
function floatTextScreen(x, y, text) {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.style.zIndex = 400;
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ─── Sell stand (Steven) ───
function openSell() { renderSell(); openPanel('sell-panel'); }
function renderSell() {
  const body = $('#sell-body');
  body.innerHTML = '';
  const sellable = gameState.fruits.filter(f => !f.fav && sellableFruit(f));
  const split = titheSplit(sellable);
  const all = document.createElement('button');
  all.className = 'btn big sell-all';
  all.disabled = !sellable.length;
  all.innerHTML = sellable.length ? T`💰 Sell my inventory (${sellable.length}) — worth ¢${fmtSheckles(split.gross)}` : T('Nothing to sell — go harvest some fruit!');
  all.addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    const got = sellFruits(sellable.slice());
    Sfx.play('sell'); setTimeout(() => Sfx.play('coin'), 120);
    coinFly(r.left + r.width / 2, r.top, 8);
    showToast('💰', T`Steven paid you ¢${fmtSheckles(got)}!`);
    renderSell(); updateHotbar();
  });
  body.appendChild(all);
  if (sellable.some(f => isFood(f.s))) {
    // Pick how much Terumah to give (Mishnah Terumot 4:3)
    const cur = terumahPick();
    const choose = document.createElement('div'); choose.className = 'terumah-pick';
    choose.innerHTML = '<div class="tp-q">' + T('🌾 How much <b>Terumah</b> will you give the Kohen?') + '</div><div class="tp-opts">' +
      Object.entries(TERUMAH_CHOICES).map(([k, c]) => `<button class="tp-opt${k === cur ? ' on' : ''}" data-k="${k}"><span>${c.emoji}</span><b>${c.name}</b><small>1/${Math.round(1 / c.frac)}${IS_HE ? '' : ` • <span dir="rtl">${c.he}</span>`}</small></button>`).join('') + '</div>';
    choose.querySelectorAll('.tp-opt').forEach(b => b.addEventListener('click', () => { gameState.mz.tPick = b.dataset.k; Sfx.play('click'); saveGame(); renderSell(); }));
    body.appendChild(choose);
    const t = document.createElement('div'); t.className = 'tithe-box';
    t.innerHTML = `<span>${T`🌾 Terumah → Kohen <b>¢${fmtSheckles(split.terumah)}</b>`}</span><span>${T`🪙 Ma'aser → Levi <b>¢${fmtSheckles(split.maaser)}</b>`}</span>${split.exempt ? '<span class="dim">' + T('🌷 Flowers & mushrooms aren\'t food — no Ma\'aser') + '</span>' : ''}`;
    body.appendChild(t);
  }
  if (gameState.fruits.some(f => !sellableFruit(f))) {
    const note = document.createElement('p'); note.className = 'note'; note.textContent = T("🎀 Bikkurim and 🏛️ Revai go to the Kohen. 🌿 Shevi'it fruit is for eating, not selling."); body.appendChild(note);
  }
  if (gameState.fruits.some(f => f.fav)) {
    const note = document.createElement('p'); note.className = 'note'; note.textContent = T('⭐ Favorited fruit are kept when you sell everything.'); body.appendChild(note);
  }
  body.appendChild(fruitList(gameState.fruits, true));
}
function fruitList(fruits, sellButtons) {
  const wrap = document.createElement('div');
  wrap.className = 'fruit-list';
  fruits.slice().sort((a, b) => fruitValue(b) - fruitValue(a)).slice(0, 120).forEach(f => {
    const s = getSeedData(f.s);
    if (!s) return;
    const row = document.createElement('div');
    row.className = 'fruit-row';
    row.style.setProperty('--rar', RARITY[s.rarity].color);
    const tags = (f.bk ? '<span class="mut" style="--mc:#FFB300">' + T('🎀 Bikkurim') + '</span>' : '') + (f.rv ? '<span class="mut" style="--mc:#42A5F5">' + T('🏛️ Revai') + '</span>' : '') + (f.sv ? '<span class="mut" style="--mc:#66BB6A">' + T('🌿 Shevi\'it') + '</span>' : '');
    const muts = tags + (f.m || []).map(k => `<span class="mut" style="--mc:${MUTATIONS[k].color}">${MUTATIONS[k].emoji} ${MUTATIONS[k].name}</span>`).join('');
    const canSell = sellButtons && sellableFruit(f);
    row.innerHTML = `<span class="fr-emoji">${s.emoji}</span><div class="fr-info"><b>${s.name}</b> <span class="kg">${T`${f.kg}kg`}</span><div>${muts}</div></div><span class="fr-val">¢${fmtSheckles(fruitValue(f))}</span>
      <button class="fav${f.fav ? ' on' : ''}" title="${T('Favorite')}">⭐</button>${canSell ? '<button class="btn small sell1">' + T('Sell') + '</button>' : ''}${f.sv && !sellButtons ? '<button class="btn small eat1">' + T('🍽️ Eat') + '</button>' : ''}`;
    const eat = row.querySelector('.eat1');
    if (eat) eat.addEventListener('click', () => {
      gameState.fruits = gameState.fruits.filter(x => x !== f);
      mitzvah('eaten', 1);
      floatText(playerPos.x, 2.4, playerPos.z, T("😋 Yum! Holy Shevi'it fruit"), '#C5E1A5');
      Sfx.play('pop'); saveGame(); openBag();
    });
    row.querySelector('.fav').addEventListener('click', () => { f.fav = !f.fav; Sfx.play('click'); saveGame(); sellButtons ? renderSell() : openBag(); });
    const sb = row.querySelector('.sell1');
    if (sb) sb.addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); const got = sellFruits([f]); Sfx.play('coin'); floatTextScreen(r.left, r.top, `+¢${fmtSheckles(got)}`); renderSell(); updateHotbar(); });
    wrap.appendChild(row);
  });
  if (!fruits.length) { const p = document.createElement('p'); p.className = 'empty-msg'; p.innerHTML = T('Your backpack has no fruit yet.<br>Harvest plants in your garden! 🧺'); wrap.appendChild(p); }
  return wrap;
}

// ─── Backpack ───
function openBag() {
  const body = $('#bag-body');
  body.innerHTML = '';
  const h = document.createElement('div'); h.className = 'section-title';
  const worth = gameState.fruits.reduce((a, f) => a + fruitValue(f), 0);
  h.innerHTML = T`🧺 Fruit <span class="dim">${gameState.fruits.length}/${MAX_FRUITS} • worth ¢${fmtSheckles(worth)}</span>`;
  body.appendChild(h);
  body.appendChild(fruitList(gameState.fruits, false));
  const items = hotbarItems();
  const h2 = document.createElement('div'); h2.className = 'section-title'; h2.textContent = T('🎒 Seeds, gear & eggs (tap to hold)'); body.appendChild(h2);
  const g = document.createElement('div'); g.className = 'bag-grid';
  items.forEach(it => {
    const d = document.createElement('div');
    d.className = 'bag-item' + (gameState.selected === it.key ? ' selected' : '');
    d.style.setProperty('--rar', it.color);
    d.innerHTML = `<div class="bag-emoji">${it.emoji}</div><div class="bag-name">${it.name}</div>${it.count != null ? `<div class="bag-count">×${it.count}</div>` : ''}`;
    d.addEventListener('click', () => { gameState.selected = it.key; updateHotbar(); openBag(); });
    g.appendChild(d);
  });
  body.appendChild(g);
  openPanel('bag-panel');
}

// ─── Pets ───
function openPets() {
  const body = $('#pets-body');
  body.innerHTML = '';
  const h = document.createElement('div'); h.className = 'section-title'; h.textContent = T`🐾 Equipped (${gameState.equipped.length}/${MAX_PETS_EQUIPPED}) — they live in your garden`; body.appendChild(h);
  const g = document.createElement('div'); g.className = 'card-grid';
  const sorted = gameState.pets.slice().sort((a, b) => (gameState.equipped.includes(b.id) - gameState.equipped.includes(a.id)));
  sorted.forEach(pet => {
    const d = PETS[pet.type];
    if (!d) return;
    const eq = gameState.equipped.includes(pet.id);
    const rar = RARITY[d.rarity];
    const card = document.createElement('div');
    card.className = 'card' + (eq ? ' owned' : '');
    card.style.setProperty('--rar', rar.color);
    card.innerHTML = `<div class="card-rarity">${rar.name}</div><div class="card-emoji">${d.emoji}</div><div class="card-name">${petName(pet)}</div>
      <div class="card-stats">${d.name} • ${T`Age ${petLevel(pet)}`}</div><div class="card-desc">${describeAbility(d.ability)}</div>
      <button class="btn ${eq ? 'alt' : ''}">${eq ? T('Unequip') : T('Equip')}</button>`;
    card.querySelector('button').addEventListener('click', () => {
      if (eq) gameState.equipped = gameState.equipped.filter(id => id !== pet.id);
      else if (gameState.equipped.length >= MAX_PETS_EQUIPPED) { Sfx.play('deny'); showToast('🐾', T`You can equip ${MAX_PETS_EQUIPPED} pets. Unequip one first.`); return; }
      else gameState.equipped.push(pet.id);
      syncPetEntities(); saveGame(); openPets();
    });
    g.appendChild(card);
  });
  body.appendChild(g);
  const p = document.createElement('p'); p.className = 'note'; p.innerHTML = T('Get more pets from <b>🥚 Pet Eggs</b> in the market. Pets get stronger as they age!');
  body.appendChild(p);
  openPanel('pets-panel');
}
// ─── Wardrobe ───
function currentSkin() {
  const prof = getProfiles().find(p => p.id === activeProfileId);
  return (prof && prof.skin) || DEFAULT_SKIN;
}
function openWardrobe() {
  const body = $('#wardrobe-body');
  body.innerHTML = '';
  const cur = currentSkin();
  const sh = document.createElement('p'); sh.className = 'note'; sh.textContent = T('🧵 Every outfit is checked: no shatnez (wool + linen together)!'); body.appendChild(sh);
  const g = document.createElement('div'); g.className = 'card-grid';
  Object.entries(CHARACTER_SKINS).forEach(([key, skin]) => {
    const unlocked = gameState.unlockedSkins.includes(key);
    const active = cur === key;
    const card = document.createElement('div');
    card.className = 'card' + (active ? ' owned' : '') + (!unlocked ? ' locked-soft' : '');
    card.style.setProperty('--rar', active ? '#69F0AE' : '#B388FF');
    let btn;
    if (active) btn = '<button class="btn" disabled>' + T('👕 Wearing') + '</button>';
    else if (unlocked) btn = '<button class="btn wear">' + T('Wear') + '</button>';
    else btn = `<button class="btn buy" ${gameState.sheckles < skin.cost ? 'disabled' : ''}>¢${fmtSheckles(skin.cost)}</button>`;
    card.innerHTML = `<div class="card-emoji">${skin.emoji}</div><div class="card-name">${skin.name}</div>${btn}`;
    const wear = card.querySelector('.wear');
    if (wear) wear.addEventListener('click', () => { equipSkin(key); openWardrobe(); });
    const buy = card.querySelector('.buy');
    if (buy) buy.addEventListener('click', () => {
      if (gameState.sheckles < skin.cost) return;
      gameState.sheckles -= skin.cost;
      gameState.unlockedSkins.push(key);
      equipSkin(key);
      checkAchievement('fashion_forward');
      Sfx.play('unlock');
      bigBanner(T`${skin.emoji} New outfit!`, T`You unlocked ${skin.name}`);
      updateHUD(); saveGame();
      openWardrobe();
    });
    g.appendChild(card);
  });
  body.appendChild(g);
  openPanel('wardrobe-panel');
}
function equipSkin(key) {
  const profiles = getProfiles();
  const prof = profiles.find(p => p.id === activeProfileId);
  if (prof) { prof.skin = key; saveProfiles(profiles); }
  if (netMode) { Net.updateInfo({ sk: key }); Net.setProfileField(activeProfileId, { skin: key }); }
  buildPlayerModel();
  spawnParticles(playerPos.x, 1, playerPos.z, [0xFFFFFF, 0xB388FF, 0x80D8FF], 30, 4, 0.12);
  saveGame();
}

function buildPlayerModel() {
  if (playerModel) scene.remove(playerModel);
  playerModel = buildCharacter(currentSkin());
  playerModel.position.set(playerPos.x, playerY, playerPos.z);
  scene.add(playerModel);
}

// ─── Achievements ───
function openAchievements() {
  const body = $('#achieve-body');
  body.innerHTML = '';
  const got = gameState.achievements.filter(id => ACHIEVEMENTS[id]);
  const head = document.createElement('div');
  head.className = 'achieve-summary';
  head.innerHTML = `${T`<b>${got.length}</b> of ${Object.keys(ACHIEVEMENTS).length} unlocked`}<div class="task-bar"><div style="width:${Math.round(got.length / Object.keys(ACHIEVEMENTS).length * 100)}%"></div></div>`;
  body.appendChild(head);
  const g = document.createElement('div'); g.className = 'achieve-grid';
  Object.entries(ACHIEVEMENTS).forEach(([id, a]) => {
    const ok = got.includes(id);
    const d = document.createElement('div');
    d.className = 'achieve-card' + (ok ? ' unlocked' : '');
    d.innerHTML = `<span class="achieve-emoji">${ok ? a.emoji : '🔒'}</span><div><div class="achieve-name">${a.name}</div><div class="achieve-desc">${a.desc}</div></div>`;
    g.appendChild(d);
  });
  body.appendChild(g);
  openPanel('achieve-panel');
}

// ─── Daily gift ───
function maybeDailyGift() {
  const today = todayStr();
  if (gameState.lastDaily === today) return;
  const streak = gameState.lastDaily === todayStr(-1) ? (gameState.dailyStreak || 0) + 1 : 1;
  const coins = Math.round((40 + Math.min(streak, 7) * 30) * wealthScale());
  const affordable = SHOP_SEED_LIST.filter(id => SEEDS[id].price <= Math.max(50, gameState.sheckles / 4));
  const seedId = affordable[Math.floor(Math.random() * affordable.length)] || 'carrot';
  const body = $('#gift-body');
  body.innerHTML = `
    <div class="gift-box" id="gift-box">🎁</div>
    <p class="gift-text">${streak > 1 ? T`🔥 ${streak} days in a row!` : T('Welcome back, gardener!')}<br>${T('Tap the present to open it!')}</p>
    <div class="gift-streak">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="${d <= Math.min(streak, 7) ? 'on' : ''}">${d === 7 ? '🌟' : '⭐'}</span>`).join('')}</div>`;
  openPanel('gift-panel');
  $('#gift-box').addEventListener('click', function open() {
    this.removeEventListener('click', open);
    gameState.lastDaily = today;
    gameState.dailyStreak = streak;
    gameState.sheckles += coins;
    gameState.seeds[seedId] = (gameState.seeds[seedId] || 0) + 3;
    if (streak >= 3) gameState.gear.watering_can = (gameState.gear.watering_can || 0) + 5;
    const s = getSeedData(seedId);
    Sfx.play('gift');
    confetti(60);
    this.classList.add('opened');
    this.textContent = '✨';
    body.querySelector('.gift-text').innerHTML = `${streak >= 3 ? T`You got <b>¢${fmtSheckles(coins)}</b> and <b>3 ${s.emoji} ${s.name}</b> seeds and <b>5 🚿 watering can uses</b>!` : T`You got <b>¢${fmtSheckles(coins)}</b> and <b>3 ${s.emoji} ${s.name}</b> seeds!`}<br><button class="btn big" id="gift-ok">${T('Yay! 🎉')}</button>`;
    $('#gift-ok').addEventListener('click', () => { closeAllPanels(); Sfx.play('click'); });
    updateHUD(); updateHotbar(); saveGame();
  });
}

// ─── Help ───
function openHelp() { openPanel('help-panel'); }

// ─── Sound toggles ───
function refreshSoundButtons() {
  setText($('#sfx-btn'), Sfx.settings.sfx ? '🔊' : '🔈');
  setText($('#music-btn'), Sfx.settings.music ? '🎵' : '🎶');
  $('#music-btn').classList.toggle('off', !Sfx.settings.music);
  $('#sfx-btn').classList.toggle('off', !Sfx.settings.sfx);
}

const PROFILE_AVATARS = ['🌻', '🌵', '🍄', '🌸', '🌲', '🦊', '🐸', '🌈', '🍀', '🔥', '🐝', '🦋', '🌺', '🍉', '⭐', '🐢', '🎮', '🧑‍🌾'];

function getProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; } catch (e) { return []; }
}
function saveProfiles(profiles) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (e) { /* storage full / blocked */ }
}
function migrateOldSave() {
  const old = localStorage.getItem('garden3d_save');
  if (!old) return;
  const profiles = getProfiles();
  if (profiles.length === 0) {
    const id = 'p_' + Date.now();
    profiles.push({ id, name: 'Player 1', avatar: '🌻' });
    saveProfiles(profiles);
    localStorage.setItem(SAVE_PREFIX + id, old);
  }
  localStorage.removeItem('garden3d_save');
}

function readSave(id) {
  try { return JSON.parse(localStorage.getItem(SAVE_PREFIX + id)) || null; } catch (e) { return null; }
}

let cloudProfiles = null;      // profiles in the family world (null = not loaded / offline)
let profileScreenToken = 0;
function profileCard(p, shk, tag) {
  const card = document.createElement('button');
  card.className = 'profile-card' + (tag ? ' local-only' : '');
  card.innerHTML = `<span class="profile-avatar">${esc(p.avatar)}</span><span class="profile-name">${esc(p.name)}</span><span class="profile-level">¢${fmtSheckles(shk)}</span>${tag ? `<span class="profile-tag">${tag}</span>` : ''}`;
  card.addEventListener('click', () => selectProfile(p.id));
  let pressTimer = null;
  const del = () => {
    const msg = cloudProfiles && !tag ? T`Delete ${p.name}'s garden for EVERYONE in the family world? This cannot be undone!` : T`Delete ${p.name}'s garden? This cannot be undone!`;
    if (confirm(msg)) deleteProfile(p.id);
  };
  card.addEventListener('contextmenu', e => { e.preventDefault(); del(); });
  card.addEventListener('touchstart', () => { pressTimer = setTimeout(del, 900); }, { passive: true });
  card.addEventListener('touchend', () => clearTimeout(pressTimer));
  card.addEventListener('touchmove', () => clearTimeout(pressTimer));
  return card;
}
function localShk(id) {
  const save = readSave(id);
  return save ? (save.sheckles != null ? save.sheckles : (save.coins || 0) * 3) : 50;
}
function showProfileScreen() {
  const existing = document.getElementById('profile-screen');
  if (existing) existing.remove();
  migrateOldSave();
  const token = ++profileScreenToken;
  const world = Net.world;
  cloudProfiles = null;
  const profiles = getProfiles();
  const overlay = document.createElement('div');
  overlay.id = 'profile-screen';
  overlay.innerHTML = `
    <div class="profile-container">
      <div class="logo-emoji">🌱</div>
      <h1>${T('Grow a Garden')}</h1>
      <div id="world-bar"></div>
      <p class="subtitle" id="profile-subtitle">${profiles.length || world ? T("Who's playing?") : T('Make your gardener to start!')}</p>
      <div class="profile-grid" id="profile-grid"></div>
      <button class="btn big" id="new-profile-btn">${T('＋ New Gardener')}</button>
      <p class="profile-hint" id="profile-hint">${profiles.length ? T('Right-click or long-press a gardener to delete it') : ''}</p>
    </div>`;
  document.body.appendChild(overlay);
  const lb = document.createElement('button');
  lb.className = 'btn lang-btn';
  lb.textContent = IS_HE ? '🌐 English' : '🌐 עברית';
  lb.addEventListener('click', () => setLang(IS_HE ? 'en' : 'he'));
  overlay.appendChild(lb);
  const grid = document.getElementById('profile-grid');
  const bar = document.getElementById('world-bar');
  document.getElementById('new-profile-btn').addEventListener('click', showNewProfileModal);
  const renderLocal = () => { grid.innerHTML = ''; getProfiles().forEach(p => grid.appendChild(profileCard(p, localShk(p.id)))); };

  if (!world) {
    bar.innerHTML = `<button class="btn world-btn" id="world-join-btn">${T('🌍 Play together with family')}</button>`;
    document.getElementById('world-join-btn').addEventListener('click', showWorldModal);
    renderLocal();
    return;
  }
  bar.innerHTML = `<div class="world-pill"><span>${T`🌍 Family world <b>${esc(world)}</b>`}</span><span id="world-status" class="world-status">${T('Connecting…')}</span><button class="btn small alt" id="world-leave-btn">${T('Leave')}</button></div>`;
  document.getElementById('world-leave-btn').addEventListener('click', () => {
    if (!confirm(T('Leave the family world? You will play on this device only. (You can join again with the same code.)'))) return;
    Net.leaveWorld();
    showProfileScreen();
  });
  grid.innerHTML = '<div class="profile-loading">' + T('🌱 Loading your family…') + '</div>';
  withTimeout(Net.fetchProfiles(), 14000).then(list => {
    if (token !== profileScreenToken) return;
    cloudProfiles = list;
    setText($('#world-status'), T`🟢 ${list.length}/${MAX_WORLD_GARDENERS} gardens`);
    grid.innerHTML = '';
    const ids = new Set(list.map(p => p.id));
    list.sort((a, b) => (a.slot | 0) - (b.slot | 0)).forEach(p => grid.appendChild(profileCard({ id: p.id, name: shortName(p.name), avatar: shortAvatar(p.avatar) }, +p.s || 0)));
    getProfiles().filter(p => !ids.has(p.id)).forEach(p => grid.appendChild(profileCard(p, localShk(p.id), T('📱 Tap to bring into the world'))));
    if (!grid.children.length) setText($('#profile-subtitle'), T('Make your gardener to start!'));
    else setText($('#profile-hint'), T('Right-click or long-press a gardener to delete it'));
  }).catch(() => {
    if (token !== profileScreenToken) return;
    cloudProfiles = null;
    setText($('#world-status'), T('🔴 Offline — playing on this device'));
    renderLocal();
  });
}

function showWorldModal() {
  const modal = document.createElement('div');
  modal.id = 'new-profile-modal';
  const suggestion = 'GARDEN-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  modal.innerHTML = `
    <div class="profile-modal-box">
      <h2>${T('🌍 Play together')}</h2>
      <p class="world-explain">${T('Everyone in your family types the <b>same secret code</b> on their own device. Then you all play in one world — each with your own garden — and you can see each other!')}</p>
      <input type="text" id="world-code-input" placeholder="SECRET-CODE" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false">
      <p class="world-explain small">${T`At least ${Net.MIN_CODE} letters or numbers. Make it hard to guess and <b>only share it with your family</b>.`}</p>
      <button class="btn small alt" id="world-make-btn">${T('✨ Make a code for me')}</button>
      <div class="modal-buttons">
        <button class="btn big" id="world-go-btn">${T('Join world 🌍')}</button>
        <button class="btn alt" id="world-cancel-btn">${T('Cancel')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const input = document.getElementById('world-code-input');
  const go = () => {
    const code = Net.cleanCode(input.value);
    if (code.length < Net.MIN_CODE) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); input.focus(); return; }
    if (!Net.available) { alert(T("Can't reach the internet right now — try again when you're online.")); return; }
    Net.setWorld(code);
    modal.remove();
    Sfx.play('unlock');
    showProfileScreen();
  };
  input.addEventListener('input', () => { const c = Net.cleanCode(input.value); if (c !== input.value) input.value = c; });
  input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
  document.getElementById('world-make-btn').addEventListener('click', () => { input.value = suggestion; input.select(); });
  document.getElementById('world-go-btn').addEventListener('click', go);
  document.getElementById('world-cancel-btn').addEventListener('click', () => modal.remove());
  setTimeout(() => input.focus(), 50);
}

function showConnecting(text) {
  let el = document.getElementById('net-overlay');
  if (!el) { el = document.createElement('div'); el.id = 'net-overlay'; document.body.appendChild(el); }
  el.innerHTML = `<div class="net-box"><div class="net-spin">🌍</div><div>${esc(text)}</div></div>`;
}
function hideConnecting() { const el = document.getElementById('net-overlay'); if (el) el.remove(); }

function showNewProfileModal() {
  if (cloudProfiles && cloudProfiles.length >= MAX_WORLD_GARDENERS) { alert(T`This family world already has ${MAX_WORLD_GARDENERS} gardens — it's full! Long-press a gardener to delete it.`); return; }
  if (!cloudProfiles && getProfiles().length >= MAX_PROFILES) { alert(T('Maximum 10 gardeners! Long-press one to delete it.')); return; }
  const modal = document.createElement('div');
  modal.id = 'new-profile-modal';
  modal.innerHTML = `
    <div class="profile-modal-box">
      <h2>${T('New Gardener')}</h2>
      <input type="text" id="profile-name-input" placeholder="${T('Your name...')}" maxlength="12" autocomplete="off">
      <p class="modal-label">${T('Pick an avatar:')}</p>
      <div class="avatar-grid" id="avatar-grid"></div>
      <p class="modal-label">${T('Choose your character:')}</p>
      <div class="skin-grid" id="skin-grid"></div>
      <div class="modal-buttons">
        <button class="btn big" id="create-profile-btn">${T("Let's grow! 🌱")}</button>
        <button class="btn alt" id="cancel-profile-btn">${T('Cancel')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  let avatar = PROFILE_AVATARS[0], skin = DEFAULT_SKIN;
  const ag = document.getElementById('avatar-grid');
  PROFILE_AVATARS.forEach((e, i) => {
    const b = document.createElement('button');
    b.className = 'avatar-option' + (i === 0 ? ' selected' : '');
    b.textContent = e;
    b.addEventListener('click', () => { ag.querySelectorAll('.selected').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); avatar = e; });
    ag.appendChild(b);
  });
  const sg = document.getElementById('skin-grid');
  Object.entries(CHARACTER_SKINS).filter(([, s]) => s.cost === 0).forEach(([key, s], i) => {
    const b = document.createElement('button');
    b.className = 'skin-option' + (i === 0 ? ' selected' : '');
    b.innerHTML = `<span class="skin-emoji">${s.emoji}</span><span class="skin-name">${s.name}</span>`;
    b.addEventListener('click', () => { sg.querySelectorAll('.selected').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); skin = key; });
    sg.appendChild(b);
  });
  const more = document.createElement('div');
  more.className = 'skin-more';
  more.textContent = T('🥷 🦔 ⚔️ More outfits in the wardrobe!');
  sg.appendChild(more);
  const input = document.getElementById('profile-name-input');
  const create = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
    const id = 'p_' + Date.now();
    const profiles = getProfiles();
    profiles.push({ id, name, avatar, skin });
    saveProfiles(profiles);
    modal.remove();
    selectProfile(id);
  };
  document.getElementById('create-profile-btn').addEventListener('click', create);
  document.getElementById('cancel-profile-btn').addEventListener('click', () => modal.remove());
  input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') create(); });
  setTimeout(() => input.focus(), 50);
}

async function deleteProfile(id) {
  if (cloudProfiles && cloudProfiles.some(p => p.id === id)) {
    try { await Net.deleteProfile(id); } catch (e) { alert(T("Couldn't reach the family world — try again in a moment.")); return; }
  }
  saveProfiles(getProfiles().filter(p => p.id !== id));
  localStorage.removeItem(SAVE_PREFIX + id);
  showProfileScreen();
}

let selecting = false;
async function selectProfile(id) {
  if (selecting) return;
  Sfx.unlock();
  Sfx.play('click');
  netMode = false; mySlot = 0;
  const modal = document.getElementById('new-profile-modal'); if (modal) modal.remove();
  if (Net.world && Net.available && cloudProfiles) {
    selecting = true;
    showConnecting(T('Joining your family world…'));
    let slot = -1, offline = false;
    try { slot = await withTimeout(joinWorldAs(id), 20000); } catch (e) { offline = true; }
    hideConnecting();
    selecting = false;
    if (offline && !getProfiles().some(p => p.id === id)) { alert(T("Couldn't reach the family world — check the internet and try again!")); return; }
    if (!offline && slot < 0) return;
    if (offline) setTimeout(() => showToast('📴', T("Couldn't reach the family world — playing on this device for now")), 800);
    else { mySlot = slot; netMode = true; }
  }
  activeProfileId = id;
  const ps = document.getElementById('profile-screen'); if (ps) ps.remove();
  const p = getProfiles().find(pr => pr.id === id);
  if (p) { setText($('#badge-avatar'), p.avatar); setText($('#badge-name'), p.name); }
  startProfile();
}

function switchProfile() {
  if (started) saveGame(true);
  stopNetSession();
  started = false;
  closeAllPanels();
  document.body.classList.remove('playing');
  activeProfileId = null;
  showProfileScreen();
}


// ════════════════════════════════════════════
//  SAVE / LOAD (+ upgrading saves from older versions)
// ════════════════════════════════════════════
function saveGame(force) {
  if (!activeProfileId) return;
  try {
    const data = Object.assign({}, gameState, { savedAt: Date.now(), version: SAVE_VERSION });
    if (carrying) data.plants = gameState.plants; // a carried plant stays saved where it was
    localStorage.setItem(getSaveKey(), JSON.stringify(data));
    if (netMode) Net.uploadSave(activeProfileId, data, force);
  } catch (e) { /* storage full / private mode */ }
}

// Layout of the old 6x6 plot grid (indices 0-15 = middle 4x4, then the outer ring)
function oldPlotCell(i) {
  const cells = [];
  for (let r = 1; r <= 4; r++) for (let c = 1; c <= 4; c++) cells.push({ r, c });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (r === 0 || r === 5 || c === 0 || c === 5) cells.push({ r, c });
  return cells[i] || { r: 0, c: 0 };
}

function normalizeState(st) {
  ['seeds', 'gear', 'eggs', 'shop', 'perks'].forEach(k => { if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {}; });
  ['fruits', 'plants', 'placed', 'placedEggs', 'pets', 'equipped', 'achievements', 'tasks', 'harvestedTypes', 'petsHatched', 'unlockedSkins', 'gifts'].forEach(k => { if (!Array.isArray(st[k])) st[k] = []; });
  st.mz = Object.assign(freshMitzvot(), st.mz && typeof st.mz === 'object' ? st.mz : {});
  if (!Array.isArray(st.mz.bik)) st.mz.bik = [];
  if (!st.mz.tips || typeof st.mz.tips !== 'object') st.mz.tips = {};
  st.gifts = st.gifts.filter(g => g && getSeedData(g.s) && isFinite(g.x) && isFinite(g.z)).slice(0, 60);
  if (typeof st.sheckles !== 'number' || !isFinite(st.sheckles)) st.sheckles = 50;
  st.gear.shovel = 1;
  ['farmer', 'noob'].forEach(s => { if (!st.unlockedSkins.includes(s)) st.unlockedSkins.push(s); });
  if (!st.pets.length) st.pets.push({ id: 'buddy', type: 'dog', name: T('Buddy'), age: 0 });
  st.pets = st.pets.filter(p => PETS[p.type]);
  st.equipped = st.equipped.filter(id => st.pets.some(p => p.id === id)).slice(0, MAX_PETS_EQUIPPED);
  st.fruits = st.fruits.filter(f => f && getSeedData(f.s)).map(f => {
    const o = { s: f.s, kg: f.kg || getSeedData(f.s).kg, m: Array.isArray(f.m) ? f.m.filter(k => MUTATIONS[k]) : [], fav: !!f.fav };
    if (f.bk) o.bk = 1;   // Bikkurim
    if (f.rv) o.rv = 1;   // Neta Revai
    if (f.sv) o.sv = 1;   // Shevi'it (picked in Shemitah)
    return o;
  });
  st.plants = st.plants.filter(p => p && getSeedData(p.s)).map(p => {
    const seed = getSeedData(p.s);
    p.id = p.id || newId();
    p.m = Array.isArray(p.m) ? p.m : [];
    p.grow = p.grow || seed.grow;
    p.age = Math.min(p.grow, p.age || 0);
    p.water = p.water || 0;
    if (seed.multi) {
      p.fruits = Array.isArray(p.fruits) ? p.fruits.slice(0, seed.maxFruits) : [];
      while (p.age >= p.grow && p.fruits.length < seed.maxFruits) p.fruits.push(null);
      p.fruits = p.fruits.map(f => f ? { age: f.age || 0, kg: f.kg || seed.kg, m: Array.isArray(f.m) ? f.m : [] } : null);
    } else {
      p.fruits = null;
      if (p.age >= p.grow && !p.kg) p.kg = Math.round(seed.kg * (0.8 + Math.random() * 0.5) * 100) / 100;
    }
    return p;
  });
  st.tasks = st.tasks.filter(t => t && !t.done && t.type && t.goal);
  return st;
}

function migrateSaveToV3(data) {
  const st = freshState();
  if (!data) return st;
  if (data.version >= 3) {
    Object.keys(st).forEach(k => { if (data[k] !== undefined && data[k] !== null) st[k] = data[k]; });
    if (data.version < 4) shiftFromOldLayout(st, st.slot || 0);
    st.version = SAVE_VERSION;
    return normalizeState(st);
  }
  // ── Version 1/2 (grid garden with coins) ──
  const savedAt = data.savedAt || Date.now();
  let shk = (data.coins || 0) * 3;
  (data.unlockedPlots || []).forEach((_, k) => { shk += (60 + k * 45) * 3; });
  const upCost = { big_can: 250, sprinkler: 800, lucky_clover: 1500 };
  Object.keys(data.upgrades || {}).forEach(k => { if (upCost[k]) shk += upCost[k] * 3; });
  if (data.upgrades && data.upgrades.speedy_shoes) st.perks.speedy = true;
  st.seeds = {};
  Object.entries(data.inventory || {}).forEach(([id, n]) => { if (getSeedData(id) && n > 0) st.seeds[id] = n; });
  if (data.potions) st.gear.watering_can = data.potions * 3;
  const mutMap = { golden: 'gold', rainbow: 'rainbow', wet: 'wet', moonlit: 'moonlit' };
  Object.entries(data.harvested || {}).forEach(([key, n]) => {
    const [sid, mut] = key.split('|');
    const seed = getSeedData(sid);
    if (!seed) return;
    for (let i = 0; i < n; i++) {
      const m = mut && mutMap[mut] ? [mutMap[mut]] : [];
      if (st.fruits.length < MAX_FRUITS) st.fruits.push({ s: sid, kg: seed.kg, m, fav: false });
      else shk += seed.sell * (m.length ? MUTATIONS[m[0]].mult : 1);
    }
  });
  (data.plots || []).forEach((pl, i) => {
    if (!pl || !getSeedData(pl.seedId)) return;
    const seed = getSeedData(pl.seedId);
    const { r, c } = oldPlotCell(i);
    const grown = pl.grown != null ? pl.grown : Math.max(0, (savedAt - (pl.plantedAt || savedAt)) / 1000 - (pl.pausedGrowthTime || 0));
    const frac = Math.min(1, grown / (pl.growTime || seed.grow));
    st.plants.push({
      id: newId(), s: pl.seedId,
      x: GARDENS[0].x + [-11, -7.6, -4.2, 4.2, 7.6, 11][c], z: GARDENS[0].z + (-8.5 + r * 3.4),
      r: (i * 1.7) % 6.28, age: frac * seed.grow, grow: seed.grow, kg: 0,
      m: pl.mutation && mutMap[pl.mutation] ? [mutMap[pl.mutation]] : [], fruits: seed.multi ? [] : null, water: 0,
    });
  });
  st.sheckles = Math.max(50, Math.round(shk));
  if (Array.isArray(data.unlockedSkins)) st.unlockedSkins = data.unlockedSkins.slice();
  if (Array.isArray(data.achievements)) st.achievements = data.achievements.slice();
  if (Array.isArray(data.harvestedTypes)) st.harvestedTypes = data.harvestedTypes.slice();
  st.totalHarvested = data.totalHarvested || 0;
  st.totalEarned = (data.totalCoinsEarned || 0) * 3;
  st.lastDaily = data.lastDaily || '';
  st.dailyStreak = data.dailyStreak || 0;
  st.tutorialStep = st.totalHarvested > 0 ? TUTORIAL_TASKS.length : 0;
  if (!Object.keys(st.seeds).length && !st.plants.length) st.seeds = { carrot: 3 };
  st.migratedFrom = data.version || 1;
  return normalizeState(st);
}

function loadGame() {
  const data = readSave(activeProfileId);
  gameState = migrateSaveToV3(data);
  if (!data) return 'new';
  // Plants keep growing (and eggs keep hatching) while you're away
  const offline = Math.min(Math.max(0, (Date.now() - (data.savedAt || Date.now())) / 1000), 3 * 86400);
  if (offline > 1) {
    gameState.plants.forEach(p => {
      const seed = getSeedData(p.s);
      const before = p.age;
      p.age = Math.min(p.grow, p.age + offline);
      const left = offline - (p.age - before);
      if (seed.multi && p.age >= p.grow) {
        while (p.fruits.length < seed.maxFruits) p.fruits.push(null);
        p.fruits = p.fruits.map(f => { f = f || newFruit(seed, p); f.age = Math.min(seed.fruitTime, f.age + left); return f; });
      } else if (!seed.multi && p.age >= p.grow && !p.kg) p.kg = rollWeight(seed, 0);
    });
    gameState.placedEggs.forEach(e => { e.left -= offline; });
    gameState.placed.forEach(it => { if (it.left != null) it.left -= offline; });
    gameState.placed = gameState.placed.filter(it => it.left == null || it.left > 0);
  }
  const migrated = !!gameState.migratedFrom;
  delete gameState.migratedFrom;
  return migrated ? 'migrated' : 'loaded';
}

// ════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DIRT_Y);
const hitPt = new THREE.Vector3();
const hitSphere = new THREE.Sphere();
const sphereCenter = new THREE.Vector3();

function handleTap(cx, cy) {
  if (!started || isAnyPanelOpen()) return;
  ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = [];
  const test = (x, y, z, r, fn) => {
    hitSphere.set(sphereCenter.set(x, y, z), r);
    if (raycaster.ray.intersectsSphere(hitSphere)) hits.push({ d: raycaster.ray.origin.distanceTo(sphereCenter), fn });
  };
  Object.entries(STALLS).forEach(([id, st]) => test(st.x, 1.4, STALL_Z, 2.0, () => walkTo(st.x, STALL_Z - 2.6, 1.0, () => interact({ kind: 'stall', id }))));
  petEntities.forEach(e => test(e.pos.x, 0.5, e.pos.z, 0.6, () => walkTo(e.pos.x, e.pos.z, 1.1, () => petPetAt(e))));
  gameState.placedEggs.forEach(e => test(e.x, 0.4, e.z, 0.55, () => walkTo(e.x, e.z, 1.3, () => interact({ kind: 'egg', egg: e }))));
  const sel = selectedItem();
  const placing = carrying || (sel && (sel.kind === 'seed' || sel.kind === 'egg' || (sel.kind === 'gear' && PLACEABLE_GEAR.includes(sel.id))));
  if (!placing || (sel && ['shovel', 'trowel', 'watering_can'].includes(sel.id))) {
    gameState.plants.forEach(p => {
      const v = plantViews.get(p.id);
      const h = v ? Math.max(0.5, v.height * (v.baseScale || 1)) : 0.6;
      test(p.x, DIRT_Y + h * 0.5, p.z, Math.max(0.45, seedRadius(p.s) * 0.9, h * 0.45), () => walkTo(p.x, p.z, 1.5, () => { faceTo(p.x, p.z); interact({ kind: 'plant', plant: p }); }));
    });
  }
  if (hits.length) { hits.sort((a, b) => a.d - b.d)[0].fn(); return; }
  if (!raycaster.ray.intersectPlane(groundPlane, hitPt)) return;
  const x = hitPt.x, z = hitPt.z;
  if (placing && inMyGarden(x, z)) {
    walkTo(x, z, 1.4, () => {
      faceTo(x, z);
      if (carrying) dropCarried(x, z);
      else if (sel.kind === 'seed') plantSeed(sel.id, x, z);
      else if (sel.kind === 'egg') placeEgg(sel.id, x, z);
      else placeGear(sel.id, x, z);
    });
    return;
  }
  spawnParticles(x, 0.15, z, 0xffffff, 6, 1.5, 0.07, { flat: true, up: 1, life: 0.4 });
  walkTo(x, z, 0.3, null);
}
function faceTo(x, z) { playerFacing = Math.atan2(x - playerPos.x, z - playerPos.z); }
function walkTo(x, z, reach, action) {
  const d = Math.hypot(x - playerPos.x, z - playerPos.z);
  if (d <= reach) { if (action) action(); return; }
  moveTarget = { x, z, reach, action, far: d > 10 };
}

function teleport(where) {
  const t = TELEPORTS[where];
  if (!t || !started) return;
  closeAllPanels();
  spawnParticles(playerPos.x, 1, playerPos.z, [0xFFFFFF, 0xB9F6CA], 14, 3, 0.1);
  playerPos.set(t.x, 0, t.z);
  playerVel.set(0, 0, 0);
  moveTarget = null;
  yaw = t.yaw;
  playerFacing = t.yaw + Math.PI;
  camPos.set(t.x + Math.sin(yaw) * camDist, PLAYER_HEIGHT + 5, t.z + Math.cos(yaw) * camDist);
  Sfx.play('pop');
  spawnParticles(t.x, 1, t.z, [0xFFFFFF, 0xB9F6CA], 20, 3, 0.1);
}

function bindInput() {
  const canvas = renderer.domElement;
  const pointers = new Map();
  let dragDist = 0, pinchStart = 0, pinchCam = camDist;
  canvas.addEventListener('pointerdown', e => {
    Sfx.unlock();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragDist = 0;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchStart = Math.hypot(a.x - b.x, a.y - b.y); pinchCam = camDist; }
  });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (!p || !started) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    dragDist += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (pinchStart > 0) camDist = clamp(pinchCam * pinchStart / Math.hypot(a.x - b.x, a.y - b.y), CAM_MIN, CAM_MAX);
      return;
    }
    const sens = e.pointerType === 'touch' ? 0.006 : 0.005;
    yaw -= dx * sens;
    pitch = clamp(pitch + dy * sens, -0.1, 1.3);
  });
  const end = e => {
    const had = pointers.has(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (had && dragDist < 8 && e.type === 'pointerup' && pointers.size === 0) handleTap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => { e.preventDefault(); camDist = clamp(camDist + e.deltaY * 0.012, CAM_MIN, CAM_MAX); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    Sfx.unlock();
    if (!started) return;
    switch (e.code) {
      case 'Escape': closeAllPanels(); return;
      case 'KeyB': togglePanel('shop-panel', () => openShop('seeds')); return;
      case 'KeyI': case 'Tab': e.preventDefault(); togglePanel('bag-panel', openBag); return;
      case 'KeyP': togglePanel('pets-panel', openPets); return;
      case 'KeyJ': togglePanel('achieve-panel', openAchievements); return;
      case 'KeyH': togglePanel('help-panel', openHelp); return;
      case 'KeyM': Sfx.toggle('music'); refreshSoundButtons(); return;
      case 'KeyT': toggleEmotePanel(); return;
      case 'KeyL': togglePanel('mitzvot-panel', openMitzvot); return;
    }
    if (isAnyPanelOpen()) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.f = true; break;
      case 'KeyS': case 'ArrowDown': keys.b = true; break;
      case 'KeyA': case 'ArrowLeft': keys.l = true; break;
      case 'KeyD': case 'ArrowRight': keys.r = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.run = true; break;
      case 'Space': e.preventDefault(); jump(); break;
      case 'KeyE': case 'Enter': if (!e.repeat) interact(); break;
      case 'KeyG': teleport('garden'); break;
      case 'Backquote': case 'Digit0': gameState.selected = null; updateHotbar(); break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          const it = hotbarItems()[parseInt(e.code.slice(5), 10) - 1];
          if (it) selectItem(it.key);
        }
    }
  });
  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.f = false; break;
      case 'KeyS': case 'ArrowDown': keys.b = false; break;
      case 'KeyA': case 'ArrowLeft': keys.l = false; break;
      case 'KeyD': case 'ArrowRight': keys.r = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.run = false; break;
    }
  });
  window.addEventListener('blur', () => { keys.f = keys.b = keys.l = keys.r = keys.run = false; });

  const base = $('#touch-move'), stick = $('#touch-move-stick');
  let stickId = null;
  const moveStick = e => {
    const r = base.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    touchMove.x = Math.abs(dx) < 0.12 ? 0 : dx;
    touchMove.y = Math.abs(dy) < 0.12 ? 0 : dy;
    stick.style.transform = `translate(calc(-50% + ${dx * 36}px), calc(-50% + ${dy * 36}px))`;
  };
  base.addEventListener('pointerdown', e => { Sfx.unlock(); stickId = e.pointerId; base.setPointerCapture(e.pointerId); moveStick(e); });
  base.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const stickEnd = e => { if (e.pointerId !== stickId) return; stickId = null; touchMove.x = touchMove.y = 0; stick.style.transform = 'translate(-50%, -50%)'; };
  base.addEventListener('pointerup', stickEnd);
  base.addEventListener('pointercancel', stickEnd);
  const tap = (sel, fn) => $(sel).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sfx.unlock(); fn(); });
  tap('#touch-jump', jump);
  tap('#touch-interact', () => interact());
}

function bindUI() {
  const on = (sel, fn) => $(sel).addEventListener('click', e => { e.stopPropagation(); Sfx.unlock(); fn(); });
  document.querySelectorAll('[data-tp]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); Sfx.unlock();
    const where = b.dataset.tp;
    teleport(where);
  }));
  on('#bag-btn', () => togglePanel('bag-panel', openBag));
  on('#pets-btn', () => togglePanel('pets-panel', openPets));
  on('#achieve-btn', () => togglePanel('achieve-panel', openAchievements));
  on('#wardrobe-btn', () => togglePanel('wardrobe-panel', openWardrobe));
  on('#help-btn', () => togglePanel('help-panel', openHelp));
  on('#sfx-btn', () => { Sfx.toggle('sfx'); refreshSoundButtons(); Sfx.play('click'); });
  on('#music-btn', () => { Sfx.toggle('music'); refreshSoundButtons(); });
  on('#switch-profile-btn', switchProfile);
  on('#emote-btn', toggleEmotePanel);
  on('#mitzvot-btn', () => togglePanel('mitzvot-panel', openMitzvot));
  on('#year-card', () => togglePanel('mitzvot-panel', openMitzvot));
  on('#teach-ok', () => { closeAllPanels(); Sfx.play('click'); setTimeout(showNextTeach, 400); });
  on('#tasks-title', () => $('#tasks').classList.toggle('collapsed'));
  on('#leaderboard-title', () => $('#leaderboard').classList.toggle('collapsed'));
  document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => { closeAllPanels(); Sfx.play('click'); }));
  PANEL_IDS.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('click', e => { if (e.target === el && id !== 'gift-panel') closeAllPanels(); });
  });
  document.querySelectorAll('#shop-tabs .tab').forEach(b => b.addEventListener('click', () => { shopKind = b.dataset.tab; Sfx.play('click'); renderShop(); }));
  if (isMobile) document.body.classList.add('touch');
}

// ─── Snow for Frost ───
let snow = null;
function buildSnow() {
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 22; pos[i * 3 + 2] = (Math.random() - 0.5) * 50; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.9 }));
  snow.frustumCulled = false;
  snow.visible = false;
  scene.add(snow);
}
function updateSnow(dt, time) {
  snow.visible = !!weather && weather.id === 'frost';
  if (!snow.visible) return;
  snow.position.set(playerPos.x, 0, playerPos.z);
  const a = snow.geometry.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) {
    a[i + 1] -= dt * 2;
    a[i] += Math.sin(time + i) * dt * 0.3;
    if (a[i + 1] < 0) a[i + 1] = 20 + Math.random() * 3;
  }
  snow.geometry.attributes.position.needsUpdate = true;
}

// ════════════════════════════════════════════
//  MITZVOT OF THE GARDEN (rules + texts live in mitzvot.js)
//  Every day in the game is one "garden year": year 7 is Shemitah,
//  young trees are Orlah, the corner is Peah, and Rut comes to glean.
// ════════════════════════════════════════════
function gardenYearIndex() { return Math.floor(Date.now() / 1000 / DAY_LENGTH + dayOffset); }
function cycleYear(yi) {
  const y = yi == null ? gardenYearIndex() : yi, n = MITZVAH.YEAR_CYCLE;
  return ((y % n) + n) % n + 1;
}
function isShemitah() { return cycleYear() === MITZVAH.YEAR_CYCLE; }
function isBlessedYear() { return cycleYear() === MITZVAH.YEAR_CYCLE - 1; }
function yearSecondsLeft() { const t = Date.now() / 1000 / DAY_LENGTH + dayOffset; return (Math.floor(t) + 1 - t) * DAY_LENGTH; }
const isFruitTree = id => FRUIT_TREES.includes(id);
const isVine = id => VINES.includes(id);
const isFood = id => !NOT_FOOD.includes(id);
function treeYear(p) { return p.py == null ? 99 : gardenYearIndex() - p.py + 1; }
function orlahPhase(p) {
  if (!isFruitTree(p.s) || p.py == null) return 'free';
  const y = treeYear(p);
  return y <= MITZVAH.ORLAH_YEARS ? 'orlah' : y === MITZVAH.ORLAH_YEARS + 1 ? 'revai' : 'free';
}

// ─── Peah: one corner at the far end of each bed ───
// Peah is left once per field, at its end (Rashi on Vayikra 19:9; Rambam, Matnot Aniyim 2:12).
// The permanent path down the middle splits the garden into two fields (Mishnah Peah 2:1),
// so each bed gets its own Peah (Rambam, Matnot Aniyim 3:1).
function peahRects(g) {
  g = g || MY_GARDEN;
  const back = g.z + g.dir * BED_Z, inner = back - g.dir * MITZVAH.PEAH_D;
  const z1 = Math.min(back, inner), z2 = Math.max(back, inner);
  return [
    { x1: g.x + BED_X1 - MITZVAH.PEAH_W, x2: g.x + BED_X1, z1, z2, back },
    { x1: g.x - BED_X1, x2: g.x - BED_X1 + MITZVAH.PEAH_W, z1, z2, back },
  ];
}
function inPeah(x, z) { return peahRects().some(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2); }
const isPeahPlant = p => inPeah(p.x, p.z);
// Why you may not pick this yourself (null = go ahead)
function harvestBlock(p) {
  if (isPeahPlant(p)) return 'peah';
  if (p.sh) return 'shich';
  if (orlahPhase(p) === 'orlah') return 'orlah';
  return null;
}
// ─── Bikkurim: the first ripe fruit of each of the Seven Species ───
function bikkurimPending(sp) {
  return gameState.fruits.some(f => f.bk && SPECIES_OF_SEED[f.s] === sp) || gameState.plants.some(q => q.bk && SPECIES_OF_SEED[q.s] === sp);
}
function needsReed(p) {
  const sp = SPECIES_OF_SEED[p.s];
  if (!sp || p.bk || isShemitah() || gameState.mz.bik.includes(sp) || bikkurimPending(sp)) return false;
  return orlahPhase(p) === 'free' && !harvestBlock(p) && ripeFruitCount(p) > 0;
}
function plantBadge(p) {
  const ripe = ripeFruitCount(p) > 0;
  if (!ripe) return null;
  if (isPeahPlant(p)) return '💙';
  if (p.sh) return '🧺';
  const ph = orlahPhase(p);
  if (ph === 'orlah') return '🚫';
  if (p.bk || needsReed(p)) return '🎀';
  if (ph === 'revai') return '🏛️';
  return null;
}

// ─── Kilayim: different kinds of plants need space between them ───
function kilayimConflict(seedId, x, z, ignoreId) {
  if (!isFood(seedId)) return null;
  const vine = isVine(seedId), tree = isFruitTree(seedId) && !vine;
  if (tree) return null;                                   // trees are fine next to anything
  for (const q of gameState.plants) {
    if (q.id === ignoreId || q.s === seedId || !isFood(q.s)) continue;
    const qVine = isVine(q.s), qTree = isFruitTree(q.s) && !qVine;
    if (qTree || (vine && qVine)) continue;
    const need = seedRadius(seedId) + seedRadius(q.s) + (vine || qVine ? MITZVAH.VINE_GAP : MITZVAH.KILAYIM_GAP);
    if (Math.hypot(q.x - x, q.z - z) < need) return { plant: q, need };
  }
  return null;
}
// A careful planting: another kind is close by, but you left the space
function keptKilayim(seedId, x, z, id) {
  if (!isFood(seedId) || (isFruitTree(seedId) && !isVine(seedId))) return false;
  return gameState.plants.some(q => q.id !== id && q.s !== seedId && isFood(q.s) && !(isFruitTree(q.s) && !isVine(q.s)) && !(isVine(seedId) && isVine(q.s)) &&
    Math.hypot(q.x - x, q.z - z) < seedRadius(seedId) + seedRadius(q.s) + (isVine(seedId) || isVine(q.s) ? MITZVAH.VINE_GAP : MITZVAH.KILAYIM_GAP) + 1.5);
}

// ─── Stars ⭐ for keeping mitzvot ───
function mitzvah(stat, stars, text, x, z) {
  const mz = gameState.mz;
  if (stat) mz[stat] = (mz[stat] || 0) + 1;
  mz.stars += stars;
  if (x != null) floatText(x, 2.4, z, `⭐+${stars} ${text || ''}`, '#FFE082');
  updateYearHUD(true);
  if (mz.peah >= 5) checkAchievement('peah_keeper');
  if (mz.leket >= 5) checkAchievement('gleaner_friend');
  if (mz.shich >= 1) checkAchievement('forgot_mitzvah');
  if (mz.kil >= 10) checkAchievement('kilayim_keeper');
  if (mz.orlah >= 1) checkAchievement('orlah_patience');
  if (mz.maaser >= 10) checkAchievement('tither');
  if (mz.shemitah >= 1) checkAchievement('shemitah_rest');
  if (mz.stars >= 100) checkAchievement('mitzvah_100');
}

// ─── "Did you know?" cards the first time each mitzvah comes up ───
const teachQueue = [];
function teach(id) {
  const mz = gameState.mz;
  if (mz.tips[id]) return false;
  mz.tips[id] = 1;
  teachQueue.push(id);
  showNextTeach();
  return true;
}
function showNextTeach() {
  if (!teachQueue.length || !started || isAnyPanelOpen()) return;
  const id = teachQueue.shift();
  const body = $('#teach-body');
  if (id === 'rut') {
    body.innerHTML = `<div class="teach-emoji">👩‍🌾</div><h3>${T`Meet Rut!`}</h3><p>${T`Rut comes to gather the gifts you leave for the poor — just like <b>Ruth</b> gleaning in Boaz's field. Every gift you leave brings you a <b>blessing</b>!`}</p>${sourceHTML('ruth2_2')}`;
  } else if (id === 'intro') {
    body.innerHTML = `<div class="teach-emoji">📜</div><h3>${T`Mitzvot of the Garden!`}</h3><p>${T`Your garden is bigger now, and it follows the Torah's farming mitzvot: <b>Peah, Leket, Shichecha, Kilayim, Orlah, Bikkurim, Ma'aser</b> and <b>Shemitah</b>. Keep them to earn ⭐ stars and blessings!`}</p><p>${T`Every day in the game is one garden year. Open the 📜 <b>Mitzvot</b> book to learn them all.`}</p>`;
  } else {
    const m = MITZVOT.find(x => x.id === id);
    if (!m) return;
    body.innerHTML = `<div class="teach-emoji">${m.emoji}</div><h3><span class="he">${m.he}</span> ${m.name}</h3><p>${m.what}</p><p class="teach-game">🎮 ${m.game}</p>${sourceHTML(m.sources[0])}`;
  }
  openPanel('teach-panel');
  Sfx.play('quest');
}
function sourceHTML(key) {
  const s = SOURCES[key];
  if (!s) return '';
  const url = 'https://www.sefaria.org/' + encodeURIComponent(s.ref.replace(/ /g, '_').replace(':', '.'));
  if (IS_HE) return `<div class="source"><div class="src-he" dir="rtl" lang="he">${s.he}</div><a class="src-ref" href="${url}" target="_blank" rel="noopener">📖 ${s.heRef || s.ref}</a></div>`;
  return `<div class="source"><div class="src-he" dir="rtl" lang="he">${s.he}</div><div class="src-en">“${s.en}”</div><a class="src-ref" href="${url}" target="_blank" rel="noopener">📖 ${s.ref}</a></div>`;
}

// ─── Leket on the ground ───
const giftViews = new Map();
function refreshGifts() {
  const alive = new Set(gameState.gifts.map(g => g.id));
  for (const [id, v] of giftViews) if (!alive.has(id)) { scene.remove(v); giftViews.delete(id); }
  gameState.gifts.forEach(g => {
    if (giftViews.has(g.id)) return;
    const seed = getSeedData(g.s);
    const grp = new THREE.Group();
    const b = new VoxelBatch(8);
    const sh = FRUIT_SHAPES[g.s] || [0.25, 0.25, 0.25];
    b.box(sh[0] * 1.1, sh[1] * 1.1, sh[2] * 1.1, seed ? (seed.fruitColor || seed.color) : 0xFFB300, 0, sh[1] * 0.55, 0, 0, 0, 0.6);
    grp.add(new THREE.Mesh(b.build(), MATS.voxel));
    const icon = new THREE.Sprite(Tex.emojiMaterial('🌾', true));
    icon.scale.set(0.5, 0.5, 1);
    icon.position.y = 0.8;
    grp.add(icon);
    grp.position.set(g.x, DIRT_Y, g.z);
    scene.add(grp);
    giftViews.set(g.id, grp);
  });
}
function nearestGift(x, z, maxD) {
  let best = null, bd = maxD;
  for (const g of gameState.gifts) { const d = Math.hypot(g.x - x, g.z - z); if (d < bd) { bd = d; best = g; } }
  return best;
}

// ─── Rut, who gleans what you leave for the poor ───
let rut = null, rutTimer = 6;
function rutGate() { return { x: MY_GARDEN.x + 0.8, z: MY_GARDEN.z - MY_GARDEN.dir * (BED_Z + 3.5) }; }
function pendingGifts() {
  const list = gameState.gifts.map(g => ({ kind: 'leket', ref: g, x: g.x, z: g.z }));
  gameState.plants.forEach(p => {
    if (!ripeFruitCount(p)) return;
    if (isPeahPlant(p)) list.push({ kind: 'peah', ref: p, x: p.x, z: p.z });
    else if (p.sh) list.push({ kind: 'shich', ref: p, x: p.x, z: p.z });
  });
  return list;
}
function spawnRut() {
  const gate = rutGate();
  const model = buildVendor({ npc: 'Rut', shirt: 0x8E24AA, apron: 0xE1BEE7, hat: 'straw' });
  const bb = new VoxelBatch(4);
  bb.box(0.45, 0.25, 0.32, 0xA1887F, 0, 0, 0);
  bb.box(0.36, 0.08, 0.24, 0xFFD54F, 0, 0.14, 0);
  const basket = new THREE.Mesh(bb.build(), MATS.voxel);
  basket.position.set(0.42, 0.75, 0.15);
  model.add(basket);
  const label = textSprite(T('🌾 Rut'), '#FFFFFF');
  label.scale.multiplyScalar(0.8);
  scene.add(model, label);
  rut = { model, label, x: gate.x, z: gate.z, target: null, wait: 0, leaving: false, got: 0, value: 0, stars: 0, walk: 0 };
  model.position.set(rut.x, 0, rut.z);
  if (!teach('rut') && Math.hypot(playerPos.x - gate.x, playerPos.z - gate.z) < 30) showToast('👩‍🌾', T('Rut is coming to gather the gifts for the poor!'));
}
function despawnRut() {
  scene.remove(rut.model, rut.label);
  rut.label.material.map.dispose(); rut.label.material.dispose();
  if (rut.got) {
    showToast('💙', rut.got > 1 ? T`Rut gathered ${rut.got} gifts for the poor. Blessing: +¢${fmtSheckles(rut.value)} ⭐+${rut.stars}` : T`Rut gathered 1 gift for the poor. Blessing: +¢${fmtSheckles(rut.value)} ⭐+${rut.stars}`);
    Sfx.play('quest');
  }
  rut = null;
  rutTimer = 8;
}
function collectGift(t) {
  let value = 0, stars = 0, count = 0;
  if (t.kind === 'leket') {
    if (!gameState.gifts.includes(t.ref)) return;
    value = fruitValue(t.ref); stars = 1; count = 1;
    gameState.gifts = gameState.gifts.filter(g => g !== t.ref);
    refreshGifts();
  } else {
    const p = t.ref, seed = getSeedData(p.s);
    if (!gameState.plants.includes(p) || !ripeFruitCount(p)) return;
    if (seed.multi) {
      p.fruits.forEach((f, i) => { if (f && f.age >= seed.fruitTime) { value += fruitValue({ s: p.s, kg: f.kg, m: f.m }); count++; p.fruits[i] = null; } });
      p.sh = 0;
      refreshPlantView(p);
    } else {
      value = fruitValue({ s: p.s, kg: p.kg || seed.kg, m: p.m }); count = 1;
      gameState.plants = gameState.plants.filter(x => x !== p);
      removePlantView(p.id);
    }
    stars = t.kind === 'shich' ? 2 : count;
  }
  // "...that the LORD thy G-d may bless thee in all the work of thy hands" (Devarim 24:19)
  value = Math.max(1, Math.round(value));
  gameState.sheckles += value;
  gameState.totalEarned += value;
  rut.got += count; rut.value += value; rut.stars += stars;
  mitzvah(t.kind, stars, t.kind === 'peah' ? T('Peah') : t.kind === 'leket' ? T('Leket') : T('Shichecha'), t.x, t.z);
  floatText(t.x, 1.7, t.z, T('💙 Thank you!'), '#B3E5FC');
  spawnParticles(t.x, 0.8, t.z, [0x90CAF9, 0xFFFFFF, 0xFFE082], 16, 2.5, 0.09);
  Sfx.play('coin');
  updateHUD(); saveGame();
}
function updateRut(dt, time) {
  if (!rut) {
    rutTimer -= dt;
    if (rutTimer > 0) return;
    rutTimer = 5;
    if (pendingGifts().length) spawnRut();
    return;
  }
  if (rut.wait > 0) {
    rut.wait -= dt;
    rut.model.userData.armR.rotation.x = -1.2;
    if (rut.wait <= 0) { collectGift(rut.target); rut.target = null; }
  } else {
    if (!rut.target && !rut.leaving) {
      const left = pendingGifts();
      if (left.length) rut.target = left.reduce((a, b) => Math.hypot(a.x - rut.x, a.z - rut.z) < Math.hypot(b.x - rut.x, b.z - rut.z) ? a : b);
      else rut.leaving = true;
    }
    const goal = rut.leaving ? rutGate() : rut.target;
    const dx = goal.x - rut.x, dz = goal.z - rut.z, d = Math.hypot(dx, dz);
    if (d < 0.7) {
      if (rut.leaving) { despawnRut(); return; }
      rut.wait = 0.8;
    } else {
      const step = Math.min(d, 3.4 * dt);
      rut.x += dx / d * step; rut.z += dz / d * step;
      rut.model.rotation.y = Math.atan2(dx, dz);
      rut.walk += dt * 9;
      const u = rut.model.userData;
      u.armL.rotation.x = Math.sin(rut.walk) * 0.6;
      u.armR.rotation.x = -Math.sin(rut.walk) * 0.6;
    }
  }
  rut.model.position.set(rut.x, Math.abs(Math.sin(rut.walk)) * 0.05, rut.z);
  rut.label.position.set(rut.x, 2.55 + Math.sin(time * 2) * 0.04, rut.z);
}

// ─── Shichecha: leaving your garden after harvesting, with 1 or 2 ripe plants left behind ───
let tripHarvests = [], wasInGarden = false;
function gardenArea(x, z) { return Math.abs(x - MY_GARDEN.x) < BED_X1 + 1.2 && Math.abs(z - MY_GARDEN.z) < BED_Z + 1.2; }
function checkShichecha() {
  const inside = gardenArea(playerPos.x, playerPos.z);
  if (wasInGarden && !inside && tripHarvests.length && !isShemitah()) {
    const forgot = gameState.plants.filter(p => !p.sh && !p.bk && ripeFruitCount(p) && !harvestBlock(p) && !needsReed(p) &&
      tripHarvests.some(h => Math.hypot(h.x - p.x, h.z - p.z) < 3.2));
    if (forgot.length && forgot.length <= 2) {
      forgot.forEach(p => { p.sh = 1; refreshPlantView(p); });
      if (!teach('shichecha')) showToast('🧺', forgot.length === 1 ? T`You forgot one — that's Shichecha! Don't go back; it's for the poor.` : T`You forgot two — that's Shichecha! Don't go back; it's for the poor.`);
      saveGame();
    } else if (forgot.length >= 3 && !gameState.mz.tips.three) {
      gameState.mz.tips.three = 1;
      showToast('🧺', T('You left 3 or more behind — that\'s not "forgetting", so they\'re still yours! (Mishnah Peah 6:5)'));
    }
    tripHarvests = [];
  }
  if (!wasInGarden && inside) tripHarvests = [];
  wasInGarden = inside;
}

// ─── Years, Orlah and Shemitah (checked once a second) ───
let lastYear = null;
function tickYears() {
  const yi = gardenYearIndex();
  if (isShemitah()) gameState.mz.restYear = yi;
  if (!gameState.mz.tips.intro && gameState.tutorialStep >= TUTORIAL_TASKS.length) teach('intro');   // new players: after the tutorial
  // young trees finishing Orlah / Revai
  gameState.plants.forEach(p => {
    if (p.py == null) return;
    const ph = orlahPhase(p);
    if (p.ol === ph) return;
    const was = p.ol;
    p.ol = ph;
    if (was === 'orlah') {
      if (p.fruits) p.fruits = p.fruits.map(() => null);   // fruit that grew in the Orlah years is buried
      spawnParticles(p.x, 1.5, p.z, [0xFFE082, 0xFFFFFF, 0x81C784], 30, 3, 0.1);
      const s = getSeedData(p.s);
      mitzvah('orlah', 3, T('Orlah kept!'), p.x, p.z);
      showToast('🌳', T`Your ${s.name} finished 3 years of Orlah! Its old fruit falls away — new fruit is Revai 🏛️.`);
      teach('revai');
    } else if (was === 'revai' && ph === 'free') {
      showToast('🌳', T`Your ${getSeedData(p.s).name}'s fruit is now yours to sell!`);
    }
    refreshPlantView(p);
  });
  if (lastYear !== null && yi !== lastYear) {
    const cy = cycleYear(yi);
    refreshAllPlants();
    if (cy === MITZVAH.YEAR_CYCLE) {
      bigBanner(T('🌿 Shemitah Year!'), T('The land rests — no planting this year.<br>Fruit you pick is holy Shevi\'it fruit: eat it, don\'t sell it.'));
      teach('shemitah');
    } else if (cy === 1 && gameState.mz.restYear === yi - 1) {
      mitzvah('shemitah', 7);
      bigBanner(T('🌱 The land rested!'), T`You kept Shemitah! ⭐+7<br>A new 7-year cycle begins — you can plant again.`);
    } else if (cy === MITZVAH.YEAR_CYCLE - 1) {
      bigBanner(T('✨ Year 6 — a blessing!'), T('"I will command My blessing upon you in the sixth year" (Vayikra 25:21)<br>Every harvest is doubled this year!'));
    } else showToast('📅', T`A new garden year: Year ${cy} of 7`);
    saveGame();
  }
  lastYear = yi;
  updateYearHUD();
  showNextTeach();
}
function updateYearHUD(bump) {
  const cy = cycleYear();
  const el = $('#year-text');
  if (!el) return;
  const left = fmtTime(yearSecondsLeft());
  setHTML(el, cy === 7 ? T`🌿 <b>Shemitah</b> <span class="dim">${left}</span>` : cy === 6 ? T`✨ <b>Year 6</b> blessed <span class="dim">${left}</span>` : T`📅 Year <b>${cy}</b> of 7 <span class="dim">${left}</span>`);
  $('#year-card').classList.toggle('shemitah', cy === 7);
  $('#year-card').classList.toggle('blessed', cy === 6);
  setText($('#star-count'), fmtSheckles(gameState.mz.stars));
  if (bump) { const s = $('#star-pill'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
}

// ─── Kohen at the Temple stall: Bikkurim and Neta Revai ───
function openTemple() {
  const body = $('#temple-body');
  body.innerHTML = '';
  const mz = gameState.mz;
  const basket = document.createElement('div');
  basket.className = 'species-basket';
  basket.innerHTML = '<div class="section-title">' + T('🎀 Bikkurim — the Seven Species') + '</div>' + Object.entries(SEVEN_SPECIES).map(([k, s]) =>
    `<div class="species${mz.bik.includes(k) ? ' got' : ''}"><span>${s.emoji}</span><b>${s.name}</b><small dir="rtl">${s.he}</small></div>`).join('');
  body.appendChild(basket);
  const bik = gameState.fruits.filter(f => f.bk);
  const rv = gameState.fruits.filter(f => f.rv);
  if (!bik.length && !rv.length) {
    const p = document.createElement('p'); p.className = 'empty-msg';
    p.innerHTML = T('Grow the Seven Species 🌾🍇🫒🌴 in your garden. When one ripens for the first time, tie a reed 🎀 and bring it here!<br><br>Fruit from a tree in its 4th year (Neta Revai 🏛️) comes here too.');
    body.appendChild(p);
  }
  bik.forEach(f => {
    const s = getSeedData(f.s), sp = SPECIES_OF_SEED[f.s];
    const row = document.createElement('div'); row.className = 'fruit-row'; row.style.setProperty('--rar', '#FFD54F');
    row.innerHTML = `<span class="fr-emoji">${s.emoji}</span><div class="fr-info"><b>${T`Bikkurim: ${s.name}`}</b><div class="kg">${T`First fruits of the ${SEVEN_SPECIES[sp].name}`}</div></div><button class="btn small">${T`Give 🧺`}</button>`;
    row.querySelector('button').addEventListener('click', e => bringBikkurim(f, e.currentTarget));
    body.appendChild(row);
  });
  if (rv.length) {
    const worth = rv.reduce((a, f) => a + fruitValue(f), 0);
    const row = document.createElement('div'); row.className = 'fruit-row'; row.style.setProperty('--rar', '#90CAF9');
    row.innerHTML = `<span class="fr-emoji">🏛️</span><div class="fr-info"><b>${T`${rv.length} Neta Revai fruit`}</b><div class="kg">${T`Eat them in Yerushalayim, praising Hashem`}</div></div><button class="btn small">¢${fmtSheckles(worth)}</button>`;
    row.querySelector('button').addEventListener('click', e => {
      const r = e.currentTarget.getBoundingClientRect();
      gameState.fruits = gameState.fruits.filter(f => !f.rv);
      gameState.sheckles += worth; gameState.totalEarned += worth;
      rv.forEach(() => { gameState.mz.revai = (gameState.mz.revai || 0) + 1; });
      mitzvah(null, rv.length);
      coinFly(r.left + r.width / 2, r.top, 6);
      Sfx.play('coin');
      showToast('🏛️', T`You enjoyed your Revai fruit in Yerushalayim! +¢${fmtSheckles(worth)} ⭐+${rv.length}`);
      updateHUD(); saveGame(); openTemple();
    });
    body.appendChild(row);
  }
  const t = document.createElement('p'); t.className = 'note';
  t.innerHTML = T`From your sales so far: 🌾 Terumah to the Kohen ¢${fmtSheckles(mz.terumahTotal || 0)} • 🪙 Ma'aser to the Levi ¢${fmtSheckles(mz.maaserTotal || 0)}`;
  body.appendChild(t);
  body.insertAdjacentHTML('beforeend', sourceHTML('deut26_2'));
  openPanel('temple-panel');
}
function bringBikkurim(f, btn) {
  const sp = SPECIES_OF_SEED[f.s];
  gameState.fruits = gameState.fruits.filter(x => x !== f);
  const reward = Math.round(Math.max(fruitValue(f) * 3, 100 * wealthScale()));
  gameState.sheckles += reward; gameState.totalEarned += reward;
  if (!gameState.mz.bik.includes(sp)) gameState.mz.bik.push(sp);
  mitzvah(null, 5);
  checkAchievement('bikkurim_first');
  const r = btn.getBoundingClientRect();
  coinFly(r.left + r.width / 2, r.top, 8);
  Sfx.play('unlock');
  confetti(40);
  if (gameState.mz.bik.length >= 7) {
    const bonus = Math.round(7000 * wealthScale());
    gameState.sheckles += bonus; gameState.totalEarned += bonus;
    checkAchievement('seven_species');
    setTimeout(() => bigBanner(T('✡️ All Seven Species!'), T`"A land of wheat and barley, vines, figs and pomegranates, olives and dates"<br>Bonus +¢${fmtSheckles(bonus)}`), 400);
  } else bigBanner(T('🎀 Bikkurim!'), T`"I have brought the first of the fruit of the land" (Devarim 26:10)<br>+¢${fmtSheckles(reward)} ⭐+5 • ${gameState.mz.bik.length} of 7 species`);
  updateHUD(); refreshAllPlants(); saveGame(); openTemple();
}

// ─── 📜 The Mitzvot book ───
function openMitzvot() {
  const body = $('#mitzvot-body');
  const mz = gameState.mz;
  const cy = cycleYear();
  let html = `<div class="mz-head"><div class="mz-stars">${T`⭐ <b>${fmtSheckles(mz.stars)}</b> mitzvah stars`}</div>
    <div class="mz-year">${cy === 7 ? T('🌿 Shemitah year — the land rests') : cy === 6 ? T('✨ Year 6 — harvests are doubled!') : T`📅 Garden year ${cy} of 7`} <span class="dim">${T`• next year in ${fmtTime(yearSecondsLeft())}`}</span></div>
    <div class="species-row">${Object.entries(SEVEN_SPECIES).map(([k, s]) => `<span class="${mz.bik.includes(k) ? 'got' : ''}" title="${s.name}">${s.emoji}</span>`).join('')}</div></div>`;
  MITZVOT.forEach(m => {
    const n = m.stat === 'bik' ? mz.bik.length : m.stat ? (mz[m.stat] || 0) : null;
    html += `<details class="mz-card"${m.id === 'peah' ? ' open' : ''}><summary><span class="mz-emoji">${m.emoji}</span><span class="mz-title"><span class="he" dir="rtl">${m.he}</span><b>${m.name}</b></span>${n != null ? `<span class="mz-count">${n}${m.stat === 'bik' ? '/7' : ''}</span>` : ''}</summary>
      <p>${m.what}</p><p class="teach-game">🎮 ${m.game}</p>${m.fact ? `<p class="mz-fact">💡 ${m.fact}</p>` : ''}
      ${m.sources.map(sourceHTML).join('')}${n != null && m.unit ? `<p class="mz-done">${m.stat === 'bik' ? T`You did it <b>${n}</b> of 7 — ${m.unit}` : T`You did it <b>${n}</b> ${m.unit}`}</p>` : ''}</details>`;
  });
  html += `<p class="mz-credit">${T`Texts from <a href="https://www.sefaria.org" target="_blank" rel="noopener">Sefaria</a>: Tanakh in English from JPS 1917 (public domain); Mishnah in English from Mishnah Yomit by Dr. Joshua Kulp (CC-BY). The game makes the halachot simpler so they're fun to learn — ask your rabbi for the real details!`}</p>`;
  body.innerHTML = html;
  openPanel('mitzvot-panel');
}

// ════════════════════════════════════════════
//  MULTIPLAYER — family worlds (see net.js)
//  Everyone in the world sees each other walking around, each other's
//  gardens growing, and can wave with kid-safe preset emotes.
// ════════════════════════════════════════════
const MAX_WORLD_GARDENERS = GARDENS.length;
const EMOTES = [['👋', T('Hi!')], ['❤️', ''], ['😂', T('LOL')], ['🌱', T('Nice garden!')], ['🛒', T('To the shop!')], ['⭐', T('Wow!')], ['🎉', T('Yay!')], ['🙏', T('Thank you!')]];
const remotePlayers = new Map();   // pid → { model, label, bubble, ... }
const worldProfiles = new Map();   // pid → { name, avatar, skin, slot, s }
const worldGardens = new Map();    // pid → { snap, t }
let myBubble = null;
let publishKey = '', publishTimer = 0, publishCooldown = 0;
let gardenRebuildTimer = 0, gardenRebuildNext = 0, signsKey = '';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
const shortName = n => String(n || 'Gardener').slice(0, 12);
const shortAvatar = a => String(a || '🌻').slice(0, 8);
const validSkin = k => (CHARACTER_SKINS[k] ? k : DEFAULT_SKIN);
const validSlot = s => Number.isInteger(s) && s >= 0 && s < GARDENS.length;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function myProfile() { return getProfiles().find(p => p.id === activeProfileId) || { name: 'Gardener', avatar: '🌻' }; }
function myInfo() {
  const p = myProfile();
  return { n: shortName(p.name), a: shortAvatar(p.avatar), sk: currentSkin(), x: +playerPos.x.toFixed(2), z: +playerPos.z.toFixed(2), y: 0, r: +playerFacing.toFixed(2), mv: 0 };
}

// Join the world as this gardener: claim a garden, pick the newest save.
// Resolves to the garden slot, or -1 if the gardener can't join right now.
async function joinWorldAs(id) {
  await Net.connect();
  if (await Net.isPlayingElsewhere(id)) {
    alert(T('This gardener is already playing on another device! Pick a different gardener, or close the game there first.'));
    return -1;
  }
  const cloud = await Net.fetchProfiles();
  const mine = cloud.find(p => p.id === id);
  const taken = new Set(cloud.filter(p => p.id !== id && validSlot(p.slot)).map(p => p.slot));
  let slot = mine && validSlot(mine.slot) && !taken.has(mine.slot) ? mine.slot : -1;
  if (slot < 0) for (let i = 0; i < GARDENS.length; i++) if (!taken.has(i)) { slot = i; break; }
  if (slot < 0) {
    alert(T`This family world already has ${MAX_WORLD_GARDENERS} gardens — it's full! Delete a gardener you don't use anymore to make room.`);
    return -1;
  }
  // Use whichever save is newer: the one on this device or the one in the cloud
  const cloudSave = await Net.loadSave(id);
  const localSave = readSave(id);
  if (cloudSave && (!localSave || (cloudSave.savedAt || 0) > (localSave.savedAt || 0))) {
    try { localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(cloudSave)); } catch (e) { /* storage full */ }
  }
  const profiles = getProfiles();
  let prof = profiles.find(p => p.id === id);
  if (!prof) { prof = { id }; profiles.push(prof); }
  if (mine) Object.assign(prof, { name: shortName(mine.name), avatar: shortAvatar(mine.avatar), skin: validSkin(mine.skin) });
  saveProfiles(profiles);
  const save = readSave(id);
  await Net.upsertProfile({ id, name: prof.name, avatar: prof.avatar, skin: prof.skin || DEFAULT_SKIN, slot, s: save ? save.sheckles || 0 : 50 });
  return slot;
}

function startNetSession() {
  worldProfiles.clear(); worldGardens.clear();
  publishKey = ''; publishTimer = 0; publishCooldown = 0; signsKey = '';
  Net.join(activeProfileId, myInfo(), { player: onRemotePlayer, playerLeft: removeRemote, garden: onRemoteGarden, profile: onWorldProfile });
  document.body.classList.add('online');
  updateOnlineCount();
  publishGarden(true);
  Net.uploadSave(activeProfileId, Object.assign({}, gameState, { savedAt: Date.now() }), true);
}
function stopNetSession() {
  if (!netMode) return;
  Net.leave();
  [...remotePlayers.keys()].forEach(removeRemote);
  worldProfiles.clear(); worldGardens.clear();
  clearNeighborMeshes();
  netMode = false;
  document.body.classList.remove('online');
  $('#emote-panel').classList.add('hidden');
}

// ─── Other players ───
function onRemotePlayer(pid, v) {
  if (!v || typeof v !== 'object') return;
  if (v.t && Date.now() - v.t > 30000) return;   // a ghost left behind by a crash
  let r = remotePlayers.get(pid);
  const skin = validSkin(v.sk), name = shortName(v.n), avatar = shortAvatar(v.a);
  if (!r) {
    r = { x: +v.x || 0, z: +v.z || 0, y: 0, r: +v.r || 0, walk: 0, et: v.et || 0, bubbleLeft: 0 };
    remotePlayers.set(pid, r);
    showToast(avatar, T`${name} is here!`);
    Sfx.play('pop');
  }
  if (r.skin !== skin) {
    if (r.model) scene.remove(r.model);
    r.skin = skin;
    r.model = buildCharacter(skin);
    r.model.position.set(r.x, r.y, r.z);
    scene.add(r.model);
  }
  const labelText = `${avatar} ${name}`;
  if (r.labelText !== labelText) {
    if (r.label) { scene.remove(r.label); r.label.material.map.dispose(); r.label.material.dispose(); }
    r.labelText = labelText;
    r.label = textSprite(labelText, '#FFFFFF');
    r.label.scale.multiplyScalar(0.85);
    scene.add(r.label);
  }
  r.name = name; r.avatar = avatar;
  r.tx = isFinite(v.x) ? clamp(+v.x, -WORLD_X, WORLD_X) : r.x;
  r.tz = isFinite(v.z) ? clamp(+v.z, -WORLD_Z, WORLD_Z) : r.z;
  r.ty = isFinite(v.y) ? clamp(+v.y, 0, 5) : 0;
  r.tr = isFinite(v.r) ? +v.r : r.r;
  r.mv = !!v.mv;
  r.last = Date.now();
  if (v.et && v.et !== r.et) {
    r.et = v.et;
    const i = v.emote | 0;
    if (EMOTES[i] && Date.now() - v.et < 15000) showBubble(r, i);
  }
  updateOnlineCount();
}
function removeRemote(pid) {
  const r = remotePlayers.get(pid);
  if (!r) return;
  [r.model, r.label, r.bubble].forEach(o => { if (o) scene.remove(o); });
  [r.label, r.bubble].forEach(o => { if (o) { o.material.map.dispose(); o.material.dispose(); } });
  remotePlayers.delete(pid);
  if (started) showToast('👋', T`${r.name || T('A gardener')} left`);
  updateOnlineCount();
}
function updateRemotePlayers(dt) {
  const k = 1 - Math.exp(-dt * 10);
  const now = Date.now();
  for (const [pid, r] of remotePlayers) {
    if (now - r.last > 25000) { removeRemote(pid); continue; }
    const px = r.x, pz = r.z;
    r.x = lerp(r.x, r.tx, k); r.z = lerp(r.z, r.tz, k); r.y = lerp(r.y, r.ty, k);
    let d = r.tr - r.r; d = Math.atan2(Math.sin(d), Math.cos(d)); r.r += d * k;
    const spd = Math.hypot(r.x - px, r.z - pz) / Math.max(dt, 1e-4);
    const u = r.model.userData;
    if (spd > 0.4 && r.y < 0.05) {
      r.walk += dt * Math.min(spd, 10) * 2.1;
      const sw = Math.sin(r.walk) * Math.min(0.9, spd * 0.12);
      if (u.armL) u.armL.rotation.x = sw;
      if (u.armR) u.armR.rotation.x = -sw;
      if (u.legL) u.legL.rotation.x = -sw;
      if (u.legR) u.legR.rotation.x = sw;
    } else ['armL', 'armR', 'legL', 'legR'].forEach(n => { if (u[n]) u[n].rotation.x = lerp(u[n].rotation.x, 0, Math.min(1, dt * 10)); });
    r.model.position.set(r.x, r.y + (spd > 0.4 ? Math.abs(Math.cos(r.walk)) * 0.06 : 0), r.z);
    r.model.rotation.y = r.r;
    r.label.position.set(r.x, r.y + 2.9, r.z);
    tickBubble(r, dt, r.x, r.y, r.z);
  }
  if (myBubble) tickBubble(myBubble, dt, playerPos.x, playerY, playerPos.z);
}
function updateOnlineCount() {
  setText($('#online-count'), String(remotePlayers.size + 1));
}

// ─── Emotes (preset only — no free typing, so it stays kid-safe) ───
function showBubble(holder, i) {
  const [emoji, word] = EMOTES[i];
  if (holder.bubble) { scene.remove(holder.bubble); holder.bubble.material.map.dispose(); holder.bubble.material.dispose(); }
  holder.bubble = textSprite(word ? `${emoji} ${word}` : emoji, '#1b1b1b', true);
  drawBubbleBack(holder.bubble);
  holder.bubbleLeft = 4;
  scene.add(holder.bubble);
}
// Speech-bubble background behind the emote text (re-draws the sprite canvas)
function drawBubbleBack(sprite) {
  const src = sprite.material.map.image;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height + 18;
  const ctx = c.getContext('2d');
  const w = c.width, h = src.height;
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(30, 4); ctx.lineTo(w - 30, 4); ctx.quadraticCurveTo(w - 4, 4, w - 4, h / 2);
  ctx.quadraticCurveTo(w - 4, h - 4, w - 30, h - 4); ctx.lineTo(w / 2 + 12, h - 4); ctx.lineTo(w / 2, h + 14); ctx.lineTo(w / 2 - 12, h - 4);
  ctx.lineTo(30, h - 4); ctx.quadraticCurveTo(4, h - 4, 4, h / 2); ctx.quadraticCurveTo(4, 4, 30, 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.drawImage(src, 0, 0);
  sprite.material.map.dispose();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  sprite.material.map = t;
  sprite.scale.set(sprite.scale.x, sprite.scale.y * c.height / src.height, 1);
}
function tickBubble(holder, dt, x, y, z) {
  if (!holder.bubble) return;
  holder.bubbleLeft -= dt;
  if (holder.bubbleLeft <= 0) {
    scene.remove(holder.bubble); holder.bubble.material.map.dispose(); holder.bubble.material.dispose();
    holder.bubble = null;
    return;
  }
  const pop = Math.min(1, (4 - holder.bubbleLeft) * 6);
  holder.bubble.position.set(x, y + 3.6 + (1 - pop) * -0.3, z);
  holder.bubble.material.opacity = Math.min(1, holder.bubbleLeft * 2);
}
function sendEmote(i) {
  if (!EMOTES[i]) return;
  myBubble = myBubble || {};
  showBubble(myBubble, i);
  Net.sendEmote(i);
  Sfx.play('pop');
  $('#emote-panel').classList.add('hidden');
  if (i === 0 && playerModel && playerModel.userData.armR) playerModel.userData.armR.rotation.z = 2.6;
}
function toggleEmotePanel() {
  if (!netMode) return;
  const p = $('#emote-panel');
  if (!p.children.length) {
    EMOTES.forEach(([emoji, word], i) => {
      const b = document.createElement('button');
      b.className = 'emote-opt';
      b.innerHTML = `<span>${emoji}</span>${word ? `<small>${word}</small>` : ''}`;
      b.addEventListener('click', e => { e.stopPropagation(); sendEmote(i); });
      p.appendChild(b);
    });
  }
  p.classList.toggle('hidden');
}

// ─── Gardens: publish mine, show everyone else's ───
const r2 = v => Math.round(v * 100) / 100;
function gardenSnapshot() {
  return {
    v: 4,
    slot: mySlot,
    s: Math.floor(gameState.sheckles),
    p: gameState.plants.map(p => {
      const o = { s: p.s, x: r2(p.x), z: r2(p.z), r: r2(p.r || 0), a: Math.round(p.age), g: p.grow };
      if (p.kg) o.k = r2(p.kg);
      if (p.m && p.m.length) o.m = p.m.slice(0, 6);
      if (p.fruits) o.f = p.fruits.map(f => f ? [Math.round(f.age), r2(f.kg), (f.m || []).slice(0, 6)] : 0);
      return o;
    }),
  };
}
function publishGarden(force) {
  if (!netMode) return;
  // Only re-send when something you'd notice changed (planted, ripened, harvested, mutated)
  const key = Math.floor(gameState.sheckles) + '|' + gameState.plants.map(p => p.id + (plantRipe(p) ? 'R' : '') + (p.m || []).join('') +
    (p.fruits ? p.fruits.map(f => f ? (f.age >= getSeedData(p.s).fruitTime ? 2 : 1) + (f.m || []).join('') : 0).join('') : '')).join(',');
  if (!force && key === publishKey && publishTimer < 60) return;
  if (!force && publishCooldown > 0) return;
  publishKey = key; publishTimer = 0; publishCooldown = 3;
  Net.publishGarden(activeProfileId, gardenSnapshot());
}
// Turn a snapshot back into plants, grown forward by however long ago it was sent
function snapshotPlants(snap, sentAt, toSlot) {
  const elapsed = clamp((Date.now() - sentAt) / 1000, 0, 3 * 86400);
  const plants = [];
  (Array.isArray(snap.p) ? snap.p : []).slice(0, MAX_PLANTS).forEach(o => {
    const seed = o && getSeedData(o.s);
    if (!seed || !isFinite(o.x) || !isFinite(o.z)) return;
    const grow = +o.g || seed.grow;
    const before = +o.a || 0;
    const age = Math.min(grow, before + elapsed);
    const p = { s: o.s, x: +o.x, z: +o.z, r: +o.r || 0, age, grow, kg: +o.k || seed.kg, m: Array.isArray(o.m) ? o.m.filter(k => MUTATIONS[k]) : [] };
    if (seed.multi) {
      const left = elapsed - (age - before);
      p.fruits = (Array.isArray(o.f) ? o.f : []).slice(0, seed.maxFruits).map(f => f ? { age: Math.min(seed.fruitTime, (+f[0] || 0) + left), kg: +f[1] || seed.kg, m: Array.isArray(f[2]) ? f[2].filter(k => MUTATIONS[k]) : [] } : null);
      if (age >= grow) while (p.fruits.length < seed.maxFruits) p.fruits.push({ age: Math.min(seed.fruitTime, left), kg: seed.kg, m: [] });
    }
    plants.push(p);
  });
  const st = { plants };
  const from = validSlot(snap.slot) ? snap.slot : toSlot;
  if (!snap.v) shiftFromOldLayout(st, from);
  relocateState(st, from, toSlot);
  return st.plants;
}
function gardenStillGrowing(plants) {
  return plants.some(p => p.age < p.grow || (p.fruits && p.fruits.some(f => !f || f.age < getSeedData(p.s).fruitTime)));
}
function ownerOfSlot(slot) {
  for (const [pid, prof] of worldProfiles) if (pid !== activeProfileId && prof.slot === slot) return pid;
  return null;
}
function rebuildOnlineGarden(slot) {
  if (slot === mySlot) return;
  const pid = ownerOfSlot(slot);
  const g = pid && worldGardens.get(pid);
  const plants = g ? snapshotPlants(g.snap, g.t, slot) : null;
  setNeighborMesh(slot, plants);
  return plants;
}
function rebuildOnlineSigns() {
  const names = [];
  for (const [, prof] of worldProfiles) if (validSlot(prof.slot)) names[prof.slot] = shortName(prof.name);
  names[mySlot] = shortName(myProfile().name);
  const key = names.join('|') + '#' + mySlot;
  if (key === signsKey) return;
  signsKey = key;
  buildGardenSigns(names, mySlot);
}
function rebuildOnlineGardens() {
  rebuildOnlineSigns();
  GARDENS.forEach((g, i) => rebuildOnlineGarden(i));
}
// Every few seconds re-grow one neighbor garden (round robin keeps it cheap)
function tickOnlineGardens(dt) {
  gardenRebuildTimer -= dt;
  if (gardenRebuildTimer > 0) return;
  gardenRebuildTimer = 5;
  for (let n = 0; n < GARDENS.length; n++) {
    const slot = (gardenRebuildNext + n) % GARDENS.length;
    const pid = slot !== mySlot && ownerOfSlot(slot);
    const g = pid && worldGardens.get(pid);
    if (g && g.growing) {
      gardenRebuildNext = slot + 1;
      const plants = rebuildOnlineGarden(slot);
      g.growing = !!plants && gardenStillGrowing(plants);
      return;
    }
  }
}
function onRemoteGarden(pid, snap, t) {
  if (pid === activeProfileId) return;
  if (!snap) worldGardens.delete(pid);
  else worldGardens.set(pid, { snap, t: Math.min(t || Date.now(), Date.now()), growing: true });
  const prof = worldProfiles.get(pid);
  if (prof && validSlot(prof.slot)) {
    const plants = rebuildOnlineGarden(prof.slot);
    const g = worldGardens.get(pid);
    if (g) g.growing = !!plants && gardenStillGrowing(plants);
  }
}
function onWorldProfile(pid, v) {
  if (pid === activeProfileId) return;
  const old = worldProfiles.get(pid);
  if (!v) worldProfiles.delete(pid);
  else worldProfiles.set(pid, { name: shortName(v.name), avatar: shortAvatar(v.avatar), skin: validSkin(v.skin), slot: validSlot(v.slot) ? v.slot : -1, s: +v.s || 0 });
  rebuildOnlineSigns();
  updateLeaderboard();
  const now = worldProfiles.get(pid);
  if (old && validSlot(old.slot) && (!now || now.slot !== old.slot)) rebuildOnlineGarden(old.slot);
  if (now && validSlot(now.slot) && (!old || now.slot !== old.slot)) rebuildOnlineGarden(now.slot);
}
function updateNet(dt) {
  if (!netMode) return;
  Net.sendState({ x: playerPos.x, z: playerPos.z, y: playerY, r: playerFacing, mv: Math.hypot(playerVel.x, playerVel.z) > 0.3 });
  updateRemotePlayers(dt);
  publishTimer += dt;
  publishCooldown -= dt;
  if (Math.floor(publishTimer) !== Math.floor(publishTimer - dt)) publishGarden(false);
  tickOnlineGardens(dt);
}

// ════════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════════
let secondTimer = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  if (started) {
    updatePlayer(dt);
    focus = computeFocus();
    updateGarden(dt);
    updateWeather(dt);
    updatePets(dt, time);
    updateGuide(time, dt);
    updateNet(dt);
    updateRut(dt, time);
    checkShichecha();
    autoSaveTimer += dt;
    if (autoSaveTimer >= AUTO_SAVE_SEC) { autoSaveTimer = 0; saveGame(); }
    secondTimer -= dt;
    if (secondTimer <= 0) {
      secondTimer = 1;
      checkRestock();
      tickYears();
      updateRestockTimer();
      updateTimeHUD();
      leaderTimer++;
      if (leaderTimer % 5 === 0) updateLeaderboard();
    }
  }
  updateCamera(dt, time);
  updateDayNight(dt);
  updateStalls(time);
  updateCritters(time);
  updateRain(dt);
  updateSnow(dt, time);
  updateMeteors(dt);
  if (boltTime > 0) { boltTime -= dt; if (boltTime <= 0) boltMesh.visible = false; }
  if (flash > 0) flash = Math.max(0, flash - dt * 4);
  updateParticles(dt);
  animatePlants(time, dt);
  updateFruitInstances(time);
  animatePlaced(time, dt);
  clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 110) c.position.x = -110; });
  MATS.water.map.offset.x = time * 0.03;
  if (started) updatePrompt();
  adaptQuality(dt);
  renderer.render(scene, camera);
}

function startProfile() {
  const result = loadGame();
  MY_GARDEN = GARDENS[mySlot] || GARDENS[0];
  relocateState(gameState, gameState.slot || 0, mySlot);
  gameState.slot = mySlot;
  const tp = TELEPORTS.garden;
  playerPos.set(tp.x, 0, tp.z + MY_GARDEN.dir * 2.5);
  playerVel.set(0, 0, 0);
  playerY = 0; playerVY = 0; onGround = true;
  yaw = tp.yaw; pitch = 0.55; camDist = isMobile ? 12 : 11;
  playerFacing = yaw + Math.PI;
  camPos.set(playerPos.x + Math.sin(yaw) * 12, 8, playerPos.z + Math.cos(yaw) * 12);
  moveTarget = null; focus = null; carrying = null; shovelArmed = null;
  weather = null; moonlitCount = 0;
  if (rut) despawnRut();
  rutTimer = 6; tripHarvests = []; wasInGarden = false; lastYear = null; teachQueue.length = 0;
  gameState.plants.forEach(p => { if (p.py != null && !p.ol) p.ol = orlahPhase(p); });
  [...plantViews.keys()].forEach(removePlantView);
  [...petEntities.keys()].forEach(id => { scene.remove(petEntities.get(id).model); petEntities.delete(id); });
  buildPlayerModel();
  refreshAllPlants();
  refreshGifts();
  refreshPlaced();
  syncPetEntities();
  if (netMode) startNetSession();
  buildNeighborGardens();
  updateEggDisplay();
  fillTasks();
  updateHUD(); updateHotbar(); updateLeaderboard(); refreshSoundButtons(); weatherBanner();
  started = true;
  tickYears();
  if (!gameState.mz.tips.intro && result !== 'new') setTimeout(() => teach('intro'), 1500);
  document.body.classList.add('playing');
  lastFocusKey = '?';
  lastSlot = shopSlot(SHOP_RESTOCK);
  if (result === 'migrated') {
    setTimeout(() => bigBanner(T('🎉 Big Update!'), T('Your garden moved to the new world!<br>Coins became ¢ Sheckles, crops are in your 🎒 Backpack, and Buddy is your first pet 🐶')), 600);
    saveGame();
  } else if (result === 'loaded') {
    const ripe = gameState.plants.filter(plantRipe).length;
    if (ripe) showToast('🌅', ripe > 1 ? T`Welcome back! ${ripe} plants have fruit ready!` : T`Welcome back! 1 plant has fruit ready!`);
    setTimeout(maybeDailyGift, 900);
  } else {
    gameState.lastDaily = todayStr();
    gameState.dailyStreak = 1;
    setTimeout(() => showToast('👋', T('Welcome! Follow the pointing hand 👇 to plant your first seed.')), 600);
    saveGame();
  }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && started) saveGame(true); });
window.addEventListener('beforeunload', () => { if (started) saveGame(true); });
window.addEventListener('pagehide', () => { if (started) saveGame(true); });

function boot() {
  applyStaticLanguage();
  initRenderer();
  initMaterials();
  initSky();
  initLighting();
  buildWorld();
  buildCritters();
  buildRain();
  buildSnow();
  buildParticles();
  buildGardenSystems();
  bindInput();
  bindUI();
  showProfileScreen();
  animate();
}

// Small hook for automated testing / debugging from the console
window.__garden = {
  get state() { return gameState; },
  worldToScreen(x, y, z) { return worldToScreen(x, y, z); },
  fastForward(sec) { for (let t = 0; t < sec; t += 0.5) updateGarden(0.5); refreshAllPlants(); },
  setTime(t) { dayOffset = 0; dayOffset = t - globalDayTime(); },
  startWeather(id) { startWeather(id); },
  strike() { lightningStrike(); },
  meteor() { launchMeteor(); },
  teleport(w) { teleport(w); },
  view(x, z, d, p, y) { playerPos.set(x, 0, z); camDist = d; pitch = p; yaw = y || 0; },
  refresh() { refreshAllPlants(); refreshPlaced(); syncPetEntities(); updateHUD(); updateHotbar(); },
  get focus() { return focus; },
  petTick(sec) { for (const e of petEntities.values()) e.timer = Math.min(e.timer, 0.01); updatePets(0.05, 0); void sec; },
  get player() { return { x: playerPos.x, z: playerPos.z, target: moveTarget && { x: moveTarget.x, z: moveTarget.z } }; },
  get mz() { return gameState.mz; },
  poke(x, z) { playerPos.set(x - Math.sin(playerFacing), 0, z - Math.cos(playerFacing)); focus = computeFocus(); const k = focus && focus.kind; interact(focus); return k; },
  get garden() { return { x: MY_GARDEN.x, z: MY_GARDEN.z, dir: MY_GARDEN.dir, peah: peahRects()[0], peahs: peahRects() }; },
  get year() { return { cy: cycleYear(), idx: gardenYearIndex() }; },
  setYear(cy) { const cur = cycleYear(); dayOffset += ((cy - cur) % 7 + 7) % 7 || 0; tickYears(); },
  get gifts() { return gameState.gifts; },
  get rut() { return rut && { x: rut.x, z: rut.z, got: rut.got }; },
  get net() { return { netMode, mySlot, world: Net.world, remotes: [...remotePlayers.entries()].map(([id, r]) => ({ id, name: r.name, x: r.x, z: r.z, bubble: !!r.bubble })), neighbors: [...neighborMeshes.keys()], profiles: [...worldProfiles.entries()].map(([id, p]) => Object.assign({ id }, p)) }; },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
