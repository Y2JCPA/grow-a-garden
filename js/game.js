/* ============================================
   GROW A GARDEN 3D — Main Game (Three.js)
   Depends on: three.js, data.js, voxel.js, plants.js, skins.js, audio.js
   ============================================ */
(function() {
'use strict';

// ─── Constants ───
const WORLD_SIZE = 64;          // walkable area (square)
const PLOT_SIZE = 2;            // each plot is 2x2
const PLOT_STEP = 3;            // plot spacing (2 + 1 gap)
const FULL_GRID = 6;            // 6x6 possible plots; the middle 4x4 are free
const BASE_PLOTS = 16;
const TOTAL_PLOTS = FULL_GRID * FULL_GRID;
const PLAYER_HEIGHT = 1.7;
const WALK_SPEED = 5.5;
const RUN_MULT = 1.6;
const JUMP_FORCE = 7.5;
const GRAVITY = 20;
const PLOT_REACH = 2.3;
const PLANT_SCALE = 1.3;        // plants are drawn a bit bigger than their model units
const PLANT_Y = 0.32 * (1 - PLANT_SCALE); // keeps the scaled plant's base on the soil (models start at y=0.32)
const CAM_MIN = 4, CAM_MAX = 14;
const SHOP_POS = { x: -14, z: 0 };
const SHOP_DIST = 3.6;
const WELL_POS = { x: 14, z: 0 };
const WELL_DIST = 2.8;
const POND_POS = { x: 15, z: -15 };
const DOG_DIST = 2.2;
const DAY_LENGTH = 420;         // seconds for a full day
const PROFILES_KEY = 'garden3d_profiles';
const SAVE_PREFIX = 'garden3d_save_';
const MAX_PROFILES = 10;
const AUTO_SAVE_SEC = 10;
const BASE_CAN = 100;

// ─── Game State (saved per profile) ───
function freshState() {
  return {
    coins: 100,
    inventory: { daisy: 3, sunflower: 2 }, // seeds (plantable)
    harvested: {},       // crops (sellable) — key: seedId or "seedId|mutation"
    plots: new Array(TOTAL_PLOTS).fill(null),
    unlockedPlots: [],   // indices >= 16 that were bought
    selectedSeed: 'daisy',
    unlockedSkins: ['farmer'],
    waterCan: BASE_CAN,
    achievements: [],
    totalCoinsEarned: 0,
    totalHarvested: 0,
    harvestedTypes: [],
    decorations: [],
    xp: 0,
    level: 1,
    upgrades: {},
    potions: 0,
    tasks: [],
    tutorialStep: 0,
    tasksDone: 0,
    lastDaily: '',
    dailyStreak: 0,
    buddyFinds: 0,
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
let dayTime = 0.3;              // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
let nightFactor = 0;            // 0 day → 1 night
let currentWeather = 'sunny';
let weatherTimer = 90;
let autoSaveTimer = 0;
let isMobile = false;

const playerPos = new THREE.Vector3(0, 0, 13);
const playerVel = new THREE.Vector3();
let playerY = 0, playerVY = 0, onGround = true;
let playerModel = null, playerFacing = Math.PI, walkCycle = 0;
let yaw = 0, pitch = 0.35, camDist = 8;
const camPos = new THREE.Vector3(0, 8, 20);
const keys = { f: false, b: false, l: false, r: false, run: false };
const touchMove = { x: 0, y: 0 };
let moveTarget = null;          // click / tap-to-walk target {x, z, reach, action}

const colliders = [];           // {x, z, r} circles the player can't walk through
const plotViews = [];           // per plot 3D objects
let focus = null;               // what the player is next to: {kind, index}

// ─── DOM helpers ───
const $ = sel => document.querySelector(sel);
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function fmt(n) { return Math.floor(n).toLocaleString(); }
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
  const target = $('#coin-display').getBoundingClientRect();
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
    const box = $('#coin-display');
    box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
  }, 650);
}

// ─── Plot layout ───
// Indices 0-15 are the original 4x4 garden (row-major), 16-35 the outer ring.
const PLOT_CELLS = (function() {
  const cells = [];
  for (let r = 1; r <= 4; r++) for (let c = 1; c <= 4; c++) cells.push({ r, c });
  for (let r = 0; r < FULL_GRID; r++) for (let c = 0; c < FULL_GRID; c++) {
    if (r === 0 || r === FULL_GRID - 1 || c === 0 || c === FULL_GRID - 1) cells.push({ r, c });
  }
  return cells.map(({ r, c }) => ({ x: -7.5 + c * PLOT_STEP, z: -7.5 + r * PLOT_STEP }));
})();
function getPlotWorldPos(i) { return PLOT_CELLS[i]; }
function isPlotUnlocked(i) { return i < BASE_PLOTS || gameState.unlockedPlots.includes(i); }

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

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
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
  MATS.golden = new THREE.MeshLambertMaterial({ vertexColors: true, map: noise, color: 0xffd54f, emissive: 0x5a3a00 });
  MATS.rainbow = new THREE.MeshLambertMaterial({ vertexColors: true, map: noise, emissive: 0x222222 });
  MATS.soil = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.get('soil'), color: 0xffffff });
  MATS.soilWet = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.get('soil'), color: 0xb09888 });
  MATS.soilDry = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.get('soil'), color: 0xd8c9a0 });
  MATS.path = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.get('path') });
  const wt = Tex.get('water');
  MATS.water = new THREE.MeshLambertMaterial({ map: wt, transparent: true, opacity: 0.85 });
  MATS.glow = {};
  Object.entries(RARITY).forEach(([k, r]) => {
    MATS.glow[k] = new THREE.MeshBasicMaterial({ color: r.glow, transparent: true, opacity: 0.8, depthWrite: false });
  });
  MATS.highlight = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  MATS.lampOn = new THREE.MeshBasicMaterial({ color: 0xffe08a });
}

function voxelMesh(batch, mat, opts) {
  const m = new THREE.Mesh(batch.build(), mat || MATS.voxel);
  m.castShadow = !(opts && opts.noCast);
  m.receiveShadow = true;
  return m;
}

// Canvas text label shown as a 3D sprite (cheaper and smoother than moving DOM labels)
function textSprite(text, color) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = 'bold 44px "Fredoka", "Segoe UI", system-ui, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  c.width = w; c.height = 72;
  ctx.font = font;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const r = 30;
  ctx.beginPath();
  ctx.moveTo(r, 4); ctx.lineTo(w - r, 4); ctx.quadraticCurveTo(w - 4, 4, w - 4, 36);
  ctx.quadraticCurveTo(w - 4, 68, w - r, 68); ctx.lineTo(r, 68); ctx.quadraticCurveTo(4, 68, 4, 36);
  ctx.quadraticCurveTo(4, 4, r, 4); ctx.fill();
  ctx.fillStyle = color || '#FFE082';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 38);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(w / 72 * 0.55, 0.55, 1);
  return s;
}

// ─── World ───
function addCollider(x, z, r) { colliders.push({ x, z, r }); }

function isReserved(x, z) {
  // Keep trees/decor off the garden, paths, shop, well, pond and spawn
  if (Math.abs(x) < 12 && Math.abs(z) < 12) return true;
  if (Math.abs(z) < 3 && Math.abs(x) < 20) return true;          // east/west paths
  if (Math.abs(x) < 3 && z > 0 && z < 22) return true;           // south path
  if (Math.hypot(x - SHOP_POS.x, z - SHOP_POS.z) < 5) return true;
  if (Math.hypot(x - WELL_POS.x, z - WELL_POS.z) < 4) return true;
  if (Math.hypot(x - POND_POS.x, z - POND_POS.z) < 7) return true;
  return false;
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

function buildWorld() {
  // Ground: one big textured plane (pixel grass)
  const grass = Tex.get('grass').clone();
  grass.needsUpdate = true;
  grass.repeat.set(110, 110);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshLambertMaterial({ map: grass }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  const rand = seededRandom(1234);
  const statics = new VoxelBatch(4);   // trees, fences, rocks, hills…
  const decor = new VoxelBatch(4);     // small things that don't need to cast shadows
  const paths = new VoxelBatch(2);

  // Paths (garden → shop, → well, → south)
  for (let x = -12; x <= 12; x += 1) {
    if (Math.abs(x) < 9.6) continue;
    paths.box(1, 0.04, 2.2, 0xffffff, x, 0.02, 0);
  }
  for (let x = -18; x <= -12; x += 1) paths.box(1, 0.04, 2.2, 0xffffff, x, 0.02, 0);
  for (let x = 12; x <= 17; x += 1) paths.box(1, 0.04, 2.2, 0xffffff, x, 0.02, 0);
  for (let z = 10; z <= 22; z += 1) paths.box(2.2, 0.04, 1, 0xffffff, 0, 0.02, z);
  // Stepping stones inside the garden between plot rows
  for (let z = -7.5; z <= 7.5; z += 3) {
    for (let x = -6; x <= 6; x += 3) { if (Math.abs(x) > 0.1) paths.box(0.6, 0.03, 0.6, 0xe0e0e0, x, 0.02, z + 1.5); }
  }

  // Garden fence (6x6 area) with gates in the middle of each side
  const half = 7.5 + 1 + 0.9;
  const fenceWood = 0xA1887F, fenceDark = 0x8D6E63;
  for (let t = -half; t <= half + 0.01; t += 1.5) {
    const sides = [[t, -half], [t, half], [-half, t], [half, t]];
    sides.forEach(([x, z]) => {
      if (Math.abs(x) < 1.6 && Math.abs(Math.abs(z) - half) < 0.01) return; // north/south gates
      if (Math.abs(z) < 1.6 && Math.abs(Math.abs(x) - half) < 0.01) return; // east/west gates
      statics.box(0.25, 1.0, 0.25, fenceDark, x, 0.5, z);
      statics.box(0.33, 0.08, 0.33, fenceWood, x, 1.02, z);
    });
  }
  [-half, half].forEach(edge => {
    [[-half, -1.6], [1.6, half]].forEach(([a, b2]) => {
      const len = b2 - a, mid = (a + b2) / 2;
      [0.35, 0.75].forEach(h => {
        statics.box(len, 0.12, 0.1, fenceWood, mid, h, edge);   // north/south rails
        statics.box(0.1, 0.12, len, fenceWood, edge, h, mid);   // east/west rails
      });
    });
  });
  // Lantern posts at the corners and gates (glow at night)
  const lanternSpots = [[-half, -half], [half, -half], [-half, half], [half, half], [-1.8, half], [1.8, half]];
  const lampBatch = new VoxelBatch(4);
  lanternSpots.forEach(([x, z]) => {
    statics.box(0.2, 2.0, 0.2, 0x4E342E, x, 1.0, z);
    statics.box(0.5, 0.08, 0.5, 0x3E2723, x, 2.05, z);
    lampBatch.box(0.32, 0.36, 0.32, 0xffffff, x, 1.85, z);
  });
  const lamps = new THREE.Mesh(lampBatch.build(), new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xfff3c4, emissive: 0x000000 }));
  lamps.name = 'lamps';
  scene.add(lamps);
  MATS.lamps = lamps.material;

  // Trees: a ring inside the walkable area + a dense forest outside it
  const treeTypes = ['oak', 'oak', 'pine', 'birch', 'apple', 'blossom'];
  let placed = 0, tries = 0;
  while (placed < 34 && tries < 2000) {
    tries++;
    const x = (rand() - 0.5) * (WORLD_SIZE - 6);
    const z = (rand() - 0.5) * (WORLD_SIZE - 6);
    if (isReserved(x, z)) continue;
    if (colliders.some(c => Math.hypot(c.x - x, c.z - z) < 4.5)) continue;
    buildTree(statics, x, z, treeTypes[Math.floor(rand() * treeTypes.length)], rand);
    addCollider(x, z, 0.8);
    placed++;
  }
  for (let i = 0; i < 140; i++) {
    const a = rand() * Math.PI * 2;
    const d = 36 + rand() * 40;
    buildTree(statics, Math.cos(a) * d, Math.sin(a) * d, rand() > 0.45 ? 'pine' : 'oak', rand);
  }
  // Rolling blocky hills on the horizon
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + rand() * 0.1;
    const d = 100 + rand() * 25;
    const w = 18 + rand() * 16, hgt = 3 + rand() * 6;
    for (let s = 0; s < 3; s++) {
      const sw = w * (1 - s * 0.28), sh = hgt * (1 - s * 0.3);
      statics.box(sw, sh, sw, s === 0 ? 0x5b9e45 : 0x67ad4e, Math.cos(a) * d, sh / 2 + s * hgt * 0.3, Math.sin(a) * d, 0, a, 0);
    }
  }

  // Rocks, bushes, grass tufts and wildflowers
  const flowerColors = [0xFFEB3B, 0xFF80AB, 0xFFFFFF, 0xB388FF, 0xFF7043, 0x81D4FA];
  for (let i = 0; i < 420; i++) {
    const x = (rand() - 0.5) * 70, z = (rand() - 0.5) * 70;
    if (isReserved(x, z)) continue;
    const kind = rand();
    if (kind < 0.55) { // grass tuft
      const g = rand() > 0.5 ? 0x7CB342 : 0x8BC34A;
      decor.box(0.08, 0.35, 0.08, g, x, 0.17, z);
      decor.box(0.08, 0.25, 0.08, g, x + 0.12, 0.12, z + 0.05);
      decor.box(0.08, 0.3, 0.08, g, x - 0.1, 0.15, z - 0.06);
    } else if (kind < 0.85) { // flower
      decor.box(0.05, 0.3, 0.05, 0x558B2F, x, 0.15, z);
      decor.box(0.2, 0.1, 0.2, flowerColors[Math.floor(rand() * flowerColors.length)], x, 0.33, z);
      decor.box(0.08, 0.11, 0.08, 0xFFF59D, x, 0.34, z);
    } else if (kind < 0.93) { // rock
      const s = 0.4 + rand() * 0.6;
      statics.box(s, s * 0.6, s * 0.8, rand() > 0.5 ? 0x9E9E9E : 0x8D8D8D, x, s * 0.3, z, 0, rand() * 3, 0);
    } else { // bush
      const s = 0.8 + rand() * 0.6;
      statics.box(s, s * 0.8, s, 0x43A047, x, s * 0.4, z);
      if (rand() > 0.5) statics.box(0.15, 0.15, 0.15, 0xE91E63, x + s * 0.4, s * 0.6, z);
    }
  }

  // Pond with lily pads + stones around it
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    statics.box(1.1, 0.35, 1.1, i % 2 ? 0x9E9E9E : 0xB0B0B0, POND_POS.x + Math.cos(a) * 5.3, 0.15, POND_POS.z + Math.sin(a) * 4.3, 0, a, 0);
  }
  const pondBed = new VoxelBatch(2);
  pondBed.box(10, 0.1, 8, 0x3E6E8E, POND_POS.x, 0.01, POND_POS.z);
  scene.add(voxelMesh(pondBed, MATS.voxel, { noCast: true }));
  const waterTex = MATS.water.map.clone();
  waterTex.needsUpdate = true;
  waterTex.repeat.set(5, 4);
  MATS.pond = new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, opacity: 0.85 });
  const pond = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 8), MATS.pond);
  pond.position.set(POND_POS.x, 0.1, POND_POS.z);
  pond.receiveShadow = true;
  scene.add(pond);
  [[-2, 1], [1.5, -1.5], [2.5, 1.8]].forEach(([dx, dz]) => decor.box(0.7, 0.04, 0.7, 0x66BB6A, POND_POS.x + dx, 0.17, POND_POS.z + dz));
  decor.box(0.18, 0.12, 0.18, 0xF8BBD0, POND_POS.x - 2, 0.22, POND_POS.z + 1);
  addCollider(POND_POS.x, POND_POS.z, 4.2);

  // Bench by the pond
  statics.box(2.2, 0.12, 0.6, 0x8D6E63, POND_POS.x - 7.2, 0.55, POND_POS.z + 2, 0, 0.6, 0);
  statics.box(2.2, 0.5, 0.1, 0x8D6E63, POND_POS.x - 7.4, 0.85, POND_POS.z + 1.75, 0, 0.6, 0);

  scene.add(voxelMesh(statics));
  scene.add(voxelMesh(decor, MATS.voxel, { noCast: true }));
  const pathMesh = voxelMesh(paths, MATS.path, { noCast: true });
  scene.add(pathMesh);

  buildClouds(rand);
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

