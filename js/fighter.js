'use strict';
let hype=0;
/* ================= EFFECTS ================= */
let PJSEQ=0,CPSEQ=0;
const projs=[],rings=[],clouds=[],coupons=[],drops=[],tapes=[];
function clearEffects(){
  LATER.length=0;if(typeof clearSmoke==='function')clearSmoke();
  for(const a of[projs,rings,clouds,coupons,drops,tapes]){a.forEach(o=>{if(o.mesh)scene.remove(o.mesh);if(o.g)scene.remove(o.g);if(o.warn)scene.remove(o.warn);if(o.piano)scene.remove(o.piano);});a.length=0;}
}
const enemiesOf=f=>G.f.filter(e=>e!==f&&e.team!==f.team&&e.state!=='ko');
function nearestEnemy(f,maxD=99,cone){let best=null,bd=maxD;for(const e of enemiesOf(f)){const dx=e.pos.x-f.pos.x,dz=e.pos.z-f.pos.z,d=Math.hypot(dx,dz);if(cone&&d>0.3&&angDiff(f.face,Math.atan2(dx,dz))>cone)continue;if(d<bd){bd=d;best=e;}}return best;}
const chatTex=canvasTex(128,96,(g,w,h)=>{g.fillStyle='#ff2d55';g.beginPath();g.ellipse(64,42,58,38,0,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(30,70);g.lineTo(20,94);g.lineTo(52,76);g.fill();g.fillStyle='#fff';g.font='800 38px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('99+',64,44);});
const couponTex=canvasTex(128,64,(g,w,h)=>{g.fillStyle='#ffd23d';g.fillRect(0,0,w,h);g.strokeStyle='#c0392b';g.setLineDash([6,4]);g.lineWidth=4;g.strokeRect(4,4,w-8,h-8);g.fillStyle='#c0392b';g.font='800 30px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('-5%',w/2,h/2);});
function projMesh(kind){
  if(kind==='chat'){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:chatTex}));s.scale.set(0.75,0.56,1);return s;}
  if(kind==='file'){const g=new THREE.Group();vbox(0.4,0.06,0.5,M('#2c6fb3'),0,0,0,g);vbox(0.3,0.065,0.3,M('#fff'),0,0,0.05,g);return g;}
  if(kind==='book'){const g=new THREE.Group();vbox(0.34,0.46,0.09,M(pick(['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad'])),0,0,0,g);return g;}
  if(kind==='paper'){const p=new THREE.Mesh(new THREE.PlaneGeometry(0.35,0.45),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));return p;}
  return new THREE.Group();
}
function fireProj(owner,kind,ang,o){
  const mesh=o.mesh||projMesh(kind);scene.add(mesh);
  const sp=o.speed||12,y=owner.y+1.3*owner.S;
  const p={id:++PJSEQ,wt:o.wt||null,mesh,owner,kind,x:owner.pos.x+Math.sin(ang)*0.7,y,z:owner.pos.z+Math.cos(ang)*0.7,vx:Math.sin(ang)*sp,vy:o.vy||0,vz:Math.cos(ang)*sp,grav:o.grav||0,dmg:o.dmg||5,knock:o.knock||3,stun:o.stun||0.35,launch:o.launch||0,kd:o.kd||0,life:o.life||1.3,r:o.r||0.4,spin:o.spin||0,visual:o.visual,target:o.target};
  mesh.position.set(p.x,p.y,p.z);projs.push(p);return p;
}
function killProj(i,fx){const p=projs[i];if(fx)burst(V(p.x,p.y,p.z),0xffffff,5,2);scene.remove(p.mesh);projs.splice(i,1);}
function updProjs(dt){
  for(let i=projs.length-1;i>=0;i--){const p=projs[i];p.life-=dt;
    if(p.target){const t=p.target;const dx=t.pos.x-p.x,dz=t.pos.z-p.z,dy=t.y+1.3-p.y,d=Math.hypot(dx,dy,dz);if(d<0.4||p.life<=0){killProj(i);continue;}const sp=14;p.vx=dx/d*sp;p.vy=dy/d*sp;p.vz=dz/d*sp;}
    p.vy-=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.mesh.position.set(p.x,p.y,p.z);
    if(p.spin){p.mesh.rotation.y+=p.spin*dt;p.mesh.rotation.x+=p.spin*0.6*dt;}
    if(p.life<=0){killProj(i,!p.visual);continue;}
    if(p.visual)continue;
    let dead=false;
    for(const e of G.f){if(e===p.owner||e.team===p.owner.team||e.state==='ko')continue;
      if(Math.hypot(e.pos.x-p.x,e.pos.z-p.z)<p.r+e.r&&p.y>e.y-0.2&&p.y<e.y+e.h){const v=Math.hypot(p.vx,p.vz)||1;
        e.takeHit(p.owner,{dmg:p.dmg,knock:p.knock,stun:p.stun,launch:p.launch,kd:p.kd,dir:{x:p.vx/v,z:p.vz/v},heavy:p.dmg>=10});dead=true;break;}}
    const b=!dead&&pointInSolid(p.x,p.y,p.z);
    if(b&&b.tag==='glass2'){breakPane(b,null);}
    else if(b&&b.brk&&(p.wt||p.dmg>=10))hitBreakable(b,p.dmg>=14?2:1,p.owner);
    if(dead||(b&&b.tag!=='curb')||p.y<groundAt(p.x,p.z,p.y)-0.05){killProj(i,true);}
  }
}
function ringFx(x,y,z,maxR,color,life=0.45){const m=new THREE.Mesh(new THREE.RingGeometry(0.85,1,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,y+0.1,z);scene.add(m);rings.push({mesh:m,t:0,life,maxR});}
function aoe(f,o){
  ringFx(f.pos.x,f.y,f.pos.z,o.r,o.color||0xffffff);ringFx(f.pos.x,f.y+1,f.pos.z,o.r*0.8,o.color||0xffffff,0.6);
  G.shake=Math.max(G.shake,0.3);
  for(const e of enemiesOf(f)){const dx=e.pos.x-f.pos.x,dz=e.pos.z-f.pos.z,d=Math.hypot(dx,dz);
    if(d>o.r||Math.abs(e.y-f.y)>2.2)continue;if(o.cone&&d>0.4&&angDiff(f.face,Math.atan2(dx,dz))>o.cone)continue;
    const r=e.takeHit(f,{dmg:o.dmg*f.ch.pow,knock:o.knock,stun:o.dizzy?0.5:0.6,launch:o.launch,kd:o.kd,unblockable:o.unblockable,heavy:1});
    if(r===true&&o.dizzy&&e.fx.immune<=0){e.fx.dizzy=o.dizzy;popup('มึนนน 💫',e.headPos().add(V(0,0.7,0)),'info',1);}}
}
function spawnCoupon(f,x,z){const y=groundAt(x,z,f.y+0.5);return couponAt(++CPSEQ,f.pos.x,f.y+1.3,f.pos.z,x,y,z,f);}
function couponAt(id,sx,sy,sz,x,y,z,owner){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.28),new THREE.MeshBasicMaterial({map:couponTex,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.rotation.z=rand(0,3);m.position.set(sx,sy,sz);scene.add(m);const c={id,mesh:m,x,z,y,t:0,owner,sx,sz,sy};coupons.push(c);return c;}
function couponGone(c){}
function spawnCloud(f){return cloudAt(f.pos.x,f.y,f.pos.z,f);}
function cloudAt(x,y,z,owner){const g=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:0x9fc59a,transparent:true,opacity:.5,roughness:1,depthWrite:false});
  for(let i=0;i<14;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(rand(.6,1.1),10,8),mat);s.position.set(rand(-2,2),rand(0.3,1.8),rand(-2,2));g.add(s);}
  g.position.set(x,y,z);scene.add(g);clouds.push({g,mat,x,z,y,t:0,life:5.5,owner,tick:0});}
function spawnDrop(f,x,z){const y=groundAt(x,z,20);dropAt(x,z,f);SFX.vo('war_fire_in_the_hole');popup('⚠️ แกรนด์กำลังตก!',V(x,y+1.5,z),'crit',1);}
function mkSofa(){const g=new THREE.Group();const m=M('#3aa59a',{roughness:.8}),d=M('#2a7f76');vbox(2.1,0.45,0.95,m,0,0.35,0,g);vbox(2.1,0.7,0.25,d,0,0.8,-0.38,g);for(const s of[-1,1])vbox(0.25,0.6,0.95,d,s*1.0,0.55,0,g);for(const s of[-1,1])vbox(0.9,0.15,0.75,M('#f3d9a4'),s*0.48,0.64,0.06,g);return g;}
function dropAt(x,z,owner,kind){kind=kind==='sofa'?'sofa':'grand';const y=groundAt(x,z,20);
  const warn=new THREE.Mesh(new THREE.CircleGeometry(1.9,32),new THREE.MeshBasicMaterial({color:0xff2020,transparent:true,opacity:.35}));warn.rotation.x=-Math.PI/2;warn.position.set(x,y+0.03,z);scene.add(warn);
  const piano=kind==='sofa'?mkSofa():mkGrand();const H=kind==='sofa'?7:14;piano.position.set(x,y+H,z);piano.rotation.y=rand(0,6);scene.add(piano);
  drops.push({x,z,y,t:0,owner,warn,piano,done:false,kind,H,delay:kind==='sofa'?0.2:0.85});}
const LATER=[];function later(t,fn){LATER.push({t,fn});}
function doFlash(f,r,dmg,stun){SFX.shutter();const L=new THREE.PointLight(0xffffff,7,18);L.position.copy(f.headPos());scene.add(L);setTimeout(()=>scene.remove(L),120);ringFx(f.pos.x,f.y+1.2,f.pos.z,r,0xffffff,0.3);
  for(const e of enemiesOf(f)){const d=Math.hypot(e.pos.x-f.pos.x,e.pos.z-f.pos.z);if(d<r&&Math.abs(e.y-f.y)<3){const res=e.takeHit(f,{dmg,knock:2,stun,unblockable:1});if(res){popup('ตาพร่า! 😵',e.headPos().add(V(0,0.7,0)),'info',0.9);flashFor(e);}}}}
function addTape(a,b){const m=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,1),M('#f1c40f',{emissive:new THREE.Color('#f1c40f'),emissiveIntensity:.4}));scene.add(m);tapes.push({mesh:m,a,b,t:0});}
function flashFor(f){if(f.human===0)flashScreen();}
function updEffects(dt){
  for(let i=LATER.length-1;i>=0;i--){LATER[i].t-=dt;if(LATER[i].t<=0){const L=LATER.splice(i,1)[0];try{L.fn();}catch(e){console.error(e);}}}
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const k=r.t/r.life;r.mesh.scale.setScalar(0.3+k*r.maxR);r.mesh.material.opacity=0.9*(1-k);if(k>=1){scene.remove(r.mesh);rings.splice(i,1);}}
  for(let i=clouds.length-1;i>=0;i--){const c=clouds[i];c.t+=dt;c.g.rotation.y+=dt*0.4;c.g.children.forEach((s,j)=>{s.position.y+=Math.sin(c.t*2+j)*0.003;});
    c.mat.opacity=0.5*Math.min(1,c.t*3)*Math.min(1,(c.life-c.t)*2);c.tick-=dt;
    if(c.owner&&c.tick<=0&&G.phase==='fight'){c.tick=0.5;for(const e of enemiesOf(c.owner)){if(Math.hypot(e.pos.x-c.x,e.pos.z-c.z)<3.1&&Math.abs(e.y-c.y)<2.5&&e.fx.immune<=0){e.fx.dizzy=Math.max(e.fx.dizzy,1.0);e.fx.slow=Math.max(e.fx.slow,1.0);if(e.state!=='down'&&e.invT<=0){e.hp=Math.max(1,e.hp-2);}if(Math.random()<.25)popup(pick(['ฟินนน~','มึนๆ','เบลอ~']),e.headPos().add(V(0,0.6,0)),'info',0.9);}}}
    if(c.t>=c.life){scene.remove(c.g);clouds.splice(i,1);}}
  for(let i=coupons.length-1;i>=0;i--){const c=coupons[i];c.t+=dt;
    if(c.t<0.35){const k=c.t/0.35;c.mesh.position.set(lerp(c.sx,c.x,k),lerp(c.sy,c.y+0.02,k)+Math.sin(k*Math.PI)*1.2,lerp(c.sz,c.z,k));c.mesh.rotation.z+=dt*12;continue;}
    c.mesh.position.set(c.x,c.y+0.02,c.z);
    let used=false;
    if(c.owner)for(const e of enemiesOf(c.owner)){if(e.state==='down'||e.invT>0)continue;if(Math.hypot(e.pos.x-c.x,e.pos.z-c.z)<0.6&&Math.abs(e.y-c.y)<0.4){e.takeHit(c.owner,{dmg:6,knock:2,stun:.5,kd:1,unblockable:1});popup('ลื่นคูปอง!',e.headPos().add(V(0,0.5,0)),'combo',1);used=true;break;}}
    if(used||c.t>8||c.gone){if(c.owner)couponGone(c);scene.remove(c.mesh);coupons.splice(i,1);}}
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.t+=dt;d.warn.material.opacity=0.25+0.25*Math.sin(d.t*20);
    if(d.t>d.delay&&!d.done){const k=Math.min(1,(d.t-d.delay)/0.3);d.piano.position.y=d.y+d.H*(1-k*k);
      if(k>=1){d.done=true;const sofa=d.kind==='sofa';if(d.owner){smashArea(d.x,d.z,2.2,3,d.y);if(sofa)SFX.sofa();else SFX.crash();G.shake=Math.max(G.shake,0.7);burst(V(d.x,d.y+0.5,d.z),sofa?0x3aa59a:0x222222,18,5);ringFx(d.x,d.y,d.z,2.4,0xffffff);}
        if(d.owner)for(const e of enemiesOf(d.owner)){if(Math.hypot(e.pos.x-d.x,e.pos.z-d.z)<2.1&&e.y<d.y+2.5){e.takeHit(d.owner,{dmg:(sofa?22:26)*d.owner.ch.pow,knock:6,stun:1,launch:6,kd:1,unblockable:1,heavy:1});popup(sofa?'โดนโซฟาทับ! 🛋️':'โดนแกรนด์ทับ! 🎹',e.headPos().add(V(0,0.8,0)),'crit',1.3);}}}}
    if(d.done){d.warn.material.opacity=Math.max(0,0.5-(d.t-d.delay-0.3));if(d.t>2.4)d.piano.position.y-=dt*1.5;}
    if(d.t>3.2){scene.remove(d.warn);scene.remove(d.piano);drops.splice(i,1);}}
  for(let i=tapes.length-1;i>=0;i--){const t=tapes[i];t.t+=dt;const a=t.a.headPos(),b=t.b.headPos();a.y-=0.6;b.y-=0.6;const mid=a.clone().add(b).multiplyScalar(0.5);t.mesh.position.copy(mid);t.mesh.lookAt(b);t.mesh.scale.set(1,1,Math.max(0.1,a.distanceTo(b)));if(t.t>0.45){scene.remove(t.mesh);tapes.splice(i,1);}}
}

