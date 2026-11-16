/* Le duel : règles + affichage du plateau. Les côtés sont 'p' (hôte) et 'e' (2e joueur / robot).
   Deux tables : classique (4 couloirs, 20 PV) et Grande Baston (6 couloirs, 30 PV, un quartier général par joueur). NL = nombre de couloirs (cards.js).
   Tour : événement de table (tous les 3 tours) → choix « 2 cartes » ou « 1 carte + 1 énergie » → cartes, pouvoir de héros, rage → baston.
   Tout ce qui est tiré au hasard dans les règles passe par G.R (le même tirage chez les deux joueurs en ligne). */
const $=s=>document.querySelector(s), sleep=ms=>new Promise(r=>setTimeout(r,ms));
const opp=s=>s==='p'?'e':'p';
let G=null,ME='p',MODE='solo',Q=Promise.resolve(),LOCK=false,MGBUSY=false;
const RAGE_MAX=10,POW_COST=2;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const shuffle=(a,R)=>{for(let i=a.length-1;i>0;i--){const j=R()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const LANES=()=>Array.from({length:NL},(_,i)=>i);
/* une créature posée sur un couloir. turns = tours survécus (évolution à 3), fused = déjà fusionnée */
const mkUnit=id=>{const d=C[id];return{id,atk:d.a,hp:d.h,max:d.h,stun:false,shield:d.shield||0,poison:0,revived:false,turns:0,evo:false,fused:false,uid:++G.uid}};
const mkBld=id=>({id,hp:C[id].bh||3,uid:++G.uid});
/* le bâtiment de mon couloir l (ou rien) */
const bld=(s,l)=>{const b=G[s].bld[l];return b?C[b.id]:null};
/* mes exploits comptent pour les quêtes */
const ev=(s,k,n)=>{if(s===ME&&typeof PROG!=='undefined')PROG.ev(k,n)};

/* ---------- effets de base ---------- */
function each(s,f){return (async()=>{for(let l=0;l<NL;l++) if(G[s].lanes[l]) await f(G[s].lanes[l],l)})()}
async function draw(s,n=1){for(let i=0;i<n;i++){if(G[s].deck.length&&G[s].hand.length<8)G[s].hand.push(G[s].deck.pop())}render()}
function buff(s,l,a,h){const c=G[s].lanes[l];if(!c)return;c.atk+=a;c.hp+=h;c.max+=h;float(slot(s,l),'+'+a+' / +'+h,'g');SND.play('buff')}
function healC(s,l,n){const c=G[s].lanes[l];if(!c||c.hp>=c.max)return;c.hp=Math.min(c.max,c.hp+n);float(slot(s,l),'+'+n,'g');SND.play('heal')}
function healH(s,n){G[s].hp=Math.min(G[s].maxHp,G[s].hp+n);float($('#hero-'+s),'+'+n,'g');SND.play('heal');render()}
function stun(s,l){const c=G[s].lanes[l];if(c){c.stun=true;float(slot(s,l),'Dodo','')}}
function shieldC(s,l,n){const c=G[s].lanes[l];if(c){c.shield+=n;float(slot(s,l),'Bouclier +'+n,'g');SND.play('block');render()}}
function poisonC(s,l,n){const c=G[s].lanes[l];if(c){c.poison+=n;float(slot(s,l),'Poison','r');SND.play('poison');render()}}
/* renvoie la créature dans la main (ou la détruit si la main est pleine) */
async function bounce(s,l){const c=G[s].lanes[l];if(!c)return;G[s].lanes[l]=null;if(G[s].hand.length<8){G[s].hand.push(c.id);log(C[c.id].n+' retourne dans la main',s)}else log(C[c.id].n+' tombe de sa chaise',s);SND.play('whoosh');render();await sleep(300)}
/* o.through = passe à travers le bouclier (poison) */
async function hurt(s,l,n,o){const c=G[s].lanes[l];if(!c||G.over)return;const d=C[c.id];
  if(c.shield>0&&!(o&&o.through)){c.shield--;float(slot(s,l),'Bloqué !','');SND.play('block');V.hit(s,l);await sleep(260);render();return}
  c.hp-=n;float(slot(s,l),'-'+n,'r');SND.play('hit');
  V.hit(s,l);
  await sleep(260);
  if(c.hp<=0){
    if(d.revive&&!c.revived){c.revived=true;c.hp=1;c.poison=0;float(slot(s,l),'Revient !','g');SND.play('spawn');log(d.n+' se relève',s)}
    else{G[s].lanes[l]=null;log(d.n+' est K.O.',s,'ko');SND.play('death');ev(opp(s),'ko',1);render();if(d.death)await d.death(s,l);
      /* terrain Nuage : une créature qui tombe ici fait piocher son propriétaire */
      if(G[s].terr[l]==='nuage'&&!G.over){float(slot(s,l),'+1 carte','g');await draw(s)}}}
  else if(d.rage){c.atk++;float(slot(s,l),'Rage +1','g')}
  render()}
async function hurtH(s,n){if(G.over)return;G[s].hp-=n;G[s].rage=Math.min(RAGE_MAX,G[s].rage+n);float($('#hero-'+s),'-'+n,'r');SND.play('heroHit');ev(opp(s),'heroDmg',n);
  V.heroHit(s);render();await sleep(260);
  if(G[s].hp<=0)finish(opp(s))}
/* un bâtiment encaisse ; détruit, le quartier général coûte 5 PV à son joueur */
async function hurtB(s,l,n){const b=G[s].bld[l];if(!b||G.over)return;const d=C[b.id];b.hp-=n;float(slot(s,l),'-'+n,'r');SND.play('hit');V.hitB(s,l);await sleep(260);
  if(b.hp<=0){G[s].bld[l]=null;log(d.n+' est détruit',s,'ko');SND.play('death');render();if(d.qg){banner('QUARTIER GÉNÉRAL DÉTRUIT !');await sleep(500);await hurtH(s,5)}}
  render()}
/* attaque : +1 sur son terrain, bonus du bâtiment, +2 pour deux potes côte à côte */
const duo=(s,l)=>{const c=G[s].lanes[l];return c&&C[c.id].t==='pote'&&[l-1,l+1].some(x=>{const n=G[s].lanes[x];return n&&C[n.id].t==='pote'})};
const atkOf=(s,l)=>{const c=G[s].lanes[l],b=bld(s,l);return c.atk+(C[c.id].t===G[s].terr[l]?1:0)+(b&&b.atk||0)+(duo(s,l)?2:0)};

/* ---------- pouvoir de héros, rage, choix de début de tour ---------- */
function canPower(s){const P=G[s];if(P.powUsed||P.energy<POW_COST||G.phase!=='main')return false;return powerOf(G.faces[s])!=='shield'||P.lanes.some(c=>c&&!c.shield)}
async function doPower(s){if(!canPower(s))return;const P=G[s],o=opp(s),k=powerOf(G.faces[s]);G.busy=true;P.energy-=POW_COST;P.powUsed=true;
  log((s===ME?'Tu utilises ':G.names[s]+' utilise ')+POWERS[k].n,s);banner(POWERS[k].n.toUpperCase());SND.play('spell');render();await sleep(600);
  if(k==='draw')await draw(s);
  else if(k==='dmg')await hurtH(o,1);
  else if(k==='heal')healH(s,2);
  else{let best=-1,bl=-1;P.lanes.forEach((c,l)=>{if(c&&!c.shield&&c.atk>best){best=c.atk;bl=l}});if(bl>=0)shieldC(s,bl,1)}
  await sleep(300);if(!G.over){G.busy=false;render()}}
async function doRage(s){const P=G[s],o=opp(s);if(P.rage<RAGE_MAX||G.phase!=='main')return;G.busy=true;P.rage=0;
  log((s===ME?'Tu exploses de rage !':G.names[s]+' explose de rage !'),s,'ko');banner('RAGE !');SND.play('legend');V.quake(.7);render();await sleep(700);
  for(let l=0;l<NL&&!G.over;l++)if(G[o].lanes[l])await hurt(o,l,2);
  await each(s,(c,l)=>{c.atk++;float(slot(s,l),'+1 attaque','g')});
  await sleep(300);if(!G.over){G.busy=false;render()}}
async function doChoice(s,v){if(G.phase!=='choice'||G.active!==s)return;G.busy=true;const P=G[s];
  if(v==='nrj'){P.energy++;float($('#hero-'+s),'+1 énergie','g');await draw(s,1)}else await draw(s,2);
  G.phase='main';G.busy=false;render()}

/* ---------- événements de table : un tous les 3 tours, pour les deux joueurs ---------- */
const EVENTS=[
  {n:'Pluie de cornichons',x:'1 dégât à toutes les créatures.',async run(){const spots=[];for(const s of['p','e'])for(let l=0;l<NL;l++)if(G[s].lanes[l])spots.push(V.spot(s,l));
      await V.spell('pluie',spots.length?spots:[V.center()],false);for(const s of['p','e'])for(let l=0;l<NL&&!G.over;l++)await hurt(s,l,1)}},
  {n:'Le chat passe',x:'Il renverse un couloir : ses créatures retournent en main.',async run(){const l=G.R()*NL|0;V.quake(.4);for(const s of['p','e']){float(slot(s,l),'Miaou','');await bounce(s,l)}}},
  {n:'Goûter surprise',x:'Chacun pioche 1 carte et gagne 2 PV.',async run(){for(const s of['p','e']){await draw(s);healH(s,2)}}},
  {n:'Tournée générale',x:'Toutes les créatures gagnent +1 attaque.',async run(){for(const s of['p','e'])await each(s,(c,l)=>{c.atk++;float(slot(s,l),'+1 attaque','g')});SND.play('buff')}},
  {n:'Tremblement de table',x:'1 dégât aux deux héros et à tous les bâtiments.',async run(){V.quake(.8);for(const s of['p','e']){for(let l=0;l<NL&&!G.over;l++)if(G[s].bld[l])await hurtB(s,l,1)}for(const s of['p','e'])if(!G.over)await hurtH(s,1)}},
];
async function tableEvent(){const e=EVENTS[G.R()*EVENTS.length|0];log('Événement : '+e.n+' — '+e.x,null,'ko');banner(e.n.toUpperCase());SND.play('go');if(typeof toast==='function')toast(e.n+' : '+e.x);await sleep(1300);await e.run();await sleep(400)}

/* ---------- affichage ---------- */
const slot=(s,l)=>({getBoundingClientRect:()=>V.rect(s,l)});
function okFor(s,l){if(!G||G.busy||G.over||G.active!==ME||G.phase!=='main'||G.sel==null)return false;const sel=C[G[ME].hand[G.sel]],c=G[s].lanes[l],b=G[s].bld[l];
  return sel.k==='c'?s===ME&&!(c&&c.fused):sel.k==='b'?s===ME&&!(b&&C[b.id].qg):sel.tgt==='enemy'?s!==ME&&!!c:sel.tgt==='ally'?s===ME&&!!c:false}
const terrHTML=t=>`<div class="tinfo panel"><b>${T[t].n}</b><span>${T[t].x}</span><i>Créature du même terrain : +1 attaque</i></div>`;
function render(){
  if(!G)return;
  for(const s of ['e','p'])for(let l=0;l<NL;l++)if(G[s].lanes[l])G[s].lanes[l].shownAtk=atkOf(s,l);
  V.sync(G,okFor);
  for(const s of ['e','p']){
    const P=G[s];
    $('#hero-'+s).innerHTML=`<div class="face">${faceHTML(G.faces[s])}</div>
      <div class="hinfo"><b>${G.names[s]}</b><div class="small">${G.titles&&G.titles[s]?G.titles[s]+' · ':''}Pioche ${P.deck.length}</div>
        <div class="rage ${P.rage>=RAGE_MAX?'full':''}" title="Rage"><i style="width:${P.rage/RAGE_MAX*100}%"></i></div></div>
      ${s!==ME?`<div id="ehand">${'<i></i>'.repeat(P.hand.length)}</div>`:''}
      <div class="nrj" title="Énergie">${Array.from({length:Math.max(P.maxE,P.energy)},(_,i)=>`<i class="${i<P.energy?'on':''}"></i>`).join('')}</div>
      <div class="hp">${IC('heart')}<b>${Math.max(0,P.hp)}</b></div>`;
  }
  const mine=G.active===ME&&!G.busy&&!G.over,myTurn=mine&&G.phase==='main',H=G[ME],pk=powerOf(G.faces[ME]);
  $('#hand').innerHTML=H.hand.map((id,i)=>cardHTML(id,null,false,(i===G.sel?'sel ':'')+(C[id].c>H.energy?'no':''))).join('');
  $('#hand').classList.toggle('many',H.hand.length>5);
  [...$('#hand').children].forEach((el,i)=>el.dataset.i=i);
  $('#go').disabled=!myTurn;
  $('#pow').disabled=!myTurn||!canPower(ME);$('#pow').innerHTML=`${POWERS[pk].n}<small>${POWERS[pk].x} · 2 énergies</small>`;
  $('#rage').classList.toggle('hide',H.rage<RAGE_MAX);$('#rage').disabled=!myTurn;
  $('#choice').classList.toggle('hide',!(mine&&G.phase==='choice'));
  if(!G.over)$('#hint').textContent=!mine?(G.active&&G.active!==ME?G.names[opp(ME)]+' réfléchit…':'…'):G.phase==='choice'?'Début de tour : choisis ton bonus.':
    G.sel==null?'Choisis une carte, puis lance la baston.':
    (()=>{const d=C[H.hand[G.sel]];return d.k==='c'?'Choisis un couloir. Sur une de tes créatures : fusion.':d.k==='b'?'Choisis un de tes couloirs pour construire':d.tgt==='enemy'?'Choisis une créature ennemie':d.tgt==='ally'?'Choisis une de tes créatures':'Reclique la carte pour lancer le sort'})();
}
function float(el,txt,cls){if(!el)return;const r=el.getBoundingClientRect(),f=document.createElement('div');f.className='float '+(cls||'');f.textContent=txt;
  f.style.left=r.left+r.width/2+(Math.random()*30-15)+'px';f.style.top=r.top+r.height/2+'px';$('#fx').appendChild(f);setTimeout(()=>f.remove(),900)}
/* éclats de carton colorés */
function burst(el,col,n=9){if(!el)return;const r=el.getBoundingClientRect(),cols=[col||'#ffd23f','#fff6e0','#e8443a'];for(let i=0;i<n;i++){const p=document.createElement('div');p.className='bit';p.style.background=cols[i%3];
  p.style.left=r.left+r.width/2+'px';p.style.top=r.top+r.height/3+'px';const a=Math.random()*6.28,d=60+Math.random()*90;
  p.style.setProperty('--dx',Math.cos(a)*d+'px');p.style.setProperty('--dy',Math.sin(a)*d-40+'px');$('#fx').appendChild(p);setTimeout(()=>p.remove(),700)}}
function banner(t){const b=$('#banner');b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
/* journal : une pastille de la couleur du joueur concerné */
function log(t,s,kind){const d=document.createElement('div');d.className='lg '+(s===ME?'me':s?'foe':'')+' '+(kind||'');d.textContent=t;$('#log').prepend(d);while($('#log').children.length>9)$('#log').lastChild.remove()}
function fit(){const z=Math.max(.6,Math.min(1.25,innerHeight/820,innerWidth/1150));document.documentElement.style.setProperty('--hz',z)}
addEventListener('resize',fit);

/* ---------- déroulement ---------- */
function newGame(o){
  MODE=o.mode;ME=o.me;LOCK=false;MGBUSY=false;NL=o.big?6:4;const R=rng(o.seed),O=opp(ME),hp=o.big?30:20;
  const terrs=()=>{const t=shuffle(['fromage','sauce','slip','nuage'],R);return NL>4?shuffle(t.concat(shuffle(['fromage','sauce','slip','nuage'],R).slice(0,NL-4)),R):t};
  const mk=(deck,hp)=>({hp,maxHp:hp,energy:0,maxE:1,rage:0,powUsed:false,deck:shuffle(deck.slice(),R),hand:[],lanes:Array(NL).fill(null),bld:Array(NL).fill(null),terr:terrs()});
  const p=mk(o.decks.p,hp),e=mk(o.decks.e,o.hpE||hp);
  G={p,e,names:o.names,faces:o.faces,titles:o.titles||{},active:null,sel:null,busy:true,over:false,uid:0,capE:o.big?8:7,big:!!o.big,story:o.story,turn:0,phase:'',bet:o.bet|0,R:rng(o.seed^0x2f6e2b1)};
  /* Grande Baston : chacun a son quartier général au milieu */
  if(o.big)for(const P of[p,e])P.bld[NL>>1]=mkBld('qg');
  for(let i=0;i<4;i++){p.hand.push(p.deck.pop());e.hand.push(e.deck.pop())}
  $('#heroes').innerHTML=`<div class="hero panel top" id="hero-${O}"></div><div class="hero panel bot" id="hero-${ME}"></div>`;
  $('#log').innerHTML='';$('#fx').innerHTML='';$('#loupe').innerHTML='';
  document.querySelectorAll('.scr').forEach(x=>x.classList.add('hide'));$('#app').classList.remove('hide');fit();
  SND.music('duel');
  V.start(ME,{p:p.terr,e:e.terr},o.faces[O],NL);
  V.onPick=(s,l)=>{if(okFor(s,l)&&!LOCK)tryPlay(G.sel,l)};
  V.onHover=h=>{if(!h)return;const c=G[h.s].lanes[h.l],b=G[h.s].bld[h.l];$('#loupe').innerHTML=c?cardHTML(c.id,c,false):b?cardHTML(b.id,{bhp:b.hp},false):terrHTML(G[h.s].terr[h.l])};
  render();
  /* un mini-jeu tiré au hasard décide qui commence ; l'autre pioche une carte en plus (les actions du pote attendent derrière) */
  Q=sleep(1800).then(()=>MG.run({mode:MODE,me:ME,seed:o.seed,names:o.names,faces:o.faces})).then(async first=>{
    if(G.over)return;const sec=opp(first);G[sec].hand.push(G[sec].deck.pop());if(first===ME)ev(ME,'mgwin',1);
    SND.music('duel');banner(first===ME?'TU COMMENCES !':G.names[first].toUpperCase()+' COMMENCE !');render();await sleep(1200);return startTurn(first)});
}
async function startTurn(s){
  if(G.over)return;G.active=s;G.sel=null;G.phase='';G.busy=true;G.turn++;const P=G[s];P.powUsed=false;P.maxE=Math.min(G.capE,P.maxE+1);P.energy=P.maxE;
  render();banner(s===ME?'À TOI !':'TOUR DE '+G.names[s].toUpperCase());SND.play(s===ME?'turn':'turn2');await sleep(700);
  if(G.turn>2&&G.turn%3===0)await tableEvent();
  if(G.over)return;
  /* bâtiments : effets de début de tour */
  for(let l=0;l<NL;l++){const b=bld(s,l);if(!b)continue;if(b.startNrj){P.energy+=b.startNrj;float(slot(s,l),'+'+b.startNrj+' énergie','g')}if(b.startDraw){await draw(s,b.startDraw);float(slot(s,l),'+1 carte','g')}}
  /* le poison ronge les créatures du joueur dont c'est le tour */
  for(let l=0;l<NL&&!G.over;l++){const c=G[s].lanes[l];if(c&&c.poison){SND.play('poison');await hurt(s,l,c.poison,{through:1})}}
  if(G.over)return;
  G.phase='choice';G.busy=false;render();
  if(MODE==='solo'&&s==='e')aiTurn();
}
async function playCard(s,i,l,q){
  const P=G[s],o=opp(s),id=P.hand[i],d=C[id];if(!d||d.c>P.energy)return;
  const old=d.k==='c'?P.lanes[l]:null;
  if((old&&old.fused)||(d.k==='b'&&P.bld[l]&&C[P.bld[l].id].qg))return;
  G.busy=true;G.sel=null;P.hand.splice(i,1);P.energy-=d.c;
  log((s===ME?'Tu joues ':G.names[s]+' joue ')+d.n,s);
  if(d.k==='c'){
    const u=mkUnit(id),b=bld(s,l);
    /* fusion : posée sur une de mes créatures, la nouvelle garde son pouvoir et additionne les forces */
    if(old){u.atk+=old.atk;u.hp+=old.hp;u.max+=old.max;u.shield+=old.shield;u.fused=true;log('Fusion : '+C[old.id].n+' + '+d.n,s,'ko')}
    if(P.terr[l]==='slip'){u.hp++;u.max++}
    if(b&&b.arriveShield)u.shield+=b.arriveShield;
    P.lanes[l]=u;render();ev(s,'creature',1);ev(s,'t_'+d.t,1);
    SND.play('whoosh');setTimeout(()=>SND.play('slam'),340);setTimeout(()=>SND.play(d.r==='L'||old?'legend':'spawn'),430);
    if(old)banner('FUSION !');
    if(d.r==='L'){ev(s,'legend',1);if(!old)banner(d.n.toUpperCase());await V.focus(s,l,1.7)}
    else await sleep(950);
    if(duo(s,l)){float(slot(s,l),'Duo de potes !','g');SND.play('buff');render()}
    /* terrain Volcan en face : la créature qui arrive se brûle */
    if(G[o].terr[l]==='sauce'&&P.lanes[l]===u){float(slot(s,l),'Volcan','r');await hurt(s,l,1)}
    if(d.play&&P.lanes[l]===u)await d.play(s,l);
    /* Bricoleur : construit un bâtiment sur son couloir s'il est libre */
    if(d.buildOn&&!P.bld[l]){P.bld[l]=mkBld(d.buildOn);log(C[d.buildOn].n+' est construite',s);render();SND.play('slam');await sleep(700)}
    /* Livraison : pose une créature dans un couloir voisin libre */
    if(d.summon){const fl=[l-1,l+1].find(x=>x>=0&&x<NL&&!P.lanes[x]);if(fl!==undefined){P.lanes[fl]=mkUnit(d.summon);log(C[d.summon].n+' est livré',s);render();SND.play('whoosh');setTimeout(()=>SND.play('slam'),340);await sleep(900)}}
  }else if(d.k==='b'){
    /* construction : remplace l'ancien bâtiment du couloir */
    P.bld[l]=mkBld(id);ev(s,'build',1);render();SND.play('slam');setTimeout(()=>SND.play('buff'),300);banner(d.n.toUpperCase());await sleep(1000);
  }else{const qq=d.mg?(q===0||q===1||q===2?q:1):1;banner(d.n.toUpperCase()+(d.mg?[' : RATÉ',' !',' : PARFAIT !'][qq]:' !'));SND.play('spell');render();ev(s,'spell',1);
    const foes=LANES().filter(i=>G[o].lanes[i]).map(i=>V.spot(o,i));
    const spots=d.tgt==='enemy'?[V.spot(o,l)]:d.tgt==='ally'?[V.spot(s,l)]:(id==='pluie'||id==='prout')?(foes.length?foes:[V.center()]):id==='pizza'?[V.heroSpot(o)]:[V.heroSpot(s)];
    await sleep(350);await V.spell(id,spots,id==='meteor'||qq===2);await d.cast(s,l,qq)}
  await sleep(200);if(!G.over){G.busy=false;render()}
}
async function endTurn(s){
  if(G.busy||G.over||G.phase!=='main')return;G.busy=true;G.sel=null;render();const o=opp(s);
  for(let l=0;l<NL&&!G.over;l++){
    const c=G[s].lanes[l];if(!c)continue;
    if(c.stun){c.stun=false;float(slot(s,l),'Zzz…','');await sleep(350);render();continue}
    const d=C[c.id];
    for(let k=0;k<(d.double?2:1)&&!G.over&&G[s].lanes[l]===c;k++){
      const a=atkOf(s,l),t=G[o].lanes[l],tb=G[o].bld[l];
      SND.play('whoosh');await V.attack(s,l,d.vol||!t);
      if(d.vol||(!t&&!tb))await hurtH(o,a);
      else if(t){const before=t.hp,sh=t.shield;await hurt(o,l,a);
        if(d.poison&&!sh&&G[o].lanes[l]===t)poisonC(o,l,d.poison);
        if(d.perce&&!sh&&a>before)await hurtH(o,a-before)}
      /* pas de créature en face mais un bâtiment : c'est lui qui prend */
      else await hurtB(o,l,a);
      if(d.vamp&&!G.over)healH(s,1);
      await sleep(330);
    }
  }
  if(G.over)return;
  await each(s,async(c,l)=>{const d=C[c.id];if(d.regen)healC(s,l,d.regen);if(d.gym){c.atk++;float(slot(s,l),'+1 attaque','g')}
    if(G[s].terr[l]==='fromage')healC(s,l,1);
    if(d.aura&&G[o].lanes[l]){float(slot(s,l),'Orage','');await hurt(o,l,d.aura)}});
  /* bâtiments : effets de fin de tour */
  for(let l=0;l<NL&&!G.over;l++){const b=bld(s,l);if(!b)continue;const c=G[s].lanes[l];
    if(b.endHeal&&c)healC(s,l,b.endHeal);
    if(b.endGym&&c){c.atk+=b.endGym;float(slot(s,l),'+1 attaque','g')}
    if(b.endHit&&G[o].lanes[l]){float(slot(s,l),'Catapulte','');SND.play('whoosh');await hurt(o,l,b.endHit)}
    if(b.endHero){float(slot(s,l),'Frites !','');await hurtH(o,b.endHero)}}
  if(G.over)return;
  /* évolution : une créature qui a tenu 3 de ses tours devient plus forte */
  await each(s,async(c,l)=>{c.turns++;if(c.turns>=3&&!c.evo){c.evo=true;c.atk+=2;c.hp+=2;c.max+=2;float(slot(s,l),'Évolution !','g');log(C[c.id].n+' évolue (+2 / +2)',s,'ko');SND.play('legend');render();await sleep(600)}});
  render();await sleep(450);await startTurn(o);
}
function finish(w,why){if(G.over)return;G.over=true;G.busy=true;render();if(typeof MG!=='undefined')MG.cancel();
  const win=w===ME,gain=(MODE==='net'?(win?60:25):(win?40:10))+(G.big?15:0),xp=(win?60:25)+(G.big?15:0),bet=G.bet|0;
  S.d.coins=Math.max(0,S.d.coins+gain+(win?bet:-bet));win?S.d.wins++:S.d.losses++;
  if(win){ev(ME,'win',1);if(G[ME].hp>=G[ME].maxHp/2)ev(ME,'winBig',1)}ev(ME,'game',1);
  /* mode histoire : la première victoire d'un chapitre ouvre le suivant et donne sa récompense */
  let storyTxt='';if(win&&G.story!=null&&G.story===S.d.story){S.d.story++;storyTxt=storyReward(STORY[G.story])}
  const up=typeof PROG!=='undefined'?PROG.addXp(xp):[];S.save();
  SND.music(null);SND.play(win?'win':'lose');
  $('#endT').textContent=win?'VICTOIRE':'DÉFAITE';$('#end').classList.toggle('lost',!win);
  $('#endP').innerHTML=`<span class="why">${why||(win?G.names[opp(ME)]+' retourne dans le panier à linge.':'Tu t\'es fait laver à 90°. Revanche ?')}</span>
    <div class="gains"><span>${COIN}+${gain}</span><span class="xp">+${xp} XP</span></div>`
    +(bet?`<div class="lvup ${win?'':'bad'}">Pari : ${win?'+':'-'}${bet} pièces</div>`:'')
    +(storyTxt?`<div class="story-win">Chapitre terminé — ${storyTxt}</div>`:'')+up.map(u=>`<div class="lvup">Niveau ${u.lvl} — ${u.txt}</div>`).join('');
  if(win){const cols=['#e8443a','#ffd23f','#58d68d','#7fd4ff','#fff6e0'];for(let i=0;i<60;i++){const c=document.createElement('div');c.className='conf';c.style.background=cols[i%5];c.style.left=Math.random()*100+'vw';c.style.animationDuration=2+Math.random()*3+'s';c.style.animationDelay=Math.random()*1.5+'s';$('#fx').appendChild(c)}}
  setTimeout(()=>$('#end').classList.remove('hide'),900)}

/* ---------- actions (les miennes et celles du pote en ligne) ---------- */
function act(a){if(LOCK||!G||G.busy||G.over||G.active!==ME)return;LOCK=true;if(MODE==='net')NET.send(a);Q=Q.then(()=>apply(ME,a)).finally(()=>LOCK=false)}
function remote(a){Q=Q.then(()=>apply(opp(ME),a))}
async function apply(s,a){if(!G||G.over||G.active!==s)return;
  if(a.t==='choice')return doChoice(s,a.v==='nrj'?'nrj':'cards');
  if(G.phase!=='main'||a.l>=NL)return;
  if(a.t==='play')await playCard(s,a.i,a.l,a.q);else if(a.t==='end')await endTurn(s);else if(a.t==='power')await doPower(s);else if(a.t==='rage')await doRage(s)}
/* certains sorts lancent d'abord un mini-jeu éclair : son résultat (0 raté, 1 normal, 2 parfait) part avec l'action */
function tryPlay(i,l){if(MGBUSY)return;const d=C[G[ME].hand[i]];if(!d)return;
  if(d.k==='s'&&d.mg){MGBUSY=true;MG.quick(d.n).then(q=>{MGBUSY=false;if(G&&!G.over&&G.active===ME)act({t:'play',i,l,q})})}
  else act({t:'play',i,l})}

/* ---------- le robot ---------- */
function aiPick(){
  const P=G.e,F=G.p,foes=F.lanes.map((c,l)=>c&&{c,l}).filter(Boolean),mine=P.lanes.map((c,l)=>c&&{c,l}).filter(Boolean);
  const byAtk=a=>a.slice().sort((x,y)=>y.c.atk-x.c.atk),full=P.lanes.every(Boolean);
  const idx=P.hand.map((id,i)=>i).filter(i=>C[P.hand[i]].c<=P.energy).sort((a,b)=>C[P.hand[b]].c-C[P.hand[a]].c);
  for(const i of idx){const id=P.hand[i],d=C[id];let t;
    if(d.k==='c'){let best=-99,bl=-1;
      for(let l=0;l<NL;l++){const cur=P.lanes[l],f=F.lanes[l];let sc=cur?(cur.fused?-99:full?5:1):10;
        if(d.t===P.terr[l])sc+=3;if(P.bld[l])sc+=2;if(F.terr[l]==='sauce'&&d.h<=1)sc-=6;if(f){sc+=d.a>=f.hp?3:1;if(d.vol)sc-=2;if(d.shield||d.poison)sc+=1}else sc+=2;
        sc+=Math.random();if(sc>best){best=sc;bl=l}}
      if(best>0)return[i,bl]}
    else if(d.k==='b'){let best=-1,bl=-1;for(let l=0;l<NL;l++){if(P.bld[l])continue;const sc=(P.lanes[l]?3:1)+Math.random();if(sc>best){best=sc;bl=l}}if(bl>=0)return[i,bl]}
    else switch(id){
      case 'claque':t=byAtk(foes.filter(f=>f.c.hp<=2&&!f.c.shield))[0]||byAtk(foes)[0];if(t)return[i,t.l];break;
      case 'meteor':t=byAtk(foes.filter(f=>f.c.atk>=3&&!f.c.shield))[0];if(t)return[i,t.l];break;
      case 'sieste':t=byAtk(foes.filter(f=>!f.c.stun&&f.c.atk>=3))[0];if(t)return[i,t.l];break;
      case 'chaussale':t=foes.filter(f=>!f.c.poison).sort((x,y)=>y.c.hp-x.c.hp)[0];if(t&&t.c.hp>=3)return[i,t.l];break;
      case 'chaises':t=foes.slice().sort((x,y)=>C[y.c.id].c-C[x.c.id].c)[0];if(t&&C[t.c.id].c>=3)return[i,t.l];break;
      case 'couvercle':t=byAtk(mine.filter(m=>!m.c.shield))[0];if(t)return[i,t.l];break;
      case 'pluie':case 'prout':if(foes.length>=2)return[i,0];break;
      case 'gouter':if(mine.length)return[i,byAtk(mine)[0].l];break;
      case 'cafe':if(P.hand.length<=6)return[i,0];break;
      case 'pizza':return[i,0];
    }
  }
  return null}
async function aiTurn(){
  await sleep(900);if(G.over)return;
  await doChoice('e',G.e.hand.length<=3?'cards':'nrj');
  G.busy=true;render();await sleep(700);
  if(G.e.rage>=RAGE_MAX&&G.p.lanes.some(Boolean)){G.busy=false;await doRage('e');if(G.over)return;G.busy=true}
  /* le robot joue les mini-jeux des sorts au hasard (seulement en solo, donc pas besoin de tirage commun) */
  for(let n=0;n<8&&!G.over;n++){const m=aiPick();if(!m)break;await playCard('e',m[0],m[1],Math.random()*3|0);if(G.over)return;G.busy=true;render();await sleep(550)}
  if(G.over)return;
  G.busy=false;if(canPower('e')){await doPower('e');if(G.over)return}
  G.busy=false;endTurn('e')}

/* ---------- clics ---------- */
$('#hand').addEventListener('click',e=>{
  if(!G||G.busy||G.over||G.active!==ME||G.phase!=='main'||LOCK||MGBUSY)return;
  const h=e.target.closest('#hand .card');if(!h)return;
  const i=+h.dataset.i,d=C[G[ME].hand[i]];
  if(d.c>G[ME].energy){h.classList.remove('shake');void h.offsetWidth;h.classList.add('shake');$('#hint').textContent='Pas assez d\'énergie pour cette carte.';SND.play('error');return}
  if(G.sel===i){if(d.k==='s'&&!d.tgt)return tryPlay(i,0);G.sel=null}else G.sel=i;
  SND.play('card');render()});
V.init($('#gl'));
$('#go').addEventListener('click',()=>act({t:'end'}));
$('#pow').addEventListener('click',()=>act({t:'power'}));
$('#rage').addEventListener('click',()=>act({t:'rage'}));
$('#choice').addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(b)act({t:'choice',v:b.dataset.ch})});
$('#app').addEventListener('mouseover',e=>{const el=e.target.closest('.card');if(!el||el.closest('#loupe'))return;$('#loupe').innerHTML=cardHTML(el.dataset.id,null,false)});
$('#quit').addEventListener('click',()=>{if(MODE==='net')NET.stop();location.reload()});
$('#again').addEventListener('click',()=>{if(MODE==='net')NET.stop();location.reload()});
