/* ============================================================
 * screens4.js —— v0.4 的局外界面：选关 + 携带常驻角色、灵石商店、结算页
 * 全部是 canvas 画的；点击区域登记到 XY.ui.hits，点击处理在 main.js（levelSel / levelGo / carryPick / shopBuy / shopRoll / buyCard / nextLevel）。
 * 只有灵石（游戏里打出来的），没有任何真钱 / 付款界面。
 * ============================================================ */
(function () {
  var XY = window.XY, R = XY.R, T = R.T, txt = R.txt, rrect = R.rrect, panel = R.panel, S = XY.save, ui = XY.ui, PI2 = Math.PI * 2;
  function over(app, x, y, w, h) { return app.mouse && app.mouse.x >= x && app.mouse.x <= x + w && app.mouse.y >= y && app.mouse.y <= y + h; }
  function hit(x, y, w, h, act, ex) { var o = { x: x, y: y, w: w, h: h, act: act }, k; if (ex) for (k in ex) o[k] = ex[k]; ui.hits.push(o); }
  function sbtn(c, app, x, y, w, h, label, act, ex, o) {
    o = o || {}; var hov = !o.off && over(app, x, y, w, h);
    rrect(c, x, y, w, h, 10);
    c.fillStyle = o.off ? '#ece8dd' : (o.on ? '#cfeccb' : (o.primary ? (hov ? '#ffb347' : '#ffc46b') : (hov ? '#fff3d6' : '#ffffff'))); c.fill();
    c.lineWidth = 2; c.strokeStyle = o.on ? '#43a047' : (o.off ? '#cfc8b4' : (o.primary ? '#c78a1e' : '#b9a77a')); c.stroke();
    txt(c, label, x + w / 2, y + h / 2 + 1, o.size || 15, o.off ? '#a49d8a' : (o.danger ? '#b8300f' : T.ink), 'center', true);
    if (act) hit(x, y, w, h, act, ex);
  }
  // 版本开关按钮（大、触屏友好）：显示当前版本，点一下就切换；存进存档
  function verBtn(c, app, x, y, w, h) { XY.menu.verSwitch(c, app, x, y, w, h); }
  XY.R4.verBtn = verBtn;
  function ELC(e) { return (XY.ELEMS[e] || {}).color || '#888'; }
  function ELN(e) { return (XY.ELEMS[e] || {}).name || ''; }
  function msgLine(c, app, x, y, align) { var m = app.menuMsg; if (!m || app.rt > m.until) return; txt(c, m.text, x, y, 15, m.bad ? '#b8300f' : '#2f7d3b', align || 'left', true); }
  // v0.7：选关页点中常驻角色 → 整页背景换成该角色的定稿立绘（淡淡的、在所有面板后面；面板略透明；点「不带」恢复）
  var bgCache = {};
  function bgArt(c, app, id) {
    var W = app.lw, H = app.lh, im = id && XY.bgArt ? XY.bgArt(id) : null;
    if (app._bgId !== id) { app._bgId = id; app._bgT = app.rt; }
    if (!im) return false;
    var a = Math.min(1, (app.rt - app._bgT) / 0.5), ih = H * 1.12, iw = ih * im.width / im.height, cx = W * 0.68, iy = -H * 0.02;
    c.save(); c.globalAlpha = 0.9 * a;
    var ob = bgCache[id]; if (!ob || ob.src !== im) {
      Object.keys(bgCache).forEach(function (k) { if (k !== id) delete bgCache[k]; });      // 只留当前这一张（原分辨率的羽化图每张几 MB，点遍 9 位会占几十 MB）      // 左右边缘羽化的缓存图：不会露出一个硬边的方框
      var oc = document.createElement('canvas'); oc.width = im.width; oc.height = im.height; var o = oc.getContext('2d');
      o.drawImage(im, 0, 0); o.globalCompositeOperation = 'destination-in';
      var lg = o.createLinearGradient(0, 0, oc.width, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.22, 'rgba(0,0,0,1)'); lg.addColorStop(0.78, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = lg; o.fillRect(0, 0, oc.width, oc.height); ob = bgCache[id] = { src: im, cv: oc };
    }
    c.drawImage(ob.cv, cx - iw / 2, iy, iw, ih);
    c.restore();
    var g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(255,252,240,0.45)'); g.addColorStop(0.4, 'rgba(255,252,240,0.12)'); g.addColorStop(1, 'rgba(255,252,240,0.18)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    return true;
  }
  XY.R4.bgArt = bgArt;      // v0.8.7b：出发页（depart.js）也用它画「带谁就换谁的整页立绘」
  function head(c, app, title, sub, artId) {
    var W = app.lw, H = app.lh;
    R.dim(c, app, 0.72);
    var hasArt = artId !== undefined && bgArt(c, app, artId);
    panel(c, 14, 10, W - 28, H - 20, 20, hasArt ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.96)', '#d9a21a');
    XY.menu.pageTitle(c, title, 42, 44);
    if (sub) txt(c, sub, 42 + c.measureText(title).width + 40, 46, 14, T.inkSoft, 'left', false);
    var d = S.data;
    rrect(c, W - 330, 24, 290, 40, 20); c.fillStyle = '#fff3c9'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#e0a415'; c.stroke();
    c.fillStyle = '#7bd3e8'; c.strokeStyle = '#2d9aa6'; c.lineWidth = 2; c.beginPath(); c.moveTo(W - 306, 34); c.lineTo(W - 296, 44); c.lineTo(W - 306, 54); c.lineTo(W - 316, 44); c.closePath(); c.fill(); c.stroke();
    txt(c, '灵石 ' + d.lingshi, W - 286, 45, 18, T.ink, 'left', true);
    txt(c, '皮肤碎片 ' + d.shards, W - 52, 45, 13, T.inkSoft, 'right', false);
  }
  function foot(c, app) {
    var W = app.lw, H = app.lh;
    sbtn(c, app, 36, H - 62, 150, 40, '← 返回（Esc）', 'back', null, { size: 16 });
  }

  /* ================= 选关 + 携带角色 ================= */
  function drawLevels(c, G, app) {
    var W = app.lw, H = app.lh, rt = app.rt, i, n = XY.LEVEL_COUNT;
    head(c, app, '出发', '每关 2~4 座洞府 · 打倒洞府 BOSS 才不再出怪 · 唐僧要走到西边关口才算过关', S.carryId() || null);
    var cw = Math.floor((W - 28 - 60 - (n - 1) * 14) / n), x0 = 44, y0 = 74, ch = 328;
    for (i = 1; i <= n; i++) {
      var L = XY.levelOf(i), x = x0 + (i - 1) * (cw + 14), unl = S.levelUnlocked(i), info = S.levelInfo(i), cleared = info && info.cleared, sel = app.levelId === i && unl;
      var hov = unl && over(app, x, y0, cw, ch);
      rrect(c, x, y0, cw, ch, 14); c.fillStyle = unl ? (sel ? '#fff4d6' : (hov ? '#fffaf0' : '#fffdf6')) : '#ebe8df'; c.save(); if (app._bgId) c.globalAlpha = 0.86; c.fill(); c.restore();
      c.lineWidth = sel ? 4 : 2; c.strokeStyle = sel ? '#e0533d' : (unl ? '#c9a24a' : '#c9c4b4'); c.stroke();
      c.fillStyle = unl ? '#d9433a' : '#aaa59a'; c.beginPath(); c.arc(x + 30, y0 + 32, 20, 0, PI2); c.fill();
      txt(c, String(i), x + 30, y0 + 33, 24, '#fff', 'center', true);
      txt(c, L.name, x + 62, y0 + 26, 24, unl ? T.ink : '#8a8576', 'left', true);
      txt(c, unl ? L.sub : '通关上一关后解锁', x + 62, y0 + 50, 12.5, T.inkSoft, 'left', false);
      if (cleared) { rrect(c, x + cw - 82, y0 + 12, 70, 24, 12); c.fillStyle = '#43a047'; c.fill(); txt(c, '✔ 已通关', x + cw - 47, y0 + 25, 13, '#fff', 'center', true); }
      else if (!unl) { txt(c, '🔒 未解锁', x + cw - 14, y0 + 25, 14, '#8a8576', 'right', true); }
      if (unl) {
        var yy = y0 + 76;
        txt(c, '洞府（' + L.dens.length + ' 座，BOSS 不倒就一直出怪）', x + 16, yy, 13, '#b8300f', 'left', true); yy += 20;
        L.dens.forEach(function (d) {
          var e = XY.ENEMIES[d.boss]; c.fillStyle = ELC(e.elem); c.beginPath(); c.arc(x + 24, yy, 5, 0, PI2); c.fill();
          txt(c, d.name + ' · ' + e.name + '（' + ELN(e.elem) + '）', x + 36, yy + 1, 13, T.ink, 'left', false); yy += 19;
        });
        yy += 6;
        txt(c, '主线', x + 16, yy, 13, '#b8300f', 'left', true); txt(c, L.main.short, x + 54, yy, 13, T.ink, 'left', false); yy += 22;
        txt(c, '支线 ' + (info ? S.levelSides(i) : 0) + '/' + L.sides.length, x + 16, yy, 13, '#2f7d3b', 'left', true); yy += 19;
        L.sides.forEach(function (s) { txt(c, '· ' + s.short, x + 20, yy, 12, T.inkSoft, 'left', false); yy += 17; });
        yy += 4;
        txt(c, '终点：西行关口「' + L.gate.name + '」', x + 16, yy, 13, '#a8700a', 'left', true);
        if (info && info.best) txt(c, '最快 ' + XY.fmtTime(info.best), x + cw - 14, yy, 12, T.inkSoft, 'right', false);
        hit(x, y0, cw, ch - 56, 'levelSel', { n: i });
        sbtn(c, app, x + 16, y0 + ch - 50, cw - 32, 38, sel ? '出发！' : '选这一关', sel ? 'levelGo' : 'levelSel', { n: i }, { primary: sel, size: 17 });
      }
    }
    // 携带常驻角色
    var cy = y0 + ch + 14, ph = 214;
    panel(c, 30, cy, W - 60, ph, 14, app._bgId ? 'rgba(255,252,242,0.78)' : 'rgba(255,252,242,0.98)', '#c9a24a');
    var cur = S.carryId();
    txt(c, XY.TEST_BUILD ? '携带常驻角色（' + XY.SPECIALS.length + ' 位全可选 · 打死第一只怪就满级，不写入存档）' : '携带常驻角色（没抽到的要集齐 ' + XY.SP_LV_AT[0] + ' 张角色卡）', 46, cy + 22, 16, T.ink, 'left', true);
    txt(c, cur ? '本关：' + XY.SP_BY[cur].name + ' Lv' + S.spLevel(cur) + ' · ' + XY.synText(cur) : '本关：不带', W - 46, cy + 22, 15, cur ? '#2f7d3b' : T.inkSoft, 'right', true);
    var ids = XY.SPECIALS.map(function (d) { return d.id; }), sw = Math.floor((W - 60 - 32 - 4 * 12) / 13), k;
    var none = !cur;
    rrect(c, 46, cy + 40, sw, 126, 10); c.fillStyle = none ? '#cfeccb' : '#fbf6ea'; c.fill(); c.lineWidth = none ? 3 : 1.5; c.strokeStyle = none ? '#43a047' : '#c9b98f'; c.stroke();
    txt(c, '不带', 46 + sw / 2, cy + 90, 15, T.ink, 'center', true); hit(46, cy + 40, sw, 126, 'carryPick', { id: null });
    ids.forEach(function (id, j) {
      var d = XY.SP_BY[id], x = 46 + (j + 1) * (sw + 4), owned = S.spOwned(id), lv = S.spLevel(id), nc = S.spCards(id), nx = XY.spNext(id), sl = cur === id, hv = over(app, x, cy + 40, sw, 126);
      rrect(c, x, cy + 40, sw, 126, 10); c.fillStyle = sl ? '#cfeccb' : (owned ? (hv ? '#fff3d6' : '#fffdf6') : '#ebe8df'); c.fill();
      c.lineWidth = sl ? 3.5 : 1.8; c.strokeStyle = sl ? '#43a047' : (owned ? d.frame : '#c9c4b4'); c.stroke();
      c.save(); if (!owned) c.globalAlpha = 0.45;
      XY.R4.avatarDisc(c, XY.specialDef(id, Math.max(1, lv)), x + sw / 2, cy + 74, 22, rt);
      c.restore();
      txt(c, d.name, x + sw / 2, cy + 112, d.name.length > 5 ? 11.5 : 13.5, owned ? T.ink : '#8a8576', 'center', true);
      txt(c, owned ? (XY.ROLE_TAG[d.roleKey] || '') + ' · ' + ELN(d.elem) : '未获得', x + sw / 2, cy + 130, 11.5, owned ? ELC(d.elem) : '#9a9586', 'center', true);
      txt(c, owned ? 'Lv' + lv + ' · ' + nc + ' 张' + (nx ? ' / ' + nx.need : ' 满') : nc + ' / ' + XY.SP_LV_AT[0] + ' 张', x + sw / 2, cy + 148, 10.5, owned ? '#a8700a' : T.inkSoft, 'center', false);
      hit(x, cy + 40, sw, 126, 'carryPick', { id: id });
      if (hv) app._tip = { x: x + sw / 2, y: cy + 36, lines: [d.name + '（' + d.handle + '）· ' + d.role, '武器：' + d.weapon + ' · 大招：' + d.ult + ' · 特性：' + d.trait.name, '物防 ' + Math.round(d.pdef * 100) + '% 法防 ' + Math.round(d.mdef * 100) + '% · 怕「' + XY.weakText(d.elem) + '」', '辅助：' + d.sup.map(function (q) { return q.name; }).join(' · '), '弱点：' + d.weakTxt, '升级所需卡：' + XY.SP_LV_AT.join(' / ') + ' 张（Lv1~5）', XY.synText(id)] };
    });
    // 马丁后面：第一个占位格是「自建角色」位（显示正在携带的 / 第一个自建角色；没有就是「＋ 自建」入口），其余仍是隐藏角色「？」占位
    (function () {
      var XC = XY.xchar, nhid = ids.some(function (id) { return XY.isHidden(id); }) ? 0 : (XY.HIDDEN_SPECIALS || []).length, nh = 1, q;
      for (q = 0; q < nh; q++) {
        var x = 46 + (ids.length + 1 + q) * (sw + 4), hv2 = over(app, x, cy + 40, sw, 126);
        if (q > 0) {      // v0.8.1b：只把第一个「？」换成自建位，其余仍是隐藏角色占位
          rrect(c, x, cy + 40, sw, 126, 10); c.fillStyle = '#ebe8df'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#c9c4b4'; c.stroke();
          txt(c, '？', x + sw / 2, cy + 103, 40, '#b5af9e', 'center', true);
          hit(x, cy + 40, sw, 126, 'lockedSlot'); continue;
        }
        var rec = XC.get(cur) || XC.list[0];
        if (rec) {
          var xd = XY.SP_BY[rec.id], sl2 = cur === rec.id;
          rrect(c, x, cy + 40, sw, 126, 10); c.fillStyle = sl2 ? '#cfeccb' : (hv2 ? '#fff3d6' : '#fffdf6'); c.fill(); c.lineWidth = sl2 ? 3.5 : 1.8; c.strokeStyle = sl2 ? '#43a047' : xd.frame; c.stroke();
          XY.R4.avatarDisc(c, XY.specialDef(rec.id, XC.LV), x + sw / 2, cy + 74, 22, rt);
          txt(c, xd.name, x + sw / 2, cy + 112, xd.name.length > 5 ? 11.5 : 13.5, T.ink, 'center', true);
          txt(c, '自建 · ' + (XY.ROLE_TAG[xd.roleKey] || ''), x + sw / 2, cy + 130, 11.5, '#c8341f', 'center', true);
          txt(c, 'Lv' + XC.LV + ' · 同' + xd.kitName, x + sw / 2, cy + 148, 10.5, '#a8700a', 'center', false);
          hit(x, cy + 40, sw, 126, 'carryPick', { id: rec.id });
          if (hv2) app._tip = { x: x + sw / 2, y: cy + 36, lines: [xd.name + '（' + xd.handle + '）· 自建角色 · ' + xd.role, '技能 = 「' + xd.kitName + '」同款 · 武器：' + xd.weapon + ' · 大招：' + xd.ult, '头像和形象来自这个 X 账号 · 只保存在本机，别人看不到'] };
        } else {
          rrect(c, x, cy + 40, sw, 126, 10); c.fillStyle = hv2 ? '#fff3d6' : '#fffaf0'; c.fill(); c.save(); c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeStyle = '#c9a24a'; c.stroke(); c.restore();
          txt(c, '＋', x + sw / 2, cy + 92, 34, '#c8341f', 'center', true);
          txt(c, '自建', x + sw / 2, cy + 124, 13.5, T.ink, 'center', true);
          txt(c, '导入 X 账号', x + sw / 2, cy + 144, 10.5, T.inkSoft, 'center', false);
          hit(x, cy + 40, sw, 126, 'xchar');
          if (hv2) app._tip = { x: x + sw / 2, y: cy + 36, lines: ['自建角色：输入 X 账号，用 TA 的头像和形象生成一位特殊人物', '技能从现有特殊人物里随机抽一套 · 只保存在本机，别人看不到'] };
        }
      }
      if (W < H) {        // 竖屏：格子太窄（≈24 CSS px），下面补一个整行的大按钮（≥ 46 CSS px 高）
        var bh = Math.max(64, Math.ceil(48 / (app.zoom || 0.5))), bx = 30, bw = W - 60, byy = cy + ph + 14, hv3 = over(app, bx, byy, bw, bh);
        rrect(c, bx, byy, bw, bh, 14); c.fillStyle = hv3 ? '#fff3d6' : '#fff8e2'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#b8863b'; c.stroke();
        c.fillStyle = '#c8341f'; c.beginPath(); c.arc(bx + bh * 0.5, byy + bh / 2, bh * 0.26, 0, Math.PI * 2); c.fill(); txt(c, '＋', bx + bh * 0.5, byy + bh / 2 + 1, bh * 0.36, '#fff8e8', 'center', true);
        txt(c, '自建角色（' + XC.list.length + ' / ' + XC.MAX + '）', bx + bh * 0.95, byy + bh * 0.36, Math.round(bh * 0.3), '#5a330a', 'left', true);
        txt(c, '导入 X 账号，用 TA 的头像生成专属特殊人物 · 只存本机', bx + bh * 0.95, byy + bh * 0.72, Math.round(bh * 0.2), T.inkSoft, 'left', false);
        hit(bx, byy, bw, bh, 'xchar'); app._xcBtn = { x: bx, y: byy, w: bw, h: bh };
      } else if (XC.list.length) {      // 横屏：自建位已被角色占用时，在底栏「重新开始取经」左边放一个管理按钮（≥ 43 CSS px 高）
        var bh2 = Math.max(52, Math.ceil(43 / (app.zoom || 1))), rx = W - 400 - 14, bw2 = Math.min(400, rx - 580), bx2 = rx - bw2, by2 = Math.max(cy + ph + 4, H - bh2 - 4), hv4 = over(app, bx2, by2, bw2, bh2);
        if (bw2 >= 220) {
          rrect(c, bx2, by2, bw2, bh2, 12); c.fillStyle = hv4 ? '#fff3d6' : '#fff8e2'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#b8863b'; c.stroke();
          txt(c, '＋ 自建角色（' + XC.list.length + ' / ' + XC.MAX + '）· 管理', bx2 + bw2 / 2, by2 + bh2 / 2 + 6, 17, '#5a330a', 'center', true);
          hit(bx2, by2, bw2, bh2, 'xchar'); app._xcBtn = { x: bx2, y: by2, w: bw2, h: bh2 };
        } else app._xcBtn = null;
      } else app._xcBtn = null;
    })();
    if (cur) txt(c, XY.SP_BY[cur].name + ' · ' + XY.SP_BY[cur].role, 46, cy + 181, 13.5, T.ink, 'left', true);
    txt(c, S.spOwned('phyrex') ? '角色卡掉落：首通关卡、打倒洞府 BOSS、开宝箱；或用灵石去商店买。第一位已经是 Phyrex，其他人随机。' : '你的第一位常驻角色一定是 Phyrex —— 首通任意一关会掉他的卡（集 ' + XY.SP_LV_AT[0] + ' 张解锁）。之后其他人随机掉落。', 46, cy + ph - 16, 13, T.inkSoft, 'left', false);
    sbtn(c, app, W - 204, H - 62, 170, 40, '灵石商店', 'menuShop', null, { primary: true, size: 16 });
    sbtn(c, app, W - 204 - 196, H - 62, 180, 40, '重新开始取经', 'menuRestart', null, { danger: true, size: 15 });
    verBtn(c, app, 712, 12, 226, 46);
    var js = XY.journey.status(app.levelId);
    txt(c, '取经之旅 · 第 ' + app.levelId + ' 关：' + js.text, 204, H - 52, 14, js.inherit ? '#2f7d3b' : T.inkSoft, 'left', js.inherit);
    msgLine(c, app, 204, H - 30, 'left');
    foot(c, app);
    if (app._tip) { var tp = app._tip, lw = 0; c.font = '12.5px ' + XY.C.FONT; tp.lines.forEach(function (s) { lw = Math.max(lw, c.measureText(s).width); }); lw += 24; var th = 12 + tp.lines.length * 18, tx = Math.max(10, Math.min(W - lw - 10, tp.x - lw / 2)), ty = tp.y - th;
      panel(c, tx, ty, lw, th, 8, 'rgba(255,252,240,0.98)', '#c9a24a'); tp.lines.forEach(function (s, q) { txt(c, s, tx + 12, ty + 15 + q * 18, 12.5, q ? T.inkSoft : T.ink, 'left', q === 0); }); }
    app._tip = null;
  }

  /* ================= 灵石商店 ================= */
  // v0.8.3：灵石商店的两个新页签（法宝解锁 / 天兵卡）
  function drawShopTab(c, app, tab, cols, gw, gh, gx, gy) {
    var W = app.lw, rt = app.rt, list = tab === 'fb' ? XY.shop.fbList() : XY.shop.solList(), i;
    if (tab === 'fb') {
      txt(c, '买下就永久解锁，之后开局可以带；击败洞主得到的专属法宝不在这里卖（留给你自己打）', 44, gy - 8, 13, T.inkSoft, 'left', false);
      if (!list.length) txt(c, '能买的法宝 / 灵物都已解锁。其余的要靠击败洞主得到。', W / 2, gy + 120, 20, T.inkSoft, 'center', true);
    } else txt(c, '天兵卡：一张一级，三张二级，六张三级。每次买一张。', 44, gy - 8, 18, T.ink, 'left', true);
    gy += 8;
    for (i = 0; i < list.length; i++) {
      var r = list[i], x = gx + (i % cols) * (gw + 16), y = gy + Math.floor(i / cols) * (gh - 30 + 14), h = gh - 30, can = S.data.lingshi >= r.price && !r.full;
      rrect(c, x, y, gw, h, 14); c.fillStyle = r.full ? '#ebe8df' : '#fffdf6'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = '#c9a24a'; c.stroke();
      if (tab === 'fb') {
        var it = XY.fabao.BY[r.id];
        c.fillStyle = it.kind === 'l' ? '#e8dcc0' : '#f3e2b0'; c.beginPath(); c.arc(x + 48, y + 58, 30, 0, PI2); c.fill(); c.lineWidth = 2; c.strokeStyle = '#b8863b'; c.stroke();
        if (!(XY.ICONINK && XY.ICONINK.draw(c, it.name, x + 48, y + 58, 60))) txt(c, it.name.charAt(0), x + 48, y + 59, 28, T.ink, 'center', true);
        txt(c, (it.kind === 'l' ? '灵物 · ' : '法宝 · ') + it.name, x + 94, y + 34, 20, T.ink, 'left', true);
        txt(c, it.d, x + 94, y + 60, 12.5, T.inkSoft, 'left', false);
        txt(c, XY.fabao.whereText(r.id) ? '也可以：' + XY.fabao.whereText(r.id) : '', x + 94, y + 84, 12, '#a8700a', 'left', false);
        sbtn(c, app, x + 16, y + h - 50, gw - 32, 38, '解锁 ' + r.price + ' 灵石' + (can ? '' : '（不够）'), 'shopBuyFb', { id: r.id }, { primary: can, off: !can, size: 16 });
      } else {
        var td = XY.TOWERS[r.type];
        c.fillStyle = td.color; c.beginPath(); c.arc(x + 48, y + 58, 30, 0, PI2); c.fill(); if (!(XY.ICONINK && XY.ICONINK.sol(c, r.type, x + 48, y + 52, 64))) txt(c, td.name.charAt(0), x + 48, y + 59, 30, '#fff', 'center', true);
        txt(c, '天兵卡 · ' + td.name, x + 94, y + 34, 20, T.ink, 'left', true);
        txt(c, '已有 ' + r.cards + ' 张' + (r.lv ? ' · ' + (['','一','二','三'][r.lv] || r.lv) + '级' : ' · 还没解锁'), x + 94, y + 60, 16, '#24180f', 'left', true);
        txt(c, r.full ? '已满级' : '造价 ' + td.cost + ' 金币', x + 94, y + 84, 12, T.inkSoft, 'left', false);
        sbtn(c, app, x + 16, y + h - 50, gw - 32, 38, r.full ? '已满级' : '买 1 张 ' + r.price + ' 灵石' + (can ? '' : '（不够）'), 'shopBuySol', { t: r.type }, { primary: can, off: !can, size: 16 });
      }
    }
  }

  function drawShop(c, G, app) {
    var W = app.lw, H = app.lh, rt = app.rt, st = XY.shop.stock(), i;
    head(c, app, '灵石商店', '只收灵石（打关卡赚来的）· 货架每打完一局刷新');
    var tab = app.shopTab || 'shelf', TABS = [['shelf', '货架'], ['fb', '法宝解锁'], ['sol', '天兵卡']];
    TABS.forEach(function (tb, k) { sbtn(c, app, 44 + k * 156, 70, 146, 38, tb[1], 'shopTab', { k: tb[0] }, { on: tab === tb[0], size: 17 }); });
    var cols = 3, gw = Math.floor((W - 28 - 60 - (cols - 1) * 16) / cols), gh = 214, gx = 44, gy = 134;
    if (tab !== 'shelf') { drawShopTab(c, app, tab, cols, gw, gh, gx, gy); msgLine(c, app, W / 2, H - 42, 'center'); foot(c, app); return; }
    for (i = 0; i < 6; i++) {
      var sl = st.slots[i], x = gx + (i % cols) * (gw + 16), y = gy + Math.floor(i / cols) * (gh + 14), sold = st.sold[i], can = S.data.lingshi >= sl.price;
      rrect(c, x, y, gw, gh, 14); c.fillStyle = sold ? '#ebe8df' : '#fffdf6'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = sold ? '#c9c4b4' : (sl.kind === 'sp' ? XY.SP_BY[sl.id].frame : '#c9a24a'); c.stroke();
      c.save(); if (sold) c.globalAlpha = 0.5;
      if (sl.kind === 'sp') {
        var d = XY.SP_BY[sl.id], lv = S.spLevel(sl.id), nx = XY.spNext(sl.id);
        XY.R4.avatarDisc(c, XY.specialDef(sl.id, Math.max(1, lv)), x + 62, y + 74, 40, rt);
        txt(c, '角色卡 · ' + d.name, x + 124, y + 34, 21, T.ink, 'left', true);
        txt(c, d.handle + ' · ' + ELN(d.elem) + ' · ' + (d.dtype === 'magic' ? '法术' : '物理'), x + 124, y + 58, 13, ELC(d.elem), 'left', true);
        txt(c, d.role, x + 124, y + 80, 13, T.inkSoft, 'left', false);
        txt(c, '大招：' + d.ult + ' · 特性：' + d.trait.name, x + 124, y + 100, 12.5, T.inkSoft, 'left', false);
        txt(c, lv ? '已有 ' + S.spCards(sl.id) + ' 张 · Lv' + lv + (nx ? '（再 ' + (nx.need - nx.have) + ' 张升级）' : '（满级）') : '已有 ' + S.spCards(sl.id) + ' / ' + XY.SP_LV_AT[0] + ' 张（集齐解锁）', x + 124, y + 122, 13, '#a8700a', 'left', true);
      } else if (sl.kind === 'card') {
        var cd = XY.CARD_BY[sl.id], Rr = XY.RARITY[cd.r];
        R.drawCardMini(c, cd, x + 62, y + 80, 78, 108, 1);
        txt(c, '法宝 · ' + cd.name, x + 124, y + 38, 21, T.ink, 'left', true);
        txt(c, Rr.name + ' · ' + XY.CARD_SETS[cd.set].name + '套', x + 124, y + 62, 14, Rr.color, 'left', true);
        txt(c, XY.cardFxText(cd, 1), x + 124, y + 86, 12.5, T.inkSoft, 'left', false);
        txt(c, S.has(cd.id) ? '已拥有 · 买了重复 +1' : '新法宝！', x + 124, y + 110, 13, S.has(cd.id) ? '#2f7d3b' : '#d62828', 'left', true);
      } else if (sl.kind === 'shard') {
        c.fillStyle = '#bfe3fa'; c.strokeStyle = '#4a90d9'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 62, y + 36); c.lineTo(x + 94, y + 80); c.lineTo(x + 62, y + 124); c.lineTo(x + 30, y + 80); c.closePath(); c.fill(); c.stroke();
        txt(c, '皮肤碎片 ×' + sl.n, x + 124, y + 38, 21, T.ink, 'left', true);
        txt(c, '集齐碎片解锁皮肤（如净坛使者）', x + 124, y + 66, 13, T.inkSoft, 'left', false);
        txt(c, '现有 ' + S.data.shards + ' 枚', x + 124, y + 90, 13, '#a8700a', 'left', true);
      } else {
        c.strokeStyle = '#8a7d63'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.arc(x + 62, y + 80, 28, 0.6, 5.4); c.stroke(); c.lineCap = 'butt';
        txt(c, '刷新货架', x + 124, y + 38, 21, T.ink, 'left', true);
        txt(c, '换一批角色卡和法宝（第一位角色仍然是 Phyrex）', x + 124, y + 66, 13, T.inkSoft, 'left', false);
      }
      c.restore();
      var bx = x + 16, by = y + gh - 52, bw = gw - 32;
      if (sold) { sbtn(c, app, bx, by, bw, 38, '已买走', null, null, { off: true }); }
      else sbtn(c, app, bx, by, bw, 38, (sl.kind === 'reroll' ? '刷新 ' : '购买 ') + sl.price + ' 灵石' + (can ? '' : '（不够）'), 'shopBuy', { slot: i }, { primary: can, off: !can, size: 16 });
    }
    var fy = gy + 2 * (gh + 14) + 4;
    sbtn(c, app, 44, fy, 300, 40, '抽一张法宝 ' + S.CARD_PRICE + ' 灵石', 'buyCard', null, { size: 16, off: S.data.lingshi < S.CARD_PRICE });
    txt(c, S.spOwned('phyrex') ? '货架上的角色卡随机；每 2 / 5 / 10 / 20 / 40 张升到 Lv1~5' : '第一次买到的角色卡一定是 Phyrex（集 2 张解锁），之后才随机出现其他人', 360, fy + 21, 14, T.inkSoft, 'left', false);
    msgLine(c, app, W / 2, H - 42, 'center');
    foot(c, app);
  }

  /* ================= 结算页 ================= */
  function drawEnd(c, G, app, win) {
    var W = app.lw, H = app.lh, cause = G.ending && G.ending.cause, rep = G.runReport || {}, Q = G.quests, i;
    R.dim(c, app, 0.7);
    var ph = 640, pw = 640, px = W / 2 - pw / 2, py = Math.max(6, H / 2 - ph / 2);
    panel(c, px, py, pw, ph, 22, 'rgba(255,255,255,0.97)', win ? '#d9a21a' : '#c0392b');
    txt(c, win ? '过关！' : (cause === 'tang' ? '师傅阵亡' : '基地被入侵'), W / 2, py + 46, 44, win ? '#c8860a' : '#c0392b', 'center', true);
    txt(c, XY.lvPre(G) + G.lv.name + '」' + (win ? ' · 唐僧走进了关口「' + G.gate.name + '」' : ''), W / 2, py + 84, 16, T.inkSoft, 'center', false);
    var why = G.ending && (G.ending.why || G.ending.reason);
    if (!win && why) R.wrap(c, '死因：' + why, W / 2, py + 112, 560, 15, 22, '#a8321f', 2);
    var y = py + 138;
    txt(c, '任务结果', px + 40, y, 15, '#b8300f', 'left', true); y += 24;
    [Q.main].concat(Q.sides).forEach(function (q, k) {
      var col = q.done ? '#2f7d3b' : '#a33a2a';
      txt(c, (k ? '支线 ' : '主线 ') + (q.done ? '✔ ' : '✘ ') + q.def.short, px + 50, y, 14, col, 'left', true);
      var rw = q.def.reward; txt(c, q.done && rw ? (rw.card ? '法宝 ' : '') + (rw.lingshi ? '灵石 +' + rw.lingshi : '') + (rw.shard ? ' 碎片 +' + rw.shard : '') : '', px + pw - 40, y, 12.5, '#a8700a', 'right', false);
      y += 24;
    });
    y += 8;
    var dead = G.heroes.filter(function (h) { return h.down; }).map(function (h) { return h.def.name; });
    var rows = [['用时', XY.fmtTime(G.t)], ['等级', G.level + ' 级'], ['击杀 / 洞府', G.kills + ' 只 · 镇灭 ' + G.dens.filter(function (d) { return !d.alive; }).length + '/' + G.dens.length], ['阵亡英雄', dead.length ? dead.join('、') : '无'], ['法宝 / 灵石', (G.cardLog ? G.cardLog.length : 0) + ' 张 · 灵石 +' + ((G.run && G.run.clearGain) || 0)]];
    rows.forEach(function (r) { txt(c, r[0], px + 50, y, 15, T.inkSoft, 'left', false); txt(c, r[1], px + pw - 40, y, 15, T.ink, 'right', true); y += 26; });
    var sp = G.spGot || [];
    if (sp.length) {
      y += 6; txt(c, '掉落角色卡', px + 40, y, 15, '#b8300f', 'left', true); y += 30;
      sp.forEach(function (g, k) { var d = XY.specialDef(g.id, Math.max(1, XY.save.spLevel(g.id))); XY.R4.avatarDisc(c, d, px + 70 + k * 190, y + 12, 18, app.rt); txt(c, XY.SP_BY[g.id].name + ' ×1', px + 96 + k * 190, y + 12, 14, T.ink, 'left', true); });
      y += 40;
    }
    verBtn(c, app, px + pw - 214, py + 14, 200, 48); if (app.menuMsg && app.rt < app.menuMsg.until) txt(c, app.menuMsg.text, W / 2, py + ph - 9, 13, '#2f7d3b', 'center', true);
    var nu = (rep.newUnlocks || []).map(function (id) { return XY.UNLOCK_BY[id].name; });
    if (nu.length) { txt(c, '★ 新解锁：' + nu.join('、'), W / 2, y, 14, '#2f7d3b', 'center', true); }
    var jn = G.mod ? '非官方玩法包：只能玩，不发任何奖励，不记通关，不影响存档' : G.dungeon ? (win ? '洞府副本不计入取经之旅：第 1 关和后面的进度都没有变（首通奖励已发）' : '副本失败不扣任何东西，再来一局就是了') : win ? (G.levelId < XY.LEVEL_COUNT ? '取经之旅：全队 Lv' + G.level + '、技能和法宝已存档，带进第 ' + (G.levelId + 1) + ' 关（阵亡的师徒也会带着等级回来）' : '取经之旅：全部关卡走完！成长已存档') : '失败不会清掉之前的积累：再来一局会回到本关开始时的状态（' + XY.journey.status(G.levelId).text + '）';
    txt(c, jn, W / 2, py + ph - 92, 13, win ? '#2f7d3b' : T.inkSoft, 'center', win);
    var by = py + ph - 74, hasNext = win && !G.dungeon && !G.mod && G.levelId < XY.LEVEL_COUNT;
    if (hasNext) { R.btn(c, app, px + 24, by, 190, 52, '下一关（可换角色）', 'nextLevel', { primary: true }); R.btn(c, app, px + 225, by, 190, 52, '再来一局（R）', 'restart'); R.btn(c, app, px + 426, by, 190, 52, '回到首页', 'home'); }
    else if (!win) { R.btn(c, app, px + 24, by, 190, 52, '再来一局（R）', 'restart', { primary: true }); R.btn(c, app, px + 225, by, 190, 52, '换角色再来', 'repick'); R.btn(c, app, px + 426, by, 190, 52, '回到首页', 'home'); }
    else { R.btn(c, app, px + 90, by, 210, 52, '再来一局（R）', 'restart', { primary: true }); R.btn(c, app, px + 340, by, 210, 52, '回到首页', 'home'); }
  }

  XY.R4.end = drawEnd;
  var old = XY.screens.draw;
  XY.screens.draw = function (c, G, app) {
    var s = app.screen;
    if (XY.pv2 && (s === 'levels' || s === 'shop') && XY.pv2.draw(c, G, app)) { if (s === 'levels' && app.confirm) old(c, G, { screen: '__none', confirm: app.confirm, lw: app.lw, lh: app.lh, mouse: app.mouse, rt: app.rt }); return; }
    if (s === 'levels') { drawLevels(c, G, app); if (app.confirm) old(c, G, { screen: '__none', confirm: app.confirm, lw: app.lw, lh: app.lh, mouse: app.mouse, rt: app.rt }); }
    else if (s === 'shop') drawShop(c, G, app);
    else old(c, G, app);
  };
})();
