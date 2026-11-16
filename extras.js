/* Défi du jour, saison (affichage) et créateur de carte. */

/* ---------- défi du jour : le même pour tout le monde (tiré avec la date), 100 pièces à la première victoire ---------- */
const DEFIS = [
  { n: 'Le robot costaud', x: 'Il a 30 points de vie.', o: { hpE: 30 } },
  { n: 'Grande table', x: '6 couloirs et un quartier général chacun.', o: { big: true } },
  { n: 'Petit budget', x: 'Ton deck n\'a que des cartes à 3 énergies ou moins.', f: id => C[id].c <= 3 },
  { n: 'Que des gros', x: 'Ton deck n\'a que des cartes à 3 énergies ou plus.', f: id => C[id].c >= 3 },
  { n: 'Sans sorts', x: 'Ton deck n\'a que des créatures et des bâtiments.', f: id => C[id].k !== 's' },
];
function defiToday() {
  const R = dayRng('defi'), D = DEFIS[R() * DEFIS.length | 0], pool = IDS.filter(id => !C[id].custom && (!D.f || D.f(id))), cr = pool.filter(id => C[id].k === 'c'), deck = [];
  /* un deck imposé : au moins 12 créatures, 2 exemplaires au plus */
  for (let g = 0; deck.length < 20 && g < 900; g++) { const from = deck.length < 12 ? cr : pool, id = from[R() * from.length | 0]; if (deck.filter(x => x === id).length < 2) deck.push(id); }
  return { D, deck, opp: OPPS[R() * OPPS.length | 0] };
}
function startDefi() { const t = defiToday(), o = t.opp; startSolo({ n: o.n, f: o.f, ti: o.ti, deck: oppDeck(o.t), mine: t.deck, opt: Object.assign({ defi: 1 }, t.D.o || {}) }); }

/* ---------- menu : étiquette du défi + barre de la saison ---------- */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function drawExtras() {
  const t = defiToday(), done = S.d.defi === dayKey(); $('#defiTag').textContent = t.D.n + ' : ' + t.D.x + ' Deck imposé. ' + (done ? 'Déjà réussi aujourd\'hui.' : '100 pièces à gagner.');
  const se = S.d.season, nx = SEASON[se.got], q = $('#quests'); if (!q) return; const old = q.querySelector('.season'); if (old) old.remove();
  q.insertAdjacentHTML('beforeend', `<div class="season"><div class="label">Saison de ${MOIS[new Date().getMonth()]}</div>
    <div class="qbar"><i style="width:${nx ? Math.min(100, se.xp / nx[0] * 100) : 100}%"></i><span>${nx ? se.xp + ' / ' + nx[0] + ' XP' : 'Saison terminée'}</span></div>
    <div class="small">${nx ? 'Palier ' + (se.got + 1) + ' sur ' + SEASON.length + ' : ' + seasonTxt(nx[1]) : 'Tu as tout gagné ce mois-ci. Nouvelle saison le mois prochain.'}</div></div>`);
}

