/* ============================================
   GROW A GARDEN 3D — Voxel helpers
   Procedural pixel-art textures, a geometry batcher that merges many
   boxes into a single draw call, and cached emoji sprite textures.
   ============================================ */

// ─── Pixel-art textures (drawn on canvas, no image files needed) ───
const Tex = (function() {
  const cache = {};

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function make(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function speckle(ctx, size, palette, rand) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const builders = {
    // Light grayscale noise — multiplied with vertex colors so every block gets a pixel texture
    noise: () => make(16, (ctx, s) => speckle(ctx, s, ['#ffffff', '#f4f4f4', '#ececec', '#e2e2e2', '#fafafa', '#dadada'], rng(7))),
    grass: () => make(32, (ctx, s) => {
      speckle(ctx, s, ['#6cc04a', '#62b743', '#74c851', '#5dae3e', '#69bd47', '#7bd055', '#58a83a'], rng(42));
      const r = rng(9);
      // a few tiny flowers / darker blades
      for (let i = 0; i < 10; i++) { ctx.fillStyle = '#4e9a35'; ctx.fillRect(Math.floor(r() * s), Math.floor(r() * s), 1, 2); }
    }),
    soil: () => make(16, (ctx, s) => {
      speckle(ctx, s, ['#7a5233', '#6e4a2e', '#845a38', '#714b2f', '#7d5535'], rng(3));
      ctx.fillStyle = 'rgba(40,22,10,0.45)';
      for (let y = 1; y < s; y += 4) ctx.fillRect(0, y, s, 1); // tilled rows
    }),
    path: () => make(16, (ctx, s) => {
      speckle(ctx, s, ['#c9b48a', '#bfa97d', '#d3bf95', '#b39d72', '#cdb98f'], rng(11));
      const r = rng(5);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = '#9e9e9e'; ctx.fillRect(Math.floor(r() * s), Math.floor(r() * s), 2, 1); }
    }),
    water: () => make(16, (ctx, s) => {
      speckle(ctx, s, ['#3fa9e0', '#46b0e6', '#3aa1d8', '#52baea', '#3399d0'], rng(21));
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const r = rng(2);
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * s), Math.floor(r() * s), 3, 1);
    }),
  };

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

// ─── VoxelBatch: merge many boxes into ONE geometry (one draw call) ───
// Each box gets vertex colors and UVs scaled by its size so the pixel
// texture has the same density on every block.
const VoxelBatch = (function() {
  const tmpl = new THREE.BoxGeometry(1, 1, 1);
  const TP = tmpl.attributes.position.array;
  const TN = tmpl.attributes.normal.array;
  const TU = tmpl.attributes.uv.array;
  const TI = tmpl.index.array;

  const m4 = new THREE.Matrix4();
  const n3 = new THREE.Matrix3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();

  class Batch {
    constructor(density) {
      this.density = density || 4;
      this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.idx = [];
    }

    // w,h,d size; color hex; x,y,z center; optional rotation (radians)
    box(w, h, d, color, x, y, z, rx, ry, rz) {
      const base = this.pos.length / 3;
      e.set(rx || 0, ry || 0, rz || 0);
      q.setFromEuler(e);
      m4.compose(v.set(x, y, z), q, one);
      n3.getNormalMatrix(m4);
      const me = m4.elements, ne = n3.elements;
      col.set(color);
      const dens = this.density;
      for (let i = 0; i < 24; i++) {
        const px = TP[i * 3] * w, py = TP[i * 3 + 1] * h, pz = TP[i * 3 + 2] * d;
        this.pos.push(
          me[0] * px + me[4] * py + me[8] * pz + me[12],
          me[1] * px + me[5] * py + me[9] * pz + me[13],
          me[2] * px + me[6] * py + me[10] * pz + me[14]
        );
        const nx = TN[i * 3], ny = TN[i * 3 + 1], nz = TN[i * 3 + 2];
        this.nrm.push(
          ne[0] * nx + ne[3] * ny + ne[6] * nz,
          ne[1] * nx + ne[4] * ny + ne[7] * nz,
          ne[2] * nx + ne[5] * ny + ne[8] * nz
        );
        const face = (i / 4) | 0; // 0,1 = ±x  2,3 = ±y  4,5 = ±z
        const su = face < 2 ? d : w;
        const sv = face < 2 ? h : face < 4 ? d : h;
        this.uv.push(TU[i * 2] * su * dens, TU[i * 2 + 1] * sv * dens);
        this.col.push(col.r, col.g, col.b);
      }
      for (let i = 0; i < TI.length; i++) this.idx.push(TI[i] + base);
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

  return Batch;
})();