/* ================= SMOKE / WIND / HIT FX ================= */
const CRIT=0.12;
const puffs=[],winds=[],ghosts=[];const puffGeo=new THREE.SphereGeometry(1,10,8),windGeo=new THREE.BoxGeometry(0.035,0.035,1);
function puff(x,y,z,color,n,size,spd){puffFx(x,y,z,color,n,size,spd);}
function puffFx(x,y,z,color,n,size,spd){for(let i=0;i<n&&puffs.length<260;i++){const m=new THREE.Mesh(puffGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false}));
  const s0=size*rand(0.6,1.1);m.scale.setScalar(s0*0.4);m.position.set(x+rand(-.3,.3)*size,y+rand(0,.3)*size,z+rand(-.3,.3)*size);scene.add(m);
  const a=rand(0,6.28),v=rand(0.3,1)*spd;puffs.push({m,vx:Math.cos(a)*v,vy:rand(0.3,1.2)*spd*0.4+0.3,vz:Math.sin(a)*v,s0,t:0,life:rand(0.5,0.9)*(0.6+size*0.5)});}}
function windFx(x,y,z,ang,len){if(winds.length>90)return;const m=new THREE.Mesh(windGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthWrite:false}));
  m.scale.z=len;m.rotation.y=ang;m.position.set(x,y,z);scene.add(m);winds.push({m,dx:Math.sin(ang),dz:Math.cos(ang),t:0,life:0.34,len});}
const ghostTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(64,52,36,Math.PI,0);g.lineTo(100,108);for(let i=0;i<4;i++){g.lineTo(91-i*18,96);g.lineTo(82-i*18,108);}g.lineTo(28,52);g.fill();
  g.fillStyle='#111';g.beginPath();g.ellipse(52,52,6,9,0,0,7);g.ellipse(76,52,6,9,0,0,7);g.fill();g.beginPath();g.ellipse(64,74,7,9,0,0,7);g.fill();});
function koDustFx(p,txt){
  puffFx(p.x,p.y,p.z,0xcfc6b0,24,1.25,4.2);puffFx(p.x,p.y+0.4,p.z,0xffffff,8,0.9,2.5);RAWF0.burst(p.clone(),0xffe14d,12,5);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ghostTex,transparent:true,depthWrite:false}));sp.scale.set(1.1,1.1,1);sp.position.copy(p);scene.add(sp);ghosts.push({m:sp,t:0,x:p.x});
  RAWF0.popup(txt||'ปุ้ง!!',p.clone().add(V(0,1.2,0)),'crit',1.2);SFX_RAW('smoke');SFX_RAW('thud');G.shake=Math.max(G.shake,0.45);
}
function koDust(p,txt){koDustFx(p,txt);}
function critFx(f,hp){RAWF0.burst(hp.clone(),0xffe14d,16,5.5);ringFx(hp.x,hp.y-0.4,hp.z,1.8,0xffe14d,0.3);popup(pick(['คริ!! 💥','คริติคอล!!','เข้าเต็มๆ!!']),hp.clone().add(V(0,1.0,0)),'crit',1.1);G.slowT=Math.max(G.slowT,0.12);}
function comboPop(att){const n=att.comboN,hp=att.headPos().add(V(0,1.1,0));
  popup(n>=12?'คอมโบเทพ!! '+n+' HIT':n>=8?n+' HIT!! โหดมาก':n>=5?n+' HIT! สุดยอด':n+' HIT!',hp,'combo',0.7+Math.min(0.6,n*0.04));
  if(n===8||n===12||n===20){banner(att.ch.name+' — '+n+'-HIT COMBO!! 🔥',1.5);hype=1;}}
function landQuake(f,d){const big=!!d.quake,R=big?3.8:2.2;
  ringFx(f.pos.x,f.y,f.pos.z,R,0xd8cbb0,0.5);ringFx(f.pos.x,f.y+0.4,f.pos.z,R*0.8,0xffffff,0.4);
  for(let i=0;i<(big?14:9);i++){const a=i/(big?14:9)*Math.PI*2;puff(f.pos.x+Math.sin(a)*R*0.55,f.y+0.15,f.pos.z+Math.cos(a)*R*0.55,0xd8cbb0,1,big?0.9:0.6,2.6);}
  G.shake=Math.max(G.shake,big?0.85:0.5);if(big){SFX.crash();smashArea(f.pos.x,f.pos.z,R,2,f.y);}else SFX.thud();}
function updSmoke(dt){
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t+=dt;const k=Math.min(1,p.t/p.life),dr=Math.exp(-3*dt);p.vx*=dr;p.vz*=dr;
    p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.m.scale.setScalar(p.s0*(0.4+0.9*Math.sqrt(k)));p.m.material.opacity=0.7*(1-k);
    if(k>=1){scene.remove(p.m);p.m.material.dispose();puffs.splice(i,1);}}
  for(let i=winds.length-1;i>=0;i--){const w=winds[i];w.t+=dt;const k=w.t/w.life;w.m.position.x+=w.dx*14*dt;w.m.position.z+=w.dz*14*dt;w.m.scale.z=w.len*(1-k*0.6);w.m.material.opacity=0.8*(1-k);
    if(k>=1){scene.remove(w.m);w.m.material.dispose();winds.splice(i,1);}}
  for(let i=ghosts.length-1;i>=0;i--){const g=ghosts[i];g.t+=dt;g.m.position.y+=dt*1.3;g.m.position.x=g.x+Math.sin(g.t*4)*0.3;g.m.material.opacity=Math.min(1,2.4-g.t);
    if(g.t>2.4){scene.remove(g.m);g.m.material.dispose();ghosts.splice(i,1);}}
}
function clearSmoke(){for(const a of[puffs,winds,ghosts]){a.forEach(o=>{scene.remove(o.m);o.m.material.dispose();});a.length=0;}}
// raw (never broadcast) versions — net.js wraps popup/burst/SFX for online play
const RAWF0={popup:(...a)=>popup(...a),burst:(...a)=>burst(...a)};
function SFX_RAW(k){if(typeof SFX[k]==='function')SFX[k]();}

/* ================= SPECIALS ================= */
const SPECIALS={
  files:{name:'สั่งงานด่วน!!',range:8,fn:f=>{for(let i=-2;i<=2;i++)fireProj(f,'file',f.face+i*0.22,{speed:13,dmg:7,knock:4,stun:.4,spin:12});SFX.whoosh();}},
  chat:{name:'ตอบแชทรัวๆ!!',range:9,fn:f=>{f.stream={n:9,t:0,iv:.07,kind:'chat',o:{speed:16,dmg:3.2,knock:1.6,stun:.28},spread:.12};}},
  books:{name:'หนังสือมาใหม่!!',range:8,fn:f=>{f.stream={n:6,t:0,iv:.1,kind:'book',o:{speed:12,dmg:5,knock:2.5,stun:.32,spin:10},spread:.3};}},
  trap:{name:'คูปองลด 5%!!',range:4,fn:f=>{for(let i=0;i<8;i++){const a=f.face+rand(-1,1),d=rand(1.1,4.2);spawnCoupon(f,f.pos.x+Math.sin(a)*d,f.pos.z+Math.cos(a)*d);}}},
  fork:{name:'ส้อมเสียง A440!!',range:3.2,fn:f=>{aoe(f,{r:3.4,dmg:8,dizzy:2.2,knock:3,color:0x7fe0ff,unblockable:1});SFX.tone('sine',440,0,1.6,0.35);SFX.tone('sine',880,0,1.2,0.12);}},
  chord:{name:'Power Chord สามช่า!!',range:6,fn:f=>{const wave=i=>{if(f.state==='ko'||G.phase!=='fight')return;aoe(f,{r:4+i*1.6,cone:0.95,dmg:i<2?9:20,knock:i<2?6:14,launch:i<2?0:7,kd:i===2?1:0,color:i<2?0xff8a00:0xff2a00,unblockable:i===2?1:0});SFX.chord(i);if(i===2){G.shake=Math.max(G.shake,0.7);popup('ร็อคไม่ตาย!! 🎸🔥',f.headPos().add(V(0,1,0)),'crit',1.3);}};wave(0);later(0.32,()=>wave(1));later(0.64,()=>wave(2));}},
  drop:{name:'ยกแกรนด์ทุ่ม!!',range:11,fn:f=>{const t=nearestEnemy(f,13);const x=t?t.pos.x:f.pos.x+Math.sin(f.face)*3,z=t?t.pos.z:f.pos.z+Math.cos(f.face)*3;spawnDrop(f,x,z);}},
  audit:{name:'หักภาษี ณ ที่จ่าย!!',range:8,fn:f=>{const t=nearestEnemy(f,9);if(!t){popup('ไม่มีใครให้หักภาษี',f.headPos(),'info');return;}
    const r=t.takeHit(f,{dmg:14,knock:2,stun:.6,unblockable:1});if(r){f.heal(14);popup('-14 ภาษี 💸',t.headPos().add(V(0,0.8,0)),'crit',1.2);popup('+14',f.headPos().add(V(0,0.6,0)),'good',1);}
    for(let i=0;i<3;i++){const p=fireProj(t,'paper',0,{visual:1,life:1.2,target:f});p.x+=rand(-.3,.3);p.y+=rand(0,.5);}}},
  flash:{name:'ปาปารัซซี่แฟลช!!',range:7,fn:f=>{doFlash(f,7.5,10,2.4);G.shake=Math.max(G.shake,0.3);[0.4,0.62,0.84].forEach((t,i)=>later(t,()=>{if(f.state!=='ko'&&G.phase==='fight')doFlash(f,6.5,5,0.7);}));later(1.0,()=>{if(f.state!=='ko'){f.fx.slow=0;popup('ได้ช็อตเด็ด! 📸',f.headPos().add(V(0,0.8,0)),'combo',1.1);}});}},
  dash:{name:'ทอร์นาโดเกาหลี!!',range:6,fn:f=>{f.state='dash';f.dashing={t:1.15,sp:6.5,tornado:true,tick:0};SFX.tornado();G.slowT=Math.max(G.slowT,0.15);}},
  pull:{name:'รีโนเวทด่วน!!',range:9,fn:f=>{const ts=enemiesOf(f).filter(e=>Math.hypot(e.pos.x-f.pos.x,e.pos.z-f.pos.z)<9.5&&e.state!=='down'&&e.invT<=0&&Math.abs(e.y-f.y)<3);
    if(!ts.length){popup('วัดไม่ถึง!',f.headPos(),'info');return;}
    ts.forEach((t,i)=>{if(t.state==='grab'&&t.victim){t.victim.state='idle';t.victim.grabbedBy=null;t.victim=null;}addTape(f,t);t.state='stun';t.stunT=1.8;t.atk=null;t.stream=null;t.dashing=null;t.pulled={by:f,t:.3,off:(i-(ts.length-1)/2)*0.75};});
    SFX.zap();later(0.42,()=>{if(f.state==='ko')return;const fw=f.fwd();dropAt(f.pos.x+fw.x*1.3,f.pos.z+fw.z*1.3,f,'sofa');popup('โซฟามาแล้ว! 🛋️',f.headPos().add(V(0,0.8,0)),'combo',1.1);});}},
  cloud:{name:'ควันเขียว~',range:2.6,fn:f=>{spawnCloud(f);SFX.smoke();}},
  buff:{name:'เบ่งกล้ามระเบิด!!',range:4,fn:f=>{f.fx.buff=8;SFX.flex();aoe(f,{r:4.2,dmg:12,knock:10,launch:5,kd:1,color:0xff3030,unblockable:1});ringFx(f.pos.x,f.y+1,f.pos.z,3,0xffd23d,0.5);G.shake=Math.max(G.shake,0.55);popup('กล้ามระเบิด!! 💪💥',f.headPos().add(V(0,0.9,0)),'crit',1.4);}},
  finisher:{name:'รับจบทั้งทีม!!',range:11,fn:f=>{const ts=enemiesOf(f).filter(e=>e.state!=='down'&&e.invT<=0&&Math.hypot(e.pos.x-f.pos.x,e.pos.z-f.pos.z)<12).sort((a,b)=>Math.hypot(a.pos.x-f.pos.x,a.pos.z-f.pos.z)-Math.hypot(b.pos.x-f.pos.x,b.pos.z-f.pos.z)).slice(0,3);if(!ts.length){popup('ไม่มีงานให้รับ',f.headPos(),'info');return;}f.state='dash';f.dashing={t:0.7,sp:22,targets:ts,ti:0};G.slowT=Math.max(G.slowT,0.2);}},
  random:{name:'ทำทุกอย่าง!!',range:6,fn:f=>{const k=pick(SP_LIST.filter(k=>k!=='random'));popup('('+SPECIALS[k].name+')',f.headPos().add(V(0,1.4,0)),'combo',1.3);SPECIALS[k].fn(f);}},
};

/* ================= FIGHTER ================= */
/* one-line Thai explanations for the move list (📖 ท่าทั้งหมด) */
Object.assign(SPECIALS,{
  rush:{name:'หมัดพันหมัด!!',range:2.2,atk:'rushAtk'},
  superKick:{name:'ถีบเหินฟ้า!!',range:6,atk:'superKick'},
  skyUpper:{name:'อัปเปอร์เสียดฟ้า!!',range:2.2,atk:'skyUpper'},
  quake:{name:'กระทืบแผ่นดินไหว!!',range:3.6,atk:'quake'},
  megaSlap:{name:'ตบเรียกสติ!!',range:2.4,atk:'megaSlap'},
  suplex:{name:'ซูเพล็กซ์ทะลุพื้น!!',range:2.8,fn:f=>f.doGrab(true)},
  wind:{name:'พัดลมเบอร์ 3!!',range:8,fn:f=>{f.wind={t:1.6,tick:0};SFX.tornado();}},
  parry:{name:'รับแล้วสวน!!',range:2.5,fn:f=>{f.fx.parry=1.3;popup('ตั้งท่ารับ... 🛡️',f.headPos().add(V(0,0.7,0)),'info',1);}},
});
for(const k in SPECIALS)if(SPECIALS[k].atk&&!SPECIALS[k].fn){const a=SPECIALS[k].atk;SPECIALS[k].fn=f=>f.startAtk(a,'special');}
const SP_DESC={
  files:'Fires 5 work files in a fan — long range',
  chat:'Spams 9 chat bubbles straight ahead',
  books:'Throws 6 books in a spread',
  trap:'Scatters 8 coupons on the floor — step on one and slip (unblockable)',
  fork:'A tuning-fork ring around you, unblockable, dizzy for 2 s',
  chord:'Three sound waves in front, the last one strongest — unblockable knockdown',
  drop:'A grand piano drops on the nearest enemy (red circle warns them)',
  audit:'Takes 14 HP from the nearest enemy (unblockable) and gives it to you',
  flash:'Camera flash around you, unblockable, blinds — then 3 more shots',
  dash:'Spinning tornado dash forward for about a second, hitting non-stop',
  pull:'Tape-measures everyone nearby towards you, dizzy, then drops a sofa on them',
  cloud:'Green smoke around you for 5 s — anyone inside gets dizzy, slow and loses HP',
  buff:'Muscle burst around you (unblockable knockdown), then bigger for 8 s with stronger hooks',
  finisher:'Dashes through up to 3 of the closest enemies one by one',
  random:'Uses a random other special — good luck!',
  rush:'16 rapid punches ahead, unblockable, ending with a launcher',
  superKick:'A huge flying kick — whoever it hits flies into the wall',
  skyUpper:'Jumping uppercut that launches higher than anything else',
  quake:'Jump high and stomp — a dust shockwave throws everyone around you',
  megaSlap:'One giant-hand slap — unblockable, flies far, dizzy for 2 s',
  suplex:'Grabs someone from far away and suplexes them over your head',
  wind:'Desk fan on full blast for 1.6 s — blows people into the furniture',
  parry:'Counter stance for 1.3 s — get hit and you strike back hard',
};
// English names of the specials for menus (the Thai name is what fighters shout in game)
const SP_EN={files:'Urgent Files!!',chat:'Chat Spam!!',books:'New Books!!',trap:'5% Off Coupons!!',fork:'Tuning Fork A440!!',chord:'Power Chord!!',drop:'Grand Piano Drop!!',audit:'Tax Audit!!',
  flash:'Paparazzi Flash!!',dash:'Tornado Dash!!',pull:'Rush Renovation!!',cloud:'Chill Smoke~',buff:'Muscle Burst!!',finisher:'Clean-Up Crew!!',random:'Do Everything!!',
  rush:'Thousand Fists!!',superKick:'Sky Kick!!',skyUpper:'Sky-High Uppercut!!',quake:'Earthquake Stomp!!',megaSlap:'Wake-Up Slap!!',suplex:'Mega Suplex!!',wind:'Fan on Max!!',parry:'Counter Stance!!'};
