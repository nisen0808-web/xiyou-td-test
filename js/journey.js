/* =====================================================================
 * journey.js —— 取经之旅：一到三关是一段连续的旅程，等级和技能一直带着走（v0.5）
 *
 * 规则（用户 5:48 AM 定的）：
 *  · 过关的那一刻把队伍的成长存进存档（localStorage，刷新页面还在）：
 *      全队等级 / 经验 / 技能点、五位师徒（含唐僧）各自学会的技能和技能树选择、
 *      全队技能页（u_*）、每位特殊角色各自的局内技能（按角色分开存）、这一路收集到的法宝
 *  · 存档里每一关有一份「入场快照」entry[n] = 开始第 n 关时的状态：
 *      第 1 关没有快照 = 从零开始；过关第 n 关写 entry[n+1]，并删掉更靠后的旧快照（旅程只有一条线）
 *      失败不写任何东西 → 重打这一关一定回到这一关开始时的状态，而不是清掉更早的积累
 *  · 每关开局满血；上一关阵亡的师徒下一关带着原来的等级回来；关内死了仍然不复活
 *  · 「重新开始取经」：只清旅程（入场快照 + 关卡进度），法宝收藏 / 灵石 / 角色卡 / 图鉴 / 解锁不动
 *  · 旧存档（schema 1/2）升级：旧档没有成长数据 → journey.legacy = true。
 *      已通关的老玩家进入第 n 关时，用「补偿快照」（按各关推荐等级自动点好技能），不会从零打第 2、3 关
 * ===================================================================== */
(function () {
  'use strict';
  var XY = window.XY, C = XY.C;

  // 补偿快照的等级（老存档用）：按机器人测试中打完上一关的等级偏保守取值
  var LEGACY_LV = { 2: 20, 3: 30 };

  function J() { var d = XY.save.data; if (!d.journey || typeof d.journey !== 'object') d.journey = { entry: {}, legacy: false }; if (!d.journey.entry) d.journey.entry = {}; return d.journey; }
  function copy(o) { return JSON.parse(JSON.stringify(o || {})); }
  function pointsFor(L) { var p = 0, l; for (l = 2; l <= L; l++) p += 1 + (l % C.POINT_BONUS_EVERY === 0 ? 1 : 0); return p; }

  var JR = XY.journey = {
    LEGACY_LV: LEGACY_LV,
    // 开始第 n 关该用的快照（null = 从零开始）
    entryFor: function (n) {
      if (XY.TEST_BUILD && C.TEST_LV98 !== false) return JR.testEntry(n);      // 全开：每关都从“全队 Lv98、差一只怪升 99”开局，不看存档快照
      var j = J(), e = j.entry[n];
      if (e) return e;
      if (n > 1 && j.legacy && XY.save.levelUnlocked(n)) {
        var L = LEGACY_LV[n] || LEGACY_LV[3];
        return { level: L, xp: 0, points: pointsFor(L), pointsTotal: pointsFor(L), autoPoints: true, upg: {}, heroes: {}, sp: {}, runCards: {}, activeCard: null, synthetic: true, from: n - 1 };
      }
      return null;
    },
    testEntry: function (n) {
      var L = C.LEVEL_CAP - 1;
      return { level: L, xp: Math.max(0, XY.xpNeed(L) - 0.01), points: pointsFor(L), pointsTotal: pointsFor(L), autoPoints: true, upg: {}, heroes: {}, sp: {}, runCards: {}, activeCard: null, synthetic: true, test: true, from: n - 1 };
    },
    // 过关时：把 G 的成长拍成快照，写进 entry[n+1]
    snap: function (G) {
      var prev = JR.entryFor(G.levelId), s = { fb: G.fb && XY.fabao ? XY.fabao.snapshot(G) : null, from: G.levelId, level: G.level, xp: G.xp, points: G.points, pointsTotal: G.pointsTotal, autoPoints: !!G.autoPoints, upg: copy(G.upg), heroes: {}, sp: prev && prev.sp ? copy(prev.sp) : {}, runCards: copy(G.runCards), activeCard: G.activeCard || null, at: Date.now() };
      G.heroes.forEach(function (h) {
        if (h.sp) s.sp[h.id] = { sk: copy(h.sk) };            // 特殊角色：按角色 id 分开存，换人以后各用各的进度
        else s.heroes[h.id] = { sk: copy(h.sk) };
      });
      return s;
    },
    onWin: function (G) {
      var j = J(), n = G.levelId, k;
      j.entry[n + 1] = JR.snap(G);
      for (k in j.entry) if (+k > n + 1) delete j.entry[k];
      j.legacy = false;
      j.done = n >= XY.LEVEL_COUNT;
      XY.save.touch();
    },
    // 开局时：把快照里的成长装回 G（在 recalc 之前调用）
    apply: function (G) {
      var s = JR.entryFor(G.levelId); G.inherit = null;
      if (!s) return null;
      G.level = s.level || 1; G.xp = s.xp || 0; G.points = s.points || 0; G.pointsTotal = s.pointsTotal || 0; G.autoPoints = XY.auto ? !!XY.auto.get('points') : !!s.autoPoints;
      G.upg = copy(s.upg);
      G.heroes.forEach(function (h) {
        var r = h.sp ? (s.sp && s.sp[h.id]) : (s.heroes && s.heroes[h.id]);
        if (r && r.sk) h.sk = copy(r.sk);
      });
      if (s.runCards) { G.runCards = copy(s.runCards); if (s.activeCard && (G.runCards[s.activeCard] || G.deckIds.indexOf(s.activeCard) >= 0)) G.activeCard = s.activeCard; }
      if (G.fb && s.fb) XY.fabao.restore(G, s.fb); else if (G.fb && s.runCards) XY.fabao.restore(G, XY.fabao.fromOld(s.runCards));
      var dropped = XY.cards.sanitizeCarry ? XY.cards.sanitizeCarry(G) : [];      // 法宝和当前卡组冲突 / 失效的丢掉，不报错、不锁卡组
      XY.cards.recalc(G);
      G.inhMul = 1 + C.INH_K * Math.max(0, (s.level || 1) - 1);
      G.inherit = { level: G.level, synthetic: !!s.synthetic, from: s.from, cards: Object.keys(G.runCards || {}).length, dropped: dropped.length };
      if (dropped.length && XY.toast) XY.toast(G, '上一关带来的 ' + dropped.length + ' 件法宝和现在的卡组不是同一套（或超过 3 件），没有带过来');
      return s;
    },
    afterApply: function (G) {              // recalc 之后：合成快照自动点技能
      if (G.inherit && G.inherit.synthetic && G.points > 0) XY.autoSpend(G);
    },
    // 给界面用的一句话
    status: function (n) {
      var s = JR.entryFor(n);
      if (!s) return { inherit: false, text: n === 1 ? '从零开始' : '从零开始（没有继承的成长）' };
      return { inherit: true, level: s.level, text: '继承：全队 Lv' + s.level + ' · 技能点 ' + (s.points || 0) + (s.synthetic ? '（老存档补偿）' : '') + ' · 法宝 ' + (s.fb ? (s.fb.w || []).length + (s.fb.s || []).length : Object.keys(s.runCards || {}).length) + ' 件' };
    },
    restart: function () {
      var d = XY.save.data;
      d.journey = { entry: {}, legacy: false }; d.levels = {};
      XY.save.touch(); XY.save.flush();
    }
  };
})();
