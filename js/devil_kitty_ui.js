/* Devil Kitty 浏览器接法：登场、狂暴、变身 mp4、活动弹窗、专属装备。
 * 素材目录 assets/devil-kitty/（art.json 指明可替换的立绘与变身视频）。
 */
(function () {
  'use strict';
  var API = window.XY_DEVIL_KITTY;
  var XY = window.XY;
  if (!API || !XY || !XY.step || !XY.save) return;

  var BASE = 'assets/devil-kitty/';
  var art = { version: 9, stage1: 'stage1.webp', form: 'form.webp', stage1Cut: 'stage1-cut.webp', formCut: 'form-cut.webp', formVideo: 'form.mp4', introScene: 'intro-scene.webp', formDurationMs: 12000, frameCount: 31, formName: '九尾咆哮' };
  var imgs = {};
  var vid = null;
  var frameImgs = [];
  var armed = { meta: false, frames: false };
  var session = loadSession();
  var fpsN = 0, fpsT = 0, fpsV = 0;
  var boxes = {};
  var inkCache = {};
  var BRUSH_FACE = 'DKBrush, serif';

  function loadSession() {
    try {
      var s = JSON.parse(window.sessionStorage.getItem('xy_dk_auto') || '{}');
      return { auto: { start: !!s.start, levels: !!s.levels, closed: !!s.closed } };
    } catch (e) { return API.freshSession(); }
  }
  function saveSession() {
    try { window.sessionStorage.setItem('xy_dk_auto', JSON.stringify(session.auto || {})); } catch (e) {}
  }
  function fonts() {
    if (document.getElementById('dk-font')) return;
    var st = document.createElement('style');
    st.id = 'dk-font';
    st.textContent = '@font-face{font-family:DKBrush;src:url("assets/fonts/MaShanZheng-Regular.ttf") format("truetype");font-display:swap}'
      + '@font-face{font-family:DKLatin;src:url("assets/fonts/GreatVibes-Regular.ttf") format("truetype");font-display:swap}';
    document.head.appendChild(st);
    if (document.fonts && document.fonts.load) {
      document.fonts.load('64px DKBrush').catch(function () {});
      document.fonts.load('64px DKLatin').catch(function () {});
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { inkCache = {}; });
  }
  function img(key, file) {
    var o = imgs[key];
    if (!o) {
      o = imgs[key] = new Image();
      o.src = BASE + file;
    }
    return o.complete && o.naturalWidth ? o : null;
  }
  function anyImg(key, src) {
    if (!src) return null;
    var o = imgs[key];
    if (!o) {
      o = imgs[key] = new Image();
      o.src = src;
    }
    return o.complete && o.naturalWidth ? o : null;
  }
  function loadArt() {
    fetch(BASE + 'art.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      art = j;
      if (j.formDurationMs) API.setFormDuration(j.formDurationMs / 1000);
    }).catch(function () {});
    fetch(BASE + 'animation.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j) DK.anim = j;
    }).catch(function () {});
  }
  /* 首页不取图。点开活动才取立绘；开战才取变身视频；变身当帧才取 31 张序列。 */
  function arm(level) {
    if (!armed.meta) { armed.meta = true; loadArt(); }
    if (level === 'battle' || level === 'form') ensureVideo();
    if (level === 'form') armFrames();
  }
  function armFrames() {
    if (armed.frames) return;
    armed.frames = true;
    var n = art.frameCount || 31, i, im, num;
    frameImgs = [];
    for (i = 1; i <= n; i++) {
      im = new Image();
      num = (i < 10 ? '00' : i < 100 ? '0' : '') + i;
      im.src = BASE + 'frames/frame-' + num + '.webp';
      frameImgs.push(im);
    }
  }
  function frameAtRun(run) {
    if (!frameImgs.length) return null;
    var dur = (run && (run.formDur || API.formDuration())) || 5.583;
    var k = 1 - Math.max(0, Math.min(1, (run.formLeft || 0) / dur));
    var i = Math.min(frameImgs.length - 1, Math.floor(k * frameImgs.length));
    var im = frameImgs[i];
    return im && im.complete && im.naturalWidth ? im : null;
  }
  function ensureVideo() {
    if (vid) return vid;
    vid = document.createElement('video');
    vid.src = BASE + (art.formVideo || 'form.mp4') + '?v=' + (art.version || 9);
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.preload = 'auto';
    vid.style.display = 'none';
    vid._dkBad = false;
    vid._dkSeen = -1;
    applyVideoMute();
    vid.addEventListener('error', function () { vid._dkBad = true; });
    vid.addEventListener('loadedmetadata', function () { noteVideoDuration(); });
    vid.addEventListener('ended', function () { vid._dkEnded = true; });
    document.body.appendChild(vid);
    return vid;
  }
  function videoFrame() {
    return !!(vid && !vid._dkBad && vid.readyState >= 2 && vid.videoWidth > 0 && !vid.ended);
  }
  function videoSoundOff() {
    return !!(XY.audio && XY.audio.mute);
  }
  function applyVideoMute() {
    if (!vid) return;
    var off = videoSoundOff();
    vid.muted = off;
    vid.volume = off ? 0 : 1;
  }
  function noteVideoDuration() {
    if (!vid) return;
    var d = vid.duration;
    if (d && isFinite(d) && d >= 0.5 && d <= 20) API.setFormDuration(d);
  }
  /* 计时跟着视频走：播到哪，剩余时间就不短于视频剩下的部分，ended 才收场。视频卡住时不再把计时往回拨。 */
  function followVideo(run) {
    if (!vid || vid._dkBad || !run || run.formLeft <= 0) return;
    applyVideoMute();
    noteVideoDuration();
    var d = vid.duration;
    var t = isFinite(vid.currentTime) ? vid.currentTime : 0;
    if (d && isFinite(d) && d >= 0.5 && d <= 20) {
      run.formDur = d;
      var advanced = t > (vid._dkSeen || -1) + 0.02;
      if (t < 0.3 || advanced) {
        var remain = Math.max(0, d - t);
        if (run.formLeft < remain) run.formLeft = remain;
        vid._dkSeen = t;
      }
    }
    if (vid.ended || vid._dkEnded) run.formLeft = Math.min(run.formLeft, 0.0001);
  }
  function startVideo() {
    var v = ensureVideo();
    v._dkEnded = false;
    v._dkSeen = -1;
    applyVideoMute();
    try { v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      if (!v.muted) {
        v.muted = true;
        var again = v.play();
        if (again && again.catch) again.catch(function () {});
      }
    });
  }
  function stopVideo() {
    if (!vid) return;
    try { vid.pause(); } catch (e) {}
  }

  function env() {
    var q = '';
    try { q = location.search || ''; } catch (e) {}
    var query = null;
    if (/[?&]cato=0(?:&|#|$)/.test(q)) query = '0';
    else if (/[?&]cato=1(?:&|#|$)/.test(q)) query = '1';
    var saved = null;
    var d = XY.save.data && XY.save.data.devilKitty;
    if (d && typeof d === 'object') {
      if (d.on === false) saved = false;
      else if (d.on === true) saved = true;
    }
    return { testBuild: !!XY.TEST_BUILD, query: query, saved: saved };
  }
  function eventOn() { return API.enabled(env()); }
  function setEventOn(on) {
    if (!XY.save.data) return;
    XY.save.data.devilKitty = { id: API.ID, name: API.NAME, on: !!on };
    if (XY.save.touch) XY.save.touch();
    if (XY.save.flush) XY.save.flush();
  }
  function tutCtx() {
    var G = window.__xy && window.__xy.G;
    var t = XY.save.data && XY.save.data.tutorial;
    return { inTutorial: !!(G && G.tut), tutorialDone: !!(t && t.done === true) };
  }
  function gear() { return API.readGear(XY.save.data || {}); }
  function saveGear(g) {
    API.writeGear(XY.save.data, g);
    if (XY.save.touch) XY.save.touch();
    if (XY.save.flush) XY.save.flush();
  }
  function revealed(id) {
    var hidden = !!(XY.isHidden && XY.isHidden(id));
    var owned = !!(hidden && XY.save && XY.save.spRealOwned && XY.save.spRealOwned(id));
    return API.heroRevealed(id, hidden, owned);
  }
  function cardPool() {
    return (XY.SPECIALS || []).map(function (d) { return d.id; }).filter(revealed);
  }
  function gearIds() {
    return API.GEAR.filter(function (g) { return revealed(g.owner); }).map(function (g) { return g.id; });
  }

  function appOf() { return (window.__xy && window.__xy.app) || null; }
  function hit(x, y, w, h, act, ex) {
    var o = { x: x, y: y, w: w, h: h, act: act };
    if (ex) for (var k in ex) o[k] = ex[k];
    if (XY.ui && XY.ui.hits) XY.ui.hits.push(o);
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function latin(c, s, x, y, px, col, align) {
    c.font = px + 'px DKLatin, KaiTi, serif';
    c.fillStyle = col;
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }
  function cursive(c, s, x, y, px, col, align) {
    brush(c, s, x, y, px, col, align || 'left');
  }
  function kai(c, s, x, y, px, col, align) {
    brush(c, s, x, y, px, col, align || 'left');
  }
  function paper(c, x, y, w, h) {
    rr(c, x, y, w, h, 8);
    var g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#fbf6ea');
    g.addColorStop(0.5, '#f4ead2');
    g.addColorStop(1, '#efe0c0');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#2a2118';
    c.lineWidth = 2.2;
    c.stroke();
    c.strokeStyle = 'rgba(168,48,32,0.55)';
    c.lineWidth = 1;
    rr(c, x + 6, y + 6, w - 12, h - 12, 4);
    c.stroke();
  }
  function redSeal(c, x, y, w, h, label, sub) {
    rr(c, x, y, w, h, Math.min(18, h * 0.35));
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#d24a34');
    g.addColorStop(1, '#a6281c');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = 'rgba(255,220,170,0.85)';
    c.lineWidth = 1.4;
    rr(c, x + 3, y + 3, w - 6, h - 6, Math.min(14, h * 0.28));
    c.stroke();
    latin(c, sub ? '' : '', x, y, 1, '#fff', 'center');
    if (sub) {
      cursive(c, label, x + w / 2, y + h * 0.4, Math.min(26, h * 0.42), '#fff6e4', 'center');
      latin(c, sub, x + w / 2, y + h * 0.74, Math.min(16, h * 0.26), '#ffe1c2', 'center');
    } else {
      cursive(c, label, x + w / 2, y + h / 2, Math.min(28, h * 0.46), '#fff6e4', 'center');
    }
  }
  function dot(c, x, y) {
    c.beginPath();
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.fillStyle = '#c4321c';
    c.fill();
    c.strokeStyle = '#fff6e4';
    c.lineWidth = 1.5;
    c.stroke();
  }
  function drawContain(c, im, x, y, w, h) {
    var ir = im.naturalWidth / im.naturalHeight, br = w / h, dw = w, dh = h, dx = x, dy = y;
    if (ir > br) { dh = h; dw = h * ir; dx = x - (dw - w) / 2; }
    else { dw = w; dh = w / ir; dy = y - (dh - h) / 2; }
    c.drawImage(im, dx, dy, dw, dh);
  }
  function portrait(c, which, x, y, w, h, bare) {
    var im = img(which, which === 'form' ? (art.form || 'form.webp') : (art.stage1 || 'stage1.webp'));
    if (bare) {
      c.save();
      c.beginPath();
      c.rect(x, y, w, h);
      c.clip();
      if (im) drawContain(c, im, x, y, w, h);
      else cursive(c, '猫', x + w / 2, y + h / 2, Math.min(w, h) * 0.28, '#3a2a1c', 'center');
      c.globalCompositeOperation = 'destination-in';
      var rg = c.createRadialGradient(x + w * 0.5, y + h * 0.42, Math.min(w, h) * 0.08, x + w * 0.5, y + h * 0.48, Math.max(w, h) * 0.78);
      rg.addColorStop(0, 'rgba(0,0,0,1)');
      rg.addColorStop(0.7, 'rgba(0,0,0,1)');
      rg.addColorStop(0.9, 'rgba(0,0,0,0.35)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg;
      c.fillRect(x, y, w, h);
      var fadeFrom = bare === 'field' ? 0.52 : 0.8;
      var fade = c.createLinearGradient(x, y + h * fadeFrom, x, y + h);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(bare === 'field' ? 0.28 : 0.55, 'rgba(0,0,0,0.85)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fade;
      c.fillRect(x, y, w, h);
      c.restore();
      return;
    }
    c.save();
    rr(c, x, y, w, h, 6);
    c.fillStyle = '#f7f1e4';
    c.fill();
    c.clip();
    if (im) drawContain(c, im, x, y, w, h);
    else cursive(c, '猫', x + w / 2, y + h / 2, Math.min(w, h) * 0.4, '#3a2a1c', 'center');
    c.restore();
    c.strokeStyle = '#2a2118';
    c.lineWidth = 2;
    rr(c, x, y, w, h, 6);
    c.stroke();
  }

  function ctxFrom(G) {
    return {
      enabled: eventOn(),
      mainline: API.isMainline(G),
      phase: G.tang && G.tang.phase,
      restT: G.tang ? G.tang.restT : 0,
      levelId: G.levelId || 1
    };
  }
  function ensureRun(G) {
    if (!G.dkRun) G.dkRun = API.freshRun();
    var live = API.formDuration();
    if (!G.dkRun.formDur || live > G.dkRun.formDur) G.dkRun.formDur = live;
    return G.dkRun;
  }

  function roadStand(G) {
    var camp = G.camp || { x: 0, y: 0 };
    var rt = G.rt;
    if (rt && rt.total && XY.routeProject && XY.routeAt) {
      var proj = XY.routeProject(rt, camp.x, camp.y);
      var dir = (proj.s || 0) > rt.total * 0.72 ? -1 : 1;
      var s = Math.max(40, Math.min(rt.total - 40, (proj.s || 0) + dir * 1180));
      var p = XY.routeAt(rt, s);
      if (p && Math.hypot(p.x - camp.x, p.y - camp.y) > 420) return { x: p.x, y: p.y };
    }
    return { x: camp.x - 680, y: camp.y + 30 };
  }
  function makeUnit(G, run) {
    var u = run.unit;
    var spot = roadStand(G);
    var e = {
      id: (G.nextId = (G.nextId || 1) + 1),
      type: 'cato_evil',
      dk: true,
      x: spot.x,
      y: spot.y,
      r: 30,
      hp: u.hp,
      maxHp: u.maxHp,
      speed: 62,
      dmg: 0,
      kx: 0, ky: 0, flash: 0, atkT: 2, burnT: 0, burnDps: 0, burnAcc: 0,
      slowT: 0, slowF: 0, stunT: 0, dead: false, wob: 1,
      elem: 'water', markT: 0, toCamp: false, retarget: 0, th: null, shootT: 9,
      def: {
        name: API.HERO, elite: false, boss: false, denBoss: false, etower: false, fly: false,
        hp: u.hp, dmg: 0, r: 30, speed: 62, color: '#241c18', dark: '#8d1f18',
        elem: 'water', dtype: 'magic', pdef: 0.08, mdef: 0.16, knockRes: 0.55,
        xp: 40, coin: 0, coinP: 0
      }
    };
    G.enemies.push(e);
    G.dkUnit = e;
    return e;
  }
  function syncUnit(G) {
    var e = G.dkUnit, u = G.dkRun && G.dkRun.unit;
    if (!e || !u || e.dead) return;
    e.hp = Math.max(1, u.hp);
    e.maxHp = u.maxHp;
    e.def.name = u.phase >= 2 ? API.HERO2 : API.HERO;
    e.def.elite = false;
    e.dkPhase = u.phase;
    if (u.dead) e.hp = 0;
  }
  function applyRage(G) {
    var run = G.dkRun;
    var list = G.enemies || [];
    var i, e;
    if (!run || !run.rageOn) {
      for (i = 0; i < list.length; i++) if (list[i]._dkRage) API.clearMobRage(list[i]);
      return;
    }
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (!e || e.dead || e.dk) continue;
      if (e.def && (e.def.denBoss || e.def.boss)) {
        if (API.shouldEnrageBoss(e) && XY.enrageBoss) XY.enrageBoss(G, e);
      } else {
        API.applyMobRage(e);
        if (e.atkT > 0.8 / API.MOB_MUL + 0.04 && e.atkT <= 0.86) e.atkT = 0.8 / API.MOB_MUL;
      }
    }
  }
  function nearestHero(G, e) {
    var best = null, bd = 1e15, i, h, d;
    for (i = 1; i < (G.heroes || []).length; i++) {
      h = G.heroes[i];
      if (!h || h.down) continue;
      d = (h.x - e.x) * (h.x - e.x) + (h.y - e.y) * (h.y - e.y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }
  function steer(G, e, dt) {
    var tang = G.heroes && G.heroes[0];
    if (tang && !tang.down) {
      var dx = e.x - tang.x, dy = e.y - tang.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      if (l < 220) { e.x += dx / l * 90 * dt; e.y += dy / l * 90 * dt; return; }
    }
    var h = nearestHero(G, e);
    if (!h) return;
    var hx = h.x - e.x, hy = h.y - e.y, hl = Math.sqrt(hx * hx + hy * hy) || 1;
    if (hl > 200) { e.x += hx / hl * 70 * dt; e.y += hy / hl * 70 * dt; }
    e.face = Math.atan2(hy, hx);
  }
  function strike(G, e, mul) {
    var h = nearestHero(G, e);
    var u = G.dkRun.unit;
    if (!h || !u || !XY.hurtHeroBy) return;
    XY.hurtHeroBy(G, h, Math.max(1, Math.round(u.dmg * (mul || 1))), false, undefined, 'magic', 'water');
    if (XY.ring) XY.ring(G, h.x, h.y, 36, '#8d1f18', 0.25);
  }
  function giveDrop(G, drop) {
    if (!drop) return;
    var d = XY.SP_BY && XY.SP_BY[drop.card];
    if (XY.save.addSpCard) XY.save.addSpCard(drop.card, 1);
    var gearName = '';
    if (drop.gear) {
      var g = gear();
      API.grantGear(g, drop.gear, 1);
      saveGear(g);
      gearName = (API.gearById[drop.gear] && API.gearById[drop.gear].name) || drop.gear;
    }
    var items = [];
    if (drop.gear && API.gearById[drop.gear] && revealed(API.gearById[drop.gear].owner)) items.push({ kind: 'gear', id: drop.gear });
    if (drop.card && revealed(drop.card)) items.push({ kind: 'card', id: drop.card, name: d ? d.name : drop.card });
    G.dkDrops = { card: drop.card, cardName: d ? d.name : drop.card, gear: drop.gear, gearName: gearName, items: items, i: 0, t: 0 };
    var msg = '击败「' + API.HERO2 + '」，获得角色卡「' + (d ? d.name : drop.card) + '」' + (gearName ? '，和专属「' + gearName + '」' : '');
    if (XY.banner) XY.banner(G, msg, 4.2);
    if (XY.toast) XY.toast(G, msg);
  }
  function applyGear(G) {
    if (!G || G._dkGearDone || !G.heroes) return;
    var id = G.special;
    if (!id) { G._dkGearDone = true; return; }
    var h = null, i;
    for (i = 0; i < G.heroes.length; i++) {
      var x = G.heroes[i];
      if (x && (x.id === id || (x.def && x.def.id === id))) h = x;
    }
    if (!h) return;
    API.applyEffects(h, API.effectsOf(gear(), id));
    G._dkGearDone = true;
  }

  function consume(G, events) {
    var i;
    for (i = 0; i < events.length; i++) {
      if (events[i] === 'spawn') {
        makeUnit(G, G.dkRun);
        applyRage(G);
        if (XY.banner) XY.banner(G, API.NAME + ' · ' + API.HERO + ' 登场', 3.2);
      }
      if (events[i] === 'formed') {
        stopVideo();
        syncUnit(G);
        applyRage(G);
        if (XY.banner) XY.banner(G, API.HERO2 + ' · ' + (art.formName || '九尾咆哮'), 3);
      }
      if (events[i] === 'attack' && G.dkUnit && !G.dkUnit.dead) strike(G, G.dkUnit, 1);
      if (events[i] === 'skill' && G.dkUnit && !G.dkUnit.dead) strike(G, G.dkUnit, G.dkRun.unit.phase >= 2 ? 1.35 : 1.15);
    }
  }
  function lockCam(G) {
    if (!G || !G.dkCamLock || !G.dkUnit || G.dkUnit.dead) return;
    var app = appOf();
    var shift = 110;
    if (app && app.lh) shift = Math.max(80, Math.min(170, app.lh * 0.14));
    G.cam.x = G.dkUnit.x;
    G.cam.y = G.dkUnit.y - shift;
  }
  function lowBurst(G) {
    var u = G.dkRun && G.dkRun.unit, e = G.dkUnit;
    if (!u || u.dead || u.burstUsed || u.hp > u.maxHp * 0.4) return;
    u.burstUsed = true;
    var i;
    for (i = 1; i < G.heroes.length; i++) {
      var h = G.heroes[i];
      if (!h || h.down) continue;
      if (Math.hypot(h.x - e.x, h.y - e.y) < 200 && XY.hurtHeroBy) XY.hurtHeroBy(G, h, Math.round(u.dmg * 0.85), false, undefined, 'magic', 'water');
    }
    if (XY.ring) XY.ring(G, e.x, e.y, 160, '#8d1f18', 0.4);
  }

  function hold(G, dt) {
    var run = ensureRun(G);
    if (G.mode === 'cards') { G.dkSkip = false; return; }
    if (G.dkSkip && run.introLeft > 0) {
      API.skipIntro(run, G.levelId || 1);
      G.dkSkip = false;
      G.dkHold = false;
      return;
    }
    if (G.dkSkip && run.formLeft > 0) {
      API.skipForm(run);
      G.dkSkip = false;
      stopVideo();
      syncUnit(G);
      applyRage(G);
      G.dkHold = false;
      if (XY.banner) XY.banner(G, API.HERO2, 2.4);
      return;
    }
    if (run.formLeft > 0) followVideo(run);
    var res = API.tickRun(run, ctxFrom(G), dt);
    G.dkRun = res.run;
    consume(G, res.events);
    syncUnit(G);
    G.dkHold = !!res.run.hold;
    if (!G.dkHold) stopVideo();
  }
  function advanceDrop(G) {
    var d = G.dkDrops;
    if (!d) return;
    var items = d.items || [];
    var next = (d.i || 0) + 1;
    if (next >= items.length) G.dkDrops = null;
    else { d.i = next; d.t = 0; }
  }
  function afterStep(G, dt) {
    if (!G || G.mode !== 'play') return;
    applyGear(G);
    if (G.dkHold) return;
    var run = ensureRun(G);
    var res = API.tickRun(run, ctxFrom(G), dt);
    G.dkRun = res.run;
    G.dkHold = !!res.run.hold;
    consume(G, res.events);
    if (G.dkHold) return;
    applyRage(G);
    if (G.dkUnit && !G.dkUnit.dead && run.unit && !run.unit.dead) {
      steer(G, G.dkUnit, dt);
      lowBurst(G);
      syncUnit(G);
    }
    if (G.dkDrops && !G.dkDrops.pin) {
      if (G.dkSkip) { G.dkSkip = false; advanceDrop(G); }
      else {
        G.dkDrops.t += dt;
        if (G.dkDrops.t >= 4.2) advanceDrop(G);
      }
    }
  }

  function interceptDeath(G, e) {
    if (!e || !e.dk) return false;
    var run = ensureRun(G);
    if (!run.unit) return false;
    if (run.formLeft > 0 || run.introLeft > 0 || run.unit.immune) {
      e.dead = false;
      e.hp = Math.max(1, run.unit.hp || 1);
      return true;
    }
    if (run.unit.phase < 2) {
      API.hurtUnit(run, 1e12);
      e.dead = false;
      e.hp = 1;
      G.dkHold = true;
      G.dkRun = run;
      startVideo();
      return true;
    }
    run.unit.hp = 0;
    run.unit.dead = true;
    var drop = API.onDefeat(run, Math.random, cardPool(), gearIds());
    giveDrop(G, drop);
    return false;
  }

  function w2s(G, app, x, y) {
    var vw = (G.view && G.view.w) || app.lw, vh = (G.view && G.view.h) || app.lh;
    return { x: vw / 2 + (x - G.cam.x), y: vh / 2 + (y - G.cam.y) };
  }
  function markFrame() {
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (!fpsT) fpsT = now;
    fpsN++;
    if (now - fpsT >= 500) { fpsV = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; }
  }

  function boxHit(a, b) {
    return !!(a && b && a.w && b.w && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
  }
  /* 出发页的框记在屏幕像素上，这层字是按战场坐标画的，先换算再比。 */
  function worldBox(box, u) {
    if (!box || !box.w) return null;
    return { x: box.x * u, y: box.y * u, w: box.w * u, h: box.h * u };
  }
  function departBlocked(box, u) {
    var geo = XY.depart && XY.depart.geo, lists = [], i, j, list;
    if (box.y < 56 * u) return true;
    if (geo) {
      if (geo.cards) lists.push(geo.cards);
      if (geo.btns) lists.push(geo.btns);
      if (geo.go) lists.push([geo.go]);
      if (geo.more) lists.push([geo.more]);
    }
    if (XY.departCards) lists.push(XY.departCards);
    for (i = 0; i < lists.length; i++) {
      list = lists[i];
      for (j = 0; j < list.length; j++) if (boxHit(box, worldBox(list[j], u))) return true;
    }
    return false;
  }
  function departPair(app) {
    var W = app.lw, H = app.lh, z = app.zoom || 1, u = 1 / z, geo = XY.depart && XY.depart.geo;
    var bw = 72, bh = 40, gap = 8, i;
    var go = geo && geo.go ? worldBox(geo.go, u) : null;
    var strip = geo && geo.strip ? worldBox({ x: 0, y: geo.strip.y, w: 1, h: geo.strip.h }, u) : null;
    var cands = [];
    if (go) {
      cands.push({ x: go.x - bw * 2 - gap - 12, y: go.y + (go.h - bh) / 2 });
      cands.push({ x: go.x, y: go.y - bh - 10 });
    }
    if (strip) cands.push({ x: 16, y: strip.y - bh - 10 });
    if (strip && go) cands.push({ x: Math.max(16, go.x - bw * 2 - gap - 12), y: strip.y - bh - 10 });
    cands.push({ x: W - bw * 2 - gap - 16, y: 72 * u });
    cands.push({ x: 16, y: 72 * u });
    for (i = 0; i < cands.length; i++) {
      var x = Math.max(8, Math.min(W - bw * 2 - gap - 8, cands[i].x));
      var y = Math.max(8, Math.min(H - bh - 8, cands[i].y));
      var a = { x: x, y: y, w: bw, h: bh };
      var b = { x: x + bw + gap, y: y, w: bw, h: bh };
      if (!departBlocked(a, u) && !departBlocked(b, u)) return [a, b];
    }
    var y2 = strip ? Math.max(8, strip.y - bh - 10) : 72 * u;
    return [{ x: 16, y: y2, w: bw, h: bh }, { x: 16 + bw + gap, y: y2, w: bw, h: bh }];
  }
  function buttonBox(app) {
    var W = app.lw, H = app.lh, port = H > W * 1.05;
    if (app.screen === 'start') {
      if (port) return { x: W - 132, y: 28, w: 112, h: 52 };
      return { x: W - 156, y: 14, w: 136, h: 56 };
    }
    if (port) return { x: 12, y: H - 64, w: 112, h: 52 };
    if (app.screen === 'levels') return departPair(app)[0];
    return { x: 16, y: Math.max(8, H - 210), w: 72, h: 40 };
  }
  function gearBox(app, btn) {
    var port = app.lh > app.lw * 1.05;
    if (app.screen !== 'levels') return null;
    if (port) return { x: 132, y: app.lh - 64, w: 112, h: 52 };
    return departPair(app)[1];
  }

  function textBox(c, s, x, y, size) {
    c.save();
    c.font = size + 'px "Ma Shan Zheng","KaiTi",serif';
    var w = c.measureText(s).width;
    c.restore();
    return { x: x, y: y - size * 0.55, w: w, h: size * 1.15, text: s };
  }
  function paintButton(c, app) {
    var b = buttonBox(app);
    boxes.event = b;
    brush(c, '活动', b.x + 8, b.y + b.h * 0.55, 22, '#24180f', 'left');
    if (!API.gachaClaimed(XY.save.data)) dot(c, b.x + b.w - 8, b.y + 8);
    hit(b.x, b.y, b.w, b.h, 'dkOpen');
    var marks = [{ act: 'dkOpen', box: b, text: textBox(c, '活动', b.x + 8, b.y + b.h * 0.55, 22) }];
    if (app.screen === 'levels') {
      var g = gearBox(app, b);
      boxes.gear = g;
      brush(c, '专属', g.x + 8, g.y + g.h * 0.55, 22, '#24180f', 'left');
      hit(g.x, g.y, g.w, g.h, 'dkGear');
      marks.push({ act: 'dkGear', box: g, text: textBox(c, '专属', g.x + 8, g.y + g.h * 0.55, 22) });
    }
    XY.departTags = marks;
  }
  function spArt(id) {
    if (!revealed(id)) return null;
    if (id === 'qinba' || id === 'traders18') {
      var local = img('hero-' + id, 'heroes/' + id + '.webp');
      if (local) return local;
    }
    if (!id || !XY.bgArt) return null;
    try { return XY.bgArt(id); } catch (e) { return null; }
  }
  function gearArt(id) {
    if (!id) return null;
    var piece = API.gearById[id];
    if (piece && !revealed(piece.owner)) return null;
    return img('gear-' + id, 'gear/' + id + '.webp');
  }
  /* 未领取：可抽池每人一张。可见特殊角色 9 位，猫叔在隐藏名单里，不进十连。
   * 以前用下标取余把池子凑成 10 张，会多画一张 Phyrex，那不是抽卡结果。
   * 真正的十连（XY.gacha10.roll）允许重复：重复的角色卡会计入升级。已领取后按实际抽出的 10 张画，重复就重复。 */
  function gachaPack() {
    var g = XY.save.data && XY.save.data.gacha10;
    var claimed = API.gachaClaimed(XY.save.data);
    if (claimed && g && g.pulls && g.pulls.length) return { claimed: true, ids: g.pulls.filter(revealed) };
    return { claimed: false, ids: (XY.SPECIALS || []).map(function (d) { return d.id; }).filter(revealed) };
  }
  function inkWash(c, im, x, y, w, h, fallback) {
    c.save();
    if (im) drawContain(c, im, x, y, w, h);
    else if (fallback) cursive(c, fallback, x + w / 2, y + h * 0.46, Math.min(42, w * 0.34), '#3a2a1c', 'center');
    c.restore();
  }
  function namePlate(c, s, x, y, maxW) {
    var size = 16, font;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    while (size > 10) {
      font = 'bold ' + size + 'px KaiTi, STKaiti, "Noto Serif CJK SC", serif';
      c.font = font;
      if (c.measureText(s).width <= maxW - 12) break;
      size -= 1;
    }
    var tw = Math.min(maxW, c.measureText(s).width + 16);
    var th = size + 10;
    rr(c, x - tw / 2, y - th / 2, tw, th, 2);
    c.fillStyle = 'rgba(251,246,234,0.92)';
    c.fill();
    c.lineWidth = 1.1;
    c.strokeStyle = '#2a2118';
    c.stroke();
    c.fillStyle = '#24180f';
    c.fillText(s, x, y + 0.5);
  }
  function brushReady() {
    return !!(document.fonts && document.fonts.check && document.fonts.check('32px ' + BRUSH_FACE));
  }
  function inkCanvas(s, size, col) {
    var ready = brushReady();
    var key = size + '\n' + (col || '') + '\n' + s;
    if (ready && inkCache[key]) return inkCache[key];
    var parts = String(s).split('·');
    var i;
    for (i = 0; i < parts.length; i++) parts[i] = parts[i].replace(/^\s+|\s+$/g, '');
    if (!parts.length) parts = [''];
    var probe = document.createElement('canvas').getContext('2d');
    probe.font = size + 'px ' + BRUSH_FACE;
    var widths = [], tw = 0, gap = size * 0.36;
    for (i = 0; i < parts.length; i++) {
      widths.push(parts[i] ? probe.measureText(parts[i]).width : 0);
      tw += widths[i] + (i ? gap : 0);
    }
    var pad = Math.ceil(size * 0.28);
    var cnv = document.createElement('canvas');
    cnv.width = Math.max(1, Math.ceil(tw) + pad * 2);
    cnv.height = Math.max(1, Math.ceil(size * 1.32));
    var g = cnv.getContext('2d');
    g.font = size + 'px ' + BRUSH_FACE;
    g.fillStyle = col || '#24180f';
    g.textBaseline = 'middle';
    var cy = cnv.height * 0.52, x0 = pad;
    for (i = 0; i < parts.length; i++) {
      if (i) {
        g.beginPath();
        g.arc(x0 + gap * 0.5, cy, Math.max(1.15, size * 0.055), 0, Math.PI * 2);
        g.fill();
        x0 += gap;
      }
      if (parts[i]) g.fillText(parts[i], x0, cy);
      x0 += widths[i];
    }
    cnv._tw = tw;
    cnv._pad = pad;
    if (ready) inkCache[key] = cnv;
    return cnv;
  }
  function brush(c, s, x, y, size, col, align) {
    if (s === undefined || s === null || s === '') return;
    var im = inkCanvas(String(s), size, col || '#24180f');
    var dx = x - im._pad;
    if (align === 'center') dx = x - im._pad - im._tw / 2;
    else if (align === 'right') dx = x - im._pad - im._tw;
    c.drawImage(im, dx, y - im.height / 2);
  }
  /* 右停把原图被裁开的浅色署名抹进周围的纸色，再把两行书法压上去。只动很亮的笔画，不铺底板。 */
  function erasePaintedName(c, x, y, w, h) {
    var t = c.getTransform ? c.getTransform() : null;
    var sx = t ? t.a : 1, sy = t ? t.d : 1, ox = t ? t.e : 0, oy = t ? t.f : 0;
    var canvas = c.canvas;
    var x0 = Math.max(0, Math.floor(x * sx + ox));
    var y0 = Math.max(0, Math.floor(y * sy + oy));
    var w0 = Math.min(canvas.width - x0, Math.ceil(w * sx));
    var h0 = Math.min(canvas.height - y0, Math.ceil(h * sy));
    if (w0 < 4 || h0 < 4) return;
    var img;
    try { img = c.getImageData(x0, y0, w0, h0); } catch (e) { return; }
    var d = img.data, n = w0 * h0, mask = new Uint8Array(n), i, p, r, g, b, lum;
    for (i = 0; i < n; i++) {
      p = i * 4; r = d[p]; g = d[p + 1]; b = d[p + 2];
      lum = (r + g + b) / 3;
      if (lum > 165 && r > 175 && g > 140 && r + 10 > b) mask[i] = 1;
    }
    var dil = new Uint8Array(n), yy, xx, y1, x1, y2, x2;
    for (yy = 0; yy < h0; yy++) {
      for (xx = 0; xx < w0; xx++) {
        if (!mask[yy * w0 + xx]) continue;
        y1 = yy > 2 ? yy - 2 : 0; y2 = yy + 2 < h0 ? yy + 2 : h0 - 1;
        x1 = xx > 2 ? xx - 2 : 0; x2 = xx + 2 < w0 ? xx + 2 : w0 - 1;
        for (y1; y1 <= y2; y1++) for (x1 = xx > 2 ? xx - 2 : 0; x1 <= x2; x1++) dil[y1 * w0 + x1] = 1;
      }
    }
    var valid = new Uint8Array(n);
    for (i = 0; i < n; i++) valid[i] = dil[i] ? 0 : 1;
    var steps = [32, 16, 8, 4, 2, 1], dirs = [0, 1, 0, -1, 1, 0, -1, 0, 1, 1, 1, -1, -1, 1, -1, -1];
    var si, step, di, dy, dx, ny, nx, i2, p2;
    for (si = 0; si < steps.length; si++) {
      step = steps[si];
      for (di = 0; di < dirs.length; di += 2) {
        dy = dirs[di] * step; dx = dirs[di + 1] * step;
        for (yy = 0; yy < h0; yy++) {
          ny = yy + dy;
          if (ny < 0 || ny >= h0) continue;
          for (xx = 0; xx < w0; xx++) {
            i = yy * w0 + xx;
            if (valid[i]) continue;
            nx = xx + dx;
            if (nx < 0 || nx >= w0) continue;
            i2 = ny * w0 + nx;
            if (!valid[i2]) continue;
            p = i * 4; p2 = i2 * 4;
            d[p] = d[p2]; d[p + 1] = d[p2 + 1]; d[p + 2] = d[p2 + 2];
            valid[i] = 1;
          }
        }
      }
    }
    c.putImageData(img, x0, y0);
  }
  function inkLine(c, text, x, y, size, alpha) {
    var halo = Math.max(2, size * 0.045);
    var fat = Math.max(1, size * 0.016);
    var k, ox, oy;
    c.save();
    c.globalAlpha = Math.max(0, alpha) * 0.16;
    for (k = 0; k < 8; k++) {
      ox = Math.cos(k * Math.PI / 4) * halo;
      oy = Math.sin(k * Math.PI / 4) * halo;
      brush(c, text, x + ox, y + oy, size, '#1a100c', 'center');
    }
    c.restore();
    c.save();
    c.globalAlpha = alpha;
    for (k = 0; k < 4; k++) {
      ox = (k % 2 ? fat : -fat);
      oy = (k < 2 ? fat : -fat);
      brush(c, text, x + ox, y + oy, size, '#f4ecdc', 'center');
    }
    brush(c, text, x, y, size, '#f6f0e4', 'center');
    c.restore();
  }
  function brushFit(c, s, x, y, maxW, size, col, align) {
    var px = size;
    var im = inkCanvas(String(s), px, col || '#24180f');
    while (px > 11 && im._tw > maxW) {
      px -= 1;
      im = inkCanvas(String(s), px, col || '#24180f');
    }
    var dx = x - im._pad;
    if ((align || 'center') === 'center') dx = x - im._pad - im._tw / 2;
    else if (align === 'right') dx = x - im._pad - im._tw;
    c.drawImage(im, dx, y - im.height / 2);
    return px;
  }
  function brushVert(c, s, x, y, size, col) {
    var i, ch, step = size * 0.98, yy = y;
    for (i = 0; i < s.length; i++) {
      ch = s.charAt(i);
      if (ch === ' ') continue;
      if (ch === '·' || ch === '・') {
        c.beginPath();
        c.fillStyle = col || '#24180f';
        c.arc(x, yy, Math.max(1.4, size * 0.07), 0, Math.PI * 2);
        c.fill();
        yy += step * 0.48;
        continue;
      }
      brush(c, ch, x, yy, size, col, 'center');
      yy += step;
    }
    return yy - y;
  }
  function cinnabar(c, x, y, ch) {
    c.save();
    c.beginPath();
    c.arc(x, y, 11, 0, Math.PI * 2);
    c.fillStyle = '#8d1f18';
    c.fill();
    c.restore();
    brush(c, ch || '印', x, y, 13, '#f4e6d4', 'center');
  }
  function mostlyCjk(s) {
    var i, n = 0;
    for (i = 0; i < s.length; i++) if (s.charCodeAt(i) > 127) n++;
    return n >= s.length * 0.6;
  }
  function cardName(c, s, x, y, w, h) {
    if (mostlyCjk(s) && s.length <= 6) {
      var size = Math.max(13, Math.min(20, (h - 28) / s.length));
      var top = y + Math.max(12, (h - s.length * size) * 0.55);
      var used = brushVert(c, s, x + 16, top, size, '#24180f');
      cinnabar(c, x + 16, top + used + 8, '印');
    } else {
      var px = brushFit(c, s, x + w / 2, y + h - 18, w - 28, Math.min(20, w * 0.14), '#24180f', 'center');
      cinnabar(c, x + w - 16, y + h - 18, '印');
      void px;
    }
  }
  function drawGrid(c, ids, x, y, w, h, claimed) {
    var n = ids.length;
    if (!n || w < 40 || h < 40) return;
    var cols = n > 6 ? (w > h * 1.2 ? 5 : 3) : (n > 3 ? 3 : n);
    if (w < 420) cols = 3;
    var rows = Math.ceil(n / cols);
    var gap = 8;
    var cw = Math.floor((w - gap * (cols - 1)) / cols);
    var ch = Math.floor((h - gap * (rows - 1)) / rows);
    var i;
    for (i = 0; i < n; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var inRow = row === rows - 1 ? n - row * cols : cols;
      var rowW = inRow * cw + (inRow - 1) * gap;
      var ox = x + Math.floor((w - rowW) / 2);
      var cx = ox + col * (cw + gap);
      var cy = y + row * (ch + gap);
      if (cx < x) cx = x;
      if (cx + cw > x + w) cx = x + w - cw;
      var id = ids[i];
      var d = XY.SP_BY && XY.SP_BY[id];
      var nm = d ? d.name : (id || '卡');
      inkWash(c, spArt(id), cx, cy, cw, ch, nm.slice(0, 1));
      cardName(c, nm, cx, cy, cw, ch);
      if (claimed) brush(c, '已领', cx + cw - 28, cy + 14, 12, '#8d1f18', 'center');
    }
  }
  function paintGacha(c, x, y, w, h, pack) {
    brush(c, '十连抽卡', x + 2, y + 16, 28, '#7d1c14', 'left');
    brush(c, pack.claimed ? '已入册' : ('池中 ' + pack.ids.length + ' 位'), x + 132, y + 16, 16, '#5c4a36', 'left');
    var top = y + 36;
    var btnH = 46;
    drawGrid(c, pack.ids, x, top, w, Math.max(60, h - 36 - btnH - 8), pack.claimed);
    var bw = Math.min(150, w - 4), bx = x, by = y + h - btnH;
    if (pack.claimed) brush(c, '已领取', bx + 36, by + btnH / 2, 22, '#6a5438', 'left');
    else {
      redSeal(c, bx, by, bw, btnH, '去抽卡');
      hit(bx, by, bw, btnH, 'dkDraw');
    }
  }
  function storyLines() {
    return [
      '休息约 20 秒后，猫叔在主线登场。',
      '登场后狂暴四十五秒。小怪跑得更快、打得更疼，大约加半；洞主仍是狂暴加倍。',
      '第一次倒下不掉东西，化成九尾，成为猫叔 · 魔化。',
      '魔化后生命加六成，伤害加四成，出招更快。',
      '只有打败魔化之身才掉落：必得一张角色卡，另有过半机会再得一件专属。',
      '没打败也不算输。副本和洞主战不会遇见他。'
    ];
  }
  function paintLines(c, lines, x, y, maxW, maxH) {
    var size = maxW < 260 ? 16 : 18;
    var guard = 0;
    var blocks, lh, i, para, rest, line, cut, k;
    function width(str, px) {
      c.save();
      c.font = px + 'px ' + BRUSH_FACE;
      var w = c.measureText(str).width;
      c.restore();
      return w;
    }
    function layout(px) {
      var out = [];
      lines.forEach(function (text) {
        rest = text;
        while (rest) {
          line = rest;
          while (line.length > 1 && width(line, px) > maxW) line = line.slice(0, -1);
          if (line.length < rest.length) {
            cut = line.length;
            for (k = line.length - 1; k > line.length * 0.5; k--) {
              if ('，。、；'.indexOf(line.charAt(k)) >= 0) { cut = k + 1; break; }
            }
            line = rest.slice(0, cut);
            rest = rest.slice(cut);
          } else rest = '';
          out.push(line);
        }
      });
      return out;
    }
    blocks = layout(size);
    lh = size + 7;
    while (blocks.length * lh > maxH && size > 13 && guard++ < 8) {
      size -= 1;
      blocks = layout(size);
      lh = size + 6;
    }
    var yy = y + size * 0.55;
    for (i = 0; i < blocks.length; i++) {
      if (yy > y + maxH - size * 0.3) break;
      brush(c, blocks[i], x, yy, size, '#3a2e22', 'left');
      yy += lh;
    }
  }
  function captionOn(c, x, y, w, h, name, handle) {
    var target = Math.max(80, w * 0.36);
    var size = Math.round(Math.min(h * 0.2, Math.max(28, w * 0.2)));
    var col = '#f4ead4';
    var im = inkCanvas(name, size, col);
    var guard = 0;
    while (im._tw < target && size < h * 0.24 && guard++ < 16) {
      size += 4;
      im = inkCanvas(name, size, col);
    }
    while (im._tw > w * 0.82 && size > 22) {
      size -= 2;
      im = inkCanvas(name, size, col);
    }
    var nameY = y + Math.round(h * 0.62);
    brush(c, name, x + w / 2 + 2, nameY + 3, size, 'rgba(16,10,6,0.78)', 'center');
    brush(c, name, x + w / 2, nameY, size, col, 'center');
    var sealX = x + w / 2 + im._tw / 2 + Math.max(14, size * 0.28);
    if (sealX < x + w - 12) cinnabar(c, sealX, nameY, '印');
    if (handle) brush(c, handle, x + w / 2, nameY + size * 0.58, Math.max(16, Math.round(size * 0.3)), '#f0d7a4', 'center');
  }
  function vertStory(c, s, x, y, maxW, h) {
    var size = 16, step, per, cols, need, i, col, row, yy, ch;
    function layout(px) {
      step = px * 1.08;
      per = Math.max(1, Math.floor((h - px * 1.4) / step));
      cols = Math.ceil(s.length / per);
      need = cols * (px + 8);
      return need;
    }
    while (size >= 13 && layout(size) > maxW) size -= 1;
    layout(size);
    for (i = 0; i < s.length; i++) {
      col = Math.floor(i / per);
      row = i % per;
      ch = s.charAt(i);
      yy = y + row * step + size * 0.5;
      if (ch === '·') {
        c.beginPath();
        c.fillStyle = '#3a2e22';
        c.arc(x + col * (size + 7) + size * 0.5, yy, Math.max(1.3, size * 0.07), 0, Math.PI * 2);
        c.fill();
      } else brush(c, ch, x + col * (size + 7) + size * 0.5, yy, size, '#3a2e22', 'center');
    }
    return Math.max(size + 8, cols * (size + 7));
  }
  function sharedGround(c, x, y, w) {
    var g = c.createRadialGradient(x + w / 2, y, 6, x + w / 2, y, w * 0.55);
    g.addColorStop(0, 'rgba(36,28,22,0.32)');
    g.addColorStop(0.5, 'rgba(36,28,22,0.1)');
    g.addColorStop(1, 'rgba(36,28,22,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x + w / 2, y, w * 0.48, Math.max(10, w * 0.07), 0, 0, Math.PI * 2);
    c.fill();
  }
  function paintStory(c, x, y, w, h) {
    var lines = storyLines();
    var gap = 8, textW, left, cardW, textH, top, cardH, foot;
    if (w > h && w >= 640) {
      textW = Math.max(188, Math.min(300, Math.floor(w * 0.36)));
      paintLines(c, lines, x + 2, y + 12, textW - 8, h - 20);
      left = x + textW + 4;
      cardW = Math.floor((w - textW - gap - 8) / 2);
      foot = y + h - 6;
      sharedGround(c, left, foot, cardW * 2 + gap);
      blitCut(c, 'stage1cut', art.stage1Cut || 'stage1-cut.webp', left + cardW * 0.5, foot, h - 18, cardW - 8);
      captionOn(c, left, y, cardW, h, API.HERO, '');
      blitCut(c, 'formcut', art.formCut || 'form-cut.webp', left + cardW + gap + cardW * 0.5, foot, h - 10, cardW - 8);
      captionOn(c, left + cardW + gap, y, cardW, h, API.HERO2, '');
      return;
    }
    textH = Math.min(Math.max(118, h * 0.38), h * 0.46);
    paintLines(c, lines, x + 2, y + 2, w - 6, textH);
    top = y + textH + 8;
    cardH = Math.max(72, h - (top - y));
    cardW = Math.floor((w - gap) / 2);
    foot = top + cardH - 2;
    sharedGround(c, x, foot, w);
    blitCut(c, 'stage1cut', art.stage1Cut || 'stage1-cut.webp', x + cardW * 0.5, foot, cardH, cardW - 6);
    captionOn(c, x, top, cardW, cardH, API.HERO, '');
    blitCut(c, 'formcut', art.formCut || 'form-cut.webp', x + cardW + gap + cardW * 0.5, foot, cardH, cardW - 6);
    captionOn(c, x + cardW + gap, top, cardW, cardH, API.HERO2, '');
  }
  function paintPopup(c, app) {
    var W = app.lw, H = app.lh, port = H > W * 1.05 || W < 760;
    c.save();
    c.fillStyle = 'rgba(246,239,224,0.55)';
    c.fillRect(0, 0, W, H);
    var m = port ? 28 : 22;
    var x = m, y = port ? 28 : 16, w = W - m * 2, h = H - y - (port ? 28 : 14);
    paper(c, x, y, w, h);
    c.save();
    c.beginPath();
    c.rect(x + 6, y + 6, w - 12, h - 12);
    c.clip();
    brush(c, '特别活动', x + (port ? 16 : 24), y + (port ? 28 : 36), port ? 26 : 32, '#3a2a1c', 'left');
    brush(c, '猫叔', x + (port ? 150 : 180), y + (port ? 28 : 36), port ? 28 : 36, '#7d1c14', 'left');
    var closeX = x + w - (port ? 72 : 84), closeY = y + 12, closeW = port ? 56 : 66, closeH = 44;
    redSeal(c, closeX, closeY, closeW, closeH, '关');
    hit(0, 0, W, H, 'dkClose');
    var pack = gachaPack();
    pack.ids.forEach(function (id) { spArt(id); });
    var on = eventOn();
    var top = y + (port ? 52 : 64);
    var bodyH = h - (top - y) - 10;
    if (!on) paintGacha(c, x + 14, top, w - 28, bodyH, pack);
    else if (port) {
      var gh = Math.floor(bodyH * 0.46);
      paintGacha(c, x + 10, top, w - 20, gh, pack);
      paintStory(c, x + 10, top + gh + 8, w - 20, bodyH - gh - 8);
    } else {
      var lw = Math.floor((w - 36) * 0.5);
      paintGacha(c, x + 14, top, lw, bodyH, pack);
      paintStory(c, x + 22 + lw, top, w - lw - 36, bodyH);
    }
    hit(closeX, closeY, closeW, closeH, 'dkClose');
    c.restore();
    c.restore();
    boxes.popup = { x: x, y: y, w: w, h: h };
  }
  function paintIntro(c, app) {
    var W = app.lw, H = app.lh;
    var w = Math.min(260, W * 0.34), h = Math.min(108, H * 0.2);
    var x = 18, y = Math.max(72, H - h - 24);
    c.save();
    paper(c, x, y, w, h);
    brush(c, '猫叔登场', x + 18, y + h * 0.42, 26, '#24180f', 'left');
    brush(c, '点一下就过去', x + 18, y + h * 0.74, 14, '#5c4a38', 'left');
    c.restore();
    hit(0, 0, W, H, 'dkSkip');
    return;
    if (false) {
      var W0 = app.lw, H0 = app.lh, port = H0 > W0 * 1.05;
      var ir = scene.naturalWidth / scene.naturalHeight;
      var dw, dh, dx, dy, u = 0;
      c.save();
      c.fillStyle = '#d8c6a4';
      c.fillRect(0, 0, W0, H0);
      if (port) {
        /* 竖屏全程按高度铺满，先停在左「猫叔」，再平移到右「猫叔 · 魔化」。 */
        dh = H0;
        dw = H0 * ir;
        dy = 0;
        var elapsed = (API.INTRO_T || 4.2) - ((run && run.introLeft) || 0);
        if (elapsed > 1.2) {
          var p = Math.max(0, Math.min(1, (elapsed - 1.2) / 2.5));
          u = p * p * (3 - 2 * p);
        }
        var leftStart = 0.02;
        /* 右停从「猫」起笔，整行「猫叔登场」在屏内，头脸和地面仍在。前面的「特别活动」整段留在画面外。 */
        var rightStart = 972 / 1920;
        var start = leftStart + (rightStart - leftStart) * u;
        dx = -dw * start;
      } else if (ir > W0 / H0) {
        dh = H0; dw = H0 * ir; dy = 0; dx = (W0 - dw) / 2;
      } else {
        dw = W0; dh = W0 / ir; dx = 0; dy = (H0 - dh) / 2;
      }
      c.drawImage(scene, dx, dy, dw, dh);
      if (port && u < 0.96) {
        /* 左停原图标题在画面外。固定一行在左上，按宽度缩小，不跟着平移。 */
        var tf = u < 0.72 ? 1 : Math.max(0, (0.96 - u) / 0.24);
        c.save();
        c.globalAlpha = tf;
        var ts = Math.round(Math.min(W0 * 0.105, H0 * 0.058));
        brushFit(c, '特别活动 · 猫叔登场', W0 * 0.04, Math.max(ts * 0.78, H0 * 0.048), W0 * 0.92, ts, '#1c140e', 'left');
        c.restore();
      }
      if (port && u > 0.82) {
        var nf = Math.max(0, Math.min(1, (u - 0.82) / 0.12));
        erasePaintedName(c, 0, H0 * 0.66, W0, H0 * 0.32);
        /* 字号对齐左停原图「猫叔」。署名用同一支粗墨，略小，和左边的落款一样。 */
        var nameSize = Math.round(H0 * 0.117);
        var yName = H0 * 0.72;
        inkLine(c, '猫叔', W0 / 2, yName, nameSize, nf);
        inkLine(c, '· 魔化', W0 / 2, yName + nameSize * 0.92, nameSize, nf);
        inkLine(c, API.HANDLE, W0 / 2, yName + nameSize * 1.72, Math.round(nameSize * 0.48), nf);
      }
      c.restore();
      hit(0, 0, W0, H0, 'dkSkip');
      return;
    }
    var W = app.lw, H = app.lh, port = H > W * 1.05;
    c.save();
    c.fillStyle = 'rgba(246,239,224,0.82)';
    c.fillRect(0, 0, W, H);
    var m = port ? 6 : 12;
    var x = m, y = m, w = W - m * 2, hh = H - m * 2;
    paper(c, x, y, w, hh);
    brush(c, '特别活动 · 猫叔 登场', x + w / 2, y + (port ? 36 : 46), port ? 34 : 52, '#24180f', 'center');
    var top = y + (port ? 68 : 84);
    var gap = port ? 8 : 12;
    var availH = hh - (top - y) - 10;
    var stage = img('stage1', art.stage1 || 'stage1.webp');
    var form = img('form', art.form || 'form.webp');
    if (port) {
      var each = Math.floor((availH - gap) / 2);
      inkWash(c, stage, x + 8, top, w - 16, each, '猫');
      captionOn(c, x + 8, top, w - 16, each, API.HERO, '');
      inkWash(c, form, x + 8, top + each + gap, w - 16, each, '化');
      captionOn(c, x + 8, top + each + gap, w - 16, each, API.HERO2, '');
    } else {
      var cw = Math.floor((w - 24 - gap) / 2);
      inkWash(c, stage, x + 10, top, cw, availH, '猫');
      captionOn(c, x + 10, top, cw, availH, API.HERO, '');
      inkWash(c, form, x + 10 + cw + gap, top, cw, availH, '化');
      captionOn(c, x + 10 + cw + gap, top, cw, availH, API.HERO2, '');
    }
    c.restore();
  }
  function splatField(c, W, H, p) {
    var i, n = Math.floor(26 + p * 70);
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (i = 0; i < n; i++) {
      var ang = i * 2.399963;
      var rad = (0.08 + (i % 13) * 0.05) * Math.max(W, H) * (0.22 + p * 0.85);
      var x = W / 2 + Math.cos(ang) * rad * 0.92;
      var y = H / 2 + Math.sin(ang * 0.97) * rad * 0.62;
      var len = (28 + (i % 8) * 22) * (0.55 + p);
      c.strokeStyle = 'rgba(28,22,16,' + (0.16 + (i % 4) * 0.08) + ')';
      c.lineWidth = 1.4 + (i % 5) * 1.5;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(ang + 1) * len, y + Math.sin(ang) * len * 0.55, x + Math.cos(ang) * len * 1.5, y + Math.sin(ang * 1.15) * len);
      c.stroke();
      if (i % 4 === 0) {
        var r = (46 + (i % 5) * 28) * (0.45 + p);
        var g = c.createRadialGradient(x, y, r * 0.08, x, y, r);
        g.addColorStop(0, 'rgba(28,22,16,' + (0.14 + (i % 3) * 0.04) + ')');
        g.addColorStop(1, 'rgba(28,22,16,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }
  function blitCut(c, key, file, cx, foot, ht, maxW) {
    var im = img(key, file);
    if (!im) return false;
    var ir = im.naturalWidth / im.naturalHeight;
    var h = ht, w = h * ir;
    if (maxW && w > maxW) { w = maxW; h = w / ir; }
    c.drawImage(im, cx - w / 2, foot - h, w, h);
    return true;
  }
  function paintPaperField(c, W, H) {
    var im = img('obtainPaper', 'obtain/paper.webp');
    if (im) c.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, W, H);
    else {
      c.fillStyle = '#f4ead6';
      c.fillRect(0, 0, W, H);
    }
  }
  var seamBuf = null;
  /* 视频边缘盖一层同一张宣纸，再按墨晕挖淡，避免硬边，也不另铺深色。 */
  function paperSeam(c, W, H, x, y, w, h, side) {
    var along = (side === 'left' || side === 'right') ? w : h;
    var band = Math.max(8, Math.min(18, along * 0.012));
    var sx = x, sy = y, sw = w, sh = h;
    if (side === 'top') sh = band;
    else if (side === 'bottom') { sy = y + h - band; sh = band; }
    else if (side === 'left') sw = band;
    else { sx = x + w - band; sw = band; }
    var bw = Math.max(1, Math.ceil(sw)), bh = Math.max(1, Math.ceil(sh));
    if (!seamBuf) seamBuf = document.createElement('canvas');
    if (seamBuf.width !== bw || seamBuf.height !== bh) {
      seamBuf.width = bw;
      seamBuf.height = bh;
    }
    var g2 = seamBuf.getContext('2d');
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.globalCompositeOperation = 'source-over';
    g2.clearRect(0, 0, bw, bh);
    var im = img('obtainPaper', 'obtain/paper.webp');
    if (im) g2.drawImage(im, sx / W * im.naturalWidth, sy / H * im.naturalHeight, Math.max(1, sw / W * im.naturalWidth), Math.max(1, sh / H * im.naturalHeight), 0, 0, bw, bh);
    else {
      g2.fillStyle = '#f4ead6';
      g2.fillRect(0, 0, bw, bh);
    }
    g2.globalCompositeOperation = 'destination-in';
    var fade = (side === 'top') ? g2.createLinearGradient(0, 0, 0, bh)
      : (side === 'bottom') ? g2.createLinearGradient(0, bh, 0, 0)
      : (side === 'left') ? g2.createLinearGradient(0, 0, bw, 0)
      : g2.createLinearGradient(bw, 0, 0, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.5, 'rgba(0,0,0,0.28)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = fade;
    g2.fillRect(0, 0, bw, bh);
    g2.globalCompositeOperation = 'source-over';
    c.drawImage(seamBuf, sx, sy, sw, sh);
    var ink = (side === 'top') ? c.createLinearGradient(0, sy, 0, sy + sh)
      : (side === 'bottom') ? c.createLinearGradient(0, sy + sh, 0, sy)
      : (side === 'left') ? c.createLinearGradient(sx, 0, sx + sw, 0)
      : c.createLinearGradient(sx + sw, 0, sx, 0);
    ink.addColorStop(0, 'rgba(72,50,32,0.16)');
    ink.addColorStop(1, 'rgba(72,50,32,0)');
    c.fillStyle = ink;
    c.fillRect(sx, sy, sw, sh);
  }
  function paintFormVideo(c, W, H) {
    var vr = vid.videoWidth > 0 && vid.videoHeight > 0 ? vid.videoWidth / vid.videoHeight : 16 / 9;
    var view = W / Math.max(1, H);
    var dw, dh, dx, dy;
    /* 正好 16:9 的桌面横屏仍按原来铺满。更窄的用宽度铺满、上下留宣纸；更宽的（手机横屏）用高度铺满、左右留宣纸，字才不会被裁。 */
    if (view < vr - 0.02) {
      dw = W;
      dh = W / vr;
      dx = 0;
      dy = (H - dh) / 2;
      paintPaperField(c, W, H);
      c.drawImage(vid, dx, dy, dw, dh);
      paperSeam(c, W, H, dx, dy, dw, dh, 'top');
      paperSeam(c, W, H, dx, dy, dw, dh, 'bottom');
      return;
    }
    if (view > vr + 0.08) {
      dh = H;
      dw = H * vr;
      dy = 0;
      dx = (W - dw) / 2;
      paintPaperField(c, W, H);
      c.drawImage(vid, dx, dy, dw, dh);
      paperSeam(c, W, H, dx, dy, dw, dh, 'left');
      paperSeam(c, W, H, dx, dy, dw, dh, 'right');
      return;
    }
    if (view > vr) {
      dw = W; dh = W / vr; dx = 0; dy = (H - dh) / 2;
    } else {
      dh = H; dw = H * vr; dy = 0; dx = (W - dw) / 2;
    }
    c.fillStyle = '#16120e';
    c.fillRect(0, 0, W, H);
    c.drawImage(vid, dx, dy, dw, dh);
  }
  function paintForm(c, app, run) {
    var W = app.lw, H = app.lh, port = H > W;
    if (videoFrame()) {
      var bw = Math.min(420, W - 40), bh = Math.min(200, H - 80), x = (W - bw) / 2, y = (H - bh) / 2;
      c.save();
      c.fillStyle = 'rgba(246,239,226,0.42)';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#f6efe2';
      c.beginPath();
      c.moveTo(x + 12, y + 4);
      c.quadraticCurveTo(x + bw * 0.5, y - 6, x + bw - 10, y + 8);
      c.lineTo(x + bw - 4, y + bh - 10);
      c.quadraticCurveTo(x + bw * 0.4, y + bh + 6, x + 8, y + bh - 6);
      c.closePath();
      c.fill();
      c.fillStyle = '#a42d19';
      c.font = '32px "Ma Shan Zheng","KaiTi",serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('猫叔魔化', W / 2, y + bh * 0.38);
      c.fillStyle = '#24180f';
      c.font = '18px "Ma Shan Zheng","KaiTi",serif';
      c.fillText('点一下继续', W / 2, y + bh * 0.68);
      c.restore();
      hit(0, 0, W, H, 'dkSkip');
      return;
    }
    var dur = (run && (run.formDur || API.formDuration())) || 9;
    var p = 1 - Math.max(0, Math.min(1, (run.formLeft || 0) / dur));
    c.save();
    c.fillStyle = '#f6efe2';
    c.fillRect(0, 0, W, H);
    splatField(c, W, H, p);
    var fim = img('formcut', art.formCut || 'form-cut.webp');
    var aspect = fim && fim.naturalHeight ? fim.naturalWidth / fim.naturalHeight : 0.84;
    var cx = port ? W * 0.5 : W * 0.56;
    var fitH = (W * (port ? 0.9 : 0.76)) / aspect;
    var room = Math.min(H - (port ? 70 : 36), fitH);
    var foot = Math.min(H - 12, (port ? 58 : 16) + room);
    var ease = function (u) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3); };
    if (p < 0.5) {
      var cover = p < 0.16 ? 0 : (p - 0.16) / 0.34;
      c.save();
      c.globalAlpha = 1 - cover * 0.94;
      blitCut(c, 'stage1cut', art.stage1Cut || 'stage1-cut.webp', cx, foot, room * (port ? 0.96 : 1));
      c.restore();
    }
    if (p > 0.12 && p < 0.62) {
      var k = Math.max(0, Math.min(1, (p - 0.12) / 0.42));
      var rr = H * (0.12 + 0.78 * k);
      var ig = c.createRadialGradient(cx, H * 0.46, rr * 0.08, cx, H * 0.46, rr);
      ig.addColorStop(0, 'rgba(22,16,12,' + (0.08 + 0.42 * k) + ')');
      ig.addColorStop(1, 'rgba(22,16,12,0)');
      c.fillStyle = ig;
      c.beginPath();
      c.arc(cx, H * 0.46, rr, 0, Math.PI * 2);
      c.fill();
    }
    if (p > 0.36) {
      var u = ease((p - 0.36) / 0.4);
      var fh = room * (port ? (0.78 + 0.22 * u) : (0.78 + 0.26 * u));
      c.save();
      c.globalAlpha = Math.min(1, (p - 0.36) / 0.16);
      blitCut(c, 'formcut', art.formCut || 'form-cut.webp', cx, foot, fh);
      c.restore();
    }
    if (p > 0.55) {
      if (port) {
        brush(c, API.HERO2, W / 2, 26, 22, '#24180f', 'center');
        cinnabar(c, W / 2 + 78, 26, '魔');
      } else {
        var nx = Math.max(36, Math.min(W * 0.07, cx - H * 0.46));
        var ny = H * 0.2;
        var used = brushVert(c, API.HERO2, nx, ny, 44, '#24180f');
        cinnabar(c, nx, ny + used + 8, '魔');
      }
    }
    var bw = 110, bh = 44, bx = W - bw - 14, by = H - bh - 12;
    redSeal(c, bx, by, bw, bh, '跳过');
    hit(bx, by, bw, bh, 'dkSkip');
    hit(0, 0, W, H, 'dkSkip');
    c.restore();
  }
  function inkBurst(c, x, y, r, t) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = 'rgba(30,24,18,0.35)';
    c.lineWidth = 2;
    var i;
    for (i = 0; i < 9; i++) {
      c.beginPath();
      c.arc(0, 0, r * (0.25 + (i % 5) * 0.12), i, i + 1.4);
      c.stroke();
    }
    c.strokeStyle = 'rgba(166,40,28,' + (0.25 + 0.25 * Math.sin((t || 0) * 6)) + ')';
    c.lineWidth = 1.5;
    for (i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(i) * r * 0.8, Math.sin(i * 1.3) * r * 0.55);
      c.stroke();
    }
    c.restore();
  }
  function cracks(c, x, y, w, h, k) {
    c.save();
    c.strokeStyle = 'rgba(166,40,28,' + (0.35 + 0.4 * k) + ')';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x + w * 0.5, y + h * 0.2);
    c.lineTo(x + w * 0.62, y + h * 0.45);
    c.lineTo(x + w * 0.48, y + h * 0.7);
    c.moveTo(x + w * 0.62, y + h * 0.45);
    c.lineTo(x + w * 0.78, y + h * 0.58);
    c.stroke();
    c.restore();
  }
  function inkCorners(c, x, y, w, h) {
    var L = Math.min(16, w * 0.14, h * 0.1);
    c.save();
    c.strokeStyle = '#8d1f18';
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y + L); c.lineTo(x, y); c.lineTo(x + L, y);
    c.moveTo(x + w - L, y); c.lineTo(x + w, y); c.lineTo(x + w, y + L);
    c.moveTo(x, y + h - L); c.lineTo(x, y + h); c.lineTo(x + L, y + h);
    c.moveTo(x + w - L, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y + h - L);
    c.stroke();
    c.restore();
  }
  function inkShape(c, kind, w, h) {
    var ink = '#24180f';
    c.save();
    c.strokeStyle = ink;
    c.fillStyle = ink;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(2.2, Math.min(w, h) * 0.035);
    if (kind === 'blade') {
      c.beginPath();
      c.moveTo(w * 0.46, h * 0.82);
      c.lineTo(w * 0.54, h * 0.82);
      c.lineTo(w * 0.52, h * 0.58);
      c.quadraticCurveTo(w * 0.78, h * 0.28, w * 0.62, h * 0.12);
      c.quadraticCurveTo(w * 0.44, h * 0.36, w * 0.42, h * 0.58);
      c.closePath();
      c.fill();
      c.lineWidth = Math.max(3, w * 0.035);
      c.beginPath(); c.moveTo(w * 0.28, h * 0.6); c.lineTo(w * 0.72, h * 0.56); c.stroke();
    } else if (kind === 'page') {
      c.beginPath(); c.moveTo(w * 0.28, h * 0.18); c.lineTo(w * 0.74, h * 0.22); c.lineTo(w * 0.7, h * 0.82); c.lineTo(w * 0.24, h * 0.76); c.closePath(); c.globalAlpha = 0.12; c.fill(); c.globalAlpha = 1; c.stroke();
      c.lineWidth = 1.3; c.beginPath(); c.moveTo(w * 0.34, h * 0.36); c.lineTo(w * 0.64, h * 0.38); c.moveTo(w * 0.34, h * 0.48); c.lineTo(w * 0.6, h * 0.5); c.moveTo(w * 0.34, h * 0.6); c.lineTo(w * 0.58, h * 0.62); c.stroke();
    } else if (kind === 'ribbon') {
      c.lineWidth = Math.max(3, w * 0.05); c.beginPath(); c.moveTo(w * 0.2, h * 0.3); c.quadraticCurveTo(w * 0.55, h * 0.15, w * 0.78, h * 0.38); c.quadraticCurveTo(w * 0.4, h * 0.55, w * 0.28, h * 0.78); c.stroke();
    } else if (kind === 'pouch') {
      c.beginPath(); c.moveTo(w * 0.32, h * 0.32); c.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.68, h * 0.32); c.lineTo(w * 0.72, h * 0.72); c.quadraticCurveTo(w * 0.5, h * 0.86, w * 0.28, h * 0.72); c.closePath(); c.globalAlpha = 0.16; c.fill(); c.globalAlpha = 1; c.stroke();
      c.beginPath(); c.moveTo(w * 0.38, h * 0.32); c.quadraticCurveTo(w * 0.5, h * 0.12, w * 0.62, h * 0.32); c.stroke();
    } else if (kind === 'horn') {
      c.beginPath(); c.moveTo(w * 0.28, h * 0.62); c.quadraticCurveTo(w * 0.48, h * 0.58, w * 0.78, h * 0.28); c.quadraticCurveTo(w * 0.7, h * 0.48, w * 0.42, h * 0.7); c.closePath(); c.fill();
    } else if (kind === 'slip') {
      c.beginPath(); c.moveTo(w * 0.38, h * 0.14); c.lineTo(w * 0.66, h * 0.16); c.lineTo(w * 0.62, h * 0.86); c.lineTo(w * 0.34, h * 0.82); c.closePath(); c.stroke();
      c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * 0.44, h * 0.32); c.lineTo(w * 0.56, h * 0.33); c.moveTo(w * 0.44, h * 0.46); c.lineTo(w * 0.55, h * 0.47); c.stroke();
    } else if (kind === 'pick') {
      c.lineWidth = Math.max(3, w * 0.045); c.beginPath(); c.moveTo(w * 0.58, h * 0.38); c.lineTo(w * 0.4, h * 0.84); c.stroke();
      c.beginPath(); c.moveTo(w * 0.22, h * 0.42); c.quadraticCurveTo(w * 0.5, h * 0.16, w * 0.8, h * 0.36); c.lineWidth = Math.max(4, w * 0.06); c.stroke();
    } else if (kind === 'chip') {
      c.strokeRect(w * 0.28, h * 0.28, w * 0.44, h * 0.4);
      c.lineWidth = 1.4; c.beginPath(); c.moveTo(w * 0.38, h * 0.4); c.lineTo(w * 0.62, h * 0.4); c.moveTo(w * 0.5, h * 0.4); c.lineTo(w * 0.5, h * 0.58); c.stroke();
    } else if (kind === 'frame') {
      c.lineWidth = Math.max(3, w * 0.04); c.strokeRect(w * 0.24, h * 0.2, w * 0.52, h * 0.58);
      c.lineWidth = 1.2; c.strokeRect(w * 0.32, h * 0.3, w * 0.36, h * 0.38);
    } else if (kind === 'stamp') {
      c.fillRect(w * 0.3, h * 0.22, w * 0.4, h * 0.36);
      c.lineWidth = Math.max(3, w * 0.05); c.beginPath(); c.moveTo(w * 0.5, h * 0.58); c.lineTo(w * 0.5, h * 0.84); c.stroke();
    } else if (kind === 'bell') {
      c.beginPath(); c.moveTo(w * 0.32, h * 0.28); c.quadraticCurveTo(w * 0.5, h * 0.7, w * 0.68, h * 0.28); c.quadraticCurveTo(w * 0.5, h * 0.18, w * 0.32, h * 0.28); c.fill();
      c.beginPath(); c.arc(w * 0.5, h * 0.74, Math.min(w, h) * 0.06, 0, Math.PI * 2); c.fill();
    } else if (kind === 'mound') {
      c.beginPath();
      c.moveTo(w * 0.16, h * 0.72);
      c.quadraticCurveTo(w * 0.28, h * 0.48, w * 0.42, h * 0.58);
      c.quadraticCurveTo(w * 0.55, h * 0.3, w * 0.72, h * 0.5);
      c.quadraticCurveTo(w * 0.86, h * 0.42, w * 0.9, h * 0.72);
      c.closePath();
      c.fill();
      c.globalAlpha = 0.35;
      c.beginPath(); c.arc(w * 0.4, h * 0.62, w * 0.05, 0, Math.PI * 2); c.arc(w * 0.62, h * 0.58, w * 0.035, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    } else if (kind === 'brush') {
      c.lineWidth = Math.max(2.5, w * 0.03); c.beginPath(); c.moveTo(w * 0.3, h * 0.78); c.lineTo(w * 0.68, h * 0.22); c.stroke();
      c.beginPath(); c.moveTo(w * 0.6, h * 0.18); c.quadraticCurveTo(w * 0.82, h * 0.16, w * 0.74, h * 0.36); c.quadraticCurveTo(w * 0.64, h * 0.28, w * 0.6, h * 0.18); c.fill();
    } else if (kind === 'cup') {
      c.beginPath(); c.moveTo(w * 0.32, h * 0.32); c.lineTo(w * 0.38, h * 0.7); c.quadraticCurveTo(w * 0.5, h * 0.82, w * 0.62, h * 0.7); c.lineTo(w * 0.68, h * 0.32); c.stroke();
      c.beginPath(); c.moveTo(w * 0.68, h * 0.4); c.quadraticCurveTo(w * 0.84, h * 0.48, w * 0.68, h * 0.58); c.stroke();
    } else if (kind === 'rod') {
      c.lineWidth = Math.max(2.2, w * 0.025); c.beginPath(); c.moveTo(w * 0.3, h * 0.78); c.quadraticCurveTo(w * 0.55, h * 0.4, w * 0.78, h * 0.18); c.stroke();
      c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * 0.78, h * 0.18); c.quadraticCurveTo(w * 0.7, h * 0.4, w * 0.55, h * 0.55); c.stroke();
    } else if (kind === 'bottle') {
      c.beginPath(); c.moveTo(w * 0.42, h * 0.28); c.lineTo(w * 0.38, h * 0.42); c.lineTo(w * 0.32, h * 0.74); c.quadraticCurveTo(w * 0.5, h * 0.88, w * 0.68, h * 0.74); c.lineTo(w * 0.62, h * 0.42); c.lineTo(w * 0.58, h * 0.28); c.closePath(); c.stroke();
    } else if (kind === 'note') {
      c.beginPath(); c.moveTo(w * 0.3, h * 0.24); c.lineTo(w * 0.7, h * 0.2); c.lineTo(w * 0.66, h * 0.78); c.lineTo(w * 0.26, h * 0.74); c.closePath(); c.stroke();
    } else if (kind === 'scroll') {
      c.lineWidth = Math.max(4, w * 0.06); c.beginPath(); c.moveTo(w * 0.22, h * 0.32); c.lineTo(w * 0.78, h * 0.32); c.moveTo(w * 0.22, h * 0.68); c.lineTo(w * 0.78, h * 0.68); c.stroke();
      c.lineWidth = 1.4; c.beginPath(); c.moveTo(w * 0.3, h * 0.44); c.lineTo(w * 0.7, h * 0.44); c.moveTo(w * 0.3, h * 0.54); c.lineTo(w * 0.62, h * 0.54); c.stroke();
    } else if (kind === 'pillow') {
      c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.32, h * 0.2, -0.2, 0, Math.PI * 2); c.globalAlpha = 0.2; c.fill(); c.globalAlpha = 1; c.stroke();
    }
    c.restore();
  }
  function gearKind(id) {
    var map = {
      phyrex_w: 'blade', phyrex_i: 'page', sisi_w: 'ribbon', sisi_i: 'pouch',
      laosiji_w: 'horn', laosiji_i: 'slip', kuanggong_w: 'pick', kuanggong_i: 'chip',
      cato_w: 'frame', cato_i: 'page', haiteng_w: 'stamp', haiteng_i: 'slip',
      yuanzhang_w: 'bell', yuanzhang_i: 'mound', heyuxi_w: 'brush', heyuxi_i: 'cup',
      diaoyulao_w: 'rod', diaoyulao_i: 'bottle', martin_w: 'horn', martin_i: 'note',
      qinba_w: 'scroll', qinba_i: 'note', traders18_w: 'stamp', traders18_i: 'pillow'
    };
    return map[id] || 'scroll';
  }
  var floatCache = {};
  /* 从四周宣纸色往里抠，裁到墨迹外框。武器和道具留在画面里，不按方框裁。 */
  function cutout(key, im) {
    if (floatCache[key]) return floatCache[key];
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) return null;
    try {
      var probe = document.createElement('canvas');
      var pw = Math.min(48, iw), ph = Math.min(48, ih);
      probe.width = pw; probe.height = ph;
      var pg = probe.getContext('2d');
      pg.drawImage(im, 0, 0, pw, ph);
      var pd = pg.getImageData(0, 0, pw, ph).data, clear = 0, pi;
      for (pi = 3; pi < pd.length; pi += 16) if (pd[pi] < 16) clear++;
      if (clear > pd.length / 64) { floatCache[key] = im; return im; }
    } catch (e) {}
    var sc0 = Math.min(1, 560 / Math.max(iw, ih));
    var w = Math.max(1, Math.round(iw * sc0)), h = Math.max(1, Math.round(ih * sc0));
    var cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    var g = cnv.getContext('2d');
    g.drawImage(im, 0, 0, w, h);
    var imgd = g.getImageData(0, 0, w, h), d = imgd.data, n = w * h;
    var scored = [], x, y, p, lum, i;
    for (x = 0; x < w; x += 3) {
      p = x * 4; scored.push((d[p] + d[p + 1] + d[p + 2]) / 3, d[p], d[p + 1], d[p + 2]);
      p = ((h - 1) * w + x) * 4; scored.push((d[p] + d[p + 1] + d[p + 2]) / 3, d[p], d[p + 1], d[p + 2]);
    }
    for (y = 0; y < h; y += 3) {
      p = (y * w) * 4; scored.push((d[p] + d[p + 1] + d[p + 2]) / 3, d[p], d[p + 1], d[p + 2]);
      p = (y * w + w - 1) * 4; scored.push((d[p] + d[p + 1] + d[p + 2]) / 3, d[p], d[p + 1], d[p + 2]);
    }
    var order = [];
    for (i = 0; i < scored.length; i += 4) order.push(i);
    order.sort(function (a, b) { return scored[b] - scored[a]; });
    var take = Math.max(8, Math.floor(order.length / 5));
    var pr = 0, pg = 0, pb = 0;
    for (i = 0; i < take; i++) {
      var at = order[i];
      pr += scored[at + 1]; pg += scored[at + 2]; pb += scored[at + 3];
    }
    pr /= take; pg /= take; pb /= take;
    var tol = (pr + pg + pb) / 3 < 215 ? 40 : 32;
    function isPaper(r, g0, b, a) {
      if (a < 12) return true;
      var lum = (r + g0 + b) / 3;
      var chroma = Math.max(r, g0, b) - Math.min(r, g0, b);
      var dr = r - pr, dg = g0 - pg, db = b - pb;
      var dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (lum > 204 && chroma < 46) return false;
      return lum > 132 && chroma < 92 && dist < 88 && r + 10 > g0 && g0 + 20 > b;
    }
    var seen = new Uint8Array(n), qx = new Int16Array(n), qy = new Int16Array(n), qh = 0, qt = 0;
    function push(x0, y0) {
      if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;
      var idx = y0 * w + x0;
      if (seen[idx]) return;
      seen[idx] = 1;
      qx[qt] = x0; qy[qt] = y0; qt++;
    }
    for (x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (qh < qt) {
      x = qx[qh]; y = qy[qh]; qh++;
      p = (y * w + x) * 4;
      if (!isPaper(d[p], d[p + 1], d[p + 2], d[p + 3])) continue;
      d[p + 3] = 0;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    var pass, t, xx, yy, kill, chroma;
    for (pass = 0; pass < 4; pass++) {
      kill = [];
      for (y = 1; y < h - 1; y++) {
        for (x = 1; x < w - 1; x++) {
          p = (y * w + x) * 4;
          if (d[p + 3] < 12) continue;
          lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          chroma = Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]);
          if (lum < 128 || chroma > 96 || (lum > 204 && chroma < 46)) continue;
          var fdr = d[p] - pr, fdg = d[p + 1] - pg, fdb = d[p + 2] - pb;
          if (Math.sqrt(fdr * fdr + fdg * fdg + fdb * fdb) > 96) continue;
          t = 0;
          for (yy = y - 1; yy <= y + 1; yy++) for (xx = x - 1; xx <= x + 1; xx++) {
            if (d[(yy * w + xx) * 4 + 3] < 12) t++;
          }
          if (t >= 3) kill.push(p);
        }
      }
      for (i = 0; i < kill.length; i++) d[kill[i] + 3] = 0;
    }
    /* 整张还是方纸时，只留下暖色的那一件（晨帖），山竹和方底都去掉。 */
    function liftObject() {
      g.drawImage(im, 0, 0, w, h);
      imgd = g.getImageData(0, 0, w, h);
      d = imgd.data;
      seen = new Uint8Array(n);
      qh = 0; qt = 0;
      for (x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
      for (y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
      while (qh < qt) {
        x = qx[qh]; y = qy[qh]; qh++;
        p = (y * w + x) * 4;
        var lr = d[p], lg = d[p + 1], lb = d[p + 2], la = d[p + 3];
        var llum = (lr + lg + lb) / 3;
        var lch = Math.max(lr, lg, lb) - Math.min(lr, lg, lb);
        var ldx = lr - pr, ldy = lg - pg, ldz = lb - pb;
        var ldist = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
        if (!(la < 12 || (llum > 150 && lch < 40 && ldist < 34))) continue;
        d[p + 3] = 0;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
      }
      var warm = new Uint8Array(n), wq = [], wi, k, xx, yy, idx, ch2;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        p = (y * w + x) * 4;
        if (d[p + 3] < 16) continue;
        if (Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]) < 48) continue;
        warm[y * w + x] = 1;
        wq.push(x, y);
      }
      wi = 0;
      while (wi < wq.length) {
        x = wq[wi]; y = wq[wi + 1]; wi += 2;
        var near = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
        for (k = 0; k < 8; k += 2) {
          xx = near[k]; yy = near[k + 1];
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          idx = yy * w + xx;
          if (warm[idx]) continue;
          p = idx * 4;
          if (d[p + 3] < 16) continue;
          ch2 = Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]);
          if (ch2 < 34) continue;
          warm[idx] = 1;
          wq.push(xx, yy);
        }
      }
      var vis = new Uint8Array(n), best = null, bestN = 0, comp, ci, id, cx, cy;
      for (i = 0; i < n; i++) {
        if (!warm[i] || vis[i]) continue;
        comp = [i]; vis[i] = 1; ci = 0;
        while (ci < comp.length) {
          id = comp[ci++]; cx = id % w; cy = (id / w) | 0;
          if (cx + 1 < w && warm[id + 1] && !vis[id + 1]) { vis[id + 1] = 1; comp.push(id + 1); }
          if (cx > 0 && warm[id - 1] && !vis[id - 1]) { vis[id - 1] = 1; comp.push(id - 1); }
          if (cy + 1 < h && warm[id + w] && !vis[id + w]) { vis[id + w] = 1; comp.push(id + w); }
          if (cy > 0 && warm[id - w] && !vis[id - w]) { vis[id - w] = 1; comp.push(id - w); }
        }
        if (comp.length > bestN) { best = comp; bestN = comp.length; }
      }
      if (!best || bestN < 800 || bestN > n * 0.45) return false;
      var keep = new Uint8Array(n);
      var bx0 = w, by0 = h, bx1 = 0, by1 = 0;
      for (i = 0; i < best.length; i++) {
        id = best[i]; keep[id] = 1;
        cx = id % w; cy = (id / w) | 0;
        if (cx < bx0) bx0 = cx; if (cy < by0) by0 = cy;
        if (cx > bx1) bx1 = cx; if (cy > by1) by1 = cy;
      }
      var pad = 28;
      bx0 = Math.max(0, bx0 - pad); by0 = Math.max(0, by0 - pad);
      bx1 = Math.min(w - 1, bx1 + pad); by1 = Math.min(h - 1, by1 + pad);
      for (y = by0; y <= by1; y++) for (x = bx0; x <= bx1; x++) {
        p = (y * w + x) * 4;
        if (d[p + 3] < 16) continue;
        if ((d[p] + d[p + 1] + d[p + 2]) / 3 < 105) keep[y * w + x] = 1;
      }
      for (i = 0; i < n; i++) if (!keep[i]) d[i * 4 + 3] = 0;
      g.putImageData(imgd, 0, 0);
      return true;
    }
    var opaque = 0;
    for (i = 3; i < d.length; i += 4) if (d[i] >= 16) opaque++;
    if (opaque > n * 0.9) {
      var snap = g.getImageData(0, 0, w, h);
      if (!liftObject()) { g.putImageData(snap, 0, 0); imgd = g.getImageData(0, 0, w, h); d = imgd.data; }
    }
    var minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] < 16) continue;
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    g.putImageData(imgd, 0, 0);
    if (!found) { floatCache[key] = cnv; return cnv; }
    var tw = maxX - minX + 1, th = maxY - minY + 1;
    var out = document.createElement('canvas');
    out.width = tw; out.height = th;
    out.getContext('2d').putImageData(g.getImageData(minX, minY, tw, th), 0, 0);
    floatCache[key] = out;
    return out;
  }
  function paintCut(c, cut, x, y, w, h, foot) {
    if (!cut || !cut.width) return;
    var sc = Math.min(w / cut.width, h / cut.height);
    var dw = cut.width * sc, dh = cut.height * sc;
    c.drawImage(cut, x + (w - dw) / 2, foot ? y + h - dh : y + (h - dh) / 2, dw, dh);
  }
  function inkGear(c, id, x, y, w, h) {
    var painted = id && gearArt(id);
    var cut = painted && cutout('gear-' + id, painted);
    if (cut) paintCut(c, cut, x, y, w, h, false);
    else if (id) {
      c.save();
      c.translate(x, y);
      inkShape(c, gearKind(id), w, h);
      c.restore();
    }
  }
  function heroDef(id) {
    var list = XY.SPECIALS_ALL || XY.SPECIALS || [], i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return (XY.SP_BY && XY.SP_BY[id]) || null;
  }
  function heroGrid(c, ids, sel, x, y, w, h) {
    var n = ids.length, cols = 4, gap = 8;
    var rows = Math.ceil(n / cols);
    var cw = Math.floor((w - gap * (cols - 1)) / cols);
    var ch = Math.floor((h - gap * (rows - 1)) / rows);
    var i;
    for (i = 0; i < n; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var cx = x + col * (cw + gap), cy = y + row * (ch + gap);
      var id = ids[i];
      var d = heroDef(id);
      var nm = d ? d.name : id;
      var artIm = spArt(id);
      if (artIm) {
        inkWash(c, artIm, cx, cy, cw, ch, '');
        cardName(c, nm, cx, cy, cw, ch);
      } else {
        c.save();
        c.beginPath();
        c.rect(cx, cy, cw, ch);
        c.clip();
        c.fillStyle = '#f3ead6';
        c.fillRect(cx, cy, cw, ch);
        c.fillStyle = 'rgba(36,24,16,0.16)';
        c.beginPath();
        c.ellipse(cx + cw * 0.35, cy + ch * 0.3, cw * 0.55, ch * 0.28, -0.4, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(36,24,16,0.1)';
        c.beginPath();
        c.ellipse(cx + cw * 0.7, cy + ch * 0.72, cw * 0.5, ch * 0.3, 0.3, 0, Math.PI * 2);
        c.fill();
        c.restore();
        if (mostlyCjk(nm)) {
          var vsize = Math.min(cw * 0.34, (ch * 0.7) / Math.max(1, nm.length));
          brushVert(c, nm, cx + cw / 2, cy + (ch - nm.length * vsize) / 2, vsize, '#24180f');
        } else {
          var cut = nm.length > 8 ? Math.ceil(nm.length / 2) : nm.length;
          var lines = nm.length > 8 ? [nm.slice(0, cut), nm.slice(cut)] : [nm];
          var li;
          for (li = 0; li < lines.length; li++) {
            brushFit(c, lines[li], cx + cw / 2, cy + ch * (lines.length === 1 ? 0.52 : 0.4 + li * 0.22), cw - 10, Math.min(ch * 0.2, 40), '#24180f', 'center');
          }
        }
      }
      if (id === sel) inkCorners(c, cx, cy, cw, ch);
      hit(cx, cy, cw, ch, 'dkHero', { id: id });
    }
  }
  function emptyGear(c, x, y, w, h) {
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    var wash = c.createRadialGradient(x + w * 0.52, y + h * 0.4, 4, x + w * 0.5, y + h * 0.42, Math.max(w, h) * 0.48);
    wash.addColorStop(0, 'rgba(36,24,16,0.1)');
    wash.addColorStop(1, 'rgba(36,24,16,0)');
    c.fillStyle = wash;
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(36,24,16,0.07)';
    c.beginPath();
    c.ellipse(x + w * 0.52, y + h * 0.4, w * 0.2, h * 0.3, -0.55, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(36,24,16,0.2)';
    c.beginPath();
    c.moveTo(x + w * 0.4, y + h * 0.7);
    c.quadraticCurveTo(x + w * 0.44, y + h * 0.36, x + w * 0.56, y + h * 0.16);
    c.quadraticCurveTo(x + w * 0.74, y + h * 0.08, x + w * 0.66, y + h * 0.32);
    c.quadraticCurveTo(x + w * 0.56, y + h * 0.48, x + w * 0.5, y + h * 0.72);
    c.closePath();
    c.fill();
    c.restore();
  }
  function gearSlot(c, piece, slotName, x, y, w, h) {
    var band = piece ? Math.min(34, Math.max(24, h * 0.2)) : 0;
    inkGear(c, piece ? piece.id : '', x, y, w, h);
    if (!piece) emptyGear(c, x, y, w, h);
    brush(c, slotName, x + 12, y + 16, Math.min(18, w * 0.1), '#8d1f18', 'left');
    if (piece) {
      var fade = c.createLinearGradient(x, y + h - band - 18, x, y + h - band);
      fade.addColorStop(0, 'rgba(244,234,214,0)');
      fade.addColorStop(1, 'rgba(244,234,214,1)');
      c.fillStyle = fade;
      c.fillRect(x, y + h - band - 18, w, 18);
      c.fillStyle = '#f4ead6';
      c.fillRect(x, y + h - band, w, band);
      brushFit(c, piece.name, x + w / 2, y + h - band / 2, w - 16, Math.min(22, w * 0.12), '#24180f', 'center');
    } else {
      brush(c, '空', x + w / 2, y + h * 0.42, Math.min(26, w * 0.13), '#24180f', 'center');
      brushFit(c, '击败魔化之身有机会得到', x + w / 2, y + h * 0.78, w - 12, 14, '#5c4a36', 'center');
    }
  }
  function paperHandle(c, handle, x, y) {
    if (!handle) return;
    var size = 16;
    var im = inkCanvas(handle, size, '#24180f');
    c.save();
    c.fillStyle = 'rgba(246,239,224,0.92)';
    c.beginPath();
    c.ellipse(x, y, Math.max(40, im._tw / 2 + 14), 14, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    brush(c, handle, x, y, size, '#24180f', 'center');
  }
  function deskWash(c, W, H) {
    c.fillStyle = '#f3ead6';
    c.fillRect(0, 0, W, H);
    var im = anyImg('deskPaper', 'assets/formshop/paper-desk.webp');
    if (!im) return;
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var sc = Math.max(W / iw, H / ih);
    var dw = iw * sc, dh = ih * sc;
    c.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  function inkName(c, s, x, y, maxW, size, ink) {
    var halo = Math.max(3, size * 0.055), i, ang;
    for (i = 0; i < 8; i++) {
      ang = i * Math.PI / 4;
      brushFit(c, s, x + Math.cos(ang) * halo, y + Math.sin(ang) * halo, maxW, size, '#f6efe2', 'center');
    }
    return brushFit(c, s, x, y, maxW, size, ink || '#120c0a', 'center');
  }
  function paintGear(c, app) {
    var W = app.lw, H = app.lh, port = H > W * 1.05;
    c.save();
    deskWash(c, W, H);
    c.save();
    c.fillStyle = 'rgba(246,239,224,0.92)';
    c.fillRect(8, 8, Math.min(W - 150, 760), port ? 78 : 84);
    c.restore();
    brush(c, '专属器物', port ? 22 : 28, port ? 36 : 40, port ? 32 : 40, '#120c0a', 'left');
    brush(c, '只给当前这位用。点已有的就装上。怎么获得：活动抽卡和战斗掉落。', port ? 22 : 28, port ? 68 : 74, port ? 15 : 17, '#5c4a36', 'left');
    var backW = 128, backH = 50;
    redSeal(c, W - backW - 12, 12, backW, backH, '返回');
    hit(W - backW - 12, 12, backW, backH, 'dkGearClose');
    var ids = (XY.SPECIALS_ALL || XY.SPECIALS || []).map(function (d) { return d.id; }).filter(revealed);
    var sel = app.dkHero && ids.indexOf(app.dkHero) >= 0 ? app.dkHero : (ids[0] || 'phyrex');
    app.dkHero = sel;
    var gdoc = gear();
    var eq = (gdoc.equip && gdoc.equip[sel]) || { weapon: null, item: null };
    var catalog = API.GEAR.filter(function (g) { return g.owner === sel; });
    var weapon = (eq.weapon && API.gearById[eq.weapon]) || catalog.filter(function (g) { return g.slot === 'weapon'; })[0];
    var item = (eq.item && API.gearById[eq.item]) || catalog.filter(function (g) { return g.slot === 'item'; })[0];
    var n = Math.max(1, ids.length);
    var cols = port ? 5 : n;
    var rows = Math.ceil(n / cols);
    var gap = port ? 10 : 16;
    var slot = Math.floor((W - (port ? 20 : 48) - gap * (cols - 1)) / cols);
    var figH = port ? Math.max(168, Math.round(slot * 1.2)) : Math.round(Math.min(128, slot * 1.15));
    var selH = Math.round(figH * (port ? 1.12 : 1.32));
    var nameH = port ? 36 : 32;
    var heroW, heroH, heroX, heroY, sideW, sideH, sideY, rosterTop;
    if (port) {
      var header = 76;
      var gearNameH = 44;
      var rowGap = 6;
      var rosterH = rows * (selH + nameH) + (rows - 1) * rowGap;
      rosterTop = H - rosterH - 8;
      var gearRoom = rosterTop - header - 12;
      sideH = Math.max(220, Math.round(gearRoom * 0.36));
      heroH = gearRoom - sideH - gearNameH;
      heroW = Math.min(W - 16, Math.round(heroH * 0.86));
      heroX = (W - heroW) / 2;
      heroY = header;
      sideW = Math.floor((W - 28) / 2);
      sideY = heroY + heroH + 6;
    } else {
      var feet = H - nameH - 8;
      heroW = W * 0.34;
      heroH = Math.min(heroW / 0.72, feet - selH - 18);
      heroX = (W - heroW) / 2;
      heroY = 96;
      sideW = Math.max(96, heroX - 18);
      sideH = Math.min(240, heroH * 0.56);
      sideY = heroY + heroH * 0.16;
      rosterTop = feet - figH;
    }
    var avS = Math.min(heroW, heroH, port ? 300 : 360);
    if (XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(sel)) {
      XY.xAvIcon.draw(c, sel, heroX + (heroW - avS) / 2, heroY + (heroH - avS) * 0.2, avS, avS);
    }
    var hd = heroDef(sel);
    var heroName = (hd && hd.name) || sel;
    inkName(c, heroName, heroX + heroW * 0.82, heroY + heroH * 0.16, heroW * 0.4, Math.round(heroW / 6), '#120c0a');
    function sidePiece(piece, x, y, w, h) {
      if (!piece) return;
      var artH = Math.max(48, h * 0.62);
      inkGear(c, piece.id, x, y, w, artH);
      var ty = y + artH;
      inkName(c, piece.name, x + w / 2, ty + 18, w + 20, port ? 22 : 20, '#120c0a');
      var brief = String(piece.desc || '');
      var colon = brief.indexOf('：');
      if (colon >= 0) brief = brief.slice(colon + 1);
      brush(c, brief, x + w / 2, ty + 44, port ? 14 : 16, '#5c4a36', 'center');
      brush(c, '获得：活动十连，或战斗里掉落', x + w / 2, ty + 70, port ? 13 : 14, '#8d1f18', 'center');
      var bagN = (gdoc.bag && gdoc.bag[piece.id]) || 0;
      var equipped = (piece.slot === 'weapon' ? eq.weapon : eq.item) === piece.id;
      if (bagN > 0 && !equipped) hit(x, y, Math.max(88, w), Math.max(88, h), 'dkEquip', { id: piece.id, hero: sel });
    }
    if (port) {
      sidePiece(weapon, 12, sideY, sideW, sideH);
      sidePiece(item, W - sideW - 12, sideY, sideW, sideH);
    } else {
      sidePiece(weapon, 16, sideY, sideW, sideH);
      sidePiece(item, W - sideW - 16, sideY + 18, sideW, sideH);
    }
    var deskFeet = H - nameH - 2;
    if (!port) {
      c.save();
      c.fillStyle = 'rgba(48,38,28,0.14)';
      c.beginPath();
      c.ellipse(W / 2, deskFeet + 2, W * 0.46, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    ids.forEach(function (id, i) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var inRow = row === rows - 1 ? n - row * cols : cols;
      var rowW = inRow * slot + (inRow - 1) * gap;
      var x = (W - rowW) / 2 + col * (slot + gap);
      var base = port ? rosterTop + row * (selH + nameH + 6) + selH : deskFeet;
      var tall = id === sel ? selH : figH;
      var y = base - tall;
      var side = Math.min(slot, tall) * 0.86;
      if (XY.xAvIcon && XY.xAvIcon.isSpecial && XY.xAvIcon.isSpecial(id)) {
        XY.xAvIcon.draw(c, id, x + (slot - side) / 2, y + tall - side, side, side);
      }
      var nm = heroDef(id);
      inkName(c, (nm && nm.name) || id, x + slot / 2, base + nameH * 0.48, slot + 20, port ? 26 : 24, id === sel ? '#8d1f18' : '#120c0a');
      if (id === sel) {
        var seal = port ? 22 : 22;
        var sx = x + slot * 0.78, sy = y + tall * 0.18;
        c.save();
        c.translate(sx, sy);
        c.rotate(-0.08);
        c.fillStyle = '#9a2e24';
        c.fillRect(-seal / 2, -seal / 2, seal, seal);
        c.restore();
        brush(c, '印', sx, sy, Math.round(seal * 0.62), '#f4e6d4', 'center');
      }
      hit(x, y, Math.max(port ? 88 : 44, slot), Math.max(port ? 88 : 44, tall + nameH), 'dkHero', { id: id });
    });
    c.restore();
  }

  function paintBattle(c, G, app) {
    var run = G.dkRun;
    if (!run) return;
    if (run.rageOn) {
      var list = G.enemies || [], n = 0, i;
      for (i = 0; i < list.length && n < 5; i++) {
        var e = list[i];
        if (!e || e.dead || e.dk) continue;
        if (!e._dkRage && !e.enraged) continue;
        var p = w2s(G, app, e.x, e.y - (e.r || 16) - 18);
        if (p.x < -20 || p.y < -20 || p.x > app.lw + 20 || p.y > app.lh + 20) continue;
        if (e.def && (e.def.denBoss || e.def.boss)) continue;
        cursive(c, '狂', p.x, p.y, 13, '#8d1f18', 'center');
        n++;
      }
      var left = Math.max(0, Math.ceil(run.rageLeft));
      brush(c, '狂暴 ' + left + ' 秒', 18, 86, 18, '#7d1c14', 'left');
    }
    var e2 = G.dkUnit;
    if (e2 && !e2.dead && run.unit && !run.unit.dead && run.introLeft <= 0 && run.formLeft <= 0) {
      var q = w2s(G, app, e2.x, e2.y);
      var ph = run.unit.phase >= 2 ? 236 : 176;
      var cutKey = run.unit.phase >= 2 ? 'formcut' : 'stage1cut';
      var cutFile = run.unit.phase >= 2 ? (art.formCut || 'form-cut.webp') : (art.stage1Cut || 'stage1-cut.webp');
      var cutIm = img(cutKey, cutFile);
      var aspect = cutIm ? cutIm.naturalWidth / cutIm.naturalHeight : 0.75;
      var pw = Math.round(ph * aspect);
      var px = q.x - pw / 2, py = q.y - ph;
      var boss = null, di;
      if (G.dens) for (di = 0; di < G.dens.length; di++) if (G.dens[di].boss && !G.dens[di].boss.dead) { boss = G.dens[di].boss; break; }
      if (boss) {
        var bq = w2s(G, app, boss.x, boss.y);
        if (bq.x > q.x - 30 && px + pw > bq.x - 110) px = Math.max(8, bq.x - 110 - pw);
      }
      var banW = Math.min(260, Math.max(168, app.lw * 0.28));
      var ban = { x: (app.lw - banW) / 2, y: Math.max(120, Math.min(app.lh * 0.18, 240)), w: banW, h: 64 };
      if (px < ban.x + ban.w && px + pw > ban.x && py < ban.y + ban.h + 6) {
        var shift = ban.y + ban.h + 8 - py;
        if (shift > 0 && shift < 140 && py + ph + shift < app.lh - 16) py += shift;
      }
      if (cutIm) c.drawImage(cutIm, px, py, pw, ph);
      else blitCut(c, cutKey, cutFile, px + pw / 2, py + ph, ph);
      var floats = [];
      if (G.texts) {
        for (di = 0; di < G.texts.length; di++) {
          var ft = G.texts[di];
          if (!ft || !ft.s) continue;
          var fp = w2s(G, app, ft.x, ft.y);
          var life = 1 - Math.pow((ft.t || 0) / (ft.max || 0.7), 3);
          if (life <= 0.05) continue;
          if (fp.x < -240 || fp.x > app.lw + 240 || fp.y < -80 || fp.y > app.lh + 80) continue;
          floats.push({ x: fp.x - 46, y: fp.y - 18, w: 92, h: 36, p: fp, s: String(ft.s), size: ft.size || 16, life: life });
          c.save();
          c.globalAlpha = 1;
          var labelS = String(ft.s);
          var pxSize = Math.max(18, ft.size || 18);
          c.font = 'bold ' + pxSize + 'px sans-serif';
          var tw = c.measureText(labelS).width;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.lineWidth = 4;
          c.strokeStyle = '#fff6e4';
          c.strokeText(labelS, fp.x, fp.y);
          c.fillStyle = '#e23b2f';
          c.fillText(labelS, fp.x, fp.y);
          c.restore();
          floats[floats.length - 1].w = Math.max(92, tw + 16);
          floats[floats.length - 1].x = fp.x - (Math.max(92, tw + 16)) / 2;
        }
      }
      var label = run.unit.phase >= 2 ? API.HERO2 : API.HERO;
      var sizeN = 16, stepN = sizeN * 0.98, lh = label.length * stepN + 28;
      var station = null;
      if (G.camp) {
        var cs = w2s(G, app, G.camp.x, G.camp.y - 98);
        station = { x: cs.x - 140, y: cs.y - 16, w: 280, h: 32 };
      }
      var bossTag = null;
      function overlap(r, b) { return b && r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y; }
      function blocked(nx, ny) {
        var r = { x: nx - 18, y: ny - 8, w: 36, h: lh };
        if (r.y < 100 || r.y + r.h > app.lh - 64) return true;
        if (r.x < 2 || r.x > app.lw - 8) return true;
        if (overlap(r, station) || overlap(r, bossTag) || overlap(r, ban)) return true;
        for (var fi = 0; fi < floats.length; fi++) if (overlap(r, floats[fi])) return true;
        return false;
      }
      if (boss) {
        var bs = w2s(G, app, boss.x, boss.y - (boss.r || 36) - 28);
        bossTag = { x: bs.x - 170, y: bs.y - 30, w: 300, h: 64 };
      }
      var cands = [
        { x: px - 28, y: py + ph * 0.08 },
        { x: px + pw + 18, y: py + ph * 0.08 },
        { x: px - 28, y: py + ph * 0.28 },
        { x: px + pw + 18, y: py + ph * 0.28 }
      ];
      var spot = cands[0], ci;
      for (ci = 0; ci < cands.length; ci++) if (!blocked(cands[ci].x, cands[ci].y)) { spot = cands[ci]; break; }
      var usedN = brushVert(c, label, spot.x, spot.y, sizeN, '#24180f');
      cinnabar(c, spot.x, spot.y + usedN + 6, run.unit.phase >= 2 ? '魔' : '猫');
    }
    if (run.introLeft > 0 && G.mode !== 'cards') paintIntro(c, app, run);
    if (run.formLeft > 0 && G.mode !== 'cards') paintForm(c, app, run);
    if (G.dkDrops && G.dkDrops.t < 6) paintDrop(c, app, G.dkDrops);
  }
  function obtainPaper(c, W, H, port) {
    var im = img('obtainPaper', 'obtain/paper.webp');
    if (!im) {
      c.fillStyle = '#f3ead6';
      c.fillRect(0, 0, W, H);
      return;
    }
    var sw = im.naturalWidth, sh = im.naturalHeight;
    if (port) {
      /* 整幅山水铺满竖屏，左右下角的竹子和墨点留在屏幕角上。 */
      c.drawImage(im, 0, 0, sw, sh, 0, 0, W, H);
      return;
    }
    var ir = sw / sh, br = W / H, dwL, dhL, dx, dy;
    if (ir < br) { dwL = W; dhL = W / ir; dx = 0; dy = (H - dhL) / 2; }
    else { dhL = H; dwL = H * ir; dy = 0; dx = (W - dwL) / 2; }
    c.drawImage(im, dx, dy, dwL, dhL);
  }
  function obtainCut(id) {
    return img('obtain-' + id, 'obtain/' + id + '.webp');
  }
  function drawCut(c, im, cx, cy, maxW, maxH, rot, alpha) {
    if (!im) return;
    var ir = im.naturalWidth / im.naturalHeight;
    var w = maxW, h = maxW / ir;
    if (h > maxH) { h = maxH; w = maxH * ir; }
    c.save();
    c.translate(cx, cy);
    if (rot) c.rotate(rot);
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.drawImage(im, -w / 2, -h / 2, w, h);
    c.restore();
  }
  function gradeSeal(c, x, y, ch, s) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.06);
    c.strokeStyle = '#a02822';
    c.lineWidth = Math.max(3, s * 0.08);
    c.strokeRect(-s / 2, -s / 2, s, s);
    c.restore();
    brush(c, (ch || '印').charAt(0), x, y + s * 0.02, Math.round(s * 0.62), '#a02822', 'center');
  }
  function ownerMark(c, id, name, x, y, r, alpha) {
    c.save();
    c.globalAlpha = alpha;
    var face = anyImg('xav-' + id, 'assets/art/x-avatars/' + id + '.webp');
    var drew = XY.xAvIcon && face && XY.xAvIcon.featherImage(c, face, x - r, y - r, r * 2, r * 2);
    if (!drew) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.clip();
      if (face) {
        var ir = face.naturalWidth / face.naturalHeight;
        var side = r * 2;
        var dw = ir > 1 ? side * ir : side, dh = ir > 1 ? side : side / ir;
        c.drawImage(face, x - dw / 2, y - dh / 2, dw, dh);
      } else {
        c.fillStyle = '#efe6d4';
        c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    c.restore();
    c.save();
    c.globalAlpha = alpha;
    var nameSize = Math.round(r * 0.42);
    brushFit(c, name || '', x, y + r + nameSize * 0.85, r * 3.4, nameSize, '#24180f', 'center');
    brush(c, '专属', x, y + r + nameSize * 1.7, Math.round(nameSize * 0.72), '#24180f', 'center');
    c.restore();
  }
  function paintDrop(c, app, drop) {
    var items = drop.items || [];
    var item = items[drop.i || 0];
    if (!item && drop.gear) item = { kind: 'gear', id: drop.gear };
    if (!item) return;
    var W = app.lw, H = app.lh, port = H > W * 1.05;
    var t = drop.t || 0;
    var open = 1 - Math.pow(1 - Math.max(0, Math.min(1, t / 0.5)), 3);
    var gearIn = 1 - Math.pow(1 - Math.max(0, Math.min(1, (t - 0.28) / 0.65)), 3);
    var fade = Math.max(0, Math.min(1, (t - 0.85) / 0.4));
    c.save();
    c.globalAlpha = 0.2 + 0.8 * open;
    c.fillStyle = '#f6efe2';
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    if (item.kind === 'gear') {
      var piece = API.gearById[item.id];
      if (piece && revealed(piece.owner)) {
        var title = '获得 · ' + piece.name;
        var titleSize, sealS, gap, tx, ty, tim;
        if (port) {
          titleSize = Math.round(W * 0.072);
          sealS = Math.round(titleSize * 1.12);
          gap = Math.round(titleSize * 0.28);
          tim = inkCanvas(title, titleSize, '#24180f');
          while (titleSize > 16 && tim._tw + gap + sealS > W * 0.92) {
            titleSize -= 2;
            sealS = Math.round(titleSize * 1.12);
            gap = Math.round(titleSize * 0.28);
            tim = inkCanvas(title, titleSize, '#24180f');
          }
          tx = W * 0.04;
          ty = Math.max(sealS * 0.7 + 8, H * 0.045);
        } else {
          titleSize = Math.round(H * 0.08);
          sealS = Math.round(titleSize * 1.15);
          gap = Math.round(titleSize * 0.45);
          tim = inkCanvas(title, titleSize, '#24180f');
          tx = W * 0.045;
          ty = H * 0.09;
        }
        c.globalAlpha = fade;
        brush(c, title, tx, ty, titleSize, '#24180f', 'left');
        gradeSeal(c, tx + tim._tw + gap + sealS / 2, ty, piece.seal, sealS);
        c.globalAlpha = 1;
        var im = obtainCut(piece.id);
        var rot = piece.id === 'phyrex_w' ? 0 : -0.08;
        var dropY = (1 - gearIn) * (-H * 0.08);
        if (port) {
          drawCut(c, im, W * 0.5, H * 0.40 + dropY, W * 0.86, H * 0.32, rot, gearIn);
          var hd = heroDef(piece.owner);
          ownerMark(c, piece.owner, hd && hd.name, W * 0.68, H * 0.66, W * 0.13, fade);
          c.globalAlpha = fade;
          brushFit(c, piece.desc, W / 2, H * 0.90, W * 0.88, Math.round(Math.min(W * 0.042, 26)), '#24180f', 'center');
        } else {
          drawCut(c, im, W * 0.42, H * 0.52 + dropY, W * 0.52, H * 0.62, rot, gearIn);
          var hdL = heroDef(piece.owner);
          ownerMark(c, piece.owner, hdL && hdL.name, W * 0.82, H * 0.46, H * 0.125, fade);
          c.globalAlpha = fade;
          brushFit(c, piece.desc, W * 0.42, H * 0.92, W * 0.7, Math.round(H * 0.042), '#24180f', 'center');
        }
        c.globalAlpha = 1;
      }
    } else {
      var nm = item.name || item.id;
      c.globalAlpha = fade;
      brush(c, '获得 · ' + nm, W * 0.05, port ? H * 0.08 : H * 0.1, Math.round(port ? H * 0.04 : H * 0.07), '#24180f', 'left');
      c.globalAlpha = 1;
      var artIm = spArt(item.id);
      drawCut(c, artIm, W * 0.48, H * 0.52 + (1 - gearIn) * (-H * 0.1), port ? W * 0.7 : W * 0.4, H * 0.55, 0, gearIn);
    }
    c.restore();
    hit(0, 0, W, H, 'dkSkip');
  }
  function paintPause(c, app) {
    var W = app.lw, H = app.lh, w = Math.min(300, W - 24), h = 56;
    var x = 16, y = Math.max(8, H - h - 12);
    boxes.pause = { x: x, y: y, w: w, h: h };
    var on = eventOn();
    rr(c, x, y, w, h, 16);
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#d24a34');
    g.addColorStop(1, '#a6281c');
    c.fillStyle = g;
    c.fill();
    latin(c, API.NAME, x + 16, y + h / 2, 26, '#fff6e4', 'left');
    kai(c, on ? '开' : '关', x + w - 36, y + h / 2, 22, '#fff6e4', 'center');
    kai(c, API.SUB, x + 168, y + h / 2, 14, '#ffe1c2', 'left', false);
    hit(x, y, w, h, 'dkToggle');
  }

  function rememberClosed() {
    if (!session.auto) session.auto = {};
    session.auto.start = true;
    session.auto.levels = true;
    session.auto.closed = true;
    saveSession();
  }
  function maybeAuto(app) {
    if (app.dkClosed || (session.auto && session.auto.closed)) return;
    if (app.dkOpen || app.dkGear) return;
    if (app.screen !== 'start' && app.screen !== 'levels') return;
    if (!API.shouldAuto(session, app.screen, tutCtx())) return;
    app.dkOpen = true;
    API.markAuto(session, app.screen);
    saveSession();
  }
  function gachaOverlay() {
    return XY.gacha10 && XY.gacha10.overlay && XY.gacha10.overlay();
  }

  function paint(ctx, G, app) {
    markFrame();
    if (!app) return;
    boxes = {};
    if (app.dkOpen || app.dkGear) arm('popup');
    if (app.screen === 'play' || app.screen === 'pause') arm('battle');
    if (G && G.dkRun && G.dkRun.formLeft > 0) arm('form');
    if (app.screen === 'play' && G) {
      paintBattle(ctx, G, app);
      return;
    }
    if (app.screen === 'pause') return;
    if (gachaOverlay()) return;
    if (app.screen === 'start' || app.screen === 'levels') {
      if (app.dkGear && app.screen === 'levels') { paintGear(ctx, app); return; }
      maybeAuto(app);
      paintButton(ctx, app);
      if (app.dkOpen) paintPopup(ctx, app);
    }
  }

  function act(h, p) {
    if (!h || !h.act || h.act.indexOf('dk') !== 0) return false;
    var app = appOf();
    if (!app) return false;
    if (h.act === 'dkNoop') return true;
    if (h.act === 'dkOpen') { app.dkOpen = true; app.dkGear = false; return true; }
    if (h.act === 'dkClose') {
      app.dkOpen = false;
      app.dkClosed = true;
      rememberClosed();
      if (XY.audio && XY.audio.init) XY.audio.init();
      if (p && XY.ui && XY.ui.hits) {
        var hits = XY.ui.hits, i, u, under = null;
        for (i = hits.length - 1; i >= 0; i--) {
          u = hits[i];
          if (!u || u.act === 'dkClose' || u.act === 'dkOpen' || u.act === 'dkNoop') continue;
          if (p.x < u.x || p.x > u.x + u.w || p.y < u.y || p.y > u.y + u.h) continue;
          if (u.act === 'menuLevels' || u.act === 'start') { under = u; break; }
        }
        if (under) {
          var go = function () { app.screen = 'levels'; };
          if (XY.lazy && XY.lazy.on && XY.lazy.enter) XY.lazy.enter(go);
          else go();
        }
      }
      return true;
    }
    if (h.act === 'dkGear') { app.dkGear = true; app.dkOpen = false; return true; }
    if (h.act === 'dkGearClose') { app.dkGear = false; return true; }
    if (h.act === 'dkHero') { app.dkHero = h.id; return true; }
    if (h.act === 'dkToggle') {
      if (env().query === '0') return true;
      setEventOn(!eventOn());
      return true;
    }
    if (h.act === 'dkSkip') {
      var G = window.__xy && window.__xy.G;
      if (G && G.mode === 'cards') return true;
      if (G) G.dkSkip = true;
      return true;
    }
    if (h.act === 'dkDraw') {
      if (!XY.gacha10 || !XY.gacha10.ensure) return true;
      if (API.gachaClaimed(XY.save.data)) return true;
      XY.gacha10._showFlip = true;
      app.dkOpen = false;
      app.dkGear = false;
      app.screen = 'levels';
      if (!app.levelId) app.levelId = 1;
      XY.gacha10.ensure();
      return true;
    }
    if (h.act === 'dkEquip') {
      var g = gear();
      var res = API.equipGear(g, h.hero, h.id);
      if (res.ok) saveGear(g);
      app.menuMsg = { text: res.reason, bad: !res.ok, until: (app.rt || 0) + 2.4 };
      return true;
    }
    return false;
  }

  function yieldToOffer(G) {
    if (!G || G.mode !== 'cards') return;
    G.dkSkip = false;
  }
  var oldStep = XY.step;
  XY.step = function (G, dt) {
    yieldToOffer(G);
    if (G && G.dkHold) { hold(G, dt); lockCam(G); yieldToOffer(G); return; }
    oldStep(G, dt);
    yieldToOffer(G);
    if (G && G.mode === 'play') afterStep(G, dt);
    lockCam(G);
  };
  window.addEventListener('keydown', function (e) {
    if (e.repeat || (e.key !== 'Escape' && e.code !== 'Escape')) return;
    var app = appOf();
    if (!app || !app.dkOpen) return;
    app.dkOpen = false;
    app.dkClosed = true;
    rememberClosed();
    e.preventDefault();
    e.stopPropagation();
  }, true);
  var oldRender = XY.render;
  XY.render = function (ctx, G, app) {
    oldRender(ctx, G, app);
    try { paint(ctx, G, app); } catch (err) { if (window.console) console.error(err); }
  };
  if (XY.gacha10 && XY.gacha10.view) {
    var oldView = XY.gacha10.view;
    XY.gacha10.view = function (a) {
      var g = XY.save.data && XY.save.data.gacha10;
      var exists = g && g.pulls && g.pulls.length === 10;
      if (!XY.gacha10._showFlip) return null;
      return oldView(a);
    };
    XY.gacha10.overlay = function () {
      var g = XY.save.data && XY.save.data.gacha10;
      return !!(XY.gacha10._showFlip && g && g.pulls && g.pulls.length === 10 && !g.acked);
    };
  }
  if (XY.hubUI && XY.hubUI.act) {
    var oldAct = XY.hubUI.act;
    XY.hubUI.act = function (h, p, a) {
      if (act(h, p)) return true;
      return oldAct(h, p, a);
    };
  }
  if (XY.ov && XY.ov.pause) {
    var oldPause = XY.ov.pause;
    XY.ov.pause = function (c, G, a) {
      oldPause(c, G, a);
      try { paintPause(c, a); } catch (err) { if (window.console) console.error(err); }
    };
  }

  var DK = XY.devilKitty = {
    api: API,
    art: art,
    anim: null,
    boxes: function () { return boxes; },
    fps: function () { return fpsV; },
    roadStand: roadStand,
    eventOn: eventOn,
    setEventOn: setEventOn,
    env: env,
    interceptDeath: interceptDeath,
    session: function () { return session; }
  };
  XY.devilKitty = DK;
  fonts();
})();
