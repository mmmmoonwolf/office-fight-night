// One character → GLB (mesh + one skeleton, no animations; clips come from fighter.glb). Usage: node export_model.js <three pkg> <fbx dir> <name.fbx> <out.glb>
const open=require('./fbxpage.js');const fs=require('fs'),path=require('path');const [T,DIR,FILE,OUT]=process.argv.slice(2);
(async()=>{const {b,p}=await open(T,DIR);for(const f of['examples/js/exporters/GLTFExporter.js','examples/js/utils/BufferGeometryUtils.js'])await p.addScriptTag({path:path.join(T,f)});
 p.on('console',m=>{if(!/MeshStandardMaterial/.test(m.text()))console.log('page:',m.text());});
 const b64=await p.evaluate(async(FILE)=>{
   const base=new THREE.FBXLoader().parse(await (await fetch('/fbx/'+encodeURIComponent(FILE))).arrayBuffer(),'');base.animations=[];
   const skinned=[];base.traverse(n=>{if(n.isSkinnedMesh)skinned.push(n);});
   // one shared skeleton: the full bone hierarchy that contains the hips; every part is re-bound to it by bone name
   const allHips=[];base.traverse(n=>{if(n.isBone&&n.name==='mixamorigHips')allHips.push(n);});
   let root=allHips[0];while(root.parent&&root.parent.isBone)root=root.parent;
   const canon=new Set(),byName={};root.traverse(n=>{if(n.isBone){canon.add(n);byName[n.name]=byName[n.name]||n;}});
   for(const m of skinned){const bones=m.skeleton.bones.map(bn=>byName[bn.name]);if(bones.some(x=>!x)){console.log('missing bone in',m.name);continue;}
     m.bind(new THREE.Skeleton(bones,m.skeleton.boneInverses.map(x=>x.clone())),m.bindMatrix);}
   // keep only bones a mesh uses (plus their ancestors) — no duplicate names left for the animation binding
   const used=new Set();skinned.forEach(m=>m.skeleton.bones.forEach(b=>{let x=b;while(x&&x.isBone){used.add(x);x=x.parent;}}));
   const drop=[];base.traverse(n=>{if(n.isBone&&!used.has(n))drop.push(n);});drop.forEach(n=>{if(n.parent)n.parent.remove(n);});
   const seen={};let dup=0;base.traverse(n=>{if(n.isBone){if(seen[n.name])dup++;seen[n.name]=1;}});if(dup)console.log('duplicate bone names left',dup);
   // embedded textures decode asynchronously: wait until every map has a loaded image
   const maps=[];base.traverse(n=>{if(n.isMesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.map)maps.push(m.map);});});
   for(let k=0;k<80&&!maps.every(t=>t.image&&(t.image.complete===undefined||t.image.complete)&&t.image.width);k++)await new Promise(r=>setTimeout(r,100));
   const imgs=maps.filter(t=>t.image).map(t=>t.image);
   // same picture → one texture (the exporter would embed every copy); see-through face atlases → 256 px
   const bySrc={};const share=t=>{if(!t||!t.image)return t;const k=t.image.src||t.image.currentSrc||t.uuid;if(!bySrc[k])bySrc[k]=t;return bySrc[k];};
   const small=new Map();const shrink=t=>{if(!t||!t.image||small.has(t))return small.get(t)||t;const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(t.image,0,0,256,256);
     const n=new THREE.CanvasTexture(c);n.flipY=t.flipY;n.wrapS=t.wrapS;n.wrapT=t.wrapT;small.set(t,n);return n;};
   base.traverse(n=>{if(!n.isMesh)return;(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{m.map=share(m.map);});});
   base.traverse(n=>{if(!n.isMesh)return;const mats=Array.isArray(n.material)?n.material:[n.material];
     n.material=mats.map(m=>{const t=!!m.transparent||/Brows|Eyes|Mouth|Lens/i.test(m.name+n.name);if(t&&m.map)m.map=shrink(m.map);const s=new THREE.MeshStandardMaterial({name:m.name,map:m.map,color:m.map?0xffffff:m.color,roughness:0.75,metalness:0,transparent:t,opacity:m.opacity,alphaTest:t?0.02:0,depthWrite:!t||!!m.map});
       if(s.map&&!t)s.map.format=THREE.RGBFormat;return s;});if(n.material.length===1)n.material=n.material[0];
     const g=n.geometry;for(const k of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight'].includes(k))g.deleteAttribute(k);
     n.geometry=THREE.BufferGeometryUtils.mergeVertices(g,1e-4);});
   base.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(base);const hips=base.getObjectByName('mixamorigHips');
   base.userData={height:box.max.y-box.min.y,hipsY:hips.getWorldPosition(new THREE.Vector3()).y,minY:box.min.y};
   let nb=0;base.traverse(n=>{if(n.isBone)nb++;});console.log(FILE,'bones',nb,'texs',imgs.map(i=>i.width).join(','),JSON.stringify(base.userData));
   const glb=await new Promise(res=>new THREE.GLTFExporter().parse(base,res,{binary:true,trs:true,onlyVisible:true,maxTextureSize:512}));
   let s='';const u=new Uint8Array(glb);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);},FILE);
 fs.writeFileSync(OUT,Buffer.from(b64,'base64'));console.log('wrote',OUT,fs.statSync(OUT).size);await b.close();})();
