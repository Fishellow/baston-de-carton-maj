/* Le duel : règles + affichage du plateau. Les côtés sont 'p' (hôte) et 'e' (2e joueur / robot).
   2 contre 2 : chaque côté a 2 sièges (G[s].seats) qui jouent à tour de rôle. Plateau, PV et rage sont à l'équipe ;
   main, pioche et énergie sont au joueur dont c'est le tour (G[s].hand, .deck, .energy pointent sur le siège en cours, G[s].cur).
   Deux tables : classique (4 couloirs, 20 PV) et Grande Baston (6 couloirs, 30 PV, un quartier général par joueur). NL = nombre de couloirs (cards.js).
   Tour : événement de table (tous les 3 tours) → choix « 2 cartes » ou « 1 carte + 1 énergie » → cartes, pouvoir de héros, rage → baston.
   Tout ce qui est tiré au hasard dans les règles passe par G.R (le même tirage chez les deux joueurs en ligne). */
const $=s=>document.querySelector(s), sleep=ms=>new Promise(r=>setTimeout(r,typeof G!=='undefined'&&G&&G.auto&&!G.prep?ms*.55:ms));
const opp=s=>s==='p'?'e':'p';
let G=null,ME='p',MYSEAT=0,MYG=0,AIRUN=true,MODE='solo',Q=Promise.resolve(),LOCK=false,MGBUSY=false;
/* est-ce à moi (et pas à mon coéquipier) de jouer ? */
const myTurn=()=>!!G&&G.active===ME&&G[ME].cur===MYSEAT;
const iAm=s=>s===ME&&G[ME].cur===MYSEAT;
const RAGE_MAX=10,POW_COST=2;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const shuffle=(a,R)=>{for(let i=a.length-1;i>0;i--){const j=R()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const LANES=()=>Array.from({length:NL},(_,i)=>i);
/* une créature posée sur un couloir. turns = tours survécus (évolution à 3), fused = déjà fusionnée */
const STARM=[1,1,1.8,3.2];
const mkUnit=(id,star)=>{const d=C[id],m=STARM[star|0]||1,a=Math.round(d.a*m),h=Math.max(1,Math.round(d.h*m));return{id,star:star|0||1,atk:a,hp:h,max:h,stun:false,shield:d.shield||0,poison:0,revived:false,turns:0,evo:false,fused:false,uid:++G.uid}};
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
    else{G[s].lanes[l]=null;log(d.n+' est K.O.',s,'ko');SND.play('death');ev(opp(s),'ko',1);render();if(d.death)await d.death(s,l)}}
  else if(d.rage){c.atk++;float(slot(s,l),'Rage +1','g')}
  if(d.family&&G[s].lanes[l]===c&&!G.over){float(slot(s,l),'Toute la famille !','');await hurtH(opp(s),1)}
  render()}
async function hurtH(s,n){if(G.over)return;G[s].hp-=n;G[s].rage=Math.min(RAGE_MAX,G[s].rage+n);float($('#hero-'+s),'-'+n,'r');SND.play('heroHit');ev(opp(s),'heroDmg',n);
  V.heroHit(s);render();await sleep(260);
  if(G[s].hp<=0)finish(opp(s))}
/* évolution d'une créature : +2 / +2, une seule fois */
async function evolve(s,l){const c=G[s].lanes[l];if(!c||c.evo)return;c.evo=true;ev(s,'evo',1);c.atk+=2;c.hp+=2;c.max+=2;float(slot(s,l),'Évolution !','g');log(C[c.id].n+' évolue (+2 / +2)',s,'ko');SND.play('legend');render();await sleep(600)}
/* piège : posé face cachée sur mon couloir */
function setTrap(s,l,id){G[s].trap[l]=id;float(slot(s,l),'Piège posé','');SND.play('slam');render()}
/* un bâtiment encaisse ; détruit, le quartier général coûte 5 PV à son joueur */
async function hurtB(s,l,n){const b=G[s].bld[l];if(!b||G.over)return;const d=C[b.id];b.hp-=n;float(slot(s,l),'-'+n,'r');SND.play('hit');V.hitB(s,l);await sleep(260);
  if(b.hp<=0){G[s].bld[l]=null;log(d.n+' est détruit',s,'ko');SND.play('death');render();if(d.qg){banner('QUARTIER GÉNÉRAL DÉTRUIT !');await sleep(500);await hurtH(s,5)}}
  render()}
