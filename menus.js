/* Menus : accueil + quêtes, choix de la table, histoire, boutique, collection + decks, casier, salon en ligne. */
S.load();PROG.roll();
document.querySelectorAll('[data-ic]').forEach(e=>{e.insertAdjacentHTML('afterbegin',IC(e.dataset.ic))});
const esc=t=>String(t==null?'':t).replace(/[<>&"']/g,'').slice(0,16)||'Pote';
let CUR='menu';
function applyLook(){if(typeof V!=='undefined'&&V.setLook)V.setLook({halo:HALOS[S.d.use.halo].c,back:BACKS[S.d.use.back],table:TABLES[S.d.use.table],perso:{body:S.d.use.body,hat:S.d.use.hat,face:S.d.avatar}})}
function show(id){CUR=id;document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('hide',x.id!==id));$('#app').classList.add('hide');$('#modes').classList.add('hide');$('#hud').classList.remove('hide');
  applyLook();if(typeof V!=='undefined'&&V.showcase)V.showcase();SND.music('menu');
  drawHud();if(id==='friends')drawFriends();if(id==='lobby2')drawL2();if(id==='menu')drawMenu();if(id==='shop')drawShop();if(id==='coll'){EDIT=false;const D=S.d.decks[S.d.active];if(D.auto&&PRE[D.auto]){D.cards=S.autoDeck(PRE[D.auto].o);S.save()}drawColl()}if(id==='locker')drawLocker();if(id==='story')drawStory()}
function toast(t){const b=$('#toast');b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function levelUps(up){up.forEach((u,i)=>setTimeout(()=>toast('Niveau '+u.lvl+' ! '+u.txt),i*2700))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){if(/^(menu|lobby|lobby2)$/.test(b.dataset.go)){NET.stop();l2Reset()}show(b.dataset.go)}});
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
/* mon deck pour jouer : un deck automatique est refait avec mes cartes du moment, un deck incomplet est complété tout seul */
function myDeck(){const D=S.d.decks[S.d.active];
  if(D.auto&&PRE[D.auto]){D.cards=S.autoDeck(PRE[D.auto].o);S.save()}
  else if(!S.deckOk(D.cards)){D.cards=S.autoDeck({keep:D.cards});S.save();if(S.deckOk(D.cards))toast('Ton deck a été complété tout seul.')}
  if(S.deckOk(D.cards))return D.cards.slice();toast('Il te manque des cartes pour faire un deck de 20. Passe à la Boutique.');return null}
/* les adversaires du mode libre : chacun a son terrain préféré */
/* la tenue du perso : la mienne, celle reçue d'un autre joueur (vérifiée), ou une au hasard pour un robot */
const cleanLook=m=>({body:m&&BODIES[m.body]?m.body:'bleu',hat:m&&HATS[m.hat]?m.hat:'aucun'});
const myLook=()=>({body:S.d.use.body,hat:S.d.use.hat});
const rndLook=()=>{const b=Object.keys(BODIES),h=Object.keys(HATS);return{body:b[Math.random()*b.length|0],hat:h[Math.random()*h.length|0]}};
const OPPS=[{n:'Roi Chaussette',f:'chaussette',t:null,ti:'Roi du panier à linge'},{n:'Mamie Fondue',f:'fondue',t:'fromage',ti:'Reine du fromage'},{n:'Chef Piment',f:'piment',t:'sauce',ti:'Ça pique'},{n:'Capitaine Slip',f:'grenouille',t:'slip',ti:'Héros du marais'},{n:'Miss Nuage',f:'licorne',t:'nuage',ti:'La tête en l\'air'}];
function oppDeck(t){if(!t)return randomDeck();const base=randomDeck(),mine=IDS.filter(id=>C[id].t===t&&C[id].r!=='L');
  return base.map((id,i)=>i%2?mine[Math.random()*mine.length|0]:id).filter((id,i,a)=>a.slice(0,i).filter(x=>x===id).length<RAR[C[id].r].max).concat(randomDeck()).slice(0,20)}
