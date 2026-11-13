/* ============================================================
 * shop2.js —— v0.8.3 局内「货郎」（花金币）
 * 只在休息点的「备战」和「收尾」开放（夜潮进行中不开）；货架每进一次休息点随机 4 件，每件每个休息点只能买 1 次。
 * 打开 = G.mode 'vendor'（游戏暂停，和三选一同一类的模态面板）。入口：一枚浮在底部 UI 上方的「货郎」按钮，或 N 键。
 * 数字集中在 C.VENDOR，价格是起手值（要看金币收入再调）。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  var P = C.VENDOR = { price: { bandage: 40, camp: 60, treat: 30, reroll: 40, ward: 50 }, heal: 0.4, camp: 400, n: 4 };
  var DEFS = {
    bandage: { name: '包扎', d: '最缺血的一位英雄回 40% 血' },
    camp: { name: '修缮营地', d: '营地回 400 血' },
    treat: { name: '犒赏令', d: '给所有天兵各犒赏一次（寿命 +50%，20 秒受伤 −20%）' },
    reroll: { name: '重抽券', d: '下次宝箱三选一，多一次免费重抽' },
    ward: { name: '水珠补给', d: '立刻让所有英雄的避水珠 / 定海神珠就绪' }
  };
  var V = XY.vendor = { DEFS: DEFS };

  function heroes(G) { return G.heroes.filter(function (h) { return h.id !== 'tang' && !h.down; }); }
  function haveWardItem(G) { var F = XY.fabao; return !!(F && G.fb && (F.held(G, 'bishui') || F.held(G, 'dinghai'))); }
  function weakest(G) { var best = null; heroes(G).forEach(function (h) { if (h.hp < h.maxHp - 0.5 && (!best || h.hp / h.maxHp < best.hp / best.maxHp)) best = h; }); return best; }

  // 现在能不能开货郎：返回 null = 能；否则是原因
  V.closedReason = function (G) {
    if (G.tut) return '教程里没有货郎';
    if (G.ending) return '这局已经结束了';
    var seg = XY.waveSeg && XY.waveSeg(G);
    if (!seg) return '货郎只在休息点出现';
    if (seg.ph === 'tide') return '夜潮来了，货郎收摊躲起来了';
    return null;
  };
  V.available = function (G) { return G.mode === 'play' && !V.closedReason(G); };
  // 货架：每进一次休息点（G.wave.rest 换了一份）重新随机
  V.stock = function (G) {
    var v = G.vendor || (G.vendor = { ref: null, items: [], opened: 0, bought: 0 }), ref = G.wave && G.wave.rest || 'none';
    if (v.ref !== ref) {
      v.ref = ref; var pool = Object.keys(DEFS).filter(function (id) { return (id !== 'ward' || haveWardItem(G)) && (id !== 'reroll' || !!G.fb); });
      var out = []; while (out.length < P.n && pool.length) out.push({ id: pool.splice(Math.floor(Math.random() * pool.length), 1)[0], sold: false });
      v.items = out;
    }
    return v.items;
  };
  V.why = function (G, it) {                                  // 这件现在不能买的原因（null = 能买）
    if (it.sold) return '这个休息点买过了';
    if (G.coins < P.price[it.id]) return '金币不够：要 ' + P.price[it.id];
    if (it.id === 'bandage' && !weakest(G)) return '大家都满血';
    if (it.id === 'camp' && G.camp.hp >= G.camp.maxHp - 0.5) return '营地是满的';
    if (it.id === 'treat' && !G.towers.some(function (t) { return !(t.treatCd > 0); })) return G.towers.length ? '天兵都在犒赏冷却里' : '场上没有天兵';
    if (it.id === 'ward') {
      var any = heroes(G).some(function (h) { return h.ward && !h.ward.ready; }) || (G.camp.ward && !G.camp.ward.ready);
      if (!any) return '水珠都是好的';
    }
    return null;
  };
  V.open = function (G) {
    if (G.mode !== 'play') return false;
    var why = V.closedReason(G); if (why) { XY.toast(G, why); return false; }
    V.stock(G); G.vendor.opened++; G.mode = 'vendor'; return true;
  };
  V.close = function (G) { if (G.mode === 'vendor') G.mode = 'play'; };
  V.buy = function (G, i) {
    if (G.mode !== 'vendor') return { ok: false, reason: '货郎没开' };
    var it = V.stock(G)[i]; if (!it) return { ok: false, reason: '没有这个货位' };
    var why = V.why(G, it); if (why) { G.vendorMsg = { text: why, bad: true, t: 2.2 }; return { ok: false, reason: why }; }
    G.coins -= P.price[it.id]; it.sold = true; G.vendor.bought++;
    var K = XY.core, msg = DEFS[it.id].name + '：已买';
    if (it.id === 'bandage') { var h = weakest(G); K.healHero(G, h, h.maxHp * P.heal, true); msg = '包扎 → ' + h.def.name + ' 回血'; }
    else if (it.id === 'camp') { G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + P.camp); msg = '修缮营地 +' + P.camp; }
    else if (it.id === 'treat') { var n = XY.treatAll(G); msg = '犒赏令：' + n + ' 位天兵得到犒赏'; }
    else if (it.id === 'reroll') { G.fb.rrFree = (G.fb.rrFree || 0) + 1; msg = '重抽券：下次三选一多一次免费重抽'; }
    else if (it.id === 'ward') {
      heroes(G).forEach(function (hh) { if (hh.ward) { hh.ward.ready = true; hh.ward.cd = 0; } });
      if (G.camp.ward) { G.camp.ward.ready = true; G.camp.ward.cd = 0; }
      msg = '水珠补给：全部就绪';
    }
    G.vendorMsg = { text: msg, bad: false, t: 2.2 }; G.stats.vendorBuys = (G.stats.vendorBuys || 0) + 1;
    return { ok: true, reason: msg };
  };

  /* ---------- 画面 ---------- */
  var T = function () { return XY.R; };
  // 底部 UI 上方的入口按钮（休息点的备战 / 收尾才出现）
  V.drawBtn = function (c, G, app, topY) {
    if (G.mode !== 'play' || V.closedReason(G)) return;
    var t = T(), mob = app.zoom < 0.75, w = mob ? 360 : 190, h = mob ? 82 : 38, x = app.lw / 2 - w / 2, y = topY - h - (mob ? 14 : 10), left = V.stock(G).filter(function (it) { return !it.sold; }).length;
    var p = 0.5 + 0.5 * Math.sin(app.rt * 4);
    if(XY.inkHud)XY.inkHud.wash(c,x,y,w,h);else{t.rrect(c,x,y,w,h,8);c.fillStyle='#f8efd9';c.fill();}
    t.txt(c, '货郎来了 · ' + left + ' 件（N）', x + w / 2, y + h / 2 + 1, mob ? 30 : 16, '#7a5a10', 'center', true);
    XY.ui.hits.push({ x: x, y: y, w: w, h: h, act: 'vendorOpen' });
    if (XY.ui.hud) XY.ui.hud.push({ id: 'vendorBtn', x: x, y: y, w: w, h: h });
  };
  V.draw = function (c, G, app) {
    if(XY.ui2.on&&XY.inkHud)return XY.inkHud.vendor(c,G,app);
    var t = T(), ui = XY.ui, W = app.lw, H = app.lh, items = V.stock(G), pw = 560, mob = app.zoom < 0.75, rowH = mob ? 84 : 70, clH = mob ? 62 : 36, ph = 112 + items.length * (rowH + 8) + clH + 20;
    ui.hits.length = 0; c.fillStyle = 'rgba(251,246,232,0.62)'; c.fillRect(0, 0, W, H);
    var s = app.zoom < 0.75 ? Math.max(1, Math.min(2.4, (W - 16) / pw, (H - 16) / ph)) : 1;
    XY.ov.scaled(c, app, s, function () {
      var x = W / 2 - pw / 2, y = H / 2 - ph / 2;
      t.panel(c, x, y, pw, ph, 18, 'rgba(255,253,246,0.98)', '#c9a24a');
      t.txt(c, '货郎的担子', x + pw / 2, y + 30, 26, t.T.ink, 'center', true);
      t.txt(c, '金币 ' + Math.floor(G.coins) + ' · 夜潮前后才摆摊，每件每个休息点只能买 1 次', x + pw / 2, y + 58, 13, t.T.inkSoft, 'center', false);
      items.forEach(function (it, i) {
        var d = DEFS[it.id], by = y + 80 + i * (rowH + 8), why = V.why(G, it), ok = !why, bx = x + 16, bw = pw - 32;
        t.rrect(c, bx, by, bw, rowH, 12); c.fillStyle = it.sold ? '#ebe8df' : '#fffaf0'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = ok ? '#c9a24a' : '#cfc8b4'; c.stroke();
        if (XY.ICONINK) XY.ICONINK.draw(c, d.name, bx + 34, by + rowH / 2, 48, it.sold ? 0.4 : 1); t.txt(c, d.name, bx + 66, by + 22, 20, it.sold ? '#9a968b' : t.T.ink, 'left', true);
        t.txt(c, d.d, bx + 66, by + 48, 13, t.T.inkSoft, 'left', false);
        var qw = 150, qx = bx + bw - qw - 10, qy = by + 10, qh = rowH - 20;
        t.rrect(c, qx, qy, qw, qh, 10); c.fillStyle = it.sold ? '#e4e0d4' : (ok ? '#ffe6a8' : '#ece8dd'); c.fill(); c.lineWidth = 1.6; c.strokeStyle = ok ? '#b8863b' : '#cfc8b4'; c.stroke();
        t.txt(c, it.sold ? '已买' : P.price[it.id] + ' 金币', qx + qw / 2, qy + qh / 2 - (why && !it.sold ? 7 : 0), 17, ok ? '#7a5a10' : '#9a968b', 'center', true);
        if (why && !it.sold) t.txt(c, why, qx + qw / 2, qy + qh / 2 + 12, 11, '#a8321f', 'center', false);
        ui.hits.push({ x: qx, y: qy, w: qw, h: qh, act: 'vendorBuy', i: i });
      });
      var cy = y + ph - clH - 10, cw = 220, cx = x + pw / 2 - cw / 2;
      t.rrect(c, cx, cy, cw, clH, 10); c.fillStyle = '#fffdf6'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#b9b19b'; c.stroke();
      t.txt(c, '收摊，继续（N / Esc）', cx + cw / 2, cy + clH / 2 + 1, 15, t.T.ink, 'center', true);
      ui.hits.push({ x: cx, y: cy, w: cw, h: clH, act: 'vendorClose' });
      var m = G.vendorMsg; if (m && m.t > 0) t.txt(c, m.text, x + pw / 2, y + ph + 22, 15, m.bad ? '#a8321f' : '#2f7d3b', 'center', true);
    });
    if (G.vendorMsg && G.vendorMsg.t > 0) G.vendorMsg.t -= 1 / 60;
  };
})();
