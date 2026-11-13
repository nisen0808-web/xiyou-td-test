/* ============================================================
 * mods.js —— v0.8.7「Bot 启动」第一期：玩法包（关卡 / 自建角色）的导入、校验、存储、转成关卡
 *  规范：/workspace/botlaunch/mod-schema.md（xiyou-mod/1）。只收数据，不收代码：不用 eval / Function / innerHTML。
 *  - XY.mod.check(text|object)  → { ok, errors:[{path,code,msg}], mod, size }   校验（未知字段丢弃，只返回白名单字段）
 *  - XY.mod.fromHash(str)       → 同上（str 是 `#mod=...` 之后的内容：base64url(deflate(JSON))；自带小型 inflate，限输出大小，防压缩炸弹）
 *  - XY.mod.store               localStorage `xiyou_mods_v1`：{ v:1, mods:{ id: {mod, added} } }，只放玩法包，不碰官方存档
 *  - XY.mod.level(mod)          关卡包 → 和 XY.LEVELS[] 同形状的关卡对象（没有任何 reward 字段）
 *  导入的关卡不发任何奖励（灵石 / 卡 / 碎片 / 解锁 / 通关记录），见 main.js / specials.js 里的 G.mod 分支。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, M = XY.mod = {
    SCHEMA: 'xiyou-mod/1', API: '0.9.0', KEY: 'xiyou_mods_v1',
    MAX_JSON: 32768, MAX_HASH: 6144, MAX_MODS: 24, MAX_PACK: 8,
    MAP_X: 4000, MAP_Y: 3000        // 世界是 5120×3200；规范写 0~4000，纵向再收到 3000，免得关口 / 洞府贴到地图边外
  };

  /* ---------- 小型 inflate（zlib / raw deflate）：输出超过 max 立即中止 ---------- */
  var LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258],
    LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
    DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
    DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
    ORD = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  function huff(lens, n) {
    var count = new Uint16Array(16), sym = new Uint16Array(n), offs = new Uint16Array(16), i;
    for (i = 0; i < n; i++) count[lens[i]]++;
    for (i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i];
    for (i = 0; i < n; i++) if (lens[i]) sym[offs[lens[i]]++] = i;
    return { count: count, sym: sym };
  }
  var FIXL, FIXD;
  function inflateRaw(src, pos, max) {
    var out = new Uint8Array(max), op = 0, bb = 0, bc = 0;
    function bits(n) {
      var v = bb;
      while (bc < n) { if (pos >= src.length) throw 'eof'; v |= src[pos++] << bc; bc += 8; }
      bb = v >>> n; bc -= n; return v & ((1 << n) - 1);
    }
    function dec(h) {
      var code = 0, first = 0, index = 0, len, cnt;
      for (len = 1; len <= 15; len++) {
        code |= bits(1); cnt = h.count[len];
        if (code - cnt < first) return h.sym[index + (code - first)];
        index += cnt; first += cnt; first <<= 1; code <<= 1;
      }
      throw 'bad_code';
    }
    function codes(hl, hd) {
      for (;;) {
        var s = dec(hl);
        if (s < 256) { if (op >= max) throw 'too_big'; out[op++] = s; }
        else if (s === 256) return;
        else {
          s -= 257; if (s >= 29) throw 'bad_len';
          var len = LB[s] + bits(LE[s]), ds = dec(hd); if (ds >= 30) throw 'bad_dist';
          var dist = DB[ds] + bits(DE[ds]);
          if (dist > op) throw 'bad_dist';
          if (op + len > max) throw 'too_big';
          while (len--) { out[op] = out[op - dist]; op++; }
        }
      }
    }
    var last, type;
    do {
      last = bits(1); type = bits(2);
      if (type === 0) {
        bb = 0; bc = 0; if (pos + 4 > src.length) throw 'eof';
        var ln = src[pos] | (src[pos + 1] << 8), nl = src[pos + 2] | (src[pos + 3] << 8); pos += 4;
        if ((ln ^ 0xffff) !== nl) throw 'bad_stored'; if (pos + ln > src.length) throw 'eof'; if (op + ln > max) throw 'too_big';
        for (var q = 0; q < ln; q++) out[op++] = src[pos++];
      } else if (type === 1) {
        if (!FIXL) { var l = new Uint8Array(288), k; for (k = 0; k < 144; k++) l[k] = 8; for (; k < 256; k++) l[k] = 9; for (; k < 280; k++) l[k] = 7; for (; k < 288; k++) l[k] = 8; FIXL = huff(l, 288); var d = new Uint8Array(30); for (k = 0; k < 30; k++) d[k] = 5; FIXD = huff(d, 30); }
        codes(FIXL, FIXD);
      } else if (type === 2) {
        var nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4, lens = new Uint8Array(320), i = 0;
        if (nlen > 286 || ndist > 30) throw 'bad_table';
        for (; i < ncode; i++) lens[ORD[i]] = bits(3);
        for (; i < 19; i++) lens[ORD[i]] = 0;
        var hc = huff(lens, 19); i = 0; lens = new Uint8Array(320);
        while (i < nlen + ndist) {
          var sy = dec(hc), rep, pv = 0;
          if (sy < 16) lens[i++] = sy;
          else {
            if (sy === 16) { if (!i) throw 'bad_table'; pv = lens[i - 1]; rep = 3 + bits(2); } else if (sy === 17) rep = 3 + bits(3); else rep = 11 + bits(7);
            if (i + rep > nlen + ndist) throw 'bad_table';
            while (rep--) lens[i++] = pv;
          }
        }
        codes(huff(lens.subarray(0, nlen), nlen), huff(lens.subarray(nlen, nlen + ndist), ndist));
      } else throw 'bad_block';
    } while (!last);
    return out.subarray(0, op);
  }
  M.inflate = function (bytes, max) {      // zlib（78 xx）优先，不是 zlib 头就当 raw deflate
    var p = 0, h = bytes.length > 1 && (bytes[0] & 15) === 8 && ((bytes[0] << 8) | bytes[1]) % 31 === 0 && !(bytes[1] & 32);
    try { return inflateRaw(bytes, h ? 2 : 0, max); }
    catch (e) { if (e === 'too_big') throw e; if (h) { try { return inflateRaw(bytes, 0, max); } catch (e2) { throw e; } } throw e; }
  };
  function b64urlBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var bin = window.atob(s), out = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  function utf8(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); try { return decodeURIComponent(escape(s)); } catch (e) { throw 'bad_utf8'; } }

  /* ---------- 校验工具 ---------- */
  var BAD_TXT = /[\u0000-\u001f\u007f-\u009f<>\u200b-\u200f\u202a-\u202e\u2060\ufeff]/;
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function ctx() { return { errors: [] }; }
  function err(c, path, code, msg) { if (c.errors.length < 60) c.errors.push({ path: path, code: code, msg: msg }); }
  function str(c, path, v, min, max, required) {
    if (v === undefined || v === null) { if (required) err(c, path, 'missing', '缺少必填字段'); return null; }
    if (typeof v !== 'string') { err(c, path, 'type', '必须是字符串'); return null; }
    var n = Array.from(v).length;
    if (n < min || n > max) { err(c, path, 'length', '长度要在 ' + min + ' 到 ' + max + ' 之间（现在 ' + n + '）'); return null; }
    if (BAD_TXT.test(v)) { err(c, path, 'bad_char', '不能含控制字符、< > 或不可见排版字符'); return null; }
    return v;
  }
  function num(c, path, v, lo, hi, int, dflt) {
    if (v === undefined || v === null) { if (dflt === undefined) err(c, path, 'missing', '缺少必填字段'); return dflt; }
    if (typeof v !== 'number' || !isFinite(v)) { err(c, path, 'type', '必须是数字'); return dflt; }
    if (int && Math.floor(v) !== v) { err(c, path, 'not_int', '必须是整数'); return dflt; }
    if (v < lo || v > hi) { err(c, path, 'range', '范围 ' + lo + ' 到 ' + hi + '（现在 ' + v + '）'); return dflt; }
    return v;
  }
  function semver(v) { var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v || ''); return m ? [+m[1], +m[2], +m[3]] : null; }
  function cmpVer(a, b) { for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; }
  function ptSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, f = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - (ax + dx * f), py - (ay + dy * f));
  }
  function segX(a, b, c, d) {
    function o(p, q, r) { return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); }
    var o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
    return ((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0)) && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
  }
  function bossIds() { var r = [], k; for (k in XY.ENEMIES) if (XY.ENEMIES[k].denBoss) r.push(k); return r; }
  function themeIds() { return Object.keys(XY.TERRAIN_THEMES || {}); }
  M.bossIds = bossIds; M.themeIds = themeIds;
  var ID_RE = /^mod:[a-z0-9_-]{1,35}$/, SUB_RE = /^[a-z0-9_-]{1,16}$/;
  var MAIN_TYPES = ['kill_den', 'kill_all', 'rescue', 'item', 'time_den'], SIDE_TYPES = ['etowers', 'kills', 'kill_all', 'keep_all', 'camp_hp'];

  /* ---------- 关卡数据 ---------- */
  function checkLevel(c, d, P) {
    var out = {};
    if (!isObj(d)) { err(c, P, 'type', 'data 必须是对象'); return null; }
    var th = d.theme; if (themeIds().indexOf(th) < 0) { err(c, P + '.theme', 'enum', 'theme 必须是 ' + themeIds().join(' / ') + ' 之一'); th = null; }
    out.theme = th;
    out.walkSec = num(c, P + '.walkSec', d.walkSec, 180, 600, false, 360);
    out.rest = num(c, P + '.rest', d.rest, 0.3, 0.7, false, 0.5);
    var df = isObj(d.difficulty) ? d.difficulty : {}; if (d.difficulty !== undefined && !isObj(d.difficulty)) err(c, P + '.difficulty', 'type', '必须是对象');
    out.difficulty = {
      rate: num(c, P + '.difficulty.rate', df.rate, 0.5, 2.0, false, 1.0), mul: num(c, P + '.difficulty.mul', df.mul, 1.0, 4.0, false, 1.5),
      bossMul: num(c, P + '.difficulty.bossMul', df.bossMul, 1.5, 6.0, false, 3.0), swarmN: num(c, P + '.difficulty.swarmN', df.swarmN, 8, 40, true, 18), eliteN: num(c, P + '.difficulty.eliteN', df.eliteN, 0, 4, true, 1)
    };
    var i, j, route = [], okRoute = false;
    if (!Array.isArray(d.route)) err(c, P + '.route', d.route === undefined ? 'missing' : 'type', 'route 必须是 4 到 16 个 [x,y] 点的数组');
    else if (d.route.length < 4 || d.route.length > 16) err(c, P + '.route', 'count', 'route 要 4 到 16 个点（现在 ' + d.route.length + '）');
    else {
      okRoute = true;
      for (i = 0; i < d.route.length; i++) {
        var p = d.route[i], pp = P + '.route[' + i + ']';
        if (!Array.isArray(p) || p.length !== 2) { err(c, pp, 'type', '每个点是 [x,y]'); okRoute = false; continue; }
        var x = num(c, pp + '[0]', p[0], 0, M.MAP_X, true), y = num(c, pp + '[1]', p[1], 0, M.MAP_Y, true);
        if (x === undefined || y === undefined) { okRoute = false; continue; } route.push([x, y]);
      }
      if (okRoute) {
        var tot = 0;
        for (i = 1; i < route.length; i++) { var dd = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); tot += dd; if (dd < 120) { err(c, P + '.route[' + i + ']', 'too_close', '相邻点距离小于 120'); okRoute = false; } }
        if (tot > 12000) { err(c, P + '.route', 'too_long', '路线总长超过 12000（现在 ' + Math.round(tot) + '）'); okRoute = false; }
        for (i = 0; i < route.length - 1 && okRoute; i++) for (j = i + 2; j < route.length - 1; j++) if (segX(route[i], route[i + 1], route[j], route[j + 1])) { err(c, P + '.route', 'self_cross', '路线自交：第 ' + i + ' 段和第 ' + j + ' 段交叉'); okRoute = false; break; }
      }
    }
    var g = isObj(d.gate) ? d.gate : null; if (!g) err(c, P + '.gate', d.gate === undefined ? 'missing' : 'type', 'gate 必须是 {x,y,name}');
    var gate = null;
    if (g) {
      var gx = num(c, P + '.gate.x', g.x, 0, M.MAP_X, true), gy = num(c, P + '.gate.y', g.y, 0, M.MAP_Y, true), gn = str(c, P + '.gate.name', g.name, 1, 8, true);
      if (gx !== undefined && gy !== undefined && gn) gate = { x: gx, y: gy, name: gn };
    }
    if (gate && okRoute) { var lp = route[route.length - 1]; if (lp[0] !== gate.x || lp[1] !== gate.y) err(c, P + '.route[' + (route.length - 1) + ']', 'gate_mismatch', '路线最后一个点必须等于 gate 的坐标'); }
    out.route = okRoute ? route : null; out.gate = gate;
    // 洞府
    var dens = [], denIds = {};
    if (!Array.isArray(d.dens) || d.dens.length < 1 || d.dens.length > 4) err(c, P + '.dens', d.dens === undefined ? 'missing' : 'count', 'dens 要 1 到 4 座洞府');
    else d.dens.forEach(function (n, k) {
      var q = P + '.dens[' + k + ']'; if (!isObj(n)) { err(c, q, 'type', '必须是对象'); return; }
      var id = str(c, q + '.id', n.id, 1, 16, true), nm = str(c, q + '.name', n.name, 1, 8, true), bs = n.boss, x = num(c, q + '.x', n.x, 0, M.MAP_X, true), y = num(c, q + '.y', n.y, 0, M.MAP_Y, true);
      if (id && !SUB_RE.test(id)) { err(c, q + '.id', 'format', 'id 只能是 a-z 0-9 - _'); id = null; }
      if (id && denIds[id]) { err(c, q + '.id', 'duplicate', 'id 重复'); id = null; } if (id) denIds[id] = 1;
      if (bossIds().indexOf(bs) < 0) { err(c, q + '.boss', 'enum', 'boss 必须是 ' + bossIds().join(' / ') + ' 之一'); bs = null; }
      if (out.route && x !== undefined && y !== undefined) { var md = Infinity; for (i = 1; i < out.route.length; i++) md = Math.min(md, ptSeg(x, y, out.route[i - 1][0], out.route[i - 1][1], out.route[i][0], out.route[i][1])); if (md < 150) { err(c, q, 'near_route', '洞府离路线太近（要 ≥150，现在 ' + Math.round(md) + '）'); x = undefined; } }
      if (id && nm && bs && x !== undefined && y !== undefined) dens.push({ id: id, name: nm, boss: bs, x: x, y: y });
    });
    out.dens = dens;
    // 被困者
    var caps = [], capIds = {};
    if (d.captives !== undefined && (!Array.isArray(d.captives) || d.captives.length > 2)) err(c, P + '.captives', 'count', 'captives 最多 2 个');
    else (d.captives || []).forEach(function (n, k) {
      var q = P + '.captives[' + k + ']'; if (!isObj(n)) { err(c, q, 'type', '必须是对象'); return; }
      var id = str(c, q + '.id', n.id, 1, 16, true), nm = str(c, q + '.name', n.name, 1, 10, true), x = num(c, q + '.x', n.x, 0, M.MAP_X, true), y = num(c, q + '.y', n.y, 0, M.MAP_Y, true), hd = num(c, q + '.hold', n.hold, 3, 10, true);
      if (id && !SUB_RE.test(id)) { err(c, q + '.id', 'format', 'id 只能是 a-z 0-9 - _'); id = null; }
      if (id && capIds[id]) { err(c, q + '.id', 'duplicate', 'id 重复'); id = null; } if (id) capIds[id] = 1;
      if (id && nm && x !== undefined && y !== undefined && hd !== undefined) caps.push({ id: id, name: nm, x: x, y: y, hold: hd });
    });
    out.captives = caps;
    // 主线
    var mn = d.main, main = null;
    if (!isObj(mn)) err(c, P + '.main', mn === undefined ? 'missing' : 'type', 'main 必须是对象');
    else if (MAIN_TYPES.indexOf(mn.type) < 0) err(c, P + '.main.type', 'enum', 'main.type 必须是 ' + MAIN_TYPES.join(' / ') + ' 之一');
    else {
      main = { type: mn.type };
      if (mn.type === 'kill_den' || mn.type === 'item' || mn.type === 'time_den') {
        var dn = num(c, P + '.main.den', mn.den, 0, 3, true); if (dn !== undefined && dn >= (d.dens || []).length) { err(c, P + '.main.den', 'ref', 'den 下标不存在'); dn = undefined; } main.den = dn;
      }
      if (mn.type === 'item') { if (mn.item !== undefined && mn.item !== 'fan') err(c, P + '.main.item', 'enum', '目前只有 fan（芭蕉扇）'); main.item = 'fan'; }
      if (mn.type === 'time_den') main.sec = num(c, P + '.main.sec', mn.sec, 120, 900, true, 420);
      if (mn.type === 'rescue') { if (typeof mn.cap !== 'string' || !capIds[mn.cap]) err(c, P + '.main.cap', 'ref', 'cap 必须是 captives 里存在的 id'); else main.cap = mn.cap; }
    }
    out.main = main;
    // 支线
    var sides = [];
    if (d.sides !== undefined && (!Array.isArray(d.sides) || d.sides.length > 3)) err(c, P + '.sides', 'count', 'sides 最多 3 个');
    else (d.sides || []).forEach(function (n, k) {
      var q = P + '.sides[' + k + ']'; if (!isObj(n)) { err(c, q, 'type', '必须是对象'); return; }
      if (SIDE_TYPES.indexOf(n.type) < 0) { err(c, q + '.type', 'enum', 'type 必须是 ' + SIDE_TYPES.join(' / ') + ' 之一'); return; }
      var s = { type: n.type };
      if (n.type === 'etowers') s.n = num(c, q + '.n', n.n, 1, 8, true);
      if (n.type === 'kills') s.n = num(c, q + '.n', n.n, 50, 1000, true);
      if (n.type === 'camp_hp') s.pct = num(c, q + '.pct', n.pct, 10, 90, true);
      if ((s.n !== undefined || (n.type !== 'etowers' && n.type !== 'kills')) && (s.pct !== undefined || n.type !== 'camp_hp')) sides.push(s);
    });
    out.sides = sides;
    if (d.reward !== undefined || (isObj(d.main) && d.main.reward !== undefined)) err(c, P + '.reward', 'reward_not_allowed', '导入的关卡不允许有 reward 字段（不发任何奖励）');
    return out;
  }
  /* ---------- 自建角色数据 ---------- */
  function checkChar(c, d, P) {
    if (!isObj(d)) { err(c, P, 'type', 'data 必须是对象'); return null; }
    var out = {}, h = d.handle;
    if (typeof h !== 'string' || !/^[A-Za-z0-9_]{1,15}$/.test(h)) err(c, P + '.handle', 'format', 'handle 是 1 到 15 位字母 / 数字 / 下划线'); else out.handle = h;
    out.name = str(c, P + '.name', d.name, 1, 8, true);
    var ids = (XY.SPECIALS || []).map(function (x) { return x.id; });
    if (ids.indexOf(d.skillSet) < 0) err(c, P + '.skillSet', 'enum', 'skillSet 必须是 ' + ids.join(' / ') + ' 之一'); else out.skillSet = d.skillSet;
    var st = isObj(d.stats) ? d.stats : {}; if (d.stats !== undefined && !isObj(d.stats)) err(c, P + '.stats', 'type', '必须是对象');
    out.stats = { hpBias: num(c, P + '.stats.hpBias', st.hpBias, -10, 10, true, 0), speedBias: num(c, P + '.stats.speedBias', st.speedBias, -10, 10, true, 0), defBias: num(c, P + '.stats.defBias', st.defBias, -10, 10, true, 0) };
    var lk = isObj(d.look) ? d.look : {};
    if (lk.tint !== undefined && !/^#[0-9a-fA-F]{6}$/.test(lk.tint)) err(c, P + '.look.tint', 'format', 'tint 必须是 #rrggbb'); out.look = { tint: /^#[0-9a-fA-F]{6}$/.test(lk.tint || '') ? lk.tint.toLowerCase() : null };
    if (d.avatar !== undefined && d.avatar !== null) err(c, P + '.avatar', 'avatar_not_allowed', '玩法包不带头像（必须是 null），游戏会按 handle 现取或用字母头像');
    out.avatar = null;
    return out;
  }
  function checkOne(c, o, P, nested) {
    var res = {};
    if (!isObj(o)) { err(c, P || '$', 'type', '玩法包必须是 JSON 对象'); return null; }
    if (o.schema !== M.SCHEMA) err(c, (P ? P + '.' : '') + 'schema', o.schema === undefined ? 'missing' : 'unsupported', 'schema 必须是 ' + M.SCHEMA);
    res.schema = M.SCHEMA;
    var kind = o.kind; if (['level', 'character', 'pack'].indexOf(kind) < 0) { err(c, (P ? P + '.' : '') + 'kind', 'enum', 'kind 必须是 level / character / pack'); kind = null; } res.kind = kind;
    var id = o.id, pre = P ? P + '.' : '';
    if (typeof id !== 'string' || !ID_RE.test(id)) err(c, pre + 'id', 'format', 'id 必须以 mod: 开头，后面是 a-z 0-9 - _，总长 ≤ 40'); else res.id = id;
    res.title = str(c, pre + 'title', o.title, 1, 20, true);
    res.author = str(c, pre + 'author', o.author === undefined ? '' : o.author, 0, 20, false) || '';
    var gm = o.gameMin === undefined ? '0.9.0' : o.gameMin, sv = semver(gm);
    if (!sv) err(c, pre + 'gameMin', 'format', 'gameMin 必须是 x.y.z'); else if (cmpVer(semver(M.API), sv) < 0) err(c, pre + 'gameMin', 'game_too_old', '这个包需要游戏 ' + gm + ' 以上，请先更新游戏');
    res.gameMin = gm;
    var ca = o.createdAt === undefined ? '' : o.createdAt; if (ca !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(ca)) err(c, pre + 'createdAt', 'format', 'createdAt 必须是 YYYY-MM-DD'); res.createdAt = ca;
    if (kind === 'level') res.data = checkLevel(c, o.data, pre + 'data');
    else if (kind === 'character') res.data = checkChar(c, o.data, pre + 'data');
    else if (kind === 'pack') {
      if (nested) err(c, pre + 'kind', 'nested_pack', 'pack 里不能再套 pack');
      if (!Array.isArray(o.packs) || o.packs.length < 1 || o.packs.length > M.MAX_PACK) err(c, pre + 'packs', o.packs === undefined ? 'missing' : 'count', 'packs 要 1 到 ' + M.MAX_PACK + ' 个子包');
      else { res.packs = o.packs.map(function (s, k) { return checkOne(c, s, pre + 'packs[' + k + ']', true); }); }
    }
    return res;
  }
  /* 校验入口：text 可以是 JSON 文本，也可以是已经解析的对象 */
  M.check = function (input) {
    var c = ctx(), obj = input, size = 0;
    if (typeof input === 'string') {
      var t = input.replace(/^\ufeff/, '').trim(); size = unescape(encodeURIComponent(t)).length;
      if (size > M.MAX_JSON) return { ok: false, errors: [{ path: '$', code: 'too_big', msg: 'JSON 超过 ' + M.MAX_JSON + ' 字节（现在 ' + size + '）' }], size: size };
      if (!t) return { ok: false, errors: [{ path: '$', code: 'empty', msg: '什么也没有' }], size: 0 };
      try { obj = JSON.parse(t); } catch (e) { return { ok: false, errors: [{ path: '$', code: 'bad_json', msg: '不是合法的 JSON：' + String(e.message || e).slice(0, 80) }], size: size }; }
    } else { try { size = JSON.stringify(input).length; } catch (e) { size = 0; } }
    var mod = checkOne(c, obj, '', false);
    if (c.errors.length) return { ok: false, errors: c.errors, size: size };
    return { ok: true, errors: [], mod: mod, size: size };
  };
  M.fromHash = function (h) {
    h = String(h || '').replace(/^#?(mod=)?/, '');
    if (!h) return { ok: false, errors: [{ path: '$', code: 'empty', msg: '链接里没有内容' }] };
    if (h.length > M.MAX_HASH) return { ok: false, errors: [{ path: '$', code: 'hash_too_big', msg: '链接超过 ' + M.MAX_HASH + ' 字符（现在 ' + h.length + '）' }] };
    if (!/^[A-Za-z0-9_\-+\/=]+$/.test(h)) return { ok: false, errors: [{ path: '$', code: 'bad_base64', msg: '链接不是 base64url' }] };
    var raw, text;
    try { raw = b64urlBytes(h); } catch (e) { return { ok: false, errors: [{ path: '$', code: 'bad_base64', msg: '链接不是合法的 base64url' }] }; }
    try { text = utf8(M.inflate(raw, M.MAX_JSON + 1)); }
    catch (e) { return { ok: false, errors: [{ path: '$', code: e === 'too_big' ? 'inflate_too_big' : 'bad_deflate', msg: e === 'too_big' ? '解压后超过 ' + M.MAX_JSON + ' 字节（已中止，防压缩炸弹）' : '解压失败（要 deflate 压缩的 JSON）' }] }; }
    return M.check(text);
  };
  /* 粘贴框：JSON 文本、整条链接（…#mod=xxx）、或只有 xxx 的 base64url 都认 */
  M.fromText = function (t) {
    t = String(t == null ? '' : t).trim();
    var m = /#mod=([A-Za-z0-9_\-+\/=]+)/.exec(t); if (m) return M.fromHash(m[1]);
    if (t.charAt(0) !== '{' && t.charAt(0) !== '[' && /^[A-Za-z0-9_\-+\/=]+$/.test(t)) return M.fromHash(t);
    return M.check(t);
  };

  /* ---------- 存储：localStorage xiyou_mods_v1（只放玩法包；不让写就只存内存）---------- */
  var mem = null, S = M.store = { memoryOnly: false };
  function read() {
    var raw = null, d = null; try { raw = window.localStorage.getItem(M.KEY); } catch (e) { raw = mem; }
    try { d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
    if (!d || d.v !== 1 || !isObj(d.mods)) d = { v: 1, mods: {} };
    return d;
  }
  function write(d) { var s = JSON.stringify(d); try { window.localStorage.setItem(M.KEY, s); S.memoryOnly = false; return true; } catch (e) { mem = s; S.memoryOnly = true; return false; } }
  S.list = function () {       // 读出来再校验一遍：被手改坏的包直接忽略
    var d = read(), out = [];
    Object.keys(d.mods).forEach(function (id) { var r = M.check(d.mods[id] && d.mods[id].mod); if (r.ok && r.mod.id === id) out.push({ mod: r.mod, added: d.mods[id].added || 0 }); });
    out.sort(function (a, b) { return b.added - a.added; }); return out;
  };
  S.get = function (id) { var l = S.list(); for (var i = 0; i < l.length; i++) if (l[i].mod.id === id) return l[i].mod; return null; };
  S.put = function (mod) {      // 同 id = 覆盖；pack = 拆成子包分别存；返回 { ok, saved, n, reason }
    var subs = mod.kind === 'pack' ? mod.packs : [mod], d = read(), have = Object.keys(d.mods).length, add = 0;
    subs.forEach(function (s) { if (!d.mods[s.id]) add++; });
    if (have + add > M.MAX_MODS) return { ok: false, reason: '最多存 ' + M.MAX_MODS + ' 个玩法包，请先删除几个' };
    var chars = subs.filter(function (s) { return s.kind === 'character'; }).length, own = Object.keys(d.mods).filter(function (k) { return d.mods[k].mod && d.mods[k].mod.kind === 'character'; }).length;
    var now = Date.now(); subs.forEach(function (s) { d.mods[s.id] = { mod: s, added: now }; });
    var saved = write(d); return { ok: true, saved: saved, n: subs.length, reason: saved ? '已保存在本机' : '浏览器不让存档：只在本页有效，关掉页面就没了' };
  };
  S.remove = function (id) { var d = read(); if (!d.mods[id]) return false; delete d.mods[id]; write(d); return true; };
  S.clear = function () { try { window.localStorage.removeItem(M.KEY); } catch (e) {} mem = null; };

  /* ---------- 关卡包 → 关卡对象（和 XY.LEVELS[] 同形状；没有任何 reward）---------- */
  M.level = function (mod) {
    var d = mod.data, df = d.difficulty, E = XY.ENEMIES, dens = d.dens.map(function (x) { return { id: 'mod_' + x.id, name: x.name, boss: x.boss, x: x.x, y: x.y }; }), bn = function (i) { return E[dens[i].boss].name; };
    var m = d.main, main = { type: m.type }, text, short;
    if (m.type === 'kill_den') { main.den = m.den; text = '击退' + dens[m.den].name + '的' + bn(m.den); short = '击退' + bn(m.den); }
    else if (m.type === 'kill_all') { text = '击退全部 ' + dens.length + ' 座洞府的洞主（每位至少一次）'; short = '洞洞全败'; }
    else if (m.type === 'rescue') { var cp = d.captives.filter(function (z) { return z.id === m.cap; })[0]; main.cap = m.cap; text = '救出' + cp.name + '（在身边守 ' + cp.hold + ' 秒）'; short = '救出' + cp.name; }
    else if (m.type === 'item') { main.den = m.den; main.item = 'fan'; text = '击退' + bn(m.den) + '，拾取他败退时落下的芭蕉扇'; short = '夺取芭蕉扇'; }
    else { main.den = m.den; main.sec = m.sec; text = Math.round(m.sec / 60) + ' 分钟内击退' + dens[m.den].name + '的' + bn(m.den); short = '限时击退' + bn(m.den); }
    main.text = text; main.short = short;
    var sides = d.sides.map(function (s) {
      var o = { type: s.type };
      if (s.type === 'etowers') { o.n = s.n; o.text = '拆掉 ' + s.n + ' 座妖塔'; o.short = '拆妖塔'; }
      else if (s.type === 'kills') { o.n = s.n; o.text = '累计击杀 ' + s.n + ' 只妖怪'; o.short = '击杀 ' + s.n; }
      else if (s.type === 'kill_all') { o.text = '击退全部洞主（每位至少一次）'; o.short = '洞洞全败'; }
      else if (s.type === 'keep_all') { o.text = '保住所有徒弟（无人阵亡，通关时判定）'; o.short = '无人阵亡'; }
      else { o.pct = s.pct; o.text = '营地血量全程不低于 ' + s.pct + '%（通关时判定）'; o.short = '营地不失守'; }
      return o;
    });
    var r0 = d.route[0];
    return { id: 1, air: true, name: mod.title, sub: '非官方玩法包' + (mod.author ? ' · ' + mod.author : ''), camp: { x: r0[0], y: r0[1] }, route: d.route.map(function (p) { return [p[0], p[1]]; }), rest: d.rest, walkSec: d.walkSec, theme: d.theme,
      gate: { x: d.gate.x, y: d.gate.y, name: d.gate.name }, rate: df.rate, mul: df.mul, bossMul: df.bossMul, swarmN: df.swarmN, eliteN: df.eliteN, dens: dens,
      captives: d.captives.map(function (z) { return { id: z.id, name: z.name, x: z.x, y: z.y, hold: z.hold }; }), alt: null, main: main, sides: sides, mod: mod.id };
  };
})();
(function () {
  var XY = window.XY;
  XY.lvPre = function (G) { return G.mod ? '非官方玩法包「' : G.dungeon ? '洞府副本「' : '第 ' + G.levelId + ' 关「'; };      // 结算 / 暂停等处的“第 N 关「”前缀
})();
(function () {
  var XY = window.XY, M = XY.mod, XC = XY.xchar;
  /* 安装一个（已校验的）包：关卡只进存储；角色还要登记成自建角色（占名额，同账号名的自建角色不会被覆盖）。pack 全部成功才写入。 */
  M.install = function (mod) {
    var subs = mod.kind === 'pack' ? mod.packs : [mod], need = 0, i, s;
    if (XC) for (i = 0; i < subs.length; i++) {
      s = subs[i]; if (s.kind !== 'character') continue;
      var p = XC.parseHandle(s.data.handle), old = p.ok ? XC.get(p.id) : null;
      if (!p.ok) return { ok: false, reason: p.reason };
      if (old && !old.mod) return { ok: false, reason: '你已经有一位自建角色 @' + p.handle + '：先删掉它，或让包里换个账号名' };
      if (!old) need++;
    }
    if (XC && need > XC.MAX - XC.list.length) return { ok: false, reason: '自建角色名额不够（最多 ' + XC.MAX + ' 位）：先删除几位自建角色' };
    var r = M.store.put(mod); if (!r.ok) return r;
    var lv = 0, ch = 0;
    subs.forEach(function (x) { if (x.kind === 'character') { if (XC && XC.addMod(x).ok) ch++; } else lv++; });
    return { ok: true, saved: r.saved, n: subs.length, levels: lv, chars: ch, reason: r.reason };
  };
  if (XC && XC.loadMods) XC.loadMods();      // 启动时把已导入的角色登记回来（自建角色先占名额）
})();
(function () {
  /* 导入关卡打到的一切都不进存档：卡牌 / 天兵卡 / 角色卡 / 灵石 / 碎片 / 图鉴见闻与击杀 / 通关记录。
     集中在这里包一层存档写入口：当前局是玩法包（G.mod）时跳过；正式关卡、商店、菜单照旧。局内效果（G.runCards 等）不受影响。 */
  var XY = window.XY, S = XY.save; if (!S) return;
  function inMod() { var x = window.__xy; return !!(x && x.G && x.G.mod); }
  var fake = { addCard: function () { return { isNew: false, dup: 0, lv: 1, canUp: false }; }, addSpCard: function () { return { cards: 0, lv: 1, up: false, first: false }; }, addSolCard: function () { return { cards: 0, lv: 1, up: false, first: false }; },
    addLingshi: function () {}, addShard: function () {}, markSeen: function () { return false; }, addKill: function () {}, recordClear: function () {}, recordDungeon: function () {} };
  Object.keys(fake).forEach(function (k) { var orig = S[k]; if (typeof orig !== 'function') return; S[k] = function () { return inMod() ? fake[k].apply(this, arguments) : orig.apply(this, arguments); }; });
})();
