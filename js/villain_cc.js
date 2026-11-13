/* ============================================================
 * villain_cc.js —— v0.9 英雄受控状态（design §13）：减速 / 眩晕 / 持续伤害，带上限和递减，只在洞府（G.lair）里生效。
 *  XY.heroCC = { slow(G,h,f,t), stun(G,h,t), dot(G,h,src,dps,t,kind), tick(G,h,dt), spdMul(h), clampHit(G,h,dmg), stateOf(h) }
 *  规则：减速 ≤50%、≤3 秒、取最大、不影响攻速；眩晕 ≤1.5 秒，8 秒窗口内递减 全额/×0.5/×0.25，之后 4 秒免疫，每次眩晕后 0.5 秒免疫，免疫时减速减半；
 *       持续伤害每段 ≤6 秒，同源刷新，同时 ≤2 个来源，合计每秒 ≤ 最大血量 10%，永远不致死（留 1 点血）；总移速 ≥50%；单次伤害 ≤ 最大血量 45%；唐僧免疫。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY;
  var CC = XY.heroCC = {
    SLOW_MAX: 0.5, SLOW_T: 3, STUN_MAX: 1.5, DR_WIN: 8, DR_STEP: [1, 0.5, 0.25], IMM_LONG: 4, IMM_AFTER: 0.5, DOT_T: 6, DOT_SRC: 2, DOT_PCT: 0.10, HIT_PCT: 0.45, MIN_SPD: 0.5
  };
  function st(h) { return h.cc || (h.cc = { slowT: 0, slowF: 0, stunT: 0, stunN: 0, winT: 0, immT: 0, afterT: 0, dots: [], hits: 0, stuns: 0, slowAcc: 0, stunAcc: 0, dotAcc: 0 }); }
  CC.stateOf = st;
  function ok(G, h) { return G && G.lair && h && h.id !== 'tang' && !h.down; }
  CC.slow = function (G, h, f, t) {
    if (!ok(G, h)) return false; var s = st(h);
    f = Math.min(CC.SLOW_MAX, f); t = Math.min(CC.SLOW_T, t);
    if (s.immT > 0 || s.afterT > 0) f *= 0.5;
    if (f > s.slowF || s.slowT <= 0) s.slowF = Math.max(s.slowT > 0 ? s.slowF : 0, f);
    s.slowT = Math.max(s.slowT, t); return true;
  };
  CC.stun = function (G, h, t) {
    if (!ok(G, h)) return 0; var s = st(h);
    if (s.immT > 0 || s.afterT > 0) return 0;
    var k = CC.DR_STEP[Math.min(s.stunN, CC.DR_STEP.length - 1)];
    t = Math.min(CC.STUN_MAX, t) * k;
    if (t < 0.05) return 0;
    s.stunT = Math.max(s.stunT, t); s.stuns++; s.stunAcc += t; s.stunN++; s.winT = CC.DR_WIN; s.afterT = t + CC.IMM_AFTER;
    if (s.stunN >= CC.DR_STEP.length) { s.immT = CC.IMM_LONG + t; s.stunN = 0; s.winT = 0; }
    h.dash = null; return t;
  };
  CC.dot = function (G, h, src, dps, t, kind) {
    if (!ok(G, h)) return false; var s = st(h), i, d;
    t = Math.min(CC.DOT_T, t);
    for (i = 0; i < s.dots.length; i++) if (s.dots[i].src === src) { d = s.dots[i]; d.dps = Math.max(d.dps, dps); d.t = Math.max(d.t, t); d.kind = kind || d.kind; return true; }   // 同源刷新
    if (s.dots.length >= CC.DOT_SRC) {                                                      // 最多 2 个来源：弱的被挤掉
      var w = 0; for (i = 1; i < s.dots.length; i++) if (s.dots[i].dps < s.dots[w].dps) w = i;
      if (s.dots[w].dps >= dps) return false; s.dots.splice(w, 1);
    }
    s.dots.push({ src: src, dps: dps, t: t, kind: kind || 'burn' }); return true;
  };
  CC.tick = function (G, h, dt) {
    var s = h.cc; if (!s) return null;
    if (s.stunT > 0) s.stunT -= dt;
    if (s.slowT > 0) { s.slowT -= dt; s.slowAcc += dt; if (s.slowT <= 0) s.slowF = 0; }
    if (s.immT > 0) s.immT -= dt; if (s.afterT > 0) s.afterT -= dt;
    if (s.winT > 0) { s.winT -= dt; if (s.winT <= 0) s.stunN = 0; }
    if (s.dots.length) {
      var tot = 0, i;
      for (i = s.dots.length - 1; i >= 0; i--) { var d = s.dots[i]; d.t -= dt; if (d.t <= 0) { s.dots.splice(i, 1); continue; } tot += d.dps; }
      tot = Math.min(tot, h.maxHp * CC.DOT_PCT);
      var dmg = tot * dt;
      if (dmg > 0 && h.hp > 1) { var real = Math.min(dmg, h.hp - 1); h.hp -= real; s.dotAcc += real; if (G.lair.rep) G.lair.rep.dot = (G.lair.rep.dot || 0) + real; }
    }
    return { stun: s.stunT > 0 };
  };
  CC.spdMul = function (h) { var s = h.cc; if (!s || s.slowT <= 0) return 1; return Math.max(CC.MIN_SPD, 1 - s.slowF); };
  CC.clampHit = function (G, h, dmg) { if (G.lair && h.id !== 'tang') return Math.min(dmg, h.maxHp * CC.HIT_PCT); return dmg; };
  CC.flags = function (h) { var s = h.cc; if (!s) return null; return { slow: s.slowT > 0, stun: s.stunT > 0, burn: s.dots.some(function (d) { return d.kind === 'burn'; }), poison: s.dots.some(function (d) { return d.kind === 'poison'; }), imm: s.immT > 0 }; };
})();
