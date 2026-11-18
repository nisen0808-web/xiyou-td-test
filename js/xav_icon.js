/* 特殊角色小头像：九位使用原始 X 头像；自建角色使用自己的 xid 原图。
 * 直接绘到目标画布，保留原图细节与 DPR；外圈墨晕融进宣纸。
 * 隐藏角色未获得前不画。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY) return;
  // Explicit paths also let the review builder include the original JPGs, which
  // were absent from the older release's WebP-only runtime folder.
  var FILES = {
    sisi: 'assets/art/x-avatars/sisi.jpg', laosiji: 'assets/art/x-avatars/laosiji.jpg',
    diaoyulao: 'assets/art/x-avatars/diaoyulao.jpg', kuanggong: 'assets/art/x-avatars/kuanggong.jpg',
    phyrex: 'assets/art/x-avatars/phyrex.jpg', yuanzhang: 'assets/art/x-avatars/yuanzhang.jpg',
    martin: 'assets/art/x-avatars/martin.jpg', haiteng: 'assets/art/x-avatars/haiteng.jpg',
    heyuxi: 'assets/art/x-avatars/heyuxi.jpg'
  };
  var ROOT = /\/bossfight\//.test(location.pathname || '') ? '../' : '';
  var loaded = {};

  function custom(id) { return !!(id && XY.xchar && XY.xchar.isX && XY.xchar.isX(id)); }
  function isSpecial(id) { return !!(id && FILES[id]) || custom(id); }
  function hiddenLocked(id) {
    return !!(XY.isHidden && XY.isHidden(id) && !(XY.save && XY.save.spOwned && XY.save.spOwned(id)));
  }
  function node(id) {
    if (custom(id)) return XY.xchar.img(id);
    if (!FILES[id]) return null;
    var e = loaded[id];
    if (!e) {
      e = loaded[id] = { im: new Image(), ok: false };
      e.im.onload = function () { e.ok = e.im.naturalWidth > 0; };
      e.im.src = ROOT + FILES[id];
    }
    return e.ok ? e.im : null;
  }
  function inkCircle(c, x, y, w, h, seed) {
    var cx=x+w/2, cy=y+h/2, rad=Math.min(w,h)*.46;
    c.beginPath();
    for (var i=0;i<=72;i++) {
      var a=i/72*Math.PI*2, rr=rad*(1+.012*Math.sin(seed*.2+a*3));
      var px=cx+Math.cos(a)*rr, py=cy+Math.sin(a)*rr*.98;
      if (!i) c.moveTo(px,py); else c.lineTo(px,py);
    }
    c.closePath();
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
    var dw=Math.min(w,280), dh=Math.min(h,280), dx=x+(w-dw)/2, dy=y+(h-dh)/2;
    var iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height, seed=(iw*13+ih*7)%97;
    underBrush(c,dx,dy,dw,dh);
    c.save(); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
    inkCircle(c,dx,dy,dw,dh,seed); c.clip();
    // Keep the actual X/account image and its aspect ratio. Never crop from game art.
    var sc=Math.min(dw/iw,dh/ih), pw=iw*sc, ph=ih*sc;
    c.drawImage(im,dx+(dw-pw)/2,dy+(dh-ph)/2,pw,ph);
    c.restore();
    c.save(); inkCircle(c,dx,dy,dw,dh,seed); c.strokeStyle='rgba(42,32,22,.28)'; c.lineWidth=1.1; c.stroke(); c.restore();
    return true;
  }
  // 未获得的特殊角色：照样画彩色原图，只在正中压一个墨色「？」（外圈宣纸色描边，彩色头像上也看得清）。
  // 以前是整张转灰（r63 及以前），2026-11-18 按 Phyrex 的要求改。
  function lockMark(c, x, y, w, h) {
    var dw = Math.min(w, 280), dh = Math.min(h, 280), d = Math.min(dw, dh);
    if (d < 6) return;
    var cx = x + w / 2, cy = y + h / 2, sz = Math.max(9, d * 0.6), t = '？';
    c.save();
    c.font = sz + 'px "Ma Shan Zheng","KaiTi","STKaiti",serif';
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    var m = c.measureText(t), px = cx, py = cy + sz * 0.35;
    if (m && m.actualBoundingBoxAscent != null && (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) > 0) {
      px = cx + ((m.actualBoundingBoxLeft || 0) - (m.actualBoundingBoxRight || 0)) / 2;           // 按字的实际墨迹居中，不按字框
      py = cy + (m.actualBoundingBoxAscent - (m.actualBoundingBoxDescent || 0)) / 2;
    }
    c.lineJoin = 'round'; c.miterLimit = 2;
    c.shadowColor = 'rgba(36,24,15,0.35)'; c.shadowBlur = Math.max(2, sz * 0.1);
    c.strokeStyle = 'rgba(251,246,234,0.95)'; c.lineWidth = Math.max(2.5, sz * 0.18);
    c.strokeText(t, px, py);
    c.shadowColor = 'transparent'; c.shadowBlur = 0;
    c.fillStyle = '#24180f';
    c.fillText(t, px, py);
    c.restore();
  }
  function draw(c, id, x, y, w, h, options) {
    if (!isSpecial(id) || hiddenLocked(id)) return false;
    var im = node(id);
    if (!im) return false;
    if (!featherImage(c, im, x, y, w, h)) return false;
    if (options && options.locked) lockMark(c, x, y, w, h);
    return true;
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

  XY.xAvIcon = { isSpecial: isSpecial, img: node, draw: draw, featherImage: featherImage, lockMark: lockMark, brush: brush, brushOnInk: brushOnInk, fitSize: fitSize };
  Object.keys(FILES).forEach(node);

  function wrapFace() {
    var H = XY.hud2;
    if (!H || !H.face || H.face._xav) return;
    var orig = H.face;
    function face(c, h, x, y, r, rt) {
      var id = h && h.id;
      if (isSpecial(id) && !(h.def && h.def.xid)) {
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
      if (isSpecial(id) && !def.xid) {
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
