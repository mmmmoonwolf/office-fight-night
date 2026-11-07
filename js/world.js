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
    f.pos.x+=nx*pen;f.pos.z+=nz*pen;
    const vn=f.vel.x*nx+f.vel.z*nz;
    if(vn<-3.2){f.vel.x-=vn*nx*1.6;f.vel.z-=vn*nz*1.6;hit=b;}
    else if(vn<0){f.vel.x-=vn*nx;f.vel.z-=vn*nz;}
    const mn=f.mv.x*nx+f.mv.z*nz;if(mn<0){f.mv.x-=mn*nx;f.mv.z-=mn*nz;}
    f.blocked=true;
  }
  if(hit)f.onWallHit(hit);
}
const zoneOf=p=>p.z<2.95?'in':'out';
const onMezz=f=>f.pos.x>7&&f.pos.z<-4.2&&f.y>2;

/* fade walls */
const fades=[];
function fadeGroup(meshes,cond){meshes.forEach(m=>{m.material=m.material.clone();m.material.transparent=true;});fades.push({meshes,cond,o:1});}
function updFades(dt,focus){for(const f of fades){const want=f.cond(camera.position,focus)?0.16:1;f.o=lerp(f.o,want,1-Math.exp(-8*dt));f.meshes.forEach(m=>{m.material.opacity=f.o;m.material.depthWrite=f.o>0.9;m.castShadow=f.o>0.9;});}}

/* ================= TEXTURES ================= */
const woodTex=canvasTex(512,512,(g,w,h)=>{
  for(let i=0;i<8;i++){const y=i*64;for(let j=0;j<5;j++){const off=(i%2)*64;const x=j*128+off;g.fillStyle=`hsl(28,45%,${36+Math.random()*10}%)`;g.fillRect(x-128,y,128,64);}g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,y,w,2);}
  for(let i=0;i<14;i++){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(Math.random()*w,Math.random()*h,2,64);}
});woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;woodTex.repeat.set(6,3);
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
  const g=new THREE.Mesh(new THREE.PlaneGeometry(120,80),M('#8e8a82',{roughness:.95}));g.rotation.x=-Math.PI/2;g.position.set(0,-0.01,6);g.receiveShadow=true;scene.add(g);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(22.3,11.3),M('#fff',{map:woodTex,roughness:.45}));fl.rotation.x=-Math.PI/2;fl.position.set(0,0.003,-2.5);fl.receiveShadow=true;scene.add(fl);
  const rugTex=canvasTex(1024,700,(g2,w,h)=>{g2.fillStyle='#7b1d27';g2.fillRect(0,0,w,h);g2.strokeStyle='#e9c46a';g2.lineWidth=14;g2.strokeRect(30,30,w-60,h-60);g2.lineWidth=4;g2.strokeRect(56,56,w-112,h-112);g2.fillStyle='rgba(233,196,106,.16)';g2.beginPath();g2.ellipse(w/2,h/2,300,210,0,0,Math.PI*2);g2.fill();g2.textAlign='center';g2.textBaseline='middle';g2.fillStyle='#f4dfa0';g2.font='800 110px Kanit, sans-serif';g2.fillText('ศึกออฟฟิศ',w/2,h/2-30);g2.font='600 44px Kanit, sans-serif';g2.fillText('PETERSON SUKHUMVIT26',w/2,h/2+70);});
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(7.6,5.2),M('#fff',{map:rugTex,roughness:.95}));rug.rotation.x=-Math.PI/2;rug.position.set(0,0.008,-0.9);rug.receiveShadow=true;scene.add(rug);
})();

