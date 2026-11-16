/* 局内「队伍」呼出面板（所有屏幕尺寸共用一套）：
 * - 默认收起：战场上只留一枚小的水墨「队伍」签（朱红印 + 墨边纸条），不常驻大卡。
 * - 点签 = 打开面板：app.partyPanel = true，main.js 的主循环看到它就不推进 XY.step（怪不走、波次不推、冷却不跑）；
 *   面板外是一层浅纸色遮罩，点遮罩 / 点右上「收起」朱印 / Esc / P = 收起，收起后时间自动继续。
 * - 面板是一整幅浅宣纸手卷海报（用户认可的效果图）：当前操控的人一幅大水墨像 + 竖排朱红题名，其余可指挥的人错落散开、
 *   圆形头像 + 竖排题名；气血是断墨线；跟随驻守出击守护是朱印 / 墨字；技能冷却是挂在头像边的念珠；底部一条水墨护法天兵。
 * - 唐僧（G.heroes[0]）是护送目标、自己赶路不受指挥，不进面板；战场上照旧。
 * - 新手教程讲卡片的那几步把面板钉开（不冻结、无遮罩，教程自己管时间）。
 * 构图用设计单位算（S.poster 的 k 换成 CSS 像素），登记点击框和调试框时换回逻辑像素。 */
