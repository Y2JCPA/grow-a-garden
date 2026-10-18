/* ============================================
   GROW A GARDEN 3D — Block helpers ("Roblox plastic" look)
   - Stud textures (the classic Roblox square studs) drawn on canvas
   - Rounded/bevelled blocks
   - VoxelBatch: merges many blocks into a single draw call
   - roundify(): turns plain box models (characters, pets) into bevelled plastic
   ============================================ */

// ─── Textures ───
const Tex = (function() {
  const cache = {};

  function make(size, draw, opts) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = (opts && opts.aniso) || 8;
    return t;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // One raised square stud per tile: soft highlight top-left, shadow bottom-right.
  // Drawn in white/grey so it tints any color it is multiplied with.
  function studs(ctx, s, strength) {
    const k = strength || 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    const m = s * 0.2, w = s - m * 2, r = s * 0.12;
    const shade = a => `rgba(0,0,0,${a * k})`;
    // drop shadow (bottom-right)
    ctx.fillStyle = shade(0.14);
    roundRect(ctx, m + s * 0.04, m + s * 0.05, w, w, r); ctx.fill();
    // stud body
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, m, m, w, w, r); ctx.fill();
    // inner bevel: bright top-left edge, darker bottom-right edge
    const g = ctx.createLinearGradient(m, m, m + w, m + w);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, shade(0.12));
    ctx.fillStyle = g;
    roundRect(ctx, m, m, w, w, r); ctx.fill();
    ctx.strokeStyle = shade(0.10);
    ctx.lineWidth = Math.max(1, s * 0.025);
    roundRect(ctx, m, m, w, w, r); ctx.stroke();
  }

  const builders = {
    studs: () => make(64, (ctx, s) => studs(ctx, s, 1)),
    softStuds: () => make(64, (ctx, s) => studs(ctx, s, 0.55)),
    plain: () => make(4, (ctx, s) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, s, s); }),
    water: () => make(64, (ctx, s) => {
      ctx.fillStyle = '#4FC3F7'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3;
      for (let y = 10; y < s; y += 22) { ctx.beginPath(); ctx.moveTo(4, y); ctx.quadraticCurveTo(s / 4, y - 6, s / 2, y); ctx.quadraticCurveTo(s * 0.75, y + 6, s - 4, y); ctx.stroke(); }
    }),
  };
  // Older names used around the code base
  builders.noise = builders.studs;
  builders.grass = builders.studs;
  builders.dirt = builders.studs;
  builders.soil = builders.studs;
  builders.path = builders.softStuds;

  function get(name) {
    if (!cache[name]) cache[name] = builders[name]();
    return cache[name];
  }

  // ─── Emoji textures for floating 3D icons ───
  const emojiCache = {};
  function emojiMaterial(emoji, bubble) {
    const key = emoji + (bubble ? '_b' : '');
    if (emojiCache[key]) return emojiCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (bubble) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(64, 68, 54, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(64, 62, 54, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = (bubble ? 68 : 96) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, bubble ? 66 : 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
    emojiCache[key] = m;
    return m;
  }

  return { get, emojiMaterial };
})();

