/* Mise en relation à deux chemins.
   1) PeerJS (liaison en direct avec 0.peerjs.com) : rapide, mais bloquée chez certains joueurs.
   2) Secours : du simple trafic web (https) via ntfy.sh. Chaque jeu « écoute » un canal à son nom ;
      pour joindre quelqu'un on dépose une demande sur son canal, il répond sur le nôtre, puis les deux jeux se parlent en direct (WebRTC).
   XPeer s'utilise comme Peer (open / connection / error, connect, destroy) et choisit le chemin tout seul.
   Le chemin de secours est limité en nombre de messages par jour : on ne l'utilise pour les amis hors ligne que de temps en temps. */
const XICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }] };
const XHOST = 'https://ntfy.sh/', XLAST = {};
const xTopic = id => 'bdcx_' + String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
const xGather = pc => new Promise(r => { if (pc.iceGatheringState === 'complete') return r(); const t = setTimeout(r, 2500); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } }); });
class XEmit { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, a) { (this.h[e] || []).slice().forEach(f => { try { f(a); } catch (err) { console.error(err); } }); } }
/* une liaison avec un autre joueur, quel que soit le chemin qui l'a ouverte */
class XConn extends XEmit {
  constructor(peer) { super(); this.peer = peer; this.open = false; this.dead = false; }
  usePJ(c, already) { this.pj = c; const up = () => { if (this.dead || this.open) return; this.open = true; this.emit('open'); }; c.on('open', up); c.on('data', d => this.emit('data', d)); c.on('close', () => this.end()); c.on('error', () => this.end()); if (already) up(); }
  useDC(pc, dc) { this.pc = pc; this.dc = dc; dc.onopen = () => { if (this.dead) return; this.open = true; this.emit('open'); }; dc.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } this.emit('data', d); }; dc.onclose = () => this.end(); pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.end(); }); }
  send(o) { try { if (this.pj) this.pj.send(o); else if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(o)); } catch (e) { } }
  end() { if (this.dead) return; this.dead = true; this.open = false; try { this.pj && this.pj.close(); } catch (e) { } try { this.dc && this.dc.close(); this.pc && this.pc.close(); } catch (e) { } this.emit('close'); }
  close() { this.end(); }
}
class XPeer extends XEmit {
  constructor(id) {
    super(); this.id = id || 'j' + Math.random().toString(36).slice(2, 12); this.destroyed = false; this.opened = false; this.pjUp = false; this.httpUp = false; this.pend = {}; this.wait = {};
    setTimeout(() => { this.startPJ(); this.startHttp(); }, 0);
    setTimeout(() => { if (!this.opened && !this.destroyed) this.emit('error', { type: 'network' }); }, 14000);
  }
  ready() { if (this.opened || this.destroyed) return; this.opened = true; this.emit('open', this.id); }
  startPJ() {
    if (this.destroyed || typeof Peer === 'undefined' || /nopj/.test(location.search)) return; let p; try { p = this.pj = new Peer(this.id, PEEROPT); } catch (e) { return; }
    p.on('open', () => { this.pjUp = true; this.ready(); });
    p.on('connection', k => { const c = new XConn(k.peer); c.usePJ(k); this.emit('connection', c); });
    p.on('disconnected', () => { this.pjUp = false; setTimeout(() => { try { if (!this.destroyed && !p.destroyed) p.reconnect(); } catch (e) { } }, 60000); });
    p.on('error', e => { if (!e) return;
      /* « peer-unavailable » : pas joignable par ce chemin → on essaie l'autre */
      if (e.type === 'peer-unavailable') { const m = /peer (\S+)/.exec(e.message || ''), f = m && this.pend[m[1]]; if (f) f(); return; }
      if (e.type === 'unavailable-id') return this.emit('error', e);
      this.pjUp = false; });
  }
  startHttp() {
    if (this.destroyed || typeof EventSource === 'undefined') return; const es = this.es = new EventSource(XHOST + xTopic(this.id) + '/sse');
    es.onopen = () => { this.httpUp = true; this.ready(); };
    es.addEventListener('message', e => { let m; try { m = JSON.parse(JSON.parse(e.data).message); } catch (x) { return; } if (m && !this.destroyed) this.sig(m); });
  }
  post(id, m) { return fetch(XHOST + xTopic(id), { method: 'POST', body: JSON.stringify(m) }).catch(() => { }); }
  async sig(m) {
    const sdp = typeof m.sdp === 'string' && m.sdp.length < 6000 ? m.sdp : null, cid = String(m.cid || '').slice(0, 24); if (!sdp || !cid) return;
    if (m.k === 'o') { const from = String(m.from || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40); if (!from) return;
      const pc = new RTCPeerConnection(XICE), c = new XConn(from); pc.ondatachannel = e => c.useDC(pc, e.channel); this.emit('connection', c);
      try { await pc.setRemoteDescription({ type: 'offer', sdp }); await pc.setLocalDescription(await pc.createAnswer()); await xGather(pc); await this.post(from, { k: 'a', cid, sdp: pc.localDescription.sdp }); } catch (e) { c.end(); }
      setTimeout(() => { if (!c.open) c.end(); }, 20000); }
    else if (m.k === 'a') { const w = this.wait[cid]; if (!w) return; delete this.wait[cid]; try { await w.setRemoteDescription({ type: 'answer', sdp }); } catch (e) { } }
  }
  /* demande par le chemin de secours. now = action du joueur (rejoindre une partie) : tout de suite ; sinon rarement (amis) */
  async dialHttp(id, c, now) {
    const gap = (this.pjUp ? 30 : 10) * 60000, fail = () => { c.end(); if (now && !this.destroyed) this.emit('error', { type: 'peer-unavailable' }); };
    /* le canal de secours met une seconde ou deux à s'ouvrir : on l'attend un peu */
    for (let i = 0; i < 40 && !this.httpUp && now && !this.destroyed; i++) await new Promise(r => setTimeout(r, 200));
    if (!this.httpUp || (!now && Date.now() - (XLAST[id] || 0) < gap)) return setTimeout(now ? fail : () => c.end(), 60);
    XLAST[id] = Date.now();
    try { const pc = new RTCPeerConnection(XICE), dc = pc.createDataChannel('bdc'), cid = Math.random().toString(36).slice(2, 12); c.useDC(pc, dc); this.wait[cid] = pc;
      await pc.setLocalDescription(await pc.createOffer()); await xGather(pc); await this.post(id, { k: 'o', from: this.id, cid, sdp: pc.localDescription.sdp });
      setTimeout(() => { delete this.wait[cid]; if (!c.open && !c.dead) fail(); }, 16000); } catch (e) { fail(); }
  }
  connect(id, o) {
    const c = new XConn(id), now = !!(o && o.now), http = () => { delete this.pend[id]; if (!c.dead && !c.open) this.dialHttp(id, c, now); };
    if (!this.pjUp) { http(); return c; }
    let done = false; const p = this.pj.connect(id, { reliable: true }), fb = () => { if (done) return; done = true; try { p.close(); } catch (e) { } http(); };
    p.on('open', () => { if (done) return; done = true; delete this.pend[id]; c.usePJ(p, true); }); p.on('error', fb); this.pend[id] = fb; setTimeout(fb, 8000);
    return c;
  }
  destroy() { this.destroyed = true; try { this.es && this.es.close(); } catch (e) { } try { this.pj && this.pj.destroy(); } catch (e) { } }
}
