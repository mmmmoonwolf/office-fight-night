'use strict';
/* ================= GAME STATE ================= */
const G={phase:'menu',mode:'duel',humans:1,diff:1,loc:'in',slots:[2,1,4,6],slotSel:0,f:[],round:1,wins:{},timer:99,phaseT:0,clock:0,timeScale:1,slowT:0,shake:0,hitStop:0,paused:false,photo:false,watch:0,rain:0,evT:12,arc:null,roundWinner:-1,lastKO:null,replayPending:false};
const SLOTCOL=['#e0303a','#2f6fe0','#2bb673','#f1b31c'];
const TEAMCOL=[['#e0303a','#ff8a5c'],['#2f6fe0','#36c5f0']];
const slotCount=()=>(G.mode==='ffa'||G.mode==='team')?4:2;
function slotInfo(i){
  const m=G.mode,two=G.humans===2;let human=null,team=i,color=SLOTCOL[i],label='คอม';
  if(i===0)human=0;else if(i===1&&two&&m!=='arcade')human=1;
  if(m==='team'){team=i<2?0:1;color=TEAMCOL[team][i%2];}
  if(m==='arcade'&&i===1){team=1;}
  if(human!=null)label='P'+(human+1);else if(slotCount()>2)label='คอม'+(m==='team'?(team===0?' (ทีมแดง)':' (ทีมฟ้า)'):'');
  if(m==='team'&&human!=null)label+=' ทีมแดง';
  return{human,team,color,label};
}

/* ================= SPAWNS ================= */
function spawnList(n,loc){
  const IN=[[-2.6,0,-1.4],[2.6,0,-1.4],[-2.6,0,1.4],[2.6,0,1.4]],OUT=[[-3,0.15,5.2],[3,0.15,5.2],[-3,0,10.4],[3,0,10.4]],UP=[[13.2,2.4,1.4],[19.4,2.4,-5.6],[13.2,2.4,-5.6],[19.4,2.4,1.6]],BOSS=[[2.0,0,-2.4],[9.4,2.4,-5.8]];
  const L=(loc==='boss'?BOSS:loc==='out'?OUT:loc==='up'?UP:IN).slice(0,n);
  return L.map(([x,y,z],i)=>{let cx=0,cz=0;L.forEach((q,j)=>{if(j!==i){cx+=q[0];cz+=q[2];}});cx/=Math.max(1,L.length-1);cz/=Math.max(1,L.length-1);return[x,y,z,Math.atan2(cx-x,cz-z)];});
}

/* ================= FIGHTER SETUP ================= */
function clearFighters(){G.f.forEach(f=>f.dispose());G.f=[];}
function buildFromSlots(){
  clearFighters();const n=slotCount();
  for(let i=0;i<n;i++){const inf=slotInfo(i);G.f.push(new Fighter(ROSTER[G.slots[i]],i,inf));}
  placeFighters(G.loc);buildTags();
}
function placeFighters(loc){const sp=spawnList(G.f.length,loc);G.f.forEach((f,i)=>f.reset(...sp[i]));}
function refreshFaces(){G.f.forEach(f=>f.redraw());updateCards();}

