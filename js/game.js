'use strict';
/* ================= GAME STATE ================= */
const G={phase:'menu',mode:'duel',humans:1,diff:1,loc:'in',slots:[0,1,2,3],slotSel:0,f:[],round:1,wins:{},timer:99,phaseT:0,clock:0,timeScale:1,slowT:0,shake:0,hitStop:0,paused:false,photo:false,watch:0,rain:0,evT:12,arc:null,roundWinner:-1,lastKO:null,replayPending:false};
const SLOTCOL=['#e0303a','#2f6fe0','#2bb673','#f1b31c'];
const TEAMCOL=[['#e0303a','#ff8a5c'],['#2f6fe0','#36c5f0']];
const chOf=i=>i<0?BOSS_CH:ROSTER[i]; // -1 = arcade boss
function humanLo(h,ch){const l=STATS.lo[h];return l&&STYLES[l.st]&&SPECIALS[l.sp]?l:{st:'box',sp:ch.sp};}
const slotCount=()=>(G.mode==='ffa'||G.mode==='team')?4:2;
function slotInfo(i){
  const m=G.mode,two=G.humans===2;let human=null,team=i,color=SLOTCOL[i],label='CPU';
  if(i===0)human=0;else if(i===1&&two&&m!=='arcade')human=1;
  if(m==='team'){team=i<2?0:1;color=TEAMCOL[team][i%2];}
  if(m==='arcade'&&i===1){team=1;}
  if(human!=null)label='P'+(human+1);else if(slotCount()>2)label='CPU'+(m==='team'?(team===0?' (Red)':' (Blue)'):'');
  if(m==='team'&&human!=null)label+=' Red';
  return{human,team,color,label};
}

/* ================= TRAINING ROOM ================= */
const TR={dummy:0,last:-9,hits:0,dmg:0,best:0};
const DUMMY_MODES=['stand still','always block','fight back'];
function dummyThink(f,dt){
  if(TR.dummy===2)return aiThink(f,dt);
  const e=nearestEnemy(f,99);
  if(e&&(f.state==='idle'||f.state==='block'))f.faceT=Math.atan2(e.pos.x-f.pos.x,e.pos.z-f.pos.z);
  return{mx:0,mz:0,atk:null,block:TR.dummy===1,jump:false,grab:false};
}
function trainHit(f,att,dmg){
  f.trHurt=G.clock;
  if(f.human!=null||!att||att.human==null)return;
  if(G.clock-TR.last<1.2){TR.hits++;TR.dmg+=dmg;}else{TR.hits=1;TR.dmg=dmg;}
  TR.last=G.clock;TR.best=Math.max(TR.best,Math.round(TR.dmg));
}
function trainTick(dt){
  for(const f of G.f){
    if(f.human!=null)f.rage=Math.min(100,f.rage+40*dt);
    if(G.clock-(f.trHurt||-9)>2&&f.hp<f.maxHp&&f.state!=='down'&&f.state!=='ko')f.hp=f.maxHp;
  }
  $('#roundLab').textContent='Training · dummy: '+DUMMY_MODES[TR.dummy]+' [T]';
}
function cycleDummy(){TR.dummy=(TR.dummy+1)%DUMMY_MODES.length;banner('Dummy: '+DUMMY_MODES[TR.dummy],1.5);}

/* ================= SPAWNS ================= */
function spawnList(n,loc){
  const BACK=[[-6,0,-16.4],[2,0,-16.4],[-6,0,-19.6],[2,0,-19.6]],WING=[[-21,0,-3],[-17,0,-3],[-21,0,-6.5],[-17,0,-6.5]];
  const IN=[[-3.2,0,-2.4],[3.2,0,-2.4],[-3.2,0,1.2],[3.2,0,1.2]],OUT=[[-3,0.15,5.2],[3,0.15,5.2],[-3,0,10.4],[3,0,10.4]],UP=[[13.2,2.4,1.4],[19.4,2.4,-9.6],[13.2,2.4,-9.6],[19.4,2.4,1.6]],BOSS=[[2.0,0,-4.4],[9.4,2.4,-9.8]];
  const L=(loc==='boss'?BOSS:loc==='out'?OUT:loc==='up'?UP:loc==='back'?BACK:loc==='wing'?WING:IN).slice(0,n);
  return L.map(([x,y,z],i)=>{let cx=0,cz=0;L.forEach((q,j)=>{if(j!==i){cx+=q[0];cz+=q[2];}});cx/=Math.max(1,L.length-1);cz/=Math.max(1,L.length-1);return[x,y,z,Math.atan2(cx-x,cz-z)];});
}

/* ================= FIGHTER SETUP ================= */
function clearFighters(){G.f.forEach(f=>f.dispose());G.f=[];}
function buildFromSlots(){
  clearFighters();const n=slotCount();
  for(let i=0;i<n;i++){const inf=slotInfo(i);inf.lo=inf.human!=null?humanLo(inf.human,ROSTER[G.slots[i]]):randLoadout();G.f.push(new Fighter(ROSTER[G.slots[i]],i,inf));}
  placeFighters(G.loc);buildTags();
}
function placeFighters(loc){const sp=spawnList(G.f.length,loc);G.f.forEach((f,i)=>f.reset(...sp[i]));}
function refreshFaces(){G.f.forEach(f=>f.redraw());updateCards();}

/* ================= TAGS ================= */
function buildTags(){const box=$('#tags');box.innerHTML='';G.f.forEach(f=>{const el=document.createElement('div');el.className='ftag';el.style.setProperty('--c',f.color);el.textContent=tagText(f);box.appendChild(el);f.tagEl=el;});}
function tagText(f){if(NET.role!=='off')return f.human===0?'YOU':(f.player?f.label+' '+f.ch.name:f.ch.name);return f.human!=null?f.label:f.ch.name;}
function updTags(){
  const show=G.phase!=='menu'&&G.phase!=='replay'&&!G.photo&&G.phase!=='end';
  const W=innerWidth,H=innerHeight;
  for(const f of G.f){const el=f.tagEl;if(!el)continue;if(!show||f.state==='ko'){el.style.display='none';continue;}el.style.display='';
    const v=V(f.pos.x,f.y+2.95*f.S,f.pos.z).project(camera);let x=(v.x+1)/2*W,y=(1-v.y)/2*H;let off=false;
    if(v.z>1){x=W-x;y=H-12;off=true;}
    if(x<20||x>W-20||y<60||y>H-20)off=true;
    x=clamp(x,30,W-30);y=clamp(y,110,H-30);
    el.classList.toggle('off',off);el.textContent=(off?(x<=30?'◀ ':x>=W-30?'':'▼ '):'')+tagText(f)+(off&&x>=W-30?' ▶':'');
    el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;}
}

/* ================= HUD ================= */
function buildHUD(){
  const L=$('#hudL'),R=$('#hudR');L.innerHTML='';R.innerHTML='';const n=G.f.length,four=n>2;
  G.f.forEach((f,i)=>{const el=document.createElement('div');el.className='pnl'+(four?' four':'');el.style.setProperty('--c',f.color);
    const right=i>=n/2;
    el.innerHTML=right?`<div class="nm"><span></span><small>${f.label}</small></div>`:`<div class="nm"><small>${f.label}</small><span></span></div>`;
    el.innerHTML+=`<div class="bar"><i class="lag"></i><i class="hp"></i></div><div class="rage"><i></i></div><div class="sub"></div>`;
    el.querySelector('.nm span').textContent=f.ch.name;(right?R:L).appendChild(el);
    f.hud={el,hp:el.querySelector('.hp'),lag:el.querySelector('.lag'),rg:el.querySelector('.rage i'),rgw:el.querySelector('.rage'),sub:el.querySelector('.sub')};});
}
function spKeyOf(f){if(f.human==null)return'';if(f.human===1)return'P';return G.humans===2?'R':'L';}
function updHUD(dt){
  for(const f of G.f){const h=f.hud;if(!h)continue;
    f.lagHp=f.lagHp>f.hp?Math.max(f.hp,f.lagHp-f.maxHp*0.6*dt):f.hp;
    h.hp.style.transform=`scaleX(${f.hp/f.maxHp})`;h.hp.classList.toggle('low',f.hp/f.maxHp<0.3);
    h.lag.style.transform=`scaleX(${f.lagHp/f.maxHp})`;h.rg.style.transform=`scaleX(${f.rage/100})`;
    const full=f.rage>=100;h.rgw.classList.toggle('full',full);h.el.classList.toggle('dead',f.state==='ko');
    const w=G.mode==='arcade'||G.mode==='train'?'':('🥊'.repeat(Math.min(2,G.wins[f.team]||0))+'⚪'.repeat(Math.max(0,2-(G.wins[f.team]||0))));
    let st=[];if(full)st.push('<b>SPECIAL READY'+(spKeyOf(f)?' ['+spKeyOf(f)+']':'')+'</b>');if(f.held)st.push('holding '+WEAPONS[f.held.type].en+' ('+f.held.dur+')');
    if(G.mode==='train'&&f.human==null&&TR.hits)st.push('<b>'+TR.hits+' hit · '+Math.round(TR.dmg)+' dmg</b> (best '+TR.best+')');
    if(f.fx.dizzy>0)st.push('💫');if(f.fx.slow>0)st.push('🐌OT');if(f.fx.buff>0)st.push('💪');if(f.fx.immune>0)st.push('🌿');
    const html=w+' '+st.join(' · ');if(h._s!==html){h.sub.innerHTML=html;h._s=html;}
  }
  const t=Math.max(0,Math.ceil(G.timer));$('#timer').textContent=G.mode==='train'?'∞':t;$('#timer').classList.toggle('hurry',t<=10&&G.phase==='fight');
}

