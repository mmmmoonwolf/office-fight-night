'use strict';
/* ================= 3D BODY (skinned Mixamo character) =================
   A fighter whose character has body:'3d' gets the rigged model from assets/models/fighter.glb (one skinned
   character + 20 clips) instead of the chibi primitives. The chibi rig keeps running underneath, invisible, so
   physics, hit boxes, headPos() and snap() do not change. The clip and its time travel online in the two leg
   channels of snap() (legs are invisible on a 3D fighter): legs[0].rotation.x = clip index, legs[1] = time.
   Per character the model is recoloured (hair, skin, shirt, trousers, scarf) and wears the character's chibi
   hairstyle (except hairStyle 'model', which keeps the model's own hair). */
const B3={gltf:null,failed:false,wait:[],gray:{},CLIPS:[],raw:2.5};
// clip windows in seconds: a = wind-up start, i = impact (lands at the end of the move's startup), e = follow-through end
const B3ATK={jab:{a:0.13,i:0.57,e:1.0},cross:{a:0.1,i:0.4,e:0.95},hook:{a:0.1,i:0.43,e:1.2},hookR:{a:0.03,i:0.33,e:1.0},upper:{a:0.13,i:0.53,e:1.2},
  kick1:{a:0.27,i:0.6,e:1.13},kick2:{a:0.4,i:0.67,e:1.13},mmaKick:{a:0.33,i:0.72,e:1.33},flipKick:{a:0.1,i:0.4,e:1.5},
  meleeL:{c:'melee',a:0.4,i:1.0,e:1.25},meleeH:{c:'melee',a:1.2,i:1.6,e:2.0},throw:{a:0.13,i:0.73,e:1.33},throwBig:{a:0.17,i:1.03,e:1.83}};
function loadFighterModel(cb){
  if(B3.gltf)return cb(B3.gltf);if(B3.failed)return cb(null);B3.wait.push(cb);if(B3.wait.length>1)return;
  const done=g=>{B3.gltf=g;if(!g)B3.failed=true;const w=B3.wait;B3.wait=[];w.forEach(f=>f(g));};
  try{if(!REAL_THREE||!THREE.GLTFLoader||!THREE.SkeletonUtils)throw 0;
    new THREE.GLTFLoader().load('assets/models/fighter.glb',g=>{B3.CLIPS=g.animations.map(a=>a.name);
      const bb=new THREE.Box3().setFromObject(g.scene);B3.raw=bb.max.y-bb.min.y;done(g);},undefined,()=>done(null));}
  catch(e){done(null);}}
// a grey version of a texture (luminance, brightened) so material.color can recolour it without losing the detail
function grayTex(tex){if(!tex||!tex.image)return tex;const k=tex.uuid;if(B3.gray[k])return B3.gray[k];
  try{const im=tex.image,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
    const d=g.getImageData(0,0,c.width,c.height),a=d.data;let sum=0;for(let i=0;i<a.length;i+=4)sum+=0.3*a[i]+0.59*a[i+1]+0.11*a[i+2];const mean=sum/(a.length/4)||128,s=215/mean;
    for(let i=0;i<a.length;i+=4){const l=Math.min(255,(0.3*a[i]+0.59*a[i+1]+0.11*a[i+2])*s);a[i]=a[i+1]=a[i+2]=l;}g.putImageData(d,0,0);
    const t=new THREE.CanvasTexture(c);t.flipY=tex.flipY;t.encoding=tex.encoding;t.wrapS=tex.wrapS;t.wrapT=tex.wrapT;B3.gray[k]=t;return t;}catch(e){return tex;}}
