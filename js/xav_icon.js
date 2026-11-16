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
  var loaded = {}, lockedImages = {}, lockedJobs = [], lockedScheduled = false;

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
  // Opt-in selection-state rendering only. Keep original X images and every
  // default draw (including battle guests) coloured, regardless of ownership.
  function lockedKey(im) {
    return (im.currentSrc || im.src || '') + ':' + (im.naturalWidth || im.width) + ':' + (im.naturalHeight || im.height);
  }
  function makeLockedImage(im) {
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var k = Math.min(1, 560 / Math.max(iw, ih));
    var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(iw * k)); cv.height = Math.max(1, Math.round(ih * k));
    var g = cv.getContext('2d');
    if ('filter' in g) {
      g.filter = 'grayscale(1)';
      if (g.filter === 'grayscale(1)') { g.drawImage(im, 0, 0, cv.width, cv.height); g.filter = 'none'; return cv; }
    }
    // Older canvases keep the existing luminance formula, outside the draw path.
    g.drawImage(im, 0, 0, cv.width, cv.height);
    var pixels = g.getImageData(0, 0, cv.width, cv.height), a = pixels.data;
    for (var i = 0; i < a.length; i += 4) { var v = Math.round(a[i] * 0.2126 + a[i + 1] * 0.7152 + a[i + 2] * 0.0722); a[i] = a[i + 1] = a[i + 2] = v; }
    g.putImageData(pixels, 0, 0); return cv;
  }
  function prepareLocked() {
    if (lockedScheduled || !lockedJobs.length) return;
    lockedScheduled = true;
    setTimeout(function () {
      var job = lockedJobs.shift();
      try {
        if (lockedImages[job.id] === job && lockedKey(job.image) === job.key) {
          var cv = makeLockedImage(job.image);
          if (lockedImages[job.id] === job && lockedKey(job.image) === job.key) job.canvas = cv;
        }
      } catch (err) { job.failed = true; } // Keep the existing neutral locked placeholder, never flash colour.
      lockedScheduled = false; prepareLocked();
    }, 0);
  }
  function lockedImage(id, im) {
    var key = lockedKey(im), cached = lockedImages[id];
    if (cached && cached.image === im && cached.key === key) return cached.canvas;
    var job = { id: id, image: im, key: key, canvas: null };
    lockedImages[id] = job; lockedJobs.push(job); prepareLocked(); return null;
  }
  function draw(c, id, x, y, w, h, options) {
    if (!isSpecial(id) || hiddenLocked(id)) return false;
    var im = node(id);
    if (!im) return false;
    return featherImage(c, options && options.locked ? lockedImage(id, im) : im, x, y, w, h);
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
