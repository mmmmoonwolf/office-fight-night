'use strict';
/* ================= COLLISION WORLD ================= */
const STEP=0.42,GRAV=24,JUMPV=8.6;
const blocks=[];
function solid(x0,x1,z0,z1,y0,y1,tag){const b={x0,x1,z0,z1,y0,y1,tag};blocks.push(b);return b;}
function sbox(x0,x1,y0,y1,z0,z1,mat,tag,parent){const m=vbox(x1-x0,y1-y0,z1-z0,mat,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,parent);if(tag)solid(x0,x1,z0,z1,y0,y1,tag);return m;}
function groundAt(x,z,feet){let g=0;for(const b of blocks){if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&b.y1<=feet+STEP&&b.y1>g)g=b.y1;}return g;}
function pointInSolid(x,y,z){for(const b of blocks){if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&y>=b.y0&&y<=b.y1)return b;}return null;}
function resolveBlocks(f){
  const r=f.r;let hit=null;
  for(const b of blocks){
    if(b.y1<=f.y+STEP||b.y0>=f.y+f.h)continue;
    const cx=clamp(f.pos.x,b.x0,b.x1),cz=clamp(f.pos.z,b.z0,b.z1);
    const dx=f.pos.x-cx,dz=f.pos.z-cz,d2=dx*dx+dz*dz;
    if(d2>=r*r)continue;
    let nx,nz,pen;
    if(d2>1e-8){const d=Math.sqrt(d2);nx=dx/d;nz=dz/d;pen=r-d;}
    else{const l=f.pos.x-b.x0,rr=b.x1-f.pos.x,n=f.pos.z-b.z0,s=b.z1-f.pos.z,m=Math.min(l,rr,n,s);
      if(m===l){nx=-1;nz=0;pen=l+r;}else if(m===rr){nx=1;nz=0;pen=rr+r;}else if(m===n){nx=0;nz=-1;pen=n+r;}else{nx=0;nz=1;pen=s+r;}}
    if(b.tag==='glass2'&&f.vel.x*nx+f.vel.z*nz<-3.5){breakPane(b,f);continue;}
    if(b.brk&&b.brk.kind==='glass'&&f.vel.x*nx+f.vel.z*nz<-3.5&&hitBreakable(b,9,f)){if(f.state!=='ko'&&G.phase==='fight'){f.hp=Math.max(1,f.hp-4);f.knockdown=true;}continue;}
    f.pos.x+=nx*pen;f.pos.z+=nz*pen;
    const vn=f.vel.x*nx+f.vel.z*nz;
    if(vn<-3.2){f.impact=-vn;f.vel.x-=vn*nx*1.6;f.vel.z-=vn*nz*1.6;hit=b;}
    else if(vn<0){f.vel.x-=vn*nx;f.vel.z-=vn*nz;}
    const mn=f.mv.x*nx+f.mv.z*nz;if(mn<0){f.mv.x-=mn*nx;f.mv.z-=mn*nz;}
    f.blocked=true;
  }
  if(hit)f.onWallHit(hit);
}
// the store (ground floor) and the whole building block it sits in; roads loop around the block
const STORE={x0:-23.3,x1:11,z0:-12,z1:2.95},BLOCK={x0:-23.6,x1:22.3,z0:-12.3,z1:3.1};
const WORLD={x0:-34.2,x1:33,z0:-23,z1:16.6};
const zoneOf=p=>(p.x>STORE.x0&&p.x<STORE.x1&&p.z>STORE.z0&&p.z<STORE.z1)?'in':'out';
const onMezz=f=>f.pos.x>7&&f.pos.z<-8.2&&f.y>2;
const lvlOf=f=>f.y<1.9?'g':(f.pos.x>11.15?'f2':'mz');

/* fade walls */
const fades=[];
function fadeGroup(meshes,cond){meshes.forEach(m=>{m.material=m.material.clone();m.material.transparent=true;});fades.push({meshes,cond,o:1});}
function updFades(dt,focus){for(const f of fades){const want=f.cond(camera.position,focus)?0.16:1;f.o=lerp(f.o,want,1-Math.exp(-8*dt));f.meshes.forEach(m=>{m.material.opacity=f.o;m.material.depthWrite=f.o>0.9;m.castShadow=f.o>0.9;});}}

/* ================= BREAKABLES (the store can be wrecked) ================= */
// a breakable is a collision block with .brk = {kind,hp,name,cost,meshes|group,rubble,exit}; state is restored every round
const BRK=[];let BILL=0;
const baht=n=>'฿'+Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
function breakable(b,o){
  const k=b.brk=Object.assign({hp:2,meshes:[]},o,{broken:false,id:BRK.length,oy0:b.y0,oy1:b.y1});k.max=k.hp;
  k.cols=k.meshes.map(m=>m.material&&m.material.color?m.material.color.getHex():null);
  if(k.group)k.gt={p:k.group.position.clone(),r:k.group.rotation.clone(),s:k.group.scale.clone()};
  BRK.push(b);return b;
}
function hitBreakable(b,power,src){
  const k=b&&b.brk;if(!k||k.broken||(G.phase!=='fight'&&G.phase!=='ko'))return false;
  k.hp-=power;const c=V((b.x0+b.x1)/2,Math.min(k.oy1,(k.oy0+k.oy1)/2+0.2),(b.z0+b.z1)/2);
  if(k.hp<=0){breakIt(b,true);return true;}
  k.meshes.forEach(m=>{if(m.material&&m.material.color)m.material.color.multiplyScalar(0.8);});
  if(k.group)k.group.rotation.z=k.gt.r.z+rand(-0.06,0.06);
  popup(k.kind==='wall'?'กำแพงร้าว! 🧱':(k.name||'')+' ร้าว!',c,'info',0.9);puff(c.x,c.y,c.z,0xd8cbb0,5,0.6,1.5);SFX.thud();
  return false;
}
function brkVisual(b,broken){
  const k=b.brk;k.broken=broken;
  if(broken){
    if(k.group){const g=k.group,t=k.tilt||[0.35,0.25];g.rotation.x=k.gt.r.x+t[0];g.rotation.z=k.gt.r.z+t[1];g.scale.y=k.gt.s.y*0.5;g.scale.x=k.gt.s.x*1.08;g.position.y=k.gt.p.y-0.08;}
    k.meshes.forEach(m=>m.visible=false);
    if(k.low){b.y0=k.oy0;b.y1=Math.min(k.oy1,k.oy0+0.38);}else{b.y0=b.y1=-100;}
    if(k.rubble)k.rubble.visible=true;
  }else{
    b.y0=k.oy0;b.y1=k.oy1;
    k.meshes.forEach((m,i)=>{m.visible=true;if(k.cols[i]!=null&&m.material.color)m.material.color.setHex(k.cols[i]);});
    if(k.group){k.group.position.copy(k.gt.p);k.group.rotation.copy(k.gt.r);k.group.scale.copy(k.gt.s);}
    if(k.rubble)k.rubble.visible=false;
  }
}
function breakIt(b,fx){
  const k=b.brk;k.hp=0;brkVisual(b,true);if(!fx)return;
  const c=V((b.x0+b.x1)/2,Math.min(k.oy1,(k.oy0+k.oy1)/2+0.2),(b.z0+b.z1)/2);
  if(k.kind==='glass'){SFX.glassBreak();for(let i=0;i<2;i++)burst(V(c.x+rand(-1,1),rand(0.6,2.4),c.z),0xbfe3ff,10,4);}
  else if(k.kind==='wall'){SFX.crash();puff(c.x,0.9,c.z,0xd8cbb0,16,1.1,3.2);burst(c,0xb5651d,14,5);ringFx(c.x,0,c.z,2.5,0xd8cbb0,0.5);}
  else if(k.kind==='piano'){SFX.piano();SFX.crash();burst(c,0xffffff,10,4);burst(c,0x111111,10,4);puff(c.x,c.y,c.z,0xd8cbb0,8,0.8,2);}
  else{SFX.thud();burst(c,k.color||0x8a6a4a,14,4);puff(c.x,c.y,c.z,0xd8cbb0,7,0.7,2);}
  G.shake=Math.max(G.shake,0.5);hype=Math.min(1,hype+0.5);
  const msg=k.kind==='wall'?'กำแพงพัง!! 🧱':k.kind==='glass'?'กระจกแตก!! 💥':(k.name||'ของ')+' พัง!';
  if(k.cost){BILL+=k.cost;G.matchBill=(G.matchBill||0)+k.cost;popup(msg+' -'+baht(k.cost),c.clone().add(V(0,1,0)),'crit',1.4);}else popup(msg,c.clone().add(V(0,1,0)),'crit',1.2);
  if(BILL>=300000&&!G.billWarn){G.billWarn=1;banner('😱 ค่าเสียหายทะลุ '+baht(BILL)+' แล้ว! หักเงินเดือนไม่พอแน่',3);}
}
function smashArea(x,z,r,power,y){for(const b of BRK){if(b.brk.broken)continue;if(y!=null&&(b.brk.oy1<y-0.5||b.brk.oy0>y+2.5))continue;const cx=clamp(x,b.x0,b.x1),cz=clamp(z,b.z0,b.z1);if(Math.hypot(cx-x,cz-z)<r)hitBreakable(b,power);}}
function restoreBreakables(){BRK.forEach(b=>{b.brk.hp=b.brk.max;brkVisual(b,false);});BILL=0;G.billWarn=0;}
// ways in and out of the store: real doors + whatever has been smashed open (AI uses these)
const DOORS=[{x:0,z:3.0,nx:0,nz:1,hw:2.0},{x:-8,z:-12.15,nx:0,nz:-1,hw:1.0},{x:-23.45,z:-4,nx:-1,nz:0,hw:1.0}];
function storeExits(){const L=DOORS.slice();for(const b of BRK){const k=b.brk;if(k.broken&&k.exit)L.push({x:(b.x0+b.x1)/2,z:(b.z0+b.z1)/2,nx:k.exit[0],nz:k.exit[1],hw:Math.max(b.x1-b.x0,b.z1-b.z0)/2});}return L;}
function segHitsRect(a,b,R,pad){ // slab test: does segment a→b cross rect R (expanded by pad)?
  const x0=R.x0-pad,x1=R.x1+pad,z0=R.z0-pad,z1=R.z1+pad;let t0=0,t1=1;const dx=b.x-a.x,dz=b.z-a.z;
  for(const[p,d,lo,hi]of[[a.x,dx,x0,x1],[a.z,dz,z0,z1]]){if(Math.abs(d)<1e-6){if(p<lo||p>hi)return false;}else{let u=(lo-p)/d,v=(hi-p)/d;if(u>v){const t=u;u=v;v=t;}t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return false;}}
  return true;
}
const BCORN=[{x:BLOCK.x0-1.7,z:BLOCK.z0-1.7},{x:BLOCK.x1+1.7,z:BLOCK.z0-1.7},{x:BLOCK.x0-1.7,z:BLOCK.z1+1.7},{x:BLOCK.x1+1.7,z:BLOCK.z1+1.7}];
function outdoorWp(a,goal){ // next waypoint to walk around the building block
  if(!segHitsRect(a,goal,BLOCK,0.3))return goal;
  let best=goal,bc=1e9;for(const c of BCORN){if(segHitsRect(a,c,BLOCK,0.25))continue;const cost=Math.hypot(c.x-a.x,c.z-a.z)+Math.hypot(goal.x-c.x,goal.z-c.z)+(segHitsRect(c,goal,BLOCK,0.3)?18:0);if(cost<bc){bc=cost;best=c;}}
  return best;
}
function exitWp(f,goal,inside){ // waypoint for crossing between the store and the outside
  const p={x:f.pos.x,z:f.pos.z};let best=null,bc=1e9;
  for(const e of storeExits()){const ip={x:e.x-e.nx*1.3,z:e.z-e.nz*1.3},op={x:e.x+e.nx*1.7,z:e.z+e.nz*1.7};
    const cost=inside?Math.hypot(ip.x-p.x,ip.z-p.z)+Math.hypot(goal.x-op.x,goal.z-op.z)+(segHitsRect(op,goal,BLOCK,0.3)?12:0)
                     :Math.hypot(op.x-p.x,op.z-p.z)+(segHitsRect(p,op,BLOCK,0.3)?12:0)+Math.hypot(goal.x-ip.x,goal.z-ip.z);
    if(cost<bc){bc=cost;best={e,ip,op};}}
  if(!best)return goal;const{e,ip,op}=best,tx=-e.nz,tz=e.nx,along=(p.x-e.x)*tx+(p.z-e.z)*tz,across=(p.x-e.x)*e.nx+(p.z-e.z)*e.nz;
  const inBand=Math.abs(along)<e.hw-0.25&&across>-2.2&&across<2.4;
  if(inside)return inBand?op:ip;
  return inBand?ip:outdoorWp(p,op);
}