const spName=k=>SP_EN[k]||(SPECIALS[k]&&SPECIALS[k].name)||k;
const SP_LIST=['rush','superKick','skyUpper','quake','megaSlap','suplex','finisher','dash','buff','parry','wind','chord','fork','flash','pull','cloud','drop','trap','audit','random'];
const SP_MELEE=new Set(['rush','superKick','skyUpper','quake','megaSlap','suplex','finisher','dash','buff','parry']);
const SP_ICON={rush:'👊',superKick:'🦶',skyUpper:'🚀',quake:'💥',megaSlap:'🖐️',suplex:'🤼',finisher:'✔️',dash:'🌪️',buff:'💪',parry:'🛡️',wind:'🌬️',chord:'🎸',fork:'🎶',flash:'📸',pull:'📏',cloud:'💨',drop:'🎹',trap:'🎟️',audit:'💸',random:'🎲',files:'📁',chat:'💬',books:'📚'};
function randLoadout(){return{st:pick(STYLE_KEYS),sp:pick(SP_LIST)};}
const ATK={
  jab:{startup:.11,active:.08,recover:.15,dmg:5,range:1.6,knock:1.8,stun:.26,rage:7},
  hook:{startup:.24,active:.1,recover:.3,dmg:10,range:1.6,knock:4.2,stun:.42,rage:11},
  combo:{startup:.14,active:.1,recover:.36,dmg:14,range:1.7,knock:5,stun:.9,rage:12,launch:7,kd:1},
  swingL:{startup:.16,active:.1,recover:.22,dmg:7,range:1.7,knock:3,stun:.35,rage:8},
  swingH:{startup:.3,active:.12,recover:.36,dmg:12,range:1.7,knock:6,stun:.6,rage:12,launch:4,kd:1},
  cast:{startup:.3,active:.05,recover:.38,dmg:0,range:0},
  // pose = how arms/legs/body move (glovePose/animate) · lunge = slide forward between a..b s · sweep = hits anything touched while active
  // multi = n hits every iv (last = overrides for the final hit) · jumpV + onLand = hop and hit on landing · arc = 360° hit
  slapL:{startup:.08,active:.07,recover:.12,dmg:4,range:1.5,knock:1.4,stun:.24,rage:7,pose:'slap'},
  slapH:{startup:.17,active:.09,recover:.24,dmg:8,range:1.6,knock:3.6,stun:.4,rage:10,pose:'slapH',heavy:1},
  spinSlap:{startup:.12,active:.46,recover:.3,dmg:4,range:1.9,knock:1.6,stun:.45,rage:4,pose:'spin',arc:1,multi:{n:4,iv:.12,last:{dmg:7,knock:7,launch:5,kd:1,heavy:1}},call:'ตบหมุน 360!!'},
  kickL:{startup:.14,active:.08,recover:.2,dmg:6,range:2.0,knock:2.2,stun:.3,rage:8,pose:'kick'},
  kickH:{startup:.3,active:.1,recover:.34,dmg:12,range:2.2,knock:5.5,stun:.5,rage:12,pose:'kickH',heavy:1},
  dropkick:{startup:.16,active:.38,recover:.45,dmg:15,range:1.5,knock:11,stun:.9,launch:4,kd:1,rage:12,pose:'dropkick',lunge:{sp:9,a:.1,b:.54},sweep:1,jumpV:4.2,heavy:1,call:'ถีบยอดหน้า!!'},
  chop:{startup:.13,active:.08,recover:.2,dmg:6,range:1.5,knock:1.8,stun:.32,rage:8,pose:'chop'},
  lariat:{startup:.26,active:.14,recover:.32,dmg:11,range:1.8,knock:6,stun:.55,launch:3,kd:1,rage:12,pose:'lariat',lunge:{sp:5,a:.12,b:.4},heavy:1},
  bodyslam:{startup:.6,active:.08,recover:.4,dmg:16,range:2.4,knock:7,stun:.8,launch:6,kd:1,rage:12,pose:'slam',arc:1,jumpV:7.2,onLand:1,heavy:1,call:'บอดี้สแลม!!'},
  elbow:{startup:.1,active:.08,recover:.18,dmg:5.5,range:1.4,knock:2,stun:.3,rage:8,pose:'elbow'},
  headbutt:{startup:.22,active:.1,recover:.3,dmg:11,range:1.5,knock:4.5,stun:.6,rage:12,pose:'head',heavy:1,dizzy:.8},
  rocket:{startup:.2,active:.42,recover:.45,dmg:14,range:1.4,knock:9,stun:1,launch:5,kd:1,rage:12,pose:'rocket',lunge:{sp:11,a:.18,b:.62},sweep:1,heavy:1,dizzy:1.5,call:'จรวดหัวร้อน!!'},
  drunkL:{startup:.12,active:.1,recover:.2,dmg:5,range:1.6,knock:2.6,stun:.3,rage:8,pose:'jab'},
  drunkH:{startup:.28,active:.1,recover:.3,dmg:11,range:1.7,knock:5,stun:.5,rage:11,pose:'hook',heavy:1},
  roll:{startup:.14,active:.5,recover:.35,dmg:12,range:1.4,knock:8,stun:.8,launch:4,kd:1,rage:12,pose:'roll',lunge:{sp:8,a:.12,b:.64},sweep:1,heavy:1,call:'กลิ้งชน!!'},
  // specials that are just a big move
  rushAtk:{startup:.1,active:1.2,recover:.35,dmg:2.4,range:2.0,knock:.5,stun:.3,rage:0,pose:'rush',multi:{n:16,iv:.07,last:{dmg:12,knock:9,launch:7,kd:1,heavy:1}},unblockable:1,noCrit:1},
  superKick:{startup:.18,active:.5,recover:.5,dmg:22,range:1.7,knock:16,stun:1.1,launch:6,kd:1,rage:0,pose:'dropkick',lunge:{sp:15,a:.12,b:.68},sweep:1,jumpV:5,heavy:1,unblockable:1},
  skyUpper:{startup:.2,active:.12,recover:.6,dmg:22,range:1.9,knock:3,stun:1.2,launch:13,kd:1,rage:0,pose:'skyUpper',jumpV:9,jumpAt:.18,heavy:1,unblockable:1},
  quake:{startup:.83,active:.08,recover:.55,dmg:18,range:4.0,knock:9,stun:.9,launch:7,kd:1,rage:0,pose:'slam',arc:1,jumpV:10,onLand:1,heavy:1,unblockable:1,quake:1},
  megaSlap:{startup:.32,active:.1,recover:.45,dmg:20,range:2.3,knock:15,stun:1,launch:4,kd:1,rage:0,pose:'slap',bigGlove:1,heavy:1,unblockable:1,dizzy:2},
};
// fighting styles: same 3 buttons (jab / hook / jab-jab-hook combo), different moves + a small trait
const STYLES={
  box:{name:'Boxer',icon:'🥊',desc:'Balanced, quick hands, combo ends in a launching uppercut',atk:{jab:'jab',hook:'hook',combo:'combo'},mv:['jab','hook','uppercut']},
  slap:{name:'Slapper',icon:'👋',desc:'Fastest hands in town; the combo is a 360° spin-slap that hits everyone around',atk:{jab:'slapL',hook:'slapH',combo:'spinSlap'},mv:['slap','backhand','360 spin-slap']},
  kick:{name:'Kicker',icon:'🦵',desc:'Longest reach, a bit slower; the combo is a flying drop-kick',atk:{jab:'kickL',hook:'kickH',combo:'dropkick'},mv:['low kick','roundhouse','drop-kick']},
  wrestle:{name:'Wrestler',icon:'🤼',desc:'Grabs from further, throws harder, combo is a body-slam (walks a little slower)',atk:{jab:'chop',hook:'lariat',combo:'bodyslam'},mv:['chop','lariat','body-slam'],spd:0.93,grabR:2.0,throwMul:1.5},
  head:{name:'Hothead',icon:'🔥',desc:'Headbutts make people dizzy, special fills faster, combo is a rocket headbutt',atk:{jab:'elbow',hook:'headbutt',combo:'rocket'},mv:['elbow','headbutt','rocket head'],rageMul:1.25},
  drunk:{name:'Party Animal',icon:'🍻',desc:'Wobbly walk, dodges 20% of hits by luck, combo is a rolling tackle',atk:{jab:'drunkL',hook:'drunkH',combo:'roll'},mv:['wobble punch','haymaker','rolling tackle'],dodge:0.2},
};
const STYLE_KEYS=Object.keys(STYLES);
const armGeo=new THREE.CylinderGeometry(0.1,0.09,1,8);
const GLOVE_OFS=V(0,-0.04,0.06);
function seg(m,a,b){const d=b.clone().sub(a),l=d.length();m.position.copy(a).add(b).multiplyScalar(0.5);if(l>1e-4)m.quaternion.setFromUnitVectors(UPV,d.multiplyScalar(1/l));m.scale.y=Math.max(0.05,l);}
/* real 3D hair (inside the head group: head radius 0.5, centre at 0) */
/* ================= HATS (unlock rewards) =================
   Unlocked by total wins (all characters, all modes), picked per character on the loadout screen (ch.hat = index).
   makeHat(k) builds one in "hat units": brim/base at y = 0, about 1 unit radius — the caller scales it to the head. */
const HATS=[{k:'none',name:'No hat',icon:'🚫',need:0},{k:'party',name:'Party hat',icon:'🎉',need:1},{k:'crown',name:'Crown',icon:'👑',need:3},
  {k:'chef',name:'Chef hat',icon:'👨‍🍳',need:5},{k:'cone',name:'Traffic cone',icon:'🚧',need:8},{k:'halo',name:'Halo',icon:'😇',need:12},
  {k:'viking',name:'Viking helmet',icon:'⚔️',need:16},{k:'duck',name:'Rubber duck',icon:'🦆',need:22},{k:'piano',name:'Tiny grand piano',icon:'🎹',need:30}];
