/* Le duel : règles + affichage du plateau. Les côtés sont 'p' (hôte) et 'e' (2e joueur / robot).
   Deux tables : classique (4 couloirs, 20 PV) et Grande Baston (6 couloirs, 30 PV). NL = nombre de couloirs (cards.js). */
const $=s=>document.querySelector(s), sleep=ms=>new Promise(r=>setTimeout(r,ms));
const opp=s=>s==='p'?'e':'p';
let G=null,ME='p',MODE='solo',Q=Promise.resolve(),LOCK=false;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const shuffle=(a,R)=>{for(let i=a.length-1;i>0;i--){const j=R()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const LANES=()=>Array.from({length:NL},(_,i)=>i);
/* une créature posée sur un couloir */
const mkUnit=id=>{const d=C[id];return{id,atk:d.a,hp:d.h,max:d.h,stun:false,shield:d.shield||0,poison:0,revived:false,uid:++G.uid}};
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
  render()}
async function hurtH(s,n){if(G.over)return;G[s].hp-=n;float($('#hero-'+s),'-'+n,'r');SND.play('heroHit');ev(opp(s),'heroDmg',n);
  V.heroHit(s);render();await sleep(260);
  if(G[s].hp<=0)finish(opp(s))}
const atkOf=(s,l)=>{const c=G[s].lanes[l],b=bld(s,l);return c.atk+(C[c.id].t===G[s].terr[l]?1:0)+(b&&b.atk||0)};

/* ---------- affichage ---------- */
const slot=(s,l)=>({getBoundingClientRect:()=>V.rect(s,l)});
function okFor(s,l){if(!G||G.busy||G.over||G.active!==ME||G.sel==null)return false;const sel=C[G[ME].hand[G.sel]],c=G[s].lanes[l];
  return sel.k==='c'||sel.k==='b'?s===ME:sel.tgt==='enemy'?s!==ME&&!!c:sel.tgt==='ally'?s===ME&&!!c:false}
function render(){
  if(!G)return;
  for(const s of ['e','p'])for(let l=0;l<NL;l++)if(G[s].lanes[l])G[s].lanes[l].shownAtk=atkOf(s,l);
  V.sync(G,okFor);
  for(const s of ['e','p']){
    const P=G[s];
    $('#hero-'+s).innerHTML=`<div class="face">${faceHTML(G.faces[s])}</div>
      <div class="hinfo"><b>${G.names[s]}</b><div class="small">${G.titles&&G.titles[s]?G.titles[s]+' · ':''}Pioche ${P.deck.length}</div></div>
      ${s!==ME?`<div id="ehand">${'<i></i>'.repeat(P.hand.length)}</div>`:''}
      <div class="nrj" title="Énergie">${Array.from({length:P.maxE},(_,i)=>`<i class="${i<P.energy?'on':''}"></i>`).join('')}</div>
      <div class="hp">${IC('heart')}<b>${Math.max(0,P.hp)}</b></div>`;
  }
  const myTurn=G.active===ME&&!G.busy&&!G.over,H=G[ME];
  $('#hand').innerHTML=H.hand.map((id,i)=>cardHTML(id,null,false,(i===G.sel?'sel ':'')+(C[id].c>H.energy?'no':''))).join('');
  $('#hand').classList.toggle('many',H.hand.length>5);
  [...$('#hand').children].forEach((el,i)=>el.dataset.i=i);
  $('#go').disabled=!myTurn;
  if(!G.over)$('#hint').textContent=!myTurn?(G.active&&G.active!==ME?G.names[opp(ME)]+' réfléchit…':'…'):
    G.sel==null?'Choisis une carte, puis lance la baston.':
    (()=>{const d=C[H.hand[G.sel]];return d.k==='c'?'Choisis un couloir (même terrain = +1 attaque)':d.k==='b'?'Choisis un de tes couloirs pour construire':d.tgt==='enemy'?'Choisis une créature ennemie':d.tgt==='ally'?'Choisis une de tes créatures':'Reclique la carte pour lancer le sort'})();
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
  MODE=o.mode;ME=o.me;LOCK=false;NL=o.big?6:4;const R=rng(o.seed),O=opp(ME),hp=o.big?30:20;
  const terrs=()=>{const t=shuffle(['fromage','sauce','slip','nuage'],R);return NL>4?shuffle(t.concat(shuffle(['fromage','sauce','slip','nuage'],R).slice(0,NL-4)),R):t};
  const mk=(deck,hp)=>({hp,maxHp:hp,energy:0,maxE:1,deck:shuffle(deck.slice(),R),hand:[],lanes:Array(NL).fill(null),bld:Array(NL).fill(null),terr:terrs()});
  const p=mk(o.decks.p,hp),e=mk(o.decks.e,o.hpE||hp);
  G={p,e,names:o.names,faces:o.faces,titles:o.titles||{},active:null,sel:null,busy:true,over:false,uid:0,maxHp:hp,capE:o.big?8:7,big:!!o.big,story:o.story};
  for(let i=0;i<4;i++){p.hand.push(p.deck.pop());e.hand.push(e.deck.pop())}
  $('#heroes').innerHTML=`<div class="hero panel top" id="hero-${O}"></div><div class="hero panel bot" id="hero-${ME}"></div>`;
  $('#log').innerHTML='';$('#fx').innerHTML='';$('#loupe').innerHTML='';
  document.querySelectorAll('.scr').forEach(x=>x.classList.add('hide'));$('#app').classList.remove('hide');fit();
  SND.music('duel');
  V.start(ME,{p:p.terr,e:e.terr},o.faces[O],NL);
  V.onPick=(s,l)=>{if(okFor(s,l)&&!LOCK)act({t:'play',i:G.sel,l})};
  V.onHover=h=>{const c=h&&G[h.s].lanes[h.l],b=h&&G[h.s].bld[h.l];if(c)$('#loupe').innerHTML=cardHTML(c.id,c,false);else if(b)$('#loupe').innerHTML=cardHTML(b.id,null,false)};
  render();
  /* un mini-jeu tiré au hasard décide qui commence ; l'autre pioche une carte en plus (les actions du pote attendent derrière) */
  Q=sleep(1800).then(()=>MG.run({mode:MODE,me:ME,seed:o.seed,names:o.names,faces:o.faces})).then(async first=>{
    if(G.over)return;const sec=opp(first);G[sec].hand.push(G[sec].deck.pop());if(first===ME)ev(ME,'mgwin',1);
    SND.music('duel');banner(first===ME?'TU COMMENCES !':G.names[first].toUpperCase()+' COMMENCE !');render();await sleep(1200);return startTurn(first)});
}
async function startTurn(s){
  if(G.over)return;G.active=s;G.sel=null;const P=G[s];P.maxE=Math.min(G.capE,P.maxE+1);P.energy=P.maxE;
  await draw(s);banner(s===ME?'À TOI !':'TOUR DE '+G.names[s].toUpperCase());SND.play(s===ME?'turn':'turn2');
  /* bâtiments : effets de début de tour */
  for(let l=0;l<NL;l++){const b=bld(s,l);if(!b)continue;if(b.startNrj){P.energy+=b.startNrj;float(slot(s,l),'+'+b.startNrj+' énergie','g')}if(b.startDraw){await draw(s,b.startDraw);float(slot(s,l),'+1 carte','g')}}
  /* le poison ronge les créatures du joueur dont c'est le tour */
  for(let l=0;l<NL&&!G.over;l++){const c=G[s].lanes[l];if(c&&c.poison){SND.play('poison');await hurt(s,l,c.poison,{through:1})}}
  if(G.over)return;
  G.busy=false;render();
  if(MODE==='solo'&&s==='e')aiTurn();
}
async function playCard(s,i,l){
  const P=G[s],id=P.hand[i],d=C[id];if(!d||d.c>P.energy)return;
  G.busy=true;G.sel=null;P.hand.splice(i,1);P.energy-=d.c;
  log((s===ME?'Tu joues ':G.names[s]+' joue ')+d.n,s);
  if(d.k==='c'){
    P.lanes[l]=mkUnit(id);const b=bld(s,l);if(b&&b.arriveShield)P.lanes[l].shield+=b.arriveShield;
    render();ev(s,'creature',1);ev(s,'t_'+d.t,1);
    SND.play('whoosh');setTimeout(()=>SND.play('slam'),340);setTimeout(()=>SND.play(d.r==='L'?'legend':'spawn'),430);
    if(d.r==='L'){ev(s,'legend',1);banner(d.n.toUpperCase());await V.focus(s,l,1.7)}
    else await sleep(950);
    if(d.play)await d.play(s,l);
    /* Bricoleur : construit un bâtiment sur son couloir s'il est libre */
    if(d.buildOn&&!P.bld[l]){P.bld[l]={id:d.buildOn,uid:++G.uid};log(C[d.buildOn].n+' est construite',s);render();SND.play('slam');await sleep(700)}
    /* Livraison : pose une créature dans un couloir voisin libre */
    if(d.summon){const fl=[l-1,l+1].find(x=>x>=0&&x<NL&&!P.lanes[x]);if(fl!==undefined){P.lanes[fl]=mkUnit(d.summon);log(C[d.summon].n+' est livré',s);render();SND.play('whoosh');setTimeout(()=>SND.play('slam'),340);await sleep(900)}}
  }else if(d.k==='b'){
    /* construction : remplace l'ancien bâtiment du couloir */
    P.bld[l]={id,uid:++G.uid};ev(s,'build',1);render();SND.play('slam');setTimeout(()=>SND.play('buff'),300);banner(d.n.toUpperCase());await sleep(1000);
  }else{banner(d.n.toUpperCase()+' !');SND.play('spell');render();ev(s,'spell',1);
    const o=opp(s),foes=LANES().filter(i=>G[o].lanes[i]).map(i=>V.spot(o,i));
    const spots=d.tgt==='enemy'?[V.spot(o,l)]:d.tgt==='ally'?[V.spot(s,l)]:(id==='pluie'||id==='prout')?(foes.length?foes:[V.center()]):id==='pizza'?[V.heroSpot(o)]:[V.heroSpot(s)];
    await sleep(350);await V.spell(id,spots,id==='meteor');await d.cast(s,l)}
  await sleep(200);G.busy=false;render();
}
async function endTurn(s){
  if(G.busy||G.over)return;G.busy=true;G.sel=null;render();const o=opp(s);
  for(let l=0;l<NL&&!G.over;l++){
    const c=G[s].lanes[l];if(!c)continue;
    if(c.stun){c.stun=false;float(slot(s,l),'Zzz…','');await sleep(350);render();continue}
    const d=C[c.id];
    for(let k=0;k<(d.double?2:1)&&!G.over&&G[s].lanes[l]===c;k++){
      const a=atkOf(s,l),t=G[o].lanes[l];
      SND.play('whoosh');await V.attack(s,l,d.vol||!t);
      if(d.vol||!t)await hurtH(o,a);
      else{const before=t.hp,sh=t.shield;await hurt(o,l,a);
        if(d.poison&&!sh&&G[o].lanes[l]===t)poisonC(o,l,d.poison);
        if(d.perce&&!sh&&a>before)await hurtH(o,a-before)}
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
  render();await sleep(450);await startTurn(o);
}
function finish(w,why){if(G.over)return;G.over=true;G.busy=true;render();if(typeof MG!=='undefined')MG.cancel();
  const win=w===ME,gain=(MODE==='net'?(win?60:25):(win?40:10))+(G.big?15:0),xp=(win?60:25)+(G.big?15:0);
  S.d.coins+=gain;win?S.d.wins++:S.d.losses++;
  if(win){ev(ME,'win',1);if(G[ME].hp>=G[ME].maxHp/2)ev(ME,'winBig',1)}ev(ME,'game',1);
  /* mode histoire : la première victoire d'un chapitre ouvre le suivant et donne sa récompense */
  let storyTxt='';if(win&&G.story!=null&&G.story===S.d.story){S.d.story++;storyTxt=storyReward(STORY[G.story])}
  const up=typeof PROG!=='undefined'?PROG.addXp(xp):[];S.save();
  SND.music(null);SND.play(win?'win':'lose');
  $('#endT').textContent=win?'VICTOIRE':'DÉFAITE';$('#end').classList.toggle('lost',!win);
  $('#endP').innerHTML=`<span class="why">${why||(win?G.names[opp(ME)]+' retourne dans le panier à linge.':'Tu t\'es fait laver à 90°. Revanche ?')}</span>
    <div class="gains"><span>${COIN}+${gain}</span><span class="xp">+${xp} XP</span></div>`
    +(storyTxt?`<div class="story-win">Chapitre terminé — ${storyTxt}</div>`:'')+up.map(u=>`<div class="lvup">Niveau ${u.lvl} — ${u.txt}</div>`).join('');
  if(win){const cols=['#e8443a','#ffd23f','#58d68d','#7fd4ff','#fff6e0'];for(let i=0;i<60;i++){const c=document.createElement('div');c.className='conf';c.style.background=cols[i%5];c.style.left=Math.random()*100+'vw';c.style.animationDuration=2+Math.random()*3+'s';c.style.animationDelay=Math.random()*1.5+'s';$('#fx').appendChild(c)}}
  setTimeout(()=>$('#end').classList.remove('hide'),900)}

/* ---------- actions (les miennes et celles du pote en ligne) ---------- */
function act(a){if(LOCK||!G||G.busy||G.over||G.active!==ME)return;LOCK=true;if(MODE==='net')NET.send(a);Q=Q.then(()=>apply(ME,a)).finally(()=>LOCK=false)}
function remote(a){Q=Q.then(()=>apply(opp(ME),a))}
async function apply(s,a){if(!G||G.over||G.active!==s||a.l>=NL)return;if(a.t==='play')await playCard(s,a.i,a.l);else if(a.t==='end')await endTurn(s)}

/* ---------- le robot ---------- */
function aiPick(){
  const P=G.e,F=G.p,foes=F.lanes.map((c,l)=>c&&{c,l}).filter(Boolean),mine=P.lanes.map((c,l)=>c&&{c,l}).filter(Boolean);
  const byAtk=a=>a.slice().sort((x,y)=>y.c.atk-x.c.atk);
  const idx=P.hand.map((id,i)=>i).filter(i=>C[P.hand[i]].c<=P.energy).sort((a,b)=>C[P.hand[b]].c-C[P.hand[a]].c);
  for(const i of idx){const id=P.hand[i],d=C[id];let t;
    if(d.k==='c'){let best=-99,bl=-1;
      for(let l=0;l<NL;l++){const cur=P.lanes[l],f=F.lanes[l];let sc=cur?(d.c-C[cur.id].c>=2?1:-99):10;
        if(d.t===P.terr[l])sc+=3;if(P.bld[l])sc+=2;if(f){sc+=d.a>=f.hp?3:1;if(d.vol)sc-=2;if(d.shield||d.poison)sc+=1}else sc+=2;
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
  G.busy=true;render();await sleep(1100);
  for(let n=0;n<8&&!G.over;n++){const m=aiPick();if(!m)break;await playCard('e',m[0],m[1]);G.busy=true;render();await sleep(550)}
  if(G.over)return;G.busy=false;endTurn('e')}

/* ---------- clics ---------- */
$('#hand').addEventListener('click',e=>{
  if(!G||G.busy||G.over||G.active!==ME||LOCK)return;
  const h=e.target.closest('#hand .card');if(!h)return;
  const i=+h.dataset.i,d=C[G[ME].hand[i]];
  if(d.c>G[ME].energy){h.classList.remove('shake');void h.offsetWidth;h.classList.add('shake');$('#hint').textContent='Pas assez d\'énergie pour cette carte.';SND.play('error');return}
  if(G.sel===i){if(d.k==='s'&&!d.tgt)return act({t:'play',i,l:0});G.sel=null}else G.sel=i;
  SND.play('card');render()});
V.init($('#gl'));
$('#go').addEventListener('click',()=>act({t:'end'}));
$('#app').addEventListener('mouseover',e=>{const el=e.target.closest('.card');if(!el||el.closest('#loupe'))return;$('#loupe').innerHTML=cardHTML(el.dataset.id,null,false)});
$('#quit').addEventListener('click',()=>{if(MODE==='net')NET.stop();location.reload()});
$('#again').addEventListener('click',()=>{if(MODE==='net')NET.stop();location.reload()});
