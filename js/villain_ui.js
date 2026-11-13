/* ============================================================
 * villain_ui.js —— v0.9 反派模式界面：反派关 HUD / 牛魔王 / 洞府标记 / 小妖画法 / 反派首页 / 小妖进化页 / 结算页 / 新玩法提示 / 「不服气」过场
 * 全部是浅色水墨风（宣纸白底 + 墨线 + 金边），按 CSS 像素排版（先 scale(1/zoom)），按钮高 ≥ 44 CSS px。
 * 美术只用 villain/evo（48 张五阶外形）和 villain/icons（技能 / 素材图标），第一次进反派页才按需加载。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, T = R.T, rrect = R.rrect, ui = XY.ui, VD = XY.VD, V = XY.villain, PI2 = Math.PI * 2, S = XY.save;
  var VU = XY.villainUI = { page: 'home', sel: 'ranged', msg: null, imgReq: 0, imgOk: 0 };
  var INK = '#3a3226', SOFT = '#6d6455', GOLD = '#c9a24a', PUR = '#6f4aa8', PAPER = '#fffdf6';
  function app() { return window.__xy.app; }
  /* ---------- 文字：不够宽就缩字号；换行按字 ---------- */
  function txt(c, s, x, y, sz, col, al, bold, maxW) {
    if (maxW) { c.font = R.font(sz, bold); var w = c.measureText(String(s)).width; if (w > maxW) sz = Math.max(9, sz * maxW / w - 0.2); }
    R.txt(c, s, x, y, sz, col, al, bold);
  }
  function wrap(c, s, x, y, w, lh, sz, col, bold, maxLines) {
    c.font = R.font(sz, bold); var lines = [], cur = '', i, ch;
    s = String(s);
    for (i = 0; i < s.length; i++) { ch = s[i]; if (ch === '\n') { lines.push(cur); cur = ''; continue; } if (c.measureText(cur + ch).width > w) { lines.push(cur); cur = ch; } else cur += ch; }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…'); }
    lines.forEach(function (l, k) { R.txt(c, l, x, y + k * lh, sz, col, 'left', bold); });
    return lines.length * lh;
  }
  VU.wrap = wrap; VU.txt = txt;
  /* ---------- 按需图片 ---------- */
  var IMG = {};
  function img(path) {
    var o = IMG[path];
    if (!o) { o = IMG[path] = new Image(); VU.imgReq++; o.onload = function () { VU.imgOk++; }; o.src = 'villain/' + path; }
    return o.complete && o.naturalWidth ? o : null;
  }
  VU.img = img;
  function drawImg(c, path, x, y, w, h) {                       // 等比放进 (x,y,w,h)，底部居中；没加载好先空着，不画圆头
    var i = img(path);
    if (!i) return false;
    var k = Math.min(w / i.naturalWidth, h / i.naturalHeight), dw = i.naturalWidth * k, dh = i.naturalHeight * k;
    c.drawImage(i, x + (w - dw) / 2, y + h - dh, dw, dh); return true;
  }
  VU.drawImg = drawImg;
  function ser() { return VD.ser(); }
  function ovr(a, x, y, w, h, z) { return a.mouse && a.mouse.x * z >= x && a.mouse.x * z <= x + w && a.mouse.y * z >= y && a.mouse.y * z <= y + h; }

  /* ---------- 页面框架（CSS 像素）---------- */
  var IP = XY.INKP;
  function hsh(i, k) { return IP.hash(i, k); }
  /* 淡墨晕染：椭圆径向渐变（rgb 为 'r,g,b'） */
  function washE(c, cx, cy, rx, ry, rgb, a) {
    c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, rx * 0.05, 0, 0, rx); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(0.6, 'rgba(' + rgb + ',' + a * 0.45 + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, PI2); c.fill(); c.restore();
  }
  /* 远山：三层淡墨山脊，画在 (x,y,w,h) 里（调用者先 clip） */
  function hills(c, x, y, w, h, rgb, a, seed) {
    for (var L = 0; L < 3; L++) {
      var base = y + h * (0.5 + 0.17 * L), amp = h * (0.34 - 0.07 * L), n = 6, i, pts = [];
      for (i = 0; i <= n; i++) pts.push([x + w * i / n, base - amp * (0.2 + 0.8 * hsh(i + L * 11, seed))]);
      c.fillStyle = 'rgba(' + rgb + ',' + a * (0.55 + 0.3 * L) + ')'; c.beginPath(); c.moveTo(x, y + h); c.lineTo(pts[0][0], pts[0][1]);
      for (i = 1; i <= n; i++) { var mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2; c.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, my); }
      c.lineTo(x + w, pts[n][1]); c.lineTo(x + w, y + h); c.closePath(); c.fill();
    }
  }
  /* ---------- 水墨按钮原语（v0.9 ui3b）：朱红方印 / 毛笔横条 / 竹简返回 / 小圆印 / 墨签；边缘一律手抖，不画完美圆角矩形 ---------- */
  function sh(s) { var h = 0, i; s = String(s); for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h + 1; }
  /* 手抖的矩形路径：四角各切一刀（大小不一），每 ~7px 一个点，边上有 ±j 的起伏 */
  function wob(c, x, y, w, h, seed, j, cutK) {
    var cu = [], k = 0, i, s, P = [], m = Math.min(w, h) * (cutK === undefined ? 0.07 : cutK);
    for (i = 0; i < 4; i++) cu.push(m * (0.5 + hsh(seed + i, 17)));
    var v = [[x + cu[0], y], [x + w - cu[1], y], [x + w, y + cu[1]], [x + w, y + h - cu[2]], [x + w - cu[2], y + h], [x + cu[3], y + h], [x, y + h - cu[3]], [x, y + cu[0]]];
    for (s = 0; s < 8; s++) {
      var a = v[s], b = v[(s + 1) % 8], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.round(L / 7));
      for (i = 0; i < n; i++) { var t = i / n, d = (hsh(k++, seed) - 0.5) * 2 * j; P.push([a[0] + dx * t - dy / L * d, a[1] + dy * t + dx / L * d]); }
    }
    c.beginPath(); P.forEach(function (p, q) { if (q) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
  }
  function wobC(c, cx, cy, rx, ry, seed, j) {
    var n = 22, i; c.beginPath();
    for (i = 0; i < n; i++) { var an = i / n * PI2, d = 1 + (hsh(i, seed) - 0.5) * 2 * j / Math.max(rx, 1), px = cx + Math.cos(an) * rx * d, py = cy + Math.sin(an) * ry * d; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.closePath();
  }
  /* 印章：style = solid（朱红实印，白字）/ line（朱砂细边阴印，红字）/ ghost（虚印：淡墨虚线，不可用）；o.sub = 下面一行小字；两个字且接近方形就上下叠着写 */
  function drawSeal(c, x, y, w, h, label, o) {
    o = o || {}; var sd = o.seed || sh(label), sty = o.style || 'solid', col = o.col || '#b8322a', rgb = IP.rgb(col), s = String(label), i;
    var rot = o.rot !== undefined ? o.rot : (hsh(sd, 9) - 0.5) * 0.1, hx = -w / 2, hy = -h / 2;
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot);
    if (sty !== 'ghost') washE(c, 0, h / 2 + 2, w * 0.62, Math.max(4, h * 0.1), '58,50,38', 0.2);
    wob(c, hx, hy, w, h, sd, 1.1, 0.08);
    if (sty === 'solid') {
      c.fillStyle = col; c.fill(); c.lineJoin = 'round';
      c.save(); c.clip();
      var g = c.createLinearGradient(hx, hy, hx + w, hy + h); g.addColorStop(0, 'rgba(255,210,180,0.12)'); g.addColorStop(1, 'rgba(60,10,6,0.24)'); c.fillStyle = g; c.fillRect(hx, hy, w, h);
      if (o.hv) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(hx, hy, w, h); }
      var n = Math.round(w * h / 100); c.fillStyle = 'rgba(255,246,228,0.42)';
      for (i = 0; i < n; i++) { c.beginPath(); c.arc(hx + hsh(i, sd + 1) * w, hy + hsh(i, sd + 2) * h, 0.5 + hsh(i, sd + 3) * 1.3, 0, PI2); c.fill(); }
      c.strokeStyle = 'rgba(255,246,228,0.30)'; c.lineWidth = 1;
      for (i = 0; i < 3; i++) { var sy = hy + h * (0.2 + 0.3 * i + 0.1 * hsh(i, sd + 4)), sx = hx + w * (0.05 + 0.4 * hsh(i, sd + 5)); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + w * (0.2 + 0.25 * hsh(i, sd + 6)), sy + 1.2); c.stroke(); }
      c.restore();
      if (w > 34 && h > 34) { c.save(); c.strokeStyle = 'rgba(255,240,220,0.6)'; c.lineWidth = 1; c.setLineDash([w * 0.42, 3, w * 0.2, 4]); wob(c, hx + 4, hy + 4, w - 8, h - 8, sd + 5, 0.6, 0.04); c.stroke(); c.restore(); }
    } else if (sty === 'line') {
      c.fillStyle = o.hv ? 'rgba(255,240,212,0.97)' : 'rgba(255,249,236,0.94)'; c.fill(); c.lineJoin = 'round'; c.strokeStyle = 'rgba(' + rgb + ',0.9)'; c.lineWidth = 2.3; c.stroke();
      if (w > 34 && h > 34) { c.strokeStyle = 'rgba(' + rgb + ',0.42)'; c.lineWidth = 0.9; wob(c, hx + 4, hy + 4, w - 8, h - 8, sd + 7, 0.7, 0.04); c.stroke(); }
    } else {
      c.save(); c.strokeStyle = 'rgba(58,50,38,0.34)'; c.lineWidth = 1.6; c.setLineDash([6, 4]); c.stroke(); c.restore();
    }
    var tc = sty === 'solid' ? '#fff4e0' : sty === 'line' ? col : 'rgba(58,50,38,0.5)';
    if (o.sub) { var ms = o.sz || Math.min(22, h * 0.34); txt(c, s, 0, -h * 0.15, ms, tc, 'center', true, w - 12); txt(c, o.sub, 0, h * 0.27, 12, tc, 'center', true, w - 10); }
    else if (o.stack !== false && s.length === 2 && w <= h * 1.2) { var ss = o.sz || Math.min(h * 0.36, w * 0.4); txt(c, s.charAt(0), 0, -ss * 0.52, ss, tc, 'center', true); txt(c, s.charAt(1), 0, ss * 0.52 + 1, ss, tc, 'center', true); }
    else txt(c, s, 0, 1, o.sz || Math.min(18, Math.max(10, h * 0.4)), tc, 'center', true, w - 8);
    c.restore();
  }
  /* 毛笔横条：一笔淡墨，左头钝、右尾带飞白和甩尖，边缘毛；h 是点击高度，画出来的墨条略矮 */
  function drawBrush(c, x, y, w, h, label, o) {
    o = o || {}; var sd = o.seed || sh(label), rgb = o.rgb || '58,50,38', vh = o.vh || Math.min(h, 36), y0 = y + (h - vh) / 2, i, n = Math.max(6, Math.round(w / 7)), tp = [], bt = [];
    var a = o.off ? 0.03 : (o.strong ? 0.1 : 0.04) + (o.hv ? 0.04 : 0);
    for (i = 0; i <= n; i++) {
      var p = i / n, tl = p > 0.8 ? (p - 0.8) / 0.2 : 0, jx = (i < 2 ? 2.4 : 1.1), px = x + w * p;
      tp.push([px, y0 + tl * tl * vh * 0.5 + (hsh(i, sd) - 0.5) * 2 * jx + (p < 0.05 ? 2 : 0)]);
      bt.push([px, y0 + vh - tl * vh * 0.04 + (hsh(i, sd + 3) - 0.5) * 2 * jx - (p < 0.05 ? 1.5 : 0)]);
    }
    c.save(); c.beginPath(); tp.forEach(function (q, k) { if (k) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); for (i = n; i >= 0; i--) c.lineTo(bt[i][0], bt[i][1]); c.closePath();
    c.fillStyle = 'rgba(' + rgb + ',' + a + ')'; c.fill();
    c.save(); c.clip(); c.strokeStyle = 'rgba(255,250,236,' + (o.off ? 0.3 : 0.55) + ')'; c.lineWidth = 1;
    for (i = 0; i < 4; i++) { var sy = y0 + vh * (0.18 + 0.2 * i + 0.08 * hsh(i, sd + 4)), sx = x + w * (0.1 + 0.5 * hsh(i, sd + 5)); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + w * (0.2 + 0.3 * hsh(i, sd + 6)), sy + 1); c.stroke(); }
    c.restore();
    if (!o.off) {
      IP.stroke(c, x + 3, y0 + vh - 2, x + w - 8, y0 + vh - 1.5, Math.max(2.5, vh * 0.1), rgb, o.hv ? 0.75 : 0.55, sd, 0.015);
      IP.stroke(c, x + 8, y0 + 2.5, x + w * 0.6, y0 + 3, 1.8, rgb, 0.3, sd + 3, 0.02);
      IP.dots(c, x + w - 1, y0 + vh * 0.6, 3, 10, 3, 0.8, 1.7, rgb, 0.5, sd);
      IP.blot(c, x + 7, y0 + vh * 0.5, vh * 0.55, rgb, o.strong ? 0.2 : 0.13, sd + 9, 0, 0.8);
    }
    var tc = o.off ? 'rgba(58,50,38,0.5)' : INK; txt(c, label, x + w * 0.47, y0 + vh / 2 + 1, o.sz || 16, tc, 'center', true, w - 26);
    c.restore();
  }
  /* 返回：一条竹简，两道绳扣，略斜 */
  function drawBack(c, x, y, w, h, o) {
    drawBrush(c, x, y, w, h, '返回', { hv: o && o.hv, strong: true, sz: 16, rgb: '42,32,24', vh: Math.min(36, h) });
  }
  /* 更多：一团淡墨 + 三个墨点（不画圆框，免得像聊天气泡） */
  function drawDot(c, x, y, w, h, label, o) {
    o = o || {}; var cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 3;
    c.save(); IP.blot(c, cx, cy, r * 0.95, '58,50,38', o.hv ? 0.3 : 0.2, 91, 4, 0.92);
    IP.ring(c, cx, cy, r * 0.92, 2.2, '58,50,38', 0.5, 93, 4, 0.95, 0.6);
    c.fillStyle = INK; if (label === '\u22ef') { for (var i = -1; i <= 1; i++) { c.beginPath(); c.arc(cx + i * 7.5, cy, 2.5, 0, PI2); c.fill(); } } else txt(c, label, cx, cy + 1, 15, INK, 'center', true, w - 14);
    c.restore();
  }
  /* 墨签：小标签 / 药丸的替代，手抖边 + 底边一笔浓墨 */
  function drawTag(c, x, y, w, h, label, col, o) {
    o = o || {}; var sd = o.seed || sh(label || (x + ',' + y)), rgb = IP.rgb(col || '#c9a24a');
    c.save(); if (o.rot) { c.translate(x + w / 2, y + h / 2); c.rotate(o.rot); c.translate(-x - w / 2, -y - h / 2); }
    wob(c, x, y, w, h, sd, 0.9, o.cutK || 0.2); c.fillStyle = o.fill || 'rgba(255,251,238,0.9)'; c.fill();
    c.lineJoin = 'round'; c.lineWidth = 1.3; c.strokeStyle = 'rgba(' + rgb + ',0.8)'; c.stroke();
    IP.stroke(c, x + 4, y + h - 1.5, x + w - 5, y + h - 1, 2.2, rgb, 0.45, sd + 3, 0.02);
    if (label) txt(c, label, x + w / 2, y + h / 2 + 1, o.sz || 12, o.tc || col || INK, 'center', true, w - 10);
    c.restore();
  }
  VU.drawSeal = drawSeal; VU.drawBrush = drawBrush; VU.drawBack = drawBack; VU.drawDot = drawDot; VU.drawTag = drawTag;
  /* 装饰用小方章（反派关 / 五阶进化 / 入口 / 洞府 …） */
  function seal(c, x, y, w, h, label, col, sz) { drawSeal(c, x, y, w, h, label, { col: col, sz: sz, rot: -0.045 + (hsh(sh(label), 4) - 0.5) * 0.03 }); }
  /* 毛笔一横（标题下面的墨痕） */
  function brush(c, x, y, len, w, a, seed, rgb) { IP.stroke(c, x, y, x + len, y + 1.5, w, rgb || '58,50,38', a, seed || 3, 0.02); }
  /* 大立绘卡：宣纸 + 四笔浓墨边（同组牌页的卡面）；o.on 选中 = 金边 + 紫墨洇 + 抬起 */
  function artCard(c, x, y, w, h, o) {
    o = o || {}; var seed = o.seed || 7, lw = o.lw || Math.max(2.4, Math.min(h, w) * 0.028);
    c.save();
    c.fillStyle = 'rgba(58,50,38,' + (o.on ? 0.16 : 0.09) + ')'; rrect(c, x + 2, y + 4, w, h, 8); c.fill();
    if (o.on) washE(c, x + w / 2, y + h / 2, w * 0.78, h * 0.7, '201,162,74', 0.38);
    IP.card(c, x + w / 2, y + h / 2, w, h, o.edge || (o.on ? '#c9a24a' : '#8a7a58'), o.wash || '#c9a24a', 1, seed, lw, o.paper || (o.dim ? '#efebe0' : '#fffaf0'));
    if (o.on) { c.lineWidth = 2.4; c.strokeStyle = '#d4a02a'; rrect(c, x + 1.5, y + 1.5, w - 3, h - 3, 6); c.stroke(); }
    c.restore();
  }
  function begin(c, a) {
    var z = a.zoom || 1, u = 1 / z, st = { z: z, u: u, cw: a.lw * z, ch: a.lh * z };
    c.save(); c.scale(u, u);
    st.hit = function (x, y, w, h, act, ex) { var o = { x: x * u, y: y * u, w: w * u, h: h * u, act: act }, k; if (ex) for (k in ex) o[k] = ex[k]; ui.hits.push(o); };
    st.over = function (x, y, w, h) { return ovr(a, x, y, w, h, z); };
    st.btn = function (x, y, w, h, label, act, o) {
      o = o || {}; h = Math.max(h, 44); var on = o.off !== true, hv = on && st.over(x, y, w, h);
      if (o.back) drawBack(c, x, y, w, h, { hv: hv });
      else if (o.dot) drawDot(c, x, y, w, h, label, { hv: hv, col: o.col });
      else if (o.seal || o.pri) drawSeal(c, x, y, w, h, label, { style: !on ? 'ghost' : o.pri ? 'solid' : 'line', hv: hv, sz: o.sz, rot: o.rot, col: o.col, stack: o.stack, sub: o.sub });
      else drawBrush(c, x, y, w, h, label, { hv: hv, off: !on, sz: o.sz, rgb: o.rgb, strong: o.strong, vh: o.vh });
      if (on || o.hitOff) st.hit(x, y, w, h, act, o.ex || (o.id !== undefined ? { id: o.id } : null));
    };
    st.end = function () { c.restore(); };
    return st;
  }
  VU.begin = begin;
  /* 页面底：整页宣纸 + 远山 + 淡墨晕 + 几笔云；不画框、不画表头条（v0.9 ui3） */
  function paperBg(c, st, o) {
    o = o || {}; var cw = st.cw, ch = st.ch, g = c.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#fcf7e8'); g.addColorStop(1, '#efe4c8'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    washE(c, cw * 0.78, ch * 0.2, cw * 0.5, ch * 0.36, o.rgb || '201,162,74', 0.15);
    washE(c, cw * 0.18, ch * 0.78, cw * 0.46, ch * 0.3, o.rgb2 || '111,74,168', 0.07);
    c.save(); hills(c, 0, ch * 0.48, cw, ch * 0.52, '110,98,80', 0.09, o.seed || 5); c.restore();
    IP.stroke(c, cw * 0.06, ch * 0.2, cw * 0.3, ch * 0.2 + 3, 5, '120,108,88', 0.08, 41, 0.02); IP.stroke(c, cw * 0.55, ch * 0.12, cw * 0.86, ch * 0.12 + 2, 4, '120,108,88', 0.07, 43, 0.02);
  }
  VU.paperBg = paperBg;
  function pill(c, x, y, w, h, label, col, rot) {
    drawTag(c, x, y, w, h, '', col, { fill: 'rgba(255,251,238,0.9)', rot: rot, seed: sh(label.slice(0, 2)), cutK: 0.3 });
    c.fillStyle = col; c.globalAlpha = 0.85; c.beginPath(); c.arc(x + 11, y + h / 2, 3.6, 0, PI2); c.fill(); c.globalAlpha = 1;
    txt(c, label, x + w / 2 + 6, y + h / 2 + 1, 13, col, 'center', true, w - 30);
  }
  /* 页头：返回 + 反字印 + 大标题 + 两枚钱袋药丸；不是表头横条（页面是整张纸，标题直接写在纸上） */
  function frame(c, a, st, title, sub, backAct, shortTitle, o) {
    paperBg(c, st, o);
    var narrow = st.cw < 520, x0 = 10;
    st.btn(x0, 6, 76, 44, '返回', backAct, { back: true }); x0 += 86;
    if (!narrow) { seal(c, x0, 11, 34, 34, '反', PUR, 20); x0 += 42; }
    var tw = st.cw - x0 - 160, t = narrow && shortTitle ? shortTitle : title;
    txt(c, t, x0, sub && !narrow ? 24 : 28, narrow ? 22 : 26, INK, 'left', true, tw);
    brush(c, x0, sub && !narrow ? 36 : 42, Math.min(tw, 120), 4, 0.26, 7);
    if (sub && !narrow) txt(c, sub, x0, 48, 12.5, SOFT, 'left', false, tw);
    var s = ser(), pw = 104;
    pill(c, st.cw - 8 - pw - 6, 6, pw + 6, 22, '妖金 ' + s.wallet.yaojin, '#a8700a', -0.012); pill(c, st.cw - 8 - pw - 16, 31, pw - 4, 22, '妖丹 ' + s.wallet.yaodan, PUR, 0.014);
    return x0;
  }
  function toast(c, st, a, y) {
    if (!(VU.msg && a.rt < VU.msg.until)) return;
    var w = Math.min(st.cw - 60, 520), x = (st.cw - w) / 2, bad = VU.msg.bad;
    drawTag(c, x, y, w, 30, '', bad ? '#b33a2a' : '#2f7d3b', { fill: bad ? 'rgba(255,238,232,0.98)' : 'rgba(242,252,240,0.98)', seed: 5, cutK: 0.3 });
    c.save();
    c.font = R.font(13, true); c.fillStyle = bad ? '#b33a2a' : '#2f7d3b';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(XY.fmtStr(VU.msg.text), st.cw / 2, y + 16, w - 20);
    c.restore();
  }
  VU.toast = toast;
  function chip(c, x, y, w, h, label, col, fill) { drawTag(c, x, y, w, h, label, col || GOLD, { fill: fill || '#f6efdc', sz: 12, tc: col || INK }); }
  /* 宣纸笺：替代 R.panel 的完美圆角金框（HUD / 提示 / 结算卡） */
  function paperCard(c, x, y, w, h, o) {
    o = o || {}; artCard(c, x, y, w, h, { seed: o.seed || 19, edge: o.edge || '#a8905a', lw: o.lw || 2.4, wash: o.wash || '#c9a24a', paper: o.paper || 'rgba(255,253,246,0.96)', on: o.on });
  }
  VU.paperCard = paperCard;
  VU.frame = frame; VU.chip = chip; VU.seal = seal; VU.washE = washE; VU.hills = hills; VU.artCard = artCard; VU.brush = brush;
  /* 素材印章条：卷轴样式，每种素材一枚圆印 + 数量；不是表格 */
  function stockStrip(c, x, y, w, h, s) {
    var n = VD.MAT_ORDER.length, i;
    c.save(); rrect(c, x + 8, y, w - 16, h, 8); c.fillStyle = '#f5ecd2'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#c6b27e'; c.stroke();
    [x, x + w - 12].forEach(function (rx) { rrect(c, rx, y - 2, 12, h + 4, 6); c.fillStyle = '#9c7a44'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#5a4528'; c.stroke(); });
    var rows = h > 40 ? 2 : 1, per = Math.ceil(n / rows), cw = (w - 36) / per, rh = h / rows;
    VD.MAT_ORDER.forEach(function (m, k) {
      var cx = x + 18 + (k % per) * cw, cy = y + Math.floor(k / per) * rh + rh / 2, have = s.mats[m] || 0, d = Math.min(24, rh - 6);
      c.globalAlpha = have > 0 ? 1 : 0.45; c.fillStyle = '#fffdf6'; c.beginPath(); c.arc(cx + d / 2, cy, d / 2 + 1.5, 0, PI2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#b9a77a'; c.stroke();
      drawImg(c, 'icons/mat_' + m + '.png', cx + 2, cy - d / 2 + 2, d - 4, d - 4);
      txt(c, have, cx + d + 4, cy + 1, 12, have > 0 ? INK : '#8a8576', 'left', true, cw - d - 6); c.globalAlpha = 1;
    });
    c.restore();
  }

  /* ---------- 战场：牛魔王 / 洞府 / 小妖 ---------- */
  var NIU = {};
  function niuSpr(name) {
    var o = NIU[name];
    if (!o) { o = NIU[name] = new Image(); o.src = 'bossfight/assets/spr/niumo/' + name + '.webp'; }
    return o.complete && o.naturalWidth ? o : null;
  }
  function drawNiumoWild(c, h, rt, x, y, r, face) {
    var W = XY.wildAnim;
    if (!W || !W.ready || !W.frameAt || !W.ready('niumo', 'idle')) return false;
    if (h.down || h.dash) return false;
    var hdN0 = XY.chibi && XY.chibi.hd && XY.chibi.hd('niumo');
    if (hdN0 && !(h.atkT > 0) && !(h.hurtT > 0.05)) {
      var pose0 = h.moving && XY.chibi.stepPose ? XY.chibi.stepPose(h, rt) : null;
      c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.translate(x + (pose0 ? pose0.sway : 0), y + r * 0.9 - (pose0 ? pose0.bob : 0)); c.rotate(pose0 ? pose0.rot : 0); c.scale(face * (pose0 ? pose0.sx : 1), pose0 ? pose0.sy : 1);
      var dh0 = r * 2.7, dw0 = hdN0.naturalWidth * dh0 / hdN0.naturalHeight; c.drawImage(hdN0, -dw0 / 2, -dh0, dw0, dh0);
      c.restore(); return true;
    }
    var prev = h._nAtkSeen;
    if (prev != null && h.atkMax > 0.25 && (h.atkT || 0) > prev + 0.15 && W.ready('niumo', 'attack')) {
      h._nAtk0 = rt; h._nAtkDur = ((W.clip('niumo', 'attack').durationMs || 667) / 1000);
    }
    h._nAtkSeen = h.atkT;
    var clipName = 'idle', tMs = rt * 1000 + (h.bob || 0) * 800;
    if (h.hurtT > 0.05 && !h._nHit0 && W.ready('niumo', 'hit')) h._nHit0 = rt;
    if (!(h.hurtT > 0) && h._nHit0 && rt - h._nHit0 > 0.45) h._nHit0 = 0;
    if (h._nHit0 && W.ready('niumo', 'hit') && rt - h._nHit0 < ((W.clip('niumo', 'hit').durationMs || 417) / 1000)) { clipName = 'hit'; tMs = (rt - h._nHit0) * 1000; }
    else if (h._nAtk0 != null && rt - h._nAtk0 < (h._nAtkDur || 0) && W.ready('niumo', 'attack')) { clipName = 'attack'; tMs = (rt - h._nAtk0) * 1000; }
    var clip = W.clip('niumo', clipName), im = W.img('niumo', clipName);
    if (!clip || !im || !im.naturalWidth) return false;
    var fr = W.frameAt(clip, tMs), cw = clip.cell[0], ch = clip.cell[1], col = fr.index % clip.cols, row = (fr.index / clip.cols) | 0;
    var k = r * 3.15 / (clip.stand || 480) * (clip.fit || 1);
    var pose = (h.moving && clipName === 'idle' && XY.chibi && XY.chibi.stepPose) ? XY.chibi.stepPose(h, rt) : null;
    var hdN = XY.chibi && XY.chibi.hd && XY.chibi.hd('niumo');
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.translate(x + (pose ? pose.sway : 0), y + r * 0.9 - (pose ? pose.bob : 0)); c.rotate(pose ? pose.rot : 0); c.scale(face * (pose ? pose.sx : 1), pose ? pose.sy : 1);
    if (hdN && clipName === 'idle') { var dh = r * 2.7, dw = hdN.naturalWidth * dh / hdN.naturalHeight; c.drawImage(hdN, -dw / 2, -dh, dw, dh); }
    else c.drawImage(im, col * cw, row * ch, cw, ch, -clip.anchor[0] * k, -clip.anchor[1] * k, cw * k, ch * k);
    c.restore();
    return true;
  }
  VU.drawNiumo = function (c, G, h, rt) {
    var x = h.x, y = h.y, r = h.def.r, face = Math.cos(h.face || 0) >= 0 ? 1 : -1;
    var pose = 'idle_a';
    if (h.down) pose = 'ko';
    else if (h.hurtT > 0) pose = 'hit';
    else if (h.dash) pose = 'rush';
    else if (h.atkT > 0) pose = (Math.floor(rt * 8) % 2) ? 'swing_b' : 'swing';
    else if (h.moving) pose = (Math.floor(rt * 6) % 2) ? 'idle_b' : 'stance';
    else pose = (Math.floor(rt * 1.6) % 2) ? 'idle_b' : 'idle_a';
    var im = niuSpr(pose) || niuSpr('stance') || niuSpr('idle_a');
    c.save();
    c.fillStyle = 'rgba(58,50,38,0.22)'; c.beginPath(); c.ellipse(x, y + r * 0.9, r * 1.15, r * 0.36, 0, 0, PI2); c.fill();
    if (G.ctrl === h.i && !h.down) { c.strokeStyle = '#7a4fc0'; c.lineWidth = 3; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(x, y + r * 0.85, r * 1.45, r * 0.5, 0, 0, PI2); c.stroke(); c.globalAlpha = 1; }
    if (drawNiumoWild(c, h, rt, x, y, r, face)) { /* 新图集未到时上面直接返回 false，仍走下面的旧 webp */ }
    else if (im && !h.down) {
      var bh = r * 3.15, bw = bh * im.naturalWidth / im.naturalHeight, bob = h.moving ? Math.sin(rt * 10) * 2 : Math.sin(rt * 2) * 1.2;
      c.save(); c.translate(x, y + r * 0.9 + bob); c.scale(face, 1); c.drawImage(im, -bw / 2, -bh, bw, bh); c.restore();
    } else if (h.down && im) {
      var kh = r * 2.2, kw = kh * im.naturalWidth / im.naturalHeight;
      c.save(); c.translate(x, y + r * 0.85); c.scale(face, 1); c.drawImage(im, -kw / 2, -kh * 0.72, kw, kh); c.restore();
    }
    c.restore();
    if (h.inv > 0 && !h.down) { c.strokeStyle = 'rgba(255,215,80,0.85)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 8 + Math.sin(rt * 20) * 1.5, 0, PI2); c.stroke(); }
    if (!h.down) { var f2 = Math.max(0, h.hp / h.maxHp); R.bar(c, x - 26, y + r + 8, 52, 6, f2, R.hpColor(f2), 'rgba(255,255,255,0.85)'); }
    R.otxt(c, '牛魔王 Lv' + G.level, x, y - r * 2.7, 13, '#4a2f8a', 'center', true);
    if (G.lair && XY.heroCC && XY.heroCC.drawFlags) XY.heroCC.drawFlags(c, h, x, y, rt);
  };
  VU.drawCave = function (c, G, rt) {
    var h = G.heroes[0], x = h.x, y = h.y, cp = G.camp, hurt = cp.hurtT > 0, pul = 0.5 + 0.5 * Math.sin(rt * 3);
    c.save();
    c.fillStyle = 'rgba(111,74,168,' + (0.08 + 0.05 * pul) + ')'; c.beginPath(); c.arc(x, y, C().CAMP_R || 125, 0, PI2); c.fill();
    c.setLineDash([8, 8]); c.lineDashOffset = -rt * 12; c.lineWidth = 1.6; c.strokeStyle = 'rgba(111,74,168,0.5)'; c.beginPath(); c.arc(x, y, C().CAMP_R || 125, 0, PI2); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(58,50,38,0.2)'; c.beginPath(); c.ellipse(x, y + 16, 26, 8, 0, 0, PI2); c.fill();
    c.fillStyle = hurt ? '#6b2a2a' : '#4a4036'; c.strokeStyle = '#1f1a14'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(x - 24, y + 16); c.quadraticCurveTo(x - 26, y - 22, x, y - 24); c.quadraticCurveTo(x + 26, y - 22, x + 24, y + 16); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#16120e'; c.beginPath(); c.moveTo(x - 12, y + 16); c.quadraticCurveTo(x - 13, y - 8, x, y - 9); c.quadraticCurveTo(x + 13, y - 8, x + 12, y + 16); c.closePath(); c.fill();
    c.fillStyle = '#d9b24a'; c.fillRect(x - 12, y - 33, 24, 7); c.strokeRect(x - 12, y - 33, 24, 7); R.txt(c, '洞', x, y - 29.5, 9, '#3a2a10', 'center', true);
    var f = Math.max(0, cp.hp / cp.maxHp); R.bar(c, x - 28, y + 22, 56, 6, f, f < 0.3 ? '#d62828' : '#8a63c8', 'rgba(255,255,255,0.85)');
    c.restore();
  };
  function C() { return XY.C; }
  VU.drawMinion = function (c, a, rt, G) {
    var evo = 0; try { evo = (VD.ser().evo.small || 0) | 0; } catch (e) { evo = 0; }
    var look = Math.cos(a.face || 0) >= 0 ? 1 : -1, drew = false;
    if (!evo && XY.MINK && XY.MINK.minion) {
      var fake = { type: 'small', x: a.x, y: a.y, r: 18, def: XY.ENEMIES.small, wob: a.slot || 0, flash: a.hurtT > 0 ? 1 : 0, atkT: a.atkT || 0, shootT: 0, stunT: 0, enraged: false, hp: a.hp, maxHp: a.maxHp, th: { x: a.x + look * 40, y: a.y } };
      drew = XY.MINK.minion(c, G, fake, rt, look);
    }
    if (!drew) {
      var i = img('evo/small_' + evo + '.webp') || (evo ? img('evo/small_0.webp') : null);
      if (i) {
        var bh = 72, bw = bh * i.naturalWidth / i.naturalHeight, foot = a.y + 20;
        c.fillStyle = 'rgba(58,50,38,0.2)'; c.beginPath(); c.ellipse(a.x, foot - 2, 16, 5, 0, 0, PI2); c.fill();
        c.save(); c.translate(a.x, foot + Math.sin(rt * 2 + (a.slot || 0)) * 1.2); c.scale(look, 1); c.drawImage(i, -bw / 2, -bh, bw, bh); c.restore();
      }
    }
    if (a.hp < a.maxHp) R.bar(c, a.x - 16, a.y + 24, 32, 4, a.hp / a.maxHp, '#8a63c8', 'rgba(255,255,255,0.8)');
  };

  /* ---------- 反派关 HUD ---------- */
  function skillRing(c, st, x, y, id, v, G) {
    var S0 = VD.SK[id], k = v.sk[id], r = 22, frac = k.cd > 0 ? Math.max(0, Math.min(1, k.cd / S0.cd)) : 0;
    c.fillStyle = PAPER; c.beginPath(); c.arc(x, y, r + 3, 0, PI2); c.fill(); c.lineWidth = 2; c.strokeStyle = '#b9a77a'; c.stroke();
    drawImg(c, 'icons/' + S0.icon + '.png', x - r + 3, y - r + 3, (r - 3) * 2, (r - 3) * 2);
    if (frac > 0) { c.fillStyle = 'rgba(58,50,38,0.5)'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + PI2 * frac); c.closePath(); c.fill(); txt(c, Math.ceil(k.cd), x, y + 1, 14, '#fff', 'center', true); }
    else { c.strokeStyle = '#6fbf73'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 1, 0, PI2); c.stroke(); }
    if(XY.inkHud)XY.inkHud.wash(c,x-30,y+r+3,60,18);
    txt(c, S0.name, x, y + r + 12, 11.5, INK, 'center', true);
    st.hit(x - 32, y - 32, 64, 64, 'vCast', { id: id });
  }
  VU.hud = function (c, G, a) {
    var v = G.villain, st = begin(c, a), cw = st.cw, ch = st.ch, h = G.heroes[1], cp = G.camp, ser0 = ser(), narrow = cw < 520;
    ui.hud = []; a._tip = null;
    if (!G._tipDone && G.villain && !window.XY_NO_VTIP) { G._tipDone = true; VU.tipOnce('villain', G); }
    var lw = Math.min(narrow ? 150 : 216,cw*.5-8), coins=Math.max(0,Math.round((G.coins-XY.C.START_COINS)*VD.STAGE.goldK));
    XY.inkHud.wash(c,8,8,lw,110);
    txt(c,'妖金 +'+coins,18,23,15,'#946213','left',true,lw-20);txt(c,'击杀 '+(v.kills||0),18,43,11,SOFT,'left',false,lw-20);
    txt(c,'洞府 '+Math.ceil(cp.hp)+'/'+cp.maxHp,18,61,11.5,INK,'left',true,lw-20);XY.inkHud.line(c,18,69,lw-20,cp.hp/cp.maxHp,'#735a41');
    txt(c,'Lv'+G.level+' · '+Math.ceil(h.hp)+'/'+h.maxHp,18,84,11.5,INK,'left',true,lw-20);XY.inkHud.line(c,18,92,lw-20,h.hp/h.maxHp,'#a43b2c');
    txt(c,'修行 '+Math.floor(G.xp)+'/'+XY.xpNeed(G.level),18,105,9.5,SOFT,'left',false,lw-20);
    var ph=G.tang.phase,ptxt=ph==='rest'?'休息点 · 守洞':ph==='arrived'?'到洞口':'行军',mid=cw/2,tw=narrow?180:210,ty=narrow?123:25;
    txt(c,XY.fmtTime(Math.floor(G.t))+'  '+ptxt,mid,ty,14,INK,'center',true,tw-16);
    var nt=G.note||G.banner||G.toast;if(nt&&nt.short)txt(c,nt.short,mid,ty+29,12,INK,'center',true,Math.min(cw-24,360));
    // 右上：菜单 / 2×
    var bx = cw - 8 - 76;XY.inkHud.wash(c,bx,8,76,44); st.btn(bx, 8, 76, 44, '菜单', 'esc', { sz: 15 });
    if (ser0.stage.stars >= 3) st.btn(bx - 4 - 66, 8, 66, 44, G.speed === 2 ? '2× 开' : '2×', 'vSpeed', { sz: 15, strong: G.speed === 2 });
    // 底部：三招冷却环 + 素材
    var ids = ['fan', 'charge', 'summon'], by = ch - 46, gap = narrow ? 64 : 78, x0 = mid - gap;
    if (G.touchLike === undefined) G.touchLike = a.touchUI;
    ids.forEach(function (id, i) { skillRing(c, st, x0 + i * gap, by - 8, id, v, G); });
    txt(c, v.manualOnly ? '自动放招 关' : '自动放招 开', mid, by - 58, 14, v.manualOnly ? '#5c4a38' : '#a42d19', 'center', true);
    st.hit(mid - 78, by - 74, 156, 32, 'vAuto');
    var mats = VD.MAT_ORDER.filter(function (m) { return v.mats[m] > 0; });
    if(mats.length||v.yaodan){var stack=cw<900,mx=stack?cw-53:cw-16-(mats.length+(v.yaodan?1:0))*56,my=stack?ch-94-(mats.length+(v.yaodan?1:0))*25:ch-29;
      if(stack)XY.inkHud.wash(c,mx-4,my-18,57,(mats.length+(v.yaodan?1:0))*25+2);else XY.inkHud.wash(c,mx-4,my-18,cw-mx,30);
      mats.forEach(function(m,i){var xx=stack?mx:mx+i*56,yy=stack?my+i*25:my;drawImg(c,'icons/mat_'+m+'.png',xx,yy-13,22,22);txt(c,v.mats[m],xx+24,yy,11.5,INK,'left',true);});if(v.yaodan)txt(c,'丹 '+v.yaodan,stack?mx:mx+mats.length*56,stack?my+mats.length*25:my,11.5,'#a43b2c','left',true);}
    // 洞府在屏幕外：指向阵眼的小箭头
    var eye = G.heroes[0], sx = eye.x - G.cam.x + G.view.w / 2, sy = eye.y - G.cam.y + G.view.h / 2, z = st.z;
    if (sx < 0 || sy < 0 || sx > G.view.w || sy > G.view.h) {
      var ang = Math.atan2(sy - G.view.h / 2, sx - G.view.w / 2), ex = cw / 2 + Math.cos(ang) * (cw / 2 - 30), ey = ch / 2 + Math.sin(ang) * (ch / 2 - 60);
      ex = Math.max(24, Math.min(cw - 24, ex)); ey = Math.max(80, Math.min(ch - 70, ey));
      c.save(); c.translate(ex, ey); c.rotate(ang); c.fillStyle = '#8a63c8'; c.strokeStyle = '#2d1f48'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -10); c.lineTo(-4, 0); c.lineTo(-8, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
      txt(c, '洞府', ex, ey + 20, 11, '#4a2f8a', 'center', true);
    }
    if (G.mode === 'tip' && VU.tip) VU.drawTip(c, st);
    st.end();
  };
  var oldHud = XY.R4.hud;
  XY.R4.hud = function (c, G, a) { if (G.villain) return VU.hud(c, G, a); if (G.lair && XY.lairUI) return XY.lairUI.hud(c, G, a); return oldHud(c, G, a); };

  /* ---------- 一次性新玩法提示 ---------- */
  VU.tipOnce = function (key, G) {
    G = G || XY.G; if (!G || VD.tipSeen(key)) return false;
    VD.tipMark(key); VU.tip = { key: key, text: VD.TIPS[key] || '' }; G.mode = 'tip'; return true;
  };
  /* 非战斗页面（副本入口 / Boss 战 / 洞府设计）的一次性提示：DOM 小卡，可点「知道了」跳过；只弹一次 */
  VU.tipDom = function (key) {
    if (window.XY_NO_VTIP || VD.tipSeen(key) || !VD.TIPS[key] || document.getElementById('xyTip')) return false;
    VD.tipMark(key);
    var a = app(), hold = !!(a && a.screen === 'play');                                  // 战斗中弹出：先停住时间，关掉提示再继续（不进暂停页）
    if (hold) a.tipHold = true;
    var el = document.createElement('div'); el.id = 'xyTip'; el.setAttribute('data-tip', key);
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(58,50,38,0.28);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:inherit';
    var card = document.createElement('div'); card.className='inkDialog inkTip'; card.setAttribute('role','dialog'); card.setAttribute('aria-label','新玩法'); card.style.cssText = 'background:#fffdf6;border:2.5px solid #a8905a;border-radius:14px 10px 16px 12px/12px 16px 10px 14px;padding:16px 18px;width:min(360px,100%);color:#3a3226;box-sizing:border-box;text-align:left';
    var h = document.createElement('div'); h.textContent = '新玩法'; h.style.cssText = 'color:#6f4aa8;font-weight:700;font-size:16px;margin-bottom:8px';
    var t = document.createElement('div'); t.textContent = VD.TIPS[key]; t.style.cssText = 'font-size:17px;line-height:1.5;margin-bottom:12px';
    var b = document.createElement('button'); b.textContent = '知道了'; b.style.cssText = 'display:block;margin:0 auto;min-width:112px;min-height:48px;border-radius:7px 10px 6px 9px/9px 6px 10px 7px;border:2px solid rgba(255,236,214,0.7);outline:2px solid #b8322a;background:#b8322a;color:#fff4e0;font-size:17px;font-weight:700;cursor:pointer;transform:rotate(-1.5deg)';
    b.onclick = function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (hold) { var aa = app(); if (aa) aa.tipHold = false; }
    };
    card.appendChild(h); card.appendChild(t); card.appendChild(b); el.appendChild(card); document.body.appendChild(el);if(XY.pv2.dialogKeys)XY.pv2.dialogKeys(el,function(){b.click();},b);return true;
  };
  VU.drawTip = function (c, st) {
    var w = Math.min(st.cw - 24, 360), x = (st.cw - w) / 2, y = st.ch / 2 - 70;
    c.fillStyle = 'rgba(58,50,38,0.28)'; c.fillRect(0, 0, st.cw, st.ch);
    paperCard(c, x, y, w, 140, { seed: 29, edge: GOLD, wash: GOLD });
    txt(c, '新玩法', x + 18, y + 26, 16, PUR, 'left', true);
    wrap(c, VU.tip.text, x + 18, y + 58, w - 36, 24, 17, INK, true, 2);
    st.btn(x + w / 2 - 48, y + 84, 96, 50, '知道了', 'vTipOk', { pri: true, sz: 17 });
  };
  var oldKey = null;

  /* ---------- 反派首页 ---------- */
  V.open = function (ctx) { return VU.open(ctx); };
  VU.open = function (ctx) {
    var w = window.__xy; if (!w) return false; var a = w.app; VU.page = (ctx && ctx.page) || 'home'; VU.msg = null; a.screen = 'villain'; return true;
  };
  /* ---------- 反派首页：一张主海报 + 两张错落小卡（守芭蕉洞 / 小妖进化 / 我的洞府），不是三等分 ---------- */
  function lairState(lair) { return !lair.doc ? '还没建' : lair.published ? '已发布' : lair.verifiedHash && XY.lair && lair.doc.hash === lair.verifiedHash ? '已验关' : '待验关'; }
  function posterInk(c, x, y, w, h, rgb, seed) {                     // 卡内水墨底：色晕 + 远山（先 clip 在卡里）
    c.save(); rrect(c, x + 4, y + 4, w - 8, h - 8, 8); c.clip();
    washE(c, x + w * 0.62, y + h * 0.6, w * 0.72, h * 0.62, rgb, 0.32); hills(c, x, y + h * 0.38, w, h * 0.62, '110,98,80', 0.11, seed);
    c.restore();
  }
  function leaf(c, x, y, len, ang, w, seed) {
    var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    IP.stroke(c, x, y, ex, ey, w, '74,138,84', 0.5, seed, 0.14); IP.stroke(c, x, y, ex, ey, w * 0.28, '36,84,52', 0.6, seed + 3, 0.14);
  }
  function homeLayout(cw, ch) {
    var land = cw >= 640 && cw > ch * 1.1, top = 58, bot = ch - 14, L = { land: land }, A, B, C;
    if (land) {
      A = { x: 18, y: top + 18, w: Math.round(cw * 0.5) }; A.h = bot - A.y;
      var bx = A.x + A.w - 12, bh = Math.round((bot - top) * 0.5 + 8);
      B = { x: bx, y: top, w: cw - 18 - bx - 26, h: bh - 20 }; C = { x: bx + 30, y: bot - bh, w: cw - 18 - bx - 30, h: bh };
    } else {
      A = { x: 14, y: top + 40, w: cw - 28 }; A.h = Math.round((ch - top) * 0.44);
      var y1 = A.y + A.h + 10, rem = bot - y1, hh = Math.round((rem + 8) / 2);
      B = { x: 14, y: y1, w: cw - 28 - 40, h: hh }; C = { x: 54, y: y1 + hh - 8, w: cw - 28 - 40, h: bot - (y1 + hh - 8) };
    }
    L.A = A; L.B = B; L.C = C; return L;
  }
  function homeCards(c, a, st) {
    var s = ser(), cw = st.cw, ch = st.ch, stg = s.stage, lair = s.lair, Ly = homeLayout(cw, ch), land = Ly.land, A = Ly.A, B = Ly.B, C = Ly.C, k;
    /* —— A：守芭蕉洞（牛魔王大立绘，头冲出卡面）—— */
    var hvA = st.over(A.x, A.y, A.w, A.h);
    artCard(c, A.x, A.y, A.w, A.h, { seed: 11, wash: '#7a5bb5', edge: '#a8905a', lw: 3.4, on: false });
    posterInk(c, A.x, A.y, A.w, A.h, '111,74,168', 21);
    var nw = Math.min(A.w * 0.58, A.h * 1.04 * 0.755), nh = nw / 0.755, nx = A.x + A.w - nw - 8, nby = A.y + A.h - 4;
    c.save(); rrect(c, A.x + 4, A.y + 4, A.w - 8, A.h - 8, 8); c.clip();
    for (k = 0; k < 4; k++) leaf(c, A.x + A.w - 26 - k * 22, nby - 6, nh * (0.46 + 0.08 * (k % 2)), -1.5 - k * 0.32, 8, 61 + k * 5);
    washE(c, nx + nw / 2, nby - 4, nw * 0.5, nh * 0.06, '58,50,38', 0.3); c.restore();
    drawImg(c, 'ui/niumo.webp', nx, nby - nh, nw, nh);
    var tx = A.x + 20, tw = A.w - nw - 36, ty = A.y + 16;
    seal(c, tx, ty, 62, 26, '反派关', '#b8322a', 14);
    txt(c, '守芭蕉洞', tx, ty + 58, land ? 34 : 32, INK, 'left', true, tw); brush(c, tx, ty + 78, Math.min(tw, 150), 5, 0.3, 3);
    for (k = 0; k < 3; k++) txt(c, k < stg.stars ? '★' : '☆', tx + 11 + k * 25, ty + 104, 24, k < stg.stars ? '#d49a1a' : '#b9ad92', 'center', true);
    txt(c, '通关 ' + stg.clears + ' 次 · ' + (stg.bestSec ? '最快 ' + XY.fmtTime(stg.bestSec) : '还没通关'), tx, ty + 130, 12.5, INK, 'left', true, tw);
    var dailyOk = stg.dayKey !== VD.today(); chip(c, tx, ty + 144, Math.min(tw, 164), 24, dailyOk ? '今日首通 妖金 ×1.5' : '今日首通已领', dailyOk ? '#a8700a' : '#8a8576');
    var by = A.y + A.h - 12 - 64;
    st.btn(tx, by, 66, 64, '出战', 'vGo', { pri: true, rot: -0.04 });
    if (stg.stars >= 3) { if (tw >= 150) st.btn(tx + 76, by + 16, Math.min(96, tw - 76), 46, '扫荡', 'vSweep', { sz: 17 }); else st.btn(tx + 30, by - 54, 92, 46, '扫荡', 'vSweep', { sz: 17 }); }
    /* —— B：小妖进化（三阶立绘叠在一起）—— */
    var hvB = st.over(B.x, B.y, B.w, B.h);
    artCard(c, B.x, B.y, B.w, B.h, { seed: 16, wash: '#2f7d3b', edge: hvB ? '#c9a24a' : '#a8905a', lw: 3, on: hvB });
    posterInk(c, B.x, B.y, B.w, B.h, '47,125,59', 31);
    st.hit(B.x, B.y, B.w, B.h, 'vEvoOpen');
    var typ = VU.sel || 'ranged', stg3 = [0, 2, 5], fh = B.h - 20, fw = fh * 0.76, area0 = B.x + B.w * 0.4, step = Math.min(fw * 0.7, (B.x + B.w - 8 - area0 - fw) / 2);
    c.save(); rrect(c, B.x + 4, B.y + 4, B.w - 8, B.h - 8, 8); c.clip();
    for (k = 0; k < 3; k++) { var sc = [0.76, 0.88, 1][k], hh = fh * sc, ww = fw * sc, px = area0 + step * k + (fw - ww) / 2; drawImg(c, 'evo/' + typ + '_' + stg3[k] + '.webp', px, B.y + B.h - 8 - hh, ww, hh); }
    c.restore();
    var bx0 = B.x + 18, bw0 = B.w * 0.4 - 22, tot = 0; VD.TOWER_ORDER.forEach(function (t) { tot += s.evo[t] || 0; });
    seal(c, bx0, B.y + 11, 74, 24, '五阶进化', '#6f4aa8', 12);
    txt(c, '小妖进化', bx0, B.y + 52, 26, INK, 'left', true, bw0 + 20); brush(c, bx0, B.y + 66, 96, 4, 0.28, 5);
    txt(c, '已进化 ' + tot + ' 阶 · 解锁 ' + VD.TOWER_ORDER.filter(function (t) { return VD.unlocked(s, t); }).length + '/8', bx0, B.y + 82, 12, '#2f7d3b', 'left', true, bw0 + 24);
    st.btn(bx0 + 4, B.y + B.h - 12 - 44, Math.min(bw0, 112), 44, '进化小妖', 'vEvoOpen', { sz: 16, strong: true, rgb: '47,125,59' });
    /* —— C：我的洞府（水墨洞府小景）—— */
    var hvC = st.over(C.x, C.y, C.w, C.h);
    artCard(c, C.x, C.y, C.w, C.h, { seed: 21, wash: '#a8703a', edge: hvC ? '#c9a24a' : '#a8905a', lw: 3, on: hvC });
    st.hit(C.x, C.y, C.w, C.h, 'vLairOpen');
    c.save(); rrect(c, C.x + 4, C.y + 4, C.w - 8, C.h - 8, 8); c.clip();
    washE(c, C.x + C.w * 0.66, C.y + C.h * 0.6, C.w * 0.6, C.h * 0.6, '168,112,58', 0.26); hills(c, C.x, C.y + C.h * 0.18, C.w, C.h * 0.82, '110,98,80', 0.13, 27);
    var rx = C.x + C.w * 0.42, pts = [[0.42, 0.34], [0.9, 0.34], [0.9, 0.64], [0.5, 0.64], [0.5, 0.88], [0.92, 0.88]], i;
    for (i = 1; i < pts.length; i++) { var x0 = C.x + C.w * pts[i - 1][0], y0 = C.y + C.h * pts[i - 1][1], x1 = C.x + C.w * pts[i][0], y1 = C.y + C.h * pts[i][1]; IP.stroke(c, x0, y0, x1, y1, 8, '201,174,118', 0.85, 70 + i, 0.01); IP.stroke(c, x0, y0, x1, y1, 2.6, '255,246,214', 0.7, 80 + i, 0.01); }
    var th = Math.min(C.h * 0.6, 104), tw2 = th * 0.76;
    drawImg(c, 'evo/yaota_' + Math.min(5, s.evo.yaota || 0) + '.webp', C.x + C.w * 0.68 - tw2 / 2, C.y + C.h * 0.36 - th * 0.78, tw2, th);
    drawImg(c, 'evo/bear_' + Math.min(5, s.evo.bear || 0) + '.webp', C.x + C.w * 0.46 - tw2 * 0.4, C.y + C.h - 10 - th * 0.8, tw2 * 0.8, th * 0.8);
    IP.ring(c, C.x + C.w * 0.68, C.y + C.h * 0.36 - 6, th * 0.5, 1.6, '111,74,168', 0.5, 7, 6, 0.4);
    c.restore();
    var cx0 = C.x + 18, cbw = C.w * 0.42 - 20, state = lairState(lair), good = state === '已发布' || state === '已验关';
    seal(c, cx0, C.y + 11, 74, 24, '我的洞府', '#8a5a2a', 12); chip(c, cx0 + 82, C.y + 12, 64, 22, state, good ? '#2f7d3b' : '#a8700a', good ? '#e8f4e4' : '#fbf0d4');
    txt(c, '我的洞府', cx0, C.y + 52, 26, INK, 'left', true, cbw + 24); brush(c, cx0, C.y + 66, 96, 4, 0.28, 6);
    txt(c, lair.doc ? '放陷阱 · 摆小妖 · 验关' : '自己摆一座洞府', cx0, C.y + 82, 12, SOFT, 'left', false, cbw + 24);
    st.btn(cx0 + 12, C.y + C.h - 12 - 44, Math.min(cbw + 30, 138), 44, lair.doc ? '编辑洞府' : '设计洞府', 'vLairOpen', { sz: 16, strong: true, rgb: '168,112,58' });
  }
  VU.drawHome = function (c, G, a) {
    var st = begin(c, a); frame(c, a, st, '反派模式 · 牛魔王篇', null, 'back', '反派模式');
    homeCards(c, a, st); toast(c, st, a, 60);
    st.end();
  };
  /* ---------- 小妖进化页 ---------- */
  var ROM = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
  VU.evolve = function (type) {
    var s = ser(), lv = (s.evo[type] || 0) + 1, cost = VD.evoCost(type, lv), k;
    if (!VD.unlocked(s, type)) return { ok: false, reason: '先解锁这种小妖' };
    if (lv > 5) return { ok: false, reason: '已经是最高阶' };
    if (!s.t3Seen[type]) return { ok: false, reason: '先在洞府里把「' + VD.TOWERS[type].name + '」造到三阶（保存洞府）' };
    var tot = 0; VD.TOWER_ORDER.forEach(function (t) { tot += s.evo[t] || 0; }); if (tot >= VD.EVO_MAX_TOTAL[1]) return { ok: false, reason: '洞府 Lv1 进化总阶最多 ' + VD.EVO_MAX_TOTAL[1] + '（升洞府再开放）' };
    for (k in cost.mats) if ((s.mats[k] || 0) < cost.mats[k]) return { ok: false, reason: '素材不够：' + VD.MATS[k].name + ' ' + (s.mats[k] || 0) + '/' + cost.mats[k] };
    if (s.wallet.yaojin < cost.gold) return { ok: false, reason: '妖金不够：要 ' + cost.gold + '，现在 ' + s.wallet.yaojin };
    for (k in cost.mats) s.mats[k] -= cost.mats[k];
    s.wallet.yaojin -= cost.gold; s.evo[type] = lv;
    var co = VD.COS[type]; if (lv >= 3 && !s.cos[type + ':card']) s.cos[type + ':card'] = co.card; if (lv >= 5 && !s.cos[type + ':frame']) s.cos[type + ':frame'] = co.frame;      // 西游线收藏外观：只收藏，不影响数值
    s.codex[type + ':' + lv] = 1;
    if (VD.cosJourney) VD.cosJourney(type, lv);
    if (s.lair.doc && XY.lair) { var oh = s.lair.doc.hash; XY.lair.finalize(s.lair.doc); if (s.lair.doc.hash !== oh) { s.lair.published = false; s.lair.rev = (s.lair.doc.rev = (s.lair.doc.rev || 0) + 1); } }      // 进化改了塔 → 哈希变 → 已验关的洞府要重新验关
    if (S.touch) S.touch(); S.flush();
    return { ok: true, reason: '进化成功：' + VD.EVO_NAMES[type][lv] + '（' + ROM[lv] + '阶）' + (lv === 3 ? '，解锁西游线「' + co.card + '」' : lv === 5 ? '，解锁西游线「' + co.frame + '」' : '') };
  };
  VU.unlockTower = function (type) {
    var s = ser(), t = VD.TOWERS[type];
    if (VD.unlocked(s, type)) return { ok: false, reason: '已经解锁' };
    if (s.wallet.yaojin < t.unlock) return { ok: false, reason: '妖金不够：要 ' + t.unlock + '，现在 ' + s.wallet.yaojin };
    s.wallet.yaojin -= t.unlock; s.got[type] = true; if (S.touch) S.touch(); S.flush(); return { ok: true, reason: '解锁了「' + t.name + '」' };
  };
  VU.evoF = null; VU._evoT = 0; VU._evoDrag = false;
  var WASH = VU.WASH = { ranged: '#2f7d3b', tank: '#8a6a3a', shield: '#3a6fa8', small: '#7a5bb5', elite: '#b8322a', bone: '#7a8a96', bear: '#4a3a2a', yaota: '#a8703a' };
  function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function hexRgb(h) { return IP.rgb(h); }
  function chipCost(c, x, y, label, ok, icon) {
    c.font = R.font(12.5, true); var w = (icon ? 28 : 12) + c.measureText(label).width + 10, col = ok ? '#2f7d3b' : '#b33a2a';
    drawTag(c, x, y, w, 26, '', col, { fill: ok ? '#eef6e8' : '#fbece6', seed: sh(label), cutK: 0.3 });
    if (icon) { drawImg(c, 'icons/mat_' + icon + '.png', x + 3, y + 2, 22, 22); txt(c, label, x + 27, y + 14, 12.5, col, 'left', true); } else txt(c, label, x + 8, y + 14, 12.5, col, 'left', true);
    return w;
  }
  /* 进化页几何：竖向大立绘卡横滑；详情是一张半透明墨笺，叠在选中卡旁（横屏）/ 卡底（竖屏） */
  function evoGeo(cw, ch) {
    var land = cw >= 640 && cw > ch * 1.1, inline = land && cw >= 760, g = { land: land, inline: inline }, y = 58, bot = ch - 12;
    if (inline) g.stock = { x: 252, y: 10, w: Math.min(560, cw - 252 - 150), h: 34 };
    else { var per8 = (cw - 28 - 36) / 8 >= 52; g.stock = { x: 14, y: y, w: cw - 28, h: per8 ? 34 : 62 }; y += g.stock.h + 6; }
    g.top = y; g.bot = bot;
    if (land) {
      g.selH = Math.min(bot - y - 6, 540); g.selW = Math.round(g.selH * 0.64); g.fx = 14 + Math.round(g.selW / 2) + 44; g.base = bot;
      var nw = Math.min(420, cw - 14 - (g.fx + g.selW / 2 + 30)), nh = Math.min(g.selH - 10, 300); g.note = { x: cw - 14 - nw, y: bot - nh, w: nw, h: nh };
    } else {
      var nh2 = 300; g.note = { x: 12, y: bot - nh2, w: cw - 24, h: nh2 };
      g.selH = Math.min(g.note.y + 14 - y - 6, 440); g.selW = Math.min(Math.round(g.selH * 0.64), Math.round(cw * 0.62)); g.fx = cw / 2; g.base = g.note.y + 14;
    }
    g.unW = g.selW * 0.8; g.off1 = (g.selW + g.unW) / 2 - g.unW * 0.3; g.step = g.unW * 0.62;
    return g;
  }
  function evoCx(g, d) { var ad = Math.abs(d), sg = d < 0 ? -1 : 1; return ad <= 1 ? g.fx + sg * ad * g.off1 : g.fx + sg * (g.off1 + (ad - 1) * g.step); }
  function evoCard(c, st, s, id, i, cx, d, g, active) {
    var ad = Math.min(1, Math.abs(d)), sc = 1 - 0.2 * ad, w = g.selW * sc, h = g.selH * sc, x = cx - w / 2, y = g.base - h - (1 - ad) * 6;
    var on = ad < 0.5, lk = !VD.unlocked(s, id), lv = s.evo[id] || 0, col = WASH[id], rgb = hexRgb(col), k;
    if (x > st.cw + 4 || x + w < -4) return null;
    artCard(c, x, y, w, h, { on: on, dim: lk, seed: 3 + i * 7, wash: col, lw: Math.max(2.4, w * 0.015) });
    c.save(); rrect(c, x + 4, y + 4, w - 8, h - 8, 8); c.clip();
    washE(c, x + w / 2, y + h * 0.58, w * 0.7, h * 0.46, rgb, lk ? 0.06 : 0.28); hills(c, x, y + h * 0.42, w, h * 0.4, '110,98,80', lk ? 0.05 : 0.1, 9 + i);
    c.restore();
    washE(c, x + w / 2, y + h * 0.8, w * 0.36, h * 0.025, '58,50,38', 0.3);
    c.globalAlpha = lk ? 0.4 : 1;
    var pop = on ? h * 0.07 : h * 0.02; drawImg(c, 'evo/' + id + '_' + lv + '.webp', x + 2, y - pop, w - 4, h * 0.82 + pop); c.globalAlpha = 1;
    var py = y + h * 0.8, ph = h * 0.2 - 6; c.save(); rrect(c, x + 6, py, w - 12, ph, 6); c.fillStyle = 'rgba(255,250,236,0.9)'; c.fill(); c.restore();
    txt(c, VD.EVO_NAMES[id][lv], x + w / 2, py + ph * 0.42, clampN(w * 0.095, 12, 22), lk ? '#8a8576' : INK, 'center', true, w - 20);
    var dr = Math.max(2.6, w * 0.017); for (k = 1; k <= 5; k++) { c.beginPath(); c.arc(x + w / 2 + (k - 3) * dr * 3.3, py + ph * 0.8, dr, 0, PI2); c.fillStyle = k <= lv ? '#7a4fc0' : '#f3ecda'; c.fill(); c.lineWidth = 1; c.strokeStyle = k <= lv ? '#4a2f8a' : '#b9a77a'; c.stroke(); }
    if (ad > 0) { c.fillStyle = 'rgba(250,244,226,' + 0.3 * ad + ')'; rrect(c, x, y, w, h, 8); c.fill(); }
    if (lk) seal(c, x + w / 2 - Math.min(w * 0.3, 46), y + h * 0.4, Math.min(w * 0.6, 92), 30, '未解锁', '#b8322a', clampN(w * 0.08, 12, 17));
    return { x: x, y: y, w: w, h: h, on: on };
  }
  function evoNote(c, st, s, type, r) {
    var t = VD.TOWERS[type], lv = s.evo[type] || 0, unl = VD.unlocked(s, type), x = r.x, y = r.y, w = r.w, h = r.h, px = x + 18, pw = w - 36, col = WASH[type];
    artCard(c, x, y, w, h, { seed: 41, edge: '#a8905a', lw: 3, wash: col, paper: 'rgba(255,251,238,0.9)' });
    st.hit(x, y, w, h, 'vNoop');
    txt(c, VD.EVO_NAMES[type][lv], px, y + 32, 24, INK, 'left', true, pw - 70); brush(c, px, y + 46, 100, 4, 0.28, 8);
    txt(c, !unl ? '未解锁' : lv ? ROM[lv] + ' 阶' : '未进化', x + w - 18, y + 30, 14, !unl ? '#8a8576' : '#7a4fc0', 'right', true);
    var i, dy2 = y + 64; for (i = 1; i <= 5; i++) { c.beginPath(); c.arc(px + 7 + (i - 1) * 18, dy2, 6, 0, PI2); c.fillStyle = i <= lv ? '#7a4fc0' : '#f3ecda'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = i <= lv ? '#4a2f8a' : '#b9a77a'; c.stroke(); }
    var sa = VD.stat(type, 1, lv), sb = VD.stat(type, 3, lv);
    txt(c, '一阶塔  生命 ' + Math.round(sa.hp) + ' · 伤害 ' + Math.round(sa.dmg) + ' · 射程 ' + sa.rng, px, y + 90, 12.5, SOFT, 'left', false, pw);
    txt(c, '三阶塔  生命 ' + Math.round(sb.hp) + ' · 伤害 ' + Math.round(sb.dmg) + ' · 每进化一阶生命 +' + Math.round(VD.EVO_STAT * 100) + '%', px, y + 108, 12, SOFT, 'left', false, pw);
    var bw = 104, bx = x + w - 20 - bw, by = y + h - 12 - 62, cy2 = y + 150;
    if (!unl) {
      txt(c, '还没解锁这种小妖', px, y + 138, 15, INK, 'left', true, pw); chipCost(c, px, y + 154, '妖金 ' + t.unlock, s.wallet.yaojin >= t.unlock);
      var afford = s.wallet.yaojin >= t.unlock; st.btn(bx, by, bw, 62, '解锁', 'vUnlock', { seal: true, pri: afford, off: !afford, hitOff: true, sub: '妖金 ' + t.unlock, id: type, rot: 0.03 });
    } else if (lv >= 5) {
      seal(c, px, y + 130, 64, 28, '已满阶', '#2f7d3b', 13); txt(c, '已进化到最高阶', px + 76, y + 144, 15, '#2f7d3b', 'left', true, pw - 76); txt(c, '西游线收藏外观已解锁', px, y + 176, 13, SOFT, 'left', true, pw);
    } else {
      var cost = VD.evoCost(type, lv + 1), ok = true; txt(c, '进化到 ' + ROM[lv + 1] + ' 阶：' + VD.EVO_NAMES[type][lv + 1], px, y + 134, 15, INK, 'left', true, pw);
      var cx2 = px, cy2 = y + 148;
      Object.keys(cost.mats).forEach(function (m) {
        var have = s.mats[m] || 0, enough = have >= cost.mats[m]; ok = ok && enough; c.font = R.font(12.5, true);
        var cwid = 28 + c.measureText(have + '/' + cost.mats[m]).width + 10; if (cx2 + cwid > px + pw && cx2 > px) { cx2 = px; cy2 += 30; }
        cx2 += chipCost(c, cx2, cy2, have + '/' + cost.mats[m], enough, m) + 6;
      });
      var gok = s.wallet.yaojin >= cost.gold; ok = ok && gok; c.font = R.font(12.5, true);
      var gw = 12 + c.measureText('妖金 ' + cost.gold).width + 10; if (cx2 + gw > px + pw && cx2 > px) { cx2 = px; cy2 += 30; }
      chipCost(c, cx2, cy2, '妖金 ' + cost.gold, gok);
      if (!s.t3Seen[type]) { ok = false; wrap(c, '先在洞府里把它造到三阶（保存后才算）', px, by + 10, pw - bw - 14, 15, 12, '#b33a2a', true, 3); }
      st.btn(bx, by, bw, 62, '进化', 'vEvolve', { seal: true, pri: ok, off: !ok, hitOff: true, sub: ROM[lv + 1] + ' 阶', id: type, rot: -0.03, sz: 22 });
    }
  }
  function drawEvoBody(c, st, s, type, g) {
    var n = VD.TOWER_ORDER.length, now = VU._evoNow || 0, si = VD.TOWER_ORDER.indexOf(type), dt = Math.min(0.1, Math.max(0, now - VU._evoT)); VU._evoT = now;
    if (VU.evoF === null || isNaN(VU.evoF)) VU.evoF = si; else if (!VU._evoDrag) { var df = si - VU.evoF; VU.evoF = Math.abs(df) < 0.004 ? si : VU.evoF + df * Math.min(1, dt * 11 + 0.02); }
    VU.evoRect = { x: 0, y: g.top, w: st.cw, h: g.bot - g.top, n: n, step: Math.max(60, g.step), note: g.note, z: st.z };
    var order = VD.TOWER_ORDER.map(function (id, i) { return { id: id, i: i, d: i - VU.evoF }; }).sort(function (p, q) { return Math.abs(q.d) - Math.abs(p.d); }), rects = [];
    c.save(); c.beginPath(); c.rect(0, g.top - 16, st.cw, g.bot - g.top + 20); c.clip();
    order.forEach(function (o) { var r = evoCard(c, st, s, o.id, o.i, evoCx(g, o.d), o.d, g); if (r) rects.push({ id: o.id, r: r }); });
    c.restore();
    rects.forEach(function (o) {                                         // 点击区：先画远的后画近的，近的优先（hits 倒着找）
      var r = o.r, x0 = Math.max(r.x, 6), x1 = Math.min(r.x + r.w, st.cw - 6); if (x1 - x0 >= 44) st.hit(x0, r.y, x1 - x0, r.h, 'vEvoSel', { id: o.id });
    });
    evoNote(c, st, s, type, g.note);
  }
  VU.drawEvo = function (c, G, a) {
    var st = begin(c, a), s = ser(), cw = st.cw, ch = st.ch, type = VU.sel, g = evoGeo(cw, ch);
    VU._evoNow = a.rt || 0;
    frame(c, a, st, '小妖进化', null, 'vHome', '小妖进化', { rgb: '47,125,59', rgb2: '111,74,168', seed: 9 });
    stockStrip(c, g.stock.x, g.stock.y, g.stock.w, g.stock.h, s);
    drawEvoBody(c, st, s, type, g);
    toast(c, st, a, g.top + 2);
    st.end();
  };

  /* ---------- 结算页 ---------- */
  VU.end = function (c, G, a, win) {
    var st = begin(c, a), r = (G.runReport && G.runReport.rewards) || {}, cw = st.cw, ch = st.ch;
    R.dim(c, a, 0.7);
    var w = Math.min(cw - 24, 420), h = Math.min(ch - 20, 330), x = (cw - w) / 2, y = (ch - h) / 2;
    paperCard(c, x, y, w, h, { seed: 37, edge: win ? GOLD : '#a8705a', wash: win ? GOLD : '#a8705a' });
    txt(c, win ? '洞府守住了！' : '洞府失守', x + w / 2, y + 30, 24, win ? '#2f7d3b' : '#a8321f', 'center', true, w - 20);
    if (!win) txt(c, (G.ending && G.ending.reason) || '', x + w / 2, y + 54, 13, SOFT, 'center', false, w - 24);
    else { var stars = '★★★'.slice(0, r.stars || 0) + '☆☆☆'.slice(0, 3 - (r.stars || 0)); txt(c, stars, x + w / 2, y + 58, 26, '#d49a1a', 'center', true); }
    var ty = y + 86;
    if (r.yaojin !== undefined) {
      txt(c, '妖金 +' + r.yaojin + (r.daily ? '（今日首通 ×1.5）' : '') + (r.firstClear ? ' · 首通 +' + VD.STAGE.firstBonus : ''), x + w / 2, ty, 15, '#a8700a', 'center', true, w - 24); ty += 22;
      var mm = Object.keys(r.mats || {}).filter(function (m) { return r.mats[m] > 0; }), per = 4, i, cx0 = x + 16, rowW = w - 32;
      for (i = 0; i < mm.length; i++) {
        var lab = VD.MATS[mm[i]].name + ' ×' + r.mats[mm[i]], col = '#7a5a10';
        c.font = R.font(12, true); var cwChip = 30 + c.measureText(lab).width + 10, colN = i % per, row = Math.floor(i / per);
        var cx = cx0 + colN * (rowW / per), cy = ty + row * 32;
        drawTag(c, cx, cy - 12, Math.min(cwChip, rowW / per - 4), 26, '', col, { fill: '#f7efdc', seed: sh(mm[i]), cutK: 0.3 });
        drawImg(c, 'icons/mat_' + mm[i] + '.png', cx + 3, cy - 10, 22, 22); txt(c, lab, cx + 28, cy + 2, 12, INK, 'left', true, rowW / per - 34);
      }
      ty += Math.max(1, Math.ceil(mm.length / per)) * 32 + 4;
      if (r.yaodan) { drawTag(c, x + w / 2 - 90, ty - 10, 180, 24, '妖丹 +' + r.yaodan + (r.traps && r.traps.length ? ' · 陷阱 ×' + r.traps.length : ''), PUR, { fill: '#f3ecfa', seed: 47, cutK: 0.3, sz: 12, tc: PUR }); ty += 26; }
      txt(c, '用时 ' + XY.fmtTime(r.sec || 0) + ' · 洞府剩 ' + Math.round((r.cave || 0) * 100) + '%', x + w / 2, ty + 4, 12.5, SOFT, 'center', false, w - 24);
    }
    var by = y + h - 60;
    st.btn(x + 28, by - 10, 124, 58, '再战一次', 'restart', { pri: true, rot: -0.03 }); st.btn(x + w - 28 - 128, by + 2, 128, 46, '反派首页', 'vHome2', {});
    st.end();
  };
  var oldEnd = XY.R4.end;
  XY.R4.end = function (c, G, a, win) { if (G.villain) return VU.end(c, G, a, win); if (G.lair && XY.lairUI) return XY.lairUI.end(c, G, a, win); return oldEnd(c, G, a, win); };

  /* ---------- 屏幕挂接 ---------- */
  var oldDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, a) {
    if (a.screen === 'villain') { if (VU.page === 'evo') VU.drawEvo(c, G, a); else if (VU.page === 'lair' && XY.lairUI) XY.lairUI.draw(c, G, a); else VU.drawHome(c, G, a); }
    else oldDraw(c, G, a);
  };
  /* ---------- 点击 ---------- */
  function say(t, bad) { VU.msg = { text: t, bad: !!bad, until: app().rt + 3.2 }; }
  VU.say = say;
  VU.act = function (h, p, a) {
    var w = window.__xy, G = w.G;
    if (G && G.villain && a.screen === 'play' && h.act !== 'vTipOk') V.noteInput('ui', h.act);   // 「知道了」只是关提示卡，不算操控
    switch (h.act) {
      case 'vGo': if (!XY.chain09 || XY.chain09.unlocked('villain')) w.startVillain(); else say('先打赢牛魔王 Boss 战', true); return true;
      case 'vSweep': var r = V.sweep(); say(r.ok ? '扫荡完成：妖金 +' + r.yaojin + '，妖丹 +' + r.yaodan + (Object.keys(r.mats).length ? '，素材 ' + Object.keys(r.mats).map(function (m) { return VD.MATS[m].name + '×' + r.mats[m]; }).join('、') : '') : r.reason, !r.ok); return true;
      case 'vEvoOpen': VU.page = 'evo'; return true;
      case 'vEvoSel': VU.sel = h.id; return true;
      case 'vNoop': return true;
      case 'vEvolve': var e = VU.evolve(h.id); say(e.reason, !e.ok); return true;
      case 'vUnlock': var u = VU.unlockTower(h.id); say(u.reason, !u.ok); return true;
      case 'vHome': VU.page = 'home'; return true;
      case 'vHome2': w.toMenu && w.toMenu(); VU.open({ page: 'home' }); return true;
      case 'vLairOpen': if (XY.lairUI) { VU.page = 'lair'; XY.lairUI.enter(); } else say('洞府设计还没开放', true); return true;
      case 'vSpeed': if (G && G.villain) G.speed = G.speed === 2 ? 1 : 2; return true;
      case 'vCast': if (G && G.villain && XY.villain.castByPlayer) { var vc = XY.villain.castByPlayer(G, h.id); if (vc && !vc.ok) say(vc.reason, true); } return true;
      case 'vAuto': if (G && G.villain) G.villain.manualOnly = !G.villain.manualOnly; return true;
      case 'vTipOk': if (G && G.mode === 'tip') { G.mode = 'play'; VU.tip = null; } return true;
    }
    if (XY.lairUI && XY.lairUI.act && XY.lairUI.act(h, p, a)) return true;
    return false;
  };
  VU.key = function (k, a) {
    if (a.screen !== 'villain') return false;
    if (VU.page === 'evo' && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd')) { VU.stepSel(k === 'ArrowLeft' || k === 'a' ? -1 : 1); return true; }
    if (k === 'Escape') { if (VU.page === 'home') w2().toMenu(); else if (VU.page === 'lair' && XY.lairUI && XY.lairUI.back && XY.lairUI.back()) { /* handled */ } else VU.page = 'home'; return true; }
    return true;
  };
  function w2() { return window.__xy; }


  /* ---------- 进化页大卡横滑：按住左右拖动 / 滚轮 / 左右键；焦点卡就是选中卡 ---------- */
  (function () {
    var cv = document.getElementById('game') || document.querySelector('canvas'), dn = null; if (!cv) return;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function inR(p) {
      var r = VU.evoRect, a = app(); if (!r || !a || a.screen !== 'villain' || VU.page !== 'evo') return false; var z = a.zoom || 1, n = r.note, px = p.x / z, py = p.y / z;
      if (n && px >= n.x && px <= n.x + n.w && py >= n.y && py <= n.y + n.h) return false;
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }
    function setF(f) { var n = VU.evoRect.n; VU.evoF = Math.max(0, Math.min(n - 1, f)); VU.sel = VD.TOWER_ORDER[Math.round(VU.evoF)]; }
    function down(p) { dn = inR(p) ? { x: p.x, f: VU.evoF === null ? VD.TOWER_ORDER.indexOf(VU.sel) : VU.evoF, moved: false } : null; }
    function move(p) { if (!dn) return; var a = app(), z = a.zoom || 1, dx = (p.x - dn.x) / z; if (Math.abs(dx) > 6) dn.moved = true; if (dn.moved) { VU._evoDrag = true; setF(dn.f - dx / VU.evoRect.step); } }
    function up() { dn = null; VU._evoDrag = false; }
    cv.addEventListener('mousedown', function (e) { if (e.button === 0) down(pos(e)); });
    window.addEventListener('mousemove', function (e) { if (dn) move(pos(e)); });
    window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', function (e) { down(pos(e.changedTouches[0])); }, { passive: true });
    cv.addEventListener('touchmove', function (e) { if (dn) move(pos(e.changedTouches[0])); }, { passive: true });
    cv.addEventListener('touchend', up, { passive: true });
    var wt = 0;
    cv.addEventListener('wheel', function (e) {
      if (!inR(pos(e))) return; var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return; e.preventDefault();
      var now = Date.now(); if (now - wt < 140) return; wt = now; VU.stepSel(d > 0 ? 1 : -1);
    }, { passive: false });
    VU.stepSel = function (k) { var i = VD.TOWER_ORDER.indexOf(VU.sel); VU.sel = VD.TOWER_ORDER[Math.max(0, Math.min(VD.TOWER_ORDER.length - 1, i + k))]; };
  })();

  /* ---------- 通过 Boss 战 →「不服气」过场 → 反派首页（由 bossfight_host 调用）---------- */
  VU.cutscene = function (done) {
    var el = document.createElement('div'); el.id = 'villainCut';
    el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(250,246,232,0.97);display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:inherit;color:#3a3226;text-align:center;padding:24px;box-sizing:border-box';
    var lines = VD.CUT, i = 0, t = document.createElement('div'), b = document.createElement('button');
    t.style.cssText = 'font-size:clamp(20px,5vw,30px);line-height:1.6;max-width:640px;min-height:5em;font-weight:700;letter-spacing:1px'; b.textContent = '继续';
    b.style.cssText = 'margin-top:20px;min-width:128px;min-height:50px;font-size:18px;border-radius:7px 10px 6px 9px/9px 6px 10px 7px;border:2px solid rgba(255,236,214,0.7);outline:2px solid #b8322a;background:#b8322a;color:#fff4e0;font-weight:700;cursor:pointer;transform:rotate(-1.5deg)';
    var sk = document.createElement('button'); sk.textContent = '跳过'; sk.id = 'villainCutSkip'; sk.style.cssText = 'margin-top:12px;min-width:90px;min-height:44px;font-size:15px;border-radius:4px 14px 8px 18px/10px 6px 14px 6px;border:none;border-bottom:3px solid rgba(58,50,38,0.45);background:rgba(58,50,38,0.08);color:#3a3226;cursor:pointer';
    el.appendChild(t); el.appendChild(b); el.appendChild(sk); document.body.appendChild(el); t.textContent = lines[0];
    function fin() { try { document.body.removeChild(el); } catch (e) { } S.data.tips.cut = true; if (S.touch) S.touch(); S.flush(); if (done) done(); }
    sk.onclick = function () { fin(); };
    b.onclick = function () { i++; if (i >= lines.length) fin(); else { t.textContent = lines[i]; if (i === lines.length - 1) b.textContent = '去看看洞府'; } };
    VU.cutEl = el; return el;
  };
})();