/* ================= CAMERA ================= */
const CAM={yaw:0,pitch:0.66,zoom:1,focus:V(0,1,0),pos:V(0,9,14),pyaw:0,ppitch:0.35,pdist:6};
function humansFocus(){
  const hs=G.f.filter(f=>f.human!=null);const src=hs.length?hs:G.f.filter(f=>f.state!=='ko');if(!src.length)return{p:V(0,0,0),spread:0};
  let x=0,y=0,z=0;src.forEach(f=>{x+=f.pos.x;y+=f.y;z+=f.pos.z;});x/=src.length;y/=src.length;z/=src.length;
  let spread=0;src.forEach(f=>{spread=Math.max(spread,Math.hypot(f.pos.x-x,f.pos.z-z));});
  return{p:V(x,y,z),spread};
}
function updCamera(raw){
  let focus,dist,pitch,yaw,k=1-Math.exp(-6*raw);
  if(G.phase==='replay'&&RP){const s=RP.frames[Math.min(RP.frames.length-1,Math.floor(RP.t))][RP.idx];focus=V(s[0],s[1]+0.6,s[2]);yaw=RP.yaw0+RP.t*0.012;dist=5.5;pitch=0.28;k=1;}
  else if(G.photo){focus=CAM.pfocus.clone();yaw=CAM.pyaw;pitch=CAM.ppitch;dist=CAM.pdist;k=1-Math.exp(-12*raw);}
  else if(G.phase==='menu'||!G.f.length){CAM.yaw+=raw*0.07;focus=V(0,0.5,0);yaw=CAM.yaw;pitch=0.42;dist=13;}
  else if(G.phase==='end'){const w=G.f.find(f=>f.win)||G.f[0];focus=V(w.pos.x,w.y+0.4,w.pos.z);yaw=lerpAngle(CAM.yaw,w.face,0.03);CAM.yaw=yaw;pitch=0.3;dist=6;}
  else{
    if(G.humans===1&&!G.paused){if(held.has('KeyQ'))CAM.yaw-=2.2*raw;if(held.has('KeyE'))CAM.yaw+=2.2*raw;CAM.yaw+=GP[0].rx*2.4*raw;}
    const hf=humansFocus();focus=hf.p;yaw=CAM.yaw;pitch=CAM.pitch;dist=(9.4+hf.spread*(G.humans===2?1.1:0.25))*CAM.zoom;dist=clamp(dist,4.5,26);
  }
  CAM.focus.lerp(focus,G.phase==='replay'?1:1-Math.exp(-8*raw));
  const des=V(CAM.focus.x+Math.sin(yaw)*Math.cos(pitch)*dist,CAM.focus.y+1.2+Math.sin(pitch)*dist,CAM.focus.z+Math.cos(yaw)*Math.cos(pitch)*dist);
  CAM.pos.lerp(des,k);camera.position.copy(CAM.pos);
  if(G.shake>0&&!G.photo){camera.position.x+=rand(-1,1)*G.shake*0.5;camera.position.y+=rand(-1,1)*G.shake*0.5;G.shake=Math.max(0,G.shake-raw*1.8);}
  camera.position.y=Math.max(0.6,camera.position.y);
  camera.lookAt(CAM.focus.x,CAM.focus.y+1.2,CAM.focus.z);
  sun.position.set(CAM.focus.x+8,20,CAM.focus.z+10);sun.target.position.copy(CAM.focus);
}
(function(){
  const cv=renderer.domElement;let drag=null;
  cv.addEventListener('pointerdown',e=>{if(G.phase==='replay'){skipReplay();return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId);}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    if(G.photo){CAM.pyaw-=dx*0.007;CAM.ppitch=clamp(CAM.ppitch+dy*0.005,-0.2,1.3);}else{CAM.yaw-=dx*0.006;CAM.pitch=clamp(CAM.pitch+dy*0.004,0.25,1.25);}});
  const up=e=>{if(drag&&drag.id===e.pointerId)drag=null;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{if(G.photo)CAM.pdist=clamp(CAM.pdist*(e.deltaY>0?1.1:0.9),2,20);else CAM.zoom=clamp(CAM.zoom*(e.deltaY>0?1.08:0.93),0.5,1.8);e.preventDefault();},{passive:false});
})();

/* ================= INPUT ================= */
const SCH={
  solo:{up:['KeyW','ArrowUp'],dn:['KeyS','ArrowDown'],lf:['KeyA','ArrowLeft'],rt:['KeyD','ArrowRight'],jab:['KeyJ','TJab'],hook:['KeyK','THook'],sp:['KeyL','TSpec'],blk:['KeyI','ShiftLeft','TBlock'],grab:['KeyU','TGrab'],jump:['Space','TJump']},
  p1:{up:['KeyW'],dn:['KeyS'],lf:['KeyA'],rt:['KeyD'],jab:['KeyQ','TJab'],hook:['KeyE','THook'],sp:['KeyR','TSpec'],blk:['ShiftLeft','TBlock'],grab:['KeyF','TGrab'],jump:['Space','TJump']},
  p2:{up:['KeyI','ArrowUp'],dn:['KeyK','ArrowDown'],lf:['KeyJ','ArrowLeft'],rt:['KeyL','ArrowRight'],jab:['KeyU','Numpad1'],hook:['KeyO','Numpad2'],sp:['KeyP','Numpad3'],blk:['KeyN','Numpad0','ShiftRight'],grab:['KeyH','Numpad4'],jump:['KeyM','Enter','NumpadEnter']},
};
const PADMAP={up:['Up'],dn:['Down'],lf:['Left'],rt:['Right'],jab:['X'],hook:['Y'],sp:['RB','RT'],blk:['LB','LT'],grab:['B'],jump:['A']};
const PADLAB={jab:'X',hook:'Y',sp:'RB',blk:'LB',grab:'B',jump:'A'};
[['solo',0],['p1',0],['p2',1]].forEach(([s,n])=>{for(const a in PADMAP)SCH[s][a]=SCH[s][a].concat(PADMAP[a].map(b=>'G'+n+b));});
function readPlayer(h){
  const S=h===1?SCH.p2:(G.humans===2?SCH.p1:SCH.solo);
  let rx=(has(held,S.rt)?1:0)-(has(held,S.lf)?1:0),rf=(has(held,S.up)?1:0)-(has(held,S.dn)?1:0);
  if(h===0){rx+=touch.x;rf-=touch.y;}
  {const g=GP[h===1?1:0];if(g.on){rx+=g.x;rf-=g.y;const m=Math.hypot(rx,rf);if(m>1){rx/=m;rf/=m;}}}
  const c=Math.cos(CAM.yaw),s=Math.sin(CAM.yaw);
  const mx=c*rx-s*rf,mz=-s*rx-c*rf;
  let atk=null;if(has(pressed,S.sp))atk='special';else if(has(pressed,S.hook))atk='hook';else if(has(pressed,S.jab))atk='jab';
  return{mx,mz,atk,block:has(held,S.blk),jump:has(pressed,S.jump),grab:has(pressed,S.grab)};
}
(function(){
  const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;if(isTouch)document.body.classList.add('touch');
  const st=$('#stick'),kn=$('#knob');let sid=null;
  const mv=e=>{const r=st.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=Math.hypot(dx,dy),R=r.width/2;if(m>R){dx*=R/m;dy*=R/m;}touch.x=dx/R;touch.y=dy/R;kn.style.transform=`translate(${dx}px,${dy}px)`;};
  st.addEventListener('pointerdown',e=>{sid=e.pointerId;try{st.setPointerCapture(sid);}catch(_){}mv(e);e.preventDefault();});
  st.addEventListener('pointermove',e=>{if(e.pointerId===sid)mv(e);});
  const end=e=>{if(e.pointerId!==sid)return;sid=null;touch.x=touch.y=0;kn.style.transform='';};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  document.querySelectorAll('.tb').forEach(b=>{const k=b.dataset.k;
    b.addEventListener('pointerdown',e=>{SFX.init();held.add(k);pressed.add(k);e.preventDefault();});
    const up=()=>held.delete(k);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);});
})();
function padMenus(){
  const st=pressed.has('G0Start')||pressed.has('G1Start'),a=pressed.has('G0A')||pressed.has('G1A'),b=pressed.has('G0B')||pressed.has('G1B');if(!st&&!a&&!b)return;
  const vis=q=>!$(q).classList.contains('hidden'),key=c=>onGlobalKey({code:c,repeat:false,preventDefault(){}});
  if(vis('#loadP')){if(st||a)key('Enter');else if(b)key('Escape');return;}
  if(vis('#interP')&&(st||a)){key('Enter');return;}
  if(vis('#endP')&&st){const btn=$('#endBtns button');if(btn)btn.click();return;}
  if(G.phase==='menu'&&vis('#menu')&&st){$('#startBtn').click();return;}
  if(st)key('Escape');}
