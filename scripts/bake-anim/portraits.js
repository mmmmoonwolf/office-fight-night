const {chromium}=require('playwright');const fs=require('fs'),path=require('path');const [T,R]=process.argv.slice(2);
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:256,height:256}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('http://v.local/**',r=>{const u=decodeURIComponent(new URL(r.request().url()).pathname);if(u==='/')return r.fulfill({body:'<html><body style="margin:0;background:transparent"></body></html>',contentType:'text/html'});
  const f=path.join(R,u);return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f)}):r.fulfill({status:404,body:''});});
await p.goto('http://v.local/');for(const f of[path.join(T,'build/three.min.js'),path.join(R,'js/vendor/GLTFLoader.js'),path.join(R,'js/vendor/SkeletonUtils.js')])await p.addScriptTag({path:f});
const out=await p.evaluate(async(ids)=>{const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(256,256);r.setClearColor(0x000000,0);r.outputEncoding=THREE.sRGBEncoding;
  const L=u=>new Promise((res,rej)=>new THREE.GLTFLoader().load(u,res,undefined,rej));const clips=await L('/assets/models/fighter.glb');const boyHips=clips.scene.getObjectByName('mixamorigHips').position.y;const res={};
  for(const id of ids){const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xffffff,0x887766,1.05));const dl=new THREE.DirectionalLight(0xffffff,0.75);dl.position.set(1.5,2.5,4);sc.add(dl);
    const g=await L('/assets/models/char_'+id+'.glb');const m=THREE.SkeletonUtils.clone(g.scene);m.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
    const k=m.getObjectByName('mixamorigHips').position.y/boyHips,c=clips.animations.find(a=>a.name==='idle').clone();c.tracks.forEach(t=>{if(t.name==='mixamorigHips.position')for(let q=0;q<t.values.length;q++)t.values[q]*=k;});
    const bb=new THREE.Box3().setFromObject(m);m.scale.multiplyScalar(2/(bb.max.y-bb.min.y));sc.add(m);const mx=new THREE.AnimationMixer(m);mx.clipAction(c).play();mx.setTime(0.4);m.updateMatrixWorld(true);
    const h=m.getObjectByName('mixamorigHead').getWorldPosition(new THREE.Vector3()),top=m.getObjectByName('mixamorigHeadTop_End');const ht=top?top.getWorldPosition(new THREE.Vector3()).y:h.y+0.3;
    const cy=h.y+0.13,span=0.95;const cam=new THREE.PerspectiveCamera(28,1,0.05,50);cam.position.set(0.22*span,cy+0.05*span,h.z+span/(2*Math.tan(14*Math.PI/180)));cam.lookAt(h.x,cy,h.z);
    r.render(sc,cam);res[id]=r.domElement.toDataURL('image/png');}
  return res;},['kip','momo','ruby','grumbo','nana','duke','pippa']);
for(const id in out){fs.writeFileSync(path.join(R,'assets/portraits/'+id+'.png'),Buffer.from(out[id].split(',')[1],'base64'));}
console.log('ERR',errs);await b.close();})();
