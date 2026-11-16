/* Les mini-jeux qui décident qui commence. Un mini-jeu est tiré au hasard (le même pour les deux joueurs).
   MG.run({mode, me, seed, names, faces}) → promesse du côté qui commence ('p' ou 'e').
   En ligne : chacun joue de son côté, envoie son score ({t:'mg', v}), le meilleur score commence ; égalité = tirage commun. */
const MG=(function(){
  const el=()=>document.querySelector('#mg'),wait=ms=>new Promise(r=>setTimeout(r,ms));
  let remoteV=null,onRemote=null,alive=false,stopFns=[];
  const html=h=>{el().innerHTML=h};
  const frame=(title,rule,body)=>html(`<div class="mgbox panel"><div class="label">${title}</div><div class="mgr">${rule}</div><div class="mgbody">${body}</div></div>`);
  const once=(sel,ev)=>new Promise(r=>{const n=el().querySelector(sel);const f=e=>{n.removeEventListener(ev,f);r(e)};n.addEventListener(ev,f);stopFns.push(()=>r(null))});
  const PFC=['Pierre','Feuille','Ciseaux'],PIC=['rock','paper','scissors'];
  const die=v=>'<span class="die">'+v+'</span>';

  /* chaque jeu renvoie mon score (plus grand = meilleur) ; ai() = le score du robot */
  const GAMES=[
    {n:'Réflexe',rule:'Clique dès que le bouton devient vert. Trop tôt, c\'est perdu.',ai:()=>-(260+Math.random()*280),
      show:v=>v<=-9000?'Trop tôt':Math.round(-v)+' ms',
      async play(){frame(this.n,this.rule,'<button class="mgbig red" id="mgb">Attends…</button>');
        const b=el().querySelector('#mgb');let early=false;const f=()=>{early=true};b.addEventListener('pointerdown',f);
        await wait(1400+Math.random()*2600);b.removeEventListener('pointerdown',f);if(early||!alive)return-9999;
        b.className='mgbig green';b.textContent='Clique !';SND.play('go');const t=performance.now();await once('#mgb','pointerdown');return-(performance.now()-t)}},
    {n:'La jauge',rule:'Arrête l\'aiguille le plus près possible du milieu.',ai:()=>-(3+Math.random()*30),
      show:v=>'à '+Math.round(-v)+' % du centre',
      async play(){frame(this.n,this.rule,'<div class="gauge"><i class="mid"></i><i class="ndl" id="ndl"></i></div><button class="mgbig yellow" id="mgb">Stop</button>');
        const nd=el().querySelector('#ndl');let x=0,run=true,t0=performance.now();
        const iv=setInterval(()=>{if(run){x=Math.sin((performance.now()-t0)/260)*100;nd.style.left=(50+x/2)+'%'}},16);
        await once('#mgb','pointerdown');run=false;clearInterval(iv);SND.play('tick');return-Math.abs(x)}},
    {n:'Tape tape tape',rule:'Clique le plus de fois possible en 4 secondes.',ai:()=>17+Math.floor(Math.random()*10),
      show:v=>v+' clics',
      async play(){frame(this.n,this.rule,'<button class="mgbig red" id="mgb">Tape ici<br><span id="mgc">0</span></button><div class="mgbar"><i id="mgt"></i></div>');
        const b=el().querySelector('#mgb'),c=el().querySelector('#mgc'),bar=el().querySelector('#mgt');let n=0;const f=()=>{n++;c.textContent=n;SND.play('tick');b.style.transform='scale('+(1+Math.random()*.06)+') rotate('+(Math.random()*4-2)+'deg)'};
        b.addEventListener('pointerdown',f);const t0=performance.now();while(performance.now()-t0<4000&&alive){bar.style.width=(100-(performance.now()-t0)/40)+'%';await wait(50)}
        b.removeEventListener('pointerdown',f);return n}},
    {n:'Pierre, feuille, ciseaux',rule:'Choisis. En cas d\'égalité, le hasard tranche.',ai:()=>Math.floor(Math.random()*3),pfc:true,
      show:v=>PFC[v]||'…',
      async play(){frame(this.n,this.rule,'<div class="pfc">'+PFC.map((t,i)=>'<button class="mgbig" data-v="'+i+'">'+IC(PIC[i])+'<small>'+t+'</small></button>').join('')+'</div>');
        return new Promise(r=>{el().querySelectorAll('[data-v]').forEach(b=>b.addEventListener('pointerdown',()=>r(+b.dataset.v)));stopFns.push(()=>r(0))})}},
    {n:'Le dé',rule:'Lance ton dé. Le plus grand commence.',dice:true,ai:()=>0,
      show:v=>die(v),
      async play(){frame(this.n,this.rule,'<button class="mgbig yellow" id="mgb">Lancer le dé</button>');await once('#mgb','pointerdown');SND.play('dice');return 0}},
  ];
  const who=(o,s,cls,extra)=>'<div class="'+(cls||'')+'"><span class="face">'+faceHTML(o.faces[s])+'</span><b>'+o.names[s]+'</b>'+(extra||'')+'</div>';

  async function run(o){
    alive=true;remoteV=null;stopFns=[];const R=rng(o.seed^0x5bd1e995),g=GAMES[R()*GAMES.length|0],you=o.me,foe=you==='p'?'e':'p',box=el();
    box.classList.remove('hide');SND.music('mini');
    frame('Qui commence ?','Un mini-jeu décide. Le perdant pioche une carte en plus.','<div class="mgvs">'+who(o,you)+'<i>VS</i>'+who(o,foe)+'</div><div class="mgnext">'+g.n+'</div>');
    await wait(1900);if(!alive)return'p';
    let mine=await g.play();if(!alive)return'p';
    /* le dé : les deux valeurs viennent du tirage commun, personne ne peut tricher */
    let sc={};if(g.dice){let a,b;do{a=1+(R()*6|0);b=1+(R()*6|0)}while(a===b);sc={p:a,e:b}}
    else{let theirs;
      if(o.mode==='net'){NET.send({t:'mg',v:mine});frame(g.n,'En attente de '+o.names[foe]+'…','<div class="mgwait"></div>');
        theirs=remoteV!==null?remoteV:await Promise.race([new Promise(r=>{onRemote=r}),wait(30000).then(()=>null)]);if(theirs===null)theirs=g.pfc?0:-99999}
      else theirs=g.ai();
      sc={[you]:mine,[foe]:theirs}}
    if(!alive)return'p';
    let first;
    if(g.pfc){const d=(sc.p-sc.e+3)%3;first=d===1?'p':d===2?'e':(R()<.5?'p':'e')}
    else first=sc.p>sc.e?'p':sc.e>sc.p?'e':(R()<.5?'p':'e');
    SND.play(first===you?'quest':'turn2');
    frame(g.n,'','<div class="mgvs res">'+who(o,you,first===you?'w':'','<em>'+g.show(sc[you])+'</em>')+'<i>VS</i>'+who(o,foe,first===foe?'w':'','<em>'+g.show(sc[foe])+'</em>')+'</div><div class="mgnext">'+(first===you?'Tu commences !':o.names[first]+' commence !')+'</div>');
    await wait(2300);box.classList.add('hide');box.innerHTML='';alive=false;return first}

  /* mini-jeu éclair d'un sort : arrêter l'aiguille au centre. Renvoie 0 (raté), 1 (normal) ou 2 (parfait). 3,5 s maximum. */
  async function quick(name){const box=el();alive=true;stopFns=[];box.classList.remove('hide');
    frame(name,'Arrête l\'aiguille au centre : plus c\'est précis, plus le sort tape fort.','<div class="gauge"><i class="mid"></i><i class="ndl" id="ndl"></i></div><button class="mgbig yellow" id="mgb">Stop</button>');
    const nd=box.querySelector('#ndl');let x=0,run=true,t0=performance.now();
    const iv=setInterval(()=>{if(run){x=Math.sin((performance.now()-t0)/190)*100;nd.style.left=(50+x/2)+'%'}},16);
    await Promise.race([once('#mgb','pointerdown'),wait(3500)]);run=false;clearInterval(iv);
    const d=Math.abs(x),q=d<=12?2:d<=48?1:0;SND.play(q===2?'quest':q?'tick':'error');
    box.querySelector('.mgr').textContent=['Raté…','Pas mal.','Parfait !'][q];await wait(550);box.classList.add('hide');box.innerHTML='';alive=false;return q}

  return{run,quick,
    remote(d){const v=Number(d&&d.v);if(!isFinite(v))return;remoteV=v;if(onRemote){onRemote(v);onRemote=null}},
    cancel(){if(!alive)return;alive=false;stopFns.forEach(f=>f());const b=el();if(b){b.classList.add('hide');b.innerHTML=''}}};
})();
