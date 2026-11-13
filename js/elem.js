/* ============================================================
 * elem.js —— 五行相克特效 + 精英元素护盾（v0.5 第 2 批）
 *
 * 五行（只有这五种）：金 木 水 火 土。相克：金克木、木克土、土克水、水克火、火克金；相生：金生水、水生木、木生火、火生土、土生金。
 * 倍率（XY.C）：克制 ELEM_WIN=1.35、被克 ELEM_LOSE=0.75、同属性 ELEM_SAME=0.85、其他 1.0。每个技能的元素见 XY.skillElem。
 * 特效：命中时飘「克 ×1.35」（技能元素的颜色）+ 一个元素字的光环爆发；被克飘灰色「被克 ×0.75」。LOD：每 0.1 秒最多 3 处、每个怪 0.45 秒一次。
 * 精英护盾：精英出生带「最大生命 25%」的元素护盾，先打破护盾才伤到血；克制它的元素破盾更快（×1.5）。
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;

  XY.elemFx = function (G, e, el, em) {
    if (!(em > 1.05 || em < 0.8)) return;
    if (G.t < (e.ctT || 0)) return;
    var st = Math.floor(G.t * 10); if (G._ctS !== st) { G._ctS = st; G._ctN = 0; }
    if (++G._ctN > 3) return;
    e.ctT = G.t + 0.45;
    var E = XY.ELEMS[el]; if (!E) return;
    var K = XY.core;
    G.stats.elemWin = G.stats.elemWin || 0; G.stats.elemLose = G.stats.elemLose || 0;
    if (em > 1.05) {
      G.stats.elemWin++;
      K.text(G, e.x + e.r * 0.5, e.y - e.r - 14, E.glyph + '克', 'elemtag', E.color);
      if (!G._lod) { G.fx.push({ type: 'elemBurst', x: e.x, y: e.y, r: e.r + 34, color: E.color, glyph: E.glyph, t: 0, max: 0.55 }); K.spark(G, e.x, e.y, E.color, 7); }
      G.shake = Math.max(G.shake, 1.5);
    } else {
      G.stats.elemLose++;
      K.text(G, e.x, e.y - e.r - 20, '被克', 'beaten', '#5c4a38');
    }
  };

  /* ---------- 精英元素护盾 ---------- */
  XY.SHIELD_FRAC = 0.25; XY.SHIELD_COUNTER = 1.5;
  XY.shieldInit = function (e) { e.shieldMax = e.shield = Math.round(e.maxHp * XY.SHIELD_FRAC); e.shieldElem = e.elem || null; };
  XY.shieldHit = function (G, e, dmg, em, el) {
    var mult = em > 1.05 ? XY.SHIELD_COUNTER : 1, sd = dmg * mult, K = XY.core;
    if (sd < e.shield) { e.shield -= sd; if (Math.random() < 0.35) K.text(G, e.x, e.y - e.r - 6, Math.round(dmg), 'shield', '#4a90d9'); return 0; }
    var rest = (sd - e.shield) / mult; e.shield = 0;
    var col = (XY.ELEMS[e.shieldElem] || {}).color || '#6fa8dc';
    K.text(G, e.x, e.y - e.r - 24, '破盾！', 'counter', col);
    G.fx.push({ type: 'ring', x: e.x, y: e.y, r: e.r + 46, color: col, t: 0, max: 0.5, fill: true }); K.spark(G, e.x, e.y, col, 10);
    G.shake = Math.max(G.shake, 3); G.stats.shieldBreaks = (G.stats.shieldBreaks || 0) + 1;
    return rest;
  };

  /* ---------- 每个技能的元素（文档 + 测试的“预期值”表）----------
   * kind: 'atk' 普攻 / 'ult' 大招 / 'trait' 特性 / 辅助技能 id。没有登记的技能随使用者本身的元素。 */
  XY.SKILL_ELEM = { fire: 'fire', chill: 'water', boom: 'fire', leech: 'metal', vital: 'wood', swift: 'wood' };
  XY.skillElem = function (h, kind) {
    if (XY.SKILL_ELEM[kind]) return XY.SKILL_ELEM[kind];
    return (h && h.def && h.def.elem) || null;
  };
  XY.elemRel = function (a, b) {   // 两个元素的关系：克 / 被克 / 相生 / 被生 / 比和
    if (!a || !b) return null; if (a === b) return '比和';
    if ((XY.ELEM_BEATS[a] || []).indexOf(b) >= 0) return '克'; if ((XY.ELEM_BEATS[b] || []).indexOf(a) >= 0) return '被克';
    if (XY.ELEM_GEN[a] === b) return '相生'; if (XY.ELEM_GEN[b] === a) return '被生'; return null;
  };
})();
