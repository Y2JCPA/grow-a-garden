/* ============================================
   GROW A GARDEN 3D — Main Game (Three.js)
   ============================================ */
(function() {
'use strict';

// ─── Constants ───
const WORLD_SIZE = 32;
const PLOT_GRID = 4;       // 4x4 garden plots
const PLOT_SIZE = 2;       // each plot is 2x2 blocks
const PLOT_GAP = 1;        // gap between plots
const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 7;
const GRAVITY = 18;
const INTERACT_DIST = 5;
const CAM_DISTANCE = 6;      // distance behind player
const CAM_HEIGHT_OFFSET = 3; // height above player
const PROFILES_KEY = 'garden3d_profiles';
const SAVE_PREFIX = 'garden3d_save_';
const MAX_PROFILES = 10;
const AUTO_SAVE_SEC = 30;
let activeProfileId = null;
function getSaveKey() { return SAVE_PREFIX + activeProfileId; }

// ─── Game State ───
let gameState = {
  coins: 100,
  inventory: { daisy: 3, sunflower: 2 },
  plots: [],       // {seedId, plantedAt, growTime, stage, harvested}
  selectedSlot: 0,
};

// ─── Three.js globals ───
let scene, camera, renderer, clock;
let playerVelocity = new THREE.Vector3();
let playerOnGround = true;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, jumping = false;
let isPointerLocked = false;
let yaw = 0, pitch = 0;
let raycaster, interactTarget = null;
let plotMeshes = [];      // {group, plotIndex, soilMesh, plantMesh, stage}
let cloudMeshes = [];
let particlePool = [];
let playerModel = null;  // third-person blocky character
let shopkeeperModel = null; // Shlomo the seed seller
const SHOPKEEPER_POS = { x: -10, z: -2 }; // off to the left of the garden
const SHOPKEEPER_INTERACT_DIST = 4;
let nearShopkeeper = false;
let started = false;
let autoSaveTimer = 0;
let touchMoveVec = {x: 0, y: 0};
let isMobile = false;

// ─── DOM refs ───
const $ = sel => document.querySelector(sel);
const coinAmountEl = $('#coin-amount');
const interactPromptEl = $('#interact-prompt');
const plotLabelEl = $('#plot-label');
const hotbarEl = $('#hotbar');
const toastContainer = $('#toast-container');
const startScreen = $('#start-screen');
const startBtn = $('#start-btn');

// ─── Utility ───
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function showToast(icon, text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${text}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => { t.classList.add('exiting'); setTimeout(() => t.remove(), 300); }, 2500);
}

function spawnParticles(screenX, screenY, emoji, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'harvest-particle';
    p.textContent = emoji;
    const angle = (Math.PI * 2 * i) / count;
    const dist = 40 + Math.random() * 60;
    p.style.left = screenX + 'px';
    p.style.top = screenY + 'px';
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', (Math.sin(angle) * dist - 30) + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function spawnCoinFly() {
  const rect = coinAmountEl.getBoundingClientRect();
  const c = document.createElement('span');
  c.className = 'coin-fly';
  c.textContent = '🪙';
  c.style.left = (rect.left + rect.width/2) + 'px';
  c.style.top = rect.top + 'px';
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 700);
}

// ─── Init Plots State ───
function initPlots() {
  gameState.plots = [];
  for (let i = 0; i < PLOT_GRID * PLOT_GRID; i++) {
    gameState.plots.push(null); // null = empty
  }
}

// ─── Plot world positions ───
function getPlotWorldPos(index) {
  const row = Math.floor(index / PLOT_GRID);
  const col = index % PLOT_GRID;
  const totalSpan = PLOT_GRID * PLOT_SIZE + (PLOT_GRID - 1) * PLOT_GAP;
  const startX = -totalSpan / 2 + PLOT_SIZE / 2;
  const startZ = -totalSpan / 2 + PLOT_SIZE / 2;
  return {
    x: startX + col * (PLOT_SIZE + PLOT_GAP),
    z: startZ + row * (PLOT_SIZE + PLOT_GAP),
  };
}

// ─── Three.js Scene Setup ───
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 30, 60);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, PLAYER_HEIGHT + CAM_HEIGHT_OFFSET, CAM_DISTANCE);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  raycaster.far = INTERACT_DIST;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ─── Lighting ───
function initLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4cc, 1.2);
  sun.position.set(10, 20, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.3);
  scene.add(hemi);
}

