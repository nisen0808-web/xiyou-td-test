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
    var n = e.phase === 2 ? V.ROCK_N2 : V.ROCK_N, tg = [], i, h, tang = G.heroes[0], protectedTang = XY.bossBarrier(G);
    for (i = 0; i < G.heroes.length; i++) { h = G.heroes[i]; if (h.down || h.dead || h.hp <= 0 || (i === 0 && protectedTang)) continue; var d = XY.dist(h.x, h.y, e.x, e.y); if (d < 760) tg.push({ h: h, d: d }); }
    tg.sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < n; i++) {
      var px, py, base = tg.length ? tg[i % tg.length].h : null;
      if (base && i < tg.length) { px = base.x + (base.vx || 0) * 0.5; py = base.y + (base.vy || 0) * 0.5; }
      else { var a = Math.random() * PI2, rr = 140 + Math.random() * 260; px = (base ? base.x : e.x) + cos(a) * rr * 0.6; py = (base ? base.y : e.y) + sin(a) * rr * 0.6; }
      if (protectedTang && tang && XY.dist(px, py, tang.x, tang.y) < V.ROCK_R + 40) { var ax = px - tang.x, ay = py - tang.y, al = Math.sqrt(ax * ax + ay * ay) || 1; px = tang.x + ax / al * (V.ROCK_R + 40); py = tang.y + ay / al * (V.ROCK_R + 40); }   // 仍有存活护卫时，不直接盖在师父头上
      ws.push({ x: px, y: py, r: V.ROCK_R * (e.phase === 2 ? 1.1 : 1), t: -i * 0.12, max: V.ROCK_T, owner: e, dmg: V.ROCK_DMG, kind: 'rock' });
    }
    G.stats.rockCasts = (G.stats.rockCasts || 0) + 1;
    if (!G._rockToast) { G._rockToast = 1; XY.core.toast(G, e.def.name + '抡起山石！地上的红圈是落点，快躲开'); }
    XY.core.ring(G, e.x, e.y, 70, '#c0392b', 0.35);
  };
  // 自动行走只选择一个目标，位移仍由 updateHeroes 的正常速度上限执行。
  // 能挡住师父的致命来弹时先拦截，再恢复躲岩；不为不相交或不可达的弹闯圈。
  B.steerGoal = function (G, h, goal, speed) {
    if (!h || h.down || h.dead || h.hp <= 0 || h.ridden || h.dash || h.i === G.ctrl || h.id === 'tang') return goal;
    var rocks = [], inside = false, ws = G.warns || [], i, w;
    for (i = 0; i < ws.length; i++) {
      w = ws[i]; var ow = w.owner;
      if (w.kind !== 'rock' || w.t >= w.max || w.t < -0.3 || (ow && (ow.dead || ow.retreatT > 0 || ow.hidden))) continue;
      var rr = w.r + h.def.r + 8;
      rocks.push({ x: w.x, y: w.y, r: rr, left: w.max - w.t });
      if (XY.dist(h.x, h.y, w.x, w.y) < rr) inside = true;
    }
    // 猫叔三种实际攻击均是固定圆；t 是剩余秒数，与落石的递增 t 不同。
    // 只读已出现的预警，保持 advanceAttack 原生伤害/取消/阶段判定。
    var ka = G.dkAttack, ku = G.dkRun && G.dkRun.unit, ke = G.dkUnit;
    var kitty = ka && ke && !ke.dead && ku && !ku.dead && !ku.immune && ku.phase === ka.phase &&
      (ka.kind === 'attack' || ka.kind === 'skill' || ka.kind === 'burst') &&
      isFinite(ka.x) && isFinite(ka.y) && isFinite(ka.r) && ka.r > 0 && isFinite(ka.t) && ka.t >= 0;
    // 远处无关猫圆不能改变既有躲岩；只在当前身体或下一小段路线受它威胁时加入。
    if (kitty) {
      var kr = ka.r + h.def.r + 8, kx = goal.x - h.x, ky = goal.y - h.y, kd = Math.sqrt(kx * kx + ky * ky);
      var ox = h.x - ka.x, oy = h.y - ka.y, threatened = ox * ox + oy * oy < kr * kr;
      if (!threatened && kd > 0.01) {
        var dot = (ox * kx + oy * ky) / kd, disc = dot * dot + kr * kr - ox * ox - oy * oy;
        var enter = disc >= 0 ? -dot - Math.sqrt(disc) : Infinity;
        threatened = enter >= 0 && enter <= Math.min(kd, Math.max(8, speed * 1.15 * 1.6 * 2 * (G.dtStep || C.STEP)));
      }
      kitty = threatened;
    }
    var keeper = kitty && h.order === 'guard' && !G.villain && G.heroes && G.heroes[0];
    if (!(keeper && keeper.id === 'tang' && !keeper.down && !keeper.dead && keeper.hp > 0)) keeper = null;
    var keepRadius = keeper ? Math.max(170, XY.dist(h.x, h.y, keeper.x, keeper.y)) : Infinity;
    if (kitty) {
      rocks.push({ x: ka.x, y: ka.y, r: kr, left: ka.t });
      if (XY.dist(h.x, h.y, ka.x, ka.y) < kr) inside = true;
    }
    // 出圈后仍检查下一段路线，不能立刻朝仍在预警的圈内目标折返。
    // 已在安全边缘时可等落石结束，不给角色添加第二份位移或永久绕行状态。
    if (!inside) {
      var gx = goal.x - h.x, gy = goal.y - h.y, gd = Math.sqrt(gx * gx + gy * gy);
      var look = Math.max(8, speed * 1.15 * 1.6 * 2 * (G.dtStep || C.STEP));
      if (gd > 0.01) for (i = 0; i < rocks.length; i++) {
        var rx = h.x - rocks[i].x, ry = h.y - rocks[i].y, dot = (rx * gx + ry * gy) / gd;
        var disc = dot * dot + rocks[i].r * rocks[i].r - rx * rx - ry * ry;
        if (disc >= 0) {
          var enter = -dot - Math.sqrt(disc);
          if (enter >= 0 && enter <= Math.min(gd, look)) { inside = true; break; }
        }
      }
    }
    if (!inside) return goal;
    var runSpeed = Math.max(1, speed * 1.15 * 1.6), margin = Math.max(0.12, 2 * (G.dtStep || C.STEP));
    function escapeTime(distance, reach) {
      if (reach <= 0) return 0;
      if (reach >= distance - 0.1) return Infinity;
      var dt = G.dtStep > 0 ? G.dtStep : C.STEP, stride = runSpeed * dt, cutoff = runSpeed / 6;
      var capped = Math.max(0, Math.ceil((distance - cutoff) / stride));
      if (reach <= capped * stride) return Math.ceil(reach / stride) * dt;
      var left = distance - capped * stride, ratio = 1 - 6 * dt;
      if (!(ratio > 0 && ratio < 1)) return Infinity;
      // 与实际min(runSpeed,剩余距离*6)逐帧积分一致；高速也不能把末段当匀速。
      var easing = Math.max(0, Math.ceil(Math.log((distance - reach) / left) / Math.log(ratio) - 1e-10));
      return (capped + easing) * dt;
    }
    // Static body clearance only ranks existing rock exits; pursuit and contact stay native.
    var bodies = (G.enemies || []).filter(function (e) {
      return e && !e.dead && !e.hidden && !(e.retreatT > 0) && e.hp > 0 && !(e.def && (e.def.fly || e.def.etower));
    });
    function pathDistance2(x, y, nx, ny, b) {
      var dx = nx - x, dy = ny - y, dd = dx * dx + dy * dy;
      var u = dd > 0 ? Math.max(0, Math.min(1, ((b.x - x) * dx + (b.y - y) * dy) / dd)) : 0;
      var bx = x + dx * u - b.x, by = y + dy * u - b.y;
      return bx * bx + by * by;
    }
    function bodyClear(x, y, p) {
      for (var bi = 0; bi < bodies.length; bi++) {
        var b = bodies[bi], rr = (b.r || 0) + h.def.r;
        var sx = x - b.x, sy = y - b.y, ex = p.x - b.x, ey = p.y - b.y;
        // Starting overlap may escape outward, never deepen or finish inside the body.
        if (ex * ex + ey * ey < rr * rr || pathDistance2(x, y, p.x, p.y, b) < Math.min(sx * sx + sy * sy, rr * rr)) return false;
      }
      return true;
    }
    // 猫圆出口只用当前静态身体做路径检查，不宣称未来移动实体不会撞入。
    // 守护者最多走到距师父170（已在外者不再外扩）；无出口保留原守护风险。
    function kittyExitAllowed(x, y, p) {
      if (!kitty) return true;
      if (keeper && XY.dist(p.x, p.y, keeper.x, keeper.y) > keepRadius + 1e-7) return false;
      if (!bodyClear(x, y, p)) return false;
      for (var hi = 0; hi < (G.heroes || []).length; hi++) {
        var other = G.heroes[hi];
        if (!other || other === h || other.down || other.dead || other.hp <= 0 || other.ridden) continue;
        var rr = h.def.r + other.def.r, sx = x - other.x, sy = y - other.y;
        var ex = p.x - other.x, ey = p.y - other.y;
        if (ex * ex + ey * ey < rr * rr || pathDistance2(x, y, p.x, p.y, other) < Math.min(sx * sx + sy * sy, rr * rr)) return false;
      }
      return true;
    }
    function exitPlan(x, y) {
      var dirs = [], dx = goal.x - x, dy = goal.y - y, dl = Math.sqrt(dx * dx + dy * dy), k, a;
      if (dl > 0.01) dirs.push({ x: dx / dl, y: dy / dl });
      for (k = 0; k < rocks.length; k++) {
        dx = x - rocks[k].x; dy = y - rocks[k].y; dl = Math.sqrt(dx * dx + dy * dy);
        if (dl > 0.01) dirs.push({ x: dx / dl, y: dy / dl });
      }
      for (k = 0; k < 16; k++) { a = k * PI2 / 16; dirs.push({ x: cos(a), y: sin(a) }); }
      var best = null, plans = [];
      for (k = 0; k < dirs.length; k++) {
        var u = dirs[k], distance = 0, slack = Infinity, pass, j;
        // 找一个能离开所有重叠圈的出口，不逐圈叠加额外速度。
        for (pass = 0; pass <= rocks.length; pass++) {
          var changed = false;
          for (j = 0; j < rocks.length; j++) {
            var r = rocks[j], ox = x - r.x, oy = y - r.y;
            var ex = ox + u.x * distance, ey = oy + u.y * distance;
            if (ex * ex + ey * ey >= r.r * r.r) continue;
            var dot = ox * u.x + oy * u.y;
            var exit = -dot + Math.sqrt(Math.max(0, dot * dot + r.r * r.r - ox * ox - oy * oy));
            if (exit + 8 > distance) { distance = exit + 8; changed = true; }
          }
          if (!changed) break;
        }
        for (j = 0; j < rocks.length; j++) {
          var r = rocks[j], ox = x - r.x, oy = y - r.y, dot = ox * u.x + oy * u.y;
          var disc = dot * dot + r.r * r.r - ox * ox - oy * oy;
          if (disc < 0) continue;
          var enter = -dot - Math.sqrt(disc), leave = -dot + Math.sqrt(disc);
          if (leave >= 0 && enter <= distance) slack = Math.min(slack, r.left - escapeTime(distance, Math.min(distance, leave)));
        }
        var nx = x + u.x * distance, ny = y + u.y * distance;
        if (nx < h.def.r || nx > C.WORLD_W - h.def.r || ny < h.def.r || ny > C.WORLD_H - h.def.r) continue;
        var cost = distance + Math.max(0, margin - slack) * runSpeed * 8;
        var p = { x: nx, y: ny, distance: distance, slack: slack, cost: cost };
        if (!kittyExitAllowed(x, y, p)) continue;
        plans.push(p); if (!best || cost < best.cost) best = p;
      }
      if (!best || bodyClear(x, y, best)) return best;
      var safe = null, tang = !G.villain && G.heroes && G.heroes[0];
      if (!(tang && tang.id === 'tang' && !tang.down && !tang.dead && tang.hp > 0)) tang = null;
      var tr = tang ? h.def.r + tang.def.r : 0;
      var oldPath = tang ? pathDistance2(x, y, best.x, best.y, tang) : 0;
      var oldEnd = tang ? (best.x - tang.x) * (best.x - tang.x) + (best.y - tang.y) * (best.y - tang.y) : 0;
      for (k = 0; k < plans.length; k++) {
        var alt = plans[k];
        if (alt.slack < margin || !bodyClear(x, y, alt)) continue;
        if (tang && (pathDistance2(x, y, alt.x, alt.y, tang) < Math.min(oldPath, tr * tr) ||
          (alt.x - tang.x) * (alt.x - tang.x) + (alt.y - tang.y) * (alt.y - tang.y) < Math.min(oldEnd, tr * tr))) continue;
        if (!safe || alt.cost < safe.cost) safe = alt;
      }
      // No timely body-clear exit: preserve the original least-cost risk, not invulnerability.
      return safe || best;
    }
    var q = goal.guardShot;
    if (q && q.life > 0 && G.eprojs.indexOf(q) >= 0) {
      // 按正常每步的距离比例减速预测当前行走意图，不能假设短目标全程匀速。
      // 每帧重算；互推、后续改目标仍可能改变结果，预留至少0.12秒撤离余量。
      var step = G.dtStep > 0 ? G.dtStep : C.STEP, horizon = 0;
      for (i = 0; i < rocks.length; i++) horizon = Math.max(horizon, rocks[i].left);
      horizon = Math.min(q.life, horizon);
      function interceptAlong(moveGoal, until) {
        var hx = h.x, hy = h.y, elapsed = 0, hit = Infinity, safe = true;
        while (elapsed < until) {
          var span = Math.min(step, until - elapsed);
          var dx = moveGoal.x - hx, dy = moveGoal.y - hy, dl = Math.sqrt(dx * dx + dy * dy);
          if (dl > (moveGoal.tracking ? 0.1 : 6)) {
            var walkSpeed = Math.min(speed * 1.15 * (dl > 220 || moveGoal.run ? 1.6 : 1), dl * 6);
            hx += dx / dl * walkSpeed * span; hy += dy / dl * walkSpeed * span;
          }
          var ox = q.x + q.vx * elapsed - hx, oy = q.y + q.vy * elapsed - hy, radius = h.def.r + (q.r || 0);
          var aa = q.vx * q.vx + q.vy * q.vy, bb = ox * q.vx + oy * q.vy, cc = ox * ox + oy * oy - radius * radius;
          var disc = bb * bb - aa * cc, at = cc <= 0 ? 0 : aa > 0 && bb < 0 && disc >= 0 ? (-bb - Math.sqrt(disc)) / aa : Infinity;
          for (var j = 0; j < rocks.length; j++) if (rocks[j].left >= elapsed && rocks[j].left <= elapsed + span &&
            XY.dist(hx, hy, rocks[j].x, rocks[j].y) < rocks[j].r) safe = false;
          if (at >= 0 && at <= span && elapsed + at < q.life) { hit = elapsed + at; break; }
          elapsed += span;
        }
        return { x: hx, y: hy, hit: hit, safe: safe };
      }
      var intercept = interceptAlong(goal, horizon);
      if (intercept.safe && isFinite(intercept.hit)) {
        var escape = exitPlan(intercept.x, intercept.y);
        if (escape && escape.slack > intercept.hit + margin) return goal;
        // 守护者能在落石前、师父中弹前到达挡弹位置时，不因拦截后撤离余量不足就放弃。
        // 既有避岩路线也能挡住同一颗弹，就沿它走，不能白白放弃无伤出口。
        if (isFinite(goal.guardImpact) && intercept.hit + 2 * step < goal.guardImpact) {
          var exit = exitPlan(h.x, h.y);
          if (exit) {
            var exitGoal = Object.assign({}, goal, { x: exit.x, y: exit.y, run: true, tracking: true });
            var exitHit = interceptAlong(exitGoal, Math.min(q.life, goal.guardImpact));
            if (exitHit.safe && exitHit.hit + 2 * step < goal.guardImpact) return exitGoal;
          }
          // 挡弹后的岩伤仍正常结算；弹被消耗后下一帧恢复避险。拦截前会挨岩则仍先避险。
          return goal;
        }
      }
    }
    var plan = exitPlan(h.x, h.y);
    if (!plan) return goal;
    return Object.assign({}, goal, { x: plan.x, y: plan.y, run: true, tracking: true });
  };
  B.update = function (G, dt) {
    var ws = G.warns; if (!ws || !ws.length) return;
    var w = 0, i, j;
    for (i = 0; i < ws.length; i++) {
      var f = ws[i], ow = f.owner;
      if (ow && (ow.dead || ow.retreatT > 0 || ow.hidden)) continue;           // 洞主倒下 / 败退：红圈消失
      f.t += dt;
      if (f.t >= f.max) {
        var dmgR = ow ? ow.dmg / ow.def.dmg : 1;
        XY.core.ring(G, f.x, f.y, f.r, '#a8552a', 0.5, true); G.shake = Math.max(G.shake, 7);
        if (XY.vfx && XY.vfx.land) XY.vfx.land(G, f.x, f.y, f.r);
        // 存活护卫仍保护师父；全倒后按已显示的固定落点命中，阵亡者不再承伤。
        var protectedTang = XY.bossBarrier(G);
        for (j = 0; j < G.heroes.length; j++) { var h = G.heroes[j]; if (h.down || h.dead || h.hp <= 0 || (j === 0 && protectedTang)) continue; if (XY.dist(f.x, f.y, h.x, h.y) < f.r + h.def.r) XY.hurtHeroBy(G, h, f.dmg * dmgR, false, (ow ? ow.def.name : '') + '的落石砸中了', 'phys', 'earth'); }
        var tws = G.towers.slice(); for (j = 0; j < tws.length; j++) { var t = tws[j]; if (XY.dist(f.x, f.y, t.x, t.y) < f.r) XY.hurtTower(G, t, V.ROCK_TOWER * dmgR); }      // 先复制：hurtTower 打死塔会 splice，正向遍历会漏掉紧随其后的塔
        G.stats.rockLands = (G.stats.rockLands || 0) + 1;
        continue;
      }
      ws[w++] = f;
    }
    ws.length = w;
  };
  var fallingStone = null;
  function fallingStoneSprite() {
    var cell = XY.R4 && XY.R4.worldProps && XY.R4.worldProps.cells.denrock;
    var im = cell && cell.image;
    if (!im || !im.complete || im.naturalWidth < 676 || im.naturalHeight < 323) return null;
    if (fallingStone && fallingStone.source === im) return fallingStone;
    // A small stone uses real authored rock ink inside an organic silhouette.
    // Do not shrink the full trees-and-mountains sheet into a flying landscape.
    var cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    var c = cv.getContext('2d');
    c.beginPath(); c.moveTo(16, 84);
    c.bezierCurveTo(14, 69, 25, 56, 29, 43); c.bezierCurveTo(32, 27, 47, 23, 60, 17);
    c.bezierCurveTo(72, 12, 80, 25, 89, 29); c.bezierCurveTo(101, 34, 102, 46, 107, 58);
    c.bezierCurveTo(111, 69, 119, 81, 111, 92); c.bezierCurveTo(106, 102, 88, 106, 76, 110);
    c.bezierCurveTo(61, 114, 51, 108, 37, 107); c.bezierCurveTo(24, 104, 18, 97, 16, 84); c.closePath();
    var face = c.createLinearGradient(22, 20, 105, 110);
    face.addColorStop(0, '#b4b5a6'); face.addColorStop(.5, '#7c8276'); face.addColorStop(1, '#424d43');
    c.fillStyle = face; c.fill(); c.save(); c.clip(); c.globalAlpha = .9;
    c.drawImage(im, 526, 198, 150, 125, 4, 6, 120, 116); c.restore();
    c.strokeStyle = 'rgba(45,52,43,.65)'; c.lineWidth = 2; c.stroke();
    var rgba = c.getImageData(0, 0, 128, 128).data, x0 = 128, y0 = 128, x1 = -1, y1 = -1;
    for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) if (rgba[(y * 128 + x) * 4 + 3] >= 16) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (x1 < x0 || y1 < y0) return null;
    fallingStone = { image: cv, source: im, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    return fallingStone;
  }
  function paintFallingStone(c, x, y, s, k) {
    var stone = fallingStoneSprite(); if (!stone) return;
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(82,78,62,.14)';
    for (var j = 0; j < 3; j++) {
      c.beginPath(); c.ellipse((j % 2 ? 1 : -1) * (2 + j * 1.3), -s * (.9 + j * .4), s * (.13 + j * .04), s * (.24 + j * .04), -.3, 0, PI2); c.fill();
    }
    c.rotate(-.18 + k * .36); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    // Fit the actual alpha bounds to the previous 2s by 1.7s body envelope.
    // This 1.7 multiplier is a spatial height, not a change to warning time.
    c.drawImage(stone.image, stone.x, stone.y, stone.w, stone.h, -s, -s * .9, s * 2, s * 1.7);
    c.restore();
  }
  B.drawWarns = function (c, G, rt) {
    var ws = G.warns; if (!ws) return;
    for (var i = 0; i < ws.length; i++) {
      var f = ws[i]; if (f.t < 0) continue; var k = Math.min(1, f.t / f.max), pul = 0.5 + 0.5 * Math.sin(rt * 14);
      if (XY.inView && !XY.inView(G, f.x, f.y, f.r + 40)) continue;
      c.save();
      XY.R4.dangerCircle(c, f.x, f.y, f.r, k, f.max - f.t, '落石', {owner:f,maxSeconds:f.max});
      // 山石正在落下（越到最后越近，也越大）
      var fy = f.y - (1 - k) * (1 - k) * 260 - 6, s = 14 + 12 * k;
      paintFallingStone(c, f.x, fy, s, k);
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
    XY.core.applyBurn(G, e, dm * V.EVO_BURN_K, V.EVO_BURN_T, h);
  };
  B.evoRange = function (G, h, r) { return (G.evo && G.evo.done && h.id === 'wukong') ? r * V.EVO_RANGE : r; };
})();
