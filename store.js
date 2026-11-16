/* Sauvegarde : pièces, collection, decks, niveau, quêtes, objets débloqués. */
/* les avatars sont des créatures du jeu (on affiche leur portrait 3D) */
const AVATARS=['poulet','souris','grenouille','pigeon','piment','raclette','chaussette','canard','vache','fantome','mouton','licorne','dragon','ogre','kebab','baleine','roi','ovni'];
/* ---------- objets à débloquer ---------- */
const BACKS={classic:{n:'Classique',a:'#e8443a',b:'#ffd23f'},nuit:{n:'Nuit étoilée',a:'#1d2440',b:'#7ff6ff'},fromage:{n:'Fromage',a:'#ffd23f',b:'#f4a300'},
  slip:{n:'Marais',a:'#58d68d',b:'#fff6e0'},or:{n:'Or massif',a:'#ffc933',b:'#fff3b0'},lave:{n:'Lave',a:'#e8443a',b:'#2a1b3d'}};
/* le perso assis à la table : sweats et chapeaux (modèles perso_* et hat_*) */
const BODIES={bleu:{n:'Bleu'},rouge:{n:'Rouge étoile'},vert:{n:'Vert rayé'},violet:{n:'Violet éclair'},noir:{n:'Noir Boss'},rose:{n:'Rose cœur'}};
const HATS={aucun:{n:'Aucun'},casquette:{n:'Casquette'},bonnet:{n:'Bonnet'},cowboy:{n:'Cow-boy'},chef:{n:'Toque'},viking:{n:'Casque à cornes'},couronne:{n:'Couronne'}};
const HALOS={bleu:{n:'Bleu',c:0x4cc9ff},vert:{n:'Vert',c:0x7bd88f},or:{n:'Or',c:0xffc933},violet:{n:'Violet',c:0xb388ff},rouge:{n:'Rouge',c:0xff7b54},blanc:{n:'Blanc pur',c:0xffffff}};
const TITLES=['Débutant','Bagarreur','Champion du Carton','Légende','Le Boss Final','Sauveur du Carton'];
/* récompense de chaque niveau : c = pièces, f = paquets offerts, u / u2 = [type, id] débloqué */
const LEVELS={2:{c:50},3:{u:['avatar','canard']},4:{u:['back','nuit']},5:{f:1,u:['title','Bagarreur']},6:{u:['halo','vert']},7:{u:['avatar','vache']},8:{u:['back','fromage']},9:{c:100,u:['avatar','fantome']},
  10:{u:['halo','or'],u2:['title','Champion du Carton']},11:{u:['avatar','mouton']},12:{u:['back','slip']},13:{f:1,u:['avatar','licorne']},14:{u:['halo','violet']},15:{u:['back','or'],u2:['title','Légende']},
  16:{u:['avatar','dragon']},17:{c:150,u:['avatar','ogre']},18:{u:['halo','rouge']},19:{u:['back','lave']},20:{u:['avatar','roi'],u2:['title','Le Boss Final'],c:300},21:{u:['halo','blanc'],u2:['table','bonbon']},22:{u:['avatar','kebab']},23:{f:1},24:{u:['avatar','baleine']},25:{u:['avatar','ovni'],c:300}};
const UNAME={avatar:'Avatar',back:'Dos de carte',halo:'Halo',title:'Titre',table:'Table'};
const uTxt=u=>UNAME[u[0]]+' « '+(u[0]==='back'?BACKS[u[1]].n:u[0]==='halo'?HALOS[u[1]].n:u[0]==='avatar'?C[u[1]].n:u[0]==='table'?TABLES[u[1]].n:u[1])+' »';
const rewardTxt=r=>[r.c&&'+'+r.c+' pièces',r.f&&'+'+r.f+' paquet offert',r.u&&uTxt(r.u),r.u2&&uTxt(r.u2)].filter(Boolean).join(' · ');
/* ---------- quêtes du jour ---------- */
const QUESTS=[{n:'Gagne 1 duel',k:'win',g:1,r:60},{n:'Gagne 2 duels',k:'win',g:2,r:120},{n:'Joue 3 parties',k:'game',g:3,r:70},{n:'Pose 10 créatures',k:'creature',g:10,r:60},{n:'Lance 4 sorts',k:'spell',g:4,r:60},
  {n:'Inflige 25 dégâts au héros adverse',k:'heroDmg',g:25,r:70},{n:'Mets K.O. 6 créatures',k:'ko',g:6,r:70},{n:'Pose 4 créatures Fromage',k:'t_fromage',g:4,r:50},{n:'Pose 4 créatures Sauce',k:'t_sauce',g:4,r:50},
  {n:'Pose 4 créatures Slip',k:'t_slip',g:4,r:50},{n:'Pose 4 créatures Nuage',k:'t_nuage',g:4,r:50},{n:'Pose un pote légendaire',k:'legend',g:1,r:80},{n:'Gagne 2 mini-jeux de départ',k:'mgwin',g:2,r:50},
  {n:'Ouvre 1 paquet',k:'pack',g:1,r:40},{n:'Gagne avec la moitié de tes PV',k:'winBig',g:1,r:90},{n:'Construis 2 bâtiments',k:'build',g:2,r:60}];
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const dayRng=salt=>{let s=0;for(const ch of dayKey()+salt)s=(s*31+ch.charCodeAt(0))|0;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};