// ─── Shlomo's seed stand ───
let shopModel = null, shlomo = null;
function buildShop() {
  shopModel = new THREE.Group();
  const b = new VoxelBatch(4);
  // Counter (in front of Shlomo, local +z faces the garden)
  b.box(3.2, 0.15, 1.0, 0x5D4037, 0, 1.0, 1.0);
  b.box(3.0, 0.9, 0.12, 0x8D6E63, 0, 0.5, 1.45);
  for (let i = -1; i <= 1; i++) b.box(0.9, 0.12, 0.14, 0xA1887F, i * 1.0, 0.75, 1.52);
  [[-1.5, 0.55], [1.5, 0.55], [-1.5, 1.45], [1.5, 1.45]].forEach(([x, z]) => b.box(0.15, 1.0, 0.15, 0x6D4C41, x, 0.5, z));
  // Canopy poles + striped awning
  [[-1.6, -0.6], [1.6, -0.6], [-1.6, 1.5], [1.6, 1.5]].forEach(([x, z]) => b.box(0.14, 2.7, 0.14, 0x8D6E63, x, 1.35, z));
  for (let i = 0; i < 7; i++) {
    b.box(0.5, 0.12, 2.6, i % 2 ? 0xFFFFFF : 0xE53935, -1.5 + i * 0.5, 2.75, 0.45, 0.12, 0, 0);
  }
  b.box(3.5, 0.3, 0.08, 0xE53935, 0, 2.55, 1.75);
  // Seed sacks and crates on the counter
  [[0xFFD600, -1.1], [0xE91E63, -0.4], [0xFF7043, 0.4], [0x7E57C2, 1.1]].forEach(([c, x]) => {
    b.box(0.4, 0.32, 0.32, 0xD7CCC8, x, 1.24, 1.05);
    b.box(0.34, 0.08, 0.26, c, x, 1.43, 1.05);
  });
  // Crates beside the stall
  b.box(0.8, 0.8, 0.8, 0xA1887F, 2.3, 0.4, 1.0);
  b.box(0.7, 0.2, 0.7, 0x8BC34A, 2.3, 0.88, 1.0);
  b.box(0.7, 0.7, 0.7, 0xA1887F, -2.3, 0.35, 0.8, 0, 0.3, 0);
  b.box(0.6, 0.2, 0.6, 0xFF7043, -2.3, 0.78, 0.8, 0, 0.3, 0);
  // Back wall + sign board
  b.box(3.3, 2.3, 0.12, 0xBCAAA4, 0, 1.15, -0.65);
  b.box(2.6, 0.7, 0.1, 0xFFF8E1, 0, 3.25, 0.45);
  b.box(0.1, 0.5, 0.1, 0x6D4C41, -1.0, 3.0, 0.45);
  b.box(0.1, 0.5, 0.1, 0x6D4C41, 1.0, 3.0, 0.45);
  shopModel.add(voxelMesh(b));

  // Sign text
  const sign = textSprite("🌱 Shlomo's Seeds", '#5D4037');
  sign.position.set(0, 3.25, 0.62);
  sign.scale.multiplyScalar(1.45);
  shopModel.add(sign);

  // Shlomo himself
  shlomo = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const part = (w, h, d, c, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z); m.castShadow = true; (parent || shlomo).add(m); return m;
  };
  const skin = 0xC8956C, shirt = 0xFFF9C4, apron = 0xD32F2F, straw = 0xF9A825;
  const head = new THREE.Group(); head.position.set(0, 1.55, 0); shlomo.add(head);
  part(0.5, 0.5, 0.5, skin, 0, 0, 0, head);
  part(0.08, 0.1, 0.05, 0x222222, -0.12, 0.04, 0.25, head);
  part(0.08, 0.1, 0.05, 0x222222, 0.12, 0.04, 0.25, head);
  part(0.22, 0.06, 0.05, 0x8B4513, 0, -0.12, 0.25, head);
  part(0.42, 0.14, 0.06, 0x5D4037, 0, -0.2, 0.24, head); // beard
  part(0.9, 0.06, 0.9, straw, 0, 0.27, 0, head);
  part(0.5, 0.3, 0.5, straw, 0, 0.43, 0, head);
  part(0.52, 0.08, 0.52, apron, 0, 0.32, 0, head);
  part(0.5, 0.6, 0.3, shirt, 0, 1.0, 0);
  part(0.4, 0.5, 0.05, apron, 0, 0.95, 0.18);
  const armL = new THREE.Group(); armL.position.set(-0.35, 1.25, 0); shlomo.add(armL);
  part(0.2, 0.55, 0.2, shirt, 0, -0.25, 0, armL); part(0.18, 0.15, 0.18, skin, 0, -0.58, 0, armL);
  const armR = new THREE.Group(); armR.position.set(0.35, 1.25, 0); shlomo.add(armR);
  part(0.2, 0.55, 0.2, shirt, 0, -0.25, 0, armR); part(0.18, 0.15, 0.18, skin, 0, -0.58, 0, armR);
  part(0.22, 0.5, 0.25, 0x37474F, -0.13, 0.45, 0);
  part(0.22, 0.5, 0.25, 0x37474F, 0.13, 0.45, 0);
  shlomo.userData = { head, armL, armR };
  shopModel.add(shlomo);

  shopModel.position.set(SHOP_POS.x, 0, SHOP_POS.z);
  shopModel.rotation.y = Math.PI / 2; // local +z → world +x (toward the garden)
  scene.add(shopModel);
  addCollider(SHOP_POS.x, SHOP_POS.z, 1.9);
  addCollider(SHOP_POS.x - 0.2, SHOP_POS.z + 1.6, 1.2);
  addCollider(SHOP_POS.x - 0.2, SHOP_POS.z - 1.6, 1.2);
}

function updateShlomo(time, near) {
  if (!shlomo) return;
  const u = shlomo.userData;
  shlomo.position.y = Math.sin(time * 2) * 0.02;
  // Wave when the player comes close
  u.armR.rotation.z = near ? 2.6 + Math.sin(time * 9) * 0.35 : lerp(u.armR.rotation.z, 0, 0.1);
  u.armL.rotation.x = Math.sin(time * 1.3) * 0.08;
  // Look toward the player
  const dx = playerPos.x - SHOP_POS.x, dz = playerPos.z - SHOP_POS.z;
  const ang = Math.atan2(dx, dz) - shopModel.rotation.y;
  u.head.rotation.y = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -0.8, 0.8);
}

// ─── Well ───
let wellWater = null;
function buildWell() {
  const g = new THREE.Group();
  const b = new VoxelBatch(4);
  // Stone ring (hollow) built from blocks
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    b.box(1.8, 0.9, 0.35, i % 2 ? 0x9E9E9E : 0xA8A8A8, Math.sin(a) * 0.72, 0.45, Math.cos(a) * 0.72, 0, a, 0);
  }
  b.box(1.9, 0.12, 0.4, 0xBDBDBD, 0, 0.94, 0.75); b.box(1.9, 0.12, 0.4, 0xBDBDBD, 0, 0.94, -0.75);
  b.box(0.4, 0.12, 1.9, 0xBDBDBD, 0.75, 0.94, 0); b.box(0.4, 0.12, 1.9, 0xBDBDBD, -0.75, 0.94, 0);
  b.box(0.15, 2.0, 0.15, 0x6D4C41, -0.85, 1.8, 0); b.box(0.15, 2.0, 0.15, 0x6D4C41, 0.85, 1.8, 0);
  b.box(1.9, 0.1, 0.1, 0x5D4037, 0, 2.3, 0);
  b.box(2.3, 0.12, 0.9, 0xA1887F, 0, 2.95, 0.35, -0.45, 0, 0);
  b.box(2.3, 0.12, 0.9, 0x8D6E63, 0, 2.95, -0.35, 0.45, 0, 0);
  b.box(0.04, 0.6, 0.04, 0xBCAAA4, 0, 1.95, 0);
  b.box(0.32, 0.3, 0.32, 0x795548, 0, 1.55, 0);
  b.box(0.36, 0.05, 0.36, 0x4E342E, 0, 1.7, 0);
  g.add(voxelMesh(b));
  wellWater = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.1), MATS.water);
  wellWater.position.y = 0.75;
  g.add(wellWater);
  g.position.set(WELL_POS.x, 0, WELL_POS.z);
  scene.add(g);
  addCollider(WELL_POS.x, WELL_POS.z, 1.2);
  const label = textSprite('💧 Well', '#B3E5FC');
  label.position.set(WELL_POS.x, 3.7, WELL_POS.z);
  scene.add(label);
}

// ─── Buddy the dog ───
let dog = null;
const dogPos = new THREE.Vector3(3, 0, 12);
const dogTarget = new THREE.Vector3(3, 0, 12);
let dogWalk = 0, dogWanderTimer = 3, dogBarkTimer = 70, dogHop = 0;
let dogTreasureTimer = 100, dogDigging = 0;
function buildDog() {
  dog = new THREE.Group();
  const body = 0xCD853F, dark = 0x8B5A2B, belly = 0xF5DEB3;
  const m = c => new THREE.MeshLambertMaterial({ color: c });
  const add = (w, h, d, c, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c));
    mesh.position.set(x, y, z); mesh.castShadow = true; (parent || dog).add(mesh); return mesh;
  };
  const torso = new THREE.Group(); dog.add(torso);
  add(0.6, 0.35, 0.32, body, 0, 0.38, 0, torso);
  add(0.5, 0.1, 0.26, belly, 0, 0.22, 0, torso);
  const head = new THREE.Group(); head.position.set(0.36, 0.55, 0); torso.add(head);
  add(0.28, 0.28, 0.28, body, 0, 0, 0, head);
  add(0.14, 0.11, 0.16, belly, 0.13, -0.05, 0, head);
  add(0.06, 0.06, 0.07, 0x222222, 0.21, -0.02, 0, head);
  add(0.04, 0.06, 0.05, 0x222222, 0.12, 0.06, 0.09, head);
  add(0.04, 0.06, 0.05, 0x222222, 0.12, 0.06, -0.09, head);
  add(0.02, 0.04, 0.06, 0xFF8A80, 0.2, -0.1, 0, head); // tongue
  const earL = add(0.08, 0.17, 0.07, dark, -0.04, 0.05, 0.16, head); earL.rotation.x = 0.3;
  const earR = add(0.08, 0.17, 0.07, dark, -0.04, 0.05, -0.16, head); earR.rotation.x = -0.3;
  add(0.04, 0.06, 0.34, 0xE53935, -0.12, -0.14, 0, head); // red collar
  const legs = [[0.2, 0.12], [0.2, -0.12], [-0.2, 0.12], [-0.2, -0.12]].map(([x, z]) => {
    const p = new THREE.Group(); p.position.set(x, 0.22, z); dog.add(p);
    add(0.09, 0.22, 0.09, body, 0, -0.11, 0, p); return p;
  });
  const tail = new THREE.Group(); tail.position.set(-0.3, 0.5, 0); torso.add(tail);
  add(0.06, 0.22, 0.06, body, 0, 0.1, 0, tail); tail.rotation.z = 0.6;
  dog.userData = { torso, head, legs, tail, earL, earR };
  dog.scale.setScalar(1.3);
  dog.position.copy(dogPos);
  scene.add(dog);
  const label = textSprite('🐕 Buddy');
  label.position.set(0, 1.15, 0);
  label.scale.multiplyScalar(0.55);
  dog.add(label);
}

