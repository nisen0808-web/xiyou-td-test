/* ============================================================
 * levels.js —— 关卡数据 + 任务系统（v0.4）
 *
 * 每一关：营地（东）、关口（西，唐僧必须走到）、2~4 座洞府（各带 BOSS）、1 个固定主线、3 个支线。
 * 通关 = 主线完成 + 唐僧本人走进关口（半径 C.GATE_R）。主线没完成时关口封印。
 *
 * 任务类型（type）：
 *   kill_den  打倒某座洞府的 BOSS            { den }
 *   kill_all  打掉全部洞府                    {}
 *   rescue    英雄在被困者身边守满 N 秒        { cap }
 *   item      打倒某洞府 BOSS 后拾取它掉落的宝物 { den, item }
 *   time_den  限时打掉某座洞府                { den, sec }
 *   etowers   拆掉 N 座妖塔  { n }
 *   keep_all  通关时没有徒弟阵亡（通关时判定）
 *   camp_hp   营地血量全程不低于 N%（通关时判定）    { pct }
 *   tower3_sky 养出一名 Lv3 护法天兵 且 召唤特殊人物 N 次（G.sky.uses）  { n }
 *   kills     累计击杀                        { n }
 * reward: { card: 'R'|'SR'|'SSR'|卡牌id, lingshi: n, shard: n }
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;

  // 西行路线：折线（与逻辑共用同一份数据，渲染也画这条路）。唐僧自动沿它向西走，路线进度 s = 折线累计路程。
  // rest：休息点在路线的哪个比例；walkSec：纯走路的秒数（不含休息）。
  // 圆角：把折线的每个拐点换成圆弧（圆弧半径 R，受相邻两段长度限制），首尾点不动。弧上每约 30px 取一个点。
  // 第 1 关用（背景是一整幅水墨画，路是画进去的，拐角要圆）；控制点 / 营地 / 关口位置不变，总长略短（见 docs/stage1-route-round.md）。
  function roundRoute(c, R) {
    var out = [c[0].slice()], i, k;
    for (i = 1; i < c.length - 1; i++) {
      var a = c[i - 1], P = c[i], b = c[i + 1], l1 = Math.hypot(P[0] - a[0], P[1] - a[1]), l2 = Math.hypot(b[0] - P[0], b[1] - P[1]);
      var u1 = [(P[0] - a[0]) / l1, (P[1] - a[1]) / l1], u2 = [(b[0] - P[0]) / l2, (b[1] - P[1]) / l2];
      var cr = u1[0] * u2[1] - u1[1] * u2[0], th = Math.atan2(Math.abs(cr), u1[0] * u2[0] + u1[1] * u2[1]);   // 转角
      if (th < 0.02) { out.push(P.slice()); continue; }
      var t = Math.min(R * Math.tan(th / 2), 0.48 * l1, 0.48 * l2), r = t / Math.tan(th / 2), sg = cr > 0 ? 1 : -1;
      var A = [P[0] - u1[0] * t, P[1] - u1[1] * t], nx = -u1[1] * sg, ny = u1[0] * sg, ctr = [A[0] + nx * r, A[1] + ny * r];
      var a0 = Math.atan2(A[1] - ctr[1], A[0] - ctr[0]), n = Math.max(2, Math.ceil(r * th / 30));
      for (k = 0; k <= n; k++) { var ang = a0 + sg * th * k / n; out.push([Math.round(ctr[0] + r * Math.cos(ang)), Math.round(ctr[1] + r * Math.sin(ang))]); }
    }
    out.push(c[c.length - 1].slice()); return out;
  }
  var ROUTES = {
    1: roundRoute([[4400, 1600], [3900, 1900], [3350, 2000], [2900, 1700], [2300, 1500], [1700, 1700], [1000, 1500], [300, 1500]], 420),
    2: [[4400, 1600], [3800, 2000], [3300, 1950], [2900, 1400], [2450, 1300], [2000, 1800], [1600, 2000], [900, 2000], [300, 1900]],
    3: [[4400, 1600], [3900, 1800], [3400, 1900], [3000, 1500], [2500, 1900], [2000, 1700], [1500, 1800], [900, 1600], [300, 1600]]
  };
  var CAMP = { x: 4400, y: 1600 };
  XY.LEVELS = [
    {
      id: 1, air: true, name: '黑风山', sub: '观音禅院的袈裟被黑熊精偷走了',
      camp: CAMP, route: ROUTES[1], rest: 0.5, walkSec: 240, theme: 'bamboo', cloudRide: true, gate: { x: 300, y: 1500, name: '观音禅院' },
      rate: 0.65, mul: 1.0, bossMul: 1.4, swarmN: 14, eliteN: 1,
      dens: [
        { id: 'heifeng', name: '黑风洞', boss: 'bear', x: 2500, y: 900 },
        { id: 'baihu', name: '白虎岭', boss: 'bone', x: 3300, y: 2450 }
      ],
      captives: [{ id: 'tudi', name: '被困的土地公', x: 1500, y: 2300, hold: 5 }],
      // v0.8.4 分岔路线：休息点之后的岔口（取路线上离 fork 最近的点）。北线 = 上面的官道；南线 = 土地公小道（绕得多，路过土地公，多一个宝箱，飞妖 ×2）
      alt: { fork: [2300, 1500], name: '土地公小道', pts: [[1900, 2050], [1500, 2350], [900, 2050], [500, 1650]], chest: [1830, 2010] },
      main: { type: 'kill_den', den: 0, text: '击退黑风洞的黑熊精，夺回锦襴袈裟', short: '击退黑熊精' },
      sides: [
        { type: 'time_den', den: 1, sec: 360, text: '6 分钟内击退白虎岭的白骨精', short: '限时击退白虎岭', reward: { card: 'R', lingshi: 40 } },
        { type: 'keep_all', text: '保住所有徒弟（无人阵亡，通关时判定）', short: '无人阵亡', reward: { lingshi: 30, shard: 1 } },
        { type: 'rescue', cap: 'tudi', text: '救出被困的土地公（在他身边守 5 秒）', short: '救出土地公', reward: { card: 'N', lingshi: 25, shard: 1 } }
      ]
    },
    {
      id: 2, name: '平顶山', sub: '三座洞府拦住了西行的路',
      camp: CAMP, route: ROUTES[2], rest: 0.5, walkSec: 360, theme: 'ochre', gate: { x: 300, y: 1900, name: '宝象国关' },
      rate: 0.90, mul: 1.45, bossMul: 2.6, swarmN: 18, eliteN: 1,
      dens: [
        { id: 'lianhua', name: '莲花洞', boss: 'jin', x: 2700, y: 800 },
        { id: 'huoyun', name: '火云洞', boss: 'red', x: 3300, y: 2500 },
        { id: 'huangfeng', name: '黄风洞', boss: 'yellow', x: 1600, y: 2300 }
      ],
      captives: [{ id: 'villager', name: '被困的村民', x: 2480, y: 980, hold: 6 }],
      main: { type: 'rescue', cap: 'villager', text: '救出被困在莲花洞外的村民（在他身边守 6 秒）', short: '救出村民' },
      sides: [
        { type: 'etowers', n: 4, text: '拆掉 4 座妖塔', short: '拆妖塔', reward: { card: 'R', lingshi: 50 } },
        { type: 'kills', n: 400, text: '累计击杀 400 只妖怪', short: '击杀 400', reward: { lingshi: 40, shard: 1 } },
        { type: 'kill_all', text: '击退全部三位洞主（每位至少一次）', short: '三洞全败', reward: { card: 'SR', lingshi: 60, shard: 1 } }
      ]
    },
    {
      id: 3, name: '火焰山', sub: '八百里火焰，要借芭蕉扇才过得去',
      camp: CAMP, route: ROUTES[3], rest: 0.5, walkSec: 360, theme: 'apricot', gate: { x: 300, y: 1600, name: '火焰山关' },
      rate: 1.20, mul: 2.00, bossMul: 4.0, swarmN: 22, eliteN: 2,
      dens: [
        { id: 'bajiao', name: '芭蕉洞', boss: 'iron', x: 3000, y: 850 },
        { id: 'cuiyun', name: '翠云洞', boss: 'yumian', x: 3300, y: 2450 },
        { id: 'moyun', name: '摩云洞', boss: 'boss', x: 1500, y: 1500 },
        { id: 'huoyan', name: '火焰洞', boss: 'chiyan', x: 2300, y: 2600 }
      ],
      captives: [],
      main: { type: 'item', den: 0, item: 'fan', text: '击退铁扇公主，拾取她败退时落下的芭蕉扇', short: '夺取芭蕉扇' },
      sides: [
        { type: 'kill_den', den: 2, text: '击退牛魔王（摩云洞）', short: '击退牛魔王', reward: { card: 'SR', lingshi: 70, shard: 1 } },
        { type: 'camp_hp', pct: 40, text: '营地血量全程不低于 40%（通关时判定）', short: '营地不失守', reward: { lingshi: 50, shard: 1 } },
        { type: 'tower3_sky', n: 1, text: '养出一名 Lv3 护法天兵，并召唤特殊人物一次', short: '满级天兵 + 召唤', reward: { card: 'R', lingshi: 50 } }
      ]
    }
  ];
  XY.LEVEL_COUNT = XY.LEVELS.length;

  /* ================= 路线（折线）工具：路线进度 s = 累计路程 ================= */
  XY.routeBuild = function (L) {
    var pts = L.route.map(function (p) { return { x: p[0], y: p[1] }; }), cum = [0], i, tot = 0;
    for (i = 1; i < pts.length; i++) { tot += XY.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); cum.push(tot); }
    return { pts: pts, cum: cum, total: tot, restS: tot * (L.rest || 0.5) };
  };
  // v0.8.4 分岔路线：南线 = 北线到岔口为止的点（原样共用，唐僧的 s 不用换算）+ 圆角后的南线折线 + 关口。北线也记下岔口的 s。
  XY.routeBuildAlt = function (L, RN) {
    var A = L.alt; if (!A) return null;
    var fs = XY.routeProject(RN, A.fork[0], A.fork[1]).s, fp = XY.routeAt(RN, fs), i, pts = [], cum = [0], tot = 0;
    for (i = 0; i < RN.pts.length && RN.cum[i] < fs - 1e-6; i++) pts.push({ x: RN.pts[i].x, y: RN.pts[i].y });
    pts.push({ x: fp.x, y: fp.y });
    var tail = roundRoute([[fp.x, fp.y]].concat(A.pts, [[L.gate.x, L.gate.y]]), 380);
    for (i = 1; i < tail.length; i++) pts.push({ x: tail[i][0], y: tail[i][1] });
    for (i = 1; i < pts.length; i++) { tot += XY.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y); cum.push(tot); }
    RN.forkS = fs; RN.fork = { x: fp.x, y: fp.y };
    return { pts: pts, cum: cum, total: tot, restS: RN.restS, forkS: fs, fork: { x: fp.x, y: fp.y }, alt: true };
  };
  XY.routeAt = function (R, s) {
    s = XY.clamp(s, 0, R.total);
    var i = 1; while (i < R.pts.length - 1 && R.cum[i] < s) i++;
    var a = R.pts[i - 1], b = R.pts[i], seg = R.cum[i] - R.cum[i - 1] || 1, f = (s - R.cum[i - 1]) / seg;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: Math.atan2(b.y - a.y, b.x - a.x) };
  };
  // 把任意坐标投影到路线：返回 { s: 路线进度, d: 离路线多远 }
  XY.routeProject = function (R, x, y) {
    var best = { s: 0, d: Infinity }, i;
    for (i = 1; i < R.pts.length; i++) {
      var a = R.pts[i - 1], b = R.pts[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
      var f = XY.clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1), px = a.x + dx * f, py = a.y + dy * f, d = XY.dist(x, y, px, py);
      if (d < best.d) best = { s: R.cum[i - 1] + (R.cum[i] - R.cum[i - 1]) * f, d: d };
    }
    return best;
  };
  /* ================= v0.8.4 洞府副本 =================
   * 一场 6~8 分钟的短局：唐僧沿一条短短的洞道走（没有休息点 / 夜潮），只有行军波（40 秒一波 + 飞妖），走到洞室洞主出来迎战，
   * 打到 0 血洞主躲回洞里（喘息一阵），第二次打死才过关（任务 slay_den）；关口随即打开。
   * 副本不算第 1 关通关：结算只写 data.dng，不碰 data.levels。 */
  XY.DUNGEONS = [
    { id: 'heifeng', name: '黑风洞', sub: '黑熊精的老巢', boss: 'bear', walkSec: 360, hard: 1.1,
      route: roundRoute([[4400, 1600], [3900, 1450], [3400, 1650], [2900, 1450], [2400, 1250], [1900, 1350]], 380),
      gate: { x: 1900, y: 1350, name: '黑风洞深处' }, den: { x: 2230, y: 960 } },
    { id: 'baihu', name: '白虎岭', sub: '白骨精的山岭', boss: 'bone', walkSec: 360, mul: 0.8,
      route: roundRoute([[4400, 1600], [3850, 1750], [3300, 1600], [2800, 1850], [2300, 1700], [1850, 1550]], 380),
      gate: { x: 1850, y: 1550, name: '白虎岭山口' }, den: { x: 2140, y: 2060 } }
  ];
  XY.dungeonOf = function (id) { for (var i = 0; i < XY.DUNGEONS.length; i++) if (XY.DUNGEONS[i].id === id) return XY.DUNGEONS[i]; return null; };
  // 副本 = 一个和 LEVELS 同形状的关卡对象（沿用第 1 关的怪量 / 数值，换路线、洞府、关口、任务）；id 仍是 1，G.dungeon 标记它是副本
  XY.dungeonLevel = function (id) {
    var d = XY.dungeonOf(id), b = XY.LEVELS[0], L = {}, k, bn = XY.ENEMIES[d.boss].name;
    for (k in b) L[k] = b[k];
    L.name = d.name; L.sub = d.sub; L.route = d.route; L.rest = 0.001; L.walkSec = d.walkSec; L.theme = 'cave'; L.gate = d.gate; L.air = true; L.rate = XY.C.DNG_RATE; L.alt = null; L.captives = []; L.sides = [];
    L.dens = [{ id: d.id, name: d.name, boss: d.boss, x: d.den.x, y: d.den.y }];
    L.main = { type: 'slay_den', den: 0, text: '打败' + bn + '（要打两次：第一次他会躲回洞里），闯出' + d.name, short: '打死' + bn };
    L.dungeon = d.id; return L;
  };
  XY.levelOf = function (id) { return XY.LEVELS[Math.max(1, Math.min(XY.LEVEL_COUNT, id | 0 || 1)) - 1]; };

  /* ================= 任务系统 ================= */
  var Q = XY.quests = {};

  function mkQ(def, kind, idx) { return { def: def, kind: kind, idx: idx, done: false, failed: false, prog: '', pv: 0, pmax: 1 }; }

  // 开局：建任务表、被困者、宝物
  Q.init = function (G) {
    var L = G.lv, Qs = { main: mkQ(L.main, 'main', -1), sides: L.sides.map(function (s, i) { return mkQ(s, 'side', i); }), log: [] };
    G.quests = Qs;
    G.captives = (L.captives || []).map(function (c) { return { id: c.id, name: c.name, x: c.x, y: c.y, hold: c.hold, t: 0, freed: false, r: 90 }; });
    G.items = [];
    G.itemGot = {};
    return Qs;
  };

  function den(G, i) { return G.dens[i]; }
  function capOf(G, id) { for (var i = 0; i < G.captives.length; i++) if (G.captives[i].id === id) return G.captives[i]; return null; }

  // 计算某个任务当前状态：设置 done / failed / prog；返回 true 表示“刚刚完成”（只在主动判定类型里）
  function evalQ(G, q) {
    var d = q.def, S = G.stats, i;
    if (q.done || q.failed) return;
    switch (d.type) {
      case 'slay_den': { var sd = den(G, d.den); q.pv = sd.slain ? 1 : 0; q.pmax = 1; q.prog = sd.slain ? '已打死' : (sd.beaten ? '他躲回洞里了，等他再出来' : '先打到他躲回洞'); if (sd.slain) q.done = true; break; }
      case 'kill_den': q.pv = den(G, d.den).beaten ? 1 : 0; q.pmax = 1; q.prog = q.pv + '/1'; if (q.pv) q.done = true; break;
      case 'kill_all':
        var k = 0; G.dens.forEach(function (x) { if (x.beaten) k++; }); q.pv = k; q.pmax = G.dens.length; q.prog = k + '/' + G.dens.length;
        if (k >= G.dens.length) q.done = true; break;
      case 'rescue': var c = capOf(G, d.cap); q.pv = c.freed ? 1 : c.t / c.hold; q.pmax = 1; q.prog = c.freed ? '已救出' : Math.floor(c.t) + '/' + c.hold + ' 秒'; if (c.freed) q.done = true; break;
      case 'item': q.pv = G.itemGot[d.item] ? 1 : 0; q.pmax = 1;
        var dn = den(G, d.den);
        q.prog = G.itemGot[d.item] ? '已拾取' : (!dn.beaten ? '先击退 ' + dn.bossName : '去拾取宝物'); if (G.itemGot[d.item]) q.done = true; break;
      case 'time_den':
        var dd = den(G, d.den), left = Math.max(0, d.sec - G.t);
        if (dd.beaten) { q.pv = 1; q.prog = '已击退'; if (dd.deadT <= d.sec) q.done = true; else { q.failed = true; q.prog = '超时'; } }
        else if (G.t > d.sec) { q.failed = true; q.prog = '超时'; }
        else q.prog = '剩 ' + XY.fmtTime(left);
        break;
      case 'etowers': q.pv = S.etKilled; q.pmax = d.n; q.prog = Math.min(S.etKilled, d.n) + '/' + d.n; if (S.etKilled >= d.n) q.done = true; break;
      case 'kills': q.pv = G.kills; q.pmax = d.n; q.prog = Math.min(G.kills, d.n) + '/' + d.n; if (G.kills >= d.n) q.done = true; break;
      case 'tower3_sky':
        var t3 = G.towers.some(function (t) { return Math.max(t.lv || 1, t.cl || 1) >= 3; }) || S.tower3;
        if (t3) S.tower3 = true;
        q.pv = (t3 ? 1 : 0) + Math.min(G.sky.uses, d.n); q.pmax = 1 + d.n;
        q.prog = '塔' + (t3 ? '✔' : '✘') + ' 召唤 ' + Math.min(G.sky.uses, d.n) + '/' + d.n;
        if (t3 && G.sky.uses >= d.n) q.done = true; break;
      case 'keep_all':
        if (S.discDeaths > 0) { q.failed = true; q.prog = '有人阵亡'; } else q.prog = '进行中';
        break;
      case 'camp_hp':
        if (G.camp.hp < G.camp.maxHp * d.pct / 100) { S.campLow = true; }
        if (S.campLow) { q.failed = true; q.prog = '失守过'; } else q.prog = '进行中';
        break;
    }
  }
  var AT_CLEAR = { keep_all: 1, camp_hp: 1 };

  Q.mainDone = function (G) { return !!(G.quests && G.quests.main.done); };

  function applyReward(G, q) {
    var r = q.def.reward; if (!r || G.mod) return;      // 非官方玩法包：不发任何奖励，也不写 questsDone
    var parts = [], K = XY.cards, key = G.levelId + '_' + q.idx;
    if (r.lingshi) { XY.save.addLingshi(r.lingshi); G.run.lingshi += r.lingshi; parts.push('灵石 +' + r.lingshi); }
    if (r.shard && !XY.save.data.questsDone[key]) { XY.save.addShard(r.shard); G.run.shards += r.shard; parts.push('皮肤碎片 +' + r.shard); }
    if (r.card) {
      var id = XY.CARD_BY[r.card] ? r.card : K.pickRarity(G, r.card);
      K.give(G, id, { quest: true }); parts.push('法宝（三选一）');
    }
    XY.save.data.questsDone[key] = 1; XY.save.data.stats.sideDone = (XY.save.data.stats.sideDone || 0) + 1; XY.save.touch();
    return parts.join('，');
  }

  function onDone(G, q) {
    q.doneT = G.t;
    if (q.kind === 'main') {
      G.gate.sealed = false; G.gate.openT = 3;
      XY.banner(G, '主线完成：' + q.def.short + '！送师父走到西边关口「' + G.gate.name + '」', 5);
      XY.toast(G, '关口封印已解开，让唐僧本人走到西边的关口才算过关');
      XY.ring(G, G.gate.x, G.gate.y, 260, '#ffd24a', 1.0, true);
      G.questPop = { text: '主线完成', sub: q.def.short, t: 3, color: '#d9a21a' };
      G.quests.log.push({ t: G.t, id: 'main', text: '主线完成：' + q.def.short });
    } else {
      var got = applyReward(G, q);
      XY.banner(G, '支线完成：' + q.def.short + (got ? '　奖励：' + got : ''), 4.2);
      G.questPop = { text: '支线完成', sub: q.def.short + (got ? ' · ' + got : ''), t: 3, color: '#3f9d5a' };
      G.quests.log.push({ t: G.t, id: 'side' + q.idx, text: '支线完成：' + q.def.short, reward: got });
    }
  }

  Q.update = function (G, dt) {
    var Qs = G.quests, i, j;
    // 被困者：英雄在身边守满时间就救出
    G.captives.forEach(function (c) {
      if (c.freed) return;
      var near = false;
      for (j = 0; j < G.heroes.length; j++) { var h = G.heroes[j]; if (!h.down && XY.dist(h.x, h.y, c.x, c.y) < c.r + h.def.r) { near = true; break; } }
      c.near = near;
      c.t = near ? Math.min(c.hold, c.t + dt) : Math.max(0, c.t - dt * 0.5);
      if (c.t >= c.hold) {
        c.freed = true; c.freedT = 0;
        XY.ring(G, c.x, c.y, 120, '#3f9d5a', 0.8, true);
        XY.toast(G, c.name + '得救了！');
      }
    });
    // 宝物：英雄走过去就捡
    for (i = G.items.length - 1; i >= 0; i--) {
      var it = G.items[i]; it.t += dt;
      for (j = 0; j < G.heroes.length; j++) {
        var h2 = G.heroes[j];
        if (!h2.down && XY.dist(h2.x, h2.y, it.x, it.y) < 46 + h2.def.r) {
          G.itemGot[it.kind] = true; G.items.splice(i, 1);
          XY.ring(G, it.x, it.y, 100, '#ffd24a', 0.6, true);
          XY.toast(G, h2.def.name + ' 拿到了' + it.name + '！');
          break;
        }
      }
    }
    G.captives.forEach(function (c) { if (c.freed) c.freedT += dt; });
    // 主线 + 支线判定（支线里的“通关时判定”类型，完成留到通关时）
    [Qs.main].concat(Qs.sides).forEach(function (q) {
      if (q.done || q.failed) { return; }
      var was = q.done;
      evalQ(G, q);
      if (!was && q.done && !(AT_CLEAR[q.def.type])) onDone(G, q);
    });
  };

  // 通关：判定“通关时判定”的支线并发奖励
  Q.finalize = function (G) {
    G.quests.sides.forEach(function (q) {
      if (q.done || q.failed || !AT_CLEAR[q.def.type]) return;
      evalQ(G, q);
      if (!q.failed) { q.done = true; onDone(G, q); }
    });
  };

  // 调试 / 测试：直接完成主线（走和正常完成一样的流程）
  Q.forceMain = function (G) {
    var q = G.quests.main; if (q.done) return;
    q.done = true; q.prog = '完成'; q.pv = q.pmax; onDone(G, q);
  };
  // 统计已完成的支线数
  Q.sidesDone = function (G) { var n = 0; G.quests.sides.forEach(function (q) { if (q.done) n++; }); return n; };
})();
