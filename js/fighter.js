'use strict';
let hype=0;
/* ================= EFFECTS ================= */
let PJSEQ=0,CPSEQ=0;
const projs=[],rings=[],clouds=[],coupons=[],drops=[],tapes=[];
function clearEffects(){
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
function spawnDrop(f,x,z){const y=groundAt(x,z,20);dropAt(x,z,f);popup('⚠️ แกรนด์กำลังตก!',V(x,y+1.5,z),'crit',1);}
function dropAt(x,z,owner){const y=groundAt(x,z,20);
  const warn=new THREE.Mesh(new THREE.CircleGeometry(1.9,32),new THREE.MeshBasicMaterial({color:0xff2020,transparent:true,opacity:.35}));warn.rotation.x=-Math.PI/2;warn.position.set(x,y+0.03,z);scene.add(warn);
  const piano=mkGrand();piano.position.set(x,y+14,z);piano.rotation.y=rand(0,6);scene.add(piano);
  drops.push({x,z,y,t:0,owner,warn,piano,done:false});}
function addTape(a,b){const m=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,1),M('#f1c40f',{emissive:new THREE.Color('#f1c40f'),emissiveIntensity:.4}));scene.add(m);tapes.push({mesh:m,a,b,t:0});}
function flashFor(f){if(f.human===0)flashScreen();}
function updEffects(dt){
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
    if(d.t>0.85&&!d.done){const k=Math.min(1,(d.t-0.85)/0.3);d.piano.position.y=d.y+14*(1-k*k);
      if(k>=1){d.done=true;if(d.owner){SFX.crash();G.shake=Math.max(G.shake,0.7);burst(V(d.x,d.y+0.5,d.z),0x222222,18,5);ringFx(d.x,d.y,d.z,2.4,0xffffff);}
        if(d.owner)for(const e of enemiesOf(d.owner)){if(Math.hypot(e.pos.x-d.x,e.pos.z-d.z)<2.0&&e.y<d.y+2.5){e.takeHit(d.owner,{dmg:26*d.owner.ch.pow,knock:6,stun:1,launch:6,kd:1,unblockable:1,heavy:1});popup('โดนแกรนด์ทับ! 🎹',e.headPos().add(V(0,0.8,0)),'crit',1.3);}}}}
    if(d.done){d.warn.material.opacity=Math.max(0,0.5-(d.t-1.15));if(d.t>2.4)d.piano.position.y-=dt*1.5;}
    if(d.t>3.2){scene.remove(d.warn);scene.remove(d.piano);drops.splice(i,1);}}
  for(let i=tapes.length-1;i>=0;i--){const t=tapes[i];t.t+=dt;const a=t.a.headPos(),b=t.b.headPos();a.y-=0.6;b.y-=0.6;const mid=a.clone().add(b).multiplyScalar(0.5);t.mesh.position.copy(mid);t.mesh.lookAt(b);t.mesh.scale.set(1,1,Math.max(0.1,a.distanceTo(b)));if(t.t>0.45){scene.remove(t.mesh);tapes.splice(i,1);}}
}

/* ================= SPECIALS ================= */
const SPECIALS={
  files:{name:'สั่งงานด่วน!!',range:8,fn:f=>{for(let i=-2;i<=2;i++)fireProj(f,'file',f.face+i*0.22,{speed:13,dmg:7,knock:4,stun:.4,spin:12});SFX.whoosh();}},
  chat:{name:'ตอบแชทรัวๆ!!',range:9,fn:f=>{f.stream={n:9,t:0,iv:.07,kind:'chat',o:{speed:16,dmg:3.2,knock:1.6,stun:.28},spread:.12};}},
  books:{name:'หนังสือมาใหม่!!',range:8,fn:f=>{f.stream={n:6,t:0,iv:.1,kind:'book',o:{speed:12,dmg:5,knock:2.5,stun:.32,spin:10},spread:.3};}},
  trap:{name:'คูปองลด 5%!!',range:4,fn:f=>{for(let i=0;i<8;i++){const a=f.face+rand(-1,1),d=rand(1.1,4.2);spawnCoupon(f,f.pos.x+Math.sin(a)*d,f.pos.z+Math.cos(a)*d);}}},
  fork:{name:'ส้อมเสียง A440!!',range:3.2,fn:f=>{aoe(f,{r:3.4,dmg:8,dizzy:2.2,knock:3,color:0x7fe0ff,unblockable:1});SFX.tone('sine',440,0,1.6,0.35);SFX.tone('sine',880,0,1.2,0.12);}},
  chord:{name:'Power Chord!!',range:4.5,fn:f=>{aoe(f,{r:5,cone:0.8,dmg:14,knock:11,launch:4,kd:1,color:0xff8a00});SFX.chord();}},
  drop:{name:'ยกแกรนด์ทุ่ม!!',range:11,fn:f=>{const t=nearestEnemy(f,13);const x=t?t.pos.x:f.pos.x+Math.sin(f.face)*3,z=t?t.pos.z:f.pos.z+Math.cos(f.face)*3;spawnDrop(f,x,z);}},
  audit:{name:'หักภาษี ณ ที่จ่าย!!',range:8,fn:f=>{const t=nearestEnemy(f,9);if(!t){popup('ไม่มีใครให้หักภาษี',f.headPos(),'info');return;}
    const r=t.takeHit(f,{dmg:14,knock:2,stun:.6,unblockable:1});if(r){f.heal(14);popup('-14 ภาษี 💸',t.headPos().add(V(0,0.8,0)),'crit',1.2);popup('+14',f.headPos().add(V(0,0.6,0)),'good',1);}
    for(let i=0;i<3;i++){const p=fireProj(t,'paper',0,{visual:1,life:1.2,target:f});p.x+=rand(-.3,.3);p.y+=rand(0,.5);}}},
  flash:{name:'แชะ! แฟลชแรง!!',range:5.5,fn:f=>{SFX.shutter();const L=new THREE.PointLight(0xffffff,6,14);L.position.copy(f.headPos()).add(V(Math.sin(f.face)*0.6,0,Math.cos(f.face)*0.6));scene.add(L);setTimeout(()=>scene.remove(L),140);
    for(const e of enemiesOf(f)){const dx=e.pos.x-f.pos.x,dz=e.pos.z-f.pos.z,d=Math.hypot(dx,dz);if(d<6.5&&(d<0.5||angDiff(f.face,Math.atan2(dx,dz))<1.0)){const r=e.takeHit(f,{dmg:5,knock:1,stun:1.6,unblockable:1});if(r){popup('ตาพร่า! 😵',e.headPos().add(V(0,0.7,0)),'info',1.2);flashFor(e);}}}}},
  dash:{name:'ฟินเกาหลี!!',range:6,fn:f=>{f.state='dash';f.dashing={t:.55,sp:13,hit:new Set(),dmg:12,knock:8,launch:4.5};}},
  pull:{name:'ตลับเมตรวัดพื้นที่!!',range:8,fn:f=>{const t=nearestEnemy(f,9,1.3)||nearestEnemy(f,6);if(!t){popup('วัดไม่ถึง!',f.headPos(),'info');return;}
    if(t.state==='down'||t.invT>0)return;
    addTape(f,t);
    if(t.state==='grab'&&t.victim){t.victim.state='idle';t.victim.grabbedBy=null;t.victim=null;}
    t.state='stun';t.stunT=1.2;t.atk=null;t.stream=null;t.dashing=null;t.pulled={by:f,t:.3};SFX.zap();}},
  cloud:{name:'ควันเขียว~',range:2.6,fn:f=>{spawnCloud(f);SFX.smoke();}},
  buff:{name:'เบ่งกล้าม!!',range:99,fn:f=>{f.fx.buff=7;popup('ซูเปอร์อาร์เมอร์ 💪',f.headPos().add(V(0,0.9,0)),'good',1.4);SFX.thud();G.shake=Math.max(G.shake,0.25);ringFx(f.pos.x,f.y,f.pos.z,2,0xff4040);}},
  finisher:{name:'รับจบ!!',range:9,fn:f=>{const t=nearestEnemy(f,10);if(!t){popup('ไม่มีงานให้รับ',f.headPos(),'info');return;}f.state='dash';f.dashing={t:.38,sp:20,target:t,hit:new Set()};}},
  random:{name:'ทำทุกอย่าง!!',range:6,fn:f=>{const k=pick(Object.keys(SPECIALS).filter(k=>k!=='random'));popup('('+SPECIALS[k].name+')',f.headPos().add(V(0,1.4,0)),'combo',1.3);SPECIALS[k].fn(f);}},
};

