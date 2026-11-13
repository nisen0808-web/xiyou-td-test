/* ============================================================
 * cloudride.js —— v0.8.0 腾云：人物不在路上时脚踏一朵水墨云（不迈步、轻轻上下浮），只有走在路上才播走路动画
 *  - 规则（用户 01:09）：“人物不在路上的时候，感觉是腾云驾雾这种，只有在路上才是走路”
 *  - 判定：到路线折线的距离。滞回：进入路上 < IN(48)，离开路上 > OUT(62)，之间保持原状态（不闪）。路面半宽 42。
 *  - 只在 lv.cloudRide 的关卡生效（第 1 关黑风山，背景是整幅画，路画在里面）。其它关未启用（改 levels.js 的开关即可）。
 *  - 只是渲染：不改位置 / 速度 / 碰撞 / 伤害。h.cloudOn 记录当前状态，供测试读取。
 *  - 画法：浅色水墨云（米白云团 + 淡墨弧线 + 淡影），预渲染成两张小图，每帧只 drawImage；移动时在身后拖几缕云丝。
 * ============================================================ */
(function () {
  var XY = window.XY, Cl = XY.cloud = { IN: 48, OUT: 62, drawn: 0 };
  Cl.enabled = function (G) { return !!(G && G.lv && G.lv.cloudRide && G.rt); };
  /* 返回 true = 这个角色现在在腾云。同时更新 h.cloudOn / h.cloudD。每次调用只依赖当前位置和上一次状态（幂等）。 */
  Cl.on = function (G, h) {
    if (!Cl.enabled(G) || h.down) { h.cloudOn = false; return false; }
    var d = XY.routeProject(G.rt, h.x, h.y).d; h.cloudD = d;
    if (h.cloudOn === undefined) h.cloudOn = d > (Cl.IN + Cl.OUT) / 2;
    else if (h.cloudOn && d < Cl.IN) h.cloudOn = false;
    else if (!h.cloudOn && d > Cl.OUT) h.cloudOn = true;
    return h.cloudOn;
  };
  var spr = null;
  function bake() {
    spr = [];
    for (var v = 0; v < 2; v++) {
      var W = 240, H = 110, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
      var rnd = XY.seeded ? XY.seeded(777 + v * 31) : Math.random;
      var cx = W / 2, cy = 46, blobs = v ? [[-62, 6, 24], [-30, -4, 30], [4, -8, 33], [38, -2, 29], [66, 8, 22], [-10, 14, 30], [30, 14, 26]] : [[-58, 8, 22], [-26, -2, 29], [8, -8, 32], [42, 0, 28], [68, 9, 20], [-4, 14, 31], [-36, 15, 20]];
      c.fillStyle = 'rgba(86,78,62,0.26)'; c.beginPath(); c.ellipse(cx + 4, cy + 30, 86, 15, 0, 0, 6.2832); c.fill();       // 云底淡墨晕
      blobs.forEach(function (b) {
        var x = cx + b[0], y = cy + b[1], r = b[2], g = c.createRadialGradient(x - r * 0.25, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, 'rgba(255,255,252,0.98)'); g.addColorStop(0.72, 'rgba(240,238,228,0.96)'); g.addColorStop(1, 'rgba(184,180,164,0.95)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      });
      c.lineCap = 'round'; c.strokeStyle = 'rgba(58,54,46,0.72)'; c.lineWidth = 2.8;                                          // 淡墨勾云头（只勾上沿，笔触断续）
      blobs.forEach(function (b, i) { if (b[1] > 12) return; var a0 = 3.35 + rnd() * 0.25, a1 = 5.85 - rnd() * 0.3; c.beginPath(); c.arc(cx + b[0], cy + b[1], b[2], a0, a1); c.stroke(); });
      c.strokeStyle = 'rgba(76,72,60,0.5)'; c.lineWidth = 2;
      c.beginPath(); c.arc(cx - 26, cy + 26, 17, 0.4, 2.2); c.stroke(); c.beginPath(); c.arc(cx + 22, cy + 28, 19, 0.7, 2.5); c.stroke();
      spr.push(cv);
    }
  }
  /* 在 (x, footY)（脚底位置）画云：云面在脚下。moving = 正在移动（身后拖云丝）。 */
  Cl.draw = function (c, h, x, footY, r, rt, moving) {
    if (!spr) bake();
    var cv = spr[(h.bob > 3 || h.i === 1 || h.i === 3) ? 1 : 0] || spr[0], w = r * 7.4 * ((XY && XY._partyScale) || 1), k = w / 240, hh = 110 * k;
    if (moving) {
      var fa = (h.face || 0) + Math.PI, ca = Math.cos(fa), sa = Math.sin(fa);
      c.save(); c.lineCap = 'round'; c.strokeStyle = 'rgba(112,108,94,0.42)'; c.lineWidth = 2;
      for (var i = 0; i < 3; i++) { var o = (i - 1) * r * 0.55, bx = x + ca * r * 1.9 - sa * o, by = footY + 4 + sa * r * 1.0 + ca * o * 0.5 + Math.sin(rt * 6 + i) * 1.5, len = r * (1.6 + i * 0.3);
        c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + ca * len * 0.5 - sa * 4, by + sa * len * 0.5 + 4 * Math.sin(rt * 5 + i), bx + ca * len, by + sa * len * 0.9); c.stroke(); }
      c.restore();
    }
    c.drawImage(cv, x - w / 2, footY - 46 * k + r * 0.12, w, hh);
    Cl.drawn++;
  };
})();
