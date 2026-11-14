'use strict';
/* ==========================================================================
   ONLINE PLAY — claude.ai `room` capability, host-authoritative.
   Everything travels in presence (allowed for every viewer, no topic rights):
     lobby   : {rc,jt,nm,c,gl,lo,v,st}         (room code, join time, nickname, char, glove, [style,special], visible, host settings)
     host    : + {g: match config, s: snapshot}  (~20 Hz, kept < 3.4 KB)
     client  : + {in: [mx,mz,block, jab#,hook#,special#,jump#,grab#]}  (press counters, not edges)
   The host runs the normal offline simulation; remote fighters read netInput().
   Clients never simulate: they interpolate fighter poses from snapshots and replay fx events.
   ========================================================================== */
Object.assign(NET,{ack:{},room:null,code:'',jt:0,cfg:null,hostPeer:null,mySlot:-1,declined:null,
  seq:0,fxSeq:0,fxBuf:[],lastFx:0,snaps:[],lastSnapI:-1,lastSendT:0,inCnt:[0,0,0,0,0],lastIn:'',lastInT:0,remote:{},lastHostSeen:0,curPhase:'',endShown:false,
  set:{mode:'ffa',diff:1,loc:'in'},cl:{items:new Map(),projs:new Map(),bikes:new Map(),movers:null,cust:null},maxSize:0});
const PHASES=['menu','intro','fight','ko','replay','post','between','end'];
const STATES=['idle','block','attack','stun','down','ko','grab','grabbed','recover','dash'];
const WT=Object.keys(WEAPONS),PT=Object.keys(POWER),PK=['file','chat','book','paper','thrown'];
const Q=v=>Math.round((+v||0)*100);
const UQ=v=>(+v||0)/100;
const ENC=new TextEncoder();
const isHost=()=>NET.role==='host';
const safeStr=(s,n)=>String(s==null?'':s).slice(0,n||40);

/* ---------- broadcast hooks: host replays its own effects on every client ---------- */
function netFx(...a){NET.fxBuf.push({t:performance.now(),e:[++NET.fxSeq,...a]});if(NET.fxBuf.length>48)NET.fxBuf.shift();}
const RAWF={popup,burst,showCenter,hideCenter,banner,ringFx,cloudAt,dropAt,couponAt,addTape,flashFor};
popup=function(text,wp,cls,life){RAWF.popup(text,wp,cls,life);if(isHost())netFx('p',safeStr(text,40),Q(wp.x),Q(wp.y),Q(wp.z),cls,life||0.9);};
burst=function(p,color,n,spd){RAWF.burst(p,color,n,spd);if(isHost()&&n>=5)netFx('b',Q(p.x),Q(p.y),Q(p.z),color,n,spd);};
showCenter=function(h,p,dur){RAWF.showCenter(h,p,dur);if(isHost())netFx('c',safeStr(h),safeStr(p,60),dur===undefined?1.2:dur);};
hideCenter=function(){RAWF.hideCenter();if(isHost())netFx('h');};
banner=function(t,d){RAWF.banner(t,d);if(isHost())netFx('n',safeStr(t,60),d===undefined?3:d);};
ringFx=function(x,y,z,r,c,l){RAWF.ringFx(x,y,z,r,c,l);if(isHost())netFx('r',Q(x),Q(y),Q(z),r,c,l||0.45);};
cloudAt=function(x,y,z,o){const r=RAWF.cloudAt(x,y,z,o);if(isHost()&&o)netFx('cl',Q(x),Q(y),Q(z));return r;};
dropAt=function(x,z,o,k){const r=RAWF.dropAt(x,z,o,k);if(isHost()&&o)netFx('dr',Q(x),Q(z),k==='sofa'?'sofa':'grand');return r;};
couponAt=function(id,sx,sy,sz,x,y,z,o){const c=RAWF.couponAt(id,sx,sy,sz,x,y,z,o);if(isHost()&&o)netFx('cp',id,Q(sx),Q(sy),Q(sz),Q(x),Q(y),Q(z));return c;};
couponGone=function(c){if(isHost())netFx('cx',c.id);};
addTape=function(a,b){RAWF.addTape(a,b);if(isHost())netFx('tp',G.f.indexOf(a),G.f.indexOf(b));};
flashFor=function(f){RAWF.flashFor(f);if(isHost())netFx('fl',G.f.indexOf(f));};
const RAWF2={puff,windFx,koDust};
puff=function(x,y,z,c,n,sz,sp){RAWF2.puff(x,y,z,c,n,sz,sp);if(isHost()&&n>=4)netFx('pf',Q(x),Q(y),Q(z),c,n,sz,sp);};
let windNetT=0;windFx=function(x,y,z,a,l){RAWF2.windFx(x,y,z,a,l);const now=performance.now();if(isHost()&&now-windNetT>120){windNetT=now;netFx('wd',Q(x),Q(y),Q(z),Q(a),l);}};
koDust=function(p,t){RAWF2.koDust(p,t);if(isHost())netFx('kd',Q(p.x),Q(p.y),Q(p.z),safeStr(t,20));};
RAWF0.popup=RAWF.popup;RAWF0.burst=RAWF.burst;
const RAWS={};let sfxDepth=0;
SFX_RAW=k=>{const fn=RAWS[k]||SFX[k];if(typeof fn==='function')fn.call(SFX);};
Object.keys(SFX).forEach(k=>{const fn=SFX[k];if(typeof fn!=='function')return;RAWS[k]=fn;if(SFX_LOCAL.has(k))return;
  SFX[k]=function(...a){const top=sfxDepth===0;sfxDepth++;try{return fn.apply(SFX,a);}finally{sfxDepth--;if(top&&isHost())netFx('s',k,...a);}};});
