/* ============================================
   GROW A GARDEN 3D — Character skins
   Blocky Minecraft-style characters. Each builder adds meshes to the
   given group and sets userData = { armL, armR, legL, legR }.
   buildCharacter() then rigs the limbs on shoulder/hip pivots so hands
   and shoes swing together with the arms and legs.
   ============================================ */

const CHARACTER_SKINS = {
  farmer:  { name: 'Farmer',  emoji: '🧑‍🌾', cost: 0 },
  noob:    { name: 'Noob',    emoji: '🙂',   cost: 0 },
  ninja:   { name: 'Ninja',   emoji: '🥷',   cost: 10000 },
  sonic:   { name: 'Sonic',   emoji: '🦔',   cost: 10000 },
  kakashi: { name: 'Kakashi', emoji: '🥷',   cost: 15000 },
  mando:   { name: 'Mando',   emoji: '⚔️',   cost: 25000 },
};
const DEFAULT_SKIN = 'farmer';

function buildFarmerSkin(model) {
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
  model.add(head);

  // Eyes (on FRONT of face, +z)
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
  eyeL.position.set(-0.12, 1.6, 0.25);
  model.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
  eyeR.position.set(0.12, 1.6, 0.25);
  model.add(eyeR);

  // Hat (farmer\'s hat)
  const hatBrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.06, 0.8),
    new THREE.MeshLambertMaterial({ color: hatColor })
  );
  hatBrim.position.y = 1.82;
  hatBrim.castShadow = true;
  model.add(hatBrim);
  const hatTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.25, 0.45),
    new THREE.MeshLambertMaterial({ color: hatColor })
  );
  hatTop.position.y = 1.95;
  hatTop.castShadow = true;
  model.add(hatTop);

  // Body (shirt)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshLambertMaterial({ color: shirtColor })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  model.add(body);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
  const armMat = new THREE.MeshLambertMaterial({ color: shirtColor });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, 1.0, 0);
  armL.castShadow = true;
  model.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, 1.0, 0);
  armR.castShadow = true;
  model.add(armR);

  // Hands (skin)
  const handGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
  const handMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.35, 0.66, 0);
  model.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(0.35, 0.66, 0);
  model.add(handR);

  // Legs (pants)
  const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
  const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.45, 0);
  legL.castShadow = true;
  model.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.13, 0.45, 0);
  legR.castShadow = true;
  model.add(legR);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.1, 0.32);
  const shoeMat = new THREE.MeshLambertMaterial({ color: shoeColor });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.13, 0.15, -0.03);
  model.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.13, 0.15, -0.03);
  model.add(shoeR);

  model.userData = { armL, armR, legL, legR };
}

function buildNinjaSkin(model) {
  const ninjaBlack = 0x1a1a2e;
  const ninjaDark = 0x16213e;
  const beltColor = 0x8B0000;
  const skinColor = 0xD2A87A;

  // Head (masked)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: ninjaBlack })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  model.add(head);

  // Eyes (narrow, glowing)
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), eyeMat);
  eyeL.position.set(-0.12, 1.6, 0.26);
  model.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), eyeMat);
  eyeR.position.set(0.12, 1.6, 0.26);
  model.add(eyeR);

  // Headband (red)
  const headband = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 0.55),
    new THREE.MeshLambertMaterial({ color: beltColor })
  );
  headband.position.y = 1.68;
  model.add(headband);

  // Headband tail (two strips hanging back)
  const tailMat = new THREE.MeshLambertMaterial({ color: beltColor });
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.35), tailMat);
  tailL.position.set(-0.1, 1.66, -0.4);
  model.add(tailL);
  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.35), tailMat);
  tailR.position.set(0.06, 1.68, -0.45);
  model.add(tailR);

  // Body (ninja gi)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshLambertMaterial({ color: ninjaDark })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  model.add(body);

  // Belt
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.08, 0.32),
    new THREE.MeshLambertMaterial({ color: beltColor })
  );
  belt.position.y = 0.75;
  model.add(belt);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
  const armMat = new THREE.MeshLambertMaterial({ color: ninjaDark });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, 1.0, 0);
  armL.castShadow = true;
  model.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, 1.0, 0);
  armR.castShadow = true;
  model.add(armR);

  // Hands (skin showing through wraps)
  const handGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
  const handMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.35, 0.66, 0);
  model.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(0.35, 0.66, 0);
  model.add(handR);

  // Sword on back (diagonal)
  const swordBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.8, 0.03),
    new THREE.MeshLambertMaterial({ color: 0xC0C0C0 })
  );
  swordBlade.position.set(0.1, 1.4, -0.2);
  swordBlade.rotation.z = 0.3;
  model.add(swordBlade);
  const swordHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.2, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x5D4037 })
  );
  swordHandle.position.set(0.22, 1.85, -0.2);
  swordHandle.rotation.z = 0.3;
  model.add(swordHandle);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
  const legMat = new THREE.MeshLambertMaterial({ color: ninjaBlack });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.45, 0);
  legL.castShadow = true;
  model.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.13, 0.45, 0);
  legR.castShadow = true;
  model.add(legR);

  // Tabi boots
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.1, 0.32);
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.13, 0.15, -0.03);
  model.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.13, 0.15, -0.03);
  model.add(shoeR);

  model.userData = { armL, armR, legL, legR };
}

