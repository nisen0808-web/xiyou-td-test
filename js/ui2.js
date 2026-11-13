/* ============================================================
 * ui2.js —— v0.8.6 界面 v2（默认开；网址加 ?ui=v1 退回旧样式）
 * 一、字不要出格：给 CanvasRenderingContext2D.fillText / strokeText 加一道「放得下吗」的关——
 *     画文字前，在本帧已画的圆角矩形 / 矩形里找「包住这行字起点」的最小一个当容器（卡片、按钮、面板、药丸）；
 *     字超出容器 → 先按比例缩字号（最小缩到 62%）→ 还放不下就末尾加省略号。非战斗界面还保证字不出屏幕边。
 *     所有屏幕、所有尺寸一视同仁，不用逐个文字去加 maxWidth。
 * 二、触控目标 ≥ 44 CSS px：btn / btnS / ov.btn 在小屏（zoom < 0.95）上把高度撑到 44 CSS px；
 *     帧末再扫一遍点击框，凡不足 44 CSS px 的，在不压到邻居的前提下扩大点击范围（只扩大不改外观）。
 * 三、面板 / 按钮 / 页签的 v2 画法：宣纸渐变 + 金线 + 内描线（panel）、金边药丸（btnS）、笔刷下划线页签（tab）。
 * 对外：XY.ui2 = { on, fit, minH(app), panel, btnS, begin, end, audit(数组，测试用) }
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, CP = CanvasRenderingContext2D.prototype;
  var U = XY.ui2 = { on: !/[?&]ui=v1/.test(location.search), fit: true, audit: null, stats: { fitted: 0, trunc: 0, edge: 0 }, G: null, app: null };
  var LINE = '#c9a44c', INK = '#2b1c08', INK2 = '#6d6455', RED = '#c8341f';
  var rc = [], rects = [], rn = 0, lm = null, lmN = 0, MAXR = 500;           // 本帧的矩形登记簿（rc = 画布上下文，rects = [x,y,w,h,a,d,e,f]）

  function reg(c, x, y, w, h) {
    if (w < 10 || h < 8) return;
    var m = c.getTransform(); if (m.b || m.c) return;
    var i = rn++ % MAXR; rc[i] = c; rects[i] = [x, y, w, h, m.a, m.d, m.e, m.f];
  }
  var oMove = CP.moveTo, oArc = CP.arcTo, oFR = CP.fillRect, oFill = CP.fillText, oStroke = CP.strokeText;
  CP.moveTo = function (x, y) { lm = this; lmN = 0; lx = x; ly = y; return oMove.call(this, x, y); };
  var lx = 0, ly = 0;
  CP.arcTo = function (x1, y1, x2, y2, r) {
    if (U.on && lm === this && lmN++ === 0 && y1 === ly && x2 === x1 && x1 > lx && y2 > y1) reg(this, lx - r, ly, x1 - lx + r, y2 - y1);
    return oArc.call(this, x1, y1, x2, y2, r);
  };
  CP.fillRect = function (x, y, w, h) { if (U.on && w >= 24 && h >= 14) { var mt = this.getTransform(); if (!mt.b && !mt.c && w * mt.a >= this.canvas.width * 0.95 && h * mt.d >= this.canvas.height * 0.95) { rn = 0; rects.length = 0; rc.length = 0; } reg(this, x, y, w, h); } return oFR.call(this, x, y, w, h); };

  U.begin = function (G, app) { rn = 0; rc.length = 0; rects.length = 0; U.G = G; U.app = app; if (U.audit) { U.audit.length = 0; U.audit.hits = null; } };

  var FONT_RE = /(\d+(?:\.\d+)?)px/;
  function fitText(c, s, x, y, mw) {
    if (U.world) return null;                                                   // 世界里的地面文字（休息点等）不做边缘适配
    var m = c.getTransform(); if (m.b || m.c) return null;
    var f = c.font, mm = FONT_RE.exec(f); if (!mm) return null;
    var size = +mm[1], w = c.measureText(s).width, al = c.textAlign, k = m.a;
    var ax = m.a * x + m.e, ay = m.d * y + m.f, dw = w * k, ds = size * m.d, i, best = null, ba = 1e12, r;
    for (i = rn > MAXR ? MAXR - 1 : rn - 1; i >= 0; i--) {
      if (rc[i] !== c) continue; r = rects[i];
      var rx = r[4] * r[0] + r[6], ry = r[5] * r[1] + r[7], rw = r[4] * r[2], rh = r[5] * r[3];
      if (rh < ds * 1.05 || rw < ds * 1.6) continue;
      var inx = al === 'center' ? (ax >= rx && ax <= rx + rw) : (al === 'right' || al === 'end') ? (ax > rx + 2 && ax <= rx + rw + 1) : (ax >= rx - 1 && ax < rx + rw - 2);
      if (!inx || ay - ds * 0.5 < ry - 1 || ay + ds * 0.5 > ry + rh + 1) continue;
      if (rw * rh < ba) { ba = rw * rh; best = [rx, ry, rw, rh]; }
      if (best && rw >= dw * 0.9) break;                                       // 最新登记且够宽的框 = 文字真正画在上面的那一个
    }
    var L, R, edge = false, pad = Math.max(3, Math.min(8, ds * 0.3));
    if (best) { L = best[0] + pad; R = best[0] + best[2] - pad; }
    else {
      var A = U.app; if (!A || (A.screen === 'play' && U.G && U.G.mode === 'play')) return null;
      L = 3; R = c.canvas.width - 3; edge = true; if (R <= L) return null;
    }
    var avail = al === 'center' ? 2 * Math.min(ax - L, R - ax) : (al === 'right' || al === 'end') ? ax - L : R - ax;
    var rec = U.audit ? { s: s, size: size, ax: ax, w: dw, box: best, edge: edge, avail: avail, over: dw > avail + 0.5, scale: 1, trunc: false } : null;
    if (dw <= avail + 0.5 || avail <= 0) { if (rec) U.audit.push(rec); return null; }
    var kk = Math.max(0.62, avail / dw), out = s;
    if (avail / dw < 0.62) {                                                    // 缩到 62% 还放不下：末尾省略号
      c.font = f.replace(FONT_RE, (size * 0.62) + 'px'); var lim = avail / k - c.measureText('…').width; out = s;
      while (out.length > 1 && c.measureText(out).width > lim) out = out.slice(0, -1);
      out += '…'; U.stats.trunc++; if (rec) rec.trunc = true; c.font = f;
    } else U.stats[edge ? 'edge' : 'fitted']++;
    if (rec) { rec.scale = kk; U.audit.push(rec); }
    return { font: f.replace(FONT_RE, (size * kk) + 'px'), s: out, orig: f };
  }
  U.fitText = fitText;
  function wrapTxt(orig) {
    return function (s, x, y, mw) {
      if (!U.on || !U.fit || typeof s !== 'string' || s.length < 2 || mw !== undefined) return orig.call(this, s, x, y, mw);
      var r = fitText(this, s, x, y);
      if (!r) return orig.call(this, s, x, y);
      this.font = r.font; try { return orig.call(this, r.s, x, y); } finally { this.font = r.orig; }
    };
  }
  CP.fillText = wrapTxt(oFill); CP.strokeText = wrapTxt(oStroke);

  /* ---------- v2 画法：面板 / 药丸按钮 ---------- */
  function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); if (!(r >= 0)) r = 0; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  var T0 = 'rgba(255,253,246,0.95)', PB = '#cdbf9c';
  /* 水墨纸面：宣纸底 + 两团淡墨晕 + 底部远山剪影（只在够大的面板上）；全部按面板位置做确定的形状，不闪烁 */
  function wash(c, x, y, w, h, r, mount) {
    c.save(); rr(c, x, y, w, h, r); c.clip();
    var m = Math.max(w, h), g = c.createRadialGradient(x + w * 0.08, y + h * 0.02, 0, x + w * 0.08, y + h * 0.02, m * 0.75);
    g.addColorStop(0, 'rgba(176,138,72,0.13)'); g.addColorStop(1, 'rgba(176,138,72,0)'); c.fillStyle = g; c.fillRect(x, y, w, h);
    g = c.createRadialGradient(x + w * 0.96, y + h * 0.98, 0, x + w * 0.96, y + h * 0.98, m * 0.8);
    g.addColorStop(0, 'rgba(70,92,74,0.12)'); g.addColorStop(1, 'rgba(70,92,74,0)'); c.fillStyle = g; c.fillRect(x, y, w, h);
    if (mount) {
      var s = (Math.round(x) * 7 + Math.round(y) * 13) % 5, b = y + h;
      [[0.17, 0.05, 0.034], [0.11, 0.07, 0.05]].forEach(function (L, i) {
        c.beginPath(); c.moveTo(x, b); c.lineTo(x, b - h * L[0] * 0.6);
        for (var k = 0; k <= 6; k++) { var px = x + w * k / 6, py = b - h * (L[0] * (0.55 + 0.45 * Math.abs(Math.sin((k + s + i * 2.3) * 1.7))) + (k % 2 ? L[1] * 0.3 : 0)); c.quadraticCurveTo(px - w / 12, py - h * 0.025, px, py); }
        c.lineTo(x + w, b); c.closePath(); c.fillStyle = 'rgba(52,66,56,' + L[2] + ')'; c.fill();
      });
      c.strokeStyle = 'rgba(120,100,60,0.05)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + w * 0.1, y + h * 0.9); c.lineTo(x + w * 0.62, y + h * 0.9); c.moveTo(x + w * 0.3, y + h * 0.935); c.lineTo(x + w * 0.9, y + h * 0.935); c.stroke();
    }
    c.restore();
  }
  function corners(c, x, y, w, h) {
    var L = 14, o = 7; c.save(); c.strokeStyle = '#b8863b'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
    [[x + o, y + o, 1, 1], [x + w - o, y + o, -1, 1], [x + o, y + h - o, 1, -1], [x + w - o, y + h - o, -1, -1]].forEach(function (p) {
      c.beginPath(); c.moveTo(p[0], p[1] + p[3] * L); c.lineTo(p[0], p[1]); c.lineTo(p[0] + p[2] * L, p[1]); c.stroke();
      c.fillStyle = '#c8341f'; c.beginPath(); c.arc(p[0] + p[2] * 4.5, p[1] + p[3] * 4.5, 1.7, 0, 6.2832); c.fill();
    }); c.restore();
  }
  U.panel = function (c, x, y, w, h, r, fill, border) {
    r = Math.min(r || 10, h / 2, w / 2); var big = w >= 120 && h >= 50, page = w >= 260 && h >= 170, dflt = !border || border === PB, pl = !fill || fill === T0 || /^rgba\(255,25[03],2[34]\d,0\.9/.test(fill);
    c.save();
    if (big) { c.shadowColor = 'rgba(70,45,10,0.18)'; c.shadowBlur = page ? 16 : 10; c.shadowOffsetY = 3; }
    var paper = pl || (typeof fill === 'string' && fill.indexOf('255,255,255') >= 0);
    if (paper) { var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fbf6ea'); g.addColorStop(1, '#f3e6cc'); c.fillStyle = g; } else c.fillStyle = fill;
    rr(c, x, y, w, h, Math.min(r, 8)); c.fill(); c.restore();
    if (paper) wash(c, x, y, w, h, Math.min(r, 8), page);
    c.lineWidth = page ? 2.2 : 1.6; c.strokeStyle = '#2a2118'; rr(c, x, y, w, h, Math.min(r, 8)); c.stroke();
    if (big && dflt) { c.lineWidth = 0.8; c.strokeStyle = page ? 'rgba(140,100,40,0.38)' : 'rgba(120,90,40,0.26)'; rr(c, x + (page ? 5 : 4), y + (page ? 5 : 4), w - (page ? 10 : 8), h - (page ? 10 : 8), Math.max(2, r - 3)); c.stroke(); }
    if (page && dflt) corners(c, x, y, w, h);
  };
  U.pill = function (c, x, y, w, h, label, o) {
    o = o || {}; var hov = o.hov && !o.off, r = Math.min(6, h * 0.18);
    var face = '"Ma Shan Zheng","STKaiti","KaiTi",serif';
    var ink = o.off ? '#a49d8a' : (o.danger || o.primary ? '#fff6e4' : '#24180f');
    c.save();
    if ((o.primary || o.danger) && !o.off) {
      c.fillStyle = hov ? '#c44532' : '#a83224';
      rr(c, x, y, w, h, r); c.fill();
      c.strokeStyle = 'rgba(255,220,180,0.85)'; c.lineWidth = 1.2;
      rr(c, x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 2)); c.stroke();
    } else {
      c.fillStyle = o.off ? '#efe6d4' : (o.on ? '#f6e2c4' : (hov ? '#fff8ea' : '#fbf6ea'));
      rr(c, x, y, w, h, r); c.fill();
      c.strokeStyle = o.on ? '#a83224' : '#2a2118'; c.lineWidth = o.on ? 2 : 1.4;
      rr(c, x, y, w, h, r); c.stroke();
    }
    c.font = (o.size || 16) + 'px ' + face;
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(XY.fmtStr(label), x + w / 2, y + h / 2 + 1);
    c.restore();
  };

  /* ---------- 触控目标 ---------- */
  U.minH = function (app) { return U.on && app && app.zoom < 0.95 ? 44 / app.zoom : 0; };
  /* 把一个按钮框撑到 ≥ 44 CSS px（小屏）；返回 [x, y, w, h]（居中撑开，不出屏幕上沿） */
  U.grow = function (app, x, y, w, h) {
    var mn = U.minH(app); if (!mn) return [x, y, w, h];
    var s = XY.ov && XY.ov.curS || 1; mn /= s;
    if (h < mn) { y = Math.max(2, y - (mn - h) / 2); h = mn; }
    if (w < mn) { x -= (mn - w) / 2; w = mn; }
    return [x, y, w, h];
  };
  function expandHits(app) {
    var hits = XY.ui.hits, mn = U.minH(app), i, j, h, o;
    if (!mn) return;
    for (i = 0; i < hits.length; i++) {
      h = hits[i]; if (h._x2) continue; h._x2 = 1;
      var nw = Math.max(h.w, mn), nh = Math.max(h.h, mn);
      if (nw === h.w && nh === h.h) continue;
      var x0 = h.x - (nw - h.w) / 2, y0 = h.y - (nh - h.h) / 2, x1 = x0 + nw, y1 = y0 + nh;
      for (j = 0; j < hits.length; j++) {                                        // 不压到邻居：邻居和原框不重叠、却和扩大框重叠 → 在那一侧收回
        if (j === i) continue; o = hits[j]; if (o.w > 400 && o.h > 400) continue;
        if (o.x < h.x + h.w - 1 && o.x + o.w > h.x + 1 && o.y < h.y + h.h - 1 && o.y + o.h > h.y + 1) continue;      // 容差 1：邻居已扩大到刚好贴着原框边时不算压到
        if (o.x < x1 && o.x + o.w > x0 && o.y < y1 && o.y + o.h > y0) {
          var ox = Math.min(x1, o.x + o.w) - Math.max(x0, o.x), oy = Math.min(y1, o.y + o.h) - Math.max(y0, o.y);
          if (ox < oy) { if (o.x + o.w / 2 < h.x + h.w / 2) x0 = Math.max(x0, o.x + o.w); else x1 = Math.min(x1, o.x); }
          else { if (o.y + o.h / 2 < h.y + h.h / 2) y0 = Math.max(y0, o.y + o.h); else y1 = Math.min(y1, o.y); }
        }
      }
      x0 = Math.min(x0, h.x); y0 = Math.min(y0, h.y); x1 = Math.max(x1, h.x + h.w); y1 = Math.max(y1, h.y + h.h);
      h.x = x0; h.y = y0; h.w = x1 - x0; h.h = y1 - y0;
    }
  }
  U.end = function (G, app) {
    expandHits(app);
    if (U.audit) U.audit.hits = XY.ui.hits.map(function (h) { return { x: h.x, y: h.y, w: h.w, h: h.h, act: h.act }; });
  };
})();
