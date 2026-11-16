/* Menus : accueil + quêtes, choix de la table, histoire, boutique, collection + decks, casier, salon en ligne. */
S.load();PROG.roll();
document.querySelectorAll('[data-ic]').forEach(e=>{e.insertAdjacentHTML('afterbegin',IC(e.dataset.ic))});
const esc=t=>String(t==null?'':t).replace(/[<>&"']/g,'').slice(0,16)||'Pote';
let CUR='menu';
function applyLook(){if(typeof V!=='undefined'&&V.setLook)V.setLook({halo:HALOS[S.d.use.halo].c,back:BACKS[S.d.use.back],table:TABLES[S.d.use.table]})}
function show(id){CUR=id;document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('hide',x.id!==id));$('#app').classList.add('hide');$('#modes').classList.add('hide');$('#hud').classList.remove('hide');
  applyLook();if(typeof V!=='undefined'&&V.showcase)V.showcase();SND.music('menu');
  drawHud();if(id==='menu')drawMenu();if(id==='shop')drawShop();if(id==='coll')drawColl();if(id==='locker')drawLocker();if(id==='story')drawStory()}
function toast(t){const b=$('#toast');b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function levelUps(up){up.forEach((u,i)=>setTimeout(()=>toast('Niveau '+u.lvl+' ! '+u.txt),i*2700))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){if(b.dataset.go==='menu')NET.stop();show(b.dataset.go)}});
/* les portraits 3D arrivent juste après le chargement : on redessine l'écran en cours */
document.addEventListener('ports',()=>{if($('#app').classList.contains('hide'))show(CUR)});
const price=n=>COIN+n;

