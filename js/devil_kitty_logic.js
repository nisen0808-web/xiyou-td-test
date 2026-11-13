/* Devil Kitty（特别活动）纯逻辑。
 * 浏览器挂到 window.XY_DEVIL_KITTY；node --test 直接 require。
 * 角色显示名是「猫叔」，X 账号小字「@Cato_KT」。代码 id 仍是 cato / devil_kitty。
 * 活动名 Devil Kitty。变身名牌「猫叔 · 魔化」。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.XY_DEVIL_KITTY = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var ID = 'devil_kitty';
  var NAME = 'Devil Kitty';
  var SUB = '特别活动';
  var HERO = '猫叔';
  var HANDLE = '@Cato_KT';
  var HERO2 = '猫叔 · 魔化';
  var CHAR_ID = 'cato';

  var DELAY = 20;
  var RAGE_DUR = 45;
  var MOB_MUL = 1.5;
  var BOSS_MUL = 2;
  var INTRO_T = 4.2;
  /* 变身视频 12 秒。真正播放时以视频 duration 为准，这里只是还没读到时长时的兜底。 */
  var FORM_T = 12000 / 1000;
  var formDurLive = FORM_T;
  function setFormDuration(sec) {
    if (typeof sec === 'number' && sec >= 0.5 && sec <= 20) formDurLive = sec;
    return formDurLive;
  }
  function formDuration() { return formDurLive; }
  var GEAR_P = 0.4;
  var GEAR_P2 = 0.55;
  var PHASE2 = { hp: 1.6, dmg: 1.4, atk: 1.2 };

  /* 每个特殊角色 1 武器 + 1 道具。数值克制，只对应该角色。画面上画成水墨器物。 */
  var GEAR = [
    { id: 'phyrex_w', owner: 'phyrex', slot: 'weapon', name: '冷钱包短刃', seal: '刃', desc: '贴合「燃烧的 BTC」：法术伤害 +6%。', fx: { dmg: 0.06 } },
    { id: 'phyrex_i', owner: 'phyrex', slot: 'item', name: '币息残页', seal: '息', desc: '贴合「币值暴涨」的余息：每秒回复 +0.4。', fx: { regen: 0.4 } },
    { id: 'sisi_w', owner: 'sisi', slot: 'weapon', name: '守护丝绦', seal: '守', desc: '贴合「在线守护」：受到伤害 −4%。', fx: { dr: 0.04 } },
    { id: 'sisi_i', owner: 'sisi', slot: 'item', name: '防钓香囊', seal: '香', desc: '贴合「防钓鱼盾」：最大生命 +5%。', fx: { hp: 0.05 } },
    { id: 'laosiji_w', owner: 'laosiji', slot: 'weapon', name: '热搜喇叭', seal: '热', desc: '贴合「追热点」：伤害 +5%。', fx: { dmg: 0.05 } },
    { id: 'laosiji_i', owner: 'laosiji', slot: 'item', name: '堵车令', seal: '堵', desc: '贴合「翻译一下」的控场余韵：攻速 +6%。', fx: { atkSpd: 0.06 } },
    { id: 'kuanggong_w', owner: 'kuanggong', slot: 'weapon', name: '矿镐', seal: '镐', desc: '贴合「挖矿」：伤害 +7%。', fx: { dmg: 0.07 } },
    { id: 'kuanggong_i', owner: 'kuanggong', slot: 'item', name: '算力芯片', seal: '算', desc: '贴合「HODL 拿住」：移速 +5%。', fx: { move: 0.05 } },
    { id: 'cato_w', owner: 'cato', slot: 'weapon', name: '逆转框架', seal: '框', desc: '贴合「搭框架」：伤害 +6%。猫叔只作敌方，这件先替他收着。', fx: { dmg: 0.06 } },
    { id: 'cato_i', owner: 'cato', slot: 'item', name: '要素残页', seal: '素', desc: '贴合「五大要素」：攻速 +6%。', fx: { atkSpd: 0.06 } },
    { id: 'haiteng_w', owner: 'haiteng', slot: 'weapon', name: '圈印', seal: '圈', desc: '贴合「安全圈」：受到伤害 −4%。', fx: { dr: 0.04 } },
    { id: 'haiteng_i', owner: 'haiteng', slot: 'item', name: '缩圈令', seal: '缩', desc: '贴合「大逃杀缩圈」：最大生命 +6%。', fx: { hp: 0.06 } },
    { id: 'yuanzhang_w', owner: 'yuanzhang', slot: 'weapon', name: '唤骨铃', seal: '骨', desc: '贴合「唤骨令」：伤害 +5%。', fx: { dmg: 0.05 } },
    { id: 'yuanzhang_i', owner: 'yuanzhang', slot: 'item', name: '鬼门土', seal: '土', desc: '贴合「百鬼夜行」：每秒回复 +0.35。', fx: { regen: 0.35 } },
    { id: 'heyuxi_w', owner: 'heyuxi', slot: 'weapon', name: '墨笔', seal: '墨', desc: '贴合「音波」：伤害 +6%。', fx: { dmg: 0.06 } },
    { id: 'heyuxi_i', owner: 'heyuxi', slot: 'item', name: '润喉茶', seal: '茶', desc: '贴合「新歌上线」：移速 +4%。', fx: { move: 0.04 } },
    { id: 'diaoyulao_w', owner: 'diaoyulao', slot: 'weapon', name: '旧钓竿', seal: '竿', desc: '贴合「甩竿」：攻速 +5%。', fx: { atkSpd: 0.05 } },
    { id: 'diaoyulao_i', owner: 'diaoyulao', slot: 'item', name: '鱼饵瓶', seal: '饵', desc: '贴合「猪脚饭」：伤害 +4%。', fx: { dmg: 0.04 } },
    { id: 'martin_w', owner: 'martin', slot: 'weapon', name: '号角', seal: '号', desc: '贴合「集合队友」：伤害 +6%。', fx: { dmg: 0.06 } },
    { id: 'martin_i', owner: 'martin', slot: 'item', name: '晨帖', seal: '晨', desc: '贴合「GM 早安」：每秒回复 +0.3。', fx: { regen: 0.3 } },
    { id: 'qinba_w', owner: 'qinba', slot: 'weapon', name: '前瞻卷', seal: '前瞻', desc: '贴合「前瞻框架」：伤害 +5%。', fx: { dmg: 0.05 } },
    { id: 'qinba_i', owner: 'qinba', slot: 'item', name: '半场笺', seal: '笺', desc: '贴合「半场开香槟」：攻速 +4%。', fx: { atkSpd: 0.04 } },
    { id: 'traders18_w', owner: 'traders18', slot: 'weapon', name: '缺德符印', seal: '符', desc: '贴合「缺德符」：伤害 +5%。', fx: { dmg: 0.05 } },
    { id: 'traders18_i', owner: 'traders18', slot: 'item', name: '打盹枕', seal: '盹', desc: '贴合「道人打盹」：受到伤害 −3%。', fx: { dr: 0.03 } }
  ];

  var gearById = {};
  GEAR.forEach(function (g) { gearById[g.id] = g; });

  function baseStats(levelId) {
    var lv = Math.max(1, levelId || 1);
    return { hp: 900 + 400 * (lv - 1), dmg: 16 + 5 * (lv - 1), atkEvery: 2.2, skillEvery: 8 };
  }
  function phaseStats(base, phase) {
    base = base || baseStats(1);
    if (phase >= 2) {
      return {
        hp: Math.round(base.hp * PHASE2.hp),
        dmg: Math.round(base.dmg * PHASE2.dmg),
        atkEvery: base.atkEvery / PHASE2.atk,
        skillEvery: 6,
        atkMul: PHASE2.atk
      };
    }
    return { hp: base.hp, dmg: base.dmg, atkEvery: base.atkEvery, skillEvery: base.skillEvery, atkMul: 1 };
  }

  function freshRun() {
    return {
      spawned: false,
      introLeft: 0,
      formLeft: 0,
      hold: false,
      rageOn: false,
      rageLeft: 0,
      rageReset: false,
      unit: null,
      dropped: false,
      drops: null,
      base: null
    };
  }

  /* 默认开。?cato=0 强制关。存档 devilKitty.on === false 时关。不看版本开关。 */
  function enabled(o) {
    o = o || {};
    if (o.query === '0' || o.query === 0) return false;
    if (o.saved === false) return false;
    return true;
  }

  function isMainline(g) {
    if (!g) return false;
    if (g.dungeon || g.villain || g.lair || g.bossfight || g.mod) return false;
    if (g.iframe) return false;
    if (g.lv && typeof g.lv.rest === 'number' && g.lv.rest < 0.05) return false;
    return true;
  }

  function finishForm(run) {
    if (!run || !run.unit) return run;
    var st = phaseStats(run.base, 2);
    run.unit.phase = 2;
    run.unit.maxHp = st.hp;
    run.unit.hp = st.hp;
    run.unit.dmg = st.dmg;
    run.unit.atkEvery = st.atkEvery;
    run.unit.skillEvery = st.skillEvery;
    run.unit.atkMul = st.atkMul;
    run.unit.immune = false;
    run.unit.name = HERO2;
    run.formLeft = 0;
    run.hold = false;
    run.rageOn = true;
    run.rageLeft = RAGE_DUR;
    run.rageReset = true;
    return run;
  }

  function spawnUnit(run, levelId) {
    var base = baseStats(levelId);
    var st = phaseStats(base, 1);
    run.base = base;
    run.unit = {
      phase: 1,
      hp: st.hp,
      maxHp: st.hp,
      dmg: st.dmg,
      atkEvery: st.atkEvery,
      skillEvery: st.skillEvery,
      atkMul: 1,
      atkT: st.atkEvery,
      skillT: st.skillEvery,
      immune: false,
      dead: false,
      burstUsed: false,
      name: HERO,
      handle: HANDLE
    };
    run.rageOn = true;
    run.rageLeft = RAGE_DUR;
    run.introLeft = 0;
    run.hold = false;
    return run;
  }

  function tickRun(run, ctx, dt) {
    var ev = [];
    ctx = ctx || {};
    dt = dt || 0;
    if (!run) run = freshRun();
    if (run.formLeft > 0) {
      run.formLeft = Math.max(0, run.formLeft - dt);
      run.hold = true;
      if (run.formLeft === 0) { finishForm(run); ev.push('formed'); }
      return { run: run, events: ev };
    }
    if (run.introLeft > 0) {
      run.introLeft = Math.max(0, run.introLeft - dt);
      run.hold = true;
      if (run.introLeft === 0) { spawnUnit(run, ctx.levelId); ev.push('spawn'); }
      return { run: run, events: ev };
    }
    run.hold = false;
    if (!run.spawned && ctx.enabled && ctx.mainline && ctx.phase === 'rest' && (ctx.restT || 0) >= DELAY) {
      run.spawned = true;
      run.introLeft = INTRO_T;
      run.hold = true;
      ev.push('intro');
      return { run: run, events: ev };
    }
    if (run.rageLeft > 0) {
      run.rageLeft = Math.max(0, run.rageLeft - dt);
      if (run.rageLeft === 0) { run.rageOn = false; ev.push('rageEnd'); }
    }
    if (run.unit && !run.unit.dead) {
      run.unit.atkT -= dt;
      if (run.unit.atkT <= 0) { run.unit.atkT = run.unit.atkEvery; ev.push('attack'); }
      run.unit.skillT -= dt;
      if (run.unit.skillT <= 0) { run.unit.skillT = run.unit.skillEvery; ev.push('skill'); }
    }
    return { run: run, events: ev };
  }

  function skipForm(run) {
    if (!run || run.formLeft <= 0) return run;
    return finishForm(run);
  }
  function skipIntro(run, levelId) {
    if (!run || run.introLeft <= 0) return run;
    run.spawned = true;
    spawnUnit(run, levelId);
    return run;
  }

  function hurtUnit(run, dmg) {
    if (!run || !run.unit || run.unit.dead) return { ok: false };
    if (run.formLeft > 0 || run.introLeft > 0 || run.unit.immune) return { ok: false, immune: true };
    run.unit.hp -= dmg;
    if (run.unit.hp > 0) return { ok: true, hp: run.unit.hp };
    if (run.unit.phase < 2) {
      run.unit.hp = 1;
      run.unit.immune = true;
      run.formLeft = run.formDur || formDurLive;
      run.hold = true;
      return { ok: true, formed: true, drop: null };
    }
    run.unit.hp = 0;
    run.unit.dead = true;
    return { ok: true, defeated: true };
  }

  function rageMul(run) {
    if (!run || !run.rageOn) return { mob: 1, boss: 1, left: 0, on: false };
    return { mob: MOB_MUL, boss: BOSS_MUL, left: run.rageLeft, on: true };
  }

  function applyMobRage(e) {
    if (!e || e._dkRage) return e;
    e._dkBase = { speed: e.speed, dmg: e.dmg, atk: e.atkEvery || 0.8 };
    e.speed = e._dkBase.speed * MOB_MUL;
    e.dmg = e._dkBase.dmg * MOB_MUL;
    e.atkEvery = e._dkBase.atk / MOB_MUL;
    e._dkRage = true;
    e.catoRageMark = true;
    return e;
  }
  function clearMobRage(e) {
    if (!e || !e._dkRage || !e._dkBase) return e;
    e.speed = e._dkBase.speed;
    e.dmg = e._dkBase.dmg;
    e.atkEvery = e._dkBase.atk;
    e._dkRage = false;
    e.catoRageMark = false;
    return e;
  }
  function shouldEnrageBoss(e) {
    return !!(e && !e.dead && !e.enraged && (e.def && (e.def.denBoss || e.def.boss)));
  }

  /* 隐藏角色在玩家真正拿到卡之前，不进名单、不进掉落。owned 为真才算已经获得。 */
  function heroRevealed(id, hidden, owned) {
    if (!id) return false;
    if (hidden) return !!owned;
    return true;
  }
  function rollDrops(rng, phase, pool, gears) {
    rng = rng || Math.random;
    pool = pool && pool.length ? pool : ['phyrex'];
    var card = pool[Math.floor(rng() * pool.length)];
    var p = phase >= 2 ? GEAR_P2 : GEAR_P;
    var gear = null;
    if (gears && gears.length && rng() < p) gear = gears[Math.floor(rng() * gears.length)];
    return { card: card, gear: gear, p: p };
  }
  function onDefeat(run, rng, pool, gears) {
    if (!run || !run.unit || run.unit.phase < 2 || !run.unit.dead || run.dropped) return null;
    run.dropped = true;
    run.drops = rollDrops(rng, 2, pool, gears);
    return run.drops;
  }

  function emptyGear() {
    return { v: 1, bag: {}, equip: {} };
  }
  function readGear(data) {
    var src = data && data.spGear;
    var g = emptyGear();
    if (!src || typeof src !== 'object') return g;
    if (src.bag && typeof src.bag === 'object') {
      Object.keys(src.bag).forEach(function (id) {
        if (gearById[id] && (src.bag[id] | 0) > 0) g.bag[id] = src.bag[id] | 0;
      });
    }
    if (src.equip && typeof src.equip === 'object') {
      Object.keys(src.equip).forEach(function (hero) {
        var row = src.equip[hero];
        if (!row || typeof row !== 'object') return;
        var out = { weapon: null, item: null };
        ['weapon', 'item'].forEach(function (slot) {
          var id = row[slot];
          if (id && gearById[id] && gearById[id].owner === hero && gearById[id].slot === slot) out[slot] = id;
        });
        if (out.weapon || out.item) g.equip[hero] = out;
      });
    }
    return g;
  }
  function writeGear(data, gear) {
    data.spGear = {
      v: 1,
      bag: gear.bag || {},
      equip: gear.equip || {}
    };
    return data.spGear;
  }
  function slotRow(gear, heroId) {
    if (!gear.equip[heroId]) gear.equip[heroId] = { weapon: null, item: null };
    return gear.equip[heroId];
  }
  function grantGear(gear, gearId, n) {
    if (!gearById[gearId]) return gear;
    gear.bag[gearId] = (gear.bag[gearId] || 0) + (n || 1);
    return gear;
  }
  function equipGear(gear, heroId, gearId) {
    var g = gearById[gearId];
    if (!g) return { ok: false, reason: '没有这件装备' };
    if (g.owner !== heroId) return { ok: false, reason: '只能装给对应的角色' };
    var row = slotRow(gear, heroId);
    var cur = row[g.slot];
    if ((gear.bag[gearId] || 0) < 1 && cur !== gearId) return { ok: false, reason: '行囊里没有这件' };
    if (cur && cur !== gearId) gear.bag[cur] = (gear.bag[cur] || 0) + 1;
    if (cur !== gearId) gear.bag[gearId] = (gear.bag[gearId] || 0) - 1;
    if (gear.bag[gearId] <= 0) delete gear.bag[gearId];
    row[g.slot] = gearId;
    return { ok: true, reason: '已装上「' + g.name + '」' };
  }
  function unequipGear(gear, heroId, slot) {
    var row = gear.equip[heroId];
    if (!row || !row[slot]) return { ok: false, reason: '这个槽是空的' };
    var id = row[slot];
    gear.bag[id] = (gear.bag[id] || 0) + 1;
    row[slot] = null;
    return { ok: true, reason: '已卸下' };
  }
  function effectsOf(gear, heroId) {
    var fx = { dmg: 0, atkSpd: 0, move: 0, hp: 0, dr: 0, regen: 0 };
    var row = gear && gear.equip && gear.equip[heroId];
    if (!row) return fx;
    ['weapon', 'item'].forEach(function (slot) {
      var g = row[slot] && gearById[row[slot]];
      if (!g || g.owner !== heroId) return;
      Object.keys(g.fx).forEach(function (k) { fx[k] = (fx[k] || 0) + g.fx[k]; });
    });
    return fx;
  }
  function applyEffects(hero, fx) {
    if (!hero || !fx) return hero;
    hero.dmgMul = (hero.dmgMul || 1) * (1 + (fx.dmg || 0));
    hero.speed = (hero.speed || 0) * (1 + (fx.move || 0));
    if (fx.hp) {
      hero.maxHp = Math.round((hero.maxHp || hero.hp || 1) * (1 + fx.hp));
      hero.hp = Math.min(hero.maxHp, Math.round((hero.hp || hero.maxHp) * (1 + fx.hp)));
    }
    hero.mod = hero.mod || {};
    if (fx.atkSpd) hero.mod.atkSpd = (hero.mod.atkSpd || 1) / (1 + fx.atkSpd);
    if (fx.dr) hero.mod.dr = (hero.mod.dr == null ? 1 : hero.mod.dr) * (1 - fx.dr);
    if (fx.regen) hero.mod.regen = (hero.mod.regen || 0) + fx.regen;
    hero._dkGear = true;
    return hero;
  }

  function freshSession() { return { auto: { start: false, levels: false } }; }
  function tutorialBlocks(ctx) {
    ctx = ctx || {};
    if (ctx.inTutorial) return true;
    if (ctx.tutorialDone !== true) return true;
    return false;
  }
  function shouldAuto(session, screen, ctx) {
    if (screen !== 'start' && screen !== 'levels') return false;
    if (!session || !session.auto) return false;
    if (session.auto[screen]) return false;
    if (tutorialBlocks(ctx)) return false;
    return true;
  }
  function markAuto(session, screen) {
    if (!session.auto) session.auto = {};
    session.auto[screen] = true;
    return session;
  }
  function gachaClaimed(save) {
    var g = save && save.gacha10;
    return !!(g && g.pulls && g.pulls.length === 10);
  }
  function requestDraw(save, ensure) {
    if (gachaClaimed(save)) return { ok: false, reason: '已领取', claimed: true };
    var pack = ensure();
    return { ok: true, reason: '去抽卡', claimed: false, pack: pack };
  }

  function sum(ds) {
    var t = 0, i;
    for (i = 0; i < ds.length; i++) t += ds[i];
    return t;
  }
  function sequence(clip) {
    var d = clip.durationsMs || [], n = d.length, seq = [], i;
    if (clip.loopPolicy === 'pingpong' && !clip.baked && n > 1) {
      for (i = 0; i < n; i++) seq.push(i);
      for (i = n - 2; i > 0; i--) seq.push(i);
    } else {
      for (i = 0; i < n; i++) seq.push(i);
    }
    return seq;
  }
  function frameAt(clip, tMs) {
    if (!clip) return { index: 0, done: true, total: 0 };
    var seq = sequence(clip), durs = clip.durationsMs || [], spans = [], total = 0, i, acc, t;
    for (i = 0; i < seq.length; i++) { spans.push(durs[seq[i]] || 0); total += durs[seq[i]] || 0; }
    if (!seq.length || total <= 0) return { index: 0, done: true, total: 0 };
    var oneshot = clip.loopPolicy === 'oneshot';
    if (oneshot && tMs >= total) return { index: seq[seq.length - 1], done: true, total: total };
    t = oneshot ? Math.max(0, tMs) : ((tMs % total) + total) % total;
    acc = 0;
    for (i = 0; i < seq.length; i++) {
      acc += spans[i];
      if (t < acc) return { index: seq[i], done: false, total: total };
    }
    return { index: seq[seq.length - 1], done: !!oneshot, total: total };
  }
  function clipOf(doc, name) {
    if (!doc) return null;
    var box = doc.clips || (doc.ids && doc.ids.cato_evil) || null;
    if (doc.ids && doc.ids.cato) box = doc.ids.cato;
    if (!box && doc.idle) box = doc;
    return box && box[name] ? box[name] : null;
  }
  function stepAnim(state, dtMs, edge, attackClip, hitEdge, hitClip) {
    if (!state) state = { mode: 'idle', t: 0 };
    if (hitEdge && hitClip) return { mode: 'hit', t: 0 };
    if (edge && attackClip && state.mode !== 'attack') return { mode: 'attack', t: 0 };
    if (state.mode === 'hit' && hitClip) {
      var ht = state.t + (dtMs || 0);
      if (ht >= sum(hitClip.durationsMs)) return { mode: 'idle', t: 0 };
      return { mode: 'hit', t: ht };
    }
    if (state.mode === 'attack' && attackClip) {
      var at = state.t + (dtMs || 0);
      if (at >= sum(attackClip.durationsMs)) return { mode: 'idle', t: 0 };
      return { mode: 'attack', t: at };
    }
    return { mode: 'idle', t: (state.mode === 'idle' ? state.t : 0) + (dtMs || 0) };
  }

  return {
    ID: ID, NAME: NAME, SUB: SUB, HERO: HERO, HANDLE: HANDLE, HERO2: HERO2, CHAR_ID: CHAR_ID,
    DELAY: DELAY, RAGE_DUR: RAGE_DUR, MOB_MUL: MOB_MUL, BOSS_MUL: BOSS_MUL,
    INTRO_T: INTRO_T, FORM_T: FORM_T, setFormDuration: setFormDuration, formDuration: formDuration,
    GEAR_P: GEAR_P, GEAR_P2: GEAR_P2, PHASE2: PHASE2,
    GEAR: GEAR, gearById: gearById,
    baseStats: baseStats, phaseStats: phaseStats, freshRun: freshRun,
    enabled: enabled, isMainline: isMainline, tickRun: tickRun,
    skipForm: skipForm, skipIntro: skipIntro, finishForm: finishForm, spawnUnit: spawnUnit,
    hurtUnit: hurtUnit, rageMul: rageMul, applyMobRage: applyMobRage, clearMobRage: clearMobRage,
    shouldEnrageBoss: shouldEnrageBoss, heroRevealed: heroRevealed, rollDrops: rollDrops, onDefeat: onDefeat,
    emptyGear: emptyGear, readGear: readGear, writeGear: writeGear, grantGear: grantGear,
    equipGear: equipGear, unequipGear: unequipGear, effectsOf: effectsOf, applyEffects: applyEffects,
    freshSession: freshSession, tutorialBlocks: tutorialBlocks, shouldAuto: shouldAuto, markAuto: markAuto,
    gachaClaimed: gachaClaimed, requestDraw: requestDraw,
    frameAt: frameAt, clipOf: clipOf, stepAnim: stepAnim, sum: sum
  };
});