/* le pari : une mise en pièces sur ta victoire (doublée si tu gagnes, perdue sinon) */
let BET=0;
function drawBet(){document.querySelectorAll('[data-bet]').forEach(b=>{const v=+b.dataset.bet;b.classList.toggle('on',v===BET);b.disabled=v>S.d.coins})}
document.querySelector('.bets').addEventListener('click',e=>{const b=e.target.closest('[data-bet]');if(!b||b.disabled)return;BET=+b.dataset.bet;drawBet()});
function startSolo(o){const d=myDeck();if(!d)return;$('#modes').classList.add('hide');$('#hud').classList.add('hide');
  newGame(Object.assign({mode:'solo',me:'p',seed:Math.random()*1e9|0,decks:{p:d,e:o.deck},names:{p:S.d.name,e:o.n},faces:{p:S.d.avatar,e:o.f},titles:{p:S.d.use.title,e:o.ti},looks:{p:myLook(),e:rndLook()}},o.opt))}
$('#bPlay').addEventListener('click',()=>{drawMenu();if(BET>S.d.coins)BET=0;drawBet();$('#modes').classList.remove('hide')});
$('#bModesX').addEventListener('click',()=>$('#modes').classList.add('hide'));
$('#modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;const m=b.dataset.mode;
  if(m==='story')return show('story');if(m==='two')return startSolo2();const o=OPPS[Math.random()*OPPS.length|0];startSolo({n:o.n,f:o.f,ti:o.ti,deck:oppDeck(o.t),opt:{big:m==='big',bet:Math.min(BET,S.d.coins)}})});

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

/* ---------- decks : par défaut, des decks tout faits ; « Modifier carte par carte » ouvre l'éditeur ---------- */
const sorted=ids=>ids.slice().sort((a,b)=>C[a].c-C[b].c||C[a].n.localeCompare(C[b].n));
const TCOL={fromage:'#ffd23f',sauce:'#e8443a',slip:'#58c48a',nuage:'#7fd4ff',pote:'#c77dff'};
const FILTERS=[['all','Tout',()=>true],['fromage','Fromage',id=>C[id].t==='fromage'&&C[id].k==='c'],['sauce','Sauce',id=>C[id].t==='sauce'&&C[id].k==='c'],['slip','Slip',id=>C[id].t==='slip'&&C[id].k==='c'],['nuage','Nuage',id=>C[id].t==='nuage'&&C[id].k==='c'],['pote','Potes',id=>C[id].t==='pote'&&C[id].k==='c'],['spell','Sorts',id=>C[id].k==='s'],['build','Bâtiments',id=>C[id].k==='b']];
/* les decks tout faits : o = réglages donnés à S.autoDeck */
const PRE={best:{n:'Le meilleur',x:'Tes cartes les plus fortes. Le bon choix si tu hésites.',c:'#fff6e0',o:{}},
  rush:{n:'Rapide',x:'Des cartes pas chères pour taper dès le début.',c:'#ff9f1c',o:{style:'rush'}},
  gros:{n:'Costaud',x:'Des grosses créatures pour écraser la fin de partie.',c:'#9b5de5',o:{style:'gros'}},
  fromage:{n:'Fromage',x:'Ça soigne et ça encaisse.',c:TCOL.fromage,o:{t:'fromage'}},
  sauce:{n:'Sauce',x:'Ça pique et ça explose.',c:TCOL.sauce,o:{t:'sauce'}},
  slip:{n:'Slip',x:'Poison, épines et coups tordus.',c:TCOL.slip,o:{t:'slip'}},
  nuage:{n:'Nuage',x:'Ça vole par-dessus les défenses.',c:TCOL.nuage,o:{t:'nuage'}}};
