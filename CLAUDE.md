# CLAUDE.md — ศึกออฟฟิศ (Office Fight Night)

Handoff notes for Claude Code. Read this first.

## What this is

A silly 3D brawler in the browser (three.js r128 from cdnjs, no bundler). Fighters are the owner's coworkers at a
piano/guitar shop (Peterson Sukhumvit26). One continuous map: the showroom (grand-piano podium, upright row, guitar
wall, book shelf, counter, mezzanine "ห้องหัวหน้า" with stairs) opens through a glass door onto the sidewalk and the
street (motorbike-taxi stand, som-tam cart, pickup truck, poles with tangled cables). A doorway on the mezzanine leads
into the 2nd-floor violin & book shop (built above the right-hand neighbour) whose 4 front glass panes break when
someone is knocked into them — they drop onto the sidewalk and take fall damage. GetAmped-style chase camera.

- 14 characters (`ROSTER` in `js/core.js`), each with a unique special (`SPECIALS` in `js/fighter.js`)
- Modes: duel 1v1, FFA 4, team 2v2, arcade ladder (5 + boss) — offline 1–2 players on one keyboard
- Training room (`G.mode==='train'`, offline only): no timer, no random events, nobody can be KO'd, HP refills after
  2 s without being hit, human rage refills by itself; `T` cycles the dummy (`TR.dummy`: stand / always block / fight
  back via `aiThink`); the dummy's HUD line shows the current combo's hits + damage (`trainHit`, called from `takeHit`)
- Move list overlay (`#movesP`, `buildMoves` in game.js) from the menu and the pause panel: basic moves with the
  current key scheme, items, and every special with its one-line Thai description from `SP_DESC` (fighter.js) — add an
  entry there whenever a new special is added
- Online up to 4 players on separate devices (`js/net.js`), over one of two transports:
  the claude.ai Artifact `room` capability, or peer-to-peer WebRTC via PeerJS when served from GitHub Pages / any static host
- Weapons to pick up/throw, power-ups, combos (jab-jab-hook), grabs/throws, stage hazards, random events
  (customer walks in → no punching inside, piano movers, rain makes the street slippery, motorbikes, stray dog),
  KO replay, photo mode, glove unlocks/titles stored in `localStorage`, sick-leave note for the loser
- All UI text is **Thai**. Keep new UI copy in Thai, identifiers in English.
- Original names only — no other game's names, logos, characters or assets.

## Commands

```bash
npm run dev     # node scripts/serve.js 8765
                #   /               real game, offline (three.js from CDN)
                #   /mp-local.html  same + test/room_mock.js → open 2-4 tabs to play "online" locally
                #   /test.html      room mock + three.js stub (what the tests load; nothing renders)
                #   /test-p2p.html  PeerJS mock + three.js stub (tests the P2P transport)
npm install && npx playwright install chromium
npm test        # node test/e2e.js — offline flow + host/2 clients online flow
```

`CHROME=/path/to/chrome npm test` uses a specific browser binary.

## Files

| file | contents |
|---|---|
| `index.html` | all markup + CSS (HUD, menu, online lobby, pause, arcade intermission, end panel, photo mode, touch controls) |
| `js/core.js` | `NET` stub, utils, `ROSTER`, `GLOVES`/`TITLES`, save (`localStorage` key `officeFight.v2`), face texture painter `drawFace`, `portrait`, synthesized `SFX`, renderer/scene/camera, popups/particles/center text/banner, keyboard state |
| `js/world.js` | collision blocks (`solid`, `groundAt`, `resolveBlocks`), fading walls, the store + street build, NPCs (bikes, dog, movers, customer, bystanders), rain, items (`WEAPONS`, `POWER`, spawn spots), random events, `resetWorld` |
| `js/fighter.js` | effects (projectiles, rings, smoke clouds, coupons, falling grand, tape), `SPECIALS`, `ATK` frame data, `Fighter` class (model, physics, combat, animation, `snap`/`applySnap`), `aiThink` |
| `js/game.js` | `G` state, slots/modes, HUD, name tags, camera, input schemes, round flow, arcade, KO replay recorder, photo mode, menu/cards, main loop |
| `js/net.js` | online lobby + host-authoritative sync (see below) |
| `scripts/serve.js` | zero-dependency static server with the three page variants |
| `test/three_stub.js` | Proxy-based fake THREE (real Vector3 math, everything else no-ops) |
| `test/room_mock.js` | `window.claude.use('room')` stand-in over BroadcastChannel (presence + peers only) |
| `test/peer_mock.js` | `window.Peer` (PeerJS) stand-in over BroadcastChannel |
| `test/e2e.js` | Playwright checks |

