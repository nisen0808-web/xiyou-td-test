/* ============================================================
 * board_ui.js —— v0.9 排行榜页面（浅色水墨：整张宣纸 + 一张榜卡，不是表格）
 *  screen = 'board'；入口：主菜单「排行榜」按钮（act 'menuBoard'），Esc / 「返回」回主菜单。
 *  布局：横屏 = 左边五张榜（朱印 / 墨条）+ 右边榜卡；竖屏 = 顶部榜名两行墨条 + 「用哪个 X」「样例」按钮 + 榜卡。
 *  每一行：名次 · 圆形 X 头像 · @handle（没绑 = 「未绑定」+ 本机昵称）· 一句说明 · 右边分数；「我」行淡金底，「样例」行淡一点并带标。
 *  数据全部来自 XY.board.list()（board.js）；这里只画、只点。头像按 URL 缓存，行表 1 秒才重算一次（不每帧排序）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, rrect = R.rrect, VU = XY.villainUI, B = XY.board, IP = XY.INKP, PI2 = Math.PI * 2;
  var INK = '#3a3226', SOFT = '#6d6455', GOLD = '#c9a24a', RED = '#b8322a';
  var BU = XY.boardUI = { pick: false, msg: null, _rows: null, _rowsAt: 0, _rowsKey: '', geo: null };
  function app() { return window.__xy.app; }

  /* ---------- 小工具 ---------- */
  var AV = {};
  function avImg(url) { var o = AV[url]; if (!o) { o = AV[url] = new Image(); o.src = url; } return o.complete && o.naturalWidth ? o : null; }
  /* 一行字放进 maxW：先缩到 minSz，还放不下就截断加省略号 */
  function fit(c, s, sz, maxW, minSz, bold) {
    s = String(s); c.font = R.font(sz, bold); var w = c.measureText(s).width;
    if (w <= maxW) return { s: s, sz: sz };
    var k = Math.max(minSz, sz * maxW / w - 0.2); c.font = R.font(k, bold); w = c.measureText(s).width;
    if (w <= maxW) return { s: s, sz: k };
    while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return { s: s + '…', sz: k };
  }
  function txtFit(c, s, x, y, sz, col, al, bold, maxW, minSz) { var f = fit(c, s, sz, maxW, minSz || 10, bold); R.txt(c, f.s, x, y, f.sz, col, al, bold); }
  function say(t, bad) { BU.msg = { text: t, bad: !!bad, until: app().rt + 3.2 }; }
  BU.say = say;
  function rows() {
    var b = B.data(), id = b.ui.tab, key = id + '|' + b.ui.samples + '|' + B.provider.name, now = performance.now();
    if (!BU._rows || BU._rowsKey !== key || now - BU._rowsAt > 1000) { BU._rows = B.list(id); BU._rowsAt = now; BU._rowsKey = key; }
    return BU._rows;
  }
  BU.dirty = function () { BU._rows = null; };

  /* ---------- 进出 ---------- */
  BU.open = function (tab) {
    var w = window.__xy; if (!w) return false; var a = w.app;
    B.refreshAll(); if (tab && B.BY[tab]) B.setTab(tab);
    BU.pick = false; BU.msg = null; BU.dirty(); a.screen = 'board'; return true;
  };
  BU.close = function () { var w = window.__xy; BU.pick = false; if (w && w.toMenu) w.toMenu(); };

  /* ---------- 画：圆形头像 ---------- */
  function avatar(c, cx, cy, r, url, o) {
    o = o || {};
    c.save(); c.fillStyle = 'rgba(58,50,38,0.10)'; c.beginPath(); c.arc(cx + 1.5, cy + 2.5, r + 1, 0, PI2); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, PI2); c.closePath(); c.fillStyle = '#efe6cf'; c.fill(); c.clip();
    var im = avImg(url);
    if (im) { var k = Math.max(2 * r / im.naturalWidth, 2 * r / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k; c.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh); }
    c.restore();
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, PI2); c.lineWidth = o.me ? 3 : 2; c.strokeStyle = o.me ? '#d4a02a' : 'rgba(58,50,38,0.55)'; c.stroke();
    if (o.me) { c.beginPath(); c.arc(cx, cy, r + 3, 0, PI2); c.lineWidth = 1; c.strokeStyle = 'rgba(184,50,42,0.55)'; c.stroke(); }
    c.restore();
  }
  function rankMark(c, cx, cy, n, h) {
    var col = n === 1 ? '#b8322a' : n === 2 ? '#7a6a47' : n === 3 ? '#9a6a30' : null;
    if (n == null) { R.txt(c, '—', cx, cy + 1, 15, 'rgba(58,50,38,0.4)', 'center', true); return; }
    if (col) { VU.drawSeal(c, cx - 15, cy - 15, 30, 30, String(n), { col: col, sz: 17, rot: -0.05 + n * 0.03, seed: 20 + n, stack: false }); }
    else R.txt(c, String(n), cx, cy + 1, n > 99 ? 13 : 17, SOFT, 'center', true);
  }

  /* ---------- 画：一行 ---------- */
  function drawRow(c, x, y, w, h, e, def, idx) {
    var cy = y + h / 2;
    if (e.me) {
      VU.washE(c,x+65,cy,150,h,'165,45,28',.14);
    } else if (idx > 0) IP.stroke(c, x + 14, y, x + w - 30, y + 1, 1.4, '120,108,88', 0.16, 60 + idx, 0.02);
    c.save(); if (e.sample) c.globalAlpha = 0.72;
    var rw = 38, ar = Math.max(17, Math.min(24, (h - 14) / 2)), ax = x + rw + ar + 4, tx = ax + ar + 11, sf0 = h >= 60 ? 21 : 19;
    rankMark(c, x + 22, cy, e.rank, h);
    avatar(c, ax, cy, ar, e.avatar, { me: e.me });
    c.font = R.font(sf0, true); var sw = Math.min(Math.max(48, Math.ceil(c.measureText(e.scoreText).width) + 6), Math.max(60, w * 0.26)), sx = x + w - 14, nameMax = sx - sw - 10 - tx;
    c.font = R.font(12, false); var wide = e.sub && c.measureText(e.sub).width > nameMax, l1 = e.bound ? '@' + e.handle : e.name, l1y = wide ? cy - 15 : e.sub ? cy - 10 : cy;
    var hasTag = e.me || e.sample || !e.bound, f = fit(c, l1, 15.5, Math.max(40, nameMax - (hasTag ? 52 : 0)), 11, true);
    R.txt(c, f.s, tx, l1y + 1, f.sz, INK, 'left', true);
    c.font = R.font(f.sz, true); var tw = c.measureText(f.s).width, tgx = tx + tw + 8, tgw = 44;
    if (tgx + (e.me ? 30 : tgw) <= sx - sw) {
      if (e.sample) VU.drawTag(c, tgx, l1y - 9, tgw, 19, '样例', '#8a7a58', { fill: 'rgba(240,232,210,0.95)', sz: 11.5, tc: '#6d6455', seed: 3 });
      else if (e.me) VU.drawTag(c, tgx, l1y - 9, 30, 19, '我', RED, { fill: 'rgba(255,238,232,0.98)', sz: 12, tc: RED, seed: 4 });
      else if (!e.bound) VU.drawTag(c, tgx, l1y - 9, tgw, 19, '未绑定', '#8a7a58', { fill: 'rgba(240,232,210,0.95)', sz: 11, tc: '#6d6455', seed: 5 });
    }
    if (e.sub) { if (wide) VU.wrap(c, e.sub, tx, cy + 3, nameMax, 14, 11.5, SOFT, false, 2); else txtFit(c, e.sub, tx, cy + 12, 12, SOFT, 'left', false, nameMax, 10); }
    var sfit = fit(c, e.scoreText, sf0, sw, 12, true);
    R.txt(c, sfit.s, sx, cy + 1, sfit.sz, e.score == null ? 'rgba(58,50,38,0.4)' : def.col, 'right', true);
    c.restore();
  }

  /* ---------- 画：整页 ---------- */
  BU.draw = function (c, G, a) {
    var st = VU.begin(c, a), cw = st.cw, ch = st.ch, land = cw >= 640 && cw > ch * 1.1, def = B.BY[B.data().ui.tab] || B.BOARDS[0], me = B.me();
    VU.paperBg(c, st, { rgb: '201,162,74', rgb2: '184,50,42', seed: 9 });
    /* 页头 */
    var narrow = cw < 520, x0 = 10;
    st.btn(x0, 6, 76, 44, '返回', 'bdBack', { back: true }); x0 += 86;
    if (!narrow) { VU.seal(c, x0, 11, 34, 34, '榜', RED, 20); x0 += 42; }
    var tw = cw - x0 - 12;
    VU.txt(c, '排行榜', x0, narrow ? 28 : 24, narrow ? 24 : 26, INK, 'left', true, tw);
    VU.brush(c, x0, narrow ? 42 : 36, Math.min(tw, 100), 4, 0.26, 7);
    if (!narrow) VU.txt(c, '本机榜 · 成绩存在这台设备上。还没有别人的成绩时这里是空的', x0, 48, 12.5, SOFT, 'left', false, tw);
    var top = 58, G2 = BU.geo = { land: land, tabs: [] }, i, cardX, cardY, cardW, cardH;
    var tabs = B.BOARDS, ctrlH = 0;
    if (land) {
      var lw = Math.max(168, Math.min(232, Math.round(cw * 0.24))), th = ch < 430 ? 44 : 50, tg = ch < 430 ? 5 : 9, jx = [0, 8, 2, 12, 5], jw = [0, 18, 6, 26, 12];
      for (i = 0; i < tabs.length; i++) {
        var ty = top + 8 + i * (th + tg), on = tabs[i].id === def.id, tx0 = 16 + jx[i], tww = lw - jw[i];
        VU.txt(c, tabs[i].tab, tx0 + 12, ty + th * 0.55, on ? 20 : 16, on ? RED : INK, 'left', true, tww - 16);
        if (on) VU.brush(c, tx0 + 12, ty + th - 8, Math.min(128, tww - 24), 3.2, 0.55, i + 4);
        st.hit(tx0, ty, tww, th, 'bdTab', { id: tabs[i].id });
        G2.tabs.push({ id: tabs[i].id, x: tx0, y: ty, w: tww, h: th });
      }
      var ly = top + 8 + tabs.length * (th + tg) + 6;
      if (ch - ly > 70) {
        var rk = B.myRank(def.id, { samples: false });
        R.txt(c, rk ? '我在本榜：第 ' + rk + ' 名' : '我在本榜：还没上榜', 16, ly + 14, 13.5, SOFT, 'left', true);
        VU.brush(c, 16, ly + 24, 90, 3, 0.2, 11);
      }
      cardX = 16 + lw + 22; cardY = top + 4; cardW = cw - cardX - 16; cardH = ch - cardY - 14;
    } else {
      var gx=12,gw=cw-24,ty0=top+2,th2=44,bw=gw/tabs.length;
      for(i=0;i<tabs.length;i++){var tx1=gx+i*bw,ty1=ty0+[3,0,4,1,5][i],on2=tabs[i].id===def.id;VU.txt(c,tabs[i].tab,tx1+bw/2,ty1+22,13,on2?RED:INK,'center',true,bw-4);if(on2)VU.brush(c,tx1+12,ty1+39,bw-24,3,.5,i+5);st.hit(tx1,ty1,bw-2,44,'bdTab',{id:tabs[i].id});G2.tabs.push({id:tabs[i].id,x:tx1,y:ty1,w:bw-2,h:44});}
      ctrlH=48;var cy2=ty0+52;
      var pw = Math.floor(gw * 0.58);
      st.btn(gx, cy2, pw, 44, '用哪个 X：' + (me.bound ? '@' + me.handle : '未绑定'), 'bdPick', { seal: true, col: '#7a6a47', sz: 14 });
      st.btn(gx + pw + 8, cy2, gw - pw - 8, 44, '样例：' + (B.samplesOn() ? '开' : '关'), 'bdSamples', { sz: 14 });
      cardX = 10; cardY = cy2 + 52; cardW = cw - 20; cardH = ch - cardY - 12;
    }
    /* 榜卡 */
    VU.washE(c,cardX+cardW*.75,cardY+60,cardW*.7,130,'153,117,58',.10);
    var px = cardX + 18, pwid = cardW - 36, hy = cardY + 14;
    VU.seal(c, px, hy, 30, 30, def.sealCh || def.name.charAt(0), def.col, 18);
    var ctrlW = land ? 214 : 0, tmax = pwid - 40 - ctrlW;
    VU.txt(c, def.name + '榜', px + 40, hy + 14, 20, INK, 'left', true, tmax);
    VU.brush(c, px + 40, hy + 28, Math.min(tmax, 92), 3.5, 0.28, 17, IP.rgb(def.col));
    var rh = VU.wrap(c, def.rule, px, hy + 52, land ? pwid - ctrlW - 6 : pwid, 16, 12.5, SOFT, false, land ? 2 : 3);
    if (land) {
      VU.txt(c, '用哪个', cardX + cardW - 70, hy + 16, 16, INK, 'center', true, 90);
      if (VU.brush) VU.brush(c, cardX + cardW - 108, hy + 30, 72, 2.4, 0.4, 8);
      st.hit(cardX + cardW - 118, hy - 6, 104, 44, 'bdPick');
      VU.txt(c, '样例' + (B.samplesOn() ? '开' : '关'), cardX + cardW - 196, hy + 16, 16, INK, 'center', true, 90);
      st.hit(cardX + cardW - 240, hy - 6, 100, 44, 'bdSamples');
      VU.txt(c, me.bound ? '榜上的我：@' + me.handle : '榜上的我：未绑定（本机昵称 ' + me.name + '）', cardX + cardW - 18, hy + 52, 12, SOFT, 'right', false, ctrlW + 40);
    }
    var ry = hy + 52 + rh + 6, avail = cardY + cardH - 12 - ry, list = rows(), rowH = ch >= 560 ? 62 : ch >= 420 ? 56 : 50, n = Math.floor(avail / rowH);
    var myI = 0; for (i = 0; i < list.length; i++) if (list[i].me) { myI = i; break; }
    if (n < 2) n = 2;
    if (list.length <= n || myI < n) list.slice(0, n).forEach(function (e, j) { drawRow(c, cardX + 10, ry + j * rowH, cardW - 20, rowH, e, def, j); });
    else {
      var n2 = Math.max(2, Math.floor((avail - 18) / rowH)), j2;
      list.slice(0, n2 - 1).forEach(function (e, j) { drawRow(c, cardX + 10, ry + j * rowH, cardW - 20, rowH, e, def, j); });
      var yd = ry + (n2 - 1) * rowH; R.txt(c, '· · ·', cardX + cardW / 2, yd + 9, 14, 'rgba(58,50,38,0.4)', 'center', true);
      drawRow(c, cardX + 10, yd + 18, cardW - 20, rowH, list[myI], def, 1);
    }
    if (list.length <= 3) {
      var fillY = ry + Math.min(list.length, n) * rowH + 16;
      if (cardY + cardH - fillY > 80) VU.wrap(c, def.rule + '。' + (def.hint || ''), cardX + 28, fillY, cardW - 56, 34, 22, INK, false, 5);
    }
    G2.card = { x: cardX, y: cardY, w: cardW, h: cardH, rowH: rowH, shown: n };
    if (BU.pick) drawPick(c, st, a, me);
    var vm = VU.msg; VU.msg = BU.msg; VU.toast(c, st, a, 62); VU.msg = vm;      // 公用 toast 读 VU.msg；这里借用一下
    st.end();
  };
  /* ---------- 「用哪个 X」选择面板 ---------- */
  function drawPick(c, st, a, me) {
    var cw = st.cw, ch = st.ch, opts = B.xOptions(), rowsN = opts.length + 1, bw = Math.min(cw - 24, 420), rh = 54, bh = Math.min(ch - 16, 100 + (opts.length ? rowsN * (rh + 6) : 70) + 56), bx = (cw - bw) / 2, by = Math.max(8, (ch - bh) / 2), i;
    st.hit(0, 0, cw, ch, 'bdNoop');
    c.save(); c.fillStyle = 'rgba(58,50,38,0.34)'; c.fillRect(0, 0, cw, ch); c.restore();
    c.fillStyle='#f4ead2';c.fillRect(bx,by,bw,bh);VU.brush(c,bx+22,by+12,90,4,.4,31);
    VU.txt(c, '榜上用哪个 X', bx + 22, by + 30, 19, INK, 'left', true, bw - 44);
    VU.brush(c, bx + 22, by + 44, 80, 3.5, 0.28, 5);
    VU.wrap(c, '头像和 @名 来自「自建角色」导入的 X 账号；不选也能上榜，用本机昵称。', bx + 22, by + 62, bw - 44, 15, 12, SOFT, false, 2);
    var y = by + 100, avail = by + bh - 56 - y;
    st.hit(bx, by, bw, bh, 'bdNoop');
    if (!opts.length) {
      VU.wrap(c, '还没有导入的 X 账号。先去「自建角色」导入一个，回来就能选。', bx + 22, y + 6, bw - 44, 18, 14, INK, true, 3);
      st.btn(bx + 22, by + bh - 62, bw - 44 - 110, 44, '去导入 X', 'bdImport', { seal: true, col: RED, sz: 15 });
      st.btn(bx + bw - 22 - 100, by + bh - 62, 100, 44, '好', 'bdPickClose', { pri: true, col: RED, sz: 17 });
      return;
    }
    var cap = Math.max(1, Math.floor(avail / (rh + 6)));
    opts.concat([null]).slice(0, cap).forEach(function (o, k) {
      var yy = y + k * (rh + 6), on = o ? (me.bound && me.handle.toLowerCase() === o.handle.toLowerCase()) : !me.bound;
      if(on)VU.washE(c,bx+60,yy+rh/2,110,rh,'165,45,28',.15);VU.brush(c,bx+78,yy+rh-3,Math.min(120,bw-120),1.5,.22,k+10);
      avatar(c, bx + 46, yy + rh / 2, 20, B.avatarFor(o ? o.handle : '', o ? o.name : B.localName(), o && o.avatar), { me: on });
      txtFit(c, o ? '@' + o.handle : '不绑定 X', bx + 78, yy + rh / 2 - (o ? 8 : 0), 15.5, INK, 'left', true, bw - 78 - 80, 11);
      if (o) txtFit(c, o.name, bx + 78, yy + rh / 2 + 11, 12, SOFT, 'left', false, bw - 78 - 80, 10); else txtFit(c, '只用本机昵称「' + B.localName() + '」', bx + 78, yy + rh / 2 + 14, 12, SOFT, 'left', false, bw - 78 - 20, 10);
      if (on) VU.drawTag(c, bx + bw - 14 - 54, yy + rh / 2 - 10, 46, 20, '使用中', '#2f7d3b', { fill: 'rgba(242,252,240,0.98)', sz: 11.5, tc: '#2f7d3b', seed: 6 });
      st.hit(bx + 14, yy, bw - 28, rh, o ? 'bdX' : 'bdXNone', o ? { id: o.handle } : null);
    });
    st.btn(bx + bw - 22 - 100, by + bh - 56, 100, 44, '好', 'bdPickClose', { pri: true, col: RED, sz: 17 });
    st.btn(bx + 22, by + bh - 56, bw - 44 - 112, 44, '导入更多 X', 'bdImport', { seal: true, col: '#7a6a47', sz: 14 });
  }

  /* ---------- 屏幕挂接 / 点击 / 键盘 ---------- */
  var oldDraw = XY.screens.draw;
  XY.screens.draw = function (c, G, a) { if (a.screen === 'board') BU.draw(c, G, a); else oldDraw(c, G, a); };
  BU.act = function (h, p, a) {
    if (h.act === 'menuBoard') { BU.open(); return true; }
    if (a.screen !== 'board' || typeof h.act !== 'string' || h.act.indexOf('bd') !== 0) return false;
    switch (h.act) {
      case 'bdBack': BU.close(); return true;
      case 'bdTab': B.setTab(h.id); BU.dirty(); return true;
      case 'bdSamples': B.setSamples(!B.samplesOn()); BU.dirty(); say(B.samplesOn() ? '已显示样例行（灰标「样例」）' : '已隐藏样例行', false); return true;
      case 'bdPick': BU.pick = true; return true;
      case 'bdPickClose': BU.pick = false; return true;
      case 'bdX': var r = B.pickX(h.id); BU.dirty(); if (r.ok) say('榜上改用 @' + h.id, false); else say(r.reason, true); BU.pick = false; return true;
      case 'bdXNone': B.pickX(null); BU.dirty(); say('已改为不绑定，用本机昵称上榜', false); BU.pick = false; return true;
      case 'bdImport': BU.pick = false; if (XY.xcharUI && XY.xcharUI.open) XY.xcharUI.open('board'); return true;
      case 'bdNoop': return true;
    }
    return true;
  };
  BU.key = function (k, a) {
    if (a.screen !== 'board') return false;
    if (k === 'Escape') { if (BU.pick) BU.pick = false; else BU.close(); return true; }
    var ids = B.BOARDS.map(function (b) { return b.id; }), cur = ids.indexOf(B.data().ui.tab);
    if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'KeyA' || k === 'KeyW') { B.setTab(ids[(cur + ids.length - 1) % ids.length]); BU.dirty(); return true; }
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'KeyD' || k === 'KeyS') { B.setTab(ids[(cur + 1) % ids.length]); BU.dirty(); return true; }
    if (/^Digit[1-5]$/.test(k)) { B.setTab(ids[+k.slice(5) - 1]); BU.dirty(); return true; }
    return true;
  };
})();
