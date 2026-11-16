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
  // 法宝按说明的冷却/范围出手；成长来自局内升级与修行，起手不再每秒清屏。
  C.FABAO_V2 = true; C.FB_DMUL = 1.25; C.FB_SPD = 1; C.FB_RNG = 1;
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
  FB.startingPlan=function(){
    var S=XY.save,limit=Math.max(0,S.deckSlots()),selected=[],skipped=[],counts={f:0,l:0};
    (S.data.deck||[]).forEach(function(id){var it=FB.BY[id],reason='';
      if(!it)reason='典藏或失效';else if(!FB.unlocked(id))reason='未解锁';else if(selected.indexOf(id)>=0)reason='重复';else if(selected.length>=limit)reason='起手位已满';else if(counts[it.kind]>=(it.kind==='l'?C.FB.SLOT_L:C.FB.SLOT_F))reason=it.kind==='l'?'灵物位已满':'法宝位已满';
      if(reason)skipped.push({id:id,name:it?it.name:(XY.CARD_BY[id]||{}).name||id,reason:reason});else{selected.push(id);counts[it.kind]++;}
    });return{limit:limit,selected:selected,skipped:skipped};
  };
  FB.init = function (G) {
    C.CHEST_TIMES = FB.on() ? [100, 220, 340, 460].slice(0, C.FB.CHESTS) : [100, 220, 340, 460, 580, 700];
    G.fb = null; if (!FB.on()) return;
    G.fb = { w: [], s: [], pin: null, sealed: {}, rrFree: 1, sealN: 1, rrGiven: 1, sealGiven: 1, offers: 0, log: [], made: [], fx: [], proj: [], patches: [], peaches: [], walls: [], hits: 0, firstMade: 0, fullAt: 0, rrPaid: 0, coinsRr: 0, auto: 0 };
    G.deckIds = []; G.runCards = {}; G.activeCard = null; G.cardLog = G.cardLog || [];
    var sv=XY.save,plan=FB.startingPlan();
    plan.selected.forEach(function(id){FB.addItem(G,id,1);});
    G.fb.starting=plan;
    var inherits=!G.noJourney&&XY.journey&&XY.journey.entryFor(G.levelId);
    if(plan.skipped.length&&!inherits&&XY.toast)XY.toast(G,'本次起手携带 '+plan.selected.length+' 件；未带入：'+plan.skipped.map(function(v){return v.name+'（'+v.reason+'）';}).join('、')+'。可在卡组调整顺序。');
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
  FB.fuseCards = function (G) { return FB.ready(G).map(function (r) { return { k: 'fuse', id: r.sup, rid: r.id, from: r.a }; }); };   // 合法的七个携带位最多同时凑齐三条配方；不丢弃已备齐的炼化。
  FB.fullReward = function (G) {
    G.coins += 60; G.heroes.forEach(function (h) { if (!h.down) XY.core.healHero(G, h, h.maxHp * 0.15, false); });
    XY.toast(G, '法宝都已满级：化作 60 金币 + 全队回血'); G.fb.fullAt = G.fb.fullAt || G.t;
  };
  FB.offer = function (G, opts) {
    opts = opts || {}; var f = G.fb; if (!f) return null;
    f.offers++; G.stats.offers = (G.stats.offers || 0) + 1;
    if (opts.excl && !G.mod && FB.unlock(opts.excl)) { XY.toast(G, '永久解锁：' + FB.BY[opts.excl].name); G.stats.fbUnl = (G.stats.fbUnl || 0) + 1; }
    var fusions=FB.fuseCards(G),cards=FB.cards(G,Math.min(f.opts,5-fusions.length),opts.excl);
    fusions.forEach(function(c){cards.push(c);});
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
    var readyBefore=FB.ready(G).map(function(r){return r.id;});
    if (c.k === 'up') { var h = FB.held(G, c.id); if (!h) return false; h.lv = Math.min(FB.maxLv(c.id), h.lv + 1); }
    else if (!FB.addItem(G, c.id, 1)) return false;
    it = FB.BY[c.id]; XY.save.addCard(c.id);        // 图鉴 / 收藏照旧计数
    f.log.push({ id: c.id, k: c.k, t: G.t, lv: FB.lvOf(G, c.id) }); G.cardLog.push({ id: c.id, t: G.t });
    FB.refresh(G); G.cardFlash = { id: c.id, t: 2.2 };
    f.gain = { id: c.id, t: 0, max: 2.4, up: c.k === 'up' };
    var gainedText=(c.k === 'up' ? '升级：' : '获得：') + it.name + ' Lv' + FB.lvOf(G, c.id),newReady=FB.ready(G).filter(function(r){return readyBefore.indexOf(r.id)<0;});
    if(newReady.length)XY.notify(G,'超武材料已齐 · 下次选宝炼化',{kind:'toast',level:0,historyText:gainedText+'。'+newReady.map(function(r){return r.name+'材料已齐：'+FB.BY[r.a].name+'已达5重，并携带'+FB.BY[r.b].name+'（1重即可）。下一次选宝时选择「'+r.name+'」炼化，不会自动合成。';}).join('')});
    else XY.toast(G,gainedText);
    if (!f.slotFullAt && f.w.length >= C.FB.SLOT_F && f.s.length >= C.FB.SLOT_L) f.slotFullAt = G.t;
    return true;
  };
  FB.rrCost = function (G) { var o = G.cardOffer, f = G.fb; return f.rrFree > 0 ? 0 : C.FB.RR_COST * (o ? o.rr + 1 : 1); };
  FB.reroll = function (G) {
    var o = G.cardOffer, f = G.fb; if (!o || !o.v2) return false;
    var cost = FB.rrCost(G); if (cost > G.coins) { XY.toast(G, '金币不够：重抽要 ' + cost); return false; }
    if (f.rrFree > 0) f.rrFree--; else { G.coins -= cost; o.rr++; f.coinsRr += cost; }
    var fz=FB.fuseCards(G),n=Math.min(f.opts,5-fz.length),keep=o.cards.filter(function(c){return c.pinned&&c.k!=='fuse';}).slice(0,n),skip={};
    keep.forEach(function(c){skip[c.id]=1;});
    var fresh=FB.cards(G,n-keep.length,o.opts.excl,skip);
    o.cards=keep.concat(fresh,fz);G.stats.rerolls=(G.stats.rerolls||0)+1;
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
      var n=G.cardOfferQ.shift(),fz=FB.fuseCards(G),cards=FB.cards(G,Math.min(G.fb.opts,5-fz.length),n.opts&&n.opts.excl).concat(fz);
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
    G.fb.w = []; G.fb.s = []; G.fb.starting=null; G.fb.made = (sn.made || []).slice();
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
    var it=FB.BY[id],kindCount=d.filter(function(k){return FB.BY[k]&&FB.BY[k].kind===it.kind;}).length,cap=it.kind==='l'?C.FB.SLOT_L:C.FB.SLOT_F;
    if(kindCount>=cap)return{ok:false,reason:(it.kind==='l'?'灵物':'法宝')+'最多携带 '+cap+' 件，请先取下一件'};
    d.push(id); S.touch(); return { ok: true, reason: '已加入起手携带' };
  };
  var oldClear = XY.save.recordClear;
  XY.save.recordClear = function (id) { var r = oldClear.apply(XY.save, arguments); if (FB.on()) FB.onClear(id); return r; };
  // 火眼金睛 Lv3：对精英护盾的伤害更高
  var oldShield = XY.shieldHit;
  if (oldShield) XY.shieldHit = function (G, e, dmg, em, el) { return oldShield(G, e, dmg * ((G.fb && G.fb.shMul) || 1), em, el); };
  // 实际命中和逐级说明共用：成长来自法宝升级、开光与已投入的全队强化。
  FB.damageScale = function (G, s) {
    var lv = Math.max(1, Math.min(5, s.lv)), kg = G && !s.sup ? FB.kgMul(s.id) : 1;
    return [0, 1, 1.3, 1.3, 1.6, 1.6][lv] * kg * (C.FB_DMUL || 1) * (G && G.P && G.P.dmg || 1);
  };
  // 逐级说明与实际战斗数值同源；G 为空时显示无开光、无全队强化基准。
  FB.describe = function (id, level, G) {
    var it=FB.info(id); if(!it)return {id:id,level:1,summary:'',lines:[],stats:{}};
    var lv=Math.max(1,Math.min(it.sup?1:FB.maxLv(id),+level||1)),kg=G&&!it.sup?FB.kgMul(id):1;
    var m=FB.damageScale(G,{id:id,lv:lv,sup:!!it.sup});
    var s='',a=[],v={},timed=false,damage=false,n,r,d,t;
    function num(x){return String(Math.round(x*100)/100);}
    function dm(x){damage=true;return num(x*m);}
    function set(text,notes,stats){s=text;a=notes||[];v=stats||{};}
    function rng(x){return x*(lv>=4?1.15:1)*(C.FB_RNG||1);}
    switch(id){
    case 'jingubang':
      t=lv>=3?2.55:3;r=rng(150);d=dm(38);timed=true;
      set('基础每'+t+'秒向前横扫，造成'+d+'伤害并击退'+(lv>=5?'；命中后受伤+10%，持续4秒':'')+'。',['操控英雄前方约'+(lv>=5?150:90)+'°扇形，半径'+num(r)+'。'],{'单次面板伤害':38*m,'基础冷却（秒）':t,'半径':r,'扇形角度':lv>=5?150:90,'受伤增加（%）':lv>=5?10:0,'易伤持续（秒）':lv>=5?4:0});break;
    case 'jiuchi':
      r=rng(95)*(lv>=3?1.25:1);d=dm(32);timed=true;
      set('基础每4秒砸地'+(lv>=5?'两次':'一次')+'，每次'+d+'伤害、眩晕至多'+(lv>=5?1:.5)+'秒。',['操控英雄周围半径'+num(r)+'；地面攻击，不能命中飞行免疫目标。首领免晕，抗性缩短眩晕。'+(lv>=5?'第二击在0.45秒后，施法者倒地则取消。':'')],{'单次面板伤害':32*m,'半径':r,'砸地次数':lv>=5?2:1,'眩晕上限（秒）':lv>=5?1:.5});break;
    case 'xiangyao':
      n=lv>=5?3:lv>=3?2:1;d=dm(10);
      set(n+'片月牙铲环绕操控英雄；每片接触敌人时造成'+d+'伤害并击退，每0.2秒可伤害一次。',['环绕半径74，每片攻击半径26；转速'+(lv>=5?'比前级快20%':'3弧度/秒')+'。不同铲片可命中同一敌人。'],{'单次面板伤害':10*m,'铲片数':n,'转速（弧度/秒）':lv>=5?3.6:3});break;
    case 'jingangzhuo':
      n=lv>=3?5:3;r=rng(270);d=dm(28);timed=true;
      set('基础每4.2秒抛圈，穿透最多'+n+'只，每次'+d+'伤害'+(lv>=5?'；去回各能命中一次，对精英伤害+30%':'；回程不伤人')+'。',['从操控英雄处抛出，飞行距离'+num(r)+'。'],{'单次面板伤害':28*m,'飞行距离':r,'每程穿透目标数':n,'回程命中次数':lv>=5?1:0,'对精英伤害增加（%）':lv>=5?30:0});break;
    case 'hulu':
      t=lv>=3?6.4:8;n=lv>=5?2:1;timed=true;
      set('基础每'+t+'秒吸收附近当前生命最高的'+n+'只非首领敌人'+(lv>=5?'，另对一名首领造成其最大生命3%的伤害':'')+'。',['操控英雄周围半径420，不吸敌塔。吸收会清除目标护盾并施加斩杀伤害；首领伤害仍受防御等影响。'],{'基础冷却（秒）':t,'吸收数量':n,'首领最大生命伤害（%）':lv>=5?3:0});break;
    case 'huangjin':
      n=lv>=3?4:2;timed=true;
      set('基础每9秒捆住最近'+n+'只敌人2.5秒；首领只捆1.2秒'+(lv>=5?'。被捆目标受伤+20%，持续2.5秒':'')+'。',['操控英雄周围半径320，不选敌塔；没有直接伤害。'],{'捆绑目标数':n,'受伤增加（%）':lv>=5?20:0});break;
    case 'bajiaoshan':
      r=rng(210)*(lv>=3?1.25:1);d=dm(12);timed=true;
      set('基础每6秒扇出风，造成'+d+'伤害、推开敌人并吹散敌方飞弹'+(lv>=5?'；另留1.5秒持续风幕':'')+'。',['操控英雄前方约80°、半径'+num(r)+'。'+(lv>=5?'风幕每0.25秒再造成'+num(12*m*.4)+'伤害，并继续推敌、清除飞弹。':'')],{'单次面板伤害':12*m,'半径':r,'持续风幕（秒）':lv>=5?1.5:0});break;
    case 'zhaoyao':
      r=lv>=3?250:200;n=lv>=5?40:25;timed=true;
      set('基础每10秒照射操控英雄周围敌人，使其受到的伤害+'+n+'%，持续6秒。',['照射半径'+r+'；没有直接伤害。'],{'半径':r,'受伤增加（%）':n});break;
    case 'liuli':
      r=lv>=5?47.6:34;t=lv>=3?5:3;d=dm(9);
      set('操控英雄移动时留下持续'+t+'秒的火径；每0.5秒造成'+d+'伤害，并附加1.5秒灼烧。',['每片火径半径'+r+'；灼烧每秒'+num(9*m*.5)+'面板伤害，重复命中刷新持续时间。'],{'单次面板伤害':9*m,'灼烧每秒面板伤害':9*m*.5,'半径':r,'火径持续（秒）':t});break;
    case 'sanmei':
      n=lv>=5?3:lv>=3?2:1;r=lv>=3?70:62;d=dm(40);timed=true;
      set('基础每5秒向附近不同敌人射出最多'+n+'颗追踪火球；每颗爆炸造成'+d+'伤害'+(lv>=5?'并灼烧3秒':'')+'。',['索敌半径520，爆炸半径'+r+'。'+(lv>=5?'灼烧每秒'+num(40*m*.15)+'面板伤害。':'')],{'单次面板伤害':40*m,'火球数':n,'爆炸半径':r,'灼烧每秒面板伤害':lv>=5?40*m*.15:0});break;
    case 'pantao':
      n=lv>=5?35:lv>=3?25:15;timed=true;
      set('基础每12秒为血量不足85%的存活英雄结桃，吃桃恢复'+n+'%最大生命'+(lv>=5?'并默认移速+45%、持续3秒':'')+'；不含唐僧。',['场上无桃时，为生命比例最低者结桃；桃子会滚向他，任何受伤的存活非唐僧英雄碰到都能吃。20秒未吃则消失。'+(lv>=5?'默认移速+45%，有加速特性的英雄按自身特性计算。':'')],{'恢复最大生命（%）':n,'加速持续（秒）':lv>=5?3:0});break;
    case 'bishui':
      t=lv>=5?22:lv>=3?28:35;
      set('每位英雄各获水珠（不含唐僧），完整挡掉下一次伤害；碎后'+t+'秒再生'+(lv>=5?'；碎裂时附近其他英雄减伤50%、持续1秒':'')+'。',['获得时水珠即可挡伤；倒地期间再生计时暂停。两种水珠法宝同带时，英雄仍只有一颗水珠，取较短再生冷却；升级不缩短已开始的这轮计时。'+(lv>=5?'碎裂减伤作用于120范围内其他存活非唐僧英雄，不包括碎珠本人。':'')],{'水珠再生冷却（秒）':t,'碎裂减伤持续（秒）':lv>=5?1:0});break;
    case 'jingping':
      r=lv>=3?221:170;n=lv>=5?35:20;
      set('水域内敌人减速'+n+'%（首领减半）'+(lv>=5?'；圈内存活英雄每秒恢复约1生命，不含唐僧':'')+'。',['水域半径'+r+'；营地展开时围绕营地，否则跟随唐僧。离开水域后减速最多保留0.6秒。'],{'半径':r,'普通敌人减速（%）':n,'英雄每秒恢复生命':lv>=5?1:0});break;
    case 'jiasha':
      r=lv>=3?182:140;
      set('唐僧周围敌人的攻击伤害降低10%；营地展开时每秒恢复'+(2*lv)+'生命。',['护体圈半径'+r+'，敌人离开半径'+(r+30)+'后恢复攻击。此效果削弱敌方攻击，不给唐僧免伤护盾。'],{'半径':r,'营地每秒恢复生命':2*lv});break;
    case 'chanzhang':
      r=lv>=3?195:150;d=dm(8);t=lv>=5?1.2:.8;timed=true;
      set('基础每7秒从唐僧处震荡，造成'+d+'伤害、眩晕至多'+t+'秒并击退'+(lv>=5?'；对精英击退更远':'')+'。',['震荡半径'+r+'；首领免晕，抗性缩短眩晕与击退。'],{'单次面板伤害':8*m,'半径':r,'眩晕上限（秒）':t,'精英击退距离':lv>=5?140:40});break;
    case 'jindouyun':
      n=(.06*lv*kg+(lv>=3?.04:0))*100;set('全队移动速度+'+num(n)+'%，持续生效。',[],{'全队移速增加（%）':n});break;
    case 'huoyan':
      n=.05*lv*kg*100;set('全队暴击率+'+num(n)+'个百分点'+(lv>=3?'；对敌方护盾伤害+33%':'')+'。',[],{'全队暴击率增加（百分点）':n,'对护盾伤害增加（%）':lv>=3?33:0});break;
    case 'qishier':
      n=Math.min(.5,.06*lv*kg)*100;set('法宝出手冷却−'+num(n)+'%'+(lv>=3?'；每60秒随机一件普通法宝的冷却计时加快1倍，持续5秒':'')+'。',['只加快有出手冷却的招式；环绕铲、火径、水珠及持续光环不受此计时加速影响。随机加速不选超级法宝。'],{'法宝冷却缩短（%）':n,'随机加速持续（秒）':lv>=3?5:0});break;
    case 'jinguzhou':
      n=(.08*lv*kg+(lv>=3?.04:0))*100;set('全队大招冷却−'+num(n)+'%。',['与门派的大招冷却加成相加后，上限为50%。'],{'大招冷却缩短（%）':n});break;
    case 'renshen':
      n=.4*lv*kg;set('存活英雄每秒恢复'+num(n)+'生命（不含唐僧）'+(lv>=3?'；展开的营地每秒额外恢复3生命':'')+'。',['治疗不超过生命上限，不复活倒地英雄。'],{'英雄每秒恢复生命':n,'营地每秒额外恢复生命':lv>=3?3:0});break;
    case 'qiankun':
      set('本局累计增加'+lv+'次免费重抽与'+lv+'次封印'+(lv>=3?'；普通选宝候选上限增至4件':'')+'。',['每升一重各新增1次；已用次数不会自动恢复。可炼化项另列，候选合计最多5件；材料已齐时优先保留炼化项。'],{'额外免费重抽次数':lv,'额外封印次数':lv,'普通候选上限':lv>=3?4:3});break;
    case 'nianzhu':
      n=200*lv*kg;t=lv*kg+(lv>=3?2:0);set('营地生命上限+'+num(n)+'；展开后每秒额外恢复'+num(t)+'生命。',['获得或升级时，新增的生命上限会补为当前营地生命。'],{'营地生命上限增加':n,'营地每秒额外恢复生命':t});break;
    case 'wanzhang':
      d=dm(150);timed=true;set('基础每4秒向敌人密集处落巨棒，造成'+d+'范围伤害并击退，眩晕至多1秒。',['操控英雄周围650内选落点，预警0.55秒后击中半径150；首领免晕，抗性缩短眩晕。'],{'单次面板伤害':150*m});break;
    case 'tianhe':
      d=dm(20);timed=true;set('3片环绕铲接触时各伤'+d+'，每0.2秒可伤害一次；基础每3.5秒砸地伤'+num(70*m)+'，令地面敌人减速50%、持续3秒。',['环绕半径74，每片攻击半径26；砸地半径130，眩晕至多0.3秒（首领免晕）。减速半径260，首领减速25%。'],{'铲片面板伤害':20*m,'砸地面板伤害':70*m});break;
    case 'liefeng':
      d=dm(16);timed=true;set('基础每5秒推出持续3秒的火墙，每0.25秒造成'+d+'伤害并击退，附加2秒灼烧。',['火墙横宽300、厚80，向前推进；灼烧每秒'+num(16*m*.3)+'面板伤害。'],{'单次面板伤害':16*m,'灼烧每秒面板伤害':16*m*.3});break;
    case 'shouhun':
      timed=true;set('基础每20秒收取屏幕内普通敌人；精英、首领及敌塔承受最大生命8%的伤害，单次上限600。',['隐藏敌人不受影响；普通敌人会被清除护盾并承受斩杀伤害，特殊目标的百分比伤害仍受防御等影响。'],{'最大生命伤害（%）':8,'单次伤害上限':600});break;
    case 'huolun':
      d=dm(60);timed=true;set('基础每4秒抛出火轮，去回各造成'+d+'穿透伤害并灼烧3秒；折返及返回时各爆炸一次，每次伤害'+num(80*m)+'。',['飞行距离360，爆炸半径100；灼烧每秒'+num(60*m*.12)+'面板伤害。'],{'穿透面板伤害':60*m,'爆炸面板伤害':80*m,'灼烧每秒面板伤害':60*m*.12});break;
    case 'panhui':
      timed=true;set('基础每15秒为所有存活英雄恢复35%最大生命，并默认移速+45%、持续5秒；不含唐僧，不复活。',['默认移速+45%，有加速特性的英雄按自身特性计算；治疗不超过生命上限。'],{'恢复最大生命（%）':35,'加速持续（秒）':5});break;
    case 'jinchan':
      d=dm(14);set('唐僧周围敌人每0.5秒受'+d+'伤害并减速40%（首领20%）；圈内存活英雄减伤50%，不含唐僧。',['结界半径200。离圈后减速最多保留0.8秒、减伤最多保留0.7秒；结界不恢复生命。'],{'单次面板伤害':14*m,'普通敌人减速（%）':40,'英雄减伤（%）':50});break;
    case 'dinghai':
      set('非唐僧英雄各获水珠挡一次伤害，碎后30秒再生；营地水珠40秒再生；水域内敌人减速35%（首领17.5%）。',['水域半径220；营地展开时围绕营地，否则跟随唐僧。营地挡伤后另有0.4秒免伤；英雄倒地时水珠冷却暂停。水域不治疗。两种水珠法宝同带时，英雄仍只有一颗水珠，取较短再生冷却；更换或升级不重置已开始的计时。'],{'英雄水珠再生（秒）':30,'营地水珠再生（秒）':40,'普通敌人减速（%）':35});break;
    }
    if(it.src==='sui')a.push('随身法宝需要存活的护法操控；护法全部倒地后，不会转由唐僧发动。');
    if(damage)a.push((G?'以上为当前队伍面板伤害':'以上为未开光、未投入全队伤害强化时的面板伤害')+'；实际伤害还受敌方防御、五行和易伤等影响。');
    if(timed)a.push('带基础冷却的招式，首次等待其40%；冷却受七十二变等加成影响，有合适目标才出手。');
    return {id:id,level:lv,summary:s,lines:[s].concat(a),stats:v};
  };
  FB.upgradeText=function(id,to,G){
    var a=FB.describe(id,to,G),b=FB.describe(id,to-1,G),parts=[];
    Object.keys(a.stats).forEach(function(k){if(a.stats[k]!==b.stats[k])parts.push(k+'：'+Math.round((b.stats[k]||0)*100)/100+' → '+Math.round(a.stats[k]*100)/100);});
    return parts.length?parts.join('；'):'本重没有新增效果数值；继续升级可达到后续强化或满级炼化条件。';
  };
  FB.levelParts=function(id,G){var it=FB.info(id),out=['一重：'].concat(FB.describe(id,1,G).lines);if(!it.sup)for(var lv=2;lv<=FB.maxLv(id);lv++)out.push('第'+lv+'重：'+FB.upgradeText(id,lv,G));return out;};
  FB.ITEMS.concat(Object.keys(FB.SUP).map(function(id){return FB.SUP[id];})).forEach(function(it){it.d=FB.describe(it.id,1).summary;if(!it.sup){it.u3=FB.upgradeText(it.id,3);it.u5=FB.upgradeText(it.id,it.kind==='l'?3:5);}});
  FB.RECIPES.forEach(function(r){r.d=FB.SUP[r.sup].d;});
  FB.update = function () { };       // fabao2.js 里替换
})();
