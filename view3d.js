/* La table de jeu en 3D : cabane, table, terrains vivants, créatures en hologramme, caméra et effets. */
const V=(function(){
const T3=THREE,PI=Math.PI;T3.ColorManagement.enabled=false;
const SIDE={me:0x4cc9ff,foe:0xff5d8f};let optShake=true,camHold=0,avatarY=2.05,avatarS=2.6,oppB=null,mode='';
const TC={fromage:0xffd23f,sauce:0xff6b4a,slip:0x58d68d,nuage:0x7fd4ff,pote:0xffd76a};
let ren,scene,cam,canvas,me='p',running=false,time=0,last=0,shake=0;
let tiles={},units={},anims=[],tweens=[],parts=[],avatar=null,fan=[],table=null;
const base={p:new T3.Vector3(0,7.7,8.5),l:new T3.Vector3(0,.7,-.4)},goal={p:base.p.clone(),l:base.l.clone()},look=new T3.Vector3(0,0,0);
const api={onPick:null,onHover:null};
let NLv=4,SC=1,bunits={};
const LX=l=>(l-(NLv-1)/2)*1.78*SC,RZ=s=>(s===me?1.32:-1.32)*SC,key=(s,l)=>s+l;
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,back=k=>{const c=1.70158;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)};
function tween(d,fn,delay=0){return new Promise(res=>tweens.push({t:-delay,d,fn,res}))}
const lam=(c,o={})=>new T3.MeshLambertMaterial({color:c,flatShading:true,...o});
const bas=(c,o={})=>new T3.MeshBasicMaterial({color:c,...o});
function add(par,g,m,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){const o=new T3.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);par.add(o);return o}
let PERSO=null;
const G0=M.geo,circle=new T3.CircleGeometry(.5,24);

