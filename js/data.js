/* ============================================================
 * data.js —— 游戏数据：角色、敌人、塔、升级卡、常量
 * 所有数值集中在这里，方便调平衡。
 * ============================================================ */
var XY = window.XY = window.XY || {};

XY.VERSION = '0.8.8';
// 全开开关：公开入口默认关闭。网址加 ?test=1 才进入全开（全角色可选、单独存档）；?test=0 / ?normal=1 回到标准版
// 版本开关（全开 / 标准版）现在存在存档里：见 meta.js 的 XY.TEST_BUILD / XY.version
XY.TEST_LV = 5;     // 全开里特殊角色的角色卡等级（5 = 卡牌等级上限 XY.CARD_MAXLV，也是 SP_MAX_LV；隐藏角色不受影响）

/* ---------- 全局常量 ---------- */
XY.C = {
  TEST_DEFAULT: false,    // 公开入口默认标准版（新档特殊角色全锁、第 1 关从 Lv1 打）。?test=1 才进全开
  WORLD_W: 5120,          // 地图宽（v0.4：东西向长图，营地在东、关口在西）
  WORLD_H: 3200,          // 地图高
  STEP: 1 / 60,           // 固定逻辑步长（秒）
  FORK_S_MUL: 1.2, DNG_MUL: 0.8, DNG_HP: 1.9, DNG_DMG: 1.5, DNG_BOSS: 1.8, DNG_RATE: 0.65, DNG_XP: 4, DNG_GAIN_FIRST: 120, DNG_GAIN: 50, DNG_FIRST: 55, DNG_EVERY: 48, AIR_ON: true, AIR_GROUND_IMMUNE: true, MAX_AIR: 40, AIR_DIVE_R: 52,   // v0.8.4 飞妖：总开关 / 地面范围伤害打不到飞妖（可关）/ 同屏上限 / 俯冲落点圈半径
  AIR_PLAN: { bat: [[4, 6], [8, 10]], owl: [1, 2], march: [1, 2], marchOwl: [1, 1], dng: [2, 3] },   // 每波飞妖数：夜潮 2 / 3 的蝠妖、夜潮 3 的夜枭、行军波（南线 ×2 + 夜枭）、副本
  MAX_ENEMIES: 520,       // 全世界敌人上限（压力上限；v0.5 精灵图渲染后 800 只同屏 p95 仍 ≤17ms）
  CAMP_HP: 3000,          // 营地血量
  START_COINS: 50,
  STATION_R: 130,         // 唐僧“驻守”生效的营地半径（离营地中心多远算在营地里）
  STATION_REGEN: 22,      // 唐僧驻守时营地每秒额外回血
  STATION_DEF: 0.6,       // 唐僧驻守时营地受到的伤害倍率（0.6 = 少挨 40%）
  GUARD_TAUNT: 0.45,       // 守护师傅的英雄在妖怪眼里“更近”（距离平方乘这个数），把怪引过来
  BOSS_KEEP: 430,          // 佛光结界：牛魔王离师父至少这么远（徒弟还活着时）
  // —— BOSS 狂暴倒计时（v0.6.4）：BOSS 第一次出洞迎战就开始倒数（躲洞 / 败退 / 追出太远回洞时也照走，不暂停，防止拖时间）；
  //    时间到还没打死就狂暴一次：血量上限 / 当前血量 / 伤害（弹幕、震地、冲锋、身体接触）/ 出招与接触频率 ×2；BOSS 活着且狂暴期间小怪出量 ×2 ——
  BOSS_ENRAGE_T: 120,                // 默认 120 秒（所有 BOSS，含牛魔王）
  BOSS_ENRAGE_BY: {},                // 个别 BOSS 要不同时间就写在这里，如 { boss: 150 }；现在全部用默认 120
  BOSS_ENRAGE_MUL: 2,                // 狂暴数值倍率
  ENRAGE_SPAWN_MUL: 2,               // 狂暴期间小怪出量倍率
  ENRAGE_WARN1: 30, ENRAGE_WARN2: 10,   // 倒数 30 / 10 秒预警
  BOSS_BULLET_LIFE: 2,     // 牛魔王弹幕飞行时间（×190 速度 = 射程 380，够不着结界外的师父）
  SPAWN_MUL: 1.0,            // 刷怪速度总倍率（平衡用；v0.4 起各洞府自己有速率）
  // —— v0.4：妖气（强化）、出量倍率、洞府、妖塔、天兵、法宝切换 ——
  ENEMY_SCALE: 0.01,       // 小怪：每分钟 +1%（线性）
  BOSS_SCALE: 0.05,        // 洞府 BOSS：每分钟 +5%（线性，存活期间一直涨）
  VOL_UP: 0.10,            // 唐僧驻守时，出量倍率每分钟 +0.10
  VOL_DOWN: 0.05,          // 唐僧不驻守时，出量倍率每分钟 -0.05
  VOL_MIN: 1.0, VOL_MAX: 3.0,
  DEN_CAP: 190,            // 每座洞府同时存活的小怪上限
  DEN_AGGRO: 850,          // 英雄靠近到这个距离，洞府 BOSS 出来追
  DEN_AGGRO_TANG: 420,     // 唐僧本人路过要近到这个距离才会惊动洞主（徒弟 / 特殊角色是 DEN_AGGRO）
  DEN_DRAW_R: 420,         // 洞主被引出洞口超过这个距离 = “引出来了”：该洞府暂停出怪 / 倾巢 / 派精英，在外面单挑它
  DEN_LEASH: 1250,         // 英雄离开这么远，BOSS 回洞
  // —— v0.5 西行 ——
  REST_T: 120,             // 每关唯一休息点：休息 2 分钟，不能提前结束
  REST_ZONE: 190,          // 休息营地半径（营地规则只在休息时生效）
  DEN_ACTIVE: 1600,        // 唐僧离洞府多远以内，洞府才出怪（走远了的洞府安静下来）
  DEN_CLOSE: 90,           // 洞主败退后，洞府暂停出怪多少秒
  REEMERGE_IDLE: 45,       // 败退过的洞主回洞口后没人引它，这么多秒后自己出洞一次（防止蹲在洞里、狂暴倒计时空转）
  RETREAT_T: 25,           // 洞主败退：无敌、跑回洞里多少秒
  RETREAT_HEAL: 0.6,       // 回洞后恢复到的血量比例
  SKY_ONCE: 1,             // 天兵降临：每关次数
  GUARD_R: 520,            // 护法天兵：离唐僧多远以内可以驻守放置
  SOLDIER_R: 15, SOLDIER_FOLLOW: 150,   // 护法天兵身体半径 / 跟随时在唐僧身后的间距
  HUNT_FIRST: 330,         // v0.4.1 追剿令：久拖不决，天界 / 妖界的追兵从远处杀向营地（秒，每关可覆盖 huntFirst）
  HUNT_EVERY: 95,          // 之后每隔多久一批，一批比一批大、一批比一批凶
  HUNT_N: 2, HUNT_N_UP: 1, // 第 k 批 = HUNT_N + HUNT_N_UP·k 只精英牛头卫 + 同数量的石头怪
  HUNT_R0: 900, HUNT_R1: 1300, HUNT_SPD: 1.3, HUNT_HP: 4, HUNT_DMG: 1.5, HUNT_HP_UP: 0.35, HUNT_DMG_UP: 0.3,   // 第 k 批精英血量 ×6×(1+1.2k)、伤害 ×1.5×(1+0.8k)，速度 ×1.3，从营地周围 1000~1400 px 现身
  RAID_FIRST: 300,         // v0.4.1 妖王出征：洞府 BOSS 还活着时，第一次亲自带兵杀向营地的时间（秒，每关可覆盖 raidFirst）
  RAID_EVERY: 110,         // 之后每隔多久再出征一次（每座洞府错开）
  RAID_DUR: 110,           // 一次出征持续多久（BOSS 追不到人 / 时间到就回洞）
  RAID_RAGE_HP: 0.6, RAID_RAGE_DMG: 0.4,   // 每次出征 BOSS 狂暴：最大血量 ×(1+0.5) 并回满、伤害 ×(1+0.3)，逐次叠加
  RAID_SWARM: 1.2,         // 出征开场带的小妖群 = 洞府倾巢规模 × 此倍数
  RAID_RATE_UP: 0.2,      // 每出征一次，该洞府的出怪速率再 +18%（洞府越拖越兴旺）
  DEN_SWARM_EVERY: 50,     // 洞府倾巢而出的间隔（秒）（v0.5：75→50）
  DEN_RATE_MUL: 2.4, SWARM_MUL: 1.6,       // v0.5 爽快样板：洞府稳定出怪速率 ×2.4、倾巢规模 ×1.6，同时单个小妖更脆（见 small.hp / xp）
  FLOW_WALK: 55, FLOW_REST: 100, FLOW_XP: 0.1, FLOW_COIN: 0.2, FLOW_R: 760, FLOW_BATCH: 9, SURGE_FIRST: 40, SURGE_EVERY: 45, SURGE_K0: 1.5, SURGE_K1: 2.0,   // v0.5 密度控制器：行军目标同屏 ~42、守营 ~95；每 ~45 秒一波浪潮（峰值 ×1.6–2.4）
  WAVE_PLAN: true, WAVE_LEAD: 20, WAVE_BIG_EVERY: 4, WAVE_BIG_K: 1.5, WAVE_BIG_ELITE: 3, WAVE_REST_K: 1.3,   // v0.7 妖潮预告：提前 20 秒预告；行军每 4 波一个大潮；大潮数量 ×1.5 + 3 只牛头卫；休息点的潮 ×1.3
  REST_SEG: 100, REST_PREP: 20, REST_WRAP: 20, REST_WAVES: [22, 55], REST_MUL_PREP: 0.5, REST_MUL_TIDE: 1.15, REST_MUL_WRAP: 0.55,   // 休息点 300 秒 = 3 个夜潮 × 100 秒（备战 20 + 来潮 60 + 收尾 20）；每夜潮 2 波，分别在 22 秒 / 55 秒；平时刷怪密度倍率：备战 ×0.5 / 来潮 ×1.15 / 收尾 ×0.55
  ROAD_EVERY: 15, ROAD_N0: 8, ROAD_N1: 14, ROAD_AHEAD0: 600, ROAD_AHEAD1: 900,   // 路边刷怪点：唐僧前方 600–900 路程处，每 ~15 秒 8–14 只（洞府离路远，光靠洞府怪太少）
  DROP_LIFE: 31, DROP_FADE: 4, DROP_CAP_GEM: 320, DROP_CAP_COIN: 200,   // v0.6：地上的经验 / 金币 31 秒后消失（比 Phyrex 的 30 秒全图收集长，最后 4 秒闪烁变淡）；数量上限，超了先没最老的
  PICK_R: 110, MAGNET_T: 0.9,             // 拾取半径 110（原 70）；清屏后吸附全屏掉落约 0.9 秒汇入
  HITSTOP_BUDGET: 0.25,                   // 顿帧预算：每秒最多冻结 250ms
  DEN_ELITE_EVERY: 120,    // 洞府出精英的间隔（秒）
  ETOWER_FIRST: 20, ETOWER_EVERY: 45, ETOWER_BUILD: 8, ETOWER_CAP: 3,
  ETOWER_RANGE: 300, ETOWER_CD: 1.8, ETOWER_DMG: 12, ETOWER_HP: 380,
  SKY_COST: 60, SKY_CD: 60, SKY_N: 5, SKY_LIFE: 20, SKY_HP: 70, SKY_DMG: 16, SKY_SPEED: 190, SKY_MAX: 14,
  CARD_SWITCH_CD: 8,       // 祭出的法宝切换冷却
  GATE_R: 110,             // 关口半径（唐僧走进来才算到）
  MOUSE_HOLD: 0.18,        // 按住左键多久算“按住走”（不是单击）
  CAMP_ZONE_R: 150,       // “营地圈”半径：唐僧在圈里、妖怪闯进圈里 = 红色警报
  TANG_START_INV: 6,      // 开局保护（秒）：唐僧 1 点血，开局先给几秒无敌
  AI_FOLLOW: true,         // 没被操控的英雄跟着队伍等级成长（每次升级自动学一点，不占玩家的技能点）
  ENEMY_HP_MUL: 8,         // 全局：小怪 / 精英血量倍率（平衡用；BOSS 和妖塔不受影响）
  HERO_DMG_MUL: 0.4,         // 英雄自己出手的伤害系数（不含法宝）
  ENEMY_DMG_MUL: 8,      // 全局：妖怪伤害倍率（平衡用）
  TANG_TARGET_W: 3.5,     // 妖怪选目标时，唐僧的“距离平方”乘这个数（越大，妖怪越不爱追他）
  POINT_BONUS_EVERY: 5,   // 每升到 5 的倍数级，多给 1 个技能点
  MAX_TOWERS: 6, ROAD_HALF: 230,   // v0.5：护法天兵默认上限 6（沙僧召唤线 / 召唤型特殊角色可提高，见 XY.soldierCap） / 西行路两侧各 230 内都能放
  TOWER_RANGE_FROM_CAMP: 760, // 营地周围这个范围内随时能造
  BUILD_REACH: 520,           // v0.4：一路上都能造塔——离操控英雄 / 唐僧这么近的空地都能造
  BEAD_ON: 3.5, BEAD_REST: 1.5,   // 沙僧骷髅念珠：转 3.5 秒、歇 1.5 秒
  TANG_PULSE: 3,                  // 唐僧佛光：每 3 秒一次脉冲
  ALLY_AGGRO: 600,                // 妖怪只有在这个范围内没有英雄时才会转去打天兵
  TAUNT_R: 600, CARRY_SPEED: 1.8, CARRY_T: 6,
  INH_K: 0.008,            // 取经之旅：每继承 1 级，怪物生命 +0.8%（第二关开局 Lv27 ≈ +21%）
  LEVEL_CAP: 99, XP_NEED_MAX: 180,   // v0.6：等级上限 99；每级所需经验封顶 180（等级 >13 后每级固定 180，保证三关取经能练到 99，见 CHANGELOG）
  PH_XF_LEVEL: 99, PH_XF_DUR: 45, PH_XF_CD: 90, PH_XF_MUL: 10, PH_COLLECT_T: 30,   // Phyrex 满级变身（持续 45 秒 / 冷却 90 秒 / 生命伤害 ×10）和隐藏能力“亲自操控满 30 秒全图收集”
  ELEM_WIN: 1.35, ELEM_LOSE: 0.75, ELEM_SAME: 0.85,   // 元素克制 / 被克 / 同元素
  DEN_NOBUILD: 200,           // 洞府中心附近不能造塔
  FONT: '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC","WenQuanYi Micro Hei",sans-serif'
};

