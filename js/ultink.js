/* ============================================================
 * ultink.js —— v0.8.0：九位特殊人物大招的「狂野水墨」画面（替换 ultscene 原来的矢量通用特效）
 *   · 主体 = AI 出图 → 切帧 → 烘焙的 8 帧水墨精灵（js/ult_ink_data.js，tools/ult_cut / ult_logos / ult_bake）：
 *     前摇 3 帧（0–2）→ 出招 2 帧（3–4）→ 收招 3 帧（5–7），一共约 2.8 秒（ULTINK.T），官方 logo 一律脚本合成，运行时不画任何 logo 文字。
 *   · 范围效果 = 程序画的泼墨：放射 / 扩散 / 收圈 / 横扫 / 拽拢的“笔触”+ 飞溅墨点 + 地面墨团，颜色用各人的点缀色；画面是 f(S.t) 的纯函数。
 *   · 图集没解码好 / ULTINK.on=false → sprite 不画（施法者照常显示 Q 版小人），范围笔触照画。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, PI = Math.PI, PI2 = PI * 2, cos = Math.cos, sin = Math.sin, abs = Math.abs, imgs = {};
  var U = XY.ULTINK = { on: true, T: 2.8, K: 1.5, XF: 0, drawn: 0, last: null, frames: {} };
  function cl(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function seg(t, a, b) { return cl((t - a) / (b - a), 0, 1); }
  function eo(x) { x = cl(x, 0, 1); return 1 - (1 - x) * (1 - x) * (1 - x); }
  function hash(i, k) { var s = sin(i * 127.1 + (k || 0) * 311.7 + 17.3) * 43758.5453; return s - Math.floor(s); }
  function N(n) { return Math.max(2, Math.round(n * (XY.ultscene ? XY.ultscene.Q : 1))); }
  var INK = '22,18,14';
  var waitRecords = null, waitPromise = null, retrySerial = 0;
  function requestURL(src, retry) {
    if (!retry || /^\s*(?:data|blob):/i.test(src)) return src;
    var at = src.indexOf('#'), base = at < 0 ? src : src.slice(0, at), tail = at < 0 ? '' : src.slice(at);
    return base + (base.indexOf('?') < 0 ? '?' : '&') + 'xy_ult_retry=' + Date.now().toString(36) + '-' + (++retrySerial) + tail;
  }
  function validAtlas(d) {
    return !!(d && typeof d.src === 'string' && d.src && d.w > 0 && d.h > 0 && Array.isArray(d.fr) && d.fr.length === 8 && d.fr.every(function (f) {
      return Array.isArray(f) && f.length >= 6 && f.every(Number.isFinite) && f[0] >= 0 && f[1] >= 0 && f[2] > 0 && f[3] > 0 && f[0] + f[2] <= d.w && f[1] + f[3] <= d.h;
    }));
  }
  function source(id, d, retry) {
    var e = { img: new Image(), d: d, src: d.src, state: 'pending', error: null }, resolve, reject, decoding = false;
    e.promise = new Promise(function (yes, no) { resolve = yes; reject = no; });
    // A background failure stays observable by prepare(), without an unhandled rejection.
    e.promise.catch(function () {});
    function finish(error) {
      if (e.state !== 'pending') return;
      clearTimeout(timer); e.img.onload = e.img.onerror = null;
      e.state = error ? 'error' : 'ready'; e.error = error || null;
      if (error) reject(error); else resolve(e);
    }
    function loaded() {
      if (e.state !== 'pending' || decoding) return;
      decoding = true;
      var decoded;
      try { decoded = e.img.decode ? e.img.decode() : Promise.resolve(); }
      catch (error) { finish(new Error('必杀图片解码失败：' + id)); return; }
      Promise.resolve(decoded).then(function () {
        finish(validAtlas(e.d) && e.img.complete && e.img.naturalWidth === e.d.w && e.img.naturalHeight === e.d.h ? null : new Error('必杀图片尺寸或帧数据无效：' + id));
      }, function () { finish(new Error('必杀图片解码失败：' + id)); });
    }
    var timer = setTimeout(function () { finish(new Error('必杀图片载入超时：' + id)); }, 15000);
    e.img.onload = loaded;
    e.img.onerror = function () { finish(new Error('必杀图片载入失败：' + id)); };
    try {
      if (typeof d.src !== 'string' || !d.src) throw new Error('empty source');
      e.img.src = requestURL(d.src, retry);
      if (e.img.complete && e.img.naturalWidth > 0) loaded();
    } catch (error) { finish(new Error('必杀图片载入失败：' + id)); }
    return e;
  }
  function entry(id, retry) {
    var d = XY.ULTINK_DATA && XY.ULTINK_DATA[id]; if (!d) return null;
    var e = imgs[id];
    if (!e || e.src !== d.src || (retry && e.state === 'error')) {
      e = imgs[id] = source(id, d, !!(retry && e && e.src === d.src && e.state === 'error'));
    }
    // Metadata-only replacement keeps the same decoded image. A changed source
    // gets a new record; late callbacks only settle their own retired record.
    e.d = d;
    return e;
  }
  function ent(id) {
    if (!U.on) return null;
    var e = entry(id, false);
    return e && e.state === 'ready' ? e : null;
  }
  // Canonical idle geometry is prepared by ordinary chibi rendering.
  // These scene fields are visual metadata; no gameplay state is changed.
  function overlapping(S, G) {
    if (S._inkOverlap) return true;
    G = G || (XY.ultscene && XY.ultscene.live);
    var list = G && G.us || [], same = [], i;
    for (i = 0; i < list.length; i++) {
      var q = list[i];
      if (q.h === S.h && q.def && q.t < q.def.dur) same.push(q);
    }
    if (same.length < 2) return false;
    // Existing scene ticks can overwrite h.ultInk. Keep the ordinary body for
    // these overlapping casts rather than draw two visual timelines together.
    for (i = 0; i < same.length; i++) same[i]._inkOverlap = true;
    return true;
  }
  function bodyReference(S, G) {
    var h = S && S.h;
    if (!h || h.down || h.dead || overlapping(S, G)) return null;
    G = G || (XY.ultscene && XY.ultscene.live);
    var b = h._ultNormalBody;
    var key = XY.chibi && XY.chibi.bodyFrameKey && XY.chibi.bodyFrameKey(G, h);
    if (!b || !key || b.frameKey !== key || !(b.height > 0) ||
        !isFinite(b.height) || !isFinite(b.footOffset)) return null;
    if (S._inkBodyRef) return S._inkBodyRef.normalFrameKey === key ? S._inkBodyRef : null;
    S._inkBodyRef = { height: b.height, normalFrameKey: key };
    return S._inkBodyRef;
  }
  function poseRect(d, i) {
    var f = d.fr[i], b = d.poseBounds && d.poseBounds[i];
    return b && b.length === 4 && b[2] > 0 && b[3] > 0 ? b : [0, 0, f[2], f[3]];
  }
  function castLayout(S, en) {
    var ref = bodyReference(S), d = en.d, h = S.h;
    if (!ref) return null;
    var bounds = poseRect(d, d.fr.length - 1);
    // One fixed scale for all authored poses. Canvas padding is not anatomy.
    return { k: ref.height / bounds[3] * castGrow(S, ref), x: h.x,
      foot: h.y + h._ultNormalBody.footOffset, reference: ref };
  }
  /* 放必杀时人物放大。0.8.8 是把人物放到 220 高（平时约 70），r58 改成全程和平时一样大，
   * 八帧出招姿势缩在原地，看起来像必杀动画没了。这里恢复到 U.CAST_H：
   * 开头 0.18 秒从平时大小长出来，结尾 0.3 秒缩回平时大小（没有跳变，脚始终踩在原地），出招那两帧再鼓一点。 */
  U.CAST_H = 220;
  function castGrow(S, ref) {
    var t = S.t || 0, big = U.CAST_H / ref.height;
    if (!(big > 1)) return 1;
    var m = Math.min(eo(seg(t, 0, 0.18)), 1 - seg(t, U.T - 0.3, U.T));
    var i = U.frameAt(t, S.def.hit), punch = (i.i === 3 || i.i === 4) ? 1 + 0.1 * sin(cl(i.since / 0.3, 0, 1) * PI) : 1;
    return (1 + (big - 1) * m) * punch;
  }
  U.has = function (id) { return !!ent(id); };
  // Keep the ordinary hero visible until the real animation atlas can be drawn.
  U.active = function (S, t) { return !S.visualOff && t >= 0 && t < U.T && !!ent(S.id) && !!bodyReference(S); };
  U.readyIds = function (ids) {
    return Array.isArray(ids) && ids.length > 0 && ids.every(function (id) {
      var d = XY.ULTINK_DATA && XY.ULTINK_DATA[id], e = imgs[id];
      return validAtlas(d) && e && e.src === d.src && e.state === 'ready' && e.img.naturalWidth === d.w && e.img.naturalHeight === d.h;
    });
  };
  U.prepareIds = function (ids, retry) {
    if (!Array.isArray(ids) || !ids.length || ids.some(function (id) { return !validAtlas(XY.ULTINK_DATA && XY.ULTINK_DATA[id]); })) return Promise.reject(new Error('必杀图集数据尚未载入或无效'));
    var records = ids.map(function (id) { return entry(id, !!retry); });
    return Promise.all(records.map(function (e) { return e.promise; })).then(function () {
      if (!U.readyIds(ids) || records.some(function (e, i) { return imgs[ids[i]] !== e; })) throw new Error('必杀图集在准备期间发生变化'); return U;
    });
  };
  U.waitForPendingIds = function (ids) { return Promise.all(ids.map(function (id) { var e = imgs[id]; return e ? e.promise.catch(function () {}) : Promise.resolve(); })); };
  U.ready = function () {
    var data = XY.ULTINK_DATA;
    return !!(data && Object.keys(data).length && Object.keys(data).every(function (id) {
      return U.readyIds([id]);
    }));
  };
  U.prepare = function (retry) {
    var data = XY.ULTINK_DATA, records = [];
    if (!data || !Object.keys(data).length) {
      var missing = Promise.reject(new Error('必杀图集数据尚未载入')); missing.catch(function () {}); return missing;
    }
    Object.keys(data).forEach(function (id) { records.push(entry(id, !!retry)); });
    if (!waitRecords || records.length !== waitRecords.length || records.some(function (e, i) { return e !== waitRecords[i]; })) {
      waitRecords = records;
      waitPromise = Promise.all(records.map(function (e) { return e.promise; })).then(function () {
        if (!U.ready()) throw new Error('必杀图集在准备期间发生变化');
        return U;
      });
      waitPromise.catch(function () {});
    }
    return waitPromise;
  };
  U.waitForPending = function () {
    return Promise.all(Object.keys(XY.ULTINK_DATA || {}).map(function (id) {
      return entry(id, false).promise.then(function () {}, function () {});
    }));
  };
  U.preload = function () { if (XY.ULTINK_DATA) U.prepare(false).catch(function () {}); };
  U.bounds = function (hit) {                          // 8 帧的起点（秒）：前摇 3 等分 [0, hit-0.1]，出招 2 帧，收招 3 等分到 T
    var w = (hit - 0.1) / 3, rs = hit + 0.5, rl = (U.T - rs) / 3;
    return [0, w, 2 * w, hit - 0.1, hit + 0.12, rs, rs + rl, rs + 2 * rl, U.T];
  };
  U.frameAt = function (t, hit) { var b = U.bounds(hit), i = 0; while (i < 7 && t >= b[i + 1]) i++; return { i: i, since: t - b[i], b: b }; };
  /* ---------- 精灵 ---------- */
  function one(c, en, i, alpha, x, foot, k) {
    var f = en.d.fr[i]; if (!f || alpha <= 0.003) return;
    c.globalAlpha = alpha; c.drawImage(en.img, f[0], f[1], f[2], f[3], x - f[4] * k, foot - f[5] * k, f[2] * k, f[3] * k);
  }
  var POR = {}, SOFT = {};
  var FIVE = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1 };
  function portrait(id) {
    var im = POR[id];
    if (!im) {
      im = POR[id] = new Image();
      im.src = FIVE[id] ? ('assets/art/menu-v5/fig_' + id + '.webp') : ('assets/art/bg/' + id + '.webp');
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  function plate(id, im) {
    var e = SOFT[id]; if (e && e.src === im) return e.cv;
    var w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    var rad = Math.hypot(w, h) * 0.62;
    var rg = g.createRadialGradient(w / 2, h * 0.45, rad * 0.25, w / 2, h * 0.48, rad);
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.62, 'rgba(0,0,0,1)'); rg.addColorStop(0.84, 'rgba(0,0,0,0.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    SOFT[id] = { src: im, cv: cv }; return cv;
  }
  // Stable cast bounds prevent the ordinary name from crossing the enlarged body.
  // This reads atlas rectangles; it does not advance a scene or mutate a hero.
  U.heroBounds = function (G, h) {
    if (!h || !h.ultInk || h.down || h.dead) return null;
    var scenes = G && G.us, S = null, i;
    for (i = (scenes || []).length - 1; i >= 0; i--) {
      if (scenes[i].h === h && scenes[i]._inkBodyRef && U.active(scenes[i], scenes[i].t)) { S = scenes[i]; break; }
    }
    if (!S || !bodyReference(S, G)) return null;
    var en = ent(S.id), layout = castLayout(S, en), k = layout.k, foot = layout.foot;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (i = 0; i < en.d.fr.length; i++) {
      var f = en.d.fr[i], b = poseRect(en.d, i);
      x0 = Math.min(x0, layout.x + (b[0] - f[4]) * k); y0 = Math.min(y0, foot + (b[1] - f[5]) * k);
      x1 = Math.max(x1, layout.x + (b[0] + b[2] - f[4]) * k); y1 = Math.max(y1, foot + (b[1] + b[3] - f[5]) * k);
    }
    return isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, originY: h.y, cast: true } : null;
  };
  U.portraitReady = function (id) { return !!portrait(id); };
  U.sprite = function (c, S, t) {
    if (!S.h || !S.h.ultInk || !S._inkBodyRef || !U.active(S, t)) return false;
    var en = ent(S.id); if (!en) return false;
    var h = S.h, fa = U.frameAt(t, S.def.hit), i = fa.i;
    var layout = castLayout(S, en); if (!layout) return false;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    // Clear authored-pose cuts, not invented in-between drawings. Repeated
    // slots also draw once, fully opaque; never fade the only visible body out.
    one(c, en, i, 1, layout.x, layout.foot, layout.k);
    c.restore(); c.globalAlpha = 1;
    U.drawn++; U.last = { id: S.id, frame: i, t: t }; U.frames[S.id + ':' + i] = 1;
    return true;
  };
  U.ground = function () { return; };
  U.air = function (c, S, t) {
    if (S.visualOff) return;
    U.sprite(c, S, t);
  };
  U.closeup = function () { return; };
  U.screen = function () { return; };
  if (XY.ULTINK_DATA) U.preload(); else setTimeout(function () { if (XY.ULTINK_DATA) U.preload(); }, 0);
})();