(function () {
  'use strict';
  var XY = window.XY, R4 = XY.R4, PI2 = Math.PI * 2;
  var OB = ['follow', 'station', 'attack', 'guard'], OBL = { follow: '跟随', station: '驻守', attack: '出击', guard: '守护' };
  var TK = ['arrow', 'cannon', 'frost', 'siege', 'heal'];
  var INK = '#2f2618', INK2 = '#6b5a40', RED = '#b8300f', PAPER = '#f6ecd5', LINE = '#c9b98f';
  var X_IDS = ['diaoyulao', 'haiteng', 'heyuxi', 'kuanggong', 'laosiji', 'martin', 'phyrex', 'sisi', 'yuanzhang'];
  var S = XY.hud2 = {};
  S.phoneLand = function (app) { return !!(XY.ui2 && XY.ui2.on) && app.lw >= 1000 && app.zoom < 0.75; };
  function KAI() { return (XY.menu && XY.menu.KAI) || XY.C.FONT; }

  /* ---------------- 状态：呼出 / 收起 / 冻结 ---------------- */
  var TUT_PIN = { choose: 1, orders: 1, cmd_follow: 1, cmd_station: 1, cmd_attack: 1, cmd_guard: 1 };
  function available(G, app) { return !!G && !G.villain && app.screen === 'play' && G.mode === 'play'; }
  var P = XY.party = {
    pinned: function (G) { var tt = G && G.tut, list = XY.tutSteps ? XY.tutSteps(G) : XY.TUT_STEPS, st = tt && list && list[tt.i]; return !!(st && TUT_PIN[st.id]); },
    visible: function (G, app) { return available(G, app) && (!!app.partyPanel || P.pinned(G)); },
    frozen: function (app) { return available(XY.G, app) && !!app.partyPanel; },
    open: function (app) { var G = XY.G; if (!available(G, app) || G.tut) return false; app.partyPage = 0; app.partyPanel = true; var qs=narrowState(G,app);qs.view='traits';qs.info=null;qs.traitPage=0; app.build = null; app.summon = null; app.selTower = null; if (app.mm) { app.mm.holding = false; } return true; },
    close: function (app) { app.partyPanel = false; },
    toggle: function (app) { return app.partyPanel ? (P.close(app), false) : P.open(app); }
  };

  /* ---------------- 头像 ---------------- */
  var xav = {};
  function xAvatar(id) {
    if (X_IDS.indexOf(id) < 0) return null;
    var e = xav[id];
    if (!e) {
      var src = 'assets/art/x-avatars/' + id + '.jpg';
      e = xav[id] = { img: null };
      if (src) { var im = new Image(); im.src = src; e.img = im; }
    }
    return e.img && e.img.complete && e.img.naturalWidth > 0 ? e.img : null;
  }
  S.hasX = function (id) { return X_IDS.indexOf(id) >= 0 && !!(window.XY_X_AVATARS ? window.XY_X_AVATARS[id] : true); };
  S.stats = { x: 0, ink: 0, other: 0 };
  // 圆形头像：有 X 头像的用 X 头像；师徒五人用狂野水墨封面脸；都没有才退回其它立绘。返回用了哪种。
  function face(c, h, x, y, r, rt) {
    var d = h.def, kind = 'other';
    c.save(); c.fillStyle = 'rgba(70,50,25,0.16)'; c.beginPath(); c.arc(x + 1.2, y + 2, r + 2, 0, PI2); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(x, y, r, 0, PI2); c.fillStyle = PAPER; c.fill(); c.restore();
    // A custom hero keeps its skill prototype in h.id; its own image belongs to def.xid.
    // While that image decodes, show this character's own initial, never its prototype's avatar.
    var custom = !!d.xid;
    var im = custom ? (XY.xchar && XY.xchar.img && XY.xchar.img(d.xid)) : xAvatar(h.id);
    if (im && !(im.naturalWidth > 0 && im.naturalHeight > 0)) im = null;
    if (im) {
      c.save(); c.beginPath(); c.arc(x, y, r, 0, PI2); c.clip(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      var s = Math.min(im.naturalWidth, im.naturalHeight); c.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, x - r, y - r, r * 2, r * 2); c.restore();
      kind = 'x';
      if (custom && XY.xchar) XY.xchar.drawnAvatar++;
    } else if (custom) {
      c.save(); c.fillStyle = INK2; c.font = 'bold ' + Math.round(r) + 'px ' + KAI();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((d.name || '?').charAt(0), x, y + 1); c.restore();
    } else if (XY.heroink && XY.heroink.has(d.id === 'horse' && d.form === 'human' ? 'horse_human' : h.id) && XY.heroink.face(c, d, x, y, r)) {
      kind = 'ink';
    } else {
      c.save(); c.beginPath(); c.arc(x, y, r, 0, PI2); c.clip();
      var ok = XY.chibi && XY.chibi.portrait(c, custom ? h.id : (XY.chibiKey ? XY.chibiKey(h) : h.id), x, y + r * 1.15, r * 2.1, 1);
      if (!ok) { c.fillStyle = INK2; c.font = 'bold ' + Math.round(r) + 'px ' + KAI(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((d.name || '?').charAt(0), x, y + 1); }
      c.restore();
    }
    // 断续干笔墨圈（盖掉头像自带的彩色外环，不像 App 头像框）
    var sd = (h.id.charCodeAt(0) * 31 + h.id.length * 7) % 997;
    c.save(); c.lineWidth = Math.max(3, r * 0.24); c.strokeStyle = 'rgba(244,235,211,0.97)'; c.beginPath(); c.arc(x, y, r + r * 0.04, 0, PI2); c.stroke();
    c.lineCap = 'round';
    for (var q = 0; q < 40; q++) {
      var a0 = rnd(sd + q) * PI2, rr = r * (0.97 + rnd(sd + q + 50) * 0.09);
      c.strokeStyle = 'rgba(40,30,18,' + (0.25 + rnd(sd + q + 100) * 0.55).toFixed(2) + ')'; c.lineWidth = 0.6 + rnd(sd + q + 150) * Math.max(1.4, r * 0.05);
      c.beginPath(); c.arc(x, y, rr, a0, a0 + 0.08 + rnd(sd + q + 200) * 0.22); c.stroke();
    }
    var cf = X_IDS.indexOf(h.id) >= 0 && XY.VD && XY.VD.activeFrame && XY.VD.activeFrame();
    if (cf) XY.VD.drawFrame(c, x, y, r + 1, cf);
    c.restore();
    S.stats[kind]++; return kind;
  }

  S.face = face;   // 商店等海报页共用真实 X / 水墨头像

  /* ---------------- 水墨小部件 ---------------- */
  function rnd(seed) { var s = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  // 宣纸卡：毛边（固定种子的小抖动）+ 纸色渐变 + 墨边
  function paperPath(c, x, y, w, h, seed, amp) {
    var pts = [], st = 9, k, n;
    n = Math.max(2, Math.round(w / st)); for (k = 0; k < n; k++) pts.push([x + w * k / n, y + (rnd(seed + k) - 0.5) * amp]);
    n = Math.max(2, Math.round(h / st)); for (k = 0; k < n; k++) pts.push([x + w + (rnd(seed + 50 + k) - 0.5) * amp, y + h * k / n]);
    n = Math.max(2, Math.round(w / st)); for (k = 0; k < n; k++) pts.push([x + w - w * k / n, y + h + (rnd(seed + 100 + k) - 0.5) * amp]);
    n = Math.max(2, Math.round(h / st)); for (k = 0; k < n; k++) pts.push([x + (rnd(seed + 150 + k) - 0.5) * amp, y + h - h * k / n]);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath();
  }
  // 朱红方印（编号 / 队伍签）
  function seal(c, x, y, s, text, rot, vertical) {
    c.save(); c.translate(x + s / 2, y + s / 2); c.rotate(rot || -0.06);
    c.fillStyle = RED; c.beginPath(); c.moveTo(-s / 2 + 1, -s / 2); c.lineTo(s / 2, -s / 2 + 1); c.lineTo(s / 2 - 1, s / 2); c.lineTo(-s / 2, s / 2 - 1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,236,210,0.75)'; c.lineWidth = Math.max(0.8, s * 0.05); c.strokeRect(-s / 2 + s * 0.12, -s / 2 + s * 0.12, s * 0.76, s * 0.76);
    c.fillStyle = 'rgba(255,240,220,0.18)'; for (var k = 0; k < 4; k++) c.fillRect((rnd(k * 3 + s) - 0.5) * s * 0.8, (rnd(k * 5 + s) - 0.5) * s * 0.8, 1.4, 1.4);
    c.fillStyle = '#fff6e8'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (vertical && text.length === 2) { c.font = 'bold ' + Math.round(s * 0.38) + 'px ' + KAI(); c.fillText(text.charAt(0), 0, -s * 0.2); c.fillText(text.charAt(1), 0, s * 0.22); }
    else { c.font = 'bold ' + Math.round(s * (text.length > 1 ? 0.5 : 0.66)) + 'px ' + KAI(); c.fillText(text, 0, s * 0.04); }
    c.restore();
  }
  function kai(c, s, x, y, sz, col, al) { c.font = 'bold ' + sz + 'px ' + KAI(); c.fillStyle = col; c.textAlign = al || 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); }
  function measureWidth(c, s) { return XY.ui2 && XY.ui2.measureWidth ? XY.ui2.measureWidth(c, s) : c.measureText(s).width; }
  function fitSz(c, s, sz, maxW, font) { c.font = 'bold ' + sz + 'px ' + (font || KAI()); while (sz > 8 && measureWidth(c, s) > maxW) { sz -= 0.5; c.font = 'bold ' + sz + 'px ' + (font || KAI()); } return sz; }

  /* ---------------- 布局：水墨海报手卷（设计单位 × k = CSS 像素） ---------------- */
  // 三套构图，都按用户认可的效果图：整幅浅宣纸手卷，左边当前操控的人一幅大水墨像，其余可指挥的人错落散在右边（竖屏走 S 形两列）。
  // 唐僧是护送目标（G.heroes[0]，自己赶路、不受指挥），不进面板。
  function crew(G) { var o = []; G.heroes.forEach(function (h, i) { if (i > 0 && h.id !== 'tang') o.push({ h: h, i: i }); }); return o; }
  S.crew = crew;
  function leadOf(G, cr) {
    var k; for (k = 0; k < cr.length; k++) if (cr[k].i === G.ctrl && !cr[k].h.down) return cr[k];
    for (k = 0; k < cr.length; k++) if (!cr[k].h.down) return cr[k];
    return cr[0] || null;
  }
  // render4 用到：cover（打开时不画原来的天兵条，手卷底部自带一条水墨天兵）、tabC（收起签位置）
  S.layout = function (G, app) {
    var z = app.zoom, W = app.lw * z, H = app.lh * z, por = app.lw < 1000, phone = S.phoneLand(app), tower = phone ? S.towerBox(G, app) : null, tabH = 46;
    var tabC = por ? { x: 8, y: H - 111 - 8 - tabH } : { x: phone ? tower.x + tower.w + 8 : (12 + 214 + 10) * z, y: H - 10 - tabH };
    return { z: z, W: W, H: H, por: por, phone: phone, cover: true, tabW: Math.round(Math.min(178, Math.max(150, 150 * Math.max(1, z)))), tabH: tabH, tabC: tabC, tower: tower };
  };
  S.towerBox = function (G, app) { return {x:8,y:app.lh*app.zoom-184,w:132,h:184}; };
  // 海报构图（设计单位）。k：设计单位 → CSS 像素
  S.poster = function (G, app) {
    var z = app.zoom, W = app.lw * z, H = app.lh * z, por = app.lw < 1000, phone = !por && S.phoneLand(app), k, P0;
    if (por) k = Math.max(0.85, Math.min(1.25, W / 390));
    else if (phone) k = Math.max(0.7, Math.min(1.2, H / 390));          // 比 844 还窄的手机整体缩小，不让相邻两人的点击区相叠
    else k = Math.min(W / 1280, H / 720);
    var DW = W / k, DH = H / k;
    if (por) {
      var tp = DH - 676;
      P0 = { mode: 'por', top: tp, head: { x: 16, y: tp + 22, sz: 22 }, close: { x: DW - 94, y: tp - 4, w: 86, h: 46, sz: 15 },
        lead: { art: { x: 0, y: tp + 46, w: 226, h: 186 }, colR: DW - 4, name: { x: 248, y: tp + 60, sz: 26 }, mark: { x: 280, y: tp + 60 },
          row: { x: 298, y: tp + 54, w: DW - 302, h: 38, stack: true }, beads: { x: 300, y: tp + 144, w: DW - 306, h: 84, isz: 12 },
          hp: { x: 18, y: tp + 238, w: 110, sz: 11 }, st: { cx: DW / 2, y: tp + 246, w: 56, h: 40, gap: 6, sz: 15 } },
        minor: { r: 27, nameSz: 16, hpSz: 10, rowDy: 8, rowH: 38, rowW: 84, stDy: 48, stW: 44, stH: 40, stSz: 13, isz: 11,
          spots: [[DW * 0.27, tp + 324], [DW * 0.75, tp + 336], [DW * 0.27, tp + 468], [DW * 0.75, tp + 482]] },
        foot: { y: DH - 52, tx: 12, tw: 56, th: 44, label: false, info: false, keys: false } };
    } else if (phone) {
      var tq = DH - 278;
      P0 = { mode: 'phone', top: tq, head: { x: 16, y: tq + 16, sz: 21 }, close: { x: DW - 96, y: tq - 18, w: 88, h: 46, sz: 14 },
        lead: { art: { x: 2, y: tq + 22, w: 196, h: 134 }, colR: 260, name: { x: 214, y: tq + 34, sz: 20 }, mark: { x: 244, y: tq + 34 },
          row: { x: 200, y: tq + 116, w: 60, h: 30, stack: true }, beads: { x: 8, y: tq + 138, w: 188, h: 14, isz: 11 },
          hp: { x: 14, y: tq + 162, w: 90, sz: 10 }, st: { cx: 100, y: tq + 170, w: 42, h: 40, gap: 4, sz: 13 } },
        minor: { r: 23, nameSz: 14, hpSz: 9, rowDy: 9, rowH: 30, rowW: 66, stDy: 40, stW: 38, stH: 40, stSz: 12, isz: 9, x0: 266, x1: DW - 6, ya: tq + 58, yb: tq + 104 },
        foot: { y: DH - 56, tx: 84, tw: 52, th: 44, label: true, info: true, keys: false } };
    } else {
      var tr = DH - 420;
      P0 = { mode: 'desk', top: tr, head: { x: 22, y: tr + 34, sz: 24, v: true }, close: { x: DW - 150, y: tr + 4, w: 120, h: 50, sz: 18 },
        lead: { art: { x: 42, y: tr - 14, w: 326, h: 262 }, colR: 464, name: { x: 394, y: tr + 44, sz: 38 }, mark: { x: 438, y: tr + 40 },
          row: { cx: 205, y: tr + 270, w: 128, h: 30 }, beads: { x: 422, y: tr + 160, w: 40, h: 120, isz: 13 },
          hp: { x: 66, y: tr + 256, w: 150, sz: 14, label: '气血 ' }, st: { cx: 205, y: tr + 304, w: 58, h: 40, gap: 6, sz: 17 } },
        minor: { r: 46, nameSz: 20, hpSz: 11, rowDy: 12, rowH: 30, rowW: 100, stDy: 44, stW: 50, stH: 38, stSz: 15, isz: 13, x0: 474, x1: DW - 20, ya: tr + 108, yb: tr + 178 },
        foot: { y: DH - 50, tx: 118, tw: 60, th: 44, label: true, info: true, keys: true } };
    }
    P0.paged = phone && W < 760;
    P0.minor.stW = Math.max(P0.minor.stW, 36 / k); P0.minor.stH = Math.max(P0.minor.stH, 36 / k);
    P0.k = k; P0.DW = DW; P0.DH = DH; P0.W = W; P0.H = H; P0.z = z;
    return P0;
  };
  // 其余人的落点：横屏一排错落（单双交替高低），竖屏 S 形两列
  function spots(P0, n) {
    var M = P0.minor, out = [], q;
    if (M.spots) { for (q = 0; q < n; q++) out.push(M.spots[q] || M.spots[M.spots.length - 1]); return out; }
    var slot = Math.min((M.x1 - M.x0) / Math.max(1, n), M.stW * 4 + 50), w0 = slot * n, x0 = M.x0 + (M.x1 - M.x0 - w0) / 2;
    for (q = 0; q < n; q++) out.push([x0 + slot * (q + 0.5), q % 2 ? M.yb : M.ya]);
    return out;
  }

  /* ---------------- 水墨部件 ---------------- */
  // 手卷：波浪毛边 + 上沿渐隐 + 几道纸纤维
  function scroll(c, P0) {
    var DW = P0.DW, DH = P0.DH, top = P0.top, x;
    function edge(x) { return top + Math.sin(x / 38) * 5 + Math.sin(x / 13) * 2; }
    c.save();
    c.beginPath(); c.moveTo(-2, DH + 2); for (x = -2; x <= DW + 8; x += 8) c.lineTo(x, edge(x) - 10); c.lineTo(DW + 2, DH + 2); c.closePath();
    var g = c.createLinearGradient(0, top - 14, 0, top + 26); g.addColorStop(0, 'rgba(244,235,211,0)'); g.addColorStop(0.55, 'rgba(244,235,211,0.86)'); g.addColorStop(1, 'rgba(244,235,211,0.97)');
    c.fillStyle = g; c.fill();
    c.fillStyle = 'rgba(244,235,211,0.97)'; c.fillRect(-2, top + 25, DW + 4, DH - top);
    var vg = c.createLinearGradient(0, top, 0, DH); vg.addColorStop(0, 'rgba(150,120,70,0)'); vg.addColorStop(1, 'rgba(150,120,70,0.10)'); c.fillStyle = vg; c.fillRect(-2, top + 10, DW + 4, DH - top);
    c.strokeStyle = 'rgba(140,118,80,0.10)'; c.lineWidth = 0.6;
    for (var q = 0; q < 70; q++) { var fx = rnd(q + 3) * DW, fy = top + 30 + rnd(q + 91) * (DH - top - 34), fl = 3 + rnd(q + 7) * 10; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + fl, fy + (rnd(q + 13) - 0.5)); c.stroke(); }
    c.restore();
  }
  // 干笔横线（随机种子固定）
  function brush(c, x, y, w, col, th, seed) {
    c.save(); c.lineCap = 'round';
    for (var q = 0; q < 6; q++) {
      var yy = y + (rnd(seed + q) - 0.5) * th, a = 0.25 + rnd(seed + q + 20) * 0.5;
      c.strokeStyle = col.replace('A', a.toFixed(2)); c.lineWidth = 0.5 + rnd(seed + q + 40) * th * 0.5;
      c.beginPath(); c.moveTo(x + rnd(seed + q + 60) * w * 0.08, yy); c.lineTo(x + w * (0.82 + rnd(seed + q + 80) * 0.18), yy + (rnd(seed + q + 99) - 0.5)); c.stroke();
    }
    c.restore();
  }
  // 断墨线血量：有血的部分是几段浓墨，掉的部分是淡墨点
  function inkHp(c, x, y, w, frac, th, seed) {
    var segs = 7, sw = w / segs, col = frac < 0.3 ? 'rgba(184,48,15,A)' : 'rgba(40,30,18,A)';
    c.save(); c.lineCap = 'round';
    for (var q = 0; q < segs; q++) {
      var x0 = x + q * sw + 1.5, x1 = x + (q + 1) * sw - 1.5 - rnd(seed + q) * 2, full = (q + 1) / segs <= frac + 1e-6, part = !full && q / segs < frac;
      if (full || part) { var xe = part ? x + w * frac : x1; brush(c, x0, y, Math.max(1, xe - x0), col, th, seed + q * 7); }
      else { c.fillStyle = 'rgba(40,30,18,0.22)'; for (var d = x0; d < x1; d += 4) { c.beginPath(); c.arc(d, y, 0.7, 0, PI2); c.fill(); } }
    }
    c.restore();
  }
  // 竖排题名（拉丁字母名转 90° 竖写）
  function vname(c, s, x, y, sz, col, maxLen) {
    c.save(); c.font = 'bold ' + sz + 'px ' + KAI(); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (/^[\x00-\x7f]+$/.test(s)) { if (maxLen) fitSz(c, s, sz, maxLen); c.translate(x, y - sz * 0.5); c.rotate(Math.PI / 2); c.textAlign = 'left'; c.fillText(s, 0, 0); var lw = c.measureText(s).width; c.restore(); return lw; }
    for (var q = 0; q < s.length; q++) c.fillText(s.charAt(q), x, y + q * sz * 1.06);
    c.restore(); return s.length * sz * 1.06;
  }
  // 朱印 / 墨字的命令：选中 = 浓朱印（手动操控时 = 淡朱印）；没选中 = 墨字 + 一道淡墨底
  function stamp(c, x, y, w, h, text, st, rot, sz, hv) {
    var vw = Math.min(w - 4, sz * 2.5), vh = Math.min(h - 6, sz * 1.62), cx = x + w / 2, cy = y + h / 2, s0 = text.charCodeAt(0);
    c.save(); c.translate(cx, cy); c.rotate(rot);
    if (st === 1 || st === 2) {
      c.fillStyle = st === 1 ? RED : 'rgba(184,48,15,0.62)';
      c.beginPath(); c.moveTo(-vw / 2 + 1, -vh / 2); c.lineTo(vw / 2, -vh / 2 + 1.5); c.lineTo(vw / 2 - 1, vh / 2); c.lineTo(-vw / 2, vh / 2 - 1); c.closePath(); c.fill();
      c.fillStyle = 'rgba(250,238,210,0.35)'; for (var q = 0; q < 10; q++) c.fillRect((rnd(s0 + q) - 0.5) * vw * 0.9, (rnd(s0 + q + 30) - 0.5) * vh * 0.9, 1.1, 0.9);
      c.restore(); kai(c, text, cx, cy + 0.5, sz, '#fbf0dc');           // 字不跟着印歪，坐标落在点击框里
    } else {
      if (hv) { c.fillStyle = 'rgba(184,48,15,0.10)'; c.fillRect(-vw / 2, -vh / 2, vw, vh); }
      brush(c, -vw * 0.42, vh * 0.42, vw * 0.84, 'rgba(60,45,28,A)', 1.2, s0);
      c.restore(); kai(c, text, cx, cy - 0.5, sz, st === 3 ? '#a49d8e' : INK);
    }
  }
  // 冷却念珠：就绪 = 技能色实珠；冷却中 = 灰珠 + 墨色扇形 + 秒数
  function bead(c, sk, x, y, isz) {
    var frac = sk.off ? 1 : Math.max(0, Math.min(1, sk.rem / (sk.max || 1))), rdy = frac <= 0.001, INK = (XY.INKP && XY.INKP.INK) || '36,28,22';
    c.lineWidth = sk.kind === 'ult' ? 1.7 : 1.15; c.strokeStyle = 'rgba(' + INK + ',' + (rdy ? 0.9 : 0.4) + ')'; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, isz / 2, rdy ? 0.4 : -Math.PI / 2, rdy ? 5.2 : -Math.PI / 2 + PI2 * Math.max(0.08, 1 - frac)); c.stroke();
    c.lineCap = 'butt';
    if (!rdy) { if (isz >= 11) XY.R.txt(c, String(Math.ceil(sk.rem)), x, y + 0.5, isz < 13 ? 7 : 8, '#2a2218', 'center', true); }
    else if (!(XY.ICONINK && XY.ICONINK.draw(c, sk.name, x, y, isz * 1.2)) && isz >= 11) XY.R.txt(c, sk.name.charAt(0), x, y, 7, '#2a2218', 'center', true);
    return rdy;
  }
  // 念珠挂在头像左侧（130°→250°，不够再挂外一圈）；按方框不相叠来排，挂不下就把珠子缩小（最小 6）
  function beadArc(cx, cy, r, n, isz0) {
    for (var isz = isz0; isz >= 6; isz--) {
      var out = [];
      for (var ring = 0; ring < 2 && out.length < n; ring++) {
        var R = r + 3 + isz / 2 + ring * (isz + 2), a0 = (130 + 15 * ring) * Math.PI / 180, a1 = 250 * Math.PI / 180;
        for (var a = a0; a <= a1 + 1e-6 && out.length < n; a += 0.02) {
          var x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, ok = true;
          for (var q = 0; q < out.length; q++) if (Math.abs(out[q][0] - x) < isz + 1.5 && Math.abs(out[q][1] - y) < isz + 1.5) { ok = false; break; }
          if (ok) out.push([x, y]);
        }
      }
      if (out.length >= n || isz === 6) return { pts: out, isz: isz };
    }
  }
  function beadGrid(b, n) {
    var out = [], isz = b.isz, per = Math.max(1, Math.floor((b.w + 2) / (isz + 2))), q;
    while (isz > 7 && Math.ceil(n / per) * (isz + 2) > b.h + 2) { isz -= 1; per = Math.max(1, Math.floor((b.w + 2) / (isz + 2))); }
    for (q = 0; q < n; q++) out.push([b.x + (q % per) * (isz + 2) + isz / 2, b.y + Math.floor(q / per) * (isz + 2) + isz / 2]);
    return { pts: out, isz: isz };
  }
  // 当前操控者的大幅水墨像：狂野水墨封面裁半身，边缘羽化，正片叠底贴在宣纸上（只画不读像素，源码版 file:// 也不会污染画布）
  var artCache = {};
  function bigArt(c, h, b, sc) {
    var d = h.def, id = d.id === 'horse' && d.form === 'human' ? 'horse_human' : h.id;
    var im = XY.heroink && XY.heroink.has(id) && XY.heroink.cover(id);
    if (!im) return false;
    var key = id + '|' + Math.round(b.w) + 'x' + Math.round(b.h) + '@' + sc.toFixed(2), cv = artCache[key];
    if (!cv) {
      cv = artCache[key] = document.createElement('canvas'); cv.width = Math.max(2, Math.round(b.w * sc)); cv.height = Math.max(2, Math.round(b.h * sc));
      var g = cv.getContext('2d'), iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, sx = iw * 0.10, sy = ih * 0.04, sw = iw * 0.80, sh = ih * 0.76, ar = b.w / b.h;
      if (sw / sh > ar) { var nw = sh * ar; sx += (sw - nw) * (id === 'horse' ? 0.75 : 0.5); sw = nw; } else { var nh = sw / ar; sy += (sh - nh) * 0.12; sh = nh; }
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'destination-in';
      var gx = g.createLinearGradient(0, 0, cv.width, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.12, '#000'); gx.addColorStop(0.88, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gx; g.fillRect(0, 0, cv.width, cv.height);
      var gy = g.createLinearGradient(0, 0, 0, cv.height); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.06, '#000'); gy.addColorStop(0.84, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, cv.width, cv.height);
    }
    c.save(); c.globalCompositeOperation = 'multiply'; c.imageSmoothingEnabled = true; c.drawImage(cv, b.x, b.y, b.w, b.h); c.restore();
    return true;
  }
  // 没有水墨封面的（Phyrex 等特殊角色）：把 X 头像 / 头像画大，外面一圈淡墨晕 + 断续墨圈，不捏造立绘
  function bigFace(c, h, b, rt) {
    var r = Math.min(b.w, b.h) * 0.40, cx = b.x + b.w * 0.5, cy = b.y + b.h * 0.52;
    var wg = c.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.45); wg.addColorStop(0, 'rgba(60,48,30,0.20)'); wg.addColorStop(1, 'rgba(60,48,30,0)');
    c.fillStyle = wg; c.beginPath(); c.arc(cx, cy, r * 1.45, 0, PI2); c.fill();
    return S.face(c, h, cx, cy, r, rt);
  }
  function seen(c, h, x, y, r, rt) { c.save(); if (h.down) c.globalAlpha = 0.4; var k = S.face(c, h, x, y, r, rt); c.restore(); return k; }