/* attaque : +1 sur son terrain, bonus du bâtiment, +2 pour deux potes côte à côte */
const duo=(s,l)=>{const c=G[s].lanes[l];return c&&C[c.id].t==='pote'&&[l-1,l+1].some(x=>{const n=G[s].lanes[x];return n&&C[n.id].t==='pote'})};
const atkOf=(s,l)=>{const c=G[s].lanes[l],b=bld(s,l);return c.atk+(C[c.id].t===G[s].terr[l]?1:0)+(b&&b.atk||0)+(duo(s,l)?2:0)+(C[c.id].buddy&&[l-1,l+1].some(x=>{const n=G[s].lanes[x];return n&&n.id===C[c.id].buddy})?2:0)+(C[c.id].brave&&G[s].hp<=10?4:0)};

/* ---------- pouvoir de héros, rage, choix de début de tour ---------- */
function canPower(s){const P=G[s];if(P.powUsed||P.energy<POW_COST||G.phase!=='main')return false;return powerOf(G.faces[s])!=='shield'||P.lanes.some(c=>c&&!c.shield)}
async function doPower(s){if(!canPower(s))return;const P=G[s],o=opp(s),k=powerOf(G.faces[s]);G.busy=true;P.energy-=POW_COST;P.powUsed=true;
  log((iAm(s)?'Tu utilises ':G.names[s]+' utilise ')+POWERS[k].n,s);banner(POWERS[k].n.toUpperCase());SND.play('spell');render();await sleep(600);
  if(k==='draw')await draw(s);
  else if(k==='dmg')await hurtH(o,1);
  else if(k==='heal')healH(s,2);
  else{let best=-1,bl=-1;P.lanes.forEach((c,l)=>{if(c&&!c.shield&&c.atk>best){best=c.atk;bl=l}});if(bl>=0)shieldC(s,bl,1)}
  await sleep(300);if(!G.over){G.busy=false;render()}}