// ─── World Building ───
function buildWorld() {
  // Ground plane (large grass area)
  const grassGeo = new THREE.BoxGeometry(WORLD_SIZE, 0.5, WORLD_SIZE);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
  const ground = new THREE.Mesh(grassGeo, grassMat);
  ground.position.set(0, -0.25, 0);
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  // Darker green top detail patches
  for (let i = 0; i < 40; i++) {
    const patchGeo = new THREE.BoxGeometry(1 + Math.random() * 3, 0.05, 1 + Math.random() * 3);
    const patchMat = new THREE.MeshLambertMaterial({ color: Math.random() > 0.5 ? 0x388E3C : 0x66BB6A });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(
      (Math.random() - 0.5) * WORLD_SIZE * 0.9,
      0.01,
      (Math.random() - 0.5) * WORLD_SIZE * 0.9
    );
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // Garden area border (fence)
  const gardenSpan = PLOT_GRID * PLOT_SIZE + (PLOT_GRID - 1) * PLOT_GAP + 2;
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
  const fenceHeight = 1;
  const fenceThick = 0.2;
  const half = gardenSpan / 2;

  // Fence posts and rails
  const postGeo = new THREE.BoxGeometry(0.3, fenceHeight, 0.3);
  const railGeo = new THREE.BoxGeometry(fenceThick, 0.15, gardenSpan + 0.3);
  const railGeoX = new THREE.BoxGeometry(gardenSpan + 0.3, 0.15, fenceThick);

  // Posts at corners and midpoints
  const postPositions = [];
  for (let i = 0; i <= PLOT_GRID; i++) {
    const t = -half + i * (gardenSpan / PLOT_GRID);
    postPositions.push([t, -half], [t, half], [-half, t], [half, t]);
  }
  const seen = new Set();
  postPositions.forEach(([x, z]) => {
    const key = `${x.toFixed(1)}_${z.toFixed(1)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(x, fenceHeight / 2, z);
    post.castShadow = true;
    scene.add(post);
  });

  // Rails on each side
  [[-half, 0], [half, 0]].forEach(([x]) => {
    for (let h = 0.3; h <= 0.8; h += 0.5) {
      const rail = new THREE.Mesh(railGeo, fenceMat);
      rail.position.set(x, h, 0);
      rail.castShadow = true;
      scene.add(rail);
    }
  });
  [[0, -half], [0, half]].forEach(([, z]) => {
    for (let h = 0.3; h <= 0.8; h += 0.5) {
      const rail = new THREE.Mesh(railGeoX, fenceMat);
      rail.position.set(0, h, z);
      rail.castShadow = true;
      scene.add(rail);
    }
  });

  // Clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 12; i++) {
    const cg = new THREE.Group();
    const numBlocks = 3 + Math.floor(Math.random() * 4);
    for (let b = 0; b < numBlocks; b++) {
      const w = 1.5 + Math.random() * 2;
      const h = 0.6 + Math.random() * 0.5;
      const d = 1.5 + Math.random() * 2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloudMat);
      block.position.set(b * 1.2 - numBlocks * 0.6, Math.random() * 0.3, Math.random() * 0.5);
      cg.add(block);
    }
    cg.position.set(
      (Math.random() - 0.5) * 50,
      14 + Math.random() * 6,
      (Math.random() - 0.5) * 50
    );
    scene.add(cg);
    cloudMeshes.push(cg);
  }

  // Decorative trees/bushes outside garden
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const dist = 12 + Math.random() * 3;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), trunkMat);
    trunk.position.set(tx, 1, tz);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), leavesMat);
    leaves.position.set(tx, 3, tz);
    leaves.castShadow = true;
    scene.add(leaves);

    if (Math.random() > 0.5) {
      const leaves2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), leavesMat);
      leaves2.position.set(tx + 0.5, 3.8, tz + 0.3);
      scene.add(leaves2);
    }
  }
}

// ─── Player Character Model (blocky Minecraft-style) ───
function buildPlayerModel() {
  if (playerModel) scene.remove(playerModel);
  playerModel = new THREE.Group();

  const skinColor = 0xD2A87A;
  const shirtColor = 0x4CAF50;
  const pantsColor = 0x5D4037;
  const shoeColor = 0x333333;
  const hatColor = 0x8B4513;

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: skinColor })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  playerModel.add(head);

  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
  eyeL.position.set(-0.12, 1.6, -0.25);
  playerModel.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
  eyeR.position.set(0.12, 1.6, -0.25);
  playerModel.add(eyeR);

  // Hat (farmer's hat)
  const hatBrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.06, 0.8),
    new THREE.MeshLambertMaterial({ color: hatColor })
  );
  hatBrim.position.y = 1.82;
  hatBrim.castShadow = true;
  playerModel.add(hatBrim);
  const hatTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.25, 0.45),
    new THREE.MeshLambertMaterial({ color: hatColor })
  );
  hatTop.position.y = 1.95;
  hatTop.castShadow = true;
  playerModel.add(hatTop);

  // Body (shirt)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshLambertMaterial({ color: shirtColor })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  playerModel.add(body);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
  const armMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, 1.0, 0);
  armL.castShadow = true;
  playerModel.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, 1.0, 0);
  armR.castShadow = true;
  playerModel.add(armR);

  // Hands (skin)
  const handGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
  const handMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.35, 0.66, 0);
  playerModel.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(0.35, 0.66, 0);
  playerModel.add(handR);

  // Legs (pants)
  const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
  const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.45, 0);
  legL.castShadow = true;
  playerModel.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.13, 0.45, 0);
  legR.castShadow = true;
  playerModel.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.1, 0.32);
  const shoeMat = new THREE.MeshLambertMaterial({ color: shoeColor });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.13, 0.15, -0.03);
  playerModel.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.13, 0.15, -0.03);
  playerModel.add(shoeR);

  // Store refs for animation
  playerModel.userData = { armL, armR, legL, legR };

  playerModel.position.set(0, 0, 0);
  scene.add(playerModel);
}

// ─── Shopkeeper NPC: Shlomo ───
function buildShopkeeper() {
  if (shopkeeperModel) scene.remove(shopkeeperModel);
  shopkeeperModel = new THREE.Group();

  const skinColor = 0xC8956C;
  const apronColor = 0xD32F2F;  // red apron
  const shirtColor = 0xFFF9C4;  // cream shirt
  const pantsColor = 0x37474F;
  const hatColor = 0x4E342E;
  const standWood = 0x8D6E63;
  const standTop = 0x5D4037;
  const canopyColor = 0xC62828;
  const canopyStripe = 0xEF9A9A;

  // ── Stand / Market stall ──
  // Counter
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.15, 1.2),
    new THREE.MeshLambertMaterial({ color: standTop })
  );
  counter.position.set(0, 1.0, -1.2);
  counter.castShadow = true;
  shopkeeperModel.add(counter);

  // Counter legs
  const legGeo = new THREE.BoxGeometry(0.15, 1.0, 0.15);
  const legMat = new THREE.MeshLambertMaterial({ color: standWood });
  [[-1.3, -1.7], [-1.3, -0.7], [1.3, -1.7], [1.3, -0.7]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, 0.5, z);
    leg.castShadow = true;
    shopkeeperModel.add(leg);
  });

  // Canopy poles
  const poleGeo = new THREE.BoxGeometry(0.12, 2.5, 0.12);
  const poleMat = new THREE.MeshLambertMaterial({ color: standWood });
  [[-1.4, -1.8], [1.4, -1.8], [-1.4, -0.6], [1.4, -0.6]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 1.25, z);
    pole.castShadow = true;
    shopkeeperModel.add(pole);
  });

  // Canopy (striped awning)
  const canopyGeo = new THREE.BoxGeometry(3.2, 0.1, 1.8);
  const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshLambertMaterial({ color: canopyColor }));
  canopy.position.set(0, 2.55, -1.2);
  canopy.castShadow = true;
  shopkeeperModel.add(canopy);

  // Canopy stripes
  for (let i = -1; i <= 1; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 1.85),
      new THREE.MeshLambertMaterial({ color: canopyStripe })
    );
    stripe.position.set(i * 1.0, 2.56, -1.2);
    shopkeeperModel.add(stripe);
  }

  // Seed display items on counter (decorative)
  const displaySeeds = ['🌻', '🌹', '🌷'];
  const seedColors = [0xFFD600, 0xE91E63, 0xFF5722];
  seedColors.forEach((col, i) => {
    const seedBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.3, 0.25),
      new THREE.MeshLambertMaterial({ color: col })
    );
    seedBag.position.set(-0.8 + i * 0.8, 1.25, -1.2);
    seedBag.castShadow = true;
    shopkeeperModel.add(seedBag);
  });

  // Sign
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.5, 0.08),
    new THREE.MeshLambertMaterial({ color: 0xFFF8E1 })
  );
  signBoard.position.set(0, 2.95, -1.2);
  shopkeeperModel.add(signBoard);

  // ── Shlomo (the shopkeeper) ──
  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: skinColor })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  shopkeeperModel.add(head);

  // Big smile (mouth)
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.06, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x8B4513 })
  );
  mouth.position.set(0, 1.42, -0.25);
  shopkeeperModel.add(mouth);

  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), eyeMat);
  eyeL.position.set(-0.12, 1.58, -0.25);
  shopkeeperModel.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), eyeMat);
  eyeR.position.set(0.12, 1.58, -0.25);
  shopkeeperModel.add(eyeR);

  // Straw hat
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xF9A825 })
  );
  brim.position.y = 1.82;
  shopkeeperModel.add(brim);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xF9A825 })
  );
  top.position.y = 1.98;
  shopkeeperModel.add(top);
  // Hat band
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.08, 0.52),
    new THREE.MeshLambertMaterial({ color: apronColor })
  );
  band.position.y = 1.87;
  shopkeeperModel.add(band);

  // Body (cream shirt)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshLambertMaterial({ color: shirtColor })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  shopkeeperModel.add(body);

  // Apron
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.5, 0.05),
    new THREE.MeshLambertMaterial({ color: apronColor })
  );
  apron.position.set(0, 0.95, -0.18);
  shopkeeperModel.add(apron);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
  const armMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, 1.0, 0);
  armL.castShadow = true;
  shopkeeperModel.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, 1.0, 0);
  armR.rotation.x = -0.3; // reaching forward toward counter
  armR.castShadow = true;
  shopkeeperModel.add(armR);

  // Hands
  const handGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
  const handMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.35, 0.66, 0);
  shopkeeperModel.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(0.35, 0.72, -0.15);
  shopkeeperModel.add(handR);

  // Legs
  const legGeo2 = new THREE.BoxGeometry(0.22, 0.5, 0.25);
  const legMat2 = new THREE.MeshLambertMaterial({ color: pantsColor });
  const legL = new THREE.Mesh(legGeo2, legMat2);
  legL.position.set(-0.13, 0.45, 0);
  shopkeeperModel.add(legL);
  const legR = new THREE.Mesh(legGeo2, legMat2);
  legR.position.set(0.13, 0.45, 0);
  shopkeeperModel.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.1, 0.32);
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.13, 0.15, -0.03);
  shopkeeperModel.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.13, 0.15, -0.03);
  shopkeeperModel.add(shoeR);

  // Position the whole group — Shlomo stands behind the counter facing the garden
  shopkeeperModel.position.set(SHOPKEEPER_POS.x, 0, SHOPKEEPER_POS.z);
  shopkeeperModel.rotation.y = Math.PI * 0.5; // face right toward garden
  scene.add(shopkeeperModel);
}

// ─── Garden Plots (3D) ───
function buildGardenPlots() {
  plotMeshes.forEach(pm => scene.remove(pm.group));
  plotMeshes = [];

  const soilMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
  const soilTopMat = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });

  for (let i = 0; i < PLOT_GRID * PLOT_GRID; i++) {
    const pos = getPlotWorldPos(i);
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    // Soil block
    const soilGeo = new THREE.BoxGeometry(PLOT_SIZE - 0.1, 0.3, PLOT_SIZE - 0.1);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.15;
    soil.receiveShadow = true;
    soil.castShadow = true;
    group.add(soil);

    // Soil top (tilled look)
    const topGeo = new THREE.BoxGeometry(PLOT_SIZE - 0.2, 0.05, PLOT_SIZE - 0.2);
    const top = new THREE.Mesh(topGeo, soilTopMat);
    top.position.y = 0.31;
    top.receiveShadow = true;
    group.add(top);

    // Tilled rows
    const rowMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
    for (let r = -0.6; r <= 0.6; r += 0.4) {
      const rowGeo = new THREE.BoxGeometry(PLOT_SIZE - 0.4, 0.04, 0.12);
      const row = new THREE.Mesh(rowGeo, rowMat);
      row.position.set(0, 0.33, r);
      group.add(row);
    }

    scene.add(group);
    plotMeshes.push({
      group,
      plotIndex: i,
      soilMesh: soil,
      plantMesh: null,
      glowMesh: null,
    });
  }
}

// ─── Plant Visuals ───
function updatePlantMeshes() {
  for (let i = 0; i < plotMeshes.length; i++) {
    const pm = plotMeshes[i];
    const plotData = gameState.plots[i];

    // Remove old plant
    if (pm.plantMesh) {
      pm.group.remove(pm.plantMesh);
      pm.plantMesh = null;
    }
    if (pm.glowMesh) {
      pm.group.remove(pm.glowMesh);
      pm.glowMesh = null;
    }

    if (!plotData) {
      // Reset soil color for empty
      pm.soilMesh.material = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
      continue;
    }

    const seed = getSeedData(plotData.seedId);
    if (!seed) continue;

    const elapsed = (Date.now() - plotData.plantedAt) / 1000;
    const progress = Math.min(elapsed / plotData.growTime, 1);
    const isReady = progress >= 1;

    // Plant block (grows taller over time)
    const maxHeight = 1.0;
    const height = 0.15 + progress * maxHeight;
    const width = 0.3 + progress * 0.35;

    // Stem
    const stemGeo = new THREE.BoxGeometry(0.15, height * 0.7, 0.15);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x33691E });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.32 + height * 0.35;
    stem.castShadow = true;

    // Top (flower/fruit)
    const topHeight = Math.max(0.15, height * 0.45);
    const topWidth = width;
    const topGeo = new THREE.BoxGeometry(topWidth, topHeight, topWidth);
    const plantColor = isReady ? seed.color : lerpColor(0x8BC34A, seed.color, progress);
    const topMat = new THREE.MeshLambertMaterial({ color: plantColor });
    const topBlock = new THREE.Mesh(topGeo, topMat);
    topBlock.position.y = 0.32 + height * 0.7 + topHeight / 2;
    topBlock.castShadow = true;

    const plantGroup = new THREE.Group();
    plantGroup.add(stem);
    plantGroup.add(topBlock);

    // Small leaves on sides when growing
    if (progress > 0.3) {
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
      const leafGeo = new THREE.BoxGeometry(0.25, 0.08, 0.12);
      const leaf1 = new THREE.Mesh(leafGeo, leafMat);
      leaf1.position.set(0.15, 0.32 + height * 0.3, 0);
      leaf1.rotation.z = -0.3;
      plantGroup.add(leaf1);
      const leaf2 = new THREE.Mesh(leafGeo, leafMat);
      leaf2.position.set(-0.15, 0.32 + height * 0.4, 0);
      leaf2.rotation.z = 0.3;
      plantGroup.add(leaf2);
    }

    // Ready indicator: gentle bob and glow
    if (isReady) {
      // Golden glow ring on soil
      const glowGeo = new THREE.BoxGeometry(PLOT_SIZE - 0.15, 0.06, PLOT_SIZE - 0.15);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.3 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.32;
      pm.group.add(glow);
      pm.glowMesh = glow;

      pm.soilMesh.material = new THREE.MeshLambertMaterial({ color: 0x7B5B3A });
    } else {
      pm.soilMesh.material = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    }

    pm.group.add(plantGroup);
    pm.plantMesh = plantGroup;
  }
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// ─── Player Controls ───
function initControls() {
  // Third-person camera: right-click drag to orbit
  let isOrbiting = false;
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (!started) return;
    if (e.button === 2 || e.button === 0) isOrbiting = true;
  });
  document.addEventListener('mouseup', () => { isOrbiting = false; });
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
  });

  document.addEventListener('mousemove', (e) => {
    if (!started || !isOrbiting) return;
    yaw -= e.movementX * 0.004;
    pitch -= e.movementY * 0.004;
    pitch = clamp(pitch, -0.6, 0.8);
  });

  document.addEventListener('keydown', (e) => {
    if (!started) return;
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': moveForward = true; break;
      case 'KeyS': case 'ArrowDown': moveBackward = true; break;
      case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
      case 'KeyD': case 'ArrowRight': moveRight = true; break;
      case 'Space':
        e.preventDefault();
        if (playerOnGround) { playerVelocity.y = JUMP_FORCE; playerOnGround = false; }
        break;
      case 'KeyE': tryInteract(); break;
      case 'KeyI':
        e.preventDefault();
        toggleInventory();
        break;
      case 'KeyB':
        e.preventDefault();
        toggleShop();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
      case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9':
        selectHotbarSlot(parseInt(e.code.replace('Digit', '')) - 1);
        break;
      case 'Escape':
        closeAllPanels();
        break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': moveForward = false; break;
      case 'KeyS': case 'ArrowDown': moveBackward = false; break;
      case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
      case 'KeyD': case 'ArrowRight': moveRight = false; break;
    }
  });

  // Click to interact
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (!isPointerLocked || !started) return;
    if (e.button === 0) tryInteract();
  });

  // Mobile controls
  initTouchControls();
}

// ─── Touch Controls ───
function initTouchControls() {
  isMobile = ('ontouchstart' in window) && (window.innerWidth < 1024);

  const touchMove = $('#touch-move');
  const touchStick = $('#touch-move-stick');
  const touchLook = $('#touch-look');
  const touchJump = $('#touch-jump');
  const touchInteract = $('#touch-interact');
  const touchInv = $('#touch-inv');
  const touchShop = $('#touch-shop');

  let moveTouch = null;
  let lookTouch = null;
  let lastLookX = 0, lastLookY = 0;

  touchMove.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      moveTouch = e.touches[0].identifier;
    }
  }, {passive: false});

  touchMove.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === moveTouch) {
        const rect = touchMove.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (t.clientX - cx) / (rect.width / 2);
        const dy = (t.clientY - cy) / (rect.height / 2);
        const len = Math.sqrt(dx*dx + dy*dy);
        const maxLen = 1;
        if (len > maxLen) {
          touchMoveVec.x = (dx / len) * maxLen;
          touchMoveVec.y = (dy / len) * maxLen;
        } else {
          touchMoveVec.x = dx;
          touchMoveVec.y = dy;
        }
        touchStick.style.transform = `translate(calc(-50% + ${touchMoveVec.x * 30}px), calc(-50% + ${touchMoveVec.y * 30}px))`;
      }
    }
  }, {passive: false});

  const resetMove = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveTouch) {
        moveTouch = null;
        touchMoveVec.x = 0;
        touchMoveVec.y = 0;
        touchStick.style.transform = 'translate(-50%, -50%)';
      }
    }
  };
  touchMove.addEventListener('touchend', resetMove, {passive: false});
  touchMove.addEventListener('touchcancel', resetMove, {passive: false});

  // Look
  touchLook.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[e.touches.length - 1];
      lookTouch = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
    }
  }, {passive: false});

  touchLook.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouch) {
        const dx = t.clientX - lastLookX;
        const dy = t.clientY - lastLookY;
        yaw -= dx * 0.004;
        pitch -= dy * 0.004;
        pitch = clamp(pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
        lastLookX = t.clientX;
        lastLookY = t.clientY;
      }
    }
  }, {passive: false});

  const resetLook = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouch) { lookTouch = null; }
    }
  };
  touchLook.addEventListener('touchend', resetLook, {passive: false});
  touchLook.addEventListener('touchcancel', resetLook, {passive: false});

  touchJump.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (playerOnGround) { playerVelocity.y = JUMP_FORCE; playerOnGround = false; }
  }, {passive: false});

  touchInteract.addEventListener('touchstart', (e) => {
    e.preventDefault();
    tryInteract();
  }, {passive: false});

  touchInv.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleInventory();
  }, {passive: false});

  touchShop.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleShop();
  }, {passive: false});
}

// ─── Player position (separate from camera) ───
let playerPos = new THREE.Vector3(0, 0, 0);
let playerGroundY = 0;
let walkCycle = 0;
let isMoving = false;

// ─── Player Update (third-person) ───
function updatePlayer(dt) {
  // Direction from yaw (camera orbit angle)
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const moveDir = new THREE.Vector3();

  // Keyboard
  if (moveForward) moveDir.add(forward);
  if (moveBackward) moveDir.sub(forward);
  if (moveLeft) moveDir.sub(right);
  if (moveRight) moveDir.add(right);

  // Touch
  if (touchMoveVec.x !== 0 || touchMoveVec.y !== 0) {
    moveDir.add(right.clone().multiplyScalar(touchMoveVec.x));
    moveDir.add(forward.clone().multiplyScalar(-touchMoveVec.y));
  }

  isMoving = moveDir.length() > 0;
  if (isMoving) moveDir.normalize();

  // Apply movement to player position
  playerPos.x += moveDir.x * PLAYER_SPEED * dt;
  playerPos.z += moveDir.z * PLAYER_SPEED * dt;

  // Gravity
  playerVelocity.y -= GRAVITY * dt;
  playerGroundY += playerVelocity.y * dt;

  if (playerGroundY <= 0) {
    playerGroundY = 0;
    playerVelocity.y = 0;
    playerOnGround = true;
  }

  // World bounds
  const bound = WORLD_SIZE / 2 - 1;
  playerPos.x = clamp(playerPos.x, -bound, bound);
  playerPos.z = clamp(playerPos.z, -bound, bound);

  // Update player model
  if (playerModel) {
    playerModel.position.set(playerPos.x, playerGroundY, playerPos.z);

    // Face movement direction (or face camera forward direction)
    if (isMoving) {
      playerModel.rotation.y = Math.atan2(moveDir.x, moveDir.z);
    }

    // Walk animation — swing arms and legs
    if (isMoving) {
      walkCycle += dt * 10;
      const swing = Math.sin(walkCycle) * 0.4;
      const parts = playerModel.userData;
      if (parts.armL) parts.armL.rotation.x = swing;
      if (parts.armR) parts.armR.rotation.x = -swing;
      if (parts.legL) parts.legL.rotation.x = -swing;
      if (parts.legR) parts.legR.rotation.x = swing;
    } else {
      walkCycle = 0;
      const parts = playerModel.userData;
      if (parts.armL) parts.armL.rotation.x = 0;
      if (parts.armR) parts.armR.rotation.x = 0;
      if (parts.legL) parts.legL.rotation.x = 0;
      if (parts.legR) parts.legR.rotation.x = 0;
    }
  }

  // Third-person camera: orbit behind the player
  const camX = playerPos.x + Math.sin(yaw) * CAM_DISTANCE;
  const camZ = playerPos.z + Math.cos(yaw) * CAM_DISTANCE;
  const camY = playerGroundY + PLAYER_HEIGHT + CAM_HEIGHT_OFFSET + Math.sin(pitch) * CAM_DISTANCE * 0.5;

  camera.position.set(camX, clamp(camY, 1.5, 20), camZ);
  camera.lookAt(playerPos.x, playerGroundY + PLAYER_HEIGHT, playerPos.z);
}

// ─── Raycasting / Interaction ───
function updateInteraction() {
  // Cast ray from player position in the direction player faces
  const playerFwd = new THREE.Vector3(-Math.sin(playerModel ? playerModel.rotation.y : yaw), 0, -Math.cos(playerModel ? playerModel.rotation.y : yaw));
  raycaster.set(new THREE.Vector3(playerPos.x, playerGroundY + PLAYER_HEIGHT * 0.8, playerPos.z), playerFwd);
  interactTarget = null;

  let closestDist = Infinity;
  let closestIdx = -1;

  for (let i = 0; i < plotMeshes.length; i++) {
    const pm = plotMeshes[i];
    const intersects = raycaster.intersectObjects(pm.group.children, true);
    if (intersects.length > 0 && intersects[0].distance < closestDist) {
      closestDist = intersects[0].distance;
      closestIdx = i;
    }
  }

  if (closestIdx >= 0 && closestDist <= INTERACT_DIST) {
    interactTarget = closestIdx;
    const plotData = gameState.plots[closestIdx];

    if (!plotData) {
      showPrompt('Press <b>E</b> to Plant');
      showPlotLabel('Empty Plot');
    } else {
      const seed = getSeedData(plotData.seedId);
      const elapsed = (Date.now() - plotData.plantedAt) / 1000;
      const progress = Math.min(elapsed / plotData.growTime, 1);
      const isReady = progress >= 1;

      if (isReady) {
        showPrompt(`Press <b>E</b> to Harvest ${seed.emoji} ${seed.name}`);
        showPlotLabel(`${seed.emoji} ${seed.name} — READY!`);
      } else {
        const remaining = Math.ceil(plotData.growTime - elapsed);
        const pct = Math.floor(progress * 100);
        showPrompt(`${seed.emoji} ${seed.name} — Growing ${pct}%`);
        showPlotLabel(`${seed.emoji} ${seed.name} — ${remaining}s left`);
      }
    }
  } else {
    // Check if near Shlomo the shopkeeper
    const dxShop = playerPos.x - SHOPKEEPER_POS.x;
    const dzShop = playerPos.z - SHOPKEEPER_POS.z;
    const distToShop = Math.sqrt(dxShop * dxShop + dzShop * dzShop);
    if (distToShop <= SHOPKEEPER_INTERACT_DIST) {
      nearShopkeeper = true;
      const holidays = getActiveHolidayLabels();
      const seasonalMsg = holidays.length > 0 ? ` — ${holidays.join(' ')} specials!` : '';
      showPrompt(`Press <b>E</b> to talk to <b>Shlomo</b> 🌱${seasonalMsg}`);
      showPlotLabel("Shlomo's Seeds");
    } else {
      nearShopkeeper = false;
      hidePrompt();
      hidePlotLabel();
    }
  }
}

function showPrompt(html) {
  interactPromptEl.innerHTML = html;
  interactPromptEl.classList.add('visible');
}
function hidePrompt() { interactPromptEl.classList.remove('visible'); }
function showPlotLabel(text) {
  plotLabelEl.textContent = text;
  plotLabelEl.classList.add('visible');
}
function hidePlotLabel() { plotLabelEl.classList.remove('visible'); }

// ─── Interact Action ───
function tryInteract() {
  if (isAnyPanelOpen()) return;

  // Shlomo interaction
  if (nearShopkeeper && interactTarget === null) {
    openShop();
    return;
  }

  if (interactTarget === null) return;

  const plotData = gameState.plots[interactTarget];

  if (!plotData) {
    // Open seed selector
    openSeedPanel(interactTarget);
  } else {
    // Check if harvestable
    const elapsed = (Date.now() - plotData.plantedAt) / 1000;
    if (elapsed >= plotData.growTime) {
      harvestPlot(interactTarget);
    }
  }
}

// ─── Planting ───
function openSeedPanel(plotIndex) {
  if (document.pointerLockElement) document.exitPointerLock();

  const panel = $('#seed-panel');
  const body = $('#seed-panel-body');
  body.innerHTML = '';

  const seeds = Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0);

  if (seeds.length === 0) {
    body.innerHTML = '<p style="color:#78909c;text-align:center;padding:20px;">No seeds! Press <b>B</b> to open the Shop.</p>';
    panel.classList.remove('hidden');
    panel._plotIndex = plotIndex;
    return;
  }

  seeds.forEach(seedId => {
    const seed = getSeedData(seedId);
    if (!seed) return;
    const count = gameState.inventory[seedId];
    const opt = document.createElement('div');
    opt.className = 'seed-option';
    opt.innerHTML = `
      <span class="seed-emoji">${seed.emoji}</span>
      <div class="seed-info">
        <div class="seed-name">${seed.name}</div>
        <div class="seed-detail">${count}x | ${seed.growTime}s grow | Sells for 🪙${seed.sellPrice}</div>
      </div>
    `;
    opt.addEventListener('click', () => {
      plantSeed(plotIndex, seedId);
      closeSeedPanel();
    });
    body.appendChild(opt);
  });

  panel.classList.remove('hidden');
  panel._plotIndex = plotIndex;
}

function plantSeed(plotIndex, seedId) {
  if (!gameState.inventory[seedId] || gameState.inventory[seedId] <= 0) return;

  gameState.inventory[seedId]--;
  if (gameState.inventory[seedId] <= 0) delete gameState.inventory[seedId];

  gameState.plots[plotIndex] = {
    seedId: seedId,
    plantedAt: Date.now(),
    growTime: getSeedData(seedId).growTime,
  };

  showToast('🌱', `Planted ${getSeedData(seedId).name}!`);
  updateHotbar();
  updatePlantMeshes();
  saveGame();
}

// ─── Harvesting ───
function harvestPlot(plotIndex) {
  const plotData = gameState.plots[plotIndex];
  if (!plotData) return;

  const seed = getSeedData(plotData.seedId);
  const sellPrice = seed.sellPrice;

  gameState.coins += sellPrice;
  gameState.plots[plotIndex] = null;

  showToast('🎉', `Harvested ${seed.emoji} ${seed.name} — +🪙${sellPrice}!`);
  spawnCoinFly();
  spawnParticles(window.innerWidth / 2, window.innerHeight / 2, seed.emoji, 8);

  updateHUD();
  updateHotbar();
  updatePlantMeshes();
  saveGame();
}

// ─── Seed Panel ───
window.closeSeedPanel = function() {
  $('#seed-panel').classList.add('hidden');
};

// ─── Shop ───
function toggleShop() {
  const panel = $('#shop-panel');
  if (panel.classList.contains('hidden')) {
    openShop();
  } else {
    closeShop();
  }
}

function makeShopCard(seedId, seed) {
  const canAfford = gameState.coins >= seed.seedCost;
  const owned = gameState.inventory[seedId] || 0;

  const card = document.createElement('div');
  card.className = 'shop-card' + (seed.holiday ? ' shop-card-seasonal' : '');
  card.innerHTML = `
    <div class="shop-emoji">${seed.emoji}</div>
    <div class="shop-name">${seed.name}</div>
    ${seed.description ? `<div class="shop-desc">${seed.description}</div>` : ''}
    <div class="shop-stats">
      Grow: ${seed.growTime}s<br>
      Sell: 🪙${seed.sellPrice}<br>
      Owned: ${owned}
    </div>
    <button class="shop-btn" ${!canAfford ? 'disabled' : ''}>Buy 🪙${seed.seedCost}</button>
  `;

  card.querySelector('.shop-btn').addEventListener('click', () => {
    if (gameState.coins >= seed.seedCost) {
      gameState.coins -= seed.seedCost;
      gameState.inventory[seedId] = (gameState.inventory[seedId] || 0) + 1;
      showToast('🛒', `Bought ${seed.name} seed!`);
      updateHUD();
      updateHotbar();
      saveGame();
      openShop();
    }
  });

  return card;
}

function openShop() {
  if (document.pointerLockElement) document.exitPointerLock();
  closeAllPanels();

  const body = $('#shop-panel-body');
  body.innerHTML = '';

  // Seasonal seeds section
  const seasonal = getSeasonalSeeds();
  const holidayLabels = getActiveHolidayLabels();
  if (Object.keys(seasonal).length > 0) {
    const seasonHeader = document.createElement('div');
    seasonHeader.className = 'shop-section-header seasonal';
    seasonHeader.innerHTML = `${holidayLabels.join(' ')} <span class="seasonal-tag">Limited Time!</span>`;
    body.appendChild(seasonHeader);

    const seasonGrid = document.createElement('div');
    seasonGrid.className = 'shop-grid';
    for (const [seedId, seed] of Object.entries(seasonal)) {
      seasonGrid.appendChild(makeShopCard(seedId, seed));
    }
    body.appendChild(seasonGrid);

    const divider = document.createElement('hr');
    divider.className = 'shop-divider';
    body.appendChild(divider);
  }

  // Regular seeds
  const regularHeader = document.createElement('div');
  regularHeader.className = 'shop-section-header';
  regularHeader.textContent = '🌱 Regular Seeds';
  body.appendChild(regularHeader);

  const grid = document.createElement('div');
  grid.className = 'shop-grid';
  SEED_LIST.forEach(seedId => {
    grid.appendChild(makeShopCard(seedId, getSeedData(seedId)));
  });
  body.appendChild(grid);

  $('#shop-panel').classList.remove('hidden');
}

window.closeShop = function() {
  $('#shop-panel').classList.add('hidden');
};

// ─── Inventory ───
function toggleInventory() {
  const panel = $('#inv-panel');
  if (panel.classList.contains('hidden')) {
    openInventory();
  } else {
    closeInventory();
  }
}

function openInventory() {
  if (document.pointerLockElement) document.exitPointerLock();
  closeAllPanels();

  const body = $('#inv-panel-body');
  body.innerHTML = '';

  const seeds = Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0);

  if (seeds.length === 0) {
    body.innerHTML = '<p style="color:#78909c;text-align:center;padding:20px;">Inventory empty. Visit the Shop!</p>';
    $('#inv-panel').classList.remove('hidden');
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'inv-grid';

  seeds.forEach(seedId => {
    const seed = getSeedData(seedId);
    if (!seed) return;
    const count = gameState.inventory[seedId];
    const item = document.createElement('div');
    item.className = 'inv-item';
    item.innerHTML = `
      <div class="inv-emoji">${seed.emoji}</div>
      <div class="inv-name">${seed.name}</div>
      <div class="inv-count">x${count}</div>
    `;
    grid.appendChild(item);
  });

  // Sell all harvested summary
  const sellInfo = document.createElement('div');
  sellInfo.style.cssText = 'margin-top:16px;text-align:center;font-size:14px;color:#90a4ae;';
  sellInfo.textContent = `Total seed types: ${seeds.length}`;

  body.appendChild(grid);
  body.appendChild(sellInfo);
  $('#inv-panel').classList.remove('hidden');
}

window.closeInventory = function() {
  $('#inv-panel').classList.add('hidden');
};

// ─── Panels ───
function isAnyPanelOpen() {
  return !$('#seed-panel').classList.contains('hidden') ||
         !$('#shop-panel').classList.contains('hidden') ||
         !$('#inv-panel').classList.contains('hidden');
}

function closeAllPanels() {
  $('#seed-panel').classList.add('hidden');
  $('#shop-panel').classList.add('hidden');
  $('#inv-panel').classList.add('hidden');
}

// Close panels on overlay click
['seed-panel', 'shop-panel', 'inv-panel'].forEach(id => {
  $('#' + id).addEventListener('click', (e) => {
    if (e.target === $('#' + id)) {
      $('#' + id).classList.add('hidden');
    }
  });
});

// ─── Hotbar ───
function updateHotbar() {
  hotbarEl.innerHTML = '';
  const seeds = Object.keys(gameState.inventory).filter(id => gameState.inventory[id] > 0);

  // Show up to 9 seed types
  const slots = seeds.slice(0, 9);

  slots.forEach((seedId, i) => {
    const seed = getSeedData(seedId);
    if (!seed) return;
    const count = gameState.inventory[seedId];
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot' + (i === gameState.selectedSlot ? ' selected' : '');
    slot.innerHTML = `
      <span class="slot-emoji">${seed.emoji}</span>
      <span class="slot-count">${count}</span>
    `;
    slot.addEventListener('click', () => selectHotbarSlot(i));
    hotbarEl.appendChild(slot);
  });

  // If no seeds, show empty
  if (slots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hotbar-slot';
    empty.innerHTML = '<span class="slot-emoji" style="opacity:0.3">🌱</span>';
    hotbarEl.appendChild(empty);
  }
}

function selectHotbarSlot(index) {
  gameState.selectedSlot = index;
  updateHotbar();
}

// ─── HUD ───
function updateHUD() {
  coinAmountEl.textContent = gameState.coins.toLocaleString();
}

// ─── Profile System ───
const PROFILE_AVATARS = ['🌻','🌵','🍄','🌸','🌲','🦊','🐸','🌈','🍀','🔥','🐝','🦋','🌺','🍉','⭐','🐢','🎮','🧑‍🌾'];

function getProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; } catch(e) { return []; }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
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

function showProfileScreen() {
  // Remove existing if any
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
      <p class="subtitle">Who's playing?</p>
      <div class="profile-grid" id="profile-grid"></div>
      <button class="profile-new-btn" id="new-profile-btn">+ New Gardener</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const grid = document.getElementById('profile-grid');
  profiles.forEach(p => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.innerHTML = `<span class="profile-avatar">${p.avatar}</span><span class="profile-name">${p.name}</span>`;
    card.addEventListener('click', () => selectProfile(p.id));

    // Long press / right-click to delete
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (confirm(`Delete ${p.name}'s garden? This cannot be undone!`)) {
        deleteProfile(p.id);
      }
    });
    grid.appendChild(card);
  });

  document.getElementById('new-profile-btn').addEventListener('click', showNewProfileModal);
}

