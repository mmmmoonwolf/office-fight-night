'use strict';
const NET={role:'off'};
/* ================= UTILS ================= */
const $=s=>document.querySelector(s);
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeOutCubic=t=>1-Math.pow(1-t,3);
const easeInOutCubic=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOutBack=t=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
function bez(a,c,b,t){const u=1-t;return new THREE.Vector3(u*u*a.x+2*u*t*c.x+t*t*b.x,u*u*a.y+2*u*t*c.y+t*t*b.y,u*u*a.z+2*u*t*c.z+t*t*b.z);}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function lerpAngle(a,b,t){let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t;}
function angDiff(a,b){return Math.abs(((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI);}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ================= ROSTER ================= */
// sp = key in SPECIALS (fighter.js). emote = victory pose.
// The cast: original cartoon characters, each a rigged 3D model (assets/models/char_<model>.glb, body3d.js) with a
// portrait (assets/portraits/<id>.png). The chibi fields (skin, hair, hairStyle, shirt…) are the cartoon fallback
// used when the model cannot load (and on the headless test pages). sp = default special. emote = chibi victory pose.
const ROSTER=[
 {id:'kip',name:'Kip Kaboom',role:'Tiny kid in a red cap — small but explosive',model:'kip',skin:'#f0c39a',hair:'#2b2b2b',hairStyle:'short',shirt:'#8a8f98',shorts:'#2b2d33',sleeves:true,acc:['cap','glasses'],accent:'#e8401c',
  sp:'superKick',emote:'jump',quotes:['คาบูมมม!','ระเบิดพลังเด็ก!','อย่าดูถูกคนตัวเล็กนะ!','การบ้านเสร็จแล้วค่อยมาต่อย!','บึ้ม บึ้ม!']},
 {id:'momo',name:'Momo Mellow',role:'Chill dude in a giant knit hat — scarily calm',model:'momo',skin:'#f3d6c2',hair:'#c9a36a',hairStyle:'long',shirt:'#e0622a',shorts:'#e8c35a',acc:[],
  sp:'cloud',emote:'chill',quotes:['ชิลล์ๆ เพื่อน~','ไม่ต้องรีบ~','ใจเย็นๆ แล้วค่อยต่อย','หมวกนี้มีของเยอะนะ','สบายยย~']},
 {id:'ruby',name:'Ruby Rumble',role:'Red-dress dynamo — little, but hits like a truck',model:'ruby',skin:'#f6d3bd',hair:'#111111',hairStyle:'bob',fem:true,shirt:'#d0232a',shorts:'#1b1b1b',acc:[],
  sp:'rush',emote:'dance',quotes:['ตึงตังตูม!','อย่ามาแตะเดรสฉัน!','หมัดนี้เพื่อความยุติธรรม!','จบเกมแล้วไปกินชาไข่มุก!','Rumble time!']},
 {id:'grumbo',name:'Grumbo',role:'Grumpy old-timer — complains and punches',model:'grumbo',skin:'#d99a72',hair:'#7a5a3a',hairStyle:'bald',shirt:'#8c2a20',shorts:'#d08a2a',sleeves:true,acc:['cap'],accent:'#c9a24a',
  sp:'quake',emote:'point',quotes:['สมัยลุงนะ...','เด็กสมัยนี้!','หนวกหูจริงๆ!','ลุงยังไหวอยู่!','บ่นแล้วก็ต่อย!']},
 {id:'nana',name:'Nana Nitro',role:'Fitness granny in curlers, whistle ready',model:'nana',skin:'#f2d0bb',hair:'#ff7ab0',hairStyle:'bun',fem:true,shirt:'#1e7fd8',shorts:'#1e7fd8',sleeves:true,acc:['glasses'],
  sp:'dash',emote:'flex',quotes:['ปี๊ดดด! ซิทอัพ 100 ที!','ยายยังฟิต!','หลานจ๋า มานี่!','วิ่งรอบสนามอีกสิบรอบ!','อายุเป็นแค่ตัวเลข!']},
 {id:'duke',name:'Duke Jiggly',role:'The King of rock — bouncy belly included',model:'duke',skin:'#f1d2bc',hair:'#141414',hairStyle:'swept',shirt:'#f4f4f4',shorts:'#f4f4f4',sleeves:true,acc:[],bulk:1.35,
  sp:'buff',emote:'guitar',quotes:['ขอบคุณมากครับบบ~','พุงนี้ร็อคแอนด์โรล!','เต้นสิ เต้น!','ราชามาแล้ว!','อุ้ย พุงเด้ง!']},
 {id:'pippa',name:'Pippa Pop',role:'Mint-haired bunny fan — kicks faster than light',model:'pippa',skin:'#f6d6c6',hair:'#3fd0c8',hairStyle:'bob',fem:true,shirt:'#f59ad0',shorts:'#d61f8a',acc:[],
  sp:'megaSlap',emote:'jump',quotes:['ป๊อปปป!','กระต่ายน้อยเตะแรงนะ!','ผมสีมิ้นต์ไม่ได้แปลว่าใจดี!','ปิ๊ป ป๊อป บึ้ม!','เตะเสร็จไปกินไอติม!']},
];
// everyone is equal: characters only differ in looks — fighting style + special are picked separately (LOADOUT)
ROSTER.forEach(c=>Object.assign(c,{hp:100,pow:1,spd:1,aspd:1,size:1,body:'3d'}));
// the arcade's final boss — not selectable
const BOSS_CH={id:'boss',name:'Boss Bonkers',role:'The big boss with the magic scarf',body:'3d',skin:'#f2c6a2',hair:'#ff7a1a',hairStyle:'model',shirt:'#5a1d8a',shorts:'#1b1e26',accent:'#ffd23d',sleeves:true,acc:[],
  hp:125,pow:1.2,spd:0.86,aspd:0.92,size:1.1,sp:'drop',emote:'point',
  quotes:['บอสมาแล้ว!','บองเกอร์สสส!','ใครกล้าท้าบอส!?','ผ้าพันคอนี้มีพลัง!','ยอมแพ้ซะดีๆ!']};
const HURT=['โอ๊ย!','เจ็บนะ!','ขอลาป่วย!','จะฟ้อง HR!','ขอเบิกค่ารักษา!','ยังไม่ได้กินข้าวเลย!','พักเที่ยงก่อน!','ขอลาพักร้อน!','ประกันสังคมช่วยด้วย!'];
const GLOVES=[
 {name:'Team colour',need:0},
 {name:'Gold',need:1,color:'#ffcc33',metal:.85,rough:.25},
 {name:'Neon purple',need:2,color:'#b04dff',em:'#8a2bff'},
 {name:'Tiger stripes',need:3,tiger:true},
 {name:'Rainbow',need:5,rainbow:true},
];
const TITLES=[[0,'Rookie'],[1,'Regular'],[3,'Team Lead'],[5,'Employee of the Month'],[10,'Legend of Soi 26']];
function titleOf(w){let t=TITLES[0][1];for(const[n,s]of TITLES)if(w>=n)t=s;return t;}

/* ================= SAVE ================= */
const SAVE_KEY='officeFight.v2';
const STATS={wins:{},lo:[null,null]}; // lo = last fighting style + special picked by P1 / P2
function loadSave(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem('officeFight.v1')||'{}');
    if(s.wins)STATS.wins=s.wins;if(Array.isArray(s.lo))STATS.lo=[s.lo[0]||null,s.lo[1]||null];
    ROSTER.forEach(c=>{
      if(s.names&&s.names[c.id])c.name=s.names[c.id];
      c.glove=(s.gloves&&s.gloves[c.id])||0;
      if(s.photos&&s.photos[c.id]){c.photoData=s.photos[c.id];const im=new Image();im.onload=()=>{c.photoImg=im;if(window.refreshFaces)refreshFaces();};im.src=c.photoData;}
    });
  }catch(e){ROSTER.forEach(c=>c.glove=c.glove||0);}
}
function saveAll(){
  try{const s={names:{},photos:{},gloves:{},wins:STATS.wins,lo:STATS.lo};ROSTER.forEach(c=>{s.names[c.id]=c.name;s.gloves[c.id]=c.glove||0;if(c.photoData)s.photos[c.id]=c.photoData;});localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}
}
const winsOf=c=>STATS.wins[c.id]||0;

