/* ============================================================
 * villain_lairui.js —— v0.9 洞府设计页 / 验关 HUD / 验关战场画面 / 战报页（浅色水墨风，CSS 像素排版，按钮 ≥ 44 px）
 *  编辑方式：点一种塔（或陷阱）→ 再点空格子放下；点已有的塔 → 弹出「升阶 / 拆除」；格子不够大时拖动地图平移。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, VD = XY.VD, L = XY.lair, VU = XY.villainUI, R = XY.R, rrect = R.rrect, ui = XY.ui, PI2 = Math.PI * 2;
  var LU = XY.lairUI = { draft: null, hist: [], redo: [], tab: 'place', sel: null, modal: null, more: false, sc: 0, msg: null, px: 0, py: 0, geo: null };
  var INK = '#3a3226', SOFT = '#6d6455', GOLD = '#c9a24a', PAPER = '#fffdf6', PUR = '#6f4aa8';
  var IP = XY.INKP;
  var TRAP_DESC = { bantou: '路过的英雄减速 50%，持续 3 秒', huolun: '路过的英雄每秒灼烧 20，持续 6 秒', duwu: '路过的英雄中毒，每秒 8，持续 6 秒', zhenyao: '眩晕英雄 1.5 秒，20 秒冷却', zhenqi: '附近的塔攻速 +15%' };
  function app() { return window.__xy.app; }
  function txt(c, s, x, y, sz, col, al, bold, maxW) { VU.txt(c, s, x, y, sz, col, al, bold, maxW); }
  function say(t, bad) { LU.msg = { text: t, bad: !!bad, until: app().rt + 3.5 }; }
  var ROM = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'];
  function base() { var d = L.recommend({}); d.towers = []; d.traps = []; d.name = '我的洞府'; return L.finalize(d); }
  function snap() { LU.hist.push(JSON.stringify(LU.draft)); if (LU.hist.length > 60) LU.hist.shift(); LU.redo = []; }
  LU.enter = function () { if (VU.tipDom) VU.tipDom('lair'); var s = L.saved(); LU.draft = s ? L.clone(s) : base(); LU.hist = []; LU.redo = []; LU.sel = null; LU.modal = null; LU.more = false; LU.sc = 0; LU.tab = 'place'; LU.px = LU.py = 0; LU.msg = null; };
  LU.dirty = function () { var s = L.saved(); return !s || L.hash(LU.draft) !== s.hash; };
  LU.back = function () { if (LU.more) { LU.more = false; return true; } if (LU.modal) { LU.modal = null; return true; } return false; };

  /* ---------- 几何 ---------- */
  /* 保存 / 验关 / 推荐 / 更多：错落的印章，不是一排等宽格子 */
  function sealPos(cw, ch, land) {
    var R = cw - 10;
    if (land) return { save: { x: R - 74, y: 60, w: 74, h: 72 }, ver: { x: R - 78, y: 140, w: 58, h: 56 }, rec: { x: R - 54, y: 204, w: 54, h: 52 }, more: { x: R - 64, y: 264, w: 44, h: 44 } };
    return { save: { x: 10, y: ch - 10 - 70, w: 84, h: 70 }, ver: { x: 102, y: ch - 10 - 58, w: 62, h: 56 }, rec: { x: 172, y: ch - 10 - 62, w: 58, h: 52 }, more: { x: cw - 10 - 44, y: ch - 10 - 48, w: 44, h: 44 } };
  }
  function geom(cw, ch) {
    var land = cw >= 600 && cw > ch * 1.1, g = { land: land }, fit, MIN = land ? 26 : 40, n = VD.TOWER_ORDER.length;
    if (land) {
      var cH = Math.round(Math.min(210, Math.max(130, (ch - 120) / 2.2))), cW = Math.round(cH * 0.8), sw = cW + 14;
      g.card = { w: cW, h: cH, gap: 8 }; g.tabs = { x: 10, y: 58, w: sw }; g.view = { x: 10, y: 108, w: sw, h: ch - 118, vert: true };
      g.seals = sealPos(cw, ch, true); g.sealL = cw - 88; g.note = { x: 252, y: 5, w: Math.min(540, cw - 114 - 8 - 252), h: 46 };
      var gx = 10 + sw + 4, gr = g.sealL - 4; g.grid = { x: gx, y: 58, w: gr - gx, h: ch - 66 };
      fit = Math.min(g.grid.w / L.GW, (g.grid.h - 12) / L.GH);
    } else {
      var cH2 = Math.round(Math.min(160, Math.max(120, ch * 0.2))), cW2 = Math.round(cH2 * 0.8), sh = 56, sgp = 8;
      g.card = { w: cW2, h: cH2, gap: 8 }; g.note = { x: 10, y: 58, w: cw - 20, h: 46 }; g.tabs = { x: 10, y: 108, w: 150 }; g.view = { x: 10, y: 156, w: cw - 20, h: cH2 + 12, vert: false };
      g.seals = sealPos(cw, ch, false); g.sealTop = ch - 10 - 70;
      var gy = g.view.y + g.view.h + 4; g.grid = { x: 10, y: gy, w: cw - 20, h: g.sealTop - 6 - gy };
      fit = (cw - 20) / L.GW;
    }
    g.cell = fit >= MIN ? Math.min(fit, 64) : MIN; g.pan = fit < MIN; g.top = 12;
    g.mw = g.cell * L.GW; g.mh = g.cell * L.GH;
    if (!g.pan) { g.ox = g.grid.x + (g.grid.w - g.mw) / 2; g.oy = g.grid.y + Math.max(g.top, (g.grid.h - g.mh) / 2 + 6); LU.px = LU.py = 0; }
    else { LU.px = Math.max(Math.min(0, g.grid.w - g.mw), Math.min(0, LU.px)); LU.py = Math.max(Math.min(0, g.grid.h - g.mh - g.top), Math.min(0, LU.py)); g.ox = g.grid.x + LU.px; g.oy = g.grid.y + g.top + LU.py; }
    var step = (g.view.vert ? g.card.h : g.card.w) + g.card.gap, len = n * step + 10 - g.card.gap, vis = g.view.vert ? g.view.h : g.view.w;
    g.step = step; g.maxSc = Math.max(0, len - vis); LU.sc = Math.max(0, Math.min(g.maxSc, LU.sc || 0));
    return g;
  }
  function cellOf(g, x, y) { if (x < g.grid.x || y < g.grid.y || x > g.grid.x + g.grid.w || y > g.grid.y + g.grid.h) return null; var c = [Math.floor((x - g.ox) / g.cell), Math.floor((y - g.oy) / g.cell)]; return c[0] < 0 || c[1] < 0 || c[0] >= L.GW || c[1] >= L.GH ? null : c; }
  function at(list, c) { for (var i = 0; i < list.length; i++) if (list[i].c[0] === c[0] && list[i].c[1] === c[1]) return i; return -1; }
  function onPath(d, c) { return d.path.some(function (p) { return p[0] === c[0] && p[1] === c[1]; }); }
  function isRock(d, c) { return d.rocks.some(function (p) { return p[0] === c[0] && p[1] === c[1]; }); }

  /* ---------- 编辑动作 ---------- */
  function counts(d) { var t3 = 0; d.towers.forEach(function (t) { if (t.tier === 3) t3++; }); return { towers: d.towers.length, t3: t3, traps: d.traps.length, cost: L.cost(d) }; }
  LU.place = function (c) {
    var d = LU.draft, sel = LU.sel, lv = VD.LV[1], k = counts(d);
    if (!sel) { var ti = at(d.towers, c), ri = at(d.traps, c); if (ti >= 0) { LU.modal = { k: 'tower', i: ti }; } else if (ri >= 0) LU.modal = { k: 'trap', i: ri }; else say('先在右边点一种塔或陷阱，再点格子', false); return false; }
    if (sel.k === 'tower') {
      var ex = at(d.towers, c); if (ex >= 0) { LU.modal = { k: 'tower', i: ex }; return false; }
      if (onPath(d, c)) return say('塔不能放在路上（陷阱才放路上）', true), false;
      if (isRock(d, c)) return say('这里是岩石', true), false;
      if (L.forbidden(d, c)) return say('入口 / 洞府周围一格不能建塔', true), false;
      if (k.towers >= lv.slots) return say('塔位满了（最多 ' + lv.slots + ' 座）', true), false;
      if (k.cost + VD.useCost({ t: sel.id, tier: 1, evo: VD.ser().evo[sel.id] || 0 }) > lv.budget) return say('预算不够了', true), false;
      snap(); d.towers.push({ c: c, t: sel.id, tier: 1 }); L.finalize(d); return true;
    }
    if (!onPath(d, c)) return say('陷阱要放在路径格上', true), false;
    if (at(d.traps, c) >= 0) { LU.modal = { k: 'trap', i: at(d.traps, c) }; return false; }
    if (k.traps >= lv.traps) return say('陷阱最多 ' + lv.traps + ' 个', true), false;
    var s = VD.ser(), used = d.traps.filter(function (t) { return t.t === sel.id; }).length, have = (s.traps[sel.id] || 0) + ((s.lair.trapsUsed || {})[sel.id] || 0);
    if (used >= have) return say('「' + VD.TRAPS[sel.id].name + '」库存不够（打反派关会掉）', true), false;
    if (k.cost + VD.trapCost(sel.id) > lv.budget) return say('预算不够了', true), false;
    snap(); d.traps.push({ c: c, t: sel.id }); L.finalize(d); return true;
  };
  LU.upgrade = function (i) {
    var d = LU.draft, t = d.towers[i], lv = VD.LV[1]; if (!t) return;
    if (t.tier >= 3) return say('已经是三阶', true);
    if (t.tier === 2 && counts(d).t3 >= lv.t3) return say('三阶塔最多 ' + lv.t3 + ' 座', true);
    var add = VD.useCost({ t: t.t, tier: t.tier + 1, evo: t.evo | 0 }) - VD.useCost({ t: t.t, tier: t.tier, evo: t.evo | 0 }); if (counts(d).cost + add > lv.budget) return say('预算不够升阶', true);
    snap(); t.tier++; L.finalize(d); say('升到 ' + ROM[t.tier] + ' 阶'); LU.modal = null;
  };
  LU.remove = function (m) { snap(); if (m.k === 'tower') LU.draft.towers.splice(m.i, 1); else LU.draft.traps.splice(m.i, 1); L.finalize(LU.draft); LU.modal = null; };
  LU.undo = function () { if (!LU.hist.length) return say('没有可撤销的', true); LU.redo.push(JSON.stringify(LU.draft)); LU.draft = JSON.parse(LU.hist.pop()); };
  LU.redoF = function () { if (!LU.redo.length) return say('没有可重做的', true); LU.hist.push(JSON.stringify(LU.draft)); LU.draft = JSON.parse(LU.redo.pop()); };
  LU.recommend = function () { snap(); var d = L.recommend({}); d.name = LU.draft.name; LU.draft = d; var s = VD.ser(), need = L.towerCost(d) - (s.lair.spent || 0); say('已摆好推荐布局：' + d.towers.length + ' 座塔 · ' + d.traps.length + ' 个陷阱' + (need > s.wallet.yaojin ? '（保存要 ' + Math.max(0, need) + ' 妖金，你还差 ' + (need - s.wallet.yaojin) + '）' : '')); };
  LU.save = function () { var r = L.save(LU.draft); if (!r.ok) return say(r.reason, true); LU.draft = L.clone(r.doc); say(r.changed ? '已保存（第 ' + r.doc.rev + ' 版）' + (r.paid > 0 ? '，花了 ' + r.paid + ' 妖金' : r.paid < 0 ? '，退回 ' + Math.floor(-r.paid * 0.7) + ' 妖金' : '') + '。内容变了，要重新验关' : '已保存（没变化）'); };
  LU.verify = function () {
    var s = L.saved(); if (!s) return say('先保存洞府', true); if (LU.dirty()) return say('有没保存的修改：先保存再验关', true);
    var vv = L.validate(s); if (!vv.ok) return say(vv.errors[0] + '（进化会占预算：拆掉点东西再保存）', true);
    if (!s.towers.length) return say('洞府里还没有塔：先「一键推荐」或自己摆', true);
    var w = window.__xy; w.startLair({ doc: L.clone(s), mode: 'verify', seed: (VD.ser().lair.runs || 0) + 1 }); w.G.speed = 4;
  };
  LU.publish = function () { var r = L.publish(); if (!r.ok) return say(r.reason, true); LU.codeDialog(r.code, '已发布：把洞府码发给朋友，他们能导入看到你的洞府'); };

  /* ---------- 洞府码对话框（DOM：要复制 / 粘贴文字）---------- */
  LU.codeDialog = function (code, tip) {
    var old = document.getElementById('lairCode'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'lairCode'; el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(58,50,38,0.35);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box';
    var card = document.createElement('div'); card.className='inkDialog inkCode'; card.setAttribute('role','dialog'); card.setAttribute('aria-label','洞府码'); card.style.cssText = 'background:#fffdf6;border:2.5px solid #a8905a;border-radius:14px 10px 16px 12px/12px 16px 10px 14px;padding:14px;width:min(520px,100%);max-height:100%;overflow:auto;color:#3a3226;font-size:14px;box-sizing:border-box';
    var h = document.createElement('div'); h.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:6px'; h.textContent = '洞府码'; var p = document.createElement('div'); p.id = 'lairCodeMsg'; p.style.cssText = 'color:#6d6455;margin-bottom:8px;min-height:20px'; p.textContent = tip || '复制保存，或把别人的洞府码粘贴进来导入';
    var ta = document.createElement('textarea'); ta.id = 'lairCodeText'; ta.value = code || ''; ta.style.cssText = 'width:100%;height:96px;box-sizing:border-box;border:1.5px solid #cdbf9c;border-radius:10px;padding:8px;font-size:12px;font-family:monospace;background:#fff;color:#3a3226;word-break:break-all';
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';
    function btn(t, f, pri) { var b = document.createElement('button'); b.textContent = t; b.style.cssText = pri ? 'flex:1;min-width:84px;min-height:48px;border-radius:7px 10px 6px 9px/9px 6px 10px 7px;border:2px solid rgba(255,236,214,0.7);outline:2px solid #b8322a;background:#b8322a;color:#fff4e0;font-size:16px;font-weight:700;cursor:pointer;transform:rotate(-1deg)' : 'flex:1;min-width:84px;min-height:46px;border-radius:4px 14px 8px 18px/10px 6px 14px 6px;border:none;border-bottom:3px solid rgba(58,50,38,0.45);background:rgba(58,50,38,0.08);color:#3a3226;font-size:15px;font-weight:700;cursor:pointer'; b.onclick = f; row.appendChild(b); return b; }
    btn('复制', function () { ta.select(); try { document.execCommand('copy'); p.textContent = '已复制'; } catch (e) { p.textContent = '请手动复制'; } }, false);
    btn('导入', function () { var r = LU.importCode(ta.value); p.textContent = r.msg; p.style.color = r.ok ? '#2f7d3b' : '#b33a2a'; if(r.ok){this.disabled=true;ta.readOnly=true;p.setAttribute('role','status');row.lastChild.focus();} }, true);
    btn('关闭', function () { el.remove(); }, false);
    card.appendChild(h); card.appendChild(p); card.appendChild(ta); card.appendChild(row); el.appendChild(card); document.body.appendChild(el);if(XY.pv2.dialogKeys)XY.pv2.dialogKeys(el,function(){el.remove();},ta);return el;
  };
  LU.importCode = function (code) {
    var r = L.parse(code); if (!r.ok) return { ok: false, msg: r.reason };
    snap(); LU.draft = r.doc; LU.draft.name = (r.doc.name || '洞府') + '（导入）'; L.finalize(LU.draft); say('已导入：保存后才生效；验关记录以哈希为准');
    return { ok: true, msg: '导入成功：' + LU.draft.towers.length + ' 座塔，' + LU.draft.traps.length + ' 个陷阱' + (LU.draft.verify ? '，带验关记录' : '，没有验关记录') };
  };

  /* ---------- 画：塔 / 陷阱图形 ---------- */
  function trapShape(c, t, x, y, r) {
    c.save(); c.translate(x, y); c.lineWidth = 2; c.lineCap = 'round';
    if (t === 'bantou') { c.strokeStyle = '#8a6a3a'; c.beginPath(); c.arc(0, 0, r * 0.7, 0, PI2); c.stroke(); c.beginPath(); c.moveTo(-r * 0.9, r * 0.1); c.lineTo(r * 0.9, -r * 0.1); c.stroke(); c.fillStyle = '#d9b24a'; c.beginPath(); c.arc(r * 0.7, 0, 3, 0, PI2); c.fill(); }
    else if (t === 'huolun') { c.strokeStyle = '#c0391b'; c.beginPath(); c.arc(0, 0, r * 0.65, 0, PI2); c.stroke(); c.fillStyle = '#f59a23'; c.beginPath(); c.moveTo(0, -r * 0.7); c.quadraticCurveTo(r * 0.5, -r * 0.1, 0, r * 0.45); c.quadraticCurveTo(-r * 0.5, -r * 0.1, 0, -r * 0.7); c.fill(); }
    else if (t === 'duwu') { c.fillStyle = '#7bb86f'; c.beginPath(); c.arc(-r * 0.3, 0, r * 0.4, 0, PI2); c.arc(r * 0.25, -r * 0.1, r * 0.45, 0, PI2); c.arc(0, r * 0.25, r * 0.38, 0, PI2); c.fill(); c.strokeStyle = '#3f7a38'; c.stroke(); }
    else if (t === 'zhenyao') { c.fillStyle = '#d9b24a'; c.beginPath(); c.arc(0, -r * 0.1, r * 0.65, 0, Math.PI); c.closePath(); c.fill(); c.strokeStyle = '#7a5a10'; c.stroke(); c.beginPath(); c.moveTo(-r * 0.7, r * 0.55); c.lineTo(r * 0.7, r * 0.55); c.stroke(); }
    else { c.strokeStyle = '#6b4aa6'; c.beginPath(); c.moveTo(-r * 0.4, r * 0.75); c.lineTo(-r * 0.4, -r * 0.75); c.stroke(); c.fillStyle = '#c0391b'; c.beginPath(); c.moveTo(-r * 0.4, -r * 0.7); c.lineTo(r * 0.7, -r * 0.35); c.lineTo(-r * 0.4, 0); c.closePath(); c.fill(); }
    c.restore();
  }
  function tierBase(c, x, y, r, tier) {
    c.save(); c.strokeStyle = tier === 3 ? '#b8322a' : tier === 2 ? '#c9a24a' : '#8a8576'; c.lineWidth = 3; c.fillStyle = tier === 3 ? 'rgba(214,90,70,0.2)' : tier === 2 ? 'rgba(217,178,74,0.22)' : 'rgba(120,115,100,0.16)';
    c.beginPath(); c.ellipse(x, y + r * 0.7, r, r * 0.4, 0, 0, PI2); c.fill(); c.stroke();
    var f = tier - 1, i; for (i = 0; i < f; i++) { var fx = x + r * (i ? 0.95 : -0.95); c.strokeStyle = '#5a4a30'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(fx, y + r * 0.6); c.lineTo(fx, y - r * 0.4); c.stroke(); c.fillStyle = tier === 3 ? '#c0391b' : '#d9b24a'; c.beginPath(); c.moveTo(fx, y - r * 0.4); c.lineTo(fx + (i ? -r * 0.5 : r * 0.5), y - r * 0.2); c.lineTo(fx, y); c.closePath(); c.fill(); }
    if (tier === 3) { c.globalAlpha = 0.5; c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + r * 0.7, r * 1.15, r * 0.5, 0, 0, PI2); c.stroke(); }
    c.restore();
  }
  function towerArt(c, type, evo, x, y, w, h) { VU.drawImg(c, 'evo/' + type + '_' + (evo || 0) + '.webp', x, y, w, h); }

  /* 路：墨线外圈 + 土黄路面 + 浅色中线，一笔下来的感觉 */
  function drawRoad(c, g, d) {
    var cell = g.cell, pts = d.path.map(function (p) { return [g.ox + (p[0] + 0.5) * cell, g.oy + (p[1] + 0.5) * cell]; }), i;
    if (pts.length < 2) return;
    function line(w, col, ja) {
      c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      pts.forEach(function (q, k) { var jx = ja ? (IP.hash(k, 3) - 0.5) * ja : 0, jy = ja ? (IP.hash(k, 5) - 0.5) * ja : 0; if (k) c.lineTo(q[0] + jx, q[1] + jy); else c.moveTo(q[0] + jx, q[1] + jy); }); c.stroke();
    }
    line(cell * 0.74 + 4, 'rgba(70,56,34,0.30)', cell * 0.06); line(cell * 0.72, '#dcc994', cell * 0.04); line(cell * 0.46, '#ecdcae', cell * 0.05);
    for (i = 2; i < pts.length - 1; i += 3) { var q0 = pts[i - 1], q1 = pts[i], an = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]); c.save(); c.translate(q1[0], q1[1]); c.rotate(an); c.strokeStyle = 'rgba(110,86,48,0.45)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -4.5); c.lineTo(3, 0); c.lineTo(-4, 4.5); c.stroke(); c.restore(); }
  }
  function rockAt(c, x, y, cell) { c.fillStyle = 'rgba(96,90,78,0.85)'; c.beginPath(); c.moveTo(x + cell * 0.18, y + cell * 0.82); c.lineTo(x + cell * 0.28, y + cell * 0.32); c.lineTo(x + cell * 0.58, y + cell * 0.2); c.lineTo(x + cell * 0.86, y + cell * 0.7); c.closePath(); c.fill(); c.strokeStyle = '#2d2a24'; c.lineWidth = 1.4; c.stroke(); }
  function rangeR(t, tier, evo, cell) { var sa = VD.stat(t, tier, evo); return (sa.rng || 0) / L.CELL * cell; }
  function rangeCircle(c, x, y, r, col) { if (r < 6) return; c.save(); c.fillStyle = 'rgba(' + col + ',0.10)'; c.strokeStyle = 'rgba(' + col + ',0.7)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill(); c.stroke(); c.restore(); }

  /* ---------- 选择器：竖版大立绘卡（小妖用立绘，陷阱用墨画图标），横滑 / 竖滑 ---------- */
  function pickCard(c, st, id, kind, x, y, w, h, on, o) {
    var s = VD.ser(), isT = kind === 'tower', col = isT ? VU.WASH[id] : '#8a5a2a', rgb = IP.rgb(col), dim = !!o.dim;
    if(on)VU.washE(c,x+w/2,y+h*.75,w*.8,h*.25,rgb,.18);
    c.save(); rrect(c, x + 4, y + 4, w - 8, h - 8, 7); c.clip(); VU.washE(c, x + w / 2, y + h * 0.55, w * 0.7, h * 0.42, rgb, dim ? 0.06 : 0.26); VU.hills(c, x, y + h * 0.4, w, h * 0.4, '110,98,80', dim ? 0.05 : 0.1, 9 + (o.i || 0)); c.restore();
    var ph = h * 0.22, py = y + h - ph - 5;
    if (isT) { var evo = s.evo[id] || 0, pop = on ? h * 0.05 : 0; c.globalAlpha = dim ? 0.4 : 1; VU.drawImg(c, 'evo/' + id + '_' + evo + '.webp', x + 2, y - pop + 2, w - 4, h * 0.84 + pop); c.globalAlpha = 1; }
    else { c.globalAlpha = dim ? 0.4 : 1; trapShape(c, id, x + w / 2, y + h * 0.4, w * 0.3); c.globalAlpha = 1; }
    if(on)VU.brush(c,x+12,py+ph-1,w-24,2,.45,(o.i||0)+8);
    txt(c, isT ? VD.TOWERS[id].name : VD.TRAPS[id].name, x + w / 2, py + ph * 0.34, Math.max(12, Math.min(16, w * 0.115)), dim ? '#8a8576' : INK, 'center', true, w - 20);
    txt(c, o.sub, x + w / 2, py + ph * 0.74, Math.max(11, Math.min(13, w * 0.09)), o.subCol, 'center', true, w - 20);
    if (o.lock) VU.seal(c, x + w / 2 - Math.min(w * 0.3, 44), y + h * 0.36, Math.min(w * 0.6, 88), 28, '未解锁', '#b8322a', 14);
    if (on) { VU.seal(c, x + w - 30, y + 8, 22, 22, '选', PUR, 12); }
  }
  function drawStrip(c, st, g, s, d, list, isTab, sel) {
    var V = g.view, k = g.card, vert = V.vert, i, drawn = [];
    c.save(); rrect(c, V.x - 2, V.y - 8, V.w + 4, V.h + 12, 8); c.clip();
    list.forEach(function (id, n) {
      var on = !!sel && sel.id === id && sel.k === (isTab ? 'trap' : 'tower'), p = n * g.step + 6 - LU.sc, x = vert ? V.x + (V.w - k.w) / 2 : V.x + p, y = vert ? V.y + p : V.y + 8;
      if (vert ? (y > V.y + V.h || y + k.h < V.y) : (x > V.x + V.w || x + k.w < V.x)) return;
      if (on) { if (vert) x += 4; else y -= 4; }
      var o = { i: n, on: on };
      if (!isTab) { var lk = !VD.unlocked(s, id); o.dim = lk; o.lock = lk; o.sub = lk ? '' : '造价 ' + VD.cost1(id); o.subCol = '#a8700a'; }
      else { var have = (s.traps[id] || 0) + ((s.lair.trapsUsed || {})[id] || 0) - d.traps.filter(function (t) { return t.t === id; }).length; o.dim = have <= 0; o.sub = '库存 ×' + Math.max(0, have); o.subCol = have > 0 ? '#4a2f8a' : '#8a8576'; }
      drawn.push({ id: id, on: on, x: x, y: y, o: o });
    });
    drawn.sort(function (p, q) { return (p.on ? 1 : 0) - (q.on ? 1 : 0); });
    drawn.forEach(function (e) { pickCard(c, st, e.id, isTab ? 'trap' : 'tower', e.x, e.y, k.w, k.h, e.on, e.o); });
    c.restore();
    drawn.forEach(function (e) {                                          // 点击区裁到视口里
      var x0 = Math.max(e.x, V.x), y0 = Math.max(e.y, V.y), x1 = Math.min(e.x + k.w, V.x + V.w), y1 = Math.min(e.y + k.h, V.y + V.h);
      if (x1 - x0 < 44 || y1 - y0 < 44) return;
      st.hit(x0, y0, x1 - x0, y1 - y0, isTab ? 'lPick' : (e.o.lock ? 'lLocked' : 'lPick'), { id: e.id, kind: isTab ? 'trap' : 'tower' });
    });
    if (g.maxSc > 0) {                                                    // 滑动提示：边缘墨渐隐 + 小箭头
      var more1 = LU.sc > 2, more2 = LU.sc < g.maxSc - 2, hx = vert ? V.x + V.w / 2 : 0, hy = vert ? 0 : V.y + V.h / 2;
      if (vert) { if (more1) txt(c, '︿', hx, V.y + 4, 14, SOFT, 'center', true); if (more2) txt(c, '﹀', hx, V.y + V.h - 2, 14, SOFT, 'center', true); }
      else { if (more1) txt(c, '‹', V.x + 5, hy, 26, SOFT, 'center', true); if (more2) txt(c, '›', V.x + V.w - 5, hy, 26, SOFT, 'center', true); }
    }
  }
  function drawNote(c, st, g, d, s, k, lv) {
    var N = g.note, need = L.towerCost(d) - (s.lair.spent || 0), over = k.cost > lv.budget, x = N.x, y = N.y, w = N.w, h = N.h, f = Math.min(1, k.cost / lv.budget);
    txt(c,'预算 '+k.cost+'/'+lv.budget,x+4,y+15,13,over?'#b33a2a':'#795716','left',true,132);
    XY.inkHud.line(c,x+4,y+25,120,f,over?'#a43b2c':'#69533b');
    txt(c,'塔'+k.towers+'/'+lv.slots+' 三阶'+k.t3+'/'+lv.t3+' 陷阱'+k.traps+'/'+lv.traps,x+140,y+15,11,INK,'left',true,w-144);
    txt(c,'第'+(d.rev||0)+'版 · '+(LU.dirty()?'未保存':'已保存')+' · '+(L.verifiedOK()?'已验关':'未验关')+(s.lair.published?' · 已发布':''),x+4,y+38,11,LU.dirty()?'#946213':'#37643d','left',true,w*.63);
    var costText=LU.dirty()?(need>0?'要 '+need+' 妖金':need<0?'退 '+Math.floor(-need*.7)+' 妖金':'不花妖金'):(L.verifiedOK()?'可发布':'下一步验关');
    txt(c,costText,x+w-4,y+38,11,SOFT,'right',false,w*.35);

  }
  function hintText(sel, s) {
    if (!sel) return '点一张小妖卡，再点地图上的空地放下；点放好的塔可升阶 / 拆除';
    if (sel.k === 'trap') return VD.TRAPS[sel.id].name + '：' + (TRAP_DESC[sel.id] || '') + '（放在路上）';
    var sa = VD.stat(sel.id, 1, s.evo[sel.id] || 0); return VD.TOWERS[sel.id].name + ' · 造价 ' + VD.cost1(sel.id) + ' · 生命 ' + Math.round(sa.hp) + ' · 伤害 ' + Math.round(sa.dmg) + ' · 射程 ' + sa.rng;
  }

  LU.draw = function (c, G, a) {
    var d = LU.draft, s = VD.ser(); if (!d) LU.enter(), d = LU.draft;
    var st = VU.begin(c, a), cw = st.cw, ch = st.ch, z = st.z, g = LU.geo = geom(cw, ch), k = counts(d), lv = VD.LV[1], sel = LU.sel, i, j;
    VU.frame(c, a, st, '我的洞府', null, 'lBack', '我的洞府', { rgb: '168,112,58', rgb2: '111,74,168', seed: 13 });
    var isTab = LU.tab === 'trap', mpx = a.mouse ? a.mouse.x * z : -1, mpy = a.mouse ? a.mouse.y * z : -1;
    drawNote(c, st, g, d, s, k, lv);
    /* ---- 地图：直接铺在宣纸上（没有灰网格、没有框；格子只作逻辑）---- */
    c.save(); if (g.pan) { rrect(c, g.grid.x, g.grid.y, g.grid.w, g.grid.h, 14); c.clip(); }
    var cell = g.cell, isT = sel && sel.k === 'tower';
    VU.washE(c, g.ox + g.mw * 0.5, g.oy + g.mh * 0.55, g.mw * 0.62, g.mh * 0.62, '201,174,118', 0.22); VU.washE(c, g.ox + g.mw * 0.85, g.oy + g.mh * 0.8, g.mw * 0.3, g.mh * 0.3, '110,98,80', 0.08);
    drawRoad(c, g, d);
    if (sel) for (i = 0; i < L.GW; i++) for (j = 0; j < L.GH; j++) {
      var cc = [i, j], onP = onPath(d, cc), good = isT ? (!onP && at(d.towers, cc) < 0 && !isRock(d, cc) && !L.forbidden(d, cc)) : (onP && at(d.traps, cc) < 0);
      if (good) { c.fillStyle = 'rgba(60,130,70,0.24)'; c.beginPath(); c.arc(g.ox + (i + 0.5) * cell, g.oy + (j + 0.5) * cell, Math.max(2, cell * 0.075), 0, PI2); c.fill(); }
    }
    d.rocks.forEach(function (p) { rockAt(c, g.ox + p[0] * cell, g.oy + p[1] * cell, cell); });
    if (d.path.length) {
      var a0 = d.path[0], a1 = d.path[d.path.length - 1]; VU.seal(c, g.ox + (a0[0] + 0.5) * cell - cell * 0.42, g.oy + (a0[1] + 0.5) * cell - cell * 0.28, cell * 0.84, cell * 0.56, '入口', '#b8322a', Math.max(9, cell * 0.34));
      var cxh = g.ox + (a1[0] + 0.5) * cell, cyh = g.oy + (a1[1] + 0.5) * cell; VU.washE(c, cxh, cyh, cell * 0.9, cell * 0.8, '111,74,168', 0.32); VU.seal(c, cxh - cell * 0.42, cyh - cell * 0.28, cell * 0.84, cell * 0.56, '洞府', PUR, Math.max(9, cell * 0.34));
    }
    d.traps.forEach(function (t) { trapShape(c, t.t, g.ox + (t.c[0] + 0.5) * cell, g.oy + (t.c[1] + 0.5) * cell, cell * 0.36); });
    var md = LU.modal && LU.modal.k === 'tower' ? d.towers[LU.modal.i] : null;
    if (md) rangeCircle(c, g.ox + (md.c[0] + 0.5) * cell, g.oy + (md.c[1] + 0.5) * cell, rangeR(md.t, md.tier, s.evo[md.t] || 0, cell), '111,74,168');
    var hover = !LU.modal && !LU.more && a.mouse && isT ? cellOf(g, mpx, mpy) : null;
    if (hover && at(d.towers, hover) < 0 && !onPath(d, hover) && !isRock(d, hover)) rangeCircle(c, g.ox + (hover[0] + 0.5) * cell, g.oy + (hover[1] + 0.5) * cell, rangeR(sel.id, 1, s.evo[sel.id] || 0, cell), '47,125,59');
    d.towers.slice().sort(function (p, q) { return p.c[1] - q.c[1]; }).forEach(function (t) {
      var x = g.ox + t.c[0] * cell, y = g.oy + t.c[1] * cell; tierBase(c, x + cell / 2, y + cell * 0.55, cell * 0.4, t.tier);
      var big = cell * 1.4; VU.drawImg(c, 'evo/' + t.t + '_' + (s.evo[t.t] || 0) + '.webp', x + cell / 2 - big * 0.375, y + cell * 0.95 - big, big * 0.75, big);
      var tcol = t.tier === 3 ? '#b8322a' : '#7a5a10'; c.beginPath(); c.arc(x + cell - 5, y + 6, Math.max(6, cell * 0.2), 0, PI2); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = tcol; c.stroke(); txt(c, ROM[t.tier], x + cell - 5, y + 7, Math.max(9, cell * 0.28), tcol, 'center', true);
    });
    if (hover && at(d.towers, hover) < 0 && !onPath(d, hover) && !isRock(d, hover)) { c.globalAlpha = 0.5; var hx = g.ox + hover[0] * cell, hy = g.oy + hover[1] * cell, hb = cell * 1.4; VU.drawImg(c, 'evo/' + sel.id + '_' + (s.evo[sel.id] || 0) + '.webp', hx + cell / 2 - hb * 0.375, hy + cell * 0.95 - hb, hb * 0.75, hb); c.globalAlpha = 1; }
    c.restore();
    if (g.pan) VU.chip(c, g.grid.x + 8, g.grid.y + 8, 96, 22, '拖动地图平移', SOFT, 'rgba(255,253,246,0.9)');
    /* ---- 提示条（消息 / 选中物说明），浮在地图底边 ---- */
    var hasMsg = LU.msg && a.rt < LU.msg.until, mw = Math.min(g.grid.w - 12, 560), my = g.grid.y + g.grid.h - 34, bad = hasMsg && LU.msg.bad, tcol2 = hasMsg ? (bad ? '#b33a2a' : '#2f7d3b') : '#4a2f8a';
    VU.drawTag(c, g.grid.x + (g.grid.w - mw) / 2, my, mw, 28, '', hasMsg ? tcol2 : '#8a7a58', { fill: hasMsg ? (bad ? 'rgba(255,238,232,0.96)' : 'rgba(242,252,240,0.96)') : 'rgba(255,251,238,0.88)', seed: 31, cutK: 0.25 });
    txt(c, hasMsg ? LU.msg.text : hintText(sel, s), g.grid.x + g.grid.w / 2, my + 15, 12.5, tcol2, 'center', true, mw - 18);
    /* ---- 选择卡：小妖 / 陷阱 ---- */
    [['tower', '小妖'], ['trap', '陷阱']].forEach(function (tb, n) { var on = (tb[0] === 'trap') === isTab, t0 = g.land ? Math.round(g.tabs.w * 0.54) : 76, tw = n ? (g.land ? g.tabs.w - t0 - 2 : 66) : t0; st.btn(g.tabs.x + (n ? t0 + 2 : 0), g.tabs.y + (n ? 3 : 0), tw, 44, tb[1], 'lTab', { ex: { id: tb[0] === 'trap' ? 'trap' : 'place' }, strong: on, rgb: on ? '111,74,168' : undefined, sz: 15 }); });
    if (!g.land) txt(c, g.maxSc > 0 ? '左右滑动选卡 ›' : '', g.tabs.x + 160, g.tabs.y + 24, 12.5, SOFT, 'left', false, cw - 190);
    drawStrip(c, st, g, s, d, isTab ? VD.TRAP_ORDER : VD.TOWER_ORDER, isTab, sel);
    LU.stripBox = { x: g.view.x, y: g.view.y, w: g.view.w, h: g.view.h, vert: g.view.vert };
    /* ---- 印章：保存 / 验关 / 推荐 / 更多 ---- */
    var SP = g.seals, dirty = LU.dirty(), verPri = !dirty && !L.verifiedOK();
    st.btn(SP.save.x, SP.save.y, SP.save.w, SP.save.h, '保存', 'lSave', { seal: true, pri: dirty, rot: -0.035 });
    st.btn(SP.ver.x, SP.ver.y, SP.ver.w, SP.ver.h, '验关', 'lVerify', { seal: true, pri: verPri, rot: 0.03 });
    st.btn(SP.rec.x, SP.rec.y, SP.rec.w, SP.rec.h, '推荐', 'lRec', { seal: true, col: '#a8700a', rot: -0.02 });
    st.btn(SP.more.x, SP.more.y, SP.more.w, SP.more.h, '⋯', 'lMore', { dot: true });
    /* ---- 更多：浮在印章旁的墨笺 ---- */
    if (LU.more) {
      var mi = [['撤销', 'lUndo', !LU.hist.length], ['重做', 'lRedo', !LU.redo.length], ['清空', 'lClear', false], ['发布', 'lPublish', !L.verifiedOK()], ['洞府码', 'lCode', false]];
      var pw = Math.min(cw - 24, 280), ph = 24 + 5 * 46, px = g.land ? SP.more.x - 14 - pw : (cw - pw) / 2, py = g.land ? Math.min(ch - ph - 10, SP.more.y + SP.more.h - ph) : g.sealTop - 8 - ph;
      var mpos = [[0.06,.54],[.38,.45],[.10,.58],[.46,.46],[.12,.68]];
      st.hit(0, 0, cw, ch, 'lMoreClose'); c.fillStyle = 'rgba(58,50,38,0.12)'; c.fillRect(0, 0, cw, ch);
      XY.pv2.note(c,px,py,pw,ph);
      st.hit(px, py, pw, ph, 'vNoop');
      mi.forEach(function (it, n) {
        var r = n, bx = px + pw * mpos[n][0], bw2 = Math.round(pw * mpos[n][1]), o = { off: it[2], hitOff: true, sz: 15 };
        if (n === 3) { o.seal = true; o.pri = !it[2]; o.rot = -0.03; o.sz = 16; }          // 发布：朱红印
        else if (n === 2) { o.rgb = '184,50,42'; o.strong = false; }                     // 清空：淡朱墨条
        else if (n === 4) { o.strong = true; o.rgb = '122,74,50'; }                       // 洞府码：浓墨条
        else o.sz = 14;
        st.btn(bx, py + 10 + r * 46, bw2, 44, it[0], it[1], o);
      });
    }
    /* ---- 塔 / 陷阱详情卡（弹出）---- */
    if (LU.modal) {
      var m = LU.modal, mw2 = Math.min(cw - 24, 360), mh = 214, mx2 = (cw - mw2) / 2, my2 = (LU.modal.k === 'tower' && d.towers[LU.modal.i] ? g.oy + (d.towers[LU.modal.i].c[1] + 0.5) * g.cell : g.oy) < ch / 2 ? ch - mh - 14 : 62; c.fillStyle = 'rgba(58,50,38,0.16)'; c.fillRect(0, 0, cw, ch);
      XY.pv2.note(c,mx2,my2,mw2,mh);
      var t = m.k === 'tower' ? d.towers[m.i] : d.traps[m.i];
      if (!t) { LU.modal = null; }
      else if (m.k === 'tower') {
        var evo2 = s.evo[t.t] || 0, sa = VD.stat(t.t, t.tier, evo2), aw2 = 96, ah2 = 128;
        VU.washE(c, mx2 + 16 + aw2 / 2, my2 + 18 + ah2 * 0.7, aw2 * 0.8, ah2 * 0.5, '111,74,168', 0.25); VU.drawImg(c, 'evo/' + t.t + '_' + evo2 + '.webp', mx2 + 16, my2 + 14, aw2, ah2);
        var tx2 = mx2 + 16 + aw2 + 10, tw2 = mw2 - 16 - aw2 - 10 - 16; txt(c, VD.TOWERS[t.t].name, tx2, my2 + 30, 18, INK, 'left', true, tw2); VU.seal(c, tx2, my2 + 42, 52, 22, ROM[t.tier] + ' 阶', t.tier === 3 ? '#b8322a' : '#a8700a', 12);
        txt(c, '生命 ' + Math.round(sa.hp), tx2, my2 + 84, 12.5, SOFT, 'left', false, tw2); txt(c, '伤害 ' + Math.round(sa.dmg), tx2, my2 + 102, 12.5, SOFT, 'left', false, tw2); txt(c, '射程 ' + sa.rng + '（图上紫圈）', tx2, my2 + 120, 12.5, SOFT, 'left', false, tw2);
        var add = t.tier < 3 ? VD.costTier(t.t, t.tier + 1) - VD.costTier(t.t, t.tier) : 0, b3 = (mw2 - 32 - 16) / 3, by3 = my2 + mh - 58;
        st.btn(mx2 + 18, by3 - 8, 84, 58, t.tier >= 3 ? '满阶' : '升阶', 'lUp', { seal: true, pri: t.tier < 3, off: t.tier >= 3, sub: t.tier >= 3 ? undefined : '+' + add, rot: -0.03, sz: 20 }); st.btn(mx2 + 116, by3 + 2, 92, 44, '拆除', 'lDel', { sz: 15 }); st.btn(mx2 + mw2 - 16 - 80, by3, 80, 44, '关闭', 'lModalClose', { sz: 15 });
      } else {
        trapShape(c, t.t, mx2 + 52, my2 + 62, 34); txt(c, VD.TRAPS[t.t].name, mx2 + 104, my2 + 34, 18, INK, 'left', true, mw2 - 120); VU.wrap(c, TRAP_DESC[t.t] || '', mx2 + 104, my2 + 62, mw2 - 120, 17, 12.5, SOFT, false, 4);
        var b4 = (mw2 - 32 - 8) / 2, by4 = my2 + mh - 58; st.btn(mx2 + 16, by4, Math.round(b4 * 1.2), 44, '拆除（退回库存）', 'lDel', { sz: 13 }); st.btn(mx2 + mw2 - 16 - 76, by4 + 2, 76, 44, '关闭', 'lModalClose', { sz: 15 });
      }
    }
    st.end();
  };
  LU.act = function (h, p, a) {
    var d = LU.draft;
    switch (h.act) {
      case 'lBack': if (LU.more) LU.more = false; else if (LU.modal) LU.modal = null; else { VU.page = 'home'; } return true;
      case 'lTab': LU.tab = h.id === 'trap' ? 'trap' : 'place'; LU.sc = 0; if (LU.sel && LU.sel.k !== (LU.tab === 'trap' ? 'trap' : 'tower')) LU.sel = null; return true;
      case 'lMore': LU.more = !LU.more; return true; case 'lMoreClose': LU.more = false; return true;
      case 'lPick': LU.sel = { k: h.kind, id: h.id }; return true;
      case 'lLocked': say('在「小妖进化」页用妖金解锁这种小妖', true); return true;
      case 'lRec': LU.recommend(); return true; case 'lUndo': LU.more = false; LU.undo(); return true; case 'lRedo': LU.more = false; LU.redoF(); return true;
      case 'lClear': LU.more = false; snap(); d.towers = []; d.traps = []; L.finalize(d); say('已清空塔和陷阱（保存后才会退钱）'); return true;
      case 'lSave': LU.save(); return true; case 'lVerify': LU.verify(); return true; case 'lPublish': LU.more = false; LU.publish(); return true;
      case 'lCode': LU.more = false; LU.codeDialog(L.saved() ? L.code(L.saved()) : (d.towers.length ? L.code(d) : ''), L.saved() ? '这是已保存洞府的洞府码；粘贴别人的码再点「导入」' : '粘贴别人的洞府码，点「导入」'); return true;
      case 'lUp': LU.upgrade(LU.modal.i); return true; case 'lDel': LU.remove(LU.modal); return true; case 'lModalClose': LU.modal = null; return true;
      case 'lBack2': window.__xy.toMenu(); VU.open({ page: 'lair' }); LU.enter(); return true;
      case 'lSpeed': var G = window.__xy.G, sp = [1, 2, 4, 8]; G.speed = sp[(sp.indexOf(G.speed) + 1) % sp.length]; return true;
    }
    return false;
  };
  /* 地图上的点击 / 拖动：自己监听（要区分「点」和「拖」）；按钮仍走 ui.hits */
  (function () {
    var cv = document.getElementById('game') || document.querySelector('canvas'), dn = null;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }       // CSS 像素（和 geom 同一套）
    function inGrid(p) { var g = LU.geo; return g && p.x >= g.grid.x && p.x <= g.grid.x + g.grid.w && p.y >= g.grid.y && p.y <= g.grid.y + g.grid.h; }
    function blocked(p) { var z = app().zoom || 1; return ui.hits.some(function (h) { return p.x / z >= h.x && p.x / z <= h.x + h.w && p.y / z >= h.y && p.y / z <= h.y + h.h; }); }
    function active() { var a = app(); return a.screen === 'villain' && VU.page === 'lair' && LU.draft && !LU.modal && !LU.more && !document.getElementById('lairCode'); }
    function down(p) { if (!active() || !inGrid(p) || blocked(p)) { dn = null; return; } dn = { p: p, px: LU.px, py: LU.py, moved: false }; }
    function move(p) { if (!dn) return; var dx = p.x - dn.p.x, dy = p.y - dn.p.y; if (Math.hypot(dx, dy) > 8 && LU.geo.pan) { dn.moved = true; LU.px = dn.px + dx; LU.py = dn.py + dy; } }
    function up(p) { if (!dn) return; var d0 = dn; dn = null; if (d0.moved || !active()) return; var c = cellOf(LU.geo, p.x, p.y); if (c) LU.place(c); }
    cv.addEventListener('mousedown', function (e) { if (e.button === 0) down(pos(e)); });
    window.addEventListener('mousemove', function (e) { if (dn) move(pos(e)); });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) up(pos(e)); });
    cv.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; down(pos(t)); }, { passive: true });
    cv.addEventListener('touchmove', function (e) { var t = e.changedTouches[0]; move(pos(t)); }, { passive: true });
    cv.addEventListener('touchend', function (e) { var t = e.changedTouches[0]; up(pos(t)); }, { passive: true });
  })();
  /* 选择卡条：按住拖动 / 滚轮滑动（点一下 = 选中，按下就选） */
  (function () {
    var cv = document.getElementById('game') || document.querySelector('canvas'), dn = null;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function inStrip(p) { var b = LU.stripBox, a = app(), z = a.zoom || 1; return b && a.screen === 'villain' && VU.page === 'lair' && !LU.modal && !LU.more && p.x / z >= b.x && p.x / z <= b.x + b.w && p.y / z >= b.y - 8 && p.y / z <= b.y + b.h + 4; }
    function down(p) { dn = inStrip(p) ? { p: p, sc: LU.sc } : null; }
    function move(p) { if (!dn) return; var z = app().zoom || 1, b = LU.stripBox, d = b.vert ? (p.y - dn.p.y) / z : (p.x - dn.p.x) / z; if (Math.abs(d) > 4) LU.sc = Math.max(0, Math.min(LU.geo ? LU.geo.maxSc : 0, dn.sc - d)); }
    function up() { dn = null; }
    cv.addEventListener('mousedown', function (e) { if (e.button === 0) down(pos(e)); });
    window.addEventListener('mousemove', function (e) { if (dn) move(pos(e)); });
    window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', function (e) { down(pos(e.changedTouches[0])); }, { passive: true });
    cv.addEventListener('touchmove', function (e) { if (dn) move(pos(e.changedTouches[0])); }, { passive: true });
    cv.addEventListener('touchend', up, { passive: true });
    cv.addEventListener('wheel', function (e) { if (!inStrip(pos(e))) return; e.preventDefault(); var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; LU.sc = Math.max(0, Math.min(LU.geo ? LU.geo.maxSc : 0, LU.sc + d)); }, { passive: false });
  })();
  var oldAct = VU.act; VU.act = function (h, p, a) { if (oldAct(h, p, a)) return true; return LU.act(h, p, a); };
  var oldBack = VU.key; VU.key = function (k, a) { if (a.screen === 'villain' && VU.page === 'lair' && k === 'Escape') { if (LU.back()) return true; VU.page = 'home'; return true; } return oldBack(k, a); };

  /* ---------- 验关战场 ---------- */
  LU.drawWorld = function (c, G, rt) {
    var lr = G.lair, d = lr.doc, i, cell = L.CELL;
    c.save();
    d.path.forEach(function (p, n) { var q = L.cellXY(p); c.fillStyle = 'rgba(214,196,150,0.55)'; c.fillRect(q.x - cell / 2, q.y - cell / 2, cell, cell); });
    d.rocks.forEach(function (p) { var q = L.cellXY(p); c.fillStyle = '#6a6458'; c.strokeStyle = '#2d2a24'; c.lineWidth = 3; c.beginPath(); c.moveTo(q.x - 60, q.y + 50); c.lineTo(q.x - 36, q.y - 40); c.lineTo(q.x + 18, q.y - 56); c.lineTo(q.x + 62, q.y + 34); c.closePath(); c.fill(); c.stroke(); });
    lr.traps.forEach(function (t) { c.globalAlpha = t.hit > 0 ? 1 : 0.8; trapShape(c, t.t, t.x, t.y, 36); if (t.t === 'huolun' && t.hit > 0) { c.strokeStyle = 'rgba(245,154,35,0.7)'; c.lineWidth = 4; c.beginPath(); c.arc(t.x, t.y, 70 + Math.sin(rt * 14) * 4, 0, PI2); c.stroke(); } c.globalAlpha = 1; });
    lr.shots.forEach(function (p) {
      var ang = Math.atan2(p.ty - p.y, p.tx - p.x);
      if (p.kind === 'arrow') { c.strokeStyle = '#3a3226'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x - Math.cos(ang) * 16, p.y - Math.sin(ang) * 16); c.lineTo(p.x, p.y); c.stroke(); }
      else if (p.kind === 'rock') { c.fillStyle = '#6a6458'; c.strokeStyle = '#2d2a24'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y - Math.sin((1 - Math.min(1, Math.hypot(p.tx - p.x, p.ty - p.y) / 300)) * Math.PI) * 18, 11, 0, PI2); c.fill(); c.stroke(); }
      else if (p.kind === 'fire') { c.fillStyle = 'rgba(100,200,190,0.85)'; c.beginPath(); c.arc(p.x, p.y, 9 + Math.sin(rt * 20) * 2, 0, PI2); c.fill(); }
      else { c.fillStyle = '#e0a415'; c.strokeStyle = '#7a5a10'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 10, 0, PI2); c.fill(); c.stroke(); }
    });
    var a0 = L.cellXY(d.path[0]), a1 = L.cellXY(d.path[d.path.length - 1]); R.otxt(c, '入口', a0.x, a0.y - 70, 22, '#a8321f', 'center', true); R.otxt(c, '洞府', a1.x, a1.y - 90, 22, '#4a2f8a', 'center', true);
    c.restore();
  };
  LU.drawTower = function (c, G, e, rt) {
    var lt = e.lt, x = e.x, y = e.y, tier = lt.tier, f = Math.max(0, e.hp / e.maxHp), flash = lt.hitT > 0;
    c.save(); tierBase(c, x, y, 52, tier);
    c.translate(x, y); if (flash) { c.translate((Math.random() - 0.5) * 3, 0); }
    VU.drawImg(c, 'evo/' + lt.t + '_' + lt.evo + '.webp', -46, -92, 92, 124);
    c.restore();
    R.bar(c, x - 36, y + 46, 72, 7, f, f < 0.3 ? '#d62828' : '#8a63c8', 'rgba(255,255,255,0.88)');
    R.otxt(c, VD.TOWERS[lt.t].name + ROM[tier], x, y - 100, 13, '#4a2f8a', 'center', true);
    if (lt.t !== 'small' && lt.t !== 'shield' && lt.t !== 'elite' && lt.t !== 'bear') { c.strokeStyle = 'rgba(111,74,168,0.10)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, lt.st.rng, 0, PI2); c.stroke(); }
  };

  /* ---------- 验关 HUD ---------- */
  LU.hud = function (c, G, a) {
    var st = VU.begin(c, a), cw = st.cw, ch = st.ch, lr = G.lair, d = lr.doc, narrow = cw < 520; ui.hud = [];
    var lw = Math.min(narrow ? 220 : 280, cw * 0.58 - 8), n = G.heroes.length - 1;
    XY.inkHud.wash(c,8,8,lw,72);
    var towersLeft = G.enemies.filter(function (e) { return e.lt && !e.dead; }).length;
    txt(c, '验关 · ' + (d.name || ''), 18, 25, 13.5, INK, 'left', true, lw - 20);
    txt(c, XY.fmtTime(Math.floor(G.t)) + '  塔 ' + towersLeft + '/' + lr.rep.tcount + '  ' + (G.speed > 1 ? G.speed + '×' : ''), 18, 44, 12.5, SOFT, 'left', true, lw - 20);
    var bw = (lw - 20 - (n) * 3) / (n + 1), i; for (i = 0; i < G.heroes.length; i++) { var h = G.heroes[i], f = Math.max(0, h.hp / h.maxHp); XY.inkHud.line(c,18+i*(bw+3),58,bw,h.down?0:f,i===0?'#946213':'#66533b'); }
    var pr=G.rt&&G.rt.total?Math.min(1,G.tang.s/G.rt.total):0;XY.inkHud.line(c,18,71,lw-20,pr,'#946213');
    st.btn(cw - 8 - 76, 8, 76, 44, '菜单', 'esc', { sz: 14 }); st.btn(cw - 8 - 76 - 4 - 64, 8, 64, 44, G.speed + '×', 'lSpeed', { sz: 14, strong: G.speed > 1 });
    if (G.note && G.note.short) { var nw = Math.min(cw - 24, 340); VU.drawTag(c, (cw - nw) / 2, ch - 44, nw, 30, '', GOLD, { fill: 'rgba(255,248,226,0.96)', seed: 21, cutK: 0.28 }); txt(c, G.note.short, cw / 2, ch - 28, 13, INK, 'center', true, nw - 16); }
    st.end();
  };

  /* ---------- 战报页 ---------- */
  LU.end = function (c, G, a, win) {
    var z = a.zoom || 1, u = 1 / z, cw = a.lw * z, ch = a.lh * z, r = G.runReport || {}, rep = r.rep || (G.lair && G.lair.rep) || { by: {}, heat: {}, deaths: [] }, d = G.lair.doc;
    c.save(); c.scale(u, u); R.dim(c, a, 0.72);
    var land = cw >= 600 && cw > ch * 1.1, w = Math.min(cw - 16, land ? 1100 : 380), h = Math.min(ch - 24, land ? 610 : 700), x = (cw - w) / 2, y = (ch - h) / 2;
    XY.pv2.paper(c,cw,ch);
    txt(c, win ? (r.verify ? '验关通过！洞府可以发布了' : '闯过去了') : '洞府拦住了他们', x + w / 2, y + 28, cw>=1000?28:21, win ? '#2f7d3b' : '#a8321f', 'center', true, w - 24);
    var sub = win ? '星级 ' + '★★★'.slice(0, r.stars || 0) + '☆☆☆'.slice(0, 3 - (r.stars || 0)) + ' · 用时 ' + XY.fmtTime(r.sec || 0) + ' · 存活 ' + (r.alive || 0) + ' 人' : '用时 ' + XY.fmtTime(Math.round(G.t)) + ' · 洞府原样保留，不扣不拆';
    txt(c, sub, x + w / 2, y + 56, cw>=1000?15:13, SOFT, 'center', false, w - 24);
    txt(c, '灵石 +' + (r.lingshi || 0) + (r.first ? '（首通该造价档）' : ''), x + w / 2, y + 79, cw>=1000?16:14, '#a8700a', 'center', true, w - 24);
    // 热区图：淡墨路 + 红晕，不再是 Excel 方格
    var cell = land ? Math.min(w*.56/L.GW,(h-200)/L.GH) : Math.min(26,(w-40)/L.GW), mx = land ? x + 16 : x + (w - cell * L.GW) / 2, my = y + 92, i, j, max = 1, k, gap = Math.max(1, cell * 0.12);
    for (k in rep.heat) max = Math.max(max, rep.heat[k]);
    c.save();VU.washE(c,mx+cell*L.GW*.5,my+cell*L.GH*.5,cell*L.GW*.57,cell*L.GH*.58,'201,174,118',.16);
    for (i = 0; i < L.GW; i++) for (j = 0; j < L.GH; j++) {
      var heat = (rep.heat[i + ',' + j] || 0) / max, onp = onPath(d, [i, j]), cx = mx + i * cell + cell / 2, cy = my + j * cell + cell / 2, rr = cell * 0.42 - gap / 2;
      if (onp) { c.fillStyle = 'rgba(214,196,150,0.55)'; c.beginPath(); c.arc(cx, cy, rr * 0.95, 0, Math.PI * 2); c.fill(); }
      if (heat > 0.02) { VU.washE(c, cx, cy, rr * 1.4, rr * 1.2, '214,40,40', 0.18 + 0.55 * heat); }
    }
    d.towers.forEach(function (t) { var cx = mx + (t.c[0] + 0.5) * cell, cy = my + (t.c[1] + 0.5) * cell; c.fillStyle = '#6f4aa8'; c.beginPath(); c.arc(cx, cy, Math.max(3, cell * 0.22), 0, Math.PI * 2); c.fill(); });
    c.restore();
    txt(c, '红 = 英雄掉血的地方；紫点 = 塔', mx, my + cell * L.GH + 12, cw>=1000?13:11, SOFT, 'left', false, land ? cell*L.GW : w - 30);
    var tx = land ? x + 16 + cell * L.GW + 18 : x + 20, ty = land ? my + 10 : my + cell * L.GH + 38, tw = land ? w - (tx - x) - 16 : w - 40;
    var tot = 0; for (k in rep.by) tot += rep.by[k]; var order = Object.keys(rep.by).sort(function (p, q) { return rep.by[q] - rep.by[p]; });
    txt(c, '谁打得最疼', tx, ty, cw>=1000?20:14, INK, 'left', true, tw); ty += cw>=1000?30:20;
    if (!order.length) { txt(c, '没有塔打到英雄', tx, ty, cw>=1000?16:12.5, SOFT, 'left', false, tw); ty += 18; }
    order.slice(0, 4).forEach(function (id) { txt(c, VD.TOWERS[id].name + ' ' + Math.round(100 * rep.by[id] / Math.max(1, tot)) + '%（' + Math.round(rep.by[id]) + ' 伤害）', tx, ty, cw>=1000?16:12.5, INK, 'left', false, tw); ty += cw>=1000?26:17; });
    txt(c, '持续伤害 ' + Math.round(rep.dot || 0) + ' · 眩晕 ' + (rep.stuns || 0) + ' 次 · 减速 ' + (rep.slows || 0) + ' 次 · 倒下 ' + (rep.deaths ? rep.deaths.length : 0) + ' 人', tx, ty + 4, cw>=1000?14:12, SOFT, 'left', false, tw); ty += cw>=1000?34:24;
    var tip = !order.length ? '塔太少或太远：往路边多摆几座' : win ? (r.stars < 3 ? '想拿 3 星：让英雄少活下来的路段多摆控制塔' : '全员存活：洞府太弱了？试试多放点塔') : (rep.deaths && rep.deaths.length ? '英雄多数在红色区域倒下，在那一段加塔或陷阱' : '塔不够：再升几座阶');
    VU.wrap(c, '建议：' + tip, tx, ty, tw, cw>=1000?23:17, cw>=1000?15:12.5, '#4a2f8a', true, 3);
    var by = y + h - 62, sx = x + 24, bx2 = x + w - 24 - 124;
    VU.drawSeal(c, sx, by - 6, 140, 58, '回洞府设计', { rot: -0.03 }); VU.drawBrush(c, bx2, by + 2, 124, 46, '再验一次', { sz: 15 });
    ui.hits.push({ x: sx * u, y: (by - 6) * u, w: 140 * u, h: 58 * u, act: 'lBack2' }); ui.hits.push({ x: bx2 * u, y: (by + 2) * u, w: 124 * u, h: 46 * u, act: 'restart' });
    c.restore();
  };
})();

