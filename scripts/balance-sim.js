#!/usr/bin/env node
// Usage: node scripts/balance-sim.js [rounds=150] — CPU vs CPU duels with random loadouts on the stubbed test page;
// prints win rates per fighting style and per special, plus how often rolls / perfect blocks / splats / last stands happen.
// CPU-vs-CPU balance run on the stubbed test page: random styles/specials, no events, no crazy rules
const {chromium}=require('playwright');const {start}=require('./serve.js');
(async()=>{const srv=start(8799);const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8799/test.html');await p.waitForTimeout(800);
await p.click('#startBtn');await p.click('#loadGo');await p.waitForTimeout(1500);
const res=await p.evaluate(async(N)=>{
  const st={rounds:0,dur:0,timeouts:0,sudden:0,rolls:0,perfect:0,splat:0,laststand:0,comeback:0,styleW:{},styleN:{},spW:{},spN:{}};
  const R0=Fighter.prototype.startRoll;Fighter.prototype.startRoll=function(...a){st.rolls++;return R0.apply(this,a);};
  const P0=SFX.perfect;SFX.perfect=function(){st.perfect++;};
  G.mutOn=false;G.diff=1;
  for(let r=0;r<N;r++){
    G.mode='duel';G.round=1;startRound();G.evT=1e9;MUT.k=null;G.phase='fight';
    G.f.forEach(f=>{f.human=null;f.net=null;const lo=randLoadout();f.lo=lo;f.style=STYLES[lo.st];f.spKey=lo.sp;});
    const ls0=new Set();let t=0,dt=1/30,low=null;
    while(G.phase==='fight'&&t<200){
      for(const f of G.f){const it=aiThink(f,dt);f.update(dt,it);if(f.splatT>0.41)st.splat++;if(f.lastStand&&!ls0.has(f)){ls0.add(f);st.laststand++;if(!low)low=f;}}
      separateAll();updProjs(dt);updEffects(dt);updItems(dt);
      G.timer-=dt;t+=dt;if(G.timer<=0){G.timer=0;const s0=G.sudden;timeUp();if(G.sudden&&!s0)st.sudden++;}
    }
    st.rounds++;st.dur+=t;if(G.timer<=0)st.timeouts++;
    const w=G.f.find(f=>f.team===G.roundWinner);
    G.f.forEach(f=>{st.styleN[f.lo.st]=(st.styleN[f.lo.st]||0)+1;st.spN[f.lo.sp]=(st.spN[f.lo.sp]||0)+1;});
    if(w){st.styleW[w.lo.st]=(st.styleW[w.lo.st]||0)+1;st.spW[w.lo.sp]=(st.spW[w.lo.sp]||0)+1;if(low===w)st.comeback++;}
  }
  return st;},Number(process.argv[2]||150));
const pct=(w,n)=>n?Math.round(100*(w||0)/n)+'%':'-';
console.log('rounds',res.rounds,'avg s',(res.dur/res.rounds).toFixed(1),'timeouts',res.timeouts,'sudden',res.sudden,'rolls',res.rolls,'perfect',res.perfect,'splat-frames',res.splat,'laststand',res.laststand,'comeback wins',res.comeback);
console.log('STYLE win%',Object.keys(res.styleN).map(k=>k+' '+pct(res.styleW[k],res.styleN[k])+' ('+res.styleN[k]+')').join(' | '));
console.log('SPECIAL win%',Object.keys(res.spN).sort((a,b)=>(res.spW[b]||0)/res.spN[b]-(res.spW[a]||0)/res.spN[a]).map(k=>k+' '+pct(res.spW[k],res.spN[k])+'/'+res.spN[k]).join(' | '));
console.log('ERR',errs.slice(0,3));await b.close();})();