/* Candidate only: small world-space Phyrex seals from actual combat receipts.
 * No damage/targets/timers/inputs; appended after the existing ultink.js. */
(function () {
  'use strict';
  var XY = window.XY, serial = 0, coin = null;
  var F = XY.PHYREX_SEALFX = { on: true, asset: 'assets/art/item-icons/w_btc.png' };
  function alive(h) { return !!h && !h.dead && !h.down && h.hp > 0; }
  function enabled(S) { return F.on && XY.ULTINK && XY.ULTINK.on && S && S.id === 'phyrex' && !S.visualOff; }
  F.arm = function () { if (!coin) { coin = new Image(); coin.src = F.asset; } };
  F.ready = function (S) {
    if (!enabled(S) || !XY.INKP) return false;
    F.arm(); return !!(coin.complete && coin.naturalWidth > 0);
  };
  F.begin = function (G, S) {
    if (!S || S.id !== 'phyrex') return;
    S.seal = { id: ++serial, born: G.t, land: null, points: [], accepted: 0 };
    F.arm();
  };
  F.before = function (e) { return { hp: e.hp, shield: e.shield || 0, dead: !!e.dead, retreat: e.retreatT || 0, x: e.x, y: e.y }; };
  F.after = function (G, S, e, b, phase) {
    if (!S.seal || b.dead) return;
    if (!(e.hp < b.hp || (e.shield || 0) < b.shield || e.dead || (e.retreatT || 0) > b.retreat)) return;
    var z = S.seal, rank = e.def && (e.def.boss || e.def.denBoss) ? 3 : e.def && (e.def.elite || e.def.etower) ? 2 : 1;
    var p = { at: G.t, x: b.x, y: b.y, phase: phase, rank: rank }, count = 0, low = -1;
    z.accepted++;
    for (var i = 0; i < z.points.length; i++) if (z.points[i].phase === phase) {
      count++; if (low < 0 || z.points[i].rank < z.points[low].rank) low = i;
    }
    // At most 12 receipts per beat / 36 for this three-beat skill.
    if (count < 12) z.points.push(p);
    else if (low >= 0 && rank > z.points[low].rank) z.points[low] = p;
  };
  F.land = function (G, S, x, y) { if (S.seal) S.seal.land = { at: G.t, x: x, y: y }; };
  F.tag = function (G, S, from, phase) {
    if (!S.seal) return;
    for (var i = from; i < G.fx.length; i++) {
      var f = G.fx[i], type = f.type === 'an' ? f.kind : f.type;
      if (type === 'ring' || type === 'ripple') f.sealFx = { id: S.seal.id, phase: phase };
    }
  };
  F.hides = function (G, f) {
    var tag = f.sealFx, type = f.type === 'an' ? f.kind : f.type;
    if (!tag || (type !== 'ring' && type !== 'ripple')) return false;
    var scenes = G.us || [];
    for (var i = 0; i < scenes.length; i++) {
      var S = scenes[i], z = S.seal;
      if (!z || z.id !== tag.id || S.t >= S.def.dur || !F.ready(S)) continue;
      // Once its replacement was painted, do not pop the old longer-lived ring
      // back into view after the short seal has faded. Missing art falls back.
      if (tag.phase === 'charge') return !!z.chargePainted;
      if (tag.phase === 'land') return !!z.landPainted;
    }
    return false;
  };
  function clip(c, G) {
    var v = G.view, x = G.cam.x - v.w / 2, y = G.cam.y - v.h / 2;
    c.beginPath(); c.rect(x, y, v.w, v.h); c.clip();
    var hud = XY.ui && XY.ui.hud || [], pad = 3 + Math.max(0, G.shake || 0) / 2;
    // Successive intersections avoid reopening overlapping HUD exclusions.
    for (var i = 0; i < hud.length; i++) {
      var p = hud[i]; if (!(p.w > 0 && p.h > 0)) continue;
      c.beginPath(); c.rect(x, y, v.w, v.h); c.rect(x + p.x - pad, y + p.y - pad, p.w + pad * 2, p.h + pad * 2); c.clip('evenodd');
    }
  }
  function stamp(c, x, y, age, major, rank) {
    var life = major ? 0.48 : 0.34;
    if (age < 0 || age >= life) return;
    var k = age / life, a = (1 - k) * Math.min(1, 0.35 + age * 30), r = major ? 45 + 10 * k : (rank === 3 ? 24 : 17) + 4 * k;
    var P = XY.INKP, gold = '176,127,42', seed = major ? 37 : 61;
    P.ring(c, x, y + 8, r, major ? 3 : 1.7, P.INK, a * 0.48, seed, 3, 0.52, 0);
    P.cstroke(c, x - r * 0.8, y + 9, x + r, y + 2, major ? 4 : 2, gold, a * 0.65, seed + 3, 0.08);
    var w = major ? 68 : (rank === 3 ? 32 : 23), h = w * coin.naturalHeight / coin.naturalWidth;
    c.save(); c.globalAlpha = a * (major ? 0.72 : 0.82); c.translate(x, y + 5); c.scale(1, 0.64);
    c.drawImage(coin, -w / 2, -h / 2, w, h); c.restore();
  }
  F.draw = function (c, S, G) {
    var z = S.seal; if (!z || !F.ready(S)) return;
    c.save(); clip(c, G);
    if (!z.land && S.t < S.def.hit && alive(S.h)) {
      // Preparation only: no BTC impact or target mark before accepted land.
      var P = XY.INKP, q = Math.max(0, Math.min(1, S.t / S.def.hit)), r = 16 + 15 * q;
      P.cstroke(c, S.x - r, S.y + 10, S.x - 3, S.y + 3, 2, '176,127,42', 0.22 * q, 11, 0.12);
      P.cstroke(c, S.x + r, S.y + 3, S.x + 3, S.y + 10, 2, '176,127,42', 0.22 * q, 13, 0.12);
      if (q > 0) z.chargePainted = true;
    }
    // A land seal means the cast landed; it is not evidence that a foe took damage.
    if (z.land) {
      var landAge = G.t - z.land.at;
      stamp(c, z.land.x, z.land.y, landAge, true, 0);
      if (landAge >= 0 && landAge < 0.48) z.landPainted = true;
    }
    var budget = Math.max(4, Math.round(12 * ((XY.ultscene && XY.ultscene.Q) || 1))), used = 0;
    for (var rank = 3; rank >= 1 && used < budget; rank--) for (var i = z.points.length - 1; i >= 0 && used < budget; i--) {
      var p = z.points[i], age = G.t - p.at;
      if (p.rank !== rank || age < 0 || age >= 0.34) continue;
      stamp(c, p.x, p.y, age, false, rank); used++;
    }
    c.restore();
  };
  var ground = XY.ULTINK.ground;
  XY.ULTINK.ground = function (c, S, t, G) { ground(c, S, t, G); F.draw(c, S, G); };
})();