// ─── Bevelled box: flat faces + chamfered edges + corner triangles ───
// Returns plain arrays (local coordinates) so callers can transform them.
function bevelBoxData(w, h, d, bevel) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const b = Math.max(0, Math.min(bevel, hx * 0.45, hy * 0.45, hz * 0.45));
  const pos = [], nrm = [], idx = [];
  const H = [hx, hy, hz];
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), nn = new THREE.Vector3();
  function poly(points) {
    // make winding face outward (shape is convex and centered on the origin)
    tmpA.set(points[1][0] - points[0][0], points[1][1] - points[0][1], points[1][2] - points[0][2]);
    tmpB.set(points[2][0] - points[0][0], points[2][1] - points[0][1], points[2][2] - points[0][2]);
    nn.crossVectors(tmpA, tmpB);
    let cx = 0, cy = 0, cz = 0;
    points.forEach(p => { cx += p[0]; cy += p[1]; cz += p[2]; });
    if (nn.x * cx + nn.y * cy + nn.z * cz < 0) { points = points.slice().reverse(); nn.negate(); }
    nn.normalize();
    const base = pos.length / 3;
    points.forEach(p => { pos.push(p[0], p[1], p[2]); nrm.push(nn.x, nn.y, nn.z); });
    for (let i = 1; i < points.length - 1; i++) idx.push(base, base + i, base + i + 1);
  }
  const pt = (axis, sa, others) => { // build a point from per-axis values
    const p = [0, 0, 0]; p[axis] = sa; p[others[0][0]] = others[0][1]; p[others[1][0]] = others[1][1]; return p;
  };
  // 6 faces
  for (let a = 0; a < 3; a++) {
    const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
    [-1, 1].forEach(s => {
      const e1 = H[o1] - b, e2 = H[o2] - b;
      poly([
        pt(a, s * H[a], [[o1, -e1], [o2, -e2]]), pt(a, s * H[a], [[o1, e1], [o2, -e2]]),
        pt(a, s * H[a], [[o1, e1], [o2, e2]]), pt(a, s * H[a], [[o1, -e1], [o2, e2]]),
      ]);
    });
  }
  if (b > 0.0001) {
    // 12 edges
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const k = 3 - i - j;
      [-1, 1].forEach(si => [-1, 1].forEach(sj => {
        const P = (ai, aj, kk) => { const p = [0, 0, 0]; p[i] = ai; p[j] = aj; p[k] = kk; return p; };
        const ek = H[k] - b;
        poly([P(si * H[i], sj * (H[j] - b), -ek), P(si * (H[i] - b), sj * H[j], -ek), P(si * (H[i] - b), sj * H[j], ek), P(si * H[i], sj * (H[j] - b), ek)]);
      }));
    }
    // 8 corners
    [-1, 1].forEach(sx => [-1, 1].forEach(sy => [-1, 1].forEach(sz => {
      poly([[sx * hx, sy * (hy - b), sz * (hz - b)], [sx * (hx - b), sy * hy, sz * (hz - b)], [sx * (hx - b), sy * (hy - b), sz * hz]]);
    })));
  }
  return { pos, nrm, idx };
}