/* BEGIN PARTY_NARROW_CANDIDATE_1 */
  // Narrow party uses real CSS dimensions. It is independent of control selection.
  S.narrowViewport = function (app) { return app.lw * app.zoom < 900; };
  S.narrowOpen = function (G, app) { return !!app.partyPanel && available(G, app) && !G.tut && S.narrowViewport(app); };
  S.narrowLayout = function (app) {
    var W=app.lw*app.zoom,H=app.lh*app.zoom,wide=W>=600,tabbed=!wide&&H<540;
    var L={W:W,H:H,wide:wide,tabbed:tabbed,margin:12,gap:8,font:16,target:44};
    L.contentX=wide?260:12;L.contentW=W-L.contentX-12;
    L.summaryY=tabbed?112:60;L.summaryH=wide||H<360?60:80;
    L.ordersY=L.summaryY+L.summaryH+8;L.skillsY=L.ordersY+52;
    L.utilityY=L.skillsY+52;L.utility=L.utilityY+44<=H-(tabbed?8:96);
    L.footY=H-88;L.footH=80;
    L.rosterX=12;L.rosterW=wide?236:W-24;
    L.rosterHead=wide?60:tabbed?112:304;L.rosterY=L.rosterHead+52;
    L.rosterPer=Math.max(1,Math.floor(((tabbed?H-8:L.footY-8)-L.rosterY+8)/60));
    L.soldierCols=Math.max(1,Math.min(5,Math.floor((W-24+8)/60)));
    L.soldierW=Math.min(72,Math.floor((W-24-8*(L.soldierCols-1))/L.soldierCols));
    return L;
  };
  var narrowGames=new WeakMap();
  function narrowState(G,app) {
    var cr=crew(G),s=narrowGames.get(app)===G?app.partyNarrow:null;
    if(!s){var lead=leadOf(G,cr);s=app.partyNarrow={focusIndex:lead?lead.i:null,page:0,view:'hero',info:null,infoPage:0};narrowGames.set(app,G);}
    var found=cr.filter(function(o){return o.i===s.focusIndex;})[0];
    if(!found&&cr.length)s.focusIndex=cr[0].i;
    return s;
  }
  S.partyAction = function (G,app,hit) {
    if(!/^party(?:Focus|Info|View)/.test(hit.act||'')||!S.readableOpen(G,app))return false;
    var s=narrowState(G,app),cr=crew(G),o=cr.filter(function(v){return v.i===hit.i;})[0];
    if(hit.act==='partyFocus'&&o){s.focusIndex=o.i;s.info=null;s.infoPage=0;s.view='hero';}
    else if(hit.act==='partyView'){s.view=hit.view;s.page=0;s.info=null;}
    else if(hit.act==='partyInfoTraitsPage'){var ql=S.traitsLayout(app,cr.length);s.traitPage=Math.max(0,Math.min(ql.pages-1,(s.traitPage||0)+hit.delta));}
    else if(hit.act==='partyInfo'){s.info=hit.kind;s.infoPage=0;}
    else if(hit.act==='partyInfoBack'){s.info=null;s.infoPage=0;}
    else if(hit.act==='partyInfoPage'){var pages=app.partyNarrowReading&&app.partyNarrowReading.pages||1;s.infoPage=Math.max(0,Math.min(pages-1,(s.infoPage||0)+hit.delta));}
    else if(hit.act==='partyFocusPage'){var desk=S.desktopOpen(G,app)&&app.lh*app.zoom>=640,L=desk?S.desktopLayout(app,cr.length):S.narrowLayout(app),n=desk?cr.length:Math.max(0,cr.length-1),pages=Math.max(1,Math.ceil(n/L.rosterPer));s.page=((s.page||0)+hit.delta+pages)%pages;}
    return true;
  };
  S.partyEscape = function (G,app) {
    if(!S.readableOpen(G,app))return false;
    var s=narrowState(G,app);if(!s.info)return false;
    s.info=null;s.infoPage=0;return true;
  };
  S.partyBuildFeedback = function (G,app,type) {
    if(!S.readableOpen(G,app)||!XY.TOWERS[type])return;
    if(XY.save.solOwned(type)&&G.coins>=XY.soldierCost(G,type))return;
    var s=narrowState(G,app);s.info='soldier:'+type;s.infoPage=0;
  };
  function narrowInfo(G,o,kind) {
    var h=o.h,list=XY.skillList(G,h),sk=list.filter(function(v){return v.id===kind;})[0],ex=extras(G,h),spec={title:'角色详情',subtitle:h.def.name,lines:[],actions:[],keepWords:[h.def.name,h.def.weapon,h.def.ult].concat(list.map(function(v){return v.name;}),(h.def.sup||[]).map(function(v){return v.name;}))};
    if(kind==='hero')spec.lines=R4.heroInfo(h).concat(h.down?['阵亡：本关无法再战。']:['当前命令：'+(XY.ORDER_NAME[h.order]||h.order)]);
    else if(kind==='orders'){
      spec.title='命令说明';spec.lines=OB.map(function(id){return XY.ORDER_NAME[id]+'：'+XY.ORDER_DESC[id];});
      if(G.ctrl===o.i)spec.lines.unshift('当前正在手动操控此人。设置命令后，切换操控角色才由其按命令行动。');
    }else if(sk){spec.title=kind==='main'?'普攻说明':'必杀说明';spec.lines=[sk.name,h.down?'本关阵亡，无法使用技能':sk.rem>0?'剩余冷却 '+Math.ceil(sk.rem)+'秒':'已经就绪',sk.tip||''];}
    else if(kind==='aux'){
      spec.title='辅助技能';spec.lines=['已学辅助技能会按自身条件自动释放。'];spec.blocks=[{text:spec.lines[0]}];
      list.filter(function(v){return v.kind==='sup';}).forEach(function(v){
        var lv=XY.skLv(h,v.id),nd=XY.nodeStatus&&XY.TREE&&XY.TREE[h.id]&&XY.TREE[h.id].by[v.id]?XY.nodeStatus(G,o.i,v.id).node:null;
        var title=v.name+' · '+lv+'级'+(v.rem>0?' · 冷却 '+Math.ceil(v.rem)+'秒':''),body=nd?XY.nodeText(nd,lv):(XY.supDef(h.id,v.id)||{}).effect||v.tip||'';
        spec.lines.push(title,body);spec.blocks.push({title:title,text:body,continued:v.name+'（续）'});
      });
      if(spec.lines.length===1){spec.lines=['尚未学习辅助技能。可在修行中查看和学习。'];spec.blocks=[{text:spec.lines[0]}];}
    }else if(kind==='more'){
      spec.title='技能与操作';spec.menu=[{label:'角色详情',hit:{act:'partyInfo',kind:'hero'}},{label:'辅助技能',hit:{act:'partyInfo',kind:'aux'}},{label:'命令说明',hit:{act:'partyInfo',kind:'orders'}}];
      ex.filter(function(v){return v.act!=='trait';}).forEach(function(v){spec.menu.push({label:v.act==='ride'?'骑乘说明':'变身说明',hit:{act:'partyInfo',kind:v.act}});});
      spec.menu.push({label:'天兵说明',hit:{act:'partyInfo',kind:'soldiers'}},{label:'特殊角色召唤',hit:{act:'partyInfo',kind:'summon'}});
    }else if(kind.indexOf('soldier:')===0){
      var type=kind.slice(8),d=XY.TOWERS[type],price=XY.soldierCost(G,type);
      spec.title='天兵未能出战';spec.subtitle=d.name;
      spec.lines=!XY.save.solOwned(type)?['尚未获得'+d.name+'卡。','击败 Boss 或开启宝箱可获得天兵卡。']:['金币不够：'+d.name+'要 '+price+' 金币'];
      spec.lines.push('当前金币 '+G.coins+'，本次未扣除金币。');spec.keepWords.push('天兵卡');
    }else if(kind==='soldiers'){
      spec.title='护法天兵';spec.lines=['已布置 '+G.towers.length+'/'+XY.soldierCap(G)+'。选择天兵后返回战场，再选择落点。'];
      spec.blocks=[{text:spec.lines[0]}];
      TK.forEach(function(id){var d=XY.TOWERS[id],info=XY.soldierDescription(G,id),title=d.name+(XY.save.solOwned(id)?' · 卡'+info.cardLevel+'阶':' · 未有卡（首卡效果）')+' · '+XY.soldierCost(G,id)+'金';spec.lines.push(title,info.details);spec.blocks.push({title:title,text:info.details,continued:d.name+'（续）'});});
    }else if(kind==='summon'){
      spec.title='特殊角色召唤';spec.lines=['返回战场后，点击右下角「召唤」或按 G。','随机召来一位特殊角色（不含本局选择的角色），登场时施放必杀。','停留 '+XY.C.GUEST.STAY+'秒，冷却 '+XY.guest.cdMax(G)+'秒。'];
      spec.actions=[{label:'返回战场',hit:{act:'party'}}];
    }else{
      var item=ex.filter(function(v){return v.act===kind;})[0];
      spec.title=kind==='trait'?'特性说明':kind==='ride'?'骑乘说明':'变身说明';
      if(item){
        var sameTarget=kind==='xform'?!!XY.phyrexOf&&XY.phyrexOf(G)===h:kind==='ride'?G.heroes[4]===h&&h.id==='horse':true;
        var blocked=h.down||!item.ok||(kind==='xform'&&!XY.phyrexCanXform(G).ok)||(kind==='trait'&&!item.ready);
        spec.lines=[item.label].concat(item.tip);
        if(sameTarget)spec.actions=[{label:h.down?'本关无法再战':kind==='trait'?'发动特性':kind==='ride'?'切换骑乘':blocked?item.label:'变身',hit:{act:kind,i:o.i},off:blocked}];
        else spec.lines.unshift(kind==='xform'?'此角色不支持这项变身操作。':'此角色不支持骑乘操作。骑乘由队伍中的白龙马执行。');
      }
      else spec.lines=['这位角色没有此项能力。'];
    }
    return spec;
  }
  // Two visible sections share the existing party header and pause ownership.
  S.partyHeader=function(U,G,a,L,s){
    var desk=!!L.desktop,x=desk?L.x:12,y=desk?16:8,w=desk?L.w:L.W-24,narrow=w<560,titleW=narrow?44:104,closeW=narrow?44:112,gap=8,tw=Math.min(200,(w-titleW-closeW-gap*3)/2),tx=x+titleW+gap;
    U.text('队伍',x,y+(narrow?12:13),narrow?20:28,'left',true);U.text('暂停',x,y+34,14,'left',false,INK2);
    U.button(tx,y,tw,44,'主动特性',{act:'partyView',view:'traits'},{on:s.view==='traits'});
    U.button(tx+tw+gap,y,tw,44,'角色与命令',{act:'partyView',view:'hero'},{on:s.view!=='traits'});
    var bx=x+w-closeW;U.button(bx,y,closeW,44,narrow?'':'返回战场',{act:'party'},{primary:true});
    if(narrow){U.text('返回',bx+closeW/2,y+12,14,'center',true,'#fff6e8');U.text('战场',bx+closeW/2,y+32,14,'center',true,'#fff6e8');}
    XY.ui.party.tab=XY.ui.hits[XY.ui.hits.length-1];
  };
  S.traitState=function(G,o){
    var h=o.h,tr=XY.traitOf(h),reason='';
    if(G.mode!=='play'||G.ending)reason='现在不能发动';
    else if(!tr)reason='没有主动特性';
    else if(h.down)reason='本关已阵亡';
    else if(G.heroes[0].down)reason='师父已倒下';
    else if(h.def.special&&!h.def.traitOpen)reason='特性 2 级解锁';
    else if(h.traitCd>0)reason='冷却 '+Math.ceil(h.traitCd)+' 秒';
    return{i:o.i,hero:h.def.name,name:tr?tr.name:'暂无特性',ready:!reason,status:reason||'就绪 · 点击发动',left:Math.max(0,h.traitCd||0),max:h.traitMax||XY.traitCdOf(h)};
  };
  S.traitsLayout=function(a,n){
    var W=a.lw*a.zoom,H=a.lh*a.zoom,desk=W>=900&&H>=640,L=S.narrowLayout(a),cols=desk?3:H>=540&&W<600?1:2,gap=desk?12:8,rowH=desk?112:cols===1?80:64,x=12,w=W-24,top=60,bottom=H-52,rows=Math.max(1,Math.floor((bottom-top+gap)/(rowH+gap))),panel=null;
    if(desk){
      var pw=Math.min(960,W-48),maxRows=Math.max(1,Math.floor((H-48-144+gap)/(rowH+gap)));rows=Math.min(Math.max(1,Math.ceil(n/cols)),maxRows);
      var ph=144+rows*rowH+(rows-1)*gap,py=(H-ph)/2,px=(W-pw)/2;panel={x:px,y:py,w:pw,h:ph};
      L={W:W,H:H,desktop:true,x:px+16,w:pw-32,top:py,frameH:ph};x=L.x;w=L.w;top=py+76;bottom=top+rows*rowH+(rows-1)*gap+4;
    }
    var per=cols*rows;return{W:W,H:H,desktop:desk,header:L,panel:panel,x:x,y:top,w:w,cols:cols,gap:gap,rowH:rowH,cellW:(w-gap*(cols-1))/cols,per:per,pages:Math.max(1,Math.ceil(n/per)),footer:bottom+8};
  };
  S.drawQuickParty=function(c,G,a){
    var cr=crew(G),s=narrowState(G,a),L=S.traitsLayout(a,cr.length),z=a.zoom,page=Math.min(L.pages-1,s.traitPage||0);s.traitPage=page;
    a._tip=null;a.readableTip=null;a.partyNarrowReading=null;XY.ui.hits.length=0;XY.ui.cardDbg=[];
    XY.ui.party={open:true,pinned:false,traits:true,tab:null,sheet:{x:0,y:0,w:a.lw,h:a.lh},ids:cr.map(function(o){return o.h.id;})};
    var dbg=a.partyTraitsGeometry={layout:L,page:page,pages:L.pages,cards:[],texts:[],regions:[],controlIndex:G.ctrl};
    function text(str,x,y,size,align,bold,color){c.font=(bold?'bold ':'')+size+'px '+(bold&&/^[\u3400-\u9fff\s]+$/.test(String(str))?KAI():XY.C.FONT);c.fillStyle=color||INK;c.textAlign=align||'left';c.textBaseline='middle';c.fillText(String(str),x,y);var w=c.measureText(String(str)).width;dbg.texts.push({text:String(str),x:align==='center'?x-w/2:align==='right'?x-w:x,y:y-size/2,w:w,h:size,fontCSS:size});}
    function hit(x,y,w,h,data,label){var b={x:x/z,y:y/z,w:w/z,h:h/z};Object.keys(data).forEach(function(k){b[k]=data[k];});XY.ui.hits.push(b);dbg.regions.push({x:x,y:y,w:w,h:h,act:data.act,i:data.i,view:data.view,label:label||data.act});return b;}
    function button(x,y,w,h,label,data,opt){opt=opt||{};c.fillStyle=opt.off?'#e7e0d2':opt.primary?RED:opt.on?'#ead2b7':'#fcf5e5';c.fillRect(x,y,w,h);c.strokeStyle=opt.off?'#d2c8b7':opt.on?RED:LINE;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);if(label)text(label,x+w/2,y+h/2,16,'center',true,opt.primary?'#fff6e8':opt.off?INK2:INK);if(!opt.off)hit(x,y,w,h,data,label);}
    var U={text:text,button:button};c.save();c.scale(1/z,1/z);c.fillStyle=PAPER;c.fillRect(0,0,L.W,L.H);hit(0,0,L.W,L.H,{act:'ui'},'party-blocker');
    if(L.panel){c.fillStyle='#e9e0cc';c.fillRect(0,0,L.W,L.H);paperPath(c,L.panel.x,L.panel.y,L.panel.w,L.panel.h,143,1.3);c.fillStyle=PAPER;c.fill();c.strokeStyle=LINE;c.lineWidth=1;c.stroke();}
    if(L.desktop){c.save();c.translate(0,L.header.top);S.partyHeader(U,G,a,L.header,s);c.restore();dbg.regions.forEach(function(b){if(b.act!=='ui')b.y+=L.header.top;});XY.ui.hits.forEach(function(b){if(b.act!=='ui')b.y+=L.header.top/z;});dbg.texts.forEach(function(b){b.y+=L.header.top;});}
    else S.partyHeader(U,G,a,L.header,s);
    cr.slice(page*L.per,(page+1)*L.per).forEach(function(o,j){
      var v=S.traitState(G,o),x=L.x+j%L.cols*(L.cellW+L.gap),y=L.y+Math.floor(j/L.cols)*(L.rowH+L.gap),w=L.cellW,h=L.rowH,col=v.ready?RED:INK2;
      button(x,y,w,h,'',v.ready?{act:'trait',i:o.i}:{act:'ui'},{off:false,on:false});
      if(!v.ready){c.fillStyle='#e7e0d2';c.fillRect(x+1,y+1,w-2,h-2);}
      var yy=L.desktop?[22,53,86]:L.cols===1?[16,39,63]:[12,32,52],fs=L.desktop?[18,22,16]:L.cols===1?[16,18,14]:[14,16,14];
      var avatar=w>=208,ar=L.desktop?26:20,ax=x+(L.desktop?42:32),ay=y+h/2,tx=avatar?x+(L.desktop?82:60):x+w/2,align=avatar?'left':'center',faceKind=null;
      if(avatar)faceKind=seen(c,o.h,ax,ay,ar,a.rt);
      text(v.hero,tx,y+yy[0],fs[0],align,false,INK2);text(v.name,tx,y+yy[1],fs[1],align,true,col);text(v.status,tx,y+yy[2],fs[2],align,false,col);
      if(v.left>0&&v.max>0){c.fillStyle='#c7bb9e';c.fillRect(x+8,y+h-4,w-16,2);c.fillStyle=RED;c.fillRect(x+8,y+h-4,(w-16)*Math.max(0,Math.min(1,1-v.left/v.max)),2);}
      dbg.cards.push({rect:{x:x,y:y,w:w,h:h},i:o.i,id:o.h.id,state:v,avatar:avatar?{x:ax-ar,y:ay-ar,w:ar*2,h:ar*2,kind:faceKind}:null});
    });
    if(L.pages>1){button(L.x,L.footer,64,44,'上一页',{act:'partyInfoTraitsPage',delta:-1},{off:page===0});text((page+1)+' / '+L.pages,L.x+L.w/2,L.footer+22,16,'center');button(L.x+L.w-64,L.footer,64,44,'下一页',{act:'partyInfoTraitsPage',delta:1},{off:page===L.pages-1});}
    else text('返回战场后，冷却继续计时',L.x+L.w/2,L.footer+22,14,'center',false,INK2);
    c.restore();
  };
  S.drawNarrowParty = function (c,G,app,desktopShort) {
    if(!S.narrowOpen(G,app)&&!(desktopShort&&S.desktopOpen(G,app)))return;
    var L=S.narrowLayout(app),s=narrowState(G,app),cr=crew(G),o=cr.filter(function(v){return v.i===s.focusIndex;})[0],z=app.zoom;
    if(s.view==='traits')return S.drawQuickParty(c,G,app);
    app.partyTraitsGeometry=null;
    app._tip=null;app.partyNarrowReading=null;XY.ui.hits.length=0;XY.ui.cardDbg=[];
    XY.ui.party={open:true,pinned:false,narrow:true,focusIndex:s.focusIndex,focusId:o&&o.h.id,tab:null,sheet:{x:0,y:0,w:app.lw,h:app.lh},ids:cr.map(function(v){return v.h.id;})};
    var dbg=app.partyNarrowGeometry={layout:L,focusIndex:s.focusIndex,focusId:o&&o.h.id,focusXid:o&&o.h.def.xid||null,controlIndex:G.ctrl,controlId:G.heroes[G.ctrl]&&G.heroes[G.ctrl].id,regions:[],texts:[]};
    function text(str,x,y,size,align,bold,color){
      c.font=(bold?'bold ':'')+size+'px '+(bold&&/^[\u3400-\u9fff\s]+$/.test(String(str))?KAI():XY.C.FONT);c.fillStyle=color||INK;c.textAlign=align||'center';c.textBaseline='middle';c.fillText(String(str),x,y);
      var width=c.measureText(String(str)).width,left=align==='left'?x:align==='right'?x-width:x-width/2;
      dbg.texts.push({text:String(str),x:left,y:y-size/2,w:width,h:size,fontCSS:size});
    }
    function paper(x,y,w,h,border){c.fillStyle=PAPER;c.fillRect(x,y,w,h);if(border){c.strokeStyle=LINE;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);}}
    function hit(x,y,w,h,data,label){var b={x:x/z,y:y/z,w:w/z,h:h/z};Object.keys(data).forEach(function(k){b[k]=data[k];});XY.ui.hits.push(b);dbg.regions.push({x:x,y:y,w:w,h:h,act:data.act,id:data.id,i:data.i,kind:data.kind,label:label||data.act});return b;}
    function button(x,y,w,h,label,data,opt){
      opt=opt||{};c.fillStyle=opt.off?'#e7e0d2':opt.primary?RED:opt.on?'#ead2b7':'#fcf5e5';c.fillRect(x,y,w,h);c.strokeStyle=opt.off?'#d2c8b7':opt.on?RED:LINE;c.lineWidth=opt.on&&!opt.off?1.5:1;c.strokeRect(x+.5,y+.5,w-1,h-1);
      if(label==='‹'||label==='›'){var sign=label==='‹'?-1:1,cx=x+w/2,cy=y+h/2;c.strokeStyle=opt.off?INK2:INK;c.lineWidth=2;c.beginPath();c.moveTo(cx-sign*4,cy-7);c.lineTo(cx+sign*4,cy);c.lineTo(cx-sign*4,cy+7);c.stroke();}
      else text(label,opt.align==='left'?x+12:x+w/2,y+h/2,16,opt.align||'center',true,opt.off?'#817b70':opt.primary?'#fff6e8':INK);
      if(!opt.off)hit(x,y,w,h,data,label);
    }
    var U={layout:L,state:s,text:text,paper:paper,hit:hit,button:button,reset:function(){dbg.texts=[];dbg.regions=[];}};
    c.save();c.scale(1/z,1/z);paper(0,0,L.W,L.H);hit(0,0,L.W,L.H,{act:'ui'},'party-blocker');
    S.partyHeader(U,G,app,L,s);
    if(L.tabbed){var tabs=[['hero','角色'],['crew','同伴'],['soldiers','天兵']],tw=(L.W-40)/3;tabs.forEach(function(t,i){button(12+i*(tw+8),60,tw,44,t[1],{act:'partyView',view:t[0]},{on:s.view===t[0]});});}
    if(o&&(!L.tabbed||s.view==='hero'))drawHero();
    if(o&&(!L.tabbed||s.view==='crew'))drawCrew();
    if(!L.tabbed||s.view==='soldiers')drawSoldiers();
    if(o&&s.info&&XY.inkHud&&XY.inkHud.partyDetail)XY.inkHud.partyDetail(c,G,app,narrowInfo(G,o,s.info),U);
    c.restore();
    function drawHero(){
      var h=o.h,x=L.contentX,y=L.summaryY,w=L.contentW,hp=Math.max(0,Math.ceil(h.hp))+'/'+h.maxHp,controlled=G.ctrl===o.i&&!h.down;
      paper(x,y,w,L.summaryH,true);seen(c,h,x+28,y+L.summaryH/2,24,app.rt);
      hit(x,y,56,L.summaryH,{act:'partyInfo',kind:'hero'},'角色头像详情');
      var status=h.down?'本关阵亡':controlled?'当前操控':XY.ORDER_SHORT[h.order]||h.order;
      text(h.def.name,x+64,y+14,18,'left',true);
      if(L.summaryH<80)text(hp+' · '+status,x+64,y+44,16,'left',false,h.down?RED:INK2);
      else {text(hp,x+64,y+40,16,'left',false);text(status,x+64,y+L.summaryH-12,16,'left',false,h.down?RED:INK2);}
      button(x+w-88,y+L.summaryH-44,88,44,h.down?'已阵亡':controlled?'操控中':'操控此人',{act:'hero',i:o.i},{off:h.down||controlled,primary:!controlled&&!h.down});
      var bw=(w-24)/4;OB.forEach(function(id,i){button(x+i*(bw+8),L.ordersY,bw,44,OBL[id],{act:'order',i:o.i,order:id},{on:h.order===id,off:h.down});});
      [['main','普攻'],['ult','必杀'],['trait','特性'],['more','更多']].forEach(function(v,i){button(x+i*(bw+8),L.skillsY,bw,44,v[1],{act:'partyInfo',kind:v[0]});});
      if(L.utility){var uw=(w-8)/2;button(x,L.utilityY,uw,44,'辅助技能',{act:'partyInfo',kind:'aux'});button(x+uw+8,L.utilityY,uw,44,'角色详情',{act:'partyInfo',kind:'hero'});}
      XY.ui.cardDbg.push({i:o.i,id:h.id,lead:true,narrow:true,x:x/z,y:y/z,w:w/z,h:L.summaryH/z,face:'X/core',faceBox:{x:x/z,y:y/z,w:56/z,h:L.summaryH/z},icons:[],btns:[]});
    }
    function drawCrew(){
      var others=cr.filter(function(v){return v!==o;}),pages=Math.max(1,Math.ceil(others.length/L.rosterPer)),page=(s.page||0)%pages,x=L.rosterX,w=L.rosterW;
      text('同伴 '+(page+1)+'/'+pages,x,L.rosterHead+22,16,'left',true);
      button(x+w-96,L.rosterHead,44,44,'‹',{act:'partyFocusPage',delta:-1},{off:pages===1});button(x+w-44,L.rosterHead,44,44,'›',{act:'partyFocusPage',delta:1},{off:pages===1});
      others.slice(page*L.rosterPer,page*L.rosterPer+L.rosterPer).forEach(function(v,i){var y=L.rosterY+i*60,h=v.h;paper(x,y,w,52,true);seen(c,h,x+24,y+26,20,app.rt);text(h.def.name,x+52,y+15,16,'left',true);text(h.down?'阵亡 · 本关无法再战':Math.max(0,Math.ceil(h.hp))+'/'+h.maxHp,x+52,y+37,16,'left',false,h.down?RED:INK2);hit(x,y,w,52,{act:'partyFocus',i:v.i},'查看 '+h.def.name);});
    }
    function drawSoldiers(){
      var y=L.tabbed?112:L.footY,n=L.soldierCols,tw=L.soldierW,total=n*tw+(n-1)*8,x0=(L.W-total)/2;
      TK.forEach(function(id,i){var x=x0+(i%n)*(tw+8),yy=y+Math.floor(i/n)*88,d=XY.TOWERS[id],own=XY.save.solOwned(id),price=XY.soldierCost(G,id);paper(x,yy,tw,80,true);
        if(XY.ICONINK&&XY.ICONINK.sol)XY.ICONINK.sol(c,id,x+tw/2,yy+17,28,own?1:.4);
        text({arrow:'弓兵',cannon:'炮兵',frost:'寒冰',siege:'破阵',heal:'佛光'}[id],x+tw/2,yy+47,16,'center',true,own?INK:INK2);text(own?String(price)+'金':'未有卡',x+tw/2,yy+71,16,'center',false,own?INK:INK2);
        hit(x,yy,tw,80,{act:'tower',type:id},d.name);
      });
    }
  };
