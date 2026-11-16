/* Les sons et la musique du jeu, fabriqués en direct (aucun fichier à télécharger).
   SND.play('nom')  SND.music('menu' | 'duel' | 'mini' | null)  SND.set('sfx' | 'mus', 0..1)
   Pour utiliser un vrai fichier à la place d'un son : mettre sons/<nom>.ogg (ou .mp3) dans app/ et l'ajouter à FILES. */
const SND = (function () {
  const FILES = {}; /* ex. { hit: 'sons/hit.ogg' } */
  let ac, out, sfxG, musG, nbuf, vol = { sfx: .8, mus: .45 }, bufs = {};
  try { Object.assign(vol, JSON.parse(STORE.get('bdcSnd') || '{}')); } catch (e) { }
  function ctx() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    out = ac.createGain(); out.connect(comp);
    sfxG = ac.createGain(); sfxG.gain.value = vol.sfx; sfxG.connect(out);
    musG = ac.createGain(); musG.gain.value = vol.mus * .5; musG.connect(out);
    nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const k in FILES) fetch(FILES[k]).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(b => { bufs[k] = b; }).catch(() => { });
    return ac;
  }
  /* une note : f → f2 en t secondes */
  function tone(o, dest) {
    const t0 = ac.currentTime + (o.at || 0), t = o.t || .15, os = ac.createOscillator(), g = ac.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t0); if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + t);
    const v = o.v === undefined ? .2 : o.v, a = o.a || .005;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + t);
    os.connect(g).connect(dest || sfxG); os.start(t0); os.stop(t0 + t + .02);
  }
  /* un souffle filtré : coups, claquements, whoosh */
  function noise(o, dest) {
    const t0 = ac.currentTime + (o.at || 0), t = o.t || .15, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; s.loop = true; f.type = o.type || 'lowpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f || 1000, t0); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + t);
    const v = o.v === undefined ? .3 : o.v, a = o.a || .004;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + t);
    s.connect(f).connect(g).connect(dest || sfxG); s.start(t0, Math.random()); s.stop(t0 + t + .02);
  }
  const arp = (fs, step, o) => fs.forEach((f, i) => tone(Object.assign({ f, at: i * step, t: .22, type: 'triangle', v: .16 }, o)));
  const S = {
    click() { tone({ f: 880, f2: 1320, t: .06, type: 'triangle', v: .12 }); noise({ f: 5000, t: .03, v: .06, type: 'highpass' }); },
    hover() { tone({ f: 1400, t: .03, v: .04 }); },
    card() { noise({ f: 3200, q: 2, t: .07, v: .22, type: 'bandpass' }); tone({ f: 620, f2: 880, t: .07, type: 'triangle', v: .08 }); },
    whoosh() { noise({ f: 350, f2: 2600, q: 3, t: .28, v: .28, type: 'bandpass', a: .08 }); },
    slam() { noise({ f: 700, f2: 120, t: .16, v: .7 }); tone({ f: 130, f2: 45, t: .22, v: .5 }); noise({ f: 4200, t: .04, v: .2, type: 'highpass' }); },
    spawn() { tone({ f: 260, f2: 1500, t: .5, v: .12 }); arp([880, 1175, 1568, 2093], .07, { type: 'sine', v: .1, t: .35 }); noise({ f: 6000, t: .5, v: .05, type: 'highpass', a: .2 }); },
    legend() { arp([523, 659, 784, 1047, 1319, 1568], .09, { type: 'triangle', v: .16, t: .5 }); tone({ f: 131, t: .9, type: 'sawtooth', v: .1 }); },
    hit() { noise({ f: 1100, f2: 200, t: .12, v: .55 }); tone({ f: 190, f2: 70, t: .13, type: 'square', v: .16 }); },
    block() { tone({ f: 1200, f2: 900, t: .18, type: 'square', v: .1 }); noise({ f: 3000, q: 6, t: .12, v: .25, type: 'bandpass' }); },
    heroHit() { tone({ f: 100, f2: 38, t: .34, type: 'sawtooth', v: .3 }); noise({ f: 500, f2: 90, t: .3, v: .6 }); },
    death() { tone({ f: 520, f2: 55, t: .5, type: 'sawtooth', v: .14 }); noise({ f: 2500, f2: 200, t: .45, v: .3, a: .02 }); },
    heal() { arp([659, 880, 1109], .08, { type: 'sine', v: .14, t: .3 }); },
    buff() { arp([440, 554, 659], .06, { type: 'triangle', v: .13 }); },
    poison() { tone({ f: 300, f2: 180, t: .3, type: 'sawtooth', v: .08 }); noise({ f: 900, q: 8, t: .3, v: .2, type: 'bandpass', a: .05 }); },
    spell() { tone({ f: 1400, f2: 320, t: .4, type: 'triangle', v: .14 }); noise({ f: 7000, f2: 2000, t: .4, v: .12, type: 'highpass' }); },
    turn() { arp([660, 990], .09, { type: 'sine', v: .16, t: .4 }); },
    turn2() { arp([330, 262], .1, { type: 'sine', v: .12, t: .4 }); },
    error() { tone({ f: 150, f2: 110, t: .18, type: 'sawtooth', v: .14 }); },
    coin() { tone({ f: 1319, t: .08, type: 'square', v: .09 }); tone({ f: 1760, t: .3, type: 'square', v: .09, at: .07 }); },
    pack() { noise({ f: 1200, f2: 5000, q: 2, t: .35, v: .5, type: 'bandpass' }); arp([392, 523, 659, 784], .06, { v: .14 }); },
    revC() { tone({ f: 520, t: .15, type: 'triangle', v: .14 }); },
    revR() { arp([587, 784], .07, { v: .15 }); },
    revE() { arp([523, 698, 880, 1047], .07, { v: .16, t: .35 }); },
    revL() { arp([523, 659, 784, 1047, 1319], .08, { v: .18, t: .5 }); tone({ f: 131, t: .8, type: 'sawtooth', v: .09 }); noise({ f: 8000, t: .7, v: .06, type: 'highpass', a: .2 }); },
    quest() { arp([784, 988, 1175, 1568], .07, { type: 'triangle', v: .16, t: .3 }); },
    level() { arp([523, 659, 784, 1047, 784, 1047, 1319], .1, { type: 'square', v: .1, t: .3 }); },
    win() { arp([523, 523, 523, 659, 784, 659, 784, 1047], .13, { type: 'square', v: .12, t: .32 }); arp([131, 165, 196, 262], .26, { type: 'triangle', v: .16, t: .5 }); },
    lose() { arp([392, 370, 349, 262], .22, { type: 'sawtooth', v: .1, t: .5 }); },
    tick() { tone({ f: 1000, t: .04, type: 'square', v: .08 }); },
    go() { arp([523, 784, 1047], .05, { type: 'square', v: .14, t: .3 }); noise({ f: 4000, t: .2, v: .15, type: 'highpass' }); },
    dice() { for (let i = 0; i < 5; i++) noise({ f: 2400, q: 4, t: .05, v: .3, type: 'bandpass', at: i * .08 + Math.random() * .03 }); },
  };

  /* ---------- musique : une petite boucle composée ici, jouée par un séquenceur ---------- */
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  const SONGS = {
    menu: { bpm: 92, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], mel: [7, 9, 4, 7, 12, 9, 7, 4, 2, 4, 7, 9, 4, 2, 0, -1], drums: 1 },
    duel: { bpm: 124, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], mel: [12, 12, 7, 9, 12, 14, 12, 7, 9, 9, 7, 4, 7, 9, 7, 5], drums: 2 },
    mini: { bpm: 150, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], mel: [0, 4, 7, 12, 7, 4, 0, 4, 5, 9, 12, 9, 7, 11, 14, 12], drums: 2 },
  };
  let song = null, step = 0, nextT = 0, timer = null, cur = null, tracks = null, pendingPlay = null;
  const MUSIC = { menu: 'sons/menu.ogg', duel: 'sons/duel.ogg', mini: 'sons/mini.ogg' }, mbuf = {}, level = n => vol.mus * (n === 'duel' ? .75 : .9);
  function sched() {
    if (!song || !ac) return; const s = SONGS[song], spb = 60 / s.bpm / 2;
    while (nextT < ac.currentTime + .25) {
      const bar = Math.floor(step / 8) % s.chords.length, ch = s.chords[bar], b = step % 8, at = nextT - ac.currentTime, root = ch[0];
      if (b === 0) ch.forEach((n, i) => { tone({ f: N(n), t: spb * 8, type: 'sawtooth', v: .022, a: .08, at }, musG); tone({ f: N(n) * 1.004, t: spb * 8, type: 'triangle', v: .03, a: .1, at }, musG); });
      if (b % 2 === 0) tone({ f: N(root - 24 + (b === 4 ? 7 : 0)), t: spb * 1.8, type: 'triangle', v: .16, at }, musG);
      const m = s.mel[(step + Math.floor(step / 32) * 3) % s.mel.length];
      if (b % 2 === 0 || (step * 7 + bar) % 5 === 0) tone({ f: N(root + 12 + m), t: spb * 1.6, type: 'square', v: .035, a: .01, at }, musG);
      if (s.drums) {
        if (b === 0 || b === 4 || (s.drums > 1 && b === 3)) { tone({ f: 150, f2: 45, t: .16, v: .28, at }, musG); }
        if (b === 2 || b === 6) noise({ f: 1800, q: 1.5, t: .1, v: .13, type: 'bandpass', at }, musG);
        noise({ f: 8000, t: .03, v: s.drums > 1 || b % 2 ? .04 : .02, type: 'highpass', at }, musG);
      }
      step++; nextT += spb;
    }
  }
  const api = {
    play(n) { try { ctx(); if (bufs[n]) { const s = ac.createBufferSource(); s.buffer = bufs[n]; s.connect(sfxG); s.start(); } else if (S[n]) S[n](); } catch (e) { } },
    /* musique : nos morceaux composés dans musique/compose.py (sons/<nom>.ogg), joués en boucle sans coupure, avec fondu.
       Si un fichier manque, on retombe sur la petite boucle de secours fabriquée ici. */
    music(n) { try { if (n === cur) return; cur = n; clearInterval(timer); song = null; ctx();
        const old = tracks; tracks = null; if (old) { old.g.gain.setTargetAtTime(0, ac.currentTime, .25); setTimeout(() => { try { old.src.stop(); } catch (e) { } }, 1500); }
        if (!n) return;
        const play = buf => { if (cur !== n) return; const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g).connect(out); src.start();
          g.gain.setTargetAtTime(level(n), ac.currentTime, .4); tracks = { src, g }; };
        const fallback = () => { if (cur !== n) return; song = n; step = 0; nextT = ac.currentTime + .1; timer = setInterval(sched, 80); };
        if (mbuf[n]) return play(mbuf[n]);
        const x = new XMLHttpRequest(); x.open('GET', MUSIC[n]); x.responseType = 'arraybuffer';
        x.onload = () => { if (!x.response || !x.response.byteLength) return fallback(); ac.decodeAudioData(x.response, buf => { mbuf[n] = buf; play(buf); }, fallback); };
        x.onerror = fallback; x.send(); } catch (e) { } },
    set(k, v) { vol[k] = v; STORE.set('bdcSnd', JSON.stringify(vol)); if (ac) { sfxG.gain.value = vol.sfx; musG.gain.value = vol.mus * .5; } if (tracks) tracks.g.gain.setTargetAtTime(level(cur), ac.currentTime, .1); },
    vol,
    /* pour les tests : quel morceau joue et lesquels sont chargés */
    state: () => ({ cur, playing: !!tracks, loaded: Object.keys(mbuf), fallback: !!song }),
  };
  /* les navigateurs n'autorisent le son qu'après un premier clic */
  addEventListener('pointerdown', () => { try { ctx(); } catch (e) { } }, true);
  document.addEventListener('pointerdown', e => { if (e.target.closest('button,.btn,.tab,.chip')) api.play('click'); }, true);
  return api;
})();
/* ancien nom utilisé un peu partout : garde un petit bip de secours */
function beep() { }
