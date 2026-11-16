(function(root){'use strict';

const T=.55,LIFT=9,FRONT={near:16,far:14},ss=t=>t*t*(3-2*t);
const clone=x=>JSON.parse(JSON.stringify(x)),freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);for(const k of Object.keys(o))freeze(o[k]);}return o;};
function createClock(units){const FRONT=units.frontByRole||{near:16,far:14};const V=units.referenceSpeed,WPR=units.worldPerReference,C=22/V,s={q:0,runTime:0,landings:0,feet:{near:{q:16,y:0,pitch:0,mode:'stance',toeOff:C,nextContact:T,contactAnchor:16},far:{q:-8,y:0,pitch:0,mode:'stance',toeOff:0,nextContact:T/2,contactAnchor:-8}}};
if(units.initialFeet)for(const [name,q] of Object.entries(units.initialFeet)){s.feet[name].q=q;s.feet[name].contactAnchor=q;}
function start(name){const f=s.feet[name],endTime=f.pending?f.pending.nextContact:f.nextContact,endQ=f.pending?f.pending.endQ:endTime*V+FRONT[name];if(endTime<=s.runTime+1e-10)throw Error('Expired next contact');f.swing={startTime:s.runTime,endTime,startQ:f.q,endQ,startY:f.y,startPitch:f.pitch};f.pending=null;f.settle=null;f.lastSettleAnchor=null;f.mode='swing';}
function update({distanceWorld,dt}){if(!Number.isFinite(distanceWorld)||distanceWorld<0||!Number.isFinite(dt)||dt<0)throw Error('Finite forward distance and nonnegative dt required');if(dt===0){if(distanceWorld)throw Error('Zero-time motion');return;}
if(distanceWorld===0){for(const f of Object.values(s.feet)){if(f.mode==='swing'){f.pending={nextContact:f.swing.endTime,endQ:f.swing.endQ};f.settle={elapsed:0,y:f.y,pitch:f.pitch,anchor:f.q};f.lastSettleAnchor=f.q;f.swing=null;f.mode='settle';}if(f.mode==='settle'){const a=f.settle;a.elapsed=Math.min(.12,a.elapsed+dt);const u=a.elapsed/.12;f.q=a.anchor;f.y=a.y*(1-ss(u));f.pitch=a.pitch*(1-ss(u));if(u>=1-1e-10){f.y=0;f.pitch=0;f.mode='stance';f.contactAnchor=f.q;f.settle=null;}}}return;}
for(const f of Object.values(s.feet))if(f.mode==='settle'){f.mode='stance';f.settle=null;}
const target=s.runTime+distanceWorld/units.worldSpeed;let guard=0;while(s.runTime<target-1e-10){if(++guard>30)throw Error('Phase loop');for(const[name,f]of Object.entries(s.feet))if(f.pending||(f.mode==='stance'&&f.toeOff<=s.runTime+1e-10))start(name);let next=target;for(const f of Object.values(s.feet)){if(f.mode==='swing')next=Math.min(next,f.swing.endTime);else if(f.toeOff>s.runTime+1e-10)next=Math.min(next,f.toeOff);}if(next<=s.runTime+1e-12)throw Error('Nonadvancing event');s.q+=(next-s.runTime)*V;s.runTime=next;for(const f of Object.values(s.feet))if(f.mode==='swing'){const a=f.swing,u=Math.max(0,Math.min(1,(s.runTime-a.startTime)/(a.endTime-a.startTime)));f.q=a.startQ+(a.endQ-a.startQ)*ss(u);f.y=(a.startY||0)*(1-ss(u))-Math.max(0,LIFT-Math.abs(a.startY||0))*Math.sin(Math.PI*u);f.pitch=(a.startPitch||0)*(1-ss(u))-Math.max(0,.32-Math.abs(a.startPitch||0))*Math.sin(Math.PI*u);if(u>=1-1e-9){f.q=a.endQ;f.y=0;f.pitch=0;f.mode='stance';f.contactAnchor=f.q;f.toeOff=a.endTime+C;f.nextContact=a.endTime+T;f.swing=null;s.landings++;}}}}
function snapshot(){return freeze({x:s.q,worldX:s.q*WPR,face:1,runTime:s.runTime,landings:s.landings,feet:Object.fromEntries(Object.entries(s.feet).map(([name,f])=>[name,{x:f.q,worldX:f.q*WPR,y:f.y,pitch:f.pitch,mode:f.mode,contactAnchor:f.contactAnchor,settleAnchor:f.lastSettleAnchor??null,pending:f.pending?clone(f.pending):null,swing:f.swing?clone(f.swing):null}]))});}
// Transfer an already displayed stopped foot into the next swing's origin.
// The next contact time/target and accumulated phase stay unchanged.
function rebaseStoppedFoot(name,dx,dy){const f=s.feet[name];if(!f||f.swing||!Number.isFinite(dx)||!Number.isFinite(dy))throw Error('Invalid stopped foot rebase');f.q+=dx;f.y+=dy;f.contactAnchor+=dx;if(f.lastSettleAnchor!=null)f.lastSettleAnchor+=dx;if(f.settle){f.settle.anchor+=dx;f.settle.y+=dy;}}
return Object.freeze({update,snapshot,rebaseStoppedFoot});}
function mirror(S){const r=clone(S);r.x=-r.x;r.worldX=-r.worldX;r.face=-1;for(const f of Object.values(r.feet)){f.x=-f.x;f.worldX=-f.worldX;f.contactAnchor=-f.contactAnchor;if(f.settleAnchor!==null)f.settleAnchor=-f.settleAnchor;}return freeze(r);}
const baseMotion=Object.freeze({create:createClock,mirror,constants:freeze({cycleSeconds:T,liftReference:LIFT,front:FRONT,contactReferenceDistance:22,settleSeconds:.12,torsoBob:0})});



