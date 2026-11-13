/* fork.js —— v0.8.4 分岔路线（第 1 关：休息点之后的岔口）
 *  北线「官道」= 原来的路；南线「土地公小道」= 多绕约 30 秒，飞妖 ×2，多一个宝箱，顺路救土地公。
 *  G.rtN / G.rtS：两条完整折线（到岔口为止的点完全相同，所以唐僧的 s 不用换算）；G.rt 指向当前生效的那条。
 *  唐僧走到岔口还没选 → phase='fork' 站着等，30 秒不选默认北线。
 *  画面：南线是叠在水墨底图上的“动态路面”（底图里只画了北线）；没选中的那条变灰 + 木牌；小地图两条都画。
 *  选路卡：顶部居中、通知条下面，两个大按钮（手机直接点），热键 Q / E。 */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, F = XY.fork = {};
  var WAIT = 30;

  F.has = function (G) { return !!(G && G.rtS && G.rtN && !G.dungeon); };
  F.extraSec = function (G) { return F.has(G) ? Math.round((G.rtS.total - G.rtN.total) / G.tang.speed) : 0; };
  // 路线上限：没选之前唐僧最远走到岔口
  F.cap = function (G) { return (F.has(G) && !G.tang.forked) ? G.rtN.forkS : G.rt.total; };
  // 现在能不能选：休息的最后 20 秒（夜潮 3 收尾）起，到走过岔口为止
  F.offered = function (G) {
    if (!F.has(G) || G.routeChoice || G.tang.forked) return false;
    var T = G.tang;
    return T.phase === 'fork' || T.phase === 'walk2' || (T.phase === 'rest' && T.restT >= T.restMax - C.REST_WRAP);
  };
  F.waitLeft = function (G) { return G.tang.phase === 'fork' ? Math.max(0, WAIT - G.tang.forkT) : null; };

  F.choose = function (G, which, auto) {
    if (!F.has(G) || G.routeChoice || G.tang.forked && !auto) return false;
    if (which !== 'N' && which !== 'S') return false;
    if (!auto && !F.offered(G)) return false;
    G.routeChoice = which; G.routeAuto = !!auto;
    G.rt = which === 'S' ? G.rtS : G.rtN;
    G.stats.route = which;
    var d = XY.save && XY.save.data; if (d && !G.testMode) { d.routes = d.routes || { N: 0, S: 0 }; }   // 次数在结算时记（通关 / 失败都算一次选择）
    if (which === 'S') {
      var A = G.lv.alt; G.chests.push({ x: A.chest[0], y: A.chest[1], t: 0, ahead: true, south: true });
      XY.toast(G, '走南线「' + A.name + '」：多走约 ' + F.extraSec(G) + ' 秒，飞妖 ×2，路上多一个宝箱，顺路救土地公', 4);
      // 已经放在北线岔口之后的天兵：转成跟随，跟着唐僧走（不传送）
      G.towers.concat(G.allies).forEach(function (u) {
        if (u.dead || u.mode !== 'garrison') return;
        if (XY.routeProject(G.rtS, u.x, u.y).d > C.ROAD_HALF + 20) { XY.soldierJoin(G, u); XY.core.ring(G, u.x, u.y, 40, '#9fd0ff', 0.4); }
      });
    } else XY.toast(G, auto ? '没人选，默认走北线「官道」' : '走北线「官道」：路近，怪量正常', 3);
    if (G.tang.phase === 'fork') { G.tang.phase = 'walk2'; G.tang.forked = true; }
    return true;
  };
  XY.chooseRoute = F.choose;

  // 唐僧走到岔口（updateTang 调用）
  F.arrive = function (G) {
    var T = G.tang;
    if (G.routeChoice) { T.forked = true; return; }
    T.phase = 'fork'; T.forkT = 0;
    XY.banner && XY.banner(G, '前面是岔路口！选北线「官道」还是南线「土地公小道」？（' + WAIT + ' 秒不选默认北线）', 5);
  };
  F.wait = function (G, dt) {
    var T = G.tang; T.forkT += dt;
    if (G.routeChoice) { T.phase = 'walk2'; T.forked = true; }
    else if (T.forkT >= WAIT) F.choose(G, 'N', true);
  };

  /* ---------- 地图叠加层（世界坐标） ---------- */
  function tail(R, from) {            // 取 R 从路程 from 之后的折线点
    var out = [], i, p = XY.routeAt(R, from);
    out.push({ x: p.x, y: p.y });
    for (i = 0; i < R.pts.length; i++) if (R.cum[i] > from + 0.5) out.push(R.pts[i]);
    return out;
  }
  function stroke(c, pts) { c.beginPath(); pts.forEach(function (p, k) { k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }); c.stroke(); }
  function sign(c, x, y, txt, col, rt) {
    c.save(); c.translate(x, y);
    c.strokeStyle = 'rgba(74,52,28,0.85)'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 36); c.stroke();
    c.fillStyle = 'rgba(244,232,204,0.92)';
    c.beginPath();
    c.moveTo(-28, -30); c.quadraticCurveTo(0, -40, 30, -28); c.quadraticCurveTo(36, -8, 26, 2); c.quadraticCurveTo(0, 8, -26, 0); c.quadraticCurveTo(-36, -10, -28, -30);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(90,64,36,0.55)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-18, -16); c.quadraticCurveTo(4, -22, 20, -14); c.stroke();
    c.font = '20px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#3a2a14'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 1, -14);
    c.restore();
  }
  F.drawWorld = function (c, G, rt) {
    if (!F.has(G)) return;
    var T = G.tang, N = G.rtN, S = G.rtS, fs = N.forkS, ch = G.routeChoice;
    if (T.rests <= 0 && T.s < N.restS - 400) return;                     // 休息点之前不剧透
    var sp = tail(S, fs), np = tail(N, fs);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (ch !== 'N') {                                                      // 南线路面（底图里没有）：浅土色 + 墨线边；选了北线就不画了（变灰在下面）
      var a = ch === 'S' ? 1 : 0.92;
      c.globalAlpha = a; c.strokeStyle = 'rgba(120,98,62,0.55)'; c.lineWidth = 92; stroke(c, sp);
      c.strokeStyle = '#ecdcae'; c.lineWidth = 80; stroke(c, sp);
      c.strokeStyle = 'rgba(190,160,100,0.5)'; c.lineWidth = 3; c.setLineDash([16, 22]); stroke(c, sp); c.setLineDash([]);
      if (ch === 'S' && T.s > fs) {                                         // 走过的部分：和北线一样的淡金色
        var seg = [XY.routeAt(S, fs)]; for (var i = 0; i < S.pts.length && S.cum[i] <= T.s; i++) if (S.cum[i] > fs) seg.push(S.pts[i]); seg.push(XY.routeAt(S, T.s));
        c.globalAlpha = 1; c.strokeStyle = 'rgba(255,224,130,0.80)'; c.lineWidth = 70; stroke(c, seg);
        c.strokeStyle = 'rgba(255,246,200,0.9)'; c.lineWidth = 8; stroke(c, seg);
      }
    }
    if (ch === 'S') {                                                      // 北线被封：盖一层灰
      c.globalAlpha = 0.72; c.strokeStyle = '#d9d4c2'; c.lineWidth = 104; stroke(c, np);
      c.globalAlpha = 0.5; c.strokeStyle = 'rgba(120,112,92,0.7)'; c.lineWidth = 3; c.setLineDash([10, 14]); stroke(c, np); c.setLineDash([]);
    }
    c.restore();
    // 木牌：没选 = 路牌；选了 = 在被封那条路的口子上立“封路”牌
    var fp = N.fork;
    if (!ch) sign(c, fp.x - 8, fp.y - 62, '岔路', '#f4dcae', rt);
    else if (ch === 'N') { var q = XY.routeAt(S, fs + 160); sign(c, q.x, q.y - 20, '封路', '#d8d2c0', rt); }
    else { var q2 = XY.routeAt(N, fs + 160); sign(c, q2.x, q2.y - 20, '封路', '#d8d2c0', rt); }
    if (!ch) {                                                              // 两条路各写名字
      var qa = XY.routeAt(N, fs + 330), qb = XY.routeAt(S, fs + 330);
      c.save(); c.font = 'bold 22px ' + C.FONT; c.textAlign = 'center'; c.fillStyle = '#6a4a14'; c.strokeStyle = 'rgba(255,250,236,0.9)'; c.lineWidth = 5;
      c.strokeText('北线·官道', qa.x, qa.y - 50); c.fillText('北线·官道', qa.x, qa.y - 50);
      c.strokeText('南线·土地公小道', qb.x, qb.y + 56); c.fillText('南线·土地公小道', qb.x, qb.y + 56);
      c.restore();
    }
  };

  /* ---------- 小地图（mp = 世界→小地图坐标） ---------- */
  F.drawMini = function (c, G, mp) {
    if (!F.has(G)) return;
    var N = G.rtN, S = G.rtS, fs = N.forkS, ch = G.routeChoice, T = G.tang;
    if (T.rests <= 0 && T.s < N.restS - 400) return;
    function line(pts, col, w, dash) {
      c.beginPath(); pts.forEach(function (p, k) { var q = mp(p.x, p.y); k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); });
      c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]);
    }
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    line(tail(N, fs), ch === 'S' ? 'rgba(150,146,134,0.7)' : '#c9902a', ch === 'S' ? 1.5 : 2.6, ch === 'S' ? [3, 3] : null);
    line(tail(S, fs), ch === 'N' ? 'rgba(150,146,134,0.7)' : '#3a8a6a', ch === 'N' ? 1.5 : 2.6, ch === 'N' ? [3, 3] : null);
    var f = mp(N.fork.x, N.fork.y); c.fillStyle = '#fff'; c.strokeStyle = '#8a6a2b'; c.lineWidth = 1.5; c.beginPath(); c.arc(f.x, f.y, 3.2, 0, 6.3); c.fill(); c.stroke();
    c.restore();
  };

  /* ---------- 选路卡（屏幕坐标，按逻辑像素；手机上 1 逻辑像素 ≈ 0.5 CSS 像素，所以按钮要够大） ---------- */
  F.drawUI = function (c, G, app) {
    F.card = null;
    if (!F.offered(G) || G.mode !== 'play' || app.screen !== 'play') return;
    var T = XY.R, R4 = XY.R4, M = R4.topMetrics(app), mob = M.mob, W = app.lw, ui = XY.ui;
    var cw = mob ? Math.min(W - 24, 720) : 520, pad = mob ? 12 : 10, gap = mob ? 12 : 10, bw = (cw - pad * 2 - gap) / 2;
    var f0 = mob ? 22 : 13, f1 = mob ? 26 : 16, f2 = mob ? 21 : 12, th = mob ? 34 : 22, bh = mob ? 138 : 78;
    var ch = pad + th + 6 + bh + pad, x = Math.round(W / 2 - cw / 2), y = M.ty + M.th * 2 + 12;
    if (app.lw < 1000) y = M.ty + M.th * 2 + 12;
    var pulse = 0.5 + 0.5 * Math.sin(app.rt * 4), left = F.waitLeft(G), A = G.lv.alt;
    c.save();
    ui.hits.push({ x: x, y: y, w: cw, h: ch, act: 'ui' });                    // 底板先进（按钮后进，后进的优先）
    T.panel(c, x, y, cw, ch, 14, 'rgba(255,250,236,0.97)', '#c9902a');
    var head = left != null ? '前面是岔路口 · ' + Math.ceil(left) + ' 秒后默认北线' : '前面有岔路口 · 先选路再出发';
    T.txt(c, head, x + cw / 2, y + pad + th / 2, f0, '#7a5a10', 'center', true);
    var defs = [
      { id: 'N', key: 'Q', act: 'routeN', name: '北线·官道', l1: '路近 · 怪量正常', l2: '稳妥', col: '#c9902a', bg: 'rgba(255,243,214,0.98)' },
      { id: 'S', key: 'E', act: 'routeS', name: '南线·' + A.name, l1: '多走 ' + F.extraSec(G) + ' 秒 · 妖潮 +20%', l2: '飞妖 ×2 · +宝箱 · 救土地公', col: '#2f8a62', bg: 'rgba(228,244,234,0.98)' }
    ];
    for (var i = 0; i < 2; i++) {
      var d = defs[i], bx = x + pad + i * (bw + gap), by = y + pad + th + 6, hov = app.mouse && app.mouse.x >= bx && app.mouse.x <= bx + bw && app.mouse.y >= by && app.mouse.y <= by + bh;
      T.rrect(c, bx, by, bw, bh, 12); c.fillStyle = d.bg; c.fill(); c.lineWidth = hov ? 3.5 : 2.2 + pulse * 0.8; c.strokeStyle = d.col; c.stroke();
      var nm = d.name, fs1 = f1; while (fs1 > 12 && R4.tw(c, nm, fs1, true) > bw - 16) fs1--;
      T.txt(c, nm, bx + bw / 2, by + bh * 0.24, fs1, d.col, 'center', true);
      T.txt(c, d.l1, bx + bw / 2, by + bh * 0.52, f2, '#3a3020', 'center', false);
      T.txt(c, d.l2, bx + bw / 2, by + bh * 0.74, f2, '#6a5a3a', 'center', false);
      if (!mob) T.txt(c, '[' + d.key + ']', bx + bw - 6, by + 10, 11, '#8a7a5a', 'right', false);
      ui.hits.push({ x: bx, y: by, w: bw, h: bh, act: d.act });
      F['btn' + d.id] = { x: bx, y: by, w: bw, h: bh };
    }
    (ui.hud || (ui.hud = [])).push({ id: 'forkCard', x: x, y: y, w: cw, h: ch });
    F.card = { x: x, y: y, w: cw, h: ch };
    c.restore();
  };
})();
