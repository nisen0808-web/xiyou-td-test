/* skillfx.js —— v0.8.5：6 个「狂野水墨」技能特效精灵（js/skillfx_data.js，tools/fx_bake.py）：火漩 / 冰晶 / 闪电 / 金盾 / 莲花 / 风墨。
 * 英雄放大招 / 技能（vfx.cast）、护盾（vfx.shield）、治疗（vfx.heal）时，在原来的墨圈上再叠一个水墨精灵：长出来 → 停一下 → 淡掉。
 * 图集没解码好 / SKILLFX.on=false → 什么也不画，原来的矢量特效照常。 */
(function () {
  'use strict';
  var XY = window.XY, S = XY.SKILLFX = { on: true, drawn: 0, spawned: 0, last: null, kinds: {} }, img = null, ready = false;
  S.NAMES = ['fire', 'ice', 'bolt', 'shield', 'lotus', 'wind'];
  function load() { if (img || !XY.SKILLFX_DATA) return; img = new Image(); img.onload = function () { ready = true; }; img.src = XY.SKILLFX_DATA.src; if (img.complete && img.naturalWidth) ready = true; }
  load(); if (!img) setTimeout(load, 0);
  S.ok = function () { load(); return S.on && ready; };
  /* 元素风格 → 精灵 */
  S.kindOf = function (st, main) {
    if (st === 'fire' || st === 'coin') return 'fire'; if (st === 'thunder') return 'bolt'; if (st === 'heal') return 'lotus'; if (st === 'gold') return 'shield';
    if (st === 'wave') return main === '#e8559a' ? 'wind' : 'ice'; return 'wind';
  };
  S.add = function (G, kind, x, y, w, max, o) {
    if (!S.on || !G || !G.fx || !XY.SKILLFX_DATA || !XY.SKILLFX_DATA.fr[kind]) return;
    var n = 0, i; for (i = 0; i < G.fx.length; i++) if (G.fx[i].type === 'vsfx') n++; if (n >= 6) return;
    G.fx.push({ type: 'vsfx', kind: kind, x: x, y: y, w: w, t: 0, max: max || 0.9, flip: o && o.flip }); S.spawned++; S.kinds[kind] = (S.kinds[kind] || 0) + 1;
  };
  S.draw = function (c, f, k) {
    if (!S.ok()) return; var fr = XY.SKILLFX_DATA.fr[f.kind]; if (!fr) return;
    var grow = Math.min(1, k / 0.28), sc = (0.55 + 0.45 * (1 - Math.pow(1 - grow, 3))) * (f.w / fr[2]), a = k < 0.6 ? Math.min(1, k / 0.12) : 1 - (k - 0.6) / 0.4;
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, a)) * 0.95; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.translate(f.x, f.y + 10); if (f.flip) c.scale(-1, 1);
    c.drawImage(img, fr[0], fr[1], fr[2], fr[3], -fr[2] * sc / 2, -fr[3] * sc + 4 * sc, fr[2] * sc, fr[3] * sc); c.restore(); S.drawn++; S.last = { kind: f.kind, k: k };
  };
})();