(function buildStore(){
  const wallMat=M('#e8dcc8',{roughness:.9}),sideMat=M('#ddd0ba',{roughness:.9});
  const back=sbox(-11.3,11.3,0,3.4,-8.3,-8.0,wallMat,'wall');
  const wains=vbox(22.4,0.9,0.1,M('#5c3a24'),0,0.45,-7.95);
  fadeGroup([back,wains],(c)=>c.z<-8.0);
  const lw=sbox(-11.3,-11.0,0,3.4,-8.3,3.0,sideMat,'wall');fadeGroup([lw],c=>c.x<-11);
  const rw=sbox(11.0,11.3,0,3.4,-8.3,3.0,sideMat,'wall');fadeGroup([rw],c=>c.x>11);
  // slatwall + guitars
  const slat=vbox(6.4,1.9,0.1,M('#4a2f22',{roughness:.8}),-1.5,2.5,-7.93);
  const gcols=[['#d9a35a','#5a3010'],['#e8c88e','#4a2810'],['#b8732e','#2a1408'],['#efd29a','#6a3a18'],['#a9622a','#2a1408'],['#d4a060','#3a2010'],['#c58a4a','#3a2010']];
  for(let i=0;i<7;i++){const gg=guitar(...gcols[i]);gg.scale.setScalar(0.78);gg.position.set(-4.3+i*0.93,2.1,-7.85);scene.add(gg);}
  // sign inside
  const signTex=canvasTex(1024,200,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1d1d24');gr.addColorStop(1,'#0e0e12');g.fillStyle=gr;g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9c46a';g.font='800 92px Kanit, serif';g.fillText('PETERSON',w/2,h/2-18);g.font='600 36px Kanit, sans-serif';g.fillStyle='#fff';g.fillText('PIANOS · GUITARS · SUKHUMVIT 26',w/2,h/2+58);});
  const s1=new THREE.Mesh(new THREE.PlaneGeometry(4.6,0.9),new THREE.MeshBasicMaterial({map:signTex}));s1.position.set(-7.9,2.75,-7.94);scene.add(s1);
  fadeGroup([slat,s1],c=>c.z<-8.0);
  // uprights + benches (back wall)
  [[-3.6,pianoBlack],[-1.5,M('#4a2414',{roughness:.3,metalness:.15})],[0.6,M('#f2f0ec',{roughness:.25})]].forEach(([x,m])=>{
    upright(x,-7.6,0,m);solid(x-0.8,x+0.8,-8,-7.05,0,1.45,'piano');
    sbox(x-0.4,x+0.4,0,0.52,-6.65,-6.3,m,'bench');
  });
  // podium + grand
  sbox(-10.6,-5.6,0,0.45,-7.6,-3.4,M('#5b1620',{roughness:.9}),'stage');
  vbox(5.04,0.04,4.24,M('#c9a24a',{metalness:.5,roughness:.3}),-8.1,0.43,-5.5);
  const gp=mkGrand();gp.position.set(-8.1,0.45,-5.2);gp.rotation.y=Math.PI+0.25;scene.add(gp);
  solid(-9.2,-7.0,-7.1,-4.1,0.45,1.5,'grand');
  sbox(-8.6,-7.6,0.45,0.95,-3.95,-3.6,pianoBlack,'bench');
  // bookshelf (left wall) – TeeMee's book corner
  const sh=sbox(-11.0,-10.35,0,2.2,-2.8,2.4,M('#5a3a24'),'shelf');
  const bk=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.2),M('#fff',{map:bookTex}));bk.rotation.y=Math.PI/2;bk.position.set(-10.34,1.1,-0.2);scene.add(bk);
  const bsTex=canvasTex(256,64,(g,w,h)=>{g.fillStyle='#ffd23d';g.fillRect(0,0,w,h);g.fillStyle='#222';g.font='800 34px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('แผนกหนังสือ',w/2,h/2);});
  const bs=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.4),new THREE.MeshBasicMaterial({map:bsTex}));bs.rotation.y=Math.PI/2;bs.position.set(-10.33,2.45,-0.2);scene.add(bs);
  fadeGroup([sh,bk,bs],c=>c.x<-11);
  // guitar stands (center-left)
  for(const[x,z,r]of[[-6.6,0.2,0.4],[-7.4,1.2,0.6],[-5.8,1.4,0.2]]){const gg=guitar('#d9a35a');gg.position.set(x,0.42,z);gg.rotation.set(-0.25,r,0);scene.add(gg);vbox(0.32,0.06,0.32,M('#111'),x,0.03,z+0.1);solid(x-0.28,x+0.28,z-0.25,z+0.3,0,1.2,'guitar');}
  // digital pianos row near front-left window
  for(const x of[-9.2,-7.2]){const dp=upright(x,1.9,Math.PI,M('#2b2420',{roughness:.35}));dp.scale.set(0.95,0.85,0.7);solid(x-0.78,x+0.78,1.55,2.45,0,1.25,'piano');}
  // mezzanine (boss office) + stairs
  const mz=sbox(7,11,0,2.4,-8,-4.2,M('#cfc3ad',{roughness:.85}),'mezz');
  const offTex=canvasTex(512,300,(g,w,h)=>{g.fillStyle='#cfc3ad';g.fillRect(0,0,w,h);g.fillStyle='#6b5a46';g.fillRect(0,h-30,w,30);g.fillStyle='#8fb8d8';g.fillRect(40,40,190,150);g.fillRect(280,40,190,150);g.strokeStyle='#4a3a2a';g.lineWidth=8;g.strokeRect(40,40,190,150);g.strokeRect(280,40,190,150);g.fillStyle='#222';g.font='800 40px Kanit, sans-serif';g.textAlign='center';g.fillText('คลังสินค้า',w/2,250);});
  const mzf=new THREE.Mesh(new THREE.PlaneGeometry(4,2.4),M('#fff',{map:offTex}));mzf.position.set(9,1.2,-4.19);scene.add(mzf);
  vbox(4.02,0.06,3.82,M('#8a6d4a'),9,2.43,-6.1);
  for(let i=0;i<8;i++){const x0=3+0.5*i;solid(x0,7,-6.0,-4.6,0,0.3*(i+1),'stairs');vbox(0.5,0.3*(i+1),1.4,M(i%2?'#7a5a3a':'#86643f'),x0+0.25,0.15*(i+1),-5.3);}
  // boss desk upstairs
  sbox(8.4,10.4,2.4,3.2,-7.3,-6.4,M('#3a2418',{roughness:.4}),'desk');
  vbox(0.7,0.45,0.05,M('#111'),9.4,3.5,-6.95);
  const bossTex=canvasTex(320,90,(g,w,h)=>{g.fillStyle='#c0392b';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 46px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('ห้องหัวหน้า',w/2,h/2);});
  const bt=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.5),new THREE.MeshBasicMaterial({map:bossTex}));bt.position.set(9.2,3.05,-7.93);scene.add(bt);
  // chair
  vbox(0.6,0.1,0.6,M('#111'),9.4,2.85,-7.7);
  // counter + computer + parcels
  sbox(7.4,8.4,0,1.1,-2.6,1.6,M('#f3efe8',{roughness:.4}),'counter');
  vbox(1.15,0.06,4.35,M('#3a2418',{roughness:.35}),7.9,1.13,-0.5);
  vbox(0.06,0.5,0.75,M('#111'),8.05,1.55,-1.2);
  const scr=canvasTex(300,200,(c,w,h)=>{c.fillStyle='#0f2a44';c.fillRect(0,0,w,h);c.fillStyle='#ee4d2d';c.fillRect(0,0,w,40);c.fillStyle='#fff';c.font='800 26px Kanit, sans-serif';c.fillText('แชทร้าน',12,29);c.fillStyle='#ff2d55';c.beginPath();c.arc(w/2,h/2+20,48,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.textAlign='center';c.font='800 42px Kanit, sans-serif';c.fillText('99+',w/2,h/2+35);});
  const sc=new THREE.Mesh(new THREE.PlaneGeometry(0.68,0.44),new THREE.MeshBasicMaterial({map:scr}));sc.position.set(8.015,1.55,-1.2);sc.rotation.y=-Math.PI/2;scene.add(sc);
  const parcel=M('#c89b62',{roughness:.9});
  sbox(9.0,10.4,0,0.6,1.0,2.6,parcel,'box');sbox(9.3,10.1,0.6,1.1,1.3,2.3,parcel,'box');
  // plant
  const pl=new THREE.Group();pl.position.set(-10.2,0,-7.2);scene.add(pl);cyl(0.3,0.24,0.55,M('#e0d6c8'),0,0.27,0,pl,16);for(let i=0;i<9;i++){const l=sph(0.28,M('#2f7d3a'),rand(-.3,.3),0.8+rand(0,.9),rand(-.3,.3),pl,8,6);l.scale.set(1,1.5,0.6);}
  solid(-10.55,-9.85,-7.55,-6.85,0,1.6,'wall');
  // FRONT: glass + door
  const glass=new THREE.MeshStandardMaterial({color:0xbfe3ff,transparent:true,opacity:0.18,roughness:0.05,metalness:0.2,depthWrite:false});
  for(const[a,b]of[[-11.3,-2.3],[2.3,11.3]]){
    solid(a,b,2.85,3.1,0,3.4,'glass');
    const p=new THREE.Mesh(new THREE.PlaneGeometry(b-a,2.4),glass);p.position.set((a+b)/2,1.5,2.98);scene.add(p);
    vbox(b-a,0.3,0.25,M('#2b2b2b'),(a+b)/2,0.15,2.98);
    for(let x=a;x<=b+0.01;x+=(b-a)/4)vbox(0.08,2.7,0.12,M('#2b2b2b'),x,1.35,2.98);
  }
  // door frames & open sliding panels
  vbox(0.12,2.7,0.3,M('#2b2b2b'),-2.3,1.35,2.98);vbox(0.12,2.7,0.3,M('#2b2b2b'),2.3,1.35,2.98);
  for(const s of[-1,1]){const dp=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.4),glass);dp.position.set(s*3.0,1.5,3.12);scene.add(dp);}
  const bandTex=canvasTex(2048,128,(g,w,h)=>{g.fillStyle='#141418';g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9c46a';g.font='800 92px Kanit, serif';g.fillText('PETERSON',w/2,h/2+4);g.font='600 40px Kanit, sans-serif';g.fillStyle='#fff';g.fillText('PIANO & GUITAR GALLERY',w*0.18,h/2);g.fillText('SUKHUMVIT 26',w*0.82,h/2);});
  const band=vbox(22.6,0.7,0.3,M('#141418'),0,3.05,2.98);
  const bandF=new THREE.Mesh(new THREE.PlaneGeometry(22.6,0.7),new THREE.MeshBasicMaterial({map:bandTex}));bandF.position.set(0,3.05,3.14);scene.add(bandF);
  fadeGroup([band,bandF],(c,f)=>c.z<3&&f&&f.z>3);
  // door mat
  const mat=new THREE.Mesh(new THREE.PlaneGeometry(3,1.2),M('#3a3a3a',{roughness:1}));mat.rotation.x=-Math.PI/2;mat.position.set(0,0.01,2.2);scene.add(mat);
})();

