#!/usr/bin/env node
// Headless browser tests: three.js is stubbed (nothing renders) and the claude.ai room is mocked with
// BroadcastChannel, so this checks game logic, menus and online sync — not visuals.
// Run: npm test   (needs: npm install && npx playwright install chromium)
const { chromium } = require('playwright');
const { start } = require('../scripts/serve.js');
const PORT = 8791, URL = `http://localhost:${PORT}/test.html`;
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) failures++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openPage(ctx, errs) {
  const pg = await ctx.newPage({ viewport: { width: 1280, height: 720 } });
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto(URL); await sleep(700);
  return pg;
}

async function offline(browser) {
  console.log('\n[offline] duel vs CPU, specials, items, rounds, arcade');
  const errs = []; const ctx = await browser.newContext(); const pg = await openPage(ctx, errs); const ev = s => pg.evaluate(s);
  ok(await ev("document.querySelectorAll('.card').length") === 14, '14 character cards');
  await pg.click('.card[data-i="2"]'); await pg.click('.card[data-i="0"]');
  await pg.click('#startBtn'); await sleep(1700);
  ok(await ev('G.phase') === 'fight', 'duel reaches fight phase');
  for (let i = 0; i < 20; i++) { await pg.keyboard.down('KeyD'); await pg.keyboard.press('KeyJ'); await pg.keyboard.press('KeyK'); await pg.keyboard.up('KeyD'); await pg.keyboard.press('Space'); await sleep(80); }
  for (const sp of ['files', 'chat', 'books', 'trap', 'fork', 'chord', 'drop', 'audit', 'flash', 'dash', 'pull', 'cloud', 'buff', 'finisher', 'random']) {
    await ev(`G.f[0].ch.sp='${sp}';G.f[0].rage=100;G.f[0].state='idle';G.f[1].pos.x=G.f[0].pos.x+1.5;G.f[1].pos.z=G.f[0].pos.z;G.f[1].hp=Math.max(G.f[1].hp,60);G.f[1].state='idle';G.f[1].invT=0;G.f[0].tryAttack('special')`);
    await sleep(350);
  }
  await sleep(1200);
  ok(await ev('G.f[1].hp < G.f[1].maxHp'), 'specials deal damage');
  await ev("G.f[0].pos.x=2.6;G.f[0].pos.z=-5.3;G.f[0].y=0;CAM.yaw=-Math.PI/2");
  await pg.keyboard.down('KeyW'); await sleep(1800); await pg.keyboard.up('KeyW');
  ok(await ev('onMezz(G.f[0])'), 'stairs lead up to the mezzanine');
  for (let k = 0; k < 2; k++) {
    await ev("G.f[1].hp=1;G.f[1].state='idle';G.f[1].invT=0;G.f[1].takeHit(G.f[0],{dmg:5,knock:1,stun:.3})");
    await sleep(2200); await pg.keyboard.press('KeyX'); await sleep(2600);
  }
  await sleep(1800);
  ok(await ev("!document.querySelector('#endP').classList.contains('hidden')"), 'end panel after 2 round wins');
  await ev('toMenu()'); await pg.click('#modeSeg button[data-m="arcade"]'); await pg.click('#startBtn'); await sleep(300);
  for (let st = 0; st < 6; st++) {
    await pg.click('#interGo'); await sleep(1600);
    await ev("G.f[1].hp=0.5;G.f[1].invT=0;G.f[1].state='idle';G.f[1].takeHit(G.f[0],{dmg:5,knock:1,stun:.3})");
    await sleep(1700); await pg.keyboard.press('KeyX'); await sleep(1700);
  }
  await sleep(1500);
  ok((await ev("document.querySelector('#endTitle').textContent")).includes('เคลียร์'), 'arcade ladder clears after 6 stages');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}

