/* Cartes inventées par les joueurs. Chargé juste après les modèles 3D et AVANT le reste du jeu :
   chaque carte inventée devient une vraie carte (C[id]) qui réutilise le modèle 3D d'une créature existante.
   Une carte = { n: nom, t: terrain, art: créature dont on prend le modèle, a: attaque, h: vie, p: pouvoir }.
   Son prix en énergie est calculé (pas choisi) pour qu'elle reste équilibrée. */
const CPOW = {
  none: { n: 'Aucun', x: 'Une carte inventée par un pote.', o: {}, k: 0 },
  vol: { n: 'Vol', x: 'Vol : tape toujours le héros direct.', o: { vol: 1 }, k: 1.5 },
  shield: { n: 'Bouclier', x: 'Bouclier 1 : ignore le premier coup.', o: { shield: 1 }, k: 1 },
  poison: { n: 'Poison', x: 'Poison : sa victime perd 1 PV à chaque tour.', o: { poison: 1 }, k: 1 },
  double: { n: 'Double', x: 'Attaque 2 fois.', o: { double: 1 }, k: 2 },
  regen: { n: 'Soin', x: 'Fin de tour : se soigne de 1.', o: { regen: 1 }, k: .7 },
  rage: { n: 'Rage', x: 'Rage : +1 attaque à chaque coup encaissé.', o: { rage: 1 }, k: 1 },
  thorns: { n: 'Épines', x: 'Épines : la créature qui la tape prend 1 dégât.', o: { thorns: 1 }, k: .8 },
  vamp: { n: 'Vampire', x: 'Vampire : soigne ton héros de 1 quand elle attaque.', o: { vamp: 1 }, k: .8 },
};
const CTERR = ['fromage', 'sauce', 'slip', 'nuage'];
/* vérifie et nettoie une carte inventée (la mienne ou celle reçue d'un pote) */
function customDef(x) {
  if (!x || typeof x !== 'object') return null;
  const n = String(x.n || '').replace(/[<>&"'`]/g, '').trim().slice(0, 18), a = x.a | 0, h = x.h | 0, src = C[x.art];
  if (!n || !CTERR.includes(x.t) || !CPOW[x.p] || !src || src.k !== 'c' || src.custom || src.img || a < 0 || a > 8 || h < 1 || h > 9) return null;
  return { n, t: x.t, art: String(x.art), a, h, p: x.p };
}
const customCost = x => Math.max(1, Math.min(6, Math.round((x.a + x.h) / 2.3 + CPOW[x.p].k)));
function customId(x) { let k = 7; for (const ch of JSON.stringify([x.n, x.t, x.art, x.a, x.h, x.p])) k = (k * 31 + ch.charCodeAt(0)) >>> 0; return 'x' + k.toString(36); }
function customAdd(x) {
  const id = customId(x); C[id] = cr(x.n, x.t, 'R', customCost(x), x.a, x.h, '', CPOW[x.p].x, Object.assign({ custom: 1, art: x.art }, CPOW[x.p].o));
  if (window.BB && BB[x.art]) BB[id] = BB[x.art]; if (!IDS.includes(id)) IDS.push(id); return id;
}
(function () { try { const d = JSON.parse(STORE.get('bdc1') || '{}'); (Array.isArray(d.custom) ? d.custom : []).slice(0, 8).forEach(x => { const c = customDef(x); if (c) customAdd(c); }); } catch (e) { } })();
