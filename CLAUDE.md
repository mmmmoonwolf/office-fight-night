# CLAUDE.md — ศึกออฟฟิศ (Office Fight Night)

Handoff notes for Claude Code. Read this first.

## What this is

A silly 3D brawler in the browser (three.js r128 from cdnjs, no bundler). Fighters are the owner's coworkers at a
piano/guitar shop (Peterson Sukhumvit26). One continuous map: the showroom (grand-piano podium, upright row, guitar
wall, book shelf, counter, mezzanine "ห้องหัวหน้า" with stairs) opens through a glass door onto the sidewalk and the
street (motorbike-taxi stand, som-tam cart, pickup truck, poles with tangled cables). GetAmped-style chase camera.

- 14 characters (`ROSTER` in `js/core.js`), each with a unique special (`SPECIALS` in `js/fighter.js`)
- Modes: duel 1v1, FFA 4, team 2v2, arcade ladder (5 + boss) — offline 1–2 players on one keyboard
- Online up to 4 players on separate devices through the claude.ai Artifact `room` capability (`js/net.js`)
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
| `test/e2e.js` | Playwright checks |

Scripts are classic `<script>` files sharing one global scope, loaded in order core → world → fighter → game → net.
Top-level `const`/`let` are visible to later files but **not** while an earlier file is still executing — anything
used at load time must be declared in an earlier file (that is why `NET` lives in `core.js`).

## World & physics

- Units are metres. Store interior x ∈ [-11, 11], z ∈ [-8, 3]; glass front at z = 3 with a door gap |x| < 2.3;
  sidewalk z ∈ [3.1, 7.5] (y 0.15); road z ∈ [7.5, 15]; far sidewalk + shophouses z ≥ 15; side walls x = ±22.
- Every solid thing is an AABB in `blocks` (`solid(x0,x1,z0,z1,y0,y1,tag)`). `groundAt` returns the highest top a
  fighter can stand on (step height `STEP` = 0.42); `resolveBlocks` pushes fighters out sideways and reports
  high-speed impacts to `Fighter.onWallHit` (tag → sound/popup in `WALLFX`).
- Walls that would hide the action fade via `fadeGroup(meshes, cond)`.
- `zoneOf` ('in'/'out') and `onMezz` drive AI path-finding (door waypoint, stair waypoint).

## Combat cheat-sheet

- States: idle, block, attack, stun, down, ko, grab, grabbed, recover, dash.
- `takeHit(att, {dmg, knock, stun, launch, kd, unblockable, dir, heavy, thrown})` is the single damage entry point.
  `kd` = knockdown (lands into `down`, then 0.7 s invulnerable). Blocking cuts damage to 15 % from the front.
- jab, jab, hook within 0.45 s → `combo` launcher. Grab beats block. Specials need rage 100.
- Hitting while the customer event is active inside the store costs 6 HP ("ลูกค้าเห็น").

## Online model (`js/net.js`)

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
- Leaver → CPU takes over. Host leaves / ends the match → clients go back to the lobby. No host migration yet.
- The host's tab must stay visible (browsers throttle hidden tabs).
- Online needs viewers signed in to claude.ai with access to the shared Artifact. Outside claude.ai `window.claude`
  is missing and the online button explains that.

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
