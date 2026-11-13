/* ============================================================
 * villain_run.js —— v0.9 反派关（牛魔王守芭蕉洞）：复用第 1 关的地图 / 怪 / 波次，只有牛魔王一人，唐僧 = 看不见的洞府阵眼。
 *  规则见 /workspace/villain/design.md §1 §16.1 §16.3。入口：XY.villain.start()（main.js 的 startVillain）。
 *  三招全自动放（芭蕉扇 / 冲撞 / 召小妖），玩家只用方向键（或摇杆）走位。金币 → 妖金（×1.15），掉落进化素材 / 妖丹 / 陷阱。
 *  结算由本文件包住 XY.save.commitRun：G.villain → 妖金 / 素材 / 星级；不发灵石，不记第 1 关通关。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, VD = XY.VD, K = XY.core, PI2 = Math.PI * 2, cos = Math.cos, sin = Math.sin, atan2 = Math.atan2, sqrt = Math.sqrt;
  var V = XY.villain = XY.villain || {};
  V.stub = false;
  function dist(a, b, c, d) { return XY.dist(a, b, c, d); }
  function app() { return window.__xy && window.__xy.app; }

  /* ---------- 关卡对象：第 1 关的克隆（同图同怪），去掉岔路 / 被困者 / 支线 ---------- */
  XY.villainLevel = function () {
    var b = XY.LEVELS[0], L = {}, k;
    for (k in b) L[k] = b[k];
    L.name = '芭蕉洞 · 守洞'; L.sub = '牛魔王守住洞府'; L.alt = null; L.captives = []; L.sides = [];
    L.rate = b.rate * VD.STAGE.cntK; L.swarmN = Math.round(b.swarmN * VD.STAGE.cntK);
    L.main = { type: 'hold', text: '守住芭蕉洞，别让取经人攻破洞府', short: '守住洞府' };
    L.villain = true; return L;
  };
  V.heroDef = function () {
    var H = VD.STAGE.hero;
    return { id: 'niumo', dtype: 'phys', elem: 'earth', pdef: H.dr, mdef: H.dr, name: '牛魔王', color: '#6f4aa8', dark: '#3e2a66', accent: '#d9b24a', hp: H.hp, speed: H.speed, r: 24,
      weapon: '混铁棍', wdesc: '近身挥棍，带溅射', ult: '', udesc: '', ultCd: 1e9, villain: true };
  };

  /* ---------- 开局 ---------- */
  V.init = function (G) {
    var n = G.heroes[1], eye = G.heroes[0], v = G.villain;
    v.t0 = Date.now(); v.sk = { fan: { cd: 6, idle: 0 }, charge: { cd: 0, idle: 0 }, summon: { cd: 10, idle: 0 } };    // 开局给点冷却，别一上来就乱放
    v.last = -9; v.casts = { fan: 0, charge: 0, summon: 0 }; v.manual = 0; v.manualOnly = true; v.input = { keys: 0, other: 0, mouse: 0, ui: 0 };
    v.mats = {}; v.yaodan = 0; v.traps = []; v.chests = 0; v.hist = []; v.eyeHits = 0; v.eyeLost = 0; v.lastEyeHit = -9; v.gap = 0; v.restT = 0; v.caveMin = 1; v.growLv = 1; v.lvUps = 0;
    v.startedDay = VD.today(); v.sim = false;
    G.noSpecial = true; G.autoPoints = false; G.sky.left = 0; G.sky.cd = 1e9;
    G.camp.maxHp = VD.STAGE.caveHp; G.camp.hp = G.camp.maxHp;
    n.ultCd = 1e9; n.order = 'guard'; G.ctrl = 1;
    G.cam.x = n.x; G.cam.y = n.y;
    eye.invisible = true; eye.inv = 0;
    if (!window.XY_NO_VTIP && app() && XY.villainUI) XY.villainUI.tipOnce('villain', G);
  };

  /* ---------- 洞府血条（阵眼受伤）：接触 60 / 远程 30 / Boss 200 ---------- */
  V.hurtEye = function (G, h, dmg, contact, cause) {
    var S = VD.STAGE, v = G.villain; if (!v || G.ending || G.godMode) return;
    var d = cause ? S.boss : contact ? S.contact : (dmg >= S.bossThr ? S.boss : S.ranged);
    if (contact && G.t - (v.eyeGap || -9) < S.hitGap) return;         // 一堆怪同时咬：每 hitGap 秒最多记一口（0.4 秒 → 洞府每秒最多掉 ~150）
    if (contact) v.eyeGap = G.t;
    v.by = v.by || {}; var bk = cause ? 'cause' : contact ? 'contact' : d >= S.boss ? 'boss' : 'ranged'; v.by[bk] = (v.by[bk] || 0) + d;
    var c = G.camp; c.hp -= d; c.hurtT = 0.2; G.campAlert = 2; v.lastEyeHit = G.t; v.eyeHits++; v.eyeLost += d;
    if (XY.vfx && G.t - (v.fxT || -9) > 0.3) { v.fxT = G.t; K.ring(G, h.x, h.y, 50, '#d62828', 0.4); }
    K.text(G, h.x, h.y - 30, '洞府 -' + d, 'hurt');
    if (c.hp <= 0) { c.hp = 0; if (!G.ending) G.ending = { kind: 'lose', cause: 'cave', why: '洞府血条被打光了', reason: '洞府失守：血条被打光了', t: 1.5 }; }
  };
  V.heroDown = function (G, h) {
    if (h.id === 'niumo' && !G.ending) G.ending = { kind: 'lose', cause: 'niumo', why: '牛魔王倒下了', reason: '牛魔王倒下了', t: 1.5 };
  };

  /* ---------- 牛魔王普攻：棍 38 / 1.0 秒，近身 + 35% 溅射 ---------- */
  V.atk = function (G, h, dt) {
    var H = VD.STAGE.hero, v = G.villain;
    h.atkT -= dt; if (h.atkT > 0) return;
    var tgt = G.grid.nearest(h.x, h.y, 130);
    if (!tgt) { h.atkT = 0.05; return; }
    var dm = H.atk * (v.dmgK || 1) * (1 + (VD.STAGE.hero.lvK || 0.06) * (G.level - 1)) * H.dmgK, ang = atan2(tgt.y - h.y, tgt.x - h.x);
    h.face = ang;
    K.hurtEnemy(G, tgt, dm, { src: h, kb: 140, fx: h.x, fy: h.y, fb: true });
    G.grid.query(tgt.x, tgt.y, H.splashR, function (e) { if (e !== tgt && !e.dead) K.hurtEnemy(G, e, dm * H.splash, { src: h, kb: 60, fx: tgt.x, fy: tgt.y, fb: true }); });
    G.fx.push({ type: 'arc', x: h.x, y: h.y, ang: ang, range: 110, arc: 1.6, t: 0, max: 0.2, color: '#a98bd8', owner: h });
    h.atkT = h.atkMax = H.atkGap / (h.atkSpd * G.P.spd);
  };

  /* ---------- 三招自动放 ---------- */
  function nearList(G, x, y, r) { var a = []; G.grid.query(x, y, r, function (e) { if (!e.dead && !e.hidden) a.push(e); }); return a; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return Math.abs(d); }
  function fanScan(G, h) {
    var S = VD.SK.fan, es = nearList(G, h.x, h.y, S.r), best = -1, bc = 0, k, i, half = S.arc / 2 * Math.PI / 180;
    for (k = 0; k < 12; k++) {
      var a = k * Math.PI / 6, c = 0;
      for (i = 0; i < es.length; i++) if (angDiff(atan2(es[i].y - h.y, es[i].x - h.x), a) <= half) c++;
      if (c > bc) { bc = c; best = a; }
    }
    return { ang: best, n: bc, all: es.length };
  }
  function chargeScan(G, h) {
    var S = VD.SK.charge, es = nearList(G, h.x, h.y, S.dist + 60), best = null, bc = 0, k, i, elite = null;
    for (k = 0; k < 24; k++) {
      var a = k * Math.PI / 12, ca = cos(a), sa = sin(a), c = 0, el = null;
      for (i = 0; i < es.length; i++) {
        var dx = es[i].x - h.x, dy = es[i].y - h.y, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca);
        if (al > 0 && al < S.dist + es[i].r && pe < S.w / 2 + es[i].r) { c++; if ((es[i].def.elite || es[i].def.boss) && es[i].hp < es[i].maxHp * VD.AUTO.execHp) el = es[i]; }
      }
      if (c > bc) { bc = c; best = a; }
      if (el && (!elite || c > elite.n)) elite = { a: a, n: c };
    }
    return { ang: best, n: bc, elite: elite };
  }
  function doFan(G, h, ang) {
    var S = VD.SK.fan, half = S.arc / 2 * Math.PI / 180, es = nearList(G, h.x, h.y, S.r), dm = S.dmg * (G.villain.dmgK || 1) * (1 + (VD.STAGE.hero.lvK || 0.06) * (G.level - 1)) * VD.STAGE.hero.dmgK;
    h.face = ang;
    es.forEach(function (e) {
      if (angDiff(atan2(e.y - h.y, e.x - h.x), ang) > half) return;
      K.hurtEnemy(G, e, dm, { src: h, kb: S.kb * 8, fx: h.x, fy: h.y, fb: true, type: 'magic' });
      e.slowT = Math.max(e.slowT, S.slowT); e.slowF = Math.max(e.slowF, e.def.boss ? S.slow * 0.5 : S.slow);
    });
    G.fx.push({ type: 'arc', x: h.x, y: h.y, ang: ang, range: S.r, arc: S.arc * Math.PI / 180, t: 0, max: 0.5, color: '#8fd3a4', owner: h });
    K.ring(G, h.x + cos(ang) * 100, h.y + sin(ang) * 100, 120, '#bfe8cc', 0.5, true); G.shake = Math.max(G.shake, 5);
    if (XY.sfx) XY.sfx('vfan');
  }
  function doCharge(G, h, ang) {
    var S = VD.SK.charge, T = 0.4, dm = S.dmg * (G.villain.dmgK || 1) * (1 + (VD.STAGE.hero.lvK || 0.06) * (G.level - 1)) * VD.STAGE.hero.dmgK / (C.HERO_DMG_MUL || 1);   // dash 走 heroDmg + HERO_DMG_MUL，这里补回，让 90 就是 90
    h.face = ang; h.inv = Math.max(h.inv, T + 0.1);
    h.dash = { t: T, dx: cos(ang), dy: sin(ang), speed: S.dist / T, id: G.nextId++, dmg: dm, kb: 900, stun: 0.3, col: '#c9a0ff' };
    K.ring(G, h.x, h.y, 70, '#c9a0ff', 0.4, true); if (XY.sfx) XY.sfx('vcharge');
  }
  function doSummon(G, h) {
    var S = VD.SK.summon, i, base = XY.VD.STAGE;
    for (i = 0; i < S.n; i++) {
      var a = i / S.n * PI2 + 0.5, dmgM = S.dmg / C.SKY_DMG;
      var m = { x: h.x + cos(a) * 60, y: h.y + sin(a) * 60, hp: S.hp, maxHp: S.hp, life: S.life, maxLife: S.life, atkT: 0.3, mode: 'follow', anchor: null, slot: a, def: { r: 12 }, dmgM: dmgM, down: false, dead: false, hurtT: 0, born: 0.5, vmin: true };
      XY.soldierMode(G, m); G.allies.push(m); K.spark(G, m.x, m.y, '#b79ae0', 8);
    }
    K.ring(G, h.x, h.y, 110, '#b79ae0', 0.6, true); if (XY.sfx) XY.sfx('vsummon');
  }
  var DO = { fan: function (G, h, a) { doFan(G, h, a); }, charge: function (G, h, a) { doCharge(G, h, a); }, summon: function (G, h) { doSummon(G, h); } };
  function cast(G, v, h, id, ang, why) {
    DO[id](G, h, ang); v.sk[id].cd = VD.SK[id].cd; v.sk[id].idle = 0; v.last = G.t; v.casts[id]++; v.lastWhy = id + ':' + why;
    K.text(G, h.x, h.y - 46, VD.SK[id].name + '！', 'big');
  }
  function autoCast(G, v, h, dt) {
    var A = VD.AUTO, eye = G.heroes[0], k;
    for (k in v.sk) { if (v.sk[k].cd > 0) v.sk[k].cd -= dt; if (v.sk[k].cd <= 0) v.sk[k].idle += dt; }
    if (h.down || h.dash || G.ending || G.mode !== 'play' || G.tut || G.cut) return;
    if (G.t - v.last < A.gap) return;
    if (v.restT > 0) return;                                                // 刚到休息点那一两秒（提示条 / 站定）不放
    if (v.manualOnly) return;
    v.scanT = (v.scanT || 0) - dt; if (v.scanT > 0) return; v.scanT = 0.12;
    var rdy = function (id) { return v.sk[id].cd <= 0; };
    var dEye = dist(h.x, h.y, eye.x, eye.y), cs = null, fs = null;
    if (rdy('charge')) {
      cs = chargeScan(G, h);
      var near = null, nd = A.eyeR;
      G.grid.query(eye.x, eye.y, A.eyeR, function (e) { if (!e.dead && !e.hidden) { var d = dist(e.x, e.y, h.x, h.y); if (d > 200 && (!near || d < nd + 9999)) near = e; } });
      if (near) { cast(G, v, h, 'charge', atan2(near.y - h.y, near.x - h.x), 'rescue'); return; }          // ③ 救阵眼（最优先）
    }
    if (rdy('fan')) {
      fs = fanScan(G, h);
      var eyeN = 0; if (dEye < 300) G.grid.query(eye.x, eye.y, VD.SK.fan.r, function (e) { if (!e.dead) eyeN++; });
      var low = h.hp < h.maxHp * A.lowHp && nearList(G, h.x, h.y, 150).length >= 3;
      if (fs.ang >= 0 && (fs.n >= A.fanN || (eyeN >= A.fanEye && fs.n >= 1) || (low && fs.n >= 1))) { cast(G, v, h, 'fan', fs.ang, fs.n >= A.fanN ? 'sector' : eyeN >= A.fanEye ? 'eye' : 'low'); return; }
    }
    if (rdy('summon')) {
      var n4 = nearList(G, h.x, h.y, 400).length, drop = v.hist.length && (v.hist[0] - G.camp.hp) > G.camp.maxHp * A.campDrop, hit = G.t - v.lastEyeHit < 1.0 && dEye < 500;
      if (n4 >= A.sumN || drop || hit) { cast(G, v, h, 'summon', 0, n4 >= A.sumN ? 'crowd' : drop ? 'drop' : 'eye'); return; }
    }
    if (cs && (cs.n >= A.chargeN || (cs.elite && cs.elite.n >= 1))) { cast(G, v, h, 'charge', cs.n >= A.chargeN ? cs.ang : cs.elite.a, cs.n >= A.chargeN ? 'line' : 'exec'); return; }
    // 保底：冷却好 6 秒仍没条件，300 内有怪就放
    var any = nearList(G, h.x, h.y, 300);
    if (any.length) {
      var tgt = any[0], td = 1e9; any.forEach(function (e) { var d = dist(e.x, e.y, h.x, h.y); if (d < td) { td = d; tgt = e; } });
      var ta = atan2(tgt.y - h.y, tgt.x - h.x);
      for (k in { charge: 1, fan: 1, summon: 1 }) if (rdy(k) && v.sk[k].idle >= A.idle) { cast(G, v, h, k, ta, 'idle'); return; }
    }
  }
  V.castByPlayer = function (G, id) {
    var v = G.villain, h = G.heroes && G.heroes[1];
    if (!v || !h || h.down || G.mode !== 'play' || G.ending) return { ok: false, reason: '现在不能放' };
    if (!v.sk || !v.sk[id] || !VD.SK[id]) return { ok: false, reason: '没有这招' };
    if (v.sk[id].cd > 0) return { ok: false, reason: VD.SK[id].name + ' 还要 ' + Math.ceil(v.sk[id].cd) + ' 秒' };
    var ang = h.face || 0, tgt = null, bd = 1e9;
    if (G.grid) G.grid.query(h.x, h.y, 420, function (e) { if (!e || e.dead) return; var d = dist(e.x, e.y, h.x, h.y); if (d < bd) { bd = d; tgt = e; } });
    if (tgt) ang = atan2(tgt.y - h.y, tgt.x - h.x);
    cast(G, v, h, id, ang, 'hand');
    v.manual = (v.manual || 0) + 1;
    return { ok: true };
  };

  /* ---------- 每帧 ---------- */
  V.update = function (G, dt) {
    var v = G.villain, h = G.heroes[1], eye = G.heroes[0], S = VD.STAGE, i;
    if (!v) return;
    if (G.tang.phase === 'rest') { if (v.prevPh !== 'rest') v.restT = 1.5; } v.prevPh = G.tang.phase; if (v.restT > 0) v.restT -= dt;
    // 阵眼不死、不现身
    eye.hp = 1; eye.down = false;
    // 牛魔王：升级成长 + 记血量
    var wantHp = Math.round(S.hero.hp * (1 + 0.03 * Math.min(G.level - 1, 40)));
    if (!h.down && h.maxHp !== wantHp) { h.hp += wantHp - h.maxHp; h.maxHp = wantHp; }
    if (G.ending) return;
    if (!h.down && h.hp < h.maxHp && S.hero.regen) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * S.hero.regen * dt);       // 牛魔王自己慢慢回血
    // 洞府血条：6 秒没被打 → 自己回血
    if (G.t - v.lastEyeHit > S.regenAfter && G.camp.hp < G.camp.maxHp) G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + S.regen * dt);
    v.histT = (v.histT || 0) - dt; if (v.histT <= 0) { v.histT = 1; v.hist.push(G.camp.hp); if (v.hist.length > 5) v.hist.shift(); }
    var frac = G.camp.hp / G.camp.maxHp; if (frac < v.caveMin) v.caveMin = frac;
    // 小妖：嘲讽附近的怪
    for (i = 0; i < G.allies.length; i++) {
      var m = G.allies[i]; if (!m.vmin || m.dead) continue;
      G.grid.query(m.x, m.y, 240, function (e) { if (!e.def.boss && !e.def.etower && !e.dead) { e.vtaunt = m; e.vtauntT = G.t + 0.5; } });
    }
    autoCast(G, v, h, dt);
  };

  /* ---------- 升级：只有牛魔王自己变强，没有技能点 / 三选一 ---------- */
  V.levelUp = function (G, who) {
    var h = G.heroes[1], v = G.villain; if (!h || h.down) return;
    v.lvUps++; var add = (h.maxHp - h.hp) * 0.5; h.hp = Math.min(h.maxHp, h.hp + add);
    K.ring(G, h.x, h.y, 46, '#7fe39a', 0.55, true); K.banner(G, '牛魔王升到 Lv' + G.level + '：更强了', 1.4);
    if (XY.sfx) XY.sfx('level');
  };

  /* ---------- 掉落：素材 ---------- */
  V.onKill = function (G, e, o) {
    var v = G.villain, d = e.def, id = VD.FROM[e.type], M = id && VD.MATS[id];
    if (M && !M.boss && Math.random() < M.p) V.addMat(G, id, e);
    else if (d.elite && Math.random() < 0.05) V.addMat(G, 'xiongdan', e);
    v.kills = (v.kills || 0) + 1;
  };
  V.addMat = function (G, id, e) {
    var v = G.villain; v.mats[id] = (v.mats[id] || 0) + 1;
    K.text(G, e.x, e.y - 20, '+' + VD.MATS[id].name, 'big');
    if (!G.matFx) G.matFx = []; G.matFx.push({ id: id, t: 0, x: e.x, y: e.y });
  };
  V.onBoss = function (G, e) {                                           // 洞主第一次败退：保底 1 个独门素材 + 1 妖丹
    var v = G.villain, id = e.type === 'bear' ? 'xiongdan' : e.type === 'bone' ? 'gufu' : null;
    if (id) V.addMat(G, id, e);
    v.yaodan++; K.text(G, e.x, e.y - 40, '+妖丹', 'big');
  };
  V.redPacket = function (G) {                                           // 宝箱 → 红包：金币 + 妖丹 + 一件陷阱（自动到手，不用跑过去）
    var v = G.villain, h = G.heroes[1], i, r = VD.rng((v.chests + 1) * 7919 + (G.levelId | 0));
    v.chests++; v.yaodan++;
    for (i = 0; i < 12; i++) G.coinDrops.push({ x: h.x + (r() - 0.5) * 120, y: h.y + (r() - 0.5) * 120, v: VD.STAGE.chestCoins / 12, mag: h });
    var tot = 0, pick = r(), acc = 0, id = 'bantou'; VD.TRAP_ORDER.forEach(function (k) { tot += VD.TRAPS[k].w; });
    pick *= tot; VD.TRAP_ORDER.forEach(function (k) { acc += VD.TRAPS[k].w; if (pick >= acc - VD.TRAPS[k].w && pick < acc) id = k; });
    v.traps.push(id);
    K.banner(G, '红包！金币 +' + VD.STAGE.chestCoins + '、妖丹 +1、陷阱「' + VD.TRAPS[id].name + '」', 2.6); K.ring(G, h.x, h.y, 100, '#e8b84a', 0.6, true);
    if (XY.sfx) XY.sfx('chest');
  };

  /* ---------- 星级 / 结算 ---------- */
  V.starsOf = function (G) {
    var v = G.villain, c = G.camp.hp / G.camp.maxHp, n = G.heroes[1], nf = n.down ? 0 : n.hp / n.maxHp;
    if (G.mode !== 'win' && !(G.ending && G.ending.kind === 'win')) return 0;
    if (c >= VD.STAGE.stars.s3 && nf >= VD.STAGE.stars.hp3) return 3;
    return c >= VD.STAGE.stars.s2 ? 2 : 1;
  };
  function addAvg(ser, y, mats) {
    var st = ser.stage, n = (st.avgN || 0) + 1; st.avgYaojin = (st.avgYaojin || 0) + (y - (st.avgYaojin || 0)) / n; st.avgN = n;
    VD.MAT_ORDER.forEach(function (m) { var o = ser.avgMats[m] || 0, nw = mats[m] || 0; ser.avgMats[m] = o + (nw - o) / n; });
  }
  // 纯函数：算一局的奖励（测试 / 结算页共用）
  V.rewards = function (G, result, opt) {
    opt = opt || {}; var v = G.villain, S = VD.STAGE, ser = VD.ser(), win = result === 'win', out = { win: win, lines: [] };
    var coins = Math.max(0, Math.round(G.coins - C.START_COINS));
    var yj = win ? coins * S.goldK : 0;
    out.coins = coins; out.firstClear = win && !ser.stage.firstDone;
    out.daily = win && !opt.sweep && ser.stage.dayKey !== VD.today();
    if (out.daily) yj *= S.dailyK;
    if (out.firstClear) yj += S.firstBonus;
    out.yaojin = Math.round(yj);
    var mats = {}; for (var k in v.mats) mats[k] = v.mats[k];
    var pity = {};
    ['yaogu', 'jianyu', 'shanyan', 'dunpian', 'niujiao', 'fuyi'].forEach(function (m) {                              // 保底：连续 3 局没掉，第 4 局必掉 1 个
      var had = (mats[m] || 0) > 0; pity[m] = had ? 0 : (ser.pity[m] || 0) + 1;
      if (!had && (ser.pity[m] || 0) >= 3) { mats[m] = 1; pity[m] = 0; out.pityGot = (out.pityGot || []).concat(m); }
    });
    if (out.firstClear) { mats.xiongdan = (mats.xiongdan || 0) + 2; mats.gufu = (mats.gufu || 0) + 2; ['yaogu', 'jianyu', 'shanyan', 'dunpian', 'niujiao', 'fuyi'].forEach(function (m) { mats[m] = (mats[m] || 0) + 5; }); }
    out.mats = mats; out.pity = pity; out.yaodan = v.yaodan; out.traps = win ? v.traps.slice() : v.traps.slice(0, Math.floor(v.traps.length / 2));
    out.stars = win ? V.starsOf(G) : 0; out.cave = G.camp.hp / G.camp.maxHp; out.sec = Math.round(G.t);
    return out;
  };
  V.commit = function (G, result) {
    if (G.committed) return G.runReport;
    G.committed = true; var ser = VD.ser(), r = V.rewards(G, result), st = ser.stage, k;
    if (G.t < 8 && result !== 'win') { G.runReport = { result: result, villain: true, rewards: null, skipped: true }; return G.runReport; }       // 刚开局就退：不算
    ser.wallet.yaojin += r.yaojin; ser.wallet.yaodan += r.yaodan; ser.runs++; st.runs++;
    for (k in r.mats) ser.mats[k] = (ser.mats[k] || 0) + r.mats[k];
    for (k in r.pity) ser.pity[k] = r.pity[k];
    r.traps.forEach(function (id) { ser.traps[id] = (ser.traps[id] || 0) + 1; });
    if (r.win) {
      ser.cleared++; st.clears++; if (!st.bestSec || G.t < st.bestSec) st.bestSec = Math.round(G.t);
      if (r.daily) st.dayKey = VD.today();
      st.firstDone = true; st.stars = Math.max(st.stars || 0, r.stars); st.bestCave = Math.max(st.bestCave || 0, r.cave);
      addAvg(ser, Math.round(r.coins * VD.STAGE.goldK), G.villain.mats);
      XY.save.data.chain.villain = XY.save.data.chain.villain || Date.now();
    }
    if (XY.save.touch) XY.save.touch(); XY.save.flush();
    G.runReport = { result: result, villain: true, rewards: r, level: 1 }; G.run = G.run || {}; return G.runReport;
  };
  // 扫荡：3★ 后拿平均产出的 80%（不吃每日首通加成）
  V.canSweep = function () { return VD.ser().stage.stars >= 3; };
  V.sweep = function () {
    var ser = VD.ser(), st = ser.stage; if (st.stars < 3) return { ok: false, reason: '先拿到 3★ 才能扫荡' };
    var K8 = VD.STAGE.sweepK, y = Math.round((st.avgYaojin || 0) * K8), out = { ok: true, yaojin: y, mats: {}, yaodan: 2 }, k;
    ser.wallet.yaojin += y; ser.wallet.yaodan += out.yaodan;
    VD.MAT_ORDER.forEach(function (m) { var n = Math.floor((ser.avgMats[m] || 0) * K8 + 0.5); if (n > 0) { out.mats[m] = n; ser.mats[m] = (ser.mats[m] || 0) + n; } });
    st.sweeps = (st.sweeps || 0) + 1; ser.runs++; if (XY.save.touch) XY.save.touch(); XY.save.flush(); return out;
  };
  var oldCommit = XY.save.commitRun;
  XY.save.commitRun = function (G, result) {
    if (G.villain) return V.commit(G, result);
    if (G.lair && XY.lair && XY.lair.commit) return XY.lair.commit(G, result);
    return oldCommit(G, result);
  };

  /* ---------- 输入记录（验证「整局只用方向键」）---------- */
  V.noteInput = function (kind, code) {
    var G = XY.G; if (!G || !G.villain) return; var i = G.villain.input;
    if (kind === 'key') { if (/^(Arrow(Up|Down|Left|Right)|Key[WASD])$/.test(code)) i.keys++; else if (code !== 'Escape' && code !== 'KeyP') i.other++; }
    else if (kind === 'mouse') i.mouse++; else i.ui++;
  };
  V.swallowKey = function (G, k) {                                       // 走位、暂停，以及三招（1 2 3 / J K L）
    return !/^(Arrow(Up|Down|Left|Right)|Key[WASD]|Escape|KeyP|Digit[123]|Numpad[123]|Key[JKL]|Digit0|F9)$/.test(k) && !(window.XY.app && XY.app.debugOn);
  };

  V.start = function (opts) { var w = window.__xy; if (w && w.startVillain) { w.startVillain(opts); return true; } return false; };
})();