const B3_SKIN0=new THREE.Color('#f2c6a2');
function attach3D(f){
  f.b3={ready:false,acts:{},cur:null,mixer:null,model:null,hand:[null,null]};
  loadFighterModel(g=>{if(!g||f.disposed)return;const ch=f.ch,m=THREE.SkeletonUtils.clone(g.scene),k=2.5/B3.raw;m.scale.setScalar(k);
    let headMesh=null,hairMesh=null;
    m.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=true;const n=o.name,mt=o.material.clone();o.material=mt;
      if(/Hair/.test(n)){hairMesh=o;mt.map=grayTex(mt.map);mt.color.set(ch.hair);}
      else if(/UpperBody/.test(n)){mt.map=grayTex(mt.map);mt.color.set(ch.shirt);}
      else if(/LowerBody/.test(n)){mt.map=grayTex(mt.map);mt.color.set(ch.shorts);}
      else if(/Scarf/.test(n)){mt.map=grayTex(mt.map);mt.color.set(ch.accent||ch.shirt);mt.color.offsetHSL(0,0,0.12);}
      else if(/Head|Hands/.test(n)){const c=new THREE.Color(ch.skin);mt.color.setRGB(Math.min(1.25,c.r/B3_SKIN0.r),Math.min(1.25,c.g/B3_SKIN0.g),Math.min(1.25,c.b/B3_SKIN0.b));if(/Head/.test(n))headMesh=o;}});
    const bone=n=>m.getObjectByName('mixamorig'+n);
    m.updateMatrixWorld(true);
    // the character's own hairstyle, fitted to the model's head (bind pose)
    if(ch.hairStyle!=='model'&&headMesh&&bone('Head')){const hb=bone('Head');headMesh.geometry.computeBoundingBox();const bb=headMesh.geometry.boundingBox.clone().applyMatrix4(headMesh.matrixWorld);
      const c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.z)*0.5;
      const hg=new THREE.Group();const want=new THREE.Matrix4().compose(c,new THREE.Quaternion(),new THREE.Vector3(r/0.5,r/0.5,r/0.5));
      const loc=new THREE.Matrix4().copy(hb.matrixWorld).invert().multiply(want);loc.decompose(hg.position,hg.quaternion,hg.scale);hb.add(hg);
      buildHair(hg,ch,M(ch.hair));if(hairMesh)hairMesh.visible=false;}
    // team-coloured boxing gloves on the hands
    ['LeftHand','RightHand'].forEach((n,h)=>{const b=bone(n);if(!b)return;const s=new THREE.Vector3();b.getWorldScale(s);
      const gl=new THREE.Mesh(new THREE.SphereGeometry(0.2/s.x,14,10),f.gloveMat);gl.scale.set(1,0.95,1.15);gl.position.y=0.07/s.x;gl.castShadow=true;b.add(gl);f.b3.hand[h]=gl;});
    const mx=new THREE.AnimationMixer(m);g.animations.forEach(c=>{f.b3.acts[c.name]=mx.clipAction(c);});
    f.body.traverse(o=>{if(o.isMesh)o.visible=false;});f.body.add(m);
    Object.assign(f.b3,{ready:true,mixer:mx,model:m});
    if(f.held){const t=f.held.type;f.removeHeld();f.setHeldVis(t);}
  });
}
// which clip should play now, and where (t = seconds, or null to let it run)
function pick3D(f){
  const S=f.state,A=f.atk,air=f.y>groundAt(f.pos.x,f.pos.z,f.y)+0.2;
  if(S==='ko')return{c:'stunned',t:Math.min(2.1,0.95+f.koT)};
  if(S==='down')return{c:'stunned',t:Math.min(2.1,1.3+(0.85-f.downT)*1.2)};
  if(f.win)return{c:'win',loop:1};
  if(G.phase==='intro')return{c:'ready',t:Math.min(0.98,G.phaseT*0.75)};
  if(S==='stun'){const r=f.react;if(r){const d=B3.gltf.animations.find(a=>a.name===r.c).duration,t=r.t*1.25;if(t<d)return{c:r.c,t};}
    return f.stunT>0.25||f.fx.dizzy>0?{c:'pain',t:0.9+Math.sin(f.t*2.4)*0.55}:{c:r?r.c:'hitM',t:9};}
  if(S==='grabbed')return{c:'hitBig',t:0.3};
  if(S==='grab'){const w=B3ATK.throwBig,k=Math.min(1,f.grabT/(f.superGrab?0.55:0.32));return{c:'throwBig',t:w.a+(w.i-w.a)*k};}
  if(S==='recover'&&f.t-(f.throwAt||-9)<0.6){const w=B3ATK.throw,k=(f.t-f.throwAt)/0.6;return{c:'throw',t:k<0.2?w.a+(w.i-w.a)*k/0.2:w.i+(w.e-w.i)*(k-0.2)/0.8};}
  if(S==='block')return{c:'block',t:1.25};
  if(S==='dash')return f.dashing&&f.dashing.tornado?{c:'hurricane',loop:1,speed:1.4}:{c:'run',loop:1,speed:2};
  if(S==='attack'&&A){const d=A.def,P=d.pose||A.type,slot=A.slot;
    if(P==='rush')return{c:'rush',t:0.4+Math.max(0,A.t-d.startup)*1.6};
    if(P==='spin')return{c:'hurricane',t:(A.t*1.6)%1.8};
    let key;if(A.type==='swingL')key='meleeL';else if(A.type==='swingH')key='meleeH';
    else if(P==='kick')key=A.hand===1?'kick2':'kick1';else if(P==='kickH')key='mmaKick';else if(P==='dropkick')key='flipKick';
    else if(['rocket','roll','slam'].includes(P)||d.jumpV)return{c:'jumping',t:A.t<d.startup?0.45:0.75};
    else if(P==='hook'||P==='slapH'||P==='kickH'||P==='lariat'||slot==='hook')key=A.hand===1?'hookR':'hook';
    if(!key){if(slot==='combo'||slot==='special'||A.type==='cast'||P==='skyUpper')key='upper';else key=A.hand===1?'cross':'jab';}
    const w=B3ATK[key],tt=A.t,clip=w.c||key,tot=d.startup+d.active+d.recover;let t;
    if(tt<d.startup)t=w.a+(w.i-w.a)*(tt/d.startup);else if(tt<d.startup+d.active)t=w.i;else t=w.i+(w.e-w.i)*Math.min(1,(tt-d.startup-d.active)/Math.max(0.01,tot-d.startup-d.active));
    return{c:clip,t};}
  if(air)return{c:'jumping',t:f.vy>0?0.62:0.92};
  if(f.moving>0.15)return{c:'run',loop:1,speed:0.7+f.moving*0.6};
  return{c:'idle',loop:1};
}
function play3D(f,c,t,dt,speed){const B=f.b3,a=B.acts[c];if(!a)return;
  if(B.cur!==c){const old=B.acts[B.cur];a.reset();a.setEffectiveWeight(1);a.play();if(old)a.crossFadeFrom(old,c==='stunned'||/^hit/.test(c)?0.06:0.12,false);B.cur=c;}
  if(t!=null){a.timeScale=0;a.time=Math.min(t,a.getClip().duration-0.001);}else a.timeScale=speed||1;
  B.mixer.update(dt);}
