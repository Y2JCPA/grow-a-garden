/* ============================================
   GROW A GARDEN 3D — Pet models
   One parametric blocky builder for every pet. Models face +x.
   userData: { legs: [pivot...], tail, head, wings: [..], kind, mode }
   mode: 'walk' (legs swing), 'hop' (bunnies), 'fly' (bugs/bees), 'crawl'
   ============================================ */

function buildPetModel(petId) {
  const def = PETS[petId] || PETS.dog;
  const [main, dark, light] = def.colors;
  const g = new THREE.Group();
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const box = (w, h, d, c, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z); m.castShadow = true; (parent || g).add(m); return m;
  };
  const pivot = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); (parent || g).add(p); return p; };
  const eyes = (head, x, y, z, s) => {
    box(0.05 * s, 0.07 * s, 0.05 * s, 0x111111, x, y, z, head);
    box(0.05 * s, 0.07 * s, 0.05 * s, 0x111111, x, y, -z, head);
    box(0.02 * s, 0.03 * s, 0.02 * s, 0xffffff, x + 0.02 * s, y + 0.02 * s, z - 0.01 * s, head);
    box(0.02 * s, 0.03 * s, 0.02 * s, 0xffffff, x + 0.02 * s, y + 0.02 * s, -z + 0.01 * s, head);
  };
  const u = { legs: [], wings: [], kind: def.kind, mode: 'walk' };
  const kind = def.kind;

  // ─── Four-legged animals ───
  const QUAD = {
    dog:      { body: [0.6, 0.34, 0.32], leg: 0.22, head: 0.3, snout: 'long', ears: 'flop', tail: 'wag' },
    cat:      { body: [0.55, 0.3, 0.28], leg: 0.2, head: 0.28, snout: 'tiny', ears: 'point', tail: 'long' },
    bunny:    { body: [0.42, 0.32, 0.32], leg: 0.12, head: 0.3, snout: 'tiny', ears: 'long', tail: 'puff' },
    deer:     { body: [0.6, 0.32, 0.3], leg: 0.42, head: 0.26, snout: 'long', ears: 'point', tail: 'puff', antlers: true },
    pig:      { body: [0.62, 0.42, 0.42], leg: 0.16, head: 0.34, snout: 'pig', ears: 'point', tail: 'curl' },
    cow:      { body: [0.8, 0.46, 0.44], leg: 0.32, head: 0.36, snout: 'cow', ears: 'side', tail: 'long', horns: true },
    bear:     { body: [0.75, 0.48, 0.46], leg: 0.26, head: 0.38, snout: 'long', ears: 'round', tail: 'puff' },
    fox:      { body: [0.6, 0.3, 0.28], leg: 0.22, head: 0.28, snout: 'long', ears: 'point', tail: 'fluffy' },
    mouse:    { body: [0.36, 0.22, 0.22], leg: 0.08, head: 0.2, snout: 'tiny', ears: 'round', tail: 'thin' },
    squirrel: { body: [0.36, 0.26, 0.24], leg: 0.12, head: 0.22, snout: 'tiny', ears: 'point', tail: 'bushy' },
    monkey:   { body: [0.36, 0.42, 0.3], leg: 0.28, head: 0.3, snout: 'monkey', ears: 'side', tail: 'thin' },
    otter:    { body: [0.7, 0.24, 0.26], leg: 0.1, head: 0.24, snout: 'tiny', ears: 'round', tail: 'long' },
  };

  if (QUAD[kind]) {
    const q = QUAD[kind];
    const [bw, bh, bd] = q.body;
    const by = q.leg + bh / 2;
    const torso = pivot(0, 0, 0);
    box(bw, bh, bd, main, 0, by, 0, torso);
    box(bw * 0.8, bh * 0.25, bd * 0.85, light, 0, by - bh * 0.4, 0, torso);
    if (def.spots) {
      box(0.16, 0.12, bd + 0.01, kind === 'cow' ? dark : light, -bw * 0.15, by + bh * 0.15, 0, torso);
      box(0.12, 0.1, bd + 0.01, kind === 'cow' ? dark : light, bw * 0.2, by - bh * 0.05, 0, torso);
    }
    const hs = q.head;
    const head = pivot(bw / 2 + hs * 0.35, by + bh * 0.45, 0, torso);
    box(hs, hs, hs, main, 0, 0, 0, head);
    eyes(head, hs / 2, hs * 0.12, hs * 0.26, hs / 0.3);
    if (q.snout === 'long') { box(hs * 0.5, hs * 0.4, hs * 0.55, light, hs * 0.6, -hs * 0.15, 0, head); box(0.06, 0.06, 0.07, 0x222222, hs * 0.86, -hs * 0.05, 0, head); }
    if (q.snout === 'pig') { box(hs * 0.2, hs * 0.4, hs * 0.5, dark, hs * 0.58, -hs * 0.1, 0, head); }
    if (q.snout === 'cow') { box(hs * 0.3, hs * 0.45, hs * 0.8, light, hs * 0.6, -hs * 0.2, 0, head); }
    if (q.snout === 'monkey') { box(hs * 0.2, hs * 0.55, hs * 0.75, light, hs * 0.5, -hs * 0.05, 0, head); }
    if (q.snout === 'tiny') box(0.04, 0.04, 0.05, 0xF06292, hs * 0.52, -hs * 0.12, 0, head);
    const earY = hs * 0.5;
    if (q.ears === 'flop') { [-1, 1].forEach(sd => { const e = box(0.08, 0.2, 0.07, dark, -hs * 0.1, 0, sd * hs * 0.55, head); e.rotation.x = sd * 0.3; }); }
    if (q.ears === 'point') [-1, 1].forEach(sd => box(0.08, 0.14, 0.1, dark, -hs * 0.1, earY + 0.05, sd * hs * 0.3, head));
    if (q.ears === 'long') { u.mode = 'hop'; [-1, 1].forEach(sd => { box(0.07, 0.34, 0.11, main, -hs * 0.15, earY + 0.16, sd * hs * 0.22, head); box(0.075, 0.24, 0.06, dark, -hs * 0.12, earY + 0.16, sd * hs * 0.22, head); }); }
    if (q.ears === 'round') [-1, 1].forEach(sd => box(0.06, 0.12, 0.12, dark, -hs * 0.1, earY, sd * hs * 0.38, head));
    if (q.ears === 'side') [-1, 1].forEach(sd => box(0.08, 0.08, 0.16, dark, -hs * 0.05, hs * 0.2, sd * hs * 0.6, head));
    if (q.antlers) [-1, 1].forEach(sd => { box(0.04, 0.25, 0.04, 0xD7CCC8, -hs * 0.1, earY + 0.15, sd * hs * 0.25, head); box(0.04, 0.04, 0.16, 0xD7CCC8, -hs * 0.1, earY + 0.24, sd * hs * 0.32, head); });
    if (q.horns) [-1, 1].forEach(sd => box(0.05, 0.12, 0.05, 0xFFF8E1, -hs * 0.1, earY + 0.04, sd * hs * 0.4, head));
    // legs (pivot at hip, swing around z)
    const lx = bw * 0.32, lz = bd * 0.3;
    [[lx, lz], [lx, -lz], [-lx, lz], [-lx, -lz]].forEach(([x, z]) => {
      const p = pivot(x, q.leg, z);
      box(0.09, q.leg, 0.09, kind === 'pig' || kind === 'cow' ? dark : main, 0, -q.leg / 2, 0, p);
      u.legs.push(p);
    });
    const tail = pivot(-bw / 2, by + bh * 0.2, 0, torso);
    if (q.tail === 'wag' || q.tail === 'long' || q.tail === 'thin') { box(0.06, 0.06, 0.06, main, -0.03, 0, 0, tail); box(0.06, q.tail === 'wag' ? 0.22 : 0.3, 0.06, q.tail === 'thin' ? dark : main, -0.08, 0.1, 0, tail); tail.rotation.z = 0.7; }
    if (q.tail === 'puff') box(0.12, 0.12, 0.12, light, -0.04, 0, 0, tail);
    if (q.tail === 'curl') box(0.08, 0.08, 0.08, dark, -0.04, 0.04, 0, tail);
    if (q.tail === 'fluffy') { box(0.3, 0.14, 0.14, main, -0.16, 0.02, 0, tail); box(0.1, 0.12, 0.12, light, -0.34, 0.02, 0, tail); tail.rotation.z = 0.4; }
    if (q.tail === 'bushy') { box(0.14, 0.4, 0.18, main, -0.08, 0.2, 0, tail); box(0.14, 0.12, 0.18, light, -0.1, 0.42, 0, tail); }
    u.torso = torso; u.head = head; u.tail = tail;
    u.height = by + bh + hs;
  } else if (kind === 'bird') {
    const torso = pivot(0, 0, 0);
    box(0.38, 0.34, 0.3, main, 0, 0.36, 0, torso);
    const head = pivot(0.2, 0.62, 0, torso);
    box(0.22, 0.24, 0.2, main, 0, 0, 0, head);
    box(0.1, 0.06, 0.08, light === 0x1B5E20 ? 0xFFB300 : light, 0.15, -0.02, 0, head);
    box(0.08, 0.12, 0.05, dark, 0.04, 0.15, 0, head);
    box(0.05, 0.1, 0.05, dark, 0.12, -0.12, 0, head);
    eyes(head, 0.11, 0.04, 0.07, 0.8);
    const tail = pivot(-0.2, 0.45, 0, torso);
    box(0.14, 0.26, 0.2, light === 0x1B5E20 ? light : main, -0.04, 0.12, 0, tail);
    [-1, 1].forEach(sd => { const w = pivot(0, 0.42, sd * 0.16, torso); box(0.26, 0.18, 0.04, main, -0.02, 0, 0, w); u.wings.push(w); });
    [0.06, -0.06].forEach(z => { const p = pivot(0, 0.2, z); box(0.04, 0.2, 0.04, 0xFFB300, 0, -0.1, 0, p); u.legs.push(p); });
    u.torso = torso; u.head = head; u.tail = tail; u.height = 0.9;
  } else if (kind === 'turtle') {
    const torso = pivot(0, 0, 0);
    box(0.6, 0.24, 0.5, dark, 0, 0.2, 0, torso);
    box(0.5, 0.12, 0.42, main, 0, 0.36, 0, torso);
    box(0.2, 0.04, 0.2, light, 0.08, 0.43, 0.08, torso);
    const head = pivot(0.36, 0.22, 0, torso);
    box(0.18, 0.16, 0.18, 0x9CCC65, 0, 0, 0, head);
    eyes(head, 0.09, 0.03, 0.06, 0.7);
    [[0.2, 0.22], [0.2, -0.22], [-0.2, 0.22], [-0.2, -0.22]].forEach(([x, z]) => { const p = pivot(x, 0.12, z); box(0.12, 0.12, 0.12, 0x9CCC65, 0, -0.06, 0, p); u.legs.push(p); });
    u.torso = torso; u.head = head; u.height = 0.6;
  } else if (kind === 'snail' || kind === 'caterpillar') {
    u.mode = 'crawl';
    const torso = pivot(0, 0, 0);
    if (kind === 'snail') {
      box(0.6, 0.12, 0.22, light, 0.05, 0.06, 0, torso);
      box(0.38, 0.38, 0.24, main, -0.05, 0.3, 0, torso);
      box(0.2, 0.2, 0.26, dark, -0.05, 0.3, 0, torso);
      const head = pivot(0.3, 0.16, 0, torso);
      [-1, 1].forEach(sd => { box(0.03, 0.18, 0.03, light, 0.02, 0.1, sd * 0.06, head); box(0.05, 0.05, 0.05, 0x111111, 0.02, 0.2, sd * 0.06, head); });
      u.head = head;
    } else {
      for (let i = 0; i < 5; i++) box(0.17, 0.17, 0.2, i % 2 ? main : dark, -0.32 + i * 0.16, 0.09 + (i === 4 ? 0.05 : 0), 0, torso);
      const head = pivot(0.38, 0.2, 0, torso);
      box(0.2, 0.2, 0.22, light, 0, 0, 0, head);
      eyes(head, 0.1, 0.03, 0.06, 0.7);
      u.head = head;
    }
    u.torso = torso; u.height = 0.5;
  } else if (kind === 'ant' || kind === 'mantis') {
    const torso = pivot(0, 0, 0);
    const mantis = kind === 'mantis';
    box(0.26, 0.2, 0.2, main, -0.22, 0.25, 0, torso);
    box(0.18, mantis ? 0.34 : 0.14, 0.14, main, 0, mantis ? 0.36 : 0.25, 0, torso);
    const head = pivot(mantis ? 0.12 : 0.18, mantis ? 0.58 : 0.28, 0, torso);
    box(0.16, 0.14, 0.18, dark, 0, 0, 0, head);
    box(0.05, 0.05, 0.05, mantis ? 0x111111 : 0xFFEB3B, 0.07, 0.03, 0.08, head);
    box(0.05, 0.05, 0.05, mantis ? 0x111111 : 0xFFEB3B, 0.07, 0.03, -0.08, head);
    [-1, 1].forEach(sd => box(0.02, 0.16, 0.02, dark, 0.04, 0.12, sd * 0.05, head));
    if (mantis) [-1, 1].forEach(sd => box(0.2, 0.04, 0.04, light, 0.16, 0.42, sd * 0.07, torso));
    [-0.12, 0, 0.12].forEach(x => [-1, 1].forEach(sd => { const p = pivot(x, 0.24, sd * 0.08); const l = box(0.03, 0.03, 0.22, dark, 0, -0.06, sd * 0.1, p); l.rotation.x = -sd * 0.6; u.legs.push(p); }));
    u.torso = torso; u.head = head; u.height = 0.6;
  } else { // bee / dragonfly — flying
    u.mode = 'fly';
    const torso = pivot(0, 0, 0);
    if (kind === 'bee') {
      box(0.34, 0.26, 0.26, main, 0, 0, 0, torso);
      box(0.08, 0.27, 0.27, dark, -0.05, 0, 0, torso); box(0.08, 0.27, 0.27, dark, 0.09, 0, 0, torso);
      box(0.06, 0.06, 0.06, dark, -0.2, 0, 0, torso);
    } else {
      box(0.6, 0.08, 0.08, main, -0.15, 0, 0, torso);
      box(0.12, 0.12, 0.12, dark, 0.16, 0, 0, torso);
    }
    const head = pivot(kind === 'bee' ? 0.2 : 0.24, 0.02, 0, torso);
    box(0.16, 0.16, 0.18, kind === 'bee' ? dark : main, 0, 0, 0, head);
    eyes(head, 0.08, 0.02, 0.06, 0.7);
    [-1, 1].forEach(sd => {
      const w = pivot(0.02, 0.1, sd * 0.1, torso);
      const wm = new THREE.Mesh(new THREE.BoxGeometry(kind === 'bee' ? 0.18 : 0.14, 0.02, kind === 'bee' ? 0.26 : 0.5), new THREE.MeshLambertMaterial({ color: light, transparent: true, opacity: 0.75 }));
      wm.position.set(0, 0, sd * (kind === 'bee' ? 0.12 : 0.25)); w.add(wm);
      u.wings.push(w);
    });
    u.torso = torso; u.head = head; u.height = 1.4;
  }
  g.userData = u;
  return g;
}

// Pick a pet from an egg's weighted table
function rollEgg(eggId) {
  const pets = EGGS[eggId].pets;
  const total = Object.values(pets).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [id, w] of Object.entries(pets)) { r -= w; if (r <= 0) return id; }
  return Object.keys(pets)[0];
}
