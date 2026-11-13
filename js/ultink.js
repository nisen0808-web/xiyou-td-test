/* ============================================================
 * ultink.js —— v0.8.0：九位特殊人物大招的「狂野水墨」画面（替换 ultscene 原来的矢量通用特效）
 *   · 主体 = AI 出图 → 切帧 → 烘焙的 8 帧水墨精灵（js/ult_ink_data.js，tools/ult_cut / ult_logos / ult_bake）：
 *     前摇 3 帧（0–2）→ 出招 2 帧（3–4）→ 收招 3 帧（5–7），一共约 2.8 秒（ULTINK.T），官方 logo 一律脚本合成，运行时不画任何 logo 文字。
 *   · 范围效果 = 程序画的泼墨：放射 / 扩散 / 收圈 / 横扫 / 拽拢的“笔触”+ 飞溅墨点 + 地面墨团，颜色用各人的点缀色；画面是 f(S.t) 的纯函数。
 *   · 图集没解码好 / ULTINK.on=false → sprite 不画（施法者照常显示 Q 版小人），范围笔触照画。
 * ============================================================ */
(function () {
  'use strict';
  var XY = window.XY, PI = Math.PI, PI2 = PI * 2, cos = Math.cos, sin = Math.sin, abs = Math.abs, imgs = {};
  var U = XY.ULTINK = { on: true, T: 2.8, K: 1.5, XF: 0.1, drawn: 0, last: null, frames: {} };
  function cl(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function seg(t, a, b) { return cl((t - a) / (b - a), 0, 1); }
  function eo(x) { x = cl(x, 0, 1); return 1 - (1 - x) * (1 - x) * (1 - x); }
  function hash(i, k) { var s = sin(i * 127.1 + (k || 0) * 311.7 + 17.3) * 43758.5453; return s - Math.floor(s); }
  function N(n) { return Math.max(2, Math.round(n * (XY.ultscene ? XY.ultscene.Q : 1))); }
  var INK = '22,18,14';
  function ent(id) {
    if (!U.on || !XY.ULTINK_DATA) return null;
    var d = XY.ULTINK_DATA[id]; if (!d) return null;
    var e = imgs[id]; if (!e) { e = imgs[id] = { img: new Image(), d: d }; e.img.src = d.src; }
    return e.img.complete && e.img.naturalWidth > 0 ? e : null;
  }
  U.has = function (id) { return !!ent(id); };
  U.preload = function () { if (XY.ULTINK_DATA) for (var k in XY.ULTINK_DATA) ent(k); };
  U.bounds = function (hit) {                          // 8 帧的起点（秒）：前摇 3 等分 [0, hit-0.1]，出招 2 帧，收招 3 等分到 T
    var w = (hit - 0.1) / 3, rs = hit + 0.5, rl = (U.T - rs) / 3;
    return [0, w, 2 * w, hit - 0.1, hit + 0.12, rs, rs + rl, rs + 2 * rl, U.T];
  };
  U.frameAt = function (t, hit) { var b = U.bounds(hit), i = 0; while (i < 7 && t >= b[i + 1]) i++; return { i: i, since: t - b[i], b: b }; };
  /* ---------- 精灵 ---------- */
  function one(c, en, i, alpha, x, foot, k) {
    var f = en.d.fr[i]; if (!f || alpha <= 0.003) return;
    c.globalAlpha = alpha; c.drawImage(en.img, f[0], f[1], f[2], f[3], x - f[4] * k, foot - f[5] * k, f[2] * k, f[3] * k);
  }
  var POR = {}, SOFT = {};
  var FIVE = { tang: 1, wukong: 1, bajie: 1, wujing: 1, horse: 1 };
  function portrait(id) {
    var im = POR[id];
    if (!im) {
      im = POR[id] = new Image();
      im.src = FIVE[id] ? ('assets/art/menu-v5/fig_' + id + '.webp') : ('assets/art/bg/' + id + '.webp');
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  function plate(id, im) {
    var e = SOFT[id]; if (e && e.src === im) return e.cv;
    var w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    var rad = Math.hypot(w, h) * 0.62;
    var rg = g.createRadialGradient(w / 2, h * 0.45, rad * 0.25, w / 2, h * 0.48, rad);
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.62, 'rgba(0,0,0,1)'); rg.addColorStop(0.84, 'rgba(0,0,0,0.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    SOFT[id] = { src: im, cv: cv }; return cv;
  }
  U.portraitReady = function (id) { return !!portrait(id); };
  U.sprite = function (c, S, t) {
    if (S.visualOff || t >= U.T) return false;
    var en = ent(S.id); if (!en) return false;
    var h = S.h, fa = U.frameAt(t, S.def.hit), i = fa.i;
    var pulse = (i === 3 || i === 4) ? (1 + 0.04 * sin(cl(fa.since / 0.3, 0, 1) * PI)) : 1;
    var k = ((i === 3 || i === 4) ? 1.28 : 1.12) * pulse;
    var x = h && !h.dead ? h.x : S.x, foot = (h && !h.dead ? h.y : S.y) + 14;
    var a = 1 - seg(t, U.T - 0.25, U.T);
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    var hdBag = U._hd || (U._hd = {}), hd = hdBag[S.id];
    if (!hd) { hd = hdBag[S.id] = new Image(); hd.src = 'assets/art/battle-hd/' + S.id + '.webp'; }
    if (hd.complete && hd.naturalWidth) {
      var dh = 220, dw = hd.naturalWidth * dh / hd.naturalHeight;
      c.globalAlpha = a; c.drawImage(hd, x - dw / 2, foot - dh, dw, dh);
    } else if (i > 0 && fa.since < U.XF) { one(c, en, i - 1, a, x, foot, k); one(c, en, i, a * fa.since / U.XF, x, foot, k); }
    else one(c, en, i, a, x, foot, k);
    c.restore(); c.globalAlpha = 1;
    U.drawn++; U.last = { id: S.id, frame: i, t: t }; U.frames[S.id + ':' + i] = 1;
    return true;
  };
  U.ground = function () { return; };
  U.air = function (c, S, t) {
    if (S.visualOff) return;
    U.sprite(c, S, t);
  };
  U.closeup = function () { return; };
  U.screen = function () { return; };
  if (XY.ULTINK_DATA) U.preload(); else setTimeout(function () { if (XY.ULTINK_DATA) U.preload(); }, 0);
})();
