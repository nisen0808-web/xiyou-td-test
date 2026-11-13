/* ============================================================
 * cards.js —— 法宝（卡牌）：数据 + 局内掉落 / 拾取 / 羁绊计算
 *
 * 法宝 = 卡牌，也是图鉴里的“法宝”。24 张，分 4 套（每套 6 张），4 个品质。
 * 局内：妖怪 / 精英 / 宝箱 / 牛魔王掉落；捡到就生效；同一套凑够 3 张、5 张触发“羁绊”。
 * 局外：捡到的法宝永久收藏；开局前选 N 张组成卡组，开局就生效；重复的卡可以升级（Lv1~5）。
 * 数值全在这个文件里，方便调平衡。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C, rand = XY.rand;

  XY.CARD_MAXLV = 5;
  XY.RARITY = {
    N:   { name: '凡品', color: '#8f969c', glow: 'rgba(143,150,156,0.35)' },
    R:   { name: '灵品', color: '#3f86d4', glow: 'rgba(63,134,212,0.4)' },
    SR:  { name: '仙品', color: '#9b59d0', glow: 'rgba(155,89,208,0.45)' },
    SSR: { name: '神品', color: '#e0a415', glow: 'rgba(240,180,30,0.55)' }
  };
  XY.RARITY_ORDER = ['N', 'R', 'SR', 'SSR'];

  /* 效果字段（全队加成）：dmg 伤害 spd 攻速 move 移速 hp 最大生命(唐僧除外) dr 减伤(唐僧除外) regen 每秒回血
   * pick 拾取范围 xp 经验 coin 金币 camp 营地血量上限 campRegen 营地每秒回血 tower 塔伤害 ultCd 大招冷却缩短
   * crit 暴击率 boss 对洞府BOSS伤害 luck 法宝掉落率；一次性：gainCoins 立刻得金币、tangInv 师父护体秒数 */
  var FX = {
    dmg: ['伤害', '%'], spd: ['攻击速度', '%'], move: ['移动速度', '%'], hp: ['最大生命（唐僧除外）', '%'], dr: ['受到伤害 −', '%', 1],
    regen: ['每人每秒回血', ''], pick: ['拾取范围', '%'], xp: ['经验', '%'], coin: ['金币', '%'], camp: ['营地血量上限', ''],
    campRegen: ['营地每秒回血', ''], tower: ['塔伤害', '%'], ultCd: ['大招冷却 −', '%', 1], crit: ['暴击率', '%'],
    boss: ['对洞府 BOSS 伤害', '%'], luck: ['法宝掉落率', '%'], gainCoins: ['立刻获得金币', ''], tangInv: ['师父护体', '秒']
  };
  XY.FX_ONCE = { gainCoins: 1, tangInv: 1 };
  function fnum(k, v) { var f = FX[k]; return f[1] === '%' ? Math.round(v * 100) + '%' : (Math.round(v * 10) / 10 + f[1]); }
  // 把效果表翻成中文（mul：等级 / 叠加倍数）
  XY.fxText = function (fx, mul) {
    mul = mul || 1; var out = [];
    for (var k in fx) { var f = FX[k]; out.push(f[0] + (f[2] ? '' : ' +') + fnum(k, fx[k] * mul)); }
    return out.join('，');
  };

  /* ---------- 四套法宝 ---------- */
  XY.CARD_SETS = {
    qitian: { name: '齐天', color: '#ef8a3c', theme: '攻击', t3: { fx: { dmg: 0.08, spd: 0.06 } }, t5: { fx: { dmg: 0.14, crit: 0.08 } } },
    hufa:   { name: '护法', color: '#4f86c6', theme: '生存', t3: { fx: { hp: 0.10, dr: 0.04 } },  t5: { fx: { regen: 0.8, dr: 0.06 } } },
    fomen:  { name: '佛门', color: '#d9a21a', theme: '营地', t3: { fx: { camp: 300, campRegen: 2 } }, t5: { fx: { camp: 500, campRegen: 4 } } },
    tianting: { name: '天庭', color: '#8e6fd0', theme: '成长', t3: { fx: { xp: 0.10, coin: 0.12 } }, t5: { fx: { tower: 0.20, luck: 0.30, pick: 0.25 } } }
  };
  XY.SET_ORDER = ['qitian', 'hufa', 'fomen', 'tianting'];
  XY.COMBO_AT = [3, 5];                 // 凑够几张触发羁绊

  /* ---------- 24 张法宝 ---------- */
  var L = [
    // 齐天（孙悟空）
    ['jingubang', '金箍棒',     'qitian', 'N',   { dmg: 0.05 },                     '重一万三千五百斤的如意金箍棒，大小随心。'],
    ['jindouyun', '筋斗云',     'qitian', 'R',   { move: 0.08 },                    '一个筋斗十万八千里，脚下轻快。'],
    ['huoyan',    '火眼金睛',   'qitian', 'R',   { crit: 0.05 },                    '八卦炉里炼出的一双眼，什么妖怪都看得穿。'],
    ['qishier',   '七十二变',   'qitian', 'SR',  { spd: 0.08 },                     '七十二般变化，出手快得看不清。'],
    ['jinguzhou', '紧箍咒',     'qitian', 'SR',  { ultCd: 0.10 },                   '一念咒，大圣就老实。让大招转得更快。'],
    ['pantao',    '蟠桃',       'qitian', 'SSR', { dmg: 0.08, xp: 0.10 },           '王母娘娘的蟠桃，吃一口浑身是劲。'],
    // 护法（八戒 / 沙僧）
    ['jiuchi',    '九齿钉耙',   'hufa',   'N',   { hp: 0.06 },                      '天蓬元帅留下的上宝沁金耙。'],
    ['xiangyao',  '降妖宝杖',   'hufa',   'N',   { dr: 0.03 },                      '沙僧的月牙铲，沉甸甸，挡得住。'],
    ['renshen',   '人参果',     'hufa',   'R',   { regen: 0.5 },                    '万寿山的人参果，闻一闻活几百岁。'],
    ['bishui',    '避水珠',     'hufa',   'R',   { hp: 0.08 },                      '流沙河里取来的宝珠，护体防身。'],
    ['bajiaoshan','芭蕉扇',     'hufa',   'SR',  { dr: 0.05, hp: 0.05 },            '铁扇公主的宝扇，一扇灭火焰山。'],
    ['bowu',      '紫金钵盂',   'hufa',   'SSR', { hp: 0.10, regen: 0.8 },           '唐太宗亲赐的紫金钵盂，盛得下一切苦难。'],
    // 佛门（唐僧 / 营地）
    ['jiasha',    '锦襴袈裟',   'fomen',  'N',   { camp: 150 },                     '观音菩萨赐下的锦襴袈裟，营地更扛揍。'],
    ['chanzhang', '九环锡杖',   'fomen',  'N',   { campRegen: 1.5 },                '九环锡杖一响，营地缓缓回血。'],
    ['nianzhu',   '菩提念珠',   'fomen',  'R',   { camp: 250 },                     '一百零八颗菩提子，护住营地。'],
    ['wenxie',    '通关文牒',   'fomen',  'R',   { gainCoins: 40, coin: 0.05 },     '盖着大唐玉玺的通关文牒，一路畅通，还有盘缠。'],
    ['sheli',     '舍利子',     'fomen',  'SR',  { campRegen: 3 },                  '高僧圆寂留下的舍利，佛光不灭。'],
    ['lianhua',   '莲花宝座',   'fomen',  'SSR', { camp: 500, campRegen: 3, tangInv: 3 }, '如来的莲花座，坐上去，师父也能稳一会儿。'],
    // 天庭（成长 / 经济）
    ['liuli',     '琉璃盏',     'tianting','N',  { pick: 0.15 },                    '天庭供奉的琉璃盏，把宝物都吸过来。'],
    ['jingping',  '玉净瓶',     'tianting','N',  { xp: 0.06 },                      '观音的玉净瓶，甘露点化，更快开悟。'],
    ['huangjin',  '幌金绳',     'tianting','R',  { coin: 0.10 },                    '太上老君的幌金绳，金银自己上门。'],
    ['hulu',      '紫金红葫芦', 'tianting','R',  { tower: 0.12 },                   '一喊名字就收人的宝葫芦，塔也更厉害了。'],
    ['zhaoyao',   '照妖镜',     'tianting','SR', { boss: 0.12 },                    '天庭的照妖镜，大魔头现了原形。对洞府 BOSS 伤害更高。'],
    ['qiankun',   '乾坤袋',     'tianting','SSR',{ luck: 0.5, xp: 0.06 },           '天地乾坤都装得下，法宝掉得更多。']
  ];
  XY.CARDS = []; XY.CARD_BY = {};
  L.forEach(function (a) { var c = { id: a[0], name: a[1], set: a[2], r: a[3], fx: a[4], lore: a[5] }; XY.CARDS.push(c); XY.CARD_BY[c.id] = c; });

  // 等级倍数 / 叠加倍数
  XY.cardLvMul = function (lv) { return 1 + 0.2 * (lv - 1); };
  XY.cardFxText = function (c, lv) { return XY.fxText(c.fx, XY.cardLvMul(lv)); };
  XY.comboText = function (setId, tier) { var s = XY.CARD_SETS[setId]; return XY.fxText((tier === 0 ? s.t3 : s.t5).fx, 1); };

  /* ---------- 掉落参数 ---------- */
  C.CARD_DROP_MUL = 1;                  // 总掉率倍率（平衡用）
  C.CARD_DROP = { small: 0.0015, tank: 0.008, ranged: 0.008, elite: 0.45 };   // 每只妖怪掉法宝的几率
  C.CARD_LIFE = 45;                     // 掉在地上的法宝多久消失（秒）
  C.CARD_PICK_R = 92;                   // 法宝的拾取（吸附）范围下限
  C.CHEST_TIMES = [100, 220, 340, 460, 580, 700];      // 宝箱出现的时间（秒）
  C.CHEST_R = 46;                       // 走到宝箱多近算打开
  var TABLE = {
    normal: { N: 58, R: 28, SR: 11, SSR: 3 },
    elite:  { N: 30, R: 40, SR: 24, SSR: 6 },
    chest:  { N: 15, R: 45, SR: 30, SSR: 10 },
    boss:   { N: 0,  R: 0,  SR: 60, SSR: 40 },
    denboss:{ N: 0,  R: 50, SR: 40, SSR: 10 }
  };

  /* ================= 局内 ================= */
  var K = XY.cards = {};

  // 这一局当前有哪些法宝在起作用：卡组 + 局内捡到的；同一张多份叠加（每多一份 +50%，最多 3 份）
  K.copies = function (G, id) { return (G.deckIds.indexOf(id) >= 0 ? 1 : 0) + (G.runCards[id] || 0); };
  // v0.4：带在身上的法宝都计入套系羁绊（cnt），但只有“祭出”的那一件（G.activeCard）主效果生效
  K.carried = function (G) {
    var ids = {}, id; G.deckIds.forEach(function (x) { ids[x] = 1; }); for (id in G.runCards) ids[id] = 1;
    return Object.keys(ids);
  };
  K.recalc = function (G) {
    var cm = {}, cnt = {}, ids = K.carried(G), i, k, id;
    if (G.activeCard && ids.indexOf(G.activeCard) < 0) G.activeCard = null;
    ids.forEach(function (id) {
      var c = XY.CARD_BY[id], cp = Math.min(3, K.copies(G, id)), mul = XY.cardLvMul(XY.save.lvOf(id)) * (1 + 0.5 * (cp - 1));
      if (id === G.activeCard) for (k in c.fx) if (!XY.FX_ONCE[k]) cm[k] = (cm[k] || 0) + c.fx[k] * mul;
      cnt[c.set] = (cnt[c.set] || 0) + 1;
    });
    var combos = [];
    XY.SET_ORDER.forEach(function (sid) {
      var n = cnt[sid] || 0, tier = n >= XY.COMBO_AT[1] ? 2 : (n >= XY.COMBO_AT[0] ? 1 : 0), s = XY.CARD_SETS[sid];
      for (var t = 0; t < tier; t++) { var fx = (t === 0 ? s.t3 : s.t5).fx; for (k in fx) cm[k] = (cm[k] || 0) + fx[k]; }
      if (n > 0) combos.push({ set: sid, n: n, tier: tier });
    });
    G.cm = cm; G.combos = combos;
  };

  // 开局：读卡组（只带真正拥有的卡，且不超过栏位数）
  K.initRun = function (G) {
    var sv = XY.save, deck = [];
    sv.data.deck.forEach(function (id) { if (sv.has(id) && XY.CARD_BY[id] && deck.length < sv.deckSlots() && deck.indexOf(id) < 0) deck.push(id); });
    G.deckIds = deck; G.runCards = {}; G.cardLog = []; G.cardDrops = []; G.chests = []; G.chestFx = [];
    G.seenRun = {}; G.dexQ = []; G.killsBy = {}; G.newUnlocks = []; G.cardClock = 0; G.comboFlash = 0;
    G.activeCard = deck[0] || null; G.cardSwitchCd = 0; G.cardFly = []; G.cardBanners = []; G.unlockQ = []; G.unlockPopup = null;
    K.recalc(G);
  };
  // 开局一次性效果（卡组里的“立刻得金币 / 师父护体”）
  K.applyStart = function (G) {
    G.deckIds.forEach(function (id) { K.applyOnce(G, id, true); });
  };
  K.applyOnce = function (G, id, silent) {
    var c = XY.CARD_BY[id], mul = XY.cardLvMul(XY.save.lvOf(id));
    if (c.fx.gainCoins) G.coins += Math.round(c.fx.gainCoins * mul);
    if (c.fx.tangInv) { var t = G.heroes[0]; if (!t.down) t.inv = Math.max(t.inv, (silent ? XY.C.TANG_START_INV : 0) + c.fx.tangInv * mul); }
  };

  // 祭出一件法宝（同一时间只能祭出一件；切换有冷却）。返回 {ok, reason}
  K.setActive = function (G, id) {
    if (K.carried(G).indexOf(id) < 0) return { ok: false, reason: '身上没有这件法宝' };
    if (G.activeCard === id) return { ok: false, reason: '已经祭出这件法宝了' };
    if (G.activeCard && G.cardSwitchCd > 0) { var r = '法宝切换冷却中：还要 ' + Math.ceil(G.cardSwitchCd) + ' 秒'; XY.toast(G, r); return { ok: false, reason: r }; }
    var had = !!G.activeCard;
    G.activeCard = id; if (had) G.cardSwitchCd = C.CARD_SWITCH_CD;
    K.recalc(G); XY.recalcAll(G);
    var c = XY.CARD_BY[id];
    XY.toast(G, '祭出法宝「' + c.name + '」：' + XY.cardFxText(c, XY.save.lvOf(id)));
    var h = G.heroes[G.ctrl]; XY.ring(G, h.x, h.y, 70, XY.RARITY[c.r].color, 0.5, true);
    G.activeFlash = { id: id, t: 1.2 };
    return { ok: true, reason: '祭出' };
  };
  // 按品质抽一张（任务奖励用）
  K.pickRarity = function (G, rar) {
    var pool = XY.CARDS.filter(function (c) { return c.r === rar; });
    var ws = pool.map(function (c) { return K.copies(G, c.id) ? 1 : 3; }), sum = ws.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum, i;
    for (i = 0; i < pool.length; i++) { if (r < ws[i]) return pool[i].id; r -= ws[i]; }
    return pool[pool.length - 1].id;
  };

  /* ---------- 抽一张 ---------- */
  K.pick = function (G, table) {
    var w = TABLE[table], tot = 0, r, rar = 'N', i;
    XY.RARITY_ORDER.forEach(function (k) { tot += w[k]; });
    r = Math.random() * tot;
    for (i = 0; i < 4; i++) { var k = XY.RARITY_ORDER[i]; if (r < w[k]) { rar = k; break; } r -= w[k]; }
    var pool = XY.CARDS.filter(function (c) { return c.r === rar; });
    var ws = pool.map(function (c) { return K.copies(G, c.id) ? 1 : 3; }), sum = ws.reduce(function (a, b) { return a + b; }, 0);   // 没有的卡更容易出，方便凑羁绊
    r = Math.random() * sum;
    for (i = 0; i < pool.length; i++) { if (r < ws[i]) return pool[i].id; r -= ws[i]; }
    return pool[pool.length - 1].id;
  };
  // 在地上掉一张法宝（id 不给就按掉落表抽）
  K.drop = function (G, x, y, table, id) {
    if (G.cardDrops.length >= 14) return null;
    var d = { x: x + rand(-14, 14), y: y + rand(-14, 14), id: id || K.pick(G, table || 'normal'), life: C.CARD_LIFE, mag: null, sp: 0, bob: rand(0, 6), table: table || 'normal' };
    G.cardDrops.push(d); if (XY.sfx) XY.sfx('card', (XY.CARD_BY[d.id] || {}).r); return d;
  };
  K.onKill = function (G, e) {
    var d = e.def;
    if (!G.seenRun[e.type]) { G.seenRun[e.type] = true; if (XY.save.markSeen(e.type)) G.dexQ.push('图鉴：发现新妖怪「' + d.name + '」'); }
    if (d.boss) {                                         // 洞府 BOSS：牛魔王 2 张仙品以上；其他 1 张灵品以上（直接飞进法宝面板）
      if (e.type === 'boss') { for (var i = 0; i < 2; i++) K.give(G, K.pick(G, 'boss'), { table: 'boss' }); }
      else K.give(G, K.pick(G, 'denboss'), { table: 'denboss' });
      return;
    }
    var p = C.CARD_DROP[e.type]; if (!p) return;
    p *= C.CARD_DROP_MUL * (1 + (G.P.luck || 0)) * (G.xDrop || 1);
    if (Math.random() < p) K.drop(G, e.x, e.y, d.elite ? 'elite' : 'normal');
  };

  /* ---------- 获得一张法宝：局内生效 + 永久收藏 ---------- */
  K.give = function (G, id, opts) {
    var c = XY.CARD_BY[id], oldCombos = {}, i;
    if (!c) return null;
    G.combos.forEach(function (b) { oldCombos[b.set] = b.tier; });
    var oldCamp = G.camp.maxHp;
    G.runCards[id] = (G.runCards[id] || 0) + 1;
    G.cardLog.push({ id: id, t: G.t });
    var res = XY.save.addCard(id);
    K.recalc(G); XY.recalcAll(G);
    if (G.camp.maxHp > oldCamp) G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + (G.camp.maxHp - oldCamp));
    K.applyOnce(G, id, false);
    var R = XY.RARITY[c.r];
    if (!G.activeCard) { G.activeCard = id; K.recalc(G); XY.recalcAll(G); }       // 第一件法宝自动祭出
    // —— 获得要明显：大卡牌飞进法宝面板 + 品质色大横幅（不暂停游戏）——
    G.cardFly.push({ id: id, t: 0, max: 1.9, isNew: res.isNew });
    G.cardBanners.push({ id: id, t: 0, max: 3.4, isNew: res.isNew, quest: !!(opts && opts.quest) });
    if (c.r === 'SSR') G.goldFlash = 0.8;
    G.cardNewT = 3;
    var msg = '获得法宝「' + c.name + '」（' + R.name + '）' + (res.isNew ? ' · 新！' : ' · 重复 +1');
    XY.toast(G, msg);
    G.cardFlash = { id: id, t: 2.2 };
    // 新触发的羁绊
    G.combos.forEach(function (b) {
      if (b.tier > (oldCombos[b.set] || 0)) {
        var s = XY.CARD_SETS[b.set];
        G.comboFlash = 4; G.comboMsg = '羁绊激活：「' + s.name + '」' + XY.COMBO_AT[b.tier - 1] + ' 张 — ' + XY.comboText(b.set, b.tier - 1);
        XY.banner(G, G.comboMsg, 3.5);
      }
    });
    K.checkUnlocks(G);
    return res;
  };
  K.checkUnlocks = function (G) {
    XY.save.checkUnlocks().forEach(function (u) {
      G.newUnlocks.push(u.id); G.unlockQ.push(u.id);
      XY.toast(G, '解锁了：' + u.name + '！（主菜单 → 解锁 / 皮肤）');
    });
    if (!G.unlockPopup && G.unlockQ.length) G.unlockPopup = { id: G.unlockQ.shift(), t: 0, max: 6 };
  };

  /* ---------- 宝箱 ---------- */
  K.spawnChest = function (G) {
    // v0.5：宝箱放在唐僧“前方”的路边（路线进度比唐僧靠前 450~800），要有人先去开
    var R = G.rt, s0 = Math.min(R.total - 120, G.tang.s + rand(450, 800)), p = XY.routeAt(R, s0), off = (Math.random() < 0.5 ? -1 : 1) * rand(90, 260);
    G.chests.push({ x: XY.clamp(p.x - Math.sin(p.a) * off, 80, C.WORLD_W - 80), y: XY.clamp(p.y + Math.cos(p.a) * off, 80, C.WORLD_H - 80), t: 0, ahead: true });
  };
  K.openChest = function (G, ch) {
    if (XY.v07b) XY.v07b.onChest(G);                              // v0.7b：金箍棒蓄满灵气时，开箱触发进化
    for (var i = 0; i < 2; i++) { var d = K.drop(G, ch.x, ch.y, 'chest'); if (d) { d.life = C.CARD_LIFE; d.mag = null; d.pop = 0.5; } }
    if (XY.soldierCardDrop && Math.random() < 0.4) XY.soldierCardDrop(G, ch.x, ch.y, 'chest');   // 天兵卡：宝箱 40%
    if (XY.specials) XY.specials.maybeDrop(G, 'chest');           // 常驻角色卡：宝箱 8%
    G.coins += 25; XY.toast(G, '宝箱打开了！法宝掉出来了，快捡');
    if (XY.sfx) XY.sfx('chest');
  };

  /* ---------- 每步更新：法宝飘落、拾取、宝箱、图鉴发现 ---------- */
  K.update = function (G, dt) {
    var i, w = 0, h, j;
    // 法宝：寿命、吸附、拾取
    var pr = Math.max(C.CARD_PICK_R, G.P.pick);
    for (i = 0; i < G.cardDrops.length; i++) {
      var d = G.cardDrops[i], keep = true; d.bob += dt * 4; d.life -= dt; if (d.pop > 0) d.pop -= dt;
      if (d.life <= 0) keep = false;
      else {
        if (!d.mag) for (j = 0; j < G.heroes.length; j++) { h = G.heroes[j]; if (h.down) continue; var dx = h.x - d.x, dy = h.y - d.y; if (dx * dx + dy * dy < pr * pr) { d.mag = h; d.sp = 120; break; } }
        if (d.mag) {
          var m = d.mag; if (m.down) d.mag = null;
          else {
            var ddx = m.x - d.x, ddy = m.y - d.y, dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            d.sp += 700 * dt; var st = Math.min(d.sp * dt, dd); d.x += ddx / dd * st; d.y += ddy / dd * st;
            if (dd < m.def.r + 8) { K.give(G, d.id, { table: d.table }); keep = false; }
          }
        }
      }
      if (keep) G.cardDrops[w++] = d;
    }
    G.cardDrops.length = w;
    // 宝箱：走近就开
    for (i = G.chests.length - 1; i >= 0; i--) {
      var ch = G.chests[i]; ch.t += dt;
      for (j = 0; j < G.heroes.length; j++) { h = G.heroes[j]; if (!h.down && XY.dist(h.x, h.y, ch.x, ch.y) < C.CHEST_R + h.def.r) { (G.chestFx = G.chestFx || []).push({ x: ch.x, y: ch.y, t: 0 }); K.openChest(G, ch); G.chests.splice(i, 1); break; } }       // chestFx：只管画（开启中 → 已开启 → 淡出），不参与任何判定
    }
    if (G.chestFx) for (i = G.chestFx.length - 1; i >= 0; i--) { G.chestFx[i].t += dt; if (G.chestFx[i].t >= 1.5) G.chestFx.splice(i, 1); }
    if (G.cardFlash && (G.cardFlash.t -= dt) <= 0) G.cardFlash = null;
    if (G.cardSwitchCd > 0) G.cardSwitchCd = Math.max(0, G.cardSwitchCd - dt);
    if (G.activeFlash && (G.activeFlash.t -= dt) <= 0) G.activeFlash = null;
    if (G.goldFlash > 0) G.goldFlash -= dt;
    if (G.cardNewT > 0) G.cardNewT -= dt;
    for (i = G.cardFly.length - 1; i >= 0; i--) { G.cardFly[i].t += dt; if (G.cardFly[i].t >= G.cardFly[i].max) G.cardFly.splice(i, 1); }
    for (i = G.cardBanners.length - 1; i >= 0; i--) { G.cardBanners[i].t += dt; if (G.cardBanners[i].t >= G.cardBanners[i].max) G.cardBanners.splice(i, 1); }
    if (G.unlockPopup) { G.unlockPopup.t += dt; if (G.unlockPopup.t >= G.unlockPopup.max) { G.unlockPopup = null; if (G.unlockQ.length) G.unlockPopup = { id: G.unlockQ.shift(), t: 0, max: 6 }; } }
    if (G.comboFlash > 0) G.comboFlash -= dt;
    if (G.dexQ.length && !G.toast && !G.banner && !(G.noteQ && G.noteQ.length)) XY.toast(G, G.dexQ.shift());      // 图鉴提示排队，不抢别的提示
    // 每 0.5 秒：看见了哪些妖怪（图鉴）、有没有达成里程碑
    G.cardClock += dt;
    if (G.cardClock >= 0.5) {
      G.cardClock = 0;
      var vw = G.view.w / 2 + 60, vh = G.view.h / 2 + 60;
      for (i = 0; i < G.enemies.length; i++) {
        var e = G.enemies[i];
        if (e.dead || G.seenRun[e.type]) continue;
        if (Math.abs(e.x - G.cam.x) < vw && Math.abs(e.y - G.cam.y) < vh) {
          G.seenRun[e.type] = true;
          if (XY.save.markSeen(e.type)) G.dexQ.push('图鉴：发现新妖怪「' + e.def.name + '」');
        }
      }
      K.checkUnlocks(G);
    }
  };

  // 测试 / 调试用：直接送一张
  K.debugGive = function (G, id) { return K.give(G, id); };
})();
