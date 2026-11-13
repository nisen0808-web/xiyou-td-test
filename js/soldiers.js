/* soldiers.js —— v0.5 护法天兵：统一“塔”和“天兵降临”
 * 规则：
 *  · 天兵可以放在西行路两侧任意位置（不再限制离队伍多远）
 *  · 用“路线进度”（沿折线累计长度）判断前后：在唐僧身后的跟着走；在唐僧前面的原地驻守；唐僧走过之后驻守的就加入跟随
 *  · 所有天兵都会攻击、都会被打死；敌人的目标优先级统一：唐僧 / 徒弟 / 营地 > 天兵（天兵最低）
 *  · 天兵有“卡”（收集），不同种类效果和持续时间不同；和 12 位特殊角色是两套东西，也不用 X 性格
 */
(function () {
  var XY = window.XY, C = XY.C;
  var dist = XY.dist;

  /* ---------- 天兵卡：存档 ---------- */
  XY.SOLDIER_LV_AT = [1, 3, 6];                    // 张数达到 → 卡 Lv1 / Lv2 / Lv3
  XY.SOLDIER_STARTER = ['arrow', 'heal'];          // 新存档自带的天兵卡（各 1 张）
  function sdat() {
    var d = XY.save.data;
    if (!d.sold || typeof d.sold !== 'object') { d.sold = { cards: {} }; XY.SOLDIER_STARTER.forEach(function (t) { d.sold.cards[t] = 1; }); }
    if (!d.sold.cards) d.sold.cards = {};
    return d.sold;
  }
  XY.solLevelOf = function (n) { var l = 0; XY.SOLDIER_LV_AT.forEach(function (a, i) { if (n >= a) l = i + 1; }); return l; };
  XY.save.solCards = function (t) { return sdat().cards[t] || 0; };
  XY.save.solLevel = function (t) {
    var l = XY.solLevelOf(XY.save.solCards(t));
    if (XY.TEST_BUILD) l = Math.max(l, 1);      // 全开：所有天兵种类开局可用（至少 Lv1）
    return l;
  };
  XY.save.solOwned = function (t) { return XY.save.solLevel(t) >= 1; };
  XY.save.addSolCard = function (t, n) {
    var s = sdat(), before = XY.solLevelOf(s.cards[t] || 0);
    s.cards[t] = (s.cards[t] || 0) + (n || 1);
    var after = XY.solLevelOf(s.cards[t]); XY.save.touch();
    return { cards: s.cards[t], lv: after, up: after > before, first: before === 0 };
  };
  // 掉一张随机天兵卡（Boss 首次败退、宝箱）。越贵的越少。返回 { type, ... }
  XY.soldierCardDrop = function (G, x, y, why) {
    var w = { arrow: 4, heal: 3, frost: 3, cannon: 2.5, siege: 2 }, tot = 0, t, r;
    XY.TOWER_ORDER.forEach(function (k) { tot += w[k]; });
    r = Math.random() * tot; t = XY.TOWER_ORDER[0];
    for (var i = 0; i < XY.TOWER_ORDER.length; i++) { r -= w[XY.TOWER_ORDER[i]]; if (r <= 0) { t = XY.TOWER_ORDER[i]; break; } }
    var res = XY.save.addSolCard(t, 1);
    G.solDrops = (G.solDrops || []); G.solDrops.push(t);
    XY.toast(G, '获得天兵卡：' + XY.TOWERS[t].name + ' ×1（共 ' + res.cards + ' 张' + (res.first ? '，首次获得！' : (res.up ? '，升到 Lv' + res.lv : '')) + '）');
    XY.core.ring(G, x, y, 50, XY.TOWERS[t].color, 0.5, true);
    return { type: t, res: res, why: why };
  };

  /* ---------- 路线进度：前后判断 ---------- */
  XY.soldierRs = function (G, x, y) { return XY.routeProject(G.rt, x, y).s; };
  // 给天兵（塔或降临的天兵）定模式：在唐僧身后（含同一位置）→ follow；在前面 → garrison
  XY.soldierMode = function (G, u) {
    u.rs = XY.soldierRs(G, u.x, u.y);
    if (u.rs <= G.tang.s + 30) XY.soldierJoin(G, u); else { u.mode = 'garrison'; u.anchor = { x: u.x, y: u.y }; }
  };
  XY.soldierJoin = function (G, u) {
    u.mode = 'follow'; u.anchor = null;
    G.followSeq = (G.followSeq || 0) + 1; u.fslot = G.followSeq;
  };
  // 跟随队列里第 k 号的目标位置：在唐僧身后一段、左右错开
  XY.followSpot = function (G, k) {
    var back = C.SOLDIER_FOLLOW + (k % 6) * 36, side = (k % 2 ? 1 : -1) * (30 + Math.floor(k / 6) * 26);
    var p = XY.routeAt(G.rt, Math.max(0, G.tang.s - back)), nx = -Math.sin(p.a), ny = Math.cos(p.a);
    return { x: p.x + nx * side, y: p.y + ny * side };
  };
  // 每帧：驻守的天兵看唐僧是否走过自己；走过了就加入跟随
  XY.soldierTickMode = function (G, u) {
    if (u.mode === 'garrison' && G.tang.s > u.rs + 20) {
      XY.soldierJoin(G, u);
      XY.core.ring(G, u.x, u.y, 40, '#9fd0ff', 0.4);
    }
  };

  /* ---------- 统一：受伤 / 目标 ---------- */
  XY.hurtSoldier = function (G, u, dmg) { if (u.type) XY.hurtTower(G, u, dmg); else XY.hurtAlly(G, u, dmg); };
  XY.soldiersOf = function (G) { return G.towers.concat(G.allies.filter(function (a) { return !a.dead; })); };

  /* ---------- 塔 → 护法天兵：放置 / 寿命 / 移动 ---------- */
  var baseStat = XY.towerStat;
  XY.towerStat = function (G, t) {
    var s = baseStat(G, t), cl = t.cl || 1, m = 1 + 0.25 * (cl - 1), b = XY.solBuff(G, t);
    s.dmg *= m * XY.solMods(G).dmg * (1 + b.dmg); s.range *= (1 + b.rng); return s;     // v0.8.3：联防 / 香火的增益“相加后再乘”（上限 C.SOLBUFF.cap）
  };

  /* ---- v0.8.3 天兵 / 塔的加成：联防（阵型）+ 犒赏（花金币）+ 香火（休息点）。只加强度，不加数量，不改上限 6 ---- */
  var SB = C.SOLBUFF = { link: { r: 260, kinds: [3, 4], dmg: [0.15, 0.22], rng: [0.08, 0.12] }, treat: { cost: 30, life: 0.5, dr: 0.2, t: 20, cd: 40 }, incense: { dmg: 0.10 }, cap: 0.5, every: 0.5 };
  function incenseOn(G, u) { return !!(G.camp && G.camp.active && G.tang && G.tang.phase === 'rest' && dist(u.x, u.y, G.camp.x, G.camp.y) <= C.CAMP_ZONE_R); }
  // 联防：半径内凑到 3 种不同类型的天兵（含自己）→ +15% 伤害 / +8% 射程；4 种以上 +22% / +12%
  function linkOf(G, t) {
    if (C.NO_COMBO) return 0;
    var seen = {}, n = 0, i, o;
    for (i = 0; i < G.towers.length; i++) { o = G.towers[i]; if (o.hp > 0 && dist(o.x, o.y, t.x, t.y) <= SB.link.r && !seen[o.type]) { seen[o.type] = 1; n++; } }
    return n >= SB.link.kinds[1] ? 2 : (n >= SB.link.kinds[0] ? 1 : 0);
  }
  XY.solBuff = function (G, t) {
    var b = t._sb;
    if (!b || t._sbT === undefined || t._sbT <= 0) {                  // 每 0.5 秒重算一次（天兵最多 6 个，几乎不花时间）
      var lk = linkOf(G, t), inc = incenseOn(G, t), d = (lk ? SB.link.dmg[lk - 1] : 0) + (inc ? SB.incense.dmg : 0);
      b = t._sb = { link: lk, incense: inc, dmg: Math.min(SB.cap, d), rng: lk ? SB.link.rng[lk - 1] : 0 };
      t._sbT = SB.every;
    }
    return { link: b.link, incense: b.incense, dmg: b.dmg, rng: b.rng, treat: t.treatT > 0 ? t.treatT : 0, dr: t.treatT > 0 ? SB.treat.dr : 0 };
  };
  // 犒赏：花 30 金币，寿命补 50%、20 秒内受伤 −20%；每个天兵 40 秒只能犒赏一次
  XY.treatCheck = function (G, t) {
    if (!t || G.towers.indexOf(t) < 0) return '没有选中天兵';
    if (t.treatCd > 0) return '这位天兵刚犒赏过（还要 ' + Math.ceil(t.treatCd) + ' 秒）';
    if (G.coins < SB.treat.cost) return '金币不够：犒赏要 ' + SB.treat.cost + ' 金币';
    return null;
  };
  XY.treat = function (G, t, free) {
    if (G.mode !== 'play' && G.mode !== 'vendor') return false;
    if (!t) { var h = G.heroes[G.ctrl]; t = XY.towerAt(G, h.x, h.y, 90); if (!t) { XY.toast(G, '附近没有天兵（点一个天兵再犒赏）'); return false; } }
    if (free) { if (t.treatCd > 0) return false; } else { var why = XY.treatCheck(G, t); if (why) { XY.toast(G, why); return false; } G.coins -= SB.treat.cost; }
    t.life = Math.min(t.maxLife, t.life + t.maxLife * SB.treat.life); t.treatT = SB.treat.t; t.treatCd = SB.treat.cd; t._sbT = 0;
    G.stats.treats = (G.stats.treats || 0) + 1;
    XY.core.ring(G, t.x, t.y, 46, '#f2c14e', 0.6, true); XY.core.text(G, t.x, t.y - 34, '犒赏！', 'coin');
    return true;
  };
  XY.treatAll = function (G) { var n = 0; G.towers.forEach(function (t) { if (XY.treat(G, t, true)) n++; }); return n; };   // 货郎的“犒赏令”用
  // 召唤的天兵（G.allies）不吃联防，但吃香火
  var baseAllyBuff = XY.allyBuff;
  XY.allyBuff = function (G, a) { var r = baseAllyBuff(G, a); if (incenseOn(G, a)) r = { dm: r.dm * (1 + SB.incense.dmg), hs: r.hs, vis: r.vis }; return r; };
  XY.towerMaxLife = function (t) { return XY.TOWERS[t.type].life * (1 + 0.3 * ((t.cl || 1) - 1)) * (t.lm || 1); };
  /* ---- 天兵上限与召唤加成（v0.5）：默认 6；只有沙僧的「召唤」分支能大幅提高；
   *      Phyrex / 园长两位召唤型特殊角色在场 +1；其他角色没有这类加成。
   *      「天兵降临」召来的临时天兵（G.allies，20 秒左右就散）单独计数，不占这 6 个名额。 */
  XY.SOL_SP_CAP = { phyrex: 1, yuanzhang: 1 };
  XY.solMods = function (G) {
    var o = { cap: C.MAX_TOWERS, dmg: 1, life: 1, cost: 1, sky: 0 }, f = 0, l = 0, c = 0, k = 0;
    G.heroes.forEach(function (h) {
      var m = h.mod; if (!m || h.down) return;
      o.cap += m.capAdd || 0; f += m.solDmg || 0; l += m.solLife || 0; c += m.solCost || 0; k += m.solSky || 0;
    });
    var sph = G.heroes[5], spk = (sph && sph.def && sph.def.xid) ? sph.id : G.special; if (G.special && XY.SOL_SP_CAP[spk] && sph && !sph.down && sph.def.lv >= 3) o.cap += XY.SOL_SP_CAP[spk];   // 角色卡升到 Lv3 才有（默认带 Phyrex 的新手仍是 6）
    o.dmg = 1 + f; o.life = 1 + l; o.cost = Math.max(0.4, 1 + c); o.sky = k; return o;
  };
  XY.soldierCap = function (G) { return XY.solMods(G).cap; };
  XY.buildReach = function (G, x, y) { return XY.onRoad(G, x, y); };
  XY.onRoad = function (G, x, y) { return XY.routeProject(G.rt, x, y).d <= C.ROAD_HALF; };
  XY.soldierCost = function(G,type) { return Math.round(XY.TOWERS[type].cost * XY.solMods(G).cost); };
  XY.towerBlock = function (G, type, x, y) {
    var d = XY.TOWERS[type], camp = G.camp, i;
    if (!XY.save.solOwned(type)) return '还没有' + d.name + '的卡（打败 Boss / 开宝箱会掉天兵卡）';
    var cap = XY.soldierCap(G);
    if (G.towers.length >= cap) return '天兵已经满了（' + G.towers.length + '/' + cap + '；他们会累、也会战死，之后再叫新的' + (cap < 10 ? '；沙僧的「召唤」技能线能提高上限' : '') + '）';
    if (x < 40 || y < 40 || x > C.WORLD_W - 40 || y > C.WORLD_H - 40) return '地图边缘不能放天兵';
    if (!XY.onRoad(G, x, y) && G.rtS && !G.routeChoice && XY.routeProject(G.rtS, x, y).d <= C.ROAD_HALF) return '这是南线小路：先在岔口选路，再放天兵';
    if (!XY.onRoad(G, x, y)) return '天兵只能放在西行的路上（路两侧各 ' + C.ROAD_HALF + ' 以内）';
    if (camp.active && dist(x, y, camp.x, camp.y) < camp.r + 34) return '这里是营地，点远一点的空地';
    for (i = 0; i < G.dens.length; i++) if (dist(x, y, G.dens[i].x, G.dens[i].y) < C.DEN_NOBUILD) return '离洞府太近了，不能放天兵';
    for (i = 0; i < G.towers.length; i++) if (dist(x, y, G.towers[i].x, G.towers[i].y) < (G.tut ? 18 : 32)) return '这里太挤了，换个位置（点已有的天兵可以升级）';
    var need = XY.soldierCost(G,type);      // 召唤折扣：价格、余额检查、扣款都用折后价
    if (G.coins < need) return '金币不够：' + d.name + '要 ' + need + ' 金币';
    return null;
  };
  var basePlace = XY.placeTower;
  XY.placeTower = function (G, type, x, y) {
    var n0 = G.towers.length, ok;
    if (x === undefined) {                                       // 不给坐标：放在操控英雄前方一点（取路上最近的点）
      var h = G.heroes[G.ctrl]; if (h.down) return false;
      x = h.x + Math.cos(h.face) * 38; y = h.y + Math.sin(h.face) * 38;
    }
    ok = basePlace(G, type, x, y);
    if (ok && G.towers.length > n0) {
      var t = G.towers[G.towers.length - 1];
      var sm = XY.solMods(G); G.coins += XY.TOWERS[type].cost - XY.soldierCost(G,type);      // 召唤花费折扣
      t.cl = Math.max(1, XY.save.solLevel(type)); t.lm = sm.life; t.maxLife = XY.towerMaxLife(t); t.life = t.maxLife; t.r = C.SOLDIER_R;
      XY.soldierMode(G, t);
      XY.toast(G, t.mode === 'follow' ? XY.TOWERS[type].name + '：跟在唐僧身后' : XY.TOWERS[type].name + '：在这里驻守，唐僧走过后会跟上');
    }
    return ok;
  };
  // v0.5：天兵不能升级，变强只靠收集天兵卡
  XY.upgradeTower = function (G) { XY.toast(G, '天兵不能升级：多收集天兵卡才会变强'); return false; };
  XY.initSoldiers = function (G) {                                // 开局两名弓天兵：跟在唐僧身后（代替原来的两座箭塔）
    for (var i = 0; i < 2; i++) {
      var t = XY.makeTower('arrow', G.heroes[0].x, G.heroes[0].y);
      t.cl = Math.max(1, XY.save.solLevel('arrow')); t.lm = XY.solMods(G).life; t.maxLife = XY.towerMaxLife(t); t.life = t.maxLife; t.r = C.SOLDIER_R; t.starter = true;
      t.rs = 0; XY.soldierJoin(G, t);
      var p = XY.followSpot(G, t.fslot); t.x = p.x; t.y = p.y;
      G.towers.push(t);
    }
  };

  // 每帧（在 updateTowers 之前）：寿命、前后模式、移动
  XY.updateSoldiers = function (G, dt) {
    var i, t, w = 0, spd = 240;
    for (i = 0; i < G.towers.length; i++) {
      t = G.towers[i];
      if (t.life === undefined) { t.cl = t.cl || 1; t.maxLife = XY.towerMaxLife(t); t.life = t.maxLife; t.r = C.SOLDIER_R; XY.soldierMode(G, t); }
      if (t.hp > 0) {
        t.life -= dt;
        if (t.life <= 0) {                                         // 时间到了：天兵撤走（不算战死）
          XY.core.ring(G, t.x, t.y, 36, '#cfe6ff', 0.5); XY.toast(G, XY.TOWERS[t.type].name + '时间到，回天上去了');
          G.stats.soldiersExpired = (G.stats.soldiersExpired || 0) + 1; continue;
        }
      }
      if (t._sbT > 0) t._sbT -= dt; if (t.treatT > 0) t.treatT -= dt; if (t.treatCd > 0) t.treatCd -= dt;
      XY.soldierTickMode(G, t);
      if (t.mode === 'follow') {
        var p = XY.followSpot(G, t.fslot), dx = p.x - t.x, dy = p.y - t.y, l = Math.sqrt(dx * dx + dy * dy);
        if (l > 1200) { t.x = p.x; t.y = p.y; }
        else if (l > 3) { var st = Math.min(spd * dt * (l > 300 ? 1.8 : 1), l); t.x += dx / l * st; t.y += dy / l * st; }
      }
      G.towers[w++] = t;
    }
    G.towers.length = w;
  };
})();
