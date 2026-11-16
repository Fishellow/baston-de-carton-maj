/* Baston Royale : tournoi à plusieurs (2 à 8, robots pour compléter) façon « combats automatiques ».
   Chaque manche : on reçoit des pièces, on achète des créatures à la boutique, on les place sur ses 4 couloirs,
   puis chacun affronte un adversaire tiré au sort ; les créatures se battent toutes seules (même combat calculé chez les deux joueurs).
   Le perdant perd des points de vie. 3 créatures identiques fusionnent en une créature à 2 étoiles, puis 3 étoiles.
   L'hôte tient la liste des joueurs, lance les manches et joue les robots. */
const TOUR = { on: false, host: false, code: '', you: 0, started: false, round: 0, phase: '', players: [], gold: 0, board: [null, null, null, null], bench: [null, null, null, null], shop: [], sel: null, lastWin: false, ready: false, until: 0, paid: false, n: 1, champ: null, H: null };
const tMsg = t => $('#tmsg').textContent = t;
function tourReset() { if (TOUR.H) { clearTimeout(TOUR.H.t1); clearTimeout(TOUR.H.t2); } Object.assign(TOUR, { on: false, host: false, code: '', you: 0, started: false, round: 0, phase: '', players: [], gold: 0, board: [null, null, null, null], bench: [null, null, null, null], shop: [], sel: null, lastWin: false, ready: false, until: 0, paid: false, n: 1, champ: null, H: null }); }
const rPrice = id => Math.max(1, C[id].c), rVal = u => rPrice(u.id) * [1, 3, 9][u.star - 1];
const rUnits = a => [0, 1, 2, 3].map(i => { const u = a && a[i]; return u && C[u.id] && C[u.id].k === 'c' ? { id: u.id, star: Math.max(1, Math.min(3, u.star | 0)) } : null; });
const rPower = a => a.reduce((t, u) => t + (u ? (C[u.id].a + C[u.id].h) * STARM[u.star] : 0), 0);
const rShop = round => { const max = Math.min(6, 2 + Math.ceil(round / 2)), pool = IDS.filter(id => C[id].k === 'c' && C[id].c <= max); return [0, 1, 2, 3].map(() => pool[Math.random() * pool.length | 0]); };
const rIncome = (round, won) => 4 + Math.min(round, 5) + (won ? 1 : 0);
/* 3 identiques (même étoile) → 1 avec une étoile de plus */
function rMerge(st) { for (let again = true; again;) { again = false; const all = []; for (const z of ['board', 'bench']) st[z].forEach((u, i) => u && all.push({ u, z, i }));
  for (const x of all) { if (x.u.star >= 3) continue; const same = all.filter(y => y.u.id === x.u.id && y.u.star === x.u.star); if (same.length < 3) continue;
    const keep = same.find(y => y.z === 'board') || same[0]; same.filter(y => y !== keep).sort((p, q) => (p.z === 'bench' ? 0 : 1) - (q.z === 'bench' ? 0 : 1)).slice(0, 2).forEach(y => st[y.z][y.i] = null); keep.u.star++; again = true; break; } } }
function rAdd(st, id) { let z = 'bench', i = st.bench.indexOf(null); if (i < 0) { z = 'board'; i = st.board.indexOf(null); } if (i < 0) return false; st[z][i] = { id, star: 1 }; rMerge(st); return true; }

