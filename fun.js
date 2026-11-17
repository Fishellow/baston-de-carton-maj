/* fun.js : Expédition, Baston Folle, combos de K.O. et coffre de victoire.
   Tout ce qui change les règles ne tourne qu'en solo (G.rel) : rien ne touche au tirage partagé des parties en ligne.
   Les combos et le coffre ne changent pas la partie, ils marchent partout. */
Object.assign(ICONS, {
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  chest: '<path d="M4 11V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3"/><rect x="4" y="11" width="16" height="9" rx="1.5"/><path d="M12 11v4"/>',
});

/* ---------- trésors (un camp) et règles folles (les deux camps) ----------
   start(s) : au début du combat · arrive(c,s) : une créature du camp est posée · turn(s) : début de son tour · end(s) : fin de son tour · pick(X) : quand on le ramasse en expédition */
const REL = {
  gourde: { n: 'Gourde géante', x: '+6 points de vie pour toute l\'expédition.', pick(X) { X.max += 6; X.hp += 6; } },
  pile: { n: 'Pile neuve', x: 'Tu commences chaque combat avec 1 énergie de plus.', start(s) { for (const st of G[s].seats) st.maxE += 1; } },
  sac: { n: 'Sac à dos', x: '2 cartes de plus au début du combat.', start(s) { const st = G[s].seats[0]; for (let i = 0; i < 2 && st.deck.length; i++) st.hand.push(st.deck.pop()); } },
  gants: { n: 'Gants de boxe', x: 'Tes créatures arrivent avec +1 attaque.', arrive(c) { c.atk += 1; } },
  doudoune: { n: 'Doudoune', x: 'Tes créatures arrivent avec +2 vie.', arrive(c) { c.hp += 2; c.max += 2; } },
  parapluie: { n: 'Parapluie', x: 'Ta première créature de chaque combat arrive avec un Bouclier.', arrive(c, s) { if (!G.relOnce[s].para) { G.relOnce[s].para = 1; c.shield += 1; } } },
  reveil: { n: 'Réveil en colère', x: 'Ta jauge de rage commence à moitié pleine.', start(s) { G[s].rage = 5; } },
  tirelire: { n: 'Tirelire', x: '+30 pièces à chaque victoire de l\'expédition.' },
  elastique: { n: 'Lance-élastique', x: 'À la fin de ton tour : 1 dégât au héros adverse.', async end(s) { float($('#hero-' + s), 'Élastique !', ''); await hurtH(opp(s), 1); } },
  trousse: { n: 'Trousse de soin', x: 'Au début de ton tour : +2 points de vie.', turn(s) { if (G[s].hp < G[s].maxHp) healH(s, 2); } },
  engrais: { n: 'Engrais', x: 'Tes créatures évoluent 2 tours plus tôt.', arrive(c) { c.turns = (c.turns | 0) + 2; } },
  de: { n: 'Dé pipé', x: 'L\'adversaire commence avec 4 points de vie en moins.', start(s) { const o = opp(s); G[o].hp = Math.max(5, G[o].hp - 4); } },
  /* règles folles : données aux deux camps */
  m_nrj: { n: 'Énergie à gogo', x: 'Tout le monde commence avec 3 énergies de plus.', mut: 1, start(s) { for (const st of G[s].seats) st.maxE += 3; } },
  m_geant: { n: 'Les géants', x: 'Toutes les créatures arrivent avec +2 / +2.', mut: 1, arrive(c) { c.atk += 2; c.hp += 2; c.max += 2; } },
  m_mort: { n: 'Mort subite', x: 'Les héros n\'ont que 10 points de vie.', mut: 1, start(s) { G[s].hp = G[s].maxHp = 10; } },
  m_chaos: { n: 'Table en folie', x: 'Un événement de table à chaque tour.', mut: 1, chaos: 1 },
  m_blinde: { n: 'Tout blindé', x: 'Toutes les créatures arrivent avec un Bouclier.', mut: 1, arrive(c) { c.shield += 1; } },
  m_evo: { n: 'Croissance express', x: 'Les créatures évoluent dès leur premier tour.', mut: 1, arrive(c) { c.turns = (c.turns | 0) + 2; } },
  m_main: { n: 'Main pleine', x: 'Tout le monde commence avec 3 cartes de plus.', mut: 1, start(s) { const st = G[s].seats[0]; for (let i = 0; i < 3 && st.deck.length; i++) st.hand.push(st.deck.pop()); } },
  m_rage: { n: 'Colère noire', x: 'Les jauges de rage commencent pleines.', mut: 1, start(s) { G[s].rage = RAGE_MAX; } },
};
const MUTS = Object.keys(REL).filter(k => REL[k].mut), TREASURES = Object.keys(REL).filter(k => !REL[k].mut);
const relOf = s => (G && G.rel && G.rel[s]) || [];