function buildSonicSkin(model) {
  const sonicBlue = 0x1565C0;
  const skinColor = 0xFFCC80;
  const shoeRed = 0xD32F2F;
  const gloveWhite = 0xFFFFFF;

  // Head (blue, rounder)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: sonicBlue })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  model.add(head);

  // Face (tan belly color on front)
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.05),
    new THREE.MeshLambertMaterial({ color: skinColor })
  );
  face.position.set(0, 1.53, 0.26);
  model.add(face);

  // Eyes (big green)
  const eyeWhiteL = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
  );
  eyeWhiteL.position.set(-0.08, 1.6, 0.29);
  model.add(eyeWhiteL);
  const eyeWhiteR = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
  );
  eyeWhiteR.position.set(0.08, 1.6, 0.29);
  model.add(eyeWhiteR);
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
  const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), pupilMat);
  pupilL.position.set(-0.06, 1.59, 0.32);
  model.add(pupilL);
  const pupilR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), pupilMat);
  pupilR.position.set(0.1, 1.59, 0.32);
  model.add(pupilR);

  // Spikes (3 blue quills going back)
  const spikeMat = new THREE.MeshLambertMaterial({ color: sonicBlue });
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.12, 0.5),
      spikeMat
    );
    spike.position.set(0, 1.65 - i * 0.15, -0.45 - i * 0.1);
    spike.rotation.x = -0.3;
    model.add(spike);
  }

  // Ears (two blue triangular blocks on top)
  const earL = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.2, 0.1),
    new THREE.MeshLambertMaterial({ color: sonicBlue })
  );
  earL.position.set(-0.22, 1.82, 0.05);
  model.add(earL);
  const earR = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.2, 0.1),
    new THREE.MeshLambertMaterial({ color: sonicBlue })
  );
  earR.position.set(0.22, 1.82, 0.05);
  model.add(earR);

  // Body (blue with tan belly)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.55, 0.3),
    new THREE.MeshLambertMaterial({ color: sonicBlue })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  model.add(body);
  const belly = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.4, 0.05),
    new THREE.MeshLambertMaterial({ color: skinColor })
  );
  belly.position.set(0, 1.0, 0.16);
  model.add(belly);

  // Arms (blue)
  const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
  const armMat = new THREE.MeshLambertMaterial({ color: sonicBlue });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.33, 1.0, 0);
  armL.castShadow = true;
  model.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.33, 1.0, 0);
  armR.castShadow = true;
  model.add(armR);

  // White gloves
  const handGeo = new THREE.BoxGeometry(0.22, 0.18, 0.22);
  const handMat = new THREE.MeshLambertMaterial({ color: gloveWhite });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.33, 0.68, 0);
  model.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(0.33, 0.68, 0);
  model.add(handR);

  // Legs (blue, shorter)
  const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.22);
  const legMat = new THREE.MeshLambertMaterial({ color: sonicBlue });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.12, 0.48, 0);
  legL.castShadow = true;
  model.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.12, 0.48, 0);
  legR.castShadow = true;
  model.add(legR);

  // Red shoes with white stripe
  const shoeGeo = new THREE.BoxGeometry(0.24, 0.14, 0.36);
  const shoeMat = new THREE.MeshLambertMaterial({ color: shoeRed });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.12, 0.22, 0);
  model.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.12, 0.22, 0);
  model.add(shoeR);
  // White stripe on shoes
  const stripeMat = new THREE.MeshLambertMaterial({ color: gloveWhite });
  const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.37), stripeMat);
  stripeL.position.set(-0.12, 0.22, 0);
  model.add(stripeL);
  const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.37), stripeMat);
  stripeR.position.set(0.12, 0.22, 0);
  model.add(stripeR);

  model.userData = { armL, armR, legL, legR };
}