async function doRage(s){const P=G[s],o=opp(s);if(P.rage<RAGE_MAX||G.phase!=='main')return;G.busy=true;P.rage=0;
  log((iAm(s)?'Tu exploses de rage !':G.names[s]+' explose de rage !'),s,'ko');banner('RAGE !');SND.play('legend');V.quake(.7);render();await sleep(700);
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
function okFor(s,l){if(G&&G.prep)return s===ME&&typeof TOUR!=='undefined'&&!!TOUR.sel;if(!G||G.busy||G.over||!myTurn()||G.phase!=='main'||G.sel==null)return false;const sel=C[G[ME].hand[G.sel]],c=G[s].lanes[l],b=G[s].bld[l];
  return sel.k==='c'?s===ME&&!(c&&c.fused):sel.k==='b'?s===ME&&!(b&&C[b.id].qg):sel.tgt==='enemy'?s!==ME&&!!c:sel.tgt==='ally'?s===ME&&!!c:sel.tgt==='ebld'?s!==ME&&!!b:sel.tgt==='trap'?s===ME&&!G[s].trap[l]:false}
const terrHTML=t=>`<div class="tinfo panel"><b>${T[t].n}</b><span>Une créature du même terrain posée ici gagne +1 attaque.</span></div>`;
function render(){
  if(!G)return;
  for(const s of ['e','p'])for(let l=0;l<NL;l++)if(G[s].lanes[l])G[s].lanes[l].shownAtk=atkOf(s,l);
  V.sync(G,okFor);
  for(const s of ['e','p']){
    const P=G[s];
    $('#hero-'+s).innerHTML=`<div class="face">${faceHTML(G.faces[s])}</div>
      <div class="hinfo"><b>${G.names[s]}</b>${P.seats.length>1?`<div class="mates">${P.seats.map((x,i)=>`<i class="${i===P.cur?'on':''}">${x.name}</i>`).join('')}</div>`:''}<div class="small">${P.seats.length<2&&G.titles[s]?G.titles[s]+' · ':''}Pioche ${P.deck.length}</div>
        <div class="rage ${P.rage>=RAGE_MAX?'full':''}" title="Rage"><i style="width:${P.rage/RAGE_MAX*100}%"></i></div></div>
      ${s!==ME?`<div id="ehand">${'<i></i>'.repeat(P.hand.length)}</div>`:''}
      <div class="nrj" title="Énergie">${Array.from({length:Math.max(P.maxE,P.energy)},(_,i)=>`<i class="${i<P.energy?'on':''}"></i>`).join('')}</div>
      <div class="hp">${IC('heart')}<b>${Math.max(0,P.hp)}</b></div>`;
  }
  const mine=myTurn()&&!G.busy&&!G.over,myMain=mine&&G.phase==='main',H=G[ME],MS=H.seats[MYSEAT],pk=powerOf(MS.face);
  /* ma main à moi, même pendant le tour de mon coéquipier */
  $('#hand').innerHTML=MS.hand.map((id,i)=>cardHTML(id,null,false,(mine&&i===G.sel?'sel ':'')+(C[id].c>MS.energy?'no':''))).join('');
  $('#hand').classList.toggle('many',MS.hand.length>5);$('#hand').classList.toggle('lots',MS.hand.length>6);
  [...$('#hand').children].forEach((el,i)=>el.dataset.i=i);
  /* 2 contre 2 : je vois la main de mon coéquipier (en petit, à gauche) */
  const mt=H.seats.length>1?H.seats[1-MYSEAT]:null;$('#mate').innerHTML=mt?'<b>Main de '+mt.name+'</b><div>'+mt.hand.map(id=>cardHTML(id)).join('')+'</div>':'';
  $('#go').disabled=!myMain;
  $('#pow').disabled=!myMain||!canPower(ME);$('#pow').innerHTML=`${POWERS[pk].n}<small>${POWERS[pk].x} · 2 énergies</small>`;
  $('#rage').classList.toggle('hide',H.rage<RAGE_MAX);$('#rage').disabled=!myMain;
  $('#choice').classList.toggle('hide',!(mine&&G.phase==='choice'));
  if(!G.over)$('#hint').textContent=!mine?(G.active&&!myTurn()?G.names[G.active]+(G.active===ME?' (ton coéquipier) joue…':' réfléchit…'):'…'):G.phase==='choice'?'Début de tour : choisis ton bonus.':
    G.sel==null?'Choisis une carte, puis lance la baston.':
    (()=>{const d=C[H.hand[G.sel]];return d.k==='c'?'Choisis un couloir. Sur une de tes créatures : fusion.':d.k==='b'?'Choisis un de tes couloirs pour construire':d.tgt==='enemy'?'Choisis une créature ennemie':d.tgt==='ally'?'Choisis une de tes créatures':d.tgt==='ebld'?'Choisis un bâtiment ennemi':d.tgt==='trap'?'Choisis un de tes couloirs pour cacher le piège':'Reclique la carte pour lancer le sort'})();
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
  MODE=o.mode;ME=o.me;MYSEAT=o.seat|0;AIRUN=o.mode==='solo'||!!o.host;LOCK=false;MGBUSY=false;NL=o.big?6:4;const R=rng(o.seed),O=opp(ME),hp=o.auto?12:o.seats?40:o.big?30:20;
  /* les sièges : 1 par côté en duel, 2 en 2 contre 2. g = numéro du joueur à la table (0 à 3), ai = joué par le robot */
  const defs=o.seats||{p:[{deck:o.decks.p,name:o.names.p,face:o.faces.p,title:o.titles&&o.titles.p,look:o.looks&&o.looks.p,sh:o.shiny&&o.shiny.p,g:0}],e:[{deck:o.decks.e,name:o.names.e,face:o.faces.e,title:o.titles&&o.titles.e,look:o.looks&&o.looks.e,sh:o.shiny&&o.shiny.e,g:1,ai:o.mode==='solo'}]};
  MYG=defs[ME][MYSEAT].g|0;
  const terrs=()=>{if(o.auto)return['fromage','sauce','slip','nuage'];const ALL=['fromage','sauce','slip','nuage','tele'],t=shuffle(ALL.slice(),R);return NL>4?shuffle(t.concat(shuffle(ALL.slice(),R).slice(0,NL-5)),R):t.slice(0,4)};
  const mk=(ds,hp)=>{const P={hp,maxHp:hp,rage:0,cur:0,started:false,lanes:Array(NL).fill(null),bld:Array(NL).fill(null),trap:Array(NL).fill(null),terr:terrs(),
      seats:ds.map(d=>({name:d.name,face:d.face,look:d.look||null,sh:d.sh||[],title:d.title||'',ai:!!d.ai,g:d.g|0,energy:0,maxE:1,powUsed:false,deck:shuffle(d.deck.slice(),R),hand:[]}))};
    for(const k of['energy','maxE','powUsed','deck','hand'])Object.defineProperty(P,k,{get(){return this.seats[this.cur][k]},set(v){this.seats[this.cur][k]=v}});return P};
  const p=mk(defs.p,hp),e=mk(defs.e,o.hpE||hp),view=k=>({get p(){return p.seats[p.cur][k]},get e(){return e.seats[e.cur][k]}});
  G={p,e,names:view('name'),faces:view('face'),titles:view('title'),two:p.seats.length>1,active:null,sel:null,busy:true,over:false,uid:0,capE:o.big?8:7,big:!!o.big,story:o.story,turn:0,phase:'',bet:o.bet|0,R:rng(o.seed^0x2f6e2b1)};
  /* Grande Baston : chacun a son quartier général au milieu */
  if(o.big)for(const P of[p,e])P.bld[NL>>1]=mkBld('qg');
  for(const P of[p,e])for(const st of P.seats)for(let i=0;i<4&&st.deck.length;i++)st.hand.push(st.deck.pop());
  G.auto=!!o.auto;G.defi=!!o.defi;G.prep=!!o.prep;$('#app').classList.toggle('royprep',G.prep);$('#app').classList.toggle('auto',G.auto);
  if(o.auto)for(const s of['p','e'])(o.auto[s]||[]).slice(0,NL).forEach((u,l)=>{if(u&&C[u.id]&&C[u.id].k==='c')G[s].lanes[l]=mkUnit(u.id,u.star)});
  /* tournoi, bonus d'équipe : 2 créatures du même terrain = +1 attaque chacune, 4 = +2 */
  if(o.auto)for(const s of['p','e']){const n={};G[s].lanes.forEach(c=>{if(c)n[C[c.id].t]=(n[C[c.id].t]||0)+1});G[s].lanes.forEach(c=>{if(c)c.atk+=n[C[c.id].t]>=4?2:n[C[c.id].t]>=2?1:0})}
  $('#heroes').innerHTML=`<div class="hero panel top" id="hero-${O}"></div><div class="hero panel bot" id="hero-${ME}"></div>`;
  $('#end').classList.add('hide');$('#log').innerHTML='';$('#fx').innerHTML='';$('#bubbles').innerHTML='';$('#emoList').classList.add('hide');$('#loupe').innerHTML='';
  document.querySelectorAll('.scr').forEach(x=>x.classList.add('hide'));$('#app').classList.remove('hide');fit();
  SND.music('duel');
  V.start(ME,{p:p.terr,e:e.terr},G.faces[O],NL,G[O].seats[0].look);
  V.onPick=(s,l)=>{if(G.prep){if(s===ME&&typeof TOUR!=='undefined')TOUR.pick(l);return}if(okFor(s,l)&&!LOCK)tryPlay(G.sel,l)};
  V.onHover=h=>{if(!h)return;const c=G[h.s].lanes[h.l],b=G[h.s].bld[h.l];$('#loupe').innerHTML=c?cardHTML(c.id,c,false):b?cardHTML(b.id,{bhp:b.hp},false):terrHTML(G[h.s].terr[h.l])};
  render();
  /* un mini-jeu tiré au hasard décide qui commence ; l'autre pioche une carte en plus (les actions du pote attendent derrière) */
  if(o.prep){G.phase='prep';G.busy=false;render();return}
  if(o.auto){Q=sleep(1600).then(()=>autoFight(o.first==='e'?'e':'p'));return}
  /* en 2 contre 2, pas de mini-jeu : l'équipe qui commence est tirée au sort (même tirage chez tout le monde) */
  Q=sleep(1800).then(()=>G.two?(G.R()<.5?'p':'e'):MG.run({mode:MODE,me:ME,seed:o.seed,names:{p:G.names.p,e:G.names.e},faces:{p:G.faces.p,e:G.faces.e}})).then(async first=>{
    if(G.over)return;const sec=opp(first);G[sec].hand.push(G[sec].deck.pop());if(first===ME&&!G.two)ev(ME,'mgwin',1);
    SND.music('duel');banner(iAm(first)?'TU COMMENCES !':G.names[first].toUpperCase()+' COMMENCE !');render();await sleep(1200);return startTurn(first)});
}
async function startTurn(s){
  if(G.over)return;G.active=s;G.sel=null;G.phase='';G.busy=true;G.turn++;const P=G[s];
  /* au tour suivant de l'équipe, c'est le coéquipier qui joue */
  if(P.started)P.cur=(P.cur+1)%P.seats.length;P.started=true;
  P.powUsed=false;P.maxE=Math.min(G.capE,P.maxE+(G.two?2:1));P.energy=P.maxE;
  render();banner(iAm(s)?'À TOI !':'TOUR DE '+G.names[s].toUpperCase());SND.play(iAm(s)?'turn':'turn2');await sleep(700);
  if(G.turn>2&&G.turn%3===0)await tableEvent();
  if(G.over)return;
  /* bâtiments : effets de début de tour */
  for(let l=0;l<NL;l++){const b=bld(s,l);if(!b)continue;if(b.startNrj){P.energy+=b.startNrj;float(slot(s,l),'+'+b.startNrj+' énergie','g')}if(b.startDraw){await draw(s,b.startDraw);float(slot(s,l),'+1 carte','g')}if(b.startHeal)healH(s,b.startHeal)}
  /* le Gamin à la Montre change de forme (même tirage chez tout le monde) */
  for(let l=0;l<NL;l++){const c=G[s].lanes[l];if(!c||!C[c.id].morph)continue;const r=G.R()*3|0;if(r===0){c.atk++;float(slot(s,l),'Forme costaude : +1 attaque','g')}else if(r===1){c.hp++;c.max++;float(slot(s,l),'Forme solide : +1 vie','g')}else{c.shield++;float(slot(s,l),'Forme blindée : Bouclier','g')}SND.play('buff');render();await sleep(450)}
  /* le poison ronge les créatures du joueur dont c'est le tour */
  for(let l=0;l<NL&&!G.over;l++){const c=G[s].lanes[l];if(c&&c.poison){SND.play('poison');await hurt(s,l,c.poison,{through:1})}}
  if(G.over)return;
  G.phase='choice';G.busy=false;render();
  if(P.seats[P.cur].ai&&AIRUN)aiTurn(s);
}
async function playCard(s,i,l,q){
  const P=G[s],o=opp(s),id=P.hand[i],d=C[id];if(!d||d.c>P.energy)return;
  const old=d.k==='c'?P.lanes[l]:null;
  if((old&&old.fused)||(d.k==='b'&&P.bld[l]&&C[P.bld[l].id].qg))return;
  G.busy=true;G.sel=null;P.hand.splice(i,1);P.energy-=d.c;
  log((iAm(s)?'Tu joues ':G.names[s]+' joue ')+d.n,s);
  if(d.k==='c'){
    const u=mkUnit(id),b=bld(s,l);u.sh=(P.seats[P.cur].sh||[]).includes(id);
    /* fusion : posée sur une de mes créatures, la nouvelle garde son pouvoir et additionne les forces */
    if(old){u.atk+=old.atk;u.hp+=old.hp;u.max+=old.max;u.shield+=old.shield;u.fused=true;if(d.fusionBonus){u.atk+=2;u.hp+=2;u.max+=2}ev(s,'fusion',1);log('Fusion : '+C[old.id].n+' + '+d.n,s,'ko')}
    if(b&&b.arriveShield)u.shield+=b.arriveShield;
    P.lanes[l]=u;render();ev(s,'creature',1);ev(s,'t_'+d.t,1);
    SND.play('whoosh');setTimeout(()=>SND.play('slam'),340);setTimeout(()=>SND.play(d.r==='L'||old?'legend':'spawn'),430);
    if(old)banner('FUSION !');
    if(d.r==='L'){ev(s,'legend',1);if(!old)banner(d.n.toUpperCase());await V.focus(s,l,1.7)}
    else await sleep(950);
    if(duo(s,l)){float(slot(s,l),'Duo de potes !','g');SND.play('buff');render()}
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
    const spots=d.tgt==='enemy'||d.tgt==='ebld'?[V.spot(o,l)]:d.tgt==='ally'||d.tgt==='trap'?[V.spot(s,l)]:(id==='pluie'||id==='prout')?(foes.length?foes:[V.center()]):id==='pizza'?[V.heroSpot(o)]:[V.heroSpot(s)];
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
      /* un piège attend sur ce couloir : il se déclenche avant le coup */
      const tr=G[o].trap[l];if(tr){G[o].trap[l]=null;banner('PIÈGE : '+C[tr].n.toUpperCase());log('Piège : '+C[tr].n,o,'ko');SND.play('spell');ev(o,'trap',1);render();await sleep(800);
        if(tr==='peau'){c.stun=true;float(slot(s,l),'Glisse !','');render();await sleep(400);break}
        await hurt(s,l,tr==='miroir'?a:3);if(tr==='miroir'||G[s].lanes[l]!==c)break}
      SND.play('whoosh');await V.attack(s,l,d.vol||!t);
      if(d.vol||(!t&&!tb))await hurtH(o,a);
      else if(t){const before=t.hp,sh=t.shield;await hurt(o,l,a);
        /* Épines : celui qui tape se pique */
        if(C[t.id].thorns&&!G.over&&G[s].lanes[l]===c){float(slot(s,l),'Épines','r');await hurt(s,l,C[t.id].thorns)}
        if(d.poison&&!sh&&G[o].lanes[l]===t)poisonC(o,l,d.poison);
        if(d.perce&&!sh&&a>before)await hurtH(o,a-before)}
      /* pas de créature en face mais un bâtiment : c'est lui qui prend */
      else await hurtB(o,l,a*(d.bldx2?2:1));
      if(d.wide)for(const x of[l-1,l+1])if(x>=0&&x<NL&&G[o].lanes[x]&&!G.over){float(slot(s,l),'Boing','');await hurt(o,x,1)}
      if(d.vamp&&!G.over)healH(s,1);
      await sleep(330);
    }
  }
  if(G.over)return;
  await each(s,async(c,l)=>{const d=C[c.id];if(d.regen)healC(s,l,d.regen);if(d.gym){c.atk++;float(slot(s,l),'+1 attaque','g')}
    if(d.aura&&G[o].lanes[l]){float(slot(s,l),'Orage','');await hurt(o,l,d.aura)}});
  /* bâtiments : effets de fin de tour */
  for(let l=0;l<NL&&!G.over;l++){const b=bld(s,l);if(!b)continue;const c=G[s].lanes[l];
    if(b.endHeal&&c)healC(s,l,b.endHeal);
    if(b.endGym&&c){c.atk+=b.endGym;float(slot(s,l),'+1 attaque','g')}
    if(b.endHit&&G[o].lanes[l]){float(slot(s,l),'Catapulte','');SND.play('whoosh');await hurt(o,l,b.endHit)}
    if(b.endHero){float(slot(s,l),'Frites !','');await hurtH(o,b.endHero)}}
  if(G.over)return;
  /* évolution : une créature qui a tenu 3 de ses tours devient plus forte */
  await each(s,async(c,l)=>{c.turns++;if(c.turns>=(C[c.id].fastEvo?1:3)&&!c.evo)await evolve(s,l)});
  render();await sleep(450);if(G.auto)return;await startTurn(o);
}
/* combat automatique : chaque camp tape à tour de rôle, 5 fois chacun au plus ; à la fin, le héros le plus en forme gagne */
async function autoFight(first){let s=first;banner('BASTON !');await sleep(900);
  for(let t=0;t<10&&!G.over;t++){G.active=s;G.turn++;G.busy=true;render();
    for(let l=0;l<NL&&!G.over;l++){const c=G[s].lanes[l];if(c&&c.poison){SND.play('poison');await hurt(s,l,c.poison,{through:1})}}
    if(G.over)break;G.phase='main';G.busy=false;await endTurn(s);s=opp(s);
    if(!G.over&&!G.p.lanes.some(Boolean)&&!G.e.lanes.some(Boolean))break}
  if(G.over)return;const sum=x=>G[x].lanes.reduce((a,c)=>a+(c?c.hp:0),0);
  finish(G.p.hp!==G.e.hp?(G.p.hp>G.e.hp?'p':'e'):sum('p')!==sum('e')?(sum('p')>sum('e')?'p':'e'):first)}