function updateDog(dt, time) {
  if (!dog) return;
  const u = dog.userData;
  dogBarkTimer -= dt;
  if (dogBarkTimer <= 0) {
    dogBarkTimer = 50 + Math.random() * 70;
    if (Math.hypot(playerPos.x - dogPos.x, playerPos.z - dogPos.z) < 14) {
      Sfx.play('bark');
      floatText(dogPos.x, 1.6, dogPos.z, 'Woof!', '#FFE082');
    }
  }
  const dx = playerPos.x - dogPos.x, dz = playerPos.z - dogPos.z;
  const distP = Math.hypot(dx, dz);

  // Treasure hunting: every couple of minutes Buddy digs something up
  dogTreasureTimer -= dt;
  if (dogDigging > 0) {
    dogDigging -= dt;
    u.torso.rotation.z = -0.35;
    u.head.rotation.z = Math.sin(time * 25) * 0.15;
    u.legs[0].rotation.z = Math.sin(time * 30) * 0.8;
    u.legs[1].rotation.z = -Math.sin(time * 30) * 0.8;
    if (Math.random() < 0.4) spawnParticles(dogPos.x + 0.4, 0.2, dogPos.z, 0x8D6E63, 1, 2, 0.12);
    if (dogDigging <= 0) dogFindTreasure();
    dog.position.copy(dogPos);
    return;
  }
  if (dogTreasureTimer <= 0 && distP < 9 && started) {
    dogTreasureTimer = 120 + Math.random() * 120;
    dogDigging = 2.2;
    return;
  }

  if (distP > 7) {
    dogTarget.set(playerPos.x - dx / distP * 1.8, 0, playerPos.z - dz / distP * 1.8);
  } else {
    dogWanderTimer -= dt;
    if (dogWanderTimer <= 0) {
      dogWanderTimer = 3 + Math.random() * 5;
      dogTarget.set(playerPos.x + (Math.random() - 0.5) * 7, 0, playerPos.z + (Math.random() - 0.5) * 7);
    }
  }
  const tx = dogTarget.x - dogPos.x, tz = dogTarget.z - dogPos.z;
  const td = Math.hypot(tx, tz);
  const moving = td > 0.35;
  if (moving) {
    const speed = distP > 7 ? 7.5 : 2.6;
    const step = Math.min(td, speed * dt);
    dogPos.x += tx / td * step;
    dogPos.z += tz / td * step;
    const targetRot = Math.atan2(tx, tz) - Math.PI / 2;
    let diff = targetRot - dog.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    dog.rotation.y += diff * Math.min(1, dt * 8);
    dogWalk += dt * (speed > 3 ? 18 : 11);
    const s = Math.sin(dogWalk) * 0.5;
    u.legs[0].rotation.z = s; u.legs[3].rotation.z = s;
    u.legs[1].rotation.z = -s; u.legs[2].rotation.z = -s;
    u.torso.rotation.z = lerp(u.torso.rotation.z, 0, 0.2);
    u.torso.position.y = Math.abs(Math.sin(dogWalk)) * 0.04;
  } else {
    // Sit and wag (faster when you're close)
    u.legs.forEach(l => { l.rotation.z = lerp(l.rotation.z, 0, 0.2); });
    u.torso.rotation.z = lerp(u.torso.rotation.z, 0.25, 0.1);
    u.torso.position.y = lerp(u.torso.position.y, -0.05, 0.1);
    // Turn to look at the player
    const look = Math.atan2(dx, dz) - Math.PI / 2;
    let diff = look - dog.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    dog.rotation.y += diff * Math.min(1, dt * 3);
  }
  u.tail.rotation.x = Math.sin(time * (distP < 3 ? 18 : 7)) * 0.6;
  u.head.rotation.z = Math.sin(time * 1.7) * 0.08;
  u.head.rotation.x = 0;

  if (dogHop > 0) dogHop = Math.max(0, dogHop - dt * 2.5);
  for (const c of colliders) pushOut(dogPos, c, 0.4);
  const bound = WORLD_SIZE / 2 - 1.5;
  dogPos.x = clamp(dogPos.x, -bound, bound);
  dogPos.z = clamp(dogPos.z, -bound, bound);
  dog.position.set(dogPos.x, Math.sin(dogHop * Math.PI) * 0.6, dogPos.z);
}

function dogFindTreasure() {
  const roll = Math.random();
  let msg, icon;
  if (roll < 0.12 && gameState.level >= 2) {
    gameState.potions++;
    msg = 'Buddy dug up a 🧪 Grow Potion!'; icon = '🧪';
  } else if (roll < 0.55) {
    const seeds = unlockedSeedIds();
    const id = seeds[Math.floor(Math.random() * Math.min(seeds.length, 8))];
    const n = 1 + Math.floor(Math.random() * 2);
    gameState.inventory[id] = (gameState.inventory[id] || 0) + n;
    const s = getSeedData(id);
    msg = `Buddy found ${n} ${s.emoji} ${s.name} seed${n > 1 ? 's' : ''}!`; icon = s.emoji;
  } else {
    const c = 10 + Math.floor(Math.random() * 15) + gameState.level * 3;
    addCoins(c);
    msg = `Buddy found 🪙 ${c} coins!`; icon = '🪙';
  }
  gameState.buddyFinds = (gameState.buddyFinds || 0) + 1;
  if (gameState.buddyFinds >= 5) checkAchievement('best_friends');
  dogHop = 1;
  Sfx.play('bark');
  setTimeout(() => Sfx.play('sparkle'), 250);
  spawnParticles(dogPos.x, 0.5, dogPos.z, 0xFFD54F, 14, 4, 0.12);
  floatText(dogPos.x, 1.8, dogPos.z, icon, '#fff');
  showToast('🐕', msg);
  updateHUD(); updateHotbar(); saveGame();
}

function petDog() {
  dogHop = 1;
  Sfx.play('bark');
  spawnParticles(dogPos.x, 1.0, dogPos.z, 0xFF5C8A, 10, 3, 0.12);
  floatText(dogPos.x, 1.9, dogPos.z, '❤️', '#FF8A80');
  showToast('❤️', 'Buddy loves you!');
  checkAchievement('dog_lover');
  taskEvent('pet', 1);
}

// ─── Ducks in the pond ───
const ducks = [];
function buildDucks() {
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const b = new VoxelBatch(8);
    const white = i === 2 ? 0xFFEB3B : 0xFAFAFA;
    b.box(0.5, 0.28, 0.32, white, 0, 0.14, 0);
    b.box(0.22, 0.24, 0.22, white, 0.24, 0.36, 0);
    b.box(0.14, 0.06, 0.12, 0xFF9800, 0.4, 0.33, 0);
    b.box(0.04, 0.05, 0.04, 0x222222, 0.3, 0.42, 0.11);
    b.box(0.04, 0.05, 0.04, 0x222222, 0.3, 0.42, -0.11);
    b.box(0.12, 0.12, 0.2, white, -0.27, 0.24, 0);
    g.add(voxelMesh(b));
    g.userData = { phase: i * 2.1, r: 1.6 + i * 0.9, speed: 0.25 + i * 0.07 };
    if (i === 2) g.scale.setScalar(0.6);
    scene.add(g);
    ducks.push(g);
  }
}
function updateDucks(time) {
  ducks.forEach(d => {
    const u = d.userData;
    const a = time * u.speed + u.phase;
    d.position.set(POND_POS.x + Math.cos(a) * u.r * 1.2, 0.08 + Math.sin(time * 3 + u.phase) * 0.02, POND_POS.z + Math.sin(a) * u.r * 0.9);
    d.rotation.y = -a - Math.PI;
  });
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
    g.userData = { wl, wr, cx: Math.cos(a) * (4 + Math.random() * 6), cz: Math.sin(a) * (4 + Math.random() * 6), phase: Math.random() * 6, speed: 0.4 + Math.random() * 0.4 };
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
    b.visible = day > 0.4 && currentWeather !== 'rainy';
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
  rain.visible = currentWeather === 'rainy';
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

// ─── Garden plots (3D) ───
let frameMesh = null, lockMesh = null, highlight = null, guideArrow = null, sprinklerModel = null;
let SOIL_GEO = null, GLOW_GEO = null;

function buildGardenPlots() {
  plotViews.forEach(v => scene.remove(v.group));
  plotViews.length = 0;
  if (!SOIL_GEO) {
    SOIL_GEO = new VoxelBatch(1.5).box(PLOT_SIZE - 0.2, 0.3, PLOT_SIZE - 0.2, 0xffffff, 0, 0.15, 0).build();
    // "Ready!" border in the crop's rarity color
    const gb = new VoxelBatch(1), gs = PLOT_SIZE - 0.2, gt = 0.16;
    gb.box(gs, 0.05, gt, 0xffffff, 0, 0, -gs / 2 + gt / 2); gb.box(gs, 0.05, gt, 0xffffff, 0, 0, gs / 2 - gt / 2);
    gb.box(gt, 0.05, gs - gt * 2, 0xffffff, -gs / 2 + gt / 2, 0, 0); gb.box(gt, 0.05, gs - gt * 2, 0xffffff, gs / 2 - gt / 2, 0, 0);
    GLOW_GEO = gb.build();
  }
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const p = getPlotWorldPos(i);
    const group = new THREE.Group();
    group.position.set(p.x, 0, p.z);
    const soil = new THREE.Mesh(SOIL_GEO, MATS.soil);
    soil.receiveShadow = true;
    group.add(soil);
    const glow = new THREE.Mesh(GLOW_GEO, MATS.glow.common);
    glow.position.y = 0.33;
    glow.visible = false;
    group.add(glow);
    const icon = new THREE.Sprite(Tex.emojiMaterial('💧', true));
    icon.scale.set(0.7, 0.7, 1);
    icon.visible = false;
    group.add(icon);
    scene.add(group);
    plotViews.push({ group, soil, glow, icon, plant: null, key: '', pop: 0, iconEmoji: '' });
  }
  rebuildPlotFrames();
  refreshAllPlots();
}

// Wooden borders around unlocked plots + "for sale" signs on locked ones (two draw calls total)
function rebuildPlotFrames() {
  if (frameMesh) { scene.remove(frameMesh); frameMesh.geometry.dispose(); }
  if (lockMesh) { scene.remove(lockMesh); lockMesh.geometry.dispose(); }
  const fb = new VoxelBatch(4), lb = new VoxelBatch(4);
  const e = PLOT_SIZE / 2;
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const p = getPlotWorldPos(i);
    if (isPlotUnlocked(i)) {
      fb.box(PLOT_SIZE + 0.1, 0.38, 0.14, 0x8D6E63, p.x, 0.19, p.z - e);
      fb.box(PLOT_SIZE + 0.1, 0.38, 0.14, 0x8D6E63, p.x, 0.19, p.z + e);
      fb.box(0.14, 0.38, PLOT_SIZE - 0.1, 0x795548, p.x - e, 0.19, p.z);
      fb.box(0.14, 0.38, PLOT_SIZE - 0.1, 0x795548, p.x + e, 0.19, p.z);
    } else {
      lb.box(PLOT_SIZE - 0.1, 0.06, PLOT_SIZE - 0.1, 0x7CB342, p.x, 0.03, p.z);
      lb.box(0.1, 0.6, 0.1, 0x6D4C41, p.x, 0.3, p.z);
      lb.box(0.55, 0.36, 0.07, 0xFFE082, p.x, 0.62, p.z + 0.06);
      lb.box(0.2, 0.16, 0.09, 0x8D6E63, p.x, 0.62, p.z + 0.07);
      // little stakes at the corners
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => lb.box(0.08, 0.35, 0.08, 0xBCAAA4, p.x + sx * (e - 0.1), 0.17, p.z + sz * (e - 0.1)));
    }
  }
  frameMesh = voxelMesh(fb);
  scene.add(frameMesh);
  if (!lb.isEmpty()) { lockMesh = voxelMesh(lb); scene.add(lockMesh); } else lockMesh = null;
  plotViews.forEach((v, i) => { v.soil.visible = isPlotUnlocked(i); });
}

function buildHighlight() {
  const b = new VoxelBatch(1);
  const s = PLOT_SIZE + 0.3, t = 0.12;
  b.box(s, 0.05, t, 0xffffff, 0, 0, -s / 2); b.box(s, 0.05, t, 0xffffff, 0, 0, s / 2);
  b.box(t, 0.05, s, 0xffffff, -s / 2, 0, 0); b.box(t, 0.05, s, 0xffffff, s / 2, 0, 0);
  highlight = new THREE.Mesh(b.build(), MATS.highlight);
  highlight.visible = false;
  scene.add(highlight);

  // Big bouncing pointing hand — easy to understand even for kids who can't read yet
  guideArrow = new THREE.Sprite(Tex.emojiMaterial('👇', false));
  guideArrow.material.depthTest = false;
  guideArrow.renderOrder = 10;
  guideArrow.scale.set(1.6, 1.6, 1);
  guideArrow.visible = false;
  scene.add(guideArrow);
}

function buildSprinkler() {
  if (sprinklerModel || !gameState.upgrades.sprinkler) return;
  const b = new VoxelBatch(8);
  b.box(0.35, 0.2, 0.35, 0x90A4AE, 0, 0.1, 0);
  b.box(0.12, 0.7, 0.12, 0xB0BEC5, 0, 0.5, 0);
  b.box(0.5, 0.08, 0.1, 0x546E7A, 0, 0.88, 0);
  b.box(0.1, 0.08, 0.5, 0x546E7A, 0, 0.88, 0);
  sprinklerModel = voxelMesh(b);
  sprinklerModel.position.set(0, 0, 0);
  scene.add(sprinklerModel);
}

function plotVisualKey(plot) {
  const prog = plotProgress(plot);
  const ready = prog >= 1;
  return plot.seedId + '|' + (ready ? 'R' : Math.floor(prog * 10)) + '|' + (plot.mutation || '');
}