function showNewProfileModal() {
  const profiles = getProfiles();
  if (profiles.length >= MAX_PROFILES) {
    alert('Maximum 10 profiles! Long-press a profile to delete one.');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'new-profile-modal';
  modal.innerHTML = `
    <div class="profile-modal-box">
      <h2>New Gardener</h2>
      <input type="text" id="profile-name-input" placeholder="Enter name..." maxlength="12" autofocus>
      <p style="margin:10px 0 5px;font-weight:bold;">Pick an avatar:</p>
      <div class="avatar-grid" id="avatar-grid"></div>
      <div style="margin-top:15px;display:flex;gap:10px;justify-content:center;">
        <button class="profile-modal-btn" id="create-profile-btn">Create</button>
        <button class="profile-modal-btn cancel" id="cancel-profile-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedAvatar = '🌻';
  const avatarGrid = document.getElementById('avatar-grid');
  PROFILE_AVATARS.forEach((emoji, i) => {
    const btn = document.createElement('span');
    btn.className = 'avatar-option' + (i === 0 ? ' selected' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      avatarGrid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedAvatar = emoji;
    });
    avatarGrid.appendChild(btn);
  });

  document.getElementById('create-profile-btn').addEventListener('click', () => {
    const name = document.getElementById('profile-name-input').value.trim();
    if (!name) { document.getElementById('profile-name-input').focus(); return; }
    const id = 'p_' + Date.now();
    const profiles = getProfiles();
    profiles.push({ id, name, avatar: selectedAvatar });
    saveProfiles(profiles);
    modal.remove();
    selectProfile(id);
  });

  document.getElementById('cancel-profile-btn').addEventListener('click', () => modal.remove());
  document.getElementById('profile-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('create-profile-btn').click();
  });
  setTimeout(() => document.getElementById('profile-name-input').focus(), 50);
}

function deleteProfile(id) {
  let profiles = getProfiles();
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);
  localStorage.removeItem(SAVE_PREFIX + id);
  showProfileScreen();
}

function selectProfile(id) {
  activeProfileId = id;
  const profileScreen = document.getElementById('profile-screen');
  if (profileScreen) profileScreen.remove();
  const modal = document.getElementById('new-profile-modal');
  if (modal) modal.remove();

  // Show profile badge
  const profiles = getProfiles();
  const p = profiles.find(pr => pr.id === id);
  if (p) showProfileBadge(p);

  // Now init the game
  initGame();
}

function showProfileBadge(profile) {
  let badge = document.getElementById('profile-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'profile-badge';
    document.body.appendChild(badge);
  }
  badge.innerHTML = `<span class="badge-avatar">${profile.avatar}</span><span class="badge-name">${profile.name}</span><button class="badge-switch" id="switch-profile-btn">↩</button>`;
  document.getElementById('switch-profile-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    // Reset game state
    if (started) saveGame();
    started = false;
    // Clean up Three.js
    if (renderer) {
      renderer.domElement.remove();
      renderer.dispose();
      renderer = null;
    }
    scene = null; camera = null;
    plotMeshes = []; cloudMeshes = [];
    document.getElementById('start-screen').style.display = '';
    badge.remove();
    activeProfileId = null;
    showProfileScreen();
  });
}

// ─── Save / Load ───
function saveGame() {
  if (!activeProfileId) return;
  try {
    const data = {
      coins: gameState.coins,
      inventory: gameState.inventory,
      plots: gameState.plots,
      savedAt: Date.now(),
    };
    localStorage.setItem(getSaveKey(), JSON.stringify(data));
  } catch(e) { /* ignore */ }
}

function loadGame() {
  if (!activeProfileId) return false;
  try {
    const raw = localStorage.getItem(getSaveKey());
    if (!raw) return false;
    const data = JSON.parse(raw);
    gameState.coins = data.coins || 100;
    gameState.inventory = data.inventory || { daisy: 3 };
    gameState.plots = data.plots || [];

    // Ensure 16 plots
    while (gameState.plots.length < PLOT_GRID * PLOT_GRID) {
      gameState.plots.push(null);
    }

    // Calculate offline growth
    if (data.savedAt) {
      let readyCount = 0;
      gameState.plots.forEach(plot => {
        if (plot) {
          const elapsed = (Date.now() - plot.plantedAt) / 1000;
          if (elapsed >= plot.growTime) readyCount++;
        }
      });
      if (readyCount > 0) {
        showToast('🌅', `Welcome back! ${readyCount} plant${readyCount > 1 ? 's' : ''} ready to harvest!`);
      }
    }

    return true;
  } catch(e) {
    return false;
  }
}

// ─── Animate Plant Bobs ───
function animatePlants(time) {
  for (let i = 0; i < plotMeshes.length; i++) {
    const pm = plotMeshes[i];
    const plotData = gameState.plots[i];
    if (!plotData || !pm.plantMesh) continue;

    const elapsed = (Date.now() - plotData.plantedAt) / 1000;
    const isReady = elapsed >= plotData.growTime;

    if (isReady && pm.plantMesh) {
      // Bob up and down
      pm.plantMesh.position.y = Math.sin(time * 3 + i) * 0.05;
      pm.plantMesh.rotation.y = Math.sin(time * 2 + i * 0.5) * 0.05;
    }

    // Glow pulse
    if (pm.glowMesh) {
      pm.glowMesh.material.opacity = 0.2 + Math.sin(time * 4 + i) * 0.15;
    }
  }
}

// ─── Cloud animation ───
function animateClouds(dt) {
  cloudMeshes.forEach(cloud => {
    cloud.position.x += dt * 0.3;
    if (cloud.position.x > 30) cloud.position.x = -30;
  });
}

// ─── Main Game Loop ───
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.getElapsedTime();

  if (!started) return;

  updatePlayer(dt);
  updateInteraction();
  animatePlants(time);
  animateClouds(dt);

  // Shlomo idle + floating label
  if (shopkeeperModel && camera) {
    // Floating label position
    const labelEl = document.getElementById('shopkeeper-label');
    if (labelEl) {
      const labelPos = new THREE.Vector3(SHOPKEEPER_POS.x, 3.4, SHOPKEEPER_POS.z);
      labelPos.project(camera);
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;
      const sx = labelPos.x * hw + hw;
      const sy = -(labelPos.y * hh) + hh;
      if (labelPos.z < 1 && labelPos.z > 0) {
        labelEl.style.left = sx + 'px';
        labelEl.style.top = sy + 'px';
        const dist = Math.sqrt((playerPos.x - SHOPKEEPER_POS.x)**2 + (playerPos.z - SHOPKEEPER_POS.z)**2);
        labelEl.classList.toggle('visible', dist < 12);
      } else {
        labelEl.classList.remove('visible');
      }
    }
  }

  // Periodic plant mesh update (every 2 seconds for growth changes)
  if (Math.floor(time * 0.5) !== Math.floor((time - dt) * 0.5)) {
    updatePlantMeshes();
  }

  // Auto-save
  autoSaveTimer += dt;
  if (autoSaveTimer >= AUTO_SAVE_SEC) {
    autoSaveTimer = 0;
    saveGame();
  }

  renderer.render(scene, camera);
}

// ─── Start Game ───
function startGame() {
  started = true;
  startScreen.style.display = 'none';

  // Third-person: no pointer lock needed
}

// ─── Init Game (after profile selected) ───
function initGame() {
  // Reset game state
  gameState = { coins: 100, inventory: { daisy: 3, sunflower: 2 }, plots: [], selectedSlot: 0 };
  plotMeshes = [];
  cloudMeshes = [];
  autoSaveTimer = 0;
  started = false;

  playerPos = new THREE.Vector3(0, 0, 8);
  playerGroundY = 0;
  walkCycle = 0;
  isMoving = false;
  yaw = 0; pitch = 0;

  initScene();
  initLighting();
  buildWorld();
  buildPlayerModel();
  buildShopkeeper();

  const loaded = loadGame();
  if (!loaded) {
    initPlots();
  }

  buildGardenPlots();
  updatePlantMeshes();
  initControls();
  updateHUD();
  updateHotbar();

  // Show start screen
  startScreen.style.display = '';
  startBtn.addEventListener('click', startGame);

  animate();
}

// ─── Init (show profile screen) ───
function init() {
  showProfileScreen();
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