/* ---------- 五位英雄 ---------- */
XY.HEROES = [
  { id: 'tang', dtype: 'magic', elem: 'metal', pdef: 0, mdef: 0,  name: '唐僧',   color: '#f2c14e', dark: '#b8860b', hp: 1, speed: 85, r: 17,
    weapon: '佛光经文', wdesc: '身边佛光给队友回血，同时射出经文',
    ult: '佛光普照', udesc: '全队回半血、震退周围妖怪（不会复活阵亡的队友）', ultCd: 45, slow: true },
  { id: 'wukong', dtype: 'phys', elem: 'metal', pdef: 0.1, mdef: 0.0, name: '孙悟空', color: '#ef8a3c', dark: '#b3541a', hp: 130, speed: 185, r: 17,
    weapon: '金箍棒', wdesc: '近身横扫一大片',
    ult: '大圣无双', udesc: '巨大范围重击并震晕敌人', ultCd: 30 },
  { id: 'bajie', dtype: 'magic', elem: 'earth', pdef: 0.3, mdef: 0.25, name: '猪八戒', color: '#f28fb0', dark: '#c2547c', hp: 160, speed: 150, r: 20,
    weapon: '九齿灵耙', wdesc: '耙风化作土系法术冲击波，重砸一片并击飞',
    ult: '猪突猛进', udesc: '向前冲锋，法力震飞路上所有敌人，冲锋时不挨打', ultCd: 28 },
  { id: 'wujing', dtype: 'magic', elem: 'water', pdef: 0.2, mdef: 0.3, name: '沙悟净', color: '#4f86c6', dark: '#2b5a96', hp: 200, speed: 160, r: 18,
    weapon: '骷髅项链', wdesc: '骷髅绕身旋转，碰到就伤',
    ult: '流沙河', udesc: '脚下生出流沙，敌人大幅减速并持续受伤', ultCd: 32 },
  { id: 'horse', dtype: 'magic', elem: 'water', pdef: 0.05, mdef: 0.2, name: '白龙马', color: '#6fcfd8', dark: '#2d9aa6', hp: 110, speed: 200, r: 17,
    weapon: '龙息水箭', wdesc: '远程射出水箭，能穿透',
    ult: '龙吟万里', udesc: '向四面八方射出一圈穿透水箭', ultCd: 26 }
];

