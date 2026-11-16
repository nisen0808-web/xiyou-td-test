(function(root){'use strict';var XY=root.XY=root.XY||{};
const rig=XY.WUKONG_GROUND_ART.rig,P=rig.motion,ss=u=>u*u*(3-2*u),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function raw(name,d,face,x){const p=rig[name],phase=((d/P.cycleDistance+(name==='far'?.5:0))%1+1)%1,at=phase*P.cycleDistance,C=2*p.halfContact,ankleX=(p.foot.ankle[0]-p.foot.sole[0])*p.foot.scale,front=p.hip[0]-ankleX+p.halfContact;let local,y,pitch,mode;if(at<C){local=front-at;y=0;pitch=0;mode='stance';}else{const u=(at-C)/(P.cycleDistance-C),span=P.cycleDistance-C,tau=.12,start=u<tau?span*u*(1-u/tau)**2:0,end=1-u<tau?span*(1-u)*(1-(1-u)/tau)**2:0;local=front-C+C*ss(u)-start+end;y=-P.swingLiftWorld*Math.sin(Math.PI*u)**2;pitch=-.20*Math.sin(Math.PI*u)**2;mode='swing';}return{x:x+face*local,y,pitch,mode};}
function center(name){const p=rig[name];return p.hip[0]-(p.foot.ankle[0]-p.foot.sole[0])*p.foot.scale;}
function make(startFace){const S={x:160,face:startFace||1,distance:0,moving:false,body:{offset:0,angle:0},feet:{},transition:null,turn:null,recovery:null,bodyTransition:null,events:[],time:0};for(const name of['near','far'])S.feet[name]={x:S.x+S.face*center(name),y:0,pitch:0,mode:'stance'};
function standingReach(name,f){const p=rig[name],dx=(p.foot.ankle[0]-p.foot.sole[0])*p.foot.scale,dy=(p.foot.ankle[1]-p.foot.sole[1])*p.foot.scale,a=f.pitch||0;return Math.hypot((f.x-S.x)*S.face+Math.cos(a)*dx-Math.sin(a)*dy-p.hip[0],f.y+Math.sin(a)*dx+Math.cos(a)*dy-p.hip[1]);}
function bodyAndRest(moving,was,dt){
 if(moving){if(!was){S.recovery=null;S.bodyTransition={from:S.body.offset,to:P.bodyOffset,elapsed:0,duration:.12};}}
 else {if(was)S.bodyTransition=null;
  if(!S.turn&&!S.transition){
   if(!S.recovery){const name=['near','far'].find(n=>standingReach(n,S.feet[n])>rig[n].L1+rig[n].L2-.35);if(name){const f=S.feet[name];S.recovery={name,from:{...f},target:S.x+S.face*center(name),elapsed:0,duration:.16};S.bodyTransition=null;S.events.push({kind:'stop_recovery_step',name,time:S.time});}}
   if(S.recovery){const z=S.recovery;z.elapsed=Math.min(z.duration,z.elapsed+dt);const u=z.elapsed/z.duration,w=ss(u);S.feet[z.name]={x:z.from.x+(z.target-z.from.x)*w,y:z.from.y*(1-w)-2*Math.sin(Math.PI*u)**2,pitch:z.from.pitch*(1-w),mode:u>=1?'stance':'recovery_step'};if(u>=1)S.recovery=null;}
   else if(!S.bodyTransition&&S.body.offset>0){S.bodyTransition={from:S.body.offset,to:0,elapsed:0,duration:.16};}
  }
 }
 const z=S.bodyTransition;if(z){z.elapsed=Math.min(z.duration,z.elapsed+dt);S.body.offset=z.from+(z.to-z.from)*ss(z.elapsed/z.duration);if(z.elapsed>=z.duration)S.bodyTransition=null;}
}
function update(v,dt,nextFace){const was=S.moving,oldFace=S.face,oldX=S.x,dir=nextFace||(v?Math.sign(v):S.face),moving=!!v;S.time+=dt;S.x+=v*dt;S.distance+=Math.abs(v)*dt;
if(dir!==oldFace&&!S.turn){S.turn={elapsed:0,duration:P.turnSeconds,oldFace,nextFace:dir,rootAtStart:oldX,from:structuredClone(S.feet)};S.events.push({kind:'projected_turn',time:S.time});}
if(moving!==was&&!S.turn){S.transition={kind:moving?'start':'stop',elapsed:0,from:structuredClone(S.feet),rootAtStart:oldX};S.events.push({kind:moving?'start':'stop',time:S.time});}
if(S.turn){const t=S.turn;t.elapsed=Math.min(t.duration,t.elapsed+dt);const u=t.elapsed/t.duration,first=u<.5,w=ss(first?u*2:(u-.5)*2);S.face=first?t.oldFace:t.nextFace;for(const name of['near','far']){const f=t.from[name],target=raw(name,S.distance,S.face,S.x),localFrom=(f.x-t.rootAtStart)*t.oldFace,localTarget=(target.x-S.x)*S.face,middle=0;S.feet[name]={x:S.x+S.face*(first?localFrom*(1-w)+middle*w:middle*(1-w)+localTarget*w),y:(first?f.y*(1-w):target.y*w)-1.5*Math.sin(Math.PI*u)**2,pitch:0,mode:'projected_turn'};}if(u>=1){S.turn=null;S.transition=moving?null:{kind:'stop',elapsed:0,from:structuredClone(S.feet),rootAtStart:S.x};}}
else if(S.transition){const t=S.transition;t.elapsed=Math.min(P.settleSeconds,t.elapsed+dt);const w=ss(t.elapsed/P.settleSeconds);for(const name of['near','far']){const p=rig[name],f=t.from[name],target=raw(name,S.distance,S.face,S.x);if(t.kind==='stop'){const local=(f.x-S.x)*S.face,goal=clamp(local,center(name)-p.halfContact*.75,center(name)+p.halfContact*.75);S.feet[name]={x:f.mode==='stance'?f.x:f.x+(S.x+S.face*goal-f.x)*w,y:f.y*(1-w),pitch:f.pitch*(1-w),mode:f.mode==='stance'?'stance':'settle'};}else S.feet[name]={x:S.x+(f.x-t.rootAtStart)*(1-w)+(target.x-S.x)*w,y:f.y*(1-w)+target.y*w,pitch:f.pitch*(1-w)+target.pitch*w,mode:'start_blend'};}if(t.elapsed>=P.settleSeconds){S.transition=null;for(const f of Object.values(S.feet))if(!moving)f.mode='stance';}}
else if(moving)for(const name of['near','far'])S.feet[name]=raw(name,S.distance,S.face,S.x);
bodyAndRest(moving,was,dt);S.moving=moving;if(S.events.length>24)S.events.splice(0,S.events.length-24);return snapshot();}
function snapshot(){return structuredClone(S);}return{update,snapshot};}
function pose(distance,face=1){const S={x:0,face,distance,moving:true,body:{offset:0,angle:0},feet:{}};for(const name of['near','far'])S.feet[name]=raw(name,distance,face,0);return S;}

function create(rootAt,initialFace){
 const model=make(initialFace),state={root:{...rootAt},face:initialFace||1,feet:{},moving:false,body:{offset:0,angle:0},clock:null,projection:'idle',pathDistance:0,displayDistance:0,unsteppedDistance:0};
 function adopt(s,at,input,speed,displaySpeed){state.root={...at};state.face=s.face;state.body={...s.body};state.moving=s.moving;state.clock=s;state.projection=!s.moving?'idle':s.turn?'projected_turn':Math.abs(input.y)>1e-7?'projected_contact':'horizontal_contact';for(const n of ['near','far']){const f=s.feet[n];state.feet[n]={x:at.x+f.x-s.x,y:at.y+f.y,pitch:f.pitch,mode:f.mode,artFacing:s.face};}return snapshot();}
 function update(input){const dt=input.dt;if(!(dt>0&&dt<=.1))throw Error('Wukong pose dt outside finite simulation step');const d=Math.hypot(input.voluntary.x,input.voluntary.y),speed=d/dt,face=input.face||state.face;state.pathDistance+=d;state.displayDistance+=d;const s=model.update(speed*face,dt,face);return adopt(s,input.root,input.voluntary,speed,speed);}
 function snapshot(){return structuredClone(state);}adopt(model.snapshot(),rootAt,{x:0,y:0},0,0);return Object.freeze({update,snapshot});
}
function geometry(S){const out=[];for(const n of ['far','near']){const p=rig[n],hip=[p.hip[0],p.hip[1]+(S.body.offset||0)],f=S.feet[n],sole=[(f.x-S.root.x)*S.face,f.y-S.root.y],pitch=f.pitch||0,dx=(p.foot.ankle[0]-p.foot.sole[0])*p.foot.scale,dy=(p.foot.ankle[1]-p.foot.sole[1])*p.foot.scale,ankle=[sole[0]+Math.cos(pitch)*dx-Math.sin(pitch)*dy,sole[1]+Math.sin(pitch)*dx+Math.cos(pitch)*dy],ax=ankle[0]-hip[0],ay=ankle[1]-hip[1],reach=Math.hypot(ax,ay),min=Math.abs(p.L1-p.L2),max=p.L1+p.L2;if(!Number.isFinite(reach)||reach<=min||reach>=max)return {ok:false,reason:'OUT_OF_PROFILE',foot:n,reach,min,max};const z=(p.L1*p.L1-p.L2*p.L2+reach*reach)/(2*reach),h=Math.sqrt(p.L1*p.L1-z*z),knee=[hip[0]+ax/reach*z+ay/reach*h,hip[1]+ay/reach*z-ax/reach*h];out.push({name:n,hip,knee,ankle,sole,pitch,reach,min,max,mode:f.mode});}return{ok:true,joints:out};}
XY.wukongPose=Object.freeze({create,geometry});if(typeof module!=='undefined'&&module.exports)module.exports=XY.wukongPose;
})(typeof window!=='undefined'?window:globalThis);
