/* ============================================================
 * screens.js —— 局外界面：主菜单、卡牌 / 组牌、图鉴、解锁 / 皮肤、清空存档确认
 * 全部画在 canvas 上；可点击区域登记到 XY.ui.hits（和游戏里的按钮同一套），点击在 main.js 里处理。
 * 这里只"读"存档（XY.save），改存档的操作都在 main.js 的点击处理里。
 * ============================================================ */
(function () {
  var XY = window.XY, R = XY.R, T = R.T, txt = R.txt, rrect = R.rrect, panel = R.panel, btn = R.btn, wrap = R.wrap, dim = R.dim;
  var ui = XY.ui, PI2 = Math.PI * 2, S = XY.save;

  function hit(x, y, w, h, act, extra) {
    var o = { x: x, y: y, w: w, h: h, act: act }, k; if (extra) for (k in extra) o[k] = extra[k];
    ui.hits.push(o); return o;
  }
  function over(app, x, y, w, h) { return app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h; }
  // 小按钮：on 选中（绿）/ off 灰掉 / danger 红字
  function sbtn(c, app, x, y, w, h, label, act, extra, o) {
    o = o || {}; if (XY.ui2 && XY.ui2.on) { var gg = XY.ui2.grow(app, x, y, w, h); x = gg[0]; y = gg[1]; w = gg[2]; h = gg[3]; }
    var hov = !o.off && over(app, x, y, w, h);
    if (XY.ui2 && XY.ui2.on) { XY.ui2.pill(c, x, y, w, h, label, { on: o.on, primary: o.primary, off: o.off, danger: o.danger, hov: hov, size: o.size || 15 }); if (act) hit(x, y, w, h, act, extra); return; }
    rrect(c, x, y, w, h, 10);
    c.fillStyle = o.off ? '#ece8dd' : (o.on ? '#cfeccb' : (o.primary ? (hov ? '#ffb347' : '#ffc46b') : (hov ? '#fff3d6' : '#ffffff'))); c.fill();
    c.lineWidth = 2; c.strokeStyle = o.on ? '#43a047' : (o.off ? '#cfc8b4' : '#b9a77a'); c.stroke();
    txt(c, label, x + w / 2, y + h / 2 + 1, o.size || 15, o.off ? '#a49d8a' : (o.danger ? '#b8300f' : T.ink), 'center', true);
    if (act) hit(x, y, w, h, act, extra);
  }
  function frame(c, app, W, H, pw, ph, title, sub) {
    dim(c, app, 0.72);
    var px = W / 2 - pw / 2, py = Math.max(6, H / 2 - ph / 2);
    panel(c, px, py, pw, ph, 20, 'rgba(255,255,255,0.96)', '#d9a21a');
    txt(c, title, px + 28, py + 34, 30, '#b8300f', 'left', true);
    if (sub) txt(c, sub, px + pw - 28, py + 36, 15, T.inkSoft, 'right', false);
    sbtn(c, app, px + 24, py + ph - 56, 150, 38, '← 返回（Esc）', 'back', null, { size: 16 });
    return { px: px, py: py };
  }
  function msgLine(c, app, x, y, align) {
    var m = app.menuMsg; if (!m || app.rt > m.until) return;
    txt(c, m.text, x, y, 14, m.bad ? '#b8300f' : '#2f7d3b', align || 'left', true);
  }
  function lines(c, arr, x, y, sz, lh, color, maxW) {          // 左对齐自动换行（逐字）
    c.font = R.font(sz, false); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = color;
    arr.forEach(function (s) {
      s = XY.fmtStr(s); var line = '';
      for (var i = 0; i < s.length; i++) { var t = line + s[i]; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = s[i]; } else line = t; }
      c.fillText(line, x, y); y += lh;
    });
    return y;
  }

  /* ---------- 敌人小图标（图鉴里用；没见过的画成剪影） ---------- */
  function drawEnemyIcon(c, type, x, y, r, sil, rt) {
    var d = XY.ENEMIES[type], col = sil ? '#aaa59a' : d.color, dk = sil ? '#85807a' : d.dark;
    if (d.fly && XY.fly) { XY.fly.icon(c, type, x, y, r, sil, rt); if (sil) txt(c, '？', x, y + 2, Math.round(r * 1.0), '#fff', 'center', true); return; }
    if (!sil && XY.MINK && XY.MINK.portrait && XY.MINK_DATA && XY.MINK_DATA[type] && XY.MINK.portrait(c, type, x, y + r * 0.95, r * 2.3)) return;
    if (XY.MINK && XY.MINK.dexPose && XY.MINK.dexPose(c, type, x, y + r * 0.95, r * 2.6)) return;
    if (type === 'boss' || (XY.MINK_DATA && XY.MINK_DATA[type]) || (XY.MINK && XY.MINK.denPose && XY.MINK.denPose(type))) return;
    c.lineWidth = 3; c.strokeStyle = dk; c.fillStyle = col;
    if (type === 'elite' || type === 'boss') {
      c.beginPath(); c.moveTo(x - r * 0.7, y - r * 0.5); c.quadraticCurveTo(x - r * 1.3, y - r * 0.8, x - r * 1.1, y - r * 1.4); c.quadraticCurveTo(x - r * 0.6, y - r * 1.0, x - r * 0.3, y - r * 0.85); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x + r * 0.7, y - r * 0.5); c.quadraticCurveTo(x + r * 1.3, y - r * 0.8, x + r * 1.1, y - r * 1.4); c.quadraticCurveTo(x + r * 0.6, y - r * 1.0, x + r * 0.3, y - r * 0.85); c.fill(); c.stroke();
    }
    if (type === 'tank') { rrect(c, x - r, y - r * 0.9, r * 2, r * 1.8, r * 0.5); } else { c.beginPath(); c.arc(x, y, r, 0, PI2); }
    c.fill(); c.stroke();
    if (sil) { txt(c, '？', x, y + 2, Math.round(r * 1.1), '#fff', 'center', true); return; }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * 0.33, y - r * 0.12, r * 0.22, 0, PI2); c.arc(x + r * 0.33, y - r * 0.12, r * 0.22, 0, PI2); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.1, r * 0.1, 0, PI2); c.arc(x + r * 0.36, y - r * 0.1, r * 0.1, 0, PI2); c.fill();
    if (type === 'ranged') { c.strokeStyle = '#6b4a22'; c.lineWidth = 3; c.beginPath(); c.arc(x + r * 1.0, y, r * 0.8, -1.2, 1.2); c.stroke(); }
    if (type === 'shield') { c.fillStyle = '#e3c46a'; c.strokeStyle = '#6e5216'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + r * 0.9, y - r * 1.1); c.lineTo(x + r * 1.5, y - r * 0.6); c.lineTo(x + r * 1.5, y + r * 0.5); c.lineTo(x + r * 0.9, y + r * 1.1); c.lineTo(x + r * 0.3, y + r * 0.5); c.lineTo(x + r * 0.3, y - r * 0.6); c.closePath(); c.fill(); c.stroke(); }
    if (type === 'boss') { c.fillStyle = '#f0b429'; c.strokeStyle = '#8a6a0b'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.95); c.lineTo(x - r * 0.5, y - r * 1.3); c.lineTo(x - r * 0.2, y - r * 1.05); c.lineTo(x, y - r * 1.4); c.lineTo(x + r * 0.2, y - r * 1.05); c.lineTo(x + r * 0.5, y - r * 1.3); c.lineTo(x + r * 0.5, y - r * 0.95); c.closePath(); c.fill(); c.stroke(); }
  }

  /* ---------- 卡牌格子（组牌、图鉴共用） ---------- */
  // v0.8.3 图鉴：一张牌在新法宝体系里的身份（起手 / 需解锁 / 已解锁 / 典藏）
  S.fbTag = function (id) {
    var FB = XY.fabao, it = FB && FB.BY[id];
    if (!it) return { kind: 'retired', text: '典藏（旧牌，已不在新法宝体系里）', short: '典藏' };
    if (it.starter) return { kind: 'starter', text: '新档起手可带', short: '起手' };
    var wh = FB.whereText(id) || '', sh = wh.replace(/^击败 (\S+).*$/, '击败$1');
    if (FB.unlocked(id)) return { kind: 'open', text: '已解锁（' + (wh || '商店 / 其他来源') + '）', short: '已解锁' };
    return { kind: 'locked', text: '需要先解锁：' + (wh || '灵石商店购买'), short: sh || '灵石店' };
  };
  function cardTile(c, app, x, y, w, h, cd, o) {
    var owned = S.has(cd.id), Rr = XY.RARITY[cd.r], Sc = XY.CARD_SETS[cd.set], rec = S.data.cards[cd.id], sel = o.sel === cd.id;
    var hov = over(app, x, y, w, h);
    rrect(c, x, y, w, h, 9);
    c.fillStyle = owned ? (hov ? '#fff3d6' : '#fffaf0') : (hov ? '#e9e5d9' : '#e2ded2'); c.fill();
    c.lineWidth = sel ? 4 : 2.5; c.strokeStyle = sel ? '#e0533d' : (owned ? Rr.color : '#bdb8a8'); c.stroke();
    if (owned) { c.fillStyle = Rr.glow; rrect(c, x + 3, y + 3, w - 6, h - 6, 7); c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1; }
    rrect(c, x + 5, y + 5, w - 10, h * 0.46, 6); c.fillStyle = owned ? Sc.color : '#b9b4a6'; c.fill();
    txt(c, owned ? cd.name.charAt(0) : '？', x + w / 2, y + 5 + h * 0.23, Math.round(h * 0.34), '#fff', 'center', true);
    txt(c, owned ? cd.name : '？？？', x + w / 2, y + h * 0.66, 14, owned ? T.ink : '#8a8576', 'center', true);
    if ((o.mode === 'deck' || !owned) && !(o.mode === 'dex' && S.fbTag(cd.id).kind === 'locked')) txt(c, Rr.name, x + w / 2, y + h * (o.mode === 'deck' ? 0.80 : 0.86), 11, owned ? Rr.color : '#9a9586', 'center', true);
    if (owned) {
      if (o.mode === 'deck') {
        txt(c, 'Lv' + rec.lv, x + 8, y + h - 10, 12, T.ink, 'left', true);
        if (rec.lv < XY.CARD_MAXLV) { var ok = rec.dup >= S.upNeed(rec.lv); txt(c, '重复 ' + rec.dup + '/' + S.upNeed(rec.lv), x + w - 6, y + h - 10, 11, ok ? '#2f7d3b' : T.inkSoft, 'right', ok); }
        else txt(c, '满级', x + w - 6, y + h - 10, 11, '#b8860b', 'right', true);
      } else txt(c, '获得 ' + rec.got + ' 次', x + w / 2, y + h - 10, 11, T.inkSoft, 'center', false);
      if (o.inDeck && S.inDeck(cd.id)) { rrect(c, x + w - 34, y + 7, 28, 16, 8); c.fillStyle = '#43a047'; c.fill(); txt(c, '卡组', x + w - 20, y + 15.5, 10, '#fff', 'center', true); }
    }
    if (o.mode === 'dex') {                                          // v0.8.3：开局可带的法宝标“起手”，其余写解锁来源
      var ft = S.fbTag(cd.id);
      if (ft.kind === 'starter') { rrect(c, x + w - 38, y + 7, 32, 16, 8); c.fillStyle = '#f6dc8a'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#b8860b'; c.stroke(); txt(c, '起手', x + w - 22, y + 15.5, 11, '#7a5a10', 'center', true); }
      else if (ft.kind === 'locked') txt(c, '解锁：' + ft.short, x + w / 2, y + h * 0.84, 10.5, '#8a8576', 'center', true);
      else if (ft.kind === 'retired') txt(c, '典藏', x + w - 22, y + 15.5, 11, '#8a8576', 'center', true);
    }
    hit(x, y, w, h, o.act, { id: cd.id });
  }

  /* ================= 主菜单 ================= */
  function drawMenu(c, G, app) {
    var W = app.lw, H = app.lh, rt = app.rt, i;
    dim(c, app, 0.55);
    var pw = Math.min(980, W - 40), px = W / 2 - pw / 2, ph = 650, py = Math.max(6, H / 2 - ph / 2);
    panel(c, px, py, pw, ph, 20, 'rgba(255,255,255,0.94)', '#d9a21a');
    txt(c, '西游X', W / 2, py + 46, 54, '#b8300f', 'center', true);
    txt(c, '取经路上一关一关闯：打掉洞府 BOSS 断掉妖怪的来路，护送唐僧走到西边关口。', W / 2, py + 90, 16, T.inkSoft, 'center', false);
    var cw = (pw - 60) / 5;
    for (i = 0; i < 5; i++) {
      var d = XY.heroDef(i), x = px + 20 + i * (cw + 5), y = py + 112;
      rrect(c, x, y, cw, 172, 12); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 2; c.strokeStyle = d.color; c.stroke();
      R.drawHeroShape(c, d, x + cw / 2, y + 36 + Math.sin(rt * 3 + i) * 2, 24);
      txt(c, d.name, x + cw / 2, y + 80, 19, T.ink, 'center', true);
      txt(c, d.weapon, x + cw / 2, y + 102, 14, d.dark, 'center', true);
      txt(c, '大招：' + d.ult, x + cw / 2, y + 124, 13, '#b8300f', 'center', true);
      var rl = XY.HERO_ROLE[d.id] || (d.variant && XY.HERO_ROLE[d.variant]) || null;
      if (rl) txt(c, rl.name, x + cw / 2, y + 144, 14, rl.key === 'none' ? '#8a7d63' : '#2d6aa8', 'center', true);
      var tag = d.skinId ? XY.SKINS[d.id].name : (d.variant ? '变体角色' : null);
      if (tag) txt(c, tag, x + cw / 2, y + 163, 11, '#2f7d3b', 'center', true);
    }
    var ly = py + 294, L = [
      ['走位', 'WASD / 鼠标（按住左键跟随、单击设目的地）：只管走位，技能自动放；1-6 切换操控的英雄，其他人听命令'],
      ['洞府', '妖怪都从洞府出来，BOSS 不倒就一直出；怪每分钟 +1%，BOSS 每分钟 +5%；唐僧驻守营地会让出怪量越来越多'],
      ['输赢', '完成本关主线 + 唐僧亲自走进西边关口才过关；营地被攻破或唐僧被碰到 / 打中（他只有 1 点血）就输；阵亡的徒弟不复活']
    ];
    for (i = 0; i < L.length; i++) { txt(c, L[i][0], px + 40, ly + i * 26, 15, '#b8300f', 'left', true); txt(c, L[i][1], px + 96, ly + i * 26, 14, T.ink, 'left', false); }
    // 开始（任务模式，单人）
    btn(c, app, W / 2 - 210, py + 378, 420, 64, '出发 · 任务模式（单人）  Enter', 'menuLevels', { primary: true, size: 22 });
    // 三个入口
    var bw = (pw - 80 - 48) / 4, by = py + 462, dk = S.data.deck.length + '/' + S.deckSlots();
    var dexSeen = XY.ENEMY_ORDER.filter(function (t) { var e = S.dexOf(t); return e && e.seen > 0; }).length;
    var un = XY.UNLOCKS.filter(function (u) { return S.data.unlocks[u.id]; }).length;
    var spN = XY.SPECIALS.filter(function (d) { return S.spOwned(d.id); }).length;
    var ent = [
      ['卡牌 / 组牌', '卡组 ' + dk + ' · 收藏 ' + S.ownedCount() + '/' + XY.CARDS.length, 'menuDeck'],
      ['灵石商店', '灵石 ' + S.data.lingshi + ' · 常驻角色 ' + spN + '/' + XY.SPECIALS.length, 'menuShop'],
      ['图鉴', '妖怪 ' + dexSeen + '/' + XY.ENEMY_ORDER.length + ' · 法宝 ' + S.ownedCount() + '/' + XY.CARDS.length + ' · 协同 ' + XY.synDexCount() + '/' + XY.SYNS.length, 'menuDex'],
      ['解锁 / 皮肤', '已解锁 ' + un + '/' + XY.UNLOCKS.length, 'menuUnlock']
    ];
    ent.forEach(function (e, k) {
      var x = px + 40 + k * (bw + 16), hov = over(app, x, by, bw, 62);
      rrect(c, x, by, bw, 62, 12); c.fillStyle = hov ? '#fff3d6' : '#ffffff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#b9a77a'; c.stroke();
      txt(c, e[0], x + bw / 2, by + 22, 20, T.ink, 'center', true); txt(c, e[1], x + bw / 2, by + 45, 12.5, T.inkSoft, 'center', false);
      hit(x, by, bw, 62, e[2]);
    });
    // 副本模式（占位，联机以后做）+ 重置存档
    rrect(c, W / 2 - 210, py + 540, 420, 40, 12); c.fillStyle = '#ece8dd'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#cfc8b4'; c.stroke();
    txt(c, '副本模式（多人联机 · 开发中，暂不可用）', W / 2, py + 561, 15, '#a49d8a', 'center', true);
    sbtn(c, app, px + pw - 170, py + 543, 140, 34, '重置存档', 'menuReset', null, { danger: true, size: 14 });
    sbtn(c, app, px + pw - 170 - 150, py + 543, 140, 34, '新手教程', 'menuTutorial', null, { size: 14 });
    XY.R4.verBtn(c, app, px + 30, py + 532, 200, 52);
    msgLine(c, app, W / 2, py + 596, 'center');
    var st = S.data.stats;
    txt(c, '存档（本机）：开局 ' + st.runs + ' 次 · 通关 ' + st.wins + ' 次 · 累计击杀 ' + st.kills + (S.memoryOnly ? ' · ⚠ 浏览器不让存档，只在本页有效' : ' · 自动保存') + '   v' + XY.VERSION, W / 2, py + 626, 12, T.inkSoft, 'center', false);
  }

  /* ================= 卡牌 / 组牌 ================= */
  function deckSummary() {            // 卡组带进局的效果（和局内一样：每张按等级，同套 3 / 5 张触发羁绊）
    var fx = {}, cnt = {}, k;
    function add(f, mul) { for (k in f) fx[k] = (fx[k] || 0) + f[k] * mul; }
    S.data.deck.forEach(function (id) { var cd = XY.CARD_BY[id]; add(cd.fx, XY.cardLvMul(S.lvOf(id))); cnt[cd.set] = (cnt[cd.set] || 0) + 1; });
    var combos = [];
    XY.SET_ORDER.forEach(function (sid) {
      var n = cnt[sid] || 0, s = XY.CARD_SETS[sid];
      if (n >= 3) { add(s.t3.fx, 1); combos.push(s.name + '3'); } if (n >= 5) { add(s.t5.fx, 1); combos.push(s.name + '5'); }
    });
    return { text: XY.fxText(fx, 1), combos: combos, any: Object.keys(fx).length > 0 };
  }

  function drawDeck(c, G, app) {
    var W = app.lw, H = app.lh, i, j;
    var pw = Math.min(1210, W - 20), ph = 690, o = frame(c, app, W, H, pw, ph, '卡牌 / 组牌', '收藏 ' + S.ownedCount() + '/' + XY.CARDS.length + ' · 同一套带 3 张 / 5 张触发羁绊 · 重复的法宝可以升级');
    var px = o.px, py = o.py, sel = app.deckSel, tw = 92, th = 104, gx = px + 24 + 184;
    XY.SET_ORDER.forEach(function (sid, r) {
      var s = XY.CARD_SETS[sid], y = py + 76 + r * 122, mine = XY.CARDS.filter(function (cd) { return cd.set === sid; });
      var have = mine.filter(function (cd) { return S.has(cd.id); }).length;
      rrect(c, px + 18, y, 176, th + 6, 10); c.fillStyle = 'rgba(0,0,0,0.04)'; c.fill();
      c.fillStyle = s.color; c.fillRect(px + 18, y + 8, 5, th - 10);
      txt(c, s.name + '套', px + 32, y + 17, 18, s.color, 'left', true);
      txt(c, s.theme + ' · 拥有 ' + have + '/6', px + 188, y + 18, 12, T.inkSoft, 'right', false);
      lines(c, ['3张：' + XY.comboText(sid, 0), '5张：' + XY.comboText(sid, 1)], px + 30, y + 42, 11, 14, '#2f7d3b', 156);
      mine.forEach(function (cd, k) { cardTile(c, app, gx + k * (tw + 4), y, tw, th + 6, cd, { sel: sel, act: 'cardSel', mode: 'deck', inDeck: true }); });
    });
    // 右栏：卡组栏位
    var rx = px + 24 + 184 + 6 * (tw + 4) + 14, rw = px + pw - 22 - rx, n = S.deckSlots();
    panel(c, rx, py + 70, rw, 150, 12);
    txt(c, '我的卡组  ' + S.data.deck.length + ' / ' + n + ' 格', rx + 14, py + 90, 16, T.ink, 'left', true);
    txt(c, '开局生效', rx + rw - 14, py + 91, 12, T.inkSoft, 'right', false);
    var sw = (rw - 20 - 12) / 3;
    for (i = 0; i < 6; i++) {
      var sx = rx + 10 + (i % 3) * (sw + 6), sy = py + 106 + Math.floor(i / 3) * 56, id = S.data.deck[i];
      rrect(c, sx, sy, sw, 50, 8);
      if (i >= n) { c.fillStyle = '#e9e5d9'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#cfc8b4'; c.stroke(); txt(c, '未解锁', sx + sw / 2, sy + 25, 12, '#a49d8a', 'center', true); }
      else if (!id) { c.fillStyle = '#fffdf6'; c.fill(); c.setLineDash([5, 4]); c.lineWidth = 1.5; c.strokeStyle = '#b9a77a'; c.stroke(); c.setLineDash([]); txt(c, '空格', sx + sw / 2, sy + 25, 13, '#b9a77a', 'center', true); }
      else {
        var cd = XY.CARD_BY[id], Rr = XY.RARITY[cd.r];
        c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = Rr.color; c.stroke();
        c.fillStyle = XY.CARD_SETS[cd.set].color; c.fillRect(sx + 6, sy + 8, 4, 34);
        txt(c, cd.name, sx + 16, sy + 19, 14, T.ink, 'left', true); txt(c, 'Lv' + S.lvOf(id) + ' · ' + Rr.name, sx + 16, sy + 38, 11, Rr.color, 'left', true);
        hit(sx, sy, sw, 50, 'cardSel', { id: id });
      }
    }
    // 详情
    var dy = py + 232, dh = 276;
    panel(c, rx, dy, rw, dh, 12);
    if (!sel) { txt(c, '点一张法宝看详情', rx + rw / 2, dy + dh / 2, 16, T.inkSoft, 'center', false); }
    else {
      var cd2 = XY.CARD_BY[sel], own = S.has(sel), rr = XY.RARITY[cd2.r], ss = XY.CARD_SETS[cd2.set], lv = S.lvOf(sel);
      if (!own) {
        txt(c, '？？？', rx + 16, dy + 28, 24, '#8a8576', 'left', true);
        txt(c, rr.name + ' · ' + ss.name + '套（' + ss.theme + '）', rx + 16, dy + 56, 14, rr.color, 'left', true);
        lines(c, ['还没有这张法宝。', '局内击杀精英、开宝箱、打倒牛魔王时都有机会掉落；掉落后自动收进你的收藏。'], rx + 16, dy + 90, 14, 20, T.inkSoft, rw - 32);
      } else {
        txt(c, cd2.name, rx + 16, dy + 28, 24, T.ink, 'left', true);
        txt(c, rr.name + ' · ' + ss.name + '套（' + ss.theme + '） · Lv' + lv + '/' + XY.CARD_MAXLV, rx + 16, dy + 56, 14, rr.color, 'left', true);
        var yy = lines(c, ['现在：' + XY.cardFxText(cd2, lv)], rx + 16, dy + 84, 14, 19, '#2f7d3b', rw - 32);
        if (lv < XY.CARD_MAXLV) yy = lines(c, ['升级后：' + XY.cardFxText(cd2, lv + 1)], rx + 16, yy + 2, 13, 18, T.inkSoft, rw - 32);
        else { txt(c, '已满级', rx + 16, yy + 8, 13, '#b8860b', 'left', true); yy += 20; }
        var rec = S.data.cards[sel], need = S.upNeed(lv);
        if (lv < XY.CARD_MAXLV) {
          txt(c, '重复法宝（升级用） ' + rec.dup + ' / ' + need, rx + 16, yy + 12, 13, T.ink, 'left', true);
          R.bar(c, rx + 16, yy + 24, rw - 32, 8, rec.dup / need, rec.dup >= need ? '#5cb85c' : '#e8b44a');
        }
        lines(c, [cd2.lore], rx + 16, dy + 196, 12, 17, T.inkSoft, rw - 32);
        var inD = S.inDeck(sel), bw2 = (rw - 32 - 8) / 2;
        sbtn(c, app, rx + 16, dy + dh - 46, bw2, 36, inD ? '从卡组取下' : '放入卡组', 'deckToggle', { id: sel }, { primary: !inD, size: 15 });
        sbtn(c, app, rx + 16 + bw2 + 8, dy + dh - 46, bw2, 36, lv >= XY.CARD_MAXLV ? '已满级' : '升级', 'cardUp', { id: sel }, { primary: lv < XY.CARD_MAXLV && rec.dup >= need, off: lv >= XY.CARD_MAXLV || rec.dup < need, size: 15 });
        // 灰掉的按钮也要能点（点了给出原因提示）：上面 off 的升级按钮已登记 hit
      }
    }
    // 卡组效果汇总
    var sm = deckSummary();
    panel(c, rx, py + 520, rw, 100, 12);
    txt(c, '卡组带进局的效果', rx + 14, py + 538, 14, T.ink, 'left', true);
    lines(c, [sm.any ? sm.text : '（卡组是空的）'], rx + 14, py + 560, 12.5, 17, '#2f7d3b', rw - 28);
    if (sm.combos.length) txt(c, '羁绊：' + sm.combos.join('、'), rx + 14, py + 608, 12, '#b8860b', 'left', true);
    msgLine(c, app, px + 200, py + ph - 37);
    txt(c, '提示：卡组栏位通过「解锁」里的收集里程碑增加；局内捡到的法宝会永久收进收藏。', px + pw - 24, py + ph - 37, 12, T.inkSoft, 'right', false);
  }


  /* ================= 协同图鉴（v0.5）：14 条协同技，学过的显示效果，没学过的只显示搭档和五行关系 ================= */
  function synName(id) { var d = XY.SP_BY[id] || XY.HEROES.filter(function (h) { return h.id === id; })[0]; return d ? d.name : id; }
  function synElem(id) { var d = XY.SP_BY[id] || XY.HEROES.filter(function (h) { return h.id === id; })[0]; return d ? d.elem : null; }
  function drawSynDex(c, app, bx, by, rx, rw) {
    var sel = app.dexSel && XY.SYN_BY[app.dexSel] ? app.dexSel : XY.SYNS[0].id, cw = 274, ch = 58;
    txt(c, '先学全队页里的协同技，才会记进图鉴 · 带「常驻」的要带上对应常驻角色', bx, by - 4, 12.5, T.inkSoft, 'left', false);
    XY.SYNS.forEach(function (Sy, k) {
      var x0 = bx + Math.floor(k / 7) * (cw + 12), y = by + 6 + (k % 7) * 62, on = sel === Sy.id, hov = over(app, x0, y, cw, ch), got = S.data.dex['syn:' + Sy.id];
      rrect(c, x0, y, cw, ch, 12); c.fillStyle = hov ? '#fff3d6' : '#fffaf0'; c.fill(); c.lineWidth = on ? 3.5 : 2; c.strokeStyle = on ? '#c0489a' : '#cdbf9c'; c.stroke();
      txt(c, got ? Sy.fullName : '？？？', x0 + 12, y + 20, 16, got ? T.ink : '#8a8576', 'left', true);
      txt(c, synName(Sy.a) + ' + ' + synName(Sy.b), x0 + 12, y + 42, 12.5, T.inkSoft, 'left', true);
      txt(c, got ? '已学 Lv' + got.lv : (Sy.spec ? '常驻' : '徒弟'), x0 + cw - 10, y + 20, 12, got ? '#b8860b' : '#9a9586', 'right', true);
      var ea = XY.ELEMS[synElem(Sy.a)], eb = XY.ELEMS[synElem(Sy.b)];
      if (ea) { c.fillStyle = ea.color; c.beginPath(); c.arc(x0 + cw - 38, y + 40, 8, 0, Math.PI * 2); c.fill(); txt(c, ea.glyph, x0 + cw - 38, y + 41, 10, '#fff', 'center', true); }
      if (eb) { c.fillStyle = eb.color; c.beginPath(); c.arc(x0 + cw - 16, y + 40, 8, 0, Math.PI * 2); c.fill(); txt(c, eb.glyph, x0 + cw - 16, y + 41, 10, '#fff', 'center', true); }
      hit(x0, y, cw, ch, 'dexSel', { id: Sy.id });
    });
    var Sy2 = XY.SYN_BY[sel], got2 = S.data.dex['syn:' + sel], K = XY.SYN_KIND[Sy2.kind0], rel = XY.elemRel(synElem(Sy2.a), synElem(Sy2.b));
    panel(c, rx, by - 6, rw, 410, 12);
    txt(c, got2 ? Sy2.fullName : '？？？', rx + rw / 2, by + 34, 26, got2 ? T.ink : '#8a8576', 'center', true);
    txt(c, synName(Sy2.a) + ' + ' + synName(Sy2.b), rx + rw / 2, by + 64, 16, '#a03a82', 'center', true);
    txt(c, '五行：' + ((XY.ELEMS[synElem(Sy2.a)] || {}).name || '?') + ' 与 ' + ((XY.ELEMS[synElem(Sy2.b)] || {}).name || '?') + '（' + (rel || '无直接关系') + '）', rx + rw / 2, by + 90, 14, T.inkSoft, 'center', true);
    var y2 = lines(c, ['搭配：' + Sy2.note], rx + 24, by + 124, 14, 20, T.ink, rw - 48);
    txt(c, '玩法：' + K.name, rx + 24, y2 + 12, 15, '#c0489a', 'left', true);
    if (got2) {
      y2 = lines(c, ['Lv1：' + K.desc(Sy2, 1)], rx + 24, y2 + 36, 13.5, 19, '#2f7d3b', rw - 48);
      y2 = lines(c, ['Lv2：' + K.desc(Sy2, 2)], rx + 24, y2 + 6, 13.5, 19, '#2f7d3b', rw - 48);
      txt(c, '已学到 Lv' + got2.lv + ' · 技能点 ' + XY.SYN_COST[0] + ' + ' + XY.SYN_COST[1], rx + 24, by + 376, 14, T.ink, 'left', true);
    } else lines(c, ['还没学过。在一局里打开技能页（Tab）→ 全队页（9），选好搭档后学习，效果就会记进来。'], rx + 24, y2 + 36, 14, 20, T.inkSoft, rw - 48);
  }

  /* ================= 图鉴 ================= */
  function drawDex(c, G, app) {
    var W = app.lw, H = app.lh, i;
    var pw = Math.min(1100, W - 20), ph = 640, seenN = XY.ENEMY_ORDER.filter(function (t) { var e = S.dexOf(t); return e && e.seen > 0; }).length;
    var o = frame(c, app, W, H, pw, ph, '图鉴', '妖怪 ' + seenN + '/' + XY.ENEMY_ORDER.length + ' · 法宝 ' + S.ownedCount() + '/' + XY.CARDS.length + ' · 没见过的显示成剪影');
    var px = o.px, py = o.py, tab = app.dexTab;
    sbtn(c, app, px + 28, py + 62, 130, 36, '妖怪', 'dexTab', { tab: 'enemy' }, { on: tab === 'enemy', size: 17 });
    sbtn(c, app, px + 166, py + 62, 130, 36, '法宝', 'dexTab', { tab: 'card' }, { on: tab === 'card', size: 17 });
    sbtn(c, app, px + 304, py + 62, 130, 36, '协同', 'dexTab', { tab: 'syn' }, { on: tab === 'syn', size: 17 });
    var bx = px + 28, by = py + 112, rx = px + 28 + 560 + 20, rw = px + pw - 28 - rx;
    var hid = S.data.dex['hid:phcollect'];      // 隐藏能力的“图鉴线索”：没触发过只给模糊提示，触发过后写明
    if (tab === 'card') sbtn(c, app, px + 442, py + 62, 150, 36, app.dexStarter ? '仅起手可带 ✓' : '全部法宝', 'dexStarter', {}, { on: !!app.dexStarter, size: 16 });
    txt(c, hid ? '图鉴·线索（已解开）：Phyrex 在场并由你亲自操控满 30 秒，会把全图的灵石和金币一次吸过来。' : '图鉴·线索：听说有位大佬，被亲自带着走一阵子，战场上会发生一件好事……', tab === 'card' ? px + 604 : px + 450, py + 80, tab === 'card' ? 11 : 13, hid ? '#2f7d3b' : '#8a7d63', 'left', hid);
    if (tab === 'enemy') {
      var sel = app.dexSel && XY.BESTIARY[app.dexSel] ? app.dexSel : XY.ENEMY_ORDER[0];
      XY.ENEMY_ORDER.forEach(function (t, k) {      // 17 种妖怪：两列（每列 9 个），都放在面板里
        var e = S.dexOf(t), seen = e && e.seen > 0, cw = 274, ch = 40, x0 = bx + Math.floor(k / 9) * (cw + 12), y = by + (k % 9) * 44, d = XY.ENEMIES[t], on = sel === t, hov = over(app, x0, y, cw, ch);
        rrect(c, x0, y, cw, ch, 12); c.fillStyle = hov ? '#fff3d6' : '#fffaf0'; c.fill(); c.lineWidth = on ? 3.5 : 2; c.strokeStyle = on ? '#e0533d' : '#cdbf9c'; c.stroke();
        drawEnemyIcon(c, t, x0 + 26, y + 21, Math.max(10, Math.min(13, d.r * 0.8)), !seen, app.rt);
        txt(c, seen ? d.name : '？？？', x0 + 52, y + 15, 16, seen ? T.ink : '#8a8576', 'left', true);
        txt(c, seen ? '遇到 ' + e.seen + ' · 击杀 ' + e.kills : '还没遇到过', x0 + 52, y + 31, 11.5, T.inkSoft, 'left', false);
        if (seen && (d.elite || d.boss || d.fly)) txt(c, d.boss ? 'BOSS' : (d.fly ? '飞行' : '精英'), x0 + cw - 10, y + 15, 12, d.boss ? '#9b59d0' : (d.fly ? '#3a7ca5' : '#d9534f'), 'right', true);
        if (seen && e.card) { c.lineWidth = 2.5; c.strokeStyle = '#c9a24a'; rrect(c, x0 + 2, y + 2, cw - 4, ch - 4, 10); c.stroke(); c.fillStyle = '#b8322a'; c.fillRect(x0 + cw - 30, y + ch - 20, 18, 16); txt(c, '卡', x0 + cw - 21, y + ch - 7, 11, '#fff4e0', 'center', true); }      // 西游线图鉴卡：金边 + 朱印
        hit(x0, y, cw, ch, 'dexSel', { id: t });
      });
      var ee = S.dexOf(sel), sn = ee && ee.seen > 0, dd = XY.ENEMIES[sel], bz = XY.BESTIARY[sel];
      panel(c, rx, by, rw, 404, 12);
      drawEnemyIcon(c, sel, rx + rw / 2, by + 78, Math.min(46, dd.r * 1.1), !sn, app.rt);
      txt(c, sn ? dd.name : '？？？', rx + rw / 2, by + 150, 26, sn ? T.ink : '#8a8576', 'center', true);
      if (!sn) lines(c, ['在战斗里遇到它，就会记进图鉴。', '（还看不到详细信息）'], rx + 24, by + 200, 15, 22, T.inkSoft, rw - 48);
      else {
        var y2 = lines(c, [bz.desc], rx + 24, by + 186, 15, 22, T.ink, rw - 48);
        txt(c, '生命 ' + dd.hp + ' · 速度 ' + dd.speed + ' · ' + (dd.dive ? '俯冲伤害 ' + Math.round(dd.dmg * dd.dive.mul * 10) / 10 : '碰撞伤害 ' + dd.dmg) + (dd.range ? ' · 远程' : '') + (dd.fly ? ' · 飞行' : ''), rx + 24, y2 + 10, 14, T.inkSoft, 'left', true);
        y2 = lines(c, ['对付它：' + bz.tip], rx + 24, y2 + 38, 14, 20, '#2f7d3b', rw - 48);
        lines(c, ['掉落：' + bz.drop], rx + 24, y2 + 10, 14, 20, '#b8860b', rw - 48);
        txt(c, '累计遇到 ' + ee.seen + ' 次 · 击杀 ' + ee.kills + ' 只', rx + 24, by + 376, 14, T.ink, 'left', true);
      }
      var fr = S.data.cosFrames || {}, frn = Object.keys(fr).map(function (k) { return fr[k]; });
      if (ee && ee.card) txt(c, '已得「' + ee.card + '」', rx + rw - 24, by + 376, 13, '#b8322a', 'right', true);
      txt(c, frn.length ? '头像框：' + frn.join('、') : '头像框：小妖进化到 Ⅴ 阶可得', rx + 24, by + 396, 12.5, frn.length ? '#a8803a' : T.inkSoft, 'left', true);
    } else if (tab === 'syn') {
      drawSynDex(c, app, bx, by, rx, rw);
    } else {
      var selc = app.dexSel && XY.CARD_BY[app.dexSel] ? app.dexSel : null, tw = 88, th = 88;
      var dexList = XY.CARDS.filter(function (z) { return !app.dexStarter || S.fbTag(z.id).kind === 'starter'; });
      dexList.forEach(function (cd, k) {
        var sidx = XY.SET_ORDER.indexOf(cd.set), idx = dexList.filter(function (z) { return z.set === cd.set; }).indexOf(cd);
        cardTile(c, app, bx + idx * (tw + 5), by + 18 + sidx * (th + 22), tw, th, cd, { sel: selc, act: 'dexSel', mode: 'dex' });
      });
      XY.SET_ORDER.forEach(function (sid, r) { var s = XY.CARD_SETS[sid]; txt(c, s.name + '套 · ' + s.theme, bx + 2, by + 8 + r * (th + 22), 12.5, s.color, 'left', true); });
      panel(c, rx, by - 6, rw, 410, 12);
      if (!selc) txt(c, '点一张法宝看故事', rx + rw / 2, by + 200, 16, T.inkSoft, 'center', false);
      else {
        var cd3 = XY.CARD_BY[selc], own = S.has(selc), rr = XY.RARITY[cd3.r], ss = XY.CARD_SETS[cd3.set];
        R.drawCardMini(c, own ? cd3 : { name: '？', set: cd3.set, r: cd3.r }, rx + rw / 2, by + 56, 60, 84, own ? 1 : 0.5);
        txt(c, own ? cd3.name : '？？？', rx + rw / 2, by + 124, 24, own ? T.ink : '#8a8576', 'center', true);
        txt(c, rr.name + ' · ' + ss.name + '套（' + ss.theme + '）', rx + rw / 2, by + 152, 14, rr.color, 'center', true);
        var ftg = S.fbTag(selc); txt(c, ftg.text, rx + rw / 2, by + 172, 13, ftg.kind === 'starter' ? '#7a5a10' : (ftg.kind === 'locked' ? '#8a8576' : T.inkSoft), 'center', true);
        if (own) {
          var rec = S.data.cards[selc];
          var y3 = lines(c, [cd3.lore], rx + 24, by + 186, 14, 20, T.ink, rw - 48);
          y3 = lines(c, ['效果（Lv' + rec.lv + '）：' + XY.cardFxText(cd3, rec.lv)], rx + 24, y3 + 8, 14, 20, '#2f7d3b', rw - 48);
          txt(c, '累计获得 ' + rec.got + ' 次 · 等级 Lv' + rec.lv + '/' + XY.CARD_MAXLV, rx + 24, by + 372, 13, T.inkSoft, 'left', true);
        } else lines(c, ['还没有获得。精英、宝箱、牛魔王都有机会掉落。'], rx + 24, by + 196, 14, 20, T.inkSoft, rw - 48);
      }
    }
  }

  /* ================= 解锁 / 皮肤 ================= */
  function previewDef(i, skin, variant) {
    var base = XY.HEROES[i], d = {}, k; for (k in base) d[k] = base[k];
    if (variant) { var v = XY.VARIANTS.dragon; for (k in v) d[k] = v[k]; }
    if (skin) { var sk = XY.SKINS[base.id]; d.color = sk.color; d.dark = sk.dark; d.accent = sk.accent; }
    return d;
  }
  function drawUnlock(c, G, app) {
    var W = app.lw, H = app.lh, i;
    var pw = Math.min(1180, W - 20), ph = 650, un = XY.UNLOCKS.filter(function (u) { return S.data.unlocks[u.id]; }).length;
    var o = frame(c, app, W, H, pw, ph, '解锁 / 皮肤', '收集里程碑已达成 ' + un + '/' + XY.UNLOCKS.length + ' · 解锁后在这里换装 / 换角色');
    var px = o.px, py = o.py, lx = px + 24, lw = 560;
    txt(c, '皮肤与角色（点一下就换上）', lx, py + 76, 16, T.ink, 'left', true);
    XY.HEROES.forEach(function (base, k) {
      var y = py + 92 + k * 70, ul = S.skinUnlocked(base.id), cur = S.skinOf(base.id), u = XY.UNLOCKS.filter(function (z) { return z.kind === 'skin' && z.hero === base.id; })[0];
      rrect(c, lx, y, lw, 62, 12); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#cdbf9c'; c.stroke();
      txt(c, base.name, lx + 14, y + 20, 18, T.ink, 'left', true);
      txt(c, ul ? '皮肤已解锁' : '未解锁', lx + 14, y + 42, 12, ul ? '#2f7d3b' : T.inkSoft, 'left', true);
      var tx = lx + 100, tw = 214;
      [[false, '原版', 'default'], [true, ul ? XY.SKINS[base.id].name : '？？？', XY.SKINS[base.id].id]].forEach(function (opt, j) {
        var x = tx + j * (tw + 8), isSkin = opt[0], on = isSkin ? cur !== 'default' : cur === 'default', lock = isSkin && !ul, hov = over(app, x, y + 5, tw, 52);
        rrect(c, x, y + 5, tw, 52, 10); c.fillStyle = on ? '#cfeccb' : (lock ? '#ece8dd' : (hov ? '#fff3d6' : '#ffffff')); c.fill(); c.lineWidth = on ? 3 : 1.5; c.strokeStyle = on ? '#43a047' : '#cdbf9c'; c.stroke();
        var pd = previewDef(k, isSkin, false); if (lock) { pd.color = '#b9b4a6'; pd.dark = '#8a8576'; pd.accent = null; }
        R.drawHeroShape(c, pd, x + 30, y + 33, 17);
        txt(c, opt[1], x + 56, y + 24, 14, lock ? '#8a8576' : T.ink, 'left', true);
        txt(c, lock ? '🔒 ' + XY.condText(u) : (on ? '使用中' : '点击换上'), x + 56, y + 43, 11, lock ? '#8a8576' : (on ? '#2f7d3b' : T.inkSoft), 'left', false);
        hit(x, y + 5, tw, 52, 'skinSet', { hero: base.id, skin: isSkin ? 'skin' : 'default' });
      });
    });
    // 变体角色行（第 6 行）
    var vy = py + 92 + 5 * 70, dg = S.dragonUnlocked(), form = S.horseForm(), du = XY.UNLOCK_BY.u_dragon;
    rrect(c, lx, vy, lw, 62, 12); c.fillStyle = '#f4f8ff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#a9bde0'; c.stroke();
    txt(c, '第 5 位出战', lx + 14, vy + 20, 15, T.ink, 'left', true); txt(c, '变体角色', lx + 14, vy + 42, 12, '#3f62b8', 'left', true);
    XY.HORSE_FORMS.forEach(function (f, j) {
      var x = lx + 100 + j * 222, on = form === f.id, lock = f.id === 'dragon' && !dg, hov = over(app, x, vy + 5, 214, 52);
      rrect(c, x, vy + 5, 214, 52, 10); c.fillStyle = on ? '#cfeccb' : (lock ? '#ece8dd' : (hov ? '#fff3d6' : '#ffffff')); c.fill(); c.lineWidth = on ? 3 : 1.5; c.strokeStyle = on ? '#43a047' : '#cdbf9c'; c.stroke();
      var pd = previewDef(4, false, f.id === 'dragon'); if (lock) { pd.color = '#b9b4a6'; pd.dark = '#8a8576'; }
      R.drawHeroShape(c, pd, x + 30, vy + 31, 17);
      txt(c, lock ? '？？？' : f.name, x + 56, vy + 24, 14, lock ? '#8a8576' : T.ink, 'left', true);
      txt(c, lock ? '🔒 ' + XY.condText(du) : (on ? '使用中' : '点击换上'), x + 56, vy + 43, 11, lock ? '#8a8576' : (on ? '#2f7d3b' : T.inkSoft), 'left', false);
      hit(x, vy + 5, 214, 52, 'variantSet', { form: f.id });
    });
    // 右：里程碑
    var rx = px + 24 + lw + 22, rw = px + pw - 24 - rx;
    txt(c, '收集里程碑', rx, py + 76, 16, T.ink, 'left', true);
    var KIND = { slot: ['栏位', '#4f86c6'], skin: ['皮肤', '#d9a21a'], hero: ['角色', '#9b59d0'] };
    XY.UNLOCKS.forEach(function (u, k) {
      var y = py + 94 + k * 50, pr = S.progress(u), done = !!S.data.unlocks[u.id], kd = KIND[u.kind];
      rrect(c, rx, y, rw, 44, 10); c.fillStyle = done ? '#eaf6e6' : '#fffaf0'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = done ? '#7cc47a' : '#cdbf9c'; c.stroke();
      rrect(c, rx + 8, y + 9, 44, 18, 9); c.fillStyle = kd[1]; c.fill(); txt(c, kd[0], rx + 30, y + 18.5, 11, '#fff', 'center', true);
      txt(c, u.name, rx + 60, y + 18, 14, T.ink, 'left', true);
      txt(c, XY.condText(u), rx + 60, y + 35, 11.5, T.inkSoft, 'left', false);
      if (done) txt(c, '✔ 已解锁', rx + rw - 12, y + 22, 14, '#2f7d3b', 'right', true);
      else {
        var shown = u.cond.type === 'best' ? Math.floor(pr.cur / 60 * 10) / 10 + ' / ' + u.cond.n / 60 + ' 分' : pr.cur + ' / ' + pr.need;
        txt(c, shown, rx + rw - 12, y + 15, 12, T.ink, 'right', true);
        R.bar(c, rx + rw - 112, y + 25, 100, 8, pr.cur / pr.need, '#e8b44a');
      }
    });
    msgLine(c, app, px + 200, py + ph - 37);
    txt(c, '提示：每局的击杀、通关、坚持时间和收集到的法宝都会记进存档，自动解锁。', px + pw - 24, py + ph - 37, 12, T.inkSoft, 'right', false);
  }

  /* ================= 清空存档确认 ================= */
  function drawConfirm(c, app) {
    var W = app.lw, H = app.lh;
    ui.hits.length = 0;                       // 确认框打开时，后面的按钮都点不了
    dim(c, app, 0.55);
    if (XY.villainUI && XY.villainUI.artCard) XY.villainUI.artCard(c, W / 2 - 260, H / 2 - 150, 520, 300, { seed: 4, paper: '#f6edd8', edge: '#2a2118' });
    else panel(c, W / 2 - 250, H / 2 - 130, 500, 260, 18, 'rgba(255,255,255,0.98)', '#c0392b');
    var jr = app.confirm && app.confirm.kind === 'journey';
    var title = jr ? '确定要重新开始取经吗？' : '确定要重置存档吗？';
    c.save(); c.font = '34px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#3a2416'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (c.measureText(title).width > 460) c.font = Math.max(22, Math.floor(34 * 460 / c.measureText(title).width)) + 'px "Ma Shan Zheng","KaiTi",serif';
    c.fillText(title, W / 2, H / 2 - 92); c.restore();
    lines(c, jr ? ['全队等级、技能和特殊角色的进度会清零。', '这一路带上的法宝也会清掉。', '关卡回到第 1 关。', '法宝收藏、灵石、角色卡和图鉴都保留。'] : ['收藏的法宝、卡组、图鉴、解锁和皮肤都会清空。', '回到新手状态，而且无法恢复。'], W / 2 - 210, H / 2 - 48, 16, 22, T.ink, 420);
    var VU = XY.villainUI, x1 = W / 2 - 215, x2 = W / 2 + 15, by = H / 2 + 50, bw = 200, bh = 52;
    var yes = (app.confirm && app.confirm.kind === 'journey') ? '确定重来' : '确定清空';
    if (VU && VU.drawBrush) VU.drawBrush(c, x1, by, bw, bh, '取消', { sz: 18, vh: 34, strong: true });
    if (VU && VU.drawSeal) VU.drawSeal(c, x2, by, bw, bh, yes, { style: 'solid', sz: 18, stack: false, rot: -0.03 });
    ui.hits.push({ x: x1, y: by, w: bw, h: bh, act: 'confirmNo' });
    ui.hits.push({ x: x2, y: by, w: bw, h: bh, act: 'confirmYes' });
  }

  XY.previewDef = previewDef;
  XY.dexH = { enemyIcon: drawEnemyIcon, synName: synName, synElem: synElem, lines: lines };
  XY.screens = {
    draw: function (c, G, app) {
      var s = app.screen;
      if (s === 'start') drawMenu(c, G, app); else if (s === 'deck') drawDeck(c, G, app); else if (s === 'dex') drawDex(c, G, app); else if (s === 'unlock') drawUnlock(c, G, app);
      if (app.confirm) drawConfirm(c, app);
    }
  };
})();
