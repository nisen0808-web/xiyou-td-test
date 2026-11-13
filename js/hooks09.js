/* v0.8.6 → v0.9.0 挂点（全部是空壳：v0.9.0 接入 Boss 战 / 反派模式时只替换这里，不用再改别的文件）
 *  - XY.FLAGS09.bossEntry / villainEntry：主菜单「Boss 战」「反派模式」入口是否显示（默认 false = 隐藏）
 *  - XY.bossfight.open(ctx)：第 1 关通关 / 洞府通关（specials.js commitRun）和主菜单入口调用；ctx = { kind:'level'|'dungeon'|'menu', levelId, dungeonId, first, G, report }；返回 false = 没接管
 *  - XY.villain.open(ctx)：主菜单「反派模式」入口调用
 *  - 存档 XY.save.data.villain.series[系列]（schema 5）（meta.js 的 defaults / migrate 已补，旧存档读出来自动带上）*/
(function () {
  'use strict';
  var XY = window.XY;
  XY.FLAGS09 = XY.FLAGS09 || { bossEntry: false, villainEntry: false };
  XY.bossfight = XY.bossfight || { stub: true, open: function (ctx) { XY.bossfight.lastCtx = ctx; return false; } };
  /* 反派系列表：每个 Boss 一个系列（牛魔王 niumo 是第一个），反派模式的存档 / 钱包按这里的 id 分开存。v0.9.0 的 villain_data.js 可以往里加字段（塔表、素材表、配方），别改 id。 */
  XY.VILLAIN_SERIES = XY.VILLAIN_SERIES || { niumo: { id: 'niumo', name: '牛魔王', order: 1, enabled: true } };
  /* 解锁链（用户确认）：基础关 → 副本 → Boss 战 → 反派模式。条件做成可配置表：改这张表就能改解锁条件，存档记录每一环是否通过（data.chain）。
   *   need.kind：'level'（通关第 id 关）/ 'dungeon'（通关任意洞府副本）/ 'boss'（打赢 id 系列的 Boss，id 如 'niumo'）
   *   全开（XY.TEST_BUILD）全部开放。反派模式按 Boss 系列分钱包 / 进度：data.villain.series[系列] = { wallet:{yaojin,yaodan}, got, runs, cleared, mats, evo, t3Seen, pity, traps, stage }（见 meta.js villainSeriesDefault），牛魔王 niumo 是第一个。 */
  XY.CHAIN09 = XY.CHAIN09 || [
    { id: 'dungeon', name: '洞府副本', need: { kind: 'level', id: 1 }, hint: '通关第 1 关一次' },
    { id: 'bossfight', name: 'Boss 战', need: { kind: 'dungeon' }, hint: '通关任意一个洞府副本' },
    { id: 'villain', name: '反派模式', need: { kind: 'boss', id: 'niumo' }, hint: '打赢牛魔王 Boss 战' }
  ];
  var CH = XY.chain09 = {
    by: function (id) { return XY.CHAIN09.filter(function (z) { return z.id === id; })[0] || null; },
    passed: function (need) {                                              // 条件本身是否满足（只读存档，不看全开）
      var d = XY.save && XY.save.data; if (!d || !need) return false;
      if (need.kind === 'level') return !!(d.levels && d.levels[need.id] && d.levels[need.id].cleared);
      if (need.kind === 'dungeon') return !!(d.dng && Object.keys(d.dng).some(function (k) { return d.dng[k] && d.dng[k].cleared; }));
      if (need.kind === 'boss') return !!(d.chain && d.chain.boss && d.chain.boss[need.id] > 0);
      return false;
    },
    refresh: function () {                                                 // 把通过的环写进存档（commitRun / Boss 战结束后调用；只增不减）
      var d = XY.save && XY.save.data; if (!d || !d.chain) return;
      XY.CHAIN09.forEach(function (z) { if (!d.chain[z.id] && CH.passed(z.need)) d.chain[z.id] = Date.now(); });
      if (XY.save.flush) try { XY.save.flush(); } catch (e) { }
    },
    unlocked: function (id) { var d = XY.save && XY.save.data, z = CH.by(id); if (!z) return false; if (XY.TEST_BUILD) return true; return !!(d && d.chain && d.chain[id]) || CH.passed(z.need); },
    visible: function (id) {                                               // 主菜单入口是否显示：接入开关 + 解锁
      var F = XY.FLAGS09 || {}; return !!(id === 'bossfight' ? F.bossEntry : id === 'villain' ? F.villainEntry : false) && CH.unlocked(id);
    },
    bossWin: function (series) {                                           // Boss 战打赢一次：记进存档并刷新解锁链（v0.9.0 的 Boss 战结束时调用）
      var d = XY.save.data; d.chain.boss[series] = (d.chain.boss[series] || 0) + 1; CH.series(series); CH.refresh();
    },
    series: function (series) {                                            // 反派模式某系列的存档块（没有就建）
      var v = XY.save.data.villain.series; return v[series] || (v[series] = XY.save.villainSeriesDefault());
    }
  };
  XY.villain = XY.villain || { stub: true, open: function (ctx) { XY.villain.lastCtx = ctx; return false; } };
})();
