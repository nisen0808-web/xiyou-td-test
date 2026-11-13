/* ============================================================
 * menu_stage.js —— v0.8.0 主菜单「好莱坞海报」H4：唐僧中心焦点，取经五人景深（水墨立绘），
 * 九位特殊人物改用各自的 X 头像（圆形、暗金细环、毛笔小名），在人物脚下排成一道浅弧；巨型妖影压在最后。
 * 素材：js/menu_stage_data.js（五人立绘/毛笔名/朱印）、window.XY_X_AVATARS（dist 内联）或 assets/art/x-avatars/<id>.webp。
 * 2026-11 起不再是默认（默认是 menu_v5 的 V2 电影海报）；URL 带 ?menu=H4 才走本引擎，?menu=B 回 menu_poster（文件都保留）。
 * menu_stage_data.js 里只剩五人立绘；九位特殊角色的抠图已删（原文件备份在 /workspace/backup-menu-v2final/menu_stage_data.js）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, D = window.XY_MENU_STAGE, S = XY.stage = { layout: 'A', placed: [], sel: null, stats: { figs: 0, names: 0 } };
  S.setLayout = function (k) { S.layout = k === 'B' ? 'B' : 'A'; };
  var KAI = '"STKaiti","KaiTi","KaiTi_GB2312","楷体","Songti SC","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif', INK = '#2b1c08', PI2 = Math.PI * 2;
  var SH = 486, FOOT = 0.946, SHIFT = 46;   // 取经五人整体上抬 SHIFT（原 H3 底部给九张抠图，现在底部留给头像带）
  var imgs = {}, glows = {}, tints = {}, softs = {};
  function im(src) { var i = imgs[src]; if (!i) { i = imgs[src] = new Image(); i.onerror = function () { i.failed = true; }; i.src = src; } return i.complete && i.naturalWidth > 0 ? i : null; }
  function fig(id) { return D && D.fig[id]; }
  /* 立绘四边羽化：抠图原本是方形边缘，现在两侧没有别的人挡着，方边会露出来；左右各 11% / 上 4% / 下 7% 渐隐 */
  var feathers = {};
  function featherOf(id, img) {
    var f = feathers[id]; if (f) return f; var w = img.naturalWidth, h = img.naturalHeight;
    f = feathers[id] = document.createElement('canvas'); f.width = f.naturalWidth = w; f.height = f.naturalHeight = h; var x = f.getContext('2d'), g;
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'destination-in';
    g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.11, 'rgba(0,0,0,1)'); g.addColorStop(0.89, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.04, 'rgba(0,0,0,1)'); g.addColorStop(0.93, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    return f;
  }

  /* ---------- 好莱坞海报布局：中轴唐僧 → 前后景深；九人弧形溶进群像，不再两翼贴板 ---------- */
  function A() {
    var e = [
      /* 沙僧/白龙马外移放大并抬高 z，保证露脸；近景特殊再外移，不挡取经人 */
      { id: 'wujing', dx: -295, b: 442, h: 315, z: 34, k: 'h', back: 1, tier: 2, nm: [0.05, 0.14], cs: 22 },
      { id: 'horse',  dx:  295, b: 442, h: 315, z: 35, k: 'h', back: 1, tier: 2, nm: [0.74, -0.08], cs: 22 },
      { id: 'wukong', dx: -148, b: 455, h: 355, z: 44, k: 'h', tier: 1, nm: [0.03, 0.18], cs: 26 },
      { id: 'bajie',  dx:  148, b: 455, h: 355, z: 45, k: 'h', tier: 1, nm: [0.97, 0.18], cs: 26 },
      { id: 'tang',   dx:    0, b: 458, h: 400, z: 50, k: 'h', tier: 0, rim: 1, cs: 30, nm: [0.12, 0.08] }
    ];
    return { figs: e, mon: [
      /* 巨型妖影压后景：黑熊 / 白骨 / 精英(牛魔感) 叠成一堵压迫感 */
      { t: 'elite', dx: 0,   b: 440, h: 480, a: 0.16, col: '88,92,96', look: -1 },
      { t: 'bear',  dx: -150, b: 445, h: 460, a: 0.17, col: '90,94,98', look: 1 },
      { t: 'bone',  dx:  160, b: 445, h: 450, a: 0.16, col: '96,102,108', look: -1 },
      { t: 'etower', dx: -340, b: 300, h: 120, a: 0.14, col: '110,108,120' },
      { t: 'etower', dx:  340, b: 300, h: 120, a: 0.14, col: '110,108,120' }
    ] };
  }
  /* 旧 B 表保留但默认不用（?menu=B 走 menu_poster） */
  function B() { return A(); }

  var NM = { tang: [0.08, 0.30], wukong: [0.80, 0.58], bajie: [0.90, 0.40], wujing: [0.85, 0.10], horse: [0.12, 0.08], phyrex: [0.92, 0.45], heyuxi: [0.12, 0.15], haiteng: [0.90, 0.08],
    sisi: [0.10, 0.10], martin: [0.88, 0.10], diaoyulao: [0.10, 0.12], kuanggong: [0.88, 0.12], laosiji: [0.10, 0.15], yuanzhang: [0.08, 0.10] };
  var SEAL = { tang: 'tang', wukong: 'wukong', bajie: 'bajie', wujing: 'wujing', horse: 'horse' };

  function monFrame(t, i, col) {
    var d = XY.MINK_DATA && XY.MINK_DATA[t]; if (!d) return null; var img = im(d.src); if (!img) return null;
    var k = t + i + col, c = tints[k], f = d.fr[i]; if (c) return c;
    c = tints[k] = document.createElement('canvas'); c.width = f[2]; c.height = f[3]; var x = c.getContext('2d');
    x.drawImage(img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(' + col + ',0.78)'; x.fillRect(0, 0, f[2], f[3]); return c;
  }
  function drawMon(c, m, x, foot, k, rt) {
    var d = XY.MINK_DATA && XY.MINK_DATA[m.t]; if (!d) return; var fi = 0, f, cv, look = m.look || -1, xx = x;
    if (m.march) { var ph = m.march[3], span = m.march[1] - m.march[0], u = ((rt * m.march[2] + ph * 20) % (span * 2)); xx = m.march[0] + (u < span ? u : span * 2 - u); look = u < span ? -1 : 1; fi = 2 + (Math.floor(rt * 7 + ph) & 3); }
    f = d.fr[fi]; cv = monFrame(m.t, fi, m.col); if (!cv) return; var s = (m.h * k) / f[3];
    c.save(); c.globalAlpha = m.a; c.translate(xx, foot); c.scale(look * s, s); c.drawImage(cv, -f[4], -f[5]); c.restore();
  }

  function glowOf(id, img, col) {
    var key = id + (col || ''); var g = glows[key]; if (g) return g; var w = img.naturalWidth, h = img.naturalHeight, p = 16, i;
    var t = document.createElement('canvas'); t.width = w; t.height = h; var x = t.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col || 'rgb(240,140,60)'; x.fillRect(0, 0, w, h);
    g = glows[key] = document.createElement('canvas'); g.width = w + p * 2; g.height = h + p * 2; var o = g.getContext('2d');
    for (i = 0; i < 18; i++) { var a = i / 18 * PI2; o.drawImage(t, p + Math.cos(a) * 10, p + Math.sin(a) * 10); o.drawImage(t, p + Math.cos(a + 0.18) * 5, p + Math.sin(a + 0.18) * 5); }
    g.pad = p; return g;
  }
  /* 景深软化：后排用低分辨率缓冲再放大，模拟浅景深 */
  function softOf(id, img) {
    var g = softs[id]; if (g) return g;
    var sw = Math.max(48, Math.round(img.naturalWidth / 5)), sh = Math.max(64, Math.round(img.naturalHeight / 5));
    var s = document.createElement('canvas'); s.width = sw; s.height = sh; s.getContext('2d').drawImage(img, 0, 0, sw, sh);
    g = softs[id] = document.createElement('canvas'); g.width = img.naturalWidth; g.height = img.naturalHeight;
    var o = g.getContext('2d'); o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'low'; o.drawImage(s, 0, 0, g.width, g.height);
    return g;
  }

  /* ---------- 九位特殊人物：X 头像（圆形 + 暗金细环 + 毛笔小名），脚下一道浅弧 ---------- */
  /* 顺序（Claude 评审）：两张暗头像（老司机、腾EO）分在第 2 / 第 8 位，卡通靠近中间，真人照片在两端；Phyrex 居中 */
  var AV_IDS = ['sisi', 'laosiji', 'diaoyulao', 'kuanggong', 'phyrex', 'yuanzhang', 'martin', 'haiteng', 'heyuxi'], circs = {};
  /* 每人一组裁剪（只改裁剪窗口，不改原图）：cx/cy 是裁剪中心（0–1），z 是放大倍数；让脸占圆的一半以上 */
  var CROP = { phyrex: [0.5, 0.3, 1.8], sisi: [0.5, 0.4, 1.3], laosiji: [0.5, 0.55, 1], kuanggong: [0.5, 0.5, 1], haiteng: [0.5, 0.5, 1.2], yuanzhang: [0.5, 0.45, 1.1],
    heyuxi: [0.36, 0.4, 2], diaoyulao: [0.5, 0.55, 1.15], martin: [0.42, 0.5, 1.8] };
  function avSrc(id) { return 'assets/art/x-avatars/' + id + '.webp'; }
  function avImg(id) {
    var i = im(avSrc(id)), src2 = imgs[avSrc(id)];
    if (i) return i;
    /* 取不到 X 头像时，只对这一位回退到游戏里原来的头像 */
    if (src2 && src2.failed) { var fb = (window.XY_AVATAR_DATA && window.XY_AVATAR_DATA[id]) || 'assets/specials/' + id + '.jpg'; return im(fb); }
    return null;
  }
  /* 圆形缓存：[0] = 调色版（压饱和、抬黑场、边缘羽成宣纸色，九张统一），[1] = 原色（悬停 / 选中时用） */
  function circOf(id, raw) {
    var c0 = circs[id]; if (!c0) { var img = avImg(id); if (!img) return null; c0 = circs[id] = [mk(img, id, true), mk(img, id, false)]; }
    return raw ? c0[1] : c0[0];
  }
  function mk(img, id, tone) {
    var cv = document.createElement('canvas'), n = 192, cr = CROP[id] || [0.5, 0.5, 1]; cv.width = cv.height = n; var x = cv.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, PI2); x.closePath(); x.clip();
    var s0 = Math.min(img.naturalWidth, img.naturalHeight) / cr[2], sx = Math.max(0, Math.min(img.naturalWidth - s0, cr[0] * img.naturalWidth - s0 / 2)), sy = Math.max(0, Math.min(img.naturalHeight - s0, cr[1] * img.naturalHeight - s0 / 2));
    x.drawImage(img, sx, sy, s0, s0, 0, 0, n, n);
    if (tone) {
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      var g = x.createRadialGradient(n / 2, n / 2, n * 0.34, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(243,230,200,0)'); g.addColorStop(1, 'rgba(243,230,200,0.34)'); x.fillStyle = g; x.fillRect(0, 0, n, n);   // 宣纸羽化边
    }
    return cv;
  }
  /* 头像带几何：返回 { strip: 占用高度, cols, items:[{id, cx, cy, d, x, y, w, h, nm}] }；items 的 x/y/w/h 是外接方框（点选再按圆判断） */
  S.avLayout = function (area, k0, stacked) {
    var W = area.W, k = Math.max(0.6, Math.min(1.25, k0)), items = [], i, out = { strip: 0, cols: 9, items: items, k: k, names: true };
    function put(id, cx, cy, d) { items.push({ id: id, cx: cx, cy: cy, d: d, x: cx - d / 2, y: cy - d / 2, w: d, h: d, avatar: true }); }
    if (!stacked) {
      var d = 58 * k, dC = d * 1.16, rise = 14 * k, step = Math.min(102 * k, (W - 48) / 9), top = area.y + area.h - (dC + rise + 26 * k);
      out.strip = dC + rise + 26 * k; out.nameH = 15 * k;
      for (i = 0; i < 9; i++) { var t = (i - 4) / 4, di = i === 4 ? dC : d; put(AV_IDS[i], W / 2 + (i - 4) * step, top + dC / 2 + rise * t * t, di); items[i].step = step; }
    } else if (W > area.h * 1.3 && W > 560) {      // 手机横屏：单排 9 个小头像，名字只在悬停时出
      var d1 = Math.max(24, Math.min(40, (W - 24) / 9 * 0.78)), st1 = Math.min(d1 * 1.34, (W - 24) / 9); out.strip = d1 + 12; out.names = false; out.nameH = 0;
      for (i = 0; i < 9; i++) { put(AV_IDS[i], W / 2 + (i - 4) * st1, area.y + area.h - out.strip + 6 + d1 / 2, d1); items[i].step = st1; }
    } else {                                          // 竖屏：3 x 3，每行轻微错位，不成表格
      var d3 = Math.max(40, Math.min(120, W / 3 * 0.52)), nh = d3 * 0.27, rowH = d3 + nh + d3 * 0.2, st3 = Math.min(W / 3, d3 * 1.9); out.cols = 3; out.strip = rowH * 3 + 4; out.nameH = nh; out.k = d3 / 54;
      for (i = 0; i < 9; i++) { var r = Math.floor(i / 3), cc = i % 3; put(AV_IDS[[0, 1, 2, 3, 4, 5, 6, 7, 8][i]], W / 2 + (cc - 1) * st3, area.y + area.h - out.strip + 2 + r * rowH + d3 / 2 , d3); items[i].step = st3; }
    }
    return out;
  };
  S.avPick = function (x, y) {
    var it = S.avItems || [], i, q; for (i = it.length - 1; i >= 0; i--) { q = it[i]; var r = Math.max(q.d / 2 * 1.08, 22), dx = x - q.cx, dy = y - q.cy; if (dx * dx + dy * dy <= r * r) return q; }
    return null;
  };
  function drawAvatars(c, av, foc, rt, k, selId) {
    var its = av.items, n = its.length, i;
    /* 挂珠细线：只画在相邻头像之间（圆边到圆边），每段中点一颗小金珠 */
    if (av.cols === 9) {
      c.save(); c.strokeStyle = 'rgba(160,126,56,0.4)'; c.lineWidth = 0.9; c.fillStyle = 'rgba(201,162,74,0.85)';
      for (i = 0; i < n - 1; i++) {
        var a = its[i], b = its[i + 1], dx = b.cx - a.cx, dy = b.cy - a.cy, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L, r0 = a.d / 2 + 6 * k, r1 = b.d / 2 + 6 * k;
        if (L <= r0 + r1 + 4) continue;
        c.beginPath(); c.moveTo(a.cx + ux * r0, a.cy + uy * r0); c.lineTo(b.cx - ux * r1, b.cy - uy * r1); c.stroke();
        c.beginPath(); c.arc((a.cx + b.cx) / 2, (a.cy + b.cy) / 2, 1.5 * k + 0.4, 0, PI2); c.fill();
      }
      c.restore();
    }
    its.forEach(function (it) {
      var hov = foc && foc.id === it.id, sel = selId === it.id, on = hov || sel, r = it.d / 2 * (hov ? 1.1 : 1), x = it.cx, y = it.cy - (hov ? 3 : 0), cv = circOf(it.id, true), g;
      it.hov = !!hov;
      g = c.createRadialGradient(x, y, r * 0.9, x, y, r * 1.75); g.addColorStop(0, on ? 'rgba(255,226,150,0.9)' : 'rgba(255,248,226,0.9)'); g.addColorStop(1, 'rgba(255,248,226,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.75, 0, PI2); c.fill();
      c.save(); c.shadowColor = on ? 'rgba(60,40,20,0.3)' : 'rgba(70,48,12,0.26)'; c.shadowBlur = (on ? 8 : 8) * k; c.shadowOffsetY = (on ? 3 : 2) * k; c.fillStyle = '#f4e9cf';
      c.beginPath(); c.arc(x, y, r + 1.2, 0, PI2); c.fill(); c.restore();
      c.save(); if (cv) { c.imageSmoothingQuality = 'high'; c.drawImage(cv, x - r, y - r, r * 2, r * 2); } else { c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill(); } c.restore();
      c.lineWidth = (sel ? 2.6 : 1.7) * Math.max(0.85, k); c.strokeStyle = on ? '#e2bc5c' : '#c9a24a'; c.beginPath(); c.arc(x, y, r + 1 * k, 0, PI2); c.stroke();
      c.lineWidth = 0.75; c.strokeStyle = 'rgba(43,28,8,0.38)'; c.beginPath(); c.arc(x, y, r - 0.4, 0, PI2); c.stroke();
      var nm = D.name[it.id], nimg;
      if (nm && nm.h && (av.names || on) && (nimg = im(nm.h.src))) {
        var nh = (av.nameH || 15 * k) * (hov ? 1.06 : 1), sc2 = nh / 54, w = nm.h.w * sc2, hh = nm.h.h * sc2, cap = (it.step || 96) - 6;
        if (w > cap) { hh *= cap / w; w = cap; }
        var nx = x - w / 2, ny = y + r + 5 * k + (hov ? 2 : 0);
        c.save(); c.globalAlpha = on ? 1 : 0.9; c.shadowColor = on ? 'rgba(255,214,140,0.95)' : 'rgba(250,243,226,0.95)'; c.shadowBlur = 6; c.drawImage(nimg, nx, ny, w, hh); c.shadowBlur = 0; c.globalAlpha = on ? 1 : 0.6; c.drawImage(nimg, nx, ny, w, hh); c.restore(); S.stats.names++;
        if (sel) { c.fillStyle = '#c8341f'; c.fillRect(x - Math.max(6, w * 0.22), ny + hh + 2, Math.max(12, w * 0.44), 2); }
      }
      S.stats.figs++;
    });
  }

  S.pick = function (x, y) {
    var av = S.avPick(x, y); if (av) return av;
    var pass, i, p, u, v, ch, pl = S.placed;
    for (pass = 2; pass >= 1; pass--) for (i = pl.length - 1; i >= 0; i--) {
      p = pl[i]; if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) continue;
      u = Math.floor((x - p.x) / p.w * 36); v = Math.floor((y - p.y) / p.h * 48); ch = p.mask.charAt(v * 36 + u);
      if (ch >= String(pass)) return p;
    }
    return null;
  };

  S.draw = function (c, app, area, tipOf) {
    var W = area.W, rt = app.rt, cx = W / 2, stacked = area.stacked, k0 = Math.max(0.55, Math.min(1.25, area.h / SH)), phone = (app.zoom || 1) < 0.72;
    var av = S.avLayout(area, k0, stacked), ah = stacked ? area.h : area.h - av.strip, sc = stacked ? k0 : Math.max(0.5, Math.min(1.25, ah / (SH - SHIFT)));
    var lay = stacked ? S.stackLayout(area, av) : A(), ex = (W - 1280) / 2, y0 = area.y;
    var list = [], byId = {}; S.avItems = av.items;
    lay.figs.forEach(function (e) {
      var f = fig(e.id); if (!f) return; var h = e.h * (e.sc || sc), w = h * 0.75, x, top;
      if (stacked) { x = e.x; top = e.y; } else {
        /* 群像随屏宽轻微外扩；外缘人物夹紧，避免宽屏裁切 */
        x = cx + e.dx * sc + (e.dx < 0 ? -1 : e.dx > 0 ? 1 : 0) * ex * 0.35 - w / 2;
        x = Math.max(4, Math.min(W - w - 4, x));
        top = y0 + (e.b - SHIFT) * sc - FOOT * h + Math.max(0, ah - (SH - SHIFT) * sc);
      }
      var p = { id: e.id, x: x, y: top, w: w, h: h, z: e.z, k: e.k, e: e, mask: f.mask, f: f, front: !e.back, n: e.n !== false, tier: e.tier == null ? (e.back ? 2 : 1) : e.tier, rim: !!e.rim };
      list.push(p); byId[e.id] = p;
    });
    list.sort(function (a, b) { return a.z - b.z; }); S.placed = list.slice();
    var m = app.mouse, hp = m ? S.pick(m.x, m.y) : null, sel = S.sel && rt < S.sel.until ? byId[S.sel.id] : null, foc = hp || sel || (S.sel && rt < S.sel.until ? av.items.filter(function (q) { return q.id === S.sel.id; })[0] : null);
    S.hover = hp ? hp.id : null;

    /* 体积光：唐僧背后一盏暖色光晕（浅色电影感，不是暗场） */
    if (!stacked) {
      var tg = byId.tang;
      if (tg) {
        var lx = tg.x + tg.w * 0.5, ly = tg.y + tg.h * 0.35, R = Math.max(tg.w, tg.h) * 1.15;
        var rg = c.createRadialGradient(lx, ly, R * 0.08, lx, ly, R);
        rg.addColorStop(0, 'rgba(255,230,170,0.42)'); rg.addColorStop(0.35, 'rgba(255,236,200,0.18)'); rg.addColorStop(1, 'rgba(255,244,220,0)');
        c.fillStyle = rg; c.fillRect(lx - R, ly - R, R * 2, R * 2);
      }
      /* 上缘淡雾 + 中段体积雾 */
      S.haze(c, W, y0, ah);
    }

    if (lay.mon) lay.mon.forEach(function (mm) {
      if (stacked && mm.march) return; if (phone && mm.march && mm.t !== 'small') return;
      var x = cx + mm.dx * sc, foot = y0 + (mm.b - SHIFT) * sc + Math.max(0, ah - (SH - SHIFT) * sc);
      if (stacked) { x = W / 2 + mm.dx * 0.5; foot = y0 + area.h * 0.42 + mm.h * 0.2; }
      var q = { t: mm.t, a: mm.a * (stacked ? 0.7 : 1), col: mm.col, look: mm.look, h: mm.h, march: mm.march && [cx + mm.march[0] * sc, cx + mm.march[1] * sc, mm.march[2], mm.march[3]] };
      drawMon(c, q, x, foot, sc, rt);
    });

    /* 妖影与人物之间再铺一层薄雾 */
    if (!stacked) S.mist(c, W, y0, ah, sc, false);

    list.forEach(function (p) {
      var img = im(p.f.src); if (!img) return; img = featherOf(p.id, img);
      var hov = foc && foc.id === p.id, tier = p.tier, baseA = tier >= 3 ? 0.72 : tier === 2 ? 0.88 : 1;
      var dim = (foc && !hov ? 0.86 : 1) * baseA, lift = hov ? 6 : 0, z = hov ? 1.05 : 1, bx = p.x + p.w / 2, by = p.y + p.h * FOOT;
      if (p.front || tier <= 1) { c.save(); c.globalAlpha = 0.14 * (tier <= 1 ? 1 : 0.6); c.fillStyle = '#4a3a22'; c.beginPath(); c.ellipse(bx, by - 2, p.w * 0.28, Math.max(4, p.h * 0.022), 0, 0, PI2); c.fill(); c.restore(); }
      c.save(); c.translate(bx, by - lift); c.scale(z, z); c.translate(-bx, -by);
      /* 轮廓光 / 逆光：主角与前排暖金描边 */
      if (p.rim || (p.k === 'h' && tier <= 1)) {
        var rim = glowOf(p.id, img, p.rim ? 'rgb(255,214,130)' : 'rgb(255,205,150)');
        /* 轮廓光贴着人，不要整块圆角黄框 */
        c.globalAlpha = p.rim ? 0.38 : 0.22;
        c.drawImage(rim, p.x - rim.pad * 0.55 * p.w / img.naturalWidth, p.y - rim.pad * 0.55 * p.h / img.naturalHeight, rim.width * p.w / img.naturalWidth * 0.92, rim.height * p.h / img.naturalHeight * 0.92);
      }
      if (hov) {
        var g = glowOf(p.id + '_hov', img, 'rgb(240,140,60)');
        c.globalAlpha = 0.5; c.drawImage(g, p.x - g.pad * p.w / img.naturalWidth, p.y - g.pad * p.h / img.naturalHeight, g.width * p.w / img.naturalWidth, g.height * p.h / img.naturalHeight);
      }
      c.globalAlpha = dim; c.imageSmoothingQuality = 'high';
      var src = (tier >= 3 && !hov) ? softOf(p.id, img) : ((tier === 2 && !hov) ? softOf(p.id, img) : img);
      if (tier === 2 && !hov) {
        /* 中景：半软 —— 原图与软图各半 */
        c.globalAlpha = dim * 0.45; c.drawImage(softOf(p.id, img), p.x, p.y, p.w, p.h);
        c.globalAlpha = dim; c.drawImage(img, p.x, p.y, p.w, p.h);
      } else {
        c.drawImage(src, p.x, p.y, p.w, p.h);
      }
      c.restore();
      S.stats.figs++; p.lift = lift; p.z1 = z;
    });

    drawAvatars(c, av, foc, rt, av.k, S.sel && rt < S.sel.until ? S.sel.id : null);

    var cs0 = (phone ? 1.4 : 1) * sc;
    list.forEach(function (p) {
      var nm = D.name[p.id], nz = p.e.nm || NM[p.id], hov = foc && foc.id === p.id; if (!nm || !nz) return;
      if (!p.n && !hov) return; if ((stacked || phone) && !p.front && p.tier >= 3 && !hov) return;
      var v = nm.v, cs = (p.e.cs || (p.k === 'h' ? 25 : 17)) * cs0 * (p.tier >= 3 ? 0.78 : p.tier === 2 ? 0.9 : 1), s = cs / 56, nimg = im(v.src); if (!nimg) return;
      var w = v.w * s, h = v.h * s, x = p.x + nz[0] * p.w - w / 2, y = p.y + nz[1] * p.h + (hov ? 2 : 0);
      x = Math.max(2, Math.min(W - w - 2, x));
      c.save(); c.globalAlpha = hov ? 1 : (p.tier >= 3 ? 0.7 : p.front ? 0.92 : 0.82); c.shadowColor = hov ? 'rgba(255,214,140,0.95)' : 'rgba(250,243,226,0.95)'; c.shadowBlur = hov ? 9 : 7;
      c.drawImage(nimg, x, y, w, h); c.shadowBlur = 0; c.globalAlpha = hov ? 1 : 0.55; c.drawImage(nimg, x, y, w, h); c.restore(); S.stats.names++;
      var sk = SEAL[p.id] || 'generic', simg = sk && D.seal[sk] && im(D.seal[sk].src);
      if (simg && (p.k === 'h' || p.tier <= 2 || hov)) { var ss = Math.max(11, cs * 0.72) * (hov ? 1.12 : 1); c.save(); c.globalAlpha = hov ? 1 : (p.k === 'h' ? 0.9 : 0.75); c.drawImage(simg, x + w / 2 - ss / 2, y + h + 3, ss, ss); c.restore(); }
    });
    if (foc && tipOf) S.tip(c, app, foc, W, y0, phone ? 1.4 : 1, tipOf(foc.id));
    return { figs: list, av: av.items };
  };

  S.haze = function (c, W, y0, h) {
    var g = c.createLinearGradient(0, y0, 0, y0 + h * 0.45);
    g.addColorStop(0, 'rgba(255,248,230,0.55)'); g.addColorStop(0.5, 'rgba(255,244,220,0.18)'); g.addColorStop(1, 'rgba(255,244,220,0)');
    c.fillStyle = g; c.fillRect(0, y0, W, h * 0.45);
  };
  S.mist = function (c, W, y0, h, sc, stacked) {
    var t = y0 + h * (stacked ? 0.28 : 0.32), b = y0 + h * (stacked ? 0.58 : 0.62), g = c.createLinearGradient(0, t, 0, b);
    g.addColorStop(0, 'rgba(247,239,226,0)'); g.addColorStop(0.45, 'rgba(247,239,226,0.28)'); g.addColorStop(1, 'rgba(247,239,226,0)');
    c.fillStyle = g; c.fillRect(0, t, W, b - t);
  };
  S.tip = function (c, app, p, W, y0, k, s) {
    if (!s) return; c.save(); c.font = 'bold ' + Math.round(13 * k) + 'px ' + KAI; var tw = c.measureText(s).width + 26 * k, th = 25 * k;
    var mid = p.x + p.w / 2, x, y;
    /* 纸签贴着被悬停的人：优先头顶；顶上不够就落在人上半身外侧 */
    y = p.y - th - 6;
    if (y < y0 + 2) y = Math.max(y0 + 2, Math.min(p.y + Math.max(12, p.h * 0.08), p.y + 36));
    x = mid - tw / 2;
    if (x < 6) x = Math.min(W - tw - 6, p.x + p.w * 0.6);
    if (x + tw > W - 6) x = Math.max(6, p.x + p.w * 0.4 - tw);
    x = Math.max(6, Math.min(W - tw - 6, x));
    c.shadowColor = 'rgba(60,40,10,0.28)'; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = 'rgba(251,246,236,0.96)';
    c.beginPath(); c.moveTo(x + 4, y + 2); c.lineTo(x + tw * 0.3, y); c.lineTo(x + tw * 0.62, y + 2); c.lineTo(x + tw - 3, y); c.lineTo(x + tw, y + th * 0.5); c.lineTo(x + tw - 2, y + th); c.lineTo(x + tw * 0.55, y + th - 2); c.lineTo(x + tw * 0.2, y + th); c.lineTo(x, y + th * 0.55); c.closePath(); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#c8341f'; c.fillRect(x + 6, y + th * 0.3, 3 * k, th * 0.4);
    c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, x + 15 * k, y + th / 2 + 1); c.restore();
  };

  S.stackLayout = function (area, av) {
    var W = area.W, one = av.cols === 9, hh = Math.max(60, area.h - av.strip - 6), figs = [], sc = 1, tot, h, wc, rows;
    rows = one ? [['wujing', 'wukong', 'tang', 'bajie', 'horse']] : [['wujing', 'horse'], ['wukong', 'tang', 'bajie']];
    wc = one ? W / 5.6 : W / 3.0; h = wc * 1.25 / 0.75 * 0.85; tot = h + (rows.length - 1) * h * 0.5;
    if (tot > hh) sc = hh / tot; var y = area.y + Math.max(0, (hh - tot * sc) / 2);
    var hs = h * sc, rowW = [];
    rows.forEach(function (row, ri) {
      var rw = row.length * wc * sc, x0 = W / 2 - rw / 2, bottom = y + ri * hs * 0.5 + hs;
      row.forEach(function (id, ci) {
        var mul = id === 'tang' ? 1.14 : 1, fh = hs * mul, fw = fh * 0.75;
        figs.push({ id: id, x: Math.max(3, Math.min(W - fw - 3, x0 + ci * wc * sc + wc * sc / 2 - fw / 2)), y: bottom - fh, sc: 1, h: fh, z: 1 + ri * 10 + (id === 'tang' ? 8 : ci), k: 'h', back: id === 'wujing' || id === 'horse', tier: (id === 'wujing' || id === 'horse') ? 2 : 1, n: true, cs: 20, rim: id === 'tang' });
      });
    });
    figs.forEach(function (f) { f.e = f; });
    return { figs: figs, mon: [{ t: 'bear', dx: -40, b: 0, h: 220, a: 0.1, col: '90,94,98', look: 1 }, { t: 'bone', dx: 60, b: 0, h: 200, a: 0.1, col: '96,102,108', look: -1 }] };
  };

  XY.menuStage = { draw: function (c, app, areaY, areaH, stacked, tipOf) {
    var res = S.draw(c, app, { W: app.lw, y: areaY, h: areaH, stacked: stacked }, tipOf), out = { cards: [], sp: [], hover: S.hover, layout: 'A', stage: true };
    res.figs.forEach(function (p) {
      var g = { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, art: true, z: p.z, img: { x: p.x, y: p.y, w: p.w, h: p.h }, tier: p.tier }; g.ih = g.h;
      out.cards.push(g);
      XY.ui.hits.push({ x: p.x, y: p.y, w: p.w, h: p.h, act: 'menuChar', id: p.id, test: function (pt) { var q = S.pick(pt.x, pt.y); return !!q && q.id === p.id; } });
    });
    /* 九位特殊人物 = X 头像（圆）；avatar:true，art:false */
    res.av.forEach(function (it) {
      out.sp.push({ id: it.id, x: it.x, y: it.y, w: it.w, h: it.h, art: false, avatar: true, cx: it.cx, cy: it.cy, d: it.d, z: 60 });
      XY.ui.hits.push({ x: it.x, y: it.y, w: it.w, h: it.h, act: 'menuChar', id: it.id, test: function (pt) { var q = S.avPick(pt.x, pt.y); return !!q && q.id === it.id; } });
    });
    return out;
  }, pick: function (x, y) { return S.pick(x, y); } };
})();