// One proposal. +Y is down. CSS amplitudes refer to canonical standing height 80.
// This is a phase pose, not a physics change to the hero or the ground feet.
const cfg=Object.freeze({cycle:.55,contactDistanceReference:22,flightApex80:.65,compression80:.40,landingLeanDegrees:1,toeOffLeanDegrees:3,transitionSeconds:.12});
const rad=Math.PI/180;
function hermite(y0,v0,y1,v1,D,u){return{y:(2*u**3-3*u*u+1)*y0+(u**3-2*u*u+u)*D*v0+(-2*u**3+3*u*u)*y1+(u**3-u*u)*D*v1,v:(6*u*u-6*u)*y0/D+(3*u*u-4*u+1)*v0+(-6*u*u+6*u)*y1/D+(3*u*u-2*u)*v1};}
function createPoseCurve(U){const scale80=U.sizes.find(x=>x.targetCssHeight===80).scale,C=22/U.referenceSpeed,F=cfg.cycle/2-C,D=C/2,V=4*cfg.flightApex80/F;
 function sample(runTime,rate=1){let p=runTime-Math.floor((runTime+1e-10)/(cfg.cycle/2))*(cfg.cycle/2);if(Math.abs(p)<1e-9)p=0;let z,phase;if(p<D){z=hermite(0,V,cfg.compression80,0,D,p/D);phase='landing_absorption';}else if(p<C){z=hermite(cfg.compression80,0,0,-V,D,(p-D)/D);phase='push_off';}else{const u=(p-C)/F;z={y:-4*cfg.flightApex80*u*(1-u),v:4*cfg.flightApex80*(2*u-1)/F};phase='flight';}
 const contact=p<C,u=contact?p/C:(p-C)/F,span=contact?C:F,w=u*u*(3-2*u),wd=6*u*(1-u)/span,sign=contact?1:-1,angle=(contact?1+2*w:3-2*w)*rad;
 return Object.freeze({y:z.y/scale80,v:z.v*rate/scale80,angle,angularVelocity:sign*2*rad*wd*rate,phase});}
 return Object.freeze({sample,constants:Object.freeze({...cfg,contactSeconds:C,flightSeconds:F,launchVelocity80:-V,landingVelocity80:V,flightGravity80:8*cfg.flightApex80/F**2,scale80})});}
const poseCurve=Object.freeze({create:createPoseCurve,hermite,constants:cfg});


