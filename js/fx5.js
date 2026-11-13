/* ============================================================
 * fx5.js —— v0.5 “爽快样板”：诚实的清屏、顿帧、吸附、WebAudio
 *
 *   XY.clearArea(G, caster, opts)  清屏：施放后 windup 秒落地，目标 = 落地那一刻镜头视口内的“普通怪”
 *                                  （小妖 / 石头怪 / 弓箭妖）一律击杀；精英 / BOSS / 妖塔只吃该技能自己的伤害，不被秒杀。
 *                                  只有真的清完才弹“清屏”字样（返回 {killed, total, left}）。
 *   XY.hitstop(G, sec)             顿帧：暂停战斗模拟（画面和输入继续），每秒最多冻 HITSTOP_BUDGET 秒，恢复时不补跑
 *   XY.magnetAll(G, rad, hero)     把半径内所有经验 / 金币一起吸向最近的英雄，约 MAGNET_T 秒汇入
 *   XY.audio / XY.sfx(name, p)     程序合成音效：同时发声 ≤ 16 个节点，同类事件 30–60ms 内合并，不从渲染循环触发
 *                                  （v0.9 补 start/chest/sweep/upgrade/vfan/vcharge/vsummon；暂停页「音效」开关 = XY.audio.mute / localStorage xy_mute）
 *   XY.audio.bgmStart/Stop/Tick    v0.9 轻量程序 BGM：五声琶音 + 极轻 pad，无外置音频；kind=play|menu|off；随 mute / tipHold / pause 压低
 * ============================================================ */
