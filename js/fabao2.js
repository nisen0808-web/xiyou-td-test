/* ============================================================
 * fabao2.js —— 法宝出手（15 件法宝 + 8 件超级法宝的行为 + 画面）
 *   所有伤害：type 'magic'、五行取该法宝的、aoe:true（范围伤害，不被盾兵格挡）；src = 当前操控的英雄（守护类 = 唐僧）
 *   数值是占位（探针调）：基础伤害 × 等级倍数（Lv2 / Lv4 各 +30%）× 开光 × 全队伤害；与逐级说明共用 damageScale
 *   特效：尖碎片 / 斩痕 / 多边形，不用圆圈；同屏特效有上限（LOD）
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, FB = XY.fabao, cos = Math.cos, sin = Math.sin, PI = Math.PI, PI2 = PI * 2;
  var COL = { metal: '#e0a415', wood: '#3f9e5a', water: '#3a9bd0', fire: '#e8602c', earth: '#a8782f' };
  function K() { return XY.core; }
  function caster(G) { var h = G.heroes[G.ctrl]; if (h && h.id !== 'tang' && !h.down && h.hp > 0) return h; for (var i = 1; i < G.heroes.length; i++) if (!G.heroes[i].down && G.heroes[i].hp > 0) return G.heroes[i]; return null; }
  function tang(G) { return G.heroes[0]; }
  function lvOf(s) { return Math.max(1, Math.min(5, s.lv)); }
  function dmgOf(G, s, base) { return base * FB.damageScale(G, s); }
  function rngOf(s, r) { return r * (lvOf(s) >= 4 ? 1.15 : 1) * (C.FB_RNG || 1); }
  function face(G, h, r) { var t = G.grid.nearest(h.x, h.y, (r || 420) * (C.FB_RNG || 1)); return t ? Math.atan2(t.y - h.y, t.x - h.x) : null; }
  function hit(G, s, h, e, d, o) {
    if (e.dead || e.hidden) return;
    var it = FB.info(s.id), op = { src: h, fb: true, type: 'magic', elem: it.el || null, aoe: true, kb: 0, fx: h.x, fy: h.y }; for (var k in o) op[k] = o[k];
    var hp0 = e.hp; K().hurtEnemy(G, e, d, op); G.fb.hits++; var dd = Math.max(0, hp0 - Math.max(0, e.hp)); G.fb.dmg = (G.fb.dmg || 0) + dd; var bi = G.fb.by || (G.fb.by = {}); var q = bi[s.id] || (bi[s.id] = [0, 0]); q[0] += dd; q[1]++;
  }
  function fx(G, o) { var f = G.fb; if (f.fx.length > 70) return; o.t = 0; f.fx.push(o); }
  // 冷却：七十二变减冷却，Lv3 的“出手翻倍”窗口内冷却走得更快
  function ready(G, s, dt, cd) {
    var f = G.fb; if (s.init === undefined) { s.init = 1; s.t = cd * 0.4; }
    var sp = (C.FB_SPD || 1) / Math.max(0.5, 1 - f.cdr) * (f.dbl && f.dbl.id === s.id && f.dbl.t > 0 ? 2 : 1);
    if (s.t > 0) s.t -= dt * sp;
    return s.t <= 0;
  }
  function fired(s, cd) { s.t = cd; }
  function later(G, d, fn) { G.fb.q.push({ t: d, fn: fn }); }
  function inCone(e, h, a, span, r) { var dx = e.x - h.x, dy = e.y - h.y, d = Math.sqrt(dx * dx + dy * dy); if (d > r + e.r) return false; var da = Math.abs(((Math.atan2(dy, dx) - a + PI * 3) % PI2) - PI); return d < 30 || da <= span / 2; }
  function dist(a, b) { return XY.dist(a.x, a.y, b.x, b.y); }

  /* ================= 15 件法宝 ================= */
  var B = {};
  B.jingubang = function (G, s, dt) {
    var lv = lvOf(s), cd = lv >= 3 ? 2.55 : 3; if (!ready(G, s, dt, cd)) return;
    var h = caster(G), a = face(G, h, 320); if (a === null) return;
    var span = lv >= 5 ? 2.62 : 1.57, r = rngOf(s, 150), d = dmgOf(G, s, 38);
    G.grid.query(h.x, h.y, r + 30, function (e) { if (inCone(e, h, a, span, r)) { hit(G, s, h, e, d, { kb: 70 }); if (lv >= 5) { e.vulnUntil = Math.max(e.vulnUntil || 0, G.t + 4); e.vulnM = Math.max(e.vulnM || 0, 0.1); } } });
    fx(G, { k: 'slash', x: h.x, y: h.y, a: a, span: span, r: r, max: 0.3, col: COL.metal }); fired(s, cd);
  };
  function slam(G, s, h, r, d, stun, col) {
    var any = 0; G.grid.query(h.x, h.y, r, function (e) { if (!(e.fly && XY.C.AIR_GROUND_IMMUNE)) any++; hit(G, s, h, e, d, { kb: 60, stun: stun, ground: true }); });
    fx(G, { k: 'crack', x: h.x, y: h.y, r: r, max: 0.45, col: col }); G.shake = Math.max(G.shake, 2.5); return any;
  }
  B.jiuchi = function (G, s, dt) {
    var lv = lvOf(s), cd = 4; if (!ready(G, s, dt, cd)) return;
    var h = caster(G), r = rngOf(s, 95) * (lv >= 3 ? 1.25 : 1), n = 0; G.grid.query(h.x, h.y, r * 1.2, function () { n++; }); if (!n) return;
    var d = dmgOf(G, s, 32), st = lv >= 5 ? 1 : 0.5; slam(G, s, h, r, d, st, COL.earth);
    if (lv >= 5) later(G, 0.45, function () { if (!h.down) slam(G, s, h, r, d, st, COL.earth); });
    fired(s, cd);
  };
  function orbit(G, s, dt, n, spd, mulD) {
    var h = caster(G); s.ang = (s.ang || 0) + dt * spd; s.tk = (s.tk || 0) - dt; s.n = n; s.cx = h.x; s.cy = h.y;
    if (s.tk > 0) return; s.tk = 0.2;
    var d = dmgOf(G, s, 10) * (mulD || 1);
    for (var i = 0; i < n; i++) { var a = s.ang + i * PI2 / n, bx = h.x + cos(a) * 74, by = h.y + sin(a) * 74; G.grid.query(bx, by, 26, function (e) { hit(G, s, h, e, d, { kb: 40 }); }); }
  }
  B.xiangyao = function (G, s, dt) { var lv = lvOf(s); orbit(G, s, dt, lv >= 5 ? 3 : (lv >= 3 ? 2 : 1), 3 * (lv >= 5 ? 1.2 : 1), 1); };
  // 抛出的圈：飞出去再飞回来
  function ringProj(G, s, h, a, o) {
    var f = G.fb; if (f.proj.length > 14) return;
    var p = { k: 'ring', s: s, h: h, x: h.x, y: h.y, a: a, sp: o.sp, range: o.range, out: true, hits: {}, hits2: {}, pn: 0, dmg: o.dmg, pierce: o.pierce, fire: !!o.fire, both: !!o.both, elite: o.elite || 1, life: 0, boom: o.boom || 0, col: o.col };
    f.proj.push(p);
  }
  B.jingangzhuo = function (G, s, dt) {
    var lv = lvOf(s), cd = 4.2; if (!ready(G, s, dt, cd)) return;
    var h = caster(G), a = face(G, h, 360); if (a === null) return;
    ringProj(G, s, h, a, { sp: 520, range: rngOf(s, 270), dmg: dmgOf(G, s, 28), pierce: lv >= 3 ? 5 : 3, both: lv >= 5, elite: lv >= 5 ? 1.3 : 1, col: COL.metal }); fired(s, cd);
  };
  B.hulu = function (G, s, dt) {
    var lv = lvOf(s), cd = 8 * (lv >= 3 ? 0.8 : 1); if (!ready(G, s, dt, cd)) return;
    var h = caster(G), cand = [], boss = null; G.grid.query(h.x, h.y, 420, function (e) { if (e.def.boss) boss = e; else if (!e.def.etower) cand.push(e); });
    if (!cand.length && !(boss && lv >= 5)) return;
    cand.sort(function (x, y) { return y.hp - x.hp; });
    cand.slice(0, lv >= 5 ? 2 : 1).forEach(function (e) { e.shield = 0; fx(G, { k: 'bolt', x: h.x, y: h.y, x2: e.x, y2: e.y, max: 0.35, col: COL.wood }); hit(G, s, h, e, e.hp + 9999, {}); });
    if (boss && lv >= 5) { fx(G, { k: 'bolt', x: h.x, y: h.y, x2: boss.x, y2: boss.y, max: 0.35, col: COL.wood }); hit(G, s, h, boss, boss.maxHp * 0.03, {}); }
    fired(s, cd);
  };
  B.huangjin = function (G, s, dt) {
    var lv = lvOf(s), cd = 9; if (!ready(G, s, dt, cd)) return;
    var h = caster(G), cand = []; G.grid.query(h.x, h.y, 320, function (e, d2) { if (!e.def.etower) cand.push({ e: e, d: d2 }); });
    if (!cand.length) return; cand.sort(function (x, y) { return x.d - y.d; });
    cand.slice(0, lv >= 3 ? 4 : 2).forEach(function (c) { var e = c.e; e.stunT = Math.max(e.stunT || 0, e.def.boss ? 1.2 : 2.5); if (lv >= 5) { e.vulnUntil = Math.max(e.vulnUntil || 0, G.t + 2.5); e.vulnM = Math.max(e.vulnM || 0, 0.2); } fx(G, { k: 'bolt', x: h.x, y: h.y, x2: e.x, y2: e.y, max: 0.6, col: COL.earth, rope: 1 }); });
    fired(s, cd);
  };
  B.bajiaoshan = function (G, s, dt) {
    var lv = lvOf(s), cd = 6; if (s.wind) { s.wind.t -= dt; s.wind.k -= dt; if (s.wind.k <= 0) { s.wind.k = 0.25; gust(G, s, s.wind.h, s.wind.a, 0.4); } if (s.wind.t <= 0) s.wind = null; }
    if (!ready(G, s, dt, cd)) return;
    var h = caster(G), a = face(G, h, 400); if (a === null) return;
    gust(G, s, h, a, 1); if (lv >= 5) s.wind = { t: 1.5, k: 0.25, h: h, a: a }; fired(s, cd);
  };
  function gust(G, s, h, a, m) {
    var lv = lvOf(s), r = rngOf(s, 210) * (lv >= 3 ? 1.25 : 1), d = dmgOf(G, s, 12) * m;
    G.grid.query(h.x, h.y, r + 30, function (e) { if (inCone(e, h, a, 1.4, r)) hit(G, s, h, e, d, { kb: 90 * m }); });
    for (var i = 0; i < G.eprojs.length; i++) { var q = G.eprojs[i]; if (inCone({ x: q.x, y: q.y, r: 4 }, h, a, 1.4, r)) q.life = 0; }
    fx(G, { k: 'wind', x: h.x, y: h.y, a: a, r: r, max: 0.45, col: COL.wood });
  }
  B.zhaoyao = function (G, s, dt) {
    var lv = lvOf(s), cd = 10; if (!ready(G, s, dt, cd)) return;
    var h = caster(G), r = 200 * (lv >= 3 ? 1.25 : 1), n = 0, vm = lv >= 5 ? 0.4 : 0.25;
    G.grid.query(h.x, h.y, r, function (e) { n++; e.vulnUntil = Math.max(e.vulnUntil || 0, G.t + 6); e.vulnM = Math.max(e.vulnM || 0, vm); });
    if (!n) return; fx(G, { k: 'scan', x: h.x, y: h.y, r: r, max: 0.8, col: COL.metal }); fired(s, cd);
  };
  B.liuli = function (G, s, dt) {
    var lv = lvOf(s), h = caster(G), f = G.fb; s.acc = (s.acc || 0) + dt;
    if (s.lx === undefined) { s.lx = h.x; s.ly = h.y; }
    if (XY.dist(h.x, h.y, s.lx, s.ly) > 34 && s.acc > 0.15) {
      s.acc = 0; s.lx = h.x; s.ly = h.y; if (f.patches.length >= 40) f.patches.shift();
      f.patches.push({ x: h.x, y: h.y, r: 34 * (lv >= 5 ? 1.4 : 1), life: lv >= 3 ? 5 : 3, max: lv >= 3 ? 5 : 3, tk: 0, s: s, h: h, col: COL.fire });
    }
  };
  B.sanmei = function (G, s, dt) {
    var lv = lvOf(s), cd = 5; if (!ready(G, s, dt, cd)) return;
    var h = caster(G), cand = []; G.grid.query(h.x, h.y, 520, function (e, d2) { if (!e.def.etower || true) cand.push({ e: e, d: d2 }); });
    if (!cand.length) return; cand.sort(function (x, y) { return x.d - y.d; });
    var n = lv >= 5 ? 3 : (lv >= 3 ? 2 : 1), f = G.fb;
    cand.slice(0, n).forEach(function (c, i) { if (f.proj.length > 14) return; var a = Math.atan2(c.e.y - h.y, c.e.x - h.x) + (i - (n - 1) / 2) * 0.5; f.proj.push({ k: 'fire', s: s, h: h, x: h.x, y: h.y, a: a, tg: c.e, sp: 380, dmg: dmgOf(G, s, 40), r: lv >= 3 ? 70 : 62, burn: lv >= 5, life: 0, col: COL.fire }); });
    fired(s, cd);
  };
  B.pantao = function (G, s, dt) {
    var lv = lvOf(s), cd = 12, f = G.fb; if (f.peaches.length) return; if (!ready(G, s, dt, cd)) return;
    var low = null; G.heroes.forEach(function (h) { if (!h.down && h.id !== 'tang' && h.hp < h.maxHp * 0.85 && (!low || h.hp / h.maxHp < low.hp / low.maxHp)) low = h; });
    if (!low) return; var a = XY.rand(0, PI2);
    f.peaches.push({ x: low.x + cos(a) * 120, y: low.y + sin(a) * 120, hero: low, ripe: 0.5, life: 20, frac: [0, 0.15, 0.15, 0.25, 0.25, 0.35][lv], haste: lv >= 5, bob: 0 }); fired(s, cd);
  };
  // v0.8.3：避水珠 / 定海神珠不再给“百分比护盾”，改成每位英雄一颗一次性水珠（见 FB.wardUpdate）
  function anchor(G) { return G.camp.active ? G.camp : tang(G); }
  function field(G, s, dt, r, slowF, healLv5, tag) {
    s.fk = (s.fk || 0) - dt; if (s.fk > 0) return; s.fk = 0.3; var a = anchor(G);
    G.grid.query(a.x, a.y, r, function (e) { e.slowT = Math.max(e.slowT || 0, 0.6); e.slowF = Math.max(e.slowF || 0, slowF * (e.def.boss ? 0.5 : 1)); });
    if (healLv5) G.heroes.forEach(function (h) { if (!h.down && XY.dist(h.x, h.y, a.x, a.y) < r) K().healHero(G, h, 0.3, false); });
    s.fa = { x: a.x, y: a.y, r: r };
  }
  B.jingping = function (G, s, dt) { var lv = lvOf(s); field(G, s, dt, 170 * (lv >= 3 ? 1.3 : 1), lv >= 5 ? 0.35 : 0.2, lv >= 5); };
  function weakAura(G, s, dt, r, mul) {
    var f = G.fb; s.fk = (s.fk || 0) - dt; if (s.fk > 0) return; s.fk = 0.3; var t = tang(G), inside = [];
    f.jsh = f.jsh || [];
    G.grid.query(t.x, t.y, r, function (e) { if (!e._jsh) { e._jsh = mul; e.dmg *= mul; f.jsh.push(e); } });
    f.jsh = f.jsh.filter(function (e) { if (e.dead) return false; if (XY.dist(e.x, e.y, t.x, t.y) > r + 30) { e.dmg /= e._jsh; e._jsh = 0; return false; } return true; });
    s.fa = { x: t.x, y: t.y, r: r };
  }
  B.jiasha = function (G, s, dt) {
    var lv = lvOf(s); weakAura(G, s, dt, 140 * (lv >= 3 ? 1.3 : 1), 0.9);
    if (!G.ending && G.camp.active && G.camp.hp < G.camp.maxHp) G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + 2 * lv * dt);
  };
  B.chanzhang = function (G, s, dt) {
    var lv = lvOf(s), cd = 7; if (!ready(G, s, dt, cd)) return;
    var t = tang(G), r = 150 * (lv >= 3 ? 1.3 : 1), n = 0; G.grid.query(t.x, t.y, r, function () { n++; }); if (!n) return;
    var d = dmgOf(G, s, 8);
    G.grid.query(t.x, t.y, r, function (e) { hit(G, s, t, e, d, { stun: e.def.boss ? 0 : (lv >= 5 ? 1.2 : 0.8), kb: lv >= 5 && e.def.elite ? 140 : 40 }); });
    fx(G, { k: 'crack', x: t.x, y: t.y, r: r, max: 0.5, col: COL.earth }); fired(s, cd);
  };

  /* ================= 8 件超级法宝 ================= */
  B.wanzhang = function (G, s, dt) {
    var cd = 4; if (!ready(G, s, dt, cd)) return; var h = caster(G), best = null, bn = 0;
    var pool = []; G.grid.query(h.x, h.y, 650, function (e) { if (pool.length < 14) pool.push(e); });
    pool.forEach(function (e) { var n = 0; G.grid.query(e.x, e.y, 130, function () { n++; }); if (n > bn) { bn = n; best = e; } });
    if (!best) return; var x = best.x, y = best.y, d = dmgOf(G, s, 150);
    fx(G, { k: 'warn', x: x, y: y, r: 150, max: 0.55, col: COL.metal });
    later(G, 0.55, function () { G.grid.query(x, y, 150, function (e) { hit(G, s, h, e, d, { kb: 120, stun: 1, fx: x, fy: y }); }); fx(G, { k: 'bar', x: x, y: y, r: 150, max: 0.5, col: COL.metal }); K().ring(G, x, y, 150, COL.metal, 0.5, true); G.shake = Math.max(G.shake, 6); });
    fired(s, cd);
  };
  B.tianhe = function (G, s, dt) {
    orbit(G, s, dt, 3, 3.4, 2);
    var cd = 3.5; if (!ready(G, s, dt, cd)) return; var h = caster(G), n = 0; G.grid.query(h.x, h.y, 150, function () { n++; }); if (!n) return;
    slam(G, s, h, 130, dmgOf(G, s, 70), 0.3, COL.water);
    G.grid.query(h.x, h.y, 260, function (e) { if (e.fly && XY.C.AIR_GROUND_IMMUNE) return; e.slowT = Math.max(e.slowT || 0, 3); e.slowF = Math.max(e.slowF || 0, 0.5 * (e.def.boss ? 0.5 : 1)); });
    fx(G, { k: 'wind', x: h.x, y: h.y, a: 0, r: 260, max: 0.6, col: COL.water, all: 1 }); fired(s, cd);
  };
  B.liefeng = function (G, s, dt) {
    var f = G.fb, cd = 5; if (!ready(G, s, dt, cd)) return; var h = caster(G), a = face(G, h, 400); if (a === null) return;
    f.walls.push({ x: h.x + cos(a) * 60, y: h.y + sin(a) * 60, a: a, life: 3, max: 3, tk: 0, s: s, h: h, len: 150 }); fired(s, cd);
  };
  B.shouhun = function (G, s, dt) {
    var cd = 20; if (!ready(G, s, dt, cd)) return; var h = caster(G), cnt = 0, vw = G.view.w / 2 + 60, vh = G.view.h / 2 + 60;
    G.grid.query(G.cam.x, G.cam.y, Math.max(vw, vh) * 1.2, function (e) {
      if (Math.abs(e.x - G.cam.x) > vw || Math.abs(e.y - G.cam.y) > vh || e.hidden) return; cnt++;
      if (e.def.boss || e.def.elite || e.def.etower) hit(G, s, h, e, Math.min(e.maxHp * 0.08, 600), {}); else { e.shield = 0; if (cnt < 400) hit(G, s, h, e, e.hp + 9999, {}); }
    });
    if (!cnt) { s.t = 1; return; }
    fx(G, { k: 'scan', x: G.cam.x, y: G.cam.y, r: 620, max: 0.9, col: COL.wood }); fired(s, cd);
  };
  B.huolun = function (G, s, dt) {
    var cd = 4; if (!ready(G, s, dt, cd)) return; var h = caster(G), a = face(G, h, 420); if (a === null) return;
    ringProj(G, s, h, a, { sp: 600, range: 360, dmg: dmgOf(G, s, 60), pierce: 99, both: true, fire: true, boom: dmgOf(G, s, 80), col: COL.fire }); fired(s, cd);
  };
  B.panhui = function (G, s, dt) {
    var cd = 15; if (!ready(G, s, dt, cd)) return; var any = false;
    G.heroes.forEach(function (h) { if (!h.down && h.id !== 'tang') { any = true; K().healHero(G, h, h.maxHp * 0.35, true); h.boostT = Math.max(h.boostT || 0, 5); fx(G, { k: 'petals', x: h.x, y: h.y, max: 1, col: '#f08aa0' }); } });
    if (any) fired(s, cd); else s.t = 1;
  };
  B.jinchan = function (G, s, dt) {
    s.fk = (s.fk || 0) - dt; if (s.fk > 0) return; s.fk = 0.5; var t = tang(G), r = 200, d = dmgOf(G, s, 14);
    G.grid.query(t.x, t.y, r, function (e) { hit(G, s, t, e, d, { dot: true }); e.slowT = Math.max(e.slowT || 0, 0.8); e.slowF = Math.max(e.slowF || 0, 0.4 * (e.def.boss ? 0.5 : 1)); });
    G.heroes.forEach(function (x) { if (!x.down && x.id !== 'tang' && XY.dist(x.x, x.y, t.x, t.y) < r) x.shield = Math.max(x.shield || 0, 0.7); });
    s.fa = { x: t.x, y: t.y, r: r };
  };
  B.dinghai = function (G, s, dt) { field(G, s, dt, 220, 0.35, false); };   // 水域减速保留；水珠由 wardUpdate 统一管理

  /* ---- v0.8.3 一次性水珠 ----
   * 每位出战英雄（不含唐僧）一颗：下一次受到的伤害整个挡掉，碎裂后冷却，冷却完重新长出来。
   * 避水珠冷却 35 / 28 / 22 秒（Lv1-2 / 3-4 / 5）；定海神珠 30 / 24 / 18 秒，另外营地也有一颗（冷却 40 秒）。两样都带取较短的冷却。
   * 数字集中在 C.WARD，方便调。 */
  var WARD = C.WARD = C.WARD || { bishui: [35, 28, 22], dinghai: [30, 24, 18], camp: 40, grace: 0.4, lv5Shield: 1.0, lv5R: 120 };
  function wardCdOf(id, lv) { return WARD[id][lv >= 5 ? 2 : (lv >= 3 ? 1 : 0)]; }
  FB.wardCd = wardCdOf;
  FB.wardUpdate = function (G, dt) {
    var b = FB.held(G, 'bishui'), d = FB.held(G, 'dinghai'), mx = 0, lv5 = false;
    if (b) { mx = wardCdOf('bishui', lvOf(b)); lv5 = lvOf(b) >= 5; }
    if (d) { var m2 = wardCdOf('dinghai', lvOf(d)); mx = mx ? Math.min(mx, m2) : m2; }
    G.heroes.forEach(function (h) {
      if (h.id === 'tang' || !mx) { if (h.ward) h.ward = null; return; }
      var w = h.ward; if (!w) { w = h.ward = { ready: true, cd: 0, max: mx }; }
      w.max = mx; w.lv5 = lv5;
      if (!w.ready) { if (h.down) return; w.cd -= dt; if (w.cd <= 0) { w.cd = 0; w.ready = true; } }
      else if (w.cd > mx) w.cd = mx;
    });
    var c = G.camp; if (c.wardGrace > 0) c.wardGrace -= dt;
    if (d) { var cw = c.ward; if (!cw) cw = c.ward = { ready: true, cd: 0, max: WARD.camp }; cw.max = WARD.camp; if (!cw.ready) { cw.cd -= dt; if (cw.cd <= 0) { cw.cd = 0; cw.ready = true; } } } else if (c.ward) c.ward = null;
  };
  FB.wardBreak = function (G, h) {
    var w = h.ward; w.ready = false; w.cd = w.max; h.hurtT = 0.1;
    K().text(G, h.x, h.y - h.def.r - 14, '挡！', 'heal', '#2a6fb8');
    fx(G, { k: 'shield', x: h.x, y: h.y, max: 0.5, col: COL.water, h: h }); G.stats.wardBlocks = (G.stats.wardBlocks || 0) + 1;
    if (w.lv5) G.heroes.forEach(function (o) { if (o !== h && !o.down && o.id !== 'tang' && XY.dist(o.x, o.y, h.x, h.y) <= WARD.lv5R) o.shield = Math.max(o.shield || 0, WARD.lv5Shield); });   // Lv5：碎裂时周围英雄 1 秒减伤
  };
  FB.campWardBreak = function (G) {
    var w = G.camp.ward; w.ready = false; w.cd = w.max; G.camp.wardGrace = WARD.grace;
    K().text(G, G.camp.x, G.camp.y - 60, '挡！', 'heal', '#2a6fb8'); fx(G, { k: 'shield', x: G.camp.x, y: G.camp.y, max: 0.5, col: COL.water, h: G.camp });
  };

  /* ================= 每步更新 ================= */
  FB.update = function (G, dt) {
    var f = G.fb; if (!f || G.mode !== 'play') return;
    f.q = f.q || [];
    var i, q;
    if (f.jsh && f.jsh.length && !FB.held(G, 'jiasha')) { f.jsh.forEach(function (e) { if (e._jsh) { e.dmg /= e._jsh; e._jsh = 0; } }); f.jsh = []; }   // 袈裟炼化走了：把压低的攻击还回去
    if (f.dbl) { f.dbl.t -= dt; if (f.dbl.t <= 0) f.dbl = null; }
    var qs = FB.held(G, 'qishier');
    if (qs && qs.lv >= 3) { qs.cyc = (qs.cyc || 0) + dt; if (qs.cyc >= 60) { qs.cyc = 0; var ws = f.w.filter(function (s) { return !s.sup; }); if (ws.length) { f.dbl = { id: ws[Math.floor(Math.random() * ws.length)].id, t: 5 }; XY.toast(G, '七十二变：' + FB.BY[f.dbl.id].name + ' 出手翻倍 5 秒'); } } }
    for (i = f.q.length - 1; i >= 0; i--) { q = f.q[i]; q.t -= dt; if (q.t <= 0) { f.q.splice(i, 1); q.fn(); } }
    FB.wardUpdate(G, dt);
    var holder = caster(G);
    for (i = 0; i < f.w.length; i++) {
      var s = f.w[i], info = FB.info(s.id);
      // 随身法宝由存活护法持有，不能在全员阵亡后转移到师父身上无限续发。
      // 已飞出的弹丸与已铺区域仍按各自寿命结算；守护 / 全队法宝按原有职责生效。
      if (info && info.src === 'sui' && !holder) { s.n = 0; continue; }
      if (B[s.id]) B[s.id](G, s, dt);
    }
    for (i = 0; i < f.s.length; i++) { if (B[f.s[i].id]) B[f.s[i].id](G, f.s[i], dt); }
    updProj(G, f, dt); updPatches(G, f, dt); updPeaches(G, f, dt); updWalls(G, f, dt);
    for (i = f.fx.length - 1; i >= 0; i--) { f.fx[i].t += dt; if (f.fx[i].t >= f.fx[i].max) f.fx.splice(i, 1); }
    if (f.gain && (f.gain.t += dt) >= f.gain.max) f.gain = null;
    if (f.fuseAnim && (f.fuseAnim.t += dt) >= f.fuseAnim.max) f.fuseAnim = null;
  };
  function updProj(G, f, dt) {
    for (var i = f.proj.length - 1; i >= 0; i--) {
      var p = f.proj[i], h = p.h; p.life += dt; var done = false;
      if (p.k === 'ring') {
        if (p.out) { p.x += cos(p.a) * p.sp * dt; p.y += sin(p.a) * p.sp * dt; p.d = (p.d || 0) + p.sp * dt; if (p.d >= p.range) { p.out = false; p.pn = 0; if (p.boom) { boom(G, p, p.x, p.y); } } }
        else { var dx = h.x - p.x, dy = h.y - p.y, dd = Math.sqrt(dx * dx + dy * dy) || 1; p.x += dx / dd * p.sp * 1.1 * dt; p.y += dy / dd * p.sp * 1.1 * dt; if (dd < 26) { if (p.boom) boom(G, p, p.x, p.y); done = true; } }
        if (p.life > 3.5) done = true;
        var set = p.out ? p.hits : p.hits2, cnt = 0;
        if (!p.out && !p.both) { /* 单程：回程不再伤害 */ } else G.grid.query(p.x, p.y, 24, function (e) {
          if (set[e.id]) return; if (p.pn >= p.pierce) return; p.pn++;
          set[e.id] = 1; hit(G, p.s, h, e, p.dmg * (e.def.elite ? p.elite : 1), { kb: 30, fx: p.x - cos(p.a) * 20, fy: p.y - sin(p.a) * 20 });
          if (p.fire) { K().applyBurn(G, e, p.dmg * 0.12, 3, h); }
        });
      } else if (p.k === 'fire') {
        var tg = p.tg; if (!tg || tg.dead) { var nn = G.grid.nearest(p.x, p.y, 420); if (nn) p.tg = tg = nn; }
        if (tg) { var ta = Math.atan2(tg.y - p.y, tg.x - p.x), da = ((ta - p.a + PI * 3) % PI2) - PI; p.a += Math.max(-6 * dt, Math.min(6 * dt, da)); }
        p.x += cos(p.a) * p.sp * dt; p.y += sin(p.a) * p.sp * dt;
        var hitIt = false; G.grid.query(p.x, p.y, 16, function () { hitIt = true; });
        if (hitIt || p.life > 2.2) { done = true; if (hitIt || p.life > 2.2) { G.grid.query(p.x, p.y, p.r, function (e) { hit(G, p.s, h, e, p.dmg, { kb: 50, fx: p.x, fy: p.y }); if (p.burn) { K().applyBurn(G, e, p.dmg * 0.15, 3, h); } }); K().ring(G, p.x, p.y, p.r, COL.fire, 0.35, true); } }
      }
      if (done) f.proj.splice(i, 1);
    }
  }
  function boom(G, p, x, y) { G.grid.query(x, y, 100, function (e) { hit(G, p.s, p.h, e, p.boom, { kb: 80, fx: x, fy: y }); }); K().ring(G, x, y, 100, COL.fire, 0.4, true); }
  function updPatches(G, f, dt) {
    for (var i = f.patches.length - 1; i >= 0; i--) {
      var p = f.patches[i]; p.life -= dt; p.tk -= dt;
      if (p.tk <= 0) { p.tk = 0.5; var d = dmgOf(G, p.s, 9); G.grid.query(p.x, p.y, p.r, function (e) { hit(G, p.s, p.h, e, d, { dot: true }); K().applyBurn(G, e, d * 0.5, 1.5, p.h); }); }
      if (p.life <= 0) f.patches.splice(i, 1);
    }
  }
  function updPeaches(G, f, dt) {
    for (var i = f.peaches.length - 1; i >= 0; i--) {
      var p = f.peaches[i]; p.life -= dt; p.bob += dt * 4; var eaten = false;
      if (p.ripe > 0) p.ripe -= dt;                                   // 先挂 0.5 秒再滚向残血队友；谁碰到谁吃
      else if (p.hero && !p.hero.down) { var dx = p.hero.x - p.x, dy = p.hero.y - p.y, dd = Math.sqrt(dx * dx + dy * dy) || 1, st = Math.min(dd, 150 * dt); p.x += dx / dd * st; p.y += dy / dd * st; }
      for (var j = 0; j < G.heroes.length && !eaten; j++) { var h = G.heroes[j]; if (h.down || h.id === 'tang' || h.hp >= h.maxHp) continue; if (XY.dist(h.x, h.y, p.x, p.y) < 30 + h.def.r) { K().healHero(G, h, h.maxHp * p.frac, true); if (p.haste) h.boostT = Math.max(h.boostT || 0, 3); eaten = true; fx(G, { k: 'petals', x: p.x, y: p.y, max: 0.8, col: '#f08aa0' }); } }
      if (eaten || p.life <= 0) f.peaches.splice(i, 1);
    }
  }
  function updWalls(G, f, dt) {
    for (var i = f.walls.length - 1; i >= 0; i--) {
      var w = f.walls[i]; w.life -= dt; w.tk -= dt; w.x += cos(w.a) * 130 * dt; w.y += sin(w.a) * 130 * dt;
      if (w.tk <= 0) {
        w.tk = 0.25; var d = dmgOf(G, w.s, 16), px = -sin(w.a), py = cos(w.a);
        G.grid.query(w.x, w.y, w.len + 30, function (e) {
          var rx = e.x - w.x, ry = e.y - w.y, along = rx * px + ry * py, perp = Math.abs(rx * cos(w.a) + ry * sin(w.a));
          if (Math.abs(along) <= w.len && perp < 40) { hit(G, w.s, w.h, e, d, { kb: 50, fx: w.x - cos(w.a) * 30, fy: w.y - sin(w.a) * 30, dot: false }); K().applyBurn(G, e, d * 0.3, 2, w.h); }
        });
      }
      if (w.life <= 0) f.walls.splice(i, 1);
    }
  }
  var oldInit = FB.init;
  FB.init = function (G) { oldInit(G); if (G.fb) { G.fb.q = []; } };

  /* ================= 画面 ================= */
  function poly(c, pts) { c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); }
  function star(c, x, y, r, n, inner, rot) { c.beginPath(); for (var i = 0; i < n * 2; i++) { var a = rot + i / (n * 2) * PI2, rr = i % 2 ? r * inner : r; if (i) c.lineTo(x + cos(a) * rr, y + sin(a) * rr); else c.moveTo(x + cos(a) * rr, y + sin(a) * rr); } c.closePath(); }
  function brushRing(c, x, y, r, phase, opacity, col) {
    c.lineCap = 'round';
    for (var i = 0; i < 15; i++) {
      var start = i / 15 * PI2 + phase, length = (.18 + (i % 4) * .025);
      c.globalAlpha = opacity * (.36 + (i % 3) * .18); c.strokeStyle = i % 4 ? col : '#42362b'; c.lineWidth = i % 3 ? 1.4 : 3.1;
      c.beginPath(); c.arc(x, y, r, start, start + length); c.stroke();
    }
  }
  function dark(col) { return 'rgba(60,40,20,0.55)'; }
  function drawFx(c, f) {
    c.save();
    var k = f.t / f.max, a = 1 - k, i;
    c.lineJoin = 'round';
    switch (f.k) {
      case 'slash': {          // 一道弯月形的刀光
        var r = f.r * (0.6 + 0.4 * Math.min(1, k * 2.5)), a0 = f.a - f.span / 2, a1 = f.a + f.span / 2, n = 10, pts = [];
        for (i = 0; i <= n; i++) { var an = a0 + (a1 - a0) * i / n; pts.push([f.x + cos(an) * r, f.y + sin(an) * r]); }
        for (i = n; i >= 0; i--) { var an2 = a0 + (a1 - a0) * i / n, w = Math.sin(i / n * PI) * r * 0.22; pts.push([f.x + cos(an2) * (r - w), f.y + sin(an2) * (r - w)]); }
        poly(c, pts); c.globalAlpha = a * 0.5; c.fillStyle = f.col; c.fill(); c.globalAlpha = a * 0.9; c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.globalAlpha = a * 0.6; c.strokeStyle = dark(); c.lineWidth = 1.5; c.stroke(); break;
      }
      case 'crack': {          // 地面裂纹：放射状尖三角
        var rr = f.r * (0.4 + 0.6 * Math.min(1, k * 3)); c.globalAlpha = a * 0.85; c.fillStyle = f.col;
        for (i = 0; i < 9; i++) { var an3 = i / 9 * PI2 + f.x * 0.01, l = rr * (i % 2 ? 0.7 : 1); poly(c, [[f.x + cos(an3 - 0.1) * rr * 0.3, f.y + sin(an3 - 0.1) * rr * 0.3], [f.x + cos(an3) * l, f.y + sin(an3) * l], [f.x + cos(an3 + 0.1) * rr * 0.3, f.y + sin(an3 + 0.1) * rr * 0.3]]); c.fill(); }
        c.globalAlpha = a * 0.5; c.strokeStyle = dark(); c.lineWidth = 2; star(c, f.x, f.y, rr * 0.55, 9, 0.5, f.x * 0.01); c.stroke(); break;
      }
      case 'bolt': {           // 线：闪电 / 绳
        c.globalAlpha = a; c.strokeStyle = dark(); c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(f.x, f.y);
        var seg = 6; for (i = 1; i < seg; i++) { var tt = i / seg; c.lineTo(f.x + (f.x2 - f.x) * tt + (f.rope ? 0 : Math.sin(i * 7 + f.t * 30) * 8), f.y + (f.y2 - f.y) * tt + (f.rope ? Math.sin(i * 2 + f.t * 8) * 6 : Math.cos(i * 5) * 8)); } c.lineTo(f.x2, f.y2); c.stroke();
        c.strokeStyle = f.col; c.lineWidth = 3; c.stroke(); c.lineCap = 'butt'; break;
      }
      case 'wind': {           // 风：几道弧形条纹
        var ln = f.r * (0.4 + 0.6 * Math.min(1, k * 2.5)); c.globalAlpha = a * 0.8; c.strokeStyle = f.col; c.lineWidth = 3; c.lineCap = 'round';
        var nn = f.all ? 8 : 5; for (i = 0; i < nn; i++) { var an4 = f.all ? i / nn * PI2 : f.a + (i - 2) * 0.28; c.beginPath(); c.moveTo(f.x + cos(an4) * ln * 0.35, f.y + sin(an4) * ln * 0.35); c.lineTo(f.x + cos(an4 + 0.12) * ln, f.y + sin(an4 + 0.12) * ln); c.stroke(); } c.lineCap = 'butt'; break;
      }
      case 'scan': {           // 照妖/净化：淡墨与金光向外掠过，中心留白。
        var sr = f.r * (0.3 + 0.7 * Math.min(1, k * 2));
        brushRing(c, f.x, f.y, sr, k * .18, a * .85, f.col);
        brushRing(c, f.x, f.y, sr * .94, .25 - k * .1, a * .34, '#807252');
        c.strokeStyle = f.col; c.lineCap = 'round';
        for (i = 0; i < 9; i++) {
          var ray = i / 9 * PI2 + f.x * .001, inner = sr * (.81 + (i % 3) * .035);
          c.globalAlpha = a * .3; c.lineWidth = 1 + i % 2;
          c.beginPath(); c.moveTo(f.x + cos(ray) * inner, f.y + sin(ray) * inner); c.lineTo(f.x + cos(ray + .018) * sr, f.y + sin(ray + .018) * sr); c.stroke();
        }
        break;
      }
      case 'warn': {           // 己方巨棒落点：金墨聚拢，边界等于真实命中半径。
        var glow = c.createRadialGradient(f.x, f.y, f.r * .58, f.x, f.y, f.r);
        glow.addColorStop(0, 'rgba(187,142,59,0)'); glow.addColorStop(1, 'rgba(187,142,59,.1)');
        c.globalAlpha = .5 + k * .5; c.fillStyle = glow; c.beginPath(); c.arc(f.x, f.y, f.r, 0, PI2); c.fill();
        brushRing(c, f.x, f.y, f.r, -.1, .7, '#9b742c');
        c.globalAlpha = .78; c.strokeStyle = '#b18536'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r, -PI / 2, -PI / 2 + PI2 * k); c.stroke();
        brushRing(c, f.x, f.y, f.r * (1 - .45 * k), .3, .3 * k, '#5d4930'); break;
      }
      case 'bar': {            // 正式金箍棒原画下落，着地后沿地面散出墨痕。
        var lift = 140 * Math.max(0, 1 - k * 5);
        c.save(); c.globalAlpha = a; c.translate(f.x, f.y - 140 - lift); c.rotate(-PI / 4);
        if (XY.ICONINK) XY.ICONINK.draw(c, '金箍棒', 0, 0, 285); c.restore();
        if (k >= .2) {
          var spread = f.r * Math.min(1, (k - .2) * 2.8);
          brushRing(c, f.x, f.y, Math.max(1, spread), .1, a * .8, '#80612c');
          c.strokeStyle = '#4e3e2d'; c.lineCap = 'round'; c.globalAlpha = a * .55;
          for (i = 0; i < 7; i++) { var dust = i / 7 * PI2 + .16; c.lineWidth = i % 2 ? 1.2 : 2.8; c.beginPath(); c.moveTo(f.x + cos(dust) * spread * .55, f.y + sin(dust) * spread * .55); c.lineTo(f.x + cos(dust + .025) * spread, f.y + sin(dust + .025) * spread); c.stroke(); }
        }
        break;
      }
      case 'shield': {         // 护身水幕：两侧薄弧留出人物正面，碎开时向外漾开
        var hh = f.h; if (hh) { f.x = hh.x; f.y = hh.y; }
        var sx = f.x, sy = f.y - 19, sw = 28 + 9 * k, sh = 37 + 7 * k;
        c.lineCap = 'round'; c.strokeStyle = '#537f85'; c.globalAlpha = a * 0.55; c.lineWidth = 2.1;
        c.beginPath(); c.ellipse(sx, sy, sw, sh, 0, -1.24, 1.24); c.stroke();
        c.beginPath(); c.ellipse(sx, sy, sw, sh, 0, PI - 1.24, PI + 1.24); c.stroke();
        c.strokeStyle = '#eff9ef'; c.globalAlpha = a * 0.62; c.lineWidth = 1;
        c.beginPath(); c.ellipse(sx, sy, sw - 3, sh - 2, 0, -1.05, 0.9); c.stroke();
        c.beginPath(); c.ellipse(sx, sy, sw - 3, sh - 2, 0, PI - 0.9, PI + 1.05); c.stroke();
        c.strokeStyle = '#6f9996'; c.globalAlpha = a * 0.35; c.lineWidth = 1;
        c.beginPath(); c.ellipse(sx, f.y + 13, sw * 0.85, 7 + 3 * k, 0, 0.12, PI - 0.12); c.stroke(); break;
      }
      case 'petals': {         // 花瓣 / 桃瓣
        c.globalAlpha = a; c.fillStyle = f.col; for (i = 0; i < 8; i++) { var an5 = i / 8 * PI2 + k * 2, d5 = 14 + 40 * k; c.save(); c.translate(f.x + cos(an5) * d5, f.y + sin(an5) * d5 - 20 * k); c.rotate(an5); c.fillRect(-4, -2, 8, 4); c.restore(); } break;
      }
    }
    c.restore();
  }
  var fireInk = null, fireInkReady = null;
  FB.preloadInkFire = function () {
    if (fireInkReady) return fireInkReady;
    fireInkReady = new Promise(function (resolve) {
      fireInk = new Image(); fireInk.onload = function () { resolve(true); };
      fireInk.onerror = function () { fireInkReady = null; resolve(false); };
      fireInk.src = 'assets/art/fx-ink/fire-atlas.webp';
    }); return fireInkReady;
  };
  var initWithFire = FB.init;
  FB.init = function (G) {
    var result = initWithFire.apply(this, arguments); FB.preloadInkFire();
    if (XY.ICONINK && XY.ICONINK.preloadFull) XY.ICONINK.preloadFull('金箍棒');
    return result;
  };
  // 火焰以八帧墨绘和炭墨底痕呈现；范围仍取实际伤害半径。
  function inkFlame(c, x, y, width, height, lean, phase) {
    c.save(); c.translate(x, y);
    if (fireInk && fireInk.complete && fireInk.naturalWidth) {
      var cycle = ((Math.floor(phase * 1.6) % 14) + 14) % 14, frame = cycle < 8 ? cycle : 14 - cycle;
      var sw = fireInk.naturalWidth / 4, sh = fireInk.naturalHeight / 2;
      c.rotate(Math.max(-0.22, Math.min(0.22, lean / Math.max(1, height) * 0.3)));
      c.drawImage(fireInk, (frame % 4) * sw, Math.floor(frame / 4) * sh, sw, sh, -width * 1.35, -height * 1.16, width * 2.7, height * 1.2);
      c.restore(); return;
    }
    var sway = Math.sin(phase) * width * 0.18;
    c.fillStyle = '#a44329'; c.strokeStyle = 'rgba(64,39,27,.62)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-width * 0.48, 0);
    c.bezierCurveTo(-width * 0.83, -height * 0.31, width * 0.12 + sway, -height * 0.55, lean, -height);
    c.bezierCurveTo(lean + width * 0.28, -height * 0.52, width * 0.78, -height * 0.23, width * 0.42, 0);
    c.quadraticCurveTo(0, height * 0.12, -width * 0.48, 0); c.fill(); c.stroke();
    c.fillStyle = '#d3a05b'; c.beginPath(); c.moveTo(-width * 0.2, -height * 0.04);
    c.quadraticCurveTo(-width * 0.28, -height * 0.27, lean * 0.55 + sway, -height * 0.56);
    c.quadraticCurveTo(width * 0.33, -height * 0.25, width * 0.14, -height * 0.02); c.fill(); c.restore();
  }
  function inkFirePatch(c, p, time, seed) {
    var opacity = Math.min(1, Math.max(0, p.life / p.max) * 1.5), radius = p.r;
    c.save(); c.translate(p.x, p.y); c.globalAlpha = opacity;
    var wash = c.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    wash.addColorStop(0, 'rgba(104,60,35,.16)'); wash.addColorStop(0.78, 'rgba(151,69,37,.1)'); wash.addColorStop(1, 'rgba(151,69,37,0)');
    c.fillStyle = wash; c.beginPath(); c.arc(0, 0, radius, 0, PI2); c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(128,65,37,.2)'; c.stroke();
    c.strokeStyle = 'rgba(49,43,32,.4)'; c.lineWidth = 2; c.lineCap = 'round';
    for (var j = 0; j < 5; j++) { var angle = j * PI2 / 5 + seed * 0.7; c.beginPath(); c.arc(0, 0, radius * (0.7 + j * 0.025), angle, angle + 0.28); c.stroke(); }
    for (j = 0; j < 7; j++) { var px = Math.sin(j * 2.399 + seed) * radius * 0.67, py = Math.cos(j * 2.399 + seed) * radius * 0.58;
      var heat = 0.8 + 0.2 * Math.sin(time * 6 + j * 1.7), fh = radius * (0.37 + (j % 3) * 0.09) * heat;
      inkFlame(c, px, py + fh * 0.25, Math.max(5, radius * 0.2), fh, Math.sin(j + time * 2) * radius * 0.08, time * 5 + j);
    }
    c.restore();
  }
  FB.drawGround = function (c, G) {
    var f = G.fb; if (!f) return; var i, t = (G.t || 0);
    c.save(); c.globalAlpha = 1;
    // 常驻领域：实际圆形边界与淡墨水光，不旋转，不覆盖人物细节。
    FB.all(G).forEach(function (s) {
      if (s.fa) {
        var fa = s.fa, ink = s.sup ? '139,111,58' : '74,112,112';
        c.save(); c.setLineDash([]);
        var wash = c.createRadialGradient(fa.x, fa.y, fa.r * 0.55, fa.x, fa.y, fa.r);
        wash.addColorStop(0, 'rgba(' + ink + ',0)'); wash.addColorStop(0.8, 'rgba(' + ink + ',0.035)'); wash.addColorStop(1, 'rgba(' + ink + ',0.07)');
        c.fillStyle = wash; c.beginPath(); c.arc(fa.x, fa.y, fa.r, 0, PI2); c.fill();
        c.strokeStyle = 'rgba(' + ink + ',0.25)'; c.lineWidth = 1; c.stroke();
        c.strokeStyle = 'rgba(' + ink + ',0.17)'; c.lineWidth = 1.6; c.lineCap = 'round';
        for (var ai = 0; ai < 3; ai++) { var aa = ai * PI2 / 3 + 0.28; c.beginPath(); c.arc(fa.x, fa.y, fa.r - 4, aa, aa + 0.75); c.stroke(); }
        c.restore();
      }
    });
    for (i = 0; i < f.patches.length; i++) inkFirePatch(c, f.patches[i], t, i);
    for (i = 0; i < f.walls.length; i++) { var w = f.walls[i], px = -sin(w.a), py = cos(w.a), kk = Math.min(1, w.life / 0.5); c.save(); c.globalAlpha = kk;
      c.strokeStyle = 'rgba(75,47,29,.35)'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(w.x - px * w.len, w.y - py * w.len); c.lineTo(w.x + px * w.len, w.y + py * w.len); c.stroke();
      for (var j = -7; j <= 7; j++) { var tt = j / 7 * w.len; inkFlame(c, w.x + px * tt, w.y + py * tt, 16, 25 + 9 * Math.sin(t * 5 + j), Math.sin(j * 1.9 + t * 2) * 8, t * 5 + j); } c.restore(); }
    c.restore();
  };
  // Orbiting weapons and projectiles remain above actors; persistent fields are drawn on the ground.
  FB.draw = function (c, G) {
    var f = G.fb; if (!f) return; var i, t = (G.t || 0);
    c.save(); c.globalAlpha = 1;
    FB.all(G).forEach(function (s) {
      if (s.id === 'xiangyao' || s.id === 'tianhe') {            // 月牙铲
        var h = s.cx !== undefined ? s : null; if (!h) return;
        for (i = 0; i < s.n; i++) { var a = s.ang + i * PI2 / s.n, bx = s.cx + cos(a) * 74, by = s.cy + sin(a) * 74; c.save(); c.translate(bx, by); c.rotate(a + PI / 2); c.fillStyle = s.sup ? '#6fb7d6' : '#7fb0d8'; c.strokeStyle = '#2b5f86'; c.lineWidth = 2;
          if (XY.ICONINK && XY.ICONINK.draw(c, '降妖宝杖', 0, 0, 39)) { c.restore(); continue; }
          c.fillStyle = s.sup ? '#8daeb0' : '#a5bab0'; c.strokeStyle = '#3f5351';
          c.beginPath(); c.moveTo(-17, -10); c.bezierCurveTo(-11, 15, 11, 15, 17, -10); c.bezierCurveTo(6, 2, -6, 2, -17, -10); c.closePath(); c.fill(); c.stroke();
          c.strokeStyle = '#695744'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 5); c.lineTo(0, 19); c.stroke(); c.restore(); }
      }
    });
    for (i = 0; i < f.proj.length; i++) { var q = f.proj[i]; c.save(); c.translate(q.x, q.y);
      if (q.k === 'ring') { c.rotate(t * 7); if (!(XY.ICONINK && XY.ICONINK.draw(c, '金刚琢', 0, 0, 37))) { c.strokeStyle = '#58452d'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 15, 11, 0, 0, PI2); c.stroke(); c.strokeStyle = '#b99451'; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#e0c48b'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 15, 11, 0, 0.4, 2.2); c.stroke(); }
        if (q.fire) { inkFlame(c, -11, 3, 8, 23, -8, t * 5); inkFlame(c, 10, 4, 7, 19, 6, t * 5 + 1); } }
      else { c.rotate(q.a + PI / 2); inkFlame(c, 0, 11, 16, 29, Math.sin(t * 10) * 3, t * 8); }
      c.restore(); }
    c.globalAlpha = 1;
    for (i = 0; i < f.peaches.length; i++) {
      var pc = f.peaches[i], by = Math.sin(pc.bob) * 3;
      // 复用道具卡里的真实蟠桃水墨图；只换绘制，不动成熟/拾取/消失计时。
      if (!(XY.ICONINK && XY.ICONINK.draw(c, '蟠桃', pc.x, pc.y + by, 38))) {
        c.save(); c.font = '18px "Ma Shan Zheng","KaiTi",serif'; c.fillStyle = '#6d4e35';
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('桃', pc.x, pc.y + by); c.restore();
      }
    }
    for (i = 0; i < f.fx.length; i++) drawFx(c, f.fx[i]);
    c.restore();
  };
})();