function playFx(e){
  const t=e[1];
  if(t==='p')RAWF.popup(safeStr(e[2]),V(UQ(e[3]),UQ(e[4]),UQ(e[5])),safeStr(e[6],20).replace(/[^a-z ]/g,''),+e[7]||0.9);
  else if(t==='b')RAWF.burst(V(UQ(e[2]),UQ(e[3]),UQ(e[4])),e[5]|0,Math.min(20,e[6]|0),+e[7]||2);
  else if(t==='s'){if(RAWS[e[2]])RAWS[e[2]].apply(SFX,e.slice(3).map(x=>typeof x==='number'||typeof x==='string'?x:0));}
  else if(t==='c')RAWF.showCenter(safeStr(e[2]),safeStr(e[3],60),+e[4]);
  else if(t==='h')RAWF.hideCenter();
  else if(t==='n')RAWF.banner(safeStr(e[2],60),+e[3]||3);
  else if(t==='r')RAWF.ringFx(UQ(e[2]),UQ(e[3]),UQ(e[4]),clamp(+e[5]||1,0.1,8),e[6]|0,+e[7]||0.45);
  else if(t==='cl')RAWF.cloudAt(UQ(e[2]),UQ(e[3]),UQ(e[4]),null);
  else if(t==='dr')RAWF.dropAt(UQ(e[2]),UQ(e[3]),null,e[4]==='sofa'?'sofa':'grand');
  else if(t==='cp')RAWF.couponAt(e[2],UQ(e[3]),UQ(e[4]),UQ(e[5]),UQ(e[6]),UQ(e[7]),UQ(e[8]),null);
  else if(t==='cx'){const c=coupons.find(c=>c.id===e[2]);if(c)c.gone=true;}
  else if(t==='tp'){const a=G.f[e[2]],b=G.f[e[3]];if(a&&b)RAWF.addTape(a,b);}
  else if(t==='pf')RAWF2.puff(UQ(e[2]),UQ(e[3]),UQ(e[4]),e[5]|0,Math.min(30,e[6]|0),clamp(+e[7]||0.5,0.1,3),clamp(+e[8]||1,0,8));
  else if(t==='wd'){for(let i=0;i<3;i++)RAWF2.windFx(UQ(e[2])+rand(-.4,.4),UQ(e[3])+rand(-.6,.6),UQ(e[4])+rand(-.4,.4),UQ(e[5])+rand(-.3,.3),clamp(+e[6]||2,0.5,6));}
  else if(t==='kd')koDustFx(V(UQ(e[2]),UQ(e[3]),UQ(e[4])),safeStr(e[5],20));
  else if(t==='fl'){if(e[2]===NET.mySlot&&NET.mySlot>=0)flashScreen();}
}

/* ---------- room helpers ---------- */
function members(){
  if(!NET.room||!NET.code)return[];
  return NET.room.peers().filter(p=>p.kind!=='agent'&&p.presence&&p.presence.rc===NET.code)
    .slice().sort((a,b)=>((+a.presence.jt||0)-(+b.presence.jt||0))||(a.peer<b.peer?-1:1));
}
function myPeerId(){if(!NET.room)return null;const p=NET.room.peers().find(p=>p.sameTab);return p?p.peer:null;}
function lobbyHost(){const m=members();if(NET.room&&NET.room.p2p)return m.find(p=>p.peer===P2P_PREFIX+NET.code)||null;return m.find(p=>p.presence.v!==0)||m[0]||null;}
function amLobbyHost(){const h=lobbyHost();return!!(h&&h.sameTab);}
function setPresence(patch){if(!NET.room)return;NET.room.presence(patch).then(()=>{},err=>{if(err&&err.code==='invalid_argument')console.warn('presence',err.message);});}
function myLobbyPresence(){const c=+$('#onChar').value||0;const ch=ROSTER[c]||ROSTER[0];return{rc:NET.code,jt:NET.jt,nm:safeStr(ch.name,18),c,gl:ch.glove|0,lo:[$('#onStyle').value||'box',$('#onSp').value||ch.sp],bd:1,v:document.hidden?0:1};}
const cleanLo=a=>({st:a&&STYLES[a[0]]?a[0]:'box',sp:a&&SP_LIST.includes(a[1])?a[1]:'rush'});
document.addEventListener('visibilitychange',()=>{if(NET.code)setPresence({v:document.hidden?0:1});});

