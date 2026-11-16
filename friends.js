/* Amis : chacun a un code ami (6 caractères, gardé dans la sauvegarde). Tant que le jeu est ouvert, il est joignable
   à cette adresse (PeerJS). On voit qui est en ligne et on peut inviter en duel ou en 2 contre 2.
   Rien ne passe par un serveur à nous : les jeux se parlent directement. Seuls le pseudo, l'avatar et le code ami sont échangés. */
const FR = {
  peer: null, links: {}, ready: false, dup: false, onChange: () => { }, onInvite: () => { },
  ABC: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  clean(c) { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 6 ? c : null; },
  me() { return { code: S.d.fcode, name: S.d.name, avatar: S.d.avatar, w: S.d.wins | 0, l: S.d.losses | 0, lv: S.d.lvl | 0 }; },
  friend(code) { return S.d.friends.find(f => f.code === code); },
  online(code) { const c = this.links[code]; return !!(c && c.open); },
  start() {
    if (typeof Peer === 'undefined' || this.timers) return; this.timers = true; this.tries = 0; this.open();
    setInterval(() => this.scan(), 12000);
    setInterval(() => { for (const k in this.links) { const c = this.links[k]; if (c.open) { try { c.send({ t: 'ping' }); } catch (e) { } if (Date.now() - c.last > 40000) this.drop(c); } } }, 10000);
    /* en fermant le jeu, on libère tout de suite mon adresse (sinon elle reste prise un moment) */
    addEventListener('beforeunload', () => { try { this.peer && this.peer.destroy(); } catch (e) { } });
  },
  /* ouvre mon adresse d'ami. Si ça rate (adresse encore prise juste après une relance du jeu, coupure internet…), on réessaie tout seul. */
  open() {
    let p; try { p = this.peer = new XPeer('bdcf-' + S.d.fcode); } catch (e) { return this.again(); }
    p.on('open', () => { if (this.peer !== p) return; this.ready = true; this.dup = false; this.tries = 0; this.scan(); this.onChange(); });
    p.on('connection', c => { if (this.peer === p) this.wire(c); });
    p.on('disconnected', () => { if (this.peer !== p) return; this.ready = false; this.onChange(); this.again(); });
    /* « peer-unavailable » = cet ami n'est pas en ligne : rien à faire. Le reste : on repart de zéro. */
    p.on('error', e => { if (this.peer !== p || !e || e.type === 'peer-unavailable') return; this.lastErr = e.type; if (e.type === 'unavailable-id' || e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') this.again(e.type === 'unavailable-id'); });
  },
  again(taken) {
    const p = this.peer; this.peer = null; this.ready = false; this.tries++; this.dup = !!taken && this.tries >= 6; for (const k in this.links) delete this.links[k];
    try { p && p.destroy(); } catch (e) { } this.onChange(); clearTimeout(this.rt); this.rt = setTimeout(() => { if (!this.peer) this.open(); }, [4, 10, 20, 40, 80, 160, 300][Math.min(6, this.tries - 1)] * 1000);
  },
  /* essaie de joindre les amis pas encore connectés */
  scan() { if (!this.ready || !this.peer || this.peer.disconnected) return; for (const f of S.d.friends) { const c = this.links[f.code]; if (c && !c.open && Date.now() - c.last > 9000) this.drop(c); if (!this.links[f.code]) this.dial(f.code, !!f.pend); } },
  dial(code, first) { if (!this.ready || !this.peer) return false; const c = this.peer.connect('bdcf-' + code, { reliable: true }); c.fcode = code; c.dialed = true; c.first = !!first; this.wire(c); this.links[code] = this.links[code] || c; return true; },
  wire(c) {
    c.last = Date.now();
    c.on('open', () => { c.last = Date.now(); if (c.dialed) c.send(Object.assign({ t: c.first ? 'add' : 'hi' }, this.me())); });
    c.on('data', m => { c.last = Date.now(); this.data(c, m); });
    c.on('close', () => this.drop(c)); c.on('error', () => this.drop(c));
  },
  drop(c) { try { c.close(); } catch (e) { } if (c.fcode && this.links[c.fcode] === c) { delete this.links[c.fcode]; this.onChange(); } },
  data(c, m) {
    if (!m || typeof m !== 'object' || m.t === 'ping') return;
    if (m.t === 'hi' || m.t === 'add') {
      const code = this.clean(m.code); if (!code || code === S.d.fcode) return;
      /* l'identité vient de la connexion elle-même (adresse PeerJS), pas de ce que dit le message */
      if (c.peer !== 'bdcf-' + code) return;
      if (c.dialed && c.fcode !== code) return;
      let f = this.friend(code);
      if (!f) {
        /* un inconnu : on ne l'ajoute que s'il le demande (ou si c'est moi qui viens de l'ajouter) */
        if (m.t !== 'add' && !c.first) { try { c.close(); } catch (e) { } return; }
        if (S.d.friends.length >= 30) return;
        f = { code, name: 'Pote', avatar: 'poulet' }; S.d.friends.push(f);
        if (typeof toast === 'function') toast(esc(m.name) + ' est maintenant ton ami.');
      }
      delete f.pend; const num = (v, max) => Math.max(0, Math.min(max, v | 0)); f.w = num(m.w, 99999); f.l = num(m.l, 99999); f.lv = num(m.lv, 999); f.name = esc(m.name); f.avatar = AVATARS.includes(m.avatar) ? m.avatar : 'poulet'; S.save();
      if (!c.dialed) { c.fcode = code; if (!c.greeted) { c.greeted = true; c.send(Object.assign({ t: 'hi' }, this.me())); } }
      this.links[code] = c; this.onChange(); return;
    }
    const f = c.fcode && this.friend(c.fcode); if (!f || this.links[c.fcode] !== c) return;
    if (m.t === 'invite') { const room = String(m.room || ''); if (!/^[A-Z]{4}$/.test(room)) return; this.onInvite(f, m.mode === '2v2' ? '2v2' : m.mode === 'tour' ? 'tour' : '1v1', room, c); }
    else if (m.t === 'no') toast(f.name + ' a refusé l\'invitation.');
    else if (m.t === 'busy') toast(f.name + ' est déjà en partie.');
  },
  add(code) {
    code = this.clean(code); if (!code) return 'Un code ami fait 6 caractères.';
    if (code === S.d.fcode) return 'C\'est ton propre code.';
    if (this.friend(code)) return 'Déjà dans ta liste.';
    if (S.d.friends.length >= 30) return 'Ta liste est pleine (30 amis).';
    S.d.friends.push({ code, name: 'Pote ' + code.slice(0, 3), avatar: 'poulet', pend: 1 }); S.save();
    if (this.ready) this.dial(code, true); this.onChange(); return '';
  },
  remove(code) { S.d.friends = S.d.friends.filter(f => f.code !== code); S.save(); const c = this.links[code]; if (c) this.drop(c); this.onChange(); },
  invite(code, mode, room) { const c = this.links[code]; if (!c || !c.open) return false; c.send({ t: 'invite', mode, room }); return true; },
  reply(c, t) { try { if (c && c.open) c.send({ t }); } catch (e) { } },
};