const base=baseMotion,curve=poseCurve;
function createMotion(U){const core=base.create(U),C=curve.create(U),D=C.constants.transitionSeconds,b={y:0,v:0,angle:0,angularVelocity:0,moving:false,mode:'idle',transition:null,wall:0,rootSpeedReference:0},events=[];
 function state(){return{y:b.y,v:b.v,angle:b.angle,angularVelocity:b.angularVelocity};}
 if(U.bodyInitial){Object.assign(b,U.bodyInitial);b.mode='stop_settle';b.transition={kind:'stop',elapsed:0,...state()};}
 function blend(a,q,elapsed){const u=elapsed/D,w=u*u*u*(u*(6*u-15)+10),wd=30*u*u*(1-u)*(1-u)/D,linear=a.y+a.v*elapsed;return{y:(1-w)*linear+w*q.y,v:(1-w)*a.v+wd*(q.y-linear)+w*q.v};}
 function update(arg){const old=core.snapshot(),moving=arg.distanceWorld>0;if(moving!==b.moving){const kind=moving?'start':'stop';b.transition={kind,elapsed:0,...state()};events.push({kind,wall:b.wall,runTime:old.runTime,before:state(),curveStart:state(),rootSpeedBefore:b.rootSpeedReference,rootSpeedAfter:arg.dt?arg.distanceWorld/U.worldPerReference/arg.dt:0});}core.update(arg);b.wall+=arg.dt;b.moving=moving;b.rootSpeedReference=arg.dt?arg.distanceWorld/U.worldPerReference/arg.dt:0;const now=core.snapshot();
 if(moving){const q=C.sample(now.runTime,arg.dt?(now.runTime-old.runTime)/arg.dt:0);if(b.transition&&b.transition.kind==='start'){const a=b.transition;a.elapsed=Math.min(D,a.elapsed+arg.dt);const y=blend(a,q,a.elapsed),a0={y:a.angle,v:a.angularVelocity},a1={y:q.angle,v:q.angularVelocity},t=blend(a0,a1,a.elapsed);b.y=y.y;b.v=y.v;b.angle=t.y;b.angularVelocity=t.v;b.mode='start_blend';if(a.elapsed>=D-1e-10){events.push({kind:'start-complete',wall:b.wall,runTime:now.runTime,before:state(),curveStart:{y:q.y,v:q.v,angle:q.angle,angularVelocity:q.angularVelocity}});b.transition=null;b.y=q.y;b.v=q.v;b.angle=q.angle;b.angularVelocity=q.angularVelocity;b.mode=q.phase;}}else{b.y=q.y;b.v=q.v;b.angle=q.angle;b.angularVelocity=q.angularVelocity;b.mode=q.phase;}}
 else if(b.transition&&b.transition.kind==='stop'){const a=b.transition;a.elapsed=Math.min(D,a.elapsed+arg.dt);const u=a.elapsed/D,y=curve.hermite(a.y,a.v,0,0,D,u),t=curve.hermite(a.angle,a.angularVelocity,0,0,D,u);b.y=y.y;b.v=y.v;b.angle=t.y;b.angularVelocity=t.v;b.mode='stop_settle';if(u>=1-1e-10){events.push({kind:'stop-complete',wall:b.wall,runTime:now.runTime,before:state(),curveStart:{y:0,v:0,angle:0,angularVelocity:0}});b.y=0;b.v=0;b.angle=0;b.angularVelocity=0;b.transition=null;b.mode='idle';}}
 else{b.y=0;b.v=0;b.angle=0;b.angularVelocity=0;b.mode='idle';}}
 function snapshot(){const s=clone(core.snapshot());s.bodyOffset=b.y;s.bodyVelocity=b.v;s.bodyAngle=b.angle;s.bodyAngularVelocity=b.angularVelocity;s.bodyResponseMode=b.mode;s.rootSpeedReference=b.rootSpeedReference;return freeze(s);}
 return Object.freeze({update,snapshot,rebaseStoppedFoot:core.rebaseStoppedFoot,bodyTransitions:()=>freeze(clone(events))});}
