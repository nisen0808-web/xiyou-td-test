/* 局内狂野水墨待机 / 出招。图集进战斗后才取，菜单不下载。
 * 时间轴来自各角色 animation.json：cycle 循环，pingpong 往返（baked 的已经展开成 cycle），oneshot 播完停住。
 */
(function (root) {
  'use strict';
  function sum(ds) {
    var t = 0, i;
    for (i = 0; i < ds.length; i++) t += ds[i];
    return t;
  }
  function sequence(clip) {
    var d = clip.durationsMs, n = d.length, seq = [], i;
    if (clip.loopPolicy === 'pingpong' && !clip.baked && n > 1) {
      for (i = 0; i < n; i++) seq.push(i);
      for (i = n - 2; i > 0; i--) seq.push(i);
    } else {
      for (i = 0; i < n; i++) seq.push(i);
    }
    return seq;
  }
  /* tMs 处的帧。oneshot 超过总长则 done，停在最后一帧。 */
  function frameAt(clip, tMs) {
    var seq = sequence(clip), durs = clip.durationsMs, spans = [], total = 0, i, acc, t;
    for (i = 0; i < seq.length; i++) { spans.push(durs[seq[i]]); total += durs[seq[i]]; }
    if (!seq.length || total <= 0) return { index: 0, done: true, total: 0 };
    var oneshot = clip.loopPolicy === 'oneshot';
    if (oneshot && tMs >= total) return { index: seq[seq.length - 1], done: true, total: total };
    t = oneshot ? Math.max(0, tMs) : ((tMs % total) + total) % total;
    acc = 0;
    for (i = 0; i < seq.length; i++) {
      acc += spans[i];
      if (t < acc) return { index: seq[i], done: false, total: total };
    }
    return { index: seq[seq.length - 1], done: !!oneshot, total: total };
  }
  /* 出招是一次性的。没有出招包（币圈老司机）时 edge 不离开待机。播完回到待机。 */
  /* Boss 战姿势名 → 水墨片段。有水墨图的角色不再回退彩色厚涂：受击走 hit，出招走 attack，其余走待机。 */
  function poseClip(id, pose) {
    if (!pose) return null;
    var hit = pose === 'hit' || pose === 'hit_a' || pose === 'fly' || pose === 'ko' || pose === 'ko_a';
    var atk = pose === 'attack' || pose === 'ult' || pose === 'atk2' || pose === 'atk3' || pose.indexOf('atk') === 0 || pose.indexOf('attack') === 0 || pose === 'swing' || pose === 'swing_a' || pose === 'swing_b' || pose === 'smash' || pose === 'smash_a';
    if (id === 'niumo') {
      if (hit) return 'hit';
      if (atk) return 'attack';
      return 'idle';
    }
    if (hit) return 'hit';
    if (atk) return 'attack';
    return 'idle';
  }
  function step(state, dtMs, edge, attackClip) {
    if (!state) state = { mode: 'idle', t: 0 };
    if (edge && attackClip) return { mode: 'attack', t: 0 };
    if (state.mode === 'attack' && attackClip) {
      var total = sum(attackClip.durationsMs);
      var t = state.t + (dtMs || 0);
      if (t >= total) return { mode: 'idle', t: 0 };
      return { mode: 'attack', t: t };
    }
    return { mode: 'idle', t: (state.mode === 'idle' ? state.t : 0) + (dtMs || 0) };
  }
  var W = {
    base: 'assets/wild/',
    data: null,
    imgs: {},
    status: 'idle',
    promise: null,
    frameAt: frameAt,
    step: step,
    sum: sum,
    poseClip: poseClip,
    mergePending: mergePending,
    slots: { 'wujing/idle': 'replace', 'laosiji/attack': 'add' }
  };
  function ingest(data) {
    if (!data || !data.ids) throw new Error('wild manifest missing ids');
    W.data = data;
    return Object.keys(data.ids);
  }
  /* 稍后补包的替换口：pending.json 里的同名片段盖过 manifest。
   * 沙僧待机（wujing.idle）和币圈老司机出招（laosiji.attack）到了就写进 pending.json，不必改播放器。 */
  function mergePending(data, extra) {
    if (!data || !extra || !extra.ids) return data;
    Object.keys(extra.ids).forEach(function (id) {
      var row = extra.ids[id];
      if (!row || typeof row !== 'object') return;
      data.ids[id] = data.ids[id] || {};
      Object.keys(row).forEach(function (name) {
        if (name === 'note' || !row[name] || !row[name].file) return;
        data.ids[id][name] = row[name];
      });
    });
    return data;
  }
  W.ingest = ingest;
  W.knows = function (id) {
    return !!(W.data && W.data.ids && W.data.ids[id] && W.data.ids[id].idle);
  };
  W.clip = function (id, name) {
    var row = W.data && W.data.ids && W.data.ids[id];
    return row && row[name] ? row[name] : null;
  };
  W.ready = function (id, name) {
    var im = W.imgs[id + '/' + name];
    return !!(im && im.complete && im.naturalWidth > 0);
  };
  W.img = function (id, name) { return W.imgs[id + '/' + name] || null; };
  /* 大图集解码后拆成单帧。牛魔王待机一张就有五百多万像素，每帧再从整张图里裁会把帧率压下去。 */
  function bakeFrames(im, clip) {
    if (!clip || typeof document === 'undefined') return;
    // 只拆牛魔王这种单格就很大的图。角色图集格子小，拆成几十张画布会卡住进战斗。
    if (clip.cell[0] * clip.cell[1] < 100000) return;
    var frames = [], cw = clip.cell[0], ch = clip.cell[1], i, col, row, cnv;
    for (i = 0; i < clip.frameCount; i++) {
      cnv = document.createElement('canvas');
      cnv.width = cw; cnv.height = ch;
      col = i % clip.cols; row = (i / clip.cols) | 0;
      cnv.getContext('2d').drawImage(im, col * cw, row * ch, cw, ch, 0, 0, cw, ch);
      frames.push(cnv);
    }
    clip._frames = frames;
  }
  W.blit = function (c, clip, im, index, dx, dy, dw, dh) {
    var fr = clip._frames && clip._frames[index];
    if (fr) { c.drawImage(fr, dx, dy, dw, dh); return; }
    var cw = clip.cell[0], ch = clip.cell[1], col = index % clip.cols, row = (index / clip.cols) | 0;
    c.drawImage(im, col * cw, row * ch, cw, ch, dx, dy, dw, dh);
  };
  var BOSS_CLIPS = ['bossIdle', 'bossAttack', 'bossHit'];
  var NORMAL_CLIPS = ['idle', 'attack', 'hit'];
  var metadataWork = null, clipWork = {}, requested = {};
  W.metadataStatus = 'idle'; W.failures = {};
  function loadImg(url) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { if (im.naturalWidth > 0) resolve(im); else reject(new Error(url)); };
      im.onerror = function () { reject(new Error(url)); };
      im.src = url;
    });
  }
  // Timing metadata is shared by the colour atlases. It must not imply that
  // every grey wild image has been downloaded or is ready to draw.
  W.prepare = function (retry) {
    if (retry) {
      Object.keys(W.failures).forEach(function (key) { delete clipWork[key]; });
      W.failures = {}; requested = {};
    }
    if (W.data) return Promise.resolve(W);
    if (metadataWork) return metadataWork;
    W.metadataStatus = 'loading'; W.metadataError = '';
    metadataWork = Promise.resolve().then(function () {
      if (typeof fetch !== 'function') throw new Error('no metadata loader');
      return fetch(W.base + 'manifest.json');
    }).then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    }).then(function (data) {
      return fetch(W.base + 'pending.json').then(function (r) {
        if (!r.ok) return data;
        return r.json().then(function (extra) { return mergePending(data, extra); }, function () { return data; });
      }, function () { return data; });
    }).then(function (data) {
      ingest(data); W.metadataStatus = 'ready'; return W;
    }).catch(function (e) {
      W.metadataStatus = 'fail'; W.metadataError = String(e.message || e);
      metadataWork = null; throw e;
    });
    return metadataWork;
  };
  function loadClip(id, name) {
    var key = id + '/' + name, clip = W.clip(id, name);
    if (!clip || !clip.file) return Promise.resolve();
    if (W.ready(id, name)) return Promise.resolve();
    if (clipWork[key]) return clipWork[key];
    clipWork[key] = loadImg(W.base + clip.file).then(function (im) {
      bakeFrames(im, clip); W.imgs[key] = im; delete W.failures[key];
    }).catch(function (e) { W.failures[key] = String(e.message || e); throw e; });
    return clipWork[key];
  }
  // Explicit subsets share per-clip work with legacy/Boss loads. A failed clip
  // stays failed until an explicit new departure/retry, never once per frame.
  W.armIds = function (ids, names) {
    ids = (ids || []).slice(); names = (names || NORMAL_CLIPS).slice();
    return W.prepare().then(function () {
      var jobs = [];
      ids.forEach(function (id) { names.forEach(function (name) { jobs.push(loadClip(id, name)); }); });
      return Promise.all(jobs);
    }).then(function () { return W; });
  };
  W.request = function (id) {
    if (!id || requested[id]) return;
    requested[id] = true;
    W.armIds([id]).catch(function (e) { W.lastError = String(e.message || e); });
  };
  // Compatibility entry: callers that truly draw the wild set still get it.
  // Main campaigns use prepare() plus request(id) only for actual wild figures.
  W.arm = function () {
    if (W.promise) return W.promise;
    W.status = 'loading';
    W.promise = W.prepare(true).then(function () {
      return W.armIds(Object.keys(W.data.ids), NORMAL_CLIPS.concat(W.wantBoss ? BOSS_CLIPS : []));
    }).then(function () { W.status = 'ready'; return W; }, function (e) {
      W.status = 'fail'; W.promise = null; throw e;
    });
    return W.promise;
  };
  // The separate Boss iframe retains its complete normal + Boss pose assets,
  // even if a previous caller prepared only metadata or a subset of pictures.
  W.armBoss = function () {
    W.wantBoss = true;
    return W.arm().then(function () { return W.armIds(Object.keys(W.data.ids), BOSS_CLIPS); });
  };
  root.XY = root.XY || {};
  root.XY.wildAnim = W;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { frameAt: frameAt, step: step, sum: sum, poseClip: poseClip, mergePending: mergePending, ingest: ingest, api: W };
  }
})(typeof window !== 'undefined' ? window : globalThis);