/* ---------- lobby UI ---------- */
function newCode(){const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
function showOnline(msg){
  $('#menu').classList.add('hidden');$('#onlineP').classList.remove('hidden');
  const sel=$('#onChar');if(!sel.options.length)ROSTER.forEach((c,i)=>{const o=document.createElement('option');o.value=i;sel.appendChild(o);});
  ROSTER.forEach((c,i)=>{sel.options[i].textContent=c.name+' — '+c.role;});
  const ss=$('#onStyle'),sp=$('#onSp'),lo=STATS.lo[0]||{st:'box',sp:'rush'};
  if(!ss.options.length){STYLE_KEYS.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=STYLES[k].icon+' '+STYLES[k].name;ss.appendChild(o);});ss.value=lo.st;
    SP_LIST.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=(SP_ICON[k]||'')+' '+SPECIALS[k].name;sp.appendChild(o);});sp.value=SPECIALS[lo.sp]?lo.sp:'rush';}
  if(!NET.code)sel.value=G.slots[0];SFX.music(true);
  portrait(ROSTER[+sel.value],$('#onPic'));
  const ready=!!NET.room||NET.p2p;
  $('#onMsg').textContent=msg||(ready?'':'กำลังเตรียมระบบออนไลน์... รอสักครู่แล้วลองใหม่');
  $('#onCreate').disabled=$('#onEnter').disabled=!ready||joining;
  $('#onVia').textContent=NET.p2p?'เชื่อมต่อแบบ P2P ผ่านอินเทอร์เน็ต — เพื่อนเปิดลิงก์เกมนี้แล้วใส่รหัสห้องได้เลย ไม่ต้องล็อกอิน':'เชื่อมต่อผ่านระบบห้องของ claude.ai — เพื่อนต้องล็อกอิน claude.ai และเปิดลิงก์ที่คุณแชร์';
  renderLobby();
}
let joining=false;
async function enterRoom(code,create){
  code=String(code||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,6);
  if(code.length<3){$('#onMsg').textContent='ใส่รหัสห้องให้ถูกก่อนนะ';return;}
  if(NET.p2p){
    if(joining)return;joining=true;$('#onCreate').disabled=$('#onEnter').disabled=true;
    $('#onMsg').textContent=create?'กำลังสร้างห้อง...':'กำลังเชื่อมต่อห้อง '+code+' ...';
    try{
      await loadPeerJS();
      let room=null;
      for(let k=0;k<3&&!room;k++){
        try{room=await p2pRoom(code,create);}
        catch(e){if(create&&e.message==='taken'){code=newCode();continue;}throw e;}
      }
      NET.room=room;
      room.onClose(()=>{NET.room=null;const inMatch=NET.role==='client';NET.code='';NET.role='off';if(inMatch)toLobby('โฮสต์ปิดห้องแล้ว');else if(!$('#onlineP').classList.contains('hidden'))showOnline('โฮสต์ปิดห้องแล้ว');});
    }catch(e){
      joining=false;$('#onCreate').disabled=$('#onEnter').disabled=false;
      $('#onMsg').textContent=e.message==='nohost'?'เข้าห้องไม่ได้: ไม่พบรหัสนี้ หรือเน็ตของเครื่องใดเครื่องหนึ่งบล็อกการเชื่อมต่อตรง (P2P)':e.message==='load'?'โหลดระบบออนไลน์ไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วลองใหม่':'เชื่อมต่อไม่ได้ ('+e.message+') ลองใหม่อีกครั้ง';
      return;
    }
    joining=false;$('#onCreate').disabled=$('#onEnter').disabled=false;
  }
  if(!NET.room){$('#onMsg').textContent='ระบบออนไลน์ยังไม่พร้อม';return;}
  SFX.init();NET.code=code;NET.jt=Date.now();NET.role='lobby';NET.declined=null;
  setPresence(Object.assign(myLobbyPresence(),{g:null,s:null,in:null,st:null}));
  $('#onMsg').textContent='';renderLobby();
}
function leaveRoom(){NET.code='';NET.role='off';if(NET.room&&NET.room.p2p){NET.room.close();NET.room=null;}else setPresence({rc:null,jt:null,g:null,s:null,in:null,st:null});renderLobby();}
function renderLobby(){
  const inRoom=!!NET.code;
  $('#onJoinBox').classList.toggle('hidden',inRoom);$('#onLobby').classList.toggle('hidden',!inRoom);
  if(!inRoom)return;
  $('#onCodeShow').textContent=NET.code;
  const m=members(),host=lobbyHost(),me=amLobbyHost();
  const box=$('#onPlayers');box.innerHTML='';
  m.slice(0,6).forEach((p,i)=>{const pr=p.presence,ci=clamp(+pr.c|0,0,ROSTER.length-1);const row=document.createElement('div');row.className='onp';
    const cv=document.createElement('canvas');cv.width=cv.height=88;portrait(ROSTER[ci],cv);row.appendChild(cv);
    const w=document.createElement('div');w.className='who';w.textContent=(host&&p.peer===host.peer?'👑 ':'')+safeStr(pr.nm||ROSTER[ci].name,18)+(p.sameTab?' (คุณ)':'')+(pr.v===0?' 💤':'');
    const sm=document.createElement('small');sm.textContent=i<4?(ROSTER[ci].role):'ห้องเต็ม — รอตาถัดไป';w.appendChild(sm);row.appendChild(w);box.appendChild(row);});
  if(m.length<4){const r=document.createElement('div');r.className='onp';r.style.opacity=.55;r.textContent='🤖 ช่องว่าง '+(4-Math.min(4,m.length))+' ช่อง — คอมเล่นแทน (ส่งรหัสห้องให้เพื่อนได้เลย)';box.appendChild(r);}
  $('#onHostBox').classList.toggle('hidden',!me);$('#onWait').classList.toggle('hidden',me);
  const st=host&&host.presence.st;
  if(!me&&st)$('#onWait').textContent='รอโฮสต์กดเริ่มเกม... (โหมด: '+({duel:'ดวล 1v1',ffa:'ตะลุมบอน 4 คน',team:'ทีม 2v2'}[st.m]||'-')+')';
  [['onMode','mode'],['onDiff','diff'],['onLoc','loc']].forEach(([id,k])=>document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===String(NET.set[k]))));
  const live=host&&host.presence.g&&!host.sameTab;
  $('#onRejoin').classList.toggle('hidden',!(live&&NET.declined===host.presence.g.id));
}
$('#onlineBtn').addEventListener('click',()=>{SFX.init();showOnline();});
$('#onBack').addEventListener('click',()=>{if(NET.code)leaveRoom();$('#onlineP').classList.add('hidden');$('#menu').classList.remove('hidden');});
$('#onCreate').addEventListener('click',()=>enterRoom(newCode(),true));
$('#onEnter').addEventListener('click',()=>enterRoom($('#onCode').value));
$('#onCode').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')enterRoom($('#onCode').value);});
$('#onLeave').addEventListener('click',leaveRoom);
['#onStyle','#onSp'].forEach(q=>$(q).addEventListener('change',()=>{STATS.lo[0]={st:$('#onStyle').value,sp:$('#onSp').value};saveAll();if(NET.code)setPresence(myLobbyPresence());}));
$('#onChar').addEventListener('change',()=>{portrait(ROSTER[+$('#onChar').value],$('#onPic'));if(NET.code)setPresence(myLobbyPresence());renderLobby();});
$('#onCopy').addEventListener('click',()=>{try{navigator.clipboard.writeText(NET.code).then(()=>$('#onCopy').textContent='คัดลอกแล้ว ✓',()=>{});}catch(e){}});
$('#onRejoin').addEventListener('click',()=>{NET.declined=null;});
[['onMode','mode'],['onDiff','diff'],['onLoc','loc']].forEach(([id,k])=>document.querySelectorAll('#'+id+' button').forEach(b=>b.addEventListener('click',()=>{NET.set[k]=k==='diff'?+b.dataset.v:b.dataset.v;setPresence({st:{m:NET.set.mode,d:NET.set.diff,l:NET.set.loc}});renderLobby();})));
$('#onStart').addEventListener('click',()=>{if(amLobbyHost())netHostStart();});
setInterval(()=>{
  if(!NET.room||!NET.code)return;
  if(NET.role==='lobby'){
    if(!$('#onlineP').classList.contains('hidden'))renderLobby();
    const h=lobbyHost();
    if(h&&!h.sameTab&&h.presence.g&&h.presence.g.id&&NET.declined!==h.presence.g.id)netAdopt(h);
  }
},350);

