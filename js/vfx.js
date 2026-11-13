/* v0.7 特效升级（法术 / 技能 / 攻击更华丽）。
 * - 一套对象池粒子（上限随画质档位变化；手机默认低档；掉帧自动降档，恢复后再升回），不再每个特效 new 一堆对象。
 * - 每个角色 / 元素有自己的颜色和形状：羽溪粉色水波、币圈老司机火焰拖尾、马丁雷电、Sisi 绿色治疗、腾EO 金色护盾、Phyrex 燃烧的 BTC 币（只有 Phyrex 用 BTC）。
 * - 分层：光晕 + 拖尾 + 粒子 + 命中闪光 + 冲击波环 + 大招屏震。颜色都挑偏饱和的中深色，浅色水墨底上也看得清。
 * 入口：shock（所有 ring 特效自动升级）、hit（每次命中）、trail（弹丸拖尾）、muzzle（出招）、cast（大招 / 技能）、heal、shield、slash（天兵）、hurt（英雄受击）。
 */
(function () {
  'use strict';
  var XY = window.XY, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin, rnd = Math.random;
  var V = XY.vfx = { cur: null, q: 1, base: 1, spawned: 0, dropped: 0, live: 0, pal: {} };
  var CAP = 720, pool = [], free = [], act = [], i0;
  for (i0 = 0; i0 < CAP; i0++) { var o0 = { on: false }; pool.push(o0); free.push(o0); }
  var IP = XY.INKP, INK = IP.INK, accCache = {};
  function inkc(col) { var r = accCache[col]; if (r) return r; return (accCache[col] = IP.mix(IP.rgb(col), 0.82)); }      // 点缀色几乎全是墨，只留一点原色，避免路上堆出彩点
  var mobile = false;
  try { mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (('ontouchstart' in window) && Math.min(window.innerWidth, window.innerHeight) < 700); } catch (e) { }
  V.base = V.q = mobile ? 0.45 : 1; V.mobile = mobile;
  V.cap = function () { return Math.floor(CAP * V.q); };

  /* ---------- 调色板：main 主色（中深），lite 亮色，dk 深色描边，st 形状风格 ---------- */
  var P = V.pal = {
    heyuxi: { main: '#e8559a', lite: '#ffb3d6', dk: '#a8286a', st: 'wave' },
    laosiji: { main: '#f0641a', lite: '#ffc84a', dk: '#a8300a', st: 'fire' },
    martin: { main: '#7a5af0', lite: '#ffe14a', dk: '#3a2a98', st: 'thunder' },
    sisi: { main: '#2fb872', lite: '#b8f0cf', dk: '#17703f', st: 'heal' },
    haiteng: { main: '#e0a31a', lite: '#fff0a8', dk: '#8a600a', st: 'gold' },
    phyrex: { main: '#f08a1a', lite: '#ffe07a', dk: '#9a4a06', st: 'coin' },
    kuanggong: { main: '#c88a2a', lite: '#ffe08a', dk: '#7a4e12', st: 'gold' },
    yuanzhang: { main: '#3fa797', lite: '#c8f2e8', dk: '#1f6a60', st: 'heal' },
    diaoyulao: { main: '#2aa6b8', lite: '#b8eef6', dk: '#136a78', st: 'wave' },
    tang: { main: '#e0b030', lite: '#fff2b0', dk: '#8a6a10', st: 'gold' },
    wukong: { main: '#ef7a2c', lite: '#ffd08a', dk: '#a3480e', st: 'fire' },
    bajie: { main: '#ea6d9c', lite: '#ffc4dc', dk: '#a03060', st: 'default' },
    wujing: { main: '#3f78c6', lite: '#b4d4f6', dk: '#1f4a8a', st: 'wave' },
    horse: { main: '#3fb8c4', lite: '#c0f0f4', dk: '#1a7a86', st: 'wave' },
    boss: { main: '#c02a1a', lite: '#ffb08a', dk: '#6a0e08', st: 'boss' },
    sky: { main: '#4a8ed0', lite: '#e0f0ff', dk: '#1f4f8a', st: 'default' },
    enemy: { main: '#c0502a', lite: '#ffc08a', dk: '#6a2a10', st: 'default' }
  };
  function hue(col) {                                    // 按颜色归类成元素风格（给没有英雄上下文的 ring 用）
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(col || ''); if (!m) return 'default';
    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 28) return 'default';
    var h; if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h *= 60;
    if (h < 20 || h >= 340) return mn > 120 ? 'wave' : 'fire';
    if (h < 48) return 'fire'; if (h < 65) return 'gold'; if (h < 165) return 'heal'; if (h < 255) return 'wave'; if (h < 300) return 'thunder'; return 'wave';
  }
  function palOf(h, col) {
    if (h && h.id && P[h.id]) return P[h.id];
    if (h && h.def && h.def.boss) return P.boss;
    var st = hue(col), c = col || '#ffb347';
    return { main: c, lite: '#fff3c4', dk: '#5a3a1a', st: st };
  }
  V.palOf = palOf;

  /* ---------- 粒子池 ---------- */
  function get() {
    if (act.length >= V.cap() || !free.length) { V.dropped++; return null; }
    var p = free.pop(); p.on = true; p.kind = 'dot'; p.x = p.y = p.vx = p.vy = 0; p.t = 0; p.max = 0.4; p.r = 3; p.col = '#fff'; p.col2 = null; p.g = 0; p.drag = 0.9; p.a = 0; p.va = 0; p.pts = null; p.len = 0; p.w = 2; p.sd = (V.spawned * 7 + 3) & 1023;
    act.push(p); V.spawned++; return p;
  }
  function n(k) { return Math.max(0, Math.round(k * V.q)); }                    // 按画质档位缩放粒子数
  function dot(x, y, vx, vy, max, r, col, o) { var p = get(); if (!p) return null; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.max = max; p.r = r; p.col = col; if (o) for (var k in o) p[k] = o[k]; return p; }
  function streak(x, y, ang, sp, max, len, w, col, col2) { var p = get(); if (!p) return; p.kind = 'streak'; p.x = x; p.y = y; p.vx = cos(ang) * sp; p.vy = sin(ang) * sp; p.max = max; p.len = len; p.w = w; p.col = col; p.col2 = col2; p.drag = 0.88; }
  function bolt(x0, y0, x1, y1, col, col2, max, w) {                            // 锯齿闪电（一次生成折线，短命）
    var p = get(); if (!p) return; p.kind = 'bolt'; p.max = max || 0.22; p.col = col; p.col2 = col2; p.w = w || 3;
    var seg = 6, pts = [], dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L;
    for (var i = 0; i <= seg; i++) { var u = i / seg, j = (i === 0 || i === seg) ? 0 : (rnd() - 0.5) * Math.min(34, L * 0.28); pts.push(x0 + dx * u + nx * j, y0 + dy * u + ny * j); }
    p.pts = pts;
  }
  function coin(x, y, vx, vy, max, r) { var p = dot(x, y, vx, vy, max, r, '#f7a81a', { kind: 'coin', g: 260, drag: 0.97, a: rnd() * 6, va: (rnd() - 0.5) * 14 }); return p; }
  function ember(x, y, col, r) { dot(x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 8, (rnd() - 0.5) * 40, -30 - rnd() * 60, 0.45 + rnd() * 0.4, r || 3, col, { kind: 'ember', drag: 0.96 }); }

  /* ---------- 冲击波环（G.fx 里的 ring 会被这里画成分层样子）---------- */
  V.shock = function (G, x, y, r, col, t, fill) {
    var h = V.cur, pl = palOf(h, col), st = pl.st;
    var f = G.fx[G.fx.length - 1];                                              // game.js 刚 push 的那个 ring
    if (f && f.type === 'ring' && f.x === x && f.y === y) { f.st = st; f.main = h ? pl.main : col; f.lite = pl.lite; f.dk = pl.dk; f.h = !!h; }
    if (r < 40) { for (var k = n(3); k > 0; k--) dot(x, y, (rnd() - 0.5) * 120, (rnd() - 0.5) * 120, 0.3, 2.5, pl.main); return; }
    var cnt = n(Math.min(34, 6 + r / 11)), cm = h ? pl.main : col, ci = pl.lite;
    for (var i = 0; i < cnt; i++) {
      var a = i / cnt * PI2 + rnd() * 0.2, sp = r * (1.6 + rnd() * 0.8);
      streak(x + cos(a) * r * 0.22, y + sin(a) * r * 0.22, a, sp, 0.32 + rnd() * 0.18, 10 + r * 0.06, 2.5 + rnd() * 1.5, cm, ci);
    }
    if (st === 'fire') for (i = n(r / 14); i > 0; i--) { var a2 = rnd() * PI2, d = rnd() * r * 0.8; ember(x + cos(a2) * d, y + sin(a2) * d, i % 2 ? '#ff9a2a' : '#ffd24a', 3 + rnd() * 3); }
    else if (st === 'heal') for (i = n(r / 16); i > 0; i--) { var a3 = rnd() * PI2, d3 = rnd() * r * 0.8; dot(x + cos(a3) * d3, y + sin(a3) * d3, (rnd() - 0.5) * 20, -40 - rnd() * 40, 0.8 + rnd() * 0.4, 5 + rnd() * 3, '#2fb872', { kind: i % 2 ? 'cross' : 'leaf', a: rnd() * 6, drag: 0.97 }); }
    else if (st === 'thunder') for (i = n(Math.min(7, 2 + r / 60)); i > 0; i--) { var a4 = rnd() * PI2; bolt(x, y, x + cos(a4) * r * 0.95, y + sin(a4) * r * 0.95, pl.main, '#ffe14a', 0.28, 3.5); }
    else if (st === 'gold') for (i = n(r / 14); i > 0; i--) { var a5 = rnd() * PI2, d5 = r * (0.3 + rnd() * 0.6); dot(x + cos(a5) * d5, y + sin(a5) * d5, 0, -20, 0.6 + rnd() * 0.4, 5 + rnd() * 3, '#f5b820', { kind: 'star', a: rnd() * 6 }); }
    else if (st === 'wave') for (i = n(r / 12); i > 0; i--) { var a6 = rnd() * PI2, d6 = r * (0.3 + rnd() * 0.6); dot(x + cos(a6) * d6, y + sin(a6) * d6, cos(a6) * 70, sin(a6) * 70 - 20, 0.5 + rnd() * 0.3, 3 + rnd() * 2.5, pl.main, { kind: pl.main === '#e8559a' ? 'petal' : 'drop', a: a6, g: 80 }); }
    else if (st === 'coin') for (i = n(Math.min(10, r / 18)); i > 0; i--) { var a7 = rnd() * PI2; coin(x, y, cos(a7) * (120 + rnd() * 160), sin(a7) * (120 + rnd() * 160) - 80, 0.9 + rnd() * 0.5, 7 + rnd() * 3); ember(x, y, '#ff9a2a', 3); }
    else if (st === 'boss') for (i = n(r / 10); i > 0; i--) { var a8 = rnd() * PI2; dot(x + cos(a8) * r * 0.6, y + sin(a8) * r * 0.6, cos(a8) * 200, sin(a8) * 200 - 90, 0.5 + rnd() * 0.4, 3 + rnd() * 4, i % 2 ? '#7a4a2a' : '#c0502a', { kind: 'chunk', a: rnd() * 6, va: (rnd() - 0.5) * 18, g: 420, drag: 0.98 }); }
    if (r >= 260 && G.shake < 6) G.shake = Math.max(G.shake, 6);
  };
  function polyRing(c, x, y, r, sides, rot, jag) {
    c.beginPath();
    for (var i = 0; i <= sides; i++) { var a = rot + i / sides * PI2, rr = r + (jag ? (rnd() - 0.5) * jag : 0); if (i === 0) c.moveTo(x + cos(a) * rr, y + sin(a) * rr); else c.lineTo(x + cos(a) * rr, y + sin(a) * rr); }
    c.closePath();
  }
  // v0.7：不再画同心圆。冲击 = 一圈向外飞的尖碎片（shards）+ 几道穿过中心的斩痕（slashes）；雷 = 锯齿多边形，金 = 六边形，火 = 更长的火舌，水 = 溅开的水滴菱形
  function shards(c, x, y, r, n, L, rot, wide) {
    c.beginPath();
    for (var i = 0; i < n; i++) {
      var an = rot + i / n * PI2, l = L * (i % 2 ? 0.62 : 1), hw = wide * (PI2 / n) * 0.5, rb = r - l * 0.6, rt = r + l * 0.5;
      c.moveTo(x + cos(an - hw) * rb, y + sin(an - hw) * rb); c.lineTo(x + cos(an) * rt, y + sin(an) * rt); c.lineTo(x + cos(an + hw) * rb, y + sin(an + hw) * rb); c.closePath();
    }
  }
  V.drawRing = function (c, f, k) {                                                     // v0.8：水墨冲击——断续的毛笔圈 + 向外甩的笔触 + 墨点，不再是对称的尖三角
    var r = f.r * (0.25 + 0.75 * Math.min(1, k * 1.6)), a = 1 - k, col = f.main || f.color, ac = inkc(col), sd = ((f.x * 7 + f.y * 13) | 0) & 1023, big = f.r >= 50;
    var w = Math.max(3, Math.min(20, f.r * 0.1)) * (0.5 + 0.5 * a), rot = k * 0.5;
    if (f.fill) IP.blot(c, f.x, f.y, r * 0.72, ac, a * 0.17, sd, 0, 1);
    IP.ring(c, f.x, f.y, r, w * 1.7, ac, a * 0.5, sd, 5, 1, rot);
    IP.ring(c, f.x, f.y, r, w * 0.95, INK, a * 0.88, sd + 3, 4, 1, rot + 0.4);
    for (var bi = 0; bi < (big ? 3 : 1); bi++) { var ba = IP.hash(bi, sd) * 6.283 + rot; IP.blot(c, f.x + cos(ba) * r, f.y + sin(ba) * r, Math.max(4, w * 1.3), INK, a * 0.6, sd + 50 + bi, n(5), 1); }
    var nn = Math.max(6, Math.min(16, Math.round(f.r / 12)));
    IP.splash(c, f.x, f.y, r * 0.62, r * 1.22, nn, Math.max(3.4, f.r * 0.075) * (0.5 + 0.5 * a), ac, a * 0.95, sd + 9, 1);
    if (big) {
      var sn = f.r >= 140 ? 3 : 2;
      for (var i = 0; i < sn; i++) { var an = rot * 0.7 + i / sn * Math.PI + 0.3, ln = r * (1.02 - 0.12 * (i % 2)), dx = cos(an) * ln, dy = sin(an) * ln * 0.8; IP.stroke(c, f.x - dx, f.y - dy, f.x + dx, f.y + dy, w * 1.1, INK, a * 0.55, sd + 20 + i, 0.1); }
      IP.dots(c, f.x, f.y, r * 0.5, r * 1.3, n(10) + 2, 1, 3, INK, a * 0.7, sd + 30, 1);
    }
    c.globalAlpha = 1;
  };

  /* ---------- 命中：闪光 + 火花；各风格自己的形状 ---------- */
  var hitCount = 0;
  V.hit = function (G, e, dmg, o, em) {
    var src = o && o.src, pl = src && src.id ? palOf(src) : (src && src.def && src.def.boss ? P.boss : P.sky);
    if (!src) pl = P.sky;
    var big = dmg >= 60 || (o && o.crit) || em > 1.2, huge = dmg >= 200 || (e.def && e.def.boss && dmg >= 120);
    var x = e.x, y = e.y, ang = o && o.fx !== undefined ? Math.atan2(e.y - o.fy, e.x - o.fx) : rnd() * PI2;
    var fl = get(); if (fl) { fl.kind = 'flash'; fl.x = x; fl.y = y; fl.max = big ? 0.2 : 0.12; fl.r = (big ? 24 : 15) + Math.min(14, dmg / 40); fl.col = pl.main; fl.col2 = pl.lite; }
    hitCount++;
    var ns = n(big ? 8 : 3 + (hitCount & 1));
    for (var i = 0; i < ns; i++) { var a = ang + (rnd() - 0.5) * 1.9; streak(x, y, a, 160 + rnd() * 260, 0.22 + rnd() * 0.18, 8 + rnd() * 10, 2 + rnd() * 1.6, pl.main, pl.lite); }
    var st = pl.st;
    if (st === 'thunder') { for (i = n(big ? 3 : 1); i > 0; i--) { var a2 = rnd() * PI2; bolt(x, y, x + cos(a2) * (30 + rnd() * 26), y + sin(a2) * (30 + rnd() * 26), pl.main, '#ffe14a', 0.2, 3); } }
    else if (st === 'fire') { for (i = n(big ? 5 : 2); i > 0; i--) ember(x, y, i % 2 ? '#ff7a1a' : '#ffd24a', 3 + rnd() * 2); }
    else if (st === 'coin') { for (i = n(big ? 3 : 1); i > 0; i--) coin(x, y, (rnd() - 0.5) * 220, -90 - rnd() * 120, 0.8, 6 + rnd() * 3); for (i = n(3); i > 0; i--) ember(x, y, '#ff9a2a', 3); }
    else if (st === 'wave') { for (i = n(big ? 4 : 2); i > 0; i--) dot(x, y, (rnd() - 0.5) * 160, -50 - rnd() * 70, 0.5, 3 + rnd() * 2, pl.main, { kind: pl.main === '#e8559a' ? 'petal' : 'drop', a: rnd() * 6, g: 260 }); }
    else if (st === 'heal') { for (i = n(big ? 4 : 2); i > 0; i--) dot(x, y, (rnd() - 0.5) * 90, -50 - rnd() * 40, 0.7, 4 + rnd() * 2, pl.main, { kind: 'leaf', a: rnd() * 6, drag: 0.96 }); }
    else if (st === 'gold') { for (i = n(big ? 4 : 2); i > 0; i--) dot(x, y, (rnd() - 0.5) * 120, -30 - rnd() * 60, 0.5, 4 + rnd() * 2, '#f5b820', { kind: 'star', a: rnd() * 6 }); }
    if (big && V.q > 0.5) { var rg = get(); if (rg) { rg.kind = 'ringp'; rg.x = x; rg.y = y; rg.max = 0.28; rg.r = 36 + (huge ? 24 : 0); rg.col = pl.main; rg.col2 = pl.lite; } }
    if (huge && G.shake < 4) G.shake = Math.max(G.shake, Math.min(5, 2 + dmg / 150));
  };

  /* ---------- 弹丸拖尾 ---------- */
  var trailTick = 0;
  V.trail = function (G, p, dt) {
    var src = p.src, pl = src && src.id ? P[src.id] : null;
    if (!pl) { if (!(p.kind === 'water' || p.kind === 'wave')) return; pl = p.kind === 'water' ? P.diaoyulao : palOf(null, p.col); }
    if (p.kind === 'btc') pl = P.phyrex;
    if (((trailTick++) & 1) && V.q < 0.7) return;
    var a = Math.atan2(p.vy, p.vx), bx = p.x - cos(a) * 6, by = p.y - sin(a) * 6, st = pl.st;
    dot(bx, by, -p.vx * 0.05 + (rnd() - 0.5) * 20, -p.vy * 0.05 + (rnd() - 0.5) * 20, 0.28, (p.r || 5) * 0.9, pl.main, { kind: 'glow', col2: pl.lite });
    if (st === 'fire' || st === 'coin') ember(bx, by, rnd() < 0.5 ? '#ff7a1a' : '#ffc84a', 2.5 + rnd() * 2);
    else if (st === 'thunder') { if (rnd() < 0.35) bolt(p.x, p.y, p.x + (rnd() - 0.5) * 36, p.y + (rnd() - 0.5) * 36, pl.main, '#ffe14a', 0.14, 2.5); }
    else if (st === 'wave') { if (rnd() < 0.5) dot(bx, by, (rnd() - 0.5) * 30, (rnd() - 0.5) * 30, 0.4, 2 + rnd() * 2, pl.lite, { kind: 'drop', a: a, g: 40 }); }
    else if (st === 'heal') { if (rnd() < 0.4) dot(bx, by, (rnd() - 0.5) * 20, -20, 0.5, 4, pl.main, { kind: 'leaf', a: rnd() * 6 }); }
    else if (st === 'gold') { if (rnd() < 0.4) dot(bx, by, (rnd() - 0.5) * 20, -10, 0.45, 4, '#f5b820', { kind: 'star', a: rnd() * 6 }); }
  };

  /* ---------- 出招闪光 ---------- */
  V.muzzle = function (G, h) {
    var pl = P[h.id] || P.tang, a = h.face || 0, x = h.x + cos(a) * h.def.r * 1.2, y = h.y + sin(a) * h.def.r * 1.2;
    var fl = get(); if (fl) { fl.kind = 'flash'; fl.x = x; fl.y = y; fl.max = 0.1; fl.r = 13; fl.col = pl.main; fl.col2 = pl.lite; }
    for (var i = n(3); i > 0; i--) streak(x, y, a + (rnd() - 0.5) * 0.8, 120 + rnd() * 160, 0.18, 8, 2, pl.main, pl.lite);
  };

  /* ---------- 技能 / 大招：施放瞬间的“起手式”（地面符阵 + 光柱 + 向上粒子），之后的 ring 已被 shock 升级 ---------- */
  V.cast = function (G, h, kind) {
    var pl = P[h.id] || P.tang, x = h.x, y = h.y;
    G.fx.push({ type: 'vglyph', x: x, y: y, r: kind === 'ult' ? 110 : 70, t: 0, max: kind === 'ult' ? 0.7 : 0.45, main: pl.main, lite: pl.lite, dk: pl.dk, st: pl.st });
    if (XY.SKILLFX) XY.SKILLFX.add(G, XY.SKILLFX.kindOf(pl.st, pl.main), x, y, kind === 'ult' ? 190 : 120, kind === 'ult' ? 1.1 : 0.8);      // v0.8.5 水墨技能精灵
    for (var i = n(kind === 'ult' ? 18 : 9); i > 0; i--) {
      var a = rnd() * PI2, d = 10 + rnd() * 40, st = pl.st, col = pl.main, kd = 'dot';
      if (st === 'coin') kd = 'coin'; else if (st === 'heal') kd = i % 2 ? 'cross' : 'leaf'; else if (st === 'gold') kd = 'star'; else if (st === 'wave') kd = pl.main === '#e8559a' ? 'petal' : 'drop'; else if (st === 'fire') kd = 'ember';
      dot(x + cos(a) * d, y + sin(a) * d, cos(a) * 30, -90 - rnd() * 90, 0.6 + rnd() * 0.5, 4 + rnd() * 3, col, { kind: kd, a: rnd() * 6, va: (rnd() - 0.5) * 10, drag: 0.97 });
    }
    if (pl.st === 'thunder') for (i = n(kind === 'ult' ? 5 : 2); i > 0; i--) bolt(x + (rnd() - 0.5) * 60, y - 200, x + (rnd() - 0.5) * 30, y, pl.main, '#ffe14a', 0.3, 4);
    if (kind === 'ult' && G.shake < 8) G.shake = 8;
  };
  V.heal = function (G, h) { if (!h || h.down) return; if (XY.SKILLFX && !(h._lotT > G.t)) { h._lotT = G.t + 2.5; XY.SKILLFX.add(G, 'lotus', h.x, h.y + h.def.r * 0.6, h.def.r * 3.4, 0.9); } var x = h.x, y = h.y; for (var i = n(5); i > 0; i--) dot(x + (rnd() - 0.5) * h.def.r * 2, y + h.def.r * 0.5, (rnd() - 0.5) * 20, -50 - rnd() * 40, 0.8 + rnd() * 0.4, 4.5 + rnd() * 2, '#2fb872', { kind: i % 2 ? 'cross' : 'leaf', a: rnd() * 6, drag: 0.97 }); };
  V.shield = function (G, t) { var g = G.fx; if (XY.SKILLFX) XY.SKILLFX.add(G, 'shield', t.x, t.y + (t.def ? t.def.r : 18) * 0.6, (t.def ? t.def.r : 18) * 3.2, 0.9); g.push({ type: 'vshield', x: t.x, y: t.y - 4, r: (t.def ? t.def.r : 18) * 1.9, t: 0, max: 0.6 }); for (var i = n(5); i > 0; i--) dot(t.x + (rnd() - 0.5) * 40, t.y + (rnd() - 0.5) * 30, 0, -26, 0.6, 5, '#f5b820', { kind: 'star', a: rnd() * 6 }); };
  V.slash = function (G, a, tgt) {                                                  // 天兵一刀：银蓝斩弧 + 火花
    var ang = Math.atan2(tgt.y - a.y, tgt.x - a.x), x = (a.x + tgt.x) / 2, y = (a.y + tgt.y) / 2;
    G.fx.push({ type: 'vslash', x: x, y: y, ang: ang, r: 26, t: 0, max: 0.2 });
    for (var i = n(4); i > 0; i--) streak(tgt.x, tgt.y, ang + (rnd() - 0.5) * 1.6, 150 + rnd() * 200, 0.2, 8, 2, '#4a8ed0', '#e0f0ff');
  };
  V.hurt = function (G, h, dmg) { var fl = get(); if (fl) { fl.kind = 'flash'; fl.x = h.x; fl.y = h.y; fl.max = 0.18; fl.r = 22; fl.col = '#d62828'; fl.col2 = '#ffd0c0'; } for (var i = n(5); i > 0; i--) streak(h.x, h.y, rnd() * PI2, 120 + rnd() * 160, 0.22, 8, 2.2, '#d62828', '#ffd0c0'); };

  /* ---------- 其它 fx 类型（G.fx 里的 vglyph / vshield / vslash）---------- */
  V.drawFx = function (c, f, k) {
    var a = 1 - k, sd = ((f.x * 5 + f.y * 11) | 0) & 1023;
    if (f.type === 'vglyph') {                                                         // 地面符阵：墨圈（压扁成地面椭圆）+ 放射笔触 + 几道升起的光墨
      var r = f.r * (0.6 + 0.5 * Math.min(1, k * 2)), ac = inkc(f.main), rt = k * 1.2;
      IP.ring(c, f.x, f.y, r, 5.5, ac, a * 0.5, sd, 6, 0.55, rt);
      IP.ring(c, f.x, f.y, r, 2.4, INK, a * 0.8, sd + 5, 5, 0.55, rt + 0.3);
      IP.ring(c, f.x, f.y, r * 0.62, 2, INK, a * 0.6, sd + 9, 4, 0.55, -rt);
      IP.splash(c, f.x, f.y, r * 0.66, r * 1.12, f.st === 'gold' ? 6 : 8, 3, ac, a * 0.8, sd + 11, 0.55);
      var up = Math.min(1, k * 3);
      for (var i = 0; i < 3; i++) IP.stroke(c, f.x + (i - 1) * r * 0.26, f.y - 4, f.x + (i - 1) * r * 0.16, f.y - 150 * up * (0.8 + 0.12 * i), r * 0.12, ac, a * 0.34, sd + 40 + i, 0.04);
    } else if (f.type === 'vshield') {                                                 // 金色护盾：金墨洇开的一团 + 断续金圈 + 墨圈
      var rr = f.r * (0.7 + 0.4 * Math.min(1, k * 3)), gc = inkc('#e0a020');
      IP.blot(c, f.x, f.y, rr * 0.8, gc, a * 0.22, sd, 0, 1);
      IP.ring(c, f.x, f.y, rr, 4.5, gc, a * 0.75, sd, 6, 1, 0.5);
      IP.ring(c, f.x, f.y, rr, 1.8, INK, a * 0.75, sd + 4, 5, 1, 0.9);
      IP.dots(c, f.x, f.y, rr * 0.7, rr * 1.2, 5, 1, 2.6, gc, a * 0.8, sd + 8, 1);
    } else if (f.type === 'vslash') {                                                  // 斩弧：一笔浓墨弯月 + 淡色洇边
      c.save(); c.translate(f.x, f.y); c.rotate(f.ang); var s = 0.5 + k * 0.9, R = f.r * 1.6 * s, cx0 = -f.r * 0.8;
      var x0 = cx0 + cos(-0.9) * R, y0 = sin(-0.9) * R, x1 = cx0 + cos(0.9) * R, y1 = sin(0.9) * R;
      IP.stroke(c, x0, y0, x1, y1, 8 * a + 2, inkc('#4a8ed0'), a * 0.5, sd, 0.42);
      IP.stroke(c, x0, y0, x1, y1, 5 * a + 1.2, INK, a * 0.9, sd + 3, 0.42);
      c.restore();
    }
    c.globalAlpha = 1;
  };

  /* ---------- 更新 / 绘制 ---------- */
  var last = 0, ema = 16, acc = 0;
  // 画质自适应：必须每个“渲染帧”采样一次（main.js 每帧调）。以前放在每个逻辑步里，一帧补跑几步就量出假的 16.7ms，掉帧时永远不降档
  V.sample = function () {
    var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (last) { var d = Math.min(100, now - last); ema = ema * 0.95 + d * 0.05; acc += d; if (acc > 1000) { acc = 0; if (ema > 27 && V.q > 0.25) V.q = Math.max(0.25, V.q - 0.1); else if (ema < 19 && V.q < V.base) V.q = Math.min(V.base, V.q + 0.05); } }
    last = now;
  };
  V.update = function (G, dt) {
    if (V.G !== G) { V.G = G; V.reset(); }
    var w = 0, cap = V.cap();
    for (var i = 0; i < act.length; i++) {
      var p = act[i]; p.t += dt;
      if (p.t >= p.max || (i >= cap && p.t > p.max * 0.3)) { p.on = false; free.push(p); continue; }
      if (p.kind !== 'bolt' && p.kind !== 'flash' && p.kind !== 'ringp') {
        p.x += p.vx * dt; p.y += p.vy * dt; var dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy *= dr; p.vy += p.g * dt; p.a += p.va * dt;
      }
      act[w++] = p;
    }
    act.length = w; V.live = w;
  };
  V.draw = function (c, G) {
    var i, p, k, a;
    for (i = 0; i < act.length; i++) {
      p = act[i]; k = p.t / p.max; a = 1 - k;
      switch (p.kind) {
        case 'flash':                                                                   // 命中：一点墨团 + 向外甩出的几笔（点缀色）
          var fr = p.r * (0.5 + 0.8 * k), fa = inkc(p.col);
          IP.splash(c, p.x, p.y, fr * 0.2, fr * 1.6, 7, 3.2 + fr * 0.1, fa, a, p.sd, 1);
          IP.blot(c, p.x, p.y, fr * 0.5, fa, a * 0.6, p.sd + 2, 3, 1);
          IP.blot(c, p.x, p.y, fr * 0.26, INK, a * 0.85, p.sd + 3, 2, 1);
          break;
        case 'ringp': IP.ring(c, p.x, p.y, p.r * (0.3 + k * 0.9), 2.6 * a + 0.8, inkc(p.col), a * 0.8, p.sd, 4, 1, k); break;
        case 'streak':
          var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, L = p.len * (0.6 + 0.4 * a) * 1.3;
          IP.cstroke(c, p.x, p.y, p.x - ux * L, p.y - uy * L, p.w * 1.7 + 0.8, inkc(p.col), a, p.sd, 0.08); break;
        case 'bolt':                                                                    // 闪电：宽宽的点缀色洇边 + 一道墨色折线
          c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = a * 0.4; c.strokeStyle = 'rgb(' + inkc(p.col) + ')'; c.lineWidth = p.w + 5;
          c.beginPath(); c.moveTo(p.pts[0], p.pts[1]); for (var j = 2; j < p.pts.length; j += 2) c.lineTo(p.pts[j], p.pts[j + 1]); c.stroke();
          c.globalAlpha = a * 0.9; c.strokeStyle = 'rgb(' + INK + ')'; c.lineWidth = p.w * 0.55 + 0.4;
          c.beginPath(); c.moveTo(p.pts[0], p.pts[1]); for (j = 2; j < p.pts.length; j += 2) c.lineTo(p.pts[j], p.pts[j + 1]); c.stroke(); break;
        case 'glow':
          IP.blot(c, p.x, p.y, p.r * 1.1, INK, a * 0.4, p.sd, 1, 0.8); break;
        case 'ember':
          IP.blot(c, p.x, p.y, p.r * 0.9, INK, a * 0.75, p.sd, 1, 1); break;
        case 'coin': case 'star': case 'cross': case 'leaf': case 'petal': case 'drop': case 'chunk':
          IP.blot(c, p.x, p.y, p.r * (p.kind === 'drop' ? 0.8 : 1.05), INK, a * 0.7, p.sd, p.kind === 'petal' || p.kind === 'leaf' ? 2 : 1, 1);
          if (p.kind === 'coin') IP.blot(c, p.x, p.y - p.r * 0.15, p.r * 0.32, '140,32,24', a * 0.75, p.sd + 2, 0, 1);
          else if (p.kind !== 'drop') IP.splash(c, p.x, p.y, p.r * 0.3, p.r * 1.3, 3, 1.1, INK, a * 0.5, p.sd + 4, 0.5);
          break;
        default:
          IP.blot(c, p.x, p.y, p.r * 0.85, INK, a * 0.62, p.sd, 1, 1);
      }
    }
    c.globalAlpha = 1; c.lineCap = 'butt';
  };
  /* ---------- v0.7b：落石 / 进化特效 ---------- */
  V.land = function (G, x, y, r) {                                               // 黑熊精落石：碎石四溅 + 尘土
    for (var i = n(14); i > 0; i--) { var a = rnd() * PI2, sp = 120 + rnd() * 240; dot(x, y, cos(a) * sp, sin(a) * sp - 120, 0.6 + rnd() * 0.4, 3 + rnd() * 4, i % 2 ? '#7a5a42' : '#a88a6a', { kind: 'chunk', g: 420, drag: 0.97, a: rnd() * 6, va: (rnd() - 0.5) * 16 }); }
    for (i = n(8); i > 0; i--) { var a2 = rnd() * PI2, d2 = rnd() * r * 0.8; dot(x + cos(a2) * d2, y + sin(a2) * d2, cos(a2) * 40, -20 - rnd() * 30, 0.6, 7 + rnd() * 6, 'rgba(150,120,90,0.5)', { drag: 0.95 }); }
  };
  V.evoSweep = function (G, h, ang, range, arc) {                                // 万丈金箍棒横扫：金色烈焰沿扇形外缘喷出
    var full = arc >= PI2 - 0.01, m = n(full ? 22 : 14), i;
    for (i = 0; i < m; i++) {
      var a = full ? rnd() * PI2 : ang + (rnd() - 0.5) * arc, rr = range * (0.55 + rnd() * 0.45);
      var x = h.x + cos(a) * rr, y = h.y + sin(a) * rr;
      streak(x, y, a + 1.57, 120 + rnd() * 80, 0.22 + rnd() * 0.12, 8 + rnd() * 4, 2.2, '#3a3228', '#6a5a48');
      if (i % 3 === 0) ember(x, y, '#3a3228', 2 + rnd() * 2);
    }
    for (i = n(6); i > 0; i--) { var a3 = ang + (rnd() - 0.5) * arc; dot(h.x + cos(a3) * range * 0.9, h.y + sin(a3) * range * 0.9, 0, -20, 0.5, 5 + rnd() * 3, '#3a3228', { kind: 'drop', a: rnd() * 6 }); }
  };
  V.evoBurst = function (G, h) {                                                 // 进化瞬间：金柱 + 星屑 + 火舌
    G.fx.push({ type: 'vglyph', x: h.x, y: h.y, r: 150, t: 0, max: 0.9, main: '#f0b429', lite: '#fff0a8', dk: '#8a600a', st: 'gold' });
    for (var i = n(40); i > 0; i--) { var a = rnd() * PI2, sp = 80 + rnd() * 260; dot(h.x, h.y, cos(a) * sp, sin(a) * sp - 140, 0.8 + rnd() * 0.6, 4 + rnd() * 4, i % 3 ? '#f5b820' : '#ff7a1a', { kind: i % 3 ? 'star' : 'ember', a: rnd() * 6, va: (rnd() - 0.5) * 10, drag: 0.96 }); }
  };
  V.reset = function () { for (var i = 0; i < act.length; i++) { act[i].on = false; free.push(act[i]); } act.length = 0; V.live = 0; };
  V.count = function () { return act.length; };
  V.kinds = function () { var o = {}; for (var i = 0; i < act.length; i++) o[act[i].kind] = (o[act[i].kind] || 0) + 1; return o; };
})();