/* ================= BUILD STREET ================= */
(function buildStreet(){
  const tile=M('#fff',{map:tileTex,roughness:.9});
  sbox(-22,22,0,0.15,3.1,7.5,tile,'curb');
  sbox(-22,22,0,0.15,15,17,tile,'curb');
  vbox(44,0.16,0.18,M('#c9b23c'),0,0.08,7.5);vbox(44,0.16,0.18,M('#c9b23c'),0,0.08,15);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(44,7.5),M('#fff',{map:roadTex,roughness:.95}));road.rotation.x=-Math.PI/2;road.position.set(0,0.004,11.25);road.receiveShadow=true;scene.add(road);
  // neighbour shopfronts with shutters
  const shutTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#9aa0a6';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=10){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,y,w,3);}g.fillStyle='rgba(40,120,200,.8)';g.font='800 40px Kanit, sans-serif';g.fillText('ให้เช่า',60,140);});
  for(const[a,b]of[[-22,-11.3],[11.3,22]]){
    const f=sbox(a,b,0,3.4,2.6,3.0,M('#fff',{map:shutTex}),'wall');
    const up=vbox(b-a,3.6,0.4,M(a<0?'#d7c39b':'#c4d1c9'),(a+b)/2,5.2,2.8);
    for(let x=a+1;x<b-1;x+=2.6)vbox(1.4,1.1,0.05,M('#6f8fa8',{roughness:.2}),x+0.7,5.1,3.02);
    fadeGroup([f,up],(c,fo)=>c.z<2.6&&fo&&fo.z>3);
  }
  // end walls
  for(const s of[-1,1]){const e=sbox(s<0?-22.6:22,s<0?-22:22.6,0,4.5,3,17,M('#b7aea0'),'wall');fadeGroup([e],c=>s<0?c.x<-22:c.x>22);}
  // far shophouses
  const shops=[['ร้านกาแฟ','#7a4a2a'],['ข้าวมันไก่','#c0392b'],['ซ่อมมือถือ','#2c6fb3'],['ร้านตัดผม','#8e44ad'],['ร้านขายยา','#16a085'],['มินิมาร์ท','#e67e22']];
  const far=[];
  shops.forEach(([n,c],i)=>{
    const x0=-22+i*44/6,x1=x0+44/6;
    const st=canvasTex(512,128,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 60px Kanit, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,w/2,h/2);});
    far.push(vbox(x1-x0-0.1,9,1.6,M(['#e8d9b5','#d9c6a3','#cfd8c4','#e3cfc0','#d4dbe0','#e9dcc0'][i]),(x0+x1)/2,4.5,18));
    const sg=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0-1,1.0),new THREE.MeshBasicMaterial({map:st}));sg.position.set((x0+x1)/2,3.3,17.18);sg.rotation.y=Math.PI;scene.add(sg);far.push(sg);
    const sh=vbox(x1-x0-1.4,2.6,0.05,M('#5f6b73',{roughness:.3}),(x0+x1)/2,1.45,17.18);far.push(sh);
    for(let k=0;k<2;k++)far.push(vbox(1.6,1.3,0.05,M('#6f8fa8',{roughness:.2}),(x0+x1)/2+(k?1.5:-1.5),6,17.18));
  });
  solid(-22,22,17.1,19,0,10,'wall');
  fadeGroup(far,c=>c.z>16.5);
  // electric poles & cables
  const poleX=[-17,-5,9,19];const cableMat=new THREE.LineBasicMaterial({color:0x111111});
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

