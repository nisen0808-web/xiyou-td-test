/* ============================================================
 * fabao.js —— v0.7 法宝系统重做（docs/fabao-proposal-v1.md）· 数据 + 规则
 *   开关 C.FABAO_V2：关 = 旧规则（cards.js / cardrule.js 不动）；开 = 本文件接管
 *   · 4 法宝格 + 3 灵物格，全队共用；法宝 Lv1–5、灵物 Lv1–3；满级法宝 + 指定另一件 → 炼化成超级法宝（8 条配方）
 *   · 来源：宝箱 ×4 / 夜潮备战 ×3 / 洞府首杀（该洞专属法宝）/ 任务奖励；取消小怪掉卡
 *   · 三选一：必有 1 项升级、盯配方偏向、重抽（1 免费 + 金币递增）、封印、放弃换金币；全满则只给金币 / 回血（不弹窗）
 *   · 法宝出手（行为）在 fabao2.js，界面在 fabaoui.js；所有数值是占位，用探针调
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C, K = XY.cards, rand = XY.rand;
  C.FABAO_V2 = true; C.FB_DMUL = 120; C.FB_SPD = 5; C.FB_RNG = 2.5;
  C.FB = { SLOT_F: 4, SLOT_L: 3, KG: 0.08, RR_COST: 40, SKIP_COINS: 40, ELITE_COINS: 12, PIN_W: 2, CHESTS: 4, OPTS: 3, LVMUL: 0.3 };
  var FB = XY.fabao = {};
  FB.on = function () { return !!C.FABAO_V2; };

  /* ---------- 门派（沿用旧 4 套的羁绊数值：≥2 = 旧 t3，≥4 = 旧 t5）---------- */
  // 数据：id, 名, 种类(f 法宝 / l 灵物), 五行, 出处(sui 随身 / team 全队 / guard 守护), 门派, 起手可用, 一句话作用, Lv3 升级点, Lv5 满级
  var L = [
    ['jingubang', '金箍棒', 'f', 'metal', 'sui', 'qitian', 1, '每 3 秒向前横扫一棒（扇形清群）', '冷却 −15%', '扇形 150°，命中破甲 10%'],
    ['jiuchi', '九齿钉耙', 'f', 'earth', 'sui', 'hufa', 1, '每 4 秒砸地一圈：伤害 + 短晕', '范围 +25%', '晕 1 秒，砸两下'],
    ['xiangyao', '降妖宝杖', 'f', 'water', 'sui', 'hufa', 1, '月牙铲绕英雄转，挡近身杂兵', '2 片', '3 片，转速 +20%'],
    ['jingangzhuo', '金刚琢', 'f', 'metal', 'sui', 'tianting', 0, '抛出圈再飞回来，穿透一排', '穿 5 只', '去回各打一次，对精英 +30%'],
    ['hulu', '紫金红葫芦', 'f', 'wood', 'sui', 'tianting', 0, '每 8 秒吸入范围内最强的非 BOSS 怪', '冷却 −20%', '一次吸 2 只，BOSS 吃 3% 血量'],
    ['huangjin', '幌金绳', 'f', 'earth', 'sui', 'tianting', 0, '捆住最多 4 只 2.5 秒', '捆 4 只', '被捆的怪受伤 +20%'],
    ['bajiaoshan', '芭蕉扇', 'f', 'wood', 'sui', 'hufa', 0, '向前扇出风：推开怪、吹散弓箭', '范围 +25%', '风幕持续 1.5 秒'],
    ['zhaoyao', '照妖镜', 'f', 'metal', 'sui', 'tianting', 0, '每 10 秒显形一片，6 秒内受伤 +25%', '半径 +25%', '受伤 +40%'],
    ['liuli', '琉璃盏', 'f', 'fire', 'sui', 'tianting', 1, '沿英雄走过的路留下火径', '持续 5 秒', '火径变宽，灼烧更强'],
    ['sanmei', '三昧火种', 'f', 'fire', 'sui', 'hufa', 0, '每 5 秒射出追踪火球，落点爆炸', '2 颗', '3 颗，爆炸带灼烧'],
    ['pantao', '蟠桃', 'f', 'wood', 'team', 'qitian', 1, '每 12 秒结一枚桃在残血队友旁，走过去吃', '回 25%', '回 35%，同时 +10% 移速 3 秒'],
    ['bishui', '避水珠', 'f', 'water', 'team', 'hufa', 1, '每位英雄（不含唐僧）一颗水珠：挡掉下一次受到的伤害（不管多大），碎后冷却 35 秒再长出来', '冷却 28 秒', '冷却 22 秒；碎裂时周围英雄 1 秒减伤'],
    ['jingping', '玉净瓶', 'f', 'water', 'guard', 'fomen', 0, '营地周围洒甘露：圈内怪减速', '半径 +30%', '减速 35%，圈内英雄回血'],
    ['jiasha', '锦襴袈裟', 'f', 'earth', 'guard', 'fomen', 0, '唐僧周围护体圈：圈内怪伤害 −，营地回血', '半径 +30%', '唐僧遇袭时额外短暂减伤'],
    ['chanzhang', '九环锡杖', 'f', 'earth', 'guard', 'fomen', 0, '每 7 秒从唐僧处震一圈：晕', '半径 +30%', '晕 1.2 秒，推开精英'],
    // 灵物（被动，Lv1–3）
    ['jindouyun', '筋斗云', 'l', null, 'team', 'qitian', 1, '移速 +6% / 级', '', '闪避冷却 −20%（占位：移速再 +4%）'],
    ['huoyan', '火眼金睛', 'l', null, 'team', 'qitian', 1, '暴击 +5% / 级', '', '精英护盾更容易打破（对护盾伤害 +33%）'],
    ['qishier', '七十二变', 'l', null, 'team', 'qitian', 0, '法宝冷却 −6% / 级', '', '每 60 秒随机 1 件法宝 5 秒内出手速度翻倍'],
    ['jinguzhou', '紧箍咒', 'l', null, 'team', 'qitian', 0, '大招冷却 −8% / 级', '', '大招冷却再 −4%（占位）'],
    ['renshen', '人参果', 'l', null, 'team', 'hufa', 1, '全队每秒回血 +0.4 / 级', '', '营地回血 +3'],
    ['qiankun', '乾坤袋', 'l', null, 'team', 'tianting', 0, '重抽 +1、封印 +1（每级）', '', '三选一变成四选一'],
    ['nianzhu', '菩提念珠', 'l', null, 'guard', 'fomen', 0, '营地血量 +200、营地回血 +1（每级）', '', '营地回血再 +2（占位）']
  ];
  FB.ITEMS = []; FB.BY = {};
  L.forEach(function (a) { var it = { id: a[0], name: a[1], kind: a[2], el: a[3], src: a[4], set: a[5], starter: !!a[6], d: a[7], u3: a[8], u5: a[9] }; FB.ITEMS.push(it); FB.BY[it.id] = it; });
  FB.maxLv = function (id) { var it = FB.BY[id]; return it && it.kind === 'l' ? 3 : 5; };
  FB.EL_NAME = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };

  // 8 条配方：A（满级法宝）+ B（拥有即可）→ 超级法宝（占 A 的格；B 消失）
  FB.RECIPES = [
    { id: 'r1', a: 'jingubang', b: 'jindouyun', sup: 'wanzhang', name: '万丈金箍棒', d: '每 4 秒向怪最密处落一根巨棒：大范围伤害 + 晕 1 秒（英雄不用靠近）', lore: '一个筋斗十万八千里，棒子变得顶天立地' },
    { id: 'r2', a: 'jiuchi', b: 'xiangyao', sup: 'tianhe', name: '天河镇岳', d: '砸地掀起水浪：圈内怪持续减速；环绕月牙铲伤害 ×2，且一件占 1 格', lore: '八戒、沙僧本是天河水神，合力镇山' },
    { id: 'r3', a: 'bajiaoshan', b: 'liuli', sup: 'liefeng', name: '火焰山烈风', d: '扇出一道火墙：推开怪并点燃，持续 3 秒', lore: '火焰山：扇一扇，火越旺' },
    { id: 'r4', a: 'hulu', b: 'huoyan', sup: 'shouhun', name: '照妖收魂葫', d: '每 20 秒喊一声：屏幕里的小怪同时被收；精英 / BOSS 受 8% 最大生命（有上限）', lore: '你应了就被收进去，火眼金睛识破真身' },
    { id: 'r5', a: 'jingangzhuo', b: 'sanmei', sup: 'huolun', name: '乾坤火轮', d: '燃烧的圈飞出去穿透一排；回来时再爆一次', lore: '金刚琢碰上三昧真火' },
    { id: 'r6', a: 'pantao', b: 'renshen', sup: 'panhui', name: '蟠桃盛会', d: '每 15 秒全队回 35% 生命 + 5 秒加速（不是复活）', lore: '王母蟠桃配五庄观人参果' },
    { id: 'r7', a: 'jiasha', b: 'nianzhu', sup: 'jinchan', name: '金蝉法衣', d: '唐僧周围佛光结界：圈内怪每秒受伤并减速 40%，圈内英雄减伤', lore: '金蝉子转世，法衣加持' },
    { id: 'r8', a: 'bishui', b: 'jingping', sup: 'dinghai', name: '定海神珠', d: '每位英雄一颗水珠，挡一下伤害，冷却 30 秒；营地也有一颗（冷却 40 秒）；营地水域减速', lore: '观音净瓶与龙宫之宝，镇海定波' }
  ];
  FB.SUP = {}; FB.RECIPES.forEach(function (r) { var a = FB.BY[r.a]; FB.SUP[r.sup] = { id: r.sup, name: r.name, kind: 'f', set: a.set, el: a.el, src: a.src, sup: true, d: r.d, rid: r.id }; });
  FB.recipe = function (rid) { return FB.RECIPES.filter(function (r) { return r.id === rid; })[0]; };
  FB.info = function (id) { return FB.BY[id] || FB.SUP[id] || null; };
  FB.SET_NAME = { qitian: '齐天', hufa: '护法', fomen: '佛门', tianting: '天庭' };

  // 洞府首杀 → 该洞专属法宝（永久解锁）；通关奖励解锁灵物
  FB.DEN_ITEM = { heifeng: 'jiasha', baihu: 'zhaoyao', lianhua: 'hulu', huoyun: 'sanmei', huangfeng: 'chanzhang', bajiao: 'bajiaoshan', cuiyun: 'jingping', moyun: 'jingangzhuo', huoyan: 'huangjin' };
  FB.DEN_NAME = { heifeng: '黑风洞 黑熊精', baihu: '白虎岭 白骨精', lianhua: '莲花洞 金角银角', huoyun: '火云洞 红孩儿', huangfeng: '黄风洞 黄风怪', bajiao: '芭蕉洞 铁扇公主', cuiyun: '翠云洞 玉面公主', moyun: '摩云洞 牛魔王', huoyan: '火焰洞 赤炎' };
  FB.CLEAR_ITEM = { 1: ['qishier', 'jinguzhou'], 2: ['qiankun', 'nianzhu'] };
  FB.whereText = function (id) {
    var it = FB.BY[id], k; if (!it || it.starter) return '起手可用';
    for (k in FB.DEN_ITEM) if (FB.DEN_ITEM[k] === id) return '击败 ' + (FB.DEN_NAME[k] || k);
    for (k in FB.CLEAR_ITEM) if (FB.CLEAR_ITEM[k].indexOf(id) >= 0) return '通关第 ' + k + ' 关';
    return '';
  };

  /* ---------- 存档：data.fb = {unl:{id:1}, made:{rid:次数}}；旧存档：已拥有的新池内卡视为已解锁 ---------- */
  FB.sv = function () {
    var d = XY.save.data;
    if (!d.fb || typeof d.fb !== 'object') d.fb = { unl: {}, made: {}, mig: 0 };
    var f = d.fb; if (!f.unl) f.unl = {}; if (!f.made) f.made = {};
    if (!f.mig) { f.mig = 1; for (var id in (d.cards || {})) if (FB.BY[id]) f.unl[id] = 1; }
    return f;
  };
  FB.unlocked = function (id) { var it = FB.BY[id]; return !!it && (it.starter || !!FB.sv().unl[id]); };
  FB.unlock = function (id) { var f = FB.sv(); if (!FB.BY[id] || FB.unlocked(id)) return false; f.unl[id] = 1; XY.save.touch(); return true; };
  FB.kg = function (id) { var c = XY.save.data.cards[id]; return c ? Math.min(3, Math.max(0, (c.lv || 1) - 1)) : 0; };    // 开光：旧 Lv1→0 … Lv4/5→3，每级 +8%
  FB.kgMul = function (id) { return 1 + C.FB.KG * FB.kg(id); };
  FB.retired = function () { return XY.CARDS.filter(function (c) { return !FB.BY[c.id]; }); };     // 典藏：通关文牒、舍利子、紫金钵盂、莲花宝座

  /* ---------- 局内状态 ---------- */
  FB.state = function (G) { return G.fb; };
  FB.held = function (G, id) { var f = G.fb, i; if (!f) return null; for (i = 0; i < f.w.length; i++) if (f.w[i].id === id) return f.w[i]; for (i = 0; i < f.s.length; i++) if (f.s[i].id === id) return f.s[i]; return null; };
  FB.all = function (G) { return G.fb ? G.fb.w.concat(G.fb.s) : []; };
  FB.lvOf = function (G, id) { var h = FB.held(G, id); return h ? h.lv : 0; };
  FB.full = function (G, kind) { return kind === 'l' ? G.fb.s.length >= C.FB.SLOT_L : G.fb.w.length >= C.FB.SLOT_F; };
  function mkSlot(id, lv) { return { id: id, lv: lv || 1, sup: !!FB.SUP[id], t: 0, a: 0 }; }
  FB.addItem = function (G, id, lv) {
    var it = FB.info(id); if (!it || FB.held(G, id)) return null;
    var s = mkSlot(id, lv); (it.kind === 'l' ? G.fb.s : G.fb.w).push(s); return s;
  };
  FB.init = function (G) {
    C.CHEST_TIMES = FB.on() ? [100, 220, 340, 460].slice(0, C.FB.CHESTS) : [100, 220, 340, 460, 580, 700];
    G.fb = null; if (!FB.on()) return;
    G.fb = { w: [], s: [], pin: null, sealed: {}, rrFree: 1, sealN: 1, rrGiven: 1, sealGiven: 1, offers: 0, log: [], made: [], fx: [], proj: [], patches: [], peaches: [], walls: [], hits: 0, firstMade: 0, fullAt: 0, rrPaid: 0, coinsRr: 0, auto: 0 };
    G.deckIds = []; G.runCards = {}; G.activeCard = null; G.cardLog = G.cardLog || [];
    var sv = XY.save, n = 0;
    sv.data.deck.forEach(function (id) { var it = FB.BY[id]; if (!it || !FB.unlocked(id) || FB.held(G, id) || FB.full(G, it.kind)) return; FB.addItem(G, id, 1); n++; });
    if (!G.fb.w.length && !G.fb.s.length) FB.addItem(G, 'jingubang', 1);
    FB.recalc(G);
  };

  /* ---------- 重算：灵物属性 + 门派羁绊 → G.cm（recalcParty 读它）---------- */
  FB.recalc = function (G) {
    var f = G.fb, cm = {}, cnt = {}, combos = [], i, k;
    f.cdr = 0; f.shMul = 1; f.opts = C.FB.OPTS; f.rrMax = 1; f.sealMax = 1;
    function add(k, v) { cm[k] = (cm[k] || 0) + v; }
    FB.all(G).forEach(function (s) {
      var it = FB.info(s.id), kg = it.sup ? 1 : FB.kgMul(s.id), lv = s.lv;
      cnt[it.set] = (cnt[it.set] || 0) + 1;
      if (it.kind !== 'l') return;
      switch (s.id) {
        case 'jindouyun': add('move', 0.06 * lv * kg + (lv >= 3 ? 0.04 : 0)); break;
        case 'huoyan': add('crit', 0.05 * lv * kg); if (lv >= 3) f.shMul = 1.33; break;
        case 'qishier': f.cdr += 0.06 * lv * kg; break;
        case 'jinguzhou': add('ultCd', 0.08 * lv * kg + (lv >= 3 ? 0.04 : 0)); break;
        case 'renshen': add('regen', 0.4 * lv * kg); if (lv >= 3) add('campRegen', 3); break;
        case 'qiankun': f.rrMax += lv; f.sealMax += lv; if (lv >= 3) f.opts = C.FB.OPTS + 1; break;
        case 'nianzhu': add('camp', 200 * lv * kg); add('campRegen', lv * kg + (lv >= 3 ? 2 : 0)); break;
      }
    });
    f.cdr = Math.min(0.5, f.cdr);
    if (f.rrMax > f.rrGiven) { f.rrFree += f.rrMax - f.rrGiven; f.rrGiven = f.rrMax; }          // 乾坤袋每级 +1 次免费重抽 / +1 次封印（只补差额，重算不会重复送）
    if (f.sealMax > f.sealGiven) { f.sealN += f.sealMax - f.sealGiven; f.sealGiven = f.sealMax; }
    XY.SET_ORDER.forEach(function (sid) {
      var n = cnt[sid] || 0, tier = n >= 4 ? 2 : (n >= 2 ? 1 : 0), s = XY.CARD_SETS[sid];
      if (C.NO_COMBO) tier = 0;                                  // 探针 / 测试开关：关掉门派羁绊
      for (var t = 0; t < tier; t++) { var fx = (t === 0 ? s.t3 : s.t5).fx; for (k in fx) add(k, fx[k]); }
      if (n > 0) combos.push({ set: sid, n: n, tier: tier });
    });
    G.cm = cm; G.combos = combos; G.deckIds = G.deckIds || [];
  };
  FB.refresh = function (G) { var oc = G.camp.maxHp; FB.recalc(G); XY.recalcAll(G); if (G.camp.maxHp > oc) G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + (G.camp.maxHp - oc)); };

  /* ---------- 配方状态 ---------- */
  // 'ready' 可炼化 · 'prog' 进行中 · 'missB' 缺 B · 'locked' 未解锁 · 'done' 已炼成（本趟）
  FB.recipeState = function (G, r) {
    var a = FB.held(G, r.a), b = FB.held(G, r.b), made = G.fb && G.fb.made.indexOf(r.id) >= 0;
    if (made) return { st: 'done', a: a, b: b };
    if (a && a.lv >= 5 && b) return { st: 'ready', a: a, b: b };
    if (!FB.unlocked(r.a) || !FB.unlocked(r.b)) return { st: 'locked', a: a, b: b };
    return { st: a ? (b ? 'prog' : 'missB') : 'prog', a: a, b: b };
  };
  FB.ready = function (G) { return FB.RECIPES.filter(function (r) { return FB.recipeState(G, r).st === 'ready'; }); };
  FB.fuse = function (G, rid) {
    var r = FB.recipe(rid), st = r && FB.recipeState(G, r); if (!st || st.st !== 'ready') return false;
    var f = G.fb, a = st.a, bi = f.s.indexOf(st.b); if (bi < 0) bi = f.w.indexOf(st.b);
    var home = f.w.indexOf(a), sup = mkSlot(r.sup, 1);
    f.w[home] = sup; if (f.s.indexOf(st.b) >= 0) f.s.splice(f.s.indexOf(st.b), 1); else f.w.splice(f.w.indexOf(st.b), 1);
    f.made.push(rid); if (f.pin === rid) f.pin = null; if (!f.firstMade) f.firstMade = G.t;
    var sv = FB.sv(); sv.made[rid] = (sv.made[rid] || 0) + 1; XY.save.touch();
    G.stats.fused = (G.stats.fused || 0) + 1;
    FB.refresh(G);
    f.fuseAnim = { rid: rid, t: 0, max: 1.4 }; XY.banner(G, '炼成：' + r.name + '！', 3);
    return true;
  };

  /* ---------- 三选一 ---------- */
  function wOf(G, id, isUp) {
    var f = G.fb, w = 1, r = f.pin && FB.recipe(f.pin);
    if (r && (id === r.a || id === r.b)) w *= C.FB.PIN_W;
    return w;
  }
  function pickW(arr, getW) { var tot = 0, i; arr.forEach(function (x) { tot += getW(x); }); var r = Math.random() * tot; for (i = 0; i < arr.length; i++) { r -= getW(arr[i]); if (r <= 0) return arr[i]; } return arr[arr.length - 1]; }
  // 候选池：已解锁、没封印、没带满；升级 = 带着且没满级
  FB.pool = function (G) {
    var f = G.fb, up = [], nw = [];
    FB.all(G).forEach(function (s) { if (!s.sup && s.lv < FB.maxLv(s.id) && !f.sealed[s.id]) up.push({ k: 'up', id: s.id, from: s.lv, to: s.lv + 1 }); });
    FB.ITEMS.forEach(function (it) { if (FB.unlocked(it.id) && !FB.held(G, it.id) && !f.sealed[it.id] && !FB.full(G, it.kind)) nw.push({ k: 'new', id: it.id, to: 1 }); });
    return { up: up, nw: nw };
  };
  FB.cards = function (G, n, excl, skip) {
    var f = G.fb, P = FB.pool(G), out = [], used = {}, c;
    function take(c) { if (c && !used[c.id]) { out.push(c); used[c.id] = 1; return true; } return false; }
    skip = skip || {};
    var up = P.up.filter(function (x) { return !skip[x.id]; }), nw = P.nw.filter(function (x) { return !skip[x.id]; });
    if (excl) { var e = up.concat(nw).filter(function (x) { return x.id === excl; })[0]; if (e) take(e); }
    if (up.length && out.length < n && !out.some(function (x) { return x.k === 'up'; })) take(pickW(up.filter(function (x) { return !used[x.id]; }), function (x) { return wOf(G, x.id, true); }));      // 必有 1 项升级
    var rest = up.concat(nw).filter(function (x) { return !used[x.id]; });
    while (out.length < n && rest.length) { c = pickW(rest, function (x) { return wOf(G, x.id, x.k === 'up'); }); take(c); rest = rest.filter(function (x) { return !used[x.id]; }); }
    return out;
  };
  FB.fuseCards = function (G) { var n = Math.max(1, 5 - G.fb.opts); return FB.ready(G).slice(0, n).map(function (r) { return { k: 'fuse', id: r.sup, rid: r.id, from: r.a }; }); };   // 键盘只认 1–5：3 张常规 + 最多 2 张炼化（四选一时最多 1 张）
  FB.fullReward = function (G) {
    G.coins += 60; G.heroes.forEach(function (h) { if (!h.down) XY.core.healHero(G, h, h.maxHp * 0.15, false); });
    XY.toast(G, '法宝都已满级：化作 60 金币 + 全队回血'); G.fb.fullAt = G.fb.fullAt || G.t;
  };
  FB.offer = function (G, opts) {
    opts = opts || {}; var f = G.fb; if (!f) return null;
    f.offers++; G.stats.offers = (G.stats.offers || 0) + 1;
    if (opts.excl && !G.mod && FB.unlock(opts.excl)) { XY.toast(G, '永久解锁：' + FB.BY[opts.excl].name); G.stats.fbUnl = (G.stats.fbUnl || 0) + 1; }
    var cards = FB.cards(G, f.opts, opts.excl); FB.fuseCards(G).forEach(function (c) { cards.push(c); });
    if (!cards.length) {                                         // 全满：只给金币 / 回血，不弹窗
      FB.fullReward(G); return 'full';
    }
    if (G.lair) { f.auto++; FB.take(G, cards[FB.recommend(G, cards)], opts); return 'auto'; }
    if (window.XY_AUTO_CARDS && !(opts && opts.manual)) { FB.autoPick(G, cards, opts); return 'auto'; }
    if (G.cardOffer) { G.cardOfferQ = G.cardOfferQ || []; G.cardOfferQ.push({ opts: opts }); return 'queued'; }
    G.cardOffer = { v2: true, cards: cards, opts: opts, t: 0, rr: 0, ids: [] }; G.mode = 'cards';
    if (!f.hinted) { f.hinted = 1; XY.toast(G, '法宝 4 件 + 灵物 3 件全队共用；满级法宝配上搭档可炼成超级法宝（按 Tab 再按 8 看全部配方）'); }
    return 'open';
  };
  // 机器人 / 测试的自动选择：炼化 > 配方相关的升级 / 新件 > 其他升级 > 新件（有盯就偏盯）
  FB.recommend = function (G, cards) {         // 「选推荐」开关用：和 autoPick 同一套打分，但不加随机数；返回推荐那张的下标
    var f = G.fb, best = -1, bs = -1e9;
    cards.forEach(function (c, i) {
      var s;
      if (c.k === 'fuse') s = 100; else {
        s = c.k === 'up' ? 3 : 2; if (c.k === 'new' && FB.BY[c.id].kind === 'f') s = 4;
        FB.RECIPES.forEach(function (r) { if (r.a === c.id || r.b === c.id) s += (f.pin === r.id ? 6 : 3); });
        var h = FB.held(G, c.id); if (h && h.lv >= FB.maxLv(c.id) - 1) s += 1;
      }
      if (s > bs) { bs = s; best = i; }
    });
    return best;
  };
  FB.autoPick = function (G, cards, opts) {
    var f = G.fb; f.auto++;
    function score(c) {
      if (c.k === 'fuse') return 100;
      var s = c.k === 'up' ? 3 : 2, id = c.id; if (c.k === 'new' && FB.BY[id].kind === 'f') s = 4;     // 机器人像正常玩家：先把法宝格填满
      FB.RECIPES.forEach(function (r) { if (r.a === id || r.b === id) s += (f.pin === r.id ? 6 : 3); });
      var h = FB.held(G, id); if (h && h.lv >= FB.maxLv(id) - 1) s += 1;
      return s + Math.random();
    }
    cards.sort(function (a, b) { return score(b) - score(a); });
    FB.take(G, cards[0], opts);
  };
  FB.take = function (G, c, opts) {
    var f = G.fb, it;
    if (c.k === 'fuse') return FB.fuse(G, c.rid);
    if (c.k === 'up') { var h = FB.held(G, c.id); if (!h) return false; h.lv = Math.min(FB.maxLv(c.id), h.lv + 1); }
    else if (!FB.addItem(G, c.id, 1)) return false;
    it = FB.BY[c.id]; XY.save.addCard(c.id);        // 图鉴 / 收藏照旧计数
    f.log.push({ id: c.id, k: c.k, t: G.t, lv: FB.lvOf(G, c.id) }); G.cardLog.push({ id: c.id, t: G.t });
    FB.refresh(G); G.cardFlash = { id: c.id, t: 2.2 };
    f.gain = { id: c.id, t: 0, max: 2.4, up: c.k === 'up' };
    XY.toast(G, (c.k === 'up' ? '升级：' : '获得：') + it.name + ' Lv' + FB.lvOf(G, c.id));
    if (!f.slotFullAt && f.w.length >= C.FB.SLOT_F && f.s.length >= C.FB.SLOT_L) f.slotFullAt = G.t;
    return true;
  };
  FB.rrCost = function (G) { var o = G.cardOffer, f = G.fb; return f.rrFree > 0 ? 0 : C.FB.RR_COST * (o ? o.rr + 1 : 1); };
  FB.reroll = function (G) {
    var o = G.cardOffer, f = G.fb; if (!o || !o.v2) return false;
    var cost = FB.rrCost(G); if (cost > G.coins) { XY.toast(G, '金币不够：重抽要 ' + cost); return false; }
    if (f.rrFree > 0) f.rrFree--; else { G.coins -= cost; o.rr++; f.coinsRr += cost; }
    var keep = o.cards.filter(function (c) { return c.pinned; }), n = f.opts, skip = {};
    keep.forEach(function (c) { skip[c.id] = 1; });
    var fresh = FB.cards(G, n - keep.length, o.opts.excl, skip), fz = o.cards.filter(function (c) { return c.k === 'fuse'; });
    o.cards = keep.concat(fresh).concat(fz.length ? [] : FB.fuseCards(G)).concat(fz); G.stats.rerolls = (G.stats.rerolls || 0) + 1;
    return true;
  };
  FB.seal = function (G, k) {
    var o = G.cardOffer, f = G.fb; if (!o || !o.v2 || !o.cards[k] || o.cards[k].k === 'fuse') return false;
    if (f.sealN <= 0) { XY.toast(G, '本关封印次数用完了'); return false; }
    var c = o.cards[k]; f.sealN--; f.sealed[c.id] = 1; var used = {}; o.cards.forEach(function (x) { used[x.id] = 1; });
    var fresh = FB.cards(G, 1, null, used);
    if (fresh.length) o.cards[k] = fresh[0]; else o.cards.splice(k, 1);
    if (!o.cards.length) { FB.choose(G, -1); return true; }
    XY.toast(G, '封印了「' + FB.info(c.id).name + '」：本关不会再出现'); return true;
  };
  FB.choose = function (G, k) {
    var o = G.cardOffer; if (!o || !o.v2) return false;
    if (k === -1) { G.coins += C.FB.SKIP_COINS; XY.toast(G, '放弃了选择，换成 ' + C.FB.SKIP_COINS + ' 金币'); G.stats.skips = (G.stats.skips || 0) + 1; if (XY.sfx) XY.sfx('ui'); }
    else if (o.cards[k]) { var pick = o.cards[k]; FB.take(G, pick, o.opts); if (XY.sfx) XY.sfx('card', (pick.r || (FB.info(pick.id) || {}).r || (XY.CARD_BY[pick.id] || {}).r)); }
    else return false;
    G.cardOffer = null; FB.nextOffer(G); return true;
  };
  FB.nextOffer = function (G) {
    while (G.cardOfferQ && G.cardOfferQ.length) {
      var n = G.cardOfferQ.shift(), cards = FB.cards(G, G.fb.opts, n.opts && n.opts.excl); FB.fuseCards(G).forEach(function (c) { cards.push(c); });
      if (!cards.length) { FB.fullReward(G); continue; }
      G.cardOffer = { v2: true, cards: cards, opts: n.opts || {}, t: 0, rr: 0, ids: [] }; return;
    }
    if (G.mode === 'cards') G.mode = 'play';
  };
  FB.pin = function (G, rid) { var f = G.fb; if (!f) return; f.pin = f.pin === rid ? null : rid; };

  /* ---------- 来源 ---------- */
  FB.onPrep = function (G) { if (G.fb) FB.offer(G, { src: 'prep' }); };
  FB.onClear = function (levelId) { (FB.CLEAR_ITEM[levelId] || []).forEach(function (id) { FB.unlock(id); }); };

  /* ---------- 覆盖旧入口（只在 V2 下生效；V2 关时一律走旧函数）---------- */
  function wrap(name, fn) { var old = K[name]; K[name] = function () { return FB.on() && arguments[0] && arguments[0].fb ? fn.apply(K, arguments) : (old ? old.apply(K, arguments) : undefined); }; K[name].old = old; }
  var oldInit = K.initRun;
  K.initRun = function (G) { oldInit(G); FB.init(G); };
  wrap('recalc', function (G) { FB.recalc(G); });
  wrap('carried', function (G) { return FB.all(G).filter(function (s) { return !s.sup; }).map(function (s) { return s.id; }); });
  wrap('copies', function () { return 1; });
  wrap('setActive', function () { return { ok: false, reason: '新规则下所有法宝同时生效' }; });
  wrap('allowed', function (G, id) { return !!FB.BY[id]; });
  wrap('sanitizeCarry', function () { return []; });
  wrap('applyStart', function () { });
  wrap('update', function (G, dt) { K.update.old(G, dt); FB.update(G, dt); });
  wrap('openChest', function (G, ch) { if (XY.v07b && XY.v07b.onChest) XY.v07b.onChest(G); G.coins += 25; if (XY.soldierCardDrop && Math.random() < 0.4) XY.soldierCardDrop(G, ch.x, ch.y, 'chest'); if (XY.specials) XY.specials.maybeDrop(G, 'chest'); FB.offer(G, { src: 'chest' }); if (XY.sfx) XY.sfx('chest'); });
  wrap('give', function (G, id, opts) { if (G.mode === 'play' || G.mode === 'cards') FB.offer(G, { src: (opts && (opts.quest ? 'quest' : opts.table)) || 'drop' }); return null; });
  wrap('offer', function (G, id0, table, opts) { return FB.offer(G, { src: table || 'drop' }); });
  wrap('choose', function (G, k) { return FB.choose(G, k); });
  wrap('nextOffer', function (G) { FB.nextOffer(G); });
  wrap('spawnChest', function (G) { var ct = (G.fbChest = (G.fbChest || 0) + 1); if (ct > C.FB.CHESTS) return; K.spawnChest.old(G); });
  wrap('onKill', function (G, e) {
    var d = e.def;
    if (!G.seenRun[e.type]) { G.seenRun[e.type] = true; if (XY.save.markSeen(e.type)) G.dexQ.push('图鉴：发现新妖怪「' + d.name + '」'); }
    if (d.boss) {
      var dn = e.den !== undefined && G.dens ? G.dens[e.den] : null, ex = dn ? FB.DEN_ITEM[dn.id] : null;
      if (dn && dn.slain) return;                               // 败退时已经给过这一份，逃跑路上被追杀不再给第二份
      FB.offer(G, { src: 'den', excl: ex });
      if (e.type === 'boss') FB.offer(G, { src: 'boss' });      // 牛魔王：多一次
      return;
    }
    if (d.elite) G.coins += C.FB.ELITE_COINS;                   // 精英不再掉卡，改为多掉金币
  });
  // 取经之旅：快照里存 fb（只存带着的件和等级）
  FB.snapshot = function (G) { return G.fb ? { w: G.fb.w.map(function (s) { return { id: s.id, lv: s.lv }; }), s: G.fb.s.map(function (s) { return { id: s.id, lv: s.lv }; }), made: G.fb.made.slice() } : null; };
  FB.fromOld = function (rc) {                                  // 旧版取经之旅快照（只有 runCards）→ V2 的 w / s：份数当等级
    var w = [], s = [];
    Object.keys(rc || {}).forEach(function (id) { var it = FB.BY[id]; if (!it) return; (it.kind === 'l' ? s : w).push({ id: id, lv: Math.max(1, +rc[id] || 1) }); });
    return { w: w, s: s, made: [] };
  };
  FB.restore = function (G, sn) {
    if (!G.fb || !sn) return;
    G.fb.w = []; G.fb.s = []; G.fb.made = (sn.made || []).slice();
    (sn.w || []).concat(sn.s || []).forEach(function (x) { if (FB.info(x.id) && !FB.held(G, x.id) && !FB.full(G, FB.info(x.id).kind)) FB.addItem(G, x.id, Math.max(1, Math.min(FB.SUP[x.id] ? 1 : FB.maxLv(x.id), +x.lv || 1))); });
    FB.recalc(G);
  };
  // 局外卡组：V2 下不再有“同一套”限制
  var oldToggle = XY.save.toggleDeck;
  XY.save.toggleDeck = function (id) {
    if (!FB.on()) return oldToggle(id);
    var S = XY.save, d = S.data.deck, i = d.indexOf(id);
    if (i >= 0) { d.splice(i, 1); S.touch(); return { ok: true, reason: '已取下' }; }
    if (!FB.BY[id]) return { ok: false, reason: '这件是典藏，不能带进局内' };
    if (!FB.unlocked(id)) return { ok: false, reason: '还没解锁：' + FB.whereText(id) };
    if (d.length >= S.deckSlots()) return { ok: false, reason: '起手携带满了（' + S.deckSlots() + ' 件）' };
    d.push(id); S.touch(); return { ok: true, reason: '已加入起手携带' };
  };
  var oldClear = XY.save.recordClear;
  XY.save.recordClear = function (id) { var r = oldClear.apply(XY.save, arguments); if (FB.on()) FB.onClear(id); return r; };
  // 火眼金睛 Lv3：对精英护盾的伤害更高
  var oldShield = XY.shieldHit;
  if (oldShield) XY.shieldHit = function (G, e, dmg, em, el) { return oldShield(G, e, dmg * ((G.fb && G.fb.shMul) || 1), em, el); };
  FB.update = function () { };       // fabao2.js 里替换
})();
