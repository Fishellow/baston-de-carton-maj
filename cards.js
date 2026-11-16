/* Toutes les cartes du jeu. Rareté : C commune, R rare, E épique, L légendaire. */
/* chaque terrain a un petit effet pour celui à qui il appartient (voir game.js) */
const T={fromage:{n:'Plaine de Fromage',x:'Ta créature ici regagne 1 PV à la fin de ton tour.'},sauce:{n:'Volcan à Sauce',x:'La créature ennemie qui arrive en face prend 1 dégât.'},
  slip:{n:'Marais du Slip',x:'Ta créature ici arrive avec +1 PV.'},nuage:{n:'Nuage Mou',x:'Si ta créature ici est mise K.O., tu pioches 1 carte.'},pote:{n:'Pote légendaire',x:''}};
/* pouvoirs de héros : 1 fois par tour, 2 énergies. Ils dépendent de l'avatar. */
const POWERS={draw:{n:'Bonne pioche',x:'Pioche 1 carte'},dmg:{n:'Coup de boule',x:'1 dégât au héros adverse'},heal:{n:'Petit goûter',x:'Soigne ton héros de 2'},shield:{n:'Couvercle',x:'Bouclier 1 à ta créature la plus forte'}};
const POWER_OF={poulet:'draw',pigeon:'draw',ovni:'draw',licorne:'draw',dragon:'dmg',piment:'dmg',kebab:'dmg',ogre:'dmg',grenouille:'heal',canard:'heal',raclette:'heal',vache:'heal',baleine:'heal',souris:'shield',chaussette:'shield',fantome:'shield',mouton:'shield',roi:'shield'};
const powerOf=f=>POWER_OF[f]||({fromage:'heal',sauce:'dmg',slip:'shield',nuage:'draw'})[(C[f]||{}).t]||'draw';
const RAR={C:{n:'Commune',col:'#9aa0a6',max:2,dust:5},R:{n:'Rare',col:'#3a86ff',max:2,dust:15},E:{n:'Épique',col:'#b5179e',max:2,dust:40},L:{n:'Légendaire',col:'#ffb703',max:1,dust:120}};
const cr=(n,t,r,c,a,h,e,x,o={})=>({n,t,r,c,a,h,e,x,k:'c',...o});
const po=(n,img,c,a,h,x,o={})=>({n,t:'pote',r:'L',c,a,h,img:'img/p_'+img+'.jpg',x,k:'c',...o});
const sp=(n,r,c,e,x,tgt,cast)=>({n,r,c,e,x,tgt,cast,k:'s'});
/* NL = nombre de couloirs de la partie en cours (4 en classique, 6 en Grande Baston) */
let NL=4;
const allFoes=async(s,n)=>{for(let l=0;l<NL;l++)await hurt(opp(s),l,n)};
/* bâtiment : se pose sur un de tes couloirs et y reste. atk = bonus d'attaque, arrive/start/end = effets (voir game.js) */
const bd=(n,t,r,c,x,o={})=>({n,t,r,c,x,k:'b',e:'',...o});
const C={
 poulet:cr('Poulet Comptable','fromage','C',1,1,2,'🐔|🧮','Arrivée : pioche 1 carte.',{play:s=>draw(s)}),
 souris:cr('Souris Racketteuse','fromage','C',1,2,1,'🐭|💰','K.O. : tu pioches 1 carte.',{death:s=>draw(s)}),
 raclette:cr('Raclette Vivante','fromage','C',2,2,3,'🫕|👀','Elle coule. Elle colle. Elle cogne.'),
 vache:cr('Vache Kung-Fu','fromage','R',3,3,4,'🐄|🥋','Ceinture noire de meuh.'),
 fondue:cr('Golem de Fondue','fromage','E',4,3,7,'🗿|🧀','Se soigne de 1 à la fin de ton tour.',{regen:1}),
 roi:cr('Roi Camembert','fromage','E',5,4,6,'🧀|👑','Arrivée : tes autres créatures gagnent +1 attaque.',{play:(s,l)=>each(s,(c,i)=>{if(i!==l)buff(s,i,1,0)})}),
 piment:cr('Piment Nerveux','sauce','C',1,2,1,'🌶️|☕','Il a bu 9 cafés.'),
 saucisse:cr('Saucisse Missile','sauce','C',2,3,1,'🌭|🚀','Perce : les dégâts en trop touchent le héros.',{perce:1}),
 mayo:cr('Ninja Mayo','sauce','C',2,1,3,'🥷|🥚','Attaque 2 fois.',{double:1}),
 tacos:cr('Tacos Explosif','sauce','R',3,4,2,'🌮|💣','K.O. : 2 dégâts au héros ennemi.',{death:s=>hurtH(opp(s),2)}),
 dragon:cr('Dragon Ketchup','sauce','R',4,5,3,'🐉|🍅','Arrivée : 2 dégâts à la créature d\'en face.',{play:(s,l)=>hurt(opp(s),l,2)}),
 kebab:cr('Kebab Suprême','sauce','E',6,7,5,'🥙|👑','Perce. Sauce blanche harissa.',{perce:1}),
 grenouille:cr('Grenouille en Slip','slip','C',1,1,3,'🐸|🩲','Elle assume totalement.'),
 canard:cr('Canard de Bain','slip','C',1,0,4,'🦆|🛁','Arrivée : soigne ton héros de 2.',{play:s=>healH(s,2)}),
 chaussette:cr('Chaussette Maudite','slip','C',2,1,4,'🧦|👻','K.O. : 2 dégâts à la créature d\'en face.',{death:(s,l)=>hurt(opp(s),l,2)}),
 croco:cr('Crocodile Timide','slip','R',3,2,6,'🐊|😳','Il ose pas trop mordre.'),
 ogre:cr('Ogre en Tongs','slip','E',5,6,5,'🧌|🩴','Clap. Clap. Clap. BAM.'),
 lavabo:cr('Monstre du Lavabo','slip','E',5,4,7,'🦑|🚰','Se soigne de 2 à la fin de ton tour.',{regen:2}),
 pigeon:cr('Pigeon Stagiaire','nuage','C',1,1,1,'🐦|💼','Vol : tape toujours le héros direct.',{vol:1}),
 fantome:cr('Fantôme Poli','nuage','R',2,2,1,'👻|🎩','Vol : tape toujours le héros direct.',{vol:1}),
 mouton:cr('Mouton Électrique','nuage','R',2,2,2,'🐑|⚡','Arrivée : 1 dégât à toutes les créatures ennemies.',{play:s=>allFoes(s,1)}),
 licorne:cr('Licorne Fatiguée','nuage','R',3,3,3,'🦄|💤','Arrivée : soigne ton héros de 3.',{play:s=>healH(s,3)}),
 ovni:cr('Ovni Livreur','nuage','E',4,3,4,'🛸|📦','Arrivée : pioche 2 cartes.',{play:s=>draw(s,2)}),
 baleine:cr('Baleine Volante','nuage','E',6,5,8,'🐋|☁️','Personne sait comment elle vole.'),
 mateo:po('Mateo le Plaqueur','mateo',4,4,5,'Arrivée : plaque la créature d\'en face (elle rate son attaque).',{play:(s,l)=>stun(opp(s),l)}),
 kilyan:po('Kilyan, Vibe Codeur','kilyan',3,2,4,'La salle : +1 attaque à chaque fin de tour. Vibe code : pioche 1 carte. Pas con, le gars.',{gym:1,play:s=>draw(s)}),
 jonathan:po('Jonathan (et Jonathan)','jonathan',4,3,3,'Prévoit tout en double : attaque 2 fois.',{double:1}),
 florian:po('Florian est passé par là','florian',2,2,2,'Arrivée : 2 dégâts au héros ennemi.',{play:s=>hurtH(opp(s),2)}),
 josselin:po('Josselin le Sauveur','josselin',3,2,5,'Arrivée : soigne toutes tes créatures de 2.',{play:s=>each(s,(c,i)=>healC(s,i,2))}),
 leo:po('Léo le Bulldozer','leo',5,5,5,'Perce : les dégâts en trop touchent le héros.',{perce:1}),
 tony:po('Tony la Légende','tony',2,1,3,'K.O. : tu pioches 2 cartes.',{death:s=>draw(s,2)}),
 moi:po('Le Boss','moi',6,4,6,'Arrivée : toutes tes créatures gagnent +1/+1.',{play:s=>each(s,(c,i)=>buff(s,i,1,1))}),
 /* --- nouvelles mécaniques : Bouclier, Poison, Rage, Vampire, Retour, Livraison, Orage --- */
 gruyere:cr('Chevalier Gruyère','fromage','R',3,2,4,'🛡️|🧀','Bouclier 1 : ignore le premier coup.',{shield:1}),
 brie:cr('Brie Zombie','fromage','C',2,2,2,'🧟|🧀','K.O. : revient une fois avec 1 PV.',{revive:1}),
 wasabi:cr('Wasabi Sournois','sauce','R',2,1,3,'🥬|☠️','Poison : sa victime perd 1 PV à chaque tour.',{poison:1}),
 barbecue:cr('Barbecue Enragé','sauce','E',4,3,5,'🔥|😡','Rage : +1 attaque à chaque coup encaissé.',{rage:1}),
 moustique:cr('Moustique Vampire','slip','C',1,1,2,'🦟|🧛','Vampire : soigne ton héros de 1 quand il attaque.',{vamp:1}),
 tortue:cr('Tortue Blindée','slip','R',3,1,6,'🐢|🛡️','Bouclier 2 : ignore les deux premiers coups.',{shield:2}),
 cigogne:cr('Cigogne Livreuse','nuage','R',3,2,3,'🦩|📦','Arrivée : livre un Pigeon Stagiaire dans un couloir voisin libre.',{summon:'pigeon'}),
 orage:cr('Nuage Grognon','nuage','E',5,3,5,'🌩️|😠',"Fin de ton tour : 1 dégât à la créature d'en face.",{aura:1}),
 claque:sp('Claque Cosmique','C',1,'🖐️','Mini-jeu : 1 à 3 dégâts à une créature ennemie.','enemy',(s,l,q=1)=>hurt(opp(s),l,1+q)),
 cafe:sp('Café Serré','C',1,'☕','Pioche 2 cartes.',null,s=>draw(s,2)),
 pizza:sp('Pizza Ananas','C',1,'🍍','Mini-jeu : 2 à 5 dégâts au héros ennemi. Il le mérite.',null,(s,l,q=1)=>hurtH(opp(s),[2,3,5][q])),
 gouter:sp('Goûter de Mamie','C',2,'🍪','+2/+2 à une de tes créatures.','ally',(s,l)=>buff(s,l,2,2)),
 sieste:sp('Sieste Obligatoire','R',2,'😴','Une créature ennemie rate sa prochaine attaque.','enemy',(s,l)=>stun(opp(s),l)),
 prout:sp('Prout Tactique','R',2,'💨','1 dégât à toutes les créatures ennemies. Pioche 1 carte.',null,async s=>{await allFoes(s,1);await draw(s)}),
 pluie:sp('Pluie de Cornichons','E',3,'🥒','2 dégâts à toutes les créatures ennemies.',null,s=>allFoes(s,2)),
 meteor:sp('Météorite de Poche','E',4,'☄️','Mini-jeu : 4 à 7 dégâts à une créature ennemie.','enemy',(s,l,q=1)=>hurt(opp(s),l,[4,5,7][q])),
 couvercle:sp('Couvercle de Poubelle','C',1,'🗑️','Donne Bouclier 2 à une de tes créatures.','ally',(s,l)=>shieldC(s,l,2)),
 chaussale:sp('Chaussette Sale','R',2,'🦠','Empoisonne une créature ennemie : -2 PV à chaque tour.','enemy',(s,l)=>poisonC(opp(s),l,2)),
 /* --- 5e série --- */
 parmesan:cr('Râpe à Parmesan','fromage','R',3,3,3,'','Perce : les dégâts en trop touchent le héros.',{perce:1}),
 yaourt:cr('Yaourt Périmé','fromage','C',2,1,3,'','Poison : sa victime perd 1 PV à chaque tour.',{poison:1}),
 moutarde:cr('Moutarde qui Monte','sauce','R',3,2,4,'','Rage : +1 attaque à chaque coup encaissé.',{rage:1}),
 frite:cr('Frite Sprinteuse','sauce','C',1,2,1,'','Vol : tape toujours le héros direct.',{vol:1}),
 escargot:cr('Escargot Pressé','slip','C',2,0,5,'',"Il s'entraîne : +1 attaque à chaque fin de tour.",{gym:1}),
 castor:cr('Castor Bricoleur','slip','R',3,2,3,'','Arrivée : construit une Cabane en Carton sur son couloir.',{buildOn:'cabane'}),
 hibou:cr('Hibou Insomniaque','nuage','R',3,2,3,'',"Arrivée : pioche 1 carte et endort la créature d'en face.",{play:async(s,l)=>{await draw(s);stun(opp(s),l)}}),
 montgolfiere:cr('Montgolfière Trouillarde','nuage','E',4,2,6,'','Vol. Bouclier 1 : ignore le premier coup.',{vol:1,shield:1}),
 /* --- bâtiments --- */
 cabane:bd('Cabane en Carton','pote','C',1,'Ta créature ici arrive avec Bouclier 1.',{bh:3,arriveShield:1}),
 fromagerie:bd('Fromagerie','fromage','C',2,'Ta créature ici a +1 attaque.',{bh:3,atk:1}),
 laverie:bd('Laverie du Marais','slip','C',2,'Fin de ton tour : soigne ta créature ici de 2.',{bh:3,endHeal:2}),
 friterie:bd('Baraque à Frites','sauce','R',3,'Fin de ton tour : 1 dégât au héros ennemi.',{bh:4,endHero:1}),
 salle:bd('Salle de Sport','pote','R',3,'Fin de ton tour : ta créature ici gagne +1 attaque.',{bh:4,endGym:1}),
 tirelire:bd('Tirelire Géante','pote','R',3,'Début de ton tour : +1 énergie pour ce tour.',{bh:4,startNrj:1}),
 phare:bd('Phare des Nuages','nuage','E',4,'Début de ton tour : pioche 1 carte de plus.',{bh:5,startDraw:1}),
 catapulte:bd('Catapulte à Cornichons','slip','E',4,"Fin de ton tour : 2 dégâts à la créature d'en face.",{bh:5,endHit:2}),
 qg:bd('Quartier Général','pote','L',0,"Grande Baston. S'il est détruit, tu perds 5 PV d'un coup.",{bh:8,qg:1,hidden:1}),
 chaises:sp('Chaises Musicales','E',3,'🪑','Renvoie une créature ennemie dans la main de son propriétaire.','enemy',(s,l)=>bounce(opp(s),l)),
};
for(const id of['claque','pizza','meteor'])C[id].mg=1;
/* IDS = les cartes qu'on peut avoir (le quartier général n'en fait pas partie) */
const IDS=Object.keys(C).filter(id=>!C[id].hidden);
const STARTER=['poulet','poulet','souris','souris','raclette','raclette','piment','piment','saucisse','saucisse','grenouille','grenouille','chaussette','chaussette','pigeon','pigeon','claque','claque','cafe','gouter'];
function cardHTML(id,inst,mini,cls=''){const d=C[id];
  let art;const P=window.PORT&&PORT[id];if(P)art=`<img class="port" src="${P}" alt="">`;else if(d.img)art=`<img src="${d.img}" alt="">`;else art='';
  let st='';
  if(d.k==='b')st=`<div class="st h">${inst&&inst.bhp!=null?inst.bhp:d.bh}</div>`;
  if(d.k==='c'){const a=inst?inst.shownAtk:d.a,h=inst?inst.hp:d.h;
    st=`<div class="st a ${inst&&a>d.a?'up':''}">${a}</div><div class="st h ${inst&&h<inst.max?'dn':inst&&h>d.h?'up':''}">${h}</div>`}
  const kind=d.k==='s'?'Sort':d.k==='b'?'Bâtiment':'';
  return `<div class="card r-${d.r} ${d.k==='s'?'spell':'t-'+d.t} ${d.k==='b'?'build':''} ${mini?'mini':''} ${d.r==='L'?'holo':''} ${cls}" data-id="${id}">
    <div class="gem">${d.c}</div><div class="nm">${d.n}</div><div class="art">${art}</div>
    <div class="rar" style="background:${RAR[d.r].col}"></div>
    <div class="tx${d.x.length>75?' xlong':d.x.length>48?' long':''}">${kind?'<b class="kd">'+kind+'</b> ':''}${d.x}</div>${st}${inst&&inst.stun?'<div class="zz">'+IC('sleep')+'</div>':''}${inst&&inst.shield?'<div class="zz zl">'+IC('shield')+'</div>':''}${inst&&inst.poison?'<div class="zz zl2">'+IC('drop')+'</div>':''}${inst&&inst.evo?'<div class="evo">Évolué</div>':''}${inst&&inst.fused?'<div class="evo fu">Fusion</div>':''}</div>`}