const S={d:null,
  load(){try{this.d=JSON.parse(STORE.get('bdc1'))}catch(e){}
    if(!this.d){const col={};STARTER.forEach(id=>col[id]=(col[id]||0)+1);col.moi=1;
      this.d={name:'Joueur',avatar:'poulet',coins:150,col,decks:[{name:'Deck 1',cards:STARTER.slice()},{name:'Deck 2',cards:STARTER.slice()},{name:'Deck 3',cards:STARTER.slice()}],active:0,wins:0,losses:0,free:3}}
    const d=this.d;
    /* champs ajoutés au fil des versions + ménage de ce qui n'existe plus */
    d.xp=d.xp||0;d.lvl=d.lvl||1;d.own=d.own||{};d.use=d.use||{back:'classic',halo:'bleu',title:'Débutant'};
    d.own.back=d.own.back||['classic'];d.own.table=d.own.table||['classic'];d.use.table=d.use.table||'classic';d.story=d.story||0;d.own.halo=d.own.halo||['bleu'];d.own.title=d.own.title||['Débutant'];
    d.own.avatar=(d.own.avatar||[]).filter(a=>AVATARS.includes(a));for(const a of AVATARS.slice(0,7))if(!d.own.avatar.includes(a))d.own.avatar.push(a);
    for(let l=2;l<=d.lvl;l++){const r=LEVELS[l];if(r)for(const u of [r.u,r.u2])if(u&&!d.own[u[0]].includes(u[1]))d.own[u[0]].push(u[1])}
    if(!d.own.avatar.includes(d.avatar))d.avatar='poulet';
    d.own.body=Object.keys(BODIES);d.own.hat=Object.keys(HATS);if(!BODIES[d.use.body])d.use.body='bleu';if(!HATS[d.use.hat])d.use.hat='casquette';
    /* amis : mon code (tiré une fois pour toutes) et ma liste */
    if(!/^[A-Z0-9]{6}$/.test(d.fcode||''))d.fcode=Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
    d.friends=Array.isArray(d.friends)?d.friends.filter(f=>f&&/^[A-Z0-9]{6}$/.test(f.code||'')).slice(0,30):[];
    if(!d.gotB){d.col.cabane=d.col.cabane||1;d.col.fromagerie=d.col.fromagerie||1;d.gotB=1}
    for(const id in d.col)if(!C[id])delete d.col[id];
    d.decks.forEach(k=>{k.cards=k.cards.filter(id=>C[id]);for(const id of STARTER){if(k.cards.length>=20)break;if(k.cards.filter(x=>x===id).length<Math.min(RAR[C[id].r].max,d.col[id]||0))k.cards.push(id)}});
    this.save();return d},
  save(){STORE.set('bdc1',JSON.stringify(this.d))},
  deck(){return this.d.decks[this.d.active].cards},
  deckOk(cards){if(cards.length!==20)return false;const n={};for(const id of cards){n[id]=(n[id]||0)+1;if(!C[id]||n[id]>Math.min(RAR[C[id].r].max,this.d.col[id]||0))return false}return true},
  /* ajoute une carte ; renvoie les pièces rendues si c'est un doublon en trop */
  add(id){const r=RAR[C[id].r];if((this.d.col[id]||0)>=r.max){this.d.coins+=r.dust;return r.dust}this.d.col[id]=(this.d.col[id]||0)+1;return 0},
  /* Fabrique un deck de 20 cartes avec ce que je possède.
     o.keep = cartes à garder (le reste est complété), o.t = terrain à privilégier.
     Répartition visée : 5 sorts, 2 bâtiments, le reste en créatures dont une bonne moitié pas chères. */
  autoDeck(o){o=o||{};const W={C:1,R:2,E:3.2,L:5},have=id=>Math.min(RAR[C[id].r].max,this.d.col[id]||0);
    const score=id=>{const d=C[id];return W[d.r]+(d.k==='c'?(d.a+d.h)/Math.max(1,d.c)*.35:.6)+(o.t&&d.t===o.t?3:0)};
    const out=[],n={},add=id=>{if(out.length<20&&C[id]&&(n[id]||0)<have(id)){out.push(id);n[id]=(n[id]||0)+1;return true}return false};
    for(const id of o.keep||[])add(id);
    const pool=k=>IDS.filter(id=>C[id].k===k&&have(id)).sort((a,b)=>score(b)-score(a)),cnt=k=>out.filter(id=>C[id].k===k).length;
    const fill=(ids,k,max)=>{for(const id of ids)while(cnt(k)<max&&add(id));};
    fill(pool('s'),'s',5);fill(pool('b'),'b',2);
    const cr=pool('c');fill(cr.filter(id=>C[id].c<=2),'c',Math.max(cnt('c'),7));fill(cr,'c',20);fill(pool('s'),'s',20);fill(pool('b'),'b',20);return out.slice(0,20)},
};
const PRICE={C:30,R:80,E:220,L:600};
/* p = la carte dessinée sur le paquet */
const PACKS={
  carton:{n:'Paquet de Carton',p:'poulet',col:'#d9b382',price:100,x:'5 cartes, dont au moins 1 rare.',slots:['n','n','n','n','r']},
  fromage:{n:'Paquet Fromage',p:'roi',col:'#ffd23f',price:140,x:'4 cartes Fromage, dont 1 rare ou mieux.',slots:['n','n','n','r'],t:'fromage'},
  sauce:{n:'Paquet Sauce',p:'dragon',col:'#e8443a',price:140,x:'4 cartes Sauce, dont 1 rare ou mieux.',slots:['n','n','n','r'],t:'sauce'},
  slip:{n:'Paquet Slip',p:'grenouille',col:'#58d68d',price:140,x:'4 cartes Slip, dont 1 rare ou mieux.',slots:['n','n','n','r'],t:'slip'},
  nuage:{n:'Paquet Nuage',p:'baleine',col:'#7fd4ff',price:140,x:'4 cartes Nuage, dont 1 rare ou mieux.',slots:['n','n','n','r'],t:'nuage'},
  sorts:{n:'Paquet de Sorts',p:'meteor',col:'#b388ff',price:120,x:'3 sorts.',slots:['n','n','r'],t:'spell'},
  chantier:{n:'Paquet Chantier',p:'cabane',col:'#f4a261',price:130,x:'3 bâtiments.',slots:['n','n','r'],t:'build'},
  potes:{n:'Paquet des Potes',p:'moi',col:'#c77dff',price:350,x:'3 cartes, dont 1 pote légendaire garanti.',slots:['n','r','l']},
};
function rollCard(slot,t){const x=Math.random()*100;let r;
  if(slot==='l')r='L';else if(slot==='r')r=x<72?'R':x<95?'E':'L';else r=x<70?'C':x<92?'R':x<98.5?'E':'L';
  const ok=id=>!t||slot==='l'||(t==='spell'?C[id].k==='s':t==='build'?C[id].k==='b':C[id].t===t);
  let pool=IDS.filter(id=>C[id].r===r&&ok(id));if(!pool.length)pool=IDS.filter(id=>ok(id)&&C[id].r!=='L');
  let id;for(let k=0;k<3;k++){id=pool[Math.random()*pool.length|0];if((S.d.col[id]||0)<RAR[C[id].r].max)break}return id}
