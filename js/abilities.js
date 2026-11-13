/* ============================================================
 * abilities.js —— 洞府出怪 / 出量倍率 / 关口 / 主动辅助技能 / 特性 / 天兵 / 技能图标列表
 * 依赖 game.js 导出的 XY.core（伤害、治疗、特效等内部函数）
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, K = XY.core;
  var rand = XY.rand, clamp = XY.clamp, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt, atan2 = Math.atan2;
  var dist = XY.dist;

  /* ================= 洞府：出怪、倾巢、精英、建妖塔 ================= */
  function den_pos(den, rmin, rmax) {
    var a = rand(0, PI2), r = rand(rmin, rmax);
    return { x: clamp(den.x + cos(a) * r, 30, C.WORLD_W - 30), y: clamp(den.y + sin(a) * r, 30, C.WORLD_H - 30) };
  }

  // 追剿令（v0.4.1）：拖得太久（不管有没有洞府活着）就会有越来越强的精英追兵从远处杀向营地
  function updateHunt(G, dt) {
    if (G.huntT === undefined) G.huntT = G.lv.huntFirst || C.HUNT_FIRST, G.hunts = 0;
    var was = G.huntT; G.huntT -= dt;
    if (G.hunts === 0 && was > 30 && G.huntT <= 30) XY.banner(G, '妖氛越来越浓……身后的追兵就要追上来了（30 秒后）', 4);
    if (G.huntT > 0) return;
    G.huntT = C.HUNT_EVERY; var k = G.hunts++, n = C.HUNT_N + C.HUNT_N_UP * k;
    // v0.5：追兵从唐僧“身后”（路线东边、已经走过的地方）追上来
    var tg = G.heroes[0], R = G.rt;
    for (var j = 0; j < n * 2 && G.enemies.length < C.MAX_ENEMIES; j++) {
      var sb = G.tang.s - rand(C.HUNT_R0, C.HUNT_R1), bp = XY.routeAt(R, Math.max(0, sb)), back = Math.max(0, -sb);
      var x = clamp(bp.x + back + rand(-120, 120), 40, C.WORLD_W - 40), y = clamp(bp.y + rand(-160, 160), 40, C.WORLD_H - 40);
      var h = K.makeEnemy(G, j % 2 === 0 ? 'elite' : 'tank', x, y, null);
      h.toCamp = true; h.hunter = true; h.speed *= C.HUNT_SPD;
      if (j % 2 === 0) { h.hp *= C.HUNT_HP * (1 + C.HUNT_HP_UP * k); h.maxHp = h.hp; h.dmg *= C.HUNT_DMG * (1 + C.HUNT_DMG_UP * k); }
    }
    G.stats.hunts = (G.stats.hunts || 0) + 1;
    XY.banner(G, '追剿令！第 ' + (k + 1) + ' 批追兵从身后（东边）追来（' + n + ' 名精英 + 同数石头怪）—— 久拖不决，只会越来越凶', 4);
  }

  // 路边刷怪点（v0.5）：洞府离西行路远，光靠洞府怪太少。唐僧前方 600–900 路程处，每 ~15 秒冒出 8–14 只（越往后越多、休息时 ×出量倍率）
  function updateRoadside(G, dt) {
    if (G.tang.phase === 'arrived' || G.ending) return;
    G.roadT = (G.roadT === undefined ? 6 : G.roadT) - dt;
    if (G.roadT > 0) return;
    G.roadT = C.ROAD_EVERY * rand(0.8, 1.2) / Math.max(1, G.spawnMul * 0.9);
    var s0 = G.tang.s + rand(C.ROAD_AHEAD0, C.ROAD_AHEAD1); if (s0 > G.rt.total - 80) return;
    var n = Math.round(rand(C.ROAD_N0, C.ROAD_N1) * (1 + 0.15 * Math.min(G.t / 60, 6)) * Math.min(1.6, 0.8 + 0.3 * G.lv.mul) * XY.enrageSpawnMul(G) * (G.villain ? XY.VD.STAGE.cntK : 1));
    var bp = XY.routeAt(G.rt, s0), nx = -Math.sin(bp.a), ny = Math.cos(bp.a);
    for (var j = 0; j < n && G.enemies.length < C.MAX_ENEMIES - 40; j++) {
      var off = rand(-C.ROAD_HALF * 0.9, C.ROAD_HALF * 0.9), al = rand(-90, 90);
      var x = clamp(bp.x + nx * off + Math.cos(bp.a) * al, 40, C.WORLD_W - 40), y = clamp(bp.y + ny * off + Math.sin(bp.a) * al, 40, C.WORLD_H - 40);
      var e = K.makeEnemy(G, j % 5 === 4 ? 'ranged' : (j % 9 === 8 ? 'tank' : 'small'), x, y, null); e.road = true;
    }
    G.stats.roadSpawns = (G.stats.roadSpawns || 0) + n;
  }


  // 密度控制器（v0.5 爽快样板）：以唐僧为中心，按“目标同屏数”把怪从镜头外围补进来（75–85% 脆皮小怪），
  // 每隔一阵来一波浪潮（拉高峰值）。休息守营阶段（围攻）目标更高。目标值：行军 40–60、峰值 120–180；围攻 85–140、峰值 220–300。
  XY.densityTarget = function (G) {
    var min = G.t / 60, rest = G.tang.phase === 'rest', lm = G.lv.mul;
    var base = rest ? C.FLOW_REST : C.FLOW_WALK;
    var n = Math.round(base * Math.min(1.0 + 0.06 * min, 1.45) * (0.9 + 0.1 * lm) * (G.villain ? XY.VD.STAGE.cntK : 1));
    n = Math.min(n, rest ? 28 : 22);
    if (!rest && G.t < 22) n = Math.min(n, 8);
    else if (!rest && G.t < 45) n = Math.min(n, 16);
    return n;
  };
  function updateFlow(G, dt) {
    if (G.tang.phase === 'arrived' || G.ending) return;
    var tg = G.heroes[0], ctrl = G.heroes[G.ctrl] || tg;
    G.flowT = (G.flowT === undefined ? 1.2 : G.flowT) - dt;
    G.surgeT = G.surgeT === undefined ? C.SURGE_FIRST : G.surgeT - dt;
    if (G.flowT > 0) return;
    G.flowT = 0.45;
    var R = C.FLOW_R, i, e, vr = XY.viewRect(G, 0), vis = 0, rest = G.tang.phase === 'rest';
    var foci = [{ x: tg.x, y: tg.y, k: 1, near: 0 }];
    if (!ctrl.down && ctrl !== tg && dist(ctrl.x, ctrl.y, tg.x, tg.y) > R * 0.8) foci.push({ x: ctrl.x, y: ctrl.y, k: 0.8, near: 0 });   // 操控英雄跑远了（去打洞府）：他身边也要有怪可打
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i]; if (e.dead || e.hunter) continue;
      for (var f = 0; f < foci.length; f++) { var dx = e.x - foci[f].x, dy = e.y - foci[f].y; if (dx * dx + dy * dy < R * R) foci[f].near++; }
      if (e.x >= vr.x0 && e.x <= vr.x1 && e.y >= vr.y0 && e.y <= vr.y1) vis++;
    }
    var st = G.stats; st.visSum = (st.visSum || 0) + vis; st.visCnt = (st.visCnt || 0) + 1; if (vis > (st.visMax || 0)) st.visMax = vis;
    if (G.noSpawn) return;
    if (!G._roadWarn && G.t > 7 && !G.tut) { G._roadWarn = 1; XY.banner(G, '妖怪就要从前方涌来，先守在路上', 3.4); }
    var wantBase = XY.densityTarget(G), em = XY.enrageSpawnMul(G), sg = XY.waveSeg(G), surge = false, WV = null;
    var want = Math.round(wantBase * em * (sg ? sg.mul : 1));       // v0.7：休息点备战 / 收尾时怪少，来潮时多一点
    var fp = XY.routeAt(G.rt, Math.min(G.rt.total, G.tang.s + 500)), fa = Math.atan2(fp.y - tg.y, fp.x - tg.x);
    if (C.WAVE_PLAN) { WV = XY.waveTick(G, wantBase, fa); surge = !!WV; if (surge) st.surges = (st.surges || 0) + 1; }      // v0.7：妖潮先排日程、先预告，到点按预告的方向 / 怪种 / 数量来
    else if (G.surgeT <= 0) { G.surgeT = C.SURGE_EVERY * rand(0.8, 1.2) * (rest ? 0.75 : 1); surge = true; st.surges = (st.surges || 0) + 1; }
    for (var q0 = 0; q0 < foci.length; q0++) {
      var F = foci[q0], n = WV ? Math.round(WV.n * F.k * em) : (surge ? Math.round(want * F.k * rand(C.SURGE_K0, C.SURGE_K1)) : Math.min(C.FLOW_BATCH, Math.ceil((want * F.k - F.near) * 0.35)));
      for (var j = 0; j < n && G.enemies.length < 36; j++) {
        var a = WV ? (Math.random() < 0.85 ? WV.a + rand(-0.55, 0.55) : rand(0, PI2)) : ((q0 === 0 && Math.random() < 0.6) ? fa + rand(-1.1, 1.1) : rand(0, PI2)), r = rand(R * 0.78, R * 1.08);
        var x = clamp(F.x + cos(a) * r, 40, C.WORLD_W - 40), y = clamp(F.y + sin(a) * r * 0.75, 40, C.WORLD_H - 40);
        var q = Math.random(), type = q < 0.80 ? 'small' : (q < 0.93 ? 'ranged' : 'tank');
        if (WV) { var u = j / n; type = u < WV.comp[0] / WV.n ? 'small' : (u < (WV.comp[0] + WV.comp[1]) / WV.n ? 'ranged' : 'tank'); if (type === 'tank' && WV.sh > 0 && WV.comp[2] > 0 && (u - (WV.comp[0] + WV.comp[1]) / WV.n) / (WV.comp[2] / WV.n) < WV.sh / WV.comp[2]) type = 'shield'; }      // v0.7：盾兵数量在排日程时就定好（预告能照实写）
        if (G.t < 45 && type === 'tank') type = 'small';
        if (type === 'tank' && !WV && G.t >= 100 && Math.random() < 0.5) type = 'shield';        // v0.7b：盾兵混进波里的坦克位
        var en = K.makeEnemy(G, type, x, y, null); en.road = true; en.flow = true; en.xpM = C.FLOW_XP; en.coinM = C.FLOW_COIN; if (rest) en.toCamp = true;
      }
      if (WV && WV.air && q0 === 0) XY.fly.spawnWave(G, WV, F);                                   // v0.8.4：飞妖从天边直接飞来
      if (WV && q0 === 0) for (var ek = 0; ek < WV.elite; ek++) {                                  // 大潮：牛头卫护送
        var ea = WV.a + rand(-0.3, 0.3), er = rand(R * 0.85, R * 1.05);
        var ee = K.makeEnemy(G, 'elite', clamp(F.x + cos(ea) * er, 40, C.WORLD_W - 40), clamp(F.y + sin(ea) * er * 0.75, 40, C.WORLD_H - 40), null); ee.road = true; if (rest) ee.toCamp = true;
      }
    }
    if (WV) { XY.banner(G, WV.name + '来袭！（' + WV.dir + '）', 2.5); if (XY.sfx) XY.sfx('wave'); }
    else     if (surge) XY.banner(G, rest ? '妖潮来袭！' : '前方妖群涌来！', 2);
  }

  function hb0(den) { var b = den.boss; return b && !b.dead ? b : null; }
  // 洞主离开洞口去追唐僧：沿用“出征”状态（raid：不受追出太远回洞限制，朝英雄走），出征时间到了自然回洞
  function reemerge(G, den, why) {
    var b = hb0(den); if (!b || b.retreatT > 0) return;
    b.hidden = false; b.engaged = true; b.raid = G.t + C.RAID_DUR; b.bt = Math.max(b.bt || 0, 1.2); b.bstate = 'idle'; b.stunT = 0;
    den.reemerged = (den.reemerged || 0) + 1; G.stats.reemerges = (G.stats.reemerges || 0) + 1;
    XY.toast(G, den.bossName + ' ' + why + '，杀向唐僧！');
  }

  function rest0(G) { return G.tang.phase === 'rest'; }
  // 妖潮预告用：实际刷出量 = 预告数 × 狂暴倍率 ×（操控英雄离唐僧太远时多出的第二焦点 0.8）；预告按这个倍率显示，免得少报
  XY.waveMulInfo = function (G) {
    var tg = G.heroes[0], ctrl = G.heroes[G.ctrl] || tg, em = XY.enrageSpawnMul(G), far = !ctrl.down && ctrl !== tg && XY.dist(ctrl.x, ctrl.y, tg.x, tg.y) > C.FLOW_R * 0.8;
    return { m: em * (far ? 1.8 : 1), enr: em > 1, far: far };
  };

  XY.updateDens = function (G, dt) {
    var i, e, cnt = G.denCnt, min = G.t / 60, em = XY.enrageSpawnMul(G);       // em：有 BOSS 狂暴时小怪出量 ×2
    G.enrageMul = em;
    if (!G.noSpawn) { if (!G.dungeon) updateHunt(G, dt); updateRoadside(G, dt); updateFlow(G, dt); }      // G.noSpawn：测试开关，关掉一切刷怪（洞府 / 路边 / 追剿）
    for (i = 0; i < cnt.length; i++) cnt[i] = 0;
    for (i = 0; i < G.enemies.length; i++) {
      e = G.enemies[i];
      if (!e.dead && e.den != null && !e.def.denBoss && !e.def.etower) cnt[e.den]++;
    }
    var tg0 = G.heroes[0];
    G.dens.forEach(function (den) {
      if (den.closedT > 0) { den.closedT -= dt; if (den.closedT <= 0) reemerge(G, den, '伤愈出洞'); return; }                 // 洞主败退后：暂时闭门；闭门结束 = 洞主主动出洞（修复：以前只会蹲在洞口等英雄走近，狂暴倒计时却照走）
      if (den.beaten && hb0(den) && !hb0(den).engaged && !(hb0(den).retreatT > 0) && !hb0(den).hidden) {   // 看门狗：败退过的洞主回到洞口后，没人去引它，等 REEMERGE_IDLE 秒也要自己再出来一次
        den.idleT = (den.idleT || 0) + dt; if (den.idleT >= C.REEMERGE_IDLE) { den.idleT = 0; reemerge(G, den, '憋不住了，出洞'); }
      } else den.idleT = 0;
      var hb = den.boss;                                                    // 洞主躲在洞里（败退过、还活着、没出来）：洞府不出怪，等英雄靠近把他引出来
      if (den.beaten && hb && !hb.dead && (hb.hidden || hb.retreatT > 0 || (!hb.engaged && hb.home && dist(hb.x, hb.y, hb.home.x, hb.home.y) < 60))) return;
      if (dist(den.x, den.y, tg0.x, tg0.y) > C.DEN_ACTIVE) return;        // 唐僧走远了：洞府安静下来
      if (G.noSpawn) return;
      var bs = den.boss;                                                    // 引出洞主：BOSS 已被引到离洞口 DEN_DRAW_R 以外 → 洞里暂停一切刷怪，让你在外面单挑
      den.drawn = !!(bs && !bs.dead && bs.engaged && bs.home && !(bs.retreatT > 0) && dist(bs.x, bs.y, bs.home.x, bs.home.y) > C.DEN_DRAW_R);
      if (den.drawn) { if (!den._drawToast) { den._drawToast = true; XY.toast(G, den.name + ' 的洞主被引出洞了，洞里暂停出怪——在外面解决他！'); } return; }
      den._drawToast = false;
      den.cnt = cnt[den.i];
      // 稳定出怪：速率 × 全局出量倍率 M
      den.acc += den.rate * G.spawnMul * C.SPAWN_MUL * C.DEN_RATE_MUL * em * dt;
      while (den.acc >= 1) {
        den.acc -= 1;
        if (G.enemies.length >= C.MAX_ENEMIES || cnt[den.i] >= C.DEN_CAP * em) { den.acc = Math.min(den.acc, 1); break; }
        var p = den_pos(den, 60, 170);
        K.makeEnemy(G, K.pickType(G.t), p.x, p.y, den.i); cnt[den.i]++;
      }
      // 倾巢而出
      den.swarmT -= dt;
      if (den.swarmT <= 0) {
        den.swarmT = C.DEN_SWARM_EVERY;
        var n = Math.round((12 + 3 * min) * G.lv.mul * C.SWARM_MUL * em), spawned = 0;
        for (var k = 0; k < n && G.enemies.length < C.MAX_ENEMIES && cnt[den.i] < C.DEN_CAP * em; k++) {
          var q = den_pos(den, 80, 220);
          K.makeEnemy(G, (k % 5 === 0 && G.t > 120) ? 'tank' : 'small', q.x, q.y, den.i); cnt[den.i]++; spawned++;
        }
        if (spawned) XY.toast(G, den.name + ' 的妖怪倾巢而出！');
      }
      // 精英
      den.eliteT -= dt;
      if (den.eliteT <= 0) {
        den.eliteT = C.DEN_ELITE_EVERY;
        var ne = 1 + Math.floor(min / 3);
        for (var j = 0; j < ne && G.enemies.length < C.MAX_ENEMIES; j++) { var pe = den_pos(den, 80, 160); K.makeEnemy(G, 'elite', pe.x, pe.y, den.i); }
        XY.toast(G, den.name + ' 派出了精英牛头卫 ×' + ne);
      }
      // 妖王出征（v0.4.1）：放任不管，BOSS 会带着精英亲自杀向营地；每出征一次洞府出怪更快
      den.raidT -= dt;
      if (den.raidT <= 0 && den.boss && !den.boss.dead && !(den.boss.retreatT > 0) && dist(den.x, den.y, tg0.x, tg0.y) < C.DEN_ACTIVE * 0.75) {
        var rb = den.boss;
        if (rb.engaged && !(rb.raid > G.t)) den.raidT = 25;                     // 英雄正在洞口缠斗它：晚点再说
        else {
          den.raidT = C.RAID_EVERY; den.raids++; den.rate *= 1 + C.RAID_RATE_UP;
          rb.raid = G.t + C.RAID_DUR; rb.engaged = true; rb.bt = Math.max(rb.bt, 1.2);
          rb.maxHp *= 1 + C.RAID_RAGE_HP; rb.hp = rb.maxHp; rb.baseHp *= 1 + C.RAID_RAGE_HP; rb.raidDmg = (rb.raidDmg || 1) * (1 + C.RAID_RAGE_DMG);
          var sn = Math.round((12 + 3 * min) * G.lv.mul * C.RAID_SWARM);
          for (var q3 = 0; q3 < sn && G.enemies.length < C.MAX_ENEMIES && cnt[den.i] < C.DEN_CAP; q3++) { var ps = den_pos(den, 90, 240); K.makeEnemy(G, (q3 % 5 === 0 && G.t > 120) ? 'tank' : 'small', ps.x, ps.y, den.i); cnt[den.i]++; }
          var esc = 1 + 2 * den.raids;
          for (var q2 = 0; q2 < esc && G.enemies.length < C.MAX_ENEMIES; q2++) { var pr = den_pos(den, 90, 180); K.makeEnemy(G, 'elite', pr.x, pr.y, den.i); }
          G.stats.raids = (G.stats.raids || 0) + 1;
          XY.banner(G, den.bossName + ' 率众出征，杀向唐僧！（第 ' + den.raids + ' 次，该洞府出怪 +' + Math.round(C.RAID_RATE_UP * 100) + '%）', 4);
        }
      }
      // 妖塔：洞府在外围建塔（有上限）
      den.towerT -= dt;
      if (den.towerT <= 0) {
        den.towerT = C.ETOWER_EVERY;
        if (den.towers < C.ETOWER_CAP) {
          var tp = null, tries = 0;
          while (tries++ < 12) {
            var cand = den_pos(den, 230, 420), ok = dist(cand.x, cand.y, tg0.x, tg0.y) > 500;
            for (var m = 0; m < G.enemies.length && ok; m++) { var o = G.enemies[m]; if (o.def.etower && !o.dead && dist(o.x, o.y, cand.x, cand.y) < 120) ok = false; }
            if (ok) { tp = cand; break; }
          }
          if (tp) {
            K.makeEnemy(G, 'etower', tp.x, tp.y, den.i); den.towers++; G.stats.etBuilt++;
            ring_(G, tp.x, tp.y, 70, '#8a5fc0');
            XY.toast(G, den.name + ' 在外围建起了妖塔！');
          }
        }
      }
    });
  };
  function ring_(G, x, y, r, c) { K.ring(G, x, y, r, c, 0.5); }

  /* ================= 出量倍率 M：驻守涨、不驻守降 ================= */
  XY.updateVolume = function (G, dt) {
    if (G.ending) return;
    if (G.station) { G.spawnMul = Math.min(C.VOL_MAX, G.spawnMul + C.VOL_UP / 60 * dt); G.volDir = 1; G.stats.stationSec += dt; }
    else if (G.spawnMul > C.VOL_MIN) { G.spawnMul = Math.max(C.VOL_MIN, G.spawnMul - C.VOL_DOWN / 60 * dt); G.volDir = -1; }
    else G.volDir = 0;
    if (G.spawnMul > G.stats.maxVol) G.stats.maxVol = G.spawnMul;
    if (G.camp.active && G.camp.hp < G.camp.maxHp * 0.4) G.stats.campLow = true;
  };

  /* ================= 关口：唐僧走到才算过关（主线也必须完成） ================= */
  XY.updateGate = function (G, dt) {
    var g = G.gate, t = G.heroes[0];
    if (g.openT > 0) g.openT -= dt;
    if (g.hintT > 0) g.hintT -= dt;
    if (G.ending || t.down) { g.near = false; return; }
    g.near = dist(t.x, t.y, g.x, g.y) <= g.r;
    if (!g.near) return;
    if (XY.quests.mainDone(G)) {
      XY.quests.finalize(G);
      t.inv = Math.max(t.inv, 4);
      G.ending = { kind: 'win', cause: 'gate', t: 2.4 };
      XY.banner(G, '唐僧抵达「' + g.name + '」，过关！', 3);
    } else if (g.hintT <= 0) {
      g.hintT = 4;
      XY.toast(G, '主线未完成：' + G.lv.main.text + '，关口封印未解');
    }
  };

  /* ================= 主动辅助技能（脉冲，每个都有 CD） ================= */
  function enemiesNear(G, x, y, r) { var n = 0; G.grid.query(x, y, r, function () { n++; }); return n; }
  var SUP_COND = {
    vital: function (G, h) { return h.hp < h.maxHp * 0.85; },
    fire: function (G, h) { return enemiesNear(G, h.x, h.y, 240) >= 1; },
    chill: function (G, h) { return enemiesNear(G, h.x, h.y, 240) >= 1; },
    leech: function (G, h) {
      for (var i = 1; i < G.heroes.length; i++) { var o = G.heroes[i]; if (!o.down && o.hp < o.maxHp * 0.85 && dist(o.x, o.y, h.x, h.y) < 220) return true; }
      return false;
    },
    boom: function (G, h) { return enemiesNear(G, h.x, h.y, 320) >= 1; },
    swift: function (G, h) { return h.moving && h.boostT <= 0; }
  };
  var SP_COND = {
    tang: function (G, h) { return G.camp.active && G.camp.hp < G.camp.maxHp * 0.9; },
    wukong: function (G, h) { return enemiesNear(G, h.x, h.y, 150) >= 1; },
    bajie: function (G, h) { return h.hp < h.maxHp * 0.8; },
    wujing: function (G, h) { return enemiesNear(G, h.x, h.y, 160) >= 3 || h.hp < h.maxHp * 0.6; },
    horse: function (G, h) { return enemiesNear(G, h.x, h.y, 380) >= 2; }
  };

  function fireSup(G, h, id, lv) {                              // v0.7：包一层（元素风格 + 起手符阵）
    if (XY.vfx) { XY.vfx.cur = h; XY.vfx.cast(G, h, 'sup'); }
    fireSup0(G, h, id, lv);
    if (XY.vfx) XY.vfx.cur = null;
  }
  function fireSup0(G, h, id, lv) {
    var m = h.mod, i, o;
    if (/^s[123]$/.test(id)) { XY.spsupFire(G, h, id, lv); return; }
    switch (id) {
      case 'vital': K.healHero(G, h, h.maxHp * 0.15, true); K.ring(G, h.x, h.y, 40, '#3f9d5a', 0.4, true); break;
      case 'fire':
        K.ring(G, h.x, h.y, 240, '#e0642b', 0.45, true);
        G.grid.query(h.x, h.y, 240, function (e) { e.burnT = 4; e.burnDps = e.def.boss ? m.burn : Math.max(e.burnDps || 0, m.burn); });
        break;
      case 'chill':
        K.ring(G, h.x, h.y, 240, '#4aa3d6', 0.45, true);
        G.grid.query(h.x, h.y, 240, function (e) { e.slowT = Math.max(e.slowT, 3); e.slowF = Math.max(e.slowF, m.slowF * (e.def.boss ? 0.5 : 1)); });
        break;
      case 'leech':
        K.ring(G, h.x, h.y, 220, '#d9a21a', 0.5, true);
        for (i = 1; i < G.heroes.length; i++) { o = G.heroes[i]; if (!o.down && dist(o.x, o.y, h.x, h.y) < 220) K.healHero(G, o, o.maxHp * m.leech, true); }
        break;
      case 'boom':
        var list = [];
        G.grid.query(h.x, h.y, 420, function (e) { list.push(e); });
        for (i = 0; i < m.boomN && list.length; i++) {
          var e0 = list.splice(Math.floor(Math.random() * list.length), 1)[0], dm = m.boomDmg * G.P.dmg;
          K.ring(G, e0.x, e0.y, 75, '#ff9a3c', 0.3, true);
          G.grid.query(e0.x, e0.y, 75, function (t) { K.hurtEnemy(G, t, dm, { dot: true, type: 'magic', elem: 'fire' }); });
        }
        break;
      case 'swift': h.boostT = 3; K.ring(G, h.x, h.y, 36, '#6a7fd6', 0.4); break;
      case 'sp': fireSp(G, h, lv); break;
    }
  }
  function fireSp(G, h, lv) {
    var i;
    switch (h.id) {
      case 'tang': G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + [0, 200, 350, 500][lv]); K.ring(G, G.camp.x, G.camp.y, 120, '#d9a21a', 0.6, true); XY.toast(G, '镇营：营地回血'); break;
      case 'wukong':
        K.ring(G, h.x, h.y, 150, '#ef8a3c', 0.35, true);
        G.grid.query(h.x, h.y, 150, function (e) { K.hurtEnemy(G, e, K.heroDmg(G, h, 60 + 15 * lv), { src: h, kb: 260, fx: h.x, fy: h.y, crit: G._crit }); });
        break;
      case 'bajie': K.healHero(G, h, h.maxHp * 0.2, true); K.ring(G, h.x, h.y, 40, '#f28fb0', 0.4, true); break;
      case 'wujing': h.inv = Math.max(h.inv, 1.5); K.ring(G, h.x, h.y, 42, '#4f86c6', 0.5, true); break;
      case 'horse':
        var tg = G.grid.nearest(h.x, h.y, 420), base = tg ? atan2(tg.y - h.y, tg.x - h.x) : h.face || 0, n = 12;
        for (i = 0; i < n; i++) {
          var a = base + (i - (n - 1) / 2) * 0.1;
          G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 480, vy: sin(a) * 480, dmg: K.heroDmg(G, h, 14 * (1 + 0.2 * lv)), crit: G._crit, r: 7, life: 0.9, pierce: 2, hits: [], kind: 'water', src: h });
        }
        break;
    }
  }
  var SUP_IDS = ['vital', 'fire', 'chill', 'leech', 'boom', 'swift', 'sp', 's1', 's2', 's3'];

  XY.updateAbilities = function (G, dt) {
    var i, j, h;
    XY.spsupGlobal(G, dt);
    for (i = 0; i < G.heroes.length; i++) {
      h = G.heroes[i]; if (h.down) continue;
      if (h.ringT > 0) specialRing(G, h, dt);
      XY.spsupTick(G, h, dt);
      for (j = 0; j < SUP_IDS.length; j++) {
        var id = SUP_IDS[j], lv = XY.skLv(h, id);
        if (lv <= 0) continue;
        var def = XY.supDef(h.id, id); if (!def) continue;
        if (h.scd[id] > 0) h.scd[id] -= dt;
        if (!(h.scd[id] > 0)) {
          var cond = id === 'sp' ? SP_COND[h.id] : (/^s[123]$/.test(id) ? function (G2, h2) { return XY.spsupCond(G2, h2, id); } : SUP_COND[id]);
          if (cond && cond(G, h)) { fireSup(G, h, id, lv); h.scd[id] = def.cd[lv - 1]; }
          else h.scd[id] = 0;
        }
      }
    }
  };


  /* ================= 常驻特殊角色：5 种玩法原型（具体人物的数值 / 名字在 specials.js）================= */
  function smul(h) { return (h.def.statMul || 1); }
  function sdmg(G, h, base) { return K.heroDmg(G, h, base * smul(h)); }
  function topEnemies(G, x, y, r, n, bossFirst) {
    var l = [];
    G.grid.query(x, y, r, function (e) { if (!e.def.etower || true) l.push(e); });
    l.sort(function (a, b) { return (bossFirst ? (b.def.boss ? 1 : 0) - (a.def.boss ? 1 : 0) : 0) || b.hp - a.hp; });
    return l.slice(0, n);
  }
  function chainFx(G, pts, color) { G.fx.push({ type: 'chain', pts: pts, t: 0, max: 0.28, color: color }); }
  var SP_ATK = {
    dash: function (G, h) {                     // 飞环：物理 / 法术交替，穿透
      var tgt = G.grid.nearest(h.x, h.y, 400); if (!tgt) return false;
      var a = atan2(tgt.y - h.y, tgt.x - h.x), mg = (h.spT++ % 2) === 1;
      h.face = a;
      G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 420, vy: sin(a) * 420, dmg: sdmg(G, h, 22), crit: G._crit, r: 11, life: 0.8, pierce: 4, hits: [], kind: 'ring', src: h, dtype: mg ? 'magic' : 'phys', elem: h.def.elem, col: h.def.color });
      return 0.55;
    },
    heal: function (G, h) {                     // 水 / 藤箭：法术，同时给身边最缺血的队友回血
      var tgt = G.grid.nearest(h.x, h.y, 380);
      var low = null, i, o;
      for (i = 1; i < G.heroes.length; i++) { o = G.heroes[i]; if (o.down || o.hp >= o.maxHp || XY.dist(h.x, h.y, o.x, o.y) > 260) continue; if (!low || o.hp / o.maxHp < low.hp / low.maxHp) low = o; }
      if (low) K.healHero(G, low, low.maxHp * 0.035 * smul(h) * (h.mod.healMul || 1), true);
      if (!tgt) return low ? 0.9 : false;
      var a = atan2(tgt.y - h.y, tgt.x - h.x); h.face = a;
      G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 440, vy: sin(a) * 440, dmg: sdmg(G, h, 17), crit: G._crit, r: 8, life: 0.9, pierce: 1, hits: [], kind: 'water', src: h, dtype: 'magic', elem: h.def.elem, col: h.def.color });
      return 0.7;
    },
    mark: function (G, h) {                     // 重箭：远、穿透、高暴击
      var tgt = G.grid.nearest(h.x, h.y, 560); if (!tgt) return false;
      var a = atan2(tgt.y - h.y, tgt.x - h.x), c0 = h.crit; h.face = a;
      h.crit = c0 + 0.22; var d = sdmg(G, h, 36); h.crit = c0;
      G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 720, vy: sin(a) * 720, dmg: d, crit: G._crit, r: 7, life: 0.85, pierce: 3, hits: [], kind: 'arrow', src: h, dtype: 'phys', col: h.def.color, trk: true });
      return 0.85;
    },
    tank: function (G, h) {                     // 砸地：小范围击退
      var tgt = G.grid.nearest(h.x, h.y, 110); if (!tgt) return false;
      h.face = atan2(tgt.y - h.y, tgt.x - h.x);
      K.ring(G, h.x + cos(h.face) * 50, h.y + sin(h.face) * 50, 95, h.def.color, 0.3, true);
      G.shake = Math.max(G.shake, 2);
      G.grid.query(h.x + cos(h.face) * 50, h.y + sin(h.face) * 50, 95, function (e) { K.hurtEnemy(G, e, sdmg(G, h, 26), { src: h, kb: 260, fx: h.x, fy: h.y, crit: G._crit }); });
      return 1.0;
    },
    storm: function (G, h) {                    // 闪电链：4 连
      var t0 = G.grid.nearest(h.x, h.y, 400); if (!t0) return false;
      var hit = [t0], pts = [{ x: h.x, y: h.y - 8 }, { x: t0.x, y: t0.y }], cur = t0, n, k;
      h.face = atan2(t0.y - h.y, t0.x - h.x);
      var chains = 3 + (h.mod.chain || 0);
      for (n = 0; n < chains; n++) {
        var best = null, bd = 190;
        G.grid.query(cur.x, cur.y, 190, function (e) { if (hit.indexOf(e) >= 0) return; var d = XY.dist(cur.x, cur.y, e.x, e.y); if (d < bd) { bd = d; best = e; } });
        if (!best) break; hit.push(best); pts.push({ x: best.x, y: best.y }); cur = best;
      }
      chainFx(G, pts, h.def.color);
      for (k = 0; k < hit.length; k++) K.hurtEnemy(G, hit[k], sdmg(G, h, 21), { src: h, kb: 30, fx: h.x, fy: h.y, crit: G._crit, type: 'magic', elem: h.def.elem });
      return 0.65;
    }
  };
  XY.specialAtk = function (G, h, dt) {
    h.atkT -= dt; if (h.atkT > 0) return;
    var f = (XY.SP12 && XY.SP12.atk[h.id]) || SP_ATK[h.def.arch]; if (!f) return;     // v0.5：每位常驻角色有自己独有的普攻
    var r = f(G, h);
    if (XY.vfx) XY.vfx.muzzle(G, h);
    h.atkT = h.atkMax = (r === false ? 0.05 : r) / (h.atkSpd * G.P.spd * XY.spsupAtkSpd(G, h));
    if (r !== false) XY.spsupAfterAtk(G, h);
  };
  XY.specialWant = function (G, h) {
    if (XY.SP12 && XY.SP12.want) return XY.SP12.want(G, h);
    var c = 0, boss = false, i, o, low = 0;
    var r = h.def.arch === 'mark' ? 600 : (h.def.arch === 'storm' ? 600 : (h.def.arch === 'heal' ? 260 : 280));
    G.grid.query(h.x, h.y, r, function (e) { c++; if (e.def.boss) boss = true; });
    if (h.def.arch === 'heal') {
      for (i = 0; i < G.heroes.length; i++) { o = G.heroes[i]; if (!o.down && o.hp < o.maxHp * 0.55) low++; }
      return low >= 2 || (low >= 1 && c >= 4);
    }
    return c >= 6 || (boss && c >= 1);
  };
  function specialRing(G, h, dt) {
    h.ringT -= dt; h.ringTick = (h.ringTick || 0) - dt;
    if (h.ringTick > 0) return;
    h.ringTick = 0.25;
    var up = h.mod.ultPow * (h.def.ultBonus || 1);
    G.grid.query(h.x, h.y, 105, function (e) {
      K.hurtEnemy(G, e, sdmg(G, h, 24 * up), { src: h, kb: 140, fx: h.x, fy: h.y, crit: G._crit, type: (Math.random() < 0.5 ? 'magic' : 'phys') });
    });
  }
  XY.specialUlt = function (G, h) {
    if (XY.SP12 && XY.SP12.ult[h.id]) { XY.SP12.ult[h.id](G, h); return; }     // v0.5：12 个清屏级大招
    var up = h.mod.ultPow * (h.def.ultBonus || 1), arch = h.def.arch, i, col = h.def.color;
    switch (arch) {
      case 'dash': h.ringT = 5; h.ringTick = 0; K.ring(G, h.x, h.y, 105, col, 0.5, true); break;
      case 'heal':
        G.heroes.forEach(function (o) { if (!o.down && o.id !== 'tang') K.healHero(G, o, o.maxHp * 0.35 * up * (h.mod.healMul || 1), true); });
        G.grid.query(h.x, h.y, 330, function (e) { e.slowT = Math.max(e.slowT, 4); e.slowF = Math.max(e.slowF, e.def.boss ? 0.25 : 0.45); });
        K.ring(G, h.x, h.y, 330, col, 0.7, true); break;
      case 'mark':
        G.grid.query(h.x, h.y, 600, function (e) { e.markT = 8 * (h.mod.markT || 1); });
        K.ring(G, h.x, h.y, 600, col, 0.6, true); break;
      case 'tank':
        G.grid.query(h.x, h.y, 300, function (e) { K.hurtEnemy(G, e, sdmg(G, h, 40 * up), { src: h, kb: 600, fx: h.x, fy: h.y, stun: 3, crit: G._crit }); });
        for (i = 0; i < G.towers.length; i++) { var t = G.towers[i]; if (XY.dist(h.x, h.y, t.x, t.y) <= 420) t.hp = Math.min(XY.towerMaxHp(t), t.hp + XY.towerMaxHp(t) * 0.5); }
        K.ring(G, h.x, h.y, 300, col, 0.6, true); G.shake = Math.max(G.shake, 7); break;
      case 'storm':
        topEnemies(G, h.x, h.y, 700, 5, false).forEach(function (e) {
          G.fx.push({ type: 'bolt', x: e.x, y: e.y, t: 0, max: 0.4, color: col });
          K.hurtEnemy(G, e, sdmg(G, h, 85 * up), { src: h, kb: 80, fx: e.x, fy: e.y - 40, stun: 1, crit: G._crit, type: 'magic', elem: h.def.elem });
        }); break;
    }
  };
  XY.specialTrait = function (G, h, i, a) {
    var tang = G.heroes[0], arch = h.def.arch, col = h.def.color, sm = smul(h);
    switch (arch) {
      case 'dash':
        var inp = G.input, il = Math.sqrt(inp.mx * inp.mx + inp.my * inp.my), dx, dy;
        if (i === G.ctrl && il > 0.01) { dx = inp.mx / il; dy = inp.my / il; } else { dx = cos(h.face); dy = sin(h.face); }
        h.dash = { t: 0.3, dx: dx, dy: dy, speed: 420 / 0.3, id: G.nextId++, dmg: 55 * sm * (h.mod.ultPow || 1), kb: 200, stun: 0.3, col: col };
        h.inv = Math.max(h.inv, 0.6); K.ring(G, h.x, h.y, 50, col, 0.4, true); break;
      case 'heal':
        G.heroes.forEach(function (o) { if (!o.down && o.id !== 'tang') K.healHero(G, o, o.maxHp * 0.30, true); });
        K.ring(G, h.x, h.y, 200, col, 0.6, true); break;
      case 'mark':
        var t1 = topEnemies(G, h.x, h.y, 700, 1, false)[0];
        if (t1) { K.hurtEnemy(G, t1, sdmg(G, h, 150), { src: h, kb: 0, fx: t1.x, fy: t1.y, stun: 3, crit: G._crit }); K.ring(G, t1.x, t1.y, 60, col, 0.5, true); }
        break;
      case 'tank':
        G.heroes.forEach(function (o) { if (!o.down && XY.dist(h.x, h.y, o.x, o.y) <= 300) o.shield = Math.max(o.shield || 0, 5); });
        K.ring(G, h.x, h.y, 300, col, 0.7, true); break;
      case 'storm':
        var t2 = topEnemies(G, h.x, h.y, 800, 1, true)[0];
        if (t2) { G.fx.push({ type: 'bolt', x: t2.x, y: t2.y, t: 0, max: 0.5, color: col }); K.hurtEnemy(G, t2, sdmg(G, h, 160), { src: h, kb: 80, fx: t2.x, fy: t2.y - 40, stun: 1.5, crit: G._crit, type: 'magic', elem: h.def.elem }); }
        break;
    }
  };

  /* ================= 特性（点击触发，每个都有 CD） ================= */
  XY.traitOf = function (h) { return XY.TRAITS[h.id] || (XY.SPECIAL_TRAITS && XY.SPECIAL_TRAITS[h.id]) || null; };
  XY.traitCdOf = function (h) { var tr = XY.traitOf(h); return tr ? tr.cd * ((h.mod && h.mod.traitCd) || 1) * (h.traitCdMul || (h.def && h.def.traitCdMul) || 1) : 0; };
  XY.useTrait = function (G, i) {                              // v0.7：包一层（元素风格）
    var hh = G.heroes[i]; if (XY.vfx) XY.vfx.cur = hh || null;
    var rr = useTrait0(G, i);
    if (XY.vfx) { XY.vfx.cur = null; if (rr && rr.ok !== false && hh) XY.vfx.cast(G, hh, 'sup'); }
    return rr;
  };
  function useTrait0(G, i) {
    if (G.mode !== 'play' || G.ending) return { ok: false, reason: '现在不能用' };
    var h = G.heroes[i], tang = G.heroes[0];
    if (!h) return { ok: false, reason: '没有这个角色' };
    var tr = XY.traitOf(h);
    if (!tr) { XY.toast(G, '唐僧没有特性'); return { ok: false, reason: '唐僧没有特性' }; }
    if (h.down) { XY.toast(G, h.def.name + ' 已阵亡'); return { ok: false, reason: '已阵亡' }; }
    if (tang.down) return { ok: false, reason: '师父已倒下' };
    if (h.traitCd > 0) { XY.toast(G, tr.name + ' 还要 ' + Math.ceil(h.traitCd) + ' 秒'); return { ok: false, reason: 'cd', left: h.traitCd }; }
    var a = rand(0, PI2);
    switch (h.id) {
      case 'wukong':
        K.ring(G, h.x, h.y, 60, '#ffffff', 0.4, true);
        h.x = tang.x + cos(a) * 60; h.y = tang.y + sin(a) * 60;
        h.dash = null; h.pend.length = 0; h.inv = Math.max(h.inv, 0.5);
        K.ring(G, h.x, h.y, 70, '#f6e8c8', 0.5, true); K.spark(G, h.x, h.y, '#ffffff', 14);
        break;
      case 'bajie':
        K.ring(G, h.x, h.y, 50, '#f28fb0', 0.4, true);
        h.x = tang.x + cos(a) * 55; h.y = tang.y + sin(a) * 55; h.dash = null; h.pend.length = 0;
        h.taunt = 4; K.ring(G, h.x, h.y, C.TAUNT_R, '#f28fb0', 0.7); G.shake = Math.max(G.shake, 5);
        break;
      case 'wujing':
        G.zones.push({ x: tang.x, y: tang.y, r: 160, t: 6, max: 6, tick: 0, dmg: 20 * h.dmgMul * G.P.dmg, owner: h, kind: 'sand', follow: true });
        K.ring(G, tang.x, tang.y, 160, '#c9a96b', 0.6, true);
        break;
      case 'horse':
        var rd = h.ridden ? G.heroes[h.rideTgt] : h;          // 龙腾：骑手（没人骑就是自己）5 秒大幅加速，骑手还 3 秒不受伤
        rd.boostT = 5; if (rd !== h) rd.inv = Math.max(rd.inv, 3);
        K.ring(G, rd.x, rd.y, 70, '#6fcfd8', 0.7, true);
        break;
      default:
        if (XY.specialTrait) XY.specialTrait(G, h, i, a);
    }
    h.traitMax = XY.traitCdOf(h); h.traitCd = h.traitMax;
    G.stats.traitUses = (G.stats.traitUses || 0) + 1;
    XY.toast(G, h.def.name + '：' + tr.name + '！');
    return { ok: true };
  };

  /* ================= 天兵 ================= */
  var SKY_N = [5, 7, 9], SKY_LIFE = [40, 50, 60], SKY_DMGM = [1, 1.25, 1.5];
  XY.skyInfo = function (G) {
    var l = Math.min(2, (G.upg && G.upg.p_sky) || 0);
    var sm = XY.solMods ? XY.solMods(G) : { life: 1, dmg: 1 };
    return { n: SKY_N[l] + Math.round(sm.sky || 0) * 2, life: SKY_LIFE[l] * sm.life, dmgM: SKY_DMGM[l] * sm.dmg };
  };
  // mode: 'station'（驻在 x,y，只在 320 内迎战）/ 'follow'（跟着操控英雄护送）
  XY.summonSky = function (G, mode, x, y) {
    if (G.mode !== 'play' || G.ending) return { ok: false, reason: 'mode' };
    if (G.sky.left <= 0) { XY.toast(G, '天兵降临每关只有一次，这关已经用掉了'); return { ok: false, reason: 'used' }; }
    var info = XY.skyInfo(G), c = G.heroes[G.ctrl];
    if (c.down) c = G.heroes[0];
    if (x === undefined) { x = c.x; y = c.y; }          // v0.5：前后由“路线进度”决定，不再由参数决定：在唐僧身后=跟随，在前面=驻守，唐僧走过后加入跟随
    if (x < 40 || y < 40 || x > C.WORLD_W - 40 || y > C.WORLD_H - 40) { XY.toast(G, '这里放不下天兵'); return { ok: false, reason: 'place' }; }   // 放置失败：不消耗次数
    G.sky.left--; G.sky.uses++;
    var n = Math.min(info.n, Math.max(0, C.SKY_MAX - G.allies.length));
    for (var i = 0; i < n; i++) {
      var a = i / info.n * PI2;
      var ua = { x: x + cos(a) * 46, y: y + sin(a) * 46, hp: C.SKY_HP, maxHp: C.SKY_HP, life: info.life, maxLife: info.life, atkT: rand(0, 0.5), mode: 'follow',
        anchor: null, slot: i / info.n * PI2, def: { r: 12 }, dmgM: info.dmgM, down: false, dead: false, hurtT: 0, born: 0.6 };
      XY.soldierMode(G, ua); G.allies.push(ua); if (XY.anim) XY.anim.sky(G, ua.x, ua.y, i);
    }
    mode = G.allies.length && G.allies[G.allies.length - 1].mode === 'garrison' ? 'station' : 'follow';
    K.ring(G, x, y, 120, '#9fd0ff', 0.7, true); K.ring(G, x, y, 190, '#ffffff', 0.9); G.shake = Math.max(G.shake, 4);
    XY.banner(G, '天兵降临！' + (mode === 'station' ? '驻守此地，唐僧走过后跟上' : '跟在唐僧身后'), 2);
    if (XY.sfx) XY.sfx('sky');
    return { ok: true, n: n };
  };
  XY.hurtAlly = function (G, a, dmg) {
    if (a.dead) return;
    if (a.absorb > 0) { var ab = Math.min(a.absorb, dmg); a.absorb -= ab; dmg -= ab; }
    if (a.wardUntil > G.t) dmg *= 0.85;
    if (a.dr) dmg *= a.dr;                                  // 亡灵减伤（阴兵 0.8 / 游魂 0.6 / 尸魔 0.7）
    if (dmg <= 0) { a.hurtT = 0.1; return; }
    a.hp -= dmg; a.hurtT = 0.2;
    if (a.hp <= 0) { a.dead = true; K.ring(G, a.x, a.y, 30, '#9fd0ff', 0.4); K.spark(G, a.x, a.y, '#cfe6ff', 6); }
  };
  XY.updateAllies = function (G, dt) {
    if (G.sky.cd > 0) G.sky.cd -= dt;
    var c = G.heroes[G.ctrl], w = 0, i;
    for (i = 0; i < G.allies.length; i++) {
      var a = G.allies[i];
      if (a.dead) continue;
      a.life -= dt; if (a.hurtT > 0) a.hurtT -= dt; if (a.born > 0) a.born -= dt;
      if (a.life <= 0) { K.ring(G, a.x, a.y, 24, '#cfe6ff', 0.4); continue; }
      if (a.decoy) { G.allies[w++] = a; continue; }
      var ab = XY.allyBuff(G, a);
      var ax, ay, leash, vision;
      if (!a.mode || a.rs === undefined) XY.soldierMode(G, a);
      XY.soldierTickMode(G, a);
      if (a.mode === 'garrison' || a.mode === 'station') { ax = a.anchor.x; ay = a.anchor.y; leash = 320; vision = 320; }
      else { var fp = XY.followSpot(G, a.fslot || 0); ax = fp.x; ay = fp.y; leash = 420; vision = 260; }
      var hold = a.mode === 'garrison' || a.mode === 'station';            // 驻守的天兵不能动：只打走到身边的怪，不追击（用户设计：放在前方 → 只能驻守不能动）
      var tgt = G.grid.nearest(a.x, a.y, hold ? 60 + ab.vis : vision + ab.vis);
      if (tgt && dist(tgt.x, tgt.y, ax, ay) > leash) tgt = null;
      var tx, ty, sp = C.SKY_SPEED * (a.spM || 1);
      if (a.slowR) G.grid.query(a.x, a.y, a.slowR, function (e) { e.slowT = Math.max(e.slowT, 0.4); e.slowF = Math.max(e.slowF, e.def.boss ? 0.15 : 0.3); });   // 游魂：身边的怪减速 30%
      var reach = a.rng ? a.rng : (tgt ? a.def.r + tgt.r + 6 : 0);
      if (tgt && hold && dist(a.x, a.y, tgt.x, tgt.y) >= (a.rng ? a.rng : a.def.r + tgt.r + 6)) tgt = null;
      if (tgt) {
        tx = tgt.x; ty = tgt.y;
        var dd = dist(a.x, a.y, tx, ty);
        if (dd < (a.rng || a.def.r + tgt.r + 6)) {
          a.atkT -= dt;
          if (a.atkT <= 0) { a.atkT = 0.8 / ab.hs; K.hurtEnemy(G, tgt, C.SKY_DMG * a.dmgM * ab.dm * G.P.dmg, { type: 'phys', elem: a.animal ? 'wood' : 'metal', src: null, kb: a.kbF || 0, fx: a.x, fy: a.y }); K.spark(G, tgt.x, tgt.y, a.ud ? '#7fe3d0' : '#9fd0ff', 2); if (a.rng) { a.shot = { x: tgt.x, y: tgt.y, t: 0.18 }; K.ring(G, tgt.x, tgt.y, 14, '#7fe3d0', 0.25); } if (XY.vfx) XY.vfx.slash(G, a, tgt); }
          tx = a.x; ty = a.y;
        }
      } else {
        var sl = a.mode === 'follow' ? 70 : 54;
        tx = ax + cos(a.slot) * sl; ty = ay + sin(a.slot) * sl;
      }
      var mx = tx - a.x, my = ty - a.y, ml = sqrt(mx * mx + my * my);
      if (ml > 4) { var st = Math.min(sp * dt * (ml > 300 ? 1.8 : 1), ml); a.x += mx / ml * st; a.y += my / ml * st; }
      G.allies[w++] = a;
    }
    G.allies.length = w;
  };

  /* ================= 技能图标列表（HUD 的径向 CD） ================= */
  XY.skillList = function (G, h) {
    var d = h.def, list = [], i, id, lv;
    var wshort = d.weapon.charAt(0);
    if (h.id === 'tang') {
      list.push({ id: 'main', kind: 'main', name: '佛光经文', short: '经', color: d.color, rem: G.station ? 0 : Math.max(0, h.atkT), max: h.atkMax || 1, off: G.station, tip: '经文：弱远程。驻守营地时不攻击' });
      list.push({ id: 'aura', kind: 'main', name: '佛光', short: '光', color: '#f2c14e', rem: Math.max(0, C.TANG_PULSE - h.pulseT), max: C.TANG_PULSE, tip: '每 ' + C.TANG_PULSE + ' 秒一次脉冲：给范围内队友回血' });
    } else if (h.id === 'wujing') {
      var on = h.beadOn > 0;
      list.push({ id: 'main', kind: 'main', name: d.weapon, short: wshort, color: d.color, rem: on ? 0 : Math.max(0, h.beadRest), max: C.BEAD_REST, active: on, tip: '转 ' + C.BEAD_ON + ' 秒、歇 ' + C.BEAD_REST + ' 秒；转的时候伤害 ×1.4' });
    } else {
      list.push({ id: 'main', kind: 'main', name: d.weapon, short: wshort, color: d.color, rem: Math.max(0, h.atkT), max: h.atkMax || 1, tip: d.wdesc });
    }
    list.push({ id: 'ult', kind: 'ult', name: d.ult, short: '招', color: '#d9534f', rem: Math.max(0, h.ultCd), max: Math.max(1, XY.ultCdOf(G, h)), tip: d.udesc });
    for (i = 0; i < SUP_IDS.length; i++) {
      id = SUP_IDS[i]; lv = XY.skLv(h, id); if (lv <= 0) continue;
      var sd = XY.supDef(h.id, id); if (!sd) continue;
      list.push({ id: id, kind: 'sup', name: sd.name, short: sd.short, color: sd.icon, rem: Math.max(0, h.scd[id] || 0), max: sd.cd[lv - 1], tip: sd.name + ' Lv' + lv });
    }
    return list;
  };
})();