/* ---------- bandeau du haut : profil, niveau, pièces, son ---------- */
function drawHud(){const d=S.d,need=PROG.need(d.lvl);
  $('#pname').value=d.name;$('#pface').innerHTML=faceHTML(d.avatar);
  $('#ptitle').textContent=d.use.title;$('#lvln').textContent=d.lvl;$('#lvlbar').style.width=Math.min(100,d.xp/need*100)+'%';$('#lvlx').textContent=d.xp+' / '+need+' XP';
  document.querySelectorAll('.coins').forEach(x=>x.textContent=d.coins);
}
$('#pname').addEventListener('input',e=>{S.d.name=esc(e.target.value);S.save()});
$('#pface').addEventListener('click',()=>show('locker'));
/* ---------- réglages : volumes, plein écran, qualité, tremblements ---------- */
const OPT=Object.assign({full:false,q:'high',shake:true},(()=>{try{return JSON.parse(STORE.get('bdcOpt')||'{}')}catch(e){return{}}})());
function saveOpt(){STORE.set('bdcOpt',JSON.stringify(OPT));if(typeof V!=='undefined'&&V.setOpt)V.setOpt(OPT)}
function setFull(on){OPT.full=on;saveOpt();try{if(window.BDC&&BDC.setFull)BDC.setFull(on);else if(on&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen()}catch(e){}drawSettings()}
function drawSettings(){$('#oMus').value=Math.round(SND.vol.mus*100);$('#oSfx').value=Math.round(SND.vol.sfx*100);$('#oMusV').textContent=$('#oMus').value+' %';$('#oSfxV').textContent=$('#oSfx').value+' %';
  const full=window.BDC?!!OPT.full:!!document.fullscreenElement;document.querySelectorAll('[data-full]').forEach(b=>b.classList.toggle('on',(b.dataset.full==='1')===full));
  document.querySelectorAll('[data-q]').forEach(b=>b.classList.toggle('on',b.dataset.q===OPT.q));document.querySelectorAll('[data-shake]').forEach(b=>b.classList.toggle('on',(b.dataset.shake==='1')===OPT.shake))}
const openSettings=()=>{drawSettings();$('#settings').classList.remove('hide')};
$('#bSet').addEventListener('click',openSettings);$('#bSet2').addEventListener('click',openSettings);
$('#bSetX').addEventListener('click',()=>$('#settings').classList.add('hide'));
$('#oMus').addEventListener('input',e=>{SND.set('mus',e.target.value/100);drawSettings()});
$('#oSfx').addEventListener('input',e=>{SND.set('sfx',e.target.value/100);drawSettings()});
$('#oSfx').addEventListener('change',()=>SND.play('coin'));
$('#settings').addEventListener('click',e=>{let b;
  if(b=e.target.closest('[data-full]'))return setFull(b.dataset.full==='1');
  if(b=e.target.closest('[data-q]')){OPT.q=b.dataset.q;saveOpt();return drawSettings()}
  if(b=e.target.closest('[data-shake]')){OPT.shake=b.dataset.shake==='1';saveOpt();return drawSettings()}
  if(e.target.closest('#bReset')){const r=$('#bReset');if(r.dataset.sure){STORE.del('bdc1');location.reload()}else{r.dataset.sure=1;r.textContent='Sûr ? Reclique pour tout effacer';r.classList.add('red');setTimeout(()=>{delete r.dataset.sure;r.textContent='Effacer ma sauvegarde';r.classList.remove('red')},4000)}}});
if(!window.BDC)document.addEventListener('fullscreenchange',()=>{OPT.full=!!document.fullscreenElement;STORE.set('bdcOpt',JSON.stringify(OPT));drawSettings()});
/* le plein écran demandé la dernière fois revient au premier clic (le navigateur exige un clic) */
if(window.BDC&&BDC.onFull)BDC.onFull(v=>{OPT.full=v;saveOpt();drawSettings()});
if(!window.BDC)addEventListener('pointerdown',()=>{if(OPT.full&&!document.fullscreenElement)try{document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}},{once:true});
saveOpt();

/* ---------- accueil ---------- */
function drawMenu(){const d=S.d;PROG.roll();
  $('#stats').textContent=`${d.wins} victoires · ${d.losses} défaites · ${IDS.filter(id=>d.col[id]).length} / ${IDS.length} cartes`;
  $('#freeTag').textContent=d.free?d.free+' offert'+(d.free>1?'s':''):'';
  $('#storyTag').textContent=d.story>=STORY.length?'Histoire terminée. Tu peux rejouer les chapitres.':'Chapitre '+(d.story+1)+' sur '+STORY.length+' : '+STORY[d.story].n+'.';
  $('#quests').innerHTML='<div class="label">Quêtes du jour</div>'+d.quests.map((q,j)=>{const Q=QUESTS[q.i];
    return `<div class="quest ${q.done?'done':q.ready?'ready':''}"><div class="qn">${Q.n}</div><div class="qbar"><i style="width:${q.p/Q.g*100}%"></i><span>${q.p} / ${Q.g}</span></div>
      ${q.done?'<div class="qr ok">'+IC('check')+'</div>':q.ready?`<button class="btn sm green" data-claim="${j}">${price(Q.r)}</button>`:`<div class="qr">${price(Q.r)}</div>`}</div>`}).join('')
    +`<div class="qfoot">Nouvelles quêtes chaque jour. Chaque quête donne aussi 30 XP.</div>`}
$('#quests').addEventListener('click',e=>{const b=e.target.closest('[data-claim]');if(!b)return;const up=PROG.claim(+b.dataset.claim);levelUps(up);drawHud();drawMenu()});
function myDeck(){if(S.deckOk(S.deck()))return S.deck().slice();toast('Ton deck doit avoir 20 cartes. Va dans Collection et appuie sur « Deck auto ».');return null}
/* les adversaires du mode libre : chacun a son terrain préféré */
const OPPS=[{n:'Roi Chaussette',f:'chaussette',t:null,ti:'Roi du panier à linge'},{n:'Mamie Fondue',f:'fondue',t:'fromage',ti:'Reine du fromage'},{n:'Chef Piment',f:'piment',t:'sauce',ti:'Ça pique'},{n:'Capitaine Slip',f:'grenouille',t:'slip',ti:'Héros du marais'},{n:'Miss Nuage',f:'licorne',t:'nuage',ti:'La tête en l\'air'}];
function oppDeck(t){if(!t)return randomDeck();const base=randomDeck(),mine=IDS.filter(id=>C[id].t===t&&C[id].r!=='L');
  return base.map((id,i)=>i%2?mine[Math.random()*mine.length|0]:id).filter((id,i,a)=>a.slice(0,i).filter(x=>x===id).length<RAR[C[id].r].max).concat(randomDeck()).slice(0,20)}
/* le pari : une mise en pièces sur ta victoire (doublée si tu gagnes, perdue sinon) */
let BET=0;
function drawBet(){document.querySelectorAll('[data-bet]').forEach(b=>{const v=+b.dataset.bet;b.classList.toggle('on',v===BET);b.disabled=v>S.d.coins})}
document.querySelector('.bets').addEventListener('click',e=>{const b=e.target.closest('[data-bet]');if(!b||b.disabled)return;BET=+b.dataset.bet;drawBet()});
function startSolo(o){const d=myDeck();if(!d)return;$('#modes').classList.add('hide');$('#hud').classList.add('hide');
  newGame(Object.assign({mode:'solo',me:'p',seed:Math.random()*1e9|0,decks:{p:d,e:o.deck},names:{p:S.d.name,e:o.n},faces:{p:S.d.avatar,e:o.f},titles:{p:S.d.use.title,e:o.ti}},o.opt))}
$('#bPlay').addEventListener('click',()=>{drawMenu();if(BET>S.d.coins)BET=0;drawBet();$('#modes').classList.remove('hide')});
$('#bModesX').addEventListener('click',()=>$('#modes').classList.add('hide'));
$('#modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;const m=b.dataset.mode;
  if(m==='story')return show('story');const o=OPPS[Math.random()*OPPS.length|0];startSolo({n:o.n,f:o.f,ti:o.ti,deck:oppDeck(o.t),opt:{big:m==='big',bet:Math.min(BET,S.d.coins)}})});