/* ================= TAGS ================= */
function buildTags(){const box=$('#tags');box.innerHTML='';G.f.forEach(f=>{const el=document.createElement('div');el.className='ftag';el.style.setProperty('--c',f.color);el.textContent=tagText(f);box.appendChild(el);f.tagEl=el;});}
function tagText(f){if(NET.role!=='off')return f.human===0?'คุณ':(f.player?f.label+' '+f.ch.name:f.ch.name);return f.human!=null?f.label:f.ch.name;}
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
    const w=G.mode==='arcade'?'':('🥊'.repeat(Math.min(2,G.wins[f.team]||0))+'⚪'.repeat(Math.max(0,2-(G.wins[f.team]||0))));
    let st=[];if(full)st.push('<b>ไม้ตายพร้อม'+(spKeyOf(f)?' ['+spKeyOf(f)+']':'')+'</b>');if(f.held)st.push('ถือ'+WEAPONS[f.held.type].name+' ('+f.held.dur+')');
    if(f.fx.dizzy>0)st.push('💫');if(f.fx.slow>0)st.push('🐌OT');if(f.fx.buff>0)st.push('💪');if(f.fx.immune>0)st.push('🌿');
    const html=w+' '+st.join(' · ');if(h._s!==html){h.sub.innerHTML=html;h._s=html;}
  }
  const t=Math.max(0,Math.ceil(G.timer));$('#timer').textContent=t;$('#timer').classList.toggle('hurry',t<=10&&G.phase==='fight');
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
    if(G.humans===1&&!G.paused){if(held.has('KeyQ'))CAM.yaw-=2.2*raw;if(held.has('KeyE'))CAM.yaw+=2.2*raw;}
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
function readPlayer(h){
  const S=h===1?SCH.p2:(G.humans===2?SCH.p1:SCH.solo);
  let rx=(has(held,S.rt)?1:0)-(has(held,S.lf)?1:0),rf=(has(held,S.up)?1:0)-(has(held,S.dn)?1:0);
  if(h===0){rx+=touch.x;rf-=touch.y;}
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
window.onGlobalKey=e=>{
  if(G.phase==='replay'){skipReplay();return;}
  if(!$('#interP').classList.contains('hidden')&&(e.code==='Enter'||e.code==='Space'||e.code==='KeyJ')){$('#interGo').click();return;}
  if(e.code==='Escape'){if(G.photo){exitPhoto();return;}if(['fight','intro','ko','post'].includes(G.phase))togglePause();return;}
  if(e.code==='KeyP'&&G.humans===1&&G.phase!=='menu'&&G.phase!=='lobby'&&!e.repeat){if(G.photo)exitPhoto();else enterPhoto();}
};

/* ================= ROUND FLOW ================= */
function startMatch(){
  SFX.init();SFX.music(true);
  if(G.mode==='arcade'){startArcade();return;}
  buildFromSlots();G.wins={};G.round=1;
  enterFightUI();startRound();
}
function enterFightUI(){
  $('#menu').classList.add('hidden');$('#endP').classList.add('hidden');$('#interP').classList.add('hidden');$('#pause').classList.add('hidden');
  $('#hud').classList.add('on');document.body.classList.add('fighting');buildHUD();
  $('#hint').textContent=G.humans===1?'Q/E หมุนกล้อง · ลากเมาส์หมุน · ล้อเมาส์ซูม · P ถ่ายรูป · Esc พัก':'ลากเมาส์หมุนกล้อง · Esc พัก';
}
function startRound(loc){
  G.matchWinner=-1;
  resetWorld();clearPops();hideCenter();
  placeFighters(loc||G.roundLoc||G.loc);
  G.timer=99;G.phase='intro';G.phaseT=0;G.roundWinner=-1;G.replayPending=false;G.lastKO=null;REC.length=0;hype=0;G.paused=false;G.timeScale=1;G.slowT=0;
  const p=G.f.find(f=>f.human===0)||G.f[0];CAM.yaw=(loc||G.roundLoc||G.loc)==='boss'?0.5:0;CAM.focus.set(p.pos.x,p.y,p.pos.z);
  const vs=G.f.length===2?G.f[0].ch.name+' VS '+G.f[1].ch.name:(G.mode==='team'?'ทีมแดง VS ทีมฟ้า':'ตะลุมบอน 4 คน!');
  $('#roundLab').textContent=G.mode==='arcade'?('ด่าน '+(G.arc.stage+1)+'/'+G.arc.list.length):('ROUND '+G.round);
  showCenter(G.mode==='arcade'?('ด่าน '+(G.arc.stage+1)):(G.round>=3?'ยกตัดสิน!':'ROUND '+G.round),G.round===1||G.mode==='arcade'?vs:'',1.3);
}
function aliveTeams(){const s=new Set();G.f.forEach(f=>{if(f.state!=='ko')s.add(f.team);});return[...s];}
function onKO(f,att){
  G.lastKO=f;hype=1;SFX.crowd();
  if(G.phase!=='fight')return;
  const at=aliveTeams();
  if(at.length<=1)endRoundBy(at.length?at[0]:-1,'ko');
  else{G.slowT=0.5;banner(f.ch.name+' หมดสภาพ! 😵',2);}
}
function endRoundBy(team,how){
  G.phase='ko';G.phaseT=0;G.roundWinner=team;
  if(team>=0)G.wins[team]=(G.wins[team]||0)+1;
  const ws=G.f.filter(f=>f.team===team&&f.state!=='ko');ws.forEach(f=>{f.win=true;f.setExpr('win',0,true);});
  if(ws[0])say(ws[0],pick(ws[0].ch.quotes),true);
  const wname=team<0?'':(G.mode==='team'?(team===0?'ทีมแดง':'ทีมฟ้า'):(G.f.find(f=>f.team===team).ch.name));
  if(how==='ko'){G.slowT=1.0;showCenter('K.O.!!',wname?wname+' ชนะยกนี้!':'เสมอ!',2.2);G.replayPending=REC.length>40;}
  else{SFX.bell();showCenter('หมดเวลา!',wname?wname+' ชนะคะแนน!':'เสมอ! ไปทำงานต่อ',2.4);}
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
function locName(f){if(lvlOf(f)==='f2')return'ร้านไวโอลินชั้น 2';if(onMezz(f))return'ห้องหัวหน้า';return f.pos.z<2.95?'กลางโชว์รูม':'ริมถนนหน้าร้าน';}
function endMatch(team){
  G.matchWinner=team;G.phase='end';G.phaseT=0;hideCenter();SFX.crowd();hype=1;
  const winners=G.f.filter(f=>f.team===team),losers=G.f.filter(f=>f.team!==team);
  G.f.forEach(f=>{f.win=f.team===team;if(f.win){if(f.state==='ko'){f.state='idle';f.hp=1;}f.setExpr('win',0,true);}});
  const unlocks=[];
  if(winners.some(f=>f.human!=null))winners.filter(f=>f.human!=null).forEach(f=>{const before=winsOf(f.ch);STATS.wins[f.ch.id]=before+1;GLOVES.forEach(g=>{if(g.need===before+1&&g.need>0)unlocks.push(f.ch.name+' ปลดล็อกถุงมือ'+g.name+'!');});});
  saveAll();
  setTimeout(()=>{if(G.phase!=='end')return;
    const hw=winners.find(f=>f.human!=null);
    $('#endTitle').textContent=G.mode==='team'?((team===0?'ทีมแดง':'ทีมฟ้า')+' ชนะ! 🏆'):(hw?(G.humans===2?hw.label+' ชนะ! 🏆':'คุณชนะ! 🏆'):(winners[0].ch.name+' ชนะ... 😵'));
    const pics=$('#endPics');pics.innerHTML='';winners.forEach(f=>{const c=document.createElement('canvas');c.width=c.height=260;portrait(f.ch,c,'win');pics.appendChild(c);});
    const w0=winners[0];$('#endSub').innerHTML='';const q=document.createElement('div');q.textContent=w0.ch.name+' : "'+pick(w0.ch.quotes)+'" · '+titleOf(winsOf(w0.ch));$('#endSub').appendChild(q);
    unlocks.forEach(u=>{const d=document.createElement('div');d.style.color='#ffd23d';d.style.fontWeight='800';d.textContent='🎉 '+u;$('#endSub').appendChild(d);});
    drawSickNote(losers,w0);
    if(NET.role==='host')setEndBtns([['เล่นอีกตา','btn',()=>netHostStart()],['📸 ถ่ายรูป','btn ghost',()=>enterPhoto()],['กลับห้อง','btn ghost',()=>netQuitMatch()]]);
    else setEndBtns([['รีแมตช์','btn',()=>startMatch()],['📸 ถ่ายรูป','btn ghost',()=>enterPhoto()],['เลือกตัวใหม่','btn ghost',toMenu]]);
    $('#endP').classList.remove('hidden');document.body.classList.remove('fighting');$('#hud').classList.remove('on');
  },1700);
}
function setEndBtns(list){const b=$('#endBtns');b.innerHTML='';list.forEach(([t,c,fn])=>{const e=document.createElement('button');e.className=c;e.textContent=t;e.addEventListener('click',fn);b.appendChild(e);});}
function drawSickNote(losers,winner){
  const c=$('#sickNote'),g=c.getContext('2d'),w=c.width,h=c.height;
  g.fillStyle='#fffdf4';g.fillRect(0,0,w,h);g.strokeStyle='rgba(80,120,200,.25)';g.lineWidth=2;for(let y=120;y<h;y+=42){g.beginPath();g.moveTo(30,y);g.lineTo(w-30,y);g.stroke();}
  g.fillStyle='#222';g.textAlign='center';g.font='800 46px Kanit, sans-serif';g.fillText('ใบลาป่วย',w/2,70);
  g.textAlign='left';g.font='26px Kanit, sans-serif';
  const names=losers.map(f=>f.ch.name).join(', ');
  const lines=['เรียน '+(winner.ch.id==='boss'?'คุณหัวหน้า (ผู้ชนะ)':'หัวหน้างาน'),'ข้าพเจ้า '+names,'ขอลาป่วย 1 วัน เนื่องจากโดน '+winner.ch.name+' ต่อยจนน็อก','ที่'+(losers[0]?locName(losers[0]):'ร้าน')+' อาการ: มึนหัว เห็นดาว ⭐ อยากกินส้มตำ','ลงชื่อ ......................... (ผู้ป่วย)'];
  lines.forEach((l,i)=>g.fillText(l,46,112+i*42));
  g.save();g.translate(w-150,h-90);g.rotate(-0.25);g.strokeStyle='#d0202a';g.lineWidth=6;g.strokeRect(-100,-36,200,72);g.fillStyle='#d0202a';g.font='800 40px Kanit, sans-serif';g.textAlign='center';g.fillText('อนุมัติ',0,14);g.restore();
  c.style.display=losers.length?'':'none';
}

/* ================= ARCADE ================= */
function startArcade(){
  const me=G.slots[0];const bossIdx=ROSTER.findIndex(c=>c.id===(ROSTER[me].id==='boss'?'bomb':'boss'));
  const pool=shuffle(ROSTER.map((c,i)=>i).filter(i=>i!==me&&i!==bossIdx)).slice(0,5);
  G.arc={stage:0,list:[...pool,bossIdx],me};G.wins={};
  showInter();
}
function arcadeLoc(stage,list){return stage===list.length-1?'boss':['in','out','up'][stage%3];}
function showInter(){
  G.phase='between';$('#hud').classList.remove('on');document.body.classList.remove('fighting');$('#menu').classList.add('hidden');$('#endP').classList.add('hidden');
  const A=G.arc,opp=ROSTER[A.list[A.stage]],me=ROSTER[A.me],loc=arcadeLoc(A.stage,A.list),final=A.stage===A.list.length-1;
  $('#interT').textContent=final?'ด่านสุดท้าย: บอสใหญ่! 👑':'ด่าน '+(A.stage+1)+' / '+A.list.length;
  $('#interLoc').textContent='สถานที่: '+({in:'กลางโชว์รูม',out:'ริมถนนหน้าร้าน',up:'ร้านไวโอลินชั้น 2',boss:'ห้องหัวหน้า (ชั้นลอย)'}[loc])+' · คู่ต่อสู้: '+opp.name+' — '+opp.role;
  portrait(me,$('#interA'));portrait(opp,$('#interB'),'attack');
  $('#interQ').textContent='"'+pick(opp.quotes)+'"';
  $('#interP').classList.remove('hidden');
}
$('#interGo').addEventListener('click',()=>{
  SFX.init();const A=G.arc;$('#interP').classList.add('hidden');
  const prevRage=G.f.find(f=>f.human===0)?G.f.find(f=>f.human===0).rage:0;
  clearFighters();const final=A.stage===A.list.length-1;
  G.f.push(new Fighter(ROSTER[A.me],0,{human:0,team:0,color:SLOTCOL[0],label:'P1'}));
  G.f.push(new Fighter(ROSTER[A.list[A.stage]],1,{human:null,team:1,color:SLOTCOL[1],label:'คอม',hpMul:final?1.45:1+A.stage*0.05,sizeMul:final?1.12:1}));
  G.f[0].rage=Math.min(prevRage,50);buildTags();
  G.roundLoc=arcadeLoc(A.stage,A.list);G.diff=Math.min(2,Math.max(G.baseDiff,Math.floor(A.stage/2)));
  enterFightUI();startRound(G.roundLoc);
});
function arcadeClear(){
  G.phase='end';const me=G.f[0];me.win=true;me.setExpr('win',0,true);
  const before=winsOf(me.ch);STATS.wins[me.ch.id]=before+2;saveAll();
  setTimeout(()=>{
    $('#endTitle').textContent='เคลียร์บันได! 🏆';const pics=$('#endPics');pics.innerHTML='';const c=document.createElement('canvas');c.width=c.height=260;portrait(me.ch,c,'win');pics.appendChild(c);
    $('#endSub').textContent=me.ch.name+' ได้ตำแหน่ง "พนักงานดีเด่นประจำเดือน" 🎖️ (+2 ชนะ)';
    drawSickNote(G.arc.list.map(i=>({ch:ROSTER[i],pos:{x:0,z:0},y:0})),me);
    setEndBtns([['เล่นบันไดอีกรอบ','btn',()=>{G.diff=G.baseDiff;startArcade();}],['📸 ถ่ายรูป','btn ghost',()=>enterPhoto()],['กลับเมนู','btn ghost',toMenu]]);
    $('#endP').classList.remove('hidden');$('#hud').classList.remove('on');document.body.classList.remove('fighting');
  },1500);
}
function arcadeLose(){
  G.phase='end';
  setTimeout(()=>{
    const A=G.arc;$('#endTitle').textContent='แพ้ที่ด่าน '+(A.stage+1)+' 😵';const pics=$('#endPics');pics.innerHTML='';const c=document.createElement('canvas');c.width=c.height=260;portrait(ROSTER[A.list[A.stage]],c,'win');pics.appendChild(c);
    $('#endSub').textContent=ROSTER[A.list[A.stage]].name+' : "'+pick(ROSTER[A.list[A.stage]].quotes)+'"';
    drawSickNote([G.f[0]],G.f[1]);
    setEndBtns([['สู้ใหม่ (ด่านเดิม)','btn',()=>{$('#endP').classList.add('hidden');showInter();}],['📸 ถ่ายรูป','btn ghost',()=>enterPhoto()],['กลับเมนู','btn ghost',toMenu]]);
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
  g.fillStyle='#ffd23d';g.font=`800 ${34*s}px Kanit, sans-serif`;g.textBaseline='middle';g.fillText('ศึกออฟฟิศ 🥊',20*s,c.height-32*s);
  g.fillStyle='#fff';g.font=`600 ${22*s}px Kanit, sans-serif`;g.textAlign='right';g.fillText('PETERSON SUKHUMVIT26 · '+new Date().toLocaleDateString('th-TH'),c.width-20*s,c.height-32*s);
  lastShot=c;$('#shotImg').src=c.toDataURL('image/jpeg',0.92);$('#copyShot').textContent='คัดลอกรูป';$('#shotP').classList.remove('hidden');flashScreen();
}
$('#snapBtn').addEventListener('click',takeShot);
$('#photoExit').addEventListener('click',exitPhoto);
$('#zIn').addEventListener('click',()=>CAM.pdist=clamp(CAM.pdist*0.85,2,20));
$('#zOut').addEventListener('click',()=>CAM.pdist=clamp(CAM.pdist*1.18,2,20));
$('#shotBack').addEventListener('click',()=>$('#shotP').classList.add('hidden'));
$('#shotDone').addEventListener('click',()=>{$('#shotP').classList.add('hidden');exitPhoto();});
$('#copyShot').addEventListener('click',()=>{const b=$('#copyShot');try{lastShot.toBlob(bl=>{navigator.clipboard.write([new ClipboardItem({'image/png':bl})]).then(()=>b.textContent='คัดลอกแล้ว ✓').catch(()=>b.textContent='คัดลอกไม่ได้ ใช้กดค้างที่รูปแทน');});}catch(e){b.textContent='คัดลอกไม่ได้ ใช้กดค้างที่รูปแทน';}});
$('#photoBtn').addEventListener('click',enterPhoto);

/* ================= PAUSE ================= */
function togglePause(force){if(NET.role!=='off'){const show=force!==undefined?force:$('#pause').classList.contains('hidden');$('#pause').classList.toggle('hidden',!show);$('#ctrlHelp2').innerHTML=ctrlHTML();$('#quitBtn').textContent='ออกจากแมตช์';return;}
  $('#quitBtn').textContent='กลับเมนู';const p=force!==undefined?force:!G.paused;G.paused=p;$('#pause').classList.toggle('hidden',!p);$('#ctrlHelp2').innerHTML=ctrlHTML();held.clear();}
$('#resumeBtn').addEventListener('click',()=>togglePause(false));
$('#quitBtn').addEventListener('click',()=>{if(NET.role!=='off')netQuitMatch();else toMenu();});
$('#pauseBtn').addEventListener('click',()=>{if(['fight','intro','ko','post'].includes(G.phase))togglePause();});
$('#muteBtn').addEventListener('click',()=>{SFX.setMuted(!SFX.muted);$('#muteBtn').textContent=SFX.muted?'🔇':'🔊';});

/* ================= MENU ================= */
function ctrlHTML(){
  const t='<span style="opacity:.8">จ็อบ จ็อบ ฮุก = คอมโบ · จับ = ทุ่มคน/หยิบของ/ขว้างของ (ทะลุการ์ด) · ต่อยตอนอีกฝ่ายง้าง = COUNTER · ลูกค้าเข้าร้านห้ามต่อยในร้าน!</span>';
  if(G.humans===2)return'<b>P1</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> เดิน · <kbd>Space</kbd> โดด · <kbd>Q</kbd> จ็อบ · <kbd>E</kbd> ฮุก · <kbd>R</kbd> ไม้ตาย · <kbd>F</kbd> จับ/หยิบ · <kbd>Shift</kbd> กัน<br><b>P2</b> <kbd>I</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> เดิน · <kbd>M</kbd> โดด · <kbd>U</kbd> จ็อบ · <kbd>O</kbd> ฮุก · <kbd>P</kbd> ไม้ตาย · <kbd>H</kbd> จับ/หยิบ · <kbd>N</kbd> กัน<br>'+t;
  return'<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> เดิน · <kbd>Space</kbd> โดด · <kbd>J</kbd> จ็อบ · <kbd>K</kbd> ฮุก · <kbd>L</kbd> ไม้ตาย · <kbd>U</kbd> จับ/หยิบ/ขว้าง · <kbd>I</kbd> กัน · <kbd>Q</kbd>/<kbd>E</kbd> หมุนกล้อง · <kbd>P</kbd> ถ่ายรูป<br>'+t;
}
function buildSlots(){
  const box=$('#slots');box.innerHTML='';const n=G.mode==='arcade'?1:slotCount();
  for(let i=0;i<n;i++){const inf=slotInfo(i);const el=document.createElement('div');el.className='slot'+(G.slotSel===i?' on':'');el.dataset.s=i;
    el.innerHTML=`<span class="tag" style="--c:${inf.color}"></span><b></b>`;el.querySelector('.tag').textContent=inf.label;el.querySelector('b').textContent=ROSTER[G.slots[i]].name;
    el.addEventListener('click',()=>{G.slotSel=i;buildSlots();});box.appendChild(el);
    if(n===2&&i===0){const v=document.createElement('div');v.className='vs';v.textContent='VS';box.appendChild(v);}
    if(G.mode==='team'&&i===1){const v=document.createElement('div');v.className='vs';v.textContent='VS';box.appendChild(v);}}
  if(G.mode!=='arcade'){const r=document.createElement('button');r.className='btn ghost';r.textContent='🎲 สุ่มคอม';r.addEventListener('click',()=>{for(let i=0;i<slotCount();i++)if(slotInfo(i).human==null)G.slots[i]=Math.floor(Math.random()*ROSTER.length);buildSlots();updateCards();buildFromSlots();});box.appendChild(r);}
  const hints={duel:'ดวลตัวต่อตัว ชนะ 2 ยกก่อนชนะ',ffa:'4 คนตะลุมบอน ใครยืนคนสุดท้ายชนะยก',team:'2 ต่อ 2 · ทีมเดียวกันต่อยกันไม่เข้า'+(G.humans===2?' · P1+P2 อยู่ทีมเดียวกัน':''),arcade:'เลือกตัวเอง แล้วไต่บันได 5 คน + บอสใหญ่ที่ห้องหัวหน้า (โหมดนี้เล่นคนเดียว)'};
  $('#menuHint').textContent=hints[G.mode]+' · กดช่องด้านบนเพื่อเลือกว่ากำลังเลือกตัวให้ใคร แล้วกดการ์ด · แก้ชื่อ/ใส่รูปหน้าเพื่อนได้';
  $('#humSeg').style.display=G.mode==='arcade'?'none':'';$('#locSeg').style.display=G.mode==='arcade'?'none':'';
}
function buildCards(){
  const grid=$('#grid');grid.innerHTML='';
  ROSTER.forEach((c,i)=>{
    const el=document.createElement('div');el.className='card';el.dataset.i=i;
    const bar=v=>`<b><i style="width:${Math.round(clamp(v,0.08,1)*100)}%"></i></b>`;
    el.innerHTML=`<div class="badges"></div><canvas width="180" height="180"></canvas><input class="nmIn" maxlength="18"><div class="role"></div>
      <div class="stat"><span>พลัง</span>${bar((c.pow-0.8)/0.45)}</div><div class="stat"><span>ความไว</span>${bar((c.spd*0.5+c.aspd*0.5-0.75)/0.45)}</div><div class="stat"><span>ความอึด</span>${bar((c.hp-70)/75)}</div>
      <div class="spc"></div><div class="ttl"></div>
      <div class="pbtns"><label class="btn sm">📷 รูปหน้า<input type="file" accept="image/*" hidden></label><button class="btn sm ghost rm">ลบรูป</button><button class="btn sm ghost glv"></button></div>`;
    el.querySelector('.role').textContent=c.role;el.querySelector('.spc').textContent='ไม้ตาย: '+SPECIALS[c.sp].name;
    const inp=el.querySelector('.nmIn');inp.value=c.name;
    inp.addEventListener('input',()=>{c.name=inp.value.trim()||c.name;buildSlots();saveAll();G.f.forEach(f=>{if(f.ch===c&&f.tagEl&&f.human==null)f.tagEl.textContent=c.name;});});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')inp.blur();e.stopPropagation();});
    el.querySelector('input[type=file]').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)loadPhoto(f,c);e.target.value='';});
    el.querySelector('.rm').addEventListener('click',()=>{c.photoImg=null;c.photoData=null;saveAll();refreshFaces();});
    el.querySelector('.glv').addEventListener('click',()=>{const w=winsOf(c);let g=c.glove||0;for(let k=1;k<=GLOVES.length;k++){const n=(g+k)%GLOVES.length;if(GLOVES[n].need<=w){g=n;break;}}c.glove=g;saveAll();updateCards();buildFromSlots();});
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
    const w=winsOf(c);const nextG=GLOVES.find(g=>g.need>w);
    el.querySelector('.ttl').textContent='ชนะ '+w+' · '+titleOf(w)+(nextG?' · อีก '+(nextG.need-w)+' ชนะปลดถุงมือ'+nextG.name:'');
    el.querySelector('.glv').textContent='🥊 '+GLOVES[c.glove||0].name;
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
$('#startBtn').addEventListener('click',startMatch);

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
  const txt=touchUI?{grab:'หยิบ/จับ',jab:'จ็อบ',sp:'ไม้ตาย'}[act]:S[act][0].replace(/^Key|^Digit/,'').replace('ShiftLeft','Shift');
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
      if(f.rage>=100){promptAt(V(f.pos.x,top+0.42,f.pos.z),keyCap(f,'sp',true)+'ไม้ตาย!');off=0.42;}
      if(f.held){const W=WEAPONS[f.held.type];promptAt(V(f.pos.x,top+off,f.pos.z),keyCap(f,'grab')+'ขว้าง<span class="sep"></span>'+keyCap(f,'jab')+'ฟาด'+(W?' ('+f.held.dur+')':''));}
      else if(!['stun','down','grabbed'].includes(f.state)){
        const w=weaponsNear(f,1.7);
        if(w&&WEAPONS[w.type])promptAt(V(w.x,w.y+1.05,w.z),keyCap(f,'grab')+'หยิบ '+WEAPONS[w.type].name);
        else{const e=nearestEnemy(f,1.55);if(e&&!['down','grabbed','ko'].includes(e.state)&&Math.abs(e.y-f.y)<0.9)promptAt(V(e.pos.x,e.y+2.95*e.S+0.32,e.pos.z),keyCap(f,'grab')+'จับทุ่ม');}
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
  if(NET.role==='client'){netClientFrame(raw);}
  else if(G.phase==='replay'&&RP){updReplay(raw);}
  else if(!G.paused){
    if(G.slowT>0){G.slowT-=raw;G.timeScale=G.slowT>0?0.3:1;}
    let dt=raw*G.timeScale;if(G.hitStop>0){G.hitStop-=raw;dt=0;}
    G.phaseT+=raw;G.clock+=dt;
    if(G.f.length){
      const fighting=G.phase==='fight';
      for(const f of G.f){let it=null;if(fighting)it=f.human!=null?readPlayer(f.human):(f.net?netInput(f):aiThink(f,dt));f.update(dt,it);}
      separateAll();
      if(fighting){G.timer-=raw;if(G.timer<=0){G.timer=0;timeUp();}}
      if(G.phase==='intro'&&G.phaseT>1.4){G.phase='fight';showCenter('ชก!!','',0.8);SFX.bell();}
      else if(G.phase==='ko'){if(G.replayPending&&G.phaseT>1.5){G.replayPending=false;startReplay();}else if(!G.replayPending&&G.phaseT>3.0)endRound();}
      else if(G.phase==='post'&&G.phaseT>0.7)endRound();
      if(G.phase==='fight'||G.phase==='ko')record();
      if(G.phase!=='menu')updHUD(raw);
    }
    updProjs(dt);updEffects(dt);updParts(dt);updItems(dt);updNPC(dt);updEvents(dt);
    hype=Math.max(0,hype-raw*0.35);
  }
  if(NET.role==='host')netHostFrame(raw);
  updRain(raw,CAM.focus);updCamera(raw);updFades(raw,CAM.focus);updTags();updPops(raw);updPrompts();
  SFX.amb(G.phase==='menu'?0.4:(CAM.focus.z>3?1:CAM.focus.y>2?0.15:0.35));SFX.musicTempo(G.phase==='fight'&&G.timer<=15?132:G.phase==='end'?108:96);
  renderer.render(scene,camera);
  pressed.clear();
}

/* ================= INIT ================= */
G.baseDiff=G.diff;
loadSave();
$('#ctrlHelp').innerHTML=ctrlHTML();
buildCards();resetWorld();buildFromSlots();
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(()=>{textTex.forEach(o=>{const g=o.c.getContext('2d');g.clearRect(0,0,o.c.width,o.c.height);o.draw(g,o.c.width,o.c.height);o.t.needsUpdate=true;});updateCards();});}
requestAnimationFrame(loop);
