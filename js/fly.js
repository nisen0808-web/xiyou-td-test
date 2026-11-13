/* ============================================================
 * fly.js —— v0.8.4 会飞的怪：蝠妖（成群俯冲）+ 夜枭（远程扔羽毛）
 *  · 飞妖不被地面挤开、脚下有影子、身体离地；“地面范围”类伤害（钉耙 / 九环锡杖 / 天河 / 流沙 / 炮天兵爆炸）够不着（C.AIR_GROUND_IMMUNE 开关，hurtEnemy 里判 o.ground）
 *  · 蝠妖：巡航 → 瞄准（0.8 秒，落点圈锁定后不再跟踪）→ 俯冲 → 撤回；只有站在落点圈里的人吃伤害（走 hurtHeroBy，避水珠能挡）
 *  · 夜枭：保持距离扔羽毛（慢弹，不打唐僧）
 *  · 唐僧安全：只要还有徒弟活着，飞妖不挑唐僧当目标、俯冲不伤唐僧、羽毛穿过唐僧（同 XY.bossBarrier）
 *  · 画法：矢量水墨剪影（深墨身体 + 淡墨翅膀笔触 + 朱砂眼），与第一关水墨怪同一套墨色，没有新美术
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt, rand = XY.rand;
  var F = XY.fly = {};
  F.LIFT = 20;                                           // 身体离地的像素（影子在脚下）

  F.count = function (G) { var n = 0, i, e; for (i = 0; i < G.enemies.length; i++) { e = G.enemies[i]; if (e.fly && !e.dead) n++; } return n; };

  // 目标：先按普通规则（嘲讽 / 分身 / 就近），但只要徒弟活着，就不选唐僧
  function pickT(G, e) {
    var t = XY.pickTarget(G, e);
    if (t === G.heroes[0] && XY.bossBarrier(G)) {
      var best = null, bd = 1e12, i, h, d;
      for (i = 1; i < G.heroes.length; i++) { h = G.heroes[i]; if (h.down || h.ridden) continue; d = (h.x - e.x) * (h.x - e.x) + (h.y - e.y) * (h.y - e.y); if (d < bd) { bd = d; best = h; } }
      t = best || t;
    }
    return t;
  }
  F.pickT = pickT;

  F.spawn = function (G, type, x, y) {
    if (!C.AIR_ON || F.count(G) >= C.MAX_AIR || G.enemies.length >= C.MAX_ENEMIES) return null;
    var e = XY.makeEnemy(G, type, x, y, null); e.fly = true; e.xpM = C.FLOW_XP; e.coinM = C.FLOW_COIN; e.toCamp = false; e.flow = true; e.air = true;
    e.fs = 'cruise'; e.fsT = 0; e.diveCd = rand(0.5, 2.5); e.lock = null;
    return e;
  };

  /* 一个飞妖的一帧（game.js updateEnemies 里 d.fly 的怪都走这里） */
  F.tick = function (G, e, dt, slow) {
    var d = e.def, th, tx, ty, dx, dy, dist, ux, uy, sp = e.speed;
    e.retarget -= dt;
    if (e.retarget <= 0) { e.retarget = 0.35 + Math.random() * 0.2; e.th = pickT(G, e); }
    if (e.th && (e.th.down || e.th.dead || (e.th === G.heroes[0] && XY.bossBarrier(G)))) e.th = null;
    th = e.th; if (!th && G.camp.active) th = G.camp;
    if (!th) th = pickT(G, e) || G.heroes[0];
    if (!th) return;                                                           // 全员倒下 / 没有目标：这一帧不动（探针曾因此抛异常）
    tx = th.x; ty = th.y; dx = tx - e.x; dy = ty - e.y; dist = sqrt(dx * dx + dy * dy) || 1; ux = dx / dist; uy = dy / dist;
    var mx = 0, my = 0;
    e.diveCd -= dt;
    if (d.dive) {                                                              // —— 蝠妖 ——
      var D = d.dive;
      if (e.fs === 'cruise') {
        if (dist > 150) { mx = ux; my = uy; } else { var tg = e.wob * 1.7 + G.t * 1.3; mx = cos(tg) * 0.6 - ux * 0.1; my = sin(tg) * 0.6 - uy * 0.1; }   // 近了就在目标上空盘旋
        if (e.diveCd <= 0 && dist < 260 && dist > 140 && e.stunT <= 0) { e.fs = 'aim'; e.fsT = D.aim; e.lock = { x: tx, y: ty }; e.lockTh = th; if (XY.sfx) XY.sfx('wave_warn'); }
      } else if (e.fs === 'aim') {
        e.fsT -= dt * (e.stunT > 0 ? 0 : 1); mx = sin(G.t * 9 + e.wob) * 0.25; my = cos(G.t * 7 + e.wob) * 0.25;
        if (e.fsT <= 0) { e.fs = 'dive'; e.fsT = 1.1; }
      } else if (e.fs === 'dive') {
        var lx = e.lock.x - e.x, ly = e.lock.y - e.y, ld = sqrt(lx * lx + ly * ly) || 1, step = D.spd * dt * (e.stunT > 0 ? 0 : 1);
        e.fsT -= dt;
        if (ld <= step + 4 || e.fsT <= 0) { e.x = e.lock.x; e.y = e.lock.y; dive(G, e); e.fs = 'recover'; e.fsT = D.rest; }
        else { e.x += lx / ld * step; e.y += ly / ld * step; }
        mx = my = 0; sp = 0;
      } else if (e.fs === 'recover') {
        e.fsT -= dt; mx = -ux * 0.4 + sin(G.t * 3 + e.wob) * 0.3; my = -uy * 0.4 + cos(G.t * 3 + e.wob) * 0.3;
        if (e.fsT <= 0) { e.fs = 'cruise'; e.diveCd = rand(D.cd[0], D.cd[1]); e.lock = null; }
      }
    } else {                                                                   // —— 夜枭 ——
      if (dist > d.keep) { mx = ux; my = uy; } else if (dist < d.keep * 0.7) { mx = -ux * 0.8; my = -uy * 0.8; }
      else { mx = -uy * 0.35; my = ux * 0.35; }                                // 到位了绕着目标慢慢转
      if (e.stunT <= 0 && dist < d.range) {
        e.shootT -= dt;
        if (e.shootT <= 0) { e.shootT = 3.0 + Math.random() * 0.6; G.eprojs.push({ x: e.x, y: e.y - F.LIFT, vx: ux * 150, vy: uy * 150, dmg: e.dmg, r: 7, life: (d.range + 40) / 150 + 0.5, dt: d.dtype, el: e.elem, noTang: true, feather: true }); }
      }
    }
    var spd = sp * slow;
    e.x += mx * spd * dt + e.kx * dt; e.y += my * spd * dt + e.ky * dt;
    var kd = Math.exp(-8 * dt); e.kx *= kd; e.ky *= kd;
    e.x = XY.clamp(e.x, 10, C.WORLD_W - 10); e.y = XY.clamp(e.y, 10, C.WORLD_H - 10);
  };

  // 俯冲落地：圈里的英雄 / 天兵 / 营地吃一下（唐僧在徒弟活着时不吃）
  function dive(G, e) {
    var D = e.def.dive, R = C.AIR_DIVE_R, x = e.x, y = e.y, dmg = e.dmg * D.mul, hit = false, i, h;
    XY.core.ring(G, x, y, R, '#d23a2a', 0.35, true); G.shake = Math.max(G.shake, 1.5);
    for (i = 0; i < G.heroes.length; i++) {
      h = G.heroes[i]; if (h.down || h.ridden) continue;
      if (i === 0 && XY.bossBarrier(G)) continue;
      if (XY.dist(h.x, h.y, x, y) < R + 4) { XY.hurtHeroBy(G, h, dmg, false, undefined, e.def.dtype, e.elem); hit = true; }
    }
    var sol = XY.soldiersOf(G);
    for (i = 0; i < sol.length; i++) { var a = sol[i]; if (XY.dist(a.x, a.y, x, y) < R + 4) { XY.hurtSoldier(G, a, dmg * (a.type ? 0.8 : 1)); hit = true; } }
    if (G.camp.active && XY.dist(G.camp.x, G.camp.y, x, y) < R + G.camp.r * 0.6) { XY.core.hurtCamp(G, dmg * 0.3); hit = true; }
    G.stats.airDives = (G.stats.airDives || 0) + 1; if (hit) G.stats.airHits = (G.stats.airHits || 0) + 1;
  }

  /* ---------- 波次里的飞妖 ---------- */
  // 排日程时调用：这一波带多少飞妖（预告能照实写）。rest = 休息点夜潮；idx = 第几波（0..5）；south = 南线行军
  F.plan = function (G, rest, idx, big) {
    if (!C.AIR_ON || G.noAir || !G.lv || !G.lv.air) return null;
    var night = rest ? Math.floor(idx / 2) : -1, bat = 0, owl = 0, A = C.AIR_PLAN;
    if (rest) { if (night >= 1) bat = Math.round(rand(A.bat[night - 1][0], A.bat[night - 1][1])); if (night >= 2) owl = Math.round(rand(A.owl[0], A.owl[1])); }
    else if (G.tang.rests > 0) { var s = G.routeChoice === 'S' ? 2 : 1; bat = Math.round(rand(A.march[0], A.march[1]) * s); owl = G.routeChoice === 'S' ? Math.round(rand(A.marchOwl[0], A.marchOwl[1])) : 0; }
    if (G.dungeon) { bat = Math.round(rand(A.dng[0], A.dng[1])); owl = rand(0, 1) < 0.35 ? 1 : 0; }
    if (big) { bat = Math.round(bat * 1.2); }
    return bat + owl > 0 ? { bat: bat, owl: owl } : null;
  };
  // 刷怪：从屏幕边缘外直接飞来（和这一波同方向）
  F.spawnWave = function (G, WV, F0) {
    var ar = WV.air; if (!ar) return;
    var R = C.FLOW_R, i, a, r, x, y;
    for (i = 0; i < ar.bat + ar.owl; i++) {
      a = WV.a + rand(-0.6, 0.6); r = rand(R * 0.95, R * 1.15);
      x = XY.clamp(F0.x + cos(a) * r, 40, C.WORLD_W - 40); y = XY.clamp(F0.y + sin(a) * r * 0.75, 40, C.WORLD_H - 40);
      if (G.dungeon && G.heroes && G.heroes[0]) { var tx0 = G.heroes[0].x, ty0 = G.heroes[0].y, dx0 = x - tx0, dy0 = y - ty0, dd0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1; if (dd0 < 680) { x = XY.clamp(tx0 + dx0 / dd0 * 680, 40, C.WORLD_W - 40); y = XY.clamp(ty0 + dy0 / dd0 * 680, 40, C.WORLD_H - 40); } }
      F.spawn(G, i < ar.bat ? 'bat' : 'owl', x, y);
    }
  };

  /* ---------- 画：矢量水墨飞妖 ---------- */
  var INK = '#2b2530', INK2 = '#5b4f66', RED = '#c0392b';
  function wing(c, s, flap, k) {                         // 一只翅膀（向 +x 伸出，s=±1 镜像）：三笔淡墨 + 一道深墨边
    c.save(); c.scale(s, 1); c.rotate(-0.15 - flap * 0.7);
    c.fillStyle = INK2; c.globalAlpha *= 0.82;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(k * 0.7, -k * 0.95, k * 1.55, -k * 0.2); c.quadraticCurveTo(k * 1.2, -k * 0.05, k * 1.05, k * 0.28); c.quadraticCurveTo(k * 0.75, k * 0.05, k * 0.45, k * 0.38); c.quadraticCurveTo(k * 0.28, k * 0.2, 0, k * 0.3); c.closePath(); c.fill();
    c.globalAlpha /= 0.82; c.strokeStyle = INK; c.lineWidth = Math.max(1.4, k * 0.14); c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(k * 0.7, -k * 0.95, k * 1.55, -k * 0.2); c.stroke();
    c.lineWidth = Math.max(1, k * 0.08); c.beginPath(); c.moveTo(k * 0.4, -k * 0.2); c.lineTo(k * 1.05, k * 0.28); c.moveTo(k * 0.7, -k * 0.5); c.lineTo(k * 1.2, -k * 0.05); c.stroke();
    c.restore();
  }
  function bat(c, x, y, r, rt, ph, tint, sil) {
    var flap = sin(rt * 17 + ph), k = r * 1.05;
    c.save(); c.translate(x, y);
    wing(c, 1, flap, k); wing(c, -1, flap, k);
    c.fillStyle = sil ? '#aaa59a' : (tint || INK); c.strokeStyle = INK; c.lineWidth = Math.max(1.3, r * 0.14);
    c.beginPath(); c.ellipse(0, 0.05 * r, r * 0.55, r * 0.72, 0, 0, PI2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-r * 0.4, -r * 0.55); c.lineTo(-r * 0.3, -r * 1.15); c.lineTo(-r * 0.05, -r * 0.62); c.moveTo(r * 0.4, -r * 0.55); c.lineTo(r * 0.3, -r * 1.15); c.lineTo(r * 0.05, -r * 0.62); c.fill(); c.stroke();
    if (!sil) { c.fillStyle = RED; c.beginPath(); c.arc(-r * 0.2, -r * 0.18, r * 0.12, 0, PI2); c.arc(r * 0.2, -r * 0.18, r * 0.12, 0, PI2); c.fill(); }
    c.restore();
  }
  function owl(c, x, y, r, rt, ph, tint, sil, look) {
    var flap = sin(rt * 8 + ph) * 0.8, k = r * 1.0;
    c.save(); c.translate(x, y);
    c.save(); c.translate(0, -r * 0.1); wing(c, 1, flap, k * 1.25); wing(c, -1, flap, k * 1.25); c.restore();
    c.fillStyle = sil ? '#aaa59a' : (tint || '#6f6578'); c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.12);
    c.beginPath(); c.ellipse(0, r * 0.1, r * 0.72, r * 0.95, 0, 0, PI2); c.fill(); c.stroke();
    if (!sil) { c.strokeStyle = INK2; c.lineWidth = Math.max(1, r * 0.09); c.beginPath(); for (var q = -1; q <= 1; q++) { c.moveTo(q * r * 0.3, r * 0.2); c.quadraticCurveTo(q * r * 0.34, r * 0.55, q * r * 0.22, r * 0.85); } c.stroke(); }
    c.fillStyle = sil ? '#aaa59a' : '#6f6578'; c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.12);
    c.beginPath(); c.moveTo(-r * 0.55, -r * 0.65); c.lineTo(-r * 0.4, -r * 1.2); c.lineTo(-r * 0.08, -r * 0.8); c.moveTo(r * 0.55, -r * 0.65); c.lineTo(r * 0.4, -r * 1.2); c.lineTo(r * 0.08, -r * 0.8); c.fill(); c.stroke();
    if (!sil) {
      c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(-r * 0.28, -r * 0.3, r * 0.26, 0, PI2); c.arc(r * 0.28, -r * 0.3, r * 0.26, 0, PI2); c.fill(); c.stroke();
      c.fillStyle = RED; c.beginPath(); c.arc(-r * 0.28 + look * r * 0.05, -r * 0.3, r * 0.11, 0, PI2); c.arc(r * 0.28 + look * r * 0.05, -r * 0.3, r * 0.11, 0, PI2); c.fill();
      c.fillStyle = '#c9a24a'; c.beginPath(); c.moveTo(-r * 0.1, -r * 0.1); c.lineTo(r * 0.1, -r * 0.1); c.lineTo(0, r * 0.14); c.closePath(); c.fill();
    }
    c.restore();
  }
  // 图鉴 / 小图标：type 'bat' | 'owl'
  F.icon = function (c, type, x, y, r, sil, rt) { if ((type === 'bat' || type === 'owl') && XY.MINK && XY.MINK.flyIcon && XY.MINK.flyIcon(c, type, x, y, r, sil)) return; if (type === 'bat' || type === 'owl') return; if (type === 'bat') bat(c, x, y, r * 1.1, rt || 0, 0, null, sil); else owl(c, x, y + r * 0.1, r * 0.95, rt || 0, 0, null, sil, 1); };

  // 地面层：影子 + 俯冲落点圈（在单位下面画）
  F.drawGround = function (c, G, rt) {
    var i, e, p;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i]; if (!e.fly || e.dead) continue;
      if (e.fs === 'aim' && e.lock) {
        p = 1 - Math.max(0, e.fsT) / e.def.dive.aim; var R = C.AIR_DIVE_R, pu = 0.5 + 0.5 * sin(rt * 14);
        c.fillStyle = 'rgba(214,40,40,' + (0.10 + 0.14 * p) + ')'; c.beginPath(); c.arc(e.lock.x, e.lock.y, R, 0, PI2); c.fill();
        c.strokeStyle = 'rgba(214,40,40,' + (0.55 + 0.35 * pu) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(e.lock.x, e.lock.y, R, 0, PI2); c.stroke();
        c.lineWidth = 2; c.beginPath(); c.arc(e.lock.x, e.lock.y, R * p, 0, PI2); c.stroke();                           // 收缩圈：越接近落下越小
      } else if (e.fs === 'dive' && e.lock) { c.strokeStyle = 'rgba(214,40,40,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(e.lock.x, e.lock.y, C.AIR_DIVE_R, 0, PI2); c.stroke(); }
      c.fillStyle = 'rgba(70,50,60,0.2)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.5, e.r * 0.95, e.r * 0.34, 0, 0, PI2); c.fill();
    }
  };
  // 空中层：飞妖本体（在地面怪上面）
  F.drawAir = function (c, G, rt, inView, bar) {
    var i, e, lift, look;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i]; if (!e.fly || e.dead || !inView(G, e.x, e.y, 60)) continue;
      lift = F.LIFT + (e.fs === 'aim' ? -3 : 0) + sin(rt * 3 + e.wob) * 2; if (e.fs === 'dive') lift = F.LIFT * 0.5;
      look = (e.th ? e.th.x : G.camp.x) > e.x ? 1 : -1;
      c.globalAlpha = e.fs === 'recover' ? 0.8 : 1;
      var sky = !!e.tdSky, flew = !sky && XY.MINK && XY.MINK.fly && XY.MINK.fly(c, e, rt, e.x, e.y - lift, look);
      if (!flew) { if (sky && XY.tdInkFly) XY.tdInkFly(c, e, rt, e.x, e.y - lift); else { var tint = e.flash > 0 ? '#ffffff' : (e.enraged ? '#2a2118' : null); if (e.type === 'owl') owl(c, e, rt, e.x, e.y - lift, e.r * 1.1, rt, e.wob, tint, false, look); else bat(c, e.x, e.y - lift, e.r * 1.15, rt, e.wob, tint, false); } }
      c.globalAlpha = 1;
      if (e.slowT > 0) { c.strokeStyle = 'rgba(42,32,22,0.35)'; c.lineWidth = 1.1; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.7, e.r * 0.45, e.r * 0.16, 0, 0.4, 2.2); c.stroke(); }
      if (e.stunT > 0) { c.fillStyle = '#e0a415'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('★ ★', e.x, e.y - lift - e.r * 1.6); }
      if (e.hp < e.maxHp && !sky) bar(c, e.x - e.r, e.y - lift - e.r * 1.5 - 4, e.r * 2, 4, e.hp / e.maxHp, '#e0533d', 'rgba(255,255,255,0.85)');
    }
  };
})();
