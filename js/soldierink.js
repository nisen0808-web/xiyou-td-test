/* v0.8.0 护法天兵水墨工笔精灵：弓 / 炮 / 寒冰 / 破阵 / 佛光（图集 js/soldier_ink_data.js，tools/sol_bake.py 烘焙；AI 出图 → 切帧 → 抠图，运行时不生成任何图）。
 * 每种 8 帧：0/1 待机（交叉淡化）、2–5 走路、6 前摇（拉弓 / 点火 / 后撤 / 上弦 / 举杖）、7 出招（放箭 / 轰炮 / 突刺 / 发弩 / 佛光脉冲）。朝右为原图，朝左镜像。
 * 出招节奏：上一次出手后，下一次出手前 0.22 秒起放前摇帧（只在战斗中：上次出手距今 < 冷却 + 0.6 秒）；出手后 0.2 秒放出招帧。
 * 没有图（还没解码 / XY.SINK.on=false）→ 返回 false，调用方退回旧的矢量画法。 */
(function () {
  'use strict';
  var XY = window.XY, PI2 = Math.PI * 2, imgs = {};
  var S = XY.SINK = { on: true, stats: 0, last: null, frames: {} };
  function ent(t) {
    if (!S.on || !XY.SINK_DATA) return null;
    var d = XY.SINK_DATA[t]; if (!d) return null;
    var e = imgs[t]; if (!e) { e = imgs[t] = { img: new Image(), d: d }; e.img.src = d.src; }
    return e.img.complete && e.img.naturalWidth > 0 ? e : null;
  }
  S.has = function (t) { return !!ent(t); };
  S.entry = ent;
  S.preload = function () { if (XY.SINK_DATA) for (var k in XY.SINK_DATA) ent(k); };
  S.top = function (t) { var d = XY.SINK_DATA && XY.SINK_DATA[t.type]; return d ? d.T * (1 + 0.1 * ((t.lv || 1) - 1)) : 60; };
  /* 取帧 */
  function pick(t, rt, mv, cd, n) {
    var st = t._sk; if (!st) st = t._sk = { at: t.atkT || 0, sa: -99 };
    if ((t.atkT || 0) > st.at + 0.1) st.sa = rt; st.at = t.atkT || 0;
    var since = rt - st.sa;
    if (n > 8) {            // v0.8.6 弓兵 10 帧：拉弓(6) → 满弓(8) → 放箭(7) → 收势(9) → 回持弓待机
      if (since < 0.14) return { i: 7 };
      if (since < 0.36) return { i: 9 };
      if (since < cd + 0.6 && since > cd - 0.32 && since < cd + 0.05) return { i: since > cd - 0.15 ? 8 : 6 };
      if (mv) return { i: 2 + (Math.floor(rt * 9 + (t.sd || 0)) & 3), walk: true };
      return { i: 0, mix: 0 };
    }
    if (since < 0.2) return { i: 7 };
    if (since < cd + 0.6 && since > cd - 0.22 && since < cd + 0.05) return { i: 6 };
    if (mv) return { i: 2 + (Math.floor(rt * 9 + (t.sd || 0)) & 3), walk: true };
    return { i: 0, mix: 0.5 + 0.5 * Math.sin(rt * 2.2 + (t.sd || 0)) };
  }
  function one(c, en, i, alpha, x, foot, k, look) {
    var f = en.d.fr[i]; if (!f) return;
    c.globalAlpha = alpha; c.save(); c.translate(x, foot); c.scale(look * k, k);
    c.drawImage(en.img, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]);
    c.restore(); c.globalAlpha = 1;
  }
  /* 画天兵：脚底 = gy；f = 朝向（±1）；mv = 在走；sc = 等级放大（1 / 1.1 / 1.2）；cd = 这个天兵的出手间隔（秒） */
  S.draw = function (c, G, t, rt, f, mv, gy, sc, cd) {
    var en = ent(t.type); if (!en) return false;
    var a = pick(t, rt, mv, cd || 1, en.d.fr.length), k = sc / XY.SINK_SS, x = t.x;
    var bob = a.walk ? -Math.abs(Math.sin(rt * 9 + (t.sd || 0))) * 1.6 : 0;
    var hw = en.d.fr[0][2] * k * 0.32;
    c.fillStyle = 'rgba(70,50,30,0.2)'; c.beginPath(); c.ellipse(x, gy + 1, hw, hw * 0.3, 0, 0, PI2); c.fill();
    if (a.mix !== undefined && !G._lod) { one(c, en, 0, 1, x, gy + bob, k, f); if (a.mix > 0.02) one(c, en, 1, a.mix, x, gy + bob, k, f); }
    else one(c, en, a.i === 0 || a.mix !== undefined ? 0 : a.i, 1, x, gy + bob, k, f);
    S.stats++; S.last = { type: t.type, frame: a.mix !== undefined ? 0 : a.i, t: rt }; S.frames[t.type + ':' + (a.mix !== undefined ? 0 : a.i)] = 1;
    return true;
  };
  if (XY.SINK_DATA) S.preload(); else setTimeout(function () { if (XY.SINK_DATA) S.preload(); }, 0);
})();