/* ================= TEXTURES ================= */
const woodTex=canvasTex(512,512,(g,w,h)=>{
  for(let i=0;i<8;i++){const y=i*64;for(let j=0;j<5;j++){const off=(i%2)*64;const x=j*128+off;g.fillStyle=`hsl(28,45%,${36+Math.random()*10}%)`;g.fillRect(x-128,y,128,64);}g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,y,w,2);}
  for(let i=0;i<14;i++){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(Math.random()*w,Math.random()*h,2,64);}
});woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;woodTex.repeat.set(7,4);
const tileTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#b9b2a6';g.fillRect(0,0,w,h);for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.fillStyle=`hsl(35,8%,${62+Math.random()*10}%)`;g.fillRect(i*64+2,j*64+2,60,60);}});
tileTex.wrapS=tileTex.wrapT=THREE.RepeatWrapping;tileTex.repeat.set(22,2.2);
const roadTex=canvasTex(1024,256,(g,w,h)=>{g.fillStyle='#3d3f44';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},255,.04)`;g.fillRect(Math.random()*w,Math.random()*h,3,3);}
  g.fillStyle='#e9e2c8';for(let x=0;x<w;x+=110)g.fillRect(x,h*0.47,60,7);g.fillStyle='#f1d34a';g.fillRect(0,4,w,5);g.fillRect(0,h-9,w,5);
  g.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<8;i++)g.fillRect(w/2-90+i*24,20,14,h-40);});
const keysTex=canvasTex(512,48,(g,w,h)=>{g.fillStyle='#f6f3ea';g.fillRect(0,0,w,h);const n=36,kw=w/n;g.fillStyle='#999';for(let i=0;i<=n;i++)g.fillRect(i*kw,0,1.5,h);g.fillStyle='#111';const pat=[1,1,0,1,1,1,0];for(let i=0;i<n;i++){if(pat[i%7])g.fillRect((i+1)*kw-kw*0.3,0,kw*0.6,h*0.6);}});
const bookTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#5a3a24';g.fillRect(0,0,w,h);for(let r=0;r<4;r++){let x=6;while(x<w-10){const bw=8+Math.random()*12,bh=40+Math.random()*16;g.fillStyle=`hsl(${Math.random()*360},50%,${35+Math.random()*25}%)`;g.fillRect(x,r*64+60-bh,bw,bh);x+=bw+1;}g.fillStyle='#3a2414';g.fillRect(0,r*64+58,w,6);}});

/* ================= PROP BUILDERS ================= */
const pianoBlack=M('#0b0b0d',{roughness:.18,metalness:.3});
function upright(x,z,ry,mat){
  const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=ry;scene.add(p);mat=mat||pianoBlack;
  vbox(1.55,1.3,0.55,mat,0,0.75,-0.05,p);vbox(1.55,0.08,0.62,mat,0,1.42,-0.02,p);vbox(1.6,0.12,0.38,mat,0,0.78,0.36,p);
  const k=new THREE.Mesh(new THREE.PlaneGeometry(1.42,0.3),M('#fff',{map:keysTex,roughness:.4}));k.rotation.x=-Math.PI/2;k.position.set(0,0.845,0.38);p.add(k);
  vbox(0.1,0.72,0.42,mat,-0.76,0.36,0.3,p);vbox(0.1,0.72,0.42,mat,0.76,0.36,0.3,p);
  return p;
}
function mkGrand(){
  const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(1.55,0);s.lineTo(1.55,0.5);s.bezierCurveTo(1.55,1.3,0.75,1.2,0.72,2.0);s.quadraticCurveTo(0.7,2.6,0.2,2.6);s.lineTo(0,2.6);s.lineTo(0,0);
  const body=new THREE.ExtrudeGeometry(s,{depth:0.36,bevelEnabled:false});body.rotateX(Math.PI/2);
  const lidG=new THREE.ExtrudeGeometry(s,{depth:0.03,bevelEnabled:false});lidG.rotateX(Math.PI/2);
  const g=new THREE.Group();const inner=new THREE.Group();inner.position.set(-0.78,0,-0.3);g.add(inner);
  const b=new THREE.Mesh(body,pianoBlack);b.position.y=1.0;b.castShadow=true;inner.add(b);
  const hinge=new THREE.Group();hinge.position.set(0,1.03,0);hinge.rotation.z=0.5;inner.add(hinge);g.userData.hinge=hinge;
  const lid=new THREE.Mesh(lidG,pianoBlack);lid.castShadow=true;hinge.add(lid);
  vbox(1.6,0.12,0.3,pianoBlack,0.78,0.8,-0.15,inner);
  const k=new THREE.Mesh(new THREE.PlaneGeometry(1.45,0.24),M('#fff',{map:keysTex,roughness:.4}));k.rotation.x=-Math.PI/2;k.position.set(0.78,0.865,-0.16);inner.add(k);
  for(const[x,z]of[[0.15,0.2],[1.4,0.25],[0.4,2.3]])cyl(0.06,0.05,0.66,pianoBlack,x,0.33,z,inner,8);
  return g;
}
function guitar(color,dark){
  const g=new THREE.Group();const top=M(color,{roughness:.45}),sid=M(dark||'#3a2010',{roughness:.5});
  const b1=cyl(0.31,0.31,0.1,top,0,0,0,g,20);b1.rotation.x=Math.PI/2;
  const b2=cyl(0.24,0.24,0.1,top,0,0.38,0,g,20);b2.rotation.x=Math.PI/2;
  const hole=new THREE.Mesh(new THREE.CircleGeometry(0.08,16),M('#140a05'));hole.position.set(0,0.2,0.052);g.add(hole);
  vbox(0.09,0.85,0.05,sid,0,0.95,0,g);vbox(0.14,0.22,0.05,sid,0,1.45,0,g);vbox(0.2,0.04,0.03,M('#1a1008'),0,-0.12,0.06,g);
  return g;
}
const legGeo=new THREE.BoxGeometry(0.17,0.75,0.2);
function makePerson(shirt,skin,hair,s=1){
  const g=new THREE.Group();g.scale.setScalar(s);
  const legs=[];for(const x of[-0.13,0.13]){const l=new THREE.Group();l.position.set(x,0.75,0);g.add(l);const m=new THREE.Mesh(legGeo,M('#2b2b33'));m.position.y=-0.37;m.castShadow=true;l.add(m);legs.push(l);}
  cyl(0.26,0.28,0.8,M(shirt),0,1.15,0,g,10);
  sph(0.24,M(skin||pick(['#f1c6a0','#d9a27a','#e9b98f','#c98c63'])),0,1.8,0,g);
  const hr=new THREE.Mesh(new THREE.SphereGeometry(0.25,12,8,0,Math.PI*2,0,Math.PI/2),M(hair||'#1a1a1a'));hr.position.y=1.82;g.add(hr);
  const arms=[];for(const x of[-0.33,0.33]){const a=new THREE.Group();a.position.set(x,1.45,0);g.add(a);cyl(0.07,0.07,0.6,M(skin||'#e3b48f'),0,-0.3,0,a,6);arms.push(a);}
  return{g,legs,arms};
}
function animPerson(p,t,walk,cheer){const s=Math.sin(t*10)*0.6*walk;p.legs[0].rotation.x=s;p.legs[1].rotation.x=-s;p.arms.forEach((a,i)=>a.rotation.z=(i?-1:1)*(0.15+cheer*2.4+Math.sin(t*10+i)*0.3*cheer));}

/* ================= BUILD STORE ================= */
scene.add(new THREE.HemisphereLight(0xfff3e0,0x5a4a40,0.62));
const sun=new THREE.DirectionalLight(0xfff0dd,0.85);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});sun.shadow.bias=-0.0005;
scene.add(sun);scene.add(sun.target);
const hemiRef=scene.children.find(c=>c.isHemisphereLight);

(function buildGround(){
  const g=new THREE.Mesh(new THREE.PlaneGeometry(160,110),M('#8e8a82',{roughness:.95}));g.rotation.x=-Math.PI/2;g.position.set(0,-0.01,-3);g.receiveShadow=true;scene.add(g);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(34.6,15.3),M('#fff',{map:woodTex,roughness:.45}));fl.rotation.x=-Math.PI/2;fl.position.set(-6.15,0.003,-4.5);fl.receiveShadow=true;scene.add(fl);
  const rugTex=canvasTex(1024,700,(g2,w,h)=>{g2.fillStyle='#7b1d27';g2.fillRect(0,0,w,h);g2.strokeStyle='#e9c46a';g2.lineWidth=14;g2.strokeRect(30,30,w-60,h-60);g2.lineWidth=4;g2.strokeRect(56,56,w-112,h-112);g2.fillStyle='rgba(233,196,106,.16)';g2.beginPath();g2.ellipse(w/2,h/2,300,210,0,0,Math.PI*2);g2.fill();g2.textAlign='center';g2.textBaseline='middle';g2.fillStyle='#f4dfa0';g2.font='800 110px Kanit, sans-serif';g2.fillText('ศึกออฟฟิศ',w/2,h/2-30);g2.font='600 44px Kanit, sans-serif';g2.fillText('PETERSON SUKHUMVIT26',w/2,h/2+70);});
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(7.6,5.2),M('#fff',{map:rugTex,roughness:.95}));rug.rotation.x=-Math.PI/2;rug.position.set(0,0.008,-0.9);rug.receiveShadow=true;scene.add(rug);
})();

(function buildStore(){
  const wallMat=M('#e8dcc8',{roughness:.9}),sideMat=M('#ddd0ba',{roughness:.9});
  // back wall: breakable panels (except behind the sign / slatwall) + a back door at x -9..-7
  const backM=[],wainM=M('#5c3a24');
  const panel=(x0,x1,z0,z1,side,brk,exit)=>{const wm=side?sideMat:wallMat;const w=sbox(x0,x1,0,3.4,z0,z1,wm.clone(),'wall');const ms=[w];
    if(!side)ms.push(vbox(x1-x0,0.9,0.1,wainM.clone(),(x0+x1)/2,0.45,z1+0.05));
    const rub=new THREE.Group();for(let i=0;i<5;i++){const r=vbox(rand(.3,.7),rand(.15,.35),rand(.3,.6),M(pick(['#d8ccb4','#b9ab92','#a0522d'])),(x0+x1)/2+rand(-.8,.8)*(x1-x0)/2,0.12,(z0+z1)/2+rand(-.8,.8)*(z1-z0)/2,rub);r.rotation.y=rand(0,3);}
    rub.visible=false;scene.add(rub);
    if(brk){const b=blocks[blocks.length-1];breakable(b,{kind:'wall',hp:3,meshes:ms,rubble:rub,exit,cost:25000});}
    return ms;};
  for(let x=-23.6;x<11.29;){const x1=Math.min(11.3,x+3.2);const gapA=-9,gapB=-7;
    if(x<gapB&&x1>gapA){if(x<gapA)backM.push(...panel(x,gapA,-12.3,-12.0,false,!(x<-9.4),[0,-1]));if(x1>gapB)backM.push(...panel(gapB,x1,-12.3,-12.0,false,true,[0,-1]));}
    else backM.push(...panel(x,x1,-12.3,-12.0,false,!(x1>-14.4&&x<-9.4)&&!(x1>-4.8&&x<1.8),[0,-1]));x=x1;}
  backM.push(sbox(-9,-7,2.4,3.4,-12.3,-12.0,wallMat,'wall'));
  fadeGroup(backM,(c,f)=>c.z<-12.0&&(!f||f.z>-12.3));
  // left wall of the new drums & amps wing, side door at z -5..-3
  const leftM=[];for(const[z0,z1]of[[-12.3,-9.2],[-9.2,-5],[-3,0],[0,3.0]])leftM.push(...panel(-23.6,-23.3,z0,z1,true,true,[-1,0]));
  leftM.push(sbox(-23.6,-23.3,2.4,3.4,-5,-3,sideMat,'wall'));
  fadeGroup(leftM,(c,f)=>c.x<-23.3&&(!f||f.x>-23.6));
  // right wall has a doorway at mezzanine level (z -11.6..-8.6) leading to the 2nd-floor violin & book shop
  const rw1=sbox(11.0,11.3,0,3.4,-12.3,-11.6,sideMat,'wall'),rw2=sbox(11.0,11.3,0,2.4,-11.6,-8.6,sideMat,'wall'),rw3=sbox(11.0,11.3,0,3.4,-8.6,3.0,sideMat,'wall');fadeGroup([rw1,rw2,rw3],c=>c.x>11&&c.z<3);
  // slatwall + guitars
  const slat=vbox(6.4,1.9,0.1,M('#4a2f22',{roughness:.8}),-1.5,2.5,-11.93);
  const gcols=[['#d9a35a','#5a3010'],['#e8c88e','#4a2810'],['#b8732e','#2a1408'],['#efd29a','#6a3a18'],['#a9622a','#2a1408'],['#d4a060','#3a2010'],['#c58a4a','#3a2010']];
  for(let i=0;i<7;i++){const gg=guitar(...gcols[i]);gg.scale.setScalar(0.78);gg.position.set(-4.3+i*0.93,2.1,-11.85);scene.add(gg);}
  // sign inside
  const signTex=canvasTex(1024,200,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1d1d24');gr.addColorStop(1,'#0e0e12');g.fillStyle=gr;g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9c46a';g.font='800 92px Kanit, serif';g.fillText('PETERSON',w/2,h/2-18);g.font='600 36px Kanit, sans-serif';g.fillStyle='#fff';g.fillText('PIANOS · GUITARS · SUKHUMVIT 26',w/2,h/2+58);});
  const s1=new THREE.Mesh(new THREE.PlaneGeometry(4.6,0.9),new THREE.MeshBasicMaterial({map:signTex}));s1.position.set(-11.9,2.75,-11.94);scene.add(s1);
  fadeGroup([slat,s1],(c,f)=>c.z<-12.0&&(!f||f.z>-12.3));
  // uprights + benches (back wall)
  [[-3.6,pianoBlack],[-1.5,M('#4a2414',{roughness:.3,metalness:.15})],[0.6,M('#f2f0ec',{roughness:.25})]].forEach(([x,m])=>{
    const up=upright(x,-11.6,0,m);breakable(solid(x-0.8,x+0.8,-12,-11.05,0,1.45,'piano'),{kind:'piano',hp:2,group:up,name:'เปียโนอัพไรท์',cost:89000,low:1,tilt:[0.62,0.22]});
    sbox(x-0.4,x+0.4,0,0.52,-10.65,-10.3,m,'bench');
  });
  // podium + grand
  sbox(-14.6,-9.6,0,0.45,-11.6,-7.4,M('#5b1620',{roughness:.9}),'stage');
  vbox(5.04,0.04,4.24,M('#c9a24a',{metalness:.5,roughness:.3}),-12.1,0.43,-9.5);
  const gp=mkGrand();gp.position.set(-12.1,0.45,-9.2);gp.rotation.y=Math.PI+0.25;scene.add(gp);
  breakable(solid(-13.2,-11.0,-11.1,-8.1,0.45,1.5,'grand'),{kind:'piano',hp:3,group:gp,name:'แกรนด์เปียโน',cost:450000,low:1,tilt:[0.3,0.45]});
  sbox(-12.6,-11.6,0.45,0.95,-7.95,-7.6,pianoBlack,'bench');
  // bookshelf (left wall) – TeeMee's book corner
  const sh=sbox(-15.0,-14.35,0,2.2,-2.8,2.4,M('#5a3a24'),'shelf');const shB=blocks[blocks.length-1];
  const bk=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.2),M('#fff',{map:bookTex}));bk.rotation.y=Math.PI/2;bk.position.set(-14.34,1.1,-0.2);scene.add(bk);
  const bk2=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.2),M('#fff',{map:bookTex}));bk2.rotation.y=-Math.PI/2;bk2.position.set(-15.01,1.1,-0.2);scene.add(bk2);
  const bsTex=canvasTex(256,64,(g,w,h)=>{g.fillStyle='#ffd23d';g.fillRect(0,0,w,h);g.fillStyle='#222';g.font='800 34px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('แผนกหนังสือ',w/2,h/2);});
  const bs=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.4),new THREE.MeshBasicMaterial({map:bsTex}));bs.rotation.y=Math.PI/2;bs.position.set(-14.33,2.45,-0.2);scene.add(bs);
  breakable(shB,{kind:'shelf',hp:2,meshes:[sh,bk,bk2,bs],name:'ชั้นหนังสือ',cost:15000,color:0xc0392b});
  // guitar stands (center-left)
  for(const[x,z,r]of[[-8.6,0.2,0.4],[-9.4,1.2,0.6],[-7.8,1.4,0.2]]){const gg=guitar('#d9a35a');gg.position.set(x,0.42,z);gg.rotation.set(-0.25,r,0);scene.add(gg);vbox(0.32,0.06,0.32,M('#111'),x,0.03,z+0.1);breakable(solid(x-0.28,x+0.28,z-0.25,z+0.3,0,1.2,'guitar'),{kind:'prop',hp:1,group:gg,name:'กีตาร์โชว์',cost:12000,tilt:[1.2,0.4],color:0xd9a35a});}
  // digital pianos row near front-left window
  for(const x of[-13.2,-11.2]){const dp=upright(x,1.9,Math.PI,M('#2b2420',{roughness:.35}));dp.scale.set(0.95,0.85,0.7);breakable(solid(x-0.78,x+0.78,1.55,2.45,0,1.25,'piano'),{kind:'piano',hp:2,group:dp,name:'เปียโนไฟฟ้า',cost:35000,low:1,tilt:[-0.6,-0.25]});}
  // mezzanine (boss office) + stairs
  const mz=sbox(7,11,0,2.4,-12,-8.2,M('#cfc3ad',{roughness:.85}),'mezz');
  const offTex=canvasTex(512,300,(g,w,h)=>{g.fillStyle='#cfc3ad';g.fillRect(0,0,w,h);g.fillStyle='#6b5a46';g.fillRect(0,h-30,w,30);g.fillStyle='#8fb8d8';g.fillRect(40,40,190,150);g.fillRect(280,40,190,150);g.strokeStyle='#4a3a2a';g.lineWidth=8;g.strokeRect(40,40,190,150);g.strokeRect(280,40,190,150);g.fillStyle='#222';g.font='800 40px Kanit, sans-serif';g.textAlign='center';g.fillText('คลังสินค้า',w/2,250);});
  const mzf=new THREE.Mesh(new THREE.PlaneGeometry(4,2.4),M('#fff',{map:offTex}));mzf.position.set(9,1.2,-8.19);scene.add(mzf);
  vbox(4.02,0.06,3.82,M('#8a6d4a'),9,2.43,-10.1);
  // wide staircase (2.2 m) up to the mezzanine
  for(let i=0;i<8;i++){const x0=3+0.5*i;solid(x0,7,-10.6,-8.4,0,0.3*(i+1),'stairs');vbox(0.5,0.3*(i+1),2.2,M(i%2?'#7a5a3a':'#86643f'),x0+0.25,0.15*(i+1),-9.5);}
  for(const z of[-10.65,-8.35])vbox(4.4,0.08,0.08,M('#2b2b2b',{metalness:.5}),5,2.15,z).rotation.z=Math.atan2(2.4,4);
  // boss desk upstairs
  sbox(7.3,9.1,2.4,3.2,-11.8,-10.9,M('#3a2418',{roughness:.4}),'desk');
  vbox(0.7,0.45,0.05,M('#111'),8.2,3.5,-11.45);
  const bossTex=canvasTex(320,90,(g,w,h)=>{g.fillStyle='#c0392b';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 46px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ห้องหัวหน้า',w/2,h/2);});
  const bt=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.5),new THREE.MeshBasicMaterial({map:bossTex}));bt.position.set(8.2,3.05,-11.93);scene.add(bt);
  // chair
  vbox(0.6,0.1,0.6,M('#111'),8.2,2.85,-11.95);
  // counter + computer + parcels
  sbox(7.4,8.4,0,1.1,-2.6,1.6,M('#f3efe8',{roughness:.4}),'counter');
  vbox(1.15,0.06,4.35,M('#3a2418',{roughness:.35}),7.9,1.13,-0.5);
  vbox(0.06,0.5,0.75,M('#111'),8.05,1.55,-1.2);
  const scr=canvasTex(300,200,(c,w,h)=>{c.fillStyle='#0f2a44';c.fillRect(0,0,w,h);c.fillStyle='#ee4d2d';c.fillRect(0,0,w,40);c.fillStyle='#fff';c.font='800 26px Kanit, sans-serif';c.fillText('แชทร้าน',12,29);c.fillStyle='#ff2d55';c.beginPath();c.arc(w/2,h/2+20,48,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.textAlign='center';c.font='800 42px Kanit, sans-serif';c.fillText('99+',w/2,h/2+35);});
  const sc=new THREE.Mesh(new THREE.PlaneGeometry(0.68,0.44),new THREE.MeshBasicMaterial({map:scr}));sc.position.set(8.015,1.55,-1.2);sc.rotation.y=-Math.PI/2;scene.add(sc);
  const parcel=M('#c89b62',{roughness:.9});
  sbox(9.0,10.4,0,0.6,1.0,2.6,parcel,'box');sbox(9.3,10.1,0.6,1.1,1.3,2.3,parcel,'box');
  // plant
  const pl=new THREE.Group();pl.position.set(-14.2,0,-11.2);scene.add(pl);cyl(0.3,0.24,0.55,M('#e0d6c8'),0,0.27,0,pl,16);for(let i=0;i<9;i++){const l=sph(0.28,M('#2f7d3a'),rand(-.3,.3),0.8+rand(0,.9),rand(-.3,.3),pl,8,6);l.scale.set(1,1.5,0.6);}
  solid(-14.55,-13.85,-11.55,-10.85,0,1.6,'wall');
  // FRONT: glass + door
  const glass=new THREE.MeshStandardMaterial({color:0xbfe3ff,transparent:true,opacity:0.18,roughness:0.05,metalness:0.2,depthWrite:false});
  for(const[a,b,n]of[[-23.3,-15.3,3],[-15.3,-2.3,4],[2.3,11.3,3]]){
    vbox(b-a,0.3,0.25,M('#2b2b2b'),(a+b)/2,0.15,2.98);
    for(let i=0;i<n;i++){const x0=a+(b-a)*i/n,x1=x0+(b-a)/n;
      const bl=solid(x0,x1,2.85,3.1,0,3.4,'glass');const p=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0-0.05,2.4),glass.clone());p.position.set((x0+x1)/2,1.5,2.98);scene.add(p);
      breakable(bl,{kind:'glass',hp:1,meshes:[p],exit:[0,1],cost:8000});}
    for(let x=a;x<=b+0.01;x+=(b-a)/n)vbox(0.08,2.7,0.12,M('#2b2b2b'),x,1.35,2.98);
  }
  // door frames & open sliding panels
  vbox(0.12,2.7,0.3,M('#2b2b2b'),-2.3,1.35,2.98);vbox(0.12,2.7,0.3,M('#2b2b2b'),2.3,1.35,2.98);
  for(const s of[-1,1]){const dp=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.4),glass);dp.position.set(s*3.0,1.5,3.12);scene.add(dp);}
  const bandTex=canvasTex(2048,128,(g,w,h)=>{g.fillStyle='#141418';g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9c46a';g.font='800 92px Kanit, serif';g.fillText('PETERSON',w/2,h/2+4);g.font='600 40px Kanit, sans-serif';g.fillStyle='#fff';g.fillText('PIANO & GUITAR GALLERY',w*0.18,h/2);g.fillText('SUKHUMVIT 26',w*0.82,h/2);});
  const band=vbox(26.6,0.7,0.3,M('#141418'),-2,3.05,2.98);
  const bandF=new THREE.Mesh(new THREE.PlaneGeometry(26.6,0.7),new THREE.MeshBasicMaterial({map:bandTex}));bandF.position.set(-2,3.05,3.14);scene.add(bandF);
  const wTex=canvasTex(1024,128,(g,w,h)=>{g.fillStyle='#1b2a3a';g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#6fd3ff';g.font='800 64px Kanit, sans-serif';g.fillText('DRUMS & AMPS · กลอง & แอมป์',w/2,h/2+3);});
  const band2=vbox(8,0.7,0.3,M('#1b2a3a'),-19.3,3.05,2.98);const band2F=new THREE.Mesh(new THREE.PlaneGeometry(8,0.7),new THREE.MeshBasicMaterial({map:wTex}));band2F.position.set(-19.3,3.05,3.14);scene.add(band2F);
  fadeGroup([band,bandF,band2,band2F],(c,f)=>c.z<3&&f&&f.z>3);
  // door mat
  const mat=new THREE.Mesh(new THREE.PlaneGeometry(3,1.2),M('#3a3a3a',{roughness:1}));mat.rotation.x=-Math.PI/2;mat.position.set(0,0.01,2.2);scene.add(mat);
  // ---- new wing (x -23.3..-15.3): drums & amps ----
  const drumKit=(x,z,col)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const sh=M(col,{roughness:.3,metalness:.2}),hd=M('#f4f1ea',{roughness:.6}),ch=M('#c9c9c9',{metalness:.8,roughness:.25});
    const kick=cyl(0.42,0.42,0.5,sh,0,0.42,0,g,18);kick.rotation.x=Math.PI/2;cyl(0.4,0.4,0.02,hd,0,0.42,0.26,g,18).rotation.x=Math.PI/2;
    for(const[dx,dz,r,h]of[[-0.55,0.35,0.22,0.6],[0.55,0.35,0.24,0.6],[-0.25,0.05,0.16,0.95],[0.25,0.05,0.16,0.95]]){cyl(r,r,0.25,sh,dx,h,dz,g,14);cyl(r,r,0.02,hd,dx,h+0.13,dz,g,14);cyl(0.015,0.015,h-0.1,ch,dx,(h-0.1)/2,dz,g,6);}
    for(const[dx,dz,y]of[[-0.85,-0.1,1.3],[0.85,-0.2,1.45]]){cyl(0.015,0.015,y,ch,dx,y/2,dz,g,6);cyl(0.3,0.02,0.02,M('#d4a017',{metalness:.9,roughness:.2}),dx,y,dz,g,20);}
    vbox(0.4,0.08,0.4,M('#222'),0,0.5,-0.7,g);return g;};
  const dk1=drumKit(-20.6,-8.6,'#b0172a'),dk2=drumKit(-17.8,-10.4,'#1f5fbf');dk2.rotation.y=0.5;
  breakable(solid(-21.6,-19.6,-9.2,-8.0,0,1.1,'drums'),{kind:'prop',hp:2,group:dk1,name:'กลองชุด',cost:65000,tilt:[0.5,-0.6],color:0xb0172a});
  breakable(solid(-18.7,-16.9,-11.0,-9.8,0,1.1,'drums'),{kind:'prop',hp:2,group:dk2,name:'กลองชุด',cost:65000,tilt:[-0.4,0.5],color:0x1f5fbf});
  const amp=(x,z,ry,h)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);const blk=M('#141414',{roughness:.7}),gr=M('#2a2a2a',{roughness:1});
    for(let i=0;i<h;i++){vbox(1.0,0.75,0.55,blk,0,0.38+i*0.78,0,g);vbox(0.86,0.6,0.02,gr,0,0.38+i*0.78,0.28,g);}vbox(1.0,0.22,0.5,M('#222'),0,0.11+h*0.78,0,g);
    const lt=canvasTex(128,32,(c,w,hh)=>{c.fillStyle='#111';c.fillRect(0,0,w,hh);c.fillStyle='#e9c46a';c.font='800 22px Kanit, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('BOOM',w/2,hh/2);});
    const l=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.12),new THREE.MeshBasicMaterial({map:lt}));l.position.set(0,0.11+h*0.78,0.26);g.add(l);return g;};
  for(const[x,z,ry,h]of[[-22.6,-1.2,Math.PI/2,2],[-22.6,0.4,Math.PI/2,3],[-16.3,-6.6,-Math.PI/2,2]]){const g=amp(x,z,ry,h);
    breakable(solid(x-0.3,x+0.3,z-0.52,z+0.52,0,0.22+h*0.78,'amp'),{kind:'prop',hp:2,group:g,name:'ตู้แอมป์',cost:28000,tilt:[0,ry>0?-1.1:1.1],color:0x222222});}
  // keyboard stand + mic stand + rug
  const kb=new THREE.Group();kb.position.set(-18.6,0,-1.6);scene.add(kb);vbox(1.3,0.12,0.4,M('#1b1b1b'),0,0.95,0,kb);const kk=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.25),M('#fff',{map:keysTex}));kk.rotation.x=-Math.PI/2;kk.position.set(0,1.015,0.03);kb.add(kk);
  for(const s of[-1,1]){const l=vbox(0.04,1.0,0.04,M('#888',{metalness:.7}),s*0.3,0.47,0,kb);l.rotation.z=s*0.35;}
  breakable(solid(-19.3,-17.9,-1.85,-1.35,0,1.05,'keyboard'),{kind:'prop',hp:1,group:kb,name:'คีย์บอร์ด',cost:22000,tilt:[0.2,1.2],color:0x1b1b1b});
  const wr=new THREE.Mesh(new THREE.PlaneGeometry(5,3.6),M('#3b4a5a',{roughness:1}));wr.rotation.x=-Math.PI/2;wr.position.set(-19.4,0.006,-9.4);wr.receiveShadow=true;scene.add(wr);
  const wsTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#6fd3ff';g.fillRect(0,0,w,h);g.fillStyle='#0d2233';g.font='800 56px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ห้องลองกลอง',w/2,h/2);});
  const wsg=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.6),new THREE.MeshBasicMaterial({map:wsTex}));wsg.position.set(-19.4,2.7,-11.94);scene.add(wsg);fadeGroup([wsg],(c,f)=>c.z<-12.0&&(!f||f.z>-12.3));
})();

/* ================= BUILD STREET ================= */
(function buildStreet(){
  const tile=M('#fff',{map:tileTex,roughness:.9});
  // sidewalks: around the block (inner ring) and along the outer buildings
  const B=BLOCK,yl=M('#c9b23c');
  sbox(B.x0-2,B.x1+2,0,0.15,3.1,7.5,tile,'curb');                       // front
  sbox(B.x0-2,B.x0,0,0.15,B.z0-2,3.1,tile,'curb');sbox(B.x1,B.x1+2,0,0.15,B.z0-2,3.1,tile,'curb');sbox(B.x0,B.x1,0,0.15,B.z0-2,B.z0,tile,'curb');
  const OX0=-34.6,OX1=33.3,OZ0=-23.3;
  sbox(OX0,OX1,0,0.15,15,17,tile,'curb');sbox(OX0,OX0+2,0,0.15,OZ0,15,tile,'curb');sbox(OX1-2,OX1,0,0.15,OZ0,15,tile,'curb');sbox(OX0+2,OX1-2,0,0.15,OZ0,OZ0+2,tile,'curb');
  // roads (7 m) looping around the block
  const roadM=M('#fff',{map:roadTex,roughness:.95});
  const road=(cx,cz,len,alongZ)=>{const r=new THREE.Mesh(new THREE.PlaneGeometry(len,7.2),roadM);r.rotation.set(-Math.PI/2,0,alongZ?Math.PI/2:0);r.position.set(cx,0.004,cz);r.receiveShadow=true;scene.add(r);};
  road((OX0+2+OX1-2)/2,11.25,OX1-OX0-4,false);road((OX0+2+B.x0-2)/2,(OZ0+2+7.5)/2,7.5-OZ0-2,true);road((B.x1+2+OX1-2)/2,(OZ0+2+7.5)/2,7.5-OZ0-2,true);road((B.x0-2+B.x1+2)/2,(OZ0+2+B.z0-2)/2,B.x1-B.x0+4,false);
  vbox(B.x1-B.x0+4,0.16,0.18,yl,(B.x0+B.x1)/2,0.08,7.5);vbox(OX1-OX0-4,0.16,0.18,yl,(OX0+OX1)/2,0.08,15);
  vbox(B.x1-B.x0+4,0.16,0.18,yl,(B.x0+B.x1)/2,0.08,B.z0-2);vbox(0.18,0.16,7.5-B.z0+2,yl,B.x0-2,0.08,(B.z0-2+7.5)/2);vbox(0.18,0.16,7.5-B.z0+2,yl,B.x1+2,0.08,(B.z0-2+7.5)/2);
  // neighbour shopfronts with shutters
  const shutTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#9aa0a6';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=10){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,y,w,3);}g.fillStyle='rgba(40,120,200,.8)';g.font='800 40px Kanit, sans-serif';g.fillText('ให้เช่า',60,140);});
  // outer buildings around the loop (left, right, back) — fade when the camera is behind them
  const outerSide=(sx)=>{const x0=sx<0?OX0-0.6:OX1,x1=sx<0?OX0:OX1+0.6,ms=[sbox(x0,x1,0,4.5,OZ0-0.6,17,M('#b7aea0'),'wall')];
    const names=sx<0?[['ร้านซักรีด','#2c6fb3'],['ร้านทอง','#c9a227'],['อู่ซ่อมรถ','#7f8c8d'],['ร้านขายส่ง','#16a085']]:[['ร้านก๋วยเตี๋ยว','#d35400'],['หอพัก','#8e44ad'],['ร้านถ่ายเอกสาร','#2980b9'],['ร้านเหล้าปั่น','#c0392b']];
    names.forEach(([n,c],i)=>{const z0=OZ0+i*(17-OZ0)/4,z1=z0+(17-OZ0)/4,cz=(z0+z1)/2,fx=sx<0?x1:x0;
      ms.push(vbox(1.6,8+i%2*2,z1-z0-0.1,M(['#e3d5bb','#d4dbe0','#e9dcc0','#cfd8c4'][i]),fx+sx*0.8,4+(i%2),cz));
      const st=canvasTex(512,128,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 56px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,w/2,h/2);});
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(z1-z0-1.2,0.9),new THREE.MeshBasicMaterial({map:st}));sg.position.set(fx-sx*0.02,3.3,cz);sg.rotation.y=sx<0?Math.PI/2:-Math.PI/2;scene.add(sg);ms.push(sg);
      ms.push(vbox(0.05,2.6,z1-z0-1.6,M('#5f6b73',{roughness:.3}),fx-sx*0.02,1.45,cz));});
    fadeGroup(ms,c=>sx<0?c.x<OX0:c.x>OX1);};
  outerSide(-1);outerSide(1);
  (function(){const ms=[sbox(OX0-0.6,OX1+0.6,0,4.5,OZ0-0.6,OZ0,M('#b7aea0'),'wall')];
    [['โกดังสินค้า','#7a4a2a',10],['คอนโดใหม่','#2c3e50',16],['ที่จอดรถ','#34495e',7],['ออฟฟิศให้เช่า','#16a085',12],['โรงเรียนดนตรี','#8e44ad',9],['ตลาดนัด','#d35400',6]].forEach(([n,c,h],i)=>{
      const x0=OX0+i*(OX1-OX0)/6,x1=x0+(OX1-OX0)/6,cx=(x0+x1)/2;ms.push(vbox(x1-x0-0.1,h,1.6,M(['#e8d9b5','#cfd8c4','#bfc5c9','#e3cfc0','#d9c6a3','#e9dcc0'][i]),cx,h/2,OZ0-1.4));
      const st=canvasTex(512,128,(g,w,hh)=>{g.fillStyle=c;g.fillRect(0,0,w,hh);g.fillStyle='#fff';g.font='800 58px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,w/2,hh/2);});
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0-1.2,0.95),new THREE.MeshBasicMaterial({map:st}));sg.position.set(cx,3.3,OZ0+0.02);scene.add(sg);ms.push(sg);
      for(let k=0;k<Math.floor(h/3);k++)ms.push(vbox(1.4,1.1,0.05,M('#6f8fa8',{roughness:.2}),cx+(k%2?1.6:-1.6),4.6+k*1.6,OZ0+0.03));});
    fadeGroup(ms,c=>c.z<OZ0);})();
  // back of the store: air-con units, bins, a back-door sign
  for(const x of[-17,2.5,6.2]){sbox(x-0.5,x+0.5,0.15,0.95,-13.3,-12.35,M('#d9dde0',{roughness:.5}),'ac');const fan=cyl(0.3,0.3,0.03,M('#555'),x,0.55,-13.31,null,16);fan.rotation.x=Math.PI/2;}
  for(const x of[-12.5,-11.6]){const b=cyl(0.38,0.34,1.0,M(x<-12?'#2e7d32':'#1565c0',{roughness:.6}),x,0.65,-13.6,null,14);solid(x-0.38,x+0.38,-13.98,-13.22,0.15,1.15,'bin');}
  const bdTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#ffd23d';g.fillRect(0,0,w,h);g.fillStyle='#2a1600';g.font='800 50px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ประตูหลังร้าน',w/2,h/2);});
  const bd=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.48),new THREE.MeshBasicMaterial({map:bdTex,side:THREE.DoubleSide}));bd.position.set(-8,2.75,-12.33);bd.rotation.y=Math.PI;scene.add(bd);
  const sdTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#6fd3ff';g.fillRect(0,0,w,h);g.fillStyle='#0d2233';g.font='800 50px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ประตูข้าง',w/2,h/2);});
  const sd=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.48),new THREE.MeshBasicMaterial({map:sdTex,side:THREE.DoubleSide}));sd.position.set(-23.63,2.75,-4);sd.rotation.y=-Math.PI/2;scene.add(sd);
  // parked scooters on the left road, a bus stop on the right sidewalk
  for(const z of[-8,-6.6]){const b=mkBike(pick(['#e67e22','#7f8c8d','#c0392b']),false);b.g.position.set(-26.4,0,z);scene.add(b.g);solid(-26.65,-26.15,z-0.75,z+0.75,0,1.0,'bike');}
  sbox(22.6,23.0,0.15,2.6,-6.5,-6.1,M('#7f8c8d'),'pole');vbox(0.9,0.08,3.2,M('#2c6fb3'),23.0,2.65,-5.0);sbox(22.5,23.2,0.15,0.6,-5.8,-4.2,M('#95a5a6'),'bench');
  // far shophouses
  const shops=[['ร้านกาแฟ','#7a4a2a'],['ข้าวมันไก่','#c0392b'],['ซ่อมมือถือ','#2c6fb3'],['ร้านตัดผม','#8e44ad'],['ร้านขายยา','#16a085'],['มินิมาร์ท','#e67e22']];
  const far=[];
  shops.forEach(([n,c],i)=>{
    const x0=OX0+i*(OX1-OX0)/6,x1=x0+(OX1-OX0)/6;
    const st=canvasTex(512,128,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 60px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,w/2,h/2);});
    far.push(vbox(x1-x0-0.1,9,1.6,M(['#e8d9b5','#d9c6a3','#cfd8c4','#e3cfc0','#d4dbe0','#e9dcc0'][i]),(x0+x1)/2,4.5,18));
    const sg=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0-1,1.0),new THREE.MeshBasicMaterial({map:st}));sg.position.set((x0+x1)/2,3.3,17.18);sg.rotation.y=Math.PI;scene.add(sg);far.push(sg);
    const sh=vbox(x1-x0-1.4,2.6,0.05,M('#5f6b73',{roughness:.3}),(x0+x1)/2,1.45,17.18);far.push(sh);
    for(let k=0;k<2;k++)far.push(vbox(1.6,1.3,0.05,M('#6f8fa8',{roughness:.2}),(x0+x1)/2+(k?1.5:-1.5),6,17.18));
  });
  solid(OX0,OX1,17.1,19,0,10,'wall');
  fadeGroup(far,c=>c.z>16.5);
  // electric poles & cables
  const poleX=[-25.2,-17,-5,9,19,23.9];const cableMat=new THREE.LineBasicMaterial({color:0x111111});
  poleX.forEach(x=>{cyl(0.16,0.2,8,M('#9a9a9a'),x,4,7.2);solid(x-0.2,x+0.2,7.0,7.4,0,8,'pole');for(let k=0;k<3;k++)vbox(1.4,0.08,0.08,M('#777'),x,6.6+k*0.5,7.2);vbox(0.5,0.6,0.4,M('#6a6a6a'),x+0.3,5.2,7.2);});
  for(let i=0;i<poleX.length-1;i++)for(let k=0;k<7;k++){
    const a=poleX[i],b=poleX[i+1],y=6.4+k*0.22+rand(-.1,.1),sag=0.6+rand(0,.8),dz=rand(-.4,.4);const pts=[];
    for(let j=0;j<=16;j++){const t=j/16;pts.push(V(lerp(a,b,t),y-Math.sin(t*Math.PI)*sag,7.2+dz*Math.sin(t*Math.PI)));}
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),cableMat));
  }
  // motorbike taxi stand
  const winTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#f39c12';g.fillRect(0,0,w,h);g.fillStyle='#1a1a1a';g.font='800 64px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('วินมอเตอร์ไซค์',w/2,h/2);});
  for(const x of[-7.6,-3.4])cyl(0.05,0.05,2.6,M('#555'),x,1.45,6.9,null,6);
  vbox(4.6,0.08,1.6,M('#2c3e50'),-5.5,2.75,6.3);
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(2.8,0.7),new THREE.MeshBasicMaterial({map:winTex}));ws.position.set(-5.5,2.4,7.02);scene.add(ws);
  sbox(-7.3,-5.7,0.15,0.6,6.45,6.85,M('#7f8c8d'),'bench');
  for(const x of[-4.9,-3.9]){const b=mkBike(pick(['#c0392b','#2980b9','#16a085']),false);b.g.position.set(x,0.15,5.6);b.g.rotation.y=Math.PI/2;scene.add(b.g);solid(x-0.25,x+0.25,4.9,6.3,0.15,1.0,'bike');}
  // food cart (ส้มตำ)
  const cartTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#fdf2d0';g.fillRect(0,0,w,h);g.fillStyle='#d35400';g.font='800 70px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ส้มตำ ไก่ย่าง',w/2,h/2);});
  sbox(8.5,10.5,0.15,1.05,5.0,6.2,M('#fff',{map:cartTex}),'cart');
  vbox(2.1,0.05,1.3,M('#bdc3c7',{metalness:.6,roughness:.3}),9.5,1.08,5.6);
  for(const x of[8.7,10.3])cyl(0.25,0.25,0.12,M('#333'),x,0.27,6.25).rotation.x=Math.PI/2;
  cyl(0.03,0.03,1.6,M('#777'),9.5,1.9,5.6,null,6);
  const um=new THREE.Mesh(new THREE.ConeGeometry(1.6,0.6,10,1,true),M('#e74c3c',{side:THREE.DoubleSide}));um.position.set(9.5,2.9,5.6);um.castShadow=true;scene.add(um);
  for(const[x,z]of[[8,4.4],[11,4.5],[11.2,6.6]]){cyl(0.18,0.2,0.4,M(pick(['#e74c3c','#3498db','#2ecc71'])),x,0.35,z,null,10);}
  // planters + trees
  for(const x of[-14,14]){sbox(x-0.6,x+0.6,0.15,0.75,4.0,5.2,M('#8d8d8d'),'planter');cyl(0.12,0.16,2.2,M('#6b4a2a'),x,1.85,4.6,null,8);for(let i=0;i<6;i++)sph(0.7,M('#3a8a3a'),x+rand(-.6,.6),3.1+rand(0,.8),4.6+rand(-.5,.5),null,8,6);}
  // pickup truck
  (function(){const g=new THREE.Group();g.position.set(-14,0,8.95);scene.add(g);const body=M('#ecf0f1',{roughness:.35,metalness:.3});
    vbox(5,0.7,1.9,body,0,0.7,0,g);vbox(1.8,0.9,1.85,body,1.5,1.5,0,g);vbox(1.75,0.6,1.86,M('#5d7d96',{roughness:.1}),1.5,1.55,0,g);
    vbox(3.1,0.5,0.08,body,-0.95,1.25,0.92,g);vbox(3.1,0.5,0.08,body,-0.95,1.25,-0.92,g);vbox(0.08,0.5,1.85,body,-2.48,1.25,0,g);
    for(const[x,z]of[[1.6,0.95],[1.6,-0.95],[-1.6,0.95],[-1.6,-0.95]]){const w=cyl(0.38,0.38,0.3,M('#1a1a1a'),x,0.38,z,g,14);w.rotation.x=Math.PI/2;}
    solid(-16.5,-12.9,8,9.9,0,1.05,'car');solid(-12.9,-11.5,8,9.9,0,1.95,'car');})();
  // street sign
  cyl(0.05,0.05,2.6,M('#777'),3,1.45,7.2,null,6);
  const ssTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#1d5fa8';g.fillRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=6;g.strokeRect(6,6,w-12,h-12);g.fillStyle='#fff';g.font='800 50px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ซอยสุขุมวิท 26',w/2,h/2-12);g.font='600 26px Kanit, sans-serif';g.fillText('Sukhumvit Soi 26',w/2,h/2+30);});
  const ss=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.45),new THREE.MeshBasicMaterial({map:ssTex,side:THREE.DoubleSide}));ss.position.set(3,2.6,7.2);scene.add(ss);
  solid(2.9,3.1,7.1,7.3,0,2.8,'pole');
})();

/* ================= 2ND FLOOR: VIOLIN & BOOK SHOP (above the right-hand neighbour) ================= */
function mkViolin(c){const g=new THREE.Group();const wood=M(c||'#b5541c',{roughness:.35}),dk=M('#2a1408');
  const b1=sph(0.2,wood,0,0,0,g,14,10);b1.scale.set(1,1.15,0.32);const b2=sph(0.16,wood,0,0.3,0,g,14,10);b2.scale.set(1,1,0.32);
  vbox(0.05,0.42,0.04,dk,0,0.56,0.03,g);sph(0.045,dk,0,0.8,0.02,g,8,6);vbox(0.07,0.13,0.02,dk,0,0.02,0.07,g);return g;}
const PANES=[];
function breakPane(b,f){
  if(b.broken)return;b.broken=true;b.y0=b.y1=-100;const P=PANES[b.pane];if(P)P.mesh.visible=false;
  const cx=(b.x0+b.x1)/2;SFX.glassBreak();G.shake=Math.max(G.shake,0.45);hype=Math.min(1,hype+0.6);
  for(let k=0;k<3;k++)burst(V(cx+rand(-1,1),rand(3,4.6),3),0xbfe3ff,10,4);
  popup('กระจกแตก!! 💥',V(cx,4.4,3.2),'crit',1.3);
  if(f&&f.state!=='ko'&&G.phase==='fight'){f.hp=Math.max(1,f.hp-4);f.vel.z=Math.max(f.vel.z,5);f.vy=Math.max(f.vy,3);f.knockdown=true;}
}
function restorePanes(){PANES.forEach(P=>{P.b.broken=false;P.b.y0=P.b.oy0;P.b.y1=P.b.oy1;P.mesh.visible=true;});}
(function buildFloor2(){
  const X0=11.3,X1=22,Y=2.4;
  // ground-floor storeroom (solid, never walked in) + its shutter facing the street
  sbox(X0,X1,0,Y,-12.3,2.6,M('#b9ad98'),'wall');
  const stTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#8f969c';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=10){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,y,w,3);}g.fillStyle='rgba(255,255,255,.85)';g.font='800 34px Kanit, sans-serif';g.fillText('ห้องเก็บของ',40,140);});
  const sh=sbox(X0,X1,0,Y,2.6,3.0,M('#fff',{map:stTex}),'wall');
  fadeGroup([sh],(c,fo)=>c.z<2.6&&fo&&fo.z>3);
  // floor
  const carpetTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#5b2333';g.fillRect(0,0,w,h);g.strokeStyle='rgba(233,196,106,.35)';g.lineWidth=3;for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.beginPath();g.arc(32+i*64,32+j*64,18,0,Math.PI*2);g.stroke();}});
  carpetTex.wrapS=carpetTex.wrapT=THREE.RepeatWrapping;carpetTex.repeat.set(5,5);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(X1-X0,15.3),M('#fff',{map:carpetTex,roughness:.95}));fl.rotation.x=-Math.PI/2;fl.position.set((X0+X1)/2,Y+0.006,-4.65);fl.receiveShadow=true;scene.add(fl);
  vbox(X1-X0,0.22,0.3,M('#3a3a3a'),(X0+X1)/2,Y-0.1,3.05);
  // walls
  const wm=M('#efe3cf',{roughness:.9});
  const bw=sbox(X0,X1+0.3,Y,Y+3.2,-12.3,-12.0,wm,'wall');
  const rwall=sbox(X1,X1+0.3,0,Y+3.2,-12.3,3.0,M('#e2d6c0'),'wall');
  // violin wall
  const slat=vbox(6.6,1.9,0.1,M('#4a2f22',{roughness:.8}),15.4,Y+2.0,-11.93);
  const vcols=['#b5541c','#8e3b12','#c46a2a','#a14a18','#7a3410','#c0602a'];
  const vls=[];for(let i=0;i<6;i++){const v=mkViolin(vcols[i]);v.position.set(12.7+i*1.05,Y+1.75,-11.82);v.rotation.z=(i%2?-1:1)*0.08;scene.add(v);vls.push(v);}
  const vTex=canvasTex(1024,160,(g,w,h)=>{g.fillStyle='#2a1a12';g.fillRect(0,0,w,h);g.fillStyle='#e9c46a';g.font='800 70px Kanit, serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ชั้น 2 · ไวโอลิน & หนังสือ',w/2,h/2);});
  const vs=new THREE.Mesh(new THREE.PlaneGeometry(5.6,0.88),new THREE.MeshBasicMaterial({map:vTex}));vs.position.set(15.4,Y+2.75,-11.92);scene.add(vs);
  fadeGroup([bw,slat,vs],c=>c.z<-12.0);
  // books along the right wall
  const shelf=sbox(21.3,X1,Y,Y+2.3,-10.2,2.2,M('#5a3a24'),'shelf');
  const bk=new THREE.Mesh(new THREE.PlaneGeometry(12.4,2.3),M('#fff',{map:bookTex}));bk.rotation.y=-Math.PI/2;bk.position.set(21.29,Y+1.15,-4);scene.add(bk);
  fadeGroup([rwall,shelf,bk],c=>c.x>22);
  // cello on its stand
  const ce=mkViolin('#7a3410');ce.scale.setScalar(2.5);ce.position.set(20.6,Y+0.55,-11.3);ce.rotation.x=-0.12;scene.add(ce);solid(20.2,21,-11.7,-10.9,Y,Y+2.2,'cello');
  // reading table with book stacks
  sbox(15.3,17.7,Y,Y+0.75,-6.3,-4.9,M('#6b4426',{roughness:.45}),'desk');
  for(let i=0;i<5;i++)vbox(0.32,0.06+Math.random()*0.15,0.44,M(pick(['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad'])),15.6+i*0.48,Y+0.82,-5.6+rand(-0.3,0.3));
  // violin display case
  sbox(12.2,14.2,Y,Y+0.85,-1.3,-0.5,M('#4a2f22'),'case');
  const glassM=new THREE.MeshStandardMaterial({color:0xbfe3ff,transparent:true,opacity:0.22,roughness:0.05,depthWrite:false});
  const cg=new THREE.Mesh(new THREE.BoxGeometry(2,0.6,0.8),glassM);cg.position.set(13.2,Y+1.15,-0.9);scene.add(cg);solid(12.2,14.2,-1.3,-0.5,Y+0.85,Y+1.45,'case');
  for(let i=0;i<3;i++){const v=mkViolin(vcols[i+2]);v.rotation.x=-Math.PI/2;v.position.set(12.6+i*0.6,Y+0.9,-0.75);v.scale.setScalar(0.75);scene.add(v);}
  // counter + music stands
  sbox(18.5,20.5,Y,Y+1.0,-1.6,-0.8,M('#f3efe8',{roughness:.4}),'counter');
  for(const[x,z]of[[13.2,-8.6],[19.6,-7.6]]){cyl(0.02,0.02,1.2,M('#222'),x,Y+0.6,z,null,6);vbox(0.5,0.35,0.03,M('#222'),x,Y+1.25,z).rotation.x=-0.4;}
  // hanging sign at the mezzanine doorway
  const dTex=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#ffd23d';g.fillRect(0,0,w,h);g.fillStyle='#2a1600';g.font='800 48px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('→ ชั้น 2 ไวโอลิน',w/2,h/2);});
  const ds=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.48),new THREE.MeshBasicMaterial({map:dTex,side:THREE.DoubleSide}));ds.position.set(10.95,3.35,-10.1);ds.rotation.y=Math.PI/2;scene.add(ds);
  // breakable front glass (4 panes) — knock someone through and they drop onto the sidewalk
  const n=4,w=(X1-X0)/n;
  const paneMat=new THREE.MeshStandardMaterial({color:0xbfe3ff,transparent:true,opacity:0.26,roughness:0.05,metalness:0.2,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<n;i++){const x0=X0+i*w,x1=x0+w;const b=solid(x0,x1,2.85,3.1,Y,Y+2.8,'glass2');b.pane=i;b.oy0=b.y0;b.oy1=b.y1;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w-0.06,2.8),paneMat.clone());m.position.set((x0+x1)/2,Y+1.4,2.98);scene.add(m);PANES.push({b,mesh:m});}
  for(let i=0;i<=n;i++)vbox(0.1,2.9,0.16,M('#2b2b2b'),X0+i*w,Y+1.45,2.98);
  vbox(X1-X0,0.12,0.2,M('#2b2b2b'),(X0+X1)/2,Y+0.06,2.98);
  const sTex=canvasTex(1024,128,(g,w2,h)=>{g.fillStyle='#3b1f2b';g.fillRect(0,0,w2,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9c46a';g.font='800 68px Kanit, serif';g.fillText('VIOLINS & BOOKS · ไวโอลิน & หนังสือ',w2/2,h/2+3);});
  const band=vbox(X1-X0,0.7,0.3,M('#3b1f2b'),(X0+X1)/2,Y+3.15,2.98);
  const bandF=new THREE.Mesh(new THREE.PlaneGeometry(X1-X0,0.7),new THREE.MeshBasicMaterial({map:sTex}));bandF.position.set((X0+X1)/2,Y+3.15,3.14);scene.add(bandF);
  fadeGroup([band,bandF],(c,fo)=>c.z<3&&fo&&fo.z>3);
})();

/* ================= VEHICLES / NPC ================= */
function mkBike(color,rider){
  const g=new THREE.Group();const c=M(color,{roughness:.4,metalness:.3});
  vbox(0.3,0.35,1.3,c,0,0.6,0,g);vbox(0.32,0.15,0.6,M('#222'),0,0.85,-0.15,g);vbox(0.5,0.05,0.05,M('#888'),0,1.1,0.55,g);cyl(0.03,0.03,0.4,M('#888'),0,0.9,0.55,g,6);
  for(const z of[0.55,-0.55]){const w=cyl(0.3,0.3,0.12,M('#151515'),0,0.3,z,g,14);w.rotation.z=Math.PI/2;}
  let r=null;if(rider){r=makePerson('#f39c12',null,'#111');r.g.position.set(0,0.35,-0.15);r.legs.forEach(l=>l.rotation.x=-1.2);r.arms.forEach(a=>a.rotation.x=-1.2);g.add(r.g);
    const helm=sph(0.28,M('#2c3e50'),0,2.18,-0.15,g,10,8);helm.scale.set(1,0.85,1);}
  return{g,r};
}
const NPC={bikes:[],bikeT:6,dog:null,movers:null,customer:null,bystanders:[]};
(function(){
  for(const x of[-15,-9,-2,6,12.5,18]){const p=makePerson(pick(['#e74c3c','#3498db','#1abc9c','#9b59b6','#f39c12','#ecf0f1']));p.g.position.set(x+rand(-1,1),0.15,16.2);p.g.rotation.y=Math.PI;scene.add(p.g);solid(p.g.position.x-0.3,p.g.position.x+0.3,15.9,16.5,0.15,2,'wall');NPC.bystanders.push({p,ph:Math.random()*6});}
  // dog
  const d=new THREE.Group();const fur=M('#b07a3c');
  vbox(0.32,0.3,0.75,fur,0,0.45,0,d);sph(0.17,fur,0,0.68,0.42,d);vbox(0.08,0.12,0.08,M('#222'),0,0.66,0.6,d);
  const ears=[sph(0.06,M('#7a4a1a'),-0.1,0.83,0.4,d,6,4),sph(0.06,M('#7a4a1a'),0.1,0.83,0.4,d,6,4)];
  const dlegs=[];for(const[x,z]of[[-0.1,0.27],[0.1,0.27],[-0.1,-0.27],[0.1,-0.27]]){const l=new THREE.Group();l.position.set(x,0.32,z);d.add(l);const m=vbox(0.07,0.32,0.07,fur,0,-0.16,0,l);dlegs.push(l);}
  const tail=vbox(0.05,0.05,0.3,fur,0,0.58,-0.48,d);tail.rotation.x=-0.6;
  d.position.set(-5,0.15,6.2);scene.add(d);
  NPC.dog={g:d,legs:dlegs,tail,x:-5,z:6.2,y:0.15,tx:-5,tz:6.2,t:0,run:0,cd:0,rest:3};
})();

function anyOutside(){return G.f.some(f=>f.state!=='ko'&&zoneOf(f.pos)==='out'&&lvlOf(f)==='g');}
function anyInside(){return G.f.some(f=>f.state!=='ko'&&zoneOf(f.pos)==='in');}
function updNPC(dt){
  const T=G.clock;
  // bystanders cheer
  NPC.bystanders.forEach(b=>{b.p.g.position.y=0.15+Math.abs(Math.sin(T*9+b.ph))*0.2*hype;animPerson(b.p,T+b.ph,0,hype);});
  if(G.phase==='menu'||!G.f.length)return;
  const live=G.phase==='fight';
  // motorbikes
  if(live){NPC.bikeT-=dt;if(NPC.bikeT<=0){NPC.bikeT=rand(5,10);spawnBike();}}
  for(let i=NPC.bikes.length-1;i>=0;i--){const b=NPC.bikes[i],zx=Math.abs(b.dir)===2,sg=Math.sign(b.dir);if(zx)b.z+=sg*b.sp*dt;else b.x+=sg*b.sp*dt;b.o.g.position.set(b.x,0,b.z);
    for(const f of G.f){if(f.state==='ko'||f.invT>0)continue;const along=zx?Math.abs(f.pos.z-b.z):Math.abs(f.pos.x-b.x),side=zx?Math.abs(f.pos.x-b.x):Math.abs(f.pos.z-b.z);
      if(along<1.0&&side<0.55+f.r&&f.y<1.2&&!b.hit.has(f)){b.hit.add(f);const so=zx?(f.pos.x>b.x?0.66:-0.66):(f.pos.z>b.z?0.66:-0.66);
      f.takeHit(null,{dmg:10,knock:11,stun:.9,launch:5.5,kd:1,unblockable:1,dir:zx?{x:so,z:sg*0.75}:{x:sg*0.75,z:so}});popup('โดนวินชน! 🏍️',f.headPos().add(V(0,0.5,0)),'crit',1.2);SFX.thud();SFX.horn();}}
    if(b.x<-38||b.x>37||b.z<-26||b.z>12){scene.remove(b.o.g);NPC.bikes.splice(i,1);}}
  // dog
  const d=NPC.dog;d.t+=dt;d.cd-=dt;
  let near=null,nd=99;for(const f of G.f){if(f.state==='ko')continue;const k=Math.hypot(f.pos.x-d.x,f.pos.z-d.z);if(k<nd){nd=k;near=f;}}
  if(near&&nd<2.6){const a=Math.atan2(d.x-near.pos.x,d.z-near.pos.z);d.tx=clamp(d.x+Math.sin(a)*4,-20,20);d.tz=clamp(d.z+Math.cos(a)*4,3.6,14.5);d.run=1;}
  else if(d.t>d.rest){d.t=0;d.rest=rand(2,5);d.tx=rand(-19,19);d.tz=rand(3.8,14);d.run=Math.random()<.4?1:0.4;}
  if(near&&nd<0.75&&d.cd<=0&&near.state!=='down'){d.cd=2;SFX.bark();popup('โฮ่ง! 🐕',V(d.x,1.4,d.z),'info',0.9);near.takeHit(null,{dmg:2,knock:4,stun:.3,dir:{x:Math.sin(Math.atan2(near.pos.x-d.x,near.pos.z-d.z)),z:Math.cos(Math.atan2(near.pos.x-d.x,near.pos.z-d.z))}});}
  const ddx=d.tx-d.x,ddz=d.tz-d.z,dd=Math.hypot(ddx,ddz);
  if(dd>0.2){const sp=(d.run>0.5?5.5:2)*dt;d.x+=ddx/dd*Math.min(sp,dd);d.z+=ddz/dd*Math.min(sp,dd);d.g.rotation.y=lerpAngle(d.g.rotation.y,Math.atan2(ddx,ddz),0.2);const s=Math.sin(G.clock*(d.run>.5?22:12))*0.6;d.legs[0].rotation.x=s;d.legs[3].rotation.x=s;d.legs[1].rotation.x=-s;d.legs[2].rotation.x=-s;}
  d.y=d.z>7.5&&d.z<15?0:0.15;d.g.position.set(d.x,d.y,d.z);d.tail.rotation.y=Math.sin(G.clock*14)*0.6;
  // movers event
  const mv=NPC.movers;
  if(mv){mv.x+=mv.dir*2.4*dt;mv.g.position.set(mv.x,0,mv.z);mv.p.forEach((p,i)=>animPerson(p,G.clock+i,1,0));
    for(const f of G.f){if(f.state==='ko'||f.invT>0)continue;if(Math.abs(f.pos.x-mv.x)<1.25+f.r&&Math.abs(f.pos.z-mv.z)<0.55+f.r&&f.y<1.5&&(mv.cd.get(f)||0)<G.clock){mv.cd.set(f,G.clock+1);
      f.takeHit(null,{dmg:8,knock:7,stun:.6,launch:3,kd:1,unblockable:1,dir:{x:mv.dir*0.5,z:f.pos.z>mv.z?0.85:-0.85}});popup('ระวังเปียโน! 🎹',f.headPos().add(V(0,0.5,0)),'crit',1.1);SFX.piano();}}
    if((mv.dir>0&&mv.x>10.6)||(mv.dir<0&&mv.x<-14.4)){scene.remove(mv.g);NPC.movers=null;}}
  // customer
  const c=NPC.customer;
  if(c){
    const wp=c.path[c.i];
    if(c.wait>0){c.wait-=dt;animPerson(c.p,G.clock,0,0);}
    else if(wp){const dx=wp.x-c.x,dz=wp.z-c.z,dl=Math.hypot(dx,dz);
      if(dl<0.15){c.i++;if(c.i===3){c.wait=2.4;popup(pick(['มีเปียโนมือสองไหมครับ?','ขอดูกีตาร์คลาสสิกหน่อย','มีหนังสือ ABRSM ไหม?','สายกีตาร์ Hannabach มีไหม?']),V(c.x,2.4,c.z),'bubble',2.2);}}
      else{const sp=2.3*dt;c.x+=dx/dl*sp;c.z+=dz/dl*sp;c.p.g.rotation.y=Math.atan2(dx,dz);animPerson(c.p,G.clock,1,0);}}
    else{scene.remove(c.p.g);NPC.customer=null;}
    if(NPC.customer){c.p.g.position.set(c.x,c.z>3?0.15:0,c.z);G.watch=(c.z<2.95)?1:0;}
    else G.watch=0;
  }else G.watch=0;
}
function bikeRot(dir){return dir===2?0:dir===-2?Math.PI:dir>0?Math.PI/2:-Math.PI/2;}
function spawnBike(){
  // pick a road of the loop: front / back run along x, left / right run along z (dir ±2)
  const r=pick(['front','front','back','left','right']),s=Math.random()<.5?1:-1;let x,z,dir;
  if(r==='front'){dir=s;z=s>0?10.8:13.3;x=-s*36;}else if(r==='back'){dir=s;z=s>0?-16.6:-19.2;x=-s*36;}
  else{dir=2*s;x=r==='left'?(s>0?-30.8:-27.4):(s>0?26.2:29.4);z=s>0?-25:11;}
  const o=mkBike(pick(['#c0392b','#2980b9','#27ae60','#8e44ad']),true);o.g.rotation.y=bikeRot(dir);o.g.position.set(x,0,z);scene.add(o.g);
  const b={id:++ITSEQ,o,x,z,dir,sp:rand(13,17),hit:new Set()};NPC.bikes.push(b);
  const fx=G.f.find(f=>f.human===0)||G.f[0];
  if(fx&&zoneOf(fx.pos)==='out'){SFX.horn();setTimeout(()=>SFX.engine(),300);popup('ปี๊นๆ! 🏍️ วินมา!',Math.abs(dir)===2?V(x,1.8,clamp(fx.pos.z-Math.sign(dir)*9,-20,8)):V(clamp(fx.pos.x-dir*9,-30,30),1.8,z),'info',1.4);}
}
function mkMovers(){const g=new THREE.Group();const up=upright(0,0,Math.PI/2);scene.remove(up);up.position.set(0,0,0);g.add(up);
  const ps=[];for(const s of[-1,1]){const p=makePerson('#e67e22',null,'#111');p.g.position.x=s*1.15;p.g.rotation.y=Math.PI/2;g.add(p.g);p.arms.forEach(a=>a.rotation.x=-1.1);ps.push(p);}return{g,ps};}
function startMovers(){
  const {g,ps}=mkMovers();
  const dir=Math.random()<.5?1:-1;NPC.movers={g,p:ps,x:dir>0?-14:10.4,z:pick([-4.5,-2.6,-0.4,1.0]),dir,cd:new Map()};scene.add(g);
  banner('🎹 ทีมย้ายเปียโนกำลังเข็นผ่าน! หลบด้วย!',3.5);
}
const mkCustomer=()=>makePerson('#54a0ff',null,'#3a2a1a');
function startCustomer(){
  const p=mkCustomer();scene.add(p.g);
  NPC.customer={p,x:rand(-6,6),z:12.5,path:[{x:0,z:5},{x:0,z:1.5},{x:6.6,z:-0.8},{x:0,z:1.6},{x:0,z:5},{x:pick([-18,18]),z:5.5}],i:0,wait:0};
  setTimeout(()=>{if(NPC.customer){SFX.chime();banner('🛎️ ลูกค้าเข้าร้าน! ทำตัวปกติ ห้ามต่อยในร้าน!',4.5);}},2600);
}

/* ================= RAIN ================= */
const RAIN={n:900,geo:null,pts:null,on:0};
(function(){const pos=new Float32Array(RAIN.n*6);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  RAIN.geo=geo;RAIN.pos=pos;RAIN.ls=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xaac8e6,transparent:true,opacity:0.55}));RAIN.ls.visible=false;RAIN.ls.frustumCulled=false;scene.add(RAIN.ls);
  for(let i=0;i<RAIN.n;i++)resetDrop(i,true);})();
function resetDrop(i,initial){const p=RAIN.pos,cx=RAIN.cx||0,cz=RAIN.cz||10;const x=cx+rand(-18,18),z=cz+rand(-12,12),y=initial?rand(0,14):14;p[i*6]=x;p[i*6+1]=y;p[i*6+2]=z;p[i*6+3]=x+0.05;p[i*6+4]=y-0.6;p[i*6+5]=z+0.05;}
function updRain(dt,focus){
  if(G.rain>0){G.rain-=dt;if(G.rain<=0)banner('☀️ ฝนหยุดแล้ว',2);}
  const want=G.rain>0?1:0;RAIN.on=lerp(RAIN.on,want,1-Math.exp(-1.5*dt));
  RAIN.ls.visible=RAIN.on>0.02;
  EV.dark=lerp(EV.dark,EV.blackout>0?1:0,1-Math.exp(-3*dt));const dk=1-EV.dark*0.78,fl=EV.flash>0?(EV.flash-=dt,1.8):1;
  if(hemiRef)hemiRef.intensity=(0.62-RAIN.on*0.2)*dk*fl;sun.intensity=(0.85-RAIN.on*0.45)*dk*fl;
  scene.background.setRGB(lerp(0.66,0.42,RAIN.on)*(0.35+0.65*dk),lerp(0.8,0.47,RAIN.on)*(0.35+0.65*dk),lerp(0.92,0.55,RAIN.on)*(0.4+0.6*dk));scene.fog.color.copy(scene.background);
  updWater(dt);
  if(!RAIN.ls.visible)return;
  RAIN.cx=focus.x;RAIN.cz=focus.z;
  const p=RAIN.pos;for(let i=0;i<RAIN.n;i++){p[i*6+1]-=22*dt;p[i*6+4]-=22*dt;if(p[i*6+4]<0)resetDrop(i,false);}
  RAIN.geo.attributes.position.needsUpdate=true;RAIN.ls.material.opacity=0.55*RAIN.on;
}

/* ================= FLOOD · BLACKOUT · STORM · DELIVERY VAN ================= */
const EV={blackout:0,dark:0,flash:0,storm:0,gustT:0,gust:null};
const FLOOD={lvl:0,t:0,zap:-1,zapT:0,tick:0,junk:[]};
const ZAP_POLES=[[-25.2,7.2],[-17,7.2],[-5,7.2],[9,7.2],[19,7.2],[23.9,7.2]];
const waterTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#4c8fb5';g.fillRect(0,0,w,h);for(let i=0;i<70;i++){g.strokeStyle='rgba(255,255,255,'+rand(.08,.3).toFixed(2)+')';g.lineWidth=2;g.beginPath();const x=rand(0,w),y=rand(0,h);g.moveTo(x,y);g.quadraticCurveTo(x+10,y-5,x+24,y);g.stroke();}});
waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping;waterTex.repeat.set(16,10);
const water=new THREE.Mesh(new THREE.PlaneGeometry(70,42),new THREE.MeshStandardMaterial({map:waterTex,color:0xa8d8f0,transparent:true,opacity:.6,roughness:.12,metalness:.1,depthWrite:false}));
water.rotation.x=-Math.PI/2;water.position.set(-0.6,0,-3.2);water.visible=false;water.renderOrder=2;scene.add(water);
(function(){const mk=[()=>{const g=new THREE.Group();cyl(0.25,0.15,0.14,M('#e74c3c'),0,0.04,0,g,14);return g;},()=>{const g=new THREE.Group();vbox(0.14,0.03,0.32,M('#2980b9'),0,0.02,0,g);vbox(0.14,0.03,0.32,M('#2980b9'),0.2,0.02,0.05,g);return g;},
  ()=>{const g=new THREE.Group();sph(0.18,M('#f1c40f'),0,0.08,0,g,10,8);return g;},()=>{const g=new THREE.Group();vbox(0.45,0.05,0.32,M('#c89b62'),0,0.02,0,g);return g;},()=>{const g=new THREE.Group();const d=sph(0.16,M('#ffd23d'),0,0.08,0,g,10,8);d.scale.set(1,0.8,1.3);sph(0.09,M('#ffd23d'),0,0.22,0.14,g,8,6);vbox(0.06,0.03,0.08,M('#ff7a00'),0,0.2,0.25,g);return g;}];
  for(let i=0;i<12;i++){const g=mk[i%5]();g.visible=false;scene.add(g);FLOOD.junk.push({g,x:0,z:0,vx:0,vz:0,ph:Math.random()*6});}})();
function inWater(f){return FLOOD.lvl>0.06&&f.y<FLOOD.lvl-0.03;}
function updWater(dt){ // visuals only (runs on host and clients)
  const on=FLOOD.lvl>0.02;water.visible=on;if(!on){FLOOD.junk.forEach(j=>j.g.visible=false);return;}
  water.position.y=FLOOD.lvl;waterTex.offset.x+=dt*0.02;waterTex.offset.y+=dt*0.013;
  for(const j of FLOOD.junk){j.g.visible=true;j.x+=j.vx*dt;j.z+=j.vz*dt;if(j.x<-32||j.x>31)j.vx*=-1;if(j.z<-21||j.z>14.5)j.vz*=-1;
    const gr=groundAt(j.x,j.z,9);j.g.position.set(j.x,Math.max(gr,FLOOD.lvl-0.04)+Math.sin(G.clock*2+j.ph)*0.03,j.z);j.g.rotation.y+=dt*0.3;}
}
function startFlood(){if(G.rain<=0)G.rain=30;FLOOD.t=26;FLOOD.zap=-1;FLOOD.zapT=rand(7,11);
  FLOOD.junk.forEach(j=>{j.x=rand(-30,28);j.z=pick([rand(8,14),rand(-20,-15),rand(-11,2)]);j.vx=rand(-.6,.6);j.vz=rand(-.4,.4);});
  banner('🌊 น้ำท่วม! เดินลุยน้ำช้า ระวังสายไฟช็อต ⚡',4);SFX.thunder();}
function updFlood(dt){
  if(FLOOD.t>0){FLOOD.t-=dt;const want=FLOOD.t>5?0.5:0;FLOOD.lvl=want>FLOOD.lvl?Math.min(want,FLOOD.lvl+dt*0.09):Math.max(0,FLOOD.lvl-dt*0.12);if(FLOOD.t<=0){FLOOD.zap=-1;banner('☀️ น้ำลดแล้ว',2);}}
  else FLOOD.lvl=Math.max(0,FLOOD.lvl-dt*0.15);
  if(FLOOD.lvl<0.1){FLOOD.zap=-1;return;}
  FLOOD.zapT-=dt;
  if(FLOOD.zap<0&&FLOOD.zapT<=0&&FLOOD.t>7){FLOOD.zap=Math.floor(Math.random()*ZAP_POLES.length);FLOOD.zapT=6;const[x,z]=ZAP_POLES[FLOOD.zap];banner('⚡ สายไฟขาดตกน้ำ! หนีออกจากเสาไฟ!',3);SFX.shock();popup('⚡⚡⚡',V(x,2,z),'crit',1.5);}
  else if(FLOOD.zap>=0&&FLOOD.zapT<=0){FLOOD.zap=-1;FLOOD.zapT=rand(6,9);}
  if(FLOOD.zap>=0){FLOOD.tick-=dt;if(FLOOD.tick<=0){FLOOD.tick=0.45;const[x,z]=ZAP_POLES[FLOOD.zap];
    ringFx(x,FLOOD.lvl,z,4.2,0xfff35a,0.4);burst(V(x+rand(-1.5,1.5),FLOOD.lvl+0.3,z+rand(-1.5,1.5)),0xfff35a,6,4);
    for(const f of G.f){if(f.state==='ko'||!inWater(f)||Math.hypot(f.pos.x-x,f.pos.z-z)>4.2)continue;
      f.takeHit(null,{dmg:3,knock:1,stun:.35,unblockable:1,dir:{x:f.pos.x-x,z:f.pos.z-z}});f.fx.dizzy=Math.max(f.fx.dizzy,0.6);popup('ช็อต!! ⚡',f.headPos().add(V(0,0.6,0)),'crit',0.8);SFX.shock();}}}
}
function startBlackout(){EV.blackout=12;SFX.powerDown();banner('🔌 ไฟดับ! มองไม่ค่อยเห็นแล้ว ต่อยมั่วไปก่อน',3.5);}
function startStorm(){EV.storm=15;EV.gustT=1.5;if(G.rain<=0)G.rain=16;banner('🌪️ พายุเข้า! ลมกระโชกแรง ระวังปลิว',3.5);SFX.thunder();EV.flash=0.15;}
function updStorm(dt){
  if(EV.blackout>0){EV.blackout-=dt;if(EV.blackout<=0)banner('💡 ไฟมาแล้ว',1.8);}
  if(EV.storm<=0){EV.gust=null;return;}
  EV.storm-=dt;EV.gustT-=dt;
  if(EV.gustT<=0){EV.gustT=rand(2.2,3.4);const a=rand(0,Math.PI*2);EV.gust={x:Math.sin(a),z:Math.cos(a),t:1.1};SFX.gust();if(Math.random()<.35){SFX.thunder();EV.flash=0.12;}}
  const gs=EV.gust;if(!gs)return;gs.t-=dt;if(gs.t<=0){EV.gust=null;return;}
  for(const f of G.f){if(f.state==='ko'||zoneOf(f.pos)==='in'||f.state==='grabbed')continue;const k=(f.state==='block'?7:16)*dt*(f.y>0.5?1.4:1);f.vel.x+=gs.x*k;f.vel.z+=gs.z*k;
    if(Math.random()<0.08)windFx(f.pos.x-gs.x*3+rand(-2,2),f.y+rand(0.4,2.4),f.pos.z-gs.z*3+rand(-2,2),Math.atan2(gs.x,gs.z),rand(2,4));}
  if(Math.random()<0.5){const c=CAM.focus;windFx(c.x-gs.x*8+rand(-8,8),c.y+rand(0.5,4),c.z-gs.z*8+rand(-8,8),Math.atan2(gs.x,gs.z),rand(2.5,5));}
}
// delivery van drives one lap of the loop
function mkVan(){const g=new THREE.Group();const w=M('#f4f4f4',{roughness:.4,metalness:.2});
  vbox(1.9,1.9,3.4,w,0,1.25,-0.5,g);vbox(1.9,1.25,1.3,w,0,0.92,1.75,g);vbox(1.8,0.55,0.05,M('#5d7d96',{roughness:.1}),0,1.3,2.41,g);
  const t=canvasTex(512,256,(c,W,H)=>{c.fillStyle='#f4f4f4';c.fillRect(0,0,W,H);c.fillStyle='#e67e22';c.fillRect(0,H*0.62,W,H*0.2);c.fillStyle='#d35400';c.font='800 88px Kanit, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('ส่งด่วน!',W/2,H*0.36);});
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.8),new THREE.MeshBasicMaterial({map:t}));p.position.set(s*0.96,1.3,-0.5);p.rotation.y=s*Math.PI/2;g.add(p);}
  for(const[x,z]of[[0.9,1.6],[-0.9,1.6],[0.9,-1.5],[-0.9,-1.5]]){const wh=cyl(0.38,0.38,0.28,M('#151515'),x,0.38,z,g,14);wh.rotation.z=Math.PI/2;}
  return g;}
const VANPATH=[[38,11.2],[-29.1,11.2],[-29.1,-17.8],[27.8,-17.8],[27.8,11.2],[-38,11.2]];
function startVan(){const g=mkVan();scene.add(g);NPC.van={g,x:VANPATH[0][0],z:VANPATH[0][1],i:1,cd:new Map(),rot:-Math.PI/2};banner('🚚 รถส่งของซิ่งรอบร้าน! หลบด้วย!',3.5);SFX.horn();}
function updVan(dt){const v=NPC.van;if(!v)return;const wp=VANPATH[v.i];if(!wp){scene.remove(v.g);NPC.van=null;return;}
  const dx=wp[0]-v.x,dz=wp[1]-v.z,d=Math.hypot(dx,dz),sp=11*dt;
  if(d<=sp){v.x=wp[0];v.z=wp[1];v.i++;}else{v.x+=dx/d*sp;v.z+=dz/d*sp;v.rot=lerpAngle(v.rot,Math.atan2(dx,dz),1-Math.exp(-8*dt));}
  v.g.position.set(v.x,0,v.z);v.g.rotation.y=v.rot;
  const fx=Math.sin(v.rot),fz=Math.cos(v.rot);
  for(const f of G.f){if(f.state==='ko'||f.invT>0||f.y>1.6)continue;const rx=f.pos.x-v.x,rz=f.pos.z-v.z,al=rx*fx+rz*fz,sd=rx*fz-rz*fx;
    if(Math.abs(al)<2.6&&Math.abs(sd)<1.0+f.r&&(v.cd.get(f)||0)<G.clock){v.cd.set(f,G.clock+1.2);
      f.takeHit(null,{dmg:14,knock:13,stun:1,launch:7,kd:1,unblockable:1,heavy:1,dir:{x:fx*0.7+fz*Math.sign(sd)*0.7,z:fz*0.7-fx*Math.sign(sd)*0.7}});popup('โดนรถส่งของชน!! 🚚',f.headPos().add(V(0,0.6,0)),'crit',1.3);SFX.crash();SFX.horn();}}
}
function resetEvents(){EV.blackout=0;EV.storm=0;EV.gust=null;EV.flash=0;FLOOD.t=0;FLOOD.lvl=0;FLOOD.zap=-1;if(NPC.van){scene.remove(NPC.van.g);NPC.van=null;}}

/* ================= ITEMS ================= */
function mkChair(){const g=new THREE.Group();const m=M('#111',{roughness:.3,metalness:.2});vbox(0.75,0.08,0.34,m,0,0.42,0,g);for(const x of[-0.32,0.32])for(const z of[-0.13,0.13])vbox(0.05,0.42,0.05,m,x,0.21,z,g);return g;}
function mkStand(){const g=new THREE.Group();const m=M('#222',{metalness:.5,roughness:.4});for(const s of[-1,1]){const b=vbox(0.05,1.0,0.05,m,s*0.15,0.5,0,g);b.rotation.z=s*0.25;}vbox(0.45,0.05,0.2,m,0,0.35,0.05,g);vbox(0.05,0.6,0.05,m,0,1.1,-0.05,g);return g;}
function mkGuitarItem(){const g=guitar('#d9a35a','#4a2810');g.scale.setScalar(0.62);g.position.y=0.25;const w=new THREE.Group();w.add(g);return w;}
function mkParcel(){const g=new THREE.Group();const m=M('#c89b62',{roughness:.9});vbox(0.5,0.42,0.5,m,0,0.21,0,g);vbox(0.52,0.06,0.12,M('#d9c08a'),0,0.42,0,g);return g;}
function mkCone(){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.65,12),M('#ff6a00'));c.position.y=0.36;c.castShadow=true;g.add(c);vbox(0.5,0.05,0.5,M('#ff6a00'),0,0.025,0,g);const s=cyl(0.15,0.17,0.1,M('#fff'),0,0.4,0,g,12);return g;}
const WEAPONS={
  chair:{name:'เก้าอี้เปียโน',dmg:1.6,range:0.6,knock:3,dur:5,throwDmg:13,mk:mkChair,hold:{p:[0,0.1,0.25],r:[0.3,0,1.4]}},
  stand:{name:'ขาตั้งกีตาร์',dmg:1.3,range:1.0,knock:1.5,dur:6,throwDmg:10,mk:mkStand,hold:{p:[0,0.1,0.2],r:[1.3,0,0]}},
  guitar:{name:'กีตาร์',dmg:1.5,range:0.8,knock:2.5,dur:3,throwDmg:12,mk:mkGuitarItem,hold:{p:[0,0.05,0.15],r:[1.4,0,0]},sfx:'guitar'},
  box:{name:'กล่องพัสดุ',dmg:1.1,range:0.2,knock:1,dur:2,throwDmg:14,mk:mkParcel,hold:{p:[0,0,0.25],r:[0,0,0]}},
  violin:{name:'ไวโอลิน',dmg:1.35,range:0.7,knock:2,dur:4,throwDmg:12,mk:()=>{const g=new THREE.Group();const v=mkViolin();v.position.y=0.15;v.rotation.x=-Math.PI/2;g.add(v);return g;},hold:{p:[0,0.05,0.2],r:[1.2,0,0]},sfx:'violin'},
  cello:{name:'เชลโล่',dmg:2.0,range:1.1,knock:5,dur:3,throwDmg:18,mk:()=>{const g=new THREE.Group();const v=mkViolin('#7a3410');v.scale.setScalar(2.3);v.position.y=0.22;v.rotation.x=-Math.PI/2;g.add(v);return g;},hold:{p:[0,0.1,0.35],r:[1.3,0,0]},sfx:'cello'},
  cone:{name:'กรวยจราจร',dmg:1.2,range:0.5,knock:1.5,dur:4,throwDmg:11,mk:mkCone,hold:{p:[0,0,0.2],r:[1.5,0,0]}},
};
function powerMesh(type){
  const g=new THREE.Group();
  if(type==='coffee'){cyl(0.13,0.1,0.32,M('#8b5a2b'),0,0.16,0,g);cyl(0.135,0.135,0.04,M('#fff',{transparent:true,opacity:.6}),0,0.33,0,g);cyl(0.015,0.015,0.3,M('#e74c3c'),0.03,0.45,0,g,6);}
  else if(type==='bonus'){vbox(0.46,0.28,0.04,M('#d4202a'),0,0.2,0,g);vbox(0.2,0.12,0.05,M('#f5c542',{metalness:.6}),0,0.2,0.01,g);}
  else if(type==='ot'){const t=canvasTex(128,160,(c,w,h)=>{c.fillStyle='#fff';c.fillRect(0,0,w,h);c.fillStyle='#c0392b';c.font='800 44px Kanit, sans-serif';c.textAlign='center';c.fillText('OT',w/2,60);c.fillStyle='#555';c.font='20px Kanit';c.fillText('ทำงานล่วงเวลา',w/2,100);c.fillText('ถึง 4 ทุ่ม',w/2,128);});const p=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.45),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));p.position.y=0.3;g.add(p);}
  else if(type==='yadom'){cyl(0.06,0.06,0.22,M('#27ae60'),0,0.14,0,g,10);cyl(0.06,0.06,0.06,M('#ecf0f1'),0,0.28,0,g,10);}
  else if(type==='somtam'){cyl(0.26,0.2,0.06,M('#fff'),0,0.05,0,g,16);for(let i=0;i<10;i++)vbox(0.04,0.04,0.2,M(pick(['#f39c12','#2ecc71','#e74c3c','#d35400'])),rand(-.12,.12),0.11,rand(-.12,.12),g).rotation.y=rand(0,3);}
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.3,0.42,24),new THREE.MeshBasicMaterial({color:0x7dff8a,transparent:true,opacity:.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.02;g.add(ring);g.userData.ring=ring;
  return g;
}
const POWER={
  coffee:{name:'กาแฟเย็น ☕',txt:'กาแฟเย็น +25 ☕',fn:f=>f.heal(25),snd:'drink'},
  bonus:{name:'ซองโบนัส 💰',txt:'ซองโบนัส! พลังเต็ม 💰',fn:f=>{f.rage=100;},snd:'coin'},
  ot:{name:'ซองเอกสาร ❓',txt:'โดนใบสั่ง OT! ช้าลง 😩',fn:f=>{f.fx.slow=6;},snd:'zap',bad:1},
  yadom:{name:'ยาดม 🌿',txt:'ยาดม สดชื่น! 🌿',fn:f=>{f.heal(10);f.fx.dizzy=0;f.fx.immune=6;},snd:'drink'},
  somtam:{name:'ส้มตำ 🌶',txt:'ส้มตำ +35 เผ็ดดด 🌶',fn:f=>{f.heal(35);f.fx.dizzy=Math.max(f.fx.dizzy,0.8);},snd:'drink'},
};
const WSPOTS=[{x:-3.6,y:0,z:-9.8,t:'chair'},{x:0.6,y:0,z:-9.8,t:'chair'},{x:-12.1,y:0.45,z:-7.75,t:'chair'},{x:-6,y:0,z:-5,t:'chair'},{x:2,y:0,z:-6.5,t:'stand'},{x:-4.8,y:0,z:0.2,t:'stand'},{x:-5.2,y:0,z:2.2,t:'guitar'},{x:6.6,y:0,z:2.2,t:'box'},{x:8.8,y:0,z:0.2,t:'box'},{x:9.6,y:2.4,z:-9,t:'box'},{x:4,y:0,z:-5.4,t:'guitar'},
  {x:-9.5,y:0.15,z:4.2,t:'cone'},{x:5,y:0.15,z:6.9,t:'cone'},{x:-12,y:0,z:10.9,t:'cone'},{x:13,y:0.15,z:6.6,t:'box'},{x:-1.5,y:0.15,z:4.1,t:'stand'},{x:-16,y:1.05,z:9,t:'box'},
  {x:-27.5,y:0,z:-4,t:'cone'},{x:27.6,y:0,z:-7,t:'cone'},{x:-3,y:0,z:-17.6,t:'cone'},{x:-10,y:0.15,z:-13.3,t:'box'},{x:-20.4,y:0,z:-5,t:'stand'},{x:-17.2,y:0,z:1.6,t:'guitar'},{x:-21.8,y:0,z:-11,t:'chair'},
  {x:14,y:2.4,z:-10.6,t:'violin'},{x:18,y:2.4,z:1.9,t:'violin'},{x:20.4,y:2.4,z:-9.4,t:'cello'},{x:16.5,y:3.15,z:-5.6,t:'box'},{x:12.4,y:2.4,z:1.9,t:'stand'}];
const PSPOTS=[{x:16.5,y:2.4,z:-1.6},{x:13,y:2.4,z:-6},{x:-6,y:0,z:-7.5},{x:20,y:2.4,z:1.6},{x:0,y:0,z:-2},{x:-4,y:0,z:0.4},{x:4.4,y:0,z:0},{x:9.6,y:2.4,z:-10.2},{x:-12.6,y:0.45,z:-10.6},{x:5,y:0,z:-10.8},
  {x:-19.5,y:0,z:-4,},{x:-28.6,y:0,z:-11,o:1},{x:28,y:0,z:-11,o:1},{x:8,y:0,z:-17.6,o:1},{x:-24.6,y:0.15,z:-9,o:1},
  {x:-6,y:0.15,z:4.4,o:1},{x:6,y:0.15,z:4.4,o:1},{x:0,y:0,z:11,o:1},{x:-14.6,y:1.05,z:9,o:1},{x:16,y:0.15,z:5.5,o:1},{x:9.5,y:1.1,z:5.6,o:1,somtam:1}];
const items=[];let powerT=5,ITSEQ=0;
function spawnWeapon(spot){const W=WEAPONS[spot.t];const mesh=W.mk();mesh.position.set(spot.x,spot.y,spot.z);scene.add(mesh);
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.45,0.55,24),new THREE.MeshBasicMaterial({color:0xffd23d,transparent:true,opacity:.6,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.02;mesh.add(ring);
  const it={id:++ITSEQ,kind:'w',type:spot.t,mesh,ring,x:spot.x,y:spot.y,z:spot.z,spot,dur:W.dur,t:Math.random()*5};items.push(it);spot.item=it;return it;}
function dropWeapon(type,dur,x,y,z){const W=WEAPONS[type];const mesh=W.mk();mesh.position.set(x,y,z);scene.add(mesh);const ring=new THREE.Mesh(new THREE.RingGeometry(0.45,0.55,24),new THREE.MeshBasicMaterial({color:0xffd23d,transparent:true,opacity:.6,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.02;mesh.add(ring);items.push({id:++ITSEQ,kind:'w',type,mesh,ring,x,y,z,spot:null,dur,t:0});}
function removeItem(it){scene.remove(it.mesh);const i=items.indexOf(it);if(i>=0)items.splice(i,1);if(it.spot){it.spot.item=null;it.spot.resp=rand(8,14);}}
function resetItems(){items.slice().forEach(it=>{scene.remove(it.mesh);});items.length=0;WSPOTS.forEach(s=>{s.item=null;s.resp=0;spawnWeapon(s);});PSPOTS.forEach(s=>s.item=null);powerT=4;}
function spawnPower(){
  const free=PSPOTS.filter(s=>!s.item);if(!free.length)return;
  const s=pick(free);let type=s.somtam?'somtam':pick(['coffee','coffee','bonus','ot','yadom','coffee','yadom']);
  const mesh=powerMesh(type);mesh.position.set(s.x,s.y,s.z);scene.add(mesh);
  const it={id:++ITSEQ,kind:'p',type,mesh,x:s.x,y:s.y,z:s.z,spot:s,t:0};s.item=it;items.push(it);
  burst(V(s.x,s.y+0.4,s.z),0x7dff8a,6,1.5);
}
function updItems(dt){
  for(const s of WSPOTS){if(!s.item&&s.resp>0){s.resp-=dt;if(s.resp<=0)spawnWeapon(s);}}
  if(G.phase==='fight'){powerT-=dt;if(powerT<=0){powerT=rand(6,9);if(items.filter(i=>i.kind==='p').length<4)spawnPower();}}
  for(let i=items.length-1;i>=0;i--){const it=items[i];it.t+=dt;
    if(it.kind==='p'){it.mesh.position.y=it.y+0.25+Math.sin(it.t*3)*0.1;it.mesh.rotation.y+=dt*1.8;it.mesh.userData.ring.position.y=-0.23-Math.sin(it.t*3)*0.1;
      if(G.phase!=='fight')continue;
      for(const f of G.f){if(f.state==='ko'||f.state==='grabbed')continue;if(Math.hypot(f.pos.x-it.x,f.pos.z-it.z)<0.85&&Math.abs(f.y-it.y)<1.2){const P=POWER[it.type];P.fn(f);SFX[P.snd]();popup(P.txt,f.headPos().add(V(0,0.6,0)),P.bad?'crit':'good',1.3);if(it.spot)it.spot.item=null;scene.remove(it.mesh);items.splice(i,1);break;}}
    }else{it.ring.material.opacity=0.35+0.3*Math.sin(it.t*4);}
  }
}
function nearestWeapon(f,maxD){let best=null,bd=maxD;for(const it of items){if(it.kind!=='w')continue;const d=Math.hypot(f.pos.x-it.x,f.pos.z-it.z);if(d<bd&&Math.abs(f.y-it.y)<1.3){bd=d;best=it;}}return best;}
function nearestPower(f,maxD,good){let best=null,bd=maxD;for(const it of items){if(it.kind!=='p'||(good&&POWER[it.type].bad))continue;const d=Math.hypot(f.pos.x-it.x,f.pos.z-it.z);if(d<bd){bd=d;best=it;}}return best;}

/* ================= EVENTS ================= */
function updEvents(dt){
  if(G.phase!=='fight')return;
  updFlood(dt);updStorm(dt);updVan(dt);
  G.evT-=dt;if(G.evT>0)return;
  G.evT=rand(15,24);
  const opts=[];
  if(anyInside()&&!NPC.customer)opts.push('customer','customer');
  if(anyInside()&&!NPC.movers)opts.push('movers');
  if(G.rain<=0)opts.push(anyOutside()?'rain':'rainLow');
  if(FLOOD.t<=0&&FLOOD.lvl<=0)opts.push('flood');
  if(EV.blackout<=0)opts.push('blackout');
  if(EV.storm<=0&&anyOutside())opts.push('storm');
  if(!NPC.van)opts.push('van');
  const e=G.forceEvent||pick(opts);G.forceEvent=null;
  if(e==='customer')startCustomer();
  else if(e==='movers')startMovers();
  else if(e==='flood')startFlood();
  else if(e==='blackout')startBlackout();
  else if(e==='storm')startStorm();
  else if(e==='van')startVan();
  else if(e==='rain'||(e==='rainLow'&&Math.random()<.4)){G.rain=18;banner('☔ ฝนตก! ถนนหน้าร้านลื่นมาก',3.5);}
}
function resetWorld(){
  NPC.bikes.forEach(b=>scene.remove(b.o.g));NPC.bikes.length=0;NPC.bikeT=rand(4,8);
  if(NPC.movers){scene.remove(NPC.movers.g);NPC.movers=null;}
  if(NPC.customer){scene.remove(NPC.customer.p.g);NPC.customer=null;}
  G.watch=0;G.rain=0;G.evT=rand(10,16);resetEvents();
  resetItems();clearEffects();restorePanes();restoreBreakables();
}
