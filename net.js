/* Duel en ligne : connexion directe entre deux joueurs (PeerJS / WebRTC) avec un code de partie. */
const NET={peer:null,conn:null,hb:null,last:0,onData:()=>{},onClose:()=>{},
  host(code,onReady,onErr){this.stop();this.peer=new Peer('bdc-'+code);
    this.peer.on('open',onReady);this.peer.on('error',onErr);
    this.peer.on('connection',c=>{if(this.conn){c.close();return}this.conn=c;this.wire()})},
  join(code,onOpen,onErr){this.stop();this.peer=new Peer();this.peer.on('error',onErr);
    this.peer.on('open',()=>{this.conn=this.peer.connect('bdc-'+code,{reliable:true});this.wire(onOpen)})},
  wire(onOpen){const c=this.conn;let dead=false;const lost=()=>{if(dead||this.conn!==c)return;dead=true;clearInterval(this.hb);this.onClose()};
    c.on('open',()=>{this.last=Date.now();
      /* petit signal toutes les 3 s : si plus rien pendant 12 s, le pote est parti */
      this.hb=setInterval(()=>{this.send({t:'ping'});if(Date.now()-this.last>12000)lost()},3000);
      onOpen&&onOpen()});
    c.on('data',d=>{this.last=Date.now();if(!d||d.t==='ping')return;if(d.t==='bye')return lost();this.onData(d)});
    c.on('close',lost);c.on('error',lost)},
  send(o){if(this.conn&&this.conn.open)this.conn.send(o)},
  stop(){clearInterval(this.hb);this.send({t:'bye'});const p=this.peer;this.peer=null;this.conn=null;if(p)setTimeout(()=>{try{p.destroy()}catch(e){}},200)},
};
addEventListener('beforeunload',()=>NET.send({t:'bye'}));