// 五位主角的“专长”（选择界面 / 卡片提示用）：沙僧召唤、悟空物理、八戒法术、白龙马坐骑；唐僧既不能操控也不能骑
XY.HERO_ROLE = {
  tang: { key: 'none', name: '不可操控', desc: '唐僧自己赶路，不听指挥、不能骑乘，只有 1 点血' },
  wukong: { key: 'phys', name: '物理输出', desc: '近战物理，筋斗云突进、大招震晕' },
  bajie: { key: 'magic', name: '法术冲击', desc: '土系法术，耙风击飞一大片' },
  wujing: { key: 'summon', name: '召唤', desc: '召唤线能提高天兵上限、强化天兵；骷髅护身' },
  horse: { key: 'mount', name: '坐骑', desc: '下“骑乘”命令后驮着一位伙伴跑得更快；骑着时自己不出手' }
};

/* ---------- 敌人 ---------- */
// hp/dmg 会随时间放大；xp 为掉落经验；coin 为掉币概率/数量
XY.ENEMIES = {
  small:  { dtype: 'phys', elem: null, pdef: 0, mdef: 0, name: '小妖',   hp: 12,  speed: 92,  dmg: 5,  r: 13, xp: 0.6,  coinP: 0.35, coin: 1,  color: '#b08fd8', dark: '#6e4fa3', knockRes: 0 },
  tank:   { dtype: 'phys', elem: 'earth', pdef: 0.25, mdef: 0, name: '石头怪', hp: 52,  speed: 52,  dmg: 11, r: 19, xp: 2,  coinP: 0.6, coin: 2,  color: '#a58a6a', dark: '#6b5238', knockRes: 0.35 },
  ranged: { dtype: 'magic', elem: 'wood', pdef: 0, mdef: 0.25, name: '弓箭妖', hp: 22,  speed: 62,  dmg: 6,  r: 14, xp: 1.2,  coinP: 0.5, coin: 1,  color: '#4fb3a1', dark: '#237a6a', knockRes: 0, range: 300, keep: 230 },
  shield: { dtype: 'phys', elem: 'wood', pdef: 0.1, mdef: 0, name: '盾兵', hp: 34, speed: 56, dmg: 9, r: 16, xp: 1.6, coinP: 0.5, coin: 1, color: '#c9a24a', dark: '#6e5216', knockRes: 0.5, guard: true },   // v0.7b：正面挡伤害
  elite:  { dtype: 'phys', elem: 'earth', pdef: 0.15, mdef: 0.1, name: '牛头卫', hp: 560, speed: 72,  dmg: 18, r: 27, xp: 30, coinP: 1,    coin: 12, color: '#d9534f', dark: '#8f1f1b', knockRes: 0.7, elite: true },
  boss:   { dtype: 'phys', elem: 'earth', pdef: 0.2, mdef: 0.1, name: '牛魔王', hp: 7000, speed: 58, dmg: 20, r: 50, xp: 0,  coinP: 1,    coin: 60, color: '#7a4ab5', dark: '#3d1e66', knockRes: 1, boss: true, denBoss: true, kit: 'bull', summon: 'tank' },
  // —— v0.8.4 飞妖（fly:true：不被地面挤开、地面范围伤害够不着；逻辑在 js/fly.js） ——
  bat:    { dtype: 'phys', elem: 'wood', pdef: 0, mdef: 0, name: '蝠妖', hp: 9, speed: 120, dmg: 5, r: 9, xp: 0.5, coinP: 0.4, coin: 1, color: '#5b4f66', dark: '#2b2530', knockRes: 0.2, fly: true, dive: { aim: 1.6, spd: 320, rest: 1.6, cd: [4, 6], mul: 1.2 } },
  owl:    { dtype: 'magic', elem: 'metal', pdef: 0, mdef: 0.1, name: '夜枭', hp: 36, speed: 85, dmg: 6, r: 14, xp: 1.4, coinP: 0.6, coin: 1, color: '#6f6578', dark: '#2b2530', knockRes: 0.4, fly: true, range: 340, keep: 280 },
  // —— 洞府 BOSS（v0.4）：每座洞府一位，三招沿用牛魔王那套（冲锋 / 弹幕 / 召唤），数值、颜色不同 ——
  bear:   { dtype: 'phys', elem: 'earth', pdef: 0.25, mdef: 0.05, name: '黑熊精',   hp: 2600, speed: 62, dmg: 16, r: 44, xp: 0, coinP: 1, coin: 40, color: '#6b5a52', dark: '#2e2420', knockRes: 1, boss: true, denBoss: true, kit: 'bear', summon: 'tank' },
  bone:   { dtype: 'magic', elem: 'water', pdef: 0.05, mdef: 0.25, name: '白骨精',   hp: 2300, speed: 72, dmg: 14, r: 38, xp: 0, coinP: 1, coin: 40, color: '#ece8d6', dark: '#8f8a72', knockRes: 1, boss: true, denBoss: true, kit: 'bone', summon: 'small' },
  jin:    { dtype: 'magic', elem: 'metal', pdef: 0.1, mdef: 0.25, name: '金角大王', hp: 3800, speed: 64, dmg: 18, r: 46, xp: 0, coinP: 1, coin: 50, color: '#e6b422', dark: '#8a6a0b', knockRes: 1, boss: true, denBoss: true, kit: 'jin', summon: 'ranged' },
  red:    { dtype: 'magic', elem: 'fire', pdef: 0.05, mdef: 0.2, name: '红孩儿',   hp: 3400, speed: 80, dmg: 17, r: 38, xp: 0, coinP: 1, coin: 50, color: '#e0452e', dark: '#8a1f10', knockRes: 1, boss: true, denBoss: true, kit: 'red', summon: 'small' },
  yellow: { dtype: 'magic', elem: 'wood', pdef: 0.1, mdef: 0.2, name: '黄风怪',   hp: 3600, speed: 66, dmg: 18, r: 44, xp: 0, coinP: 1, coin: 50, color: '#c9a227', dark: '#6b5510', knockRes: 1, boss: true, denBoss: true, kit: 'yellow', summon: 'ranged' },
  iron:   { dtype: 'magic', elem: 'wood', pdef: 0.15, mdef: 0.25, name: '铁扇公主', hp: 4600, speed: 66, dmg: 19, r: 42, xp: 0, coinP: 1, coin: 60, color: '#4fa39a', dark: '#1f6a62', knockRes: 1, boss: true, denBoss: true, kit: 'iron', summon: 'tank' },
  yumian: { dtype: 'magic', elem: 'water', pdef: 0.05, mdef: 0.3, name: '玉面公主', hp: 4000, speed: 70, dmg: 18, r: 40, xp: 0, coinP: 1, coin: 60, color: '#f08ab0', dark: '#a8456f', knockRes: 1, boss: true, denBoss: true, kit: 'yumian', summon: 'small' },
  chiyan: { dtype: 'magic', elem: 'fire', pdef: 0.15, mdef: 0.25, name: '赤焰魔',   hp: 5000, speed: 68, dmg: 20, r: 46, xp: 0, coinP: 1, coin: 60, color: '#d9622b', dark: '#7a2a0b', knockRes: 1, boss: true, denBoss: true, kit: 'chiyan', summon: 'ranged' },
  // —— 妖塔：不会动的敌人，会射暗器（AI 在 game.js），所有英雄 / 塔 / 天兵都能打 ——
  etower: { dtype: 'magic', elem: 'earth', pdef: 0.3, mdef: 0.1, name: '妖塔', hp: 380, speed: 0, dmg: 12, r: 24, xp: 6, coinP: 1, coin: 8, color: '#8a5fc0', dark: '#3e1f6e', knockRes: 1, etower: true }
};
// 洞府 BOSS 的顺序（图鉴用）
XY.DEN_BOSSES = ['bear', 'bone', 'jin', 'red', 'yellow', 'iron', 'yumian', 'chiyan', 'boss'];