/* ---------- accroches dans le moteur ---------- */
const KO = { turn: -1, n: 0, best: 0 };
const _newGame = newGame;
newGame = function (o) {
  _newGame(o);
  KO.turn = -1; KO.n = 0; KO.best = 0;
  G.rel = o.mode === 'solo' && o.rel ? { p: (o.rel.p || []).filter(k => REL[k]), e: (o.rel.e || []).filter(k => REL[k]) } : null;
  G.relOnce = { p: {}, e: {} }; G.exp = o.exp || null; G.folle = o.folle || null;
  if (G.exp) { G.p.maxHp = G.exp.max; G.p.hp = G.exp.hp; }
  if (G.rel) { for (const s of ['p', 'e']) for (const k of G.rel[s]) if (REL[k].start) REL[k].start(s); G.chaos = G.rel.p.some(k => REL[k].chaos); render(); }
  if (G.folle && REL[G.folle]) setTimeout(() => { if (G && !G.over) { banner(REL[G.folle].n.toUpperCase()); toast('Règle folle — ' + REL[G.folle].n + ' : ' + REL[G.folle].x); } }, 500);
};
const _playCard = playCard;
playCard = async function (s, i, l, q) {
  const rel = relOf(s), before = G[s].lanes[l];
  await _playCard(s, i, l, q);
  if (!rel.length || !G || G.over) return;
  const c = G[s].lanes[l];
  if (c && c !== before && !c.relDone) { c.relDone = 1; let hit = false; for (const k of rel) if (REL[k].arrive) { REL[k].arrive(c, s); hit = true; } if (hit) { float(slot(s, l), 'Bonus !', 'g'); SND.play('buff'); render(); } }
};
const _startTurn = startTurn;
startTurn = async function (s) {
  if (G && !G.over && G.rel) {
    if (G.turn > 0) for (const k of G.rel[s]) if (REL[k].turn) REL[k].turn(s);
    /* Table en folie : un événement à chaque tour (sauf quand le jeu en lance déjà un) */
    if (G.chaos && G.turn >= 1 && (G.turn + 1) % 3 !== 0) { G.busy = true; await tableEvent(); if (G.over) return; }
  }
  return _startTurn(s);
};
const _endTurn = endTurn;
endTurn = async function (s) {
  if (G && G.rel && !G.busy && !G.over && G.phase === 'main') {
    const hs = G.rel[s].filter(k => REL[k].end);
    if (hs.length) { G.busy = true; render(); for (const k of hs) { await REL[k].end(s); if (G.over) return; } G.busy = false; }
  }
  return _endTurn(s);
};
/* combos : plusieurs K.O. dans le même tour, et les très gros coups */
const _hurt = hurt;
hurt = async function (s, l, n, o) {
  const c = G && G[s].lanes[l], shield = c && c.shield > 0 && !(o && o.through);
  await _hurt(s, l, n, o);
  if (!c || !G) return;
  if (!shield && n >= 6 && V.quake) { V.quake(.5); float(slot(s, l), 'ÉNORME !', ''); }
  if (G[s].lanes[l] === c || G.active !== opp(s)) return;
  if (KO.turn !== G.turn) { KO.turn = G.turn; KO.n = 0; }
  KO.n++;
  if (KO.n >= 2 && !G.over) {
    banner(KO.n === 2 ? 'DOUBLE K.O. !' : KO.n === 3 ? 'TRIPLE K.O. !' : 'CARNAGE !'); SND.play('legend'); if (V.quake) V.quake(.3 + KO.n * .1);
    if (opp(s) === ME) KO.best = Math.max(KO.best, KO.n);
  }
};

