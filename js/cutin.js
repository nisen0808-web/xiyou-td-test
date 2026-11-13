/* ============================================================
 * cutin.js —— v0.7：召唤特殊人物时的「定妆图施法」过场（约 2.7 秒）
 *   用的就是选关页那张官方定稿立绘（XY.bgArt，不新画、不生成任何文字 / Logo），在运行时做“纸偶”动作：
 *   待命(0~0.35s 色带划入) → 抬手蓄势(0.35~0.85s 上半身拉长 / 后仰) → 聚气(0.85~1.45s 光球 + 颤动) → 释放(1.45s 大招开火，前扑 + 白闪 + 冲击环)
 *   → 淡出(1.7~2.7s 人像一边淡掉一边前飘，色带退去，把画面交给大招特效)。过场里世界慢放（×0.15 → 逐步恢复），不是定格。
 *   画面是纯函数：XY.cutin.draw(c, G, app) 只看 G.cut.t，所以截图 / 联系表可以直接拨时间点。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2;
  var Ci = XY.cutin = { T_READY: 0.35, T_RAISE: 0.85, T_CHARGE: 1.45, T_FADE: 1.7, T_END: 2.7, SLOW: 0.15 };
  C.CUTIN = true;
  var cache = {};

  // 把立绘做成「羽化边缘」的小图（432×576，省内存），只在第一次用到时生成
  function sprite(id) {
    var im = XY.bgArt && XY.bgArt(id); if (!im) return null;
    var e = cache[id]; if (e && e.src === im) return e.cv;
    var w = 432, h = 576, cv = document.createElement('canvas'); cv.width = w; cv.height = h; var o = cv.getContext('2d');
    o.imageSmoothingQuality = 'high'; o.drawImage(im, 0, 0, w, h);
    o.globalCompositeOperation = 'destination-in';
    var m = document.createElement('canvas'); m.width = w; m.height = h; var q = m.getContext('2d');
    var g = q.createRadialGradient(w / 2, h * 0.5, h * 0.18, w / 2, h * 0.5, h * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = g; q.fillRect(0, 0, w, h); o.drawImage(m, 0, 0);
    cache[id] = { src: im, cv: cv }; return cv;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function colorOf(h) { return (h && h.def && h.def.color) || '#e0a415'; }

  // 当前时间点的“姿势”：lean 前后倾（-后仰 / +前扑）、stretch 上半身拉长（抬手）、sc 整体缩放、dx 水平位移、glow 光晕强度、alpha 人像透明度、shake 颤动
  Ci.pose = function (t) {
    var p = { phase: 'ready', lean: 0, stretch: 0, sc: 1, dx: 0, dy: 0, glow: 0.15, alpha: 1, shake: 0, band: 1, flash: 0, ring: 0 };
    if (t < Ci.T_READY) { var a = ease(t / Ci.T_READY); p.phase = 'ready'; p.dx = (1 - a) * 200; p.alpha = clamp01(t / 0.18); p.band = a; p.lean = 0.03 * (1 - a); p.sc = 0.94 + 0.06 * a; }
    else if (t < Ci.T_RAISE) { var b = ease((t - Ci.T_READY) / (Ci.T_RAISE - Ci.T_READY)); p.phase = 'raise'; p.lean = -0.11 * b; p.stretch = 0.16 * b; p.sc = 1 + 0.05 * b; p.dy = -10 * b; p.glow = 0.15 + 0.3 * b; }
    else if (t < Ci.T_CHARGE) { var d = (t - Ci.T_RAISE) / (Ci.T_CHARGE - Ci.T_RAISE); p.phase = 'charge'; p.lean = -0.11 - 0.04 * d; p.stretch = 0.16 + 0.06 * d; p.sc = 1.05 + 0.03 * d; p.dy = -10 - 6 * d; p.glow = 0.45 + 0.7 * d; p.shake = 3 + 8 * d; }
    else if (t < Ci.T_FADE) { var r = (t - Ci.T_CHARGE) / (Ci.T_FADE - Ci.T_CHARGE), k = ease(r); p.phase = 'release'; p.lean = -0.15 + 0.38 * k; p.stretch = 0.22 - 0.3 * k; p.sc = 1.08 + 0.16 * k; p.dx = -50 * k; p.dy = 0; p.glow = 1.4; p.flash = 1 - r; p.ring = r; }
    else { var f = clamp01((t - Ci.T_FADE) / (Ci.T_END - Ci.T_FADE)); p.phase = 'fade'; p.lean = 0.23 - 0.08 * f; p.stretch = -0.08 * (1 - f); p.sc = 1.24 + 0.14 * f; p.dx = -50 - 90 * f; p.alpha = 1 - ease(f); p.glow = 1.4 * (1 - f); p.band = 1 - ease(f); p.ring = 1 + f; }
    return p;
  };

  Ci.start = function (G, h) {
    if (!C.CUTIN) { XY.specialUlt(G, h); return; }
    G.cut = { t: 0, id: (h.def && h.def.xid) || h.id, h: h, fired: false, name: h.def.name, ult: h.def.ult, color: colorOf(h) };
  };
  // 每帧在 XY.step 开头调用：推进过场时钟、到点放大招，返回这一帧世界该走多少时间（慢放）
  Ci.tick = function (G, dt) {
    var c = G.cut; if (!c) return dt;
    c.t += dt;
    var h = c.h;
    if (h && !h.dead) {                                                  // 小人的 Q 版动作：抬手(前摇帧) → 出招帧 → 回待机
      h.moving = false; h.hurtT = 0; h.atkMax = 1;
      h.atkT = c.t < Ci.T_CHARGE ? 0.12 : (c.t < Ci.T_CHARGE + 0.45 ? 0.95 : 0);
    }
    if (!c.fired && c.t >= Ci.T_CHARGE) {
      c.fired = true; if (h) { XY.specialUlt(G, h); G.shake = Math.max(G.shake || 0, 8); G.flash = Math.max(G.flash || 0, 0.5); }
    }
    if (c.t >= Ci.T_END) { G.cut = null; return dt; }
    if (c.t < Ci.T_CHARGE) return dt * Ci.SLOW;
    return dt * (Ci.SLOW + (1 - Ci.SLOW) * clamp01((c.t - Ci.T_CHARGE) / (Ci.T_END - Ci.T_CHARGE)));
  };

  Ci.draw = function () { return; };
  Ci.drawFull = function (c, G, app) {
    var cu = G.cut; if (!cu) return;
    var W = app.lw, H = app.lh, t = cu.t, p = Ci.pose(t), col = cu.color, R = XY.R, txt = R.txt, rt = app.rt || t;
    var cv = sprite(cu.id), bandH = Math.min(H * 0.64, 420), by = H * 0.5 - bandH * 0.55, ba = p.band;
    c.save();
    // 1 整屏淡淡压暗（暖色，不黑屏）
    c.fillStyle = 'rgba(40,28,10,' + (0.28 * ba).toFixed(3) + ')'; c.fillRect(0, 0, W, H);
    // 2 色带：从右往左划入，斜切
    var bw = W * ease(Math.min(1, t / 0.3)) * (p.phase === 'fade' ? ba : 1);
    c.save(); c.beginPath(); c.moveTo(W, by); c.lineTo(W - bw - 60, by); c.lineTo(W - bw, by + bandH); c.lineTo(W, by + bandH); c.closePath(); c.clip();
    var lg = c.createLinearGradient(0, by, W, by + bandH); lg.addColorStop(0, 'rgba(255,252,238,0.94)'); lg.addColorStop(0.55, col); lg.addColorStop(1, 'rgba(255,248,224,0.94)');
    c.globalAlpha = 0.88 * ba; c.fillStyle = lg; c.fillRect(0, by, W, bandH); c.globalAlpha = 1;
    // 速度线
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    for (var i = 0; i < 16; i++) { var yy = by + ((i * 53 + Math.floor(rt * 6) * 17) % bandH), L = 120 + (i * 37 % 160), xx = W - ((rt * 900 + i * 211) % (W + 200)); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + L, yy); c.stroke(); }
    c.restore();
    // 3 立绘（纸偶：横条切片，按姿势拉长 / 倾斜，脚底为轴）
    if (cv && p.alpha > 0.01) {
      var ih = Math.min(H * 0.98, bandH * 1.55), iw = ih * cv.width / cv.height, cx = W * 0.34 + p.dx, foot = by + bandH * 0.5 + ih * 0.5 + p.dy;
      var gl = p.glow;
      var g = c.createRadialGradient(cx, foot - ih * 0.5, 10, cx, foot - ih * 0.5, ih * 0.62); g.addColorStop(0, 'rgba(255,255,255,' + (0.55 * gl * p.alpha).toFixed(3) + ')'); g.addColorStop(0.5, col + '55'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(cx - ih, foot - ih * 1.1, ih * 2, ih * 1.2);
      c.save(); c.globalAlpha = p.alpha; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      var N = 28, sw = cv.height / N, shx = p.shake ? (Math.random() - 0.5) * p.shake : 0, y = foot;
      for (var k = N - 1; k >= 0; k--) {                                   // 从脚往头累加，脚底不动
        var v = (k + 0.5) / N, up = 1 - v;                                 // up：越靠上越大
        var sc = p.sc * (1 + p.stretch * Math.exp(-Math.pow((v - 0.32) / 0.28, 2)));    // 手臂 / 肩膀一带拉长（抬手）
        var sh = ih / N * sc; y -= sh;
        var off = p.lean * ih * Math.pow(up, 1.35) + shx * up;
        c.drawImage(cv, 0, k * sw, cv.width, sw + 0.6, cx - iw * p.sc / 2 + off, y, iw * p.sc, sh + 0.8);
      }
      c.restore();
      // 聚气光球 + 向光球收拢的粒子（抬手之后）
      if (t > Ci.T_READY) {
        var ox = cx + p.lean * ih * 0.5 + iw * 0.12, oy = foot - ih * (0.62 + p.stretch * 0.7), cr = (8 + 44 * clamp01((t - Ci.T_READY) / (Ci.T_CHARGE - Ci.T_READY))) * (p.phase === 'fade' ? 1 - clamp01((t - Ci.T_FADE) / 0.4) : 1);
        if (cr > 1) {
          var og = c.createRadialGradient(ox, oy, 0, ox, oy, cr * 2.2); og.addColorStop(0, 'rgba(255,255,255,0.95)'); og.addColorStop(0.35, col); og.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = og; c.beginPath(); c.arc(ox, oy, cr * 2.2, 0, PI2); c.fill();
          c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = 0.7; for (var ry = 0; ry < 10; ry++) { var ra = ry / 10 * PI2 + rt * 3, r0 = cr * 1.3, r1 = cr * (2.2 + 0.8 * Math.sin(rt * 14 + ry)); c.beginPath(); c.moveTo(ox + Math.cos(ra) * r0, oy + Math.sin(ra) * r0); c.lineTo(ox + Math.cos(ra) * r1, oy + Math.sin(ra) * r1); c.stroke(); } c.globalAlpha = 1;
          if (p.phase === 'raise' || p.phase === 'charge') for (var q = 0; q < 14; q++) {
            var aa = q / 14 * PI2 + rt * 2, fr = ((rt * 1.4 + q * 0.37) % 1), rr = (1 - fr) * 150 + 10;
            c.fillStyle = 'rgba(255,255,255,' + (0.8 * fr).toFixed(2) + ')'; c.beginPath(); c.arc(ox + Math.cos(aa) * rr, oy + Math.sin(aa) * rr * 0.7, 2.6 * fr + 0.6, 0, PI2); c.fill();
          }
        }
      }
    }
    // 4 名牌：大字 + 大招名（用游戏自己的字体）
    var tx = W * 0.58, ty = by + bandH * 0.42, ta = ba * clamp01((t - 0.2) / 0.25);
    if (ta > 0.01 && cu.name) {
      c.save(); c.globalAlpha = ta;
      txt(c, cu.name, tx, ty, Math.min(64, bandH * 0.19), '#2b1c08', 'left', true);
      txt(c, '大招 · ' + (cu.ult || ''), tx + 4, ty + Math.min(58, bandH * 0.2), Math.min(30, bandH * 0.095), '#fffaf0', 'left', true);
      c.restore();
    }
    // 5 释放：白闪 + 冲击环
    if (p.flash > 0.01) { c.fillStyle = 'rgba(255,255,255,' + (0.7 * p.flash).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
    if (p.ring > 0 && p.ring < 2) { var rr2 = p.ring * Math.max(W, H) * 0.55; c.strokeStyle = col; c.globalAlpha = Math.max(0, 1 - p.ring / 2); c.lineWidth = 10 * (1 - p.ring / 2.2); c.beginPath(); c.arc(W * 0.34, H * 0.5, rr2, 0, PI2); c.stroke(); c.globalAlpha = 1; }
    c.restore();
  };
})();
