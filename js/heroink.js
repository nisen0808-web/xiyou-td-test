/* v0.7.0m 五位西游主角的水墨工笔 Q 版立绘（v0.7.0o：圆形脸改取自封面，整身立绘只剩兜底）（唐僧 / 悟空 / 八戒 / 沙僧 / 白龙马）。
 * 立绘文件 assets/art/hero-ink/<id>.jpg（统一纸色底 #f5e8d4）；dist 里由 build.sh 内联（window.XY_HERO_INK）。
 * XY.heroink.portrait：主菜单英雄卡里的整身立绘；XY.heroink.face：所有圆形小头像（头像框 / 战场 / 面板）用的圆形脸部裁切。
 * v0.8.0：皮肤 = 水墨脸 + 换色外环 + 小星；小白龙人形 = horse_human 水墨脸。 */
(function () {
  'use strict';
  var XY = window.XY, imgs = {}, faces = {};
  var IDS = ['tang', 'wukong', 'bajie', 'wujing', 'horse'];
  // v0.7.0o 脸部裁切改取自狂野水墨封面（assets/art/hero-cover-wild，和登录界面同一套）：中心 (cx, cy) 和边长 s，都是占封面宽 / 高 / 宽的比例
  var FACE = { tang:[0.48,0.205,0.27], wukong:[0.50,0.265,0.27], bajie:[0.50,0.27,0.24], wujing:[0.51,0.265,0.28], horse:[0.735,0.23,0.31], horse_human:[0.55,0.34,0.36] };   // v0.8.0：horse_human = 小白龙人形脸（assets/art/hero-cover-wild/horse_human.jpg）
  var PAPER = '#f5e8d4';
  function load(id) {
    var e = imgs[id];
    if (!e) {
      e = imgs[id] = { img: null, ok: false };
      var src = (window.XY_HERO_INK && window.XY_HERO_INK[id]) || (window.XY_HERO_INK ? null : 'assets/art/hero-ink/' + id + '.jpg');
      if (!src) return e;
      var im = new Image(); im.onload = function () { e.ok = true; }; im.src = src; e.img = im;
    }
    return e;
  }
  var H = XY.heroink = { IDS: IDS, FACE: FACE, PAPER: PAPER, stats: { portrait: 0, face: 0, faceCover: 0, cover: 0 } };
  // 主菜单英雄卡的整身封面（狂野水墨版，3:4）：assets/art/hero-cover-wild/<id>.jpg；dist 里由 build.sh 缩到 540x720 内联（window.XY_HERO_COVER）
  var covers = {};
  H.cover = function (id) {
    if (!H.has(id)) return null;
    var e = covers[id];
    if (!e) {
      e = covers[id] = { img: null, ok: false };
      var src = (window.XY_HERO_COVER && window.XY_HERO_COVER[id]) || (window.XY_HERO_COVER ? null : 'assets/art/hero-cover-wild/' + id + '.jpg');
      if (src) { var im = new Image(); im.onload = function () { e.ok = true; }; im.src = src; e.img = im; }
    }
    return e.ok ? e.img : null;
  };
  H.has = function (id) { return IDS.indexOf(id) >= 0 || id === 'horse_human'; };
  H.preload = function () { IDS.forEach(load); IDS.forEach(H.cover); H.cover('horse_human'); };
  H.img = function (id) { var e = load(id); return e.ok ? e.img : null; };
  // 整身立绘：脚底在 (x, foot)，画出来高 h 像素（裁掉上下各一小条纸边）；返回是否画出
  H.portrait = function (c, id, x, foot, h) {
    var im = H.has(id) && H.img(id); if (!im) return false;
    var sy = im.naturalHeight * 0.035, sh = im.naturalHeight * 0.93, k = h / sh, w = im.naturalWidth * k;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(im, 0, sy, im.naturalWidth, sh, x - w / 2, foot - h, w, h); c.restore();
    H.stats.portrait++; return true;
  };
  // 圆形脸：缓存成 96×96 的小画布（圆形裁切 + 纸色底），再按 r 缩放画出，外面套一圈角色主色环
  H.face = function (c, def, x, y, r) {
    var id = def.id === 'horse' && def.form === 'human' ? 'horse_human' : def.id, im = H.has(id) && H.cover(id); if (!im) return false;
    var f = faces[id];
    if (!f) {
      var p = FACE[id], S = 96, cv = document.createElement('canvas'); cv.width = cv.height = S;
      var g = cv.getContext('2d'), s = p[2] * im.naturalWidth, sx = p[0] * im.naturalWidth - s / 2, sy = p[1] * im.naturalHeight - s / 2;
      g.imageSmoothingQuality = 'high'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
      g.fillStyle = PAPER; g.fillRect(0, 0, S, S); g.drawImage(im, sx, sy, s, s, 0, 0, S, S);
      f = faces[id] = cv;
    }
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(f, x - r, y - r, r * 2, r * 2);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = Math.max(2, r * 0.13); c.strokeStyle = def.color; c.stroke();
    c.beginPath(); c.arc(x, y, r + Math.max(1, r * 0.065), 0, Math.PI * 2); c.lineWidth = 1.2; c.strokeStyle = def.dark; c.stroke();
    if (def.accent) {                                         // v0.8.0 皮肤：水墨脸 + 换色外环 + 一颗小星（不再退回程序画的旧脸）
      c.beginPath(); c.arc(x, y, r * 0.86, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = Math.max(2, r * 0.2); c.strokeStyle = def.accent; c.stroke();
      c.fillStyle = def.accent; c.strokeStyle = '#fff'; c.lineWidth = 1.2;
      var sx0 = x + r * 0.72, sy0 = y - r * 0.92, q = r * 0.3;
      c.beginPath(); c.moveTo(sx0, sy0 - q); c.lineTo(sx0 + q * 0.3, sy0 - q * 0.3); c.lineTo(sx0 + q, sy0); c.lineTo(sx0 + q * 0.3, sy0 + q * 0.3); c.lineTo(sx0, sy0 + q); c.lineTo(sx0 - q * 0.3, sy0 + q * 0.3); c.lineTo(sx0 - q, sy0); c.lineTo(sx0 - q * 0.3, sy0 - q * 0.3); c.closePath(); c.fill(); c.stroke();
    }
    c.restore(); H.stats.face++; H.stats.faceCover++; return true;
  };
  if (!window.XY_SPLIT_ENTRY) H.preload();
})();