window.onGlobalKey=e=>{
  if(G.phase==='replay'){skipReplay();return;}
  if(!$('#loadP').classList.contains('hidden')){if(e.code==='Enter')$('#loadGo').click();else if(e.code==='Escape')$('#loadBack').click();return;}
  if(!$('#interP').classList.contains('hidden')&&(e.code==='Enter'||e.code==='Space'||e.code==='KeyJ')){$('#interGo').click();return;}
  if(e.code==='Escape'&&!$('#movesP').classList.contains('hidden')){showMoves(false);return;}
  if(e.code==='Escape'){if(G.photo){exitPhoto();return;}if(['fight','intro','ko','post'].includes(G.phase))togglePause();return;}
  if(e.code==='KeyT'&&G.mode==='train'&&G.phase==='fight'&&!G.paused&&!e.repeat){cycleDummy();return;}
  if(e.code==='KeyP'&&G.humans===1&&G.phase!=='menu'&&G.phase!=='lobby'&&!e.repeat){if(G.photo)exitPhoto();else enterPhoto();}
};

/* ================= ROUND FLOW ================= */
/* ================= LOADING SCREEN =================
   Boot: the shop's furniture models + fighter.glb (animations) through THREE.DefaultLoadingManager.
   Before a match: only the chosen fighters' own models (arcade: the whole ladder), skipped when already cached. */
const LDS={boot:true};
function showLoad(txt,frac){$('#loadScr').classList.remove('hidden');$('#loadTxt').textContent=txt;$('#loadBar').style.width=Math.round(clamp(frac,0,1)*100)+'%';}
function hideLoad(){$('#loadScr').classList.add('hidden');}
if(typeof REAL_THREE!=='undefined'&&REAL_THREE&&THREE.GLTFLoader&&THREE.DefaultLoadingManager){
  const mgr=THREE.DefaultLoadingManager;
  mgr.onProgress=(u,l,t)=>{if(LDS.boot)showLoad('Setting up the shop… '+l+' / '+t,l/t);};
  mgr.onLoad=()=>{if(LDS.boot){LDS.boot=false;hideLoad();}};
  showLoad('Setting up the shop…',0.02);loadFighterModel(()=>{});
  setTimeout(()=>{if(LDS.boot){LDS.boot=false;hideLoad();}},25000);}
function preloadFighters(chs,cb){
  const names=[...new Set(chs.filter(c=>c&&c.body==='3d').map(c=>c.model||''))];
  if(typeof REAL_THREE==='undefined'||!REAL_THREE||!THREE.GLTFLoader||typeof loadCharModel!=='function')return cb();
  const need=names.filter(n=>n?!(B3.chars[n]&&(B3.chars[n].g||B3.chars[n].failed)):!(B3.gltf||B3.failed));if(!need.length)return cb();
  let done=0;LDS.boot=false;showLoad('Fighters are warming up… 0 / '+need.length,0.05);
  const one=()=>{done++;showLoad('Fighters are warming up… '+done+' / '+need.length,done/need.length);if(done===need.length){hideLoad();cb();}};
  need.forEach(n=>n?loadCharModel(n,one):loadFighterModel(one));}
function startMatch(){
  SFX.init();SFX.music(true);
  if(G.mode==='arcade'){preloadFighters([...ROSTER,BOSS_CH],startArcade);return;}
  const n=G.mode==='duel'||G.mode==='train'?2:4;preloadFighters(G.slots.slice(0,n).map(i=>ROSTER[i]),startMatch2);}