/* ---------- 防御塔 ---------- */
XY.TOWERS = {
  arrow:  { key: 'z', name: '弓天兵',   life: 180, cost: 30, range: 250, dmg: 11, cd: 0.55, color: '#9a7b52', desc: '射速快的远程弓手，持续 180 秒' },
  cannon: { key: 'x', name: '炮天兵',   life: 150, cost: 70, range: 215, dmg: 32, cd: 1.7,  color: '#6f7f8f', splash: 70, desc: '范围爆炸，对付一堆妖怪，持续 150 秒' },
  frost:  { key: 'c', name: '寒冰天兵', life: 130, cost: 50, range: 175, dmg: 5,  cd: 0.8,  color: '#6bb7e8', slow: 0.45, desc: '范围内妖怪明显变慢，持续 130 秒' },
  siege:  { key: 'v', name: '破阵天兵', life: 200, cost: 90, range: 390, dmg: 38, cd: 2.4,  color: '#8a5a3a', anti: 3, desc: '远程重弩，打妖塔 ×3 伤害，专拆妖塔 / 点杀 BOSS，持续 200 秒' },
  heal:   { key: 'b', name: '佛光天兵', life: 140, cost: 70, range: 190, dmg: 0,  cd: 1.5,  color: '#e5b93c', heal: 0.05, desc: '范围内英雄每次回 5% 血（唐僧除外），营地 / 天兵也回血，持续 140 秒' }
};
XY.TOWER_ORDER = ['arrow', 'cannon', 'frost', 'siege', 'heal'];
XY.TOWER_ROLE = { arrow: '单体', cannon: '范围', frost: '减速', siege: '拆妖塔', heal: '辅助回血' };
XY.TOWER_UP_COST = [0, 0, 45, 90]; // 升到 2、3 级的价格
XY.TOWER_HP = { arrow: 240, cannon: 320, frost: 260, siege: 280, heal: 300 };   // v0.4：塔有血量，会被妖塔打