function finish(w,why){if(G.over)return;G.over=true;G.busy=true;render();if(typeof MG!=='undefined')MG.cancel();
  if(G.auto){const won=w===ME,left=G[w].lanes.filter(Boolean).length;SND.play(won?'win':'lose');banner(won?'GAGNÉ !':'PERDU…');setTimeout(()=>{if(typeof TOUR!=='undefined'&&TOUR.fightDone)TOUR.fightDone(won,left)},1900);return}
  const win=w===ME,gain=(MODE==='net'?(win?60:25):(win?40:10))+(G.big?15:0),xp=(win?60:25)+(G.big?15:0),bet=G.bet|0;
  S.d.coins=Math.max(0,S.d.coins+gain+(win?bet:-bet));win?S.d.wins++:S.d.losses++;
  if(win){ev(ME,'win',1);if(G[ME].hp>=G[ME].maxHp/2)ev(ME,'winBig',1)}ev(ME,'game',1);
  /* mode histoire : la première victoire d'un chapitre ouvre le suivant et donne sa récompense */
  let defiTxt='';if(win&&G.defi&&S.d.defi!==dayKey()){S.d.defi=dayKey();S.d.coins+=100;defiTxt='Défi du jour réussi : +100 pièces'}
  let storyTxt='';if(win&&G.story!=null&&G.story===S.d.story){S.d.story++;storyTxt=storyReward(STORY[G.story])}
  const up=typeof PROG!=='undefined'?PROG.addXp(xp):[];S.save();
  SND.music(null);SND.play(win?'win':'lose');
  $('#endT').textContent=win?'VICTOIRE':'DÉFAITE';$('#end').classList.toggle('lost',!win);
  $('#endP').innerHTML=`<span class="why">${why||(win?G.names[opp(ME)]+' retourne dans le panier à linge.':'Tu t\'es fait laver à 90°. Revanche ?')}</span>
    <div class="gains"><span>${COIN}+${gain}</span><span class="xp">+${xp} XP</span></div>`
    +(bet?`<div class="lvup ${win?'':'bad'}">Pari : ${win?'+':'-'}${bet} pièces</div>`:'')
    +(defiTxt?`<div class="story-win">${defiTxt}</div>`:'')+(storyTxt?`<div class="story-win">Chapitre terminé — ${storyTxt}</div>`:'')+up.map(u=>`<div class="lvup">Niveau ${u.lvl} — ${u.txt}</div>`).join('');
  if(win){const cols=['#e8443a','#ffd23f','#58d68d','#7fd4ff','#fff6e0'];for(let i=0;i<60;i++){const c=document.createElement('div');c.className='conf';c.style.background=cols[i%5];c.style.left=Math.random()*100+'vw';c.style.animationDuration=2+Math.random()*3+'s';c.style.animationDelay=Math.random()*1.5+'s';$('#fx').appendChild(c)}}
  try{const lk=G[opp(ME)].seats[0].look;if(win){if(V.sad)V.sad()}else if(V.celebrate)V.celebrate(lk&&lk.cele||'bras')}catch(e){}
  if(typeof rematchUI==='function')rematchUI();
  setTimeout(()=>{if(G&&G.over)$('#end').classList.remove('hide')},win?900:2600)}