function buildMandoSkin(model) {
  const beskarSilver = 0x8C8C8C;
  const beskarDark = 0x5A5A5A;
  const visorColor = 0x1a1a1a;
  const visorTint = 0x2a2a3a;
  const capeColor = 0x4a3728;
  const bootColor = 0x3d2b1f;
  const beltColor = 0x5D4037;
  const jetpackGray = 0x6B6B6B;

  // Helmet (T-visor Mandalorian style)
  const helmet = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.52, 0.52),
    new THREE.MeshLambertMaterial({ color: beskarSilver })
  );
  helmet.position.y = 1.55;
  helmet.castShadow = true;
  model.add(helmet);

  // T-visor (dark horizontal bar + vertical strip)
  const visorMat = new THREE.MeshLambertMaterial({ color: visorTint });
  const visorH = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.05), visorMat);
  visorH.position.set(0, 1.58, 0.27);
  model.add(visorH);
  const visorV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.05), visorMat);
  visorV.position.set(0, 1.5, 0.27);
  model.add(visorV);

  // Helmet cheek plates (slightly wider at bottom)
  const cheekMat = new THREE.MeshLambertMaterial({ color: beskarDark });
  const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.15), cheekMat);
  cheekL.position.set(-0.27, 1.48, 0.15);
  model.add(cheekL);
  const cheekR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.15), cheekMat);
  cheekR.position.set(0.27, 1.48, 0.15);
  model.add(cheekR);

  // Helmet crest (ridge on top)
  const crest = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.35),
    new THREE.MeshLambertMaterial({ color: beskarDark })
  );
  crest.position.set(0, 1.83, -0.05);
  model.add(crest);

  // Body (beskar chest plate)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshLambertMaterial({ color: beskarDark })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  model.add(body);

  // Chest plate (lighter beskar overlay)
  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.35, 0.05),
    new THREE.MeshLambertMaterial({ color: beskarSilver })
  );
  chestPlate.position.set(0, 1.05, 0.16);
  model.add(chestPlate);

  // Mudhorn signet (small gold detail on right chest)
  const signet = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.02),
    new THREE.MeshLambertMaterial({ color: 0xDAA520 })
  );
  signet.position.set(0.1, 1.1, 0.19);
  model.add(signet);

  // Belt
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.08, 0.32),
    new THREE.MeshLambertMaterial({ color: beltColor })
  );
  belt.position.y = 0.72;
  model.add(belt);

  // Belt pouches
  const pouchMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), pouchMat);
  pouchL.position.set(-0.2, 0.7, 0.15);
  model.add(pouchL);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), pouchMat);
  pouchR.position.set(0.2, 0.7, 0.15);
  model.add(pouchR);

  // Cape (hanging from shoulders, back)
  const cape = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.7, 0.06),
    new THREE.MeshLambertMaterial({ color: capeColor })
  );
  cape.position.set(0, 0.85, -0.18);
  cape.castShadow = true;
  model.add(cape);

  // Jetpack (on back, above cape)
  const jetpackBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.35, 0.15),
    new THREE.MeshLambertMaterial({ color: jetpackGray })
  );
  jetpackBody.position.set(0, 1.2, -0.22);
  model.add(jetpackBody);
  // Jetpack nozzle
  const nozzle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.08),
    new THREE.MeshLambertMaterial({ color: beskarDark })
  );
  nozzle.position.set(0, 1.0, -0.22);
  model.add(nozzle);
  // Jetpack top fin
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.15, 0.1),
    new THREE.MeshLambertMaterial({ color: jetpackGray })
  );
  fin.position.set(0, 1.45, -0.22);
  model.add(fin);

  // Arms (dark beskar)
  const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
  const armMat = new THREE.MeshLambertMaterial({ color: beskarDark });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, 1.0, 0);
  armL.castShadow = true;
  model.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, 1.0, 0);
  armR.castShadow = true;
  model.add(armR);

  // Vambraces (forearm armor — slightly lighter)
  const vambMat = new THREE.MeshLambertMaterial({ color: beskarSilver });
  const vambL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), vambMat);
  vambL.position.set(-0.35, 0.78, 0);
  model.add(vambL);
  const vambR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), vambMat);
  vambR.position.set(0.35, 0.78, 0);
  model.add(vambR);

  // Gloves (dark)
  const gloveMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const gloveL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), gloveMat);
  gloveL.position.set(-0.35, 0.64, 0);
  model.add(gloveL);
  const gloveR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), gloveMat);
  gloveR.position.set(0.35, 0.64, 0);
  model.add(gloveR);

  // Legs (dark pants with armor plates)
  const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
  const legMat = new THREE.MeshLambertMaterial({ color: beskarDark });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.45, 0);
  legL.castShadow = true;
  model.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.13, 0.45, 0);
  legR.castShadow = true;
  model.add(legR);

  // Knee plates (silver)
  const kneeMat = new THREE.MeshLambertMaterial({ color: beskarSilver });
  const kneeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), kneeMat);
  kneeL.position.set(-0.13, 0.42, 0.13);
  model.add(kneeL);
  const kneeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), kneeMat);
  kneeR.position.set(0.13, 0.42, 0.13);
  model.add(kneeR);

  // Boots (brown leather)
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.12, 0.32);
  const shoeMat = new THREE.MeshLambertMaterial({ color: bootColor });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.13, 0.14, -0.02);
  model.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.13, 0.14, -0.02);
  model.add(shoeR);

  model.userData = { armL, armR, legL, legR };
}

