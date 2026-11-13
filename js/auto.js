/* ============================================================
 * auto.js —— v0.9「尽量只用方向键」：自动加点 / 自动犒赏天兵（F）/ 自动召唤特殊人物（G）/ 法宝三选一自动选推荐
 * 偏好存在 localStorage（xy_auto_v1），全开和普通版共用；暂停页里有四个开关。
 * 默认：加点、犒赏、召唤、选卡都关。只有玩家自己打开才生效，刷新后保持。缺字段或坏值按关。手动按键（F / G / 1 2 3）照旧可用。
 * ============================================================ */
(function () {
  var XY = window.XY, KEY = 'xy_auto_v1', DEF = { points: false, treat: false, guest: false, pick: false };
  var A = XY.auto = { DEF: DEF, LABEL: { points: '加点', treat: '犒赏', guest: '召唤', pick: '选卡' } };
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function load() { var o = {}; try { o = JSON.parse(window.localStorage.getItem(KEY) || '{}'); } catch (e) { o = {}; } return plain(o) ? o : {}; }
  A.get = function (k) { var o = load(); if (typeof o[k] !== 'boolean') return DEF[k]; return o[k]; };
  A.set = function (k, v) {
    var o = load(), next = {}, key;
    for (key in DEF) if (DEF.hasOwnProperty(key)) next[key] = typeof o[key] === 'boolean' ? o[key] : DEF[key];
    next[k] = !!v;
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* 存不了就只本次有效 */ }
    return next[k];
  };
  A.toggle = function (k) { return A.set(k, !A.get(k)); };

  /* 每帧（真实时间）调一次：三选一在面板上停够 0.9 秒后替玩家点推荐；战斗中每 0.5 秒看一次犒赏 / 召唤 */
  A.assist = function (G, dt) {
    if (!G || G.tut || G.ending) return;
    if (G.mode === 'cards') {
      var o = G.cardOffer; if (!o || !o.v2 || !A.get('pick') || !XY.fabao) return;
      o._at = (o._at || 0) + dt;
      if (o._at >= 0.9) { var k = XY.fabao.recommend(G, o.cards); if (k >= 0) XY.fabao.choose(G, k); }
      return;
    }
    if (G.mode !== 'play') return;
    G._autoT = (G._autoT || 0) + dt; if (G._autoT < 0.5) return; G._autoT = 0;
    if (A.get('treat') && G.towers && G.towers.length) {
      for (var i = 0; i < G.towers.length; i++) {
        var t = G.towers[i];
        if (t.life < t.maxLife * 0.5 && !(t.treatCd > 0) && !XY.treatCheck(G, t) && G.coins >= 60) { XY.treat(G, t); break; }
      }
    }
    if (A.get('guest') && XY.guest && G.t > 15) {
      var s = XY.guest.state(G); if (s.h || s.cd > 0) return;
      var c = G.heroes[G.ctrl] || G.heroes[0], n = 0, boss = false, e, j;
      for (j = 0; j < G.enemies.length; j++) { e = G.enemies[j]; if (e.dead) continue; var dx = e.x - c.x, dy = e.y - c.y, d2 = dx * dx + dy * dy; if (d2 < 420 * 420) n++; if (e.def && e.def.denBoss && d2 < 650 * 650) boss = true; }
      if (n >= 8 || boss || (c.hp < c.maxHp * 0.4 && n >= 3)) XY.guest.summon(G);
    }
  };
})();