/* ---------- émotes : une petite phrase que tout le monde voit ---------- */
const EMOTES=['Bien joué !','Aïe…','Ha ha !','Tu vas voir…','Dépêche !','GG'];
let EMOT=0;
function showEmote(who,k,name){const t=EMOTES[k|0];if(!t||!G)return;const b=document.createElement('div');b.className='bub '+who;b.textContent=(who==='me'?'':name+' : ')+t;
  $('#bubbles').querySelectorAll('.bub.'+who).forEach(x=>x.remove());$('#bubbles').appendChild(b);SND.play('click');if(who==='foe'&&V.nod)V.nod();setTimeout(()=>b.remove(),2800)}
function sayEmote(k){if(!G||G.over||Date.now()-EMOT<2500)return;EMOT=Date.now();showEmote('me',k);if(MODE==='net')NET.send({t:'emo',k,g:MYG})}
/* reçue d'un autre joueur (g = sa place à la table en 2 contre 2) */
function remoteEmote(k,g){if(!G)return;const s=G.two?(g%2?'e':'p'):opp(ME),st=G[s].seats[G.two?g>>1:0];if(st)showEmote(s===ME?'mate':'foe',k,st.name)}
$('#emoList').innerHTML=EMOTES.map((t,i)=>'<button class="chip" data-emo="'+i+'">'+t+'</button>').join('');
$('#bEmo').addEventListener('click',()=>$('#emoList').classList.toggle('hide'));
$('#emoList').addEventListener('click',e=>{const b=e.target.closest('[data-emo]');if(!b)return;$('#emoList').classList.add('hide');sayEmote(+b.dataset.emo)});

