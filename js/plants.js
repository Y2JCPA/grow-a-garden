/* ============================================
   GROW A GARDEN 3D — Plant models
   Every seed has its own blocky model. All boxes of a plant are merged
   into one geometry (VoxelBatch) so each plant costs a single draw call.
   ============================================ */

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Returns a BufferGeometry for the plant at the given growth progress (0..1)
function buildPlantGeometry(seedId, seed, progress, isReady) {
  const batch = new VoxelBatch(6);
  const baseY = 0.32;
  const h = 0.15 + progress * 1.0; // overall height scale
  const plantColor = isReady ? seed.color : lerpColor(0x8BC34A, seed.color, progress);
  const topColor = isReady ? (seed.topColor || seed.color) : lerpColor(0x8BC34A, seed.topColor || seed.color, progress);
  const stemColor = 0x33691E;
  const leafColor = 0x4CAF50;

  function box(w, bh, d, color, x, y, z, rx, ry, rz) {
    batch.box(w, bh, d, color, x, y, z, rx, ry, rz);
  }

  // Tiny sprout for the very first moments
  if (progress < 0.12) {
    box(0.06, 0.12 + progress * 1.2, 0.06, 0x7CB342, 0, baseY + 0.06 + progress * 0.6, 0);
    box(0.16, 0.04, 0.07, 0x8BC34A, 0.06, baseY + 0.12 + progress * 1.2, 0);
    box(0.07, 0.04, 0.16, 0x8BC34A, -0.03, baseY + 0.1 + progress * 1.2, 0.04);
    return batch.build();
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

    // ─── NEW CROPS ───
    case 'corn': {
      box(0.12, h * 1.1, 0.12, 0x7CB342, 0, baseY + h * 0.55, 0);
      if (progress > 0.25) {
        box(0.4, 0.05, 0.1, leafColor, 0.18, baseY + h * 0.35, 0);
        box(0.1, 0.05, 0.4, leafColor, 0, baseY + h * 0.55, 0.18);
      }
      if (progress > 0.5) {
        box(0.12, 0.3 * progress, 0.12, plantColor, 0.1, baseY + h * 0.7, 0);
        box(0.13, 0.08, 0.13, 0x8BC34A, 0.1, baseY + h * 0.7 - 0.15 * progress, 0);
      }
      if (isReady) box(0.06, 0.12, 0.06, topColor, 0, baseY + h * 1.15, 0);
      break;
    }

    case 'watermelon': {
      box(0.5, 0.04, 0.12, leafColor, 0, baseY + 0.03, 0.2);
      box(0.12, 0.04, 0.5, leafColor, -0.2, baseY + 0.03, 0);
      const ws = 0.15 + progress * 0.35;
      box(ws * 1.3, ws, ws, plantColor, 0.05, baseY + ws / 2, -0.05);
      if (progress > 0.5) {
        for (let i = -1; i <= 1; i++) box(ws * 1.32, ws * 1.02, 0.04, 0x1B5E20, 0.05, baseY + ws / 2, -0.05 + i * ws * 0.3);
      }
      break;
    }

    case 'dragonfruit': {
      box(0.16, h * 0.7, 0.16, 0x2E7D32, 0, baseY + h * 0.35, 0);
      box(0.3, 0.1, 0.1, 0x388E3C, 0.15, baseY + h * 0.45, 0, 0, 0, 0.5);
      box(0.1, 0.1, 0.3, 0x388E3C, 0, baseY + h * 0.55, -0.15);
      if (progress > 0.45) {
        const fs = 0.12 + progress * 0.14;
        box(fs, fs * 1.2, fs, plantColor, 0, baseY + h * 0.75, 0);
        box(fs * 0.4, 0.08, fs * 0.4, topColor, fs * 0.55, baseY + h * 0.75, 0);
        box(fs * 0.4, 0.08, fs * 0.4, topColor, -fs * 0.55, baseY + h * 0.8, 0);
        box(fs * 0.4, fs * 0.4, 0.08, topColor, 0, baseY + h * 0.7, fs * 0.55);
      }
      break;
    }

    case 'candy_blossom': {
      box(0.14, h * 0.8, 0.14, 0xF8BBD0, 0, baseY + h * 0.4, 0);
      box(0.15, 0.04, 0.15, 0xF06292, 0, baseY + h * 0.2, 0);
      box(0.15, 0.04, 0.15, 0xF06292, 0, baseY + h * 0.5, 0);
      if (progress > 0.35) {
        const cs = 0.25 + progress * 0.35;
        box(cs, cs * 0.7, cs, plantColor, 0, baseY + h * 0.9, 0);
        box(cs * 0.6, cs * 0.5, cs * 0.6, topColor, cs * 0.35, baseY + h * 0.95, 0.1);
        box(cs * 0.5, cs * 0.5, cs * 0.5, 0xFFF59D, -cs * 0.3, baseY + h, -0.05);
      }
      if (isReady) {
        box(0.08, 0.08, 0.08, 0xFF5252, 0.25, baseY + h * 0.7, 0.2);
        box(0.08, 0.08, 0.08, 0x40C4FF, -0.22, baseY + h * 0.75, -0.18);
      }
      break;
    }

    case 'star_fruit': {
      box(0.12, h * 0.75, 0.12, 0x5D4037, 0, baseY + h * 0.37, 0);
      box(0.5, 0.25, 0.5, 0x43A047, 0, baseY + h * 0.75, 0);
      if (progress > 0.5) {
        const ss = 0.1 + progress * 0.1;
        [[0.3, 0.1], [-0.28, -0.12], [0.05, 0.3]].forEach(([sx, sz], i) => {
          const y = baseY + h * 0.6 - i * 0.04;
          box(ss * 1.6, ss * 0.5, ss * 0.5, plantColor, sx, y, sz);
          box(ss * 0.5, ss * 1.6, ss * 0.5, topColor, sx, y, sz);
          box(ss * 0.5, ss * 0.5, ss * 1.6, plantColor, sx, y, sz);
        });
      }
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

  return batch.build();
}

/* ─────────────────────────────────────────────
   Roblox "Grow a Garden" seed models (world units).
   buildSeedModel() returns { geometry, slots } — slots are where fruit grows
   on multi-harvest plants (fruit is drawn separately so each one can have
   its own size and mutation).
   ───────────────────────────────────────────── */
const FRUIT_SHAPES = {
  strawberry: [0.2, 0.22, 0.2], blueberry: [0.14, 0.14, 0.14], tomato: [0.26, 0.24, 0.26],
  corn: [0.18, 0.46, 0.18], apple: [0.3, 0.3, 0.3], coconut: [0.4, 0.4, 0.4], cactus: [0.22, 0.3, 0.22],
  dragon_fruit: [0.32, 0.4, 0.32], mango: [0.3, 0.38, 0.28], grape: [0.3, 0.42, 0.3], pepper: [0.14, 0.42, 0.14],
  cacao: [0.24, 0.4, 0.24], beanstalk: [0.18, 0.55, 0.18],
  // the Seven Species
  olive: [0.13, 0.17, 0.13], fig: [0.22, 0.27, 0.22], pomegranate: [0.3, 0.3, 0.3], gefen: [0.3, 0.42, 0.3], date_palm: [0.26, 0.5, 0.26],
};

function buildSeedModel(seedId, seed, progress, ripe) {
  const b = new VoxelBatch(5);
  const slots = [];
  const p = Math.max(0, Math.min(1, progress));
  const leaf = 0x43A047, leafD = 0x2E7D32, leafL = 0x66BB6A, wood = 0x6D4C41;
  const col = ripe || !seed.topColor ? seed.color : lerpColor(0x7CB342, seed.color, Math.min(1, p * 1.2));

  // Sprout stage looks the same for every seed
  if (p < 0.15) {
    const h = 0.12 + p * 1.5;
    b.box(0.06, h, 0.06, 0x7CB342, 0, h / 2, 0);
    b.box(0.2, 0.04, 0.08, 0x8BC34A, 0.07, h, 0);
    b.box(0.08, 0.04, 0.2, 0x8BC34A, -0.03, h - 0.03, 0.05);
    return { geometry: b.build(), slots };
  }

  switch (seedId) {
    case 'carrot': {
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        b.box(0.06, 0.45, 0.06, i % 2 ? leaf : leafL, Math.cos(a) * 0.06, 0.32, Math.sin(a) * 0.06, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      }
      b.box(0.26, 0.16, 0.26, col, 0, 0.06, 0);
      b.box(0.2, 0.06, 0.2, lerpColor(col, 0xffffff, 0.15), 0, 0.15, 0);
      break;
    }
    case 'orange_tulip': case 'daffodil': {
      const tulip = seedId === 'orange_tulip';
      b.box(0.06, 0.75, 0.06, leafD, 0, 0.375, 0);
      b.box(0.08, 0.4, 0.2, leaf, 0.06, 0.22, 0, 0, 0, -0.3);
      b.box(0.08, 0.35, 0.2, leaf, -0.06, 0.2, 0, 0, 0, 0.3);
      if (tulip) {
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI * 2;
          b.box(0.16, 0.3, 0.06, col, Math.cos(a) * 0.09, 0.88, Math.sin(a) * 0.09, 0, -a + Math.PI / 2, 0);
        }
        b.box(0.16, 0.12, 0.16, lerpColor(col, 0x000000, 0.15), 0, 0.76, 0);
      } else {
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          b.box(0.22, 0.04, 0.12, col, Math.cos(a) * 0.14, 0.82, Math.sin(a) * 0.14, 0, -a, 0);
        }
        b.box(0.14, 0.18, 0.14, seed.topColor, 0, 0.9, 0);
      }
      break;
    }
    case 'watermelon': case 'pumpkin': {
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2 + 0.4;
        b.box(0.7, 0.05, 0.12, leafD, Math.cos(a) * 0.45, 0.04, Math.sin(a) * 0.45, 0, -a, 0);
        b.box(0.3, 0.04, 0.3, leaf, Math.cos(a) * 0.7, 0.07, Math.sin(a) * 0.7);
      }
      const s = 0.3 + p * 0.7;
      if (seedId === 'watermelon') {
        b.box(0.9 * s, 0.62 * s, 0.62 * s, col, 0, 0.31 * s, 0);
        for (let i = -1; i <= 1; i++) b.box(0.92 * s, 0.64 * s, 0.07 * s, 0x1B5E20, 0, 0.31 * s, i * 0.2 * s);
      } else {
        b.box(0.8 * s, 0.55 * s, 0.6 * s, col, 0, 0.28 * s, 0);
        b.box(0.6 * s, 0.6 * s, 0.8 * s, lerpColor(col, 0x000000, 0.08), 0, 0.3 * s, 0);
        b.box(0.08, 0.18, 0.08, 0x558B2F, 0, 0.62 * s, 0);
      }
      break;
    }
    case 'bamboo': {
      [[0, 0, 3.2], [0.3, 0.15, 2.6], [-0.25, 0.2, 2.9], [0.1, -0.3, 2.3]].forEach(([x, z, h]) => {
        const hh = h * (0.3 + p * 0.7);
        b.box(0.16, hh, 0.16, col, x, hh / 2, z);
        for (let y = 0.5; y < hh; y += 0.55) b.box(0.19, 0.05, 0.19, 0x558B2F, x, y, z);
        b.box(0.35, 0.03, 0.1, leafL, x + 0.2, hh * 0.8, z, 0, 0.5, 0.3);
        b.box(0.35, 0.03, 0.1, leafL, x - 0.2, hh * 0.65, z, 0, -0.4, -0.3);
      });
      break;
    }
    case 'mushroom': {
      const s = 0.35 + p * 0.65;
      b.box(0.45 * s, 0.9 * s, 0.45 * s, 0xFFF3E0, 0, 0.45 * s, 0);
      b.box(1.5 * s, 0.35 * s, 1.5 * s, col, 0, 1.0 * s, 0);
      b.box(1.0 * s, 0.25 * s, 1.0 * s, col, 0, 1.28 * s, 0);
      [[0.4, 0.3], [-0.45, 0.1], [0.1, -0.5], [-0.2, 0.5], [0.5, -0.35]].forEach(([x, z]) => b.box(0.2 * s, 0.05, 0.2 * s, 0xFFFFFF, x * s, 1.19 * s, z * s));
      [[0.2, 0.2], [-0.25, -0.15]].forEach(([x, z]) => b.box(0.18 * s, 0.05, 0.18 * s, 0xFFFFFF, x * s, 1.42 * s, z * s));
      break;
    }
    case 'strawberry': case 'blueberry': case 'pepper': {
      const berry = seedId !== 'pepper';
      const w = seedId === 'blueberry' ? 0.9 : 0.8, h = seedId === 'blueberry' ? 0.75 : seedId === 'pepper' ? 0.9 : 0.4;
      b.box(w, h * 0.7, w, leafD, 0, h * 0.35, 0);
      b.box(w * 0.8, h * 0.3, w * 1.1, leaf, 0, h * 0.75, 0);
      b.box(w * 1.1, h * 0.3, w * 0.75, leafL, 0, h * 0.6, 0);
      if (seedId === 'strawberry') [[0.3, 0.3], [-0.35, 0.1], [0.05, -0.38]].forEach(([x, z]) => b.box(0.1, 0.05, 0.1, 0xFFFFFF, x, h + 0.03, z));
      const n = seed.maxFruits;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + 0.3;
        const r = w * 0.58;
        slots.push([Math.cos(a) * r, berry ? h * (0.35 + (i % 2) * 0.3) : h * 0.45, Math.sin(a) * r]);
      }
      break;
    }
    case 'tomato': {
      b.box(0.08, 1.7, 0.08, 0xA1887F, 0, 0.85, 0);
      for (let y = 0.25; y < 1.6; y += 0.35) {
        b.box(0.5, 0.2, 0.22, y % 0.7 < 0.35 ? leaf : leafD, 0.12, y, 0, 0, 0, 0.3);
        b.box(0.22, 0.2, 0.5, leafL, -0.08, y + 0.15, 0.06, 0.3, 0, 0);
      }
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i * 2.1;
        slots.push([Math.cos(a) * 0.3, 0.35 + i * 0.22, Math.sin(a) * 0.3]);
      }
      break;
    }
    case 'corn': {
      b.box(0.14, 2.2, 0.14, col, 0, 1.1, 0);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3;
        b.box(0.7, 0.04, 0.14, i % 2 ? leaf : leafL, Math.cos(a) * 0.3, 0.4 + i * 0.35, Math.sin(a) * 0.3, 0, -a, 0.35);
      }
      b.box(0.06, 0.3, 0.06, 0xD7CCC8, 0, 2.35, 0);
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i / seed.maxFruits * Math.PI * 2;
        slots.push([Math.cos(a) * 0.17, 1.0 + (i % 2) * 0.35, Math.sin(a) * 0.17]);
      }
      break;
    }
    case 'apple': case 'mango': case 'cacao': {
      const trunkH = seedId === 'cacao' ? 2.0 : 1.5;
      b.box(0.32, trunkH, 0.32, wood, 0, trunkH / 2, 0);
      if (seedId === 'cacao') {
        b.box(1.5, 0.6, 1.5, leafD, 0, trunkH + 0.3, 0);
        b.box(0.9, 0.4, 0.9, leaf, 0.2, trunkH + 0.75, -0.1);
        for (let i = 0; i < seed.maxFruits; i++) {
          const a = i / seed.maxFruits * Math.PI * 2;
          slots.push([Math.cos(a) * 0.24, 0.6 + i * 0.32, Math.sin(a) * 0.24]);
        }
      } else {
        const c1 = seedId === 'mango' ? 0x2E7D32 : leaf;
        b.box(2.0, 1.2, 2.0, c1, 0, trunkH + 0.6, 0);
        b.box(1.4, 0.6, 1.4, lerpColor(c1, 0xffffff, 0.12), 0.1, trunkH + 1.45, -0.1);
        b.box(0.8, 0.3, 2.2, c1, 0, trunkH + 0.5, 0);
        for (let i = 0; i < seed.maxFruits; i++) {
          const a = i / seed.maxFruits * Math.PI * 2 + 0.4;
          slots.push(seedId === 'mango'
            ? [Math.cos(a) * 0.8, trunkH - 0.15, Math.sin(a) * 0.8]
            : [Math.cos(a) * 1.05, trunkH + 0.35 + (i % 2) * 0.45, Math.sin(a) * 1.05]);
        }
      }
      break;
    }
    case 'coconut': {
      let x = 0, y = 0;
      for (let i = 0; i < 7; i++) { b.box(0.32, 0.5, 0.32, i % 2 ? 0x8D6E63 : 0x795548, x, y + 0.25, 0); x += 0.07; y += 0.45; }
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        b.box(1.3, 0.06, 0.32, i % 2 ? leaf : leafL, x + Math.cos(a) * 0.6, y + 0.05, Math.sin(a) * 0.6, 0, -a, -0.35);
      }
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i / seed.maxFruits * Math.PI * 2 + 0.6;
        slots.push([x + Math.cos(a) * 0.3, y - 0.3, Math.sin(a) * 0.3]);
      }
      break;
    }
    case 'cactus': case 'dragon_fruit': {
      const green = seedId === 'cactus' ? 0x2E7D32 : 0x558B2F;
      if (seedId === 'cactus') {
        b.box(0.5, 2.0, 0.5, green, 0, 1.0, 0);
        b.box(0.5, 0.3, 0.3, green, 0.35, 0.9, 0); b.box(0.3, 0.7, 0.3, green, 0.5, 1.3, 0);
        b.box(0.5, 0.3, 0.3, green, -0.35, 1.2, 0); b.box(0.3, 0.6, 0.3, green, -0.5, 1.55, 0);
        for (let y = 0.3; y < 2; y += 0.4) b.box(0.52, 0.04, 0.52, 0x1B5E20, 0, y, 0);
        slots.push([0, 2.15, 0], [0.5, 1.8, 0], [-0.5, 2.0, 0]);
      } else {
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI * 2 + 0.3;
          b.box(0.22, 1.3, 0.22, green, Math.cos(a) * 0.25, 0.6, Math.sin(a) * 0.25, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
          slots.push([Math.cos(a) * 0.55, 1.35, Math.sin(a) * 0.55]);
        }
        b.box(0.4, 0.5, 0.4, green, 0, 0.25, 0);
      }
      break;
    }
    // ─── The Seven Species (Devarim 8:8) ───
    case 'wheat': case 'barley': {
      const H = 0.95 * (0.4 + p * 0.6);
      const stalk = lerpColor(0x7CB342, col, 0.35);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, r = i ? 0.1 + (i % 3) * 0.07 : 0;
        const x = Math.cos(a) * r, z = Math.sin(a) * r, h = H * (0.85 + (i % 4) * 0.06), lean = (i % 2 ? 1 : -1) * 0.06;
        b.box(0.035, h, 0.035, stalk, x, h / 2, z, lean, 0, lean);
        if (seedId === 'wheat') {
          b.box(0.09, 0.24, 0.09, col, x + lean * h, h + 0.08, z + lean * h);
          b.box(0.06, 0.08, 0.06, lerpColor(col, 0xffffff, 0.2), x + lean * h, h + 0.22, z + lean * h);
        } else {
          b.box(0.07, 0.22, 0.07, col, x + lean * h, h + 0.07, z + lean * h);
          b.box(0.015, 0.3, 0.015, lerpColor(col, 0xffffff, 0.3), x + lean * h + 0.02, h + 0.3, z + lean * h);
          b.box(0.015, 0.28, 0.015, lerpColor(col, 0xffffff, 0.3), x + lean * h - 0.02, h + 0.28, z + lean * h + 0.02);
        }
        if (i % 3 === 0) b.box(0.3, 0.025, 0.06, leafL, x + 0.1, h * 0.35, z, 0, -a, 0.4);
      }
      break;
    }
    case 'olive': {
      const silver = 0x8FAE84, silverD = 0x6F8F66;
      b.box(0.3, 0.9, 0.3, 0x6D5B4B, 0.05, 0.45, 0, 0, 0, 0.12);
      b.box(0.24, 0.8, 0.24, 0x7B6655, -0.15, 1.15, 0.05, 0, 0, -0.35);
      b.box(0.22, 0.7, 0.22, 0x7B6655, 0.25, 1.1, -0.05, 0.1, 0, 0.4);
      b.box(2.1, 0.55, 1.8, silver, 0, 1.65, 0);
      b.box(1.5, 0.45, 1.5, silverD, -0.3, 2.0, 0.2);
      b.box(1.2, 0.35, 1.0, lerpColor(silver, 0xffffff, 0.15), 0.45, 2.1, -0.25);
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i / seed.maxFruits * Math.PI * 2 + 0.2;
        slots.push([Math.cos(a) * (0.75 + (i % 2) * 0.2), 1.3 + (i % 3) * 0.06, Math.sin(a) * (0.65 + (i % 2) * 0.2)]);
      }
      break;
    }
    case 'fig': {
      b.box(0.28, 1.0, 0.28, 0x8D8D8D, 0, 0.5, 0);
      b.box(0.2, 0.7, 0.2, 0x9E9E9E, -0.3, 1.2, 0, 0, 0, 0.5);
      b.box(0.2, 0.7, 0.2, 0x9E9E9E, 0.3, 1.2, 0.1, 0, 0, -0.5);
      // big lobed fig leaves
      [[-0.6, 1.65, 0.1], [0.6, 1.7, -0.1], [0, 1.9, 0.45], [0.05, 1.85, -0.5], [0, 2.15, 0]].forEach(([x, y, z], i) => {
        b.box(0.95, 0.12, 0.95, i % 2 ? leafD : leaf, x, y, z, 0, i * 0.7, 0);
        b.box(0.35, 0.12, 0.35, leafL, x + 0.4, y + 0.02, z, 0, i * 0.7, 0);
      });
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i / seed.maxFruits * Math.PI * 2 + 0.5;
        slots.push([Math.cos(a) * 0.85, 1.35 + (i % 2) * 0.2, Math.sin(a) * 0.85]);
      }
      break;
    }
    case 'pomegranate': {
      [-0.15, 0.15].forEach((x, k) => b.box(0.16, 1.2, 0.16, 0x795548, x, 0.6, k ? 0.1 : -0.05, 0, 0, x * 0.6));
      b.box(1.5, 0.8, 1.5, leafD, 0, 1.45, 0);
      b.box(1.1, 0.5, 1.1, leaf, 0.15, 1.95, -0.1);
      b.box(0.7, 0.3, 1.6, leafD, 0, 1.3, 0);
      [[0.5, 1.9, 0.5], [-0.55, 1.6, -0.4], [0.2, 2.2, -0.3]].forEach(([x, y, z]) => b.box(0.12, 0.12, 0.12, 0xFF5722, x, y, z));
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i / seed.maxFruits * Math.PI * 2 + 0.3;
        slots.push([Math.cos(a) * 0.82, 1.15 + (i % 2) * 0.35, Math.sin(a) * 0.82]);
      }
      break;
    }
    case 'date_palm': {
      let x = 0, y = 0;
      for (let i = 0; i < 9; i++) { b.box(0.34, 0.5, 0.34, i % 2 ? 0xA1887F : 0x8D6E63, x, y + 0.25, 0); x += 0.03; y += 0.45; }
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        b.box(1.5, 0.05, 0.28, i % 2 ? leafD : leaf, x + Math.cos(a) * 0.7, y + 0.1, Math.sin(a) * 0.7, 0, -a, -0.45);
      }
      b.box(0.4, 0.4, 0.4, leafD, x, y + 0.2, 0);
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i / seed.maxFruits * Math.PI * 2 + 0.4;
        slots.push([x + Math.cos(a) * 0.32, y - 0.25, Math.sin(a) * 0.32]);
      }
      break;
    }
    case 'grape': case 'gefen': {
      b.box(0.14, 1.8, 0.14, 0x8D6E63, -0.7, 0.9, 0); b.box(0.14, 1.8, 0.14, 0x8D6E63, 0.7, 0.9, 0);
      b.box(1.6, 0.12, 0.14, 0xA1887F, 0, 1.8, 0);
      b.box(1.3, 0.2, 0.5, leaf, 0, 1.92, 0); b.box(0.6, 0.18, 0.6, leafL, -0.4, 2.02, 0.1); b.box(0.6, 0.18, 0.6, leafD, 0.45, 2.0, -0.1);
      b.box(0.08, 1.7, 0.08, 0x6D4C41, 0, 0.85, 0.05);
      for (let i = 0; i < seed.maxFruits; i++) slots.push([-0.56 + i * 0.28, 1.5, (i % 2 ? 0.12 : -0.12)]);
      break;
    }
    case 'beanstalk': {
      const H = 4.5 * (0.35 + p * 0.65);
      for (let y = 0, i = 0; y < H; y += 0.4, i++) {
        const a = i * 0.7;
        b.box(0.3, 0.45, 0.3, i % 2 ? 0x43A047 : 0x388E3C, Math.cos(a) * 0.15, y + 0.22, Math.sin(a) * 0.15);
        if (i % 2 === 0) b.box(0.55, 0.05, 0.3, leafL, Math.cos(a) * 0.45, y + 0.3, Math.sin(a) * 0.45, 0, -a, 0.2);
      }
      b.box(0.7, 0.4, 0.7, 0x76FF03, 0, H + 0.2, 0);
      for (let i = 0; i < seed.maxFruits; i++) {
        const a = i * 1.9;
        slots.push([Math.cos(a) * 0.35, 0.9 + i * 0.7, Math.sin(a) * 0.35]);
      }
      break;
    }
    default: {
      b.box(0.1, 0.6, 0.1, leafD, 0, 0.3, 0);
      b.box(0.35, 0.3, 0.35, col, 0, 0.7, 0);
    }
  }
  return { geometry: b.build(), slots };
}
