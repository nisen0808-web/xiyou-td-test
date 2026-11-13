/* ============================================================
 * sweep09.js —— v0.9 取经关 / 洞府副本：星级 + 三星后局内 2× + 已三星扫荡
 * 星级（通关时算，存档取最高 → data.levels[id].stars / data.dng[id].stars）：
 *   取经关：★1 通关；★2 至少完成 1 条支线（本关没有支线则直接给）；★3 全队阵亡 ≤ 1 次
 *   洞府副本：★1 通关；★2 全队阵亡 ≤ 3 次；★3 全队阵亡 0 次
 * 2×：该关存档 ≥ 3★ 时 HUD 出「2×」墨条（render4.js 画），点一下 1× ⇄ 2×；反派 / 验关 / 玩法包 / 教程不出。
 * 扫荡：该关 ≥ 3★ 才能扫；不进战斗，发灵石 = round(普通再通关奖励 × 0.8)
 *   （取经关 60+25×关号 → ×0.8；副本 DNG_GAIN=50 → 40）。所有关合计每天 3 次（data.sweep09 = { day, n }）。
 * 结算页（overlay / pv2）：胜利显示本局 ★☆ + 未满星差什么；刷最高星写「新纪录」；失败只淡淡「通关才记星」；反派/Boss/验关/玩法包不插手。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, S = XY.save;
  var SW = XY.sweep09 = { K: 0.8, DAILY: 3 };
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function rec(kind, id) { var d = S.data; return kind === 'dungeon' ? (d.dng && d.dng[id]) : (d.levels && d.levels[id]); }
  SW.stars = function (kind, id) { var r = rec(kind, id); return r && r.cleared ? (r.stars | 0) : 0; };
  SW.calcStars = function (G) {
    if (!G || G.godMode) return 0;
    var deaths = (G.stats && G.stats.deaths) || 0;
    if (G.dungeon) return 1 + (deaths <= 3 ? 1 : 0) + (deaths === 0 ? 1 : 0);
    var sides = G.quests ? G.quests.sides : [], done = sides.filter(function (q) { return q.done; }).length;
    return 1 + (!sides.length || done >= 1 ? 1 : 0) + (deaths === 0 ? 1 : 0);
  };
  SW.reward = function (kind, id) { return Math.round((kind === 'dungeon' ? XY.C.DNG_GAIN : 60 + 25 * id) * SW.K); };
  SW.usedToday = function () { var s = S.data.sweep09; return s && s.day === today() ? s.n : 0; };
  SW.left = function () { return Math.max(0, SW.DAILY - SW.usedToday()); };
  SW.canSweep = function (kind, id) {
    if (kind !== 'level' && kind !== 'dungeon') return { ok: false, reason: '' };
    if (SW.stars(kind, id) < 3) return { ok: false, reason: '这一关拿到 ★★★ 后才能扫荡' };
    if (!SW.left()) return { ok: false, reason: '今天的 ' + SW.DAILY + ' 次扫荡用完了，明天再来' };
    return { ok: true, reason: '' };
  };
  SW.sweep = function (kind, id) {
    var c = SW.canSweep(kind, id); if (!c.ok) return { ok: false, reason: c.reason };
    var n = SW.reward(kind, id), r = rec(kind, id), d = S.data;
    d.sweep09 = { day: today(), n: SW.usedToday() + 1 };
    r.sweeps = (r.sweeps || 0) + 1; S.addLingshi(n); S.touch(); S.flush();
    if (XY.sfx) XY.sfx('sweep');
    return { ok: true, lingshi: n, left: SW.left(), reason: '扫荡完成：灵石 +' + n + '（今天还剩 ' + SW.left() + ' 次）' };
  };
  /* 局内 2×：可不可以显示 */
  SW.spdOk = function (G) {
    if (!G || G.villain || G.lair || G.mod || G.tut) return false;
    return G.dungeon ? SW.stars('dungeon', G.dungeon.id) >= 3 : SW.stars('level', G.levelId) >= 3;
  };
  /* 星级展示：★★★ / 差哪颗 / 结算页用 */
  SW.fmt = function (n) { n = Math.max(0, Math.min(3, n | 0)); return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); };
  SW.missTip = function (G, st) {
    st = st == null ? SW.calcStars(G) : (st | 0);
    if (st >= 3) return '';
    var deaths = (G.stats && G.stats.deaths) || 0, tips = [];
    if (G.dungeon) {
      if (deaths > 3) tips.push('差 ★2：阵亡不超过 3 次（本局 ' + deaths + ' 次）');
      if (deaths > 0) tips.push('差 ★3：无人阵亡（本局 ' + deaths + ' 次）');
    } else {
      var sides = G.quests ? G.quests.sides : [], done = sides.filter(function (q) { return q.done; }).length;
      if (sides.length && done < 1) tips.push('差 ★2：至少完成 1 条支线');
      if (deaths > 0) tips.push('差 ★3：无人阵亡（本局 ' + deaths + ' 次）');
    }
    return tips.join(' · ');
  };
  /* 结算页：只给取经关 / 洞府；反派·Boss·验关·玩法包返回 null（别碰） */
  SW.resultStars = function (G, win) {
    if (!G || G.mod || G.villain || G.lair) return null;
    if (!win) return { show: false, faint: '通关才记星' };
    var st = (G.stars09 | 0) || ((G.runReport && G.runReport.stars) | 0) || SW.calcStars(G);
    return { show: true, n: st, text: SW.fmt(st), isNew: !!(G.starsNew || (G.runReport && G.runReport.starsNew)), tip: SW.missTip(G, st) };
  };
  /* 通关时记星级 */
  var oldCommit = S.commitRun;
  S.commitRun = function (G, result) {
    if (G.committed) return G.runReport;
    var st = (result === 'win' && !G.mod && !G.villain && !G.lair) ? SW.calcStars(G) : 0;
    var prev = 0;
    if (st) {
      var pre = G.dungeon ? rec('dungeon', G.dungeon.id) : rec('level', G.levelId);
      prev = pre ? (pre.stars | 0) : 0;
    }
    var rep = oldCommit(G, result);
    if (st) {
      var r = G.dungeon ? rec('dungeon', G.dungeon.id) : rec('level', G.levelId);
      var neu = st > prev;
      if (r) { if (neu) r.stars = st; S.touch(); S.flush(); }
      G.stars09 = st; G.starsNew = neu;
      if (rep) { rep.stars = st; rep.starsNew = neu; }
    }
    return rep;
  };
  /* 按钮：spd2（局内）/ sweepGo（出发页） */
  var HUB = XY.hubUI, oldAct = HUB.act;
  HUB.act = function (h, p, a) {
    if (h.act === 'spd2') { var G = window.__xy && window.__xy.G; if (G && SW.spdOk(G)) G.speed = G.speed === 2 ? 1 : 2; return true; }
    if (h.act === 'sweepGo') {
      var r = SW.sweep(h.kind, h.id);
      a.menuMsg = { text: r.reason, bad: !r.ok, until: a.rt + 3 };
      return true;
    }
    return oldAct(h, p, a);
  };
})();