/* ---------- affichage ---------- */
function drawTour() {
  $('#tstart').classList.toggle('hide', !!TOUR.code); $('#troom').classList.toggle('hide', !TOUR.code || TOUR.started); $('#roy').classList.toggle('hide', !TOUR.started);
  if (!TOUR.code) return;
  if (!TOUR.started) {
    $('#tcode').textContent = TOUR.code;
    $('#tlist').innerHTML = TOUR.players.map((x, i) => `<div class="rp ${i === TOUR.you ? 'me' : ''}"><span class="face">${faceHTML(x.avatar)}</span><b>${x.name}</b></div>`).join('');
    $('#tacts').classList.toggle('hide', !TOUR.host);
    const on = S.d.friends.filter(f => FR.online(f.code));
    $('#tfriends').innerHTML = !TOUR.host ? '<p class="small">C\'est le créateur du tournoi qui invite et qui lance.</p>' : on.map(f => `<div class="fr on"><span class="face">${faceHTML(f.avatar)}</span><div class="frn"><b>${f.name}</b></div><button class="btn sm yellow" data-invt="${f.code}">Inviter</button></div>`).join('') || '<p class="small">Aucun ami en ligne pour l\'instant. Tu peux aussi donner le code.</p>';
    return;
  }
  const me = TOUR.players[TOUR.you] || {}, prep = TOUR.phase === 'prep' && me.alive;
  $('#rplayers').innerHTML = TOUR.players.map((x, i) => ({ x, i })).sort((a, b) => b.x.hp - a.x.hp).map(({ x, i }) => `<div class="rp ${i === TOUR.you ? 'me' : ''} ${x.alive ? '' : 'dead'} ${x.ready && TOUR.phase === 'prep' ? 'ok' : ''}"><span class="face">${faceHTML(x.avatar)}</span><b>${x.name}</b><em>${Math.max(0, x.hp)}</em></div>`).join('');
  $('#rround').textContent = TOUR.phase === 'end' ? 'Tournoi terminé' : 'Manche ' + TOUR.round;
  $('#rgold').innerHTML = COIN + TOUR.gold;
  const slot = (z, i, u) => `<div class="rslot ${TOUR.sel && TOUR.sel.z === z && TOUR.sel.i === i ? 'sel' : ''}" data-z="${z}" data-i="${i}">${u ? cardHTML(u.id, { shownAtk: Math.round(C[u.id].a * STARM[u.star]), hp: Math.max(1, Math.round(C[u.id].h * STARM[u.star])), max: 999 }) + '<div class="stars">' + '★'.repeat(u.star) + '</div>' : ''}</div>`;
  $('#rboard').innerHTML = TOUR.board.map((u, i) => slot('board', i, u)).join(''); $('#rbench').innerHTML = TOUR.bench.map((u, i) => slot('bench', i, u)).join('');
  $('#rshop').innerHTML = prep ? TOUR.shop.map((id, i) => id ? `<div class="rslot ${rPrice(id) > TOUR.gold ? 'no' : ''}" data-buy="${i}">${cardHTML(id)}<div class="cost">${rPrice(id)} pièce${rPrice(id) > 1 ? 's' : ''}</div></div>` : '<div class="rslot"></div>').join('') : '';
  $('#rReroll').disabled = !prep || TOUR.gold < 1; $('#rReady').disabled = !prep || TOUR.ready; $('#rReady').textContent = TOUR.ready ? 'En attente des autres…' : 'Prêt';
  $('#rSell').disabled = !prep || !TOUR.sel; if (TOUR.sel && TOUR[TOUR.sel.z][TOUR.sel.i]) $('#rSell').textContent = 'Vendre · +' + rVal(TOUR[TOUR.sel.z][TOUR.sel.i]); else $('#rSell').textContent = 'Vendre';
  const ch = TOUR.champ != null && TOUR.players[TOUR.champ];
  tMsg(TOUR.phase === 'end' ? (ch ? ch.name + ' gagne le tournoi !' : 'Tournoi terminé.') : !me.alive ? 'Tu es éliminé. Tu peux regarder la suite.' : TOUR.phase === 'fight' ? 'Combats en cours…' : 'Achète, clique une créature puis une case pour la déplacer. 3 identiques = une étoile de plus.');
}
setInterval(() => { if (!TOUR.started || CUR !== 'tour') return; const s = Math.max(0, Math.ceil((TOUR.until - Date.now()) / 1000)); $('#rtimer').textContent = TOUR.phase === 'prep' ? s + ' s' : ''; }, 500);
function tourPay() {
  if (TOUR.champ == null || TOUR.paid || !TOUR.on) return; TOUR.paid = true;
  if (TOUR.champ === TOUR.you) { const g = 50 * Math.max(1, Math.min(8, TOUR.n | 0)); S.d.coins += g; if (!S.d.own.title.includes('Champion du tournoi')) S.d.own.title.push('Champion du tournoi'); toast('Tu gagnes le tournoi ! +' + g + ' pièces et le titre « Champion du tournoi ».'); SND.play('win'); }
  else { S.d.coins += 30; toast('+30 pièces pour ta participation.'); }
  S.save(); drawHud();
}