async function online(browser) {
  console.log('\n[online] host + 2 clients through the room mock');
  const errs = []; const ctx = await browser.newContext();
  const host = await openPage(ctx, errs), c1 = await openPage(ctx, errs);
  const H = s => host.evaluate(s), C1 = s => c1.evaluate(s);
  await host.click('#onlineBtn'); await host.selectOption('#onChar', '0'); await host.click('#onCreate'); await sleep(500);
  const code = await H('NET.code');
  ok(/^[a-z0-9]{4}$/.test(code), 'room created: ' + code);
  await c1.click('#onlineBtn'); await c1.selectOption('#onChar', '4'); await c1.fill('#onCode', code); await c1.click('#onEnter'); await sleep(1500);
  ok(await H('members().length') === 2 && await C1('members().length') === 2, 'both tabs see 2 members');
  ok(await H('amLobbyHost()') && !(await C1('amLobbyHost()')), 'creator is host');
  await host.click('#onMode button[data-v="duel"]'); await host.click('#onStart'); await sleep(1500);
  ok(await C1("NET.role") === 'client' && await C1('G.f.length') === 2 && await C1('NET.mySlot') === 1, 'client adopted the match in slot 1');
  ok(await H("G.f[1].net!==null && G.f[1].player"), 'host drives slot 1 from the network');
  await sleep(1200);
  const before = await H('[G.f[1].pos.x,G.f[1].pos.z]');
  await C1("CAM.yaw=0"); await c1.keyboard.down('KeyA'); await sleep(900); await c1.keyboard.up('KeyA');
  const after = await H('[G.f[1].pos.x,G.f[1].pos.z]');
  ok(after[0] < before[0] - 1, `client input moves its fighter on the host (${before[0].toFixed(2)} → ${after[0].toFixed(2)})`);
  await sleep(500);
  const hp = await H('[G.f[0].pos.x,G.f[1].pos.x]'), cp = await C1('[G.f[0].pos.x,G.f[1].pos.x]');
  ok(Math.abs(hp[0] - cp[0]) < 0.6 && Math.abs(hp[1] - cp[1]) < 0.6, 'client mirrors positions from snapshots');
  await H("G.f[0].pos.x=G.f[1].pos.x-1.2;G.f[0].pos.z=G.f[1].pos.z;G.f[0].face=Math.PI/2;G.f[1].invT=0;G.f[1].state='idle'");
  const hpB = await H('G.f[1].hp');
  await H("G.f[0].tryAttack('hook')"); await sleep(600);
  ok(await H('G.f[1].hp') < hpB && Math.abs(await C1('G.f[1].hp') - await H('G.f[1].hp')) < 2, 'damage shows on both screens');
  for (let k = 0; k < 2; k++) {
    await H("G.f[1].hp=1;G.f[1].state='idle';G.f[1].invT=0;G.f[1].takeHit(G.f[0],{dmg:5,knock:1,stun:.3})");
    await sleep(2300); await host.keyboard.press('KeyX'); await sleep(2600);
  }
  await sleep(2600);
  ok(await H("G.phase") === 'end' && await C1("G.phase") === 'end', 'both tabs reach the end of the match');
  ok(await C1("!document.querySelector('#endP').classList.contains('hidden')"), 'client sees the end panel');
  ok(await C1('NET.lastFx') > 5, 'client replayed host fx events (' + await C1('NET.lastFx') + ')');
  ok(await H('window.__maxPresence') <= 4096, 'host presence stayed under 4 KiB (max ' + await H('window.__maxPresence') + ' B)');

  console.log('  -- 3 players free-for-all, one leaves mid-match');
  const c2 = await openPage(ctx, errs); const C2 = s => c2.evaluate(s);
  await H('netQuitMatch()'); await sleep(800);
  ok(await C1("NET.role") === 'lobby', 'client returns to lobby when host leaves the match');
  await c2.click('#onlineBtn'); await c2.fill('#onCode', code); await c2.click('#onEnter'); await sleep(1500);
  await host.click('#onMode button[data-v="ffa"]'); await host.click('#onStart'); await sleep(1500);
  ok(await C2('NET.role') === 'client' && await C2('G.f.length') === 4, 'third player joins a 4-slot FFA');
  ok(await H("G.f.filter(f=>f.player).length") === 3, '3 human slots + 1 CPU');
  for (let i = 0; i < 10; i++) { await c1.keyboard.press('KeyJ'); await c2.keyboard.press('KeyK'); await c2.keyboard.press('Space'); await sleep(120); }
  await c2.evaluate('__roomMockLeave()'); await c2.close(); await sleep(1500);
  ok(await H("G.f.filter(f=>f.net).length") === 1, 'leaver is replaced by a CPU on the host');
  await H('netQuitMatch()'); await host.evaluate('__roomMockLeave()'); await host.close(); await sleep(5200);
  ok(await C1("NET.role") === 'lobby', 'client survives host closing the tab');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}

(async () => {
  const server = await start(PORT);
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  try { await offline(browser); await online(browser); }
  catch (e) { console.error(e); failures++; }
  await browser.close(); server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
