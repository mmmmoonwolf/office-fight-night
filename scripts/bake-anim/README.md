# Baking Mixamo animations for the chibi rig

The fighters have no skeleton, so Mixamo clips are converted offline into pose curves (`js/anim_data.js`):
hand positions relative to the shoulders (facing frame, in arm lengths), chest lean/twist/roll, leg swing,
hip bob and head nod/tilt — 14 channels per frame at 30 fps. `js/anim.js` plays them back.

The raw `.fbx` files are **not** kept in the repo (Mixamo allows using animations inside a project, not
redistributing the files). To re-bake:

```bash
npm i three@0.128.0            # anywhere; we need build/three.min.js + examples/js/loaders/FBXLoader.js + libs/fflate
node scripts/bake-anim/bake.js <three package dir> <folder of .fbx> baked.json
```

Then copy the clips the game uses into `js/anim_data.js` (keys: idle, jab, cross, hook, upper, hitL, hitM,
hitFace, hitHead, hitBody, hitBig, hitUpper, stunned, jump) — see `ATK_CLIP` / `HIT_CLIPS` in `js/anim.js`
for how frames map onto attack timing.

## The rigged 3D body (`assets/models/fighter.glb`)

`export_char.js` builds the skinned character used by `js/body3d.js`: the Mixamo "Boy01" mesh (from the skinned
`Right_Hook.fbx`) re-bound to one skeleton (the FBX gives each body part its own copy), JPEG textures ≤ 512 px,
indexed geometry, plus the clips listed in `CLIPS` (in place: hips x/z frozen). Put every source `.fbx` (skinned
and skinless Mixamo clips) in one folder, then:

```bash
node scripts/bake-anim/export_char.js <three package dir> <folder of .fbx> assets/models/fighter.glb
```

Clip timings (wind-up / impact / follow-through, seconds) live in `B3ATK` in `js/body3d.js`; re-check them when a
clip is swapped. New clips for the chibi body go into `js/anim_data.js` with `bake.js`.

## Cast models and portraits

Each cast member is exported on its own (mesh + one skeleton, no clips — they reuse fighter.glb's):

```bash
node scripts/bake-anim/export_model.js <three pkg> <fbx dir> <character>.fbx assets/models/char_<name>.glb
node scripts/bake-anim/portraits.js <three pkg> .     # re-renders assets/portraits/*.png from the char_*.glb files
```
