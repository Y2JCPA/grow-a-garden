/* ============================================
   GROW A GARDEN 3D — Main Game (Three.js)
   Plays like the Roblox game "Grow a Garden": plant anywhere in your
   garden, collect fruit with weights and mutations, sell to Steven,
   buy from restocking shops, hatch pet eggs, survive weather events.
   Depends on: three.js, data.js, voxel.js, plants.js, pets.js, skins.js, audio.js
   ============================================ */
(function() {
'use strict';

// ─── Constants ───
const WORLD_X = 50, WORLD_Z = 38;    // walkable half-extents
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
const MAX_PLANTS = 120;
const MAX_EGGS_PLACED = 3;
const MAX_PETS_EQUIPPED = 3;
const SHOP_RESTOCK = 300;             // seconds between seed / gear restocks
const EGG_RESTOCK = 600;
const PROFILES_KEY = 'garden3d_profiles';
const SAVE_PREFIX = 'garden3d_save_';
const MAX_PROFILES = 10;
const AUTO_SAVE_SEC = 10;
const SAVE_VERSION = 3;

// ─── Map: a market street in the middle, three gardens on each side ───
const GARDEN_D = 24;
const GARDENS = [
  { x: 0, z: -20, dir: -1 },   // yours (south, facing the market)
  { x: -32, z: -20, dir: -1 }, { x: 32, z: -20, dir: -1 },
  { x: -32, z: 20, dir: 1 }, { x: 0, z: 20, dir: 1 }, { x: 32, z: 20, dir: 1 },
];
const MY_GARDEN = GARDENS[0];
// Two dirt beds per garden with a path between them (local coords)
const BED_X0 = 1.6, BED_X1 = 12.6, BED_Z = 10.4;
const STALLS = {
  seeds: { x: -15, label: "🌱 Seeds", npc: 'Shlomo', colors: [0x2E7D32, 0xFFFFFF], shirt: 0xFFF9C4, apron: 0x388E3C, hat: 'straw' },
  sell:  { x: -5,  label: '💰 Sell',  npc: 'Steven', colors: [0xF9A825, 0xFFFFFF], shirt: 0x43A047, apron: 0x795548, hat: 'cap' },
  gear:  { x: 5,   label: '⚙️ Gear',  npc: 'Gear Shop', colors: [0x1565C0, 0xFFFFFF], shirt: 0x90CAF9, apron: 0x1565C0, hat: 'cap' },
  pets:  { x: 15,  label: '🥚 Pet Eggs', npc: 'Pet Shop', colors: [0x8E24AA, 0xFFFFFF], shirt: 0xF8BBD0, apron: 0x8E24AA, hat: 'straw' },
};
const STALL_Z = 1.2;           // stall center z; customers stand around z = -2.5
const STALL_REACH = 3.2;
const TELEPORTS = {
  seeds: { x: STALLS.seeds.x, z: -3.2, yaw: Math.PI },
  sell:  { x: STALLS.sell.x,  z: -3.2, yaw: Math.PI },
  gear:  { x: STALLS.gear.x,  z: -3.2, yaw: Math.PI },
  pets:  { x: STALLS.pets.x,  z: -3.2, yaw: Math.PI },
  garden:{ x: MY_GARDEN.x,    z: MY_GARDEN.z + GARDEN_D / 2 - 2, yaw: 0 },
};

// ─── Game State (saved per profile) ───
let uid = Date.now() % 100000;
function newId() { return (++uid).toString(36) + Math.floor(Math.random() * 1296).toString(36); }
function freshState() {
  return {
    version: SAVE_VERSION,
    sheckles: 50,
    seeds: { carrot: 3, strawberry: 1 },
    gear: { shovel: 1 },
    eggs: {},
    fruits: [],              // backpack: {s, kg, m: [mutations], fav}
    plants: [],              // {id, s, x, z, r, age, grow, kg, m, fruits[], water}
    placed: [],              // sprinklers / lightning rods: {id, gear, x, z, left, uses}
    placedEggs: [],          // {id, egg, x, z, left, total}
    pets: [{ id: 'buddy', type: 'dog', name: 'Buddy', age: 0 }],
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
  };
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
let weatherTimer = 120;
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe3ff, 40, 140);
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
  const noise = Tex.get('noise');
  MATS.voxel = new THREE.MeshLambertMaterial({ vertexColors: true, map: noise });
  MATS.plant = new THREE.MeshLambertMaterial({ vertexColors: true, map: noise });
  MATS.dirt = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.get('dirt') });
  MATS.path = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.get('path') });
  MATS.fruit = new THREE.MeshLambertMaterial({ color: 0xffffff });
  MATS.fruitGlow = new THREE.MeshBasicMaterial({ color: 0xffffff });
  MATS.ghost = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
  MATS.ring = new THREE.MeshBasicMaterial({ color: 0x4FC3F7, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  MATS.water = new THREE.MeshLambertMaterial({ map: Tex.get('water'), transparent: true, opacity: 0.85 });
  MATS.lamp = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xfff3c4, emissive: 0x000000 });
  // single-harvest crops are tinted by their strongest mutation
  MATS.mut = {};
  Object.entries(MUTATIONS).forEach(([k, m]) => {
    MATS.mut[k] = new THREE.MeshLambertMaterial({ vertexColors: true, map: noise, color: m.tint, emissive: m.glow ? new THREE.Color(m.tint).multiplyScalar(0.35) : 0x000000 });
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
    dirt.box(w, DIRT_Y + 0.05, BED_Z * 2, 0xffffff, cx, (DIRT_Y - 0.05) / 2, g.z);
    b.box(w + 0.3, 0.22, 0.2, 0x8D6E63, cx, 0.11, g.z - BED_Z - 0.1);
    b.box(w + 0.3, 0.22, 0.2, 0x8D6E63, cx, 0.11, g.z + BED_Z + 0.1);
    b.box(0.2, 0.22, BED_Z * 2, 0x795548, cx - w / 2 - 0.05, 0.11, g.z);
    b.box(0.2, 0.22, BED_Z * 2, 0x795548, cx + w / 2 + 0.05, 0.11, g.z);
  });
}