/* ---------- histoire ---------- */
function drawStory(){const d=S.d;
  $('#chapters').innerHTML=STORY.map((ch,i)=>{const st=i<d.story?'done':i===d.story?'':'lock';
    return `<div class="chap ${st}"><div class="chn">${i+1}</div><div class="face">${faceHTML(ch.boss)}</div>
      <div class="cht"><b>${ch.n}${ch.big?' — Grande Baston':''}</b><span>${ch.x}</span><i>${ch.bn} · ${ch.hp||20} PV · Récompense : ${storyRewardTxt(ch.r)}</i></div>
      ${st==='lock'?'<div class="chlock">'+IC('lock')+'</div>':`<button class="btn sm ${st?'':'red'}" data-ch="${i}">${st?'Rejouer':'Jouer'}</button>`}</div>`}).join('')}
$('#chapters').addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(!b)return;const i=+b.dataset.ch,ch=STORY[i];
  startSolo({n:ch.bn,f:ch.boss,ti:ch.ti,deck:bossDeck(ch),opt:{big:!!ch.big,hpE:ch.hp,story:i}})});

/* ---------- boutique : cadeau du jour, cartes du jour, paquets ---------- */
const packArt=(p,big)=>`<div class="pkart ${big?'big':''}" ${big?'id="thePack"':''} style="--pc:${p.col}">${window.PORT&&PORT[p.p]?'<img src="'+PORT[p.p]+'" alt="">':''}</div>`;
function drawShop(){const d=S.d;PROG.roll();
  $('#gift').innerHTML=d.gift?'<span class="small" style="color:#fff6e0">Cadeau du jour déjà pris.</span>':`<button class="btn sm green" id="bGift">${IC('gift')} Cadeau du jour ${price(40)}</button>`;
  $('#offers').innerHTML=dailyOffers().map(id=>{const r=C[id].r,full=(d.col[id]||0)>=RAR[r].max;
    return `<div class="offer">${cardHTML(id)}<button class="btn sm ${full?'':'yellow'}" data-buy="${id}" ${full?'disabled':''}>${full?'Déjà au max':price(PRICE[r])}</button></div>`}).join('');
  $('#packs').innerHTML=Object.entries(PACKS).map(([k,p])=>{const free=k==='carton'&&d.free>0;
    return `<div class="pack">${packArt(p)}<b>${p.n}</b><p>${p.x}</p>
    <button class="btn sm ${free?'green':'yellow'}" data-pack="${k}">${free?'Gratuit ('+d.free+')':price(p.price)}</button></div>`}).join('')}
$('#shop').addEventListener('click',e=>{let b;const d=S.d;
  if(e.target.closest('#bGift')){d.gift=true;d.coins+=40;S.save();SND.play('coin');toast('+40 pièces');drawHud();return drawShop()}
  if(b=e.target.closest('[data-buy]')){const id=b.dataset.buy,pr=PRICE[C[id].r];if(d.coins<pr)return toast('Pas assez de pièces. Fais des quêtes et des duels.');
    d.coins-=pr;S.add(id);S.save();SND.play('coin');toast(C[id].n+' rejoint ta collection.');drawHud();return drawShop()}
  if(b=e.target.closest('[data-pack]')){const k=b.dataset.pack,p=PACKS[k];
    if(k==='carton'&&d.free>0)d.free--;else if(d.coins>=p.price)d.coins-=p.price;else return toast('Pas assez de pièces. Fais des quêtes et des duels.');
    const got=p.slots.map(sl=>{const id=rollCard(sl,p.t),isNew=!d.col[id],dust=S.add(id);return{id,isNew,dust}});
    PROG.ev('pack',1);S.save();drawHud();openPack(p,got)}});
