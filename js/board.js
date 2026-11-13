/* ============================================================
 * board.js —— v0.9 本地排行榜（数据层，不碰画面；画面在 board_ui.js）
 *
 *  五张榜（id：说明）
 *   lair     洞府守关榜：我的洞府被人（目前是本机验关 / 模拟）打的守成。守成分 = 最近 10 场的平均；守住 = 100，被闯过 = 80 − 12 × 漏过去的英雄数（最低 10）。
 *   progress 通关进度榜：西游线星数（每关 通关 1 星 + 支线 1 个 1 星，最多 3 星）；星数相同比总用时（短的靠前）。
 *   boss     Boss 战榜：指定 Boss（先 niumo）最短通关用时（短的靠前）；同时记最高伤害 %。
 *   villain  反派养成榜：小妖总战力 + 洞府评分（从 data.villain.series[niumo] 现算）。
 *   ref      引路榜：有效拉新人数（recordReferral 登记；去重、不能引自己）。
 *
 *  存档：XY.save.data.boards（meta.js 的 defaults / migrate 已补；整块以后随云存档上传）
 *    { v, profile{handle,name,avatar,updated,mode}, me{lair,progress,boss{niumo},villain,ref}, ref{list[]}, others{榜id:[条目]}, ui{samples,tab} }
 *  条目（list 的每一行）：{ rank, uid, me, sample, handle, name, avatar(data URL，一定有), bound, score, scoreText, unit, sub, tie, at }
 *
 *  接云端的口子：XY.board.provider = { name, fetch(id, opts) → 条目[]（或 Promise）, submit(id, 条目) }；
 *    本地 provider 读写 data.boards.others；以后换成云端 list API：XY.board.setProvider(p) 即可，榜页只认 XY.board.list()。
 *  1.0 前不上链、不做真跨玩家云榜。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, S = XY.save, XC = XY.xchar, VD = XY.VD, B = XY.board = {};

  B.BOARDS = [
    { id: 'lair', name: '洞府守关', tab: '洞府守关', dir: 'desc', unit: '分', rule: '别人闯你的洞府：守住得 100，被闯过扣分，漏过去的英雄越少越好', hint: '去反派模式「设计洞府」验一次关', col: '#a42d19' },
    { id: 'progress', name: '通关进度', tab: '通关进度', dir: 'desc', unit: '星', rule: '西游线星数：每关通关 1 星 + 支线 1 个 1 星（每关最多 3 星）；星数相同比总用时', hint: '通关一关就有星', col: '#2f8a62' },
    { id: 'boss', name: '头目战', sealCh: '战', tab: '头目战', dir: 'asc', unit: '秒', rule: '牛魔王头目战最短通关用时（越短越靠前）', hint: '打赢一次牛魔王头目战', col: '#a42d19' },
    { id: 'villain', name: '反派养成', tab: '反派养成', dir: 'desc', unit: '战力', rule: '小妖总战力 + 洞府评分（进化、三阶、验关、发布都会加分）', hint: '进反派模式打一关或进化小妖', col: '#6e211b' },
    { id: 'ref', name: '引路', tab: '引路', dir: 'desc', unit: '人', rule: '分享带引路码的 Bot，新人从 Bot 启动进游戏才算有效拉新', hint: '引路系统还没接通，先占位', col: '#c8341f' }
  ];
  B.BY = {}; B.BOARDS.forEach(function (b) { B.BY[b.id] = b; });
  B.SERIES = 'niumo';

  function nowMs() { return Date.now(); }
  function touch() { if (S.touch) S.touch(); }
  B.data = function () {
    var d = S.data; if (!d) return null;
    if (!d.boards || typeof d.boards !== 'object' || !d.boards.me) d.boards = S.boardsDefault();
    return d.boards;
  };
  function me() { var b = B.data(); return b.me; }
  /* 现算的榜（进度 / 反派 / 引路）：内容没变就不写、不触发存档，免得榜页每帧都在存盘 */
  function setMe(key, obj) {
    var m = me(), old = m[key], a, b;
    if (old) { a = JSON.stringify(old, function (k, v) { return k === 'updated' ? undefined : v; }); b = JSON.stringify(obj, function (k, v) { return k === 'updated' ? undefined : v; }); if (a === b) return old; }
    m[key] = obj; touch(); return obj;
  }
  function lc(h) { return String(h || '').toLowerCase(); }
  function fmtT(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ================== 身份：我是谁（handle / 名字 / 头像）================== */
  function xrec(handle) { if (!XC || !handle) return null; var l = XC.list || [], i; for (i = 0; i < l.length; i++) if (lc(l[i].handle) === lc(handle)) return l[i]; return null; }
  var iniCache = {};
  /* 头像：同 handle 的自建角色头像（data URL）> 传进来的 > 字母水墨剪影（XC.initialAvatar，按名字缓存） */
  B.avatarFor = function (handle, name, given) {
    var r = xrec(handle); if (r && r.avatar) return r.avatar;
    if (given && typeof given === 'string' && given.indexOf('data:image/') === 0) return given;
    var samp = /^sample_/.test(handle || ''), seed = samp ? name : (handle || (name || '我').charAt(0));        // 样例行用名字的第一个字（墨 / 云 / 青 / 丹），不全是 S
    var k = samp ? '#s' + name : handle ? lc(handle) : '#' + (name || '我').charAt(0);
    if (!iniCache[k]) {
      try { iniCache[k] = XC.initialAvatar(seed); } catch (e) { iniCache[k] = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; }
    }
    return iniCache[k];
  };
  /* 把 profile 和已导入的 xchar 对齐：auto = 列表第一位；xchar = 玩家点选的那位（被删了就退回 auto）；none = 不绑定 */
  B.syncProfile = function () {
    var b = B.data(), p = b.profile, l = (XC && XC.list) || [], pick = null, before = p.handle + '|' + p.name + '|' + p.avatar.length;
    if (p.mode === 'xchar') pick = xrec(p.handle) || (l[0] || null);
    else if (p.mode === 'auto') pick = l[0] || null;
    if (pick) { p.handle = pick.handle; p.name = pick.name || pick.handle; p.avatar = pick.avatar || ''; }
    else { p.handle = ''; p.avatar = ''; p.name = B.localName(); }
    if (before !== p.handle + '|' + p.name + '|' + p.avatar.length) { p.updated = nowMs(); touch(); }
    return p;
  };
  B.localName = function () { return (S.data.profile && S.data.profile.name) || '取经人'; };
  B.me = function () {
    var p = B.syncProfile(), bound = !!p.handle;
    return { handle: p.handle, name: p.name, avatar: B.avatarFor(p.handle, p.name, p.avatar), bound: bound, mode: p.mode, updated: p.updated };
  };
  /* 榜页「用哪个 X」：handle = 已导入的 xchar 账号；null = 不绑定（只用本机昵称） */
  B.pickX = function (handle) {
    var p = B.data().profile;
    if (handle == null) p.mode = 'none';
    else { var r = xrec(handle); if (!r) return { ok: false, reason: '这个 X 还没导入：先去「自建角色」导入头像' }; p.mode = 'xchar'; p.handle = r.handle; }
    B.syncProfile(); p.updated = nowMs(); touch(); if (S.flush) S.flush();
    return { ok: true, me: B.me() };
  };
  B.xOptions = function () { return ((XC && XC.list) || []).map(function (r) { return { handle: r.handle, name: r.name || r.handle, avatar: r.avatar }; }); };

  /* ================== 写入：各榜 ================== */
  // ① 洞府守关：防守方一场成绩。o = { hash, held（守住 = 英雄全灭 / 超时），alive（最后活着的英雄数，守住时为 0），mode:'verify'|'challenge'|'sim', sec, source }
  B.lairRunScore = function (held, alive) { return held ? 100 : Math.max(10, 80 - 12 * Math.max(1, alive | 0)); };
  B.recordLairRun = function (o) {
    o = o || {}; var m = me(), L = m.lair, held = !!o.held, alive = held ? 0 : Math.max(1, o.alive | 0), sc = B.lairRunScore(held, alive);
    if (!L || (o.hash && L.hash !== o.hash)) L = m.lair = { hash: o.hash || '', runs: [], held: 0, breached: 0, total: 0, score: null, sub: '', updated: 0, source: o.source || 'self' };     // 洞府改了 = 新洞府，守成从零算
    L.runs.push({ s: sc, held: held, alive: alive, mode: o.mode || 'verify', sec: o.sec | 0, at: nowMs() }); if (L.runs.length > 10) L.runs.shift();
    L.total = (L.total || 0) + 1; if (held) L.held = (L.held || 0) + 1; else L.breached = (L.breached || 0) + 1;
    var n = L.runs.length, avg = L.runs.reduce(function (a, r) { return a + r.s; }, 0) / n, leak = L.runs.reduce(function (a, r) { return a + r.alive; }, 0) / n, hn = L.runs.filter(function (r) { return r.held; }).length;
    L.score = Math.round(avg); L.leak = +leak.toFixed(1); L.source = o.source || L.source || 'self';
    L.sub = '最近 ' + n + ' 场守住 ' + hn + ' · 平均漏过 ' + L.leak + ' 位英雄' + (L.source === 'self' ? ' · 本机验关占位' : '');
    L.updated = nowMs(); touch(); return L;
  };
  // ③ Boss 战：r = { win, stars, time, partner, summon, bossHpPct }
  B.recordBoss = function (series, r) {
    series = series || B.SERIES; if (!r) return null; var m = me(); m.boss = m.boss || {};
    var e = m.boss[series] || (m.boss[series] = { runs: 0, wins: 0, bestTime: 0, stars: 0, partner: '', summon: null, bestDmg: 0, score: null, sub: '', updated: 0 });
    e.runs++; var dmg = r.win ? 100 : Math.max(0, Math.min(100, 100 - (r.bossHpPct == null ? 100 : r.bossHpPct))); if (dmg > e.bestDmg) e.bestDmg = dmg;
    if (r.win) {
      e.wins++; var t = Math.max(1, r.time | 0);
      if (!e.bestTime || t < e.bestTime || (t === e.bestTime && (r.stars | 0) > e.stars)) { e.bestTime = t; e.stars = r.stars | 0; e.partner = r.partner || ''; e.summon = r.summon || null; }
    }
    if (e.wins > 0) {
      var pn = XY.SP_BY && XY.SP_BY[e.partner] ? XY.SP_BY[e.partner].name : e.partner;
      e.score = e.bestTime; e.sub = '★' + e.stars + ' · 搭档 ' + (pn || '—') + ' · ' + (e.summon ? '用了援军' : '未用援军') + ' · 最高伤害 ' + e.bestDmg + '%';
    } else { e.score = null; e.sub = '还没打赢 · 最高伤害 ' + e.bestDmg + '%'; }
    e.updated = nowMs(); touch(); return e;
  };
  // ② 通关进度（现算，写回 me.progress）
  B.refreshProgress = function () {
    var d = S.data, tot = 0, cleared = 0, sides = 0, time = 0, id, l, sd;
    for (id = 1; id <= XY.LEVEL_COUNT; id++) {
      l = d.levels[id]; if (!l || !l.cleared) continue;
      sd = Math.min(2, S.levelSides ? S.levelSides(id) : 0); cleared++; sides += sd; tot += 1 + sd; time += l.best || 0;
    }
    var e = setMe('progress', { score: cleared ? tot : null, tie: time, cleared: cleared, sides: sides, time: time, sub: cleared ? '通关 ' + cleared + '/' + XY.LEVEL_COUNT + ' 关 · 支线 ' + sides + ' 个 · 总用时 ' + fmtT(time) : '还没通关，通关第 1 关就有星', updated: nowMs() });
    return e;
  };
  // ④ 反派养成（现算，写回 me.villain）
  B.towerPower = function (type, tier, evo) {
    var st = VD.stat(type, tier, evo), dps = st.dmg / Math.max(0.5, st.gap) * (st.splash ? 1.3 : 1);
    return Math.round(st.hp / 100 + dps * 1.2);
  };
  B.lairRating = function (lair) {
    if (!lair || !lair.doc) return 0;
    var ok = !!(lair.verifiedHash && lair.doc.hash === lair.verifiedHash);
    return 100 + (ok ? 200 : 0) + (lair.published ? 100 : 0) + (ok ? Math.min(3, lair.bestStars | 0) * 50 : 0) + Math.min(10, lair.clears | 0) * 10;
  };
  B.villainScore = function () {
    var s = VD.ser(), power = 0, evoSum = 0, n = 0;
    VD.TOWER_ORDER.forEach(function (t) {
      if (!VD.unlocked(s, t)) return; var evo = (s.evo && s.evo[t]) | 0, tier = s.t3Seen && s.t3Seen[t] ? 3 : 1; power += B.towerPower(t, tier, evo); evoSum += evo; n++;
    });
    var lr = B.lairRating(s.lair), played = (s.runs | 0) > 0 || evoSum > 0 || !!s.lair.doc || (s.stage && s.stage.clears > 0);
    return { score: power + lr, power: power, lair: lr, evo: evoSum, towers: n, played: played };
  };
  B.refreshVillain = function () {
    var v = B.villainScore(), e = setMe('villain', { score: v.played ? v.score : null, power: v.power, lair: v.lair, evo: v.evo, towers: v.towers, sub: v.played ? '小妖战力 ' + v.power + ' · 洞府评分 ' + v.lair + ' · 进化 ' + v.evo + ' 阶' : '还没进反派模式', updated: nowMs() });
    return e;
  };
  // ⑤ 引路：本地占位 API（引路系统接通后，只在「新人从 Bot 启动进游戏」那一刻调 recordReferral）
  B.recordReferral = function (info) {
    info = info || {}; var rf = B.data().ref, h = String(info.handle || '').replace(/^@/, ''), id = String(info.id || h || '').toLowerCase();
    if (!id) return { ok: false, reason: '缺少新人的 id / handle' };
    var mine = B.me(); if (h && mine.handle && lc(h) === lc(mine.handle)) return { ok: false, reason: '不能引自己' };
    if (rf.list.some(function (r) { return r.id === id; })) return { ok: false, dup: true, reason: '这位新人已经记过了', count: rf.list.length };
    rf.list.push({ id: id, handle: h, name: String(info.name || h || id).slice(0, 12), avatar: typeof info.avatar === 'string' && info.avatar.indexOf('data:image/') === 0 ? info.avatar : '', at: nowMs() });
    B.refreshRef(); touch(); if (S.flush) S.flush(); return { ok: true, count: rf.list.length };
  };
  B.referrals = function () { return B.data().ref.list.slice(); };
  B.refreshRef = function () {
    var n = B.data().ref.list.length; return setMe('ref', { score: n, count: n, sub: n ? '有效拉新 ' + n + ' 人' : '还没有拉到新人 · 引路系统占位', updated: nowMs() });
  };
  B.refreshAll = function () { B.syncProfile(); B.refreshProgress(); B.refreshVillain(); B.refreshRef(); return me(); };

  /* ================== 读取：list ================== */
  var SAMPLES = {
    lair: [['sample_moke', '墨客', 92, '最近 10 场守住 9 · 平均漏过 0.2 位英雄'], ['sample_yunshan', '云山', 81, '最近 10 场守住 7 · 平均漏过 0.6 位英雄'], ['sample_qingya', '青崖', 64, '最近 10 场守住 4 · 平均漏过 1.4 位英雄'], ['sample_danzhu', '丹朱', 47, '最近 10 场守住 2 · 平均漏过 2.2 位英雄']],
    progress: [['sample_moke', '墨客', 9, '通关 3/3 关 · 支线 6 个 · 总用时 41:20'], ['sample_yunshan', '云山', 7, '通关 3/3 关 · 支线 4 个 · 总用时 52:05'], ['sample_qingya', '青崖', 4, '通关 2/3 关 · 支线 2 个 · 总用时 30:48'], ['sample_danzhu', '丹朱', 1, '通关 1/3 关 · 支线 0 个 · 总用时 12:36']],
    boss: [['sample_moke', '墨客', 31, '★3 · 搭档 Phyrex · 未用援军 · 最高伤害 100%'], ['sample_yunshan', '云山', 38, '★3 · 搭档 老司机 · 未用援军 · 最高伤害 100%'], ['sample_qingya', '青崖', 52, '★2 · 搭档 DeFi小矿工 · 用了援军 · 最高伤害 100%'], ['sample_danzhu', '丹朱', 74, '★1 · 搭档 思思 · 用了援军 · 最高伤害 100%']],
    villain: [['sample_moke', '墨客', 2860, '小妖战力 2260 · 洞府评分 600 · 进化 21 阶'], ['sample_yunshan', '云山', 2210, '小妖战力 1810 · 洞府评分 400 · 进化 14 阶'], ['sample_qingya', '青崖', 1480, '小妖战力 1280 · 洞府评分 200 · 进化 6 阶'], ['sample_danzhu', '丹朱', 920, '小妖战力 820 · 洞府评分 100 · 进化 2 阶']],
    ref: [['sample_moke', '墨客', 12, '有效拉新 12 人'], ['sample_yunshan', '云山', 7, '有效拉新 7 人'], ['sample_qingya', '青崖', 3, '有效拉新 3 人']]
  };
  B.samplesOn = function () { return !!B.data().ui.samples; };
  B.setSamples = function (on) { B.data().ui.samples = !!on; touch(); return B.samplesOn(); };
  B.setTab = function (id) { if (B.BY[id]) { B.data().ui.tab = id; touch(); } return B.data().ui.tab; };

  function scoreText(def, sc) {
    if (sc == null) return '—';
    if (def.id === 'boss') return sc >= 60 ? fmtT(sc) : sc + ' 秒';
    if (def.id === 'villain') return String(sc);
    return sc + ' ' + def.unit;
  }
  function mk(def, o) {
    var h = o.handle || '', nm = o.name || h || '无名', sc = o.score == null ? null : o.score;
    return { uid: o.uid, me: !!o.me, sample: !!o.sample, handle: h, name: nm, avatar: B.avatarFor(h, nm, o.avatar), bound: o.bound !== undefined ? o.bound : !!h, score: sc, scoreText: scoreText(def, sc), unit: def.unit, sub: o.sub || '', tie: o.tie || 0, at: o.at || 0 };
  }
  B.myEntry = function (id, opts) {
    var def = B.BY[id], m = me(), mi = B.me(), src = null;
    if (id === 'progress') src = B.refreshProgress(); else if (id === 'villain') src = B.refreshVillain(); else if (id === 'ref') src = B.refreshRef();
    else if (id === 'lair') src = m.lair || null; else if (id === 'boss') src = (m.boss && m.boss[(opts && opts.series) || B.SERIES]) || null;
    return mk(def, { uid: 'me', me: true, handle: mi.handle, name: mi.name, avatar: mi.avatar, bound: mi.bound, score: src ? src.score : null, tie: src && src.tie, sub: src && src.sub ? src.sub : def.hint, at: src ? src.updated : 0 });
  };
  /* provider：本地版读 data.boards.others；以后换云端（返回 Promise 也行，榜页用缓存） */
  var local = {
    name: 'local',
    fetch: function (id, opts) { var a = B.data().others[id] || []; return a.filter(function (e) { return !(opts && opts.series) || !e.series || e.series === opts.series; }); },
    submit: function (id, e) {
      var b = B.data(), a = b.others[id] || (b.others[id] = []), k = String(e.uid || e.handle || '').toLowerCase(), i;
      if (!k) return { ok: false, reason: '缺少 uid / handle' };
      var rec = { uid: k, handle: e.handle || '', name: e.name || e.handle || k, avatar: typeof e.avatar === 'string' && e.avatar.indexOf('data:image/') === 0 ? e.avatar : '', score: +e.score, tie: +e.tie || 0, sub: e.sub || '', series: e.series || '', at: nowMs() };
      if (!isFinite(rec.score)) return { ok: false, reason: '分数不对' };
      for (i = 0; i < a.length; i++) if (a[i].uid === k) { a[i] = rec; touch(); return { ok: true, updated: true }; }
      a.push(rec); touch(); return { ok: true };
    }
  };
  B.provider = local;
  B.setProvider = function (p) { if (p && typeof p.fetch === 'function') B.provider = p; else B.provider = local; B._cache = {}; return B.provider.name; };
  B._cache = {};
  B.submit = function (id, e) { if (!B.BY[id]) return { ok: false, reason: '没有这张榜' }; return B.provider.submit ? B.provider.submit(id, e) : { ok: false, reason: '当前 provider 不收成绩' }; };
  B.clearOthers = function (id) { var b = B.data(); if (id) b.others[id] = []; else b.others = {}; touch(); };
  function fetchOthers(id, opts) {
    var r = B.provider.fetch(id, opts);
    if (r && typeof r.then === 'function') { var k = id + ':' + ((opts && opts.series) || ''); r.then(function (a) { B._cache[k] = a || []; }, function () { }); return B._cache[k] || []; }
    return r || [];
  }
  function better(def, a, b) {          // a 排在 b 前面？
    var an = a.score == null, bn = b.score == null; if (an !== bn) return bn;
    if (!an && a.score !== b.score) return def.dir === 'asc' ? a.score < b.score : a.score > b.score;
    if (a.tie !== b.tie) return a.tie < b.tie;
    if (a.me !== b.me) return a.me;                       // 同分：我排在样例 / 别人前面
    return String(a.handle || a.name) < String(b.handle || b.name);
  }
  /* 榜单：返回排好序的行（带 rank；没成绩的行 rank = null 排最后）。opts = { series, samples:true|false } */
  B.list = function (id, opts) {
    opts = opts || {}; var def = B.BY[id]; if (!def) return [];
    var rows = [B.myEntry(id, opts)], seen = {};
    fetchOthers(id, opts).forEach(function (e) { if (!e || e.score == null) return; var r = mk(def, { uid: e.uid, handle: e.handle, name: e.name, avatar: e.avatar, score: e.score, tie: e.tie, sub: e.sub, at: e.at }); seen[lc(e.handle)] = 1; rows.push(r); });
    if (opts.samples !== false && B.samplesOn()) (SAMPLES[id] || []).forEach(function (s) { if (seen[s[0]]) return; rows.push(mk(def, { uid: 'sample:' + s[0], sample: true, handle: s[0], name: s[1], score: s[2], sub: s[3] })); });
    rows.sort(function (a, b) { return better(def, a, b) ? -1 : better(def, b, a) ? 1 : 0; });
    var rk = 0; rows.forEach(function (r) { r.rank = r.score == null ? null : ++rk; });
    return rows;
  };
  B.myRank = function (id, opts) { var r = B.list(id, opts || { samples: false }).filter(function (x) { return x.me; })[0]; return r ? r.rank : null; };

  /* ================== 挂钩：commitRun 之后记成绩（洞府验关 / 反派关 / 西游通关）================== */
  var oldCommit = S.commitRun;
  S.commitRun = function (G, result) {
    var rep = oldCommit.apply(this, arguments);
    try {
      if (G && !G._boardDone && rep && !G.mod) {
        G._boardDone = true;
        if (G.lair && rep.lair && !rep.skipped) {
          var held = !rep.win; B.recordLairRun({ hash: rep.hash, held: held, alive: rep.alive, mode: rep.mode || 'verify', sec: rep.sec, source: 'self' });
          B.refreshVillain();
        } else if (G.villain) B.refreshVillain();
        else if (result === 'win') B.refreshProgress();
        if (S.touch) S.touch();
      }
    } catch (e) { if (window.console) console.warn('board.commit', e); }
    return rep;
  };
  /* 反派养成相关操作之后刷新（进化 / 解锁小妖 / 保存洞府 / 发布洞府）：包一层，不改它们原来的返回值 */
  function wrapAfter(obj, name) {
    var f = obj && obj[name]; if (typeof f !== 'function' || f._boardWrapped) return;
    obj[name] = function () { var r = f.apply(this, arguments); try { B.refreshVillain(); } catch (e) { } return r; }; obj[name]._boardWrapped = true;
  }
  B.hookVillain = function () { wrapAfter(XY.villainUI, 'evolve'); wrapAfter(XY.villainUI, 'unlockTower'); wrapAfter(XY.lair, 'save'); wrapAfter(XY.lair, 'publish'); };
  B.hookVillain();
  B.onBoss = function (series, r) { try { var e = B.recordBoss(series, r); if (S.flush) S.flush(); return e; } catch (err) { if (window.console) console.warn('board.onBoss', err); return null; } };
  try { if (S.data) { B.data(); B.syncProfile(); } } catch (e) { }
})();