// Kakashi skin builder
function buildKakashiSkin(model) {
  const vestGreen = 0x556B2F;
  const navyBlue = 0x1a1a3e;
  const skinColor = 0xD2A87A;
  const maskColor = 0x2a2a4e;
  const headbandMetal = 0xA8A8A8;
  const silverHair = 0xC8C8D0;

  // Head (masked lower face)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: maskColor })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  model.add(head);

  // Silver/white spiky hair (tilted to one side - Kakashi style)
  const hairMat = new THREE.MeshLambertMaterial({ color: silverHair });
  const hairBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.52), hairMat);
  hairBase.position.y = 1.85;
  model.add(hairBase);
  // Spiky hair pieces leaning to the left
  const spike1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.12), hairMat);
  spike1.position.set(-0.15, 2.0, 0.05);
  spike1.rotation.z = 0.3;
  model.add(spike1);
  const spike2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), hairMat);
  spike2.position.set(-0.05, 2.05, -0.1);
  spike2.rotation.z = 0.2;
  model.add(spike2);
  const spike3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), hairMat);
  spike3.position.set(0.1, 1.98, 0.0);
  spike3.rotation.z = 0.4;
  model.add(spike3);
  const spike4 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), hairMat);
  spike4.position.set(-0.1, 1.95, -0.15);
  spike4.rotation.z = 0.25;
  model.add(spike4);

  // One visible eye (right) - the left is covered by headband
  const eyeR = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  eyeR.position.set(0.1, 1.58, 0.26);
  model.add(eyeR);

  // Sharingan eye (left, red, partially covered)
  const eyeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xCC0000 })
  );
  eyeL.position.set(-0.1, 1.58, 0.26);
  model.add(eyeL);

  // Headband (metal plate with slash)
  const headband = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.12, 0.55),
    new THREE.MeshLambertMaterial({ color: navyBlue })
  );
  headband.position.y = 1.68;
  model.add(headband);
  // Metal plate on front
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.1, 0.06),
    new THREE.MeshLambertMaterial({ color: headbandMetal })
  );
  plate.position.set(0, 1.68, 0.28);
  model.add(plate);
  // Headband tilted to cover left eye
  const coverStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.06),
    new THREE.MeshLambertMaterial({ color: navyBlue })
  );
  coverStrip.position.set(-0.12, 1.63, 0.28);
  model.add(coverStrip);

  // Flak jacket (green vest - Jonin style)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.35),
    new THREE.MeshLambertMaterial({ color: vestGreen })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  model.add(body);

  // Vest pockets (two small boxes on chest)
  const pocketMat = new THREE.MeshLambertMaterial({ color: 0x4a5e2f });
  const pocketL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.06), pocketMat);
  pocketL.position.set(-0.12, 1.1, 0.2);
  model.add(pocketL);
  const pocketR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.06), pocketMat);
  pocketR.position.set(0.12, 1.1, 0.2);
  model.add(pocketR);

  // Arms (navy blue sleeves)
  const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.2);
  const armMat = new THREE.MeshLambertMaterial({ color: navyBlue });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, 1.0, 0);
  armL.castShadow = true;
  model.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, 1.0, 0);
  armR.castShadow = true;
  model.add(armR);

  // Gloves (dark fingerless)
  const handGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
  const handMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const handL = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.35, 0.66, 0);
  model.add(handL);
  const handR = new THREE.Mesh(handGeo, handMat);
  handR.position.set(0.35, 0.66, 0);
  model.add(handR);

  // Legs (navy blue pants)
  const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
  const legMat = new THREE.MeshLambertMaterial({ color: navyBlue });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.45, 0);
  legL.castShadow = true;
  model.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.13, 0.45, 0);
  legR.castShadow = true;
  model.add(legR);

  // Sandals (shinobi)
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.1, 0.32);
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.13, 0.15, -0.03);
  model.add(shoeL);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.13, 0.15, -0.03);
  model.add(shoeR);

  // Kunai pouch on right leg
  const pouch = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.15),
    new THREE.MeshLambertMaterial({ color: 0x5D4037 })
  );
  pouch.position.set(0.22, 0.5, 0);
  model.add(pouch);

  model.userData = { armL, armR, legL, legR };
}

