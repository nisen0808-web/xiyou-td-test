/* ============================================================
 * monsterart.js —— v0.6.4 妖怪造型：不再用圆圈
 *  - 9 个 BOSS 各一个全身造型（比小怪大 3 倍多，剪影不同）：牛魔王 / 黑熊精 / 白骨精 / 金角大王 / 红孩儿 / 黄风怪 / 铁扇公主 / 玉面公主 / 赤焰魔
 *  - 精英（牛头卫）：披甲牛头人；小怪：小妖（带角小鬼）/ 弓箭妖（兜帽 + 弓）/ 石头怪（岩石傀儡），这三种仍然预渲染成精灵图
 *  - 狂暴：身体偏红、双眼发红光、头顶肩上有火苗；红光环与「狂暴」条在 render4.js 的 enemyOver 里
 *  - 全部矢量路径 + 粗描边，不用 shadowBlur；只画屏幕上的 BOSS（一般 1~3 个）
 * ============================================================ */
(function () {
  var XY = window.XY, PI2 = Math.PI * 2, MA = XY.MA = {};
  var c, FL = false, EN = false, RT = 0, DK = '#333', SW = 0, LK = 1, mixC = {};
  function hexRGB(h) { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(a, b, t) {
    var k = a + b + t, v = mixC[k]; if (v) return v;
    var x = hexRGB(a), y = hexRGB(b), o = '#'; for (var i = 0; i < 3; i++) { var n = Math.round(x[i] + (y[i] - x[i]) * t).toString(16); o += n.length < 2 ? '0' + n : n; }
    return (mixC[k] = o);
  }
  function col(h) { if (FL) return '#ffffff'; return EN ? mix(h, '#1c140e', 0.32) : h; }
  function F(h) { c.fillStyle = col(h); }
  function fs(h) { F(h); c.fill(); c.stroke(); }
  function poly(a) { c.beginPath(); c.moveTo(a[0], a[1]); for (var i = 2; i < a.length; i += 2) c.lineTo(a[i], a[i + 1]); c.closePath(); }
  function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function ell(x, y, a, b, h, rot) { c.beginPath(); c.ellipse(x, y, a, b, rot || 0, 0, PI2); if (h) fs(h); }
  function limb(x1, y1, x2, y2, w, h) {                                // 粗圆头线段：手臂 / 腿 / 杆（先描边再上色）
    c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = DK; c.lineWidth = w + 6; c.stroke(); c.strokeStyle = col(h); c.lineWidth = w; c.stroke(); c.strokeStyle = DK; c.lineWidth = 3;
  }
  function inkWisp(x, y, w, h, ph) {                               // 狂暴：飞白墨气，一点朱砂，不发红光
    var sw = Math.sin(RT * 5 + ph) * w * 0.22;
    c.save();
    c.strokeStyle = 'rgba(28,22,16,0.75)';
    c.fillStyle = 'rgba(36,28,20,0.30)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - w * 0.35, y);
    c.quadraticCurveTo(x - w * 0.12 + sw, y - h * 0.55, x + sw * 0.35, y - h);
    c.quadraticCurveTo(x + w * 0.42, y - h * 0.38, x + w * 0.18, y);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(141,31,24,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - w * 0.06, y - 2);
    c.quadraticCurveTo(x + sw * 0.2, y - h * 0.34, x + sw * 0.12, y - h * 0.6);
    c.stroke();
    c.restore();
  }
  function flame(x, y, w, h, c1, c2, ph) {                              // 火苗（会摇）
    var sw = Math.sin(RT * 9 + ph) * w * 0.25;
    c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x - w * 0.7, y - h * 0.5, x + sw, y - h); c.quadraticCurveTo(x + w * 0.7, y - h * 0.45, x + w / 2, y); c.closePath();
    c.fillStyle = FL ? '#fff' : c1; c.fill();
    c.beginPath(); c.moveTo(x - w * 0.28, y); c.quadraticCurveTo(x - w * 0.3, y - h * 0.4, x + sw * 0.6, y - h * 0.62); c.quadraticCurveTo(x + w * 0.32, y - h * 0.35, x + w * 0.28, y); c.closePath();
    c.fillStyle = FL ? '#fff' : c2; c.fill();
  }
  function eyes(x, y, gap, sz, angry) {                                 // 眼睛：狂暴时发红光 + 眉毛压低
    for (var s = -1; s <= 1; s += 2) {
      var ex = x + s * gap;
      c.fillStyle = EN ? '#efe6d4' : '#fff'; c.beginPath(); c.ellipse(ex, y, sz, sz * 0.8, 0, 0, PI2); c.fill(); c.lineWidth = 2; c.stroke();
      c.fillStyle = EN ? '#1c140e' : '#c0392b'; c.beginPath(); c.ellipse(ex + LK * sz * 0.3, y + 0.5, sz * 0.5, sz * 0.58, 0, 0, PI2); c.fill();
      if (angry) { c.lineWidth = EN ? 4.5 : 3.2; c.beginPath(); c.moveTo(ex + s * sz * 1.3, y - sz * (EN ? 2.3 : 1.8)); c.lineTo(ex - s * sz * 1.2, y - sz * (EN ? 0.7 : 1.0)); c.stroke(); }
    }
    c.lineWidth = 3;
  }
  function legs(x1, x2, top, h, color, wid) {
    var w = wid || 18;
    rr(x1 - w / 2, top, w, h + SW, 6); fs(color); rr(x2 - w / 2, top, w, h - SW, 6); fs(color);
  }
  function horn(s, x0, y0, x1, y1, x2, y2, h) { c.beginPath(); c.moveTo(s * x0, y0); c.quadraticCurveTo(s * x1, y1, s * x2, y2); c.quadraticCurveTo(s * (x0 + x2) / 2 * 0.8, (y0 + y2) / 2 + 6, s * (x0 - 12), y0 + 4); c.closePath(); fs(h); }
  function crown(n, x, y, w, h, c1, c2) { for (var i = 0; i < n; i++) flame(x + (i - (n - 1) / 2) * w, y - Math.abs(i - (n - 1) / 2) * 3, w * 1.2, h - Math.abs(i - (n - 1) / 2) * 7, c1, c2, i * 1.7); }

  /* ---------- 9 个 BOSS（原点 = 单位位置，脚在 y=+34，头顶约 y=-100；整体乘 r/44） ---------- */
  var FIG = {
    bull: function (d, A) {                                              // 牛魔王：披甲牛头巨汉 + 狼牙棒
      poly([-30, -34, 30, -34, 50, 32, -50, 32]); fs('#b8322a');
      legs(-15, 15, 10, 26, '#4a2a7a', 22);
      rr(-12, 30, 24, 6, 3); F('#f3ead2'); c.fill();
      rr(-36, -38, 72, 56, 20); fs(d.color); rr(-23, -14, 46, 30, 12); fs('#a98bd8');
      rr(-36, 8, 72, 9, 3); fs('#f0b429'); rr(-8, 6, 16, 13, 3); fs('#ffd75e');
      limb(-38, -24, -56, 2 - A.up * 6, 16, d.color); rr(-65, -6 - A.up * 6, 18, 16, 6); fs('#7a4ab5');
      poly([-36, -36, -56, -30, -60, -8, -42, -16]); fs('#f0b429'); poly([36, -36, 56, -30, 60, -8, 42, -16]); fs('#f0b429');
      poly([-50, -31, -45, -43, -41, -34]); fs('#f3ead2'); poly([50, -31, 45, -43, 41, -34]); fs('#f3ead2');
      limb(38, -24, 56, -8, 16, d.color);
      c.save(); c.translate(58, -8); c.rotate(0.55 - A.up * 2.5 + A.swing); c.lineCap = 'round';                // 狼牙棒
      rr(-5, -66, 10, 76, 4); fs('#8a6a3a'); rr(-15, -104, 30, 46, 10); fs('#8c8c9a');
      poly([-15, -92, -25, -97, -15, -82]); fs('#cfcfd8'); poly([15, -92, 25, -97, 15, -82]); fs('#cfcfd8'); poly([-15, -72, -25, -75, -15, -64]); fs('#cfcfd8'); poly([15, -72, 25, -75, 15, -64]); fs('#cfcfd8'); poly([-8, -104, 0, -116, 8, -104]); fs('#cfcfd8');
      c.restore();
      rr(-28, -76, 56, 44, 18); fs(d.color);
      poly([-28, -64, -42, -72, -36, -52]); fs(d.color); poly([28, -64, 42, -72, 36, -52]); fs(d.color);
      horn(-1, 20, -70, 56, -66, 54, -104, '#f3ead2'); horn(1, 20, -70, 56, -66, 54, -104, '#f3ead2');
      rr(-16, -54, 32, 22, 10); fs('#c9a8ee'); ell(-6, -42, 3, 4, '#4a2a7a'); ell(6, -42, 3, 4, '#4a2a7a');
      c.strokeStyle = '#e0a415'; c.lineWidth = 3; c.beginPath(); c.arc(0, -35, 6, 0.2, Math.PI - 0.2); c.stroke(); c.strokeStyle = DK;
      eyes(0, -62, 12, 5.5, true);
    },
    bear: function (d, A) {                                              // 黑熊精：圆耳大肚 + 黑缨枪
      limb(-52, 34, -52 - A.swing * 6, -100, 6, '#8a6a3a'); poly([-58, -98, -52, -124, -46, -98]); fs('#d8dde6'); poly([-58, -98, -62, -80, -52, -88, -42, -80, -46, -98]); fs('#c0392b');
      legs(-16, 16, 10, 26, '#4a3a33', 24);
      rr(-40, -40, 80, 64, 26); fs(d.color); rr(-25, -14, 50, 34, 16); fs('#8c7a70');
      poly([-36, -36, 36, -36, 30, -2, -30, -2]); fs('#3a302b'); for (var i = -2; i <= 2; i += 2) { ell(i * 11, -26, 3, 3, '#f0b429'); }
      limb(-40, -24, -58, 4 - A.up * 8, 20, d.color); limb(40, -24, 58, 4 - A.up * 24, 20, d.color);
      for (var s = -1; s <= 1; s += 2) for (var k = -1; k <= 1; k++) { poly([s * 58 + k * 6 - 3, 12 - A.up * (s > 0 ? 24 : 8), s * 58 + k * 6 + 3, 12 - A.up * (s > 0 ? 24 : 8), s * 58 + k * 6, 22 - A.up * (s > 0 ? 24 : 8)]); fs('#f3ead2'); }
      ell(-24, -76, 12, 12, d.color); ell(-24, -76, 6, 6, '#a58f84'); ell(24, -76, 12, 12, d.color); ell(24, -76, 6, 6, '#a58f84');
      rr(-30, -78, 60, 48, 22); fs(d.color); ell(0, -48, 17, 12, '#c9b3a2'); ell(0, -54, 6, 4.5, '#2e2420');
      poly([-8, -41, -4, -33, 0, -41]); fs('#fff'); poly([0, -41, 4, -33, 8, -41]); fs('#fff');
      eyes(0, -66, 13, 5, true);
    },
    bone: function (d, A) {                                              // 白骨精：白骨长裙 + 骷髅脸 + 鬼火
      for (var s = -1; s <= 1; s += 2) { flame(s * 54, -10 + Math.sin(RT * 3 + s) * 6, 16, 26, '#7cf0c0', '#d8fff0', s); }
      limb(46, 36, 46, -84, 5, '#d8d2b8'); ell(46, -90, 9, 9, '#f6f2e4'); ell(43, -91, 2.4, 3, '#2a2a3a'); ell(49, -91, 2.4, 3, '#2a2a3a');
      poly([-20, -34, 20, -34, 44, 34, -44, 34]); fs('#f6f2e4');
      c.strokeStyle = '#b9b296'; c.lineWidth = 2.5; for (var r = 0; r < 4; r++) { c.beginPath(); c.moveTo(-14 + r * 2, -28 + r * 9); c.quadraticCurveTo(0, -22 + r * 9, 14 - r * 2, -28 + r * 9); c.stroke(); } c.strokeStyle = DK; c.lineWidth = 3;
      rr(-22, -36, 44, 7, 3); fs('#7b6aa8');
      poly([-20, -32, -48, -4 - A.up * 20, -38, 6 - A.up * 20, -16, -18]); fs('#efe9d4'); poly([20, -32, 44, -10, 38, 6, 16, -18]); fs('#efe9d4');
      poly([-22, -64, -34, -20, -20, -30, -2, -26, 22, -30, 34, -20, 22, -64]); fs('#4a4560');
      rr(-19, -72, 38, 36, 14); fs('#f6f2e4'); ell(-8, -56, 6, 7.5, '#2a2a3a'); ell(8, -56, 6, 7.5, '#2a2a3a');
      c.fillStyle = EN ? '#1c140e' : '#7cf0c0'; c.beginPath(); c.arc(-8, -56, 2.4, 0, PI2); c.arc(8, -56, 2.4, 0, PI2); c.fill();
      poly([-3, -48, 0, -43, 3, -48]); fs('#2a2a3a'); c.beginPath(); c.moveTo(-8, -40); c.lineTo(8, -40); c.stroke();
      for (var t = -6; t <= 6; t += 4) { c.beginPath(); c.moveTo(t, -42); c.lineTo(t, -38); c.stroke(); }
      limb(10, -72, 22, -86, 4, '#f3ead2');
    },
    jin: function (d, A) {                                               // 金角大王：金甲 + 独角盔 + 紫金红葫芦
      poly([-26, -34, 26, -34, 46, 32, -46, 32]); fs('#c0392b');
      legs(-14, 14, 10, 26, '#8a6a0b', 20);
      rr(-33, -38, 66, 56, 16); fs(d.color); rr(-33, -4, 66, 8, 3); fs('#8a6a0b');
      poly([0, -28, 8, -18, 0, -8, -8, -18]); fs('#d33'); c.strokeStyle = '#8a6a0b'; c.lineWidth = 2; c.beginPath(); c.moveTo(-22, -22); c.lineTo(-12, -8); c.moveTo(22, -22); c.lineTo(12, -8); c.stroke(); c.strokeStyle = DK; c.lineWidth = 3;
      poly([-33, -38, -52, -32, -54, -14, -36, -22]); fs('#f4cf5a'); poly([33, -38, 52, -32, 54, -14, 36, -22]); fs('#f4cf5a');
      limb(-36, -24, -54, 2, 15, '#f0c85a'); limb(36, -24, 52, 4 - A.up * 20, 15, '#f0c85a');
      c.save(); c.translate(56, 6 - A.up * 20); c.rotate(A.swing * 0.5);                              // 紫金红葫芦
      c.beginPath(); c.moveTo(-4, -12); c.lineTo(4, -12); c.lineTo(3, -4); c.lineTo(-3, -4); c.closePath(); fs('#f4cf5a'); ell(0, 4, 10, 9, '#d33'); ell(0, 22, 14, 13, '#d33'); ell(-4, 20, 3, 5, '#ff9a8a'); c.restore();
      c.strokeStyle = '#f4cf5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-54, 2); c.quadraticCurveTo(-72, 20, -56, 30); c.quadraticCurveTo(-40, 24, -52, 6); c.stroke(); c.strokeStyle = DK; c.lineWidth = 3;
      rr(-24, -74, 48, 42, 16); fs('#f4cf5a'); rr(-16, -62, 32, 28, 11); fs('#f6d9a8');
      poly([-24, -66, -36, -60, -34, -44, -24, -48]); fs('#f4cf5a'); poly([24, -66, 36, -60, 34, -44, 24, -48]); fs('#f4cf5a');
      poly([-9, -72, 9, -72, 0, -118]); fs('#fff6cf');
      poly([-14, -42, 0, -30, 14, -42, 8, -36, 0, -34, -8, -36]); fs('#7a5a1a'); eyes(0, -54, 9, 4.6, true);
    },
    red: function (d, A) {                                               // 红孩儿：火焰发髻 + 风火轮 + 火尖枪
      for (var s = -1; s <= 1; s += 2) { flame(s * 14, 40, 26, 30 + Math.sin(RT * 12 + s) * 4, '#ff7a2a', '#ffe45a', s * 2); }
      limb(40, 34, 54 - A.swing * 6, -92, 6, '#8a4a1a'); flame(54 - A.swing * 6, -86, 22, 40, '#ff4a1a', '#ffd23a', 1);
      legs(-11, 11, 8, 24, '#b02a14', 16);
      rr(-27, -32, 54, 46, 16); fs(d.color); poly([-18, -4, 18, -4, 22, 16, -22, 16]); fs('#f6b84a');
      rr(-27, -2, 54, 7, 3); fs('#ffd23a');
      limb(-28, -22, -46, 2, 14, '#ffcba4'); limb(28, -22, 44, 0 - A.up * 20, 14, '#ffcba4');
      crown(4, 0, -72, 11, 42, '#ff4a1a', '#ffd23a');
      rr(-25, -70, 50, 42, 18); fs('#ffcba4'); poly([-25, -62, -28, -46, -18, -34, -25, -34]); fs('#e0452e'); poly([25, -62, 28, -46, 18, -34, 25, -34]); fs('#e0452e');
      c.fillStyle = EN ? '#6a5346' : '#ff9a8a'; c.beginPath(); c.ellipse(-14, -44, 5, 3.4, 0, 0, PI2); c.ellipse(14, -44, 5, 3.4, 0, 0, PI2); c.fill();
      eyes(0, -54, 10, 5, true); c.beginPath(); c.moveTo(-5, -38); c.quadraticCurveTo(0, -34, 5, -38); c.stroke();
    },
    yellow: function (d, A) {                                            // 黄风怪：尖嘴黄毛怪 + 旋风
      c.strokeStyle = 'rgba(214,180,70,0.85)'; c.lineWidth = 5; c.lineCap = 'round'; for (var w = 0; w < 3; w++) { c.beginPath(); c.arc(0, -24 + w * 4, 54 + w * 12, RT * 3 + w * 2, RT * 3 + w * 2 + 1.5); c.stroke(); } c.strokeStyle = DK; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-26, 20); c.quadraticCurveTo(-72, 18, -64, -36); c.strokeStyle = DK; c.lineWidth = 15; c.stroke(); c.strokeStyle = col('#e8c44a'); c.lineWidth = 9; c.stroke(); c.strokeStyle = DK; c.lineWidth = 3;
      legs(-13, 13, 12, 24, '#6b5510', 18);
      poly([-22, -34, 22, -34, 44, 28, -44, 28]); fs(d.color); poly([-6, -34, 6, -34, 14, 28, -14, 28]); fs('#e8c44a'); rr(-24, -8, 48, 7, 3); fs('#8a6a0b');
      limb(-24, -26, -44, -2, 14, '#e8c44a'); limb(24, -26, 46, -6 - A.up * 20, 14, '#e8c44a');
      for (var s = -1; s <= 1; s += 2) for (var k = 0; k < 3; k++) { poly([s * 46 - 3 + k * 5 * s, -2 - A.up * (s > 0 ? 20 : 0), s * 46 + 3 + k * 5 * s, -2 - A.up * (s > 0 ? 20 : 0), s * 46 + k * 5 * s, 8 - A.up * (s > 0 ? 20 : 0)]); fs('#fff'); }
      poly([-22, -64, -34, -92, -8, -72]); fs('#e8c44a'); poly([22, -64, 34, -92, 8, -72]); fs('#e8c44a');
      rr(-22, -74, 44, 40, 14); fs('#e8c44a'); poly([-4, -58, 26, -48, -4, -38]); fs('#f6dc86'); ell(24, -48, 3.6, 3, '#2a2a3a');
      c.lineWidth = 2; c.beginPath(); c.moveTo(14, -42); c.lineTo(34, -38); c.moveTo(14, -45); c.lineTo(34, -48); c.stroke(); c.lineWidth = 3; eyes(-6, -62, 9, 4.6, true);
    },
    iron: function (d, A) {                                              // 铁扇公主：长裙 + 巨大芭蕉扇
      poly([-20, -32, 20, -32, 46, 34, -46, 34]); fs(d.color); rr(-20, -34, 40, 9, 4); fs('#f0b429');
      poly([0, -24, 14, 34, -14, 34]); fs('#8fd6cd');
      limb(-20, -26, -40, 0, 13, '#ffe0c2'); poly([-22, -28, -50, -2, -40, 8, -16, -16]); fs(d.color);
      c.save(); c.translate(50, -10); c.rotate(-0.5 + A.swing * 0.7 - A.up * 0.5);                      // 芭蕉扇
      limb(0, 14, 0, -4, 5, '#8a6a3a'); c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(-34, -20, -34, -76, 0, -96); c.bezierCurveTo(34, -76, 34, -20, 0, -4); c.closePath(); fs('#7fcf8a');
      c.strokeStyle = '#2f8a4a'; c.lineWidth = 2; for (var r = -2; r <= 2; r++) { c.beginPath(); c.moveTo(0, -6); c.lineTo(r * 12, -80 + Math.abs(r) * 10); c.stroke(); } c.strokeStyle = DK; c.lineWidth = 3; c.restore();
      limb(20, -26, 40, -6, 13, '#ffe0c2');
      poly([-24, -62, -30, -34, -20, -38, 20, -38, 30, -34, 24, -62]); fs('#2e2a3a');
      rr(-19, -72, 38, 36, 15); fs('#ffe0c2'); ell(0, -80, 12, 9, '#2e2a3a'); limb(-12, -88, 12, -82, 3, '#f0b429');
      c.fillStyle = EN ? '#6a5346' : '#ff9a8a'; c.beginPath(); c.ellipse(-11, -48, 4.2, 2.8, 0, 0, PI2); c.ellipse(11, -48, 4.2, 2.8, 0, 0, PI2); c.fill();
      eyes(0, -58, 8, 4.2, true); c.fillStyle = '#d6445a'; c.beginPath(); c.ellipse(0, -43, 4, 2, 0, 0, PI2); c.fill();
    },
    yumian: function (d, A) {                                            // 玉面公主：狐耳 + 三条蓬松尾巴 + 粉裙
      for (var t = -1; t <= 1; t++) { c.beginPath(); c.moveTo(t * 10, 10); c.quadraticCurveTo(-60 + t * 26, -10 + t * 26, -50 + t * 30, -56 + t * 10 + Math.sin(RT * 4 + t) * 4); c.quadraticCurveTo(-26 + t * 12, -20, t * 10 + 14, 20); c.closePath(); fs(t ? '#f6b6cf' : '#fff0f6'); }
      poly([-20, -32, 20, -32, 44, 34, -44, 34]); fs(d.color); rr(-20, -34, 40, 9, 4); fs('#fff0f6'); poly([-8, -24, 8, -24, 18, 34, -18, 34]); fs('#ffd0e2');
      limb(-20, -26, -42, -2, 13, '#ffe6d0'); poly([-22, -28, -50, -2, -38, 10, -16, -16]); fs(d.color); limb(20, -26, 40, -8 - A.up * 20, 13, '#ffe6d0');
      limb(42, -8 - A.up * 20, 54, -34 - A.up * 20, 4, '#8a6a3a'); ell(56, -40 - A.up * 20, 12, 8, '#fff0f6', -0.6);
      poly([-18, -66, -26, -96, -6, -74]); fs('#f6b6cf'); poly([18, -66, 26, -96, 6, -74]); fs('#f6b6cf'); poly([-17, -68, -22, -88, -9, -73]); fs('#fff0f6'); poly([17, -68, 22, -88, 9, -73]); fs('#fff0f6');
      poly([-22, -62, -30, -30, -20, -38, 20, -38, 30, -30, 22, -62]); fs('#7a3a5a');
      rr(-19, -72, 38, 36, 15); fs('#ffe6d0'); poly([-8, -78, 0, -92, 8, -78]); fs('#f0b429');
      c.fillStyle = EN ? '#6a5346' : '#ff9ab0'; c.beginPath(); c.ellipse(-11, -48, 4.2, 2.8, 0, 0, PI2); c.ellipse(11, -48, 4.2, 2.8, 0, 0, PI2); c.fill();
      eyes(0, -58, 8, 4.2, true); c.fillStyle = '#d6445a'; c.beginPath(); c.ellipse(0, -43, 4, 2, 0, 0, PI2); c.fill();
    },
    chiyan: function (d, A) {                                            // 赤焰魔：熔岩巨魔 + 火焰鬃发
      for (var s = -1; s <= 1; s += 2) flame(s * 50, 20, 20, 40 + Math.sin(RT * 8 + s) * 6, '#ff7a2a', '#ffe45a', s);
      legs(-16, 16, 10, 26, '#5a2210', 24);
      rr(-38, -40, 76, 60, 18); fs(d.color); c.strokeStyle = EN ? '#3a342c' : '#ffd23a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-18, -32); c.lineTo(-8, -14); c.lineTo(-22, 0); c.moveTo(14, -34); c.lineTo(6, -16); c.lineTo(20, 4); c.moveTo(-4, -4); c.lineTo(4, 12); c.stroke(); c.strokeStyle = DK;
      poly([-38, -40, -62, -52, -58, -16, -40, -20]); fs('#7a2a0b'); poly([38, -40, 62, -52, 58, -16, 40, -20]); fs('#7a2a0b');
      limb(-40, -24, -60, 4, 18, d.color); limb(40, -24, 62, 4 - A.up * 24, 18, d.color);
      rr(-72, -4, 22, 20, 7); fs('#7a2a0b'); rr(52, -4 - A.up * 24, 22, 20, 7); fs('#7a2a0b'); flame(-61, -4, 16, 22, '#ff7a2a', '#ffe45a', 0); flame(63, -4 - A.up * 24, 16, 22, '#ff7a2a', '#ffe45a', 2);
      crown(5, 0, -66, 14, 56, '#ff5a1a', '#ffd23a');
      rr(-28, -76, 56, 44, 16); fs('#7a2a0b'); horn(-1, 20, -70, 52, -62, 46, -98, '#ffb02a'); horn(1, 20, -70, 52, -62, 46, -98, '#ffb02a');
      c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(-14, -42); c.lineTo(14, -42); c.lineTo(10, -34); c.lineTo(5, -40); c.lineTo(0, -34); c.lineTo(-5, -40); c.lineTo(-10, -34); c.closePath(); c.fill(); c.stroke();
      eyes(0, -60, 12, 5.5, true);
    }
  };
  var ALIAS = { boss: 'bull' };
  MA.hasFigure = function (e) { return !!(e && e.def && e.def.denBoss && FIG[ALIAS[e.type] || e.type] || (e.def && e.def.denBoss && FIG[e.def.kit])); };
  MA.scale = function (e) { return e.r / 44; };
  MA.topOf = function (e) { if (XY.MINK && XY.MINK.has(e.type)) return XY.MINK.top(e); return 112 * MA.scale(e); };   // v0.8.0：水墨精灵有自己的头顶高度
  MA.flameAt = function (ctx, rt, x, y, w, h, ph) { c = ctx; FL = false; RT = rt; inkWisp(x, y, w, h, ph); };   // 给 monsterink 画狂暴墨气                    // 头顶（含角）距单位原点的像素

  // 画一个 BOSS 全身像（c 已在世界坐标；原点 = 单位位置）
  MA.boss = function (ctx, G, e, rt) {
    if (XY.MINK && XY.MINK.boss(ctx, G, e, rt)) return true;                           // v0.8.0：黑熊精 / 白骨精走水墨精灵，没图时才画下面的矢量版
    var d = e.def, fig = FIG[ALIAS[e.type] || e.type] || FIG[d.kit]; if (!fig) return false;
    c = ctx; FL = e.flash > 0; EN = !!e.enraged; RT = rt; DK = EN ? '#1c140e' : d.dark; SW = Math.sin(rt * 8 + (e.wob || 0)) * 4;
    var th = e.toCamp || !e.th ? G.camp : e.th; LK = th.x > e.x ? 1 : -1;
    var s = MA.scale(e), bs = e.bstate, A = { up: bs === 'slam' ? 1 : (bs === 'tele' ? 0.5 + 0.2 * Math.sin(rt * 30) : 0), swing: Math.sin(rt * 5 + (e.wob || 0)) * 0.12 + (bs === 'charge' ? 0.5 : 0) };
    var bob = Math.sin(rt * 6 + (e.wob || 0)) * 1.6, lean = bs === 'charge' ? 0.18 * LK : 0;
    // 脚下影子 + 狂暴时脚下的红色火圈（椭圆，贴地）
    c.fillStyle = 'rgba(70,50,30,0.2)'; c.beginPath(); c.ellipse(e.x, e.y + 34 * s, 46 * s, 12 * s, 0, 0, PI2); c.fill();
    if (EN) { var ep = 0.5 + 0.5 * Math.sin(rt * 3); c.strokeStyle = 'rgba(36,28,20,' + (0.35 + 0.15 * ep) + ')'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(e.x, e.y + 34 * s, 58 * s, 14 * s, 0, 0, PI2); c.stroke(); c.strokeStyle = 'rgba(141,31,24,0.5)'; c.lineWidth = 1.1; c.beginPath(); c.ellipse(e.x, e.y + 32 * s, 34 * s, 7 * s, 0, 0.3, 2.1); c.stroke(); }
    c.save(); c.translate(e.x, e.y - 2 * s + bob); c.scale(s * LK, s); if (lean) c.rotate(lean * 0.5 * LK); c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = DK;
    // 原图朝右（武器在右）；LK=-1 时整体水平翻转，文字不在这里画，所以不会镜像
    fig(d, A);
    if (EN) {                                                           // 狂暴：肩头飞白墨气
      inkWisp(-40, -34, 16, 28, 0.3); inkWisp(40, -34, 16, 28, 1.9);
    }
    c.restore(); c.lineCap = 'butt';
    return true;
  };

  /* ---------- 精英：牛头卫（披甲牛头人，比小怪大一圈，红光脉动改成地面椭圆） ---------- */
  MA.elite = function (ctx, G, e, rt) {
    if (XY.MINK && XY.MINK.elite(ctx, G, e, rt)) return;                                 // v0.8.0：牛头卫水墨精灵
    var d = e.def; c = ctx; FL = e.flash > 0; EN = false; RT = rt; DK = d.dark; SW = Math.sin(rt * 9 + (e.wob || 0)) * 3;
    var th = e.toCamp || !e.th ? G.camp : e.th; LK = th.x > e.x ? 1 : -1; var s = e.r / 27 * 0.58, bob = Math.sin(rt * 8 + (e.wob || 0)) * 1.2;
    var pr = 0.5 + 0.5 * Math.sin(rt * 6);
    c.strokeStyle = 'rgba(217,83,79,' + (0.25 + 0.2 * pr) + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.9, e.r * 1.25, e.r * 0.42, 0, 0, PI2); c.stroke();
    c.fillStyle = 'rgba(70,50,30,0.18)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.95, e.r * 0.3, 0, 0, PI2); c.fill();
    c.save(); c.translate(e.x, e.y + bob - 8 * s); c.scale(s * LK, s); c.lineJoin = 'round'; c.lineWidth = 3.4; c.strokeStyle = DK;
    legs(-12, 12, 10, 24, '#7a2420', 18); rr(-30, -34, 60, 48, 16); fs(d.color); rr(-18, -12, 36, 22, 9); fs('#f0a4a0'); rr(-30, 4, 60, 8, 3); fs('#f0b429');
    poly([-30, -32, -48, -28, -50, -8, -34, -14]); fs('#a8a8b4'); poly([30, -32, 48, -28, 50, -8, 34, -14]); fs('#a8a8b4');
    limb(-32, -22, -48, 4, 14, d.color); limb(32, -22, 48, 2, 14, d.color);
    limb(52, 26, 52, -50, 5, '#8a6a3a'); poly([46, -50, 52, -76, 58, -50]); fs('#d8dde6');      // 长矛
    rr(-24, -68, 48, 40, 15); fs(d.color); horn(-1, 18, -62, 48, -58, 46, -90, '#f3ead2'); horn(1, 18, -62, 48, -58, 46, -90, '#f3ead2');
    rr(-14, -48, 28, 18, 8); fs('#f0a4a0'); ell(-5, -38, 2.6, 3.4, '#8f1f1b'); ell(5, -38, 2.6, 3.4, '#8f1f1b');
    eyes(0, -56, 10, 4.6, true); c.restore(); c.lineCap = 'butt';
  };

  /* ---------- 小怪（预渲染成精灵图；原点 = 单位中心，r = 半径） ---------- */
  MA.minion = function (ctx, e, look, fl) {
    var d = e.def, r = e.r, t = e.type; c = ctx; FL = !!fl; EN = false; DK = d.dark; LK = look; var k = r / 12;
    c.save(); c.translate(e.x, e.y); c.scale(k * look, k); c.lineJoin = 'round'; c.lineWidth = 2.2 / k * (t === 'tank' ? 1.1 : 1); c.strokeStyle = DK;
    c.lineWidth = 2.2; if (k > 1.3) c.lineWidth = 2.6 / Math.sqrt(k);
    if (t === 'small') {                                                // 小妖：梨形身体 + 双角 + 大尖耳 + 小尾巴
      c.beginPath(); c.moveTo(-3, 11); c.quadraticCurveTo(-14, 10, -12, -2); c.quadraticCurveTo(-8, -14, 0, -14); c.quadraticCurveTo(8, -14, 12, -2); c.quadraticCurveTo(14, 10, 3, 11); c.closePath(); fs(d.color);
      poly([-9, -9, -17, -13, -12, -3]); fs(d.color); poly([9, -9, 17, -13, 12, -3]); fs(d.color);
      poly([-6, -12, -9, -23, -1, -14]); fs('#f3ead2'); poly([6, -12, 9, -23, 1, -14]); fs('#f3ead2');
      ell(-6, 12, 5, 3, d.dark); ell(6, 12, 5, 3, d.dark); c.beginPath(); c.moveTo(-10, 5); c.quadraticCurveTo(-18, 8, -16, 0); c.stroke();
      c.fillStyle = FL ? '#fff' : '#fff'; c.beginPath(); c.ellipse(-4.5, -3, 3.4, 3.8, 0, 0, PI2); c.ellipse(4.5, -3, 3.4, 3.8, 0, 0, PI2); c.fill(); c.fillStyle = '#2b2118'; c.beginPath(); c.arc(-3.7, -2.6, 1.7, 0, PI2); c.arc(5.3, -2.6, 1.7, 0, PI2); c.fill();
      c.beginPath(); c.moveTo(-8, -8); c.lineTo(-2, -5); c.moveTo(8, -8); c.lineTo(2, -5); c.stroke(); poly([-2, 4, 0, 7, 2, 4]); c.fillStyle = '#fff'; c.fill();
    } else if (t === 'ranged') {                                        // 弓箭妖：兜帽 + 弓 + 箭袋
      poly([-9, 11, 9, 11, 8, -4, 0, -13, -8, -4]); fs(d.color); poly([-10, 2, -13, 10, -5, 8]); fs(d.dark);
      rr(-9, -6, 18, 3, 1.5); F('#6b4a22'); c.fill(); poly([-5, -8, 0, -17, 5, -8, 3, -5, -3, -5]); fs(d.dark);
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-3.2, -8, 2.6, 2.4, 0, 0, PI2); c.ellipse(3.2, -8, 2.6, 2.4, 0, 0, PI2); c.fill(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(-2.4, -8, 1.3, 0, PI2); c.arc(4, -8, 1.3, 0, PI2); c.fill();
      c.strokeStyle = '#6b4a22'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, -12); c.quadraticCurveTo(24, 0, 14, 12); c.stroke(); c.lineWidth = 1; c.strokeStyle = '#f3ead2'; c.beginPath(); c.moveTo(14, -12); c.lineTo(14, 12); c.stroke();
      c.strokeStyle = DK; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, 2); c.lineTo(-13, -8); c.stroke(); poly([-14, -8, -11, -9, -12, -13]); c.fillStyle = '#d8dde6'; c.fill();
    } else if (t === 'shield') {                                        // 盾兵：头盔小妖 + 前方一面青铜大盾（盾牌 = 正面挡伤的方向）
      rr(-9, 3, 7, 9, 3); fs(d.dark); rr(2, 3, 7, 9, 3); fs(d.dark);
      poly([-9, 9, -10, -3, -5, -9, 5, -9, 9, -3, 8, 9]); fs('#6b8a5a'); poly([-9, -3, -5, -13, 5, -13, 9, -3, 4, -5, -4, -5]); fs('#9aa3ad'); poly([-1.5, -13, 0, -20, 1.5, -13]); fs('#c0392b');
      c.fillStyle = FL ? '#fff' : '#ffe27a'; c.fillRect(-4.5, -8, 3.2, 2.4); c.fillRect(1.5, -8, 3.2, 2.4);
      poly([14, -20, 21, -14, 21, 10, 14, 17, 7, 10, 7, -14]); fs(d.color); poly([14, -15, 18, -11, 18, 7, 14, 12, 10, 7, 10, -11]); fs('#e3c46a'); ell(14, -1, 3, 3, '#8a6a22');
      c.strokeStyle = DK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(14, -20); c.lineTo(14, 17); c.stroke();
    } else {                                                            // 石头怪：岩石傀儡（方身、肩上的大石块、发光眼缝）
      rr(-11, 3, 8, 10, 3); fs(d.dark); rr(3, 3, 8, 10, 3); fs(d.dark);
      poly([-12, 6, -13, -7, -6, -11, 6, -11, 13, -7, 12, 6]); fs(d.color);
      poly([-12, -7, -19, -3, -17, 6, -11, 3]); fs('#bba483'); poly([12, -7, 19, -3, 17, 6, 11, 3]); fs('#bba483');
      poly([-7, -11, -5, -17, 5, -17, 7, -11]); fs('#bba483'); c.strokeStyle = d.dark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-8, 4); c.lineTo(-3, -1); c.lineTo(-5, -6); c.moveTo(6, 5); c.lineTo(8, 0); c.stroke();
      c.fillStyle = FL ? '#fff' : '#ffe27a'; c.fillRect(-6, -14, 4, 2.4); c.fillRect(2, -14, 4, 2.4); c.fillStyle = '#7bbf6a'; c.fillRect(-8, -18, 5, 2); c.fillRect(1, -18, 4, 2);
    }
    c.restore();
  };
})();