/* ---------- actions (les miennes et celles du pote en ligne) ---------- */
function act(a){if(LOCK||!G||G.auto||G.busy||G.over||!myTurn())return;LOCK=true;if(MODE==='net')NET.send(G.two?Object.assign({g:MYG},a):a);Q=Q.then(()=>apply(ME,a,MYSEAT)).finally(()=>LOCK=false)}
/* action d'un autre joueur. En 2 contre 2, a.g dit qui (0 à 3 : pair = côté p, impair = côté e) */
function remote(a){Q=Q.then(()=>G&&G.two?apply(a.g%2?'e':'p',a,a.g>>1):apply(opp(ME),a,0))}
async function apply(s,a,seat){if(!G||G.over||G.active!==s||G[s].cur!==(seat|0))return;
  if(a.t==='choice')return doChoice(s,a.v==='nrj'?'nrj':'cards');
  if(G.phase!=='main'||a.l>=NL)return;
  if(a.t==='play')await playCard(s,a.i,a.l,a.q);else if(a.t==='end')await endTurn(s);else if(a.t==='power')await doPower(s);else if(a.t==='rage')await doRage(s)}
/* certains sorts lancent d'abord un mini-jeu éclair : son résultat (0 raté, 1 normal, 2 parfait) part avec l'action */
function tryPlay(i,l){if(MGBUSY)return;const d=C[G[ME].hand[i]];if(!d)return;
  if(d.k==='s'&&d.mg){MGBUSY=true;MG.quick(d.n).then(q=>{MGBUSY=false;if(G&&!G.over&&myTurn())act({t:'play',i,l,q})})}
  else act({t:'play',i,l})}

