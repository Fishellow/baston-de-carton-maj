/* Modèles 3D des créatures, construits avec des formes simples + matière "hologramme". */
const M=(function(){
const T3=THREE,PI=Math.PI;
const geo={box:new T3.BoxGeometry(1,1,1),sph:new T3.SphereGeometry(.5,22,16),cyl:new T3.CylinderGeometry(.5,.5,1,20),cone:new T3.ConeGeometry(.5,1,18),
  tor:new T3.TorusGeometry(.5,.1,10,26),keb:new T3.CylinderGeometry(.5,.24,1,20),plane:new T3.PlaneGeometry(1,1),oct:new T3.OctahedronGeometry(.5)};
const VS=`uniform float uOut;varying vec3 vN;varying vec3 vW;varying vec2 vUv;varying vec3 vV;
void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);w.xyz+=vN*uOut;vW=w.xyz;vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`;
/* uHolo=1 : hologramme d'une seule couleur avec contour lumineux ; uHolo=0 : vraies couleurs (pour le dessin des cartes) */
const FS=`uniform vec3 uColor;uniform vec3 uTint;uniform float uTime,uReveal,uBaseY,uFlash,uUseMap,uHolo,uOut;uniform sampler2D uMap;
varying vec3 vN;varying vec3 vW;varying vec2 vUv;varying vec3 vV;
void main(){float h=vW.y-uBaseY;if(h>uReveal)discard;
 if(uOut>0.){vec3 oc=mix(vec3(.1,.06,.2),mix(uTint,vec3(1.),.7),uHolo);gl_FragColor=vec4(oc+vec3(uFlash),1.);return;}
 vec3 base=uColor;if(uUseMap>.5)base=texture2D(uMap,vUv).rgb;
 float d=dot(normalize(vN),normalize(vec3(.35,.9,.55)));float toon=d>.25?1.:.8;
 vec3 real=base*toon;
 float lum=dot(base,vec3(.3,.59,.11));
 float fr=pow(1.-max(dot(normalize(vN),vV),0.),2.5);
 /* hologramme en vraies couleurs : halo de la couleur du joueur sur les bords + lignes qui défilent */
 vec3 holo=mix(real,uTint*(.35+.65*lum),.16)*1.06+mix(uTint,vec3(1.),.45)*fr*.85;
 holo*=.93+.07*sin(h*90.-uTime*5.);holo+=uTint*.1*smoothstep(.96,1.,sin(h*7.-uTime*2.2));
 vec3 col=mix(real,holo,uHolo);
 col+=vec3(1.)*smoothstep(.1,0.,uReveal-h)*1.3*uHolo;
 col+=vec3(uFlash);
 gl_FragColor=vec4(col,1.);}`;
let cur,U,snapR;
function mat(color,map){return new T3.ShaderMaterial({vertexShader:VS,fragmentShader:FS,uniforms:{uColor:{value:new T3.Color(color)},uTint:U.uTint,uTime:U.uTime,uReveal:U.uReveal,uBaseY:U.uBaseY,uFlash:U.uFlash,uHolo:U.uHolo,uOut:{value:0},uUseMap:{value:map?1:0},uMap:{value:map||null}}})}
function outMat(){return new T3.ShaderMaterial({vertexShader:VS,fragmentShader:FS,side:T3.BackSide,uniforms:{uColor:{value:new T3.Color(0)},uTint:U.uTint,uTime:U.uTime,uReveal:U.uReveal,uBaseY:U.uBaseY,uFlash:U.uFlash,uHolo:U.uHolo,uOut:U.uOut,uUseMap:{value:0},uMap:{value:null}}})}
function mesh(g,c,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,map){const m=new T3.Mesh(g,mat(c,map));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);cur.add(m);if(g!==geo.plane)m.add(new T3.Mesh(g,outMat()));return m}
const box=(c,x,y,z,sx,sy,sz,rx,ry,rz)=>mesh(geo.box,c,x,y,z,sx,sy,sz,rx,ry,rz);
const sph=(c,x,y,z,sx,sy=sx,sz=sx)=>mesh(geo.sph,c,x,y,z,sx,sy,sz);
const cyl=(c,x,y,z,r,h,rx,ry,rz)=>mesh(geo.cyl,c,x,y,z,r*2,h,r*2,rx,ry,rz);
const cone=(c,x,y,z,r,h,rx,ry,rz)=>mesh(geo.cone,c,x,y,z,r*2,h,r*2,rx,ry,rz);
const tor=(c,x,y,z,R,rx,ry,rz)=>mesh(geo.tor,c,x,y,z,R*2,R*2,R*2,rx,ry,rz);
function eyes(y,z,dx=.11,r=.07){for(const s of[-1,1]){sph(0xffffff,s*dx,y,z,r*2);sph(0x1b1035,s*dx,y,z+r*.7,r*1.1)}}
function legs(c,dx=.14,h=.22,r=.05,z=0){cyl(c,-dx,h/2,z,r,h);cyl(c,dx,h/2,z,r,h)}
function crown(y,r=.22){cyl(0xffc933,0,y,0,r,.1);for(let i=0;i<5;i++){const a=i/5*PI*2;cone(0xffc933,Math.cos(a)*r*.85,y+.11,Math.sin(a)*r*.85,.05,.14)}sph(0xff4d6d,0,y+.02,r,.07)}
const W=0xffffff,K=0x2a2140,OR=0xff9f1c,RD=0xe63946,GD=0xffc933,PK=0xff9ecb,SV=0xc9d1d9,BR=0x8a5a33;

function friend(img,shirt,x=0,s=1){const g0=cur,g=new T3.Group();g.position.x=x;g.scale.setScalar(s);g0.add(g);cur=g;
  box(shirt,0,.47,0,.44,.42,.28);box(0x2b3a67,-.11,.14,0,.17,.28,.21);box(0x2b3a67,.11,.14,0,.17,.28,.21);
  box(shirt,-.3,.5,0,.13,.34,.17);box(shirt,.3,.5,0,.13,.34,.17);sph(0xf1c9a5,-.3,.29,0,.13);sph(0xf1c9a5,.3,.29,0,.13);
  box(0xf1c9a5,0,1.0,0,.58,.62,.5);box(0x3b2a1f,0,1.33,-.02,.6,.07,.53);
  const tex=new T3.TextureLoader().load('img/p_'+img+'.jpg');tex.repeat.set(.74,.56);tex.offset.set(.13,.4);
  mesh(geo.plane,W,0,1.0,.255,.56,.6,1,0,0,0,tex);cur=g0}
const star=y=>{const m=mesh(geo.oct,GD,0,y,0,.2,.26,.2);m.userData.spin=1;return m};

const D={
 poulet(){sph(W,0,.5,0,.7,.75,.7);sph(W,0,1.0,.1,.42);cone(OR,0,.98,.36,.06,.18,PI/2);sph(RD,0,1.24,.08,.13);sph(RD,0,1.2,-.03,.1);eyes(1.05,.27,.1,.06);legs(OR);box(RD,0,.62,.37,.08,.22,.03);tor(K,-.1,1.05,.3,.085);tor(K,.1,1.05,.3,.085);sph(W,-.36,.5,0,.14,.4,.4);sph(W,.36,.5,0,.14,.4,.4)},
 souris(){sph(0xb9bcc6,0,.38,0,.6,.6,.7);sph(0xb9bcc6,0,.8,.12,.46);sph(PK,-.24,1.06,.05,.28,.28,.08);sph(PK,.24,1.06,.05,.28,.28,.08);sph(PK,0,.76,.36,.08);eyes(.87,.3,.1,.06);cyl(PK,-.1,.3,-.42,.025,.5,.9);cyl(GD,.34,.45,.24,.15,.04,PI/2);legs(PK,.14,.12,.05,.1)},
 raclette(){cyl(0xffd23f,0,.42,0,.5,.5);cyl(0xf4a300,0,.7,0,.52,.07);for(const[x,z]of[[-.3,.42],[.25,.45],[.45,.1],[-.46,-.05]])sph(0xffd23f,x,.2,z,.16,.26,.16);eyes(.48,.47,.14,.08);box(K,0,.3,.5,.16,.04,.03);box(0xffd23f,-.58,.4,0,.2,.1,.1);box(0xffd23f,.58,.4,0,.2,.1,.1)},
 vache(){box(W,0,.55,0,.6,.5,.8);for(const x of[-.2,.2])for(const z of[-.25,.25])cyl(W,x,.15,z,.07,.3);box(W,0,.95,.35,.42,.38,.38);box(PK,0,.85,.56,.3,.16,.08);cone(0xf5e6c8,-.2,1.2,.35,.05,.14);cone(0xf5e6c8,.2,1.2,.35,.05,.14);sph(K,.22,.72,.1,.22,.12,.26);sph(K,-.26,.56,-.2,.14,.26,.26);box(K,0,.5,0,.63,.07,.83);box(RD,0,1.08,.36,.44,.05,.4);eyes(.99,.55,.1,.055)},
 fondue(){box(0xffc933,0,.42,0,.72,.6,.55);box(0xffd86b,0,.92,0,.5,.4,.45);box(0xffc933,-.5,.5,0,.22,.5,.25);box(0xffc933,.5,.5,0,.22,.5,.25);sph(0xffd86b,-.5,.2,.05,.2,.28,.2);sph(0xffd86b,.3,.12,.3,.16,.24,.16);eyes(.96,.23,.11,.06);box(K,0,.82,.23,.2,.04,.02);box(OR,-.2,.08,0,.24,.16,.3);box(OR,.2,.08,0,.24,.16,.3)},
 roi(){cyl(0xfff3d6,0,.62,0,.5,.3,PI/2);cyl(0xe8d3a0,0,.62,-.02,.53,.24,PI/2);box(RD,0,.5,-.2,.64,.74,.05);eyes(.7,.16,.14,.075);box(K,0,.48,.16,.2,.04,.02);legs(0xe8d3a0,.15,.2,.06);crown(1.17,.24)},
 piment(){sph(RD,0,.72,0,.44,.62,.44);cone(RD,0,.26,0,.17,.42,PI);cyl(0x3fa34d,0,1.08,0,.05,.18);eyes(.78,.2,.1,.09);cyl(W,.34,.55,.16,.09,.14);box(RD,.22,.6,.1,.2,.06,.06);box(RD,-.28,.7,.05,.06,.22,.06,0,0,.5)},
 saucisse(){cyl(0xb5523b,0,.68,0,.2,.76);sph(0xb5523b,0,.3,0,.4);cone(RD,0,1.2,0,.2,.32);for(const a of[0,1,2,3])box(RD,Math.cos(a*PI/2)*.26,.32,Math.sin(a*PI/2)*.26,.14,.26,.05,0,-a*PI/2,0);cone(OR,0,.02,0,.14,.3,PI);eyes(.82,.19,.08,.055)},
 mayo(){sph(0xfff8e7,0,.52,0,.62,.82,.62);cyl(K,0,.72,0,.3,.15);box(K,-.3,.74,-.14,.22,.06,.06,0,.5,0);eyes(.72,.28,.1,.05);box(SV,-.42,.52,.1,.04,.5,.04,0,0,.4);box(SV,.42,.52,.1,.04,.5,.04,0,0,-.4);legs(K,.13,.14,.05)},
 tacos(){sph(0xf2c14e,-.16,.5,0,.12,.8,.92);sph(0xf2c14e,.16,.5,0,.12,.8,.92);sph(0x7a4a22,0,.58,0,.22,.5,.72);sph(0x6fbf4a,0,.78,-.1,.26,.2,.5);sph(RD,0,.8,.24,.13);sph(K,0,1.02,0,.24);cyl(SV,0,1.17,0,.02,.1);sph(OR,0,1.24,0,.07).userData.pulse=1;eyes(.5,.44,.2,.06)},
 dragon(){sph(RD,0,.45,0,.62,.6,.72);sph(0xffd166,0,.4,.2,.42,.46,.42);cyl(RD,0,.85,.15,.13,.4,.3);box(RD,0,1.1,.3,.34,.28,.4);box(0xc1272d,0,1.05,.55,.24,.16,.2);cone(0xffd166,-.11,1.3,.2,.04,.14);cone(0xffd166,.11,1.3,.2,.04,.14);mesh(geo.cone,0xc1272d,-.48,.78,-.1,.6,.5,.06,0,0,.7).userData.flap=1;mesh(geo.cone,0xc1272d,.48,.78,-.1,.6,.5,.06,0,0,-.7).userData.flap=-1;cone(RD,0,.3,-.5,.12,.5,-1.9);eyes(1.18,.48,.1,.05)},
 kebab(){cyl(SV,0,.05,0,.4,.06);cyl(SV,0,.68,0,.03,1.3);mesh(geo.keb,0x9c5a2e,0,.6,0,.84,.8,.84);tor(0x7a4320,0,.45,0,.3,PI/2);tor(0x7a4320,0,.75,0,.38,PI/2);eyes(.78,.37,.12,.07);box(K,0,.6,.36,.18,.04,.03);crown(1.12,.2)},
 grenouille(){sph(0x5fbf4a,0,.36,0,.8,.56,.7);sph(0x5fbf4a,-.2,.68,.1,.25);sph(0x5fbf4a,.2,.68,.1,.25);eyes(.71,.2,.2,.075);cyl(W,0,.2,0,.37,.17);sph(0x5fbf4a,-.4,.12,.15,.26,.15,.36);sph(0x5fbf4a,.4,.12,.15,.26,.15,.36);box(K,0,.42,.35,.3,.025,.03)},
 canard(){tor(0x4cc9f0,0,.12,0,.5,PI/2);sph(0xffd23f,0,.4,0,.6,.5,.7);sph(0xffd23f,0,.82,.15,.4);box(OR,0,.78,.4,.2,.07,.16);eyes(.9,.3,.11,.05);cone(0xffd23f,0,.5,-.4,.12,.25,-1);sph(W,.4,.25,.3,.1);sph(W,-.42,.3,.2,.07)},
 chaussette(){box(0x8e6bd8,0,.66,-.05,.4,.8,.4);box(0x8e6bd8,0,.2,.12,.4,.34,.7);sph(PK,0,.2,.45,.4,.33,.3);box(W,0,1.1,-.05,.45,.14,.45);box(PK,0,.82,-.05,.42,.08,.42);eyes(.68,.16,.1,.07)},
 croco(){box(0x4f9d3f,0,.3,-.05,.5,.3,.9);box(0x4f9d3f,0,.3,.6,.36,.2,.5);for(const x of[-.15,.15])for(const z of[.45,.6,.75])cone(W,x,.17,z,.03,.08,PI);sph(0x4f9d3f,-.14,.5,.3,.17);sph(0x4f9d3f,.14,.5,.3,.17);eyes(.53,.36,.14,.05);cone(0x4f9d3f,0,.28,-.72,.2,.6,-PI/2);for(const x of[-.32,.32])for(const z of[-.25,.25])box(0x3c7a30,x,.1,z,.14,.2,.18);sph(PK,-.2,.36,.74,.09,.06,.06);sph(PK,.2,.36,.74,.09,.06,.06)},
 ogre(){sph(0x7dbb5a,0,.55,0,.9,.85,.75);sph(0x7dbb5a,0,1.1,.05,.5);cone(W,-.12,1.0,.28,.04,.14);cone(W,.12,1.0,.28,.04,.14);eyes(1.18,.27,.12,.06);box(BR,0,.25,0,.72,.25,.62);box(PK,-.25,.03,.15,.24,.05,.45);box(PK,.25,.03,.15,.24,.05,.45);cyl(BR,.62,.62,.1,.09,.8,0,0,-.3);sph(0x7dbb5a,-.5,.6,0,.3,.5,.3);sph(0x7dbb5a,.5,.6,0,.3,.5,.3)},
 lavabo(){tor(W,0,.12,0,.5,PI/2);sph(0x9d5cff,0,.72,0,.62,.72,.62);for(let i=0;i<6;i++){const a=i/6*PI*2+.3;cyl(0x9d5cff,Math.cos(a)*.4,.3,Math.sin(a)*.4,.07,.5,Math.sin(a)*.5,0,-Math.cos(a)*.5)}eyes(.78,.27,.13,.085);sph(0x4cc9f0,.3,1.15,.1,.08,.12,.08);sph(0x4cc9f0,-.25,1.2,0,.06,.1,.06)},
 pigeon(){sph(0x9aa3b2,0,.42,0,.5,.55,.6);sph(0x9aa3b2,0,.85,.1,.34);tor(0x6ad6a0,0,.68,.06,.17,PI/2);cone(OR,0,.83,.32,.05,.14,PI/2);eyes(.9,.23,.09,.05);legs(OR,.1,.16,.03);box(BR,.38,.3,.1,.26,.2,.08);box(K,.38,.43,.1,.1,.03,.03);box(0x3a86ff,0,.52,.3,.06,.2,.02);sph(0x7d8798,-.26,.45,0,.12,.4,.45);sph(0x7d8798,.26,.45,0,.12,.4,.45)},
 fantome(){sph(W,0,.8,0,.62);cyl(W,0,.5,0,.31,.55);for(let i=0;i<5;i++){const a=i/5*PI*2;sph(W,Math.cos(a)*.2,.22,Math.sin(a)*.2,.22)}cyl(K,0,1.24,0,.2,.26);cyl(K,0,1.1,0,.3,.03);sph(K,-.1,.85,.28,.07,.11,.04);sph(K,.1,.85,.28,.07,.11,.04);box(RD,0,.58,.3,.16,.07,.03);tor(GD,.1,.85,.3,.085)},
 mouton(){sph(W,0,.5,0,.72,.56,.76);sph(W,-.25,.66,.1,.36);sph(W,.25,.66,.1,.36);sph(W,0,.76,-.15,.42);sph(W,-.2,.46,-.26,.36);sph(W,.2,.46,-.26,.36);box(K,0,.6,.42,.28,.3,.22);eyes(.66,.54,.07,.045);for(const x of[-.18,.18])for(const z of[-.15,.15])cyl(K,x,.12,z,.05,.24);const b=box(0xffe14d,0,1.3,0,.08,.3,.05,0,0,.5);b.userData.pulse=1;box(0xffe14d,.05,1.1,0,.08,.3,.05,0,0,-.5).userData.pulse=1},
 licorne(){box(W,0,.5,-.05,.4,.4,.7);for(const x of[-.14,.14])for(const z of[-.3,.2])cyl(W,x,.16,z,.06,.32);box(W,0,.85,.25,.24,.5,.24,.4);box(W,0,1.1,.42,.26,.24,.4);cone(GD,0,1.36,.4,.05,.3);sph(PK,0,1.12,.18,.2);sph(0x7fd4ff,0,.98,.08,.2);sph(0xffe14d,0,.84,.02,.2);sph(PK,0,.55,-.5,.22);box(K,-.135,1.12,.5,.012,.02,.1);box(K,.135,1.12,.5,.012,.02,.1)},
 ovni(){sph(SV,0,.75,0,1.1,.24,1.1);sph(0x7dbb5a,0,.94,0,.26);eyes(.97,.11,.06,.04);tor(0x7fd4ff,0,.86,0,.24,PI/2);for(let i=0;i<6;i++){const a=i/6*PI*2;sph(0xffe14d,Math.cos(a)*.44,.7,Math.sin(a)*.44,.08).userData.pulse=1}cyl(W,0,.5,0,.01,.3);box(BR,0,.25,0,.3,.26,.3);box(0xf5e6c8,0,.25,0,.31,.05,.31)},
 baleine(){sph(0x3a86ff,0,.7,0,.8,.65,1.2);sph(0xbfe3ff,0,.6,.05,.7,.5,1.0);cone(0x3a86ff,0,.75,-.7,.12,.4,-PI/2);box(0x3a86ff,0,.75,-.95,.5,.05,.2);box(0x3a86ff,-.45,.55,.1,.3,.05,.2,0,0,.4);box(0x3a86ff,.45,.55,.1,.3,.05,.2,0,0,-.4);eyes(.76,.5,.3,.06);sph(W,0,1.15,.2,.09);sph(W,0,1.3,.2,.06);sph(W,-.3,.2,0,.3,.18,.3);sph(W,.3,.18,.1,.3,.18,.3)},
 mateo(){friend('mateo',0xd62828);sph(0x8a4b2a,.42,.52,.22,.2,.15,.32);box(W,.42,.52,.22,.21,.02,.1);star(1.62)},
 kilyan(){friend('kilyan',0x222831);cyl(0x8d99ae,.44,.82,0,.03,.44,0,0,PI/2);sph(K,.24,.82,0,.18);sph(K,.64,.82,0,.18);box(SV,-.4,.33,.22,.3,.02,.2);box(0x4cc9f0,-.4,.44,.12,.3,.2,.02,-.3);star(1.62)},
 jonathan(){friend('jonathan',0x3a86ff,-.2);friend('jonathan',0x3a86ff,.42,.62);star(1.62)},
 florian(){friend('florian',0x2a9d8f);box(RD,0,.5,-.17,.5,.6,.03);box(W,-.11,.03,.06,.18,.07,.3);box(W,.11,.03,.06,.18,.07,.3);star(1.62)},
 josselin(){friend('josselin',0x8ecae6);box(W,.44,.36,.16,.28,.22,.12);box(RD,.44,.36,.225,.16,.05,.01);box(RD,.44,.36,.225,.05,.16,.01);star(1.62)},
 leo(){friend('leo',0xf77f00);box(0xffd23f,0,.25,.46,.92,.4,.08);box(0xffd23f,0,1.38,0,.62,.1,.56);star(1.7)},
 tony(){friend('tony',0x7b2cbf);cyl(GD,.44,.58,.1,.1,.2);cyl(GD,.44,.44,.1,.03,.1);box(GD,.44,.38,.1,.16,.04,.16);box(K,0,1.02,.27,.5,.1,.02);star(1.62)},
 moi(){friend('moi',0x1b1035);box(0xffc933,0,.5,-.17,.52,.62,.03);const g=cur,c=new T3.Group();c.position.y=0;g.add(c);cur=c;crown(1.42,.27);cur=g},
};
const FLY={montgolfiere:.3,moustique:.35,orage:.4,ovni:.52,baleine:.3,fantome:.3,saucisse:.5};
/* ---------- modèles sculptés dans Blockbench (bbmodels.js) ---------- */
const bbTex={};let ready=Promise.resolve();
if(window.BB)ready=Promise.all(Object.keys(BB).map(id=>new Promise(res=>{const im=new Image(),t=new T3.Texture(im);t.generateMipmaps=false;t.minFilter=t.magFilter=T3.LinearFilter;bbTex[id]=t;im.onload=()=>{t.needsUpdate=true;res()};im.onerror=res;im.src=BB[id].tex})));
/* photos des potes, chargées une fois pour toutes */
/* cadrage de chaque photo sur le visage : [x0,y0,x1,y1] dans l'image 300x400 */
const CROP={florian:[50,60,260,290],jonathan:[20,30,290,325],josselin:[20,40,250,290],kilyan:[55,30,240,232],leo:[78,35,198,166],mateo:[100,85,180,172],moi:[45,40,135,138],tony:[120,55,225,170]};
const photoTex={};if(typeof C!=='undefined')ready=Promise.all([ready,...Object.keys(C).filter(id=>C[id].img).map(id=>new Promise(res=>{const im=new Image(),cv=document.createElement('canvas');cv.width=256;cv.height=278;const t=new T3.CanvasTexture(cv);photoTex[id]=t;
  im.onload=()=>{const c=CROP[id]||[39,96,261,320],sx=im.width/300,sy=im.height/400;cv.getContext('2d').drawImage(im,c[0]*sx,c[1]*sy,(c[2]-c[0])*sx,(c[3]-c[1])*sy,0,0,256,278);t.needsUpdate=true;res()};im.onerror=res;im.src=C[id].img}))]);
const dec=(s,A)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new A(u.buffer)};
function bbGeom(n){if(n._g)return n._g;const p=dec(n.p,Int16Array),f=new Float32Array(p.length);for(let i=0;i<p.length;i++)f[i]=p[i]/64;const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(f,3));g.setAttribute('normal',new T3.BufferAttribute(dec(n.nm,Int8Array),3,true));g.setAttribute('uv',new T3.BufferAttribute(dec(n.uv,Uint16Array),2,true));g.setIndex(new T3.BufferAttribute(dec(n.ix,Uint16Array),1));return n._g=g}
function bb(id){const d=BB[id],fill=mat(0xffffff,bbTex[id]),out=outMat(),root=new T3.Group(),bones={};root.scale.setScalar(1/16);
  const R=(o,r)=>{o.rotation.order='ZYX';o.rotation.set(r[0]*PI/180,r[1]*PI/180,r[2]*PI/180)};
  const walk=(n,par,po)=>{const o=n.c?new T3.Group():new T3.Mesh(bbGeom(n),fill);o.position.set(n.o[0]-po[0],n.o[1]-po[1],n.o[2]-po[2]);R(o,n.r);par.add(o);
    if(n.c){bones[n.n]=o;o.userData.rest=o.rotation.clone();n.c.forEach(k=>walk(k,o,n.o))}else o.add(new T3.Mesh(o.geometry,out))};
  d.root.forEach(n=>walk(n,root,[0,0,0]));cur.add(root);return bones}
