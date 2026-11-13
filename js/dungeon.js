/* ============================================================
 * dungeon.js —— v0.8.4 洞府副本入口页（主菜单「洞府副本」按钮 → 这一页）
 * 两个副本：黑风洞（黑熊精）、白虎岭（白骨精）。解锁条件：第 1 关通关过一次。
 * 页面按 CSS 像素排版（先 scale(1/zoom)），所以手机竖屏 / 横屏 / 桌面字号和按钮大小一致；按钮 ≥ 48 CSS px 高。
 * 点击：dungeonGo（main.js）；结算在 specials.js / meta.js / overlay.js。
 * ============================================================ */
(function () {
  var XY = window.XY, R = XY.R, T = R.T, txt = R.txt, rrect = R.rrect, S = XY.save, ui = XY.ui;
  var DESC = {
    heifeng: ['无休息点 · 无夜潮 · 约 40 秒一波行军妖兵', '夹着蝠妖和夜枭（地面范围术打不到飞妖）', '洞主要打两次：第一次他躲回洞里，', '等他伤愈出来，再打死才算过关'],
    baihu: ['无休息点 · 无夜潮 · 约 40 秒一波行军妖兵', '夹着蝠妖和夜枭（地面范围术打不到飞妖）', '白骨精要打两次：第一次她遁回洞里，', '等她再现身，再打死才算过关']
  };
  function over(app, x, y, w, h) { return app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h; }
  function elem(e) { return XY.ELEMS[e] || { name: '', color: '#888' }; }

  function draw(c, G, app) {
    var z = app.zoom || 1, u = 1 / z, cw = app.lw * z, ch = app.lh * z, wide = cw >= 640 && cw > ch * 1.15, ds = XY.DUNGEONS, FBm = XY.fabao;
    R.dim(c, app, 0.72);
    c.save(); c.scale(u, u);
    var mx = app.mouse ? app.mouse.x * z : -1, my = app.mouse ? app.mouse.y * z : -1;
    function ov(x, y, w, h) { return mx >= x && mx <= x + w && my >= y && my <= y + h; }
    function hit(x, y, w, h, act, ex) { var o = { x: x * u, y: y * u, w: w * u, h: h * u, act: act }, k; if (ex) for (k in ex) o[k] = ex[k]; ui.hits.push(o); }
    c.fillStyle = '#f4ebd3'; c.fillRect(0, 0, cw, ch);
    var wash = c.createLinearGradient(0, 0, cw, ch); wash.addColorStop(0, 'rgba(180,157,108,0.02)'); wash.addColorStop(1, 'rgba(180,157,108,0.15)'); c.fillStyle=wash; c.fillRect(0,0,cw,ch);
    txt(c, '洞府副本', 22, 34, 24, T.ink, 'left', true);
    if (cw >= 560) txt(c, '短局 · 约 6 分钟 · 不算第 1 关通关', 22 + 112, 36, 12.5, T.inkSoft, 'left', false);
    else txt(c, '短局 · 约 6 分钟 · 不算第 1 关通关', 22, 52, 12, T.inkSoft, 'left', false);
    txt(c, '灵石 ' + S.data.lingshi, cw - 22, 36, 14, '#a8700a', 'right', true);
    var top = cw >= 560 ? 54 : 64, bot = ch - 76, gap = 12, n = ds.length, k;
    var cwid = wide ? (cw - 16 - 12 * 2 - gap) / 2 : cw - 16 - 24, chh = wide ? bot - top : (bot - top - gap) / 2;
    for (k = 0; k < n; k++) {
      var d = ds[k], x = wide ? 20 + k * (cwid + gap) : 20, y = wide ? top : top + k * (chh + gap), unl = S.dngUnlocked(d.id), info = S.dngInfo(d.id), cleared = info && info.cleared;
      var en = XY.ENEMIES[d.boss], el = elem(en.elem), item = FBm && FBm.DEN_ITEM && FBm.BY ? FBm.BY[FBm.DEN_ITEM[d.id]] : null, have = item && FBm.unlocked(item.id);
      // 两处关口在同一张山行手卷上；洞主大像淡入纸底，不再装进两张空白表格卡。
      var red = '#b8300f', artW = Math.min(cwid * 0.62, chh * 0.9), artH = Math.min(chh * 0.92, cwid * 0.7), roomy = true;
      c.save(); c.globalAlpha = unl ? 0.94 : 0.78;
      if (XY.MINK) XY.MINK.portrait(c, d.boss, x + (roomy ? artW * 0.5 : cwid - artW * 0.48), y + chh - 24, artH);
      c.restore();
      var tx = x + (roomy ? artW + 14 : 12), textW = cwid - (tx - x) - 12;
      txt(c, d.name, tx, y + 26, 26, unl ? red : '#8a8576', 'left', true);
      txt(c, d.sub, tx, y + 50, 12.5, T.inkSoft, 'left', false);
      txt(c, cleared ? '已通关' : (!unl ? '尚未解锁' : '待闯关'), x+cwid-12, y+25, 12, cleared?'#53764a':T.inkSoft, 'right', true);
      var ty = y + 73;
      txt(c, '洞主：' + en.name + '（' + el.name + '）', tx, ty, 14, T.ink, 'left', true); ty += 20;
      // 完整保留规则，不因为重排删去条件。
      (DESC[d.id] || []).forEach(function (line) { txt(c, line, tx, ty, 12, T.inkSoft, 'left', false); ty += 18; });
      txt(c, '首通：灵石 +' + XY.C.DNG_GAIN_FIRST + (item ? ' · 「' + item.name + '」' + (have ? '（已有）' : '') : ''), tx, ty + 3, 12.5, '#a8700a', 'left', true);
      txt(c, '再通：灵石 +' + XY.C.DNG_GAIN + (info && info.best ? ' · 最快 ' + XY.fmtTime(info.best) : ''), tx, ty + 22, 12, T.inkSoft, 'left', false);
      var bh = 48, by = y + chh - bh - 8, bw = Math.min(cwid - 24, 176), bx0 = x+cwid-bw-12, hv = unl && ov(bx0, by, bw, bh);
      c.save(); c.translate(bx0+bw/2,by+bh/2); c.rotate(-0.025); c.fillStyle=!unl?'rgba(90,72,46,0.12)':hv?'#cb4324':red; c.fillRect(-bw/2,-bh/2,bw,bh); c.strokeStyle='rgba(244,235,211,0.65)';c.lineWidth=1;c.strokeRect(-bw/2+4,-bh/2+4,bw-8,bh-8);c.restore();
      txt(c, unl ? '进入' + d.name : '首关通关后解锁', bx0+bw/2,by+bh/2,15,unl?'#fff4dc':'#8a8576','center',true);
      c.strokeStyle='rgba(70,56,35,0.30)';c.lineWidth=1;c.beginPath();c.moveTo(x+12,y+chh-2);c.bezierCurveTo(x+cwid*0.3,y+chh+1,x+cwid*0.7,y+chh-4,x+cwid-12,y+chh-1);c.stroke();
      if (unl) hit(bx0, by, bw, bh, 'dungeonGo', { id: d.id });
    }
    var cur = S.carryId();
    txt(c, '携带：' + (cur ? XY.SP_BY[cur].name + ' Lv' + S.spLevel(cur) : '不带常驻角色') + (cw >= 560 ? '（在「出发」页更换）· 法宝 / 卡牌照常携带' : '（出发页更换）'), 22, ch - 62, 12.5, T.inkSoft, 'left', false);
    if (app.menuMsg && app.rt <= app.menuMsg.until) txt(c, app.menuMsg.text, cw - 22, ch - 62, 13, app.menuMsg.bad ? '#b8300f' : '#2f7d3b', 'right', true);
    var bx = 20, bw2 = 120, by2 = ch - 52, bh2 = 40, hb = ov(bx, by2, bw2, bh2);
    if (XY.villainUI && XY.villainUI.drawBrush) XY.villainUI.drawBrush(c, bx, by2, bw2, bh2, '返回', { sz: 16, vh: 32, strong: true });
    else { c.fillStyle = 'rgba(58,50,38,0.16)'; c.fillRect(bx, by2, bw2, bh2); txt(c, '返回', bx + bw2 / 2, by2 + bh2 / 2 + 1, 16, T.ink, 'center', true); }
    hit(bx - 4, by2 - 4, bw2 + 8, bh2 + 8, 'back');
    c.restore();
  }
  var old = XY.screens.draw;
  XY.screens.draw = function (c, G, app) { if (app.screen === 'dungeon') draw(c, G, app); else old(c, G, app); };
  XY.dungeonScreen = { draw: draw };
})();