function anyOutside(){return G.f.some(f=>f.state!=='ko'&&f.pos.z>3);}
function anyInside(){return G.f.some(f=>f.state!=='ko'&&f.pos.z<3);}
function updNPC(dt){
  const T=G.clock;
  // bystanders cheer
  NPC.bystanders.forEach(b=>{b.p.g.position.y=0.15+Math.abs(Math.sin(T*9+b.ph))*0.2*hype;animPerson(b.p,T+b.ph,0,hype);});
  if(G.phase==='menu'||!G.f.length)return;
  const live=G.phase==='fight';
  // motorbikes
  if(live){NPC.bikeT-=dt;if(NPC.bikeT<=0){NPC.bikeT=rand(5,10);spawnBike();}}
  for(let i=NPC.bikes.length-1;i>=0;i--){const b=NPC.bikes[i];b.x+=b.dir*b.sp*dt;b.o.g.position.set(b.x,0,b.z);
    for(const f of G.f){if(f.state==='ko'||f.invT>0)continue;if(Math.abs(f.pos.x-b.x)<1.0&&Math.abs(f.pos.z-b.z)<0.55+f.r&&f.y<1.2&&!b.hit.has(f)){b.hit.add(f);
      f.takeHit(null,{dmg:10,knock:11,stun:.9,launch:5.5,kd:1,unblockable:1,dir:{x:b.dir*0.75,z:f.pos.z>b.z?0.66:-0.66}});popup('โดนวินชน! 🏍️',f.headPos().add(V(0,0.5,0)),'crit',1.2);SFX.thud();SFX.horn();}}
    if(Math.abs(b.x)>30){scene.remove(b.o.g);NPC.bikes.splice(i,1);}}
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
    if(Math.abs(mv.x)>13){scene.remove(mv.g);NPC.movers=null;}}
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
function spawnBike(){
  const dir=Math.random()<.5?1:-1,z=dir>0?10.8:13.3;const o=mkBike(pick(['#c0392b','#2980b9','#27ae60','#8e44ad']),true);o.g.rotation.y=dir>0?Math.PI/2:-Math.PI/2;scene.add(o.g);
  const b={id:++ITSEQ,o,x:-dir*28,z,dir,sp:rand(13,17),hit:new Set()};NPC.bikes.push(b);
  if(anyOutside()){SFX.horn();setTimeout(()=>SFX.engine(),300);const fx=G.f.find(f=>f.human===0)||G.f[0];popup('ปี๊นๆ! 🏍️ วินมา!',V(clamp(fx.pos.x-dir*9,-19,19),1.8,z),'info',1.4);}
}
function mkMovers(){const g=new THREE.Group();const up=upright(0,0,Math.PI/2);scene.remove(up);up.position.set(0,0,0);g.add(up);
  const ps=[];for(const s of[-1,1]){const p=makePerson('#e67e22',null,'#111');p.g.position.x=s*1.15;p.g.rotation.y=Math.PI/2;g.add(p.g);p.arms.forEach(a=>a.rotation.x=-1.1);ps.push(p);}return{g,ps};}
