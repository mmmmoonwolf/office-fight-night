// Stand-in for the claude.ai `room` capability: shares presence between tabs of the same origin
// through BroadcastChannel. Only what js/net.js uses is implemented (presence + peers).
(function () {
  const ch = new BroadcastChannel('office-fight-room');
  const me = Math.random().toString(36).slice(2, 12);
  let mine = {}; const others = new Map(); let snap = [];
  window.__maxPresence = 0;
  function rebuild() {
    snap = Object.freeze([
      Object.freeze({ peer: me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, mine)), updatedAt: Date.now() }),
      ...[...others.values()].map(o => o.p)
    ]);
  }
  let closed = false;
  function announce() { if (!closed) ch.postMessage({ t: 'p', peer: me, p: mine }); }
  ch.onmessage = e => {
    const d = e.data;
    if (d.t === 'p') { others.set(d.peer, { seen: Date.now(), p: Object.freeze({ peer: d.peer, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(d.p || {}), updatedAt: Date.now() }) }); rebuild(); }
    else if (d.t === 'hello') announce();
    else if (d.t === 'bye') { others.delete(d.peer); rebuild(); }
  };
  setInterval(() => { const now = Date.now(); let ch2 = false; for (const [k, v] of others) if (now - v.seen > 3000) { others.delete(k); ch2 = true; } if (ch2) rebuild(); announce(); }, 1000);
  addEventListener('beforeunload', () => { if (!closed) ch.postMessage({ t: 'bye', peer: me }); });
  const room = {
    presence(patch) {
      const next = Object.assign({}, mine);
      for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
      const size = new TextEncoder().encode(JSON.stringify(next)).length;
      window.__maxPresence = Math.max(window.__maxPresence, size);
      if (size > 4096) return Promise.reject({ code: 'invalid_argument', message: 'presence over 4 KiB: ' + size });
      mine = next; announce(); rebuild(); return Promise.resolve();
    },
    peers() { return snap; },
    onPeers(fn) { const t = setTimeout(() => fn({ peers: snap, joined: snap, left: [], updated: [] }), 0); return () => clearTimeout(t); },
    connected() { return true; },
    onConnection(fn) { setTimeout(() => fn(true), 0); return () => {}; },
    emit() { return Promise.resolve(); }, on() { return () => {}; }
  };
  window.__roomMockLeave = () => { if (closed) return; ch.postMessage({ t: 'bye', peer: me }); closed = true; ch.close(); };
  window.claude = { use: async n => (n === 'room' ? room : null) };
  rebuild(); ch.postMessage({ t: 'hello' });
})();