// Bevelled box as a ready BufferGeometry (cached) — used for characters, pets, fruit
const _bevelGeoCache = {};
function bevelBoxGeometry(w, h, d, bevel, density) {
  const key = [w, h, d, bevel, density || 0].map(n => +n.toFixed(4)).join(',');
  if (_bevelGeoCache[key]) return _bevelGeoCache[key];
  const data = bevelBoxData(w, h, d, bevel);
  const uv = [];
  const dens = density || 0;
  for (let i = 0; i < data.pos.length; i += 3) {
    const x = data.pos[i], y = data.pos[i + 1], z = data.pos[i + 2];
    const ax = Math.abs(data.nrm[i]), ay = Math.abs(data.nrm[i + 1]), az = Math.abs(data.nrm[i + 2]);
    if (ax >= ay && ax >= az) uv.push(z * dens, y * dens); else if (ay >= az) uv.push(x * dens, z * dens); else uv.push(x * dens, y * dens);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(data.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(data.idx);
  g.computeBoundingSphere();
  _bevelGeoCache[key] = g;
  return g;
}

// ─── VoxelBatch: merge many bevelled blocks into ONE geometry (one draw call) ───
// Each block gets vertex colors and UVs scaled by its size so the stud
// texture has the same density on every block.
const VoxelBatch = (function() {
  const m4 = new THREE.Matrix4();
  const n3 = new THREE.Matrix3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };

  class Batch {
    // density: stud repeats per world unit • bevel: max edge rounding (world units)
    constructor(density, bevel) {
      this.density = density || 4;
      this.bevel = bevel == null ? 0.06 : bevel;
      this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.idx = [];
    }

    // w,h,d size; color hex; x,y,z center; optional rotation (radians)
    box(w, h, d, color, x, y, z, rx, ry, rz) {
      const minDim = Math.min(w, h, d);
      const bev = minDim < 0.05 ? 0 : Math.min(this.bevel, minDim * 0.22);
      const data = bevelBoxData(w, h, d, bev);
      const base = this.pos.length / 3;
      e.set(rx || 0, ry || 0, rz || 0);
      q.setFromEuler(e);
      m4.compose(v.set(x, y, z), q, one);
      n3.getNormalMatrix(m4);
      const me = m4.elements, ne = n3.elements;
      col.set(color);
      // Roblox palettes are bright and saturated: punch every block's color up a little
      col.getHSL(hsl);
      if (hsl.s > 0.05) col.setHSL(hsl.h, Math.min(1, hsl.s * 1.22), Math.min(0.92, hsl.l * 1.07 + 0.01));
      const dens = this.density;
      const P = data.pos, N = data.nrm;
      for (let i = 0; i < P.length; i += 3) {
        const px = P[i], py = P[i + 1], pz = P[i + 2];
        this.pos.push(
          me[0] * px + me[4] * py + me[8] * pz + me[12],
          me[1] * px + me[5] * py + me[9] * pz + me[13],
          me[2] * px + me[6] * py + me[10] * pz + me[14]
        );
        const nx = N[i], ny = N[i + 1], nz = N[i + 2];
        this.nrm.push(
          ne[0] * nx + ne[3] * ny + ne[6] * nz,
          ne[1] * nx + ne[4] * ny + ne[7] * nz,
          ne[2] * nx + ne[5] * ny + ne[8] * nz
        );
        // planar UVs by facing direction, in local box space
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
        if (ax >= ay && ax >= az) this.uv.push((pz + d / 2) * dens, (py + h / 2) * dens);
        else if (ay >= az) this.uv.push((px + w / 2) * dens, (pz + d / 2) * dens);
        else this.uv.push((px + w / 2) * dens, (py + h / 2) * dens);
        this.col.push(col.r, col.g, col.b);
      }
      for (let i = 0; i < data.idx.length; i++) this.idx.push(data.idx[i] + base);
      return this;
    }

    isEmpty() { return this.pos.length === 0; }

    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setIndex(this.idx);
      g.computeBoundingSphere();
      return g;
    }
  }

  // Merge finished geometries ({geometry, matrix}) into one — used for neighbor gardens
  Batch.merge = function(items) {
    const out = new Batch(1);
    const v3 = new THREE.Vector3();
    items.forEach(({ geometry, matrix }) => {
      const base = out.pos.length / 3;
      const P = geometry.attributes.position, N = geometry.attributes.normal, U = geometry.attributes.uv, C = geometry.attributes.color;
      n3.getNormalMatrix(matrix);
      for (let i = 0; i < P.count; i++) {
        v3.fromBufferAttribute(P, i).applyMatrix4(matrix); out.pos.push(v3.x, v3.y, v3.z);
        v3.fromBufferAttribute(N, i).applyMatrix3(n3).normalize(); out.nrm.push(v3.x, v3.y, v3.z);
        out.uv.push(U.getX(i), U.getY(i));
        out.col.push(C.getX(i), C.getY(i), C.getZ(i));
      }
      const idx = geometry.index.array;
      for (let i = 0; i < idx.length; i++) out.idx.push(idx[i] + base);
    });
    return out.build();
  };

  return Batch;
})();

// ─── Plastic materials (shiny like Roblox SmoothPlastic) ───
const _plasticCache = {};
function plasticMaterial(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  if (_plasticCache[key]) return _plasticCache[key];
  const m = new THREE.MeshPhongMaterial(Object.assign({ color, shininess: 38, specular: 0x2a2a2a }, opts || {}));
  _plasticCache[key] = m;
  return m;
}

// Replace every plain box mesh in a model with a bevelled one and a shiny
// plastic material — gives characters, pets and NPCs the Roblox look.
function roundify(root, bevelScale) {
  const k = bevelScale || 1;
  root.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.parameters) return;
    const p = o.geometry.parameters;
    if (p.width == null || p.height == null || p.depth == null) return;
    const minDim = Math.min(p.width, p.height, p.depth);
    o.geometry = bevelBoxGeometry(p.width, p.height, p.depth, Math.min(0.11, minDim * 0.24) * k, 0);
    const old = o.material;
    if (old && old.color && !old.transparent) {
      o.material = plasticMaterial(old.color.getHex());
    }
  });
  return root;
}