/* Sisi ultimate only: a sparse jade/gold ink ward beneath actors and labels.
 * Visual scene metadata only. No damage, shield amount, heal, clock or input. */
(function () {
  'use strict';
  var XY = window.XY, F = XY.SISI_SHIELDFX = { on: true };
  function alive(h) { return !!h && !h.dead && !h.down && h.hp > 0; }
  F.enabled = function (S) {
    return !!(F.on && XY.ULTINK && XY.ULTINK.on && XY.INKP && S &&
      S.id === 'sisi' && !S.visualOff && alive(S.h));
  };
  function owner(G, S) {
    var list = G.us || [], latest = null;
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      if (q.h === S.h && q.id === 'sisi' && q.def && q.t < q.def.dur) latest = q;
    }
    return latest === S;
  }
  function choice(S, G) {
    // A fallback chosen at cast time cannot later add a ward over that same
    // cast's already-visible legacy glyph/lotus. No asynchronously loaded art
    // is needed for the ward; only the existing ink primitives are required.
    if (!S.sisiShield) S.sisiShield = { born: G.t, mode: F.enabled(S) ? 'ward' : 'fallback' };
    return S.sisiShield.mode === 'ward';
  }
  F.begin = function (G, h) {
    if (!h || h.id !== 'sisi') return false;
    var scenes = G.us || [];
    for (var i = scenes.length - 1; i >= 0; i--) {
      var S = scenes[i];
      if (S.h === h && S.id === 'sisi' && S.t < S.def.dur) {
        return choice(S, G) && owner(G, S);
      }
    }
    return false;
  };
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  // Deliberately discontinuous, tapered brush marks form curved shoulders and
  // a pointed lower ward. An empty centre preserves the full-body silhouette.
  F.draw = function (c, S, G) {
    // The scene itself owns this ward, including guest summons whose path
    // starts specialUlt directly and never passes through vfx.cast.
    if (!S || S.id !== 'sisi' || !owner(G, S) || !choice(S, G) ||
        !F.enabled(S) || S.t < 0 || S.t >= 2.2) return;
    var h = S.h, normal = h._ultNormalBody;
    var height = Math.max(44, Math.min(98, normal && normal.height || h.def.r * 3.4));
    var foot = h.y + (normal && isFinite(normal.footOffset) ? normal.footOffset : h.def.r * 0.85);
    var q = clamp(S.t / S.def.hit), fade = 1 - clamp((S.t - 1.5) / 0.7);
    var a = Math.min(1, S.t / 0.15) * fade, w = height * (0.46 + 0.1 * q);
    var x = h.x, top = foot - height * 0.92, bottom = foot + height * 0.08;
    var P = XY.INKP, jade = '57,116,92', gold = '176,139,65';
    c.save();
    // Faint washes stay on the outer edge, not over the chest or name.
    for (var side = -1; side <= 1; side += 2) {
      P.blot(c, x + side * w * 0.91, top + height * 0.32, 10, jade, a * 0.055, side + 71, 0, 1.4);
      P.cstroke(c, x + side * w * 0.12, top + 3, x + side * w * 0.89, top + height * 0.13, 3.2, jade, a * 0.72, side + 41, side * 0.16);
      P.cstroke(c, x + side * w, top + height * 0.2, x + side * w * 0.83, top + height * 0.59, 3.8, jade, a * 0.83, side + 53, side * 0.12);
      P.cstroke(c, x + side * w * 0.74, top + height * 0.65, x + side * w * 0.08, bottom, 3.1, jade, a * 0.77, side + 63, side * 0.1);
      P.stroke(c, x + side * w * 0.91, top + height * 0.25, x + side * w * 0.78, top + height * 0.52, 1.1, gold, a * 0.86, side + 89, side * 0.1);
    }
    // A short outward flick at the existing land time conveys the shield
    // opening. This reads S.t; it neither creates nor moves a gameplay beat.
    var land = (S.t - S.def.hit) / 0.34;
    if (land >= 0 && land < 1) for (var j = 0; j < 4; j++) {
      var s = j < 2 ? -1 : 1, oy = (j % 2 ? 0.58 : 0.28) * height;
      P.stroke(c, x + s * w, top + oy, x + s * (w + 12 + 9 * land), top + oy - 6,
        1.8, gold, (1 - land) * a * 0.7, j + 101, s * 0.08);
    }
    c.restore();
  };
  var ground = XY.ULTINK.ground;
  XY.ULTINK.ground = function (c, S, t, G) { ground(c, S, t, G); F.draw(c, S, G); };
})();

