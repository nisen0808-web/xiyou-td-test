/* DEFAULT DISABLED：主菜单默认走 menu_v5 的 V2 电影海报（2026-11）；menu_stage 用 ?menu=H4，本文件仅当 URL 带 ?menu=B 时由 menu.js 调用。勿删，等用户确认后再清理。 */
/* 主菜单「取经海报」：14 位人物去掉卡片框，抠图站在同一张画上；怪物只是远景墨影；名字是预先合成的毛笔落款图。
   素材：assets/art/menu-poster/（tools/menu_poster_cut.py、tools/menu_poster_names.py 生成）；点选用 masks.js 里预先算好的 36x48 掩码
   （file:// 下 canvas 读像素会被污染，所以不在运行时 getImageData）。 */
(function () {
  'use strict';
  var XY = window.XY, PI2 = Math.PI * 2;
  var P = XY.menuPoster = { layoutId: 'A', stats: { fig: 0, name: 0 }, hover: null };
  var DIR = 'assets/art/menu-poster/', ASP = 0.7455, MW = 36, MH = 48;
  var KAI = '"STKaiti","KaiTi","KaiTi_GB2312","楷体","Songti SC","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif';

  /* ---------- 图片与掩码 ---------- */
  var imgs = {}, masks = {}, glows = {};
  function img(key) {
    var o = imgs[key];
    if (!o) {
      var im = new Image(), D = window.XY_MENU_POSTER;
      im.src = (D && D[key]) || (DIR + key + '.webp');
      o = imgs[key] = im;
    }
    return o.complete && o.naturalWidth ? o : null;
  }
  function mask(id) {
    if (masks[id] !== undefined) return masks[id];
    var M = window.XY_MENU_MASK, m = null;
    if (M && M.d && M.d[id]) { var s = atob(M.d[id]), a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); m = a; }
    return (masks[id] = m);
  }
  function cell(id, u, v) {                // 0 空 / 1 飞白 / 2 实体；没掩码时按中间 55% 宽的椭圆兜底
    var m = mask(id);
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
    if (m) return m[((v * MH) | 0) * MW + ((u * MW) | 0)];
    var dx = (u - 0.5) / 0.28, dy = (v - 0.5) / 0.45; return dx * dx + dy * dy < 1 ? 2 : 0;
  }
  function glow(id, im) {                  // 烘焙一次的暖色外晕（半分辨率，shadowBlur 偏移法只留阴影）
    if (glows[id]) return glows[id];
    var w = Math.round(im.naturalWidth / 2), h = Math.round(im.naturalHeight / 2), pad = 28, cv = document.createElement('canvas'), o;
    cv.width = w + pad * 2; cv.height = h + pad * 2; o = cv.getContext('2d');
    o.shadowColor = 'rgba(232,118,52,1)'; o.shadowBlur = 22; o.shadowOffsetX = 5000;
    o.drawImage(im, pad - 5000, pad, w, h); o.drawImage(im, pad - 5000, pad, w, h);
    return (glows[id] = { cv: cv, pad: pad });
  }

  /* ---------- 版式（1280x720 设计坐标；cx 中心 x，top 图顶，h 图高；row 0 后排 1 前排 2 主角）----------
     脚线统一落在 590。后排露出头肩，前排之间留 20~30px 空隙。 */
  var LAY = {
    A: {        // Claude 的金字塔：左 2 后 3 前；右 6 后 3 前
      L: [['horse', 215, 120, 280, 0], ['wujing', 385, 120, 280, 0], ['tang', 130, 260, 330, 1], ['bajie', 470, 260, 330, 1], ['wukong', 300, 210, 380, 2]],
      R: [['laosiji', 652, 134, 250, 0], ['yuanzhang', 1180, 134, 250, 0], ['martin', 758, 134, 250, 0], ['sisi', 1075, 134, 250, 0], ['kuanggong', 864, 134, 250, 0], ['diaoyulao', 969, 134, 250, 0],
        ['heyuxi', 718, 260, 330, 1], ['haiteng', 1144, 260, 330, 1], ['phyrex', 935, 205, 385, 2]]
    },
    B: {        // Grok 的双排错落：右组 4 前 5 后（Sisi 也站前排），主角放大
      L: [['horse', 200, 128, 272, 0], ['wujing', 385, 128, 272, 0], ['tang', 125, 262, 330, 1], ['bajie', 470, 262, 330, 1], ['wukong', 298, 210, 380, 2]],
      R: [['laosiji', 665, 134, 250, 0], ['martin', 800, 134, 250, 0], ['kuanggong', 960, 134, 250, 0], ['diaoyulao', 1085, 134, 250, 0], ['yuanzhang', 1185, 134, 250, 0],
        ['heyuxi', 722, 262, 330, 1], ['sisi', 1035, 262, 330, 1], ['haiteng', 1150, 262, 330, 1], ['phyrex', 888, 205, 385, 2]]
    }
  };
  var MON = [  // [图, cx, 脚线 y, 高, alpha, 组：0 中 1 左 2 右]  怪物只做远景，不可点
    ['bear', 600, 410, 340, 0.15, 0], ['bone', 92, 175, 150, 0.13, 1],
    ['small', 40, 102, 36, 0.34, 1], ['ranged', 92, 102, 40, 0.34, 1], ['shield', 146, 102, 46, 0.34, 1], ['tank', 205, 102, 50, 0.34, 1], ['elite', 266, 102, 64, 0.34, 1],
    ['tank', 1000, 102, 50, 0.34, 2], ['small', 1058, 102, 36, 0.34, 2], ['shield', 1112, 102, 46, 0.34, 2], ['ranged', 1170, 102, 40, 0.34, 2], ['etower', 1226, 108, 92, 0.22, 2]
  ];
  var TIPS_NAME_K = { 0: 0.34, 1: 0.40, 2: 0.48 };

  /* ---------- 摆位：按 W、H、舞台区算出每个人的位置（缓存） ---------- */
  var cache = null;
  function build(W, areaY, areaH, stacked, phone) {
    var key = [W | 0, areaY | 0, areaH | 0, P.layoutId, stacked ? 1 : 0, phone ? 1 : 0].join(), L = LAY[P.layoutId], figs = [], gr = [];
    if (cache && cache.key === key) return cache;
    var feet = areaY + areaH, dy0 = feet - 590, sp = XY.SPECIALS.filter(function (d) { return !XY.isHidden || !XY.isHidden(d.id); }).map(function (d) { return d.id; });
    function group(list, sx, oy, s, g, abs) {
      var x0 = 1e9, x1 = -1e9, t0 = 1e9;
      list.forEach(function (a) { var w = a[3] * ASP; x0 = Math.min(x0, a[1] - w / 2); x1 = Math.max(x1, a[1] + w / 2); t0 = Math.min(t0, a[2]); });
      var ox = abs != null ? abs : Math.max(x0, 4) + sx; if (oy == null) oy = t0 + dy0;
      list.forEach(function (a, k) {
        if (g === 'R' && sp.indexOf(a[0]) < 0) return;
        var h = a[3] * s, w = h * ASP;
        figs.push({ id: a[0], g: g, row: a[4], z: a[4] * 10 + k * 0.01, x: ox + (a[1] - x0) * s - w / 2, y: oy + (a[2] - t0) * s, w: w, h: h, s: s });
      });
      gr.push({ g: g, x: ox, w: (x1 - x0) * s, y: oy, h: (590 - t0) * s, feet: oy + (590 - t0) * s });
    }
    if (!stacked) {
      var e = Math.max(0, W - 1280), sc = Math.min(1, areaH / 486);
      if (sc >= 0.97) sc = 1;
      group(L.L, e * 0.25, sc >= 1 ? null : areaY + 8, sc, 'L'); group(L.R, e * 0.75, sc >= 1 ? null : areaY + 8, sc, 'R');
    } else {
      var gw1 = 590, gw2 = 680, s1 = Math.min(1, (W - 16) / gw1), s2 = Math.min(1, (W - 16) / gw2), h1 = 480 * s1 * 0.78, h2 = 480 * s2 * 0.78;
      var tot = h1 + h2 + 10, k = Math.min(1, areaH / tot);
      s1 *= k; s2 *= k; h1 *= k; h2 *= k; var oy0 = areaY + 4 + Math.max(0, (areaH - (h1 + h2 + 10)) / 2) - 10;
      group(L.L, 0, oy0, s1, 'L', W / 2 - gw1 * s1 / 2);
      group(L.R, 0, oy0 + h1 + 10, s2, 'R', W / 2 - gw2 * s2 / 2);
    }
    var smin = 1; figs.forEach(function (f) { smin = Math.min(smin, f.s); });
    figs.sort(function (a, b) { return a.z - b.z; });
    var o = { key: key, figs: figs, groups: gr, feet: feet, smin: smin, stacked: stacked, phone: phone, W: W, areaY: areaY, areaH: areaH };
    placeNames(o); bakeGround(o); return (cache = o);
  }

  /* ---------- 名字摆位：每人几个候选位置，选被别人身体盖得最少、不撞别的名字、不出舞台的那个 ---------- */
  function cover(fs, nx, ny, nw, nh, self) {
    var tot = 0, k, f, i, j, u0, u1, v0, v1;
    for (k = 0; k < fs.length; k++) {
      f = fs[k]; var ix0 = Math.max(nx, f.x), ix1 = Math.min(nx + nw, f.x + f.w), iy0 = Math.max(ny, f.y), iy1 = Math.min(ny + nh, f.y + f.h);
      if (ix1 <= ix0 || iy1 <= iy0) continue;
      var wgt = f === self ? 3 : 1.4, n = 0, hit = 0, m = mask(f.id);
      u0 = Math.floor((ix0 - f.x) / f.w * MW); u1 = Math.ceil((ix1 - f.x) / f.w * MW); v0 = Math.floor((iy0 - f.y) / f.h * MH); v1 = Math.ceil((iy1 - f.y) / f.h * MH);
      for (j = v0; j < v1 && j < MH; j++) for (i = u0; i < u1 && i < MW; i++) { n++; var c = m ? m[j * MW + i] : (cell(f.id, (i + 0.5) / MW, (j + 0.5) / MH)); hit += c === 2 ? 1 : c === 1 ? 0.6 : 0; }
      if (n) tot += wgt * hit / n * ((ix1 - ix0) * (iy1 - iy0)) / (nw * nh) * 3;
    }
    return tot;
  }
  function placeNames(o) {
    var fs = o.figs, placed = [], order = fs.slice().sort(function (a, b) { return b.z - a.z; }), x0 = 4, x1 = o.W - 4, ymin = o.areaY + 2, ymax = o.feet + 4, gb = {};
    o.groups.forEach(function (g) { gb[g.g] = g; });
    function clash(nx, ny, nw, nh, hzMode) {
      var cc = 0; placed.forEach(function (p) { var ox = Math.min(nx + nw, p.x + p.w) - Math.max(nx, p.x), oy = Math.min(ny + nh, p.y + p.h) - Math.max(ny, p.y); if (ox > -(hzMode ? 3 : 26) && oy > -(hzMode ? 3 : 14)) cc += 2 + Math.max(0, ox) * Math.max(0, oy) / (nw * nh) * 6; }); return cc;
    }
    order.forEach(function (f) {
      var ph = o.phone ? 1.4 : 1, foot = f.id === 'wukong', hz = foot || (f.g === 'R' && f.row === 0), key = (hz ? 'nameh-' : 'name-') + f.id, im = img(key), nat = im ? [im.naturalWidth, im.naturalHeight] : (hz ? [200, 60] : [55, 200]), k, nw, nh;
      f.nkey = key;
      if (hz) k = Math.min(0.36 * Math.max(0.7, f.s) * (o.phone ? 1.25 : 1), (f.w * 0.56 * (o.phone ? 1.3 : 1)) / nat[0]);
      else k = Math.min(TIPS_NAME_K[f.row] * Math.max(0.62, f.s) * ph, (f.h * (f.id === 'kuanggong' ? 0.6 : 0.42)) / nat[1] * ph);
      nw = nat[0] * k; nh = nat[1] * k; f.nk = k; f.nw = nw; f.nh = nh;
      if (o.stacked && f.row === 0 && f.s < 0.6) { f.nx = null; return; }
      var best = null, bc = 1e9, g = gb[f.g];
      if (foot) { best = { x: f.x + f.w / 2 - nw / 2, y: f.y + f.h - nh - 10 * f.s }; bc = 0; }   // 主角悟空：脚下横排落款（两侧都是别人的兵器 / 水花）
      else if (hz) {   // 后排：横排题名写在自己头顶，错两层，不会和邻居混
        [-26, -6].forEach(function (dyy) { [0, -16, 16].forEach(function (dxx) {
          var nx = f.x + f.w / 2 - nw / 2 + dxx, ny = f.y + dyy * f.s * (o.phone ? 1.0 : 1), cc = cover(fs, nx, ny, nw, nh, f) + clash(nx, ny, nw, nh, true) + Math.abs(dxx) * 0.01 + (dyy === -6 ? 0.05 : 0);
          if (ny < ymin) cc += 3; if (nx < x0 || nx + nw > x1) cc += 5;
          if (cc < bc) { bc = cc; best = { x: nx, y: ny }; }
        }); });
      } else {
        var us = [-0.02, 0.06, 0.15, 0.85, 0.94, 1.02], vs = [0.02, 0.14, 0.26, 0.38, 0.5, 0.62, 0.74];
        us.forEach(function (u) { vs.forEach(function (v) {
          var cx = f.x + u * f.w, nx = cx - nw / 2, ny = f.y + v * f.h;
          if (ny + nh > f.y + f.h * 0.95 || nx < x0 || nx + nw > x1 || ny < ymin || ny + nh > ymax) return;
          if (g && (nx < g.x + (f.g === 'R' ? 36 : -6) || nx + nw > g.x + g.w + 6)) return;                      // 名字不能越过自己那一组的边界
          var cc = cover(fs, nx, ny, nw, nh, f) + clash(nx, ny, nw, nh, false);
          cc += Math.abs(u - 0.5) < 0.3 ? 0.4 : 0; cc += v * 0.15;
          if (cc < bc) { bc = cc; best = { x: nx, y: ny }; }
        }); });
      }
      if (!best) best = { x: Math.max(x0, Math.min(x1 - nw, f.x + f.w * 0.9 - nw / 2)), y: f.y + f.h * 0.1 };
      f.nx = best.x; f.ny = best.y; f.ncost = bc; placed.push({ x: best.x, y: best.y, w: nw, h: nh });
    });
  }

  /* ---------- 地面墨带 + 脚下墨影（预渲染，半分辨率） ---------- */
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function bakeGround(o) {
    var cv = document.createElement('canvas'), q = 0.5, c, r = rnd(7);
    cv.width = Math.ceil(o.W * q); cv.height = Math.ceil((o.feet + 40) * q); c = cv.getContext('2d'); c.scale(q, q);
    o.groups.forEach(function (g) {
      var x, i, y0 = g.feet - 6;
      for (i = 0; i < 46; i++) {                                           // 干笔横扫：长短不一的扁椭圆
        var cx = g.x + g.w * (0.04 + 0.92 * r()), ww = 60 + 170 * r(), yy = y0 + (r() - 0.45) * 22, hh = 2 + 5 * r();
        c.fillStyle = 'rgba(70,52,30,' + (0.05 + 0.10 * r()).toFixed(3) + ')'; c.beginPath(); c.ellipse(cx, yy, ww / 2, hh, 0, 0, PI2); c.fill();
      }
      var gr = c.createLinearGradient(g.x - 30, 0, g.x + g.w + 30, 0); gr.addColorStop(0, 'rgba(120,100,70,0)'); gr.addColorStop(0.12, 'rgba(120,100,70,0.12)'); gr.addColorStop(0.88, 'rgba(120,100,70,0.12)'); gr.addColorStop(1, 'rgba(120,100,70,0)');
      c.fillStyle = gr; c.fillRect(g.x - 30, y0 - 6, g.w + 60, 14);
    });
    o.figs.forEach(function (f) {
      if (f.row === 0) return;
      var fy = f.y + f.h * 0.9, g = c.createRadialGradient(f.x + f.w / 2, fy, 2, f.x + f.w / 2, fy, f.w * 0.36);
      g.addColorStop(0, 'rgba(50,34,16,0.30)'); g.addColorStop(1, 'rgba(50,34,16,0)');
      c.save(); c.translate(f.x + f.w / 2, fy); c.scale(1, 0.16); c.translate(-f.x - f.w / 2, -fy); c.fillStyle = g; c.beginPath(); c.arc(f.x + f.w / 2, fy, f.w * 0.36, 0, PI2); c.fill(); c.restore();
    });
    var mv = document.createElement('canvas'), mc; mv.width = cv.width; mv.height = cv.height; mc = mv.getContext('2d'); mc.scale(q, q);
    o.groups.forEach(function (g) {                                         // 前后排之间的薄雾：纵向渐变 × 横向两端渐隐，没有矩形边
      var y0 = g.feet - 330 * g.h / 486, y1 = g.feet - 150 * g.h / 486, gx = g.x - 60, gw = g.w + 120, t = document.createElement('canvas'), tc, gr, hg;
      t.width = Math.ceil(gw * q); t.height = Math.ceil((y1 - y0) * q); tc = t.getContext('2d'); tc.scale(q, q);
      gr = tc.createLinearGradient(0, 0, 0, y1 - y0); gr.addColorStop(0, 'rgba(251,247,237,0)'); gr.addColorStop(0.6, 'rgba(251,247,237,0.5)'); gr.addColorStop(1, 'rgba(251,247,237,0.68)');
      tc.fillStyle = gr; tc.fillRect(0, 0, gw, y1 - y0);
      tc.globalCompositeOperation = 'destination-in'; hg = tc.createLinearGradient(0, 0, gw, 0);
      hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.2, 'rgba(0,0,0,1)'); hg.addColorStop(0.8, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
      tc.fillStyle = hg; tc.fillRect(0, 0, gw, y1 - y0);
      mc.drawImage(t, 0, 0, t.width, t.height, gx, y0, gw, y1 - y0);
    });
    o.mist = mv; o.ground = cv; o.gq = q;
  }

  /* ---------- 命中：两轮，先实体像素（从前到后），再飞白；后排头部有保底区 ---------- */
  function pick(o, mx, my) {
    var fs = o.figs, k, f, u, v;
    for (k = fs.length - 1; k >= 0; k--) { f = fs[k]; u = (mx - f.x) / f.w; v = (my - f.y) / f.h; if (cell(f.id, u, v) === 2) return f; }
    for (k = fs.length - 1; k >= 0; k--) { f = fs[k]; u = (mx - f.x) / f.w; v = (my - f.y) / f.h; if (f.row === 0 && u > 0.3 && u < 0.7 && v > 0.08 && v < 0.36) return f; }
    for (k = fs.length - 1; k >= 0; k--) { f = fs[k]; u = (mx - f.x) / f.w; v = (my - f.y) / f.h; if (cell(f.id, u, v) === 1) return f; }
    return null;
  }

  /* ---------- 绘制 ---------- */
  function monsters(c, o, app) {
    var e = Math.max(0, o.W - 1280), feetShift = o.areaY - 104;
    MON.forEach(function (m) {
      if (o.phone && m[5] !== 0 && m[3] < 90) { if (m[0] !== 'elite') return; }
      var im = img('mon-' + m[0]); if (!im) return;
      var h = m[3] * (o.stacked ? Math.min(1, o.W / 700) : 1), w = h * im.naturalWidth / im.naturalHeight;
      var cx = m[1] + (m[5] === 1 ? e * 0.25 : m[5] === 2 ? e * 0.75 : e * 0.5), y = m[2] + feetShift - h;
      if (o.stacked) { cx = m[1] / 1280 * o.W; y = m[2] * 0.6 + feetShift - h; if (m[5] !== 0) return; }
      c.globalAlpha = m[4]; c.drawImage(im, cx - w / 2, y, w, h);
    });
    c.globalAlpha = 1;
  }
  function plate(c, x, y, w, h, a) {
    c.save(); c.shadowColor = 'rgba(80,56,24,' + (0.22 * a) + ')'; c.shadowBlur = 10; c.shadowOffsetY = 3;
    c.fillStyle = 'rgba(252,247,235,' + (0.95 * a) + ')'; c.beginPath(); c.moveTo(x + 4, y);
    var i, n = Math.max(3, Math.round(w / 14));
    for (i = 1; i <= n; i++) c.lineTo(x + 4 + (w - 8) * i / n, y + (i % 2 ? 1.2 : -0.3));
    c.lineTo(x + w, y + 4); c.lineTo(x + w - 1, y + h - 3);
    for (i = n; i >= 0; i--) c.lineTo(x + 4 + (w - 8) * i / n, y + h - (i % 2 ? 0.8 : 1.6));
    c.lineTo(x, y + h - 4); c.closePath(); c.fill(); c.restore();
  }

  // 返回 {cards, sp, hover}；app.mouse 是逻辑坐标。tipOf(id) 由 menu.js 给出一行小提示文字。
  P.draw = function (c, app, areaY, areaH, stacked, tipOf) {
    var W = app.lw, phone = (app.zoom || 1) < 0.75, o = build(W, areaY, areaH, stacked, phone), fs = o.figs, k, f;
    var hov = app.mouse ? pick(o, app.mouse.x, app.mouse.y) : null; P.hover = hov ? hov.id : null;
    var rt = app.rt || 0;
    monsters(c, o, app);
    c.drawImage(o.ground, 0, 0, o.ground.width, o.ground.height, 0, 0, o.W, o.ground.height / o.gq);
    function fig(f, back) {
      var im = img(f.id), t = hov === f ? 1 : 0; f.hv = (f.hv || 0) + (t - (f.hv || 0)) * 0.22;
      var bob = f.row === 0 ? 0 : Math.sin(rt * 1.3 + f.x * 0.01) * 1.0, sc = 1 + 0.035 * f.hv, ax = f.x + f.w / 2, ay = f.y + f.h * 0.92;
      if (!im) { return; }
      P.stats.fig++;
      c.save(); c.translate(ax, ay + bob); c.scale(sc, sc); c.translate(-ax, -ay);
      if (f.hv > 0.02) { var g = glow(f.id, im); c.globalAlpha = 0.85 * f.hv; c.drawImage(g.cv, f.x - g.pad * 2 * f.w / im.naturalWidth, f.y - g.pad * 2 * f.h / im.naturalHeight, f.w + g.pad * 4 * f.w / im.naturalWidth, f.h + g.pad * 4 * f.h / im.naturalHeight); }
      c.globalAlpha = (back ? 0.93 : 1) * (hov && hov !== f ? 0.9 : 1); c.drawImage(im, f.x, f.y, f.w, f.h); c.restore();
    }
    for (k = 0; k < fs.length; k++) if (fs[k].row === 0) fig(fs[k], true);
    // 前后排之间一条薄雾：后排下半身淡进纸色（只用浅色）
    if (o.mist) c.drawImage(o.mist, 0, 0, o.mist.width / o.gq, o.mist.height / o.gq);
    for (k = 0; k < fs.length; k++) if (fs[k].row !== 0) fig(fs[k], false);
    // 名字层
    for (k = 0; k < fs.length; k++) {
      f = fs[k]; var nim = img(f.nkey); if (!nim || f.nx == null) continue;
      var a = f.hv || 0; P.stats.name++;
      c.globalAlpha = Math.min(1, 0.9 + 0.1 * a);
      c.save(); c.shadowColor = 'rgba(250,243,226,0.95)'; c.shadowBlur = 6; c.drawImage(nim, f.nx, f.ny + a * 1.5, f.nw, f.nh); c.restore();
      if (a > 0.05) { c.globalAlpha = 0.5 * a; c.drawImage(nim, f.nx, f.ny + a * 1.5, f.nw, f.nh); }
    }
    c.globalAlpha = 1;
    // 悬停小纸签
    if (hov && tipOf) {
      var ts = tipOf(hov.id); if (ts) {
        c.font = 'bold 14px ' + KAI; var tw = c.measureText(ts).width + 28, th = 26, tx = Math.max(6, Math.min(W - tw - 6, W / 2 - tw / 2)), ty = o.feet - 30;
        plate(c, tx, ty, tw, th, Math.min(1, hov.hv * 1.4));
        c.globalAlpha = Math.min(1, hov.hv * 1.4); c.fillStyle = '#3a2f22'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ts, tx + tw / 2, ty + th / 2 + 0.5); c.globalAlpha = 1;
      }
    }
    var out = { cards: [], sp: [], hover: hov ? hov.id : null, smin: o.smin, groups: o.groups, feet: o.feet };
    fs.forEach(function (f) {
      var r = { id: f.id, x: f.x, y: f.y, w: f.w, h: f.h, row: f.row, art: !!img(f.id), name: f.nx == null ? null : { x: f.nx, y: f.ny, w: f.nw, h: f.nh }, ncost: f.ncost };
      (f.g === 'L' ? out.cards : out.sp).push(r);
    });
    return out;
  };
  P.ready = function () { return Object.keys(imgs).length > 0 && Object.keys(imgs).every(function (k) { return imgs[k].complete; }); };
  P.pick = function (mx, my) { return cache ? pick(cache, mx, my) : null; };
  P.reset = function () { cache = null; };
})();
