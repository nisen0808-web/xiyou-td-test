/* ============================================================
 * anim.js —— v0.5 第 4 批：动画层（带 LOD 分级）
 *
 * 所有动画都是 G.fx 里 type:'an' 的条目（update 沿用 game.js 里 fx 的计时），世界里的部分由 render.js 的 drawFx 调 XY.animDraw 画，
 * 全屏的部分（满屏协同秀 / 升级闪光 / BOSS 登场横条 / 骑乘速度线）由 XY.animScreen 在 HUD 之上画。
 *
 * 种类：hit 命中劈痕 · ripple 清屏涟漪 · levelup 升级光柱 · maxlv 满级星爆 · xform 变身冲击波 · pillar 天兵降临光柱
 *       dust 骑乘尘土 · pickup 拾取汇入 · bossin BOSS 登场 · syn 协同技全屏秀 · flash 全屏闪光；另有：拾取飞入拖尾（XY.animItems）、
 *       英雄 / 小怪的待机呼吸 / 走路挤压（XY.animSquash）、骑乘速度线（G.animSpeed）。
 *
 * LOD：XY.anim.lod(G) = 0 完整 / 1 精简 / 2 只留关键。可见怪 > 120（render 里的 G._lod）→ 2；全图怪 > 70 → 1（可见怪 > 60 也算 1）；
 *   每种动画有 3 档并发上限 CAPS[kind] = [LOD0, LOD1, LOD2]（0 = 这一档不画），非关键动画还受总量上限 TOTAL。
 *   关键动画（升级 / 满级 / 变身 / BOSS 登场 / 协同秀 / 闪光）在任何档位都会出现，但 LOD2 时会简化（不画渐变、少画星星）。
 * 统计：G.stats.anim[kind]（出现次数）、G.stats.animDrop[kind]（因 LOD / 上限被丢掉的次数）—— e2e / perf 用它们验证 LOD。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  var A = XY.anim = {};
  var CAPS = { hit: [16, 6, 0], ripple: [9, 6, 3], pillar: [12, 8, 4], dust: [24, 10, 0], pickup: [10, 5, 0], levelup: [3, 3, 3], maxlv: [2, 2, 2], xform: [3, 3, 3], bossin: [1, 1, 1], syn: [1, 1, 1], flash: [2, 2, 2] };
  var ESSENTIAL = { levelup: 1, maxlv: 1, xform: 1, bossin: 1, syn: 1, flash: 1 };
  var TOTAL = [40, 20, 8];
  A.CAPS = CAPS; A.TOTAL = TOTAL;

  A.lod = function (G) {
    if (G._animLod != null) return G._animLod;                      // 测试 / perf 可以强制档位
    return G._lod ? 2 : ((G.enemies.length > 70 || G._visN > 60) ? 1 : 0);
  };
  function stat(G, k, kind) { var s = G.stats[k] || (G.stats[k] = {}); s[kind] = (s[kind] || 0) + 1; }
  function add(G, kind, x, y, o) {
    var lod = A.lod(G), cap = CAPS[kind][lod], n = 0, tot = 0, i, f;
    if (!cap) { stat(G, 'animDrop', kind); return null; }
    for (i = 0; i < G.fx.length; i++) { f = G.fx[i]; if (f.type === 'an') { if (!ESSENTIAL[f.kind]) tot++; if (f.kind === kind) n++; } }
    if (n >= cap || (!ESSENTIAL[kind] && tot >= TOTAL[lod])) { stat(G, 'animDrop', kind); return null; }
    f = { type: 'an', kind: kind, x: x, y: y, t: 0, max: 0.6, lod: lod }; for (var k in o) f[k] = o[k];
    G.fx.push(f); stat(G, 'anim', kind); return f;
  }
  A.add = add;
  A.count = function (G, kind) { var n = 0; for (var i = 0; i < G.fx.length; i++) if (G.fx[i].type === 'an' && (!kind || G.fx[i].kind === kind)) n++; return n; };

  /* ---------- 触发点（game.js / abilities.js / phyrex.js / ride.js / syn.js 调用）---------- */
  A.hit = function (G, e, crit) {                                        // 命中：十字劈痕（同一个怪 0.12 秒内最多一次）
    if (G.t < (e.anT || 0) && !crit) return; e.anT = G.t + 0.12;
    if (A.lod(G) >= 1 && !crit) return;                                  // 精简档只给暴击
    add(G, 'hit', e.x + (Math.random() - 0.5) * e.r, e.y - e.r * 0.2 + (Math.random() - 0.5) * e.r * 0.6, { max: crit ? 0.26 : 0.17, crit: !!crit, ang: Math.random() * 3.14 - 1.57, color: e.def.boss || e.def.elite ? '#fff3c4' : '#ffffff', big: e.r });
  };
  // v0.7：冲击波不画圆——锯齿星形（尖角向外）
  function star(c, x, y, r, n, inner, rot) { c.beginPath(); for (var i = 0; i < n * 2; i++) { var a = rot + i / (n * 2) * PI2, rr = i % 2 ? r * inner : r; if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
  A.ripple = function (G, x, y, color) {                                 // 清屏：三圈错开的涟漪，大到盖满视口
    var R = Math.max(G.view ? G.view.w : 1280, 900) * 0.62;
    for (var i = 0; i < 3; i++) add(G, 'ripple', x, y, { max: 0.9 + i * 0.12, d: i * 0.14, R: R * (0.7 + i * 0.15), color: color || '#ffd24a' });
  };
  A.levelUp = function (G) {
    var h = G.heroes[G.ctrl] && !G.heroes[G.ctrl].down ? G.heroes[G.ctrl] : G.heroes[0];
    add(G, 'levelup', h.x, h.y, { max: 1.1, h: h });
    add(G, 'flash', 0, 0, { max: 0.35, scr: true, color: '42,32,22', a: 0.16 });
  };
  A.maxLevel = function (G, h) {
    h = h || G.heroes[G.ctrl] || G.heroes[0];
    add(G, 'maxlv', h.x, h.y, { max: 1.8, h: h });
    add(G, 'flash', 0, 0, { max: 0.6, scr: true, color: '255,225,120', a: 0.45 });
    G.shake = Math.max(G.shake || 0, 7);
  };
  A.xform = function (G, h) {
    add(G, 'xform', h.x, h.y, { max: 1.5, h: h });
    add(G, 'flash', 0, 0, { max: 0.5, scr: true, color: '255,246,210', a: 0.55 });
  };
  A.sky = function (G, x, y, i) { add(G, 'pillar', x, y, { max: 0.9 + (i || 0) * 0.05, d: (i || 0) * 0.06 }); };
  A.rideFx = function (G, rider) {                                       // 每帧：骑乘移动时脚下扬尘 + 全屏速度线
    var mv = rider.moving && !rider.down;
    if (G.heroes[G.ctrl] === rider) G.animSpeed = mv ? Math.min(1, (G.animSpeed || 0) + 0.08) : Math.max(0, (G.animSpeed || 0) - 0.1);
    if (!mv || G.t < (rider.dustT || 0)) return;
    rider.dustT = G.t + 0.07;
    var bx = -(rider.face || 1) * 14;
    add(G, 'dust', rider.x + bx + (Math.random() - 0.5) * 8, rider.y + rider.def.r * 0.8, { max: 0.5, r: 7 + Math.random() * 6, dir: -(rider.face || 1) });
  };
  A.pickup = function (G, h) {                                            // 拾取：汇入英雄的小光圈（同 0.08 秒 1 个）
    if (G.t < (G._pkT || 0)) return; G._pkT = G.t + 0.08;
    add(G, 'pickup', h.x, h.y, { max: 0.35, h: h });
  };
  A.bossIn = function (G, e) {
    if (add(G, 'bossin', e.x, e.y, { max: 2.0, scr: true, name: e.def.name, color: e.def.color, e: e })) A.ripple(G, e.x, e.y, e.def.color);      // 上一次登场横条还没演完就不重复演
  };
  A.synShow = function (G, S, level) {
    G._synShown = G._synShown || {};
    if (G.t - (G._synShown[S.id] || -99) < 25) return;                  // 同一条协同 25 秒内只秀一次
    if (A.count(G, 'syn')) return;
    G._synShown[S.id] = G.t;
    add(G, 'syn', 0, 0, { max: 1.7, scr: true, name: S.fullName, color: S.color || '#c0489a', lv: level || 1 });
    G.stats.synShows = (G.stats.synShows || 0) + 1;
  };

  /* ---------- 待机呼吸 / 走路挤压（以脚底为轴），返回 [sx, sy] ---------- */
  A.squash = function (moving, rt, phase) {
    if (moving) { var s = sin(rt * 15 + phase); return [1 - 0.045 * s, 1 + 0.06 * s]; }
    var b = sin(rt * 2.4 + phase); return [1 - 0.012 * b, 1 + 0.028 * b];
  };

  /* ---------- 世界里的绘制 ---------- */
  function starFill(c, x, y, r, rot) { c.beginPath(); for (var i = 0; i < 8; i++) { var a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.42 : r; c.lineTo(x + cos(a) * rr, y + sin(a) * rr); } c.closePath(); c.fill(); }
  XY.animDraw = function (c, f, k, G) {
    if (f.type !== 'an' || f.scr) return false;
    var x = f.h ? f.h.x : f.x, y = f.h ? f.h.y : f.y, t = f.t, a;
    switch (f.kind) {
      case 'hit': {                                                                       // v0.8：命中 = 交叉的两笔浓墨（点缀色洇边）；暴击再甩一圈金墨
        a = 1 - k; var IPh = XY.INKP, hac = IPh.mix(IPh.rgb(f.color), 0.14), hs = ((f.x * 3 + f.y * 7) | 0) & 1023;
        var L = (f.crit ? 20 : 11) + 10 * (1 - a), lw = f.crit ? 4.4 : 2.8, s1 = f.ang;
        IPh.cstroke(c, x + cos(s1) * L, y + sin(s1) * L, x - cos(s1) * L, y - sin(s1) * L, lw * 1.4, hac, a, hs, 0.1);
        IPh.stroke(c, x + cos(s1 + 1.57) * L * 0.6, y + sin(s1 + 1.57) * L * 0.6, x - cos(s1 + 1.57) * L * 0.6, y - sin(s1 + 1.57) * L * 0.6, lw, IPh.INK, a * 0.8, hs + 4, 0.1);
        if (f.crit) IPh.splash(c, x, y, 6 + 6 * k, 16 + 22 * k, 7, 3.4 * a + 1, hac, a, hs + 9, 1);
        c.globalAlpha = 1; break; }
      case 'ripple': {
        if (t < f.d) break; var kk = (t - f.d) / (f.max - f.d); if (kk >= 1) break;
        var IPr = XY.INKP, rac = IPr.mix(IPr.rgb(f.color), 0.14), rs = ((f.x * 3 + f.y * 7) | 0) & 1023, rR = f.R * (0.1 + 0.9 * Math.min(1, kk * 1.2));
        IPr.ring(c, f.x, f.y, rR, 6 * (1 - kk) + 1.6, rac, (1 - kk) * 0.6, rs, 5, 1, kk * 0.8);
        IPr.ring(c, f.x, f.y, rR, 2 * (1 - kk) + 0.8, IPr.INK, (1 - kk) * 0.7, rs + 4, 4, 1, kk * 0.8 + 0.5);
        IPr.dots(c, f.x, f.y, rR * 0.7, rR * 1.15, 5, 1, 2.4, IPr.INK, (1 - kk) * 0.6, rs + 8, 1);
        c.globalAlpha = 1; break; }
      case 'levelup': {
        if (G && G.td && G.td.quiet > G.td.clock) { c.strokeStyle = 'rgba(90,70,40,0.45)'; c.lineWidth = 1.3; c.beginPath(); c.arc(x, y - 60, 22 + 10 * k, 0.8, 5.2); c.stroke(); break; }
        var up = Math.min(1, k * 2.2), fade = k < 0.6 ? 1 : (1 - (k - 0.6) / 0.4), H = 230 * up, w = 34 * (1 - 0.4 * k);
        if (f.lod < 2) { var g = c.createLinearGradient(0, y - H, 0, y + 16); g.addColorStop(0, 'rgba(168,50,36,0)'); g.addColorStop(1, 'rgba(90,28,22,' + 0.55 * fade + ')'); c.fillStyle = g; c.fillRect(x - w / 2, y - H, w, H + 16); }
        else { c.globalAlpha = 0.5 * fade; c.fillStyle = '#6e211b'; c.fillRect(x - w / 3, y - H, w * 0.66, H + 16); c.globalAlpha = 1; }
        c.globalAlpha = fade * 0.85; c.strokeStyle = '#6e211b'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y + 14, 30 + 36 * k, 11 + 13 * k, 0, 0, PI2); c.stroke();
        c.fillStyle = '#a42d19'; for (var i = 0; i < (f.lod < 2 ? 6 : 3); i++) { var yy = y + 10 - ((t * 120 + i * 47) % 150), xx = x + sin(i * 2.1 + t * 3) * 22; starFill(c, xx, yy, 5 - 2 * k, i + t * 4); }
        c.globalAlpha = fade; otxt(c, '升级！', x, y - 66 - 40 * up, 20, '#a42d19', 'center', true); c.globalAlpha = 1; break; }
      case 'maxlv': {
        if (G && G.td && G.td.quiet > G.td.clock) { c.strokeStyle = 'rgba(42,32,22,0.55)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y - 78, 28 + 16 * k, 0.5, 5.4); c.stroke(); break; }
        var fa = k < 0.7 ? 1 : (1 - (k - 0.7) / 0.3); c.globalAlpha = fa;
        c.strokeStyle = '#ffcf33'; c.lineWidth = 6 * (1 - k) + 2; star(c, x, y, 30 + 160 * Math.min(1, k * 1.4), 10, 0.78, k * 2); c.stroke();
        c.lineWidth = 3; star(c, x, y, 18 + 100 * Math.min(1, k * 1.2), 8, 0.7, -k * 2); c.stroke();
        c.fillStyle = 'rgba(255,224,110,0.8)'; var nR = f.lod < 2 ? 12 : 6; for (var j = 0; j < nR; j++) { var aa = j / nR * PI2 + t * 1.5, rr = 40 + 150 * Math.min(1, k * 1.3); starFill(c, x + cos(aa) * rr, y + sin(aa) * rr, 9 * (1 - k * 0.5), aa); }
        otxt(c, '满级！', x, y - 70 - 30 * Math.min(1, k * 2), 30, '#d98a00', 'center', true); c.globalAlpha = 1; break; }
      case 'xform': {
        var fx2 = 1 - k; c.globalAlpha = fx2 * 0.9;
        for (var r2 = 0; r2 < (f.lod < 2 ? 3 : 1); r2++) { var kr = Math.max(0, Math.min(1, k * 1.5 - r2 * 0.18)); c.strokeStyle = r2 % 2 ? '#fff3b0' : '#f0b429'; c.lineWidth = 8 * (1 - kr) + 2; star(c, x, y, 40 + 280 * kr, 12, 0.85, r2 * 0.4 + kr); c.stroke(); }
        c.strokeStyle = '#ffe9a0'; c.lineWidth = 4; c.lineCap = 'round'; var nr = f.lod < 2 ? 14 : 7;
        for (var q = 0; q < nr; q++) { var qa = q / nr * PI2 + 0.3, q0 = 50 + 60 * k, q1 = q0 + 90 + 120 * (1 - k); c.beginPath(); c.moveTo(x + cos(qa) * q0, y + sin(qa) * q0); c.lineTo(x + cos(qa) * q1, y + sin(qa) * q1); c.stroke(); }
        c.lineCap = 'butt'; c.globalAlpha = 1; break; }
      case 'pillar':
        if (t < f.d) break; var pk = (t - f.d) / (f.max - f.d); if (pk >= 1) break;
        var drop = Math.min(1, pk * 3), pw = 54 * (1 - 0.5 * pk), ph = 340, top = y - ph * drop, fd = pk < 0.55 ? 1 : 1 - (pk - 0.55) / 0.45;
        if (f.lod < 2) { var gp = c.createLinearGradient(0, top, 0, y); gp.addColorStop(0, 'rgba(90,160,255,0)'); gp.addColorStop(0.7, 'rgba(110,180,255,' + 0.6 * fd + ')'); gp.addColorStop(1, 'rgba(200,230,255,' + 0.95 * fd + ')'); c.fillStyle = gp; c.fillRect(x - pw / 2, top, pw, y - top); c.fillStyle = 'rgba(255,255,255,' + 0.85 * fd + ')'; c.fillRect(x - pw / 7, top + (y - top) * 0.25, pw / 3.5, (y - top) * 0.75); }
        else { c.globalAlpha = 0.7 * fd; c.fillStyle = '#9fcfff'; c.fillRect(x - pw / 3, top, pw * 0.66, y - top); c.globalAlpha = 1; }
        if (pk > 0.3) { var rk = (pk - 0.3) / 0.7; c.globalAlpha = (1 - rk) * 0.85; c.strokeStyle = '#9fd0ff'; c.lineWidth = 5 * (1 - rk) + 1; c.beginPath(); c.ellipse(x, y, 20 + 60 * rk, 8 + 24 * rk, 0, 0, PI2); c.stroke(); c.globalAlpha = 1; }
        break;
      case 'dust':
        c.globalAlpha = (1 - k) * 0.55; c.fillStyle = '#d8c7a0'; c.beginPath(); c.arc(x + f.dir * 18 * k, y - 10 * k, f.r * (0.6 + 1.2 * k), 0, PI2); c.fill(); c.globalAlpha = 1; break;
      case 'pickup':
        c.globalAlpha = (1 - k) * 0.8; c.strokeStyle = '#ffe58a'; c.lineWidth = 3 * (1 - k) + 1; star(c, x, y, 14 + 26 * k, 4, 0.5, k); c.stroke(); c.globalAlpha = 1; break;
      case 'bossin': {                                                   // 世界部分：洞主脚下的裂纹光环
        var e = f.e, bx = e ? e.x : f.x, by = e ? e.y : f.y; c.globalAlpha = (1 - k) * 0.8; c.strokeStyle = f.color; c.lineWidth = 6 * (1 - k) + 2;
        c.beginPath(); c.ellipse(bx, by + 20, 60 + 200 * Math.min(1, k * 1.5), 24 + 80 * Math.min(1, k * 1.5), 0, 0, PI2); c.stroke(); c.globalAlpha = 1; break; }
    }
    return true;
  };
  var otxt = function () { return XY.R && XY.R.otxt ? XY.R.otxt.apply(null, arguments) : null; };

  /* 拾取飞入拖尾：正在被吸向英雄的经验 / 金币，身后拖一条短光尾（LOD：可见怪太多就不画） */
  XY.animItems = function (c, G) {
    if (A.lod(G) >= 1) return;
    var arrs = [G.gems, G.coinDrops], n = 0;
    c.lineCap = 'round';
    for (var a = 0; a < 2; a++) for (var i = 0; i < arrs[a].length && n < 90; i++) {
      var g = arrs[a][i], h = g.mag; if (!h || !h.x) continue;
      if (Math.abs(g.x - G.cam.x) > G.view.w / 2 + 30 || Math.abs(g.y - G.cam.y) > G.view.h / 2 + 30) continue;
      var dx = h.x - g.x, dy = h.y - g.y, d = Math.sqrt(dx * dx + dy * dy) || 1, len = Math.min(34, d * 0.6);
      c.globalAlpha = 0.65; c.strokeStyle = a === 0 ? '#7fd6ff' : '#ffd24a'; c.lineWidth = 3.2;
      c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - dx / d * len, g.y - dy / d * len); c.stroke(); n++;
    }
    c.lineCap = 'butt'; c.globalAlpha = 1;
  };

  /* ---------- 全屏部分（画在 HUD 之上；坐标 = 屏幕）---------- */
  XY.animScreen = function (c, G, app) {
    var W = app.lw, H = app.lh, lod = A.lod(G), i, f, k;
    if (G.animSpeed > 0.05 && lod < 2) {                                // 骑乘速度线：从屏幕边缘向中心的浅色细线
      var s = G.animSpeed, rt = performance.now() / 1000; c.lineCap = 'round'; c.strokeStyle = 'rgba(70,110,170,' + (0.4 * s) + ')'; c.lineWidth = 3;
      var N = lod ? 8 : 16;
      for (i = 0; i < N; i++) {
        var ang = (i / N) * PI2 + 0.2, ph = ((rt * 2.4 + i * 0.37) % 1), r0 = Math.min(W, H) * (0.30 + 0.25 * ph), r1 = r0 + 80 + 70 * s;
        c.beginPath(); c.moveTo(W / 2 + cos(ang) * r0 * 1.5, H / 2 + sin(ang) * r0); c.lineTo(W / 2 + cos(ang) * r1 * 1.5, H / 2 + sin(ang) * r1); c.stroke();
      }
      c.lineCap = 'butt';
    }
    for (i = 0; i < G.fx.length; i++) {
      f = G.fx[i]; if (f.type !== 'an' || !f.scr) continue; k = f.t / f.max;
      if (f.kind === 'flash') { c.fillStyle = 'rgba(' + f.color + ',' + (f.a * (1 - k)) + ')'; c.fillRect(0, 0, W, H); }
      else if (f.kind === 'syn') {
        var inn = Math.min(1, k * 4), out = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1, al = Math.min(inn, out), bh = 120, by = H * 0.36;
        c.globalAlpha = 0.14 * al; c.fillStyle = f.color; c.fillRect(0, 0, W, H);                                     // 整屏淡淡染上协同的颜色
        c.globalAlpha = 0.92 * al; var gs = c.createLinearGradient(0, 0, W, 0); gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.2, 'rgba(255,250,235,0.97)'); gs.addColorStop(0.8, 'rgba(255,250,235,0.97)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gs; c.fillRect(0, by, W, bh);
        c.fillStyle = f.color; c.fillRect(0, by, W, 4); c.fillRect(0, by + bh - 4, W, 4);
        var sx = W / 2 + (1 - Math.min(1, k * 3.2)) * W * 0.5;                                                         // 名字从右边滑进来，停在中间
        c.globalAlpha = al; if (otxt) { otxt(c, '协同技', sx, by + 30, 22, f.color, 'center', true); otxt(c, f.name + '  Lv' + f.lv, sx, by + 78, 46, '#3a3226', 'center', true); }
        if (lod < 2) { c.fillStyle = f.color; for (var q = 0; q < 10; q++) { var qx = (q * 137 + k * 900) % W, qy = by + 10 + (q * 53) % (bh - 20); c.globalAlpha = 0.55 * al * (1 - k * 0.5); c.beginPath(); c.arc(qx, qy, 3 + (q % 3), 0, PI2); c.fill(); } }
        c.globalAlpha = 1;
      } else if (f.kind === 'bossin') {
        var ib = Math.min(1, k * 5), ob = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1, ab = Math.min(ib, ob);
        var bx = W / 2, byy = Math.max(72, Math.min(H * 0.11, 108));
        c.save(); c.globalAlpha = ab;
        c.strokeStyle = 'rgba(36,28,20,0.7)'; c.lineWidth = 1.6; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(bx - 86, byy + 50);
        c.quadraticCurveTo(bx - 20, byy + 44, bx + 28, byy + 52);
        c.quadraticCurveTo(bx + 64, byy + 57, bx + 96, byy + 46);
        c.stroke();
        c.strokeStyle = 'rgba(141,31,24,0.85)'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(bx - 92, byy + 8); c.quadraticCurveTo(bx - 70, byy + 2, bx - 48, byy + 9); c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '16px DKBrush, KaiTi, serif'; c.fillStyle = '#8d1f18'; c.fillText('洞主登场', bx, byy + 18);
        c.font = '22px DKBrush, KaiTi, serif'; c.fillStyle = '#24180f'; c.fillText(f.name || '', bx, byy + 42);
        c.restore();
      }
    }
  };
})();
