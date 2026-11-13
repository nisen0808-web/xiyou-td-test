/* v0.8.6 道具 / 法宝 / 武器 / 货郎商品水墨图标（js/icon_ink_data.js，WebP；原来是「一个字」当图标）。
 * XY.ICONINK.draw(c, 名称, 中心x, 中心y, 边长[, 透明度]) → 画出返回 true；没有这个名字 / 还没解码 / XY.ICONINK.on=false → 返回 false，调用方退回画单字。
 * 同一名字可以用在任意尺寸（22px 清单到 62px 商店卡），按「最长边 = 边长」等比缩放，不拉伸。 */
(function () {
  'use strict';
  var XY = window.XY, imgs = {};
  var I = XY.ICONINK = { on: true, drawn: 0 };
  function ent(n) {
    if (!I.on || !XY.ICONINK_DATA) return null;
    var d = XY.ICONINK_DATA[n]; if (!d) return null;
    var e = imgs[n]; if (!e) { e = imgs[n] = { img: new Image(), d: d }; e.img.src = d.src; }
    return e.img.complete && e.img.naturalWidth > 0 ? e : null;
  }
  I.has = function (n) { return !!(XY.ICONINK_DATA && XY.ICONINK_DATA[n]); };
  I.preload = function () { if (XY.ICONINK_DATA) for (var k in XY.ICONINK_DATA) ent(k); };
  I.draw = function (c, n, cx, cy, sz, al) {
    var e = ent(n); if (!e) return false;
    var s = sz / Math.max(e.img.naturalWidth, e.img.naturalHeight), w = e.img.naturalWidth * s, h = e.img.naturalHeight * s;
    if (al != null && al < 1) c.globalAlpha = al;
    c.drawImage(e.img, cx - w / 2, cy - h / 2, w, h); c.globalAlpha = 1; I.drawn++; return true;
  };

  /* v0.9：没有专属水墨图标的技能（大招 / 光环 / 经文）用笔触画的通用图标，不再用单字。kind: ult 放射爆墨 / aura 莲光圈 / sutra 卷轴 */
  I.glyph = function (c, kind, cx, cy, sz, col) {
    var r = sz * 0.5, ink = '#2a2218', i, a, k;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = 'rgba(255,248,230,0.92)'; c.beginPath(); c.arc(cx, cy, r * 0.82, 0, 6.3); c.fill();
    c.strokeStyle = ink; c.fillStyle = ink;
    if (kind === 'ult') {
      for (i = 0; i < 8; i++) { a = i * Math.PI / 4 + 0.2; k = i % 2 ? 0.55 : 0.78; c.lineWidth = Math.max(1.2, r * (i % 2 ? 0.1 : 0.17)); c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16); c.lineTo(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k); c.stroke(); }
      c.fillStyle = col || '#c8341f'; c.beginPath(); c.arc(cx, cy, r * 0.2, 0, 6.3); c.fill();
    } else if (kind === 'aura') {
      c.lineWidth = Math.max(1.1, r * 0.1);
      for (i = 0; i < 6; i++) { a = i * Math.PI / 3 - Math.PI / 2; c.beginPath(); c.ellipse(cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36, r * 0.3, r * 0.14, a, 0, 6.3); c.stroke(); }
      c.fillStyle = col || '#d8a21e'; c.beginPath(); c.arc(cx, cy, r * 0.17, 0, 6.3); c.fill();
    } else {
      c.lineWidth = Math.max(1.1, r * 0.1);
      c.strokeRect(cx - r * 0.5, cy - r * 0.34, r, r * 0.68);
      for (i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx - r * 0.3, cy + i * r * 0.2); c.lineTo(cx + r * 0.3, cy + i * r * 0.2); c.stroke(); }
      c.fillStyle = col || '#c8341f'; c.fillRect(cx + r * 0.3, cy + r * 0.2, r * 0.2, r * 0.2);
    }
    c.restore(); return true;
  };
  I.glyphKind = function (s) { return s.kind === 'ult' || s.short === '招' ? 'ult' : s.short === '光' ? 'aura' : 'sutra'; };
  /* 天兵头像：用水墨精灵待机帧的上半身，裁成方块（商店 / 建造栏的单字圆换成它） */
  I.sol = function (c, type, cx, cy, sz, al) {
    var en = XY.SINK && XY.SINK.has(type) ? XY.SINK.entry(type) : null; if (!en) return false;
    var f = en.d.fr[0], sw = f[2], sh = f[3], cw = Math.min(sw, sh * 0.62), ch = cw / 0.86;      // 取上 ~60% 的人像
    if (al != null && al < 1) c.globalAlpha = al;
    c.drawImage(en.img, f[0] + (sw - cw) / 2, f[1], cw, Math.min(ch, sh), cx - sz / 2, cy - sz / 2, sz, sz * Math.min(ch, sh) / ch); c.globalAlpha = 1; I.drawn++; return true;
  };
  if (XY.ICONINK_DATA) I.preload(); else setTimeout(function () { if (XY.ICONINK_DATA) I.preload(); }, 0);
})();