/* ---------- côté joueur ---------- */
function rSendBoard() { const u = rUnits(TOUR.board); if (TOUR.host) TOUR.H.players[TOUR.you].board = u; else NET.send({ t: 'rboard', units: u }); }
function rState(m) {
  const id = v => Number.isInteger(v) && v >= 0 && v < 8 ? v : null, newRound = m.phase === 'prep' && (m.round | 0) !== TOUR.round;
  TOUR.started = !!m.started; TOUR.you = id(m.you) || 0; TOUR.n = m.n | 0; TOUR.champ = id(m.champ); TOUR.phase = String(m.phase || ''); TOUR.round = m.round | 0;
  TOUR.players = (Array.isArray(m.players) ? m.players : []).slice(0, 8).map(x => ({ name: esc(x && x.name), avatar: x && AVATARS.includes(x.avatar) ? x.avatar : 'poulet', hp: x ? x.hp | 0 : 0, alive: !!(x && x.alive), ready: !!(x && x.ready), look: cleanLook(x) }));
  if (newRound) { TOUR.gold += TOUR.round === 1 ? 5 : rIncome(TOUR.round, TOUR.lastWin); TOUR.shop = rShop(TOUR.round); TOUR.ready = false; TOUR.sel = null; TOUR.until = Date.now() + (m.secs | 0) * 1000; rSendBoard(); SND.play('turn'); }
  if (CUR === 'tour') drawTour(); tourPay();
}
function rFight(m) {
  const me = m.side === 'e' ? 'e' : 'p', o = me === 'p' ? 'e' : 'p', opp = TOUR.players[m.opp | 0]; if (!opp) return; TOUR.fightRound = m.round | 0;
  $('#hud').classList.add('hide');
  newGame({ mode: 'auto', me, seed: m.seed | 0, big: false, first: m.first === 'e' ? 'e' : 'p', auto: { [me]: rUnits(TOUR.board), [o]: rUnits(m.units) }, decks: { p: [], e: [] },
    names: { [me]: S.d.name, [o]: opp.name + (m.ghost ? ' (fantôme)' : '') }, faces: { [me]: S.d.avatar, [o]: opp.avatar }, titles: { p: '', e: '' }, looks: { [me]: myLook(), [o]: opp.look } });
}
TOUR.fightDone = function (won, left) {
  TOUR.lastWin = won; const dmg = 2 + Math.floor(TOUR.round / 2) + (left | 0), r = TOUR.fightRound;
  if (TOUR.host) hReport(TOUR.you, r, won, dmg); else NET.send({ t: 'rres', round: r, win: !!won, dmg });
  show('tour');
};
$('#roy').addEventListener('click', e => {
  const me = TOUR.players[TOUR.you]; if (!me || !me.alive || TOUR.phase !== 'prep') return; let el;
  if (el = e.target.closest('[data-buy]')) { const i = +el.dataset.buy, id = TOUR.shop[i]; if (!id) return; if (rPrice(id) > TOUR.gold) return toast('Pas assez de pièces.'); if (!rAdd(TOUR, id)) return toast('Plus de place : vends une créature.'); TOUR.gold -= rPrice(id); TOUR.shop[i] = null; SND.play('card'); }
  else if (e.target.closest('#rReroll')) { if (TOUR.gold < 1) return; TOUR.gold--; TOUR.shop = rShop(TOUR.round); SND.play('click'); }
  else if (e.target.closest('#rSell')) { const s = TOUR.sel, u = s && TOUR[s.z][s.i]; if (!u) return; TOUR.gold += rVal(u); TOUR[s.z][s.i] = null; TOUR.sel = null; SND.play('click'); }
  else if (e.target.closest('#rReady')) { TOUR.ready = true; if (TOUR.host) hReady(TOUR.you); else NET.send({ t: 'rready' }); }
  else if (el = e.target.closest('[data-z]')) { const z = el.dataset.z, i = +el.dataset.i, s = TOUR.sel;
    if (!s) { if (TOUR[z][i]) TOUR.sel = { z, i }; } else { const a = TOUR[s.z][s.i]; TOUR[s.z][s.i] = TOUR[z][i]; TOUR[z][i] = a; TOUR.sel = null; SND.play('click'); } }
  else return;
  rSendBoard(); drawTour();
});

