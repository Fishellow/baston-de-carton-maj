/* Parties en ligne : connexion directe entre joueurs (PeerJS / WebRTC) avec un code de partie.
   Duel : 1 hôte + 1 invité. 2 contre 2 : 1 hôte + jusqu'à 3 invités, tout passe par l'hôte qui fait suivre. */
const NET={peer:null,conns:[],max:1,onData:()=>{},onClose:()=>{},
  get conn(){return this.conns[0]||null},
  host(code,onReady,onErr,max){this.stop();this.max=max||1;this.peer=new Peer('bdc-'+code);
    this.peer.on('open',onReady);this.peer.on('error',onErr);
    this.peer.on('connection',c=>{if(this.conns.length>=this.max){c.on('open',()=>{try{c.send({t:'full'});}catch(e){}setTimeout(()=>c.close(),400)});return}this.conns.push(c);this.wire(c)})},
  join(code,onOpen,onErr){this.stop();this.max=1;this.peer=new Peer();this.peer.on('error',onErr);
    this.peer.on('open',()=>{const c=this.peer.connect('bdc-'+code,{reliable:true});this.conns.push(c);this.wire(c,onOpen)})},
  wire(c,onOpen){let dead=false;const lost=()=>{if(dead)return;dead=true;clearInterval(c.hb);const i=this.conns.indexOf(c);if(i<0)return;this.conns.splice(i,1);this.onClose(c)};
    c.on('open',()=>{c.last=Date.now();
      /* petit signal toutes les 3 s : si plus rien pendant 12 s, le pote est parti */
      c.hb=setInterval(()=>{if(c.open)c.send({t:'ping'});if(Date.now()-c.last>12000)lost()},3000);
      onOpen&&onOpen()});
    c.on('data',d=>{c.last=Date.now();if(!d||d.t==='ping')return;if(d.t==='bye')return lost();this.onData(d,c)});
    c.on('close',lost);c.on('error',lost)},
  /* à tout le monde (sauf, si on veut, celui qui vient de l'envoyer) */
  send(o,except){for(const c of this.conns)if(c!==except&&c.open)c.send(o)},
  to(c,o){if(c&&c.open)c.send(o)},
  stop(){this.send({t:'bye'});this.conns.forEach(c=>clearInterval(c.hb));const p=this.peer;this.peer=null;this.conns=[];if(p)setTimeout(()=>{try{p.destroy()}catch(e){}},200)},
};
addEventListener('beforeunload',()=>NET.send({t:'bye'}));
