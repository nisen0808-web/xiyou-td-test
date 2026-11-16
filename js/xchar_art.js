/* ============================================================
 * xchar_art.js —— v0.8.2：自建角色的形象 = 「水墨全身模板 × 账号头像」
 *  · 8 套 AI 生成的狂野水墨全身模板（js/xchar_tpl_data.js：书生/武将/女侠/行僧/道士/商贾/游侠/琴师）
 *    按账号名哈希固定挑一套；长袍的青色部分按头像主色重新上色（皮肤、金线、墨线不动）
 *  · 头 = 账号头像圆章 + 毛笔墨圈，是整张图的视觉重点
 *  · 战场精灵：单姿势 + 程序动作（待机呼吸 / 行走起伏摇摆 / 起手后仰 / 出招前冲），8 帧图集，站高 192
 *  · 定妆立绘（创建页 / 角色卡）：淡墨晕染 + 全身像 + 竖排书法名 + 朱红印章；召唤 cut-in / 关卡页用不带字的同一张人像（XC.portraitBare）
 *  全部在本机浏览器里合成，不联网、不用任何密钥
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, XC = XY.xchar, PI = Math.PI;
  var CW = 240, CH = 240, FX = 120, FY = 230;          // 图集单格大小、脚底锚点
  var STAND = 196;                                      // 战场精灵身高（像素，图集坐标）
  var TPL_ORDER = ['scholar', 'warrior', 'swordswoman', 'monk', 'mage', 'merchant', 'archer', 'musician'];
  function TPLS() { return XY.XC_TPL || {}; }
  function KEYS() { var t = TPLS(); return TPL_ORDER.filter(function (k) { return t[k]; }); }
  var INK = function (a) { return 'rgba(34,26,20,' + a + ')'; };
  var KAI = '"STKaiti","KaiTi","Kaiti SC","Kaiti TC","BiauKai","AR PL UKai CN","楷体",serif';
  var SONG = '"STSong","SimSun","Songti SC","Noto Serif CJK SC","Noto Serif SC",serif';

  /* ---------- 模板图 ---------- */
  var timgs = {}, twait = {}, tstates = {};
  function tplImg(k, cb) {
    var t=k!=null?TPLS()[k]:null;
    if(!t){
      if(cb&&XY.lazy)XY.lazy.after('xchar',cb);
      else if(cb&&window.XY_SPLIT_ENTRY)(XC.pendingTemplates||(XC.pendingTemplates=[])).push(cb);
      return null;
    }
    if(timgs[k]&&timgs[k]._templateSrc!==t.src){if(timgs[k]._templateCancel)timgs[k]._templateCancel();delete timgs[k];delete tstates[k];delete tcache[k];}
    var e=timgs[k],s=tstates[k];if(e&&s==='ready')return e;
    if(!e){
      e=timgs[k]=new Image();twait[k]=[];tstates[k]='pending';e._templateSrc=t.src;
      var timer;
      function finish(error){
        if(timgs[k]!==e||tstates[k]!=='pending')return;
        clearTimeout(timer);tstates[k]=error?'error':'ready';e.onload=e.onerror=null;
        var a=twait[k];twait[k]=[];a.forEach(function(f){try{f();}catch(x){}});
      }
      e.onload=function(){
        if(!e.naturalWidth||e.naturalWidth!==t.w||e.naturalHeight!==t.h){finish(true);return;}
        var p;try{p=e.decode?e.decode():Promise.resolve();}catch(x){p=Promise.reject(x);}
        Promise.resolve(p).then(function(){finish(false);},function(){finish(true);});
      };
      e._templateFail=function(){finish(true);};
      e._templateCancel=function(){clearTimeout(timer);e.onload=e.onerror=null;};
      timer=setTimeout(function(){finish(true);},15000);
      e.onerror=function(){finish(true);};e.src=t.src;
    }
    if(cb&&tstates[k]==='pending'&&twait[k].indexOf(cb)<0)twait[k].push(cb);
    return null;
  }
  Object.defineProperty(XC, 'TPL_KEYS', { get: KEYS });
  XC.tplOf = function (rec) { var ks = KEYS(); return ks.length ? ks[XC.hash('tpl:' + String(rec.handle || rec.id).toLowerCase()) % ks.length] : null; };
  XC.tplName = function (rec) { var t = TPLS()[XC.tplOf(rec)]; return t ? t.name : ''; };

  function palOf(rec, im) {
    var e = XC.pal[rec.id], P;
    if (e && e.src === rec.avatar) P = e.p;
    else if (im && im.complete && im.naturalWidth) { try { P = XC.analyze(rec.id, rec.avatar, im); } catch (x) {} }
    if (!P) P = XC.palette(rec);
    var tint = rec.mod && rec.mod.tint;
    if (!/^#[0-9a-f]{6}$/i.test(tint || '')) return P;
    // An explicitly imported robe colour wins over the avatar-derived default.
    var rgb = [parseInt(tint.slice(1,3),16),parseInt(tint.slice(3,5),16),parseInt(tint.slice(5,7),16)], hsl = rgb2hsl(rgb[0],rgb[1],rgb[2]);
    function shade(light) { var a = []; hsl2rgb(hsl[0],hsl[1],light,a,0); return '#' + a.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
    return { color:tint.toLowerCase(), dark:shade(.28), frame:shade(.86), accent:shade(.48), hue:hsl[0], grey:hsl[1]<.04 };
  }

  /* ---------- 上色：模板的青绿袍子 → 头像主色 ---------- */
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0; if (d > 1e-6) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  function hsl2rgb(h, s, l, o, i) { var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; h /= 360; function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; } o[i] = f(h + 1 / 3) * 255; o[i + 1] = f(h) * 255; o[i + 2] = f(h - 1 / 3) * 255; }
  var tcache = {};
  function tinted(k, P) {
    var t = TPLS()[k]; if (!t) return null;
    var cache = tcache[k]; if (!cache || cache.template !== t) cache = tcache[k] = { template: t, colors: {} };
    // Cache the exact hue used below: nearby avatars must not inherit the first one's tint.
    var key = P.grey ? 'g' : String(P.hue), e = cache.colors[key]; if (e) return e;
    var img = tplImg(k); if (!img) return null;
    var t = TPLS()[k], cv = document.createElement('canvas'); cv.width = t.w; cv.height = t.h; var c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    try {
      var id = c.getImageData(0, 0, t.w, t.h), d = id.data, i, H = P.hue;
      for (i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        var hsl = rgb2hsl(d[i], d[i + 1], d[i + 2]), h = hsl[0], s = hsl[1], l = hsl[2];
        if (h < 46 || h > 150 || s < 0.04 || l < 0.1 || l > 0.95) continue;   // 只动模板的灰绿袍子（色相约 50°-140°），皮肤/米白/金线（< 46°）和墨线不动
        var w = Math.min(1, (s - 0.04) / 0.05) * Math.min(1, (h - 46) / 10) * Math.min(1, (150 - h) / 15);
        var ns = P.grey ? s * 0.3 : Math.min(0.58, s * 2.1 + 0.06), nl = P.grey ? l : l * 0.98;
        var o = [0, 0, 0]; hsl2rgb(P.grey ? 215 : H, ns, nl, o, 0);
        d[i] = d[i] + (o[0] - d[i]) * w; d[i + 1] = d[i + 1] + (o[1] - d[i + 1]) * w; d[i + 2] = d[i + 2] + (o[2] - d[i + 2]) * w;
      }
      c.putImageData(id, 0, 0);
    } catch (x) {}
    return (cache.colors[key] = cv);
  }

  /* ---------- 头像圆章 + 毛笔墨圈 ---------- */
  function medallion(c, x, y, R, im, P, seed) {
    var rr = XC.rng('ring:' + seed), i;
    c.save();
    c.beginPath(); c.arc(x, y, R, 0, 2 * PI); c.fillStyle = '#f6efe0'; c.fill();
    if (im && im.complete && im.naturalWidth) { c.save(); c.beginPath(); c.arc(x, y, R * 0.94, 0, 2 * PI); c.clip(); c.drawImage(im, x - R * 0.94, y - R * 0.94, R * 1.88, R * 1.88); c.restore(); }
    c.lineCap = 'round';
    c.lineWidth = Math.max(1, R * 0.05); c.strokeStyle = XC.rgba(P.accent, 0.9); c.beginPath(); c.arc(x, y, R * 0.97, 0, 2 * PI); c.stroke();
    for (i = 0; i < 3; i++) {                                     // 三笔干湿不一的墨圈
      var a0 = rr() * 2 * PI, span = 2 * PI * (0.78 + rr() * 0.3), n = 40, j;
      for (j = 0; j < n; j++) {
        var u = j / n, a = a0 + span * u, a2 = a0 + span * (j + 1) / n, taper = Math.sin(PI * Math.min(1, u * 1.15)) ;
        c.lineWidth = Math.max(0.6, R * (0.07 + 0.09 * taper) * (i ? 0.6 : 1));
        c.strokeStyle = INK((i ? 0.45 : 0.9) * (0.55 + 0.45 * taper));
        var rad = R * (1.02 + i * 0.045 + (rr() - 0.5) * 0.02);
        c.beginPath(); c.arc(x, y, rad, a, a2 + 0.01); c.stroke();
      }
    }
    c.restore();
  }

  /* ---------- 全身像（原点在脚底，高 hgt）---------- */
  function body(c, rec, im, hgt, headK, P) {
    var k = XC.tplOf(rec), t = TPLS()[k]; if (!t) return false;
    var cv = tinted(k, P); if (!cv) return false;
    var s = hgt / t.foot[1];
    c.save(); c.scale(s, s); c.translate(-t.foot[0], -t.foot[1]);
    c.drawImage(cv, 0, 0);
    medallion(c, t.head[0], t.head[1] - t.head[2] * (headK - 1) * 0.35, t.head[2] * headK, im, P, rec.handle.toLowerCase());
    c.restore(); return true;
  }
  function shadow(c, w) { c.save(); c.scale(1, 0.28); var g = c.createRadialGradient(0, 0, 2, 0, 0, w); g.addColorStop(0, INK(0.3)); g.addColorStop(1, INK(0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, 2 * PI); c.fill(); c.restore(); }

  /* 帧动作：0/1 待机、2-5 行走、6 起手、7 出招 */
  function motion(f) {
    var M = { dy: 0, rot: 0, dx: 0, sx: 1, sy: 1 };
    if (f <= 1) { M.sy = 1 + (f ? 0.012 : -0.004); M.sx = 1 - (f ? 0.006 : -0.002); }
    else if (f <= 5) { var p = (f - 2) / 4 * 2 * PI; M.dy = -Math.abs(Math.sin(p)) * 6; M.rot = Math.sin(p) * 0.045; M.dx = Math.sin(p) * 2; }
    else if (f === 6) { M.rot = -0.08; M.dx = -6; M.sy = 1.02; }
    else { M.rot = 0.11; M.dx = 12; M.sy = 0.985; M.sx = 1.02; }
    return M;
  }

  // 兼容旧接口：在 c 的原点（脚底）画一帧战场精灵
  XC.drawFigure = function (c, rec, def, im, frame, t) {
    var P = palOf(rec, im), M = motion(frame || 0);
    shadow(c, 46);
    c.save(); c.translate(M.dx, M.dy); c.rotate(M.rot); c.scale(M.sx, M.sy);
    var ok = body(c, rec, im, STAND, 2.3, P);
    if (!ok) { tplImg(XC.tplOf(rec), function () { (XC.onArt || []).forEach(function (f) { try { f(rec.id); } catch (e) {} }); }); medallion(c, 0, -STAND + 34, 30, im, P, rec.handle.toLowerCase()); }
    c.restore();
    if (frame === 7) {                                           // 出招：一笔墨弧
      c.save(); c.lineCap = 'round'; for (var i = 0; i < 10; i++) { c.lineWidth = 7 * Math.sin(PI * i / 10) + 1; c.strokeStyle = XC.rgba(P.accent, 0.55); c.beginPath(); c.arc(30, -100, 70, -1.2 + i * 0.12, -1.2 + (i + 1) * 0.12); c.stroke(); } c.restore();
    }
    return ok;
  };

  /* ---------- 定妆立绘（W×H，常用 360×480）---------- */
  XC.drawCard = function (c, W, H, rec, def, im, t, opt) {
    opt = opt || {}; var P = palOf(rec, im), rr = XC.rng('pt:' + rec.handle.toLowerCase()), i;
    if (opt.paper) { c.fillStyle = '#f7f1e3'; c.fillRect(0, 0, W, H); }
    var g = c.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.52, W * 0.7); g.addColorStop(0, XC.rgba(P.frame, 0.85)); g.addColorStop(0.6, XC.rgba(P.frame, 0.35)); g.addColorStop(1, XC.rgba(P.frame, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (i = 0; i < 7; i++) { c.save(); c.translate(W * (0.15 + rr() * 0.7), H * (0.3 + rr() * 0.6)); c.scale(1, 0.5 + rr() * 0.3); c.beginPath(); c.arc(0, 0, W * (0.12 + rr() * 0.16), 0, 2 * PI); c.fillStyle = INK(0.035 + rr() * 0.04); c.fill(); c.restore(); }
    // 远山一笔
    c.save(); c.beginPath(); c.moveTo(0, H * 0.78); for (i = 0; i <= 8; i++) c.lineTo(W * i / 8, H * (0.72 + (rr() - 0.5) * 0.09)); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = INK(0.06); c.fill(); c.restore();
    var br = Math.sin((t || 0) * 1.3) * 0.006;
    c.save(); c.translate(W * 0.44, H * 0.97); shadow(c, W * 0.24); c.scale(1 - br * 0.5, 1 + br);
    var ok = body(c, rec, im, H * 0.9, 1.6, P); c.restore();
    if (!ok) { tplImg(XC.tplOf(rec), function () { (XC.onArt || []).forEach(function (f) { try { f(rec.id); } catch (e) {} }); }); medallion(c, W * 0.44, H * 0.3, W * 0.16, im, P, rec.handle.toLowerCase()); }
    if (opt.bare) return ok;                                   // 召唤 cut-in 自己会写名字，这里只要人像
    // 竖排书法名
    var nm = String(rec.name || rec.handle).slice(0, 15), ch = Array.from(nm), cjk = /[\u3400-\u9fff]/.test(nm), avail = H * 0.62;
    var fs = Math.min(W * 0.115, avail / Math.max(2, ch.length)), x = W - W * 0.1, y = H * 0.07 + fs;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    if (cjk || ch.length <= 3) {
      c.font = '900 ' + fs + 'px ' + KAI;
      ch.forEach(function (s, j) { var yy = y + j * fs * 1.02; c.fillStyle = 'rgba(247,241,227,0.85)'; c.fillText(s, x + 1.5, yy + 1.5); c.fillStyle = INK(0.92); c.fillText(s, x, yy); });
      y += ch.length * fs * 1.02;
    } else {                                                   // 拉丁字母：整行竖排（顺时针转 90°），字号按可用高度缩
      fs = W * 0.1; c.font = 'italic 900 ' + fs + 'px ' + KAI; var tw = c.measureText(nm).width; if (tw > avail) { fs *= avail / tw; c.font = 'italic 900 ' + fs + 'px ' + KAI; tw = avail; }
      c.translate(x + fs * 0.35, H * 0.07); c.rotate(PI / 2); c.textAlign = 'left'; c.fillStyle = 'rgba(247,241,227,0.85)'; c.fillText(nm, 1.5, 1.5); c.fillStyle = INK(0.92); c.fillText(nm, 0, 0);
      y = H * 0.07 + tw + fs * 0.9; fs = Math.max(fs, W * 0.08);
    }
    c.restore();
    // 朱红印章（账号首字）
    var sz = fs * 1.05, sx = x - sz / 2, sy = Math.min(y + fs * 0.1, H - sz - 8), hd = rec.handle.replace(/[^a-z0-9]/ig, '').slice(0, 2).toUpperCase() || 'X';
    c.save(); c.translate(sx + sz / 2, sy + sz / 2); c.rotate(-0.05);
    c.fillStyle = '#b8301f'; c.beginPath(); if (c.roundRect) c.roundRect(-sz / 2, -sz / 2, sz, sz, sz * 0.12); else c.rect(-sz / 2, -sz / 2, sz, sz); c.fill();
    c.strokeStyle = 'rgba(247,241,227,0.9)'; c.lineWidth = Math.max(1, sz * 0.05); c.strokeRect(-sz * 0.38, -sz * 0.38, sz * 0.76, sz * 0.76);
    c.fillStyle = '#f7f1e3'; c.font = '900 ' + sz * (hd.length > 1 ? 0.42 : 0.55) + 'px ' + SONG; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(hd, 0, sz * 0.03);
    c.restore();
    c.save(); c.font = '600 ' + Math.max(10, W * 0.036) + 'px ' + XY.C.FONT; c.textAlign = 'left'; c.fillStyle = INK(0.55); c.fillText('@' + rec.handle, W * 0.05, H * 0.06); c.restore();
    return ok;
  };

  /* ---------- 图集 ---------- */
  // Each imported record owns its preparation. No fallback body can mark it ready.
  var artJobs=Object.create(null),ART_WAIT=15000;
  function notifyArt(id){(XC.onArt||[]).forEach(function(f){try{f(id);}catch(e){}});}
  function currentJob(j){return artJobs[j.rec.id]===j&&XC.get(j.rec.id)===j.rec&&j.rec.avatar===j.avatar;}
  function templateCurrent(j){var k=XC.tplOf(j.rec),t=TPLS()[k];return !j.tpl||!!(t&&k===j.tpl&&t===j.template&&t.src===j.tplSrc);}
  XC.forgetArt=function(rec){var j=artJobs[rec.id];if(j&&j.rec===rec){j.retire();delete artJobs[rec.id];}};
  XC.artStatus=function(id){
    var r=XC.get(id),j=artJobs[id];
    if(!r)return {state:'missing',text:'角色已移除'};
    if(!j||!currentJob(j)||!templateCurrent(j))return {state:'pending',text:'形象准备中…'};
    if(j.state==='ready'&&!XC.artReady(id))return {state:'pending',text:'形象准备中…'};
    return {state:j.state,text:j.state==='ready'?'形象已就绪':j.state==='error'?'形象准备失败：'+j.error:'形象准备中…'};
  };
  XC.makeArt=function(rec,retry){
    var prior=artJobs[rec.id];
    if(prior&&currentJob(prior)&&templateCurrent(prior)&&!(retry&&prior.state==='error')&&(prior.state!=='ready'||XC.artReady(rec.id)))return prior.promise;
    if(prior)prior.retire();
    var im=new Image(),j={rec:rec,avatar:rec.avatar,state:'pending',tpl:null,tplSrc:null,entry:null};
    artJobs[rec.id]=j;delete XC.art[rec.id];
    var resolve,reject,timer,done=false,building=false;
    j.promise=new Promise(function(a,b){resolve=a;reject=b;});j.promise.catch(function(){});
    function finish(error){
      if(done)return;done=true;clearTimeout(timer);im.onload=im.onerror=null;
      j.state=error?'error':'ready';j.error=error?String(error.message||error):'';
      if(error)reject(error);else resolve(j.entry);
      if(currentJob(j))notifyArt(rec.id);
    }
    j.retire=function(){var e=new Error('形象已更新或移除');e.artRetired=true;finish(e);};
    function live(){if(!currentJob(j)||!templateCurrent(j)){j.retire();return false;}return !done;}
    function build(){
      if(!live()||building)return;
      var cur=XC.get(rec.id),k=XC.tplOf(rec),t=TPLS()[k];
      if(t){j.tpl=k;j.tplSrc=t.src;j.template=t;}
      if(t&&timgs[k]&&timgs[k]._templateSrc===t.src&&tstates[k]==='error')return finish(new Error('全身模板载入或解码失败'));
      if(!tplImg(k,build))return;
      building=true;
      try{
      XC.analyze(rec.id, rec.avatar, im);
      var P = palOf(rec, im), def = XY.SP_BY[rec.id];
      if (def) { def.color = P.color; def.dark = P.dark; def.frame = P.frame; def.accent = P.accent; def.tpl = k; }
      // Atlas generation is offline: stable CPU resampling avoids first-create/reload colour drift.
      var cv = document.createElement('canvas'); cv.width = CW * 4; cv.height = CH * 2; var c = cv.getContext('2d', { willReadFrequently: true }), fr = [], i;
      for (i = 0; i < 8; i++) { c.save(); c.beginPath(); c.rect((i % 4) * CW, Math.floor(i / 4) * CH, CW, CH); c.clip(); c.translate((i % 4) * CW + FX, Math.floor(i / 4) * CH + FY); XC.drawFigure(c, cur, def, im, i, i * 0.9); c.restore(); fr.push([(i % 4) * CW, Math.floor(i / 4) * CH, CW, CH, FX, FY]); }
      var entry = { w: cv.width, h: cv.height, fr: fr, src: cv.toDataURL('image/png'), xchar: true };
      if (XY.chibi && XY.chibi.forget) XY.chibi.forget(rec.id);
      XY.CHIBI_INK = XY.CHIBI_INK || {}; XY.CHIBI = XY.CHIBI || {}; XY.CHIBI_INK[rec.id] = XY.CHIBI[rec.id] = entry;      // has() 看 CHIBI，pickData 优先 CHIBI_INK（站高 192）
      j.entry=entry;
      if(!XY.chibi||!XY.chibi.prepareCustom)throw new Error('自建图集准备接口不可用');
      XY.chibi.prepareCustom(rec.id,entry).then(function(){
        if(!live())return;
        XC.art[rec.id]={atlas:cv,img:im,ready:true,t:Date.now(),tpl:k};finish();
      },function(e){if(live())finish(e);});
      }catch(e){if(live())finish(e);}
    }
    if(retry){var k=XC.tplOf(rec),t=TPLS()[k];if(t&&timgs[k]&&timgs[k]._templateSrc===t.src&&tstates[k]==='error'){if(timgs[k]._templateCancel)timgs[k]._templateCancel();delete timgs[k];delete tstates[k];}}
    timer=setTimeout(function(){if(currentJob(j)){finish(new Error('准备超过15秒，请重试或更换图片'));var t=j.tpl&&timgs[j.tpl];if(t&&t._templateSrc===j.tplSrc&&tstates[j.tpl]==='pending'&&t._templateFail)t._templateFail();}else j.retire();},ART_WAIT);
    im.onerror=function(){if(live())finish(new Error('保存的头像载入失败，请重试或更换图片'));};
    im.onload=function(){
      if(!live())return;
      if(!im.naturalWidth||!im.naturalHeight)return finish(new Error('保存的头像尺寸无效'));
      var p;try{p=im.decode?im.decode():Promise.resolve();}catch(e){p=Promise.reject(e);}
      Promise.resolve(p).then(function(){if(live())build();},function(){if(live())finish(new Error('保存的头像解码失败，请重试或更换图片'));});
    };
    im.src=rec.avatar;notifyArt(rec.id);return j.promise;
  };
  XC.artReady=function(id){var j=artJobs[id];return !!(j&&currentJob(j)&&templateCurrent(j)&&j.state==='ready'&&XC.art[id]&&XY.chibi.customReady(id,j.entry));};
  XC.artAllReady=function(ids){return ids ? ids.every(function(id){return XC.artReady(id);}) : XC.list.every(function(r){return XC.artReady(r.id);});};
  function artRecords(ids){
    if(!ids)return XC.list.slice();
    return ids.map(function(id){var r=XC.get(id);if(!r)throw new Error('角色已移除，请重新选择');return r;});
  }
  XC.carryArtReady=function(){var id=XY.save.carryId&&XY.save.carryId();return !XC.isX(id)||XC.artReady(id);};
  XC.prepareSavedArt=function(retry,ids){
    var retried=[],start=Date.now();
    function pass(){
      if(Date.now()-start>=ART_WAIT)return Promise.reject(new Error('角色在准备期间发生变化，请重试'));
      var list;try{list=artRecords(ids);}catch(e){return Promise.reject(e);}
      var work=list.map(function(r){var j=artJobs[r.id],again=retry&&j&&j.state==='error'&&retried.indexOf(r)<0;if(again)retried.push(r);return XC.makeArt(r,again).then(function(){return null;},function(e){return e;});});
      return Promise.all(work).then(function(errors){
        var now=artRecords(ids);if(list.length!==now.length||list.some(function(r,i){return r!==now[i];}))return pass();
        var e=errors.find(function(v){return v;});if(e)throw e;
        if(!XC.artAllReady(ids))throw new Error('形象已更新，请重新准备');
        return true;
      });
    }
    return new Promise(function(resolve,reject){
      var ended=false,timer=setTimeout(function(){finish(new Error('准备超过15秒，请重试或返回'));},ART_WAIT);
      function finish(e){if(ended)return;ended=true;clearTimeout(timer);if(e)reject(e);else resolve(true);}
      pass().then(function(){finish();},finish);
    });
  };
  XC.retryArt=function(id){var r=XC.get(id);return r?XC.makeArt(r,true):Promise.reject(new Error('角色已移除'));};

  var artPanel=null,artEnterToken=0;
  XC.cancelArt=function(){++artEnterToken;if(artPanel){artPanel.remove();artPanel=null;}};
  function artDialog(failed,retry,ids){
    if(!artPanel){artPanel=document.createElement('div');artPanel.id='xcharArtStatus';artPanel.setAttribute('role','dialog');artPanel.setAttribute('aria-modal','true');artPanel.style.cssText='position:fixed;inset:0;z-index:10010;background:rgba(246,238,220,.97);color:#342c23;display:flex;align-items:center;justify-content:safe center;flex-direction:column;gap:16px;padding:24px;box-sizing:border-box;overflow:auto;font:18px/1.5 serif;text-align:center';document.body.appendChild(artPanel);}
    artPanel.replaceChildren();artPanel.setAttribute('aria-label',failed?'自建形象准备失败':'正在准备自建形象');
    var title=document.createElement('div');title.textContent=failed?'自建形象准备失败':'正在准备自建形象';artPanel.appendChild(title);
    var detail=document.createElement('div');detail.style.cssText='font-size:16px;max-width:520px;max-height:40vh;overflow:auto;flex-shrink:0';detail.textContent=(ids?ids.map(function(id){return XC.get(id);}).filter(Boolean):XC.list).map(function(r){return r.name+'：'+XC.artStatus(r.id).text;}).join('；');artPanel.appendChild(detail);
    if(failed){var hint=document.createElement('div');hint.textContent='角色和原图片仍保存在本机。可以重试，或返回“自建角色”更换图片。';hint.style.cssText='font-size:16px;max-width:520px';artPanel.appendChild(hint);}
    function button(label,fn){var b=document.createElement('button');b.textContent=label;b.style.cssText='min-width:144px;min-height:44px;font:18px serif;color:#342c23;background:#f7efdc;border:1px solid #a99a7e';b.onclick=fn;artPanel.appendChild(b);return b;}
    var first=failed?button('重试自建形象',retry):null;var back=button('返回',XC.cancelArt);(first||back).focus();
  }
  XC.enterArt=function(next,retry,ids){
    var token=++artEnterToken;if(XC.artAllReady(ids)){if(artPanel){artPanel.remove();artPanel=null;}next();return;}
    artDialog(false,null,ids);
    XC.prepareSavedArt(!!retry,ids).then(function(){if(token!==artEnterToken)return;if(artPanel){artPanel.remove();artPanel=null;}next();},function(){if(token!==artEnterToken)return;artDialog(true,function(){XC.enterArt(next,true,ids);},ids);});
  };
  XC.enterCarryArt=function(next,retry){
    var id=XY.save.carryId&&XY.save.carryId();if(!XC.isX(id)){next();return;}
    XC.enterArt(function(){if(XY.save.carryId&&XY.save.carryId()===id)next();},retry,[id]);
  };
  if(window.addEventListener)window.addEventListener('keydown',function(e){
    if(!artPanel)return;
    if(e.code==='Escape'){e.preventDefault();XC.cancelArt();}
    else if(e.code==='Tab'){var buttons=Array.prototype.slice.call(artPanel.querySelectorAll('button')),i=buttons.indexOf(document.activeElement),n=buttons.length;if(n&&(i<0||(e.shiftKey?i===0:i===n-1))){e.preventDefault();buttons[e.shiftKey?n-1:0].focus();}}
    else if(!((e.code==='Enter'||e.code==='Space')&&e.target&&e.target.tagName==='BUTTON'&&artPanel.contains(e.target)))e.preventDefault();
    e.stopImmediatePropagation();
  },true);

  /* ---------- 定妆图对象：召唤 cut-in / 关卡页大立绘 / 角色卡 ---------- */
  var portraits = {};
  function mk(id, bare) {
    var a = XC.art[id], r = XC.get(id); if (!a || !XC.artReady(id) || !r) return null;
    var key = id + (bare ? '|b' : ''), e = portraits[key]; if (e && e.art === a && e.n === r.name) return e.cv;
    var cv = document.createElement('canvas'); cv.width = 360; cv.height = 480;
    XC.drawCard(cv.getContext('2d'), 360, 480, r, XY.SP_BY[id], a.img, 0, { bare: bare });
    portraits[key] = { art: a, n: r.name, cv: cv }; return cv;
  }
  XC.portrait = function (id) { return mk(id, false); };            // 带竖排书法名 + 印章（角色卡 / 列表缩略图）
  XC.portraitBare = function (id) { return mk(id, true); };         // 只有人像（XY.bgArt：召唤 cut-in / 关卡页大立绘，它们自己写名字）
  XC.cardURL = function (id) { var p = XC.portrait(id); if (!p) return ''; var e = portraits[id]; if (!e.url) { var cv = document.createElement('canvas'); cv.width = 120; cv.height = 160; var c = cv.getContext('2d'); c.fillStyle = '#f7f1e3'; c.fillRect(0, 0, 120, 160); c.drawImage(p, 0, 0, 120, 160); e.url = cv.toDataURL('image/jpeg', 0.85); } return e.url; };
})();
