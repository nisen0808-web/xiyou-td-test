/* ============================================================
 * guest.js —— v0.7：「召唤特殊人物」（替换原来的「天兵降临」）
 *   · 从 9 位可见的特殊角色里随机召来 1 位：不是本局选择 / 携带的那一位；隐藏角色永远不在池里
 *   · 召来的那一刻立刻放出 TA 的清屏大招（sp12 / phyrex 里的原版大招 + 全部特效），停留 STAY 秒后离开
 *   · 冷却 CD 秒（技能树「召唤·增援」每级 −10 秒，最低 30 秒）；开局就能用
 *   · 客人不在 G.heroes 里：不参与选人 / 命令 / 受伤，只是一个挂在 G.guest.h 的临时角色
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, K = function () { return XY.core; }, cos = Math.cos, sin = Math.sin;
  C.GUEST = { CD: 60, STAY: 6.5, LV: 5, CD_PER_LV: 10, CD_MIN: 30 };
  var Gs = XY.guest = {};

  Gs.state = function (G) { return G.guest || (G.guest = { cd: 0, h: null, t: 0, max: 0, uses: 0, last: null }); };
  Gs.cdMax = function (G) { return Math.max(C.GUEST.CD_MIN, C.GUEST.CD - C.GUEST.CD_PER_LV * Math.min(2, (G.upg && G.upg.p_sky) || 0)); };
  // 可以被召来的人：9 位可见角色，去掉本局选择 / 携带的那一位
  Gs.pool = function (G) {
    var cur = XY.save.carryId && XY.save.carryId(), sp = G.special;
    return XY.SPECIALS.filter(function (d) { return d.id !== cur && d.id !== sp && !XY.isHidden(d.id); }).map(function (d) { return d.id; });
  };
  function mk(G, id, x, y) {
    var def = XY.specialDef(id, C.GUEST.LV);
    var h = { i: -1, id: def.id, def: def, sp: true, guest: true, x: x, y: y, hp: def.hp, maxHp: def.hp, down: false, inv: 99, order: 'guard', sk: {}, mod: null, ultCd: 0, atkT: 9, atkMax: 1,
      face: 0, wlv: 1, dmgMul: 1, crit: 0, dr: 0, tgt: null, retreat: false, rtT: 0, atkSpd: 1, hurtT: 0, contactT: 0, orbit: 0, pend: [], dash: null, auraT: 0, regenAcc: 0,
      moving: false, auraHeal: 3, bob: 0, scd: {}, traitCd: 0, taunt: 0, boostT: 0, pulseT: 0, beadOn: 3.5, beadRest: 0, dr2: 0, spT: 0, ringT: 0, shieldT: 0 };
    XY.recalcHeroOne(G, h, true);
    return h;
  }
  // 召唤：id 不给就随机。返回 {ok, id, reason}
  Gs.summon = function (G, id) {
    var s = Gs.state(G);
    if (G.mode !== 'play' || G.ending) return { ok: false, reason: 'mode' };
    if (G.villain || G.lair) return { ok: false, reason: 'villain' };       // v0.9 反派关：不召西游特殊人物
    if (s.h) { XY.toast(G, '特殊人物还在场，等 TA 离开'); return { ok: false, reason: 'busy' }; }
    if (s.cd > 0) { XY.toast(G, '召唤冷却中：还要 ' + Math.ceil(s.cd) + ' 秒'); return { ok: false, reason: 'cd' }; }
    var pool = Gs.pool(G); if (!pool.length) { XY.toast(G, '没有可以召唤的特殊人物'); return { ok: false, reason: 'none' }; }
    if (!id || pool.indexOf(id) < 0) id = pool[Math.floor(Math.random() * pool.length)];
    var c = G.heroes[G.ctrl]; if (c.down) c = G.heroes[0];
    var a = XY.rand(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI);
    var x = XY.clamp(c.x + cos(a) * 96, 60, C.WORLD_W - 60), y = XY.clamp(c.y + sin(a) * 64 - 10, 60, C.WORLD_H - 60);
    var h = mk(G, id, x, y), tg = G.grid.nearest(x, y, 600); h.face = tg ? Math.atan2(tg.y - y, tg.x - x) : 0;
    s.h = h; s.t = 0; s.max = C.GUEST.STAY + 1.5 * ((XY.solMods ? XY.solMods(G).sky : 0) || 0); s.cd = Gs.cdMax(G); s.uses++; s.last = id; s.ult = h.def.ult;
    G.sky.uses++; G.stats.guests = (G.stats.guests || 0) + 1;
    if (XY.anim) XY.anim.sky(G, x, y, 0);
    if (XY.specialUlt) XY.specialUlt(G, h);
    if (XY.toast) XY.toast(G, h.def.name + ' · ' + (h.def.ult || ''), 1.6);
    return { ok: true, id: id, h: h };
  };
  Gs.update = function (G, dt) {
    var s = G.guest; if (!s) return;
    if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    if (!s.h) return;
    s.t += dt;
    if (s.t >= s.max) {
      K().ring(G, s.h.x, s.h.y, 60, s.h.def.color, 0.5, true); if (XY.anim) XY.anim.sky(G, s.h.x, s.h.y, 1);
      s.h = null;
    }
  };
  Gs.alpha = function (G) { var s = G.guest; if (!s || !s.h) return 1; return Math.max(0, Math.min(1, s.t / 0.25, (s.max - s.t) / 0.5)); };
  // 头上的名牌：「特邀 · 名字 · 剩余秒数」
  Gs.drawTag = function (c, G) {
    var s = G.guest; if (!s || !s.h) return; var h = s.h, R = XY.R, txt = R.txt;
    var w = 118, x = h.x - w / 2, y = h.y - h.def.r * 3.1 - 30;
    c.save(); c.globalAlpha = Gs.alpha(G);
    c.font = '14px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#3a2a1c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(h.def.name + ' · ' + Math.max(0, Math.ceil(s.max - s.t)) + '秒', h.x, y + 11);
    c.restore();
  };
})();
