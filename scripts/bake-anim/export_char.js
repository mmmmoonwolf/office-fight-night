// Builds one GLB: Boy01 skinned mesh + selected Mixamo clips (in place, renamed). Usage: node export_char.js <three pkg> <fbx dir> <out.glb>
const open=require('./fbxpage.js');const fs=require('fs'),path=require('path');const [T,DIR,OUT]=process.argv.slice(2);
// key: source file, or [source, firstFrame, lastFrame] to keep only part of a clip (30 fps)
const CLIPS={idle:'Fighting Idle',ready:'Action_Idle_To_Fight_Idle',block:'Body_Block',run:'Run',runDrunk:'Drunk_Run_Forward',walk:'Walking',jab:'Punching',cross:'Punching (1)',hookR:'Right_Hook',hook:'Hook',
  upper:'Uppercut',hitL:'Light Hit To Head',hitM:'Medium Hit To Head',hitFace:'Receive Punch To The Face',hitHead:'Head Hit',hitBody:'Hit To Body',hitBig:'Big Hit To Head',
  hitUpper:'Receive Uppercut To The Face',stunned:'Stunned',jumping:'Jumping',win:'Victory_Idle',whatever:'Whatever_Gesture',rush:'Combo Punch',throw:['Throw_Object',50,100],throwBig:['Goalie_Throw',15,80],
  melee:'Standing_Melee_Combo_Attack_Ver._3',mmaKick:'Mma_Kick',kick1:'Mma_Kick_1',kick2:'Mma_Kick_2',flipKick:'Flip_Kick',hurricane:'Hurricane_Kick',pain:'Pain_Gesture'};
(async()=>{const {b,p}=await open(T,DIR);await p.addScriptTag({path:path.join(T,'examples/js/exporters/GLTFExporter.js')});await p.addScriptTag({path:path.join(T,'examples/js/utils/BufferGeometryUtils.js')});
 p.on('console',m=>console.log('page:',m.text()));
 const b64=await p.evaluate(async(CLIPS)=>{
   const load=async f=>new THREE.FBXLoader().parse(await (await fetch('/fbx/'+encodeURIComponent(f+'.fbx'))).arrayBuffer(),'');
   const base=await load('Right_Hook');
   // the FBX gives every body part its own copy of the skeleton: re-bind all parts to the first one and drop the copies
   const skinned=[];base.traverse(n=>{if(n.isSkinnedMesh)skinned.push(n);});
   const main=skinned[0].skeleton,byName={};main.bones.forEach(bn=>byName[bn.name]=bn);
   const keep=new Set(main.bones);
   for(const m of skinned.slice(1)){const sk=m.skeleton;const bones=sk.bones.map(bn=>byName[bn.name]);if(bones.some(x=>!x))throw new Error('bone missing in '+m.name);
     m.bind(new THREE.Skeleton(bones,sk.boneInverses.map(x=>x.clone())),m.bindMatrix);}
   const drop=[];base.traverse(n=>{if(n.isBone&&!keep.has(n)&&!(n.parent&&n.parent.isBone&&!keep.has(n.parent)))drop.push(n);});drop.forEach(n=>n.parent.remove(n));
   let nb=0;base.traverse(n=>{if(n.isBone)nb++;});console.log('rebound',skinned.length,'meshes; bones now',nb);
   const names=new Set();base.traverse(n=>{if(n.isBone)names.add(n.name);});
   console.log('bones',names.size,[...names].filter(n=>!/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(n)).slice(0,80).join(','));
   const clips=[];
   for(const k in CLIPS){const src=Array.isArray(CLIPS[k])?CLIPS[k][0]:CLIPS[k];const o=src==='Right_Hook'?base:await load(src);let c=o.animations[0].clone();if(Array.isArray(CLIPS[k]))c=THREE.AnimationUtils.subclip(c,k,CLIPS[k][1],CLIPS[k][2],30);c.name=k;
     c.tracks=c.tracks.filter(t=>{const [node,prop]=t.name.split('.');if(!names.has(node))return false;if(prop==='scale')return false;if(prop==='position'&&node!=='mixamorigHips')return false;return true;});
     // in place: keep the hips' first x/z for the whole clip (no root motion)
     const hp=c.tracks.find(t=>t.name==='mixamorigHips.position');if(hp){const v=hp.values,x0=v[0],z0=v[2];for(let i=0;i<v.length;i+=3){v[i]=x0;v[i+2]=z0;}}
     clips.push(c);console.log(k,c.duration.toFixed(2),c.tracks.length);}
   // wait for embedded textures
   const imgs=[];base.traverse(n=>{if(n.isMesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.map&&m.map.image)imgs.push(m.map.image);});});
   await Promise.all(imgs.map(im=>im.complete?0:new Promise(r=>{im.onload=r;im.onerror=r;})));
   console.log('textures',imgs.map(i=>i.width+'x'+i.height).join(' '));
   // smaller file: JPEG textures, indexed geometry, standard materials, only the attributes we render
   base.traverse(n=>{if(!n.isMesh)return;const mats=Array.isArray(n.material)?n.material:[n.material];
     n.material=mats.map(m=>{const s=new THREE.MeshStandardMaterial({name:m.name,map:m.map,roughness:0.8,metalness:0});if(s.map)s.map.format=THREE.RGBFormat;return s;});if(n.material.length===1)n.material=n.material[0];
     const g=n.geometry;for(const k of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight'].includes(k))g.deleteAttribute(k);
     const before=g.attributes.position.count;const m2=THREE.BufferGeometryUtils.mergeVertices(g,1e-4);n.geometry=m2;console.log(n.name,before,'->',m2.attributes.position.count);});
   const glb=await new Promise(res=>new THREE.GLTFExporter().parse(base,res,{binary:true,animations:clips,trs:true,onlyVisible:true,maxTextureSize:512}));
   let s='';const u=new Uint8Array(glb);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);},CLIPS);
 fs.writeFileSync(OUT,Buffer.from(b64,'base64'));console.log('wrote',OUT,fs.statSync(OUT).size);await b.close();})();
