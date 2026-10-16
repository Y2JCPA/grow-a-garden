/* ============================================
   GROW A GARDEN 3D — Sound
   All sounds are synthesized with WebAudio (no audio files to load).
   Sfx.play('harvest') etc.  Music is a gentle generative pentatonic tune.
   ============================================ */
const Sfx = (function() {
  const SETTINGS_KEY = 'garden3d_audio';
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let settings = { sfx: true, music: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { /* defaults */ }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  // Must be called from a user gesture (click / key / touch)
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx ? 0.55 : 0; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.22 : 0; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      startMusic();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, start, dur, opts) {
    opts = opts || {};
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
    const vol = opts.vol || 0.3;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(opts.bus || sfxBus);
    o.start(start); o.stop(start + dur + 0.05);
  }

  function noise(start, dur, opts) {
    opts = opts || {};
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 1000, start);
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, start + dur);
    f.Q.value = opts.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.3, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(start, Math.random() * 0.5); src.stop(start + dur + 0.05);
  }

  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9,
              C5: 523.3, D5: 587.3, E5: 659.3, G5: 784.0, A5: 880.0, C6: 1046.5, E6: 1318.5 };

  const sounds = {
    click:   t => tone(900, t, 0.05, { type: 'square', vol: 0.06 }),
    plant:   t => { tone(520, t, 0.14, { slideTo: 260, vol: 0.35 }); noise(t, 0.12, { freq: 400, vol: 0.12, filter: 'lowpass' }); },
    water:   t => { noise(t, 0.45, { freq: 2500, freqTo: 700, q: 0.8, vol: 0.25 }); tone(1200, t + 0.05, 0.08, { slideTo: 1800, vol: 0.06 }); },
    harvest: t => { [N.C5, N.E5, N.G5].forEach((f, i) => tone(f, t + i * 0.07, 0.22, { type: 'triangle', vol: 0.28 })); },
    coin:    t => { tone(N.B4 * 2, t, 0.08, { type: 'square', vol: 0.08 }); tone(N.E6, t + 0.08, 0.3, { type: 'square', vol: 0.08 }); },
    buy:     t => { tone(N.G5, t, 0.08, { type: 'triangle', vol: 0.2 }); tone(N.C6, t + 0.07, 0.15, { type: 'triangle', vol: 0.2 }); },
    levelup: t => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, t + i * 0.11, 0.35, { type: 'triangle', vol: 0.3 })); tone(N.C4, t, 0.6, { type: 'sine', vol: 0.2 }); },
    quest:   t => { [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => tone(f, t + i * 0.08, 0.25, { type: 'square', vol: 0.07 })); },
    sparkle: t => { for (let i = 0; i < 6; i++) tone(1500 + Math.random() * 1500, t + i * 0.05, 0.15, { vol: 0.08 }); },
    bark:    t => { [0, 0.18].forEach(d => { tone(420, t + d, 0.12, { type: 'sawtooth', slideTo: 200, vol: 0.12 }); noise(t + d, 0.1, { freq: 600, vol: 0.12 }); }); },
    deny:    t => tone(160, t, 0.18, { type: 'square', vol: 0.08 }),
    pop:     t => tone(800, t, 0.08, { slideTo: 1400, vol: 0.15 }),
    potion:  t => { tone(300, t, 0.5, { slideTo: 1200, type: 'triangle', vol: 0.18 }); sounds.sparkle(t + 0.3); },
    unlock:  t => { tone(N.E5, t, 0.12, { type: 'triangle', vol: 0.2 }); tone(N.A5, t + 0.1, 0.3, { type: 'triangle', vol: 0.22 }); },
    jump:    t => tone(300, t, 0.12, { slideTo: 520, vol: 0.08 }),
    gift:    t => { [N.C5, N.G5, N.E5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, t + i * 0.09, 0.25, { type: 'triangle', vol: 0.22 })); },
  };

  const lastPlayed = {};
  function play(name) {
    if (!ctx || !settings.sfx || !sounds[name]) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.05) return; // de-dupe bursts
    lastPlayed[name] = now;
    sounds[name](now + 0.01);
  }

  // ─── Generative background music ───
  // I – V – vi – IV in C major, soft pads + a wandering pentatonic melody.
  const CHORDS = [
    [N.C4, N.E4, N.G4], [N.G4, N.B4, N.D5], [N.A4, N.C5, N.E5], [N.F4, N.A4, N.C5],
  ];
  const SCALE = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6];
  let musicTimer = null, beat = 0, melodyIdx = 2, calm = false;

  function scheduleBar() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    const bar = Math.floor(beat / 8) % CHORDS.length;
    const step = beat % 8;
    const spb = calm ? 0.42 : 0.32; // seconds per beat
    if (step === 0) {
      CHORDS[bar].forEach(f => tone(f / 2, t, spb * 8, { type: 'sine', vol: 0.09, attack: 0.4, bus: musicBus }));
      tone(CHORDS[bar][0] / 4, t, spb * 4, { type: 'triangle', vol: 0.12, attack: 0.05, bus: musicBus });
    }
    if (step === 4) tone(CHORDS[bar][0] / 4, t, spb * 4, { type: 'triangle', vol: 0.1, attack: 0.05, bus: musicBus });
    if (Math.random() < (calm ? 0.35 : 0.6)) {
      melodyIdx = Math.max(0, Math.min(SCALE.length - 1, melodyIdx + Math.floor(Math.random() * 5) - 2));
      tone(SCALE[melodyIdx], t, spb * 1.6, { type: 'triangle', vol: 0.07, attack: 0.02, bus: musicBus });
    }
    beat++;
    musicTimer = setTimeout(scheduleBar, spb * 1000);
  }

  function startMusic() {
    if (musicTimer) return;
    scheduleBar();
  }

  function setCalm(v) { calm = v; }

  function toggle(kind) {
    settings[kind] = !settings[kind];
    saveSettings();
    if (ctx) {
      if (kind === 'sfx') sfxBus.gain.value = settings.sfx ? 0.55 : 0;
      if (kind === 'music') musicBus.gain.value = settings.music ? 0.22 : 0;
    }
    return settings[kind];
  }

  // Pause music while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  return { unlock, play, toggle, setCalm, get settings() { return settings; } };
})();