/* ================= FACE TEXTURE ================= */
const EXPRS=['normal','attack','hurt','ko','win'];
function drawFace(cv,ch,expr){
  const g=cv.getContext('2d'),W=512,H=256,cx=128,cy=130;
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
  g.fillStyle=ch.skin;g.fillRect(0,0,W,H);
  g.fillStyle=ch.hair;
  const band=(y0,y1)=>{g.fillRect(0,y0,46,y1-y0);g.fillRect(210,y0,W-210,y1-y0);};
  const hs=ch.hairStyle;
  if(hs==='bald'){
    band(80,124);g.strokeStyle=ch.hair;g.lineWidth=3;
    for(let i=0;i<3;i++){g.beginPath();g.moveTo(70,40+i*7);g.quadraticCurveTo(128,22+i*7,196,40+i*7);g.stroke();}
  }else if(hs==='buzz'){
    g.globalAlpha=.78;g.fillRect(0,0,W,54);band(54,110);g.globalAlpha=1;
  }else{
    const top=(hs==='long'||hs==='bob'||hs==='longM'||hs==='bun')?62:58;
    g.fillRect(0,0,W,top);
    if(hs==='short'){band(top,118);g.beginPath();g.ellipse(cx-26,top,62,13,0,0,Math.PI);g.fill();}
    else if(hs==='spiky'){band(top,112);g.beginPath();g.moveTo(44,top);for(let x=44;x<212;x+=21){g.lineTo(x+10,top+18);g.lineTo(x+21,top);}g.closePath();g.fill();}
    else if(hs==='long'){band(top,250);g.beginPath();g.ellipse(cx,top,92,22,0,0,Math.PI);g.fill();}
    else if(hs==='longM'){band(top,250);g.beginPath();g.moveTo(40,top-2);g.quadraticCurveTo(80,top+60,66,top+92);g.lineTo(40,top+92);g.closePath();g.fill();g.beginPath();g.moveTo(216,top-2);g.quadraticCurveTo(176,top+60,190,top+92);g.lineTo(216,top+92);g.closePath();g.fill();g.beginPath();g.ellipse(cx,top,70,10,0,0,Math.PI);g.fill();}
    else if(hs==='bob'){band(top,180);g.fillRect(60,top,136,20);}
    else if(hs==='bun'){band(top,122);g.beginPath();g.ellipse(cx+10,top,74,15,0,0,Math.PI);g.fill();}
    else if(hs==='swept'){band(top,116);g.beginPath();g.moveTo(40,top-4);g.lineTo(218,top-4);g.lineTo(214,top+6);g.quadraticCurveTo(130,top+6,70,top+44);g.lineTo(42,top+36);g.closePath();g.fill();}
  }
  const ink='#1b1b1b';
  if(ch.photoImg){
    g.save();g.beginPath();g.ellipse(cx,cy-2,74,86,0,0,Math.PI*2);g.clip();
    g.drawImage(ch.photoImg,cx-86,cy-88,172,172);
    if(expr==='hurt'){g.fillStyle='rgba(255,40,40,.3)';g.fillRect(0,0,W,H);}
    if(expr==='ko'){g.fillStyle='rgba(40,40,100,.45)';g.fillRect(0,0,W,H);}
    g.restore();
    g.strokeStyle=ch.skin;g.lineWidth=7;g.beginPath();g.ellipse(cx,cy-2,74,86,0,0,Math.PI*2);g.stroke();
    g.lineCap='round';
    if(expr==='ko'){g.strokeStyle='#ff2d2d';g.lineWidth=8;for(const s of[-1,1]){const x=cx+s*28,y=cy-10;g.beginPath();g.moveTo(x-12,y-12);g.lineTo(x+12,y+12);g.moveTo(x+12,y-12);g.lineTo(x-12,y+12);g.stroke();}}
    if(expr==='hurt'){g.fillStyle='#7fd0ff';g.beginPath();g.ellipse(cx+62,cy-34,9,13,0,0,Math.PI*2);g.fill();}
    if(expr==='attack'){g.strokeStyle='#e8102a';g.lineWidth=6;const x=cx+52,y=cy-58;g.beginPath();g.moveTo(x-12,y-4);g.lineTo(x-3,y-4);g.lineTo(x-3,y-13);g.moveTo(x+12,y-4);g.lineTo(x+3,y-4);g.lineTo(x+3,y-13);g.moveTo(x-12,y+4);g.lineTo(x-3,y+4);g.lineTo(x-3,y+13);g.moveTo(x+12,y+4);g.lineTo(x+3,y+4);g.lineTo(x+3,y+13);g.stroke();}
    if(expr==='win'){g.fillStyle='#ffe14d';for(const[x,y]of[[cx-70,cy-60],[cx+72,cy-40]]){g.beginPath();for(let i=0;i<8;i++){const r=i%2?5:14,a=i*Math.PI/4;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.fill();}}
    return;
  }
  const ex=31,ey=cy-1,small=ch.eyes==='small';
  g.fillStyle='rgba(255,95,110,.42)';for(const s of[-1,1]){g.beginPath();g.ellipse(cx+s*50,cy+20,17,10,0,0,Math.PI*2);g.fill();}
  g.strokeStyle=ink;g.fillStyle=ink;g.lineCap='round';g.lineJoin='round';
  for(const s of[-1,1]){
    const x=cx+s*ex,y=ey;
    if(expr==='hurt'){g.lineWidth=5;g.beginPath();g.moveTo(x-s*10,y-9);g.lineTo(x+s*6,y);g.lineTo(x-s*10,y+9);g.stroke();}
    else if(expr==='ko'){g.lineWidth=5;g.beginPath();g.moveTo(x-9,y-9);g.lineTo(x+9,y+9);g.moveTo(x+9,y-9);g.lineTo(x-9,y+9);g.stroke();}
    else if(expr==='win'){g.lineWidth=5;g.beginPath();g.arc(x,y+5,10,Math.PI*1.15,Math.PI*1.85);g.stroke();}
    else{
      const ry=small?(expr==='attack'?6:10):(expr==='attack'?11:18),rx=small?13:14.5;
      g.fillStyle='#fff';g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
      g.lineWidth=2.5;g.stroke();
      g.fillStyle=ink;g.beginPath();g.ellipse(x-s,y+2,small?6.5:10,small?6.5:Math.min(ry-2,13),0,0,Math.PI*2);g.fill();g.fillStyle='rgba(120,70,40,.55)';g.beginPath();g.ellipse(x-s,y+6,small?4:6,small?3:6,0,0,Math.PI*2);g.fill();g.fillStyle=ink;
      g.fillStyle='#fff';g.beginPath();g.arc(x+3,y-3,small?2.5:3.5,0,Math.PI*2);g.fill();g.beginPath();g.arc(x-3,y+5,1.6,0,Math.PI*2);g.fill();
      if(ch.fem){g.lineWidth=3;g.beginPath();g.moveTo(x+s*9,y-ry+2);g.lineTo(x+s*16,y-ry-4);g.moveTo(x+s*4,y-ry);g.lineTo(x+s*8,y-ry-7);g.stroke();}
    }
    g.lineWidth=ch.fem?4:6;g.strokeStyle=ink;g.beginPath();
    if(expr==='attack'){g.moveTo(x+s*14,ey-28);g.lineTo(x-s*14,ey-14);}
    else if(expr==='hurt'){g.moveTo(x+s*14,ey-17);g.lineTo(x-s*12,ey-27);}
    else if(expr==='normal'){g.moveTo(x+s*14,ey-22);g.lineTo(x-s*12,ey-18);}
    g.stroke();
  }
  if(ch.acc.includes('glasses')){g.strokeStyle='#111';g.lineWidth=4;for(const s of[-1,1]){g.beginPath();g.arc(cx+s*ex,ey,18,0,Math.PI*2);g.stroke();}g.beginPath();g.moveTo(cx-12,ey);g.lineTo(cx+12,ey);g.moveTo(cx-48,ey-2);g.lineTo(cx-78,ey-6);g.moveTo(cx+48,ey-2);g.lineTo(cx+78,ey-6);g.stroke();}
  g.fillStyle='rgba(150,80,50,.35)';g.beginPath();g.ellipse(cx,cy+14,3,2,0,0,Math.PI*2);g.fill();
  if(ch.mustache){g.fillStyle='#3a3a3a';for(const s of[-1,1]){g.beginPath();g.ellipse(cx+s*12,cy+21,14,5,s*0.2,0,Math.PI*2);g.fill();}}
  g.strokeStyle=ink;g.fillStyle='#4a1010';g.lineWidth=4;const my=cy+31;
  if(expr==='attack'){g.beginPath();g.ellipse(cx,my,16,12,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(cx-11,my-10,22,5);}
  else if(expr==='hurt'){g.beginPath();g.ellipse(cx,my+2,9,11,0,0,Math.PI*2);g.fill();g.stroke();}
  else if(expr==='ko'){g.beginPath();g.ellipse(cx,my,14,10,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#ff7b9a';g.beginPath();g.ellipse(cx+4,my+8,7,8,0,0,Math.PI*2);g.fill();}
  else if(expr==='win'){g.beginPath();g.moveTo(cx-20,my-6);g.quadraticCurveTo(cx,my+28,cx+20,my-6);g.closePath();g.fill();g.stroke();}
  else if(ch.fem){g.fillStyle='#d9536b';g.beginPath();g.ellipse(cx,my-6,10,5,0,0,Math.PI*2);g.fill();}
  else{g.lineWidth=3.5;g.beginPath();g.arc(cx-6,my-9,6,0.1*Math.PI,0.9*Math.PI);g.arc(cx+6,my-9,6,0.1*Math.PI,0.9*Math.PI);g.stroke();}
}
const PIMG={};
function portraitImg(ch){if(!ch.id||!ch.model)return null;let im=PIMG[ch.id];if(!im){im=PIMG[ch.id]=new Image();im.onload=()=>{if(window.refreshFaces)refreshFaces();};im.src='assets/portraits/'+ch.id+'.png';}return im.complete&&im.naturalWidth?im:null;}
function portrait(ch,cv,expr){
  const pim=!ch.photoImg&&portraitImg(ch);
  if(pim){const g=cv.getContext('2d'),w=cv.width,h=cv.height;const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#5a3d6e');bg.addColorStop(1,'#2a1b33');g.fillStyle=bg;g.fillRect(0,0,w,h);
    g.save();if(expr==='ko'){g.filter='grayscale(1)';}g.drawImage(pim,0,0,w,h);g.restore();return;}
  const tmp=document.createElement('canvas');tmp.width=512;tmp.height=256;drawFace(tmp,ch,expr||'normal');
  const g=cv.getContext('2d'),w=cv.width,h=cv.height;
  const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#5a3d6e');bg.addColorStop(1,'#2a1b33');g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.fillStyle=ch.shirt;g.beginPath();g.ellipse(w/2,h*1.02,w*0.42,h*0.22,0,0,Math.PI*2);g.fill();
  g.save();g.beginPath();g.arc(w/2,h*0.5,w*0.4,0,Math.PI*2);g.clip();
  g.drawImage(tmp,128-100,130-104,200,200,w/2-w*0.4,h*0.5-w*0.4,w*0.8,w*0.8);g.restore();
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=w*0.02;g.beginPath();g.arc(w/2,h*0.5,w*0.4,0,Math.PI*2);g.stroke();
}

/* ================= AUDIO ================= */
const SFX={ac:null,nb:null,out:null,musOut:null,ambOut:null,muted:false,mus:null,ambLvl:-1,
  init(){try{if(!this.ac){const ac=this.ac=new(window.AudioContext||window.webkitAudioContext)();const n=ac.sampleRate;const b=ac.createBuffer(1,n,n);const d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.nb=b;
      const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(ac.destination);
      this.out=ac.createGain();this.out.gain.value=this.muted?0:1;this.out.connect(comp);
      this.musOut=ac.createGain();this.musOut.gain.value=0.17;this.musOut.connect(this.out);
      this.ambOut=ac.createGain();this.ambOut.gain.value=0;this.ambOut.connect(this.out);this.startAmb();this.loadSamples();}
    if(this.ac.state==='suspended')this.ac.resume();}catch(e){}},
  // ---- recorded samples (Kenney Impact Sounds + Voiceover Pack, CC0) — synth sounds stay as the fallback ----
  SMP:{},
  loadSamples(){const ac=this.ac;if(!ac||this._smpLoading||typeof fetch!=='function')return;this._smpLoading=1;
    const add=(key,url)=>fetch(url).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();}).then(b=>new Promise((res,rej)=>ac.decodeAudioData(b,res,rej))).then(buf=>{(this.SMP[key]=this.SMP[key]||[]).push(buf);}).catch(()=>{});
    for(const k in SFX_FILES)for(let i=0;i<SFX_FILES[k];i++)add(k,'assets/sfx/'+k+i+'.mp3');
    VOICE_FILES.forEach(v=>add('vo_'+v,'assets/voice/'+v+'.mp3'));},
  smp(key,vol=1,rate=1,delay=0){const ac=this.ac,a=this.SMP[key];if(!ac||this.muted||!a||!a.length)return false;
    const s=ac.createBufferSource();s.buffer=a[Math.floor(Math.random()*a.length)];s.playbackRate.value=rate*(key.startsWith('vo_')?1:rand(0.93,1.07));
    const g=ac.createGain();g.gain.value=vol;s.connect(g);g.connect(this.out);s.start(ac.currentTime+delay);return s.buffer.duration/s.playbackRate.value;},
  vo(name,delay=0){return this.smp('vo_'+name,0.95,1,delay);},          // announcer line, heard by everyone online
  voLocal(name,delay=0){return this.smp('vo_'+name,0.95,1,delay);},     // never broadcast (e.g. "you win" from each player's own point of view)
  voRound(n){const d=this.smp('vo_round',0.95);if(d&&n>=1&&n<=6)this.smp('vo_'+n,0.95,1,d*0.92);},
  metal(){if(!this.smp('metalH',0.8))this.thud();},
  plate(){if(!this.smp('plateH',0.7))this.glass();},
  wood(){if(!this.smp('woodH',0.85))this.thud();},
  setMuted(m){this.muted=m;if(this.out)this.out.gain.value=m?0:1;},
  env(g,t,a,p,d){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(p,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+d);},
  noise(dur,type,f,q,peak,to,a=0.005,delay=0){const ac=this.ac;if(!ac||this.muted)return;const t=ac.currentTime+delay;const s=ac.createBufferSource();s.buffer=this.nb;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);fl.Q.value=q;const g=ac.createGain();this.env(g,t,a,peak,dur);s.connect(fl);fl.connect(g);g.connect(this.out);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);},
  tone(type,f0,f1,dur,peak,delay=0){const ac=this.ac;if(!ac||this.muted)return;const t=ac.currentTime+delay;const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ac.createGain();this.env(g,t,0.005,peak,dur);o.connect(g);g.connect(this.out);o.start(t);o.stop(t+dur+0.05);},
  // cartoon voice: a sawtooth through two formant filters, pitch-glided by mood
  voice(p,kind){const ac=this.ac;if(!ac||this.muted)return;p=clamp(+p||1,0.5,2.2);if(kind==='ko'&&this.smp('scream',0.8,clamp(p,0.85,1.25)))return;const K={atk:[1.0,1.35,0.15],hurt:[1.45,0.8,0.22],ko:[1.35,0.42,0.75],win:[1.0,1.7,0.32],sp:[0.85,1.55,0.42],grunt:[0.95,0.72,0.13],laugh:[1.3,1.1,0.1]}[kind]||[1,1,0.15];
    const reps=kind==='laugh'?4:kind==='win'?2:1;
    for(let r=0;r<reps;r++){const t=ac.currentTime+r*(kind==='laugh'?0.11:0.2);const base=165*p*(kind==='win'&&r?1.25:1);
      const o=ac.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(base*K[0],t);o.frequency.exponentialRampToValueAtTime(base*K[1],t+K[2]);
      const f1=ac.createBiquadFilter();f1.type='bandpass';f1.frequency.value=(kind==='hurt'||kind==='ko'?780:640)*(0.75+p*0.25);f1.Q.value=5;
      const f2=ac.createBiquadFilter();f2.type='bandpass';f2.frequency.value=1200*(0.8+p*0.2)*(kind==='win'||kind==='laugh'?1.35:1);f2.Q.value=7;
      const g=ac.createGain();this.env(g,t,0.012,0.9,K[2]+0.04);o.connect(f1);o.connect(f2);f1.connect(g);f2.connect(g);g.connect(this.out);o.start(t);o.stop(t+K[2]+0.1);}},
  koWhoosh(){this.smp('rocket',0.6);},
  whoosh(){this.noise(rand(0.1,0.18),'bandpass',rand(400,800),rand(0.8,1.6),0.1,rand(1800,3200));},
  hit(h){if(this.smp(h?'punchH':'punchM',h?1:0.8)){if(h)this.tone('sine',95,38,0.2,0.45);return;}
    const v=Math.floor(Math.random()*3),p=rand(0.85,1.2);
    if(v===0){this.noise(h?0.22:0.12,'lowpass',(h?1000:2200)*p,0.7,h?0.9:0.55);this.tone('sine',(h?140:200)*p,40,h?0.2:0.1,h?0.8:0.5);}
    else if(v===1){this.noise(0.08,'bandpass',1800*p,1.5,0.7);this.noise(h?0.25:0.1,'lowpass',520*p,0.7,h?0.8:0.4);this.tone('triangle',(h?110:170)*p,50,0.12,0.5);}
    else{this.noise(0.05,'highpass',3000*p,0.7,0.5);this.tone('square',(h?90:150)*p,45,h?0.18:0.09,h?0.42:0.28);this.noise(h?0.3:0.12,'lowpass',800,0.7,h?0.7:0.35);}
    if(h&&Math.random()<0.5)this.tone('sine',60,30,0.35,0.6);},
  block(){if(this.smp('softM',0.7,1.3))return;this.tone('square',rand(340,420),220,0.07,0.1);this.noise(0.06,'highpass',2500,0.7,0.22);},
  bell(){if(this.smp('bell',0.75)){this.smp('bell',0.6,1,0.32);return;}[0,0.32].forEach(d=>{this.tone('sine',1320,0,1.2,0.3,d);this.tone('sine',2640,0,0.8,0.1,d);this.tone('triangle',660,0,1.0,0.14,d);});},
  koBell(){if(this.smp('bell',0.7,1.08)){this.smp('bell',0.6,1.08,0.17);this.smp('bell',0.55,1.08,0.34);return;}[0,0.17,0.34].forEach(d=>{this.tone('sine',1480,0,0.7,0.22,d);this.tone('triangle',740,0,0.5,0.1,d);});},
  crowd(){this.noise(1.8,'bandpass',700,0.4,0.3,0,0.3);this.noise(1.4,'bandpass',1500,0.6,0.12,0,0.3);this.noise(0.9,'bandpass',rand(900,1300),3,0.08,0,0.05,0.3);},
  piano(){const base=[48,50,52,53,55,57,59,60,62,64,65,67];for(let i=0;i<4;i++){const m=pick(base)+(Math.random()<.3?12:0);const f=440*Math.pow(2,(m-69)/12);const d=Math.random()*0.03;this.tone('triangle',f,0,1.4,0.16,d);this.tone('sine',f*2,0,0.7,0.05,d);}this.noise(0.1,'lowpass',500,0.7,0.5);},
  thud(){if(this.smp('softH',0.9)){this.tone('sine',80,35,0.2,0.35);return;}this.tone('sine',rand(75,100),35,0.25,0.7);this.noise(0.15,'lowpass',600,0.7,0.5);},
  land(){if(this.smp('softH',0.55,1.15))return;this.noise(0.12,'lowpass',400,0.7,0.3);this.tone('sine',80,40,0.12,0.25);},
  step(s){if(this.smp('stepToon',0.22,s===1?1.12:s===2?0.88:1)||this.smp(s===2?'stepCarpet':s?'stepStone':'stepWood',0.35))return;this.noise(0.035,s?'bandpass':'lowpass',s?rand(1200,1600):rand(500,700),1,0.06);},
  guitar(){[82.4,110,146.8,196,246.9,329.6].forEach((x,i)=>this.tone('sawtooth',x,0,1.0,0.05,i*0.015));},
  violin(){const f=pick([392,440,494,523,587,659]);this.tone('sawtooth',f,f*1.02,0.55,0.07);this.tone('sawtooth',f*1.5,0,0.45,0.025);this.noise(0.3,'bandpass',f*3,6,0.05);},
  cello(){const f=pick([65.4,73.4,82.4,98]);this.tone('sawtooth',f,f*0.98,0.9,0.12);this.tone('triangle',f*2,0,0.7,0.06);},
  chord(i){const r=[1,1.335,1.5][i|0]||1;[82.4,123.5,164.8,164.8].forEach(x=>{this.tone('sawtooth',x*r,0,1.1,0.11);this.tone('square',x*r*1.006,0,0.9,0.05);});this.noise(0.3,'lowpass',900,0.7,0.4);if((i|0)===2){this.tone('sine',55,30,0.8,0.7);this.noise(0.8,'lowpass',2500,0.5,0.5,300);}},
  glass(){if(this.smp('glassL',0.7))return;this.tone('sine',2400,0,0.5,0.18);this.tone('sine',3150,0,0.4,0.1,0.02);this.noise(0.12,'highpass',4000,0.7,0.3);},
  glassBreak(){if(this.smp('glassH',1)){this.smp('glassL',0.6,1.2,0.08);return;}for(let i=0;i<9;i++)this.tone('sine',rand(2500,5600),0,rand(0.2,0.7),0.07,rand(0,0.2));this.noise(0.6,'highpass',2500,0.5,0.6,7000);this.noise(0.25,'lowpass',900,0.7,0.6);},
  alarm(){for(let i=0;i<6;i++)this.tone('square',i%2?880:660,0,0.14,0.08,i*0.16);},
  horn(){this.tone('square',420,0,0.25,0.12);this.tone('square',520,0,0.25,0.08);this.tone('square',420,0,0.22,0.12,0.32);},
  engine(){this.noise(1.6,'lowpass',260,3,0.35,900,0.2);this.tone('sawtooth',70,140,1.4,0.08);},
  bark(){const p=rand(0.9,1.15);this.tone('square',600*p,300*p,0.09,0.15);this.tone('square',650*p,320*p,0.09,0.15,0.16);},
  chime(){this.tone('sine',1046,0,0.7,0.25);this.tone('sine',784,0,0.9,0.25,0.35);},
  shutter(){this.noise(0.04,'highpass',3000,0.7,0.6);this.noise(0.05,'bandpass',1800,2,0.4,0,0.005,0.07);},
  smoke(){this.noise(1.2,'highpass',1800,0.5,0.18,600,0.1);},
  pickup(){const p=rand(0.9,1.2);this.tone('square',660*p,990*p,0.09,0.08);},
  coin(){this.tone('square',988,0,0.08,0.1);this.tone('square',1319,0,0.3,0.1,0.08);},
  drink(){this.tone('sine',400,900,0.12,0.18);this.tone('sine',500,1100,0.12,0.15,0.13);},
  jump(){this.tone('sine',rand(280,330),rand(480,560),0.1,0.08);},
  crash(){this.piano();this.thud();if(!this.smp('woodH',1))this.noise(0.5,'lowpass',1400,0.6,0.7);},
  sofa(){this.tone('sine',70,30,0.45,0.8);this.noise(0.45,'lowpass',300,0.7,0.8);this.tone('triangle',180,90,0.3,0.2,0.05);},
  tornado(){this.noise(1.0,'bandpass',350,1,0.35,1800,0.1);this.tone('sine',300,900,0.9,0.06);},
  flex(){this.voice(0.7,'grunt');this.tone('sawtooth',70,150,0.55,0.15);this.noise(0.5,'lowpass',400,1,0.6,1500,0.05);},
  zap(){this.tone('sawtooth',900,200,0.25,0.12);},
  splash(){this.noise(0.4,'bandpass',900,0.6,0.5,280);this.noise(0.18,'highpass',2600,0.7,0.25,1500,0.005,0.04);},
  thunder(){this.noise(1.8,'lowpass',320,0.5,0.95,70,0.02);this.noise(0.3,'highpass',1800,0.5,0.35,900);},
  gust(){this.noise(1.1,'bandpass',450,0.5,0.3,1300,0.25);},
  shock(){this.tone('square',130,70,0.32,0.22);this.noise(0.28,'highpass',4200,1,0.3);this.tone('sawtooth',1800,600,0.12,0.06);},
  powerDown(){this.tone('sine',520,45,0.9,0.28);},
  swish(){this.noise(0.25,'bandpass',900,2,0.15,3000);},
  /* procedural lounge music: Cmaj7-Am7-Dm7-G7 arpeggios + bass + hats */
  /* recorded BGM (Pixabay, assets/music): one <audio> per track routed through bgmOut, cross-faded when the wanted track
     changes (game loop → bgm(name, rate)); 'win' plays once, then the menu track. If a file can't play, the procedural
     lounge loop below takes over. */
  BGM_LOOP:{menu:1,fight:1,train:1,win:0},bgmEl:{},bgmCur:null,bgmOK:false,bgmFail:false,
  bgm(name,rate=1){const ac=this.ac;if(!ac||this.bgmFail||typeof Audio==='undefined')return;
    if(name==='win'&&this.bgmWinDone)name='menu';if(name!=='win')this.bgmWinDone=false;
    const cur=this.bgmEl[this.bgmCur];if(cur&&cur.el.playbackRate!==rate&&name===this.bgmCur)cur.el.playbackRate=rate;
    if(name===this.bgmCur)return;
    if(cur){const g=cur.g.gain;g.cancelScheduledValues(ac.currentTime);g.setValueAtTime(g.value,ac.currentTime);g.linearRampToValueAtTime(0,ac.currentTime+0.6);
      const el=cur.el;setTimeout(()=>{if(this.bgmCur!==cur.name)el.pause();},700);}
    this.bgmCur=name;let t=this.bgmEl[name];
    try{if(!t){if(!this.bgmOut){this.bgmOut=ac.createGain();this.bgmOut.gain.value=0.42;this.bgmOut.connect(this.out);}
        const el=new Audio('assets/music/'+name+'.mp3');el.loop=!!this.BGM_LOOP[name];el.preload='auto';
        const g=ac.createGain();g.gain.value=0;ac.createMediaElementSource(el).connect(g);g.connect(this.bgmOut);
        t=this.bgmEl[name]={name,el,g};
        el.addEventListener('playing',()=>{if(!this.bgmOK){this.bgmOK=true;this.music(false);}});
        el.addEventListener('ended',()=>{if(name==='win')this.bgmWinDone=true;});
        el.addEventListener('error',()=>{this.bgmFail=true;this.bgmCur=null;this.music(true);});}
      if(name!=='menu'&&name!=='train'||!t.el.loop)t.el.currentTime=0;t.el.playbackRate=rate;
      const g=t.g.gain;g.cancelScheduledValues(ac.currentTime);g.setValueAtTime(0,ac.currentTime);g.linearRampToValueAtTime(name==='win'?1.1:1,ac.currentTime+0.5);
      const p=t.el.play();if(p&&p.catch)p.catch(()=>{if(this.bgmCur===name)this.bgmCur=null;});}catch(e){this.bgmFail=true;}},
  music(on){if(!this.ac)return;if(on&&this.bgmOK)return;if(on&&!this.mus){this.mus={next:this.ac.currentTime+0.15,step:0,tempo:96};this.mus.timer=setInterval(()=>this._musTick(),90);}else if(!on&&this.mus){clearInterval(this.mus.timer);this.mus=null;}},
  musicTempo(bpm){if(this.mus)this.mus.tempo=bpm;},
  _musTick(){const ac=this.ac,M=this.mus;if(!M)return;if(M.next<ac.currentTime)M.next=ac.currentTime+0.05;
    const prog=[[48,52,55,59],[45,48,52,55],[50,53,57,60],[43,47,50,53]],pat=[0,1,2,3,2,1,2,3];
    while(M.next<ac.currentTime+0.35){const s=M.step,bar=Math.floor(s/8)%4,ch=prog[bar],i=s%8,dur=60/M.tempo/2;
      if(!this.muted){this._note(ch[pat[i]]+12,M.next,dur*1.9,0.07);
        if(i===0||i===5)this._note(ch[0]-12,M.next,dur*(i?3:4.5),0.11,'sine');
        if((i===3||i===7)&&Math.random()<0.45)this._note(ch[(i+bar)%4]+24,M.next,dur*1.5,0.035);
        if(M.tempo>110||i%2===0)this._hat(M.next,i%4===0?0.035:0.02);
        if(M.tempo>110&&i%4===0)this._kick(M.next);}
      M.next+=dur;M.step++;}},
  _note(m,t,d,v,type){const ac=this.ac,f=440*Math.pow(2,(m-69)/12),o=ac.createOscillator();o.type=type||'triangle';o.frequency.value=f;const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(this.musOut);o.start(t);o.stop(t+d+0.05);},
  _hat(t,v){const ac=this.ac,s=ac.createBufferSource();s.buffer=this.nb;const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=7000;const g=ac.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);s.connect(f);f.connect(g);g.connect(this.musOut);s.start(t,Math.random()*0.5);s.stop(t+0.07);},
  _kick(t){const ac=this.ac,o=ac.createOscillator();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(40,t+0.12);const g=ac.createGain();g.gain.setValueAtTime(0.25,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.15);o.connect(g);g.connect(this.musOut);o.start(t);o.stop(t+0.17);},
  startAmb(){const ac=this.ac,s=ac.createBufferSource();s.buffer=this.nb;s.loop=true;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=420;s.connect(f);f.connect(this.ambOut);s.start();},
  amb(level){if(!this.ambOut||level===this.ambLvl)return;this.ambLvl=level;this.ambOut.gain.setTargetAtTime(level*0.14,this.ac.currentTime,0.6);},
};
// sounds that stay local (never broadcast to online clients)
const SFX_FILES={scream:2,rocket:1,stepToon:4,punchM:5,punchH:5,softM:3,softH:3,glassH:3,glassL:2,woodH:3,woodM:2,metalH:2,metalM:2,plateH:2,bell:1,stepWood:5,stepStone:5,stepCarpet:5};
const VOICE_FILES=['round','final_round','ready','go','you_win','you_lose','its_a_tie','time_over','hurry_up','game_over','congratulations','power_up','level_up','war_look_out','war_fire_in_the_hole','1','2','3','4','5','6','f_you_win','f_you_lose','f_ready'];
const SFX_LOCAL=new Set(['loadSamples','smp','voLocal','init','env','noise','tone','setMuted','step','music','musicTempo','bgm','_musTick','_note','_hat','_kick','startAmb','amb']);