return{build(id,tint){const g=new T3.Group();U={uTint:{value:new T3.Color(tint)},uTime:{value:0},uReveal:{value:0},uBaseY:{value:0},uFlash:{value:0},uHolo:{value:1},uOut:{value:.026}};cur=g;
  let bones=null;if(window.BB&&BB[id]){bones=bb(id);
    /* la photo du pote, posée sur l'os « photo » du modèle */
    const d=typeof C!=='undefined'&&C[id];if(d&&d.img)for(const n in bones)if(n.startsWith('photo')){const sc=+(n.split('@')[1]||1),tex=photoTex[id];const g0=cur;cur=bones[n];mesh(geo.plane,W,0,0,0,9.3*sc,10.1*sc,1,0,0,0,tex);cur=g0}}else (D[id]||(()=>{sph(0xff66cc,0,.5,0,.8);eyes(.6,.36)}))();
  const extra=[];g.traverse(o=>{if(o.userData.spin||o.userData.pulse||o.userData.flap)extra.push(o)});
  return{g,U,fly:FLY[id]||0,extra,bones}},geo,ready,
 /* fait bouger les os : t = temps, ph = décalage, k = avancée de l'attaque (0 = repos) */
 pose(m,t,ph,k){const b=m.bones;if(!b)return;const S=Math.sin,a=S(Math.min(1,Math.max(0,k))*PI),set=(n,x,y,z)=>{const o=b[n];if(o){const r=o.userData.rest;o.rotation.set(r.x+x,r.y+y,r.z+z)}};
  set('head',S(t*2.2+ph)*.05+a*.3,S(t*1.3+ph)*.12,S(t*1.7+ph)*.05);
  set('arm_l',S(t*2.6+ph)*.14-a*1.5,0,-a*.25);set('arm_r',-S(t*2.6+ph)*.14-a*1.5,0,a*.25);
  const f=.1+Math.abs(S(t*5+ph))*.3+a*.9;set('wing_l',0,0,-f);set('wing_r',0,0,f);
  set('leg_l',S(t*2.6+ph)*.1+a*.5,0,0);set('leg_r',-S(t*2.6+ph)*.1+a*.5,0,0);
  set('tail',S(t*3+ph)*.08,S(t*3.4+ph)*.3,0);
  if(b.star)b.star.rotation.y=t*2.5;
  if(b.flame)b.flame.scale.set(1+S(t*23)*.08,1+S(t*31)*.2+a*.9,1+S(t*27)*.08)},
 /* dessine le modèle en vraies couleurs dans une image (pour l'illustration des cartes) */
 snap(id,size){if(!snapR){snapR=new T3.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});snapR.outputColorSpace=T3.LinearSRGBColorSpace}snapR.setSize(size||256,size||256,false);
  const m=this.build(id,0xffffff);m.U.uHolo.value=0;m.U.uReveal.value=99;m.U.uOut.value=.034;m.g.rotation.y=-.5;
  const sc=new T3.Scene();sc.add(m.g);m.g.updateMatrixWorld(true);const bb=new T3.Box3().setFromObject(m.g),c=bb.getCenter(new T3.Vector3()),r=Math.max(bb.max.x-bb.min.x,bb.max.y-bb.min.y,bb.max.z-bb.min.z)*.6;
  const cam=new T3.OrthographicCamera(-r,r,r,-r,.1,50);cam.position.set(c.x,c.y+r*.55,c.z+8);cam.lookAt(c);snapR.render(sc,cam);const url=snapR.domElement.toDataURL();
  m.g.traverse(o=>{if(o.material)o.material.dispose()});return url}};
})();