/* ---------- 主技能每一阶的效果说明（技能树里用） ---------- */
XY.WEAPON_DESC = {
  wukong: ['伤害和范围提升', '伤害提升，并且会反手再扫一次', '伤害和范围再提升', '伤害提升，横扫变成整整一圈'],
  bajie:  ['钉耙更大更重，伤害提升', '被砸中的妖怪会晕半秒', '范围和伤害提升', '砸完再来一记余震'],
  wujing: ['多一颗骷髅，伤害提升', '转得更快，伤害提升', '再多一颗骷髅，范围变大', '骷髅更多更大，伤害提升'],
  horse:  ['水箭更快更痛', '一次射两发', '水箭能穿透更多妖怪', '一次射三发'],
  tang:   ['佛光范围变大，回血更多', '经文射得更快更痛', '佛光会灼伤范围内的妖怪', '回血翻倍，经文更强']
};

/* ---------- 五行 / 伤害类型（v0.4） ---------- */
XY.ELEMS = { metal: { name: '金', color: '#d4a62a', glyph: '金' }, wood: { name: '木', color: '#3f9a3a', glyph: '木' }, water: { name: '水', color: '#3f8fd8', glyph: '水' },
  fire: { name: '火', color: '#e0452e', glyph: '火' }, earth: { name: '土', color: '#9a7448', glyph: '土' } };      // v0.5：只有真正的五行（风 / 雷已并入：风→木，雷→金）
