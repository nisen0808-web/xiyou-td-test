/* ============================================================
 * ride.js —— v0.6 批次 3：白龙马骑乘（只有「跟随某人」这一条命令，没有任何上马 / 下马键）
 *   · 白龙马的命令多一档「骑乘」：点按钮 / Shift+5 轮流选目标（悟空→八戒→沙僧→特殊角色→回到跟随），唐僧永远不在候选里
 *   · 一次只能载一个人；换命令、换目标、骑手或白龙马倒下、你改去直接操控白龙马，都会自动下马
 *   · 骑乘时：白龙马不攻击、不放大招、不被妖怪盯上，贴在骑手脚下；骑手移速 ×1.35，攻击照旧
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  C.RIDE_SPEED = 1.35;
  XY.ORDER_NAME.ride = '骑乘'; XY.ORDER_SHORT.ride = '骑乘'; XY.ORDER_DESC.ride = '驮着选定的徒弟 / 特殊角色跑：他移速更快、攻击照旧；白龙马自己不攻击';
  function horse(G) { var h = G.heroes[4]; return h && h.id === 'horse' ? h : null; }
  XY.rideCands = function (G) {
    var out = [], hs = horse(G); if (!hs || hs.down) return out;
    for (var i = 1; i < G.heroes.length; i++) { if (i === 4) continue; var h = G.heroes[i]; if (h && !h.down) out.push(i); }
    return out;
  };
  function dismount(G, why) {
    var hs = horse(G); if (!hs) return;
    if (hs.ridden && G.heroes[hs.rideTgt]) G.heroes[hs.rideTgt].mounted = false;
    hs.ridden = false;
    if (why && hs.order === 'ride') { hs.order = 'follow'; }
    G.heroes.forEach(function (x) { x.mounted = false; });
    if (hs.rideTgt != null && why && XY.toast) XY.toast(G, '白龙马：' + why);
  }
  // 选骑乘对象（i = 英雄序号）。返回是否成功
  XY.rideSet = function (G, idx) {
    var hs = horse(G); if (!hs || hs.down) return false;
    if (idx === 0) { XY.toast(G, '唐僧不能骑，他自己赶路'); return false; }
    var t = G.heroes[idx]; if (!t || t.down || idx === 4) return false;
    G.heroes.forEach(function (x) { x.mounted = false; });
    hs.order = 'ride'; hs.rideTgt = idx; hs.retreat = false; hs.tgt = null;
    XY.toast(G, '白龙马：骑乘 ' + t.def.name + (G.ctrl === 4 ? '（你正在操控白龙马，改去操控别人后才会上马）' : ''));
    return true;
  };
  XY.rideCycle = function (G) {          // 在候选里轮流；最后一个之后回到「跟随」
    var hs = horse(G); if (!hs || hs.down) return false;
    var c = XY.rideCands(G); if (!c.length) return false;
    var k = hs.order === 'ride' ? c.indexOf(hs.rideTgt) : -1;
    if (hs.order === 'ride' && k >= c.length - 1) { return XY.setOrder(G, 4, 'follow'); }
    return XY.rideSet(G, c[k + 1]);
  };
  XY.rideTick = function (G) {
    var hs = horse(G); if (!hs) return;
    var t = hs.order === 'ride' ? G.heroes[hs.rideTgt] : null;
    if (!t) { if (hs.ridden) dismount(G, ''); hs.ridden = false; return; }
    if (hs.down || t.down || hs.rideTgt === 0 || hs.rideTgt === 4) { dismount(G, '骑手或白龙马倒下，已下马'); return; }
    if (G.ctrl === 4) { if (hs.ridden) dismount(G, ''); hs.ridden = false; return; }          // 你自己操控白龙马：它不驮人
    if (!hs.ridden) { hs.ridden = true; XY.core.ring(G, t.x, t.y, 54, '#6fcfd8', 0.4, true); }
    G.heroes.forEach(function (x) { x.mounted = false; }); t.mounted = true;
    if (XY.anim) XY.anim.rideFx(G, t);
  };
  XY.rideHorseStep = function (G, hs) {   // 每帧：白龙马贴在骑手脚下
    var t = G.heroes[hs.rideTgt]; hs.x = t.x; hs.y = t.y + 6; hs.face = t.face; hs.moving = t.moving; hs.inv = Math.max(hs.inv, 0.25); hs.dash = null; hs.atkT = Math.max(hs.atkT || 0, 0.2);
  };
  XY.rideName = function (G, hs) { var t = G.heroes[hs.rideTgt]; return t ? t.def.name : ''; };
  // 与 setOrder / cycleOrder 的衔接
  var oldSet = XY.setOrder, oldCycle = XY.cycleOrder;
  XY.setOrder = function (G, i, order) {
    if (order === 'ride') { if (i !== 4) return false; var c = XY.rideCands(G); return c.length ? XY.rideSet(G, c[0]) : false; }
    var h = G.heroes[i]; if (h && h.id === 'horse' && h.ridden) dismount(G, '');
    return oldSet(G, i, order);
  };
  XY.cycleOrder = function (G, i) {
    var h = G.heroes[i];
    if (h && h.id === 'horse' && !h.down) { if (h.order === 'ride') return XY.rideCycle(G); if (h.order === 'guard') return XY.rideSet(G, (XY.rideCands(G)[0])); }
    return oldCycle(G, i);
  };
})();
