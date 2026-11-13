/* v0.8.0 地上宝箱 / 令牌 / 灵芝 / 芭蕉扇 / 宝石 / 元宝 的水墨精灵（js/item_ink_data.js，tools/item_cut.py + item_bake.py）。
   XY.ITEMINK.draw(c, 名字, x, y, alpha, 缩放) → 以精灵底边中点 (x,y) 为锚点绘制；图还没载入时返回 false，调用者回退到程序画的版本。 */
(function () {
  var XY = window.XY, imgs = {};
  // 显示比例（相对战斗里孙悟空 / 唐僧的图高 ≈ 68px）：宝箱 ≈ 50%（38px 含泼墨，箱身约 33px）、法宝 / 灵芝 ≈ 35%（24px）、令牌 ≈ 33%（22px）、元宝 / 灵石 ≈ 16–19%（11–13px）
  var SC = { chest_closed: 0.44, chest_opening: 0.44, chest_open: 0.44, tok_n: 0.49, tok_r: 0.49, tok_sr: 0.49, tok_ssr: 0.49, fan: 0.44, lingzhi: 0.52, gem_s: 0.56, gem_b: 0.50, ingot: 0.65, ingot2: 0.62 };
  var I = XY.ITEMINK = {
    SC: SC,
    ent: function (n) {
      var d = XY.ITEMINK_DATA && XY.ITEMINK_DATA[n]; if (!d) return null;
      var e = imgs[n]; if (!e) { e = imgs[n] = { img: new Image(), d: d }; e.img.src = d.src; }
      return e.img.complete && e.img.naturalWidth > 0 ? e : null;
    },
    draw: function (c, n, x, y, a, sc) {
      var e = I.ent(n); if (!e) return false; sc = (sc || 1) * 0.5 * (SC[n] || 1);
      var w = e.d.w * sc, h = e.d.h * sc, ga = c.globalAlpha; if (a !== undefined) c.globalAlpha = ga * a;
      c.drawImage(e.img, x - w / 2, y - h, w, h); c.globalAlpha = ga; return true;
    },
    size: function (n) { var d = XY.ITEMINK_DATA && XY.ITEMINK_DATA[n]; var k = SC[n] || 1; return d ? { w: d.w / 2 * k, h: d.h / 2 * k } : null; },
    preload: function () { if (XY.ITEMINK_DATA) for (var k in XY.ITEMINK_DATA) I.ent(k); }
  };
  I.preload();
})();