/* ---------- fin de partie : combo, coffre, suite de l'expédition ---------- */
const CHEST = () => { const x = Math.random() * 100; if (x < 4) return { coins: 150, big: 1 }; if (x < 30) { const id = rollCard('c'); return { card: id }; } if (x < 55) return { coins: 50 + (Math.random() * 5 | 0) * 10 }; return { coins: 15 + (Math.random() * 6 | 0) * 5 }; };
const chestTxt = c => c.card ? 'Carte : ' + C[c.card].n : (c.big ? 'JACKPOT ' : '') + c.coins + ' pièces';
function chestGive(c) { if (c.card) { const dust = S.add(c.card); return dust ? C[c.card].n + ' (déjà au maximum : +' + dust + ' pièces)' : 'Nouvelle carte : ' + C[c.card].n; } S.d.coins += c.coins; return (c.big ? 'JACKPOT ! ' : '') + '+' + c.coins + ' pièces'; }
const _finish = finish;
finish = function (w, why) {
  if (!G || G.over) return _finish(w, why);
  const auto = G.auto; _finish(w, why); if (auto) return;
  const win = w === ME, P = $('#endP'); let extra = '';
  if (win && KO.best >= 2) { const b = (KO.best - 1) * 10; S.d.coins += b; extra += `<div class="lvup">Combo ${KO.best} K.O. : +${b} pièces</div>`; }
  /* expédition */
  const X = S.d.exp;
  if (G.exp && X) {
    if (win) {
      const b = 20 + X.f * 10 + (X.rel.includes('tirelire') ? 30 : 0); S.d.coins += b; X.hp = Math.min(X.max, Math.max(1, G[ME].hp) + 4); X.f++;
      S.d.expBest = Math.max(S.d.expBest | 0, X.f);
      if (X.f >= EXF.length) { S.d.coins += 300; S.d.expWins = (S.d.expWins | 0) + 1; S.d.exp = null; extra += `<div class="story-win">Expédition terminée ! +${b + 300} pièces</div>`; }
      else { const pool = TREASURES.filter(k => !X.rel.includes(k)); X.pend = []; while (X.pend.length < 3 && pool.length) X.pend.push(pool.splice(Math.random() * pool.length | 0, 1)[0]); extra += `<div class="story-win">Étage ${X.f} sur ${EXF.length} réussi : +${b} pièces. Un trésor t'attend.</div>`; }
    } else { extra += `<div class="lvup bad">Expédition terminée à l'étage ${X.f + 1} sur ${EXF.length}.</div>`; S.d.exp = null; }
  }
  /* coffre : 3 coffres, un seul à ouvrir */
  if (win) { G.chests = [CHEST(), CHEST(), CHEST()]; extra += `<div class="chests"><div class="chq">Choisis un coffre</div><div class="chrow">${[0, 1, 2].map(i => `<button class="chest" data-ch="${i}" aria-label="Coffre ${i + 1}">${IC('chest')}<span></span></button>`).join('')}</div></div>`; }
  S.save(); P.insertAdjacentHTML('beforeend', extra);
  const again = $('#again'); if (G.exp && S.d.exp) { again.textContent = 'Continuer'; try { sessionStorage.setItem('bdcExp', '1'); } catch (e) { } }
};
document.addEventListener('click', e => {
  const b = e.target.closest('.chest'); if (!b || !G || !G.chests) return;
  const all = [...document.querySelectorAll('.chest')], i = +b.dataset.ch, list = G.chests; G.chests = null;
  const txt = chestGive(list[i]); S.save(); SND.play(list[i].big ? 'legend' : 'coin');
  all.forEach((el, k) => { el.disabled = true; el.classList.add(k === i ? 'mine' : 'other'); el.querySelector('span').textContent = k === i ? txt : chestTxt(list[k]); });
  const q = document.querySelector('.chq'); if (q) q.textContent = 'Dans les autres coffres, il y avait…';
});

/* ---------- Baston Folle ---------- */
function startFolle() { const k = MUTS[Math.random() * MUTS.length | 0], o = OPPS[Math.random() * OPPS.length | 0]; startSolo({ n: o.n, f: o.f, ti: o.ti, deck: oppDeck(o.t), opt: { folle: k, rel: { p: [k], e: [k] }, bet: Math.min(BET, S.d.coins) } }); }