/* Phyrex startup ownership only. Existing ground preparation/accepted-hit
 * seals replace this cast's legacy glyph/fire; no combat changes. */
(function () {
  'use strict';
  var XY = window.XY, F = XY.PHYREX_SEALFX;
  if (!F) return;
  var ready = F.ready, begin = F.begin;
  var C = XY.PHYREX_STARTUPFX = {};
  function alive(S) { return !!(S && S.h && !S.h.dead && !S.h.down && S.h.hp > 0); }
  function latest(G, h) {
    var list = G.us || [];
    for (var i = list.length - 1; i >= 0; i--) {
      var S = list[i];
      if (S.id === 'phyrex' && S.h === h && S.def && S.t < S.def.dur) return S;
    }
    return null;
  }
  F.begin = function (G, S) {
    begin(G, S);
    if (!S || S.id !== 'phyrex' || !S.seal) return;
    // Decide once before any startup is generated. A late image/INKP/on change
    // cannot add new ground seals to a cast already using visible legacy FX.
    S.seal.startupMode = latest(G, S.h) === S && alive(S) && ready(S) ? 'seal' : 'fallback';
  };
  F.ready = function (S) {
    if (!S || !S.seal || S.seal.startupMode === undefined) return ready(S);
    return !!(S.seal.startupMode === 'seal' && alive(S) && ready(S));
  };
  C.takeover = function (G, h) {
    var S = latest(G, h);
    if (!S || !S.seal) return false;
    if (S.seal.startupMode === undefined) S.seal.startupMode = alive(S) && ready(S) ? 'seal' : 'fallback';
    if (F.ready(S)) return true;
    // Also lock a loss of readiness between begin and V.cast, so restoring it
    // later cannot overlap the legacy fallback generated by this call.
    S.seal.startupMode = 'fallback';
    return false;
  };
  // Start the existing small coin request during module load, not first cast.
  // Readiness is still checked and latched at the real scene's F.begin.
  F.arm();
})();