async function openPack(p,got){
  const o=$('#packfx');o.classList.remove('hide');
  o.innerHTML=packArt(p,true)+'<p class="big tip">Clique pour ouvrir</p>';
  await new Promise(r=>$('#thePack').addEventListener('click',r,{once:true}));
  SND.play('pack');burst($('#thePack'),p.col,18);
  o.innerHTML=`<div class="pulled">${got.map((g,i)=>`<div class="fc" data-i="${i}"><div class="in"><div class="bk"></div><div class="ft">${cardHTML(g.id)}</div></div>
    <div class="tag">${g.dust?'Doublon : +'+g.dust+' pièces':g.isNew?'NOUVEAU':''}</div></div>`).join('')}</div><button class="btn green hide" id="packOk">Super</button>`;
  for(let i=0;i<got.length;i++){await sleep(450);const el=o.querySelector(`.fc[data-i="${i}"]`),r=C[got[i].id].r;el.classList.add('open','rr-'+r);
    SND.play('rev'+r);if(r==='L'||r==='E'){await sleep(300);burst(el,r==='L'?'#ffd23f':'#b388ff',r==='L'?20:10)}}
  await sleep(400);$('#packOk').classList.remove('hide');
  $('#packOk').addEventListener('click',()=>{o.classList.add('hide');show('shop')},{once:true});
}