function startMatch2(){
  buildFromSlots();G.wins={};G.round=1;G.matchBill=0;
  enterFightUI();startRound();
}
function enterFightUI(){
  try{if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();}catch(_){}
  $('#menu').classList.add('hidden');$('#endP').classList.add('hidden');$('#interP').classList.add('hidden');$('#pause').classList.add('hidden');
  $('#hud').classList.add('on');document.body.classList.add('fighting');buildHUD();
  $('#hint').textContent=G.mode==='train'?'T switch dummy (stand / block / fight back) · Esc pause / moves / quit':G.humans===1?'Q/E orbit camera · drag to orbit · wheel to zoom · P photo · Esc pause':'Drag to orbit · Esc pause';
}
function startRound(loc){
  G.matchWinner=-1;
  resetWorld();clearPops();hideCenter();
  placeFighters(loc||G.roundLoc||G.loc);
  G.timer=99;G.phase='intro';G.phaseT=0;G.roundWinner=-1;G.replayPending=false;G.lastKO=null;REC.length=0;hype=0;G.paused=false;G.timeScale=1;G.slowT=0;
  const p=G.f.find(f=>f.human===0)||G.f[0];CAM.yaw=(loc||G.roundLoc||G.loc)==='boss'?0.5:0;CAM.focus.set(p.pos.x,p.y,p.pos.z);
  const vs=G.f.length===2?G.f[0].ch.name+' VS '+G.f[1].ch.name:(G.mode==='team'?'RED VS BLUE':'4-WAY BRAWL!');
  $('#roundLab').textContent=G.mode==='arcade'?('STAGE '+(G.arc.stage+1)+'/'+G.arc.list.length):G.mode==='train'?'Training · dummy: '+DUMMY_MODES[TR.dummy]+' [T]':('ROUND '+G.round);
  G.hurry=0;
  if(G.mode==='train'){SFX.vo('ready');Object.assign(TR,{last:-9,hits:0,dmg:0});showCenter('TRAINING 🥋','No timer · special refills itself · T switches the dummy',1.6);return;}
  if(G.mode==='arcade'?G.arc.stage===G.arc.list.length-1:G.round>=3)SFX.vo('final_round');else SFX.voRound(G.mode==='arcade'?G.arc.stage+1:G.round);
  showCenter(G.mode==='arcade'?('STAGE '+(G.arc.stage+1)):(G.round>=3?'FINAL ROUND!':'ROUND '+G.round),G.round===1||G.mode==='arcade'?vs:'',1.3);
}
function aliveTeams(){const s=new Set();G.f.forEach(f=>{if(f.state!=='ko')s.add(f.team);});return[...s];}
function onKO(f,att){
  G.lastKO=f;hype=1;SFX.crowd();
  if(G.phase!=='fight')return;
  const at=aliveTeams();
  if(at.length<=1)endRoundBy(at.length?at[0]:-1,'ko');
  else{G.slowT=0.5;banner(f.ch.name+' is out! 😵',2);}
}
function endRoundBy(team,how){
  G.phase='ko';G.phaseT=0;G.roundWinner=team;
  if(team>=0)G.wins[team]=(G.wins[team]||0)+1;
  const ws=G.f.filter(f=>f.team===team&&f.state!=='ko');ws.forEach(f=>{f.win=true;f.setExpr('win',0,true);});
  if(ws[0])say(ws[0],pick(ws[0].ch.quotes),true);
  const wname=team<0?'':(G.mode==='team'?(team===0?'Red team':'Blue team'):(G.f.find(f=>f.team===team).ch.name));
  if(team<0)SFX.vo('its_a_tie',0.8);
  if(how==='ko'){G.slowT=1.0;showCenter('K.O.!!',wname?wname+' wins the round!':'DRAW!',2.2);G.replayPending=REC.length>40;}
  else{SFX.bell();SFX.vo('time_over',0.4);showCenter('TIME!',wname?wname+' wins on points!':'Draw! Back to work',2.4);}
}
function timeUp(){
  const score={};G.f.forEach(f=>{score[f.team]=(score[f.team]||0)+Math.max(0,f.hp)/f.maxHp;});
  let best=-1,bv=-1,tie=false;for(const t in score){if(score[t]>bv+0.005){bv=score[t];best=+t;tie=false;}else if(Math.abs(score[t]-bv)<=0.005)tie=true;}
  endRoundBy(tie?-1:best,'time');
}
function endRound(){
  G.phase='between';
  if(G.mode==='arcade'){if(G.roundWinner===0){G.arc.stage++;if(G.arc.stage>=G.arc.list.length)arcadeClear();else showInter();}else if(G.roundWinner<0){startRound();}else arcadeLose();return;}
  const champ=Object.keys(G.wins).find(t=>G.wins[t]>=2);
  if(champ!==undefined||G.round>=5){let t=champ!==undefined?+champ:+Object.keys(G.wins).sort((a,b)=>G.wins[b]-G.wins[a])[0];if(isNaN(t))t=0;endMatch(t);}
  else{G.round++;startRound();}
}
function locName(f){if(lvlOf(f)==='f2')return'the violin shop (2F)';if(onMezz(f))return"the boss's office";if(zoneOf(f.pos)==='in')return f.pos.x<-15.3?'the drum wing':'the showroom';if(f.pos.z>3)return'the front street';if(f.pos.z<-12.3)return'the back alley';return'the side street';}
function endMatch(team){
  G.matchWinner=team;G.phase='end';G.phaseT=0;hideCenter();SFX.crowd();hype=1;
  const winners=G.f.filter(f=>f.team===team),losers=G.f.filter(f=>f.team!==team);
  G.f.forEach(f=>{f.win=f.team===team;if(f.win){if(f.state==='ko'){f.state='idle';f.hp=1;}f.setExpr('win',0,true);}});
  const unlocks=[];
  const tw0=totalWins();
  if(winners.some(f=>f.human!=null))winners.filter(f=>f.human!=null).forEach(f=>{const before=winsOf(f.ch);STATS.wins[f.ch.id]=before+1;});
  HATS.forEach(h=>{if(h.need>tw0&&h.need<=totalWins())unlocks.push('New hat unlocked: '+h.icon+' '+h.name+' — pick it on the loadout screen!');});
  saveAll();
  {const me=G.f.find(f=>f.human===0),hw=winners.some(f=>f.human!=null);const mine=G.humans===2?hw:(me&&me.team===team);
    SFX.voLocal(mine?(G.humans===2&&winners.some(f=>f.human===1)&&!winners.some(f=>f.human===0)?'f_you_win':'you_win'):'you_lose',1.2);
    if(unlocks.length)SFX.voLocal('level_up',2.6);}
  setTimeout(()=>{if(G.phase!=='end')return;
    const hw=winners.find(f=>f.human!=null);
    $('#endTitle').textContent=G.mode==='team'?((team===0?'Red team':'Blue team')+' WINS! 🏆'):(hw?(G.humans===2?hw.label+' WINS! 🏆':'YOU WIN! 🏆'):(winners[0].ch.name+' wins… 😵'));
    const pics=$('#endPics');pics.innerHTML='';winners.forEach(f=>{const c=document.createElement('canvas');c.width=c.height=260;portrait(f.ch,c,'win');pics.appendChild(c);});
    const w0=winners[0];$('#endSub').innerHTML='';const q=document.createElement('div');q.textContent=w0.ch.name+' : "'+pick(w0.ch.quotes)+'" · '+titleOf(winsOf(w0.ch));$('#endSub').appendChild(q);
    if(G.matchBill>0){const d=document.createElement('div');d.style.color='#ff8a8a';d.style.fontWeight='800';d.textContent='💸 Shop damage: '+baht(G.matchBill)+' — coming out of everyone\'s paycheck!';$('#endSub').appendChild(d);}
    unlocks.forEach(u=>{const d=document.createElement('div');d.style.color='#ffd23d';d.style.fontWeight='800';d.textContent='🎉 '+u;$('#endSub').appendChild(d);});
    drawSickNote(losers,w0);
    if(NET.role==='host')setEndBtns([['Play again','btn',()=>netHostStart()],['📸 Photo','btn ghost',()=>enterPhoto()],['Back to room','btn ghost',()=>netQuitMatch()]]);
    else setEndBtns([['Rematch','btn',()=>startMatch()],['📸 Photo','btn ghost',()=>enterPhoto()],['New fighters','btn ghost',toMenu]]);
    $('#endP').classList.remove('hidden');document.body.classList.remove('fighting');$('#hud').classList.remove('on');
  },1700);
}
function setEndBtns(list){const b=$('#endBtns');b.innerHTML='';list.forEach(([t,c,fn])=>{const e=document.createElement('button');e.className=c;e.textContent=t;e.addEventListener('click',fn);b.appendChild(e);});}
function drawSickNote(losers,winner){
  const c=$('#sickNote'),g=c.getContext('2d'),w=c.width,h=c.height;
  g.fillStyle='#fffdf4';g.fillRect(0,0,w,h);g.strokeStyle='rgba(80,120,200,.25)';g.lineWidth=2;for(let y=120;y<h;y+=42){g.beginPath();g.moveTo(30,y);g.lineTo(w-30,y);g.stroke();}
  g.fillStyle='#222';g.textAlign='center';g.font="46px 'Luckiest Guy', Kanit, sans-serif";g.fillText('SICK NOTE',w/2,70);
  g.textAlign='left';g.font="500 26px Fredoka, Kanit, sans-serif";
  const names=losers.map(f=>f.ch.name).join(', ');
  const lines=['Dear '+(winner.ch.id==='boss'?winner.ch.name+' (the winner)':'Boss'),'I, '+names,'need 1 day off after '+winner.ch.name+' knocked me out','in '+(losers[0]?locName(losers[0]):'the shop')+'. Symptoms: dizzy, seeing stars ⭐, craving som tam','Signed ......................... (patient)'];
  lines.forEach((l,i)=>g.fillText(l,46,112+i*42));
  g.save();g.translate(w-150,h-90);g.rotate(-0.25);g.strokeStyle='#d0202a';g.lineWidth=6;g.strokeRect(-100,-36,200,72);g.fillStyle='#d0202a';g.font="40px 'Luckiest Guy', Kanit, sans-serif";g.textAlign='center';g.fillText('APPROVED',0,14);g.restore();
  c.style.display=losers.length?'':'none';
}