/* ---------- créateur de carte ---------- */
const MK = { t: 'fromage', p: 'none', art: 'poulet' };
const mkDef = () => customDef({ n: $('#mkName').value || 'Ma carte', t: MK.t, art: MK.art, a: +$('#mkA').value, h: +$('#mkH').value, p: MK.p });
const mkCode = x => btoa(unescape(encodeURIComponent(JSON.stringify(x))));
function drawMaker() {
  const arts = IDS.filter(id => C[id].k === 'c' && !C[id].custom && !C[id].img && window.PORT && PORT[id]);
  if (!arts.includes(MK.art)) MK.art = arts[0];
  $('#mkTerr').innerHTML = CTERR.map(t => `<button class="chip ${t === MK.t ? 'on' : ''}" data-mt="${t}">${T[t].n}</button>`).join('');
  $('#mkPow').innerHTML = Object.keys(CPOW).map(p => `<button class="chip ${p === MK.p ? 'on' : ''}" data-mp="${p}">${CPOW[p].n}</button>`).join('');
  $('#mkArt').innerHTML = arts.map(id => `<button class="${id === MK.art ? 'on' : ''}" data-ma="${id}" title="${C[id].n}"><img src="${PORT[id]}" alt=""></button>`).join('');
  $('#mkAv').textContent = $('#mkA').value; $('#mkHv').textContent = $('#mkH').value;
  /* aperçu : une carte provisoire, jamais ajoutée au jeu */
  const x = mkDef(); if (x) { C.__pv = cr(x.n, x.t, 'R', customCost(x), x.a, x.h, '', CPOW[x.p].x, { hidden: 1 }); PORT.__pv = PORT[x.art]; $('#mkPrev').innerHTML = cardHTML('__pv'); delete C.__pv; }
  $('#mkList').innerHTML = S.d.custom.map((c, i) => `<div class="mkit"><b>${c.n}</b><button class="btn sm" data-mc="${i}">Copier le code</button><button class="btn sm" data-md="${i}">Supprimer</button></div>`).join('') || '<div class="small">Aucune pour l\'instant (8 au maximum).</div>';
  $('#mkGo').disabled = S.d.custom.length >= 8;
}
function mkSave(x) { if (S.d.custom.length >= 8) return toast('8 cartes inventées au maximum.'); const id = customId(x); if (S.d.custom.some(c => customId(c) === id)) return toast('Tu as déjà cette carte.');
  S.d.custom.push(x); S.d.col[id] = 2; S.save(); customAdd(x); toast('Carte ajoutée. Le jeu se relance pour la charger…'); setTimeout(() => location.reload(), 1300); }
$('#bMaker').addEventListener('click', () => { $('#maker').classList.remove('hide'); drawMaker(); });
$('#mkX').addEventListener('click', () => $('#maker').classList.add('hide'));
$('#maker').addEventListener('input', e => { if (e.target.matches('#mkName,#mkA,#mkH')) { const p = $('#mkPrev'), x = mkDef(); $('#mkAv').textContent = $('#mkA').value; $('#mkHv').textContent = $('#mkH').value; if (x) { C.__pv = cr(x.n, x.t, 'R', customCost(x), x.a, x.h, '', CPOW[x.p].x, { hidden: 1 }); PORT.__pv = PORT[x.art]; p.innerHTML = cardHTML('__pv'); delete C.__pv; } } });
$('#maker').addEventListener('click', e => { let b;
  if (b = e.target.closest('[data-mt]')) MK.t = b.dataset.mt; else if (b = e.target.closest('[data-mp]')) MK.p = b.dataset.mp; else if (b = e.target.closest('[data-ma]')) MK.art = b.dataset.ma;
  else if (e.target.closest('#mkGo')) { const x = mkDef(); if (!x || !$('#mkName').value.trim()) return toast('Donne un nom à ta carte.'); return mkSave(x); }
  else if (e.target.closest('#mkAdd')) { let x = null; try { x = customDef(JSON.parse(decodeURIComponent(escape(atob($('#mkCode').value.trim()))))); } catch (err) { } if (!x) return toast('Ce code de carte n\'est pas bon.'); return mkSave(x); }
  else if (b = e.target.closest('[data-mc]')) { const t = mkCode(S.d.custom[+b.dataset.mc]), i = document.createElement('input'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast('Code copié : envoie-le à ton pote.'); } catch (err) { } i.remove(); return; }
  else if (b = e.target.closest('[data-md]')) { const c = S.d.custom.splice(+b.dataset.md, 1)[0]; if (c) { const id = customId(c); delete S.d.col[id]; S.d.decks.forEach(k => k.cards = k.cards.filter(z => z !== id)); S.save(); toast('Carte supprimée. Le jeu se relance…'); setTimeout(() => location.reload(), 1200); } return; }
  else return;
  drawMaker(); });
drawExtras();