/* ---------- decks : clique une carte pour l'ajouter, « Compléter » remplit le reste, ou un deck tout fait en un clic ---------- */
const sorted=ids=>ids.slice().sort((a,b)=>C[a].c-C[b].c||C[a].n.localeCompare(C[b].n));
const TCOL={fromage:'#ffd23f',sauce:'#e8443a',slip:'#58c48a',nuage:'#7fd4ff',pote:'#c77dff'};
const FILTERS=[['all','Tout',()=>true],['fromage','Fromage',id=>C[id].t==='fromage'&&C[id].k==='c'],['sauce','Sauce',id=>C[id].t==='sauce'&&C[id].k==='c'],['slip','Slip',id=>C[id].t==='slip'&&C[id].k==='c'],['nuage','Nuage',id=>C[id].t==='nuage'&&C[id].k==='c'],['pote','Potes',id=>C[id].t==='pote'&&C[id].k==='c'],['spell','Sorts',id=>C[id].k==='s'],['build','Bâtiments',id=>C[id].k==='b']];
const THEMES=[[null,'Équilibré','#fff6e0'],['fromage','Fromage',TCOL.fromage],['sauce','Sauce',TCOL.sauce],['slip','Slip',TCOL.slip],['nuage','Nuage',TCOL.nuage]];
let FIL='all',SHOWALL=false;
function drawColl(){
  const d=S.d,D=d.decks[d.active],cnt={};D.cards.forEach(id=>cnt[id]=(cnt[id]||0)+1);
  const own=IDS.filter(id=>d.col[id]).length,f=FILTERS.find(x=>x[0]===FIL)[2],n=D.cards.length;
  $('#collT').textContent='MES DECKS';
  $('#tabs').innerHTML=d.decks.map((k,i)=>`<button class="tab ${i===d.active?'on':''}" data-tab="${i}">${esc(k.name)}<i class="${k.cards.length===20?'ok':''}">${k.cards.length}</i></button>`).join('');
  $('#filters').innerHTML=FILTERS.map(x=>`<button class="chip ${x[0]===FIL?'on':''}" data-fil="${x[0]}">${TCOL[x[0]]?'<b style="background:'+TCOL[x[0]]+'"></b>':''}${x[1]}</button>`).join('');
  document.querySelectorAll('[data-all]').forEach(b=>b.classList.toggle('on',(b.dataset.all==='1')===SHOWALL));
  const ids=sorted(IDS.filter(id=>f(id)&&(SHOWALL||d.col[id])));
  $('#grid').innerHTML=ids.map(id=>{const have=d.col[id]||0,max=Math.min(have,RAR[C[id].r].max),inD=cnt[id]||0;
    return `<div class="gc ${have?'':'locked'} ${inD?'used':''} ${have&&inD>=max?'full':''}" data-add="${id}">${cardHTML(id)}
      ${have?`<div class="pips">${Array.from({length:max},(_,i)=>`<i class="${i<inD?'on':''}"></i>`).join('')}</div>`:`<div class="pips lk">${IC('lock')}</div>`}
      ${inD?`<button class="minus" data-rem="${id}" title="Enlever du deck">−</button>`:''}</div>`}).join('')||`<p class="dkempty">Aucune carte ici. ${SHOWALL?'':'Regarde dans « Toutes » ou dans la Boutique.'}</p>`;
  /* la colonne de droite : mon deck */
  if(document.activeElement!==$('#dname'))$('#dname').value=D.name;
  $('#dcount').innerHTML=`<b>${n}</b> / 20`;$('#dprog').style.width=n/20*100+'%';$('#dprog').classList.toggle('ok',n===20);
  $('#dstatus').className=n===20?'ok':'';$('#dstatus').innerHTML=n===20?IC('check')+' Prêt à jouer':n?`Il manque ${20-n} carte${20-n>1?'s':''}`:'Deck vide';
  $('#bFill').disabled=n===20;$('#bFill').textContent=n?'Compléter ('+(20-n)+')':'Remplir tout seul';
  $('#themes').innerHTML=THEMES.map(t=>`<button class="chip" data-theme="${t[0]||''}"><b style="background:${t[2]}"></b>${t[1]}</button>`).join('');
  const cv=[0,0,0,0,0,0];D.cards.forEach(id=>cv[Math.min(6,Math.max(1,C[id].c))-1]++);const mx=Math.max(1,...cv);
  $('#curve').innerHTML=cv.map((v,i)=>`<div class="cb"><span>${v||''}</span><i style="height:${v/mx*100}%"></i><b>${i===5?'6+':i+1}</b></div>`).join('');
  const ty=k=>D.cards.filter(id=>C[id].k===k).length;
  $('#dtypes').textContent=`${ty('c')} créature${ty('c')>1?'s':''} · ${ty('s')} sort${ty('s')>1?'s':''} · ${ty('b')} bâtiment${ty('b')>1?'s':''}`;
  $('#dlist').innerHTML=sorted([...new Set(D.cards)]).map(id=>{const p=window.PORT&&PORT[id];
    return `<div class="dr" data-rem="${id}" data-peek="${id}" style="--rc:${TCOL[C[id].t]||(C[id].k==='s'?'#b388ff':'#e3c594')}"><span class="dc">${C[id].c}</span>${p?'<img src="'+p+'" alt="">':'<i class="noimg"></i>'}<em>${C[id].n}</em><b>${cnt[id]>1?'×'+cnt[id]:''}</b></div>`}).join('')||'<p class="dkempty">Clique des cartes à gauche,<br>ou appuie sur « Remplir tout seul ».</p>';
}
$('#coll').addEventListener('click',e=>{const d=S.d,D=d.decks[d.active];let el;
  if(el=e.target.closest('[data-fil]')){FIL=el.dataset.fil;return drawColl()}
  if(el=e.target.closest('[data-all]')){SHOWALL=el.dataset.all==='1';return drawColl()}
  if(el=e.target.closest('[data-tab]')){d.active=+el.dataset.tab}
  else if(e.target.closest('#bFill')){D.cards=S.autoDeck({keep:D.cards});SND.play('quest');toast('Deck complété avec tes meilleures cartes.')}
  else if(e.target.closest('#bClear')){D.cards=[]}
  else if(el=e.target.closest('[data-theme]')){D.cards=S.autoDeck({t:el.dataset.theme||null});SND.play('quest');toast('Deck '+el.textContent.trim()+' prêt.')}
  else if(el=e.target.closest('[data-rem]')){const i=D.cards.indexOf(el.dataset.rem);if(i<0)return;D.cards.splice(i,1);SND.play('click')}
  else if(el=e.target.closest('[data-add]')){const id=el.dataset.add,n=d.col[id]||0,have=D.cards.filter(x=>x===id).length;
    if(!n)return toast('Tu n\'as pas encore cette carte. Regarde dans la Boutique.');
    if(have>=Math.min(n,RAR[C[id].r].max)){const i=D.cards.indexOf(id);D.cards.splice(i,1);SND.play('click')}
    else if(D.cards.length>=20)return toast('Deck plein (20 cartes). Enlève-en une d\'abord.');
    else{D.cards.push(id);SND.play('card')}}
  else return;
  S.save();drawColl()});