const totalWins=()=>Object.values(STATS.wins).reduce((a,b)=>a+(b|0),0);
const hatOk=i=>!!HATS[i]&&totalWins()>=HATS[i].need;
function makeHat(k){
  const g=new THREE.Group(),add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;g.add(o);return o;};
  if(k==='party'){const c=add(new THREE.ConeGeometry(0.55,1.5,20),M('#ff4fa3',{roughness:.5}),0,0.75);c.rotation.z=0.15;
    for(let i=0;i<3;i++)add(new THREE.TorusGeometry(0.42-i*0.13,0.05,6,20),M('#ffe14d'),0.03+i*0.06,0.25+i*0.4).rotation.x=Math.PI/2;
    add(new THREE.SphereGeometry(0.17,10,8),M('#4fd1ff'),0.21,1.5);}
  else if(k==='crown'){const gold=M('#ffcc33',{metalness:.8,roughness:.25});add(new THREE.CylinderGeometry(0.62,0.58,0.42,24,1,true),gold,0,0.21).material.side=THREE.DoubleSide;
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(new THREE.ConeGeometry(0.13,0.36,6),gold,Math.sin(a)*0.58,0.6,Math.cos(a)*0.58);
      add(new THREE.SphereGeometry(0.07,8,6),M(i%2?'#e0245e':'#2fa7ff',{roughness:.2}),Math.sin(a)*0.63,0.2,Math.cos(a)*0.63);}}
  else if(k==='chef'){const w=M('#ffffff',{roughness:.9});add(new THREE.CylinderGeometry(0.5,0.55,0.6,20),w,0,0.3);
    const p=add(new THREE.SphereGeometry(0.62,16,12),w,0,0.82);p.scale.set(1.05,0.75,1.05);}
  else if(k==='cone'){add(new THREE.BoxGeometry(1.2,0.08,1.2),M('#ff6a00'),0,0.04);add(new THREE.ConeGeometry(0.48,1.4,20),M('#ff6a00'),0,0.75);
    add(new THREE.CylinderGeometry(0.3,0.36,0.22,20),M('#ffffff'),0,0.75);}
  else if(k==='halo'){const h=add(new THREE.TorusGeometry(0.6,0.07,8,32),M('#fff27a',{emissive:new THREE.Color('#ffd23d'),emissiveIntensity:.9}),0,0.55);h.rotation.x=Math.PI/2;g.userData.spin=h;}
  else if(k==='viking'){add(new THREE.SphereGeometry(0.68,20,12,0,Math.PI*2,0,Math.PI/2),M('#9aa3ad',{metalness:.7,roughness:.35}),0,0);
    add(new THREE.TorusGeometry(0.68,0.06,6,24),M('#c58b2a',{metalness:.6}),0,0.04).rotation.x=Math.PI/2;
    for(const s of[-1,1]){const h=add(new THREE.ConeGeometry(0.14,0.75,10),M('#f3ead2'),s*0.78,0.45);h.rotation.z=-s*0.75;}}
  else if(k==='duck'){const y=M('#ffd21f',{roughness:.4});const b=add(new THREE.SphereGeometry(0.5,16,12),y,0,0.38);b.scale.set(1,0.75,1.25);
    add(new THREE.SphereGeometry(0.3,14,10),y,0,0.85,0.3);add(new THREE.ConeGeometry(0.12,0.3,10),M('#ff7a00'),0,0.82,0.65).rotation.x=Math.PI/2;
    for(const s of[-1,1])add(new THREE.SphereGeometry(0.05,6,6),M('#111111'),s*0.13,0.93,0.55);}
  else if(k==='piano'){const blk=M('#111111',{roughness:.3,metalness:.2});const bd=add(new THREE.BoxGeometry(1.1,0.28,0.8),blk,0,0.14);
    const lid=add(new THREE.BoxGeometry(1.05,0.04,0.78),blk,0.12,0.5);lid.rotation.z=0.55;add(new THREE.BoxGeometry(1.0,0.06,0.18),M('#f4f4f4'),0,0.22,0.47);
    for(let i=0;i<6;i++)add(new THREE.BoxGeometry(0.06,0.07,0.1),blk,-0.42+i*0.17,0.26,0.47);}
  return g;
}
function buildHair(Hd,ch,mat){
  const hs=ch.hairStyle,photo=!!ch.photoImg,add=(m)=>{m.castShadow=true;Hd.add(m);return m;};
  const dbl=mat.clone();dbl.side=THREE.DoubleSide;
  // hair that hangs behind the body gets its own material so it can fade when the chase camera is behind (hairFade)
  const back=mat.clone();back.side=THREE.DoubleSide;back.transparent=true;
  const backMat=hs==='long'||hs==='longM'?back:null;
  const fringe=(p0,p1,t1)=>add(new THREE.Mesh(new THREE.SphereGeometry(0.56,24,8,Math.PI/2+p0,p1-p0,0.2*Math.PI,t1||0.22*Math.PI),dbl));
  if(hs==='bald'){for(let k=-4;k<=4;k++){const a=k*0.36;add(new THREE.Mesh(new THREE.SphereGeometry(0.11,8,6),mat)).position.set(Math.sin(a)*0.47,-0.06,-Math.cos(a)*0.47);}return null;}
  const cap=add(new THREE.Mesh(new THREE.SphereGeometry(hs==='buzz'?0.512:0.548,28,16,0,Math.PI*2,0,Math.PI*0.56),dbl));cap.rotation.x=-0.42;cap.position.set(0,0.015,-0.02);
  if(hs==='buzz')return null;
  const curtain=(H,r0,r1)=>{const c=add(new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,H,22,1,true,Math.PI/2,Math.PI),back));c.position.set(0,0.06-H/2,-0.04);
    const tip=add(new THREE.Mesh(new THREE.SphereGeometry(r1,22,6,Math.PI/2,Math.PI,Math.PI/2,Math.PI/2),back));tip.scale.y=0.25;tip.position.set(0,0.06-H,-0.04);return c;};
  const lock=(x,H)=>{const l=add(new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.11,H,8),mat));l.position.set(x,-H/2+0.05,0.16);l.rotation.z=x>0?0.06:-0.06;return l;};
  if(hs==='long'){curtain(1.45,0.52,0.6);lock(0.44,0.95);lock(-0.44,0.95);if(!photo)fringe(-1.15,1.15);}
  else if(hs==='longM'){curtain(1.15,0.52,0.58);lock(0.45,0.8);lock(-0.45,0.8);if(!photo){fringe(-1.2,-0.1,0.3*Math.PI);fringe(0.1,1.2,0.3*Math.PI);}}
  else if(hs==='bob'){const b=add(new THREE.Mesh(new THREE.SphereGeometry(0.6,24,12,Math.PI/2-0.15,Math.PI+0.3,0.25*Math.PI,0.42*Math.PI),dbl));b.position.y=0.02;if(!photo)fringe(-1.1,1.1,0.2*Math.PI);}
  else if(hs==='bun'){add(new THREE.Mesh(new THREE.SphereGeometry(0.21,14,10),mat)).position.set(0,0.5,-0.2);add(new THREE.Mesh(new THREE.TorusGeometry(0.12,0.04,6,14),M('#ff7aa8'))).position.set(0,0.4,-0.16);lock(0.43,0.45);lock(-0.43,0.45);if(!photo)fringe(-0.95,0.95,0.17*Math.PI);}
  else if(hs==='swept'){const top=add(new THREE.Mesh(new THREE.SphereGeometry(0.36,16,10),mat));top.scale.set(1.35,0.7,1.15);top.position.set(0,0.36,0.04);
    if(!photo){const sw=add(new THREE.Mesh(new THREE.SphereGeometry(0.3,16,10),mat));sw.scale.set(1.5,0.5,0.55);sw.position.set(0.1,0.26,0.36);sw.rotation.z=-0.5;}}
  else if(hs==='spiky'){for(let k=0;k<8;k++){const c=add(new THREE.Mesh(new THREE.ConeGeometry(0.1,0.34,6),mat));const a=k/8*Math.PI*2;c.position.set(Math.sin(a)*0.28,0.42,Math.cos(a)*0.22-0.05);c.rotation.set(Math.cos(a)*0.6-0.2,0,-Math.sin(a)*0.6);}if(!photo)fringe(-0.9,0.9,0.12*Math.PI);}
  else{/* short */const v=add(new THREE.Mesh(new THREE.SphereGeometry(0.33,16,10),mat));v.scale.set(1.4,0.55,1.2);v.position.set(-0.04,0.36,0.04);if(!photo)fringe(-1.0,0.8,0.15*Math.PI);}
  return backMat;
}
const UPV=V(0,1,0);
const WALLFX={piano:['ชนเปียโน! 🎹','piano'],grand:['ชนแกรนด์! 🎹','piano'],bench:['ชนเก้าอี้!','thud'],guitar:['ชนกีตาร์! 🎸','guitar'],glass:['ชนกระจก!','glass'],counter:['ชนเคาน์เตอร์!','thud'],box:['ชนกล่องพัสดุ! 📦','thud'],shelf:['หนังสือร่วง! 📚','thud'],car:['รถร้อง! 🚨','alarm'],bike:['ชนมอไซค์!','metal'],cart:['ส้มตำหก! 🌶','thud'],pole:['ชนเสาไฟ!','metal'],planter:['ชนกระถาง!','thud'],stage:['ชนแท่น!','thud'],amp:['ชนตู้แอมป์! 🔊','wood'],sofa:['ล้มลงโซฟา! 🛋️','sofa'],table:['ชนโต๊ะ!','wood'],lamp:['ชนโคมไฟ! 💡','glass'],tv:['ชนทีวี! 📺','glass'],drums:['ชนกลอง! 🥁','plate'],keyboard:['ชนคีย์บอร์ด!','plate'],ac:['ชนแอร์!','metal'],bin:['ชนถังขยะ! 🗑️','metal'],mezz:['ติดผนัง!','thud'],stairs:['ชนบันได!','thud'],desk:['ชนโต๊ะ!','thud'],case:['ชนตู้ไวโอลิน! 🎻','violin'],cello:['ชนเชลโล่! 🎻','cello'],glass2:['ชนกระจก!','glass'],wall:['ติดผนัง!','thud']};
const tigerTex=canvasTex(128,64,(g,w,h)=>{g.fillStyle='#ff9a1a';g.fillRect(0,0,w,h);g.fillStyle='#111';for(let i=0;i<9;i++){g.beginPath();const x=i*15;g.moveTo(x,0);g.lineTo(x+8,0);g.lineTo(x+2,h);g.lineTo(x-5,h);g.fill();}});