/* ---------- côté hôte ---------- */
const hPub = () => TOUR.H.players.map(x => ({ name: x.name, avatar: x.avatar, body: x.body, hat: x.hat, hp: x.hp, alive: x.alive, ready: !!x.ready }));
function hSync(secs) { const H = TOUR.H, base = { t: 'rstate', started: TOUR.started, round: H.round, phase: H.phase, secs: secs | 0, players: hPub(), n: TOUR.n, champ: H.champ };
  H.players.forEach((x, i) => { if (x.conn) NET.to(x.conn, Object.assign({ you: i }, base)); }); rState(Object.assign({ you: H.players.findIndex(x => x.host) }, base)); }
function hBot(x, round) { const st = x.st; st.gold += round === 1 ? 5 : rIncome(round, Math.random() < .5);
  for (let k = 0; k < 2; k++) for (const id of rShop(round).sort((a, b) => C[b].c - C[a].c)) if (rPrice(id) <= st.gold && rAdd(st, id)) st.gold -= rPrice(id);
  /* les plus fortes sur le plateau */
  const all = st.board.concat(st.bench).filter(Boolean).sort((a, b) => rVal(b) - rVal(a)); st.board = [0, 1, 2, 3].map(i => all[i] || null); st.bench = [0, 1, 2, 3].map(i => all[i + 4] || null); x.board = rUnits(st.board); }
function hPrep() { const H = TOUR.H; H.round++; H.phase = 'prep'; H.players.forEach(x => { x.ready = false; if (x.alive && x.bot) hBot(x, H.round); }); const secs = H.round === 1 ? 45 : 35; clearTimeout(H.t1); H.t1 = setTimeout(hFight, secs * 1000); hSync(secs); }
function hReady(i) { const H = TOUR.H; if (H.phase !== 'prep') return; H.players[i].ready = true; if (H.players.every(x => !x.alive || x.bot || x.ready)) { clearTimeout(H.t1); H.t1 = setTimeout(hFight, 600); } hSync(); }
function hFight() { const H = TOUR.H; if (H.phase !== 'prep') return; clearTimeout(H.t1); H.phase = 'fight';
  const alive = H.players.map((x, i) => i).filter(i => H.players[i].alive).sort(() => Math.random() - .5); H.pairs = [];
  for (let k = 0; k < alive.length; k += 2) { const a = alive[k], ghost = k + 1 >= alive.length, b = ghost ? alive[Math.random() * (alive.length - 1) | 0] : alive[k + 1]; H.pairs.push({ a, b, ghost, seed: Math.random() * 1e9 | 0, done: false }); }
  hSync();
  for (const p of H.pairs) { const A = H.players[p.a], B = H.players[p.b], first = p.seed % 2 ? 'p' : 'e';
    const tell = (X, side, oi) => { const m = { t: 'rfight', round: H.round, seed: p.seed, side, first, opp: oi, units: H.players[oi].board, ghost: p.ghost && side === 'p' }; if (X.host) rFight(m); else NET.to(X.conn, m); };
    if (!A.bot) tell(A, 'p', p.b); if (!p.ghost && !B.bot) tell(B, 'e', p.a);
    if (A.bot && (p.ghost || B.bot)) { const pa = rPower(A.board) * (.8 + Math.random() * .4), pb = rPower(B.board) * (.8 + Math.random() * .4); p.done = true; p.w = pa >= pb ? p.a : p.b; p.dmg = 3 + Math.floor(H.round / 2) + 2; } }
  clearTimeout(H.t2); H.t2 = setTimeout(hResolve, 80000); if (H.pairs.every(p => p.done)) { clearTimeout(H.t2); H.t2 = setTimeout(hResolve, 3000); } }