(function () {
  var XY = window.XY, C = XY.C;
  function K() { return XY.core; }
  function later(G, t, fn) { (G.spq = G.spq || []).push({ t: t, fn: fn }); }

  /* ---------- 顿帧 ---------- */
  XY.hitstop = function (G, sec) {
    var b = G.hsBud === undefined ? C.HITSTOP_BUDGET : G.hsBud;
    var use = Math.max(0, Math.min(sec, 0.1, b));
    if (use <= 0) return 0;
    G.hsBud = b - use; G.hitstopT = Math.max(G.hitstopT || 0, use); G.stats.hitstops = (G.stats.hitstops || 0) + 1; G.stats.hitstopSec = (G.stats.hitstopSec || 0) + use;
    return use;
  };

  /* ---------- 吸附 ---------- */
  XY.magnetAll = function (G, rad, hero) {
    var h = hero || G.heroes[G.ctrl], n = 0;
    if (!h || h.down) return 0;
    function go(arr) {
      for (var i = 0; i < arr.length; i++) {
        var g = arr[i]; if (g.mag) continue;
        if (rad > 0 && XY.dist(g.x, g.y, h.x, h.y) > rad) continue;
        var d = XY.dist(g.x, g.y, h.x, h.y); g.mag = h; g.sp = Math.max(120, d / C.MAGNET_T - 400); n++;     // 加速度 900：t≈ MAGNET_T 左右到手
      }
    }
    go(G.gems); go(G.coinDrops); G.stats.magnets = (G.stats.magnets || 0) + n; return n;
  };

  /* ---------- 清屏 ---------- */
  function isMinion(e) { return !e.dead && !e.def.boss && !e.def.elite && !e.def.etower && !e.def.denBoss && (e.type === 'small' || e.type === 'tank' || e.type === 'ranged' || e.type === 'shield'); }
  XY.isMinion = isMinion;
  // opts: {name, windup(0.3), color, elem, bossDmg, shape:'screen'|'ring', ringT, margin, onLand(G, list), foes(e) 自定义}
  XY.clearArea = function (G, caster, o) {
    o = o || {}; G.clearFx = null; var wind = o.windup === undefined ? 0.3 : o.windup, col = o.color || (caster.def && caster.def.color) || '#fff';
    var cx = caster.x, cy = caster.y;
    K().ring(G, cx, cy, 120, col, wind + 0.1, false); G.shake = Math.max(G.shake, 4);
    if (XY.sfx) XY.sfx('ult_charge');
    G.clearCast = { t: 0, max: wind, name: o.name || '清屏', color: col };
    later(G, wind, function () { land(G, caster, o, col); });
    return true;
  };
  function view(G, margin) {
    var v = G.view, cx = G.cam.x, cy = G.cam.y, m = margin || 0;
    return { x0: cx - v.w / 2 - m, x1: cx + v.w / 2 + m, y0: cy - v.h / 2 - m, y1: cy + v.h / 2 + m, cx: cx, cy: cy };
  }
  XY.viewRect = view;
  function land(G, caster, o, col) {
    if (G.mode !== 'play') return;
    var R = view(G, o.margin === undefined ? 0 : o.margin), list = [], i, e;
    for (i = 0; i < G.enemies.length; i++) { e = G.enemies[i]; if (e.dead) continue; if (e.x >= R.x0 && e.x <= R.x1 && e.y >= R.y0 && e.y <= R.y1) list.push(e); }
    var minions = list.filter(isMinion), others = list.filter(function (e) { return !isMinion(e); });
    var ox = caster.x, oy = caster.y, killed = 0, ringMax = Math.hypot(R.x1 - R.x0, R.y1 - R.y0);
    function smite(e, dmgMul) {
      if (e.dead) return;
      var h0 = e.hp; K().hurtEnemy(G, e, (e.hp * 6 + 20) * (dmgMul || 1), { src: caster, type: o.dtype || 'magic', elem: o.elem !== undefined ? o.elem : null, kb: 160, fx: ox, fy: oy, dot: true, aoe: true });
      if (e.dead) killed++;
    }
    function bossHit(e) {
      var d = o.bossDmg === undefined ? 90 : o.bossDmg;
      K().hurtEnemy(G, e, K().heroDmg(G, caster, d * (caster.def.statMul || 1) * (caster.mod.ultPow || 1)), { src: caster, type: o.dtype || 'magic', elem: o.elem !== undefined ? o.elem : null, stun: o.stun === undefined ? 1.5 : o.stun, kb: 60, fx: ox, fy: oy, crit: false, aoe: true });
    }
    others.forEach(bossHit);
    var shape = o.shape || 'screen', T = o.ringT || 0.4, resT = 0, W = Math.max(1, R.x1 - R.x0);
    if (shape === 'ring' || shape === 'inward') {   // 扩散环（由内向外）/ 缩圈（由外向内）：ringT 秒内扫过整个视口
      K().ring(G, ox, oy, ringMax, col, T, false); resT = T;
      minions.forEach(function (m) { var d = XY.dist(m.x, m.y, ox, oy), f = Math.min(1, d / ringMax), tt = T * (shape === 'ring' ? f : 1 - f); later(G, tt, function () { smite(m); }); });
    } else if (shape === 'sweep') {      // 横扫：从左到右一条线推过去
      resT = T; G.fx.push({ type: 'sweep', x: R.x0, y: R.cy, w: W, h: R.y1 - R.y0, t: 0, max: T, color: col });
      minions.forEach(function (m) { later(G, T * (m.x - R.x0) / W, function () { smite(m); }); });
    } else if (shape === 'waves') {      // 两波：第一波打掉大半血，第二波收尾
      resT = 0.2;
      minions.forEach(function (m) { K().hurtEnemy(G, m, m.maxHp * 0.65, { src: caster, type: o.dtype || 'magic', elem: o.elem !== undefined ? o.elem : null, kb: 120, fx: ox, fy: oy, dot: true }); if (m.dead) killed++; });
      K().ring(G, ox, oy, ringMax * 0.5, col, 0.2, false);
      later(G, 0.2, function () { K().ring(G, ox, oy, ringMax * 0.8, col, 0.2, false); minions.forEach(function (m) { smite(m); }); });
    } else if (shape === 'pull') {       // 渔网：先全部拽到施法者身边，再一网打尽
      resT = 0.38; G.pulled = 0;
      [0.06, 0.14, 0.22, 0.3].forEach(function (tt) { later(G, tt, function () { minions.forEach(function (m) { if (m.dead) return; m.x += (ox - m.x) * 0.4; m.y += (oy - m.y) * 0.4; G.pulled++; }); }); });
      K().ring(G, ox, oy, 260, col, 0.34, false);
      minions.forEach(function (m) { later(G, 0.38, function () { smite(m); }); });
    } else if (shape === 'lane') {       // 冲锋道：只清施法者所在的一条横带
      resT = T; var lh = o.laneH || 230;
      G.fx.push({ type: 'sweep', x: R.x0, y: oy - lh, w: W, h: lh * 2, t: 0, max: T, color: col });
      minions.forEach(function (m) { if (Math.abs(m.y - oy) < lh) later(G, T * (m.x - R.x0) / W, function () { smite(m); }); });
      if (o.dash) { caster.x = Math.max(60, Math.min(C.WORLD_W - 60, caster.x + o.dash)); caster.inv = Math.max(caster.inv || 0, 0.6); }
    } else if (shape === 'sleep') {      // 打盹：全屏睡着（眩晕 + 易伤），delay 秒后一睁眼全部结算
      var dl = o.delay || 2.2; resT = dl;
      list.forEach(function (m) { m.stunT = Math.max(m.stunT || 0, dl + 0.1); m.sleepUntil = G.t + dl; m.vulnUntil = G.t + dl + 2; m.vulnM = Math.max(m.vulnM || 0, 0.25); });
      K().ring(G, ox, oy, ringMax * 0.6, col, 0.5, true);
      minions.forEach(function (m) { later(G, dl, function () { smite(m); }); });
    } else {
      minions.forEach(function (m) { smite(m); });
    }
    if (o.onLand) o.onLand(G, list, R);
    var total = minions.length, flash = (shape === 'screen' || shape === 'waves' ? 1 : 0);
    G.shake = Math.max(G.shake, 14); if (flash) G.flash = Math.max(G.flash || 0, 0.5);
    G.fx.push({ type: 'ring', x: ox, y: oy, r: 700, t: 0, max: 0.45, color: col, fill: true });
    XY.hitstop(G, 0.05);
    if (XY.anim) XY.anim.ripple(G, ox, oy, col);
    if (XY.sfx) XY.sfx(shape === 'screen' || shape === 'waves' ? 'ult_land' : 'ult_sweep');
    var res = { total: total, others: others.length, t: G.t };
    later(G, resT + 0.02, function () {
      res.killed = minions.filter(function (m) { return m.dead; }).length; res.left = total - res.killed;
      if (total >= 12 && res.left === 0 && shape !== 'lane') {
        G.lastClear = G.t; G.clearFx = { t: 0, max: 1.0, n: res.killed, label: o.name ? o.name + ' · 清屏' : '清屏' };
        G.stats.screenClears = (G.stats.screenClears || 0) + 1;
      }
      G.lastClearRes = res; XY.magnetAll(G, 380, caster.down ? null : caster);   // v0.6：清屏后只吸身边 380（全图吸取是 Phyrex 的隐藏能力，别的角色不再有）
    });
    G.lastClearRes = res;
    return res;
  }

  /* ================= WebAudio ================= */
  var A = XY.audio = { ctx: null, master: null, mute: false, voices: 0, maxVoices: 0, played: 0, merged: 0, dropped: 0, byName: {}, last: {}, gemStep: 0, gemT: 0, nodes: 0,
    bgm: { kind: 'off', on: false, gain: null, base: 0.028, duck: 1, pad: null, pad2: null, arp: null, filt: null, step: 0, nextAt: 0, nodes: 0 } };
  try { A.mute = window.localStorage.getItem('xy_mute') === '1'; } catch (e) {}
  var LIMIT = 16, GAP = { hit: 0.045, crit: 0.06, kill: 0.04, elite: 0.1, gem: 0.03, coin: 0.05, ult_charge: 0.2, ult_land: 0.3, ult_sweep: 0.3, sky: 0.3, level: 0.5, card: 0.2, boss: 0.5, enrage: 1, danger: 0.6, wave_warn: 1, wave: 1, win: 1, lose: 1, place: 0.1, ui: 0.05, start: 0.8, chest: 0.25, sweep: 0.5, upgrade: 0.25, vfan: 0.2, vcharge: 0.2, vsummon: 0.3 };
  // 水墨风五声音阶（宫商角徵羽，A3 起）：安静琶音用
  var PENTA = [220.00, 246.94, 277.18, 329.63, 370.00, 440.00, 493.88, 554.37];
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      A.ctx = new AC(); A.master = A.ctx.createGain(); A.master.gain.value = A.mute ? 0 : 0.55;
      var comp = A.ctx.createDynamicsCompressor(); A.master.connect(comp); comp.connect(A.ctx.destination);
      var n = A.ctx.sampleRate * 0.5, buf = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      A.noise = buf;
      if (A.ctx.state === 'suspended') A.ctx.resume();
    } catch (e) { A.ctx = null; }
  };
  function bgmLevel() {
    if (A.mute) return 0;
    var b = A.bgm;
    return (b.kind === 'menu' ? b.base * 0.55 : b.base) * (b.duck == null ? 1 : b.duck);
  }
  function bgmApplyGain() {
    var g = A.bgm.gain; if (!g) return;
    var v = bgmLevel();
    try { g.gain.cancelScheduledValues(A.ctx.currentTime); } catch (e) {}
    g.gain.value = v;                                                        // 立刻落地：mute 时 e2e 可读到 0
  }
  A.setMute = function (m) {
    A.mute = !!m;
    try { window.localStorage.setItem('xy_mute', m ? '1' : '0'); } catch (e) {}
    if (A.master) A.master.gain.value = m ? 0 : 0.55;
    bgmApplyGain();                                                          // BGM 与静音联动：mute 时 bgm gain=0
  };
  function bgmDisconnect(node) {
    if (!node) return;
    try { node.onended = null; } catch (e) {}
    try { node.stop(0); } catch (e) {}
    try { node.disconnect(); } catch (e) {}
  }
  function bgmKill() {
    var b = A.bgm;
    bgmDisconnect(b.pad); bgmDisconnect(b.pad2); bgmDisconnect(b.arp);
    if (b.filt) { try { b.filt.disconnect(); } catch (e) {} }               // filter 无 stop
    if (b.arpGain) { try { b.arpGain.disconnect(); } catch (e) {} }
    if (b.gain) { try { b.gain.disconnect(); } catch (e) {} }
    b.pad = b.pad2 = b.arp = b.filt = b.arpGain = b.gain = null; b.nodes = 0; b.on = false; b.nextAt = 0; b.step = 0;
  }
  A.bgmStop = function () { bgmKill(); A.bgm.kind = 'off'; A.bgm.duck = 1; };
  // kind = 'play' | 'menu' | 'off'；切场景先杀旧节点再起新的，避免 oscillator 泄漏
  A.bgmStart = function (kind) {
    kind = kind || 'play';
    if (kind === 'off') { A.bgmStop(); return; }
    A.init();
    if (!A.ctx) return;
    var b = A.bgm;
    if (b.on && b.kind === kind && b.gain) { bgmApplyGain(); return; }       // 同 kind 不重建
    bgmKill();
    b.kind = kind; b.duck = b.duck == null ? 1 : b.duck;
    var ctx = A.ctx, g = ctx.createGain(); g.gain.value = 0; g.connect(A.master); b.gain = g;
    // pad：两个微失谐正弦，低通后极轻铺底（menu 更低）
    var padF = kind === 'menu' ? 110 : 146.83;
    var pad = ctx.createOscillator(); pad.type = 'sine'; pad.frequency.value = padF;
    var pad2 = ctx.createOscillator(); pad2.type = 'sine'; pad2.frequency.value = padF * 1.005;
    var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = kind === 'menu' ? 420 : 680; filt.Q.value = 0.5;
    var pg = ctx.createGain(); pg.gain.value = kind === 'menu' ? 0.35 : 0.45;
    pad.connect(filt); pad2.connect(filt); filt.connect(pg); pg.connect(g);
    pad.start(); pad2.start();
    b.pad = pad; b.pad2 = pad2; b.filt = filt;
    // arp：单 oscillator 复用，按五声阶跳音（play 稍密，menu 更疏更弱）
    var arp = ctx.createOscillator(); arp.type = 'triangle'; arp.frequency.value = PENTA[0];
    var ag = ctx.createGain(); ag.gain.value = 0.0001;
    arp.connect(ag); ag.connect(g); arp.start();
    b.arp = arp; b.arpGain = ag;
    b.nodes = 4;                                                             // pad + pad2 + filt path + arp（不含 bus gain）
    b.on = true; b.step = 0; b.nextAt = ctx.currentTime + 0.15;
    bgmApplyGain();
  };
  // 每帧轻量推进琶音；o.duck 在 tipHold / pause 时压到约 0.2
  A.bgmTick = function (o) {
    var b = A.bgm; if (!b.on || !A.ctx || !b.arp) return;
    if (o && o.duck !== undefined) {
      var d = Math.max(0, Math.min(1, o.duck));
      if (Math.abs(d - b.duck) > 0.01) { b.duck = d; bgmApplyGain(); }
    }
    if (A.mute || A.ctx.state !== 'running') return;
    var t = A.ctx.currentTime;
    if (t < b.nextAt) return;
    var gap = b.kind === 'menu' ? 1.15 : 0.72;
    var f = PENTA[b.step % PENTA.length];
    try {
      b.arp.frequency.setValueAtTime(f, t);
      var ag = b.arpGain, peak = b.kind === 'menu' ? 0.045 : 0.07;
      ag.gain.cancelScheduledValues(t);
      ag.gain.setValueAtTime(0.0001, t);
      ag.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      ag.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    } catch (e) {}
    b.step++; b.nextAt = t + gap;
  };
  function now() { return performance.now() / 1000; }
  function voice(spec) {                 // spec: {type, f0, f1, dur, gain, noise, bp, delay}
    var ctx = A.ctx, t0 = ctx.currentTime + (spec.delay || 0), g = ctx.createGain(), src;
    if (spec.noise) {
      src = ctx.createBufferSource(); src.buffer = A.noise; src.loop = true;
      var f = ctx.createBiquadFilter(); f.type = spec.bp ? 'bandpass' : 'lowpass'; f.frequency.setValueAtTime(spec.f0 || 1200, t0); if (spec.f1) f.frequency.exponentialRampToValueAtTime(spec.f1, t0 + spec.dur);
      src.connect(f); f.connect(g);
    } else {
      src = ctx.createOscillator(); src.type = spec.type || 'sine'; src.frequency.setValueAtTime(spec.f0, t0); if (spec.f1) src.frequency.exponentialRampToValueAtTime(spec.f1, t0 + spec.dur);
      src.connect(g);
    }
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(spec.gain, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur);
    g.connect(A.master);
    A.voices++; A.nodes++; if (A.voices > A.maxVoices) A.maxVoices = A.voices;
    src.onended = function () { A.voices--; try { g.disconnect(); } catch (e) {} };
    src.start(t0); src.stop(t0 + spec.dur + 0.02);
  }
  var RECIPE = {
    hit:   function () { return [{ type: 'triangle', f0: 340, f1: 170, dur: 0.05, gain: 0.10 }]; },
    crit:  function () { return [{ type: 'square', f0: 560, f1: 240, dur: 0.08, gain: 0.10 }, { noise: 1, f0: 3000, f1: 800, dur: 0.05, gain: 0.08 }]; },
    kill:  function () { return [{ noise: 1, f0: 2400, f1: 500, dur: 0.07, gain: 0.12 }]; },
    elite: function () { return [{ noise: 1, f0: 1800, f1: 200, dur: 0.22, gain: 0.2 }, { type: 'sine', f0: 150, f1: 50, dur: 0.25, gain: 0.3 }]; },
    gem:   function () { var n = A.gemStep, f = 520 * Math.pow(2, Math.min(12, n) / 12); return [{ type: 'sine', f0: f, f1: f * 1.02, dur: 0.07, gain: 0.07 }]; },
    coin:  function () { return [{ type: 'triangle', f0: 880, f1: 1320, dur: 0.09, gain: 0.09 }]; },
    ult_charge: function () { return [{ type: 'sawtooth', f0: 180, f1: 900, dur: 0.32, gain: 0.10 }]; },
    ult_land:   function () { return [{ type: 'sine', f0: 110, f1: 38, dur: 0.5, gain: 0.5 }, { noise: 1, f0: 4000, f1: 200, dur: 0.45, gain: 0.3 }, { type: 'square', f0: 660, f1: 330, dur: 0.12, gain: 0.08 }]; },
    ult_sweep:  function () { return [{ noise: 1, bp: 1, f0: 300, f1: 5000, dur: 0.45, gain: 0.3 }, { type: 'sine', f0: 130, f1: 50, dur: 0.4, gain: 0.35 }]; },
    sky:   function () { return [{ type: 'triangle', f0: 392, dur: 0.3, gain: 0.12 }, { type: 'triangle', f0: 523, dur: 0.3, gain: 0.12, delay: 0.08 }, { type: 'triangle', f0: 659, dur: 0.4, gain: 0.12, delay: 0.16 }]; },
    level: function () { return [{ type: 'triangle', f0: 523, dur: 0.15, gain: 0.12 }, { type: 'triangle', f0: 659, dur: 0.15, gain: 0.12, delay: 0.1 }, { type: 'triangle', f0: 784, dur: 0.3, gain: 0.12, delay: 0.2 }]; },
    card:  function (p) { var b = p === 'S' ? 700 : (p === 'A' ? 600 : 500); return [{ type: 'sine', f0: b, dur: 0.18, gain: 0.12 }, { type: 'sine', f0: b * 1.5, dur: 0.3, gain: 0.12, delay: 0.1 }]; },
    boss:  function () { return [{ type: 'sawtooth', f0: 90, f1: 55, dur: 0.7, gain: 0.25 }, { noise: 1, f0: 600, f1: 100, dur: 0.5, gain: 0.15 }]; },
    enrage: function () { return [{ type: 'sawtooth', f0: 70, f1: 40, dur: 1.0, gain: 0.3 }, { type: 'square', f0: 140, f1: 90, dur: 0.8, gain: 0.12 }, { noise: 1, f0: 2500, f1: 120, dur: 0.8, gain: 0.22 }, { type: 'sawtooth', f0: 220, f1: 330, dur: 0.5, gain: 0.1, delay: 0.5 }]; },
    wave_warn: function () { return [{ type: 'triangle', f0: 392, dur: 0.22, gain: 0.14 }, { type: 'triangle', f0: 523, dur: 0.3, gain: 0.14, delay: 0.2 }]; },
    wave:  function () { return [{ type: 'sawtooth', f0: 110, f1: 60, dur: 0.8, gain: 0.2 }, { noise: 1, f0: 800, f1: 120, dur: 0.6, gain: 0.12 }]; },
    danger: function () { return [{ type: 'square', f0: 220, f1: 200, dur: 0.18, gain: 0.07 }, { type: 'square', f0: 220, dur: 0.18, gain: 0.07, delay: 0.25 }]; },
    win:   function () { return [523, 659, 784, 1046].map(function (f, i) { return { type: 'triangle', f0: f, dur: 0.35, gain: 0.13, delay: i * 0.12 }; }); },
    lose:  function () { return [392, 330, 262, 196].map(function (f, i) { return { type: 'sine', f0: f, dur: 0.4, gain: 0.14, delay: i * 0.18 }; }); },
    place: function () { return [{ type: 'sine', f0: 300, f1: 200, dur: 0.08, gain: 0.1 }]; },
    ui:    function () { return [{ type: 'sine', f0: 600, dur: 0.05, gain: 0.06 }]; },
    start: function () { return [{ type: 'triangle', f0: 330, dur: 0.12, gain: 0.09 }, { type: 'triangle', f0: 440, dur: 0.14, gain: 0.09, delay: 0.08 }, { type: 'triangle', f0: 554, dur: 0.22, gain: 0.1, delay: 0.16 }]; },
    chest: function () { return [{ type: 'triangle', f0: 480, f1: 720, dur: 0.1, gain: 0.1 }, { type: 'sine', f0: 960, dur: 0.14, gain: 0.08, delay: 0.06 }, { noise: 1, f0: 1800, f1: 400, dur: 0.08, gain: 0.05, delay: 0.02 }]; },
    sweep: function () { return [{ type: 'triangle', f0: 523, dur: 0.1, gain: 0.1 }, { type: 'triangle', f0: 659, dur: 0.12, gain: 0.1, delay: 0.08 }, { type: 'triangle', f0: 784, dur: 0.18, gain: 0.1, delay: 0.16 }, { type: 'sine', f0: 1046, dur: 0.2, gain: 0.07, delay: 0.24 }]; },
    upgrade: function () { return [{ type: 'sine', f0: 440, f1: 660, dur: 0.12, gain: 0.09 }, { type: 'triangle', f0: 880, dur: 0.14, gain: 0.08, delay: 0.08 }]; },
    vfan: function () { return [{ type: 'sawtooth', f0: 220, f1: 110, dur: 0.14, gain: 0.08 }, { noise: 1, bp: 1, f0: 900, f1: 1800, dur: 0.12, gain: 0.06 }]; },
    vcharge: function () { return [{ type: 'square', f0: 180, f1: 90, dur: 0.16, gain: 0.08 }, { type: 'sine', f0: 90, f1: 50, dur: 0.2, gain: 0.12 }]; },
    vsummon: function () { return [{ type: 'triangle', f0: 392, dur: 0.1, gain: 0.08 }, { type: 'triangle', f0: 523, dur: 0.12, gain: 0.08, delay: 0.07 }, { type: 'sine', f0: 262, dur: 0.2, gain: 0.07, delay: 0.12 }]; }
  };
  // 事件入口：由伤害 / 死亡 / 拾取 / 状态事件调用，不从渲染循环调用
  XY.sfx = function (name, p) {
    A.byName[name] = (A.byName[name] || 0) + 1; A.played++;
    if (name === 'gem') { var t = now(); A.gemStep = t - A.gemT < 0.5 ? A.gemStep + 1 : 0; A.gemT = t; }
    if (A.mute || !A.ctx || A.ctx.state !== 'running') { A.silent = (A.silent || 0) + 1; return; }
    var t0 = now(), gap = GAP[name] === undefined ? 0.05 : GAP[name];
    if (t0 - (A.last[name] || -9) < gap) { A.merged++; return; }          // 同类事件合并：200 杀不会建 200 套音源
    var specs = RECIPE[name] ? RECIPE[name](p) : null; if (!specs) return;
    if (A.voices + specs.length > LIMIT) { A.dropped++; return; }            // 并发预算：同时发声节点 ≤ 16
    A.last[name] = t0;
    for (var i = 0; i < specs.length; i++) voice(specs[i]);
  };
})();