/* ================= ARCADE ================= */
function startArcade(){
  const me=G.slots[0];
  const pool=shuffle(ROSTER.map((c,i)=>i).filter(i=>i!==me)).slice(0,5);
  G.arc={stage:0,list:[...pool,-1],me};G.wins={};
  showInter();
}
function arcadeLoc(stage,list){return stage===list.length-1?'boss':['in','out','wing','back','up'][stage%5];}
function showInter(){
  G.phase='between';$('#hud').classList.remove('on');document.body.classList.remove('fighting');$('#menu').classList.add('hidden');$('#endP').classList.add('hidden');
  const A=G.arc,opp=chOf(A.list[A.stage]),me=ROSTER[A.me],loc=arcadeLoc(A.stage,A.list),final=A.stage===A.list.length-1;
  $('#interT').textContent=final?'FINAL STAGE: THE BIG BOSS! 👑':'STAGE '+(A.stage+1)+' / '+A.list.length;
  $('#interLoc').textContent='Where: '+({in:'the showroom',out:'the front street',up:'the violin shop (2F)',back:'the back alley',wing:'the drum wing',boss:"the boss's office (mezzanine)"}[loc])+' · Opponent: '+opp.name+' — '+opp.role;
  portrait(me,$('#interA'));portrait(opp,$('#interB'),'attack');
  $('#interQ').textContent='"'+pick(opp.quotes)+'"';
  $('#interP').classList.remove('hidden');
}
$('#interGo').addEventListener('click',()=>{
  SFX.init();const A=G.arc;$('#interP').classList.add('hidden');
  const prevRage=G.f.find(f=>f.human===0)?G.f.find(f=>f.human===0).rage:0;
  clearFighters();const final=A.stage===A.list.length-1;
  G.f.push(new Fighter(ROSTER[A.me],0,{human:0,team:0,color:SLOTCOL[0],label:'P1',lo:humanLo(0,ROSTER[A.me])}));
  G.f.push(new Fighter(chOf(A.list[A.stage]),1,{human:null,team:1,color:SLOTCOL[1],label:'CPU',hpMul:final?1.45:1+A.stage*0.05,sizeMul:final?1.12:1,lo:final?{st:'wrestle',sp:'quake'}:randLoadout()}));
  G.f[0].rage=Math.min(prevRage,50);buildTags();
  G.roundLoc=arcadeLoc(A.stage,A.list);G.diff=Math.min(2,Math.max(G.baseDiff,Math.floor(A.stage/2)));
  enterFightUI();startRound(G.roundLoc);
});
function arcadeClear(){SFX.voLocal('congratulations',0.6);
  G.phase='end';const me=G.f[0];me.win=true;me.setExpr('win',0,true);
  const before=winsOf(me.ch);STATS.wins[me.ch.id]=before+2;saveAll();
  setTimeout(()=>{
    $('#endTitle').textContent='LADDER CLEARED! 🏆';const pics=$('#endPics');pics.innerHTML='';const c=document.createElement('canvas');c.width=c.height=260;portrait(me.ch,c,'win');pics.appendChild(c);
    $('#endSub').textContent=me.ch.name+' is Employee of the Month! 🎖️ (+2 wins)';
    drawSickNote(G.arc.list.map(i=>({ch:chOf(i),pos:{x:0,z:0},y:0})),me);
    setEndBtns([['Climb again','btn',()=>{G.diff=G.baseDiff;startArcade();}],['📸 Photo','btn ghost',()=>enterPhoto()],['Main menu','btn ghost',toMenu]]);
    $('#endP').classList.remove('hidden');$('#hud').classList.remove('on');document.body.classList.remove('fighting');
  },1500);
}
function arcadeLose(){SFX.voLocal('game_over',0.6);
  G.phase='end';
  setTimeout(()=>{
    const A=G.arc;$('#endTitle').textContent='Lost at stage '+(A.stage+1)+' 😵';const pics=$('#endPics');pics.innerHTML='';const c=document.createElement('canvas');c.width=c.height=260;portrait(chOf(A.list[A.stage]),c,'win');pics.appendChild(c);
    $('#endSub').textContent=chOf(A.list[A.stage]).name+' : "'+pick(chOf(A.list[A.stage]).quotes)+'"';
    drawSickNote([G.f[0]],G.f[1]);
    setEndBtns([['Retry this stage','btn',()=>{$('#endP').classList.add('hidden');showInter();}],['📸 Photo','btn ghost',()=>enterPhoto()],['Main menu','btn ghost',toMenu]]);
    $('#endP').classList.remove('hidden');$('#hud').classList.remove('on');document.body.classList.remove('fighting');
  },1500);
}

/* ================= REPLAY ================= */
const REC=[];let RP=null;
function record(){REC.push(G.f.map(f=>f.snap()));if(REC.length>150)REC.shift();}
function startReplay(){
  const idx=Math.max(0,G.f.indexOf(G.lastKO));
  RP={frames:REC.slice(),t:0,idx,yaw0:CAM.yaw+Math.PI*0.6};
  G.phase='replay';hideCenter();$('#replayLab').classList.remove('hidden');document.body.classList.add('letterbox');$('#hud').classList.remove('on');
  G.f.forEach(f=>{f._win=f.win;});
}
function updReplay(raw){
  RP.t+=raw*60*0.5;const i=Math.floor(RP.t);
  if(i>=RP.frames.length){endReplay();return;}
  const fr=RP.frames[i];G.f.forEach((f,k)=>{if(fr[k])f.applySnap(fr[k]);});
}
function skipReplay(){if(RP)RP.t=1e9;}
function endReplay(){
  const last=RP.frames[RP.frames.length-1];G.f.forEach((f,k)=>{if(last[k])f.applySnap(last[k]);});
  RP=null;$('#replayLab').classList.add('hidden');document.body.classList.remove('letterbox');$('#hud').classList.add('on');
  G.phase='post';G.phaseT=0;
}

/* ================= PHOTO MODE ================= */
let photoReturn=null;
function enterPhoto(){
  if(G.photo)return;
  photoReturn=!$('#pause').classList.contains('hidden')?'pause':(!$('#endP').classList.contains('hidden')?'end':null);
  if(!photoReturn&&['fight','intro','ko','post','replay'].includes(G.phase)){if(NET.role==='off')G.paused=true;photoReturn='resume';}
  G.photo=true;$('#pause').classList.add('hidden');$('#endP').classList.add('hidden');$('#photoBar').classList.remove('hidden');$('#hud').classList.remove('on');document.body.classList.remove('fighting');
  const p=G.f.find(f=>f.win)||G.f.find(f=>f.human===0)||G.f[0];CAM.pfocus=V(p.pos.x,p.y,p.pos.z);CAM.pyaw=p.face;CAM.ppitch=0.25;CAM.pdist=6;
}
function exitPhoto(){
  G.photo=false;$('#photoBar').classList.add('hidden');$('#shotP').classList.add('hidden');
  if(photoReturn==='pause')$('#pause').classList.remove('hidden');
  else if(photoReturn==='end')$('#endP').classList.remove('hidden');
  else if(photoReturn==='resume'){G.paused=false;$('#hud').classList.add('on');document.body.classList.add('fighting');}
  if(photoReturn==='pause'){$('#hud').classList.add('on');}
}
let lastShot=null;
function takeShot(){
  SFX.shutter();renderer.render(scene,camera);const src=renderer.domElement;
  const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d');g.drawImage(src,0,0);
  const s=c.width/1280;g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,c.height-64*s,c.width,64*s);
  g.fillStyle='#ffd23d';g.font=`${34*s}px 'Luckiest Guy', Kanit, sans-serif`;g.textBaseline='middle';g.fillText('OFFICE FIGHT NIGHT 🥊',20*s,c.height-32*s);
  g.fillStyle='#fff';g.font=`600 ${22*s}px Fredoka, Kanit, sans-serif`;g.textAlign='right';g.fillText('PETERSON SUKHUMVIT26 · '+new Date().toLocaleDateString('en-GB'),c.width-20*s,c.height-32*s);
  lastShot=c;$('#shotImg').src=c.toDataURL('image/jpeg',0.92);$('#copyShot').textContent='Copy picture';$('#shotP').classList.remove('hidden');flashScreen();
}
$('#snapBtn').addEventListener('click',takeShot);
$('#photoExit').addEventListener('click',exitPhoto);
$('#zIn').addEventListener('click',()=>CAM.pdist=clamp(CAM.pdist*0.85,2,20));
$('#zOut').addEventListener('click',()=>CAM.pdist=clamp(CAM.pdist*1.18,2,20));
$('#shotBack').addEventListener('click',()=>$('#shotP').classList.add('hidden'));
$('#shotDone').addEventListener('click',()=>{$('#shotP').classList.add('hidden');exitPhoto();});
$('#copyShot').addEventListener('click',()=>{const b=$('#copyShot');try{lastShot.toBlob(bl=>{navigator.clipboard.write([new ClipboardItem({'image/png':bl})]).then(()=>b.textContent='Copied ✓').catch(()=>b.textContent='Can\'t copy — long-press the picture instead');});}catch(e){b.textContent='Can\'t copy — long-press the picture instead';}});
$('#photoBtn').addEventListener('click',enterPhoto);

/* ================= PAUSE ================= */
function togglePause(force){if(NET.role!=='off'){const show=force!==undefined?force:$('#pause').classList.contains('hidden');$('#pause').classList.toggle('hidden',!show);$('#ctrlHelp2').innerHTML=ctrlHTML();$('#quitBtn').textContent='Leave match';return;}
  $('#quitBtn').textContent='Main menu';const p=force!==undefined?force:!G.paused;G.paused=p;$('#pause').classList.toggle('hidden',!p);$('#ctrlHelp2').innerHTML=ctrlHTML();held.clear();}
