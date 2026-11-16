(function(root){'use strict';var XY=root.XY=root.XY||{},runs=new WeakMap();
function owns(G,h){return !!(G&&G.heroes&&h&&h.id==='kuanggong'&&G.heroes.indexOf(h)>=0&&!(h.def&&(h.def.xid||h.def.skinId))&&!h.skinId);}
function run(G,h,make){var all=runs.get(G);if(!all&&make){all=new Map();runs.set(G,all);}var r=all&&all.get(h);if(!r&&make){r={input:null,core:null,pose:null,reason:'uninitialized',everReady:false,lastRoot:null,waitForRest:false,events:[]};all.set(h,r);}return r;}
function note(r,reason){if(r.reason!==reason){r.events.push({reason:reason});if(r.events.length>24)r.events.shift();}r.reason=reason;}
function facing(h,prior){var v=Math.cos(h.moveFace!=null?h.moveFace:(h.face||0));return v<-.35?-1:v>.35?1:prior||1;}
function begin(G){var all=runs.get(G);if(all)all.forEach(function(r,h){r.input=null;if(!owns(G,h)){r.core=null;r.pose=null;note(r,'appearance_owner');}});if(G.heroes&&G.heroes.some(function(h){return owns(G,h);})&&XY.kuanggongGroundArt)XY.kuanggongGroundArt.prepare(false).catch(function(){});}
function record(G,h,dx,dy){if(owns(G,h))run(G,h,true).input={x:dx,y:dy};}
function commit(G,h,dt,owner){if(!owns(G,h))return;var r=run(G,h,true),input=r.input||{x:0,y:0},moving=Math.hypot(input.x,input.y)>1e-7,at={x:h.x,y:h.y};
 if(owner.blocked||owner.cloud){r.core=null;r.pose=null;r.lastRoot=at;note(r,owner.cloud?'cloud_owner':'exclusive_owner');return;}
 if(!XY.kuanggongPose||!XY.kuanggongGroundArt||!XY.kuanggongGroundArt.ready()){r.core=null;r.pose=null;r.lastRoot=at;r.waitForRest=true;note(r,'awaiting_art');return;}
 if(r.waitForRest&&moving){r.lastRoot=at;note(r,'awaiting_rest');return;}r.waitForRest=false;
 var jumped=r.lastRoot&&Math.hypot(at.x-r.lastRoot.x-input.x,at.y-r.lastRoot.y-input.y)>64;
 if(!r.core||jumped){r.core=XY.kuanggongPose.create(at,facing(h,r.pose&&r.pose.face));r.pose=r.core.snapshot();r.everReady=true;note(r,jumped?'reacquired_after_displacement':'ground_owned');}
 else if(dt>0){r.core.update({dt:dt,root:at,voluntary:input,face:facing(h,r.pose&&r.pose.face)});r.pose=r.core.snapshot();note(r,'ground_owned');}
 var g=r.pose&&XY.kuanggongPose.geometry(r.pose);if(g&&!g.ok){r.core=null;r.pose=null;note(r,'OUT_OF_PROFILE');r.events[r.events.length-1].detail=g;}r.lastRoot=at;
}
function liveBlocked(G,h){if(h.down||h.dead||h.mounted||h.ridden||h.dash||h.ultPose||h.ultInk||(G.lair&&h.cc&&h.cc.stunT>0)||(G.td&&(G.td.deploy||(G.td.hold&&G.td.hold.deploy))))return true;var scenes=G.us||[];for(var i=0;i<scenes.length;i++)if(scenes[i].h===h&&scenes[i].t<scenes[i].def.dur)return true;var q=XY.heroGroundWalk&&XY.heroGroundWalk(G,h);return !!(q&&(q.cloud||q.blocked));}
function get(G,h){var r=owns(G,h)&&run(G,h,false);return r&&(r.reason==='ground_owned'||r.reason==='reacquired_after_displacement')&&!liveBlocked(G,h)?r.pose:null;}
function diagnostics(G,h){var r=run(G,h,false);return r?{reason:r.reason,ready:r.everReady,hasPose:!!r.pose,events:JSON.parse(JSON.stringify(r.events))}:null;}
XY.kuanggongGround=Object.freeze({owns:owns,begin:begin,record:record,commit:commit,get:get,adopted:function(G,h){var r=owns(G,h)&&run(G,h,false);return !!(r&&r.everReady);},diagnostics:diagnostics});if(typeof module!=='undefined'&&module.exports)module.exports=XY.kuanggongGround;
})(typeof window!=='undefined'?window:globalThis);
