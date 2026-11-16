(function(root){'use strict';
var XY=root.XY=root.XY||{},runs=new WeakMap();
function owns(G,h){return !!(G&&G.heroes&&G.heroes[2]===h&&h.id==='bajie'&&!(h.def&&h.def.xid));}
function run(G,create){var r=runs.get(G);if(!r&&create){r={hero:null,input:null,core:null,pose:null,reason:'uninitialized',everReady:false,lastRoot:null,events:[]};runs.set(G,r);}return r;}
function note(r,reason){if(r.reason!==reason){r.events.push({reason:reason});if(r.events.length>24)r.events.shift();}r.reason=reason;}
function face(h,prior){var v=Math.cos(h.moveFace!=null?h.moveFace:(h.face||0));return v<-.35?-1:v>.35?1:prior||1;}
function begin(G){var r=run(G,true);r.input=null;var art=XY.bajieGroundArt;if(art&&art.prepare){var first=!r.artStarted;r.artStarted=true;art.prepare(first&&art.state()==='failed').catch(function(){});}else if(art)art.request();}
function record(G,h,dx,dy){if(!owns(G,h))return;run(G,true).input={x:dx,y:dy};}
function reachError(S){var g=XY.bajiePose.geometry(S);return g.ok?null:g;}
function commit(G,h,dt,owner){if(!owns(G,h))return;var r=run(G,true),input=r.input||{x:0,y:0},moving=Math.hypot(input.x,input.y)>1e-7,at={x:h.x,y:h.y};
 if(r.hero!==h){r.hero=h;r.core=null;r.pose=null;r.everReady=false;r.lastRoot=null;note(r,'new_hero');}
 if(owner.blocked||owner.cloud){r.core=null;r.pose=null;r.lastRoot=at;note(r,owner.cloud?'cloud_owner':'exclusive_owner');return;}
 if(!XY.bajiePose||!XY.bajieGroundArt||!XY.bajieGroundArt.ready()){r.core=null;r.pose=null;r.lastRoot=at;r.waitForRest=true;note(r,'awaiting_art');return;}
 // A late image may take ownership at rest. Hidden/loading travel is never replayed.
 if(r.waitForRest&&moving){r.lastRoot=at;note(r,'awaiting_rest');return;}
 r.waitForRest=false;
 var jumped=r.lastRoot&&Math.hypot(at.x-r.lastRoot.x-input.x,at.y-r.lastRoot.y-input.y)>64;
 if(!r.core||jumped){r.core=XY.bajiePose.create(at,face(h,r.pose&&r.pose.face));r.pose=r.core.snapshot();r.everReady=true;note(r,jumped?'reacquired_after_displacement':'ground_owned');}
 else{r.core.update({dt:dt,root:at,voluntary:input,face:face(h,r.pose&&r.pose.face)});r.pose=r.core.snapshot();note(r,'ground_owned');}
 var invalid=r.pose&&reachError(r.pose);if(invalid){r.core=null;r.pose=null;note(r,'OUT_OF_PROFILE');r.events[r.events.length-1].detail=invalid;}
 r.lastRoot=at;
}
function liveOwnerBlocked(G,h){if(h.down||h.dead||h.mounted||h.ridden||h.dash||h.ultPose||h.ultInk||(G.lair&&h.cc&&h.cc.stunT>0)||(G.td&&(G.td.deploy||(G.td.hold&&G.td.hold.deploy))))return true;var scenes=G.us||[];for(var i=0;i<scenes.length;i++)if(scenes[i].h===h&&scenes[i].t<scenes[i].def.dur)return true;var ground=XY.heroGroundWalk&&XY.heroGroundWalk(G,h);return !!(ground&&ground.cloud);}
function get(G,h){var r=owns(G,h)&&run(G,false);return r&&r.hero===h&&r.reason==='ground_owned'&&!liveOwnerBlocked(G,h)?r.pose:null;}
function adopted(G,h){var r=owns(G,h)&&run(G,false);return !!(r&&r.hero===h&&r.everReady);}
function diagnostics(G,h){var r=owns(G,h)&&run(G,false);return r?{reason:r.reason,events:r.events.map(function(e){return{reason:e.reason,detail:e.detail?Object.assign({},e.detail):undefined};}),ready:r.everReady,hasPose:!!r.pose}:null;}
XY.bajieGround=Object.freeze({begin:begin,record:record,commit:commit,get:get,adopted:adopted,diagnostics:diagnostics});
if(typeof module!=='undefined'&&module.exports)module.exports=XY.bajieGround;
})(typeof window!=='undefined'?window:globalThis);
