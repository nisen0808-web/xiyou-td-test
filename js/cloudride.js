/* ============================================================
 * cloudride.js —— v0.8.0 腾云：人物不在路上时脚踏一朵水墨云（不迈步、轻轻上下浮），只有走在路上才播走路动画
 *  - 规则（用户 01:09）：“人物不在路上的时候，感觉是腾云驾雾这种，只有在路上才是走路”
 *  - 判定：到路线折线的距离。滞回：进入路上 < IN(48)，离开路上 > OUT(62)，之间保持原状态（不闪）。路面半宽 42。
 *  - 只在 lv.cloudRide 的关卡生效（第 1 关黑风山，背景是整幅画，路画在里面）。其它关未启用（改 levels.js 的开关即可）。
 *  - 只是渲染：不改位置 / 速度 / 碰撞 / 伤害。h.cloudOn 记录当前状态，供测试读取。
 *  - 画法：复用筋斗云水墨图标及其缩略图/原图缓存；未就绪时用纸色墨线云。只替换视觉，保留原脚点、云盒和移动尾迹。
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
      var cv = document.createElement('canvas'); cv.width = 240; cv.height = 110; var c = cv.getContext('2d');
      // Matte paper wash and broken ink curls: usable while the shared icon is pending or failed.
      var rnd = XY.seeded ? XY.seeded(777 + v * 31) : function () { return .5; };
      c.fillStyle = '#f2ecd9'; c.strokeStyle = 'rgba(46,42,34,.75)'; c.lineWidth = 2.2;
      c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      c.moveTo(26,73); c.bezierCurveTo(7,64,10,43,30,38);
      c.bezierCurveTo(27,20,53,14,69,29); c.bezierCurveTo(78,9,107,7,119,24);
      c.bezierCurveTo(140,8,164,19,164,37); c.bezierCurveTo(188,28,207,43,200,57);
      c.bezierCurveTo(219,53,229,61,218,68); c.bezierCurveTo(174,82,71,88,26,73); c.closePath(); c.fill();
      // Separate pressure strokes instead of a continuous bubble outline.
      c.strokeStyle = 'rgba(42,38,31,.76)'; c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(28,68); c.bezierCurveTo(10,61,15,46,29,41); c.stroke();
      c.beginPath(); c.moveTo(76,25); c.bezierCurveTo(86,12,106,13,115,24); c.stroke();
      c.beginPath(); c.moveTo(170,39); c.bezierCurveTo(188,33,203,46,196,55); c.stroke();
      c.lineWidth = 1.2; c.beginPath(); c.moveTo(33,32); c.bezierCurveTo(42,18,58,19,66,29); c.stroke();
      c.beginPath(); c.moveTo(123,24); c.bezierCurveTo(140,13,159,23,160,34); c.stroke();
      c.fillStyle = 'rgba(37,34,29,.82)'; c.beginPath();
      c.moveTo(18,74); c.bezierCurveTo(62,84,92,76,119,78); c.bezierCurveTo(89,89,46,87,18,74); c.fill();
      c.beginPath(); c.moveTo(122,82); c.bezierCurveTo(158,75,199,80,224,67); c.bezierCurveTo(209,87,165,84,148,89); c.bezierCurveTo(167,92,181,87,192,90); c.bezierCurveTo(173,101,139,95,122,90); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(40,37,31,.72)'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(23,63); c.bezierCurveTo(48,74,74,61,69,47); c.bezierCurveTo(65,35,47,38,48,49); c.bezierCurveTo(49,57,61,55,59,49); c.stroke();
      c.beginPath(); c.moveTo(96,31); c.bezierCurveTo(82,20,80,45,99,47); c.bezierCurveTo(117,49,122,31,110,28); c.stroke();
      c.beginPath(); c.moveTo(155,41); c.bezierCurveTo(138,35,130,57,149,62); c.bezierCurveTo(169,66,181,53,170,48); c.stroke();
      c.strokeStyle = 'rgba(56,50,39,.44)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(35,79); c.bezierCurveTo(75,95,155,75,201,80); c.stroke();
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(55,88 + v * 2); c.bezierCurveTo(113,104,182,83,226,76); c.stroke();
      c.beginPath(); c.moveTo(115,98); c.bezierCurveTo(147,91,181,94,206,89); c.stroke();
      // Dry-brush striations stay under the support surface, not across the legs.
      for (var j = 0; j < 24; j++) {
        var xx = 22 + rnd() * 192, yy = 77 + rnd() * 19;
        c.strokeStyle = j % 3 ? 'rgba(41,37,30,.38)' : 'rgba(242,236,217,.8)'; c.lineWidth = .6 + rnd() * 1.1;
        c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 3 + rnd() * 13, yy - 1 - rnd() * 2); c.stroke();
      }
      spr.push(cv);
    }
  }
  /* 在 (x, footY)（脚底位置）画云：云面在脚下。moving = 正在移动（身后拖云丝）。 */
  Cl.draw = function (c, h, x, footY, r, rt, moving) {
    var w = r * 7.4 * ((XY && XY._partyScale) || 1), k = w / 240, hh = 110 * k;
    if (moving) {
      var fa = (h.face || 0) + Math.PI, ca = Math.cos(fa), sa = Math.sin(fa);
      c.save(); c.lineCap = 'round'; c.strokeStyle = 'rgba(112,108,94,0.42)'; c.lineWidth = 2;
      for (var i = 0; i < 3; i++) { var o = (i - 1) * r * 0.55, bx = x + ca * r * 1.9 - sa * o, by = footY + 4 + sa * r * 1.0 + ca * o * 0.5 + Math.sin(rt * 6 + i) * 1.5, len = r * (1.6 + i * 0.3);
        c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + ca * len * 0.5 - sa * 4, by + sa * len * 0.5 + 4 * Math.sin(rt * 5 + i), bx + ca * len, by + sa * len * 0.9); c.stroke(); }
      c.restore();
    }
    var top = footY - 46 * k + r * 0.12, mirror = Math.cos(h.face || 0) < 0 ? 1 : -1;
    var data = XY.ICONINK_DATA && XY.ICONINK_DATA['筋斗云'], painted = false;
    if (data && XY.ICONINK && XY.ICONINK.draw) {
      // Fit the authored 287x181 cloud into the unchanged 240x110 support box.
      var iw = data.fullW || data.w, ih = data.fullH || data.h;
      c.save(); c.translate(x, top + hh / 2); c.scale(mirror, (110 / 240) * iw / ih);
      painted = XY.ICONINK.draw(c, '筋斗云', 0, 0, w); c.restore();
    }
    if (!painted) {
      if (!spr) bake();
      var cv = spr[(h.bob > 3 || h.i === 1 || h.i === 3) ? 1 : 0] || spr[0];
      c.save(); c.translate(x, top); c.scale(mirror, 1); c.drawImage(cv, -w / 2, 0, w, hh); c.restore();
    }
    Cl.drawn++;
  };
})();
