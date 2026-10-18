/* ============================================
   GROW A GARDEN 3D — Multiplayer (Firebase Realtime Database)
   A "family world" is a secret code. Everyone who types the same code
   plays in the same world: they share the gardener list, see each
   other walking around, and see each other's gardens live.

   Data layout (all under /worlds/{CODE}/):
     profiles/{pid}  name, avatar, skin, slot (which of the 6 gardens)
     saves/{pid}     full save (so a gardener can play from any device)
     gardens/{pid}   public snapshot of that gardener's garden
     players/{pid}   live position/outfit while playing (auto-removed on disconnect)
   If Firebase can't load (offline), Net.available is false and the game
   simply runs single-player like before.
   ============================================ */
const Net = (function() {
  const CONFIG = {
    apiKey: 'AIzaSyAhAGCsaAG0V0IaOJyV8cDIICsfBLJ-xZs',
    authDomain: 'grow-a-garden-family.firebaseapp.com',
    databaseURL: 'https://grow-a-garden-family-default-rtdb.firebaseio.com',
    projectId: 'grow-a-garden-family',
    storageBucket: 'grow-a-garden-family.firebasestorage.app',
    messagingSenderId: '785169569165',
    appId: '1:785169569165:web:6390f898fdc5df0474d9c4',
  };
  const WORLD_KEY = 'garden3d_world';
  const MIN_CODE = 8;

  let app = null, db = null, auth = null, ready = null;
  let world = null;            // current world code (or null = play alone)
  let me = null;               // profile id we are playing as
  let presenceRef = null;
  const listeners = [];
  let lastSend = 0, lastSent = null, lastSaveUpload = 0;

  const available = typeof firebase !== 'undefined' && !!firebase.initializeApp;

  try { world = localStorage.getItem(WORLD_KEY) || null; } catch (e) { world = null; }

  function cleanCode(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32); }

  // Sign in anonymously once; every call after that reuses the same promise
  function connect() {
    if (!available) return Promise.reject(new Error('offline'));
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      try {
        app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG);
        auth = firebase.auth();
        db = firebase.database();
        const timer = setTimeout(() => reject(new Error('timeout')), 12000);
        auth.onAuthStateChanged(u => { if (u) { clearTimeout(timer); resolve(u); } });
        auth.signInAnonymously().catch(err => { clearTimeout(timer); reject(err); });
      } catch (e) { reject(e); }
    });
    ready.catch(() => { ready = null; });
    return ready;
  }

  const ref = path => db.ref(`worlds/${world}/${path}`);
  // Firebase waits forever when the network is down — give up after a while instead
  const timed = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 10000))]);

  function setWorld(code) {
    const c = cleanCode(code);
    if (c.length < MIN_CODE) return false;
    world = c;
    try { localStorage.setItem(WORLD_KEY, c); } catch (e) { /* ignore */ }
    return true;
  }
  function leaveWorld() {
    world = null;
    try { localStorage.removeItem(WORLD_KEY); } catch (e) { /* ignore */ }
  }

  async function fetchProfiles() {
    await connect();
    const snap = await timed(ref('profiles').get());
    const val = snap.val() || {};
    return Object.keys(val).map(id => Object.assign({ id }, val[id]));
  }
  async function upsertProfile(p) {
    await connect();
    await timed(ref(`profiles/${p.id}`).update({ name: p.name, avatar: p.avatar || '🌻', skin: p.skin || 'farmer', slot: p.slot, s: Math.floor(p.s || 0) }));
  }
  function setProfileField(pid, fields) {
    if (db && world) ref(`profiles/${pid}`).update(fields).catch(() => {});
  }
  async function deleteProfile(pid) {
    await connect();
    await timed(Promise.all(['profiles', 'saves', 'gardens', 'players'].map(k => ref(`${k}/${pid}`).remove())));
  }
  async function loadSave(pid) {
    await connect();
    const snap = await timed(ref(`saves/${pid}`).get());
    const v = snap.val();
    if (!v || !v.json) return null;
    try { return JSON.parse(v.json); } catch (e) { return null; }
  }
  // Saves are stored as one JSON string (Firebase drops empty arrays/nulls otherwise)
  function uploadSave(pid, data, force) {
    if (!db || !world) return;
    const now = Date.now();
    if (!force && now - lastSaveUpload < 15000) return;
    lastSaveUpload = now;
    ref(`saves/${pid}`).set({ json: JSON.stringify(data), savedAt: data.savedAt || now }).catch(() => {});
    ref(`profiles/${pid}/s`).set(Math.floor(data.sheckles || 0)).catch(() => {});
  }
  function publishGarden(pid, snapshot) {
    if (!db || !world) return;
    ref(`gardens/${pid}`).set({ json: JSON.stringify(snapshot), t: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  }
  async function isPlayingElsewhere(pid) {
    await connect();
    const snap = await timed(ref(`players/${pid}`).get());
    const v = snap.val();
    return !!(v && v.t && Date.now() - v.t < 20000);
  }

  // ─── Live session ───
  function join(pid, info, handlers) {
    me = pid;
    presenceRef = ref(`players/${pid}`);
    presenceRef.onDisconnect().remove();
    presenceRef.set(Object.assign({}, info, { t: firebase.database.ServerValue.TIMESTAMP }));
    const players = ref('players');
    const onAdd = s => { if (s.key !== me) handlers.player(s.key, s.val()); };
    const onRemove = s => { if (s.key !== me) handlers.playerLeft(s.key); };
    players.on('child_added', onAdd);
    players.on('child_changed', onAdd);
    players.on('child_removed', onRemove);
    listeners.push(() => { players.off('child_added', onAdd); players.off('child_changed', onAdd); players.off('child_removed', onRemove); });

    const gardens = ref('gardens');
    const onGarden = s => {
      if (s.key === me) return;
      const v = s.val();
      if (!v || !v.json) return;
      try { handlers.garden(s.key, JSON.parse(v.json), v.t || Date.now()); } catch (e) { /* bad data */ }
    };
    const onGardenGone = s => handlers.garden(s.key, null, 0);
    gardens.on('child_added', onGarden);
    gardens.on('child_changed', onGarden);
    gardens.on('child_removed', onGardenGone);
    listeners.push(() => { gardens.off('child_added', onGarden); gardens.off('child_changed', onGarden); gardens.off('child_removed', onGardenGone); });

    const profiles = ref('profiles');
    const onProfile = s => handlers.profile(s.key, s.val());
    const onProfileGone = s => handlers.profile(s.key, null);
    profiles.on('child_added', onProfile);
    profiles.on('child_changed', onProfile);
    profiles.on('child_removed', onProfileGone);
    listeners.push(() => { profiles.off('child_added', onProfile); profiles.off('child_changed', onProfile); profiles.off('child_removed', onProfileGone); });
  }

  // Position updates: ~8 per second while moving, a heartbeat every 3s otherwise
  function sendState(s) {
    if (!presenceRef) return;
    const now = performance.now();
    const moved = !lastSent || Math.abs(s.x - lastSent.x) > 0.05 || Math.abs(s.z - lastSent.z) > 0.05 ||
      Math.abs(s.y - lastSent.y) > 0.05 || Math.abs(s.r - lastSent.r) > 0.08 || s.mv !== lastSent.mv;
    if ((moved && now - lastSend > 120) || now - lastSend > 3000) {
      lastSend = now;
      lastSent = s;
      presenceRef.update({ x: +s.x.toFixed(2), z: +s.z.toFixed(2), y: +s.y.toFixed(2), r: +s.r.toFixed(2), mv: s.mv ? 1 : 0, t: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
    }
  }
  function updateInfo(info) { if (presenceRef) presenceRef.update(info).catch(() => {}); }
  function sendEmote(e) { if (presenceRef) presenceRef.update({ emote: e, et: Date.now() }).catch(() => {}); }

  function leave() {
    listeners.splice(0).forEach(off => off());
    if (presenceRef) { presenceRef.onDisconnect().cancel(); presenceRef.remove().catch(() => {}); }
    presenceRef = null; me = null; lastSent = null;
  }

  return {
    get available() { return available; },
    get world() { return world; },
    get online() { return !!(world && db && me); },
    MIN_CODE, cleanCode, connect, setWorld, leaveWorld,
    fetchProfiles, upsertProfile, setProfileField, deleteProfile, loadSave, uploadSave, publishGarden, isPlayingElsewhere,
    join, sendState, updateInfo, sendEmote, leave,
  };
})();