/* ---------- le robot ---------- */
function aiPick(s){
  const P=G[s],F=G[opp(s)],foes=F.lanes.map((c,l)=>c&&{c,l}).filter(Boolean),mine=P.lanes.map((c,l)=>c&&{c,l}).filter(Boolean);
  const byAtk=a=>a.slice().sort((x,y)=>y.c.atk-x.c.atk),full=P.lanes.every(Boolean);
  const idx=P.hand.map((id,i)=>i).filter(i=>C[P.hand[i]].c<=P.energy).sort((a,b)=>C[P.hand[b]].c-C[P.hand[a]].c);
  for(const i of idx){const id=P.hand[i],d=C[id];let t;
    if(d.k==='c'){let best=-99,bl=-1;
      for(let l=0;l<NL;l++){const cur=P.lanes[l],f=F.lanes[l];let sc=cur?(cur.fused?-99:full?5:1):10;
        if(d.t===P.terr[l])sc+=3;if(P.bld[l])sc+=2;if(f){sc+=d.a>=f.hp?3:1;if(d.vol)sc-=2;if(d.shield||d.poison)sc+=1}else sc+=2;
        sc+=Math.random();if(sc>best){best=sc;bl=l}}
      if(best>0)return[i,bl]}
    else if(d.k==='b'){let best=-1,bl=-1;for(let l=0;l<NL;l++){if(P.bld[l])continue;const sc=(P.lanes[l]?3:1)+Math.random();if(sc>best){best=sc;bl=l}}if(bl>=0)return[i,bl]}
    else if(d.tgt==='trap'){const ls=LANES().filter(l=>!P.trap[l]).sort((x,y)=>(F.lanes[y]?1:0)-(F.lanes[x]?1:0));if(ls.length)return[i,ls[0]]}
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
      case 'cri':if(P.rage<=6)return[i,0];break;
      case 'potion':t=byAtk(mine.filter(m=>!m.c.evo))[0];if(t)return[i,t.l];break;
      case 'demolition':{const bl=F.bld.findIndex(b=>b&&!C[b.id].qg),q=F.bld.findIndex(b=>b&&C[b.id].qg);if(bl>=0)return[i,bl];if(q>=0)return[i,q];break}
    }
  }
  return null}
