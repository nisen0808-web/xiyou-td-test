/* ============================================================
 * villain_lair.js —— v0.9 洞府（牛魔王系列）：数据模型 / 校验 / 序列化 / SHA-256 / 洞府码 / 推荐布局 / 验关关卡 / 塔与陷阱 / 结算
 *  XY.lair = { blank, validate, canon, hash, sha256, code, parse, recommend, cost, ... }   XY.lairLevel(doc)  XY.lairInit(G, opts)  XY.lairUpdate(G, dt)  XY.lairOnKill(G, e, o)
 *  验关 = 西游英雄（现有英雄系统 + 自动战斗，玩家不操作）闯你的洞府：塔是站桩的敌人（etower），陷阱放在路径格上；通关（唐僧到洞府 + 打败洞主）才算验过。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, VD = XY.VD, C = XY.C, L = XY.lair = {}, CELL = 180, GW = 16, GH = 9, OX = Math.round((5120 - GW * CELL) / 2), OY = Math.round((3200 - GH * CELL) / 2);
  L.CELL = CELL; L.GW = GW; L.GH = GH; L.FMT = 'xytd-lair';
  function cxy(c) { return { x: OX + c[0] * CELL + CELL / 2, y: OY + c[1] * CELL + CELL / 2 }; }
  L.cellXY = cxy;
  L.cellAt = function (x, y) { return [Math.floor((x - OX) / CELL), Math.floor((y - OY) / CELL)]; };
  function key(c) { return c[0] + ',' + c[1]; }
  function ser() { return VD.ser(); }

  /* ---------- SHA-256（纯 JS，同步，浏览器 / Node 都能跑）---------- */
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) { var o = [], i, c; s = unescape(encodeURIComponent(s)); for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); o.push(c); } return o; }
  L.sha256 = function (str) {
    var m = utf8(str), l = m.length, h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], i, j, w = new Array(64);
    m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    var bl = l * 8; for (i = 7; i >= 0; i--) m.push(i >= 4 ? 0 : (bl >>> (i * 8)) & 255);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var o = 0; o < m.length; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (i = 16; i < 64; i++) { var s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[i] + w[i]) | 0, S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  };

  /* ---------- 文档 ---------- */
  function sortC(a, b) { return a.c[0] - b.c[0] || a.c[1] - b.c[1]; }
  L.canon = function (doc) {                      // 参与哈希的内容：路径 + 岩石 + 塔（位置、阶）+ 陷阱（位置、种类）+ 规模；不含名字 / 验关记录
    var o = { fmt: L.FMT, v: 1, lv: doc.lv | 0, boss: doc.boss || 'niumo', grid: [GW, GH, CELL], path: doc.path.map(function (c) { return [c[0], c[1]]; }), rocks: doc.rocks.map(function (c) { return [c[0], c[1]]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }),
      towers: doc.towers.map(function (t) { return { c: [t.c[0], t.c[1]], t: t.t, tier: t.tier | 0, evo: t.evo | 0 }; }).sort(sortC), traps: doc.traps.map(function (t) { return { c: [t.c[0], t.c[1]], t: t.t }; }).sort(sortC) };
    return JSON.stringify(o);
  };
  L.hash = function (doc) { return 'sha256:' + L.sha256(L.canon(doc)); };
  L.blank = function (seed) {
    return { fmt: L.FMT, v: 1, id: 'd_' + ((seed || Date.now()) >>> 0).toString(16), name: '芭蕉洞', rev: 0, gameVer: XY.VERSION, grid: { w: GW, h: GH, cell: CELL }, lv: 1, boss: 'niumo', seed: (seed || 20261105) >>> 0, path: [], rocks: [], towers: [], traps: [], cost: { used: 0, cap: VD.LV[1].budget }, hash: '', verify: null };
  };
  L.clone = function (doc) { return JSON.parse(JSON.stringify(doc)); };
  L.cost = function (doc) { return VD.docCost(doc); };
  L.towerCost = function (doc) { var n = 0; doc.towers.forEach(function (t) { n += VD.useCost({ t: t.t, tier: t.tier }); }); return n; };   // 付的钱按原价（进化不另收预算外的钱）
  L.forbidden = function (doc, c) {               // 入口 / 洞府格周围 1 格（含斜角）禁建
    var p = doc.path; if (!p.length) return false; var a = p[0], b = p[p.length - 1];
    return (Math.abs(c[0] - a[0]) <= 1 && Math.abs(c[1] - a[1]) <= 1) || (Math.abs(c[0] - b[0]) <= 1 && Math.abs(c[1] - b[1]) <= 1);
  };
  function pathMap(doc) { var m = {}; doc.path.forEach(function (c, i) { m[key(c)] = i; }); return m; }
  L.validatePath = function (path) {
    var er = [], m = {}, i, j;
    if (!Array.isArray(path) || path.length < 30 || path.length > 44) er.push('路径长度要 30–44 格（现在 ' + (path ? path.length : 0) + '）');
    if (!Array.isArray(path)) return er;
    for (i = 0; i < path.length; i++) {
      var c = path[i]; if (!Array.isArray(c) || c.length !== 2 || c[0] !== (c[0] | 0) || c[1] !== (c[1] | 0) || c[0] < 0 || c[1] < 0 || c[0] >= GW || c[1] >= GH) { er.push('路径格越界'); return er; }
      if (m[key(c)] !== undefined) { er.push('路径不能重复走同一格'); return er; } m[key(c)] = i;
      if (i && Math.abs(c[0] - path[i - 1][0]) + Math.abs(c[1] - path[i - 1][1]) !== 1) { er.push('路径必须上下左右连着走'); return er; }
    }
    if (path.length && path[0][0] !== GW - 1) er.push('入口要在最右一列');
    for (i = 0; i < path.length; i++) for (j = i + 2; j < path.length; j++) if (Math.abs(path[i][0] - path[j][0]) + Math.abs(path[i][1] - path[j][1]) === 1) { er.push('两段路不能紧挨着（中间要留一格放塔）'); return er; }
    var turns = 0; for (i = 2; i < path.length; i++) if ((path[i][0] - path[i - 1][0]) !== (path[i - 1][0] - path[i - 2][0]) || (path[i][1] - path[i - 1][1]) !== (path[i - 1][1] - path[i - 2][1])) turns++;
    if (turns > 12) er.push('拐弯最多 12 次（现在 ' + turns + '）');
    return er;
  };
  L.validate = function (doc) {
    var er = [], lv = VD.LV[doc && doc.lv] || null, i, m, rk = {}, used = {};
    if (!doc || doc.fmt !== L.FMT || doc.v !== 1) return { ok: false, errors: ['不是洞府数据（格式 / 版本不对）'] };
    if (!lv) return { ok: false, errors: ['洞府规模 Lv' + doc.lv + ' 还没开放'] };
    if (!Array.isArray(doc.towers) || !Array.isArray(doc.traps) || !Array.isArray(doc.rocks)) return { ok: false, errors: ['洞府数据不完整'] };
    er = L.validatePath(doc.path); if (er.length) return { ok: false, errors: er };
    m = pathMap(doc); doc.rocks.forEach(function (c) { rk[key(c)] = 1; if (m[key(c)] !== undefined) er.push('岩石压在路上'); });
    if (doc.rocks.length < lv.rocks[0] - 2 || doc.rocks.length > lv.rocks[1]) er.push('岩石数量不对');
    if (doc.towers.length > lv.slots) er.push('塔位最多 ' + lv.slots + ' 个');
    var t3 = 0;
    doc.towers.forEach(function (t) {
      var c = t.c; if (!c || c[0] < 0 || c[1] < 0 || c[0] >= GW || c[1] >= GH) { er.push('塔位越界'); return; }
      if (!VD.TOWERS[t.t]) er.push('没有这种塔：' + t.t); if (!(t.tier >= 1 && t.tier <= 3)) er.push('塔的阶要在 1–3');
      if (m[key(c)] !== undefined) er.push('塔不能放在路上'); if (rk[key(c)]) er.push('塔不能放在岩石上'); if (L.forbidden(doc, c)) er.push('入口 / 洞府周围一格不能建塔');
      if (used[key(c)]) er.push('同一格放了两座塔'); used[key(c)] = 1; if (t.tier === 3) t3++;
    });
    if (t3 > lv.t3) er.push('三阶塔最多 ' + lv.t3 + ' 座');
    if (doc.traps.length > lv.traps) er.push('陷阱最多 ' + lv.traps + ' 个');
    var tu = {}; doc.traps.forEach(function (t) { var c = t.c; if (!VD.TRAPS[t.t]) er.push('没有这种陷阱'); else if (!c || m[key(c)] === undefined) er.push('陷阱要放在路径格上'); else if (tu[key(c)]) er.push('同一格放了两个陷阱'); tu[key(c)] = 1; });
    doc.towers.forEach(function (t) { if (!(((t.evo | 0) === (t.evo || 0)) && (t.evo || 0) >= 0 && (t.evo || 0) <= 5)) er.push('进化阶要在 0–5'); });
    if (L.evoSum(doc) > (VD.EVO_MAX_TOTAL[doc.lv] || 0)) er.push('进化总阶超过上限 ' + VD.EVO_MAX_TOTAL[doc.lv]);
    if (L.cost(doc) > lv.budget) er.push('造价超预算：' + L.cost(doc) + ' / ' + lv.budget);
    return { ok: er.length === 0, errors: er.filter(function (x, i, a) { return a.indexOf(x) === i; }) };
  };
  L.syncEvo = function (doc, evo) { evo = evo || ser().evo || {}; doc.towers.forEach(function (t) { t.evo = evo[t.t] | 0; }); return doc; };         // 塔上记下当前进化阶：参与预算占用和哈希（进化后已验关的洞府会变成「需重新验关」）
  L.evoSum = function (doc) { var seen = {}, n = 0; doc.towers.forEach(function (t) { if (!seen[t.t]) { seen[t.t] = 1; n += t.evo | 0; } }); return n; };
  L.finalize = function (doc, keep) { if (!keep) L.syncEvo(doc); doc.cost = { used: L.cost(doc), cap: VD.LV[doc.lv].budget }; doc.hash = L.hash(doc); if (doc.verify && doc.verify.hash !== doc.hash) doc.verify = null; return doc; };

  /* ---------- 洞府码：XYL1-<base64url(JSON)>-<sha256 前 8 位>；导入时重新校验 + 重算哈希，验关记录对不上哈希就丢掉 ---------- */
  function b64(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  L.code = function (doc) { var d = L.finalize(L.clone(doc)), p = b64(JSON.stringify(d)); return 'XYL1-' + p + '-' + L.sha256(p).slice(0, 8); };
  L.parse = function (code) {
    code = String(code || '').replace(/\s+/g, ''); var m = /^XYL1-([A-Za-z0-9_-]+)-([0-9a-f]{8})$/.exec(code); if (!m) return { ok: false, reason: '洞府码格式不对（应该以 XYL1- 开头）' };
    if (L.sha256(m[1]).slice(0, 8) !== m[2]) return { ok: false, reason: '洞府码校验不通过：少复制了字符或被改过' };
    var doc; try { doc = JSON.parse(unb64(m[1])); } catch (e) { return { ok: false, reason: '洞府码读不出来' }; }
    var v = L.validate(doc); if (!v.ok) return { ok: false, reason: '洞府不合格：' + v.errors[0] };
    var h = L.hash(doc); if (doc.hash && doc.hash !== h) return { ok: false, reason: '洞府内容和哈希对不上（被改过）' };
    doc.hash = h; if (doc.verify && doc.verify.hash !== h) doc.verify = null; doc.cost = { used: L.cost(doc), cap: VD.LV[doc.lv].budget };
    return { ok: true, doc: doc };
  };

  /* ---------- 推荐布局：蛇形路径 + 路边摆塔 + 陷阱；只用已解锁的塔、库存里有的陷阱 ---------- */
  var RECPATH = (function () {
    var p = [], x; for (x = 15; x >= 2; x--) p.push([x, 1]); p.push([2, 2]); for (x = 2; x <= 13; x++) p.push([x, 3]); p.push([13, 4]); for (x = 13; x >= 2; x--) p.push([x, 5]); return p;
  })();
  var SPOTS = [[12, 2], [9, 2], [6, 2], [10, 4], [7, 4], [4, 4], [12, 6], [8, 6], [5, 2], [13, 0], [9, 0], [5, 0], [11, 2], [8, 4]];
  var TRAPSPOT = [[8, 1], [6, 3], [10, 5], [11, 1], [4, 3], [7, 5]];
  L.recommend = function (opts) {
    opts = opts || {}; var s = ser(), doc = L.blank(opts.seed || 20261105), lv = VD.LV[1], rnd = VD.rng(doc.seed), i, k;
    doc.path = RECPATH.map(function (c) { return c.slice(); });
    var pm = pathMap(doc), rk = {}, cand = [];
    for (i = 0; i < GW; i++) for (k = 0; k < GH; k++) { var c = [i, k]; if (pm[key(c)] === undefined && !L.forbidden(doc, c)) cand.push(c); }
    var nr = lv.rocks[0] + Math.floor(rnd() * (lv.rocks[1] - lv.rocks[0] + 1)), spotK = {}; SPOTS.forEach(function (c) { spotK[key(c)] = 1; });
    var pool = cand.filter(function (c) { return !spotK[key(c)] && !TRAPSPOT.some(function (t) { return key(t) === key(c); }); });
    while (doc.rocks.length < nr && pool.length) { var j = Math.floor(rnd() * pool.length), c2 = pool.splice(j, 1)[0]; doc.rocks.push(c2); }
    var avail = VD.TOWER_ORDER.filter(function (t) { return opts.all || VD.unlocked(s, t); }), plan = ['tank', 'ranged', 'shield', 'ranged', 'small', 'tank', 'ranged', 'shield'].map(function (t) { return avail.indexOf(t) >= 0 ? t : avail[0]; });
    plan.forEach(function (t, n) { if (n < lv.slots) doc.towers.push({ c: SPOTS[n].slice(), t: t, tier: 1 }); });
    L.syncEvo(doc);
    var cap = lv.budget * 0.92, t3 = 0, ups = [0, 1, 2, 3, 4, 5, 6, 7];                                   // 先逐座升到二阶，再升两座三阶，都留 8% 预算余量
    for (i = 0; i < doc.towers.length; i++) { doc.towers[i].tier = 2; if (L.cost(doc) > cap) { doc.towers[i].tier = 1; break; } }
    for (i = 0; i < doc.towers.length && t3 < lv.t3; i++) if (doc.towers[i].tier === 2) { doc.towers[i].tier = 3; if (L.cost(doc) > cap) doc.towers[i].tier = 2; else t3++; }
    var st = s.traps || {}, tn = 0; VD.TRAP_ORDER.forEach(function (id) { var n = opts.all ? 9 : st[id] || 0; while (n-- > 0 && tn < lv.traps && tn < TRAPSPOT.length) { doc.traps.push({ c: TRAPSPOT[tn].slice(), t: id }); tn++; if (L.cost(doc) > cap) { doc.traps.pop(); tn--; break; } } });
    doc.name = '芭蕉洞 · 推荐'; return L.finalize(doc);
  };

  /* ---------- 验关关卡 ---------- */
  function roundRoute(c, R) {
    var out = [c[0].slice()], i, k;
    for (i = 1; i < c.length - 1; i++) {
      var a = c[i - 1], P = c[i], b = c[i + 1], l1 = Math.hypot(P[0] - a[0], P[1] - a[1]), l2 = Math.hypot(b[0] - P[0], b[1] - P[1]);
      var u1 = [(P[0] - a[0]) / l1, (P[1] - a[1]) / l1], u2 = [(b[0] - P[0]) / l2, (b[1] - P[1]) / l2];
      var cr = u1[0] * u2[1] - u1[1] * u2[0], th = Math.atan2(Math.abs(cr), u1[0] * u2[0] + u1[1] * u2[1]);
      if (th < 0.02) { out.push(P.slice()); continue; }
      var t = Math.min(R * Math.tan(th / 2), 0.48 * l1, 0.48 * l2), r = t / Math.tan(th / 2), sg = cr > 0 ? 1 : -1;
      var A = [P[0] - u1[0] * t, P[1] - u1[1] * t], nx = -u1[1] * sg, ny = u1[0] * sg, ctr = [A[0] + nx * r, A[1] + ny * r];
      var a0 = Math.atan2(A[1] - ctr[1], A[0] - ctr[0]), n = Math.max(2, Math.ceil(r * th / 30));
      for (k = 0; k <= n; k++) { var ang = a0 + sg * th * k / n; out.push([Math.round(ctr[0] + r * Math.cos(ang)), Math.round(ctr[1] + r * Math.sin(ang))]); }
    }
    out.push(c[c.length - 1].slice()); return out;
  }
  var CUR = null;
  var oldDungeonOf = XY.dungeonOf;
  XY.dungeonOf = function (id) { return id === 'lair' && CUR ? CUR : oldDungeonOf(id); };
  XY.lairLevel = function (doc) {
    var b = XY.LEVELS[0], Lv = {}, k, pts = doc.path.map(function (c) { var p = cxy(c); return [p.x, p.y]; }), end = cxy(doc.path[doc.path.length - 1]);
    for (k in b) Lv[k] = b[k];
    var route = roundRoute(pts, 80), len = (doc.path.length - 1) * CELL;
    CUR = { id: 'lair', name: doc.name || '洞府', sub: '验关', boss: 'bear', walkSec: Math.round(len / 28), hard: 1, route: route, gate: { x: end.x, y: end.y, name: '洞府深处' }, den: { x: end.x, y: end.y } };
    Lv.name = (doc.name || '洞府') + ' · 验关'; Lv.sub = '西游英雄闯洞府'; Lv.route = route; Lv.rest = 0.001; Lv.walkSec = CUR.walkSec; Lv.theme = 'cave'; Lv.gate = CUR.gate; Lv.air = true; Lv.rate = 0.0001; Lv.swarmN = 0; Lv.alt = null; Lv.captives = []; Lv.sides = [];
    Lv.dens = [{ id: 'lair', name: doc.name || '洞府', boss: 'bear', x: end.x, y: end.y }];
    Lv.main = { type: 'slay_den', den: 0, text: '闯过所有塔和陷阱，打败洞主（要打两次：第一次他会躲回洞里）', short: '打败洞主' };
    Lv.dungeon = 'lair'; Lv.lair = true; return Lv;
  };
  L.heroNames = function (G) { return G.heroes.slice(1).map(function (h) { return { id: h.id, lv: G.level }; }); };

  /* ---------- 开局：摆塔 / 摆陷阱 ---------- */
  XY.lairInit = function (G, o) {
    var doc = o.doc, s = ser(), core = XY.core, c;
    G.lair = { doc: doc, mode: o.mode || 'verify', hash: doc.hash, rep: { by: {}, heat: {}, dot: 0, stuns: 0, slows: 0, towersKilled: 0, deaths: [], tcount: doc.towers.length }, shots: [], trapCd: {}, seed: o.seed || 1, t0: Date.now(), towers: [], traps: doc.traps.map(function (t) { return { c: t.c, t: t.t, x: cxy(t.c).x, y: cxy(t.c).y, hit: 0 }; }), cap: 12, mins: 0 };
    G.noSpecial = true; G.noSpawn = true; G.sky.left = 0; G.sky.cd = 1e9; G.autoPoints = true;
    var dn = G.dens[0]; dn.swarmT = dn.eliteT = dn.towerT = dn.raidT = 1e9; dn.rate = 0;
    doc.towers.forEach(function (t) {
      var p = cxy(t.c), e = core.makeEnemy(G, 'etower', p.x, p.y, 0), st = VD.stat(t.t, t.tier, t.evo || 0);
      e.building = 0; e.hp = e.maxHp = st.hp; e.dmg = st.dmg; e.speed = 0; e.r = 30; e.shootT = 99;
      e.lt = { t: t.t, tier: t.tier, c: t.c, evo: t.evo || 0, st: st, cd: 0.8 + (t.c[0] * 7 + t.c[1] * 3) % 10 * 0.12, n: 0, asp: 1, hitT: 0, ang: 0 };
      G.lair.towers.push(e);
    });
    G.lair.towers.forEach(function (e) { var n = 0; G.lair.traps.forEach(function (tr) { if (tr.t === 'zhenqi' && Math.max(Math.abs(tr.c[0] - e.lt.c[0]), Math.abs(tr.c[1] - e.lt.c[1])) <= VD.TRAPS.zhenqi.cells) n++; }); e.lt.asp = 1 + VD.TRAPS.zhenqi.aspd * n; });
    var tl = VD.LAIR_TEAM_LV || 1; while (G.level < tl) { G.level++; XY.gainPoints(G, 1 + (G.level % C.POINT_BONUS_EVERY === 0 ? 1 : 0)); }   // 验关队伍固定从 N 级起步（自动加点）：没有野怪可刷，不然英雄永远一级
    G.xp = 0; G.ctrl = 0;                                                         // 验关全自动：没有人手动操控（唐僧在轨道上，英雄们走自动战斗）
    G.lair.hp0 = G.heroes.slice(1).length;
  };
  XY.lairOnKill = function (G, e) { if (e.lt) { G.lair.rep.towersKilled++; XY.core.ring(G, e.x, e.y, 80, '#8a5fc0', 0.5, true); } };
  function heroesAlive(G) { return G.heroes.filter(function (h, i) { return i > 0 && !h.down; }); }
  function near(G, x, y, R) { var best = null, bd = 1e9; G.heroes.forEach(function (h) { if (h.down || h.id === 'tang') return; var d = Math.hypot(h.x - x, h.y - y); if (d < R && d < bd) { bd = d; best = h; } }); return best; }   // 塔只打英雄 / 不打唐僧（唐僧一碰就输）
  function hit(G, tw, h, dmg, dt) {
    if (h.id === 'tang') dmg *= 0.6; var b = h.hp, rep = G.lair.rep; XY.hurtHeroBy(G, h, dmg, false, undefined, dt || 'phys', 'earth');
    var d = Math.max(0, b - h.hp); rep.by[tw.lt.t] = (rep.by[tw.lt.t] || 0) + d; var k = key(L.cellAt(h.x, h.y)); rep.heat[k] = (rep.heat[k] || 0) + d; tw.lt.hitT = 0.25;
  }
  function splash(G, tw, x, y, R, dmg, fx) { XY.core.ring(G, x, y, R, tw.lt.t === 'yaota' ? '#e0a415' : '#8a5fc0', 0.35, false); G.heroes.forEach(function (h) { if (h.down || h.id === 'tang') return; if (Math.hypot(h.x - x, h.y - y) <= R + 16) { hit(G, tw, h, dmg); if (fx) fx(h); } }); }
  function shoot(G, tw, tgt, o) { var p = { x: tw.x, y: tw.y - 18, tx: tgt.x, ty: tgt.y, spd: o.spd || 300, dmg: o.dmg, R: o.R || 0, tw: tw, kind: o.kind || 'arrow', fx: o.fx, ph: o.ph || 'phys', hr: (o.R ? null : tgt) }; G.lair.shots.push(p); }
  var CCs = function () { return XY.heroCC; };
  function towerAI(G, e, dt) {
    var lt = e.lt, st = lt.st, tier = lt.tier, T = VD.TOWERS[lt.t], tg, i;
    if (lt.hitT > 0) lt.hitT -= dt;
    if (lt.t === 'shield') { var al = VD.TOWERS.shield.aura[tier - 1]; G.heroes.forEach(function (h) { if (!h.down && h.id !== 'tang' && Math.hypot(h.x - e.x, h.y - e.y) <= st.rng + 20) { if (CCs().slow(G, h, al, 1.0)) G.lair.rep.slows++; } }); }
    lt.cd -= dt * lt.asp; if (lt.cd > 0) return;
    if (lt.t === 'small') {
      var alive = G.enemies.filter(function (x) { return !x.dead && x.type === 'small' && x.lsrc; }).length, n = tier >= 2 ? 3 : 2;
      if (alive + n <= G.lair.cap && G.tang.s > 0) for (i = 0; i < n; i++) { var m = XY.core.makeEnemy(G, 'small', e.x + (i - 1) * 24, e.y + 30, null); m.lsrc = true; m.hp = m.maxHp = st.dmg * 1.5; m.dmg = st.dmg * 0.35; }
      lt.cd = tier >= 2 ? 8 : 10; return;
    }
    tg = near(G, e.x, e.y, st.rng); if (!tg) { lt.cd = 0.2; return; }
    lt.cd = st.gap; lt.n++; lt.ang = Math.atan2(tg.y - e.y, tg.x - e.x);
    switch (lt.t) {
      case 'ranged': shoot(G, e, tg, { dmg: st.dmg * (tier >= 3 && Math.random() < 0.15 ? 1.5 : 1), spd: 420 }); if (tier >= 2) setTimeout0(G, 0.15, function () { var t2 = near(G, e.x, e.y, st.rng); if (t2) shoot(G, e, t2, { dmg: st.dmg * 0.8, spd: 420 }); }); break;
      case 'tank': { var big = tier >= 3 && lt.n % 3 === 0; shoot(G, e, tg, { dmg: st.dmg * (big ? 1.4 : 1), spd: 240, kind: 'rock', R: (st.splash || 90) * (big ? 1.6 : 1), fx: function (h) { if (big) CCs().stun(G, h, 0.8); else if (tier >= 2) CCs().slow(G, h, 0.25, 2.5); } }); break; }
      case 'shield': hit(G, e, tg, st.dmg); break;
      case 'elite': hit(G, e, tg, st.dmg); if (tier >= 2) { var t3 = G.heroes.filter(function (h) { return !h.down && h !== tg && Math.hypot(h.x - e.x, h.y - e.y) <= st.rng + 20; })[0]; if (t3) hit(G, e, t3, st.dmg * 0.6); } break;
      case 'bone': shoot(G, e, tg, { dmg: 0, spd: 260, kind: 'fire', fx: function (h) { CCs().dot(G, h, 'bone' + e.id, 18 * VD.TIER_DMG[tier - 1], 5, 'burn'); } }); break;
      case 'bear': splash(G, e, e.x, e.y, st.splash * (tier >= 2 ? 1.0 : 1), st.dmg, function (h) { var s = CCs().stun(G, h, VD.TOWERS.bear.stun[tier - 1]); if (s) G.lair.rep.stuns++; }); if (tier >= 3) setTimeout0(G, 0.7, function () { splash(G, e, e.x, e.y, st.splash, st.dmg * 0.7, null); }); break;
      case 'yaota': shoot(G, e, tg, { dmg: st.dmg, spd: 340, kind: 'shell', R: tier >= 2 ? 80 : 0, ph: 'magic' }); if (tier >= 3) setTimeout0(G, 0.25, function () { var t2 = near(G, e.x, e.y, st.rng); if (t2) shoot(G, e, t2, { dmg: st.dmg * 0.8, spd: 340, kind: 'shell', R: 80, ph: 'magic' }); }); break;
    }
  }
  function setTimeout0(G, t, fn) { (G.lair.later = G.lair.later || []).push({ t: t, fn: fn }); }
  XY.lairTowerAI = towerAI;

  XY.lairUpdate = function (G, dt) {
    var lr = G.lair, i, p, h;
    if (!lr || G.mode !== 'play') return;
    if (lr.later) for (i = lr.later.length - 1; i >= 0; i--) { lr.later[i].t -= dt; if (lr.later[i].t <= 0) { lr.later.splice(i, 1)[0].fn(); } }
    lr.towers.forEach(function (e) {                                       // 妖气护体：没有英雄走进射程（+70）时塔打不到、选不中，英雄只能走近了打
      if (e.dead) return; var R = Math.max(220, e.lt.st.rng) + 70, v = true;
      for (var q = 0; q < G.heroes.length; q++) { var hq = G.heroes[q]; if (!hq.down && Math.hypot(hq.x - e.x, hq.y - e.y) <= R) { v = false; break; } }
      e.veil = v;
    });
    for (i = lr.shots.length - 1; i >= 0; i--) {
      p = lr.shots[i]; if (p.hr) { if (p.hr.down) { lr.shots.splice(i, 1); continue; } p.tx = p.hr.x; p.ty = p.hr.y; } var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), sp = p.spd * dt;
      if (d <= sp + 6) {
        lr.shots.splice(i, 1);
        if (p.tw.dead) continue;
        if (p.R) { if (p.dmg > 0) splash(G, p.tw, p.tx, p.ty, p.R, p.dmg, p.fx); else G.heroes.forEach(function (hh) { if (!hh.down && Math.hypot(hh.x - p.tx, hh.y - p.ty) <= p.R + 16 && p.fx) p.fx(hh); }); }
        else { var tg = near(G, p.tx, p.ty, 40); if (tg) { if (p.dmg > 0) hit(G, p.tw, tg, p.dmg, p.ph); if (p.fx) p.fx(tg); if (p.kind === 'fire' && p.tw.lt.tier >= 2) { var o2 = G.heroes.filter(function (hh) { return !hh.down && hh !== tg && Math.hypot(hh.x - tg.x, hh.y - tg.y) < 200; })[0]; if (o2) p.fx(o2); } } }
      } else { p.x += dx / d * sp; p.y += dy / d * sp; }
    }
    // 陷阱：英雄走到路径格上触发（唐僧免疫受控；烈火轮 / 毒雾是持续伤害，不致死）
    lr.traps.forEach(function (tr) {
      if (tr.t === 'zhenqi') return; if (tr.hit > 0) tr.hit -= dt;
      var TD = VD.TRAPS[tr.t];
      G.heroes.forEach(function (hh, j) {
        if (j === 0 || hh.down || Math.hypot(hh.x - tr.x, hh.y - tr.y) > 95) return;
        if (tr.t === 'bantou') { if (CCs().slow(G, hh, TD.slow, TD.slowT)) { var sk = 's' + tr.c + '|' + hh.id; if (G.t >= (lr.trapCd[sk] || 0)) { lr.trapCd[sk] = G.t + 4; lr.rep.slows++; } tr.hit = 0.4; } }
        else if (tr.t === 'huolun') { if (CCs().dot(G, hh, 'trap' + tr.c, TD.dps, TD.t, 'burn')) tr.hit = 0.4; }
        else if (tr.t === 'duwu') { if (CCs().dot(G, hh, 'trap' + tr.c, TD.dps, TD.t, 'poison')) tr.hit = 0.4; }
        else if (tr.t === 'zhenyao') { var kk = tr.c + '|' + hh.id, cd = lr.trapCd[kk] || 0; if (G.t >= cd) { var s = CCs().stun(G, hh, TD.stun); if (s) { lr.trapCd[kk] = G.t + TD.cd; lr.rep.stuns++; tr.hit = 0.6; } } }
      });
    });
    lr.ck = (lr.ck || 0) - dt;                                             // 每 0.4 秒：有塔够得着唐僧 → 唐僧原地等、英雄主动去拆塔；没有 → 英雄回去守师父、继续走
    if (lr.ck <= 0) {
      lr.ck = 0.4; var tg0 = G.heroes[0], hold = false;
      lr.towers.forEach(function (e) { if (!e.dead && Math.hypot(e.x - tg0.x, e.y - tg0.y) <= 640) hold = true; });
      if (lr.base === undefined) lr.base = G.tang.speed;
      G.tang.speed = hold ? 0 : lr.base; lr.hold = hold; if (hold) lr.holdT = (lr.holdT || 0) + 0.4;
      G.heroes.forEach(function (hh, j) { if (j > 0 && !hh.down && hh.order !== (hold ? 'attack' : 'guard')) { hh.order = hold ? 'attack' : 'guard'; hh.tgt = null; } });
    }
    if (!heroesAlive(G).length && !G.ending && G.t > 5) G.ending = { kind: 'lose', cause: 'wipe', reason: '英雄全部倒下了', t: 1.5 };
    if (lr.hold) { var th = 0; lr.towers.forEach(function (e) { if (!e.dead) th += e.hp; }); if (lr.thp === undefined || th < lr.thp - 1) { lr.thp = th; lr.stallT = 0; } else { lr.stallT = (lr.stallT || 0) + dt; if (lr.stallT > 90 && !G.ending) G.ending = { kind: 'lose', cause: 'stall', reason: '英雄打不动塔了（90 秒没有进展）', t: 1.5 }; } }
    if (G.t > 1500 && !G.ending) G.ending = { kind: 'lose', cause: 'timeout', reason: '验关超过 25 分钟还没闯过去', t: 1.5 };
    var alive = heroesAlive(G).length; lr.mins = Math.min(lr.mins || 99, alive);
    G.heroes.forEach(function (hh, j) { if (j > 0 && hh.down && !hh._rep) { hh._rep = 1; lr.rep.deaths.push({ id: hh.id, t: Math.round(G.t), at: L.cellAt(hh.x, hh.y) }); } });
  };

  /* ---------- 结算：只发灵石（+经验沿用副本），不发妖金；通关 = 验关证明 ---------- */
  L.starsOf = function (alive) { return alive >= 5 ? 3 : alive >= 3 ? 2 : 1; };
  L.rewardOf = function (doc, win, stars, sec, ser0) {
    var s = ser0 || ser(), lair = s.lair, cost = L.towerCost(doc) + L.cost({ towers: [], traps: doc.traps }), f = function (c) { return Math.round(40 + c * 0.025); };
    if (!win) return { lingshi: Math.floor(sec / 60) * 4, first: false };
    var first = f(cost) - f(lair.paid || 0), base = Math.max(Math.round(f(cost) * 0.3), first > 0 ? first : 0), m = stars >= 3 ? 1.25 : stars === 2 ? 1.1 : 1;
    return { lingshi: Math.round(base * m), first: first > 0, cost: cost };
  };
  L.commit = function (G, result) {
    if (G.committed) return G.runReport; G.committed = true;
    var lr = G.lair, doc = lr.doc, s = ser(), lair = s.lair, win = result === 'win', alive = heroesAlive(G).length, stars = win ? L.starsOf(alive) : 0, sec = Math.round(G.t), r;
    if (G.t < 8 && !win) { G.runReport = { result: result, lair: true, skipped: true }; return G.runReport; }
    r = L.rewardOf(doc, win, stars, sec, s); lair.runs = (lair.runs || 0) + 1; var rep = lr.rep;
    var out = { result: result, lair: true, win: win, stars: stars, sec: sec, alive: alive, lingshi: r.lingshi, first: r.first, hpLeft: +(heroesAlive(G).reduce(function (a, h) { return a + h.hp / h.maxHp; }, 0) / Math.max(1, lr.hp0)).toFixed(2), rep: rep, hash: doc.hash, mode: lr.mode };
    if (win && lr.mode === 'verify' && lr.hash === doc.hash) {
      lair.verifiedHash = doc.hash; lair.clears = (lair.clears || 0) + 1; lair.bestStars = Math.max(lair.bestStars || 0, stars); lair.firstDone = true; lair.paid = Math.max(lair.paid || 0, r.cost || 0);
      var rec = { hash: doc.hash, team: L.heroNames(G), sec: sec, hpLeft: out.hpLeft, stars: stars, alive: alive, gameVer: XY.VERSION, at: Date.now(), seed: lr.seed, input: 'auto' };
      doc.verify = rec; if (lair.doc && lair.doc.hash === doc.hash) lair.doc.verify = rec; out.verify = rec;
      XY.save.data.chain.lair = XY.save.data.chain.lair || Date.now();
    }
    XY.save.data.lingshi = (XY.save.data.lingshi || 0) + r.lingshi;
    if (XY.save.touch) XY.save.touch(); XY.save.flush();
    G.runReport = out; return out;
  };

  /* ---------- 存取：存档里的洞府 ---------- */
  L.saved = function () { return ser().lair.doc || null; };
  L.verifiedOK = function () { var l = ser().lair; return !!(l.doc && l.verifiedHash && l.doc.hash === l.verifiedHash && L.hash(l.doc) === l.verifiedHash); };
  L.save = function (draft) {                     // 保存草稿：校验 → 结算妖金 / 陷阱库存 → 写存档；返回 {ok, reason}
    var s = ser(), l = s.lair, d = L.finalize(L.clone(draft)), v = L.validate(d); if (!v.ok) return { ok: false, reason: v.errors[0] };
    d.towers.forEach(function (t) { if (t.tier === 3) s.t3Seen[t.t] = true; });                      // 进化前提：这种小妖至少造到过一次三阶
    var need = L.towerCost(d), spent = l.spent || 0, diff = need - spent, tu = l.trapsUsed || {}, nu = {}, id;
    d.traps.forEach(function (t) { nu[t.t] = (nu[t.t] || 0) + 1; });
    for (id in nu) if ((s.traps[id] || 0) + (tu[id] || 0) < nu[id]) return { ok: false, reason: '陷阱「' + VD.TRAPS[id].name + '」库存不够（打反派关会掉）' };
    if (diff > 0 && s.wallet.yaojin < diff) return { ok: false, reason: '妖金不够：还差 ' + (diff - s.wallet.yaojin) };
    if (diff > 0) s.wallet.yaojin -= diff; else if (diff < 0) s.wallet.yaojin += Math.floor(-diff * 0.7);
    l.spent = need; for (id in VD.TRAPS) { var back = (tu[id] || 0) - (nu[id] || 0); if (back) s.traps[id] = (s.traps[id] || 0) + back; } l.trapsUsed = nu;
    var changed = !l.doc || l.doc.hash !== d.hash; if (changed) { d.rev = (l.doc ? l.doc.rev : 0) + 1; l.published = false; } else d.rev = l.doc.rev;
    if (l.verifiedHash && l.verifiedHash === d.hash && l.doc && l.doc.verify) d.verify = l.doc.verify; else if (!(l.verifiedHash === d.hash)) d.verify = null;
    l.doc = d; l.rev = d.rev; if (XY.save.touch) XY.save.touch(); XY.save.flush(); return { ok: true, doc: d, paid: diff, changed: changed };
  };
  L.publish = function () { var l = ser().lair; if (!L.verifiedOK()) return { ok: false, reason: '先验关通过才能发布' }; l.published = true; XY.save.flush(); return { ok: true, code: L.code(l.doc) }; };
  /* ---------- 全自动验关（无渲染，测试用）：和玩家点「验关」完全同一个关卡 / 同一套规则，只是不画画面 ---------- */
  L.simulate = function (doc, o) {
    o = o || {}; var w = window.__xy; w.startLair({ doc: doc, mode: 'verify', seed: o.seed || 1 }); var G = w.G, i, cap = (o.maxSec || 900) * 60;
    for (i = 0; i < cap; i++) { XY.step(G, 1 / 60); if (G.mode === 'win' || G.mode === 'lose') break; if (G.mode !== 'play') G.mode = 'play'; }
    var rp = XY.save.commitRun(G, G.mode === 'win' ? 'win' : 'lose'); return { G: G, win: G.mode === 'win', t: Math.round(G.t), report: rp };
  };
})();