function refreshPlot(i) {
  const v = plotViews[i];
  if (!v) return;
  const plot = gameState.plots[i];
  const unlocked = isPlotUnlocked(i);
  v.soil.visible = unlocked;
  if (!plot || !unlocked) {
    if (v.plant) { v.group.remove(v.plant); v.plant.geometry.dispose(); v.plant = null; }
    v.key = '';
    v.glow.visible = false;
    v.icon.visible = false;
    v.soil.material = MATS.soil;
    return;
  }
  const seed = getSeedData(plot.seedId);
  if (!seed) return;
  const prog = plotProgress(plot);
  const ready = prog >= 1;
  const key = plotVisualKey(plot);
  if (key !== v.key) {
    if (v.plant) { v.group.remove(v.plant); v.plant.geometry.dispose(); }
    const mat = plot.mutation === 'golden' ? MATS.golden : plot.mutation === 'rainbow' ? MATS.rainbow : MATS.plant;
    v.plant = new THREE.Mesh(buildPlantGeometry(plot.seedId, seed, Math.min(prog, 1), ready), mat);
    v.plant.castShadow = true;
    v.plant.scale.setScalar(PLANT_SCALE);
    v.plant.position.y = PLANT_Y;
    v.group.add(v.plant);
    if (v.key) v.pop = 1; // little "boing" when the plant grows a stage
    v.key = key;
  }
  v.glow.visible = ready;
  if (ready) v.glow.material = MATS.glow[seed.rarity || 'common'] || MATS.glow.common;
  const water = plot.waterLevel;
  v.soil.material = water <= 0 ? MATS.soilDry : water > 50 ? MATS.soilWet : MATS.soil;
  // Floating icon: seed emoji when ready, water drop when thirsty
  let emoji = '';
  if (ready) emoji = seed.emoji;
  else if (water <= 15 && !gameState.upgrades.sprinkler) emoji = '💧';
  if (emoji !== v.iconEmoji) {
    v.iconEmoji = emoji;
    if (emoji) v.icon.material = Tex.emojiMaterial(emoji, true);
  }
  v.icon.visible = !!emoji;
}

function refreshAllPlots() { for (let i = 0; i < TOTAL_PLOTS; i++) refreshPlot(i); }

function animatePlots(time, dt) {
  const hue = (time * 0.15) % 1;
  MATS.rainbow.color.setHSL(hue, 0.8, 0.6);
  MATS.rainbow.emissive.setHSL(hue, 0.9, 0.12);
  const glowPulse = 0.65 + Math.sin(time * 4) * 0.3;
  Object.values(MATS.glow).forEach(m => { m.opacity = glowPulse; });
  for (let i = 0; i < plotViews.length; i++) {
    const v = plotViews[i];
    const plot = gameState.plots[i];
    if (!v.plant || !plot) continue;
    const ready = v.key.includes('|R|');
    if (v.pop > 0) {
      v.pop = Math.max(0, v.pop - dt * 3);
      const s = PLANT_SCALE * (1 + Math.sin(v.pop * Math.PI) * 0.18);
      v.plant.scale.set(s, PLANT_SCALE * (1 + Math.sin(v.pop * Math.PI) * 0.25), s);
    } else if (ready) {
      v.plant.position.y = PLANT_Y + Math.abs(Math.sin(time * 2.5 + i)) * 0.06;
      v.plant.rotation.y = Math.sin(time * 1.5 + i * 0.5) * 0.08;
    } else {
      v.plant.rotation.z = Math.sin(time * 1.2 + i) * 0.025; // gentle breeze
    }
    if (v.icon.visible) v.icon.position.y = 2.3 + Math.sin(time * 3 + i) * 0.12;
    if (plot.mutation && Math.random() < dt * 3) {
      const p = getPlotWorldPos(i);
      spawnParticles(p.x + (Math.random() - 0.5) * 1.2, 0.5 + Math.random(), p.z + (Math.random() - 0.5) * 1.2,
        plot.mutation === 'golden' ? 0xFFE082 : [0xFF8A80, 0xFFFF8D, 0x80D8FF, 0xB9F6CA][Math.floor(Math.random() * 4)], 1, 0.6, 0.07, { up: 0.6, grav: 0, life: 1.1 });
    }
  }
}

// ════════════════════════════════════════════
//  GAMEPLAY
// ════════════════════════════════════════════

function plotProgress(plot) { return Math.min(1, (plot.grown || 0) / plot.growTime); }
function isReady(plot) { return plot && plotProgress(plot) >= 1; }
function canCapacity() { return gameState.upgrades.big_can ? BASE_CAN * 2 : BASE_CAN; }
function growRate(plot) {
  let r = plot.waterLevel <= 0 ? 0.3 : plot.waterLevel > 50 ? 1.5 : 1;
  if (currentWeather === 'rainy') r *= 1.2;
  return r;
}
function unlockedSeedIds() { return SEED_LIST.filter(id => SEEDS[id].level <= gameState.level); }
function cropKey(seedId, mutation) { return mutation ? seedId + '|' + mutation : seedId; }
function parseCrop(key) { const [seedId, mutation] = key.split('|'); return { seedId, mutation: mutation || null }; }
function hotSeedId() {
  const ids = SEED_LIST.filter(id => SEEDS[id].level <= Math.max(3, gameState.level));
  return ids[Math.floor(Date.now() / 86400000) % ids.length];
}
function cropPrice(key) {
  const { seedId, mutation } = parseCrop(key);
  const seed = getSeedData(seedId);
  if (!seed) return 0;
  const r = (RARITY[seed.rarity] || RARITY.common).mult;
  const m = mutation && MUTATIONS[mutation] ? MUTATIONS[mutation].mult : 1;
  const hot = seedId === hotSeedId() ? 1.5 : 1;
  return Math.max(1, Math.round(seed.sellPrice * r * m * hot));
}
function cropName(key) {
  const { seedId, mutation } = parseCrop(key);
  const s = getSeedData(seedId);
  if (!s) return key;
  return (mutation ? MUTATIONS[mutation].emoji + ' ' + MUTATIONS[mutation].name + ' ' : '') + s.name;
}

// ─── Growth tick ───
let plotRefreshTimer = 0;
function updateGarden(dt) {
  const raining = currentWeather === 'rainy';
  const sprinkler = !!gameState.upgrades.sprinkler;
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const plot = gameState.plots[i];
    if (!plot) continue;
    if (plotProgress(plot) < 1) {
      plot.grown = (plot.grown || 0) + dt * growRate(plot);
      if (sprinkler) plot.waterLevel = 100;
      else plot.waterLevel = Math.max(0, plot.waterLevel - dt * 0.35);
      if (raining) { plot.waterLevel = Math.min(100, plot.waterLevel + dt * 6); plot.wet = true; }
      if (plotProgress(plot) >= 1) onPlantReady(i);
    }
  }
  if (raining) gameState.waterCan = Math.min(canCapacity(), gameState.waterCan + dt * 2);
  plotRefreshTimer -= dt;
  if (plotRefreshTimer <= 0) { plotRefreshTimer = 0.5; refreshAllPlots(); }
}

function onPlantReady(i) {
  const p = getPlotWorldPos(i);
  const seed = getSeedData(gameState.plots[i].seedId);
  refreshPlot(i);
  spawnParticles(p.x, 1.0, p.z, [0xFFFFFF, 0xFFF59D, seed.color], 10, 2.5, 0.09);
  if (Math.hypot(playerPos.x - p.x, playerPos.z - p.z) < 16) Sfx.play('pop');
}

// ─── Actions ───
function plantSeed(i, seedId) {
  if (!seedId || !gameState.inventory[seedId]) {
    Sfx.play('deny');
    showToast('🛒', 'No seeds! Visit Shlomo to buy some.');
    hintTarget = 'shop'; hintTimer = 8;
    return;
  }
  const seed = getSeedData(seedId);
  gameState.inventory[seedId]--;
  if (gameState.inventory[seedId] <= 0) delete gameState.inventory[seedId];
  const luck = gameState.upgrades.lucky_clover ? 2 : 1;
  const roll = Math.random();
  const mutation = roll < 0.015 * luck ? 'rainbow' : roll < 0.075 * luck ? 'golden' : null;
  gameState.plots[i] = { seedId, grown: 0, growTime: seed.growTime, waterLevel: 100, mutation, wet: false, harvests: 0 };
  if (!gameState.inventory[seedId]) selectNextSeed();
  const p = getPlotWorldPos(i);
  Sfx.play('plant');
  spawnParticles(p.x, 0.4, p.z, [0x6D4C41, 0x8D6E63], 10, 2, 0.1);
  refreshPlot(i);
  plotViews[i].pop = 1;
  if (mutation) {
    setTimeout(() => {
      Sfx.play('sparkle');
      showToast(MUTATIONS[mutation].emoji, `Wow! A ${MUTATIONS[mutation].name} ${seed.name}! It's worth ${MUTATIONS[mutation].mult}x!`);
      floatText(p.x, 1.6, p.z, MUTATIONS[mutation].emoji + ' ' + MUTATIONS[mutation].name + '!', MUTATIONS[mutation].color);
    }, 300);
  }
  addXP(1, p);
  checkAchievement('first_sprout');
  if (gameState.plots.every((pl, idx) => !isPlotUnlocked(idx) || pl)) checkAchievement('full_garden');
  taskEvent('plant', 1, { seedId });
  updateHotbar();
  saveGame();
}

function waterPlot(i) {
  const plot = gameState.plots[i];
  if (!plot) return;
  if (isReady(plot)) { showToast('🧺', 'This one is ready — harvest it!'); return; }
  if (gameState.waterCan < 10) {
    Sfx.play('deny');
    showToast('🪣', 'Your watering can is empty! Refill it at the well 💧');
    hintTarget = 'well'; hintTimer = 8;
    return;
  }
  if (plot.waterLevel >= 95) { showToast('💧', 'Already nice and wet!'); return; }
  plot.waterLevel = 100;
  gameState.waterCan = Math.max(0, gameState.waterCan - 10);
  const p = getPlotWorldPos(i);
  Sfx.play('water');
  spawnParticles(p.x, 1.6, p.z, [0x4FC3F7, 0x81D4FA, 0xB3E5FC], 22, 1.2, 0.08, { down: true, spread: 1.4, life: 0.7, grav: 12 });
  floatText(p.x, 1.4, p.z, '💧 Growing faster!', '#81D4FA');
  addXP(1, null);
  taskEvent('water', 1);
  refreshPlot(i);
  updateHUD();
}

function refillWaterCan() {
  gameState.waterCan = canCapacity();
  Sfx.play('water');
  spawnParticles(WELL_POS.x, 1.2, WELL_POS.z, [0x4FC3F7, 0xB3E5FC], 14, 2, 0.08);
  showToast('🚰', 'Watering can filled up!');
  taskEvent('refill', 1);
  updateHUD();
}

function harvestPlot(i) {
  const plot = gameState.plots[i];
  if (!isReady(plot)) return;
  const seed = getSeedData(plot.seedId);
  let mutation = plot.mutation;
  if (!mutation && plot.wet) mutation = 'wet';
  if (!mutation && nightFactor > 0.6 && Math.random() < 0.35) mutation = 'moonlit';
  const key = cropKey(plot.seedId, mutation);
  gameState.harvested[key] = (gameState.harvested[key] || 0) + 1;
  gameState.totalHarvested++;
  if (!gameState.harvestedTypes.includes(plot.seedId)) gameState.harvestedTypes.push(plot.seedId);

  // Regrowing plants stay in the ground and grow again
  plot.harvests = (plot.harvests || 0) + 1;
  const regrows = seed.regrow && plot.harvests < seed.regrow;
  if (regrows) {
    plot.grown = plot.growTime * 0.4;
    plot.wet = false;
    if (plot.mutation !== 'rainbow' && plot.mutation !== 'golden') {
      const luck = gameState.upgrades.lucky_clover ? 2 : 1;
      const roll = Math.random();
      plot.mutation = roll < 0.015 * luck ? 'rainbow' : roll < 0.075 * luck ? 'golden' : null;
    } else plot.mutation = null;
  } else {
    gameState.plots[i] = null;
  }

  const p = getPlotWorldPos(i);
  const rarity = seed.rarity || 'common';
  const big = mutation || rarity === 'rare' || rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic';
  Sfx.play('harvest');
  if (big) setTimeout(() => Sfx.play('sparkle'), 200);
  spawnParticles(p.x, 0.9, p.z, [seed.color, seed.topColor || seed.color, 0xFFFFFF], big ? 30 : 16, 4, 0.13);
  if (mutation === 'golden') spawnParticles(p.x, 1, p.z, 0xFFD54F, 25, 5, 0.1);
  if (mutation === 'rainbow') spawnParticles(p.x, 1, p.z, [0xFF5252, 0xFFEB3B, 0x69F0AE, 0x40C4FF, 0xE040FB], 35, 5, 0.1);
  floatText(p.x, 1.8, p.z, `+1 ${mutation ? MUTATIONS[mutation].emoji : ''}${seed.emoji}`, mutation ? MUTATIONS[mutation].color : '#FFFFFF');
  if (mutation) showToast(MUTATIONS[mutation].emoji, `${cropName(key)}! Worth ${MUTATIONS[mutation].mult}x coins!`);
  if (regrows) setTimeout(() => floatText(p.x, 1.2, p.z, `♻️ Regrows (${seed.regrow - plot.harvests} left)`, '#B9F6CA'), 400);

  const xp = Math.round((4 + seed.growTime / 8) * (mutation ? 1.5 : 1));
  addXP(xp, p);

  if (gameState.totalHarvested >= 10) checkAchievement('green_thumb');
  if (gameState.totalHarvested >= 50) checkAchievement('master_gardener');
  if (rarity !== 'common' && rarity !== 'uncommon') checkAchievement('rare_find');
  if (rarity === 'mythic') checkAchievement('mythic');
  if (gameState.harvestedTypes.length >= 8) checkAchievement('variety_pack');
  if (mutation === 'golden') checkAchievement('golden_touch');
  if (mutation === 'rainbow') checkAchievement('over_rainbow');
  if (mutation === 'wet') checkAchievement('rain_dancer');
  if (mutation === 'moonlit') checkAchievement('night_owl');
  taskEvent('harvest', 1, { seedId: seed.id, mutation });

  refreshPlot(i);
  updateHUD();
  updateHotbar();
  saveGame();
}

function useGrowPotion(i) {
  const plot = gameState.plots[i];
  if (!plot || isReady(plot)) return;
  if (gameState.potions <= 0) {
    Sfx.play('deny');
    showToast('🧪', 'No Grow Potions! Shlomo sells them.');
    return;
  }
  gameState.potions--;
  plot.grown = plot.growTime;
  const p = getPlotWorldPos(i);
  Sfx.play('potion');
  spawnParticles(p.x, 0.6, p.z, [0xE040FB, 0x7C4DFF, 0xB9F6CA], 30, 3, 0.1);
  checkAchievement('mad_scientist');
  onPlantReady(i);
  updateHUD(); updateHotbar(); saveGame();
}