/* END PARTY_NARROW_CANDIDATE_1 */
  // Desktop reading keeps the narrow party's real-index focus and command routes.
  S.desktopOpen=function(G,a){return !!a.partyPanel&&available(G,a)&&!G.tut&&!S.narrowViewport(a);};
  S.readableOpen=function(G,a){return S.narrowOpen(G,a)||S.desktopOpen(G,a);};
  S.desktopLayout=function(a,count){
    var W=a.lw*a.zoom,H=a.lh*a.zoom,w=Math.min(1280,W-48),x=(W-w)/2,left=252,frameH=Math.min(720,H),top=(H-frameH)/2,footer=frameH-112;
    var per=Math.max(1,Math.floor((footer-126)/88));if(count>per)per=Math.max(1,Math.floor((footer-178)/88));
    return{W:W,H:H,top:top,frameH:frameH,desktop:true,x:x,w:w,rosterX:x,rosterY:118,rosterW:left,rosterPer:per,contentX:x+left+24,contentW:w-left-24,footer:footer};
  };
  function desktopPortrait(c,h,b,scale){
    if(h.def.xid)return{drawn:false,kind:'custom-avatar',label:'角色头像'};
    if(X_IDS.indexOf(h.id)<0)return{drawn:!!bigArt(c,h,b,scale),kind:'core-portrait',label:'立绘加载中'};
    var g=XY.gacha10,p=g&&g.drawPortrait&&g.drawPortrait(c,h.id,b.x,b.y,b.w,b.h);
    return p?{drawn:true,kind:'gacha-portrait',id:h.id,source:p.source,target:p.target}:{drawn:false,kind:'gacha-portrait',label:'立绘暂不可用'};
  }
  S.drawDesktopParty=function(c,G,a){
    if(!S.desktopOpen(G,a))return;
    // Short desktop windows reuse the already tested wide compact composition.
    if(a.lh*a.zoom<640)return S.drawNarrowParty(c,G,a,true);
    var cr=crew(G),L=S.desktopLayout(a,cr.length),s=narrowState(G,a),o=cr.filter(function(v){return v.i===s.focusIndex;})[0],z=a.zoom;
    if(s.view==='traits')return S.drawQuickParty(c,G,a);
    a.partyTraitsGeometry=null;
    if(!o)return;
    a._tip=null;a.readableTip=null;a.partyNarrowReading=null;XY.ui.hits.length=0;XY.ui.cardDbg=[];
    XY.ui.party={open:true,pinned:false,desktop:true,focusIndex:o.i,focusId:o.h.id,tab:null,sheet:{x:0,y:0,w:a.lw,h:a.lh},ids:cr.map(function(v){return v.h.id;})};
    var dbg=a.partyDesktopGeometry={layout:L,focusIndex:o.i,focusId:o.h.id,focusXid:o.h.def.xid||null,controlIndex:G.ctrl,regions:[],texts:[]},dy=0;
    function text(str,x,y,size,align,bold,col){
      c.font=(bold?'bold ':'')+size+'px '+(bold&&/^[\u3400-\u9fff\s]+$/.test(String(str))?KAI():XY.C.FONT);c.fillStyle=col||INK;c.textAlign=align||'left';c.textBaseline='middle';c.fillText(String(str),x,y);
      var w=c.measureText(String(str)).width;dbg.texts.push({text:String(str),x:align==='center'?x-w/2:align==='right'?x-w:x,y:y+dy-size/2,w:w,h:size,fontCSS:size});
    }
    // Labels may be abbreviated visibly; their detail view retains the full name.
    function label(str,width,size,bold){
      str=String(str);c.font=(bold?'bold ':'')+size+'px '+XY.C.FONT;
      if(c.measureText(str).width<=width)return str;
      var chars=Array.from(str);while(chars.length&&c.measureText(chars.join('')+'…').width>width)chars.pop();return chars.join('')+'…';
    }
    function paper(x,y,w,h,border){c.fillStyle=PAPER;c.fillRect(x,y,w,h);if(border){c.strokeStyle=LINE;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);}}
    function hit(x,y,w,h,data,label){var b={x:x/z,y:(y+dy)/z,w:w/z,h:h/z};Object.keys(data).forEach(function(k){b[k]=data[k];});XY.ui.hits.push(b);dbg.regions.push({x:x,y:y+dy,w:w,h:h,act:data.act,i:data.i,kind:data.kind,label:label||data.act});return b;}
    function button(x,y,w,h,label,data,opt){
      opt=opt||{};c.fillStyle=opt.off?'#e7e0d2':opt.primary?RED:opt.on?'#ead2b7':'#fcf5e5';c.fillRect(x,y,w,h);c.strokeStyle=opt.off?'#d2c8b7':opt.on?RED:LINE;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);
      if(label==='‹'||label==='›'){var q=label==='‹'?-1:1,cx=x+w/2,cy=y+h/2;c.strokeStyle=opt.off?INK2:INK;c.lineWidth=2;c.beginPath();c.moveTo(cx-q*4,cy-7);c.lineTo(cx+q*4,cy);c.lineTo(cx-q*4,cy+7);c.stroke();}
      else text(label,opt.align==='left'?x+12:x+w/2,y+h/2,16,opt.align||'center',true,opt.off?'#817b70':opt.primary?'#fff6e8':INK);
      if(!opt.off)hit(x,y,w,h,data,label);
    }
    var U={layout:L,state:s,text:text,paper:paper,hit:hit,button:button,reset:function(){dbg.texts=[];dbg.regions=[];}};
    c.save();c.scale(1/z,1/z);paper(0,0,L.W,L.H);hit(0,0,L.W,L.H,{act:'ui'},'desktop-party-blocker');dy=L.top;c.translate(0,dy);
    S.partyHeader(U,G,a,L,s);
    text('同行角色',L.rosterX,92,20,'left',true);text('点选查看',L.rosterX+L.rosterW,92,16,'right',false,INK2);
    var pages=Math.max(1,Math.ceil(cr.length/L.rosterPer));
    if(s.desktopFocusIndex!==o.i||s.desktopRosterPer!==L.rosterPer){s.page=Math.floor(cr.indexOf(o)/L.rosterPer);s.desktopFocusIndex=o.i;s.desktopRosterPer=L.rosterPer;}
    var pg=Math.min(pages-1,Math.max(0,s.page||0));s.page=pg;
    cr.slice(pg*L.rosterPer,(pg+1)*L.rosterPer).forEach(function(v,j){
      var x=L.rosterX,y=L.rosterY+j*88,h=v.h,on=v.i===o.i;paper(x,y,L.rosterW,80,true);if(on){c.fillStyle='#ead2b7';c.fillRect(x+1,y+1,L.rosterW-2,78);c.fillStyle=RED;c.fillRect(x,y,4,80);}
      seen(c,h,x+34,y+39,25,a.rt);
      text(label(h.def.name,L.rosterW-82,18,true),x+70,y+18,18,'left',true,h.down?INK2:INK);
      text(Math.max(0,Math.ceil(h.hp))+'/'+h.maxHp,x+70,y+43,16,'left',false,h.down?RED:INK2);
      text(h.down?'本关阵亡':G.ctrl===v.i?'正在操控':XY.ORDER_SHORT[h.order]||h.order,x+70,y+65,16,'left',false,h.down?RED:INK2);
      hit(x,y,L.rosterW,80,{act:'partyFocus',i:v.i},h.def.name+' · 查看资料');
    });
    if(pages>1){var py=L.footer-52;button(L.rosterX,py,44,44,'‹',{act:'partyFocusPage',delta:-1},{off:pg===0});text((pg+1)+' / '+pages,L.rosterX+L.rosterW/2,py+22,16,'center');button(L.rosterX+L.rosterW-44,py,44,44,'›',{act:'partyFocusPage',delta:1},{off:pg===pages-1});}
    var h=o.h,mx=L.contentX,mw=L.contentW,controlled=G.ctrl===o.i&&!h.down,short=L.H<720,portraitW=Math.max(180,Math.min(300,mw*.34)),rx=mx+portraitW+20,rw=mw-portraitW-20;
    text(label(h.def.name,mw-148,28,true),mx,95,28,'left',true,h.down?INK2:RED);
    text('生命 '+Math.max(0,Math.ceil(h.hp))+' / '+h.maxHp,mx,128,18,'left',false);
    text(h.down?'本关阵亡 · 无法再战':controlled?'当前操控':('当前指令：'+(XY.ORDER_NAME[h.order]||h.order)),mx,153,16,'left',false,h.down?RED:INK2);
    button(mx+mw-124,78,124,44,h.down?'已阵亡':controlled?'正在操控':'操控此人',{act:'hero',i:o.i},{off:h.down||controlled,primary:!controlled&&!h.down});
    button(mx+mw-124,130,124,44,'角色详情',{act:'partyInfo',kind:'hero'});
    var art={x:mx+4,y:194,w:portraitW-8,h:L.footer-228};
    c.save();if(h.down)c.globalAlpha=.45;var portrait=desktopPortrait(c,h,art,(a.dpr||1));if(!portrait.drawn)bigFace(c,h,art,a.rt);c.restore();dbg.portrait=portrait;
    text(portrait.drawn?'查看不切换操控':portrait.label,mx+portraitW/2,L.footer-10,16,'center',false,INK2);
    var oy=short?190:198,ow=(rw-24)/4;
    OB.forEach(function(order,i){button(rx+i*(ow+8),oy,ow,44,OBL[order],{act:'order',i:o.i,order:order},{on:!h.down&&h.order===order,off:h.down});});
    var sy=oy+58,rowH=short?56:64,sl=XY.skillList(G,h),rows=[{kind:'main',title:'普攻',skill:sl.filter(function(v){return v.id==='main';})[0]},{kind:'ult',title:'必杀',skill:sl.filter(function(v){return v.id==='ult';})[0]},{kind:'trait',title:'特性',skill:XY.traitOf(h)},{kind:'aux',title:'辅助技能',skill:null}];
    rows.forEach(function(row,i){var y=sy+i*rowH;paper(rx,y,rw,rowH-8,true);var title=row.title+(row.skill?' · '+row.skill.name:'');var available=rw-108;text(label(title,available,16,true),rx+12,y+16,16,'left',true);
      var status=h.down?'本关阵亡 · 仅查看说明':row.kind==='aux'?('已学 '+sl.filter(function(v){return v.kind==='sup';}).length+' 项'):row.kind==='trait'?(row.skill?h.traitCd>0?'冷却 '+Math.ceil(h.traitCd)+'秒':'查看特性与发动条件':'暂无特性'):row.skill&&row.skill.rem>0?'冷却 '+Math.ceil(row.skill.rem)+'秒':'已经就绪';
      text(status,rx+12,y+(short?35:40),16,'left',false,INK2);
      button(rx+rw-84,y+Math.max(0,(rowH-8-44)/2),84,44,'详情',{act:'partyInfo',kind:row.kind});
    });
    var utilityY=sy+rows.length*rowH+4,uw=(rw-16)/3;
    [['命令说明','orders'],['更多能力','more'],['召唤说明','summon']].forEach(function(v,i){button(rx+i*(uw+8),utilityY,uw,44,v[0],{act:'partyInfo',kind:v[1]});});
    c.strokeStyle=LINE;c.beginPath();c.moveTo(L.x,L.footer+6);c.lineTo(L.x+L.w,L.footer+6);c.stroke();
    text('护法天兵',L.x,L.footer+35,20,'left',true);button(L.x,L.footer+54,112,44,'天兵说明',{act:'partyInfo',kind:'soldiers'});
    var tx=L.x+136,tw=(L.w-136-4*12)/5;
    TK.forEach(function(id,i){var d=XY.TOWERS[id],x=tx+i*(tw+12),y=L.footer+20,own=XY.save.solOwned(id);paper(x,y,tw,78,true);if(XY.ICONINK&&XY.ICONINK.sol)XY.ICONINK.sol(c,id,x+28,y+35,48,own?1:.35);text(d.name,x+58,y+24,16,'left',true,own?INK:INK2);text(own?XY.soldierCost(G,id)+' 金币':'尚未获得',x+58,y+52,16,'left',false,own?INK2:RED);hit(x,y,tw,78,{act:'tower',type:id},d.name+' · 布阵');});
    if(s.info){c.translate(0,-dy);dy=0;XY.inkHud.partyDetail(c,G,a,narrowInfo(G,o,s.info),U);}
    c.restore();
  };

  // 教学手卷使用真实 hero/order 命中；普通队伍的资料/特性阅读页仍由原入口拥有。
  // 窄屏只呈现本步骤可操作的选人/命令；特性、骑乘、变身在教程中原本就被 tutBlocks 拦截。
  S.teachingLayout=function(G,a){
    var W=a.lw*a.zoom,H=a.lh*a.zoom,wide=W>=900&&H>=600,cr=crew(G),lead=leadOf(G,cr),tt=G.tut,list=XY.tutSteps?XY.tutSteps(G):XY.TUT_STEPS,step=tt&&list&&list[tt.i],target=step&&step.id==='choose'?tt.pick:step&&step.id.indexOf('cmd_')===0?tt.cmd:null;
    var focus=cr.filter(function(o){return o.i===target;})[0]||lead,rest=wide?cr.filter(function(o){return o!==lead;}):cr,left=wide?Math.min(288,W*.25):0,gap=16,x=wide?left+32:12,w=W-x-16,per=wide?Math.max(1,Math.floor((w+gap)/(196+gap))):Math.max(1,Math.floor((W-24+8)/64)),pages=Math.max(1,Math.ceil(rest.length/per)),page=(a.partyPage||0)%pages;
    // wait() 在 tutTick 中已确定 pick/cmd；仅选显示页，不改变操控、教程状态或保存数据。
    var at=rest.findIndex(function(o){return o.i===target;});if(at>=0)page=Math.floor(at/per);
    var shown=rest.slice(page*per,(page+1)*per),top=H-(wide?420:228),cell=wide?(w-gap*(shown.length-1))/Math.max(1,shown.length):(W-24-8*(shown.length-1))/Math.max(1,shown.length);
    return{W:W,H:H,wide:wide,top:top,lead:lead,focus:focus,shown:shown,per:per,pages:pages,page:page,x:x,w:w,left:left,gap:wide?gap:8,cell:cell,target:target,step:step&&step.id};
  };
  function drawTeachingParty(c,G,a){
    var L=S.teachingLayout(G,a),z=a.zoom,rt=a.rt,tip=null,pin=!a.partyPanel;
    var dbg=a.partyTeachingGeometry={layout:{W:L.W,H:L.H,wide:L.wide,top:L.top,page:L.page,pages:L.pages,target:L.target,step:L.step},cards:[],regions:[],texts:[],omittedBlockedExtras:!L.wide};
    function box(x,y,w,h){return{x:x/z,y:y/z,w:w/z,h:h/z};}
    function hit(x,y,w,h,data){var b=box(x,y,w,h);Object.keys(data).forEach(function(k){b[k]=data[k];});XY.ui.hits.push(b);dbg.regions.push({x:x,y:y,w:w,h:h,act:data.act,i:data.i,order:data.order,type:data.type});return b;}
    function hov(x,y,w,h){return a.mouse&&a.mouse.x*z>=x&&a.mouse.x*z<=x+w&&a.mouse.y*z>=y&&a.mouse.y*z<=y+h;}
    function text(t,x,y,size,color,align){kai(c,t,x,y,size,color,align);var tw=measureWidth(c,String(t));dbg.texts.push({text:String(t),x:align==='left'?x:align==='right'?x-tw:x-tw/2,y:y-size/2,w:tw,h:size});}
    var P0={DW:L.W,DH:L.H,W:L.W,H:L.H,k:1,z:z,top:L.top,mode:L.wide?'desk':'phone',foot:{y:L.H-48,tx:L.wide?118:12,tw:L.wide?60:44,th:44,label:L.wide,info:L.wide,keys:L.wide,hideCap:!L.wide}},U={box:box,hit:hit,hov:hov,tipAt:function(x,y,lines){return{x:x/z,y:y/z,lines:lines};},P0:P0,rt:rt,T:XY.R};
    c.save();c.scale(1/z,1/z);scroll(c,P0);
    var sheet=box(0,L.top,L.W,L.H-L.top);hit(0,L.top,L.W,L.H-L.top,{act:'ui'});XY.ui.party.sheet=sheet;XY.ui.party.ids=crew(G).map(function(o){return o.h.id;});
    if(XY.ui.hud)XY.ui.hud.push(Object.assign({id:'partySheet'},sheet));
    text(L.wide?shortLabel('当前操控 · '+(L.lead?L.lead.h.def.name:''),L.left-16,20):'队伍',L.wide?24:12,L.top+16,L.wide?20:18,INK,'left');
    if(!L.wide)text('天兵 '+G.towers.length+'/'+XY.soldierCap(G),L.W-12,L.top+16,14,INK2,'right');
    if(L.wide){
      if(L.lead)drawCard(L.lead,16,L.left, true);
      L.shown.forEach(function(o,j){drawCard(o,L.x+j*(L.cell+L.gap),L.cell,false);});
    }else{
      L.shown.forEach(function(o,j){
        var x=12+j*(L.cell+8),cx=x+L.cell/2,cy=L.top+52,d=newDbg(U,o);d.face=seen(c,o.h,cx,cy,22,rt);d.faceBox=box(cx-22,cy-22,44,44);hit(cx-22,cy-22,44,44,{act:'hero',i:o.i});grow(d,cx-22,cy-22,44,44);
        text(shortLabel(o.h.def.name,L.cell-4,14),cx,L.top+84,14,o.h.down?INK2:o.i===G.ctrl?RED:INK);if(hov(cx-22,cy-22,44,44))tip=U.tipAt(cx,cy-28,R4.heroInfo(o.h));finish(U,d);
        dbg.cards.push({i:o.i,id:o.h.id,faceKind:d.face,face:{x:cx-22,y:cy-22,w:44,h:44},nameY:L.top+84});
      });
      if(L.focus){var o=L.focus,h=o.h,d=newDbg(U,o),hp=h.down?'本关阵亡':Math.max(0,Math.ceil(h.hp))+'/'+h.maxHp;
        text(h.def.name+' · '+hp,12,L.top+105,16,h.down?RED:INK,'left');text(o.i===G.ctrl?'当前操控':L.step==='choose'?'待选角色':'命令对象',L.W-12,L.top+105,14,INK2,'right');
        skillRow(o,12,L.top+123,L.W-24,d);
        if(!h.down)orders(o,12,L.top+136,L.W-24,d);else text('本关无法再战',L.W/2,L.top+158,16,INK2);
        var existing=XY.ui.cardDbg.filter(function(v){return v.i===o.i;})[0];if(existing){existing.icons=d.icons;existing.btns=d.btns;}
      }
    }
    drawFoot(c,G,a,U);
    if(L.pages>1){var px=L.W-60,py=L.H-44;stamp(c,px,py,48,44,(L.page+1)+'/'+L.pages,0,0,14,hov(px,py,48,44));hit(px,py,48,44,{act:'partyPage'});}
    // 教学通常钉开；保留已打开手卷的既有收起入口，不扩大遮罩。
    if(!pin){var bx=L.W-100,by=L.top+2;stamp(c,bx,by,88,44,'收起',1,0,16,hov(bx,by,88,44));hit(bx,by,88,44,{act:'party'});}
    c.restore();return tip;
    function shortLabel(str,w,size){c.font='bold '+size+'px '+KAI();var chars=Array.from(String(str));if(measureWidth(c,str)<=w)return str;while(chars.length&&measureWidth(c,chars.join('')+'…')>w)chars.pop();return chars.join('')+'…';}
    function orders(o,x,y,w,d){
      var bw=(w-12)/4;OB.forEach(function(id,j){var bx=x+j*(bw+4);stamp(c,bx,y,bw,44,OBL[id],o.h.order===id?(o.i===G.ctrl?2:1):0,0,16,hov(bx,y,bw,44));hit(bx,y,bw,44,{act:'order',i:o.i,order:id});d.btns.push(box(bx,y,bw,44));grow(d,bx,y,bw,44);if(hov(bx,y,bw,44))tip=U.tipAt(bx+bw/2,y-4,[XY.ORDER_NAME[id]+'：'+XY.ORDER_DESC[id]+(o.i===G.ctrl?'（手动操控，切换操控角色后生效）':'')]);});
    }
    function skillRow(o,x,y,w,d){
      var sl=XY.skillList(G,o.h),size=14,step=Math.min(22,(w-size)/Math.max(1,sl.length-1)),start=x+(w-(Math.max(0,sl.length-1)*step+size))/2;
      sl.forEach(function(sk,j){var cx=start+size/2+j*step,ready=bead(c,sk,cx,y,size);d.icons.push(box(cx-size/2,y-size/2,size,size));if(hov(cx-size/2,y-size/2,size,size))tip=U.tipAt(cx,y-10,[sk.name+(ready?'（就绪）':'（冷却 '+Math.ceil(sk.rem)+' 秒）'),sk.tip||'']);});
    }
    function drawCard(o,x,w,lead){
      var h=o.h,d=newDbg(U,o),cx=x+w/2,art={x:x+8,y:L.top+40,w:w-16,h:144};d.lead=lead;
      if(lead){c.save();if(h.down)c.globalAlpha=.45;var p=desktopPortrait(c,h,art,a.dpr||1);if(!p.drawn)bigFace(c,h,art,rt);c.restore();d.face=p.kind;d.faceBox=box(art.x,art.y,art.w,art.h);hit(art.x,art.y,art.w,art.h,{act:'hero',i:o.i});grow(d,art.x,art.y,art.w,art.h);
        if(h.def.xid||X_IDS.indexOf(h.id)>=0)d.face=seen(c,h,x+30,L.top+64,22,rt);
      }else{d.face=seen(c,h,cx,L.top+112,48,rt);d.faceBox=box(cx-48,L.top+64,96,96);hit(cx-48,L.top+64,96,96,{act:'hero',i:o.i});grow(d,cx-48,L.top+64,96,96);}
      text(shortLabel(h.def.name,w-16,20),cx,L.top+201,20,h.down?INK2:lead?RED:INK);if(hov(d.faceBox.x*z,d.faceBox.y*z,d.faceBox.w*z,d.faceBox.h*z))tip=U.tipAt(cx,L.top+40,R4.heroInfo(h));var hp=Math.max(0,Math.ceil(h.hp))+'/'+h.maxHp;
      text(h.down?'本关阵亡':hp,cx,L.top+227,16,h.down?RED:INK2);inkHp(c,x+16,L.top+242,w-32,Math.max(0,h.hp/h.maxHp),2,23+o.i);
      skillRow(o,x+12,L.top+259,w-24,d);
      if(!h.down){var ex=extras(G,h),ew=(w-24-8*Math.max(0,ex.length-1))/Math.max(1,ex.length);ex.forEach(function(e,j){var t=extraBtn(c,U,d,e,o,x+12+j*(ew+8),L.top+278,ew,44,16,cx);if(t)tip=t;});orders(o,x+4,L.top+326,w-8,d);}
      else text('本关无法再战',cx,L.top+348,16,INK2);
      if(h.ward&&!h.down)R4.drawWard(c,h.ward,x+w-18,L.top+173,6,rt);finish(U,d);dbg.cards.push({i:o.i,id:h.id,lead:lead,faceKind:d.face,face:d.faceBox,nameY:L.top+201,hpY:L.top+227,skillsY:L.top+259,extrasY:L.top+278,ordersY:L.top+326,column:{x:x,w:w}});
    }
  }

  /* ---------------- 绘制 ---------------- */
  // 入口：render4 的 drawHeroCards 调这里。返回悬停提示（逻辑像素）或 null。
  S.drawParty = function (c, G, app, phase) {

/* BEGIN PARTY_NARROW_CANDIDATE_2 */
    if (S.readableOpen(G, app)) return null; // Draw once as the final opaque UI owner.
    if (!app.partyPanel && app.partyNarrow) { app.partyNarrow = null; app.partyNarrowReading = null; }
/* END PARTY_NARROW_CANDIDATE_2 */
    var z = app.zoom, vis = P.visible(G, app), pin = vis && !app.partyPanel;
    if (app.partyPanel && !available(G, app)) app.partyPanel = false;
    XY.ui.cardDbg = []; XY.ui.party = { open: !!app.partyPanel, pinned: pin, tab: null, sheet: null, ids: [] };
    G.heroes.forEach(function (h) { xAvatar(h.id); });            // 收起时就先把本局人的 X 头像载上，面板第一次打开不再是占位脸
    if (!vis) { if (phase !== 'pre' && available(G, app)) { if (XY.compactHud && XY.compactHud.on(G,app)) XY.compactHud.party(c,G,app); else drawTab(c, G, app, false); } return null; }
    if (phase === 'pre' && pin) return null;           // 教程钉开：和收起时一样放在最上层画，不加遮罩
    if (phase !== 'pre' && !pin) return null;
    if (G.tut) return drawTeachingParty(c, G, app);
    var P0 = S.poster(G, app), k = P0.k, f = k / z, T = XY.R, tip = null, rt = app.rt;
    var m = app.mouse ? { x: app.mouse.x * z / k, y: app.mouse.y * z / k } : { x: -999, y: -999 };
    function box(x, y, w, h) { return { x: x * f, y: y * f, w: w * f, h: h * f }; }
    function hit(x, y, w, h, o) { var b = box(x, y, w, h); for (var q in b) o[q] = b[q]; XY.ui.hits.push(o); return o; }
    function hov(x, y, w, h) { return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h; }
    function tipAt(x, y, lines) { return { x: x * f, y: y * f, lines: lines }; }
    var U = { box: box, hit: hit, hov: hov, tipAt: tipAt, P0: P0, rt: rt, T: T };
    c.save(); c.scale(1 / z, 1 / z);
    if (!pin) {                                                   // 遮罩：浅纸色，战场仍看得见；点它 = 收起
      c.fillStyle = 'rgba(246,238,218,0.30)'; c.fillRect(0, 0, P0.W, P0.H);
      hit(0, 0, P0.DW, P0.DH, { act: 'partyClose' });
    }
    c.scale(k, k);
    scroll(c, P0);
    var cr = crew(G), ld = leadOf(G, cr), others = cr.filter(function (o) { return o !== ld; }), sTop = Math.min(P0.top, P0.lead.art.y) - 4;
    hit(0, sTop, P0.DW, P0.DH - sTop, { act: 'ui' }); XY.ui.party.sheet = box(0, sTop, P0.DW, P0.DH - sTop);
    if (XY.ui.hud) XY.ui.hud.push({ id: 'partySheet', x: 0, y: sTop * f, w: P0.DW * f, h: (P0.DH - sTop) * f });
    if (P0.head.v) vname(c, '取经众相', P0.head.x, P0.head.y, P0.head.sz, INK); else kai(c, '取经众相', P0.head.x, P0.head.y, P0.head.sz, INK, 'left');
    if (ld) { var t1 = drawLead(c, G, app, ld, U); if (t1) tip = t1; }
    if (P0.paged && others.length > 2) {
      var pages = Math.ceil(others.length / 2), pg = (app.partyPage || 0) % pages;
      others = others.slice(pg * 2, pg * 2 + 2);
      var px = 278, py = P0.top - 6;
      stamp(c, px, py, 170, 40, '同伴 ' + (pg + 1) + '/' + pages + ' ›', 0, -0.03, 13, U.hov(px, py, 170, 40));
      U.hit(px, py, 170, 40, { act: 'partyPage' });
    }
    var sp = spots(P0, others.length);
    others.forEach(function (o, q) { var t2 = drawMinor(c, G, app, o, sp[q][0], sp[q][1], U, q); if (t2) tip = t2; });
    var t3 = drawFoot(c, G, app, U); if (t3) tip = t3;
    if (!pin) drawClose(c, G, app, U);
    XY.ui.party.ids = cr.map(function (o) { return o.h.id; });
    c.restore(); return tip;
  };
  function drawTab(c, G, app, open, L) {
    var z = app.zoom; L = L || S.layout(G, app);
    var p = L.tabC, w = L.tabW, h = L.tabH, x = p.x, y = p.y;
    c.save(); c.scale(1 / z, 1 / z);
    var hv = app.mouse && app.mouse.x * z >= x && app.mouse.x * z <= x + w && app.mouse.y * z >= y && app.mouse.y * z <= y + h;
    // 墨条签：一道浓淡墨的纸条，左边朱红「队伍」方印
    c.save(); c.translate(1.5, 2.5); paperPath(c, x, y, w, h, 901, 2); c.fillStyle = 'rgba(70,50,25,0.18)'; c.fill(); c.restore();
    paperPath(c, x, y, w, h, 901, 2); var g = c.createLinearGradient(x, y, x + w, y); g.addColorStop(0, hv ? '#fff4dc' : '#f7ecd3'); g.addColorStop(1, hv ? '#f6e2b8' : '#ecdcb8'); c.fillStyle = g; c.fill();
    c.save(); paperPath(c, x, y, w, h, 901, 2); c.clip(); c.fillStyle = 'rgba(40,30,18,0.08)'; c.fillRect(x, y + h - 9, w, 9); c.restore();
    paperPath(c, x, y, w, h, 901, 2); c.lineWidth = 1.6; c.strokeStyle = 'rgba(47,38,24,0.85)'; c.stroke();
    var ss = h - 10; seal(c, x + 6, y + 5, ss, '队伍', -0.05, true);
    var tx = x + 6 + ss + 8, tw = w - (tx - x) - 8, cur = G.ctrl > 0 ? G.heroes[G.ctrl] : null;     // 唐僧不算可操控的人
    kai(c, '队伍 ▲', tx, y + h * 0.36, fitSz(c, '队伍 ▲', 17, tw), INK, 'left');
    var sub = cur && !cur.down && cur.id !== 'tang' ? '操控 ' + cur.def.name : '点开下命令';
    kai(c, sub, tx, y + h * 0.74, fitSz(c, sub, 12, tw), INK2, 'left');
    var o = { act: 'party', x: x / z, y: y / z, w: w / z, h: h / z }; XY.ui.hits.push(o); XY.ui.party.tab = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (XY.ui.hud) XY.ui.hud.push({ id: 'partyTab', x: o.x, y: o.y, w: o.w, h: o.h });
    if (hv) app._tip = { x: (x + w / 2) / z, y: (y - 6) / z, text: '打开队伍面板：给每位徒弟下命令（打开时游戏自动暂停）' };
    c.restore();
  }
  // 打开时右上角的「收起」朱印 + 「游戏已暂停」
  function drawClose(c, G, app, U) {
    var b = U.P0.close, hv = U.hov(b.x, b.y, b.w, b.h), sw = b.sz * 2.6, sh = b.sz * 1.7;
    c.save(); if (hv) { c.shadowColor = 'rgba(184,48,15,0.45)'; c.shadowBlur = 8; }
    stamp(c, b.x + (b.w - sw - 4) / 2, b.y + 1, sw + 4, sh + 6, '收起', 1, -0.05, b.sz, false); c.restore();
    kai(c, '游戏已暂停', b.x + b.w / 2, b.y + sh + 13, Math.max(9, Math.round(b.sz * 0.66)), RED);
    var o = U.hit(b.x, b.y, b.w, b.h, { act: 'party' }); XY.ui.party.tab = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (hv) app._tip = { x: o.x + o.w / 2, y: o.y - 4, text: '收起面板，游戏继续（Esc / P 也行）' };
  }
  function newDbg(U, o) { var d = { i: o.i, id: o.h.id, x: 1e9, y: 1e9, x2: -1e9, y2: -1e9, icons: [], btns: [], face: null, faceBox: null }; return d; }
  function grow(d, x, y, w, h) { d.x = Math.min(d.x, x); d.y = Math.min(d.y, y); d.x2 = Math.max(d.x2, x + w); d.y2 = Math.max(d.y2, y + h); }
  function finish(U, d) { var b = U.box(d.x, d.y, d.x2 - d.x, d.y2 - d.y), out = { i: d.i, id: d.id, x: b.x, y: b.y, w: b.w, h: b.h, icons: d.icons, btns: d.btns, face: d.face, faceBox: d.faceBox, lead: !!d.lead }; XY.ui.cardDbg.push(out); return out; }
  function orderStamps(c, G, o, U, d, cx, y, w, h, gap, sz, isC, tipX) {
    var tw = 4 * w + 3 * gap, x0 = cx - tw / 2, tip = null, h0 = o.h;
    OB.forEach(function (ob, q) {
      var x = x0 + q * (w + gap), dy = [1, -2, 2, -1][q], on = h0.order === ob, hv = U.hov(x, y, w, h);
      stamp(c, x, y + dy, w, h, OBL[ob], on ? (isC ? 2 : 1) : 0, [-0.06, 0.03, -0.03, 0.05][q], sz, hv);
      U.hit(x, y, w, h, { act: 'order', i: o.i, order: ob }); d.btns.push(U.box(x, y, w, h)); grow(d, x, y, w, h);
      if (hv) tip = U.tipAt(tipX, y - 6, [XY.ORDER_NAME[ob] + '：' + XY.ORDER_DESC[ob] + (isC ? '（手动操控，切换操控角色后生效）' : '')]);
    });
    return tip;
  }
  // 特性 / 骑乘 / 变身：墨字题签（可点的才登记点击框）
  function extras(G, h) {
    var out = [], tr = XY.traitOf(h);
    if (tr) {
      var locked = h.def.special && !h.def.traitOpen, cdm = h.traitMax || XY.traitCdOf(h), ready = h.traitCd <= 0 && !locked;
      out.push({ act: 'trait', label: locked ? '特性 Lv2 解锁' : tr.name + (ready ? '' : ' ' + Math.ceil(h.traitCd) + 's'), st: locked ? 3 : 0, ok: !locked, ready: ready, color: tr.color || '#c9871a', frac: locked || ready ? 1 : 1 - h.traitCd / cdm,
        tip: ['特性·' + tr.name + '（冷却 ' + Math.round(cdm) + ' 秒）', tr.desc] });
    }
    if (h.id === 'horse') { var ron = h.order === 'ride'; out.push({ act: 'ride', label: ron ? '骑：' + XY.rideName(G, h) : '骑乘·选人', st: ron ? 2 : 0, ok: XY.rideCands(G).length > 0, frac: 1,
      tip: ['骑乘：' + XY.ORDER_DESC.ride, '点一下换人：悟空 → 八戒 → 沙僧 → 特殊角色 → 取消'] }); }
    if (h.id === 'phyrex') { var xr = XY.phyrexCanXform(G), xon = h.xf > 0;
      out.push({ act: 'xform', label: xon ? '变身中 ' + Math.ceil(h.xf) + 's' : (xr.ok ? '变身！(T)' : ((XY.spHeroLv ? XY.spHeroLv(G) : G.level) < XY.C.PH_XF_LEVEL ? XY.C.PH_XF_LEVEL + '级可变身' : '冷却 ' + Math.ceil(h.xfCd) + 's')), st: xon ? 2 : (xr.ok ? 0 : 3), ok: true, frac: 1,
        tip: ['变身（只有 Phyrex）', '队伍到 ' + XY.C.PH_XF_LEVEL + ' 级才能变：生命、伤害 ×' + XY.C.PH_XF_MUL + '，持续 ' + XY.C.PH_XF_DUR + ' 秒，冷却 ' + XY.C.PH_XF_CD + ' 秒'] }); }
    return out;
  }
  function extraBtn(c, U, d, e, o, x, y, w, h, sz, tipX) {
    var hv = U.hov(x, y, w, h), st = e.ok ? e.st : 3, fs = fitSz(c, e.label, sz, w - 6);
    if (st === 2) { c.fillStyle = 'rgba(184,48,15,0.16)'; c.fillRect(x + 2, y + 3, w - 4, h - 6); }
    else if (hv && e.ok) { c.fillStyle = 'rgba(184,48,15,0.08)'; c.fillRect(x + 2, y + 3, w - 4, h - 6); }
    kai(c, e.label, x + w / 2, y + h / 2 - 1, fs, st === 3 ? '#a49d8e' : st === 2 ? RED : INK);
    var ly = y + h / 2 + fs * 0.62;
    if (e.act === 'trait' && e.ok && !e.ready) { c.strokeStyle = 'rgba(70,110,170,0.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, ly); c.lineTo(x + 6 + (w - 12) * e.frac, ly); c.stroke(); }
    else brush(c, x + 6, ly, w - 12, e.ready ? e.color.replace(/^#(..)(..)(..)$/, function (_, r, g, b) { return 'rgba(' + parseInt(r, 16) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ',A)'; }) : 'rgba(90,72,46,A)', 1.1, x | 0);
    if (e.ok) U.hit(x, y, w, h, { act: e.act, i: o.i });
    d.btns.push(U.box(x, y, w, h)); grow(d, x, y, w, h);
    return hv ? U.tipAt(tipX, y - 4, e.tip) : null;
  }
  // 当前操控的人：大幅水墨像 + 竖排朱红题名 + 编号 + 当前操控 / 手动 + 断墨气血 + 朱印命令 + 特性题签 + 念珠
  function drawLead(c, G, app, o, U) {
    var h = o.h, d = h.def, L = U.P0.lead, a = L.art, rt = U.rt, isC = G.ctrl === o.i && !h.down, tip = null, dd = newDbg(U, o); dd.lead = true;
    var sc = U.P0.k * (app.dpr || 1);
    c.save(); if (h.down) c.globalAlpha = 0.45;
    var drew = bigArt(c, h, a, sc); dd.face = drew ? 'ink' : bigFace(c, h, a, rt);
    c.restore();
    dd.faceBox = U.box(a.x, a.y, a.w, a.h); grow(dd, a.x, a.y, L.colR - a.x, a.h);
    U.hit(a.x, a.y, L.colR - a.x, a.h, { act: 'hero', i: o.i });
    if (U.hov(a.x, a.y, a.w, a.h)) tip = U.tipAt(a.x + a.w / 2, a.y + 10, R4.heroInfo(h));
    var nm = L.name, nh = vname(c, d.name, nm.x, nm.y, nm.sz, h.down ? '#8a8578' : RED);
    var mk = L.mark, ms = Math.round(nm.sz * 0.42);
    c.save(); c.strokeStyle = RED; c.lineWidth = 1.2; c.beginPath(); c.arc(mk.x, mk.y, ms * 0.72, 0, PI2); c.stroke(); c.restore();
    kai(c, String(o.i + 1), mk.x, mk.y + 0.5, ms, RED);
    if (isC) {
      var lsz = Math.max(9, Math.round(nm.sz * 0.34)), lh = vname(c, '当前操控', mk.x, mk.y + ms + lsz * 0.7, lsz, INK2);
      var sy = Math.min(mk.y + ms + lsz * 0.7 + lh + 2, nm.y + nh - lsz), sw = lsz + 6, shh = lsz * 2.3;
      c.save(); c.translate(mk.x, sy + shh / 2); c.rotate(0.04); c.fillStyle = 'rgba(255,236,226,0.9)'; c.fillRect(-sw / 2, -shh / 2, sw, shh); c.strokeStyle = RED; c.lineWidth = 1; c.strokeRect(-sw / 2, -shh / 2, sw, shh);
      c.font = 'bold ' + lsz + 'px ' + KAI(); c.fillStyle = RED; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('手', 0, -shh * 0.22); c.fillText('动', 0, shh * 0.24); c.restore();
    } else if (h.down) vname(c, '阵亡', mk.x, mk.y + ms + 10, Math.max(10, Math.round(nm.sz * 0.4)), RED);
    if (h.ward && !h.down) R4.drawWard(c, h.ward, a.x + a.w - 14, a.y + 24, 6, rt);
    // 气血：断墨线
    var hp = L.hp, frac = Math.max(0, h.hp / h.maxHp), ht = (hp.label || '') + Math.ceil(h.hp) + ' / ' + h.maxHp;
    inkHp(c, hp.x, hp.y, hp.w, frac, 3, 11 + o.i);
    c.font = 'bold ' + hp.sz + 'px ' + KAI(); var htw = c.measureText(ht).width; kai(c, ht, hp.x + hp.w + 8, hp.y, hp.sz, INK, 'left'); grow(dd, hp.x, hp.y - hp.sz, hp.w + 8 + htw, hp.sz * 2);
    if (h.down) { kai(c, '本关无法再战', L.st.cx, L.st.y + L.st.h / 2, Math.max(L.st.sz, 13 / U.P0.k), '#7a766a'); return fin(); }
    var t = orderStamps(c, G, o, U, dd, L.st.cx, L.st.y, L.st.w, L.st.h, L.st.gap, L.st.sz, isC, L.st.cx); if (t) tip = t;
    var ex = extras(G, h), rw = L.row;
    ex.forEach(function (e, q) {
      var x, y, w = rw.w, hh = rw.h;
      if (rw.stack) { x = rw.x; y = rw.y + q * (hh + 4); } else { var n = ex.length; x = rw.cx - (n * w + (n - 1) * 6) / 2 + q * (w + 6); y = rw.y; }
      var t4 = extraBtn(c, U, dd, e, o, x, y, w, hh, Math.min(15, hh * 0.5), x + w / 2); if (t4) tip = t4;
    });
    var sl = XY.skillList(G, h), bg = beadGrid(L.beads, sl.length);
    sl.forEach(function (sk, q) {
      var p = bg.pts[q], rdy = bead(c, sk, p[0], p[1], bg.isz), bx = p[0] - bg.isz / 2, by = p[1] - bg.isz / 2;
      dd.icons.push(U.box(bx, by, bg.isz, bg.isz)); grow(dd, bx - 3, by - 3, bg.isz + 6, bg.isz + 6);
      if (U.hov(bx, by, bg.isz, bg.isz)) tip = U.tipAt(p[0], by - 4, [sk.name + (rdy ? '（就绪）' : '（冷却 ' + Math.ceil(sk.rem) + ' 秒）'), sk.tip || '']);
    });
    return fin();
    function fin() { finish(U, dd); S.stats.lead = (S.stats.lead || 0) + 1; return tip; }
  }
  // 其余可指挥的人：圆形头像 + 竖排题名 + 断墨气血 + 特性题签 + 朱印命令；冷却念珠挂在头像左侧
  function drawMinor(c, G, app, o, cx, cy, U, q) {
    var h = o.h, d = h.def, M = U.P0.minor, r = M.r, rt = U.rt, isC = G.ctrl === o.i && !h.down, tip = null, dd = newDbg(U, o);
    var halo = c.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.5); halo.addColorStop(0, 'rgba(70,55,35,0.16)'); halo.addColorStop(1, 'rgba(70,55,35,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(cx + 2, cy + 3, r * 1.5, 0, PI2); c.fill();
    dd.face = seen(c, h, cx, cy, r, rt); dd.faceBox = U.box(cx - r, cy - r, r * 2, r * 2);
    var nh = vname(c, d.name, cx + r + 4 + M.nameSz / 2, cy - r + M.nameSz * 0.55, M.nameSz, h.down ? '#8a8578' : INK, r * 2);
    var nw = M.nameSz;
    U.hit(cx - r, cy - r, r * 2 + 4 + nw, Math.max(r * 2, nh), { act: 'hero', i: o.i }); grow(dd, cx - r, cy - r, r * 2 + 4 + nw, Math.max(r * 2, nh));
    if (U.hov(cx - r, cy - r, r * 2, r * 2)) tip = U.tipAt(cx, cy - r - 4, R4.heroInfo(h));
    if (h.ward && !h.down) R4.drawWard(c, h.ward, cx + r * 0.75, cy + r * 0.8, Math.max(4, r * 0.13), rt);
    if (h.down) {
      c.save(); c.translate(cx, cy); c.rotate(-0.14); c.strokeStyle = RED; c.lineWidth = 2.2; XY.R.rrect(c, -r, -r * 0.3, r * 2, r * 0.6, 3); c.stroke(); kai(c, '阵亡', 0, 1, Math.round(r * 0.42), RED); c.restore();
      kai(c, '本关无法再战', cx, cy + r + M.rowDy + M.rowH / 2, Math.max(13 / U.P0.k, fitSz(c, '本关无法再战', M.hpSz + 2, r * 3.2)), '#7a766a');
      finish(U, dd); return tip;
    }
    // 气血
    var frac = Math.max(0, h.hp / h.maxHp), hy = cy + r + 4, ht = Math.ceil(h.hp) + '/' + h.maxHp;
    c.font = 'bold ' + M.hpSz + 'px ' + XY.C.FONT; var htw = c.measureText(ht).width, lw = r * 1.5;
    inkHp(c, cx - (lw + 4 + htw) / 2, hy, lw, frac, 2, 23 + o.i); XY.R.txt(c, ht, cx - (lw + 4 + htw) / 2 + lw + 4, hy, M.hpSz, INK2, 'left', false);
    // 特性 / 骑乘 / 变身
    var ex = extras(G, h), n = ex.length, rw = M.rowW, ry = cy + r + M.rowDy;
    ex.forEach(function (e, k) { var x = cx - (n * rw + (n - 1) * 2) / 2 + k * (rw + 2), t = extraBtn(c, U, dd, e, o, x, ry, rw, M.rowH, Math.min(14, M.rowH * 0.46), cx); if (t) tip = t; });
    var t2 = orderStamps(c, G, o, U, dd, cx, cy + r + M.stDy, M.stW, M.stH, 0, M.stSz, isC, cx); if (t2) tip = t2;
    // 念珠
    var sl = XY.skillList(G, h), ba = beadArc(cx, cy, r, sl.length, M.isz), bz = ba.isz;
    sl.forEach(function (sk, k) {
      var p = ba.pts[k]; if (!p) return; var rdy = bead(c, sk, p[0], p[1], bz), bx = p[0] - bz / 2, by = p[1] - bz / 2;
      dd.icons.push(U.box(bx, by, bz, bz)); grow(dd, bx - 3, by - 3, bz + 6, bz + 6);
      if (U.hov(bx, by, bz, bz)) tip = U.tipAt(p[0], by - 4, [sk.name + (rdy ? '（就绪）' : '（冷却 ' + Math.ceil(sk.rem) + ' 秒）'), sk.tip || '']);
    });
    finish(U, dd); return tip;
  }
  // 手卷底部：护法天兵（水墨小像 + 价钱，点了照样去地上选点）；右下的召唤印由 render4 照常画
  function drawFoot(c, G, app, U) {
    var F = U.P0.foot, P0 = U.P0, tip = null, y = F.y;
    brush(c, 14, y, P0.DW - 28, 'rgba(129,113,80,A)', 1.2, 77);
    var lx = 14;
    if (F.label) kai(c, '护法天兵', lx, y + 4 + F.th / 2, P0.mode === 'desk' ? 15 : 12, INK, 'left');
    TK.forEach(function (id, q) {
      var td = XY.TOWERS[id], x = F.tx + q * (F.tw + 2), yy = y + 4, own = XY.save.solOwned(id), ok = own && G.coins >= XY.soldierCost(G,id), sel = app.build === id, hv = U.hov(x, yy, F.tw, F.th);
      if (sel || hv) { c.fillStyle = sel ? 'rgba(184,48,15,0.16)' : 'rgba(184,48,15,0.07)'; c.beginPath(); c.ellipse(x + F.tw / 2, yy + F.th / 2, F.tw / 2, F.th / 2, 0, 0, PI2); c.fill(); }
      if (!(XY.ICONINK && XY.ICONINK.sol(c, id, x + F.tw / 2, yy + F.th * 0.36, F.th * 0.6, own ? (ok ? 1 : 0.6) : 0.35))) kai(c, td.name.charAt(0), x + F.tw / 2, yy + F.th * 0.36, 14, own ? INK : '#aaa');
      var lab = own ? String(XY.soldierCost(G,id)) : '无卡'; if (F.keys) lab += ' ' + td.key.toUpperCase();
      kai(c, lab, x + F.tw / 2, yy + F.th * 0.84, fitSz(c, lab, P0.mode === 'desk' ? 12 : 10, F.tw - 2), ok ? '#a8700a' : '#9a9486');
      if (sel) { c.strokeStyle = RED; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x + F.tw / 2, yy + F.th / 2, F.tw / 2 - 1, F.th / 2 - 1, 0, 0, PI2); c.stroke(); }
      U.hit(x, yy, F.tw, F.th, { act: 'tower', type: id });
      if (hv) app._tip = { x: (x + F.tw / 2) * P0.k / P0.z, y: (yy - 6) * P0.k / P0.z, text: td.name + '（卡 Lv' + XY.save.solLevel(id) + ' · ' + XY.save.solCards(id) + ' 张）：' + td.desc };
    });
    var cap = XY.soldierCap(G), full = G.towers.length >= cap, info = '天兵 ' + G.towers.length + '/' + cap + (full ? '（已满）' : '');
    var ix = F.tx + 5 * (F.tw + 2) + 12;
    if (F.info) kai(c, info + (P0.mode === 'desk' ? '  ·  点将布阵，合卷即行' : ''), ix, y + 4 + F.th / 2, P0.mode === 'desk' ? 13 : 10, full ? RED : '#816f50', 'left');
    else if (!F.hideCap) kai(c, info, F.tx, y - 9, 11, full ? RED : '#816f50', 'left');
    return tip;
  }

  /* ---------------- 手机横屏：左下天兵小条（原样保留） ---------------- */
  S.drawTower = function (c, G, app) {
    if(XY.ui2.on&&XY.inkHud)return XY.inkHud.soldiers(c,G,app,S.towerBox(G,app),true);
    var T = XY.R, z = app.zoom, B = S.towerBox(G, app);
    function box(x, y, w, h) { return { x: x / z, y: y / z, w: w / z, h: h / z }; }
    function panel(x, y, w, h, fill, line, lw) { T.rrect(c, x, y, w, h, 5); c.fillStyle = fill; c.fill(); c.lineWidth = lw || 1; c.strokeStyle = line; c.stroke(); }
    c.save(); c.scale(1 / z, 1 / z);
    panel(B.x, B.y, B.w, B.h, 'rgba(255,252,243,0.96)', LINE);
    var hb = box(B.x, B.y, B.w, B.h); hb.id = 'tower'; XY.ui.hud.push(hb);
    T.txt(c, '天兵 ' + G.towers.length + '/' + XY.soldierCap(G), B.x + B.w / 2, B.y + 10, 11, T.T.ink, 'center', true);
    TK.forEach(function (id, i) {
      var tw = (B.w - 12) / 2, td = XY.TOWERS[id], x = B.x + 4 + (i % 2) * (tw + 4), y = B.y + 20 + Math.floor(i / 2) * 46, own = XY.save.solOwned(id), ok = own && G.coins >= XY.soldierCost(G,id);
      panel(x, y, tw, 44, ok ? '#fffdf6' : '#ececec', app.build === id ? '#e8892b' : LINE, app.build === id ? 2 : 1);
      if (XY.ICONINK) XY.ICONINK.sol(c, id, x + tw / 2, y + 15, 26, own ? 1 : 0.4);
      T.txt(c, own ? String(XY.soldierCost(G,id)) : '无卡', x + tw / 2, y + 34, 10, ok ? '#a8700a' : '#aaa', 'center', true);
      var b = box(x, y, tw, 44); b.act = 'tower'; b.type = id; XY.ui.hits.push(b);
    });
    c.restore();
  };
})();
