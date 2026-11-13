/* ============================================================
 * meta.js —— 局外成长：存档、皮肤 / 变体角色、收集解锁、图鉴文字
 *
 * 存档是一份带版本号的 JSON（存在 localStorage 的一个键里）：
 *   { schema, gameVersion, profile{id,name,account}, createdAt, updatedAt,
 *     stats{runs,wins,kills,bestTime,totalTime,bossKills},
 *     cards{ 卡牌id: {lv, dup, got, first} },     // 已拥有的卡牌（法宝）
 *     deck[卡牌id],                                // 当前卡组
 *     dex{ 妖怪id: {seen, kills, first} },          // 妖怪图鉴
 *     unlocks{ 解锁id: 时间戳 },
 *     skins{ 英雄id: 皮肤id }, party{ horse: 'horse'|'dragon' } }
 * 以后做账号 / 云存档：整份 JSON 原样上传即可（profile.account 预留绑定账号）。
 * 这个文件不碰画面，也不碰一局游戏里的状态。
 * ============================================================ */
(function () {
  var XY = window.XY;
  var KEY_STD = 'xiyou_survivors_save', KEY_TEST = 'xiyou_survivors_save_test';     // 全开和普通版各用一把存档钥匙：全开永远不会碰普通版的存档
  // 进入哪个版本：同一标签页里切换过 > 网址 ?normal=1（或 ?test=0）= 普通版 / ?test=1 = 全开 > C.TEST_DEFAULT（默认 true：直接打开就是全开）
  function resolveMode() {
    var q = (window.location && window.location.search) || '', ss = null;
    try { ss = window.sessionStorage.getItem('xy_mode'); } catch (e) { ss = null; }
    if (ss === 'std' || ss === 'test') return ss;
    if (/[?&](normal=1|test=0)(&|#|$)/.test(q)) return 'std';
    if (/[?&]test=1(&|#|$)/.test(q)) return 'test';
    return XY.C && XY.C.TEST_DEFAULT === true ? 'test' : 'std';
  }
  var MODE = resolveMode(), KEY = MODE === 'test' ? KEY_TEST : KEY_STD;
  var DEFAULT_MODE = MODE;
  var SCHEMA = 5;   // v0.8.8：5 = 反派系列块补全（villain.series[系列] 加 wallet{yaojin,yaodan}/mats/evo/t3Seen/pity/traps/stage，旧的数字钱包迁成妖金）。   // v0.5：4 = 新增 mode（版本开关）+ spT（全开特殊角色状态）。   // v0.5：3 = 新增 journey（取经之旅成长存档）。   // v0.5：2 = 新增 sp 默认（2 张 Phyrex + 已选）、sold（天兵卡）、tutorial；旧档升级不丢任何进度
  var SAVE_EPOCH = 6;   // 0.8.7 新版：本机旧游戏记录整份清掉，只清一次，不写数据库。
  var EPOCH_KEY = 'xiyou_save_epoch';

  /* ---------- 皮肤（每位英雄一套换装）和变体角色 ---------- */
  XY.SKINS = {
    tang:   { id: 'jinlan',  name: '锦襴金袈裟', color: '#fff0b8', dark: '#d19a14', accent: '#d9433a' },
    wukong: { id: 'zhanfo',  name: '斗战胜佛',   color: '#f7cf4a', dark: '#b8860b', accent: '#d62828' },
    bajie:  { id: 'jingtan', name: '净坛使者',   color: '#9bd8a8', dark: '#3f8f56', accent: '#8a5a2b' },
    wujing: { id: 'luohan',  name: '金身罗汉',   color: '#d9b878', dark: '#8a6a2b', accent: '#4f86c6' },
    horse:  { id: 'yulong',  name: '玉龙',       color: '#f3f6ff', dark: '#8aa0c8', accent: '#6fcfd8' }
  };
  // 变体角色：占用第 5 个位置，替换白龙马（逻辑仍按 horse 处理：远程水箭 + 龙吟万里；数值略有不同）
  XY.VARIANTS = {
    dragon: {
      name: '小白龙', form: 'human', color: '#8fb4ff', dark: '#3f62b8', hp: 130, speed: 190, r: 17, dmgMul: 1.1,
      weapon: '龙吟剑气', wdesc: '化作人形，挥出穿透的龙吟剑气', ult: '龙吟万里', udesc: '向四面八方射出一圈穿透剑气',
      note: '人形态：血量 +20、伤害 +10%，移动 −10；外形和名字不同'
    }
  };
  XY.HORSE_FORMS = [{ id: 'horse', name: '白龙马' }, { id: 'dragon', name: '小白龙（人形）' }];

  /* ---------- 收集解锁：达成里程碑就解锁新东西 ----------
   * kind: skin（皮肤）/ hero（变体角色）/ slot（卡组栏位 +1）
   * cond: { type, n[, set] }  type: cards 不同法宝数 / kills 累计击杀 / wins 通关次数 / runs 开局次数 / set 集齐一整套 / best 最长坚持秒数 */
  XY.BASE_SLOTS = 3;
  XY.UNLOCKS = [
    { id: 'u_slot4',  kind: 'slot', name: '卡组栏位 4',    desc: '卡组可以多带 1 张法宝',        cond: { type: 'cards', n: 6 } },
    { id: 'u_tang',   kind: 'skin', hero: 'tang',   name: '唐僧·锦襴金袈裟', desc: '换装：金袈裟',     cond: { type: 'runs', n: 3 } },
    { id: 'u_wukong', kind: 'skin', hero: 'wukong', name: '孙悟空·斗战胜佛', desc: '换装：金身战袍',   cond: { type: 'cards', n: 9 } },
    { id: 'u_horse',  kind: 'skin', hero: 'horse',  name: '白龙马·玉龙',     desc: '换装：珠光白龙',   cond: { type: 'best', n: 360 } },
    { id: 'u_bajie',  kind: 'skin', hero: 'bajie',  name: '猪八戒·净坛使者', desc: '换装：青绿僧衣 + 斗笠',   cond: { type: 'shards', n: 3 } },
    { id: 'u_slot5',  kind: 'slot', name: '卡组栏位 5',    desc: '卡组可以再多带 1 张法宝',      cond: { type: 'cards', n: 14 } },
    { id: 'u_wujing', kind: 'skin', hero: 'wujing', name: '沙悟净·金身罗汉', desc: '换装：金身袈裟',   cond: { type: 'set', n: 6 } },
    { id: 'u_dragon', kind: 'hero', hero: 'horse',  name: '小白龙（人形）',   desc: '新角色：白龙马化为人形，替换白龙马出战', cond: { type: 'wins', n: 1 } },
    { id: 'u_slot6',  kind: 'slot', name: '卡组栏位 6',    desc: '卡组可以带满 6 张法宝',        cond: { type: 'cards', n: 20 } }
  ];
  XY.UNLOCK_BY = {}; XY.UNLOCKS.forEach(function (u) { XY.UNLOCK_BY[u.id] = u; });
  var COND_TXT = { cards: function (n) { return '收集 ' + n + ' 张不同的法宝'; }, kills: function (n) { return '累计击杀 ' + n + ' 只妖怪'; },
    wins: function (n) { return '通关任意关卡 ' + n + ' 次'; }, shards: function (n) { return '集齐 ' + n + ' 枚皮肤碎片（支线任务奖励）'; }, runs: function (n) { return '开始取经 ' + n + ' 局'; },
    set: function (n) { return '集齐任意一整套法宝（' + n + ' 张）'; }, best: function (n) { return '单局坚持 ' + Math.floor(n / 60) + ' 分钟'; } };
  XY.condText = function (u) { return COND_TXT[u.cond.type](u.cond.n); };

  /* ---------- 妖怪图鉴文字 ---------- */
  XY.BESTIARY = {
    small:  { desc: '山里最常见的小妖，成群结队地涌来。单只很弱，但被围住也很痛。', tip: '别被围住：边走位边打，让塔和队友帮你清。', drop: '偶尔掉落法宝（很低）' },
    tank:   { desc: '披着石甲的怪物，又慢又硬，撞上就是一大口血。', tip: '用寒冰塔拖慢，再用炮塔、钉耙之类的重击处理。', drop: '有一定几率掉落法宝' },
    ranged: { desc: '躲在后排射暗器的弓箭妖，暗器飞得很远——连师父也躲不过。', tip: '让守护师傅的徒弟挡在师父前面；优先清掉。', drop: '有一定几率掉落法宝' },
    shield: { desc: '举着青铜大盾的小妖，盾牌朝着前进的方向，正面飞来的暗器和挥击大多被挡掉。', tip: '绕到背后打（“破背”多 15%）；或者用金属性（金克木）、破阵天兵——这些能直接打穿盾。放着不管它会一路推到营地。', drop: '偶尔掉落金币和经验' },
    bat:    { desc: '成群的蝠妖，贴着天际飞来，盯上一个人后先锁定一个红圈，0.8 秒后俯冲砸下。血很薄，但会飞——钉耙、锡杖、流沙、炮弹这类“地面”范围伤害够不着它。', tip: '看到红圈就走开（站在圈外一点伤害都没有）；用单体的、弹道类的、天兵射箭或大招去打。', drop: '偶尔掉落金币和经验' },
    owl:    { desc: '夜里才出来的猫头鹰妖，远远地扔羽毛，慢，但一直盯着你。它也在天上，地面范围伤害够不着。', tip: '羽毛飞得慢，横着走位就能躲；让天兵、孙悟空的棍子或大招去收拾它。', drop: '有一定几率掉落金币' },
    elite:  { desc: '牛魔王手下的牛头卫，又高又壮，会成批出现。', tip: '集中火力，一个一个解决；别让它们靠近营地圈。', drop: '很大几率掉落法宝（品质更好）' },
    boss:   { desc: '牛魔王，摩云洞的大魔头。有佛光结界挡着，他碰不到师父，只能追着徒弟打。', tip: '派徒弟围着他打，躲开冲锋和弹幕；他每分钟强化 5%，别拖。', drop: '必定掉落两件仙品以上的法宝' },
    bear:   { desc: '黑风洞的黑熊精，偷了观音禅院的锦襴袈裟。皮厚力大，冲锋很猛。', tip: '第 1 关的主线目标。越早打越好，他每分钟强化 5%。', drop: '必定掉落法宝' },
    bone:   { desc: '白虎岭的白骨精，会变化，召唤一群小妖助阵。', tip: '先清小妖再围她；别让师父被小妖碰到。', drop: '必定掉落法宝' },
    jin:    { desc: '平顶山莲花洞的金角大王，手持宝葫芦，召唤弓箭妖远程压制。', tip: '用守护师傅的徒弟挡暗器，近身围殴。', drop: '必定掉落法宝' },
    red:    { desc: '火云洞的红孩儿，三昧真火，冲得快。', tip: '站稳别被冲撞，冲锋前有红色预警线。', drop: '必定掉落法宝' },
    yellow: { desc: '黄风洞的黄风怪，风沙里藏着一群弓箭妖。', tip: '先拆掉洞府外的妖塔，再打黄风怪。', drop: '必定掉落法宝' },
    iron:   { desc: '芭蕉洞的铁扇公主，一把芭蕉扇扇得人睁不开眼。', tip: '第 3 关主线：打倒她，拾取掉落的芭蕉扇。', drop: '掉落芭蕉扇（任务宝物）+ 法宝' },
    yumian: { desc: '翠云洞的玉面公主，手下小妖成群。', tip: '多用范围攻击（沙僧骷髅、炮塔）清场。', drop: '必定掉落法宝' },
    chiyan: { desc: '火焰洞的赤焰魔，火焰山的守山大将，血最厚。', tip: '放着不管会越来越肉，尽早处理。', drop: '必定掉落法宝' },
    etower: { desc: '洞府里的妖怪盖起来的深紫色宝塔，会朝英雄和我们的塔射暗器，越晚盖的等级越高。', tip: '趁它还在盖（脚手架）时打掉；射中师父就是失败，别让师父靠近。', drop: '摧毁得金币和经验（计入“拆塔”任务）' }
  };
  XY.ENEMY_ORDER = ['small', 'tank', 'ranged', 'shield', 'bat', 'owl', 'elite', 'etower', 'bear', 'bone', 'jin', 'red', 'yellow', 'iron', 'yumian', 'chiyan', 'boss'];

  /* ================= 存档读写 ================= */
  /* v0.8.8 反派系列存档块（按 Boss 系列分开存；牛魔王 niumo 是第一个）。
   *  wallet.yaojin = 妖金（反派关赚、造洞府花）；wallet.yaodan = 妖丹；灵石是西游线货币，仍在 data.lingshi，两边不互换。
   *  mats = 进化素材 {素材id: 数量}；evo = 各小妖进化阶 {小妖id: 0-5}；t3Seen = 已看过的 T3 / 进化预告；pity = 保底计数 {素材id: 连续未掉次数}。 */
  function villainSeriesDefault() {
    return { wallet: { yaojin: 0, yaodan: 0 }, got: {}, runs: 0, cleared: 0, traps: {}, mats: {}, evo: {}, t3Seen: {}, pity: {}, stage: { runs: 0, clears: 0, bestSec: 0, firstDone: false, stars: 0, bestCave: 0, dayKey: '', avgYaojin: 0, avgN: 0 }, lair: { rev: 0, doc: null, verifiedHash: '', published: false, paid: 0, clears: 0, bestStars: 0, firstDone: false, runs: 0 }, cos: {}, codex: {}, avgMats: {} };
  }
  function record(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function natural(n) { return typeof n === 'number' && isFinite(n) && n >= 0; }
  function villainSeriesFix(v) {                       // 只补不覆盖；旧版数字钱包 → wallet.yaojin
    var b = villainSeriesDefault(), k;
    if (typeof v.wallet === 'number') v.wallet = { yaojin: natural(v.wallet) ? v.wallet : 0, yaodan: 0 };
    if (!record(v.wallet)) v.wallet = b.wallet;
    ['yaojin', 'yaodan'].forEach(function (c) { if (!natural(v.wallet[c])) v.wallet[c] = 0; });
    ['runs', 'cleared'].forEach(function (c) { if (!natural(v[c])) v[c] = 0; });
    ['got', 'traps', 'mats', 'evo', 't3Seen', 'pity'].forEach(function (c) { if (!v[c] || typeof v[c] !== 'object' || Array.isArray(v[c])) v[c] = {}; });
    if (!record(v.stage)) v.stage = b.stage;
    ['cos', 'codex', 'avgMats'].forEach(function (c) { if (!v[c] || typeof v[c] !== 'object' || Array.isArray(v[c])) v[c] = {}; });
    if (!record(v.lair)) v.lair = b.lair;
    for (k in b.lair) if (typeof v.lair[k] !== typeof b.lair[k] || typeof b.lair[k] === 'number' && !natural(v.lair[k])) v.lair[k] = b.lair[k];
    for (k in b.stage) if (typeof v.stage[k] !== typeof b.stage[k] || typeof b.stage[k] === 'number' && !natural(v.stage[k])) v.stage[k] = b.stage[k];
    return v;
  }
  /* v0.9 本地排行榜存档块（js/board.js 读写；以后整块随云存档上传）：
   *  profile = 榜上的「我」{ handle, name, avatar?, updated, mode:'auto'|'xchar'|'none' }；me = 我在各榜的成绩；ref = 引路（拉新）名单；others = 其他玩家的成绩（本地登记 / 以后云端缓存）；ui = 榜页设置。 */
  function boardsDefault() {
    return { v: 1, profile: { handle: '', name: '', avatar: '', updated: 0, mode: 'auto' }, me: {}, ref: { list: [] }, others: {}, ui: { samples: false, tab: 'lair' } };
  }
  function boardsFix(b) {
    var base = boardsDefault(), k;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return base;
    b.v = 1;
    if (!b.profile || typeof b.profile !== 'object') b.profile = base.profile;
    ['handle', 'name', 'avatar'].forEach(function (c) { if (typeof b.profile[c] !== 'string') b.profile[c] = ''; });
    if (typeof b.profile.updated !== 'number') b.profile.updated = 0;
    if (b.profile.mode !== 'auto' && b.profile.mode !== 'xchar' && b.profile.mode !== 'none') b.profile.mode = 'auto';
    if (!b.me || typeof b.me !== 'object' || Array.isArray(b.me)) b.me = {};
    if (!b.ref || typeof b.ref !== 'object') b.ref = base.ref;
    if (!Array.isArray(b.ref.list)) b.ref.list = [];
    if (!b.others || typeof b.others !== 'object' || Array.isArray(b.others)) b.others = {};
    Object.keys(b.others).forEach(function (id) { if (!Array.isArray(b.others[id])) b.others[id] = []; });
    if (!b.ui || typeof b.ui !== 'object') b.ui = base.ui;
    if (typeof b.ui.samples !== 'boolean') b.ui.samples = true;
    if (typeof b.ui.tab !== 'string') b.ui.tab = 'lair';
    return b;
  }
  function defaults() {
    var d = {
      schema: SCHEMA, saveEpoch: SAVE_EPOCH, gameVersion: XY.VERSION,
      profile: { id: 'local-' + Math.random().toString(36).slice(2, 10), name: '取经人', account: null },   // account：以后绑定账号用
      createdAt: Date.now(), updatedAt: Date.now(),
      stats: { runs: 0, wins: 0, kills: 0, bestTime: 0, totalTime: 0, bossKills: 0, sideDone: 0 },
      cards: {}, deck: [], dex: {}, unlocks: {}, skins: {}, party: { horse: 'horse' },
      levels: {}, dng: {}, routes: { N: 0, S: 0 }, lingshi: 0, shards: 0, questsDone: {},   // v0.4：关卡进度、灵石（货币）、皮肤碎片、已完成过的支线
      sp: { cards: {}, chosen: null, shop: null, shopGen: 0 },   // 公开新档：特殊角色一张都没有。出发页十连抽到的才解锁
      spT: { cards: {}, chosen: null, shop: null, shopGen: 0 },  // 全开特殊角色状态（和标准版分开存）。全开仍按 TEST_LV 全可选，不靠这叠卡
      mode: DEFAULT_MODE,                                                       // v0.5：版本开关 'test'（全开）/ 'std'（标准版）
      sold: { cards: { arrow: 1, heal: 1 } },                                   // v0.5：天兵卡
      tutorial: { done: false, grow: false },
      gacha10: null,                                                             // 出发页十连：抽出即写入；null = 这个存档还没抽
      journey: { entry: {}, legacy: false },                                     // 取经之旅：每关入场快照（见 journey.js）
      villain: { series: { niumo: villainSeriesDefault() } },          // v0.8.6 预留：反派模式按 Boss 系列分钱包 / 已得 / 局数 / 通关数（牛魔王是第一个系列；v0.9.0 启用）
      tips: { seen: {}, cut: false },
      boards: boardsDefault(),                                                    // v0.9 本地排行榜（js/board.js）：我的身份 / 各榜成绩 / 引路名单 / 其他玩家缓存
      chain: { dungeon: 0, bossfight: 0, villain: 0, boss: {} }                       // v0.8.6 预留：解锁链「基础关→副本→Boss 战→反派模式」每一环是否已通过（条件表见 hooks09.js XY.CHAIN09）；boss = 各系列 Boss 通关次数
    };
    ['jingubang', 'jindouyun', 'huoyan'].forEach(function (id) { d.cards[id] = { lv: 1, dup: 0, got: 0, first: Date.now() }; d.deck.push(id); });   // 新手礼：三张齐天套法宝（v0.6：一局只能带同一套），已放进卡组
    return d;
  }

  // 旧版存档升级到新版（现在只有 schema 1；以后改格式就在这里加分支）
  function migrate(d) {
    if (!record(d)) return defaults();
    var base = defaults(), k;
    for (k in base) if (d[k] === undefined) d[k] = base[k];
    ['stats', 'cards', 'dex', 'unlocks', 'skins', 'party', 'levels', 'questsDone', 'dng', 'routes'].forEach(function (key) { if (!record(d[key])) d[key] = base[key]; });
    ['levels', 'dng'].forEach(function (key) { Object.keys(d[key]).forEach(function (id) { if (!record(d[key][id])) delete d[key][id]; else if (key === 'levels' && !record(d[key][id].sides)) d[key][id].sides = {}; }); });
    for (k in base.stats) if (!natural(d.stats[k])) d.stats[k] = 0;
    if (!Array.isArray(d.deck)) d.deck = [];
    d.deck = d.deck.filter(function (id, i, a) { return d.cards[id] && a.indexOf(id) === i; });
    if (!d.party.horse) d.party.horse = 'horse';
    if (!record(d.profile)) d.profile = base.profile;
    ['id', 'name'].forEach(function (key) { if (typeof d.profile[key] !== 'string' || !d.profile[key]) d.profile[key] = base.profile[key]; });
    if (!natural(d.lingshi)) d.lingshi = 0;
    if (!natural(d.shards)) d.shards = 0;
    if (!record(d.villain)) d.villain = {};
    if (!record(d.villain.series)) d.villain.series = {};
    if (!d.villain.series.niumo) d.villain.series.niumo = villainSeriesDefault();
    Object.keys(d.villain.series).forEach(function (k) { if (!record(d.villain.series[k])) d.villain.series[k] = villainSeriesDefault(); villainSeriesFix(d.villain.series[k]); });
    if (!record(d.tips)) d.tips = {};
    if (!record(d.tips.seen)) d.tips.seen = {};
    if (typeof d.tips.cut !== 'boolean') d.tips.cut = false;
    if (!record(d.chain)) d.chain = {};
    ['dungeon', 'bossfight', 'villain'].forEach(function (k) { if (!natural(d.chain[k])) d.chain[k] = 0; });
    if (!record(d.chain.boss)) d.chain.boss = {};
    d.boards = boardsFix(d.boards);
    // v0.5 升级（schema 1 → 2）：只补不删。老玩家没解锁 Phyrex 的话补到 2 张（解锁线），没选常驻角色就选 Phyrex
    if (!record(d.sp)) d.sp = { cards: {}, chosen: null, shop: null, shopGen: 0 };
    if (!record(d.sp.cards)) d.sp.cards = {};
    if ((d.schema || 1) < 2) {
      if ((d.sp.cards.phyrex || 0) < 2) d.sp.cards.phyrex = 2;
      if (!d.sp.chosen) d.sp.chosen = 'phyrex';
      d.sold = d.sold && d.sold.cards ? d.sold : base.sold;
      d.tutorial = { done: !!(d.stats && d.stats.runs > 0) };      // 玩过的老玩家不再看教程
    }
    if ((d.schema || 1) < 3 || !record(d.journey) || !record(d.journey.entry)) {
      var anyClear = Object.keys(d.levels || {}).some(function (k) { return d.levels[k] && d.levels[k].cleared; });
      d.journey = { entry: {}, legacy: anyClear };   // 旧档：已通关的老玩家用补偿快照，不从零打后面的关
    }
    if (d.mode !== 'std' && d.mode !== 'test') d.mode = DEFAULT_MODE;
    if (!record(d.spT)) d.spT = { cards: {}, chosen: null, shop: null, shopGen: 0 };
    if (!record(d.spT.cards)) d.spT.cards = {};
    if (d.gacha10 === undefined) d.gacha10 = null;
    if (!record(d.sold) || !record(d.sold.cards)) d.sold = base.sold;
    if (!record(d.tutorial)) d.tutorial = { done: false, grow: false };
    if (typeof d.tutorial.done !== 'boolean') d.tutorial.done = false;
    if (typeof d.tutorial.grow !== 'boolean') d.tutorial.grow = false;
    if ((d.saveEpoch | 0) < SAVE_EPOCH) return defaults();
    d.schema = SCHEMA; d.saveEpoch = SAVE_EPOCH; d.gameVersion = XY.VERSION;
    return d;
  }


  var wipedFlag = false;
  function gameRecordKey(k) {
    if (!k || k === EPOCH_KEY || k === 'xy_mute' || k === 'xy_bg') return false;
    if (k.indexOf('sb-') === 0) return false;
    return k === KEY_STD || k === KEY_TEST || k === 'xy_auto_v1' || k === 'xiyou_xchars_v1' || k === 'xiyou_mods_v1' || k.indexOf('xiyou_') === 0 || k.indexOf('xy_') === 0;
  }
  function saveEpochOf(raw) {
    if (!raw) return 0;
    try { var d = JSON.parse(raw); return d && typeof d.saveEpoch === 'number' ? d.saveEpoch : 0; } catch (e) { return 0; }
  }
  /* 旧版本地游戏记录整份丢掉。音效 / 背景偏好和登录令牌留下。清完写下版本号，之后同版本不再清。 */
  function wipeOldSaves() {
    var ls, mark = null, rawStd = null, rawTest = null, i, k, keys = [];
    try { ls = window.localStorage; } catch (e) { return; }
    try { mark = ls.getItem(EPOCH_KEY); rawStd = ls.getItem(KEY_STD); rawTest = ls.getItem(KEY_TEST); } catch (e2) { return; }
    try { for (i = 0; i < ls.length; i++) { k = ls.key(i); if (gameRecordKey(k)) keys.push(k); } } catch (e3) {}
    var marked = mark === String(SAVE_EPOCH);
    var anyOldSave = [rawStd, rawTest].some(function (raw) { return !!raw && saveEpochOf(raw) < SAVE_EPOCH; });
    var other = keys.some(function (k) { return k !== KEY_STD && k !== KEY_TEST; });
    var should = anyOldSave || (!marked && other);
    if (!should) {
      if (!marked) { try { ls.setItem(EPOCH_KEY, String(SAVE_EPOCH)); } catch (e4) {} }
      return;
    }
    keys.forEach(function (k) { try { ls.removeItem(k); } catch (e5) {} });
    try { ls.setItem(EPOCH_KEY, String(SAVE_EPOCH)); } catch (e6) {}
    wipedFlag = true;
  }

  var S = XY.save = {
    KEY: KEY, SCHEMA: SCHEMA, EPOCH: SAVE_EPOCH, wiped: false, holdCloud: false, villainSeriesDefault: villainSeriesDefault, boardsDefault: boardsDefault, data: null, memoryOnly: false, dirty: false, _timer: null, onUnlock: null,

    load: function () {
      wipeOldSaves();
      if (wipedFlag) { S.wiped = true; S.holdCloud = true; }
      var raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (e) { S.memoryOnly = true; }
      var d = null;
      if (raw) { try { d = JSON.parse(raw); } catch (e2) { d = null; } }
      S.data = d ? migrate(d) : defaults();
      if (!raw || JSON.stringify(S.data) !== raw) S.flush();
      return S.data;
    },
    flush: function () {
      S.dirty = false; if (S._timer) { clearTimeout(S._timer); S._timer = null; }
      S.data.updatedAt = Date.now();
      try { window.localStorage.setItem(KEY, JSON.stringify(S.data)); S.memoryOnly = false; } catch (e) { S.memoryOnly = true; }
    },
    touch: function () { S.dirty = true; if (!S._timer) S._timer = setTimeout(function () { S._timer = null; if (S.dirty) S.flush(); }, 1500); },
    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* 没有存储也无所谓 */ }
      var m = S.data && S.data.mode; S.data = defaults(); if (m === 'std' || m === 'test') S.data.mode = m;    // 版本开关是设置不是进度：重置存档不改它
      S.flush(); return S.data;
    },
    exportJSON: function () { return JSON.stringify(S.data); },

    /* ---- 卡牌 ---- */
    has: function (id) { return !!S.data.cards[id]; },
    lvOf: function (id) { var c = S.data.cards[id]; return c ? c.lv : 1; },
    ownedCount: function () { return Object.keys(S.data.cards).length; },
    upNeed: function (lv) { return lv >= XY.CARD_MAXLV ? 0 : [0, 2, 3, 4, 6][lv]; },       // 当前 lv 升到下一级要多少张重复卡
    // 获得一张卡：新卡入库；已有的算“重复”，攒够张数可以升级
    addCard: function (id) {
      var c = S.data.cards[id], isNew = !c;
      if (!c) c = S.data.cards[id] = { lv: 1, dup: 0, got: 0, first: Date.now() }; else c.dup++;
      c.got++; S.touch();
      return { isNew: isNew, dup: c.dup, lv: c.lv, canUp: c.lv < XY.CARD_MAXLV && c.dup >= S.upNeed(c.lv) };
    },
    upgradeCard: function (id) {
      var c = S.data.cards[id];
      if (!c) return { ok: false, reason: '还没有这张法宝' };
      if (c.lv >= XY.CARD_MAXLV) return { ok: false, reason: '已经是最高等级' };
      var need = S.upNeed(c.lv);
      if (c.dup < need) return { ok: false, reason: '重复的法宝不够：要 ' + need + ' 张，现在 ' + c.dup + ' 张' };
      c.dup -= need; c.lv++; S.touch();
      return { ok: true, reason: '升到 Lv' + c.lv };
    },
    /* ---- 卡组 ---- */
    deckSlots: function () { var n = XY.BASE_SLOTS; XY.UNLOCKS.forEach(function (u) { if (u.kind === 'slot' && S.data.unlocks[u.id]) n++; }); return n; },
    inDeck: function (id) { return S.data.deck.indexOf(id) >= 0; },
    toggleDeck: function (id) {
      var d = S.data.deck, i = d.indexOf(id);
      if (i >= 0) { d.splice(i, 1); S.touch(); return { ok: true, reason: '已取下' }; }
      if (!S.has(id)) return { ok: false, reason: '还没有这张法宝' };
      if (d.length >= S.deckSlots()) return { ok: false, reason: '卡组满了（' + S.deckSlots() + ' 格），先取下一张；收集更多法宝能解锁更多栏位' };
      d.push(id); S.touch(); return { ok: true, reason: '已放进卡组' };
    },
    /* ---- 关卡进度（v0.4）---- */
    levelInfo: function (id) { return S.data.levels[id] || null; },
    levelUnlocked: function (id) { return id <= 1 || XY.TEST_BUILD || !!(S.data.levels[id - 1] && S.data.levels[id - 1].cleared); },
    recordClear: function (id, t, sides) {
      var l = S.data.levels[id] || (S.data.levels[id] = { cleared: false, best: 0, sides: {}, runs: 0 });
      l.cleared = true; l.runs++; if (!l.best || t < l.best) l.best = Math.round(t);
      (sides || []).forEach(function (i) { l.sides[i] = true; });
      S.touch();
    },
    /* ---- v0.8.4 洞府副本：解锁 = 第 1 关通关过一次；记录 data.dng[id] = { cleared, best, runs } ---- */
    dngUnlocked: function (id) { return !!(XY.TEST_BUILD || (S.data.levels[1] && S.data.levels[1].cleared)); },
    dngInfo: function (id) { return S.data.dng[id] || null; },
    recordDungeon: function (id, t) {
      var l = S.data.dng[id] || (S.data.dng[id] = { cleared: false, best: 0, runs: 0 });
      l.cleared = true; l.runs++; if (!l.best || t < l.best) l.best = Math.round(t); S.touch();
    },
    levelSides: function (id) { var l = S.data.levels[id]; return l && l.sides ? Object.keys(l.sides).length : 0; },
    /* ---- 灵石 / 皮肤碎片 ---- */
    addLingshi: function (n) { S.data.lingshi += n; S.touch(); },
    addShard: function (n) { S.data.shards += n; S.touch(); },
    CARD_PRICE: 80,
    buyCard: function () {                                  // 局外：80 灵石抽一张法宝
      if (S.data.lingshi < S.CARD_PRICE) return { ok: false, reason: '灵石不够：要 ' + S.CARD_PRICE + '，现在 ' + S.data.lingshi };
      var r = Math.random() * 100, rar = r < 50 ? 'N' : (r < 82 ? 'R' : (r < 96 ? 'SR' : 'SSR'));
      var pool = XY.CARDS.filter(function (c) { return c.r === rar; }), c = pool[Math.floor(Math.random() * pool.length)];
      S.data.lingshi -= S.CARD_PRICE;
      var res = S.addCard(c.id);
      S.checkUnlocks(); S.touch();
      return { ok: true, id: c.id, isNew: res.isNew, reason: '求得法宝「' + c.name + '」（' + XY.RARITY[c.r].name + '）' + (res.isNew ? ' · 新！' : ' · 重复 +1') };
    },
    /* ---- 图鉴 ---- */
    dexOf: function (type) { return S.data.dex[type] || null; },
    markSeen: function (type) {
      var e = S.data.dex[type]; var fresh = !e || e.seen === 0;
      if (!e) e = S.data.dex[type] = { seen: 0, kills: 0, first: Date.now() };
      e.seen++; S.touch(); return fresh;
    },
    addKill: function (type) {
      var e = S.data.dex[type] || (S.data.dex[type] = { seen: 0, kills: 0, first: Date.now() });
      e.kills++; S.data.stats.kills++; S.touch();
    },
    /* ---- 皮肤 / 变体 ---- */
    skinUnlocked: function (heroId) { var u = XY.UNLOCKS.filter(function (x) { return x.kind === 'skin' && x.hero === heroId; })[0]; return !!(u && S.data.unlocks[u.id]); },
    skinOf: function (heroId) { var s = S.data.skins[heroId]; return s && S.skinUnlocked(heroId) ? s : 'default'; },
    setSkin: function (heroId, which) {
      if (which !== 'default' && !S.skinUnlocked(heroId)) return { ok: false, reason: '还没解锁这套皮肤' };
      S.data.skins[heroId] = which; S.touch(); return { ok: true };
    },
    dragonUnlocked: function () { return !!S.data.unlocks.u_dragon; },
    setHorseForm: function (f) {
      if (f === 'dragon' && !S.dragonUnlocked()) return { ok: false, reason: '还没解锁小白龙' };
      S.data.party.horse = f; S.touch(); return { ok: true };
    },
    horseForm: function () { return S.data.party.horse === 'dragon' && S.dragonUnlocked() ? 'dragon' : 'horse'; },

    /* ---- 解锁判定 ---- */
    progress: function (u) {
      var st = S.data.stats, c = u.cond, cur = 0;
      if (c.type === 'cards') cur = S.ownedCount();
      else if (c.type === 'kills') cur = st.kills;
      else if (c.type === 'wins') cur = st.wins;
      else if (c.type === 'shards') cur = S.data.shards;
      else if (c.type === 'runs') cur = st.runs;
      else if (c.type === 'best') cur = Math.floor(st.bestTime);
      else if (c.type === 'set') {
        Object.keys(XY.CARD_SETS).forEach(function (sid) {
          var n = XY.CARDS.filter(function (cd) { return cd.set === sid && S.has(cd.id); }).length; if (n > cur) cur = n;
        });
      }
      return { cur: Math.min(cur, c.n), need: c.n, done: cur >= c.n };
    },
    // 检查有没有新达成的里程碑；返回新解锁列表（同时触发 onUnlock 回调，用来弹提示）
    checkUnlocks: function () {
      var out = [];
      XY.UNLOCKS.forEach(function (u) {
        if (S.data.unlocks[u.id]) return;
        if (S.progress(u).done) { S.data.unlocks[u.id] = Date.now(); out.push(u); S.touch(); }
      });
      if (out.length && S.onUnlock) out.forEach(function (u) { S.onUnlock(u); });
      return out;
    },
    // 一局结束（胜利 / 失败 / 中途放弃）：把成绩记进存档
    commitRun: function (G, result) {
      if (G.committed) return G.runReport;
      G.committed = true;
      var st = S.data.stats;
      st.runs++; st.totalTime += G.t; if (G.t > st.bestTime) st.bestTime = G.t;
      st.bossKills += (G.stats && G.stats.denKills) || 0;
      if (result === 'win') {
        st.wins++;
        var sd = []; if (G.quests) G.quests.sides.forEach(function (q, i) { if (q.done) sd.push(i); });
        if (G.dungeon) S.recordDungeon(G.dungeon.id, G.t);          // 副本：只写 data.dng，不算第 1 关通关、不进取经之旅
        else { S.recordClear(G.levelId, G.t, sd); if (XY.journey) XY.journey.onWin(G); }
      }
      var added = S.checkUnlocks();
      G.runReport = { result: result, level: G.levelId, cards: G.cardLog ? G.cardLog.length : 0, newUnlocks: (G.newUnlocks || []).concat(added.map(function (u) { return u.id; })) };
      S.flush();
      return G.runReport;
    }
  };

  /* ---- 带皮肤 / 变体的英雄定义：游戏里、菜单里都用这个 ---- */
  XY.heroDef = function (i) {
    var base = XY.HEROES[i], d = {}, k;
    for (k in base) d[k] = base[k];
    if (base.id === 'horse' && S.data && S.horseForm() === 'dragon') { var v = XY.VARIANTS.dragon; for (k in v) d[k] = v[k]; d.variant = 'dragon'; }
    if (S.data && S.skinOf(base.id) !== 'default') { var sk = XY.SKINS[base.id]; d.color = sk.color; d.dark = sk.dark; d.accent = sk.accent; d.skinId = sk.id; d.skinName = sk.name; }
    return d;
  };

  /* ---- 版本开关（单文件，不用构建参数）：XY.TEST_BUILD 是存档 mode 的读写口；全开 / 标准版各有一份特殊角色状态 ---- */
  Object.defineProperty(XY, 'TEST_BUILD', { configurable: true, enumerable: true,
    get: function () { return MODE === 'test'; },
    set: function (v) { if (S.data) XY.version.set(v ? 'test' : 'std'); else MODE = v ? 'test' : 'std'; } });
  XY.version = {
    mode: function () { return XY.TEST_BUILD ? 'test' : 'std'; },
    name: function (m) { return (m || XY.version.mode()) === 'test' ? '全员' : '标准版'; },
    desc: function (m) { return (m || XY.version.mode()) === 'test' ? '三关全开 · 全员满级差一只怪 · 特殊角色 Lv5 · 单独存档' : '新档特殊角色未解锁 · 出发页可十连一次'; },
    set: function (m) {                                  // 切换版本 = 换一份存档（先把当前这份写好）；同一标签页刷新后保持
      m = m === 'std' ? 'std' : 'test';
      if (S.data && m !== MODE) {
        S.flush(); MODE = m; KEY = S.KEY = m === 'test' ? KEY_TEST : KEY_STD; DEFAULT_MODE = m; S.load();
        try { window.sessionStorage.setItem('xy_mode', m); } catch (e) {}
      }
      S.data.mode = m; return XY.version.mode();
    },
    showToggle: function () { return !!XY.TEST_BUILD; },   // 公开标准版不放切换按钮；?test=1 进来之后才能切回
    toggle: function () { return XY.version.set(XY.TEST_BUILD ? 'std' : 'test'); }
  };
  S.load();
  window.addEventListener('pagehide', function () { if (S.dirty) S.flush(); });
  window.addEventListener('beforeunload', function () { if (S.dirty) S.flush(); });
})();
