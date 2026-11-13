/* v0.7 第 2 批（docs/evolution-proposal-v1.md 已批准）：
 *  1. 盾兵：正面挡弹幕 / 挥击（伤害 ×0.2），要绕到背后、用金属性（金克木）或破阵天兵；头上有「金 / 背」弱点标。
 *  2. 黑熊精招牌「抡山落石」：地上先出红圈预告（1.1 秒），然后落石砸人 / 砸塔；二阶段圈更多。
 *  3. 法宝进化：齐天套（带满 3 件，含金箍棒）+ 悟空主技能 ≥ 4 级 → 打开下一个宝箱时金箍棒进化成「万丈金箍棒」：
 *     横扫范围 ×1.25，命中减速 + 灼烧（金色火焰扫痕）。
 * 所有数值写在 XY.C.V07B 里，方便测试 / 调参。
 */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin;
  var B = XY.v07b = {};
  C.V07B = {
    GUARD_MUL: 0.33, GUARD_TOWER: 0.5, GUARD_BACK: 1.15, GUARD_TAN: 2.6,                         // 盾兵：正面伤害倍率；背后倍率；正面锥角（|dy| < |dx|×2.6 ≈ ±69°）
    ROCK_CD: 9, ROCK_CD2: 6.5, ROCK_N: 3, ROCK_N2: 5, ROCK_R: 92, ROCK_T: 1.1, ROCK_DMG: 24, ROCK_TOWER: 45,
    EVO_ON: false, EVO_WLV: 4, EVO_NEED: 3, EVO_FALLBACK: 30, EVO_RANGE: 1.25, EVO_SLOW: 0.4, EVO_SLOW_T: 2.2, EVO_BURN_T: 3, EVO_BURN_K: 0.3
  };
  var V = C.V07B;

  /* ---------- 盾兵：正面格挡 ---------- */
  B.faceOf = function (G, e) { var th = e.toCamp || !e.th ? (G.camp.active ? G.camp : G.heroes[0]) : e.th; return th.x > e.x ? 1 : -1; };   // 营地没开时怪追着唐僧走（updateEnemies 的 cgoal），盾也朝唐僧
  // 返回处理后的伤害；o 里没有攻击者位置（范围爆炸 / 持续伤害 / 天兵）时不挡
  B.guardHit = function (G, e, dmg, o, el) {
    if (o.dot || o.aoe) return dmg;                                          // 持续伤害 / 范围爆炸 / 大招范围：不挡
    var ax, ay;
    if (o.fx !== undefined && o.fx !== null) { ax = o.fx; ay = o.fy; } else if (o.src && o.src.x !== undefined) { ax = o.src.x; ay = o.src.y; } else return dmg;
    var dx = ax - e.x, dy = ay - e.y, look = B.faceOf(G, e);
    var front = dx * look > 0 && Math.abs(dy) < Math.abs(dx) * V.GUARD_TAN;
    if (e.stunT > 0 || e.gBreak > G.t) front = false;                       // 晕住 / 刚被破阵时盾放下了（e.gBreak 是 G.t 时间戳）
    if (front) {
      if (el === 'metal' || o.anti) { e.gBreak = G.t + 0.5; if (Math.random() < 0.5) XY.core.text(G, e.x, e.y - e.r - 18, '破阵！', 'weak'); return dmg; }
      e.gFlash = 0.16; if (o.kb) o.kb *= 0.3;
      if (XY.core.spark) XY.core.spark(G, e.x + look * e.r * 0.8, e.y, '#e8d9a0', 3);
      if (Math.random() < 0.5) XY.core.text(G, e.x + look * e.r, e.y - e.r - 12, '挡', 'resist');
      G.stats.guardBlocks = (G.stats.guardBlocks || 0) + 1;
      return dmg * (o.src === null ? 1 - (1 - V.GUARD_MUL) * V.GUARD_TOWER : V.GUARD_MUL);     // 塔的弹丸（src 为空）只挡一半
    }
    if (dx * look >= 0 || Math.abs(dy) >= Math.abs(dx) * V.GUARD_TAN) return dmg;        // 侧面：不挡也没加成
    G.stats.guardBacks = (G.stats.guardBacks || 0) + 1;
    if (Math.random() < 0.35) XY.core.text(G, e.x, e.y - e.r - 18, '破背', 'weak');
    return dmg * V.GUARD_BACK;
  };

  // 盾兵头上的弱点提示：「金」= 金属性能打穿；「背」= 绕到背后（正面挡）。晕住 / 被破阵时盾放下，标记变灰
  B.drawGuardTag = function (c, G, e, rt) {
    if (G._lod) return;
    var down = e.stunT > 0 || e.gBreak > G.t;
    var x = e.x, y = e.y - e.r - 22, look = B.faceOf(G, e);
    c.save(); c.globalAlpha = down ? 0.4 : 0.95;
    c.fillStyle = '#fff8e0'; c.strokeStyle = '#8a6a22'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 17, y - 7); c.lineTo(x + 17, y - 7); c.lineTo(x + 17, y + 6); c.lineTo(x + 3, y + 6); c.lineTo(x, y + 10); c.lineTo(x - 3, y + 6); c.lineTo(x - 17, y + 6); c.closePath(); c.fill(); c.stroke();
    c.font = 'bold 11px "Microsoft YaHei",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#b8860b'; c.fillText('金', x - 8, y); c.fillStyle = '#c0392b'; c.fillText('背', x + 8, y);
    c.restore();
  };

  /* ---------- 黑熊精招牌：抡山落石（红圈预告） ---------- */
  B.bossSig = function (G, e, dt) {
    if (e.def.kit !== 'bear') return;
    var ws = G.warns || (G.warns = []);
    if (e.sigT === undefined) e.sigT = 5;
    if (e.bstate !== 'idle') return;                                          // 出别的招时不叠
    e.sigT -= dt * (e.enraged ? 2 : 1);
    if (e.sigT > 0) return;
    e.sigT = e.phase === 2 ? V.ROCK_CD2 : V.ROCK_CD;
    var n = e.phase === 2 ? V.ROCK_N2 : V.ROCK_N, tg = [], i, h, tang = G.heroes[0];
    for (i = 0; i < G.heroes.length; i++) { h = G.heroes[i]; if (h.down || i === 0) continue; var d = XY.dist(h.x, h.y, e.x, e.y); if (d < 760) tg.push({ h: h, d: d }); }
    tg.sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < n; i++) {
      var px, py, base = tg.length ? tg[i % tg.length].h : null;
      if (base && i < tg.length) { px = base.x + (base.vx || 0) * 0.5; py = base.y + (base.vy || 0) * 0.5; }
      else { var a = Math.random() * PI2, rr = 140 + Math.random() * 260; px = (base ? base.x : e.x) + cos(a) * rr * 0.6; py = (base ? base.y : e.y) + sin(a) * rr * 0.6; }
      if (tang && XY.dist(px, py, tang.x, tang.y) < V.ROCK_R + 40) { var ax = px - tang.x, ay = py - tang.y, al = Math.sqrt(ax * ax + ay * ay) || 1; px = tang.x + ax / al * (V.ROCK_R + 40); py = tang.y + ay / al * (V.ROCK_R + 40); }   // 不直接盖在师父头上
      ws.push({ x: px, y: py, r: V.ROCK_R * (e.phase === 2 ? 1.1 : 1), t: -i * 0.12, max: V.ROCK_T, owner: e, dmg: V.ROCK_DMG, kind: 'rock' });
    }
    G.stats.rockCasts = (G.stats.rockCasts || 0) + 1;
    if (!G._rockToast) { G._rockToast = 1; XY.core.toast(G, e.def.name + '抡起山石！地上的红圈是落点，快躲开'); }
    XY.core.ring(G, e.x, e.y, 70, '#c0392b', 0.35);
  };
  B.update = function (G, dt) {
    var ws = G.warns; if (!ws || !ws.length) return;
    var w = 0, i, j;
    for (i = 0; i < ws.length; i++) {                                             // AI 队友（没被操控的徒弟 / 特殊角色）看见红圈就往圈外挪一步；唐僧不动（他本来就不受伤）
      var wf = ws[i]; if (wf.kind !== 'rock' || wf.t >= wf.max || wf.t < -0.3) continue;
      for (j = 1; j < G.heroes.length; j++) {
        var ah = G.heroes[j]; if (ah.down || j === G.ctrl) continue;
        var ddx = ah.x - wf.x, ddy = ah.y - wf.y, dd = Math.sqrt(ddx * ddx + ddy * ddy), lim = wf.r + ah.def.r + 8;
        if (dd >= lim) continue;
        if (dd < 1) { ddx = 1; ddy = 0; dd = 1; }
        var st = Math.min(lim - dd + 2, Math.max(ah.speed || 190, 190) * 1.4 * dt);
        ah.x = Math.max(40, Math.min(C.WORLD_W - 40, ah.x + ddx / dd * st)); ah.y = Math.max(40, Math.min(C.WORLD_H - 40, ah.y + ddy / dd * st));
      }
    }
    for (i = 0; i < ws.length; i++) {
      var f = ws[i], ow = f.owner;
      if (ow && (ow.dead || ow.retreatT > 0 || ow.hidden)) continue;           // 洞主倒下 / 败退：红圈消失
      f.t += dt;
      if (f.t >= f.max) {
        var dmgR = ow ? ow.dmg / ow.def.dmg : 1;
        XY.core.ring(G, f.x, f.y, f.r, '#a8552a', 0.5, true); G.shake = Math.max(G.shake, 7);
        if (XY.vfx && XY.vfx.land) XY.vfx.land(G, f.x, f.y, f.r);
        // 落石不伤师父（师父一碰就输，红圈不能变成“追着师父打”）；砸中徒弟 / 特殊角色 / 塔
        for (j = 1; j < G.heroes.length; j++) { var h = G.heroes[j]; if (h.down) continue; if (XY.dist(f.x, f.y, h.x, h.y) < f.r + h.def.r) XY.hurtHeroBy(G, h, f.dmg * dmgR, false, (ow ? ow.def.name : '') + '的落石砸中了', 'phys', 'earth'); }
        var tws = G.towers.slice(); for (j = 0; j < tws.length; j++) { var t = tws[j]; if (XY.dist(f.x, f.y, t.x, t.y) < f.r) XY.hurtTower(G, t, V.ROCK_TOWER * dmgR); }      // 先复制：hurtTower 打死塔会 splice，正向遍历会漏掉紧随其后的塔
        G.stats.rockLands = (G.stats.rockLands || 0) + 1;
        continue;
      }
      ws[w++] = f;
    }
    ws.length = w;
  };
  B.drawWarns = function (c, G, rt) {
    var ws = G.warns; if (!ws) return;
    for (var i = 0; i < ws.length; i++) {
      var f = ws[i]; if (f.t < 0) continue; var k = Math.min(1, f.t / f.max), pul = 0.5 + 0.5 * Math.sin(rt * 14);
      if (XY.inView && !XY.inView(G, f.x, f.y, f.r + 40)) continue;
      c.save();
      // 落点是“必须看清的区域”：淡红底 + 斜纹警示（一看就是危险区）+ 倒计时填充 + 粗实线边
      c.fillStyle = 'rgba(214,52,36,' + (0.14 + 0.10 * pul) + ')'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, PI2); c.fill();
      c.save(); c.beginPath(); c.arc(f.x, f.y, f.r, 0, PI2); c.clip(); c.strokeStyle = 'rgba(170,20,10,0.38)'; c.lineWidth = 6;
      for (var hx = -f.r * 2; hx < f.r * 2; hx += 22) { c.beginPath(); c.moveTo(f.x + hx, f.y + f.r); c.lineTo(f.x + hx + f.r * 1.4, f.y - f.r); c.stroke(); }
      c.fillStyle = 'rgba(214,52,36,' + (0.20 + 0.26 * k) + ')'; c.beginPath(); c.moveTo(f.x, f.y); c.arc(f.x, f.y, f.r * 1.05, -1.5708, -1.5708 + PI2 * k); c.closePath(); c.fill();   // 扇形倒计时：顺时针扫满
      c.restore();
      c.strokeStyle = 'rgba(160,20,10,1)'; c.lineWidth = 4.5; c.beginPath(); c.arc(f.x, f.y, f.r, 0, PI2); c.stroke();
      // 山石正在落下（越到最后越近，也越大）
      var fy = f.y - (1 - k) * (1 - k) * 260 - 6, s = 14 + 12 * k;
      c.fillStyle = '#8a6a52'; c.strokeStyle = '#3e2a1c'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(f.x - s, fy + s * 0.5); c.lineTo(f.x - s * 0.8, fy - s * 0.4); c.lineTo(f.x - s * 0.1, fy - s * 0.9); c.lineTo(f.x + s * 0.7, fy - s * 0.5); c.lineTo(f.x + s, fy + s * 0.4); c.lineTo(f.x + s * 0.2, fy + s * 0.8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#b89478'; c.beginPath(); c.moveTo(f.x - s * 0.5, fy - s * 0.2); c.lineTo(f.x - s * 0.1, fy - s * 0.7); c.lineTo(f.x + s * 0.4, fy - s * 0.3); c.closePath(); c.fill();
      c.restore();
    }
  };

  /* ---------- 法宝进化：万丈金箍棒 ---------- */
  function setCount(G, set) { var n = 0; XY.cards.carried(G).forEach(function (id) { if (XY.CARD_BY[id] && XY.CARD_BY[id].set === set) n++; }); return n; }
  B.evoOk = function (G) {
    if (!V.EVO_ON) return false;      // 20:41 用户决定：法宝系统整体重做，进化先关掉（代码留着，开关在这）
    var h = G.heroes[1]; if (!h || h.id !== 'wukong') return false;
    if (XY.cards.carried(G).indexOf('jingubang') < 0) return false;
    return setCount(G, 'qitian') >= V.EVO_NEED && h.wlv >= V.EVO_WLV;
  };
  B.evolve = function (G) {
    var E = G.evo; if (!E || E.done) return;
    var h = G.heroes[1]; E.done = true; E.t = G.t; E.ready = false; G.stats.evoAt = G.t;
    if (XY.core.ring) { XY.core.ring(G, h.x, h.y, 260, '#f0b429', 0.9, true); XY.core.ring(G, h.x, h.y, 150, '#ff7a1a', 0.7, true); }
    G.shake = Math.max(G.shake, 10); G.flash = Math.max(G.flash || 0, 0.2);
    if (XY.vfx && XY.vfx.evoBurst) XY.vfx.evoBurst(G, h);
    XY.core.banner(G, '金箍棒进化！「万丈金箍棒」—— 横扫更大、减速 + 灼烧', 4);
    XY.core.toast(G, '齐天套 3 件 + 金箍棒升满：悟空的横扫变成金色烈焰');
  };
  B.evoUpdate = function (G, dt) {
    var E = G.evo || (G.evo = { done: false, ready: false, t: 0, rt: 0 });
    if (E.done) return;
    E.chk = (E.chk || 0) - dt; if (E.chk > 0) { if (E.ready) E.rt += dt; if (E.ready && E.rt >= V.EVO_FALLBACK) B.evolve(G); return; }
    E.chk = 0.5;
    var ok = B.evoOk(G);
    if (ok && !E.ready) { E.ready = true; E.rt = 0; G.stats.evoReadyAt = G.t; XY.core.banner(G, '金箍棒蓄满灵气！打开下一个宝箱就会进化（' + V.EVO_FALLBACK + ' 秒内没有宝箱也会自己进化）', 4.5); }
    else if (!ok && E.ready) E.ready = false;
  };
  B.onChest = function (G) { var E = G.evo; if (E && E.ready && !E.done && B.evoOk(G)) B.evolve(G); };
  // 悟空的一下横扫命中：进化后附带减速 + 灼烧
  B.evoHit = function (G, h, e, dm) {
    if (!G.evo || !G.evo.done || h.id !== 'wukong' || e.dead) return;
    var bs = e.def.boss ? 0.5 : 1;
    e.slowT = Math.max(e.slowT, V.EVO_SLOW_T); e.slowF = Math.max(e.slowF, V.EVO_SLOW * bs);
    e.burnT = Math.max(e.burnT, V.EVO_BURN_T); e.burnDps = Math.max(e.burnDps, dm * V.EVO_BURN_K);
  };
  B.evoRange = function (G, h, r) { return (G.evo && G.evo.done && h.id === 'wukong') ? r * V.EVO_RANGE : r; };
})();
