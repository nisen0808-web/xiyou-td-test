/* 西游X · Boss 对战 · 自动战斗核心（原型，纯逻辑，无 DOM）。浏览器和 Node 共用：window.BF / require('./sim.js')
   所有数值的来源：js/data.js（牛魔王、悟空）、js/specials.js（九位特殊人物 hp/防御/元素/速度/power）、js/sp12.js（普攻伤害与间隔、大招 bossDmg / stun / 附带效果）。
   “对战口径”的换算常数集中在 BF.K，下面 DOC 里逐条写了出处；标 [提案] 的是为了对战新定的数，等用户确认。 */
(function (root) {
  'use strict';
  var K = {
    HPK: 5,            // [提案] 双方生命的统一放大：原版里 Boss 靠“持续输出 + 小怪”磨，对战是一对二，生命要放大才打得出来回
    BOSS_HP: 26000,     // 第 1 关牛魔王：data.js boss.hp=7000 × 关卡倍率 1.4 = 9800（v1 原型曾用 8500，v2 按真实数值改回）
    BOSS_DMG: 4.4,     // [提案] Boss 伤害总倍率（调难度的主旋钮；v2 血量改 9800 后由 5.0 回调到 4.4，把胜率拉回目标）
    ULT_K: 3,          // [提案] 大招对 Boss 的伤害 = 原版 bossDmg × statMul × ULT_K，上限 ULT_CAP × Boss 满血
    ULT_CAP: 0.22,
    TIMER: 99,         // 街霸式回合计时，到 0 没打死 = 失败
    DODGE: 700,        // 闪避率 = clamp(speed / 700, 0.08, 0.35)：速度越快越容易躲开红圈 / 火焰波
    STAGGER_MAX: 1.5, STAGGER_IMMUNE: 9, STAGGER_BONUS: 1.2,   // Boss 被眩晕最多硬直 1.5 秒，之后 9 秒免疫；硬直中受伤 ×1.2
    POW_EXP: 0.35,       // [提案] specials.js 的 power（Phyrex 2.8、腾EO 0.4…）在对战里开方压缩，避免一个人碾压/一个人拖后腿
    WU_DMG: 0.7,        // [提案] 悟空在对战里的输出系数：他是主角但不能一个人包办，搭档要有存在感
    WU_HP: 1.4,         // [提案] 悟空生命额外 ×1.4（他死了就输，要给一点容错）
    TANK_DMG: 2.5,      // [提案] 坦克型搭档对战输出 ×2.5（原版他们是“扛”的，对战里没有伤害就没有胜算）
    SPLASH: 0.35,       // [提案] 牛魔王近战挥击：被盯上的目标吃全额，范围内其他人吃 35%
    DUEL: { phyrex: 0.85, diaoyulao: 2.6, heyuxi: 2.6, martin: 1.5, laosiji: 1.3, haiteng: 1.3, sisi: 0.85, kuanggong: 1.05 },   // [提案] 对战口径的逐人修正：把九位搭档的单带胜率拉进 ~25–75%
    TAUNT_P: 0.75,      // [提案] 坦克型搭档（小矿工、腾EO）的嘲讽：牛魔王有 75% 的时间盯着他们
    SISI_SH: 0,
    SUMK: { sisi: 0.7, heyuxi: 1.35 },   // [提案] v3.1 援军强度修正：把九位援军拉回均值 ±5
    TRHEAL: { sisi: 0.15 },   // [提案] 治疗型特质的群体回血比例（v3.1：Sisi 单独下调，原 0.3）
    AGGRO_P: 0.4, AGGRO_T: 4,   // [提案] 牛魔王每 4 秒重新选目标，40% 盯搭档
    COMBO2: 0.8,      // [提案] 连砸（二阶段）第二下的伤害系数
    SPIN_R: 190, SPIN_DMG: 0.9,   // [提案] 狂暴旋风（二阶段）：以牛魔王为圆心的半径 / 每下伤害系数
    ARENA: 1000
  };
  var BOSS = { name: '牛魔王', elem: 'earth', pdef: 0.2, mdef: 0.1, dtype: 'phys', speed: 58 * 2.4, r: 56, dmg: 20, meleeIv: 1.15, bt0: 1.6, cd1: 4.6, cd2: 3.2 };
  var ELEM_BEATS = { metal: 'wood', wood: 'earth', earth: 'water', water: 'fire', fire: 'metal' };
  function elemMul(a, b) { if (!a || !b) return 1; if (a === b) return 0.85; if (ELEM_BEATS[a] === b) return 1.35; if (ELEM_BEATS[b] === a) return 0.75; return 1; }

  var WU = { id: 'wukong', name: '孙悟空', elem: 'metal', dtype: 'phys', pdef: 0.1, mdef: 0, hp: 130, speed: 185, color: '#ef8a3c' };
  var SP = {
    phyrex:    { name: 'Phyrex', arch: 'storm', elem: 'metal', dtype: 'magic', pdef: .05, mdef: .1, hp: 215, speed: 220, power: 2.8, color: '#f0d27a', atk: { base: 31, iv: .7, ranged: 1, dist: 320 }, trait: { cd: 45, name: '币值暴涨' }, ult: { name: '比特币光印', dmg: 140, stun: 1.5, dtype: 'magic', fx: '', e: { dmgUp: [1.4, 10] } } },
    sisi:      { name: 'Sisi', arch: 'heal', elem: 'wood', dtype: 'magic', pdef: .05, mdef: .3, hp: 200, speed: 175, color: '#5fbf6a', atk: { base: 16, iv: .8, ranged: 1, dist: 300, fx: 'sisi' }, trait: { cd: 50, name: '全天在线' }, ult: { name: '防钓鱼盾', dmg: 80, stun: 1.5, dtype: 'magic', fx: 'sisi', e: { heal: .12, sh: .08, shCap: .08 } } },
    laosiji:   { name: '币圈老司机', arch: 'mark', elem: 'fire', dtype: 'magic', pdef: .05, mdef: .1, hp: 205, speed: 185, color: '#e0452e', atk: { base: 24, iv: .75, ranged: 1, dist: 340 }, trait: { cd: 40, name: '热搜上榜' }, ult: { name: '翻译一下', dmg: 130, stun: 1.2, dtype: 'magic', fx: 'vuln', e: { vuln: [.45, 10], delay: 2 } } },
    kuanggong: { name: 'DeFi小矿工', arch: 'tank', elem: 'earth', dtype: 'phys', pdef: .32, mdef: .25, hp: 340, speed: 140, color: '#9a7448', atk: { base: 26, iv: 1.0, reach: 150 }, trait: { cd: 45, name: 'HODL 拿住' }, ult: { name: '下次一定', dmg: 110, stun: 3, dtype: 'phys', fx: 'shield15', e: { sh: .15, shCap: .3 } } },
    haiteng:   { name: '腾 EO', arch: 'tank', elem: 'metal', dtype: 'phys', pdef: .48, mdef: .3, hp: 440, speed: 125, power: .4, color: '#d4a62a', atk: { base: 27, iv: 1.0, reach: 130 }, trait: { cd: 40, name: '加固' }, ult: { name: '大逃杀缩圈', dmg: 100, stun: 2, dtype: 'phys', fx: 'wall', e: { sh: .15, shCap: .3, wall: [5, .35] } } },
    yuanzhang: { name: '园长', arch: 'dash', elem: 'wood', dtype: 'phys', pdef: .12, mdef: .08, hp: 235, speed: 190, color: '#3fa797', atk: { base: 18, iv: .8, ranged: 1, dist: 300, fx: 'undead' }, trait: { cd: 40, name: '鬼门大开' }, ult: { name: '百鬼夜行', dmg: 90, stun: 1.5, dtype: 'phys', fx: 'undead', e: { undead: 3 } } },
    heyuxi:    { name: '羽溪', arch: 'dash', elem: 'fire', dtype: 'magic', pdef: .1, mdef: .12, hp: 215, speed: 215, color: '#35b7b0', atk: { base: 17, iv: .8, ranged: 1, dist: 320 }, trait: { cd: 35, name: '交作业' }, ult: { name: '新歌上线', dmg: 150, stun: 1.2, dtype: 'magic', fx: 'caf', e: { as: [1.4, 8], delay: 4 } } },
    diaoyulao: { name: '钓鱼佬', arch: 'mark', elem: 'water', dtype: 'phys', pdef: .12, mdef: .1, hp: 300, speed: 170, color: '#3f8fd0', atk: { base: 15, iv: .85, ranged: 1, dist: 360 }, trait: { cd: 38, name: '末日生存经验' }, ult: { name: '猪脚饭', dmg: 70, stun: 2, dtype: 'phys', fx: 'regen', e: { regen: 3 } } },
    martin:    { name: '马丁', arch: 'heal', elem: 'earth', dtype: 'phys', pdef: .25, mdef: .15, hp: 250, speed: 165, power: .8, color: '#8a5ad8', atk: { base: 15, iv: .9, dtype: 'magic', ranged: 1, dist: 200, fx: 'martin' }, trait: { cd: 50, name: '开赛号角' }, ult: { name: 'GM 早安', dmg: 90, stun: 1.5, dtype: 'magic', fx: 'gm', e: { heal: .15, dmgUp: [1.15, 8] } } }
  };
  var ORDER = ['phyrex', 'sisi', 'laosiji', 'kuanggong', 'haiteng', 'yuanzhang', 'heyuxi', 'diaoyulao', 'martin'];

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function lvMul(lv) { return 1 + 0.25 * (lv - 1); }          // specials.js specialDef：Lv2 +25% … Lv5 +100%
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function mkHero(id, lv, x) {
    var w = id === 'wukong', d = w ? WU : SP[id], m = lvMul(lv), sm = m * Math.pow(d.power || 1, K.POW_EXP);
    var h = { id: id, name: d.name, side: 'L', x: x, y: 0, face: 1, color: d.color, lv: lv, w: w, arch: w ? 'melee' : d.arch,
      elem: d.elem, dtype: d.dtype, pdef: d.pdef, mdef: d.mdef, speed: d.speed, r: 20, sm: w ? m * K.WU_DMG : sm * (d.arch === 'tank' ? K.TANK_DMG : 1) * (K.DUEL[id] || 1),
      maxHp: Math.round(d.hp * m * K.HPK * (w ? K.WU_HP : 1)), shield: 0, alive: true, st: 'idle', stT: 0, atkT: 0.4, pend: null, buf: {}, dodgeP: clamp(d.speed / K.DODGE, 0.08, 0.35), inv: 0, koT: 0, trT: 0, ultT: 0, kb: 0 };
    h.hp = h.maxHp;
    if (w) { var L = lv; h.atk = { base: 34 * (1 + 0.3 * (L - 1)), iv: 0.8 - 0.03 * (L - 1), reach: 120 + 12 * (L - 1) + (L >= 4 ? 8 : 0) }; h.ult = { dmg: 170, stun: 1.2, cd: 30, dtype: 'phys', t: 12 }; }
    else { h.atk = JSON.parse(JSON.stringify(d.atk)); h.trait = d.trait; h.trCd = d.trait.cd * (lv >= 5 ? 0.75 : 1); h.trT = 6 + (id.length % 5); }
    h.ultBonus = lv >= 3 ? 1.3 : 1;
    return h;
  }

  function newFight(o) {
    o = o || {}; var seed = o.seed == null ? 1 : o.seed, rng = mulberry(seed * 9301 + 49297);
    var F = { t: 0, timer: K.TIMER, rng: rng, ev: [], q: [], over: null, cut: 0, time: 0 };
    var wl = o.wukongLv || 5;
    F.heroes = [mkHero('wukong', wl, 330)];
    if (o.partner) F.heroes.push(mkHero(o.partner, o.partnerLv || 5, 190));
    F.sumId = o.summon || null; F.sumLv = o.summonLv || 5; F.sumUsed = false; F.sm = null;
    F.policy = o.policy || null;
    F.boss = { x: 800, y: 0, face: -1, hp: K.BOSS_HP, maxHp: K.BOSS_HP, st: 'idle', stT: 0, bt: BOSS.bt0, bi: 0, phase: 1, meleeT: 1.2, stagger: 0, immune: 0, vuln: 0, vulnM: 0, tgt: null, hit: {}, finalDone: false, flash: 0, minions: [], waves: [], tele: null, kb: 0 };
    F.undead = [];
    return F;
  }
  function ev(F, o) { F.ev.push(o); }
  function alive(F) { return F.heroes.filter(function (h) { return h.alive; }); }
  function bossDef(F, dtype) { return dtype === 'magic' ? BOSS.mdef : BOSS.pdef; }

  // 英雄打 Boss
  function hitBoss(F, h, raw, dtype, elem, opt) {
    var b = F.boss; opt = opt || {};
    var m = raw * (0.92 + F.rng() * 0.16) * (h && h.buf.dmgUp > 0 ? h.buf.dmgM : 1) * (b.vuln > 0 ? 1 + b.vulnM : 1) * (b.stagger > 0 ? K.STAGGER_BONUS : 1);
    var d = m * (1 - bossDef(F, dtype)) * elemMul(elem, BOSS.elem);
    b.hp -= d; b.flash = 0.12;
    ev(F, { k: 'hit', x: b.x, y: 0, dmg: Math.round(d), by: h ? h.id : opt.by, big: !!opt.big, em: elemMul(elem, BOSS.elem) });
    if (opt.stun) stagger(F, opt.stun);
    if (b.hp <= 0 && !F.over) b.hp = 0;
    return d;
  }
  function stagger(F, sec) {
    var b = F.boss; if (b.immune > 0 || b.hp <= 0) return;
    b.stagger = Math.min(sec, K.STAGGER_MAX); b.immune = K.STAGGER_IMMUNE + b.stagger; b.st = 'stag'; b.stT = 0; b.tele = null; b.waves.length = 0 === 1 ? b.waves.length : b.waves.length;
    ev(F, { k: 'stagger', x: b.x });
  }
  // Boss 打英雄
  function hurtHero(F, h, raw, elem, opt) {
    if (!h.alive || h.inv > 0) return 0; opt = opt || {};
    var d = raw * K.BOSS_DMG * (0.92 + F.rng() * 0.16) * (1 - (BOSS.dtype === 'magic' ? h.mdef : h.pdef)) * elemMul(elem || BOSS.elem, h.elem);
    if (h.buf.wallT > 0) d *= 1 - h.buf.wallM;
    if (h.buf.drT > 0) d *= 0.5;
    if (h.shield > 0) { var a = Math.min(h.shield, d); h.shield -= a; d -= a; }
    h.hp -= d; h.st = d > 0.5 ? 'hurt' : h.st; h.stT = 0; if (opt.kb) h.kb = opt.kb;
    ev(F, { k: 'hurt', x: h.x, id: h.id, dmg: Math.round(d), big: !!opt.big });
    if (h.hp <= 0) { h.hp = 0; h.alive = false; h.st = 'ko'; h.stT = 0; ev(F, { k: 'ko', id: h.id, x: h.x, wu: h.w }); if (h.w && !F.over) F.over = { win: false, why: 'wukong' }; }
    return d;
  }
  function healHero(F, h, frac) { if (!h.alive) return; var a = h.maxHp * frac; h.hp = Math.min(h.maxHp, h.hp + a); ev(F, { k: 'heal', x: h.x, id: h.id, amt: Math.round(a) }); }
  function addShield(F, h, frac, cap) { if (!h.alive) return; h.shield = Math.min(h.maxHp * (cap || frac), h.shield + h.maxHp * frac); ev(F, { k: 'shield', x: h.x, id: h.id }); }

  /* ================= 召唤（唯一的玩家操作） ================= */
  function pressSummon(F) {
    if (F.sumUsed || F.over || F.sm) return false;
    var wu = F.heroes[0]; if (!wu.alive) return false;
    // 援军随机：九位特殊人物里排除场上搭档，等概率抽一位（o.summon 仅供模拟/测试强制指定）
    var pool = ORDER.filter(function (k) { return !F.heroes.some(function (h) { return h.id === k; }); });
    if (!F.sumId) F.sumId = pool[Math.floor(F.rng() * pool.length)];
    F.sumUsed = true; F.sm = { id: F.sumId, lv: F.sumLv, t: 0, phase: 'cut', hit: false, d: SP[F.sumId], pool: pool };
    ev(F, { k: 'summon', id: F.sumId, pool: pool });
    return true;
  }
  var SM_CUT = 0.9, SM_HIT = 0.55, SM_END = 1.9;       // 切镜 0.9s（<1s 转盘）（战斗暂停）→ 出招 0.55s 命中 → 收招离场
  function ultLand(F, s) {
    var d = s.d, sm = lvMul(s.lv) * Math.pow(d.power || 1, K.POW_EXP), u = d.ult, b = F.boss;
    var sk = K.SUMK[s.id] || 1;   // 援军强度逐人修正（只作用于“被召唤”时）
    var raw = u.dmg * sm * K.ULT_K * (s.lv >= 3 ? 1.3 : 1) * sk;
    raw = Math.min(raw, K.BOSS_HP * K.ULT_CAP);
    hitBoss(F, null, raw, u.dtype, d.elem, { by: s.id, big: true, stun: u.stun });
    var al = alive(F), i, e = u.e || {};
    if (e.heal) al.forEach(function (h) { healHero(F, h, e.heal * sk); });
    if (e.sh) al.forEach(function (h) { addShield(F, h, e.sh * sk, (e.shCap || e.sh) * sk); });
    if (e.wall) al.forEach(function (h) { h.buf.wallT = e.wall[0]; h.buf.wallM = e.wall[1]; });
    if (e.vuln) { b.vuln = e.vuln[1]; b.vulnM = e.vuln[0]; }
    if (e.undead) for (i = 0; i < e.undead; i++) F.undead.push({ t: 18, sm: sm, ac: i * 0.4 });
    if (e.as) al.forEach(function (h) { h.buf.asT = e.as[1]; h.buf.asM = e.as[0]; });
    if (e.dmgUp) al.forEach(function (h) { h.buf.dmgUp = e.dmgUp[1]; h.buf.dmgM = e.dmgUp[0]; });
    if (e.regen) F.regen = { t: e.regen, tick: 0 };
    if (e.delay) { b.bt = Math.max(b.bt, 0) + e.delay; if (b.st === 'tele' || b.st === 'spin' || b.st === 'shot') { b.st = 'idle'; b.stT = 0; b.tele = null; b.waves.length = 0; } ev(F, { k: 'interrupt', x: b.x }); }
    ev(F, { k: 'ultland', id: s.id, x: b.x });
  }

  /* ================= 推进一步 ================= */
  function step(F, dt) {
    if (F.over) return;
    var b = F.boss, wu = F.heroes[0], i, h;
    // 召唤切镜：战斗暂停（计时器也停）
    if (F.sm) {
      var s = F.sm; s.t += dt;
      if (s.t < SM_CUT) { F.cut = 1; return; }
      F.cut = 0;
      if (!s.hit && s.t >= SM_CUT + SM_HIT) { s.hit = true; ultLand(F, s); }
      if (s.t >= SM_CUT + SM_END) { ev(F, { k: 'leave', id: s.id }); F.sm = null; F.smDone = true; }
    }
    F.t += dt; F.timer -= dt;
    if (F.timer <= 0) { F.timer = 0; F.over = { win: false, why: 'time' }; return; }
    if (b.hp <= 0) { F.over = { win: true }; ev(F, { k: 'bossko', x: b.x }); return; }
    // 自动策略（模拟用；游戏里由玩家点按钮）
    if (F.policy && !F.sumUsed && !F.sm) {
      var P = F.policy, go = false, lo = 0, al0 = alive(F), mn = 1;
      al0.forEach(function (x) { mn = Math.min(mn, x.hp / x.maxHp); });
      if (P === 'early') go = F.t >= 6;
      else if (P === 'mid') go = F.t >= 20;
      else if (P === 'late') go = F.t >= 35;
      else if (P === 'smart') go = (mn < 0.45 && F.t >= 10) || (b.hp < b.maxHp * 0.7 && F.t >= 10) || F.t >= 45;
      if (go) pressSummon(F);
    }
    // 计时器
    b.vuln = Math.max(0, b.vuln - dt); b.flash = Math.max(0, b.flash - dt); b.immune = Math.max(0, b.immune - dt);
    if (F.regen && F.regen.t > 0) { F.regen.t -= dt; F.regen.tick -= dt; if (F.regen.tick <= 0) { F.regen.tick = 0.5; alive(F).forEach(function (x) { healHero(F, x, 0.03); }); } }
    for (i = F.q.length - 1; i >= 0; i--) { F.q[i].t -= dt; if (F.q[i].t <= 0) { var q = F.q.splice(i, 1)[0]; q.fn(); } }
    // 亡灵（园长）：每只每 1.2 秒咬一口
    for (i = F.undead.length - 1; i >= 0; i--) { var u = F.undead[i]; u.t -= dt; u.ac -= dt; if (u.ac <= 0) { u.ac = 1.2; hitBoss(F, null, 14 * u.sm, 'phys', 'wood', { by: 'yuanzhang' }); } if (u.t <= 0) F.undead.splice(i, 1); }
    // —— 阶段 ——
    if (b.hp < b.maxHp * 0.5 && b.phase === 1) { b.phase = 2; ev(F, { k: 'phase', n: 2, x: b.x }); }
    if (b.hp < b.maxHp * 0.25 && !b.finalDone && b.st !== 'final' && b.st !== 'stag') { b.finalDone = true; b.st = 'final'; b.stT = 0; b.tele = { x: b.x, r: 430, t: 1.8, max: 1.8 }; ev(F, { k: 'final', x: b.x }); }
    // —— 英雄 ——
    for (i = 0; i < F.heroes.length; i++) { h = F.heroes[i]; if (h.alive) heroAI(F, h, dt); else h.stT += dt; }
    // —— Boss ——
    bossAI(F, dt);
  }

  function nearestHeroFor(F) {
    var b = F.boss, best = null, bd = 1e9;
    // 仇恨轮换：每 AGGRO_T 秒重新抽一次目标（搭档被盯的概率 AGGRO_P），否则打最近的——搭档不能永远站在安全线外白打
    var ag = F.aggro; if (!ag || F.t >= ag.until || !F.heroes[ag.i] || !F.heroes[ag.i].alive) { var al = alive(F); var pick = al.length > 1 && F.rng() < (al[al.length - 1].arch === 'tank' ? K.TAUNT_P : K.AGGRO_P) ? al[al.length - 1] : null; if (al.length > 1 && !pick) pick = al[0]; F.aggro = ag = { i: pick ? F.heroes.indexOf(pick) : 0, until: F.t + K.AGGRO_T }; }
    if (F.heroes[ag.i] && F.heroes[ag.i].alive) return F.heroes[ag.i]; alive(F).forEach(function (h) { var d = Math.abs(h.x - b.x) * (h.w ? 0.67 : 1); if (d < bd) { bd = d; best = h; } }); return best;
  }

  function heroAI(F, h, dt) {
    var b = F.boss; h.stT += dt; h.inv = Math.max(0, h.inv - dt); h.kb *= Math.pow(0.001, dt);
    ['dmgUp', 'asT', 'wallT', 'drT'].forEach(function (k) { if (h.buf[k] > 0) h.buf[k] -= dt; });
    if (h.st === 'hurt' && h.stT > 0.25) { h.st = 'idle'; }
    if (h.st === 'jump' && h.stT > 0.5) { h.st = 'idle'; h.y = 0; }
    if (h.st === 'jump') { h.y = Math.sin(h.stT / 0.5 * Math.PI) * 70; }
    var dir = b.x > h.x ? 1 : -1; h.face = dir;
    var gap = Math.abs(b.x - h.x) - BOSS.r;
    var rch = h.atk.ranged ? h.atk.dist + 40 : h.atk.reach;
    var want = h.atk.ranged ? h.atk.dist : h.atk.reach - 30;
    if (!h.w) { var wu = F.heroes[0]; if (h.atk.ranged && wu.alive && h.x > wu.x - 70) want = Math.max(want, gap + 60); }   // 远程站在悟空身后
    var spd = h.speed * 1.35 * (h.buf.asT > 0 ? h.buf.asM : 1), mv = 0;
    // 被击退
    if (Math.abs(h.kb) > 5) { h.x += h.kb * dt; h.x = clamp(h.x, 70, K.ARENA - 70); }
    // 闪避红圈 / 冲锋
    if (h.st !== 'cast' && h.st !== 'jump' && b.tele && !b.tele.dodgeDecided) { /* 在 bossAI 里统一决定 */ }
    if (h.st === 'hurt' && h.stT < 0.18) return;
    if (h.st === 'dash') { h.x += h.dashV * dt; if (h.stT > 0.25) { h.st = 'idle'; } return; }
    // 大招 / 特性
    if (h.w) {
      h.ult.t -= dt; if (h.ult.t <= 0 && gap < 260 && h.st !== 'cast') { h.st = 'cast'; h.stT = 0; h.ultPend = true; h.ult.t = h.ult.cd; ev(F, { k: 'wuult', x: h.x }); }
      if (h.st === 'cast') { if (h.stT >= 0.5 && h.ultPend) { h.ultPend = false; hitBoss(F, h, h.ult.dmg * h.sm * K.ULT_K, 'phys', 'metal', { big: true, stun: 1.2, by: 'wukong' }); ev(F, { k: 'ultland', id: 'wukong', x: b.x }); } if (h.stT >= 0.8) h.st = 'idle'; return; }
    } else {
      h.trT -= dt;
      if (h.trT <= 0 && h.st !== 'cast') { if (traitWant(F, h, gap)) { h.st = 'cast'; h.stT = 0; h.trPend = true; } }
      if (h.st === 'cast') { if (h.stT >= 0.35 && h.trPend) { h.trPend = false; traitFire(F, h); h.trT = h.trCd; } if (h.stT >= 0.6) h.st = 'idle'; return; }
    }
    // 移动
    if (gap > want + 14) mv = dir; else if (h.atk.ranged && gap < want - 60) mv = -dir;
    if (mv) { h.x += mv * spd * dt; h.x = clamp(h.x, 70, K.ARENA - 70); if (h.st === 'idle' || h.st === 'walk') { h.st = 'walk'; } } else if (h.st === 'walk') h.st = 'idle';
    // 普攻
    h.atkT -= dt * (h.buf.asT > 0 ? h.buf.asM : 1);
    if (h.pend) { h.pend.t -= dt; if (h.pend.t <= 0) { var p = h.pend; h.pend = null; resolveAtk(F, h); } }
    if (!h.pend && h.atkT <= 0 && gap <= rch && h.st !== 'hurt' && b.hp > 0) {
      h.pend = { t: h.atk.ranged ? 0.12 : 0.16 }; h.st = 'atk'; h.stT = 0; h.atkT = h.atk.iv; h.face = dir;
    }
    if (h.st === 'atk' && h.stT > 0.3) h.st = mv ? 'walk' : 'idle';
  }
  function resolveAtk(F, h) {
    var b = F.boss, a = h.atk, dt0 = a.dtype || h.dtype, gap = Math.abs(b.x - h.x) - BOSS.r;
    var raw = a.base * h.sm;
    if (a.ranged) {
      var tt = Math.max(0.08, gap / 560);
      ev(F, { k: 'shot', from: h.x, to: b.x, id: h.id, t: tt, color: h.color });
      F.q.push({ t: tt, fn: function () { hitBoss(F, h, raw, dt0, h.elem); } });
    } else {
      if (gap > a.reach + 20) return;
      hitBoss(F, h, raw, dt0, h.elem);
    }
    // 个体附带
    if (a.fx === 'sisi') { var al = alive(F).sort(function (x, y) { return x.hp / x.maxHp - y.hp / y.maxHp; })[0]; if (al) { healHero(F, al, 0.005); addShield(F, al, K.SISI_SH * h.maxHp / al.maxHp, 0.08); } }
    if (a.fx === 'martin') alive(F).forEach(function (o) { if (o !== h && Math.abs(o.x - h.x) < 260) { o.buf.dmgUp = 3; o.buf.dmgM = 1.25; o.buf.asT = 3; o.buf.asM = 1.1; } });
    if (a.fx === 'undead') { h.zt = (h.zt || 0) + 1; if (h.zt % 3 === 0 && F.undead.length < 3) F.undead.push({ t: 18, sm: h.sm, ac: 0.3 }); }
  }
  function traitWant(F, h, gap) {
    var al = alive(F), low = al.some(function (x) { return x.hp < x.maxHp * 0.6; });
    switch (h.arch) {
      case 'heal': return low || F.t > 40;
      case 'tank': return gap < 350 && (F.boss.tele || F.boss.st === 'charge' || F.t > 8);
      case 'dash': return gap > 150 && gap < 600;
      default: return gap < 700;
    }
  }
  function traitFire(F, h) {
    var b = F.boss, sm = h.sm;
    ev(F, { k: 'trait', id: h.id, x: h.x, name: h.trait.name });
    switch (h.arch) {
      case 'storm': hitBoss(F, h, 160 * sm, 'magic', h.elem, { big: true, stun: 1.5 }); break;
      case 'mark': hitBoss(F, h, 150 * sm, h.dtype, h.elem, { big: true, stun: 1.5 }); break;
      case 'heal': alive(F).forEach(function (o) { healHero(F, o, (K.TRHEAL[h.id] != null ? K.TRHEAL[h.id] : 0.3)); }); break;
      case 'tank': alive(F).forEach(function (o) { if (Math.abs(o.x - h.x) < 320) o.buf.drT = 5; }); break;
      case 'dash': h.st = 'dash'; h.stT = 0; h.dashV = (b.x > h.x ? 1 : -1) * 1600; h.inv = Math.max(h.inv, 0.6); hitBoss(F, h, 55 * sm * 3, h.dtype, h.elem, { stun: 0.3 }); break;
    }
  }

  /* ================= 牛魔王 AI ================= */
  var KIT = ['charge', 'shot', 'summon'], KIT2 = ['charge', 'shot', 'spin', 'summon'];
  function decideDodge(F, tag) {   // 红圈 / 冲锋出现时，每个英雄一次性判定“跳开”
    F.heroes.forEach(function (h) { if (h.alive && h.st !== 'cast' && h.st !== 'dash') { h.dg = F.rng() < h.dodgeP * (tag === 'final' ? 0.7 : 1); } else h.dg = false; });
  }
  function jump(F, h) { if (h.st === 'cast') return; h.st = 'jump'; h.stT = 0; ev(F, { k: 'dodge', id: h.id, x: h.x }); }

  function bossAI(F, dt) {
    var b = F.boss, ph2 = b.phase === 2, i, h;
    if (b.kb) { b.x = clamp(b.x + b.kb * dt, 80, K.ARENA - 80); b.kb *= Math.pow(0.002, dt); }
    b.stT += dt;
    // 小弟（牛头卫）：冲上来撞一下就走
    for (i = b.minions.length - 1; i >= 0; i--) {
      var m = b.minions[i]; m.t += dt;
      if (!m.done) { var tg = nearestHeroFor(F); if (!tg) { b.minions.splice(i, 1); continue; } var dd = tg.x - m.x; m.x += Math.sign(dd) * 260 * dt; m.face = Math.sign(dd) || -1;
        if (Math.abs(dd) < 50) { m.done = true; m.t = 0; if (!(F.rng() < tg.dodgeP * 0.6)) hurtHero(F, tg, 17, 'earth', { kb: -90 }); else jump(F, tg); } }
      else if (m.t > 0.6) b.minions.splice(i, 1);
    }
    // 火焰波
    for (i = b.waves.length - 1; i >= 0; i--) {
      var w = b.waves[i]; w.t += dt; if (w.t < 0) continue; w.x -= 340 * dt;
      F.heroes.forEach(function (h) { if (h.alive && !w.hit[h.id] && Math.abs(w.x - h.x) < 34) { w.hit[h.id] = 1; if (h.st === 'jump' || F.rng() < h.dodgeP * 0.6) { if (h.st !== 'jump' && h.st !== 'cast') jump(F, h); } else hurtHero(F, h, 12, 'fire', { kb: -50 }); } });
      if (w.x < 40) b.waves.splice(i, 1);
    }
    if (b.hp <= 0) return;
    if (b.st === 'stag') { b.stagger -= dt; if (b.stagger <= 0) { b.st = 'idle'; b.bt = Math.max(b.bt, 0.5); } return; }
    var tg = nearestHeroFor(F); if (!tg) return;
    var dir = tg.x < b.x ? -1 : 1, gap = Math.abs(tg.x - b.x) - BOSS.r;
    var cd = ph2 ? BOSS.cd2 : BOSS.cd1;
    b.face = dir;
    if (b.st === 'final') {
      b.tele.t -= dt; if (b.tele.t < 1.7 && !b.tele.dd) { b.tele.dd = 1; decideDodge(F, 'final'); F.heroes.forEach(function (h) { if (h.dg) jump(F, h); }); }
      if (b.tele.t <= 0) { var T = b.tele; b.tele = null; ev(F, { k: 'finalhit', x: b.x });
        F.heroes.forEach(function (h) { if (h.alive && Math.abs(h.x - T.x) < T.r) { if (h.dg) { /* 跳开 */ } else hurtHero(F, h, 78, 'earth', { big: true, kb: -160 }); } });
        b.st = 'idle'; b.bt = 1.5; }
      return;
    }
    if (b.st === 'idle') {
      b.meleeT -= dt; b.bt -= dt;
      if (gap > 56) { b.x += dir * BOSS.speed * (b.vuln > 0 ? 1 : 1) * dt; b.x = clamp(b.x, 80, K.ARENA - 80); b.mv = true; } else b.mv = false;
      if (b.bt <= 0) {
        var kit = ph2 ? KIT2 : KIT, sk = kit[b.bi++ % kit.length];
        if (sk === 'charge') { b.st = 'tele'; b.stT = 0; b.cdir = dir; b.tele = { x: b.x, len: 520, dir: dir, t: 1.0, max: 1.0 }; decideDodge(F, 'charge'); ev(F, { k: 'tele', n: 'charge', x: b.x }); }
        else if (sk === 'spin') { b.st = 'spin'; b.stT = 0; b.sp1 = b.sp2 = false; decideDodge(F, 'spin'); ev(F, { k: 'tele', n: 'spin', x: b.x }); }
        else if (sk === 'shot') { b.st = 'shot'; b.stT = 0; ev(F, { k: 'tele', n: 'shot', x: b.x }); }
        else { b.st = 'roar'; b.stT = 0; ev(F, { k: 'tele', n: 'summon', x: b.x }); }
      } else if (b.meleeT <= 0 && gap <= 96) {
        b.st = 'melee'; b.stT = 0; b.meleeT = BOSS.meleeIv * (ph2 ? 0.8 : 1); ev(F, { k: 'tele', n: 'melee', x: b.x });
      }
    } else if (b.st === 'melee') {
      if (b.stT >= 0.38 && !b.mdone) { b.mdone = true; alive(F).forEach(function (h) { if (Math.abs(h.x - b.x) < BOSS.r + 130 && (h.x - b.x) * b.face > -10) hurtHero(F, h, BOSS.dmg * 1.2 * (h === tg ? 1 : K.SPLASH), 'earth', { kb: 70 * b.face }); }); ev(F, { k: 'meleehit', x: b.x, face: b.face }); }
      if (b.phase === 2 && b.stT >= 0.62 && !b.mdone2) { b.mdone2 = true; alive(F).forEach(function (h) { if (Math.abs(h.x - b.x) < BOSS.r + 130 && (h.x - b.x) * b.face > -10) hurtHero(F, h, BOSS.dmg * K.COMBO2 * (h === tg ? 1 : K.SPLASH), 'earth', { kb: 40 * b.face }); }); ev(F, { k: 'meleehit', x: b.x, face: b.face, n: 2 }); }
      if (b.stT >= (b.phase === 2 ? 0.95 : 0.6)) { b.st = 'idle'; b.mdone = false; b.mdone2 = false; }
    } else if (b.st === 'tele') {
      b.tele.t -= dt; if (b.tele.t < 0.9 && !b.tele.jd) { b.tele.jd = 1; F.heroes.forEach(function (h) { if (h.dg && Math.abs(h.x - b.x) < 560) jump(F, h); }); }
      if (b.tele.t <= 0) { b.st = 'charge'; b.stT = 0; b.hit = {}; b.tele = null; ev(F, { k: 'chargego', x: b.x }); }
    } else if (b.st === 'charge') {
      b.x = clamp(b.x + b.cdir * 560 * dt, 80, K.ARENA - 80);
      F.heroes.forEach(function (h) { if (h.alive && !b.hit[h.id] && Math.abs(h.x - b.x) < 70) { b.hit[h.id] = 1; if (h.dg || h.st === 'jump') { if (h.st !== 'jump') jump(F, h); } else hurtHero(F, h, BOSS.dmg * 2.3, 'earth', { big: true, kb: -150 }); } });
      if (b.stT >= 0.75 || b.x <= 80 || b.x >= K.ARENA - 80) { b.st = 'recover'; b.stT = 0; b.bt = cd; }
    } else if (b.st === 'spin') {
      if (b.stT > 0.3 && !b.spj) { b.spj = true; F.heroes.forEach(function (h) { if (h.dg && Math.abs(h.x - b.x) < K.SPIN_R + 40) jump(F, h); }); }
      [0.8, 1.15].forEach(function (tm, ix) { if (b.stT >= tm && !b['sp' + (ix + 1)]) { b['sp' + (ix + 1)] = true; F.heroes.forEach(function (h) { if (h.alive && Math.abs(h.x - b.x) < K.SPIN_R && !(h.dg || h.st === 'jump')) hurtHero(F, h, BOSS.dmg * K.SPIN_DMG, 'earth', { kb: (h.x < b.x ? -80 : 80) }); }); ev(F, { k: 'spinhit', x: b.x, i: ix }); } });
      if (b.stT >= 1.5) { b.st = 'recover'; b.stT = 0; b.bt = cd; b.spj = false; }
    } else if (b.st === 'recover') { if (b.stT >= 0.7) { b.st = 'idle'; } }
    else if (b.st === 'shot') {
      if (b.stT >= 0.55 && !b.shotDone) { b.shotDone = true; var n = ph2 ? 5 : 3; for (var k = 0; k < n; k++) b.waves.push({ x: b.x - 40, t: -k * 0.28, hit: {} }); ev(F, { k: 'flames', x: b.x }); }
      if (b.stT >= 0.9) { b.st = 'idle'; b.shotDone = false; b.bt = cd; }
    } else if (b.st === 'roar') {
      if (b.stT >= 0.7 && !b.roarDone) { b.roarDone = true; var nn = ph2 ? 3 : 2; for (var j = 0; j < nn; j++) b.minions.push({ x: K.ARENA - 40 + j * 70, t: 0, face: -1 }); ev(F, { k: 'guards', x: b.x }); }
      if (b.stT >= 1.0) { b.st = 'idle'; b.roarDone = false; b.bt = cd; }
    }
  }

  /* ================= 一次完整模拟 ================= */
  function run(o) {
    var F = newFight(o), dt = 1 / 30, g = 0;
    while (!F.over && g++ < 20000) { step(F, dt); F.ev.length = 0; }
    return F;
  }
  var BF = { K: K, BOSS: BOSS, WU: WU, SP: SP, ORDER: ORDER, newFight: newFight, step: step, pressSummon: pressSummon, run: run, lvMul: lvMul, SM: { CUT: SM_CUT, HIT: SM_HIT, END: SM_END } };
  if (typeof module !== 'undefined' && module.exports) module.exports = BF; else root.BF = BF;
})(typeof window !== 'undefined' ? window : globalThis);