function startMovers(){
  const {g,ps}=mkMovers();
  const dir=Math.random()<.5?1:-1;NPC.movers={g,p:ps,x:-dir*12.5,z:pick([-2.6,-0.4,1.0]),dir,cd:new Map()};scene.add(g);
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
function resetDrop(i,initial){const p=RAIN.pos,cx=RAIN.cx||0,cz=RAIN.cz||10;const x=cx+rand(-18,18),z=Math.max(3.1,cz+rand(-10,12)),y=initial?rand(0,14):14;p[i*6]=x;p[i*6+1]=y;p[i*6+2]=z;p[i*6+3]=x+0.05;p[i*6+4]=y-0.6;p[i*6+5]=z+0.05;}
function updRain(dt,focus){
  if(G.rain>0){G.rain-=dt;if(G.rain<=0)banner('☀️ ฝนหยุดแล้ว',2);}
  const want=G.rain>0?1:0;RAIN.on=lerp(RAIN.on,want,1-Math.exp(-1.5*dt));
  RAIN.ls.visible=RAIN.on>0.02;
  if(hemiRef)hemiRef.intensity=0.62-RAIN.on*0.2;sun.intensity=0.85-RAIN.on*0.45;
  scene.background.setRGB(lerp(0.66,0.42,RAIN.on),lerp(0.8,0.47,RAIN.on),lerp(0.92,0.55,RAIN.on));scene.fog.color.copy(scene.background);
  if(!RAIN.ls.visible)return;
  RAIN.cx=focus.x;RAIN.cz=Math.max(8,focus.z);
  const p=RAIN.pos;for(let i=0;i<RAIN.n;i++){p[i*6+1]-=22*dt;p[i*6+4]-=22*dt;if(p[i*6+4]<0)resetDrop(i,false);}
  RAIN.geo.attributes.position.needsUpdate=true;RAIN.ls.material.opacity=0.55*RAIN.on;
}

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
  coffee:{txt:'กาแฟเย็น +25 ☕',fn:f=>f.heal(25),snd:'drink'},
  bonus:{txt:'ซองโบนัส! พลังเต็ม 💰',fn:f=>{f.rage=100;},snd:'pickup'},
  ot:{txt:'โดนใบสั่ง OT! ช้าลง 😩',fn:f=>{f.fx.slow=6;},snd:'zap',bad:1},
  yadom:{txt:'ยาดม สดชื่น! 🌿',fn:f=>{f.heal(10);f.fx.dizzy=0;f.fx.immune=6;},snd:'drink'},
  somtam:{txt:'ส้มตำ +35 เผ็ดดด 🌶',fn:f=>{f.heal(35);f.fx.dizzy=Math.max(f.fx.dizzy,0.8);},snd:'drink'},
};
const WSPOTS=[{x:-3.6,y:0,z:-5.8,t:'chair'},{x:0.6,y:0,z:-5.8,t:'chair'},{x:-8.1,y:0.45,z:-3.75,t:'chair'},{x:-4.8,y:0,z:0.2,t:'stand'},{x:-5.2,y:0,z:2.2,t:'guitar'},{x:6.6,y:0,z:2.2,t:'box'},{x:8.8,y:0,z:0.2,t:'box'},{x:9.6,y:2.4,z:-5,t:'box'},{x:4,y:0,z:-3.4,t:'guitar'},
  {x:-9.5,y:0.15,z:4.2,t:'cone'},{x:5,y:0.15,z:6.9,t:'cone'},{x:-12,y:0,z:10.9,t:'cone'},{x:13,y:0.15,z:6.6,t:'box'},{x:-1.5,y:0.15,z:4.1,t:'stand'},{x:-16,y:1.05,z:9,t:'box'}];
