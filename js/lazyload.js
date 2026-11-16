/* Split entry: current battle requirements and the full catalogue remain distinct. */
(function () {
  'use strict';
  var XY = window.XY, defs = window.XY_LAZY_CHUNKS || [];
  var L = XY.lazy = { on: defs.length > 0, state: 'idle', chunks: [], loaded: {}, failed: {} };
  var waiters = { xchar: XY.xchar && XY.xchar.pendingTemplates || [] }, panel = null, panelJob = null;
  var enterToken = 0, notice = null, noticeFrame = 0, battleIds = [];
  if (XY.xchar) delete XY.xchar.pendingTemplates;
  defs.forEach(function (d) { L.chunks.push({ id: d.id, src: d.src, bytes: d.bytes, token: d.token, check: d.check, members: d.members || null, deps: d.deps || [], state: 'pending' }); });
  function find(id) { return L.chunks.find(function (c) { return c.id === id; }); }
  L.acceptAttempt = function (id, attempt) { var c = find(id); return !!c && c.state === 'loading' && String(c.attempt) === String(attempt); };
  L.pending = function (id) { var c = find(id); return !!c && c.state !== 'ok'; };
  L.active = function () { return !!panel; };
  L.cancel = function () {
    ++enterToken; var job = panelJob; panelJob = null;
    if (panel) { panel.remove(); panel = null; }
    // Work stays cached; cancellation releases only this job's navigation/hold.
    if (job && job.cancel) job.cancel();
  };
  if (window.addEventListener) window.addEventListener('keydown', function (e) {
    if (!panel) return;
    if (e.code === 'Escape') { e.preventDefault(); L.cancel(); }
    else if (e.code === 'Tab') {
      var buttons = Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled])'));
      var i = buttons.indexOf(document.activeElement), n = buttons.length;
      if (n && (i < 0 || (e.shiftKey ? i === 0 : i === n - 1))) {
        e.preventDefault(); buttons[e.shiftKey ? n - 1 : 0].focus();
      }
    } else if (!((e.code === 'Enter' || e.code === 'Space') && e.target && e.target.tagName === 'BUTTON' && panel.contains(e.target))) e.preventDefault();
    // Keep native button activation/focus, but never dispatch canvas/game keys.
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('keyup', function (e) {
    if (!panel) return;
    if (!(e.target && e.target.tagName === 'BUTTON' && panel.contains(e.target)) && e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  L.cancelOwner = function (owner) { if (panelJob && panelJob.owner === owner) L.cancel(); };
  ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'click', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (!panel) return;
      // DOM controls retain native focus/click. Never pass those gestures to global game listeners.
      if (panel.contains(e.target)) return;
      else { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); }
    }, { capture: true, passive: false });
  });
  L.after = function (id, cb) { if (!L.pending(id)) return false; (waiters[id] || (waiters[id] = [])).push(cb); return true; };
  L.summary = function () { return { on: L.on, state: L.state, chunks: L.chunks.map(function (c) { return { id: c.id, state: c.state, bytes: c.bytes, why: c.why || '' }; }) }; };
  function custom() {
    var keep = { CHIBI: {}, CHIBI_INK: {} };
    Object.keys(keep).forEach(function (g) { Object.keys(XY[g] || {}).forEach(function (k) { if (XY[g][k].xchar) keep[g][k] = XY[g][k]; }); });
    return keep;
  }
  function restore(keep) {
    Object.keys(keep).forEach(function (g) { XY[g] = XY[g] || {}; Object.keys(keep[g]).forEach(function (k) { if (XY[g][k] !== keep[g][k]) { XY[g][k] = keep[g][k]; if (XY.chibi && XY.chibi.forget) XY.chibi.forget(k); } }); });
  }
  // Generated chunks capture/restore in the same synchronous execution turn.
  // Never retain a custom-art snapshot across network or image-validation work:
  // the selection UI remains interactive while those asynchronous jobs run.
  L.captureChunkCustom = function (id, attempt) {
    if (!L.acceptAttempt(id, attempt)) return null;
    return { id: id, attempt: String(attempt), keep: custom() };
  };
  L.restoreChunkCustom = function (id, attempt, snapshot) {
    if (!snapshot || snapshot.id !== id || snapshot.attempt !== String(attempt) || !L.acceptAttempt(id, attempt)) return false;
    restore(snapshot.keep); return true;
  };
  function preload() {
    [XY.heroink, XY.MINK, XY.SINK, XY.ITEMINK, XY.ICONINK].forEach(function (p) { if (p && p.preload) p.preload(); });
    if (XY.SKILLFX && XY.SKILLFX.ok) XY.SKILLFX.ok();
    if (XY.bgPaintReady) XY.bgPaintReady();
    if (XY.R4 && XY.R4.worldProps) XY.R4.worldProps.preload();
  }
  function coreMetadata(c) {
    if (c.id !== 'core') return '';
    var plain = XY.CHIBI_STAND, ink = XY.CHIBI_INK_STAND, labels = XY.CHIBI_INK_SRC;
    if (!(Number.isFinite(plain) && plain > 0 && Number.isFinite(ink) && ink > 0) || !labels ||
        !['tang', 'wukong', 'bajie', 'wujing', 'horse'].every(function (id) { return labels[id] && typeof labels[id].cover === 'string' && labels[id].cover && typeof labels[id].sheet === 'string' && labels[id].sheet; })) throw new Error('师徒动作比例或来源标签缺失');
    return JSON.stringify([plain, ink, labels]);
  }
  function backgroundMetadata(c) {
    if (c.check.indexOf('BGS1') < 0) return '';
    var d = XY.BGS1;
    if (!d || !d.src || !Array.isArray(d.patches)) throw new Error('background sources missing');
    return d.patches.reduce(function (values, p) { return values.concat([p.src, p.x, p.y, p.w, p.h, p.feather]); }, [d.src, d.w, d.h]);
  }
  function sameBackground(a, b) { return a === b || Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (value, i) { return value === b[i]; }); }
  function payloadImages(c) {
    var images = [], seen = [];
    function walk(value, key) {
      // User-generated atlases survive chunk assignment but are not official
      // payload integrity inputs (and may still be rebuilding independently).
      if (value && value.xchar && /^(CHIBI|CHIBI_INK)\./.test(key)) return;
      if (typeof value === 'string') {
        if (/^data:image\//.test(value) || /\.src$/.test(key)) images.push({ src: value, key: key });
      } else if (value && typeof value === 'object' && seen.indexOf(value) < 0) {
        seen.push(value); Object.keys(value).forEach(function (k) { walk(value[k], key + '.' + k); });
      }
    }
    c.check.forEach(function (key) {
      var value = XY[key];
      if (!value || typeof value !== 'object' || !Object.keys(value).length) throw new Error('payload missing or empty: ' + key);
      var members = c.members && c.members[key];
      if (members) members.forEach(function (id) {
        if (!Object.prototype.hasOwnProperty.call(value, id) || !value[id] || typeof value[id] !== 'object') throw new Error('payload member missing: ' + key + '.' + id);
        walk(value[id], key + '.' + id);
      });
      else walk(value, key);
    });
    if (!images.length) throw new Error('payload contains no images: ' + c.id);
    return images;
  }
  function load(c, installed) {
    if (c.state === 'ok') { installed(); return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'), done = false;
      c.state = 'loading'; c.why = ''; c.decoded = 0; c.imageCount = 0; c.canonical = []; delete L.failed[c.id]; refreshState(); progress();
      c.attempt = (c.tries || 0) + 1; s.dataset.xyChunk = c.id; s.dataset.xyAttempt = String(c.attempt);
      window.XY_LAZY_OK = window.XY_LAZY_OK || {}; delete window.XY_LAZY_OK[c.id];
      function finish(ok, why) {
        if (done) return; done = true; clearTimeout(timer);
        s.onload = s.onerror = null; s.remove();
        if (ok && window.XY_LAZY_OK[c.id] !== c.token) { ok = false; why = 'payload incomplete'; }
        if (ok && c.check.some(function (k) { return !XY[k] || typeof XY[k] !== 'object'; })) { ok = false; why = 'payload globals missing'; }
        c.state = ok ? 'ok' : 'fail'; c.why = why || ''; refreshState(); progress();
        if (!ok) { L.failed[c.id] = c; reject(new Error(c.id + ': ' + c.why)); return; }
        var errors = [];
        try { preload(); } catch (e) { errors.push(e); }
        // One faulty subscriber must not discard later subscribers. Only failed
        // subscribers stay queued for the user's explicit retry.
        (waiters[c.id] || []).splice(0).forEach(function (f) {
          try { f(); } catch (e) { errors.push(e); (waiters[c.id] || (waiters[c.id] = [])).push(f); }
        });
        if (errors.length) {
          c.state = 'fail'; c.why = String(errors[0].message || errors[0]); L.failed[c.id] = c;
          refreshState(); progress(); reject(new Error(c.id + ': ' + c.why)); return;
        }
        L.loaded[c.id] = c;
        resolve();
      }
      var timer = setTimeout(function () { finish(false, 'timeout'); }, 15000);
      s.onload = function () {
        if (done) return;
        // Do not release the next ordered installation for an incomplete payload.
        if (window.XY_LAZY_OK[c.id] !== c.token) { finish(false, 'payload incomplete'); return; }
        if (c.check.some(function (k) { return !XY[k] || typeof XY[k] !== 'object'; })) { finish(false, 'payload globals missing'); return; }
        var images;
        try { images = payloadImages(c); c.coreMetadata = coreMetadata(c); c.backgroundMetadata = backgroundMetadata(c); c.imageCount = images.length; progress(); } catch (e) { finish(false, e.message); return; }
        var backgroundImages = images.filter(function (image) { return /^BGS1\./.test(image.key); });
        var soldierImages = images.filter(function (image) { return /^SINK_DATA\./.test(image.key); });
        var bodyPattern = XY.chibi && XY.chibi.useInk ? /^CHIBI_INK\.[^.]+\.src$/ : /^CHIBI\.[^.]+\.src$/;
        var bodyImages = images.filter(function (image) { return bodyPattern.test(image.key); });
        var ultimateImages = images.filter(function (image) { return /^ULTINK_DATA\.[^.]+\.src$/.test(image.key); });
        var checks = images.filter(function (image) { return !/^BGS1\./.test(image.key) && !/^SINK_DATA\./.test(image.key) && !/^ULTINK_DATA\.[^.]+\.src$/.test(image.key) && !bodyPattern.test(image.key); }).map(function (image) { return new Promise(function (resolve, reject) {
          if (!image.src) { reject(new Error('image source empty: ' + image.key)); return; }
          var im = new Image();
          im.onload = function () { if (done) { resolve(); return; } if (im.naturalWidth > 0) { c.decoded++; progress(); resolve(); } else reject(new Error('image empty: ' + image.key)); };
          im.onerror = function () { if (done) { resolve(); return; } reject(new Error('image decode failed: ' + image.key)); }; im.src = image.src;
        }); });
        if (backgroundImages.length) {
          var backgroundWork;
          try {
            if (!XY.prepareBgPaint || !XY.bgPaintReady) throw new Error('background loader missing');
            backgroundWork = XY.prepareBgPaint(c.attempt > 1).then(function () {
              if (done) return;
              if (!sameBackground(c.backgroundMetadata, backgroundMetadata(c)) || !XY.bgPaintReady()) throw new Error('background source changed');
              c.decoded += backgroundImages.length; progress();
            });
          } catch (error) { backgroundWork = Promise.reject(error); }
          c.canonical.push(backgroundWork); checks.push(backgroundWork);
        }
        function canonicalImages(module, selected, kind) {
          var ids = selected.map(function (image) { return image.key.split('.')[1]; });
          if (!module || !module.prepareIds || !module.waitForPendingIds) throw new Error(kind + ' loader missing');
          var checked = module.prepareIds(ids, false);
          if (c.attempt > 1) checked = checked.catch(function (error) {
            if (done) throw error;
            return module.waitForPendingIds(ids).then(function () { if (done) throw error; return module.prepareIds(ids, true); });
          });
          c.canonical.push(checked);
          return checked.then(function () { if (!done) { c.decoded += selected.length; progress(); } });
        }
        if (bodyImages.length) {
          try { checks.push(canonicalImages(XY.chibi, bodyImages, 'body')); } catch (error) { checks.push(Promise.reject(error)); }
        }
        if (soldierImages.length) {
          // Validate the exact cache used for drawing, not a second Image that
          // can rejoin a timed-out canonical request after temporary validation.
          var soldierWork;
          try {
            if (soldierImages.some(function (image) { return !image.src; })) throw new Error('soldier image source empty');
            if (!XY.SINK || !XY.SINK.prepare) throw new Error('soldier image loader missing');
            soldierWork = XY.SINK.prepare(false);
            if (c.attempt > 1) soldierWork = soldierWork.catch(function (error) {
              if (done) throw error;
              if (!XY.SINK.waitForPending) throw new Error('soldier image retry unavailable');
              // One user retry may follow the chunk deadline before every old
              // per-image deadline. Wait for all those records, then retry only
              // errors once. Never replace pending/ready records or loop.
              return XY.SINK.waitForPending().then(function () {
                if (done) throw error;
                return XY.SINK.prepare(true);
              });
            });
          } catch (error) { soldierWork = Promise.reject(error); }
          c.canonical.push(soldierWork);
          checks.push(soldierWork.then(function () {
            if (done) return;
            c.decoded += soldierImages.length; progress();
          }));
        }
        if (ultimateImages.length) {
          try { checks.push(canonicalImages(XY.ULTINK, ultimateImages, 'ultimate')); } catch (error) { checks.push(Promise.reject(error)); }
        }
        Promise.all(checks).then(function () { if (!done) { c.imageCount = images.length; c.inputs = images; finish(true); } }, function (e) { finish(false, e.message); });
        // Assignment, custom restore and the exact validation inputs are now captured.
        // Image completion remains this chunk's original success/failure barrier.
        installed();
      }; s.onerror = function () { finish(false, 'load error'); };
      s.src = c.src + (c.tries ? '?retry=' + c.tries : ''); c.tries = (c.tries || 0) + 1;
      document.head.appendChild(s);
    });
  }
  function refreshState() {
    L.state = L.chunks.every(function (c) { return c.state === 'ok'; }) ? 'done' :
      L.chunks.some(function (c) { return c.state === 'loading'; }) ? 'loading' :
      L.chunks.some(function (c) { return c.state === 'fail'; }) ? 'failed' :
      L.chunks.some(function (c) { return c.state === 'ok'; }) ? 'partial' : 'idle';
  }
  function required(ids) {
    var out = [], seen = {}, visiting = {};
    function add(id) {
      var c = find(id); if (!c) throw new Error('素材包缺失：' + id);
      if (visiting[id]) throw new Error('素材依赖循环：' + id);
      if (seen[id]) return;
      visiting[id] = true; c.deps.forEach(add); delete visiting[id]; seen[id] = true; out.push(id);
    }
    ids.forEach(add); return out;
  }
  function chunkReady(c) {
    if (!c || c.state !== 'ok' || !c.inputs || !c.inputs.length) return false;
    try { if (c.coreMetadata !== coreMetadata(c) || !sameBackground(c.backgroundMetadata, backgroundMetadata(c))) return false; }
    catch (error) { return false; }
    if (c.backgroundMetadata && (!XY.bgPaintReady || !XY.bgPaintReady())) return false;
    if (!c.inputs.every(function (image) { var value = XY; image.key.split('.').forEach(function (key) { value = value && value[key]; }); return value === image.src; })) return false;
    var bodies = c.members && c.members.CHIBI_INK, ults = c.members && c.members.ULTINK_DATA;
    return (!bodies || XY.chibi && XY.chibi.readyIds(bodies)) && (!ults || XY.ULTINK && XY.ULTINK.readyIds(ults));
  }
  function readyGroups(ids) { return !L.on || ids.every(function (id) { return chunkReady(find(id)); }); }
  function prefetch(c) {
    if (c.state === 'ok' || c.promise) return;
    var href = c.src + (c.tries ? '?retry=' + c.tries : '');
    if (c.prefetch && c.prefetch.getAttribute('href') === href) return;
    if (c.prefetch) c.prefetch.remove();
    var link = c.prefetch = document.createElement('link'); link.rel = 'preload'; link.as = 'script'; link.href = href;
    link.setAttribute('fetchpriority', c.id === 'ui' ? 'high' : 'low'); document.head.appendChild(link);
  }
  function request(c) {
    if (chunkReady(c)) return Promise.resolve(c);
    if (c.state === 'ok') { c.state = 'fail'; c.why = '已准备素材发生变化'; }
    if (c.promise) return c.promise;
    // Dependencies are canonical-ready before use. Prefetching the requested set
    // may overlap their network work, but never requests another optional group.
    var draining = Promise.all((c.canonical || []).map(function (p) { return p.catch(function () {}); }));
    var work = Promise.all([draining].concat(c.deps.map(function (id) { return request(find(id)); }))).then(function () { return load(c, function () {}); });
    c.promise = work.then(function () { c.promise = null; refreshState(); return c; }, function (error) { c.promise = null; refreshState(); throw error; });
    c.promise.catch(function () {}); return c.promise;
  }
  L.prepareGroups = function (ids) {
    if (!L.on) return Promise.resolve(L);
    try { ids = required(ids); } catch (error) { return Promise.reject(error); }
    ids.forEach(function (id) { prefetch(find(id)); });
    return Promise.all(ids.map(function (id) { return request(find(id)); })).then(function () { if (!readyGroups(ids)) throw new Error('素材在准备期间发生变化'); return L; });
  };
  L.start = function () { return L.prepareGroups(L.chunks.map(function (c) { return c.id; })); };
  L.whenAll = function (cb) { return L.start().then(function () { cb(L); }); };
  L.whenUI = function () { return L.prepareGroups(['ui']); };
  L.specialGroups = function (id) {
    if (!id) return [];
    var XC = XY.xchar, custom = XC && XC.isX(id), def = XY.SP_BY && XY.SP_BY[id];
    var kit = custom ? def && def.id : id;
    if (!kit || !find('special_' + kit)) throw new Error('角色素材清单缺失：' + id);
    return required(['special_' + kit]);
  };
  L.context = function (options) {
    var a = options || XY.app || {}, id = XY.save && XY.save.carryId && XY.save.carryId();
    return { levelId: a.levelId, dungeonId: a.dungeonId || null, modId: a.modId || null, villain: !!a.villain, lair: a.lair || null,
      carry: id || null, horse: XY.save && XY.save.horseForm && XY.save.horseForm(), custom: XY.xchar && XY.xchar.isX(id) ? XY.xchar.get(id) : null };
  };
  L.battleGroups = function (context) {
    // Conservative custom/mod/villain modes retain the same complete world/core/templates.
    return required(['ui', 'core', 'world', 'xchar'].concat(L.specialGroups(context && context.carry)));
  };
  L.battleReady = function (context) {
    if (!L.on) return true;
    try { return readyGroups(L.battleGroups(context)); } catch (error) { return false; }
  };
  L.prepareBattle = function (context) {
    try { battleIds = L.battleGroups(context); } catch (error) { return Promise.reject(error); }
    backgroundStatus(); return L.prepareGroups(battleIds);
  };
  L.specialReady = function (id) { if (!L.on) return true; try { return readyGroups(L.specialGroups(id)); } catch (error) { return false; } };
  L.prepareSpecial = function (id) { try { return L.prepareGroups(L.specialGroups(id)); } catch (error) { return Promise.reject(error); } };
  function backgroundStatus() {
    if (!notice) {
      notice = document.createElement('div'); notice.id = 'lazyBackgroundStatus';
      notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
      notice.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);z-index:9999;pointer-events:none;max-width:calc(100vw - 176px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:12px/14px serif;color:#70624f;background:rgba(249,243,229,.94)';
      document.body.appendChild(notice);
    }
    function tick() {
      noticeFrame = 0;
      if (!notice) return;
      if (battleIds.length && readyGroups(battleIds)) { notice.remove(); notice = null; return; }
      var app = window.__xy && window.__xy.app;
      var hidden = !app || app.screen !== 'levels' || !!panel;
      if (notice.hidden !== hidden) notice.hidden = hidden;
      var geo = XY.depart && XY.depart.geo;
      var top = geo && geo.land ? '57px' : '102px';
      if (notice.style.top !== top) notice.style.top = top;
      var list = battleIds.map(find), done = list.filter(function (c) { return c.state === 'ok'; }).length;
      var text = list.some(function (c) { return c.state === 'fail'; }) ? '关卡素材准备失败 · 点出发重试' : '正在准备关卡素材 ' + done + '/' + list.length;
      if (notice.textContent !== text) notice.textContent = text;
      noticeFrame = requestAnimationFrame(tick);
    }
    if (!noticeFrame) tick();
  }

  var progressFrame = 0;
  var names = { ui: '界面图册', core: '师徒动作', world: '山川场景', ult: '战斗特效', xchar: '同行伙伴' };
  function progress() {
    if (!panel || !panel.querySelector('progress') || progressFrame) return;
    progressFrame = requestAnimationFrame(function () {
      progressFrame = 0;
      if (!panel) return;
      var bar = panel.querySelector('progress'), detail = panel.querySelector('[data-load-detail]');
      if (!bar || !detail) return;
      var list = (panelJob && panelJob.ids || []).map(find).filter(Boolean);
      var done = list.filter(function (c) { return c.state === 'ok'; }).length;
      var active = list.find(function (c) { return c.state === 'loading'; });
      bar.value = done + (active && active.imageCount ? active.decoded / active.imageCount : 0);
      detail.textContent = done === list.length ? '准备完成' :
        '已准备 ' + done + '/' + list.length + ' · ' + (active ? names[active.id] || '角色动作与必杀' : '等待依赖素材');
    });
  }
  function show(text, retry) {
    if (!panel) { panel = document.createElement('div'); panel.id = 'lazyStatus'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(246,238,220,.96);color:#342c23;display:flex;align-items:center;justify-content:center;flex-direction:column;font:20px serif;gap:20px;text-align:center;padding:24px'; document.body.appendChild(panel); }
    panel.replaceChildren(); panel.setAttribute('aria-label', text); var t = document.createElement('div'); t.textContent = text; panel.appendChild(t);
    if (!retry) {
      var bar = document.createElement('progress'); bar.max = panelJob ? panelJob.ids.length : 1; bar.value = 0;
      bar.setAttribute('aria-label', '素材准备进度');
      bar.style.cssText = 'width:min(360px,80vw);height:8px;accent-color:#a83b2c'; panel.appendChild(bar);
      var detail = document.createElement('div'); detail.dataset.loadDetail = ''; detail.style.cssText = 'font-size:16px;color:#70624f'; panel.appendChild(detail);
      var hint = document.createElement('div'); hint.textContent = '只准备本次需要的完整图册。取消后已完成的部分会保留。';
      hint.style.cssText = 'font-size:14px;max-width:360px;line-height:1.6;color:#80725e'; panel.appendChild(hint); progress();
    }
    if (retry) { var b = document.createElement('button'); b.textContent = '重新载入'; b.style.cssText = 'min-width:100px;min-height:44px;background:#953b2b;color:#fff5df;border:0;font:20px serif'; b.onclick = retry; panel.appendChild(b); b.focus(); }
    var back = document.createElement('button');
    back.textContent = panelJob && panelJob.owner ? '取消本次召唤' : (window.__xy && window.__xy.app.screen === 'levels' ? '返回选关' : '暂不进入');
    back.style.cssText = 'min-width:100px;min-height:44px;background:transparent;color:#70624f;border:1px solid #b7aa90;font:18px serif';
    back.onclick = L.cancel; panel.appendChild(back);
    if (!retry) back.focus();

  }
  function enter(ids, next, options) {
    options = options || {};
    if (!L.on) { next(); return; }
    if (panelJob) L.cancel();
    var job = panelJob = { token: ++enterToken, ids: [], owner: options.owner, cancel: options.cancel };
    function current() { return panelJob === job && job.token === enterToken; }
    function run() {
      if (!current()) return;
      try { job.ids = required(typeof ids === 'function' ? ids() : ids); } catch (error) { failed(error); return; }
      show(options.title || '正在准备关卡素材');
      L.prepareGroups(job.ids).then(function () {
        if (!current()) return;
        panelJob = null; if (panel) { panel.remove(); panel = null; }
        next();
      }, failed);
    }
    function failed(error) {
      if (!current()) return;
      show((options.owner ? '召唤素材' : '关卡素材') + '载入失败，未消耗召唤或开局资源。已完成的部分会保留。', run);
    }
    run();
  }
  L.groupsReady = function (ids) { if (!L.on) return true; try { return readyGroups(required(ids)); } catch (error) { return false; } };
  L.enterGroups = function (ids, next, options) { enter(ids, next, options); };
  L.enter = function (next) { enter(L.chunks.map(function (c) { return c.id; }), next); };
  L.enterBattle = function (context, next) {
    enter(function () { return L.battleGroups(context); }, next, { title: '正在准备关卡素材' });
  };
  L.enterSpecial = function (id, next, owner, cancel) {
    enter(function () { return L.specialGroups(id); }, next, { title: '正在准备召唤素材', owner: owner, cancel: cancel });
  };
  L.enterUI = function (next) {
    enter(['ui'], function () {
      next();
      // Core/current carry only. No all-catalog optional download on selection.
      L.prepareBattle(L.context()).catch(function () {});
    }, { title: '正在准备选关界面' });
  };
})();