let FIL='all',SHOWALL=false,EDIT=false;
const RW={L:4,E:3,R:2,C:1};
function drawColl(){
  const d=S.d,D=d.decks[d.active],cnt={};D.cards.forEach(id=>cnt[id]=(cnt[id]||0)+1);const n=D.cards.length;
  $('#coll').classList.toggle('edit',EDIT);
  $('#tabs').innerHTML=d.decks.map((k,i)=>`<button class="tab ${i===d.active?'on':''}" data-tab="${i}">${esc(k.name)}<i class="${k.cards.length===20?'ok':''}">${k.cards.length}</i></button>`).join('');
  if(!EDIT){
    /* une grosse tuile par deck tout fait, avec ses 4 plus belles créatures */
    $('#presets').innerHTML=Object.keys(PRE).map(k=>{const p=PRE[k],cards=S.autoDeck(p.o),stars=[...new Set(cards)].filter(id=>C[id].k==='c').sort((a,b)=>RW[C[b].r]-RW[C[a].r]||C[b].c-C[a].c).slice(0,4);
      return `<button class="pre ${D.auto===k?'on':''}" data-pre="${k}" style="--pc:${p.c}" ${cards.length<20?'disabled':''}><b>${p.n}</b><small>${cards.length<20?'Pas encore assez de cartes.':p.x}</small>
        <span class="prefaces">${stars.map(id=>window.PORT&&PORT[id]?'<img src="'+PORT[id]+'" alt="">':'').join('')}</span>${D.auto===k?'<em>'+IC('check')+' Choisi</em>':''}</button>`}).join('');
  }else{
    const f=FILTERS.find(x=>x[0]===FIL)[2];
    $('#filters').innerHTML=FILTERS.map(x=>`<button class="chip ${x[0]===FIL?'on':''}" data-fil="${x[0]}">${TCOL[x[0]]?'<b style="background:'+TCOL[x[0]]+'"></b>':''}${x[1]}</button>`).join('');
    document.querySelectorAll('[data-all]').forEach(b=>b.classList.toggle('on',(b.dataset.all==='1')===SHOWALL));
    const ids=sorted(IDS.filter(id=>f(id)&&(SHOWALL||d.col[id])));
    $('#grid').innerHTML=ids.map(id=>{const have=d.col[id]||0,max=Math.min(have,RAR[C[id].r].max),inD=cnt[id]||0;
      return `<div class="gc ${have?'':'locked'} ${inD?'used':''} ${have&&inD>=max?'full':''}" data-add="${id}">${cardHTML(id)}
        ${have?`<div class="pips">${Array.from({length:max},(_,i)=>`<i class="${i<inD?'on':''}"></i>`).join('')}</div>`:`<div class="pips lk">${IC('lock')}</div>`}
        ${inD?`<button class="minus" data-rem="${id}" title="Enlever du deck">−</button>`:''}</div>`}).join('')||`<p class="dkempty">Aucune carte ici. ${SHOWALL?'':'Regarde dans « Toutes » ou dans la Boutique.'}</p>`;
    $('#bFill').disabled=n===20;$('#bFill').textContent=n?'Compléter ('+(20-n)+')':'Remplir tout seul';
  }
  /* la colonne de droite : mon deck */
  if(document.activeElement!==$('#dname'))$('#dname').value=D.name;
  $('#dcount').innerHTML=`<b>${n}</b> / 20`;$('#dprog').style.width=n/20*100+'%';$('#dprog').classList.toggle('ok',n===20);
  $('#dstatus').className=n===20?'ok':'';$('#dstatus').innerHTML=n===20?IC('check')+(D.auto&&PRE[D.auto]?' Prêt à jouer · deck automatique « '+PRE[D.auto].n+' »':' Prêt à jouer'):n?`Il manque ${20-n} carte${20-n>1?'s':''} (complété tout seul si tu joues)`:'Deck vide : choisis-en un à gauche';
  const ty=k=>D.cards.filter(id=>C[id].k===k).length;
  $('#dtypes').textContent=`${ty('c')} créature${ty('c')>1?'s':''} · ${ty('s')} sort${ty('s')>1?'s':''} · ${ty('b')} bâtiment${ty('b')>1?'s':''}`;
  $('#dlist').innerHTML=sorted([...new Set(D.cards)]).map(id=>{const p=window.PORT&&PORT[id];
    return `<div class="dr" ${EDIT?'data-rem="'+id+'"':''} data-peek="${id}" style="--rc:${TCOL[C[id].t]||(C[id].k==='s'?'#b388ff':'#e3c594')}"><span class="dc">${C[id].c}</span>${p?'<img src="'+p+'" alt="">':'<i class="noimg"></i>'}<em>${C[id].n}</em><b>${cnt[id]>1?'×'+cnt[id]:''}</b></div>`}).join('')||'<p class="dkempty">Aucune carte pour l\'instant.</p>';
}
$('#coll').addEventListener('click',e=>{const d=S.d,D=d.decks[d.active];let el;
  if(el=e.target.closest('[data-fil]')){FIL=el.dataset.fil;return drawColl()}
  if(el=e.target.closest('[data-all]')){SHOWALL=el.dataset.all==='1';return drawColl()}
  if(e.target.closest('#bEdit')){EDIT=true;return drawColl()}
  if(e.target.closest('#bEasy')){EDIT=false;return drawColl()}
  if(el=e.target.closest('[data-tab]')){d.active=+el.dataset.tab}
  else if(el=e.target.closest('[data-pre]')){const k=el.dataset.pre;if(el.disabled||!PRE[k])return;D.auto=k;D.cards=S.autoDeck(PRE[k].o);SND.play('quest');toast('Deck « '+PRE[k].n+' » prêt.')}
  else if(e.target.closest('#bFill')){D.auto=null;D.cards=S.autoDeck({keep:D.cards});SND.play('quest');toast('Deck complété avec tes meilleures cartes.')}
  else if(e.target.closest('#bClear')){D.auto=null;D.cards=[]}
  else if(el=e.target.closest('[data-rem]')){const i=D.cards.indexOf(el.dataset.rem);if(i<0)return;D.auto=null;D.cards.splice(i,1);SND.play('click')}
  else if(el=e.target.closest('[data-add]')){const id=el.dataset.add,n=d.col[id]||0,have=D.cards.filter(x=>x===id).length;
    if(!n)return toast('Tu n\'as pas encore cette carte. Regarde dans la Boutique.');
    if(have>=Math.min(n,RAR[C[id].r].max)){const i=D.cards.indexOf(id);D.cards.splice(i,1);SND.play('click')}
    else if(D.cards.length>=20)return toast('Deck plein (20 cartes). Enlève-en une d\'abord.');
    else{D.cards.push(id);SND.play('card')}
    D.auto=null}
  else return;
  S.save();drawColl()});