class Fighter{
  constructor(ch,slot,o){
    this.ch=ch;this.slot=slot;this.team=o.team;this.human=o.human;this.color=o.color;this.label=o.label;
    this.S=ch.size*(o.sizeMul||1)*0.84;this.vp=(ch.fem?1.5:1.05)/Math.sqrt(ch.size)*(0.94+(ch.id.charCodeAt(0)%7)*0.025);this.r=0.42*this.S;this.h=2.5*this.S;this.maxHp=Math.round(ch.hp*(o.hpMul||1));
    this.ai={timer:0,mx:0,mz:0,blockT:0,reacted:false,tgt:null,tt:0};
    const lo=o.lo||{};this.lo={st:STYLES[lo.st]?lo.st:'box',sp:SPECIALS[lo.sp]?lo.sp:ch.sp};this.style=STYLES[this.lo.st];
    const bulk=this.bulk=ch.bulk||1;
    this.root=new THREE.Group();scene.add(this.root);
    this.body=new THREE.Group();this.root.add(this.body);this.body.scale.setScalar(this.S);
    const cast=m=>{m.castShadow=true;return m;};
    const skin=M(ch.skin),shirt=M(ch.shirt),shorts=M(ch.shorts),shoe=M('#1d1d1d'),hairM=M(ch.hair);
    const gs=GLOVES[0];
    const gcol=gs.color||this.color;
    this.gloveMat=M(gcol,{roughness:gs.rough||.35,metalness:gs.metal||0,emissive:new THREE.Color(gs.em||this.color),emissiveIntensity:gs.em?0.35:0,map:gs.tiger?tigerTex:null});
    if(gs.tiger)this.gloveMat.color.set('#ffffff');
    this.rainbow=!!gs.rainbow;this.baseEm=gs.em?0.35:0;
    // chibi body: short legs, bean torso, big head (old head-relative coordinates live in the scaled head group)
    const HIP=0.72,sb=Math.sqrt(bulk);
    this.legs=[];
    for(const sx of[1,-1]){
      const p=new THREE.Group();p.position.set(sx*0.2*sb,HIP,0);this.body.add(p);
      const th=cast(new THREE.Mesh(new THREE.CylinderGeometry(0.16*sb,0.14,0.3,10),shorts));th.position.y=-0.12;p.add(th);
      const sn=cast(new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.1,0.3,8),ch.sleeves?shorts:skin));sn.position.y=-0.4;p.add(sn);
      const so=cast(new THREE.Mesh(new THREE.SphereGeometry(0.16,12,8),shoe));so.scale.set(1,0.6,1.45);so.position.set(0,-0.62,0.06);p.add(so);
      this.legs.push(p);
    }
    const T=this.torso=new THREE.Group();T.position.y=HIP;this.body.add(T);
    const w=cast(new THREE.Mesh(new THREE.CylinderGeometry(0.4*bulk,0.38*bulk,0.24,14),shorts));w.position.y=0.06;T.add(w);
    const c=cast(new THREE.Mesh(new THREE.SphereGeometry(0.5,18,14),shirt));c.scale.set(0.95*bulk,0.84,0.64*sb);c.position.y=0.46;T.add(c);
    const nk=cast(new THREE.Mesh(new THREE.CylinderGeometry(0.13*bulk,0.15*bulk,0.16,10),skin));nk.position.y=0.86;T.add(nk);
    this.faceCv=document.createElement('canvas');this.faceCv.width=512;this.faceCv.height=256;
    this.faceTex=new THREE.CanvasTexture(this.faceCv);
    const Hd=this.head=new THREE.Group();Hd.position.y=1.38;Hd.scale.setScalar(1.26);T.add(Hd);
    const hm=new THREE.Mesh(new THREE.SphereGeometry(0.5,32,20),new THREE.MeshStandardMaterial({map:this.faceTex,roughness:.8}));hm.castShadow=true;Hd.add(hm);
    for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,6),skin);e.position.set(s*0.49,-0.02,0);e.scale.set(0.6,1,1);Hd.add(e);}
    this.hairBack=buildHair(Hd,ch,hairM);this.hairO=1;
    this.hatKey=ch.hatKey||(HATS[ch.hat|0]||HATS[0]).k;if(this.hatKey!=='none'){const hat=makeHat(this.hatKey);hat.position.y=0.4;hat.scale.setScalar(0.42);Hd.add(hat);this.hatObj=hat;}
    const A=ch.acc,fz=0.31*sb;
    if(A.includes('tie')){vbox(0.28,0.26,0.02,M('#f4f4f4'),0,0.66,fz-0.01,T);vbox(0.11,0.42,0.03,M(ch.accent||'#c0392b'),0,0.5,fz,T);}
    if(A.includes('tag')){vbox(0.2,0.11,0.02,M('#ffffff'),0.22,0.62,fz-0.03,T);vbox(0.2,0.03,0.025,M('#c0392b'),0.22,0.66,fz-0.025,T);}
    if(A.includes('headband')){const t=new THREE.Mesh(new THREE.TorusGeometry(0.47,0.05,8,28),M('#ffffff'));t.rotation.x=Math.PI/2+0.1;t.position.y=0.18;Hd.add(t);}
    if(A.includes('headset')){const t=new THREE.Mesh(new THREE.TorusGeometry(0.54,0.035,8,20,Math.PI),M('#222'));Hd.add(t);for(const s of[-1,1]){const e=cyl(0.13,0.13,0.08,M('#333'),s*0.52,-0.02,0,Hd,12);e.rotation.z=Math.PI/2;}const mic=cyl(0.015,0.015,0.45,M('#222'),-0.42,-0.16,0.22,Hd,6);mic.rotation.set(Math.PI/2,0,-0.5);sph(0.05,M('#111'),-0.3,-0.2,0.43,Hd,8,6);}
    if(A.includes('headphones')){const t=new THREE.Mesh(new THREE.TorusGeometry(0.2*bulk,0.05,8,20),M('#111'));t.rotation.x=Math.PI/2;t.position.y=0.84;T.add(t);for(const s of[-1,1]){const e=cyl(0.1,0.1,0.07,M('#e74c3c'),s*0.2*bulk,0.86,0.08,T,10);e.rotation.z=Math.PI/2;}}
    if(A.includes('cap')){const cp=new THREE.Mesh(new THREE.SphereGeometry(0.53,24,10,0,Math.PI*2,0,Math.PI/2.1),M(ch.accent||'#f1c40f'));cp.position.y=0.04;cp.rotation.x=0.12;Hd.add(cp);vbox(0.6,0.04,0.36,M(ch.accent||'#f1c40f'),0,0.15,0.58,Hd).rotation.x=0.12;}
    if(A.includes('hood')){const hd=new THREE.Mesh(new THREE.SphereGeometry(0.58,20,12,Math.PI/2+1.0,Math.PI*2-2.0,0,Math.PI*0.62),M('#1f1f22',{side:THREE.DoubleSide}));hd.position.set(0,0.02,-0.02);hd.castShadow=true;Hd.add(hd);vbox(0.56,0.22,0.3,M('#1f1f22'),0,0.84,-0.25,T);}
    if(A.includes('guitarBack')){const gb=guitar('#111','#222');gb.scale.setScalar(0.55);gb.position.set(0.05,0.22,-0.38);gb.rotation.set(0,Math.PI,0.55);T.add(gb);const st=vbox(0.06,0.9,0.03,M('#5a3010'),0,0.46,fz,T);st.rotation.z=-0.7;}
    if(A.includes('camera')){vbox(0.24,0.15,0.1,M('#111'),0,0.5,fz+0.04,T);const l=cyl(0.06,0.06,0.1,M('#333'),0,0.5,fz+0.12,T,10);l.rotation.x=Math.PI/2;}
    if(A.includes('tape')){vbox(0.14,0.14,0.08,M('#f1c40f'),0.4,0.1,0.1,T);}
    this.arms=[];this.gloves=[];this.gp=[];
    const armMat=(ch.sleeves&&!ch.tank)?shirt:skin;
    for(const h of[0,1]){
      const up=cast(new THREE.Mesh(armGeo,armMat)),lo=cast(new THREE.Mesh(armGeo,armMat)),el=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),armMat);
      up.scale.x=up.scale.z=bulk;lo.scale.x=lo.scale.z=bulk*0.92;el.scale.setScalar(bulk);T.add(up);T.add(lo);T.add(el);this.arms.push({up,lo,el});
      const gl=cast(new THREE.Mesh(new THREE.SphereGeometry(0.24,16,12),this.gloveMat));gl.scale.set(1,0.95,1.12);T.add(gl);this.gloves.push(gl);
      this.gp.push(V(h?-0.3:0.3,1.0,0.62));
    }
    this.stars=new THREE.Group();for(let i=0;i<3;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.09),new THREE.MeshBasicMaterial({color:0xffe14d}));s.position.set(Math.cos(i*2.1)*0.4,0,Math.sin(i*2.1)*0.4);this.stars.add(s);}
    this.stars.position.y=2.9*this.S;this.stars.visible=false;this.root.add(this.stars);
    const pr=new THREE.Mesh(new THREE.RingGeometry(0.62,0.78,32),new THREE.MeshBasicMaterial({color:new THREE.Color(this.color),transparent:true,opacity:.85,side:THREE.DoubleSide}));
    pr.rotation.x=-Math.PI/2;pr.position.y=0.03;pr.scale.setScalar(this.S);this.root.add(pr);this.ring=pr;
    this.rage=0;this.expr='';this.reset(0,0,0,0);
    if(ch.body==='3d'&&typeof attach3D==='function')attach3D(this);
  }
  reset(x,y,z,face){
    this.pos={x,z};this.vel={x:0,z:0};this.mv={x:0,z:0};this.y=y;this.vy=0;this.hp=this.maxHp;this.lagHp=this.maxHp;
    this.state='idle';this.atk=null;this.stunT=0;this.koT=0;this.downT=0;this.recT=0;this.win=false;this.winClip=null;this.queued=null;this.jabHand=0;this.t=Math.random()*5;this.walk=0;this.moving=0;this.wallCd=0;this.invT=0;
    this.face=this.faceT=face;this.spinA=0;this.seq=[];this.lastAtkEnd=-9;this.comboN=0;this.lastHitT=-9;this.knockdown=false;
    this.stream=null;this.dashing=null;this.pulled=null;this.victim=null;this.grabbedBy=null;
    this.fx={dizzy:0,slow:0,buff:0,immune:0,parry:0};this.react=null;this.ap=null;if(this.head)this.head.rotation.set(0,0,0);this.wind=null;this.koFly=false;this.dusted=false;this.superGrab=false;
    if(this.held)this.removeHeld();
    this.body.rotation.set(0,0,0);this.body.position.set(0,0,0);this.body.scale.setScalar(this.S);this.bsc=this.S;this.squashT=0;this.torso.rotation.set(0,0,0);
    this.root.position.set(x,y,z);this.root.rotation.y=face;
    this.setExpr('normal',0,true);
  }
  dispose(){this.disposed=true;scene.remove(this.root);if(this.tagEl)this.tagEl.remove();}
  redraw(){drawFace(this.faceCv,this.ch,this.expr);this.faceTex.needsUpdate=true;}
  setExpr(e,dur=0,force){if(e!==this.expr||force){this.expr=e;this.redraw();}this.exprT=dur;}
  headPos(){const v=V(0,0,0);this.head.getWorldPosition(v);return v;}
  fwd(){return{x:Math.sin(this.face),z:Math.cos(this.face)};}
  heal(n){this.hp=Math.min(this.maxHp,this.hp+n);}
  alive(){return this.state!=='ko';}
  lockOn(){let best=null,bd=99;for(const e of enemiesOf(this)){const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,d=Math.hypot(dx,dz);if(Math.abs(e.y-this.y)>2)continue;const ad=angDiff(this.face,Math.atan2(dx,dz));if((d<4.5&&ad<1.6)||d<2.2){const sc=d+ad;if(sc<bd){bd=sc;best=e;}}}
    if(best){this.face=this.faceT=Math.atan2(best.pos.x-this.pos.x,best.pos.z-this.pos.z);}}
  tryAttack(type){
    let t=type,slot=type;
    if(type==='special'){
      if(this.rage<100)return false;
      this.rage=0;this.spKey=this.lo.sp;
      say(this,SPECIALS[this.spKey].name,true);G.shake=Math.max(G.shake,0.12);
      const Sp=SPECIALS[this.spKey];t=Sp.atk||'cast';slot='special';
    }else if(this.held&&(type==='jab'||type==='hook'))t=type==='jab'?'swingL':'swingH';
    else{
      if(this.t-this.lastAtkEnd<0.45)this.seq.push(type);else this.seq=[type];
      if(this.seq.length>4)this.seq.shift();
      const n=this.seq.length;
      if(n>=3&&this.seq[n-1]==='hook'&&this.seq[n-2]==='jab'&&this.seq[n-3]==='jab'){slot='combo';this.seq=[];}
      t=this.style.atk[slot]||type;
      if(slot==='combo')popup(ATK[t].call||'คอมโบ!!',this.headPos().add(V(0,0.8,0)),'combo',0.8);
    }
    if(G.watch>0&&this.pos.z<2.95&&G.phase==='fight'){this.hp=Math.max(1,this.hp-6);popup('ลูกค้าเห็น! หักเงินเดือน 💸',this.headPos().add(V(0,0.9,0)),'crit',1.3);}
    this.lockOn();
    this.startAtk(t,slot);
    if(t==='cast'||slot==='special')SFX.voice(this.vp,'sp');else if(Math.random()<(slot==='jab'?0.22:0.55))SFX.voice(this.vp,'atk');
    return true;
  }
  startAtk(t,slot){
    const def=ATK[t];if(!def)return;
    let hand=this.jabHand;if(slot==='jab'){this.jabHand^=1;hand=this.jabHand;}else if(slot==='hook')hand=1-this.jabHand;
    this.state='attack';this.atk={type:t,def,t:0,hit:false,hand,slot:slot||'special',hits:0,hitSet:new Set(),jumped:false};
    SFX.whoosh();this.setExpr('attack',def.startup+def.active+0.15);
  }
  doGrab(sup){
    if(this.held&&!sup){this.throwHeld();return;}
    this.lockOn();const fw=this.fwd();let best=null,bd=sup?2.9:(this.style.grabR||1.5);
    for(const e of enemiesOf(this)){if(e.state==='down'||e.state==='grabbed'||e.invT>0||Math.abs(e.y-this.y)>0.9)continue;const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,d=Math.hypot(dx,dz);if(d<bd&&(d<0.5||(dx*fw.x+dz*fw.z)/d>0.3)){bd=d;best=e;}}
    if(best){
      if(best.state==='grab'&&best.victim){best.victim.state='idle';best.victim.grabbedBy=null;best.victim=null;}
      if(sup){const d=Math.hypot(best.pos.x-this.pos.x,best.pos.z-this.pos.z);if(d>1){this.pos.x+=(best.pos.x-this.pos.x)*(1-0.9/d);this.pos.z+=(best.pos.z-this.pos.z)*(1-0.9/d);}this.face=this.faceT=Math.atan2(best.pos.x-this.pos.x,best.pos.z-this.pos.z);}
      this.superGrab=!!sup;this.state='grab';this.grabT=0;this.victim=best;best.state='grabbed';best.grabbedBy=this;best.atk=null;best.stream=null;best.dashing=null;best.pulled=null;if(best.held)best.dropHeld();SFX.whoosh();SFX.voice(this.vp,'grunt');return;}
    if(sup){popup('พลาด! 😅',this.headPos().add(V(0,0.7,0)),'info',0.9);this.state='recover';this.recT=0.35;return;}
    const it=nearestWeapon(this,1.25);if(it){this.pickUp(it);return;}
    this.state='recover';this.recT=0.18;
  }
  pickUp(it){
    removeItem(it);const W=WEAPONS[it.type];const mesh=W.mk();mesh.position.set(...W.hold.p);mesh.rotation.set(...W.hold.r);mesh.scale.multiplyScalar(handScale(this));
    handObj(this).add(mesh);this.held={type:it.type,dur:it.dur,mesh};SFX.pickup();popup('ได้ '+W.name+'!',this.headPos().add(V(0,0.7,0)),'good',1);
    this.state='recover';this.recT=0.15;
  }
  endDash(){this.dashing=null;this.state='recover';this.recT=0.35;}
  removeHeld(){if(this.held){const m=this.held.mesh;if(m.parent)m.parent.remove(m);this.held=null;}}
  dropHeld(){if(!this.held)return;dropWeapon(this.held.type,this.held.dur,this.pos.x+rand(-.4,.4),groundAt(this.pos.x,this.pos.z,this.y+0.5),this.pos.z+rand(-.4,.4));this.removeHeld();}
  throwHeld(){
    this.lockOn();const W=WEAPONS[this.held.type];const mesh=W.mk();
    fireProj(this,'thrown',this.face,{mesh,wt:this.held.type,speed:14,vy:2.5,grav:8,dmg:W.throwDmg*this.ch.pow,knock:6,stun:.5,spin:9,launch:3,kd:1,life:1.6,r:0.5});
    this.removeHeld();SFX.whoosh();this.state='recover';this.recT=0.25;this.throwAt=this.t;this.setExpr('attack',0.3);
  }
  resolveHit(over){
    const a=this.atk,d=a.def,o=over||{};const sw=a.type==='swingL'||a.type==='swingH';const W=sw&&this.held?WEAPONS[this.held.type]:null;
    const reach=(o.range||d.range)*Math.sqrt(this.S)+(W?W.range:0);const fw=this.fwd();let any=false;
    for(const e of G.f){if(e===this||e.team===this.team||e.state==='ko'||a.hitSet.has(e))continue;
      const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,dist=Math.hypot(dx,dz);
      if(dist>reach+e.r*0.5||Math.abs(e.y-this.y)>(d.jumpV?2.2:1.5))continue;
      if(!d.arc&&dist>0.3&&(dx*fw.x+dz*fw.z)/dist<0.4)continue;
      let dmg=(o.dmg||d.dmg)*this.ch.pow*(this.fx.buff>0?1.5:1),knock=o.knock||d.knock;if(W){dmg*=W.dmg;knock+=W.knock;}
      if(this.style.dodge)knock*=rand(0.7,1.5);
      const crit=!d.noCrit&&!W&&Math.random()<CRIT;
      const r=e.takeHit(this,{dmg,knock,stun:o.stun||d.stun,launch:o.launch||d.launch,kd:o.kd||d.kd,heavy:d.heavy||o.heavy||W&&a.type==='swingH',rage:d.rage,unblockable:d.unblockable,crit,dizzy:d.dizzy,dir:d.arc?null:{x:fw.x,z:fw.z}});
      if(r){a.hitSet.add(e);if(r===true||r==='blocked')any=true;}
    }
    if(any&&d.sweep){a.t=Math.max(a.t,d.startup+d.active);this.vel.x-=fw.x*2.5;this.vel.z-=fw.z*2.5;}
    if(this.fx.buff>0&&a.slot!=='jab'&&a.slot!=='special'){const fw2=this.fwd();ringFx(this.pos.x+fw2.x,this.y,this.pos.z+fw2.z,2.2,0xff4040,0.35);for(const e of enemiesOf(this)){const dx=e.pos.x-this.pos.x-fw2.x,dz=e.pos.z-this.pos.z-fw2.z;if(Math.hypot(dx,dz)<2.2&&Math.abs(e.y-this.y)<1.6)e.takeHit(this,{dmg:5,knock:7,stun:.5,heavy:1});}SFX.thud();}
    if(any&&W){if(W.sfx)SFX[W.sfx]();this.held.dur--;if(this.held.dur<=0){popup(W.name+' พัง!',this.headPos().add(V(0,0.6,0)),'info',1);burst(this.gloves[0].getWorldPosition(V(0,0,0)),0x8a6a4a,10,3);this.removeHeld();}}
    return any;
  }
  takeHit(att,h){
    if(this.state==='ko'||this.state==='down'||this.invT>0)return false;
    if(att&&att.team===this.team)return false;
    if(this.fx.parry>0&&att&&att!==this&&this.state!=='grabbed'){this.fx.parry=0;
      popup('สวนกลับ!! 🛡️',this.headPos().add(V(0,0.8,0)),'crit',1.2);SFX.block();ringFx(this.pos.x,this.y+1,this.pos.z,2,0x9fd4ff,0.4);
      this.face=this.faceT=Math.atan2(att.pos.x-this.pos.x,att.pos.z-this.pos.z);this.state='recover';this.recT=0.3;this.atk=null;
      if(att.state!=='ko'&&Math.hypot(att.pos.x-this.pos.x,att.pos.z-this.pos.z)<6)att.takeHit(this,{dmg:20*this.ch.pow,knock:10,stun:1,launch:8,kd:1,unblockable:1,heavy:1,crit:1});
      return 'blocked';}
    if(this.style.dodge&&att&&!h.unblockable&&!h.thrown&&(this.state==='idle'||this.state==='block'||this.state==='attack')&&Math.random()<this.style.dodge){
      popup(pick(['หลบมั่ว! 🍻','เซหลบ~','อุ๊ย พลาด!']),this.headPos().add(V(0,0.6,0)),'info',0.8);const s2=Math.random()<0.5?1:-1,fx0=Math.sin(this.face),fz0=Math.cos(this.face);this.vel.x+=fz0*s2*5;this.vel.z-=fx0*s2*5;puff(this.pos.x,this.y+0.2,this.pos.z,0xe6e0d0,4,0.5,1.2);return 'dodged';}
    let nx,nz;
    if(h.dir){nx=h.dir.x;nz=h.dir.z;const l=Math.hypot(nx,nz)||1;nx/=l;nz/=l;}
    else if(att){const dx=this.pos.x-att.pos.x,dz=this.pos.z-att.pos.z,d=Math.hypot(dx,dz)||1;nx=dx/d;nz=dz/d;}
    else{nx=0;nz=1;}
    const hp=this.headPos();let dmg=h.dmg;
    if(this.state==='block'&&!h.unblockable){
      const fx=Math.sin(this.face),fz=Math.cos(this.face);
      if(-(nx*fx+nz*fz)>-0.25){dmg*=0.15;this.hp=Math.max(1,this.hp-dmg);this.vel.x+=nx*h.knock*0.35;this.vel.z+=nz*h.knock*0.35;
        this.rage=Math.min(100,this.rage+4);if(att)att.rage=Math.min(100,att.rage+2);
        SFX.block();popup('กัน!',hp,'blk',0.7);burst(hp.clone().add(V(-nx*0.5,-0.2,-nz*0.5)),0x9fd4ff,5,2);return 'blocked';}
    }
    let crit=false;
    if(att&&this.state==='attack'&&this.atk&&this.atk.t<this.atk.def.startup){dmg*=1.3;crit=true;popup('COUNTER!',hp.clone().add(V(0,0.6,0)),'crit',1);}
    if(h.crit){dmg*=1.6;h.knock=(h.knock||0)*1.4;crit=true;critFx(this,hp);}
    if(att&&G.clock-att.lastHitT<1.0&&att.comboN>=3)dmg*=1+Math.min(0.3,(att.comboN-2)*0.05);
    const armor=this.fx.buff>0;if(armor)dmg*=0.7;
    this.hp-=dmg;
    if(G.mode==='train'){if(this.hp<1)this.hp=1;trainHit(this,att,dmg);}
    if(this.state==='grab'&&this.victim){this.victim.state='idle';this.victim.grabbedBy=null;this.victim=null;}
    if(this.held&&(h.launch||h.knock>=6))this.dropHeld();
    if(!armor||h.launch>=6||h.thrown){
      if(this.state!=='stun'||!this.react||this.react.t>0.25)this.react={c:pickReact(h,dmg),t:0};
      this.state='stun';this.stunT=h.stun||0.3;this.atk=null;this.queued=null;this.stream=null;this.dashing=null;
      if(h.launch){this.vy=h.launch;this.y+=0.02;}
      if(h.kd){this.knockdown=true;if(!h.launch){this.vy=Math.max(this.vy,3);this.y+=0.02;}}
      this.vel.x+=nx*h.knock;this.vel.z+=nz*h.knock;
    }else{this.vel.x+=nx*h.knock*0.25;this.vel.z+=nz*h.knock*0.25;if(Math.random()<.3)popup('ไม่สะเทือน! 💪',hp.clone().add(V(0,0.6,0)),'info',0.8);}
    this.rage=Math.min(100,this.rage+8);
    if(att){att.rage=Math.min(100,att.rage+(h.rage||9)*(att.style&&att.style.rageMul||1));
      if(G.clock-att.lastHitT<1.0)att.comboN++;else att.comboN=1;att.lastHitT=G.clock;
      if(att.comboN>=3)comboPop(att);}
    if(h.dizzy&&this.fx.immune<=0){this.fx.dizzy=Math.max(this.fx.dizzy,h.dizzy);}
    const heavy=!!h.heavy||crit;
    // hit feel: the freeze, the camera shake and the victim's squash all scale with how hard the hit was
    const pw=clamp(dmg/20,0,1);
    SFX.hit(heavy);G.shake=Math.max(G.shake,0.07+pw*0.25+(heavy?0.08:0));G.hitStop=Math.max(G.hitStop,crit?0.13:0.045+pw*0.06+(heavy?0.02:0));
    this.squashT=0.18;this.squashK=0.07+pw*0.1+(heavy?0.04:0);
    hype=Math.min(1,hype+(heavy?0.35:0.12));
    popup(Math.round(dmg)+'',hp,crit||dmg>=14?'crit':'dmg',0.8);
    burst(hp.clone().add(V(-nx*0.4,-0.1,-nz*0.4)),dmg>=14?0xffb000:0xffee66,heavy?12:6,heavy?4:2.5);
    this.setExpr('hurt',0.45);
    if(this.hp<=0){this.hp=0;this.state='ko';this.koT=0;this.setExpr('ko');
      // KO: launch them across the room, tumbling — they burst into dust when they hit something (koPoof)
      this.koFly=true;this.vy=Math.max(this.vy,9+rand(0,3));this.y+=0.05;this.vel.x=nx*rand(15,19);this.vel.z=nz*rand(15,19);
      this.knockdown=false;this.dropHeld();this.stream=null;this.dashing=null;this.wind=null;G.hitStop=Math.max(G.hitStop,0.18);G.shake=Math.max(G.shake,0.6);
      burst(hp.clone(),0xffffff,14,6);ringFx(this.pos.x,this.y+1,this.pos.z,2.6,0xffe14d,0.4);popup(pick(['บ๊ายบาย~ 👋','ลาออก!!','ปลิวววว!','ไปไกลๆ!']),hp.clone().add(V(0,1.6,0)),'combo',1.2);
      popup('K.O.!',hp.clone().add(V(0,1,0)),'crit',1.4);SFX.voice(this.vp,'ko');SFX.koWhoosh();SFX.koBell();onKO(this,att);}
    else{if(Math.random()<(heavy?0.6:0.3))SFX.voice(this.vp,'hurt');if(Math.random()<(heavy?0.4:0.15)){if(Math.random()<0.55)say(this,pick(HURT));else if(att)say(att,pick(att.ch.quotes));}}
    return true;
  }
  onWallHit(b){
    if(b.brk)hitBreakable(b,this.state==='ko'?3:(this.impact>8?2:1),this);
    if(this.state==='ko'){if(this.koFly&&!this.dusted)this.koPoof('แปะ!! 💥');return;}
    if(this.wallCd>0||(G.phase!=='fight'&&G.phase!=='ko'))return;
    this.wallCd=0.45;const fx=WALLFX[b.tag]||WALLFX.wall;
    SFX[fx[1]]();G.shake=Math.max(G.shake,0.3);hype=Math.min(1,hype+0.4);
    popup(fx[0],this.headPos().add(V(0,0.4,0)),'info',1.1);
    if(this.state!=='ko'&&G.phase==='fight')this.hp=Math.max(1,this.hp-3);
    burst(this.headPos(),b.tag==='shelf'?0xc0392b:0xffffff,b.tag==='shelf'?14:7,3);
    if(b.tag==='grand'||b.tag==='piano')this.setExpr('hurt',0.5);
  }
  koPoof(txt){
    if(this.dusted)return;this.dusted=true;this.koFly=false;this.vel.x*=0.1;this.vel.z*=0.1;
    const p=this.headPos();p.y-=0.6;koDust(p,txt);
  }
  land(){
    if(this.state==='ko'&&this.koFly&&this.koT>0.25){this.koPoof('ปุ้ง!! 💨');}
    const v=this.vy;this.vy=0;const fell=(this.airTop||this.y)-this.y;this.airTop=this.y;
    if(fell>1.6&&this.state!=='ko'&&G.phase==='fight'){const d=Math.round(4+fell*2.5);this.hp=Math.max(1,this.hp-d);popup('ตกตึก!! -'+d+' 🏢',this.headPos().add(V(0,0.6,0)),'crit',1.3);SFX.voice(this.vp,'hurt');G.shake=Math.max(G.shake,0.35);this.knockdown=true;}
    if(v<-7)SFX.land();
    if(inWater(this)&&v<-4){puff(this.pos.x,FLOOD.lvl+0.1,this.pos.z,0xe8f6ff,10,0.7,3);SFX.splash();if(this.knockdown)popup('ตูม! 💦',this.headPos(),'info',0.8);}
    if(this.knockdown){this.knockdown=false;if(this.state!=='ko'){this.state='down';this.downT=0.85;this.stunT=0;}SFX.thud();G.shake=Math.max(G.shake,0.12);puff(this.pos.x,this.y+0.15,this.pos.z,0xd8cbb0,7,0.55,2.2);}
    else if(v<-10){SFX.thud();}
  }
  update(dt,it){
    const ch=this.ch;
    this.t+=dt;this.blocked=false;
    for(const k in this.fx)if(this.fx[k]>0)this.fx[k]=Math.max(0,this.fx[k]-dt);
    if(this.invT>0)this.invT-=dt;if(this.wallCd>0)this.wallCd-=dt;
    if(this.exprT>0){this.exprT-=dt;if(this.exprT<=0&&this.state!=='ko')this.setExpr(this.win?'win':'normal');}
    const g0=groundAt(this.pos.x,this.pos.z,this.y);const onG=this.y<=g0+0.02&&this.vy<=0;
    let wx=0,wz=0;const S=this.state;
    if(S==='ko'){this.koT+=dt;if(this.koFly){if(Math.random()<0.6)puff(this.pos.x,this.y+0.8,this.pos.z,0xffffff,1,0.35,0.3);if(this.koT>1.6)this.koPoof('ปุ้ง!! 💨');}}
    else if(S==='down'){this.downT-=dt;if(this.downT<=0){this.state='idle';this.invT=0.7;}}
    else if(S==='stun'){
      this.stunT-=dt;
      if(this.pulled){const P=this.pulled,by=P.by;P.t-=dt;const fw=by.fwd(),o=P.off||0;const tx=by.pos.x+fw.x*1.25+fw.z*o,tz=by.pos.z+fw.z*1.25-fw.x*o;const k=1-Math.exp(-14*dt);this.pos.x=lerp(this.pos.x,tx,k);this.pos.z=lerp(this.pos.z,tz,k);this.vel.x=this.vel.z=0;
        if(P.t<=0){this.pulled=null;this.state='idle';this.takeHit(by,{dmg:8*by.ch.pow,knock:0.3,stun:1.6,unblockable:1});}}
      else if(this.stunT<=0&&onG)this.state='idle';
    }
    else if(S==='grabbed'){const g=this.grabbedBy;if(!g||g.state!=='grab'||g.victim!==this){this.state='idle';this.grabbedBy=null;}}
    else if(S==='grab'){
      this.grabT+=dt;const v=this.victim;
      if(!v||v.state!=='grabbed'){this.state='idle';this.victim=null;}
      else if(this.superGrab){const fw=this.fwd(),k=Math.min(1,this.grabT/0.55),a=k*Math.PI;
        v.pos.x=this.pos.x+fw.x*0.95*Math.cos(a);v.pos.z=this.pos.z+fw.z*0.95*Math.cos(a);v.y=this.y+0.35+Math.sin(a)*2.0;v.vy=0;v.face=this.face+Math.PI;v.body.rotation.x=-a;
        if(this.grabT>=0.55){v.state='stun';v.grabbedBy=null;this.victim=null;this.state='recover';this.recT=0.4;this.superGrab=false;v.y=this.y+0.1;
          v.takeHit(this,{dmg:24*ch.pow,knock:4,stun:1,launch:5,kd:1,unblockable:1,dir:{x:-fw.x,z:-fw.z},thrown:1,heavy:1});popup('ซูเพล็กซ์!!',v.headPos().add(V(0,0.8,0)),'crit',1.2);
          ringFx(v.pos.x,this.y,v.pos.z,3,0xd8cbb0);puff(v.pos.x,this.y+0.2,v.pos.z,0xd8cbb0,14,1.0,3);G.shake=Math.max(G.shake,0.7);SFX.crash();}}
      else{const fw=this.fwd();v.pos.x=this.pos.x+fw.x*0.95;v.pos.z=this.pos.z+fw.z*0.95;v.y=this.y+0.35;v.vy=0;v.face=this.face+Math.PI;
        if(this.grabT>=0.32){v.state='stun';v.grabbedBy=null;this.victim=null;this.state='recover';this.recT=0.3;
          v.takeHit(this,{dmg:10*ch.pow*(this.style.throwMul||1),knock:7.5*(this.style.throwMul?1.25:1),stun:.8,launch:6.5,kd:1,unblockable:1,dir:fw,thrown:1,heavy:1});popup('ทุ่ม!!',v.headPos().add(V(0,0.8,0)),'combo',0.9);}}
    }
    else if(S==='recover'){this.recT-=dt;if(this.recT<=0)this.state='idle';}
    else if(S==='dash'){
      const D=this.dashing;
      if(!D){this.state='idle';}
      else{D.t-=dt;let dir=this.face,sp=D.sp;
        if(D.targets){ // Bomb: chain-dash through up to 3 enemies
          let tg=D.targets[D.ti];
          while(tg&&(tg.state==='ko'||tg.state==='down'||tg.invT>0)){D.ti++;tg=D.targets[D.ti];}
          if(!tg||D.t<=0){this.endDash();}
          else{dir=Math.atan2(tg.pos.x-this.pos.x,tg.pos.z-this.pos.z);this.face=this.faceT=dir;
            if(Math.hypot(tg.pos.x-this.pos.x,tg.pos.z-this.pos.z)<1.3&&Math.abs(tg.y-this.y)<2.2){const low=tg.hp/tg.maxHp<0.35;
              tg.takeHit(this,{dmg:(low?48:24)*ch.pow,knock:7,stun:1.1,launch:9,kd:1,unblockable:1,heavy:1});
              popup(low?'รับจบ!! ✔':'รับงานที่ '+(D.ti+1)+'!',tg.headPos().add(V(0,1,0)),'crit',1.2);ringFx(tg.pos.x,tg.y,tg.pos.z,2.4,0x222222);
              G.shake=Math.max(G.shake,0.55);G.slowT=Math.max(G.slowT,0.22);D.ti++;D.t=Math.max(D.t,0.55);}}}
        else if(D.tornado){ // Dear: spinning tornado that sucks enemies in
          const tg=nearestEnemy(this,7);if(tg){const want=Math.atan2(tg.pos.x-this.pos.x,tg.pos.z-this.pos.z);this.face=this.faceT=lerpAngle(this.face,want,1-Math.exp(-4*dt));dir=this.face;}
          D.tick-=dt;if(D.tick<=0){D.tick=0.14;
            for(const e of enemiesOf(this)){const dx=this.pos.x-e.pos.x,dz=this.pos.z-e.pos.z,d=Math.hypot(dx,dz);if(d>2.6||Math.abs(e.y-this.y)>2.2)continue;
              e.takeHit(this,{dmg:3*ch.pow,knock:d>0.9?5:1,stun:0.4,unblockable:1,dir:{x:dx,z:dz}});}
            burst(V(this.pos.x+rand(-1,1),this.y+rand(0.3,2),this.pos.z+rand(-1,1)),0xff7ac8,6,3);}
          if(D.t<=0){for(const e of enemiesOf(this)){const d=Math.hypot(e.pos.x-this.pos.x,e.pos.z-this.pos.z);if(d<3&&Math.abs(e.y-this.y)<2.2)e.takeHit(this,{dmg:14*ch.pow,knock:10,stun:1,launch:8,kd:1,unblockable:1,heavy:1});}
            ringFx(this.pos.x,this.y,this.pos.z,3.2,0xff7ac8);ringFx(this.pos.x,this.y+1,this.pos.z,2.6,0xffffff,0.6);G.shake=Math.max(G.shake,0.5);popup('ฟินนนน~ 💖',this.headPos().add(V(0,0.8,0)),'combo',1.2);this.endDash();}}
        else if(D.t<=0)this.endDash();
        if(this.dashing){this.pos.x+=Math.sin(dir)*sp*dt;this.pos.z+=Math.cos(dir)*sp*dt;
          if(Math.random()<0.5)burst(V(this.pos.x,this.y+0.8,this.pos.z),D.targets?0x333333:0xff9be0,1,1);}}
    }
    else if(S==='attack'){
      const a=this.atk,d=a.def;a.t+=dt*ch.aspd*(this.fx.buff>0?1.1:1);
      if(it&&it.atk&&a.t>d.startup)this.queued=it.atk;
      if(d.jumpV&&!a.jumped&&a.t>=(d.jumpAt||0.02)){a.jumped=true;this.vy=d.jumpV;this.y+=0.03;puff(this.pos.x,this.y,this.pos.z,0xd8cbb0,4,0.45,1.5);}
      if(d.lunge){if(a.t>d.lunge.a&&a.t<d.lunge.b){const f=this.fwd();this.pos.x+=f.x*d.lunge.sp*dt;this.pos.z+=f.z*d.lunge.sp*dt;if(Math.random()<0.5)puff(this.pos.x,this.y+0.3,this.pos.z,0xe6e0d0,1,0.45,0.6);if(d.lunge.sp>=9&&Math.random()<0.35)windFx(this.pos.x,this.y+1,this.pos.z,this.face+Math.PI,2.2);}}
      else if(onG&&a.t>d.startup*0.5&&a.t<d.startup&&a.type!=='cast'){const f=this.fwd();const sp=a.slot==='combo'?2.4:1.3;this.pos.x+=f.x*sp*dt;this.pos.z+=f.z*sp*dt;}
      if(a.type==='cast'){if(!a.hit&&a.t>=d.startup){a.hit=true;SPECIALS[this.spKey].fn(this);}}
      else if(d.multi){while(this.atk===a&&a.hits<d.multi.n&&a.t>=d.startup+a.hits*d.multi.iv){a.hits++;a.hitSet.clear();this.resolveHit(a.hits===d.multi.n?d.multi.last:null);if(d.pose==='spin'||d.pose==='rush')windFx(this.pos.x,this.y+1.1,this.pos.z,this.face+rand(-1,1)+(d.pose==='spin'?a.hits*1.6:0),1.4);}}
      else if(d.sweep){if(a.t>=d.startup&&a.t<=d.startup+d.active)this.resolveHit();}
      else if(d.onLand){if(!a.hit&&a.jumped&&((onG&&a.t>0.15)||a.t>d.startup+0.6)){a.hit=true;a.t=Math.max(a.t,d.startup);this.resolveHit();landQuake(this,d);}}
      else if(!a.hit&&a.t>=d.startup){a.hit=true;this.resolveHit();}
      if(this.atk===a&&this.state==='attack'){if(a.t>=d.startup+d.active+d.recover&&(!d.onLand||a.hit)){this.state='idle';this.atk=null;this.lastAtkEnd=this.t;if(this.queued){const q=this.queued;this.queued=null;this.tryAttack(q);}}}
      else if(this.state!=='attack'){this.atk=null;}
    }
    else{
      if(it){
        const dz=this.fx.dizzy>0;
        this.state=it.block&&!dz?'block':'idle';
        if(this.state==='idle'){
          if(it.jump&&onG){this.vy=JUMPV*(this.fx.buff>0?1.06:1);this.y+=0.02;SFX.jump();}
          if(!dz&&it.grab)this.doGrab();
          else if(!dz&&it.atk)this.tryAttack(it.atk);
          wx=it.mx;wz=it.mz;
          if(dz){wx+=Math.sin(this.t*3)*0.7;wz+=Math.cos(this.t*2.3)*0.7;}
        }
      }else this.state='idle';
    }
    if(this.wind){const W=this.wind;W.t-=dt;W.tick-=dt;const fw=this.fwd();
      for(const e of enemiesOf(this)){if(e.state==='grabbed'||e.state==='down')continue;const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,d=Math.hypot(dx,dz);
        if(d>9.5||Math.abs(e.y-this.y)>2.5||(d>0.4&&angDiff(this.face,Math.atan2(dx,dz))>0.7))continue;
        const k=(e.state==='block'?18:42)*dt*(1-d/12);e.vel.x+=fw.x*k;e.vel.z+=fw.z*k;const v=Math.hypot(e.vel.x,e.vel.z);if(v>17){e.vel.x*=17/v;e.vel.z*=17/v;}
        if(e.state==='idle'||e.state==='attack'){e.state='stun';e.atk=null;e.stunT=0.25;}else if(e.state==='stun')e.stunT=Math.max(e.stunT,0.2);
        if(W.tick<=0&&e.state!=='ko')e.hp=Math.max(1,e.hp-0.8);}
      if(W.tick<=0){W.tick=0.08;for(let i=0;i<2;i++)windFx(this.pos.x+fw.x*0.8,this.y+rand(0.4,2),this.pos.z+fw.z*0.8,this.face+rand(-0.5,0.5),rand(2.5,4.5),fw);}
      if(W.t<=0||this.state==='ko'||this.state==='down')this.wind=null;}
    if(this.stream&&(this.state==='attack'||this.state==='idle'||this.state==='block'||this.state==='recover')){const s=this.stream;s.t-=dt;if(s.t<=0){s.t=s.iv;s.n--;fireProj(this,s.kind,this.face+rand(-s.spread,s.spread),s.o);if(s.kind==='chat')SFX.tone('square',1200,1600,0.05,0.05);if(s.n<=0)this.stream=null;}}
    // movement
    const m=Math.hypot(wx,wz);
    if(this.style.dodge&&m>0.12&&this.state==="idle"){wx+=Math.sin(this.t*2.7)*0.35;wz+=Math.cos(this.t*2.1)*0.35;}
    const wet=inWater(this);if(wet&&m>0.3&&onG&&Math.random()<0.25)puff(this.pos.x,FLOOD.lvl+0.05,this.pos.z,0xe8f6ff,1,0.35,1.4);
    const sp=4.6*ch.spd*(this.style.spd||1)*(wet?0.62:1)*(this.fx.slow>0?.55:1)*(this.fx.buff>0?1.12:1)*(this.fx.dizzy>0?.55:1);
    let tx=0,tz=0;
    if(m>0.12&&this.state==='idle'){const k=Math.min(1,m)/m;tx=wx*k*sp;tz=wz*k*sp;this.faceT=Math.atan2(wx,wz);}
    this.moving=(m>0.12&&this.state==='idle')?Math.min(1,m):0;
    const slick=G.rain>0&&zoneOf(this.pos)==='out'&&this.y<1;
    const rate=slick?2.2:(onG?16:5);
    if(this.state!=='grabbed'){
      const k=1-Math.exp(-rate*dt);this.mv.x+=(tx-this.mv.x)*k;this.mv.z+=(tz-this.mv.z)*k;
      this.pos.x+=(this.mv.x+this.vel.x)*dt;this.pos.z+=(this.mv.z+this.vel.z)*dt;
      const dec=Math.exp(-(this.koFly?0.25:slick?1.6:5)*dt);this.vel.x*=dec;this.vel.z*=dec;
      const g2=groundAt(this.pos.x,this.pos.z,this.y);
      if(this.y>g2+0.001||this.vy>0){this.airTop=Math.max(this.airTop||this.y,this.y);this.vy-=GRAV*dt;this.y+=this.vy*dt;if(this.y<=g2){this.y=g2;this.land();}}
      else{this.y=g2;this.vy=0;this.airTop=this.y;
        if(this.moving>0.3&&this.human!=null){this.stepT=(this.stepT||0)-dt*this.moving;if(this.stepT<=0){this.stepT=0.27;SFX.step(lvlOf(this)==='f2'?2:zoneOf(this.pos)==='out'?1:0);}}}
      resolveBlocks(this);
      this.pos.x=clamp(this.pos.x,WORLD.x0,WORLD.x1);this.pos.z=clamp(this.pos.z,WORLD.z0,WORLD.z1);
    }
    if(this.state==='idle'||this.state==='block')this.face=lerpAngle(this.face,this.faceT,1-Math.exp(-14*dt));
    this.animate(dt);
  }
  glovePose(h){
    if(this.ap)return animHand(this,h,this.ap.p);
    const sx=h===0?1:-1,s=this.state,t=this.t;
    if(this.win){switch(this.ch.emote){
      case 'flex':return V(sx*0.62,1.35+Math.sin(t*6)*0.06,0.12);
      case 'dance':return h?V(-0.4,1.15+Math.sin(t*8)*0.55,0.4):V(0.4,1.15-Math.sin(t*8)*0.55,0.4);
      case 'bow':return V(sx*0.36,0.5,0.1);
      case 'guitar':return h===1?V(-0.48,1.0,0.6):V(0.15,0.62+Math.sin(t*16)*0.16,0.45);
      case 'selfie':return h===0?V(0.35,1.9,0.75):V(-0.25,1.45,0.6);
      case 'chill':return V(sx*0.38,0.62+Math.sin(t*2+h)*0.05,0.2);
      case 'point':return h===0?V(0.2,1.65,1.35):V(-0.45,0.55,0.1);
      default:return V(sx*0.4,1.95+Math.sin(t*12+h*2)*0.12,0.15);}}
    if(s==='ko'||s==='down')return V(sx*0.8,0.8,-0.15);
    if(s==='grabbed')return V(sx*0.55,0.5,0.2);
    if(s==='stun')return V(sx*0.5,0.55,0.35);
    if(s==='block')return V(sx*0.17,1.25,0.72);
    if(s==='grab')return V(sx*0.25,1.05,0.95);
    if(s==='dash')return this.dashing&&this.dashing.targets?V(sx*0.2,1.2,1.2):V(sx*0.85,1.1,0.1);
    const g=V(sx*0.3,1.0+Math.sin(t*6+h*1.6)*0.04,0.62);
    if(s==='attack'&&this.atk){
      const a=this.atk,d=a.def,tt=a.t;
      if(a.type==='cast'){const w=V(sx*0.5,1.75,0.1),k=V(sx*0.25,1.2,1.25);if(tt<d.startup)return g.lerp(w,ease(Math.min(1,tt/(d.startup*0.8))));if(tt<d.startup+d.active+0.08)return k;return k.lerp(g,ease(Math.min(1,(tt-d.startup-d.active)/d.recover)));}
      const P=d.pose||a.type;
      if(P==='spin')return V(sx*1.02,1.2,0.12);
      if(P==='kick'||P==='kickH'||P==='roll')return V(sx*0.28,1.22,0.6);
      if(P==='dropkick')return V(sx*0.75,1.55,-0.15);
      if(P==='rocket'||P==='head')return V(sx*0.55,0.78,-0.3);
      if(P==='slam'){if(!a.hit)return V(sx*0.5,1.95,0.3);return V(sx*0.7,0.6,0.75).lerp(g,Math.min(1,Math.max(0,tt-d.startup)/d.recover));}
      if(P==='rush'){if(tt<d.startup||tt>d.startup+d.active)return g;const ph=(Math.floor(tt/0.035)+h)%2===0;return ph?V(sx*0.12+Math.sin(tt*90+h)*0.12,1.1+Math.cos(tt*70)*0.15,1.38):V(sx*0.32,1.0,0.42);}
      if(P==='lariat')return a.hand===h?V(sx*1.08,1.2,0.4):V(sx*0.3,1.0,0.5);
      if(a.hand===h){let w,k,c=null;
        if(P==='jab'||P==='swingL'){w=V(sx*0.34,0.98,0.48);k=V(sx*0.1,1.1,1.32);}
        else if(P==='hook'||P==='swingH'){w=V(sx*0.92,1.04,0.22);c=V(sx*0.95,1.12,1.12);k=V(-sx*0.12,1.1,1.12);}
        else if(P==='slap'){w=V(sx*0.8,1.45,0.3);c=V(sx*0.65,1.42,1.05);k=V(-sx*0.2,1.35,1.0);}
        else if(P==='slapH'){w=V(-sx*0.45,1.35,0.5);c=V(sx*0.05,1.42,1.1);k=V(sx*0.9,1.3,0.7);}
        else if(P==='chop'){w=V(sx*0.35,2.05,0.2);k=V(sx*0.08,1.0,1.15);}
        else if(P==='elbow'){w=V(sx*0.7,1.15,0.15);k=V(-sx*0.1,1.3,0.75);}
        else if(P==='skyUpper'){w=V(sx*0.32,0.3,0.5);c=V(sx*0.26,0.9,1.1);k=V(sx*0.1,2.5,0.75);}
        else{w=V(sx*0.32,0.32,0.5);c=V(sx*0.26,0.68,1.15);k=V(sx*0.1,1.82,0.95);}
        const s1=d.startup*0.55;
        if(tt<s1)return g.lerp(w,easeOutCubic(tt/s1));
        if(tt<d.startup){const e=easeOutBack((tt-s1)/(d.startup-s1));return c?bez(w,c,k,e):w.lerp(k,e);}
        if(tt<d.startup+d.active)return k;
        return k.lerp(g,easeInOutCubic(Math.min(1,(tt-d.startup-d.active)/d.recover)));
      }
      return V(sx*0.2,1.12,0.6);
    }
    if(this.held&&h===0)return V(0.4,1.05,0.5);
    return g;
  }
  updArms(){
    // 2-bone IK: shoulder → elbow → glove, elbow bends outward/down; over-reach stretches (cartoon)
    const b=this.bulk,L=0.42;
    for(const h of[0,1]){const sx=h?-1:1,G2=this.gp[h],Sh=V(sx*0.52*b,0.76,0),A=this.arms[h];this.gloves[h].position.copy(G2);
      const dv=G2.clone().sub(Sh),d=Math.max(0.05,dv.length()),dir=dv.clone().multiplyScalar(1/d);
      let E;if(d>=2*L*0.995)E=Sh.clone().addScaledVector(dir,d/2);
      else{const a=d/2,hh=Math.sqrt(L*L-a*a),bend=V(sx*0.7,-1,-0.35);bend.addScaledVector(dir,-bend.dot(dir));if(bend.lengthSq()<1e-4)bend.set(sx,0,0);bend.normalize();E=Sh.clone().addScaledVector(dir,a).addScaledVector(bend,hh);}
      seg(A.up,Sh,E);seg(A.lo,E,G2);A.el.position.copy(E);}
  }
  animate(dt){
    const S=this.state,lying=S==='ko'||S==='down',t=this.t;
    const A=S==='attack'&&this.atk?this.atk:null,AP=A?A.def.pose||A.type:'';
    if(S==='stun'&&this.react)this.react.t+=dt;else if(S!=='stun')this.react=null;
    const ap=this.ap=animPose(this);
    if(S==='dash'&&this.dashing&&this.dashing.tornado)this.spinA+=dt*30;
    else if(AP==='spin'&&A.t>=A.def.startup*0.5&&A.t<=A.def.startup+A.def.active)this.spinA+=dt*24;
    else if(this.win&&this.ch.emote==='dance')this.spinA+=dt*5;
    else this.spinA=0;
    this.root.position.set(this.pos.x,this.y,this.pos.z);this.root.rotation.y=this.face+this.spinA;
    const bx=lying?-Math.PI/2*0.96:(S==='grabbed'?-0.5:0);
    this.body.rotation.x=lerp(this.body.rotation.x,bx,1-Math.exp(-(lying?6:10)*dt));
    let by=lying?0.12:Math.abs(Math.sin(t*5))*0.05;
    if(AP==='dropkick'&&A.t>A.def.startup*0.4&&A.t<A.def.startup+A.def.active)this.body.rotation.x=lerp(this.body.rotation.x,-1.05,1-Math.exp(-18*dt));
    if(AP==='roll'&&A.t>A.def.lunge.a&&A.t<A.def.lunge.b){const k=(A.t-A.def.lunge.a)/(A.def.lunge.b-A.def.lunge.a);this.body.rotation.x=k*Math.PI*4;by=0.55*Math.sin(k*Math.PI);}
    if(S==='ko'&&this.koFly)this.body.rotation.x-=dt*16;
    if(ap)by=clamp(ap.p[11]*0.72,-0.16,0.12);
    if(this.win&&(this.ch.emote==='jump'||!this.ch.emote))by=Math.abs(Math.sin(t*7))*0.35;
    this.body.position.y=by;
    const bs=this.S*(this.fx.buff>0?1.25:1)*(this.win&&this.ch.emote==='flex'?1+Math.abs(Math.sin(t*6))*0.04:1);
    if(this.dusted)this.body.scale.setScalar(0.001);else{this.bsc=lerp(this.bsc||this.body.scale.x,bs,1-Math.exp(-8*dt));this.body.scale.setScalar(this.bsc);
      // squash on impact: held through the hit-stop (dt = 0), then springs back
      if(this.squashT>0){this.squashT-=dt;const k=Math.max(0,this.squashT/0.18)*this.squashK;this.body.scale.set(this.bsc*(1+k*0.6),this.bsc*(1-k),this.bsc*(1+k*0.6));}}
    if(this.ring)this.ring.visible=!this.dusted;
    let lean=0,twist=0,roll=0;
    if(S==='stun')lean=-0.4;else if(S==='block')lean=0.15;else if(S==='grab')lean=0.2;else if(S==='dash')lean=0.35;
    else if(A){const a=A,p=a.t/a.def.startup,big=a.slot==='combo'||a.slot==='special';
      if(p<0.6)lean=big?-0.15:-0.05;else if(p<1.6)lean=big?0.1:0.2;
      if(!big&&p>0.5&&p<2.2)twist=(a.hand===0?-1:1)*(['hook','swingH','slap','slapH','kickH'].includes(AP)?0.7:0.4);
      if(AP==='head'||AP==='rocket')lean=p<1?-0.35:0.75;else if(AP==='dropkick')lean=-0.3;else if(AP==='chop'&&p>=1)lean=0.35;else if(AP==='rush')twist=Math.sin(t*60)*0.25;}
    if(ap){lean=clamp(ap.p[6]*0.7,-0.4,0.6);twist=clamp(ap.p[7]*0.45,-0.75,0.75);roll=clamp(ap.p[8]*0.5,-0.25,0.25);}
    if(this.win){const e=this.ch.emote;if(e==='bow')lean=Math.max(0,Math.sin(t*2.5))*0.8;if(e==='chill')roll=Math.sin(t*1.5)*0.12;if(e==='flex')twist=Math.sin(t*12)*0.08;if(e==='guitar')lean=-0.15+Math.sin(t*8)*0.05;}
    this.torso.rotation.x=lerp(this.torso.rotation.x,lean,1-Math.exp(-14*dt));
    this.torso.rotation.y=lerp(this.torso.rotation.y,twist,1-Math.exp(-16*dt));
    this.torso.rotation.z=lerp(this.torso.rotation.z,roll,1-Math.exp(-8*dt));
    this.torso.position.y=0.72+Math.sin(t*6)*0.025;
    this.head.rotation.z=lerp(this.head.rotation.z,(ap?clamp(ap.p[13]*0.7,-0.4,0.4):0)+((S==='stun'&&!ap)||this.fx.dizzy>0?Math.sin(t*20)*0.15:0),0.3);
    this.head.rotation.x=lerp(this.head.rotation.x,ap?clamp(ap.p[12]*0.7,-0.45,0.45):0,0.3);
    const air=this.y>groundAt(this.pos.x,this.pos.z,this.y)+0.15;
    this.walk+=dt*12*this.moving;
    const sw=Math.sin(this.walk)*0.6*this.moving;
    if(lying){this.legs[0].rotation.x=0;this.legs[1].rotation.x=0;}
    else if(air&&S!=='grabbed'){this.legs[0].rotation.x=lerp(this.legs[0].rotation.x,-0.7,0.3);this.legs[1].rotation.x=lerp(this.legs[1].rotation.x,0.3,0.3);}
    else if(ap&&ap.legs&&this.moving<0.15){const k=1-Math.exp(-14*dt);const lo=S==='attack'?-1.8:-1;this.legs[0].rotation.x=lerp(this.legs[0].rotation.x,clamp(ap.p[9]*0.85,lo,0.8),k);this.legs[1].rotation.x=lerp(this.legs[1].rotation.x,clamp(ap.p[10]*0.85,lo,0.8),k);}
    else{this.legs[0].rotation.x=sw;this.legs[1].rotation.x=-sw;}
    if(A){const d=A.def,tt=A.t,env=tt<d.startup?easeOutCubic(Math.min(1,tt/d.startup)):tt<d.startup+d.active?1:Math.max(0,1-(tt-d.startup-d.active)/d.recover);
      if(AP==='kick'&&!ap)this.legs[A.hand].rotation.x=-1.15*env;
      else if(AP==='kickH'&&!ap)this.legs[A.hand].rotation.x=-1.65*env;
      else if(AP==='dropkick'){this.legs[0].rotation.x=this.legs[1].rotation.x=-1.45*env;}
      else if(AP==='roll'&&env>0.2){this.legs[0].rotation.x=this.legs[1].rotation.x=-1.2;}}
    for(const h of[0,1]){const act=S==='attack'&&this.atk&&(this.atk.hand===h||this.atk.type==='cast');this.gp[h].lerp(this.glovePose(h).add(GLOVE_OFS),act?1-Math.exp(-45*dt):1-Math.exp(-16*dt));}
    this.updArms();
    for(const h of[0,1]){const big=A&&A.def.bigGlove&&A.hand===h?1+2.2*Math.min(1,A.t/A.def.startup):1;this.gloves[h].scale.set(big,0.95*big,1.12*big);}
    if(this.fx.parry>0&&Math.random()<0.3)puffFx(this.pos.x,this.y+1.2,this.pos.z,0x9fd4ff,1,0.35,0.4);
    this.stars.visible=this.fx.dizzy>0||(S==='stun'&&this.stunT>0.5)||S==='down';
    if(this.stars.visible)this.stars.rotation.y+=dt*6;
    if(this.rainbow)this.gloveMat.color.setHSL((t*0.3)%1,0.9,0.55);
    this.gloveMat.emissiveIntensity=Math.max(EV.dark*0.9,this.rage>=100?0.45+0.45*Math.sin(t*12):this.baseEm);
    if(this.b3)upd3D(this,dt);
  }
  /* long hair hides the whole body from the chase camera → fade it when the camera looks at the fighter's back */
  hairFade(dt){
    const m=this.hairBack;if(!m)return;
    const dx=camera.position.x-this.pos.x,dz=camera.position.z-this.pos.z,d=Math.hypot(dx,dz)||1;
    const a=this.root.rotation.y,facing=(Math.sin(a)*dx+Math.cos(a)*dz)/d;
    const lying=this.state==='ko'||this.state==='down';
    const want=!lying&&!G.photo&&facing<-0.25?0.3:1;
    this.hairO=lerp(this.hairO,want,1-Math.exp(-10*dt));
    m.opacity=this.hairO;m.depthWrite=this.hairO>0.97;
  }
  lite(dt){this.t+=dt;if(this.rainbow)this.gloveMat.color.setHSL((this.t*0.3)%1,0.9,0.55);this.gloveMat.emissiveIntensity=this.rage>=100?0.45+0.45*Math.sin(this.t*12):this.baseEm;if(this.stars.visible)this.stars.rotation.y+=dt*6;}
  setHeldVis(type){const cur=this.held?this.held.type:null;if(cur===type)return;this.removeHeld();if(type){const W=WEAPONS[type];const mesh=W.mk();mesh.position.set(...W.hold.p);mesh.rotation.set(...W.hold.r);mesh.scale.multiplyScalar(handScale(this));handObj(this).add(mesh);this.held={type,dur:0,mesh};}}
  snap(){return[this.pos.x,this.y,this.pos.z,this.root.rotation.y,this.body.rotation.x,this.body.position.y,this.body.scale.x,this.torso.rotation.x,this.torso.rotation.y,this.torso.rotation.z,this.legs[0].rotation.x,this.legs[1].rotation.x,this.gp[0].x,this.gp[0].y,this.gp[0].z,this.gp[1].x,this.gp[1].y,this.gp[1].z,EXPRS.indexOf(this.expr),this.stars.visible?1:0];}
  applySnap(s){if(G.phase==='replay'&&this.body.scale.x>0.05&&s[6]<0.01)koDustFx(V(s[0],s[1]+1.2,s[2]),'ปุ้ง!!');if(this.ring)this.ring.visible=s[6]>0.01;
    this.root.position.set(s[0],s[1],s[2]);this.root.rotation.y=s[3];this.body.rotation.x=s[4];this.body.position.y=s[5];this.body.scale.setScalar(s[6]);this.torso.rotation.set(s[7],s[8],s[9]);this.legs[0].rotation.x=s[10];this.legs[1].rotation.x=s[11];this.gp[0].set(s[12],s[13],s[14]);this.gp[1].set(s[15],s[16],s[17]);this.updArms();const e=EXPRS[s[18]]||'normal';if(e!==this.expr){this.expr=e;this.redraw();}this.stars.visible=!!s[19];if(this.b3)apply3D(this,s[10],s[11]);}
}
function say(f,text,sp){popup(text,f.headPos().add(V(0,0.95*f.S,0)),'bubble'+(sp?' sp':''),sp?1.4:1.5);}