$('#coll').addEventListener('contextmenu',e=>{const el=e.target.closest('[data-add]');if(!el)return;e.preventDefault();const D=S.d.decks[S.d.active],i=D.cards.indexOf(el.dataset.add);if(i>=0){D.cards.splice(i,1);SND.play('click');S.save();drawColl()}});
$('#dname').addEventListener('input',e=>{S.d.decks[S.d.active].name=esc(e.target.value)||'Deck';S.save();const t=$('#tabs .tab.on');if(t)t.firstChild.textContent=S.d.decks[S.d.active].name});
/* aperçu en grand quand on survole une ligne du deck */
$('#dlist').addEventListener('mouseover',e=>{const el=e.target.closest('[data-peek]');if(!el)return;const p=$('#peek');p.innerHTML=cardHTML(el.dataset.peek);p.classList.remove('hide');const r=el.getBoundingClientRect();p.style.top=Math.max(110,Math.min(innerHeight-300,r.top-110))+'px'});
$('#dlist').addEventListener('mouseleave',()=>$('#peek').classList.add('hide'));

/* ---------- casier : avatar, dos de carte, halo, table, titre + la route des niveaux ---------- */
function drawLocker(){const d=S.d,hex=c=>'#'+c.toString(16).padStart(6,'0');
  const how=(t,id)=>{for(const l in LEVELS)for(const u of [LEVELS[l].u,LEVELS[l].u2])if(u&&u[0]===t&&u[1]===id)return'Niv. '+l;const i=STORY.findIndex(c=>c.r[t]===id);return i>=0?'Histoire '+(i+1):''};
  const sec=(title,t,list,draw,cur)=>`<div class="lsec"><div class="label">${title}</div><div class="lrow">${list.map(id=>{const own=d.own[t].includes(id);
    return `<button class="litem ${own?'':'lock'} ${cur===id?'on':''}" data-t="${t}" data-id="${id}">${draw(id)}${own?'':`<em>${IC('lock')}${how(t,id)}</em>`}</button>`}).join('')}</div></div>`;
  $('#lockerBody').innerHTML=
    sec('Avatar','avatar',AVATARS,id=>`<span class="face">${faceHTML(id)}</span>`,d.avatar)
    +sec('Table de jeu','table',Object.keys(TABLES),id=>`<span class="ltable" style="--m:${TABLES[id].mat};--l:${TABLES[id].line}"></span><span>${TABLES[id].n}</span>`,d.use.table)
    +sec('Dos de carte','back',Object.keys(BACKS),id=>`<span class="lback" style="background:repeating-linear-gradient(45deg,${BACKS[id].a} 0 7px,${BACKS[id].b} 7px 14px)"></span><span>${BACKS[id].n}</span>`,d.use.back)
    +sec('Halo de tes hologrammes','halo',Object.keys(HALOS),id=>`<span class="lhalo" style="--h:${hex(HALOS[id].c)}"></span><span>${HALOS[id].n}</span>`,d.use.halo)
    +sec('Titre','title',TITLES,id=>`<span class="ltitle">${id}</span>`,d.use.title)
    +`<div class="lsec"><div class="label">Route des niveaux</div><div class="track">${Object.keys(LEVELS).map(l=>`<div class="tk ${d.lvl>=l?'got':''}"><b>${l}</b><span>${rewardTxt(LEVELS[l])}</span></div>`).join('')}</div></div>`}
$('#lockerBody').addEventListener('click',e=>{const b=e.target.closest('.litem');if(!b)return;const t=b.dataset.t,id=b.dataset.id;
  if(!S.d.own[t].includes(id)){SND.play('error');return toast('Pas encore débloqué.')}
  if(t==='avatar')S.d.avatar=id;else S.d.use[t]=id;S.save();applyLook();if(t==='table'&&V.showcase)V.showcase();drawHud();drawLocker()});

