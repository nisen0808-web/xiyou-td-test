(function(root){'use strict';var XY=root.XY=root.XY||{};
function createRenderer(image,meta,canvasFactory){const rig=meta.rig,parts=meta.parts,tintCache={};
 function tint(key){if(tintCache[key])return tintCache[key];const p=parts[key],r=p.atlas,z=canvasFactory?canvasFactory(r[2],r[3]):root.document&&root.document.createElement('canvas');if(!z)return null;z.width=r[2];z.height=r[3];const g=z.getContext('2d');g.drawImage(image,...r,0,0,r[2],r[3]);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,50,40,0.6)';g.fillRect(0,0,r[2],r[3]);return tintCache[key]=z;}
 function draw(c,S,x,y,r,tinted,attackUpper){const solved=XY.wukongPose.geometry(S);if(!solved.ok)return solved;const base=c.getTransform(),det=base.a*base.d-base.b*base.c;if(!Number.isFinite(det)||!det)return {ok:false,reason:'INVALID_TRANSFORM'};const iv={a:base.d/det,b:-base.b/det,c:-base.c/det,d:base.a/det,e:(base.c*base.f-base.d*base.e)/det,f:(base.b*base.e-base.a*base.f)/det},bounds={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};
 function blit(key){const p=parts[key],z=p.sourceRect,b=p.contentRect||z,m=c.getTransform();for(const u of [[b[0],b[1]],[b[0]+b[2],b[1]],[b[0],b[1]+b[3]],[b[0]+b[2],b[1]+b[3]]]){const tx=m.a*u[0]+m.c*u[1]+m.e,ty=m.b*u[0]+m.d*u[1]+m.f,wx=iv.a*tx+iv.c*ty+iv.e,wy=iv.b*tx+iv.d*ty+iv.f;bounds.x0=Math.min(bounds.x0,wx);bounds.x1=Math.max(bounds.x1,wx);bounds.y0=Math.min(bounds.y0,wy);bounds.y1=Math.max(bounds.y1,wy);}const ti=tinted&&tint(key);if(ti)c.drawImage(ti,0,0,p.atlas[2],p.atlas[3],...z);else c.drawImage(image,...p.atlas,...z);}
 function bone(name,kind,a,b,L){const p=rig[name][kind],scale=L/Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]),angle=Math.atan2(b[1]-a[1],b[0]-a[0])-Math.atan2(p.b[1]-p.a[1],p.b[0]-p.a[0]);c.save();c.translate(...a);c.rotate(angle);c.scale(scale,scale);c.translate(-p.a[0],-p.a[1]);blit(name+kind[0].toUpperCase()+kind.slice(1));c.restore();}
 c.save();c.translate(x,y);c.scale(r/17*S.face,r/17);
 for(const j of solved.joints){const p=rig[j.name];bone(j.name,'thigh',j.hip,j.knee,p.L1);c.save();c.translate(...j.sole);c.rotate(j.pitch);c.scale(p.foot.scale,p.foot.scale);c.translate(-p.foot.sole[0],-p.foot.sole[1]);blit(j.name+'Foot');c.restore();bone(j.name,'shin',j.knee,j.ankle,p.L2);}
 c.save();c.translate(0,S.body.offset||0);const sr=parts.lining.sourceRect,t=rig.lining.target;c.save();c.translate(t[0],t[1]);c.scale(t[2]/sr[2],t[3]/sr[3]);c.translate(-sr[0],-sr[1]);blit('lining');c.restore();const upper=attackUpper&&meta.attackUpper&&meta.attackUpper.registrations[attackUpper];if(upper){c.translate(...upper.target);c.scale(upper.scale,upper.scale);c.translate(-upper.pivot[0],-upper.pivot[1]);blit(attackUpper);}else{c.scale(rig.body.scale,rig.body.scale);c.translate(-rig.body.axis,-rig.body.ground);blit('upper');}c.restore();c.restore();return {ok:true,bounds:{x:bounds.x0,y:bounds.y0,w:bounds.x1-bounds.x0,h:bounds.y1-bounds.y0},joints:solved.joints};
 }
 return Object.freeze({draw});
}
var entry=null,serial=0;
function sameIdentity(e){var m=XY.WUKONG_GROUND_ART;return !!(e&&m&&e.meta===m&&e.src===m.image&&e.hash===m.sha256);}
function retrySource(src,n){var h=src.indexOf('#'),base=h<0?src:src.slice(0,h),tail=h<0?'':src.slice(h);return base+(base.indexOf('?')<0?'?':'&')+'wkRetry='+n+tail;}
function release(e){if(!e)return;if(e.drawable&&e.drawableKind==='image-bitmap')e.drawable.close();e.drawable=null;e.renderer=null;e.image=null;}
function retire(){if(entry){if(entry.state==='loading')entry.cancel();else release(entry);}entry=null;}
function prepare(retry){
 var meta=XY.WUKONG_GROUND_ART;
 if(!meta){retire();var missing=Promise.reject(new Error('Wukong ground art metadata unavailable'));missing.catch(function(){});return missing;}
 if(entry&&sameIdentity(entry)&&(entry.state==='ready'||entry.state==='loading'||!retry))return entry.promise;
 retire();
 var e={id:++serial,meta:meta,src:meta.image,hash:meta.sha256,state:'loading',error:'',bitmapError:'',drawableKind:null,drawable:null,image:null,renderer:null},resolveLoad,rejectLoad,settled=false;
 e.requestSrc=retry?retrySource(e.src,e.id):e.src;
 e.promise=new Promise(function(resolve,reject){resolveLoad=resolve;rejectLoad=reject;});e.promise.catch(function(){});entry=e;
 var abort=typeof root.AbortController==='function'?new root.AbortController():null,objectURL=null,timer;
 function current(){return entry===e&&sameIdentity(e);}
 function revoke(){if(objectURL){root.URL.revokeObjectURL(objectURL);objectURL=null;}}
 function finish(ok,why){
  if(settled)return;
  if(ok&&!current()){ok=false;why='stale identity';}
  settled=true;root.clearTimeout(timer);revoke();
  if(e.image)e.image.onload=e.image.onerror=null;
  if(!ok){if(abort)abort.abort();release(e);}
  e.state=ok?'ready':'failed';e.error=why||'';
  if(ok){e.renderer=createRenderer(e.drawable,e.meta);resolveLoad(e);}else rejectLoad(new Error('Wukong ground art: '+e.error));
 }
 e.cancel=function(){finish(false,'superseded attempt');};
 timer=root.setTimeout(function(){finish(false,'timeout');},15000);
 function stillCurrent(){if(settled)return false;if(!current()){finish(false,'stale identity');return false;}return true;}
 function imageFallback(blob,why){
  if(!stillCurrent())return;
  e.bitmapError=why||'ImageBitmap unavailable';
  var url=e.requestSrc;
  if(blob){try{objectURL=root.URL.createObjectURL(blob);url=objectURL;}catch(error){finish(false,'fallback URL failed: '+String(error.message||error));return;}}
  var im=e.image=new root.Image(),loaded=false;
  im.onload=function(){
   if(loaded||!stillCurrent())return;loaded=true;
   var decoded;try{decoded=typeof im.decode==='function'?im.decode():Promise.resolve();}catch(error){finish(false,'decode failed: '+String(error.message||error));return;}
   Promise.resolve(decoded).then(function(){
    if(!stillCurrent())return;
    if(im.naturalWidth!==meta.width||im.naturalHeight!==meta.height){finish(false,'unexpected dimensions');return;}
    e.drawable=im;e.drawableKind='image-fallback';finish(true);
   },function(error){finish(false,'decode failed: '+String(error.message||error));});
  };
  im.onerror=function(){finish(false,'load error');};
  try{im.src=url;}catch(error){finish(false,String(error.message||error));}
 }
 function decodeBlob(blob){
  if(!stillCurrent())return;
  if(typeof root.createImageBitmap!=='function'){imageFallback(blob,'ImageBitmap unavailable');return;}
  var pending;
  // Blob decoding does not synchronously materialize an HTMLImageElement on the main thread.
  try{pending=root.createImageBitmap(blob);}catch(error){imageFallback(blob,String(error.message||error));return;}
  Promise.resolve(pending).then(function(bitmap){
   if(!stillCurrent()){if(bitmap&&typeof bitmap.close==='function')bitmap.close();return;}
   if(!bitmap||bitmap.width!==meta.width||bitmap.height!==meta.height){if(bitmap&&typeof bitmap.close==='function')bitmap.close();finish(false,'unexpected bitmap dimensions');return;}
   e.drawable=bitmap;e.drawableKind='image-bitmap';finish(true);
  },function(error){imageFallback(blob,String(error.message||error));});
 }
 if(typeof root.fetch!=='function'){imageFallback(null,'fetch unavailable');return e.promise;}
 var request;
 try{request=root.fetch(e.requestSrc,abort?{signal:abort.signal}:{});}catch(error){finish(false,'fetch failed: '+String(error.message||error));return e.promise;}
 Promise.resolve(request).then(function(response){
  if(!stillCurrent())return null;
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.blob();
 }).then(function(blob){if(blob)decodeBlob(blob);},function(error){finish(false,'fetch failed: '+String(error.message||error));});
 return e.promise;
}
var api={createRenderer:createRenderer,prepare:prepare,request:function(){return prepare(false);},ready:function(){return !!(entry&&sameIdentity(entry)&&entry.state==='ready');},state:function(){return entry?entry.state:'unrequested';},diagnostics:function(){return entry?{attempt:entry.id,src:entry.src,requestSrc:entry.requestSrc,state:entry.state,error:entry.error,identityCurrent:sameIdentity(entry),drawableKind:entry.drawableKind,bitmapError:entry.bitmapError}:{attempt:0,state:'unrequested'};},draw:function(c,S,x,y,r,tinted,attackUpper){return api.ready()?entry.renderer.draw(c,S,x,y,r,tinted,attackUpper):{ok:false,reason:api.state()};}};
XY.wukongGroundArt=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
