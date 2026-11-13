/* ============================================================
 * xchar.js —— v0.8.1：「自建角色」核心（数据 / 存储 / 头像获取 / 技能与数值的种子化 / 接入游戏）
 *
 *  玩家输入一个 X 账号 → 取头像（不用任何 API key）→ 生成一位“特殊人物”：
 *   · 头像 = 这个账号的头像（战场形象 = 水墨 Q 版小人，头部是头像圆章，配色取自头像主色；见 xchar_art.js）
 *   · 技能 = 从现有九位特殊人物里种子随机抽一套（同一个账号永远抽到同一套；可「换一套技能」，换的次序也是确定的）
 *   · 数值 = 账号名种子微调，血量 × 速度 ≤ 原型，物防 + 法防 = 原型（不比现有特殊人物强）
 *  存储：只写玩家自己设备上的 localStorage（头像存成 data URL，之后离线也能用）；不上传任何地方，别人看不到。
 *
 *  接入方式（改动面最小）：自建角色 def.id 仍是“技能原型”的 id（所以所有按 id 写的技能 / 大招 / 协同逻辑照常工作），
 *  def.xid = 'x_<账号小写>' 才是它自己的身份（存档携带 / 头像 / 精灵 / 定妆图都认 xid）。
 *  XY.SP_BY[xid] 里登记了完整定义，XY.SPECIALS 不含它（商店 / 掉落 / 图鉴 / 召唤池之外的地方都不会误出现）。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, XC = XY.xchar = { MAX: 3, LV: 2, KEY: 'xiyou_xchars_v1', list: [], memoryOnly: false, mem: null, drawnAvatar: 0 };

  /* ---------- 账号名解析：@name / name / x.com/name / twitter.com/name（带 http(s)://、www.、?query、/status/… 都行）---------- */
  XC.parseHandle = function (raw) {
    var s = String(raw == null ? '' : raw).replace(/[\u200b-\u200f\u2060\ufeff]/g, '').trim();
    if (!s) return { ok: false, reason: '先填 X 账号（例：@PhyrexNi）' };
    var m = /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/(.*)$/i.exec(s);
    if (m) {
      var seg = m[1].split(/[\/?#]/)[0];
      if (/^(i|home|intent|share|search|explore|hashtag|settings|login|signup|messages|notifications)$/i.test(seg)) return { ok: false, reason: '这个链接不是账号主页，请填 x.com/账号名' };
      s = seg;
    } else if (/^[a-z]+:\/\//i.test(s) || /[\/\\]/.test(s)) return { ok: false, reason: '只认 x.com / twitter.com 的账号链接，或直接填账号名' };
    s = s.replace(/^@/, '');
    if (!s) return { ok: false, reason: '先填 X 账号（例：@PhyrexNi）' };
    if (s.length > 15) return { ok: false, reason: 'X 账号名最长 15 个字符（现在 ' + s.length + ' 个）' };
    if (!/^[A-Za-z0-9_]+$/.test(s)) return { ok: false, reason: '账号名只能有英文字母、数字和下划线' };
    return { ok: true, handle: s, key: s.toLowerCase(), id: 'x_' + s.toLowerCase() };
  };
  XC.isX = function (id) { return typeof id === 'string' && id.indexOf('x_') === 0 && !!XY.SP_BY[id] && !!XY.SP_BY[id].xid; };

  /* ---------- 种子随机（字符串哈希 + mulberry32）---------- */
  XC.hash = function (str) {
    var h = 1779033703 ^ str.length, i;
    for (i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^ (h >>> 16)) >>> 0;
  };
  XC.rng = function (str) {
    var a = XC.hash(str);
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  // 第 n 套技能：n = 0 是这个账号的“原始”一套；之后每次「换一套」是确定的下一套，且不和上一套相同（9 位里排除当前，再按种子挑）
  XC.kitAt = function (handleKey, n) {
    var ids = XY.SPECIALS.map(function (d) { return d.id; }), cur = null, k, pool;
    for (k = 0; k <= n; k++) {
      pool = cur ? ids.filter(function (i) { return i !== cur; }) : ids;
      cur = pool[Math.floor(XC.rng('kit:' + handleKey + ':' + k)() * pool.length)];
    }
    return cur;
  };
  // 数值微调（只由账号名决定，换技能不变）：血量 × 速度 ≤ 1，物防 + 法防 不变
  XC.statsOf = function (handleKey) {
    var r = XC.rng('stat:' + handleKey), hp = 0.94 + r() * 0.12, sp = 0.95 + r() * 0.10, pd = (r() - 0.5) * 0.06;
    if (hp * sp > 1) hp = 1 / sp;
    return { hpMul: hp, spdMul: sp, pdefShift: pd };
  };

  /* ---------- 存储（localStorage；不让写就只存内存）---------- */
  function readRaw() { try { return window.localStorage.getItem(XC.KEY); } catch (e) { return XC.mem; } }
  function writeRaw(s) {
    try { window.localStorage.setItem(XC.KEY, s); XC.memoryOnly = false; return true; }
    catch (e) { XC.mem = s; XC.memoryOnly = true; return false; }
  }
  XC.persist = function () { return writeRaw(JSON.stringify({ v: 1, list: XC.list.filter(function (r) { return !r.mod; }).map(function (r) { return { id: r.id, handle: r.handle, name: r.name, avatar: r.avatar, avSrc: r.avSrc, kitN: r.kitN, created: r.created }; }) })); };
  XC.load = function () {
    var raw = readRaw(), d = null; XC.list.forEach(unregister); XC.list = [];
    try { d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
    if (d && d.list && d.list.length) d.list.slice(0, XC.MAX).forEach(function (r) {
      var p = XC.parseHandle(r && r.handle); if (!p.ok || typeof r.avatar !== 'string' || r.avatar.indexOf('data:image/') !== 0) return;
      var rec = { id: p.id, handle: p.handle, name: String(r.name || p.handle).slice(0, 12), avatar: r.avatar, avSrc: r.avSrc || 'local', kitN: Math.max(0, r.kitN | 0), created: r.created || 0 };
      XC.list.push(rec); register(rec);
    });
    return XC.list;
  };
  // v0.8.7：玩法包里的角色（已校验）→ 登记成自建角色（占 XC.MAX 的名额；不写自建角色存档，只在 xiyou_mods_v1）
  XC.addMod = function (mod) {
    var d = mod.data, p = XC.parseHandle(d.handle); if (!p.ok) return { ok: false, reason: p.reason };
    var old = XC.get(p.id); if (old && !old.mod) return { ok: false, reason: '你已经有一位自建角色 @' + p.handle + '：先删掉它，或换个账号名' };
    if (!old && XC.list.length >= XC.MAX) return { ok: false, reason: '自建角色名额满了（最多 ' + XC.MAX + ' 位）：先删除一位' };
    var rec = { id: p.id, handle: p.handle, name: d.name, avatar: XC.initialAvatar(p.handle), avSrc: 'mod', kitN: 0, kitFix: d.skillSet, created: old ? old.created : Date.now(), mod: { id: mod.id, title: mod.title, stats: d.stats, tint: d.look && d.look.tint } };
    if (old) { unregister(old); XC.list[XC.list.indexOf(old)] = rec; } else XC.list.push(rec);
    register(rec); return { ok: true, rec: rec };
  };
  XC.loadMods = function () { if (!XY.mod) return; XY.mod.store.list().forEach(function (e) { if (e.mod.kind === 'character') XC.addMod(e.mod); }); };
  XC.get = function (id) { for (var i = 0; i < XC.list.length; i++) if (XC.list[i].id === id) return XC.list[i]; return null; };

  /* ---------- 由记录生成定义（登记进 XY.SP_BY）---------- */
  XC.build = function (rec) {
    var kitId = rec.kitFix || XC.kitAt(XC.parseHandle(rec.handle).key, rec.kitN | 0), b = XY.SP_BY[kitId], d = {}, k, st = XC.statsOf(XC.parseHandle(rec.handle).key);
    for (k in b) d[k] = b[k];
    var pal = XC.palette(rec);
    d.xid = rec.id; d.custom = true; d.kit = kitId; d.kitName = b.name;
    d.name = rec.name; d.handle = '@' + rec.handle;
    d.color = pal.color; d.dark = pal.dark; d.frame = pal.frame; d.accent = pal.accent;
    d.hp = Math.round(b.hp * st.hpMul); d.speed = Math.round(b.speed * st.spdMul);
    d.pdef = Math.max(0, +(b.pdef + st.pdefShift).toFixed(3)); d.mdef = Math.max(0, +(b.mdef - st.pdefShift).toFixed(3));
    d.role = '自建 · ' + b.role; d.stats = st;
    if (rec.mod) {      // v0.8.7 玩法包角色：数值在 ±10% 内微调，血量 × 速度 ≤ 原型，物防 + 法防不变；配色取 tint；标「非官方」
      var mb = rec.mod.stats || {}, hm = 1 + (mb.hpBias | 0) / 100, sm = 1 + (mb.speedBias | 0) / 100, ps = (mb.defBias | 0) / 200;
      if (hm * sm > 1) hm = 1 / sm;
      d.hp = Math.floor(b.hp * hm); d.speed = Math.floor(b.speed * sm);
      d.pdef = Math.max(0, +(b.pdef + ps).toFixed(3)); d.mdef = Math.max(0, +(b.mdef - ps).toFixed(3));
      if (rec.mod.tint) d.color = rec.mod.tint;
      d.role = '非官方 · ' + b.role; d.mod = rec.mod.id; d.stats = { hpMul: hm, spdMul: sm, pdefShift: ps };
      d.design.note = '非官方玩法包「' + rec.mod.title + '」里的角色，技能取自「' + b.name + '」';
    }
    d.design = { main: '自建角色：技能与「' + b.name + '」同款', trait: b.design && b.design.trait, note: '头像和形象来自玩家导入的 X 账号 @' + rec.handle };
    return d;
  };
  function register(rec) { var d = XC.build(rec); XY.SP_BY[rec.id] = d; XC.makeArt(rec); return d; }
  function unregister(rec) { if (XY.chibi && XY.chibi.forget) XY.chibi.forget(rec.id); delete XY.SP_BY[rec.id]; if (XY.CHIBI) delete XY.CHIBI[rec.id]; if (XY.CHIBI_INK) delete XY.CHIBI_INK[rec.id]; delete imgs[rec.id]; delete XC.art[rec.id]; delete XC.pal[rec.id]; }

  XC.add = function (rec) {      // rec: {handle, name, avatar, avSrc, kitN}；同一个账号再建 = 覆盖那一位；返回 {ok, reason, rec}
    var p = XC.parseHandle(rec.handle); if (!p.ok) return { ok: false, reason: p.reason };
    var old = XC.get(p.id);
    if (!old && XC.list.length >= XC.MAX) return { ok: false, reason: '最多自建 ' + XC.MAX + ' 位角色，请先删除一位' };
    if (typeof rec.avatar !== 'string' || rec.avatar.indexOf('data:image/') !== 0) return { ok: false, reason: '还没有头像' };
    var n = { id: p.id, handle: p.handle, name: String(rec.name || p.handle).replace(/[<>]/g, '').trim().slice(0, 12) || p.handle, avatar: rec.avatar, avSrc: rec.avSrc || 'local', kitN: Math.max(0, rec.kitN | 0), created: old ? old.created : Date.now() };
    if (old) { unregister(old); XC.list[XC.list.indexOf(old)] = n; } else XC.list.push(n);
    register(n); var saved = XC.persist();
    return { ok: true, rec: n, saved: saved, reason: saved ? '已保存在本机' : '浏览器不让存档：只在本页有效，关掉页面就没了' };
  };
  XC.remove = function (id) {
    var r = XC.get(id); if (!r) return false;
    if (r.mod && XY.mod && XY.mod.store) XY.mod.store.remove(r.mod.id);      // 玩法包角色：连存储里的那份一起删（不然下次启动又回来）
    XC.list.splice(XC.list.indexOf(r), 1); unregister(r);
    if (XY.save && XY.save.data) { ['sp', 'spT'].forEach(function (k) { var s = XY.save.data[k]; if (s && s.chosen === id) { s.chosen = null; } }); XY.save.touch && XY.save.touch(); }
    XC.persist(); return true;
  };
  XC.clearAll = function () { XC.list.slice().forEach(function (r) { XC.remove(r.id); }); try { window.localStorage.removeItem(XC.KEY); } catch (e) {} XC.mem = null; };

  /* ---------- 头像：图片对象（给圆章 / 精灵 / 卡片用）---------- */
  var imgs = {};
  XC.img = function (id) {
    var r = XC.get(id); if (!r) return null;
    var e = imgs[id]; if (!e) { e = imgs[id] = { img: new Image(), ok: false }; e.img.onload = function () { e.ok = true; }; e.img.src = r.avatar; }
    return e.ok || (e.img.complete && e.img.naturalWidth > 0) ? e.img : null;
  };

  /* ---------- 头像获取（全程客户端，无 key）----------
   * 1) unavatar.io/x/<账号>?fallback=false  —— 返回图片 + access-control-allow-origin:*，可以画进 canvas；账号不存在时是 404（不会给占位图）
   * 2) api.microlink.io 取账号主页的 og:image（= pbs.twimg.com 的头像，twimg 对任意来源放行 CORS）
   * 都失败 → 调用方给玩家两条出路：从相册选图 / 用生成的字母头像。 */
  XC.SIZE = 128;
  XC.sources = function (handle) {
    return [
      { name: 'unavatar', url: 'https://unavatar.io/x/' + encodeURIComponent(handle) + '?fallback=false' },
      { name: 'microlink', resolve: function () {
        return getJson('https://api.microlink.io/?url=' + encodeURIComponent('https://x.com/' + handle)).then(function (j) {
          var u = j && j.data && j.data.image && j.data.image.url;
          if (!u || !/^https:\/\/pbs\.twimg\.com\/profile_images\//.test(u)) throw new Error('no-avatar');
          return u;
        });
      } }
    ];
  };
  function getJson(url) {
    return new Promise(function (res, rej) {
      var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); rej(new Error('timeout')); }, XC.TIMEOUT);
      fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(res, function (e) { clearTimeout(t); rej(e); });
    });
  }
  XC.TIMEOUT = 8000;
  function loadImg(url) {
    return new Promise(function (res, rej) {
      var im = new Image(), t = setTimeout(function () { im.onload = im.onerror = null; rej(new Error('timeout')); }, XC.TIMEOUT);
      im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer';
      im.onload = function () { clearTimeout(t); res(im); };
      im.onerror = function () { clearTimeout(t); rej(new Error('load')); };
      im.src = url;
    });
  }
  // 任意图片 → 正方形居中裁切 → 128×128 JPEG data URL（canvas 被污染 / 图太小 / 不是图 都算失败）
  XC.toAvatar = function (im) {
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (!(w >= 16 && h >= 16)) throw new Error('too-small');
    var s = Math.min(w, h), cv = document.createElement('canvas'); cv.width = cv.height = XC.SIZE; var c = cv.getContext('2d');
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, XC.SIZE, XC.SIZE);
    c.imageSmoothingQuality = 'high'; c.drawImage(im, (w - s) / 2, (h - s) / 2, s, s, 0, 0, XC.SIZE, XC.SIZE);
    return cv.toDataURL('image/jpeg', 0.86);            // 画布被跨域污染时这里会抛 SecurityError
  };
  // 返回 Promise<{ok, avatar, src, tried:[{name, ok, err}]}>；不会 reject
  XC.fetchAvatar = function (handle) {
    var srcs = XC.sources(handle), tried = [], i = 0;
    function next() {
      if (i >= srcs.length) return Promise.resolve({ ok: false, tried: tried });
      var s = srcs[i++];
      var urlP = s.resolve ? s.resolve() : Promise.resolve(s.url);
      return urlP.then(loadImg).then(function (im) { var data = XC.toAvatar(im); tried.push({ name: s.name, ok: true }); return { ok: true, avatar: data, src: s.name, tried: tried }; })
        .catch(function (e) { tried.push({ name: s.name, ok: false, err: String(e && (e.name || e.message) || e) }); return next(); });
    }
    return next();
  };
  // 从相册 / 文件选的图（File 或 Blob）→ data URL
  XC.fromFile = function (file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type || '')) return rej(new Error('not-image'));
      if (file.size > 12 * 1024 * 1024) return rej(new Error('too-big'));
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { try { var d = XC.toAvatar(im); URL.revokeObjectURL(url); res(d); } catch (e) { URL.revokeObjectURL(url); rej(e); } };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('decode')); };
      im.src = url;
    });
  };
  // 兜底：水墨风字母头像（纯程序画，颜色由账号名决定）
  XC.initialAvatar = function (handle) {
    var S = XC.SIZE, cv = document.createElement('canvas'); cv.width = cv.height = S; var c = cv.getContext('2d'), r = XC.rng('ini:' + handle.toLowerCase());
    var hue = Math.floor(r() * 360);
    var g = c.createRadialGradient(S * 0.4, S * 0.35, 6, S / 2, S / 2, S * 0.75); g.addColorStop(0, 'hsl(' + hue + ',45%,92%)'); g.addColorStop(1, 'hsl(' + hue + ',40%,76%)');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    var i, a, x, y, rr;
    for (i = 0; i < 7; i++) { a = r() * 6.28; rr = 18 + r() * 34; x = S / 2 + Math.cos(a) * 34; y = S / 2 + Math.sin(a) * 30; c.fillStyle = 'rgba(40,32,24,' + (0.05 + r() * 0.08).toFixed(3) + ')'; c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.fill(); }
    c.fillStyle = 'hsla(' + hue + ',55%,38%,0.9)'; c.font = 'bold 74px ' + (XY.C && XY.C.FONT || 'sans-serif'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(handle.charAt(0).toUpperCase(), S / 2, S / 2 + 5);
    c.strokeStyle = 'rgba(40,32,24,0.55)'; c.lineWidth = 3; c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 6.283); c.stroke();
    return cv.toDataURL('image/jpeg', 0.86);
  };

  /* ---------- 配色：取头像主色（色相桶 × 饱和度 × 明度加权，忽略近白 / 近黑 / 灰）---------- */
  function hsl2css(h, s, l) {        // 必须返回 #rrggbb：游戏里到处是 color + '55' 这种拼十六进制透明度的写法
    h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    function f(t) { t = (t + 1) % 1; var v = t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; return ('0' + Math.round(v * 255).toString(16)).slice(-2); }
    return '#' + f(h + 1 / 3) + f(h) + f(h - 1 / 3);
  }
  XC.rgba = function (hex, a) { var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); return m ? 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')' : hex; };
  function fallbackPal(key) { var h = XC.hash('hue:' + key) % 360; return { color: hsl2css(h, 45, 62), dark: hsl2css(h, 50, 32), frame: hsl2css(h, 65, 86), accent: hsl2css((h + 40) % 360, 60, 54), hue: h, grey: false, guess: true }; }
  XC.pal = {};
  // 读缓存；头像还没分析过就先给“按账号名猜的色”（分析完成后 makeArt 会回填并重画）
  XC.palette = function (rec) { var e = XC.pal[rec.id]; return e && e.src === rec.avatar ? e.p : fallbackPal(rec.id); };
  // 分析一张已解码的头像（Image / canvas）→ 配色，写缓存并返回
  XC.analyze = function (id, avatar, im) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 24; var c = cv.getContext('2d'); c.drawImage(im, 0, 0, 24, 24);
    var d = c.getImageData(0, 0, 24, 24).data, B = [], i, tot = 0, n = 0, p;
    for (i = 0; i < 12; i++) B.push({ w: 0, h: 0, s: 0 });
    for (i = 0; i < d.length; i += 4) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
      if (dl < 0.12 || l > 0.93 || l < 0.1) continue;
      var sat = dl / (1 - Math.abs(2 * l - 1)), h = mx === r ? ((g - b) / dl + 6) % 6 : (mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4); h *= 60;
      var k = Math.floor(h / 30) % 12, w = sat * (1 - Math.abs(2 * l - 1)); B[k].w += w; B[k].h += h * w; B[k].s += sat * w; tot += w; n++;
    }
    if (n > 576 * 0.04 && tot > 0) {
      var best = 0, second = -1; for (i = 1; i < 12; i++) if (B[i].w > B[best].w) best = i;
      for (i = 0; i < 12; i++) if (i !== best && B[i].w > 0 && (second < 0 || B[i].w > B[second].w)) second = i;
      var H = B[best].h / B[best].w, S = Math.min(68, Math.max(34, B[best].s / B[best].w * 100));
      var Hs = second >= 0 && B[second].w > B[best].w * 0.25 ? B[second].h / B[second].w : (H + 40) % 360;
      p = { color: hsl2css(H, S, 60), dark: hsl2css(H, Math.min(70, S + 8), 30), frame: hsl2css(H, 70, 85), accent: hsl2css(Hs, Math.min(75, S + 10), 52), hue: H, grey: false };
    } else p = { color: '#9fabb6', dark: '#3f4a55', frame: '#e1e6ea', accent: '#c8341f', hue: 210, grey: true };     // 黑白 / 灰头像：墨青灰 + 朱砂点缀
    XC.pal[id] = { src: avatar, p: p }; return p;
  };

  /* ---------- 接入游戏：存档接口 / 召唤池 / 精灵键 ---------- */
  var S = XY.save;
  ['spLevel', 'spOwned', 'spRealOwned', 'spCards'].forEach(function (fn) {
    var o = S[fn];
    S[fn] = function (id) {
      if (typeof id === 'string' && id.indexOf('x_') === 0) {
        var ok = !!XC.get(id) && !!XY.SP_BY[id];
        if (fn === 'spCards') return ok ? XY.SP_LV_AT[XC.LV - 1] : 0;
        if (fn === 'spLevel') return ok ? Math.max(XC.LV, XY.TEST_BUILD ? XY.TEST_LV : 0) : 0;
        return ok;
      }
      return o.apply(this, arguments);
    };
  });
  var oPool = XY.guest.pool;
  XY.guest.pool = function (G) {
    var p = oPool.call(this, G), carried = G && G.special && XY.SP_BY[G.special], kit = carried ? carried.id : null, cur = XY.save.carryId && XY.save.carryId();
    p = p.filter(function (id) { return id !== kit; });                  // 带的是自建角色：它的技能原型本尊不再被召来（避免场上出现两份同一套技能）
    XC.list.forEach(function (r) { var d = XY.SP_BY[r.id]; if (d && r.id !== cur && r.id !== G.special && d.id !== kit) p.push(r.id); });
    return p;
  };
  var oKey = XY.chibiKey; XY.chibiKey = function (h) { return h.def && h.def.xid ? h.def.xid : oKey(h); };
  var oBg = XY.bgArt; XY.bgArt = function (id) { return typeof id === 'string' && id.indexOf('x_') === 0 ? (XC.portraitBare ? XC.portraitBare(id) : null) : oBg(id); };
  XY.avatarOf = function (def) { return def && def.xid ? XC.img(def.xid) : (XY.avatar ? XY.avatar(def.id) : null); };

  XC.art = {};
})();
