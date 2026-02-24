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
const SAVE_KEY = 'garden3d_save';
const AUTO_SAVE_SEC = 30;

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

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, PLAYER_HEIGHT, 8);

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

    const seed = SEEDS[plotData.seedId];
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
  // Pointer lock
  renderer.domElement.addEventListener('click', () => {
    if (!started) return;
    if (isAnyPanelOpen()) return;
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = clamp(pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  });

  document.addEventListener('keydown', (e) => {
    if (!started) return;
    switch(e.code) {
      case 'KeyW': moveForward = true; break;
      case 'KeyS': moveBackward = true; break;
      case 'KeyA': moveLeft = true; break;
      case 'KeyD': moveRight = true; break;
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
      case 'KeyW': moveForward = false; break;
      case 'KeyS': moveBackward = false; break;
      case 'KeyA': moveLeft = false; break;
      case 'KeyD': moveRight = false; break;
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

// ─── Player Update ───
function updatePlayer(dt) {
  // Direction from yaw
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

  if (moveDir.length() > 0) moveDir.normalize();

  // Apply movement
  camera.position.x += moveDir.x * PLAYER_SPEED * dt;
  camera.position.z += moveDir.z * PLAYER_SPEED * dt;

  // Gravity
  playerVelocity.y -= GRAVITY * dt;
  camera.position.y += playerVelocity.y * dt;

  // Ground collision
  if (camera.position.y <= PLAYER_HEIGHT) {
    camera.position.y = PLAYER_HEIGHT;
    playerVelocity.y = 0;
    playerOnGround = true;
  }

  // World bounds
  const bound = WORLD_SIZE / 2 - 1;
  camera.position.x = clamp(camera.position.x, -bound, bound);
  camera.position.z = clamp(camera.position.z, -bound, bound);

  // Camera rotation
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

// ─── Raycasting / Interaction ───
function updateInteraction() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
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
      const seed = SEEDS[plotData.seedId];
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
    hidePrompt();
    hidePlotLabel();
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
    const seed = SEEDS[seedId];
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
    growTime: SEEDS[seedId].growTime,
  };

  showToast('🌱', `Planted ${SEEDS[seedId].name}!`);
  updateHotbar();
  updatePlantMeshes();
  saveGame();
}

// ─── Harvesting ───
function harvestPlot(plotIndex) {
  const plotData = gameState.plots[plotIndex];
  if (!plotData) return;

  const seed = SEEDS[plotData.seedId];
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

function openShop() {
  if (document.pointerLockElement) document.exitPointerLock();
  closeAllPanels();

  const body = $('#shop-panel-body');
  body.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'shop-grid';

  SEED_LIST.forEach(seedId => {
    const seed = SEEDS[seedId];
    const canAfford = gameState.coins >= seed.seedCost;
    const owned = gameState.inventory[seedId] || 0;

    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="shop-emoji">${seed.emoji}</div>
      <div class="shop-name">${seed.name}</div>
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
        // Refresh shop
        openShop();
      }
    });

    grid.appendChild(card);
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
    const seed = SEEDS[seedId];
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
    const seed = SEEDS[seedId];
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

// ─── Save / Load ───
function saveGame() {
  try {
    const data = {
      coins: gameState.coins,
      inventory: gameState.inventory,
      plots: gameState.plots,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) { /* ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
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

  // Request pointer lock on desktop
  if (!isMobile) {
    renderer.domElement.requestPointerLock();
  }
}

// ─── Init ───
function init() {
  initScene();
  initLighting();
  buildWorld();

  // Load or init plots
  const loaded = loadGame();
  if (!loaded) {
    initPlots();
  }

  buildGardenPlots();
  updatePlantMeshes();
  initControls();
  updateHUD();
  updateHotbar();

  // Start button
  startBtn.addEventListener('click', startGame);

  // Start render loop
  animate();
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