$('#coll').addEventListener('contextmenu',e=>{const el=e.target.closest('[data-add]');if(!el)return;e.preventDefault();const D=S.d.decks[S.d.active],i=D.cards.indexOf(el.dataset.add);if(i>=0){D.auto=null;D.cards.splice(i,1);SND.play('click');S.save();drawColl()}});
$('#dname').addEventListener('input',e=>{S.d.decks[S.d.active].name=esc(e.target.value)||'Deck';S.save();const t=$('#tabs .tab.on');if(t)t.firstChild.textContent=S.d.decks[S.d.active].name});
/* aperçu en grand quand on survole une ligne du deck */
$('#dlist').addEventListener('mouseover',e=>{const el=e.target.closest('[data-peek]');if(!el)return;const p=$('#peek');p.innerHTML=cardHTML(el.dataset.peek);p.classList.remove('hide');const r=el.getBoundingClientRect();p.style.top=Math.max(110,Math.min(innerHeight-300,r.top-110))+'px'});
$('#dlist').addEventListener('mouseleave',()=>$('#peek').classList.add('hide'));

/* ---------- casier : avatar, dos de carte, halo, table, titre + la route des niveaux ---------- */
const LSNAP={};const lsnap=id=>{if(LSNAP[id]===undefined){LSNAP[id]='';try{if(window.BB&&BB[id])LSNAP[id]=M.snap(id,160)}catch(e){}}return LSNAP[id]?'<img class="lsnap" src="'+LSNAP[id]+'" alt="">':'<span class="lsnap"></span>'};
function drawLocker(){const d=S.d,hex=c=>'#'+c.toString(16).padStart(6,'0');
  const how=(t,id)=>{for(const l in LEVELS)for(const u of [LEVELS[l].u,LEVELS[l].u2])if(u&&u[0]===t&&u[1]===id)return'Niv. '+l;const i=STORY.findIndex(c=>c.r[t]===id);return i>=0?'Histoire '+(i+1):''};
  const sec=(title,t,list,draw,cur)=>`<div class="lsec"><div class="label">${title}</div><div class="lrow">${list.map(id=>{const own=d.own[t].includes(id);
    return `<button class="litem ${own?'':'lock'} ${cur===id?'on':''}" data-t="${t}" data-id="${id}">${draw(id)}${own?'':`<em>${IC('lock')}${how(t,id)}</em>`}</button>`}).join('')}</div></div>`;
  $('#lockerBody').innerHTML=
    sec('Avatar','avatar',AVATARS,id=>`<span class="face">${faceHTML(id)}</span>`,d.avatar)
    +sec('Sweat du perso','body',Object.keys(BODIES),id=>lsnap('perso_'+id)+`<span>${BODIES[id].n}</span>`,d.use.body)
    +sec('Chapeau du perso','hat',Object.keys(HATS),id=>lsnap('hat_'+id)+`<span>${HATS[id].n}</span>`,d.use.hat)
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
  newGame({mode:'net',me,seed,big:!!big,decks:{[me]:mine,[o]:their},names:{[me]:S.d.name,[o]:esc(them.name)},faces:{[me]:S.d.avatar,[o]:AVATARS.includes(them.avatar)?them.avatar:'poulet'},titles:{[me]:S.d.use.title,[o]:ti},looks:{[me]:myLook(),[o]:cleanLook(them)}})}
