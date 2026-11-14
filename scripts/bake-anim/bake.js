// Bakes Mixamo FBX clips into compact pose curves for the chibi rig (see js/anim.js for the meaning of each channel).
const open=require('./fbxpage.js');const fs=require('fs');const [T,DIR,OUT]=process.argv.slice(2);
(async()=>{const {b,p}=await open(T,DIR);const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.fbx')).sort();const out={};
 for(const f of files){
  const r=await p.evaluate(async(f)=>{
    const buf=await (await fetch('/fbx/'+encodeURIComponent(f))).arrayBuffer();const o=new THREE.FBXLoader().parse(buf,'');const clip=o.animations[0];
    const B=n=>o.getObjectByName('mixamorig'+n);const J={hips:B('Hips'),sp:B('Spine'),neck:B('Neck'),head:B('Head'),la:B('LeftArm'),lf:B('LeftForeArm'),lh:B('LeftHand'),ra:B('RightArm'),rf:B('RightForeArm'),rh:B('RightHand'),lu:B('LeftUpLeg'),lft:B('LeftFoot'),ru:B('RightUpLeg'),rft:B('RightFoot')};
    const mixer=new THREE.AnimationMixer(o);mixer.clipAction(clip).play();
    const W=k=>J[k].getWorldPosition(new THREE.Vector3());const FPS=30,n=Math.max(2,Math.round(clip.duration*FPS)+1);
    // rest hips height from the bind pose
    o.updateMatrixWorld(true);const rest=W('hips').y;const frames=[];let ext=[];
    for(let i=0;i<n;i++){mixer.setTime(Math.min(clip.duration,i/FPS));o.updateMatrixWorld(true);
      const P={};for(const k in J)P[k]=W(k);
      // chest basis: Y up the spine, X across the shoulders (character's left), Z forward
      const Y=P.neck.clone().sub(P.sp).normalize();let X=P.la.clone().sub(P.ra);X.addScaledVector(Y,-X.dot(Y)).normalize();const Z=new THREE.Vector3().crossVectors(X,Y);
      const armL=P.la.distanceTo(P.lf)+P.lf.distanceTo(P.lh),armR=P.ra.distanceTo(P.rf)+P.rf.distanceTo(P.rh);
      const loc=(v,s,len)=>{const d=v.clone().sub(s);return[d.x/len,d.y/len,d.z/len];}; // facing frame (world axes, character faces +z)
      const L=loc(P.lh,P.la,armL),R=loc(P.rh,P.ra,armR);
      const up=P.neck.clone().sub(P.hips).normalize();const sh=P.la.clone().sub(P.ra);
      const lean=Math.atan2(up.z,up.y),roll=Math.atan2(-up.x,up.y),twist=Math.atan2(-sh.z,sh.x);
      const leg=(u,ft)=>{const d=ft.clone().sub(u);return -Math.atan2(d.z,-d.y);};
      const hd=P.head.clone().sub(P.neck);const hx=Math.atan2(hd.dot(Z),hd.dot(Y)),hz=Math.atan2(-hd.dot(X),hd.dot(Y));
      const bob=(P.hips.y-rest)/rest;
      frames.push([...L,...R,lean,twist,roll,leg(P.lu,P.lft),leg(P.ru,P.rft),bob,hx,hz].map(v=>Math.round(v*1000)));
      ext.push([L[2]+0.4*L[1],R[2]+0.4*R[1]]);}
    // impact = frame where a hand is furthest from its shoulder (forward-weighted); which hand does it
    let best=-9,bi=0,bh=0;ext.forEach((e,i)=>{for(const h of[0,1]){if(e[h]>best){best=e[h];bi=i;bh=h;}}});
    return{fps:FPS,n,dur:+clip.duration.toFixed(3),hit:bi,hand:bh?'R':'L',f:frames};},f);
  out[f.replace(/\.fbx$/,'')]=r;console.log(f.padEnd(34),r.dur+'s',r.n+'f','impact',r.hit,r.hand);}
 fs.writeFileSync(OUT,JSON.stringify(out));await b.close();})();
