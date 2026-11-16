/* 护法天兵水墨工笔精灵：弓 / 炮 / 寒冰 / 破阵 / 佛光。
 * 旧图集由 tools/sol_bake.py 烘焙；寒冰使用透明原画的 sourceRect/独立脚锚，运行时不改美术像素。
 * 每种 8 帧：0/1 待机（交叉淡化）、2–5 走路、6 前摇（拉弓 / 点火 / 后撤 / 上弦 / 举杖）、7 出招（放箭 / 轰炮 / 突刺 / 发弩 / 佛光脉冲）。朝右为原图，朝左镜像。
 * 出招节奏：上一次出手后，下一次出手前 0.22 秒起放前摇帧（只在战斗中：上次出手距今 < 冷却 + 0.6 秒）；出手后 0.2 秒放出招帧。
 * 没有图（解码/清纸未准备好 / XY.SINK.on=false）→ 返回 false，调用方退回旧的矢量画法。 */
(function () {
  'use strict';
  var XY = window.XY, PI2 = Math.PI * 2, imgs = {};
  var S = XY.SINK = { on: true, stats: 0, last: null, frames: {} };
  var waitRecords = null, waitPromise = null, retrySerial = 0;
  function sources(d) { return [d.src].concat((d.sources || []).map(function (s) { return s.src; })); }
  function requestURL(src, retry) {
    // An Image with the same URL can join an old request after our timeout.
    // Only a deliberate retry of a failed record needs a distinct request;
    // keep src as the cache identity and never modify inline/object URLs.
    if (!retry || /^\s*(?:data|blob):/i.test(src)) return src;
    var at = src.indexOf('#'), base = at < 0 ? src : src.slice(0, at), hash = at < 0 ? '' : src.slice(at);
    return base + (base.indexOf('?') < 0 ? '?' : '&') + 'xy_image_retry=' + Date.now().toString(36) + '-' + (++retrySerial) + hash;
  }
  var cleanKeys = new WeakMap();
  // A baked image is trusted only for its exact source, dimensions and complete
  // frame/anchor table. This is independent of nativeAlpha's rendering options.
  function paperPrepared(d) {
    var p = d.paperPrepared, a = d.fr, b = p && p.frames;
    if (!p || p.version !== 1 || p.src !== d.src || p.width !== d.w || p.height !== d.h ||
        !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!Array.isArray(a[i]) || !Array.isArray(b[i]) || a[i].length !== b[i].length) return false;
      for (var j = 0; j < a[i].length; j++) if (a[i][j] !== b[i][j]) return false;
    }
    return true;
  }
  function processKey(d, index) {
    if (index || d.nativeAlpha) return 'native';
    if (paperPrepared(d)) return 'paper-v1:' + JSON.stringify([d.w, d.h, d.fr]);
    var key = cleanKeys.get(d);
    if (!key || key.frames !== d.fr) { key = { frames: d.fr, value: JSON.stringify(d.fr || null) }; cleanKeys.set(d, key); }
    return key.value;
  }
  function paperOpen(r, g, b, a) {
    if (a < 18) return true;
    var yv = (r + g + b) / 3, ch = Math.max(r, g, b) - Math.min(r, g, b);
    return yv > 196 && ch < 34;
  }
  // The same paper removal as the former first-draw hook. Work resumes at exact
  // pixel/pass positions; erosion writes remain batched and the final pass is
  // still in-place row-major. Native canvas calls are separate tasks, not part
  // of the JS slice budget (a native call itself cannot be interrupted).
  function cleanSheet(rec, frames, current) {
    return new Promise(function (resolve, reject) {
      var cnv, g, image, d, w, h, n, seen, qx, qy, qs = 0, qe = 0;
      var stage = 'canvas', x = 0, y = 0, i = 0, fi = 0, pass = 0, f, x0, y0, fw, fh, xx, yy, kills, ki = 0;
      var timer = null, done = false, channel = null, queued = false;
      function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
      function closeTasks() {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        queued = false;
        if (channel) { channel.port1.onmessage = null; channel.port1.close(); channel.port2.close(); channel = null; }
      }
      function stop(error) { if (done) return; done = true; closeTasks(); rec.cancelPixels = null; reject(error); }
      rec.cancelPixels = stop;
      function alive() { return !done && rec.state === 'pending' && current(rec); }
      function push(px, py) {
        if (px < 0 || py < 0 || px >= w || py >= h) return;
        var j = py * w + px; if (seen[j]) return;
        var p = j * 4; if (!paperOpen(d[p], d[p + 1], d[p + 2], d[p + 3])) return;
        seen[j] = 1; qx[qe] = px; qy[qe] = py; qe++;
      }
      function queue() {
        if (!alive()) { if (!done) stop(new Error('天兵素材准备已失效')); return; }
        if (channel) {
          queued = true;
          try { channel.port2.postMessage(0); } catch (error) { stop(error); }
        } else timer = setTimeout(slice, 0); // Compatibility only; timer-path startup performance is not guaranteed.
      }
      function scanFrame() { f = frames[fi]; x0 = f[0]; y0 = f[1]; fw = f[2]; fh = f[3]; xx = x0; yy = y0 + (fh * 0.58 | 0); kills = []; stage = 'frame'; }
      function slice() {
        timer = null;
        if (!alive()) { if (!done) stop(new Error('天兵素材准备已失效')); return; }
        var started = now(), units = 0, p, a, r, gg, b, yv, ch, touch;
        try {
          // One uninterruptible native operation per scheduled task.
          if (stage === 'canvas') {
            w = rec.image.naturalWidth || rec.image.width; h = rec.image.naturalHeight || rec.image.height;
            if (!w || !h || !frames || !frames.length) throw new Error('天兵图集尺寸或帧定义无效');
            cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
            g = cnv.getContext('2d', { willReadFrequently: true }); stage = 'draw'; queue(); return;
          }
          if (stage === 'draw') { g.drawImage(rec.image, 0, 0); stage = 'read'; queue(); return; }
          if (stage === 'read') { image = g.getImageData(0, 0, w, h); d = image.data; n = w * h; stage = 'allocate'; queue(); return; }
          if (stage === 'allocate') { seen = new Uint8Array(n); qx = new Int32Array(n); qy = new Int32Array(n); stage = 'seedX'; queue(); return; }
          if (stage === 'commit') {
            g.putImageData(image, 0, 0);
            if (!alive()) { stop(new Error('天兵素材准备已失效')); return; }
            try { Object.defineProperty(cnv, 'naturalWidth', { value: w }); Object.defineProperty(cnv, 'naturalHeight', { value: h }); } catch (e) {}
            cnv.complete = true; done = true; closeTasks(); rec.cancelPixels = null; resolve(cnv); return;
          }
          while (alive()) {
            if (stage === 'seedX') { if (x < w) { push(x, 0); push(x, h - 1); x++; } else { y = 0; stage = 'seedY'; } }
            else if (stage === 'seedY') { if (y < h) { push(0, y); push(w - 1, y); y++; } else stage = 'flood'; }
            else if (stage === 'flood') {
              if (qs < qe) { x = qx[qs]; y = qy[qs]; qs++; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
              else { i = 0; stage = 'erase'; }
            } else if (stage === 'erase') { if (i < n) { if (seen[i]) d[i * 4 + 3] = 0; i++; } else { fi = 0; pass = 0; scanFrame(); } }
            else if (stage === 'frame') {
              if (yy >= y0 + fh) { ki = 0; stage = 'apply'; }
              else if (yy < 0 || yy >= h || xx >= x0 + fw) { yy++; xx = x0; }
              else {
                if (xx >= 0 && xx < w) {
                  p = (yy * w + xx) * 4; a = d[p + 3];
                  if (a >= 18) {
                    r = d[p]; gg = d[p + 1]; b = d[p + 2]; yv = (r + gg + b) / 3; ch = Math.max(r, gg, b) - Math.min(r, gg, b);
                    if (yv >= 180 && ch <= 30) {
                      touch = (xx + 1 >= w || d[(yy * w + xx + 1) * 4 + 3] < 18) || (xx - 1 < 0 || d[(yy * w + xx - 1) * 4 + 3] < 18) || (yy + 1 >= h || d[((yy + 1) * w + xx) * 4 + 3] < 18) || (yy - 1 < 0 || d[((yy - 1) * w + xx) * 4 + 3] < 18);
                      if (touch) kills.push(p);
                    }
                  }
                }
                xx++;
              }
            } else if (stage === 'apply') {
              if (ki < kills.length) { d[kills[ki] + 3] = 0; ki++; }
              else {
                pass++;
                if (!kills.length || pass >= 16) { fi++; pass = 0; }
                if (fi < frames.length) scanFrame(); else { x = 1; y = 1; stage = 'edge'; }
              }
            } else if (stage === 'edge') {
              if (y >= h - 1) { stage = 'commit'; queue(); return; }
              if (x >= w - 1) { x = 1; y++; }
              else {
                p = (y * w + x) * 4; a = d[p + 3];
                if (a >= 30) {
                  r = d[p]; gg = d[p + 1]; b = d[p + 2]; yv = (r + gg + b) / 3; ch = Math.max(r, gg, b) - Math.min(r, gg, b);
                  if (yv >= 175 && ch <= 36) {
                    touch = d[p + 7] < 18 || d[p - 1] < 18 || d[p + w * 4 + 3] < 18 || d[p - w * 4 + 3] < 18;
                    if (touch) {
                      if (yv > 220 && ch < 26) d[p + 3] = 0;
                      else { d[p] = (r * 0.62 + 36 * 0.38) | 0; d[p + 1] = (gg * 0.62 + 28 * 0.38) | 0; d[p + 2] = (b * 0.62 + 22 * 0.38) | 0; d[p + 3] = (a * 0.45) | 0; }
                    }
                  }
                }
                x++;
              }
            }
            if (++units >= 32768 || (units % 128 === 0 && now() - started >= 4)) break;
          }
          queue();
        } catch (error) { stop(error); }
      }
      // Message tasks yield to the browser without nested setTimeout's4ms clamp.
      // One pending message per sheet; all exits detach and close both ports.
      if (typeof MessageChannel === 'function') {
        try {
          channel = new MessageChannel();
          channel.port1.onmessage = function () { if (!queued || done) return; queued = false; slice(); };
        } catch (error) { closeTasks(); }
      }
      queue();
    });
  }
  function source(src, label, retry, key, frames, current, preparedSize) {
    var rec = { src: src, requestSrc: requestURL(src, retry), image: new Image(), state: 'pending', error: null, processKey: key, preparedImage: null }, resolve, reject, decoding = false;
    rec.promise = new Promise(function (yes, no) { resolve = yes; reject = no; });
    // Background preloading may fail before a user enters. Keep its rejection
    // observable by prepare(), without leaving an unhandled rejection behind.
    rec.promise.catch(function () {});
    function finish(error) {
      if (rec.state !== 'pending') return;
      clearTimeout(timer); rec.image.onload = rec.image.onerror = null;
      rec.state = error ? 'error' : 'ready'; rec.error = error || null;
      if (error && rec.cancelPixels) rec.cancelPixels(error);
      if (error) reject(error); else resolve(rec);
    }
    rec.cancel = function () { finish(new Error('天兵素材准备已失效：' + label)); };
    function loaded() {
      if (rec.state !== 'pending' || decoding) return;
      decoding = true;
      var decoded;
      try { decoded = rec.image.decode ? rec.image.decode() : Promise.resolve(); }
      catch (e) { finish(new Error('天兵图片解码失败：' + label)); return; }
      Promise.resolve(decoded).then(function () {
        if (rec.state !== 'pending') return;
        if (!current(rec)) { rec.cancel(); return; }
        if (!rec.image.complete || rec.image.naturalWidth <= 0) { finish(new Error('天兵图片无有效尺寸：' + label)); return; }
        if (preparedSize) {
          if (rec.image.naturalWidth !== preparedSize.w || rec.image.naturalHeight !== preparedSize.h) {
            finish(new Error('天兵预处理图集尺寸不符：' + label)); return;
          }
          // Preserve the original Canvas drawable and its scaled sampling. This
          // single native blit performs no readback or JS alpha/pixel processing.
          try {
            var prepared = document.createElement('canvas');
            prepared.width = preparedSize.w; prepared.height = preparedSize.h;
            prepared.getContext('2d', { willReadFrequently: true }).drawImage(rec.image, 0, 0);
            Object.defineProperty(prepared, 'naturalWidth', { value: preparedSize.w });
            Object.defineProperty(prepared, 'naturalHeight', { value: preparedSize.h });
            prepared.complete = true;
            if (!current(rec)) { rec.cancel(); return; }
            rec.preparedImage = prepared;
          } catch (error) { finish(new Error('天兵预处理图集缓存失败：' + label)); return; }
          finish(null); return;
        }
        if (key === 'native') { finish(null); return; }
        cleanSheet(rec, frames, current).then(function (canvas) {
          if (rec.state !== 'pending') return;
          if (!current(rec)) { rec.cancel(); return; }
          rec.preparedImage = canvas; finish(null);
        }, function (error) { finish(new Error('天兵图片处理失败：' + label + '（' + String(error.message || error) + '）')); });
      }, function () { finish(new Error('天兵图片解码失败：' + label)); });
    }
    var timer = setTimeout(function () { finish(new Error('天兵图片载入超时：' + label)); }, 15000);
    rec.image.onload = loaded;
    rec.image.onerror = function () { finish(new Error('天兵图片载入失败：' + label)); };
    try { rec.image.src = rec.requestSrc; if (rec.image.complete && rec.image.naturalWidth > 0) loaded(); }
    catch (e) { finish(new Error('天兵图片载入失败：' + label)); }
    return rec;
  }
  function entry(t, retry) {
    var d = XY.SINK_DATA && XY.SINK_DATA[t]; if (!d) return null;
    var e = imgs[t]; if (!e) e = imgs[t] = { d: d, records: [], extra: [], _cut: !!d.nativeAlpha };
    e.d = d;
    var list = sources(d);
    list.forEach(function (src, i) {
      var rec = e.records[i], key = processKey(d, i);
      if (!rec || rec.src !== src || rec.processKey !== key || (retry && rec.state === 'error')) {
        var retryFailed = !!(retry && rec && rec.src === src && rec.state === 'error');
        if (rec && rec.state === 'pending') rec.cancel();
        rec = e.records[i] = source(src, t + (i ? ' 行走图' + i : ' 主图'), retryFailed, key, d.fr, function (record) { return e.records[i] === record; }, key.indexOf('paper-v1:') === 0 ? { w: d.w, h: d.h } : null);
      }
      if (i) e.extra[i - 1] = rec.image;
      else { e.img = rec.preparedImage || rec.image; e._cut = !!d.nativeAlpha || key.indexOf('paper-v1:') === 0 || !!rec.preparedImage; }
    });
    for (var old = list.length; old < e.records.length; old++) if (e.records[old].state === 'pending') e.records[old].cancel();
    e.records.length = list.length; e.extra.length = list.length - 1;
    return e;
  }
  function ent(t) {
    if (!S.on) return null;
    var e = entry(t, false);
    return e && e.records.every(function (rec) { return rec.state === 'ready'; }) ? e : null;
  }
  S.ready = function () {
    if (!XY.SINK_DATA) return false;
    return Object.keys(XY.SINK_DATA).every(function (t) {
      var e = imgs[t], list = sources(XY.SINK_DATA[t]);
      return e && list.length === e.records.length && list.every(function (src, i) { return e.records[i].src === src && e.records[i].processKey === processKey(XY.SINK_DATA[t], i) && e.records[i].state === 'ready'; });
    });
  };
  S.prepare = function (retry) {
    var records = [];
    if (!XY.SINK_DATA) { var missing = Promise.reject(new Error('天兵图集数据尚未载入')); missing.catch(function () {}); return missing; }
    Object.keys(XY.SINK_DATA).forEach(function (t) { records = records.concat(entry(t, !!retry).records); });
    if (!waitRecords || records.length !== waitRecords.length || records.some(function (rec, i) { return rec !== waitRecords[i]; })) {
      waitRecords = records; waitPromise = Promise.all(records.map(function (rec) { return rec.promise; })).then(function () { return S; });
      waitPromise.catch(function () {});
    }
    return waitPromise;
  };
  // Explicit loader retry can arrive while other old images are still pending.
  // Observe this attempt settling before one retry; never recreate a record here.
  S.waitForPending = function () {
    var records = [];
    Object.keys(XY.SINK_DATA || {}).forEach(function (t) { records = records.concat(entry(t, false).records); });
    return Promise.all(records.map(function (rec) { return rec.promise.then(function () {}, function () {}); }));
  };
  S.has = function (t) { return !!ent(t); };
  S.entry = ent;
  S.preload = function () { if (XY.SINK_DATA) S.prepare(false).catch(function () {}); };
  S.top = function (t) { var d = XY.SINK_DATA && XY.SINK_DATA[t.type]; return d ? d.T * (1 + 0.1 * ((t.lv || 1) - 1)) : 60; };
  /* 取帧 */
  function pick(t, rt, mv, cd, n) {
    var st = t._sk; if (!st) st = t._sk = { at: t.atkT || 0, sa: -99 };
    if ((t.atkT || 0) > st.at + 0.1) st.sa = rt; st.at = t.atkT || 0;
    var since = rt - st.sa;
    if (n > 8) {            // v0.8.6 弓兵 10 帧：拉弓(6) → 满弓(8) → 放箭(7) → 收势(9) → 回持弓待机
      if (since < 0.14) return { i: 7 };
      if (since < 0.36) return { i: 9 };
      if (since < cd + 0.6 && since > cd - 0.32 && since < cd + 0.05) return { i: since > cd - 0.15 ? 8 : 6 };
      if (mv) return { i: 2 + (Math.floor(rt * 9 + (t.sd || 0)) & 3), walk: true };
      return { i: 0, mix: 0 };
    }
    if (since < 0.2) return { i: 7 };
    if (since < cd + 0.6 && since > cd - 0.22 && since < cd + 0.05) return { i: 6 };
    if (mv) return { i: 2 + (Math.floor(rt * 9 + (t.sd || 0)) & 3), walk: true };
    return { i: 0, mix: 0.5 + 0.5 * Math.sin(rt * 2.2 + (t.sd || 0)) };
  }
  // Source rectangles and their paired anchor stay in original image pixels.
  // Per-frame scale aligns separately generated poses without changing artwork.
  S.drawFrame = function (c, en, i) {
    var f = en.d.fr[i]; if (!f) return;
    var fit = en.d.fit && en.d.fit[i], scale = fit ? fit.scale : 1;
    var im = fit && fit.source ? en.extra[fit.source - 1] : en.img;
    c.save(); c.scale(scale, scale);
    if (en.d.nativeAlpha) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; }
    var clip = en.d.clip && en.d.clip[i];
    if (clip) { c.beginPath(); clip.forEach(function (p, j) { if (j) c.lineTo(p[0] - f[4], p[1] - f[5]); else c.moveTo(p[0] - f[4], p[1] - f[5]); }); c.closePath(); c.clip(); }
    c.drawImage(im, f[0], f[1], f[2], f[3], -f[4], -f[5], f[2], f[3]); c.restore();
  };
  function one(c, en, i, alpha, x, foot, k, look) {
    c.globalAlpha = alpha; c.save(); c.translate(x, foot); c.scale(look * k, k);
    S.drawFrame(c, en, i);
    c.restore(); c.globalAlpha = 1;
  }
  /* 画天兵：脚底 = gy；f = 朝向（±1）；mv = 在走；sc = 等级放大（1 / 1.1 / 1.2）；cd = 这个天兵的出手间隔（秒） */
  S.draw = function (c, G, t, rt, f, mv, gy, sc, cd) {
    var en = ent(t.type); if (!en) return false;
    var a = pick(t, rt, mv, cd || 1, en.d.fr.length), k = sc / (en.d.ss || XY.SINK_SS), x = t.x;
    if (en.d.distanceGait) {
      var gait = t._sinkGait;
      if (!gait) gait = t._sinkGait = { x: t.x, y: t.y, time: rt, distance: 0 };
      if (gait.time !== rt) {
        var dx = t.x - gait.x, dy = t.y - gait.y, moved = Math.sqrt(dx * dx + dy * dy);
        if (moved > .02 && moved < 40) gait.distance += moved;
        gait.x = t.x; gait.y = t.y; gait.time = rt;
      }
      if (a.walk) a.i = 2 + Math.floor(gait.distance / (en.d.walkStep || 8)) % 4;
      if (a.mix !== undefined) a = { i: 0 };
    }
    var bob = a.walk && !en.d.distanceGait ? -Math.abs(Math.sin(rt * 9 + (t.sd || 0))) * 1.6 : 0;
    var hw = en.d.fr[0][2] * k * 0.32;
    c.fillStyle = 'rgba(70,50,30,0.2)'; c.beginPath(); c.ellipse(x, gy + 1, hw, hw * 0.3, 0, 0, PI2); c.fill();
    if (a.mix !== undefined && !G._lod) { one(c, en, 0, 1, x, gy + bob, k, f); if (a.mix > 0.02) one(c, en, 1, a.mix, x, gy + bob, k, f); }
    else one(c, en, a.i === 0 || a.mix !== undefined ? 0 : a.i, 1, x, gy + bob, k, f);
    S.stats++; S.last = { type: t.type, frame: a.mix !== undefined ? 0 : a.i, t: rt }; S.frames[t.type + ':' + (a.mix !== undefined ? 0 : a.i)] = 1;
    return true;
  };
  if (XY.SINK_DATA) S.preload(); else setTimeout(function () { if (XY.SINK_DATA) S.preload(); }, 0);
})();
