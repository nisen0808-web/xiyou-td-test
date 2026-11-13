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
  var timgs = {}, twait = {};
  function tplImg(k, cb) {
    var t = k != null ? TPLS()[k] : null;
    if (!t) {
      if (cb && XY.lazy) XY.lazy.after('xchar', cb);
      else if (cb && window.XY_SPLIT_ENTRY) (XC.pendingTemplates || (XC.pendingTemplates = [])).push(cb);
      return null;
    }
    if (timgs[k] && timgs[k]._templateSrc !== t.src) { delete timgs[k]; }
    var e = timgs[k]; if (e && e.complete && e.naturalWidth) return e;
    if (!e) { e = timgs[k] = new Image(); twait[k] = []; e.onload = function () { var a = twait[k]; twait[k] = []; a.forEach(function (f) { try { f(); } catch (x) {} }); }; e._templateSrc = t.src; e.src = t.src; }
    if (cb) twait[k].push(cb);
    return null;
  }
  Object.defineProperty(XC, 'TPL_KEYS', { get: KEYS });
  XC.tplOf = function (rec) { var ks = KEYS(); return ks.length ? ks[XC.hash('tpl:' + String(rec.handle || rec.id).toLowerCase()) % ks.length] : null; };
  XC.tplName = function (rec) { var t = TPLS()[XC.tplOf(rec)]; return t ? t.name : ''; };

  function palOf(rec, im) {
    var e = XC.pal[rec.id]; if (e && e.src === rec.avatar) return e.p;
    if (im && im.complete && im.naturalWidth) { try { return XC.analyze(rec.id, rec.avatar, im); } catch (x) {} }
    return XC.palette(rec);
  }

  /* ---------- 上色：模板的青绿袍子 → 头像主色 ---------- */
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0; if (d > 1e-6) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  function hsl2rgb(h, s, l, o, i) { var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; h /= 360; function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; } o[i] = f(h + 1 / 3) * 255; o[i + 1] = f(h) * 255; o[i + 2] = f(h - 1 / 3) * 255; }
  var tcache = {};
  function tinted(k, P) {
    var t = TPLS()[k]; if (!t) return null;
    var cache = tcache[k]; if (!cache || cache.template !== t) cache = tcache[k] = { template: t, colors: {} };
    var key = P.grey ? 'g' : Math.round(P.hue), e = cache.colors[key]; if (e) return e;
    var img = tplImg(k); if (!img) return null;
    var t = TPLS()[k], cv = document.createElement('canvas'); cv.width = t.w; cv.height = t.h; var c = cv.getContext('2d'); c.drawImage(img, 0, 0);
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
  XC.makeArt = function (rec) {
    var im = new Image(); delete XC.art[rec.id];
    function build() {
      var cur = XC.get(rec.id); if (!cur || cur.avatar !== rec.avatar) return;
      var k = XC.tplOf(rec); if (!tplImg(k, build)) return;
      var P = XC.analyze(rec.id, rec.avatar, im), def = XY.SP_BY[rec.id];
      if (def) { def.color = P.color; def.dark = P.dark; def.frame = P.frame; def.accent = P.accent; def.tpl = k; }
      var cv = document.createElement('canvas'); cv.width = CW * 4; cv.height = CH * 2; var c = cv.getContext('2d'), fr = [], i;
      for (i = 0; i < 8; i++) { c.save(); c.beginPath(); c.rect((i % 4) * CW, Math.floor(i / 4) * CH, CW, CH); c.clip(); c.translate((i % 4) * CW + FX, Math.floor(i / 4) * CH + FY); XC.drawFigure(c, cur, def, im, i, i * 0.9); c.restore(); fr.push([(i % 4) * CW, Math.floor(i / 4) * CH, CW, CH, FX, FY]); }
      var entry = { w: cv.width, h: cv.height, fr: fr, src: cv.toDataURL('image/png'), xchar: true };
      if (XY.chibi && XY.chibi.forget) XY.chibi.forget(rec.id);
      XY.CHIBI_INK = XY.CHIBI_INK || {}; XY.CHIBI = XY.CHIBI || {}; XY.CHIBI_INK[rec.id] = XY.CHIBI[rec.id] = entry;      // has() 看 CHIBI，pickData 优先 CHIBI_INK（站高 192）
      XC.art[rec.id] = { atlas: cv, img: im, ready: true, t: Date.now(), tpl: k };
      if (XY.chibi && XY.chibi.preload) XY.chibi.preload();
      (XC.onArt || []).forEach(function (f) { try { f(rec.id); } catch (e) {} });
    }
    im.onload = build; im.src = rec.avatar;
  };
  XC.artReady = function (id) { return !!(XC.art[id] && XC.art[id].ready); };

  /* ---------- 定妆图对象：召唤 cut-in / 关卡页大立绘 / 角色卡 ---------- */
  var portraits = {};
  function mk(id, bare) {
    var a = XC.art[id], r = XC.get(id); if (!a || !a.ready || !r) return null;
    var key = id + (bare ? '|b' : ''), e = portraits[key]; if (e && e.t === a.t && e.n === r.name) return e.cv;
    var cv = document.createElement('canvas'); cv.width = 360; cv.height = 480;
    XC.drawCard(cv.getContext('2d'), 360, 480, r, XY.SP_BY[id], a.img, 0, { bare: bare });
    portraits[key] = { t: a.t, n: r.name, cv: cv }; return cv;
  }
  XC.portrait = function (id) { return mk(id, false); };            // 带竖排书法名 + 印章（角色卡 / 列表缩略图）
  XC.portraitBare = function (id) { return mk(id, true); };         // 只有人像（XY.bgArt：召唤 cut-in / 关卡页大立绘，它们自己写名字）
  XC.cardURL = function (id) { var p = XC.portrait(id); if (!p) return ''; var e = portraits[id]; if (!e.url) { var cv = document.createElement('canvas'); cv.width = 120; cv.height = 160; var c = cv.getContext('2d'); c.fillStyle = '#f7f1e3'; c.fillRect(0, 0, 120, 160); c.drawImage(p, 0, 0, 120, 160); e.url = cv.toDataURL('image/jpeg', 0.85); } return e.url; };
})();
