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
    open: function (app) { var G = XY.G; if (!available(G, app) || G.tut) return false; app.partyPage = 0; app.partyPanel = true; app.build = null; app.summon = null; app.selTower = null; if (app.mm) { app.mm.holding = false; } return true; },
    close: function (app) { app.partyPanel = false; },
    toggle: function (app) { return app.partyPanel ? (P.close(app), false) : P.open(app); }
  };

  /* ---------------- 头像 ---------------- */
  var xav = {};
  function xAvatar(id) {
    if (X_IDS.indexOf(id) < 0) return null;
    var e = xav[id];
    if (!e) {
      var src = 'assets/art/x-avatars/' + id + '.webp';
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
    var im = xAvatar(h.id);
    if (im) {
      c.save(); c.beginPath(); c.arc(x, y, r, 0, PI2); c.clip(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      var s = Math.min(im.naturalWidth, im.naturalHeight); c.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, x - r, y - r, r * 2, r * 2); c.restore();
      kind = 'x';
    } else if (XY.heroink && XY.heroink.has(d.id === 'horse' && d.form === 'human' ? 'horse_human' : h.id) && XY.heroink.face(c, d, x, y, r)) {
      kind = 'ink';
    } else {
      c.save(); c.beginPath(); c.arc(x, y, r, 0, PI2); c.clip();
      var ok = XY.chibi && XY.chibi.portrait(c, XY.chibiKey ? XY.chibiKey(h) : h.id, x, y + r * 1.15, r * 2.1, 1);
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
  function fitSz(c, s, sz, maxW, font) { c.font = 'bold ' + sz + 'px ' + (font || KAI()); while (sz > 8 && c.measureText(s).width > maxW) { sz -= 0.5; c.font = 'bold ' + sz + 'px ' + (font || KAI()); } return sz; }

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
      var g = cv.getContext('2d'), iw = im.naturalWidth, ih = im.naturalHeight, sx = iw * 0.10, sy = ih * 0.04, sw = iw * 0.80, sh = ih * 0.76, ar = b.w / b.h;
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
    return face(c, h, cx, cy, r, rt);
  }
  function seen(c, h, x, y, r, rt) { c.save(); if (h.down) c.globalAlpha = 0.4; var k = face(c, h, x, y, r, rt); c.restore(); return k; }

  /* ---------------- 绘制 ---------------- */
  // 入口：render4 的 drawHeroCards 调这里。返回悬停提示（逻辑像素）或 null。
  S.drawParty = function (c, G, app, phase) {
    var z = app.zoom, vis = P.visible(G, app), pin = vis && !app.partyPanel;
    if (app.partyPanel && !available(G, app)) app.partyPanel = false;
    XY.ui.cardDbg = []; XY.ui.party = { open: !!app.partyPanel, pinned: pin, tab: null, sheet: null, ids: [] };
    G.heroes.forEach(function (h) { xAvatar(h.id); });            // 收起时就先把本局人的 X 头像载上，面板第一次打开不再是占位脸
    if (!vis) { if (phase !== 'pre' && available(G, app)) { if (XY.compactHud && XY.compactHud.on(G,app)) XY.compactHud.party(c,G,app); else drawTab(c, G, app, false); } return null; }
    if (phase === 'pre' && pin) return null;           // 教程钉开：和收起时一样放在最上层画，不加遮罩
    if (phase !== 'pre' && !pin) return null;
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
      if (hv) tip = U.tipAt(tipX, y - 6, [XY.ORDER_NAME[ob] + '：' + XY.ORDER_DESC[ob] + (isC ? '（手动操控，松手后生效）' : '')]);
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
    if (h.down) { kai(c, '本局不能再出战', L.st.cx, L.st.y + L.st.h / 2, L.st.sz, '#7a766a'); return fin(); }
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
      kai(c, '本局不能再出战', cx, cy + r + M.rowDy + M.rowH / 2, fitSz(c, '本局不能再出战', M.hpSz + 2, r * 3.2), '#7a766a');
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
    else kai(c, info, F.tx, y - 9, 11, full ? RED : '#816f50', 'left');
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