const supportMotion=Object.freeze({create:createMotion,mirror:base.mirror,constants:freeze({...base.constants,...curve.constants,feetTranslated:false,upperHipGroup:true,worldHorizontalC1:false})});

// Practical 2D display projection. It never writes hero position or combat state.
const WPR=.9354586466165412, PX=3.907637655417407;
const UNITS=Object.freeze({referenceSpeed:160/WPR,worldPerReference:WPR,worldSpeed:160,sizes:[{targetCssHeight:80,scale:.9624060150375939}]});
const clamp01=x=>Math.max(0,Math.min(1,x)),ease5=x=>x*x*x*(x*(x*6-15)+10),ease5d=x=>30*x*x*(1-x)*(1-x);
function safeClone(x){return JSON.parse(JSON.stringify(x));}
function make(rootXY,face){let M=supportMotion.create(UNITS),roleMap={near:'near',far:'far'};const S={root:{x:rootXY.x,y:rootXY.y},face:face||1,wantedFace:face||1,time:0,moving:false,planSpeed:160,heading:{x:face||1,y:0},params:null,clock:M.snapshot(),feet:{},lastLandings:0,transitionSerial:0,events:[],maxContactSlide:0,body:null};
 function readClock(){const c=safeClone(M.snapshot()),f=c.feet;c.feet={near:f[roleMap.near],far:f[roleMap.far]};return c;}
 function reseedGroundTurn(preserveBody){const order=['near','far'].sort((a,b)=>S.face*(S.feet[b].x-S.feet[a].x));roleMap={[order[0]]:'near',[order[1]]:'far'};const initialFeet={},frontByRole={};for(const name of['near','far']){initialFeet[roleMap[name]]=PX+S.face*(S.feet[name].x-S.root.x)/WPR;frontByRole[roleMap[name]]=name==='near'?16:14;}M=supportMotion.create({...UNITS,initialFeet,frontByRole,...(preserveBody?{bodyInitial:{y:S.body.offset,v:S.body.velocity,angle:S.body.angle,angularVelocity:S.body.angularVelocity}}:{})});S.clock=readClock();S.lastLandings=0;for(const f of Object.values(S.feet)){f.biasXWorld=0;f.biasBlend=null;f.bridge=null;f.turnHold=true;}log('grounded_turn_reseed',{roleMap:{...roleMap},initialFeet,worldAnchorsPreserved:true});}
 function log(kind,detail){S.events.push({time:S.time,kind,...detail});if(S.events.length>96)S.events.shift();}
 function params(v,heading){const g=Math.min(160,v)/160,a=Math.abs(heading.y),u=clamp01((a-.25)/.5),w=u*u*(3-2*u),depth=g*heading.y*((1-w)+.12*w);return{xGain:g*((1-w)*Math.abs(heading.x)+w*.65),depthGain:depth,bias:-Math.max(0,11*Math.abs(depth)-.5),liftGain:Math.max(.35,Math.sqrt(g)),projected:w>1e-6,slopeWeight:w,speedGain:g};}
 function raw(name,C,P,unbiased){const f=C.feet[name],hip=name==='near'?4.9733570159857905:2.841918294849023,along=f.x-C.x-hip;return{x:S.root.x+S.face*(hip-PX+along*P.xGain)*WPR+(unbiased?0:((S.feet[name]&&S.feet[name].biasXWorld)||0)),y:S.root.y+(along*P.depthGain+P.bias+f.y*P.liftGain)*WPR};}
 function landingBias(name,C,P){const f=C.feet[name],hip=name==='near'?4.9733570159857905:2.841918294849023,hy=name==='near'?-34.487388987566604:-33.77690941385435,L=name==='near'?32.5:31.8,ox=name==='near'?-10*13.3/341:0,oy=name==='near'?-131*13.3/341:-106*13/266,along=f.x-C.x-hip,gy=S.root.y+(along*P.depthGain+P.bias)*WPR,gx=S.root.x+S.face*(hip-PX+along*P.xGain)*WPR;let lo=-Infinity,hi=Infinity;for(const face of new Set([S.face,S.wantedFace]))for(const art of new Set([S.feet[name].artFacing,S.wantedFace])){const hx=S.root.x+face*(hip-PX)*WPR,dy=(gy+oy*WPR-(S.root.y+hy*WPR))/WPR,rr=(L-.35)*(L-.35)-dy*dy;if(rr<=0){log('OUT_OF_PROFILE',{id:name,reason:'no_stop_landing_interval'});return 0;}const span=Math.sqrt(rr)*WPR;lo=Math.max(lo,hx-span-art*ox*WPR);hi=Math.min(hi,hx+span-art*ox*WPR);}if(lo>hi){log('OUT_OF_PROFILE',{id:name,reason:'no_stop_landing_intersection'});return 0;}return Math.max(lo,Math.min(hi,gx))-gx;}
 const initial=params(160,S.heading);S.params=initial;for(const name of['near','far']){const p=raw(name,S.clock,initial);S.feet[name]={id:name,x:p.x,y:p.y,vx:0,vy:0,raw:p,lastMode:'stance',anchor:{...p},artFacing:S.face,bridge:null,biasXWorld:0,biasBlend:null,turnHold:false,contactKind:'world_contact',maxSlide:0};}
 function jointHip(name,C,rootAt){const hx=name==='near'?4.9733570159857905:2.841918294849023,hy=name==='near'?-34.487388987566604:-33.77690941385435,a=C.bodyAngle||0,dx=hx-PX,dy=hy+34.13214920071047;return{x:rootAt.x+S.face*(Math.cos(a)*dx-Math.sin(a)*dy)*WPR,y:rootAt.y+(-34.13214920071047+Math.sin(a)*dx+Math.cos(a)*dy+(C.bodyOffset||0))*WPR};}
 function ankleOffset(name,pitch,artFacing){const ox=name==='near'?-10*13.3/341:0,oy=name==='near'?-131*13.3/341:-106*13/266;return{x:artFacing*(Math.cos(pitch)*ox-Math.sin(pitch)*oy)*WPR,y:(Math.sin(pitch)*ox+Math.cos(pitch)*oy)*WPR};}
 // Coordinate the actual hip height with both displayed ankles. Targets come
 // from the existing body curve; a planted foot is never translated to fit it.
 function supportHeight(dt){
  let lo=-Infinity,hi=Infinity;
  for(const name of ['near','far']){const f=S.feet[name],cf=S.clock.feet[name],hip=jointHip(name,{bodyAngle:S.clock.bodyAngle,bodyOffset:0},S.root),off=ankleOffset(name,cf.pitch||0,f.artFacing),dx=(f.x+off.x-hip.x)/WPR,dy=(f.y+off.y-hip.y)/WPR,L=(name==='near'?32.5:31.8)-.35,rr=L*L-dx*dx;
   if(rr<=0){log('OUT_OF_PROFILE',{id:name,reason:'no_support_height_interval'});return;}
   const span=Math.sqrt(rr);lo=Math.max(lo,dy-span);hi=Math.min(hi,dy+span);
  }
  if(lo>hi){log('OUT_OF_PROFILE',{reason:'disjoint_support_height_intervals',lo,hi});return;}
  const desired=S.clock.bodyOffset,required=desired<lo-1e-9?lo-desired:desired>hi+1e-9?hi-desired:0,prior=S.supportCorrection||0;
  if(!S.supportRelease&&Math.abs(required)<Math.abs(prior)-1e-9)S.supportRelease={from:prior,elapsed:0,duration:.12};
  let correction=required;
  if(S.supportRelease){const z=S.supportRelease;z.elapsed=Math.min(z.duration,z.elapsed+dt);correction=z.from*(1-ease5(z.elapsed/z.duration));if(z.elapsed>=z.duration)S.supportRelease=null;}
  const constrained=Math.max(lo-desired,Math.min(hi-desired,correction));
  if(Math.abs(constrained-correction)>1e-9){correction=constrained;S.supportRelease=null;}
  const offset=desired+correction,limited=Math.abs(correction)>1e-9;S.supportCorrection=correction;
  S.posture={target:desired,offset,lo,hi,limited,constraintActive:Math.abs(required)>1e-9,returning:!!S.supportRelease};S.clock.targetBodyOffset=desired;S.clock.bodyOffset=offset;
  if(limited||S.lastSupportLimited)S.clock.bodyVelocity=(offset-(S.body?S.body.offset:0))/dt;
  if(limited!==!!S.lastSupportLimited)log(limited?'support_height_limit':'support_height_release',{target:desired,offset,lo,hi});S.lastSupportLimited=limited;
 }
 function startMovingTurn(nextFace,oldRoot,C0){const from={};for(const name of ['near','far']){const f=S.feet[name];from[name]={x:(f.x-oldRoot.x)/WPR,y:(f.y-oldRoot.y)/WPR,pitch:C0.feet[name].pitch||0,artFacing:f.artFacing,wasStance:f.lastMode==='stance'};f.bridge=null;f.biasBlend=null;f.biasXWorld=0;f.turnHold=false;}S.turn={elapsed:0,duration:.12,oldFace:S.face,nextFace,from};S.turnReady=false;log('projected_turn_start',{fromFace:S.face,toFace:nextFace,runTime:C0.runTime,phasePreserved:true});}
 function standingTurnTarget(name){const hip=jointHip(name,{bodyAngle:0,bodyOffset:0},S.root),off=ankleOffset(name,0,S.face);return{x:hip.x-off.x,y:S.root.y};}
 function applyMovingTurn(dt,P,moving){const t=S.turn;t.elapsed=Math.min(t.duration,t.elapsed+dt);const u=t.elapsed/t.duration,first=u<.5,w=ease5(first?u*2:(u-.5)*2);S.face=first?t.oldFace:t.nextFace;
  for(const name of ['near','far']){const f=S.feet[name],cf=S.clock.feet[name],start=t.from[name],target=moving?raw(name,S.clock,P):standingTurnTarget(name),ex=(target.x-S.root.x)/WPR,ey=(target.y-S.root.y)/WPR,midX=0,midY=-1.5,pitch=first?start.pitch*(1-w):moving?(cf.pitch||0)*w:0,x=S.root.x+(first?start.x*(1-w)+midX*w:midX*(1-w)+ex*w)*WPR,y=S.root.y+(first?start.y*(1-w)+midY*w:midY*(1-w)+ey*w)*WPR;
   f.vx=(x-f.x)/dt;f.vy=(y-f.y)/dt;f.x=x;f.y=y;f.raw=target;f.artFacing=first?start.artFacing:t.nextFace;cf.pitch=pitch;cf.mode=u<1-1e-10?'turn':moving?cf.mode:'stance';f.lastMode=cf.mode;f.contactKind=u<1-1e-10?'projected_turn':cf.mode==='stance'?(P.projected?'projected_contact':'world_contact'):'swing';if(u>=1-1e-10&&cf.mode==='stance')f.anchor={x,y};if(start.wasStance){const slide=Math.hypot(x-f.anchor.x,y-f.anchor.y);f.maxSlide=Math.max(f.maxSlide,slide);S.maxContactSlide=Math.max(S.maxContactSlide,slide);}
  }
  if(u>=1-1e-10){log('projected_turn_complete',{face:S.face,runTime:S.clock.runTime,phasePreserved:moving});S.turn=null;if(!moving){reseedGroundTurn(true);S.supportCorrection=0;S.supportRelease=null;S.lastSupportLimited=false;return true;}}return false;
 }
 function startBridge(f,duration,why,oldRoot,rootVelocity){f.bridge={elapsed:0,duration,from:{x:f.x-oldRoot.x,y:f.y-oldRoot.y,vx:f.vx-rootVelocity.x,vy:f.vy-rootVelocity.y},why};S.transitionSerial++;}
 function update(input){const dt=input.dt;if(!(dt>0))return;if(input.paused)return;const oldRoot=S.root,oldRootVelocity=S.rootVelocity||{x:0,y:0},dx=input.voluntary.x,dy=input.voluntary.y,ds=Math.hypot(dx,dy),moving=ds>1e-7,v=moving?ds/dt:0,oldParams=S.params,oldFace=S.face;let C0=S.clock,reseeded=false;
 S.time+=dt;S.root={x:input.root.x,y:input.root.y};S.rootVelocity={x:(S.root.x-oldRoot.x)/dt,y:(S.root.y-oldRoot.y)/dt};if(input.face===1||input.face===-1)S.wantedFace=input.face;else if(moving&&Math.abs(dx/ds)>.35)S.wantedFace=dx<0?-1:1;
 const heading=moving?{x:dx/ds,y:dy/ds}:S.heading;
 if(moving&&(!S.moving||S.clock.landings!==S.lastLandings))S.planSpeed=Math.max(1,v);
 const changedDirection=moving&&Math.hypot(heading.x-S.heading.x,heading.y-S.heading.y)>.08;
 S.heading=heading;
 if(moving&&!S.turn&&S.wantedFace!==S.face)startMovingTurn(S.wantedFace,oldRoot,C0);
 if(moving&&!S.moving&&!S.turn){for(const name of ['near','far']){const f=S.feet[name],cf=C0.feet[name];if(Math.abs(f.biasXWorld)>1e-8&&cf.mode!=='swing'&&oldParams.xGain>1e-7){
  // Landing bias is part of the real stopped foot, not an extra offset to
  // hold in world X after the body has already advanced. Rebase before
  // advancing the clock; counter its depth projection to preserve the
  // preceding world foot point. This changes no bone/phase/contact deadline.
  const dx=S.face*f.biasXWorld/(WPR*oldParams.xGain),dy=-dx*oldParams.depthGain/oldParams.liftGain;
  M.rebaseStoppedFoot(roleMap[name],dx,dy);f.biasXWorld=0;f.biasBlend=null;f.turnHold=false;
  log('resume_origin_rebase',{id:name,dx,dy,phasePreserved:true});
 }}C0=S.clock=readClock();}
 M.update({distanceWorld:moving?160*ds/Math.min(S.planSpeed,160):0,dt});S.clock=readClock();
 const landed=S.clock.landings!==C0.landings,allGround=Object.values(S.clock.feet).every(f=>f.mode==='stance'&&f.y===0);
 const priorGround=Object.values(C0.feet).every(f=>f.mode==='stance'&&f.y===0);if(!S.turn&&S.wantedFace!==S.face&&(S.turnReady||(allGround&&priorGround)))S.face=S.wantedFace;S.turnReady=landed;if(!moving&&S.face!==oldFace&&allGround&&priorGround){reseedGroundTurn();C0=S.clock;reseeded=true;}
 const P=params(S.planSpeed,S.heading);S.params=P;if(!moving&&S.moving){for(const name of['near','far']){const f=S.feet[name];if(C0.feet[name].mode!=='stance'||C0.feet[name].y<-.001)f.biasBlend={from:f.biasXWorld,to:landingBias(name,C0,P),elapsed:0,duration:.12,kind:'landing'};}}
 for(const f of Object.values(S.feet)){if(f.biasBlend&&(!moving||f.biasBlend.kind==='resume')){const b=f.biasBlend;b.elapsed=Math.min(b.duration,b.elapsed+dt);const u=b.elapsed/b.duration;f.biasXWorld=b.from+(b.to-b.from)*ease5(u);if(u>=1-1e-10)f.biasBlend=null;}}
 const paramChange=Math.abs(P.xGain-oldParams.xGain)>.025||Math.abs(P.depthGain-oldParams.depthGain)>.025;
 const transition=moving!==S.moving||S.face!==oldFace||changedDirection||paramChange;
 if(transition)log('transition',{moving,face:S.face,projected:P.projected,reason:S.face!==oldFace?'turn':moving!==S.moving?'stop_or_resume':'projection_or_speed'});
 if(S.turn)reseeded=applyMovingTurn(dt,P,moving)||reseeded;else for(const name of['near','far']){const f=S.feet[name],cf=S.clock.feet[name];if(cf.mode==='swing'&&f.lastMode!=='swing'&&(f.turnHold||Math.abs(f.biasXWorld)>1e-8||f.lastMode==='settle')){const r0=raw(name,C0,oldParams,true);r0.x+=oldRoot.x-S.root.x;f.biasXWorld=f.x-r0.x;f.biasBlend={from:f.biasXWorld,to:0,elapsed:0,duration:.12,kind:'resume'};f.turnHold=false;}const r=raw(name,S.clock,P),rv={x:(r.x-f.raw.x)/dt,y:(r.y-f.raw.y)/dt},toeOff=cf.mode==='swing'&&f.lastMode==='stance',landing=cf.mode==='stance'&&f.lastMode!=='stance';
 if(cf.mode==='stance'&&(S.face!==oldFace||f.turnHold)){f.turnHold=true;f.bridge=null;}else if(S.face!==oldFace||paramChange)startBridge(f,.12,'relative_pose_transition',oldRoot,oldRootVelocity);
 if(cf.mode!=='stance')f.artFacing=S.face;
 let point={x:r.x,y:r.y,vx:rv.x,vy:rv.y};
 if(f.bridge){const b=f.bridge;b.elapsed=Math.min(b.duration,b.elapsed+dt);const u=b.elapsed/b.duration,w=ease5(u),wd=ease5d(u)/b.duration,lead=b.duration*(u-u*u+u*u*u/3),leadV=(1-u)*(1-u),lx=b.from.x+b.from.vx*lead,ly=b.from.y+b.from.vy*lead,rx=r.x-S.root.x,ry=r.y-S.root.y;point={x:S.root.x+(1-w)*lx+w*rx,y:S.root.y+(1-w)*ly+w*ry,vx:S.rootVelocity.x+(1-w)*b.from.vx*leadV+wd*(rx-lx)+w*(rv.x-S.rootVelocity.x),vy:S.rootVelocity.y+(1-w)*b.from.vy*leadV+wd*(ry-ly)+w*(rv.y-S.rootVelocity.y)};f.contactKind='transition_contact';if(u>=1-1e-10){f.bridge=null;if(cf.mode==='stance')f.anchor={x:point.x,y:point.y};}}
 else if(cf.mode==='stance'&&(!P.projected||f.turnHold)){if(landing)f.anchor={x:r.x,y:r.y};point={x:f.anchor.x,y:f.anchor.y,vx:0,vy:0};f.contactKind='world_contact';}
 else f.contactKind=cf.mode==='stance'?'projected_contact':'swing';
 if(landing){f.anchor={x:point.x,y:point.y};log('plant',{id:name,x:point.x,y:point.y,kind:f.contactKind});}
 f.x=point.x;f.y=point.y;f.vx=point.vx;f.vy=point.vy;f.raw=r;f.lastMode=cf.mode;
 if(cf.mode==='stance'){const slide=Math.hypot(f.x-f.anchor.x,f.y-f.anchor.y);f.maxSlide=Math.max(f.maxSlide,slide);S.maxContactSlide=Math.max(S.maxContactSlide,slide);}
 }
 supportHeight(dt);
 S.body={offset:S.clock.bodyOffset,velocity:S.clock.bodyVelocity,angle:S.clock.bodyAngle,angularVelocity:S.clock.bodyAngularVelocity};S.moving=moving;S.lastLandings=reseeded?0:C0.landings;
 }
 function snapshot(){return freeze(safeClone({root:S.root,face:S.face,wantedFace:S.wantedFace,time:S.time,moving:S.moving,planSpeed:S.planSpeed,projection:S.params,clock:S.clock,feet:S.feet,body:S.body||{offset:0,velocity:0,angle:0,angularVelocity:0},events:S.events,maxContactSlide:S.maxContactSlide,transitionSerial:S.transitionSerial,posture:S.posture||null,turn:S.turn||null}));}
 return Object.freeze({update,snapshot});}
const api={create:make,units:UNITS,worldPerReference:WPR,pelvisX:PX,status:'ISOLATED_CANDIDATE',constants:{cycle:.55,slopeStart:.25,slopeEnd:.75,longitudinalProjection:.65,depthProjection:.12,maxProjectionSpeed:160,transitionSeconds:.12}};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root.XY)root.XY.wujingPose=api;

})(typeof window!=='undefined'?window:globalThis);