const PSPOTS=[{x:0,y:0,z:-2},{x:-4,y:0,z:0.4},{x:4.4,y:0,z:0},{x:9.6,y:2.4,z:-6.2},{x:-8.6,y:0.45,z:-6.6},{x:5,y:0,z:-6.8},
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
  G.evT-=dt;if(G.evT>0)return;
  G.evT=rand(15,24);
  const opts=[];
  if(anyInside()&&!NPC.customer)opts.push('customer','customer');
  if(anyInside()&&!NPC.movers)opts.push('movers');
  if(G.rain<=0)opts.push(anyOutside()?'rain':'rainLow');
  const e=pick(opts);
  if(e==='customer')startCustomer();
  else if(e==='movers')startMovers();
  else if(e==='rain'||(e==='rainLow'&&Math.random()<.4)){G.rain=18;banner('☔ ฝนตก! ถนนหน้าร้านลื่นมาก',3.5);}
}
function resetWorld(){
  NPC.bikes.forEach(b=>scene.remove(b.o.g));NPC.bikes.length=0;NPC.bikeT=rand(4,8);
  if(NPC.movers){scene.remove(NPC.movers.g);NPC.movers=null;}
  if(NPC.customer){scene.remove(NPC.customer.p.g);NPC.customer=null;}
  G.watch=0;G.rain=0;G.evT=rand(10,16);
  resetItems();clearEffects();
}
