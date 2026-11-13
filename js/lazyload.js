/* Split entry only: load art at the departure boundary, never on window.load. */
(function () {
  'use strict';
  var XY = window.XY, defs = window.XY_LAZY_CHUNKS || [];
  var L = XY.lazy = { on: defs.length > 0, state: 'idle', chunks: [], loaded: {}, failed: {} };
  var waiters = { xchar: XY.xchar && XY.xchar.pendingTemplates || [] }, work = null, panel = null;
  if (XY.xchar) delete XY.xchar.pendingTemplates;
  defs.forEach(function (d) { L.chunks.push({ id: d.id, src: d.src, bytes: d.bytes, token: d.token, check: d.check, state: 'pending' }); });
  function find(id) { return L.chunks.find(function (c) { return c.id === id; }); }
  L.acceptAttempt = function (id, attempt) { var c = find(id); return !!c && c.state === 'loading' && String(c.attempt) === String(attempt); };
  L.pending = function (id) { var c = find(id); return !!c && c.state !== 'ok'; };
  L.after = function (id, cb) { if (!L.pending(id)) return false; (waiters[id] || (waiters[id] = [])).push(cb); return true; };
  L.summary = function () { return { on: L.on, state: L.state, chunks: L.chunks.map(function (c) { return { id: c.id, state: c.state, bytes: c.bytes, why: c.why || '' }; }) }; };
  function custom() {
    var keep = { CHIBI: {}, CHIBI_INK: {} };
    Object.keys(keep).forEach(function (g) { Object.keys(XY[g] || {}).forEach(function (k) { if (XY[g][k].xchar) keep[g][k] = XY[g][k]; }); });
    return keep;
  }
  function restore(keep) {
    Object.keys(keep).forEach(function (g) { XY[g] = XY[g] || {}; Object.keys(keep[g]).forEach(function (k) { XY[g][k] = keep[g][k]; if (XY.chibi && XY.chibi.forget) XY.chibi.forget(k); }); });
  }
  function preload() {
    [XY.heroink, XY.chibi, XY.MINK, XY.SINK, XY.ITEMINK, XY.ICONINK, XY.ULTINK].forEach(function (p) { if (p && p.preload) p.preload(); });
    if (XY.SKILLFX && XY.SKILLFX.ok) XY.SKILLFX.ok();
    if (XY.bgPaintReady) XY.bgPaintReady();
  }
  function payloadImages(c) {
    var images = [], seen = [];
    function walk(value, key) {
      if (typeof value === 'string') {
        if (/^data:image\//.test(value) || /\.src$/.test(key)) images.push({ src: value, key: key });
      } else if (value && typeof value === 'object' && seen.indexOf(value) < 0) {
        seen.push(value); Object.keys(value).forEach(function (k) { walk(value[k], key + '.' + k); });
      }
    }
    c.check.forEach(function (key) {
      var value = XY[key];
      if (!value || typeof value !== 'object' || !Object.keys(value).length) throw new Error('payload missing or empty: ' + key);
      walk(value, key);
    });
    if (!images.length) throw new Error('payload contains no images: ' + c.id);
    return images;
  }
  function load(c) {
    if (c.state === 'ok') return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'), saved = custom(), done = false;
      c.state = 'loading'; c.why = ''; delete L.failed[c.id];
      c.attempt = (c.tries || 0) + 1; s.dataset.xyChunk = c.id; s.dataset.xyAttempt = String(c.attempt);
      window.XY_LAZY_OK = window.XY_LAZY_OK || {}; delete window.XY_LAZY_OK[c.id];
      function finish(ok, why) {
        if (done) return; done = true; clearTimeout(timer);
        s.onload = s.onerror = null; s.remove(); restore(saved);
        if (ok && window.XY_LAZY_OK[c.id] !== c.token) { ok = false; why = 'payload incomplete'; }
        if (ok && c.check.some(function (k) { return !XY[k] || typeof XY[k] !== 'object'; })) { ok = false; why = 'payload globals missing'; }
        c.state = ok ? 'ok' : 'fail'; c.why = why || '';
        if (!ok) { L.failed[c.id] = c; reject(new Error(c.id + ': ' + c.why)); return; }
        L.loaded[c.id] = c;
        try { preload(); (waiters[c.id] || []).splice(0).forEach(function (f) { f(); }); }
        catch (e) { c.state = 'fail'; c.why = String(e.message || e); L.failed[c.id] = c; reject(e); return; }
        resolve();
      }
      var timer = setTimeout(function () { finish(false, 'timeout'); }, 15000);
      s.onload = function () {
        if (done) return;
        var images;
        try { images = payloadImages(c); } catch (e) { finish(false, e.message); return; }
        Promise.all(images.map(function (image) { return new Promise(function (resolve, reject) {
          if (!image.src) { reject(new Error('image source empty: ' + image.key)); return; }
          var im = new Image();
          im.onload = function () { if (im.naturalWidth > 0) resolve(); else reject(new Error('image empty: ' + image.key)); };
          im.onerror = function () { reject(new Error('image decode failed: ' + image.key)); }; im.src = image.src;
        }); })).then(function () { if (!done) { c.imageCount = images.length; finish(true); } }, function (e) { finish(false, e.message); });
      }; s.onerror = function () { finish(false, 'load error'); };
      s.src = c.src + (c.tries ? '?retry=' + c.tries : ''); c.tries = (c.tries || 0) + 1;
      document.head.appendChild(s);
    });
  }
  L.start = function () {
    if (!L.on) return Promise.resolve(L);
    if (work) return work;
    L.state = 'loading';
    work = L.chunks.reduce(function (q, c) { return q.then(function () { return load(c); }); }, Promise.resolve()).then(function () { L.state = 'done'; work = null; return L; }, function (e) { L.state = 'failed'; work = null; throw e; });
    return work;
  };
  L.whenAll = function (cb) { return L.start().then(function () { cb(L); }); };
  function show(text, retry) {
    if (!panel) { panel = document.createElement('div'); panel.id = 'lazyStatus'; panel.setAttribute('role', 'status'); panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(246,238,220,.96);color:#342c23;display:flex;align-items:center;justify-content:center;flex-direction:column;font:20px serif;gap:20px;text-align:center;padding:24px'; document.body.appendChild(panel); }
    panel.replaceChildren(); var t = document.createElement('div'); t.textContent = text; panel.appendChild(t);
    if (retry) { var b = document.createElement('button'); b.textContent = '重新载入'; b.style.cssText = 'min-width:100px;min-height:44px;background:#953b2b;color:#fff5df;border:0;font:20px serif'; b.onclick = retry; panel.appendChild(b); b.focus(); }
  }
  L.enter = function (next) {
    if (L.state === 'done' || !L.on) { next(); return; }
    show('正在展开行囊…');
    L.start().then(function () { if (panel) { panel.remove(); panel = null; } next(); }, function (e) { show('行囊载入失败，尚未出发。请检查离线文件后重试。' + e.message, function () { L.enter(next); }); });
  };
})();