function unlockPlot(i) {
  const cost = plotUnlockCost(gameState.unlockedPlots.length);
  if (gameState.coins < cost) {
    Sfx.play('deny');
    showToast('🔒', `You need 🪙 ${fmt(cost)} to buy this plot.`);
    return;
  }
  gameState.coins -= cost;
  gameState.unlockedPlots.push(i);
  const p = getPlotWorldPos(i);
  Sfx.play('unlock');
  spawnParticles(p.x, 0.5, p.z, [0x8D6E63, 0x7CB342, 0xFFD54F], 30, 4, 0.12);
  floatText(p.x, 1.5, p.z, '🏡 New plot!', '#B9F6CA');
  rebuildPlotFrames();
  refreshPlot(i);
  checkAchievement('landowner');
  if (gameState.unlockedPlots.length >= TOTAL_PLOTS - BASE_PLOTS) checkAchievement('big_garden');
  taskEvent('unlock', 1);
  updateHUD(); saveGame();
}

function addCoins(n) {
  gameState.coins += n;
  gameState.totalCoinsEarned += n;
  if (gameState.totalCoinsEarned >= 500) checkAchievement('entrepreneur');
  if (gameState.coins >= 10000) checkAchievement('millionaire');
  updateHUD();
}

function sellCrops(key, count) {
  const have = gameState.harvested[key] || 0;
  const n = Math.min(count, have);
  if (n <= 0) return 0;
  const total = cropPrice(key) * n;
  gameState.harvested[key] -= n;
  if (gameState.harvested[key] <= 0) delete gameState.harvested[key];
  addCoins(total);
  taskEvent('sell', n);
  taskEvent('earn', total);
  return total;
}

function sellAll() {
  let total = 0, count = 0;
  Object.keys(gameState.harvested).forEach(k => { count += gameState.harvested[k]; total += sellCrops(k, gameState.harvested[k]); });
  return { total, count };
}

function buySeed(seedId, qty) {
  const seed = getSeedData(seedId);
  const n = qty || 1;
  if (gameState.coins < seed.seedCost * n) { Sfx.play('deny'); return false; }
  gameState.coins -= seed.seedCost * n;
  gameState.inventory[seedId] = (gameState.inventory[seedId] || 0) + n;
  gameState.selectedSeed = seedId;
  Sfx.play('buy');
  taskEvent('buy', n);
  updateHUD(); updateHotbar(); saveGame();
  return true;
}

function buyUpgrade(id) {
  const u = UPGRADES[id];
  if (gameState.upgrades[id] || gameState.coins < u.cost) { Sfx.play('deny'); return; }
  gameState.coins -= u.cost;
  gameState.upgrades[id] = true;
  if (id === 'big_can') gameState.waterCan = canCapacity();
  if (id === 'sprinkler') buildSprinkler();
  Sfx.play('unlock');
  bigBanner(`${u.emoji} ${u.name}!`, u.desc);
  if (Object.keys(UPGRADES).every(k => gameState.upgrades[k])) checkAchievement('fully_loaded');
  updateHUD(); saveGame();
}

function buyPotion() {
  if (gameState.coins < POTION.cost) { Sfx.play('deny'); return; }
  gameState.coins -= POTION.cost;
  gameState.potions++;
  Sfx.play('buy');
  updateHUD(); updateHotbar(); saveGame();
}

// ─── XP / Levels ───
function addXP(n, pos) {
  gameState.xp += n;
  if (pos && n > 1) setTimeout(() => floatText(pos.x, 1.3, pos.z, `+${n} XP`, '#B388FF'), 150);
  let leveled = false;
  while (gameState.xp >= xpForLevel(gameState.level)) {
    gameState.xp -= xpForLevel(gameState.level);
    gameState.level++;
    leveled = true;
    const reward = 20 * gameState.level;
    gameState.coins += reward;
    const newSeeds = SEED_LIST.filter(id => SEEDS[id].level === gameState.level).map(id => SEEDS[id].emoji + ' ' + SEEDS[id].name);
    const newUps = Object.values(UPGRADES).filter(u => u.level === gameState.level).map(u => u.emoji + ' ' + u.name);
    if (POTION.level === gameState.level) newUps.push(POTION.emoji + ' ' + POTION.name);
    const unlocks = newSeeds.concat(newUps);
    setTimeout(() => {
      Sfx.play('levelup');
      bigBanner(`⭐ Level ${gameState.level}!`, `${levelTitle(gameState.level)} &nbsp;•&nbsp; +🪙${reward}` + (unlocks.length ? `<br>New at Shlomo's: ${unlocks.join(', ')}` : ''));
      spawnParticles(playerPos.x, 1.5, playerPos.z, [0xFFD54F, 0xFF80AB, 0x80D8FF, 0xB9F6CA], 50, 6, 0.12);
    }, 500);
    if (gameState.level >= 5) checkAchievement('rising_star');
    if (gameState.level >= 10) checkAchievement('super_star');
  }
  updateHUD();
  return leveled;
}

// ─── Achievements ───
const ACHIEVEMENTS = {
  first_sprout:    { name: 'First Sprout',     emoji: '🌱', desc: 'Plant your first seed' },
  green_thumb:     { name: 'Green Thumb',      emoji: '🌻', desc: 'Harvest 10 plants' },
  master_gardener: { name: 'Master Gardener',  emoji: '🏆', desc: 'Harvest 50 plants' },
  entrepreneur:    { name: 'Entrepreneur',     emoji: '💰', desc: 'Earn 500 coins total' },
  rare_find:       { name: 'Rare Find',        emoji: '💎', desc: 'Harvest a Rare (or better) plant' },
  fashion_forward: { name: 'Fashion Forward',  emoji: '🎭', desc: 'Buy an outfit in the wardrobe' },
  full_garden:     { name: 'Full Garden',      emoji: '📦', desc: 'Fill every plot you own at once' },
  variety_pack:    { name: 'Variety Pack',     emoji: '🌈', desc: 'Grow 8 different kinds of plants' },
  millionaire:     { name: 'Millionaire',      emoji: '💵', desc: 'Have 10,000 coins at once' },
  dog_lover:       { name: 'Dog Lover',        emoji: '🐕', desc: 'Pet Buddy the dog' },
  rising_star:     { name: 'Rising Star',      emoji: '⭐', desc: 'Reach level 5' },
  super_star:      { name: 'Super Star',       emoji: '🌟', desc: 'Reach level 10' },
  golden_touch:    { name: 'Golden Touch',     emoji: '✨', desc: 'Harvest a Golden crop' },
  over_rainbow:    { name: 'Over the Rainbow', emoji: '🌈', desc: 'Harvest a Rainbow crop' },
  rain_dancer:     { name: 'Rain Dancer',      emoji: '🌧️', desc: 'Harvest a Wet crop (grown in the rain)' },
  night_owl:       { name: 'Night Owl',        emoji: '🦉', desc: 'Harvest a Moonlit crop at night' },
  landowner:       { name: 'Landowner',        emoji: '🏡', desc: 'Buy a new garden plot' },
  big_garden:      { name: 'Huge Garden',      emoji: '🗺️', desc: 'Buy every garden plot' },
  task_master:     { name: 'Task Master',      emoji: '📋', desc: 'Finish 10 garden tasks' },
  mad_scientist:   { name: 'Mad Scientist',    emoji: '🧪', desc: 'Use a Grow Potion' },
  best_friends:    { name: 'Best Friends',     emoji: '🦴', desc: 'Buddy finds 5 treasures' },
  mythic:          { name: 'Mythic Grower',    emoji: '🦄', desc: 'Harvest a Mythic plant' },
  fully_loaded:    { name: 'Fully Loaded',     emoji: '🧰', desc: 'Buy every upgrade' },
};