/* ---------- textures dessinées ---------- */
const texCache={};
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T3.CanvasTexture(c);t.anisotropy=4;return t}
function emojiTex(e){return texCache[e]||(texCache[e]=canvasTex(128,128,(x)=>{x.font='100px "Segoe UI Emoji","Apple Color Emoji",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(e,64,70)}))}
const ICO={shield:['M12 3l8 3v5.5c0 5-3.5 8.300-8 9.500-4.500-1.200-8-4.500-8-9.500V6z','#7fd4ff'],drop:['M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z','#b388ff']};
function iconTex(k){return texCache['i'+k]||(texCache['i'+k]=canvasTex(128,128,(x)=>{x.lineJoin='round';x.strokeStyle='#1b1035';
  if(k==='zz'){x.font='110px "Lilita One",Fredoka,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=14;x.strokeText('Z',64,70);x.fillStyle='#fff6e0';x.fillText('Z',64,70);return}
  const p=new Path2D(ICO[k][0]);x.scale(5,5);x.translate(.800,.800);x.lineWidth=3;x.stroke(p);x.fillStyle=ICO[k][1];x.fill(p)}))}
function portTex(id){if(texCache['p'+id])return texCache['p'+id];const im=new Image(),t=new T3.Texture(im);t.colorSpace=T3.NoColorSpace;im.onload=()=>{t.needsUpdate=true};if(window.PORT&&PORT[id])im.src=PORT[id];return texCache['p'+id]=t}
function sprite(e,s=1){const map=ICO[e]||e==='zz'?iconTex(e):(typeof C!=='undefined'&&C[e])?portTex(e):emojiTex(e);const sp=new T3.Sprite(new T3.SpriteMaterial({map,transparent:true,depthTest:false}));sp.scale.setScalar(s);sp.renderOrder=20;return sp}
/* le tapis de jeu dessiné pour le bon nombre de couloirs, posé sur celui de la table */
function boardPlane(){const t=canvasTex(1024,784,(x,w,h)=>{x.fillStyle=LOOKT.mat;x.fillRect(0,0,w,h);x.strokeStyle='#ffd23f';x.lineWidth=4;x.setLineDash([12,10]);x.strokeRect(14,14,w-28,h-28);x.setLineDash([]);
    x.strokeStyle=LOOKT.line;x.lineWidth=5;x.strokeRect(28,28,w-56,h-56);x.beginPath();x.moveTo(28,h/2);x.lineTo(w-28,h/2);x.stroke();
    const U=w/8.375,cw=1.66*SC*U,ch=2.230*SC*U;for(const sz of[-1,1])for(let l=0;l<NLv;l++){const cx=w/2+(l-(NLv-1)/2)*1.78*SC*U,cz=h/2+sz*1.32*SC*U;
      x.globalAlpha=.1;x.fillStyle=LOOKT.line;x.fillRect(cx-cw/2,cz-ch/2,cw,ch);x.globalAlpha=.8;x.strokeStyle=LOOKT.line;x.lineWidth=3;x.strokeRect(cx-cw/2,cz-ch/2,cw,ch);x.globalAlpha=1}});
  return add(scene,G0.plane,bas(0xffffff,{map:t}),0,.032,0,8.375,6.410,1,-PI/2)}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function cardTex(id){return texCache['c'+id]||(texCache['c'+id]=(()=>{const d=C[id],col='#'+(TC[d.t]||0xc77dff).toString(16).padStart(6,'0');
  const t=canvasTex(256,358,(x,w,h)=>{x.fillStyle='#1b1035';rr(x,0,0,w,h,26);x.fill();x.fillStyle=d.k==='s'?'#c9a7ff':col;rr(x,10,10,w-20,h-20,18);x.fill();
    x.fillStyle='#ffffffaa';rr(x,26,70,w-52,170,14);x.fill();x.fillStyle='#1b1035';x.font='bold 26px Fredoka,sans-serif';x.textAlign='center';x.fillText(d.n.slice(0,17),w/2,50);
    x.font='130px "Segoe UI Emoji",sans-serif';x.textBaseline='middle';if(!d.img)x.fillText(d.e.split('|')[0],w/2,162);
    x.fillStyle='#ffb703';x.beginPath();x.arc(40,40,26,0,7);x.fill();x.fillStyle='#1b1035';x.font='bold 34px Fredoka,sans-serif';x.fillText(d.c,40,42)});
  if(d.img&&!(window.PORT&&PORT[id])){const im=new Image();im.onload=()=>{const x=t.image.getContext('2d');x.drawImage(im,30,60,im.width-60,im.height*.5,26,70,204,170);t.needsUpdate=true};im.src=d.img}
  else if(window.PORT&&PORT[id]){const im=new Image();im.onload=()=>{const x=t.image.getContext('2d');x.fillStyle='#ffffffcc';rr(x,26,70,204,170,14);x.fill();x.drawImage(im,43,70,170,170);t.needsUpdate=true};im.src=PORT[id]}
  return t})())}
let LOOK={a:'#e8443a',b:'#ffd23f'},LOOKT={mat:'#1d2440',line:'#7ff6ff',w1:'#3b2d6b',w2:'#44357a'};
const backTex=()=>texCache.back||(texCache.back=canvasTex(128,180,(x,w,h)=>{x.fillStyle='#1b1035';rr(x,0,0,w,h,14);x.fill();x.fillStyle=LOOK.a;rr(x,7,7,w-14,h-14,10);x.fill();
  x.strokeStyle=LOOK.b;x.lineWidth=9;for(let i=-h;i<w;i+=26){x.beginPath();x.moveTo(i,h-7);x.lineTo(i+h,7);x.stroke()}x.fillStyle='#1b1035';x.beginPath();x.arc(w/2,h/2,30,0,7);x.fill();x.fillStyle=LOOK.b;x.font='44px "Lilita One",Fredoka,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('B',w/2,h/2+3)}));
/* pastille de points de vie d'un bâtiment */
function hpTex(B,h){const cv=B.cv||(B.cv=document.createElement('canvas'));cv.width=112;cv.height=96;const x=cv.getContext('2d');x.clearRect(0,0,112,96);x.fillStyle='#1b1035';rr(x,2,2,108,92,24);x.fill();x.fillStyle='#2a9d8f';rr(x,9,9,94,78,18);x.fill();
  x.font='bold 62px "Lilita One",Fredoka,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeStyle='#1b1035';x.strokeText(h,56,52);x.fillStyle='#fff';x.fillText(h,56,52);if(!B.tex)B.tex=new T3.CanvasTexture(cv);B.tex.needsUpdate=true;return B.tex}
function statTex(u,a,h,up,dn){const cv=u.statCv||(u.statCv=document.createElement('canvas'));cv.width=256;cv.height=104;const x=cv.getContext('2d');x.clearRect(0,0,256,104);
  const plate=(px,col,v,tc)=>{x.fillStyle='#1b1035';rr(x,px,6,112,92,24);x.fill();x.fillStyle=col;rr(x,px+7,13,98,78,18);x.fill();x.fillStyle=tc;x.font='bold 68px "Lilita One",Fredoka,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeStyle='#1b1035';x.strokeText(v,px+56,56);x.fillText(v,px+56,56)};
  plate(8,'#e63946',a,up?'#fff59d':'#fff');plate(136,'#2a9d8f',h,dn?'#ffb3b3':'#fff');
  if(!u.statTex){u.statTex=new T3.CanvasTexture(cv)}u.statTex.needsUpdate=true;return u.statTex}

/* ---------- décor ---------- */
function plankTex(a,b){return canvasTex(256,256,(x)=>{x.fillStyle=a;x.fillRect(0,0,256,256);for(let i=0;i<8;i++){x.fillStyle=i%2?b:a;x.fillRect(0,i*32,256,30);x.fillStyle='#0002';x.fillRect((i*71)%256,i*32,3,30)}})}
function room(){
  /* la pièce : un grenier le soir. Les gros meubles et la table viennent de Blockbench (bbmodels.js : salon, table). */
  scene.background=new T3.Color(0x1d1533);scene.fog=new T3.Fog(0x1d1533,34,80);
  scene.add(new T3.AmbientLight(0xfff1dd,1.75));const d=new T3.DirectionalLight(0xffffff,1.9);d.position.set(4,10,6);scene.add(d);
  const p=new T3.PointLight(0xffb066,2.5,40,0);p.position.set(0,8,0);scene.add(p);
  const ft=canvasTex(512,512,(x)=>{x.fillStyle='#6b4a35';x.fillRect(0,0,512,512);for(let i=0;i<8;i++){x.fillStyle=i%2?'#74513a':'#63432f';x.fillRect(0,i*64,512,61);x.fillStyle='#3d2a1e';x.fillRect(0,i*64+61,512,3);
      for(let j=0;j<3;j++){const px=(i*173+j*190)%512;x.fillRect(px,i*64,3,61);x.fillStyle='rgba(255,220,180,.07)';x.fillRect(px+20,i*64+14+j*12,120,2);x.fillStyle='#3d2a1e'}}});
  ft.wrapS=ft.wrapT=T3.RepeatWrapping;ft.repeat.set(7,7);add(scene,G0.plane,bas(0xffffff,{map:ft}),0,-4.2,0,70,70,1,-PI/2);
  /* murs : papier peint à rayures + boiseries */
  const wt=canvasTex(512,512,(x)=>{x.fillStyle=LOOKT.w1;x.fillRect(0,0,512,512);for(let i=0;i<16;i++){x.fillStyle=i%2?LOOKT.w2:LOOKT.w1;x.fillRect(i*32,0,32,330)}
    x.fillStyle='#ffd23f';for(let i=0;i<16;i++)for(let j=0;j<5;j++){x.globalAlpha=.16;x.beginPath();x.arc(i*32+16,30+j*64+(i%2)*32,3,0,7);x.fill()}x.globalAlpha=1;
    x.fillStyle='#5a3a1e';x.fillRect(0,330,512,182);x.fillStyle='#7a4a22';x.fillRect(0,330,512,14);for(let i=0;i<8;i++){x.fillStyle='#6b4226';x.fillRect(i*64+8,356,48,140);x.fillStyle='#3d2712';x.fillRect(i*64,344,3,168)}});
  wt.wrapS=T3.RepeatWrapping;wt.repeat.set(5,1);
  add(scene,G0.plane,bas(0xffffff,{map:wt}),0,7.2,-16.2,70,22.8,1);
  for(const s of[-1,1])add(scene,G0.plane,bas(0xffffff,{map:wt}),s*24,7.2,0,70,22.8,1,0,-s*PI/2);
  table=new T3.Group();scene.add(table);
  for(const id of['salon','table']){if(!window.BB||!BB[id])continue;const m=M.build(id,0xffffff);m.U.uHolo.value=0;m.U.uReveal.value=999;m.U.uOut.value=.03;if(id==='table')m.g.position.y=-.05;table.add(m.g)}
}

/* ---------- terrains vivants ---------- */
function terrain(type,g){
  /* terrain sculpté dans Blockbench (terr_*) ; sinon l'ancien terrain en formes simples */
  if(window.BB&&BB['terr_'+type]){const m=M.build('terr_'+type,0xffffff);m.U.uHolo.value=0;m.U.uReveal.value=999;m.U.uOut.value=.02;g.add(m.g);
    const B=m.bones||{},ks=Object.keys(B);for(const n of ks)B[n].userData.y0=B[n].position.y;
    anims.push(t=>ks.forEach((n,i)=>{const o=B[n];if(n.startsWith('sway'))o.rotation.z=Math.sin(t*1.8+i*1.7)*.13;else if(n.startsWith('bob'))o.position.y=o.userData.y0+Math.sin(t*1.4+i*2)*1.3;else if(n.startsWith('pulse')){const k=Math.sin(t*3+i);o.scale.set(1+k*.1,1+k*.3,1+k*.1)}}));
    return m.g}
  const slab={fromage:0xffd23f,sauce:0x6b3a2e,slip:0x3f9e63,nuage:0xcfeeff}[type];
  add(g,G0.box,lam(slab),0,.06,0,1.62,.12,2.18);
  const deco=new T3.Group();g.add(deco);const A=fn=>anims.push(fn);
  if(type==='fromage'){
    for(const[x,z,s]of[[-.5,.2,.3],[.45,.6,.22],[.2,-.3,.36],[-.3,-.7,.2],[.55,-.75,.26],[-.6,.8,.18]])add(deco,circle,lam(0xe0a800),x,.125,z,s,s,1,-PI/2);
    const wedge=new T3.CylinderGeometry(.42,.42,.34,3);add(deco,wedge,lam(0xffc21a),-.48,.3,-.78,1,1,1,0,.5);add(deco,wedge,lam(0xffe07a),.52,.24,-.8,.7,.7,.7,0,1.4);
    for(let i=0;i<7;i++){const s=i%2?-1:1,o=add(deco,G0.cone,lam(0xf4c430),s*.72,.4,-.9+i*.28,.09,.56,.09);const ph=i*1.3;A(t=>{o.rotation.z=Math.sin(t*2+ph)*.16;o.rotation.x=Math.cos(t*1.6+ph)*.1})}
  }else if(type==='sauce'){
    add(deco,new T3.CylinderGeometry(.14,.48,.6,10),lam(0x4a2a22),-.45,.42,-.72);const lava=add(deco,G0.sph,bas(0xff7b1c),-.45,.72,-.72,.26,.14,.26);
    for(const[x,z,s]of[[.4,.5,.36],[-.5,.5,.22],[.5,-.3,.3]])add(deco,circle,bas(0xff4d2e),x,.125,z,s,s,1,-PI/2);
    for(const[x,z,s]of[[.6,-.85,.22],[.3,-.9,.16],[-.68,-.1,.14]])add(deco,G0.oct,lam(0x3a231d),x,.2,z,s);
    const bub=[0,1,2,3].map(i=>add(deco,G0.sph,bas(0xffb347),-.45,.7,-.72,.08));
    A(t=>{lava.scale.y=.14+Math.sin(t*3)*.04;lava.material.color.setHSL(.06+Math.sin(t*2)*.02,1,.55);bub.forEach((b,i)=>{const k=(t*.6+i*.25)%1;b.position.set(-.45+Math.sin(i*2+k*4)*.12*k,.72+k*.7,-.72);b.scale.setScalar(.09*(1-k))})});
  }else if(type==='slip'){
    add(deco,circle,new T3.MeshLambertMaterial({color:0x2e86ab,transparent:true,opacity:.85}),.36,.125,.45,.6,.6,1,-PI/2);add(deco,circle,lam(0x7ad67a),.45,.13,.5,.16,.16,1,-PI/2);add(deco,circle,lam(0x7ad67a),.25,.13,.3,.11,.11,1,-PI/2);
    for(let i=0;i<6;i++){const x=-.72+(i%3)*.08,z=-.8+i*.3,r=add(deco,G0.cyl,lam(0x2d6a4f),x,.4,z,.03,.6,.03);add(r,G0.cyl,lam(0x6b4226),0,.5,0,2,.25,2);const ph=i;A(t=>{r.rotation.z=Math.sin(t*1.7+ph)*.12})}
    /* la corde à linge avec un slip */
    add(deco,G0.cyl,lam(0x6b4226),-.3,.42,-.92,.03,.7,.03);add(deco,G0.cyl,lam(0x6b4226),.6,.42,-.92,.03,.7,.03);add(deco,G0.box,lam(0xeeeeee),.15,.72,-.92,.9,.012,.012);
    const sl=add(deco,G0.box,lam(0xffffff),.15,.6,-.92,.3,.2,.02);A(t=>{sl.rotation.x=Math.sin(t*2.2)*.3});
    const bb=[0,1,2].map(()=>add(deco,G0.sph,new T3.MeshBasicMaterial({color:0xbfe9ff,transparent:true,opacity:.7}),.36,.15,.45,.07));
    A(t=>bb.forEach((b,i)=>{const k=(t*.5+i*.33)%1;b.position.set(.36+Math.sin(i*3)*.15,.14+k*.4,.45+Math.cos(i*5)*.12);b.scale.setScalar(.04+k*.07);b.material.opacity=.8*(1-k)}));
  }else{
    for(const[x,z,s,ph]of[[-.5,-.75,1,0],[.5,-.8,.8,2],[-.62,.55,.6,4]]){const c=new T3.Group();c.position.set(x,.32,z);c.scale.setScalar(s);deco.add(c);
      for(const[a,b,r]of[[0,0,.42],[.26,-.04,.32],[-.26,-.05,.3],[.05,.14,.3]])add(c,G0.sph,lam(0xffffff),a,b,0,r);A(t=>{c.position.y=.32+Math.sin(t*1.2+ph)*.07})}
    [0xff5d5d,0xffd23f,0x58d68d,0x7fd4ff].forEach((c,i)=>add(deco,new T3.TorusGeometry(.5-i*.055,.028,8,24,PI),lam(c),.05,.12,-.86));
  }
  return deco}

/* ---------- unités (créatures) ---------- */
function spawn(s,l,c){
  const d=C[c.id],tint=s===me?SIDE.me:SIDE.foe,m=M.build(c.id,tint),u={uid:c.uid,id:c.id,s,l,m,tint,g:new T3.Group(),ph:Math.random()*6,k:'',atk:0,sc:(c.fused?1.22:1.05)*(NLv>4?.9:1)*(1+.14*((c.star||1)-1)),evo:false};
  const x=LX(l),z=RZ(s);u.g.position.set(x,.13*SC,z);u.g.scale.setScalar(SC);u.home=u.g.position.clone();scene.add(u.g);
  m.g.position.set(0,m.fly,-.12);m.g.scale.setScalar(1.05);u.g.add(m.g);m.U.uBaseY.value=.13*SC;
  u.card=add(u.g,G0.plane,new T3.MeshBasicMaterial({map:cardTex(c.id)}),0,2.5,.72,.62,.86,1,-PI/2);
  u.disc=add(u.g,circle,bas(tint,{transparent:true,opacity:.0,blending:T3.AdditiveBlending,depthWrite:false}),0,.012,-.12,1.5,1.5,1,-PI/2);
  u.beam=add(u.g,new T3.CylinderGeometry(.75,.25,1.7,20,1,true),bas(tint,{transparent:true,opacity:0,blending:T3.AdditiveBlending,depthWrite:false,side:T3.DoubleSide}),0,.86,-.12);
  u.stat=new T3.Sprite(new T3.SpriteMaterial({transparent:true,depthTest:false,opacity:0}));u.stat.scale.set(.98,.4,1);u.stat.position.set(0,.26,.62);u.stat.renderOrder=30;u.g.add(u.stat);
  u.zz=sprite('zz',.5);u.zz.position.set(.45,1.5,0);u.zz.visible=false;u.g.add(u.zz);
  u.sh=sprite('shield',.42);u.sh.position.set(-.5,.75,.5);u.sh.visible=false;u.g.add(u.sh);u.po=sprite('drop',.36);u.po.position.set(.52,.75,.5);u.po.visible=false;u.g.add(u.po);
  units[key(s,l)]=u;
  /* la carte est claquée sur la table depuis la main du joueur, puis l'hologramme pousse */
  const hz=((s===me?4.4:-3.4)-z)/SC,cz=.72;u.card.material.side=T3.DoubleSide;
  tween(.36,k=>{u.card.position.set(0,.02+Math.sin(k*PI)*1.4+(1-k)*.8,hz+(cz-hz)*ease(k));u.card.rotation.x=-PI/2+(1-k*k)*1.25*(s===me?1:-1);u.card.rotation.z=(1-k)*.7})
    .then(()=>{shake=Math.max(shake,.16);for(let i=0;i<14;i++)puff(x+(Math.random()-.5)*.9,.2,z+cz+(Math.random()-.5)*.5,i%2?0xffffff:tint,.75)});
  tween(.75,k=>{m.U.uReveal.value=k*2.2;u.beam.material.opacity=.5*Math.sin(k*PI)+.07*k;u.disc.material.opacity=.45*k;u.stat.material.opacity=Math.max(0,k*2-1)},.38).then(()=>{m.U.uReveal.value=99});
  return u}
function kill(u){delete units[key(u.s,u.l)];const p=u.g.position,tint=u.tint;
  for(let i=0;i<26;i++)puff(p.x+(Math.random()-.5)*.6,.3+Math.random()*.9,p.z+(Math.random()-.5)*.5,i%3?tint:0xffffff,1.6);
  u.m.U.uFlash.value=.6;u.stat.visible=false;u.zz.visible=false;
  tween(.4,k=>{u.m.U.uReveal.value=1.8*(1-k);u.m.g.scale.set(u.sc+k*.5,u.sc-k*.4,u.sc+k*.5);u.beam.material.opacity=.07*(1-k);u.disc.material.opacity=.45*(1-k);u.card.material.opacity=1-k;u.card.material.transparent=true;u.card.position.y=.01+k*.4})
    .then(()=>{scene.remove(u.g);u.g.traverse(o=>{if(o.material&&o.material.dispose)o.material.dispose()})})}
const pGeo=new T3.BoxGeometry(.09,.09,.09);
function puff(x,y,z,c,pow=1){const m=new T3.Mesh(pGeo,bas(c,{transparent:true}));m.position.set(x,y,z);scene.add(m);
  parts.push({m,v:new T3.Vector3((Math.random()-.5)*2.4*pow,(1.2+Math.random()*2.6)*pow,(Math.random()-.5)*2.4*pow),t:0,d:.6+Math.random()*.5})}

/* ---------- boucle ---------- */
function frame(now,timer){if(!running)return;if(!timer)requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;time+=dt;
  for(const fn of anims)fn(time);
  for(let i=tweens.length-1;i>=0;i--){const w=tweens[i];w.t+=dt;if(w.t<0)continue;const k=Math.min(1,w.t/w.d);w.fn(k);if(k>=1){tweens.splice(i,1);w.res()}}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.t+=dt;p.v.y-=7*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*6;p.m.rotation.y+=dt*4;p.m.material.opacity=1-p.t/p.d;if(p.t>=p.d){scene.remove(p.m);p.m.material.dispose();parts.splice(i,1)}}
  for(const k in units){const u=units[k],m=u.m;m.U.uTime.value=time;m.U.uFlash.value*=Math.pow(.002,dt);
    if(!u.busy){const b=Math.sin(time*2.4+u.ph);m.g.position.y=(m.fly?m.fly+Math.sin(time*1.6+u.ph)*.09:0);m.g.scale.set(u.sc*(1+b*.025),u.sc*(1-b*.035),u.sc*(1+b*.025));m.g.rotation.y=Math.sin(time*.9+u.ph)*.14}
    M.pose(m,time,u.ph,u.atk);
    for(const o of m.extra){if(o.userData.spin)o.rotation.y=time*2.5;if(o.userData.pulse)o.scale.multiplyScalar(1+Math.sin(time*9+u.ph)*.012);if(o.userData.flap)o.rotation.z=o.userData.flap*(.7+Math.sin(time*5)*.3)}
    u.zz.position.y=1.5+Math.sin(time*2)*.08}
  for(const k in tiles){const t=tiles[k];if(t.hl.visible)t.hl.material.opacity=.35+.3*Math.sin(time*7)}
  if(avatar){avatar.position.y=avatarY+Math.sin(time*1.4)*.05;avatar.rotation.z=Math.sin(time*.8)*.05}
  if(mode==='show'){const a=Math.sin(time*.13)*.55;goal.p.set(Math.sin(a*.5)*9.4,3.6,Math.cos(a*.5)*9.4);goal.l.set(0,1.5,0)}
  if(camHold&&time>camHold){camHold=0;goal.p.copy(base.p);goal.l.copy(base.l)}
  const f=1-Math.exp(-dt*4.2);cam.position.lerp(goal.p,f);look.lerp(goal.l,f);
  cam.position.x+=Math.sin(time*.35)*.004;shake*=Math.pow(.001,dt);
  const sk=optShake?shake:0;cam.lookAt(look.x+(Math.random()-.5)*sk,look.y+(Math.random()-.5)*sk,look.z);
  ren.render(scene,cam)}
/* le perso assis en face : sweat + chapeau choisis par le joueur ; son avatar est collé à plat sur le devant de la tête */
function seatPerso(lk,face,z){lk=lk||{};const id=window.BB&&BB['perso_'+lk.body]?'perso_'+lk.body:'adversaire',plain=x=>{x.U.uHolo.value=0;x.U.uReveal.value=999;x.U.uOut.value=.03;return x};
  const m=plain(M.build(id,0xffffff));m.g.position.set(0,-.05,z);scene.add(m.g);oppB=m.bones||{};
  if(id!=='adversaire'&&oppB.tete&&BB['hat_'+lk.hat]){const h=plain(M.build('hat_'+lk.hat,0xffffff));h.g.scale.setScalar(16);h.g.position.set(0,-26,16);oppB.tete.add(h.g)}
  avatar=new T3.Mesh(G0.plane,new T3.MeshBasicMaterial({map:sprite(face,1).material.map,transparent:true,alphaTest:.04}));avatarY=0;
  if(oppB.face){avatarS=31;oppB.face.add(avatar);avatar.position.set(0,-1.5,1.2);avatar.rotation.x=-.1}else{avatarS=1.6;avatar.position.set(0,2.7,z+.6);scene.add(avatar)}
  avatar.scale.setScalar(avatarS);
  anims.push(t=>{const h=oppB.tete;if(h&&!h.userData.hit){h.rotation.z=Math.sin(t*.8)*.05;h.rotation.x=Math.sin(t*1.1)*.03}})}
function resize(){if(!ren)return;const w=innerWidth,h=innerHeight;ren.setSize(w,h,false);cam.aspect=w/h;cam.fov=w/h<1.25?56:w/h<1.6?49:44;
  if(mode==='show')cam.clearViewOffset();else cam.setViewOffset(w,h,Math.min(125,w*.1),h*.02,w,h);cam.updateProjectionMatrix()}
function project(x,y,z){const v=new T3.Vector3(x,y,z).project(cam);return{left:(v.x+1)/2*innerWidth,top:(1-v.y)/2*innerHeight,width:0,height:0}}

/* fenêtre cachée : le navigateur met les images en pause, on continue quand même pour ne pas bloquer le duel */
setInterval(()=>{if(running&&(document.hidden||performance.now()-last>250))frame(performance.now(),true)},100);

/* ---------- clics ---------- */
const ray=new T3.Raycaster(),mouse=new T3.Vector2();
function pickAt(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(mouse,cam);
  const hit=ray.intersectObjects(Object.values(tiles).map(t=>t.pick))[0];return hit?hit.object.userData:null}

/* ---------- API ---------- */
Object.assign(api,{
  init(cv){canvas=cv;ren=new T3.WebGLRenderer({canvas:cv,antialias:true});ren.outputColorSpace=T3.LinearSRGBColorSpace;ren.setPixelRatio(Math.min(2,devicePixelRatio));
    cam=new T3.PerspectiveCamera(40,1,.1,100);addEventListener('resize',resize);
    cv.addEventListener('click',e=>{const p=pickAt(e);if(p&&api.onPick)api.onPick(p.s,p.l)});
    cv.addEventListener('mousemove',e=>{const p=pickAt(e);cv.style.cursor=p&&tiles[key(p.s,p.l)].hl.visible?'pointer':'default';if(api.onHover)api.onHover(p)})},
  /* objets choisis dans le casier : couleur du halo et dos de carte */
  /* réglages : qualité de l'image et tremblements */
  setOpt(o){optShake=o.shake!==false;if(ren)ren.setPixelRatio(o.q==='low'?1:Math.min(2,devicePixelRatio));resize()},
  /* le perso d'en face hoche la tête quand il parle */
  nod(){const h=oppB&&oppB.tete;if(!h||h.userData.hit)return;h.userData.hit=1;tween(.7,k=>{h.rotation.x=Math.sin(k*PI*3)*.16*(1-k)}).then(()=>{h.userData.hit=0})},
  setLook(o){SIDE.me=o.halo;if(o.perso&&JSON.stringify(o.perso)!==JSON.stringify(PERSO)){PERSO=o.perso;if(mode==='show')mode=''}if(o.back){LOOK=o.back;delete texCache.back}if(o.table&&o.table!==LOOKT){LOOKT=o.table;if(mode==='show')mode=''}},
  /* fond des menus : la pièce, la table, et quelques créatures qui posent */
  showcase(){if(mode==='show')return;mode='show';me='p';NLv=4;SC=1;bunits={};camHold=0;avatar=null;oppB=null;scene=new T3.Scene();tiles={};units={};anims=[];tweens=[];parts=[];fan=[];time=0;room();boardPlane();
    const ids=IDS.filter(i=>C[i].k==='c'&&window.BB&&BB[i]).sort(()=>Math.random()-.5).slice(0,4);
    ids.forEach((id,i)=>{const tint=i%2?SIDE.foe:SIDE.me,m=M.build(id,tint),o=i-(ids.length-1)/2,px=[-4.8,-3.1,3.1,4.8][i],pz=[1.4,0,0,1.4][i];m.U.uReveal.value=999;m.U.uBaseY.value=-99;m.g.position.set(px,.08+m.fly,pz);m.g.scale.setScalar(1.3);scene.add(m.g);
      const d=add(scene,circle,bas(tint,{transparent:true,opacity:.4,blending:T3.AdditiveBlending,depthWrite:false}),px,.09,pz,1.5,1.5,1,-PI/2);
      anims.push(t=>{m.U.uTime.value=t;M.pose(m,t,i*1.7,0);m.g.rotation.y=-o*.22+Math.sin(t*.7+i)*.2;if(m.fly)m.g.position.y=.08+m.fly+Math.sin(t*1.6+i)*.09;d.material.opacity=.3+.12*Math.sin(t*3+i);for(const x of m.extra)if(x.userData.spin)x.rotation.y=t*2.5})});
    if(PERSO&&window.BB&&BB.adversaire)seatPerso(PERSO,PERSO.face,-4.55);
    cam.position.set(0,9,15);look.set(0,1,0);resize();if(!running){running=true;last=performance.now();requestAnimationFrame(frame)}},
  start(mySide,terr,oppFace,n,oppLook){mode='duel';me=mySide;oppB=null;NLv=n||4;SC=NLv>4?.76:1;scene=new T3.Scene();tiles={};units={};bunits={};anims=[];tweens=[];parts=[];fan=[];time=0;room();boardPlane();
    for(const s of['p','e'])for(let l=0;l<NLv;l++){const g=new T3.Group();g.position.set(LX(l),0,RZ(s));g.scale.setScalar(SC);scene.add(g);
      const deco=terrain(terr[s][l],g);deco.scale.setScalar(.001);g.userData.deco=deco;tween(.7,k=>deco.scale.setScalar(Math.max(.001,back(k))),.5+l*.14+(s===me?.3:0));
      const pick=add(g,G0.box,new T3.MeshBasicMaterial({visible:false}),0,.8,0,1.7,1.6,2.2);pick.userData={s,l};
      const hl=add(g,G0.plane,bas(0xffffff,{transparent:true,opacity:.5,blending:T3.AdditiveBlending,depthWrite:false}),0,.14,0,1.62,2.18,1,-PI/2);hl.visible=false;
      tiles[key(s,l)]={g,pick,hl}}
    /* l'adversaire assis en face */
    if(window.BB&&BB.adversaire)seatPerso(oppLook,oppFace,-4.55);
    else{oppB=null;add(scene,G0.sph,lam(0x3a86ff),0,-.3,-6.4,3.4,4.6,2.2);avatarY=2.05;avatarS=2.6;avatar=sprite(oppFace,avatarS);avatar.material.depthTest=true;avatar.position.set(0,avatarY,-5.6);scene.add(avatar);
    add(scene,G0.sph,lam(0x3a86ff),-1.9,.3,-4.6,.8);add(scene,G0.sph,lam(0x3a86ff),1.9,.3,-4.6,.8)}
    cam.position.set(0,15,17);look.set(0,0,0);goal.p.copy(base.p);goal.l.copy(base.l);resize();
    if(!running){running=true;last=performance.now();requestAnimationFrame(frame)}},
  stop(){running=false},
  /* met la 3D d'accord avec l'état du jeu */
  sync(G,okFn){for(const s of['p','e']){for(let l=0;l<NLv;l++){const c=G[s].lanes[l],k=key(s,l);let u=units[k];
        /* bâtiment : au fond de la case, en hologramme */
        const b=G[s].bld&&G[s].bld[l],bu=bunits[k];
        if(bu&&(!b||b.uid!==bu.uid)){scene.remove(bu.bs);for(let i=0;i<18;i++)puff(bu.x+(Math.random()-.5)*.6,.3+Math.random()*.6,bu.z+(Math.random()-.5)*.4,i%2?0xffffff:0xc9a26b,1.3);scene.remove(bu.m.g);bu.m.g.traverse(o=>{if(o.material&&o.material.dispose)o.material.dispose()});delete bunits[k]}
        if(b&&!bunits[k]){const tint=s===me?SIDE.me:SIDE.foe,m=M.build(b.id,tint),bx=LX(l),bz=RZ(s)-.74*SC;m.g.position.set(bx,.13*SC,bz);m.g.scale.setScalar((C[b.id].qg?.9:.72)*SC);m.U.uBaseY.value=.13*SC;m.U.uReveal.value=0;scene.add(m.g);
          const bs=new T3.Sprite(new T3.SpriteMaterial({transparent:true,depthTest:false}));bs.scale.set(.42*SC,.36*SC,1);bs.position.set(bx+.56*SC,.34*SC,bz+.1);bs.renderOrder=30;scene.add(bs);bunits[k]={uid:b.uid,m,bs,hp:-1,x:bx,z:bz};
          tween(.7,q=>{m.U.uReveal.value=q*1.6;m.U.uTime.value=time}).then(()=>{m.U.uReveal.value=99});shake=Math.max(shake,.14);for(let i=0;i<16;i++)puff(bx+(Math.random()-.5)*.8,.25,bz+(Math.random()-.5)*.5,i%2?0xffffff:tint,.8);anims.push(t=>{m.U.uTime.value=t})}
        if(b&&bunits[k]&&bunits[k].hp!==b.hp){const B=bunits[k];B.hp=b.hp;B.bs.material.map=hpTex(B,b.hp)}
        if(u&&(!c||c.uid!==u.uid)){kill(u);u=null}
        if(c&&!u)u=spawn(s,l,c);
        if(u){const d=C[c.id],kk=c.shownAtk+'/'+c.hp+'/'+c.max;if(kk!==u.k){u.k=kk;u.stat.material.map=statTex(u,c.shownAtk,c.hp,c.shownAtk>d.a,c.hp<c.max)}u.zz.visible=!!c.stun;u.sh.visible=!!c.shield;u.po.visible=!!c.poison;
          if(c.evo&&!u.evo){u.evo=true;const s0=u.sc,s1=s0+.22;tween(.6,q=>{u.sc=s0+(s1-s0)*back(q)});u.m.U.uFlash.value=1;u.disc.material.color.set(0xffd23f);shake=Math.max(shake,.2);for(let i=0;i<28;i++)puff(u.home.x+(Math.random()-.5)*.7,.3+Math.random()*1.1,u.home.z+(Math.random()-.5)*.5,i%2?0xffd23f:0xffffff,1.5)}}
        /* case occupée : son décor s'aplatit pour laisser voir la créature et le bâtiment */
        const T=tiles[k],occ=!!(c||b),dk=T.g.userData.deco;if(dk&&time>2.6&&T.occ!==occ){T.occ=occ;const y0=dk.scale.y,y1=occ?.2:1;tween(.35,q=>{const v=y0+(y1-y0)*q;dk.scale.y=v;dk.position.y=(1-v)*.118})}
        T.hl.visible=!!okFn(s,l)}}
    const n=G[me==='p'?'e':'p'].hand.length;while(fan.length>n)scene.remove(fan.pop());
    while(fan.length<n){const m=add(scene,G0.plane,new T3.MeshBasicMaterial({map:backTex(),side:T3.DoubleSide}),0,0,0,.62,.86,1);fan.push(m)}
    fan.forEach((m,i)=>{const o=i-(n-1)/2;m.position.set(o*.42,.5-Math.abs(o)*.04,-3.75);m.rotation.set(-.5,0,-o*.1)})},
  rect(s,l){return project(LX(l),.9,RZ(s))},
  heroRect(s){return s===me?project(0,.2,3.6):project(0,avatarY,-4.2)},
  /* la créature fonce en face ; la promesse se termine au moment de l'impact */
  attack(s,l,toHero){const u=units[key(s,l)];if(!u)return Promise.resolve();u.busy=true;const dir=s===me?-1:1,dist=toHero?3.3:1.75*SC,m=u.m.g;
    /* la caméra descend au ras du plateau, à côté du couloir */
    const cx=LX(l);goal.p.set(cx+(cx>0?-2.5:2.5),1.55,4.5);goal.l.set(cx,.85,-.2);camHold=1e9;
    return new Promise(res=>{let hit=false;tween(.62,k=>{u.atk=k;const a=k<.25?-.25*Math.sin(k/.25*PI/2):k<.5?-.25+1.25*ease((k-.25)/.25):1-ease((k-.5)/.5);
      u.g.position.z=u.home.z+dir*dist*a;m.position.y=Math.sin(Math.min(1,Math.max(0,(k-.25)/.5))*PI)*.5;m.rotation.x=dir*-.5*Math.sin(Math.min(1,k/.5)*PI);
      if(!hit&&k>=.5){hit=true;shake=toHero?.35:.16;res()}},.34).then(()=>{u.busy=false;u.atk=0;u.g.position.copy(u.home);m.rotation.x=0;camHold=time+.5})})},
  /* un bâtiment encaisse */
  hitB(s,l){const B=bunits[key(s,l)];if(!B)return;B.m.U.uFlash.value=.9;tween(.4,q=>{B.m.U.uFlash.value=.9*(1-q);B.m.g.position.x=B.x+Math.sin(q*PI*5)*.1*(1-q)});shake=Math.max(shake,.2);for(let i=0;i<8;i++)puff(B.x,.6,B.z,0xffffff,.8)},
  /* la table tremble (rage, événements) */
  quake(v){shake=Math.max(shake,v)},
  hit(s,l){const u=units[key(s,l)];if(!u)return;u.m.U.uFlash.value=.9;const x0=u.home.x;tween(.3,k=>{u.g.position.x=x0+Math.sin(k*PI*5)*.12*(1-k)});
    for(let i=0;i<7;i++)puff(u.home.x,.8,u.home.z,0xffffff,.8)},
  heroHit(s){shake=.5;if(s!==me&&avatar){const sc=avatarS,hd=oppB&&oppB.tete;if(hd){hd.userData.hit=1;tween(.55,k=>{hd.rotation.x=-.4*Math.sin(k*PI);hd.rotation.z=Math.sin(k*PI*4)*.14*(1-k)}).then(()=>{hd.userData.hit=0})}tween(.35,k=>{avatar.scale.setScalar(sc*(1+Math.sin(k*PI)*.25));avatar.material.color.setRGB(1,.4+.6*k,.4+.6*k)});for(let i=0;i<16;i++)puff((Math.random()-.5)*2,1.6+Math.random(),-5,0xff5d5d,1.5)}
    else for(let i=0;i<16;i++)puff((Math.random()-.5)*5,.3,3.2,0xff5d5d,1.3)},
  /* zoom cinéma sur un couloir */
  focus(s,l,d=1.2){const x=LX(l),z=RZ(s);goal.p.set(x*.8+(x>0?-1.6:1.6),2.3,z+4.3);goal.l.set(x,.75,z);return tween(d,()=>{}).then(()=>{goal.p.copy(base.p);goal.l.copy(base.l)})},
  /* effet d'un sort : des emojis géants tombent sur les cibles */
  async spell(e,spots,big){const bid=window.BB&&BB['sp_'+e]?'sp_'+e:null;if(!bid)return;
    const drops=spots.map(([x,z],i)=>{
      /* le sort en 3D (sp_* de Blockbench) tombe sur la cible, s'écrase, disparaît */
      if(bid){const m=M.build(bid,0xffe14d),S=big?1.9:1.3;m.U.uReveal.value=999;m.U.uBaseY.value=-99;m.g.position.set(x,7.5,z);m.g.scale.setScalar(S);scene.add(m.g);
        return tween(.5,k=>{m.U.uTime.value=time;m.g.position.y=7.5-7.2*k*k;m.g.rotation.y=(1-k)*5},i*.08).then(()=>{shake=Math.max(shake,big?.6:.22);for(let j=0;j<(big?26:12);j++)puff(x,.5,z,j%2?0xffffff:0xffd23f,big?1.8:1.1);
          return tween(.32,k=>{m.g.scale.set(S*(1+k*.6),S*Math.max(.05,1-k*.9),S*(1+k*.6));m.U.uFlash.value=k*.7})}).then(()=>{scene.remove(m.g);m.g.traverse(o=>{if(o.material&&o.material.dispose)o.material.dispose()})})}
      const sp=sprite(e,big?2.2:1.4);sp.position.set(x,7,z);scene.add(sp);
      return tween(.42,k=>{sp.position.y=7-6.3*k*k;sp.material.rotation=k*3},i*.07).then(()=>{shake=Math.max(shake,big?.6:.2);for(let j=0;j<(big?24:10);j++)puff(x,.5,z,j%2?0xffffff:0xffd23f,big?1.8:1.1);
        return tween(.22,k=>{sp.scale.setScalar((big?2.2:1.4)*(1+k*.8));sp.material.opacity=1-k})}).then(()=>scene.remove(sp))});
    await Promise.all(drops)},
  spot(s,l){return[LX(l),RZ(s)]},heroSpot(s){return s===me?[0,3.3]:[0,-4.6]},center(){return[0,0]},
});
return api})();
/* illustrations des cartes : une image de chaque modèle 3D */
window.PORT={};M.ready.then(()=>{for(const id of Object.keys(C)){const d=C[id],mid=d.k==='s'?'sp_'+id:id;if(!(window.BB&&BB[mid])&&(d.img||d.k==='s'))continue;try{PORT[id]=M.snap(mid)}catch(e){console.error(id,e)}}document.dispatchEvent(new Event('ports'))});