/* Sisi's exact clearArea scene only: sparse ground wash at the real sweep front.
 * No targets, damage, shields, heals, queues, RNG or clocks are changed. */
(function () {
  'use strict';
  var XY = window.XY, serial = 0, F = XY.SISI_SWEEPFX = { on: true };
  function enabled(S) {
    return !!(F.on && XY.ULTINK && XY.ULTINK.on && XY.INKP &&
      S && S.id === 'sisi' && S.h && S.h.id === 'sisi' && !S.visualOff &&
      !S.h.dead && !S.h.down && S.h.hp > 0);
  }
  function owner(G, S) {
    var list = G.us || [], latest = null;
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      if (q.h === S.h && q.id === 'sisi' && q.def && q.t < q.def.dur) latest = q;
    }
    return latest === S;
  }
  F.begin = function (G, S) {
    if (!S || S.id !== 'sisi' || !S.h || S.h.id !== 'sisi' || S.sisiSweep) return;
    S.sisiSweep = { id: ++serial, mode: enabled(S) && owner(G, S) ? 'ink' : 'legacy', land: null, painted: false };
  };
  F.land = function (G, S, x, y, R, radius, duration) {
    var z = S && S.sisiSweep;
    if (!z || z.land || !(radius > 0) || !(duration > 0)) return;
    // The same rectangle, centre and radius used by the original hit queue.
    z.land = { at: G.t, sceneAt: S.t, x: x, y: y, R: { x0: R.x0, y0: R.y0, x1: R.x1, y1: R.y1 }, radius: radius, duration: duration };
  };
  F.tag = function (G, S, from) {
    var z = S && S.sisiSweep; if (!z || !z.land) return;
    for (var i = from; i < G.fx.length; i++) {
      var f = G.fx[i], type = f.type === 'an' ? f.kind : f.type;
      if (type === 'ring' || type === 'ripple') f.sisiSweepFx = z.id;
    }
  };
  F.hides = function (G, f) {
    var type = f.type === 'an' ? f.kind : f.type;
    if (!f.sisiSweepFx || (type !== 'ring' && type !== 'ripple')) return false;
    var list = G.us || [];
    for (var i = 0; i < list.length; i++) {
      var S = list[i], z = S.sisiSweep;
      if (z && z.id === f.sisiSweepFx && z.mode === 'ink') return !!(z.painted || z.cancelled);
    }
    return false;
  };
  F.draw = function (c, S, G) {
    var z = S && S.sisiSweep;
    if (!z || z.mode !== 'ink' || !z.land || z.cancelled) return;
    // A dead or superseded owned presentation is cancelled, not replaced by
    // the older giant rings. Cold/disabled first-use remains latched legacy.
    if (!owner(G, S) || S.visualOff || S.h.dead || S.h.down || S.h.hp <= 0) { z.cancelled = true; return; }
    if (!enabled(S)) { if (!z.painted) z.mode = 'legacy'; return; }
    var L = z.land, age = S.t - L.sceneAt;
    if (age < 0 || age > L.duration + 0.16) return;
    var q = Math.min(1, age / L.duration), fade = Math.max(0, 1 - Math.max(0, age - L.duration) / 0.16);
    var r = L.radius * q, P = XY.INKP, jade = '57,116,92', gold = '176,139,65';
    var Q = Math.max(0.35, Math.min(1, XY.ultscene && XY.ultscene.Q || 1));
    var count = Math.round(16 * Q), drawn = 0;
    c.save(); c.beginPath(); c.rect(L.R.x0, L.R.y0, L.R.x1 - L.R.x0, L.R.y1 - L.R.y0); c.clip();
    // No connected arc or filled disk: unequal short dry-brush flecks leave
    // most of the front empty. Front speed is radius / original ringT.
    for (var i = 0; i < count; i++) {
      var a = (i + P.hash(i, 83) * 0.45) / count * Math.PI * 2;
      var ca = Math.cos(a), sa = Math.sin(a), x = L.x + ca * r, y = L.y + sa * r;
      if (x < L.R.x0 - 25 || x > L.R.x1 + 25 || y < L.R.y0 - 25 || y > L.R.y1 + 25) continue;
      var len = 16 + 18 * P.hash(i, 97), alpha = fade * (0.23 + 0.08 * P.hash(i, 101));
      P.stroke(c, x, y, x - ca * len - sa * 5, y - sa * len + ca * 5,
        2.4 + 1.1 * P.hash(i, 109), jade, alpha, i + 131, 0.12);
      if (i % 3 === 0) P.stroke(c, x - ca * 5, y - sa * 5, x - ca * 11 - sa * 3,
        y - sa * 11 + ca * 3, 1.1, gold, alpha * 1.15, i + 151, -0.08);
      drawn++;
    }
    // A small opening wash makes the exact landing frame visible even at r=0.
    if (age < 0.12) {
      var a0 = (1 - age / 0.12) * 0.2;
      P.stroke(c, L.x - 13, L.y + 8, L.x - 2, L.y + 3, 2, jade, a0, 181, 0.15);
      P.stroke(c, L.x + 13, L.y + 3, L.x + 2, L.y + 8, 1.4, gold, a0, 183, -0.15);
      drawn++;
    }
    c.restore();
    if (drawn) z.painted = true;
  };
  var ground = XY.ULTINK.ground;
  XY.ULTINK.ground = function (c, S, t, G) { ground(c, S, t, G); F.draw(c, S, G); };
})();

