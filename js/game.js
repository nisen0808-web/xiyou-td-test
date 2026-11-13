/* ============================================================
 * game.js —— 游戏逻辑（不碰画面，只管数据和规则）
 *   newGame()        新开一局
 *   step(G, dt)      推进一个固定步长
 *   其余导出函数供 main.js（输入）和 render.js（画面）使用
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  var rand = XY.rand, clamp = XY.clamp, PI2 = Math.PI * 2;
  var cos = Math.cos, sin = Math.sin, atan2 = Math.atan2, sqrt = Math.sqrt, exp = Math.exp;

  /* ================= 新开一局 ================= */
  function mkTower(type, x, y) { return mkTowerObj(type, x, y); }
  XY.makeTower = function (type, x, y) { return mkTowerObj(type, x, y); };
  XY.newGame = function (levelId, opts) {
    var LV = opts && opts.villain ? XY.villainLevel() : opts && opts.lair ? XY.lairLevel(opts.lair.doc) : opts && opts.mod ? XY.mod.level(opts.mod) : opts && opts.dungeon ? XY.dungeonLevel(opts.dungeon) : XY.levelOf(levelId || 1), RT = XY.routeBuild(LV), cx = RT.pts[0].x, cy = RT.pts[0].y, RP = XY.routeAt(RT, RT.restS);
    var G = {
      mode: 'play',            // play / skills（技能树打开，游戏暂停）（外层 main 另有 start/pause/win/lose）
      t: 0, kills: 0, coins: C.START_COINS,
      levelId: LV.id, lv: LV, dungeon: LV.dungeon ? XY.dungeonOf(LV.dungeon) : null, mod: LV.mod ? { id: LV.mod, title: LV.name, author: opts.mod.author || '' } : null, noJourney: !!(LV.dungeon || LV.mod || LV.villain || LV.lair), noSpecial: !!(opts && opts.villain), villain: opts && opts.villain ? { n: 0 } : null,   // v0.8.4 洞府副本：不继承 / 不写取经之旅
      level: 1, xp: 0, points: 0, pointsTotal: 0, autoPoints: !!(XY.auto && XY.auto.get('points')), autoIdx: 0, lvFlash: 0,
      station: false, tangWarn: 0, threat: null, pthreat: null, breach: false, tdanger: false, breachT: 0,
      ctrl: 1,                 // 当前操控的英雄编号，默认悟空
      input: { mx: 0, my: 0 },
      view: { w: 1280, h: 720 },
      cam: { x: cx, y: cy }, shake: 0,
      heroes: [], enemies: [], gems: [], coinDrops: [], projs: [], eprojs: [],
      towers: [], zones: [], fx: [], texts: [], parts: [], allies: [],
      camp: { x: RP.x, y: RP.y, r: 58, hp: C.CAMP_HP, maxHp: C.CAMP_HP, hurtT: 0, active: false },   // v0.5：营地 = 路上唯一的休息点，只在休息阶段生效
      rt: RT, tang: { phase: LV.dungeon ? 'walk2' : 'walk', s: 0, speed: RT.total / LV.walkSec, restT: 0, restMax: C.REST_T, rests: 0 },
      upg: {},                 // 全队页技能 id -> 等级
      P: null,                 // 全队属性（由 upg 推出）
      grid: new XY.Grid(C.WORLD_W, C.WORLD_H, 80),
      noSpawn: false, nextId: 1, eventIdx: 0, events: null,
      banner: null, toast: null, boss: null,
      ending: null, campAlert: 0, godMode: false, speed: 1,
      spawnMul: 1, volDir: 0, carry: null, dens: [], denCnt: [],
      sky: { cd: 0, uses: 0, left: C.SKY_ONCE }, run: { lingshi: 0, shards: 0 }, questPop: null,
      gate: { x: LV.gate.x, y: LV.gate.y, r: C.GATE_R, name: LV.gate.name, sealed: true, hintT: 0, openT: 0, near: false },
      stats: { maxEnemies: 0, deaths: 0, dealt: [0, 0, 0, 0, 0, 0], etKilled: 0, denKills: 0, discDeaths: 0, stationSec: 0, campLow: false, tower3: false, maxVol: 1, etBuilt: 0, towersLost: 0 }
    };
    G.P = {};
    if (G.dungeon) G.coins = 180;
    if (G.villain) { var _dk = XY.save.data.deck; XY.save.data.deck = []; XY.cards.initRun(G); XY.save.data.deck = _dk; G.fb = null; G.cm = {}; }   // v0.9 反派关：不带法宝 / 卡组
    else XY.cards.initRun(G);                 // 读卡组（局外组牌 → 开局效果）
    function mkHero(i, def, a, order) {
      var h = {
        i: i, id: def.id, def: def, sp: !!def.special,
        x: cx + cos(a) * 90, y: cy + 150 + sin(a) * 60,
        hp: def.hp, maxHp: def.hp, down: false, inv: 0, order: order, sk: {}, mod: null, ultCd: 0, atkT: rand(0, 0.5), atkMax: 1,
        face: 0, wlv: 1, dmgMul: 1, crit: 0, dr: def.id === 'wujing' ? 0.15 : 0, tgt: null, retreat: false, rtT: 0,
        atkSpd: 1, hurtT: 0, contactT: 0, orbit: rand(0, 6), pend: [], dash: null, auraT: 0, regenAcc: 0,
        moving: false, auraHeal: 3, bob: rand(0, 6),
        scd: {}, traitCd: 0, taunt: 0, boostT: 0, pulseT: 0, beadOn: 3.5, beadRest: 0, dr2: 0, spT: 0, ringT: 0, shieldT: 0
      };
      G.heroes.push(h);
      if (def.id === 'tang') h.inv = C.TANG_START_INV;
      return h;
    }
    if (G.villain) { mkHero(0, XY.heroDef(0), 0, 'walk'); mkHero(1, XY.villain.heroDef(), 0.3, 'guard'); }     // v0.9 反派关：只有牛魔王（唐僧是看不见的洞府阵眼）
    else XY.HEROES.forEach(function (base, i) { mkHero(i, XY.heroDef(i), i / 5 * PI2, base.id === 'tang' ? 'walk' : 'guard'); });   // 唐僧自己向西走（不接受任何命令）；徒弟默认守护师父
    var spId = XY.save.carryId();                       // 常驻特殊角色：本关选的那一位，作为第 6 个队员（默认守护）
    if (spId && !G.noSpecial) { mkHero(5, XY.specialDef(spId), 0.5, 'guard'); G.special = spId; }
    G.ctrl = G.heroes[5] ? 5 : 1;                      // 开局默认手动操控：选了特殊角色就是它，没选就是孙悟空（其余人照旧守护师父）
    G.heroes[0].x = cx; G.heroes[0].y = cy;
    if (XY.journey && !G.noJourney) XY.journey.apply(G);      // 取经之旅：继承上一关的等级 / 技能 / 法宝
    recalcParty(G);
    G.camp.hp = G.camp.maxHp;
    G.heroes.forEach(function (h) { recalcHero(G, h, true); });
    if (G.inherit) { XY.journey.afterApply(G); recalcParty(G); G.camp.hp = G.camp.maxHp; G.heroes.forEach(function (h) { recalcHero(G, h, true); }); }
    if (!G.villain) XY.cards.applyStart(G);              // 卡组里的一次性开局效果（金币、师父护体）
    // v0.5：开局自带两名弓天兵，跟在唐僧身后
    if (!G.villain) XY.initSoldiers(G);
    if (G.villain) XY.villain.init(G);
    var tutd = XY.save.data && XY.save.data.tutorial;
    G.tut = null;
    var tutFull = XY.tutForce || !tutd || tutd.done !== true;
    var tutGrow = !XY.tutForce && !!tutd && tutd.done === true && tutd.grow !== true;
    if (!window.XY_NO_TUTORIAL && !G.villain && !G.lair && XY.tutStart && (tutFull || tutGrow)) XY.tutStart(G, { growOnly: tutGrow });     // 新档走完整教程；旧档只补修行引导。反派 / 验关不插入
    XY.tutForce = false;
    // 洞府 + 洞府 BOSS（BOSS 一开局就站在洞口）
    LV.dens.forEach(function (dd, i) {
      var den = { i: i, id: dd.id, elem: XY.ENEMIES[dd.boss].elem, name: dd.name, bossType: dd.boss, bossName: XY.ENEMIES[dd.boss].name, x: dd.x, y: dd.y, r: 64, alive: true, boss: null,
        acc: rand(0, 0.8), swarmT: C.DEN_SWARM_EVERY * (0.5 + 0.15 * i), eliteT: C.DEN_ELITE_EVERY * (0.6 + 0.1 * i), towerT: C.ETOWER_FIRST + 6 * i, towers: 0, deadT: 0, rate: LV.rate, cnt: 0, beaten: false, closedT: 0, defeats: 0, raidT: (LV.raidFirst || C.RAID_FIRST) + 30 * i, raids: 0 };
      G.dens.push(den); G.denCnt.push(0);
      var b = makeEnemy(G, dd.boss, dd.x, dd.y - 8, i);
      b.home = { x: dd.x, y: dd.y - 8 }; den.boss = b;
    });
    if (opts && opts.lair && XY.lairInit) XY.lairInit(G, opts.lair);                // v0.9 洞府验关：洞府 BOSS 建好后再摆塔 / 陷阱
    if (LV.alt && !G.dungeon) { G.rtN = RT; G.rtS = XY.routeBuildAlt(LV, RT); G.routeChoice = null; G.routeAuto = false; }   // v0.8.4 分岔路线：G.rt = 当前生效的那条
    XY.quests.init(G);
    G.events = buildEvents();
    if (LV.lair) banner(G, '验关中：西游英雄会自己闯，你什么都不用按', 5); else
    banner(G, (LV.mod ? '非官方玩法包「' : LV.dungeon ? '洞府副本「' : '第 ' + LV.id + ' 关「') + LV.name + '」：' + LV.main.text, 5);
    return G;
  };

  /* ---------- 事件表：现在只剩宝箱（敌人全部来自洞府） ---------- */
  function buildEvents() {
    var ev = [];
    C.CHEST_TIMES.forEach(function (t) { ev.push({ t: t, kind: 'chest' }); });
    ev.sort(function (a, b) { return a.t - b.t; });
    return ev;
  }

  /* ================= 属性计算 ================= */
  function lv(G, id) { return G.upg[id] || 0; }

  // 全队属性：由升级卡等级推出
  function recalcParty(G) {
    var P = G.P;
    P.dmg = 1 + 0.12 * lv(G, 'p_dmg');
    P.spd = 1 + 0.10 * lv(G, 'p_spd');
    P.move = 1 + 0.08 * lv(G, 'p_move');
    P.hpMul = 1 + 0.15 * lv(G, 'p_hp');
    var pu = 0; G.heroes.forEach(function (h) { if (h && h.mod && h.mod.pickUp && !h.down) pu += h.mod.pickUp; });   // 经济节点：拾取范围（各人叠加）
    P.pick = C.PICK_R * (1 + 0.35 * lv(G, 'p_pick') + pu);
    P.coin = 1;
    P.regen = 0.6 * lv(G, 'p_regen');
    P.ultMul = Math.pow(0.88, lv(G, 'p_ult'));
    P.xp = 1 + 0.12 * lv(G, 'p_xp');
    P.tower = 1 + 0.25 * lv(G, 'p_tower');
    G.camp.maxHp = C.CAMP_HP + 300 * lv(G, 'p_camp');
    // 法宝（卡组 + 局内捡到的 + 羁绊）：全队加成。唐僧的血量 / 减伤不吃这些（recalcHero 里强制 1 点血）
    var cm = G.cm || {};
    P.dmg += cm.dmg || 0; P.spd += cm.spd || 0; P.move += cm.move || 0; P.hpMul += cm.hp || 0;
    P.pick *= 1 + (cm.pick || 0); P.coin += cm.coin || 0; P.regen += cm.regen || 0;
    P.ultMul *= 1 - Math.min(0.5, cm.ultCd || 0); P.xp += cm.xp || 0; P.tower += cm.tower || 0;
    G.camp.maxHp += cm.camp || 0;
    P.dr = Math.min(0.4, cm.dr || 0); P.crit = cm.crit || 0; P.boss = cm.boss || 0; P.luck = cm.luck || 0;
    if (G.camp.hp > G.camp.maxHp) G.camp.hp = G.camp.maxHp;
    P.sky = lv(G, 'p_sky');
  }

  // 单个英雄属性：基础 + 技能树 + 全队
  function recalcHero(G, h, init) {
    var P = G.P, d = h.def, old = h.maxHp;
    var m = h.mod = XY.computeMods(h);           // 同时算出 h.wlv（主技能等级）
    h.maxHp = Math.round((d.hp * P.hpMul + m.hpAdd) * (h.id === 'phyrex' && h.xf > 0 ? C.PH_XF_MUL : 1));      // 变身 ×10 在这里先乘好，下面的“当前血量不超上限”才不会把变身中的血量砍回十分之一
    if (init) h.hp = h.maxHp; else if (!h.down) h.hp = Math.min(h.maxHp, h.hp + Math.max(0, h.maxHp - old));
    h.dmgMul = (d.dmgMul || 1) * (m.dmg || 1);
    h.crit = m.crit + P.crit;
    h.dr = Math.min(0.75, (d.id === 'wujing' ? 0.15 : 0) + m.dr + P.dr);
    h.atkSpd = m.atkSpd;
    h.pdef = Math.min(0.8, Math.max(0, (d.pdef || 0) + (m.pdef || 0))); h.mdef = Math.min(0.8, Math.max(0, (d.mdef || 0) + (m.mdef || 0)));
    h.auraHeal = (6 + 1.5 * (h.wlv - 1) + (h.wlv >= 5 ? 4 : 0)) * m.auraMul;
    h.speed = d.speed * P.move * m.move;
    if (d.id === 'tang') { h.maxHp = 1; if (!h.down) h.hp = 1; h.dr = 0; }   // 唐僧永远只有 1 点血：不吃任何生命加成 / 减伤 / 回血
    if (XY.phyrexMods) XY.phyrexMods(G, h);        // Phyrex 变身 ×10（只对他）
  }
  // 技能树学习后的即时效果（skills.js 调用）
  // 法宝变化后重算全队 + 每个英雄
  XY.recalcHeroOne = recalcHero;
  XY.recalcAll = function (G) { recalcParty(G); G.heroes.forEach(function (x) { recalcHero(G, x); }); };
  XY.onHeroLearn = function (G, h, id) { recalcHero(G, h); ring(G, h.x, h.y, 44, h.def.color, 0.4, true); };
  XY.onPartyLearn = function (G, id) {
    G.upg[id] = (G.upg[id] || 0) + 1;
    recalcParty(G);
    G.heroes.forEach(function (x) { recalcHero(G, x); });
    if (id === 'p_hp') G.heroes.forEach(function (x) { healHero(G, x, x.maxHp * 0.15, false); });
    if (id === 'p_camp') G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + 300);
  };
  // 大招冷却（算上全队法力和英雄自己的技能）
  XY.ultCdOf = function (G, h) { return h.def.ultCd * G.P.ultMul * h.mod.ultCd; };

  /* ================= 提示 / 飘字 / 特效 ================= */
  // v0.7.0l 通知队列：banner / toast 统一进一条队列，同一时刻最多显示 1 条。G.banner / G.toast 仍然是“当前显示的这一条”的镜像（旧代码和测试照常读），
  // 队列长度 ≤ 3（超出丢最旧的低优先级），同文案去重，高优先级插队（当前这条 0.3 秒内淡出让位），全文进 G.noteLog（最近 50 条），显示只用短句。
  var NOTE_MAXQ = 3;
  function noteShort(s) {
    s = String(s); if (s.length <= 20) return s;
    var m = s.search(/[（(]|[，,；;]\s|　|—— /); if (m >= 8) s = s.slice(0, m); 
    return s.length > 26 ? s.slice(0, 25) + '…' : s;
  }
  XY.noteShort = noteShort;
  function notify(G, text, o) {
    o = o || {}; text = String(text);
    var lv = o.level != null ? o.level : (/狂暴了|10 秒后狂暴|闯入|闯进|失败|被攻破/.test(text) ? 2 : (o.kind === 'banner' ? 1 : 0));
    var ttl = o.ttl || Math.min(3.5, Math.max(2, 1.8 + noteShort(text).length * 0.05)), i;
    var log = G.noteLog || (G.noteLog = []); log.push({ t: G.t, text: text }); if (log.length > 50) log.shift();
    var cur = G.note || G.banner || G.toast;
    if (cur && cur.text === text) { if (cur.max != null) { cur.t = Math.max(cur.t, Math.min(cur.max, ttl)); } return; }
    var q = G.noteQ || (G.noteQ = []);
    for (i = 0; i < q.length; i++) if (q[i].text === text) { q[i].lv = Math.max(q[i].lv, lv); return; }
    var n = { text: text, short: noteShort(text), lv: lv, kind: o.kind || 'toast', t: ttl, max: ttl };
    var at = q.length; for (i = 0; i < q.length; i++) if (q[i].lv < lv) { at = i; break; }
    q.splice(at, 0, n);
    if (q.length > NOTE_MAXQ) { var di = -1, dl = 9; for (i = q.length - 1; i >= 0; i--) if (q[i].lv < dl) { dl = q[i].lv; di = i; } if (di >= 0) q.splice(di, 1); }   // 丢掉优先级最低、最靠后的
    if (cur && cur.max != null && lv > (cur.lv != null ? cur.lv : 0) && cur.t > 0.3) cur.t = 0.3;
  }
  XY.notify = notify;
  XY.noteSeen = function (G, re) { var l = G.noteLog || [], i; for (i = l.length - 1; i >= 0 && i >= l.length - 12; i--) if (re.test(l[i].text)) return l[i].text; return ''; };   // 测试 / 调试：最近 12 条里有没有匹配的通知（当前屏上只有 1 条，别的在排队）
  XY.notesText = function (G) { return (G.noteLog || []).slice(-8).map(function (n) { return n.text; }).join(' | '); };
  /* v0.8.0：未用技能点提示走顶部通知条（和“白龙马：龙吟万里！”同一位置、同一条队列）：拿到点数后提示一次；一直没用就每 50 秒轻提示一次，不叠加不闪烁 */
  function skillHint(G) {
    if (!(G.points > 0) || G.mode !== 'play') return;
    var tch = XY.app && XY.app.touchUI;
    G.skillHintLast = G.t;
    notify(G, '有 ' + G.points + ' 个技能点可以用（' + (tch ? (XY.compactHud&&XY.compactHud.on(G,XY.app)?'点顶部等级经验':'点右上角菜单') : 'Tab 修行') + '）', { kind: 'toast', level: 0 });
  }
  function noteStep(G, dt) {
    if (G.points > 0 && G.skillHintLast != null && G.t - G.skillHintLast > 50) skillHint(G);
    var a = G.note;
    if (a) { if ((a.t -= dt) <= 0) { G.note = null; G.banner = null; G.toast = null; } }
    else if (G.banner) { if ((G.banner.t -= dt) <= 0) G.banner = null; }
    else if (G.toast) { if ((G.toast.t -= dt) <= 0) G.toast = null; }
    if (!G.note && !G.banner && !G.toast && G.noteQ && G.noteQ.length) {
      a = G.noteQ.shift(); G.note = a; if (a.kind === 'banner') G.banner = a; else G.toast = a;
    }
  }
  XY.noteStep = noteStep;
  function banner(G, text, t) { notify(G, text, { kind: 'banner', ttl: t ? Math.min(3.5, Math.max(2, t)) : undefined }); }
  function toast(G, text) { notify(G, text, { kind: 'toast' }); }
  XY.toast = toast;
  XY.banner = banner;

  function text(G, x, y, s, kind, color) {
    var T = G.texts;
    if (G.td && G.td.quiet > G.td.clock && kind === 'big') return;
    if (G.td && G.td.quiet > G.td.clock && (kind === 'dmg' || kind === 'crit' || kind === 'weak')) color = '#2a241c';
    if (kind === 'dmg' || kind === 'weak' || kind === 'resist') {                  // v0.5：同一处 100ms 内的伤害数字合并，高密度时不满屏
      for (var mi = T.length - 1; mi >= 0 && mi >= T.length - 14; mi--) {
        var mt = T[mi];
        var box = 78; if ((mt.kind === 'dmg' || mt.kind === 'crit' || mt.kind === 'weak') && mt.t < 0.45 && Math.abs(mt.x - x) < box && Math.abs(mt.y - y) < box && +mt.s > 0 && +s > 0) { mt.s = String(+mt.s + (+s)); mt.size = 13; G.stats.textMerged = (G.stats.textMerged || 0) + 1; return; }
      }
    }
    var dmgN = 0, di; for (di = 0; di < T.length; di++) if (T[di].kind === 'dmg' || T[di].kind === 'crit' || T[di].kind === 'weak') dmgN++;
    if ((kind === 'dmg' || kind === 'crit' || kind === 'weak') && dmgN > 20) return;
    if (T.length > 36) return;
    var o = { x: x, y: y, vy: -36, t: 0, max: 0.65, s: String(s), kind: kind, size: 14, color: color || null };
    var nv = +s;                                                        // v0.4.1 打击感：数字越大字越大，暴击放大弹出
    if (kind === 'dmg' || kind === 'weak' || kind === 'crit') o.size = 13;
    if (kind === 'crit') { o.size = 15; o.max = 0.75; o.vy = -42; o.pop = false; o.s = String(s); }
    else if (kind === 'hurt') { o.size = 17; o.max = 0.9; }
    else if (kind === 'heal') { o.size = 15; o.max = 0.9; }
    else if (kind === 'coin') { o.size = 14; o.max = 0.8; }
    else if (kind === 'big') { o.size = 24; o.max = 1.1; }
    else if (kind === 'weak') { o.size = 19; o.max = 0.9; }
    else if (kind === 'resist') { o.size = 12; o.max = 0.7; }
    else if (kind === 'counter') { o.size = 21; o.max = 1.0; o.vy = -62; o.pop = true; }
    else if (kind === 'elemtag') { o.size = 13; o.max = 0.8; o.vy = -34; }          // v0.7.0l 元素克制：小标签（不再 21 号弹出大字）
    else if (kind === 'beaten') { o.size = 14; o.max = 0.8; }
    else if (kind === 'shield') { o.size = 13; o.max = 0.6; }
    else if (kind === 'syn') { o.size = 20; o.max = 1.3; o.vy = -40; o.pop = true; }
    T.push(o);
  }
  function spark(G, x, y, color, n) {
    var P = G.parts;
    for (var i = 0; i < n && P.length < 460; i++) {
      var a = rand(0, PI2), s = rand(40, 130);
      P.push({ x: x, y: y, vx: cos(a) * s, vy: sin(a) * s, t: 0, max: rand(0.25, 0.5), c: color, r: rand(2, 4) });
    }
  }
  // v0.4.1 死亡爆散：方块碎片 + 光点向四周飞溅，精英 / BOSS 更多更大
  function burst(G, e, big) {
    var P = G.parts, n = big ? 28 : 10, i, a, s, d = e.def;
    for (i = 0; i < n && P.length < 460; i++) {
      a = rand(0, PI2); s = rand(70, big ? 330 : 230);
      P.push({ x: e.x, y: e.y, vx: cos(a) * s, vy: sin(a) * s - 40, t: 0, max: rand(0.35, big ? 0.9 : 0.65), c: i % 3 === 0 ? d.dark : (i % 3 === 1 ? d.color : '#fff3c4'), r: rand(2, big ? 7 : 5), sq: i % 2 === 0 });
    }
    if (big) G.fx.push({ type: 'ring', x: e.x, y: e.y, r: 70, color: d.color, t: 0, max: 0.45, fill: true });
  }
  // v0.4.1 连杀 + 清屏：每杀一个 +1，2.8 秒内不杀就清零；0.6 秒内连杀 12 个以上 = “清屏”（白光 + 大字 + 屏震）
  function onKillFx(G, e, o) {
    var cb = G.combo || (G.combo = { n: 0, t: 0, max: 0, pop: 0 }), d = e.def;
    cb.n++; cb.t = 2.8; cb.pop = 0.25; if (cb.n > cb.max) cb.max = cb.n;
    G.stats.maxCombo = cb.max;
    if (cb.n === 20 || cb.n === 50 || cb.n === 100 || (cb.n > 100 && cb.n % 100 === 0)) { G.comboMs = { n: cb.n, t: 0, max: 1.4 }; G.shake = Math.max(G.shake, 5); }
    burst(G, e, d.elite || d.boss || d.etower);
    if (d.elite) G.shake = Math.max(G.shake, 5);
    // v0.5：短时多杀只是“连斩 ×N”，真正的“清屏”字样只由 XY.clearArea 在清完目标范围后弹出（见 fx5.js）
  }
  function ring(G, x, y, r, color, t, fill) {
    G.fx.push({ type: 'ring', x: x, y: y, r: r, color: color, t: 0, max: t || 0.4, fill: !!fill });
    if (XY.vfx) XY.vfx.shock(G, x, y, r, color, t, fill);        // v0.7：冲击波环升级成分层 + 元素粒子
  }
  XY.ring = ring; XY.burst = burst;

  /* ================= 伤害结算 ================= */
  // 英雄的最终伤害 = 基础 × 个人 × 全队，并掷暴击
  function heroDmg(G, h, base) {
    var d = base * h.dmgMul * G.P.dmg * ((G._incenseAtk > G.t) ? 1.3 : 1);
    G._crit = false;
    if (h.crit > 0 && Math.random() < h.crit) { d *= 2; G._crit = true; }
    if (XY.spsupDmg && h.def && h.def.special) d = XY.spsupDmg(G, h, d);
    return d;
  }

  // 伤害敌人。o: {src,kb,fx,fy,stun,crit,dot,boom}
  var VD_TOWER_HIT = 0.1;
  function hurtEnemy(G, e, dmg, o) {
    if (e.dead) return;
    if (e.hidden) { if (!o || !o.dot) { e.flash = 0.1; if (Math.random() < 0.3) text(G, e.x, e.y - e.r - 4, '躲在洞里', 'resist'); } return; }   // 已经躲进洞里养伤的洞主：打不到；路上逃跑（还没进洞）时可以被打死
    o = o || {};
    if (XY.tdHitBlock && XY.tdHitBlock(G, e, o)) { e.flash = 0.05; return; }
    if (e.fly && o.ground && C.AIR_GROUND_IMMUNE) { e.flash = 0.06; if (G.t - (G._airTxtT === undefined ? -9 : G._airTxtT) > 0.7) { G._airTxtT = G.t; text(G, e.x, e.y - e.r - 24, '飞在天上 · 够不着', 'resist'); } return; }   // v0.8.4：地面范围伤害打不到飞妖
    if (e.lt) dmg = Math.min(dmg, e.maxHp * VD_TOWER_HIT);       // v0.9 洞府塔：单次伤害最多掉最大血量的一小截（英雄大招动辄几千，不封顶塔一下就没了）
    if (e.def.boss && G.P.boss) dmg *= 1 + G.P.boss;          // 照妖镜：对洞府 BOSS 伤害更高
    // 伤害类型 + 元素：物理 / 法术各吃对应防御，五行相克
    var sr = o.src, dt = o.type || (sr && sr.def && sr.def.dtype) || 'phys', el = o.elem !== undefined ? o.elem : ((sr && sr.def && sr.def.elem) || null);
    var df = (dt === 'magic' ? e.def.mdef : e.def.pdef) || 0, em = XY.elemMul(el, e.elem);
    if (sr && sr.mod) { if (sr.mod.typeDmg && sr.mod.typeDmg[dt]) dmg *= 1 + sr.mod.typeDmg[dt]; if (em > 1 && sr.mod.weakDmg) em += sr.mod.weakDmg; if (e.def.boss && sr.mod.bossDmg) dmg *= 1 + sr.mod.bossDmg; }
    if (sr && sr.mod && sr.mod.hitSlow > 0 && !o.dot) { e.slowT = Math.max(e.slowT, 1.2); e.slowF = Math.max(e.slowF, Math.min(0.6, sr.mod.hitSlow) * (e.def.boss ? 0.5 : 1)); }   // 控制节点：命中减速
    if (e.markT > 0) dmg *= 1.3;                                // 二郎神天眼标记
    if (e.vulnUntil > G.t && (!e.vulnType || e.vulnType === dt)) dmg *= 1 + e.vulnM;   // 易伤（每日简报 / 翻译一下 / 科普课堂）
    if (e.anaUntil > G.t) dmg *= 1 + e.anaM;                    // 已分析（搭框架）
    if (sr && sr.sk && XY.syn) dmg *= XY.syn.hitMul(G, e, sr, em);           // 协同技：标记增伤 / 相生共鸣
    dmg *= (1 - df) * em;
    if (e.def.guard) dmg = XY.v07b.guardHit(G, e, dmg, o, el);               // v0.7b 盾兵：正面挡（金属性 / 破阵 / 绕背除外）
    if (e.affix) dmg = XY.affixHurt(e, dmg);                    // 重甲词缀
    G._em = em;
    if (XY.onHurt) XY.onHurt(G, e, dmg, em, el, dt, o);                                    // 测试 / 调试钩子（记录每一下的五行倍率）
    if (!o.dot && el && XY.elemFx) XY.elemFx(G, e, el, em);                                // 五行相克特效：克 / 被克 / 同属性
    if (e.shield > 0) dmg = XY.shieldHit(G, e, dmg, em, el);                               // 精英元素护盾：先打破护盾，克制的元素破盾更快
    if (sr && sr.i !== undefined && !o.fb && C.HERO_DMG_MUL !== 1) dmg *= C.HERO_DMG_MUL;     // 英雄自己出手的伤害系数（法宝命中带 fb 标记不吃它）：把输出重心挪向法宝
    e.hp -= dmg; e.flash = 0.1;
    if (sr && sr.sk && XY.syn && !o.dot) XY.syn.afterHit(G, e, sr, dmg, o);
    if (XY.sfx && !o.dot) XY.sfx(o.crit ? 'crit' : 'hit');
    if (XY.anim && !o.dot) XY.anim.hit(G, e, o.crit);
    if (o.crit && G.shake < 3) G.shake = 3;
    if (o.src && o.src.i !== undefined) G.stats.dealt[o.src.i] += Math.max(0, Math.min(dmg, e.hp + dmg));
    if (!o.dot || Math.random() < 0.25) text(G, e.x, e.y - e.r - 4, Math.round(dmg), o.crit ? 'crit' : (em > 1.05 ? 'weak' : (em < 0.8 ? 'resist' : 'dmg')));
    if (!o.dot && Math.random() < 0.5) spark(G, e.x, e.y, e.def.color, 2);
    if (XY.vfx && !o.dot) XY.vfx.hit(G, e, dmg, o, em);          // v0.7：命中闪光 / 火花 / 元素粒子
    if (o.kb) {
      var dx = e.x - o.fx, dy = e.y - o.fy, d = sqrt(dx * dx + dy * dy) || 1;
      var s = o.kb * (1 - e.def.knockRes);
      e.kx += dx / d * s; e.ky += dy / d * s;
    }
    if (o.stun && !e.def.boss) e.stunT = Math.max(e.stunT, o.stun * (1 - e.def.knockRes * 0.6));
    if (e.hp <= 0) { if (e.def.denBoss) { if (e.retreatT > 0 || (G.dungeon && G.dens[e.den] && G.dens[e.den].beaten)) bossSlain(G, e, o); else bossRetreat(G, e, o); } else killEnemy(G, e, o); }   // 副本：第二次打到 0 血 = 真的死了
  }

  function killEnemy(G, e, o) {
    if (e.dead) return;
    if (e.dk && XY.devilKitty && XY.devilKitty.interceptDeath && XY.devilKitty.interceptDeath(G, e, o)) return;
    e.dead = true; G.kills++;
    if (e.affix) XY.affixDeath(G, e);
    if (XY.syn && o && o.src && o.src.sk) XY.syn.onKill(G, e, o.src);
    if (XY.version && XY.version.instantMax) XY.version.instantMax(G);     // 全开：打死第一只怪，当前特殊角色直接满级（标准版什么都不发生）
    var d = e.def;
    if (XY.sfx) XY.sfx(d.elite || d.etower ? 'elite' : 'kill');
    G.killsBy[e.type] = (G.killsBy[e.type] || 0) + 1; XY.save.addKill(e.type);   // 图鉴击杀数（存档）
    if (!G.villain) XY.cards.onKill(G, e);                                                         // 法宝掉落
    if (d.xp > 0) G.gems.push({ x: e.x, y: e.y, v: d.xp * (e.xpM || 1), big: d.xp >= 10, mag: null });
    if (XY.spsupKill) XY.spsupKill(G, e, o);
    onKillFx(G, e, o);
    if (G.villain) XY.villain.onKill(G, e, o);
    if (G.lair && XY.lairOnKill) XY.lairOnKill(G, e, o);
    if (Math.random() < d.coinP * (G.xCoinP || 1) * (e.coinM || 1)) {
      var n = d.coin * G.P.coin, v = Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);
      if (v > 0) G.coinDrops.push({ x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), v: v, mag: null });
    }
    spark(G, e.x, e.y, d.color, d.elite || d.boss ? 14 : 4);
    if (d.elite) ring(G, e.x, e.y, 60, d.color, 0.4);
    var sm = o && o.src && o.src.mod;
    if (sm && sm.killHeal > 0 && !o.src.down) healHero(G, o.src, sm.killHeal, false);
    if (sm && sm.coinUp > 0 && Math.random() < sm.coinUp) G.coinDrops.push({ x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), v: 1 + (d.elite ? 2 : 0), mag: null });   // 经济节点：额外金币
    if (d.etower) {
      G.stats.etKilled++; ring(G, e.x, e.y, 90, '#8a5fc0', 0.5, true); G.shake = Math.max(G.shake, 5);
      if (e.den != null && G.dens[e.den]) G.dens[e.den].towers = Math.max(0, G.dens[e.den].towers - 1);
      text(G, e.x, e.y - 30, '妖塔倒了 +' + 8, 'big');
    }
  }
  /* 洞主“被击败” = 败退回洞（不是击杀）：无敌、跑回洞里、血量回复；洞府暂停出怪一阵；主线不需要进洞府副本。
     第一次败退才发奖励（角色卡概率、宝石、任务宝物），之后只掉少量宝石，所以反复击退刷不了卡。 */
  function bossRetreat(G, e, o) {
    var dn = G.dens[e.den], first = !dn.beaten;
    e.hp = Math.max(1, e.maxHp * 0.02); e.retreatT = C.RETREAT_T; e.hidden = false; e.engaged = false; e.raid = 0; e.bstate = 'idle'; e.stunT = 0; e.kx = 0; e.ky = 0; e.burnT = 0;
    dn.defeats++; dn.closedT = C.DEN_CLOSE; dn.beaten = true; if (first) { dn.deadT = G.t; G.stats.denKills++; }
    G.stats.retreats = (G.stats.retreats || 0) + 1;
    if (XY.sfx) XY.sfx('boss'); if (XY.hitstop) XY.hitstop(G, 0.07);
    if (G.villain) { if (first) XY.villain.onBoss(G, e); }
    else {
    if (first && XY.soldierCardDrop) XY.soldierCardDrop(G, e.x, e.y, 'boss');
    if (first) XY.cards.onKill(G, e);                                    // 首次击退：保底掉法宝（最终 BOSS 2 张，其他 1 张）
    if (first && XY.specials) XY.specials.maybeDrop(G, 'boss');          // 角色卡：只有第一次败退才有概率
    }
    G.enemies.forEach(function (t) { if (!t.dead && t !== e && t.den === e.den && !t.def.etower) { t.dead = true; spark(G, t.x, t.y, t.def.color, 3); } });   // 小怪消散（妖塔留着，要另外拆）
    ring(G, e.x, e.y, 220, '#ffd24a', 0.9, true); ring(G, dn.x, dn.y, 140, '#8a8a8a', 0.9);
    G.shake = Math.max(G.shake, first ? 14 : 8);
    var ng = first ? 20 : 5;
    for (var i = 0; i < ng; i++) G.gems.push({ x: e.x + rand(-80, 80), y: e.y + rand(-80, 80), v: 20, big: true, mag: null });
    banner(G, dn.bossName + ' 败退回洞！' + dn.name + ' 暂时闭门 ' + C.DEN_CLOSE + ' 秒' + (first ? '' : '（再次击退，只掉少量宝石）'), 4);
    var mq = G.lv.main;
    if (first && mq.type === 'item' && mq.den === e.den) G.items.push({ kind: mq.item, name: XY.ITEM_NAME[mq.item], x: e.x, y: e.y, t: 0 });
  }
  /* 洞主在“逃跑回洞”的路上被打死 = 真的死了：不再躲洞、不再回来，洞府永久闭门（首次败退的奖励早在败退那一刻发过了）。 */
  function bossSlain(G, e, o) {
    var dn = G.dens[e.den]; e.retreatT = 0; e.hidden = false;
    dn.alive = false; dn.slain = true; dn.closedT = 1e9; dn.beaten = true;
    G.stats.denSlain = (G.stats.denSlain || 0) + 1;
    G.enemies.forEach(function (t) { if (!t.dead && t !== e && t.den === e.den && !t.def.etower) { t.dead = true; spark(G, t.x, t.y, t.def.color, 3); } });
    killEnemy(G, e, o);
    for (var i = 0; i < 8; i++) G.gems.push({ x: e.x + rand(-60, 60), y: e.y + rand(-60, 60), v: 20, big: true, mag: null });
    ring(G, e.x, e.y, 240, '#ffd24a', 0.9, true); G.shake = Math.max(G.shake, 12);
    banner(G, G.dungeon ? dn.bossName + ' 被打死了！' + dn.name + '的关口开了，走进去就通关' : '追杀成功！' + dn.bossName + ' 死在了逃跑的路上，' + dn.name + ' 彻底安静了', 4);
  }
  XY.ITEM_NAME = { fan: '芭蕉扇' };

  function healHero(G, h, amt, show) {
    if (h.down || amt <= 0 || h.id === 'tang') return;   // 唐僧不受任何回血影响
    var before = h.hp;
    h.hp = Math.min(h.maxHp, h.hp + amt);
    if (XY.vfx && h.hp > before && show) XY.vfx.heal(G, h);
    if (show && h.hp > before) text(G, h.x, h.y - h.def.r - 14, '+' + Math.round(h.hp - before), 'heal');
  }

  function hurtHero(G, h, dmg, contact, cause) {
    if (h.down || h.inv > 0 || G.godMode) return;
    if (h.id === 'tang') {                              // 唐僧只有 1 点血：任何一下伤害 = 当场失败
      if (G.tang && G.tang.phase === 'rest') return;
      if (dmg <= 0) return;
      if (G.villain) { XY.villain.hurtEye(G, h, dmg, contact, cause); return; }     // v0.9 反派关：唐僧 = 洞府阵眼，伤害记到洞府血条（G.camp）
      var inCamp = G.camp.active && XY.dist(h.x, h.y, G.camp.x, G.camp.y) <= C.CAMP_ZONE_R, how, why;
      if (cause) { how = 'boss'; why = cause; }
      else if (contact) { how = inCamp ? 'breach' : 'contact'; why = inCamp ? '妖怪闯进营地，撞到了师父' : '妖怪碰到了师父'; }
      else if (G._src === 'proj') { how = 'proj'; why = inCamp ? '妖怪的暗器射进营地，打中了师父' : '妖怪的远程攻击打中了师父'; }
      else { how = 'other'; why = '师父被击中了'; }
      h.hp = 0; h.down = true; G.stats.deaths++; h.hurtT = 0.5; h.dash = null; h.pend.length = 0;
      ring(G, h.x, h.y, 60, '#d62828', 0.6); G.shake = Math.max(G.shake, 10);
      if (!G.ending) G.ending = { kind: 'lose', cause: 'tang', how: how, why: why, reason: '唐僧阵亡：' + why, t: 1.5 };
      return;
    }
    if (contact) { if (h.contactT > 0) return; h.contactT = 0.4; }   // 被围殴时每 0.4 秒最多吃一次接触伤害
    if (XY.spsupPre) { dmg = XY.spsupPre(G, h, dmg); if (dmg <= 0) { h.hurtT = 0.1; return; } }
    var hdt = G._dt || 'phys', hel = G._el || null;
    dmg *= (1 - h.dr) * (h._lineDr ? (1 - Math.min(0.35, h._lineDr)) : 1) * (h.taunt > 0 ? 0.4 : 1) * (1 - (hdt === 'magic' ? h.mdef : h.pdef)) * XY.elemMul(hel, h.def.elem) * (h.shield > 0 ? 0.5 : 1) * (XY.syn ? XY.syn.drMul(G, h) : 1);                // 钉耙挡灾期间再减伤；协同技·互相守护再减伤 60%
    if (dmg > 0 && h.ward && h.ward.ready && XY.fabao && XY.fabao.wardBreak) { XY.fabao.wardBreak(G, h); return; }   // v0.8.3：避水珠 / 定海神珠 —— 一次性挡掉这一下（不管多大），然后进入冷却
    if (h.absorb > 0) { var ab2 = Math.min(h.absorb, dmg); h.absorb -= ab2; dmg -= ab2; if (dmg <= 0) { h.hurtT = 0.1; return; } }
    var sk = contact ? 'contact' : (G._src || 'other'); G.stats[sk] = (G.stats[sk] || 0) + dmg;
    if (G.lair) dmg = XY.heroCC.clampHit(G, h, dmg);          // v0.9 洞府：单次伤害 ≤ 最大血量 45%
    h.hp -= dmg; h.hurtT = 0.25;
    if (XY.vfx) XY.vfx.hurt(G, h, dmg);
    if (XY.spsupHurt) XY.spsupHurt(G, h, dmg);
    text(G, h.x, h.y - h.def.r - 12, Math.round(dmg), 'hurt');
    if (h.hp <= 0 && XY.spsupRevive && XY.spsupRevive(G, h)) return;
    if (h.hp <= 0) {
      // 阵亡：本局不再复活
      h.hp = 0; h.down = true; G.stats.deaths++;
      h.dash = null; h.pend.length = 0;
      ring(G, h.x, h.y, 50, '#777', 0.5);
      G.shake = Math.max(G.shake, 6);
      G.stats.discDeaths++;
      if (h.id !== 'tang') { h.reviveAt = G.t + 22; banner(G, h.def.name + ' 倒下了，过一会儿会回来', 3); toast(G, h.def.name + ' 倒下了，大约二十秒后回到师父身边'); }
      else { banner(G, h.def.name + ' 阵亡了', 3); toast(G, h.def.name + ' 阵亡了'); }
      if (G.ctrl === h.i) autoSwitch(G);
      if (G.villain) XY.villain.heroDown(G, h);
    }
  }

  function hurtHeroBy(G, h, dmg, contact, cause, dt, el) {
    if (XY.tdTangSave && XY.tdTangSave(G, h)) return;
    G._dt = dt; G._el = el;
    hurtHero(G, h, dmg, contact, cause);
    G._dt = null; G._el = null;
  }

  function hurtCamp(G, dmg) {
    if (XY.tdCampMul) dmg *= XY.tdCampMul(G);
    var c = G.camp;
    if (G.godMode || !c.active) return;               // 营地只在休息阶段生效
    if (G.villain) { XY.villain.hurtEye(G, G.heroes[0], dmg, true); return; }
    if (c.wardGrace > 0) return;                      // 定海神珠刚挡过：0.4 秒内同一波不再吃
    if (c.ward && c.ward.ready && dmg > 0 && XY.fabao && XY.fabao.campWardBreak) { XY.fabao.campWardBreak(G); return; }   // v0.8.3：定海神珠挡营地一下
    if (G.station) dmg *= Math.max(0.2, C.STATION_DEF - G.heroes[0].mod.stDef);   // 唐僧驻守：营地防御提高
    c.hp -= dmg; c.hurtT = 0.2; G.campAlert = 2;
    if (c.hp <= 0 && !G.ending) { c.hp = 0; G.ending = { kind: 'lose', cause: 'camp', why: '经书营地的血量被妖怪打光了', reason: '基地被入侵：经书营地的血量被妖怪打光了', t: 1.5 }; }
  }

  // 操控的英雄阵亡后，换给下一个活着的（优先编号靠后的）
  function autoSwitch(G) {
    for (var k = 1; k <= G.heroes.length; k++) {
      var j = (G.ctrl + k) % G.heroes.length;
      if (j !== 0 && !G.heroes[j].down) { G.ctrl = j; return; }
    }
    // 徒弟全倒：没人可操控（唐僧不受任何输入控制），镜头改为观察唐僧
  }

  /* ================= 敌人生成 ================= */
  function makeEnemy(G, type, x, y, den) {
    var d = XY.ENEMIES[type], t = G.t, LV = G.lv, min = t / 60, hpMul, dmgMul;
    if (d.denBoss) { hpMul = LV.bossMul; dmgMul = 1 + (LV.bossMul - 1) * 0.2; }                         // BOSS 的 +5%/分钟在 step 里按时间持续叠加
    else if (d.etower) { hpMul = LV.mul * (1 + C.ENEMY_SCALE * min); dmgMul = 1 + (LV.mul - 1) * 0.5; }
    else {                                                                      // 小怪：出生时 +1%/分钟（线性）× 关卡强度
      hpMul = LV.mul * (1 + C.ENEMY_SCALE * min) * C.ENEMY_HP_MUL;
      dmgMul = (1 + C.ENEMY_SCALE * min) * (1 + (LV.mul - 1) * 0.5) * C.ENEMY_DMG_MUL;
    }
    if (G.dungeon) { var dq = G.dungeon.hard || 1; hpMul *= (d.denBoss ? C.DNG_BOSS : C.DNG_HP) * dq; dmgMul *= C.DNG_DMG * (1 + (dq - 1) * 0.5); }      // v0.8.5 洞府副本加难：怪血 / 怪伤 / 洞主血量的倍率（单人无组合通关率 ≈ 20%）
    if (G.inhMul > 1) { hpMul *= G.inhMul; dmgMul *= 1 + (G.inhMul - 1) * 0.5; }      // 取经之旅：队伍继承了等级，怪物强度跟着抬
    if (G.villain) hpMul *= XY.VD.STAGE.hpK;                                          // v0.9 反派关：一个人守，怪血 ×0.65
    var e = {
      id: G.nextId++, type: type, def: d, x: x, y: y, r: d.r, den: den == null ? null : den, elem: (den != null && G.dens[den] && !d.denBoss && !d.etower && G.dens[den].elem) || d.elem || null, markT: 0,
      hp: d.hp * hpMul, maxHp: d.hp * hpMul, speed: d.speed * (d.denBoss || d.etower ? 1 : rand(0.92, 1.08)), dmg: d.dmg * dmgMul,
      kx: 0, ky: 0, flash: 0, atkT: rand(0, 0.5), burnT: 0, burnDps: 0, burnAcc: 0, slowT: 0, slowF: 0, stunT: 0,
      beadT: 0, dashId: 0, toCamp: !d.elite && !d.denBoss && !d.etower && Math.random() < 0.2,
      retarget: 0, th: null, shootT: rand(1, 2.5), dead: false, wob: rand(0, 6),
      // boss 专用
      bt: 3, bi: 0, bstate: 'idle', cdx: 0, cdy: 0, phase: 1, engaged: false, baseHp: d.hp * hpMul, baseDmg: d.dmg * dmgMul, grow: 0
    };
    if (d.elite && XY.affixInit) XY.affixInit(e, G.forceAffix);                                       // 精英词缀（狂暴 / 重甲 / 回春 / 召唤 / 自爆）
    if (d.elite && XY.shieldInit) XY.shieldInit(e);                                    // 精英带元素护盾
    if (d.etower) { e.building = C.ETOWER_BUILD; e.shootT = 0.5; e.dmg = C.ETOWER_DMG * dmgMul; }
    var aliveN = 0, ai;
    for (ai = 0; ai < G.enemies.length; ai++) if (G.enemies[ai] && !G.enemies[ai].dead) aliveN++;
    if (!d.denBoss && !d.etower && aliveN >= 40) { e.dead = true; return e; }
    G.enemies.push(e);
    return e;
  }
  XY.makeEnemy = makeEnemy;

  // 在屏幕四周边缘外一点生成；离英雄太近就重抽
  function spawnPos(G) {
    var W = C.WORLD_W, H = C.WORLD_H, v = G.view, cam = G.cam, x, y, tries = 0, m = 90;
    var hw = v.w / 2 + m, hh = v.h / 2 + m;
    do {
      var s = Math.random() * (hw + hh) * 4;     // 沿矩形周长随机取一点
      if (s < hw * 2) { x = cam.x - hw + s; y = cam.y - hh; }
      else if (s < hw * 4) { x = cam.x - hw + (s - hw * 2); y = cam.y + hh; }
      else if (s < hw * 4 + hh * 2) { x = cam.x - hw; y = cam.y - hh + (s - hw * 4); }
      else { x = cam.x + hw; y = cam.y - hh + (s - hw * 4 - hh * 2); }
      x = clamp(x, 30, W - 30); y = clamp(y, 30, H - 30);
      var ok = true;
      for (var i = 0; i < G.heroes.length; i++) { var h = G.heroes[i]; if (!h.down && XY.dist(x, y, h.x, h.y) < 320) { ok = false; break; } }
      if (ok) return { x: x, y: y };
    } while (++tries < 8);
    return { x: x, y: y };
  }

  function pickType(t) {
    var r = Math.random();
    if (t < 60) return 'small';                                  // v0.5：密集波 75–85% 脆小怪，不靠坦克堆人数
    if (t < 100) return r < 0.9 ? 'small' : 'tank';
    if (t < 220) return r < 0.76 ? 'small' : (r < 0.84 ? 'tank' : (r < 0.92 ? 'ranged' : 'shield'));     // v0.7b：盾兵 100 秒起混入
    return r < 0.68 ? 'small' : (r < 0.78 ? 'tank' : (r < 0.88 ? 'ranged' : 'shield'));
  }

  function runEvent(G, ev) {
    if (G.villain && ev.kind === 'chest') { XY.villain.redPacket(G); return; }
    if (ev.kind === 'chest') {
      XY.cards.spawnChest(G);
      banner(G, '宝箱出现了！走过去打开，里面有法宝', 3.5);
    }
  }

  // 调试：直接跳到某个时间点，跳过的事件不再补发
  XY.skipTo = function (G, t) {
    if (t <= G.t) return;
    G.t = t;
    while (G.eventIdx < G.events.length && G.events[G.eventIdx].t < t - 0.05) G.eventIdx++;
  };

  /* ================= 主循环：推进一步 ================= */
  XY.step = function (G, dt) {
    if (G.mode !== 'play') return;
    if (G._quietShot || G._holdParty) return;
    if (G.cut) dt = XY.cutin.tick(G, dt);                 // 召唤特殊人物的“定妆图施法”过场：世界慢放（过场时钟走真实时间）
    // v0.5 顿帧：暂停战斗模拟（画面 / 输入照常），恢复时不补跑；预算每秒回复 HITSTOP_BUDGET
    G.hsBud = Math.min(C.HITSTOP_BUDGET, (G.hsBud === undefined ? C.HITSTOP_BUDGET : G.hsBud) + C.HITSTOP_BUDGET * dt);
    if (G.hitstopT > 0) { G.hitstopT -= dt; G.hsFrames = (G.hsFrames || 0) + 1; if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 0.5); return; }
    if (!G.tut) G.t += dt;                 // 新手教程期间时间停住
    if (!G.ending) G.heroes.forEach(function (hh) { if (hh && hh.down && hh.id !== 'tang' && hh.reviveAt && G.t >= hh.reviveAt) { var tg = G.heroes[0]; hh.down = false; hh.hp = Math.max(1, hh.maxHp * 0.55); hh.inv = 1.4; hh.reviveAt = 0; hh.x = tg.x + 36; hh.y = tg.y + 12; toast(G, hh.def.name + ' 回来了'); } });

    // 事件（宝箱）与洞府出怪（敌人只来自洞府）
    while (G.eventIdx < G.events.length && G.events[G.eventIdx].t <= G.t) runEvent(G, G.events[G.eventIdx++]);
    if (!G.ending) XY.updateDens(G, dt);

    // 网格（本帧开始时的敌人位置）
    G.grid.clear();
    for (var i = 0; i < G.enemies.length; i++) if (!G.enemies[i].dead) G.grid.insert(G.enemies[i]);
    if (G.enemies.length > G.stats.maxEnemies) G.stats.maxEnemies = G.enemies.length;

    computeThreats(G);
    updateHeroes(G, dt);
    XY.updateVolume(G, dt);
    XY.updateAbilities(G, dt);
    updateEnemies(G, dt);
    XY.updateAllies(G, dt);
    if (G.villain) XY.villain.update(G, dt); else if (G.lair) XY.lairUpdate(G, dt);
    XY.updateSoldiers(G, dt);
    updateTowers(G, dt);
    updateProjs(G, dt);
    updateZones(G, dt);
    updatePickups(G, dt);
    XY.cards.update(G, dt);
    XY.quests.update(G, dt);
    XY.updateGate(G, dt);
    XY.v07b.update(G, dt); XY.v07b.evoUpdate(G, dt);
    XY.guest.update(G, dt);                                                     // 召唤特殊人物：冷却 / 停留计时
    updateFx(G, dt);

    // 营地受伤的闪烁、提示计时
    if (G.camp.hurtT > 0) G.camp.hurtT -= dt;
    var cregen = !G.camp.active ? 0 : (G.campAlert <= 0 ? 3 : 0) + (G.station ? C.STATION_REGEN * G.heroes[0].mod.stRegen : 0) + ((G.cm && G.cm.campRegen) || 0);   // 平时慢慢自修；唐僧驻守时大幅加速（挨打时也有）
    G.campRegen = cregen;
    if (cregen > 0 && G.camp.hp < G.camp.maxHp && !G.ending) G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + cregen * dt);
    if (G.campAlert > 0) G.campAlert -= dt;
    if (G.lvFlash > 0) G.lvFlash -= dt;
    if (G.tangWarn > 0) G.tangWarn -= dt;
    noteStep(G, dt);
    if (G.tut && XY.tutTick) XY.tutTick(G, dt);
    if (G.shake > 0) G.shake = Math.max(0, G.shake - 40 * dt);
    if (G.combo) { G.combo.t -= dt; G.combo.pop = Math.max(0, G.combo.pop - dt); if (G.combo.t <= 0) G.combo.n = 0; }
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt);
    if (G.clearFx) { G.clearFx.t += dt; if (G.clearFx.t >= G.clearFx.max) G.clearFx = null; }
    if (G.comboMs) { G.comboMs.t += dt; if (G.comboMs.t >= G.comboMs.max) G.comboMs = null; }

    // 镜头平滑跟随操控英雄
    var h = G.heroes[G.ctrl].down ? G.heroes[0] : G.heroes[G.ctrl], cam = G.cam, k = Math.min(1, dt * 7);   // 操控者倒下：观察唐僧
    G.station = !G.heroes[0].down && G.tang.phase === 'rest'; G.camp.active = G.station;   // 休息阶段 = 营地规则生效（同一帧内与状态机对齐）
    cam.x += (h.x - cam.x) * k; cam.y += (h.y - cam.y) * k;
    var vw = G.view.w, vh = G.view.h;
    var framed = G.heroes.length >= 9 && XY.frameParty && XY.frameParty(G);
    if (!framed) {
      if (vw < C.WORLD_W) cam.x = clamp(cam.x, vw / 2, C.WORLD_W - vw / 2);
      if (vh < C.WORLD_H) cam.y = clamp(cam.y, vh / 2, C.WORLD_H - vh / 2);
    }

    // 结局倒计时
    if (G.ending && !G.ending.sfx) { G.ending.sfx = 1; if (XY.sfx) XY.sfx(G.ending.kind === 'win' ? 'win' : 'lose'); }
    if (G.ending && (G.ending.t -= dt) <= 0) { G.mode = G.ending.kind; }
  };

  // 师父的威胁：离他最近的妖怪（营地圈里的优先）、正朝他飞来的妖怪弹幕；营地圈里有妖怪 = 红色警报
  function computeThreats(G) {
    var t = G.heroes[0], camp = G.camp.active ? G.camp : t, best = null, bd = Infinity, inZone = 0, zoneBest = null, zd = Infinity;   // 危险提示圈永远跟着唐僧；休息时营地才是真正的失败判定
    G.threat = null; G.pthreat = null; G.breach = false; G.tdanger = false;
    if (t.down) return;
    var tIn = XY.dist(t.x, t.y, camp.x, camp.y) <= C.CAMP_ZONE_R;
    G.grid.query(camp.x, camp.y, C.CAMP_ZONE_R, function (e) {
      inZone++; var d = XY.dist(e.x, e.y, t.x, t.y); if (d < zd) { zd = d; zoneBest = e; }
    });
    G.grid.query(t.x, t.y, 240, function (e) { var d = XY.dist(e.x, e.y, t.x, t.y); if (d < bd) { bd = d; best = e; } });
    G.threat = zoneBest || best;                           // 营地圈里的妖怪优先
    if (G.threat) { var dd = XY.dist(G.threat.x, G.threat.y, t.x, t.y); G.tdanger = dd < 150; }
    G.breach = G.camp.active && tIn && inZone > 0;
    var pd = 520;
    for (var i = 0; i < G.eprojs.length; i++) {
      var q = G.eprojs[i], rx = t.x - q.x, ry = t.y - q.y, sp = sqrt(q.vx * q.vx + q.vy * q.vy) || 1, along = (rx * q.vx + ry * q.vy) / sp;
      if (along <= 0 || along > pd) continue;
      var perp = Math.abs(rx * q.vy - ry * q.vx) / sp;
      if (perp < 70) { pd = along; G.pthreat = q; G.tdanger = true; }
    }
    if (G.breach) G.breachT += C.STEP; else G.breachT = 0;
    if (G.breach && G.tangWarn <= 0) { G.tangWarn = 6; toast(G, '⚠ 妖怪闯进营地了！快清掉，别让它碰到师父！'); }
  }

  /* ================= 英雄 ================= */
  function partySafe(G) {
    var app = XY.app || {}, z = app.zoom || 1;
    var vw = (G.view && G.view.w) || 1280, vh = (G.view && G.view.h) || 720;
    var cssW = vw * z, cssH = vh * z, s = XY.uiScale ? XY.uiScale(cssW, cssH) : 1, k = s / z;
    var W = cssW / s, H = cssH / s, port = H > W * 1.05, small = W < 900;
    var head = port ? 64 : (small ? 30 : 39), questH = port ? 22 : (small ? 22 : 30);
    var questBottom = head + 8 + questH;
    var troopTop = port ? (H - 143) : (H - (small ? 75 : 111));
    var mapLeft = port ? (W - 8) : (W - (small ? 82 : 134));
    var squat = !port && H < 420;
    return { top: (questBottom + (squat ? 6 : 8)) * k, bottom: (troopTop - (squat ? 8 : 10)) * k, left: (port ? 18 : 36) * k, right: (mapLeft - 12) * k, vw: vw, vh: vh, z: z };
  }
  function partyRing(G) {
    var safe = partySafe(G), availH = Math.max(80, safe.bottom - safe.top);
    return Math.max(64, Math.min((safe.vw - 150) / 2, (availH - 120) / 2)) * 0.92;
  }
  function partySlots(G) {
    var list = [], i, hh, tang = G.heroes[0], a;
    for (i = 1; i < G.heroes.length; i++) { hh = G.heroes[i]; if (hh && !hh.down && !hh.ridden) list.push(hh); }
    var safe = partySafe(G), vw = safe.vw, vh = safe.vh;
    var availW = Math.max(160, safe.right - safe.left), availH = Math.max(90, safe.bottom - safe.top);
    var head = 96, cloud = 42;
    function relax(slots, minD) {
      var pts = slots.map(function (s) { return { h: s.h, x: s.x, y: s.y }; });
      pts.push({ h: tang, x: tang.x, y: tang.y, pin: true });
      var p, i, j, dx, dy, d, push, ux, uy;
      for (p = 0; p < 12; p++) for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
        dx = pts[j].x - pts[i].x; dy = pts[j].y - pts[i].y; d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (d >= minD) continue;
        push = (minD - d) / 2; ux = dx / d; uy = dy / d;
        if (!pts[i].pin) { pts[i].x -= ux * push; pts[i].y -= uy * push; }
        if (!pts[j].pin) { pts[j].x += ux * push; pts[j].y += uy * push; }
      }
      return pts.filter(function (q) { return !q.pin; }).map(function (q) { return { h: q.h, x: q.x, y: q.y }; });
    }
    if (vh < vw * 0.45 && list.length >= 8) {
      var scale = 0.55;
      XY._partyScale = scale;
      var gapY = Math.max(20, Math.min(36, availH * 0.16));
      var backN = 6, front = list.length - backN;
      var gapX = Math.max(86, Math.min(168, (availW - 90) / Math.max(3, front - 1)));
      var slots = [];
      list.forEach(function (hh, k) {
        if (k < backN) {
          var side = k < backN / 2 ? (k - backN / 2) : (k - backN / 2 + 1);
          slots.push({ h: hh, x: tang.x + side * gapX, y: tang.y });
        } else {
          var col = k - backN;
          slots.push({ h: hh, x: tang.x + (col - (front - 1) / 2) * gapX + gapX * 0.5, y: tang.y + gapY });
        }
      });
      return relax(slots, Math.max(72, gapX * 0.72));
    }
    XY._partyScale = 1;
    var rx = Math.max(160, Math.min((availW - 70) / 2, availW * 0.46));
    var ry = Math.max(110, Math.min((availH - head - cloud) / 2, availH * 0.42));
    var wide = list.map(function (hh, k) {
      a = (k / Math.max(1, list.length)) * Math.PI * 2 + 0.4;
      return { h: hh, x: tang.x + Math.cos(a) * rx, y: tang.y + Math.sin(a) * ry };
    });
    return relax(wide, 108);
  }
  function frameParty(G) {
    if (!G || !G.heroes || G.heroes.length < 9 || !G.view) return false;
    var safe = partySafe(G), b0 = 1e9, b1 = -1e9, b2 = 1e9, b3 = -1e9, i, hb, top, foot, half, rr;
    for (i = 0; i < G.heroes.length; i++) {
      hb = G.heroes[i]; if (!hb || hb.down || hb.ridden) continue;
      rr = (hb.def && hb.def.r) || 18;
      if (hb._drawBox) { top = hb._drawBox.y - 18; foot = hb._drawBox.y + hb._drawBox.h; half = hb._drawBox.w / 2; }
      else { top = hb.y - rr * 4.3 - 18; foot = hb.y + rr * 0.9; half = rr * 2.1; }
      if (hb.x - half < b0) b0 = hb.x - half;
      if (hb.x + half > b1) b1 = hb.x + half;
      if (top < b2) b2 = top;
      var psc = (XY._partyScale || 1);
      if (foot + rr * 2.15 * psc > b3) b3 = foot + rr * 2.15 * psc;
    }
    if (!(b1 > b0 && b3 > b2)) return false;
    var destCx = (safe.left + safe.right) / 2, destCy = (safe.top + safe.bottom) / 2;
    var bw = b1 - b0, bh = b3 - b2, sw = safe.right - safe.left, sh = safe.bottom - safe.top;
    if (bw > sw) destCx = safe.left + sw / 2;
    if (bh > sh) destCy = safe.top + sh / 2;
    G.cam.x = (b0 + b1) / 2 - (destCx - safe.vw / 2);
    G.cam.y = (b2 + b3) / 2 - (destCy - safe.vh / 2);
    if ((XY._partyScale || 1) < 0.9) G.cam.y = (b2 + 16) - ((safe.top + 4) - safe.vh / 2);
    XY.R4 = XY.R4 || {};
    XY.R4.partySafe = safe;
    return true;
  }
  XY.partySafe = partySafe;
  XY.partyRing = partyRing;
  XY.partySlots = partySlots;
  XY.frameParty = frameParty;
  var SLOT_R = 88;
  var STAND = { tang: 190, wukong: 50, bajie: 55, wujing: 40, horse: 175 };   // 自动出击/守护时离敌人站多远

  // 命令：每个自动英雄根据自己的命令算出“想去的位置”。返回 {x, y, run}
  function orderGoal(G, h, ctrl, fslot, fcount) {
    var tang = G.heroes[0], camp = G.camp.active ? G.camp : tang, order = h.order, i, near, dx, dy, dl;   // 营地只在休息时有意义；平时“驻守”= 守在唐僧身边
    if (order === 'guard' && (h.id === 'tang' || tang.down)) order = 'follow';   // 唐僧不能守护自己
    var stand = h.sp ? XY.SP12.attackRange(h) : STAND[h.id];

    if (order === 'station') {                                  // —— 驻守营地 ——
      var a = h.i * PI2 / 6 + 0.6, R = 98;
      var sx = camp.x + cos(a) * R, sy = camp.y + sin(a) * R;
      if (h.id === 'tang') { sx = camp.x; sy = camp.y + 26; }                  // 唐僧躲在营地帐篷里（离帐篷边缘的妖怪远一点）
      else {
        near = (G.threat && XY.dist(G.threat.x, G.threat.y, camp.x, camp.y) < C.CAMP_ZONE_R + 40) ? G.threat : (G.grid.nearest(camp.x, camp.y, 400) || G.grid.nearest(h.x, h.y, 260));   // 营地圈里的妖怪优先，其次是离营地最近的
        if (near && XY.dist(near.x, near.y, camp.x, camp.y) < 430) {            // 营地周围的怪才去打（最多出去 ~400）
          dx = near.x - h.x; dy = near.y - h.y; dl = sqrt(dx * dx + dy * dy) || 1;
          var tx = near.x - dx / dl * stand, ty = near.y - dy / dl * stand;
          var cd = XY.dist(tx, ty, camp.x, camp.y);
          if (cd > 400) { tx = camp.x + (tx - camp.x) / cd * 400; ty = camp.y + (ty - camp.y) / cd * 400; }
          return { x: tx, y: ty, run: false };
        }
      }
      return { x: sx, y: sy, run: XY.dist(h.x, h.y, camp.x, camp.y) > 450 };
    }

    if (order === 'guard') {                                    // —— 守护师傅 ——（v0.5 第 4 批：多个守护者按“守护序号”扇形散开，不再叠成一个点）
      if (G.heroes.length >= 9) {
        var big = partySlots(G), bi, bslot = null;
        for (bi = 0; bi < big.length; bi++) if (big[bi].h === h) bslot = big[bi];
        if (bslot) return { x: bslot.x, y: bslot.y, run: XY.dist(h.x, h.y, tang.x, tang.y) > 520 };
      }
      var gn = 0, gr = 0, gi;
      for (gi = 1; gi < G.heroes.length; gi++) { var gh = G.heroes[gi]; if (gh.down || gi === G.ctrl || gh.order !== 'guard') continue; if (gi === h.i) gr = gn; gn++; }
      var gk = gr - (gn - 1) / 2;                               // −(n−1)/2 … +(n−1)/2：在“师父—怪”这条线两侧对称排开
      var ga = (gr / Math.max(1, gn)) * PI2 + 0.3, gx = tang.x + cos(ga) * 68, gy = tang.y + sin(ga) * 68;
      near = G.pthreat || G.threat || G.grid.nearest(tang.x, tang.y, 300);   // 威胁师父的：飞来的弹幕 > 营地圈/身边最近的妖怪
      if (near) {
        dx = near.x - tang.x; dy = near.y - tang.y; dl = sqrt(dx * dx + dy * dy) || 1;
        var gd = G.pthreat ? Math.min(dl * 0.8, 54) : Math.min(dl * 0.75, STAND[h.id] > 100 ? 90 : 130);   // 站到师父和怪/弹幕之间，挡在飞行线上
        var nx0 = -dy / dl, ny0 = dx / dl, side = G.pthreat ? 22 : 52;                                  // 垂直方向展开：弹幕来时紧凑一点（挡线），平时宽一点
        gd += (gr % 2) * 14;                                    // 前后也错开一点
        gx = tang.x + dx / dl * gd + nx0 * gk * side; gy = tang.y + dy / dl * gd + ny0 * gk * side;
      }
      return { x: gx, y: gy, run: XY.dist(h.x, h.y, tang.x, tang.y) > 400 };
    }

    if (order === 'attack') {                                   // —— 主动出击 ——
      var low = h.hp / h.maxHp;
      if (low < (h.id === 'tang' ? 0.5 : 0.3)) h.retreat = true; else if (low > 0.65) h.retreat = false;
      if (h.retreat) {                                          // 血太低：撤回营地（唐僧的话回营地，其他人去唐僧身边）
        var rx = h.id === 'tang' || tang.down ? camp.x : tang.x, ry = h.id === 'tang' || tang.down ? camp.y + 70 : tang.y;
        return { x: rx + cos(h.i) * 50, y: ry + sin(h.i) * 50, run: true };
      }
      h.rtT -= G.dtStep;
      if (h.rtT <= 0 || (h.tgt && h.tgt.dead)) { h.rtT = 0.4; h.tgt = pickHuntTarget(G, h); }
      if (h.tgt && !h.tgt.dead) {
        dx = h.tgt.x - h.x; dy = h.tgt.y - h.y; dl = sqrt(dx * dx + dy * dy) || 1;
        var want = stand + (h.sp ? 0 : h.tgt.r * 0.6);
        if (dl <= want) return { x: h.x, y: h.y, run: false };  // 到位了，站着打
        return { x: h.tgt.x - dx / dl * want, y: h.tgt.y - dy / dl * want, run: false };
      }
      if (h.id !== 'tang') {                                    // 没有目标：向最近的洞府推进
        var dn = nearestDen(G, h);
        if (dn && XY.dist(h.x, h.y, dn.x, dn.y) > 260) { dx = dn.x - h.x; dy = dn.y - h.y; dl = sqrt(dx * dx + dy * dy) || 1; return { x: dn.x - dx / dl * 200, y: dn.y - dy / dl * 200, run: false }; }
      }
      var pa = h.i * PI2 / 6 + G.t * 0.05;                      // 没怪：绕营地外圈巡逻
      return { x: camp.x + cos(pa) * 480, y: camp.y + sin(pa) * 480, run: false };
    }

    // —— 跟随（默认）：站到操控英雄身边的队形位置，有怪就稍微往前顶 ——
    var fa = fslot / Math.max(1, fcount) * PI2 + Math.PI / 4;
    if (h.id !== 'tang' && !tang.down && tang.order === 'follow' && G.ctrl !== 0 && XY.dist(tang.x, tang.y, ctrl.x, ctrl.y) > 200) ctrl = tang;   // 师父走得慢：随从以师父为锚点护送他
    var ringR = G.heroes.length >= 9 ? partyRing(G) : SLOT_R;
    var fx = ctrl.x + cos(fa) * ringR, fy = ctrl.y + sin(fa) * ringR;
    near = G.grid.nearest(h.x, h.y, 230);
    if (near && !ctrl.down) {
      var melee = h.id === 'wukong' || h.id === 'bajie' || h.id === 'wujing';
      var ex2 = near.x - ctrl.x, ey2 = near.y - ctrl.y, ed = sqrt(ex2 * ex2 + ey2 * ey2) || 1;
      var push = Math.min(melee ? 95 : 35, ed);
      fx = ctrl.x + cos(fa) * SLOT_R * 0.5 + ex2 / ed * push; fy = ctrl.y + sin(fa) * SLOT_R * 0.5 + ey2 / ed * push;
    }
    return { x: fx, y: fy, run: false, follow: true, fa: fa, anc: ctrl };
  }

  // 主动出击选目标：洞府 BOSS（700 内）> 妖塔 > 精英 > 最密的怪堆（离自己近、周围怪多的优先）
  function pickHuntTarget(G, h) {
    var best = null, bs = Infinity, E = G.enemies, eligible = [], i, cnt;
    for (i = 0; i < G.dens.length; i++) {
      var dn = G.dens[i]; if (!dn.boss || dn.boss.dead || dn.boss.hidden) continue;
      var bd = XY.dist(h.x, h.y, dn.boss.x, dn.boss.y); if (bd < 700 && bd < bs) { bs = bd; best = dn.boss; }
    }
    if (best) return best;
    for (i = 0; i < E.length; i++) {
      var e = E[i]; if (e.dead) continue;
      if (!(e.def.etower || e.def.elite)) {
        var ex = e.x - h.x, ey = e.y - h.y;
        if (ex * ex + ey * ey <= 950 * 950) eligible.push(e);
        continue;
      }
      var d = XY.dist(h.x, h.y, e.x, e.y); if (d < 1000 && d - (e.def.etower ? 150 : 0) < bs) { bs = d - (e.def.etower ? 150 : 0); best = e; }
    }
    if (best) return best;
    var cb = function () { cnt++; };
    for (i = h.i % Math.min(3, eligible.length || 1); i < eligible.length; i += 3) { // 只在有效候选里分摊抽样；小群也必有一个
      var en = eligible[i];
      var dd = XY.dist(h.x, h.y, en.x, en.y); if (dd > 950) continue;
      cnt = 0; G.grid.query(en.x, en.y, 90, cb);
      var score = dd - 38 * cnt;
      if (score < bs) { bs = score; best = en; }
    }
    return best;
  }
  // 出击没有目标时：奔向最近的、还活着的洞府
  function nearestDen(G, h) {
    var best = null, bs = Infinity;
    G.dens.forEach(function (dn) { if (dn.slain || (dn.beaten && dn.closedT > 0)) return; var d = XY.dist(h.x, h.y, dn.x, dn.y); if (d < bs) { bs = d; best = dn; } });
    return best;
  }

  // 唐僧：独立状态机 walk（走向休息点）→ rest（休息 5 分钟，不能提前结束）→ walk2（走向关口）→ arrived
  function updateTang(G, h, dt) {
    var T = G.tang, R = G.rt, sp = T.speed, ph = T.phase;
    h.moving = false;
    if (G.tut) return;                     // 新手教程期间唐僧站着不动
    if (ph === 'walk') {
      T.s = Math.min(R.restS, T.s + sp * dt); h.moving = true;
      if (T.s >= R.restS) { T.phase = 'rest'; T.restT = 0; T.rests++; G.camp.active = true; banner(G, '到了休息点！唐僧要在这里休息 ' + Math.round(T.restMax / 60) + ' 分钟——营地生效，妖怪越来越多', 5); ring(G, G.camp.x, G.camp.y, 200, '#5c4a38', 0.55, false); }
    } else if (ph === 'rest') {
      T.restT += dt;
      if (T.restT >= T.restMax) { T.phase = 'walk2'; G.camp.active = false; banner(G, '休息结束，唐僧继续向西走', 3); }
    } else if (ph === 'walk2') {
      var cap = XY.fork ? XY.fork.cap(G) : R.total;                     // v0.8.4：没选路之前最远走到岔口
      T.s = Math.min(cap, T.s + sp * dt); h.moving = true;
      if (cap < R.total && T.s >= cap) XY.fork.arrive(G);
      else if (T.s >= R.total) T.phase = 'arrived';
    } else if (ph === 'fork') XY.fork.wait(G, dt);                      // 站在岔口等玩家选（30 秒没选 = 北线）
    var p = XY.routeAt(R, T.s); h.x = p.x; h.y = p.y; if (h.moving) h.face = p.a;
  }
  XY.tangProgress = function (G) { return G.tang.s / G.rt.total; };

  function updateHeroes(G, dt) {
    var P = G.P, ctrl = G.heroes[G.ctrl], i, h, j;
    var inp = G.input, il = sqrt(inp.mx * inp.mx + inp.my * inp.my);
    G.dtStep = dt;
    if (XY.rideTick) XY.rideTick(G);                // 白龙马骑乘：上马 / 下马判定
    if (XY.phyrexTick) XY.phyrexTick(G, dt);       // Phyrex：变身计时 + 隐藏的 30 秒收集
    var tang = G.heroes[0];
    // 唐僧“驻守”：命令是驻守营地、不是玩家操控、并且人在营地范围内（规则写在 README）
    G.station = !tang.down && G.tang.phase === 'rest';          // v0.5：休息阶段 = 营地规则生效（营地回血 / 减伤 / 出怪 +10%/分钟）
    var fcount = 0, fslot = 0;
    for (i = 0; i < G.heroes.length; i++) { h = G.heroes[i]; if (!h.down && i !== G.ctrl && h.order === 'follow') fcount++; }
    for (i = 0; i < G.heroes.length; i++) {
      h = G.heroes[i];
      if (h.hurtT > 0) h.hurtT -= dt;
      if (h.inv > 0) h.inv -= dt;
      if (h.contactT > 0) h.contactT -= dt;
      if (h.ultCd > 0) h.ultCd -= dt;
      if (h.traitCd > 0) h.traitCd -= dt;
      if (h.taunt > 0) h.taunt -= dt;
      if (h.boostT > 0) h.boostT -= dt;
      if (h.shield > 0) h.shield -= dt;
      if (h.down) continue;                           // 阵亡：不再行动
      if (G.lair && h.cc && XY.heroCC.tick(G, h, dt).stun) { h.moving = false; if (h.dash) h.dash = null; continue; }   // v0.9 洞府：眩晕 = 不动不打不放招；持续伤害在 tick 里结算
      if (i === 0) updateTang(G, h, dt);
      if (P.regen > 0) healHero(G, h, P.regen * dt, false);
      if (h.mod.regen > 0 && h.id !== 'tang') healHero(G, h, h.mod.regen * dt, false);
      if (h.ridden) { XY.rideHorseStep(G, h); continue; }      // 白龙马正被骑：贴着骑手，不攻击不放招
      if (h.ultCd <= 0) autoUlt(G, h);               // 大招自动放
      var sp = h.speed * XY.spsupSpeed(G, h) * (h.boostT > 0 ? 1 + (h.mod.swiftBoost || 0.45) : 1) * (h.mounted ? C.RIDE_SPEED : 1) * (G.lair && h.cc ? XY.heroCC.spdMul(h) : 1), vx = 0, vy = 0;
      var tangWalk = i === 0 && h.moving;
      h.moving = false;
      if (h.dash) {                                   // 八戒冲锋：强制位移
        var d = h.dash;
        d.t -= dt;
        vx = d.dx * d.speed; vy = d.dy * d.speed;
        h.moving = true;
        G.grid.query(h.x, h.y, h.def.r + 34, function (e) {
          if (e.dashId !== d.id) {
            e.dashId = d.id;
            hurtEnemy(G, e, heroDmg(G, h, d.dmg || 110 * h.mod.ultPow), { src: h, kb: d.kb == null ? 800 : d.kb, fx: h.x - d.dx * 20, fy: h.y - d.dy * 20, stun: d.stun == null ? 0.8 : d.stun, crit: G._crit });
          }
        });
        if (Math.random() < 0.8) spark(G, h.x, h.y, d.col || '#f28fb0', 1);
        if (d.t <= 0) h.dash = null;
      } else if (i === 0) { if (tangWalk) h.moving = true; }
      else if (i === G.ctrl) {                      // 玩家操控（手动）
        if (il > 0.01) { vx = inp.mx / il * sp; vy = inp.my / il * sp; h.moving = true; h.face = atan2(vy, vx); }
        else if (G.heroes.length >= 9) {
          var idleSlots = partySlots(G), idleSlot = null, isi;
          for (isi = 0; isi < idleSlots.length; isi++) if (idleSlots[isi].h === h) idleSlot = idleSlots[isi];
          if (idleSlot) {
            var idx = idleSlot.x - h.x, idy = idleSlot.y - h.y, idd = sqrt(idx * idx + idy * idy);
            if (idd > 6) { vx = idx / idd * sp; vy = idy / idd * sp; h.moving = true; h.face = atan2(vy, vx); }
          }
        }
      } else {                                        // 自动：按命令走
        var gl = orderGoal(G, h, ctrl, fslot, fcount);
        if (gl.follow) {
          fslot++;
          var anc = gl.anc || ctrl;
          if (h.id !== 'tang' && XY.dist(h.x, h.y, anc.x, anc.y) > 700) { h.x = anc.x + cos(gl.fa) * SLOT_R; h.y = anc.y + sin(gl.fa) * SLOT_R; }
        }
        var dx = gl.x - h.x, dy = gl.y - h.y, dd = sqrt(dx * dx + dy * dy);
        if (dd > 6) {
          var s2 = h.id === 'tang' ? Math.min(sp, dd * 6) : Math.min(sp * 1.15 * (dd > 220 || gl.run ? 1.6 : 1), dd * 6);   // 唐僧走得慢：没有追赶加速
          vx = dx / dd * s2; vy = dy / dd * s2; h.moving = true; h.face = atan2(vy, vx);
        }
      }
      if (i > 0) { h.x = clamp(h.x + vx * dt, h.def.r, C.WORLD_W - h.def.r); h.y = clamp(h.y + vy * dt, h.def.r, C.WORLD_H - h.def.r); }
      // 英雄之间轻微互相推开，别叠成一团
      for (j = i + 1; j < G.heroes.length; j++) {
        var o = G.heroes[j]; if (o.down || o.ridden || h.ridden) continue;          // 白龙马贴在骑手脚下：不参与互相推开（否则骑手会被推着漂）
        var ddx = o.x - h.x, ddy = o.y - h.y, d2 = ddx * ddx + ddy * ddy, md = 30;
        if (d2 < md * md && d2 > 0.01) { var dl = sqrt(d2), pu = (md - dl) * 0.1; if (i > 0) { h.x -= ddx / dl * pu; h.y -= ddy / dl * pu; } if (j > 0) { o.x += ddx / dl * pu; o.y += ddy / dl * pu; } }   // 唐僧不会被推动
      }
      // 待执行的延迟动作（反手横扫、余震等）
      for (var q = h.pend.length - 1; q >= 0; q--) {
        h.pend[q].t -= dt;
        if (h.pend[q].t <= 0) { var f = h.pend[q].fn; h.pend.splice(q, 1); f(); }
      }
      attack(G, h, dt);
    }
  }

  /* ---------- 各英雄的自动攻击 ---------- */
  function attack(G, h, dt) {
    switch (h.id) {
      case 'wukong': return atkWukong(G, h, dt);
      case 'bajie': return atkBajie(G, h, dt);
      case 'wujing': return atkWujing(G, h, dt);
      case 'horse': return atkHorse(G, h, dt);
      case 'tang': return atkTang(G, h, dt, false);
      case 'niumo': return XY.villain.atk(G, h, dt);
      default: if (h.sp && XY.specialAtk) return XY.specialAtk(G, h, dt);
    }
  }
  function cdScale(G, h) { return 1 / (h.atkSpd * G.P.spd); }

  // 扇形横扫
  function sweep(G, h, ang, range, arc, dmgBase, kb) {
    var full = arc >= PI2 - 0.01;
    G.fx.push({ type: 'arc', x: h.x, y: h.y, ang: ang, range: range, arc: arc, t: 0, max: 0.22, color: h.def.color, owner: h });
    if (h.id === 'wukong' && G.evo && G.evo.done && XY.vfx) XY.vfx.evoSweep(G, h, ang, range, arc);
    G.grid.query(h.x, h.y, range, function (e) {
      if (!full) {
        var da = Math.abs(((atan2(e.y - h.y, e.x - h.x) - ang + 3 * Math.PI) % PI2) - Math.PI);
        if (da > arc / 2 + e.r / (XY.dist(h.x, h.y, e.x, e.y) + 1)) return;
      }
      var dm = heroDmg(G, h, dmgBase);
      hurtEnemy(G, e, dm, { src: h, kb: kb, fx: h.x, fy: h.y, crit: G._crit });
      XY.v07b.evoHit(G, h, e, dm);
    });
  }

  function atkWukong(G, h, dt) {
    var L = h.wlv;
    h.atkT -= dt; if (h.atkT > 0) return;
    var range = XY.v07b.evoRange(G, h, 110 + 12 * (L - 1) + (L >= 4 ? 8 : 0));
    var tgt = G.grid.nearest(h.x, h.y, range + 20);
    if (!tgt) { h.atkT = 0.05; return; }
    var ang = atan2(tgt.y - h.y, tgt.x - h.x), arc = L >= 5 ? PI2 : 2.3 + 0.12 * (L - 1);
    var dmg = 34 * (1 + 0.3 * (L - 1));
    h.face = ang;
    sweep(G, h, ang, range, arc, dmg, 220);
    if (L >= 3 && arc < PI2) h.pend.push({ t: 0.22, fn: function () { if (!h.down) sweep(G, h, ang + Math.PI, range, arc, dmg * 0.8, 160); } });
    if (XY.vfx) XY.vfx.muzzle(G, h);
    h.atkT = h.atkMax = (0.8 - 0.03 * (L - 1)) * cdScale(G, h);
  }

  function atkBajie(G, h, dt) {
    var L = h.wlv;
    h.atkT -= dt; if (h.atkT > 0) return;
    var R = 92 + 7 * (L - 1) + (L >= 4 ? 8 : 0);
    var tgt = G.grid.nearest(h.x, h.y, R + 50);
    if (!tgt) { h.atkT = 0.05; return; }
    var ang = atan2(tgt.y - h.y, tgt.x - h.x), dist = Math.min(55, XY.dist(h.x, h.y, tgt.x, tgt.y));
    var cx = h.x + cos(ang) * dist, cy = h.y + sin(ang) * dist, dmg = 55 * (1 + 0.3 * (L - 1));
    h.face = ang;
    var slam = function (rad, dm) {
      ring(G, cx, cy, rad, h.def.color, 0.35, true);
      G.shake = Math.max(G.shake, 3);
      G.grid.query(cx, cy, rad, function (e) {
        hurtEnemy(G, e, heroDmg(G, h, dm), { src: h, kb: 650, fx: cx, fy: cy, stun: L >= 3 ? 0.5 : 0, crit: G._crit, aoe: true, ground: true });
      });
    };
    slam(R, dmg);
    if (L >= 5) h.pend.push({ t: 0.4, fn: function () { if (!h.down) slam(R * 1.25, dmg * 0.6); } });
    if (XY.vfx) XY.vfx.muzzle(G, h);
    h.atkT = h.atkMax = (1.4 - 0.07 * (L - 1)) * cdScale(G, h);
  }

  function atkWujing(G, h, dt) {
    var L = h.wlv, n = [3, 3, 4, 4, 5][L - 1];
    var R = 70 + 5 * (L - 1), br = 12 + L, spd = 3 + (L >= 3 ? 1 : 0) + (L >= 5 ? 0.6 : 0);
    var dmg = 17 * (1 + 0.25 * (L - 1)) * 1.4;
    // 骷髅念珠：转 3.5 秒、歇 1.5 秒（有明确的冷却），转的时候伤害 ×1.4
    if (h.beadOn > 0) {
      h.beadOn -= dt;
      if (h.beadOn <= 0) { h.beadOn = 0; h.beadRest = C.BEAD_REST; h.beads = 0; return; }
    } else {
      h.beadRest -= dt; h.beads = 0;
      if (h.beadRest <= 0) { h.beadOn = C.BEAD_ON; ring(G, h.x, h.y, 50, '#2a2218', 0.3); }
      return;
    }
    h.orbit += dt * spd * G.P.spd * h.atkSpd;
    h.beads = n; h.beadR = R; h.beadSize = br;
    for (var i = 0; i < n; i++) {
      var a = h.orbit + i / n * PI2, bx = h.x + cos(a) * R, by = h.y + sin(a) * R;
      G.grid.query(bx, by, br, function (e) {
        if (G.t >= e.beadT) {
          e.beadT = G.t + 0.35;
          hurtEnemy(G, e, heroDmg(G, h, dmg), { src: h, kb: 140, fx: h.x, fy: h.y, crit: G._crit });
        }
      });
    }
  }

  function atkHorse(G, h, dt) {
    var L = h.wlv;
    h.atkT -= dt; if (h.atkT > 0) return;
    var tgt = G.grid.nearest(h.x, h.y, 380);
    if (!tgt) { h.atkT = 0.05; return; }
    var base = atan2(tgt.y - h.y, tgt.x - h.x), shots = L >= 5 ? 3 : (L >= 3 ? 2 : 1);
    var dmg = 20 * (1 + 0.28 * (L - 1)), pierce = 2 + Math.floor(L / 2);
    h.face = base;
    for (var i = 0; i < shots; i++) {
      var a = base + (i - (shots - 1) / 2) * 0.16;
      G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 440, vy: sin(a) * 440, dmg: heroDmg(G, h, dmg), crit: G._crit, r: 7, life: 0.9, pierce: pierce, hits: [], kind: 'water', src: h });
    }
    if (XY.vfx) XY.vfx.muzzle(G, h);
    h.atkT = h.atkMax = (0.6 - 0.04 * (L - 1)) * cdScale(G, h);
  }

  function atkTang(G, h, dt, stationed) {
    var L = h.wlv, auraR = 125 + 12 * (L - 1);
    h.auraR = auraR;
    // 佛光：每 3 秒一次脉冲，给范围内的队友回血（总量和以前持续回血相同）
    h.pulseT += dt;
    if (h.pulseT >= C.TANG_PULSE) {
      h.pulseT = 0;
      for (var i = 0; i < G.heroes.length; i++) {
        var o = G.heroes[i];
        if (!o.down && XY.dist(h.x, h.y, o.x, o.y) <= auraR + 6) healHero(G, o, h.auraHeal * C.TANG_PULSE, true);
      }
      ring(G, h.x, h.y, auraR, '#f2c14e', 0.5);
    }
    if (stationed) { h.atkT = Math.max(h.atkT, 0.3); h.face = Math.PI / 2; return; }   // 驻守营地：只回血、不攻击（不灼烧、不射经文）
    // 4 级起灼烧范围内敌人
    h.auraT += dt;
    if (h.auraT >= 0.5) {
      h.auraT = 0;
      if (L >= 4) {
        var dm = (8 + (L >= 5 ? 6 : 0)) * 0.5 * h.dmgMul * G.P.dmg;
        G.grid.query(h.x, h.y, auraR, function (e) { hurtEnemy(G, e, dm, { dot: true, src: h }); });
      }
    }
    // 经文：弱远程
    h.atkT -= dt; if (h.atkT > 0) return;
    var tgt = G.grid.nearest(h.x, h.y, 320);
    if (!tgt) { h.atkT = 0.05; return; }
    var a = atan2(tgt.y - h.y, tgt.x - h.x), dmg = 13 * (1 + 0.3 * (L - 1)) * (L >= 5 ? 1.3 : 1);
    h.face = a;
    G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 380, vy: sin(a) * 380, dmg: heroDmg(G, h, dmg), crit: G._crit, r: 6, life: 0.9, pierce: 1, hits: [], kind: 'sutra', src: h });
    if (XY.vfx) XY.vfx.muzzle(G, h);
    h.atkT = h.atkMax = (1.2 - 0.07 * (L - 1)) * cdScale(G, h);
  }

  /* ---------- 大招（只有当前操控的英雄能放） ---------- */
  // 大招全部自动释放（v0.2 起玩家只负责走位，不再有手动大招键）：每个活着的英雄在冷却好、
  // 场上满足条件时自己放；操控中的英雄和自动英雄用同一套判断
  function countNear(G, x, y, r) { var n = 0, boss = false; G.grid.query(x, y, r, function (e) { n++; if (e.def.boss) boss = true; }); return { n: n, boss: boss }; }
  function wantUlt(G, h) {
    var c, i, o, low = 0, lowest = 1;
    switch (h.id) {
      case 'wukong': c = countNear(G, h.x, h.y, 280); return c.n >= 6 || (c.boss && c.n >= 1) || (c.n >= 3 && h.hp < h.maxHp * 0.4);
      case 'bajie':  c = countNear(G, h.x, h.y, 240); return c.n >= 5 || (c.boss && c.n >= 1) || (c.n >= 3 && h.hp < h.maxHp * 0.4);
      case 'wujing': c = countNear(G, h.x, h.y, 200); return c.n >= 6 || (c.boss && c.n >= 1);
      case 'horse':  c = countNear(G, h.x, h.y, 300); return c.n >= 5 || (c.boss && c.n >= 1);
      case 'tang':
        for (i = 0; i < G.heroes.length; i++) { o = G.heroes[i]; if (o.down) continue; var f = o.hp / o.maxHp; if (f < 0.5) low++; if (f < lowest) lowest = f; }
        c = countNear(G, h.x, h.y, 230);
        if (lowest < 0.35 || low >= 2) return true;                     // 有人快不行了：佛光普照
        return G.station && c.n >= 8;                                  // 驻守时营地门口被围：震退一圈
      default: if (h.sp && XY.specialWant) return XY.specialWant(G, h);
    }
    return false;
  }
  function autoUlt(G, h) { if (h.down || h.ultCd > 0 || h.dash || G.mode !== 'play') return false; if (!wantUlt(G, h)) return false; return castUlt(G, h); }
  function castUlt(G, h) {                                      // v0.7：包一层，让 ring / 粒子知道是谁放的（元素风格）
    if (XY.vfx) XY.vfx.cur = h;
    var rr = castUlt0(G, h);
    if (XY.vfx) { XY.vfx.cur = null; if (rr) XY.vfx.cast(G, h, 'ult'); }
    if (rr && h.id === 'wukong' && XY.ultscene && XY.ULTINK && XY.ULTINK.has('wukong') && !(h.def && h.def.xid)) XY.ultscene.start(G, h);      // v0.8.5 悟空大招：6 帧水墨演出
    return rr;
  }
  function castUlt0(G, h) {
    if (G.mode !== 'play' || h.down || h.ultCd > 0) return false;
    h.ultCd = XY.ultCdOf(G, h);
    if (XY.syn) XY.syn.onUlt(G, h);
    var inp = G.input, i, up = h.mod.ultPow;
    switch (h.id) {
      case 'wukong':
        ring(G, h.x, h.y, 160, '#8a2a22', 0.35, true); G.shake = 8;
        G.grid.query(h.x, h.y, 300, function (e) {
          hurtEnemy(G, e, heroDmg(G, h, 170 * up), { src: h, kb: 900, fx: h.x, fy: h.y, stun: 1.2, crit: G._crit });
        });
        break;
      case 'bajie':
        var nt = G.grid.nearest(h.x, h.y, 320), dx = nt ? nt.x - h.x : cos(h.face), dy = nt ? nt.y - h.y : sin(h.face), l = sqrt(dx * dx + dy * dy) || 1;
        h.dash = { t: 0.35, dx: dx / l, dy: dy / l, speed: 330 / 0.35, id: G.nextId++ };
        h.inv = 0.5; G.shake = 5;
        break;
      case 'wujing':
        G.zones.push({ x: h.x, y: h.y, r: 190 * up, t: 7, max: 7, tick: 0, dmg: 30 * h.dmgMul * G.P.dmg * up, owner: h });
        ring(G, h.x, h.y, 120 * up, '#8a2a22', 0.3, true);
        break;
      case 'horse':
        for (i = 0; i < 18; i++) {
          var a = i / 18 * PI2;
          G.projs.push({ x: h.x, y: h.y, vx: cos(a) * 520, vy: sin(a) * 520, dmg: heroDmg(G, h, 70 * up), crit: G._crit, r: 9, life: 0.9, pierce: 5, hits: [], kind: 'water', src: h });
        }
        ring(G, h.x, h.y, 90, '#3a3226', 0.28, true);
        break;
      case 'tang':                                    // 只回血，不复活阵亡的队友
        G.heroes.forEach(function (o) {
          if (o.down) return;
          healHero(G, o, o.maxHp * 0.5, true);
          if (o.id !== 'tang') o.inv = Math.max(o.inv, 1.5);   // 唐僧不吃任何加成：没有这点无敌
        });
        ring(G, h.x, h.y, 140, '#8a2a22', 0.32, true); G.shake = 6;
        G.grid.query(h.x, h.y, 230, function (e) {
          if (G.station) { var dx0 = e.x - h.x, dy0 = e.y - h.y, dl0 = sqrt(dx0 * dx0 + dy0 * dy0) || 1, kr = 700 * (1 - e.def.knockRes); e.kx += dx0 / dl0 * kr; e.ky += dy0 / dl0 * kr; }   // 驻守时只震退，不造成伤害
          else hurtEnemy(G, e, heroDmg(G, h, 50 * up), { src: h, kb: 700, fx: h.x, fy: h.y, crit: G._crit });
        });
        break;
      default: if (h.sp && XY.specialUlt) XY.specialUlt(G, h);
    }
    banner(G, h.def.name + '：' + h.def.ult + '！', 1.0);
    return true;
  }
  XY.castUlt = castUlt;

  // 换人：被选中的英雄变成“手动”；原来操控的英雄回到它最后一次的自动命令
  XY.switchHero = function (G, i) {
    if (G.mode !== 'play' || i === G.ctrl) return;
    var h = G.heroes[i];
    if (!h) return;
    if (i === 0) { toast(G, '唐僧自己赶路，任何输入都控制不了他'); return; }
    if (h.down) { toast(G, h.def.name + ' 已阵亡，本局不能再出战'); return; }
    G.ctrl = i;
    ring(G, h.x, h.y, 36, h.def.color, 0.35);
  };

  // 给自动英雄下命令（手动英雄也可以先设好，等他松手后生效）
  XY.setOrder = function (G, i, order) {
    var h = G.heroes[i];
    if (!h || XY.ORDERS.indexOf(order) < 0) return false;
    if (i === 0) { toast(G, '唐僧自己赶路，不接受命令'); return false; }
    if (h.down) { toast(G, h.def.name + ' 已阵亡，不能再下命令'); return false; }
    if (order === 'guard' && h.id === 'tang') { toast(G, '唐僧不能守护自己，请选别的命令'); return false; }
    h.order = order; h.retreat = false; h.tgt = null;
    toast(G, h.def.name + '：' + XY.ORDER_NAME[order] + (G.ctrl === i ? '（你正在操控他，松手后生效）' : ''));
    return true;
  };
  XY.cycleOrder = function (G, i) {
    var h = G.heroes[i]; if (!h) return false;
    if (i === 0) { toast(G, '唐僧自己赶路，不接受命令'); return false; }
    if (h.down) { toast(G, h.def.name + ' 已阵亡，不能再下命令'); return false; }
    var k = XY.ORDERS.indexOf(h.order), n = XY.ORDERS.length;
    for (var t = 1; t <= n; t++) {
      var o = XY.ORDERS[(k + t) % n];
      if (o === 'guard' && h.id === 'tang') continue;
      return XY.setOrder(G, i, o);
    }
    return false;
  };

  /* ================= 敌人 ================= */
  // 目标优先级：唐僧 / 徒弟 / 营地 > 天兵（天兵永远是最后的目标）。
  // 英雄或营地在警戒范围内就打他们；只有警戒范围内没有任何英雄时才会转去打天兵。
  function pickTarget(G, e) {
    var nh = G.heroes, d = e.def, best = null, bd = Infinity, j, h, ddx, ddy, dd;
    var lure = XY.spsupLure(G, e); if (lure) return lure;           // 人菜话多 / 截图分身：把怪引到自己身上
    if (e.vtauntT > G.t && e.vtaunt && !e.vtaunt.dead) return e.vtaunt;     // v0.9 牛魔王召的小妖：嘲讽附近的怪
    for (j = 1; j < G.heroes.length; j++) {                          // 钉耙挡灾的嘲讽：范围内的妖怪只打他
      h = nh[j]; if (h.down || !(h.taunt > 0)) continue;
      if (XY.dist(h.x, h.y, e.x, e.y) < C.TAUNT_R) return h;
    }
    for (j = 0; j < G.heroes.length; j++) {
      h = nh[j]; if (h.down || h.ridden) continue;      // 正在被骑的白龙马不会被妖怪盯上
      ddx = h.x - e.x; ddy = h.y - e.y; dd = ddx * ddx + ddy * ddy;
      if (j === 0) { if (d.boss && XY.bossBarrier(G)) continue; dd *= C.TANG_TARGET_W; }          // 唐僧在“距离”上显得更远：妖怪优先找别人，除非他离得明显更近
      else if (h.order === 'guard' && XY.dist(h.x, h.y, nh[0].x, nh[0].y) < 280) dd *= C.GUARD_TAUNT;   // 守护师傅的英雄把怪引到自己身上
      if (dd < bd) { bd = dd; best = h; }
    }
    if (best && XY.dist(best.x, best.y, e.x, e.y) <= C.ALLY_AGGRO) return best;
    var al = null, ad = C.ALLY_AGGRO;
    for (j = 0; j < G.allies.length; j++) {
      var a = G.allies[j]; if (a.dead) continue;
      var dl = XY.dist(a.x, a.y, e.x, e.y); if (dl < ad) { ad = dl; al = a; }
    }
    for (j = 0; j < G.towers.length && !(G.td && G.td.on); j++) {                // 天兵层：妖怪不拿天兵当目标
      var tw0 = G.towers[j], dl2 = XY.dist(tw0.x, tw0.y, e.x, e.y); if (dl2 < ad) { ad = dl2; al = tw0; }
    }
    return al || best;
  }
  XY.pickTarget = pickTarget;

  // 妖塔：建好后向射程内的 英雄 / 我方塔 开火，最后才打天兵
  function etowerAI(G, e, dt) {
    var den = G.dens[e.den];
    if (e.building > 0) {
      e.building -= dt;
      if (e.building <= 0) { e.building = 0; ring(G, e.x, e.y, 90, '#8a5fc0', 0.5, true); text(G, e.x, e.y - 34, '妖塔建成', 'big'); }
      return;
    }
    if (e.fire > 0) e.fire -= dt;
    e.shootT -= dt; if (e.shootT > 0) return;
    var R = C.ETOWER_RANGE, best = null, bd = Infinity, i, o, dd;
    for (i = 0; i < G.heroes.length; i++) {
      o = G.heroes[i]; if (o.down || (i === 0 && false)) continue;
      dd = XY.dist(o.x, o.y, e.x, e.y); if (dd < R && dd < bd) { bd = dd; best = o; }
    }
    if (!best && !(G.td && G.td.on)) {                                            // 天兵层：妖塔也不打天兵
      var soldiers = XY.soldiersOf(G);
      for (i = 0; i < soldiers.length; i++) {
        o = soldiers[i]; dd = XY.dist(o.x, o.y, e.x, e.y); if (dd < R && dd < bd) { bd = dd; best = o; }
      }
    }
    if (!best) { e.shootT = 0.25; return; }
    var dx = best.x - e.x, dy = best.y - e.y, l = sqrt(dx * dx + dy * dy) || 1;
    G.eprojs.push({ x: e.x, y: e.y - 20, vx: dx / l * 260, vy: dy / l * 260, dmg: e.dmg, r: 7, life: R / 260 + 0.3, src: 'etower', dt: 'magic', el: 'earth' });
    e.shootT = C.ETOWER_CD; e.fire = 0.2;
  }

  // ===== BOSS 狂暴（v0.6.4）=====
  // 倒计时：BOSS 第一次出洞迎战（engaged）时起算，之后不暂停、不重置（躲洞 / 败退 / 回洞都照走）；到点没打死 → 狂暴一次（只一次，不叠加）。
  XY.enrageSeconds = function (e) { return C.BOSS_ENRAGE_BY[e.type] || C.BOSS_ENRAGE_T; };
  function enrageTick(G, e, dt) {
    if (G.tut || e.enraged || e.dead) return;
    if (e.enrageT === undefined) { if (!e.engaged) return; e.enrageT = XY.enrageSeconds(e); e.enrageW = 0; }
    var before = e.enrageT; e.enrageT -= dt;
    if (before > C.ENRAGE_WARN1 && e.enrageT <= C.ENRAGE_WARN1) { toast(G, e.def.name + ' 还有 ' + C.ENRAGE_WARN1 + ' 秒就要狂暴！'); if (XY.sfx) XY.sfx('danger'); }
    if (before > C.ENRAGE_WARN2 && e.enrageT <= C.ENRAGE_WARN2) { banner(G, e.def.name + ' 10 秒后狂暴！快打！', 2.5); if (XY.sfx) XY.sfx('danger'); }
    if (e.enrageT <= 0) enrageBoss(G, e);
  }
  function enrageBoss(G, e) {
    if (e.enraged) return;                                                   // 只狂暴一次，不叠加
    var m = C.BOSS_ENRAGE_MUL;
    e.enraged = true; e.enrageT = 0; e.enrageAt = G.t;
    e.maxHp *= m; e.hp *= m; e.baseHp *= m;                                  // 血量上限 / 当前血量按比例翻倍（成长基数一起翻倍）
    e.baseDmg *= m; e.dmg *= m;                                              // 伤害翻倍：身体接触 / 弹幕 / 震地 / 冲锋都按 e.dmg 折算
    e.flash = 0.4;
    banner(G, e.def.name + ' 狂暴了！数值 ×' + m + '，小怪出量 ×' + C.ENRAGE_SPAWN_MUL, 4);
    toast(G, e.def.name + ' 狂暴：血量 / 伤害 / 出招速度 ×' + m);
    ring(G, e.x, e.y, 220, '#2a2118', 0.55, false); ring(G, e.x, e.y, 120, '#8d1f18', 0.35, false);
    G.shake = Math.max(G.shake, 14);
    G.stats.enrages = (G.stats.enrages || 0) + 1;
    if (XY.sfx) XY.sfx('enrage');
  }
  XY.enrageBoss = enrageBoss;
  // 当前出怪倍率：任何一个活着的 BOSS 处于狂暴 → ×2（含躲在洞里的），BOSS 被打死后自动回到 ×1
  XY.enrageSpawnMul = function (G) {
    for (var i = 0; i < G.dens.length; i++) { var b = G.dens[i].boss; if (b && !b.dead && b.enraged) return C.ENRAGE_SPAWN_MUL; }
    return 1;
  };
  // HUD 要显示的那只：优先离操控英雄最近的出战 BOSS，其次剩余时间最少的在倒数 / 已狂暴的
  XY.enrageFocus = function (G) {
    var best = null, i, b;
    if (G.boss && !G.boss.dead && (G.boss.enrageT !== undefined)) return G.boss;
    for (i = 0; i < G.dens.length; i++) { b = G.dens[i].boss; if (!b || b.dead || b.enrageT === undefined) continue; if (!best || (b.enraged ? -1 : b.enrageT) < (best.enraged ? -1 : best.enrageT)) best = b; }
    return best;
  };

  function updateEnemies(G, dt) {
    var list = G.enemies, camp = G.camp, nh = G.heroes, i, j, k, cgoal = camp.active ? camp : { x: nh[0].x, y: nh[0].y, r: nh[0].def.r };
    G.boss = null;
    for (i = 0; i < G.dens.length; i++) { var db = G.dens[i].boss; if (db && !db.dead && db.engaged) { if (!G.boss || XY.dist(db.x, db.y, nh[G.ctrl].x, nh[G.ctrl].y) < XY.dist(G.boss.x, G.boss.y, nh[G.ctrl].x, nh[G.ctrl].y)) G.boss = db; } }
    for (i = 0; i < list.length; i++) {
      var e = list[i]; if (e.dead) continue;
      var d = e.def;
      if (e.flash > 0) e.flash -= dt;
      if (e.markT > 0) e.markT -= dt;
      // 灼烧
      if (e.btcT > 0) { XY.btcBurnTick(G, e, dt); if (e.dead) continue; }       // Phyrex 的 BTC 灼烧（烧死了就不再移动 / 接触伤害）
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnAcc += dt;
        if (e.burnAcc >= 0.5) { e.burnAcc -= 0.5; hurtEnemy(G, e, e.burnDps * 0.5, { dot: true, type: 'magic', elem: 'fire' }); if (e.dead) continue; }
      }
      var spdMul = 1;
      if (e.slowT > 0) { e.slowT -= dt; spdMul = 1 - e.slowF; if (e.slowT <= 0) e.slowF = 0; }
      if (e.stunT > 0) { e.stunT -= dt; spdMul = 0; }

      // 洞府 BOSS：+5%/分钟持续成长（血量上限和当前血量一起涨，放任不管会越来越强）
      if (d.denBoss) {
        enrageTick(G, e, dt);
        var inc = e.baseHp * C.BOSS_SCALE * dt / 60;
        e.hp += inc; e.maxHp += inc; e.dmg = e.baseDmg * (1 + C.BOSS_SCALE * G.t / 60) * (e.raidDmg || 1);
      }
      if (d.etower) { if (e.lt) XY.lairTowerAI(G, e, dt); else etowerAI(G, e, dt); continue; }       // v0.9 洞府塔：自己的 AI（villain_lair.js）
      if (d.fly) { XY.fly.tick(G, e, dt, spdMul); continue; }                     // v0.8.4 飞妖：自己的一套（js/fly.js），不挤开、不碰撞
      if (e.affix) XY.affixTick(G, e, dt);
      // 选目标：随机一部分冲营地，其余按优先级找（英雄 > 天兵）
      e.retarget -= dt;
      if (e.retarget <= 0) { e.retarget = 0.35 + Math.random() * 0.2; e.th = pickTarget(G, e); }
      if (e.th && (e.th.down || e.th.dead)) e.th = null;
      var tx, ty, tr;
      if (e.toCamp || !e.th) { tx = cgoal.x; ty = cgoal.y; tr = cgoal.r; }
      else { tx = e.th.x; ty = e.th.y; tr = e.th.def ? e.th.def.r : C.SOLDIER_R; }
      var dx = tx - e.x, dy = ty - e.y, dist = sqrt(dx * dx + dy * dy) || 1;
      var mvx = 0, mvy = 0;

      if (d.denBoss) { bossAI(G, e, dt, dx / dist, dy / dist, dist); continue; }

      if (d.range) {                                   // 远程：保持距离并射击
        if (dist > d.keep) { mvx = dx / dist; mvy = dy / dist; }
        else if (dist < d.keep * 0.6) { mvx = -dx / dist; mvy = -dy / dist; }
        if (e.stunT <= 0 && dist < d.range) {
          e.shootT -= dt;
          if (e.shootT <= 0) {
            e.shootT = 2.6 + Math.random() * 0.8;
            G.eprojs.push({ x: e.x, y: e.y, vx: dx / dist * 210, vy: dy / dist * 210, dmg: e.dmg, r: 6, life: 3, dt: d.dtype, el: e.elem });
          }
        }
      } else if (dist > e.r + tr - 4) { mvx = dx / dist; mvy = dy / dist; }

      var sp = e.speed * spdMul;
      e.x += mvx * sp * dt + e.kx * dt; e.y += mvy * sp * dt + e.ky * dt;
      var kd = exp(-8 * dt); e.kx *= kd; e.ky *= kd;

      // 挤开旁边的敌人（用网格找邻居）
      var g = G.grid, cs = g.cell, cx = Math.floor(e.x / cs), cy = Math.floor(e.y / cs);
      for (var ny = cy - 1; ny <= cy + 1; ny++) {
        if (ny < 0 || ny >= g.rows) continue;
        for (var nx = cx - 1; nx <= cx + 1; nx++) {
          if (nx < 0 || nx >= g.cols) continue;
          var cell = g.cells[ny * g.cols + nx];
          for (k = 0; k < cell.length; k++) {
            var o = cell[k]; if (o === e || o.dead) continue;
            var ox = e.x - o.x, oy = e.y - o.y, md = (e.r + o.r) * 0.85, d2 = ox * ox + oy * oy;
            if (d2 < md * md && d2 > 0.01) { var dl = sqrt(d2), pu = (md - dl) * 0.35; e.x += ox / dl * pu; e.y += oy / dl * pu; }
            else if (d2 <= 0.01) { e.x += Math.random() - 0.5; e.y += Math.random() - 0.5; }
          }
        }
      }
      e.x = clamp(e.x, 10, C.WORLD_W - 10); e.y = clamp(e.y, 10, C.WORLD_H - 10);

      // 接触伤害：碰到英雄或营地就咬一口
      e.atkT -= dt;
      if (e.atkT <= 0 && e.stunT <= 0) {
        var hit = false;
        for (j = 0; j < G.heroes.length; j++) {
          var hh = nh[j]; if (hh.down) continue;
          var rx = hh.x - e.x, ry = hh.y - e.y, rr = e.r + hh.def.r;
          if (rx * rx + ry * ry < rr * rr) { if (hh.contactT > 0) continue; hurtHeroBy(G, hh, e.dmg, true, undefined, d.dtype, e.elem); hit = true; break; }
        }
        if (!hit && camp.active) {
          var cxx = camp.x - e.x, cyy = camp.y - e.y, crr = e.r + camp.r;
          if (cxx * cxx + cyy * cyy < crr * crr) { hurtCamp(G, e.dmg * 0.3); hit = true; }
        }
        if (!hit) {                                     // 天兵只有“挡了路”（碰到了身体）才会被咬，优先级最低
          var sol = XY.soldiersOf(G);
          for (j = 0; j < sol.length; j++) {
            var al = sol[j];
            var ax = al.x - e.x, ay = al.y - e.y, ar = e.r + (al.type ? C.SOLDIER_R : al.def.r);
            if (ax * ax + ay * ay < ar * ar) { XY.hurtSoldier(G, al, e.dmg * (al.type ? 0.8 : 1)); hit = true; break; }
          }
        }
        if (hit) e.atkT = 0.8;
      }
    }
    // 清理已死亡的敌人（原地压缩数组）
    var w = 0;
    for (i = 0; i < list.length; i++) if (!list[i].dead) list[w++] = list[i];
    list.length = w;
  }

  /* ---------- Boss：冲锋 / 弹幕 / 召唤 三招轮换 ---------- */
  // 佛光结界：只要还有徒弟活着，牛魔王就近不了师父（它的弹幕射程也到不了），只能追着徒弟打——Boss 战是徒弟们的事
  XY.bossBarrier = function (G) {
    for (var i = 1; i < G.heroes.length; i++) if (!G.heroes[i].down) return !G.heroes[0].down;
    return false;
  };
  function bossKeepAway(G, e) {
    if (!XY.bossBarrier(G)) return;
    var t = G.heroes[0], dx = e.x - t.x, dy = e.y - t.y, d = sqrt(dx * dx + dy * dy) || 1;
    if (d < C.BOSS_KEEP) { e.x = t.x + dx / d * C.BOSS_KEEP; e.y = t.y + dy / d * C.BOSS_KEEP; }
  }

  // 每个洞府 BOSS 的招式轮换：charge 冲锋 / shot 弹幕 / summon 召唤 / slam 震地
  var KITS = {
    bull: ['charge', 'shot', 'summon'], bear: ['charge', 'slam', 'summon'], bone: ['shot', 'summon', 'charge'],
    jin: ['shot', 'summon', 'charge'], red: ['charge', 'shot', 'charge'], yellow: ['shot', 'slam', 'summon'],
    iron: ['slam', 'shot', 'summon'], yumian: ['summon', 'shot', 'charge'], chiyan: ['charge', 'slam', 'shot']
  };

  function bossAI(G, e, dt, ux, uy, dist) {
    var th = e.th, cd = (e.phase === 2 ? 3.2 : 4.6) / (e.enraged ? C.BOSS_ENRAGE_MUL : 1), name = e.def.name, kit = KITS[e.def.kit] || KITS.bull;
    if (e.flash > 0) e.flash -= dt;
    // —— 洞府守卫：有英雄靠近（850）才出来迎战；追出 1250 太远就回洞口并回血 ——
    var nd = Infinity, i, hh0;
    for (i = 0; i < G.heroes.length; i++) {                                    // v0.5 第 4 批：唐僧自己路过不惊动洞主（要近到 DEN_AGGRO_TANG 才算）；徒弟 / 特殊角色靠近 850 才会“引”出洞主
      hh0 = G.heroes[i]; if (hh0.down) continue;
      var d0 = XY.dist(hh0.x, hh0.y, e.x, e.y); if (i === 0) d0 = d0 * (C.DEN_AGGRO / C.DEN_AGGRO_TANG);
      if (d0 < nd) nd = d0;
    }
    if (G.td && G.td.on) { for (i = 0; i < G.towers.length; i++) { var dTw = XY.dist(G.towers[i].x, G.towers[i].y, e.x, e.y); if (dTw < nd) nd = dTw; } }
    if (!e.home) e.home = { x: e.x, y: e.y };
    var hd = XY.dist(e.x, e.y, e.home.x, e.home.y);
    if (e.retreatT > 0) {                               // 败退：无敌，朝洞口跑，到洞口后继续养伤，时间到恢复血量再出来
      e.retreatT -= dt; e.engaged = false; e.bstate = 'idle'; e.stunT = 0;
      if (hd <= 12) e.hidden = true;                    // 跑到洞口 = 躲进洞里，这时才打不到
      if (hd > 12) { var rx0 = (e.home.x - e.x) / hd, ry0 = (e.home.y - e.y) / hd; e.x += rx0 * e.speed * 2.2 * dt; e.y += ry0 * e.speed * 2.2 * dt; }
      if (e.retreatT <= 0) { e.hidden = false; e.hp = Math.max(e.hp, e.maxHp * C.RETREAT_HEAL); text(G, e.x, e.y - e.r - 20, '养好伤了', 'heal'); }
      return;
    }
    if (!e.engaged) {
      if (nd < C.DEN_AGGRO) { e.engaged = true; if (XY.anim) XY.anim.bossIn(G, e); e.bt = Math.max(e.bt, 1.2); toast(G, name + ' 出洞迎战！'); ring(G, e.x, e.y, 120, e.def.color, 0.6); G.shake = Math.max(G.shake, 4); G.stats.drawOuts = (G.stats.drawOuts || 0) + 1; }
    } else if ((nd > C.DEN_LEASH || hd > C.DEN_LEASH) && !(e.raid > G.t)) e.engaged = false;     // 出征中不受“追出太远就回洞”限制
    if (!e.engaged) {
      e.bstate = 'idle'; e.stunT = 0;
      if (hd > 12) { var hx = (e.home.x - e.x) / hd, hy = (e.home.y - e.y) / hd; e.x += hx * e.speed * 1.3 * dt; e.y += hy * e.speed * 1.3 * dt; }
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
      return;
    }
    if (e.stunT > 0) { e.stunT -= dt; bossKeepAway(G, e); return; }   // 撞晕了：什么都不做
    if (e.hp < e.maxHp * 0.5 && e.phase === 1) { e.phase = 2; banner(G, name + '发怒了！', 3); ring(G, e.x, e.y, 150, '#ff5a3c', 0.6, true); G.shake = 10; }
    var spdMul = e.slowT > 0 ? 1 - e.slowF : 1;
    if (e.slowT > 0) { e.slowT -= dt; }
    var mvx = 0, mvy = 0, sp = e.speed * spdMul, dmgR = e.dmg / e.def.dmg;
    e.bt -= dt;
    if (XY.v07b) XY.v07b.bossSig(G, e, dt);                       // v0.7b：黑熊精「抡山落石」红圈预告
    if (e.bstate === 'idle') {
      if (dist > e.r + 20) { mvx = ux; mvy = uy; }
      if (e.bt <= 0) {
        var skill = kit[e.bi++ % 3];
        if (skill === 'charge' && th) {                // 冲锋：先画出预警线
          e.bstate = 'tele'; e.bt = 1.0;
          var ddx = th.x - e.x, ddy = th.y - e.y, l = sqrt(ddx * ddx + ddy * ddy) || 1;
          e.cdx = ddx / l; e.cdy = ddy / l;
        } else if (skill === 'slam') {                 // 震地：先画出圈，0.9 秒后落下
          e.bstate = 'slam'; e.bt = 0.9; e.slamR = 170;
        } else if (skill === 'shot' || skill === 'charge') {   // 弹幕
          var n = e.phase === 2 ? 24 : 16, off = Math.random() * PI2;
          for (i = 0; i < n; i++) {
            var a = off + i / n * PI2;
            G.eprojs.push({ x: e.x, y: e.y, vx: cos(a) * 190, vy: sin(a) * 190, dmg: 10 * dmgR, r: 8, life: C.BOSS_BULLET_LIFE, boss: true, dt: e.def.dtype, el: e.elem });
          }
          ring(G, e.x, e.y, 90, e.def.color, 0.4);
          e.bt = cd;
        } else {                                       // 召唤小弟（属于这个洞府，洞府被镇灭时一起消散）
          banner(G, name + '召唤了小妖！', 2);
          for (var s = 0; s < 8 + (e.phase === 2 ? 4 : 0) && G.enemies.length < C.MAX_ENEMIES; s++) {
            var aa = s / 8 * PI2; makeEnemy(G, s % 4 === 0 ? e.def.summon : 'small', e.x + cos(aa) * 110, e.y + sin(aa) * 110, e.den);
          }
          ring(G, e.x, e.y, 120, e.def.color, 0.4);
          e.bt = cd;
        }
      }
    } else if (e.bstate === 'slam') {
      if (e.bt <= 0) {
        ring(G, e.x, e.y, e.slamR, '#ff7a3c', 0.5, true); G.shake = Math.max(G.shake, 8);
        for (i = 0; i < G.heroes.length; i++) {
          hh0 = G.heroes[i]; if (hh0.down) continue;
          if (XY.dist(e.x, e.y, hh0.x, hh0.y) < e.slamR + hh0.def.r) hurtHeroBy(G, hh0, 26 * dmgR, false, name + '的震地波及了师父', e.def.dtype, e.elem);
        }
        G.towers.forEach(function (t) { if (XY.dist(e.x, e.y, t.x, t.y) < e.slamR) hurtTower(G, t, 40 * dmgR); });
        e.bstate = 'idle'; e.bt = cd;
      }
    } else if (e.bstate === 'tele') {
      if (e.bt <= 0) { e.bstate = 'charge'; e.bt = 0.75; e.hitHeroes = {}; }
    } else if (e.bstate === 'charge') {
      mvx = e.cdx; mvy = e.cdy; sp = 540;
      for (var j = 0; j < G.heroes.length; j++) {                    // 冲锋撞到的英雄吃一大口
        var h = G.heroes[j]; if (h.down || e.hitHeroes[j]) continue;
        if (XY.dist(e.x, e.y, h.x, h.y) < e.r + h.def.r) {
          e.hitHeroes[j] = true; hurtHeroBy(G, h, 30 * dmgR, false, name + '的冲锋撞倒了师父', e.def.dtype, e.elem);
          if (j !== 0) {                               // 冲锋撞上挡路的英雄：被拦住并晕一会儿（这就是“守护师傅”的用处）
            e.bstate = 'idle'; e.bt = cd + 0.8; e.stunT = 1.4; e.flash = 0.2; ring(G, e.x, e.y, 90, '#ffd34d', 0.45, true); G.shake = Math.max(G.shake, 6);
            toast(G, h.def.name + ' 拦住了' + name + '的冲锋！'); break;
          }
        }
      }
      if (e.bt <= 0) { e.bstate = 'idle'; e.bt = cd; }
    }
    e.x = clamp(e.x + mvx * sp * dt, e.r, C.WORLD_W - e.r);
    e.y = clamp(e.y + mvy * sp * dt, e.r, C.WORLD_H - e.r);
    bossKeepAway(G, e);
    // 身体接触
    e.atkT -= dt;
    if (e.atkT <= 0) {
      for (var q = 0; q < G.heroes.length; q++) {
        var hh = G.heroes[q]; if (hh.down) continue;
        if (XY.dist(e.x, e.y, hh.x, hh.y) < e.r + hh.def.r) { hurtHeroBy(G, hh, e.dmg, true, hh.id === 'tang' ? name + '碰到了师父' : undefined, e.def.dtype, e.elem); e.atkT = 0.8 / (e.enraged ? C.BOSS_ENRAGE_MUL : 1); break; }
      }
      var cc = G.camp;
      if (cc.active && XY.dist(e.x, e.y, cc.x, cc.y) < e.r + cc.r) { hurtCamp(G, e.dmg); e.atkT = 0.8 / (e.enraged ? C.BOSS_ENRAGE_MUL : 1); }
    }
  }

  /* ================= 防御塔 ================= */
  XY.towerStat = function (G, t) {
    var d = XY.TOWERS[t.type], m = 1 + 0.5 * (t.lv - 1);
    return { dmg: d.dmg * m * G.P.tower, range: d.range * (1 + 0.1 * (t.lv - 1)), cd: d.cd * (t.lv === 3 ? 0.85 : 1) };
  };

  function mkTowerObj(type, x, y) {
    var hp = XY.TOWER_HP[type];
    return { x: x, y: y, type: type, lv: 1, cd: 0.5, ang: 0, pulse: 0, hp: hp, maxHp: hp, upT: 0, bornT: 0.6, hurtT: 0 };
  }
  XY.towerMaxHp = function (t) { return XY.TOWER_HP[t.type] * (1 + 0.5 * (t.lv - 1)); };

  // 塔受伤（只有妖塔 / 洞府 BOSS 的震地能伤到）。塔永远不能收回，被打爆是它唯一消失的方式
  function hurtTower(G, t, dmg) {
    if (G && G.td && G.td.on) return;                 // 天兵层：妖怪打不到天兵
    if (G.godMode) return;
    if (t.treatT > 0 && C.SOLBUFF) dmg *= 1 - C.SOLBUFF.treat.dr;           // v0.8.3：犒赏期间受伤 −20%
    t.hp -= dmg; t.hurtT = 0.25;
    text(G, t.x, t.y - 30, Math.round(dmg), 'hurt');
    if (t.hp <= 0) {
      var k = G.towers.indexOf(t); if (k >= 0) G.towers.splice(k, 1);
      t.dead = true; G.stats.towersLost++;
      ring(G, t.x, t.y, 60, '#777', 0.5, true); spark(G, t.x, t.y, '#8a6a4a', 12);
      toast(G, XY.TOWERS[t.type].name + '战死了！');
    }
  }
  XY.hurtTower = hurtTower; XY.hurtHeroBy = hurtHeroBy;

  function updateTowers(G, dt) {
    for (var i = 0; i < G.towers.length; i++) {
      var t = G.towers[i], d = XY.TOWERS[t.type], s = XY.towerStat(G, t);
      if (t.hurtT > 0) t.hurtT -= dt;
      if (t.upT > 0) t.upT -= dt;
      if (t.bornT > 0) t.bornT -= dt;
      if (t.atkT > 0) t.atkT -= dt;                    // 出手动作计时（画面用）
      t.cd -= dt;
      if (t.cd > 0) continue;
      if (t.type === 'heal') {                         // 佛光塔：每 1.5 秒脉冲一次，给范围内的徒弟 / 营地 / 友塔回血
        t.cd = s.cd; var healed = false, j;
        for (j = 1; j < G.heroes.length; j++) {
          var hj = G.heroes[j]; if (hj.down) continue;
          if (XY.dist(hj.x, hj.y, t.x, t.y) <= s.range && hj.hp < hj.maxHp) { healHero(G, hj, hj.maxHp * d.heal * (1 + 0.3 * (t.lv - 1)), true); healed = true; }
        }
        if (G.camp.active && XY.dist(G.camp.x, G.camp.y, t.x, t.y) <= s.range + G.camp.r && G.camp.hp < G.camp.maxHp) { G.camp.hp = Math.min(G.camp.maxHp, G.camp.hp + 8 * t.lv); healed = true; }
        for (j = 0; j < G.towers.length; j++) {
          var o = G.towers[j]; if (o === t) continue;
          var mh = XY.towerMaxHp(o);
          if (o.hp < mh && XY.dist(o.x, o.y, t.x, t.y) <= s.range) { o.hp = Math.min(mh, o.hp + mh * 0.1); healed = true; }
        }
        if (healed) { t.pulse = 0.5; t.atkT = 0.3; ring(G, t.x, t.y, s.range, '#f2c14e', 0.5); }
        continue;
      }
      if (t.type === 'frost') {
        t.cd = s.cd; var any = false;
        G.grid.query(t.x, t.y, s.range, function (e) {
          any = true; e.slowT = Math.max(e.slowT, 0.9); e.slowF = Math.max(e.slowF, d.slow * (e.def.boss ? 0.5 : 1));
          hurtEnemy(G, e, s.dmg, { dot: true, type: 'magic', elem: 'water', kind: 'frost' });
        });
        if (any) { t.pulse = 0.4; t.atkT = 0.3; }
        continue;
      }
      var tgt = null;
      if (t.type === 'siege') {                         // 破阵弩：优先点射程内的妖塔
        var bd = Infinity;
        G.grid.query(t.x, t.y, s.range, function (e) { if (e.def.etower) { var dd = XY.dist(e.x, e.y, t.x, t.y); if (dd < bd) { bd = dd; tgt = e; } } });
      }
      if (!tgt) tgt = (G.threat && !G.threat.dead && XY.dist(G.threat.x, G.threat.y, t.x, t.y) <= s.range && XY.dist(G.threat.x, G.threat.y, G.heroes[0].x, G.heroes[0].y) < C.CAMP_ZONE_R + 40) ? G.threat : G.grid.nearest(t.x, t.y, s.range);   // 营地圈里的妖怪优先
      if (!tgt) { t.cd = 0.1; continue; }
      var a = atan2(tgt.y - t.y, tgt.x - t.x);
      t.ang = a; t.atkT = 0.3;
      if (t.type === 'arrow') {
        G.projs.push({ x: t.x, y: t.y - 14, vx: cos(a) * 560, vy: sin(a) * 560, dmg: s.dmg, r: 5, life: 0.9, pierce: 0, hits: [], kind: 'arrow', src: null });
      } else if (t.type === 'siege') {
        G.projs.push({ x: t.x, y: t.y - 14, vx: cos(a) * 700, vy: sin(a) * 700, dmg: s.dmg, r: 8, life: s.range / 700 + 0.15, pierce: 1, hits: [], kind: 'bolt', anti: d.anti, src: null });
      } else {
        G.projs.push({ x: t.x, y: t.y - 14, vx: cos(a) * 380, vy: sin(a) * 380, dmg: s.dmg, r: 7, life: 1.2, pierce: 0, hits: [], kind: 'shell', splash: d.splash * (1 + 0.1 * (t.lv - 1)), src: null });
      }
      t.cd = s.cd;
    }
  }

  // 造塔：点“造塔”按钮选塔型，再点地面（x,y 是世界坐标）；一路上都能造，只要离操控英雄 / 师父不太远（或在营地附近）
  XY.buildReach = function (G, x, y) {
    var c = G.heroes[G.ctrl], t = G.heroes[0];
    if (!c.down && XY.dist(x, y, c.x, c.y) <= C.BUILD_REACH) return true;
    if (!t.down && XY.dist(x, y, t.x, t.y) <= C.BUILD_REACH) return true;
    return XY.dist(x, y, t.x, t.y) <= C.TOWER_RANGE_FROM_CAMP;
  };
  XY.towerBlock = function (G, type, x, y) {
    var d = XY.TOWERS[type], camp = G.camp, i;
    if (G.towers.length >= (XY.soldierCap ? XY.soldierCap(G) : C.MAX_TOWERS)) return '塔已经满了';
    if (x < 40 || y < 40 || x > C.WORLD_W - 40 || y > C.WORLD_H - 40) return '地图边缘不能造塔';
    if (!XY.buildReach(G, x, y)) return '离队伍太远了：塔要造在操控英雄或师父身边 ' + C.BUILD_REACH + ' 以内（或营地附近）';
    if (camp.active && XY.dist(x, y, camp.x, camp.y) < camp.r + 34) return '这里是营地，点远一点的空地';
    for (i = 0; i < G.dens.length; i++) if (XY.dist(x, y, G.dens[i].x, G.dens[i].y) < C.DEN_NOBUILD) return '离洞府太近了，不能造塔';
    for (i = 0; i < G.towers.length; i++) if (XY.dist(x, y, G.towers[i].x, G.towers[i].y) < (G.tut ? 18 : 32)) return '这里太挤了，换个位置（点已有的塔可以升级）';
    if (G.coins < d.cost) return '金币不够：' + d.name + '要 ' + d.cost + ' 金币';
    return null;
  };
  XY.placeTower = function (G, type, x, y) {
    if (G.mode !== 'play') return false;
    var d = XY.TOWERS[type], h = G.heroes[G.ctrl];
    if (x === undefined) { if (h.down) return false; x = h.x + cos(h.face) * 38; y = h.y + sin(h.face) * 38; }
    var why = XY.towerBlock(G, type, x, y);
    if (why) { toast(G, why); return false; }
    G.coins -= d.cost;
    G.towers.push(mkTowerObj(type, x, y));
    ring(G, x, y, 40, d.color, 0.4, true);
    if (XY.sfx) XY.sfx('place');
    return true;
  };
  XY.towerAt = function (G, x, y, r) {
    var best = null, bd = r || 34;
    G.towers.forEach(function (t) { var d = XY.dist(x, y, t.x, t.y); if (d < bd) { bd = d; best = t; } });
    return best;
  };
  // 升级一座塔（点塔弹出的“升级”按钮）；不给塔时升级离当前英雄最近的（只给测试/模拟用）
  XY.upgradeTower = function (G, t) {
    if (G.mode !== 'play') return false;
    var h = G.heroes[G.ctrl];
    if (!t) t = XY.towerAt(G, h.x, h.y, 90);
    if (!t) { toast(G, '附近没有塔'); return false; }
    if (t.lv >= 3) { toast(G, '这座塔已经满级了'); return false; }
    var cost = XY.TOWER_UP_COST[t.lv + 1];
    if (G.coins < cost) { toast(G, '升级要 ' + cost + ' 金币'); return false; }
    G.coins -= cost; t.lv++;
    var mh = XY.towerMaxHp(t); t.hp = Math.min(mh, t.hp + mh * 0.35); t.maxHp = mh;
    t.upT = 1.0; if (t.lv === 3) G.stats.tower3 = true;
    ring(G, t.x, t.y, 70, '#ffd24a', 0.6, true); ring(G, t.x, t.y, 110, '#fff3b0', 0.8);
    spark(G, t.x, t.y, '#ffd24a', 14); G.shake = Math.max(G.shake, 3);
    text(G, t.x, t.y - 56, '升级 Lv' + t.lv, 'big');
    if (XY.sfx) XY.sfx('upgrade');
    return true;
  };

  /* ================= 子弹 ================= */
  function updateProjs(G, dt) {
    var P = G.projs, i, w = 0;
    for (i = 0; i < P.length; i++) {
      var p = P[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (XY.vfx) XY.vfx.trail(G, p, dt);                      // v0.7：弹丸拖尾
      var alive = p.life > 0;
      if (alive) {
        G.grid.query(p.x, p.y, p.r, function (e) {
          if (!alive || p.hits.indexOf(e.id) >= 0) return;
          p.hits.push(e.id); p.hitAny = true;
          if (p.kind === 'shell') { alive = false; explode(G, p); return; }
          if (p.anti && e.def.etower) { var amul = p.anti; hurtEnemy(G, e, p.dmg * amul, { src: p.src, kb: 0, fx: p.x, fy: p.y }); if (p.pierce-- <= 0) alive = false; return; }
          hurtEnemy(G, e, p.dmg, { anti: p.anti, src: p.src, kb: p.kind === 'water' ? 90 : 40, fx: p.x - p.vx, fy: p.y - p.vy, crit: p.crit, type: p.dtype, elem: p.elem, kind: p.kind });
          if (p.onHit) p.onHit(G, e, p);                   // v0.5：12 位常驻角色的独有效果（藤蔓缠绕 / 拉钩 / 标记 …）
          if (p.pierce-- <= 0) alive = false;
        });
      } else if (p.kind === 'shell') explode(G, p);
      else if (p.trk && !p.hitAny && p.src) XY.spsupMiss(G, p.src);
      if (alive) P[w++] = p;
    }
    P.length = w;

    // 敌人的子弹：打英雄和营地
    var EP = G.eprojs; w = 0;
    for (i = 0; i < EP.length; i++) {
      var q = EP[i], alive2 = true;
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (q.life <= 0) alive2 = false;
      for (var j = 0; j < G.heroes.length && alive2; j++) {
        var h = G.heroes[j]; if (h.down || (q.noTang && j === 0 && XY.bossBarrier(G))) continue;
        var dx = h.x - q.x, dy = h.y - q.y, rr = h.def.r + q.r;
        if (dx * dx + dy * dy < rr * rr) { G._src = q.src === 'etower' ? 'etower' : 'proj'; hurtHeroBy(G, h, q.dmg, false, undefined, q.dt, q.el); G._src = null; alive2 = false; }
      }
      if (alive2 && q.src === 'etower') {                  // 妖塔的弹：也会打爆我方的塔
        for (var tk = 0; tk < G.towers.length; tk++) {
          var tw = G.towers[tk];
          if (XY.dist(tw.x, tw.y, q.x, q.y) < 22 + q.r) { hurtTower(G, tw, q.dmg * 1.4); alive2 = false; break; }
        }
      }
      if (alive2 && G.camp.active && XY.dist(q.x, q.y, G.camp.x, G.camp.y) < G.camp.r + q.r) { hurtCamp(G, q.dmg * 0.6); alive2 = false; }
      if (alive2) EP[w++] = q;
    }
    EP.length = w;
  }

  function explode(G, p) {
    ring(G, p.x, p.y, p.splash, '#ff9a3c', 0.3, true);
    G.grid.query(p.x, p.y, p.splash, function (e) { hurtEnemy(G, e, p.dmg, { kb: 160, fx: p.x, fy: p.y, aoe: true, ground: true }); });
  }

  /* ================= 地面区域（流沙河） ================= */
  function updateZones(G, dt) {
    var Z = G.zones, w = 0;
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i]; z.t -= dt; z.tick -= dt;
      if (z.follow) { var fh = G.heroes[0]; if (fh.down) z.t = 0; else { z.x = fh.x; z.y = fh.y; } }
      if (z.kind === 'sand') {                           // 流沙护法：圈内的妖怪暗器直接消失
        for (var pi = G.eprojs.length - 1; pi >= 0; pi--) {
          var ep = G.eprojs[pi];
          if (XY.dist(ep.x, ep.y, z.x, z.y) < z.r) { spark(G, ep.x, ep.y, '#c9a96b', 3); G.eprojs.splice(pi, 1); }
        }
      }
      if (z.tick <= 0) {
        z.tick = 0.25;
        G.grid.query(z.x, z.y, z.r, function (e) {
          if (e.fly && C.AIR_GROUND_IMMUNE) return;
          e.slowT = Math.max(e.slowT, 0.5); e.slowF = Math.max(e.slowF, z.kind === 'sand' ? (e.def.boss ? 0.5 : 0.8) : (e.def.boss ? 0.3 : 0.65));
          hurtEnemy(G, e, z.dmg * 0.25, { dot: true, src: z.owner, ground: true });
        });
      }
      if (z.t > 0) Z[w++] = z;
    }
    Z.length = w;
  }

  /* ================= 经验 / 金币拾取 ================= */
  function updatePickups(G, dt) {
    var pr = G.P.pick;
    pull(G.gems, function (g) { addXp(G, g.v, g.mag); }, C.DROP_CAP_GEM);
    pull(G.coinDrops, function (c) { G.coins += c.v; G.coinAcc = (G.coinAcc || 0) + c.v; if (G.t - (G.coinTxT === undefined ? -9 : G.coinTxT) > 0.3) { text(G, c.x, c.y - 8, '+' + G.coinAcc, 'coin'); G.coinAcc = 0; G.coinTxT = G.t; } }, C.DROP_CAP_COIN);
    function pull(arr, onGet, cap) {
      var w = 0, over = arr.length - cap;                 // 超过上限：最老的（数组前面的）、还没被吸走的先没
      for (var i = 0; i < arr.length; i++) {
        var g = arr[i], keep = true;
        if (!g.mag) {
          if (over > 0) { over--; G.stats.dropCapped = (G.stats.dropCapped || 0) + 1; continue; }
          g.age = (g.age || 0) + dt;                      // 地上的经验 / 金币会慢慢消失（被吸走的不计时）
          if (g.age >= C.DROP_LIFE) { G.stats.dropExpired = (G.stats.dropExpired || 0) + 1; continue; }
          for (var j = 0; j < G.heroes.length; j++) {
            var h = G.heroes[j]; if (h.down) continue;
            var dx = h.x - g.x, dy = h.y - g.y;
            if (dx * dx + dy * dy < pr * pr) { g.mag = h; g.sp = 120; break; }
          }
        }
        if (g.mag) {
          var m = g.mag; if (m.down) { g.mag = null; }
          else {
            var ddx = m.x - g.x, ddy = m.y - g.y, dd = sqrt(ddx * ddx + ddy * ddy) || 1;
            g.sp += 900 * dt;
            var st = Math.min(g.sp * dt, dd);
            g.x += ddx / dd * st; g.y += ddy / dd * st;
            if (dd < m.def.r + 6) { onGet(g); keep = false; if (XY.anim) XY.anim.pickup(G, m); if (XY.sfx) XY.sfx(arr === G.gems ? 'gem' : 'coin'); }
          }
        }
        if (keep) arr[w++] = g;
      }
      arr.length = w;
    }
  }

  /* ================= 升级 → 技能点 ================= */
  XY.xpNeed = function (L) { return Math.round(Math.min(C.XP_NEED_MAX, 5 + 2.2 * Math.pow(L, 1.6))); };

  // 升级不再暂停游戏：给技能点，玩家随时按 Tab 打开技能树去花
  // v0.6：升级回满血——只回“升级的那一个”：队伍升级算在捡到这颗经验的英雄身上（没有就是正在操控的英雄），别人不变
  function levelHeal(G, h) {
    if (!h || h.down) h = G.heroes[G.ctrl];
    if (!h || h.down) return 0;
    var add = h.maxHp - h.hp; if (add > 0) h.hp = h.maxHp;
    ring(G, h.x, h.y, 46, '#7fe39a', 0.55, true); spark(G, h.x, h.y, '#b8f0c4', 8);
    if (add > 0) { text(G, h.x, h.y - h.def.r - 22, '满血', 'heal'); G.stats.levelHeals = (G.stats.levelHeals || 0) + 1; }
    return add;
  }
  XY.levelHeal = levelHeal;
  function gainPoints(G, n, who) {
    if (G.villain) { XY.villain.levelUp(G, who); return; }                     // v0.9 反派关：升级只给牛魔王自动成长，没有技能点
    G.points += n; G.pointsTotal += n; G.lvFlash = 3; levelHeal(G, who);
    if (XY.sfx) XY.sfx('level');
    if (XY.anim) { XY.anim.levelUp(G); if (G.level >= C.PH_XF_LEVEL && !G._maxLvShown) { G._maxLvShown = true; XY.anim.maxLevel(G); } }
    if (XY.followGrow) XY.followGrow(G, n);
    if (G.autoPoints && !G.tut) XY.autoSpend(G);
    // v0.8.0：拿到点数时的提示 = 顶部通知条一行（菜单按钮上不再有红角标 / 红字）；之后一直没用，skillHint 每 50 秒轻提示一次
    if (G.points > 0) { var tch = XY.app && XY.app.touchUI; G.skillHintLast = G.t; banner(G, '升级了！有 ' + G.points + ' 个技能点可以用（' + (tch ? (XY.compactHud&&XY.compactHud.on(G,XY.app)?'点顶部等级经验':'点右上角菜单') : 'Tab 修行') + '）', 2.2); } else banner(G, '升级了！', 1.6);
  }
  XY.gainPoints = gainPoints;

  function addXp(G, v, who) {
    if (G.level >= C.LEVEL_CAP) { G.xp = 0; return; }     // 满级 99：不再涨经验
    G.xp += v * G.P.xp * (G.dungeon ? C.DNG_XP : 1);
    var need = XY.xpNeed(G.level);
    while (G.xp >= need && G.level < C.LEVEL_CAP) {
      G.xp -= need; G.level++;
      gainPoints(G, 1 + (G.level % C.POINT_BONUS_EVERY === 0 ? 1 : 0), who);
      need = XY.xpNeed(G.level);
    }
    if (G.level >= C.LEVEL_CAP) { G.xp = 0; banner(G, '满级 99！', 3); }
  }
  XY.addXp = addXp;

  // 打开 / 关闭技能树（打开时游戏暂停）
  XY.toggleSkills = function (G, on) {
    if (on === undefined) on = G.mode !== 'skills';
    if (on && G.mode === 'play') G.mode = 'skills';
    else if (!on && G.mode === 'skills') G.mode = 'play';
    return G.mode === 'skills';
  };

  /* ================= 特效 / 飘字 动画更新 ================= */
  function updateFx(G, dt) {
    var w = 0, i;
    for (i = 0; i < G.fx.length; i++) { var f = G.fx[i]; f.t += dt; if (f.t < f.max) G.fx[w++] = f; }
    G.fx.length = w; w = 0;
    for (i = 0; i < G.texts.length; i++) { var t = G.texts[i]; t.t += dt; t.y += t.vy * dt; t.vy *= 0.94; if (t.t < t.max) G.texts[w++] = t; }
    G.texts.length = w; w = 0;
    for (i = 0; i < G.parts.length; i++) { var p = G.parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; if (p.t < p.max) G.parts[w++] = p; }
    G.parts.length = w;
    if (XY.vfx) XY.vfx.update(G, dt);
    for (i = 0; i < G.towers.length; i++) if (G.towers[i].pulse > 0) G.towers[i].pulse -= dt;
  }

  /* ================= 调试辅助 ================= */
  XY.debug = {
    skip60: function (G) { XY.skipTo(G, G.t + 60); },
    levelUp: function (G) { G.level++; gainPoints(G, 1); },
    points: function (G, n) { gainPoints(G, n || 5); },
    coins: function (G) { G.coins += 100; },
    god: function (G) { G.godMode = !G.godMode; toast(G, G.godMode ? '无敌：开' : '无敌：关'); },
    spawn: function (G, n, type, x, y, den) {   // 压力测试：在镜头周围（或指定位置）刷 n 只敌人
      for (var i = 0; i < n; i++) { var p = x === undefined ? spawnPos(G) : { x: x + rand(-40, 40), y: y + rand(-40, 40) }; makeEnemy(G, type || pickType(G.t), p.x, p.y, den); }
    },
    hurtHero: function (G, i, d) { hurtHero(G, G.heroes[i], d); },
    hurtCamp: function (G, d) { hurtCamp(G, d); },
    killDen: function (G, i) { var b = G.dens[i] && G.dens[i].boss; if (b && !b.dead) hurtEnemy(G, b, 1e9, {}); },
    killAllBosses: function (G) { for (var i = 0; i < G.dens.length; i++) XY.debug.killDen(G, i); },
    tp: function (G, i, x, y) { if (i === 0) return; var h = G.heroes[i]; h.x = x; h.y = y; },
    completeMain: function (G) { XY.quests.forceMain(G); },
    tpGate: function (G) { G.tang.s = G.rt.total; G.tang.phase = 'arrived'; G.camp.active = false; G.heroes[0].x = G.gate.x; G.heroes[0].y = G.gate.y; },
    tangTo: function (G, s, phase) { G.tang.s = Math.max(0, Math.min(G.rt.total, s)); if (phase) G.tang.phase = phase; var p = XY.routeAt(G.rt, G.tang.s); G.heroes[0].x = p.x; G.heroes[0].y = p.y; },
    tangRest: function (G) { XY.debug.tangTo(G, G.rt.restS - 1, 'walk'); },
    toRest: function (G) { XY.debug.tangTo(G, G.rt.restS, 'rest'); G.tang.restT = 0; G.camp.active = true; G.station = true; },   // 测试：直接进入休息阶段（营地规则生效）
    freezeTang: function (G) { G.tang.speed = 0; },
    clearLevel: function (G) { XY.debug.killAllBosses(G); XY.debug.completeMain(G); XY.debug.tpGate(G); }
  };
  XY.core = { hurtEnemy: hurtEnemy, killEnemy: killEnemy, healHero: healHero, hurtHero: hurtHero, text: text, spark: spark, ring: ring, banner: banner, toast: toast, makeEnemy: makeEnemy, heroDmg: heroDmg, spawnPos: spawnPos, pickType: pickType, mkTower: mkTowerObj, castUlt: castUlt, hurtCamp: hurtCamp };
})();