async function aiDo(s,a){if(MODE==='net')NET.send(Object.assign({g:G[s].seats[G[s].cur].g},a));G.busy=false;await apply(s,a,G[s].cur)}
async function aiTurn(s){
  if(G.aiFor===G.turn)return;G.aiFor=G.turn;
  const P=G[s],turn=G.turn,ok=()=>!G.over&&G.active===s&&G.turn===turn;
  /* de temps en temps, le robot lâche une petite phrase */
  if(MODE==='solo'&&Math.random()<.16)showEmote(s===ME?'mate':'foe',Math.random()*EMOTES.length|0,G.names[s]);
  await sleep(900);if(!ok())return;
  if(G.phase==='choice')await aiDo(s,{t:'choice',v:P.hand.length<=3?'cards':'nrj'});
  if(!ok())return;G.busy=true;render();await sleep(700);
  if(P.rage>=RAGE_MAX&&G[opp(s)].lanes.some(Boolean)){await aiDo(s,{t:'rage'});if(!ok())return;G.busy=true}
  /* le robot joue les mini-jeux des sorts au hasard (le résultat part avec l'action) */
  for(let n=0;n<8&&ok();n++){const m=aiPick(s);if(!m)break;await aiDo(s,{t:'play',i:m[0],l:m[1],q:Math.random()*3|0});if(!ok())return;G.busy=true;render();await sleep(550)}
  if(!ok())return;
  G.busy=false;if(canPower(s)){await aiDo(s,{t:'power'});if(!ok())return}
  await aiDo(s,{t:'end'})}

/* ---------- clics ---------- */
$('#hand').addEventListener('click',e=>{
  if(!G||G.busy||G.over||!myTurn()||G.phase!=='main'||LOCK||MGBUSY)return;
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
