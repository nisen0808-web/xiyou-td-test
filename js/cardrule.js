/* ============================================================
 * cardrule.js —— v0.6 批次 3：法宝新规则
 *   · 每一局只能走「一条套系线」：第一件法宝（卡组里的第一张，或第一件拿到的）定下套系，之后只会出这一套的法宝
 *   · 最多同时带 3 件（卡组 + 局内拿到的合计；重复拿同一件算叠加，不占栏位）
 *   · 拿到法宝 = 「三选一」：暂停画面，从 3 张里挑 1 张（点卡 / 按 1·2·3；也可以放弃换金币）
 *   · 同时只能祭出 1 件，换件有冷却（原规则不变）；通关后带着走进下一关（取经之旅继承）
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, K = XY.cards;
  C.CARD_HELD_MAX = 3; C.CARD_SKIP_COINS = 40;

  K.setLine = function (G) { var ids = K.carried(G); return ids.length ? XY.CARD_BY[ids[0]].set : null; };    // 本局的套系线
  K.heldCount = function (G) { return K.carried(G).length; };
  K.allowed = function (G, id) {
    var c = XY.CARD_BY[id]; if (!c) return false;
    var held = K.carried(G); if (held.indexOf(id) >= 0) return true;       // 已经带着：叠加一份
    if (held.length >= C.CARD_HELD_MAX) return false;                     // 栏位满了
    var line = K.setLine(G); return !line || c.set === line;              // 只能同一套
  };
  // 开局：卡组只留前 3 张、且只留第一张的那一套
  var oldInit = K.initRun;
  K.initRun = function (G) {
    oldInit(G);
    var out = [], line = null; G.deckIds.forEach(function (id) { var c = XY.CARD_BY[id]; if (!line) line = c.set; if (c.set === line && out.length < C.CARD_HELD_MAX) out.push(id); });
    if (out.length !== G.deckIds.length) { G.deckIds = out; G.activeCard = out[0] || null; K.recalc(G); }
  };
  // 取经之旅带卡进下一关：不锁卡组，但要保证合法——只留存在的、和当前卡组同一套的、合计不超过 3 件的；其余丢掉（返回丢掉的 id 列表）
  K.sanitizeCarry = function (G) {
    var rc = G.runCards || {}, keep = {}, dropped = [], held = G.deckIds.slice(), line = held.length ? XY.CARD_BY[held[0]].set : null, ids = Object.keys(rc);
    if (G.activeCard && rc[G.activeCard]) { ids.splice(ids.indexOf(G.activeCard), 1); ids.unshift(G.activeCard); }       // 祭出的那件优先留
    ids.forEach(function (id) {
      var c = XY.CARD_BY[id], n = Math.floor(+rc[id]);
      if (!c || !(n >= 1)) { dropped.push(id); return; }
      if (held.indexOf(id) >= 0) { keep[id] = n; return; }                                    // 卡组里已有：多出来的份数算叠加（计算时总共最多 3 份，见 K.recalc）
      if (held.length >= C.CARD_HELD_MAX || (line && c.set !== line)) { dropped.push(id); return; }
      if (!line) line = c.set; held.push(id); keep[id] = n;
    });
    G.runCards = keep;
    if (G.activeCard && K.carried(G).indexOf(G.activeCard) < 0) G.activeCard = null;
    if (!G.activeCard) G.activeCard = K.carried(G)[0] || null;
    return dropped;
  };
  // 卡组编辑：同一套、最多 3 张
  var oldToggle = XY.save.toggleDeck;
  XY.save.toggleDeck = function (id) {
    var d = XY.save.data.deck;
    if (d.indexOf(id) < 0 && XY.CARD_BY[id]) {
      if (d.length >= C.CARD_HELD_MAX) return { ok: false, reason: '每局最多带 ' + C.CARD_HELD_MAX + ' 件法宝，先取下一张' };
      if (d.length && XY.CARD_BY[d[0]] && XY.CARD_BY[d[0]].set !== XY.CARD_BY[id].set) return { ok: false, reason: '每局只能带同一套的法宝（现在是「' + XY.CARD_SETS[XY.CARD_BY[d[0]].set].name + '」套），先取下再换套' };
    }
    return oldToggle(id);
  };

  /* ---------- 三选一 ---------- */
  function rollCands(G, id0, table) {
    var out = [], tries = 0, id;
    if (id0 && K.allowed(G, id0)) out.push(id0);
    while (out.length < 3 && tries++ < 60) {
      id = K.pick(G, table || 'normal');
      if (K.allowed(G, id) && out.indexOf(id) < 0) out.push(id);
    }
    if (out.length < 3 && K.setLine(G)) {               // 稀有度池里凑不够：从同套里补
      XY.CARDS.forEach(function (c) { if (out.length < 3 && out.indexOf(c.id) < 0 && K.allowed(G, c.id)) out.push(c.id); });
    }
    return out;
  }
  K.offer = function (G, id0, table, opts) {
    var cands = rollCands(G, id0, table);
    if (!cands.length) { G.coins += C.CARD_SKIP_COINS; XY.toast(G, '法宝栏已满、也不是本局这一套：化作 ' + C.CARD_SKIP_COINS + ' 金币'); return null; }
    if (window.XY_AUTO_CARDS && !(opts && opts.manual)) { var id1 = cands[0], op1 = {}; for (var xx in (opts || {})) op1[xx] = opts[xx]; op1.raw = true; K.giveRaw(G, id1, op1); return 'auto'; }   // 测试开关：自动选第一张（只用于旧测试里“顺手拿卡”的场景）
    if (G.cardOffer) { G.cardOfferQ = G.cardOfferQ || []; G.cardOfferQ.push({ ids: cands, opts: opts }); return 'queued'; }
    G.cardOffer = { ids: cands, opts: opts, t: 0 }; G.mode = 'cards'; G.stats.offers = (G.stats.offers || 0) + 1;
    return 'open';
  };
  K.choose = function (G, k) {
    var o = G.cardOffer; if (!o) return false;
    if (k === -1) { G.coins += C.CARD_SKIP_COINS; XY.toast(G, '放弃了法宝，换成 ' + C.CARD_SKIP_COINS + ' 金币'); }
    else if (o.ids[k]) K.give(G, o.ids[k], o.opts);
    else return false;
    G.cardOffer = null; K.nextOffer(G);
    return true;
  };
  // 排队的三选一：入队时候选是按当时持有状态生成的，轮到它时再按“现在”的持有状态过滤一遍（前一份奖励可能已经定了套系 / 占满了栏位）
  K.nextOffer = function (G) {
    while (G.cardOfferQ && G.cardOfferQ.length) {
      var n = G.cardOfferQ.shift(), ids = n.ids.filter(function (id) { return K.allowed(G, id); });
      if (!ids.length) { G.coins += C.CARD_SKIP_COINS; XY.toast(G, '法宝栏已满、也不是本局这一套：化作 ' + C.CARD_SKIP_COINS + ' 金币'); continue; }
      G.cardOffer = { ids: ids, opts: n.opts, t: 0 }; return;
    }
    if (G.mode === 'cards') G.mode = 'play';
  };
  // 来源：地上掉落被拾取 / BOSS 掉落 / 任务奖励 —— 都改成“三选一”
  var oldGive = K.give;
  K.giveRaw = oldGive;
  K.debugGive = function (G, id) { return oldGive(G, id, { raw: true }); };          // 调试 / 测试直接给，不走三选一
  K.give = function (G, id, opts) {
    if (opts && opts.raw) return oldGive(G, id, opts);
    if (G.mode !== 'play' && G.mode !== 'cards') return oldGive(G, id, opts);        // 结算 / 技能页等：直接给
    K.offer(G, id, (opts && opts.table) || 'normal', opts); return null;
  };
  // choose 里真正给的时候不要再触发三选一
  var chooseOld = K.choose;
  K.choose = function (G, k) {
    var o = G.cardOffer; if (o && k >= 0 && o.ids[k]) { var id = o.ids[k], op = o.opts || {}; var op2 = {}; for (var x in op) op2[x] = op[x]; op2.raw = true; o.opts = op2; }
    return chooseOld(G, k);
  };

  /* ---------- 画：三选一面板 ---------- */
  XY.drawCardOffer = function (c, G, app) {
    var R = XY.R, o = G.cardOffer, ui = XY.ui; if (!o) return;
    var W = app.lw, H = app.lh, n = o.ids.length, cw = 232, gap = 18, tw = n * cw + (n - 1) * gap, x0 = W / 2 - tw / 2, y0 = H / 2 - 190;
    ui.hits.length = 0; c.fillStyle = 'rgba(40,32,20,0.45)'; c.fillRect(0, 0, W, H);
    R.panel(c, x0 - 24, y0 - 24, tw + 48, 440, 16);
    var line = K.setLine(G), held = K.heldCount(G);
    R.txt(c, '三选一：挑一件法宝', W / 2, y0 + 8, 26, R.T.ink, 'center', true);
    R.txt(c, (line ? '本局套系：「' + XY.CARD_SETS[line].name + '」' : '第一件定下本局套系') + ' · 已带 ' + held + ' / ' + C.CARD_HELD_MAX + ' 件 · 点卡牌或按 1 2 3', W / 2, y0 + 38, 14.5, R.T.inkSoft, 'center', false);
    o.ids.forEach(function (id, k) {
      var cd = XY.CARD_BY[id], rr = XY.RARITY[cd.r], S = XY.CARD_SETS[cd.set], x = x0 + k * (cw + gap), y = y0 + 62, hov = app.mouse && app.mouse.x >= x && app.mouse.x < x + cw && app.mouse.y >= y && app.mouse.y < y + 300, own = K.carried(G).indexOf(id) >= 0;
      XY.INKP.card(c, x + cw / 2, y + 150, cw, 300, rr.color, S.color, 1, k * 17 + 3, hov ? 5.5 : 3.6, hov ? '#fff6dc' : '#fffdf6');       // v0.8 水墨卡面
      c.fillStyle = S.color; c.beginPath(); c.arc(x + 26, y + 28, 12, 0, 6.3); c.fill();
      R.txt(c, String(k + 1), x + cw - 24, y + 26, 20, R.T.inkSoft, 'center', true);
      R.txt(c, cd.name, x + cw / 2, y + 70, 26, R.T.ink, 'center', true);
      R.txt(c, rr.name + ' · ' + S.name + '套', x + cw / 2, y + 102, 15, rr.color, 'center', true);
      var lines = XY.fxText(cd.fx, XY.cardLvMul(XY.save.lvOf(id))).split('，'), ly = y + 140;
      lines.forEach(function (s) { R.txt(c, s, x + cw / 2, ly, 16, R.T.ink, 'center', false); ly += 24; });
      R.wrap(c, cd.lore || '', x + cw / 2, y + 214, cw - 32, 13.5, 18, R.T.inkSoft, 3);
      R.txt(c, own ? '已带：再拿一份叠加 +50%' : '新法宝', x + cw / 2, y + 276, 14, own ? '#b8300f' : '#2f7d3b', 'center', true);
      ui.hits.push({ x: x, y: y, w: cw, h: 300, act: 'offerPick', k: k });
    });
    var bx = W / 2 - 110, by = y0 + 380;
    R.rrect(c, bx, by, 220, 40, 10); c.fillStyle = '#f1eee6'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a89a78'; c.stroke();
    R.txt(c, '都不要，换 ' + C.CARD_SKIP_COINS + ' 金币', W / 2, by + 21, 15, R.T.ink, 'center', true);
    ui.hits.push({ x: bx, y: by, w: 220, h: 40, act: 'offerPick', k: -1 });
  };
})();
