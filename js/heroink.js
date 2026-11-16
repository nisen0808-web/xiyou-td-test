/* 正式人物原画与头像接口。portrait按需使用正式完整原画/透明待机图。
 * face/faceArt保持既有小头像取样与皮肤饰纹；img保留旧资源接口给既有调用方，不用于定妆正式预览。
 * 皮肤以颜色、饰纹和小星区分，不虚构另一套人物服装；人形与马身按def.form选择。 */
(function () {
  'use strict';
  var XY = window.XY, imgs = {}, faceCovers = Object.create(null);
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
    if (!window.XY_HERO_COVER) return H.faceArt(id);
    var e = covers[id];
    if (!e) {
      e = covers[id] = { img: null, ok: false };
      var src = (window.XY_HERO_COVER && window.XY_HERO_COVER[id]) || (window.XY_HERO_COVER ? null : 'assets/art/hero-cover-wild/' + id + '.jpg');
      if (src) { var im = new Image(); im.onload = function () { e.ok = true; }; im.src = src; e.img = im; }
    }
    return e.ok ? e.img : null;
  };
  H.has = function (id) { return IDS.indexOf(id) >= 0 || id === 'horse_human'; };
  // The entry may inline a 540px cover for the menu. Faces keep the native cover:
  // sampling it directly avoids a second 96px raster that blurs on large/DPR screens.
  // Faces and the large party portrait share the native cover drawable. Decode
  // its Blob directly; keep the existing high-quality crops and full pixels.
  function preparedCover(src) {
    var e = faceCovers[src];
    if (!e) {
      e = faceCovers[src] = { state: 'loading', drawable: null, drawableKind: null, error: '', bitmapError: '', decodeError: '' };
      var settled = false, image = null, objectURL = null, timer;
      var abort = typeof window.AbortController === 'function' ? new window.AbortController() : null;
      function active() { return !settled && faceCovers[src] === e; }
      function message(error) { return String(error && error.message || error); }
      function finish(drawable, kind, error) {
        if (!active()) return;
        settled = true; window.clearTimeout(timer);
        if (objectURL) { window.URL.revokeObjectURL(objectURL); objectURL = null; }
        if (image) { image.onload = image.onerror = null; image = null; }
        e.drawable = drawable; e.drawableKind = kind;
        e.state = drawable ? 'ready' : 'failed'; e.error = error || '';
        if (!drawable && abort) abort.abort();
      }
      function fail(error) { finish(null, null, message(error)); }
      timer = window.setTimeout(function () { fail('cover load timeout'); }, 15000);
      function imageFallback(blob, why) {
        if (!active()) return;
        e.bitmapError = why; e.state = 'image-loading';
        var url = src;
        if (blob) {
          try { objectURL = window.URL.createObjectURL(blob); url = objectURL; }
          catch (error) { fail('fallback URL failed: ' + message(error)); return; }
        }
        var im, loaded = false;
        try { im = image = new Image(); im.decoding = 'async'; }
        catch (error) { fail(error); return; }
        function valid() { return im.complete && im.naturalWidth > 0 && im.naturalHeight > 0; }
        function decoded(error) {
          if (!active()) return;
          if (!valid()) { fail('cover has no valid dimensions'); return; }
          // Preserve menuImage's valid, loaded-image compatibility on decode rejection.
          e.decodeError = error ? message(error) : '';
          finish(im, 'image-fallback');
        }
        im.onerror = function () { fail('cover image load failed'); };
        im.onload = function () {
          if (!active() || loaded) return; loaded = true;
          if (!valid()) { fail('cover image load failed'); return; }
          e.state = 'image-decoding';
          if (typeof im.decode !== 'function') { decoded(); return; }
          try { Promise.resolve(im.decode()).then(function () { decoded(); }, decoded); }
          catch (error) { decoded(error); }
        };
        try { im.src = url; } catch (error) { fail(error); }
      }
      function decodeBlob(blob) {
        if (!active()) return;
        if (!blob || !blob.size) { fail('empty cover response'); return; }
        if (typeof window.createImageBitmap !== 'function') { imageFallback(blob, 'ImageBitmap unavailable'); return; }
        e.state = 'bitmap-decoding';
        var pending;
        try { pending = window.createImageBitmap(blob); }
        catch (error) { imageFallback(blob, message(error)); return; }
        Promise.resolve(pending).then(function (bitmap) {
          if (!active()) { if (bitmap && typeof bitmap.close === 'function') bitmap.close(); return; }
          if (!bitmap || !(bitmap.width > 0 && bitmap.height > 0)) {
            if (bitmap && typeof bitmap.close === 'function') bitmap.close();
            fail('cover bitmap has no valid dimensions'); return;
          }
          finish(bitmap, 'image-bitmap');
        }, function (error) { imageFallback(blob, message(error)); });
      }
      if ((window.location && window.location.protocol === 'file:') || /^file:/i.test(src) || typeof window.fetch !== 'function') {
        imageFallback(null, 'legacy file/Image path');
      } else {
        var request;
        try { request = window.fetch(src, abort ? { signal: abort.signal } : {}); }
        catch (error) { fail(error); }
        if (request) Promise.resolve(request).then(function (response) {
          if (!active()) return null;
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.blob();
        }).then(function (blob) { if (blob) decodeBlob(blob); }, fail);
      }
    }
    return e.state === 'ready' ? e.drawable : null;
  }
  function nativeCoverSource(id) { return (/\/bossfight\//.test(location.pathname || '') ? '../' : '') + 'assets/art/hero-cover-wild/' + id + '.jpg'; }
  H.faceArt = function (id) {
    if (!H.has(id)) return null;
    var src = nativeCoverSource(id);
    var drawable = preparedCover(src);
    // Full/inline builds keep their original packed fallback. In split builds
    // cover() joins this same request instead of creating a second Image.
    return drawable || (window.XY_HERO_COVER ? H.cover(id) : null);
  };
  // Startup needs the five standard face crops. Full fallback portraits and
  // the optional human horse form keep their existing on-demand getters.
  H.preload = function () { IDS.forEach(H.faceArt); };
  H.img = function (id) { var e = load(id); return e.ok ? e.img : null; };
  // Formal previews fit the complete source into the requested column. No
  // startup preload, low-resolution face raster, Q-version fallback or art tint.
  var portraitImages = {}, portraitIdle = { tang: 'tang', horse: 'horse', horse_human: 'dragon' };
  var portraitFull = { wukong: 1, bajie: 1, wujing: 1 };
  H.portrait = function (c, hero, x, foot, h, maxWidth) {
    var def = typeof hero === 'string' ? { id: hero } : hero, id = def && def.id;
    var human = id === 'horse_human' || (id === 'horse' && def.form === 'human'), idle = portraitIdle[human ? 'horse_human' : id], im;
    if (idle) {
      im = portraitImages[idle];
      if (!im) { im = portraitImages[idle] = new Image(); im.src = (/\/bossfight\//.test(location.pathname || '') ? '../' : '') + 'bossfight/assets/spr/' + idle + '/idle.webp'; }
      if (!im.complete || !im.naturalWidth) return false;
    } else if (portraitFull[id]) {
      im = portraitImages['full-' + id];
      if (!im) { im = portraitImages['full-' + id] = new Image(); im.src = (/\/bossfight\//.test(location.pathname || '') ? '../' : '') + 'assets/art/menu-v5/fig_' + id + '.webp'; }
      if (!im.complete || !im.naturalWidth || !im.naturalHeight) return false;
    } else { im = H.has(id) && H.faceArt(id); if (!im) return false; }
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var k = Math.min(h / ih, maxWidth > 0 ? maxWidth / iw : Infinity), w = iw * k, height = ih * k;
    if (!(k > 0)) return false;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(im, 0, 0, iw, ih, x - w / 2, foot - height, w, height); c.restore();
    H.lastPortrait = { id: id, form: human ? 'human' : 'base', src: im.currentSrc || im.src || nativeCoverSource(id), sourceWidth: iw, sourceHeight: ih, x: x - w / 2, y: foot - height, w: w, h: height };
    H.stats.portrait++; return true;
  };
  // Clip in the destination context and sample the original face crop once.
  // Canvas transforms already include UI scale and DPR; no low-resolution cache.
  H.face = function (c, def, x, y, r) {
    var id = def.id === 'horse' && def.form === 'human' ? 'horse_human' : def.id, im = H.faceArt(id); if (!im) return false;
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var p = FACE[id], s = p[2] * iw, sx = p[0] * iw - s / 2, sy = p[1] * ih - s / 2;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = PAPER; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.drawImage(im, sx, sy, s, s, x - r, y - r, r * 2, r * 2); c.restore();
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