/* ---------- match setup (host and clients build the same fighters) ---------- */
function netBuildMatch(cfg){
  ['#onlineP','#menu','#endP','#pause','#interP','#shotP','#photoBar'].forEach(s=>$(s).classList.add('hidden'));
  clearFighters();G.mode=cfg.mode;G.diff=G.baseDiff=clamp(cfg.diff|0,0,2);G.loc=['out','up','back','wing'].includes(cfg.loc)?cfg.loc:'in';G.humans=1;G.roundLoc=null;G.paused=false;G.photo=false;
  const me=myPeerId();NET.mySlot=-1;let pn=0;
  cfg.sl.forEach((s,i)=>{const peer=s[0]||'',ci=clamp(s[1]|0,0,ROSTER.length-1),base=ROSTER[ci];
    const ch=Object.assign({},base,{body:s[6]?'3d':'chibi',name:safeStr(s[2]||base.name,18),glove:clamp(s[3]|0,0,GLOVES.length-1),photoImg:peer&&peer===me?base.photoImg:null});
    const team=cfg.mode==='team'?(i<2?0:1):i,color=cfg.mode==='team'?TEAMCOL[team][i%2]:SLOTCOL[i];
    const isMe=!!peer&&peer===me;if(isMe)NET.mySlot=i;
    const f=new Fighter(ch,i,{human:isMe?0:null,team,color,label:peer?'P'+(++pn):'คอม',lo:cleanLo([s[4],s[5]])});
    f.player=!!peer;f.net=(NET.role==='host'&&peer&&!isMe)?peer:null;
    G.f.push(f);});
  placeFighters(G.loc);buildTags();
}
function netHostStart(){
  const m=members().slice(0,4);
  let mode=NET.set.mode;if(mode==='duel'&&m.length>2)mode='ffa';
  const n=mode==='duel'?2:4,order=mode==='team'?[0,2,1,3]:[0,1,2,3],sl=new Array(n).fill(null);
  m.forEach((p,i)=>{if(i<n){const c=clamp(+p.presence.c|0,0,ROSTER.length-1);const l=cleanLo(p.presence.lo);sl[order[i]]=[p.peer,c,safeStr(p.presence.nm||ROSTER[c].name,18),p.presence.gl|0,l.st,l.sp,p.presence.bd?1:0];}});
  for(let i=0;i<n;i++)if(!sl[i]){const c=Math.floor(Math.random()*ROSTER.length),l=randLoadout();sl[i]=['',c,ROSTER[c].name,0,l.st,l.sp,ROSTER[c].body==='3d'?1:0];}
  NET.cfg={id:Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36),mode,diff:NET.set.diff,loc:NET.set.loc,sl};
  NET.role='host';NET.fxBuf=[];NET.fxSeq=0;NET.remote={};NET.ack={};NET.seq=0;
  setPresence({g:NET.cfg,s:null,in:null});
  SFX.init();netBuildMatch(NET.cfg);G.wins={};G.round=1;G.matchBill=0;enterFightUI();startRound();
}
function netAdopt(h){
  NET.role='client';NET.inSeq=0;NET.inFirst=0;NET.ackSeen=0;NET.ackT=performance.now();NET.hostPeer=h.peer;NET.cfg=h.presence.g;NET.snaps=[];NET.lastSnapI=-1;NET.lastFx=0;NET.curPhase='';NET.endShown=false;NET.inCnt=[0,0,0,0,0];NET.lastIn='';NET.lastHostSeen=performance.now();
  SFX.init();netClientClear();netBuildMatch(NET.cfg);enterFightUI();G.phase='intro';G.wins={};
}
function netClientClear(){
  const C=NET.cl;for(const m of[C.items,C.projs,C.bikes]){for(const o of m.values())scene.remove(o.mesh||o.g);m.clear();}
  if(C.movers){scene.remove(C.movers.g);C.movers=null;}if(C.cust){scene.remove(C.cust.g);C.cust=null;}if(C.van){scene.remove(C.van);C.van=null;}resetEvents();
  items.slice().forEach(it=>scene.remove(it.mesh));items.length=0;WSPOTS.forEach(s=>{s.item=null;s.resp=0;});PSPOTS.forEach(s=>s.item=null);
  NPC.bikes.forEach(b=>scene.remove(b.o.g));NPC.bikes.length=0;
  if(NPC.movers){scene.remove(NPC.movers.g);NPC.movers=null;}if(NPC.customer){scene.remove(NPC.customer.p.g);NPC.customer=null;}
  projs.slice().forEach(p=>scene.remove(p.mesh));projs.length=0;clearEffects();restorePanes();BRK.forEach(b=>{if(b.brk.broken)brkVisual(b,false);});G.rain=0;G.watch=0;
}
function toLobby(msg){
  const wasClient=NET.role==='client';
  if(wasClient)netClientClear();
  NET.role=NET.code?'lobby':'off';
  toMenu();$('#menu').classList.add('hidden');showOnline(msg);
}
function netQuitMatch(){
  if(NET.role==='host'){setPresence({g:null,s:null});}
  else if(NET.cfg)NET.declined=NET.cfg.id;
  toLobby();
}
function netAbort(msg){if(NET.cfg)NET.declined=NET.cfg.id;toLobby(msg);}

