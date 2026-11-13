/* ============================================================
 * sp12.js —— v0.5：12 位常驻角色各有“独有的普攻 + 清屏级大招”，以及 36 个技能树分支（u_* 键）的专属效果
 *
 *   XY.SP12.atk[id](G,h)   独有普攻，返回冷却秒数（false = 没目标）
 *   XY.SP12.ult[id](G,h)   清屏级大招（走 XY.clearArea：窗口期 → 落地 → 普通怪必死 / 精英·BOSS 只吃技能伤害）
 *   XY.SP12.want(G,h)      自动放大招的时机：视口里普通怪足够多，或 BOSS 在身边
 *   分支键：h.mod.u_xxx（skills.js 的 addBranches 把分支节点的加成累加进来）。每个键在下面都有读取点，
 *   test/e2e-v05.js 用“u=0 对 u>0”的前后对比验证它真的改变了状态。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin, atan2 = Math.atan2, dist = XY.dist;
  function K() { return XY.core; }
  function later(G, t, fn) { (G.spq = G.spq || []).push({ t: t, fn: fn }); }
  function U(h, k) { return (h && h.mod && h.mod[k]) || 0; }
  function sdmg(G, h, base) { return K().heroDmg(G, h, base * (h.def.statMul || 1)); }
  function addZone(G, z) { (G.spz = G.spz || []).push(z); return z; }
  function coin(G, x, y, v) { if (v > 0) G.coinDrops.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 16, v: Math.max(1, Math.round(v)), mag: null }); }
  function team(G) { var l = []; for (var i = 1; i < G.heroes.length; i++) if (!G.heroes[i].down) l.push(G.heroes[i]); return l; }      // 不含唐僧（唐僧永远 1 点血，规则不变，不吃护盾）
  function friends(G) { var l = []; for (var i = 0; i < G.heroes.length; i++) if (!G.heroes[i].down) l.push(G.heroes[i]); return l; }
  function hero(G, id) { for (var i = 0; i < G.heroes.length; i++) if (G.heroes[i].id === id && !G.heroes[i].down) return G.heroes[i]; return null; }
  function shield(t, v) { t.absorb = Math.min((t.absorb || 0) + v, t.maxHp * 0.9); }
  function near(G, x, y, r) { var l = []; G.grid.query(x, y, r, function (e) { if (!e.dead) l.push(e); }); return l; }
  function nearestN(G, h, r, n) {                      // 离 h 最近的 n 个不同的敌人
    var l = near(G, h.x, h.y, r); l.sort(function (a, b) { return dist(a.x, a.y, h.x, h.y) - dist(b.x, b.y, h.x, h.y); }); return l.slice(0, n);
  }
  function proj(G, h, a, spd, o) {
    var p = { x: h.x, y: h.y, vx: cos(a) * spd, vy: sin(a) * spd, dmg: 0, crit: G._crit, r: 8, life: 0.9, pierce: 1, hits: [], kind: 'water', src: h, dtype: 'magic', elem: h.def.elem, col: h.def.color };
    for (var k in o) p[k] = o[k]; G.projs.push(p); return p;
  }
  var A = {}, UL = {};
  var ATK_RANGE = { phyrex: 460, sisi: 400, laosiji: 560, kuanggong: 150, cato: 420, haiteng: 130, yuanzhang: 420, heyuxi: 460, diaoyulao: 460, qinba: 560, traders18: 420 };
  function attackRange(h) { return h.id === 'martin' ? 200 * (1 + 0.4 * U(h, 'u_cmd')) : ATK_RANGE[h.id]; }


  /* ---------- 1 Phyrex：机器人小队 —— 每个机器人各自点射一个目标 ---------- */
  A.phyrex = function (G, h) {
    var bots = 1 + Math.floor(U(h, 'u_bots')), tg = nearestN(G, h, attackRange(h), bots + 1); if (!tg.length) return false;
    h.face = atan2(tg[0].y - h.y, tg[0].x - h.x); h.bots = bots;
    var rig = 1 + U(h, 'u_rig');                        // 数据造假：机器人火力
    G.fx.push({ type: 'chain', pts: [{ x: h.x, y: h.y - 8 }, { x: tg[0].x, y: tg[0].y }], t: 0, max: 0.2, color: h.def.color });
    K().hurtEnemy(G, tg[0], sdmg(G, h, 20), { src: h, kb: 30, fx: h.x, fy: h.y, crit: G._crit, type: 'magic', elem: h.def.elem });
    for (var b = 0; b < bots; b++) {
      var t = tg[(b + 1) % tg.length], bx = h.x + cos(b / bots * PI2 + G.t * 2) * 34, by = h.y + sin(b / bots * PI2 + G.t * 2) * 34;
      G.fx.push({ type: 'chain', pts: [{ x: bx, y: by }, { x: t.x, y: t.y }], t: 0, max: 0.15, color: '#ffd84a' });
      K().hurtEnemy(G, t, sdmg(G, h, 11 * rig), { src: h, kb: 20, fx: bx, fy: by, type: 'magic', elem: h.def.elem });
      if (U(h, 'u_mark') > 0 && !t.dead) { t.pmark = G.t + 6; t.vulnUntil = G.t + 5; t.vulnM = Math.max(t.vulnM || 0, 0.12 * (1 + U(h, 'u_mark'))); t.vulnType = null; }
    }
    return 0.7;
  };
  UL.phyrex = function (G, h) {                         // 每日简报：全屏落雷（诚实清屏样板）
    XY.clearArea(G, h, { name: '每日简报', windup: 0.3, shape: 'screen', elem: h.def.elem, bossDmg: 110, stun: 1.5,
      onLand: function (G2, list) { list.forEach(function (e) { if (e.def.elite) { e.vulnUntil = G2.t + 6; e.vulnM = Math.max(e.vulnM || 0, 0.2); e.vulnType = null; } }); } });
  };

  /* ---------- 2 司司：藤蔓缠绕 + 护盾 ---------- */
  A.sisi = function (G, h) {
    var tg = G.grid.nearest(h.x, h.y, attackRange(h));
    var vine = 1 + U(h, 'u_vine'), gifts = 1 + Math.floor(U(h, 'u_gift')), sh = h.maxHp * 0.06 * (1 + U(h, 'u_shield'));
    var fr = team(G).filter(function (o) { return dist(o.x, o.y, h.x, h.y) < 300; }).sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; });
    for (var i = 0; i < Math.min(gifts, fr.length); i++) { shield(fr[i], sh); K().healHero(G, fr[i], fr[i].maxHp * 0.02, false); }
    if (fr.length) K().ring(G, h.x, h.y, 70, '#79d18a', 0.3, false);
    if (!tg) return fr.length ? 0.9 : false;
    var a = atan2(tg.y - h.y, tg.x - h.x); h.face = a;
    proj(G, h, a, 420, { dmg: sdmg(G, h, 16 * (1 + 0.5 * U(h, 'u_vine'))), kind: 'water', onHit: function (G2, e) { if (!e.def.boss) { e.stunT = Math.max(e.stunT, 0.5 * vine); e.slowT = Math.max(e.slowT, 2); e.slowF = Math.max(e.slowF, 0.4); e.rooted = G2.t + 0.5 * vine; } } });
    return 0.8;
  };
  UL.sisi = function (G, h) {                           // 防钓鱼盾：由内向外的绿环，清屏 + 全队盾 + 治疗
    XY.clearArea(G, h, { name: '防钓鱼盾', windup: 0.25, shape: 'ring', ringT: 0.45, elem: h.def.elem, bossDmg: 80, stun: 1.5,
      onLand: function (G2) { friends(G2).forEach(function (o) { K().healHero(G2, o, o.maxHp * 0.3, true); }); team(G2).forEach(function (o) { shield(o, o.maxHp * 0.25 * (1 + U(h, 'u_shield'))); }); } });
  };

  /* ---------- 3 老司机：多目标火球 + 标记引爆 ---------- */
  A.laosiji = function (G, h) {
    var n = 1 + Math.floor(U(h, 'u_fire')), tg = nearestN(G, h, attackRange(h), n); if (!tg.length) return false;
    h.face = atan2(tg[0].y - h.y, tg[0].x - h.x);
    for (var i = 0; i < n; i++) {
      var t = tg[i % tg.length], a = atan2(t.y - h.y, t.x - h.x) + (tg.length < n ? (i - (n - 1) / 2) * 0.12 : 0);
      proj(G, h, a, 500, { dmg: sdmg(G, h, 24), kind: 'shell_fire', r: 9, life: 1.0, pierce: 0, elem: 'fire', onHit: function (G2, e) { e.fmark = G2.t + 8; e.markT = Math.max(e.markT || 0, 0.01); } });
    }
    return 0.75;
  };
  UL.laosiji = function (G, h) {                        // 翻译一下：清屏 + 精英易伤 + 冲刺位移
    XY.clearArea(G, h, { name: '翻译一下', windup: 0.25, shape: 'screen', elem: h.def.elem, bossDmg: 100, stun: 1.2,
      onLand: function (G2, list) {
        list.forEach(function (e) { if (!XY.isMinion(e)) { e.vulnUntil = G2.t + 8; e.vulnM = Math.max(e.vulnM || 0, 0.3); e.vulnType = null; e.fmark = G2.t + 8; } });
        var d = U(h, 'u_drive'); if (d > 0) { h.inv = Math.max(h.inv, 0.6 * (1 + d)); var t = null, bd = 700; list.forEach(function (x) { var dd = dist(x.x, x.y, h.x, h.y); if (dd < bd) { bd = dd; t = x; } }); if (t) { var a = atan2(t.y - h.y, t.x - h.x), L = 140 * (1 + d); h.x += cos(a) * L; h.y += sin(a) * L; } }
      } });
  };

  /* ---------- 4 矿工：重锤 + 金币 ---------- */
  A.kuanggong = function (G, h) {
    var tg = G.grid.nearest(h.x, h.y, attackRange(h)); if (!tg) return false;
    h.face = atan2(tg.y - h.y, tg.x - h.x); var R = 95 + 55 * U(h, 'u_mine'), px = h.x + cos(h.face) * 50, py = h.y + sin(h.face) * 50;
    K().ring(G, px, py, R, '#c9a36b', 0.3, true); G.shake = Math.max(G.shake, 2);
    var dca = 0.15 * (1 + U(h, 'u_dca')), coins = 0;
    near(G, px, py, R).forEach(function (e) {
      K().hurtEnemy(G, e, sdmg(G, h, 26), { src: h, kb: 260 * (1 + 0.5 * U(h, 'u_mine')), fx: h.x, fy: h.y, crit: G._crit, type: 'phys', elem: 'earth' });
      if (Math.random() < dca) { coin(G, e.x, e.y, 2); coins++; }
    });
    h.coinsMined = (h.coinsMined || 0) + coins;
    return 1.0;
  };
  UL.kuanggong = function (G, h) {                      // 下次一定：地震清屏 + 全队盾 + 金币雨 + 延迟回血（拿住不卖）
    XY.clearArea(G, h, { name: '下次一定', windup: 0.3, shape: 'screen', elem: 'earth', dtype: 'phys', bossDmg: 110, stun: 3,
      onLand: function (G2) {
        var hd = U(h, 'u_hodl');
        team(G2).forEach(function (o) { shield(o, o.maxHp * 0.15 * (1 + hd)); });
        for (var i = 0; i < 10; i++) coin(G2, h.x + (Math.random() - 0.5) * 300, h.y + (Math.random() - 0.5) * 300, 2);
        if (hd > 0) later(G2, 4, function (G3) { friends(G3).forEach(function (o) { K().healHero(G3, o, o.maxHp * 0.12 * (1 + hd), true); }); K().banner(G3, '拿住！持有收益到账', 2); });
      } });
  };

  /* ---------- 5 Cato：五行叠层 ---------- */
  var FIVE = ['water', 'wood', 'fire', 'earth', 'metal'];
  A.cato = function (G, h) {
    var t0 = G.grid.nearest(h.x, h.y, attackRange(h)); if (!t0) return false;
    h.face = atan2(t0.y - h.y, t0.x - h.x);
    var el = FIVE[(h.elIdx = ((h.elIdx || 0) + 1) % 5)], cap = 5 + Math.floor(U(h, 'u_elem')), grow = 1 + Math.min(0.5 * (1 + U(h, 'u_grow')), (h.grow || 0) * 0.01 * (1 + U(h, 'u_grow')));
    h.stk = (h.stk || 0) + 1;
    var hit = [t0], cur = t0, pts = [{ x: h.x, y: h.y - 8 }, { x: t0.x, y: t0.y }];
    for (var n = 0; n < 2; n++) { var best = null, bd = 170; G.grid.query(cur.x, cur.y, 170, function (e) { if (hit.indexOf(e) >= 0) return; var d = dist(cur.x, cur.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }); if (!best) break; hit.push(best); pts.push({ x: best.x, y: best.y }); cur = best; }
    G.fx.push({ type: 'chain', pts: pts, t: 0, max: 0.25, color: XY.ELEMS[el] ? XY.ELEMS[el].color : '#fff' });
    hit.forEach(function (e) { K().hurtEnemy(G, e, sdmg(G, h, 17 * grow), { src: h, kb: 30, fx: h.x, fy: h.y, crit: G._crit, type: 'magic', elem: el }); });
    if (h.stk >= cap) {                                 // 满层：五行爆发
      h.stk = 0; h.bursts = (h.bursts || 0) + 1; K().ring(G, t0.x, t0.y, 220, '#ffd24a', 0.4, true); G.shake = Math.max(G.shake, 3);
      near(G, t0.x, t0.y, 220).forEach(function (e) { K().hurtEnemy(G, e, sdmg(G, h, 55 * grow), { src: h, kb: 120, fx: t0.x, fy: t0.y, stun: 0.6, type: 'magic', elem: el }); });
    }
    return 0.7;
  };
  UL.cato = function (G, h) {                           // 搭框架：由内向外清屏，留下减速水池
    XY.clearArea(G, h, { name: '搭框架', windup: 0.3, shape: 'ring', ringT: 0.45, elem: 'water', bossDmg: 90, stun: 1.5,
      onLand: function (G2, list) {
        var pl = U(h, 'u_pool');
        list.forEach(function (e) { if (!XY.isMinion(e)) { e.vulnUntil = G2.t + 8; e.vulnM = Math.max(e.vulnM || 0, 0.3); e.vulnType = null; } });
        addZone(G2, { kind: 'pool', x: h.x, y: h.y, r: 300 * (1 + 0.5 * pl), t: 6 * (1 + 0.5 * pl), max: 6 * (1 + 0.5 * pl), every: 0.4, color: '#3f8fd8',
          fn: function (G3, z) { near(G3, z.x, z.y, z.r).forEach(function (e) { e.slowT = Math.max(e.slowT, 0.6); e.slowF = Math.max(e.slowF, 0.5); if (pl > 0 && !e.def.boss) { e.stunT = Math.max(e.stunT, 0.35 * pl); e.frozen = G3.t + 0.4; } }); } });
      } });
  };

  /* ---------- 6 腾EO：砸地 + 缩圈 ---------- */
  A.haiteng = function (G, h) {
    var tg = G.grid.nearest(h.x, h.y, attackRange(h)); if (!tg) return false;
    h.face = atan2(tg.y - h.y, tg.x - h.x); var px = h.x + cos(h.face) * 50, py = h.y + sin(h.face) * 50;
    K().ring(G, px, py, 100, h.def.color, 0.3, true); G.shake = Math.max(G.shake, 2);
    near(G, px, py, 100).forEach(function (e) { K().hurtEnemy(G, e, sdmg(G, h, 27), { src: h, kb: 240, fx: h.x, fy: h.y, crit: G._crit, type: 'phys' }); });
    h.swings = (h.swings || 0) + 1;
    if (h.swings % 3 === 0) {                           // 每第 3 下：在身边留一圈缩小的毒圈，外沿的怪被推进来并受伤
      var r0 = 300 * (1 + 0.3 * U(h, 'u_ring')), r1 = 100, T = 2.5, rg = 1 + U(h, 'u_ring');
      addZone(G, { kind: 'shrink', x: h.x, y: h.y, r: r0, t: T, max: T, every: 0.2, color: '#d98a2a',
        fn: function (G2, z) { z.r = r1 + (r0 - r1) * Math.max(0, z.t / z.max); near(G2, z.x, z.y, z.r + 70).forEach(function (e) { var d = dist(e.x, e.y, z.x, z.y); if (d >= z.r - 10) { K().hurtEnemy(G2, e, sdmg(G2, h, 14 * rg), { src: h, kb: 0, dot: true, type: 'magic' }); e.kx += (z.x - e.x) / (d || 1) * 120; e.ky += (z.y - e.y) / (d || 1) * 120; } }); } });
    }
    return 1.0;
  };
  UL.haiteng = function (G, h) {                        // 大逃杀缩圈：外圈先死，向内收拢
    XY.clearArea(G, h, { name: '大逃杀缩圈', windup: 0.3, shape: 'inward', ringT: 0.5, elem: 'metal', dtype: 'phys', bossDmg: 100, stun: 2,
      onLand: function (G2) {
        var w = U(h, 'u_wall'), T = 5 * (1 + w);
        team(G2).forEach(function (o) { shield(o, o.maxHp * 0.2 * (1 + w)); });
        addZone(G2, { kind: 'wall', x: h.x, y: h.y, r: 260, t: T, max: T, every: 0.4, color: '#d98a2a', fn: function (G3, z) { friends(G3).forEach(function (o) { if (dist(o.x, o.y, z.x, z.y) < z.r) { o.wallUntil = G3.t + 0.6; o.wallM = 0.35 + 0.15 * Math.min(2, w); } }); } });
      } });
  };

  /* ---------- 7 园长：亡灵法师（亡灵 = G.allies 里带 ud 的天兵，命令/上限/寿命沿用天兵） ---------- */
  var UD = ['bing', 'gong', 'hun', 'mo'];
  var UDX = { bing: { hp: 1.3, dr: 0.8, dm: 1 }, gong: { hp: 0.7, dm: 0.9, rng: 230 }, hun: { hp: 0.55, dm: 0.6, spd: 1.5, dr: 0.6, slow: 80 }, mo: { hp: 2.4, spd: 0.75, dm: 1.5, dr: 0.7, kb: 80 } };
  XY.UNDEAD = UDX; XY.UNDEAD_KINDS = UD;
  function animals(G) { return G.allies.filter(function (a) { return a.animal && !a.dead; }); }
  function hireAnimal(G, h, x, y, kind) {
    kind = kind || UD[(h.hires || 0) % 4]; var ux = UDX[kind];
    var life = 18, hp = 120 * (h.def.statMul || 1) * ux.hp;
    var a = { x: x, y: y, hp: hp, maxHp: hp, life: life, maxLife: life, atkT: 0.3, mode: 'follow', anchor: null, slot: Math.random() * PI2, def: { r: 12 }, dmgM: 1.4 * ux.dm * (1 + U(h, 'u_pay') * 0.5), ud: kind, dr: ux.dr || 1, spM: ux.spd || 1, rng: ux.rng || 0, slowR: ux.slow || 0, kbF: ux.kb || 0, down: false, dead: false, hurtT: 0, born: 0.4, animal: true, absorb: 20 * (1 + U(h, 'u_hire')) };
    XY.soldierMode(G, a); G.allies.push(a); K().spark(G, x, y, '#ffd24a', 6); return a;
  }
  A.yuanzhang = function (G, h) {
    var tg = G.grid.nearest(h.x, h.y, attackRange(h)), cap = 3 + Math.floor(U(h, 'u_hire')); h.hires = h.hires || 0;
    h.zt = (h.zt || 0) + 1;
    if (h.zt % 3 === 0 && animals(G).length < cap) { hireAnimal(G, h, h.x + (Math.random() - 0.5) * 80, h.y + (Math.random() - 0.5) * 80); h.hires++; K().text(G, h.x, h.y - 30, '唤一只！', 'big'); }
    if (!tg) return animals(G).length < cap ? 0.8 : false;
    h.face = atan2(tg.y - h.y, tg.x - h.x);
    proj(G, h, h.face, 400, { dmg: sdmg(G, h, 18), kind: 'ring', r: 10, pierce: 2, dtype: 'phys', elem: 'wood' });
    return 0.8;
  };
  UL.yuanzhang = function (G, h) {                      // 百鬼夜行：亡灵大军从左往右扫过，清屏 + 招出亡灵
    XY.clearArea(G, h, { name: '百鬼夜行', windup: 0.3, shape: 'sweep', ringT: 0.45, elem: 'wood', dtype: 'phys', bossDmg: 90, stun: 1.5,
      onLand: function (G2, list) {
        var n = Math.min(3 + Math.floor(U(h, 'u_hire')), Math.max(0, 6 - animals(G2).length));
        for (var i = 0; i < n; i++) hireAnimal(G2, h, h.x + cos(i / n * PI2) * 60, h.y + sin(i / n * PI2) * 60, UD[(i + (h.hires || 0)) % 4]);
        h.hires = (h.hires || 0) + n;
        K().ring(G2, h.x, h.y, 320, '#7fe3d0', 0.7, true); K().spark(G2, h.x, h.y, '#bff5ea', 18);
        list.forEach(function (e) { if (e.def.elite) { e.vulnUntil = G2.t + 6; e.vulnM = Math.max(e.vulnM || 0, 0.2); e.vulnType = null; } });
      } });
  };

  /* ---------- 8 何雨溪：声波 ---------- */
  A.heyuxi = function (G, h) {
    var tg = G.grid.nearest(h.x, h.y, attackRange(h)); if (!tg) return false;
    var a = atan2(tg.y - h.y, tg.x - h.x), w = 1 + 0.6 * U(h, 'u_wave'), road = U(h, 'u_road'); h.face = a;
    proj(G, h, a, 380, { dmg: sdmg(G, h, 17 * (1 + 0.4 * U(h, 'u_wave'))), kind: 'wave', r: 18 * w, life: 0.95, pierce: 6 + Math.floor(U(h, 'u_wave') * 4), col: '#ff8fc0',
      onHit: road > 0 ? function (G2, e) { e.vulnUntil = G2.t + 4; e.vulnM = Math.max(e.vulnM || 0, 0.25 * (1 + road)); e.vulnType = null; } : null });
    if (U(h, 'u_wave') >= 1) proj(G, h, a + Math.PI, 300, { dmg: sdmg(G, h, 10), kind: 'wave', r: 14 * w, life: 0.6, pierce: 4, col: '#ff8fc0' });
    return 0.8;
  };
  UL.heyuxi = function (G, h) {                         // 新歌上线：两波声浪清屏 + 全队咖啡因
    XY.clearArea(G, h, { name: '新歌上线', windup: 0.25, shape: 'waves', elem: 'fire', bossDmg: 90, stun: 1.2,
      onLand: function (G2) {
        var cf = U(h, 'u_caf'), T = 6 * (1 + cf);
        friends(G2).forEach(function (o) { o.coffeeUntil = G2.t + T; o.caffUntil = G2.t + T; o.caffM = 1.15 + 0.15 * cf; });
        K().banner(G2, '新歌上线！全队咖啡因 ' + T.toFixed(0) + ' 秒', 2);
      } });
  };

  /* ---------- 9 钓鱼佬：拉钩 ---------- */
  A.diaoyulao = function (G, h) {
    var n = 1 + Math.floor(U(h, 'u_hooks')), tg = nearestN(G, h, attackRange(h), n); if (!tg.length) return false;
    h.face = atan2(tg[0].y - h.y, tg[0].x - h.x); var luck = Math.min(0.9, 0.12 * (1 + 2 * U(h, 'u_luck')));
    for (var i = 0; i < n; i++) {
      var t = tg[i % tg.length], a = atan2(t.y - h.y, t.x - h.x);
      proj(G, h, a, 560, { dmg: sdmg(G, h, 15), kind: 'arrow', r: 8, life: 0.8, pierce: 0, dtype: 'phys', elem: 'water', col: '#6fd0ff',
        onHit: function (G2, e) {
          if (!e.def.boss && !e.def.etower) { var d = dist(e.x, e.y, h.x, h.y) || 1, s = Math.min(130, d * 0.6); e.x -= (e.x - h.x) / d * s; e.y -= (e.y - h.y) / d * s; h.pulls = (h.pulls || 0) + 1; }
          if (Math.random() < luck) { K().hurtEnemy(G2, e, sdmg(G2, h, 30), { src: h, kb: 0, type: 'phys', crit: true }); K().text(G2, e.x, e.y - 20, '中大鱼！', 'big'); h.bigFish = (h.bigFish || 0) + 1; }
        } });
    }
    return 0.85;
  };
  UL.diaoyulao = function (G, h) {                      // 猪脚饭：渔网把怪拽到身边，一网打尽 + 留下野营圈
    XY.clearArea(G, h, { name: '猪脚饭', windup: 0.3, shape: 'pull', elem: 'water', bossDmg: 90, stun: 2,
      onLand: function (G2) {
        var sv = U(h, 'u_surv'), T = 4 * (1 + sv);
        addZone(G2, { kind: 'camp', x: h.x, y: h.y, r: 220, t: T, max: T, every: 0.5, color: '#6fd0ff',
          fn: function (G3, z) { friends(G3).forEach(function (o) { if (dist(o.x, o.y, z.x, z.y) < z.r) K().healHero(G3, o, o.maxHp * 0.03 * (1 + sv), false); }); if (z.t - 0.5 <= 0 && sv > 0) near(G3, z.x, z.y, z.r).forEach(function (e) { K().hurtEnemy(G3, e, sdmg(G3, h, 40 * sv), { src: h, kb: 200, fx: z.x, fy: z.y, stun: 1, type: 'magic' }); }); } });
      } });
  };

  /* ---------- 10 马丁：号令 ---------- */
  A.martin = function (G, h) {
    var R = attackRange(h), es = near(G, h.x, h.y, R), al = friends(G).filter(function (o) { return o !== h && dist(o.x, o.y, h.x, h.y) < R; });
    if (!es.length && !al.length) return false;
    if (es.length) h.face = atan2(es[0].y - h.y, es[0].x - h.x);
    K().ring(G, h.x, h.y, R, '#8fb8ff', 0.3, false);
    es.forEach(function (e) { K().hurtEnemy(G, e, sdmg(G, h, 15), { src: h, kb: 70, fx: h.x, fy: h.y, type: 'magic', elem: h.def.elem }); });
    var cmd = 1 + U(h, 'u_cmd'), eco = U(h, 'u_eco');
    al.forEach(function (o) { o.cmdUntil = G.t + 3; o.cmdM = 1.15 + 0.1 * cmd; if (eco > 0 && o.id !== 'tang') shield(o, o.maxHp * 0.03 * (1 + eco)); });
    G.allies.forEach(function (a) { if (!a.dead && dist(a.x, a.y, h.x, h.y) < R) a.hasteUntil = G.t + 3; });
    if (eco > 0 && es.length) coin(G, h.x, h.y, Math.ceil(eco * 1.5));
    return 0.9;
  };
  UL.martin = function (G, h) {                         // GM 早安：全屏清场 + 全队治疗 + 全队加速加攻速
    XY.clearArea(G, h, { name: 'GM 早安', windup: 0.35, shape: 'screen', elem: h.def.elem, bossDmg: 90, stun: 1.5,
      onLand: function (G2) {
        var cmd = 1 + U(h, 'u_cmd');
        friends(G2).forEach(function (o) { K().healHero(G2, o, o.maxHp * 0.3, true); o.gmUntil = G2.t + 8 * cmd; o.cmdUntil = G2.t + 8 * cmd; o.cmdM = 1.25; });
        G2.allies.forEach(function (a) { if (!a.dead) a.hasteUntil = G2.t + 8 * cmd; });
        if (U(h, 'u_eco') > 0) coin(G2, h.x, h.y, 6 * (1 + U(h, 'u_eco')));
      } });
  };

  /* ---------- 11 秦巴：预判落雷 ---------- */
  A.qinba = function (G, h) {
    var n = 1 + Math.floor(U(h, 'u_pred')), tg = nearestN(G, h, attackRange(h), n); if (!tg.length) return false;
    h.face = atan2(tg[0].y - h.y, tg[0].x - h.x); var delay = Math.max(0.35, 0.75 - 0.08 * U(h, 'u_pred'));
    tg.forEach(function (t) {
      var sp = t.def.speed || 60, d = dist(t.x, t.y, h.x, h.y) || 1, px = t.x + (h.x - t.x) / d * sp * delay * 0.8, py = t.y + (h.y - t.y) / d * sp * delay * 0.8;   // 预判：怪朝我方走，落点放在它前面
      G.fx.push({ type: 'ring', x: px, y: py, r: 70, t: 0, max: delay, color: '#9a8aff', fill: false });
      later(G, delay, function (G2) {
        if (G2.mode !== 'play') return; var hitn = 0;
        G2.fx.push({ type: 'bolt', x: px, y: py, t: 0, max: 0.35, color: '#b8a8ff' });
        near(G2, px, py, 75).forEach(function (e) { hitn++; K().hurtEnemy(G2, e, sdmg(G2, h, 36), { src: h, kb: 80, fx: px, fy: py - 30, type: 'magic', elem: 'metal', stun: 0.3 }); });
        if (!hitn) { h.misses = (h.misses || 0) + 1; var rv = U(h, 'u_rev'); if (rv > 0) { h.atkT = 0; friends(G2).forEach(function (o) { o.coffeeUntil = Math.max(o.coffeeUntil || 0, G2.t + 2 * (1 + rv)); }); K().text(G2, h.x, h.y - 30, '复盘：冷却返还', 'big'); } }
        else h.strikes = (h.strikes || 0) + 1;
      });
    });
    return 0.8;
  };
  UL.qinba = function (G, h) {                          // Runner：冲锋道——向前冲出一条横带，带内全部清空
    XY.clearArea(G, h, { name: 'Runner', windup: 0.2, shape: 'lane', ringT: 0.35, laneH: 240, dash: 200, elem: 'metal', bossDmg: 100, stun: 1.5,
      onLand: function (G2) { h.runT = 5 + 2 * U(h, 'u_run'); } });
  };

  /* ---------- 12 18 号交易员：催眠阵 ---------- */
  A.traders18 = function (G, h) {
    var tg = G.grid.nearest(h.x, h.y, attackRange(h)); if (!tg) return false;
    h.face = atan2(tg.y - h.y, tg.x - h.x);
    var cap = 1 + Math.floor(U(h, 'u_array')), sl = U(h, 'u_sleep'), vile = U(h, 'u_vile');
    var mine = (G.spz || []).filter(function (z) { return z.kind === 'sleep' && z.owner === h; });
    if (mine.length >= cap) mine.sort(function (a, b) { return a.t - b.t; })[0].t = 0;       // 阵数到上限：最老的撤掉
    var z = addZone(G, { kind: 'sleep', owner: h, x: tg.x, y: tg.y, r: 95, t: 4, max: 4, every: 0.4, color: '#9a7cd8',
      fn: function (G2, zz) {
        near(G2, zz.x, zz.y, zz.r).forEach(function (e) {
          if (!e.def.boss) { e.stunT = Math.max(e.stunT, 0.8 * (1 + sl)); }
          e.sleepUntil = G2.t + 0.8 * (1 + sl); e.vulnUntil = G2.t + 1.2; e.vulnM = Math.max(e.vulnM || 0, 0.15 * (1 + sl)); e.vulnType = null;
          K().hurtEnemy(G2, e, sdmg(G2, h, 5 * (1 + vile)), { src: h, dot: true, type: 'magic' });      // 阵内持续伤害（u_vile 加成）
        });
      } });
    h.arrays = Math.max(h.arrays || 0, mine.length + 1);
    K().ring(G, tg.x, tg.y, 95, '#9a7cd8', 0.3, false);
    return 1.0;
  };
  UL.traders18 = function (G, h) {                      // 道人打盹：全屏睡着，2.2 秒后一睁眼全部结算
    XY.clearArea(G, h, { name: '道人打盹', windup: 0.25, shape: 'sleep', delay: 2.2, elem: 'wood', bossDmg: 80, stun: 2.2,
      onLand: function (G2, list) { K().banner(G2, '全体入睡……', 2); } });
  };

  /* ---------- 自动放大招的时机 ---------- */
  function want(G, h) {
    var R = XY.viewRect(G, 0), c = 0, boss = false, i, e;
    for (i = 0; i < G.enemies.length; i++) { e = G.enemies[i]; if (e.dead) continue; if (e.x >= R.x0 && e.x <= R.x1 && e.y >= R.y0 && e.y <= R.y1) { if (XY.isMinion(e)) c++; else if (e.def.boss && dist(e.x, e.y, h.x, h.y) < 520) boss = true; } }
    if (h.id === 'sisi') { var low = 0; friends(G).forEach(function (o) { if (o.hp < o.maxHp * 0.55) low++; }); if (low >= 2) return true; }
    return c >= 16 || (boss && c >= 3);
  }

  /* ---------- 钩子：击杀 / 伤害 / 攻速 / 受伤 ---------- */
  var oldKill = XY.spsupKill;
  XY.spsupKill = function (G, e, o) {
    if (oldKill) oldKill(G, e);
    var ph = hero(G, 'phyrex'); if (ph && e.pmark > G.t && U(ph, 'u_mark') > 0) coin(G, e.x, e.y, Math.ceil(2 * U(ph, 'u_mark')));
    var ls = hero(G, 'laosiji');
    if (ls && e.fmark > G.t && !e._boom) {              // 标记引爆：被火球标记的怪死时爆炸（u_markx 加半径和伤害）
      e._boom = true; var mx = U(ls, 'u_markx'), R = 80 + 40 * mx; K().ring(G, e.x, e.y, R, '#ff7a3c', 0.3, true);
      ls.booms = (ls.booms || 0) + 1;
      near(G, e.x, e.y, R).forEach(function (x) { if (x !== e) K().hurtEnemy(G, x, sdmg(G, ls, 14 * (1 + mx)), { src: ls, kb: 90, fx: e.x, fy: e.y, type: 'magic', elem: 'fire' }); });
    }
    var ct = hero(G, 'cato'); if (ct && o && o.src === ct) ct.grow = (ct.grow || 0) + 1;
    var yz = hero(G, 'yuanzhang');
    if (yz) { var lp = U(yz, 'u_loot'); if (lp > 0) for (var i = 0; i < G.allies.length; i++) { var a = G.allies[i]; if (a.animal && !a.dead && dist(a.x, a.y, e.x, e.y) < 170) { coin(G, e.x, e.y, Math.ceil(lp * 1.5)); yz.loots = (yz.loots || 0) + 1; break; } } }
    var td = hero(G, 'traders18'); if (td && e.sleepUntil > G.t && U(td, 'u_vile') > 0) { coin(G, e.x, e.y, Math.ceil(U(td, 'u_vile') * 2)); td.vileCoins = (td.vileCoins || 0) + 1; }
  };
  var oldDmg = XY.spsupDmg;
  XY.spsupDmg = function (G, h, d) {
    d = oldDmg(G, h, d);
    if (h.caffUntil > G.t) d *= h.caffM || 1.15;
    if (h.cmdUntil > G.t) d *= h.cmdM || 1.15;
    return d;
  };
  var oldAS = XY.spsupAtkSpd;
  XY.spsupAtkSpd = function (G, h) { var m = oldAS(G, h); if (h.cmdUntil > G.t) m *= 1 + (h.cmdM - 1) * 0.5; return m; };
  var oldPre = XY.spsupPre;
  XY.spsupPre = function (G, h, dmg) {
    dmg = oldPre(G, h, dmg);
    if (dmg > 0 && h.wallUntil > G.t) dmg *= 1 - (h.wallM || 0.35);
    return dmg;
  };

  Object.keys(A).forEach(function (id) { var f = A[id]; A[id] = function (G, h) { var r = f(G, h); if (r !== false) h.casts = (h.casts || 0) + 1; return r; }; });     // 每个独有普攻都记次数（测试用）
  XY.SP12 = { attackRange: attackRange, atk: A, ult: UL, want: want, FIVE: FIVE, KEYS: ['u_bots', 'u_mark', 'u_rig', 'u_shield', 'u_gift', 'u_vine', 'u_fire', 'u_markx', 'u_drive', 'u_mine', 'u_dca', 'u_hodl', 'u_elem', 'u_grow', 'u_pool', 'u_wall', 'u_ring', 'u_rev', 'u_hire', 'u_pay', 'u_loot', 'u_wave', 'u_caf', 'u_road', 'u_hooks', 'u_luck', 'u_surv', 'u_cmd', 'u_eco', 'u_vet', 'u_pred', 'u_run', 'u_rev', 'u_array', 'u_sleep', 'u_vile'] };
})();