const netErr=e=>lobbyMsg(e&&e.type==='peer-unavailable'?'Code introuvable. Vérifie avec ton pote.':e&&e.type==='unavailable-id'?'Ce code est déjà pris, réessaie.':'Connexion impossible. Vérifie ton internet.');
const rnd4=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');
const errText=e=>e&&e.type==='peer-unavailable'?'Code introuvable. Vérifie avec ton pote.':e&&e.type==='unavailable-id'?'Ce code est déjà pris, réessaie.':'Connexion impossible. Vérifie ton internet.';
const myCard=()=>({name:S.d.name,avatar:S.d.avatar,title:S.d.use.title,fc:S.d.fcode,body:S.d.use.body,hat:S.d.use.hat});
/* duel : je crée la partie (cb reçoit le code, pour l'envoyer à un ami) ou je rejoins avec un code */
function hostDuel(cb){const d=myDeck();if(!d)return;const code=rnd4();
  $('#code').textContent='…';lobbyMsg('Création de la partie…');
  NET.onClose=()=>{};
  NET.onData=m=>{if(!m||m.t!=='hello')return;const their=cleanDeck(m.deck);if(!their)return lobbyMsg('Le deck de ton pote est invalide (il vous faut la même version du jeu).');
    const seed=Math.random()*1e9|0;NET.send(Object.assign({t:'start',seed,big:NETBIG,deck:d},myCard()));goNet('p',seed,d,their,m,NETBIG)};
  NET.host(code,()=>{$('#code').textContent=code;lobbyMsg('Donne ce code à ton pote. En attente…');cb&&cb(code)},netErr)}
function joinDuel(code){const d=myDeck();if(!d)return;
  lobbyMsg('Connexion…');NET.onClose=()=>lobbyMsg('Connexion perdue.');
  NET.onData=m=>{if(!m)return;if(m.t==='full')return lobbyMsg('Cette partie est déjà pleine.');if(m.t!=='start')return;const their=cleanDeck(m.deck);if(!their)return lobbyMsg('Deck invalide (il vous faut la même version du jeu).');goNet('e',m.seed|0,d,their,m,!!m.big)};
  NET.join(code,()=>{lobbyMsg('Connecté ! Lancement…');NET.send(Object.assign({t:'hello',deck:d},myCard()))},netErr)}
$('#bHost').addEventListener('click',()=>hostDuel());
$('#bJoin').addEventListener('click',()=>{const code=$('#jcode').value.toUpperCase().replace(/[^A-Z]/g,'');if(code.length!==4)return lobbyMsg('Le code fait 4 lettres.');joinDuel(code)});

/* ---------- 2 contre 2 ----------
   4 places autour de la table : 0 et 2 font équipe (côté p), 1 et 3 aussi (côté e). L'ordre des tours est 0, 1, 2, 3. */
const botSeats=()=>OPPS.slice().sort(()=>Math.random()-.5).map(o=>Object.assign({name:o.n,avatar:o.f,title:o.ti,deck:oppDeck(o.t),ai:true},rndLook()));
const seatDefs=x=>{const d=g=>({deck:x[g].deck,name:x[g].name,face:x[g].avatar,title:x[g].title,look:cleanLook(x[g]),ai:!!x[g].ai,g});return{p:[d(0),d(2)],e:[d(1),d(3)]}};
const cleanSeat=m=>{const deck=cleanDeck(m&&m.deck);return deck?{name:esc(m.name),avatar:AVATARS.includes(m.avatar)?m.avatar:'poulet',title:TITLES.includes(m.title)?m.title:'',deck,ai:!!m.ai,fc:FR.clean(m.fc),body:cleanLook(m).body,hat:cleanLook(m).hat}:null};
/* tout seul : moi + un robot contre deux robots */
function startSolo2(){const d=myDeck();if(!d)return;$('#modes').classList.add('hide');$('#hud').classList.add('hide');const b=botSeats();
  newGame({mode:'solo',me:'p',seat:0,seed:Math.random()*1e9|0,big:true,seats:seatDefs([Object.assign({deck:d},myCard()),b[0],b[1],b[2]])})}