$('#resumeBtn').addEventListener('click',()=>togglePause(false));
/* ================= MOVE LIST ================= */
function keyName(c){return c==='Space'?'Space':c.startsWith('Shift')?'Shift':c.replace(/^Key|^Digit/,'');}
function keysOf(list){return list.filter(k=>!/^(T[A-Z]|Numpad|Arrow|Enter|G\d)/.test(k)).map(k=>'<kbd>'+keyName(k)+'</kbd>').join(' ')||'—';}
function buildMoves(){
  const S=G.humans===2?SCH.p1:SCH.solo,me=G.f.find(f=>f.human===0),meId=me?me.ch.id:null;
  const rows=[
    [keysOf(S.jab),'Jab','Fast, light — great for interrupting'],
    [keysOf(S.hook),'Hook','Slower but harder, knocks further'],
    [keysOf(S.jab)+' '+keysOf(S.jab)+' '+keysOf(S.hook),'Combo','Jab, jab, hook within 0.45 s → launches and knocks down'],
    [keysOf(S.blk),'Block','From the front you take only 15% · grabs beat blocks'],
    [keysOf(S.grab),'Grab / pick up / throw','Near someone = throw them (beats block) · near an item = pick it up · holding one = throw it'],
    [keysOf(S.jump),'Jump','Dodge thrown stuff, climb things'],
    [keysOf(S.sp),'Special','When the purple bar under your health is full (it fills when you hit and when you get hit)'],
    ['','COUNTER','Hit someone while they are winding up'],
  ];
  let h='<h3>Basics'+(G.humans===2?' (P1 keys)':'')+'</h3><div class="mvb">'+rows.map(r=>'<b>'+r[1]+(r[0]?' '+r[0]:'')+'</b><span>'+r[2]+'</span>').join('')+'</div>';
  h+='<p class="small">🎮 <b>Controller</b>: stick / d-pad move · <kbd>X</kbd> jab · <kbd>Y</kbd> hook · <kbd>RB</kbd> special · <kbd>LB</kbd> block · <kbd>B</kbd> grab / throw · <kbd>A</kbd> jump · right stick camera · <kbd>Start</kbd> pause. Controller 1 = P1, controller 2 = P2.</p>';
  h+='<h3>Stuff in the shop</h3><div style="font-size:14px;line-height:1.7">Swing it: '+Object.values(WEAPONS).map(w=>w.en).join(' · ')+' (breaks after a few hits — or throw it)<br>Snacks & envelopes: '+Object.values(POWER).map(p=>p.bad?p.en+' (feeling lucky?)':p.enTxt).join(' · ')+'</div>';
  const myLo=me?me.lo:STATS.lo[0]||{st:'box',sp:'rush'};
  h+='<h3>Fighting styles (pick before a match)</h3><div class="mvs" id="mvStyles"></div><h3>Specials (pick one)</h3><div class="mvs" id="mvList"></div>';
  $('#movesBody').innerHTML=h;
  const card=(box,icon,name,sub,desc,mine)=>{const el=document.createElement('div');el.className='mv'+(mine?' me':'');
    el.innerHTML='<div class="ic"></div><div><div class="nm"></div><div class="sp"></div><div class="ds"></div></div>';
    el.querySelector('.ic').textContent=icon;el.querySelector('.nm').textContent=name+(mine?' (yours)':'');el.querySelector('.sp').textContent=sub;el.querySelector('.ds').textContent=desc;box.appendChild(el);};
  STYLE_KEYS.forEach(k=>{const S=STYLES[k];card($('#mvStyles'),S.icon,S.name,'Jab: '+S.mv[0]+' · Hook: '+S.mv[1]+' · Combo: '+S.mv[2],S.desc,k===myLo.st);});
  SP_LIST.slice().sort((a,b)=>(b===myLo.sp)-(a===myLo.sp)).forEach(k=>card($('#mvList'),SP_ICON[k]||'⭐',spName(k),SP_MELEE.has(k)?'MELEE':'GADGET',SP_DESC[k]||'',k===myLo.sp));
}
/* ================= LOADOUT (fighting style + special, picked after the character) ================= */
const LD={who:0,cur:null};
function loadoutHumans(){return G.mode==='arcade'?1:G.humans;}
function openLoadout(h){
  LD.who=h;const ch=ROSTER[G.slots[h]];LD.cur=Object.assign({},humanLo(h,ch));
  $('#loadT').textContent=(loadoutHumans()>1?'P'+(h+1)+' · ':'')+'Pick your style, special & hat';
  portrait(ch,$('#loadPic'));$('#loadName').textContent=ch.name;
  $('#loadGo').textContent=h+1<loadoutHumans()?'Next: P'+(h+2)+' ▶':'Ready! 🥊';
  const sg=$('#stlGrid');sg.innerHTML='';
  STYLE_KEYS.forEach(k=>{const S=STYLES[k],el=document.createElement('button');el.className='opt';el.dataset.k=k;
    el.innerHTML='<span class="ic"></span><span><b></b><small class="ds"></small><small class="mvs2"></small></span>';
    el.querySelector('.ic').textContent=S.icon;el.querySelector('b').textContent=S.name;el.querySelector('.ds').textContent=S.desc;
    el.querySelector('.mvs2').textContent='Jab: '+S.mv[0]+' · Hook: '+S.mv[1]+' · Combo: '+S.mv[2];
    el.addEventListener('click',()=>{LD.cur.st=k;SFX.pickup();paintLoadout();});sg.appendChild(el);});
  const pg=$('#spGrid');pg.innerHTML='';
  SP_LIST.forEach(k=>{const el=document.createElement('button');el.className='opt sp';el.dataset.k=k;
    el.innerHTML='<span class="ic"></span><span><b></b><em></em><small class="ds"></small></span>';
    el.querySelector('.ic').textContent=SP_ICON[k]||'⭐';el.querySelector('b').textContent=spName(k);
    el.querySelector('em').textContent=SP_MELEE.has(k)?'MELEE':'GADGET';el.querySelector('em').className=SP_MELEE.has(k)?'melee':'toy';
    el.querySelector('.ds').textContent=SP_DESC[k]||'';
    el.addEventListener('click',()=>{LD.cur.sp=k;SFX.pickup();paintLoadout();});pg.appendChild(el);});
  const hg=$('#hatGrid');hg.innerHTML='';const tw=totalWins();
  $('#hatInfo').textContent='('+tw+' total win'+(tw===1?'':'s')+' — win matches to unlock more)';
  HATS.forEach((H,i)=>{const ok=hatOk(i),el=document.createElement('button');el.className='opt'+(ok?'':' lock');el.dataset.k=i;
    el.innerHTML='<span class="ic"></span><span><b></b><small class="ds"></small></span>';el.querySelector('.ic').textContent=ok?H.icon:'🔒';
    el.querySelector('b').textContent=H.name;el.querySelector('.ds').textContent=ok?(H.need?'Unlocked':''):'Win '+H.need+' matches';
    el.addEventListener('click',()=>{if(!ok){SFX.tone('square',220,160,0.08,0.06);return;}ch.hat=i;saveAll();SFX.pickup();paintLoadout();});hg.appendChild(el);});
  if(!hatOk(ch.hat|0))ch.hat=0;
  paintLoadout();$('#loadP').classList.remove('hidden');$('#loadP').scrollTop=0;
}
function paintLoadout(){
  document.querySelectorAll('#stlGrid .opt').forEach(b=>b.classList.toggle('on',b.dataset.k===LD.cur.st));
  document.querySelectorAll('#spGrid .opt').forEach(b=>b.classList.toggle('on',b.dataset.k===LD.cur.sp));
  const hch=ROSTER[G.slots[LD.who]];document.querySelectorAll('#hatGrid .opt').forEach(b=>b.classList.toggle('on',+b.dataset.k===(hch.hat|0)));
  $('#loadSum').textContent=STYLES[LD.cur.st].icon+' '+STYLES[LD.cur.st].name+' + '+(SP_ICON[LD.cur.sp]||'')+' '+spName(LD.cur.sp);
}
$('#loadRand').addEventListener('click',()=>{LD.cur=randLoadout();SFX.pickup();paintLoadout();});
$('#loadBack').addEventListener('click',()=>{$('#loadP').classList.add('hidden');});
$('#loadGo').addEventListener('click',()=>{
  STATS.lo[LD.who]={st:LD.cur.st,sp:LD.cur.sp};saveAll();
  if(LD.who+1<loadoutHumans()){openLoadout(LD.who+1);return;}
  $('#loadP').classList.add('hidden');startMatch();
});
function showMoves(on){if(on)buildMoves();$('#movesP').classList.toggle('hidden',!on);}
$('#movesBtn').addEventListener('click',()=>showMoves(true));
$('#movesBtn2').addEventListener('click',()=>showMoves(true));
$('#movesClose').addEventListener('click',()=>showMoves(false));
$('#quitBtn').addEventListener('click',()=>{if(NET.role!=='off')netQuitMatch();else toMenu();});
$('#pauseBtn').addEventListener('click',()=>{if(['fight','intro','ko','post'].includes(G.phase))togglePause();});
$('#muteBtn').addEventListener('click',()=>{SFX.setMuted(!SFX.muted);$('#muteBtn').textContent=SFX.muted?'🔇':'🔊';});

