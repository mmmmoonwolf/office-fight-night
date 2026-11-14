'use strict';
/* ================= MOCAP POSES =================
   Fight animations from Mixamo, baked offline into ANIM_DATA (js/anim_data.js) as 14 pose channels per frame.
   The chibi rig has no skeleton, so a pose drives what the rig does have: glove targets (arms are IK), torso
   lean/twist/roll, leg swing, hip bob and head nod/tilt. Fighter.animate() asks animPose() every frame and falls back
   to the hand-made procedural poses whenever it returns null (kicks, slaps, weapons, specials, block, KO, emotes…). */
const ANIM_ON={v:true};
const ACH=14,AFPS=30;
function animSample(key,fr){
  const c=ANIM_DATA[key];fr=Math.max(0,Math.min(c.n-1,fr));const i=Math.floor(fr),j=Math.min(c.n-1,i+1),k=fr-i,o=new Array(ACH);
  for(let q=0;q<ACH;q++)o[q]=(c.f[i*ACH+q]*(1-k)+c.f[j*ACH+q]*k)/1000;return o;}
function animMirror(p){const o=p.slice();o[0]=-p[3];o[1]=p[4];o[2]=p[5];o[3]=-p[0];o[4]=p[1];o[5]=p[2];o[7]=-p[7];o[8]=-p[8];o[9]=p[10];o[10]=p[9];o[13]=-p[13];return o;}
// twist, bob and head are stored absolute; make them relative to the clip's first frame (the boxer's stance turn is not wanted)
function animRel(p,key){const b=animSample(key,0);p[7]-=b[7];p[11]-=b[11];p[12]-=b[12];p[13]-=b[13];return p;}
const lerpArr=(a,b,k)=>a.map((v,q)=>v+(b[q]-v)*k);
// attack moves → clip window: anticipation a → impact i is squeezed into the move's startup, i → e into active+recover;
// back = blend from the impact pose to the fighting stance instead of playing the clip's own follow-through
// side = which hand/leg the clip uses (mirrored for the other one); mirror = always mirror (weapon is in the left glove)
const ATK_CLIP={jab:{L:'jab',R:'cross',a:4,i:18,e:30,ri:12},hook:{L:'hook',a:3,i:13,e:36},combo:{L:'upper',a:4,i:16,e:20,back:1},
  kick:{L:'kick1',R:'kick2',a:8,i:18,e:34,ri:20},kickH:{L:'mmaKick',side:'R',a:10,i:21,e:40},
  swingL:{L:'melee',mirror:1,a:12,i:30,e:38},swingH:{L:'melee',mirror:1,a:36,i:48,e:60}};
const HIT_CLIPS={light:['hitL','hitBody'],mid:['hitM','hitFace','hitHead'],big:['hitBig','hitUpper']};
function idlePose(f){const c=ANIM_DATA.idle;return animRel(animSample('idle',(f.t*AFPS*0.9)%(c.n-1)),'idle');}
function animPose(f){
  if(!ANIM_ON.v||typeof ANIM_DATA==='undefined'||f.win)return null;
  const S=f.state,A=f.atk;
  if(S==='attack'&&A){
    const m=ATK_CLIP[A.type==='swingL'||A.type==='swingH'?A.type:A.def.pose||A.type];if(!m)return null;
    // the punching hand / kicking leg: use the clip recorded with that side, or mirror the other one
    let key=m.L,mir=m.mirror?true:m.side==='R'?A.hand===0:A.hand===1,imp=m.i;if(!m.mirror&&mir&&m.R){key=m.R;mir=false;imp=m.ri;}
    const d=A.def,t=A.t,a=m.a*(imp/m.i);let p;
    if(t<d.startup)p=animSample(key,a+(imp-a)*(t/d.startup));
    else if(t<d.startup+d.active)p=animSample(key,imp);
    else{const k=Math.min(1,(t-d.startup-d.active)/Math.max(0.01,d.recover));
      p=m.back?lerpArr(animRel(animSample(key,imp),key),idlePose(f),easeInOutCubic(k)):animRel(animSample(key,imp+(m.e*(imp/m.i)-imp)*k),key);
      return{p:mir?animMirror(p):p,legs:true};}
    animRel(p,key);return{p:mir?animMirror(p):p,legs:true};
  }
  // throwing a held item (mirrored: the item sits in the left glove) and grab → throw (both hands)
  if(S==='recover'&&f.t-(f.throwAt||-9)<0.5){const k=(f.t-f.throwAt)/0.5,fr=k<0.25?54+(72-54)*k/0.25:72+(90-72)*(k-0.25)/0.75;return{p:animMirror(animRel(animSample('throw',fr),'throw')),legs:true};}
  if(S==='grab'){const T=f.superGrab?0.55:0.32,k=Math.min(1,f.grabT/T);return{p:animRel(animSample('throwBig',20+(46-20)*k),'throwBig'),legs:true};}
  if(S==='stun'&&f.react){
    const r=f.react,c=ANIM_DATA[r.c],fr=r.t*AFPS*1.25;
    if(fr<c.n-1)return{p:animRel(animSample(r.c,fr),r.c),legs:true};
    if(f.stunT>0.25||f.fx.dizzy>0){const s=ANIM_DATA.stunned,m=s.n-1,q=(fr-(c.n-1))*0.8%(2*m);return{p:animRel(animSample('stunned',q<m?q:2*m-q),'stunned'),legs:true};}
    return{p:animRel(animSample(r.c,c.n-1),r.c),legs:true};
  }
  if((S==='idle'||S==='recover')&&f.y<=groundAt(f.pos.x,f.pos.z,f.y)+0.05)return{p:idlePose(f),legs:!f.moving};
  return null;
}
// pick a hit reaction from how hard the hit was (called from takeHit)
function pickReact(h,dmg){const k=h.launch||h.kd||dmg>=14?'big':dmg>=8?'mid':'light';return pick(HIT_CLIPS[k]);}
// pose channels → glove target in torso space: shoulder + arm vector (facing frame → undo the torso's rotation), kept clear of the big head
function animHand(f,h,p){
  const sx=h===0?1:-1,o=h*3,tr=f.torso.rotation;
  // chibi arms are short: stretch the reach like the hand-made punches do (more when the arm is straight)
  const ext=Math.hypot(p[o],p[o+1],p[o+2]),R=0.84*(1+0.55*clamp((ext-0.55)/0.4,0,1));
  let x=p[o]*R,y=p[o+1]*R,z=p[o+2]*R;
  // inverse of Euler XYZ (x=lean, y=twist, z=roll): apply −x about X, then −y about Y, then −z about Z
  let c=Math.cos(-tr.x),s=Math.sin(-tr.x);[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(-tr.y);s=Math.sin(-tr.y);[x,z]=[x*c+z*s,-x*s+z*c];
  c=Math.cos(-tr.z);s=Math.sin(-tr.z);[x,y]=[x*c-y*s,x*s+y*c];
  const g=V(sx*0.52*f.bulk+x,0.76+y,z);
  const dx=g.x,dy=g.y-1.38,dz=g.z,d=Math.hypot(dx,dy,dz),MIN=0.84;
  if(d<MIN&&g.z<0.9){let nx=dx/(d||1),ny=dy/(d||1),nz=dz/(d||1)+0.7;const l=Math.hypot(nx,ny,nz)||1;g.set(nx/l*MIN,1.38+ny/l*MIN,nz/l*MIN);}
  return g;
}
