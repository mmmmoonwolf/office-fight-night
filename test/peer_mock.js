// Minimal stand-in for PeerJS (window.Peer) over BroadcastChannel, for headless tests of the P2P transport.
// Implements: new Peer([id]), on('open'|'connection'|'error'|'disconnected'), connect(id), destroy(), reconnect();
// DataConnection: peer, open, on('open'|'data'|'close'|'error'), send(json), close().
(function () {
  const bc = new BroadcastChannel('office-fight-peer-mock');
  const local = new Map(); let n = 0, dead = false;
  const post = m => { if (!dead) bc.postMessage(m); };
  class Conn {
    constructor(me, remote, cid) { this._me = me; this.peer = remote; this.cid = cid; this.open = false; this.h = {}; }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
    _emit(e, a) { (this.h[e] || []).forEach(f => f(a)); }
    send(d) { if (this.open) post({ t: 'msg', to: this.peer, cid: this.cid, d: JSON.parse(JSON.stringify(d)) }); }
    close() { if (this._closed) return; this._closed = true; this.open = false; post({ t: 'close', to: this.peer, cid: this.cid }); this._me._conns.delete(this.cid); this._emit('close'); }
  }
  class Peer {
    constructor(id) {
      if (id && typeof id === 'object') id = null;
      this.h = {}; this._conns = new Map(); this.destroyed = false;
      this.id = id || ('m' + Math.random().toString(36).slice(2, 10)); this._probe = Math.random();
      local.set(this.id, this); post({ t: 'probe', id: this.id, probe: this._probe });
      setTimeout(() => { if (this._taken) { local.delete(this.id); this._emit('error', { type: 'unavailable-id' }); } else this._emit('open', this.id); }, 120);
    }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
    _emit(e, a) { (this.h[e] || []).forEach(f => f(a)); }
    connect(remote) {
      const cid = this.id + ':' + (++n) + ':' + Math.random().toString(36).slice(2, 6), c = new Conn(this, remote, cid);
      this._conns.set(cid, c); post({ t: 'conn', to: remote, from: this.id, cid });
      c._timer = setTimeout(() => { if (!c.open) { this._conns.delete(cid); this._emit('error', { type: 'peer-unavailable' }); } }, 400);
      return c;
    }
    destroy() { if (this.destroyed) return; this.destroyed = true; for (const c of [...this._conns.values()]) c.close(); local.delete(this.id); }
    reconnect() {}
  }
  bc.onmessage = e => {
    const m = e.data;
    if (m.t === 'probe') { if (local.has(m.id)) post({ t: 'taken', id: m.id, probe: m.probe }); }
    else if (m.t === 'taken') { const p = local.get(m.id); if (p && p._probe === m.probe) p._taken = true; }
    else if (m.t === 'conn') { const p = local.get(m.to); if (!p || p.destroyed) return; const c = new Conn(p, m.from, m.cid); p._conns.set(m.cid, c); p._emit('connection', c); c.open = true; post({ t: 'accept', to: m.from, cid: m.cid }); setTimeout(() => c._emit('open'), 0); }
    else if (m.t === 'accept') { const p = local.get(m.to), c = p && p._conns.get(m.cid); if (c) { clearTimeout(c._timer); c.open = true; c._emit('open'); } }
    else if (m.t === 'msg') { const p = local.get(m.to), c = p && p._conns.get(m.cid); if (c && c.open) c._emit('data', m.d); }
    else if (m.t === 'close') { const p = local.get(m.to), c = p && p._conns.get(m.cid); if (c) { c.open = false; c._closed = true; p._conns.delete(m.cid); c._emit('close'); } }
  };
  window.Peer = Peer;
  window.__peerMockKill = () => { for (const p of [...local.values()]) p.destroy(); dead = true; bc.close(); };
})();