/* ---------- en ligne ---------- */
let NETBIG=false;
document.querySelector('.tog').addEventListener('click',e=>{const b=e.target.closest('[data-big]');if(!b)return;NETBIG=b.dataset.big==='1';document.querySelectorAll('.tog .chip').forEach(c=>c.classList.toggle('on',c===b))});
const lobbyMsg=t=>$('#lmsg').textContent=t;
const cleanDeck=d=>Array.isArray(d)&&d.length===20&&d.every(id=>typeof id==='string'&&C[id])?d:null;
const cleanAct=a=>!a?null:a.t==='end'||a.t==='power'||a.t==='rage'?{t:a.t}:a.t==='choice'?{t:'choice',v:a.v==='nrj'?'nrj':'cards'}:
  a.t==='play'&&Number.isInteger(a.i)&&a.i>=0&&a.i<8&&Number.isInteger(a.l)&&a.l>=0&&a.l<6?{t:'play',i:a.i,l:a.l,q:a.q===0||a.q===2?a.q:1}:null;
function goNet(me,seed,mine,their,them,big){
  NET.onData=d=>{if(d&&d.t==='mg')return MG.remote(d);const a=cleanAct(d);if(a)remote(a)};
  NET.onClose=()=>{if(G&&!G.over)finish(ME,'Ton pote a quitté la partie. Victoire par abandon.')};
  const o=me==='p'?'e':'p',ti=TITLES.includes(them.title)?them.title:'';
  $('#hud').classList.add('hide');
  newGame({mode:'net',me,seed,big:!!big,decks:{[me]:mine,[o]:their},names:{[me]:S.d.name,[o]:esc(them.name)},faces:{[me]:S.d.avatar,[o]:AVATARS.includes(them.avatar)?them.avatar:'poulet'},titles:{[me]:S.d.use.title,[o]:ti}})}
const netErr=e=>lobbyMsg(e&&e.type==='peer-unavailable'?'Code introuvable. Vérifie avec ton pote.':e&&e.type==='unavailable-id'?'Ce code est déjà pris, réessaie.':'Connexion impossible. Vérifie ton internet.');
$('#bHost').addEventListener('click',()=>{const d=myDeck();if(!d)return;
  const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');
  $('#code').textContent='…';lobbyMsg('Création de la partie…');
  NET.onClose=()=>{};
  NET.onData=m=>{if(!m||m.t!=='hello')return;const their=cleanDeck(m.deck);if(!their)return lobbyMsg('Le deck de ton pote est invalide (il vous faut la même version du jeu).');
    const seed=Math.random()*1e9|0;NET.send({t:'start',seed,big:NETBIG,name:S.d.name,avatar:S.d.avatar,title:S.d.use.title,deck:d});goNet('p',seed,d,their,m,NETBIG)};
  NET.host(code,()=>{$('#code').textContent=code;lobbyMsg('Donne ce code à ton pote. En attente…')},netErr)});
$('#bJoin').addEventListener('click',()=>{const d=myDeck();if(!d)return;
  const code=$('#jcode').value.toUpperCase().replace(/[^A-Z]/g,'');if(code.length!==4)return lobbyMsg('Le code fait 4 lettres.');
  lobbyMsg('Connexion…');NET.onClose=()=>lobbyMsg('Connexion perdue.');
  NET.onData=m=>{if(!m||m.t!=='start')return;const their=cleanDeck(m.deck);if(!their)return lobbyMsg('Deck invalide (il vous faut la même version du jeu).');goNet('e',m.seed|0,d,their,m,!!m.big)};
  NET.join(code,()=>{lobbyMsg('Connecté ! Lancement…');NET.send({t:'hello',name:S.d.name,avatar:S.d.avatar,title:S.d.use.title,deck:d})},netErr)});

/* ---------- mise à jour automatique (seulement dans le jeu installé : window.BDC vient de preload.js) ---------- */
function updReady(v){const el=$('#ver');el.textContent='';const b=document.createElement('button');b.className='btn sm green';b.textContent='Mise à jour prête : relancer le jeu';b.addEventListener('click',()=>BDC.relaunch());el.appendChild(b);toast('Mise à jour '+v+' téléchargée.')}
if(window.BDC){BDC.info().then(i=>{$('#ver').textContent='Version '+i.version;if(i.ready)updReady(i.ready)});
  BDC.onUpdate((what,d)=>{if(what==='progress'&&!$('#ver button'))$('#ver').textContent='Téléchargement de la mise à jour… '+d+' %';if(what==='ready')updReady(d)})}

show('menu');