function hReport(i, round, won, dmg) { const H = TOUR.H; if (!H || H.phase !== 'fight' || round !== H.round) return; const p = H.pairs.find(q => !q.done && (q.a === i || (!q.ghost && q.b === i))); if (!p) return;
  p.done = true; p.w = won ? i : (p.a === i ? p.b : p.a); p.dmg = Math.max(1, Math.min(20, dmg | 0)); if (H.pairs.every(q => q.done)) { clearTimeout(H.t2); H.t2 = setTimeout(hResolve, 2500); } }
function hResolve() { const H = TOUR.H; if (!H || H.phase !== 'fight') return; clearTimeout(H.t2); H.phase = 'res'; const before = H.players.map(x => x.hp);
  for (const p of H.pairs) { if (!p.done) continue; const l = p.w === p.a ? p.b : p.a; if (p.ghost && l === p.b) continue; H.players[l].hp -= p.dmg; }
  H.players.forEach(x => { if (x.alive && x.hp <= 0) x.alive = false; });
  const left = H.players.map((x, i) => i).filter(i => H.players[i].alive);
  if (left.length <= 1) { H.phase = 'end'; H.champ = left.length ? left[0] : before.indexOf(Math.max(...before.filter((v, i) => v > 0 && H.players[i].hp <= 0))); return hSync(); }
  hSync(); H.t1 = setTimeout(hPrep, 2500); }
function tourLeft(c) { const H = TOUR.H; if (!H) return; const i = H.players.findIndex(x => x.conn === c); if (i < 0) return; const x = H.players[i];
  if (!TOUR.started) { H.players.splice(i, 1); TOUR.players = hPub(); TOUR.you = H.players.findIndex(p => p.host); return drawTour(); }
  x.conn = null; x.bot = true; x.st = { gold: 3, board: rUnits(x.board), bench: [null, null, null, null] };
  if (H.phase === 'fight') { const p = H.pairs.find(q => !q.done && (q.a === i || (!q.ghost && q.b === i))); if (p) { const o = p.a === i ? p.b : p.a; if (p.ghost || H.players[o].bot) { p.done = true; p.w = o; p.dmg = 3; } } }
  if (H.phase === 'prep') hReady(i); else hSync(); }
function tourHostData(m, c) { const H = TOUR.H; if (!m || !H) return; const i = H.players.findIndex(x => x.conn === c);
  if (m.t === 'hello') { if (TOUR.started || i >= 0 || H.players.length >= 8) return; const lk = cleanLook(m), x = { name: esc(m.name), avatar: AVATARS.includes(m.avatar) ? m.avatar : 'poulet', body: lk.body, hat: lk.hat }; x.conn = c; H.players.push(Object.assign(x, { hp: 20, alive: true, board: rUnits([]) })); SND.play('quest'); TOUR.players = hPub(); NET.conns.forEach(k => NET.to(k, { t: 'rlobby', players: TOUR.players, you: H.players.findIndex(p => p.conn === k) })); return drawTour(); }
  if (i < 0 || !TOUR.started) return;
  if (m.t === 'rboard') H.players[i].board = rUnits(m.units); else if (m.t === 'rready') hReady(i); else if (m.t === 'rres') hReport(i, m.round | 0, !!m.win, m.dmg | 0); }
