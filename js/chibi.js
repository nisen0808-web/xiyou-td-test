/* 全队角色的战场多帧绘制。
 * 图集就绪时使用同身份彩色 CHIBI_INK（自建角色保留自己的图集），待机固定第0帧；
 * 地面行走2–5帧由实际位移推进，三徒弟的外露小腿补支撑/抬脚；腾云、骑乘和冲锋不叠加该腿部处理。
 * 自动攻击沿原时间轴用本套彩色6/7帧表现；移动中的攻击不打断步态，受击仅短暂退让/染红。
 * 彩色图集迟到时使用同角色HD立绘；显式ultInk由大招模块绘制，倒地由上层MINK专用KO处理。
 * 左向通常镜像身体。马丁使用独立L图集；羽溪仅反校正文字符号区，保留身体/武器朝向。
 */
(function () {
  'use strict';
  var XY = window.XY, imgs = {}, tints = {}, face = {};
  var DRAW_H = 3.6;                                       // 画出来的高度 = 半径 × 3.6（站立帧 120px 对应这个高度）
  var S = XY.chibi = { stats: { idle: 0, walk: 0, atk: 0, hit: 0 }, last: null, frames: {}, drawn: 0 };

  /* v0.7.0n：五位主角优先用水墨工笔精灵 XY.CHIBI_INK（js/chibi_ink_data.js，tools/ink_bake.py 烘焙，切片在 assets/art/hero-ink/sprites/）；
   * 没有水墨版的角色（Phyrex、特殊人物）和 XY.chibi.useInk=false 时仍走旧图集 XY.CHIBI。两套图集格式相同，只有站高像素不同（stand）。 */
  S.useInk = true;
  function pickData(id) {
    if (S.useInk && XY.CHIBI_INK && XY.CHIBI_INK[id]) return { d: XY.CHIBI_INK[id], stand: XY.CHIBI_INK_STAND || XY.CHIBI_STAND, ink: true };
    var d = XY.CHIBI && XY.CHIBI[id]; return d ? { d: d, stand: XY.CHIBI_STAND, ink: false } : null;
  }
  function load(id) {
    var pd = pickData(id); if (!pd) return null;
    var e = imgs[id];
    if (e && e.ink === pd.ink && e.src === pd.d.src) {
      // A repeated verified chunk installs fresh metadata objects for the same source.
      // Retain its pending/decoded image; only derived frame crops must be rebuilt.
      if (e.d !== pd.d || e.stand !== pd.stand) {
        if (XY._cbMenu) delete XY._cbMenu[id];
        for (var cached in tints) if (cached.indexOf(id + '~') === 0) delete tints[cached];
        e.d = pd.d; e.stand = pd.stand;
      }
      return e;
    }
    if (e && e.cancelPrepare) e.cancelPrepare();
    if (XY._cbMenu) delete XY._cbMenu[id];
    for (var stale in tints) if (stale.indexOf(id + '~') === 0) delete tints[stale];
    var d = pd.d;
    e = imgs[id] = { img: new Image(), d: d, src: d.src, stand: pd.stand, ink: pd.ink };
    e.img.src = d.src;
    return e;
  }
  function ok(e) { return e && e.img.complete && e.img.naturalWidth > 0; }
  XY.chibiKey = function (h) { return h.id === 'phyrex' && h.xf > 0 && XY.CHIBI && XY.CHIBI.phyrex_x ? 'phyrex_x' : h.id; };
  S.forget = function (id) { if (imgs[id] && imgs[id].cancelPrepare) imgs[id].cancelPrepare(); if (customImages[id]) { customImages[id].cancel(); delete customImages[id]; } delete imgs[id]; if (XY._cbMenu) delete XY._cbMenu[id]; for (var k in tints) if (k.indexOf(id + '~') === 0 ) delete tints[k]; };   // v0.8.1：自建角色重做精灵时清缓存
  S.has = function (id) { return !!(XY.CHIBI && XY.CHIBI[id]) && !(XY.isHidden && XY.isHidden(id)); };
  // Exact generated-body readiness; ordinary image selection/drawing is unchanged.
  var customImages = Object.create(null);
  function customEntry(id, d) { return !!(d && d.xchar && XY.CHIBI && XY.CHIBI[id] === d && XY.CHIBI_INK && XY.CHIBI_INK[id] === d); }
  S.customReady = function (id, d) {
    var q=customImages[id],e=imgs[id];
    return !!(q&&q.state==='ready'&&q.entry===d&&customEntry(id,d)&&e===q.record&&e.d===d&&e.img.src===d.src&&ok(e));
  };
  S.prepareCustom = function (id, d) {
    if(!customEntry(id,d))return Promise.reject(new Error('自建图集身份已改变'));
    var e=load(id),q=customImages[id];
    if(!e||e.d!==d||e.img.src!==d.src)return Promise.reject(new Error('自建图集缓存不匹配'));
    if(q&&q.entry===d&&q.record===e)return q.promise;
    if(q)q.cancel();
    q={entry:d,record:e,state:'pending'};customImages[id]=q;
    q.promise=new Promise(function(resolve,reject){
      var done=false,decoding=false,timer;
      function finish(error){if(done)return;done=true;clearTimeout(timer);e.img.removeEventListener('load',loaded);e.img.removeEventListener('error',failed);q.state=error?'error':'ready';if(error)reject(error);else resolve(e.img);}
      function valid(){return customImages[id]===q&&customEntry(id,d)&&imgs[id]===e&&e.d===d&&e.img.src===d.src;}
      function failed(){finish(new Error('自建图集载入失败'));}
      function loaded(){
        if(done||decoding)return;
        if(!valid())return finish(new Error('自建图集身份已改变'));
        if(!ok(e)||e.img.naturalWidth!==d.w||e.img.naturalHeight!==d.h)return finish(new Error('自建图集尺寸无效'));
        decoding=true;
        var decode;try{decode=e.img.decode?e.img.decode():Promise.resolve();}catch(err){decode=Promise.reject(err);}
        Promise.resolve(decode).then(function(){if(!valid())return finish(new Error('自建图集身份已改变'));XY._cbMenu=XY._cbMenu||{};XY._cbMenu[id]={img:e.img};finish();},function(){finish(new Error('自建图集解码失败'));});
      }
      q.cancel=function(){finish(new Error('自建图集已更新'));};
      e.img.addEventListener('load',loaded);e.img.addEventListener('error',failed);
      timer=setTimeout(function(){finish(new Error('自建图集载入超时'));},15000);
      if(e.img.complete){if(e.img.naturalWidth)loaded();else failed();}
    });
    q.promise.catch(function(){});return q.promise;
  };
  // Required official bodies use the drawing cache, not a second validation Image.
  function validAtlas(d) {
    if (!d || typeof d.src !== 'string' || !d.src || !(d.w > 0 && d.h > 0) || !Array.isArray(d.fr) || d.fr.length !== 8) return false;
    return [d.fr].concat(d.L ? [d.L] : []).every(function (frames) {
      return frames.length === 8 && frames.every(function (f) {
        return Array.isArray(f) && f.length >= 6 && f.every(Number.isFinite) && f[0] >= 0 && f[1] >= 0 && f[2] > 0 && f[3] > 0 && f[0] + f[2] <= d.w && f[1] + f[3] <= d.h;
      });
    });
  }
  function preparedBody(id, retry) {
    var pd = pickData(id);
    if (!pd || !(pd.stand > 0 && Number.isFinite(pd.stand)) || !validAtlas(pd.d)) return Promise.reject(new Error('角色动作数据缺失或无效：' + id));
    var e = load(id);
    if (retry && e.prepareState === 'error') { S.forget(id); e = load(id); }
    if (e.preparePromise) return e.preparePromise;
    e.prepareState = 'pending';
    e.preparePromise = new Promise(function (resolve, reject) {
      var done = false, decoding = false, timer;
      function current() { var now = pickData(id); return imgs[id] === e && now && now.d === e.d && now.ink === e.ink && now.d.src === e.src; }
      function finish(error) {
        if (done) return; done = true; clearTimeout(timer);
        e.img.removeEventListener('load', loaded); e.img.removeEventListener('error', failed);
        e.prepareState = error ? 'error' : 'ready'; e.prepareError = error || null;
        if (error) reject(error); else resolve(e);
      }
      function failed() { finish(new Error('角色动作载入失败：' + id)); }
      function loaded() {
        if (done || decoding) return;
        if (!current()) return finish(new Error('角色动作数据已改变：' + id));
        if (!ok(e) || e.img.naturalWidth !== e.d.w || e.img.naturalHeight !== e.d.h) return finish(new Error('角色动作尺寸不符：' + id));
        decoding = true;
        var work; try { work = e.img.decode ? e.img.decode() : Promise.resolve(); } catch (error) { work = Promise.reject(error); }
        Promise.resolve(work).then(function () { finish(current() ? null : new Error('角色动作数据已改变：' + id)); }, function () { finish(new Error('角色动作解码失败：' + id)); });
      }
      e.cancelPrepare = function () { finish(new Error('角色动作缓存已更新：' + id)); };
      e.img.addEventListener('load', loaded); e.img.addEventListener('error', failed);
      timer = setTimeout(function () { finish(new Error('角色动作载入超时：' + id)); }, 15000);
      if (e.img.complete) { if (e.img.naturalWidth) loaded(); else failed(); }
    });
    e.preparePromise.catch(function () {}); return e.preparePromise;
  }
  S.readyIds = function (ids) {
    return Array.isArray(ids) && ids.length > 0 && ids.every(function (id) {
      var pd = pickData(id), e = imgs[id];
      return pd && pd.stand > 0 && Number.isFinite(pd.stand) && validAtlas(pd.d) && e && e.d === pd.d && e.src === pd.d.src && e.ink === pd.ink && e.prepareState === 'ready' && ok(e) && e.img.naturalWidth === pd.d.w && e.img.naturalHeight === pd.d.h;
    });
  };
  S.prepareIds = function (ids, retry) {
    if (!Array.isArray(ids) || !ids.length) return Promise.reject(new Error('角色动作清单为空'));
    return Promise.all(ids.map(function (id) { return preparedBody(id, retry); })).then(function () {
      if (!S.readyIds(ids)) throw new Error('角色动作在准备期间发生变化'); return S;
    });
  };
  S.waitForPendingIds = function (ids) { return Promise.all(ids.map(function (id) { var e = imgs[id]; return e && e.preparePromise ? e.preparePromise.catch(function () {}) : Promise.resolve(); })); };
  S.preload = function () { if (XY.CHIBI) for (var k in XY.CHIBI) if (!(XY.isHidden && XY.isHidden(k))) load(k); };
  function renderKey(h) {
    var custom = h.def && h.def.xid, key = custom || XY.chibiKey(h);
    // 自建人物的 id 是技能原型，xid 才是外观身份；图集就绪后始终保留自己的外观。
    // 生成/解码期间等待自己的图集，不借用技能原型，也不请求不存在的自建 HD。
    if (custom) return key;
    if (S.hdRoster(key) || S.hdRoster(h.id)) return S.hdRoster(key) ? key : h.id;
    if (!(XY.wildAnim && XY.wildAnim.ready && XY.wildAnim.ready(key, 'idle')) && XY.wildAnim && XY.wildAnim.ready && XY.wildAnim.ready(h.id, 'idle')) return h.id;
    return key;
  }
  S.ready = function (h) {
    var k = renderKey(h);
    // 彩色人物只等待彩色图集/立绘；灰色 wild 包先到不能冒充本体已经就绪。
    if ((h.def && h.def.xid) || S.hdRoster(k) || S.hdRoster(h.id)) return !!(ok(load(k)) || S.hd(k));
    if (S.useWild(h)) return true;
    return S.has(k) && ok(load(k));
  };

  function tint(key, set, i, e, f) {
    var ck = key + '~' + (e.ink ? 'ink' : 'plain') + '~' + set + '~' + i, t = tints[ck];
    if (t) return t;
    t = tints[ck] = document.createElement('canvas'); t.width = f[2]; t.height = f[3];
    var x = t.getContext('2d'); x.drawImage(e.img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,50,40,0.6)'; x.fillRect(0, 0, f[2], f[3]);
    return t;
  }

  // 羽溪衣摆有真实字样：身体照常面向移动方向，仅左向时在字的基线轴上
  // 反射这个小区域。不会翻转整条飘带、人物、武器或修改原画文件。
  var YUXI_WORD = [
    [70,134,46,18,-.14], [70,136,46,18,-.14],
    [63,134,46,18,-.14], [84,135,46,18,-.14],
    [78,131,46,18,-.14], [66,134,46,18,-.14],
    [89,132,46,18,-.14], [80,123,46,18,-.14]
  ];
  var YUXI_HD_WORD = [618,826,294,76,-.24];
  var wordPatches = new WeakMap();
  function readableWord(c, image, word, sourceX, sourceY, drawX, drawY, scale) {
    var patches = wordPatches.get(image);
    if (!patches) { patches = {}; wordPatches.set(image, patches); }
    var cacheKey = word.join(',') + ':' + sourceX + ':' + sourceY, patch = patches[cacheKey];
    if (!patch) {
      patch = patches[cacheKey] = document.createElement('canvas');
      var resolution = 2;
      patch.width = word[2] * resolution; patch.height = word[3] * resolution;
      var g = patch.getContext('2d'), w = patch.width, h = patch.height;
      g.translate(w / 2, h / 2); g.scale(resolution, resolution); g.rotate(-word[4]);
      g.drawImage(image, -sourceX - word[0], -sourceY - word[1]);
      g.setTransform(1, 0, 0, 1, 0, 0);
      // 羽化只落在字外的布料余量内；字的中心区域完全覆盖，避免双字重影。
      var edge = (word[2] > 100 ? 5 : 1.25) * resolution;
      g.globalCompositeOperation = 'destination-in';
      var gx = g.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'transparent'); gx.addColorStop(edge / w, '#fff');
      gx.addColorStop(1 - edge / w, '#fff'); gx.addColorStop(1, 'transparent');
      g.fillStyle = gx; g.fillRect(0, 0, w, h);
      var gy = g.createLinearGradient(0, 0, 0, h);
      gy.addColorStop(0, 'transparent'); gy.addColorStop(edge / h, '#fff');
      gy.addColorStop(1 - edge / h, '#fff'); gy.addColorStop(1, 'transparent');
      g.fillStyle = gy; g.fillRect(0, 0, w, h);
    }
    c.save(); c.translate(drawX + word[0] * scale, drawY + word[1] * scale);
    c.rotate(word[4]); c.scale(-1, 1);
    c.drawImage(patch, -word[2] * scale / 2, -word[3] * scale / 2, word[2] * scale, word[3] * scale);
    c.restore();
  }

  /* 狂野水墨多帧：待机按 animation.json 的 cycle / pingpong 播，出招 8 帧约 667ms，播完回待机。
   * 走路（2–5）和蓄力（6）仍用旧图集。币圈老司机没有出招包，出招那一下留旧的第 7 帧。
   * 伤害仍在攻击冷却被重置的那一瞬结算；出招动画从这一瞬开始，命中帧约在 250ms。 */
  var WILD_STAND = 192;
  S.wildOff = false;
  S.useWild = function (h) {
    if (S.wildOff || !h || (h.def && h.def.xid) || !XY.wildAnim || !XY.wildAnim.ready) return false;
    if (h.id === 'horse' && h.def && h.def.form === 'human') return false;
    var key = XY.chibiKey(h), W = XY.wildAnim;
    // Colour characters use this clip only as an attack clock; their own atlas
    // stays on screen. Do not download a grey figure just to enable its timing.
    if (S.hdRoster(key)) return !!(W.knows && W.knows(key));
    var actual = W.knows && W.knows(key) ? key : h.id;
    if (W.request && W.knows && W.knows(actual)) W.request(actual);
    return W.ready(key, 'idle') || W.ready(h.id, 'idle');
  };
  S.wildState = function (h, rt, key, G) {
    var W = XY.wildAnim;
    if (!W || !W.knows || !W.knows(key)) return null;
    // 被骑的白龙马不攻击；rideHorseStep 抬高 atkT 只是游戏冷却，不能当成攻击事件。
    if (h.id === 'horse' && h.ridden) {
      h._wAtkSeen = h.atkT; h._wDashSeen = !!h.dash; h._wRt = rt;
      h._wSt = { mode: 'idle', t: 0 }; h._wildSuppressCharge = true;
      return h._wSt;
    }
    if (h._wildFreeze) return h._wSt || { mode: 'idle', t: 0 };
    var primaryWukong = key === 'wukong' && h.id === 'wukong' && !(h.def && h.def.xid);
    var primaryBajie = key === 'bajie' && h.id === 'bajie' && !(h.def && h.def.xid);
    var prev = h._wAtkSeen, edge = false;
    if (!primaryWukong && !primaryBajie && prev != null && h.atkMax > 0.25 && (h.atkT || 0) > prev + 0.15) edge = true;
    if (!primaryWukong && !primaryBajie && h.dash && !h._wDashSeen) edge = true;
    h._wAtkSeen = h.atkT; h._wDashSeen = !!h.dash;
    var dt = h._wRt == null ? 0 : (rt - h._wRt) * 1000;
    if (!(dt >= 0)) dt = 0;
    if (dt > 200) dt = 200;
    h._wRt = rt;
    var atk = S.hdRoster(key) || W.ready(key, 'attack') ? W.clip(key, 'attack') : null;
    if (primaryWukong) {
      // Actual primary sweep events own this same state. No cooldown inference,
      // draw-driven second clock, or offscreen catch-up queue.
      var wkAge = G && Number.isFinite(G.t) && Number.isFinite(h._wkAttackAt) ? (G.t - h._wkAttackAt) * 1000 : -1;
      var wkEvent = h._wkAttackSerial > 0 && Number.isFinite(wkAge) && wkAge >= 0;
      h._wSt = wkEvent ? W.step({ mode: 'attack', t: 0 }, wkAge, false, atk) :
        W.step({ mode: 'idle', t: 0 }, dt, false, null);
      if (h._wSt.mode === 'attack') {
        h._wSt.impactKind = h._wkAttackKind || 'primary'; h._wSt.impactAngle = h._wkAttackAngle;
      }
    } else if (primaryBajie) {
      // Use this same state at the real main slam's age; aftershocks do not restart it.
      var bjAge = G && Number.isFinite(G.t) && Number.isFinite(h._bjAttackAt) ? (G.t - h._bjAttackAt) * 1000 : -1;
      var bjEvent = h._bjAttackSerial > 0 && Number.isFinite(bjAge) && bjAge >= 0;
      h._wSt = bjEvent ? W.step({ mode: 'attack', t: 0 }, bjAge, false, atk) :
        W.step({ mode: 'idle', t: 0 }, dt, false, null);
    } else h._wSt = W.step(h._wSt, dt, edge, atk);
    if (h._wIdleT == null) h._wIdleT = Math.abs((h.bob || 0) * 1000) % 8000;
    else h._wIdleT += dt;
    return h._wSt;
  };
  function wildTint(key, clipName, i, im, sx, sy, cw, ch) {
    var ck = key + '~wild~' + clipName + '~' + i, t = tints[ck];
    if (t) return t;
    t = tints[ck] = document.createElement('canvas'); t.width = cw; t.height = ch;
    var g = t.getContext('2d'); g.drawImage(im, sx, sy, cw, ch, 0, 0, cw, ch);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,50,40,0.6)'; g.fillRect(0, 0, cw, ch);
    return t;
  }
  function drawWildFrame(c, key, clipName, index, k, tinted) {
    var W = XY.wildAnim, clip = W.clip(key, clipName), im = W.img(key, clipName);
    if (!clip || !im || index < 0 || index >= clip.frameCount) return null;
    var cw = clip.cell[0], ch = clip.cell[1], col = index % clip.cols, row = (index / clip.cols) | 0;
    var sx = col * cw, sy = row * ch, kk = k * (clip.fit || 1);
    var src = tinted ? wildTint(key, clipName, index, im, sx, sy, cw, ch) : im;
    c.drawImage(src, tinted ? 0 : sx, tinted ? 0 : sy, cw, ch, -clip.anchor[0] * kk, -clip.anchor[1] * kk, cw * kk, ch * kk);
    return clip;
  }

  // 脚步由实际行走距离推进，慢速护卫不会仍按跑速原地倒脚。
  // 位移只在连续地面行走时采样；暂停、腾云、冲锋和传送不补播步数。
  S.walkPhase = function (h, rt, moving) {
    var x = h.x, y = h.y, gait = h._walkCycle;
    if (!gait) gait = h._walkCycle = { t: rt, x: x, y: y, phase: (h.bob || 0) % 4, moving: !!moving };
    else {
      var dt = rt - gait.t, dx = x - gait.x, dy = y - gait.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var horse = h.id === 'horse' && !(h.def && h.def.form === 'human');
      var speed = (h.def && h.def.speed) || h.speed || 120;
      var stride = Math.max(12, speed * (horse ? 4 / 7 : 0.4));
      if (moving && gait.moving && dt > 0 && dt <= 0.2 && isFinite(distance) &&
          distance <= Math.max(stride * 2, speed * dt * 4)) {
        gait.phase = (gait.phase + distance * 4 / stride) % 4;
      }
      gait.t = rt; gait.x = x; gait.y = y; gait.moving = !!moving;
    }
    return gait.phase;
  };
  function walkFrame(ph) { return 2 + (Math.floor(ph + 1e-7) & 3); }
  /* 选动画：返回 {anim, i(帧号), mix(待机交叉淡化的 B 帧透明度)} */
  S.pick = function (h, rt, ph, moving) {
    moving = moving == null ? h.moving : moving;
    if (ph == null) ph = S.walkPhase(h, rt, moving && !h.dash && !h.ultPose && !h.ultInk);
    if (h.hurtT > 0.05) return { anim: 'hit', i: moving ? walkFrame(ph) : 0 };
    if (h.ultPose) return { anim: 'atk', i: h.ultPose };                       // 大招场景（ultscene）直接指定 Q 版动作帧，不去动攻击冷却
    // 被骑的白龙马不攻击；骑乘前遗留的高冷却也不能选到旧版出招帧。
    if (h.id === 'horse' && h.ridden) return moving
      ? { anim: 'walk', i: walkFrame(ph) }
      : { anim: 'idle', i: 0, mix: 0.5 + 0.5 * Math.sin(rt * 2.4 + (h.bob || 0)) };
    // 普攻的命中效果照常由战斗层播放；走位中不再用整段站立出招打断脚步。
    if (h.dash) return { anim: 'atk', i: 7 };
    if (moving) return { anim: 'walk', i: walkFrame(ph) };
    var el = (h.atkMax || 0) - (h.atkT || 0);
    // 沙僧以念珠持续攻击，不消费通用 atkT；其随机初值不能作为蓄力或出招计时。
    if (h.dash || (h.id !== 'wujing' && h.atkMax > 0.25 && h.atkT > 0 && el >= 0 && el < 0.2)) return { anim: 'atk', i: 7 };
    if (h.id !== 'wujing' && h.atkMax > 0.3 && h.atkT > 0.06 && h.atkT < 0.18) return { anim: 'atk', i: 6 };
    if (moving) return { anim: 'walk', i: walkFrame(ph) };
    return { anim: 'idle', i: 0, mix: 0.5 + 0.5 * Math.sin(rt * 2.4 + (h.bob || 0)) };
  };

  var HD = {}, HDSET = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1, phyrex: 1, phyrex_x: 1, sisi: 1, laosiji: 1, kuanggong: 1, haiteng: 1, yuanzhang: 1, heyuxi: 1, diaoyulao: 1, martin: 1 };
  S.hdRoster = function (id) { return !!(id && HDSET[id]); };
  S.hd = function (id) {
    if (!id || !HDSET[id]) return null;
    var e = HD[id];
    if (!e) { e = HD[id] = new Image(); e.src = 'assets/art/battle-hd/' + id + '.webp'; }
    return e.complete && e.naturalWidth ? e : null;
  };
  /* 图集尚未解码时只用同人物彩色立绘，配合相同步态时钟做轻微起伏。 */
  S.stepPose = function (h, rt, phase) {
    var ph = h._stepLock != null ? h._stepLock : (phase == null ? S.walkPhase(h, rt, !!h.moving) : phase) * Math.PI / 2;
    if (h.id === 'horse' && !(h.def && h.def.form === 'human')) return { bob: Math.abs(Math.sin(ph)) * 0.2, rot: 0, sway: 0, sx: 1, sy: 1 };
    var contact = (1 + Math.cos(ph * 2)) / 2, squash = 0.006 * contact;
    return { bob: Math.abs(Math.sin(ph)) * 0.7, rot: Math.sin(ph) * 0.012, sway: Math.cos(ph) * 0.25, sx: 1 + squash, sy: 1 - squash };
  };
  // 校准当前彩色图集的走路帧：每项为 [尺度, 横移, 纵移]，坐标以原图集像素计。
  // 以头部/上胸/鞍部配准，避免烘焙时随抬脚变化的底部 alpha 中位数拉动整个人。
  // 只修显示锚点；腿、武器、碰撞、移速与攻击时间仍来自原图和战斗逻辑。
  var WALK_FIT = {
    tang: [[1,0,0],[1,2,0],[1,-5,-2],[1,-4,-2]],
    wukong: [[1,0,0],[1,4,1],[1,3,-1],[1,7,2]],
    bajie: [[1,0,0],[1,2,0],[1,4,-1],[1,3,-1]],
    wujing: [[1,0,0],[1,-3,2],[1,-3,0],[1,-1,2]],
    horse: [[1,0,0],[1,-6,1],[1,-1,-2],[1,-6,-1]],
    haiteng: [[1,0,0],[1.095,3,-1],[0.995,-7,0],[1.15,-20,-1]],
    kuanggong: [[1,0,0],[0.975,5,2],[1.015,0,2],[0.94,6,2]],
    phyrex: [[1,0,0],[1,-1,1],[1,0,-1],[1,-3,1]],
    phyrex_x: [[1,0,0],[1,1,-1],[1,4,0],[1,1,-1]],
    sisi: [[1,0,0],[1,4,7],[1,2,0],[1,-4,2]],
    heyuxi: [[1,0,0],[1,4,-1],[1,2,-5],[1,1,-1]],
    yuanzhang: [[1,0,0],[1,4,3],[1,3,1],[1,5,2]],
    diaoyulao: [[1,0,0],[1,2,-2],[1,3,2],[1,2,0]],
    laosiji: [[1,0,0],[1,10,6],[1,13,1],[1,1,4]],
    martin: [[1,0,0],[1,3,2],[1,-4,0],[1,4,3]],
    martin_L: [[1,0,0],[1,-3,2],[1,4,0],[1,-4,3]]
  };
  // 待机也接到同一脚底/上胸基准；仅补偿原图集裁切与体型误差，保留动作姿态。
  var IDLE_FIT = {
    tang: [[1.0,4,-1],[1.0,3,-1]],
    wukong: [[1.02,-1,0],[1.02,-2,0]],
    bajie: [[1.0,10,1],[1.0,3,0]],
    wujing: [[1.0,1,1],[1.0,-4,0]],
    phyrex: [[1.0,-2,0],[0.98,1,0]],
    phyrex_x: [[1.0,3,0],[0.985,6,1]],
    sisi: [[1.0,2,1],[0.98,4,1]],
    haiteng: [[1,0,0],[1.0,-3,-1]],
    heyuxi: [[1.0,4,-1],[0.995,7,1]],
    yuanzhang: [[1.0,-2,-1],[0.98,2,-1]],
    diaoyulao: [[1.0,2,0],[1.0,2,0]],
    laosiji: [[1.0,8,1],[1.0,2,0]],
    kuanggong: [[1.0,1,1],[0.975,5,1]],
    martin: [[1.0,-5,-1],[0.995,-1,1]],
    martin_L: [[1.0,1,-1],[0.995,4,1]],
    horse: [[1.0,-15,1],[1.0,-15,1]]
  };
  // 镜像围绕躯干中线，不围绕某一只伸出的脚。烘焙时底部alpha中位数
  // 曾把沙僧/海腾的支点放在肩旁，正常转身就会整身跨过十几像素。
  // 原图像素单位，所有姿态使用同一常量；不改世界坐标、朝向或碰撞。
  var BODY_PIVOT = {
    tang: 0, wukong: -4, bajie: -5, wujing: 24, horse: -2,
    phyrex: -10, phyrex_x: -10, sisi: -8, haiteng: 15, kuanggong: 0,
    yuanzhang: -4, heyuxi: -12, diaoyulao: -16, laosiji: -6,
    martin: -2, martin_L: 2
  };
  // The three disciples' original walk cells keep nearly the same feet.
  // Articulate only the exposed lower legs; torso, weapons and cloth remain
  // the authored four-frame animation. Each foot alternates support and lift.
  var LEG_RIG = {
    wukong: [{ box: [.18,.78,.48,1], hip: .77 }, { box: [.50,.80,.78,1.01], hip: .78 }],
    bajie:  [{ box: [.02,.85,.28,1.01], hip: .82 }, { box: [.62,.85,.94,1.01], hip: .82 }],
    wujing: [{ box: [.12,.80,.37,.98], hip: .76 }, { box: [.62,.80,.91,1.01], hip: .76 }]
  };
  function walkingLegs(c, image, sourceX, sourceY, sw, sh, x, y, w, h, rig, phase, travel, direction) {
    var offsets = [];
    rig.forEach(function (leg, i) {
      var cycle = ((phase / 4 + i * .5) % 1 + 1) % 1;
      var swing = cycle < .5, u = cycle * 2;
      var along = swing ? -1 + 2 * u * u * (3 - 2 * u) : 1 - 4 * (cycle - .5);
      var shift = along * travel * direction;
      var lift = swing ? Math.sin(Math.PI * u) * h * .065 : 0;
      var length = h * (leg.box[3] - leg.hip), box = leg.box;
      offsets.push({ x: shift, y: -lift, support: !swing });
      c.save(); c.translate(x, y + h * leg.hip);
      c.transform(1, 0, shift / length, 1 - lift / length, 0, 0);
      c.beginPath(); c.rect(w * box[0] - .3, h * (box[1] - leg.hip), w * (box[2] - box[0]) + .6, h * (box[3] - box[1]) + .4); c.clip();
      c.drawImage(image, sourceX, sourceY, sw, sh, 0, -h * leg.hip, w, h); c.restore();
    });
    c.save(); c.beginPath(); c.rect(x - w, y - h, w * 3, h * 3);
    rig.forEach(function (leg) { var b = leg.box; c.rect(x + w * b[0], y + h * (b[1] + .012), w * (b[2] - b[0]), h * (b[3] - b[1])); });
    c.clip('evenodd'); c.drawImage(image, sourceX, sourceY, sw, sh, x, y, w, h); c.restore();
    return offsets;
  }
  S.bodyFrameKey = function (G, h) {
    return [h.id, h.def && h.def.xid, h.def && h.def.form, (h.def && h.def.r) || 18,
      h.xf > 0, XY._partyScale || 1, (G && G._shotScale) || 1].join(':');
  };
  function canonicalIdle(G, h, key, e, oldOk, y, r, frameKey) {
    if (oldOk) {
      var d = e.d, fl = face[h.i];
      if (fl === undefined) fl = Math.cos((h.moveFace != null ? h.moveFace : h.face) || 0) < 0;
      var set = fl && d.L ? d.L : d.fr, f = set && set[0];
      if (!f) return null;
      var fitKey = fl && d.L ? key + '_L' : key;
      var fit = e.ink && d.normalRegistration !== 'authored' && IDLE_FIT[fitKey] && IDLE_FIT[fitKey][0];
      var k = r * DRAW_H / e.stand * (d.sz || 1), fs = fit ? fit[0] : 1;
      // Authored atlas cells retain transparent margins. Measure the actual idle
      // content without changing a single source pixel or any legacy entry.
      var bs = d.normalBounds && d.normalBounds[fl && d.L ? 'L' : 'R'];
      var b = bs && bs[0], bh = b ? b[3] : f[3], bottom = b ? b[1] + b[3] : f[3];
      return { height: bh * k * fs, frameKey: frameKey,
        footOffset: y + r * 0.85 + (bottom - f[5]) * k * fs + (fit ? fit[2] : 0) * k - h.y };
    }
    if (S.hd(key)) return { height: r * 3.4 * ((G && G._shotScale) || 1) * (XY._partyScale || 1),
      frameKey: frameKey, footOffset: y + r * 0.85 - h.y };
    return null;
  }
  S.draw = function (c, G, h, rt, x, y, r) {
    var key = renderKey(h), roster = S.hdRoster(key);
    var e = load(key), oldOk = ok(e);
    if (roster && !oldOk && !S.hd(key)) return false;
    if (!oldOk && !S.useWild(h) && !S.hd(key)) return false;
    var boxKey = S.bodyFrameKey(G, h);
    // Use idle-frame geometry regardless of the current attack/walk pose. The
    // render-supplied y preserves the current cloud/ride lift without changing h.y.
    var wgAdopted = key === 'wujing' && XY.wujingGround && XY.wujingGround.adopted(G, h);
    h._ultNormalBody = wgAdopted ? { height: r * 4.32, frameKey: boxKey, footOffset: y + r * .85 - h.y } :
      canonicalIdle(G, h, key, e, oldOk, y, r, boxKey);
    if (h.ultInk) {
      var castBox = XY.ULTINK && XY.ULTINK.heroBounds && XY.ULTINK.heroBounds(G, h);
      if (castBox) {
        h._wildTop = castBox.y;
        h._drawBox = castBox;
        return true;
      }
      // Missing reference/texture, dead or overlapping casts keep the ordinary
      // renderer below, even if an earlier scene left the hide flag set.
    }
    // One update-owned layered body for Wujing ground idle/run. Exclusive
    // cast/cloud/ride/down owners retain their existing atlas and timing.
    var wgPose = key === 'wujing' && !(h.def && h.def.xid) && !h.down && !h.dead &&
      !h.mounted && !h.ridden && !h.dash && !h.ultPose && !h.ultInk &&
      XY.wujingGround && XY.wujingGround.get(G, h);
    if (wgPose && XY.wujingGroundArt) {
      var wgShield = XY.shieldUI && XY.shieldUI.isShieldOnly(G, h);
      var wgDraw = XY.wujingGroundArt.draw(c, wgPose, x, y + r * .85, r, h.hurtT > .05 && !wgShield);
      if (wgDraw.ok) {
        h._drawBox = Object.assign(wgDraw.bounds, { originY: h.y, frameKey: boxKey });
        h._wildTop = wgDraw.bounds.y;
        h._ultNormalBody = { height: r * 4.32, frameKey: boxKey, footOffset: y + r * .85 - h.y };
        S.drawn++; var wgAnim = wgPose.moving ? 'walk' : 'idle'; S.stats[wgAnim]++;
        S.last = { id: key, anim: 'ground-' + wgAnim, frame: 0, left: wgPose.face < 0, hero: h.i, t: rt, ink: true, layered: true };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        return true;
      }
    }
    var d = e && e.d, sz = (d && d.sz) || 1;
    var kWild = r * DRAW_H / WILD_STAND * sz, kOld = e ? r * DRAW_H / e.stand * sz : kWild;
    var groundWalk = G && XY.heroGroundWalk && XY.heroGroundWalk(G, h);
    var clouding = groundWalk ? groundWalk.cloud : !!(G && XY.cloud && XY.cloud.on && XY.cloud.on(G, h));
    var tangStep = !clouding && h.id === 'tang' && G && G.tang && (G.tang.phase === 'walk' || G.tang.phase === 'walk2');
    var motionMoving = groundWalk ? groundWalk.moving : h.moving;
    var walking = !!(!clouding && (motionMoving || tangStep) && !h.dash && !h.ultPose && !h.ultInk);
    var gaitPhase = groundWalk ? groundWalk.phase : S.walkPhase(h, rt, walking);
    var a = S.pick(h, rt, gaitPhase, groundWalk ? walking : undefined);
    if (walking) a = { anim: h.hurtT > 0.05 ? 'hit' : 'walk', i: walkFrame(gaitPhase) };
    // 攻击朝向仍供伤害/弹道使用；身体移动方向独立，避免每次自动攻击左右闪一帧。
    var mover = h.ridden && G && G.heroes && G.heroes[h.rideTgt] || h;
    var visualFace = mover.moveFace != null ? mover.moveFace : h.face;
    var cs = Math.cos(visualFace || 0);
    var fl = face[h.i];
    if (fl === undefined) fl = face[h.i] = cs < 0;
    else if (cs < -0.72) fl = face[h.i] = true;
    else if (cs > 0.72) fl = face[h.i] = false;
    var set = d ? (fl && d.L ? d.L : d.fr) : null, mir = !!(fl && !(d && d.L));
    var prevAnimAtk = h._xyPrevAnimAtk;
    var freshAttack = !h.ridden && prevAnimAtk != null && h.atkMax > 0.25 && (h.atkT || 0) > prevAnimAtk + 0.15;
    h._xyPrevAnimAtk = h.atkT;
    var st = S.wildState(h, rt, key, G);
    var activeWildAttack = !!(st && st.mode === 'attack' && S.useWild(h) && !h.ultPose && !h.ultInk);
    if (activeWildAttack) h._wildSuppressCharge = true;
    else if (!(h.atkT > 0.06)) h._wildSuppressCharge = false;
    else if (freshAttack) h._wildSuppressCharge = false;
    // 完整出招或骑乘已处理过的剩余冷却，不得再闪回旧版蓄力/出招图；真实新攻击、大招和冲刺照常。
    if (h._wildSuppressCharge && !activeWildAttack && !freshAttack && !h.ultPose && !h.dash && a.anim === 'atk' && (a.i === 6 || a.i === 7)) {
      a = (groundWalk ? walking : h.moving)
        ? { anim: 'walk', i: walkFrame(gaitPhase), mix: 0 }
        : { anim: 'idle', i: 0, mix: 0.5 + 0.5 * Math.sin(rt * 2.4 + (h.bob || 0)) };
    }
    var charging = a.anim === 'atk' && a.i === 6;
    var legacyStrike = a.anim === 'atk' && a.i === 7 && !(XY.wildAnim && XY.wildAnim.clip(key, 'attack'));
    var acting = !!(h.ultPose || h.ultInk || h.dash || charging || legacyStrike);
    var attacking = !!(st && st.mode === 'attack');
    var wildKind = null;
    // 已开始播放的完整出招应连续播完，不能被同一攻击冷却期的旧蓄力帧插断。
    if (st && S.useWild(h) && !h.ultPose && (!acting || attacking)) wildKind = attacking ? 'attack' : 'idle';
    if (!h.ultInk && !attacking && (roster || (!oldOk && S.hd(key)))) wildKind = roster ? 'idle' : wildKind;
    if (!h.ultInk && !attacking && !oldOk && S.hd(key)) wildKind = 'idle';
    if (oldOk && set && a.anim === 'atk' && !attacking) wildKind = null;
    if (h.ultPose && oldOk && set) wildKind = null;
    // 行走、待机和攻击必须使用同一套人物图。狂野攻击包是另一套灰白剪影，
    // 自动攻击时切入会让彩色角色突然变灰/变形；保留其一次性时间轴，用本套前摇/出招帧表现。
    var atlasAttack = !!(oldOk && set && attacking && !walking && !h.dash && !(h.hurtT > 0.05) && !h.ultPose && !h.ultInk);
    if (atlasAttack) {
      var attackClip = XY.wildAnim && XY.wildAnim.clip(key, 'attack');
      var attackSpan = attackClip && attackClip.durationMs;
      if (!(attackSpan > 0) && attackClip && attackClip.durationsMs) {
        attackSpan = attackClip.durationsMs.reduce(function (sum, n) { return sum + n; }, 0);
      }
      var attackPhase = Math.max(0, Math.min(1, (st.t || 0) / (attackSpan || 667)));
      a = { anim: h.hurtT > 0.05 ? 'hit' : 'atk', i: attackPhase < 0.2 || attackPhase >= 0.85 ? 6 : 7 };
    }
    // Miner keeps one committed layered body through ordinary hits and attacks.
    // The existing attack clock is consumed once above; only upper art changes.
    var kgPose = key === 'kuanggong' && !(h.def && (h.def.xid || h.def.skinId)) && !h.skinId &&
      XY.kuanggongGround && XY.kuanggongGround.get(G, h);
    if (kgPose && XY.kuanggongGroundArt) {
      var kgUpper = null, kgIndex = null;
      if (activeWildAttack) {
        var kgClip = XY.wildAnim && XY.wildAnim.clip(key, 'attack');
        var kgSpan = kgClip && (kgClip.durationMs || (kgClip.durationsMs && kgClip.durationsMs.reduce(function (sum, ms) { return sum + ms; }, 0)));
        var kgPhase = Math.max(0, Math.min(1, (st.t || 0) / (kgSpan || 667)));
        kgIndex = kgPhase < .2 || kgPhase >= .85 ? 6 : 7;
      } else if (a.anim === 'atk' && (a.i === 6 || a.i === 7)) kgIndex = a.i;
      if (kgIndex != null && oldOk && d && d.fr[kgIndex]) kgUpper = { index:kgIndex, image:e.img, source:d.fr[kgIndex] };
      var kgShield = XY.shieldUI && XY.shieldUI.isShieldOnly(G, h);
      var kgDraw = XY.kuanggongGroundArt.draw(c, kgPose, x, y + r * .85, r, h.hurtT > .05 && !kgShield, kgUpper);
      if (kgDraw.ok) {
        h._drawBox = Object.assign(kgDraw.bounds, { originY:h.y, frameKey:boxKey });
        h._wildTop = kgDraw.bounds.y;
        h._ultNormalBody = { height:r * 3.898125, frameKey:boxKey, footOffset:y + r * .85 - h.y };
        S.drawn++; var kgAnim = kgPose.moving ? 'walk' : 'idle'; S.stats[kgAnim]++;
        S.last = { id:key, anim:'ground-' + kgAnim, frame:0, left:kgPose.face < 0, hero:h.i, t:rt, ink:true, layered:true, upperAction:kgUpper ? kgIndex : 0 };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        return true;
      }
    }
    // Wukong's same-identity upper follows the one existing attack clock.
    // Keep update-owned legs through an ordinary attack's stop and recovery.
    var wkPose = key === 'wukong' && XY.wukongGround && XY.wukongGround.get(G, h);
    if (wkPose && XY.wukongGroundArt) {
      var wkShield = XY.shieldUI && XY.shieldUI.isShieldOnly(G, h);
      var wkUpper = null;
      if (activeWildAttack) {
        // Each real sweep reads the one event-aged state; body keeps its pose facing.
        var wkElapsed = Math.max(0, st.t || 0);
        var wkImpact = st.impactKind === 'primary' || st.impactKind === 'reverse';
        var wkRearward = wkImpact && Number.isFinite(st.impactAngle) && Math.cos(st.impactAngle) * wkPose.face < 0;
        wkUpper = wkElapsed + 1e-9 < 167 ? (wkRearward ? 'upperBackhand' : 'upperStrike') :
          wkElapsed + 1e-9 < 334 ? 'upperRecover' : null;
      } else if (a.anim === 'atk' && a.i === 6) {
        // Keep legacy preparation only. Legacy7 is not proof of a real hit.
        wkUpper = 'upperRaise';
      }
      var wkDraw = XY.wukongGroundArt.draw(c, wkPose, x, y + r * .85, r, h.hurtT > .05 && !wkShield, wkUpper);
      if (wkDraw.ok) {
        h._drawBox = Object.assign(wkDraw.bounds, { originY: h.y, frameKey: boxKey });
        h._wildTop = wkDraw.bounds.y;
        h._ultNormalBody = { height: r * 4.14, frameKey: boxKey, footOffset: y + r * .85 - h.y };
        S.drawn++; var wkAnim = wkPose.moving ? 'walk' : 'idle'; S.stats[wkAnim]++;
        S.last = { id: key, anim: 'ground-' + wkAnim, frame: 0, left: wkPose.face < 0, hero: h.i, t: rt, ink: true, layered: true, upperAction: wkUpper || 'upper' };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        return true;
      }
    }
    // Bajie's legs keep their committed pose through ordinary attacks and stops.
    // Only the upper material follows the existing wildState; exclusive owners stay unchanged.
    var bjPose = key === 'bajie' && XY.bajieGround && XY.bajieGround.get(G, h);
    if (bjPose && XY.bajieGroundArt) {
      var bjShield = XY.shieldUI && XY.shieldUI.isShieldOnly(G, h);
      // Read the already-advanced original wildState once; no second attack clock.
      var bjUpper = null;
      if (activeWildAttack) {
        var bjElapsed = Math.max(0, st.t || 0);
        bjUpper = bjElapsed + 1e-9 < 167 ? 'upperStrike' :
          bjElapsed + 1e-9 < 334 ? 'upperRecover' : 'upperWindup';
      } else if (a.anim === 'atk' && a.i === 6) {
        // Keep the existing preparation upper without replacing committed legs.
        bjUpper = 'upperWindup';
      }
      var bjDraw = XY.bajieGroundArt.draw(c, bjPose, x, y + r * .85, r, h.hurtT > .05 && !bjShield, bjUpper);
      if (bjDraw.ok) {
        h._drawBox = Object.assign(bjDraw.bounds, { originY: h.y, frameKey: boxKey });
        h._wildTop = bjDraw.bounds.y;
        h._ultNormalBody = { height: r * 4.584, frameKey: boxKey, footOffset: y + r * .85 - h.y };
        S.drawn++; var bjAnim = bjPose.moving ? 'walk' : 'idle'; S.stats[bjAnim]++;
        S.last = { id: key, anim: 'ground-' + bjAnim, frame: 0, left: bjPose.face < 0, hero: h.i, t: rt, ink: true, layered: true, upperAction: bjUpper };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        return true;
      }
    }
    var legacyMotion = !!(oldOk && set && (atlasAttack || walking || a.anim === 'hit' || h.dash || h.ultPose || (!acting && !attacking &&
      (a.anim === 'idle' || a.anim === 'walk'))));
    if (legacyMotion) wildKind = null;
    // 图集迟到时保持彩色立绘；即使 wild attack 已就绪，也绝不借用另一套灰色人物。
    if (roster && !oldOk) wildKind = S.hd(key) ? 'idle' : null;
    var wantWalk = !!(wildKind === 'idle' && walking);
    if (!wildKind && (groundWalk ? walking : (h.moving || tangStep)) && !acting && a.anim !== 'hit' && a.anim !== 'atk') a = { anim: 'walk', i: walkFrame(gaitPhase), mix: 0 };
    var moving = !wildKind && walking, foot = y + r * 0.85;
    var step = wantWalk ? S.stepPose(h, rt, gaitPhase) : null;
    // 彩色图集本身已有腿部、肩颈和衣摆的动作。配准后不再整身旋转、
    // 蹦跳或缩放，以免走/停/受伤切换时把另一只正弦叠到同一身体上。
    var bobY = step ? -step.bob : 0, lean = step ? step.rot : 0;
    var sy = step ? step.sy : 1, sx = step ? step.sx : 1;
    var hitX = 0, hurt = h.hurtT > 0.05;
    var shieldOnly = XY.shieldUI && XY.shieldUI.isShieldOnly(G, h);
    // 受击仍染红并轻微退让一次；旧的 90rad/s 来回震动和整身压扁会
    // 使持续走位的角色反复抽动，也会突然改变已经对齐的脚底/胸部。
    if (hurt && (!(h._inkHurtSeen > 0.05) || h.hurtT > h._inkHurtSeen + 0.02)) {
      h._inkHitAt = rt; h._inkHitDir = mir ? 1 : -1;
    }
    h._inkHurtSeen = h.hurtT || 0;
    if (hurt && h._inkHitAt != null) {
      var hitAge = Math.max(0, rt - h._inkHitAt);
      if (hitAge < 0.12) hitX = (h._inkHitDir || 1) * r * 0.035 * (1 - hitAge / 0.12);
    }
    c.save();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.translate(x + hitX + (step ? step.sway : 0), foot + bobY); c.rotate(lean); c.scale(sx * (mir ? -1 : 1), sy);
    h._wildTop = null;
    if (wildKind) {
      var hdIm = S.hd(key);
      if (hdIm && wildKind === 'idle') {
        var dh = r * 3.4 * ((G && G._shotScale) || 1) * ((XY && XY._partyScale) || 1), dw = hdIm.naturalWidth * dh / hdIm.naturalHeight;
        c.drawImage(hdIm, -dw / 2, -dh, dw, dh);
        if (key === 'heyuxi' && mir) readableWord(c, hdIm, YUXI_HD_WORD, 0, 0, -dw / 2, -dh, dh / hdIm.naturalHeight);
        h._drawBox = { x: x + hitX + (step ? step.sway : 0) - dw / 2, y: foot + bobY - dh, w: dw, h: dh, originY: h.y, frameKey: boxKey };
        h._wildTop = foot + bobY - dh;
        c.restore(); c.globalAlpha = 1;
        S.drawn++; S.last = { id: key, anim: wantWalk ? 'hd-walk' : 'hd-idle', frame: 0, left: !!fl, hero: h.i, t: rt, ink: true, wild: false, hd: true };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        return true;
      }
      var wt = wildKind === 'attack' ? (st.t || 0) : (h._wIdleT || 0);
      var clip = XY.wildAnim.clip(key, wildKind);
      var fr = clip ? XY.wildAnim.frameAt(clip, wt) : null;
      var drawn = fr && drawWildFrame(c, key, wildKind, fr.index, kWild, hurt && !shieldOnly);
      if (drawn) {
        h._wildTop = foot + bobY - drawn.anchor[1] * kWild;
        c.restore(); c.globalAlpha = 1;
        var animName = wildKind === 'attack' ? 'atk' : 'idle';
        S.stats[animName]++; S.drawn++;
        S.last = { id: key, anim: wildKind === 'attack' ? 'wild-atk' : 'wild-idle', frame: fr.index, left: !!fl, hero: h.i, t: rt, ink: true, wild: true };
        (S.lastBy || (S.lastBy = {}))[h.i] = S.last;
        S.frames[key + ':' + S.last.anim + ':' + fr.index] = 1;
        return true;
      }
    }
    if (!oldOk || !set) { c.restore(); c.globalAlpha = 1; return false; }
    var k = kOld;
    var legRig = walking && d.normalWalkRegistration !== 'authored' && !h.mounted && !h.ridden && !(h.def && h.def.xid) && LEG_RIG[key];
    var legTravel = legRig ? r * .7 : 0;
    h._legPose = null;
    // 用实际平移、旋转、缩放与镜像后的图集矩形求外包框；待机两帧交叉淡化时取并集。
    var fitKey = fl && d.L ? key + '_L' : key;
    var authored = d.normalRegistration === 'authored';
    var authoredWalk = d.normalWalkRegistration === 'authored';
    var walkFit = e.ink && !authored && !authoredWalk && WALK_FIT[fitKey], idleFit = e.ink && !authored && IDLE_FIT[fitKey];
    var bodyPivot = e.ink && !authored && BODY_PIVOT[fitKey] || 0;
    var contentBounds = d.normalBounds && d.normalBounds[fl && d.L ? 'L' : 'R'];
    var walkBounds = authoredWalk && d.normalWalkBounds && d.normalWalkBounds[fl && d.L ? 'L' : 'R'];
    function frameAt(i) {
      var wb = i >= 2 && i <= 5 && walkBounds && walkBounds[i - 2];
      var f = set[i], fit = i < 2 ? idleFit && idleFit[i] : walkFit && i >= 2 && i <= 5 && walkFit[i - 2];
      if (!f || (!fit && !bodyPivot && !contentBounds && !wb)) return f;
      var fs = fit ? fit[0] : 1, dx = (fit ? fit[1] : 0) + bodyPivot, dy = fit ? fit[2] : 0;
      var out = [f[0], f[1], f[2], f[3], f[4] - dx / fs, f[5] - dy / fs, fs];
      if (contentBounds) out[7] = contentBounds[i];
      if (wb) out[7] = wb;
      return out;
    }
    // 彩色待机的两张原图包含不同的武器轮廓，慢速叠化会画出双棍/双盾。
    // 站住时用清晰的第0帧，地面移动仍完整播放2–5四张走帧。
    var stillIdle = a.anim === 'idle' && !!e.ink;
    var boxFrames = a.anim === 'idle' ? (stillIdle ? [frameAt(0)] : [frameAt(0), frameAt(1)]) : [frameAt(a.i) || frameAt(0)];
    var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    var boxCos = Math.cos(lean), boxSin = Math.sin(lean), boxSx = sx * (mir ? -1 : 1);
    var boxTx = x + hitX + (step ? step.sway : 0), boxTy = foot + bobY;
    boxFrames.forEach(function (f) {
      if (!f) return;
      var fk = k * (f[6] || 1);
      var b = f[7], xx = b ? [(b[0] - f[4]) * fk, (b[0] + b[2] - f[4]) * fk] : [-f[4] * fk, (f[2] - f[4]) * fk];
      var yy = b ? [(b[1] - f[5]) * fk, (b[1] + b[3] - f[5]) * fk] : [-f[5] * fk, (f[3] - f[5]) * fk];
      xx.forEach(function (px) { yy.forEach(function (py) {
        var bx = boxTx + boxCos * boxSx * px - boxSin * sy * py;
        var by = boxTy + boxSin * boxSx * px + boxCos * sy * py;
        left = Math.min(left, bx); right = Math.max(right, bx);
        top = Math.min(top, by); bottom = Math.max(bottom, by);
      }); });
    });
    if (legRig) { left -= legTravel; right += legTravel; }
    h._drawBox = isFinite(left) ? { x: left, y: top, w: right - left, h: bottom - top, originY: h.y, frameKey: boxKey } : null;
    function one(i, alpha, tinted) {
      var f = frameAt(i); if (!f) return;
      var fk = k * (f[6] || 1), dw = f[2] * fk, dh = f[3] * fk;
      c.globalAlpha = alpha;
      var image = tinted ? tint(key, fl && d.L ? 'L' : 'R', i, e, f) : e.img;
      if (legRig && i >= 2 && i <= 5) {
        // Local X follows the mirrored body. A support foot travels backwards;
        // turning never mirrors the health/name or the body anchor itself.
        var pose = walkingLegs(c, image, tinted ? 0 : f[0], tinted ? 0 : f[1], f[2], f[3], -f[4] * fk, -f[5] * fk, dw, dh, legRig, gaitPhase, legTravel, 1);
        h._legPose = { phase: gaitPhase, feet: pose };
      } else c.drawImage(image, tinted ? 0 : f[0], tinted ? 0 : f[1], f[2], f[3], -f[4] * fk, -f[5] * fk, dw, dh);
      if (key === 'heyuxi' && e.ink && mir && YUXI_WORD[i]) {
        readableWord(c, image, YUXI_WORD[i], tinted ? 0 : f[0], tinted ? 0 : f[1], -f[4] * fk, -f[5] * fk, fk);
      }
    }
    if (a.anim === 'idle') { one(0, 1); if (!stillIdle) { one(1, a.mix); S.frames[key + ':idle:1'] = 1; } }
    else { one(a.i, 1); if ((a.anim === 'hit' || hurt) && !shieldOnly) one(a.i, 1, true); }
    c.restore(); c.globalAlpha = 1;
    S.stats[a.anim]++; S.drawn++;
    S.last = { id: key, anim: a.anim, frame: a.i, left: !!fl, hero: h.i, t: rt, ink: !!e.ink };
    (S.lastBy || (S.lastBy = {}))[h.i] = S.last;                  // v0.8.1：每个角色最近一次画的帧（所有英雄都画 Q 版后，S.last 只是“最后画的那个”）
    S.frames[key + ':' + a.anim + ':' + a.i] = 1;
    return true;
  };
  if (XY.CHIBI) S.preload(); else setTimeout(function () { if (XY.CHIBI) S.preload(); }, 0);
})();
// 菜单 / 卡片用的静态立绘：画 Q 版第 0 帧（待机），脚底在 (x, foot)，站高 h 像素；返回是否画出
XY.chibi.portrait = function (c, id, x, foot, h, alpha) {
  var ink = XY.chibi.useInk && XY.CHIBI_INK && XY.CHIBI_INK[id], d = ink || (XY.CHIBI && XY.CHIBI[id]); if (!d || (XY.isHidden && XY.isHidden(id))) return false;
  var stand = ink ? (XY.CHIBI_INK_STAND || XY.CHIBI_STAND) : XY.CHIBI_STAND;
  var e = (function () { if (!XY._cbMenu) XY._cbMenu = {}; var m = XY._cbMenu[id]; if (!m) { m = XY._cbMenu[id] = { img: new Image() }; m.img.src = d.src; } return m; })();
  if (!(e.img.complete && e.img.naturalWidth > 0)) return false;
  var f = d.fr[0], b = d.normalBounds && d.normalBounds.R && d.normalBounds.R[0];
  var k = h / (b ? b[3] : stand), baseY = b ? b[1] + b[3] : f[5];
  c.save(); c.globalAlpha = alpha === undefined ? 1 : alpha; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(e.img, f[0], f[1], f[2], f[3], x - f[4] * k, foot - baseY * k, f[2] * k, f[3] * k); c.restore(); return true;
};
