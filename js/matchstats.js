/* ============================================================
 * matchstats.js —— 匿名对局统计（r63）
 *
 * 每打完一局记一行：哪一关、哪一档、输赢、怎么输的、用时、师父走到哪、倒地、等级、带的谁、设备、帧率。
 * 中途放弃（回首页 / 重来）记 abandon；战斗中关掉页面、切走再没回来记 quit（下次打开时补发）。
 * 只记游戏里的事：不记账号、邮箱、名字、存档内容。用一个本机随机编号把同一台设备的几局串起来。
 *
 * 先进本机队列（localStorage），再分批发到 Supabase 的 log_matches（和云存档同一个项目，建表见 docs/match-stats/setup.sql）。
 * 发不出去就留着下次再发，最多留 80 条；表还没建（404）这次打开就不再试。
 *
 * 关闭：隐私页 privacy.html 的开关（写 localStorage 的 xy_stats_off=1），或地址加 ?nostats=1。
 * 只有线上（xiyou-td-play）和测试站（xiyou-td-test）会发；本机 / 别处默认不发，地址加 ?stats=1 才发。
 * 玩法包（mod）和「我的洞府」验关不记。全开测试档照记，但带 test_build=true，看数据时过滤掉。
 *
 * 测试口：XY.matchStats._transport = function (rows) { return Promise.resolve({ status: 200 }); } 换掉网络；
 *         XY.matchStats.queue() 看队列；XY.matchStats.flush() 立刻发。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY || !XY.save || !XY.save.commitRun) return;

  var REL = 'r63';
  var URL = 'https://ftorjdmbbagzwojamtnj.supabase.co';
  var PUB = 'sb_publishable_oUR3b8V6A69bU1JrmfEAzA_vgXQXMKB';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0b3JqZG1iYmFnendvamFtdG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDMyMTksImV4cCI6MjEwOTgxOTIxOX0.zwmP89BMJSJTBwKRuipZOq9Jwz4WAAcFFRGi6TLGdqQ';
  var K_OFF = 'xy_stats_off', K_CID = 'xy_stats_cid', K_Q, K_PEND, K_TRY;          // 队列 / 待补 / 次数按站分开（线上和测试站同一个域名，共用 localStorage）
  var MAXQ = 80, BATCH = 20;

  var MS = XY.matchStats = { release: REL };
  var mem = {};
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return mem.hasOwnProperty(k) ? mem[k] : null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { } delete mem[k]; }
  function readJSON(k, dflt) { try { var v = JSON.parse(lsGet(k)); return v == null ? dflt : v; } catch (e) { return dflt; } }
  function qs(name) { try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; } }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r3(x) { return Math.round(x * 1000) / 1000; }
  function num(x) { return typeof x === 'number' && isFinite(x) ? x : null; }
  function str(x, n) { return x == null || x === '' ? null : String(x).slice(0, n || 40); }

  function rand(bytes) {
    var a = new Uint8Array(bytes), i, out = '';
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < bytes; i++) out += (a[i] < 16 ? '0' : '') + a[i].toString(16);
    return out;
  }

  /* ---------- 在哪个站：线上 / 测试站 / 本机 / 别处 ---------- */
  MS.site = function () {
    var h = (window.location.hostname || '').toLowerCase(), p = window.location.pathname || '';
    if (h === 'nisen0808-web.github.io') return /\/xiyou-td-test(\/|$)/i.test(p) ? 'test' : /\/xiyou-td-play(\/|$)/i.test(p) ? 'live' : 'other';
    if (!h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || window.location.protocol === 'file:') return 'dev';
    return 'other';
  };
  K_Q = 'xy_stats_q:' + MS.site(); K_PEND = 'xy_stats_pend:' + MS.site(); K_TRY = 'xy_stats_try:' + MS.site();
  MS.enabled = function () {
    if (lsGet(K_OFF) === '1' || qs('nostats') === '1') return false;
    var s = MS.site();
    return s === 'live' || s === 'test' || qs('stats') === '1';
  };
  MS.setEnabled = function (on) {
    if (on) lsDel(K_OFF);
    else { lsSet(K_OFF, '1'); lsDel(K_Q); lsDel(K_PEND); }
    return MS.enabled();
  };
  MS.cid = function () {
    var c = lsGet(K_CID);
    if (!c || !/^[0-9a-f]{16,32}$/.test(c)) { c = rand(12); lsSet(K_CID, c); }
    return c;
  };

  /* ---------- 设备：只要粗分类，不要完整 UA ---------- */
  function device() {
    var n = window.navigator || {}, ua = n.userAgent || '', tp = n.maxTouchPoints || 0;
    var os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && tp > 1) ? 'ios' : /Android/.test(ua) ? 'android' : /CrOS/.test(ua) ? 'chromeos' : /Windows/.test(ua) ? 'windows' : /Mac OS X/.test(ua) ? 'mac' : /Linux/.test(ua) ? 'linux' : 'other';
    var br = /Twitter/i.test(ua) ? 'x-app' : /MicroMessenger/i.test(ua) ? 'wechat' : /Telegram/i.test(ua) ? 'telegram' : /Edg\//.test(ua) ? 'edge' : /OPR\//.test(ua) ? 'opera' : /CriOS|Chrome\//.test(ua) ? 'chrome' : /FxiOS|Firefox\//.test(ua) ? 'firefox' : /Safari\//.test(ua) ? 'safari' : 'other';
    return { os: os, br: br, touch: tp > 0 || ('ontouchstart' in window), vw: Math.round(window.innerWidth || 0), vh: Math.round(window.innerHeight || 0), dpr: r1(window.devicePixelRatio || 1), mem: num(n.deviceMemory) };
  }

  /* ---------- 当前这一局：开局时的教程状态 + 帧率采样 ---------- */
  var cur = null, lastNow = 0;
  function curG() { var x = window.__xy; return (x && x.G) || XY.G || null; }
  function screenOf() { var x = window.__xy; return x && x.app ? x.app.screen : null; }
  function track(G) { if (G && (!cur || cur.G !== G)) cur = { G: G, tut: !!G.tut, frames: 0, ms: 0, slow: 0 }; return cur; }
  function frame(now) {
    try {
      var G = curG();
      track(G);
      var vis = !document.visibilityState || document.visibilityState === 'visible';
      if (cur && cur.G === G && G && !G.committed && screenOf() === 'play' && vis && lastNow) {
        var dt = now - lastNow;
        if (dt > 0 && dt < 1000) { cur.frames++; cur.ms += dt; if (dt > 50) cur.slow++; }
      }
      lastNow = vis ? now : 0;
    } catch (e) { }
    window.requestAnimationFrame(frame);
  }
  if (window.requestAnimationFrame) window.requestAnimationFrame(frame);

  /* ---------- 一局变成一行 ---------- */
  function kindOf(G) { return G.mod ? 'mod' : G.lair ? 'lair' : G.villain ? 'villain' : G.dungeon ? 'dungeon' : 'level'; }
  function destOf(G, kind) { return kind === 'dungeon' ? String(G.dungeon.id) : kind === 'villain' ? 'bajiao' : String(G.levelId); }
  function diffKey(kind, dest) { return kind === 'level' ? 'L' + dest : kind === 'dungeon' ? 'D' + dest : kind === 'villain' ? 'V' : kind === 'boss' ? 'B' : null; }
  function doneMax(key) { try { return XY.diff && XY.diff.doneMax && key ? XY.diff.doneMax(key) | 0 : 0; } catch (e) { return 0; } }

  function baseRow() {
    var d = device();
    return { rid: rand(10), cid: MS.cid(), site: MS.site(), rel: REL, gv: str(XY.VERSION, 16), test_build: !!XY.TEST_BUILD,
      os: d.os, br: d.br, touch: d.touch, vw: d.vw, vh: d.vh, dpr: d.dpr, client_at: new Date().toISOString(), extra: d.mem ? { mem: d.mem } : {} };
  }
  function bumpTry(key, win) {
    var t = readJSON(K_TRY, {}); if (!t || typeof t !== 'object') t = {};
    var e = t[key] || (t[key] = { n: 0, w: 0 }), before = e.w > 0;
    e.n++; if (win) e.w++;
    var ks = Object.keys(t); if (ks.length > 60) delete t[ks[0]];
    lsSet(K_TRY, JSON.stringify(t));
    return { n: e.n, wonHere: before };
  }

  function runRow(G, result, rep, wonBefore) {
    var kind = kindOf(G);
    if (kind === 'mod' || kind === 'lair' || G.godMode) return null;
    if (rep && rep.skipped) return null;
    var r = baseRow(), e = G.ending || {}, dest = destOf(G, kind), tier = G.diff && G.diff.tier ? G.diff.tier | 0 : null;
    var h = G.heroes && G.heroes[G.ctrl], c = cur && cur.G === G ? cur : null;
    r.kind = kind; r.dest = dest; r.tier = tier; r.result = result;
    r.cause = result === 'win' || result === 'lose' ? str(e.cause ? e.cause + (e.how ? ':' + e.how : '') : null, 24) : null;
    r.sec = Math.max(0, Math.round(G.t || 0));
    if ((kind === 'level' || kind === 'dungeon') && G.tang && G.rt && G.rt.total > 0) r.prog = r3(Math.max(0, Math.min(1, G.tang.s / G.rt.total)));
    var stars = rep && rep.stars != null ? rep.stars : rep && rep.rewards && rep.rewards.stars != null ? rep.rewards.stars : null;
    r.stars = result === 'win' && stars != null ? stars | 0 : null;
    try { r.downs = XY.runCasualties ? XY.runCasualties(G).count : null; } catch (err) { r.downs = null; }
    r.team_lv = num(G.level); r.kills = num(G.kills);
    r.lead = h && h.def ? str(h.def.id || h.id, 24) : null;
    r.special = str(G.special, 24);
    r.tut = c ? c.tut : !!G.tut;
    if (c && c.ms > 5000 && c.frames > 0) { r.fps = r1(c.frames / (c.ms / 1000)); r.slow = c.slow; }
    var tr = bumpTry(kind + ':' + dest + ':' + (tier || 0), result === 'win');
    r.try_no = tr.n;
    r.won_before = wonBefore == null ? tr.wonHere : !!(wonBefore || tr.wonHere);
    if (G.speed && G.speed !== 1) r.extra.spd = G.speed;
    if (G.tangGuardUsed) r.extra.guard = G.tangGuardUsed | 0;
    if (kind === 'villain' && rep && rep.rewards && num(rep.rewards.cave) != null) r.extra.cave = r3(rep.rewards.cave);
    if (G.camp && G.camp.maxHp > 0 && kind !== 'villain') r.extra.camp = r3(Math.max(0, G.camp.hp) / G.camp.maxHp);
    return r;
  }
  function wonBeforeOf(G) {
    var kind = kindOf(G); if (!G.diff || !G.diff.tier) return null;
    return doneMax(diffKey(kind, destOf(G, kind))) >= (G.diff.tier | 0);
  }

  /* ---------- 队列 ---------- */
  function readQ() { var q = readJSON(K_Q, []); return Array.isArray(q) ? q : []; }
  function writeQ(q) { if (q.length > MAXQ) q = q.slice(q.length - MAXQ); if (q.length) lsSet(K_Q, JSON.stringify(q)); else lsDel(K_Q); }
  function enqueue(row) {
    if (!row || !MS.enabled()) return false;
    var q = readQ(); q.push(row); writeQ(q);
    schedule(2000);
    return true;
  }
  MS.queue = function () { return readQ(); };

  /* 战斗中切走 / 关页面：先记一条「放弃」放在一边；回来接着打就撤掉，没回来下次打开时补进队列 */
  function liveRun() {
    var G = curG(), sc = screenOf();
    return G && !G.committed && (G.t || 0) > 3 && (sc === 'play' || sc === 'pause') ? G : null;
  }
  function park() {
    var G = liveRun(); if (!G || !MS.enabled()) return;
    if (cur && cur.G === G && cur.quitQueued) return;                         // 这一局的 quit 已经进队列了（页面正在关）
    var p = readJSON(K_PEND, null), row;
    try {
      // 存档里的尝试次数不能在这里加，回来接着打的话会多算一次：用一份副本
      var keep = lsGet(K_TRY); row = runRow(G, 'quit', null, wonBeforeOf(G)); if (keep == null) lsDel(K_TRY); else lsSet(K_TRY, keep);
    } catch (e) { row = null; }
    if (!row) return;
    if (p && p.rid && cur && cur.parkRid === p.rid) row.rid = p.rid;      // 同一局多次切走只留一条
    if (cur) cur.parkRid = row.rid;
    row.try_no = null;
    lsSet(K_PEND, JSON.stringify(row));
  }
  function unpark(G) {                                                        // 只撤这一局自己放的那条，别的（上次打开没补完的）不动
    var p = readJSON(K_PEND, null);
    if (p && cur && (!G || cur.G === G) && cur.parkRid && p.rid === cur.parkRid) lsDel(K_PEND);
    if (cur && (!G || cur.G === G)) cur.parkRid = null;
  }
  function adoptParked() {
    var p = readJSON(K_PEND, null); lsDel(K_PEND);
    if (p && p.rid && p.kind) {
      var tr = bumpTry(p.kind + ':' + p.dest + ':' + (p.tier || 0), false); p.try_no = tr.n;
      enqueue(p);
    }
  }

  /* ---------- 发送 ---------- */
  var sending = false, dead = false, keyMode = 0, timer = null, fails = 0;
  function schedule(ms) {
    if (timer || dead) return;
    timer = setTimeout(function () { timer = null; MS.flush(); }, ms);
  }
  function post(rows, unloading) {
    if (MS._transport) return Promise.resolve(MS._transport(rows, keyMode));
    if (!window.fetch) return Promise.reject(new Error('no fetch'));
    var h = keyMode === 0 ? { apikey: PUB } : { apikey: ANON, Authorization: 'Bearer ' + ANON };
    h['Content-Type'] = 'application/json';
    return window.fetch(URL + '/rest/v1/rpc/log_matches', { method: 'POST', headers: h, body: JSON.stringify({ p_rows: rows }), keepalive: !!unloading, credentials: 'omit', cache: 'no-store' });
  }
  function drop(rows) {
    var ids = {}; rows.forEach(function (r) { ids[r.rid] = true; });
    writeQ(readQ().filter(function (r) { return !ids[r.rid]; }));
  }
  function retryLater() { fails++; schedule(Math.min(600000, 30000 * Math.pow(2, Math.min(fails - 1, 5)))); }
  MS.flush = function (unloading) {
    if (!MS.enabled() || sending || dead) return Promise.resolve(false);
    var q = readQ(); if (!q.length) return Promise.resolve(true);
    var batch = q.slice(0, BATCH);
    sending = true;
    return post(batch, unloading).then(function (res) {
      sending = false;
      var st = res && res.status | 0;
      if (st >= 200 && st < 300) { fails = 0; drop(batch); if (readQ().length) schedule(500); return true; }
      if ((st === 401 || st === 403) && keyMode === 0) { keyMode = 1; schedule(200); return false; }
      if (st === 404) { dead = true; return false; }                                        // 表或函数还没建：这次打开不再试，数据留着
      if (st >= 400 && st < 500 && st !== 408 && st !== 429) { drop(batch); return false; }  // 被拒的数据丢掉，免得一直卡着后面的
      retryLater(); return false;
    }, function () { sending = false; retryLater(); return false; });
  };

  /* ---------- 挂钩 ---------- */
  var oldCommit = XY.save.commitRun;
  XY.save.commitRun = function (G, result) {
    var fresh = !!(G && !G.committed), wb = null;
    if (fresh) { try { wb = wonBeforeOf(G); } catch (e) { } }
    var rep = oldCommit.apply(this, arguments);
    if (fresh) {
      try { unpark(G); if (MS.enabled()) enqueue(runRow(G, result === 'win' || result === 'lose' ? result : 'abandon', rep, wb)); }
      catch (e) { if (window.console) console.warn('matchstats', e); }
    }
    return rep;
  };
  // Boss 战在 iframe 里打，档位是开战时 bossfight_host 调 XY.diff.bossTier() 定的；打赢后选档会跳到新开的档，所以开战时就记下来
  var bossAtOpen = null;
  if (XY.diff && XY.diff.bossTier) {
    var oldBT = XY.diff.bossTier;
    XY.diff.bossTier = function () { var t = oldBT.apply(this, arguments); try { bossAtOpen = { tier: t | 0, done: doneMax('B') }; } catch (e) { } return t; };
  }
  if (XY.board && XY.board.onBoss) {
    var oldBoss = XY.board.onBoss;
    XY.board.onBoss = function (series, res) {
      var out = oldBoss.apply(this, arguments);
      try {
        if (MS.enabled() && res && typeof res.win === 'boolean') {
          var open = bossAtOpen, r = baseRow(), tier = open ? open.tier : XY.diff && XY.diff.selected ? XY.diff.selected('B') | 0 : null, dest = str(series || 'niumo', 24);
          r.kind = 'boss'; r.dest = dest; r.tier = tier || null; r.result = res.win ? 'win' : 'lose';
          r.cause = res.win ? null : str(res.why, 24);
          r.sec = num(res.time) != null ? Math.round(res.time) : null;
          r.stars = res.win ? res.stars | 0 : null;
          r.lead = str(res.partner, 24);
          var tr = bumpTry('boss:' + dest + ':' + (tier || 0), res.win);
          r.try_no = tr.n; r.won_before = tr.wonHere || (open ? open.done >= (tier || 0) : doneMax('B') > (tier || 0));
          if (num(res.bossHpPct) != null) r.extra.boss_hp = res.bossHpPct;
          if (res.summon) r.extra.summon = str(res.summon, 24);
          enqueue(r);
        }
      } catch (e) { if (window.console) console.warn('matchstats.boss', e); }
      return out;
    };
  }

  window.addEventListener('pagehide', function (ev) {
    park();
    if (!(ev && ev.persisted)) {
      var G = liveRun(); adoptParked(); if (G && cur && cur.G === G) cur.quitQueued = true;
      if (timer) { clearTimeout(timer); timer = null; } MS.flush(true);
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { park(); if (timer) { clearTimeout(timer); timer = null; } MS.flush(true); }
    else { var G = liveRun(); if (G) unpark(G); }
  });
  window.addEventListener('pageshow', function (ev) { var G = ev && ev.persisted && liveRun(); if (G) unpark(G); });

  MS.debug = { park: park, adoptParked: adoptParked, runRow: runRow, reset: function () { sending = false; dead = false; keyMode = 0; fails = 0; if (timer) { clearTimeout(timer); timer = null; } }, state: function () { return { sending: sending, dead: dead, keyMode: keyMode, fails: fails, cur: cur && { tut: cur.tut, frames: cur.frames, ms: cur.ms, slow: cur.slow } }; } };

  try { if (MS.enabled()) adoptParked(); else lsDel(K_PEND); } catch (e) { }        // 上次打开时没打完就关掉的那一局，现在补进队列
  setTimeout(function () { try { if (MS.enabled()) MS.flush(); } catch (e) { } }, 4000);
})();
