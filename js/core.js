'use strict';
const NET={role:'off'};
/* ================= UTILS ================= */
const $=s=>document.querySelector(s);
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function lerpAngle(a,b,t){let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t;}
function angDiff(a,b){return Math.abs(((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI);}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ================= ROSTER ================= */
// sp = key in SPECIALS (fighter.js). emote = victory pose.
const ROSTER=[
 {id:'boss',name:'หัวหน้า',role:'ผู้จัดการร้าน',skin:'#e9b98f',hair:'#2a2a2a',hairStyle:'bald',shirt:'#2d3240',shorts:'#1b1e26',sleeves:true,acc:['tie','glasses'],mustache:true,
  hp:125,pow:1.2,spd:0.86,aspd:0.92,size:1.1,sp:'files',emote:'point',
  quotes:['งานนี้ต้องเสร็จวันนี้!','เข้าประชุมด่วน!','ใครทำรายงานผิด!?','ยอดเดือนนี้ไปไหน!?','OT คืนนี้นะ!','ส่งรายงานยัง!?']},
 {id:'bomb',name:'Bomb',role:'ซีเนียร์ รับจบทุกงาน',skin:'#dcae88',hair:'#151515',hairStyle:'short',shirt:'#1f1f22',shorts:'#2a2a30',sleeves:true,acc:['hood'],
  hp:115,pow:1.12,spd:1.0,aspd:1.0,size:1.03,sp:'finisher',emote:'chill',
  quotes:['เดี๋ยวพี่รับจบ!','งานนี้ง่าย!','ส่งมาเลย!','จบในยกเดียว!','ซีเนียร์มาเอง!']},
 {id:'oat',name:'Oat',role:'หนุ่มผมยาว มือกีตาร์',skin:'#e2b590',hair:'#141414',hairStyle:'longM',shirt:'#222226',shorts:'#2e4a7a',acc:['guitarBack'],
  hp:104,pow:1.06,spd:1.0,aspd:1.02,size:1.02,sp:'chord',emote:'guitar',
  quotes:['ขอโซโล่หน่อย!','จูนสายก่อน!','Drop D มาเลย!','เสียงแตกแล้วนะ!','ร็อคไม่ตาย!']},
 {id:'march',name:'March',role:'ตากล้อง มือตัดต่อ สายออกกำลังกาย',skin:'#e6b48c',hair:'#1c1c1c',hairStyle:'short',shirt:'#1fa3a3',shorts:'#22303a',acc:['glasses','camera'],bulk:1.15,
  hp:112,pow:1.1,spd:1.0,aspd:1.0,size:1.04,sp:'flash',emote:'selfie',
  quotes:['ยิ้มหน่อย แชะ!','เดี๋ยวตัดต่อให้!','วันนี้เล่นอก!','โฟกัสหน้าหน่อย!','เรนเดอร์ไม่ทัน!']},
 {id:'dear',name:'Dear',role:'หน้าเกาหลี ผมปาดเท่ๆ ตัวเล็ก',skin:'#f6d9bf',hair:'#3a2a1f',hairStyle:'swept',eyes:'small',shirt:'#f4f4f4',shorts:'#6b7a8f',acc:[],
  hp:90,pow:0.95,spd:1.18,aspd:1.18,size:0.88,sp:'dash',emote:'dance',
  quotes:['ฮวาอิทติ้ง!','ซารังแฮโย~','ผมยังไม่เซ็ตเลย!','ออปป้ามาแล้ว!','อันยอง!']},
 {id:'kunjae',name:'KunJae',role:'สาวตัวเล็ก นักออกแบบภายใน',skin:'#f3cfb0',hair:'#2b1a12',hairStyle:'bun',fem:true,shirt:'#e8a87c',shorts:'#5b4636',acc:['tape'],
  hp:88,pow:0.96,spd:1.14,aspd:1.15,size:0.84,sp:'pull',emote:'jump',
  quotes:['ขอวัดก่อนนะ!','ห้องนี้ต้องมินิมอล!','โทนสีไม่เข้ากัน!','ย้ายโซฟาหน่อย!','แปลนผิด!']},
 {id:'eye',name:'Eye',role:'สาวผมยาว สายชิล ชุดดำ',skin:'#efc7a6',hair:'#0b0b0b',hairStyle:'long',fem:true,shirt:'#151515',shorts:'#151515',sleeves:true,acc:[],
  hp:98,pow:1.0,spd:1.05,aspd:1.0,size:0.95,sp:'cloud',emote:'chill',
  quotes:['ชิลๆ ก่อน~','ใจเย็นๆ~','ฟินนน~','ไม่รีบ ไม่รีบ','ชุดดำไม่ได้แปลว่าเศร้านะ']},
 {id:'teemee',name:'TeeMee',role:'พี่เซลส์แผนกหนังสือ ทำทุกอย่าง',skin:'#e0aa82',hair:'#222',hairStyle:'short',shirt:'#3b6ea8',shorts:'#2b2b33',acc:['tag','glasses'],
  hp:105,pow:1.02,spd:1.02,aspd:1.02,size:1.0,sp:'random',emote:'bow',
  quotes:['หนังสือมาใหม่ครับ!','อันนี้พี่ทำเอง!','เดี๋ยวพี่จัดให้!','ทำทุกอย่างแล้วเนี่ย!','Hal Leonard มาแล้ว!']},
 {id:'sing',name:'Sing',role:'มือตัดต่อวิดีโอ นักกล้าม',skin:'#d29a72',hair:'#111',hairStyle:'buzz',shirt:'#c0392b',shorts:'#1d1d22',tank:true,acc:['headphones'],bulk:1.35,
  hp:122,pow:1.18,spd:0.95,aspd:0.95,size:1.1,sp:'buff',emote:'flex',
  quotes:['ขาเดย์วันนี้!','เวย์ยังไม่กิน!','ตัดต่อเสร็จแล้ว!','อีกเซ็ต!','กล้ามมาแล้ว!']},
 {id:'sales',name:'พี่เซลส์',role:'ฝ่ายขายหน้าร้าน',skin:'#f1c6a0',hair:'#3b2416',hairStyle:'short',shirt:'#d63a3a',shorts:'#24324a',acc:['tag'],
  hp:100,pow:1.0,spd:1.06,aspd:1.05,size:1.0,sp:'trap',emote:'bow',
  quotes:['ลดให้อีก 5% ครับ!','ลูกค้ารอหน้าร้าน!','ปิดยอดเดือนนี้!','ตัวนี้เสียงดีมากครับ!','ผ่อน 0% ได้นะ!']},
 {id:'tuner',name:'ช่างจูนเปียโน',role:'ช่างเทคนิค',skin:'#d9a27a',hair:'#111111',hairStyle:'spiky',shirt:'#2f6db5',shorts:'#2f3b52',acc:['headband'],
  hp:110,pow:1.12,spd:0.94,aspd:0.95,size:1.03,sp:'fork',emote:'jump',
  quotes:['A440 เป๊ะ!','สายขาดอีกแล้ว!','ตึ๊งงง!','เสียงเพี้ยนนะ!','ค้อนจูนมาแล้ว!']},
 {id:'admin',name:'แอดมินออนไลน์',role:'ตอบแชท/ร้านออนไลน์',skin:'#f3cfae',hair:'#5a2d1a',hairStyle:'long',fem:true,shirt:'#2e9e6a',shorts:'#1f3d33',acc:['headset'],
  hp:92,pow:0.92,spd:1.16,aspd:1.22,size:0.95,sp:'chat',emote:'dance',
  quotes:['แชทเด้ง 99+!','สนใจทักแชทค่ะ!','Shopee เด้งแล้ว!','ส่งของรอบบ่าย!','รีวิว 5 ดาวนะ!']},
 {id:'mover',name:'ทีมยกเปียโน',role:'ขนย้าย/คลังสินค้า',skin:'#c98c63',hair:'#1a1a1a',hairStyle:'short',shirt:'#e67e22',shorts:'#3a2a1a',acc:['cap'],accent:'#f1c40f',bulk:1.15,
  hp:138,pow:1.16,spd:0.8,aspd:0.85,size:1.16,sp:'drop',emote:'flex',
  quotes:['ฮึบ! หนักมาก!','แกรนด์ 300 โล!','ขึ้นชั้น 3 ไม่มีลิฟต์!','ระวังขาเปียโน!','ยกพร้อมกัน 1-2-3!']},
 {id:'acc',name:'ฝ่ายบัญชี',role:'บัญชี/การเงิน',skin:'#f0c4a4',hair:'#1e1e1e',hairStyle:'bob',fem:true,shirt:'#7d4fb0',shorts:'#2c2340',acc:['glasses'],
  hp:98,pow:1.05,spd:1.0,aspd:1.0,size:0.98,sp:'audit',emote:'bow',
  quotes:['บิลไม่ตรง!','ใบกำกับภาษีล่ะ?','ยอดไม่บาลานซ์!','เบิกไม่ได้นะ!','ส่งใบเสร็จมาด้วย!']},
];
const HURT=['โอ๊ย!','เจ็บนะ!','ขอลาป่วย!','จะฟ้อง HR!','ขอเบิกค่ารักษา!','ยังไม่ได้กินข้าวเลย!','พักเที่ยงก่อน!','ขอลาพักร้อน!','ประกันสังคมช่วยด้วย!'];
const GLOVES=[
 {name:'สีทีม',need:0},
 {name:'ทองคำ',need:1,color:'#ffcc33',metal:.85,rough:.25},
 {name:'ม่วงนีออน',need:2,color:'#b04dff',em:'#8a2bff'},
 {name:'ลายเสือ',need:3,tiger:true},
 {name:'สีรุ้ง',need:5,rainbow:true},
];
const TITLES=[[0,'พนักงานใหม่'],[1,'พนักงานประจำ'],[3,'หัวหน้าแผนก'],[5,'พนักงานดีเด่นประจำเดือน'],[10,'ตำนานสุขุมวิท 26']];
function titleOf(w){let t=TITLES[0][1];for(const[n,s]of TITLES)if(w>=n)t=s;return t;}

/* ================= SAVE ================= */
const SAVE_KEY='officeFight.v2';
const STATS={wins:{}};
function loadSave(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem('officeFight.v1')||'{}');
    if(s.wins)STATS.wins=s.wins;
    ROSTER.forEach(c=>{
      if(s.names&&s.names[c.id])c.name=s.names[c.id];
      c.glove=(s.gloves&&s.gloves[c.id])||0;
      if(s.photos&&s.photos[c.id]){c.photoData=s.photos[c.id];const im=new Image();im.onload=()=>{c.photoImg=im;if(window.refreshFaces)refreshFaces();};im.src=c.photoData;}
    });
  }catch(e){ROSTER.forEach(c=>c.glove=c.glove||0);}
}
function saveAll(){
  try{const s={names:{},photos:{},gloves:{},wins:STATS.wins};ROSTER.forEach(c=>{s.names[c.id]=c.name;s.gloves[c.id]=c.glove||0;if(c.photoData)s.photos[c.id]=c.photoData;});localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}
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
  const ex=30,ey=cy-6,small=ch.eyes==='small';
  g.fillStyle='rgba(255,90,90,.28)';for(const s of[-1,1]){g.beginPath();g.arc(cx+s*48,cy+18,13,0,Math.PI*2);g.fill();}
  g.strokeStyle=ink;g.fillStyle=ink;g.lineCap='round';g.lineJoin='round';
  for(const s of[-1,1]){
    const x=cx+s*ex,y=ey;
    if(expr==='hurt'){g.lineWidth=5;g.beginPath();g.moveTo(x-s*10,y-9);g.lineTo(x+s*6,y);g.lineTo(x-s*10,y+9);g.stroke();}
    else if(expr==='ko'){g.lineWidth=5;g.beginPath();g.moveTo(x-9,y-9);g.lineTo(x+9,y+9);g.moveTo(x+9,y-9);g.lineTo(x-9,y+9);g.stroke();}
    else if(expr==='win'){g.lineWidth=5;g.beginPath();g.arc(x,y+5,10,Math.PI*1.15,Math.PI*1.85);g.stroke();}
    else{
      const ry=small?(expr==='attack'?5:7):(expr==='attack'?8:13),rx=small?11:11;
      g.fillStyle='#fff';g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
      g.lineWidth=2.5;g.stroke();
      g.fillStyle=ink;g.beginPath();g.arc(x-s,y+1,small?5:6,0,Math.PI*2);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(x+2,y-2,2,0,Math.PI*2);g.fill();
      if(ch.fem){g.lineWidth=3;g.beginPath();g.moveTo(x+s*9,y-ry+2);g.lineTo(x+s*16,y-ry-4);g.moveTo(x+s*4,y-ry);g.lineTo(x+s*8,y-ry-7);g.stroke();}
    }
    g.lineWidth=ch.fem?4:6;g.strokeStyle=ink;g.beginPath();
    if(expr==='attack'){g.moveTo(x+s*14,ey-28);g.lineTo(x-s*14,ey-14);}
    else if(expr==='hurt'){g.moveTo(x+s*14,ey-17);g.lineTo(x-s*12,ey-27);}
    else if(expr==='normal'){g.moveTo(x+s*14,ey-22);g.lineTo(x-s*12,ey-18);}
    g.stroke();
  }
  if(ch.acc.includes('glasses')){g.strokeStyle='#111';g.lineWidth=4;for(const s of[-1,1]){g.beginPath();g.arc(cx+s*ex,ey,18,0,Math.PI*2);g.stroke();}g.beginPath();g.moveTo(cx-12,ey);g.lineTo(cx+12,ey);g.moveTo(cx-48,ey-2);g.lineTo(cx-78,ey-6);g.moveTo(cx+48,ey-2);g.lineTo(cx+78,ey-6);g.stroke();}
  g.strokeStyle='rgba(120,60,30,.55)';g.lineWidth=4;g.beginPath();g.arc(cx,cy+10,6,0.1*Math.PI,0.9*Math.PI);g.stroke();
  if(ch.mustache){g.fillStyle='#3a3a3a';for(const s of[-1,1]){g.beginPath();g.ellipse(cx+s*12,cy+21,14,5,s*0.2,0,Math.PI*2);g.fill();}}
  g.strokeStyle=ink;g.fillStyle='#4a1010';g.lineWidth=4;const my=cy+34;
  if(expr==='attack'){g.beginPath();g.ellipse(cx,my,16,12,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(cx-11,my-10,22,5);}
  else if(expr==='hurt'){g.beginPath();g.ellipse(cx,my+2,9,11,0,0,Math.PI*2);g.fill();g.stroke();}
  else if(expr==='ko'){g.beginPath();g.ellipse(cx,my,14,10,0,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#ff7b9a';g.beginPath();g.ellipse(cx+4,my+8,7,8,0,0,Math.PI*2);g.fill();}
  else if(expr==='win'){g.beginPath();g.moveTo(cx-20,my-6);g.quadraticCurveTo(cx,my+28,cx+20,my-6);g.closePath();g.fill();g.stroke();}
  else if(ch.fem){g.fillStyle='#d9536b';g.beginPath();g.ellipse(cx,my-6,10,5,0,0,Math.PI*2);g.fill();}
  else{g.beginPath();g.arc(cx,my-12,15,0.25*Math.PI,0.75*Math.PI);g.stroke();}
}
function portrait(ch,cv,expr){
  const tmp=document.createElement('canvas');tmp.width=512;tmp.height=256;drawFace(tmp,ch,expr||'normal');
  const g=cv.getContext('2d'),w=cv.width,h=cv.height;
  const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#5a3d6e');bg.addColorStop(1,'#2a1b33');g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.fillStyle=ch.shirt;g.beginPath();g.ellipse(w/2,h*1.02,w*0.42,h*0.22,0,0,Math.PI*2);g.fill();
  g.save();g.beginPath();g.arc(w/2,h*0.5,w*0.4,0,Math.PI*2);g.clip();
  g.drawImage(tmp,128-100,130-104,200,200,w/2-w*0.4,h*0.5-w*0.4,w*0.8,w*0.8);g.restore();
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=w*0.02;g.beginPath();g.arc(w/2,h*0.5,w*0.4,0,Math.PI*2);g.stroke();
}

/* ================= AUDIO ================= */
const SFX={ac:null,nb:null,muted:false,
  init(){try{if(!this.ac){this.ac=new(window.AudioContext||window.webkitAudioContext)();const n=this.ac.sampleRate;const b=this.ac.createBuffer(1,n,n);const d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.nb=b;}if(this.ac.state==='suspended')this.ac.resume();}catch(e){}},
  env(g,t,a,p,d){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(p,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+d);},
  noise(dur,type,f,q,peak,to,a=0.005,delay=0){const ac=this.ac;if(!ac||this.muted)return;const t=ac.currentTime+delay;const s=ac.createBufferSource();s.buffer=this.nb;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);fl.Q.value=q;const g=ac.createGain();this.env(g,t,a,peak,dur);s.connect(fl);fl.connect(g);g.connect(ac.destination);s.start(t);s.stop(t+dur+0.05);},
  tone(type,f0,f1,dur,peak,delay=0){const ac=this.ac;if(!ac||this.muted)return;const t=ac.currentTime+delay;const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ac.createGain();this.env(g,t,0.005,peak,dur);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+dur+0.05);},
  whoosh(){this.noise(0.14,'bandpass',600,1.2,0.1,2400);},
  hit(h){this.noise(h?0.22:0.12,'lowpass',h?1000:2200,0.7,h?0.9:0.55);this.tone('sine',h?140:200,40,h?0.2:0.1,h?0.8:0.5);},
  block(){this.tone('square',380,220,0.07,0.1);this.noise(0.06,'highpass',2500,0.7,0.22);},
  bell(){[0,0.32].forEach(d=>{this.tone('sine',1320,0,1.2,0.3,d);this.tone('sine',2640,0,0.8,0.1,d);this.tone('triangle',660,0,1.0,0.14,d);});},
  crowd(){this.noise(1.8,'bandpass',700,0.4,0.3,0,0.3);this.noise(1.4,'bandpass',1500,0.6,0.12,0,0.3);},
  piano(){const base=[48,50,52,53,55,57,59,60,62,64,65,67];for(let i=0;i<4;i++){const m=pick(base)+(Math.random()<.3?12:0);const f=440*Math.pow(2,(m-69)/12);const d=Math.random()*0.03;this.tone('triangle',f,0,1.4,0.16,d);this.tone('sine',f*2,0,0.7,0.05,d);}this.noise(0.1,'lowpass',500,0.7,0.5);},
  thud(){this.tone('sine',90,35,0.25,0.7);this.noise(0.15,'lowpass',600,0.7,0.5);},
  guitar(){[82.4,110,146.8,196,246.9,329.6].forEach((x,i)=>this.tone('sawtooth',x,0,1.0,0.05,i*0.015));},
  chord(){[82.4,123.5,164.8,82.4*2].forEach(x=>{this.tone('sawtooth',x,0,1.3,0.12);this.tone('square',x*1.005,0,1.1,0.05);});this.noise(0.3,'lowpass',900,0.7,0.4);},
  glass(){this.tone('sine',2400,0,0.5,0.18);this.tone('sine',3150,0,0.4,0.1,0.02);this.noise(0.12,'highpass',4000,0.7,0.3);},
  alarm(){for(let i=0;i<6;i++)this.tone('square',i%2?880:660,0,0.14,0.08,i*0.16);},
  horn(){this.tone('square',420,0,0.25,0.12);this.tone('square',520,0,0.25,0.08);this.tone('square',420,0,0.22,0.12,0.32);},
  engine(){this.noise(1.6,'lowpass',260,3,0.35,900,0.2);this.tone('sawtooth',70,140,1.4,0.08);},
  bark(){this.tone('square',600,300,0.09,0.15);this.tone('square',650,320,0.09,0.15,0.16);},
  chime(){this.tone('sine',1046,0,0.7,0.25);this.tone('sine',784,0,0.9,0.25,0.35);},
  shutter(){this.noise(0.04,'highpass',3000,0.7,0.6);this.noise(0.05,'bandpass',1800,2,0.4,0,0.005,0.07);},
  smoke(){this.noise(1.2,'highpass',1800,0.5,0.18,600,0.1);},
  pickup(){this.tone('square',660,990,0.09,0.08);},
  drink(){this.tone('sine',400,900,0.12,0.18);this.tone('sine',500,1100,0.12,0.15,0.13);},
  jump(){this.tone('sine',300,520,0.1,0.08);},
  crash(){this.piano();this.thud();this.noise(0.5,'lowpass',1400,0.6,0.7);},
  zap(){this.tone('sawtooth',900,200,0.25,0.12);},
};

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
  if(e.target&&e.target.tagName==='INPUT')return;
  if(!e.repeat)pressed.add(e.code);held.add(e.code);
  if(typeof G!=='undefined'&&G.phase!=='menu'&&GAMEKEYS.has(e.code))e.preventDefault();
  if(window.onGlobalKey)onGlobalKey(e);
});
addEventListener('keyup',e=>held.delete(e.code));
addEventListener('blur',()=>held.clear());
const has=(set,arr)=>arr.some(c=>set.has(c));
