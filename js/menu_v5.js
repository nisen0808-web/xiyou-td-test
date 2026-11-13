/* ============================================================
 * menu_v5.js —— 主菜单（2026-11 起 V2「电影海报」为默认；V1/V3/V4 仍是源码里 ?menu=V1/V3/V4 的版式实验，打包版不带它们的背景）
 * 共同点：满幅狂野水墨背景（assets/art/menu-v5/bg_v*.webp）；西游五人是重新抠过的墨渍立绘（fig_*.webp，无方边，直接叠在背景上）；
 * 九个特殊角色 X 头像做过调色+云雾羽化处理（av_mist_*.webp，tools/menu_v5_avatars.py 生成），悬停 / 触屏点按才显示原色 + @handle。
 * V2 三档自适应：D 桌面（设计坐标 1280x720，等比居中）/ L 手机横屏（宽屏 720 高，UI 放大 1.4）/ P 手机竖屏（单独的竖版水墨背景 + 头像 3x3）。
 * 首页只留「开始取经」（点它进「出发」页 depart.js）：所有官卡（基础选关 / 洞府副本 / Boss 战 / 反派模式 / 排行榜）在出发页；「更多」印在出发页，进二级页「洞府阁」menu_hub.js（修行 / 杂务）。
 * 打包版素材全部内联（build.sh → window.XY_MENU_V5）；单文件打开也不依赖 assets/。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, M = XY.menu, U = M.u, D = window.XY_MENU_STAGE, ui = XY.ui, PI2 = Math.PI * 2, R = XY.R;
  var BASE = 'assets/art/menu-v5/', INK = U.INK, RED = U.RED, KAI = M.KAI;
  var imgs = {};
  function im(src) {
    var i = imgs[src];
    if (!i) {
      var inl = window.XY_MENU_V5, key = src.replace(/^.*\//, '').replace(/\.webp$/, '');
      i = imgs[src] = new Image(); i.onerror = function () { i.failed = true; }; i.src = (inl && inl[key]) || src;
    }
    return i.complete && i.naturalWidth > 0 ? i : null;
  }
  function fileIm(src) {
    var i = imgs['file:' + src];
    if (!i) { i = imgs['file:' + src] = new Image(); i.onerror = function () { i.failed = true; }; i.src = src; }
    return i.complete && i.naturalWidth > 0 ? i : null;
  }
  var SP_IDS = ['sisi', 'laosiji', 'diaoyulao', 'kuanggong', 'phyrex', 'yuanzhang', 'martin', 'haiteng', 'heyuxi'];
  var SEAL = { tang: 'tang', wukong: 'wukong', bajie: 'bajie', wujing: 'wujing', horse: 'horse' };
  function ov(st, x, y, w, h) { return st.mx >= x && st.mx <= x + w && st.my >= y && st.my <= y + h; }
  function hit(x, y, w, h, act, extra) { return U.hit(x, y, w, h, act, extra); }
  function glow(c, col, blur) { c.shadowColor = col || 'rgba(251,245,230,0.95)'; c.shadowBlur = blur || 8; }
  function noGlow(c) { c.shadowColor = 'transparent'; c.shadowBlur = 0; }
  function spDef(id) { var r = null; XY.SPECIALS.forEach(function (d) { if (d.id === id) r = d; }); return r; }
  function tipOf(id) {
    var d = null, k; for (k = 0; k < 5; k++) if (XY.heroDef(k).id === id) d = XY.heroDef(k);
    if (!d) d = spDef(id); if (!d || !d.ult) return '';
    var rl = XY.HERO_ROLE && (XY.HERO_ROLE[d.id] || (d.variant && XY.HERO_ROLE[d.variant]));
    return XY.fmtStr(d.name + (d.handle ? ' ' + d.handle : '') + ' · 大招 ' + d.ult + (d.weapon ? ' · ' + d.weapon : '') + (rl ? ' · ' + rl.name : ''));
  }

  /* ---------- 背景：满幅水墨（cover 铺满）+ 三缕慢飘的淡云 ---------- */
  function drawBg(c, W, H, v, rt) {
    c.fillStyle = '#f3ead4'; c.fillRect(0, 0, W, H);
    var i = im(BASE + 'bg_v' + v + '.webp');
    if (i) { var s = Math.max(W / i.naturalWidth, H / i.naturalHeight) * 1.28, w = i.naturalWidth * s, h = i.naturalHeight * s, lift = (W / Math.max(1, H) > 2.15) ? Math.min(h * 0.2, H * 0.26) : 0; c.drawImage(i, (W - w) / 2, (H - h) / 2 - lift, w, h); }
    for (var k = 0; k < 3; k++) {
      var cw = 380 + k * 90, x = ((rt * (5 + k * 2) + k * 520) % (W + cw * 2)) - cw, y = H * (0.2 + 0.27 * k) + Math.sin(rt * 0.2 + k) * 8;
      var g = c.createRadialGradient(x, y, 4, x, y, cw * 0.5); g.addColorStop(0, 'rgba(250,244,228,0.30)'); g.addColorStop(1, 'rgba(250,244,228,0)');
      c.save(); c.translate(x, y); c.scale(1, 0.3); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, cw * 0.5, 0, PI2); c.fill(); c.restore();
    }
  }
  function halo(c, x, y, rx, ry, a) {
    var g = c.createRadialGradient(x, y, 2, x, y, rx); g.addColorStop(0, 'rgba(250,244,228,' + a + ')'); g.addColorStop(0.6, 'rgba(250,244,228,' + (a * 0.6) + ')'); g.addColorStop(1, 'rgba(250,244,228,0)');
    c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, PI2); c.fill(); c.restore();
  }
  /* 宣纸色淡幕：上缘羽化，盖住背景底部的深墨，让下面的头像 / 小字读得清 */
  function veil(c, x, y, w, h, a, fade) {
    var g = c.createLinearGradient(0, y, 0, y + h), f = Math.min(0.5, (fade || 70) / h);
    g.addColorStop(0, 'rgba(246,238,220,0)'); g.addColorStop(f, 'rgba(246,238,220,' + a + ')'); g.addColorStop(1, 'rgba(246,238,220,' + a + ')');
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  function taper(c, x1, y, x2, th, a, col) {
    var mid = (x1 + x2) / 2; c.save(); c.globalAlpha = a; c.fillStyle = col || INK; c.beginPath(); c.moveTo(x1, y); c.quadraticCurveTo(mid, y - th, x2, y); c.quadraticCurveTo(mid, y + th * 0.45, x1, y); c.fill(); c.restore();
  }

  /* ---------- 五人立绘 ---------- */
  function drawFig(st, id, cx, bottom, h, o) {
    o = o || {}; var i = fileIm(o.src || ('assets/art/menu-v5/fig_' + id + '.webp')), c = st.c; if (!i) return; var w = h * i.naturalWidth / i.naturalHeight;
    if (XY.stage) XY.stage.stats.figs++;
    c.save(); c.translate(cx, bottom); if (o.rot) c.rotate(o.rot); c.scale(1, 1 + 0.005 * Math.sin(st.rt * 1.3 + cx)); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.drawImage(i, -w / 2, -h * 0.97, w, h); c.restore();
    var r = { id: id, x: cx - w * 0.28, y: bottom - h * 0.9, w: w * 0.56, h: h * 0.85 }, lim = st.lim;
    if (lim) {      // 点击区不压到按钮 / 小按钮、不出画布：夹进 lim 的矩形
      var x2 = Math.min(r.x + r.w, lim.x2), y2 = Math.min(r.y + r.h, lim.y2); r.x = Math.max(r.x, lim.x1); r.y = Math.max(r.y, lim.y1); r.w = Math.max(1, x2 - r.x); r.h = Math.max(1, y2 - r.y);
    }
    st.figs.push(r); hit(r.x, r.y, r.w, r.h - 10, 'menuChar', { id: id });      // 立绘点击框底边让出 10，免得和「开始取经」放大后的点击框重叠
  }
  function nameImg(id, k) { var n = D && D.name[id]; return n && n[k] ? { img: im(n[k].src), w: n[k].w, h: n[k].h } : null; }
  /* 毛笔名：orient 'v' 竖排 / 'h' 横排；hgt 为目标高度；返回宽度 */
  function drawName(st, id, x, y, hgt, orient, align, gl) {
    if (id === 'kuanggong') {
      var label = (XY.SP_BY && XY.SP_BY.kuanggong && XY.SP_BY.kuanggong.name) || 'DeFi小矿工';
      var c = st.c; c.save();
      c.font = Math.max(11, Math.round(hgt * 0.72)) + 'px "Ma Shan Zheng","KaiTi",serif';
      c.fillStyle = '#24180f'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
      c.fillText(label, x, y + hgt * 0.45); c.restore();
      return c.measureText(label).width;
    }
    var n = nameImg(id, orient); if (!n || !n.img) return 0; if (XY.stage) XY.stage.stats.names++; var s = hgt / n.h, w = n.w * s, c = st.c, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    c.save(); glow(c, gl || 'rgba(250,244,228,0.95)', 7); c.drawImage(n.img, x0, y, w, hgt); noGlow(c); c.globalAlpha = 0.6; c.drawImage(n.img, x0, y, w, hgt); c.restore(); return w;
  }
  function drawSeal(st, id, cx, cy, sz) { var sk = SEAL[id] || 'generic', n = D && D.seal[sk], i = n && im(n.src); if (!i) return; st.c.save(); st.c.globalAlpha = 0.92; st.c.drawImage(i, cx - sz / 2, cy - sz / 2, sz, sz); st.c.restore(); }
  /* 五人题名：竖排毛笔名 + 朱印；x,y 是名字顶部中心 */
  function heroName(st, id, x, y, hgt) {
    if (st.mode === 'P' || st.mode === 'L') halo(st.c, x, y + hgt * 0.5, hgt * 0.62, hgt * 0.72, 0.5);     // 手机档：名字底下垫一团宣纸色淡晕，压在深墨山上也读得清
    var w = drawName(st, id, x, y, hgt, 'v', 'center'); drawSeal(st, id, x, y + hgt + 12, Math.max(15, hgt * 0.17)); return w;
  }

  /* ---------- 九人头像：墨环 / 云雾 / 朱印 三种融合处理；悬停显示原色 ---------- */
  var AVK = { ink: 0.86, seal: 0.864, mist: 0.9 };
  function origAv(id) { return im('assets/art/x-avatars/' + id + '.webp'); }
  function drawAv(st, id, variant, cx, cy, d, o) {
    if (XY.stage) XY.stage.stats.figs++;
    o = o || {}; var c = st.c, oi = origAv(id), hv = ov(st, cx - d / 2, cy - d / 2, d, d), sel = XY.stage && XY.stage.sel && XY.stage.sel.id === id && st.rt < XY.stage.sel.until;
    var sc = hv || sel ? 1.12 : 1;
    c.save(); c.translate(cx, cy); if (o.rot) c.rotate(o.rot);
    if (oi) {
      if (XY.xAvIcon) XY.xAvIcon.featherImage(c, oi, -d * 0.5 * sc, -d * 0.5 * sc, d * sc, d * sc);
      else {
        c.save(); c.beginPath(); c.arc(0, 0, d * 0.5 * sc * 0.92, 0, PI2); c.clip();
        c.drawImage(oi, -d * 0.5 * sc, -d * 0.5 * sc, d * sc, d * sc); c.restore();
        c.lineWidth = hv || sel ? 2.2 : 1.6; c.strokeStyle = 'rgba(43,28,8,0.82)'; c.beginPath(); c.arc(0, 0, d * 0.5 * sc * 0.92, 0, PI2); c.stroke();
      }
    } else {
      var i = im(BASE + 'av_' + variant + '_' + id + '.webp'), Dd = d / (AVK[variant] || 0.9) * sc;
      if (i) c.drawImage(i, -Dd / 2, -Dd / 2, Dd, Dd);
    }
    c.restore();
    var r = { id: id, cx: cx, cy: cy, r: d / 2, x: cx - d / 2, y: cy - d / 2, w: d, h: d }; st.av.push(r); hit(r.x, r.y, r.w, r.h, 'menuChar', { id: id });
    if (hv || sel) st.tip = r;
    return r;
  }

  /* ---------- 标题、按钮、存档 ---------- */
  function startBtn(st, x, y, w, h, sz) {
    var c = st.c, ph = U.over(st.A, x, y, w, h), pulse = 0.5 + 0.5 * Math.sin(st.rt * 2.4), oy = ph ? -2 : 0;
    c.save(); c.shadowColor = 'rgba(200,52,31,' + (0.3 + 0.12 * pulse + (ph ? 0.2 : 0)).toFixed(2) + ')'; c.shadowBlur = 16 + 6 * pulse; c.shadowOffsetY = 4;
    var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, ph ? '#e2553a' : '#d7432a'); g.addColorStop(1, ph ? '#c13620' : '#b3301c');
    R.rrect(c, x, y + oy, w, h, 15 * Math.max(1, h / 56)); c.fillStyle = g; c.fill(); c.restore();
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,214,150,0.8)'; R.rrect(c, x + 3, y + 3 + oy, w - 6, h - 6, 12 * Math.max(1, h / 56)); c.stroke();
    U.text(c, '开始取经', x + w / 2, y + h * 0.4 + oy, sz || 24, '#fff8e8', 'center', true, KAI, 8);
    U.text(c, '护送唐僧走到关口', x + w / 2, y + h * 0.8 + oy, 11.5 * Math.max(1, h / 56), 'rgba(255,240,215,0.92)', 'center', false);
    (function () { var mh = Math.max(h, Math.ceil(44 / ((st.k || 1) * ((st.app && st.app.zoom) || 1)))); hit(x, y - (mh - h) / 2, w, mh, 'menuLevels'); })(); st.geom.btn = { x: x, y: y, w: w, h: h };
  }
  function saveLine(st, x, y, align, sz, short) {
    var S = XY.save, d = S.data, st2 = d.stats, mm = st.app.menuMsg, c = st.c, live = mm && st.app.rt < mm.until;
    var deck = d.deck.length + '/' + (XY.DECK_MAX || 3);
    var line = live ? mm.text : XY.fmtStr(short ? '存档：开局 ' + st2.runs + ' · 通关 ' + st2.wins + ' · 击杀 ' + st2.kills + ' · 灵石 ' + d.lingshi + ' · 卡组 ' + deck
      : '存档（本机）：开局 ' + st2.runs + ' 次 · 通关 ' + st2.wins + ' 次 · 累计击杀 ' + st2.kills + ' · 灵石 ' + d.lingshi + ' · 卡组 ' + deck + ' · 自动保存');
    sz = sz || 11.5; c.save(); glow(c, 'rgba(250,244,228,0.95)', 6); U.text(c, line, x, y, sz, live ? (mm.bad ? '#b8300f' : '#2f7d3b') : '#6f6247', align || 'center', !!live);
    c.font = U.font(sz, !!live); var tw = c.measureText(line).width; c.restore();
    st.geom.foot = { x: align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2, y: y - sz * 0.7, w: tw, h: sz * 1.4 };
  }
  function title(st, cx, cy, size, rot, haloA) {
    var c = st.c; halo(c, cx, cy + size * 0.1, size * 2.5, size * 0.95, haloA == null ? 0.7 : haloA);
    c.save(); c.translate(cx, cy); if (rot) c.rotate(rot); c.translate(-cx, -cy); M.title(c, cx, cy, size, st.rt); c.restore();
    var w = size * (2.15 + 0.2 + 0.88); st.geom.title = { x: cx - w / 2, y: cy - size * 0.55, w: w, h: size * 1.1 };
  }

  /* ================== V1 游戏封面：左上大标题 + 左下竖排按钮，五人满铺右侧，头像在右上角做“领衔”小行 ================== */
  function V1(st) {
    var c = st.c;
    drawFig(st, 'wujing', 440, 740, 450); drawFig(st, 'horse', 1190, 740, 470);
    drawFig(st, 'wukong', 600, 752, 530); drawFig(st, 'bajie', 1040, 752, 530); drawFig(st, 'tang', 820, 764, 600);
    heroName(st, 'wujing', 360, 270, 112); heroName(st, 'horse', 1236, 180, 112); heroName(st, 'wukong', 468, 190, 120); heroName(st, 'bajie', 925, 270, 118); heroName(st, 'tang', 668, 112, 110);
    title(st, 262, 116, 118, 0, 0.55);
    c.save(); glow(c, 'rgba(250,244,228,0.95)', 7); U.text(c, '取经路上一关一关闯：打掉洞府 BOSS，断掉妖怪的来路，', 64, 206, 13, '#4a3a1c', 'left', false, null, 1.1); U.text(c, '护送唐僧走到西边关口。', 64, 226, 13, '#4a3a1c', 'left', false, null, 1.1); c.restore();
    startBtn(st, 64, 438, 316, 62, 26);
    saveLine(st, 64, 698, 'left', 11);
    // 领衔：右上一行（间距按名字宽度），墨环头像 + 名；下面一道飞白细线
    var cells = SP_IDS.map(function (id) { var n = nameImg(id, 'h'), nw = n ? n.w * (16 / n.h) : 30; return { id: id, w: Math.max(56, nw + 24) }; }), tot = 0; cells.forEach(function (o) { tot += o.w; });
    var x = 1268 - tot;
    var rg = c.createRadialGradient(1268 - tot / 2, 70, 10, 1268 - tot / 2, 70, tot * 0.58); rg.addColorStop(0, 'rgba(248,240,222,0.78)'); rg.addColorStop(0.65, 'rgba(248,240,222,0.5)'); rg.addColorStop(1, 'rgba(248,240,222,0)');
    c.save(); c.translate(1268 - tot / 2, 70); c.scale(1, 0.22); c.translate(-(1268 - tot / 2), -70); c.fillStyle = rg; c.fillRect(1268 - tot - 80, -300, tot + 160, 800); c.restore();
    cells.forEach(function (o) { var cx = x + o.w / 2; drawAv(st, o.id, 'ink', cx, 52, o.id === 'phyrex' ? 54 : 46); drawName(st, o.id, cx, 82, 16, 'h', 'center'); x += o.w; });
    taper(c, 1268 - tot, 108, 1268, 3, 0.38);
  }

  /* ================== V2 电影海报（默认）：顶角小按钮、居中标题、五人正面对称、底部 credits 条；D 桌面 / L 手机横屏 / P 手机竖屏 ================== */
  function menuIds() {
    var pref = ['sisi', 'laosiji', 'diaoyulao', 'kuanggong', 'phyrex', 'yuanzhang', 'martin', 'haiteng', 'heyuxi'];
    var seen = {}, out = [];
    function add(id) {
      if (!id || seen[id] || !XY.SP_BY || !XY.SP_BY[id]) return;
      if (XY.isHidden && XY.isHidden(id) && !(XY.save && XY.save.spOwned && XY.save.spOwned(id))) return;
      seen[id] = 1; out.push(id);
    }
    pref.forEach(add);
    (XY.SPECIALS || []).forEach(function (d) { add(d.id); });
    return out.length ? out : pref.slice();
  }
  function inkSplash(c, x, y, w, h) {
    c.save();
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(120,96,64,0)');
    g.addColorStop(0.45, 'rgba(110,88,58,0.06)');
    g.addColorStop(1, 'rgba(96,76,50,0.14)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(90,70,46,0.35)'; c.lineCap = 'round'; c.lineWidth = 1.3;
    var i, yy;
    for (i = 0; i < 4; i++) {
      yy = y + h * (0.28 + i * 0.16);
      c.globalAlpha = 0.28 + (i % 2) * 0.12;
      c.beginPath();
      c.moveTo(x + w * 0.02, yy);
      c.quadraticCurveTo(x + w * (0.3 + i * 0.04), yy - h * 0.06, x + w * 0.72, yy + 1);
      c.quadraticCurveTo(x + w * 0.86, yy + h * 0.04, x + w * 0.98, yy - 1);
      c.stroke();
    }
    c.restore();
  }
  function paperBand(c, x, y, w, h) {
    c.save();
    c.beginPath();
    c.moveTo(x, y + h);
    c.lineTo(x + w, y + h);
    var i, n = 32, px, wave;
    for (i = n; i >= 0; i--) {
      px = x + w * i / n;
      wave = Math.sin(i * 0.85) * Math.min(18, h * 0.12) + Math.sin(i * 2.2) * 3;
      c.lineTo(px, y + Math.max(0, wave));
    }
    c.closePath();
    c.fillStyle = '#f6efe2';
    c.fill();
    c.strokeStyle = 'rgba(96,78,52,0.28)';
    c.lineCap = 'round';
    c.lineWidth = 1.2;
    for (i = 0; i < 3; i++) {
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(x + w * 0.04, y + h * (0.35 + i * 0.18));
      c.quadraticCurveTo(x + w * 0.45, y + h * (0.22 + i * 0.12), x + w * 0.96, y + h * (0.4 + i * 0.1));
      c.stroke();
    }
    c.restore();
  }
  function cardLabel(id) {
    if (id === 'kuanggong') return 'DeFi小矿工';
    var d = XY.SP_BY && XY.SP_BY[id];
    return (d && d.name) || id;
  }
  function standCard(st, id, x, y, w, h, nameSize) {
    var c = st.c;
    var sz = nameSize || 16;
    var picH = Math.max(h * 0.62, h - sz * 1.05);
    if (XY.xAvIcon) XY.xAvIcon.draw(c, id, x, y, w, picH);
    var label = cardLabel(id);
    c.save();
    c.beginPath(); c.rect(x, y + picH - sz * 0.2, w, h - picH + sz * 0.3); c.clip();
    c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif';
    c.fillStyle = '#24180f'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, x + w / 2, y + picH + sz * 0.28);
    c.restore();
    var r = { id: id, x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2 };
    st.av.push(r); hit(x, y, w, h, 'menuChar', { id: id });
    return r;
  }
  var FACE_CROP = { phyrex: [0.5, 0.3, 1.8], sisi: [0.5, 0.4, 1.3], laosiji: [0.5, 0.55, 1], kuanggong: [0.5, 0.5, 1], haiteng: [0.5, 0.5, 1.2], yuanzhang: [0.5, 0.45, 1.1], heyuxi: [0.36, 0.4, 2], diaoyulao: [0.5, 0.55, 1.15], martin: [0.42, 0.5, 1.8] };
  function faceCircle(st, id, cx, cy, d) {
    var c = st.c, oi = origAv(id), cr = FACE_CROP[id] || [0.5, 0.42, 1.2];
    c.save();
    c.beginPath(); c.arc(cx, cy, d / 2, 0, Math.PI * 2); c.closePath(); c.clip();
    if (oi && (oi.naturalWidth || oi.width)) {
      var iw = oi.naturalWidth || oi.width, ih = oi.naturalHeight || oi.height, side = Math.min(iw, ih) / cr[2];
      var sx = Math.max(0, Math.min(iw - side, cr[0] * iw - side / 2)), sy = Math.max(0, Math.min(ih - side, cr[1] * ih - side / 2));
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(oi, sx, sy, side, side, cx - d / 2, cy - d / 2, d, d);
    }
    c.restore();
    var r = { id: id, cx: cx, cy: cy, r: d / 2, x: cx - d / 2, y: cy - d / 2, w: d, h: d };
    st.av.push(r); hit(r.x, r.y, r.w, r.h, 'menuChar', { id: id });
  }
  function nameAspect(id) {
    if (id === 'kuanggong') return 4.6;
    var n = nameImg(id, 'h');
    return n && n.h ? n.w / n.h : 3.2;
  }
  function creditRow(st, btnBottom) {
    var ids = menuIds(), n = Math.max(1, ids.length), c = st.c;
    var css = Math.max(0.2, (st.k || 1) * ((st.app && st.app.zoom) || 1));
    var L = st.mode === 'L', narrow = st.DW < 980;
    // ea6b2e4：桌面头像 56、名字高 20、边距 30、缝 10；矮横屏头像 76、名字高 26、边距 26、缝 14。
    var d0 = narrow ? 64 : (L ? 76 : 56);
    var nh0 = narrow ? 22 : (L ? 26 : 20);
    var mg = narrow ? 16 : (L ? 26 : 30);
    var minGap = narrow ? 8 : (L ? 14 : 10);
    var saveH = Math.max(13, Math.round(14 / css));
    var topLimit = (btnBottom || 0) + Math.max(6, Math.round(8 / css));
    var bottom = st.DH - Math.max(2, Math.round(4 / css));
    var saveY = bottom - saveH * 0.35;
    var roomH = Math.max(28, saveY - saveH - topLimit);
    if (nh0 * css < 15) nh0 = 15 / css;
    var dCap = Math.max(28, roomH - 4);
    if (d0 > dCap) d0 = dCap;
    if (nh0 > d0 * 0.9) nh0 = d0 * 0.9;
    function nwOf(id, nh) {
      var im = nameImg(id, 'h');
      return im && im.h ? im.w * (nh / im.h) : nh * 3.2;
    }
    function paintAt(id, x, y, nh, nw) {
      var im = nameImg(id, 'h');
      c.save();
      c.beginPath();
      c.rect(x - 1, y - nh * 0.25, nw + 2, nh * 1.5);
      c.clip();
      if (im && im.img && (im.img.naturalWidth || im.img.width)) c.drawImage(im.img, x, y, nw, nh);
      else drawName(st, id, x, y, nh, 'h', 'left', 'rgba(250,244,228,0)');
      c.restore();
    }
    // 一组人排进 span。f=1 是旧版大小；放不下就缩小，名字右缘到下一个头像至少半个头像。
    function pack(group, span) {
      var gn = group.length, k, sum0 = 0;
      for (k = 0; k < gn; k++) sum0 += nwOf(group[k], nh0);
      var T0 = gn * (d0 + 8) + sum0;
      var inner = Math.max(20, span - 2 * mg);
      function at(ff) {
        var d = d0 * ff, nh = nh0 * ff, ws = [], sum = 0, j;
        for (j = 0; j < gn; j++) { var w = nwOf(group[j], nh); ws.push(w); sum += w; }
        var T = gn * (d + 8 * ff) + sum;
        var gap = gn > 1 ? (inner - T) / (gn - 1) : 0;
        return { f: ff, d: d, nh: nh, ws: ws, gap: gap, between: 2 * ff + gap, T: T, inner: inner };
      }
      var fFit = Math.min(1, (inner - Math.max(0, gn - 1) * minGap) / Math.max(1, T0));
      var f = Math.max(0.15, fFit);
      if (fFit < 0.999) {
        var lo = 0.15, hi = Math.max(0.15, fFit), t;
        for (t = 0; t < 24; t++) {
          var mid = (lo + hi) / 2, mm = at(mid);
          if (mm.T <= inner + 0.5 && mm.between + 0.25 >= mm.d * 0.5) lo = mid; else hi = mid;
        }
        f = lo;
      }
      return at(f);
    }
    function placeRow(group, y, span, origin) {
      var m = pack(group, span), x = origin, gaps = [], k;
      for (k = 0; k < group.length; k++) {
        faceCircle(st, group[k], x + m.d / 2, y, m.d);
        paintAt(group[k], x + m.d + 6 * m.f, y - m.nh / 2, m.nh, m.ws[k]);
        if (k < group.length - 1) gaps.push(2 * m.f + m.gap);
        x += m.d + 8 * m.f + m.ws[k] + (k < group.length - 1 ? m.gap : 0);
      }
      return { m: m, gaps: gaps };
    }
    var gaps = [], placed, cy0, preview;
    if (!narrow) {
      preview = pack(ids, st.DW);
      cy0 = L ? 668 : 664;
      if (cy0 - preview.d / 2 < topLimit) cy0 = topLimit + preview.d / 2;
      if (cy0 + preview.d / 2 > saveY - saveH) cy0 = saveY - saveH - preview.d / 2;
      if (L) {
        // 矮横屏底排正压在按钮下的深墨上。垫一团宣纸色，四周晕开，没有框。
        var washRx = st.DW * 0.36, washRy = Math.max(preview.d, preview.nh) * 0.72;
        c.save();
        c.translate(st.DW / 2, cy0);
        c.scale(washRx, washRy);
        var wash = c.createRadialGradient(0, 0, 0.08, 0, 0, 1);
        wash.addColorStop(0, 'rgba(246,239,226,0.9)');
        wash.addColorStop(0.42, 'rgba(246,239,226,0.55)');
        wash.addColorStop(0.72, 'rgba(246,239,226,0.16)');
        wash.addColorStop(1, 'rgba(246,239,226,0)');
        c.fillStyle = wash;
        c.beginPath();
        c.arc(0, 0, 1, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.save(); c.globalAlpha = 0.78;
      placed = placeRow(ids, cy0, st.DW, mg);
      gaps = placed.gaps;
      c.restore();
      st.geom.credit = { d: Math.round(placed.m.d * 10) / 10, nh: Math.round(placed.m.nh * 10) / 10, cssNh: Math.round(placed.m.nh * css * 10) / 10, minBetween: gaps.length ? Math.round(Math.min.apply(null, gaps) * 10) / 10 : 0, half: Math.round(placed.m.d * 5) / 10 };
      saveLine(st, st.DW / 2, saveY, 'center', Math.max(11, Math.min(16, placed.m.nh * 0.85)));
      return placed.m.d;
    }
    if (st.mode === 'P') {
      var pCols = 3, pRows = Math.ceil(n / pCols);
      var cellW = (st.DW - mg * 2) / pCols;
      var d = Math.min(d0, cellW * 0.42, dCap);
      var nh = Math.min(nh0, d * 0.7);
      var guard = 0, maxNw;
      function widest(hh) { var m = 0, t; for (t = 0; t < n; t++) maxNw = nwOf(ids[t], hh), m = Math.max(m, maxNw); return m; }
      while (d + 6 + widest(nh) > cellW - d * 0.15 && nh > 12 && guard < 14) { nh *= 0.92; guard++; }
      var pitch = d + Math.max(16, Math.round(10 / css));
      var gridH = d + (pRows - 1) * pitch;
      var gapSave = Math.max(16, Math.round(12 / css));
      var gridTop = saveY - saveH - gapSave - gridH;
      if (gridTop < topLimit) gridTop = topLimit;
      var washCy = gridTop + gridH / 2, washRy = gridH * 0.78, washRx = st.DW * 0.56;
      c.save();
      c.translate(st.DW / 2, washCy);
      c.scale(washRx, washRy);
      var wash = c.createRadialGradient(0, 0, 0.02, 0, 0, 1);
      wash.addColorStop(0, 'rgba(246,239,226,0.94)');
      wash.addColorStop(0.62, 'rgba(246,239,226,0.78)');
      wash.addColorStop(0.84, 'rgba(246,239,226,0.28)');
      wash.addColorStop(1, 'rgba(246,239,226,0)');
      c.fillStyle = wash;
      c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
      c.restore();
      c.save(); c.globalAlpha = 0.78;
      var pi;
      for (pi = 0; pi < n; pi++) {
        var col = pi % pCols, row = (pi / pCols) | 0;
        var avCx = mg + col * cellW + d / 2;
        var avCy = gridTop + d / 2 + row * pitch;
        var nw = Math.min(nwOf(ids[pi], nh), Math.max(12, cellW - d - 8));
        faceCircle(st, ids[pi], avCx, avCy, d);
        paintAt(ids[pi], avCx + d / 2 + 6, avCy - nh / 2, nh, nw);
      }
      c.restore();
      var saveAt = Math.min(st.DH - 4, gridTop + gridH + gapSave + saveH * 0.35);
      st.geom.credit = { d: Math.round(d * 10) / 10, nh: Math.round(nh * 10) / 10, cssNh: Math.round(nh * css * 10) / 10, grid: true };
      saveLine(st, st.DW / 2, saveAt, 'center', Math.max(12, Math.min(16, nh * 0.75)));
      return d;
    }
    var cols = Math.min(3, n), rows = Math.ceil(n / cols), r, rowIds, worst = null;
    for (r = 0; r < rows; r++) {
      rowIds = ids.slice(r * cols, r * cols + cols);
      var trial = pack(rowIds, st.DW);
      if (!worst || trial.f < worst.f) worst = trial;
    }
    var pitch = worst.d + Math.max(8, Math.round(10 / css));
    var y0 = saveY - saveH - 4 - (rows - 1) * pitch - worst.d / 2;
    if (y0 - worst.d / 2 < topLimit) y0 = topLimit + worst.d / 2;
    c.save(); c.globalAlpha = 0.78;
    for (r = 0; r < rows; r++) {
      rowIds = ids.slice(r * cols, r * cols + cols);
      placed = placeRow(rowIds, y0 + r * pitch, st.DW, mg);
      gaps = gaps.concat(placed.gaps);
    }
    c.restore();
    st.geom.credit = { d: Math.round(worst.d * 10) / 10, nh: Math.round(worst.nh * 10) / 10, cssNh: Math.round(worst.nh * css * 10) / 10, minBetween: gaps.length ? Math.round(Math.min.apply(null, gaps) * 10) / 10 : 0, half: Math.round(worst.d * 5) / 10 };
    saveLine(st, st.DW / 2, Math.min(st.DH - 4, y0 + (rows - 1) * pitch + worst.d / 2 + saveH * 0.9), 'center', Math.max(11, Math.min(15, worst.nh * 0.8)));
    return worst.d;
  }

  function V2(st) {
    var c = st.c, DW = st.DW, DH = st.DH, cx = DW / 2, m = st.mode, g = st.geom;
    if (m !== 'P') {
      var L = m === 'L', ox0 = cx - 640, fx = function (x) { return ox0 + x; };
      // 五人立绘按 ea6b2e4（2026-11-08）的首页：原大，脚落在「开始取经」按钮上，名字竖排在各人身边。大屏不再缩小上移。
      var bw = L ? 400 : 340, bh = L ? 66 : 56, by = L ? 514 : 552, ph = L ? 40 : 28, mg = L ? 24 : 22, pmax = DW / 2 - 150 - mg;
      st.lim = { x1: 0, x2: DW, y1: L ? 110 : 60, y2: by - 4 };
      /* 画序：沙僧 / 白龙马在后排，唐僧居中，孙悟空 / 猪八戒站在唐僧两侧、盖在他前面（v0.8.7b：之前唐僧最后画，把悟空 / 八戒 / 沙僧的脸遮住了） */
      drawFig(st, 'wujing', fx(238), 626, 400); drawFig(st, 'horse', fx(1000), 626, 400);
      drawFig(st, 'tang', fx(640), 648, 540);
      drawFig(st, 'wukong', fx(462), 640, 460); drawFig(st, 'bajie', fx(846), 640, 460);
      heroName(st, 'wujing', fx(112), 228, 104); heroName(st, 'horse', fx(1118), 198, 104); heroName(st, 'wukong', fx(335), 150, 112); heroName(st, 'bajie', fx(968), 165, 112); heroName(st, 'tang', fx(482), 122, 100);
      title(st, cx, 62, 68, 0, 0.85);
      startBtn(st, cx - bw / 2, by, bw, bh, L ? 30 : 26);
      creditRow(st, by + bh + 6);
      st.how = { s: L ? 1.4 : 1, ax: cx, ay: by }; st.tk = L ? 1.4 : 1; g.bottomY = L ? by + bh + 30 : 714;
    } else {
      // 竖屏：上下两排用战场透明抠图，直接站在山水上。名字放在头侧空白，不压脸。
      var edge = 14, titleSize = Math.min(88, DW * 0.112);
      var titleY = 86;
      title(st, cx, titleY, titleSize, 0, 0.85);
      var titleBottom = titleY + titleSize * 0.62;
      var cssP = Math.max(0.2, (st.k || 1) * ((st.app && st.app.zoom) || 1));
      var saveH = Math.max(13, Math.round(14 / cssP));
      var estD = Math.min(72, Math.max(48, DW * 0.09));
      var estPitch = estD + Math.max(16, Math.round(10 / cssP));
      var gapSave = Math.max(16, Math.round(12 / cssP));
      var bottom = DH - Math.max(2, Math.round(4 / cssP));
      var saveY = bottom - saveH * 0.35;
      var creditTop = saveY - saveH - gapSave - (estD + 2 * estPitch);
      var bh2 = Math.min(84, Math.max(62, DH * 0.048));
      var bw2 = Math.min(DW - 56, 460);
      var by2 = creditTop - 12 - bh2;
      var footBot = by2 + bh2 * 0.22;
      var AS = { wujing: 355 / 497, tang: 421 / 545, horse: 320 / 499, wukong: 412 / 437, bajie: 410 / 548 };
      var leftM = 46, rightM = 28, gapX = 8;
      var botH = (DW - leftM - rightM - gapX) / (AS.wukong + AS.bajie);
      if (botH > 414) botH = 414;
      // 沙悟净按看得见的身子放大到和白龙马接近。白龙马、唐僧的大小不动。上排的脚收回下排头顶。
      var oldTang = 428 / 452;
      var halfRoom = DW / 2 - 14 - gapX;
      var sideH = Math.min(halfRoom / (1.22 * oldTang / 2 + AS.wujing), halfRoom / (1.22 * oldTang / 2 + AS.horse));
      var shaH = sideH * 1.3, hoH = sideH * 1.48;
      var shaW = shaH * AS.wujing, hoW = hoH * AS.horse;
      var shaLeft = leftM, hoRight = DW - 8;
      if (hoW > hoRight - shaLeft - shaW - 24) { hoW = hoRight - shaLeft - shaW - 24; hoH = hoW / AS.horse; }
      var hoLeft = hoRight - hoW;
      var openW = hoLeft - (shaLeft + shaW);
      var tangW = botH * AS.wukong + 16;
      var tangH = tangW / AS.tang;
      var topOfBot = footBot - 0.97 * botH;
      var foot0 = topOfBot + 6;
      var maxH = (foot0 - titleBottom - 64) / 0.97;
      if (tangH > maxH) tangH = maxH;
      if (tangH < botH + 48) tangH = botH + 48;
      tangW = tangH * AS.tang;
      function fw(id, h) { return h * AS[id]; }
      var footTop = foot0;
      if (footTop - 0.97 * hoH < titleBottom + 8) footTop = titleBottom + 8 + 0.97 * hoH;
      var cxWj = shaLeft + shaW / 2;
      var cxHo = hoLeft + hoW / 2;
      var cxTang = DW / 2 + 22;
      if (cxTang - tangW / 2 < 4) cxTang = tangW / 2 + 4;
      if (cxTang + tangW / 2 > DW - 4) cxTang = DW - 4 - tangW / 2;
      var cxWk = leftM + fw('wukong', botH) / 2;
      var cxBj = DW - rightM - fw('bajie', botH) / 2;
      var hd = 'assets/art/battle-hd/', cut = 'assets/art/portrait-cut/';
      st.lim = { x1: 0, x2: DW, y1: titleBottom, y2: by2 - 2 };
      drawFig(st, 'tang', cxTang, footTop, tangH, { src: cut + 'tang.webp' });
      drawFig(st, 'wujing', cxWj, footTop, shaH, { src: hd + 'wujing.webp' });
      drawFig(st, 'horse', cxHo, footTop, hoH, { src: hd + 'horse.webp' });
      drawFig(st, 'wukong', cxWk, footBot, botH, { src: hd + 'wukong.webp' });
      drawFig(st, 'bajie', cxBj, footBot, botH, { src: cut + 'bajie.webp' });
      var nameH = 76;
      var NAME = { wujing: { x: 0.06, y: -0.32 }, tang: { x: 0.72, y: -0.06 }, horse: { x: 0.48, y: -0.22 }, wukong: { x: 0.10, y: 0.16 }, bajie: { x: 0.93, y: 0.16 } };
      var cast = [];
      function placeName(id, figCx, bot, h) {
        var w = fw(id, h), left = figCx - w / 2, top = bot - 0.97 * h, p = NAME[id];
        var nx = left + p.x * w, ny = top + p.y * h, half = nameH * 0.16;
        nx = Math.max(half + 2, Math.min(DW - half - 2, nx));
        if (ny < titleBottom + 4) ny = titleBottom + 4;
        if (id === 'wujing') {
          // 沙悟净的名字落在左边深色松林上。垫一团宣纸色淡雾，中心亮、四周晕开，没有框。
          var mx = nx, my = ny + nameH * 0.5, rx = nameH * 0.46, ry = nameH * 1.2;
          var mist = c.createRadialGradient(mx, my, rx * 0.25, mx, my, rx);
          mist.addColorStop(0, 'rgba(246,239,226,0.9)');
          mist.addColorStop(0.5, 'rgba(246,239,226,0.7)');
          mist.addColorStop(0.75, 'rgba(246,239,226,0.22)');
          mist.addColorStop(1, 'rgba(246,239,226,0)');
          c.save(); c.translate(mx, my); c.scale(1, ry / rx); c.translate(-mx, -my);
          c.fillStyle = mist; c.beginPath(); c.arc(mx, my, rx, 0, Math.PI * 2); c.fill(); c.restore();
        }
        heroName(st, id, nx, ny, nameH);
        cast.push({ id: id, x: left, y: top, w: w, h: h, nx: nx, ny: ny, nh: nameH });
      }
      placeName('wujing', cxWj, footTop, shaH);
      placeName('horse', cxHo, footTop, hoH);
      placeName('tang', cxTang, footTop, tangH);
      placeName('wukong', cxWk, footBot, botH);
      placeName('bajie', cxBj, footBot, botH);
      st.geom.cast = cast;
      startBtn(st, cx - bw2 / 2, by2, bw2, bh2, 36);
      creditRow(st, by2 + bh2 + 6);
      st.how = { s: 1.35, ax: cx, ay: by2 }; st.tk = 1.4; g.bottomY = DH - 12;
    }
  }

  /* ================== V3 斜线构图：五人沿对角线上冲，卷轴铺在底部，九枚朱印头像像钤印一样落在卷轴上 ================== */
  function scrollShape(c, x0, y0, x1, y1, seed) {
    var r = seed, n = 40; function rnd() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    c.beginPath(); c.moveTo(x0, y0 + 2); for (var i = 1; i <= n; i++) c.lineTo(x0 + (x1 - x0) * i / n, y0 + (rnd() - 0.5) * 3.5);
    for (i = n; i >= 0; i--) c.lineTo(x0 + (x1 - x0) * i / n, y1 + (rnd() - 0.5) * 3.5); c.closePath();
  }
  function V3(st) {
    var c = st.c;
    drawFig(st, 'wujing', 190, 650, 400, { rot: -0.06 }); drawFig(st, 'wukong', 420, 640, 470, { rot: -0.035 }); drawFig(st, 'tang', 660, 620, 560);
    drawFig(st, 'bajie', 900, 610, 430, { rot: 0.04 }); drawFig(st, 'horse', 1110, 590, 390, { rot: 0.07 });
    heroName(st, 'wujing', 80, 214, 104); heroName(st, 'wukong', 300, 150, 112); heroName(st, 'tang', 520, 70, 108); heroName(st, 'bajie', 1020, 180, 104); heroName(st, 'horse', 1212, 202, 100);
    title(st, 1010, 90, 88, -0.035, 0.7);
    // 卷轴
    var x0 = 92, x1 = 1188, y0 = 570, y1 = 714;
    c.save(); c.shadowColor = 'rgba(40,26,8,0.38)'; c.shadowBlur = 16; c.shadowOffsetY = -2;
    var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f8f0da'); g.addColorStop(1, '#efe2c0'); c.fillStyle = g; scrollShape(c, x0, y0, x1, y1, 31); c.fill(); c.restore();
    c.save(); scrollShape(c, x0, y0, x1, y1, 31); c.clip();
    for (var k = 0; k < 60; k++) { c.fillStyle = 'rgba(150,120,70,' + (0.025 + 0.03 * ((k * 37) % 7) / 7).toFixed(3) + ')'; c.fillRect(x0 + ((k * 197) % 1096), y0 + ((k * 53) % 112), 24 + (k * 13) % 80, 1.2); }
    c.restore();
    [x0 - 10, x1 + 10].forEach(function (rx) {
      var rg = c.createLinearGradient(rx - 9, 0, rx + 9, 0); rg.addColorStop(0, '#4a2f16'); rg.addColorStop(0.45, '#8a5c32'); rg.addColorStop(1, '#3e2812');
      c.save(); c.shadowColor = 'rgba(30,18,6,0.4)'; c.shadowBlur = 6; R.rrect(c, rx - 9, y0 - 14, 18, y1 - y0 + 28, 7); c.fillStyle = rg; c.fill(); c.restore();
      c.fillStyle = '#d9a21a'; c.fillRect(rx - 11, y0 - 16, 22, 5); c.fillRect(rx - 11, y1 + 11, 22, 5);
    });
    startBtn(st, 640 - 160, 516, 320, 58, 26);
    // 印章：沿卷轴上缘错落，角度/高度各不同，名字挂在下面
    var jit = [[0, 6, -0.12], [0, -10, 0.1], [0, 8, -0.06], [0, -6, 0.14], [0, 4, -0.1], [0, -8, 0.07], [0, 10, -0.13], [0, -4, 0.09], [0, 7, -0.05]];
    SP_IDS.forEach(function (id, n) { var cx = 160 + n * 120, cy = 606 + jit[n][1] * 0.5; drawAv(st, id, 'seal', cx, cy, id === 'phyrex' ? 58 : 50, { rot: jit[n][2] }); drawName(st, id, cx, cy + 32, 14, 'h', 'center', 'rgba(250,244,228,0)'); });
    saveLine(st, 640, 703, 'center', 10.5);
  }

  /* ================== V4 左画右栏：左边五人大幅水墨，右边留白宣纸上放标题/开始/头像 3×3/小按钮（无框，只有一道飞白竖笔分隔） ================== */
  function V4(st) {
    var c = st.c;
    drawFig(st, 'wujing', 100, 712, 420); drawFig(st, 'horse', 726, 712, 410);
    drawFig(st, 'wukong', 215, 728, 470); drawFig(st, 'bajie', 625, 728, 470); drawFig(st, 'tang', 420, 742, 520);
    heroName(st, 'wujing', 28, 250, 100); heroName(st, 'horse', 752, 250, 96); heroName(st, 'wukong', 120, 150, 108); heroName(st, 'bajie', 560, 150, 108); heroName(st, 'tang', 330, 90, 100);
    // 飞白竖笔分隔
    c.save(); c.globalAlpha = 0.3; c.fillStyle = INK; c.beginPath(); c.moveTo(776, 70); c.quadraticCurveTo(786, 360, 772, 650); c.quadraticCurveTo(770, 360, 770, 70); c.fill(); c.restore();
    var cx = 1010; halo(c, cx, 360, 330, 330, 0.5);
    title(st, cx, 80, 78, 0, 0.5);
    c.save(); glow(c, 'rgba(250,244,228,0.95)', 6); U.text(c, '打掉洞府 BOSS，断掉妖怪的来路', cx, 138, 12.5, '#4a3a1c', 'center', false, null, 1.2); U.text(c, '护送唐僧走到西边关口', cx, 156, 12.5, '#4a3a1c', 'center', false, null, 1.2); c.restore();
    startBtn(st, cx - 175, 180, 350, 60, 26);
    taper(c, cx - 120, 268, cx + 120, 2.5, 0.4); U.text(c, '特邀英杰', cx, 268, 12, '#7a6a47', 'center', true, KAI, 4);
    SP_IDS.forEach(function (id, n) { var col = n % 3, row = (n / 3) | 0, x = cx - 120 + col * 120, y = 330 + row * 104; drawAv(st, id, 'ink', x, y, 74); drawName(st, id, x, y + 40, 19, 'h', 'center'); });
    saveLine(st, 20, 708, 'left', 10.5);
  }
  var LAY = { 1: V1, 2: V2, 3: V3, 4: V4 };
  function modeOf(app) { return app.lw < app.lh * 0.95 ? 'P' : (app.zoom && app.zoom < 0.8 ? 'L' : 'D'); }

  XY.menuV5 = {
    modeOf: modeOf,
    draw: function (c, G, app, v) {
      var W = app.lw, H = app.lh, inl = window.XY_MENU_V5; if (inl && !inl['bg_v' + v]) v = 2;
      var mode = v === 2 ? modeOf(app) : 'D', mo = app.mouse, DW, DH, k, ox, oy;
      if (mode === 'P') { k = Math.min(W / 780, H / 1500); DW = W / k; DH = H / k; ox = 0; oy = 0; }
      else if (mode === 'L') { var kL = Math.min(1, H / 720); if (kL < 0.999) { k = kL; DW = W / k; DH = 720; ox = 0; oy = 0; } else { k = 1; DW = W; DH = 720; ox = 0; oy = (H - 720) / 2; } }
      else { DW = 1280; DH = 720; k = Math.min(W / 1280, H / 720); ox = (W - 1280 * k) / 2; oy = (H - 720 * k) / 2; }
      var A = Object.create(app); A.mouse = mo ? { x: (mo.x - ox) / k, y: (mo.y - oy) / k } : null;
      var st = { k: k, c: c, app: app, A: A, rt: app.rt, mx: A.mouse ? A.mouse.x : -999, my: A.mouse ? A.mouse.y : -999, figs: [], av: [], tip: null, mode: mode, DW: DW, DH: DH, how: null, tk: 1, lim: null };
      var geom = M.geom = st.geom = { cards: [], sp: [], ents: [], title: null, poster: null, mode: mode }; var n0 = ui.hits.length, i;
      drawBg(c, W, H, v === 2 && mode === 'P' ? '2p' : v, app.rt);
      c.save(); c.translate(ox, oy); c.scale(k, k);
      LAY[v](st);
      var sel = XY.stage && XY.stage.sel && st.rt < XY.stage.sel.until ? XY.stage.sel.id : null;
      if (!st.tip && sel) st.figs.forEach(function (f) { if (f.id === sel) st.tip = f; });
      geom.tip = st.tip ? st.tip.id : null;
      if (st.tip) XY.stage.tip(c, app, { x: st.tip.x, y: st.tip.y, w: st.tip.w, h: st.tip.h }, DW, 0, st.tk, tipOf(st.tip.id));
      if (!geom.btn) geom.btn = { x: 640, y: 560, w: 10, h: 10 };
      var hg, hw = st.how || { s: 1, ax: DW / 2, ay: geom.btn.y }, n1 = ui.hits.length;
      c.save(); c.translate(hw.ax, hw.ay); c.scale(hw.s, hw.s); c.translate(-hw.ax, -hw.ay);
      var A2 = Object.create(A); A2.mouse = A.mouse ? { x: hw.ax + (A.mouse.x - hw.ax) / hw.s, y: hw.ay + (A.mouse.y - hw.ay) / hw.s } : null;
      hg = { btn: { y: hw.ay } }; M.drawHow(c, A2, hg, hw.ax, DW / hw.s);
      c.restore();
      for (i = n1; i < ui.hits.length; i++) { var q = ui.hits[i]; q.x = hw.ax + (q.x - hw.ax) * hw.s; q.y = hw.ay + (q.y - hw.ay) * hw.s; q.w *= hw.s; q.h *= hw.s; }
      c.restore();
      var cv = function (r) { return r && { x: ox + r.x * k, y: oy + r.y * k, w: r.w * k, h: r.h * k }; };
      var cvi = function (r) { var q = cv(r); q.id = r.id; q.art = true; return q; };
      geom.btn = cv(geom.btn); geom.how = cv(geom.how); geom.title = cv(geom.title); geom.foot = cv(geom.foot) || { x: 0, y: 0, w: 0, h: 0 }; geom.ents = geom.ents.map(cv);
      var figs = st.figs.map(cvi);
      geom.sp = st.av.map(function (a) { return { id: a.id, cx: ox + a.cx * k, cy: oy + a.cy * k, r: a.r * k, avatar: true, d: a.w * k, x: ox + a.x * k, y: oy + a.y * k, w: a.w * k, h: a.h * k }; });
      geom.cards = figs; geom.poster = { figs: figs, av: geom.sp, hover: null };
      geom.howPanel = hg.howPanel && { x: ox + (hw.ax + (hg.howPanel.x - hw.ax) * hw.s) * k, y: oy + (hw.ay + (hg.howPanel.y - hw.ay) * hw.s) * k, w: hg.howPanel.w * hw.s * k, h: hg.howPanel.h * hw.s * k };
      geom.scale = k; geom.dw = DW; geom.dh = DH;
      M.layout = { bottom: oy + (st.geom.bottomY || DH) * k, H: H };
      for (i = n0; i < ui.hits.length; i++) { if (i >= n1) continue; var h = ui.hits[i]; h.x = ox + h.x * k; h.y = oy + h.y * k; h.w *= k; h.h *= k; }
      for (i = n1; i < ui.hits.length; i++) { var h2 = ui.hits[i]; h2.x = ox + h2.x * k; h2.y = oy + h2.y * k; h2.w *= k; h2.h *= k; }
    }
  };
})();