function buildWorld() {
  const grass = Tex.get('grass').clone();
  grass.needsUpdate = true;
  grass.repeat.set(130, 100);
  MATS.ground = new THREE.MeshLambertMaterial({ map: grass });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), MATS.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const rand = seededRandom(4321);
  const statics = new VoxelBatch(4);
  const decor = new VoxelBatch(4);
  const paths = new VoxelBatch(1.5);
  const dirt = new VoxelBatch(1.2);
  const lamps = new VoxelBatch(4);

  // Market street + paths into each garden
  paths.box(WORLD_X * 2, 0.04, 11, 0xffffff, 0, 0.02, 0);
  GARDENS.forEach(g => {
    paths.box(3, 0.04, GARDEN_D + 2, 0xf2ead8, g.x, 0.02, g.z);
    buildGardenGround(g, statics, dirt);
  });
  // curbs along the street
  for (let x = -WORLD_X; x < WORLD_X; x += 4) {
    [-5.6, 5.6].forEach(z => decor.box(3.9, 0.12, 0.25, 0xBDBDBD, x + 2, 0.06, z));
  }
  // Street lamps
  [-42, -24, -9, 9, 24, 42].forEach(x => {
    [-6.2, 6.2].forEach(z => {
      statics.box(0.18, 3, 0.18, 0x37474F, x, 1.5, z);
      statics.box(0.5, 0.1, 0.5, 0x263238, x, 3.05, z);
      lamps.box(0.36, 0.42, 0.36, 0xffffff, x, 2.78, z);
      addCollider(x, z, 0.3);
    });
  });
  // Flower boxes between gardens
  [-16, 16].forEach(x => [-20, 20].forEach(z => {
    for (let k = -2; k <= 2; k++) {
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
  const title = textSprite('🌱 Grow a Garden 🌱', '#2E7D32', true);
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
  [[-48, -8], [48, -8], [-48, 8], [48, 8], [-16, -34], [16, -34], [-16, 34], [16, 34]].forEach(([x, z]) => {
    buildTree(statics, x, z, treeTypes[Math.floor(rand() * treeTypes.length)], rand);
    addCollider(x, z, 0.8);
  });
  // Hills on the horizon
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + rand() * 0.1;
    const d = 110 + rand() * 20;
    const w = 20 + rand() * 18, h = 3 + rand() * 7;
    statics.box(w, h, w, 0x5b9e45, Math.cos(a) * d, h / 2, Math.sin(a) * d * 0.8, 0, a, 0);
  }
  // Grass tufts & wildflowers outside the gardens
  const flowerColors = [0xFFEB3B, 0xFF80AB, 0xFFFFFF, 0xB388FF, 0xFF7043];
  for (let i = 0; i < 500; i++) {
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
  if (def.npc === 'Shlomo') part(0.42, 0.14, 0.06, 0x5D4037, 0, -0.2, 0.24, head);
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
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  c.width = w; c.height = 72;
  ctx.font = font;
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
function buildClouds(rand) {
  for (let i = 0; i < 9; i++) {
    const b = new VoxelBatch(1);
    const n = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      b.box(4 + rand() * 5, 1.4 + rand() * 1, 3 + rand() * 4, 0xffffff, k * 3 - n * 1.5, rand() * 0.8, (rand() - 0.5) * 3);
    }
    const m = new THREE.Mesh(b.build(), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92, emissive: 0x666666 }));
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
  const box = new THREE.BoxGeometry(1, 1, 1);
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
const neighborMeshes = [];
const gardenSigns = [];
function buildGardenSigns(names) {
  gardenSigns.forEach(s => scene.remove(s));
  gardenSigns.length = 0;
  GARDENS.forEach((g, i) => {
    const z = g.z - g.dir * (GARDEN_D / 2 - 0.2);
    const sign = new THREE.Group();
    const b = new VoxelBatch(4);
    b.box(0.15, 1.6, 0.15, 0x6D4C41, -2.6, 0.8, 0); b.box(0.15, 1.6, 0.15, 0x6D4C41, 2.6, 0.8, 0);
    b.box(5.6, 1.0, 0.12, i === 0 ? 0xFFF59D : 0xFFF8E1, 0, 1.75, 0);
    sign.add(voxelMesh(b));
    const t = textSprite(names[i] ? `${names[i]}'s Garden` : 'Empty Garden', i === 0 ? '#2E7D32' : '#5D4037', true);
    t.position.set(0, 1.75, g.dir < 0 ? 0.1 : -0.1);
    t.scale.multiplyScalar(1.25);
    sign.add(t);
    sign.position.set(g.x + 6, 0, z);
    scene.add(sign);
    gardenSigns.push(sign);
  });
}

function buildNeighborGardens() {
  neighborMeshes.forEach(m => { scene.remove(m); m.geometry.dispose(); });
  neighborMeshes.length = 0;
  const names = [];
  const me = getProfiles().find(p => p.id === activeProfileId);
  names[0] = me ? me.name : 'My';
  const others = getProfiles().filter(p => p.id !== activeProfileId).slice(0, GARDENS.length - 1);
  others.forEach((prof, k) => {
    const gi = k + 1;
    names[gi] = prof.name;
    const save = readSave(prof.id);
    if (!save) return;
    const plants = migrateSaveToV3(JSON.parse(JSON.stringify(save))).plants;
    const g = GARDENS[gi];
    const parts = [];
    const fruitBatch = new VoxelBatch(6);
    plants.slice(0, 120).forEach(p => {
      const seed = getSeedData(p.s);
      if (!seed) return;
      const prog = plantProgress(p);
      const built = makePlantGeometry(p, seed, prog, prog >= 1);
      // place in the neighbor's garden (gardens are mirrored for the north row)
      const lx = p.x - MY_GARDEN.x, lz = (p.z - MY_GARDEN.z) * (g.dir === MY_GARDEN.dir ? 1 : -1);
      const m4 = new THREE.Matrix4();
      let s = seed.roblox ? (SELF_SCALING.includes(p.s) ? 1 : 0.35 + 0.65 * prog) : CLASSIC_SCALE;
      m4.compose(new THREE.Vector3(g.x + lx, seed.roblox ? DIRT_Y : DIRT_Y - 0.32 * CLASSIC_SCALE, g.z + lz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.r || 0, 0)), new THREE.Vector3(s, s, s));
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
          fruitBatch.box(shape[0] * sz, shape[1] * sz, shape[2] * sz, c, g.x + lx + lx2, DIRT_Y + slot[1], g.z + lz + lz2);
        });
      }
    });
    if (!fruitBatch.isEmpty()) parts.push({ geometry: fruitBatch.build(), matrix: new THREE.Matrix4() });
    if (!parts.length) return;
    const merged = VoxelBatch.merge(parts);
    parts.forEach(pt => pt.geometry.dispose());
    const mesh = new THREE.Mesh(merged, MATS.plant);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    neighborMeshes.push(mesh);
  });
  buildGardenSigns(names);
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
  if (gameState.placed.length !== before) { refreshPlaced(); showToast('💦', 'A sprinkler ran out.'); }
  const eggRate = 1 + petPower('eggs') / 100;
  gameState.placedEggs.forEach(e => {
    if (e.left > 0) { e.left -= dt * eggRate; if (e.left <= 0) { Sfx.play('pop'); floatText(e.x, 1.4, e.z, '🥚 Ready to hatch!', '#FFF59D'); } }
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
function startWeather(id) {
  const def = WEATHER[id];
  weather = { id, left: def.time[0] + Math.random() * (def.time[1] - def.time[0]), total: 0 };
  weather.total = weather.left;
  lightningTimer = 4; meteorTimer = 3;
  Sfx.play(id === 'thunderstorm' ? 'thunder' : 'restock');
  weatherBanner();
}
function updateWeather(dt) {
  if (weather) {
    weather.left -= dt;
    const id = weather.id;
    if (id === 'rain' || id === 'thunderstorm') mutateSome(1 / 110, 'wet', dt);
    if (id === 'frost') mutateSome(1 / 110, 'chilled', dt);
    if (id === 'blood_moon') mutateSome(1 / 140, 'bloodlit', dt);
    if (id === 'thunderstorm') { lightningTimer -= dt; if (lightningTimer <= 0) { lightningTimer = 9 + Math.random() * 10; lightningStrike(); } }
    if (id === 'meteor_shower') { meteorTimer -= dt; if (meteorTimer <= 0) { meteorTimer = 6 + Math.random() * 6; launchMeteor(); } }
    if (weather.left <= 0) {
      showToast(WEATHER[id].emoji, `The ${WEATHER[id].name} is over.`);
      weather = null;
      weatherTimer = 150 + Math.random() * 150;
      weatherBanner();
    }
  } else {
    weatherTimer -= dt;
    if (weatherTimer <= 0) {
      const night = nightFactor > 0.6;
      const opts = Object.entries(WEATHER).filter(([, w]) => !w.night || night);
      const total = opts.reduce((a, [, w]) => a + w.weight, 0);
      let r = Math.random() * total;
      for (const [id, w] of opts) { r -= w.weight; if (r <= 0) { startWeather(id); break; } }
    }
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
  if (shocked) { showToast('⚡', `Lightning! ${shocked} fruit${shocked > 1 ? 's are' : ' is'} now Shocked (100x)!`); checkAchievement('shocking'); }
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
      if (n) { showToast('🌠', `A meteor made ${n} fruit Celestial (120x)!`); checkAchievement('celestial'); }
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
  if (gameState.plants.length >= MAX_PLANTS) { Sfx.play('deny'); showToast('🌳', 'Your garden is full! Dig something up with the ⛏️ Shovel.'); return false; }
  if (!spotFree(x, z, seedRadius(seedId))) { Sfx.play('deny'); showToast('🚫', inMyGarden(x, z) ? 'Too close to another plant!' : 'Plant on the dirt in your garden!'); return false; }
  consume('seed', seedId);
  const p = { id: newId(), s: seedId, x, z, r: Math.random() * Math.PI * 2, age: 0, grow: seed.grow, kg: 0, m: [], fruits: seed.multi ? [] : null, water: 0 };
  gameState.plants.push(p);
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
  // pets with "dupe" can give an extra copy
  const dupe = petPower('dupe');
  got.slice().forEach(f => { if (Math.random() * 100 < dupe) { got.push({ s: f.s, kg: f.kg, m: f.m.slice() }); floatText(p.x, 2.4, p.z, '🐜 Extra fruit!', '#FFCC80'); } });
  let added = 0;
  for (const f of got) {
    if (gameState.fruits.length >= MAX_FRUITS) { showToast('🎒', 'Backpack full! Sell at the 💰 Sell stand.'); break; }
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
  if (!added) return 0;
  if (!gameState.harvestedTypes.includes(p.s)) gameState.harvestedTypes.push(p.s);
  const best = got.reduce((a, b) => fruitValue(b) > fruitValue(a) ? b : a, got[0]);
  const special = got.some(f => f.m.length) || ['mythical', 'divine', 'prismatic'].includes(seed.rarity);
  Sfx.play('harvest');
  if (special) setTimeout(() => Sfx.play('sparkle'), 180);
  spawnParticles(p.x, 1, p.z, [seed.fruitColor || seed.color, 0xFFFFFF, 0xFFF59D], special ? 26 : 14, 4, 0.12);
  floatText(p.x, 2, p.z, `+${added} ${seed.emoji}`, '#FFFFFF');
  setTimeout(() => floatText(p.x, 1.5, p.z, `${best.kg}kg • ¢${fmtSheckles(fruitValue(best))}`, best.m.length ? MUTATIONS[topMutation(best.m)].color : '#B9F6CA'), 220);
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
  if (!p) { showToast('🚿', 'Walk up to a plant to water it!'); return; }
  consume('gear', 'watering_can');
  p.water = 60;
  const seed = getSeedData(p.s);
  if (p.age < p.grow) p.age = Math.min(p.grow, p.age + p.grow * 0.05);
  else if (seed.multi) p.fruits.forEach(f => { if (f) f.age = Math.min(seed.fruitTime, f.age + seed.fruitTime * 0.1); });
  Sfx.play('water');
  spawnParticles(p.x, 2, p.z, [0x4FC3F7, 0x81D4FA, 0xB3E5FC], 24, 1.2, 0.08, { down: true, spread: 1.4, life: 0.7, grav: 12 });
  floatText(p.x, 1.8, p.z, '💧 Growing faster!', '#81D4FA');
  taskEvent('water', 1);
  refreshPlantView(p);
}

function placeGear(gearId, x, z) {
  if (!spotFree(x, z, 0.3)) { Sfx.play('deny'); showToast('🚫', 'Place it on free dirt in your garden.'); return; }
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
  if (gameState.placedEggs.length >= MAX_EGGS_PLACED) { Sfx.play('deny'); showToast('🥚', `You can only hatch ${MAX_EGGS_PLACED} eggs at once.`); return; }
  if (!spotFree(x, z, 0.45)) { Sfx.play('deny'); showToast('🚫', 'Put the egg on free dirt in your garden.'); return; }
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
    showToast('⛏️', `Press again to dig up this ${getSeedData(p.s).name}.`);
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
  showToast('⛏️', `Carrying ${getSeedData(p.s).name} — press E on free dirt to put it down.`);
}
function dropCarried(x, z) {
  if (!spotFree(x, z, seedRadius(carrying.s), carrying.id)) { Sfx.play('deny'); showToast('🚫', 'Find a free spot in your garden.'); return; }
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
  setTimeout(() => bigBanner(`${def.emoji} ${def.name}!`, `<span style="color:${rar.color}">${rar.name}</span> • ${describeAbility(def.ability)}${equippedNow ? '' : '<br>Equip it from the 🐾 Pets menu'}`), 500);
  checkAchievement('first_pet');
  if (gameState.petsHatched.length >= 5) checkAchievement('pet_collector');
  taskEvent('hatch', 1);
  updateHotbar(); saveGame();
}

// ─── Selling ───
function sellFruits(list) {
  let total = 0, kept = 0;
  const refund = petPower('refund');
  list.forEach(f => {
    total += fruitValue(f);
    if (Math.random() * 100 < refund) kept++;
    else gameState.fruits.splice(gameState.fruits.indexOf(f), 1);
  });
  gameState.sheckles += total;
  gameState.totalEarned += total;
  if (gameState.totalEarned >= 10000) checkAchievement('entrepreneur');
  if (gameState.sheckles >= 1000000) checkAchievement('millionaire');
  if (kept) setTimeout(() => showToast('🐒', `Your monkey kept ${kept} fruit for you!`), 600);
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
  const extra = Object.keys(getSeasonalSeeds());
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
    showToast('🛒', rare.length ? `Seed Shop restocked — ${rare.map(id => getSeedData(id).emoji + ' ' + getSeedData(id).name).join(', ')} in stock!` : 'The Seed & Gear shops restocked!');
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
  const label = textSprite(`${def.emoji} ${pet.name}`);
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
    floatText(x, 1.6, z, `${getSeedData(id).emoji} +1 seed!`, '#FFE082');
    showToast(def.emoji, `${e.pet.name} dug up a ${getSeedData(id).emoji} ${getSeedData(id).name} seed!`);
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
      showToast(def.emoji, `${e.pet.name} made a fruit ${MUTATIONS[a.mut].name}!`);
      Sfx.play('sparkle');
    }
  } else if ((a.type === 'water' || a.type === 'advance') && e.plan && gameState.plants.includes(e.plan)) {
    const p = e.plan, seed = getSeedData(p.s);
    const secs = a.type === 'water' ? p.grow * 0.08 : a.secs * strength;
    if (p.age < p.grow) p.age = Math.min(p.grow, p.age + secs);
    else if (seed.multi) p.fruits.forEach(f => { if (f) f.age = Math.min(seed.fruitTime, f.age + secs); });
    if (a.type === 'water') { p.water = 60; spawnParticles(p.x, 1.5, p.z, [0x4FC3F7, 0xB3E5FC], 14, 1, 0.07, { down: true, spread: 1 }); }
    floatText(x, 1.6, z, a.type === 'water' ? '💧 Watered!' : '⏩ Growth!', '#B3E5FC');
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
  first_sprout:    { name: 'First Sprout',     emoji: '🌱', desc: 'Plant your first seed' },
  green_thumb:     { name: 'Green Thumb',      emoji: '🌻', desc: 'Harvest 10 fruits' },
  master_gardener: { name: 'Master Gardener',  emoji: '🏆', desc: 'Harvest 50 fruits' },
  entrepreneur:    { name: 'Entrepreneur',     emoji: '💰', desc: 'Earn ¢10,000 selling fruit' },
  millionaire:     { name: 'Millionaire',      emoji: '💵', desc: 'Have ¢1,000,000 at once' },
  rare_find:       { name: 'Rare Find',        emoji: '💎', desc: 'Harvest a Rare (or better) plant' },
  mythic:          { name: 'Mythical Grower',  emoji: '🦄', desc: 'Harvest a Mythical (or better) plant' },
  prismatic:       { name: 'Jack & the Beanstalk', emoji: '🌿', desc: 'Harvest a Prismatic Beanstalk' },
  variety_pack:    { name: 'Variety Pack',     emoji: '🌈', desc: 'Harvest 8 different kinds of plants' },
  full_garden:     { name: 'Jungle',           emoji: '🌳', desc: 'Have 50 plants in your garden' },
  heavyweight:     { name: 'Heavyweight',      emoji: '🏋️', desc: 'Harvest a fruit twice its normal weight' },
  golden_touch:    { name: 'Golden Touch',     emoji: '✨', desc: 'Harvest a Gold fruit' },
  over_rainbow:    { name: 'Over the Rainbow', emoji: '🌈', desc: 'Harvest a Rainbow fruit' },
  rain_dancer:     { name: 'Rain Dancer',      emoji: '🌧️', desc: 'Harvest a Wet fruit' },
  frozen_solid:    { name: 'Frozen Solid',     emoji: '🧊', desc: 'Harvest a Frozen fruit' },
  shocking:        { name: 'Shocking!',        emoji: '⚡', desc: 'Get a fruit struck by lightning' },
  celestial:       { name: 'Star Struck',      emoji: '🌠', desc: 'Get a Celestial fruit from a meteor' },
  night_owl:       { name: 'Night Owl',        emoji: '🦉', desc: 'Harvest a Moonlit fruit' },
  sprinkler_pro:   { name: 'Sprinkler Pro',    emoji: '💦', desc: 'Place gear in your garden' },
  first_pet:       { name: 'New Friend',       emoji: '🐣', desc: 'Hatch a pet egg' },
  pet_collector:   { name: 'Pet Collector',    emoji: '🐾', desc: 'Hatch 5 different pets' },
  dog_lover:       { name: 'Pet Lover',        emoji: '❤️', desc: 'Pet one of your pets' },
  best_friends:    { name: 'Best Friends',     emoji: '🦴', desc: 'Your pets dig up 5 treasures' },
  fashion_forward: { name: 'Fashion Forward',  emoji: '🎭', desc: 'Buy an outfit in the wardrobe' },
  task_master:     { name: 'Task Master',      emoji: '📋', desc: 'Finish 10 garden tasks' },
};
function checkAchievement(id) {
  if (!ACHIEVEMENTS[id] || gameState.achievements.includes(id)) return;
  gameState.achievements.push(id);
  const a = ACHIEVEMENTS[id];
  setTimeout(() => {
    Sfx.play('quest');
    const el = document.createElement('div');
    el.className = 'achieve-pop';
    el.innerHTML = `<span class="ap-emoji">${a.emoji}</span><div><div class="ap-label">Badge earned!</div><div class="ap-name">${a.name}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('exiting'), 2800);
    setTimeout(() => el.remove(), 3300);
  }, 900);
  saveGame();
}

// Rewards grow with how rich you are, but slowly (square root) so they stay fair
function wealthScale() { return Math.round(clamp(Math.sqrt((gameState.totalEarned + gameState.sheckles) / 300), 1, 5000) * 10) / 10; }
function makeTask() {
  const r = Math.random();
  const sc = wealthScale();
  const owned = Object.keys(gameState.seeds).concat(gameState.plants.map(p => p.s)).filter(id => getSeedData(id));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let t;
  if (r < 0.18) { const g = 3 + Math.floor(Math.random() * 4); t = { type: 'plant', goal: g, text: `Plant ${g} seeds`, icon: '🌱', reward: Math.round(15 * g * sc) }; }
  else if (r < 0.4) { const g = 5 + Math.floor(Math.random() * 10); t = { type: 'harvest', goal: g, text: `Harvest ${g} fruits`, icon: '🧺', reward: Math.round(15 * g * sc) }; }
  else if (r < 0.55 && owned.length) { const id = pick(owned); const s = getSeedData(id); const g = 2 + Math.floor(Math.random() * 3); t = { type: 'harvest', seedId: id, goal: g, text: `Harvest ${g} ${s.emoji} ${s.name}`, icon: s.emoji, reward: Math.round(Math.max(40 * sc, s.sell * g)) }; }
  else if (r < 0.7) { const g = 8 + Math.floor(Math.random() * 15); t = { type: 'sell', goal: g, text: `Sell ${g} fruits to Steven`, icon: '💰', reward: Math.round(10 * g * sc) }; }
  else if (r < 0.8) { const g = Math.round(300 * sc * (1 + Math.floor(Math.random() * 4))); t = { type: 'earn', goal: g, text: `Earn ¢${fmtSheckles(g)} selling`, icon: '🪙', reward: Math.round(g * 0.25) }; }
  else if (r < 0.9) { t = { type: 'special', goal: 1, text: 'Harvest a mutated fruit ✨', icon: '🌈', reward: Math.round(200 * sc) }; }
  else if (r < 0.95 && gameState.gear.watering_can) { const g = 3; t = { type: 'water', goal: g, text: 'Water 3 plants with the 🚿 can', icon: '🚿', reward: Math.round(100 * sc) }; }
  else { t = { type: 'pet', goal: 1, text: 'Give one of your pets a pet', icon: '🐾', reward: Math.round(40 * sc) }; }
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
    showToast('✅', `Task done! +¢${fmtSheckles(t.reward)}`);
    const el = $('#tasks-list');
    const r = el ? el.getBoundingClientRect() : { left: 80, top: 160 };
    coinFly(r.left + 60, r.top + 20, 5);
    if (t.tutorial) gameState.tutorialStep++;
    if (gameState.tasksDone >= 10) checkAchievement('task_master');
    setTimeout(() => {
      gameState.tasks = gameState.tasks.filter(x => x !== t);
      fillTasks();
      if (t.tutorial && gameState.tutorialStep >= TUTORIAL_TASKS.length) bigBanner('🎓 You did it!', 'Keep growing, collect mutations, hatch pets and get rich!');
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
    return { x: MY_GARDEN.x - 4, y: 2.2, z: MY_GARDEN.z + 6 };
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
  dayTop: new THREE.Color(0x3d8fe6), dayHor: new THREE.Color(0xbfe3ff),
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
  dayTime = (dayTime + dt / DAY_LENGTH) % 1;
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
  MATS.ground.color.copy(WHITE).lerp(GROUND_FROST, frostBlend * 0.6);
  ambientLight.color.setRGB(0.55 + day * 0.45, 0.65 + day * 0.35, 1);
  renderer.toneMappingExposure = 1.1;

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
  if (carrying) return { kind: 'drop', x: pr.x, z: pr.z, ok: spotFree(pr.x, pr.z, seedRadius(carrying.s), carrying.id) };
  const egg = nearestEgg(pr.x, pr.z, 1.2);
  if (egg) return { kind: 'egg', egg };
  const p = nearestPlant(pr.x, pr.z, REACH);
  if (p) return { kind: 'plant', plant: p };
  for (const e of petEntities.values()) if (Math.hypot(e.pos.x - playerPos.x, e.pos.z - playerPos.z) < 1.3) return { kind: 'pet', id: e.pet.id };
  const it = nearestPlaced(pr.x, pr.z, 0.9);
  if (it) return { kind: 'placed', item: it };
  if (sel && (sel.kind === 'seed' || sel.kind === 'egg' || (sel.kind === 'gear' && PLACEABLE_GEAR.includes(sel.id))) && inMyGarden(playerPos.x, playerPos.z)) {
    const r = sel.kind === 'seed' ? seedRadius(sel.id) : 0.4;
    return { kind: 'spot', x: pr.x, z: pr.z, ok: spotFree(pr.x, pr.z, r) };
  }
  return null;
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function focusInfo(f) {
  if (!f) return null;
  const sel = selectedItem();
  if (f.kind === 'stall') {
    const n = { seeds: ["Shlomo's <b>Seed Shop</b>", '🌱', 'Shop'], sell: ['<b>Steven</b> — sell your fruit', '💰', 'Sell'], gear: ['<b>Gear Shop</b>', '⚙️', 'Shop'], pets: ['<b>Pet Egg Shop</b>', '🥚', 'Shop'] }[f.id];
    return { icon: n[1], text: n[0], act: n[2] };
  }
  if (f.kind === 'drop') return { icon: '⛏️', text: f.ok ? 'Put the plant down here' : 'Find a free spot in your garden', act: 'Place', dim: !f.ok };
  if (f.kind === 'pet') { const e = petEntities.get(f.id); const d = PETS[e.pet.type]; return { icon: '❤️', text: `Pet <b>${e.pet.name}</b> <span class="dim">${d.emoji} Age ${petLevel(e.pet)}</span>`, act: 'Pet' }; }
  if (f.kind === 'egg') { const e = f.egg; return e.left > 0 ? { icon: '🥚', text: `${EGGS[e.egg].name} — hatches in ${fmtTime(e.left / (1 + petPower('eggs') / 100))}`, act: 'Wait', dim: true } : { icon: '🐣', text: `Hatch your <b>${EGGS[e.egg].name}</b>!`, act: 'Hatch' }; }
  if (f.kind === 'placed') { const it = f.item, d = GEAR[it.gear]; return { icon: d.emoji, text: `<b>${d.name}</b> ${it.left != null ? '— ' + fmtTime(it.left) + ' left' : '— catches ' + it.uses + ' more bolts'}`, act: 'Info', dim: true }; }
  if (f.kind === 'spot') {
    if (sel.kind === 'seed') { const s = getSeedData(sel.id); return { icon: s.emoji, text: f.ok ? `Plant <b>${s.name}</b> <span class="dim">(${gameState.seeds[sel.id]} left)</span>` : 'Too close to something — move a little', act: 'Plant', dim: !f.ok }; }
    if (sel.kind === 'egg') return { icon: '🥚', text: f.ok ? `Place <b>${EGGS[sel.id].name}</b>` : 'Find a free spot', act: 'Place', dim: !f.ok };
    return { icon: GEAR[sel.id].emoji, text: f.ok ? `Place <b>${GEAR[sel.id].name}</b>` : 'Find a free spot', act: 'Place', dim: !f.ok };
  }
  const p = f.plant, seed = getSeedData(p.s);
  const mine = gameState.plants.includes(p);
  if (!mine) return null;
  if (sel && sel.kind === 'gear' && sel.id === 'shovel') return { icon: '⛏️', text: `Dig up <b>${seed.name}</b>`, act: 'Dig' };
  if (sel && sel.kind === 'gear' && sel.id === 'trowel') return { icon: '⛏️', text: `Pick up <b>${seed.name}</b> to move it`, act: 'Move' };
  if (sel && sel.kind === 'gear' && sel.id === 'watering_can') return { icon: '🚿', text: `Water <b>${seed.name}</b> <span class="dim">(${gameState.gear.watering_can} uses)</span>`, act: 'Water' };
  const ripe = ripeFruitCount(p);
  if (ripe) {
    if (!seed.multi) return { icon: '🧺', text: `Harvest ${fruitLabel({ s: p.s, m: p.m })} <span class="dim">${p.kg}kg • ¢${fmtSheckles(fruitValue({ s: p.s, kg: p.kg, m: p.m }))}</span>`, act: 'Harvest' };
    return { icon: '🧺', text: `Harvest <b>${ripe} ${seed.emoji} ${seed.name}</b>`, act: 'Harvest' };
  }
  const rate = growthRate(p);
  if (p.age < p.grow) return { icon: seed.emoji, text: `<b>${seed.name}</b> ${Math.round(p.age / p.grow * 100)}% <span class="dim">• grown in ${fmtTime((p.grow - p.age) / rate)}${p.water > 0 ? ' • 💧' : ''}</span>`, act: 'Info', dim: true };
  const next = Math.min(...p.fruits.filter(Boolean).map(fr => seed.fruitTime - fr.age));
  return { icon: seed.emoji, text: `<b>${seed.name}</b> <span class="dim">• next fruit in ${fmtTime(next / rate)}</span>`, act: 'Info', dim: true };
}

function interact(f) {
  f = f || focus;
  if (isAnyPanelOpen()) return;
  if (!f) {
    const sel = selectedItem();
    if (sel && sel.kind === 'seed' && !inMyGarden(playerPos.x, playerPos.z)) { showToast('🏡', 'Go to your garden to plant! (tap 🏡 Garden)'); hintTarget = 'garden'; hintTimer = 6; }
    return;
  }
  const sel = selectedItem();
  switch (f.kind) {
    case 'stall': openStall(f.id); return;
    case 'drop': dropCarried(f.x, f.z); return;
    case 'pet': petPetAt(petEntities.get(f.id)); return;
    case 'egg': if (f.egg.left <= 0) hatchEgg(f.egg); else { Sfx.play('click'); showToast('🥚', `Hatches in ${fmtTime(f.egg.left)}`); } return;
    case 'placed': Sfx.play('click'); return;
    case 'spot':
      if (sel.kind === 'seed') plantSeed(sel.id, f.x, f.z);
      else if (sel.kind === 'egg') placeEgg(sel.id, f.x, f.z);
      else placeGear(sel.id, f.x, f.z);
      return;
    case 'plant': {
      const p = f.plant;
      if (!gameState.plants.includes(p)) return;
      if (sel && sel.id === 'shovel') { digUp(p); return; }
      if (sel && sel.id === 'trowel') { pickUpWithTrowel(p); return; }
      if (sel && sel.id === 'watering_can') { useWateringCan(p); return; }
      if (ripeFruitCount(p)) { harvestPlant(p); return; }
      Sfx.play('click');
      floatText(p.x, 1.8, p.z, p.age < p.grow ? `⏳ ${fmtTime((p.grow - p.age) / growthRate(p))}` : '🌱 Fruit growing…', '#FFFFFF');
    }
  }
}

function openStall(id) {
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
  const rows = getProfiles().map(p => {
    const s = p.id === activeProfileId ? gameState.sheckles : ((readSave(p.id) || {}).sheckles != null ? readSave(p.id).sheckles : Math.floor(((readSave(p.id) || {}).coins || 0) * 3));
    return { name: p.name, avatar: p.avatar, s, me: p.id === activeProfileId };
  }).sort((a, b) => b.s - a.s).slice(0, 6);
  box.innerHTML = rows.map(r => `<div class="lb-row${r.me ? ' me' : ''}"><span>${r.avatar} ${r.name}</span><b>¢${fmtSheckles(r.s)}</b></div>`).join('');
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
    .forEach(id => items.push({ key: 'seed:' + id, emoji: getSeedData(id).emoji, name: getSeedData(id).name + ' Seed', count: gameState.seeds[id], color: RARITY[getSeedData(id).rarity].color }));
  Object.keys(gameState.eggs).filter(id => gameState.eggs[id] > 0).forEach(id => items.push({ key: 'egg:' + id, emoji: '🥚', name: EGGS[id].name, count: gameState.eggs[id], color: RARITY[EGGS[id].rarity].color, eggColor: EGGS[id].color }));
  GEAR_LIST.filter(id => gameState.gear[id] > 0).forEach(id => items.push({ key: 'gear:' + id, emoji: GEAR[id].emoji, name: GEAR[id].name, count: gameState.gear[id], color: '#90CAF9' }));
  items.push({ key: 'gear:shovel', emoji: '⛏️', name: 'Shovel', count: null, color: '#BCAAA4' });
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
  more.innerHTML = `<span class="slot-emoji">🎒</span><span class="slot-count">${gameState.fruits.length}</span><span class="slot-name">Backpack</span>`;
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
  if (focus && focus.kind === 'placed' && GEAR[focus.item.gear].radius) ring = { x: focus.item.x, z: focus.item.z, r: GEAR[focus.item.gear].radius };
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
    row.innerHTML = `<span class="task-icon">${t.done ? '✅' : t.icon}</span><div class="task-body"><div class="task-text">${t.text}</div><div class="task-bar"><div style="width:${pct}%"></div></div></div><span class="task-reward">${t.goal > 1 && t.type !== 'earn' ? `${t.progress}/${t.goal}<br>` : ''}¢${fmtSheckles(t.reward)}</span>`;
    list.appendChild(row);
  });
  $('#tasks-title').textContent = gameState.tutorialStep < TUTORIAL_TASKS.length ? `🎓 Getting started (${gameState.tutorialStep + 1}/${TUTORIAL_TASKS.length})` : '📋 Tasks';
}

// ─── Panels ───
const PANEL_IDS = ['shop-panel', 'sell-panel', 'bag-panel', 'pets-panel', 'wardrobe-panel', 'achieve-panel', 'help-panel', 'gift-panel'];
function isPanelOpen(id) { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); }
function isAnyPanelOpen() { return PANEL_IDS.some(isPanelOpen); }
function closeAllPanels() { PANEL_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }); }
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
  $('#shop-title').innerHTML = { seeds: "🌱 Seed Shop <small>by Shlomo</small>", gear: '⚙️ Gear Shop', pets: '🥚 Pet Eggs' }[shopKind];
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
        const h = document.createElement('div'); h.className = 'section-title seasonal'; h.innerHTML = `${getActiveHolidayLabels().join(' ')} <span class="tag">Event seeds!</span>`; body.appendChild(h);
      }
      const s = getSeedData(id);
      body.appendChild(shopRow({ emoji: s.emoji, name: s.name, rarity: s.rarity, price: s.price, stock: stock[id],
        sub: `${s.multi ? '♻️ Multi-harvest' : '🌾 Single harvest'} • grows in ${fmtTime(s.grow)} • fruit ¢${fmtSheckles(s.sell)}+` }, () => buyFromShop('seed', id)));
    });
  } else if (shopKind === 'gear') {
    const stock = currentGearStock();
    GEAR_LIST.forEach(id => {
      const g = GEAR[id];
      body.appendChild(shopRow({ emoji: g.emoji, name: g.name, rarity: g.price >= 400000 ? 'divine' : g.price >= 100000 ? 'mythical' : g.price >= 30000 ? 'legendary' : g.price >= 10000 ? 'rare' : 'uncommon', price: g.price, stock: stock[id],
        sub: g.desc + (g.uses > 1 ? ` • ${g.uses} uses` : '') }, () => buyFromShop('gear', id)));
    });
  } else {
    currentEggStock().forEach((e, i) => {
      const d = EGGS[e.id];
      const chances = Object.entries(d.pets).map(([pid, w]) => `${PETS[pid].emoji} ${PETS[pid].name} ${w}%`).join(' • ');
      body.appendChild(shopRow({ emoji: '🥚', eggColor: d.color, name: d.name, rarity: d.rarity, price: d.price, stock: e.bought ? 0 : 1,
        sub: `Hatches in ${fmtTime(d.hatch)}<br><span class="chances">${chances}</span>` }, () => buyFromShop('egg', i)));
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
      <div class="sr-stock">${o.stock ? `x${o.stock} Stock` : 'NO STOCK'}</div>
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
  setText(el, `🔄 New ${shopKind === 'seeds' ? 'seeds' : shopKind === 'gear' ? 'gear' : 'eggs'} in ${fmtTime(t)}`);
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
  const sellable = gameState.fruits.filter(f => !f.fav);
  const total = sellable.reduce((a, f) => a + fruitValue(f), 0);
  const all = document.createElement('button');
  all.className = 'btn big sell-all';
  all.disabled = !sellable.length;
  all.innerHTML = sellable.length ? `💰 Sell my inventory (${sellable.length}) — ¢${fmtSheckles(total)}` : 'Nothing to sell — go harvest some fruit!';
  all.addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    const got = sellFruits(sellable.slice());
    Sfx.play('sell'); setTimeout(() => Sfx.play('coin'), 120);
    coinFly(r.left + r.width / 2, r.top, 8);
    showToast('💰', `Steven paid you ¢${fmtSheckles(got)}!`);
    renderSell(); updateHotbar();
  });
  body.appendChild(all);
  if (gameState.fruits.some(f => f.fav)) {
    const note = document.createElement('p'); note.className = 'note'; note.textContent = '⭐ Favorited fruit are kept when you sell everything.'; body.appendChild(note);
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
    const muts = (f.m || []).map(k => `<span class="mut" style="--mc:${MUTATIONS[k].color}">${MUTATIONS[k].emoji} ${MUTATIONS[k].name}</span>`).join('');
    row.innerHTML = `<span class="fr-emoji">${s.emoji}</span><div class="fr-info"><b>${s.name}</b> <span class="kg">${f.kg}kg</span><div>${muts}</div></div><span class="fr-val">¢${fmtSheckles(fruitValue(f))}</span>
      <button class="fav${f.fav ? ' on' : ''}" title="Favorite">⭐</button>${sellButtons ? '<button class="btn small sell1">Sell</button>' : ''}`;
    row.querySelector('.fav').addEventListener('click', () => { f.fav = !f.fav; Sfx.play('click'); saveGame(); sellButtons ? renderSell() : openBag(); });
    const sb = row.querySelector('.sell1');
    if (sb) sb.addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); const got = sellFruits([f]); Sfx.play('coin'); floatTextScreen(r.left, r.top, `+¢${fmtSheckles(got)}`); renderSell(); updateHotbar(); });
    wrap.appendChild(row);
  });
  if (!fruits.length) { const p = document.createElement('p'); p.className = 'empty-msg'; p.innerHTML = 'Your backpack has no fruit yet.<br>Harvest plants in your garden! 🧺'; wrap.appendChild(p); }
  return wrap;
}

// ─── Backpack ───
function openBag() {
  const body = $('#bag-body');
  body.innerHTML = '';
  const h = document.createElement('div'); h.className = 'section-title';
  const worth = gameState.fruits.reduce((a, f) => a + fruitValue(f), 0);
  h.innerHTML = `🧺 Fruit <span class="dim">${gameState.fruits.length}/${MAX_FRUITS} • worth ¢${fmtSheckles(worth)}</span>`;
  body.appendChild(h);
  body.appendChild(fruitList(gameState.fruits, false));
  const items = hotbarItems();
  const h2 = document.createElement('div'); h2.className = 'section-title'; h2.textContent = '🎒 Seeds, gear & eggs (tap to hold)'; body.appendChild(h2);
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
  const h = document.createElement('div'); h.className = 'section-title'; h.textContent = `🐾 Equipped (${gameState.equipped.length}/${MAX_PETS_EQUIPPED}) — they live in your garden`; body.appendChild(h);
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
    card.innerHTML = `<div class="card-rarity">${rar.name}</div><div class="card-emoji">${d.emoji}</div><div class="card-name">${pet.name}</div>
      <div class="card-stats">${d.name} • Age ${petLevel(pet)}</div><div class="card-desc">${describeAbility(d.ability)}</div>
      <button class="btn ${eq ? 'alt' : ''}">${eq ? 'Unequip' : 'Equip'}</button>`;
    card.querySelector('button').addEventListener('click', () => {
      if (eq) gameState.equipped = gameState.equipped.filter(id => id !== pet.id);
      else if (gameState.equipped.length >= MAX_PETS_EQUIPPED) { Sfx.play('deny'); showToast('🐾', `You can equip ${MAX_PETS_EQUIPPED} pets. Unequip one first.`); return; }
      else gameState.equipped.push(pet.id);
      syncPetEntities(); saveGame(); openPets();
    });
    g.appendChild(card);
  });
  body.appendChild(g);
  const p = document.createElement('p'); p.className = 'note'; p.innerHTML = 'Get more pets from <b>🥚 Pet Eggs</b> in the market. Pets get stronger as they age!';
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
  const g = document.createElement('div'); g.className = 'card-grid';
  Object.entries(CHARACTER_SKINS).forEach(([key, skin]) => {
    const unlocked = gameState.unlockedSkins.includes(key);
    const active = cur === key;
    const card = document.createElement('div');
    card.className = 'card' + (active ? ' owned' : '') + (!unlocked ? ' locked-soft' : '');
    card.style.setProperty('--rar', active ? '#69F0AE' : '#B388FF');
    let btn;
    if (active) btn = '<button class="btn" disabled>👕 Wearing</button>';
    else if (unlocked) btn = '<button class="btn wear">Wear</button>';
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
      bigBanner(`${skin.emoji} New outfit!`, `You unlocked ${skin.name}`);
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
  head.innerHTML = `<b>${got.length}</b> of ${Object.keys(ACHIEVEMENTS).length} unlocked<div class="task-bar"><div style="width:${Math.round(got.length / Object.keys(ACHIEVEMENTS).length * 100)}%"></div></div>`;
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
    <p class="gift-text">${streak > 1 ? `🔥 ${streak} days in a row!` : 'Welcome back, gardener!'}<br>Tap the present to open it!</p>
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
    body.querySelector('.gift-text').innerHTML = `You got <b>¢${fmtSheckles(coins)}</b> and <b>3 ${s.emoji} ${s.name}</b> seeds${streak >= 3 ? ' and <b>5 🚿 watering can uses</b>' : ''}!<br><button class="btn big" id="gift-ok">Yay! 🎉</button>`;
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

function showProfileScreen() {
  const existing = document.getElementById('profile-screen');
  if (existing) existing.remove();
  migrateOldSave();
  const profiles = getProfiles();
  const overlay = document.createElement('div');
  overlay.id = 'profile-screen';
  overlay.innerHTML = `
    <div class="profile-container">
      <div class="logo-emoji">🌱</div>
      <h1>Grow a Garden</h1>
      <p class="subtitle">${profiles.length ? "Who's playing?" : 'Make your gardener to start!'}</p>
      <div class="profile-grid" id="profile-grid"></div>
      <button class="btn big" id="new-profile-btn">＋ New Gardener</button>
      ${profiles.length ? '<p class="profile-hint">Right-click or long-press a gardener to delete it</p>' : ''}
    </div>`;
  document.body.appendChild(overlay);
  const grid = document.getElementById('profile-grid');
  profiles.forEach(p => {
    const save = readSave(p.id);
    const shk = save ? (save.sheckles != null ? save.sheckles : (save.coins || 0) * 3) : 50;
    const card = document.createElement('button');
    card.className = 'profile-card';
    card.innerHTML = `<span class="profile-avatar">${p.avatar}</span><span class="profile-name">${p.name}</span><span class="profile-level">¢${fmtSheckles(shk)}</span>`;
    card.addEventListener('click', () => selectProfile(p.id));
    let pressTimer = null;
    const del = () => { if (confirm(`Delete ${p.name}'s garden? This cannot be undone!`)) deleteProfile(p.id); };
    card.addEventListener('contextmenu', e => { e.preventDefault(); del(); });
    card.addEventListener('touchstart', () => { pressTimer = setTimeout(del, 900); }, { passive: true });
    card.addEventListener('touchend', () => clearTimeout(pressTimer));
    card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    grid.appendChild(card);
  });
  document.getElementById('new-profile-btn').addEventListener('click', showNewProfileModal);
}

function showNewProfileModal() {
  if (getProfiles().length >= MAX_PROFILES) { alert('Maximum 10 gardeners! Long-press one to delete it.'); return; }
  const modal = document.createElement('div');
  modal.id = 'new-profile-modal';
  modal.innerHTML = `
    <div class="profile-modal-box">
      <h2>New Gardener</h2>
      <input type="text" id="profile-name-input" placeholder="Your name..." maxlength="12" autocomplete="off">
      <p class="modal-label">Pick an avatar:</p>
      <div class="avatar-grid" id="avatar-grid"></div>
      <p class="modal-label">Choose your character:</p>
      <div class="skin-grid" id="skin-grid"></div>
      <div class="modal-buttons">
        <button class="btn big" id="create-profile-btn">Let's grow! 🌱</button>
        <button class="btn alt" id="cancel-profile-btn">Cancel</button>
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
  more.textContent = '🥷 🦔 ⚔️ More outfits in the wardrobe!';
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

function deleteProfile(id) {
  saveProfiles(getProfiles().filter(p => p.id !== id));
  localStorage.removeItem(SAVE_PREFIX + id);
  showProfileScreen();
}

function selectProfile(id) {
  Sfx.unlock();
  Sfx.play('click');
  activeProfileId = id;
  const ps = document.getElementById('profile-screen'); if (ps) ps.remove();
  const modal = document.getElementById('new-profile-modal'); if (modal) modal.remove();
  const p = getProfiles().find(pr => pr.id === id);
  if (p) { setText($('#badge-avatar'), p.avatar); setText($('#badge-name'), p.name); }
  startProfile();
}

function switchProfile() {
  if (started) saveGame();
  started = false;
  closeAllPanels();
  document.body.classList.remove('playing');
  activeProfileId = null;
  showProfileScreen();
}


// ════════════════════════════════════════════
//  SAVE / LOAD (+ upgrading saves from older versions)
// ════════════════════════════════════════════
function saveGame() {
  if (!activeProfileId) return;
  try {
    const data = Object.assign({}, gameState, { savedAt: Date.now(), version: SAVE_VERSION });
    if (carrying) data.plants = gameState.plants; // a carried plant stays saved where it was
    localStorage.setItem(getSaveKey(), JSON.stringify(data));
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
  ['fruits', 'plants', 'placed', 'placedEggs', 'pets', 'equipped', 'achievements', 'tasks', 'harvestedTypes', 'petsHatched', 'unlockedSkins'].forEach(k => { if (!Array.isArray(st[k])) st[k] = []; });
  if (typeof st.sheckles !== 'number' || !isFinite(st.sheckles)) st.sheckles = 50;
  st.gear.shovel = 1;
  ['farmer', 'noob'].forEach(s => { if (!st.unlockedSkins.includes(s)) st.unlockedSkins.push(s); });
  if (!st.pets.length) st.pets.push({ id: 'buddy', type: 'dog', name: 'Buddy', age: 0 });
  st.pets = st.pets.filter(p => PETS[p.type]);
  st.equipped = st.equipped.filter(id => st.pets.some(p => p.id === id)).slice(0, MAX_PETS_EQUIPPED);
  st.fruits = st.fruits.filter(f => f && getSeedData(f.s)).map(f => ({ s: f.s, kg: f.kg || getSeedData(f.s).kg, m: Array.isArray(f.m) ? f.m.filter(k => MUTATIONS[k]) : [], fav: !!f.fav }));
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
      x: MY_GARDEN.x + [-11, -7.6, -4.2, 4.2, 7.6, 11][c], z: MY_GARDEN.z + (-8.5 + r * 3.4),
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
    autoSaveTimer += dt;
    if (autoSaveTimer >= AUTO_SAVE_SEC) { autoSaveTimer = 0; saveGame(); }
    secondTimer -= dt;
    if (secondTimer <= 0) {
      secondTimer = 1;
      checkRestock();
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
  playerPos.set(TELEPORTS.garden.x, 0, TELEPORTS.garden.z - 2.5);
  playerVel.set(0, 0, 0);
  playerY = 0; playerVY = 0; onGround = true;
  yaw = 0; pitch = 0.55; camDist = isMobile ? 12 : 11;
  playerFacing = Math.PI;
  camPos.set(playerPos.x, 8, playerPos.z + 12);
  moveTarget = null; focus = null; carrying = null; shovelArmed = null;
  dayTime = 0.3; weather = null; weatherTimer = 90 + Math.random() * 90; moonlitCount = 0;
  [...plantViews.keys()].forEach(removePlantView);
  [...petEntities.keys()].forEach(id => { scene.remove(petEntities.get(id).model); petEntities.delete(id); });
  buildPlayerModel();
  refreshAllPlants();
  refreshPlaced();
  syncPetEntities();
  buildNeighborGardens();
  updateEggDisplay();
  fillTasks();
  updateHUD(); updateHotbar(); updateLeaderboard(); refreshSoundButtons(); weatherBanner();
  started = true;
  document.body.classList.add('playing');
  lastFocusKey = '?';
  lastSlot = shopSlot(SHOP_RESTOCK);
  if (result === 'migrated') {
    setTimeout(() => bigBanner('🎉 Big Update!', 'Your garden moved to the new world!<br>Coins became ¢ Sheckles, crops are in your 🎒 Backpack, and Buddy is your first pet 🐶'), 600);
    saveGame();
  } else if (result === 'loaded') {
    const ripe = gameState.plants.filter(plantRipe).length;
    if (ripe) showToast('🌅', `Welcome back! ${ripe} plant${ripe > 1 ? 's have' : ' has'} fruit ready!`);
    setTimeout(maybeDailyGift, 900);
  } else {
    gameState.lastDaily = todayStr();
    gameState.dailyStreak = 1;
    setTimeout(() => showToast('👋', 'Welcome! Follow the pointing hand 👇 to plant your first seed.'), 600);
    saveGame();
  }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && started) saveGame(); });
window.addEventListener('beforeunload', () => { if (started) saveGame(); });
window.addEventListener('pagehide', () => { if (started) saveGame(); });

function boot() {
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
  setTime(t) { dayTime = t; },
  startWeather(id) { startWeather(id); },
  strike() { lightningStrike(); },
  meteor() { launchMeteor(); },
  teleport(w) { teleport(w); },
  view(x, z, d, p, y) { playerPos.set(x, 0, z); camDist = d; pitch = p; yaw = y || 0; },
  refresh() { refreshAllPlants(); refreshPlaced(); syncPetEntities(); updateHUD(); updateHotbar(); },
  get focus() { return focus; },
  petTick(sec) { for (const e of petEntities.values()) e.timer = Math.min(e.timer, 0.01); updatePets(0.05, 0); void sec; },
  get player() { return { x: playerPos.x, z: playerPos.z, target: moveTarget && { x: moveTarget.x, z: moveTarget.z } }; },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
