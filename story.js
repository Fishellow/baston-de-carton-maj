/* Skins de table + mode histoire. */
/* mat = couleur du tapis de jeu, line = ses traits, w1 / w2 = rayures du papier peint */
const TABLES={classic:{n:'Nuit au grenier',mat:'#1d2440',line:'#7ff6ff',w1:'#3b2d6b',w2:'#44357a'},foret:{n:'Cabane en forêt',mat:'#1f4d3a',line:'#b7f0a8',w1:'#2f5d46',w2:'#376b51'},
  plage:{n:'Vacances à la plage',mat:'#1b6a8a',line:'#fff3b0',w1:'#3f9bbf',w2:'#4aa8cc'},lave:{n:'Salle du volcan',mat:'#3a1420',line:'#ff9f1c',w1:'#5a1f2b',w2:'#6b2634'},
  or:{n:'Salle du trône',mat:'#3d2f0f',line:'#ffd23f',w1:'#6b4b12',w2:'#7a5716'},bonbon:{n:'Chambre bonbon',mat:'#5a2a5c',line:'#ffb3de',w1:'#8a4a8c',w2:'#9a569c'}};

/* Les chapitres. boss = créature qui sert de visage, t = son terrain préféré, hp = ses PV, big = Grande Baston,
   builds = il joue des bâtiments, r = récompense (c pièces, card carte, table / title objet du casier). */
const STORY=[
  {n:'La Basse-Cour',boss:'poulet',bn:'Chef Poulet',ti:'Comptable en chef',t:'fromage',x:'Le Poulet Comptable a refait ses comptes : il manque trois graines. Pour lui, c\'est forcément toi.',r:{c:80}},
  {n:'Le Marais du Slip',boss:'grenouille',bn:'Baron Grenouille',ti:'Seigneur du marais',t:'slip',x:'Tu as marché sur son nénuphar préféré. Le Baron ne pardonne jamais.',r:{c:60,card:'tortue'}},
  {n:'La Cuisine de l\'Enfer',boss:'piment',bn:'Chef Piment',ti:'Neuf cafés par jour',t:'sauce',hp:22,x:'Il a goûté ta sauce. Il a dit « fade ». La guerre est déclarée.',r:{card:'wasabi',table:'foret'}},
  {n:'Tempête en altitude',boss:'baleine',bn:'Miss Baleine',ti:'Reine des nuages',t:'nuage',hp:24,x:'Tu as crevé un de ses ballons. Elle descend régler ça.',r:{card:'cigogne'}},
  {n:'Le Grand Chantier',boss:'fondue',bn:'Contremaître Fondue',ti:'Chef de chantier',t:'fromage',big:1,builds:1,hp:30,x:'Un chantier géant bloque la table : six couloirs, des bâtiments partout. Il faut passer.',r:{card:'catapulte',table:'plage'}},
  {n:'La Nuit des Chaussettes',boss:'chaussette',bn:'Roi Chaussette',ti:'Roi du panier à linge',t:'slip',hp:26,x:'Chaque nuit, une chaussette disparaît. Tu viens de trouver où elles vont.',r:{card:'chaussale',c:100}},
  {n:'L\'Antre du Dragon',boss:'dragon',bn:'Dragon Ketchup',ti:'Gardien de la sauce',t:'sauce',hp:30,x:'Il garde la dernière bouteille de ketchup du monde. Tu veux des frites.',r:{card:'dragon',table:'lave'}},
  {n:'Le Trône de Camembert',boss:'roi',bn:'Roi Camembert',ti:'Sa Majesté qui pue',t:'fromage',big:1,builds:1,hp:40,x:'Le Roi en personne, sur la grande table. Gagne, et le carton est sauvé.',r:{c:300,table:'or',title:'Sauveur du Carton'}},
];
/* le deck d'un boss : surtout son terrain, quelques sorts, des bâtiments s'il construit */
function bossDeck(ch){const out=[],n={},add=id=>{if(out.length<20&&(n[id]||0)<RAR[C[id].r].max){out.push(id);n[id]=(n[id]||0)+1;return true}return false};
  add(ch.boss);add(ch.boss);
  const mine=IDS.filter(id=>C[id].t===ch.t&&C[id].k==='c'&&C[id].r!=='L');for(let k=0;k<2;k++)for(const id of mine)add(id);
  if(ch.builds)for(const id of IDS.filter(id=>C[id].k==='b').slice(0,4))add(id);
  for(const id of ['claque','claque','gouter','pluie','prout','meteor'])add(id);
  for(const id of randomDeck())add(id);return out.slice(0,20)}
/* donne la récompense d'un chapitre ; renvoie le texte à afficher */
function storyReward(ch){const d=S.d,r=ch.r,t=[];
  if(r.c){d.coins+=r.c;t.push('+'+r.c+' pièces')}
  if(r.card){S.add(r.card);t.push('Carte « '+C[r.card].n+' »')}
  if(r.table&&!d.own.table.includes(r.table)){d.own.table.push(r.table);t.push('Table « '+TABLES[r.table].n+' »')}
  if(r.title&&!d.own.title.includes(r.title)){d.own.title.push(r.title);t.push('Titre « '+r.title+' »')}
  S.save();return t.join(' · ')}
const storyRewardTxt=r=>[r.c&&r.c+' pièces',r.card&&'carte '+C[r.card].n,r.table&&'table '+TABLES[r.table].n,r.title&&'titre '+r.title].filter(Boolean).join(' · ');