function checkAchievement(id) {
  if (!ACHIEVEMENTS[id] || gameState.achievements.includes(id)) return;
  gameState.achievements.push(id);
  const a = ACHIEVEMENTS[id];
  setTimeout(() => {
    Sfx.play('quest');
    const el = document.createElement('div');
    el.className = 'achieve-pop';
    el.innerHTML = `<span class="ap-emoji">${a.emoji}</span><div><div class="ap-label">Achievement!</div><div class="ap-name">${a.name}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('exiting'), 2800);
    setTimeout(() => el.remove(), 3300);
  }, 900);
  saveGame();
}

// ─── Garden tasks (quests) ───
function makeTask() {
  const lvl = gameState.level;
  const seeds = unlockedSeedIds();
  const r = Math.random();
  const scale = 1 + lvl * 0.15;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let t;
  if (r < 0.16) {
    const g = 3 + Math.floor(Math.random() * 4);
    t = { type: 'plant', goal: g, text: `Plant ${g} seeds`, icon: '🌱', reward: Math.round(g * 6 * scale) };
  } else if (r < 0.3) {
    const g = 3 + Math.floor(Math.random() * 4);
    t = { type: 'water', goal: g, text: `Water ${g} plants`, icon: '💧', reward: Math.round(g * 6 * scale) };
  } else if (r < 0.48) {
    const g = 3 + Math.floor(Math.random() * 6);
    t = { type: 'harvest', goal: g, text: `Harvest ${g} crops`, icon: '🧺', reward: Math.round(g * 8 * scale) };
  } else if (r < 0.64) {
    const id = pick(seeds.slice(-6));
    const s = SEEDS[id];
    const g = 2 + Math.floor(Math.random() * 2);
    t = { type: 'harvest', seedId: id, goal: g, text: `Harvest ${g} ${s.emoji} ${s.name}`, icon: s.emoji, reward: Math.round(g * (s.sellPrice * 1.5 + 10)) };
  } else if (r < 0.77) {
    const g = 5 + Math.floor(Math.random() * 10);
    t = { type: 'sell', goal: g, text: `Sell ${g} crops to Shlomo`, icon: '💰', reward: Math.round(g * 4 * scale) };
  } else if (r < 0.86) {
    const g = Math.round((60 + Math.random() * 120) * scale / 10) * 10;
    t = { type: 'earn', goal: g, text: `Earn 🪙${g} from selling`, icon: '🪙', reward: Math.round(g * 0.3) };
  } else if (r < 0.93 && lvl >= 3) {
    t = { type: 'special', goal: 1, text: 'Harvest a special crop ✨🌈💧🌙', icon: '✨', reward: Math.round(60 * scale) };
  } else {
    t = { type: 'pet', goal: 1, text: 'Give Buddy a pet', icon: '🐕', reward: 15 };
  }
  t.progress = 0;
  t.xp = 15 + lvl * 4;
  return t;
}

function fillTasks() {
  if (!Array.isArray(gameState.tasks)) gameState.tasks = [];
  if (gameState.tutorialStep < TUTORIAL_TASKS.length) {
    if (gameState.tasks.length === 0) {
      const tt = TUTORIAL_TASKS[gameState.tutorialStep];
      gameState.tasks.push(Object.assign({ progress: 0, reward: 15, xp: 10, tutorial: true }, tt));
    }
  } else {
    while (gameState.tasks.length < 3) gameState.tasks.push(makeTask());
  }
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
    gameState.coins += t.reward;
    gameState.tasksDone = (gameState.tasksDone || 0) + 1;
    showToast('✅', `Task done! +🪙${t.reward}`);
    const el = $('#tasks-list');
    const r = el ? el.getBoundingClientRect() : { left: 80, top: 160 };
    coinFly(r.left + 60, r.top + 20, 5);
    if (t.tutorial) gameState.tutorialStep++;
    if (gameState.tasksDone >= 10) checkAchievement('task_master');
    addXP(t.xp, null);
    setTimeout(() => {
      gameState.tasks = gameState.tasks.filter(x => x !== t);
      fillTasks();
      if (t.tutorial && gameState.tutorialStep >= TUTORIAL_TASKS.length) {
        bigBanner('🎓 You did it!', 'You know how to garden! Now finish tasks to earn coins and level up.');
      }
      saveGame();
    }, 900);
    renderTasks();
    updateHUD();
  }, 350);
}

// ─── Guide arrow: points at what to do next (tutorial, or when stuck) ───
let hintTarget = null, hintTimer = 0;
function guideTargetPos() {
  let target = hintTimer > 0 ? hintTarget : null;
  const t = gameState.tasks[0];
  if (!target && t && t.tutorial && !t.done) {
    const hasSeeds = Object.keys(gameState.inventory).length > 0;
    if (t.type === 'plant') target = hasSeeds ? 'emptyPlot' : 'shop';
    else if (t.type === 'water') target = 'thirstyPlot';
    else if (t.type === 'harvest') target = 'readyPlot';
    else target = 'shop';
  }
  if (!target) {
    // Stuck: no seeds, nothing growing, nothing to sell
    const growing = gameState.plots.some(p => p);
    if (!growing && Object.keys(gameState.inventory).length === 0) target = 'shop';
  }
  if (!target) return null;
  if (target === 'shop') return { x: SHOP_POS.x + 1.2, y: 4.3, z: SHOP_POS.z };
  if (target === 'well') return { x: WELL_POS.x, y: 4.6, z: WELL_POS.z };
  let best = null, bd = Infinity;
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    if (!isPlotUnlocked(i)) continue;
    const plot = gameState.plots[i];
    const ok = target === 'emptyPlot' ? !plot :
      target === 'thirstyPlot' ? (plot && !isReady(plot)) :
      target === 'readyPlot' ? (plot && isReady(plot)) : false;
    if (!ok) continue;
    const p = getPlotWorldPos(i);
    const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best && target === 'readyPlot') return null; // still growing
  return best ? { x: best.x, y: 2.6, z: best.z } : null;
}

function updateGuide(time, dt) {
  if (hintTimer > 0) hintTimer -= dt;
  const g = started ? guideTargetPos() : null;
  guideArrow.visible = !!g;
  if (!g) return;
  guideArrow.position.set(g.x, g.y + 0.4 + Math.abs(Math.sin(time * 4)) * 0.5, g.z);
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

function updateWeather(dt) {
  weatherTimer -= dt;
  if (weatherTimer > 0) return;
  const r = Math.random();
  const prev = currentWeather;
  currentWeather = r < 0.55 ? 'sunny' : r < 0.78 ? 'cloudy' : 'rainy';
  weatherTimer = currentWeather === 'rainy' ? 60 + Math.random() * 60 : 120 + Math.random() * 150;
  if (currentWeather === prev) return;
  if (currentWeather === 'rainy') showToast('🌧️', 'Rain! Plants drink and grow faster. Harvest for 💧 Wet crops!');
  else if (currentWeather === 'sunny') showToast('☀️', 'The sun is out!');
}

let rainBlend = 0;
function updateDayNight(dt) {
  dayTime = (dayTime + dt / DAY_LENGTH) % 1;
  // Sun angle: rises at 0.25, sets at 0.75
  const ang = (dayTime - 0.25) * Math.PI * 2;
  const sunH = Math.sin(ang);
  sunDir.set(Math.cos(ang) * 0.8, sunH, 0.45).normalize();
  const day = clamp((sunH + 0.15) / 0.4, 0, 1);       // 0 night → 1 day
  const sunset = clamp(1 - Math.abs(sunH) / 0.35, 0, 1) * (sunH > -0.25 ? 1 : 0);
  nightFactor = 1 - day;
  rainBlend = lerp(rainBlend, currentWeather === 'rainy' ? 1 : currentWeather === 'cloudy' ? 0.35 : 0, Math.min(1, dt * 0.5));

  tmpTop.copy(skyCols.nightTop).lerp(skyCols.dayTop, day).lerp(skyCols.setTop, sunset * 0.5);
  tmpHor.copy(skyCols.nightHor).lerp(skyCols.dayHor, day).lerp(skyCols.setHor, sunset * 0.75);
  tmpTop.lerp(tmpC.copy(skyCols.rainTop).multiplyScalar(0.3 + day * 0.7), rainBlend * 0.8);
  tmpHor.lerp(tmpC.copy(skyCols.rainHor).multiplyScalar(0.3 + day * 0.7), rainBlend * 0.8);
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
  hemiLight.intensity = (0.4 + day * 0.55) * rainDim;
  hemiLight.color.copy(tmpTop).lerp(tmpC.set(0xffffff), 0.35 + day * 0.25);
  hemiLight.groundColor.setRGB(0.25 + day * 0.15, 0.3 + day * 0.18, 0.2 + day * 0.05);
  ambientLight.intensity = (0.18 + day * 0.12) * rainDim;
  ambientLight.color.setRGB(0.55 + day * 0.45, 0.65 + day * 0.35, 1);
  renderer.toneMappingExposure = 1.1;

  // Sun / moon discs follow the camera
  sunMesh.position.copy(camera.position).addScaledVector(sunDir, 350);
  sunMesh.lookAt(camera.position);
  sunMesh.material.opacity = clamp(sunH * 5 + 0.5, 0, 1) * (1 - rainBlend);
  moonMesh.position.copy(camera.position).addScaledVector(sunDir, -350);
  moonMesh.lookAt(camera.position);
  moonMesh.material.opacity = clamp(-sunH * 5 + 0.5, 0, 1) * (1 - rainBlend * 0.8);
  stars.position.copy(camera.position);
  stars.material.opacity = Math.max(0, nightFactor - 0.25) * (1 - rainBlend);

  MATS.lamps.emissive.setRGB(1, 0.75, 0.3).multiplyScalar(nightFactor * 1.2);
  Sfx.setCalm(nightFactor > 0.6);
}

// ─── Player movement & camera ───
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), moveDir = new THREE.Vector3();
function pushOut(pos, c, radius) {
  const dx = pos.x - c.x, dz = pos.z - c.z;
  const d = Math.hypot(dx, dz);
  const min = c.r + radius;
  if (d < min && d > 0.0001) { pos.x = c.x + dx / d * min; pos.z = c.z + dz / d * min; }
}

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
  let speed = WALK_SPEED * (running ? RUN_MULT : 1) * (gameState.upgrades.speedy_shoes ? 1.25 : 1);
  if (moving) moveDir.normalize().multiplyScalar(speed * (manual ? analog : 1));
  // Smooth acceleration
  const accel = Math.min(1, dt * (moving ? 12 : 16));
  playerVel.x = lerp(playerVel.x, moveDir.x, accel);
  playerVel.z = lerp(playerVel.z, moveDir.z, accel);
  playerPos.x += playerVel.x * dt;
  playerPos.z += playerVel.z * dt;
  for (const c of colliders) pushOut(playerPos, c, 0.35);
  const bound = WORLD_SIZE / 2 - 1;
  playerPos.x = clamp(playerPos.x, -bound, bound);
  playerPos.z = clamp(playerPos.z, -bound, bound);

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

// ─── Focus: what is the player standing next to? ───
function computeFocus() {
  const dShop = Math.hypot(playerPos.x - (SHOP_POS.x + 1.6), playerPos.z - SHOP_POS.z);
  if (dShop < SHOP_DIST) return { kind: 'shop' };
  const dWell = Math.hypot(playerPos.x - WELL_POS.x, playerPos.z - WELL_POS.z);
  if (dWell < WELL_DIST) return { kind: 'well' };
  // Plots: look at a point a little in front of the player
  const px = playerPos.x + Math.sin(playerFacing) * 0.8;
  const pz = playerPos.z + Math.cos(playerFacing) * 0.8;
  let best = -1, bd = Infinity;
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const p = getPlotWorldPos(i);
    const d = Math.hypot(px - p.x, pz - p.z);
    if (d < bd) { bd = d; best = i; }
  }
  const dDog = Math.hypot(playerPos.x - dogPos.x, playerPos.z - dogPos.z);
  if (best >= 0 && bd < PLOT_REACH && !(dDog < 1.4 && bd > 1.2)) return { kind: 'plot', index: best };
  if (dDog < DOG_DIST) return { kind: 'dog' };
  return null;
}

// Describe the focused thing: prompt text, action icon and what "E" does
function focusInfo(f) {
  if (!f) return null;
  if (f.kind === 'shop') return { icon: '🛒', text: "<b>Shlomo's Seeds</b> — buy seeds & sell crops", act: 'Shop' };
  if (f.kind === 'well') return { icon: '🚰', text: `Fill watering can (${Math.round(gameState.waterCan)}/${canCapacity()})`, act: 'Fill' };
  if (f.kind === 'dog') return { icon: '❤️', text: 'Pet <b>Buddy</b>', act: 'Pet' };
  const i = f.index;
  if (!isPlotUnlocked(i)) {
    const cost = plotUnlockCost(gameState.unlockedPlots.length);
    return { icon: '🔓', text: `Buy this plot for 🪙${fmt(cost)}`, act: 'Buy', dim: gameState.coins < cost };
  }
  const plot = gameState.plots[i];
  if (!plot) {
    const s = getSeedData(gameState.selectedSeed);
    if (s && gameState.inventory[gameState.selectedSeed]) return { icon: s.emoji, text: `Plant <b>${s.name}</b> <span class="dim">(${gameState.inventory[gameState.selectedSeed]} left)</span>`, act: 'Plant' };
    return { icon: '🛒', text: 'No seeds — visit Shlomo!', act: 'Plant', dim: true };
  }
  const seed = getSeedData(plot.seedId);
  const mut = plot.mutation ? `<span style="color:${MUTATIONS[plot.mutation].color}">${MUTATIONS[plot.mutation].emoji} ${MUTATIONS[plot.mutation].name}</span> ` : '';
  if (isReady(plot)) return { icon: '🧺', text: `Harvest ${mut}<b>${seed.emoji} ${seed.name}</b>!`, act: 'Harvest' };
  const left = Math.ceil((plot.growTime - plot.grown) / growRate(plot));
  const pct = Math.round(plotProgress(plot) * 100);
  const w = Math.round(plot.waterLevel);
  const thirsty = w <= 30;
  const status = w <= 0 ? '🥵 Thirsty! Growing slowly' : w > 50 ? '⚡ Growing fast' : '🌿 Growing';
  return {
    icon: thirsty ? '💧' : seed.emoji,
    text: `${mut}<b>${seed.emoji} ${seed.name}</b> ${pct}% • ${left}s<br><span class="dim">${status} • 💧${w}%</span>`,
    act: thirsty ? 'Water' : 'Info', progress: pct,
  };
}

function interact(f) {
  f = f || focus;
  if (!f || isAnyPanelOpen()) return;
  if (f.kind === 'shop') { openShop('seeds'); return; }
  if (f.kind === 'well') { refillWaterCan(); return; }
  if (f.kind === 'dog') { petDog(); return; }
  const i = f.index;
  if (!isPlotUnlocked(i)) { unlockPlot(i); return; }
  const plot = gameState.plots[i];
  if (!plot) { plantSeed(i, gameState.inventory[gameState.selectedSeed] ? gameState.selectedSeed : null); return; }
  if (isReady(plot)) { harvestPlot(i); return; }
  if (plot.waterLevel < 95 && gameState.waterCan >= 10 && !gameState.upgrades.sprinkler) { waterPlot(i); return; }
  const left = Math.ceil((plot.growTime - plot.grown) / growRate(plot));
  Sfx.play('click');
  const p = getPlotWorldPos(i);
  floatText(p.x, 1.6, p.z, `⏳ ${left}s`, '#FFFFFF');
  if (gameState.potions > 0) showToast('🧪', 'Press F (or 🧪) to use a Grow Potion!');
}

function selectNextSeed() {
  const ids = Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0);
  if (!ids.includes(gameState.selectedSeed)) gameState.selectedSeed = ids[0] || null;
}

// ════════════════════════════════════════════
//  UI
// ════════════════════════════════════════════

function updateHUD() {
  setText($('#coin-amount'), fmt(gameState.coins));
  const cap = canCapacity();
  const w = Math.round(gameState.waterCan);
  setText($('#water-amount'), w + '');
  const wf = $('#water-fill');
  if (wf) wf.style.width = Math.round(w / cap * 100) + '%';
  $('#water-display').classList.toggle('low', w < 20);
  setText($('#level-num'), gameState.level + '');
  setText($('#level-title'), levelTitle(gameState.level));
  const need = xpForLevel(gameState.level);
  $('#xp-fill').style.width = Math.round(gameState.xp / need * 100) + '%';
  setText($('#xp-text'), `${gameState.xp} / ${need} XP`);
}

function updateTimeHUD() {
  const night = nightFactor > 0.5;
  const w = currentWeather === 'rainy' ? '🌧️' : currentWeather === 'cloudy' ? '⛅' : night ? '🌙' : '☀️';
  setText($('#time-indicator'), w);
}

// ─── Hotbar: seeds you own + potions ───
function updateHotbar() {
  const bar = $('#hotbar');
  bar.innerHTML = '';
  selectNextSeed();
  const ids = Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0)
    .sort((a, b) => ((getSeedData(a).level || 1) - (getSeedData(b).level || 1)));
  ids.slice(0, 9).forEach((id, i) => {
    const s = getSeedData(id);
    if (!s) return;
    const slot = document.createElement('button');
    slot.className = 'hotbar-slot' + (id === gameState.selectedSeed ? ' selected' : '');
    slot.style.setProperty('--rar', (RARITY[s.rarity] || RARITY.common).color);
    slot.innerHTML = `<span class="slot-key">${i + 1}</span><span class="slot-emoji">${s.emoji}</span><span class="slot-count">${gameState.inventory[id]}</span><span class="slot-name">${s.name}</span>`;
    slot.addEventListener('click', e => { e.stopPropagation(); selectSeed(id); });
    bar.appendChild(slot);
  });
  if (ids.length === 0) {
    const empty = document.createElement('button');
    empty.className = 'hotbar-slot empty';
    empty.innerHTML = '<span class="slot-emoji">🛒</span><span class="slot-name">Buy seeds!</span>';
    empty.addEventListener('click', e => { e.stopPropagation(); openShop('seeds'); });
    bar.appendChild(empty);
  }
  if (gameState.potions > 0) {
    const p = document.createElement('button');
    p.className = 'hotbar-slot potion';
    p.innerHTML = `<span class="slot-key">F</span><span class="slot-emoji">🧪</span><span class="slot-count">${gameState.potions}</span><span class="slot-name">Grow Potion</span>`;
    p.addEventListener('click', e => { e.stopPropagation(); usePotionOnFocus(); });
    bar.appendChild(p);
  }
  $('#touch-potion').style.display = gameState.potions > 0 ? '' : 'none';
}

function selectSeed(id) {
  if (!gameState.inventory[id]) return;
  gameState.selectedSeed = id;
  Sfx.play('click');
  updateHotbar();
}

function usePotionOnFocus() {
  if (focus && focus.kind === 'plot' && gameState.plots[focus.index] && !isReady(gameState.plots[focus.index])) useGrowPotion(focus.index);
  else showToast('🧪', 'Stand next to a growing plant to use a Grow Potion.');
}

// ─── Prompt + mobile action button ───
let lastFocusKey = '';
function updatePrompt() {
  const info = started && !isAnyPanelOpen() ? focusInfo(focus) : null;
  const prompt = $('#interact-prompt');
  const key = info ? info.text + info.icon + (info.dim ? 1 : 0) : '';
  if (key !== lastFocusKey) {
    lastFocusKey = key;
    if (info) {
      const k = isMobile ? '' : `<span class="key">E</span>`;
      setHTML(prompt, `${k}<span class="p-icon">${info.icon}</span><span class="p-text">${info.text}</span>`);
      prompt.classList.add('visible');
      prompt.classList.toggle('dim', !!info.dim);
    } else prompt.classList.remove('visible');
    const btn = $('#touch-interact');
    setHTML(btn, info ? `<span>${info.icon}</span><small>${info.act}</small>` : '<span>✋</span>');
    btn.classList.toggle('active', !!info && !info.dim);
  }
  // Plot highlight
  if (focus && focus.kind === 'plot') {
    const p = getPlotWorldPos(focus.index);
    highlight.visible = true;
    highlight.position.set(p.x, 0.42, p.z);
    const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.03;
    highlight.scale.set(s, 1, s);
  } else highlight.visible = false;
}

// ─── Tasks panel ───
function renderTasks() {
  const list = $('#tasks-list');
  if (!list) return;
  list.innerHTML = '';
  gameState.tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'task' + (t.done ? ' done' : '') + (t.tutorial ? ' tutorial' : '');
    const pct = Math.round(t.progress / t.goal * 100);
    row.innerHTML = `
      <span class="task-icon">${t.done ? '✅' : t.icon}</span>
      <div class="task-body">
        <div class="task-text">${t.text}</div>
        <div class="task-bar"><div style="width:${pct}%"></div></div>
      </div>
      <span class="task-reward">${t.goal > 1 ? `${t.progress}/${t.goal}<br>` : ''}🪙${t.reward}</span>`;
    list.appendChild(row);
  });
  $('#tasks-title').textContent = gameState.tutorialStep < TUTORIAL_TASKS.length ? `🎓 Learn to garden (${gameState.tutorialStep + 1}/${TUTORIAL_TASKS.length})` : '📋 Garden Tasks';
}

// ─── Panels ───
const PANEL_IDS = ['shop-panel', 'bag-panel', 'wardrobe-panel', 'achieve-panel', 'help-panel', 'gift-panel'];
function isAnyPanelOpen() { return PANEL_IDS.some(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); }); }
function closeAllPanels() { PANEL_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }); }
function openPanel(id) {
  closeAllPanels();
  $('#' + id).classList.remove('hidden');
  keys.f = keys.b = keys.l = keys.r = false;
  moveTarget = null;
  Sfx.play('click');
}
function togglePanel(id, opener) {
  if (!$('#' + id).classList.contains('hidden')) { closeAllPanels(); return; }
  opener();
}

// ─── Shop: seeds / upgrades / sell ───
let shopTab = 'seeds';
function openShop(tab) {
  if (tab) shopTab = tab;
  renderShop();
  openPanel('shop-panel');
}

function renderShop() {
  document.querySelectorAll('#shop-tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === shopTab));
  const body = $('#shop-body');
  body.innerHTML = '';
  if (shopTab === 'seeds') renderSeedShop(body);
  else if (shopTab === 'upgrades') renderUpgradeShop(body);
  else renderSellShop(body);
}

function seedCard(id, seed) {
  const locked = (seed.level || 1) > gameState.level;
  const rar = RARITY[seed.rarity] || RARITY.common;
  const owned = gameState.inventory[id] || 0;
  const card = document.createElement('div');
  card.className = 'card' + (locked ? ' locked' : '') + (seed.holiday ? ' seasonal' : '');
  card.style.setProperty('--rar', rar.color);
  card.innerHTML = `
    <div class="card-rarity">${rar.name}</div>
    <div class="card-emoji">${locked ? '🔒' : seed.emoji}</div>
    <div class="card-name">${seed.name}</div>
    ${seed.description ? `<div class="card-desc">${seed.description}</div>` : ''}
    <div class="card-stats">⏱ ${seed.growTime}s • sells 🪙${Math.round(seed.sellPrice * rar.mult)}${seed.regrow ? `<br>♻️ Harvest ${seed.regrow} times!` : ''}</div>
    ${owned ? `<div class="card-owned">You have ${owned}</div>` : ''}
    ${locked ? `<button class="btn" disabled>⭐ Level ${seed.level}</button>` :
      `<div class="btn-row"><button class="btn buy1" ${gameState.coins < seed.seedCost ? 'disabled' : ''}>🪙${seed.seedCost}</button><button class="btn alt buy5" ${gameState.coins < seed.seedCost * 5 ? 'disabled' : ''}>×5</button></div>`}`;
  if (!locked) {
    const buy = (n, btn) => {
      if (buySeed(id, n)) {
        const r = btn.getBoundingClientRect();
        floatTextScreen(r.left + r.width / 2, r.top, `+${n} ${seed.emoji}`);
        renderShop();
      }
    };
    card.querySelector('.buy1').addEventListener('click', e => buy(1, e.currentTarget));
    card.querySelector('.buy5').addEventListener('click', e => buy(5, e.currentTarget));
  }
  return card;
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

function renderSeedShop(body) {
  const seasonal = getSeasonalSeeds();
  if (Object.keys(seasonal).length) {
    const h = document.createElement('div');
    h.className = 'section-title seasonal';
    h.innerHTML = `${getActiveHolidayLabels().join(' ')} <span class="tag">Limited time!</span>`;
    body.appendChild(h);
    const g = document.createElement('div'); g.className = 'card-grid';
    Object.entries(seasonal).forEach(([id, s]) => g.appendChild(seedCard(id, s)));
    body.appendChild(g);
  }
  const h = document.createElement('div');
  h.className = 'section-title';
  h.textContent = '🌱 Seeds';
  body.appendChild(h);
  const g = document.createElement('div'); g.className = 'card-grid';
  SEED_LIST.forEach(id => g.appendChild(seedCard(id, SEEDS[id])));
  body.appendChild(g);
}

function renderUpgradeShop(body) {
  const g = document.createElement('div'); g.className = 'card-grid';
  const items = Object.entries(UPGRADES).map(([id, u]) => ({ id, ...u, owned: !!gameState.upgrades[id] }));
  items.unshift({ id: 'potion', ...POTION, owned: false });
  items.forEach(u => {
    const locked = u.level > gameState.level;
    const card = document.createElement('div');
    card.className = 'card' + (locked ? ' locked' : '') + (u.owned ? ' owned' : '');
    card.style.setProperty('--rar', '#FFD54F');
    let btn;
    if (u.owned) btn = '<button class="btn" disabled>✅ Owned</button>';
    else if (locked) btn = `<button class="btn" disabled>⭐ Level ${u.level}</button>`;
    else btn = `<button class="btn buy" ${gameState.coins < u.cost ? 'disabled' : ''}>🪙${fmt(u.cost)}</button>`;
    card.innerHTML = `
      <div class="card-emoji">${locked ? '🔒' : u.emoji}</div>
      <div class="card-name">${u.name}</div>
      <div class="card-desc">${u.desc}</div>
      ${u.id === 'potion' ? `<div class="card-owned">You have ${gameState.potions}</div>` : ''}
      ${btn}`;
    const b = card.querySelector('.buy');
    if (b) b.addEventListener('click', () => { u.id === 'potion' ? buyPotion() : buyUpgrade(u.id); renderShop(); });
    g.appendChild(card);
  });
  body.appendChild(g);
}

function renderSellShop(body) {
  const keysList = Object.keys(gameState.harvested).filter(k => gameState.harvested[k] > 0);
  const hot = getSeedData(hotSeedId());
  const banner = document.createElement('div');
  banner.className = 'hot-banner';
  banner.innerHTML = `🔥 Today Shlomo pays <b>1.5x</b> for ${hot.emoji} <b>${hot.name}</b>!`;
  body.appendChild(banner);
  if (keysList.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.innerHTML = 'Nothing to sell yet!<br>Grow plants, harvest them 🧺, then bring them here.';
    body.appendChild(p);
    return;
  }
  let total = 0, count = 0;
  keysList.forEach(k => { total += cropPrice(k) * gameState.harvested[k]; count += gameState.harvested[k]; });
  const all = document.createElement('button');
  all.className = 'btn big sell-all';
  all.innerHTML = `💰 Sell everything (${count}) for 🪙${fmt(total)}`;
  all.addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    const res = sellAll();
    Sfx.play('coin');
    coinFly(r.left + r.width / 2, r.top, 8);
    showToast('💰', `Sold ${res.count} crops for 🪙${fmt(res.total)}!`);
    renderShop(); updateHotbar(); saveGame();
  });
  body.appendChild(all);
  const g = document.createElement('div'); g.className = 'card-grid';
  keysList.sort((a, b) => cropPrice(b) - cropPrice(a)).forEach(k => {
    const { seedId, mutation } = parseCrop(k);
    const s = getSeedData(seedId);
    if (!s) return;
    const n = gameState.harvested[k];
    const price = cropPrice(k);
    const rar = RARITY[s.rarity] || RARITY.common;
    const card = document.createElement('div');
    card.className = 'card' + (mutation ? ' mutated mut-' + mutation : '');
    card.style.setProperty('--rar', mutation ? MUTATIONS[mutation].color : rar.color);
    card.innerHTML = `
      ${mutation ? `<div class="card-rarity">${MUTATIONS[mutation].emoji} ${MUTATIONS[mutation].name} ×${MUTATIONS[mutation].mult}</div>` : `<div class="card-rarity">${rar.name}</div>`}
      <div class="card-emoji">${s.emoji}</div>
      <div class="card-name">${s.name}${seedId === hot.id ? ' 🔥' : ''}</div>
      <div class="card-owned">You have ${n}</div>
      <div class="btn-row"><button class="btn sell1">Sell 1<br>🪙${price}</button>${n > 1 ? `<button class="btn alt sellall">All<br>🪙${fmt(price * n)}</button>` : ''}</div>`;
    const doSell = (cnt, btn) => {
      const r = btn.getBoundingClientRect();
      const got = sellCrops(k, cnt);
      Sfx.play('coin');
      coinFly(r.left + r.width / 2, r.top, Math.min(8, 2 + cnt));
      floatTextScreen(r.left + r.width / 2, r.top, `+🪙${got}`);
      renderShop(); updateHotbar(); saveGame();
    };
    card.querySelector('.sell1').addEventListener('click', e => doSell(1, e.currentTarget));
    const sa = card.querySelector('.sellall');
    if (sa) sa.addEventListener('click', e => doSell(n, e.currentTarget));
    g.appendChild(card);
  });
  body.appendChild(g);
}

// ─── Bag (inventory) ───
function openBag() {
  const body = $('#bag-body');
  body.innerHTML = '';
  const section = (title, items) => {
    const h = document.createElement('div'); h.className = 'section-title'; h.textContent = title; body.appendChild(h);
    if (!items.length) { const p = document.createElement('p'); p.className = 'empty-msg'; p.textContent = 'Nothing here yet.'; body.appendChild(p); return; }
    const g = document.createElement('div'); g.className = 'bag-grid';
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'bag-item' + (it.selected ? ' selected' : '');
      d.style.setProperty('--rar', it.color || '#B0BEC5');
      d.innerHTML = `<div class="bag-emoji">${it.emoji}</div><div class="bag-name">${it.name}</div><div class="bag-count">×${it.count}</div>`;
      if (it.onClick) d.addEventListener('click', it.onClick);
      g.appendChild(d);
    });
    body.appendChild(g);
  };
  section('🌱 Seeds (tap to choose what to plant)', Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0).map(id => {
    const s = getSeedData(id);
    return { emoji: s.emoji, name: s.name, count: gameState.inventory[id], color: (RARITY[s.rarity] || RARITY.common).color, selected: id === gameState.selectedSeed, onClick: () => { selectSeed(id); openBag(); } };
  }));
  section('🧺 Crops (sell them to Shlomo)', Object.keys(gameState.harvested).filter(k => gameState.harvested[k] > 0).map(k => {
    const { seedId, mutation } = parseCrop(k);
    const s = getSeedData(seedId);
    return { emoji: (mutation ? MUTATIONS[mutation].emoji : '') + s.emoji, name: cropName(k), count: gameState.harvested[k], color: mutation ? MUTATIONS[mutation].color : (RARITY[s.rarity] || RARITY.common).color };
  }));
  const items = [];
  if (gameState.potions) items.push({ emoji: '🧪', name: 'Grow Potion', count: gameState.potions, color: '#EA80FC' });
  Object.keys(gameState.upgrades).forEach(id => { if (UPGRADES[id]) items.push({ emoji: UPGRADES[id].emoji, name: UPGRADES[id].name, count: 1, color: '#FFD54F' }); });
  section('🎒 Items', items);
  openPanel('bag-panel');
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
    else btn = `<button class="btn buy" ${gameState.coins < skin.cost ? 'disabled' : ''}>🪙${fmt(skin.cost)}</button>`;
    card.innerHTML = `<div class="card-emoji">${skin.emoji}</div><div class="card-name">${skin.name}</div>${btn}`;
    const wear = card.querySelector('.wear');
    if (wear) wear.addEventListener('click', () => { equipSkin(key); openWardrobe(); });
    const buy = card.querySelector('.buy');
    if (buy) buy.addEventListener('click', () => {
      if (gameState.coins < skin.cost) return;
      gameState.coins -= skin.cost;
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
  const got = gameState.achievements;
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
  const coins = 30 + Math.min(streak, 7) * 15 + gameState.level * 5;
  const seeds = unlockedSeedIds();
  const seedId = seeds[Math.floor(Math.random() * seeds.length)];
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
    addCoins(coins);
    gameState.inventory[seedId] = (gameState.inventory[seedId] || 0) + 3;
    if (streak >= 3) gameState.potions++;
    const s = getSeedData(seedId);
    Sfx.play('gift');
    confetti(60);
    this.classList.add('opened');
    this.textContent = '✨';
    body.querySelector('.gift-text').innerHTML = `You got <b>🪙${coins}</b> and <b>3 ${s.emoji} ${s.name}</b> seeds${streak >= 3 ? ' and a <b>🧪 Grow Potion</b>' : ''}!<br><button class="btn big" id="gift-ok">Yay! 🎉</button>`;
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

// ════════════════════════════════════════════
//  PROFILES + SAVE / LOAD
// ════════════════════════════════════════════
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
    const lvl = save ? (save.level || 1) : 1;
    const card = document.createElement('button');
    card.className = 'profile-card';
    card.innerHTML = `<span class="profile-avatar">${p.avatar}</span><span class="profile-name">${p.name}</span><span class="profile-level">⭐ Lv ${lvl}${save ? ` • 🪙${fmt(save.coins || 0)}` : ''}</span>`;
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

function saveGame() {
  if (!activeProfileId) return;
  try {
    const data = Object.assign({}, gameState, { savedAt: Date.now(), version: 2 });
    localStorage.setItem(getSaveKey(), JSON.stringify(data));
  } catch (e) { /* storage full / private mode */ }
}

function loadGame() {
  gameState = freshState();
  const data = readSave(activeProfileId);
  if (!data) return false;
  const now = Date.now();
  const savedAt = data.savedAt || now;
  Object.keys(gameState).forEach(k => { if (data[k] !== undefined && data[k] !== null) gameState[k] = data[k]; });
  if (typeof gameState.coins !== 'number') gameState.coins = 100;
  if (!gameState.inventory || typeof gameState.inventory !== 'object') gameState.inventory = {};
  if (!gameState.harvested || typeof gameState.harvested !== 'object') gameState.harvested = {};
  if (!Array.isArray(gameState.unlockedPlots)) gameState.unlockedPlots = [];
  if (!gameState.upgrades || typeof gameState.upgrades !== 'object') gameState.upgrades = {};
  if (!Array.isArray(gameState.tasks)) gameState.tasks = [];
  gameState.tasks = gameState.tasks.filter(t => t && !t.done);
  if (!Array.isArray(gameState.achievements)) gameState.achievements = [];
  if (!Array.isArray(gameState.harvestedTypes)) gameState.harvestedTypes = [];
  if (!Array.isArray(gameState.unlockedSkins)) gameState.unlockedSkins = ['farmer'];

  // v1 → v2: give existing players XP for what they already grew, and skip the tutorial
  if (!data.version) {
    gameState.level = 1;
    gameState.xp = 0;
    gameState.tutorialStep = (data.totalHarvested || 0) > 0 ? TUTORIAL_TASKS.length : 0;
    addXPSilently((data.totalHarvested || 0) * 12);
    if (data.selectedSlot != null) {
      const ids = Object.keys(gameState.inventory).filter(k => gameState.inventory[k] > 0);
      gameState.selectedSeed = ids[data.selectedSlot] || ids[0] || null;
    }
  }

  // Plots: pad to 36 and convert old timestamp-based plots to "seconds grown"
  const plots = Array.isArray(data.plots) ? data.plots.slice(0, TOTAL_PLOTS) : [];
  while (plots.length < TOTAL_PLOTS) plots.push(null);
  const offline = Math.min(Math.max(0, (now - savedAt) / 1000), 3 * 86400);
  gameState.plots = plots.map(p => {
    if (!p || !getSeedData(p.seedId)) return null;
    const seed = getSeedData(p.seedId);
    const plot = {
      seedId: p.seedId,
      growTime: p.growTime || seed.growTime,
      waterLevel: p.waterLevel != null ? p.waterLevel : 100,
      mutation: p.mutation || null,
      wet: !!p.wet,
      harvests: p.harvests || 0,
      grown: p.grown,
    };
    if (plot.grown == null) {
      // old format: plantedAt timestamp + paused seconds
      plot.grown = Math.max(0, (savedAt - (p.plantedAt || savedAt)) / 1000 - (p.pausedGrowthTime || 0));
    }
    plot.grown = Math.min(plot.growTime, plot.grown + offline); // plants keep growing while you're away
    return plot;
  });
  return true;
}

function addXPSilently(n) {
  gameState.xp += n;
  while (gameState.xp >= xpForLevel(gameState.level)) { gameState.xp -= xpForLevel(gameState.level); gameState.level++; }
}

// ════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plotPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);
const hitPt = new THREE.Vector3();
const hitSphere = new THREE.Sphere();
const sphereCenter = new THREE.Vector3();

// Tap / click on the world: walk there and do the obvious thing
function handleTap(cx, cy) {
  if (!started || isAnyPanelOpen()) return;
  ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const npcs = [
    { kind: 'dog', c: [dogPos.x, 0.6, dogPos.z], r: 0.9, to: () => ({ x: dogPos.x, z: dogPos.z, reach: 1.6 }) },
    { kind: 'shop', c: [SHOP_POS.x + 0.3, 1.3, SHOP_POS.z], r: 2.0, to: () => ({ x: SHOP_POS.x + 2.6, z: SHOP_POS.z, reach: 1.2 }) },
    { kind: 'well', c: [WELL_POS.x, 1.2, WELL_POS.z], r: 1.5, to: () => ({ x: WELL_POS.x - 2, z: WELL_POS.z, reach: 1.0 }) },
  ];
  for (const n of npcs) {
    hitSphere.set(sphereCenter.set(n.c[0], n.c[1], n.c[2]), n.r);
    if (raycaster.ray.intersectsSphere(hitSphere)) {
      const t = n.to();
      walkTo(t.x, t.z, t.reach, () => interact({ kind: n.kind }));
      return;
    }
  }
  if (!raycaster.ray.intersectPlane(plotPlane, hitPt)) return;
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const p = getPlotWorldPos(i);
    if (Math.abs(hitPt.x - p.x) < 1.2 && Math.abs(hitPt.z - p.z) < 1.2) {
      walkTo(p.x, p.z, 1.7, () => { playerFacing = Math.atan2(p.x - playerPos.x, p.z - playerPos.z); interact({ kind: 'plot', index: i }); });
      return;
    }
  }
  spawnParticles(hitPt.x, 0.1, hitPt.z, 0xffffff, 6, 1.5, 0.07, { flat: true, up: 1, life: 0.4 });
  walkTo(hitPt.x, hitPt.z, 0.3, null);
}

function walkTo(x, z, reach, action) {
  const d = Math.hypot(x - playerPos.x, z - playerPos.z);
  if (d <= reach) { if (action) action(); return; }
  moveTarget = { x, z, reach, action, far: d > 10 };
}

function bindInput() {
  const canvas = renderer.domElement;
  const pointers = new Map();
  let dragDist = 0, pinchStart = 0, pinchCam = camDist;

  canvas.addEventListener('pointerdown', e => {
    Sfx.unlock();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    dragDist = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      pinchCam = camDist;
    }
  });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (!p || !started) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    dragDist += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart > 0) camDist = clamp(pinchCam * pinchStart / d, CAM_MIN, CAM_MAX);
      return;
    }
    const sens = e.pointerType === 'touch' ? 0.006 : 0.005;
    yaw -= dx * sens;
    pitch = clamp(pitch + dy * sens, -0.1, 1.2);
  });
  const end = e => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (p && dragDist < 8 && e.type === 'pointerup' && pointers.size === 0) handleTap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => { e.preventDefault(); camDist = clamp(camDist + e.deltaY * 0.01, CAM_MIN, CAM_MAX); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    Sfx.unlock();
    if (!started) return;
    const panelOpen = isAnyPanelOpen();
    switch (e.code) {
      case 'Escape': closeAllPanels(); return;
      case 'KeyB': togglePanel('shop-panel', () => openShop()); return;
      case 'KeyI': case 'Tab': e.preventDefault(); togglePanel('bag-panel', openBag); return;
      case 'KeyJ': togglePanel('achieve-panel', openAchievements); return;
      case 'KeyH': togglePanel('help-panel', openHelp); return;
      case 'KeyM': Sfx.toggle('music'); refreshSoundButtons(); return;
    }
    if (panelOpen) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.f = true; break;
      case 'KeyS': case 'ArrowDown': keys.b = true; break;
      case 'KeyA': case 'ArrowLeft': keys.l = true; break;
      case 'KeyD': case 'ArrowRight': keys.r = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.run = true; break;
      case 'Space': e.preventDefault(); jump(); break;
      case 'KeyE': case 'Enter': if (!e.repeat) interact(); break;
      case 'KeyQ':
        if (focus && focus.kind === 'plot' && gameState.plots[focus.index]) waterPlot(focus.index);
        else if (focus && focus.kind === 'well') refillWaterCan();
        break;
      case 'KeyF': usePotionOnFocus(); break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          const ids = Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0)
            .sort((a, b) => ((getSeedData(a).level || 1) - (getSeedData(b).level || 1)));
          const id = ids[parseInt(e.code.slice(5), 10) - 1];
          if (id) selectSeed(id);
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

  // ─── Touch joystick ───
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
  const stickEnd = e => {
    if (e.pointerId !== stickId) return;
    stickId = null; touchMove.x = touchMove.y = 0;
    stick.style.transform = 'translate(-50%, -50%)';
  };
  base.addEventListener('pointerup', stickEnd);
  base.addEventListener('pointercancel', stickEnd);

  const tap = (sel, fn) => $(sel).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sfx.unlock(); fn(); });
  tap('#touch-jump', jump);
  tap('#touch-interact', () => interact());
  tap('#touch-water', () => {
    if (focus && focus.kind === 'plot' && gameState.plots[focus.index]) waterPlot(focus.index);
    else if (focus && focus.kind === 'well') refillWaterCan();
    else showToast('💧', 'Walk up to a plant to water it!');
  });
  tap('#touch-potion', usePotionOnFocus);
}

function bindUI() {
  const on = (sel, fn) => $(sel).addEventListener('click', e => { e.stopPropagation(); Sfx.unlock(); fn(); });
  on('#shop-btn', () => togglePanel('shop-panel', () => openShop()));
  on('#sell-btn', () => togglePanel('shop-panel', () => openShop('sell')));
  on('#bag-btn', () => togglePanel('bag-panel', openBag));
  on('#achieve-btn', () => togglePanel('achieve-panel', openAchievements));
  on('#wardrobe-btn', () => togglePanel('wardrobe-panel', openWardrobe));
  on('#help-btn', () => togglePanel('help-panel', openHelp));
  on('#sfx-btn', () => { Sfx.toggle('sfx'); refreshSoundButtons(); Sfx.play('click'); });
  on('#music-btn', () => { Sfx.toggle('music'); refreshSoundButtons(); });
  on('#switch-profile-btn', switchProfile);
  on('#tasks-title', () => $('#tasks').classList.toggle('collapsed'));
  document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => { closeAllPanels(); Sfx.play('click'); }));
  PANEL_IDS.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('click', e => { if (e.target === el && id !== 'gift-panel') closeAllPanels(); });
  });
  document.querySelectorAll('#shop-tabs .tab').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.tab; Sfx.play('click'); renderShop(); }));
  if (isMobile) document.body.classList.add('touch');
}

// ════════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════════
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;

  if (started) {
    updatePlayer(dt);
    focus = computeFocus();
    updateGarden(dt);
    updateWeather(dt);
    updateGuide(time, dt);
    autoSaveTimer += dt;
    if (autoSaveTimer >= AUTO_SAVE_SEC) { autoSaveTimer = 0; saveGame(); }
  }
  updateCamera(dt, time);
  updateDayNight(dt);
  updateDog(dt, time);
  updateShlomo(time, focus && focus.kind === 'shop');
  updateDucks(time);
  updateCritters(time);
  updateRain(dt);
  updateParticles(dt);
  animatePlots(time, dt);
  clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 90) c.position.x = -90; });
  MATS.pond.map.offset.x = time * 0.03;
  MATS.water.map.offset.y = time * 0.02;
  if (sprinklerModel) {
    sprinklerModel.rotation.y = time * 2;
    if (Math.random() < dt * 25) {
      const a = time * 2 + Math.random() * 0.3;
      spawnParticles(Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3, 0x81D4FA, 1, 0, 0.06, { up: 3, life: 1.2, grav: 6 });
      const p = particles[particleCursor];
      p.vx = Math.cos(a) * 4; p.vz = Math.sin(a) * 4;
    }
  }
  if (started) { updatePrompt(); updateTimeHUD(); }
  adaptQuality(dt);
  renderer.render(scene, camera);
}

// Start (or restart) play for the selected profile
function startProfile() {
  const loaded = loadGame();
  playerPos.set(0, 0, 13); playerVel.set(0, 0, 0);
  playerY = 0; playerVY = 0; onGround = true; playerFacing = Math.PI;
  yaw = 0; pitch = 0.4; camDist = isMobile ? 10 : 9;
  camPos.set(0, 6, 22);
  dogPos.set(3, 0, 12);
  moveTarget = null; focus = null;
  dayTime = 0.3; currentWeather = 'sunny'; weatherTimer = 90 + Math.random() * 60;
  if (sprinklerModel) { scene.remove(sprinklerModel); sprinklerModel = null; }
  buildSprinkler();
  buildPlayerModel();
  plotViews.forEach(v => { if (v.plant) { v.group.remove(v.plant); v.plant.geometry.dispose(); v.plant = null; } v.key = ''; v.iconEmoji = ''; });
  rebuildPlotFrames();
  refreshAllPlots();
  selectNextSeed();
  fillTasks();
  updateHUD(); updateHotbar(); refreshSoundButtons();
  started = true;
  document.body.classList.add('playing');
  lastFocusKey = '?';

  if (loaded) {
    const ready = gameState.plots.filter(p => p && isReady(p)).length;
    if (ready) showToast('🌅', `Welcome back! ${ready} plant${ready > 1 ? 's are' : ' is'} ready to harvest!`);
    setTimeout(maybeDailyGift, 900);
  } else {
    gameState.lastDaily = todayStr();
    gameState.dailyStreak = 1;
    setTimeout(() => showToast('👋', 'Hi! Follow the pointing hand 👇 to plant your first seed.'), 600);
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
  buildShop();
  buildWell();
  buildDog();
  buildDucks();
  buildCritters();
  buildRain();
  buildParticles();
  buildHighlight();
  buildGardenPlots();
  bindInput();
  bindUI();
  showProfileScreen();
  animate();
}

// Small hook for automated testing / debugging from the console
window.__garden = {
  get state() { return gameState; },
  plotScreen(i) { const p = getPlotWorldPos(i); return worldToScreen(p.x, 0.4, p.z); },
  fastForward(sec) { for (let t = 0; t < sec; t += 0.5) updateGarden(0.5); refreshAllPlots(); },
  get focus() { return focus; },
  setTime(t) { dayTime = t; },
  setSkin(k) { equipSkin(k); },
  view(x, z, d, p, y) { playerPos.set(x, 0, z); camDist = d; pitch = p; yaw = y || 0; },
  setWeather(w) { currentWeather = w; weatherTimer = 999; },
  get player() { return { x: playerPos.x, z: playerPos.z, target: moveTarget && { x: moveTarget.x, z: moveTarget.z } }; },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
