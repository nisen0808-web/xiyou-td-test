/* ============================================================
 * menu.js —— v0.7：主菜单重做（浅色水墨西游风）
 *   · 标题：楷体 / 宋体系统字 + 朱红印章「X」，全是真字体，没有 AI 画字
 *   · 5 张英雄卡：Q 版立绘 + 名字 > 大招 > 武器 > 定位 的层级
 *   · 玩法速览：可折叠、三个页签（走位 / 洞府 / 输赢），不再是一大段字
 *   · 主按钮（开始取经）最醒目；四个入口等宽等距；底栏一行排开：版本开关 / 副本模式 / 新手教程 / 重置存档
 *   · 动效：云雾慢飘 + 立绘呼吸 + 悬停抬起；远山只画一次进离屏画布，每帧只有几块云
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, T = R.T, S = XY.save, ui = XY.ui, PI2 = Math.PI * 2;
  var KAI = '"STKaiti","KaiTi","KaiTi_GB2312","楷体","Songti SC","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif';
  var M = XY.menu = { KAI: KAI, how: { open: null, tab: 0 } };
  var INK = '#2b1c08', RED = '#c8341f', GOLD = '#d9a21a';

  function hit(x, y, w, h, act, extra) { var o = { x: x, y: y, w: w, h: h, act: act }, k; if (extra) for (k in extra) o[k] = extra[k]; ui.hits.push(o); return o; }
  function over(app, x, y, w, h) { return app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h; }
  function font(sz, bold, fam) { return (bold ? 'bold ' : '') + sz + 'px ' + (fam || XY.C.FONT); }
  function text(c, s, x, y, sz, col, al, bold, fam, ls) {
    c.font = font(sz, bold, fam); c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle';
    if ('letterSpacing' in c) c.letterSpacing = ls ? ls + 'px' : '0px';
    c.fillText(XY.fmtStr(s), ls && al === 'center' ? x + ls / 2 : x, y);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
  }
  function pill(c, x, y, w, h, fill, stroke) { R.rrect(c, x, y, w, h, h / 2); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 1.2; c.strokeStyle = stroke; c.stroke(); } }

  /* ---------- 背景：纸色渐变 + 远山（离屏，只画一次）+ 慢飘的云 ---------- */
  var bgc = null;
  function ridge(o, W, H, base, amp, seed, col0, col1) {
    var p = new Path2D(), x, y, ph = seed * 1.7;
    p.moveTo(0, H);
    for (x = 0; x <= W + 8; x += 8) { y = base - amp * (0.55 * Math.sin(x / 190 + ph) + 0.3 * Math.sin(x / 83 + ph * 2.3) + 0.15 * Math.sin(x / 41 + ph * 3.1) + 0.5); p.lineTo(x, y); }
    p.lineTo(W, H); p.closePath();
    var g = o.createLinearGradient(0, base - amp, 0, H); g.addColorStop(0, col0); g.addColorStop(1, col1); o.fillStyle = g; o.fill(p);
  }
  function backdrop(c, app) {
    var W = app.lw, H = app.lh, rt = app.rt, key = Math.round(W) + 'x' + Math.round(H);
    if (!bgc || bgc.key !== key) {
      var cv = document.createElement('canvas'); cv.width = Math.ceil(W); cv.height = Math.ceil(H); var o = cv.getContext('2d');
      var g = o.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fdf9ee'); g.addColorStop(0.6, '#f7efd9'); g.addColorStop(1, '#efe4c8'); o.fillStyle = g; o.fillRect(0, 0, W, H);
      var sun = o.createRadialGradient(W * 0.78, H * 0.2, 4, W * 0.78, H * 0.2, H * 0.22); sun.addColorStop(0, 'rgba(236,120,80,0.30)'); sun.addColorStop(1, 'rgba(236,120,80,0)'); o.fillStyle = sun; o.fillRect(0, 0, W, H);
      ridge(o, W, H, H * 0.62, 90, 1, 'rgba(120,138,130,0.20)', 'rgba(120,138,130,0.04)');
      ridge(o, W, H, H * 0.74, 70, 2, 'rgba(84,104,98,0.26)', 'rgba(84,104,98,0.06)');
      ridge(o, W, H, H * 0.86, 48, 3, 'rgba(56,76,70,0.30)', 'rgba(56,76,70,0.08)');
      bgc = { key: key, cv: cv };
    }
    c.drawImage(bgc.cv, 0, 0, W, H);
    // 云：5 团，横向慢飘并循环
    for (var i = 0; i < 5; i++) {
      var sp = 6 + i * 2.5, cw = 260 + i * 70, x = ((rt * sp + i * 420) % (W + cw * 2)) - cw, y = H * (0.12 + 0.15 * i % 0.7) + Math.sin(rt * 0.2 + i) * 6;
      var g2 = c.createRadialGradient(x, y, 4, x, y, cw * 0.5); g2.addColorStop(0, 'rgba(255,255,255,0.55)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.translate(x, y); c.scale(1, 0.32); c.translate(-x, -y); c.fillStyle = g2; c.beginPath(); c.arc(x, y, cw * 0.5, 0, PI2); c.fill(); c.restore();
    }
  }

  /* ---------- 标题：海报主标题「西游」楷体墨字 + 金边 + 朱红印章 X ---------- */
  M.title = function (c, cx, cy, size, rt) {
    var w1 = size * 2.15, seed = size * 0.88, gap = size * 0.2, total = w1 + gap + seed, x0 = cx - total / 2;
    /* 金边：先描一圈暖金再写墨字，电影海报标题感（浅色底，不是暗金） */
    c.save();
    c.shadowColor = 'rgba(180,120,40,0.35)'; c.shadowBlur = size * 0.22; c.shadowOffsetY = size * 0.05;
    text(c, '西游', x0, cy, size, '#c9a24a', 'left', true, KAI, size * 0.06);
    c.shadowColor = 'transparent'; c.shadowBlur = 0;
    text(c, '西游', x0 - size * 0.012, cy - size * 0.01, size, '#e8d090', 'left', true, KAI, size * 0.06);
    text(c, '西游', x0, cy, size, INK, 'left', true, KAI, size * 0.06);
    c.restore();
    var sx = x0 + w1 + gap, sy = cy - seed / 2;
    c.save(); c.translate(sx + seed / 2, sy + seed / 2); c.rotate(-0.06);
    c.shadowColor = 'rgba(180,40,20,0.35)'; c.shadowBlur = seed * 0.25;
    R.rrect(c, -seed / 2, -seed / 2, seed, seed, seed * 0.12); c.fillStyle = RED; c.fill(); c.shadowColor = 'transparent';
    c.lineWidth = Math.max(1.6, seed * 0.045); c.strokeStyle = 'rgba(255,220,140,0.85)'; R.rrect(c, -seed / 2 + seed * 0.07, -seed / 2 + seed * 0.07, seed * 0.86, seed * 0.86, seed * 0.07); c.stroke();
    text(c, 'X', 0, seed * 0.02, seed * 0.74, '#fff6e6', 'center', true, KAI);
    c.restore();
    return { x0: x0, total: total };
  };
  function ornament(c, cx, y, w) {
    c.strokeStyle = 'rgba(160,120,40,0.55)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - w / 2, y); c.lineTo(cx - 14, y); c.moveTo(cx + 14, y); c.lineTo(cx + w / 2, y); c.stroke();
    c.fillStyle = GOLD; c.save(); c.translate(cx, y); c.rotate(Math.PI / 4); c.fillRect(-4.5, -4.5, 9, 9); c.restore();
  }

  // 子页面标题（出发 等）：楷体墨字 + 朱红短横；画完后 c.font 留在标题字体上（调用方用 measureText 量宽度）
  M.pageTitle = function (c, s, x, y) {
    text(c, s, x, y, 32, INK, 'left', true, KAI, 3);
    c.font = font(32, true, KAI); if ('letterSpacing' in c) c.letterSpacing = '3px'; var w = c.measureText(s).width; if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.fillStyle = RED; R.rrect(c, x, y + 27, Math.min(46, w), 4, 2); c.fill();
  };

  /* ---------- 版本 / 全开开关（菜单、选关页、组牌页共用）：小药丸 + 滑块 ---------- */
  M.verSwitch = function (c, app, x, y, w, h) {
    if (XY.version && XY.version.showToggle && !XY.version.showToggle()) return;
    var test = XY.TEST_BUILD, hov = over(app, x, y, w, h), flash = app.verFlash && app.rt < app.verFlash, kr = h / 2 - 4;
    c.save();
    if (hov || flash) { c.shadowColor = test ? 'rgba(74,127,201,0.45)' : 'rgba(67,160,71,0.45)'; c.shadowBlur = 10; }
    pill(c, x, y, w, h, flash ? '#fff4c4' : (test ? '#eaf2ff' : '#ecf7e8'), test ? '#7aa3dc' : '#7cc47f'); c.restore();
    var tx = x + h * 0.55, ty = y + h / 2;
    var tw = h * 1.5; pill(c, tx, ty - h * 0.2, tw, h * 0.4, test ? '#4a7fc9' : '#b9c7b5'); c.fillStyle = '#fff'; c.beginPath(); c.arc(test ? tx + tw - h * 0.2 : tx + h * 0.2, ty, h * 0.26, 0, PI2); c.fill();
    text(c, XY.version.name(), tx + tw + 10, y + h * 0.4, Math.round(h * 0.37), INK, 'left', true);
    if (h >= 40) text(c, '点击切换为' + XY.version.name(test ? 'std' : 'test'), tx + tw + 10, y + h * 0.74, Math.round(h * 0.26), T.inkSoft, 'left', false);
    hit(x, y, w, h, 'toggleVer');
  };

  /* ---------- 主菜单 ---------- */
  var HOW = [
    ['走位', 'WASD / 鼠标（按住左键跟随、单击设目的地）只管走位，技能自动放；1–6 切换操控的英雄，其他人听命令。'],
    ['洞府', '妖怪都从洞府出来，BOSS 不倒就一直出；怪每分钟 +1%，BOSS 每分钟 +5%；唐僧驻守营地会让出怪量越来越多。'],
    ['输赢', '完成本关主线并让唐僧亲自走进西边关口才过关；营地被攻破、或唐僧被碰到 / 打中（他只有 1 点血）就输；阵亡的徒弟不复活。']
  ];
  M.HOW = HOW;
  function wrapLines(c, s, maxW) { var out = [], line = '', i; for (i = 0; i < s.length; i++) { var t = line + s[i]; if (c.measureText(t).width > maxW && line) { out.push(line); line = s[i]; } else line = t; } out.push(line); return out; }

  /* ---------- 玩法速览小卡（主菜单各版式共用；geom.btn 是锚点按钮） ---------- */
  M.drawHow = function (c, app, geom, cx, cwid) {
    var i;
    if (M.how.open) {
      var pw = Math.min(760, cwid - 20), ph2 = 108, px = cx - pw / 2, py = geom.btn.y - ph2 - 8;
      c.save(); c.shadowColor = 'rgba(60,40,10,0.28)'; c.shadowBlur = 18; c.shadowOffsetY = 6; R.rrect(c, px, py, pw, ph2, 12); c.fillStyle = 'rgba(255,252,240,0.98)'; c.fill(); c.restore();
      c.lineWidth = 1.4; c.strokeStyle = '#cdbb8a'; R.rrect(c, px, py, pw, ph2, 12); c.stroke();
      text(c, '玩法速览', px + 16, py + 17, 14, '#8a5a0b', 'left', true);
      for (i = 0; i < HOW.length; i++) {
        var on = M.how.tab === i, tw2 = 62, tx2 = px + 110 + i * (tw2 + 8), hv3 = over(app, tx2, py + 6, tw2, 22);
        pill(c, tx2, py + 6, tw2, 22, on ? RED : (hv3 ? '#f6ead0' : '#f3ecd9'), on ? null : '#d9cba3');
        text(c, HOW[i][0], tx2 + tw2 / 2, py + 17.5, 13, on ? '#fff6e6' : '#6b5a37', 'center', true);
        hit(tx2, py + 6, tw2, 22, 'menuTab', { i: i });
      }
      text(c, '操作键位在战斗中按 H / Tab 打开「菜单」查看', px + pw - 16, py + 17, 12, '#8a7d63', 'right', false);
      c.font = font(14, false); var ls = wrapLines(c, HOW[M.how.tab][1], pw - 40);
      ls.slice(0, 3).forEach(function (l, k) { text(c, l, px + 20, py + 52 + k * 21, 14, INK, 'left', false); });
      geom.howPanel = { x: px, y: py, w: pw, h: ph2 };
    } else geom.howPanel = null;
  };
  M.u = { hit: hit, over: over, font: font, text: text, pill: pill, ornament: ornament, wrapLines: wrapLines, INK: INK, RED: RED, GOLD: GOLD };

  /* ---------- 首页重排：好莱坞海报群像（menu_stage 默认），去掉卡片框；下面只留 1–2 排小水墨按钮，存档统计缩成一行小字 ---------- */
  M.draw = function (c, G, app) {
    var W = app.lw, H = app.lh, rt = app.rt, i, stacked = W < 900 || W < H * 1.05;
    if (M.how.open === null) M.how.open = false;
    /* 默认主菜单 = menu_v5 的 V2「电影海报」（桌面 / 手机横屏 / 手机竖屏自适应）。?menu=H4 回旧的 menu_stage 好莱坞群像，?menu=B 回更旧的 menu_poster；
       ?menu=V1/V3/V4 是版式实验（只有源码版带背景，打包版回落到 V2）。旧路径文件都还留着，没删 */
    var qs = (typeof location !== 'undefined' && location.search) || '', v5 = /[?&]menu=V([1-4])/.exec(qs);
    if (XY.menuV5 && !/[?&]menu=(H4|B)\b/.test(qs)) { XY.menuV5.draw(c, G, app, v5 ? +v5[1] : 2); return; }
    backdrop(c, app);
    var cwid = Math.min(1240, W - (stacked ? 16 : 40)), cx = W / 2, x0 = cx - cwid / 2, geom = M.geom = { cards: [], sp: [], ents: [], title: null };
    // ---- 底部：开始按钮 + 小水墨按钮（1–2 排） + 一行存档小字 ----
    var un = XY.UNLOCKS.filter(function (u) { return S.data.unlocks[u.id]; }).length;
    var btns = [
      ['卡牌组牌', 'menuDeck', '#d9a21a'], ['灵石商店', 'menuShop', '#2d9aa6'], ['图鉴', 'menuDex', '#7a5bb5'], ['解锁皮肤', 'menuUnlock', '#c8341f'], ['玩法速览', 'menuHow', '#8a5a0b'],
      ['@ver'], ['洞府副本', 'menuDungeon', '#2f8a62'], ['新手教程', 'menuTutorial', INK], ['重置存档', 'menuReset', RED]
    ];
    var sbh = 30, sgap = 8, pad = 26, bw0 = [], tot = 0;
    c.font = font(14, true);
    btns.forEach(function (b, k) { var w = b[0] === '@ver' ? 168 : Math.ceil(c.measureText(b[0]).width) + pad; bw0.push(w); tot += w; });
    var rowsB = [[]], rowW = 0;
    btns.forEach(function (b, k) { if (rowW + bw0[k] + (rowsB[rowsB.length - 1].length ? sgap : 0) > cwid && rowsB[rowsB.length - 1].length) { rowsB.push([]); rowW = 0; } rowsB[rowsB.length - 1].push(k); rowW += bw0[k] + (rowW ? sgap : 0); });
    var sbh2 = rowsB.length * sbh + (rowsB.length - 1) * 8, stH = 15, stbh = 52;
    var bottomH = stbh + 10 + sbh2 + 8 + stH + 10, titleH = stacked ? 78 : 112;
    var areaY = titleH, areaH = Math.max(120, H - titleH - bottomH - 6), areaTop = areaY;
    geom.title = { x: cx - 320, y: 0, w: 640, h: titleH - 4 };
    M.title(c, cx, stacked ? 36 : 46, stacked ? 48 : 66, rt);
    if (!stacked) {
      ornament(c, cx, 86, Math.min(480, cwid * 0.42));
      text(c, '取经路上一关一关闯：打掉洞府 BOSS，断掉妖怪的来路，护送唐僧走到西边关口', cx, 102, 11.5, T.inkSoft, 'center', false, null, 1.2);
    }
    // ---- 人物区：默认好莱坞海报引擎 menu_stage；?menu=B 才用旧 menu_poster（文件保留，默认不跑）----
    var sps = XY.SPECIALS.filter(function (d) { return !XY.isHidden || !XY.isHidden(d.id); }).slice(0, 9);
    function tipOf(id) {
      var d = null, k; for (k = 0; k < 5; k++) if (XY.heroDef(k).id === id) d = XY.heroDef(k);
      for (k = 0; k < sps.length; k++) if (sps[k].id === id) d = sps[k];
      if (!d || !d.ult) return '';
      var rl = XY.HERO_ROLE && (XY.HERO_ROLE[d.id] || (d.variant && XY.HERO_ROLE[d.variant]));
      return XY.fmtStr(d.name + (d.handle ? ' ' + d.handle : '') + ' · 大招 ' + d.ult + (d.weapon ? ' · ' + d.weapon : '') + (rl ? ' · ' + rl.name : ''));
    }
    var usePoster = /[?&]menu=B/.test((typeof location !== 'undefined' && location.search) || '') && XY.menuPoster;
    var pg = (usePoster ? XY.menuPoster : XY.menuStage).draw(c, app, areaY, areaH, stacked, tipOf);
    geom.cards = pg.cards; geom.sp = pg.sp; geom.poster = pg;
    // ---- 开始取经 ----
    var by = areaY + areaH + 4, bw = Math.min(380, cwid * 0.6), bx = cx - bw / 2, ph = over(app, bx, by, bw, stbh), pulse = 0.5 + 0.5 * Math.sin(rt * 2.4);
    c.save(); c.shadowColor = 'rgba(200,52,31,' + (0.26 + 0.12 * pulse + (ph ? 0.2 : 0)).toFixed(2) + ')'; c.shadowBlur = 14 + 6 * pulse; c.shadowOffsetY = 4;
    c.translate(bx + bw / 2, by + stbh / 2 + (ph ? -2 : 0)); c.rotate(-0.015);
    c.fillStyle = ph ? '#c4472e' : '#a83224';
    c.beginPath(); c.moveTo(-bw / 2 + 4, -stbh * 0.36); c.lineTo(bw / 2, -stbh * 0.42); c.lineTo(bw / 2 - 6, stbh * 0.38); c.lineTo(-bw / 2 + 2, stbh * 0.34); c.closePath(); c.fill(); c.restore();
    text(c, '开始取经', cx, by + stbh * 0.39 + (ph ? -2 : 0), 24, '#fff8e8', 'center', true, KAI, 8);
    text(c, '护送唐僧走到关口', cx, by + stbh * 0.80 + (ph ? -2 : 0), 11.5, 'rgba(255,240,215,0.92)', 'center', false);
    hit(bx, by, bw, stbh, 'menuLevels'); geom.btn = { x: bx, y: by, w: bw, h: stbh };
    // ---- 小水墨按钮 ----
    var ry = by + stbh + 10;
    rowsB.forEach(function (row, ri) {
      var rw = 0; row.forEach(function (k) { rw += bw0[k]; }); rw += sgap * (row.length - 1);
      var x = cx - rw / 2, y = ry + ri * (sbh + 8);
      row.forEach(function (k) {
        var b = btns[k], w = bw0[k], hv = over(app, x, y, w, sbh);
        if (b[0] === '@ver') M.verSwitch(c, app, x, y, w, sbh);
        else {
          var dead = !b[1], col = b[2];
          pill(c, x, y + (hv && !dead ? -1 : 0), w, sbh, dead ? 'rgba(236,230,214,0.85)' : (hv ? '#fff3d6' : '#fffdf6'), dead ? '#d6cdb4' : (b[1] === 'menuReset' ? '#e0a49b' : '#cdbb8a'));
          if (!dead) { c.fillStyle = col; c.beginPath(); c.arc(x + 11, y + sbh / 2 + (hv ? -1 : 0), 2.6, 0, PI2); c.fill(); }
          text(c, b[0], x + w / 2 + (dead ? 0 : 5), y + sbh / 2 + 1 + (hv && !dead ? -1 : 0), 14, dead ? '#9a927c' : (b[1] === 'menuReset' ? RED : INK), 'center', true);
          if (b[1]) hit(x, y, w, sbh, b[1]);
          else if (hv) text(c, '副本（多人联机）开发中，暂不可用', cx, y - 12, 12.5, '#8a7d63', 'center', true);
        }
        if (b[1] === 'menuHow') geom.how = { x: x, y: y, w: w, h: sbh };
        geom.ents.push({ x: x, y: y, w: w, h: sbh }); x += w + sgap;
      });
    });
    // ---- 存档小字 ----
    var fy = ry + sbh2 + 8, st = S.data.stats, mm = app.menuMsg, spN = XY.SPECIALS.filter(function (d) { return S.spOwned(d.id); }).length;
    var line = (mm && app.rt < mm.until) ? mm.text : XY.fmtStr('存档（本机）：开局 ' + st.runs + ' 次 · 通关 ' + st.wins + ' 次 · 累计击杀 ' + st.kills + ' · 灵石 ' + S.data.lingshi + ' · 卡组 ' + S.data.deck.length + '/' + S.deckSlots() + ' · 已解锁 ' + un + '/' + XY.UNLOCKS.length) + (S.memoryOnly ? ' · ⚠ 浏览器不让存档，只在本页有效' : ' · 自动保存');
    text(c, line, cx, fy + 7, 11.5, mm && app.rt < mm.until ? (mm.bad ? '#b8300f' : '#2f7d3b') : '#8a7d63', 'center', !!(mm && app.rt < mm.until));
    text(c, 'v' + XY.VERSION, x0 + cwid, fy + 7, 11, '#9a8f73', 'right', false);
    geom.foot = { x: x0, y: ry, w: cwid, h: fy + stH - ry }; M.layout = { bottom: fy + stH, H: H };
    M.drawHow(c, app, geom, cx, cwid);
  };

  var old = XY.screens.draw;
  XY.screens.draw = function (c, G, app) {
    if (app.screen === 'start') {
      c.save(); M.draw(c, G, app); c.restore();
      if (app.confirm) old(c, G, { screen: '__none', confirm: app.confirm, lw: app.lw, lh: app.lh, mouse: app.mouse, rt: app.rt });
    } else old(c, G, app);
  };
})();