/* ================= MENU ================= */
function ctrlHTML(){
  const t='<span style="opacity:.8">Jab jab hook = combo · grab = throw people / pick up / throw items (beats block) · hit them mid-windup = COUNTER · no punching inside while a customer is in the shop!</span>';
  if(G.humans===2)return'<b>P1</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Space</kbd> jump · <kbd>Q</kbd> jab · <kbd>E</kbd> hook · <kbd>R</kbd> special · <kbd>F</kbd> grab · <kbd>Shift</kbd> block<br><b>P2</b> <kbd>I</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> move · <kbd>M</kbd> jump · <kbd>U</kbd> jab · <kbd>O</kbd> hook · <kbd>P</kbd> special · <kbd>H</kbd> grab · <kbd>N</kbd> block<br>'+t;
  return'<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Space</kbd> jump · <kbd>J</kbd> jab · <kbd>K</kbd> hook · <kbd>L</kbd> special · <kbd>U</kbd> grab / pick up / throw · <kbd>I</kbd> block · <kbd>Q</kbd>/<kbd>E</kbd> camera · <kbd>P</kbd> photo<br>'+t;
}
function buildSlots(){
  const box=$('#slots');box.innerHTML='';const n=G.mode==='arcade'?1:slotCount();
  for(let i=0;i<n;i++){const inf=slotInfo(i);const el=document.createElement('div');el.className='slot'+(G.slotSel===i?' on':'');el.dataset.s=i;
    el.innerHTML=`<span class="tag" style="--c:${inf.color}"></span><b></b>`;el.querySelector('.tag').textContent=inf.label;el.querySelector('b').textContent=ROSTER[G.slots[i]].name;
    el.addEventListener('click',()=>{G.slotSel=i;buildSlots();});box.appendChild(el);
    if(n===2&&i===0){const v=document.createElement('div');v.className='vs';v.textContent='VS';box.appendChild(v);}
    if(G.mode==='team'&&i===1){const v=document.createElement('div');v.className='vs';v.textContent='VS';box.appendChild(v);}}
  if(G.mode!=='arcade'){const r=document.createElement('button');r.className='btn ghost';r.textContent='🎲 Random CPUs';r.addEventListener('click',()=>{for(let i=0;i<slotCount();i++)if(slotInfo(i).human==null)G.slots[i]=Math.floor(Math.random()*ROSTER.length);buildSlots();updateCards();buildFromSlots();});box.appendChild(r);}
  const hints={duel:'One on one — first to 2 rounds',ffa:'Four-way free-for-all — last one standing takes the round',team:'2 vs 2 · no friendly fire'+(G.humans===2?' · P1 + P2 are on the same team':''),train:'Training: practise on a dummy, no timer, health refills after 2 s without a hit',arcade:'Pick a fighter and climb a ladder of 5 + the big boss (single player)'};
  $('#menuHint').textContent=hints[G.mode]+' · click a slot above, then a card · names and face photos can be edited';
  $('#humSeg').style.display=G.mode==='arcade'?'none':'';$('#locSeg').style.display=G.mode==='arcade'?'none':'';
}
function buildCards(){
  const grid=$('#grid');grid.innerHTML='';
  ROSTER.forEach((c,i)=>{
    const el=document.createElement('div');el.className='card';el.dataset.i=i;
    el.innerHTML=`<div class="badges"></div><canvas width="180" height="180"></canvas><input class="nmIn" maxlength="18"><div class="role"></div>
      <div class="ttl"></div>
      <div class="pbtns"><label class="btn sm">📷 Face photo<input type="file" accept="image/*" hidden></label><button class="btn sm ghost rm">Remove photo</button></div>`;
    el.querySelector('.role').textContent=c.role;
    const inp=el.querySelector('.nmIn');inp.value=c.name;
    inp.addEventListener('input',()=>{c.name=inp.value.trim()||c.name;buildSlots();saveAll();G.f.forEach(f=>{if(f.ch===c&&f.tagEl&&f.human==null)f.tagEl.textContent=c.name;});});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')inp.blur();e.stopPropagation();});
    el.querySelector('input[type=file]').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)loadPhoto(f,c);e.target.value='';});
    el.querySelector('.rm').addEventListener('click',()=>{c.photoImg=null;c.photoData=null;saveAll();refreshFaces();});
    el.addEventListener('click',e=>{if(e.target.closest('input,label,button'))return;SFX.init();G.slots[G.slotSel]=i;const n=G.mode==='arcade'?1:slotCount();G.slotSel=(G.slotSel+1)%n;buildSlots();updateCards();buildFromSlots();});
    grid.appendChild(el);
  });
  updateCards();
}
function loadPhoto(file,c){
  const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{const S=220,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');const m=Math.min(im.width,im.height);g.drawImage(im,(im.width-m)/2,(im.height-m)*0.3,m,m,0,0,S,S);
    c.photoData=cv.toDataURL('image/jpeg',0.85);const im2=new Image();im2.onload=()=>{c.photoImg=im2;saveAll();refreshFaces();};im2.src=c.photoData;};im.src=r.result;};
  r.readAsDataURL(file);
}
function updateCards(){
  const n=G.mode==='arcade'?1:slotCount();
  document.querySelectorAll('.card').forEach(el=>{
    const i=+el.dataset.i,c=ROSTER[i];portrait(c,el.querySelector('canvas'));
    const mine=[];for(let s=0;s<n;s++)if(G.slots[s]===i)mine.push(s);
    el.classList.toggle('sel',mine.length>0);if(mine.length)el.style.setProperty('--c',slotInfo(mine[0]).color);
    el.querySelector('.rm').style.display=c.photoImg?'':'none';
    const b=el.querySelector('.badges');b.innerHTML='';mine.forEach(s=>{const t=document.createElement('span');t.className='tag';t.style.setProperty('--c',slotInfo(s).color);t.textContent=slotInfo(s).label.split(' ')[0];b.appendChild(t);});
    const w=winsOf(c);
    el.querySelector('.ttl').textContent='Wins '+w+' · '+titleOf(w);
  });
  buildSlots();
}
function setSeg(id,attr,val){document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset[attr]===String(val)));}
document.querySelectorAll('#modeSeg button').forEach(b=>b.addEventListener('click',()=>{G.mode=b.dataset.m;setSeg('modeSeg','m',G.mode);if(G.mode==='arcade')G.humans=1;setSeg('humSeg','h',G.humans);G.slotSel=0;$('#ctrlHelp').innerHTML=ctrlHTML();updateCards();buildFromSlots();}));
document.querySelectorAll('#humSeg button').forEach(b=>b.addEventListener('click',()=>{G.humans=+b.dataset.h;setSeg('humSeg','h',G.humans);$('#ctrlHelp').innerHTML=ctrlHTML();updateCards();buildFromSlots();}));
document.querySelectorAll('#diffSeg button').forEach(b=>b.addEventListener('click',()=>{G.diff=G.baseDiff=+b.dataset.d;setSeg('diffSeg','d',G.diff);}));
document.querySelectorAll('#locSeg button').forEach(b=>b.addEventListener('click',()=>{G.loc=b.dataset.l;setSeg('locSeg','l',G.loc);placeFighters(G.loc);}));
function toMenu(){
  G.phase='menu';G.paused=false;G.photo=false;G.roundLoc=null;G.diff=G.baseDiff;RP=null;
  ['#pause','#endP','#interP','#shotP','#photoBar','#replayLab'].forEach(s=>$(s).classList.add('hidden'));document.body.classList.remove('letterbox');
  $('#menu').classList.remove('hidden');$('#hud').classList.remove('on');document.body.classList.remove('fighting');hideCenter();clearPops();
  resetWorld();buildFromSlots();updateCards();
}
$('#startBtn').addEventListener('click',()=>{SFX.init();openLoadout(0);});