// host: choose + play, then write the clip into the snapshot channels
function upd3D(f,dt){const B=f.b3;if(!B||!B.ready)return;const p=pick3D(f);
  play3D(f,p.c,p.t,dt,p.speed);const a=B.acts[p.c];
  if(f.state==='ko'||f.state==='down')f.body.rotation.x=f.koFly?f.body.rotation.x:0;
  if(!(f.state==='attack'&&f.atk&&(f.atk.def.pose==='roll')))f.body.position.y=0;
  f.legs[0].rotation.x=B3.CLIPS.indexOf(p.c);f.legs[1].rotation.x=a?a.time:0;}
// clients / KO replay: play what the snapshot says
function apply3D(f,ci,t){const B=f.b3;if(!B||!B.ready)return;const c=B3.CLIPS[Math.round(ci)];if(!c)return;play3D(f,c,t,1/30);
  if(f.state==='ko'||f.state==='down')f.body.rotation.x=0;}
// held items: chibi = left glove; 3D body = right hand (the melee and throw clips use the right hand)
function handObj(f){return f.b3&&f.b3.ready&&f.b3.hand[1]?f.b3.hand[1]:f.gloves[0];}
function handScale(f){if(f.b3&&f.b3.ready&&f.b3.hand[1]){const s=new THREE.Vector3();f.b3.hand[1].getWorldScale(s);return 1/s.x;}return 1/f.S;}
