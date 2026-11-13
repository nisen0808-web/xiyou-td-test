/* ============================================================
 * inkfx.js —— v0.8.0：水墨笔触原语（大招 ultink / 技能特效 vfx / 弹丸 / 宝箱道具卡牌共用）
 *   · 一笔 stroke：笔头重、笔尾细、略带弯度、边缘毛躁、中间几道飞白（不是对称的“尖三角”）。
 *   · blot 泼墨团 + 飞溅点；ring 断续的毛笔圆圈（枯笔 / 留白）；splash 一圈向外甩的笔触。
 *   · 全部是“种子 → 形状”的纯函数：同一个 seed 每帧画出同一个形状，不会闪烁；颜色一律 rgb 字符串 'r,g,b'（墨色 INK + 每位角色的点缀色）。
 *   · 画布状态：每个原语自己 save/restore 之外的东西不碰（不改 globalAlpha / lineCap 的最终值）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, PI = Math.PI, PI2 = PI * 2, sin = Math.sin, cos = Math.cos, pow = Math.pow;
  var P = XY.INKP = { INK: '24,20,16', PAPER: '255,250,236', q: function () { return 1; } };
  var rgbCache = {};
  function cl(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function hash(i, k) { var s = sin(i * 127.1 + (k || 0) * 311.7 + 17.3) * 43758.5453; return s - Math.floor(s); }
  P.hash = hash; P.cl = cl;
  P.rgb = function (col) {                                   // '#rrggbb' / 'r,g,b' → 'r,g,b'；可选 mix 向墨色靠拢（0–1）
    if (!col) return P.INK; var r = rgbCache[col]; if (r) return r;
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(col);
    r = m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : (/^\d+,\d+,\d+$/.test(col) ? col : P.INK);
    return (rgbCache[col] = r);
  };
  P.mix = function (rgb, k) {                                // 点缀色压暗（兑一点墨）：浅底上更像墨里的颜色
    var a = rgb.split(','), i = P.INK.split(','), o = [], j; for (j = 0; j < 3; j++) o.push(Math.round(+a[j] * (1 - k) + +i[j] * k)); return o.join(',');
  };
  /* 一笔：(x0,y0) 笔头 → (x1,y1) 笔尾；w = 笔头最大半宽；bend = 弯度（相对笔长，±0.2 左右）*/
  P.stroke = function (c, x0, y0, x1, y1, w, rgb, a, seed, bend) {
    if (a <= 0.004 || w <= 0.1) return;
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = L < 40 ? 7 : 11, i, p, ww, jj, bx, by, cx, cy;
    bend = bend === undefined ? (hash(seed, 61) - 0.5) * 0.36 : bend; cx = x0 + dx * 0.5 + nx * L * bend; cy = y0 + dy * 0.5 + ny * L * bend;
    var L1 = [], L2 = [];
    for (i = 0; i <= n; i++) {
      p = i / n; bx = (1 - p) * (1 - p) * x0 + 2 * (1 - p) * p * cx + p * p * x1; by = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * y1;
      var tx = 2 * (1 - p) * (cx - x0) + 2 * p * (x1 - cx), ty = 2 * (1 - p) * (cy - y0) + 2 * p * (y1 - cy), tl = Math.hypot(tx, ty) || 1, mx = -ty / tl, my = tx / tl;
      ww = w * Math.min(1, 0.35 + p * 5) * (1 - pow(p, 1.25)) * (0.72 + 0.28 * hash(i, seed)) + 0.5;                 // 笔头鼓、笔尾细
      jj = (hash(i, seed + 5) - 0.5) * w * 0.3; L1.push(bx + mx * (ww + jj), by + my * (ww + jj));
      jj = (hash(i, seed + 7) - 0.5) * w * 0.3; L2.push(bx - mx * (ww * 0.85 + jj), by - my * (ww * 0.85 + jj));
    }
    c.fillStyle = 'rgba(' + rgb + ',' + cl(a, 0, 1) + ')'; c.beginPath(); c.moveTo(L1[0], L1[1]);
    for (i = 2; i < L1.length; i += 2) c.lineTo(L1[i], L1[i + 1]);
    for (i = L2.length - 2; i >= 0; i -= 2) c.lineTo(L2[i], L2[i + 1]);
    c.closePath(); c.fill();
    if (w > 5) {                                             // 飞白：中段几道细浅线
      c.strokeStyle = 'rgba(' + P.PAPER + ',' + 0.45 * cl(a, 0, 1) + ')'; c.lineWidth = Math.max(0.8, w * 0.07); c.lineCap = 'round';
      for (i = 0; i < 3; i++) { var o = (hash(i, seed + 2) - 0.5) * w * 0.9, s0 = 0.2 + 0.25 * hash(i, seed + 3), s1 = s0 + 0.2 + 0.25 * hash(i, seed + 4); c.beginPath(); c.moveTo(x0 + dx * s0 + nx * o, y0 + dy * s0 + ny * o); c.lineTo(x0 + dx * s1 + nx * o, y0 + dy * s1 + ny * o); c.stroke(); }
      c.lineCap = 'butt';
    }
  };
  /* 点缀色的一笔：下面一层淡色“洇开”，上面一道细墨线压住，颜色像是墨里兑了颜料 */
  P.cstroke = function (c, x0, y0, x1, y1, w, acc, a, seed, bend) {
    bend = bend === undefined ? (hash(seed, 61) - 0.5) * 0.36 : bend;
    P.stroke(c, x0, y0, x1, y1, w * 0.85, acc, a * 0.55, seed, bend);
    P.stroke(c, x0, y0, x1, y1, w * 0.38, P.INK, a * 0.85, seed + 17, bend);
  };
  /* 墨团：一堆重叠椭圆 + 周围溅点；nd = 溅点数 */
  P.blot = function (c, x, y, R, rgb, a, seed, nd, flat) {
    if (a <= 0.004 || R < 1) return; flat = flat || 0.55; c.fillStyle = 'rgba(' + rgb + ',' + cl(a, 0, 1) + ')'; var i;
    for (i = 0; i < 7; i++) { var an = hash(i, seed) * PI2, d = R * 0.45 * hash(i, seed + 1); c.beginPath(); c.ellipse(x + cos(an) * d, y + sin(an) * d * flat, R * (0.45 + 0.4 * hash(i, seed + 2)), R * flat * (0.45 + 0.4 * hash(i, seed + 3)), hash(i, seed + 4) * PI, 0, PI2); c.fill(); }
    nd = nd === undefined ? Math.max(3, Math.round(14 * P.q())) : nd;
    for (i = 0; i < nd; i++) { var a2 = hash(i, seed + 6) * PI2, d2 = R * (0.9 + 0.8 * hash(i, seed + 7)); c.beginPath(); c.arc(x + cos(a2) * d2, y + sin(a2) * d2 * flat, 1.2 + 3 * hash(i, seed + 8) * Math.min(1, R / 30), 0, PI2); c.fill(); }
  };
  /* 断续的毛笔圆圈（枯笔 / 留白）：n 段弧，每段粗细渐变、边缘毛躁；ry = 纵向压扁比例 */
  P.ring = function (c, x, y, r, w, rgb, a, seed, n, ry, rot) {
    if (a <= 0.004 || r < 2) return; n = n || 5; ry = ry || 1; rot = rot || 0; c.fillStyle = 'rgba(' + rgb + ',' + cl(a, 0, 1) + ')';
    for (var s = 0; s < n; s++) {
      var a0 = rot + s / n * PI2 + hash(s, seed) * 0.25, a1 = a0 + PI2 / n * (0.55 + 0.35 * hash(s, seed + 1)), m = 8, i, ox = [], oy = [], ix = [], iy = [];
      for (i = 0; i <= m; i++) {
        var p = i / m, an = a0 + (a1 - a0) * p, ww = w * sin(PI * pow(p, 0.8)) * (0.6 + 0.4 * hash(i + s * 9, seed + 2)) + 0.5, rr = r + (hash(i + s * 9, seed + 3) - 0.5) * w * 0.4;
        ox.push(x + cos(an) * (rr + ww)); oy.push(y + sin(an) * (rr + ww) * ry); ix.push(x + cos(an) * (rr - ww)); iy.push(y + sin(an) * (rr - ww) * ry);
      }
      c.beginPath(); c.moveTo(ox[0], oy[0]); for (i = 1; i <= m; i++) c.lineTo(ox[i], oy[i]); for (i = m; i >= 0; i--) c.lineTo(ix[i], iy[i]);
      c.closePath(); c.fill();
    }
  };
  /* ---------- v0.8 宝箱 / 道具 / 卡牌共用 ---------- */
  /* 宣纸卡面：米色纸 + 点缀色洇的上半块 + 四笔浓墨边（笔头重笔尾细，四角不闭合）+ 内侧一道稀薄的稀有度色细线。edge = 稀有度色，wash = 套系色 */
  P.card = function (c, x, y, w, h, edge, wash, a, seed, lw, paper) {
    a = a === undefined ? 1 : a; lw = lw || 2.6; var hx = x - w / 2, hy = y - h / 2, i, ea = P.mix(P.rgb(edge), 0.12), wa = P.mix(P.rgb(wash), 0.12);
    c.save(); c.globalAlpha = c.globalAlpha * a; c.fillStyle = paper || '#fffaf0'; c.beginPath(); c.moveTo(hx + 3, hy); c.lineTo(hx + w - 3, hy); c.lineTo(hx + w, hy + 3); c.lineTo(hx + w, hy + h - 3); c.lineTo(hx + w - 3, hy + h); c.lineTo(hx + 3, hy + h); c.lineTo(hx, hy + h - 3); c.lineTo(hx, hy + 3); c.closePath(); c.fill(); c.restore();
    var ga = c.globalAlpha; c.globalAlpha = 1;
    P.blot(c, x, hy + h * (w > 80 ? 0.2 : 0.27), Math.min(w * 0.46, h * 0.3), wa, (w > 80 ? 0.14 : 0.62) * ga * a, seed, 0, 0.62);     // 大卡面只淡淡洇一层，不盖字                    // 上半块：套系色洇开的一团
    var s0 = hash(seed, 3) * 3, o = lw * 0.5;
    P.stroke(c, hx + 1, hy + o, hx + w - 1, hy + o + s0 * 0.3, lw * 1.25, P.INK, 0.9 * ga * a, seed + 1, 0.01);
    P.stroke(c, hx + w - o, hy + 1, hx + w - o - s0 * 0.3, hy + h - 1, lw * 1.2, P.INK, 0.88 * ga * a, seed + 2, 0.01);
    P.stroke(c, hx + w - 1, hy + h - o, hx + 1, hy + h - o - s0 * 0.3, lw * 1.25, P.INK, 0.9 * ga * a, seed + 3, 0.01);
    P.stroke(c, hx + o, hy + h - 1, hx + o + s0 * 0.3, hy + 1, lw * 1.2, P.INK, 0.88 * ga * a, seed + 4, 0.01);
    c.strokeStyle = 'rgba(' + ea + ',' + 0.85 * ga * a + ')'; c.lineWidth = Math.max(1, lw * 0.45); c.beginPath(); c.rect(hx + lw + 1.5, hy + lw + 1.5, w - 2 * lw - 3, h - 2 * lw - 3); c.stroke();
    c.globalAlpha = ga;
  };
  /* 水墨描边的闭合路径填充：fill 一层淡色，再用 INK 描边；路径由调用者先 beginPath() 画好 */
  P.fillInk = function (c, fill, a, lw) { c.fillStyle = fill; c.globalAlpha = c.globalAlpha * (a === undefined ? 1 : a); c.fill(); c.lineJoin = 'round'; c.strokeStyle = 'rgba(' + P.INK + ',0.88)'; c.lineWidth = lw || 1.6; c.stroke(); };
  /* 飞溅墨点：从 (x,y) 向外 nd 个点，距离 d0–d1，大小 r0–r1 */
  P.dots = function (c, x, y, d0, d1, nd, r0, r1, rgb, a, seed, flat) {
    if (a <= 0.004) return; flat = flat || 1; c.fillStyle = 'rgba(' + rgb + ',' + cl(a, 0, 1) + ')';
    for (var i = 0; i < nd; i++) { var an = hash(i, seed) * PI2, d = d0 + (d1 - d0) * hash(i, seed + 1); c.beginPath(); c.arc(x + cos(an) * d, y + sin(an) * d * flat, r0 + (r1 - r0) * hash(i, seed + 2), 0, PI2); c.fill(); }
  };
  /* 一圈向外甩的笔触（命中 / 冲击）：n 笔从半径 r0 甩到 r1，三分之一用点缀色 */
  P.splash = function (c, x, y, r0, r1, n, w, acc, a, seed, flat) {
    flat = flat || 1;
    for (var i = 0; i < n; i++) {
      var an = i / n * PI2 + hash(i, seed) * 0.5, ra = r0 + (r1 - r0) * 0.15 * hash(i, seed + 1), rb = r0 + (r1 - r0) * (0.55 + 0.45 * hash(i, seed + 2)), ww = w * (0.6 + 0.6 * hash(i, seed + 3));
      if (i % 3 === 0 && acc) P.cstroke(c, x + cos(an) * ra, y + sin(an) * ra * flat, x + cos(an) * rb, y + sin(an) * rb * flat, ww, acc, a, seed + i);
      else P.stroke(c, x + cos(an) * ra, y + sin(an) * ra * flat, x + cos(an) * rb, y + sin(an) * rb * flat, ww * 0.8, P.INK, a * 0.85, seed + i);
    }
  };
})();
