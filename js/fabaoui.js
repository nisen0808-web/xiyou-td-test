/* ============================================================
 * fabaoui.js —— 法宝新规则的界面：三选一面板、右侧法宝栏（4 法宝 + 3 灵物）、炼化动画
 *   全部用圆角矩形 / 小方块，不画圆点；点击与键盘都走 XY.fabao 的规则函数
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, FB = XY.fabao, UI = XY.fabaoui = {};
  var EC = { metal: '#d9a21c', wood: '#3f9e5a', water: '#3a9bd0', fire: '#e8602c', earth: '#a8782f' };
  var SC = { qitian: '#d9a21c', hufa: '#6a8f3a', fomen: '#c97a2a', tianting: '#4a7fc0' };
  UI.col = function (it) { return it.el ? EC[it.el] : '#7a8a9a'; };
  function R() { return XY.R; }
  function up(it, to) {
    if (to === 2 || to === 4) return '伤害 +30%' + (to === 4 && it.kind === 'f' ? '，范围 +15%' : '');
    if (it.kind === 'l') return it.d.replace('/ 级', '每级');
    return to === 3 ? it.u3 : it.u5 + '（满级金边）';
  }
  UI.upText = function (id, to) { var it = FB.BY[id]; return it.kind === 'l' ? '再 +1 级：' + it.d.replace('/ 级', '').replace(/\s+/g, '') : up(it, to); };
  function pips(c, x, y, lv, mx, col) { for (var i = 0; i < mx; i++) { c.fillStyle = i < lv ? col : '#e3dccb'; c.fillRect(x + i * 11, y, 8, 8); c.strokeStyle = '#8a7a5a'; c.lineWidth = 1; c.strokeRect(x + i * 11 + 0.5, y + 0.5, 7, 7); } }
  function recipeNote(id) { var out = []; FB.RECIPES.forEach(function (r) { if (r.a === id) out.push('满级 + ' + FB.BY[r.b].name + ' → ' + r.name); else if (r.b === id) out.push('配 ' + FB.BY[r.a].name + ' → ' + r.name); }); return out[0] || ''; }

  var portrait = function (app) { return app.lw < app.lh * 0.85; };
  UI.withFit = function (c, app, n, fn) {
    if (!XY.ov) return fn();
    var s = portrait(app) ? Math.min((app.lw - 24) / 600, (app.lh - 30) / (90 + n * 188 + 90), 1.8) : XY.ov.fit(app, n * 296 + 60, (app.touchUI ? 384 : 338) + 220);
    XY.ov.scaled(c, app, s, fn);
  };
  UI.drawOffer = function (c, G, app) { if (!G.cardOffer) return; UI.withFit(c, app, G.cardOffer.cards.length, function () { drawOfferInner(c, G, app); }); };
  /* ================= v0.8 三选一：三联竖卷（panel A）=================
   * 每个选项一幅宣纸竖卷：序号圈 + 朱印（新 / 升 / 炼）+ 大字名 + 一抹笔触 + Lv + 一行效果。配方放悬停气泡（触屏：卷内一行小字）。
   * 底部三个按钮：重抽 / 封印（每卷下方小按钮，Shift+数字）/ 都不要。命中框与以前一样：offerPick k / offerSeal k / offerReroll。 */
  var KAI = function () { return (XY.menu && XY.menu.KAI) || 'serif'; };
  var INKC = '#1e1812', INK2C = '#6d5f46';
  function shortEff(s) {                                 // 效果一行化：去括号注释；太长就取第一个分句
    s = String(s || '').replace(/（[^）]*）/g, '').replace(/\s+/g, ' ').trim();
    if (s.length > 17) { var m = s.search(/[，；：]/); if (m >= 6) s = s.slice(0, m); }
    if (s.length > 22) s = s.slice(0, 21) + '…';
    return s;
  }
  UI.shortEff = shortEff;
  function roughRect(c, x, y, w, h, seed, j) {            // 手撕感的纸边：每 ~26px 一个抖动点
    var IP = XY.INKP, pts = [], i, n;
    n = Math.max(2, Math.round(w / 26)); for (i = 0; i <= n; i++) pts.push([x + w * i / n, y + (IP.hash(seed, i) - 0.5) * j * 0.6]);
    n = Math.max(2, Math.round(h / 26)); for (i = 1; i <= n; i++) pts.push([x + w + (IP.hash(seed, 40 + i) - 0.5) * j, y + h * i / n]);
    n = Math.max(2, Math.round(w / 26)); for (i = n - 1; i >= 0; i--) pts.push([x + w * i / n, y + h + (IP.hash(seed, 80 + i) - 0.5) * j * 0.6]);
    n = Math.max(2, Math.round(h / 26)); for (i = n - 1; i >= 1; i--) pts.push([x + (IP.hash(seed, 120 + i) - 0.5) * j, y + h * i / n]);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath();
  }
  function rod(c, x, y, w) {
    var g = c.createLinearGradient(0, y, 0, y + 14); g.addColorStop(0, '#7a5a3a'); g.addColorStop(0.5, '#4a3322'); g.addColorStop(1, '#2c1f14');
    XY.R.rrect(c, x - 10, y, w + 20, 14, 7); c.fillStyle = g; c.fill();
    c.fillStyle = '#c9a44c'; XY.R.rrect(c, x - 14, y - 1, 8, 16, 4); c.fill(); XY.R.rrect(c, x + w + 6, y - 1, 8, 16, 4); c.fill();
  }
  function scroll(c, app, o) {
    var IP = XY.INKP, x = o.x, y = o.y, w = o.w, h = o.h, col = o.col, rgb = IP.rgb(col), lift = o.hov ? -8 : 0, i, kai = KAI(), cx = x + w / 2;
    y += lift;
    c.save();
    c.shadowColor = 'rgba(70,45,10,' + (o.hov ? 0.34 : 0.22) + ')'; c.shadowBlur = o.hov ? 26 : 16; c.shadowOffsetY = o.hov ? 12 : 7;
    var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.hov ? '#fffdf3' : '#fdf9ee'); g.addColorStop(1, o.hov ? '#faf0d6' : '#f6eed9');
    roughRect(c, x + 5, y + 8, w - 10, h - 16, o.seed, 3.2); c.fillStyle = g; c.fill(); c.restore();
    c.save(); roughRect(c, x + 5, y + 8, w - 10, h - 16, o.seed, 3.2); c.clip();                                  // 纸纤维 + 淡晕
    for (i = 0; i < 7; i++) IP.stroke(c, x + 12 + IP.hash(o.seed, 200 + i) * (w - 60), y + 20 + IP.hash(o.seed, 210 + i) * (h - 40), x + 40 + IP.hash(o.seed, 220 + i) * (w - 50), y + 24 + IP.hash(o.seed, 230 + i) * (h - 44), 1.4, '120,95,50', 0.06, o.seed + i);
    c.restore();
    roughRect(c, x + 5, y + 8, w - 10, h - 16, o.seed, 3.2); c.strokeStyle = o.hov ? 'rgba(201,135,26,0.85)' : 'rgba(150,120,70,0.55)'; c.lineWidth = o.hov ? 2 : 1.2; c.stroke();
    rod(c, x, y, w); rod(c, x, y + h - 14, w);
    // 序号：枯笔圆 + 数字
    var nx = x + 36, ny = y + 52;
    c.lineCap = 'round'; c.strokeStyle = 'rgba(24,20,16,0.78)'; c.lineWidth = 3.2; c.beginPath(); c.arc(nx, ny, 15, -0.2, 5.5); c.stroke();
    c.lineWidth = 1.4; c.strokeStyle = 'rgba(24,20,16,0.4)'; c.beginPath(); c.arc(nx + 0.8, ny - 0.6, 16.5, 0.6, 4.6); c.stroke(); c.lineCap = 'butt';
    XY.ov.text(c, String(o.k + 1), nx, ny + 1, 19, INKC, 'center', true, kai);
    // 朱印
    var sx = x + w - 40, sy = y + 52; c.save(); c.translate(sx, sy); c.rotate(0.08);
    c.fillStyle = '#c8341f'; roughRect(c, -17, -17, 34, 34, o.seed + 9, 2.4); c.fill();
    c.strokeStyle = 'rgba(255,230,210,0.7)'; c.lineWidth = 1.2; c.strokeRect(-13, -13, 26, 26);
    XY.ov.text(c, o.seal, 0, 1, 21, '#fff4e4', 'center', true, kai); c.restore();
    if (XY.ICONINK) XY.ICONINK.draw(c, o.name, cx, y + 56, 58);        // v0.8.6 水墨图标（序号和朱印之间）
    // 名字
    var sz = 44; c.font = 'bold ' + sz + 'px ' + kai; while (sz > 22 && c.measureText(o.name).width + o.name.length * 4 > w - 34) { sz -= 2; c.font = 'bold ' + sz + 'px ' + kai; }
    XY.ov.text(c, o.name, cx, y + 124, sz, INKC, 'center', true, kai, 4);
    // 一抹笔触（元素色）
    IP.stroke(c, cx - w * 0.3, y + 160, cx + w * 0.3, y + 157, 7, rgb, 0.78, o.seed + 5, 0.04);
    IP.stroke(c, cx - w * 0.2, y + 167, cx + w * 0.22, y + 166, 2.4, IP.INK, 0.38, o.seed + 6, -0.05);
    // Lv
    XY.ov.text(c, o.lv, cx, y + 196, o.lvSz || 26, o.lvCol || INKC, 'center', true, kai, 1);
    if (o.pips) { var mx = o.pips[1], px0 = cx - (mx * 12 - 4) / 2; for (i = 0; i < mx; i++) { c.fillStyle = i < o.pips[0] ? col : 'rgba(150,130,90,0.28)'; XY.R.rrect(c, px0 + i * 12, y + 214, 8, 8, 3); c.fill(); } }
    // 一行效果
    XY.R.wrap(c, o.eff, cx, y + (o.pips ? 244 : 236), w - 20, 16, 22, '#41362a', 2);
    if (o.note) XY.R.wrap(c, o.note, cx, y + 296, w - 30, 12.5, 16, '#9a6b10', 2);        // 触屏：配方小字（没有悬停）
  }
  function bubble(c, W, x, y, text) {
    c.font = '14px ' + C.FONT; var lines = XY.R.wrapLines(c, text, 420), bw = 0, i; lines.forEach(function (s) { bw = Math.max(bw, c.measureText(s).width); }); bw += 26; var bh = 14 + lines.length * 20 + 6;
    var bx = Math.max(8, Math.min(W - bw - 8, x - bw / 2)); c.save(); c.shadowColor = 'rgba(70,45,10,0.3)'; c.shadowBlur = 12; c.shadowOffsetY = 4;
    XY.R.rrect(c, bx, y, bw, bh, 10); c.fillStyle = '#fffaf0'; c.fill(); c.restore(); c.lineWidth = 1.5; c.strokeStyle = '#c9a44c'; XY.R.rrect(c, bx, y, bw, bh, 10); c.stroke();
    for (i = 0; i < lines.length; i++) XY.ov.text(c, lines[i], bx + bw / 2, y + 17 + i * 20, 14, '#6a4a10', 'center', false);
  }
  // items: [{name, tag, lv, lvCol, pips:[lv,max], eff, recipe, col, canSeal, pick}] ；opts: {title, sub, rrLabel, rrDis, skipLabel, sealN}
  UI.scrolls = function (c, G, app, items, op) {
    if (portrait(app)) return UI.strips(c, G, app, items, op);
    var Rr = R(), ui = XY.ui, W = app.lw, H = app.lh, n = items.length, gap = 46, cw = Math.min(250, Math.floor((W - 60 - (n - 1) * gap) / n)), ch = app.touchUI ? 384 : 338;
    var tw = n * cw + (n - 1) * gap, x0 = W / 2 - tw / 2, TH = ch + 216, y0 = Math.max(8, Math.floor((H - TH) / 2)), tch = !!app.touchUI, hovI = -1;
    ui.hits.length = 0; if (!(XY.ov && XY.ov.ready(G, app))) { c.fillStyle = 'rgba(251,246,232,0.5)'; c.fillRect(0, 0, W, H); }
    XY.ov.title(c, op.title, W / 2, y0 + 16, 40, null, 12);
    XY.ov.rule(c, W / 2, y0 + 46, Math.min(520, tw), null);
    XY.ov.text(c, op.sub, W / 2, y0 + 66, 14, '#4a3d28', 'center', false);
    var sy = y0 + 92;
    items.forEach(function (it, k) {
      var x = x0 + k * (cw + gap), hov = !tch && app.mouse && app.mouse.x >= x && app.mouse.x < x + cw && app.mouse.y >= sy - 10 && app.mouse.y < sy + ch; if (hov) hovI = k;
      scroll(c, app, { x: x, y: sy, w: cw, h: ch, col: it.col, k: k, name: it.name, seal: it.tag, lv: it.lv, lvCol: it.lvCol, lvSz: it.lvSz, pips: it.pips, eff: it.eff, note: tch ? it.rec2 : '', hov: hov, seed: k * 17 + 5 });
      var by = sy + ch - (tch ? 48 : 54);
      if (it.canSeal) {
        var sw = 74, sx = x + cw / 2 - sw / 2, sh = !tch && app.mouse && app.mouse.x >= sx && app.mouse.x < sx + sw && app.mouse.y >= by && app.mouse.y < by + 26, dis = !(op.sealN > 0);
        Rr.rrect(c, sx, by - (hov ? 8 : 0), sw, 26, 13); c.fillStyle = sh && !dis ? '#fff0c4' : 'rgba(255,253,246,0.8)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = dis ? 'rgba(150,130,90,0.4)' : '#a8803a'; c.stroke();
        XY.ov.text(c, '封印', x + cw / 2, by + 14 - (hov ? 8 : 0), 14, dis ? '#a89a78' : '#6a4a10', 'center', true);
        ui.hits.push({ x: sx, y: by - 7, w: Math.max(sw, 44), h: 44, act: 'offerSeal', k: k });
      }
      ui.hits.push({ x: x, y: sy, w: cw, h: ch - (it.canSeal ? 56 : 0), act: 'offerPick', k: k });
    });
    var by2 = sy + ch + 74, bw = Math.min(250, Math.floor((W - 60) / 2) - 10);
    XY.ov.btn(c, app, W / 2 - bw - 12, by2, bw, 46, op.rrLabel, 'offerReroll', { size: 17, key: 'R', dis: op.rrDis });
    XY.ov.btn(c, app, W / 2 + 12, by2, bw, 46, op.skipLabel, 'offerPick', { size: 16, key: 'Esc', hit: { k: -1 } });
    if (hovI >= 0 && items[hovI].recipe) bubble(c, W, x0 + hovI * (cw + gap) + cw / 2, sy + ch + 6, items[hovI].recipe);
  };

  // 竖屏手机：横卷（卷轴横放，三卷竖排），内容同竖卷
  function strip(c, app, o) {
    var IP = XY.INKP, x = o.x, y = o.y, w = o.w, h = o.h, col = o.col, rgb = IP.rgb(col), kai = KAI(), i, tx = x + 92;
    c.save(); c.shadowColor = 'rgba(70,45,10,0.22)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fdf9ee'); g.addColorStop(1, '#f6eed9');
    roughRect(c, x + 8, y + 6, w - 16, h - 12, o.seed, 3); c.fillStyle = g; c.fill(); c.restore();
    c.save(); roughRect(c, x + 8, y + 6, w - 16, h - 12, o.seed, 3); c.clip();
    for (i = 0; i < 6; i++) IP.stroke(c, x + 20 + IP.hash(o.seed, 300 + i) * (w - 120), y + 14 + IP.hash(o.seed, 310 + i) * (h - 28), x + 80 + IP.hash(o.seed, 320 + i) * (w - 100), y + 18 + IP.hash(o.seed, 330 + i) * (h - 30), 1.4, '120,95,50', 0.06, o.seed + i);
    c.restore();
    roughRect(c, x + 8, y + 6, w - 16, h - 12, o.seed, 3); c.strokeStyle = 'rgba(150,120,70,0.55)'; c.lineWidth = 1.2; c.stroke();
    [x - 4, x + w - 10].forEach(function (rx) { var gg = c.createLinearGradient(rx, 0, rx + 14, 0); gg.addColorStop(0, '#7a5a3a'); gg.addColorStop(0.5, '#4a3322'); gg.addColorStop(1, '#2c1f14'); XY.R.rrect(c, rx, y, 14, h, 7); c.fillStyle = gg; c.fill(); c.fillStyle = '#c9a44c'; XY.R.rrect(c, rx - 1, y - 4, 16, 8, 4); c.fill(); XY.R.rrect(c, rx - 1, y + h - 4, 16, 8, 4); c.fill(); });
    var nx = x + 54, ny = y + 46;
    c.lineCap = 'round'; c.strokeStyle = 'rgba(24,20,16,0.78)'; c.lineWidth = 3.2; c.beginPath(); c.arc(nx, ny, 16, -0.2, 5.5); c.stroke(); c.lineCap = 'butt';
    XY.ov.text(c, String(o.k + 1), nx, ny + 1, 20, INKC, 'center', true, kai);
    if (XY.ICONINK) XY.ICONINK.draw(c, o.name, x + w - 112, y + 46, 54);
    var sz = 38, maxW = w - 92 - 150; c.font = 'bold ' + sz + 'px ' + kai; while (sz > 22 && c.measureText(o.name).width + o.name.length * 3 > maxW) { sz -= 2; c.font = 'bold ' + sz + 'px ' + kai; }
    XY.ov.text(c, o.name, tx, y + 44, sz, INKC, 'left', true, kai, 3); c.font = 'bold ' + sz + 'px ' + kai; var nw = c.measureText(o.name).width + o.name.length * 3;
    IP.stroke(c, tx, y + 70, tx + Math.max(80, nw), y + 68, 6, rgb, 0.78, o.seed + 5, 0.04);
    var sx = x + w - 56, sy = y + 44; c.save(); c.translate(sx, sy); c.rotate(0.08); c.fillStyle = '#c8341f'; roughRect(c, -17, -17, 34, 34, o.seed + 9, 2.4); c.fill();
    c.strokeStyle = 'rgba(255,230,210,0.7)'; c.lineWidth = 1.2; c.strokeRect(-13, -13, 26, 26); XY.ov.text(c, o.seal, 0, 1, 21, '#fff4e4', 'center', true, kai); c.restore();
    XY.ov.text(c, o.lv, tx, y + 96, o.lvSz ? Math.min(o.lvSz, 20) : 24, o.lvCol || INKC, 'left', true, kai, 1);
    if (o.pips) { var mx = o.pips[1], px0 = x + w - 70 - mx * 12; for (i = 0; i < mx; i++) { c.fillStyle = i < o.pips[0] ? col : 'rgba(150,130,90,0.28)'; XY.R.rrect(c, px0 + i * 12, y + 92, 8, 8, 3); c.fill(); } }
    c.font = '17px ' + C.FONT; c.textAlign = 'left'; var ls = XY.R.wrapLines(c, o.eff, w - 92 - 110); c.fillStyle = '#41362a'; c.textBaseline = 'middle';
    for (i = 0; i < ls.length && i < 2; i++) c.fillText(ls[i], tx, y + 124 + i * 22);
    if (o.note) XY.ov.text(c, o.note.length > 30 ? o.note.slice(0, 29) + '…' : o.note, tx, y + h - 24, 12.5, '#9a6b10', 'left', false);
  }
  UI.strips = function (c, G, app, items, op) {
    var Rr = R(), ui = XY.ui, W = app.lw, H = app.lh, n = items.length, sw = 560, sh = 176, pitch = 188, tch = !!app.touchUI, TH = 90 + n * pitch + 90, y0 = Math.max(8, Math.floor((H - TH) / 2)), x = W / 2 - sw / 2;
    ui.hits.length = 0; if (!(XY.ov && XY.ov.ready(G, app))) { c.fillStyle = 'rgba(251,246,232,0.5)'; c.fillRect(0, 0, W, H); }
    XY.ov.title(c, op.title, W / 2, y0 + 16, 38, null, 12); XY.ov.rule(c, W / 2, y0 + 44, 420, null); XY.ov.text(c, op.sub, W / 2, y0 + 62, 14, '#4a3d28', 'center', false);
    items.forEach(function (it, k) {
      var y = y0 + 90 + k * pitch; strip(c, app, { x: x, y: y, w: sw, h: sh, col: it.col, k: k, name: it.name, seal: it.tag, lv: it.lv, lvCol: it.lvCol, lvSz: it.lvSz, pips: it.pips, eff: it.eff, note: it.rec2, seed: k * 17 + 5 });
      if (it.canSeal) {
        var bx = x + sw - 100, by = y + sh - 44, dis = !(op.sealN > 0); Rr.rrect(c, bx, by, 70, 26, 13); c.fillStyle = 'rgba(255,253,246,0.8)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = dis ? 'rgba(150,130,90,0.4)' : '#a8803a'; c.stroke();
        XY.ov.text(c, '封印', bx + 35, by + 14, 14, dis ? '#a89a78' : '#6a4a10', 'center', true); ui.hits.push({ x: bx - 6, y: by - 9, w: 82, h: 44, act: 'offerSeal', k: k });
      }
      if (it.canSeal) { ui.hits.push({ x: x, y: y, w: sw - 110, h: sh, act: 'offerPick', k: k }); ui.hits.push({ x: x + sw - 110, y: y, w: 110, h: sh - 56, act: 'offerPick', k: k }); }
      else ui.hits.push({ x: x, y: y, w: sw, h: sh, act: 'offerPick', k: k });
    });
    var by2 = y0 + 90 + n * pitch + 10, bw = 262;
    XY.ov.btn(c, app, W / 2 - bw - 8, by2, bw, 48, op.rrLabel, 'offerReroll', { size: 17, key: 'R', dis: op.rrDis });
    XY.ov.btn(c, app, W / 2 + 8, by2, bw, 48, op.skipLabel, 'offerPick', { size: 16, key: 'Esc', hit: { k: -1 } });
  };
  function drawOfferInner(c, G, app) {
    var o = G.cardOffer, f = G.fb; if (!o) return;
    var items = o.cards.map(function (cd) {
      var it = FB.info(cd.id), isF = cd.k === 'fuse', col = it.sup ? '#c9871a' : UI.col(it), mx = FB.maxLv(cd.id), rn = recipeNote(cd.id), wh = FB.whereText(cd.id), r, rec = '';
      var d = { name: it.name, col: col, canSeal: !isF };
      if (isF) {
        r = FB.recipe(cd.rid); d.tag = '炼'; d.lv = FB.BY[r.a].name + ' + ' + FB.BY[r.b].name; d.lvSz = 15; d.lvCol = '#9a6b10'; d.eff = shortEff(it.d);
        rec = '占「' + FB.BY[r.a].name + '」的格，' + FB.BY[r.b].name + '消失。「' + r.lore + '」';
      } else if (cd.k === 'up') {
        d.tag = '升'; d.lv = 'Lv' + cd.from + ' → Lv' + cd.to; d.lvCol = '#b8300f'; d.pips = [cd.to, mx];
        d.eff = shortEff(UI.upText(cd.id, cd.to)); rec = (rn ? '配方：' + rn + '。' : '') + '现有：' + it.d;
      } else {
        d.tag = '新'; d.lv = '一重'; d.lvCol = '#2f7d3b'; d.pips = [1, mx]; d.eff = shortEff(it.d);
        rec = (rn ? '配方：' + rn + '。' : '') + (wh && wh !== '起手可用' ? wh + '。' : '') + it.d;
      }
      d.recipe = rec; d.rec2 = isF ? rec.split('。')[0] : (rn ? '配方：' + rn : (cd.k === 'new' && wh && wh !== '起手可用' ? wh : '')); return d;
    });
    var srcT = { chest: '宝箱', prep: '夜潮前的备战', den: '洞府首杀', boss: '牛魔王', quest: '任务奖励' }[o.opts && o.opts.src] || '', cost = FB.rrCost(G), n = items.length;
    UI.scrolls(c, G, app, items, {
      title: '选一件', sub: (srcT ? srcT + ' · ' : '') + '法宝 ' + f.w.length + '/' + C.FB.SLOT_F + ' · 灵物 ' + f.s.length + '/' + C.FB.SLOT_L + ' · 封印 ' + f.sealN + ' 次 · 点一卷或按 1–' + n,
      rrLabel: cost ? '重抽 · ' + cost + ' 金币' : '重抽 · 免费 ' + f.rrFree + ' 次', rrDis: cost > G.coins, skipLabel: '都不要，换 ' + C.FB.SKIP_COINS + ' 金币', sealN: f.sealN
    });
  }
  var oldDraw = function (c, G, app) {                  // 旧式（非 v2）三选一：同一套竖卷
    var K = XY.cards, o = G.cardOffer; if (!o) return;
    var items = o.ids.map(function (id) {
      var cd = XY.CARD_BY[id], rr = XY.RARITY[cd.r], S = XY.CARD_SETS[cd.set], own = K.carried(G, id), fx = XY.fxText(cd.fx, XY.cardLvMul(XY.save.lvOf(id)));
      return { name: cd.name, col: S.color, tag: own ? '叠' : '新', lv: rr.name, lvCol: rr.color, eff: shortEff(fx.replace(/，/g, '，')), recipe: S.name + '套' + (own ? ' · 已带：再拿一份叠加 +50%' : '') + '。' + (cd.lore || '') };
    });
    UI.scrolls(c, G, app, items, { title: '选一件', sub: (K.setLine(G) ? '本局套系：「' + XY.CARD_SETS[K.setLine(G)].name + '」' : '第一件定下本局套系') + ' · 点一卷或按 1–' + items.length, rrLabel: '重抽（本阶段无）', rrDis: true, skipLabel: '都不要，换 ' + C.CARD_SKIP_COINS + ' 金币', sealN: 0 });
  };
  XY.drawCardOffer = function (c, G, app) { if (G.cardOffer && G.cardOffer.v2) return UI.drawOffer(c, G, app); return UI.withFit(c, app, G.cardOffer ? G.cardOffer.ids.length : 3, function () { oldDraw(c, G, app); }); };
  UI.key = function (G, k, shift) {
    var o = G.cardOffer; if (!o) return;
    var m = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4 }[k];
    if (m !== undefined) { if (shift) FB.seal(G, m); else FB.choose(G, m); }
    else if (k === 'KeyR') FB.reroll(G); else if (k === 'Escape') FB.choose(G, -1);
  };

  /* ---------- 右侧栏 ---------- */
  UI.hud = function (c, G, app, y0) {
    if(XY.ui2.on&&XY.inkHud)return XY.inkHud.fabao(c,G,app,y0,FB.all,function(g){return g.combos.filter(function(b){return b.n>0;});},FB.ready);
    var Rr = R(), ui = XY.ui, f = G.fb, W = app.lw, pw = 232, x = W - pw - 12, rows = f.w.length + f.s.length, rdy = FB.ready(G), cmb = G.combos.filter(function (b) { return b.n > 0; });
    var ph = 32 + Math.max(1, rows) * 24 + (cmb.length ? 8 + cmb.length * 17 : 0) + rdy.length * 28 + 6;
    Rr.panel(c, x, y0, pw, ph, 10); ui.cardPanel = { x: x, y: y0, w: pw, h: ph };
    Rr.txt(c, '法宝 ' + f.w.length + '/' + C.FB.SLOT_F + ' · 灵物 ' + f.s.length + '/' + C.FB.SLOT_L, x + 10, y0 + 15, 14, Rr.T.ink, 'left', true);
    var flash = f.gain ? 0.5 + 0.5 * Math.sin(app.rt * 14) : 0, y = y0 + 30;
    FB.all(G).forEach(function (s) {
      var it = FB.info(s.id), col = it.sup ? '#c9871a' : UI.col(it), mx = it.sup ? 1 : FB.maxLv(s.id), isG = f.gain && f.gain.id === s.id;
      Rr.rrect(c, x + 8, y, pw - 16, 22, 6); c.fillStyle = isG && flash > 0.5 ? '#fff0c0' : '#fffdf6'; c.fill(); c.lineWidth = it.sup || s.lv >= mx ? 3 : 2; c.strokeStyle = it.sup || s.lv >= mx ? '#d9a21c' : '#b9a982'; c.stroke();
      if (!(XY.ICONINK && XY.ICONINK.draw(c, it.name, x + 19, y + 11, 22))) { c.fillStyle = col; c.fillRect(x + 13, y + 5, 12, 12); }
      Rr.txt(c, it.name, x + 31, y + 12, 13, Rr.T.ink, 'left', true);
      if (it.sup) Rr.txt(c, '超级', x + pw - 14, y + 12, 12, '#c9871a', 'right', true); else pips(c, x + pw - 14 - mx * 11, y + 7, s.lv, mx, col);
      if (it.kind === 'l' && !it.sup) c.strokeStyle = '#7a8a9a';
      y += 24;
    });
    if (!rows) Rr.txt(c, '打开宝箱、夜潮备战、首杀洞主来获得', x + 10, y + 10, 12, Rr.T.inkSoft, 'left', false);
    if (cmb.length) { y += 4; cmb.forEach(function (b) { Rr.txt(c, FB.SET_NAME[b.set] + '门派 ×' + b.n + (b.tier ? (b.tier >= 2 ? ' · 大加成' : ' · 小加成') : ' · 再 ' + (2 - b.n) + ' 件有加成'), x + 10, y + 8, 12, b.tier ? '#b8300f' : Rr.T.inkSoft, 'left', b.tier > 0); y += 17; }); }
    rdy.forEach(function (r) { var by = y + 4, pulse = 0.5 + 0.5 * Math.sin(app.rt * 8); Rr.rrect(c, x + 8, by, pw - 16, 24, 7); c.fillStyle = pulse > 0.5 ? '#ffe39a' : '#ffd36a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a06a10'; c.stroke(); Rr.txt(c, '下次选择可炼化：' + r.name, x + pw / 2, by + 13, 12, '#5a3a05', 'center', true); y += 28; });
    // 炼成动画：屏幕中央一块金色横幅 + 尖碎片
    var fa = f.fuseAnim; if (fa) { var k = fa.t / fa.max, a = 1 - k; c.save(); c.globalAlpha = Math.min(1, a * 2); var r = FB.recipe(fa.rid), cx = app.lw / 2, cy = app.lh * 0.32;
      c.fillStyle = 'rgba(255,225,130,0.9)'; Rr.rrect(c, cx - 190, cy - 34, 380, 68, 12); c.fill(); c.strokeStyle = '#a06a10'; c.lineWidth = 4; c.stroke();
      Rr.txt(c, '炼成', cx, cy - 12, 16, '#7a4a05', 'center', true); Rr.txt(c, r.name, cx, cy + 14, 28, '#5a3205', 'center', true);
      c.fillStyle = '#ffd24a'; for (var i = 0; i < 12; i++) { var an = i / 12 * 6.283, dd = 80 + 220 * k; c.save(); c.translate(cx + Math.cos(an) * dd, cy + Math.sin(an) * dd * 0.5); c.rotate(an); c.fillRect(-9, -2, 18, 4); c.restore(); } c.restore(); }
  };
  /* ---------- Tab 面板的“法宝”页（第 10 页；热键 8；手机点 Tab 按钮再点这一页）---------- */
  UI.TAB = 10;
  UI.page = function (c, G, app, px, py, pw, ph) {
    var Rr = R(), ui = XY.ui, f = G.fb, mouse = app.mouse, t = app.rt, i, bx = px + 24, by = py + 116;
    var colA = Math.min(430, Math.floor(pw * 0.36)), bxB = bx + colA + 24, wB = pw - 48 - colA - 24;
    Rr.txt(c, '本局携带（全队共用）· 法宝 ' + f.w.length + '/' + C.FB.SLOT_F + ' · 灵物 ' + f.s.length + '/' + C.FB.SLOT_L, bx, by + 4, 15, Rr.T.ink, 'left', true);
    var y = by + 20;
    for (i = 0; i < C.FB.SLOT_F + C.FB.SLOT_L; i++) {
      var s = i < C.FB.SLOT_F ? f.w[i] : f.s[i - C.FB.SLOT_F], isL = i >= C.FB.SLOT_F;
      Rr.rrect(c, bx, y, colA, 42, 8); c.fillStyle = s ? '#fffdf6' : '#f1ecde'; c.fill(); c.lineWidth = s && (s.sup || s.lv >= FB.maxLv(s.id)) ? 3 : 1.8; c.strokeStyle = s ? (s.sup ? '#c9871a' : '#b9a982') : '#d6cdb2'; c.stroke();
      if (!s) { Rr.txt(c, isL ? '灵物格（空）' : '法宝格（空）', bx + 14, y + 22, 13, '#a89a78', 'left', false); }
      else {
        var it = FB.info(s.id), col = it.sup ? '#c9871a' : UI.col(it), mx = it.sup ? 1 : FB.maxLv(s.id);
        if (!(XY.ICONINK && XY.ICONINK.draw(c, it.name, bx + 17, y + 17, 26))) { c.fillStyle = col; c.fillRect(bx + 10, y + 8, 14, 14); } Rr.txt(c, it.name, bx + 32, y + 15, 15, Rr.T.ink, 'left', true);
        Rr.txt(c, (it.sup ? '超级' : (isL ? '灵物' : '法宝')) + (it.set ? ' · ' + FB.SET_NAME[it.set] : '') + (it.el ? ' · ' + FB.EL_NAME[it.el] : ''), bx + 120, y + 15, 11, Rr.T.inkSoft, 'left', false);
        if (!it.sup) pips(c, bx + colA - 12 - mx * 11, y + 9, s.lv, mx, col); else Rr.txt(c, '超级', bx + colA - 14, y + 15, 13, '#c9871a', 'right', true);
        var lvTxt = it.d; if (!it.sup && s.lv < mx) lvTxt += ' ｜ 下一级：' + (it.kind === 'l' ? '效果再叠一级' : UI.upText(s.id, s.lv + 1));
        Rr.txt(c, lvTxt.length > 44 ? lvTxt.slice(0, 43) + '…' : lvTxt, bx + 10, y + 32, 11.5, Rr.T.inkSoft, 'left', false);
      }
      y += 46; if (i === C.FB.SLOT_F - 1) { y += 8; }
    }
    y += 4; var cm = G.combos.filter(function (b) { return b.n > 0; });
    cm.forEach(function (b) { var s = XY.CARD_SETS[b.set]; Rr.txt(c, FB.SET_NAME[b.set] + '门派 ×' + b.n + '：' + (b.tier >= 2 ? s.t5.txt || '大加成' : (b.tier >= 1 ? s.t3.txt || '小加成' : '再带 ' + (2 - b.n) + ' 件有加成')), bx, y + 6, 12, b.tier ? '#b8300f' : Rr.T.inkSoft, 'left', b.tier > 0); y += 17; });
    // 右：8 条配方
    Rr.txt(c, '炼化配方：满级 A + 带着 B → 超级法宝（点“盯”：三选一更常出这两件）', bxB, by + 4, 15, Rr.T.ink, 'left', true);
    var ry = by + 20, rh = 46;
    FB.RECIPES.forEach(function (r) {
      var st = FB.recipeState(G, r), A = FB.BY[r.a], Bi = FB.BY[r.b], pinned = f.pin === r.id, sup = FB.SUP[r.sup];
      var tag = { ready: '可炼化', prog: '进行中', missB: '缺 ' + Bi.name, locked: '未解锁', done: '本局已炼成' }[st.st], tc = { ready: '#b8300f', prog: '#2f6f9f', missB: '#9a6b10', locked: '#8a8578', done: '#2f7d3b' }[st.st];
      Rr.rrect(c, bxB, ry, wB, rh - 4, 8); c.fillStyle = st.st === 'ready' ? '#fff0c4' : '#fffdf6'; c.fill(); c.lineWidth = st.st === 'ready' ? 3 : 1.8; c.strokeStyle = pinned ? '#c9871a' : (st.st === 'ready' ? '#c9871a' : '#cdbf9c'); c.stroke();
      var aLv = st.a ? st.a.lv : 0; Rr.txt(c, A.name + (st.a ? ' Lv' + aLv + '/5' : '') + ' + ' + Bi.name + (st.b ? ' ✓' : '') + ' → ' + r.name, bxB + 10, ry + 14, 13.5, Rr.T.ink, 'left', true);
      Rr.txt(c, sup.d.length > 54 ? sup.d.slice(0, 53) + '…' : sup.d, bxB + 10, ry + 31, 11, Rr.T.inkSoft, 'left', false);
      Rr.txt(c, tag, bxB + wB - 160, ry + 14, 12, tc, 'right', true);
      var pb = { x: bxB + wB - 148, y: ry + 6, w: 40, h: 26 }; Rr.rrect(c, pb.x, pb.y, pb.w, pb.h, 6); c.fillStyle = pinned ? '#ffd86a' : '#efe6cf'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a89a78'; c.stroke(); Rr.txt(c, pinned ? '盯✓' : '盯', pb.x + 20, pb.y + 14, 12, Rr.T.ink, 'center', true); ui.hits.push({ x: pb.x, y: pb.y, w: pb.w, h: pb.h, act: 'fbPin', rid: r.id });
      if (st.st === 'ready') { var fb = { x: bxB + wB - 100, y: ry + 6, w: 90, h: 26 }; Rr.rrect(c, fb.x, fb.y, fb.w, fb.h, 6); c.fillStyle = '#ffd36a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a06a10'; c.stroke(); Rr.txt(c, '下次选择炼化', fb.x + 45, fb.y + 14, 12, '#5a3a05', 'center', true); }
      ry += rh;
    });
    // 下：全部法宝一览（过滤：全部 / 法宝 / 灵物 / 已解锁）
    var cy = ry + 8, flt = app.fbFilter || 'all', fl = [['all', '全部'], ['f', '法宝'], ['l', '灵物'], ['u', '已解锁']];
    Rr.txt(c, '图鉴（' + FB.ITEMS.filter(function (x) { return FB.unlocked(x.id); }).length + '/' + FB.ITEMS.length + ' 已解锁）', bxB, cy + 10, 14, Rr.T.ink, 'left', true);
    fl.forEach(function (o, k) { var fx0 = bxB + 170 + k * 70; Rr.rrect(c, fx0, cy, 62, 22, 6); c.fillStyle = flt === o[0] ? '#ffd86a' : '#efe6cf'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#a89a78'; c.stroke(); Rr.txt(c, o[1], fx0 + 31, cy + 12, 12, Rr.T.ink, 'center', true); ui.hits.push({ x: fx0, y: cy, w: 62, h: 22, act: 'fbFilter', k: o[0] }); });
    var list = FB.ITEMS.filter(function (x) { return flt === 'all' || (flt === 'u' ? FB.unlocked(x.id) : x.kind === flt); }), cols = Math.max(2, Math.floor(wB / 138)), chw = Math.floor(wB / cols) - 4, tip = null;
    list.forEach(function (x, k) {
      var cx = bxB + (k % cols) * (chw + 4), cyy = cy + 28 + Math.floor(k / cols) * 25, un = FB.unlocked(x.id), hov = mouse && mouse.x >= cx && mouse.x < cx + chw && mouse.y >= cyy && mouse.y < cyy + 22;
      Rr.rrect(c, cx, cyy, chw, 22, 6); c.fillStyle = un ? '#fffdf6' : '#ece7da'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = un ? UI.col(x) : '#c9c1ab'; c.stroke();
      c.fillStyle = un ? UI.col(x) : '#c9c1ab'; c.fillRect(cx + 6, cyy + 6, 10, 10); Rr.txt(c, un ? x.name : '？？？', cx + 22, cyy + 12, 12, un ? Rr.T.ink : '#9a927c', 'left', un);
      if (hov) tip = { x: cx, y: cyy, t: un ? x.name + '：' + x.d : '未解锁：' + FB.whereText(x.id) };
    });
    var ret = FB.retired(); Rr.txt(c, '典藏（不再带进局内）：' + ret.map(function (r) { return r.name; }).join('、'), bxB, py + ph - 20, 11.5, '#8a7d63', 'left', false);
    if (tip) { var tw2 = Math.min(wB, 420); Rr.rrect(c, Math.min(tip.x, px + pw - tw2 - 16), tip.y + 26, tw2, 40, 8); c.fillStyle = 'rgba(255,250,235,0.98)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a89a78'; c.stroke(); Rr.wrap(c, tip.t, Math.min(tip.x, px + pw - tw2 - 16) + tw2 / 2, tip.y + 36, tw2 - 16, 12, 16, Rr.T.ink, 2); }
  };

})();