/* ================= FIGHTER ================= */
const ATK={
  jab:{startup:.11,active:.08,recover:.15,dmg:5,range:1.6,knock:1.8,stun:.26,rage:7},
  hook:{startup:.24,active:.1,recover:.3,dmg:10,range:1.6,knock:4.2,stun:.42,rage:11},
  combo:{startup:.14,active:.1,recover:.36,dmg:14,range:1.7,knock:5,stun:.9,rage:12,launch:7,kd:1},
  swingL:{startup:.16,active:.1,recover:.22,dmg:7,range:1.7,knock:3,stun:.35,rage:8},
  swingH:{startup:.3,active:.12,recover:.36,dmg:12,range:1.7,knock:6,stun:.6,rage:12,launch:4,kd:1},
  cast:{startup:.3,active:.05,recover:.38,dmg:0,range:0},
};
const armGeo=new THREE.CylinderGeometry(0.11,0.1,1,8);
const UPV=V(0,1,0);
const WALLFX={piano:['ชนเปียโน! 🎹','piano'],grand:['ชนแกรนด์! 🎹','piano'],bench:['ชนเก้าอี้!','thud'],guitar:['ชนกีตาร์! 🎸','guitar'],glass:['ชนกระจก!','glass'],counter:['ชนเคาน์เตอร์!','thud'],box:['ชนกล่องพัสดุ! 📦','thud'],shelf:['หนังสือร่วง! 📚','thud'],car:['รถร้อง! 🚨','alarm'],bike:['ชนมอไซค์!','thud'],cart:['ส้มตำหก! 🌶','thud'],pole:['ชนเสาไฟ!','thud'],planter:['ชนกระถาง!','thud'],stage:['ชนแท่น!','thud'],mezz:['ติดผนัง!','thud'],stairs:['ชนบันได!','thud'],desk:['ชนโต๊ะหัวหน้า!','thud'],wall:['ติดผนัง!','thud']};
const tigerTex=canvasTex(128,64,(g,w,h)=>{g.fillStyle='#ff9a1a';g.fillRect(0,0,w,h);g.fillStyle='#111';for(let i=0;i<9;i++){g.beginPath();const x=i*15;g.moveTo(x,0);g.lineTo(x+8,0);g.lineTo(x+2,h);g.lineTo(x-5,h);g.fill();}});