/* ---------- host side ---------- */
function netInput(f){
  const it={mx:0,mz:0,atk:null,block:false,jump:false,grab:false};
  const p=NET.room&&NET.room.peers().find(q=>q.peer===f.net);
  if(!p||!p.presence||!Array.isArray(p.presence.in))return it;
  const a=p.presence.in,c=[3,4,5,6,7].map(i=>Math.max(0,a[i]|0));
  const L=NET.remote[f.slot]||(NET.remote[f.slot]=c.slice());
  it.mx=clamp(+a[0]||0,-100,100)/100;it.mz=clamp(+a[1]||0,-100,100)/100;it.block=!!a[2];
  if(c[2]>L[2])it.atk='special';else if(c[1]>L[1])it.atk='hook';else if(c[0]>L[0])it.atk='jab';
  it.jump=c[3]>L[3];it.grab=c[4]>L[4];
  NET.remote[f.slot]=c;NET.ack[f.slot]=a[8]|0;return it;
}
function buildSnap(){
  const s={i:++NET.seq,ph:Math.max(0,PHASES.indexOf(G.phase)),t:Math.ceil(G.timer),r:G.round,w:[0,1,2,3].map(t=>G.wins[t]||0),wt:G.matchWinner==null?-1:G.matchWinner,sh:Q(G.shake),rn:G.rain>0?Math.ceil(G.rain):0,hy:Q(hype)};
  s.f=G.f.map(f=>{const a=f.snap();const bits=(f.fx.dizzy>0?1:0)|(f.fx.slow>0?2:0)|(f.fx.buff>0?4:0)|(f.fx.immune>0?8:0)|(f.win?16:0);
    return a.slice(0,18).map(Q).concat([a[18],a[19],Math.ceil(Math.max(0,f.hp)),Math.round(f.rage),f.held?WT.indexOf(f.held.type):-1,f.held?f.held.dur:0,bits,Math.max(0,STATES.indexOf(f.state))]);});
  s.ia=G.f.map(f=>f.net?(NET.ack[f.slot]|0):0);
  s.gb=PANES.reduce((m,P,i)=>m|(P.b.broken?1<<i:0),0);
  s.bk=BRK.map(b=>b.brk.broken?1:0).join('');s.ev=[Q(FLOOD.lvl),EV.blackout>0?1:0,NPC.van?Q(NPC.van.x):0,NPC.van?Q(NPC.van.z):0,NPC.van?Q(NPC.van.rot):0,NPC.van?1:0];
  s.it=items.map(it=>[it.id,it.kind==='w'?0:1,(it.kind==='w'?WT:PT).indexOf(it.type),Q(it.x),Q(it.y),Q(it.z)]);
  s.pj=projs.filter(p=>!p.visual).slice(0,16).map(p=>[p.id,PK.indexOf(p.kind),Q(p.x),Q(p.y),Q(p.z),Q(p.vx),Q(p.vy),Q(p.vz),p.wt?WT.indexOf(p.wt):-1]);
  const d=NPC.dog,mv=NPC.movers,cu=NPC.customer;
  s.np={b:NPC.bikes.map(b=>[b.id,Q(b.x),Q(b.z),b.dir]),d:[Q(d.x),Q(d.y),Q(d.z),Q(d.g.rotation.y)],m:mv?[Q(mv.x),Q(mv.z)]:0,c:cu?[Q(cu.x),Q(cu.z),Q(cu.p.g.rotation.y),cu.wait>0?0:1]:0};
  return s;
}
function netHostFrame(raw){
  if(!NET.room)return;
  const now=performance.now();
  const ids=new Set(NET.room.peers().map(p=>p.peer));
  for(const f of G.f){if(f.net&&!ids.has(f.net)){banner(f.label+' หลุดจากห้อง คอมเล่นแทน 🤖',3);f.net=null;f.player=false;if(f.tagEl)f.tagEl.textContent=tagText(f);}}
  if(now-NET.lastSendT<50)return;NET.lastSendT=now;
  const s=buildSnap();
  const fresh=NET.fxBuf.filter(x=>now-x.t<900).map(x=>x.e);
  let nfx=Math.min(16,fresh.length);s.fx=fresh.slice(-nfx);
  let str=JSON.stringify(s);
  while(ENC.encode(str).length>3300&&(nfx>0||s.pj.length>4||s.it.length)){
    if(nfx>0){nfx=Math.max(0,nfx-3);s.fx=fresh.slice(fresh.length-nfx);}
    else if(s.pj.length>4)s.pj=s.pj.slice(0,4);
    else s.it=s.it.filter(x=>x[1]===1).slice(0,Math.floor(s.it.length/2));
    str=JSON.stringify(s);
  }
  NET.maxSize=Math.max(NET.maxSize,ENC.encode(str).length);
  setPresence({s});
}