/* Seven special ultimates only: small ground brush marks replace this cast's
 * legacy startup glyph + 190px skill picture. Combat and particle paths stay. */
(function () {
  'use strict';
  var XY = window.XY, U = XY.ULTINK;
  if (!U) return;
  var F = XY.SPECIAL_STARTUPFX = { on: true }, states = new WeakMap();
  var ids = { laosiji: 1, kuanggong: 1, haiteng: 1, diaoyulao: 1, yuanzhang: 1, heyuxi: 1, martin: 1 };
  function latest(G, h) {
    var list = G && G.us || [];
    for (var i = list.length - 1; i >= 0; i--) {
      var S = list[i];
      if (S.h === h && S.def && S.t >= 0 && S.t < S.def.dur) return S;
    }
    return null;
  }
  function alive(S) { return !!(S.h && !S.h.dead && !S.h.down && S.h.hp > 0); }
  function eligible(S) { return !!(S && ids[S.id] && S.h && S.h.id === S.id && S.def && !S.def.mainHero); }
  function ready(G, S) {
    if (!F.on || !U.on || !XY.INKP || typeof XY.INKP.cstroke !== 'function' ||
        !eligible(S) || !alive(S) || S.visualOff || S._inkOverlap || latest(G, S.h) !== S) return false;
    var b = S.h._ultNormalBody, ref = S._inkBodyRef;
    var key = XY.chibi && XY.chibi.bodyFrameKey && XY.chibi.bodyFrameKey(G, S.h);
    return !!(b && ref && key && b.frameKey === key && ref.normalFrameKey === key &&
      b.height > 0 && isFinite(b.height) && isFinite(b.footOffset) && U.has(S.id));
  }
  function choose(G, S) {
    var z = states.get(S);
    if (!z) {
      z = { G: G, mode: ready(G, S) ? 'owned' : 'fallback', closed: false };
      states.set(S, z);
    }
    return z;
  }
  function viewing(G) {
    return G && G.mode === 'play' && (!XY.app || XY.app.screen === 'play') &&
      (!XY.ultscene || !XY.ultscene.live || XY.ultscene.live === G);
  }
  F.takeover = function (G, h) {
    var S = latest(G, h);
    // A delayed/unrelated V.cast must not claim an older scene's startup.
    if (!eligible(S) || S.t !== 0) return false;
    var z = choose(G, S);
    if (z.G === G && !z.closed && z.mode === 'owned' && viewing(G) && ready(G, S)) return true;
    z.mode = 'fallback';
    return false;
  };
  F.mode = function (S) { var z = states.get(S); return z ? (z.closed ? 'closed' : z.mode) : null; };
  F.draw = function (c, S, G) {
    if (!eligible(S)) return;
    var z = states.get(S);
    if (z && (z.G !== G || latest(G, S.h) !== S || !alive(S) || S.visualOff)) z.closed = true;
    if (!viewing(G) || latest(G, S.h) !== S || S.t < 0 || S.t >= 1.1) return;
    // Guest summons can start specialUlt directly without ever calling V.cast.
    z = z || choose(G, S);
    if (z.closed || z.mode !== 'owned') return;
    if (!ready(G, S)) { z.closed = true; return; }
    var h = S.h, b = h._ultNormalBody, P = XY.INKP;
    var q = Math.max(0, Math.min(1, S.t / 0.25));
    var a = Math.min(1, S.t / 0.12) * Math.max(0, Math.min(1, (1.1 - S.t) / 0.45));
    var r = Math.max(28, Math.min(60, b.height * 0.5)) * (0.78 + 0.22 * q);
    var x = h.x, y = h.y + b.footOffset + 4, ry = r * 0.32;
    var acc = /^\d+,\d+,\d+$/.test(S.def.acc || '') ? S.def.acc : P.INK;
    c.save();
    // Four separated, tapered strokes. Empty centre; no ring, fill or glyph.
    P.cstroke(c, x - r, y + ry * 0.6, x - r * 0.55, y - ry, 2.6, acc, a * 0.74, 211, 0.1);
    P.cstroke(c, x - r * 0.65, y - ry, x - r * 0.25, y - ry * 0.6, 1.8, acc, a * 0.58, 223, -0.1);
    P.cstroke(c, x + r, y - ry * 0.6, x + r * 0.55, y + ry, 2.6, acc, a * 0.74, 227, 0.1);
    P.cstroke(c, x + r * 0.65, y + ry, x + r * 0.25, y + ry * 0.6, 1.8, acc, a * 0.58, 229, -0.1);
    c.restore();
  };
  var ground = U.ground;
  U.ground = function (c, S, t, G) { ground(c, S, t, G); F.draw(c, S, G); };
})();

/* Seven exact special-ultimate land receipts. These marks describe a cast and
 * its scheduling front, never accepted damage. All ownership is private. */