XY.ELEM_ORDER = ['metal', 'wood', 'water', 'fire', 'earth'];
// 五行相克（攻击方 → 被它克的元素）：金克木、木克土、土克水、水克火、火克金；相生：金生水、水生木、木生火、火生土、土生金
XY.ELEM_BEATS = { metal: ['wood'], wood: ['earth'], earth: ['water'], water: ['fire'], fire: ['metal'] };
XY.ELEM_GEN = { metal: 'water', water: 'wood', wood: 'fire', fire: 'earth', earth: 'metal' };
XY.DTYPE_NAME = { phys: '物理', magic: '法术' };
// 元素系数：attacker 打 defender
XY.elemMul = function (a, d) {
  if (!a || !d) return 1;
  if (a === d) return XY.C.ELEM_SAME;
  if ((XY.ELEM_BEATS[a] || []).indexOf(d) >= 0) return XY.C.ELEM_WIN;
  if ((XY.ELEM_BEATS[d] || []).indexOf(a) >= 0) return XY.C.ELEM_LOSE;
  return 1;
};
XY.weakList = function (elem) { var r = []; for (var k in XY.ELEM_BEATS) if (XY.ELEM_BEATS[k].indexOf(elem) >= 0) r.push(k); return r; };   // 谁克它（可能不止一个）
XY.weakOf = function (elem) { return XY.weakList(elem)[0] || null; };
XY.weakText = function (elem) { return XY.weakList(elem).map(function (k) { return XY.ELEMS[k].name; }).join('/'); };

/* ---------- 徒弟的“特性”（点击触发，有 CD；唐僧没有） ---------- */
XY.TRAITS = {
  wukong: { name: '筋斗云',   short: '云', cd: 45, color: '#ef8a3c', desc: '立刻回到唐僧身边（无论你在哪、陷在洞府怪堆里也行），落地 0.5 秒无敌' },
  bajie:  { name: '钉耙挡灾', short: '挡', cd: 50, color: '#f28fb0', desc: '跃到唐僧身边，嘲讽 600 内所有妖怪 4 秒，期间减伤 60%' },
  wujing: { name: '流沙护法', short: '沙', cd: 55, color: '#4f86c6', desc: '在唐僧脚下生成流沙圈 6 秒：妖怪减速 80%，圈内暗器 / 弹幕消失' },
  horse:  { name: '龙腾', short: '龙', cd: 60, color: '#6fcfd8', desc: '骑乘者 5 秒大幅加速并 3 秒不受伤；没人骑就自己加速' }
};
