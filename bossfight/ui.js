/* 西游X · Boss 对战原型 · 渲染/界面（v3）。读 BF（sim.js）的状态画图；玩家只选搭档，战斗中唯一操作 = 召唤一次随机援军。
   画面参照街霸 6：横版侧视、斜切粗血条、居中大倒计时、血条下分段能量格、左右下角必杀槽 + 数字、书法大字打击提示、地面尘土。
   v3：每人 13~14 个原生朝向姿势（站/攻×3 连招/飞身/闪避/蓄力冲刺/格挡/受击/倒飞/必杀/倒地/胜利），牛魔王 12 个（冲撞/锤击地震/连砸/狂暴旋风…），
   精灵 assets/spr/<id>/<pose>.webp（站姿高 480px，同一角色共用一个缩放，tools/cut3.py 抠图+墨边+纸纹）。
   头像用 assets/xav/<id>.webp（九位特殊人物的 X 头像 + 悟空/牛魔王头图）。资源全部按需：只有 XY.bossfight.open() 之后才请求。
   对外接口：XY.bossfight.open(ctx) / close() / state()，见 integrate.md。 */
(function () {
  'use strict';
  var BF = window.BF, Q = new URLSearchParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d'), pcv = $('pcv'), pctx = pcv.getContext('2d');
  var KAI = '"Ma Shan Zheng","STKaiti","KaiTi","Noto Serif CJK SC",serif';
  var ELC = { metal: '#d8a93a', wood: '#3fae66', fire: '#e0452e', water: '#3f8fd0', earth: '#b0803c' };
  var ELN = { metal: '金', wood: '木', fire: '火', water: '水', earth: '土' };
  var NAMES = { wukong: '孙悟空', niumo: '牛魔王' };
  BF.ORDER.forEach(function (k) { NAMES[k] = BF.SP[k].name; });
  var ULTN = {}; BF.ORDER.forEach(function (k) { ULTN[k] = BF.SP[k].ult.name; });
  var FIGS = ['wukong', 'niumo'].concat(BF.ORDER), SIL = {}, BG = {}, MINK = null, MINK_META = null, SPR = {}, SMETA = {}, AV = {}, ready = null, CTX = {};
  // 展示尺寸微调（相对统一身高）：小个子各自校正
  var SZ = { wukong: 1, niumo: 1.14, phyrex: 1, sisi: 1, laosiji: 1, kuanggong: .86, haiteng: 1.02, yuanzhang: .94, heyuxi: 1, diaoyulao: .92, martin: .98 };
  var OWN = BF.ORDER.filter(function (k) { return k !== 'diaoyulao' && k !== 'martin'; });
  var EFXN = { heal: '回血', sh: '护盾', wall: '减伤', vuln: '破防', as: '加速', dmgUp: '增伤', regen: '回春', undead: '亡魂', delay: '打断狂暴' };

  /* ---------- 资源（按需：第一次 open 才请求；总量见 integrate.md） ---------- */
  function loadImg(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(i); }; i.src = src; }); }
  // v3.1 分批载入：首屏 = 悟空 + 牛魔王 + 头像 + 背景 + 小怪；搭档在“出战”时载；援军在点召唤时载（转盘期间加载，没载完画墨晕占位）
  var CHP = {}, PP = {}, BGP = {};
  function loadPose(id, p) { var k = id + '/' + p; if (PP[k]) return PP[k]; return (PP[k] = loadImg('assets/spr/' + id + '/' + p + '.webp').then(function (i) { if (i.naturalWidth) (SPR[id] = SPR[id] || {})[p] = i; })); }
  function loadChar(id) {
    if (CHP[id]) return CHP[id]; if (!SMETA[id]) return Promise.resolve();
    var ps = Object.keys(SMETA[id]).filter(function (p) { return !SMETA[id][p].m; }), first = ps.filter(function (p) { return p === 'stance' || p === 'ult' || /^ret/.test(p); }), rest = ps.filter(function (p) { return first.indexOf(p) < 0; });
    return (CHP[id] = Promise.all(first.map(function (p) { return loadPose(id, p); })).then(function () { return Promise.all(rest.map(function (p) { return loadPose(id, p); })); }));
  }
  var MIDP = {};
  function loadMids(id) { if (MIDP[id] || !SMETA[id]) return MIDP[id]; var ps = Object.keys(SMETA[id]).filter(function (p) { return SMETA[id][p].m; }); return (MIDP[id] = Promise.all(ps.map(function (p) { return loadPose(id, p); }))); }
  function loadBG(k) { if (BGP[k]) return BGP[k]; return (BGP[k] = loadImg('assets/bg-' + k + '.webp').then(function (i) { if (i.naturalWidth) BG[k] = i; })); }
  function loadInk(k, url) { return loadImg(url).then(function (i) { if (i.naturalWidth) BG[k] = i; }); }
  function ensureLoaded() {
    if (ready) return ready;
    var portrait = (Q.get('w') ? +Q.get('w') < +Q.get('h') : innerWidth < innerHeight);
    ready = Promise.resolve(window.BF_SPR_META).then(function (m) {
      SMETA = m; if (window.BFUI) window.BFUI.SMETA = m; var jobs = [loadChar('wukong'), loadChar('niumo'), loadInk('far', '../assets/art/menu-v5/bg_v4.webp'), loadInk('wash', '../assets/art/menu-v5/bg_v2.webp')];
      if (portrait) jobs.push(loadBG('port'));
      FIGS.forEach(function (k) { jobs.push(loadColorAv(k)); });
      jobs.push(loadImg('assets/mink-elite.webp').then(function (i) { MINK = i; }),
        Promise.resolve().then(function () { MINK_META = window.BF_MINK_META; }),
        (document.fonts && document.fonts.load ? document.fonts.load('40px "Ma Shan Zheng"', '胜败破招暴击0123456789') : Promise.resolve()));
      if (window.XY && XY.wildAnim && (XY.wildAnim.armBoss || XY.wildAnim.arm)) {
        XY.wildAnim.base = '../assets/wild/';
        jobs.push((XY.wildAnim.armBoss ? XY.wildAnim.armBoss() : XY.wildAnim.arm()).catch(function () { return null; }));
      }
      jobs.push(preloadWu());
      return Promise.all(jobs);
    });
    if (window.BFUI) window.BFUI.ready = ready; return ready;
  }
  // 精灵还没到：画一团淡墨晕占位（不报错）
  function inkBlob(c, cx, gyy, fh, a) {
    var r = fh * .32, cy = gyy - fh * .38, t = (performance.now() / 1000) % 10; c.save(); c.globalAlpha = (a == null ? 1 : a) * (.32 + .08 * Math.sin(t * 4));
    var g = c.createRadialGradient(cx, cy, r * .1, cx, cy, r); g.addColorStop(0, 'rgba(47,42,31,.75)'); g.addColorStop(.6, 'rgba(47,42,31,.28)'); g.addColorStop(1, 'rgba(47,42,31,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, r * .62, r, 0, 0, 7); c.fill(); c.restore();
  }
  function sil(id, pose) {
    var key = id + '/' + pose; if (SIL[key]) return SIL[key]; var im = spr(id, pose), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    var x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return (SIL[key] = c);
  }

  /* ---------- 状态 ---------- */
  var G = { mode: 'pick', W: 844, H: 390, land: true, S: 1, dpr: 1, partner: 'heyuxi', F: null, fx: [], calls: [], shake: 0, stop: 0, slow: 0, speed: 1, introT: 0, endT: 0, lane: { wukong: 0, partner: 1 }, t: 0, sumId: null, shown: false, pause: false, auto: Q.get('auto') !== '0', flash: 0, flashC: '#fff', wuUlt: 0, bossBig: 0 };
  var rnd = Math.random;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }

  function layout() {
    var W = innerWidth, H = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 4);
    if (Q.get('w')) { W = +Q.get('w'); H = +Q.get('h'); }
    G.W = W; G.H = H; G.land = W > H; G.dpr = dpr; G.S = G.land ? H / 390 : W / 390;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (ready && !G.land) loadBG('port');
    G.gy = G.land ? H * 0.845 : H * 0.82; G.fh = G.land ? H * 0.58 : H * 0.4;
    var p = $('pick').getBoundingClientRect(); pcv.width = Math.max(2, Math.round(p.width * dpr * 0.5)); pcv.height = Math.max(2, Math.round(p.height * dpr));
    var st = pcv.parentNode.getBoundingClientRect(); pcv.width = Math.round(st.width * dpr); pcv.height = Math.round(st.height * dpr);
    var bsb = $('sumbtn'); bsb.style.display = 'none';
  }
  /* ---------- 镜头 + 视觉位置：人物按 sim 坐标 (h.x / b.x) 在场上走；视觉位置向目标平滑追赶，镜头再慢一拍跟着 ---------- */
  var VP = {}, ARENA = 1000;
  function ACC() { return (G._inStep || G.mode !== 'fight' || !G.auto || G.pause || G.stop > 0 || G.introT > 0) ? 0 : Math.min(1 / 30, G._acc || 0) * (G.slow > 0 ? .35 : 1); }   // 渲染帧在两个 sim 步之间按速度外推，高刷屏也顺
  function vo(key, x) { return VP[key] || (VP[key] = { x: x, v: 0, vs: 0, vl: 0, ph: 0, fs: 1, fT: 1 }); }
  function viewBox() {
    var F = G.F, b = F.boss, bo = vo('boss', b.x), lo = bo.x, hi = bo.x;
    F.heroes.forEach(function (h) { if (!h.alive) return; var x = vo('h' + h.id, h.x).x; lo = Math.min(lo, x); hi = Math.max(hi, x); });
    var land = G.land, W = G.W, kB = W * (land ? .0011 : .00085), span = Math.max(hi - lo, 1);
    return { c: (lo + hi) / 2, k: clamp(Math.min(kB, W * (land ? .66 : .6) / span), W * .0006, kB) };
  }
  function vcalc() {
    if (G.V && G.V.F === G.F) return G.V;
    var t = viewBox(); return (G.V = { F: G.F, cw: t.c, cv: 0, k: t.k, bx: G.W * .5 });
  }
  function camW() { var V = vcalc(); return V.cw + V.cv * ACC(); }
  function sx(x) { var V = vcalc(); return V.bx + (x - camW()) * V.k; }
  function vstep(key, tx, dt, rate, face) {
    var o = vo(key, tx), ox = o.x; o.x += (tx - o.x) * (1 - Math.exp(-rate * dt)); o.v = (o.x - ox) / dt; o.vs += (o.v - o.vs) * Math.min(1, dt * 14); o.vl += (o.vs - o.vl) * Math.min(1, dt * 5.5);   // vl：慢半拍的速度，上半身按它滞后
    o.fT = face; o.fs += clamp(face - o.fs, -dt * 8.5, dt * 8.5);                      // 转身：约 0.24s，按“转体”曲线（侧身那一刻停得久一点），不瞬切
    var V = G.V, spx = Math.abs(o.v) * (V ? V.k : 1) * dt, ph0 = o.ph; o.ph += spx / (G.fh * .2);
    return Math.floor(o.ph) !== Math.floor(ph0) && Math.abs(o.v) * (V ? V.k : 1) > 70 * G.S;   // 迈出一步
  }
  function updateView(dt) {
    var F = G.F, b = F.boss, S = G.S, stepB, stepH = [];
    vcalc();
    stepB = vstep('boss', b.x, dt, b.st === 'charge' ? 26 : (Math.abs(b.kb || 0) > 60 ? 18 : 11), -Math.sign(b.face || -1));
    F.heroes.forEach(function (h) { stepH.push(vstep('h' + h.id, h.x, dt, (h.st === 'dash' || Math.abs(h.kb || 0) > 60) ? 17 : 13, h.face || 1)); });
    var t = viewBox(), V = G.V, ox = V.cw; V.cw += (t.c - V.cw) * (1 - Math.exp(-3.4 * dt)); V.cv = (V.cw - ox) / dt; V.k += (t.k - V.k) * (1 - Math.exp(-3 * dt));
    placeAll(); var P = G.pos, gy = G.gy;
    if (stepB && !F.over) { dust(P.boss, gy, 3, 34 * S); stain(P.boss, gy, 70 * S, .16); wkick('boss', 'land', .55); G.shake = Math.max(G.shake, 1.3 * S); }
    F.heroes.forEach(function (h, i) { if (stepH[i] && h.alive && h.st !== 'jump') { dust(P.h[h.id], gy + hvLane(h).dy, 2, 18 * S); wkick('h:' + h.id, 'land', .28); } });
  }
  function softclamp(s) { var W = G.W, lo = W * .09, hi = W * .91, m = W * .05; return s < lo ? lo - m * (1 - Math.exp(-(lo - s) / m)) : (s > hi ? hi + m * (1 - Math.exp(-(s - hi) / m)) : s); }
  function cellOpaque(id, clipName, frame) {
    clipName = clipName || 'bossIdle';
    frame = frame || 0;
    var Wld = window.XY && XY.wildAnim;
    if (!Wld || !Wld.ready || !Wld.ready(id, clipName)) return null;
    var clip = Wld.clip(id, clipName);
    if (!clip) return null;
    var key = frame;
    clip._oboxF = clip._oboxF || {};
    if (clip._oboxF[key]) return clip._oboxF[key];
    var im = Wld.img(id, clipName);
    if (!im || !im.naturalWidth) return null;
    var cw = clip.cell[0], ch = clip.cell[1], cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var g = cv.getContext('2d', { willReadFrequently: true });
    var col = frame % clip.cols, row = (frame / clip.cols) | 0;
    g.drawImage(im, col * cw, row * ch, cw, ch, 0, 0, cw, ch);
    var d = g.getImageData(0, 0, cw, ch).data, x0 = cw, y0 = ch, x1 = 0, y1 = 0, i, x, y, seen = 0;
    for (i = 0; i < cw * ch; i++) {
      if (d[i * 4 + 3] < 40) continue;
      y = (i / cw) | 0; x = i - y * cw; seen = 1;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    if (!seen) return null;
    clip._oboxF[key] = { x0: x0, y0: y0, x1: x1, y1: y1, ax: clip.anchor[0], ay: clip.anchor[1], stand: clip.stand || ch, fit: clip.fit || 1 };
    return clip._oboxF[key];
  }
  function screenBox(id, footX, footY, fh, clipName, frame) {
    var b = cellOpaque(id, clipName || 'bossIdle', frame || 0); if (!b) return null;
    var body = fh * (SZ[id] || 1) * 0.74 * b.fit, k = body / b.stand, face = id === 'niumo' ? -1 : 1;
    var left = (b.ax - b.x0) * k, right = (b.x1 - b.ax) * k, top = (b.ay - b.y0) * k, bot = (b.y1 - b.ay) * k;
    if (face < 0) { var t = left; left = right; right = t; }
    return { x0: footX - left, x1: footX + right, y0: footY - top, y1: footY + bot, h: top + bot };
  }
  function boxesHit(a, b) { return a && b && a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1; }
  function hitFrame(id) {
    var Wld = window.XY && XY.wildAnim, clip = Wld && Wld.clip(id, 'bossAttack');
    return clip && clip.hit ? clip.hit.frame : 0;
  }
  function wideBox(id, fh) {
    return screenBox(id, 0, 0, fh, 'bossIdle', 0);
  }
  function partnerId() { return (G && G.partner) || 'phyrex'; }
  function fitOpening(W, H, land) {
    var pid = partnerId();
    var ids = [pid, 'wukong', 'niumo'];
    if (!cellOpaque('niumo') || !cellOpaque('wukong') || !cellOpaque(pid)) return null;
    function trial(fh, feet) {
      var names = ids, i, j, a, b, boxes = {};
      for (i = 0; i < names.length; i++) {
        a = wideBox(names[i], fh);
        if (!a || !feet[names[i]]) return { boxes: boxes, hit: true };
        boxes[names[i]] = { x0: feet[names[i]].x + a.x0, x1: feet[names[i]].x + a.x1, y0: feet[names[i]].y + a.y0, y1: feet[names[i]].y + a.y1, h: a.h };
      }
      for (i = 0; i < names.length; i++) for (j = i + 1; j < names.length; j++) {
        if (boxesHit(boxes[names[i]], boxes[names[j]])) return { boxes: boxes, hit: true };
      }
      return { boxes: boxes, hit: false };
    }
    var fh, feet, t, best = null;
    if (!land) {
      for (var f = 0.40; f >= 0.16; f -= 0.01) {
        fh = f / 0.62 * H;
        var bP = wideBox(pid, fh), bW = wideBox('wukong', fh), bN = wideBox('niumo', fh);
        if (!bP || !bW || !bN) continue;
        var gap = 18;
        var xP = 6 - bP.x0;
        var xW = xP + bP.x1 + gap - bW.x0;
        if (xW + bW.x1 > W - 6) continue;
        var band = hudBands();
        var yHero = band.bottomTop - 9 - Math.max(0, bP.y1, bW.y1);
        var topHero = yHero + Math.min(bP.y0, bW.y0);
        var yBoss = topHero - 16 - bN.y1;
        if (yBoss + bN.y0 < band.topH + 8) continue;
        var xN = Math.min(W - 8 - bN.x1, Math.max(-bN.x0 + 8, W * 0.62 - bN.x0 * 0));
        xN = Math.min(W - 8 - bN.x1, Math.max(8 - bN.x0, W * 0.7));
        feet = { wukong: { x: xW, y: yHero }, niumo: { x: xN, y: yBoss } };
        feet[pid] = { x: xP, y: yHero };
        t = trial(fh, feet);
        if (!t.hit) { best = { fh: fh, feet: feet, boxes: t.boxes, frac: f }; break; }
      }
    } else {
      var scales = [0.58, 0.5, 0.44, 0.38], si, guard;
      for (si = 0; si < scales.length && !best; si++) {
        fh = H * scales[si];
        var bP2 = wideBox(pid, fh), bW2 = wideBox('wukong', fh), bN2 = wideBox('niumo', fh);
        if (!bP2 || !bW2 || !bN2) continue;
        for (guard = 0; guard < 16; guard++) {
          var xP2 = W * (0.1 + guard * 0.004);
          var xW2 = W * (0.32 + guard * 0.02);
          var xN2 = W * (0.78 + guard * 0.012);
          feet = { wukong: { x: xW2, y: H * 0.845 }, niumo: { x: Math.min(W * 0.92, xN2), y: H * 0.845 } };
          feet[pid] = { x: xP2, y: H * 0.845 };
          t = trial(fh, feet);
          if (!t.hit) { best = { fh: fh, feet: feet, boxes: t.boxes, frac: 0 }; break; }
        }
      }
    }
    if (!best) return null;
    var vis = 0, id;
    for (id in best.boxes) vis = Math.max(vis, best.boxes[id].h / H);
    best.vis = Math.round(vis * 1000) / 1000;
    best.overlap = 0;
    return best;
  }
  function placeAll() {   // 世界 → 屏幕：每个绘制帧算一次；heroVis / bossVis 读缓存
    var V = vcalc(), F = G.F, W = G.W, a = ACC(), k = V.k, cw = V.cw + V.cv * a, bo = vo('boss', F.boss.x), bxw = bo.x + bo.v * a, bxs = W * .5 + (bxw - cw) * k;
    var A = W * (G.land ? .12 : .2), L = 110, pos = { boss: 0, h: {}, fs: { boss: bo.fs } }, hs = [];
    F.heroes.forEach(function (h) {
      var o = vo('h' + h.id, h.x), d = o.x + o.v * a - bxw, s = bxs + d * k + (d < 0 ? -1 : 1) * A * (1 - Math.exp(-Math.abs(d) / L));   // 靠近 Boss 时屏幕上略拉开，不叠成一团
      hs.push({ h: h, s: s, r: s - bxs }); pos.fs[h.id] = o.fs; });
    if (hs.length === 2) {   // 两个英雄屏幕距离太近：把离 Boss 远的那位往外推（按远近差平滑分摊，不会跳）
      var ms = W * (G.land ? .32 : .28), dd = Math.abs(hs[1].s - hs[0].s);
      if (dd < ms) { var def = ms - dd, u = clamp((Math.abs(hs[1].r) - Math.abs(hs[0].r)) / ms, -1, 1);
        hs[1].s += (hs[1].r < 0 ? -1 : 1) * def * (.5 + .5 * u); hs[0].s += (hs[0].r < 0 ? -1 : 1) * def * (.5 - .5 * u); } }
    function feetOk(fit) {
      if (!fit || !fit.feet || !fit.feet.niumo || !fit.feet.wukong) return false;
      var i; for (i = 0; i < hs.length; i++) if (!fit.feet[hs[i].h.id]) return false;
      return true;
    }
    function applyFeet(fit) {
      var gy = { niumo: fit.feet.niumo.y, wukong: fit.feet.wukong.y }, i, id;
      for (i = 0; i < hs.length; i++) { id = hs[i].h.id; pos.h[id] = fit.feet[id].x; if (fit.feet[id].y != null) gy[id] = fit.feet[id].y; }
      pos.boss = fit.feet.niumo.x; pos.gy = gy;
    }
    var pid = partnerId();
    if (!G.land) {
      var fit = (G._fit && G._fit.w === W && G._fit.h === G.H && G._fit.pid === pid) ? G._fit : fitOpening(W, G.H, false);
      if (feetOk(fit)) { G._fit = fit; G._fit.w = W; G._fit.h = G.H; G._fit.pid = pid; G.fh = fit.fh; applyFeet(fit); }
      else {
        hs.forEach(function (e) { pos.h[e.h.id] = e.h.w ? W * 0.62 : W * 0.22; });
        pos.boss = W * 0.72;
        pos.gy = null;
      }
    } else if (hs.length >= 2) {
      var fitL = (G._fit && G._fit.w === W && G._fit.h === G.H && G._fit.pid === pid) ? G._fit : fitOpening(W, G.H, true);
      if (feetOk(fitL)) { G._fit = fitL; G._fit.w = W; G._fit.h = G.H; G._fit.pid = pid; applyFeet(fitL); }
      else {
        hs.forEach(function (e) { pos.h[e.h.id] = e.h.w ? W * 0.36 : W * 0.12; });
        pos.boss = W * 0.8;
      }
      pos.gy = null;
    } else {
      hs.forEach(function (e) { pos.h[e.h.id] = softclamp(e.s); });
      pos.boss = softclamp(bxs);
      var ids = Object.keys(pos.h), i, right = -1, rid = null;
      for (i = 0; i < ids.length; i++) if (pos.h[ids[i]] > right) { right = pos.h[ids[i]]; rid = ids[i]; }
      if (rid && pos.boss - right < W * 0.2) {
        var shift = W * 0.2 - (pos.boss - right);
        for (i = 0; i < ids.length; i++) pos.h[ids[i]] = softclamp(pos.h[ids[i]] - shift);
      }
    }
    G.pos = pos; G.gyBy = pos.gy || null; G.sep = (G._fit && G._fit.w === W) ? { overlap: G._fit.overlap || 0, vis: G._fit.vis || 0, pass: !G._fit.hit } : null; return pos;
  }
  function hvLane(h) { if (G.gyBy) return { ln: 0, sc: 1, dy: 0 }; var key = h.w ? 'wukong' : 'partner', ln = G.lane[key]; return { ln: ln, sc: 1 - (G.land ? 0.07 : 0.14) * ln, dy: -(G.land ? 0.02 : 0.034) * G.H * ln }; }
  function heroVis(h) { var p = G.pos || placeAll(), o = hvLane(h); o.x = p.h[h.id] != null ? p.h[h.id] : p.boss; return o; }
  function bossVis() { var p = G.pos || placeAll(); return { x: p.boss, sc: G.gyBy ? 1 : (G.land ? 1.1 : 1.04), dy: 0 }; }
  // 步态：按屏幕上实际移动速度（不是 sim 的 walk 状态）决定。迈步用 stance ↔ leap（抬腿）交替 + 上下颠 + 前倾；站桩/撞墙不再原地“走”
  function gait(key, S) {
    var o = VP[key]; if (!o) return null; var V = G.V, vs = o.vs * (V ? V.k : 1), m = clamp((Math.abs(vs) - 24 * S) / (110 * S), 0, 1); if (m <= 0) return null;
    var fr = o.ph % 1, s = Math.sin(o.ph * Math.PI);
    return { m: m, bob: Math.abs(s) * .013 * G.H * m, lean: clamp(vs / (300 * S), -1.3, 1.3) * .06 * m, up: fr > .12 && fr < .62, vs: vs };
  }

  /* ---------- 特效 ---------- */
  function fxAdd(o) { o.age = 0; o.max = o.max || 0.6; G.fx.push(o); return o; }
  function dust(x, y, n, sz, col) { for (var i = 0; i < n; i++) fxAdd({ k: 'dust', x: x + (rnd() - .5) * sz * 1.4, y: y + (rnd() - .5) * 6, vx: (rnd() - .5) * 60 * G.S, vy: -(14 + rnd() * 40) * G.S, r: sz * (.25 + rnd() * .35), max: .6 + rnd() * .5, col: col || '176,146,104' }); }
  function inkBurst(x, y, sz, col, n, a) {
    n = n || 14; a = a || .85;
    fxAdd({ k: 'ink', x: x, y: y, sz: sz, col: '#2a2218', max: .5, seed: rnd() * 99, n: n, a: a });
    fxAdd({ k: 'ink', x: x, y: y, sz: sz * .7, col: '#6e342c', max: .4, seed: rnd() * 99, n: Math.max(2, Math.round(n / 4)), a: a * .7 });
  }
  function stain(x, y, sz, a) { fxAdd({ k: 'stain', x: x, y: y + 2 * G.S, sz: sz, a: a || .16, max: .9, seed: (rnd() * 999) | 0 }); }
  function ring(x, y, sz, col, max, lw) { fxAdd({ k: 'ring', x: x, y: y, sz: sz, col: col, max: max || .5, lw: lw || 5 * G.S }); }
  function inkFloat(col) {
    var c = String(col || '').toLowerCase();
    if (c === '#5c4034' || c === '#3fae66' || c === '#5cb85c' || c === '#2f7d3b') return '#6e342c';
    if (c === '#c8341f' || c === '#e0452e' || c === '#e0533d' || c === '#d23a2a') return '#6e342c';
    if (c === '#b8863b' || c === '#e6c474' || c === '#d8a93a' || c === '#e0a415' || c === '#f0b429') return '#5c4632';
    if (c === '#3f8fd0' || c === '#4a90d9' || c === '#8b3fa8' || c === '#7a2b8e') return '#2a2218';
    return col || '#2a2218';
  }
  function text(x, y, s, col, size, max, out) { fxAdd({ k: 'txt', x: x, y: y, s: s, col: inkFloat(col), size: size * G.S, max: max || .9, out: out || '#f6f0e4' }); }
  /* ---------- 体重：落地 / 受击 / 起步 的挤压回弹（按角色 key 记在 WT 里，drawSpr 里套到 sx/sy 上；影子也跟着变） ---------- */
  var WT = {};
  function wk(key) { return WT[key] || (WT[key] = { lt: -9, la: 0, ht: -9, ha: 0, gt: -9, ga: 0, air: 0, va: 0, x: 0, vx: 0, t0: 0, init: 0 }); }
  function wkick(key, kind, a) { var w = wk(key), t = VT(); if (kind === 'land') { w.lt = t; w.la = a; } else if (kind === 'hit') { w.ht = t; w.ha = a; } else { w.gt = t; w.ga = a; } }
  // 取到这一帧的体重量：返回 { sq 垂直挤压(+压/-弹), hq 受击横压, gq 起步拉长, vx 屏幕速度, air 离地像素 }；同时检测落地
  function weight(key, vt, xx, air, fh) {
    var w = wk(key), dt = vt - w.t0, S = G.S;
    if (!w.init || dt < 0 || dt > .25) { w.init = 1; w.air = air; w.va = 0; w.x = xx; w.vx = 0; w.t0 = vt; }
    else if (dt > 1e-4) {
      var va = (air - w.air) / dt, vx = (xx - w.x) / dt; w.vx += (vx - w.vx) * .35;
      if (w.air > 3 * S && air <= 3 * S) {   // 落地
        var la = clamp(-Math.min(w.va, va) / (fh * 1.5), .3, 1.1); w.lt = vt; w.la = la;
        if (/^(h:|boss)/.test(key) && G.mode === 'fight') { dust(xx, G.gy + (G._ly || 0), Math.round(3 + la * 4), (24 + la * 22) * S); stain(xx, G.gy + (G._ly || 0), (46 + la * 40) * S, .1 + .12 * la); }
      }
      w.va += (va - w.va) * .6; w.air = air; w.x = xx; w.t0 = vt;
    }
    var tl = vt - w.lt, th = vt - w.ht, tg = vt - w.gt, o = { vx: isFinite(w.vx) ? w.vx : 0, air: air, sq: 0, hq: 0, gq: 0 };
    if (tl >= 0 && tl < .36) o.sq = w.la * Math.exp(-5.5 * tl) * Math.cos(tl * 17);
    if (th >= 0 && th < .36) o.hq = w.ha * Math.exp(-6 * th) * Math.cos(th * 19);
    if (tg >= 0 && tg < .36) o.gq = w.ga * Math.exp(-7 * tg);
    return o;
  }
  // 上半身滞后：加速时头往后甩、刹车时往前冲（小幅错切，脚点不动）
  function lagSkew(key) { var o = VP[key], V = G.V; if (!o || !V) return 0; var d = (o.vs - o.vl) * V.k / (1900 * G.S); return isFinite(d) ? clamp(d, -.09, .09) : 0; }
  var DSLOT = [[-46, 0], [30, -26], [-8, -50]];
  function dmgText(key, x, y, v, pre, col, size, big) {
    var A = (G.dmgAgg = G.dmgAgg || {}), a = A[key], S = G.S;
    if (a && G.t - a.t < .45 && G.fx.indexOf(a.f) >= 0) {   // 合并：累加、略放大、重新计时
      a.sum += v; a.n++; a.t = G.t; a.f.s = pre + a.sum + (a.n > 2 ? ' ×' + a.n : ''); a.f.age = Math.min(a.f.age, .08); a.f.max = .95;
      a.f.size = Math.min(Math.max(a.f.size, size * S) * 1.05, 56 * S); if (big) a.f.col = col; return;
    }
    var k = (A._slot = ((A._slot || 0) + 1) % DSLOT.length), o = DSLOT[k];
    A[key] = { t: G.t, sum: v, n: 1, f: fxAdd({ k: 'txt', x: x + o[0] * S, y: y + o[1] * S, s: pre + v, col: col, size: size * S, max: .9, out: '#fffaf0' }) };
  }
  function call(s, col, big) { G.calls.push({ s: s, col: col || '#c8341f', age: 0, max: big ? 1.5 : 1.15, big: big }); if (G.calls.length > 2) G.calls.shift(); }
  function slash(x, y, ang, len, col, w) { fxAdd({ k: 'slash', x: x, y: y, ang: ang, len: len, col: col || '#fffaf0', w: w || 16 * G.S, max: .32 }); }
  function bodyY(sc) { return G.gy - G.fh * (sc || 1) * 0.36; }
  function hui(h) { return h.ui || (h.ui = { combo: 0, last: -9, pst: 'idle', pT: 0, fly: 0, over: false, win0: 0 }); }
  function heroById(id) { return G.F.heroes.filter(function (x) { return x.id === id; })[0]; }
  function onEvent(e) {
    var F = G.F, S = G.S, gy = G.gy, bv = bossVis(), hv, h;
    switch (e.k) {
      case 'hit': {
        G._niumoHit0 = VT();
        var by = e.by, col = (by && BF.SP[by] ? BF.SP[by].color : '#ef8a3c'); var y = bodyY(bv.sc) + (rnd() - .5) * 30 * S;
        dmgText('boss', bv.x, y - 30 * S, e.dmg, '', e.big ? '#e0301a' : '#2f2a1f', e.big ? 46 : 26, e.big);
        inkBurst(bv.x - 20 * S, y, (e.big ? 80 : 40) * S, col, e.big ? 14 : 8, .55);
        dust(bv.x, gy, e.big ? 7 : 3, 34 * S);
        if (e.big) { G.shake = Math.max(G.shake, 7 * S); G.stop = Math.max(G.stop, .07); G._crit = 1; }
        else G.shake = Math.max(G.shake, 1.6 * S);
        G.bossHit = .14; if (e.big) G.bossBig = .24; wkick('boss', 'hit', e.big ? 1.3 : .55); if (e.by && heroById(e.by)) wkick('h:' + e.by, 'land', e.big ? .5 : .32); break; }
      case 'hurt': { h = heroById(e.id); if (!h) break; hv = heroVis(h); var yy = bodyY(hv.sc) + hv.dy;
        dmgText(e.id, hv.x, yy - 40 * S, e.dmg, '-', '#d6341a', e.big ? 38 : 24, e.big); inkBurst(hv.x, yy, (e.big ? 60 : 32) * S, '#8d2112', 9, .6); dust(hv.x, gy + hv.dy, e.big ? 7 : 3, 30 * S);
        G.shake = Math.max(G.shake, (e.big ? 9 : 3) * S); if (e.big) { G.stop = Math.max(G.stop, .06); hui(h).fly = .6; } h.flash = .14; wkick('h:' + e.id, 'hit', e.big ? 1.3 : .7); break; }
      case 'stagger': call('破招', '#c8341f', true); ring(bv.x, bodyY(bv.sc), 120 * S, '#e6c474', .5); break;
      case 'ultland': { call('必杀', '#c8341f', true); var cc = (e.id === 'wukong' ? '#ef8a3c' : BF.SP[e.id].color); ring(bv.x, bodyY(bv.sc), 150 * S, cc, .7, 7 * S); inkBurst(bv.x + 30 * S, bodyY(bv.sc) - G.fh * .25, 70 * S, cc, 10, .5); dust(bv.x, gy, 12, 56 * S);
        slash(bv.x, bodyY(bv.sc), -.5, 300 * S, '#2a2218', 18 * S); slash(bv.x, bodyY(bv.sc), .55, 260 * S, '#6e342c', 8 * S); G.shake = Math.max(G.shake, 13 * S); G.stop = Math.max(G.stop, .11); G.flash = .3; G.flashC = '#f4efe4';
        if (e.id !== 'wukong') { var ef = BF.SP[e.id].ult.e || {}, lab = Object.keys(ef).filter(function (k) { return EFXN[k]; }).map(function (k) { return EFXN[k]; }); var w0 = F.heroes[0]; if (lab.length && w0) { hv = heroVis(w0); text(hv.x, Math.max(bodyY(hv.sc) - G.fh * .46, (G.land ? G.H * .245 : G.H * .2) + 48 * S), lab.join(' · '), cc, 22, 1.5); ring(hv.x, bodyY(hv.sc), 110 * S, cc, .8, 5 * S); } } break; }
      case 'ko': { h = heroById(e.id); if (!h) break; hv = heroVis(h); inkBurst(hv.x, bodyY(hv.sc) - G.fh * .1, 90 * S, '#2f2a1f', 14, .45); dust(hv.x, gy, 10, 50 * S); call(h.w ? '败' : '退场', '#4a4338', true); G.shake = 12 * S; break; }
      case 'bossko': G.calls = []; G.fx = G.fx.filter(function (f) { return !(f.k === 'txt' && f.col === '#b8863b'); }); G.slow = 1.6; G.shake = 18 * S; inkBurst(bv.x, bodyY(bv.sc) - G.fh * .3, 150 * S, '#2f2a1f', 22, .4); ring(bv.x, bodyY(bv.sc), 300 * S, '#e6c474', 1, 10 * S); G.flash = .5; G.flashC = '#fffaf0'; break;
      case 'phase': call('狂暴', '#c8341f', true); ring(bv.x, bodyY(bv.sc), 220 * S, '#c8341f', .9, 8 * S); G.shake = 10 * S; break;
      case 'final': call('绝命', '#c8341f', true); G.shake = 6 * S; break;
      case 'tele': if (e.n === 'charge') text(bv.x, bodyY(bv.sc) - G.fh * .5, '！', '#c8341f', 54, 1); else if (e.n === 'spin') text(bv.x, bodyY(bv.sc) - G.fh * .52, '旋风', '#c8341f', 34, 1); break;
      case 'chargego': dust(bv.x, gy, 10, 56 * S); stain(bv.x, gy, 90 * S, .18); wkick('boss', 'go', 1); break;
      case 'meleehit': { var fx0 = bv.x + e.face * 120 * S; slash(fx0, bodyY(bv.sc) + (e.n === 2 ? 40 : 20) * S, e.face < 0 ? (e.n === 2 ? 3.6 : 2.6) : (e.n === 2 ? -.5 : .5), 200 * S, '#2f2a1f', 20 * S); dust(fx0, gy, 6, 40 * S); stain(fx0, gy, 80 * S, .16); wkick('boss', 'land', e.n === 2 ? .9 : .6); G.shake = Math.max(G.shake, (e.n === 2 ? 6 : 4) * S); break; }
      case 'spinhit': ring(bv.x, gy, BF.K.SPIN_R * G.V.k * 1.7, '#2f2a1f', .5, 8 * S); dust(bv.x, gy, 8, 48 * S); wkick('boss', 'land', .5); G.shake = Math.max(G.shake, 5 * S); break;
      case 'interrupt': text(bv.x, bodyY(bv.sc) - G.fh * .55, '打断！', '#5c4034', 40, 1.1); ring(bv.x, bodyY(bv.sc), 140 * S, '#5c4034', .6, 6 * S); break;
      case 'finalhit': ring(bv.x, gy, G.W * .5, '#2a2218', .9, 12 * S); dust(bv.x, gy, 22, 90 * S); stain(bv.x, gy, 160 * S, .22); wkick('boss', 'land', 1.2); G.shake = 22 * S; G.stop = .1; G.flash = .4; G.flashC = '#f4efe4'; break;
      case 'guards': ring(bv.x, bodyY(bv.sc), 170 * S, '#7a2b8e', .7); break;
      case 'flames': dust(bv.x - 60 * S, gy, 8, 46 * S, '42,34,24'); stain(bv.x - 60 * S, gy, 110 * S, .2); wkick('boss', 'land', 1); ring(bv.x - 60 * S, gy, 150 * S, '#2a2218', .5, 6 * S); inkBurst(bv.x - 60 * S, gy - 20 * S, 50 * S, '#2a2218', 8, .4); G.shake = Math.max(G.shake, 6 * S); break;
      case 'dodge': h = heroById(e.id); if (h) { hv = heroVis(h); text(hv.x, bodyY(hv.sc) - 60 * S, '闪', '#5c4034', 34, .7); } break;
      case 'trait': h = heroById(e.id); if (h) { hv = heroVis(h); if (!G.F.over) text(hv.x, bodyY(hv.sc) - 90 * S, e.name, '#b8863b', 22, 1.3); ring(hv.x, bodyY(hv.sc), 110 * S, h.color, .6); } break;
      case 'wuult': G.wuUlt = .9; G.wuCut = 2.4; G.wuCutOff = false; break;
      case 'heal': h = heroById(e.id); if (h) { hv = heroVis(h); text(hv.x, bodyY(hv.sc) - 50 * S, '+' + e.amt, '#5c4034', 22, .9); } break;
      case 'shot': { hv = null; var hh = heroById(e.id); if (hh) { hv = heroVis(hh); fxAdd({ k: 'shot', x0: hv.x + 40 * S, y0: bodyY(hv.sc) + hv.dy, x1: bv.x - 30 * S, y1: bodyY(bv.sc), col: e.color, max: Math.max(.1, e.t) }); } break; }
      case 'summon': G.sumShake = 0; break;
      case 'leave': break;
    }
  }

  /* ---------- 流程 ---------- */
  var runSerial = 0;
  function startFight(o) {
    o = o || {}; G.runId = ++runSerial; var partner = o.partner || G.partner; G.partner = partner;
    G.F = BF.newFight({ partner: partner, summon: o.summon || null, seed: o.seed || (Math.random() * 99999 | 0) + 1 });
    G.fx = []; G.calls = []; G.shake = 0; G.stop = 0; G.slow = 0; G.endT = 0; G.introT = o.skipIntro ? 0 : 1.7; G.lane = { wukong: 0, partner: 1 }; G.t = 0; G.mode = 'fight'; G.vt = G.vt || 0; TR = {}; HST = {}; WT = {}; VP = {}; G.V = null; G.pos = null; G._fit = null; G.shown = false; G.flash = 0; G.wuUlt = 0; G.bossBig = 0; G.bossHit = 0; G.hp = null; G.dmgAgg = {};
    $('pick').classList.remove('on'); $('res').classList.remove('on'); WLAT = {}; HLAT = {};
    setTimeout(function () { loadMids('wukong'); loadMids('niumo'); loadMids(partner); }, 700);   // 中间帧：开战后台再载，不占首屏体积
  }
  function trackHero(h, dt) {
    var u = hui(h), b = G.F.boss;
    if (h.st === 'atk' && (u.pst !== 'atk' || h.stT < u.pT)) { u.combo = (G.t - u.last < 1.15) ? (u.combo + 1) % 3 : 0; u.last = G.t; }
    if (h.st === 'jump' && u.pst !== 'jump') u.over = (b.st === 'charge' || b.st === 'spin' || (b.st === 'tele' && b.tele && b.tele.len));
    if (h.st === 'jump' && u.pst !== 'jump') wkick('h:' + h.id, 'go', .9);
    if (h.st === 'dash' && u.pst !== 'dash') wkick('h:' + h.id, 'go', 1);
    if (h.st === 'atk' && (u.pst !== 'atk')) wkick('h:' + h.id, 'go', .45);
    u.pst = h.st; u.pT = h.stT; if (u.fly > 0) u.fly -= dt;
  }
  function stepSim(dt) { G._inStep = true; try { stepSim0(dt); } finally { G._inStep = false; } }
  function stepSim0(dt) {
    var F = G.F; G.vt = (G.vt || 0) + dt;
    if (G.introT > 0) { G.introT -= dt; return; }
    if (G.stop > 0) { G.stop -= dt; return; }
    if (G.slow > 0) { G.slow -= dt; dt *= 0.35; }
    if (!F.over) { BF.step(F, dt); G._crit = 0; var hasUlt = F.ev.some(function (x) { return x.k === 'ultland'; }); F.ev.forEach(onEvent); F.ev.length = 0; if (G._crit && !hasUlt && !F.over) call('暴击', '#c8341f'); }
    G.t += dt; F.heroes.forEach(function (h) { trackHero(h, dt); });
    // 前后站位：被牛魔王盯上的搭档走到前排，悟空退后（轮换）
    var ag = F.aggro, wantFront = (ag && ag.i === 1 && F.heroes[1] && F.heroes[1].alive) ? 'partner' : 'wukong';
    G.lane.wukong += ((wantFront === 'wukong' ? 0 : 1) - G.lane.wukong) * Math.min(1, dt * 3.2);
    G.lane.partner += ((wantFront === 'partner' ? 0 : 1) - G.lane.partner) * Math.min(1, dt * 3.2);
    F.heroes.forEach(function (h) { if (h.flash > 0) h.flash -= dt; });
    updateView(dt);
    if (G.bossHit > 0) G.bossHit -= dt; if (G.bossBig > 0) G.bossBig -= dt; if (G.wuUlt > 0) G.wuUlt -= dt; if (G.wuCut > 0 && !G.wuCutOff) G.wuCut -= dt;
    G.shake *= Math.pow(0.002, dt); G.flash = Math.max(0, G.flash - dt * 1.6);
    G.fx = G.fx.filter(function (f) { f.age += dt; return f.age < f.max; });
    G.calls = G.calls.filter(function (c) { c.age += dt; return c.age < c.max; });
    if (F.over) { G.endT += dt; if (!G.shown && G.endT > (F.over.win ? 2.6 : 1.6)) { G.shown = true; showResult(); } }
  }
  function frame(now) {
    if (!G.run) return;
    if (!G._last) G._last = now; var rdt = Math.min(0.05, (now - G._last) / 1000); G._last = now;
    if (G.mode === 'fight' && G.auto && !G.pause) { var n = rdt * G.speed, acc = (G._acc || 0) + n; while (acc >= 1 / 60) { stepSim(1 / 60); acc -= 1 / 60; } G._acc = acc; }
    if (G.mode !== 'fight') G.vt = (G.vt || 0) + rdt;
    draw(); if (G.mode === 'pick') drawPick();
    requestAnimationFrame(frame);
  }

  /* ---------- 画：人物（逐姿势精灵） ---------- */
  function spr(id, pose) { var o = SPR[id]; return o && (o[pose] && o[pose].naturalWidth ? o[pose] : o.stance); }
  function has(id, pose) { var o = SPR[id]; return !!(o && o[pose] && o[pose].naturalWidth); }
  function smeta(id, pose) { var m = SMETA[id]; return m && (m[pose] || m.stance); }
  // 精灵：站姿高度统一为 480px（tools/cut3.py 归一），脚点 (ax, 底边) 对齐地面。p.flip 以脚点为轴镜像（牛魔王原生朝左，我方原生朝右）。我方永远不镜像。
  // v0.9.2 体积感：① 接触影（软边、落地压宽加深、腾空缩小变淡、跑动顺速度拉长）② 假厚度（身后偏下垫两层深色剪影）③ 转身时按转体曲线变窄 + 侧身变暗 + 露出厚度 ④ 后排薄雾
  var SILD = {};
  function silDark(id, pose) {
    var key = id + '/' + pose; if (SILD[key]) return SILD[key]; var im = spr(id, pose), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    var x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#3b2e1c'; x.fillRect(0, 0, c.width, c.height); return (SILD[key] = c);
  }
  function turnW(f) { var a = Math.abs(f); if (a >= .999) return f < 0 ? -1 : 1; var d = Math.sin(a * 1.5708); d = Math.max(.2, d); return f < 0 ? -d : d; }   // 转体：线性角度 → 宽度 sin(θ)，最窄留 20% 的侧身
  function drawShadow(c, cx, gyy, w, fh, p, al, face) {
    var ref = p.fitH || fh, rx = Math.min(w, ref * .62) * .4, ry = ref * .042, a = .78 * (p.shA == null ? al : p.shA), sq = clamp(p.sq || 0, -.5, 1.2), air = clamp((p.air || 0) / (ref * .3), 0, 1), vx = p.svx || 0, sh = 0;
    rx *= 1 + .3 * sq; ry *= 1 + .22 * sq; a *= 1 + .35 * sq;
    rx *= 1 - .42 * air; ry *= 1 - .45 * air; a *= 1 - .6 * air; sh = -face * rx * .22 * air;          // 腾空：缩小变淡，略偏身后
    var st = clamp(Math.abs(vx) / (ref * 2.6), 0, .5); rx *= 1 + st; sh += -Math.sign(vx) * rx * .3 * st;   // 跑动：向速度反方向拉长
    if (!(rx > 0.5) || !(a > .004)) return;
    c.save(); c.globalAlpha = clamp(a, 0, .85); c.translate(cx + (p.dx || 0) * .8 + sh, gyy + ref * .008); c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(26,18,8,.92)'); g.addColorStop(.5, 'rgba(34,24,12,.6)'); g.addColorStop(1, 'rgba(44,32,16,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill();
    c.globalAlpha *= .75; var g2 = c.createRadialGradient(0, 0, 0, 0, 0, rx * .5); g2.addColorStop(0, 'rgba(14,9,3,.85)'); g2.addColorStop(1, 'rgba(14,9,3,0)'); c.fillStyle = g2; c.beginPath(); c.arc(0, 0, rx * .5, 0, 7); c.fill(); c.restore();   // 脚下一小团更深的接触影
  }
  /* 狂野水墨：待机 / 普攻（牛魔王还有受击）按 animation.json 播。片段没载入就返回 false，下面仍画旧 webp。 */
  var WLAT = {}, HLAT = {}, WHOLD = { stance: 1, idle: 1, idle_a: 1, idle_b: 1, idle2: 1, attack: 1, attack_a: 1, attack_b: 1, attack_c: 1, swing: 1, swing_a: 1, swing_b: 1, smash: 1, smash_a: 1 };
  function paintWild(c, id, clipName, tMs, cx, gyy, fh, p) {
    var W = XY.wildAnim, clip = W.clip(id, clipName), im = W.img(id, clipName);
    if (!clip || !im || !im.naturalWidth) return false;
    var fr = W.frameAt(clip, tMs);
    if (fr.index < 0 || fr.index >= clip.frameCount) return false;
    var cw = clip.cell[0], chh = clip.cell[1], col = fr.index % clip.cols, row = (fr.index / clip.cols) | 0;
    var body = p.fitH || fh * (SZ[id] || 1) * 0.74, standPx = clip.stand || (id === 'niumo' ? 480 : ((W.data && W.data.stand) || 192));
    var k = body / standPx * (clip.fit || 1);
    var ax = clip.anchor[0], ay = clip.anchor[1], fl0 = p.fs != null ? p.fs : (p.flip ? -1 : 1), fl = p.fs != null ? turnW(fl0) : fl0, al = p.alpha == null ? 1 : p.alpha;
    if (Math.abs(fl) < .05) return true;
    var face = (fl < 0 ? -1 : 1), ref = p.fitH || fh;
    var tx = cx + (p.dx || 0), ty = gyy + (p.dy || 0) - (p.lift || 0) * fh, nudge = 0;
    if (!G.gyBy && (id === 'niumo' || cw >= 480)) {
      var padX = G.W * 0.02, padTop = G.H * 0.07;
      var sprW = cw * k, sprH = chh * k, maxW = G.W - padX * 2, maxH = Math.max(80, gyy - padTop);
      var shrink = Math.min(1, maxW / sprW, maxH / sprH);
      if (shrink < 1) k *= shrink;
      var left = ax * k, right = (cw - ax) * k;
      if (tx + right > G.W - padX) nudge = (G.W - padX) - (tx + right);
      if (tx - left + nudge < padX) nudge = padX - (tx - left);
      tx += nudge;
    }
    if (!p.noShadow) drawShadow(c, cx + nudge, gyy, Math.min(body * .55, ref * .5), fh, p, al, face);
    if (id !== 'niumo' && !(clip.stand > 400) && k > 2.2) k = 2.2;
    c.save(); c.globalAlpha = al; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.translate(tx, ty); c.rotate(p.rot || 0); c.transform(1, 0, (p.skew || 0) * fl, 1, 0, 0); c.scale(fl * (p.sx || 1), p.sy || 1);
    if (W.blit) W.blit(c, clip, im, fr.index, -ax * k, -ay * k, cw * k, chh * k);
    else c.drawImage(im, col * cw, row * chh, cw, chh, -ax * k, -ay * k, cw * k, chh * k);
    c.restore();
    return true;
  }
  /* 只播验收过的 Boss 逐帧。旧 idle/attack/hit 灰粉图集一律不画，没有新图就回到彩色定妆。 */
  function bossClipName(id, name) {
    var W = window.XY && XY.wildAnim;
    if (!W || !W.ready) return null;
    var alt = name === 'idle' ? 'bossIdle' : name === 'attack' ? 'bossAttack' : name === 'hit' ? 'bossHit' : null;
    if (!alt || !W.ready(id, alt)) return null;
    return alt;
  }
  function drawWildPose(c, id, pose, cx, gyy, fh, p) {
    if (window.XY_NO_WILD) return false;
    var W = window.XY && XY.wildAnim;
    if (!W || !W.poseClip || !W.frameAt || !W.ready) return false;
    var vt = VT(), want = W.poseClip(id, pose);
    var idleN = bossClipName(id, 'idle'), atkN = bossClipName(id, 'attack'), hitN = bossClipName(id, 'hit');
    if (!idleN && !atkN && !hitN) return false;
    var atk = atkN ? W.clip(id, atkN) : null;
    if (!p.key) {
      if (want === 'attack' && atk) return paintWild(c, id, atkN, (atk.hit && atk.hit.atMs) || 250, cx, gyy, fh, p);
      if (want === 'hit' && hitN) return paintWild(c, id, hitN, (W.clip(id, hitN).hit || {}).atMs || 167, cx, gyy, fh, p);
      if (want === 'idle' && idleN) return paintWild(c, id, idleN, vt * 1000, cx, gyy, fh, p);
      return false;
    }
    if (pose && !WHOLD[pose]) delete WLAT[p.key];
    var lat = WLAT[p.key];
    if (atk && want === 'attack') { if (!lat || vt < lat.t0 || (vt - lat.t0) * 1000 > atk.durationMs + 40) lat = WLAT[p.key] = { t0: vt }; }
    if (lat && atk && WHOLD[pose] && (vt - lat.t0) * 1000 < atk.durationMs) return paintWild(c, id, atkN, (vt - lat.t0) * 1000, cx, gyy, fh, p);
    if (want === 'hit' && hitN) {
      var hc = W.clip(id, hitN), hk = p.key, hlat = HLAT[hk];
      if (!hlat || vt < hlat.t0 || (vt - hlat.t0) * 1000 > hc.durationMs + 40) hlat = HLAT[hk] = { t0: vt };
      return paintWild(c, id, hitN, Math.min(hc.durationMs, (vt - hlat.t0) * 1000), cx, gyy, fh, p);
    }
    if (want === 'idle' && idleN) {
      var off = 0, i; for (i = 0; i < id.length; i++) off = (off + id.charCodeAt(i) * 97) % 5000;
      return paintWild(c, id, idleN, vt * 1000 + off, cx, gyy, fh, p);
    }
    return false;
  }
  function drawSpr1(c, id, pose, cx, gyy, fh, p) {
    p = p || {}; if (drawWildPose(c, id, pose, cx, gyy, fh, p)) return;
    var im = spr(id, pose), m = SMETA[id] && (SMETA[id][pose] && has(id, pose) ? SMETA[id][pose] : SMETA[id].stance); if (!im || !im.naturalWidth || !m) { if (SMETA[id] && !/^ret/.test(pose)) inkBlob(c, cx + (p.dx || 0), gyy, (p.fitH || fh * (SZ[id] || 1) * .74), p.alpha); return; }
    var k = p.fitH ? p.fitH / m.h : fh * (SZ[id] || 1) * 0.74 / 480, w = m.w * k, h = m.h * k, fl0 = p.fs != null ? p.fs : (p.flip ? -1 : 1), fl = p.fs != null ? turnW(fl0) : fl0, al = p.alpha == null ? 1 : p.alpha; if (Math.abs(fl) < .05) return;
    var face = (id === 'niumo' ? -1 : 1) * (fl < 0 ? -1 : 1), afl = Math.abs(fl), ref = p.fitH || fh;
    if (!p.noShadow) drawShadow(c, cx, gyy, w, fh, p, al, face);
    var tx = cx + (p.dx || 0), ty = gyy + (p.dy || 0) - (p.lift || 0) * fh;
    function chain(offx, offy) { c.translate(tx + offx, ty + offy); c.rotate(p.rot || 0); c.transform(1, 0, (p.skew || 0) * fl, 1, 0, 0); c.scale(fl * (p.sx || 1), p.sy || 1); }
    if (!p.noThick && al > .05) {   // 假厚度：身后偏下 2–4px 两层深色剪影；转身侧身时厚度往外露得更多
      var d = ref * (id === 'niumo' ? .0095 : .0105) * (1 + 2.6 * clamp((.7 - afl) / .5, 0, 1)), sd = silDark(id, pose), nl = afl < .7 ? 3 : 2;
      for (var j = nl; j >= 1; j--) { c.save(); c.globalAlpha = al * (j === nl ? .17 : .27); chain(-face * d * j * (nl === 3 ? .55 : .5) * (afl < .7 ? 1.4 : 1), d * j * .42); c.drawImage(sd, -m.ax * k, -h, w, h); c.restore(); }
    }
    c.save(); c.globalAlpha = al; chain(0, 0);
    c.drawImage(im, -m.ax * k, -h, w, h);
    if (afl < .55 && !p.noThick) { c.globalAlpha = al * (1 - afl / .55) * .32; c.drawImage(silDark(id, pose), -m.ax * k, -h, w, h); }   // 侧身背光：变暗一点
    if (p.fog > .02) { c.globalAlpha = al * .15 * p.fog; c.drawImage(sil(id, pose), -m.ax * k, -h, w, h); }                                  // 后排：薄雾
    if (p.flash > 0) { c.globalAlpha = Math.min(1, p.flash * 6) * 0.42 * al; c.drawImage(sil(id, pose), -m.ax * k, -h, w, h); }
    c.restore();
  }
  /* 姿势过渡：同一个角色(p.key)切姿势时，新姿势淡入、旧姿势淡出（最多叠 3 层）；攻击/冲撞按时间留 2–4 个残影。时钟 = 视觉时钟 vt（战斗步进 + 渲染帧内插）。 */
  var TR = {}, HST = {}, IDLEP = { stance: 1, idle_a: 1, idle_b: 1, idle2: 1 }, HITP = { hit: 1, hit_a: 1, fly: 1, ko: 1, ko_a: 1 };
  function VT() { return (G.vt || 0) + (G._acc || 0); }
  function fadeDur(a, b) {
    if (IDLEP[a] && IDLEP[b]) return .32;                      // 呼吸 / 重心：慢慢过渡
    if (HITP[b]) return .06;                                    // 受击：几乎立刻，但仍不硬切
    var ma = /_[abc]$|_mid$|_rec$/.test(a), mb = /_[abc]$|_mid$|_rec$/.test(b);
    if (ma || mb) return .075;                                  // 有中间帧的相邻两格
    return IDLEP[b] ? .14 : .11;                                // 没有中间帧的大跳：80–140ms 交叉淡入淡出
  }
  function drawSpr(c, id, pose, cx, gyy, fh, p) {
    p = p || {};
    /* Boss 战大图不再叠姿势淡出和冲刺残影，避免出招身上留下一块灰影。旧灰图集仍然不画。 */
    if (p.key && bossClipName(id, 'idle')) {
      var plate = {}; for (var pk in p) plate[pk] = p[pk];
      if (plate.fs != null) plate.fs = plate.fs < 0 ? -1 : 1;
      plate.gh = 0;
      return drawSpr1(c, id, pose, cx, gyy, fh, plate);
    }
    if (!p.key) return drawSpr1(c, id, pose, cx, gyy, fh, p);
    var vt = VT(), T = TR[p.key];
    { var q0 = {}, kq; for (kq in p) q0[kq] = p[kq]; p = q0;
      if (p.fs != null && Math.abs(p.fs) < .995) { var tn = 1 - Math.abs(p.fs); p.air = (p.air || 0) + Math.sin(tn * 3.1416 * .5) * fh * .012; p.sy = (p.sy || 1) * (1 - .035 * tn); }   // 转身：身子微微提起一点再落下
      var wv = weight(p.key, vt, cx + (p.dx || 0), (p.air || 0) + (p.lift || 0) * fh, fh);
      p.sy = (p.sy || 1) * (1 - .13 * wv.sq + .04 * wv.hq + .09 * wv.gq); p.sx = (p.sx || 1) * (1 + .08 * wv.sq - .08 * wv.hq - .05 * wv.gq);
      p.sq = Math.max(wv.sq, 0) + Math.max(wv.hq, 0) * .4; p.svx = wv.vx; p.air = wv.air; }
    if (!T || T.id !== id || vt < T.last - 1) T = TR[p.key] = { id: id, L: [{ pose: pose, t0: -9, dur: .1 }], last: vt, gk: 0 };
    var dtv = Math.max(0, Math.min(.1, vt - T.last)); T.last = vt;
    var L = T.L, top = L[L.length - 1];
    if (top.pose !== pose) { L.push({ pose: pose, t0: vt, dur: p.fd || fadeDur(top.pose, pose) }); if (L.length > 3) L.shift(); }
    var n = L.length, fa = [], i;
    for (i = 0; i < n; i++) { var u = clamp((vt - L[i].t0) / L[i].dur, 0, 1); fa.push(u * u * (3 - 2 * u)); }
    for (i = n - 1; i > 0; i--) if (fa[i] >= 1) { L.splice(0, i); fa.splice(0, i); n = L.length; break; }
    // 残影：历史里取 .05s 间隔的几帧，淡淡地垫在下面
    var H = HST[p.key] || (HST[p.key] = []); if (H.length && vt < H[H.length - 1].t) H.length = 0;
    H.push({ t: vt, cx: cx, gyy: gyy, fh: fh, id: id, pose: pose, p: { dx: p.dx, dy: p.dy, rot: p.rot, sx: p.sx, sy: p.sy, skew: p.skew, lift: p.lift, flip: p.flip, fs: p.fs, fitH: p.fitH } }); while (H.length && H[0].t < vt - .3) H.shift();
    T.gk += ((p.gh ? 1 : 0) - T.gk) * Math.min(1, dtv * (p.gh ? 18 : 9));
    if (T.gk > .03 && (p.gh || T.gk > .1)) {
      var ng = p.gh || 3, A0 = [.2, .11, .06, .03];
      for (var g = Math.min(ng, 4); g >= 1; g--) { var tg = vt - g * .05, r = null; for (var q = H.length - 1; q >= 0; q--) if (H[q].t <= tg) { r = H[q]; break; } if (!r || tg - r.t > .06) continue;
        var gp = {}; for (var kk in r.p) gp[kk] = r.p[kk]; gp.alpha = A0[g - 1] * T.gk * (p.alpha == null ? 1 : p.alpha); gp.noShadow = 1; gp.noThick = 1; gp.fog = 0; drawSpr1(c, r.id, r.pose, r.cx, r.gyy, r.fh, gp); }
    }
    var baseA = p.alpha == null ? 1 : p.alpha;
    for (i = n - 1; i >= 0; i--) {   // 上层淡入；下层保持不透明，等上层盖到 55% 以后再快速淡出（避免中间叠出一个半透明的人）
      var q2 = {}; for (var k2 in p) q2[k2] = p[k2];
      var cov = i < n - 1 ? clamp((fa[i + 1] - .55) / .45, 0, 1) : 0;
      q2.alpha = baseA * fa[i] * (1 - cov * cov * (3 - 2 * cov)); if (i === 0) q2.shA = baseA; else q2.noShadow = 1;
      if (i !== n - 1) q2.noThick = 1;   // 影子只画一次，不跟着淡入淡出
      if (i !== n - 1) q2.flash = 0;
      drawSpr1(c, id, L[i].pose, cx, gyy, fh, q2);
    }
  }
  // 随从：只在必杀/施放时出现，小，站在人物身后（左侧）
  function drawRetinue(c, id, x, gyy, fh, a, t, dir) {
    dir = dir || 1;
    var n = id === 'martin' ? 4 : 4, S = G.S;
    for (var i = n - 1; i >= 0; i--) { var xx = x - dir * (46 + i * 44) * S, bob = Math.sin(t * 6 + i * 1.7) * 3 * S; drawSpr(c, id, 'ret' + i, xx, gyy + (i % 2 ? 5 : 0) * S, 0, { fitH: fh * (id === 'martin' ? .26 : .27), alpha: a, dy: bob }); }
  }
  // 呼吸：连续正弦（不再量化成 6 档），幅度比旧版略大
  function idleV(off) { return Math.sin((((VT() * .9 + off) % 1) + 1) % 1 * 6.2832); }
  function M(id, name, fb) { return has(id, name) ? name : fb; }
  // 待机：stance → idle_a → idle_b → stance 慢慢来回（悟空/搭档：重心轻晃；牛魔王：stance ↔ idle2 经过 idle_a/idle_b）
  function idleHero(id, off) { if (!has(id, 'idle_a')) return 'stance'; var ph = (((VT() / 2.2 + off) % 1) + 1) % 1, s = (1 - Math.cos(ph * 6.2832)) / 2; return s < .25 ? 'stance' : (ph < .5 ? 'idle_a' : M(id, 'idle_b', 'idle_a')); }
  function idleBoss(off) { var id = 'niumo'; if (!has(id, 'idle_a')) return has(id, 'idle2') && (((VT() / 3.3 + off) % 1 + 1) % 1) > .6 ? 'idle2' : 'stance'; var ph = (((VT() / 3.3 + off) % 1) + 1) % 1, s = (1 - Math.cos(ph * 6.2832)) / 2;
    if (ph < .5) return s < .2 ? 'stance' : (s < .55 ? 'idle_a' : 'idle2'); return s > .55 ? 'idle2' : (s > .2 ? M(id, 'idle_b', 'idle_a') : 'stance'); }
  // 近战连招的 6 个视觉阶段：stance → X_a → X_b → X（命中帧 ≈ .16s）→ X_c → stance
  function chain(id, base, k) {
    if (k < .025 || k >= .27) return 'stance';
    if (k < .085) return M(id, base + '_a', base); if (k < .145) return M(id, base + '_b', base); if (k < .215) return base; return M(id, base + '_c', base);
  }
  var COMBO = ['attack', 'atk2', 'atk3'];
  function heroPose(h, hv) {
    var P = heroPose0(h, hv), S = G.S, o = VP['h' + h.id], fs = o ? o.fs : 1, g = gait('h' + h.id, S), st = h.st;
    P.fs = fs; if (fs < 0) { P.dx = -P.dx; P.rot = -P.rot; }
    if (st === 'jump') P.air = Math.max(0, -(P.dy)) ; if (st === 'hurt' || st === 'ko') P.air = Math.max(0, -(P.dy));                                  // 朝左时，前冲/后仰这些“朝前”的量跟着翻
    if (g && (st === 'idle' || st === 'walk') && !(F_over_win()) && P.pose !== 'block' && !(h.w && G.wuUlt > 0)) { P.dy -= g.bob; P.rot += g.lean; P.skew = 0; P.pose = g.m > .4 && g.up ? 'leap' : 'stance'; P.fd = .07; if (g.m > .4 && g.up) P.sy = 1; P.gh = g.m > .9 && Math.abs(g.vs) > 230 * S ? 2 : P.gh; }
    if (!(st === 'hurt' || st === 'ko' || st === 'cast')) P.skew += lagSkew('h' + h.id);
    if (G.poseBy && G.poseBy[h.id]) { P.pose = G.poseBy[h.id]; P.fs = 1; P.dy = 0; P.dx = 0; P.rot = 0; P.skew = 0; P.sx = 1; P.sy = 1; P.lift = 0; }
    else if (G.poseLock) { P.pose = G.poseLock; P.dy = 0; P.dx = 0; P.rot = 0; P.skew = 0; P.sx = 1; P.sy = 1; P.lift = 0; }
    return P;
  }
  function F_over_win() { var F = G.F; return !!(F.over && F.over.win); }
  function heroPose0(h, hv) {
    var S = G.S, H = G.H, P = { sx: 1, sy: 1, dx: 0, dy: 0, rot: 0, alpha: 1, flash: h.flash || 0, pose: 'stance', skew: 0, lift: 0, key: 'h:' + h.id, gh: 0 }, F = G.F, b = F.boss, u = hui(h);
    var v = idleV(h.w ? 0 : .37); P.sy = 1 + .02 * v; P.skew = .02 * v; P.sx = 1 - .006 * v; P.pose = idleHero(h.id, h.w ? 0 : .5);
    var st = h.st, k = h.stT, e;
    if (hv.ln > .02 && hv.ln < .98) P.dy -= 4 * hv.ln * (1 - hv.ln) * 8 * S;     // 前后换位：只在景深上小跳一下（横向位置跟 sim）
    if (F.over && F.over.win && h.alive) { var tw = G.endT; P.pose = 'win'; P.dy = -Math.abs(Math.sin(Math.min(tw, 1.4) * 5)) * (tw < 1.4 ? .03 : 0) * H; P.skew = 0; P.sy = 1; P.dx = 0; P.sx = 1; return P; }
    if (h.w && G.wuUlt > 0) { P.pose = 'ult'; P.lift = .03; P.dx = 18 * S; return P; }
    // 格挡：牛魔王近战/起手时，身边被盯的人举架
    var near = Math.abs(h.x - b.x) < 300;
    if ((st === 'idle' || st === 'walk') && near && ((b.st === 'melee' && b.stT < .42) || (b.st === 'tele' && b.tele && !b.tele.len))) { P.pose = 'block'; P.dx = -10 * S; P.skew = 0; P.sy = 1; }
    if (st === 'atk') {
      var q = Math.sin(clamp(k / .3, 0, 1) * Math.PI), melee = !h.atk.ranged, cb = u.combo;
      if (k < .3) P.pose = chain(h.id, melee ? COMBO[cb] : (cb === 1 ? 'atk2' : 'attack'), k); if (melee && k > .05 && k < .27) P.gh = 3;
      P.dx = q * (melee ? 70 + 22 * cb : 12) * S * (G.land ? 1 : .45); P.rot = q * (.04 + .02 * cb); P.skew = 0; P.sx = 1 + q * .03;
      if (melee && cb === 2) { P.lift = .018 * q; }
    }
    if (st === 'hurt') {
      if (u.fly > 0) { var f = 1 - u.fly / .6; P.pose = f < .08 ? M(h.id, 'hit_a', 'fly') : 'fly'; P.gh = 2; P.dx = -f * 62 * S; P.dy = -Math.sin(Math.min(1, f * 1.4) * Math.PI) * 30 * S; P.rot = -.12 * (1 - f); P.skew = 0; P.sy = 1; }
      else { e = clamp(k / .25, 0, 1); P.pose = k < .05 ? M(h.id, 'hit_a', 'hit') : 'hit'; P.dx = -(1 - e) * 30 * S - 6 * S; P.rot = -.05 * (1 - e); P.skew = 0; P.sy = 1; }
    }
    if (st === 'jump') { var j = clamp(k / .5, 0, 1), sj = Math.sin(j * Math.PI); P.dy -= h.y * 1.1 * S; P.skew = 0; P.sy = 1;
      P.gh = 2; if (u.over) { P.pose = 'leap'; P.dx = 14 * S * sj; P.rot = .06; } else { P.pose = 'dodge'; P.dx = -54 * S * sj; P.rot = -.05 * sj; } }
    if (st === 'cast') { var q2 = Math.sin(clamp(k / .6, 0, 1) * Math.PI); P.pose = 'ult'; P.lift = .035 * q2; P.dx = q2 * 14 * S; }
    if (st === 'dash') { P.gh = 3; P.pose = 'charge'; P.dx = 60 * S; P.sx = 1.04; P.skew = 0; }
    if (st === 'ko') { if (F.over) k += G.endT; e = clamp(k / .34, 0, 1);
      if (k < .36) { P.pose = 'fly'; P.dx = -e * 54 * S; P.dy = -Math.sin(e * 3.14) * 28 * S; P.rot = -.15 * (1 - e); P.skew = 0; }
      else { P.pose = 'ko'; P.dx = -54 * S; P.dy = 0; P.sy = 1; P.skew = 0; P.sx = 1; P.alpha = 1 - clamp((k - 1.8) / 1.2, 0, 1) * .45; } }
    return P;
  }
  // 牛魔王：每一招 4–6 个视觉阶段（缺帧时自动退回原来的单张姿势）
  function bp(name, fb) { return M('niumo', name, fb); }
  function bossPose(b) {
    var P = bossPose0(b), S = G.S, o = VP.boss, g = gait('boss', S);
    if (o) P.fs = o.fs;
    if (g && (b.st === 'idle' || b.st === 'recover') && b.hp > 0) { P.dy -= g.bob * 1.25; P.rot += g.lean * .8; P.skew = 0; P.fd = .09; }
    if (b.hp > 0) P.skew += lagSkew('boss') * .7;
    P.air = Math.max(0, -(P.dy) - (b.st === 'tele' ? 0 : 0)); if (b.st !== 'charge' && b.st !== 'shot' && b.st !== 'final' && b.st !== 'spin') P.air = 0;
    if (G._niumoHit0 != null && b.hp > 0 && (VT() - G._niumoHit0) < 0.42 && (b.st === 'idle' || b.st === 'recover')) P.pose = 'hit';
    if (G.bossPoseLock) { P.pose = G.bossPoseLock; P.fs = -1; P.dy = 0; P.dx = 0; P.rot = 0; P.skew = 0; P.sx = 1; P.sy = 1; }
    return P;
  }
  function bossPose0(b) {
    var t = G.t, S = G.S, k = b.stT, d = b.face || -1, P = { sx: 1, sy: 1, dx: 0, dy: 0, rot: 0, alpha: 1, flash: G.bossHit > 0 ? G.bossHit * (G.bossBig > 0 ? 1 : .4) : 0, flip: b.face > 0, pose: 'stance', skew: 0, lift: 0, key: 'boss', gh: 0 }, v = idleV(.55);
    P.sy = 1 + .017 * v; P.skew = .016 * v; if (b.st === 'idle') P.pose = idleBoss(.3);
    if (b.st !== 'recover') G.bLast = b.st;
    if (G.bossHit > 0) P.dx = -d * 5 * S * (G.bossHit / .14);
    var ph2 = b.phase === 2;
    switch (b.st) {
      case 'melee': // 锤击 / 连砸：蓄力 wind_a→wind_b→举锤(slam_up) → 横扫 swing_a→swing_b→swing(命中 .38s) →（二阶段）smash_a→smash(命中 .62s)→ rec_a → 站定
        if (k < .30) { var w0 = k / .30; P.pose = k < .08 ? bp('wind_a', 'slam_up') : (k < .18 ? bp('wind_b', 'slam_up') : 'slam_up'); P.rot = -d * .08 * w0; P.dx = -d * 18 * S * w0; P.sy = 1.02; }
        else if (k < .38) { P.pose = k < .34 ? bp('swing_a', 'swing') : bp('swing_b', 'swing'); P.rot = -d * .02; }
        else if (!ph2 || k < .62) { var u1 = Math.sin(clamp((k - .38) / .24, 0, 1) * Math.PI); P.pose = k < .50 ? 'swing' : bp('smash_a', 'smash'); P.rot = d * .06 * u1; P.dx = d * 90 * S * u1; P.sx = 1 + .04 * u1; P.gh = 2; }
        else { var u2 = Math.sin(clamp((k - .62) / .33, 0, 1) * Math.PI); P.pose = k < .80 ? 'smash' : bp('rec_a', 'smash'); P.rot = d * .07 * u2; P.dx = d * 70 * S * u2; P.sx = 1 + .03 * u2; P.gh = k < .80 ? 3 : 0; }
        break;
      case 'tele': P.sy = .96 + .01 * Math.sin(t * 40); P.sx = 1.02; P.dy = 5 * S; P.dx = (rnd() - .5) * 3 * S; if (b.tele && b.tele.len && b.tele.t < .3) P.pose = bp('rush_a', 'stance'); break;
      case 'charge': P.pose = 'rush'; P.rot = d * .06; P.sx = 1.03; P.dy = -4 * S; P.gh = 4; break;
      case 'shot': // 锤击地震：蓄力 → 高举 → slam_mid → 砸地(命中 .55s) → slam_rec
        if (k < .45) { var q = clamp(k / .45, 0, 1); P.pose = k < .12 ? bp('wind_a', 'slam_up') : (k < .25 ? bp('wind_b', 'slam_up') : 'slam_up'); P.rot = -d * .06 * q; P.dx = -d * 12 * S * q; P.dy = -q * 8 * S; }
        else if (k < .55) { P.pose = bp('slam_mid', 'slam'); P.rot = d * .02; P.dx = d * 10 * S; P.dy = -4 * S; P.gh = 2; }
        else if (k < .75) { P.pose = 'slam'; P.rot = d * .05; P.dx = d * 26 * S; }
        else { P.pose = bp('slam_rec', 'slam'); P.rot = d * .03; P.dx = d * 16 * S; }
        break;
      case 'spin': P.pose = k < .14 ? bp('wind_b', 'spin') : 'spin'; P.rot = Math.sin(t * 16) * .05; P.sx = 1.03 + .02 * Math.sin(t * 12); P.dx = Math.sin(t * 9) * 12 * S; P.dy = -.006 * G.H; P.gh = k > .14 ? 3 : 0; break;
      case 'recover': { var lb = G.bLast; if (lb === 'charge' && k < .12) { P.pose = bp('rush_a', 'stance'); P.dx = d * 10 * S; } else if (lb === 'spin' && k < .12) P.pose = bp('rec_a', 'stance'); else if (lb === 'melee' && k < .08) P.pose = bp('rec_a', 'stance'); else P.pose = idleBoss(.3); } break;
      case 'roar': var r = Math.sin(clamp(k / 1, 0, 1) * Math.PI); P.pose = (k < .16 || k > .86) ? bp('roar_a', 'roar') : 'roar'; P.sx = 1 + r * .03; P.sy = 1 + r * .03; break;
      case 'stag': P.pose = 'hit'; P.rot = -d * .06; P.dx = Math.sin(t * 50) * 3 * S; break;
      case 'final': if (k < 1.75) { P.pose = k < .15 ? bp('wind_a', 'slam_up') : (k < .3 ? bp('wind_b', 'slam_up') : 'slam_up'); P.sx = 1.04 + .02 * Math.sin(t * 30); P.sy = 1.04; P.dy = -.014 * G.H; P.dx = Math.sin(t * 45) * 3 * S; } else { P.pose = k < 1.85 ? bp('slam_mid', 'slam') : 'slam'; P.dx = d * 20 * S; P.gh = 2; } break;
    }
    if (G.bossBig > 0 && b.st !== 'stag' && b.hp > 0) { P.pose = (.24 - G.bossBig) < .05 ? bp('hit_a', 'hit') : 'hit'; P.dx = -d * 16 * S * (G.bossBig / .24); P.gh = 0; }
    if (b.hp <= 0) { var f = clamp(G.endT / .4, 0, 1); P.gh = 0; if (G.endT < .4) { P.pose = G.endT < .06 ? bp('hit_a', 'hit') : 'hit'; P.dx = -d * 30 * S * f; } else { P.pose = G.endT < .58 ? bp('ko_a', 'ko') : 'ko'; P.dx = -d * 30 * S; P.sy = 1; P.skew = 0; } P.alpha = 1 - clamp((G.endT - 1.9) / 1.4, 0, 1) * .5; }
    return P;
  }

  /* ---------- 画：场景 ---------- */
  function coverPlate(c, im, W, H, ox, oy, alpha) {
    if (!im || !im.naturalWidth) return;
    var sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    var w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    c.save();
    c.globalAlpha = alpha;
    c.drawImage(im, (W - w) / 2 + ox, oy, w, h);
    c.restore();
  }
  function drawBG(c, W, H, camx) {
    /* 首页淡墨远山整幅铺满，再做一次纵向邻行混合，避免缩放后出现亮度硬缝。 */
    var key = W + 'x' + H;
    if (G._bgKey !== key) {
      var cv = document.createElement('canvas');
      cv.width = Math.max(2, W); cv.height = Math.max(2, H);
      var g = cv.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#f3eee4';
      g.fillRect(0, 0, W, H);
      var far = BG.far;
      if (far && far.naturalWidth) {
        var sc = Math.max(W / far.naturalWidth, H / far.naturalHeight) * 1.04;
        var w = far.naturalWidth * sc, h = far.naturalHeight * sc;
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(far, (W - w) / 2, (H - h) / 2, w, h);
      }
      var img = g.getImageData(0, 0, W, H), d = img.data, src = new Uint8ClampedArray(d), y, x, i, up, dn, k;
      for (y = 1; y < H - 1; y++) {
        for (x = 0; x < W; x++) {
          i = (y * W + x) * 4; up = i - W * 4; dn = i + W * 4;
          for (k = 0; k < 3; k++) d[i + k] = (src[up + k] + src[i + k] * 2 + src[dn + k]) >> 2;
        }
      }
      g.putImageData(img, 0, 0);
      G._bgKey = key; G._bgCanvas = cv;
    }
    c.drawImage(G._bgCanvas, 0, 0);
  }
  function bgSeam() {
    var W = G.W, H = G.H, cv = document.createElement('canvas');
    cv.width = Math.max(2, W); cv.height = Math.max(2, H);
    var g = cv.getContext('2d', { willReadFrequently: true });
    drawBG(g, W, H, 0);
    var data = g.getImageData(0, 0, W, H).data, rows = [], y, x, i, s, n, max = 0, at = 0, d;
    for (y = 0; y < H; y++) {
      s = 0; n = 0;
      for (x = 0; x < W; x += 2) {
        i = (y * W + x) * 4;
        s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        n++;
      }
      rows.push(s / Math.max(1, n));
    }
    for (y = 1; y < rows.length; y++) {
      d = Math.abs(rows[y] - rows[y - 1]);
      if (d > max) { max = d; at = y; }
    }
    return { max: Math.round(max * 1000) / 1000, at: at, pass: max <= 3, h: H };
  }
  function drawTele(c) {
    var F = G.F, b = F.boss, S = G.S, gy = G.gy;
    if (b.tele && b.st === 'tele') { var T = b.tele, a = 0.5 + 0.18 * Math.sin(G.t * 22), x0 = sx(T.x), x1 = sx(T.x + T.dir * T.len), y = gy + G.H * .05, hh = G.H * .09;
      c.save(); c.globalAlpha = Math.min(.85, a + .2 * (1 - T.t / T.max)); c.fillStyle = '#d23a1c'; c.beginPath(); c.moveTo(x0, y - hh / 2); c.lineTo(x1, y - hh / 2); c.lineTo(x1 + T.dir * 24 * S, y); c.lineTo(x1, y + hh / 2); c.lineTo(x0, y + hh / 2); c.closePath(); c.fill();
      c.globalAlpha = .8; c.strokeStyle = '#fffaf0'; c.lineWidth = 3 * S; for (var i = 0; i < 6; i++) { var xx = x0 + (x1 - x0) * (i + .5) / 6; c.beginPath(); c.moveTo(xx - T.dir * 8 * S, y - hh * .3); c.lineTo(xx + T.dir * 8 * S, y); c.lineTo(xx - T.dir * 8 * S, y + hh * .3); c.stroke(); } c.restore(); }
    if (b.tele && b.st === 'final') { var T2 = b.tele, rx = G.W * .72 * T2.r / 1000, p2 = 1 - T2.t / T2.max; c.save(); c.translate(sx(T2.x), gy + G.H * .012);
      c.globalAlpha = .12 + .16 * p2; c.fillStyle = 'rgba(47,32,24,.9)'; c.beginPath(); c.ellipse(0, 0, rx, G.H * .09, 0, 0, 7); c.fill();
      c.globalAlpha = .85; c.strokeStyle = 'rgba(36,28,22,.9)'; c.lineWidth = 4 * S; c.setLineDash([10 * S, 7 * S]); c.beginPath(); c.ellipse(0, 0, rx, G.H * .09, 0, 0, 7); c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(36,28,22,.45)'; c.lineWidth = 1.6 * S; c.beginPath(); c.ellipse(0, 0, rx * (1 - p2 * .95), G.H * .09 * (1 - p2 * .95), 0, 0, 7); c.stroke(); c.restore(); }
    // 火焰波
    b.waves.forEach(function (w) { if (w.t < 0) return; var x = sx(w.x), y = gy + G.H * .01, r = G.H * .06; c.save(); c.fillStyle = 'rgba(47,32,24,.28)'; c.beginPath(); c.ellipse(x, y - r * .35, r * 1.15, r * .7, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(36,28,22,.8)'; c.lineWidth = 2.2 * S; c.setLineDash([7 * S, 5 * S]); c.beginPath(); c.ellipse(x, y - r * .2, r * 1.35, r * .55, 0, 0, 7); c.stroke(); c.setLineDash([]); c.restore(); });
  }
  function drawMinions(c) {
    var F = G.F; if (!MINK || !MINK_META) return; F.boss.minions.forEach(function (m) { var fr = MINK_META.fr[2 + (Math.floor(G.t * 10) % 4)], hh = G.H * .24, k = hh / fr[3], x = sx(m.x), y = G.gy + G.H * .02;
      c.save(); c.translate(x, y); c.scale(m.face > 0 ? -k : k, k); c.globalAlpha = m.done ? Math.max(0, 1 - m.t / .6) : 1; c.drawImage(MINK, fr[0], fr[1], fr[2], fr[3], -fr[4], -fr[5], fr[2], fr[3]); c.restore(); });
    F.undead.forEach(function (u, i) { var x = sx(F.boss.x) + (i - 1) * 70 * G.S + 90 * G.S, y = G.gy - 20 * G.S - Math.sin(G.t * 4 + i) * 10 * G.S; c.save(); c.globalAlpha = .7; c.fillStyle = 'rgba(36,28,22,.55)'; c.beginPath(); c.ellipse(x, y, 16 * G.S, 22 * G.S, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(24,18,14,.8)'; c.lineWidth = 1.4 * G.S; c.setLineDash([4 * G.S, 3 * G.S]); c.stroke(); c.setLineDash([]); c.restore(); });
  }
  function drawFx(c, ground) {
    var S = G.S;
    G.fx.forEach(function (f) {
      if ((f.k === 'stain') !== !!ground) return;
      var u = f.age / f.max; c.save();
      if (f.k === 'stain') { var rs = mul(f.seed), R0 = f.sz * (.7 + .3 * ease(u * 3)); c.globalAlpha = f.a * (u < .12 ? u / .12 : 1 - (u - .12) / .88); c.fillStyle = '#4a3a22'; for (var si = 0; si < 4; si++) { c.beginPath(); c.ellipse(f.x + (rs() - .5) * R0 * .7, f.y + (rs() - .5) * R0 * .08, R0 * (.35 + rs() * .3), R0 * (.05 + rs() * .03), 0, 0, 7); c.fill(); } }
      if (f.k === 'dust') { f.x += f.vx / 60; f.y += f.vy / 60; var rr0 = f.r * (.7 + u * 1.3), gd = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr0); gd.addColorStop(0, 'rgba(' + f.col + ',' + (.38 * (1 - u)) + ')'); gd.addColorStop(1, 'rgba(' + f.col + ',0)'); c.fillStyle = gd; c.beginPath(); c.arc(f.x, f.y, rr0, 0, 7); c.fill(); }
      else if (f.k === 'ink') { c.globalAlpha = (f.a || .85) * (1 - u * u); c.fillStyle = f.col; var R = f.sz * (.35 + ease(u * 2) * .65), rr = mul(f.seed); for (var i = 0; i < f.n; i++) { var a = i / f.n * 6.283 + rr() * .4, L = R * (.5 + rr() * .7), w = R * (.05 + rr() * .1); c.beginPath(); c.moveTo(f.x + Math.cos(a) * R * .15, f.y + Math.sin(a) * R * .15); c.lineTo(f.x + Math.cos(a - .09) * L, f.y + Math.sin(a - .09) * L); c.lineTo(f.x + Math.cos(a + .09) * L, f.y + Math.sin(a + .09) * L); c.closePath(); c.fill(); c.beginPath(); c.arc(f.x + Math.cos(a) * L * 1.08, f.y + Math.sin(a) * L * 1.08, w * .6, 0, 7); c.fill(); }
        c.globalAlpha = (1 - u) * .8; c.beginPath(); c.arc(f.x, f.y, R * .22 * (1 - u * .5), 0, 7); c.fill(); }
      else if (f.k === 'ring') { c.globalAlpha = (1 - u) * .85; c.strokeStyle = 'rgba(36,28,22,.9)'; c.lineWidth = f.lw * (1 - u * .55); c.setLineDash([8 * S, 6 * S]); c.beginPath(); c.ellipse(f.x, f.y, f.sz * ease(u * 1.6), f.sz * ease(u * 1.6) * .55, 0, 0, 7); c.stroke(); c.setLineDash([]); }
      else if (f.k === 'txt') { var y = f.y - ease(u) * 46 * S; c.globalAlpha = u < .75 ? 1 : (1 - u) * 4; c.font = '700 ' + f.size + 'px ' + KAI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = f.size * .2; c.strokeStyle = f.out; c.strokeText(f.s, f.x, y); c.fillStyle = f.col; c.fillText(f.s, f.x, y); }
      else if (f.k === 'slash') { c.globalAlpha = 1 - u; c.translate(f.x, f.y); c.rotate(f.ang); var L = f.len * ease(u * 2.4); c.fillStyle = f.col; c.beginPath(); c.moveTo(-L / 2, 0); c.quadraticCurveTo(0, -f.w * (1 - u), L / 2, 0); c.quadraticCurveTo(0, f.w * .25 * (1 - u), -L / 2, 0); c.fill(); }
      else if (f.k === 'shot') { var x = f.x0 + (f.x1 - f.x0) * u, y2 = f.y0 + (f.y1 - f.y0) * u; c.globalAlpha = .85; c.strokeStyle = 'rgba(36,28,22,.75)'; c.lineWidth = 3.2 * S; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - (f.x1 - f.x0) * .12, y2 - (f.y1 - f.y0) * .12); c.lineTo(x, y2); c.stroke(); c.fillStyle = 'rgba(28,22,16,.88)'; c.beginPath(); c.arc(x, y2, 5.2 * S, 0, 7); c.fill(); c.strokeStyle = 'rgba(24,18,14,.7)'; c.lineWidth = 1.2 * S; c.setLineDash([3 * S, 2 * S]); c.stroke(); c.setLineDash([]); }
      c.restore();
    });
  }
  function mul(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- 画：HUD ---------- */
  function para(c, x, y, w, h, sk) { c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + w + sk, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
  function colorAvURL(id) {
    if (id === 'wukong') return '../assets/art/menu-v5/fig_wukong.webp';
    if (id === 'niumo') return '../assets/art/battle-hd/niumo.webp';
    return '../assets/art/x-avatars/' + id + '.webp';
  }
  function faceNode(im) {
    if (!im || !(im.naturalWidth || im.width)) return im;
    if (im._face) return im._face;
    if (im.naturalWidth === 384 && im.naturalHeight === 378) return im;
    return im;
  }
  function loadColorAv(id) {
    return loadImg(colorAvURL(id)).then(function (i) {
      if (!i.naturalWidth) return loadImg('assets/xav/' + id + '.webp').then(function (j) { AV[id] = j; });
      AV[id] = i;
    });
  }
  function blitFace(c, im, cx, cy, r) {
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) return;
    var side = r * 2, sc = Math.max(side / iw, side / ih);
    var dw = iw * sc, dh = ih * sc;
    c.drawImage(im, cx - dw / 2, cy - Math.min(dh * 0.42, dh - side), dw, dh);
  }
  function head(c, id, cx, cy, r, ring) {
    var im = faceNode(AV[id]); if (!im || !(im.naturalWidth || im.width)) return;
    if (id !== 'wukong' && id !== 'niumo' && window.XY && XY.xAvIcon) {
      var side = r * 2.25;
      XY.xAvIcon.featherImage(c, im, cx - side / 2, cy - side / 2, side, side);
      return;
    }
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.fillStyle = '#f6ecd0'; c.fillRect(cx - r, cy - r, r * 2, r * 2); blitFace(c, im, cx, cy, r); c.restore();
    c.lineWidth = r * .16; c.strokeStyle = '#2f2a1f'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
  }
  function bar(c, x, y, w, h, sk, frac, chip, colA, colB, dir) {
    // dir=1：左侧血条，满格靠外侧，往外掉；-1 反之
    c.save(); para(c, x, y, w, h, sk); c.fillStyle = '#efe3c0'; c.fill(); c.clip();
    var fw = w * clamp(frac, 0, 1), cw = w * clamp(chip, 0, 1);
    function seg(wid, col1) {
      var xx = dir > 0 ? x + w - wid : x, i, yy;
      c.fillStyle = col1; c.fillRect(xx - 2, y, wid + sk + 6, h);
      c.strokeStyle = 'rgba(236,228,210,.34)'; c.lineWidth = Math.max(1, h * .07); c.lineCap = 'round';
      for (i = 0; i < 3; i++) { yy = y + h * (.26 + i * .22); c.beginPath(); c.moveTo(xx + 3, yy); c.quadraticCurveTo(xx + wid * .5, yy + (i % 2 ? h * .16 : -h * .1), xx + Math.max(6, wid) - 3, yy); c.stroke(); }
    }
    seg(cw, '#c4b48a'); seg(fw, colA);
    c.restore(); c.save(); para(c, x, y, w, h, sk); c.lineJoin = 'round'; c.lineWidth = 3.2; c.strokeStyle = '#2f2a1f'; c.stroke(); c.lineWidth = 1.2; c.strokeStyle = '#e6c474'; para(c, x + 2.2, y + 2.2, w - 4.4, h - 4.4, sk); c.stroke(); c.restore();
  }
  function pips(c, x, y, n, w, h, gap, sk, frac, dir, colA, colB) {
    for (var i = 0; i < n; i++) { var xx = dir > 0 ? x + (n - 1 - i) * (w + gap) : x + i * (w + gap), f = clamp(frac * n - i, 0, 1);
      c.save(); para(c, xx, y, w, h, sk); c.fillStyle = '#e4d6b0'; c.fill(); c.clip(); if (f > 0) { var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, colA); g.addColorStop(1, colB); c.fillStyle = g; c.fillRect(xx - 2, y, (w + sk + 4) * f, h); } c.restore();
      c.save(); para(c, xx, y, w, h, sk); c.lineWidth = 1.8; c.strokeStyle = '#2f2a1f'; c.stroke(); c.restore(); }
  }
  function label(c, s, x, y, size, col, align, out) { c.save(); c.font = '700 ' + size + 'px ' + KAI; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size * .2; c.strokeStyle = out || '#fffaf0'; c.strokeText(s, x, y); c.fillStyle = col || '#2f2a1f'; c.fillText(s, x, y); c.restore(); }

  function drawHUD(c) {
    var F = G.F, S = G.S, W = G.W, H = G.H, wu = F.heroes[0], pa = F.heroes[1], b = F.boss, land = G.land;
    var top = 8 * S, bh = 24 * S, sk = 14 * S, cx = W / 2, gapC = (land ? 44 : 38) * S, bx0 = (land ? 74 : 52) * S;
    var lw = cx - gapC - bx0 - sk, lx = bx0, rx = cx + gapC, rw = W - bx0 - rx - sk;
    G.hp = G.hp || {}; function chip(key, v) { var o = G.hp[key]; if (o == null || G.t < .05) o = v; o = o > v ? Math.max(v, o - .35 * (1 / 60)) : v; G.hp[key] = o; return o; }
    var wf = wu.hp / wu.maxHp, bf = b.hp / b.maxHp;
    // 头像底座（斜切金边）
    bar(c, lx, top, lw, bh, sk, wf, chip('w', wf), '#5c3a32', '#2a1814', 1);
    bar(c, rx, top, rw, bh, sk, bf, chip('b', bf), '#3a342c', '#16130f', -1);
    // 牛魔王阶段刻度
    c.save(); c.strokeStyle = '#e6c474'; c.lineWidth = 2.2 * S; [.5, .25].forEach(function (p) { var x = rx + (1 - p) * 0 + p * rw * 0 + (p * rw); c.beginPath(); c.moveTo(rx + p * rw + sk - 1 * S, top + 3 * S); c.lineTo(rx + p * rw - 1 * S, top + bh - 3 * S); c.stroke(); }); c.restore();
    // 搭档血条（细）
    if (pa) { var py = top + bh + 5 * S, ph = 10 * S, pf = pa.hp / pa.maxHp, pw = lw * .74; if (!pa.alive) pf = 0; bar(c, lx + lw - pw, py, pw, ph, sk * .5, pf, chip('p', pf), pa.alive ? '#4a4034' : '#a39a86', pa.alive ? '#2a241c' : '#8a8270', 1); }
    // 能量格
    var pyl = top + bh + (pa ? 19 : 5) * S, pw0 = (land ? 17 : 11) * S;
    pips(c, lx + lw - 8 * (pw0 + 3 * S) + 3 * S + (pa ? 0 : 0), pyl, 8, pw0, 6 * S, 3 * S, 6 * S, 1 - clamp(wu.ult.t / wu.ult.cd, 0, 1), 1, '#5a5044', '#2a241c');
    pips(c, rx + 2 * S, top + bh + 5 * S, 8, pw0, 6 * S, 3 * S, 6 * S, 1 - clamp(b.bt / (b.phase === 2 ? 3.2 : 4.6), 0, 1), -1, '#4a4036', '#1c1814');
    // 头像与名字
    head(c, 'wukong', 34 * S + (land ? 6 * S : 0), top + 24 * S, (land ? 27 : 24) * S, '#5c4030');
    head(c, 'niumo', W - 34 * S - (land ? 6 * S : 0), top + 24 * S, (land ? 27 : 24) * S, '#3a342c');
    var ny = top + bh / 2 + 1 * S;
    var namePx = Math.max(G.H < 420 ? 16 : 14, 15 * S);
    label(c, '孙悟空', lx + 14 * S, ny, namePx, '#2f2a1f'); label(c, 'Lv' + wu.lv, lx + 14 * S + namePx * 3.6, ny + 1 * S, Math.max(11, 11 * S), '#6d6455');
    label(c, '牛魔王', rx + rw + sk - 18 * S, ny, namePx, '#2f2a1f', 'right'); label(c, b.phase === 2 ? '狂暴' : '一阶段', rx + rw + sk - 18 * S - namePx * 3.8, ny + 1 * S, Math.max(11, 11 * S), b.phase === 2 ? '#c8341f' : '#6d6455', 'right');
    if (pa) {
      var py2 = top + bh + 5 * S + 5 * S;
      head(c, pa.id, lx + 12 * S, py2, 11 * S, pa.alive ? '#5c4030' : '#a39a86');
      c.save();
      c.globalAlpha = pa.alive ? 1 : 0.45;
      c.font = (16 * S) + 'px "Ma Shan Zheng","KaiTi",serif';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.lineWidth = Math.max(2, 3 * S * 0.4); c.lineJoin = 'round';
      c.strokeStyle = '#fffaf0';
      c.strokeText(pa.name, lx + 26 * S, py2);
      c.fillStyle = '#1a120c';
      c.fillText(pa.name, lx + 26 * S, py2);
      c.restore();
    }
    // 计时器
    var tr = (land ? 29 : 26) * S, ty = top + 26 * S; c.save(); c.beginPath(); c.arc(cx, ty, tr, 0, 7); var g = c.createRadialGradient(cx, ty - tr * .3, 2, cx, ty, tr); g.addColorStop(0, '#fffdf4'); g.addColorStop(1, '#f1e2b4'); c.fillStyle = g; c.fill(); c.lineWidth = 3.4 * S; c.strokeStyle = '#2f2a1f'; c.stroke(); c.lineWidth = 1.6 * S; c.strokeStyle = '#d4a53d'; c.beginPath(); c.arc(cx, ty, tr - 3.6 * S, 0, 7); c.stroke(); c.restore();
    label(c, String(Math.ceil(F.timer)), cx, ty + 1 * S, tr * 1.25, F.timer < 15 ? '#c8341f' : '#2f2a1f', 'center', '#fffaf0');
    // 底部：援军槽（左，可点）+ 怒气槽（右）
    var gy0 = H - 8 * S - 44 * S, uh = 44 * S, used = F.sumUsed, rdy = !used && wu.alive && !F.over && !F.sm;
    label(c, used ? '0' : '1', 24 * S, gy0 + uh * .5, 50 * S, used ? '#9a927c' : '#c8341f', 'center');
    var gx = 46 * S, gw = (land ? 190 : 150) * S;
    c.save(); para(c, gx, gy0 + 4 * S, gw, uh - 8 * S, 12 * S); var gg = c.createLinearGradient(0, gy0, 0, gy0 + uh); if (rdy) { gg.addColorStop(0, '#fff2bd'); gg.addColorStop(1, '#e6bf62'); } else { gg.addColorStop(0, '#e9e1cc'); gg.addColorStop(1, '#cfc5aa'); } c.fillStyle = gg; c.fill();
    if (rdy) { c.globalAlpha = .35 + .3 * Math.sin(G.t * 5 + (G._pn = (G._pn || 0) + .02)); c.fillStyle = '#fffdf0'; c.fill(); c.globalAlpha = 1; }
    c.lineWidth = 3 * S; c.strokeStyle = '#2f2a1f'; c.stroke(); c.lineWidth = 1.4 * S; c.strokeStyle = rdy ? '#c8341f' : '#9a927c'; para(c, gx + 2.5 * S, gy0 + 6.5 * S, gw - 5 * S, uh - 13 * S, 12 * S); c.stroke(); c.restore();
    label(c, used ? '援军已离场' : '召唤援军 · 随机', gx + gw / 2 + 8 * S, gy0 + uh * .5, (land ? 21 : 18) * S, used ? '#8c8470' : '#2f2a1f', 'center');
    G.sumRect = { x: 0, y: gy0 - 6 * S, w: gx + gw + 24 * S, h: uh + 14 * S };
    // 右下：怒气槽（牛魔王血量降到 25% 触发“绝命”）
    var rage = clamp((0.75 - (b.hp / b.maxHp - 0.25)) / 0.75, 0, 1), rgw = (land ? 190 : 120) * S, rgx = W - 46 * S - rgw - 14 * S;
    c.save(); para(c, rgx, gy0 + 8 * S, rgw, uh - 16 * S, 12 * S); c.fillStyle = '#e4d8c0'; c.fill(); c.clip(); c.fillStyle = '#5c3a32'; c.fillRect(rgx, gy0, (rgw + 14 * S) * rage, uh); c.restore();
    c.save(); para(c, rgx, gy0 + 8 * S, rgw, uh - 16 * S, 12 * S); c.lineWidth = 3 * S; c.strokeStyle = '#2f2a1f'; c.stroke(); c.restore();
    label(c, '怒', rgx + 22 * S, gy0 + uh * .5, 15 * S, '#2f2a1f', 'center'); label(c, b.finalDone ? '1' : '0', W - 24 * S, gy0 + uh * .5, 50 * S, b.finalDone ? '#c8341f' : '#6d6455', 'center');
  }
  function drawCalls(c) { if (G.F && G.F.over && G.F.over.win) return;
    var S = G.S, W = G.W, H = G.H;
    G.calls.forEach(function (k, i) {
      var u = k.age / k.max, slide = ease(u * 6), out = u > .8 ? (u - .8) / .2 : 0, y = (G.land ? H * .245 : H * .2) + i * 58 * S, hh = (k.big ? 56 : 46) * S;
      c.save(); c.globalAlpha = (1 - out) * slide; var PW = W * (G.land ? .4 : .62), x0 = 6 * S - (1 - slide) * 4 * S;
      c.translate(x0, y); var g = c.createLinearGradient(0, 0, PW, 0); g.addColorStop(0, 'rgba(255,248,224,.72)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; para(c, 0, -hh / 2, PW, hh, 18 * S); c.fill();
      c.strokeStyle = '#d4a53d'; c.lineWidth = 3 * S; c.beginPath(); c.moveTo(18 * S + 8 * S, -hh / 2); c.lineTo(PW * .8, -hh / 2); c.moveTo(8 * S, hh / 2); c.lineTo(PW * .8, hh / 2); c.stroke();
      c.strokeStyle = '#2f2a1f'; c.lineWidth = 2 * S; c.beginPath(); c.moveTo(18 * S + 8 * S, -hh / 2 - 3 * S); c.lineTo(PW * .8, -hh / 2 - 3 * S); c.stroke();
      var size = (k.big ? 50 : 38) * S; c.font = '700 ' + size + 'px ' + KAI; c.textBaseline = 'middle'; c.textAlign = 'left'; c.lineJoin = 'round'; c.lineWidth = size * .14; c.strokeStyle = '#fffaf0'; c.strokeText(k.s, 52 * S, 2 * S); c.fillStyle = k.col; c.fillText(k.s, 52 * S, 2 * S);
      // 红印
      c.fillStyle = '#c8341f'; c.fillRect(12 * S, -12 * S, 24 * S, 24 * S); c.fillStyle = '#fff6e4'; c.font = '700 ' + 18 * S + 'px ' + KAI; c.textAlign = 'center'; c.fillText('战', 24 * S, 1 * S); c.restore();
    });
  }
  /* ---------- 召唤：随机转盘切入（<1 秒）+ 站场放必杀 ---------- */
  function avDisk(c, id, cx, cy, r, ring, a) {
    var im = faceNode(AV[id]); c.save(); c.globalAlpha = a == null ? 1 : a; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.fillStyle = '#f6ecd0'; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (im && (im.naturalWidth || im.width)) blitFace(c, im, cx, cy, r); c.restore();
    c.save(); c.globalAlpha = a == null ? 1 : a; c.lineWidth = Math.max(2, r * .12); c.strokeStyle = '#2f2a1f'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.lineWidth = Math.max(1.5, r * .07); c.strokeStyle = ring || '#e6c474'; c.beginPath(); c.arc(cx, cy, r - r * .03, 0, 7); c.stroke(); c.restore();
  }
  var ROUL = .42;   // 转盘转动时长；其后 0.48s 大立绘 + 名字 + 必杀名（切入合计 BF.SM.CUT = 0.9s）
  function drawSummon(c) {
    var F = G.F, s = F.sm; if (!s) return; var S = G.S, W = G.W, H = G.H, t = s.t, d = s.d, col = ELC[d.elem] || d.color, id = s.id;
    var cutT = BF.SM.CUT, fh = G.fh, bv = bossVis(), pool = s.pool || BF.ORDER;
    if (t < cutT) {
      var u = t / cutT, inn = ease(u * 4), outA = u > .86 ? 1 - (u - .86) / .14 : 1;
      c.save(); c.globalAlpha = .74 * Math.min(1, t / .1) * outA; c.fillStyle = '#f8f1df'; c.fillRect(0, 0, W, H); c.restore();
      // 斜切水墨带
      c.save(); c.beginPath(); c.moveTo(-40 * S, H * .24); c.lineTo(W + 40 * S, H * .12); c.lineTo(W + 40 * S, H * .72); c.lineTo(-40 * S, H * .86); c.closePath();
      var g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, t < ROUL ? '#c9b98a' : col); g.addColorStop(.55, 'rgba(255,246,216,.95)'); g.addColorStop(1, 'rgba(255,246,216,.95)'); c.globalAlpha = .92 * outA * inn; c.fillStyle = g; c.fill(); c.lineWidth = 5 * S; c.strokeStyle = '#2f2a1f'; c.stroke(); c.lineWidth = 2 * S; c.strokeStyle = '#e6c474'; c.stroke(); c.restore();
      if (t < ROUL) {
        // 转盘：九位头像横向滚动并减速，最后停在抽中的人
        var n = pool.length, L = Math.max(0, pool.indexOf(id)), e = ease(t / ROUL), pos = L - (1 - e) * (n * 1.6), cy = H * (G.land ? .47 : .42), sp = W * (G.land ? .17 : .27), R0 = H * (G.land ? .17 : .12);
        c.save(); c.globalAlpha = outA; label(c, '援军抽选', W / 2, H * (G.land ? .185 : .2), (G.land ? 30 : 26) * S, '#2f2a1f', 'center');
        for (var j = -3; j <= 3; j++) { var idx = Math.round(pos) + j, dd = idx - pos, pi = ((idx % n) + n) % n, rr = R0 * (1 - .3 * Math.min(1, Math.abs(dd) / 2.4)), aa = 1 - .3 * Math.min(2.6, Math.abs(dd));
          if (aa > 0.02) avDisk(c, pool[pi], W / 2 + dd * sp, cy, rr, Math.abs(dd) < .5 ? '#c8341f' : ELC[BF.SP[pool[pi]].elem], aa); }
        c.lineWidth = 4 * S; c.strokeStyle = '#c8341f'; c.beginPath(); c.arc(W / 2, cy, R0 * 1.14, 0, 7); c.stroke();
        c.fillStyle = '#c8341f'; c.beginPath(); c.moveTo(W / 2 - 9 * S, cy - R0 * 1.3); c.lineTo(W / 2 + 9 * S, cy - R0 * 1.3); c.lineTo(W / 2, cy - R0 * 1.14); c.closePath(); c.fill();
        c.restore(); return;
      }
      var u3 = (t - ROUL) / (cutT - ROUL), in3 = ease(u3 * 3);
      // 速度线
      c.save(); c.globalAlpha = .5 * outA; c.strokeStyle = '#2f2a1f'; for (var i = 0; i < 22; i++) { var yy = H * (.18 + .66 * ((i * 37) % 22) / 22), x1 = W * (.1 + ((i * 53) % 40) / 80), Ln = W * (.15 + ((i * 29) % 30) / 100); c.lineWidth = (1 + (i % 3)) * S; c.beginPath(); c.moveTo(x1 + (1 - in3) * 300 * S, yy); c.lineTo(x1 + Ln + (1 - in3) * 300 * S, yy - 8 * S); c.stroke(); } c.restore();
      var big = Math.min(H * (G.land ? 1.0 : .62), W * 1.3), fx0 = -W * .45 + (W * (G.land ? .3 : .5) + W * .45) * in3 + Math.sin(t * 30) * (u3 > .3 ? 2 : 0) * S;
      c.save(); c.globalAlpha = outA; drawSpr(c, id, 'ult', fx0, H * (G.land ? .97 : .7), 0, { fitH: big * (G.land ? .9 : .8), noShadow: 1 }); c.restore();
      c.save(); c.globalAlpha = outA * ease(u3 * 4); avDisk(c, id, G.land ? W * .52 : W * .2, G.land ? H * .22 : H * .1, (G.land ? .085 : .06) * H, '#c8341f'); var tx = G.land ? W * .68 : W * .5, ty = G.land ? H * .38 : H * .22;
      label(c, '援军', tx, ty - (G.land ? 8 : 0) * S, (G.land ? 60 : 44) * S, '#c8341f', 'center'); label(c, NAMES[id], tx, ty + (G.land ? 54 : 42) * S, (G.land ? 38 : 30) * S, '#2f2a1f', 'center');
      var uy = G.land ? H * .66 : H * .8; label(c, '必杀 · ' + ULTN[id], tx, uy, (G.land ? 30 : 24) * S, '#2f2a1f', 'center', '#fffaf0'); label(c, ELN[d.elem] + '属性', tx, uy + (G.land ? 30 : 26) * S, 14 * S, '#6d6455', 'center'); c.restore();
      return;
    }
    // 站到场上放必杀，然后离场
    var u2 = (t - cutT) / BF.SM.END, a = u2 < .1 ? u2 / .1 : (u2 > .8 ? clamp(1 - (u2 - .8) / .2, 0, 1) : 1), px = clamp(bv.x - (G.land ? .3 : .36) * W, W * .14, W * .8), ph = fh * 1.02;
    c.save(); c.globalAlpha = .3 * a; var rg = c.createRadialGradient(px, G.gy - fh * .35, 10, px, G.gy - fh * .35, fh * .8); rg.addColorStop(0, 'rgba(42,34,24,.55)'); rg.addColorStop(1, 'rgba(42,34,24,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H); c.restore();
    var atk = clamp((t - cutT - .1) / .45, 0, 1), lunge = Math.sin(atk * Math.PI);
    var tt = t - cutT, spose = tt < .1 ? 'stance' : (tt < BF.SM.HIT + .5 ? 'ult' : 'stance');
    if (id === 'yuanzhang' || id === 'martin') drawRetinue(c, id, px, G.gy - .01 * H, ph, a * .95 * clamp(tt / .3, 0, 1), G.t);
    drawSpr(c, id, spose, px, G.gy - .01 * H, ph, { alpha: a, dx: lunge * 60 * S, rot: lunge * .04, sx: 1 + lunge * .03, lift: spose === 'ult' ? .03 : 0, skew: .014 * idleV(.2), key: 'sum:' + id });
    if (!s.hit) { c.save(); c.globalAlpha = .5 * atk; c.strokeStyle = '#2a2218'; c.lineWidth = 8 * S; c.beginPath(); c.arc(px + 40 * S, G.gy - fh * .42, fh * .28 * (1 - atk * .4), 0, 7); c.stroke(); c.restore(); }
    else { var q = clamp((t - cutT - BF.SM.HIT) / .6, 0, 1); c.save(); c.globalAlpha = (1 - q) * .8; c.strokeStyle = '#2a2218'; c.lineWidth = 14 * S * (1 - q); c.beginPath(); c.moveTo(px + 90 * S, G.gy - fh * .4); c.quadraticCurveTo((px + bv.x) / 2, G.gy - fh * .55, bv.x, G.gy - fh * .4); c.stroke(); c.lineWidth = 3 * S; c.strokeStyle = '#6e342c'; c.stroke(); c.restore(); }
  }

  /* ---------- 总绘制 ---------- */
  var WUCLOSE = [];
  function preloadWu() {
    if (WUCLOSE._p) return WUCLOSE._p;
    WUCLOSE._p = Promise.all([1, 2, 3, 4, 5].map(function (i) {
      return loadImg('../assets/ult/wukong-close-' + i + '.webp').then(function (im) { WUCLOSE[i - 1] = im; }, function () { return null; });
    }));
    return WUCLOSE._p;
  }
  function ensureWuClose() { if (!WUCLOSE._p) preloadWu(); }
  /* 窄屏：整幅居中铺在宣纸上。淡出在原图像素上生成，四边都透，书法和角色用平滑保护。 */
  function wuGauss(src, w, h, sigma) {
    var rad = Math.max(1, Math.ceil(sigma * 3));
    var kern = new Float32Array(rad * 2 + 1), s2 = 2 * sigma * sigma, sum = 0, i, v;
    for (i = -rad; i <= rad; i++) { v = Math.exp(-(i * i) / s2); kern[i + rad] = v; sum += v; }
    for (i = 0; i < kern.length; i++) kern[i] /= sum;
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, k, xx, yy, a;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        a = 0;
        for (k = -rad; k <= rad; k++) {
          xx = x + k; if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1;
          a += src[y * w + xx] * kern[k + rad];
        }
        tmp[y * w + x] = a;
      }
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        a = 0;
        for (k = -rad; k <= rad; k++) {
          yy = y + k; if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1;
          a += tmp[yy * w + x] * kern[k + rad];
        }
        out[y * w + x] = a;
      }
    }
    return out;
  }
  function wuBrushMask(im) {
    var pw = im.naturalWidth, ph = im.naturalHeight;
    var key = im.src || (pw + 'x' + ph);
    if (wuBrushMask.cache && wuBrushMask.cache.key === key) return wuBrushMask.cache.cv;
    var cv = document.createElement('canvas');
    cv.width = pw; cv.height = ph;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0);
    var id = g.getImageData(0, 0, pw, ph), d = id.data, n = pw * ph, i, r, gc, b, lum, sat;
    var keep = new Float32Array(n), x, y;
    for (y = 0; y < ph; y++) {
      for (x = 0; x < pw; x++) {
        i = y * pw + x;
        r = d[i * 4]; gc = d[i * 4 + 1]; b = d[i * 4 + 2];
        lum = (r + gc + b) / 3;
        sat = Math.max(r, gc, b) - Math.min(r, gc, b);
        /* 左边墨迹和上色的身体。灰纸、淡墨底不保护，交给四边淡出。 */
        if ((lum < 72 && sat < 24 && x < pw * 0.38) || (sat > 34 && r > b + 8 && r > 45) || (b > r + 16 && b > 80)) keep[i] = 1;
      }
    }
    var near = wuGauss(keep, pw, ph, 8);
    for (i = 0; i < n; i++) {
      if (keep[i]) continue;
      r = d[i * 4]; gc = d[i * 4 + 1]; b = d[i * 4 + 2];
      lum = (r + gc + b) / 3;
      if (near[i] > 0.12 && lum < 115) keep[i] = 1;
    }
    /* 保护罩在全分辨率上高斯羽化，sigma 22px。笔画和身体像素保持不透明。 */
    var soft = wuGauss(keep, pw, ph, 22), protect = new Float32Array(n);
    for (i = 0; i < n; i++) protect[i] = keep[i] > 0 ? 1 : Math.min(1, soft[i] / 0.05);
    protect = wuGauss(protect, pw, ph, 6);
    for (i = 0; i < n; i++) if (keep[i] > 0) protect[i] = 1;
    var fadeW = Math.min(pw, ph) * 0.12, dist, nse, reach, t, a, hold;
    for (y = 0; y < ph; y++) {
      for (x = 0; x < pw; x++) {
        i = y * pw + x;
        dist = Math.min(x, y, pw - 1 - x, ph - 1 - y);
        nse = Math.sin(x * 0.011 + y * 0.007) * 0.62
          + Math.sin(x * 0.0042 + 1.3) * Math.sin(y * 0.0055 + 0.6) * 0.5
          + Math.sin(x * 0.017 - y * 0.013 + 2.0) * 0.38;
        nse = Math.max(-1, Math.min(1, nse));
        reach = fadeW * (1 + 0.7 * (nse * 0.5 + 0.5));
        t = dist / reach;
        a = t <= 0 ? 0 : (t >= 1 ? 1 : t * t * (3 - 2 * t));
        if (keep[i] > 0) {
          var ink = x < pw * 0.38;
          var m = ink ? reach * 0.45 : reach;
          var tt = dist / m;
          a = tt <= 0 ? 0 : (tt >= 1 ? 1 : tt * tt * (3 - 2 * tt));
        } else if (dist > reach && protect[i] > a) a = protect[i];
        d[i * 4 + 3] = a <= 0 ? 0 : (a >= 1 ? 255 : (a * 255 + 0.5) | 0);
      }
    }
    g.putImageData(id, 0, 0);
    wuBrushMask.cache = { key: key, cv: cv };
    return cv;
  }
  function paintWuPaper(c, W, H) {
    c.fillStyle = '#f8f1df';
    c.fillRect(0, 0, W, H);
    var wash = BG.wash || BG.far;
    if (wash && wash.naturalWidth) {
      c.save();
      c.globalAlpha = 0.14;
      var sc = Math.max(W / wash.naturalWidth, H / wash.naturalHeight);
      var ww = wash.naturalWidth * sc, hh = wash.naturalHeight * sc;
      c.drawImage(wash, (W - ww) / 2, (H - hh) / 2, ww, hh);
      c.restore();
    }
  }
  function paintWuPlate(c, im, W, H) {
    var iw = im.naturalWidth, ih = im.naturalHeight;
    var fit = Math.min(W / iw, H / ih), cover = Math.max(W / iw, H / ih);
    var s = fit, tight = false;
    if (cover > fit + 0.001) {
      var overflow = (W / iw >= H / ih) ? (ih - H / cover) : (iw - W / cover);
      if (overflow < 36) { s = cover; tight = true; }
    }
    if (!tight && H > W * 1.35) s = W / iw;
    var dw = iw * s, dh = ih * s;
    var x = (W - dw) / 2, y = (H - dh) / 2;
    if (tight && dh > H + 1) y = 0;
    if (tight && dw > W + 1) x = 0;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    if (tight || (x < 2 && y < 2 && dw >= W - 2 && dh >= H - 2)) {
      c.drawImage(im, x, y, dw, dh);
      return;
    }
    paintWuPaper(c, W, H);
    c.drawImage(wuBrushMask(im), x, y, dw, dh);
  }
  function drawWuClose(c) {
    return;
    if (!(G.wuCut > 0) || G.wuCutOff) return;
    ensureWuClose();
    var total = 2.4, t = total - G.wuCut, idx = Math.max(0, Math.min(4, Math.floor(t / total * 5))), im = WUCLOSE[idx];
    c.save();
    if (im && im.naturalWidth) paintWuPlate(c, im, G.W, G.H);
    else { c.fillStyle = '#f3ecdc'; c.fillRect(0, 0, G.W, G.H); }
    var skip = Math.max(18, Math.round(16 * Math.min(G.S, 1.6)));
    c.fillStyle = '#2a2218'; c.font = skip + 'px "Ma Shan Zheng","KaiTi",serif'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.fillText('点按跳过', G.W - 24, G.H - 28);
    c.restore();
  }
  function draw() {
    if (G.mode === 'pick') return;
    var F = G.F; if (!F) return; var W = G.W, H = G.H, S = G.S, c = ctx; c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); c.clearRect(0, 0, W, H);
    var sh = G.shake, ox = (rnd() - .5) * sh, oy = (rnd() - .5) * sh; c.save(); c.translate(ox, oy);
    var wu = F.heroes[0], pa = F.heroes[1]; placeAll(); var bv = bossVis(), V = vcalc(), cam = clamp(-(camW() - ARENA / 2) * V.k * .12, -W * .045, W * .045);
    drawBG(c, W, H, cam); drawTele(c); drawFx(c, true);
    var order = []; if (pa) order.push(G.lane.partner > G.lane.wukong ? pa : wu, G.lane.partner > G.lane.wukong ? wu : pa); else order.push(wu);
    function drawHero(h) { var hv = heroVis(h), P = heroPose(h, hv), id = h.id;
      var gyy = (G.gyBy && G.gyBy[h.id] != null ? G.gyBy[h.id] : G.gy) + hv.dy;
      if ((id === 'yuanzhang' || id === 'martin') && h.st === 'cast') drawRetinue(c, id, hv.x, gyy, G.fh * hv.sc, .9 * Math.sin(clamp(h.stT / .6, 0, 1) * Math.PI), G.t, P.fs < 0 ? -1 : 1);
      P.fog = clamp(hv.ln, 0, 1); P.alpha *= 1 - .05 * P.fog; G._ly = hv.dy; drawSpr(c, id, P.pose, hv.x, gyy, G.fh * hv.sc, P); G._ly = 0; }
    function drawBoss() { var bps = bossPose(F.boss); var gyy = (G.gyBy && G.gyBy.niumo != null) ? G.gyBy.niumo : G.gy; drawSpr(c, 'niumo', bps.pose, bv.x, gyy, G.fh * bv.sc, bps); if (F.boss.st === 'spin') drawWhirl(c, bv.x, F.boss.stT); }
    // 景深：后排英雄 → 牛魔王 → 前排英雄（前排的人挥棒时不会被牛魔王挡住）
    if (order.length > 1) drawHero(order[0]); drawBoss(); drawHero(order[order.length - 1]);
    drawMinions(c); drawFx(c, false);
    c.restore();
    if (G.flash > 0) { c.save(); c.globalAlpha = Math.min(.55, G.flash); c.fillStyle = G.flashC; c.fillRect(0, 0, W, H); c.restore(); }
    var spd = $('spd');
    if (spd && G.F) {
      var tr0 = (G.land ? 29 : 22) * S, ty0 = 8 * S + (G.land ? 26 : 22) * S, seal = 30;
      spd.style.top = Math.round(ty0 + tr0 + 4) + 'px';
      spd.style.width = '36px';
      spd.style.height = seal + 'px';
      spd.style.fontSize = '17px';
      spd.style.lineHeight = seal + 'px';
    }
    var showingClose = G.wuCut > 0 && !G.wuCutOff;
    drawWuClose(c);
    var cutin = F.sm && F.sm.t < BF.SM.CUT;
    if (showingClose) $('spd').style.visibility = 'hidden';
    else {
      $('spd').style.visibility = cutin || G.introT > 0 ? 'hidden' : 'visible';
      drawSummon(c);
      if (!cutin) { drawHUD(c); drawCalls(c); }
    }
    if (G.introT > 0) drawIntro(c);
    if (F.over && F.over.win) { var u = clamp(G.endT / .5, 0, 1); if (G.endT < 2.6) { c.save(); c.globalAlpha = .9 * ease(u) * (G.endT > 2.2 ? 1 - (G.endT - 2.2) / .4 : 1); label(c, '击败牛魔王', W * .27, H * .22, Math.min(W * .068, 42 * S), '#c8341f', 'center', '#fffaf0'); c.restore(); } }
  }
  function drawWhirl(c, x, k) {
    var S = G.S, R = BF.K.SPIN_R * G.V.k * 1.45, cy = G.gy - G.fh * .28, a0 = k * 15;
    c.save(); c.lineCap = 'round';
    for (var i = 0; i < 3; i++) { c.globalAlpha = .5 - i * .1; c.strokeStyle = i === 1 ? '#6a2f7a' : '#2f2a1f'; c.lineWidth = (9 - i * 2.5) * S; c.beginPath(); c.ellipse(x, cy + (i - 1) * G.fh * .12, R * (1 - i * .1), R * .3, 0, a0 + i * 2.1, a0 + i * 2.1 + 3.2); c.stroke(); }
    c.restore();
  }

  function drawIntro(c) {
    var W = G.W, H = G.H, S = G.S, u = 1 - G.introT / 1.7, a = u < .15 ? u / .15 : (u > .8 ? 1 - (u - .8) / .2 : 1);
    c.save(); c.globalAlpha = .62 * a; c.fillStyle = '#f8f1df'; c.fillRect(0, 0, W, H); c.globalAlpha = a;
    label(c, '第一关', W / 2, H * .3, 22 * S, '#6d6455', 'center'); label(c, '牛魔王', W / 2, H * .46, Math.min(W * .2, 110 * S), '#2f2a1f', 'center');
    label(c, '火焰山 · 三人对战', W / 2, H * .62, 20 * S, '#6d6455', 'center'); if (u > .6) label(c, '战！', W / 2, H * .78, 64 * S * (1 + (u - .6) * .5), '#c8341f', 'center'); c.restore();
  }

  /* ---------- 选人界面 ---------- */
  /* ---------- 选人界面：只选搭档（圆形 X 头像） ---------- */
  function avatarURL(id) {
    return '../assets/art/battle-hd/' + id + '.webp';
  }
  function avaEl(id, o) {
    o = o || {}; var d = BF.SP[id], el = document.createElement('div'); el.className = 'ava' + (o.on ? ' on' : '') + (o.off ? ' off' : '') + (o.sel ? ' sel' : ''); el.dataset.id = id;
    var tall = window.innerHeight >= 400;
    var faceH = (id === 'kuanggong' && tall) ? 80 : 84;
    var bang = (id === 'kuanggong' && tall) ? ' !important' : '';
    el.innerHTML = '<div class="ring"><div class="face" data-face="' + faceH + '" style="background-image:url(' + avatarURL(id) + ');background-size:auto ' + faceH + '%' + bang + ';background-position:center bottom' + bang + ';background-repeat:no-repeat"></div></div><b><img class="nm" alt="' + NAMES[id] + '" src="../assets/art/menu-poster/nameh-' + id + '.webp">' + (o.badge ? '<span class="bd">' + o.badge + '</span>' : '') + '</b>';
    return el;
  }
  function buildPick() {
    var g = $('pgrid'); g.innerHTML = '';
    BF.ORDER.forEach(function (k) {
      var d = BF.SP[k], own = OWN.indexOf(k) >= 0, el = avaEl(k, { on: k === G.partner, off: !own, badge: k === G.partner ? '出战' : (!own ? '未获得' : ''), sub: ELN[d.elem] + ' · Lv5' });
      if (own) el.onclick = function () { G.partner = k; buildPick(); }; g.appendChild(el);
    });
    if (SMETA[G.partner]) loadPose(G.partner, 'stance');
    var d = BF.SP[G.partner], m = BF.lvMul(5), hpv = Math.round(d.hp * m * BF.K.HPK);
    $('pinfo').innerHTML = '选一位搭档（悟空固定出战）。<b>' + d.name + '</b> ' + ELN[d.elem] + ' · 生命 ' + hpv + ' · 必杀「' + d.ult.name + '」。战中点“召唤援军”随机来一位，每局一次。';
  }
  var STILL = {};
  function stillNode(id) {
    if (STILL[id]) return STILL[id].ok ? STILL[id].im : null;
    var rec = STILL[id] = { ok: false, im: null };
    var im = new Image();
    im.onload = function () { if (im.naturalWidth) { rec.im = im; rec.ok = true; } };
    im.src = '../assets/art/battle-hd/' + id + '.webp';
    return null;
  }
  function drawStill(c, id, cx, foot, h) {
    var im = stillNode(id); if (!im) return;
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) return;
    var dh = h, dw = iw * (h / ih);
    c.save();
    c.imageSmoothingEnabled = true;
    c.drawImage(im, cx - dw / 2, foot - dh, dw, dh);
    c.restore();
  }
  var NAMEH = {};
  function nameArt(id) {
    if (NAMEH[id]) return NAMEH[id].ok ? NAMEH[id].im : null;
    var rec = NAMEH[id] = { ok: false, im: null };
    var im = new Image();
    im.onload = function () { if (im.naturalWidth) { rec.im = im; rec.ok = true; } };
    im.src = '../assets/art/menu-poster/nameh-' + id + '.webp';
    return null;
  }
  function plateParts(im) {
    if (im._parts) return im._parts;
    var cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    var w = cv.width, h = cv.height, data = g.getImageData(0, 0, w, h).data;
    var anyL = w, anyR = 0, sealL = w, sealR = 0, y;
    for (y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (data[i + 3] < 24) continue;
        if (x < anyL) anyL = x;
        if (x > anyR) anyR = x;
        if (data[i] > 150 && data[i] > data[i + 1] + 35 && data[i] > data[i + 2] + 35) {
          if (x < sealL) sealL = x;
          if (x > sealR) sealR = x;
        }
      }
    }
    var textR = sealL < w ? Math.max(anyL, sealL - 2) : anyR;
    im._parts = {
      full: { x: anyL, w: Math.max(1, anyR - anyL + 1), h: h },
      text: { x: anyL, w: Math.max(1, textR - anyL + 1), h: h },
      seal: sealR > sealL ? { x: sealL, w: sealR - sealL + 1, h: h } : null
    };
    return im._parts;
  }
  function fitPlate(im, maxW, maxH) {
    var p = plateParts(im);
    function sized(part) {
      var dh = maxH, dw = dh * part.w / part.h;
      if (dw > maxW) { dw = maxW; dh = dw * part.h / part.w; }
      return { dw: dw, dh: dh };
    }
    var full = sized(p.full), part = p.full, box = full, dropped = false;
    if (p.seal && (full.dw > maxW + 0.5 || full.dh < 15)) {
      part = p.text; box = sized(p.text); dropped = true;
    }
    return { sx: part.x, sy: 0, sw: part.w, sh: part.h, dw: box.dw, dh: box.dh, dropped: dropped, parts: p };
  }
  function brushName(c, text, x, y, size, col) {
    c.save();
    c.font = size + 'px "Ma Shan Zheng","KaiTi",serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = col || '#24180f';
    c.fillText(text, x, y);
    c.restore();
  }
  function drawPick() {
    var st = pcv.parentNode.getBoundingClientRect(), W = st.width, H = st.height, dpr = G.dpr || 1, c = pctx;
    if (W < 4 || H < 4) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var mx = W * 0.42, my = H * 0.64;
    var rx = Math.min(W * 0.34, Math.max(24, mx - 22), Math.max(24, W - mx - 36));
    var ry = Math.min(H * 0.32, Math.max(16, my - 16), Math.max(16, H - my - 28));
    c.save();
    c.translate(mx, my);
    c.scale(rx, ry);
    var mist = c.createRadialGradient(0, 0, 0.08, 0, 0, 1);
    mist.addColorStop(0, 'rgba(78,58,38,0.12)');
    mist.addColorStop(0.58, 'rgba(78,58,38,0.035)');
    mist.addColorStop(1, 'rgba(78,58,38,0)');
    c.fillStyle = mist;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();
    var leftId = G.partner || 'heyuxi';
    var ids = [leftId, 'wukong', 'niumo'];
    var labels = [NAMES[leftId] || '', '孙悟空', '牛魔王'];
    function asp(id) {
      var im = stillNode(id);
      return im && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 0.8;
    }
    var aL = asp(leftId), aW = asp('wukong'), aN = asp('niumo');
    var nameH = Math.max(15, Math.min(30, H * 0.085, W * 0.045));
    var marginL = Math.max(48, Math.round(W * 0.07));
    var marginR = Math.max(20, Math.round(W * 0.03));
    var foot = H - Math.max(2, H * 0.012);
    var maxH = Math.max(48, foot - nameH - 4);
    var avail = W - marginL - marginR;
    var pairOverlap = 0.14, duelGap = Math.max(nameH * 1.7, 28);
    function pairWidth(h) { return h * (aL + aW * (1 - pairOverlap)); }
    function totalWidth(h) { return pairWidth(h) + duelGap + h * aN; }
    var h = maxH;
    if (totalWidth(h) > avail) h = avail / (aL + aW * (1 - pairOverlap) + aN + duelGap / maxH);
    h = Math.max(36, Math.min(maxH, h));
    duelGap = Math.max(nameH * 1.6, Math.min(duelGap, avail - pairWidth(h) - h * aN));
    if (duelGap < nameH) duelGap = nameH;
    if (totalWidth(h) > avail) h = (avail - duelGap) / (aL + aW * (1 - pairOverlap) + aN);
    var extra = foot - h - (nameH + 6);
    if (extra > 10) foot -= extra * 0.5;
    var wL = h * aL, wW = h * aW, wN = h * aN;
    var block = pairWidth(h) + duelGap + wN;
    var xL = marginL + Math.max(0, (avail - block) / 2) + wL / 2;
    var xW = xL + wL / 2 + wW * (0.5 - pairOverlap);
    var xN = xW + wW * (0.5 - pairOverlap * 0.15) + duelGap + wN / 2;
    var top = foot - h;
    var groundL = xL - wL * 0.35, groundR = xN + wN * 0.35;
    c.save();
    c.fillStyle = 'rgba(42,32,22,0.16)';
    c.beginPath();
    c.ellipse((groundL + groundR) / 2, foot - 1, (groundR - groundL) / 2, Math.max(7, h * 0.028), 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    drawStill(c, 'wukong', xW, foot, h);
    drawStill(c, leftId, xL, foot, h * 0.98);
    drawStill(c, 'niumo', xN, foot, h);
    var rects = [
      { x: xL - wL / 2, y: top, w: wL, h: h },
      { x: xW - wW / 2, y: top, w: wW, h: h },
      { x: xN - wN / 2, y: top, w: wN, h: h }
    ];
    var xs = [xL, xW, xN];
    function outside(x, y, tw, th) {
      var a = x - tw / 2, b = y - th / 2;
      if (a < 1 || b < 1 || a + tw > W - 1 || b + th > H - 1) return true;
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (a + tw > r.x + 3 && a < r.x + r.w - 3 && b + th > r.y + 3 && b < r.y + r.h * 0.92) return true;
      }
      return false;
    }
    var ihCap = Math.min(28, Math.max(16, nameH));
    var halfChar = ihCap * 0.5;
    var specs = labels.map(function (text, i) {
      var leftEdge = i === 0 ? marginL : (xs[i - 1] + xs[i]) / 2;
      var rightEdge = i === labels.length - 1 ? W - marginR : (xs[i] + xs[i + 1]) / 2;
      var laneL = leftEdge + (i === 0 ? 0 : halfChar / 2);
      var laneR = rightEdge - (i === labels.length - 1 ? 0 : halfChar / 2);
      var maxW = Math.max(28, laneR - laneL);
      var im = nameArt(ids[i]);
      var dw, dh, fit = null;
      if (im) {
        fit = fitPlate(im, maxW, ihCap);
        dw = fit.dw; dh = fit.dh;
      } else {
        dh = Math.min(ihCap, Math.max(13, maxW / Math.max(1, text.length) * 1.2));
        c.font = dh + 'px "Ma Shan Zheng","KaiTi",serif';
        dw = Math.min(maxW, c.measureText(text).width);
        if (c.measureText(text).width > maxW) dh = dh * maxW / c.measureText(text).width;
      }
      var x = Math.max(laneL + dw / 2, Math.min(laneR - dw / 2, xs[i]));
      var y = Math.max(dh / 2 + 2, rects[i].y - 4 - dh / 2);
      return { id: ids[i], text: text, im: im, fit: fit, x: x, y: y, w: dw, h: dh, laneL: laneL, laneR: laneR, head: rects[i].y };
    });
    function boxesHit(a, b) {
      var w = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
      var h = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);
      return w > 0.5 && h > 0.5;
    }
    var pass, i, j;
    for (pass = 0; pass < 4; pass++) {
      var moved = false;
      for (i = 0; i < specs.length; i++) for (j = i + 1; j < specs.length; j++) {
        if (!boxesHit(specs[i], specs[j])) continue;
        var lift = i < j ? specs[i] : specs[j];
        lift.y = Math.max(lift.h / 2 + 2, Math.min(specs[i].y, specs[j].y) - lift.h - halfChar);
        moved = true;
      }
      if (!moved) break;
    }
    specs.forEach(function (s) {
      if (s.im) c.drawImage(s.im, s.fit.sx, s.fit.sy, s.fit.sw, s.fit.sh, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
      else brushName(c, s.text, s.x, s.y, s.h, '#24180f');
      s.box = { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h };
      if (s.fit && !s.fit.dropped && s.fit.parts.seal) {
        var sc = s.w / s.fit.sw, seal = s.fit.parts.seal;
        s.seal = { x: s.box.x + (seal.x - s.fit.sx) * sc, y: s.box.y, w: seal.w * sc, h: s.h };
        s.glyph = { x: s.box.x, y: s.box.y, w: Math.max(1, s.seal.x - s.box.x), h: s.h };
      } else s.glyph = { x: s.box.x, y: s.box.y, w: s.w, h: s.h };
    });
    window.__bfNames = specs.map(function (s) {
      return { id: s.id, box: s.box, glyph: s.glyph, seal: s.seal || null, lane: [s.laneL, s.laneR], head: s.head };
    });
    var zSize = Math.max(nameH, Math.min(42, H * 0.11));
    var gapMid = (rects[1].x + rects[1].w + rects[2].x) / 2;
    var zy = top + h * 0.22;
    c.font = zSize + 'px "Ma Shan Zheng","KaiTi",serif';
    var zw = c.measureText('战').width + 4;
    if (!outside(gapMid, zy, zw, zSize)) brushName(c, '战', gapMid, zy, zSize, '#a83224');
    else if (!outside(gapMid, top + nameH, zw, zSize)) brushName(c, '战', gapMid, top + nameH, zSize, '#a83224');
  }

  /* ---------- 结算 ---------- */
  var RESULT = null;
  function showResult() {
    var F = G.F, win = F.over.win, res = $('res'); res.className = 'ov on' + (win ? '' : ' lose');
    var pa = F.heroes[1], stars = win ? 1 + (pa && pa.alive ? 1 : 0) + (F.t <= 45 && !F.sumUsed ? 1 : 0) : 0;
    $('rbig').textContent = win ? '胜' : '败'; $('rstars').textContent = win ? '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars) : '—';
    var why = win ? '牛魔王倒下 · 用时 ' + F.t.toFixed(0) + ' 秒' + (F.sumUsed ? ' · 援军 ' + NAMES[F.sumId] : ' · 未用援军') : (F.over.why === 'time' ? '时间到，牛魔王还剩 ' + Math.round(F.boss.hp / F.boss.maxHp * 100) + '%' : '孙悟空倒下了');
    $('rsub').textContent = why;
    $('rrw').innerHTML = win ? '<div>金币 +' + (600 + stars * 200) + '</div><div>悟空经验 +120</div><div>' + BF.SP[G.partner].name + ' 碎片 ×' + (1 + stars) + '</div>' + '<div>首通 · 牛魔王图鉴 <em>解锁</em></div>' : '<div>再来一次吧 <em>金币 +100 安慰奖</em></div>';
    $('rnext').textContent = win ? '继续' : '返回';
    RESULT = { runId: G.runId, win: win, stars: stars, partner: G.partner, summon: F.sumUsed ? F.sumId : null, time: Math.round(F.t), why: F.over.why || null, bossHpPct: Math.round(F.boss.hp / F.boss.maxHp * 100) };
    // 主游戏接入：onResult 可返回 { rewards: ['金币 +30', ...] }，用来替换结算卡上的占位奖励文字
    if (CTX.onResult) { try { var hr = CTX.onResult(RESULT); if (hr && hr.rewards) $('rrw').innerHTML = hr.rewards.map(function (t) { return '<div>' + t + '</div>'; }).join(''); } catch (e) {} }
  }

  /* ---------- 交互 ---------- */
  function doSummon(force) { var F = G.F; if (!F || F.sumUsed || F.over || F.sm || G.introT > 0) return; if (force) { F.sumId = force; F.sumLv = 5; } BF.pressSummon(F); if (F.sumId) loadChar(F.sumId); F.ev.forEach(onEvent); F.ev.length = 0; }
  cv.addEventListener('pointerdown', function (e) {
    if (G.mode === 'fight' && G.wuCut > 0 && !G.wuCutOff) { G.wuCutOff = true; G.wuCut = 0; return; }
    if (G.mode !== 'fight') return; var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, R = G.sumRect;
    if (R && x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h) doSummon();
  });
  $('spd').onclick = function () { G.speed = G.speed === 1 ? 2 : 1; $('spd').textContent = '×' + G.speed; };
  function goFight(o) { $('load').classList.add('on'); return loadChar(o.partner || G.partner).then(function () { $('load').classList.remove('on'); startFight(o); }); }
  $('go').onclick = function () { goFight({ partner: G.partner }); };
  $('rretry').onclick = function () { startFight({ partner: G.partner, skipIntro: true }); };
  $('rnext').onclick = function () { if (CTX.onExit) { closeBF(); return; } G.mode = 'pick'; $('res').classList.remove('on'); $('pick').classList.add('on'); buildPick(); layout(); };
  window.addEventListener('resize', function () { if (G.run) layout(); });

  /* ---------- 对外接口 XY.bossfight ---------- */
  function openBF(c) {
    c = CTX = c || {}; if (c.own) OWN = c.own.filter(function (k) { return BF.ORDER.indexOf(k) >= 0; }); if (Q.get('own') === 'all') OWN = BF.ORDER.slice();
    if (c.partner && BF.SP[c.partner]) G.partner = c.partner;
    $('app').style.display = 'block'; $('load').classList.add('on');
    return ensureLoaded().then(function () {
      $('load').classList.remove('on'); layout(); RESULT = null;
      if (c.skipPick) return loadChar(G.partner).then(function () { startFight({ partner: G.partner, seed: c.seed, skipIntro: c.skipIntro }); if (!G.run) { G.run = true; G._last = 0; requestAnimationFrame(frame); } return window.BFUI; }); else { G.mode = 'pick'; $('res').classList.remove('on'); $('pick').classList.add('on'); buildPick(); layout(); }
      if (!G.run) { G.run = true; G._last = 0; requestAnimationFrame(frame); }
      return window.BFUI;
    });
  }
  function closeBF() { G.run = false; $('app').style.display = 'none'; $('pick').classList.remove('on'); $('res').classList.remove('on'); var cb = CTX.onExit, r = RESULT; CTX = {}; if (cb) { try { cb(r); } catch (e) {} } }
  window.XY = window.XY || {}; window.XY.bossfight = { open: openBF, close: closeBF, state: function () { return { mode: G.mode, partner: G.partner, result: RESULT, loaded: !!ready }; } };

  // Opaque documents share the origin string "null", not document identity.
  // Only the Boss document at the launch URL knows hostKey; never send it in probes.
  // The child creates/transfers the port, avoiding a window-navigation transfer race.
  if (window.XY_BF_MANUAL && window.parent !== window && /^[a-f0-9]{32}$/.test(Q.get('hostKey') || '')) {
    var bridgeKey = null, bridgePort = null, bridgeOpened = false;
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (!e.isTrusted || e.source !== window.parent || e.origin !== (location.protocol === 'file:' ? 'null' : location.origin) || !m || m.bridge !== 'xy-boss-1' || m.kind !== 'probe' || !/^[a-f0-9]{32}$/.test(m.token) || bridgePort) return;
      bridgeKey = m.token;
      var channel = new MessageChannel(); bridgePort = channel.port1;
      function post(kind, value) { bridgePort.postMessage({ bridge: 'xy-boss-1', token: bridgeKey, kind: kind, value: value }); }
      bridgePort.onmessage = function (event) {
        var r = event.data;
        if (!r || r.bridge !== 'xy-boss-1' || r.token !== bridgeKey) return;
        if (r.kind === 'open' && !bridgeOpened) {
          var c = r.value;
          if (!c || !Array.isArray(c.own) || !c.own.length || !c.own.every(function (id) { return BF.ORDER.indexOf(id) >= 0; }) || c.own.indexOf(c.partner) < 0) return;
          bridgeOpened = true;
          openBF({ own: c.own, partner: c.partner, skipIntro: false,
            onResult: function (result) { post('result', result); return { rewards: ['奖励结算中…'] }; },
            onExit: function () { post('exit'); }
          }).then(function () { post('opened'); });
        } else if (r.kind === 'receipt' && RESULT && RESULT.runId === G.runId && r.value && r.value.runId === RESULT.runId && Array.isArray(r.value.rewards) && r.value.rewards.length <= 8 && r.value.rewards.every(function (t) { return typeof t === 'string' && t.length <= 400; })) $('rrw').innerHTML = r.value.rewards.map(function (t) { return '<div>' + t + '</div>'; }).join('');
      };
      bridgePort.start();
      window.parent.postMessage({ bridge: 'xy-boss-1', kind: 'ready', token: bridgeKey, hostKey: Q.get('hostKey') }, '*', [channel.port2]);
    });
  }

  function hudBands() {
    var S = G.land ? G.H / 390 : G.W / 390, H = G.H, land = G.land;
    var sealBottom = 8 * S + (land ? 26 : 22) * S + (land ? 29 : 22) * S + 4 + 30;
    var timerBottom = 8 * S + 26 * S + (land ? 29 : 26) * S;
    return {
      topH: Math.ceil(Math.max(sealBottom, timerBottom)),
      bottomTop: Math.floor(H - 62 * S)
    };
  }
  function pixelSep() {
    placeAll();
    var fit = G._fit, feet = fit && fit.feet, fh = G.fh;
    if (!feet) return null;
    function stamp(id, clipName, frame) {
      var Wld = XY.wildAnim, clip = Wld.clip(id, clipName), im = Wld.img(id, clipName), b = cellOpaque(id, clipName, frame);
      if (!clip || !im || !b) return null;
      var body = fh * (SZ[id] || 1) * 0.74 * b.fit, k = body / b.stand, face = id === 'niumo' ? -1 : 1;
      var cv = document.createElement('canvas'); cv.width = G.W; cv.height = G.H;
      var g = cv.getContext('2d', { willReadFrequently: true });
      var cw = clip.cell[0], ch = clip.cell[1], col = frame % clip.cols, row = (frame / clip.cols) | 0;
      g.save(); g.translate(feet[id].x, feet[id].y); g.scale(face, 1);
      g.drawImage(im, col * cw, row * ch, cw, ch, -b.ax * k, -b.ay * k, cw * k, ch * k);
      g.restore();
      return g.getImageData(0, 0, G.W, G.H).data;
    }
    function hits(a, b) {
      if (!a || !b) return -1;
      var n = 0, i; for (i = 3; i < a.length; i += 4) if (a[i] >= 40 && b[i] >= 40) n++;
      return n;
    }
    function pack(spec) {
      var names = ['phyrex', 'wukong', 'niumo'], masks = {}, pairs = {}, i, j, total = 0, key, c;
      for (i = 0; i < names.length; i++) masks[names[i]] = stamp(names[i], spec[names[i]].clip, spec[names[i]].frame);
      for (i = 0; i < names.length; i++) for (j = i + 1; j < names.length; j++) {
        key = names[i] + '-' + names[j]; c = hits(masks[names[i]], masks[names[j]]); pairs[key] = c; total += Math.max(0, c);
      }
      var band = hudBands(), hud = {}, topN = 0, botN = 0, minY = 1e9, maxY = -1, id, d, p, y, lo, hi, tn, bn, Wpx = G.W;
      for (i = 0; i < names.length; i++) {
        id = names[i]; d = masks[id]; tn = 0; bn = 0; lo = 1e9; hi = -1;
        if (d) for (p = 3; p < d.length; p += 4) {
          if (d[p] < 40) continue;
          y = ((p / 4) / Wpx) | 0;
          if (y < lo) lo = y; if (y > hi) hi = y;
          if (y < band.topH) tn++;
          if (y >= band.bottomTop) bn++;
        }
        hud[id] = { top: tn, bottom: bn, topGap: lo - band.topH, bottomGap: band.bottomTop - hi - 1 };
        topN += tn; botN += bn;
        if (lo < minY) minY = lo; if (hi > maxY) maxY = hi;
      }
      return { pairs: pairs, overlap: total, hud: { topH: band.topH, bottomTop: band.bottomTop, topPx: topN, bottomPx: botN, topGap: minY - band.topH, bottomGap: band.bottomTop - maxY - 1, pass: topN === 0 && botN === 0 && (minY - band.topH) >= 8 && (band.bottomTop - maxY - 1) >= 8, each: hud } };
    }
    return {
      idle: pack({ phyrex: { clip: 'bossIdle', frame: 0 }, wukong: { clip: 'bossIdle', frame: 0 }, niumo: { clip: 'bossIdle', frame: 0 } }),
      attack: pack({ phyrex: { clip: 'bossIdle', frame: 0 }, wukong: { clip: 'bossAttack', frame: hitFrame('wukong') }, niumo: { clip: 'bossAttack', frame: hitFrame('niumo') } }),
      vis: fit.vis, fh: Math.round(fh), aabb: !fit.hit
    };
  }

  /* ---------- 供截图 / 测试脚本用 ---------- */
  window.BFUI = {
    G: G, ready: null,
    pick: function (id) { if (id) G.partner = id; G.mode = 'pick'; $('res').classList.remove('on'); $('pick').classList.add('on'); buildPick(); layout(); },
    start: function (o) { startFight(o); },
    advance: function (sec) { var n = Math.round(sec * 60); for (var i = 0; i < n; i++) stepSim(1 / 60); },
    until: function (fn, max) { var n = Math.round((max || 90) * 60); for (var i = 0; i < n; i++) { stepSim(1 / 60); if (fn(G.F)) return true; } return false; },
    loadChar: loadChar, loadMids: loadMids, loadAll: function () { return ensureLoaded().then(function () { return Promise.all(FIGS.map(loadChar).concat([loadBG('port')])); }).then(function () { return Promise.all(FIGS.map(loadMids)); }); }, loaded: function () { return Object.keys(CHP); },
    summon: doSummon, avatarURL: avatarURL, draw: draw, drawPick: drawPick, showResult: showResult, stepSim: stepSim, SPR: SPR, SMETA: SMETA, AV: AV, drawSpr: drawSpr, heroPose: heroPose, hui: hui, bgSeam: bgSeam, pixelSep: pixelSep
  };
  /* ---------- 独立页面启动（接入 td-game 时设 window.XY_BF_MANUAL = true，由游戏调用 XY.bossfight.open） ---------- */
  if (!window.XY_BF_MANUAL) {
    var sc = Q.get('scene'); BFUI.ready = null;
    openBF({ skipPick: sc === 'fight', partner: Q.get('partner') || undefined, seed: +Q.get('seed') || 3, skipIntro: Q.get('intro') !== '1' });
    ensureLoaded(); BFUI.ready = ready;
  }
})();