function randomDeck(){const pick=(r,n)=>{const out=[],pool=IDS.filter(id=>C[id].r===r);while(out.length<n){const id=pool[Math.random()*pool.length|0];if(out.filter(x=>x===id).length<RAR[r].max)out.push(id)}return out};
  return[...pick('C',10),...pick('R',6),...pick('E',3),...pick('L',1)]}
/* les 4 cartes en vente aujourd'hui (les mêmes toute la journée) */
function dailyOffers(){const R=dayRng('shop'),out=[];for(const r of ['C','R','R','E']){const pool=IDS.filter(id=>C[id].r===r&&!out.includes(id));out.push(pool[R()*pool.length|0])}return out}

/* ---------- progression : niveau, XP, quêtes ---------- */
const PROG={
  need:l=>80+40*l,
  /* tire les 3 quêtes du jour si on a changé de jour */
  roll(){const d=S.d;if(d.qday===dayKey()&&d.quests&&d.quests.every(q=>QUESTS[q.i]))return;const R=dayRng('q'),pick=[],keys=[];
    while(pick.length<3){const i=R()*QUESTS.length|0,k=QUESTS[i].k;if(pick.includes(i)||keys.includes(k))continue;pick.push(i);keys.push(k)}
    d.qday=dayKey();d.quests=pick.map(i=>({i,p:0,done:false}));d.gift=false;S.save()},
  ev(k,n){const d=S.d;this.roll();let ch=false;for(const q of d.quests){const Q=QUESTS[q.i];if(Q.k!==k||q.done)continue;q.p=Math.min(Q.g,q.p+(n||1));ch=true;
      if(q.p>=Q.g&&!q.ready){q.ready=true;SND.play('quest');if(typeof toast==='function')toast('Quête réussie : '+Q.n)}}
    if(ch)S.save()},
  claim(j){const d=S.d,q=d.quests[j],Q=QUESTS[q.i];if(!q.ready||q.done)return[];q.done=true;d.coins+=Q.r;SND.play('coin');const up=this.addXp(30);S.save();return up},
  /* ajoute de l'XP ; renvoie la liste des niveaux gagnés avec leur récompense */
  addXp(n){const d=S.d,up=[];d.xp+=n;while(d.xp>=this.need(d.lvl)){d.xp-=this.need(d.lvl);d.lvl++;const r=LEVELS[d.lvl]||{c:60};
      if(r.c)d.coins+=r.c;if(r.f)d.free=(d.free||0)+r.f;for(const u of [r.u,r.u2])if(u&&!d.own[u[0]].includes(u[1]))d.own[u[0]].push(u[1]);
      up.push({lvl:d.lvl,txt:rewardTxt(r)})}
    if(up.length)SND.play('level');S.save();return up},
};