/* ---------- Expédition : 7 combats à la suite, les points de vie se gardent, un trésor après chaque victoire ---------- */
const EXF = [{ hp: 14 }, { hp: 16 }, { hp: 18, rel: ['gants'] }, { hp: 20, rel: ['doudoune'] }, { hp: 22, rel: ['gants', 'pile'] }, { hp: 24, rel: ['gants', 'doudoune', 'parapluie'] }, { hp: 40, boss: 1, rel: ['gants', 'doudoune', 'reveil'] }];
let EXQUIT = false;
function drawExpe() {
  const X = S.d.exp, B = $('#expeBody'); EXQUIT = false;
  const path = n => `<div class="expath">${EXF.map((f, i) => `<i class="${i < n ? 'done' : i === n ? 'cur' : ''} ${f.boss ? 'boss' : ''}">${f.boss ? 'Boss' : i + 1}</i>`).join('')}</div>`;
  if (!X) {
    B.innerHTML = `${path(-1)}<p>7 combats à la suite avec ton deck. Tes points de vie ne remontent presque pas entre deux combats.<br>Après chaque victoire, tu choisis un trésor qui te rend plus fort jusqu'à la fin.</p>
      <div class="small">Ton record : étage ${S.d.expBest | 0} sur ${EXF.length} · Expéditions terminées : ${S.d.expWins | 0}</div>
      <div class="exbtns"><button class="btn yellow" data-ex="new">Partir en expédition</button><button class="btn sm" data-ex="x">Retour</button></div>`; return;
  }
  const rels = X.rel.length ? X.rel.map(k => `<span class="exrel" title="${REL[k].x}">${REL[k].n}</span>`).join('') : '<span class="small">Aucun trésor pour l\'instant.</span>';
  const head = `${path(X.f)}<div class="exstat"><b>${IC('heart')} ${X.hp} / ${X.max}</b><div class="exrels">${rels}</div></div>`;
  if (X.pend && X.pend.length) {
    B.innerHTML = head + `<div class="drq">Choisis un trésor</div><div class="extre">${X.pend.map(k => `<button class="btn extr" data-tr="${k}">${IC('gift')}<b>${REL[k].n}</b><small>${REL[k].x}</small></button>`).join('')}</div>`; return;
  }
  const f = EXF[X.f];
  B.innerHTML = head + `<p><b>${f.boss ? 'Le boss' : 'Étage ' + (X.f + 1)}</b> : un adversaire à ${f.hp} points de vie.${f.rel ? '<br>Ses bonus : ' + f.rel.map(k => REL[k].n).join(', ') + '.' : ''}</p>
    <div class="exbtns"><button class="btn red" data-ex="go">Combattre</button><button class="btn sm" data-ex="x">Retour</button><button class="btn sm" data-ex="quit">Abandonner</button></div>`;
}
function openExpe() { $('#modes').classList.add('hide'); $('#expe').classList.remove('hide'); drawExpe(); }
function expeFight() {
  const X = S.d.exp, f = EXF[X.f]; if (!myDeck()) return; $('#expe').classList.add('hide');
  const o = f.boss ? { n: 'Le Grand Lessiveur', f: 'ogre', ti: 'Boss', deck: bossBig() } : (() => { const p = OPPS[Math.random() * OPPS.length | 0]; return { n: p.n, f: p.f, ti: p.ti, deck: oppDeck(p.t) }; })();
  startSolo({ n: o.n, f: o.f, ti: o.ti, deck: o.deck, opt: { hpE: f.hp, exp: { hp: X.hp, max: X.max }, rel: { p: X.rel.slice(), e: f.rel || [] } } });
}
document.body.insertAdjacentHTML('beforeend', '<div id="expe" class="hide"><div class="panel exbox"><div class="label">Expédition</div><div id="expeBody"></div></div></div>');
$('#expe').addEventListener('click', e => {
  let b; const X = S.d.exp;
  if (b = e.target.closest('[data-tr]')) { const k = b.dataset.tr; if (!X || !X.pend || !X.pend.includes(k)) return; X.rel.push(k); X.pend = null; if (REL[k].pick) REL[k].pick(X); S.save(); SND.play('coin'); toast(REL[k].n + ' : ' + REL[k].x); return drawExpe(); }
  if (!(b = e.target.closest('[data-ex]'))) return; const a = b.dataset.ex;
  if (a === 'x') return $('#expe').classList.add('hide');
  if (a === 'new') { if (!myDeck()) return; S.d.exp = { f: 0, hp: 20, max: 20, rel: [], pend: null }; S.save(); return drawExpe(); }
  if (a === 'go') return expeFight();
  if (a === 'quit') { if (!EXQUIT) { EXQUIT = true; b.textContent = 'Sûr ? Clique encore'; return; } S.d.exp = null; S.save(); return drawExpe(); }
});

/* ---------- les deux nouveaux modes dans le choix du mode ---------- */
document.querySelector('#modes .modes').insertAdjacentHTML('beforeend',
  `<button class="btn mode" data-fun="expe">${IC('map')}Expédition<small>7 combats à la suite. Un trésor à choisir après chaque victoire.</small></button>
   <button class="btn mode" data-fun="folle">${IC('dice')}Baston Folle<small>Une règle folle tirée au hasard change toute la partie.</small></button>`);
$('#modes').addEventListener('click', e => { const b = e.target.closest('[data-fun]'); if (!b) return; if (b.dataset.fun === 'expe') openExpe(); else startFolle(); });
/* après un combat d'expédition, « Continuer » relance le jeu et rouvre l'expédition */
try { if (sessionStorage.getItem('bdcExp')) { sessionStorage.removeItem('bdcExp'); if (S.d.exp) setTimeout(openExpe, 400); } } catch (e) { }
