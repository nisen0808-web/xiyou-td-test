(function(root){'use strict';
var XY=root.XY=root.XY||{},W=.9354586466165412,P=[3.907637655417407,-34.13214920071047],rig={near:{hip:[4.9733570159857905,-34.487388987566604],L1:13,L2:19.5},far:{hip:[2.841918294849023,-33.77690941385435],L1:12.8,L2:19}};
function rot(x,y,a){var c=Math.cos(a),s=Math.sin(a);return[x*c-y*s,x*s+y*c];}
function createRenderer(image,meta,canvasFactory){var tintCache={};
 function tint(key){if(tintCache[key])return tintCache[key];var p=meta.parts[key],r=p.atlas,z=canvasFactory?canvasFactory(r[2],r[3]):root.document&&root.document.createElement('canvas');if(!z)return null;z.width=r[2];z.height=r[3];var g=z.getContext('2d');g.drawImage(image,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,50,40,0.6)';g.fillRect(0,0,r[2],r[3]);return tintCache[key]=z;}
 function draw(c,S,x,y,r,tinted){var jobs=[],a=S.body.angle||0,off=S.body.offset||0,face=S.face,parts=meta.parts;
  for(var n of ['far','near']){var q=rig[n],v=rot(q.hip[0]-P[0],q.hip[1]-P[1],a),hip=[face*v[0],P[1]+v[1]+off],f=S.feet[n],fp=parts[n+'Foot'],pitch=S.clock.feet[n].pitch||0,fo=rot((fp.ankle[0]-fp.sole[0])*fp.scale,(fp.ankle[1]-fp.sole[1])*fp.scale,pitch),sole=[(f.x-S.root.x)/W,(f.y-S.root.y)/W],ankle=[sole[0]+f.artFacing*fo[0],sole[1]+fo[1]],dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.hypot(dx,dy);if(!Number.isFinite(d)||d>=q.L1+q.L2||d<=Math.abs(q.L1-q.L2))return{ok:false,reason:'OUT_OF_PROFILE',id:n,reach:d};var z=(q.L1*q.L1-q.L2*q.L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,q.L1*q.L1-z*z)),knee=[hip[0]+dx/d*z+face*dy/d*h,hip[1]+dy/d*z-face*dx/d*h];jobs.push({name:n,hip:hip,knee:knee,ankle:ankle,sole:sole,artFacing:f.artFacing,pitch:pitch,reach:d});}
  var base=c.getTransform(),det=base.a*base.d-base.b*base.c,iv={a:base.d/det,b:-base.b/det,c:-base.c/det,d:base.a/det,e:(base.c*base.f-base.d*base.e)/det,f:(base.b*base.e-base.a*base.f)/det},bounds={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};
  function blit(key){var p=parts[key],z=p.sourceRect,m=c.getTransform();for(var u of [[z[0],z[1]],[z[0]+z[2],z[1]],[z[0],z[1]+z[3]],[z[0]+z[2],z[1]+z[3]]]){var tx=m.a*u[0]+m.c*u[1]+m.e,ty=m.b*u[0]+m.d*u[1]+m.f,wx=iv.a*tx+iv.c*ty+iv.e,wy=iv.b*tx+iv.d*ty+iv.f;bounds.x0=Math.min(bounds.x0,wx);bounds.x1=Math.max(bounds.x1,wx);bounds.y0=Math.min(bounds.y0,wy);bounds.y1=Math.max(bounds.y1,wy);}var ti=tinted&&tint(key);if(ti)c.drawImage(ti,0,0,p.atlas[2],p.atlas[3],z[0],z[1],z[2],z[3]);else c.drawImage(image,p.atlas[0],p.atlas[1],p.atlas[2],p.atlas[3],z[0],z[1],z[2],z[3]);}
  function bone(key,j0,j1,L){var p=parts[key],sx=p.b[0]-p.a[0],sy=p.b[1]-p.a[1],s=L/Math.hypot(sx,sy),a=Math.atan2(j1[1]-j0[1],j1[0]-j0[0])-Math.atan2(sy,face*sx);c.save();c.translate(j0[0],j0[1]);c.rotate(a);c.scale(face*s,s);c.translate(-p.a[0],-p.a[1]);blit(key);c.restore();}
  c.save();c.translate(x,y);c.scale(W*r/18,W*r/18);
  for(var j of jobs){var fp=parts[j.name+'Foot'];c.save();c.translate(j.sole[0],j.sole[1]);c.scale(j.artFacing,1);c.rotate(j.pitch);c.scale(fp.scale,fp.scale);c.translate(-fp.sole[0],-fp.sole[1]);blit(j.name+'Foot');c.restore();bone(j.name+'Shin',j.knee,j.ankle,rig[j.name].L2);bone(j.name+'Thigh',j.hip,j.knee,rig[j.name].L1);}
  c.save();c.scale(face,1);c.translate(-P[0],0);c.translate(P[0],P[1]+off);c.rotate(a);c.translate(-P[0],-P[1]);c.translate(0,meta.body.lift);
  var hb=meta.hipBox,hs=meta.hipWidthReference/hb[2];c.save();c.translate(-7,-32);c.scale(hs,hs);c.translate(-hb[0],-hb[1]);blit('hip');c.restore();c.scale(meta.body.scale,meta.body.scale);c.translate(-meta.body.axis,-meta.body.ground);blit('upper');c.restore();c.restore();
  return{ok:true,bounds:{x:bounds.x0,y:bounds.y0,w:bounds.x1-bounds.x0,h:bounds.y1-bounds.y0},joints:jobs};
 }
 return Object.freeze({draw:draw});
}
var entry=null,serial=0;
function sameIdentity(e){var m=XY.WUJING_GROUND_ART;return !!(e&&m&&e.meta===m&&e.src===m.image&&e.hash===m.sha256);}
function retrySource(src,n){var h=src.indexOf('#'),base=h<0?src:src.slice(0,h),tail=h<0?'':src.slice(h);return base+(base.indexOf('?')<0?'?':'&')+'wgRetry='+n+tail;}
function release(e){if(!e)return;if(e.drawable&&e.drawableKind==='image-bitmap')e.drawable.close();e.drawable=null;e.renderer=null;e.image=null;}
function retire(){if(entry){if(entry.state==='loading')entry.cancel();else release(entry);}entry=null;}
function prepare(retry){
 var meta=XY.WUJING_GROUND_ART;
 if(!meta){retire();var missing=Promise.reject(new Error('Wujing ground art metadata unavailable'));missing.catch(function(){});return missing;}
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
  if(ok){e.renderer=createRenderer(e.drawable,e.meta);resolveLoad(e);}else rejectLoad(new Error('Wujing ground art: '+e.error));
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
var api={createRenderer:createRenderer,prepare:prepare,request:function(){return prepare(false);},ready:function(){return !!(entry&&sameIdentity(entry)&&entry.state==='ready');},state:function(){return entry?entry.state:'unrequested';},diagnostics:function(){return entry?{attempt:entry.id,src:entry.src,requestSrc:entry.requestSrc,state:entry.state,error:entry.error,identityCurrent:sameIdentity(entry),drawableKind:entry.drawableKind,bitmapError:entry.bitmapError}:{attempt:0,state:'unrequested'};},draw:function(c,S,x,y,r,tinted){return api.ready()?entry.renderer.draw(c,S,x,y,r,tinted):{ok:false,reason:api.state()};}};
XY.wujingGroundArt=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