const L2={host:false,code:'',slots:[null,null,null,null],you:0};
const l2Msg=t=>$('#l2msg').textContent=t;
function l2Reset(){L2.host=false;L2.code='';L2.slots=[null,null,null,null];L2.you=0}
function drawL2(){const inRoom=!!L2.code;$('#l2start').classList.toggle('hide',inRoom);$('#l2room').classList.toggle('hide',!inRoom);if(!inRoom)return;
  $('#code2').textContent=L2.code;
  const row=g=>{const x=L2.slots[g];return `<div class="l2seat ${x?'':'bot'} ${g===L2.you?'me':''}"><span class="face">${x?faceHTML(x.avatar):''}</span><div><b>${x?x.name:'Robot'}</b><small>${x?(g===L2.you?'Toi':x.title||'Joueur'):'place libre'}</small></div></div>`};
  $('#l2teams').innerHTML=`<div class="l2team"><div class="label">Équipe 1</div>${row(0)}${row(2)}</div><i class="l2vs">VS</i><div class="l2team"><div class="label">Équipe 2</div>${row(1)}${row(3)}</div>`;
  $('#l2acts').classList.toggle('hide',!L2.host);
  const on=S.d.friends.filter(f=>FR.online(f.code)&&!L2.slots.some(x=>x&&x.fc===f.code));
  $('#l2friends').innerHTML=!L2.host?'<p class="small">C\'est le créateur de la table qui invite et qui lance.</p>':
    on.map(f=>`<div class="fr on"><span class="face">${faceHTML(f.avatar)}</span><div class="frn"><b>${f.name}</b></div><button class="btn sm yellow" data-inv2="${f.code}">Inviter</button></div>`).join('')||'<p class="small">Aucun ami en ligne pour l\'instant. Tu peux aussi donner le code de la table.</p>'}
function l2Roster(){const pub=L2.slots.map(x=>x&&{name:x.name,avatar:x.avatar,title:x.title});NET.conns.forEach(c=>NET.to(c,{t:'roster',slots:pub,you:c.g}));if(CUR==='lobby2')drawL2()}
function host2(cb){const d=myDeck();if(!d)return;if(L2.host&&L2.code){cb&&cb(L2.code);return}
  const code=rnd4();L2.host=true;L2.you=0;L2.code='';L2.slots=[Object.assign({deck:d},myCard()),null,null,null];l2Msg('Création de la table…');
  NET.onClose=c=>{if(c.g){L2.slots[c.g]=null;l2Roster()}};
  NET.onData=(m,c)=>{if(!m||m.t!=='hello'||c.g)return;const x=cleanSeat(m);if(!x)return NET.to(c,{t:'bad'});
    const g=[2,1,3].find(i=>!L2.slots[i]);if(!g)return;x.ai=false;x.conn=c;c.g=g;L2.slots[g]=x;SND.play('quest');l2Roster()};
  NET.host(code,()=>{L2.code=code;l2Msg('Donne le code à tes potes ou invite tes amis. Les places vides seront des robots.');drawL2();cb&&cb(code)},e=>{l2Reset();drawL2();l2Msg(errText(e))},3)}
function join2(code){const d=myDeck();if(!d)return;l2Reset();drawL2();l2Msg('Connexion…');let why='La table a été fermée.';
  NET.onClose=()=>{l2Reset();if(CUR==='lobby2')drawL2();l2Msg(why)};
  NET.onData=m=>{if(!m)return;
    if(m.t==='full'){why='Cette table est pleine ou la partie a déjà commencé.';return}
    if(m.t==='bad'){why='Deck invalide (il faut la même version du jeu pour tous).';return}
    if(m.t==='roster'&&Array.isArray(m.slots)){L2.code=code;L2.you=m.you|0;L2.slots=[0,1,2,3].map(i=>{const x=m.slots[i];return x?{name:esc(x.name),avatar:AVATARS.includes(x.avatar)?x.avatar:'poulet',title:TITLES.includes(x.title)?x.title:''}:null});
      l2Msg('Tu es à la table. Le créateur lance la partie quand tout le monde est là.');drawL2();return}
    if(m.t==='start2'){if(!Array.isArray(m.seats)||m.seats.length!==4)return;const seats=m.seats.map(cleanSeat),g=m.you|0;if(seats.some(x=>!x)||g<1||g>3)return l2Msg('Partie invalide (il faut la même version du jeu pour tous).');goNet2(g,m.seed|0,seats,false)}};
  NET.join(code,()=>NET.send(Object.assign({t:'hello',deck:d},myCard())),e=>l2Msg(errText(e)))}
