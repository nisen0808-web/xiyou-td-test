/* 特殊角色小图标：只用 assets/art/x-avatars 的彩色原图。
 * 整张头像完整放进格子，外圈墨晕融进宣纸，不加白框、不裁成立绘、不画灰线稿。
 * 隐藏角色未获得前不画。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY) return;
  var FILES = { sisi: 1, laosiji: 1, diaoyulao: 1, kuanggong: 1, phyrex: 1, yuanzhang: 1, martin: 1, haiteng: 1, heyuxi: 1 };
  var BASE = /\/bossfight\//.test(location.pathname || '') ? '../assets/art/x-avatars/' : 'assets/art/x-avatars/';
  var loaded = {};
  var feather = {};

  function isSpecial(id) { return !!(id && FILES[id]); }
  function hiddenLocked(id) {
    return !!(XY.isHidden && XY.isHidden(id) && !(XY.save && XY.save.spOwned && XY.save.spOwned(id)));
  }
  function node(id) {
    var e = loaded[id];
    if (!e) {
      e = loaded[id] = { im: new Image(), ok: false };
      e.im.onload = function () { e.ok = e.im.naturalWidth > 0; feather = {}; };
      e.im.src = BASE + id + '.webp';
    }
    return e.ok ? e.im : null;
  }
  function bake(im, w, h) {
    var cap = 280;
    var cw = Math.max(2, Math.min(cap, Math.round(w))), ch = Math.max(2, Math.min(cap, Math.round(h)));
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var g = cv.getContext('2d');
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var sc = Math.min(cw / iw, ch / ih);
    var dw = iw * sc, dh = ih * sc, ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, ox, oy, dw, dh);
    var mask = document.createElement('canvas'); mask.width = cw; mask.height = ch;
    var q = mask.getContext('2d');
    var seed = (iw * 13 + ih * 7) % 97, i, cx = cw / 2, cy = ch / 2, rad = Math.min(cw, ch) * 0.46;
    q.beginPath();
    for (i = 0; i <= 72; i++) {
      var a = i / 72 * Math.PI * 2;
      var rr = rad * (1 + 0.012 * Math.sin(seed * 0.2 + a * 3));
      var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.98;
      if (!i) q.moveTo(px, py); else q.lineTo(px, py);
    }
    q.closePath();
    q.fillStyle = '#000';
    q.fill();
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(42,32,22,0.28)';
    g.lineWidth = 1.1;
    g.beginPath();
    for (i = 0; i <= 72; i++) {
      var b = i / 72 * Math.PI * 2;
      var rb = rad * (1 + 0.012 * Math.sin(seed * 0.2 + b * 3));
      var qx = cx + Math.cos(b) * rb, qy = cy + Math.sin(b) * rb * 0.98;
      if (!i) g.moveTo(qx, qy); else g.lineTo(qx, qy);
    }
    g.closePath();
    g.stroke();
    return cv;
  }
  function underBrush(c, x, y, w, h) {
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(96,78,52,0.42)';
    c.lineWidth = Math.max(1.4, Math.min(w, h) * 0.035);
    c.beginPath();
    c.moveTo(x + w * 0.06, y + h * 0.7);
    c.quadraticCurveTo(x + w * 0.42, y + h * 0.52, x + w * 0.94, y + h * 0.68);
    c.stroke();
    c.globalAlpha = 0.55;
    c.beginPath();
    c.moveTo(x + w * 0.14, y + h * 0.84);
    c.quadraticCurveTo(x + w * 0.5, y + h * 0.98, x + w * 0.86, y + h * 0.78);
    c.stroke();
    c.restore();
  }
  function brushOnInk(c, text, cx, cy, maxW, maxH, size) {
    text = String(text || '');
    if (!text || maxW < 8) return;
    var face = '"Ma Shan Zheng","KaiTi","STKaiti",serif';
    var sz = size || Math.min(maxH || 22, 22);
    c.save();
    c.font = sz + 'px ' + face;
    c.fillStyle = '#24180f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cx, cy);
    c.restore();
  }
  function fitSize(c, labels, maxW, prefer) {
    var face = '"Ma Shan Zheng","KaiTi","STKaiti",serif';
    var sz = prefer || 20;
    while (sz > 11) {
      c.font = sz + 'px ' + face;
      var wide = false, i;
      for (i = 0; i < labels.length; i++) if (c.measureText(labels[i]).width > maxW) wide = true;
      if (!wide) break;
      sz -= 0.5;
    }
    return sz;
  }
  function featherImage(c, im, x, y, w, h) {
    if (!im || !(im.naturalWidth || im.width) || w < 2 || h < 2) return false;
    var dw = Math.min(w, 280), dh = Math.min(h, 280);
    var dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
    var key = (im.src || '') + '|' + Math.round(dw) + 'x' + Math.round(dh);
    var cv = feather[key];
    if (!cv) cv = feather[key] = bake(im, dw, dh);
    underBrush(c, dx, dy, dw, dh);
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(cv, dx, dy, dw, dh);
    c.restore();
    return true;
  }
  function draw(c, id, x, y, w, h) {
    if (!isSpecial(id) || hiddenLocked(id)) return false;
    var im = node(id);
    if (!im) return false;
    return featherImage(c, im, x, y, w, h);
  }
  function splitName(text) {
    var m = String(text).match(/^([A-Za-z0-9]+)([\u4e00-\u9fff].*)$/);
    if (m && m[2].length >= 2) return [m[1], m[2]];
    if (text.length <= 4) return [text];
    var mid = Math.ceil(text.length / 2);
    return [text.slice(0, mid), text.slice(mid)];
  }
  function brush(c, text, cx, cy, maxW, maxH) {
    text = String(text || '');
    if (!text || maxW < 8 || maxH < 8) return;
    var face = '"Ma Shan Zheng","KaiTi","STKaiti",serif';
    var lines = [text], sz = Math.min(maxH * 0.78, 22);
    c.save();
    c.font = sz + 'px ' + face;
    if (c.measureText(text).width > maxW) lines = splitName(text);
    sz = Math.min(sz, maxH / (lines.length === 1 ? 1.05 : 2.15));
    while (sz > 8) {
      c.font = sz + 'px ' + face;
      var wide = false, i;
      for (i = 0; i < lines.length; i++) if (c.measureText(lines[i]).width > maxW) wide = true;
      if (!wide) break;
      sz -= 0.5;
    }
    c.fillStyle = '#24180f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var lh = sz * 1.02;
    var y0 = cy - (lines.length - 1) * lh / 2;
    for (var k = 0; k < lines.length; k++) c.fillText(lines[k], cx, y0 + k * lh);
    c.restore();
  }

  XY.xAvIcon = { isSpecial: isSpecial, img: node, draw: draw, featherImage: featherImage, brush: brush, brushOnInk: brushOnInk, fitSize: fitSize };
  Object.keys(FILES).forEach(node);

  function wrapFace() {
    var H = XY.hud2;
    if (!H || !H.face || H.face._xav) return;
    var orig = H.face;
    function face(c, h, x, y, r, rt) {
      var id = h && h.id;
      if (isSpecial(id)) {
        if (hiddenLocked(id)) return 'x';
        var side = r * 2.2;
        if (!draw(c, id, x - side / 2, y - side / 2, side, side)) {
          c.save(); c.fillStyle = '#f4ead4'; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.restore();
        }
        if (H.stats) H.stats.x++;
        var cf = XY.VD && XY.VD.activeFrame && XY.VD.activeFrame();
        if (cf && XY.VD.drawFrame) XY.VD.drawFrame(c, x, y, r + 1, cf);
        return 'x';
      }
      return orig.call(this, c, h, x, y, r, rt);
    }
    face._xav = 1;
    H.face = face;
  }
  function wrapDisc() {
    var R4 = XY.R4;
    if (!R4 || !R4.avatarDisc || R4.avatarDisc._xav) return;
    var orig = R4.avatarDisc;
    function disc(c, def, x, y, r, rt) {
      var id = def && def.id;
      if (isSpecial(id)) {
        if (hiddenLocked(id)) return;
        var side = r * 2.2;
        if (!draw(c, id, x - side / 2, y - side / 2, side, side)) {
          c.save(); c.fillStyle = '#f4ead4'; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.restore();
        }
        if (!R4.xfDraw && !R4._noCosFrame && XY.VD && XY.VD.activeFrame) {
          var cf = XY.VD.activeFrame();
          if (cf && XY.VD.drawFrame) XY.VD.drawFrame(c, x, y, r, cf);
        }
        return;
      }
      return orig.call(this, c, def, x, y, r, rt);
    }
    disc._xav = 1;
    R4.avatarDisc = disc;
  }
  wrapFace();
  wrapDisc();
})();