function separateAll(){
  const L=G.f.filter(f=>f.state!=='ko'&&f.state!=='down'&&f.state!=='grabbed');
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if(Math.abs(a.y-b.y)>1.6)continue;
    const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz)||0.001,min=a.r+b.r;
    if(d<min){const p=(min-d)/2;a.pos.x-=dx/d*p;a.pos.z-=dz/d*p;b.pos.x+=dx/d*p;b.pos.z+=dz/d*p;}}
}

/* ================= BUTTON PROMPTS (floating key hints) ================= */
const PROMPTS=[];let promptN=0;
function promptAt(wp,html,cls){const v=wp.clone().project(camera);if(v.z>1||v.x<-1.1||v.x>1.1||v.y<-1.1||v.y>1.1)return;
  let el=PROMPTS[promptN];if(!el){el=document.createElement('div');$('#prompts').appendChild(el);PROMPTS.push(el);}promptN++;
  const c='kp'+(cls?' '+cls:'');if(el.className!==c)el.className=c;if(el._h!==html){el.innerHTML=html;el._h=html;}el.style.display='';
  el.style.transform=`translate(${(v.x+1)/2*innerWidth}px,${(1-v.y)/2*innerHeight}px) translate(-50%,-100%)`;}
function keyCap(f,act,hot){
  const touchUI=document.body.classList.contains('touch')&&f.human===0;
  const S=f.human===1?SCH.p2:(G.humans===2&&NET.role==='off'?SCH.p1:SCH.solo);
  const pad=padUsed(f.human===1?1:0);
  const txt=touchUI&&!pad?{grab:'GRAB',jab:'JAB',sp:'SP'}[act]:pad?PADLAB[act]:S[act][0].replace(/^Key|^Digit/,'').replace('ShiftLeft','Shift');
  return `<b class="${touchUI?'tb2':''}${hot?' hot':''}">${txt}</b>`;
}
function weaponsNear(f,d){
  if(NET.role==='client'){let best=null,bd=d;for(const o of NET.cl.items.values()){if(o.k!==0)continue;const p=o.mesh.position,dd=Math.hypot(p.x-f.pos.x,p.z-f.pos.z);if(dd<bd&&Math.abs(o.y-f.y)<1.3){bd=dd;best={x:p.x,y:o.y,z:p.z,type:o.type};}}return best;}
  return nearestWeapon(f,d);
}
function powersNear(f,d){
  const out=[];if(NET.role==='client'){for(const o of NET.cl.items.values())if(o.k===1&&Math.hypot(o.mesh.position.x-f.pos.x,o.mesh.position.z-f.pos.z)<d)out.push({x:o.mesh.position.x,y:o.y,z:o.mesh.position.z,type:o.type});}
  else for(const it of items)if(it.kind==='p'&&Math.hypot(it.x-f.pos.x,it.z-f.pos.z)<d)out.push(it);
  return out;
}
function updPrompts(){
  promptN=0;
  if(['fight','intro','ko','post'].includes(G.phase)&&!G.photo&&!(G.paused&&NET.role==='off')){
    const locals=G.f.filter(f=>f.human!=null&&f.state!=='ko');const seenP=new Set();
    for(const f of locals){
      const top=f.y+2.95*f.S;let off=0;
      if(f.rage>=100){promptAt(V(f.pos.x,top+0.42,f.pos.z),keyCap(f,'sp',true)+'SPECIAL!');off=0.42;}
      if(f.held){const W=WEAPONS[f.held.type];promptAt(V(f.pos.x,top+off,f.pos.z),keyCap(f,'grab')+'throw<span class="sep"></span>'+keyCap(f,'jab')+'swing'+(W?' ('+f.held.dur+')':''));}
      else if(!['stun','down','grabbed'].includes(f.state)){
        const w=weaponsNear(f,1.7);
        if(w&&WEAPONS[w.type])promptAt(V(w.x,w.y+1.05,w.z),keyCap(f,'grab')+'pick up '+WEAPONS[w.type].en);
        else{const e=nearestEnemy(f,1.55);if(e&&!['down','grabbed','ko'].includes(e.state)&&Math.abs(e.y-f.y)<0.9)promptAt(V(e.pos.x,e.y+2.95*e.S+0.32,e.pos.z),keyCap(f,'grab')+'throw');}
      }
      for(const p of powersNear(f,5)){const k=p.x+','+p.z;if(seenP.has(k)||!POWER[p.type])continue;seenP.add(k);promptAt(V(p.x,p.y+1.0,p.z),POWER[p.type].name,'item');}
    }
  }
  for(let i=promptN;i<PROMPTS.length;i++)if(PROMPTS[i].style.display!=='none')PROMPTS[i].style.display='none';
}

/* ================= MAIN LOOP ================= */
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const raw=Math.min(0.05,(now-last)/1000);last=now;
  pollPads();padMenus();
  if(NET.role==='client'){netClientFrame(raw);}
  else if(G.phase==='replay'&&RP){updReplay(raw);}
  else if(!G.paused){
    if(G.slowT>0){G.slowT-=raw;G.timeScale=G.slowT>0?0.3:1;}
    let dt=raw*G.timeScale;if(G.hitStop>0){G.hitStop-=raw;dt=0;}
    G.phaseT+=raw;G.clock+=dt;
    if(G.f.length){
      const fighting=G.phase==='fight';
      for(const f of G.f){let it=null;if(fighting)it=f.human!=null?readPlayer(f.human):(f.net?netInput(f):G.mode==='train'?dummyThink(f,dt):aiThink(f,dt));f.update(dt,it);}
      separateAll();
      if(fighting&&G.mode==='train')trainTick(dt);
      else if(fighting){G.timer-=raw;if(G.timer<=10&&!G.hurry){G.hurry=1;SFX.vo('hurry_up');}if(G.timer<=0){G.timer=0;timeUp();}}
      if(G.phase==='intro'&&G.phaseT>1.4){G.phase='fight';showCenter('FIGHT!','',0.8);SFX.bell();SFX.vo('go',0.15);}
      else if(G.phase==='ko'){if(G.replayPending&&G.phaseT>1.5){G.replayPending=false;startReplay();}else if(!G.replayPending&&G.phaseT>3.0)endRound();}
      else if(G.phase==='post'&&G.phaseT>0.7)endRound();
      if(G.phase==='fight'||G.phase==='ko')record();
      if(G.phase!=='menu')updHUD(raw);
    }
    updProjs(dt);updEffects(dt);updParts(dt);updItems(dt);updNPC(dt);if(G.mode!=='train')updEvents(dt);
    hype=Math.max(0,hype-raw*0.35);
  }
  if(NET.role==='host')netHostFrame(raw);
  updSmoke(raw*(G.phase==='replay'?0.5:G.timeScale||1));updRain(raw,CAM.focus);updCamera(raw);updFades(raw,CAM.focus);for(const f of G.f)f.hairFade(raw);updTags();updPops(raw);updPrompts();
  SFX.amb(G.phase==='menu'?0.4:(CAM.focus.z>3?1:CAM.focus.y>2?0.15:0.35));SFX.musicTempo(G.phase==='fight'&&G.timer<=15?132:G.phase==='end'?108:96);
  SFX.bgm(G.phase==='menu'||!G.f.length?'menu':G.phase==='end'?'win':G.mode==='train'?'train':'fight',G.phase==='fight'&&G.mode!=='train'&&G.timer<=15?1.08:1);
  renderer.render(scene,camera);
  pressed.clear();
}

/* ================= INIT ================= */
G.baseDiff=G.diff;
loadSave();
$('#ctrlHelp').innerHTML=ctrlHTML();
buildCards();resetWorld();buildFromSlots();
if(document.fonts&&document.fonts.ready){Promise.all(['400 96px "Luckiest Guy"','600 40px Fredoka','800 100px Kanit'].map(f=>document.fonts.load(f).catch(()=>0))).then(()=>document.fonts.ready).then(()=>{textTex.forEach(o=>{const g=o.c.getContext('2d');g.clearRect(0,0,o.c.width,o.c.height);o.draw(g,o.c.width,o.c.height);o.t.needsUpdate=true;});updateCards();});}
requestAnimationFrame(loop);