// The classic Roblox "Noob": yellow head and arms, blue shirt, green pants
function buildNoobSkin(model) {
  const yellow = 0xF5CD30, blue = 0x0D69AC, green = 0xA4BD47;
  const m = c => new THREE.MeshLambertMaterial({ color: c });
  const add = (w, h, d, c, x, y, z) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); mesh.position.set(x, y, z); model.add(mesh); return mesh; };
  add(0.46, 0.46, 0.46, yellow, 0, 1.55, 0);
  add(0.07, 0.1, 0.03, 0x111111, -0.1, 1.6, 0.24);
  add(0.07, 0.1, 0.03, 0x111111, 0.1, 1.6, 0.24);
  add(0.2, 0.04, 0.03, 0x111111, 0, 1.46, 0.24);
  add(0.04, 0.04, 0.03, 0x111111, -0.11, 1.48, 0.24);
  add(0.04, 0.04, 0.03, 0x111111, 0.11, 1.48, 0.24);
  add(0.5, 0.6, 0.3, blue, 0, 1.0, 0);
  const armL = add(0.22, 0.6, 0.24, yellow, -0.36, 1.0, 0);
  const armR = add(0.22, 0.6, 0.24, yellow, 0.36, 1.0, 0);
  const legL = add(0.24, 0.7, 0.28, green, -0.13, 0.35, 0);
  const legR = add(0.24, 0.7, 0.28, green, 0.13, 0.35, 0);
  model.userData = { armL, armR, legL, legR };
}

const SKIN_BUILDERS = {
  farmer: buildFarmerSkin,
  noob: buildNoobSkin,
  ninja: buildNinjaSkin,
  sonic: buildSonicSkin,
  mando: buildMandoSkin,
  kakashi: buildKakashiSkin,
};

// Move each limb (plus the hand / shoe / pads attached to it) under a pivot
// placed at the shoulder or hip, so rotation swings from the joint.
function rigLimbs(model) {
  const parts = model.userData || {};
  const rig = {};
  ['armL', 'armR', 'legL', 'legR'].forEach(key => {
    const limb = parts[key];
    if (!limb) return;
    limb.geometry.computeBoundingBox();
    const bb = limb.geometry.boundingBox;
    const isArm = key.startsWith('arm');
    const top = limb.position.y + bb.max.y;
    const bottom = limb.position.y + bb.min.y;
    const reachX = isArm ? 0.14 : 0.1;
    const members = model.children.filter(c => c.isMesh && (c === limb || (
      Math.abs(c.position.x - limb.position.x) < reachX &&
      c.position.y < top - 0.02 &&
      c.position.y > bottom - 0.3
    )));
    const pivot = new THREE.Group();
    pivot.position.set(limb.position.x, top - (isArm ? 0.05 : 0), limb.position.z);
    members.forEach(c => {
      model.remove(c);
      c.position.sub(pivot.position);
      pivot.add(c);
    });
    model.add(pivot);
    rig[key] = pivot;
  });
  model.userData = rig;
}

function buildCharacter(skinKey) {
  const model = new THREE.Group();
  (SKIN_BUILDERS[skinKey] || buildFarmerSkin)(model);
  rigLimbs(model);
  model.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return model;
}