function tourHost(cb) { const d = myDeck(); if (TOUR.host && TOUR.code) { cb && cb(TOUR.code); return; }
  tourReset(); const code = rnd4(); TOUR.on = true; TOUR.host = true; TOUR.H = { round: 0, phase: 'lobby', champ: null, pairs: [], players: [Object.assign({ host: true, hp: 20, alive: true, board: rUnits([]) }, myCard())] }; TOUR.players = hPub(); tMsg('Création du tournoi…');
  NET.onClose = tourLeft; NET.onData = tourHostData;
  NET.host(code, () => { TOUR.code = code; tMsg('Donne le code à tes potes ou invite tes amis. Les places vides seront des robots.'); drawTour(); cb && cb(code); }, e => { tourReset(); drawTour(); tMsg(errText(e)); }, 7); }
function tourGo() { const H = TOUR.H; if (!TOUR.host || TOUR.started || !TOUR.code) return; TOUR.n = H.players.length; const bots = botSeats();
  while (H.players.length < 6 && bots.length) { const b = bots.pop(); H.players.push({ name: b.name, avatar: b.avatar, body: b.body, hat: b.hat, bot: true, hp: 20, alive: true, board: rUnits([]), st: { gold: 0, board: [null, null, null, null], bench: [null, null, null, null] } }); }
  TOUR.started = true; NET.max = 0; hPrep(); }

/* ---------- côté invité ---------- */
function tourJoin(code) { tourReset(); TOUR.on = true; drawTour(); tMsg('Connexion…'); let why = 'Le tournoi a été fermé.';
  NET.onClose = () => { const live = G && !G.over && !$('#app').classList.contains('hide'); tourReset(); if (live) return location.reload(); if (CUR === 'tour') drawTour(); tMsg(why); };
  NET.onData = m => { if (!m) return;
    if (m.t === 'full') { why = 'Ce tournoi est plein ou déjà lancé.'; return; }
    if (m.t === 'bad') { why = 'Il faut la même version du jeu pour tous.'; return; }
    if (m.t === 'rlobby' && Array.isArray(m.players)) { TOUR.code = code; TOUR.you = m.you | 0; TOUR.players = m.players.slice(0, 8).map(x => ({ name: esc(x && x.name), avatar: x && AVATARS.includes(x.avatar) ? x.avatar : 'poulet' })); tMsg('Tu es inscrit. Le créateur lance le tournoi quand tout le monde est là.'); if (CUR === 'tour') drawTour(); return; }
    if (m.t === 'rstate') { TOUR.code = code; return rState(m); }
    if (m.t === 'rfight') return rFight(m); };
  NET.join(code, () => NET.send(Object.assign({ t: 'hello', deck: S.autoDeck() }, myCard())), e => tMsg(errText(e))); }

$('#btHost').addEventListener('click', () => tourHost());
$('#btJoin').addEventListener('click', () => { const code = $('#jtcode').value.toUpperCase().replace(/[^A-Z]/g, ''); if (code.length !== 4) return tMsg('Le code fait 4 lettres.'); tourJoin(code); });
$('#btGo').addEventListener('click', tourGo);
$('#tfriends').addEventListener('click', e => { const b = e.target.closest('[data-invt]'); if (!b || !TOUR.code) return; const f = FR.friend(b.dataset.invt); if (f && FR.invite(f.code, 'tour', TOUR.code)) { b.disabled = true; b.textContent = 'Invité'; toast('Invitation envoyée à ' + f.name + '.'); } });