/* ================= THREE SETUP ================= */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('#game').appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#a9cdea');
scene.fog=new THREE.Fog('#a9cdea',34,70);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,140);
camera.position.set(0,9,14);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

const textTex=[];
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);textTex.push({c,t,draw});return t;}
const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.7},o));
function vbox(w,h,d,mat,x,y,z,parent){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(parent||scene).add(m);return m;}
function cyl(rt,rb,h,mat,x,y,z,parent,seg=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.position.set(x,y,z);m.castShadow=true;(parent||scene).add(m);return m;}
function sph(r,mat,x,y,z,parent,ws=14,hs=10){const m=new THREE.Mesh(new THREE.SphereGeometry(r,ws,hs),mat);m.position.set(x,y,z);m.castShadow=true;(parent||scene).add(m);return m;}

/* ================= FX: popups / particles / center text ================= */
const parts=[];const pGeo=new THREE.BoxGeometry(.09,.09,.09);
function burst(p,color,n,spd){for(let i=0;i<n;i++){const m=new THREE.Mesh(pGeo,new THREE.MeshBasicMaterial({color,transparent:true}));m.position.copy(p);scene.add(m);parts.push({m,v:V(rand(-1,1),rand(-.2,1.3),rand(-1,1)).multiplyScalar(spd),t:0,life:rand(.35,.6)});}}
function updParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.t+=dt;p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*8;p.m.material.opacity=1-p.t/p.life;if(p.t>=p.life){scene.remove(p.m);p.m.material.dispose();parts.splice(i,1);}}}
const pops=[];
function popup(text,wp,cls,life=0.9){const el=document.createElement('div');el.className='pop '+cls;el.textContent=text;$('#pops').appendChild(el);pops.push({el,wp:wp.clone(),t:0,life,rise:cls.indexOf('bubble')>=0?0.25:0.9});if(pops.length>40){const o=pops.shift();o.el.remove();}}
function updPops(dt){const W=innerWidth,H=innerHeight;for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt;const v=p.wp.clone();v.y+=p.t*p.rise;v.project(camera);const x=(v.x+1)/2*W,y=(1-v.y)/2*H;const sc=p.t<0.12?0.6+p.t/0.12*0.5:1.1-Math.min(0.1,(p.t-0.12));p.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`;p.el.style.opacity=(v.z>1)?0:(p.t>p.life*0.7?Math.max(0,1-(p.t-p.life*0.7)/(p.life*0.3)):1);if(p.t>=p.life){p.el.remove();pops.splice(i,1);}}}
function clearPops(){pops.forEach(p=>p.el.remove());pops.length=0;}
let centerTimer=null;
function showCenter(h,p,dur=1.2){const c=$('#center');$('#cH').textContent=h;$('#cP').textContent=p||'';c.classList.remove('show');void c.offsetWidth;c.classList.add('show');clearTimeout(centerTimer);if(dur>0)centerTimer=setTimeout(()=>c.classList.remove('show'),dur*1000);}
function hideCenter(){$('#center').classList.remove('show');}
let bannerTimer=null;
function banner(text,dur=3){const b=$('#banner');b.textContent=text;b.classList.add('on');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>b.classList.remove('on'),dur*1000);}
function flashScreen(){const f=$('#flash');f.style.transition='none';f.style.opacity=0.95;void f.offsetWidth;f.style.transition='opacity 1.1s';f.style.opacity=0;}

/* ================= INPUT ================= */
const held=new Set(),pressed=new Set();const touch={x:0,y:0};
const GAMEKEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Semicolon','Slash','Enter','Tab']);
addEventListener('keydown',e=>{
  const tg=e.target;if(tg&&/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)){if(tg.offsetParent!==null&&!document.body.classList.contains('fighting'))return;try{tg.blur();}catch(_){}}
  if(!e.repeat)pressed.add(e.code);held.add(e.code);
  if(typeof G!=='undefined'&&G.phase!=='menu'&&GAMEKEYS.has(e.code))e.preventDefault();
  if(window.onGlobalKey)onGlobalKey(e);
});
addEventListener('keyup',e=>held.delete(e.code));
addEventListener('blur',()=>held.clear());
const has=(set,arr)=>arr.some(c=>set.has(c));
// Mobile: stop iOS/Android from zooming the page (double-tap, pinch while pressing several buttons, input focus)
(function noZoom(){
  const typing=t=>t&&t.closest&&t.closest('input,select,textarea');
  const scrollable=t=>t&&t.closest&&t.closest('.overlay');
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('touchmove',e=>{if(e.touches.length>1||(e.scale&&e.scale!==1)||!scrollable(e.target))e.preventDefault();},{passive:false});
  let lastEnd=0;
  document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastEnd<400&&!typing(e.target))e.preventDefault();lastEnd=now;},{passive:false});
  document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
})();
