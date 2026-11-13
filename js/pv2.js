/* ============================================================
 * pv2.js —— v0.8.6 手机版 UI v2：选关 / 灵石商店 / 结算，按 CSS 像素直接排版（所有按钮 ≥ 44 CSS px，字 ≥ 11~12 CSS px）。
 * 条件：ui2 开着（没加 ?ui=v1）且 zoom < 0.75（手机横 / 竖屏）。桌面 / 平板仍走原来的逻辑像素版面（只套 v2 面板样式）。
 * 点击框的 act / 字段和旧版完全一样（back / levelSel / levelGo / carryPick / menuShop / menuRestart / shopTab / shopBuy / shopBuyFb / shopBuySol / buyCard / nextLevel …）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, R = XY.R, T = R.T, S = XY.save, PI2 = Math.PI * 2, LINE = '#c9a44c';
  var P = XY.pv2 = { page: {} };
  P.on = function (app) { return !!(XY.ui2 && XY.ui2.on) && app.zoom < 0.75; };
  var K = null;                                                               // 当前帧的画布工具（CSS 像素）
  function ELC(e) { return (XY.ELEMS[e] || {}).color || '#888'; }
  function ELN(e) { return (XY.ELEMS[e] || {}).name || ''; }

  /* ---------- 工具集 ---------- */
  P.begin = function (c, app) {
    var z = app.zoom, cssW = app.lw * z, cssH = app.lh * z, s = XY.uiScale ? XY.uiScale(cssW, cssH) : 1;
    K = P.K = { c: c, app: app, z: z, s: s, W: cssW / s, H: cssH / s, port: app.lw < app.lh };
    c.save(); c.scale(s / z, s / z);
    K.over = function (x, y, w, h) { var m = app.mouse; return !!m && m.x * z >= x * s && m.x * z <= (x + w) * s && m.y * z >= y * s && m.y * z <= (y + h) * s; };
    K.hit = function (x, y, w, h, act, ex) { var o = { x: x * s / z, y: y * s / z, w: w * s / z, h: h * s / z, act: act }, k; if (ex) for (k in ex) o[k] = ex[k]; XY.ui.hits.push(o); };
    var KAI = function () { return (XY.menu && XY.menu.KAI) || XY.C.FONT; };
    K.fam = function (size, bold) { return bold !== false && size >= 16 ? KAI() : XY.C.FONT; };      // 水墨风：标题级（≥16px 粗体）用楷体，正文仍用黑体（11–14px 的楷体太细）
    K.t = function (s, x, y, size, col, al, bold) {
      var fam = K._fam || K.fam(size, bold);
      if (fam !== XY.C.FONT) { c.font = 'bold ' + size + 'px ' + fam; c.fillStyle = col; c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillText(XY.fmtStr(s), x, y); }
      else R.txt(c, s, x, y, size, col, al || 'left', bold !== false);
    };
    K.panel = function (x, y, w, h, r, fill, line) { XY.ui2.panel(c, x, y, w, h, r || 14, fill, line); };
    K.rr = function (x, y, w, h, r) { R.rrect(c, x, y, w, h, r); };
    K.ink = function(x,y,w,alpha,seed) { if(XY.INKP) XY.INKP.stroke(c,x,y,x+w,y+0.8,1.8,'58,43,27',alpha==null?.35:alpha,seed||9,.008); };
    K.btn = function(x,y,w,h,label,act,ex,o) {
      o=o||{};var hover=K.over(x,y,w,h),red=o.primary&&!o.off,col=o.off?'#948875':red?'#fff6e8':o.on?'#a92e1c':'#24180f';
      c.save();c.translate(x+w/2,y+h/2);c.rotate(red?-0.02:0.012);
      c.fillStyle=red?(hover?'#c4472e':'#a83224'):(o.on?'rgba(168,50,36,0.18)':'rgba(90,74,52,0.16)');
      c.beginPath();c.moveTo(-w/2+3,-h*.38);c.lineTo(w/2-1,-h*.42);c.lineTo(w/2-4,h*.38);c.lineTo(-w/2+2,h*.34);c.closePath();c.fill();c.restore();
      
      if(o.on) K.ink(x+w*.18,y+h-5,w*.64,.65,label.length+7);
      if(o.wrap){c.save();c.beginPath();c.rect(x+4,y+2,w-8,h-4);c.clip();K.lines(label,x+8,y+h/2-((o.size||15)+3)/2,w-16,o.size||15,(o.size||15)+3,col,0,true);c.restore();}else K.tf(label,x+w/2,y+h/2,w-6,o.size||15,col,'center',true,o.minS||11);
      if(act&&!o.off)K.hit(x,y,w,h,act,ex);
    };
    K.lines = function (s, x, y, w, size, lh, col, maxL, bold) {               // 自动换行（逐字），返回下一行 y
      c.font = (bold ? 'bold ' : '') + size + 'px ' + XY.C.FONT; s = XY.fmtStr(s); var line = '', n = 0, i, tt, units=s.match(/[+-]?\d[\d,]*(?:\.\d+)?(?:%|\/\d+|秒|级|点|倍)?|[A-Za-z][A-Za-z0-9_.-]*|[\s\S]/g)||[];
      for (i = 0; i < units.length; i++) {
        tt = line + units[i];
        if (c.measureText(tt).width > w && line) {
          if (maxL && n + 1 >= maxL) { while (line.length > 1 && c.measureText(line + '…').width > w) line = line.slice(0, -1); K.t(line + '…', x, y, size, col, 'left', bold); return y + lh; }
          K.t(line, x, y, size, col, 'left', bold); y += lh; n++; line = units[i];
        } else line = tt;
      }
      if (line) { K.t(line, x, y, size, col, 'left', bold); y += lh; }
      return y;
    };
    K.fit = function (s, w, size, bold, minS) {                                // 放不下就缩字号（最小 minS），再不行省略
      var f = size, fam = K.fam(size, bold); minS = minS || 11; c.font = (bold ? 'bold ' : '') + f + 'px ' + fam;
      while (f > minS && c.measureText(s).width > w) { f -= 0.5; c.font = (bold ? 'bold ' : '') + f + 'px ' + fam; }
      while (s.length > 1 && c.measureText(s).width > w) s = s.slice(0, -2) + '…';
      return { s: s, size: f };
    };
    K.tf = function (s, x, y, w, size, col, al, bold, minS) { var r = K.fit(s, w, size, bold !== false, minS), fam0 = K.fam(size, bold); var UA = XY.ui2 && XY.ui2.audit; if (UA) { c.font = (bold !== false ? 'bold ' : '') + r.size + 'px ' + fam0; UA.push({ s: s, kf: true, scale: r.size / size, trunc: r.s !== s, over: r.s !== s || r.size < size, w: c.measureText(r.s).width, avail: w }); } var U = XY.ui2, w0 = U && U.world; if (U) U.world = true; K._fam = fam0; K.t(r.s, x, y, r.size, col, al, bold); K._fam = null; if (U) U.world = w0; };
    K.msg = function (x, y, al, w) { var m = app.menuMsg; if (!m || app.rt > m.until) return; K.tf(m.text, x, y, w || K.W - 20, 14, m.bad ? '#b8300f' : '#2f7d3b', al || 'left', true); };
    return K;
  };
  P.end = function (c) { c.restore(); };
  /* 整页外壳：背景变暗 + 大面板 + 顶栏（返回 / 标题 / 灵石）。返回内容区 {x,y,w,h}（CSS 像素）。 */
  P.folio = {};
  P.paper = function(c,W,H){
    var wash=c.createLinearGradient(0,0,W,H);wash.addColorStop(0,'#f5ecd8');wash.addColorStop(.52,'#f7efdd');wash.addColorStop(1,'#e8ddbe');c.fillStyle=wash;c.fillRect(0,0,W,H);
    if(!P.paperGrain){var cv=P.paperGrain=document.createElement('canvas');cv.width=cv.height=128;var g=cv.getContext('2d');g.fillStyle='rgba(88,65,32,.045)';for(var i=0;i<480;i++){var xx=(i*47.33)%128,yy=(i*83.17)%128;g.fillRect(xx,yy,i%4===0?3:1,1);}}
    c.fillStyle=c.createPattern(P.paperGrain,'repeat');c.fillRect(0,0,W,H);
  };
  P.frame = function(c,app,title,o) {
    P.begin(c,app);var W=K.W,H=K.H,m=6;
    P.paper(c,W,H);
    K.btn(10,9,76,44,'← 返回','back',null,{size:15});
    K.t(title,102,32,24,'#a42d19','left',true);
    c.font='bold 16px '+XY.C.FONT;var chip='灵石 '+S.data.lingshi,cw=Math.ceil(c.measureText(chip).width)+52,cx=W-14-cw;
    K.t(chip,W-20,31,16,T.ink,'right',true);K.ink(cx+16,49,cw-22,.22,13);
    K.ink(16,58,Math.min(W*.28,260),.43,21);
    return{x:16,y:62,w:W-32,h:H-74,chipX:cx};
  };
  // 收藏卷面共用的物件签：单条错落手卷，不堆等宽格。
  P.objects = function(c,app,list,b,selected,act,paint,label) {
    var n=list.length;if(!n)return;var step=b.w/n,bw=Math.min(82,step-4),hh=Math.min(88,b.h-24);
    list.forEach(function(it,i){var cx=b.x+step*(i+.5),dy=[7,0,11,3,9,1][i%6],yy=b.y+dy,on=selected===it.id;
      
      paint(it,cx,yy+hh*.48,Math.max(30,bw),hh);
      var name=label(it),nw=step-4;c.font='bold 11.5px '+XY.C.FONT;var wrap=c.measureText(name).width>nw,cut=Math.ceil(name.length/2);K.t(wrap?name.slice(0,cut):name,cx,yy+hh+9,11.5,on?'#a42d19':T.ink,'center',true);if(wrap)K.t(name.slice(cut),cx,yy+hh+23,11.5,on?'#a42d19':T.ink,'center',true);
      if(on)K.ink(cx-Math.min(22,step*.3),yy+hh+(wrap?31:20),Math.min(44,step*.6),.7,i+31);
      if(act)K.hit(cx-step/2+2,b.y,Math.max(36,step-4),b.h+12,act,{id:it.id});
    });
  };
  P.object = function(c,name,x,y,size,locked) {
    c.save();if(locked)c.globalAlpha=.4;
    if(!(XY.ICONINK&&XY.ICONINK.draw(c,name,x,y,Math.min(size,96)))){var gz=Math.min(28,Math.max(16,size*0.22));c.font='bold '+gz+'px '+XY.menu.KAI;c.fillStyle=T.ink;c.textAlign='center';c.textBaseline='middle';c.fillText(name.charAt(0),x,y);}
    c.restore();
  };
  P.pager = function (n, per, key, x, y, w, quiet) {                                    // 翻页条（n 项，每页 per 项）；返回当前页起点
    var pg = Math.max(0, Math.min(P.page[key] || 0, Math.ceil(n / per) - 1)); P.page[key] = pg;
    if (n > per) {
      var tot = Math.ceil(n / per);
      K.t('上页', x + 28, y + 22, 16, pg === 0 ? '#b5aa96' : '#24180f', 'center', true);
      if (XY.INKP && pg > 0) XY.INKP.stroke(K.c, x + 8, y + 36, x + 52, y + 36, 1.2, '83,61,34', 0.45, 2, 0.01);
      if (pg > 0) K.hit(x, y, 72, 44, 'pvPage', { key: key, d: -1 });
      if(!quiet)K.t((pg + 1) + ' / ' + tot, x + w / 2, y + 22, 15, T.inkSoft, 'center', true);
      K.t('下页', x + w - 28, y + 22, 16, pg >= tot - 1 ? '#b5aa96' : '#24180f', 'center', true);
      if (XY.INKP && pg < tot - 1) XY.INKP.stroke(K.c, x + w - 52, y + 36, x + w - 8, y + 36, 1.2, '83,61,34', 0.45, 3, 0.01);
      if (pg < tot - 1) K.hit(x + w - 72, y, 72, 44, 'pvPage', { key: key, d: 1 });
    }
    return pg * per;
  };

  /* ================= 选关 + 携带角色 ================= */
  function levels(c, G, app) {
    var f = P.frame(c, app, '出发'), W = K.W, H = K.H, port = K.port, i, cur = S.carryId(), rt = app.rt;
    // —— 关卡
    var n = XY.LEVEL_COUNT, x0 = f.x, y0 = f.y, ids = XY.SPECIALS.map(function (d) { return d.id; });
    var lw, chipW, chipH = 52, detX, detY, detW, detH, carX, carY, carW;
    if (port) { lw = f.w; chipW = (lw - (n - 1) * 8) / n; detX = x0; detY = y0 + chipH + 8; detW = f.w; detH = 206; carX = x0; carY = detY + detH + 10; carW = f.w; }
    else { lw = 300; chipW = lw; detX = x0; detW = lw; carX = x0 + lw + 12; carW = f.w - lw - 12; carY = y0; }
    var lvY = y0;
    for (i = 1; i <= n; i++) {
      var L = XY.levelOf(i), unl = S.levelUnlocked(i), info = S.levelInfo(i), sel = app.levelId === i && unl, cleared = info && info.cleared;
      var x = port ? x0 + (i - 1) * (chipW + 8) : x0, y = port ? y0 : y0 + (i - 1) * (46 + 4), ch = port ? chipH : 46;
      K.rr(x, y, chipW, ch, 12); c.fillStyle = unl ? (sel ? '#fff0c4' : (K.over(x, y, chipW, ch) ? '#fff8e6' : '#fffdf6')) : '#ebe8df'; c.fill(); c.lineWidth = sel ? 3 : 1.6; c.strokeStyle = sel ? '#d9433a' : (unl ? '#c9a24a' : '#c9c4b4'); c.stroke();
      c.fillStyle = unl ? '#d9433a' : '#aaa59a'; c.beginPath(); c.arc(x + 20, y + ch / 2, 14, 0, PI2); c.fill(); K.t(String(i), x + 20, y + ch / 2 + 0.5, 17, '#fff', 'center', true);
      if (port) { K.tf(L.name, x + 38, y + 19, chipW - 44, 16, unl ? T.ink : '#8a8576', 'left', true, 12); K.t(cleared ? '✔ 已通关' : (unl ? '可挑战' : '🔒 未解锁'), x + 38, y + 39, 12, cleared ? '#2f7d3b' : '#8a8576', 'left', true); }
      else { K.tf(L.name, x + 42, y + 17, chipW - 52 - (cleared ? 70 : 0), 16, unl ? T.ink : '#8a8576', 'left', true, 12); K.t(unl ? (L.dens.length + ' 座洞府') : '🔒 通关上一关后解锁', x + 42, y + 36, 12, T.inkSoft, 'left', false); if (cleared) K.t('✔ 已通关', x + chipW - 10, y + 17, 12, '#2f7d3b', 'right', true); }
      if (unl) K.hit(x, y, chipW, ch, 'levelSel', { n: i });
    }
    if (!port) { detY = y0 + n * 50 + 4; detH = f.h - n * 50 - 4; }
    // —— 关卡详情
    var Ls = XY.levelOf(app.levelId), unlS = S.levelUnlocked(app.levelId), infoS = S.levelInfo(app.levelId);
    K.panel(detX, detY, detW, detH, 14, 'rgba(255,250,236,0.98)');
    var ty = detY + 18;
    K.tf(Ls.name + ' · ' + Ls.sub, detX + 12, ty, detW - 24, 15, T.ink, 'left', true, 12); ty += 22;
    Ls.dens.forEach(function (d) { var e = XY.ENEMIES[d.boss]; c.fillStyle = ELC(e.elem); c.beginPath(); c.arc(detX + 18, ty, 4.5, 0, PI2); c.fill(); K.tf('洞府 ' + d.name + ' · ' + e.name + '（' + ELN(e.elem) + '）', detX + 30, ty, detW - 42, 12.5, T.ink, 'left', false, 11); ty += 18; });
    K.tf('主线：' + Ls.main.short + (Ls.sides.length ? ' · 支线 ' + (infoS ? S.levelSides(app.levelId) : 0) + '/' + Ls.sides.length : ''), detX + 12, ty + 2, detW - 24, 12.5, '#b8300f', 'left', true, 11); ty += 20;
    if (ty + 16 < detY + detH - 58) K.tf('终点：西行关口「' + Ls.gate.name + '」' + (infoS && infoS.best ? ' · 最快 ' + XY.fmtTime(infoS.best) : ''), detX + 12, ty + 2, detW - 24, 12.5, '#a8700a', 'left', true, 11);
    if (!port || detH > 190) Ls.sides.forEach(function (sd) { if (ty + 18 < detY + detH - 56) { ty += 18; K.tf('支线：' + sd.short, detX + 12, ty + 2, detW - 24, 12, T.inkSoft, 'left', false, 10.5); } });
    K.btn(detX + 10, detY + detH - 54, detW - 20, 46, unlS ? '出发！' : '未解锁', 'levelGo', { n: app.levelId }, { primary: true, off: !unlS, size: 18 });
    // —— 携带常驻角色
    var cy = carY, cols = port ? 5 : Math.max(5, Math.floor(carW / 66)), gap = 6, tw = (carW - (cols - 1) * gap) / cols, th = port ? 86 : 78, js = XY.journey.status(app.levelId);
    K.t('携带常驻角色', carX + 2, cy + 10, 15, '#b8300f', 'left', true);
    K.tf(XY.TEST_BUILD ? '全员可选、不写存档' : (carW < 340 ? '没抽到的仍锁' : '没抽到的要集齐 ' + XY.SP_LV_AT[0] + ' 张角色卡'), carX + carW - 2, cy + 10, carW - 130, 12, T.inkSoft, 'right', false, 11);
    cy += 24;
    var tiles = [{ id: null }].concat(ids.map(function (id) { return { id: id }; })), XC = XY.xchar, rec = XC && (XC.get(cur) || XC.list[0]);
    if (rec) tiles.push({ id: rec.id, xc: true, rec: rec }); if (S.xcharOpen && S.xcharOpen() && (!XC || !rec || (XC.list && XC.MAX && XC.list.length < XC.MAX))) tiles.push({ id: '_xc', xc: true, rec: null });   // 已有自建角色时，没满额就仍留一个「＋自建」空位
    var rows0 = Math.ceil(tiles.length / cols); th = Math.max(64, Math.min(th, Math.floor((f.y + f.h - 46 - 18 - cy - rows0 * gap) / rows0)));   // 横屏手机矮：卡格按剩余高度收矮，别压到底栏按钮
    tiles.forEach(function (tl, j) {
      var x = carX + (j % cols) * (tw + gap), y = cy + Math.floor(j / cols) * (th + gap), id = tl.id, hv = K.over(x, y, tw, th);
      if (tl.id === '_q') { K.rr(x, y, tw, th, 10); c.fillStyle = '#ebe8df'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#c9c4b4'; c.stroke(); K.t('？', x + tw / 2, y + th / 2, 28, '#b5af9e', 'center', true); K.hit(x, y, tw, th, 'lockedSlot'); return; }
      if (id === null) { var none = !cur; K.rr(x, y, tw, th, 10); c.fillStyle = none ? '#cfeccb' : '#fbf6ea'; c.fill(); c.lineWidth = none ? 3 : 1.4; c.strokeStyle = none ? '#43a047' : '#c9b98f'; c.stroke(); K.t('不带', x + tw / 2, y + th / 2, 15, T.ink, 'center', true); K.hit(x, y, tw, th, 'carryPick', { id: null }); return; }
      if (tl.xc && !tl.rec) { K.rr(x, y, tw, th, 10); c.fillStyle = hv ? '#fff3d6' : '#fffaf0'; c.fill(); c.save(); c.setLineDash([5, 4]); c.lineWidth = 1.8; c.strokeStyle = '#c9a24a'; c.stroke(); c.restore(); K.t('＋', x + tw / 2, y + th * 0.36, 28, '#c8341f', 'center', true); K.t('自建', x + tw / 2, y + th * 0.72, 13, T.ink, 'center', true); K.hit(x, y, tw, th, 'xchar'); return; }
      var d = XY.SP_BY[id], owned = tl.xc ? true : S.spOwned(id), lv = tl.xc ? XC.LV : S.spLevel(id), sl = cur === id;
      K.rr(x, y, tw, th, 10); c.fillStyle = sl ? '#cfeccb' : (owned ? (hv ? '#fff3d6' : '#fffdf6') : '#ebe8df'); c.fill(); c.lineWidth = sl ? 3 : 1.6; c.strokeStyle = sl ? '#43a047' : (owned ? d.frame : '#c9c4b4'); c.stroke();
      c.save(); if (!owned) c.globalAlpha = 0.45; XY.R4.avatarDisc(c, XY.specialDef(id, Math.max(1, lv)), x + tw / 2, y + 6 + Math.min(16, th * 0.18), Math.min(16, th * 0.18), rt); c.restore();
      K.tf(d.name, x + tw / 2, y + th - 24, tw - 4, 12.5, owned ? T.ink : '#8a8576', 'center', true, 9);
      K.tf(owned ? (tl.xc ? '自建' : 'Lv' + lv) : '未获得', x + tw / 2, y + th - 11, tw - 6, 11.5, owned ? '#a8700a' : '#9a9586', 'center', false, 10.5);
      K.hit(x, y, tw, th, 'carryPick', { id: id });
    });
    var rows = Math.ceil(tiles.length / cols), iy = cy + rows * (th + gap) + 2;
    var infoMax = f.y + f.h - 46 - 30;                                          // 底栏「取经之旅」那行之上才有地方放说明
    if (cur) { if (iy + 14 < infoMax) K.tf(XY.SP_BY[cur].name + ' Lv' + S.spLevel(cur) + ' · ' + XY.SP_BY[cur].role, carX + 2, iy + 6, carW - 4, 13, T.ink, 'left', true, 11); iy += 18; if (iy + 14 < infoMax) K.tf(XY.synText(cur), carX + 2, iy + 6, carW - 4, 12, T.inkSoft, 'left', false, 10.5); iy += 18; }
    else { K.t('本关：不带常驻角色', carX + 2, iy + 6, 13, T.inkSoft, 'left', true); iy += 18; }
    // —— 底栏：取经之旅 + 按钮
    var by = f.y + f.h - 46, bx = carX, bw = carW;
    var jt = '取经之旅 · 第 ' + app.levelId + ' 关：' + js.text; K.tf(jt, carX + 2, by - 14, carW - 4, 12, js.inherit ? '#2f7d3b' : T.inkSoft, 'left', js.inherit, 10.5);
    var nb = 2, gw = (bw - (nb - 1) * 8) / nb, k = 0;
    K.btn(bx + k++ * (gw + 8), by, gw, 44, '重新开始取经', 'menuRestart', null, { danger: true, size: 14 });
    K.btn(bx + k++ * (gw + 8), by, gw, 44, '灵石商店', 'menuShop', null, { primary: true, size: 16 });
    if (!port) { P.verSlot = { x: 236, y: f.y - 52, w: 210, h: 44 }; }                   // 横屏：版本开关放进标题行（底栏只剩两个按钮，不挤）
    // 版本开关
    P.end(c);
    var vs = port ? { x: f.x + f.w - 150 - 0, y: 0, w: 0, h: 0 } : P.verSlot; if (!port && vs) XY.menu.verSwitch(c, app, vs.x / K.z, vs.y / K.z, vs.w / K.z, vs.h / K.z);
    if (port) { var vy = by - 52, vz = K.z; XY.menu.verSwitch(c, app, carX / vz, (by - 40) / vz, carW / vz, 36 / vz); }   // 竖屏：版本开关放在底栏上方一行
  }

  /* ================= 灵石商店 ================= */
  function shop(c, G, app) {
    var f = P.frame(c, app, '灵石商店'), W = K.W, port = K.port, st = XY.shop.stock(), tab = app.shopTab || 'shelf', i;
    var TABS = [['shelf', '货架'], ['fb', '法宝解锁'], ['sol', '天兵卡']], tx = f.x, ty0 = port ? f.y : f.y - 52, tx0 = port ? f.x : 236, tw = port ? (f.w - 16) / 3 : Math.max(64, Math.min(104, (f.chipX - tx0 - 24) / 3));
    TABS.forEach(function (tb, k) {
      var bx = tx0 + k * (tw + 8), on = tab === tb[0], VU0 = XY.villainUI;
      if (VU0 && VU0.drawBrush) VU0.drawBrush(c, bx, ty0, tw, 40, tb[1], { sz: 16, strong: on, vh: 30, rgb: on ? '168,50,36' : '58,50,38' });
      else K.btn(bx, ty0, tw, 40, tb[1], 'shopTab', { k: tb[0] }, { on: on, size: 16 });
      K.hit(bx, ty0, tw, 40, 'shopTab', { k: tb[0] });
    });
    var items = [];                                                            // 统一成行：{icon(fn), title, lines[], btn:{label,act,ex,primary,off}, sold}
    var can = function (p) { return S.data.lingshi >= p; };
    if (tab === 'shelf') {
      if (XY.lazy && XY.lazy.pending && XY.lazy.pending('ui') && XY.lazy.start) {
        XY.lazy.start();
        if (XY.lazy.after) XY.lazy.after('ui', function () { if (XY.ICONINK && XY.ICONINK.preload) XY.ICONINK.preload(); });
      } else if (XY.ICONINK && XY.ICONINK.preload) XY.ICONINK.preload();
      st.slots.forEach(function (sl, k) {
        var sold = st.sold[k], r = { sold: sold, kind: sl.kind, price: sl.price, btn: { label: sold ? '已买走' : (sl.kind === 'reroll' ? '刷新 ' : '买 ') + sl.price + (can(sl.price) ? '' : ' 不够'), act: sold ? null : 'shopBuy', ex: { slot: k }, primary: !sold && can(sl.price), off: sold || !can(sl.price) } };
        if (sl.kind === 'sp') { r.spId=sl.id; var d = XY.SP_BY[sl.id], lv = S.spLevel(sl.id), nx = XY.spNext(sl.id); r.title = '角色卡 · ' + d.name; r.sub = d.role; r.l2 = lv ? '已有 ' + S.spCards(sl.id) + ' 张 · Lv' + lv + (nx ? '（再 ' + (nx.need - nx.have) + ' 张升级）' : '（满级）') : '已有 ' + S.spCards(sl.id) + '/' + XY.SP_LV_AT[0] + ' 张'; r.icon = function (x, y, s) { var hd=XY.specialDef(sl.id,Math.max(1,lv)); XY.hud2.face(c,{id:sl.id,def:hd},x+s/2,y+s/2,s*.44,app.rt); }; r.col = d.frame; }
        else if (sl.kind === 'card') { var cd = XY.CARD_BY[sl.id], Rr = XY.RARITY[cd.r]; r.card = cd; r.inkName = cd.name; r.title = '法宝 · ' + cd.name; r.sub = Rr.name + ' · ' + XY.CARD_SETS[cd.set].name + '套'; r.l2 = XY.cardFxText(cd, 1); r.icon = function (x, y, s) { R.drawCardMini(c, cd, x + s / 2, y + s / 2, s * 0.7, s, 1); }; r.col = Rr.color; }
        else if (sl.kind === 'shard') { r.title = '皮肤碎片 ' + sl.n + ' 件'; r.sub = '集齐解锁皮肤'; r.l2 = '现有 ' + S.data.shards + ' 枚'; r.icon = function (x, y, s) { if (!shop._shardIm) { shop._shardIm = new Image(); shop._shardIm.src = 'assets/art/x-avatars/heyuxi.webp'; } c.save(); c.beginPath(); c.moveTo(x + 6, y + 8); c.lineTo(x + s * 0.7, y + 4); c.lineTo(x + s * 0.6, y + s * 0.4); c.lineTo(x + s * 0.78, y + s * 0.55); c.lineTo(x + s * 0.5, y + s - 6); c.lineTo(x + 4, y + s - 10); c.closePath(); c.clip(); var sim = shop._shardIm; if (sim.complete && sim.naturalWidth) c.drawImage(sim, x, y, s, s); else { c.fillStyle = '#d7b48a'; c.fill(); } c.restore(); }; }
        else { r.title = '刷新货架'; r.sub = '换一批角色卡和法宝'; r.l2 = ''; r.icon = function (x, y, s) { c.strokeStyle = '#8a7d63'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.3, 0.6, 5.4); c.stroke(); c.lineCap = 'butt'; }; }
        items.push(r);
      });
    } else {
      if (tab === 'sol') { if (XY.lazy && XY.lazy.start) XY.lazy.start(); if (XY.SINK && XY.SINK.preload) XY.SINK.preload(); }
      var list = tab === 'fb' ? XY.shop.fbList() : XY.shop.solList();
      list.forEach(function (r0) {
        var ok = can(r0.price) && !r0.full, r = { btn: { label: r0.full ? '已满级' : (tab === 'fb' ? '解锁 ' : '买 1 张 ') + r0.price + (ok || r0.full ? '' : ' 不够'), act: tab === 'fb' ? 'shopBuyFb' : 'shopBuySol', ex: tab === 'fb' ? { id: r0.id } : { t: r0.type }, primary: ok, off: !ok } };
        if (tab === 'fb') { var it = XY.fabao.BY[r0.id]; r.kind = 'fb'; r.inkName = it.name; r.price = r0.price; r.full = r0.full; r.title = (it.kind === 'l' ? '灵物 · ' : '法宝 · ') + it.name; r.sub = it.d; r.l2 = XY.fabao.whereText(r0.id) ? '也可以：' + XY.fabao.whereText(r0.id) : ''; r.icon = function (x, y, s) { if (!(XY.ICONINK && XY.ICONINK.draw(c, it.name, x + s / 2, y + s / 2, s * 0.9))) K.t(it.name.charAt(0), x + s / 2, y + s / 2, Math.max(28, Math.round(s * 0.42)), T.ink, 'center', true); }; }
        else { var td = XY.TOWERS[r0.type]; r.kind = 'sol'; r.sol = r0.type; r.price = r0.price; r.cards = r0.cards; r.lv = r0.lv; r.full = r0.full; r.title = td.name; r.sub = '已有 ' + r0.cards + ' 张 · ' + (r0.lv >= 3 ? '首领' : r0.lv === 2 ? '二阶' : r0.lv === 1 ? '一阶' : '未得'); r.l2 = r0.full ? '已满级' : '造价 ' + td.cost + ' 金币'; r.icon = function (x, y, s) { if (!(XY.ICONINK && XY.ICONINK.sol(c, r0.type, x + s / 2, y + s * 0.5, s * 0.92))) K.t(td.name.charAt(0), x + s / 2, y + s / 2, Math.max(28, Math.round(s * 0.42)), T.ink, 'center', true); }; }
        items.push(r);
      });
    }
    var note = tab === 'shelf' ? '角色卡和法宝用灵石买。灵石靠通关获得。点一张就买，不够会告诉你。' : (tab === 'fb' ? '买下就永久解锁，开局可以带。洞主专属的不在这里卖。' : '天兵卡：一张一阶，三张二阶，六张首领。每次买一张。');
    if (tab === 'shelf') {
      var VU0 = XY.villainUI;
      var cards = [], reroll = null, ri;
      for (ri = 0; ri < items.length; ri++) { if (items[ri].kind === 'reroll') reroll = items[ri]; else cards.push(items[ri]); }
      var nCard = Math.max(1, cards.length), narrow = port || f.w < 720;
      var cols = narrow ? Math.min(2, nCard) : nCard, rows = Math.ceil(nCard / cols);
      var sealW = narrow ? 52 : 68, gapS = narrow ? 10 : 14;
      var rowTop = port ? ty0 + 50 : f.y + 2, rowBot = f.y + f.h - (port ? 86 : 42);
      var availH = Math.max(72, rowBot - rowTop);
      var availW = Math.max(80, f.w - (narrow ? 12 : sealW + gapS));
      var cardH = narrow ? 0 : Math.floor(availH * 0.82);
      var cardW = narrow ? 0 : Math.floor(cardH * 3 / 4);
      var step = cardW + gapS;
      if (!narrow) {
        var gaps = gapS * Math.max(0, cols - 1);
        if (cols * cardW + gaps > availW) cardW = Math.floor((availW - gaps) / cols);
        step = cardW + gapS;
      } else {
        cardW = Math.floor((availW - gapS * (cols - 1)) / cols);
        cardH = Math.floor(cardW * 4 / 3);
        var stackTry = rows * cardH + gapS * (rows - 1);
        if (stackTry > availH) { cardH = Math.floor((availH - gapS * (rows - 1)) / rows); cardW = Math.floor(cardH * 3 / 4); }
        step = cardW + gapS;
      }
      var rowW = cardW + (cols - 1) * step;
      var stackH = rows * cardH + gapS * (rows - 1);
      var x0s = f.x + Math.max(0, ((narrow ? f.w : availW) - rowW) / 2);
      var y0s = rowTop + Math.max(0, (availH - (narrow ? stackH : cardH)) / 2);
      function shelfMask(im, w, h) {
        var key = (im.src || '') + '|' + w + 'x' + h, bag = shop._ink || (shop._ink = {}), cv = bag[key];
        if (cv) return cv;
        var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
        cv = document.createElement('canvas'); cv.width = Math.max(2, w); cv.height = Math.max(2, h);
        var g = cv.getContext('2d'), sc = Math.max(w / iw, h / ih) * 1.08, dw = iw * sc, dh = ih * sc;
        var scFit = Math.min(w / iw, h / ih) * 0.92, dwFit = iw * scFit, dhFit = ih * scFit;
        g.drawImage(im, (w - dwFit) / 2, (h - dhFit) / 2, dwFit, dhFit);
        var mk = document.createElement('canvas'); mk.width = cv.width; mk.height = cv.height;
        var q = mk.getContext('2d'), amp = Math.min(w, h) * 0.028, n = 16, t, seed = (iw * 3 + ih) % 40;
        function jig(k) { return Math.sin(seed + k * 1.7) * amp; }
        q.beginPath();
        q.moveTo(amp + jig(0), amp);
        for (t = 1; t <= n; t++) q.lineTo(w * t / n + jig(t), amp * 0.4 + jig(t + 2));
        for (t = 1; t <= n; t++) q.lineTo(w - amp + jig(t + 8), h * t / n + jig(t + 4));
        for (t = n; t >= 0; t--) q.lineTo(w * t / n + jig(t + 12), h - amp * 0.5 + jig(t + 6));
        for (t = n; t >= 1; t--) q.lineTo(amp * 0.4 + jig(t + 16), h * t / n);
        q.closePath(); q.fillStyle = '#000'; q.fill();
        q.globalCompositeOperation = 'destination-in';
        var edge = Math.max(6, Math.min(w, h) * 0.045);
        var gx = q.createLinearGradient(0, 0, w, 0);
        gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(edge / w, '#000'); gx.addColorStop(1 - edge / w, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
        q.fillStyle = gx; q.fillRect(0, 0, w, h);
        var gy = q.createLinearGradient(0, 0, 0, h);
        gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(edge / h, '#000'); gy.addColorStop(0.92, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
        q.fillStyle = gy; q.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'destination-in'; g.drawImage(mk, 0, 0);
        bag[key] = cv; return cv;
      }
      cards.forEach(function (r, k) {
        var col = k % cols, row = (k / cols) | 0, x = x0s + col * step, y = y0s + row * (cardH + gapS);
        var nameSize = Math.max(13, Math.min(20, cardW * 0.12));
        var subSize = Math.max(11, Math.min(14, cardW * 0.075));
        var sealW0 = Math.max(28, Math.min(40, cardW * 0.28));
        var side = Math.min((cardW - sealW0 * 0.85) * 0.78, cardH * 0.42, 140);
        var artY = y + 8;
        var nameY = artY + side + nameSize * 0.7;
        var subY = nameY + nameSize * 0.45 + subSize * 0.65;
        var limit = y + cardH - 6;
        if (subY + subSize * 0.45 > limit) {
          side = Math.max(28, side - (subY + subSize * 0.45 - limit));
          nameY = artY + side + nameSize * 0.7;
          subY = nameY + nameSize * 0.45 + subSize * 0.65;
        }
        var ax = x + Math.max(4, (cardW - sealW0 * 0.7 - side) / 2), ay = artY;
        var drew = false;
        if (r.spId && XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(r.spId)) {
          drew = !!XY.xAvIcon.draw(c, r.spId, ax, ay, side, side);
        }
        if (!drew && r.spId && XY.bgArt) {
          var im = XY.bgArt(r.spId);
          if (im && (im.naturalWidth || im.width)) { c.drawImage(shelfMask(im, side, side), ax, ay, side, side); drew = true; }
        }
        if (!drew && r.kind === 'card' && XY.ICONINK && r.inkName) {
          var art = Math.min(side * 0.92, 140);
          drew = !!XY.ICONINK.draw(c, r.inkName, x + cardW / 2, ay + side / 2, art);
        }
        if (!drew && r.kind === 'shard') {
          var sw = side * 0.86, sh = side * 0.62, sx = x + (cardW - sw) / 2, sy = ay + (side - sh) / 2;
          if (!shop._shardIm) { shop._shardIm = new Image(); shop._shardIm.src = 'assets/art/x-avatars/heyuxi.webp'; }
          c.save();
          c.beginPath();
          c.moveTo(sx + sw * 0.08, sy + sh * 0.12);
          c.quadraticCurveTo(sx + sw * 0.4, sy - sh * 0.04, sx + sw * 0.66, sy + sh * 0.06);
          c.quadraticCurveTo(sx + sw * 0.58, sy + sh * 0.22, sx + sw * 0.74, sy + sh * 0.36);
          c.quadraticCurveTo(sx + sw * 0.52, sy + sh * 0.5, sx + sw * 0.7, sy + sh * 0.72);
          c.quadraticCurveTo(sx + sw * 0.46, sy + sh * 0.9, sx + sw * 0.08, sy + sh * 0.84);
          c.quadraticCurveTo(sx - sw * 0.02, sy + sh * 0.4, sx + sw * 0.08, sy + sh * 0.12);
          c.closePath(); c.clip();
          var sim = shop._shardIm;
          if (sim.complete && sim.naturalWidth) c.drawImage(sim, sx - sw * 0.15, sy, sw * 1.35, sh);
          else { c.fillStyle = '#d7b48a'; c.fillRect(sx, sy, sw, sh); }
          c.restore();
          c.save();
          c.strokeStyle = 'rgba(176,156,132,0.75)'; c.lineWidth = 5; c.lineJoin = 'round'; c.lineCap = 'round';
          c.beginPath();
          c.moveTo(sx + sw * 0.08, sy + sh * 0.12);
          c.quadraticCurveTo(sx + sw * 0.4, sy - sh * 0.04, sx + sw * 0.66, sy + sh * 0.06);
          c.quadraticCurveTo(sx + sw * 0.58, sy + sh * 0.22, sx + sw * 0.74, sy + sh * 0.36);
          c.quadraticCurveTo(sx + sw * 0.52, sy + sh * 0.5, sx + sw * 0.7, sy + sh * 0.72);
          c.quadraticCurveTo(sx + sw * 0.46, sy + sh * 0.9, sx + sw * 0.08, sy + sh * 0.84);
          c.quadraticCurveTo(sx - sw * 0.02, sy + sh * 0.4, sx + sw * 0.08, sy + sh * 0.12);
          c.stroke();
          c.restore();
          drew = true;
        }
        if (!drew && r.spId) {
          c.save(); c.fillStyle = 'rgba(90,70,48,0.12)'; c.beginPath(); c.arc(x + cardW / 2, ay + side / 2, side * 0.46, 0, Math.PI * 2); c.fill(); c.restore();
        }
        var nm = String(r.title || '').replace(/^天兵卡 · |^角色卡 · |^法宝 · |^灵物 · /, '');
        c.save();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        var ns = nameSize;
        c.font = ns + 'px "Ma Shan Zheng","KaiTi",serif';
        while (ns > 11 && c.measureText(nm).width > cardW - 10) { ns -= 0.5; c.font = ns + 'px "Ma Shan Zheng","KaiTi",serif'; }
        c.fillStyle = '#24180f'; c.fillText(nm, x + cardW / 2, nameY);
        c.restore();
        if (r.sub) {
          c.save();
          var ss2 = subSize;
          c.font = ss2 + 'px "Ma Shan Zheng","KaiTi",serif';
          c.fillStyle = '#5c4a38'; c.textAlign = 'center'; c.textBaseline = 'middle';
          var sub = String(r.sub);
          while (ss2 > 10 && c.measureText(sub).width > cardW - 8) { ss2 -= 0.5; c.font = ss2 + 'px "Ma Shan Zheng","KaiTi",serif'; }
          c.fillText(sub, x + cardW / 2, subY);
          c.restore();
        }
        var seal = r.full ? '满' : (r.sold ? '售' : String(r.price == null ? '' : r.price));
        var ss = Math.max(28, Math.min(40, cardW * 0.28));
        if (VU0 && VU0.drawSeal) VU0.drawSeal(c, x + cardW - ss * 0.72, y + 4, ss, ss, seal, { style: 'solid', col: '#b8322a', sz: Math.round(ss * 0.42), stack: false, rot: -0.05 });
        if (r.btn && r.btn.act) K.hit(x, y, cardW, cardH, r.btn.act, r.btn.ex);
      });
      if (reroll && VU0 && VU0.drawSeal) {
        var orphan = narrow && (nCard % cols) === 1;
        var rx = orphan ? (x0s + step + (cardW - sealW) / 2) : (f.x + f.w - sealW - 2);
        var ry = orphan ? (y0s + (rows - 1) * (cardH + gapS) + (cardH - sealW) / 2) : (y0s + Math.max(0, (cardH - sealW) / 2));
        VU0.drawSeal(c, rx, ry, sealW, sealW, '换', { style: 'solid', sz: Math.round(sealW * 0.46), stack: false, rot: -0.05 });
        if (reroll.btn && reroll.btn.act) K.hit(rx, ry, sealW, sealW, 'shopBuy', reroll.btn.ex);
      }
      c.save();
      c.font = '16px "Ma Shan Zheng","KaiTi",serif';
      c.fillStyle = '#5c4a38'; c.textAlign = 'left'; c.textBaseline = 'middle';
      var noteMax = Math.max(80, f.w - sealW - 28), noteSz = 16;
      while (noteSz > 12 && c.measureText(note).width > noteMax) { noteSz -= 0.5; c.font = noteSz + 'px "Ma Shan Zheng","KaiTi",serif'; }
      c.fillText(note, f.x + 8, f.y + f.h - 22);
      c.restore();
      P.end(c);
    } else {
    var cols = tab === 'sol' ? (port ? 2 : Math.min(4, Math.max(2, Math.ceil(Math.max(1, items.length) / 2)))) : (tab === 'fb' ? (port ? 2 : 4) : (port ? 2 : 3));
    var rowsN = Math.max(1, Math.ceil(Math.max(1, Math.min(items.length || 1, (tab === 'sol' ? items.length : (port ? cols * 3 : cols * 2)))) / cols));
    if (!items.length) rowsN = 1;
    var per = cols * rowsN;
    var needPager = items.length > per;
    var showBuy = tab === 'shelf';
    var ctrlY = f.y + f.h - 8 - 44;
    var noteY = (needPager || showBuy) ? ctrlY - 22 : f.y + f.h - 16;
    var gridTop = (port ? ty0 + 54 : f.y + 8) + 28;
    c.save(); c.font = (tab === 'sol' ? 22 : 16) + 'px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#24180f'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(note, f.x + 8, gridTop - 16); c.restore();
    var gridBot = noteY - 18;
    var gap = port ? 8 : 14;
    var from = P.pager(items.length, per, 'shop-' + tab, f.x, ctrlY, f.w, true);
    var availW = f.w, availH = Math.max(120, gridBot - gridTop);
    var shownN = Math.max(1, Math.min(items.length || 1, cols * rowsN));
    var rowsUsed = Math.max(1, Math.ceil(shownN / cols));
    var cardW = Math.floor((availW - gap * (cols - 1)) / cols);
    var cardH = Math.floor((availH - gap * (rowsUsed - 1)) / rowsUsed); if (tab !== 'sol') cardH = Math.min(300, cardH);
    var gridW = cols * cardW + gap * (cols - 1);
    var x0 = f.x + Math.max(0, Math.round((f.w - gridW) / 2));
    function inkName(text, x, y, size, col, maxW) {
      text = String(text || '');
      c.save();
      var face = '"Ma Shan Zheng","TDBrush",serif';
      c.font = size + 'px ' + face; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col || '#24180f';
      if (maxW && c.measureText(text).width > maxW) { size = Math.max(12, size * maxW / c.measureText(text).width); c.font = size + 'px ' + face; }
      c.fillText(text, x, y); c.restore();
    }
    function cinnabar(x, y, s, ch) {
      var VU = XY.villainUI;
      if (VU && VU.drawSeal) VU.drawSeal(c, x, y, s, s, ch, { style: 'solid', col: '#b8322a', sz: Math.round(s * 0.56), rot: -0.05, stack: false });
    }
    function coverArt(im, x, y, w, h) {
      if (!im) return false;
      var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      if (!iw || !ih) return false;
      var ir = iw / ih, br = w / h, dw, dh, dx, dy;
      if (ir > br) { dh = h; dw = h * ir; dx = x - (dw - w) / 2; dy = y; }
      else { dw = w; dh = w / ir; dx = x; dy = y - (dh - h) * 0.12; }
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.drawImage(im, dx, dy, dw, dh); c.restore();
      return true;
    }
    if (!items.length) K.lines('能买的法宝和灵物都已解锁。其余的要靠击败洞主得到。', f.x + 16, gridTop + 36, f.w - 32, 16, 22, T.inkSoft, 4, true);
    function torn(x, y, w, h, seed) {
      c.save(); c.fillStyle = '#f6efe2';
      c.beginPath();
      c.moveTo(x + 8, y + 2);
      c.quadraticCurveTo(x + w * 0.35, y - 3, x + w * 0.72, y + 3);
      c.quadraticCurveTo(x + w - 2, y + 1, x + w - 1, y + 14);
      c.quadraticCurveTo(x + w + 3, y + h * 0.48, x + w - 3, y + h - 8);
      c.quadraticCurveTo(x + w * 0.55, y + h + 3, x + 10, y + h - 2);
      c.quadraticCurveTo(x - 2, y + h * 0.4, x + 8, y + 2);
      c.closePath(); c.fill(); c.restore();
      var VU = XY.villainUI;
      if (VU && VU.washE) VU.washE(c, x + w * 0.5, y + h * 0.55, w * 0.9, h * 0.8, '70,54,36', 0.1);
    }
    function fitArt(im, x, y, w, h) {
      if (!im) return false;
      var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      if (!iw || !ih) return false;
      var sc = Math.min(w / iw, h / ih);
      var dw = iw * sc, dh = ih * sc;
      c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      return true;
    }
    function fillCover(im, x, y, w, h) {
      if (!im) return false;
      var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      if (!iw || !ih) return false;
      var sc = Math.max(w / iw, h / ih) * 1.15, dw = iw * sc, dh = ih * sc;
      c.drawImage(im, x + (w - dw) / 2, y + (h - dh) * 0.35, dw, dh);
      return true;
    }
    function inkWord(x, y, w, h, word) {
      c.save();
      c.font = Math.floor(Math.min(w, h) * 0.46) + 'px "Ma Shan Zheng","KaiTi",serif';
      c.fillStyle = '#2a2118'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(word, x + w / 2, y + h * 0.42);
      c.restore();
    }
    function inkShard(x, y, w, h) { inkWord(x, y, w, h, '碎'); }
    function inkRefresh(x, y, w, h) { inkWord(x, y, w, h, '换'); }
    var shown = items.slice(from, from + per);
    shown.forEach(function (r, k) {
      var col = k % cols, row = Math.floor(k / cols);
      var inRow = Math.min(cols, shown.length - row * cols);
      var w = cardW, x = x0 + col * (cardW + gap), y = gridTop + row * (cardH + gap), h = cardH;
      if (tab === 'sol' && inRow < cols) {
        w = Math.floor((availW - gap * (inRow - 1)) / inRow);
        x = f.x + col * (w + gap);
      }
      var dim = r.sold || (r.btn && r.btn.off);
      torn(x, y, w, h, 20 + k * 3);
      c.save();
      if (dim) c.globalAlpha = 0.55;
      var textH = Math.min(h * 0.48, Math.max(52, h < 170 ? 58 : 78));
      var artTop = y + 6, artHgt = Math.max(20, h - textH - 8);
      c.beginPath(); c.rect(x + 6, artTop, w - 12, artHgt); c.clip();
      var drew = false;
      var textBand = textH;
      var artCy = artTop + artHgt * 0.62, artSz = Math.min(artHgt * 0.92, w * 0.7, 140);
      if (r.kind === 'sol' && XY.soldierInk) drew = XY.soldierInk.draw(c, r.sol, x + w / 2, artTop + artHgt - 2, artSz, Math.min(artSz, w * 0.7));
      if (!drew && r.inkName && XY.ICONINK) drew = XY.ICONINK.draw(c, r.inkName, x + w / 2, artCy, Math.min(artSz, 120));
      if (!drew && r.spId && XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(r.spId)) drew = XY.xAvIcon.draw(c, r.spId, x + (w - artSz) / 2, artTop + 4, artSz, artSz);
      if (!drew && r.spId && XY.bgArt) { try { XY.bgArt(r.spId); } catch (e2) {} }
      if (!drew && r.card) { inkWord(x, y, w, h, String(r.title || '宝').replace(/^.*· /, '').charAt(0) || '宝'); drew = true; }
      if (!drew && r.kind === 'shard') { inkShard(x, y, w, h); drew = true; }
      if (!drew && r.kind === 'reroll') { inkRefresh(x, y, w, h); drew = true; }
      if (!drew && r.kind === 'fb' && r.icon) r.icon(x + w * 0.18, y + h * 0.08, Math.min(w * 0.64, h * 0.55));
      var g = c.createLinearGradient(0, y + h * 0.84, 0, y + h);
      g.addColorStop(0, 'rgba(243,231,207,0)'); g.addColorStop(1, 'rgba(243,231,207,0.7)');
      c.fillStyle = g; c.fillRect(x + 2, y + h * 0.84, w - 4, h * 0.16);
      c.restore();
      var name = String(r.title || '').replace(/^天兵卡 · |^角色卡 · |^法宝 · |^灵物 · /, '');
      var nameY = y + h - textH + Math.max(12, textH * 0.28);
      var subY = nameY + Math.max(14, textH * 0.30);
      var ownY = Math.min(y + h - 10, subY + Math.max(14, textH * 0.28));
      var nameSz = h < 150 ? 14 : Math.min(22, Math.max(16, w * 0.1));
      inkName(name, x + w / 2, nameY, nameSz, '#24180f', w - 16);
      if (r.kind === 'sol') {
        var td = XY.TOWERS[r.sol];
        var desc = String(td ? td.desc : (r.sub || '')).replace(/BOSS/g, '头目');
        inkName(desc, x + w / 2, subY, h < 150 ? 15 : Math.max(18, Math.min(22, w * 0.1)), '#3a2a1c', w - 12);
        var cnLv = ['', '一', '二', '三', '四', '五'];
        inkName('持有 ' + (r.cards || 0) + ' 张' + (r.lv ? ' · ' + (cnLv[r.lv] || r.lv) + '级' : ' · 还没解锁'), x + w / 2, ownY, h < 150 ? 16 : 20, '#24180f', w - 12);
      } else {
        if (r.sub) inkName(String(r.sub), x + w / 2, subY, h < 150 ? 11 : Math.max(13, Math.min(16, w * 0.07)), '#3a2a1c', w - 12);
        inkName(r.full ? '已解锁' : '未解锁', x + w / 2, ownY, h < 150 ? 12 : 15, r.full ? '#2f7d3b' : '#a42d19', w - 12);
      }
      var seal = r.full ? '满' : (r.sold ? '售' : String(r.price == null ? '' : r.price));
      var ss = Math.max(44, Math.min(56, w * 0.22));
      cinnabar(x + w - ss - 6, y + 8, ss, seal);
      if (r.btn && !r.btn.off && r.btn.act) K.hit(x, y, w, Math.max(44, h), r.btn.act, r.btn.ex);
    });
    var VU = XY.villainUI, noteW = showBuy ? Math.max(120, f.w - 168) : f.w;
    if (VU && VU.drawBrush) VU.drawBrush(c, f.x, noteY - 16, noteW, 36, note, { sz: 13, vh: 26 });
    else K.tf(note, f.x + 8, noteY, f.w - 16, 13, T.inkSoft, 'left', false, 11);
    if (showBuy) {
      var sx = f.x + f.w - 150, off = S.data.lingshi < S.CARD_PRICE;
      if (VU && VU.drawSeal) VU.drawSeal(c, sx, ctrlY, 146, 48, '抽' + S.CARD_PRICE, { style: off ? 'ghost' : 'solid', sz: 18, stack: false, rot: -0.03 });
      if (!off) K.hit(sx, ctrlY, 146, 48, 'buyCard');
    }
    K.msg(f.x + f.w / 2, noteY - 16, 'center');
    }
    P.end(c);
  }

  /* ================= 结算 ================= */
  P.result = function (c, G, app, win) {
    var cause = G.ending && G.ending.cause, rep = G.runReport || {}, Q = G.quests;
    R.dim(c, app, 0.7); P.begin(c, app); var W = K.W, H = K.H, port = K.port, m = 6;
    var pw = port ? W - 2 * m : Math.min(W - 2 * m, 640), px = (W - pw) / 2, py = m, ph = H - 2 * m, bd = win ? '#d9a21a' : '#c0392b';
    K.panel(px, py, pw, ph, 18, 'rgba(255,253,246,0.98)', bd);
    c.font = 'bold 34px ' + XY.menu.KAI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = win ? '#c8860a' : '#c0392b'; c.fillText(win ? '过 关' : (cause === 'tang' ? '师傅阵亡' : '基地被入侵'), W / 2, py + (port ? 40 : 30));
    var ty = py + (port ? 74 : 56);
    K.tf(XY.lvPre(G) + G.lv.name + '」' + (win ? ' · 走进关口「' + G.gate.name + '」' : ''), W / 2, ty, pw - 24, 13.5, T.inkSoft, 'center', false, 11); ty += 20;
    var si = XY.sweep09 && XY.sweep09.resultStars(G, win);
    if (si && si.show) {
      c.font = 'bold 26px ' + XY.menu.KAI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#a8680a';
      c.fillText(si.text + (si.isNew ? '　新纪录' : ''), W / 2, ty + 6); ty += 28;
      if (si.tip) { K.tf(si.tip, W / 2, ty + 2, pw - 28, 12.5, '#8a5a12', 'center', false, 10.5); ty += 20; } else ty += 4;
    } else if (si && si.faint) { K.tf(si.faint, W / 2, ty + 2, pw - 28, 12, '#b0a48c', 'center', false, 10.5); ty += 18; }
    var why = G.ending && (G.ending.why || G.ending.reason); if (!win && why) { K.lines('死因：' + why, px + 16, ty + 4, pw - 32, 13, 17, '#a8321f', 2, true); ty += 38; }
    var bodyL = px + 16, bodyW = pw - 32;
    // 任务
    K.t('任务结果', bodyL, ty + 4, 14, '#b8300f', 'left', true); ty += 22;
    [Q.main].concat(Q.sides).forEach(function (q, k) {
      var rw = q.def.reward, rt = q.done && rw ? (rw.card ? '法宝 ' : '') + (rw.lingshi ? '灵石 +' + rw.lingshi : '') + (rw.shard ? ' 碎片 +' + rw.shard : '') : '';
      K.tf((k ? '支线 ' : '主线 ') + (q.done ? '✔ ' : '✘ ') + q.def.short, bodyL + 6, ty + 4, bodyW - (rt ? 110 : 6), 13, q.done ? '#2f7d3b' : '#a33a2a', 'left', true, 11);
      if (rt) K.tf(rt, bodyL + bodyW - 4, ty + 4, 104, 12, '#a8700a', 'right', false, 10.5); ty += 21;
    });
    ty += 6;
    var dead = G.heroes.filter(function (h) { return h.down; }).map(function (h) { return h.def.name; });
    var rows = [['用时', XY.fmtTime(G.t)], ['等级', G.level + ' 级'], ['击杀 / 洞府', G.kills + ' 只 · 镇灭 ' + G.dens.filter(function (d) { return !d.alive; }).length + '/' + G.dens.length], ['阵亡英雄', dead.length ? dead.join('、') : '无']];
    rows.forEach(function (r) { K.t(r[0], bodyL + 6, ty + 4, 13.5, T.inkSoft, 'left', false); K.tf(r[1], bodyL + bodyW - 4, ty + 4, bodyW - 110, 13.5, T.ink, 'right', true, 11); ty += 21; });
    var sp = G.spGot || [];
    if (sp.length) { ty += 4; K.t('掉落角色卡', bodyL, ty + 4, 14, '#b8300f', 'left', true); ty += 26; sp.forEach(function (g, k) { var d = XY.specialDef(g.id, Math.max(1, S.spLevel(g.id))); XY.R4.avatarDisc(c, d, bodyL + 20 + k * 130, ty, 15, app.rt); K.tf(XY.SP_BY[g.id].name + ' ×1', bodyL + 40 + k * 130, ty, 88, 13, T.ink, 'left', true, 11); }); ty += 24; }
    var nu = (rep.newUnlocks || []).map(function (id) { return XY.UNLOCK_BY[id].name; });
    if (nu.length) { K.tf('★ 新解锁：' + nu.join('、'), W / 2, ty + 6, pw - 32, 13.5, '#2f7d3b', 'center', true, 11); ty += 22; }
    var hasNext = win && !G.dungeon && !G.mod && G.levelId < XY.LEVEL_COUNT;
    var jn = G.mod ? '非官方玩法包：只能玩，不发任何奖励，不记通关，不影响存档' : G.dungeon ? (win ? '洞府副本不计入取经之旅（首通奖励已发）' : '副本失败不扣任何东西，再来一局就是了') : win ? (G.levelId < XY.LEVEL_COUNT ? '取经之旅：第 ' + (G.levelId + 1) + ' 关已解锁，全队进度保留' : '取经之旅：全部关卡通关！') : '取经之旅：进度保留，可以换角色再来';
    var A = hasNext ? [['下一关（可换角色）', 'nextLevel', true], ['再来一局（R）', 'restart'], ['回到首页', 'home']] : (!win ? [['再来一局（R）', 'restart', true], ['换角色再来', 'repick'], ['回到首页', 'home']] : [['再来一局（R）', 'restart', true], ['回到首页', 'home']]);
    if (win && G.bossOffer && XY.bossfight && XY.bossfight.launch) A.splice(hasNext ? 1 : 0, 0, ['Boss 战 · 牛魔王', 'bossGo']);      // v0.9：第 1 关 / 洞府通关后，可以直接去打牛魔王 Boss 战
    var bby = py + ph - 12 - (port ? 52 * A.length - 8 : 44);
    K.tf(jn, W / 2, bby - 40, pw - 32, 12.5, win ? '#2f7d3b' : T.inkSoft, 'center', win, 10.5);
    K.msg(W / 2, bby - 20, 'center', pw - 32);
    if (port) A.forEach(function (a, k) { K.btn(px + 16, bby + k * 52 - (3 - A.length) * 0, pw - 32, 44, a[0], a[1], null, { primary: !!a[2], size: 16 }); });
    else { var bw2 = (pw - 32 - (A.length - 1) * 8) / A.length; A.forEach(function (a, k) { K.btn(px + 16 + k * (bw2 + 8), bby, bw2, 44, a[0], a[1], null, { primary: !!a[2], size: A.length > 3 ? 14 : 15 }); }); }
    P.end(c);
    var vz = K.z; if (port) XY.menu.verSwitch(c, app, (px + 16) / vz, (bby - 96) / vz, (pw - 32) / vz, 40 / vz); else XY.menu.verSwitch(c, app, (px + pw - 190) / vz, (py + 8) / vz, 176 / vz, 40 / vz);
  };

  P.draw = function (c, G, app) {
    if (!P.on(app) && app.screen !== 'shop') return false;
    var s = app.screen;
    if (s === 'levels') { levels(c, G, app); return true; }
    if (s === 'shop') { shop(c, G, app); return true; }
    return false;
  };
  var oEnd = XY.R4.end;
  XY.R4.end = function (c, G, app, win) { if (P.on(app)) return P.result(c, G, app, win); return oEnd(c, G, app, win); };
})();