function goNet2(g,seed,seats,host){
  if(host)NET.max=0;
  NET.onData=(d,c)=>{if(!d)return;if(!host&&d.t==='left')return toast(esc(d.name)+' est parti : un robot le remplace.');
    const a=cleanAct(d);if(!a)return;
    /* l'hôte sait qui parle (la connexion), il colle le bon numéro et fait suivre aux autres */
    if(host){if(!c||!c.g)return;a.g=c.g;NET.send(a,c)}else{const k=d.g|0;if(k<0||k>3||k===g)return;a.g=k}
    remote(a)};
  NET.onClose=c=>{if(!G||G.over)return;if(!host)return finish(ME,'Le créateur de la table est parti. La partie s\'arrête là.');
    const s=c.g%2?'e':'p',k=c.g>>1,st=G[s].seats[k];if(!st||st.ai)return;st.ai=true;toast(st.name+' est parti : un robot le remplace.');NET.send({t:'left',name:st.name});
    Q=Q.then(()=>{if(G&&!G.over&&G.active===s&&G[s].cur===k&&(G.phase==='choice'||G.phase==='main'))aiTurn(s)})};
  $('#hud').classList.add('hide');l2Reset();
  newGame({mode:'net',host,me:g%2?'e':'p',seat:g>>1,seed,big:true,seats:seatDefs(seats)})}
$('#b2Host').addEventListener('click',()=>host2());
$('#b2Join').addEventListener('click',()=>{const code=$('#j2code').value.toUpperCase().replace(/[^A-Z]/g,'');if(code.length!==4)return l2Msg('Le code fait 4 lettres.');join2(code)});
$('#b2Swap').addEventListener('click',()=>{if(!L2.host)return;const[a,b,c]=[L2.slots[1],L2.slots[2],L2.slots[3]];L2.slots[1]=c;L2.slots[2]=a;L2.slots[3]=b;L2.slots.forEach((x,g)=>{if(x&&x.conn)x.conn.g=g});SND.play('click');l2Roster()});
$('#b2Go').addEventListener('click',()=>{if(!L2.host||!L2.code)return;const bots=botSeats(),seed=Math.random()*1e9|0;
  const seats=L2.slots.map(x=>x?{name:x.name,avatar:x.avatar,title:x.title,deck:x.deck,ai:false,body:x.body,hat:x.hat}:bots.pop());
  NET.conns.forEach(c=>NET.to(c,{t:'start2',seed,seats,you:c.g}));goNet2(0,seed,seats,true)});
$('#l2friends').addEventListener('click',e=>{const b=e.target.closest('[data-inv2]');if(!b||!L2.code)return;const f=FR.friend(b.dataset.inv2);
  if(f&&FR.invite(f.code,'2v2',L2.code)){b.disabled=true;b.textContent='Invité';toast('Invitation envoyée à '+f.name+'.')}});

/* ---------- amis ---------- */
function drawFriends(){$('#fcode').textContent=S.d.fcode;
  if(!$('#frmsg').dataset.keep)$('#frmsg').textContent=FR.dup?'Le jeu est déjà ouvert dans une autre fenêtre : les amis ne marchent que dans une seule.':FR.ready?'':'Connexion…';
  $('#flist').innerHTML=S.d.friends.map(f=>{const on=FR.online(f.code);
    return `<div class="fr ${on?'on':''}"><span class="face">${faceHTML(f.avatar)}</span><div class="frn"><b>${f.name}</b><small>${on?'En ligne':f.pend?'En attente (il doit ouvrir le jeu)':'Hors ligne'}</small></div>
      <button class="btn sm red" data-inv="1v1" data-c="${f.code}" ${on?'':'disabled'}>Duel</button><button class="btn sm yellow" data-inv="2v2" data-c="${f.code}" ${on?'':'disabled'}>2 contre 2</button>
      <button class="frx" data-del="${f.code}" title="Retirer de la liste">×</button></div>`}).join('')||'<p class="dkempty">Pas encore d\'ami ici.<br>Échangez vos codes, puis ajoute-le à gauche.</p>'}