class Fighter{
  constructor(ch,slot,o){
    this.ch=ch;this.slot=slot;this.team=o.team;this.human=o.human;this.color=o.color;this.label=o.label;
    this.S=ch.size*(o.sizeMul||1);this.r=0.42*this.S;this.h=2.5*this.S;this.maxHp=Math.round(ch.hp*(o.hpMul||1));
    this.ai={timer:0,mx:0,mz:0,blockT:0,reacted:false,tgt:null,tt:0};
    const bulk=this.bulk=ch.bulk||1;
    this.root=new THREE.Group();scene.add(this.root);
    this.body=new THREE.Group();this.root.add(this.body);this.body.scale.setScalar(this.S);
    const cast=m=>{m.castShadow=true;return m;};
    const skin=M(ch.skin),shirt=M(ch.shirt),shorts=M(ch.shorts),shoe=M('#1d1d1d'),hairM=M(ch.hair);
    const gs=GLOVES[ch.glove||0]||GLOVES[0];
    const gcol=gs.color||this.color;
    this.gloveMat=M(gcol,{roughness:gs.rough||.35,metalness:gs.metal||0,emissive:new THREE.Color(gs.em||this.color),emissiveIntensity:gs.em?0.35:0,map:gs.tiger?tigerTex:null});
    if(gs.tiger)this.gloveMat.color.set('#ffffff');
    this.rainbow=!!gs.rainbow;this.baseEm=gs.em?0.35:0;
    this.legs=[];
    for(const sx of[1,-1]){
      const p=new THREE.Group();p.position.set(sx*0.22,0.95,0);this.body.add(p);
      const th=cast(new THREE.Mesh(new THREE.BoxGeometry(0.34*Math.sqrt(bulk),0.42,0.36),shorts));th.position.y=-0.18;p.add(th);
      const sn=cast(new THREE.Mesh(new THREE.BoxGeometry(0.24,0.5,0.26),ch.sleeves?shorts:skin));sn.position.y=-0.6;p.add(sn);
      const so=cast(new THREE.Mesh(new THREE.BoxGeometry(0.28,0.14,0.42),shoe));so.position.set(0,-0.88,0.06);p.add(so);
      this.legs.push(p);
    }
    const T=this.torso=new THREE.Group();T.position.y=0.95;this.body.add(T);
    const w=cast(new THREE.Mesh(new THREE.BoxGeometry(0.8*bulk,0.22,0.48),shorts));w.position.y=0.05;T.add(w);
    const c=cast(new THREE.Mesh(new THREE.BoxGeometry(0.95*bulk,0.75,0.52*Math.sqrt(bulk)),shirt));c.position.y=0.5;T.add(c);
    const nk=cast(new THREE.Mesh(new THREE.CylinderGeometry(0.14*bulk,0.16*bulk,0.2,10),skin));nk.position.y=0.95;T.add(nk);
    this.faceCv=document.createElement('canvas');this.faceCv.width=512;this.faceCv.height=256;
    this.faceTex=new THREE.CanvasTexture(this.faceCv);
    this.head=cast(new THREE.Mesh(new THREE.SphereGeometry(0.5,32,20),new THREE.MeshStandardMaterial({map:this.faceTex,roughness:.8})));
    this.head.position.y=1.32;T.add(this.head);
    for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),skin);e.position.set(s*0.5,1.3,0);e.scale.set(0.6,1,1);T.add(e);}
    const hs=ch.hairStyle;
    if(hs==='long'||hs==='longM'){const hb=cast(new THREE.Mesh(new THREE.BoxGeometry(0.86,hs==='long'?0.95:0.75,0.22),hairM));hb.position.set(0,hs==='long'?1.0:1.08,-0.34);T.add(hb);}
    if(hs==='bob'){const hb=cast(new THREE.Mesh(new THREE.BoxGeometry(0.98,0.45,0.3),hairM));hb.position.set(0,1.18,-0.25);T.add(hb);}
    if(hs==='bun'){sph(0.19,hairM,0,1.82,-0.18,T,12,10);}
    if(hs==='swept'){const sw=cast(new THREE.Mesh(new THREE.SphereGeometry(0.53,20,10,0,Math.PI*2,0,Math.PI/2.6),hairM));sw.position.set(0.02,1.36,0);sw.rotation.z=0.12;T.add(sw);}
    const A=ch.acc;
    if(A.includes('tie')){vbox(0.32,0.32,0.02,M('#f4f4f4'),0,0.72,0.265,T);vbox(0.12,0.5,0.03,M(ch.accent||'#c0392b'),0,0.52,0.28,T);}
    if(A.includes('tag')){vbox(0.2,0.11,0.02,M('#ffffff'),0.24,0.68,0.27*Math.sqrt(bulk),T);vbox(0.2,0.03,0.025,M('#c0392b'),0.24,0.72,0.272*Math.sqrt(bulk),T);}
    if(A.includes('headband')){const t=new THREE.Mesh(new THREE.TorusGeometry(0.47,0.05,8,28),M('#ffffff'));t.rotation.x=Math.PI/2+0.1;t.position.y=1.5;T.add(t);}
    if(A.includes('headset')){const t=new THREE.Mesh(new THREE.TorusGeometry(0.54,0.035,8,20,Math.PI),M('#222'));t.position.y=1.32;T.add(t);for(const s of[-1,1]){const e=cyl(0.13,0.13,0.08,M('#333'),s*0.52,1.3,0,T,12);e.rotation.z=Math.PI/2;}const mic=cyl(0.015,0.015,0.45,M('#222'),-0.42,1.16,0.22,T,6);mic.rotation.set(Math.PI/2,0,-0.5);sph(0.05,M('#111'),-0.3,1.12,0.43,T,8,6);}
    if(A.includes('headphones')){const t=new THREE.Mesh(new THREE.TorusGeometry(0.2*bulk,0.05,8,20),M('#111'));t.rotation.x=Math.PI/2;t.position.y=0.9;T.add(t);for(const s of[-1,1]){const e=cyl(0.1,0.1,0.07,M('#e74c3c'),s*0.2*bulk,0.92,0.08,T,10);e.rotation.z=Math.PI/2;}}
    if(A.includes('cap')){const cp=new THREE.Mesh(new THREE.SphereGeometry(0.53,24,10,0,Math.PI*2,0,Math.PI/2.1),M(ch.accent||'#f1c40f'));cp.position.y=1.36;cp.rotation.x=0.12;T.add(cp);vbox(0.6,0.04,0.36,M(ch.accent||'#f1c40f'),0,1.47,0.58,T).rotation.x=0.12;}
    if(A.includes('hood')){const hd=new THREE.Mesh(new THREE.SphereGeometry(0.58,20,12,Math.PI/2+1.0,Math.PI*2-2.0,0,Math.PI*0.62),M('#1f1f22',{side:THREE.DoubleSide}));hd.position.set(0,1.34,-0.02);hd.castShadow=true;T.add(hd);vbox(0.6,0.25,0.3,M('#1f1f22'),0,0.92,-0.25,T);}
    if(A.includes('guitarBack')){const gb=guitar('#111','#222');gb.scale.setScalar(0.62);gb.position.set(0.05,0.25,-0.36);gb.rotation.set(0,Math.PI,0.55);T.add(gb);const st=vbox(0.06,1.0,0.03,M('#5a3010'),0,0.5,0.27,T);st.rotation.z=-0.7;}
    if(A.includes('camera')){vbox(0.24,0.15,0.1,M('#111'),0,0.55,0.33*Math.sqrt(bulk),T);const l=cyl(0.06,0.06,0.1,M('#333'),0,0.55,0.41*Math.sqrt(bulk),T,10);l.rotation.x=Math.PI/2;}
    if(A.includes('tape')){vbox(0.14,0.14,0.08,M('#f1c40f'),0.42,0.1,0.1,T);}
    this.arms=[];this.gloves=[];this.gp=[];
    const armMat=(ch.sleeves&&!ch.tank)?shirt:skin;
    for(const h of[0,1]){
      const arm=cast(new THREE.Mesh(armGeo,armMat));arm.scale.x=arm.scale.z=bulk;T.add(arm);this.arms.push(arm);
      const gl=cast(new THREE.Mesh(new THREE.SphereGeometry(0.21,16,12),this.gloveMat));gl.scale.set(1,1,1.15);T.add(gl);this.gloves.push(gl);
      this.gp.push(V(h?-0.3:0.3,1.0,0.62));
    }
    this.stars=new THREE.Group();for(let i=0;i<3;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.09),new THREE.MeshBasicMaterial({color:0xffe14d}));s.position.set(Math.cos(i*2.1)*0.4,0,Math.sin(i*2.1)*0.4);this.stars.add(s);}
    this.stars.position.y=2.85*this.S;this.stars.visible=false;this.root.add(this.stars);
    const pr=new THREE.Mesh(new THREE.RingGeometry(0.62,0.78,32),new THREE.MeshBasicMaterial({color:new THREE.Color(this.color),transparent:true,opacity:.85,side:THREE.DoubleSide}));
    pr.rotation.x=-Math.PI/2;pr.position.y=0.03;pr.scale.setScalar(this.S);this.root.add(pr);
    this.rage=0;this.expr='';this.reset(0,0,0,0);
  }
  reset(x,y,z,face){
    this.pos={x,z};this.vel={x:0,z:0};this.mv={x:0,z:0};this.y=y;this.vy=0;this.hp=this.maxHp;this.lagHp=this.maxHp;
    this.state='idle';this.atk=null;this.stunT=0;this.koT=0;this.downT=0;this.recT=0;this.win=false;this.queued=null;this.jabHand=0;this.t=Math.random()*5;this.walk=0;this.moving=0;this.wallCd=0;this.invT=0;
    this.face=this.faceT=face;this.spinA=0;this.seq=[];this.lastAtkEnd=-9;this.comboN=0;this.lastHitT=-9;this.knockdown=false;
    this.stream=null;this.dashing=null;this.pulled=null;this.victim=null;this.grabbedBy=null;
    this.fx={dizzy:0,slow:0,buff:0,immune:0};
    if(this.held)this.removeHeld();
    this.body.rotation.set(0,0,0);this.body.position.set(0,0,0);this.body.scale.setScalar(this.S);this.torso.rotation.set(0,0,0);
    this.root.position.set(x,y,z);this.root.rotation.y=face;
    this.setExpr('normal',0,true);
  }
  dispose(){scene.remove(this.root);if(this.tagEl)this.tagEl.remove();}
  redraw(){drawFace(this.faceCv,this.ch,this.expr);this.faceTex.needsUpdate=true;}
  setExpr(e,dur=0,force){if(e!==this.expr||force){this.expr=e;this.redraw();}this.exprT=dur;}
  headPos(){const v=V(0,0,0);this.head.getWorldPosition(v);return v;}
  fwd(){return{x:Math.sin(this.face),z:Math.cos(this.face)};}
  heal(n){this.hp=Math.min(this.maxHp,this.hp+n);}
  alive(){return this.state!=='ko';}
  lockOn(){let best=null,bd=99;for(const e of enemiesOf(this)){const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,d=Math.hypot(dx,dz);if(Math.abs(e.y-this.y)>2)continue;const ad=angDiff(this.face,Math.atan2(dx,dz));if((d<4.5&&ad<1.6)||d<2.2){const sc=d+ad;if(sc<bd){bd=sc;best=e;}}}
    if(best){this.face=this.faceT=Math.atan2(best.pos.x-this.pos.x,best.pos.z-this.pos.z);}}
  tryAttack(type){
    let t=type;
    if(type==='special'){
      if(this.rage<100)return false;
      this.rage=0;this.spKey=this.ch.sp;t='cast';
      say(this,SPECIALS[this.spKey].name,true);G.shake=Math.max(G.shake,0.12);
    }else if(this.held&&(type==='jab'||type==='hook'))t=type==='jab'?'swingL':'swingH';
    else{
      if(this.t-this.lastAtkEnd<0.45)this.seq.push(type);else this.seq=[type];
      if(this.seq.length>4)this.seq.shift();
      const n=this.seq.length;
      if(n>=3&&this.seq[n-1]==='hook'&&this.seq[n-2]==='jab'&&this.seq[n-3]==='jab'){t='combo';this.seq=[];popup('คอมโบ!!',this.headPos().add(V(0,0.8,0)),'combo',0.8);}
    }
    if(G.watch>0&&this.pos.z<2.95&&G.phase==='fight'){this.hp=Math.max(1,this.hp-6);popup('ลูกค้าเห็น! หักเงินเดือน 💸',this.headPos().add(V(0,0.9,0)),'crit',1.3);}
    this.lockOn();
    let hand=0;if(t==='jab'){this.jabHand^=1;hand=this.jabHand;}else if(t==='hook')hand=1-this.jabHand;
    this.state='attack';this.atk={type:t,def:ATK[t],t:0,hit:false,hand};
    SFX.whoosh();this.setExpr('attack',ATK[t].startup+ATK[t].active+0.15);
    return true;
  }
  doGrab(){
    if(this.held){this.throwHeld();return;}
    this.lockOn();const fw=this.fwd();let best=null,bd=1.5;
    for(const e of enemiesOf(this)){if(e.state==='down'||e.state==='grabbed'||e.invT>0||Math.abs(e.y-this.y)>0.9)continue;const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,d=Math.hypot(dx,dz);if(d<bd&&(d<0.5||(dx*fw.x+dz*fw.z)/d>0.3)){bd=d;best=e;}}
    if(best){
      if(best.state==='grab'&&best.victim){best.victim.state='idle';best.victim.grabbedBy=null;best.victim=null;}
      this.state='grab';this.grabT=0;this.victim=best;best.state='grabbed';best.grabbedBy=this;best.atk=null;best.stream=null;best.dashing=null;best.pulled=null;if(best.held)best.dropHeld();SFX.whoosh();return;}
    const it=nearestWeapon(this,1.25);if(it){this.pickUp(it);return;}
    this.state='recover';this.recT=0.18;
  }
  pickUp(it){
    removeItem(it);const W=WEAPONS[it.type];const mesh=W.mk();mesh.position.set(...W.hold.p);mesh.rotation.set(...W.hold.r);mesh.scale.multiplyScalar(1/this.S*1.0);
    this.gloves[0].add(mesh);this.held={type:it.type,dur:it.dur,mesh};SFX.pickup();popup('ได้ '+W.name+'!',this.headPos().add(V(0,0.7,0)),'good',1);
    this.state='recover';this.recT=0.15;
  }
  removeHeld(){if(this.held){this.gloves[0].remove(this.held.mesh);this.held=null;}}
  dropHeld(){if(!this.held)return;dropWeapon(this.held.type,this.held.dur,this.pos.x+rand(-.4,.4),groundAt(this.pos.x,this.pos.z,this.y+0.5),this.pos.z+rand(-.4,.4));this.removeHeld();}
  throwHeld(){
    this.lockOn();const W=WEAPONS[this.held.type];const mesh=W.mk();
    fireProj(this,'thrown',this.face,{mesh,wt:this.held.type,speed:14,vy:2.5,grav:8,dmg:W.throwDmg*this.ch.pow,knock:6,stun:.5,spin:9,launch:3,kd:1,life:1.6,r:0.5});
    this.removeHeld();SFX.whoosh();this.state='recover';this.recT=0.25;this.setExpr('attack',0.3);
  }
  resolveHit(){
    const a=this.atk,d=a.def;const sw=a.type==='swingL'||a.type==='swingH';const W=sw&&this.held?WEAPONS[this.held.type]:null;
    const reach=d.range*Math.sqrt(this.S)+(W?W.range:0);const fw=this.fwd();let any=false;
    for(const e of G.f){if(e===this||e.team===this.team||e.state==='ko')continue;
      const dx=e.pos.x-this.pos.x,dz=e.pos.z-this.pos.z,dist=Math.hypot(dx,dz);
      if(dist>reach+e.r*0.5||Math.abs(e.y-this.y)>1.5)continue;
      if(dist>0.3&&(dx*fw.x+dz*fw.z)/dist<0.4)continue;
      let dmg=d.dmg*this.ch.pow*(this.fx.buff>0?1.5:1),knock=d.knock;if(W){dmg*=W.dmg;knock+=W.knock;}
      const r=e.takeHit(this,{dmg,knock,stun:d.stun,launch:d.launch,kd:d.kd,heavy:a.type!=='jab'&&a.type!=='swingL',rage:d.rage});
      if(r)any=true;
    }
    if(any&&W){if(W.sfx)SFX[W.sfx]();this.held.dur--;if(this.held.dur<=0){popup(W.name+' พัง!',this.headPos().add(V(0,0.6,0)),'info',1);burst(this.gloves[0].getWorldPosition(V(0,0,0)),0x8a6a4a,10,3);this.removeHeld();}}
  }
  takeHit(att,h){
    if(this.state==='ko'||this.state==='down'||this.invT>0)return false;
    if(att&&att.team===this.team)return false;
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
    const armor=this.fx.buff>0;if(armor)dmg*=0.7;
    this.hp-=dmg;
    if(this.state==='grab'&&this.victim){this.victim.state='idle';this.victim.grabbedBy=null;this.victim=null;}
    if(this.held&&(h.launch||h.knock>=6))this.dropHeld();
    if(!armor||h.launch>=6||h.thrown){
      this.state='stun';this.stunT=h.stun||0.3;this.atk=null;this.queued=null;this.stream=null;this.dashing=null;
      if(h.launch){this.vy=h.launch;this.y+=0.02;}
      if(h.kd){this.knockdown=true;if(!h.launch){this.vy=Math.max(this.vy,3);this.y+=0.02;}}
      this.vel.x+=nx*h.knock;this.vel.z+=nz*h.knock;
    }else{this.vel.x+=nx*h.knock*0.25;this.vel.z+=nz*h.knock*0.25;if(Math.random()<.3)popup('ไม่สะเทือน! 💪',hp.clone().add(V(0,0.6,0)),'info',0.8);}
    this.rage=Math.min(100,this.rage+8);
    if(att){att.rage=Math.min(100,att.rage+(h.rage||9));
      if(G.clock-att.lastHitT<1.0)att.comboN++;else att.comboN=1;att.lastHitT=G.clock;
      if(att.comboN>=3)popup(att.comboN+' HIT!',att.headPos().add(V(0,1.1,0)),'combo',0.7);}
    const heavy=!!h.heavy;
    SFX.hit(heavy);G.shake=Math.max(G.shake,heavy?0.22:0.08);G.hitStop=Math.max(G.hitStop,heavy?0.07:0.03);
    hype=Math.min(1,hype+(heavy?0.35:0.12));
    popup(Math.round(dmg)+'',hp,crit||dmg>=14?'crit':'dmg',0.8);
    burst(hp.clone().add(V(-nx*0.4,-0.1,-nz*0.4)),dmg>=14?0xffb000:0xffee66,heavy?12:6,heavy?4:2.5);
    this.setExpr('hurt',0.45);
    if(this.hp<=0){this.hp=0;this.state='ko';this.koT=0;this.setExpr('ko');this.vy=Math.max(this.vy,4.5);this.y+=0.02;this.vel.x+=nx*3;this.vel.z+=nz*3;this.knockdown=false;this.dropHeld();this.stream=null;this.dashing=null;
      popup('K.O.!',hp.clone().add(V(0,1,0)),'crit',1.4);onKO(this,att);}
    else if(Math.random()<(heavy?0.4:0.15)){if(Math.random()<0.55)say(this,pick(HURT));else if(att)say(att,pick(att.ch.quotes));}
    return true;
  }
  onWallHit(b){
    if(this.wallCd>0||(G.phase!=='fight'&&G.phase!=='ko'))return;
    this.wallCd=0.45;const fx=WALLFX[b.tag]||WALLFX.wall;
    SFX[fx[1]]();G.shake=Math.max(G.shake,0.3);hype=Math.min(1,hype+0.4);
    popup(fx[0],this.headPos().add(V(0,0.4,0)),'info',1.1);
    if(this.state!=='ko'&&G.phase==='fight')this.hp=Math.max(1,this.hp-3);
    burst(this.headPos(),b.tag==='shelf'?0xc0392b:0xffffff,b.tag==='shelf'?14:7,3);
    if(b.tag==='grand'||b.tag==='piano')this.setExpr('hurt',0.5);
  }
  land(){
    const v=this.vy;this.vy=0;
    if(this.knockdown){this.knockdown=false;if(this.state!=='ko'){this.state='down';this.downT=0.85;this.stunT=0;}SFX.thud();G.shake=Math.max(G.shake,0.12);burst(V(this.pos.x,this.y+0.1,this.pos.z),0xd8cbb0,8,2);}
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
    if(S==='ko'){this.koT+=dt;}
    else if(S==='down'){this.downT-=dt;if(this.downT<=0){this.state='idle';this.invT=0.7;}}
    else if(S==='stun'){
      this.stunT-=dt;
      if(this.pulled){const P=this.pulled,by=P.by;P.t-=dt;const fw=by.fwd();const tx=by.pos.x+fw.x*1.1,tz=by.pos.z+fw.z*1.1;const k=1-Math.exp(-14*dt);this.pos.x=lerp(this.pos.x,tx,k);this.pos.z=lerp(this.pos.z,tz,k);this.vel.x=this.vel.z=0;
        if(P.t<=0){this.pulled=null;this.state='idle';this.takeHit(by,{dmg:8*by.ch.pow,knock:0.5,stun:1.1,unblockable:1});}}
      else if(this.stunT<=0&&onG)this.state='idle';
    }
    else if(S==='grabbed'){const g=this.grabbedBy;if(!g||g.state!=='grab'||g.victim!==this){this.state='idle';this.grabbedBy=null;}}
    else if(S==='grab'){
      this.grabT+=dt;const v=this.victim;
      if(!v||v.state!=='grabbed'){this.state='idle';this.victim=null;}
      else{const fw=this.fwd();v.pos.x=this.pos.x+fw.x*0.95;v.pos.z=this.pos.z+fw.z*0.95;v.y=this.y+0.35;v.vy=0;v.face=this.face+Math.PI;
        if(this.grabT>=0.32){v.state='stun';v.grabbedBy=null;this.victim=null;this.state='recover';this.recT=0.3;
          v.takeHit(this,{dmg:10*ch.pow,knock:7.5,stun:.8,launch:6.5,kd:1,unblockable:1,dir:fw,thrown:1,heavy:1});popup('ทุ่ม!!',v.headPos().add(V(0,0.8,0)),'combo',0.9);}}
    }
    else if(S==='recover'){this.recT-=dt;if(this.recT<=0)this.state='idle';}
    else if(S==='dash'){
      const D=this.dashing;
      if(!D){this.state='idle';}
      else{D.t-=dt;let dir=this.face;
        if(D.target){const tg=D.target;if(tg.state==='ko'||tg.invT>0||tg.state==='down'){this.dashing=null;this.state='recover';this.recT=0.3;}
          else{dir=Math.atan2(tg.pos.x-this.pos.x,tg.pos.z-this.pos.z);this.face=this.faceT=dir;
            if(Math.hypot(tg.pos.x-this.pos.x,tg.pos.z-this.pos.z)<1.25){const low=tg.hp/tg.maxHp<0.3;
              tg.takeHit(this,{dmg:(low?45:22)*ch.pow,knock:6,stun:1,launch:8.5,kd:1,unblockable:1,heavy:1});
              popup(low?'รับจบ!! ✔':'รับงาน!',tg.headPos().add(V(0,1,0)),'crit',1.2);G.shake=Math.max(G.shake,0.5);this.dashing=null;this.state='recover';this.recT=0.45;}}}
        if(this.dashing){
          this.pos.x+=Math.sin(dir)*D.sp*dt;this.pos.z+=Math.cos(dir)*D.sp*dt;
          if(!D.target)for(const e of enemiesOf(this)){if(D.hit.has(e)||Math.abs(e.y-this.y)>1.5)continue;if(Math.hypot(e.pos.x-this.pos.x,e.pos.z-this.pos.z)<1.3){D.hit.add(e);e.takeHit(this,{dmg:D.dmg*ch.pow,knock:D.knock,stun:.7,launch:D.launch,kd:1,dir:{x:Math.sin(dir),z:Math.cos(dir)},heavy:1});}}
          if(Math.random()<0.5)burst(V(this.pos.x,this.y+0.8,this.pos.z),D.target?0x333333:0xff9be0,1,1);
          if(D.t<=0){this.dashing=null;this.state='recover';this.recT=0.3;}
        }}
    }
    else if(S==='attack'){
      const a=this.atk;a.t+=dt*ch.aspd*(this.fx.buff>0?1.1:1);
      if(it&&it.atk&&a.t>a.def.startup)this.queued=it.atk;
      if(onG&&a.t>a.def.startup*0.5&&a.t<a.def.startup&&a.type!=='cast'){const f=this.fwd();const sp=a.type==='combo'?2.4:1.3;this.pos.x+=f.x*sp*dt;this.pos.z+=f.z*sp*dt;}
      if(!a.hit&&a.t>=a.def.startup){a.hit=true;if(a.type==='cast'){SPECIALS[this.spKey].fn(this);}else this.resolveHit();}
      if(this.state==='attack'&&a.t>=a.def.startup+a.def.active+a.def.recover){this.state='idle';this.atk=null;this.lastAtkEnd=this.t;if(this.queued){const q=this.queued;this.queued=null;this.tryAttack(q);}}
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
    if(this.stream&&(this.state==='attack'||this.state==='idle'||this.state==='block'||this.state==='recover')){const s=this.stream;s.t-=dt;if(s.t<=0){s.t=s.iv;s.n--;fireProj(this,s.kind,this.face+rand(-s.spread,s.spread),s.o);if(s.kind==='chat')SFX.tone('square',1200,1600,0.05,0.05);if(s.n<=0)this.stream=null;}}
    // movement
    const m=Math.hypot(wx,wz);
    const sp=4.6*ch.spd*(this.fx.slow>0?.55:1)*(this.fx.buff>0?1.12:1)*(this.fx.dizzy>0?.55:1);
    let tx=0,tz=0;
    if(m>0.12&&this.state==='idle'){const k=Math.min(1,m)/m;tx=wx*k*sp;tz=wz*k*sp;this.faceT=Math.atan2(wx,wz);}
    this.moving=(m>0.12&&this.state==='idle')?Math.min(1,m):0;
    const slick=G.rain>0&&this.pos.z>3;
    const rate=slick?2.2:(onG?16:5);
    if(this.state!=='grabbed'){
      const k=1-Math.exp(-rate*dt);this.mv.x+=(tx-this.mv.x)*k;this.mv.z+=(tz-this.mv.z)*k;
      this.pos.x+=(this.mv.x+this.vel.x)*dt;this.pos.z+=(this.mv.z+this.vel.z)*dt;
      const dec=Math.exp(-(slick?1.6:5)*dt);this.vel.x*=dec;this.vel.z*=dec;
      const g2=groundAt(this.pos.x,this.pos.z,this.y);
      if(this.y>g2+0.001||this.vy>0){this.vy-=GRAV*dt;this.y+=this.vy*dt;if(this.y<=g2){this.y=g2;this.land();}}
      else{this.y=g2;this.vy=0;}
      resolveBlocks(this);
      this.pos.x=clamp(this.pos.x,-21.5,21.5);this.pos.z=clamp(this.pos.z,-7.6,16.6);
    }
    if(this.state==='idle'||this.state==='block')this.face=lerpAngle(this.face,this.faceT,1-Math.exp(-14*dt));
    this.animate(dt);
  }
  glovePose(h){
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
    if(s==='dash')return this.dashing&&this.dashing.target?V(sx*0.2,1.2,1.2):V(sx*0.85,1.1,0.1);
    const g=V(sx*0.3,1.0+Math.sin(t*6+h*1.6)*0.04,0.62);
    if(s==='attack'&&this.atk){
      const a=this.atk,d=a.def,tt=a.t;
      if(a.type==='cast'){const w=V(sx*0.5,1.75,0.1),k=V(sx*0.25,1.2,1.25);if(tt<d.startup)return g.lerp(w,ease(Math.min(1,tt/(d.startup*0.8))));if(tt<d.startup+d.active+0.08)return k;return k.lerp(g,ease(Math.min(1,(tt-d.startup-d.active)/d.recover)));}
      if(a.hand===h){let w,k;
        if(a.type==='jab'||a.type==='swingL'){w=V(sx*0.3,1.02,0.42);k=V(sx*0.1,1.12,1.5);}
        else if(a.type==='hook'||a.type==='swingH'){w=V(sx*0.95,1.05,0.15);k=V(-sx*0.05,1.12,1.3);}
        else{w=V(sx*0.35,0.2,0.45);k=V(sx*0.08,1.85,1.0);}
        const s1=d.startup*0.6;
        if(tt<s1)return g.lerp(w,ease(tt/s1));
        if(tt<d.startup)return w.lerp(k,(tt-s1)/(d.startup-s1));
        if(tt<d.startup+d.active)return k;
        return k.lerp(g,ease(Math.min(1,(tt-d.startup-d.active)/d.recover)));
      }
    }
    if(this.held&&h===0)return V(0.4,1.05,0.5);
    return g;
  }
  updArms(){
    const b=this.bulk;
    for(const h of[0,1]){const G2=this.gp[h],Sh=V(h?-0.55*b:0.55*b,0.78,0);this.gloves[h].position.copy(G2);const dir=G2.clone().sub(Sh),len=dir.length();
      this.arms[h].position.copy(Sh).add(G2).multiplyScalar(0.5);this.arms[h].quaternion.setFromUnitVectors(UPV,dir.normalize());this.arms[h].scale.y=Math.max(0.1,len-0.15);}
  }
  animate(dt){
    const S=this.state,lying=S==='ko'||S==='down',t=this.t;
    if(S==='dash'&&!(this.dashing&&this.dashing.target))this.spinA+=dt*28;
    else if(this.win&&this.ch.emote==='dance')this.spinA+=dt*5;
    else this.spinA=0;
    this.root.position.set(this.pos.x,this.y,this.pos.z);this.root.rotation.y=this.face+this.spinA;
    const bx=lying?-Math.PI/2*0.96:(S==='grabbed'?-0.5:0);
    this.body.rotation.x=lerp(this.body.rotation.x,bx,1-Math.exp(-(lying?6:10)*dt));
    let by=lying?0.12:Math.abs(Math.sin(t*5))*0.05;
    if(this.win&&(this.ch.emote==='jump'||!this.ch.emote))by=Math.abs(Math.sin(t*7))*0.35;
    this.body.position.y=by;
    const bs=this.S*(this.fx.buff>0?1.15:1)*(this.win&&this.ch.emote==='flex'?1+Math.abs(Math.sin(t*6))*0.04:1);
    this.body.scale.setScalar(lerp(this.body.scale.x,bs,1-Math.exp(-8*dt)));
    let lean=0,twist=0,roll=0;
    if(S==='stun')lean=-0.4;else if(S==='block')lean=0.15;else if(S==='grab')lean=0.2;else if(S==='dash')lean=0.35;
    else if(S==='attack'&&this.atk){const a=this.atk,p=a.t/a.def.startup;if(p<0.6)lean=a.type==='combo'||a.type==='cast'?-0.15:-0.05;else if(p<1.6)lean=a.type==='combo'?0.1:0.2;
      if(a.type!=='combo'&&a.type!=='cast'&&p>0.5&&p<2.2)twist=(a.hand===0?-1:1)*(a.type==='hook'||a.type==='swingH'?0.5:0.3);}
    if(this.win){const e=this.ch.emote;if(e==='bow')lean=Math.max(0,Math.sin(t*2.5))*0.8;if(e==='chill')roll=Math.sin(t*1.5)*0.12;if(e==='flex')twist=Math.sin(t*12)*0.08;if(e==='guitar')lean=-0.15+Math.sin(t*8)*0.05;}
    this.torso.rotation.x=lerp(this.torso.rotation.x,lean,1-Math.exp(-14*dt));
    this.torso.rotation.y=lerp(this.torso.rotation.y,twist,1-Math.exp(-16*dt));
    this.torso.rotation.z=lerp(this.torso.rotation.z,roll,1-Math.exp(-8*dt));
    this.torso.position.y=0.95+Math.sin(t*6)*0.025;
    this.head.rotation.z=lerp(this.head.rotation.z,(S==='stun'||this.fx.dizzy>0)?Math.sin(t*20)*0.15:0,0.3);
    const air=this.y>groundAt(this.pos.x,this.pos.z,this.y)+0.15;
    this.walk+=dt*12*this.moving;
    const sw=Math.sin(this.walk)*0.6*this.moving;
    if(lying){this.legs[0].rotation.x=0;this.legs[1].rotation.x=0;}
    else if(air&&S!=='grabbed'){this.legs[0].rotation.x=lerp(this.legs[0].rotation.x,-0.7,0.3);this.legs[1].rotation.x=lerp(this.legs[1].rotation.x,0.3,0.3);}
    else{this.legs[0].rotation.x=sw;this.legs[1].rotation.x=-sw;}
    const k=S==='attack'?1:1-Math.exp(-18*dt);
    for(const h of[0,1])this.gp[h].lerp(this.glovePose(h),k);
    this.updArms();
    this.stars.visible=this.fx.dizzy>0||(S==='stun'&&this.stunT>0.5)||S==='down';
    if(this.stars.visible)this.stars.rotation.y+=dt*6;
    if(this.rainbow)this.gloveMat.color.setHSL((t*0.3)%1,0.9,0.55);
    this.gloveMat.emissiveIntensity=this.rage>=100?0.45+0.45*Math.sin(t*12):this.baseEm;
  }
  lite(dt){this.t+=dt;if(this.rainbow)this.gloveMat.color.setHSL((this.t*0.3)%1,0.9,0.55);this.gloveMat.emissiveIntensity=this.rage>=100?0.45+0.45*Math.sin(this.t*12):this.baseEm;if(this.stars.visible)this.stars.rotation.y+=dt*6;}
  setHeldVis(type){const cur=this.held?this.held.type:null;if(cur===type)return;this.removeHeld();if(type){const W=WEAPONS[type];const mesh=W.mk();mesh.position.set(...W.hold.p);mesh.rotation.set(...W.hold.r);mesh.scale.multiplyScalar(1/this.S);this.gloves[0].add(mesh);this.held={type,dur:0,mesh};}}
  snap(){return[this.pos.x,this.y,this.pos.z,this.root.rotation.y,this.body.rotation.x,this.body.position.y,this.body.scale.x,this.torso.rotation.x,this.torso.rotation.y,this.torso.rotation.z,this.legs[0].rotation.x,this.legs[1].rotation.x,this.gp[0].x,this.gp[0].y,this.gp[0].z,this.gp[1].x,this.gp[1].y,this.gp[1].z,EXPRS.indexOf(this.expr),this.stars.visible?1:0];}
  applySnap(s){this.root.position.set(s[0],s[1],s[2]);this.root.rotation.y=s[3];this.body.rotation.x=s[4];this.body.position.y=s[5];this.body.scale.setScalar(s[6]);this.torso.rotation.set(s[7],s[8],s[9]);this.legs[0].rotation.x=s[10];this.legs[1].rotation.x=s[11];this.gp[0].set(s[12],s[13],s[14]);this.gp[1].set(s[15],s[16],s[17]);this.updArms();const e=EXPRS[s[18]]||'normal';if(e!==this.expr){this.expr=e;this.redraw();}this.stars.visible=!!s[19];}
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
    if(mz!==tz){isT=false;if(mz==='in'){if(Math.abs(f.pos.x)>1.5||f.pos.z<1.0){gx=0;gz=2.0;}else{gx=0;gz=4.8;}}else{if(Math.abs(f.pos.x)>1.5||f.pos.z>5.0){gx=0;gz=4.2;}else{gx=0;gz=1.0;}}}
    else if(onMezz(tg)&&!onMezz(f)){isT=false;if(f.pos.z>-4.5||f.pos.x<2.8||f.pos.z<-6.1){gx=2.6;gz=-5.3;}else{gx=8.2;gz=-5.3;}}
    if(isT&&!watch){
      if(f.hp/f.maxHp<0.55){const p=nearestPower(f,9,true);if(p&&Math.abs(p.y-f.y)<1.5){gx=p.x;gz=p.z;isT=false;}}
      if(isT&&!f.held&&d>3.2){const w=nearestWeapon(f,5.5);if(w){gx=w.x;gz=w.z;isT=false;if(Math.hypot(w.x-f.pos.x,w.z-f.pos.z)<1.1)A.grab=true;}}
    }
    const reach=1.65+(f.held?WEAPONS[f.held.type].range:0),spR=SPECIALS[f.ch.sp].range;
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
