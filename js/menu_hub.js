/* ============================================================
 * menu_hub.js —— v0.9 「更多」二级页（洞府阁）：首页只留「开始取经」；「更多」朱红印在「出发」页（depart.js），点开进这里
 *  screen = 'hub'；入口：出发页「更多」红印（act 'menuHub'）；Esc / 「返回」回出发页（main.js app.retStack）。
 *  两组：修行（卡牌组牌 / 灵石商店 / 图鉴 / 解锁皮肤 / 自建角色）· 杂务（导入玩法 / 玩法速览 / 新手教程 / 版本 / 重置存档）。
 *  按钮是毛笔墨条（长短、起笔位置各不同）+ 朱红印章，不是一列同样的框；每个点击框 ≥ 44 CSS px。
 *  按钮的 act 全部沿用原来的（menuDeck / menuShop / menuDex / menuUnlock / xchar / menuDungeon / menuBoss / menuVillain / menuBoard / menuMods / menuTutorial / toggleVer / menuReset），
 *  所以点它们的处理逻辑一个字没改，只是挪了位置；Boss 战 / 反派模式仍按 XY.chain09.visible（全开开关 + 解锁链）决定出不出现。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, VU = XY.villainUI, IP = XY.INKP, M = XY.menu, R = XY.R, S = XY.save;
  var INK = '#3a3226', SOFT = '#6d6455', RED = '#b8322a';
  var HUB = XY.hubUI = { how: false, howTab: 0, geo: null };
  function app() { return window.__xy.app; }
  HUB.open = function () { var w = window.__xy; if (!w) return false; HUB.how = false; w.app.screen = 'hub'; return true; };
  HUB.close = function () { var w = window.__xy; HUB.how = false; if (w && w.toMenu) w.toMenu(); };

  function groups() {
    var nx = XY.xchar ? XY.xchar.list.length : 0;
    var cloudBtn = (XY.account && XY.account.signedIn && XY.account.signedIn()) ? ['退出登录', 'cloudLogout', 0] : ['用 Google 登录', 'cloudLogin', 1];
    /* 洞府副本 / Boss 战 / 反派模式 / 排行榜（原「出征」组）已搬到「出发」页（depart.js）：这里只剩修行 + 杂务 */
    /* 第三项：0 淡赭墨条 · 1 浓墨条 · 2 朱红浓条 · 3 淡朱墨条 · 9 朱砂细边印（危险） */
    return [
      { name: '修行', col: '#b8322a', items: [['卡牌组牌', 'menuDeck', 1], ['灵石商店', 'menuShop', 0], ['图鉴', 'menuDex', 0], ['解锁皮肤', 'menuUnlock', 0], [nx ? '自建角色 ' + nx + '/' + XY.xchar.MAX : '自建角色', 'xchar', 0]] },
      { name: '杂务', col: '#7a4a32', items: [cloudBtn, ['导入玩法', 'menuMods', 0], ['玩法速览', 'hubHow', 0], ['新手教程', 'menuTutorial', 0], ['引路码', 'refOpen', 3], (XY.version && XY.version.showToggle && XY.version.showToggle() ? ['版本：' + XY.version.name() + ' ⇄', 'toggleVer', 1] : null), ['重置存档', 'menuReset', 9]].filter(function (it) { return it; }) }
    ];
  }
  var RGB = ['150,108,62', '58,50,38', '184,50,42', '168,70,52'], YJ = [0, 3, 1, 4, 2], XJ = [0, 6, 2, 8, 4];
  var imgs = {};
  function pic(key, src) {
    var i = imgs[key];
    if (!i) { var inl = window.XY_MENU_V5; i = imgs[key] = new Image(); i.src = (inl && inl[key]) || src; }
    return i.complete && i.naturalWidth > 0 ? i : null;
  }
  function textW(c, s, sz) { c.font = R.font(sz, true); return c.measureText(String(s)).width; }
  /* 一组一行流：行首朱红组印，后面墨条按字数定宽、略错落；放不下换行（换行后缩进到印章右边）。返回 { h, put(offset) } */
  function flowGroup(c, g, x, y, w, k, pitch, sealW) {
    var bx0 = x + sealW + 10, bw = w - sealW - 10, out = [], i;
    for (i = 0; i < g.items.length; i++) out.push({ it: g.items[i], x: bx0, w: bw, line: i, y: y + i * pitch });
    return { h: Math.max(pitch, g.items.length * pitch), items: out };
  }
  function drawBtn(c, st, o, k, geo) {
    var it = o.it, sz = Math.round(16 * k), hh = Math.max(44, Math.round(44 * Math.min(k, 1.15)));
    if (it[2] === 9) st.btn(o.x, o.y, o.w, hh, it[0], it[1], { seal: true, col: '#b8322a', sz: sz - 1, rot: -0.02, stack: false });
    else st.btn(o.x, o.y, o.w, hh, it[0], it[1], { rgb: RGB[it[2]], sz: sz, strong: it[2] === 1 || it[2] === 2, vh: Math.round(36 * Math.min(k, 1.15)) });
    geo.btns.push({ act: it[1], x: o.x, y: o.y, w: o.w, h: hh }); geo.bottom = Math.max(geo.bottom, o.y + hh);
  }
  function poster(c, st, land) {
    var cw = st.cw, ch = st.ch, bg = pic(land ? 'bg_v2' : 'bg_v2p', 'assets/art/menu-v5/' + (land ? 'bg_v2' : 'bg_v2p') + '.webp');
    VU.paperBg(c, st, { rgb: '201,162,74', rgb2: '184,50,42', seed: 14 });
    if (bg) { var sc = Math.max(cw / bg.naturalWidth, ch / bg.naturalHeight), w = bg.naturalWidth * sc, h = bg.naturalHeight * sc; c.save(); c.globalAlpha = 0.5; c.drawImage(bg, (cw - w) / 2, (ch - h) / 2, w, h); c.restore(); }
    var g = c.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, 'rgba(250,244,228,0.55)'); g.addColorStop(1, 'rgba(244,234,208,0.35)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
  }
  function figure(c, bx, by, bw, bh, alpha) {                 // 唐僧立绘，贴着区域底、居中；上缘不超出
    var f = pic('fig_tang_color', 'assets/art/menu-v5/fig_tang.webp'); if (!f) return;
    var sc = Math.min(bh / f.naturalHeight, bw / f.naturalWidth * 1.25), w = f.naturalWidth * sc, h = f.naturalHeight * sc;
    c.save(); c.globalAlpha = alpha; c.drawImage(f, bx + (bw - w) / 2, by + bh - h, w, h); c.restore();
  }

  HUB.draw = function (c, G, a) {
    var st = VU.begin(c, a), cw = st.cw, ch = st.ch, land = cw >= 600 && cw > ch * 1.1, gs = groups(), narrow = cw < 520;
    poster(c, st, land);
    var geo = HUB.geo = { land: land, btns: [], bottom: 0 }, k = land ? Math.max(1, Math.min(1.3, ch / 400)) : 1, top = 60, i, y, fw = 0;
    var x0 = 10; st.btn(x0, 6, 76, 44, '返回', 'hubBack', { back: true }); x0 += 86;
    if (!narrow) { VU.seal(c, x0, 11, 34, 34, '阁', RED, 20); x0 += 42; }
    var tw = cw - x0 - 12;
    if (!narrow) { VU.txt(c, '洞府阁', x0, 24, 26, INK, 'left', true, tw); VU.brush(c, x0, 36, Math.min(tw, 100), 4, 0.26, 9); }
    if (!narrow) VU.txt(c, '诸般入口', x0, 48, 12.5, SOFT, 'left', false, tw);
    var sealW = Math.round(46 * Math.min(k, 1.15)), pitch, lay, tot, mg = 14, gapG;
    if (land) {
      // 左边留给立绘；右边印章 + 墨条流。放不下就先压行距，再窄立绘
      var tries = [[Math.round(cw * 0.27), 52], [Math.round(cw * 0.27), 47], [Math.round(cw * 0.22), 47], [Math.round(cw * 0.16), 46]], t;
      for (t = 0; t < tries.length; t++) {
        fw = tries[t][0]; pitch = Math.round(tries[t][1] * Math.min(k, 1.2)); gapG = 12;
        var rx = fw + 8, rw = cw - rx - mg; y = top; tot = 0; lay = gs.map(function (g) { var r = flowGroup(c, g, rx, 0, rw, k, pitch, sealW); tot += Math.max(r.h, sealW + 8) + gapG; return r; });
        if (top + tot - gapG <= ch - 6) break;
      }
      var left = ch - 6 - top - (tot - gapG), extra = Math.max(0, Math.min(64, left / 3));
      figure(c, 0, top - 6, fw + 20, ch - top + 6, 0.96);
      var pv = c.createLinearGradient(fw - 10, 0, fw + 60, 0); pv.addColorStop(0, 'rgba(248,240,220,0)'); pv.addColorStop(1, 'rgba(248,240,220,0.55)'); c.fillStyle = pv; c.fillRect(fw - 10, top - 4, cw - fw + 10, ch - top + 4);
      y = top + extra * 0.8;
      gs.forEach(function (g, gi) {
        var r = flowGroup(c, g, rx, y, rw, k, pitch, sealW);
        VU.seal(c, rx, y + 2, sealW, Math.round(sealW * 1.2), g.name, g.col, Math.round(17 * Math.min(k, 1.15)));
        r.items.forEach(function (o) { drawBtn(c, st, o, k, geo); });
        y += Math.max(r.h, Math.round(sealW * 1.2) + 8) + gapG + extra;
      });
    } else {
      // 竖屏：上半是立绘海报条，下面三组印章墨条
      var avail = ch - top, posterH = Math.max(120, Math.min(250, Math.round(avail * 0.3)));
      pitch = 56; gapG = 16; sealW = 44; var rw2 = cw - 2 * mg;
      var need = function (p) { var s = 0; gs.forEach(function (g) { s += Math.max(flowGroup(c, g, 0, 0, rw2, 1, p, sealW).h, 60) + gapG; }); return s; };
      while (pitch > 46 && top + posterH + need(pitch) > ch - 8) pitch--;
      while (posterH > 90 && top + posterH + need(pitch) > ch - 8) posterH -= 6;
      figure(c, cw - posterH * 0.9 - 4, top - 8, posterH * 0.85, posterH + 6, 0.96);
      var pv2 = c.createLinearGradient(0, top + posterH - 24, 0, top + posterH + 4); pv2.addColorStop(0, 'rgba(248,240,220,0)'); pv2.addColorStop(1, 'rgba(248,240,220,0.5)'); c.fillStyle = pv2; c.fillRect(0, top + posterH - 24, cw, 28);
      VU.seal(c, mg + 8, top + posterH * 0.12, 30, 30, '阁', RED, 18); VU.txt(c, '洞府阁', mg + 6, top + posterH * 0.42 + 8, Math.min(44, posterH * 0.28), INK, 'left', true, cw * 0.56); VU.brush(c, mg + 6, top + posterH * 0.42 + 22, Math.min(cw * 0.4, 150), 5, 0.3, 12);
      VU.txt(c, '再启一程', mg + 8, top + posterH * 0.42 + 48, 14, SOFT, 'left', false, cw * 0.46);
      var spare = Math.max(0, ch - 8 - top - posterH - need(pitch)), ex = Math.min(14, spare / 4); y = top + posterH + ex;
      gs.forEach(function (g) {
        var r = flowGroup(c, g, mg, y, rw2, 1, pitch, sealW);
        VU.seal(c, mg, y + 2, sealW, Math.round(sealW * 1.2), g.name, g.col, 17);
        r.items.forEach(function (o) { drawBtn(c, st, o, 1, geo); });
        y += Math.max(r.h, 60) + gapG + ex * 0.5;
      });
    }
    var mm = a.menuMsg; if (mm && a.rt < mm.until) { var vm = VU.msg; VU.msg = { text: mm.text, bad: !!mm.bad, until: mm.until }; VU.toast(c, st, a, ch - 40); VU.msg = vm; }
    if (XY.account && XY.account.paintHub) XY.account.paintHub(c, st);
    if (HUB.how) drawHow(c, st);
    if (XY.account && XY.account.paintModal) XY.account.paintModal(c, st, a);
    st.end();
  };
  function drawHow(c, st) {
    var cw = st.cw, ch = st.ch, bw = Math.min(cw - 24, 560), bh = Math.min(ch - 16, 230), bx = (cw - bw) / 2, by = Math.max(8, (ch - bh) / 2), i;
    st.hit(0, 0, cw, ch, 'hubNoop'); c.save(); c.fillStyle = 'rgba(58,50,38,0.34)'; c.fillRect(0, 0, cw, ch); c.restore();
    st.hit(bx, by, bw, bh, 'hubNoop');
    VU.artCard(c, bx, by, bw, bh, { seed: 23, paper: '#fffaf0' });
    VU.txt(c, '玩法速览', bx + 22, by + 30, 19, INK, 'left', true, bw - 44); VU.brush(c, bx + 22, by + 44, 80, 3.5, 0.28, 5);
    var tabW = Math.min(92, Math.floor((bw - 44 - 16) / 3));
    for (i = 0; i < 3; i++) st.btn(bx + 22 + i * (tabW + 8), by + 54, tabW, 44, M.HOW[i][0], 'hubHowTab', { id: i, pri: HUB.howTab === i, col: RED, sz: 16, stack: false });
    VU.wrap(c, M.HOW[HUB.howTab][1], bx + 22, by + 118, bw - 44, 21, 14.5, INK, false, 4);
    st.btn(bx + bw - 22 - 100, by + bh - 56, 100, 44, '好', 'hubHowClose', { pri: true, col: RED, sz: 17 });
    VU.txt(c, '操作键位在战斗中按 H / Tab 打开「菜单」查看', bx + 22, by + bh - 32, 12, SOFT, 'left', false, bw - 150);
  }

  var oldDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, a) {
    if (a.screen === 'hub') { HUB.draw(c, G, a); if (a.confirm) oldDraw(c, G, { screen: '__none', confirm: a.confirm, lw: a.lw, lh: a.lh, mouse: a.mouse, rt: a.rt }); }
    else oldDraw(c, G, a);
  };
  HUB.act = function (h, p, a) {
    switch (h.act) {
      case 'menuHub': HUB.open(); return true;
      case 'hubBack': HUB.close(); return true;
      case 'hubHow': HUB.how = true; return true;
      case 'hubHowTab': HUB.howTab = h.id; return true;
      case 'hubHowClose': HUB.how = false; return true;
      case 'hubNoop': return true;
    }
    return false;
  };
  HUB.key = function (k, a) {
    if (a.screen !== 'hub') return false;
    if (k === 'Escape') { if (a.confirm) a.confirm = null; else if (HUB.how) HUB.how = false; else HUB.close(); return true; }
    // 修行 / 杂务这一页的回车不学习、不扣技能点、不开新局。重看教程用「新手教程」按钮（menuTutorial）。
    if (k === 'Enter' || k === 'NumpadEnter') return true;
    return true;
  };
})();