/* ---------- client side ---------- */
function netSendInput(now){
  const it=readPlayer(0),c=NET.inCnt;
  if(it.atk==='jab')c[0]++;else if(it.atk==='hook')c[1]++;else if(it.atk==='special')c[2]++;
  if(it.jump)c[3]++;if(it.grab)c[4]++;
  const arr=[Q(clamp(it.mx,-1,1)),Q(clamp(it.mz,-1,1)),it.block?1:0,...c],key=arr.join(',');
  if((key!==NET.lastIn&&now-NET.lastInT>=45)||now-NET.lastInT>250){NET.lastIn=key;NET.lastInT=now;NET.inSeq=(NET.inSeq||0)+1;if(!NET.inFirst)NET.inFirst=now;setPresence({in:arr.concat(NET.inSeq)});}
}
function netPhase(s){
  const ph=PHASES[s.ph]||'fight';if(ph===NET.curPhase)return;NET.curPhase=ph;G.phase=ph;
  $('#replayLab').classList.toggle('hidden',ph!=='replay');document.body.classList.toggle('letterbox',ph==='replay');
  $('#hud').classList.toggle('on',ph!=='replay'&&ph!=='end');
  $('#roundLab').textContent='ROUND '+s.r;
  if(ph==='intro'){NET.endShown=false;$('#endP').classList.add('hidden');document.body.classList.add('fighting');}
  if(ph==='end'&&!NET.endShown){NET.endShown=true;setTimeout(()=>netClientEnd(s.wt),1700);}
}
function netClientEnd(wt){
  if(NET.role!=='client'||G.phase!=='end')return;
  const winners=G.f.filter(f=>f.team===wt),losers=G.f.filter(f=>f.team!==wt),me=G.f[NET.mySlot];
  if(me&&me.team===wt){STATS.wins[me.ch.id]=winsOf(me.ch)+1;saveAll();}
  if(me)SFX.voLocal(wt>=0&&me.team===wt?'you_win':'you_lose',0.6);
  $('#endTitle').textContent=wt<0?'เสมอ!':(me?(me.team===wt?'คุณชนะ! 🏆':(G.mode==='team'?((wt===0?'ทีมแดง':'ทีมฟ้า')+' ชนะ'):(winners[0]?winners[0].ch.name+' ชนะ':''))+' 😵'):(winners[0]?winners[0].ch.name+' ชนะ! 🏆':''));
  const pics=$('#endPics');pics.innerHTML='';winners.forEach(f=>{const c=document.createElement('canvas');c.width=c.height=260;portrait(f.ch,c,'win');pics.appendChild(c);});
  $('#endSub').textContent=winners[0]?winners[0].ch.name+' : "'+pick(winners[0].ch.quotes)+'" · รอโฮสต์กดเล่นอีกตา...':'รอโฮสต์กดเล่นอีกตา...';
  if(winners[0])drawSickNote(losers,winners[0]);else $('#sickNote').style.display='none';
  setEndBtns([['📸 ถ่ายรูป','btn ghost',()=>enterPhoto()],['กลับห้อง','btn ghost',()=>netQuitMatch()]]);
  $('#endP').classList.remove('hidden');document.body.classList.remove('fighting');$('#hud').classList.remove('on');
}
function netSyncItems(S,raw){
  const M=NET.cl.items,seen=new Set();
  for(const r of S.it||[]){const[id,k,ti,x,y,z]=r;seen.add(id);let o=M.get(id);
    if(!o){let mesh;if(k===0){const W=WEAPONS[WT[ti]];if(!W)continue;mesh=W.mk();const ring=new THREE.Mesh(new THREE.RingGeometry(0.45,0.55,24),new THREE.MeshBasicMaterial({color:0xffd23d,transparent:true,opacity:.6,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.02;mesh.add(ring);}
      else{if(!PT[ti])continue;mesh=powerMesh(PT[ti]);}
      scene.add(mesh);o={mesh,k,t:Math.random()*5,y:0};M.set(id,o);}
    o.type=(k===0?WT:PT)[ti];o.y=UQ(y);o.mesh.position.x=UQ(x);o.mesh.position.z=UQ(z);if(k===0)o.mesh.position.y=o.y;}
  for(const[id,o]of M){if(!seen.has(id)){scene.remove(o.mesh);M.delete(id);continue;}
    if(o.k===1){o.t+=raw;o.mesh.position.y=o.y+0.25+Math.sin(o.t*3)*0.1;o.mesh.rotation.y+=raw*1.8;if(o.mesh.userData.ring)o.mesh.userData.ring.position.y=-0.23-Math.sin(o.t*3)*0.1;}}
}
function netSyncProjs(S,age){
  const M=NET.cl.projs,seen=new Set(),a=clamp(age/1000,0,0.25);
  for(const r of S.pj||[]){const[id,ki,x,y,z,vx,vy,vz,wi]=r;seen.add(id);let o=M.get(id);
    if(!o){const kind=PK[ki]||'file';const mesh=(kind==='thrown'&&WEAPONS[WT[wi]])?WEAPONS[WT[wi]].mk():projMesh(kind);scene.add(mesh);o={mesh,spin:kind!=='chat'};M.set(id,o);}
    o.mesh.position.set(UQ(x+vx*a),UQ(y+vy*a),UQ(z+vz*a));if(o.spin){o.mesh.rotation.y+=0.2;o.mesh.rotation.x+=0.12;}}
  for(const[id,o]of M)if(!seen.has(id)){scene.remove(o.mesh);M.delete(id);}
}
function netSyncNPC(S,raw){
  const np=S.np||{},C=NET.cl,seen=new Set();
  for(const r of np.b||[]){const[id,x,z,dir]=r;seen.add(id);let o=C.bikes.get(id);if(!o){o=mkBike(pick(['#c0392b','#2980b9','#27ae60','#8e44ad']),true);o.g.rotation.y=bikeRot(dir);scene.add(o.g);C.bikes.set(id,o);}o.g.position.set(UQ(x),0,UQ(z));}
  for(const[id,o]of C.bikes)if(!seen.has(id)){scene.remove(o.g);C.bikes.delete(id);}
  if(np.d){const d=NPC.dog,[x,y,z,r]=np.d,nx=UQ(x),nz=UQ(z),mv=Math.hypot(nx-d.g.position.x,nz-d.g.position.z)>0.005;d.g.position.set(nx,UQ(y),nz);d.g.rotation.y=UQ(r);
    const s=mv?Math.sin(G.clock*16)*0.6:0;d.legs[0].rotation.x=s;d.legs[3].rotation.x=s;d.legs[1].rotation.x=-s;d.legs[2].rotation.x=-s;d.tail.rotation.y=Math.sin(G.clock*14)*0.6;}
  if(np.m){if(!C.movers){C.movers=mkMovers();scene.add(C.movers.g);}C.movers.g.position.set(UQ(np.m[0]),0,UQ(np.m[1]));C.movers.ps.forEach((p,i)=>animPerson(p,G.clock+i,1,0));}
  else if(C.movers){scene.remove(C.movers.g);C.movers=null;}
  if(np.c){if(!C.cust){C.cust=mkCustomer();scene.add(C.cust.g);}const[x,z,r,w]=np.c;C.cust.g.position.set(UQ(x),UQ(z)>3?0.15:0,UQ(z));C.cust.g.rotation.y=UQ(r);animPerson(C.cust,G.clock,w?1:0,0);}
  else if(C.cust){scene.remove(C.cust.g);C.cust=null;}
  NPC.bystanders.forEach(b=>{b.p.g.position.y=0.15+Math.abs(Math.sin(G.clock*9+b.ph))*0.2*hype;animPerson(b.p,G.clock+b.ph,0,hype);});
}
function netClientFrame(raw){
  if(!NET.room){toLobby('การเชื่อมต่อหลุด');return;}
  const now=performance.now();G.clock+=raw;
  const hp=NET.room.peers().find(p=>p.peer===NET.hostPeer);
  if(!hp||hp.presence.rc!==NET.code){if(now-NET.lastHostSeen>4000){netAbort('โฮสต์ออกจากห้องไปแล้ว 😢');return;}}
  else{
    NET.lastHostSeen=now;const g=hp.presence.g;
    if(!g){netAbort('โฮสต์จบแมตช์แล้ว');return;}
    if(g.id!==NET.cfg.id){netAdopt(hp);return;}
    const s=hp.presence.s;
    if(s&&s.i!==NET.lastSnapI&&Array.isArray(s.f)){NET.lastSnapI=s.i;NET.snaps.push({t:now,s});if(NET.snaps.length>8)NET.snaps.shift();
      if(Array.isArray(s.fx))for(const e of s.fx){if(!Array.isArray(e)||!(e[0]>NET.lastFx))continue;NET.lastFx=e[0];try{playFx(e);}catch(_){}}
      G.shake=Math.max(G.shake,UQ(s.sh)*0.6);netPhase(s);}
  }
  if(NET.mySlot>=0&&['intro','fight','ko','post'].includes(G.phase))netSendInput(now);
  const B=NET.snaps;
  if(B.length){
    const rt=now-110;let a=B[B.length-1],b=a,k=1;
    for(let i=B.length-2;i>=0;i--){if(B[i].t<=rt){a=B[i];b=B[i+1];k=b.t===a.t?1:clamp((rt-a.t)/(b.t-a.t),0,1);break;}}
    const S=B[B.length-1].s;
    G.f.forEach((f,i)=>{const fa=a.s.f[i]||b.s.f[i],fb=b.s.f[i],fl=S.f[i];if(!fb||!fl)return;const arr=new Array(20);
      for(let j=0;j<18;j++){const va=UQ(fa[j]),vb=UQ(fb[j]);arr[j]=j===3?lerpAngle(va,vb,k):va+(vb-va)*k;}
      arr[18]=fb[18]|0;arr[19]=fb[19]|0;f.applySnap(arr);f.pos.x=arr[0];f.y=arr[1];f.pos.z=arr[2];f.face=arr[3];
      f.hp=+fl[20]||0;f.rage=+fl[21]||0;f.setHeldVis(fl[22]>=0&&WT[fl[22]]?WT[fl[22]]:null);if(f.held)f.held.dur=fl[23]|0;
      const bits=fl[24]|0;f.fx.dizzy=bits&1;f.fx.slow=bits&2?1:0;f.fx.buff=bits&4?1:0;f.fx.immune=bits&8?1:0;f.win=!!(bits&16);
      f.state=STATES[fl[25]]||'idle';f.lite(raw);});
    PANES.forEach((P,i)=>{const br=!!((S.gb|0)>>i&1);if(P.mesh.visible===br)P.mesh.visible=!br;});
    if(Array.isArray(S.ev)){FLOOD.lvl=clamp(UQ(S.ev[0]),0,1);EV.blackout=S.ev[1]?1:0;
      if(S.ev[5]){if(!NET.cl.van){NET.cl.van=mkVan();scene.add(NET.cl.van);}NET.cl.van.position.set(UQ(S.ev[2]),0,UQ(S.ev[3]));NET.cl.van.rotation.y=UQ(S.ev[4]);}
      else if(NET.cl.van){scene.remove(NET.cl.van);NET.cl.van=null;}}
    if(typeof S.bk==='string')BRK.forEach((b,i)=>{const br=S.bk[i]==='1';if(b.brk.broken!==br)brkVisual(b,br);});
    G.timer=+S.t||0;G.round=S.r|0;G.wins={};(S.w||[]).forEach((v,i)=>{if(v)G.wins[i]=v|0;});G.rain=+S.rn||0;hype=UQ(S.hy);
    netSyncItems(S,raw);netSyncProjs(S,now-B[B.length-1].t);netSyncNPC(S,raw);
    if(G.phase!=='end')updHUD(raw);
  }
  if(now-NET.lastHostSeen>1500||(B.length&&now-B[B.length-1].t>1500))$('#roundLab').textContent='⏳ รอโฮสต์...';
  // input health: the host echoes the last input sequence it read from us
  if(B.length&&NET.mySlot>=0){const ia=(B[B.length-1].s.ia||[])[NET.mySlot]|0;if(ia!==NET.ackSeen){NET.ackSeen=ia;NET.ackT=now;}
    if(G.phase==='fight'&&NET.inSeq>3&&now-NET.ackT>2500){$('#roundLab').textContent='⚠️ ปุ่มยังไม่ถึงโฮสต์';
      if(now-(NET.reassertT||0)>3000){NET.reassertT=now;setPresence(Object.assign(myLobbyPresence(),{in:[0,0,0,...NET.inCnt,NET.inSeq]}));}}}
  updEffects(raw);updParts(raw);
}

/* ---------- connect ---------- */
(function connect(tries){
  const c=window.claude;
  if(c&&typeof c.use==='function'){
    c.use('room').then(r=>{if(r){NET.room=r;if(!$('#onlineP').classList.contains('hidden'))showOnline();}},()=>{});
  }else if(tries<4&&window.top!==window)setTimeout(()=>connect(tries+1),500);
  else{NET.p2p=true;if(!$('#onlineP').classList.contains('hidden')&&!NET.code)showOnline();}
})(0);

/* ==========================================================================
   P2P transport (GitHub Pages / any static host): PeerJS + its free cloud broker.
   The room creator owns peer id "ofn-<code>" and relays everyone's presence (star topology).
   Exposes the same presence()/peers() surface as the claude.ai room, so the code above is shared.
   ========================================================================== */
const P2P_PREFIX='ofn-';
const P2P_ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]};
function loadPeerJS(){
  if(window.Peer)return Promise.resolve();
  const urls=['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  return new Promise((res,rej)=>{let i=0;const next=()=>{if(i>=urls.length)return rej(new Error('load'));const s=document.createElement('script');s.src=urls[i++];s.onload=()=>window.Peer?res():next();s.onerror=next;document.head.appendChild(s);};next();});
}
function p2pRoom(code,create){
  return new Promise((resolve,reject)=>{
    const hostId=P2P_PREFIX+code;let done=false,myId=null,mine={},snap=[],hostConn=null,closeCb=null,closed=false;
    const others=new Map(),conns=new Map();
    const peer=create?new Peer(hostId,{config:P2P_ICE}):new Peer({config:P2P_ICE});
    const fz=p=>Object.freeze(p&&typeof p==='object'?Object.assign({},p):{});
    const rebuild=()=>{snap=Object.freeze([Object.freeze({peer:myId,by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:fz(mine),updatedAt:Date.now()}),
      ...[...others].map(([id,p])=>Object.freeze({peer:id,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:p,updatedAt:Date.now()}))]);};
    const send=(c,m)=>{if(c&&c.open)try{c.send(m);}catch(e){}};
    const broadcast=(m,except)=>{for(const[id,c]of conns)if(id!==except)send(c,m);};
    const shut=why=>{if(closed)return;closed=true;try{peer.destroy();}catch(e){}if(closeCb)closeCb(why);};
    const room={p2p:true,
      presence(patch){for(const k in patch){if(patch[k]===null)delete mine[k];else mine[k]=patch[k];}rebuild();
        if(create)broadcast({t:'p',id:myId,p:mine});else send(hostConn,{t:'p',p:mine});return Promise.resolve();},
      peers(){return snap;},onPeers(){return()=>{};},connected(){return!closed;},emit(){return Promise.resolve();},on(){return()=>{};},
      onClose(fn){closeCb=fn;},close(){closeCb=null;shut('leave');}};
    const fail=why=>{if(done)return;done=true;try{peer.destroy();}catch(e){}reject(new Error(why));};
    peer.on('open',id=>{myId=id;rebuild();
      if(create){done=true;resolve(room);return;}
      hostConn=peer.connect(hostId,{reliable:true,serialization:'json'});
      hostConn.on('open',()=>{if(done)return;done=true;send(hostConn,{t:'p',p:mine});resolve(room);});
      hostConn.on('data',m=>{if(!m||typeof m!=='object')return;
        if(m.t==='p'&&typeof m.id==='string'&&m.id!==myId){others.set(m.id,fz(m.p));rebuild();}
        else if(m.t==='bye'){others.delete(m.id);rebuild();}
        else if(m.t==='all'&&Array.isArray(m.list)){others.clear();for(const e of m.list)if(Array.isArray(e)&&typeof e[0]==='string'&&e[0]!==myId)others.set(e[0],fz(e[1]));rebuild();}});
      hostConn.on('close',()=>{others.clear();rebuild();if(done)shut('host');});
      hostConn.on('error',()=>{});
      setTimeout(()=>fail('nohost'),12000);
    });
    if(create)peer.on('connection',c=>{
      c.on('open',()=>{if(conns.size>=7){c.close();return;}conns.set(c.peer,c);send(c,{t:'all',list:[[myId,mine],...[...others].map(([id,p])=>[id,p])]});});
      c.on('data',m=>{if(m&&m.t==='p'){const p=fz(m.p);others.set(c.peer,p);rebuild();broadcast({t:'p',id:c.peer,p},c.peer);}});
      c.on('close',()=>{conns.delete(c.peer);if(others.delete(c.peer)){rebuild();broadcast({t:'bye',id:c.peer});}});
      c.on('error',()=>{});
    });
    peer.on('error',e=>{const t=e&&e.type;if(!done)fail(t==='peer-unavailable'?'nohost':t==='unavailable-id'?'taken':(t||'error'));});
    peer.on('disconnected',()=>{if(!closed)try{peer.reconnect();}catch(e){}});
    addEventListener('beforeunload',()=>{try{peer.destroy();}catch(e){}});
  });
}
