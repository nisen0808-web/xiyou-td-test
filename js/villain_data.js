/* ============================================================
 * villain_data.js —— v0.9 反派模式（牛魔王系列）的数据表 + 纯函数
 *  塔表 / 陷阱 / 素材 / 进化配方 / 自动放招参数 / 洞府预算。全部数字来自 /workspace/villain/design.md（§1 §3 §15 §16）。
 *  不碰存档、不碰画面；villain_run / villain_lair / villain_ui 读这里。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY;
  var S = XY.VILLAIN_SERIES = XY.VILLAIN_SERIES || {};
  S.niumo = {
    id: 'niumo', name: '牛魔王', order: 1, enabled: true, boss: 'niumo', seal: '#7a5bb5',
    unlock: { kind: 'boss', id: 'niumo' }, team: ['niumo'], fabao: [],
    stages: [{ id: 'v1', name: '守芭蕉洞', level: 1 }], lair: { maxLv: 1 },
    towers: ['ranged', 'tank', 'shield', 'small', 'elite', 'bone', 'bear', 'yaota']
  };
  var VD = XY.VD = {};

  /* ---- 反派关：数值 ---- */
  VD.STAGE = {
    hpK: 0.65, cntK: 0.5, caveHp: 4800, contact: 20, ranged: 10, boss: 150,   // v0.9.0 探针实测：一人守原版第 1 关，怪数 ×0.5、洞府 4500、咬一口 30（设计稿 ×0.75 / 3000 / 60 打不过）
     bossThr: 120, hitGap: 0.4,
    goldK: 1.15, failK: 0.5, firstBonus: 500, dailyK: 1.5, chestCoins: 120, chests: 3, sweepK: 0.8,
    regen: 2, regenAfter: 6,                                   // 洞府血条：6 秒没被打 → 每秒自己回 2 点
    hero: { hp: 2400, dr: 0.25, dmgK: 1, atk: 150, atkGap: 0.6, splash: 1, splashR: 170, speed: 165, lvK: 0.1, regen: 0.012 },   // 横扫整圈 + 每级 +10% + 自回血（设计稿 38 / 1.0s / 35% 溅射，一人对原版怪潮不够）
    stars: { s2: 0.4, s3: 0.6, hp3: 0.3 }
  };
  /* ---- 三招自动放（§16.1） ---- */
  VD.AUTO = { fanN: 5, fanEye: 3, lowHp: 0.4, chargeN: 3, execHp: 0.3, eyeR: 120, sumN: 8, campDrop: 0.05, idle: 6, gap: 0.5 };
  VD.SK = {
    fan: { name: '芭蕉扇', cd: 18, r: 260, arc: 120, kb: 180, slow: 0.4, slowT: 2, dmg: 60, icon: 'fan' },
    charge: { name: '冲撞', cd: 8, dist: 320, dmg: 90, w: 80, icon: 'charge' },
    summon: { name: '召小妖', cd: 25, n: 3, hp: 80, dmg: 8, life: 12, icon: 'summon' }
  };

  /* ---- 素材（§15.3） ---- */
  VD.MATS = {
    yaogu: { name: '妖骨', icon: 'mat_yaogu', from: 'small', p: 0.02 }, jianyu: { name: '箭羽', icon: 'mat_jianyu', from: 'ranged', p: 0.06 },
    shanyan: { name: '山岩', icon: 'mat_shanyan', from: 'tank', p: 0.08 }, dunpian: { name: '盾片', icon: 'mat_dunpian', from: 'shield', p: 0.10 },
    niujiao: { name: '牛角', icon: 'mat_niujiao', from: 'elite', p: 0.50 }, fuyi: { name: '蝠翼', icon: 'mat_fuyi', from: 'bat', p: 0.05 },
    xiongdan: { name: '熊胆', icon: 'mat_xiongdan', from: 'bear', boss: true }, gufu: { name: '骨符', icon: 'mat_gufu', from: 'bone', boss: true }
  };
  VD.MAT_ORDER = ['yaogu', 'jianyu', 'shanyan', 'dunpian', 'niujiao', 'fuyi', 'xiongdan', 'gufu'];
  VD.FROM = { small: 'yaogu', ranged: 'jianyu', tank: 'shanyan', shield: 'dunpian', elite: 'niujiao', bat: 'fuyi', owl: 'fuyi' };

  /* ---- 八种塔（§3.3；cost = T1 价；up2 / up3 = 追加价） ---- */
  var T = VD.TOWERS = {
    ranged: { name: '弓箭妖', hp: 1050, dmg: 48, rng: 300, gap: 1.0, cost: 100 + 20, up2: 180, up3: 360, unlock: 0, atk: 'shoot' },
    tank: { name: '石头怪', hp: 2500, dmg: 40, splash: 90, rng: 260, gap: 2.4, cost: 200, up2: 300, up3: 600, unlock: 0, atk: 'lob' },
    shield: { name: '盾兵', hp: 2700, dmg: 36, rng: 140, gap: 1.2, cost: 160, up2: 240, up3: 480, unlock: 0, atk: 'melee', aura: [0.35, 0.5, 0.5] },
    small: { name: '小妖营', hp: 1200, dmg: 40, rng: 0, gap: 10, cost: 100, up2: 150, up3: 300, unlock: 0, atk: 'camp' },
    elite: { name: '牛头卫', hp: 3600, dmg: 96, rng: 130, gap: 1.6, cost: 300, up2: 450, up3: 900, unlock: 800, atk: 'melee' },
    bone: { name: '白骨精', hp: 2000, dmg: 18, rng: 330, gap: 3.0, cost: 340, up2: 520, up3: 1000, unlock: 1000, atk: 'fire' },
    bear: { name: '黑熊精', hp: 2600, dmg: 60, splash: 200, rng: 200, gap: 4.2, cost: 450, up2: 650, up3: 1200, unlock: 1200, atk: 'slam', stun: [0.6, 1.0, 1.4] },
    yaota: { name: '妖塔', hp: 1800, dmg: 90, rng: 420, gap: 2.2, cost: 280, up2: 420, up3: 840, unlock: 900, atk: 'shell' }
  };
  T.ranged.cost = 120;
  VD.TOWER_ORDER = ['ranged', 'tank', 'shield', 'small', 'elite', 'bone', 'bear', 'yaota'];
  VD.TIER_HP = [1, 1.3, 1.7]; VD.TIER_DMG = [1, 1.35, 1.8];
  VD.ART = { ranged: 'ranged', tank: 'tank', shield: 'shield', small: 'small', elite: 'elite', bone: 'bone', bear: 'bear', yaota: 'yaota' };
  VD.EVO_NAMES = {
    ranged: ['弓箭妖', '骨弓妖', '铁羽射手', '火翎箭妖', '玄翼弩将', '万箭妖王'], tank: ['石头怪', '碎岩怪', '铁岩力士', '熔岩巨怪', '玄晶石魔', '山岳妖王'],
    shield: ['盾兵', '木盾妖兵', '铁盾卫', '赤炎盾将', '玄龟盾魔', '镇岳盾王'], small: ['小妖营', '持刀小妖', '巡山小校', '火头妖目', '黑风妖帅', '万妖头领'],
    elite: ['牛头卫', '铁角卫', '铜甲牛卫', '赤焰牛将', '玄甲牛魔将', '平天牛王'], bone: ['白骨精', '骨杖妖姬', '白骨法姬', '磷火骨姬', '尸魔骨后', '白骨夫人'],
    bear: ['黑熊精', '铁爪熊妖', '熊罴力士', '焰鬃熊将', '玄风熊魔', '黑风熊王'], yaota: ['妖塔', '骨木妖塔', '铁箍妖塔', '火眼妖塔', '玄晶魔塔', '镇天妖王塔']
  };
  VD.LV = [null, { slots: 8, budget: 4500, t3: 2, traps: 4, rocks: [8, 10] }];

  /* ---- 陷阱（§3.4） ---- */
  VD.TRAPS = {
    bantou: { name: '绊马索', cost: 80, icon: 'huangjin', slow: 0.5, slowT: 3, w: 35 },
    huolun: { name: '烈火轮', cost: 150, icon: 'huolun', dps: 20, t: 6, w: 20 },
    duwu: { name: '毒雾盏', cost: 120, icon: 'liuli', dps: 8, t: 6, w: 25 },
    zhenyao: { name: '镇妖钵', cost: 160, icon: 'bowu', stun: 1.5, cd: 20, w: 12 },
    zhenqi: { name: '阵旗', cost: 200, icon: 'w_flag', aspd: 0.15, cells: 2, w: 8 }
  };
  VD.TRAP_ORDER = ['bantou', 'huolun', 'duwu', 'zhenyao', 'zhenqi'];

  /* ---- 进化配方（§15.2） ---- */
  var COMMON_K = [1, 1.5, 2, 3, 4], BOSS_K = [1, 1, 2, 2, 3];
  VD.RECIPES = {
    ranged: { mats: { jianyu: 12, fuyi: 4 }, gold: 800 }, tank: { mats: { shanyan: 12, xiongdan: 1 }, gold: 1100 },
    shield: { mats: { dunpian: 8, shanyan: 4 }, gold: 900 }, small: { mats: { yaogu: 25 }, gold: 600 },
    elite: { mats: { niujiao: 6, xiongdan: 2 }, gold: 1500 }, bone: { mats: { gufu: 3, yaogu: 15 }, gold: 1800 },
    bear: { mats: { xiongdan: 4, niujiao: 2 }, gold: 2000 }, yaota: { mats: { fuyi: 8, jianyu: 6, shanyan: 6 }, gold: 1500 }
  };
  // 第 lv 阶（1-5）的花费：{mats:{id:n}, gold}
  VD.evoCost = function (type, lv) {
    var r = VD.RECIPES[type], o = { mats: {}, gold: 0 }; if (!r || lv < 1 || lv > 5) return null;
    Object.keys(r.mats).forEach(function (m) { var k = VD.MATS[m].boss ? BOSS_K[lv - 1] : COMMON_K[lv - 1]; o.mats[m] = Math.round(r.mats[m] * k); });
    o.gold = Math.round(r.gold * COMMON_K[lv - 1]); return o;
  };
  VD.EVO_MAX_TOTAL = [0, 8];                                   // 每洞府进化阶总数上限（按洞府等级）
  VD.EVO_STATD = 0.01;
  VD.EVO_STAT = 0.04;   // 每阶：塔血量 +4%、伤害 +1%（实测：伤害 +8% 时进化满的洞府通关率掉 30–90 个点；+2%血+6% 仍掉20点；伤害对脆皮英雄太敏感，进化主要给血量，保证「满进化比不进化通关率掉 ≤10 点」）
  VD.EVO_BONUS = 0.08;                                         // 每阶：血量 / 伤害 +8%；占预算 +8%

  /* ---- 数值 / 造价 ---- */
  VD.round10 = function (v) { return Math.round(v / 10) * 10; };
  VD.cost1 = function (type) { return T[type].cost; };
  VD.costTier = function (type, tier) { var t = T[type]; return tier <= 1 ? t.cost : tier === 2 ? t.cost + t.up2 : t.cost + t.up2 + t.up3; };
  VD.useCost = function (tw) { return Math.round(VD.costTier(tw.t, tw.tier || 1) * (1 + VD.EVO_BONUS * (tw.evo || 0))); };   // 占预算
  VD.trapCost = function (id) { return VD.TRAPS[id].cost; };
  VD.LAIR_TEAM_LV = 10;                                      // 验关时西游英雄队的起步等级（真实进度约 8–14 级）
  VD.LAIRK = { hp: 1.5, dmg: 0.5 };                            // 洞府塔相对设计稿的整体倍率（V11 按真实英雄强度调：英雄输出很高，塔血要厚）
  VD.stat = function (type, tier, evo) {                    // 塔的战斗数值
    var t = T[type], e = 1 + VD.EVO_STAT * (evo || 0), ed = 1 + VD.EVO_STATD * (evo || 0), ti = Math.max(1, Math.min(3, tier || 1));
    return { hp: t.hp * VD.TIER_HP[ti - 1] * e * VD.LAIRK.hp, dmg: t.dmg * VD.TIER_DMG[ti - 1] * ed * VD.LAIRK.dmg, rng: t.rng + (type === 'ranged' && ti >= 2 ? 40 : 0), gap: t.gap, splash: t.splash || 0 };
  };
  VD.unlocked = function (ser, type) { var d = ser && ser.got || {}; return T[type].unlock === 0 || !!d[type]; };
  VD.toolsLeft = function (doc) { return { used: VD.docCost(doc) }; };
  VD.docCost = function (doc) {
    var n = 0; (doc.towers || []).forEach(function (tw) { n += VD.useCost(tw); }); (doc.traps || []).forEach(function (tr) { n += VD.trapCost(tr.t); }); return n;
  };
  /* 小妖第一次升到 T3 / 进化 → 把「看过」记下（进化页需要 t3Seen） */

  /* ---- 西游线联动奖励（§16.4：只收藏，不影响数值） ---- */
  VD.COS = {
    ranged: { card: '弓妖图鉴', frame: '万箭金框' }, tank: { card: '石怪图鉴', frame: '山岳金框' }, shield: { card: '盾兵图鉴', frame: '镇岳金框' }, small: { card: '小妖图鉴', frame: '万妖金框' },
    elite: { card: '牛卫图鉴', frame: '平天金框' }, bone: { card: '白骨图鉴', frame: '夫人金框' }, bear: { card: '熊精图鉴', frame: '黑风金框' }, yaota: { card: '妖塔图鉴', frame: '镇天金框' }
  };

  VD.COS_ENEMY = { ranged: 'ranged', tank: 'tank', shield: 'shield', small: 'small', elite: 'elite', bone: 'bone', bear: 'bear', yaota: 'etower' };      // 塔种 → 西游线妖怪 id
  /* 写进西游线存档：Ⅲ → data.dex[妖].card = 卡名；Ⅴ → data.cosFrames[塔种] = 框名（只外观） */
  VD.cosJourney = function (type, lv) {
    var d = XY.save.data, eid = VD.COS_ENEMY[type], co = VD.COS[type]; if (!eid || !co) return;
    d.dex = d.dex || {};
    if (lv >= 3) { var e = d.dex[eid] || (d.dex[eid] = { seen: 0, kills: 0 }); e.seen = Math.max(1, e.seen || 0); e.kills = Math.max(1, e.kills || 0); e.card = co.card; }
    if (lv >= 5) { d.cosFrames = d.cosFrames || {}; d.cosFrames[type] = co.frame; }
  };
  /* 头像框外观（只画，不加数值）：朱红+金线圆环 / 四角小印；按塔种配色 */
  VD.FRAME_COLS = {
    ranged: { col: '#c9a24a', ink: '#b8322a', accent: '#f0d78c' }, tank: { col: '#8a7355', ink: '#9a4a28', accent: '#d4c4a0' },
    shield: { col: '#6e8f6a', ink: '#b8322a', accent: '#c9d6b8' }, small: { col: '#a8803a', ink: '#b8322a', accent: '#e8d4a0' },
    elite: { col: '#8a5a2a', ink: '#9a2620', accent: '#e0b878' }, bone: { col: '#9a8a9a', ink: '#6a3a6a', accent: '#e0d0e0' },
    bear: { col: '#5a5048', ink: '#b8322a', accent: '#c8b8a0' }, yaota: { col: '#6a5a8a', ink: '#b8322a', accent: '#d0c4e8' }
  };
  VD.frameStyle = function (name) {
    var t, co, base = { col: '#c9a24a', ink: '#b8322a', accent: '#f0d78c' };
    for (t in VD.COS) { co = VD.COS[t]; if (co && co.frame === name) return Object.assign({ type: t, name: name }, VD.FRAME_COLS[t] || base); }
    return Object.assign({ type: null, name: name || '' }, base);
  };
  /* 已解锁框里按 TOWER_ORDER 取第一个；没有就 null（画面与现在完全一样） */
  VD.activeFrame = function () {
    var fr = (XY.save && XY.save.data && XY.save.data.cosFrames) || {}, order = VD.TOWER_ORDER, i, t, name;
    for (i = 0; i < order.length; i++) { t = order[i]; name = fr[t]; if (name) return Object.assign({ type: t, name: name }, VD.FRAME_COLS[t] || { col: '#c9a24a', ink: '#b8322a', accent: '#f0d78c' }); }
    var ks = Object.keys(fr); if (!ks.length) return null; return VD.frameStyle(fr[ks[0]]);
  };
  /* 圆头像外圈：墨金细环 + 朱红内环 + 四角小印（印角），不要方框 */
  VD.drawFrame = function (c, cx, cy, r, style) {
    if (!c || !style || !(r > 0)) return;
    var col = style.col || '#c9a24a', ink = style.ink || '#b8322a', acc = style.accent || '#f0d78c';
    var R = r + Math.max(2.5, r * 0.1), lw = Math.max(1.3, r * 0.07), k, a, x, y, s, PI2 = Math.PI * 2;
    c.save();
    c.beginPath(); c.arc(cx, cy, R + 1.8, 0, PI2); c.lineWidth = lw; c.strokeStyle = col; c.stroke();
    c.beginPath(); c.arc(cx, cy, R, 0, PI2); c.lineWidth = Math.max(0.9, lw * 0.55); c.strokeStyle = ink; c.globalAlpha = 0.88; c.stroke();
    c.globalAlpha = 1;
    s = Math.max(2.4, r * 0.13);
    for (k = 0; k < 4; k++) {
      a = Math.PI / 4 + k * Math.PI / 2; x = cx + Math.cos(a) * (R + 0.6); y = cy + Math.sin(a) * (R + 0.6);
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = ink; c.strokeStyle = col; c.lineWidth = Math.max(0.8, r * 0.04);
      c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.7, 0); c.lineTo(0, s); c.lineTo(-s * 0.7, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = acc; c.beginPath(); c.arc(0, 0, s * 0.22, 0, PI2); c.fill();
      c.restore();
    }
    c.restore();
    VD._frameDrawn = (VD._frameDrawn || 0) + 1;      // e2e 可数：本帧画了几次框
  };

  /* ---- 一次性新玩法提示（§16.5，每条 ≤ 24 字） ---- */
  VD.TIPS = {
    dungeon: '洞府里有 Boss，打败它就算通关。',
    bossfight: '自动战斗，攒满援军槽时点一下召援军。',
    villain: '这次你是牛魔王：守住洞府血条，金币都变妖金。',
    lair: '画一条路，在路边摆小妖塔，验关通过才能发布。'
  };
  VD.CUT = ['牛魔王：哼，今天算你们走运。', '牛魔王：这口气我咽不下——轮到俺老牛守洞了！'];

  /* ---- 种子随机（可复现：洞府岩石 / 掉落） ---- */
  VD.rng = function (seed) { var s = (seed >>> 0) || 1; return function () { s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 7), 61 | s); t = (t + Math.imul(t ^ (t >>> 15), 1 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---- 存档读写小帮手 ---- */
  VD.ser = function () { var d = XY.save.data; return d.villain.series.niumo; };
  VD.today = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  VD.tipSeen = function (k) { var d = XY.save.data; return !!(d.tips && d.tips.seen && d.tips.seen[k]); };
  VD.tipMark = function (k) { var d = XY.save.data; d.tips.seen[k] = Date.now(); if (XY.save.touch) XY.save.touch(); };
})();
