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