(function () {
  'use strict';
  var XY = window.XY, U = XY.ULTINK;
  if (!U) return;
  var F = XY.SPECIAL_LANDFX = { on: true }, states = new WeakMap(), effects = new WeakMap(), serial = 0;
  var profiles = {
    laosiji: { shape: 'screen', color: '157,71,38', style: 1 },
    kuanggong: { shape: 'screen', color: '156,113,42', style: 2 },
    haiteng: { shape: 'inward', color: '164,113,45', style: 3 },
    diaoyulao: { shape: 'pull', color: '54,108,128', style: 4 },
    yuanzhang: { shape: 'sweep', color: '45,113,106', style: 5 },
    heyuxi: { shape: 'waves', color: '162,71,91', style: 6 },
    martin: { shape: 'sweep', color: '162,116,48', style: 7 }
  };
  function eligible(S) { return !!(S && profiles[S.id] && S.h && S.h.id === S.id && S.def && !S.def.mainHero); }
  function latest(G, h) {
    var list = G && G.us || [];
    for (var i = list.length - 1; i >= 0; i--) {
      var S = list[i]; if (S.h === h && S.def && S.t >= 0 && S.t < S.def.dur) return S;
    }
    return null;
  }
  function alive(S) { return !!(S.h && !S.h.dead && !S.h.down && S.h.hp > 0); }
  function viewing(G) {
    return G && G.mode === 'play' && (!XY.app || XY.app.screen === 'play') &&
      (!XY.ultscene || !XY.ultscene.live || XY.ultscene.live === G);
  }
  function ready(G, S) {
    var P = XY.INKP;
    if (!F.on || !U.on || !P || typeof P.stroke !== 'function' || typeof P.hash !== 'function' ||
        !eligible(S) || !alive(S) || S.visualOff || S._inkOverlap || latest(G, S.h) !== S) return false;
    var b = S.h._ultNormalBody, ref = S._inkBodyRef;
    var key = XY.chibi && XY.chibi.bodyFrameKey && XY.chibi.bodyFrameKey(G, S.h);
    return !!(b && ref && key && b.frameKey === key && ref.normalFrameKey === key &&
      b.height > 0 && isFinite(b.height) && isFinite(b.footOffset) && U.has(S.id));
  }
  function settle(G, S, z) {
    if (!z || z.G !== G || z.mode !== 'owned' || z.closed) return;
    if (!alive(S) || S.visualOff || latest(G, S.h) !== S) { z.closed = true; z.reason = 'cancelled'; return; }
    if (!ready(G, S)) {
      if (z.painted) { z.closed = true; z.reason = 'unavailable-after-paint'; }
      else { z.mode = 'fallback'; z.reason = 'unavailable-before-paint'; }
    }
  }
  F.accepts = eligible;
  F.begin = function (G, S) {
    if (!eligible(S) || states.has(S)) return;
    states.set(S, { G: G, S: S, id: ++serial, mode: viewing(G) && ready(G, S) ? 'owned' : 'fallback',
      painted: false, closed: false, reason: null, land: null, tags: [], pulses: [], lastPaint: null });
  };
  F.land = function (G, S, x, y, R, radius, shape, ringT) {
    var z = S && states.get(S);
    if (!z || z.G !== G || z.land || z.mode !== 'owned') return;
    if (profiles[S.id].shape !== shape || !isFinite(x) || !isFinite(y) || !(radius > 0) ||
        !(R.x1 > R.x0) || !(R.y1 > R.y0) || !isFinite(radius) || !(ringT > 0) || !isFinite(ringT)) {
      z.mode = 'fallback'; z.reason = 'invalid-land'; return;
    }
    var duration = shape === 'inward' || shape === 'sweep' ? ringT : (shape === 'waves' ? 0.2 : (shape === 'pull' ? 0.38 : 0));
    z.land = { at: G.t, sceneAt: S.t, x: x, y: y, R: { x0: R.x0, y0: R.y0, x1: R.x1, y1: R.y1 },
      radius: radius, shape: shape, ringT: ringT, duration: duration };
    z.pulses.push({ at: G.t, sceneAt: S.t, kind: 'land' });
  };
  F.pulse = function (G, S, kind) {
    var z = S && states.get(S);
    if (z && z.G === G && z.mode === 'owned' && z.land && (kind === 'wave2' || kind === 'pull')) z.pulses.push({ at: G.t, sceneAt: S.t, kind: kind });
  };
  F.tag = function (G, S, from, phase) {
    var z = S && states.get(S);
    if (!z || z.G !== G || !z.land || z.mode !== 'owned') return;
    // The caller brackets one exact visual emitter, never damage/onLand as a whole.
    for (var i = from; i < G.fx.length; i++) {
      var f = G.fx[i], type = f.type === 'an' ? f.kind : f.type;
      if (type !== 'ring' && type !== 'ripple' && type !== 'sweep') continue;
      if (effects.has(f)) continue;
      effects.set(f, { z: z, phase: phase }); z.tags.push({ type: type, phase: phase });
    }
  };
  F.hides = function (G, f) {
    var e = f && effects.get(f); if (!e || e.z.G !== G) return false;
    var z = e.z; settle(G, z.S, z);
    // Cancellation may precede first paint. It must not resurrect old giant FX.
    return z.mode === 'owned' && !!(z.painted || z.closed);
  };
  F.inspect = function (G, S) {
    var z = S && states.get(S); if (!z || z.G !== G) return null;
    // Fresh scalar copies for observation; callers cannot mutate ownership.
    return JSON.parse(JSON.stringify({ id: z.id, mode: z.mode, painted: z.painted, closed: z.closed, reason: z.reason,
      land: z.land, tags: z.tags, pulses: z.pulses, lastPaint: z.lastPaint }));
  };
  F.effect = function (G, f) {
    var e = f && effects.get(f); return e && e.z.G === G ? { id: e.z.id, phase: e.phase } : null;
  };
  F.draw = function (c, S, G) {
    var z = S && states.get(S);
    if (!z || z.G !== G || !z.land || z.mode !== 'owned') return;
    settle(G, S, z);
    if (z.closed || z.mode !== 'owned' || !viewing(G)) return;
    // Native spsupGlobal decrements newly queued jobs in the landing step,
    // then advances S.t. This phase matches that queue, including variable dt.
    var L = z.land, age = S.t - L.sceneAt, life = Math.max(0.26, L.duration + 0.16);
    if (age < 0 || age >= life) return;
    var P = XY.INKP, p = profiles[S.id], R = L.R, count = 0;
    var fade = Math.min(1, (life - age) / 0.16), progress = L.duration ? Math.min(1, age / L.duration) : 1;
    var Q = Math.max(0.35, Math.min(1, XY.ultscene && XY.ultscene.Q || 1)), front = null;
    function stroke(x0, y0, x1, y1, w, a, seed) {
      if (!(a > 0) || Math.max(x0, x1) < R.x0 || Math.min(x0, x1) > R.x1 ||
          Math.max(y0, y1) < R.y0 || Math.min(y0, y1) > R.y1) return;
      P.stroke(c, x0, y0, x1, y1, w, p.color, a, seed, 0.1); count++;
    }
    c.save(); c.beginPath(); c.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); c.clip();
    // A landing cue is not a damage stamp, even in an empty field. Four short
    // strokes leave the centre clear and never form a range ring.
    var pulseAge = age;
    if (L.shape === 'waves' || L.shape === 'pull') {
      for (var j = z.pulses.length - 1; j >= 0; j--) if (S.t >= z.pulses[j].sceneAt) { pulseAge = S.t - z.pulses[j].sceneAt; break; }
    }
    var a = Math.max(0, 1 - pulseAge / 0.18) * 0.30 * fade, r = 22 + Math.min(1, pulseAge / 0.18) * 14;
    if (L.shape === 'pull') r = 36 - Math.min(1, pulseAge / 0.18) * 14;
    var slope = p.style === 6 ? 2 : (p.style === 2 ? 10 : 5);
    for (var k = 0; k < 4; k++) {
      var side = k % 2 ? 1 : -1, row = k < 2 ? -1 : 1;
      stroke(L.x + side * r, L.y + row * 8, L.x + side * (r - 12), L.y + row * (8 + slope), p.style === 2 ? 2.8 : 1.8, a, 301 + k + p.style * 11);
    }
    if (L.shape === 'inward') {
      var rr = L.radius * (1 - progress), n = Math.round(16 * Q); front = { radius: rr };
      for (var i = 0; i < n; i++) {
        var ang = (i + 0.17) / n * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang), x = L.x + ca * rr, y = L.y + sa * rr;
        stroke(x, y, x + ca * 16 - sa * 3, y + sa * 16 + ca * 3, 2.0, fade * 0.28, 401 + i);
      }
    } else if (L.shape === 'sweep') {
      var sx = R.x0 + (R.x1 - R.x0) * progress, ns = Math.round(10 * Q); front = { x: sx, y0: R.y0, y1: R.y1 };
      for (var s = 0; s < ns; s++) {
        var sy = R.y0 + (s + 0.35) / ns * (R.y1 - R.y0), len = 12 + P.hash(s, 61) * 10;
        stroke(sx, sy, sx - (p.style === 5 ? 7 : 3), Math.min(R.y1, sy + len), 2.2, fade * 0.27, 501 + s);
      }
    }
    // When both the actual front and caster lie outside R, two tiny corner
    // ticks acknowledge the viewport-wide cast without inventing hits.
    if (!count && !z.painted) {
      stroke(R.x0 + 10, R.y0 + 12, R.x0 + 22, R.y0 + 9, 1.5, fade * 0.13, 601);
      stroke(R.x1 - 10, R.y1 - 12, R.x1 - 22, R.y1 - 9, 1.5, fade * 0.13, 603);
    }
    c.restore();
    if (count) {
      z.painted = true;
      z.lastPaint = { at: G.t, age: age, progress: progress, front: front, strokes: count };
    }
  };
  var ground = U.ground;
  U.ground = function (c, S, t, G) { ground(c, S, t, G); F.draw(c, S, G); };
})();