Scripts are classic `<script>` files sharing one global scope, loaded in order core → world → fighter → game → net.
Top-level `const`/`let` are visible to later files but **not** while an earlier file is still executing — anything
used at load time must be declared in an earlier file (that is why `NET` lives in `core.js`).

## World & physics

- Units are metres. 2nd floor: x ∈ [11.3, 22], z ∈ [-12, 2.85], floor y = 2.4 (`lvlOf(f)` → 'g' | 'mz' | 'f2');
  breakable panes live in `PANES` (`breakPane`, `restorePanes`; a broken pane's block is moved to y = -100).
- Store interior x ∈ [-15, 11], z ∈ [-12, 3]; glass front at z = 3 with a door gap |x| < 2.3; mezzanine x ∈ [7, 11],
  z ∈ [-12, -8.2] (y 2.4) reached by 2.2 m-wide stairs at z ∈ [-10.6, -8.4]; doorway to floor 2 at z ∈ [-11.6, -8.6];
  sidewalk z ∈ [3.1, 7.5] (y 0.15); road z ∈ [7.5, 15]; far sidewalk + shophouses z ≥ 15; side walls x = ±22.
- Every solid thing is an AABB in `blocks` (`solid(x0,x1,z0,z1,y0,y1,tag)`). `groundAt` returns the highest top a
  fighter can stand on (step height `STEP` = 0.42); `resolveBlocks` pushes fighters out sideways and reports
  high-speed impacts to `Fighter.onWallHit` (tag → sound/popup in `WALLFX`).
- Walls that would hide the action fade via `fadeGroup(meshes, cond)`.
- Long hair (`long`/`longM`) hanging behind the body uses its own material and fades to 30 % while the camera
  looks at the fighter's back (`Fighter.hairFade`, run every frame after `updCamera`; off in photo mode).
- `zoneOf` ('in'/'out') and `onMezz` drive AI path-finding (door waypoint, stair waypoint).

## Characters, sound, prompts

- Fighters are chibi: `S = ch.size × 0.84`, short legs (hip 0.72), bean torso, head group `this.head` scaled 1.26
  (head-relative coordinates, radius 0.5). Hair is real geometry from `buildHair()` (cap + fringe + curtains/locks for
  long hair, bun, spikes…); fringes are skipped when a face photo is used. Arms are 2-bone IK (`updArms`, `seg`):
  upper arm + forearm + elbow. Punches: anticipation (easeOutCubic) → strike with overshoot (`easeOutBack`, hooks and
  uppercuts follow a Bézier arc via `bez`) → recover (easeInOutCubic); the off hand tucks to the chin.
- `SFX` has a master bus + compressor, procedural lounge music (`music`, `musicTempo`, faster in the last 15 s),
  street ambience (`amb`), formant voices per fighter (`SFX.voice(f.vp, 'atk'|'hurt'|'ko'|'win'|'sp'|'grunt')`),
  3 randomised hit variants. Names in `SFX_LOCAL` are never broadcast online (music, footsteps, internals).
- Floating key hints (`updPrompts` in game.js): pick up / throw / swing / grab / special ready / power-up names,
  labelled with the right key for P1, P2, touch or online. Clients read weapon positions from `NET.cl.items`.
- `later(sec, fn)` schedules host-side follow-ups for multi-stage specials (cleared on round reset).

## Combat cheat-sheet

- States: idle, block, attack, stun, down, ko, grab, grabbed, recover, dash.
- `takeHit(att, {dmg, knock, stun, launch, kd, unblockable, dir, heavy, thrown})` is the single damage entry point.
  `kd` = knockdown (lands into `down`, then 0.7 s invulnerable). Blocking cuts damage to 15 % from the front.
- jab, jab, hook within 0.45 s → `combo` launcher. Grab beats block. Specials need rage 100.
- Hitting while the customer event is active inside the store costs 6 HP ("ลูกค้าเห็น").

## Online model (`js/net.js`)

Transport is chosen at load: inside a claude.ai Artifact (`window.claude.use('room')`) → the platform room;
top-level page without `window.claude` (GitHub Pages: https://mmmmoonwolf.github.io/office-fight-night) → **P2P**:
PeerJS 1.5.4 is lazy-loaded from unpkg (jsDelivr fallback) and uses the free `0.peerjs.com` broker + public STUN.
The room creator takes peer id `ofn-<code>` and relays every member's presence (star topology); `p2pRoom()` exposes
the same `presence()`/`peers()` surface as the claude.ai room, so everything below is shared. In P2P the lobby host
is always the creator. No TURN server: some strict NATs / mobile carriers cannot connect (the lobby says so).


Everything goes through **presence only** (no event topics), because presence is allowed for every viewer:

| who | presence fields |
|---|---|
| everyone in a room | `rc` room code, `jt` join time, `nm` nickname, `c` character, `gl` glove, `v` tab visible, `st` host settings |
| host | `g` match config `{id, mode, diff, loc, sl:[[peer, char, name, glove] …]}`, `s` snapshot (~20 Hz) |
| client | `in` = `[mx, mz, block, jab#, hook#, special#, jump#, grab#]` — press **counters**, the host diffs them |

- Lobby host = member with the earliest `jt` whose tab is visible. Only the host runs the simulation; remote fighters
  get input from `netInput()`. Clients never simulate: they interpolate `Fighter.snap()` arrays 110 ms behind and
  mirror items/projectiles/NPCs by id.
- One-shot effects are broadcast by **reassigning global functions** at the top of `net.js` (`popup`, `burst`,
  `showCenter`, `banner`, `ringFx`, `cloudAt`, `dropAt`, `couponAt`, `addTape`, `flashFor`, every `SFX` method).
  Keep those as global `function` declarations and keep visual-only code paths owner-free (clients call them with
  `owner = null`, which must never deal damage or play sounds twice).
- Presence is capped at 4 KiB: `netHostFrame` trims fx → projectiles → items to stay under 3.3 KB for `s`.
  Quantise with `Q()` (×100 ints). Tests assert the max size.
- Clients send an input sequence number; the host echoes it per slot in `s.ia`. If it stops advancing for 2.5 s the
  client shows "⚠️ ปุ่มยังไม่ถึงโฮสต์" and re-asserts its presence. Keyboard focus left in a hidden lobby input is
  dropped when a match starts (it used to swallow every key for joiners on Safari/Firefox).
- Leaver → CPU takes over. Host leaves / ends the match → clients go back to the lobby. No host migration yet.
- The host's tab must stay visible (browsers throttle hidden tabs).
- On claude.ai, viewers must be signed in with access to the shared Artifact. On GitHub Pages anyone with the link can
  join; if the creator closes the tab the room is gone (clients see "โฮสต์ปิดห้องแล้ว").

## Publishing as a claude.ai Artifact

The Artifact is multi-file: `index.html` + `js/*.js` (not `test/` or `scripts/`), with the `room` capability declared
(`{room: {}}`). Artifact pages may only load scripts from cdnjs/jsdelivr/unpkg and their own files; no fetch to
other hosts; `alert/confirm/prompt` and downloads are blocked (photo mode shows an `<img>` to long-press instead).

## Traps

- Thai keyboards: input uses `KeyboardEvent.code`, never `key`.
- The owner's laptop has had broken numpad/arrow keys — every action has a letter-key binding.
- Canvas text textures are redrawn after `document.fonts.ready` (Kanit); keep new ones in `canvasTex`.
- `Fighter.snap()` layout (20 numbers) is shared by the KO replay and the network — change both together.
- Item/projectile/bike ids come from `ITSEQ`/`PJSEQ`; clients key meshes on them.
- The three.js stub returns no-op proxies: tests prove logic and sync, not visuals. Check visuals in a real browser.