function drawFrTag(){const n=S.d.friends.filter(f=>FR.online(f.code)).length,t=$('#frTag');if(t){t.textContent=n?n+' en ligne':'';t.classList.toggle('show',!!n)}}
FR.onChange=()=>{drawFrTag();if(CUR==='friends')drawFriends();if(CUR==='lobby2'&&L2.code)drawL2()};
$('#bAdd').addEventListener('click',()=>{const err=FR.add($('#fadd').value),m=$('#frmsg');m.dataset.keep=1;m.textContent=err||'Ajouté. Il apparaîtra en ligne dès que son jeu sera ouvert.';if(!err){$('#fadd').value='';SND.play('quest')}else SND.play('error');setTimeout(()=>{delete m.dataset.keep},6000);drawFriends()});
$('#fadd').addEventListener('keydown',e=>{if(e.key==='Enter')$('#bAdd').click()});
$('#bCopy').addEventListener('click',()=>{const t=S.d.fcode,done=()=>toast('Code copié : '+t);
  try{navigator.clipboard.writeText(t).then(done,()=>{throw 0})}catch(e){const i=document.createElement('input');i.value=t;document.body.appendChild(i);i.select();try{document.execCommand('copy');done()}catch(x){}i.remove()}});
$('#flist').addEventListener('click',e=>{let b;
  if(b=e.target.closest('[data-del]')){FR.remove(b.dataset.del);return}
  if(!(b=e.target.closest('[data-inv]'))||b.disabled)return;const f=FR.friend(b.dataset.c);if(!f||!myDeck())return;
  if(b.dataset.inv==='1v1'){NET.stop();l2Reset();show('lobby');hostDuel(code=>{if(FR.invite(f.code,'1v1',code))lobbyMsg('Invitation envoyée à '+f.name+'. En attente de sa réponse…')})}
  else{if(!L2.host){NET.stop();l2Reset()}show('lobby2');host2(code=>{if(FR.invite(f.code,'2v2',code))toast('Invitation envoyée à '+f.name+'.')})}});
/* une invitation arrive : petit panneau en haut, 30 secondes pour répondre */
let INV=null;
function closeInvite(ans){if(!INV)return;clearTimeout(INV.timer);if(ans)FR.reply(INV.c,ans);INV=null;$('#invite').classList.add('hide')}
FR.onInvite=(f,mode,room,c)=>{
  if(!$('#app').classList.contains('hide')||NET.peer||INV)return FR.reply(c,'busy');
  INV={f,mode,room,c,timer:setTimeout(()=>closeInvite('no'),30000)};SND.play('quest');
  $('#invite').innerHTML=`<span class="face">${faceHTML(f.avatar)}</span><div class="frn"><b>${f.name}</b><small>t'invite : ${mode==='2v2'?'2 contre 2':'duel'}</small></div><button class="btn sm green" data-ans="yes">Accepter</button><button class="btn sm" data-ans="no">Refuser</button>`;
  $('#invite').classList.remove('hide')};
$('#invite').addEventListener('click',e=>{const b=e.target.closest('[data-ans]');if(!b||!INV)return;const v=INV;
  if(b.dataset.ans!=='yes')return closeInvite('no');
  if(!myDeck())return closeInvite('no');
  closeInvite();$('#modes').classList.add('hide');
  if(v.mode==='2v2'){show('lobby2');join2(v.room)}else{show('lobby');joinDuel(v.room)}});
FR.start();drawFrTag();

/* ---------- mise à jour automatique (seulement dans le jeu installé : window.BDC vient de preload.js) ---------- */
function updReady(v){const el=$('#ver');el.textContent='';const b=document.createElement('button');b.className='btn sm green';b.textContent='Mise à jour prête : relancer le jeu';b.addEventListener('click',()=>BDC.relaunch());el.appendChild(b);toast('Mise à jour '+v+' téléchargée.')}
if(window.BDC){BDC.info().then(i=>{$('#ver').textContent='Version '+i.version;if(i.ready)updReady(i.ready)});
  BDC.onUpdate((what,d)=>{if(what==='progress'&&!$('#ver button'))$('#ver').textContent='Téléchargement de la mise à jour… '+d+' %';if(what==='ready')updReady(d)})}

show('menu');