/* Wukong ultimate only: small ground brush marks replace this cast's
 * legacy startup glyph + 190px skill picture. Combat and particle paths stay. */
(function () {
  'use strict';
  var XY = window.XY, U = XY.ULTINK;
  if (!U) return;
  var F = XY.WUKONG_STARTUPFX = { on: true }, states = new WeakMap();
  function latest(G, h) {
    var list = G && G.us || [];
    for (var i = list.length - 1; i >= 0; i--) {
      var S = list[i];
      if (S.h === h && S.def && S.t >= 0 && S.t < S.def.dur) return S;
    }
    return null;
  }
  function alive(S) { return !!(S.h && !S.h.dead && !S.h.down && S.h.hp > 0); }
  function eligible(S) { return !!(S && S.id === 'wukong' && S.h && S.h.id === S.id && S.def && S.def.mainHero); }
  function ready(G, S) {
    if (!F.on || !U.on || !XY.INKP || typeof XY.INKP.cstroke !== 'function' ||
        !eligible(S) || !alive(S) || S.visualOff || S._inkOverlap || latest(G, S.h) !== S) return false;
    var b = S.h._ultNormalBody, ref = S._inkBodyRef;
    var key = XY.chibi && XY.chibi.bodyFrameKey && XY.chibi.bodyFrameKey(G, S.h);
    return !!(b && ref && key && b.frameKey === key && ref.normalFrameKey === key &&
      b.height > 0 && isFinite(b.height) && isFinite(b.footOffset) && U.has(S.id));
  }
  function choose(G, S) {
    var z = states.get(S);
    if (!z) {
      z = { G: G, mode: ready(G, S) ? 'owned' : 'fallback', closed: false };
      states.set(S, z);
    }
    return z;
  }
  function viewing(G) {
    return G && G.mode === 'play' && (!XY.app || XY.app.screen === 'play') &&
      (!XY.ultscene || !XY.ultscene.live || XY.ultscene.live === G);
  }
  F.takeover = function (G, h) {
    var S = latest(G, h);
    // A delayed/unrelated V.cast must not claim an older scene's startup.
    if (!eligible(S) || S.t !== 0) return false;
    var z = choose(G, S);
    if (z.G === G && !z.closed && z.mode === 'owned' && viewing(G) && ready(G, S)) return true;
    z.mode = 'fallback';
    return false;
  };
  F.mode = function (S) { var z = states.get(S); return z ? (z.closed ? 'closed' : z.mode) : null; };
  F.draw = function (c, S, G) {
    if (!eligible(S)) return;
    var z = states.get(S);
    if (z && (z.G !== G || latest(G, S.h) !== S || !alive(S) || S.visualOff)) z.closed = true;
    if (!viewing(G) || latest(G, S.h) !== S || S.t < 0 || S.t >= 1.1) return;
    // Only this exact V.cast takeover can authorize replacement paint.
    // An isolated scene must never add new marks after the legacy cast already ran.
    if (!z || z.closed || z.mode !== 'owned') return;
    if (!ready(G, S)) { z.closed = true; return; }
    var h = S.h, b = h._ultNormalBody, P = XY.INKP;
    var q = Math.max(0, Math.min(1, S.t / 0.25));
    var a = Math.min(1, S.t / 0.12) * Math.max(0, Math.min(1, (1.1 - S.t) / 0.45));
    var r = Math.max(28, Math.min(60, b.height * 0.5)) * (0.78 + 0.22 * q);
    var x = h.x, y = h.y + b.footOffset + 4, ry = r * 0.32;
    var acc = '173,94,28'; // Gold-orange ink; no upright flame image.
    c.save();
    // Four separated, tapered strokes. Empty centre; no ring, fill or glyph.
    P.cstroke(c, x - r, y + ry * 0.6, x - r * 0.55, y - ry, 2.6, acc, a * 0.74, 211, 0.1);
    P.cstroke(c, x - r * 0.65, y - ry, x - r * 0.25, y - ry * 0.6, 1.8, acc, a * 0.58, 223, -0.1);
    P.cstroke(c, x + r, y - ry * 0.6, x + r * 0.55, y + ry, 2.6, acc, a * 0.74, 227, 0.1);
    P.cstroke(c, x + r * 0.65, y + ry, x + r * 0.25, y + ry * 0.6, 1.8, acc, a * 0.58, 229, -0.1);
    c.restore();
  };
  var ground = U.ground;
  U.ground = function (c, S, t, G) { ground(c, S, t, G); F.draw(c, S, G); };
})();
