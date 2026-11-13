/* Google 登录、云存档、服务端首次十连。
 * 没登录、没网：继续用本地存档，不挡开局。
 * 两边都有进度时必须让玩家选，不静默覆盖。
 * 已登录的十连只走 draw_first_ten。清本地档不能重抽：服务端结果会替换本地那次，并退回已经发出的角色卡。
 * 没登录才用 XY.gacha10.roll（每个本地存档一次）。登录后断网也不改在本机新抽。
 * 这里只有可公开的 URL 和 publishable / anon key。 */
(function () {
  'use strict';
  var XY = window.XY;
  if (!XY || !XY.save || !XY.gacha10) return;
  var URL = 'https://ftorjdmbbagzwojamtnj.supabase.co';
  var PUB = 'sb_publishable_oUR3b8V6A69bU1JrmfEAzA_vgXQXMKB';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0b3JqZG1iYmFnendvamFtdG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDMyMTksImV4cCI6MjEwOTgxOTIxOX0.zwmP89BMJSJTBwKRuipZOq9Jwz4WAAcFFRGi6TLGdqQ';
  var NONE = { show: false, fresh: false, rec: null };
  var session = null, uid = null, profile = null, avatarImg = null;
  var choice = null, swapNote = null, expectVer = null, reconciled = false, applying = false;
  var drawDone = false, drawBusy = false, inflight = false, queued = false, timer = null;
  var authGate = false, real = null, libP = null, lastDraw = null;
  var stub = { on: false, spec: null, remote: null, drew: false, results: null };
  var calls = [];

  function toast(text, bad) {
    var a = window.__xy && window.__xy.app;
    if (!a) return;
    a.menuMsg = { text: text, bad: !!bad, until: (a.rt || 0) + 3.4 };
  }
  function metaOf(user) {
    var m = (user && user.user_metadata) || {};
    return {
      name: m.full_name || m.name || (user && user.email ? String(user.email).split('@')[0] : '') || '已登录',
      email: (user && user.email) || '',
      avatar: m.avatar_url || m.picture || ''
    };
  }
  function setAvatar(url) {
    avatarImg = null;
    if (!url) return;
    var im = new Image();
    if (/^https?:/i.test(url)) im.crossOrigin = 'anonymous';
    im.onload = function () { if (im.naturalWidth) avatarImg = im; };
    im.onerror = function () { avatarImg = null; };
    im.src = url;
    if (im.complete && im.naturalWidth) avatarImg = im;
  }
  function applyProfile(user, row) {
    var m = metaOf(user);
    profile = {
      name: (row && row.display_name) || m.name,
      email: m.email,
      avatar: (row && row.avatar_url) || m.avatar
    };
    setAvatar(profile.avatar);
  }
  function progress(d) {
    if (!d || typeof d !== 'object') return false;
    var st = d.stats || {}, k, n = 0;
    if ((st.runs | 0) > 0 || (st.wins | 0) > 0 || (st.kills | 0) > 0) return true;
    if ((d.lingshi | 0) > 0 || (d.shards | 0) > 0) return true;
    if (d.gacha10 && d.gacha10.pulls && d.gacha10.pulls.length) return true;
    if (d.tutorial && d.tutorial.done) return true;
    if (d.deck && d.deck.join && d.deck.join(',') !== 'jingubang,jindouyun,huoyan') return true;
    for (k in (d.levels || {})) if (d.levels[k] && (d.levels[k].cleared || d.levels[k].best)) return true;
    for (k in (d.dng || {})) if (d.dng[k] && d.dng[k].cleared) return true;
    for (k in ((d.sp && d.sp.cards) || {})) if ((d.sp.cards[k] | 0) > 0) return true;
    if (d.spGear && d.spGear.bag) { for (k in d.spGear.bag) if ((d.spGear.bag[k] | 0) > 0) return true; }
    for (k in (d.cards || {})) n++;
    return n > 3;
  }
  function sig(d) {
    d = d || {};
    return JSON.stringify({
      runs: d.stats && d.stats.runs, wins: d.stats && d.stats.wins, kills: d.stats && d.stats.kills,
      lingshi: d.lingshi | 0, gacha: d.gacha10 && d.gacha10.pulls, sp: d.sp && d.sp.cards, gear: d.spGear || null, devilKitty: d.devilKitty || null, levels: d.levels, deck: d.deck
    });
  }
  function clockOf(d) {
    var when = d && d.updatedAt ? new Date(d.updatedAt) : null;
    if (!when || isNaN(when.getTime())) return '还没有';
    return (when.getMonth() + 1) + '月' + when.getDate() + '日 ' + when.getHours() + ':' + (when.getMinutes() < 10 ? '0' : '') + when.getMinutes();
  }
  function saveFacts(d) {
    d = d || {};
    var st = d.stats || {}, cards = (d.sp && d.sp.cards) || {}, n = 0, k;
    for (k in cards) if ((cards[k] | 0) > 0) n++;
    return { runs: st.runs | 0, wins: st.wins | 0, lingshi: d.lingshi | 0, cards: n, time: clockOf(d) };
  }
  function kaiFam() { return (XY.menu && XY.menu.KAI) || '"STKaiti","KaiTi","楷体","Noto Serif CJK SC","Source Han Serif SC",serif'; }
  function kai(c, s, x, y, sz, col, al, maxW) {
    s = String(s);
    c.font = 'bold ' + sz + 'px ' + kaiFam();
    if (maxW) { var w = c.measureText(s).width; if (w > maxW && w > 0) { sz = Math.max(11, sz * maxW / w); c.font = 'bold ' + sz + 'px ' + kaiFam(); } }
    c.fillStyle = col; c.textAlign = al || 'center'; c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }
  function phrase(c, word, num, cx, y, numSz, maxW) {
    var fam = kaiFam(), ws = Math.round(numSz * 0.42), gap = Math.round(numSz * 0.28);
    c.font = 'bold ' + numSz + 'px ' + fam;
    var nw = c.measureText(String(num)).width;
    c.font = 'bold ' + ws + 'px ' + fam;
    var ww = c.measureText(word).width, total = ww + gap + nw, scale = maxW && total > maxW ? maxW / total : 1;
    var nSz = Math.max(20, numSz * scale), wSz = Math.max(13, ws * scale), g2 = gap * scale;
    c.font = 'bold ' + nSz + 'px ' + fam; nw = c.measureText(String(num)).width;
    c.font = 'bold ' + wSz + 'px ' + fam; ww = c.measureText(word).width;
    var x0 = cx - (ww + g2 + nw) / 2;
    c.fillStyle = '#6a5340'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = 'bold ' + wSz + 'px ' + fam; c.fillText(word, x0, y + Math.max(1, nSz * 0.06));
    c.fillStyle = '#1a120c'; c.font = 'bold ' + nSz + 'px ' + fam; c.fillText(String(num), x0 + ww + g2, y);
  }
  function redGo(c, st, x, y, w, h, label, act, ex) {
    var hv = st.over && st.over(x, y, w, h), oy = hv ? -2 : 0, rr = Math.min(18, h * 0.32), R = XY.R;
    c.save();
    c.shadowColor = 'rgba(176,42,28,0.4)'; c.shadowBlur = 16; c.shadowOffsetY = 4;
    var gr = c.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, hv ? '#e2553a' : '#d7432a');
    gr.addColorStop(1, hv ? '#c13620' : '#b3301c');
    R.rrect(c, x, y + oy, w, h, rr); c.fillStyle = gr; c.fill();
    c.restore();
    c.save(); c.lineWidth = 1.6; c.strokeStyle = 'rgba(255,214,150,0.85)';
    R.rrect(c, x + 3, y + 3 + oy, w - 6, h - 6, Math.max(6, rr - 3)); c.stroke(); c.restore();
    kai(c, label, x + w / 2, y + h / 2 + oy, Math.min(22, Math.round(h * 0.4)), '#fff8e8', 'center', w - 18);
    st.hit(x, y, w, h, act, ex);
  }
  function payload() {
    var d;
    try { d = JSON.parse(JSON.stringify(XY.save.data)); } catch (e) { return null; }
    if (tooBig(d) && d.boards) d.boards.others = {};
    if (tooBig(d)) return null;
    return d;
  }
  function tooBig(d) {
    var s = JSON.stringify(d), n = window.TextEncoder ? new TextEncoder().encode(s).length : s.length;
    return n > 1000000;
  }
  function note(op, extra) { var row = { op: op }; if (extra) for (var k in extra) row[k] = extra[k]; calls.push(row); }

  function sbSelect(table) {
    if (stub.on) {
      if (table === 'saves') {
        note('selectSave');
        if (stub.spec && stub.spec.failSelect) return Promise.resolve({ data: null, error: { message: 'offline' } });
        var row = stub.remote ? { data: stub.remote.data, version: stub.remote.version, game_version: stub.remote.game_version || '0.8.8', updated_at: stub.remote.updated_at } : null;
        return Promise.resolve({ data: row, error: null });
      }
      note('selectProfile');
      var u = stub.spec && stub.spec.user || {};
      return Promise.resolve({ data: { display_name: u.name || '', avatar_url: u.avatar || '' }, error: null });
    }
    var q = table === 'saves' ? 'data, version, game_version, updated_at' : 'display_name, avatar_url, created_at';
    return real.from(table).select(q).maybeSingle();
  }
  function sbSave(data, expected, game) {
    if (stub.on) {
      note('save', { expected: expected, runs: data && data.stats && data.stats.runs, lingshi: data && data.lingshi });
      var cur = stub.remote ? stub.remote.version : 0;
      if (expected !== cur) {
        return Promise.resolve({ data: { conflict: true, version: cur, data: stub.remote ? stub.remote.data : null, game_version: game, updated_at: stub.remote && stub.remote.updated_at }, error: null });
      }
      var next = cur + 1;
      stub.remote = { version: next, data: JSON.parse(JSON.stringify(data)), game_version: game, updated_at: new Date().toISOString() };
      return Promise.resolve({ data: { conflict: false, version: next, data: stub.remote.data, game_version: game, updated_at: stub.remote.updated_at }, error: null });
    }
    return real.rpc('save_game', { p_data: data, p_expected_version: expected, p_game_version: game || null });
  }
  function sbDraw() {
    if (stub.on) {
      note('draw');
      if (stub.spec && stub.spec.failDraw) return Promise.resolve({ data: null, error: { message: 'offline' } });
      if (!stub.results) {
        var pool = (XY.SPECIALS || []).map(function (d) { return d.id; }), i;
        stub.results = [];
        for (i = 0; i < 10; i++) stub.results.push(pool[i % pool.length] || 'phyrex');
      }
      var already = stub.drew;
      stub.drew = true;
      lastDraw = { already_drawn: already, results: stub.results.slice() };
      return Promise.resolve({ data: lastDraw, error: null });
    }
    return real.rpc('draw_first_ten');
  }

  function adopt(data, version) {
    if (!data || typeof data !== 'object') return false;
    applying = true;
    try {
      var d = JSON.parse(JSON.stringify(data));
      d.mode = XY.TEST_BUILD ? 'test' : 'std';
      window.localStorage.setItem(XY.save.KEY, JSON.stringify(d));
      XY.save.load();
      expectVer = version;
    } catch (e) {
      toast('云端存档没能读进来，本机档还在', true);
      applying = false;
      return false;
    }
    applying = false;
    return true;
  }
  function openChoice(kind, remoteData, version, updated) {
    choice = { kind: kind, remoteData: remoteData, version: version, updated: updated };
  }
  /* 登录后不再自己去抽。只有两种情况才向服务端要十连：玩家在首页「活动」里点了抽（_showFlip），
   * 或者这份存档里已经有一次十连（要拿服务端那次来对，防止清档重抽）。 */
  function drawWanted() {
    var r = XY.save && XY.save.data && XY.save.data.gacha10;
    return !!((XY.gacha10 && XY.gacha10._showFlip) || (r && r.granted && r.pulls && r.pulls.length === 10));
  }
  function tick() {
    if (!session || choice || !reconciled || drawDone === true || drawDone === 'err') return;
    if (XY.save && XY.save.holdCloud) return;
    if (!drawWanted()) return;
    startDraw();
  }
  function push(expected, opts) {
    opts = opts || {};
    if (XY.save && XY.save.holdCloud) return Promise.resolve(false);
    if (applying || !session || choice) return Promise.resolve(false);
    if (!reconciled && !opts.force) return Promise.resolve(false);
    if (inflight) { queued = true; return Promise.resolve(false); }
    var data = payload();
    if (!data) { toast('存档太大，没有上传。本机档还在', true); return Promise.resolve(false); }
    var exp = expected != null ? expected : expectVer;
    if (exp == null) return Promise.resolve(false);
    inflight = true;
    return sbSave(data, exp, XY.VERSION).then(function (res) {
      inflight = false;
      var body = res && res.data;
      if (!res || res.error || !body) { toast('云端没保存上，本机档还在', true); return false; }
      if (body.conflict) {
        if ((!body.data || !progress(body.data)) && opts.force && !opts.retried && body.version != null) {
          return push(body.version, { force: true, retried: true });
        }
        reconciled = true;
        openChoice('conflict', body.data, body.version, body.updated_at);
        toast('云端存档和这台设备对不上，没有覆盖', true);
        return false;
      }
      if (body.version != null) expectVer = body.version;
      if (queued) { queued = false; return push(); }
      return true;
    }, function () {
      inflight = false;
      toast('云端没保存上，本机档还在', true);
      return false;
    });
  }
  function schedule() {
    if (XY.save && XY.save.holdCloud) return;
    if (applying || !session || choice || !reconciled || expectVer == null) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; push(); }, 900);
  }
  function pushSoon() {
    if (timer) { clearTimeout(timer); timer = null; }
    push();
  }
  function reconcile() {
    if (XY.save && XY.save.holdCloud) { reconciled = true; return Promise.resolve(); }
    return sbSelect('saves').then(function (res) {
      if (!session) return;
      if (!res || res.error) {
        reconciled = true;
        drawDone = 'err';
        toast('云端暂时连不上，先用本机存档', true);
        return;
      }
      var row = res.data, remote = row && row.data, ver = row ? (row.version || 0) : 0;
      if (remote && progress(remote) && ((remote.saveEpoch | 0) < (XY.save.EPOCH || 0))) {
        XY.save.holdCloud = true; reconciled = true; return;
      }
      if (!remote || !progress(remote)) {
        if (!progress(XY.save.data) && remote) { expectVer = ver; reconciled = true; tick(); return; }
        return push(row ? ver : 0, { force: true }).then(function (ok) {
          if (!session || choice) return;
          reconciled = true;
          if (ok !== false) tick();
        });
      }
      if (!progress(XY.save.data)) { adopt(remote, ver); reconciled = true; tick(); return; }
      if (sig(XY.save.data) === sig(remote)) { expectVer = ver; reconciled = true; tick(); return; }
      openChoice('merge', remote, ver, row.updated_at);
      reconciled = true;
    }, function () {
      reconciled = true;
      drawDone = 'err';
      toast('云端暂时连不上，先用本机存档', true);
    });
  }
  function loadProfile(user) {
    applyProfile(user, null);
    sbSelect('profiles').then(function (res) {
      if (session && res && res.data) applyProfile(session.user, res.data);
    }, function () {});
  }
  function onSession(sess, force) {
    if (!sess || !sess.user) return;
    var id = sess.user.id || 'user';
    session = sess;
    authGate = false;
    if (!force && uid === id && reconciled) return;
    uid = id;
    choice = null;
    swapNote = null;
    drawDone = false;
    drawBusy = false;
    reconciled = false;
    expectVer = null;
    loadProfile(sess.user);
    reconcile();
  }
  function onSignedOut() {
    session = null; uid = null; profile = null; avatarImg = null; choice = null; swapNote = null;
    expectVer = null; reconciled = false; drawDone = false; drawBusy = false; authGate = false;
  }
  function samePulls(a, b) {
    return !!(a && b && a.length === b.length && a.join('\n') === b.join('\n'));
  }
  function revertRows(rows) {
    (rows || []).forEach(function (r) {
      var n = r.add || 0;
      if (!n || !r.id) return;
      XY.save.addSpCard(r.id, -n);
      var cur = XY.save.spCards(r.id);
      if (cur < 0) XY.save.addSpCard(r.id, -cur);
    });
  }
  function backLines(rows) {
    var bag = {}, order = [], i, r;
    for (i = 0; i < (rows || []).length; i++) {
      r = rows[i];
      if (!r || !r.add || !r.id) continue;
      if (bag[r.id] == null) { bag[r.id] = 0; order.push(r.id); }
      bag[r.id] += r.add;
    }
    return order.map(function (id) {
      var d = XY.SP_BY && XY.SP_BY[id];
      return (d && d.name ? d.name : id) + '  −' + bag[id] + ' 张';
    });
  }
  function applyDraw(body) {
    var pulls = (body && body.results) || [];
    if (pulls.length !== 10) throw new Error('draw');
    lastDraw = { already_drawn: !!body.already_drawn, results: pulls.slice() };
    var prev = XY.save.data && XY.save.data.gacha10;
    var same = prev && samePulls(prev.pulls, pulls);
    var backed = [];
    if (prev && prev.granted && prev.rows && !same) {
      backed = backLines(prev.rows);
      revertRows(prev.rows);
    }
    if (!same && prev && prev.pulls && prev.pulls.length === 10) swapNote = { back: backed, ack: false };
    else if (same) swapNote = null;
    if (same && prev.granted) {
      prev.server = true;
      if (!prev.acked) prev._flip = true;
      return;
    }
    var bag = {};
    (XY.SPECIALS || []).forEach(function (s) { bag[s.id] = XY.save.spCards(s.id); });
    var rec = { seed: 'srv', pulls: pulls.slice(), rows: XY.gacha10.plan(pulls, bag), granted: false, acked: false, at: Date.now(), server: true };
    if (!(swapNote && !swapNote.ack)) rec._flip = true;
    XY.save.data.gacha10 = rec;
    XY.gacha10.grant(rec);
    if (XY.bgArt) pulls.forEach(function (id) { try { XY.bgArt(id); } catch (e) {} });
  }
  function startDraw() {
    if (XY.save && XY.save.holdCloud) return;
    if (drawBusy || drawDone === true || drawDone === 'err' || !session || choice) return;
    drawBusy = true;
    sbDraw().then(function (res) {
      drawBusy = false;
      if (!session) return;
      var body = res && res.data;
      if (!res || res.error || !body || !body.results || body.results.length !== 10) {
        drawDone = 'err';
        toast('云端十连没连上。这次不会改在本机重抽。', true);
        return;
      }
      try { applyDraw(body); drawDone = true; }
      catch (e) { drawDone = 'err'; toast('云端十连没能记进存档', true); }
    }, function () {
      drawBusy = false;
      drawDone = 'err';
      toast('云端十连没连上。这次不会改在本机重抽。', true);
    });
  }

  function hasToken() {
    try {
      var i, k;
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i) || '';
        if (k.indexOf('sb-') === 0 && k.indexOf('auth-token') > 0 && localStorage.getItem(k)) return true;
      }
    } catch (e) {}
    return false;
  }
  function loadLib() {
    if (window.XY_supabaseCreate) return Promise.resolve(window.XY_supabaseCreate);
    if (window.supabase && window.supabase.createClient) return Promise.resolve(function (url, key, opt) { return window.supabase.createClient(url, key, opt); });
    if (libP) return libP;
    libP = new Promise(function (ok, bad) {
      var done = false;
      function finish(err) { if (done) return; done = true; if (err) { libP = null; bad(err); } else ok(window.XY_supabaseCreate); }
      var s = document.createElement('script');
      s.type = 'module';
      s.textContent = "import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'; window.XY_supabaseCreate = createClient; window.dispatchEvent(new Event('xy-supabase-ready'));";
      window.addEventListener('xy-supabase-ready', function () { finish(window.XY_supabaseCreate ? null : new Error('empty')); }, { once: true });
      s.onerror = function () { finish(new Error('load')); };
      document.head.appendChild(s);
      setTimeout(function () { finish(window.XY_supabaseCreate ? null : new Error('timeout')); }, 8000);
    });
    return libP;
  }
  function clientOf(create) {
    if (real) return real;
    var keys = [PUB, ANON], i, last;
    for (i = 0; i < keys.length; i++) {
      try { real = create(URL, keys[i], { auth: { persistSession: true, detectSessionInUrl: true } }); return real; }
      catch (e) { last = e; real = null; }
    }
    throw last || new Error('client');
  }
  function boot() {
    if (stub.on || !hasToken()) return;
    authGate = true;
    loadLib().then(function (create) {
      var sb = clientOf(create);
      sb.auth.getSession().then(function (r) {
        var sess = r && r.data && r.data.session;
        if (sess) onSession(sess);
        else authGate = false;
      }, function () { authGate = false; });
      sb.auth.onAuthStateChange(function (ev, sess) {
        if (sess) onSession(sess);
        else if (ev === 'SIGNED_OUT') onSignedOut();
      });
    }, function () { authGate = false; });
    setTimeout(function () { if (authGate && !session) authGate = false; }, 4000);
  }

  var oldFlush = XY.save.flush;
  XY.save.flush = function () { oldFlush(); try { schedule(); } catch (e) {} };
  var oldCommit = XY.save.commitRun;
  XY.save.commitRun = function (G, result) {
    var rep = oldCommit(G, result);
    try { pushSoon(); } catch (e) {}
    return rep;
  };
  var oldEnsure = XY.gacha10.ensure;
  XY.gacha10.ensure = function () {
    if (choice || (authGate && !session)) return NONE;
    if (session && !reconciled) return NONE;
    if (session && drawDone !== true && drawDone !== 'err') { if (drawWanted()) startDraw(); return NONE; }
    if (swapNote && !swapNote.ack) return NONE;
    if (session && drawDone === 'err') {
      var rec0 = XY.save.data && XY.save.data.gacha10;
      if (!(rec0 && rec0.pulls && rec0.pulls.length === 10)) return NONE;
    }
    var pack = oldEnsure();
    if (pack && pack.rec && pack.rec._flip) { pack.fresh = true; pack.rec._flip = false; }
    return pack;
  };
  var oldBlock = XY.gacha10.blocking;
  XY.gacha10.blocking = function () {
    if (choice || (swapNote && !swapNote.ack)) return true;
    if (authGate && !session) return true;
    if (session && !reconciled) return true;
    if (session && drawDone !== true && drawDone !== 'err' && drawWanted()) return true;
    return oldBlock();
  };

  function gateOpen() { return authGate && !session; }
  function shortName() {
    var n = (profile && profile.name) || '已登录';
    return n.length > 8 ? n.slice(0, 8) + '…' : n;
  }
  function drawAvatar(c, x, y, s) {
    var VU = XY.villainUI;
    c.save();
    c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    c.fillStyle = '#f6efdc'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#8a7a58'; c.stroke();
    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth) {
      c.save(); c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2 - 1.2, 0, Math.PI * 2); c.clip();
      c.drawImage(avatarImg, x, y, s, s); c.restore();
    } else if (VU) VU.txt(c, shortName().charAt(0), x + s / 2, y + s / 2 + 1, 14, '#3a3226', 'center', true);
    c.restore();
  }
  function paintBar(c, st, x, y, w, h) {
    var VU = XY.villainUI;
    if (!VU || w < 132) return;
    h = Math.max(44, h || 44);
    if (!session) {
      c.save();
      c.translate(x + w / 2, y + h / 2);
      c.fillStyle = '#f6efe2';
      c.beginPath();
      c.moveTo(-w / 2 + 4, -h * 0.34);
      c.quadraticCurveTo(0, -h * 0.5, w / 2 - 3, -h * 0.32);
      c.lineTo(w / 2 - 6, h * 0.34);
      c.quadraticCurveTo(0, h * 0.48, -w / 2 + 3, h * 0.32);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(90,64,36,0.45)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#24180f';
      var sz = w < 170 ? 15 : 18;
      c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      while (sz > 12 && c.measureText('登录云端').width > w - 16) { sz -= 1; c.font = sz + 'px "Ma Shan Zheng","KaiTi",serif'; }
      c.fillText('登录云端', 0, 1);
      c.restore();
      st.hit(x, y, w, h, 'cloudLogin');
      return;
    }
    if (VU.washE) VU.washE(c, x + w * 0.42, y + h / 2, w * 0.55, h * 0.42, '58,42,28', 0.22);
    drawAvatar(c, x + 6, y + (h - 30) / 2, 30);
    kai(c, shortName(), x + 42, y + h / 2 + 1, 16, '#2b1c08', 'left', w - 42 - 62);
    st.btn(x + w - 58, y, 56, h, '退出', 'cloudLogout', { seal: true, pri: true, col: '#b8322a', sz: 15, stack: false, rot: -0.05 });
  }
  function paintHub(c, st) {
    if (!session) return;
    var w = st.cw >= 720 ? 240 : Math.min(210, st.cw - 108);
    if (w < 140) return;
    paintBar(c, st, st.cw - 10 - w, 6, w, 44);
  }
  function paintModal(c, st) {
    if (!XY.villainUI) return;
    if (choice) paintChoice(c, st);
    else if (swapNote && !swapNote.ack) paintSwap(c, st);
  }
  function paintChoice(c, st) {
    var VU = XY.villainUI, cw = st.cw, ch = st.ch, narrow = cw < 700;
    var numSz = narrow ? 26 : 40, phraseH = numSz + (narrow ? 8 : 16);
    var slipHead = narrow ? 58 : 84, slipFoot = narrow ? 22 : 32;
    var cardH = slipHead + phraseH * 3 + slipFoot;
    var stack = narrow || cw < 860;
    var bw = narrow ? cw - 14 : Math.min(840, Math.max(560, Math.round(cw * 0.46)));
    if (!narrow && bw > cw - 48) bw = cw - 48;
    var pad = narrow ? 14 : 22;
    var gap = stack ? 12 : 36;
    var colW = stack ? bw - pad * 2 : Math.floor((bw - pad * 2 - gap) / 2);
    if (colW < 150) { stack = true; colW = bw - pad * 2; }
    var explainH = (narrow ? 22 : 26) * 3;
    var headH = pad + (narrow ? 30 : 38) + 10 + 20 + 8 + explainH + 6;
    var cardsBlock = stack ? cardH * 2 + 16 : cardH;
    var btnH = 56, btnGap = narrow ? 12 : 20;
    var bh = headH + cardsBlock + 18 + btnH + pad;
    var topKeep = narrow ? 88 : 24, botKeep = narrow ? 188 : 10, avail = ch - topKeep - botKeep, guard = 0;
    while (bh > avail && numSz > 20 && guard++ < 8) {
      numSz -= 2;
      phraseH = numSz + 6;
      cardH = slipHead + phraseH * 3 + slipFoot;
      cardsBlock = stack ? cardH * 2 + 16 : cardH;
      bh = headH + cardsBlock + 18 + btnH + pad;
    }
    var x = narrow ? Math.round((cw - bw) / 2) : Math.round(Math.max(18, Math.min(cw * 0.04, cw * 0.52 - bw)));
    var y = narrow ? topKeep : Math.round(Math.max(24, (ch - bh) / 2));
    if (y + bh > ch - botKeep) y = Math.max(8, ch - botKeep - bh);
    var conflict = choice.kind === 'conflict';
    st.hit(0, 0, cw, ch, 'cloudNoop');
    c.save(); c.fillStyle = 'rgba(48,36,24,0.38)'; c.fillRect(0, 0, cw, ch); c.restore();
    if (VU.washE) VU.washE(c, x + bw * 0.2, y + 36, bw * 0.35, 40, '90,60,30', 0.12);
    VU.drawTag(c, x, y, bw, bh, '', '#3a3226', { fill: '#fcf6e8', seed: 17, cutK: 0.12 });
    st.hit(x, y, bw, bh, 'cloudNoop');
    var cursor = y + pad + (narrow ? 16 : 20);
    kai(c, conflict ? '云端存档更新了' : '两份存档都有进度', x + pad, cursor, narrow ? 26 : 34, '#2b1c08', 'left', bw - pad * 2);
    if (VU.brush) VU.brush(c, x + pad, cursor + (narrow ? 16 : 20), narrow ? 120 : 168, 5, 0.4, 9);
    cursor += (narrow ? 34 : 42);
    var who = ((profile && profile.name) || '') + (profile && profile.email ? '  ·  ' + profile.email : '');
    if (who) { kai(c, who, x + pad, cursor, narrow ? 14 : 16, '#5c4a38', 'left', bw - pad * 2); cursor += narrow ? 22 : 26; }
    var explain = conflict
      ? '保存时对不上云端的版本。云端这份还在，没有被盖掉。再选一次。'
      : '两边都有取经进度。选一张留下来，另一张不会被悄悄盖掉。';
    if (VU.wrap) cursor += VU.wrap(c, explain, x + pad, cursor, bw - pad * 2, narrow ? 22 : 26, narrow ? 15 : 17, '#3a3226', false, 3) + 8;
    function slipCard(px, py, title, sealCh, data, ver, rot, seed) {
      var f = saveFacts(data);
      c.save();
      c.translate(px + colW / 2, py + cardH / 2); c.rotate(rot); c.translate(-(px + colW / 2), -(py + cardH / 2));
      if (VU.washE) VU.washE(c, px + colW * 0.78, py + 34, colW * 0.42, 26, '58,42,28', 0.2);
      VU.drawTag(c, px, py, colW, cardH, '', '#4a3828', { fill: '#fffaf0', seed: seed, cutK: 0.22 });
      VU.drawSeal(c, px + 10, py + 10, narrow ? 32 : 36, narrow ? 32 : 36, sealCh, { style: 'solid', col: '#b8322a', sz: narrow ? 16 : 18, rot: -0.06, stack: false, seed: seed });
      kai(c, title, px + (narrow ? 48 : 54), py + (narrow ? 26 : 28), narrow ? 20 : 26, '#2b1c08', 'left', colW - (narrow ? 62 : 70));
      if (VU.brush) VU.brush(c, px + (narrow ? 48 : 54), py + (narrow ? 42 : 46), Math.min(colW * 0.42, 130), 3.5, 0.45, seed);
      var cy = px + colW / 2, yy = py + slipHead + phraseH * 0.35;
      phrase(c, '通关', f.wins, cy, yy, numSz, colW - 28);
      phrase(c, '灵石', f.lingshi, cy, yy + phraseH, numSz, colW - 28);
      phrase(c, '角色卡', f.cards, cy, yy + phraseH * 2, numSz, colW - 28);
      kai(c, '开局 ' + f.runs + ' 次　' + f.time + (ver ? '　版本 ' + ver : ''), px + colW / 2, py + slipHead + phraseH * 3 + slipFoot * 0.45, narrow ? 12 : 14, '#7a654e', 'center', colW - 20);
      c.restore();
    }
    slipCard(x + pad, cursor, '这台设备', '本', XY.save.data, '', stack ? -0.01 : -0.018, 21);
    slipCard(stack ? x + pad : x + pad + colW + gap, stack ? cursor + cardH + 16 : cursor + 6, '云端', '云', choice.remoteData, choice.version != null ? String(choice.version) : '', stack ? 0.008 : 0.014, 33);
    var btnW = Math.floor((bw - pad * 2 - btnGap) / 2), by = y + bh - pad - btnH;
    redGo(c, st, x + pad, by, btnW, btnH, '留这台设备', 'cloudPick', { which: 'local' });
    redGo(c, st, x + pad + btnW + btnGap, by, btnW, btnH, '用云端这份', 'cloudPick', { which: 'cloud' });
  }
  function paintSwap(c, st) {
    var VU = XY.villainUI, cw = st.cw, ch = st.ch, narrow = cw < 700;
    var lines = (swapNote && swapNote.back) || [];
    var lineH = narrow ? 28 : 34, titleSz = narrow ? 26 : 34;
    var bw = narrow ? cw - 16 : Math.min(680, Math.round(cw * 0.4));
    var listH = Math.max(lineH, Math.min(lines.length, 8) * lineH);
    var bh = Math.min(ch - 16, (narrow ? 20 : 28) + titleSz + 36 + 78 + listH + 20 + 56 + 24);
    var topKeep = narrow ? 92 : 20, botKeep = narrow ? 210 : 12;
    if (bh > ch - topKeep - botKeep) bh = ch - topKeep - botKeep;
    var x = narrow ? Math.round((cw - bw) / 2) : Math.round(Math.max(18, Math.min(cw * 0.06, cw * 0.46 - bw)));
    var y = narrow ? topKeep : Math.round(Math.max(20, (ch - bh) / 2));
    if (y + bh > ch - botKeep) y = Math.max(8, ch - botKeep - bh);
    var pad = narrow ? 16 : 26;
    st.hit(0, 0, cw, ch, 'cloudNoop');
    c.save(); c.fillStyle = 'rgba(48,36,24,0.42)'; c.fillRect(0, 0, cw, ch); c.restore();
    VU.drawTag(c, x, y, bw, bh, '', '#3a3226', { fill: '#fcf6e8', seed: 29, cutK: 0.14 });
    st.hit(x, y, bw, bh, 'cloudNoop');
    var cursor = y + pad + titleSz * 0.45;
    kai(c, '角色卡已按账号改回', x + pad, cursor, titleSz, '#2b1c08', 'left', bw - pad * 2);
    if (VU.brush) VU.brush(c, x + pad, cursor + titleSz * 0.45, narrow ? 140 : 180, 5, 0.42, 12);
    cursor += titleSz * 0.7 + 16;
    var explain = lines.length
      ? '这台设备先抽的十连，和账号不是同一组。以账号那次为准，多发的角色卡已经退回。'
      : '这台设备上的十连和账号不是同一组。改用账号的结果，本机没有多发角色卡。';
    if (VU.wrap) cursor += VU.wrap(c, explain, x + pad, cursor, bw - pad * 2, narrow ? 22 : 26, narrow ? 15 : 17, '#3a3226', false, 3) + 10;
    var i, room = Math.max(1, Math.floor((y + bh - pad - 56 - 12 - cursor) / lineH));
    var show = lines.slice(0, room);
    for (i = 0; i < show.length; i++) {
      if (VU.washE && i % 2 === 0) VU.washE(c, x + pad + 70, cursor, 90, 10, '58,42,28', 0.12);
      kai(c, show[i], x + pad + (i % 2) * 18, cursor, narrow ? 16 : 20, '#8d3b2c', 'left', bw - pad * 2 - 24);
      cursor += lineH;
    }
    if (lines.length > show.length) kai(c, '还有 ' + (lines.length - show.length) + ' 项', x + pad, cursor, 14, '#7a654e', 'left', bw - pad * 2);
    var btnW = Math.min(narrow ? bw - pad * 2 : 280, bw - pad * 2), btnH = 56;
    redGo(c, st, x + (bw - btnW) / 2, y + bh - pad - btnH, btnW, btnH, '知道了', 'cloudSwapOk', null);
  }

  var CL = XY.account = {
    signedIn: function () { return !!session; },
    name: function () { return (profile && profile.name) || ''; },
    email: function () { return (profile && profile.email) || ''; },
    holdGacha: function () { return !!choice || !!(swapNote && !swapNote.ack); },
    ackSwap: function () {
      if (swapNote) swapNote.ack = true;
      var rec = XY.save.data && XY.save.data.gacha10;
      if (rec && !rec.acked) rec._flip = true;
    },
    barWidth: function (cw) {
      if (cw >= 1000) return 240;
      if (cw >= 720) return 210;
      var room = cw - 10 - 58 - 6 - (cw < 520 ? 168 : 200);
      if (room < 132) return 0;
      return Math.min(176, room);
    },
    paintBar: paintBar,
    paintHub: paintHub,
    paintModal: paintModal,
    signIn: function () {
      if (session) return;
      if (stub.on) {
        var u = (stub.spec && stub.spec.user) || { name: '取经人', email: '' };
        onSession({ user: { id: 'stub-user', email: u.email || '', user_metadata: { full_name: u.name || '取经人', avatar_url: u.avatar || '' } } }, true);
        return;
      }
      toast('正在打开 Google…');
      loadLib().then(function (create) {
        var sb = clientOf(create);
        return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
      }).then(function (res) {
        if (res && res.error) toast('Google 登录没打开，先用本机存档', true);
      }, function () { toast('登录组件没加载好，先用本机存档', true); });
    },
    signOut: function () {
      if (!session && !stub.on) return;
      if (!stub.on && real && real.auth) { try { real.auth.signOut(); } catch (e) {} }
      onSignedOut();
      toast('已退出，继续用本机存档');
    },
    choose: function (which) {
      if (!choice) return Promise.resolve(CL.debug.state());
      var picked = choice;
      choice = null;
      if (which === 'cloud') {
        adopt(picked.remoteData, picked.version);
        reconciled = true;
        drawDone = false;
        drawBusy = false;
        tick();
        return whenIdle();
      }
      return push(picked.version, { force: true }).then(function (ok) {
        if (!choice && ok) {
          reconciled = true;
          drawDone = false;
          drawBusy = false;
          tick();
        }
        return whenIdle();
      });
    },

    debug: {
      prepare: function (spec) { prepare(spec); onSignedOut(); stub.on = true; },
      install: function (spec) {
        prepare(spec);
        var u = (spec && spec.user) || { name: '取经人', email: 'traveler@example.com' };
        onSession({ user: { id: 'stub-user', email: u.email || '', user_metadata: { full_name: u.name || '取经人', avatar_url: u.avatar || '' } } }, true);
        return whenIdle();
      },
      signOut: function () { CL.signOut(); },
      pullAgain: function () { drawDone = false; drawBusy = false; startDraw(); return whenIdle(); },
      setRemote: function (remote) {
        stub.remote = {
          version: remote.version || 0,
          data: remote.data ? JSON.parse(JSON.stringify(remote.data)) : null,
          updated_at: new Date().toISOString(),
          game_version: '0.8.8'
        };
      },
      wait: function () { return whenIdle(); },
      state: function () {
        return {
          signedIn: !!session, name: CL.name(), email: CL.email(), choice: choice && choice.kind, version: expectVer,
          notice: (swapNote && !swapNote.ack) ? (swapNote.back || []).slice() : null,
          reconciled: reconciled, draw: drawDone, calls: calls.slice(), lastDraw: lastDraw,
          remoteVersion: stub.remote && stub.remote.version,
          remoteRuns: stub.remote && stub.remote.data && stub.remote.data.stats && stub.remote.data.stats.runs,
          remoteLingshi: stub.remote && stub.remote.data && stub.remote.data.lingshi
        };
      },
      calls: function () { return calls.slice(); }
    }
  };
  function prepare(spec) {
    stub.on = true;
    stub.spec = spec || {};
    stub.remote = spec && spec.remote ? {
      version: spec.remote.version || 0,
      data: spec.remote.data,
      updated_at: spec.remote.updated_at || new Date().toISOString(),
      game_version: '0.8.8'
    } : null;
    stub.drew = false;
    stub.results = spec && spec.draw && spec.draw.results ? spec.draw.results.slice() : null;
    calls.length = 0;
    lastDraw = null;
  }
  function idle() {
    if (gateOpen()) return false;
    if (!session) return true;
    if (!reconciled || inflight || drawBusy) return false;
    if (choice) return true;
    return drawDone === true || drawDone === 'err';
  }
  function whenIdle() {
    return new Promise(function (ok) {
      var t0 = Date.now();
      (function spin() {
        if (idle() || Date.now() - t0 > 5000) ok(CL.debug.state());
        else setTimeout(spin, 20);
      })();
    });
  }
  if (XY.hubUI && XY.hubUI.act) {
    var oldAct = XY.hubUI.act;
    XY.hubUI.act = function (h, p, a) {
      if (!h) return oldAct(h, p, a);
      if (h.act === 'cloudLogin') { CL.signIn(); return true; }
      if (h.act === 'cloudLogout') { CL.signOut(); return true; }
      if (h.act === 'cloudPick') { CL.choose(h.which); return true; }
      if (h.act === 'cloudSwapOk') { CL.ackSwap(); return true; }
      if (h.act === 'cloudPrivacy') { try { window.open('privacy.html', '_blank'); } catch (e) {} return true; }
      if (h.act === 'cloudNoop') return true;
      return oldAct(h, p, a);
    };
  }
  try { boot(); } catch (e) {}
})();
