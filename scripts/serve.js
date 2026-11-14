#!/usr/bin/env node
// Zero-dependency static server for local play and tests.
//   /               -> index.html (real three.js from CDN, offline only)
//   /mp-local.html  -> index.html + test/room_mock.js  (open 2-4 tabs to play "online" on one PC)
//   /test.html      -> index.html + room mock + three.js stub (headless tests, nothing renders)
//   /test-p2p.html  -> index.html + PeerJS mock + three.js stub (headless tests of the P2P transport)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';
function page(kind) {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (kind === 'test' || kind === 'test-p2p') html = html.split(CDN).join('<script src="test/three_stub.js"></script>').split('<script src="js/vendor/GLTFLoader.js"></script>').join('');
  if (kind === 'test' || kind === 'mp') html = html.split('<script src="js/core.js">').join('<script src="test/room_mock.js"></script>\n<script src="js/core.js">');
  if (kind === 'test-p2p') html = html.split('<script src="js/core.js">').join('<script src="test/peer_mock.js"></script>\n<script src="js/core.js">');
  // test pages: no web fonts
  if (kind.startsWith('test')) html = html.replace(/<link[^>]+fonts\.googleapis[^>]+>/g, '');
  return html;
}
function start(port) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (url === '/' || url === '/index.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); return res.end(page('play')); }
    if (url === '/mp-local.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); return res.end(page('mp')); }
    if (url === '/test.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); return res.end(page('test')); }
    if (url === '/test-p2p.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); return res.end(page('test-p2p')); }
    const file = path.normalize(path.join(ROOT, url));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}
module.exports = { start };
if (require.main === module) {
  const port = +process.argv[2] || 8765;
  start(port).then(() => console.log(`http://localhost:${port}/  (offline)\nhttp://localhost:${port}/mp-local.html  (open several tabs = online test)`));
}
