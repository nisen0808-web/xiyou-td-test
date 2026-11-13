/* ============================================================
 * overlay.js —— v0.7.0l 弹层统一风格（暂停 / 过关 / 失败 / 法宝三选一 的外壳），和新主菜单同一套：象牙白底 + 金边 + 淡墨，楷体标题，
 * 朱红主按钮 / 象牙次按钮 / 文字按钮，分段开关，数据瓦片，一次性模糊快照做背景（不再每帧透出背后的数字）。
 * 对外：XY.ov = { modal, title, btn, seg, tile, chip, snap... }  XY.R4.end 在这里重写（结算页）
 * ============================================================ */
(function () {
  var XY = window.XY, R = XY.R, ui = XY.ui, KAI = XY.menu.KAI, C = XY.C;
  var INK = '#2b1c08', INK2 = '#6d6455', RED = '#c8341f', GOLD = '#d9a21a', LINE = '#c9a44c';
  var ov = XY.ov = {};

  function over(app, x, y, w, h) { return app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h; }
  function ls(c, px) { if ('letterSpacing' in c) c.letterSpacing = px ? px + 'px' : '0px'; }
  function text(c, s, x, y, sz, col, al, bold, fam, sp) {
    c.font = (bold ? 'bold ' : '') + sz + 'px ' + (fam || C.FONT); c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle';
    ls(c, sp); c.fillText(XY.fmtStr(s), sp && al === 'center' ? x + sp / 2 : x, y); ls(c, 0);
  }
  ov.text = text;

  /* 手机横屏：弹层整体按比例放大（以屏幕中心为原点）。绘制、鼠标悬停（反向映射）和点击框（push 时正向映射）一起处理 */
  ov.fit = function (app, pw, ph) { return app.zoom < 0.75 ? Math.max(1, Math.min(1.5, (app.lh - 16) / ph, (app.lw - 16) / pw)) : 1; };
  ov.scaled = function (c, app, s, fn) {
    if (s <= 1.001) return fn();
    var ui = XY.ui, cx = app.lw / 2, cy = app.lh / 2, om = app.mouse, hp = ui.hits.push;
    c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy); ov.curS = s;
    if (om) app.mouse = { x: cx + (om.x - cx) / s, y: cy + (om.y - cy) / s };
    ui.hits.push = function (h) { h.x = cx + (h.x - cx) * s; h.y = cy + (h.y - cy) * s; h.w *= s; h.h *= s; return hp.apply(this, arguments); };
    try { fn(); } finally { delete ui.hits.push; app.mouse = om; c.restore(); ov.curS = 1; }
  };
  function diamond(c, x, y, r, col) { c.fillStyle = col; c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillRect(-r, -r, r * 2, r * 2); c.restore(); }

  /* ---------- 背景：一次性模糊快照 ---------- */
  function sig(G, app) { return app.screen + '|' + G.mode + '|' + (G.cardOffer ? 1 : 0) + '|' + app.lw + 'x' + app.lh + '|' + app.zoom + '|' + app.dpr; }
  ov.wants = function (G, app) { var s = app.screen; return s === 'pause' || s === 'win' || s === 'lose' || (s === 'play' && G.mode === 'cards' && !!G.cardOffer); };
  ov.ready = function (G, app) { var sn = app._snap; return !!(sn && sn.G === G && sn.sig === sig(G, app) && ov.wants(G, app)); };
  ov.capture = function (c, G, app) {
    var cv = c.canvas, k = 5, sw = Math.max(2, Math.ceil(cv.width / k)), sh = Math.max(2, Math.ceil(cv.height / k)), sn = app._snap;
    if (!sn || !sn.cv) sn = { cv: document.createElement('canvas') };
    sn.cv.width = sw; sn.cv.height = sh; var s = sn.cv.getContext('2d'); s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high';
    s.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, sw, sh);
    var s2 = document.createElement('canvas'); s2.width = Math.ceil(sw / 2); s2.height = Math.ceil(sh / 2); var q = s2.getContext('2d'); q.imageSmoothingQuality = 'high';
    q.drawImage(sn.cv, 0, 0, sw, sh, 0, 0, s2.width, s2.height); sn.cv = s2;                                  // 再缩一次：糊得更均匀
    sn.G = G; sn.sig = sig(G, app); app._snap = sn;
  };
  ov.drawSnap = function (c, app, veil) {
    var sn = app._snap, cv = c.canvas, W = app.lw, H = app.lh;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(sn.cv, 0, 0, sn.cv.width, sn.cv.height, 0, 0, cv.width, cv.height); c.restore();
    c.fillStyle = 'rgba(255,251,240,' + (veil == null ? 0.58 : veil) + ')'; c.fillRect(0, 0, W, H);                                                // 米色薄纱
    var g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(120,90,40,0)'); g.addColorStop(1, 'rgba(120,90,40,0.22)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);                                                                      // 四角淡墨晕
  };

  /* ---------- 外壳 / 标题 ---------- */
  ov.modal = function (c, x, y, w, h, o) {
    o = o || {}; var r = 18;
    c.save(); c.shadowColor = 'rgba(70,45,10,0.28)'; c.shadowBlur = 34; c.shadowOffsetY = 10;
    var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#fbf4e2');
    R.rrect(c, x, y, w, h, r); c.fillStyle = g; c.fill(); c.restore();
    c.lineWidth = 2; c.strokeStyle = o.edge || LINE; R.rrect(c, x, y, w, h, r); c.stroke();
    c.lineWidth = 0.8; c.strokeStyle = 'rgba(120,90,40,0.35)'; R.rrect(c, x + 6, y + 6, w - 12, h - 12, r - 5); c.stroke();
    diamond(c, x + 6, y + 6, 3.2, o.edge || GOLD); diamond(c, x + w - 6, y + 6, 3.2, o.edge || GOLD); diamond(c, x + 6, y + h - 6, 3.2, o.edge || GOLD); diamond(c, x + w - 6, y + h - 6, 3.2, o.edge || GOLD);
  };
  ov.rule = function (c, cx, y, w, col) {
    c.strokeStyle = col || 'rgba(160,120,40,0.55)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(cx - w / 2, y); c.lineTo(cx - 12, y); c.moveTo(cx + 12, y); c.lineTo(cx + w / 2, y); c.stroke(); diamond(c, cx, y, 4, col ? col : GOLD);
  };
  ov.title = function (c, s, cx, y, sz, col, sp) { text(c, s, cx, y, sz || 44, col || INK, 'center', true, KAI, sp != null ? sp : 10); };
  ov.head = function (c, s, x, y, w) {                           // 小节标题：朱红竖条 + 楷体 + 细线
    c.fillStyle = RED; R.rrect(c, x, y - 9, 4, 18, 2); c.fill(); text(c, s, x + 12, y, 16, INK, 'left', true, KAI, 2);
    c.font = 'bold 16px ' + KAI; var tw = c.measureText(s).width + 28; c.strokeStyle = 'rgba(160,120,40,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + tw, y); c.lineTo(x + w, y); c.stroke();
  };

  /* ---------- 按钮：primary 朱红 / secondary 象牙 / text 文字 ---------- */
  function keycap(c, label, rx, cy, dark) {
    c.font = 'bold 11px ' + C.FONT; var w = Math.max(22, c.measureText(label).width + 12), x = rx - w;
    R.rrect(c, x, cy - 10, w, 20, 5); c.fillStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(120,90,40,0.10)'; c.fill(); c.lineWidth = 1; c.strokeStyle = dark ? 'rgba(255,230,190,0.6)' : 'rgba(120,90,40,0.4)'; c.stroke();
    text(c, label, x + w / 2, cy + 0.5, 11, dark ? '#fff1d6' : INK2, 'center', true);
  }
  ov.btn = function (c, app, x, y, w, h, label, act, o) {
    o = o || {}; if (XY.ui2 && XY.ui2.on) { var gg = XY.ui2.grow(app, x, y, w, h); x = gg[0]; y = gg[1]; w = gg[2]; h = gg[3]; }
    c.save(); if (o.dis) c.globalAlpha = 0.55; var hov = over(app, x, y, w, h), kind = o.primary ? 'primary' : (o.kind || 'secondary'), dy = hov && kind !== 'text' ? -1.5 : 0, extra = o.hit;
    if (kind === 'primary' || kind === 'secondary') {
      c.save(); c.translate(x + w / 2, y + h / 2 + dy); c.rotate(kind === 'primary' ? -0.02 : 0.012);
      c.fillStyle = kind === 'primary' ? (hov ? '#c4472e' : '#a83224') : (hov ? 'rgba(90,74,52,0.22)' : 'rgba(90,74,52,0.14)');
      c.beginPath(); c.moveTo(-w / 2 + 3, -h * 0.38); c.lineTo(w / 2 - 1, -h * 0.42); c.lineTo(w / 2 - 4, h * 0.38); c.lineTo(-w / 2 + 2, h * 0.34); c.closePath(); c.fill(); c.restore();
      text(c, label, x + w / 2, y + h / 2 + 1 + dy, o.size || (kind === 'primary' ? 22 : 18), kind === 'primary' ? '#fff6e8' : INK, 'center', true, KAI, 2);
    } else {
      text(c, label, x + w / 2, y + h / 2, o.size || 15, hov ? RED : INK2, 'center', false);
      if (hov) { c.font = (o.size || 15) + 'px ' + C.FONT; var tw = c.measureText(label).width; c.strokeStyle = RED; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w / 2 - tw / 2, y + h / 2 + 10); c.lineTo(x + w / 2 + tw / 2, y + h / 2 + 10); c.stroke(); }
    }
    var dbg = ui.ovBtns || (ui.ovBtns = []); c.font = (kind === 'primary' ? 'bold ' + (o.size || 24) + 'px ' + KAI : (kind === 'secondary' ? 'bold ' + (o.size || 19) + 'px ' + (o.kai ? KAI : C.FONT) : (o.size || 15) + 'px ' + C.FONT)); dbg.push({ label: label, act: act, tw: Math.ceil(c.measureText(XY.fmtStr(label)).width + (kind === 'primary' ? 6 * label.length : 0)), x: x, y: y, w: w, h: h, key: !!o.key });
    c.restore(); var hh = { x: x, y: y, w: w, h: h, act: act }; if (extra) for (var k in extra) hh[k] = extra[k]; ui.hits.push(hh);
  };
  // 分段开关：opts = [{label, act, hit, on}]
  ov.seg = function (c, app, x, y, w, h, opts) {
    R.rrect(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(120,90,40,0.10)'; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(120,90,40,0.35)'; c.stroke();
    var n = opts.length, sw = (w - 6) / n, i;
    for (i = 0; i < n; i++) {
      var o = opts[i], sx = x + 3 + i * sw, hov = !o.on && over(app, sx, y + 3, sw, h - 6);
      if (o.on) { R.rrect(c, sx, y + 3, sw, h - 6, (h - 6) / 2); c.fillStyle = '#f6dc9b'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#c9a44c'; c.stroke(); }
      else if (hov) { R.rrect(c, sx, y + 3, sw, h - 6, (h - 6) / 2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill(); }
      text(c, o.label, sx + sw / 2, y + h / 2 + 1, 14, o.on ? INK : INK2, 'center', !!o.on);
      var hitH = Math.max(h - 6, 44), hitW = Math.max(sw, 44);
      var hh = { x: Math.round(sx + sw / 2 - hitW / 2), y: Math.round(y + h / 2 - hitH / 2), w: hitW, h: hitH, act: o.act };
      if (o.hit) for (var k in o.hit) if (k !== 'y' && k !== 'h' && k !== 'x' && k !== 'w') hh[k] = o.hit[k];
      if (o.hit && o.hit.h != null && o.hit.h >= 44) { hh.h = o.hit.h; if (o.hit.y != null) hh.y = o.hit.y; }
      ui.hits.push(hh);
    }
  };
  ov.tile = function (c, x, y, w, h, label, value, col) {
    R.rrect(c, x, y, w, h, 12); c.fillStyle = 'rgba(255,255,255,0.72)'; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(201,164,76,0.5)'; c.stroke();
    text(c, label, x + w / 2, y + 16, 12.5, INK2, 'center', false);
    var sz = 26; c.font = 'bold ' + sz + 'px ' + KAI; while (sz > 15 && c.measureText(XY.fmtStr(value)).width > w - 14) { sz--; c.font = 'bold ' + sz + 'px ' + KAI; }
    text(c, value, x + w / 2, y + h - 21, sz, col || INK, 'center', true, KAI);
  };
  ov.chip = function (c, cx, y, s, fill, ink, bd) {
    c.font = 'bold 12.5px ' + C.FONT; var w = c.measureText(XY.fmtStr(s)).width + 22; R.rrect(c, cx - w / 2, y, w, 24, 12); c.fillStyle = fill; c.fill(); if (bd) { c.lineWidth = 1; c.strokeStyle = bd; c.stroke(); }
    text(c, s, cx, y + 12.5, 12.5, ink, 'center', true); return w;
  };

  /* ---------- 暂停页 ---------- */
  ov.pause = function (c, G, app) { ov.scaled(c, app, ov.fit(app, 460, 640), function () { pauseInner(c, G, app); }); };
  function pauseInner(c, G, app) {
    var W = app.lw, H = app.lh, pw = 460, ph = 640, px = Math.round(W / 2 - pw / 2), py = Math.round(Math.max(8, H / 2 - ph / 2)), cx = W / 2, mn = G.t / 60;
    ov.modal(c, px, py, pw, ph);
    ov.title(c, '已暂停', cx, py + 52, 46);
    ov.rule(c, cx, py + 88, 250);
    text(c, XY.lvPre(G) + G.lv.name + '」', cx, py + 110, 15, INK2, 'center', false);
    var tw = 124, tg = 12, tx = cx - (tw * 3 + tg * 2) / 2, ty = py + 130;
    ov.tile(c, tx, ty, tw, 66, '已坚持', XY.fmtTime(G.t));
    ov.tile(c, tx + tw + tg, ty, tw, 66, '等级', 'Lv ' + G.level);
    ov.tile(c, tx + (tw + tg) * 2, ty, tw, 66, '击杀', XY.fmtNum(G.kills));
    var s1 = '小怪 +' + Math.round(C.ENEMY_SCALE * mn * 100) + '%', s2 = 'BOSS +' + Math.round(C.BOSS_SCALE * mn * 100) + '%';
    c.font = 'bold 12.5px ' + C.FONT; var w1 = c.measureText(s1).width + 22, w2 = c.measureText(s2).width + 22, gx = cx - (w1 + w2 + 8) / 2;
    ov.chip(c, gx + w1 / 2, py + 210, s1, 'rgba(200,52,31,0.09)', '#a82a16', 'rgba(200,52,31,0.3)'); ov.chip(c, gx + w1 + 8 + w2 / 2, py + 210, s2, 'rgba(200,52,31,0.09)', '#a82a16', 'rgba(200,52,31,0.3)');
    text(c, '难度随时间增长：小怪每分钟 +1%，BOSS 每分钟 +5%', cx, py + 248, 12, INK2, 'center', false);
    var bw = 316, bx = cx - bw / 2;
    ov.btn(c, app, bx, py + 274, bw, 60, '继 续', 'resume', { primary: true, key: 'Esc / P', size: 26 });
    ov.btn(c, app, bx, py + 346, bw, 48, '重新开始', 'restart', { key: 'R', size: 18 });
    if (XY.inkBg) XY.inkBg();
    var muted = !!(XY.audio && XY.audio.mute);
    text(c, '音效', px + 72, py + 468, 14, INK2, 'left', false);
    ov.seg(c, app, px + 132, py + 446, 256, 46, [{ label: '开', act: 'muteSet', hit: { mute: false }, on: !muted }, { label: '关', act: 'muteSet', hit: { mute: true }, on: muted }]);
    text(c, '快捷键 M 也可开关', cx, py + 506, 11.5, INK2, 'center', false);
    if (XY.auto) {
      text(c, '自动', px + 72, py + 540, 14, INK2, 'left', false);
      ov.seg(c, app, px + 112, py + 518, 300, 46, ['points', 'treat', 'guest', 'pick'].map(function (k) { return { label: XY.auto.LABEL[k], act: 'autoTog', hit: { key: k, y: py + 508, h: 66 }, on: XY.auto.get(k) }; }));
    }
    ov.btn(c, app, cx - 70, py + ph - 52, 140, 44, '回到首页', 'home', { kind: 'text' });
  };

  /* ---------- 结算页 ---------- */
  function starExtra(G, win) {
    var si = XY.sweep09 && XY.sweep09.resultStars(G, win); if (!si) return 0;
    if (si.show) return 36 + (si.tip ? 22 : 6);
    return si.faint ? 22 : 0;
  }
  function endPh(G, win, H) {
    var Q = G.quests, why = G.ending && (G.ending.why || G.ending.reason), qs = [Q.main].concat(Q.sides), sp = G.spGot || [], nu = (G.runReport || {}).newUnlocks || [];
    return Math.min(130 + starExtra(G, win) + (win ? 6 : (why ? 52 : 6)) + 30 + qs.length * 26 + 12 + 80 + 52 + (sp.length ? 66 : 0) + (nu.length ? 26 : 0) + 44 + 76, H - 12);
  }
  ov.end = function (c, G, app, win) { ov.scaled(c, app, ov.fit(app, 680, endPh(G, win, app.lh)), function () { endInner(c, G, app, win); }); };
  function endInner(c, G, app, win) {
    var W = app.lw, H = app.lh, cause = G.ending && G.ending.cause, rep = G.runReport || {}, Q = G.quests, cx = W / 2, hasNext = win && !G.dungeon && !G.mod && G.levelId < XY.LEVEL_COUNT;
    var sp = G.spGot || [], nu = (rep.newUnlocks || []).map(function (id) { return XY.UNLOCK_BY[id].name; });
    var why = G.ending && (G.ending.why || G.ending.reason), pw = 680, qs = [Q.main].concat(Q.sides);
    var bo = win && G.bossOffer && XY.bossfight && XY.bossfight.launch ? 1 : 0;
    var ph = (bo ? 64 : 0) + 130 + starExtra(G, win) + (win ? 6 : (why ? 52 : 6)) + 30 + qs.length * 26 + 12 + 80 + 52 + (sp.length ? 66 : 0) + (nu.length ? 26 : 0) + 44 + 76;
    ph = Math.min(ph, H - 12); var px = Math.round(cx - pw / 2), py = Math.round(Math.max(6, H / 2 - ph / 2)), edge = win ? '#d9a21a' : '#b4584a';
    ov.modal(c, px, py, pw, ph, { edge: edge });
    var ty = py + 54;
    if (win) { var gr = c.createRadialGradient(cx, ty, 6, cx, ty, 150); gr.addColorStop(0, 'rgba(255,214,120,0.38)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = gr; c.fillRect(px + 20, ty - 70, pw - 40, 140); }
    ov.title(c, win ? '过 关' : (cause === 'tang' ? '师傅阵亡' : '基地被入侵'), cx, ty, 52, win ? '#a8680a' : '#8a3a2a');
    ov.rule(c, cx, ty + 36, 260, win ? null : '#b4584a');
    text(c, XY.lvPre(G) + G.lv.name + '」' + (win ? (G.dungeon ? ' · 洞主已倒，唐僧走出了洞' : ' · 唐僧走进了关口「' + G.gate.name + '」') : ''), cx, ty + 58, 15, INK2, 'center', false);
    var y = ty + 76;
    var si = XY.sweep09 && XY.sweep09.resultStars(G, win);
    if (si && si.show) {
      text(c, si.text + (si.isNew ? '　新纪录' : ''), cx, y + 10, 30, '#a8680a', 'center', true);
      y += 36;
      if (si.tip) { text(c, si.tip, cx, y + 2, 13, '#8a5a12', 'center', false); y += 22; } else y += 6;
    } else if (si && si.faint) { text(c, si.faint, cx, y + 4, 12.5, '#b0a48c', 'center', false); y += 22; }
    if (!win && why) { R.rrect(c, px + 40, y, pw - 80, 38, 10); c.fillStyle = 'rgba(200,52,31,0.07)'; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(200,52,31,0.28)'; c.stroke(); text(c, '死因：' + why, cx, y + 19.5, 14.5, '#a8321f', 'center', true); y += 52; } else y += 6;
    ov.head(c, '任务结果', px + 40, y + 6, pw - 80); y += 30;
    qs.forEach(function (q, k) {
      var col = q.done ? '#2f7d3b' : '#a89a80', rw = q.def.reward;
      c.beginPath(); c.arc(px + 54, y + 8, 8, 0, Math.PI * 2); c.fillStyle = q.done ? 'rgba(47,125,59,0.14)' : 'rgba(150,135,105,0.14)'; c.fill();
      text(c, q.done ? '✔' : '·', px + 54, y + 9, 12, col, 'center', true);
      text(c, (k ? '支线　' : '主线　') + q.def.short, px + 72, y + 8, 14.5, q.done ? INK : INK2, 'left', q.done);
      text(c, q.done && rw ? (rw.card ? '法宝 ' : '') + (rw.lingshi ? '灵石 +' + rw.lingshi : '') + (rw.shard ? ' 碎片 +' + rw.shard : '') : (q.done ? '' : '未完成'), px + pw - 40, y + 8, 12.5, q.done ? '#a8700a' : '#b0a48c', 'right', false);
      y += 26;
    });
    y += 12;
    var dens = G.dens.filter(function (d) { return !d.alive; }).length, dead = G.heroes.filter(function (h) { return h.down; }).map(function (h) { return h.def.name; });
    var tw = (pw - 80 - 36) / 4, tx = px + 40;
    ov.tile(c, tx, y, tw, 66, '用时', XY.fmtTime(G.t)); ov.tile(c, tx + (tw + 12), y, tw, 66, '等级', 'Lv ' + G.level);
    ov.tile(c, tx + (tw + 12) * 2, y, tw, 66, '击杀', XY.fmtNum(G.kills)); ov.tile(c, tx + (tw + 12) * 3, y, tw, 66, '镇灭洞府', dens + ' / ' + G.dens.length); y += 66 + 14;
    text(c, '阵亡英雄', px + 44, y + 6, 14, INK2, 'left', false); text(c, dead.length ? dead.join('、') : '无', px + pw - 44, y + 6, 14, dead.length ? '#a8321f' : '#2f7d3b', 'right', true); y += 24;
    text(c, '法宝 / 灵石', px + 44, y + 6, 14, INK2, 'left', false); text(c, (G.cardLog ? G.cardLog.length : 0) + ' 张 · 灵石 +' + XY.fmtNum((G.run && G.run.clearGain) || 0), px + pw - 44, y + 6, 14, INK, 'right', true); y += 28;
    if (sp.length) {
      ov.head(c, '掉落角色卡', px + 40, y + 6, pw - 80); y += 36;
      sp.forEach(function (g, k) { var d = XY.specialDef(g.id, Math.max(1, XY.save.spLevel(g.id))); XY.R4.avatarDisc(c, d, px + 70 + k * 190, y + 8, 18, app.rt); text(c, XY.SP_BY[g.id].name + ' ×1', px + 96 + k * 190, y + 8, 14, INK, 'left', true); });
      y += 30;
    }
    if (nu.length) { text(c, '★ 新解锁：' + nu.join('、'), cx, y + 8, 14, '#2f7d3b', 'center', true); y += 26; }
    var jn = G.mod ? '非官方玩法包：只能玩，不发任何奖励，不记通关，不影响存档' : G.dungeon ? (win ? '洞府副本不计入取经之旅：第 1 关和后面的进度都没有变（首通奖励已发）' : '副本失败不扣任何东西，再来一局就是了') : win ? (G.levelId < XY.LEVEL_COUNT ? '取经之旅：全队 Lv' + G.level + '、技能和法宝已存档，带进第 ' + (G.levelId + 1) + ' 关（阵亡的师徒也会带着等级回来）' : '取经之旅：全部关卡走完！成长已存档') : '失败不会清掉之前的积累：再来一局会回到本关开始时的状态（' + XY.journey.status(G.levelId).text + '）';
    var by = py + ph - 76;
    if (bo) { ov.btn(c, app, cx - 190, by - 98, 380, 46, '挑战 牛魔王 · Boss 战', 'bossGo', { size: 19, sp: 3 }); }
    R.wrap(c, jn, cx, by - 22, pw - 90, 12.5, 18, win ? '#2f7d3b' : INK2, 2);
    if (hasNext) { ov.btn(c, app, px + 28, by, 214, 54, '下一关', 'nextLevel', { primary: true, size: 22, sp: 4 }); ov.btn(c, app, px + 254, by, 190, 54, '再来一局', 'restart', { key: 'R', size: 17 }); ov.btn(c, app, px + 456, by, 196, 54, '回到首页', 'home', { size: 17 }); }
    else if (!win) { ov.btn(c, app, px + 28, by, 214, 54, '再来一局', 'restart', { primary: true, size: 22, sp: 4, key: 'R' }); ov.btn(c, app, px + 254, by, 190, 54, '换角色再来', 'repick', { size: 17 }); ov.btn(c, app, px + 456, by, 196, 54, '回到首页', 'home', { size: 17 }); }
    else { ov.btn(c, app, px + 110, by, 230, 54, '再来一局', 'restart', { primary: true, size: 22, sp: 4, key: 'R' }); ov.btn(c, app, px + 360, by, 210, 54, '回到首页', 'home', { size: 17 }); }
    XY.R4.verBtn(c, app, px + pw - 178, py + 16, 160, 34);
    if (app.menuMsg && app.rt < app.menuMsg.until) text(c, app.menuMsg.text, cx, py + ph - 9, 13, '#2f7d3b', 'center', true);
  };
  XY.R4.end = ov.end;
})();
