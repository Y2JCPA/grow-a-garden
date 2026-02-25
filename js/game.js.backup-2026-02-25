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
const AUTO_SAVE_SEC = 10;
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
let animating = false;
let startBtnBound = false;

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

// ─── Plant Model Builders ───
function buildPlantModel(seedId, seed, progress, isReady) {
  const g = new THREE.Group();
  const baseY = 0.32;
  const h = 0.15 + progress * 1.0; // overall height scale
  const plantColor = isReady ? seed.color : lerpColor(0x8BC34A, seed.color, progress);
  const topColor = isReady ? (seed.topColor || seed.color) : lerpColor(0x8BC34A, seed.topColor || seed.color, progress);
  const stemColor = 0x33691E;
  const leafColor = 0x4CAF50;

  // Helper to add a box mesh
  function box(w, bh, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, bh, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  }

  switch (seedId) {
    // ─── FLOWERS ───
    case 'daisy':
    case 'lavender': {
      // Thin stem + flat wide petals on top
      box(0.1, h * 0.7, 0.1, stemColor, 0, baseY + h * 0.35, 0);
      const petalY = baseY + h * 0.7;
      const ps = 0.15 + progress * 0.15;
      box(ps * 3, 0.08, ps, plantColor, 0, petalY, 0); // horizontal petals
      box(ps, 0.08, ps * 3, plantColor, 0, petalY, 0); // cross petals
      box(ps * 2, 0.08, ps * 2, plantColor, 0, petalY, 0); // diagonal fill
      if (progress > 0.5) box(0.12, 0.12, 0.12, topColor, 0, petalY + 0.08, 0); // center
      break;
    }

    case 'sunflower': {
      // Tall thick stem + big round-ish head
      box(0.18, h * 0.8, 0.18, stemColor, 0, baseY + h * 0.4, 0);
      if (progress > 0.3) { // leaves
        box(0.35, 0.06, 0.15, leafColor, 0.2, baseY + h * 0.25, 0);
        box(0.35, 0.06, 0.15, leafColor, -0.2, baseY + h * 0.4, 0);
      }
      const headY = baseY + h * 0.8;
      const hs = 0.3 + progress * 0.35;
      box(hs, hs * 0.3, hs, plantColor, 0, headY, 0); // petals
      box(hs * 0.6, hs * 0.35, hs * 0.6, 0x5D3A1A, 0, headY, 0); // dark center
      break;
    }

    case 'rose': {
      // Thorny stem + layered bud
      box(0.1, h * 0.65, 0.1, 0x2E5E1E, 0, baseY + h * 0.32, 0);
      if (progress > 0.2) box(0.06, 0.06, 0.15, 0x2E5E1E, 0.08, baseY + h * 0.2, 0); // thorn
      if (progress > 0.35) box(0.06, 0.06, 0.15, 0x2E5E1E, -0.08, baseY + h * 0.35, 0);
      const budY = baseY + h * 0.65;
      const bs = 0.15 + progress * 0.2;
      box(bs, bs * 1.2, bs, plantColor, 0, budY, 0); // inner bud
      if (progress > 0.6) {
        box(bs * 1.4, bs * 0.5, bs * 0.4, plantColor, 0, budY - bs * 0.2, 0); // outer petals
        box(bs * 0.4, bs * 0.5, bs * 1.4, plantColor, 0, budY - bs * 0.2, 0);
      }
      break;
    }

    case 'tulip': {
      // Curved stem + cup-shaped bloom
      box(0.08, h * 0.7, 0.08, stemColor, 0, baseY + h * 0.35, 0);
      if (progress > 0.3) box(0.3, 0.05, 0.12, leafColor, 0, baseY + h * 0.15, 0.08);
      const ty = baseY + h * 0.7;
      const ts = 0.12 + progress * 0.18;
      box(ts, ts * 1.5, ts, plantColor, 0, ty, 0); // center petal
      box(ts * 0.7, ts * 1.2, ts * 0.5, topColor, ts * 0.4, ty - 0.02, 0); // side
      box(ts * 0.7, ts * 1.2, ts * 0.5, topColor, -ts * 0.4, ty - 0.02, 0);
      break;
    }

    case 'orchid': {
      // Tall thin stem + exotic layered flower
      box(0.06, h * 0.8, 0.06, stemColor, 0, baseY + h * 0.4, 0);
      if (progress > 0.4) box(0.4, 0.04, 0.15, leafColor, 0, baseY + 0.1, 0);
      const oy = baseY + h * 0.8;
      const os = 0.1 + progress * 0.2;
      box(os * 2.5, 0.06, os, plantColor, 0, oy, 0);
      box(os, 0.06, os * 2.5, topColor, 0, oy, 0);
      box(os * 0.5, 0.15, os * 0.5, 0xFFFFFF, 0, oy + 0.06, 0); // center
      break;
    }

    // ─── VEGETABLES ───
    case 'carrot': {
      // Green leafy top, orange root peeking from soil
      const leafH = h * 0.6;
      box(0.3, leafH, 0.08, leafColor, 0, baseY + leafH / 2, 0);
      box(0.08, leafH, 0.3, leafColor, 0, baseY + leafH / 2, 0);
      box(0.2, leafH * 0.8, 0.2, 0x2E7D32, 0, baseY + leafH * 0.4, 0);
      if (progress > 0.5) box(0.15, 0.2, 0.15, plantColor, 0, baseY - 0.05, 0); // orange root showing
      break;
    }

    case 'tomato': {
      // Bush with round red fruits
      box(0.12, h * 0.5, 0.12, stemColor, 0, baseY + h * 0.25, 0);
      const bushY = baseY + h * 0.5;
      box(0.5, 0.3, 0.5, leafColor, 0, bushY, 0); // bush
      if (progress > 0.5) {
        const ts = 0.12 + progress * 0.08;
        box(ts, ts, ts, plantColor, 0.15, bushY + 0.1, 0.1);
        box(ts, ts, ts, plantColor, -0.1, bushY + 0.05, -0.12);
        if (progress > 0.75) box(ts, ts, ts, plantColor, 0, bushY + 0.15, 0);
      }
      break;
    }

    case 'pumpkin': {
      // Low vine + big round pumpkin on ground
      box(0.08, 0.04, 0.5, stemColor, 0, baseY + 0.02, 0); // vine
      if (progress > 0.3) {
        box(0.2, 0.04, 0.12, leafColor, -0.15, baseY + 0.05, 0.15);
        box(0.2, 0.04, 0.12, leafColor, 0.15, baseY + 0.05, -0.15);
      }
      const ps = 0.2 + progress * 0.4;
      box(ps, ps * 0.7, ps, plantColor, 0, baseY + ps * 0.35, 0);
      if (progress > 0.6) box(0.06, 0.12, 0.06, stemColor, 0, baseY + ps * 0.7 + 0.06, 0); // stem on top
      break;
    }

    case 'strawberry': {
      // Low bush + small red berries
      box(0.1, h * 0.3, 0.1, stemColor, 0, baseY + h * 0.15, 0);
      box(0.4, 0.15, 0.4, leafColor, 0, baseY + h * 0.35, 0);
      if (progress > 0.5) {
        box(0.1, 0.12, 0.1, plantColor, 0.12, baseY + 0.1, 0.12);
        box(0.1, 0.12, 0.1, plantColor, -0.1, baseY + 0.08, -0.1);
        if (isReady) box(0.1, 0.12, 0.1, plantColor, 0, baseY + 0.12, 0);
      }
      break;
    }

    case 'blueberry': {
      // Small bush + clusters of blue
      box(0.12, h * 0.4, 0.12, stemColor, 0, baseY + h * 0.2, 0);
      box(0.35, 0.25, 0.35, leafColor, 0, baseY + h * 0.45, 0);
      if (progress > 0.5) {
        const bs = 0.07;
        box(bs, bs, bs, plantColor, 0.12, baseY + h * 0.5, 0.08);
        box(bs, bs, bs, plantColor, -0.08, baseY + h * 0.45, -0.1);
        box(bs, bs, bs, plantColor, 0.05, baseY + h * 0.55, -0.05);
        if (isReady) box(bs, bs, bs, plantColor, -0.1, baseY + h * 0.52, 0.06);
      }
      break;
    }

    // ─── CACTUS ───
    case 'cactus': {
      // Classic cactus shape with arms
      const cw = 0.2 + progress * 0.1;
      box(cw, h * 0.8, cw, plantColor, 0, baseY + h * 0.4, 0); // main body
      if (progress > 0.4) box(cw * 0.7, h * 0.3, cw * 0.7, topColor, cw * 0.7, baseY + h * 0.5, 0); // right arm
      if (progress > 0.6) box(cw * 0.7, h * 0.25, cw * 0.7, topColor, -cw * 0.7, baseY + h * 0.6, 0); // left arm
      if (isReady) box(0.1, 0.1, 0.1, 0xFF69B4, 0, baseY + h * 0.85, 0); // pink flower on top
      break;
    }

    // ─── MUSHROOM ───
    case 'mushroom': {
      // Short thick stem + wide flat cap
      const mw = 0.12 + progress * 0.08;
      box(mw, h * 0.4, mw, 0xF5F5DC, 0, baseY + h * 0.2, 0); // white stem
      const capW = 0.25 + progress * 0.3;
      box(capW, h * 0.2, capW, plantColor, 0, baseY + h * 0.45, 0); // brown cap
      if (progress > 0.5) { // spots on cap
        box(0.06, 0.04, 0.06, topColor, 0.08, baseY + h * 0.5, 0.05);
        box(0.06, 0.04, 0.06, topColor, -0.06, baseY + h * 0.5, -0.07);
      }
      break;
    }

    // ─── HERBS ───
    // (lavender handled above with daisy)

    // ─── TREES (date_palm, fig, olive, charoset) ───
    case 'date_palm': {
      // Tall trunk + fan leaves at top
      box(0.15, h * 0.85, 0.15, seed.color, 0, baseY + h * 0.42, 0);
      if (progress > 0.3) {
        const ly = baseY + h * 0.85;
        box(0.6, 0.05, 0.12, topColor, 0, ly, 0);
        box(0.12, 0.05, 0.6, topColor, 0, ly, 0);
        box(0.4, 0.05, 0.4, topColor, 0, ly - 0.04, 0);
      }
      if (isReady) { // dates hanging
        box(0.06, 0.1, 0.06, 0x8B4513, 0.15, baseY + h * 0.75, 0);
        box(0.06, 0.1, 0.06, 0x8B4513, -0.12, baseY + h * 0.72, 0.1);
      }
      break;
    }

    case 'fig':
    case 'olive':
    case 'charoset': {
      // Round bushy tree
      box(0.15, h * 0.5, 0.15, 0x6D4C41, 0, baseY + h * 0.25, 0); // trunk
      const canopyS = 0.3 + progress * 0.3;
      box(canopyS, canopyS, canopyS, topColor, 0, baseY + h * 0.6, 0);
      if (progress > 0.5) box(canopyS * 0.8, canopyS * 0.7, canopyS * 0.8, leafColor, 0, baseY + h * 0.7, 0);
      if (isReady) {
        const fc = seedId === 'olive' ? 0x556B2F : seedId === 'fig' ? 0x4B0082 : 0x8B4513;
        box(0.08, 0.08, 0.08, fc, 0.12, baseY + h * 0.55, 0.1);
        box(0.08, 0.08, 0.08, fc, -0.1, baseY + h * 0.5, -0.08);
      }
      break;
    }

    case 'wheat': {
      // Multiple thin stalks
      for (let s = -1; s <= 1; s++) {
        box(0.05, h * 0.7, 0.05, stemColor, s * 0.1, baseY + h * 0.35, 0);
        if (progress > 0.4) box(0.08, h * 0.2, 0.08, plantColor, s * 0.1, baseY + h * 0.75, 0); // grain head
      }
      if (progress > 0.3) {
        box(0.05, h * 0.6, 0.05, stemColor, 0.05, baseY + h * 0.3, 0.08);
        if (progress > 0.5) box(0.08, h * 0.2, 0.08, plantColor, 0.05, baseY + h * 0.65, 0.08);
      }
      break;
    }

    // ─── PURIM SPECIALS ───
    case 'hamentash': {
      // Triangular shape (3 blocks arranged as triangle)
      const ts = 0.15 + progress * 0.2;
      box(0.08, h * 0.3, 0.08, stemColor, 0, baseY + h * 0.15, 0);
      box(ts * 2, ts * 0.4, ts, plantColor, 0, baseY + h * 0.4, 0); // base
      box(ts * 1.2, ts * 0.4, ts * 0.8, plantColor, 0, baseY + h * 0.55, 0); // middle
      box(ts * 0.5, ts * 0.3, ts * 0.5, topColor, 0, baseY + h * 0.65, 0); // top (filling)
      break;
    }

    case 'gragger': {
      // Stick with noisemaker on top
      box(0.08, h * 0.6, 0.08, 0x8B4513, 0, baseY + h * 0.3, 0); // handle
      const gs = 0.15 + progress * 0.2;
      box(gs, gs * 1.5, gs * 0.5, plantColor, 0, baseY + h * 0.7, 0); // gragger head
      if (isReady) box(gs * 0.3, gs * 0.3, gs * 0.8, topColor, 0, baseY + h * 0.7, 0); // spinner
      break;
    }

    case 'megillah': {
      // Scroll shape — two pillars with sheet between
      const ms = 0.1 + progress * 0.1;
      box(ms, h * 0.7, ms, 0x8B4513, -0.15, baseY + h * 0.35, 0); // left roller
      box(ms, h * 0.7, ms, 0x8B4513, 0.15, baseY + h * 0.35, 0); // right roller
      box(0.25, h * 0.6, 0.04, plantColor, 0, baseY + h * 0.32, 0); // parchment
      if (isReady) box(0.04, h * 0.5, 0.02, 0x333333, 0, baseY + h * 0.3, 0.03); // text lines
      break;
    }

    case 'mishloach': {
      // Gift basket
      box(0.35, 0.15, 0.25, 0x8B6914, 0, baseY + 0.1, 0); // basket base
      box(0.38, 0.04, 0.04, 0x8B6914, 0, baseY + 0.3, 0); // handle
      if (progress > 0.3) box(0.1, 0.12, 0.1, plantColor, -0.08, baseY + 0.22, 0);
      if (progress > 0.5) box(0.1, 0.1, 0.1, topColor, 0.08, baseY + 0.2, 0.04);
      if (isReady) box(0.08, 0.08, 0.08, 0xFF69B4, 0, baseY + 0.25, -0.04);
      break;
    }

    case 'crown': {
      // Crown shape — base + points
      box(0.1, h * 0.4, 0.1, 0x8B4513, 0, baseY + h * 0.2, 0); // cushion/stand
      const cs = 0.15 + progress * 0.15;
      box(cs * 2.5, cs * 0.5, cs * 2, plantColor, 0, baseY + h * 0.5, 0); // crown band
      if (progress > 0.4) { // crown points
        box(cs * 0.4, cs * 0.6, cs * 0.4, plantColor, -cs, baseY + h * 0.65, 0);
        box(cs * 0.4, cs * 0.8, cs * 0.4, plantColor, 0, baseY + h * 0.7, 0);
        box(cs * 0.4, cs * 0.6, cs * 0.4, plantColor, cs, baseY + h * 0.65, 0);
      }
      if (isReady) box(0.08, 0.08, 0.08, 0xFF0000, 0, baseY + h * 0.75, 0); // jewel
      break;
    }

    case 'mask': {
      // Mask on a stick
      box(0.06, h * 0.5, 0.06, 0x8B4513, 0.12, baseY + h * 0.25, 0); // stick
      const mks = 0.15 + progress * 0.15;
      box(mks * 2.5, mks * 1.5, 0.08, plantColor, 0, baseY + h * 0.6, 0); // mask face
      if (progress > 0.4) { // eye holes
        box(0.06, 0.06, 0.06, 0x000000, -mks * 0.5, baseY + h * 0.62, 0.03);
        box(0.06, 0.06, 0.06, 0x000000, mks * 0.5, baseY + h * 0.62, 0.03);
      }
      if (isReady) box(mks * 1.5, 0.04, 0.06, topColor, 0, baseY + h * 0.72, 0); // feather
      break;
    }

    // ─── PESACH ───
    case 'matza': {
      // Flat squares stacked
      const mzs = 0.2 + progress * 0.2;
      box(mzs, 0.05, mzs, plantColor, 0, baseY + 0.05, 0);
      if (progress > 0.3) box(mzs * 0.95, 0.05, mzs * 0.95, topColor, 0.02, baseY + 0.1, -0.02);
      if (progress > 0.6) box(mzs * 0.9, 0.05, mzs * 0.9, plantColor, -0.01, baseY + 0.15, 0.01);
      break;
    }

    case 'maror': {
      // Bitter herb bush — spiky leaves
      for (let a = 0; a < 5; a++) {
        const angle = (a / 5) * Math.PI * 2;
        const lx = Math.cos(angle) * 0.12;
        const lz = Math.sin(angle) * 0.12;
        box(0.08, h * 0.5 + a * 0.03, 0.04, plantColor, lx, baseY + h * 0.25, lz);
      }
      if (isReady) box(0.15, 0.08, 0.15, topColor, 0, baseY + h * 0.55, 0);
      break;
    }

    case 'wine': {
      // Grape vine on trellis
      box(0.08, h * 0.7, 0.08, stemColor, 0, baseY + h * 0.35, 0);
      if (progress > 0.3) box(0.5, 0.05, 0.08, stemColor, 0, baseY + h * 0.7, 0); // crossbar
      if (progress > 0.5) { // grape clusters
        const gs = 0.06 + progress * 0.04;
        box(gs, gs, gs, plantColor, -0.12, baseY + h * 0.55, 0);
        box(gs, gs, gs, plantColor, -0.12, baseY + h * 0.48, 0.05);
        box(gs, gs, gs, plantColor, 0.12, baseY + h * 0.52, 0);
        if (isReady) box(gs, gs, gs, plantColor, 0.12, baseY + h * 0.45, -0.04);
      }
      break;
    }

    // ─── CHANUKAH ───
    case 'sufganiya': {
      // Round donut shape
      const ds = 0.15 + progress * 0.2;
      box(ds * 2, ds, ds * 2, plantColor, 0, baseY + ds * 0.5, 0); // donut body
      if (progress > 0.5) box(ds * 1.5, 0.04, ds * 1.5, 0xFFF0E0, 0, baseY + ds + 0.01, 0); // sugar top
      if (isReady) box(0.06, 0.08, 0.06, topColor, 0, baseY + ds + 0.04, 0); // jelly dot
      break;
    }

    case 'menorah': {
      // Menorah shape — base + 9 branches
      box(0.3, 0.06, 0.12, plantColor, 0, baseY + 0.05, 0); // base
      box(0.06, h * 0.6, 0.06, plantColor, 0, baseY + h * 0.3, 0); // center
      if (progress > 0.3) {
        for (let b = -3; b <= 3; b++) {
          if (b === 0) continue;
          const bx = b * 0.06;
          box(0.04, h * 0.45, 0.04, plantColor, bx, baseY + h * 0.25, 0);
        }
      }
      if (isReady) { // flames
        for (let b = -3; b <= 3; b++) {
          box(0.03, 0.06, 0.03, topColor, b === 0 ? 0 : b * 0.06, baseY + h * 0.6, 0);
        }
        box(0.04, 0.08, 0.04, topColor, 0, baseY + h * 0.65, 0); // shamash taller
      }
      break;
    }

    // ─── ROSH HASHANA ───
    case 'apple_honey': {
      // Apple + honey jar
      const as = 0.12 + progress * 0.15;
      box(as, as, as, 0xFF4444, -0.1, baseY + as * 0.5, 0); // apple
      if (progress > 0.3) box(0.03, 0.08, 0.03, stemColor, -0.1, baseY + as + 0.04, 0); // apple stem
      if (progress > 0.5) {
        box(as * 0.8, as * 1.2, as * 0.8, topColor, 0.12, baseY + as * 0.6, 0); // honey jar
        if (isReady) box(as * 0.5, 0.04, as * 0.5, 0xFFD700, 0.12, baseY + as * 1.2 + 0.02, 0); // honey drip
      }
      break;
    }

    case 'pomegranate': {
      // Round fruit with crown top
      box(0.08, h * 0.3, 0.08, stemColor, 0, baseY + h * 0.15, 0);
      const ps = 0.15 + progress * 0.2;
      box(ps, ps * 1.2, ps, plantColor, 0, baseY + h * 0.45, 0);
      if (isReady) {
        box(ps * 0.3, 0.1, ps * 0.3, 0x8B0000, 0, baseY + h * 0.65, 0); // crown
        box(ps * 0.5, 0.04, ps * 0.5, topColor, 0, baseY + h * 0.68, 0);
      }
      break;
    }

    case 'shofar': {
      // Curved horn shape (approximated with angled blocks)
      box(0.12, h * 0.15, 0.12, plantColor, 0, baseY + 0.1, 0); // wide end
      box(0.1, h * 0.5, 0.1, plantColor, 0.08, baseY + h * 0.35, 0); // body
      if (progress > 0.4) box(0.07, h * 0.25, 0.07, topColor, 0.18, baseY + h * 0.6, 0); // mouthpiece
      break;
    }

    // ─── LAG B'OMER ───
    case 'bonfire': {
      // Stacked logs + fire
      box(0.3, 0.08, 0.08, 0x8B4513, 0, baseY + 0.06, -0.05);
      box(0.08, 0.08, 0.3, 0x8B4513, 0, baseY + 0.06, 0);
      box(0.25, 0.08, 0.08, 0x6D4C41, 0, baseY + 0.14, 0.03);
      if (progress > 0.3) {
        box(0.12, h * 0.4, 0.12, plantColor, 0, baseY + h * 0.3, 0); // fire core
        box(0.08, h * 0.3, 0.08, topColor, 0.06, baseY + h * 0.25, 0.04);
        if (isReady) box(0.06, h * 0.2, 0.06, 0xFFFF00, 0, baseY + h * 0.5, 0); // tip
      }
      break;
    }

    case 'bow': {
      // Bow + arrow shape
      box(0.04, h * 0.7, 0.04, plantColor, 0, baseY + h * 0.35, 0); // bow vertical
      if (progress > 0.3) {
        box(0.04, 0.04, 0.06, 0xDEB887, 0, baseY + h * 0.7, 0); // bow tip
        box(0.04, 0.04, 0.06, 0xDEB887, 0, baseY + h * 0.05, 0); // bow bottom
        box(0.02, h * 0.65, 0.02, 0xCCCCCC, 0.02, baseY + h * 0.35, 0); // string
      }
      if (progress > 0.6) box(0.03, 0.03, 0.4, topColor, 0, baseY + h * 0.4, 0); // arrow
      break;
    }

    // ─── SHAVUOT ───
    case 'cheesecake': {
      const cs = 0.15 + progress * 0.2;
      box(cs * 2, cs * 0.4, cs * 2, plantColor, 0, baseY + cs * 0.2, 0); // cake body
      if (progress > 0.4) box(cs * 2.1, 0.04, cs * 2.1, 0xFFE4B5, 0, baseY + cs * 0.42, 0); // crust top
      if (isReady) box(0.1, 0.1, 0.1, 0xFF6347, 0, baseY + cs * 0.5, 0); // strawberry on top
      break;
    }

    case 'milk_honey': {
      // Milk jug + honey pot
      box(0.12, h * 0.4, 0.12, 0xFFFFF0, -0.1, baseY + h * 0.2, 0); // milk
      if (progress > 0.3) box(0.04, 0.1, 0.04, 0xFFFFF0, -0.1, baseY + h * 0.42, 0); // spout
      if (progress > 0.5) box(0.1, h * 0.35, 0.1, topColor, 0.1, baseY + h * 0.18, 0); // honey
      if (isReady) box(0.15, 0.03, 0.03, 0xFFD700, 0.1, baseY + h * 0.35, 0.06); // drip
      break;
    }

    // ─── FALLBACK (generic plant for any new/unknown seeds) ───
    default: {
      box(0.12, h * 0.7, 0.12, stemColor, 0, baseY + h * 0.35, 0);
      const tw = 0.2 + progress * 0.25;
      box(tw, tw * 0.8, tw, plantColor, 0, baseY + h * 0.75, 0);
      if (progress > 0.3) {
        box(0.25, 0.06, 0.1, leafColor, 0.15, baseY + h * 0.3, 0);
        box(0.25, 0.06, 0.1, leafColor, -0.15, baseY + h * 0.4, 0);
      }
      break;
    }
  }

  return g;
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

    const plantGroup = buildPlantModel(plotData.seedId, seed, progress, isReady);

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
  // Prevent default touch behaviors on the canvas (pull-to-refresh, pinch zoom)
  renderer.domElement.addEventListener('touchstart', (e) => { if (started) e.preventDefault(); }, {passive: false});
  renderer.domElement.addEventListener('touchmove', (e) => { if (started) e.preventDefault(); }, {passive: false});
  document.body.addEventListener('gesturestart', (e) => e.preventDefault(), {passive: false});
  document.body.addEventListener('gesturechange', (e) => e.preventDefault(), {passive: false});

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
  isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // Force-show touch controls on mobile (CSS media query fallback)
  if (isMobile) {
    document.getElementById('touch-controls').style.display = 'block';
  }

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
        pitch = clamp(pitch, -0.6, 0.8);
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

// ─── Proximity / Interaction ───
function updateInteraction() {
  interactTarget = null;

  // Find closest plot by distance (proximity-based, no aiming needed)
  let closestDist = Infinity;
  let closestIdx = -1;

  for (let i = 0; i < plotMeshes.length; i++) {
    const pos = getPlotWorldPos(i);
    const dx = playerPos.x - pos.x;
    const dz = playerPos.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < closestDist) {
      closestDist = dist;
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
    animating = false;
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
  if (!animating || !renderer) return;
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

// ─── Save on exit / background ───
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && started) saveGame();
});
window.addEventListener('beforeunload', () => { if (started) saveGame(); });
window.addEventListener('pagehide', () => { if (started) saveGame(); });

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
  if (!startBtnBound) {
    startBtn.addEventListener('click', startGame);
    startBtnBound = true;
  }

  if (!animating) {
    animating = true;
    animate();
  }
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