/* ================= AI ================= */
const AICFG=[{think:.45,aggr:.32,block:.1,spec:.35},{think:.26,aggr:.55,block:.33,spec:.6},{think:.13,aggr:.8,block:.6,spec:.9}];
function aiThink(f,dt){
  const A=f.ai,C=AICFG[G.diff];
  const it={mx:0,mz:0,atk:null,block:false,jump:false,grab:false};
  if(f.state!=='idle'&&f.state!=='block'&&f.state!=='attack'){A.blockT=0;return it;}
  A.tt-=dt;
  if(!A.tgt||A.tgt.state==='ko'||A.tt<=0){A.tgt=nearestEnemy(f,99);A.tt=rand(1.2,2.5);}
  const tg=A.tgt;if(!tg)return it;
  if(A.blockT>0){A.blockT-=dt;it.block=true;return it;}
  const dx=tg.pos.x-f.pos.x,dz=tg.pos.z-f.pos.z,d=Math.hypot(dx,dz)||0.001,dy=tg.y-f.y;
  let threat=null;for(const e of G.f){if(e.team===f.team||e.state!=='attack'||!e.atk)continue;if(e.atk.t<e.atk.def.startup&&Math.hypot(e.pos.x-f.pos.x,e.pos.z-f.pos.z)<2.4){threat=e;break;}}
  if(threat){if(!A.reacted){A.reacted=true;if(Math.random()<C.block){A.blockT=rand(.3,.55);it.block=true;return it;}}}else A.reacted=false;
  A.timer-=dt;
  if(A.timer<=0){
    A.timer=C.think*rand(.6,1.4);A.atk=null;A.grab=false;A.jump=false;
    const watch=G.watch>0&&f.pos.z<2.95;
    let gx=tg.pos.x,gz=tg.pos.z,isT=true;
    const mz=zoneOf(f.pos),tz=zoneOf(tg.pos);
    const ml=lvlOf(f),tl=lvlOf(tg);
    if(ml!==tl){isT=false;
      if(ml==='g'){if(mz==='out'){const w=exitWp(f,{x:2.6,z:-9.5},false);gx=w.x;gz=w.z;}else if(f.pos.z>-8.4||f.pos.x<2.8||f.pos.z<-10.6){gx=2.6;gz=-9.5;}else{gx=8.2;gz=-9.5;}}
      else if(ml==='mz'){if(tl==='f2'){gx=12.4;gz=-10.1;}else{gx=f.pos.x>7.3?6.6:2.2;gz=-9.5;}}
      else{const bp=PANES.find(p=>p.b.broken);if(tl==='g'&&tg.pos.z>3&&bp){gx=(bp.b.x0+bp.b.x1)/2;gz=3.9;}else{gx=10.2;gz=-10.1;}}}
    else if(mz!==tz){isT=false;const w=exitWp(f,{x:tg.pos.x,z:tg.pos.z},mz==='in');gx=w.x;gz=w.z;}
    else if(mz==='out'&&ml==='g'){const w=outdoorWp({x:f.pos.x,z:f.pos.z},{x:tg.pos.x,z:tg.pos.z});if(w.x!==tg.pos.x||w.z!==tg.pos.z){isT=false;gx=w.x;gz=w.z;}}
    if(isT&&!watch){
      if(f.hp/f.maxHp<0.55){const p=nearestPower(f,9,true);if(p&&Math.abs(p.y-f.y)<1.5){gx=p.x;gz=p.z;isT=false;}}
      if(isT&&!f.held&&d>3.2){const w=nearestWeapon(f,5.5);if(w){gx=w.x;gz=w.z;isT=false;if(Math.hypot(w.x-f.pos.x,w.z-f.pos.z)<1.1)A.grab=true;}}
    }
    const reach=1.65+(f.held?WEAPONS[f.held.type].range:0),spR=SPECIALS[f.lo.sp].range;
    if(!watch&&isT&&d<=reach&&Math.abs(dy)<1.3&&Math.random()<C.aggr){
      if(f.rage>=100&&Math.random()<C.spec&&d<=spR)A.atk='special';
      else if(tg.state==='block'&&Math.random()<.55)A.grab=true;
      else A.atk=Math.random()<.6?'jab':'hook';
      A.mx=A.mz=0;
    }else if(!watch&&f.rage>=100&&d<=spR&&Math.random()<C.spec*0.5){A.atk='special';A.mx=A.mz=0;}
    else if(!watch&&f.held&&d<7&&d>2.6&&Math.random()<0.12){A.grab=true;}
    else{
      let mx=gx-f.pos.x,mzz=gz-f.pos.z;const m=Math.hypot(mx,mzz)||1;
      if(isT&&d<1.2){const s=Math.random()<.5?1:-1;mx=-dz/d*s;mzz=dx/d*s;}else{mx/=m;mzz/=m;}
      if(watch){mx=rand(-1,1);mzz=rand(-1,1);}
      A.mx=mx;A.mz=mzz;
    }
    if(f.blocked&&(A.mx||A.mz)){A.jump=true;A.mx+=rand(-.8,.8);A.mz+=rand(-.8,.8);}
    if(dy>0.6&&d<3)A.jump=true;
    if(Math.random()<0.02)A.jump=true;
  }
  it.mx=A.mx;it.mz=A.mz;
  if(A.atk){it.atk=A.atk;A.atk=null;}
  if(A.jump){it.jump=true;A.jump=false;}
  if(A.grab){it.grab=true;A.grab=false;}
  return it;
}
